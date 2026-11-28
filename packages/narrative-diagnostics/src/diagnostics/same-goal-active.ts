import type { DiagnosticResult, DiagnosticSpec, EvidenceItem } from '../types.js';
import { arr, bool, id, obj, oneOf, para, str } from '../validate.js';
import { OPENING_WINDOW, dedupeById, inRange, nonEmpty, numberParagraphs, prompt, section } from '../text.js';

/**
 * same_goal_active: a goal framed in paragraphs 1-4 is still being pursued,
 * substantively, in paragraphs 5-12.
 */

export const GOAL_FRAME_END = 4;
export const LATER_START = 5;
export const MIN_DISTINCT_PARAGRAPHS = 3;

export interface GoalSupport extends EvidenceItem {
  kind: 'constraint' | 'obstacle' | 'attempt';
  text: string;
}

export interface GoalFrame extends EvidenceItem {
  owner: string;
  text: string;
  motivation: { paragraph: number; text: string };
  support: GoalSupport[];
}

export interface LaterActivity extends EvidenceItem {
  goalId: string;
  actor: string;
  actorRole: 'owner' | 'ally' | 'other';
  continuation: 'substantive' | 'mention' | 'none';
  textSupported: boolean;
  text: string;
}

export interface SameGoalActiveEvidence {
  goals: GoalFrame[];
  activities: LaterActivity[];
}

export const sameGoalActiveSchema = obj({
  goals: arr(
    obj({
      id,
      paragraph: para,
      owner: str,
      text: str,
      motivation: obj({ paragraph: para, text: str }),
      support: arr(obj({ id, paragraph: para, kind: oneOf(['constraint', 'obstacle', 'attempt']), text: str })),
    }),
  ),
  activities: arr(
    obj({
      id,
      paragraph: para,
      goalId: str,
      actor: str,
      actorRole: oneOf(['owner', 'ally', 'other']),
      continuation: oneOf(['substantive', 'mention', 'none']),
      textSupported: bool,
      text: str,
    }),
  ),
});

const TASK = [
  'goals: goals stated or clearly implied in CHAPTER paragraphs 1-4. For each give the owner, the motivation (why they want it, with its paragraph) and support items: constraints, obstacles or attempts tied to the goal, each with its paragraph.',
  'activities: actions in paragraphs 5-12 that relate to one of those goals. goalId is the goal id. actorRole is "owner" if the goal owner acts, "ally" if someone acting on the owner’s side, otherwise "other". continuation is "substantive" when the action moves the goal forward or meets resistance to it, "mention" when the goal is only referred to, "none" when the link is a stretch. textSupported is true only if the paragraph itself shows the connection.',
].join('\n');

function frameValid(g: GoalFrame): boolean {
  return (
    inRange(g.paragraph, 1, GOAL_FRAME_END) &&
    nonEmpty(g.owner) &&
    nonEmpty(g.motivation.text) &&
    inRange(g.motivation.paragraph, 1, OPENING_WINDOW) &&
    g.support.some((s) => inRange(s.paragraph, 1, OPENING_WINDOW) && nonEmpty(s.text))
  );
}

function linkValid(a: LaterActivity): boolean {
  return (
    inRange(a.paragraph, LATER_START, OPENING_WINDOW) &&
    a.continuation === 'substantive' &&
    a.textSupported &&
    (a.actorRole === 'owner' || a.actorRole === 'ally')
  );
}

export function scoreSameGoalActive(ev: SameGoalActiveEvidence): DiagnosticResult {
  const frames = dedupeById(ev.goals).filter(frameValid);
  const links = dedupeById(ev.activities).filter(linkValid);
  const linked = frames.map((g) => ({ goal: g, links: links.filter((l) => l.goalId === g.id) })).filter((x) => x.links.length > 0);

  let best: { goal: GoalFrame; links: LaterActivity[]; distinct: number; late: boolean } | undefined;
  for (const x of linked) {
    const support = dedupeById(x.goal.support).filter((s) => inRange(s.paragraph, 1, OPENING_WINDOW));
    const indices = new Set([x.goal.paragraph, x.goal.motivation.paragraph, ...support.map((s) => s.paragraph), ...x.links.map((l) => l.paragraph)]);
    const cand = { ...x, distinct: indices.size, late: [...indices].some((p) => p >= LATER_START) };
    if (!best || cand.distinct > best.distinct) best = cand;
    if (cand.distinct >= MIN_DISTINCT_PARAGRAPHS && cand.late) {
      best = cand;
      break;
    }
  }

  const counts = {
    goalFrames: frames.length,
    validLinks: links.length,
    linkedGoals: linked.length,
    bestDistinctParagraphs: best?.distinct ?? 0,
  };
  if (frames.length === 0) return { pass: false, failedGate: 'goal_frame', selectedEvidence: [], counts };
  if (!best) return { pass: false, failedGate: 'continuation_link', selectedEvidence: frames, counts };
  const selected = [best.goal, ...best.links];
  if (best.distinct < MIN_DISTINCT_PARAGRAPHS || !best.late) {
    return { pass: false, failedGate: 'paragraph_spread', selectedEvidence: selected, counts };
  }
  return { pass: true, failedGate: null, selectedEvidence: selected, counts };
}

export const sameGoalActive: DiagnosticSpec<SameGoalActiveEvidence> = {
  id: 'same_goal_active',
  description: 'A goal framed in paragraphs 1-4 is substantively continued by its owner or an ally in paragraphs 5-12.',
  schema: sameGoalActiveSchema,
  needs: ['chapter'],
  buildPrompt: (input) =>
    prompt(TASK, sameGoalActiveSchema, [section('CHAPTER (paragraphs 1-12)', input.chapter && numberParagraphs(input.chapter, OPENING_WINDOW))]),
  score: (ev) => scoreSameGoalActive(ev),
};
