import type { DiagnosticResult, DiagnosticSpec, EvidenceItem } from '../types.js';
import { arr, bool, id, obj, oneOf, para, str } from '../validate.js';
import { OPENING_WINDOW, dedupeById, inRange, nonEmpty, numberParagraphs, prompt, section } from '../text.js';

/**
 * mystery_unresolved: the opening raises a concrete, important question,
 * keeps it in play within a few paragraphs, and does not answer it yet.
 */

export const MAJOR_CATEGORIES = ['story_problem', 'goal', 'stakes', 'world_rule', 'antagonist', 'identity_relationship', 'causal_secret'] as const;
export const FOCAL_CATEGORIES = ['story_problem', 'goal', 'stakes', 'world_rule'] as const;
export const FOLLOW_UP_DISTANCE = 3;

export interface MysteryQuestion extends EvidenceItem {
  text: string;
  concrete: boolean;
  category: (typeof MAJOR_CATEGORIES)[number] | 'minor';
  /** Paragraph where the text answers it, or null when it stays open. */
  resolvedAtParagraph: number | null;
}

export interface QuestionActivity extends EvidenceItem {
  questionId: string;
  text: string;
}

export interface MysteryUnresolvedEvidence {
  questions: MysteryQuestion[];
  activities: QuestionActivity[];
}

export const mysteryUnresolvedSchema = obj({
  questions: arr(
    obj({
      id,
      paragraph: para,
      text: str,
      concrete: bool,
      category: oneOf([...MAJOR_CATEGORIES, 'minor']),
      resolvedAtParagraph: { type: ['integer', 'null'], minimum: 1 },
    }),
  ),
  activities: arr(obj({ id, paragraph: para, questionId: str, text: str })),
});

const TASK = [
  'questions: questions the reader is made to ask in CHAPTER paragraphs 1-12, with the paragraph where each is raised. concrete is true when the question could be stated as one specific sentence ("who sealed the door?"), false for vague unease. category: story_problem, goal, stakes, world_rule, antagonist, identity_relationship, causal_secret, or minor. resolvedAtParagraph is the paragraph where the text answers it, or null if it is still open at paragraph 12.',
  'activities: later moments that keep a question active (someone investigates, avoids, lies about it, a new clue). questionId refers to the question; paragraph must be after the question’s paragraph.',
].join('\n');

const isMajor = (q: MysteryQuestion) => (MAJOR_CATEGORIES as readonly string[]).includes(q.category);
const isFocal = (q: MysteryQuestion) => (FOCAL_CATEGORIES as readonly string[]).includes(q.category);

export function scoreMysteryUnresolved(ev: MysteryUnresolvedEvidence): DiagnosticResult {
  const questions = dedupeById(ev.questions).filter((q) => q.concrete && nonEmpty(q.text) && inRange(q.paragraph, 1, OPENING_WINDOW));
  const activities = dedupeById(ev.activities).filter((a) => inRange(a.paragraph, 1, OPENING_WINDOW));
  const activitiesFor = (q: MysteryQuestion) => activities.filter((a) => a.questionId === q.id && a.paragraph > q.paragraph);

  const active = questions.filter((q) => activitiesFor(q).length > 0);
  const major = active.filter(isMajor);
  const focal = major.filter(isFocal);
  const timely = focal.filter((q) =>
    activitiesFor(q).some((a) => a.paragraph <= Math.min(q.paragraph + FOLLOW_UP_DISTANCE, OPENING_WINDOW)),
  );
  const open = timely.filter((q) => q.resolvedAtParagraph === null || q.resolvedAtParagraph > OPENING_WINDOW);

  const counts = {
    concreteQuestions: questions.length,
    activeQuestions: active.length,
    majorQuestions: major.length,
    focalQuestions: focal.length,
    timelyFollowUps: timely.length,
    unresolved: open.length,
  };
  const gates: Array<[string, unknown[], unknown[]]> = [
    ['concrete_question', questions, []],
    ['keeps_active', active, questions],
    ['major', major, active],
    ['focal', focal, major],
    ['timely_follow_up', timely, focal],
    ['unresolved', open, timely],
  ];
  for (const [gate, survivors, prev] of gates) {
    if (survivors.length === 0) return { pass: false, failedGate: gate, selectedEvidence: prev, counts };
  }
  const q = open[0] as MysteryQuestion;
  return { pass: true, failedGate: null, selectedEvidence: [q, ...activitiesFor(q)], counts };
}

export const mysteryUnresolved: DiagnosticSpec<MysteryUnresolvedEvidence> = {
  id: 'mystery_unresolved',
  description: 'A concrete, focal question raised in paragraphs 1-12 is followed up within 3 paragraphs and left open.',
  schema: mysteryUnresolvedSchema,
  needs: ['chapter'],
  buildPrompt: (input) =>
    prompt(TASK, mysteryUnresolvedSchema, [section('CHAPTER (paragraphs 1-12)', input.chapter && numberParagraphs(input.chapter, OPENING_WINDOW))]),
  score: (ev) => scoreMysteryUnresolved(ev),
};
