import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFixtures, buildWritingPrompt } from '../lib/fixtures.mjs';
import { createSystem, DRY_RUN_SYSTEMS } from '../systems/index.mjs';
import { ChapterContinuity, heuristicPlanEvidence, loadArcaneaPackages } from '../systems/hybrid-arcanea.mjs';

// Needs the built dist of world-engine, narrative-planner and narrative-diagnostics.
const [fixture] = loadFixtures(undefined, { only: ['kids-02-snow-robot'] });

test('hybrid-arcanea dry run plans, checks continuity between chapters and scores plan following', async () => {
  const cfg = DRY_RUN_SYSTEMS.find((s) => s.type === 'hybrid-arcanea');
  assert.ok(cfg, 'hybrid-arcanea is part of the dry run');
  const out = await createSystem(cfg).generate(fixture, { buildWritingPrompt });
  assert.equal(out.continuity.checks.length, 3, 'one continuity check after each chapter plan');
  assert.deepEqual(out.continuity.checks.map((c) => c.afterChapterPlan), [1, 2, 3]);
  assert.equal(out.continuity.errors, 0);
  assert.deepEqual(out.diagnostics.planFollowing.curve.map((c) => c.chapter), [1, 2, 3]);
  assert.equal(out.diagnostics.planFollowing.pass, true);
  const planner = out.stages.filter((s) => s.stage.startsWith('plan:'));
  const diag = out.stages.filter((s) => s.stage.startsWith('diagnose:'));
  assert.equal(planner.length, 4 + 3 * 2);
  assert.equal(diag.length, 3);
  assert.ok(out.stages.every((s) => s.usdEstimate === null), 'no configured price means null');
  for (const m of fixture.mustHold) assert.ok(out.text.includes(m.fact.replace(/[.!?]$/, '')), m.id);
});

test('continuity check between chapters catches a character in two places at once', async () => {
  const { continuity } = await loadArcaneaPackages();
  const c = new ChapterContinuity(continuity);
  assert.equal(c.addChapter(1, [{ index: 1, characters: ['Ada'], location: 'mill' }]).errors, 0);
  // Same story-time for both entries: write the ledger event directly to simulate a plan that places Ada twice.
  c.stateEvents.push({ characterId: 'Ada', sceneRef: 'ch-1/s1b', at: 1, changes: { location: 'harbour' } });
  const check = c.addChapter(2, [{ index: 1, characters: ['Ada'], location: 'mill' }]);
  assert.ok(check.errors >= 1);
  assert.ok(check.codes.includes('BILOCATION'), check.codes.join(','));
});

test('stopOnError aborts the planner when the chapter plan breaks continuity', async () => {
  const sys = createSystem({ id: 'ha', type: 'hybrid-arcanea', chapters: 2, planner: { type: 'mock' }, extractor: { type: 'mock' }, continuity: { stopOnError: true } });
  const orig = ChapterContinuity.prototype.addChapter;
  ChapterContinuity.prototype.addChapter = function (...args) {
    const r = orig.apply(this, args);
    return { ...r, errors: 1, codes: ['PLANTED'] };
  };
  try {
    await assert.rejects(sys.generate(fixture, { buildWritingPrompt }), /aborted after continuity errors \(PLANTED\)/);
  } finally {
    ChapterContinuity.prototype.addChapter = orig;
  }
});

test('heuristic plan evidence marks realized, partial and missing bullets with paragraph numbers', () => {
  const text = 'The lamp went out.\n\nMara found the key under the stone step by the gate.';
  const ev = heuristicPlanEvidence(text, ['The lamp went out.', 'Mara found the key under the step', 'A dragon arrives.']);
  assert.deepEqual(ev.bullets.map((b) => [b.status, b.paragraph]), [['realized', 1], ['partial', 2], ['missing', null]]);
});

test('config validation rejects bad chapter counts and unknown extractors', () => {
  assert.throws(() => createSystem({ id: 'x', type: 'hybrid-arcanea', chapters: 0, planner: { type: 'mock' }, extractor: { type: 'mock' } }), /chapters must be/);
  assert.throws(() => createSystem({ id: 'x', type: 'hybrid-arcanea', planner: { type: 'mock' }, extractor: { type: 'nope' } }), /unknown extractor/);
  assert.throws(() => createSystem({ id: 'x', type: 'hybrid-arcanea', planner: { type: 'mock' } }), /planner and extractor are required/);
});
