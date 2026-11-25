import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreSetupLiveProblem,
  scoreSameGoalActive,
  scoreBlockedGoalResponse,
  scoreMysteryUnresolved,
  scoreInitialSituation,
  scoreViewpoint,
  scoreExposition,
  DEFAULT_EXPOSITION_THRESHOLD,
  DIAGNOSTICS,
  validate,
} from '../dist/index.js';
import * as F from './fixtures.mjs';

const { clone } = F;
const expectGate = (result, gate) => {
  assert.equal(result.pass, false, `expected fail at ${gate}`);
  assert.equal(result.failedGate, gate);
};

/* every pass fixture is valid against its own schema */
test('all pass fixtures validate against their diagnostic schema', () => {
  const pairs = [
    ['setup_live_problem', F.setupLiveProblemPass],
    ['same_goal_active', F.sameGoalPass],
    ['blocked_goal_response', F.blockedGoalPass],
    ['mystery_unresolved', F.mysteryPass],
    ['initial_situation_clear', F.situationPass],
    ['viewpoint_control', F.viewpointPass],
    ['exposition_local_need', F.expositionPass],
  ];
  for (const [id, fx] of pairs) assert.deepEqual(validate(fx, DIAGNOSTICS[id].schema), [], id);
});

/* 1. setup_live_problem */
test('setup_live_problem: passes with pressure linked to a window', () => {
  const r = scoreSetupLiveProblem(F.setupLiveProblemPass);
  assert.equal(r.pass, true);
  assert.equal(r.failedGate, null);
  assert.equal(r.selectedEvidence[0].id, 'l1');
  assert.deepEqual(r.counts, { participants: 1, pressures: 1, directions: 1, windows: 1, validLinks: 1 });
});

test('setup_live_problem: fails preview_participant', () => {
  const ev = clone(F.setupLiveProblemPass);
  ev.previewItems = ev.previewItems.filter((i) => i.role !== 'participant');
  expectGate(scoreSetupLiveProblem(ev), 'preview_participant');
});

test('setup_live_problem: fails preview_pressure (subtype outside pressure set does not count)', () => {
  const ev = clone(F.setupLiveProblemPass);
  ev.previewItems[1].subtype = 'goal';
  expectGate(scoreSetupLiveProblem(ev), 'preview_pressure');
});

test('setup_live_problem: fails preview_direction', () => {
  const ev = clone(F.setupLiveProblemPass);
  ev.previewItems = ev.previewItems.filter((i) => i.role !== 'direction');
  expectGate(scoreSetupLiveProblem(ev), 'preview_direction');
});

test('setup_live_problem: fails chapter_window when the window lies past paragraph 12', () => {
  const ev = clone(F.setupLiveProblemPass);
  ev.windows[0].exchange.paragraph = 13;
  expectGate(scoreSetupLiveProblem(ev), 'chapter_window');
});

test('setup_live_problem: a link from a participant alone does not count', () => {
  const ev = clone(F.setupLiveProblemPass);
  ev.links = [{ id: 'l1', previewItemId: 'p1', windowId: 'w1', text: 'Isel is in the window' }];
  expectGate(scoreSetupLiveProblem(ev), 'comparison_link');
});

test('setup_live_problem: duplicate ids are deduped (first wins)', () => {
  const ev = clone(F.setupLiveProblemPass);
  ev.previewItems.push({ ...ev.previewItems[1] });
  assert.equal(scoreSetupLiveProblem(ev).counts.pressures, 1);
});

/* 2. same_goal_active */
test('same_goal_active: passes with owner continuation and 4 distinct paragraphs', () => {
  const r = scoreSameGoalActive(F.sameGoalPass);
  assert.equal(r.pass, true);
  assert.equal(r.counts.bestDistinctParagraphs, 4);
});

test('same_goal_active: fails goal_frame when the goal is framed after paragraph 4', () => {
  const ev = clone(F.sameGoalPass);
  ev.goals[0].paragraph = 5;
  expectGate(scoreSameGoalActive(ev), 'goal_frame');
});

test('same_goal_active: fails goal_frame when no support item exists', () => {
  const ev = clone(F.sameGoalPass);
  ev.goals[0].support = [];
  expectGate(scoreSameGoalActive(ev), 'goal_frame');
});

test('same_goal_active: mention-only, unsupported, or non-ally activity is not a link', () => {
  for (const patch of [{ continuation: 'mention' }, { textSupported: false }, { actorRole: 'other' }, { paragraph: 4 }]) {
    const ev = clone(F.sameGoalPass);
    Object.assign(ev.activities[0], patch);
    expectGate(scoreSameGoalActive(ev), 'continuation_link');
  }
});

test('same_goal_active: ally continuation counts', () => {
  const ev = clone(F.sameGoalPass);
  Object.assign(ev.activities[0], { actor: 'Oren', actorRole: 'ally' });
  assert.equal(scoreSameGoalActive(ev).pass, true);
});

test('same_goal_active: fails paragraph_spread with only two distinct indices', () => {
  const ev = clone(F.sameGoalPass);
  ev.goals[0].motivation.paragraph = 1;
  ev.goals[0].support[0].paragraph = 1;
  expectGate(scoreSameGoalActive(ev), 'paragraph_spread');
});

/* 3. blocked_goal_response */
test('blocked_goal_response: passes when the response follows the goal', () => {
  const r = scoreBlockedGoalResponse(F.blockedGoalPass);
  assert.equal(r.pass, true);
  assert.deepEqual(r.selectedEvidence.map((e) => e.id), ['b1', 'cg1', 'r1']);
});

test('blocked_goal_response: same paragraph counts as order satisfied', () => {
  const ev = clone(F.blockedGoalPass);
  ev.responses[0].paragraph = 1;
  assert.equal(scoreBlockedGoalResponse(ev).pass, true);
});

test('blocked_goal_response: fails preview_blocked_goal without a blocker', () => {
  const ev = clone(F.blockedGoalPass);
  ev.previewPackages[0].blocker = '  ';
  expectGate(scoreBlockedGoalResponse(ev), 'preview_blocked_goal');
});

test('blocked_goal_response: fails chapter_goal when the goal is past paragraph 4', () => {
  const ev = clone(F.blockedGoalPass);
  ev.chapterGoals[0].paragraph = 6;
  expectGate(scoreBlockedGoalResponse(ev), 'chapter_goal');
});

test('blocked_goal_response: fails active_response when the response is passive', () => {
  const ev = clone(F.blockedGoalPass);
  ev.responses[0].active = false;
  expectGate(scoreBlockedGoalResponse(ev), 'active_response');
});

test('blocked_goal_response: fails response_order when every response precedes every goal', () => {
  const ev = clone(F.blockedGoalPass);
  ev.chapterGoals[0].paragraph = 4;
  ev.responses[0].paragraph = 2;
  expectGate(scoreBlockedGoalResponse(ev), 'response_order');
});

/* 4. mystery_unresolved */
test('mystery_unresolved: passes with focal question followed up within 3 paragraphs', () => {
  const r = scoreMysteryUnresolved(F.mysteryPass);
  assert.equal(r.pass, true);
  assert.deepEqual(r.selectedEvidence.map((e) => e.id), ['q1', 'qa1']);
});

test('mystery_unresolved: fails concrete_question', () => {
  const ev = clone(F.mysteryPass);
  ev.questions[0].concrete = false;
  expectGate(scoreMysteryUnresolved(ev), 'concrete_question');
});

test('mystery_unresolved: fails keeps_active when the only activity precedes the question', () => {
  const ev = clone(F.mysteryPass);
  ev.activities[0].paragraph = 6;
  expectGate(scoreMysteryUnresolved(ev), 'keeps_active');
});

test('mystery_unresolved: fails major for a minor question', () => {
  const ev = clone(F.mysteryPass);
  ev.questions[0].category = 'minor';
  expectGate(scoreMysteryUnresolved(ev), 'major');
});

test('mystery_unresolved: fails focal for an antagonist question (major but not focal)', () => {
  const ev = clone(F.mysteryPass);
  ev.questions[0].category = 'antagonist';
  expectGate(scoreMysteryUnresolved(ev), 'focal');
});

test('mystery_unresolved: fails timely_follow_up when the follow-up is 4 paragraphs later', () => {
  const ev = clone(F.mysteryPass);
  ev.activities[0].paragraph = 11;
  expectGate(scoreMysteryUnresolved(ev), 'timely_follow_up');
});

test('mystery_unresolved: fails unresolved when answered inside the window', () => {
  const ev = clone(F.mysteryPass);
  ev.questions[0].resolvedAtParagraph = 12;
  expectGate(scoreMysteryUnresolved(ev), 'unresolved');
});

test('mystery_unresolved: resolution after paragraph 12 still counts as unresolved', () => {
  const ev = clone(F.mysteryPass);
  ev.questions[0].resolvedAtParagraph = 20;
  assert.equal(scoreMysteryUnresolved(ev).pass, true);
});

/* 5. initial_situation_clear */
test('initial_situation_clear: passes with all four anchors on time', () => {
  const r = scoreInitialSituation(F.situationPass);
  assert.equal(r.pass, true);
  assert.equal(r.selectedEvidence.length, 4);
});

for (const kind of ['participant', 'context', 'activity', 'relevance']) {
  test(`initial_situation_clear: fails missing_${kind}`, () => {
    const ev = clone(F.situationPass);
    ev.anchors = ev.anchors.filter((a) => a.kind !== kind);
    expectGate(scoreInitialSituation(ev), `missing_${kind}`);
  });
}

test('initial_situation_clear: fails late_participant / late_context / late_activity at paragraph 5', () => {
  for (const kind of ['participant', 'context', 'activity']) {
    const ev = clone(F.situationPass);
    ev.anchors.find((a) => a.kind === kind).paragraph = 5;
    expectGate(scoreInitialSituation(ev), `late_${kind}`);
  }
});

test('initial_situation_clear: relevance at 6 is on time, at 7 is late', () => {
  const ev = clone(F.situationPass);
  ev.anchors[3].paragraph = 6;
  assert.equal(scoreInitialSituation(ev).pass, true);
  ev.anchors[3].paragraph = 7;
  expectGate(scoreInitialSituation(ev), 'late_relevance');
});

test('initial_situation_clear: weak context counts as missing strong context', () => {
  const ev = clone(F.situationPass);
  ev.anchors[1].strength = 'weak';
  expectGate(scoreInitialSituation(ev), 'missing_context');
});

/* 6. viewpoint_control */
test('viewpoint_control: passes with clear single-character coverage', () => {
  const r = scoreViewpoint(F.viewpointPass, { openingLength: 12 });
  assert.equal(r.pass, true);
  assert.equal(r.counts.coveredParagraphs, 12);
});

test('viewpoint_control: fails no_spans', () => {
  expectGate(scoreViewpoint({ spans: [] }), 'no_spans');
});

test('viewpoint_control: fails coverage below min(6, opening length)', () => {
  const ev = { spans: [clone(F.viewpointPass.spans[0])] };
  ev.spans[0].endParagraph = 4;
  expectGate(scoreViewpoint(ev, { openingLength: 12 }), 'coverage');
  // a 4-paragraph opening only needs 4 covered paragraphs
  assert.equal(scoreViewpoint(ev, { openingLength: 4 }).pass, true);
});

test('viewpoint_control: fails unclear_share above 0.3', () => {
  const ev = clone(F.viewpointPass);
  ev.spans[1].clarity = 'mixed';
  expectGate(scoreViewpoint(ev), 'unclear_share');
});

test('viewpoint_control: two interiorities without a shift signal fail; with a signal pass', () => {
  const ev = clone(F.viewpointPass);
  ev.spans[1].interiorityCharacters = ['Isel', 'Hale'];
  expectGate(scoreViewpoint(ev), 'unsignalled_shift');
  ev.spans[1].shiftSignal = true;
  assert.equal(scoreViewpoint(ev).pass, true);
});

/* 7. exposition_local_need */
test('exposition_local_need: passes at exactly the default threshold (ours, 0.5)', () => {
  assert.equal(DEFAULT_EXPOSITION_THRESHOLD, 0.5);
  const r = scoreExposition(F.expositionPass);
  assert.equal(r.pass, true);
  assert.equal(r.counts.motivatedSharePct, 50);
});

test('exposition_local_need: fails motivated_share with a stricter threshold', () => {
  const r = scoreExposition(F.expositionPass, { threshold: 0.75 });
  expectGate(r, 'motivated_share');
  assert.deepEqual(r.selectedEvidence.map((e) => e.id), ['e2']);
});

test('exposition_local_need: a need two paragraphs away does not motivate', () => {
  const ev = clone(F.expositionPass);
  ev.needs[0].paragraph = 10;
  expectGate(scoreExposition(ev), 'motivated_share');
});

test('exposition_local_need: no exposition passes; bad threshold throws', () => {
  assert.equal(scoreExposition({ expositions: [], needs: [], ties: [] }).pass, true);
  assert.throws(() => scoreExposition(F.expositionPass, { threshold: 1.5 }), RangeError);
});
