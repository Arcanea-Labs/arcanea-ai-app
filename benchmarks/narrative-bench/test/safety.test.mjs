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
