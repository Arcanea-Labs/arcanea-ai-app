import type { DiagnosticId, DiagnosticInput, DiagnosticResult, DiagnosticSpec, ScoreOptions } from './types.js';
import { type Extractor, DEFAULT_MAX_TOKENS, extractEvidence } from './extractor.js';
import { setupLiveProblem } from './diagnostics/setup-live-problem.js';
import { sameGoalActive } from './diagnostics/same-goal-active.js';
import { blockedGoalResponse } from './diagnostics/blocked-goal-response.js';
import { mysteryUnresolved } from './diagnostics/mystery-unresolved.js';
import { initialSituationClear } from './diagnostics/initial-situation-clear.js';
import { viewpointControl, openingLengthOf } from './diagnostics/viewpoint-control.js';
import { expositionLocalNeed } from './diagnostics/exposition-local-need.js';
import {
  type ChapterPlanInput,
  type PlanFollowingEvidence,
  type PlanFollowingResult,
  DEFAULT_PLAN_THRESHOLD_PCT,
  buildPlanPrompt,
  planFollowingSchema,
  scoreChapterPlan,
  scorePlanCurve,
} from './diagnostics/plan-following.js';

export * from './types.js';
export * from './validate.js';
export * from './text.js';
export * from './extractor.js';
export * from './diagnostics/setup-live-problem.js';
export * from './diagnostics/same-goal-active.js';
export * from './diagnostics/blocked-goal-response.js';
export * from './diagnostics/mystery-unresolved.js';
export * from './diagnostics/initial-situation-clear.js';
export * from './diagnostics/viewpoint-control.js';
export * from './diagnostics/exposition-local-need.js';
export * from './diagnostics/plan-following.js';

/** The seven single-pass diagnostics. plan_following runs per chapter via runPlanFollowing. */
export const DIAGNOSTICS = {
  setup_live_problem: setupLiveProblem,
  same_goal_active: sameGoalActive,
  blocked_goal_response: blockedGoalResponse,
  mystery_unresolved: mysteryUnresolved,
  initial_situation_clear: initialSituationClear,
  viewpoint_control: viewpointControl,
  exposition_local_need: expositionLocalNeed,
} as const satisfies Partial<Record<DiagnosticId, DiagnosticSpec<never>>>;

export type SinglePassDiagnosticId = keyof typeof DIAGNOSTICS;

export interface DiagnosticRun {
  diagnostic: SinglePassDiagnosticId;
  extractor: string;
  attempts: number;
  evidence: unknown;
  result: DiagnosticResult;
}

export interface RunOptions extends ScoreOptions {
  maxTokens?: number;
}

/** Extract evidence for one diagnostic, validate it, and score it. */
export async function runDiagnostic(
  extractor: Extractor,
  id: SinglePassDiagnosticId,
  input: DiagnosticInput,
  options: RunOptions = {},
): Promise<DiagnosticRun> {
  const spec = DIAGNOSTICS[id] as DiagnosticSpec<unknown>;
  for (const need of spec.needs) {
    if (!input[need] || !input[need]?.trim()) throw new Error(`${id} needs ${need} text`);
  }
  const outcome = await extractEvidence<unknown>(extractor, spec.buildPrompt(input), spec.schema, options.maxTokens ?? DEFAULT_MAX_TOKENS);
  const scoreOptions: ScoreOptions = { ...options };
  if (scoreOptions.openingLength === undefined) {
    const len = openingLengthOf(input.chapter);
    if (len !== undefined) scoreOptions.openingLength = len;
  }
  return {
    diagnostic: id,
    extractor: extractor.name,
    attempts: outcome.attempts,
    evidence: outcome.evidence,
    result: spec.score(outcome.evidence, scoreOptions),
  };
}

/** Run every single-pass diagnostic whose inputs are present, sequentially. */
export async function runAll(extractor: Extractor, input: DiagnosticInput, options: RunOptions = {}): Promise<DiagnosticRun[]> {
  const runs: DiagnosticRun[] = [];
  for (const id of Object.keys(DIAGNOSTICS) as SinglePassDiagnosticId[]) {
    const spec = DIAGNOSTICS[id] as DiagnosticSpec<unknown>;
    if (spec.needs.every((n) => input[n]?.trim())) runs.push(await runDiagnostic(extractor, id, input, options));
  }
  return runs;
}

/** One extraction per chapter, then the deterministic 1-7 curve. */
export async function runPlanFollowing(
  extractor: Extractor,
  chapters: ChapterPlanInput[],
  options: { thresholdPct?: number; maxTokens?: number } = {},
): Promise<PlanFollowingResult & { attempts: number[] }> {
  const scores = [];
  const attempts: number[] = [];
  for (const ch of chapters) {
    const outcome = await extractEvidence<PlanFollowingEvidence>(extractor, buildPlanPrompt(ch), planFollowingSchema, options.maxTokens ?? DEFAULT_MAX_TOKENS);
    attempts.push(outcome.attempts);
    scores.push(scoreChapterPlan(ch.chapter, ch.planBullets.length, outcome.evidence));
  }
  return { ...scorePlanCurve(scores, options.thresholdPct ?? DEFAULT_PLAN_THRESHOLD_PCT), attempts };
}
