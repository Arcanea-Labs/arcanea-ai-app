import type { JsonSchema, PromptPair } from '../types.js';
import { arr, obj, oneOf, str } from '../validate.js';
import { dedupeById, numberParagraphs, prompt, section } from '../text.js';

/**
 * plan_following: how much of each chapter's plan the chapter actually
 * realises. The extractor only reports, per plan bullet, whether and where it
 * appears; the 1-7 score and its percentage are computed here.
 */

export const BULLET_WEIGHTS = { realized: 1, partial: 0.5, missing: 0, contradicted: 0 } as const;
/** Our default per-chapter pass line, in percent. Not a value from the paper. */
export const DEFAULT_PLAN_THRESHOLD_PCT = 50;

export interface ChapterPlanInput {
  /** 1-indexed chapter number. */
  chapter: number;
  text: string;
  planBullets: string[];
}

export interface BulletFinding {
  id: string;
  /** 1-indexed position in planBullets. */
  bullet: number;
  status: keyof typeof BULLET_WEIGHTS;
  /** Paragraph where it is realised, or null. */
  paragraph: number | null;
  text: string;
}

export interface PlanFollowingEvidence {
  bullets: BulletFinding[];
}

export const planFollowingSchema: JsonSchema = obj({
  bullets: arr(
    obj({
      id: str,
      bullet: { type: 'integer', minimum: 1 },
      status: oneOf(['realized', 'partial', 'missing', 'contradicted']),
      paragraph: { type: ['integer', 'null'], minimum: 1 },
      text: { type: 'string' },
    }),
  ),
});

const TASK = [
  'A chapter PLAN (numbered bullets) and the CHAPTER text follow.',
  'bullets: one item per plan bullet, in order. bullet is the bullet number. status: "realized" when the chapter shows what the bullet describes, "partial" when only part of it happens or it is merely mentioned, "missing" when it does not occur, "contradicted" when the chapter does something incompatible with it. paragraph is where it happens (null if missing). text quotes the supporting line, or is empty if missing.',
].join('\n');

export function buildPlanPrompt(input: ChapterPlanInput): PromptPair {
  return prompt(TASK, planFollowingSchema, [
    section('PLAN', input.planBullets.map((b, i) => `${i + 1}. ${b}`).join('\n')),
    section(`CHAPTER ${input.chapter}`, numberParagraphs(input.text)),
  ]);
}

export interface ChapterPlanScore {
  chapter: number;
  /** 1-7, from bullet coverage. */
  score: number;
  /** (score - 1) / 6 * 100, so 1 = 0% and 7 = 100%. */
  percent: number;
  coverage: number;
  realized: number;
  partial: number;
  missing: number;
  contradicted: number;
  bulletCount: number;
}

/**
 * Score one chapter. Plan bullets the extractor did not mention count as
 * missing; findings for bullets outside 1..bulletCount are dropped; duplicate
 * ids and duplicate bullet numbers keep the first finding.
 */
export function scoreChapterPlan(chapter: number, bulletCount: number, ev: PlanFollowingEvidence): ChapterPlanScore {
  if (!Number.isInteger(bulletCount) || bulletCount < 1) throw new RangeError('a chapter plan needs at least one bullet');
  const seen = new Set<number>();
  const findings = dedupeById(ev.bullets).filter((b) => {
    if (b.bullet < 1 || b.bullet > bulletCount || seen.has(b.bullet)) return false;
    seen.add(b.bullet);
    return true;
  });
  const tally = { realized: 0, partial: 0, missing: bulletCount - findings.length, contradicted: 0 };
  for (const f of findings) tally[f.status]++;
  const coverage = (tally.realized * BULLET_WEIGHTS.realized + tally.partial * BULLET_WEIGHTS.partial) / bulletCount;
  const score = 1 + Math.round(6 * coverage);
  return {
    chapter,
    score,
    percent: Math.round(((score - 1) / 6) * 1000) / 10,
    coverage: Math.round(coverage * 1000) / 1000,
    ...tally,
    bulletCount,
  };
}

export interface PlanFollowingResult {
  pass: boolean;
  failedGate: string | null;
  selectedEvidence: ChapterPlanScore[];
  counts: Record<string, number>;
  /** Per-chapter curve in chapter order, so decay is visible. */
  curve: ChapterPlanScore[];
}

/** Aggregate chapter scores into a curve. Fails if any chapter is below the threshold. */
export function scorePlanCurve(scores: ChapterPlanScore[], thresholdPct: number = DEFAULT_PLAN_THRESHOLD_PCT): PlanFollowingResult {
  const curve = [...scores].sort((a, b) => a.chapter - b.chapter);
  const below = curve.filter((c) => c.percent < thresholdPct);
  const first = curve[0];
  const last = curve[curve.length - 1];
  const counts = {
    chapters: curve.length,
    belowThreshold: below.length,
    firstPct: first?.percent ?? 0,
    lastPct: last?.percent ?? 0,
    decayPct: first && last ? Math.round((first.percent - last.percent) * 10) / 10 : 0,
    meanPct: curve.length ? Math.round((curve.reduce((s, c) => s + c.percent, 0) / curve.length) * 10) / 10 : 0,
  };
  if (curve.length === 0) return { pass: false, failedGate: 'no_chapters', selectedEvidence: [], counts, curve };
  if (below.length > 0) return { pass: false, failedGate: 'chapter_below_threshold', selectedEvidence: below, counts, curve };
  return { pass: true, failedGate: null, selectedEvidence: curve, counts, curve };
}
