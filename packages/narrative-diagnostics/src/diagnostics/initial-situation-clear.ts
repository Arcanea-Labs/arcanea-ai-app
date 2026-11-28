import type { DiagnosticResult, DiagnosticSpec, EvidenceItem } from '../types.js';
import { arr, id, obj, oneOf, para, str } from '../validate.js';
import { dedupeById, inRange, nonEmpty, numberParagraphs, prompt, section } from '../text.js';

/**
 * initial_situation_clear: early on, the reader knows who is here, where and
 * when they are, what is happening, and why it matters.
 */

export const ANCHOR_WINDOW_END = 4;
export const RELEVANCE_WINDOW_END = 6;

export interface SituationAnchor extends EvidenceItem {
  kind: 'participant' | 'context' | 'activity' | 'relevance';
  /** Only "strong" context counts; ignored for other kinds. */
  strength: 'strong' | 'weak';
  text: string;
}

export interface InitialSituationEvidence {
  anchors: SituationAnchor[];
}

export const initialSituationSchema = obj({
  anchors: arr(
    obj({
      id,
      paragraph: para,
      kind: oneOf(['participant', 'context', 'activity', 'relevance']),
      strength: oneOf(['strong', 'weak']),
      text: str,
    }),
  ),
});

const TASK = [
  'anchors: in CHAPTER paragraphs 1-12, each point where the text establishes one of:',
  '- participant: a named or clearly identified character present in the scene;',
  '- context: where and/or when the scene takes place. strength "strong" when a reader could picture the setting, "weak" for a bare hint;',
  '- activity: what is going on right now (an action in progress, not backstory);',
  '- relevance: why this moment matters to someone in it (what is at stake or about to change).',
  'Record the earliest paragraph for each instance. Use strength "strong" for kinds other than context.',
].join('\n');

/** [kind, latest allowed paragraph, extra filter] in gate order. */
const ANCHORS: Array<[SituationAnchor['kind'], number, (a: SituationAnchor) => boolean]> = [
  ['participant', ANCHOR_WINDOW_END, () => true],
  ['context', ANCHOR_WINDOW_END, (a) => a.strength === 'strong'],
  ['activity', ANCHOR_WINDOW_END, () => true],
  ['relevance', RELEVANCE_WINDOW_END, () => true],
];

export function scoreInitialSituation(ev: InitialSituationEvidence): DiagnosticResult {
  const anchors = dedupeById(ev.anchors).filter((a) => nonEmpty(a.text) && a.paragraph >= 1);
  const counts: Record<string, number> = {};
  const selected: SituationAnchor[] = [];
  let failedGate: string | null = null;

  for (const [kind, limit, extra] of ANCHORS) {
    const all = anchors.filter((a) => a.kind === kind && extra(a));
    const onTime = all.filter((a) => inRange(a.paragraph, 1, limit)).sort((x, y) => x.paragraph - y.paragraph);
    counts[kind] = all.length;
    counts[`${kind}OnTime`] = onTime.length;
    if (failedGate !== null) continue;
    if (all.length === 0) failedGate = `missing_${kind}`;
    else if (onTime.length === 0) {
      failedGate = `late_${kind}`;
      selected.push(...all);
    } else selected.push(onTime[0] as SituationAnchor);
  }
  return { pass: failedGate === null, failedGate, selectedEvidence: selected, counts };
}

export const initialSituationClear: DiagnosticSpec<InitialSituationEvidence> = {
  id: 'initial_situation_clear',
  description: 'Participant, strong context and current activity appear in paragraphs 1-4; relevance by paragraph 6.',
  schema: initialSituationSchema,
  needs: ['chapter'],
  buildPrompt: (input) =>
    prompt(TASK, initialSituationSchema, [section('CHAPTER (paragraphs 1-12)', input.chapter && numberParagraphs(input.chapter, 12))]),
  score: (ev) => scoreInitialSituation(ev),
};
