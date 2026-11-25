/**
 * Promotion guard: generated material is never canon by itself.
 *
 * Anything a generator produces enters as status "candidate". The only way
 * forward is a human-approval record {approver, ts, ref}; even then the status
 * becomes "human-approved", which means "eligible to be proposed for the canon
 * lock" — not "canon". Locking canon stays a human process (`/lock-decision`
 * edits .arcanea/lore). This module performs no I/O at all, so it cannot write
 * to .arcanea/lore or anywhere else; that is a property tests assert.
 */

export type PromotionStatus = "candidate" | "human-approved";

export interface HumanApproval {
  /** A person's handle. Agent seats ("agent:...") are refused. */
  approver: string;
  /** ISO-8601 timestamp of the decision. */
  ts: string;
  /** Where the decision is recorded (PR, issue, decision-log entry). */
  ref: string;
}

export interface GeneratedEntity<T = unknown> {
  readonly id: string;
  readonly kind: string;
  readonly origin: "generated";
  readonly status: PromotionStatus;
  readonly payload: T;
  readonly approval?: Readonly<HumanApproval>;
}

export type PromotionResult<T> =
  | { ok: true; entity: GeneratedEntity<T> }
  | { ok: false; reason: string; entity: GeneratedEntity<T> };

/** Prefixes that identify non-human approvers in this estate. */
const NON_HUMAN_APPROVER = /^(agent|bot|model|llm|ai|claude|gpt|gemini|codex)\s*[:/@-]/i;

/** Returns why an approval is unacceptable, or null when it is acceptable. */
export function approvalProblem(approval: unknown, now: Date = new Date()): string | null {
  if (!approval || typeof approval !== "object") return "an approval record {approver, ts, ref} is required";
  const a = approval as Partial<HumanApproval>;
  if (typeof a.approver !== "string" || a.approver.trim() === "") return "approval.approver is required";
  if (NON_HUMAN_APPROVER.test(a.approver.trim())) return `approver "${a.approver}" is not a human; agents cannot approve canon`;
  if (typeof a.ref !== "string" || a.ref.trim() === "") return "approval.ref must point to where the decision is recorded";
  if (typeof a.ts !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(a.ts) || Number.isNaN(Date.parse(a.ts))) {
    return "approval.ts must be an ISO-8601 timestamp";
  }
  if (Date.parse(a.ts) > now.getTime()) return "approval.ts is in the future";
  return null;
}

/** Wraps freshly generated material. It always starts as a candidate. */
export function asCandidate<T>(id: string, kind: string, payload: T): GeneratedEntity<T> {
  if (!id) throw new TypeError("generated entity needs an id");
  return Object.freeze({ id, kind, origin: "generated" as const, status: "candidate" as const, payload });
}

/**
 * Attaches a human approval. Refuses (ok: false, entity unchanged) when the
 * record is missing or invalid. Never returns a status of "canon".
 */
export function attachHumanApproval<T>(
  entity: GeneratedEntity<T>,
  approval: HumanApproval | undefined,
  now: Date = new Date(),
): PromotionResult<T> {
  const problem = approvalProblem(approval, now);
  if (problem) return { ok: false, reason: problem, entity };
  return {
    ok: true,
    entity: Object.freeze({
      ...entity,
      status: "human-approved" as const,
      approval: Object.freeze({ ...approval! }),
    }),
  };
}

/**
 * The explicit refusal: asking this layer to mark something as canon always
 * fails. Approved entities get a pointer to the human lock process instead.
 */
export function promoteToCanon<T>(entity: GeneratedEntity<T>): PromotionResult<T> {
  if (entity.status !== "human-approved" || approvalProblem(entity.approval) !== null) {
    return { ok: false, reason: `"${entity.id}" is a candidate; attach a valid human approval first`, entity };
  }
  return {
    ok: false,
    reason: `"${entity.id}" is human-approved (${entity.approval!.ref}); canon is locked only by a human via /lock-decision, never by generated-content tooling`,
    entity,
  };
}

/**
 * Validates an entity that came from outside (JSON, another process) and may
 * have been tampered with: any status other than the two known ones, or an
 * approved status without a valid approval, is rejected.
 */
export function assertPromotionState(entity: unknown): asserts entity is GeneratedEntity {
  const e = entity as Partial<GeneratedEntity> | null;
  if (!e || typeof e !== "object" || e.origin !== "generated") throw new TypeError("not a generated entity");
  if (e.status !== "candidate" && e.status !== "human-approved") {
    throw new TypeError(`generated entity "${String(e.id)}" has forbidden status "${String(e.status)}"`);
  }
  if (e.status === "human-approved") {
    const problem = approvalProblem(e.approval);
    if (problem) throw new TypeError(`generated entity "${String(e.id)}" claims approval but ${problem}`);
  }
}
