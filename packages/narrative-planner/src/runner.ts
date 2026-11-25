/**
 * runStory: drive a NarrativeModel through the stage protocol as an async
 * iterator of events, checkpointing after every completed unit.
 */

import { assertSafeJobId, type Checkpoint, type CheckpointStore } from "./checkpoint.js";
import type { CanonGate } from "./canon-gate.js";
import { SafetyRefusalError, type CompletedStageSummary, type NarrativeModel } from "./models.js";
import { defaultPromptBuilder, type PromptBuilder } from "./prompts.js";
import { makeReceipt, totalCost, type CostReceipt, type CostTotal, type PricingTable } from "./receipts.js";
import type { CanonReview, StageResult } from "./runner-types.js";
import { BOOK_STAGES, CHAPTER_STAGES, parseStage, type StageName } from "./stages.js";

export interface JobSpec {
  jobId: string;
  premise: string;
  /** Number of chapters to plan and write. 1-200. */
  chapterCount: number;
  model: NarrativeModel;
  store: CheckpointStore;
  pricing?: PricingTable;
  canonGate?: CanonGate;
  /** Attempts per unit before the run stops with validation_exhausted. Default 3. */
  maxAttempts?: number;
  /** Per-stage token ceilings. */
  maxTokens?: Partial<Record<StageName, number>>;
  signal?: AbortSignal;
  promptBuilder?: PromptBuilder;
  /** Called with every receipt as it is created (e.g. to append to a JSONL log). */
  onReceipt?: (receipt: CostReceipt) => void | Promise<void>;
  now?: () => Date;
}

export interface Unit {
  stage: StageName;
  unit: string;
  chapterIndex?: number;
}

export type ErrorCode = "validation_exhausted" | "canon_block" | "safety_refusal" | "model_error" | "job_mismatch";

export type StoryEvent =
  | { type: "resumed"; jobId: string; completedUnits: number }
  | { type: "stage_skipped"; stage: StageName; unit: string }
  | { type: "stage_start"; stage: StageName; unit: string; attempt: number }
  | { type: "receipt"; receipt: CostReceipt }
  | { type: "validation_failed"; stage: StageName; unit: string; attempt: number; errors: string[] }
  | { type: "canon_review"; stage: StageName; unit: string; review: CanonReview }
  | { type: "stage_complete"; stage: StageName; unit: string; result: StageResult }
  | { type: "checkpoint"; jobId: string; completedUnits: number }
  | { type: "error"; code: ErrorCode; message: string; stage?: StageName; unit?: string }
  | { type: "aborted"; stage?: StageName; unit?: string }
  | { type: "done"; jobId: string; results: StageResult[]; cost: CostTotal };

const DEFAULT_MAX_TOKENS: Record<StageName, number> = {
  book_preview: 1024,
  book_plan: 4096,
  chapters_plan: 8192,
  characters_list: 4096,
  scene_breakdown: 4096,
  chapter_text: 16384,
};

export function unitKey(u: { stage: StageName; unit: string }): string {
  return `${u.stage}:${u.unit}`;
}

/** The full ordered unit list for a book: book stages, then per chapter scenes then text. */
export function planUnits(chapterCount: number): Unit[] {
  const units: Unit[] = BOOK_STAGES.map((stage) => ({ stage, unit: "book" }));
  for (let i = 1; i <= chapterCount; i++) {
    for (const stage of CHAPTER_STAGES) units.push({ stage, unit: `ch-${i}`, chapterIndex: i });
  }
  return units;
}

function validateSpec(spec: JobSpec): void {
  assertSafeJobId(spec.jobId);
  if (typeof spec.premise !== "string" || spec.premise.trim().length === 0) throw new TypeError("premise is required");
  if (!Number.isInteger(spec.chapterCount) || spec.chapterCount < 1 || spec.chapterCount > 200) {
    throw new RangeError("chapterCount must be an integer in [1, 200]");
  }
  if (!spec.model || typeof spec.model.generate !== "function") throw new TypeError("model is required");
  if (!spec.store) throw new TypeError("store is required");
  if (spec.maxAttempts !== undefined && (!Number.isInteger(spec.maxAttempts) || spec.maxAttempts < 1)) {
    throw new RangeError("maxAttempts must be a positive integer");
  }
}

function isAbort(e: unknown, signal: AbortSignal | undefined): boolean {
  return Boolean(signal?.aborted) || (e instanceof Error && e.name === "AbortError");
}

export async function* runStory(spec: JobSpec): AsyncGenerator<StoryEvent, void, undefined> {
  validateSpec(spec);
  const now = spec.now ?? (() => new Date());
  const maxAttempts = spec.maxAttempts ?? 3;
  const build = spec.promptBuilder ?? defaultPromptBuilder;

  const existing = await spec.store.load(spec.jobId);
  if (existing && (existing.premise !== spec.premise || existing.chapterCount !== spec.chapterCount)) {
    yield {
      type: "error",
      code: "job_mismatch",
      message: `checkpoint for ${spec.jobId} has a different premise or chapterCount; use a new jobId or resume()`,
    };
    return;
  }
  const cp: Checkpoint = existing ?? {
    version: 1,
    jobId: spec.jobId,
    premise: spec.premise,
    chapterCount: spec.chapterCount,
    completed: {},
    receipts: [],
    updatedAt: now().toISOString(),
  };
  if (existing) yield { type: "resumed", jobId: spec.jobId, completedUnits: Object.keys(existing.completed).length };

  const units = planUnits(spec.chapterCount);
  const orderedResults = (): StageResult[] =>
    units.map((u) => cp.completed[unitKey(u)]).filter((r): r is StageResult => r !== undefined);
  const save = async (): Promise<void> => {
    cp.updatedAt = now().toISOString();
    await spec.store.save(cp);
  };

  for (const u of units) {
    const key = unitKey(u);
    if (cp.completed[key]) {
      yield { type: "stage_skipped", stage: u.stage, unit: u.unit };
      continue;
    }
    if (spec.signal?.aborted) {
      await save();
      yield { type: "aborted", stage: u.stage, unit: u.unit };
      return;
    }

    let retryErrors: string[] | undefined;
    let accepted: StageResult | undefined;
    for (let attempt = 1; attempt <= maxAttempts && !accepted; attempt++) {
      yield { type: "stage_start", stage: u.stage, unit: u.unit, attempt };
      const completed = orderedResults();
      const prompt = build(u.stage, {
        premise: spec.premise,
        chapterCount: spec.chapterCount,
        chapterIndex: u.chapterIndex,
        completed,
        retryErrors,
      });
      const completedStages: CompletedStageSummary[] = completed.map((r) => ({ stage: r.stage, unit: r.unit }));

      let gen;
      try {
        gen = await spec.model.generate({
          stage: u.stage,
          prompt,
          completedStages,
          maxTokens: spec.maxTokens?.[u.stage] ?? DEFAULT_MAX_TOKENS[u.stage],
          signal: spec.signal,
        });
      } catch (e) {
        await save();
        if (isAbort(e, spec.signal)) {
          yield { type: "aborted", stage: u.stage, unit: u.unit };
        } else if (e instanceof SafetyRefusalError) {
          yield { type: "error", code: "safety_refusal", message: e.message, stage: u.stage, unit: u.unit };
        } else {
          yield { type: "error", code: "model_error", message: (e as Error).message ?? String(e), stage: u.stage, unit: u.unit };
        }
        return;
      }

      const receipt = makeReceipt({
        jobId: spec.jobId,
        stage: u.stage,
        unit: u.unit,
        model: gen.model,
        provider: spec.model.provider,
        usage: gen.usage,
        latencyMs: gen.latencyMs,
        pricing: spec.pricing,
        now,
      });
      cp.receipts.push(receipt);
      if (spec.onReceipt) await spec.onReceipt(receipt);
      yield { type: "receipt", receipt };

      const parsed = parseStage(u.stage, gen.text, {
        chapterIndex: u.chapterIndex,
        expectedChapters: u.stage === "chapters_plan" ? spec.chapterCount : undefined,
      });
      if (!parsed.ok) {
        retryErrors = parsed.errors;
        yield { type: "validation_failed", stage: u.stage, unit: u.unit, attempt, errors: parsed.errors };
        continue;
      }
      accepted = {
        stage: u.stage,
        unit: u.unit,
        data: parsed.value,
        raw: gen.text,
        model: gen.model,
        attempts: attempt,
        status: "candidate",
      } as StageResult;
    }

    if (!accepted) {
      await save();
      yield {
        type: "error",
        code: "validation_exhausted",
        message: `${u.stage} (${u.unit}) failed validation ${maxAttempts} time(s): ${(retryErrors ?? []).join("; ")}`,
        stage: u.stage,
        unit: u.unit,
      };
      return;
    }

    if (spec.canonGate) {
      const review = await spec.canonGate.review(accepted, { completed: orderedResults() });
      accepted.canon = review;
      yield { type: "canon_review", stage: u.stage, unit: u.unit, review };
      if (review.verdict === "block") {
        await save();
        yield {
          type: "error",
          code: "canon_block",
          message: review.findings.filter((f) => f.severity === "block").map((f) => f.message).join("; "),
          stage: u.stage,
          unit: u.unit,
        };
        return;
      }
    }

    cp.completed[key] = accepted;
    await save();
    yield { type: "stage_complete", stage: u.stage, unit: u.unit, result: accepted };
    yield { type: "checkpoint", jobId: spec.jobId, completedUnits: Object.keys(cp.completed).length };
  }

  yield { type: "done", jobId: spec.jobId, results: orderedResults(), cost: totalCost(cp.receipts) };
}

export type ResumeOptions = Omit<JobSpec, "jobId" | "premise" | "chapterCount">;

/** Continue a checkpointed job. Finished units are skipped, not regenerated. */
export async function* resume(jobId: string, opts: ResumeOptions): AsyncGenerator<StoryEvent, void, undefined> {
  assertSafeJobId(jobId);
  const cp = await opts.store.load(jobId);
  if (!cp) throw new Error(`no checkpoint found for job ${jobId}`);
  yield* runStory({ ...opts, jobId, premise: cp.premise, chapterCount: cp.chapterCount });
}

/** Drain an event stream into an array (handy for scripts and tests). */
export async function collect(events: AsyncIterable<StoryEvent>): Promise<StoryEvent[]> {
  const out: StoryEvent[] = [];
  for await (const e of events) out.push(e);
  return out;
}
