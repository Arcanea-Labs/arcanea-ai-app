import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { words } from '../lib/text.mjs';
import { distinctN, repeatedNgramRate, scoreDiversity, longestSentenceLoop } from '../scorers/diversity.mjs';
import { scoreLength } from '../scorers/length.mjs';
import { scoreDrift } from '../scorers/drift.mjs';
import { scoreMustHold, scoreProbes } from '../scorers/consistency.mjs';
import { scoreTaste } from '../scorers/taste-bridge.mjs';

const fixture = {
  cast: [{ name: 'Mara Quell', traits: ['one-handed'] }, { name: 'Oszkar Vell', traits: ['three coats'] }, { name: 'Sefa', traits: ['mute'] }],
  knownNames: ['Saffre'],
};

test('distinct-n counts unique n-grams over total', () => {
  const t = words('the cat sat the cat sat');
  assert.equal(distinctN(t, 1), 3 / 6);
  assert.equal(distinctN(t, 2), 3 / 5);
  assert.equal(distinctN([], 2), null);
});

test('repetition: repeated 4-gram rate and sentence loops detect spirals', () => {
  const clean = 'One small boat crossed at dusk. A heron watched from the reeds. Nobody waved.';
  const loop = 'The bell rang below. The bell rang below. The bell rang below. The bell rang below.';
  assert.equal(repeatedNgramRate(words(clean), 4), 0);
  assert.ok(repeatedNgramRate(words(loop), 4) > 0.9);
  assert.equal(longestSentenceLoop(loop), 4);
  assert.equal(scoreDiversity(loop).duplicateSentenceRate, 0); // sentences under 20 chars are ignored
  const para = 'A paragraph that is long enough to count as a real paragraph.';
  assert.equal(scoreDiversity(`${para}\n\n${para}`).duplicateParagraphRate, 0.5);
});

test('length adherence: full credit inside tolerance, linear falloff, zero beyond 2x', () => {
  const w = (n) => Array.from({ length: n }, () => 'word').join(' ');
  assert.equal(scoreLength(w(110), { words: 100, tolerance: 0.2 }).score, 1);
  assert.equal(Math.round(scoreLength(w(130), { words: 100, tolerance: 0.2 }).score * 100), 50);
  assert.equal(scoreLength(w(150), { words: 100, tolerance: 0.2 }).score, 0);
  assert.equal(scoreLength(w(40), { words: 100 }).within, false);
});

test('drift: catches near-miss spellings of cast names and recurring undeclared names', () => {
  const text = 'At dusk Mara reached Saffre. Later Marra argued with Oszkar. Then Marra left. They met Kettrick twice. Even so Kettrick waited.';
  const d = scoreDrift(text, fixture);
  assert.deepEqual(d.aliasDrift.map((a) => a.found), ['Marra']);
  assert.equal(d.aliasDrift[0].castName, 'Mara Quell');
  assert.deepEqual(d.unknownNames, [{ name: 'Kettrick', count: 2 }]);
  assert.deepEqual(d.missingCast, ['Sefa']);
  assert.equal(Math.round(d.castCoverage * 100), 67);
});

test('drift: declared place names and sentence-initial words are not flagged', () => {
  const d = scoreDrift('Saffre slept. In Saffre the wells were deep. Mara and Sefa and Oszkar waited by Saffre gate.', fixture);
  assert.equal(d.unknownNames.length, 0);
  assert.equal(d.aliasDrift.length, 0);
});

test('mustHold: a contradiction pattern marks the fact violated with evidence', () => {
  const mh = [{ id: 'hand', fact: 'Mara has no left hand.', contradicts: ['\\bMara\\b[^.]{0,40}\\bboth hands'] }];
  assert.equal(scoreMustHold('Mara tied it one-handed.', mh).violated, 0);
  const bad = scoreMustHold('Mara gripped the rail with both hands.', mh);
  assert.equal(bad.violated, 1);
  assert.match(bad.items[0].evidence, /both hands/);
});

test('probes: contradicted beats pass; silence is not-evidenced, not a failure', () => {
  const probes = [{ id: 'p', question: 'one-handed?', evidence: ['one-handed'], contradicts: ['both hands'] }];
  assert.equal(scoreProbes('Mara worked one-handed.', probes).items[0].status, 'pass');
  assert.equal(scoreProbes('Mara worked one-handed, then used both hands.', probes).items[0].status, 'contradicted');
  const silent = scoreProbes('The caravan moved on.', probes);
  assert.equal(silent.items[0].status, 'not-evidenced');
  assert.equal(silent.passRate, 0);
  assert.equal(silent.contradicted, 0);
});

test('TASTE bridge reports unavailable instead of approximating when the build is missing', async () => {
  const empty = mkdtempSync(join(tmpdir(), 'nb-taste-'));
  const r = await scoreTaste('Some prose.', { dir: empty });
  assert.equal(r.available, false);
  assert.match(r.reason, /not built/);
});
