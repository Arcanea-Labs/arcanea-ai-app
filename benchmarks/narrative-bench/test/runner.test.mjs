import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main, runBenchmark, parseArgs } from '../runner.mjs';
import { loadFixtures } from '../lib/fixtures.mjs';
import { MockSystem } from '../systems/mock.mjs';
import { JudgePanel } from '../scorers/judge.mjs';
import { MockJudge, mockPanelJudges } from '../scorers/mock-judge.mjs';
import { MockSafetyClassifier, WITHHELD, safetyClassifierFromConfig, DEFAULT_MAX_INPUT_CHARS } from '../lib/safety.mjs';

const quiet = { log: () => {} };
const readJsonl = (p) => readFileSync(p, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

test('dry run end to end: offline, writes results, receipts and summary', async () => {
  const out = mkdtempSync(join(tmpdir(), 'nb-dry-'));
  const r = await main(['--dry-run', '--out', out, '--run-id', 't1', '--no-taste'], quiet);
  const dir = join(out, 't1');
  for (const f of ['run.json', 'results.jsonl', 'receipts.jsonl', 'summary.md']) assert.ok(existsSync(join(dir, f)), f);
  const rows = readJsonl(join(dir, 'results.jsonl'));
  assert.equal(rows.length, 20 * 3);
  assert.ok(rows.every((x) => x.ok && x.judge && x.judge.judges.length === 2));
  const receipts = readJsonl(join(dir, 'receipts.jsonl'));
  assert.equal(receipts.filter((x) => x.kind === 'system').length, 20 * 4); // hybrid has 2 stages
  assert.equal(receipts.filter((x) => x.kind === 'judge').length, 60 * 2);
  assert.ok(receipts.every((x) => 'latencyMs' in x && 'usdEstimate' in x));
  // Mocks and judges carry no price: unknown must be null, never 0.
  assert.ok(receipts.every((x) => x.usdEstimate === null), 'every dry-run receipt has usdEstimate null');
  assert.ok(rows.every((x) => x.receipt.usdEstimate === null));
  const summary = readFileSync(join(dir, 'summary.md'), 'utf8');
  assert.match(summary, /dry run/);
  assert.match(summary, /\| mock-faithful \| 20\/20 \| 66\/66 \| 59 \/ 0 \/ 0 \|/);
  assert.match(summary, /Cross-story continuity/);
  assert.match(summary, /\| mock-faithful \| saltglass-reach \| 3\/3 \|/);
  assert.match(summary, /\| mock-drift \| saltglass-reach \| 2\/3 \|/);
  assert.match(summary, /never pooled/);
  assert.equal(r.meta.judges.length, 2);
  assert.match(summary, /\| mock-faithful \|[^\n]*\| unknown \|/);
  assert.doesNotMatch(summary, /\$0\.0000/);
  await assert.rejects(main(['--dry-run', '--out', out, '--run-id', 't1', '--no-taste'], quiet), /--overwrite/);
});

test('judges never see system ids or which system produced the text', async () => {
  const fixtures = loadFixtures(undefined, { only: ['kids-01-moth-postman', 'sf-01-salvage-tithe'] });
  const judges = [new MockJudge({ id: 'ja', family: 'a' }), new MockJudge({ id: 'jb', family: 'b', variant: 'hash' })];
  const sys = new MockSystem({ id: 'secret-system-zeta', variant: 'faithful' });
  const { rows } = await runBenchmark({ runId: 'x', fixtures, systems: [sys], panel: new JudgePanel(judges), salt: 's', taste: false });
  assert.equal(rows.length, 2);
  for (const j of judges) {
    assert.equal(j.calls.length, 2);
    for (const c of j.calls) assert.doesNotMatch(c.system + c.user, /secret-system-zeta|mock:faithful/);
  }
  assert.ok(rows.every((r) => /^b-[0-9a-f]{12}$/.test(r.judge.blindId)));
});

test('a system without safety training is refused unless a classifier is configured, and flagged output is withheld', async () => {
  const fixtures = loadFixtures(undefined, { only: ['hor-01-thermostat'] });
  const unsafe = new MockSystem({ id: 'base-model', variant: 'faithful' });
  unsafe.unsafeModel = true;
  await assert.rejects(runBenchmark({ runId: 'x', fixtures, systems: [unsafe], taste: false }), /no safetyClassifier/);
  const panel = new JudgePanel(mockPanelJudges());
  const { rows } = await runBenchmark({ runId: 'x', fixtures, systems: [unsafe], panel, safetyClassifier: new MockSafetyClassifier({ unsafeMarkers: ['thermostat'] }), taste: false });
  assert.equal(rows[0].withheld, true);
  assert.equal(rows[0].text, WITHHELD);
  assert.equal(rows[0].judge, undefined);
  assert.equal(rows[0].safety.safe, false);
});

test('a failing system is recorded as an error row, not dropped', async () => {
  const fixtures = loadFixtures(undefined, { only: ['kids-02-snow-robot'] });
  const broken = { id: 'down', markers: [], unsafeModel: false, async generate() { throw new Error('connect ECONNREFUSED'); } };
  const { rows, receipts } = await runBenchmark({ runId: 'x', fixtures, systems: [broken], taste: false });
  assert.equal(rows[0].ok, false);
  assert.match(rows[0].error, /ECONNREFUSED/);
  assert.equal(receipts.length, 0);
});

test('argument parsing rejects unknown flags and requires values', () => {
  assert.deepEqual(parseArgs(['--fixtures', 'a,b', '--limit', '2']).fixtures, ['a', 'b']);
  assert.throws(() => parseArgs(['--bogus']), /unknown argument/);
  assert.throws(() => parseArgs(['--systems']), /needs a value/);
});

test('the committed example run records unknown prices as null, never 0', () => {
  const dir = new URL('../results/example/', import.meta.url);
  const receipts = readJsonl(new URL('receipts.jsonl', dir));
  assert.ok(receipts.length > 0);
  assert.ok(receipts.every((x) => x.usdEstimate === null), 'example receipts.jsonl');
  assert.ok(readJsonl(new URL('results.jsonl', dir)).every((x) => x.receipt.usdEstimate === null), 'example results.jsonl');
});

test('safety classifier input truncation is configurable and validated', async () => {
  const sent = [];
  const fetchImpl = async (_url, init) => {
    sent.push(JSON.parse(init.body).messages[0].content);
    return { ok: true, status: 200, text: async () => JSON.stringify({ result: { response: 'safe' } }) };
  };
  const env = { CLOUDFLARE_ACCOUNT_ID: 'acct', CLOUDFLARE_API_TOKEN: 'tok' };
  const long = 'x'.repeat(DEFAULT_MAX_INPUT_CHARS + 500);
  const dflt = safetyClassifierFromConfig({ type: 'workers-ai' }, env, { fetchImpl });
  assert.equal(dflt.maxInputChars, DEFAULT_MAX_INPUT_CHARS);
  assert.equal((await dflt.classify(long)).safe, true);
  assert.equal(sent.at(-1).length, DEFAULT_MAX_INPUT_CHARS);
  const small = safetyClassifierFromConfig({ type: 'workers-ai', maxInputChars: 10 }, env, { fetchImpl });
  await small.classify('abcdefghijklmnop');
  assert.equal(sent.at(-1), 'abcdefghij');
  for (const bad of [0, -1, 1.5, '100']) {
    assert.throws(() => safetyClassifierFromConfig({ type: 'workers-ai', maxInputChars: bad }, env, { fetchImpl }), /maxInputChars must be a positive integer/);
  }
});
