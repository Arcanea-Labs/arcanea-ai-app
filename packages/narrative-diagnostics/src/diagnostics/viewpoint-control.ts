import type { DiagnosticResult, DiagnosticSpec, ScoreOptions } from '../types.js';
import { arr, bool, id, obj, oneOf, para, str } from '../validate.js';
import { OPENING_WINDOW, dedupeById, numberParagraphs, prompt, section, splitParagraphs } from '../text.js';

/**
 * viewpoint_control: the reader always knows whose eyes and head they are in.
 */

export const MIN_COVERED = 6;
export const MAX_UNCLEAR_SHARE = 0.3;

export interface ViewpointSpan {
  id: string;
  startParagraph: number;
  endParagraph: number;
  /** Character whose perception the span follows, or null for none/external. */
  viewpointCharacter: string | null;
  clarity: 'clear' | 'unclear' | 'mixed';
  /** Every character whose thoughts or feelings are rendered from inside. */
  interiorityCharacters: string[];
  /** True when the text marks a deliberate change of viewpoint (section break, explicit handoff). */
  shiftSignal: boolean;
  text: string;
}

export interface ViewpointEvidence {
  spans: ViewpointSpan[];
}

export const viewpointSchema = obj({
  spans: arr(
    obj({
      id,
      startParagraph: para,
      endParagraph: para,
      viewpointCharacter: { type: ['string', 'null'] },
      clarity: oneOf(['clear', 'unclear', 'mixed']),
      interiorityCharacters: arr(str),
      shiftSignal: bool,
      text: str,
    }),
  ),
});

const TASK = [
  'spans: divide CHAPTER paragraphs 1-12 into consecutive viewpoint spans (a new span starts when the viewpoint changes or becomes uncertain).',
  'viewpointCharacter: whose perception the span follows, or null for an external or omniscient camera.',
  'clarity: "clear" when a reader can tell whose viewpoint it is, "unclear" when they cannot, "mixed" when it slides between characters without a marker.',
  'interiorityCharacters: every character whose private thoughts or feelings are given from inside in that span.',
  'shiftSignal: true only if the text visibly marks a change of viewpoint inside or at the start of the span (scene break, chapter heading, explicit handoff).',
  'text: a short quote that shows the viewpoint.',
].join('\n');

/**
 * Options: openingLength = number of chapter paragraphs (runDiagnostic fills
 * it from the chapter text). Without it the window is assumed to be full (12).
 */
export function scoreViewpoint(ev: ViewpointEvidence, options: ScoreOptions = {}): DiagnosticResult {
  const opening = Math.min(options.openingLength ?? OPENING_WINDOW, OPENING_WINDOW);
  const spans = dedupeById(ev.spans)
    .map((s) => ({ ...s, startParagraph: Math.max(1, s.startParagraph), endParagraph: Math.min(s.endParagraph, opening) }))
    .filter((s) => s.startParagraph <= s.endParagraph);

  const covered = new Set<number>();
  for (const s of spans) for (let p = s.startParagraph; p <= s.endParagraph; p++) covered.add(p);
  const required = Math.min(MIN_COVERED, opening);
  const unclear = spans.filter((s) => s.clarity !== 'clear');
  const unclearShare = spans.length === 0 ? 0 : unclear.length / spans.length;
  const unsignalled = spans.filter((s) => new Set(s.interiorityCharacters.map((c) => c.trim().toLowerCase())).size > 1 && !s.shiftSignal);

  const counts = {
    spans: spans.length,
    coveredParagraphs: covered.size,
    requiredCoverage: required,
    unclearSpans: unclear.length,
    unclearSharePct: Math.round(unclearShare * 1000) / 10,
    unsignalledMultiInteriority: unsignalled.length,
  };
  if (spans.length === 0) return { pass: false, failedGate: 'no_spans', selectedEvidence: [], counts };
  if (covered.size < required) return { pass: false, failedGate: 'coverage', selectedEvidence: spans, counts };
  if (unclearShare > MAX_UNCLEAR_SHARE) return { pass: false, failedGate: 'unclear_share', selectedEvidence: unclear, counts };
  if (unsignalled.length > 0) return { pass: false, failedGate: 'unsignalled_shift', selectedEvidence: unsignalled, counts };
  return { pass: true, failedGate: null, selectedEvidence: spans, counts };
}

export const viewpointControl: DiagnosticSpec<ViewpointEvidence> = {
  id: 'viewpoint_control',
  description: 'Viewpoint spans cover the opening, are mostly clear, and multi-character interiority is signalled.',
  schema: viewpointSchema,
  needs: ['chapter'],
  buildPrompt: (input) =>
    prompt(TASK, viewpointSchema, [section('CHAPTER (paragraphs 1-12)', input.chapter && numberParagraphs(input.chapter, OPENING_WINDOW))]),
  score: (ev, options) => scoreViewpoint(ev, options),
};

export function openingLengthOf(chapter: string | undefined): number | undefined {
  return chapter === undefined ? undefined : splitParagraphs(chapter).length;
}
