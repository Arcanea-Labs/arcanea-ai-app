// Handwritten, original evidence fixtures (CC-BY-4.0, Arcanea). Not taken from
// the Pageshift paper, LongPage, or any published book. The running example is
// an invented opening: Isel, a tide-clerk in a half-flooded harbour city, must
// get a sealed ledger past the Weir Guard before the night tide closes the gate.

export const clone = (x) => structuredClone(x);

export const PREVIEW_TEXT = [
  'Isel Varro keeps the tide ledgers of Lowmere, a harbour city that floods every night.',
  'When her brother is accused of selling gate codes, the only proof of his innocence is a sealed ledger the Weir Guard has forbidden anyone to carry out of the archive.',
  'She has one night to smuggle it across the flooding quarter, and the Guard captain is the man who taught her to read the tides.',
].join('\n\n');

export const CHAPTER_TEXT = [
  'The bell for the night tide had already rung twice when Isel slid the ledger under her coat.',
  'Water stood ankle-deep in the archive corridor, cold through her boots.',
  '"You are not signed out," the night clerk said, blocking the stair.',
  '"Then sign me out, Oren. My brother hangs at dawn if this stays here."',
  'Oren looked at the bulge under her coat and did not reach for the register.',
  'Captain Hale\'s lantern swung at the top of the stair.',
  'She thought of the gate codes, and of who else had held the key.',
  'The rule was older than the flood walls: nothing leaves the archive after the second bell.',
  'Hale asked what she was carrying. She told him it was her own tide log.',
  'He let her pass, but he sent a runner down the water stair behind her.',
  'At the canal she found the ferry chained and the ferryman gone.',
  'Someone had broken the ledger\'s seal already.',
].join('\n\n');

export const setupLiveProblemPass = {
  previewItems: [
    { id: 'p1', paragraph: 1, role: 'participant', subtype: 'character', text: 'Isel Varro, tide-clerk' },
    { id: 'p2', paragraph: 2, role: 'pressure', subtype: 'rule', text: 'Guard forbids carrying the ledger out' },
    { id: 'p3', paragraph: 3, role: 'direction', subtype: 'mission', text: 'smuggle the ledger across in one night' },
  ],
  windows: [
    {
      id: 'w1',
      paragraph: 3,
      gap: { paragraph: 3, text: 'will Oren let her pass?', kind: 'open_question' },
      exchange: { paragraph: 4, text: '"Then sign me out, Oren."' },
      constraint: { paragraph: 3, text: 'not signed out; stair blocked' },
    },
  ],
  links: [{ id: 'l1', previewItemId: 'p2', windowId: 'w1', text: 'the forbidding rule is what Oren enforces' }],
};

export const sameGoalPass = {
  goals: [
    {
      id: 'g1',
      paragraph: 1,
      owner: 'Isel',
      text: 'get the ledger out of the archive',
      motivation: { paragraph: 4, text: 'brother hangs at dawn' },
      support: [{ id: 's1', paragraph: 3, kind: 'obstacle', text: 'Oren blocks the stair' }],
    },
  ],
  activities: [
    { id: 'a1', paragraph: 9, goalId: 'g1', actor: 'Isel', actorRole: 'owner', continuation: 'substantive', textSupported: true, text: 'lies to Hale about the ledger' },
  ],
};

export const blockedGoalPass = {
  previewPackages: [{ id: 'b1', paragraph: 2, actor: 'Isel', goal: 'prove brother innocent', blocker: 'Weir Guard forbids moving the ledger' }],
  chapterGoals: [{ id: 'cg1', paragraph: 1, actor: 'Isel', text: 'take the ledger' }],
  responses: [{ id: 'r1', paragraph: 4, actor: 'Isel', active: true, text: 'demands Oren sign her out' }],
};

export const mysteryPass = {
  questions: [
    { id: 'q1', paragraph: 7, text: 'who else held the gate key?', concrete: true, category: 'story_problem', resolvedAtParagraph: null },
  ],
  activities: [{ id: 'qa1', paragraph: 10, questionId: 'q1', text: 'Hale sends a runner after her' }],
};

export const situationPass = {
  anchors: [
    { id: 'n1', paragraph: 1, kind: 'participant', strength: 'strong', text: 'Isel' },
    { id: 'n2', paragraph: 2, kind: 'context', strength: 'strong', text: 'flooded archive corridor at night tide' },
    { id: 'n3', paragraph: 1, kind: 'activity', strength: 'strong', text: 'slides the ledger under her coat' },
    { id: 'n4', paragraph: 4, kind: 'relevance', strength: 'strong', text: 'brother hangs at dawn' },
  ],
};

export const viewpointPass = {
  spans: [
    { id: 'v1', startParagraph: 1, endParagraph: 8, viewpointCharacter: 'Isel', clarity: 'clear', interiorityCharacters: ['Isel'], shiftSignal: false, text: 'She thought of the gate codes' },
    { id: 'v2', startParagraph: 9, endParagraph: 12, viewpointCharacter: 'Isel', clarity: 'clear', interiorityCharacters: [], shiftSignal: false, text: 'she found the ferry chained' },
  ],
};

export const expositionPass = {
  expositions: [
    { id: 'e1', paragraph: 8, topic: 'archive rule', text: 'nothing leaves the archive after the second bell' },
    { id: 'e2', paragraph: 2, topic: 'flooding', text: 'water stood ankle-deep' },
  ],
  needs: [{ id: 'd1', paragraph: 9, kind: 'obstacle', text: 'Hale asks what she carries' }],
  ties: [{ id: 't1', expositionId: 'e1', needId: 'd1' }],
};

export const PLAN_CHAPTERS = [
  { chapter: 1, text: CHAPTER_TEXT, planBullets: ['Isel takes the ledger', 'Oren confronts her', 'Hale lets her pass but sets a watcher', 'the seal is found broken'] },
  { chapter: 2, text: 'Isel waded the canal.\n\nThe runner lost her at the fish market.', planBullets: ['Isel crosses the canal', 'she meets her brother\'s advocate', 'the runner corners her', 'she reads the ledger'] },
];
