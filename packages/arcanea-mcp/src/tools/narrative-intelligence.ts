/**
 * Narrative intelligence tools: plan a story (candidate only), check
 * continuity, score diversity.
 *
 * Canon rule (docs/research/narrative-intelligence/DECISIONS.md, ADR-002):
 * nothing here writes canon. The planner runs on an in-memory checkpoint
 * store, every result carries status "candidate", and the continuity and
 * diversity tools are pure calls into world-engine with no model.
 */

import {
  loadNarrativePlanner,
  loadWorldEngine,
  NarrativeEngineUnavailable,
} from "./narrative-engines.js";
import type {
  EngineFinding,
  NarrativeEngines,
  NarrativeModelLike,
  PlannerStageResult,
} from "./narrative-engines.js";

interface TextEnvelope {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

function json(data: unknown): TextEnvelope {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export type NarrativeErrorCode =
  | "invalid_input"
  | "no_model_configured"
  | "engine_unavailable"
  | "planner_stopped";

function fail(tool: string, code: NarrativeErrorCode, message: string, extra: Record<string, unknown> = {}): TextEnvelope {
  return { ...json({ tool, status: "error", error: { code, message }, ...extra }), isError: true };
}

function engineFailure(tool: string, err: unknown): TextEnvelope {
  if (err instanceof NarrativeEngineUnavailable) {
    return fail(tool, "engine_unavailable", err.message, { engine: err.engine });
  }
  // Engine functions throw TypeError/RangeError on malformed input (e.g. mixed time models).
  return fail(tool, "invalid_input", (err as Error)?.message ?? String(err));
}

/** The book-level stages the plan tool runs. Chapter stages (scenes, prose) never run. */
export const PLANNING_STAGES = ["book_preview", "book_plan", "chapters_plan", "characters_list"] as const;

// ── narrative_plan_story ────────────────────────────────────────────────────

export interface PlanStoryArgs {
  prompt: string;
  chapters?: number;
  worldRules?: string[];
}

export interface PlanStoryDeps extends NarrativeEngines {
  /**
   * The generation model. The MCP server has no generation model configured
   * (its generators are deterministic templates), so the registered tool
   * passes none and returns no_model_configured. Library callers may inject one.
   */
  model?: NarrativeModelLike;
  /** Validation attempts per stage, passed to the planner. */
  maxAttempts?: number;
}

export const NO_MODEL_MESSAGE =
  "narrative_plan_story needs a language model, and this MCP server has no generation model configured " +
  "(its generators are deterministic templates). No model was called and nothing was written.";

function premiseFrom(args: PlanStoryArgs): string {
  const rules = (args.worldRules ?? []).map((r) => r.trim()).filter(Boolean);
  if (rules.length === 0) return args.prompt.trim();
  return `${args.prompt.trim()}\n\nWorld rules the plan must respect:\n${rules.map((r) => `- ${r}`).join("\n")}`;
}

function planInputProblem(args: PlanStoryArgs): string | null {
  if (typeof args?.prompt !== "string" || args.prompt.trim().length < 3) return "prompt must be at least 3 characters";
  if (args.chapters !== undefined && (!Number.isInteger(args.chapters) || args.chapters < 1 || args.chapters > 200)) {
    return "chapters must be an integer from 1 to 200";
  }
  if (args.worldRules !== undefined && (!Array.isArray(args.worldRules) || args.worldRules.some((r) => typeof r !== "string"))) {
    return "worldRules must be an array of strings";
  }
  return null;
}

export async function planStory(args: PlanStoryArgs, deps: PlanStoryDeps = {}): Promise<TextEnvelope> {
  const tool = "narrative_plan_story";
  const problem = planInputProblem(args);
  if (problem) return fail(tool, "invalid_input", problem);
  if (!deps.model) return fail(tool, "no_model_configured", NO_MODEL_MESSAGE, { canonWritten: false });

  let planner;
  try {
    planner = await (deps.planner ?? loadNarrativePlanner)();
  } catch (err) {
    return engineFailure(tool, err);
  }

  const planning = new Set<string>(PLANNING_STAGES);
  const stages: PlannerStageResult[] = [];
  const receipts: Array<Record<string, unknown>> = [];
  const validationFailures: Array<{ stage: string; attempt: number; errors: string[] }> = [];
  let stopped: { code: string; message: string; stage?: string } | undefined;

  const run = planner.runStory({
    jobId: `mcp-plan-${Date.now().toString(36)}`,
    premise: premiseFrom(args),
    chapterCount: args.chapters ?? 3,
    model: deps.model,
    // In-memory only: the plan is returned, never persisted.
    store: new planner.MemoryCheckpointStore(),
    canonGate: new planner.StructuralCanonGate(),
    maxAttempts: deps.maxAttempts,
  });
  try {
    for await (const ev of run) {
      // stage_start is yielded before the model call, so stopping here means
      // no scene_breakdown or chapter_text call is ever made.
      if (ev.type === "stage_start" && !planning.has(String(ev.stage))) break;
      if (ev.type === "stage_complete") stages.push((ev as { result: PlannerStageResult }).result);
      else if (ev.type === "receipt") receipts.push((ev as { receipt: Record<string, unknown> }).receipt);
      else if (ev.type === "validation_failed") {
        const v = ev as { stage: string; attempt: number; errors: string[] };
        validationFailures.push({ stage: v.stage, attempt: v.attempt, errors: v.errors });
      } else if (ev.type === "error") {
        const e = ev as { code: string; message: string; stage?: string };
        stopped = { code: e.code, message: e.message, stage: e.stage };
      }
      if (stages.length === PLANNING_STAGES.length) break;
    }
  } catch (err) {
    return fail(tool, "planner_stopped", (err as Error)?.message ?? String(err), { canonWritten: false });
  } finally {
    await run.return(undefined);
  }

  const byStage = Object.fromEntries(
    stages.map((s) => [s.stage, { status: "candidate", model: s.model, attempts: s.attempts, data: s.data, canonReview: s.canon ?? null }]),
  );
  const body = {
    tool,
    status: "candidate",
    canonWritten: false,
    note: "Generated plan material is a candidate, not canon. Promotion needs a human approval record (ADR-002).",
    chaptersRequested: args.chapters ?? 3,
    stagesCompleted: stages.map((s) => s.stage),
    plan: byStage,
    validationFailures,
    receipts,
  };
  if (stopped) {
    return { ...json({ ...body, error: { code: "planner_stopped", plannerCode: stopped.code, message: stopped.message, stage: stopped.stage } }), isError: true };
  }
  return json(body);
}

// ── narrative_check_continuity ──────────────────────────────────────────────

export interface CheckContinuityArgs {
  characterEvents: unknown[];
  timelineEvents: unknown[];
  constraints: unknown[];
  sceneFacts?: unknown[];
  /** Per-character starting state, e.g. knowledge held before the story opens. */
  initialStates?: Record<string, unknown>;
  /** Story-time model; ordinal when omitted. */
  timeModel?: unknown;
}

function summarise(findings: EngineFinding[]) {
  const count = (s: EngineFinding["severity"]) => findings.filter((f) => f.severity === s).length;
  return { errors: count("error"), warnings: count("warning"), info: count("info"), total: findings.length };
}

export async function checkContinuity(args: CheckContinuityArgs, deps: NarrativeEngines = {}): Promise<TextEnvelope> {
  const tool = "narrative_check_continuity";
  for (const key of ["characterEvents", "timelineEvents", "constraints"] as const) {
    if (!Array.isArray(args?.[key])) return fail(tool, "invalid_input", `${key} must be an array`);
  }
  if (args.sceneFacts !== undefined && !Array.isArray(args.sceneFacts)) {
    return fail(tool, "invalid_input", "sceneFacts must be an array when given");
  }
  try {
    const we = await (deps.worldEngine ?? loadWorldEngine)();
    const ledger = we.detectImpossibleTransitions(args.characterEvents, {
      model: args.timeModel,
      initial: args.initialStates,
    });
    const timeline = we.checkTimeline(args.timelineEvents, args.constraints, args.timeModel);
    const rules = we.buildCanonRules();
    const worldRules = (args.sceneFacts ?? []).flatMap((facts) => we.validateScene(facts, rules));
    const findings = [...ledger, ...timeline, ...worldRules];
    return json({
      tool,
      status: "ok",
      deterministic: true,
      modelCalls: 0,
      summary: {
        ...summarise(findings),
        byCheck: { ledger: ledger.length, timeline: timeline.length, worldRules: worldRules.length },
        scenesChecked: (args.sceneFacts ?? []).length,
      },
      findings,
    });
  } catch (err) {
    return engineFailure(tool, err);
  }
}

// ── narrative_score_diversity ───────────────────────────────────────────────

export type DiversityText = string | { id: string; text: string };

export interface ScoreDiversityArgs {
  texts?: DiversityText[];
  plans?: unknown[];
  /** n-gram size for repetition detection; default 4. */
  repetitionN?: number;
  /** Max repeated phrases returned; default 20. */
  maxPhrases?: number;
}

const round = (x: number) => Math.round(x * 10000) / 10000;

export async function scoreDiversity(args: ScoreDiversityArgs, deps: NarrativeEngines = {}): Promise<TextEnvelope> {
  const tool = "narrative_score_diversity";
  const texts = args?.texts ?? [];
  const plans = args?.plans ?? [];
  if (!Array.isArray(texts) || !Array.isArray(plans)) return fail(tool, "invalid_input", "texts and plans must be arrays");
  if (texts.length === 0 && plans.length === 0) return fail(tool, "invalid_input", "provide texts[] or plans[] (at least one item)");
  const docs = texts.map((t, i) => (typeof t === "string" ? { id: `text-${i + 1}`, text: t } : t));
  if (docs.some((d) => !d || typeof d.id !== "string" || typeof d.text !== "string")) {
    return fail(tool, "invalid_input", "each text must be a string or {id, text}");
  }
  if (new Set(docs.map((d) => d.id)).size !== docs.length) return fail(tool, "invalid_input", "text ids must be unique");

  try {
    const we = await (deps.worldEngine ?? loadWorldEngine)();
    const out: Record<string, unknown> = { tool, status: "ok", deterministic: true, modelCalls: 0 };

    if (docs.length > 0) {
      const corpus = docs.map((d) => d.text);
      const phrases = we.detectRepetition(docs, { n: args.repetitionN ?? 4, minChapters: 2 });
      out.texts = {
        count: docs.length,
        distinct1: round(we.distinctN(corpus, 1)),
        distinct2: round(we.distinctN(corpus, 2)),
        distinct3: round(we.distinctN(corpus, 3)),
        perText: docs.map((d) => ({ id: d.id, distinct2: round(we.distinctN(d.text, 2)) })),
        repetition: {
          n: args.repetitionN ?? 4,
          repeatedPhraseCount: phrases.length,
          phrases: phrases.slice(0, args.maxPhrases ?? 20),
        },
      };
    }

    if (plans.length > 0) {
      // Leave-one-out: each plan is scored against every other plan supplied.
      const scored = plans.map((plan, i) => {
        const corpus = plans.filter((_, j) => j !== i);
        const n = we.structuralNovelty(plan, corpus);
        return {
          id: (plan as { id?: unknown })?.id ?? `plan-${i + 1}`,
          score: round(n.score),
          embeddingNovelty: round(n.embeddingNovelty),
          archetypeNovelty: round(n.archetypeNovelty),
          nearestPlanId: n.nearestPlanId ?? null,
          units: n.units.length,
        };
      });
      out.plans = {
        count: plans.length,
        meanNovelty: round(scored.reduce((s, p) => s + p.score, 0) / scored.length),
        perPlan: scored,
        note: plans.length === 1 ? "only one plan supplied: there is nothing to compare it with, so novelty is 1 by definition" : undefined,
      };
    }
    return json(out);
  } catch (err) {
    return engineFailure(tool, err);
  }
}
