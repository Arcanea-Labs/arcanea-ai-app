import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadFixtures, validateFixture, buildWritingPrompt, FIXTURE_DIR } from '../lib/fixtures.mjs';
import { scoreDeterministic } from '../scorers/deterministic.mjs';
import { mockText } from '../systems/mock.mjs';

const fixtures = loadFixtures();
const hits = (text, list) => list.some((s) => new RegExp(s, 'iu').test(text));

test('20 fixtures load and validate, spread across the required genres', () => {
  assert.equal(fixtures.length, 20);
  const tags = new Set(fixtures.flatMap((f) => f.tags));
  for (const g of ['fantasy', 'sci-fi', 'mystery', 'literary', 'romance-lite', 'horror-lite', 'childrens', 'interactive-fiction']) assert.ok(tags.has(g), `missing genre ${g}`);
  assert.equal(new Set(fixtures.map((f) => f.id)).size, 20);
});

test('six fixtures share one micro-world with world-scoped facts', () => {
  const group = fixtures.filter((f) => f.continuityGroup === 'saltglass-reach');
  assert.equal(group.length, 6);
  const worldIds = group.map((f) => f.mustHold.filter((m) => m.scope === 'world').map((m) => m.id).sort().join(','));
  assert.equal(new Set(worldIds).size, 1, 'every shared-world fixture carries the same world facts');
});

test('validator rejects malformed fixtures', () => {
  assert.ok(validateFixture({}).length > 0);
  const bad = structuredClone(fixtures[0]);
  bad.mustHold[0].contradicts = ['(unclosed'];
  bad.cast = bad.cast.slice(0, 2);
  const errs = validateFixture(bad);
  assert.ok(errs.some((e) => /invalid regex/.test(e)));
  assert.ok(errs.some((e) => /cast must hold/.test(e)));
});

test('validator requires knownNames and checks aliases when present', () => {
  const missing = structuredClone(fixtures[0]);
  delete missing.knownNames;
  assert.ok(validateFixture(missing).includes('missing field knownNames'));
  const wrongType = structuredClone(fixtures[0]);
  wrongType.knownNames = ['Ok', 3];
  assert.ok(validateFixture(wrongType).some((e) => /knownNames must be an array of non-empty strings/.test(e)));
  const badAlias = structuredClone(fixtures[0]);
  badAlias.cast[0].aliases = 'Roz';
  assert.ok(validateFixture(badAlias).some((e) => /aliases must be an array of non-empty strings/.test(e)));
  const goodAlias = structuredClone(fixtures[0]);
  goodAlias.cast[0].aliases = ['Roz'];
  assert.deepEqual(validateFixture(goodAlias), []);
});

test('every check behaves on its own examples (fixture self-test)', () => {
  for (const f of fixtures) {
    const allContra = [...f.mustHold.flatMap((m) => m.contradicts), ...f.probes.flatMap((p) => p.contradicts ?? [])];
    for (const m of f.mustHold) {
      assert.ok(hits(m.violationExample, m.contradicts), `${f.id}/${m.id}: violationExample not caught`);
      assert.ok(!hits(m.fact, allContra), `${f.id}/${m.id}: the fact itself trips a contradiction`);
    }
    for (const p of f.probes) {
      assert.ok(hits(p.passExample, p.evidence), `${f.id}/${p.id}: passExample has no evidence`);
      assert.ok(!hits(p.passExample, allContra), `${f.id}/${p.id}: passExample trips a contradiction`);
      if (p.contradicts?.length) assert.ok(hits(p.failExample, p.contradicts), `${f.id}/${p.id}: failExample not caught`);
    }
  }
});

test('faithful mock is clean on every fixture; drift mock is caught on every fixture', async () => {
  for (const f of fixtures) {
    const good = await scoreDeterministic(mockText(f, 'faithful'), f, { taste: false });
    assert.equal(good.mustHold.violated, 0, f.id);
    assert.equal(good.probes.pass, good.probes.total, f.id);
    assert.equal(good.drift.aliasDrift.length + good.drift.unknownNames.length, 0, f.id);
    assert.ok(good.length.within, `${f.id}: faithful length ${good.length.words}`);
    const bad = await scoreDeterministic(mockText(f, 'drift'), f, { taste: false });
    assert.ok(bad.mustHold.violated >= 1, f.id);
    assert.ok(bad.drift.aliasDrift.length >= 1, f.id);
    assert.ok(bad.diversity.longestSentenceLoop >= 4, f.id);
  }
});

test('fixtures use no Arcanea canon names and the writing prompt never leaks probes', () => {
  const canon = /\b(?:Arcanea|Arcanean|Lumina|Luminor|Guardian|Godbeast|Starlight)\b/;
  for (const name of readdirSync(FIXTURE_DIR).filter((n) => n.endsWith('.json'))) {
    assert.doesNotMatch(readFileSync(join(FIXTURE_DIR, name), 'utf8'), canon, name);
  }
  for (const f of fixtures) {
    const { user } = buildWritingPrompt(f);
    for (const p of f.probes) assert.ok(!user.includes(p.question), `${f.id}: probe question leaked`);
  }
});
