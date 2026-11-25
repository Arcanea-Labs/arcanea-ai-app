import type { DiagnosticResult, DiagnosticSpec, EvidenceItem } from '../types.js';
import { arr, bool, id, obj, para, str } from '../validate.js';
import { dedupeById, inRange, nonEmpty, numberParagraphs, prompt, section } from '../text.js';

/**
 * blocked_goal_response: the preview promises a blocked goal, and the opening
 * shows a goal and someone actively responding to it, in that order.
 */

export const RESPONSE_WINDOW_END = 4;

export interface BlockedGoalPackage extends EvidenceItem {
  actor: string;
  goal: string;
  blocker: string;
}

export interface ChapterGoal extends EvidenceItem {
  actor: string;
  text: string;
}

export interface GoalResponse extends EvidenceItem {
  actor: string;
  active: boolean;
  text: string;
}

export interface BlockedGoalResponseEvidence {
  previewPackages: BlockedGoalPackage[];
  chapterGoals: ChapterGoal[];
  responses: GoalResponse[];
}

export const blockedGoalResponseSchema = obj({
  previewPackages: arr(obj({ id, paragraph: para, actor: str, goal: str, blocker: str })),
  chapterGoals: arr(obj({ id, paragraph: para, actor: str, text: str })),
  responses: arr(obj({ id, paragraph: para, actor: str, active: bool, text: str })),
});

const TASK = [
  'previewPackages: from the PREVIEW, each case where someone (actor) wants something (goal) and something stands in the way (blocker). All three must be on the page.',
  'chapterGoals: goals someone holds in CHAPTER paragraphs 1-4.',
  'responses: in CHAPTER paragraphs 1-4, what characters do in reaction to a goal or its blocker. active is true when they act (try, refuse, bargain, hide, fight, flee with purpose); false when they only feel, wait or reflect.',
].join('\n');

export function scoreBlockedGoalResponse(ev: BlockedGoalResponseEvidence): DiagnosticResult {
  const packages = dedupeById(ev.previewPackages).filter((p) => nonEmpty(p.actor) && nonEmpty(p.goal) && nonEmpty(p.blocker));
  const goals = dedupeById(ev.chapterGoals).filter((g) => inRange(g.paragraph, 1, RESPONSE_WINDOW_END) && nonEmpty(g.text));
  const responses = dedupeById(ev.responses).filter((r) => r.active && inRange(r.paragraph, 1, RESPONSE_WINDOW_END) && nonEmpty(r.text));
  const counts = { previewPackages: packages.length, chapterGoals: goals.length, activeResponses: responses.length };

  if (packages.length === 0) return { pass: false, failedGate: 'preview_blocked_goal', selectedEvidence: [], counts };
  if (goals.length === 0) return { pass: false, failedGate: 'chapter_goal', selectedEvidence: packages, counts };
  if (responses.length === 0) return { pass: false, failedGate: 'active_response', selectedEvidence: goals, counts };
  for (const g of goals) {
    const r = responses.find((x) => x.paragraph >= g.paragraph);
    if (r) return { pass: true, failedGate: null, selectedEvidence: [packages[0], g, r], counts };
  }
  return { pass: false, failedGate: 'response_order', selectedEvidence: [...goals, ...responses], counts };
}

export const blockedGoalResponse: DiagnosticSpec<BlockedGoalResponseEvidence> = {
  id: 'blocked_goal_response',
  description: 'A blocked goal in the preview is met in paragraphs 1-4 by a goal and an active response at or after it.',
  schema: blockedGoalResponseSchema,
  needs: ['preview', 'chapter'],
  buildPrompt: (input) =>
    prompt(TASK, blockedGoalResponseSchema, [
      section('PREVIEW', input.preview && numberParagraphs(input.preview)),
      section('CHAPTER (paragraphs 1-4)', input.chapter && numberParagraphs(input.chapter, RESPONSE_WINDOW_END)),
    ]),
  score: (ev) => scoreBlockedGoalResponse(ev),
};
