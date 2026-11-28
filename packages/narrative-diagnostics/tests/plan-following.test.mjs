import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MockExtractor, buildPlanPrompt, runPlanFollowing, scoreChapterPlan, scorePlanCurve, validate, planFollowingSchema } from '../dist/index.js';
import { PLAN_CHAPTERS } from './fixtures.mjs';

const b = (bullet, status, paragraph = null) => ({ id: `b${bullet}`, bullet, status, paragraph, text: status === 'missing' ? '' : 'quote' });

test('plan_following: all bullets realised scores 7 = 100%', () => {
  const s = scoreChapterPlan(1, 4, { bullets: [b(1, 'realized', 1), b(2, 'realized', 3), b(3, 'realized', 10), b(4, 'realized', 12)] });
  assert.equal(s.score, 7);
  assert.equal(s.percent, 100);
});

test('plan_following: nothing realised scores 1 = 0%; contradicted earns nothing', () => {
  const s = scoreChapterPlan(1, 2, { bullets: [b(1, 'contradicted', 2), b(2, 'missing')] });
  assert.equal(s.score, 1);
  assert.equal(s.percent, 0);
  assert.equal(s.contradicted, 1);
});

test('plan_following: linear mapping, partial counts half, unmentioned bullets are missing', () => {
  // coverage = (1 + 0.5) / 4 = 0.375 -> 1 + round(2.25) = 3 -> 33.3%
  const s = scoreChapterPlan(2, 4, { bullets: [b(1, 'realized', 1), b(2, 'partial', 2)] });
  assert.equal(s.score, 3);
  assert.equal(s.percent, 33.3);
  assert.equal(s.missing, 2);
});

test('plan_following: duplicate ids, duplicate bullet numbers and out-of-range bullets are dropped', () => {
  const s = scoreChapterPlan(1, 2, { bullets: [b(1, 'realized', 1), { ...b(1, 'missing'), id: 'other' }, b(1, 'missing'), b(9, 'realized', 1)] });
  assert.equal(s.realized, 1);
  assert.equal(s.missing, 1);
  assert.throws(() => scoreChapterPlan(1, 0, { bullets: [] }), RangeError);
});

test('plan_following: curve is sorted by chapter, reports decay, fails a chapter below threshold', () => {
  const ch1 = scoreChapterPlan(1, 2, { bullets: [b(1, 'realized', 1), b(2, 'realized', 2)] });
  const ch3 = scoreChapterPlan(3, 2, { bullets: [b(1, 'missing'), b(2, 'missing')] });
  const ch2 = scoreChapterPlan(2, 2, { bullets: [b(1, 'realized', 1), b(2, 'missing')] });
  const r = scorePlanCurve([ch3, ch1, ch2]);
  assert.deepEqual(r.curve.map((c) => c.chapter), [1, 2, 3]);
  assert.deepEqual(r.curve.map((c) => c.percent), [100, 50, 0]);
  assert.equal(r.counts.decayPct, 100);
  assert.equal(r.failedGate, 'chapter_below_threshold');
  assert.deepEqual(r.selectedEvidence.map((c) => c.chapter), [3]);
  assert.equal(scorePlanCurve([ch1, ch2]).pass, true);
  assert.equal(scorePlanCurve([]).failedGate, 'no_chapters');
});

test('plan_following: runPlanFollowing extracts once per chapter and returns the curve', async () => {
  const mock = new MockExtractor([
    { bullets: [b(1, 'realized', 1), b(2, 'realized', 3), b(3, 'realized', 10), b(4, 'realized', 12)] },
    '<<not json>>',
    { bullets: [b(1, 'realized', 1), b(2, 'missing'), b(3, 'partial', 2), b(4, 'missing')] },
  ]);
  const r = await runPlanFollowing(mock, PLAN_CHAPTERS);
  assert.deepEqual(r.attempts, [1, 2]);
  assert.deepEqual(r.curve.map((c) => c.percent), [100, 33.3]);
  assert.equal(r.pass, false);
  assert.match(mock.requests[0].user, /=== PLAN ===\n1\. Isel takes the ledger/);
});

test('plan_following: prompt numbers plan bullets and chapter paragraphs; schema rejects bad status', () => {
  const p = buildPlanPrompt(PLAN_CHAPTERS[1]);
  assert.match(p.user, /4\. she reads the ledger/);
  assert.match(p.user, /\[P2\] The runner lost her/);
  assert.ok(validate({ bullets: [{ ...b(1, 'done', 1) }] }, planFollowingSchema).length > 0);
});
