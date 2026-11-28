import type { DiagnosticResult, DiagnosticSpec, EvidenceItem } from '../types.js';
import { arr, id, obj, oneOf, para, str } from '../validate.js';
import { OPENING_WINDOW, dedupeById, inRange, nonEmpty, numberParagraphs, prompt, section } from '../text.js';

/**
 * setup_live_problem: what the preview promises (someone, under pressure,
 * heading somewhere) must already be a live local problem in the opening.
 */

export const PRESSURE_SUBTYPES = ['obstacle', 'cost', 'risk', 'rule', 'refusal', 'scarcity'] as const;
export const DIRECTION_SUBTYPES = ['goal', 'need', 'obligation', 'question', 'mission'] as const;
const PARTICIPANT_SUBTYPES = ['character', 'group', 'entity'] as const;

export interface PreviewItem extends EvidenceItem {
  role: 'participant' | 'pressure' | 'direction';
  subtype: string;
  text: string;
}

export interface WindowPart {
  paragraph: number;
  text: string;
}

export interface ProblemWindow extends EvidenceItem {
  gap: WindowPart & { kind: 'open_question' | 'information_gap' };
  exchange: WindowPart;
  constraint: WindowPart;
}

export interface ComparisonLink {
  id: string;
  previewItemId: string;
  windowId: string;
  text: string;
}

export interface SetupLiveProblemEvidence {
  previewItems: PreviewItem[];
  windows: ProblemWindow[];
  links: ComparisonLink[];
}

const part = obj({ paragraph: para, text: str });

export const setupLiveProblemSchema = obj({
  previewItems: arr(
    obj({
      id,
      paragraph: para,
      role: oneOf(['participant', 'pressure', 'direction']),
      subtype: oneOf([...PARTICIPANT_SUBTYPES, ...PRESSURE_SUBTYPES, ...DIRECTION_SUBTYPES]),
      text: str,
    }),
  ),
  windows: arr(
    obj({
      id,
      paragraph: para,
      gap: obj({ paragraph: para, text: str, kind: oneOf(['open_question', 'information_gap']) }),
      exchange: part,
      constraint: part,
    }),
  ),
  links: arr(obj({ id, previewItemId: str, windowId: str, text: str })),
});

const TASK = [
  'Two texts follow: a book PREVIEW and the CHAPTER opening.',
  'previewItems: from the PREVIEW, list participants (who), pressures (an obstacle, cost, risk, rule, refusal or scarcity bearing on them) and directions (a goal, need, obligation, question or mission). "paragraph" is the preview paragraph.',
  'windows: in CHAPTER paragraphs 1-12, list local problem windows. Each needs all three parts: an open question or information gap, an exchange (dialogue, negotiation, confrontation, or a back-and-forth action), and a constraint that is active in that moment. "paragraph" is where the window starts.',
  'links: connect a preview item to a window only when the window plainly dramatises that item. Use the ids you gave.',
].join('\n');

function isPressure(i: PreviewItem): boolean {
  return i.role === 'pressure' && (PRESSURE_SUBTYPES as readonly string[]).includes(i.subtype);
}
function isDirection(i: PreviewItem): boolean {
  return i.role === 'direction' && (DIRECTION_SUBTYPES as readonly string[]).includes(i.subtype);
}

function windowValid(w: ProblemWindow): boolean {
  return [w.gap, w.exchange, w.constraint].every((p) => inRange(p.paragraph, 1, OPENING_WINDOW) && nonEmpty(p.text));
}

export function scoreSetupLiveProblem(ev: SetupLiveProblemEvidence): DiagnosticResult {
  const items = dedupeById(ev.previewItems);
  const participants = items.filter((i) => i.role === 'participant' && nonEmpty(i.text));
  const pressures = items.filter((i) => isPressure(i) && nonEmpty(i.text));
  const directions = items.filter((i) => isDirection(i) && nonEmpty(i.text));
  const windows = dedupeById(ev.windows).filter(windowValid);
  const anchorIds = new Map([...pressures, ...directions].map((i) => [i.id, i]));
  const windowIds = new Map(windows.map((w) => [w.id, w]));
  const validLinks = dedupeById(ev.links).filter((l) => anchorIds.has(l.previewItemId) && windowIds.has(l.windowId));

  const counts = {
    participants: participants.length,
    pressures: pressures.length,
    directions: directions.length,
    windows: windows.length,
    validLinks: validLinks.length,
  };

  const gates: Array<[string, boolean, unknown[]]> = [
    ['preview_participant', participants.length > 0, []],
    ['preview_pressure', pressures.length > 0, participants],
    ['preview_direction', directions.length > 0, [...participants, ...pressures]],
    ['chapter_window', windows.length > 0, [...pressures, ...directions]],
    ['comparison_link', validLinks.length > 0, windows],
  ];
  for (const [gate, ok, sel] of gates) {
    if (!ok) return { pass: false, failedGate: gate, selectedEvidence: sel, counts };
  }
  const link = validLinks[0] as ComparisonLink;
  return {
    pass: true,
    failedGate: null,
    selectedEvidence: [link, anchorIds.get(link.previewItemId), windowIds.get(link.windowId)],
    counts,
  };
}

export const setupLiveProblem: DiagnosticSpec<SetupLiveProblemEvidence> = {
  id: 'setup_live_problem',
  description: 'The preview’s pressure or direction is already a live local problem in chapter paragraphs 1-12.',
  schema: setupLiveProblemSchema,
  needs: ['preview', 'chapter'],
  buildPrompt: (input) =>
    prompt(TASK, setupLiveProblemSchema, [
      section('PREVIEW', input.preview && numberParagraphs(input.preview)),
      section('CHAPTER (paragraphs 1-12)', input.chapter && numberParagraphs(input.chapter, OPENING_WINDOW)),
    ]),
  score: (ev) => scoreSetupLiveProblem(ev),
};
