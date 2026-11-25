import type { DiagnosticResult, DiagnosticSpec, EvidenceItem, ScoreOptions } from '../types.js';
import { arr, id, obj, oneOf, para, str } from '../validate.js';
import { OPENING_WINDOW, dedupeById, inRange, nonEmpty, numberParagraphs, prompt, section } from '../text.js';

/**
 * exposition_local_need: background information arrives because the scene
 * needs it right then (a question, a decision, an obstacle), not as a lecture.
 */

/**
 * Default share of exposition passages that must be motivated.
 * This 0.5 is OUR default, chosen for this package; it is not a value from
 * the Pageshift paper. Override it with options.threshold.
 */
export const DEFAULT_EXPOSITION_THRESHOLD = 0.5;
/** A need ties to exposition when it sits in the same or an adjacent paragraph. */
export const ADJACENCY = 1;

export interface ExpositionPassage extends EvidenceItem {
  topic: string;
  text: string;
}

export interface LocalNeed extends EvidenceItem {
  kind: 'question' | 'decision' | 'obstacle';
  text: string;
}

export interface ExpositionTie {
  id: string;
  expositionId: string;
  needId: string;
}

export interface ExpositionEvidence {
  expositions: ExpositionPassage[];
  needs: LocalNeed[];
  ties: ExpositionTie[];
}

export const expositionSchema = obj({
  expositions: arr(obj({ id, paragraph: para, topic: str, text: str })),
  needs: arr(obj({ id, paragraph: para, kind: oneOf(['question', 'decision', 'obstacle']), text: str })),
  ties: arr(obj({ id, expositionId: str, needId: str })),
});

const TASK = [
  'expositions: passages in CHAPTER paragraphs 1-12 that explain background, history, world rules, or a character’s past, rather than showing present action. One item per passage, at the paragraph where it starts.',
  'needs: points in paragraphs 1-12 where a character faces a question, a decision or an obstacle in the present scene.',
  'ties: link an exposition passage to a need only when the information answers or bears on that need. Use the ids you gave.',
].join('\n');

export function scoreExposition(ev: ExpositionEvidence, options: ScoreOptions = {}): DiagnosticResult {
  const threshold = options.threshold ?? DEFAULT_EXPOSITION_THRESHOLD;
  if (!(threshold >= 0 && threshold <= 1)) throw new RangeError(`threshold must be in [0, 1], got ${threshold}`);

  const expositions = dedupeById(ev.expositions).filter((e) => inRange(e.paragraph, 1, OPENING_WINDOW) && nonEmpty(e.text));
  const needs = new Map(dedupeById(ev.needs).filter((n) => inRange(n.paragraph, 1, OPENING_WINDOW)).map((n) => [n.id, n]));
  const ties = dedupeById(ev.ties);

  const motivated = expositions.filter((e) =>
    ties.some((t) => {
      if (t.expositionId !== e.id) return false;
      const n = needs.get(t.needId);
      return n !== undefined && Math.abs(n.paragraph - e.paragraph) <= ADJACENCY;
    }),
  );
  const share = expositions.length === 0 ? 1 : motivated.length / expositions.length;
  const counts = {
    expositions: expositions.length,
    motivated: motivated.length,
    needs: needs.size,
    motivatedSharePct: Math.round(share * 1000) / 10,
    thresholdPct: Math.round(threshold * 1000) / 10,
  };
  // No exposition at all means nothing is unmotivated: pass (our choice; see README).
  if (share >= threshold) return { pass: true, failedGate: null, selectedEvidence: motivated, counts };
  return { pass: false, failedGate: 'motivated_share', selectedEvidence: expositions.filter((e) => !motivated.includes(e)), counts };
}

export const expositionLocalNeed: DiagnosticSpec<ExpositionEvidence> = {
  id: 'exposition_local_need',
  description: 'Enough exposition in paragraphs 1-12 is tied to a question, decision or obstacle in the same or adjacent paragraph.',
  schema: expositionSchema,
  needs: ['chapter'],
  buildPrompt: (input) =>
    prompt(TASK, expositionSchema, [section('CHAPTER (paragraphs 1-12)', input.chapter && numberParagraphs(input.chapter, OPENING_WINDOW))]),
  score: (ev, options) => scoreExposition(ev, options),
};
