// Offline tests for the safety gate's coverage of long outputs and the --run-id guard.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { WorkersAiSafetyClassifier } from '../lib/safety.mjs';

function classifierSeeing(unsafeMarker, sent) {
  const fetchImpl = async (_url, init) => {
    const content = JSON.parse(init.body).messages[0].content;
    sent.push(content);
    const response = content.includes(unsafeMarker) ? 'unsafe\nS1' : 'safe';
    return { ok: true, status: 200, text: async () => JSON.stringify({ result: { response } }) };
  };
  return new WorkersAiSafetyClassifier({ accountId: 'a', apiToken: 't', maxInputChars: 10, fetchImpl });
}

test('text past maxInputChars is still classified, window by window', async () => {
  const sent = [];
  const verdict = await classifierSeeing('BAD', sent).classify('x'.repeat(25) + 'BAD');
  assert.equal(verdict.safe, false);
  assert.deepEqual(sent.map((s) => s.length), [10, 10, 8]);
  assert.equal(sent.join(''), 'x'.repeat(25) + 'BAD');
});

test('a long safe output is classified in full and passes', async () => {
  const sent = [];
  const verdict = await classifierSeeing('BAD', sent).classify('y'.repeat(21));
  assert.equal(verdict.safe, true);
  assert.equal(sent.length, 3);
});

test('an empty output is still sent to the classifier once', async () => {
  const sent = [];
  await classifierSeeing('BAD', sent).classify('');
  assert.equal(sent.length, 1);
});

test('--run-id that carries a path is refused before anything is written', () => {
  const runner = fileURLToPath(new URL('../runner.mjs', import.meta.url));
  for (const id of ['../evil', 'a/b', '..']) {
    const r = spawnSync(process.execPath, [runner, '--dry-run', '--run-id', id], { encoding: 'utf8' });
    assert.notEqual(r.status, 0, `run-id ${id} should be refused`);
    assert.match(r.stderr + r.stdout, /--run-id must be a plain name/);
  }
});

test('a withheld output leaks no verbatim spans through its deterministic scores', async () => {
  const { runBenchmark } = await import('../runner.mjs');
  const { loadFixtures } = await import('../lib/fixtures.mjs');
  const { MockSafetyClassifier } = await import('../lib/safety.mjs');
  const fixtures = loadFixtures(undefined, { only: ['hor-01-thermostat'] });
  // Each line trips a scorer that quotes the output: mustHold, probe evidence, alias drift, unknown names.
  const text = [
    'UNSAFE-MARKER. It reset itself at 03:45 again, secretphrase alpha.',
    'The thermostat had been unplugged for two days.',
    'Then Jass Arkwright listened. Later Jass Arkwright waited.',
    'At dusk Vexmoor knocked. Soon Vexmoor whispered.',
  ].join('\n\n');
  const sys = { id: 'base', markers: [], unsafeModel: true, async generate() { return { text, stages: [] }; } };
  const { rows } = await runBenchmark({ runId: 'x', fixtures, systems: [sys], safetyClassifier: new MockSafetyClassifier({ unsafeMarkers: ['UNSAFE-MARKER'] }), taste: false });
  const row = rows[0];
  assert.equal(row.withheld, true);
  const stored = JSON.stringify(row);
  for (const span of ['03:45', 'secretphrase', 'Jass', 'Vexmoor']) assert.ok(!stored.includes(span), `withheld row still carries "${span}"`);
  // Probe questions come from the fixture; the matched span ("unplugged") would come from the output.
  assert.ok(!stored.includes('"evidence"'), 'withheld row still carries a regex evidence span');
  // The counts that the summary table reads survive redaction.
  const d = row.deterministic;
  assert.equal(d.mustHold.violated, 1);
  assert.equal(d.probes.pass >= 1, true);
  assert.equal(d.drift.aliasDrift.length, 1);
  assert.equal(d.drift.aliasDrift[0].count, 2);
  assert.equal(d.drift.unknownNames.length, 1);
  assert.equal(d.drift.unknownNames[0].count, 2);
});

test('only an exact "safe" verdict clears an output; any other reply fails closed', async () => {
  const classifierAnswering = (response) =>
    new WorkersAiSafetyClassifier({
      accountId: 'a',
      apiToken: 't',
      fetchImpl: async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ result: { response } }) }),
    });
  for (const ok of ['safe', 'Safe', '  safe\n', 'safe\n']) assert.equal((await classifierAnswering(ok).classify('x')).safe, true, `"${ok}" should clear`);
  for (const bad of ['unsafe\nS1', 'safety unclear', 'safe-ish, could not classify', 'safeguards triggered', '', 'I cannot classify this'])
    assert.equal((await classifierAnswering(bad).classify('x')).safe, false, `"${bad}" should fail closed`);
});
