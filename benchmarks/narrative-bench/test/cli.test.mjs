// Offline tests for the `cli` system. A fake CLI is written into a fresh
// mkdtemp dir; no real `claude`, `codex` or `gemini` binary is involved.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, chmodSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSystem } from '../systems/index.mjs';
import { CliClient, CliSystem, API_KEY_ENV } from '../systems/cli.mjs';
import { HybridSystem } from '../systems/hybrid.mjs';
import { loadFixtures, buildWritingPrompt } from '../lib/fixtures.mjs';
import { totalReceipt } from '../lib/receipts.mjs';
import { runBenchmark } from '../runner.mjs';

const fixture = loadFixtures()[0];
const dir = mkdtempSync(join(tmpdir(), 'nb-cli-'));
const fake = join(dir, 'fake-llm');
// Modes: echo-stdin | echo-arg | env | sleep | fail | silent | flood
writeFileSync(
  fake,
  `#!${process.execPath}
const mode = process.argv[2];
const chunks = [];
process.stdin.on('data', (c) => chunks.push(c));
process.stdin.on('end', () => {
  const stdin = Buffer.concat(chunks).toString('utf8');
  if (mode === 'echo-stdin') process.stdout.write('STORY<' + stdin + '>');
  else if (mode === 'echo-arg') process.stdout.write('ARGS' + JSON.stringify(process.argv.slice(3)) + ' STDIN<' + stdin + '>');
  else if (mode === 'env') process.stdout.write(JSON.stringify(Object.keys(process.env).filter((k) => /KEY|TOKEN/.test(k)).sort()));
  else if (mode === 'sleep') setTimeout(() => process.stdout.write('late'), 60000);
  else if (mode === 'fail') { process.stderr.write('not logged in'); process.exit(3); }
  else if (mode === 'silent') process.exit(0);
  else if (mode === 'flood') process.stdout.write('x'.repeat(4096));
});
`,
);
chmodSync(fake, 0o755);

const cfg = (extra) => ({ id: 'fake-cli', type: 'cli', command: fake, ...extra });

test('cli system sends the prompt on stdin, reads stdout and records a subscription receipt', async () => {
  const sys = createSystem(cfg({ args: ['echo-stdin'], model: 'vendor/fake-model' }), { env: { PATH: process.env.PATH } });
  assert.ok(sys instanceof CliSystem);
  const out = await sys.generate(fixture, { buildWritingPrompt });
  const p = buildWritingPrompt(fixture);
  assert.equal(out.text, `STORY<${p.system}\n\n${p.user}>`);
  const [r] = out.stages;
  assert.equal(r.model, 'vendor/fake-model');
  assert.equal(r.usdEstimate, null);
  assert.equal(r.pricingSource, 'subscription');
  assert.equal(r.priceSource, 'subscription');
  assert.equal(r.tokensSource, 'estimate-chars-div-4');
  assert.ok(Number.isInteger(r.latencyMs) && r.latencyMs >= 0);
  assert.equal(totalReceipt(out.stages).usdEstimate, null);
  assert.ok(sys.markers.includes('fake-llm') && sys.markers.includes('fake-model'));
});

test('a prompt full of shell metacharacters is never run by a shell (stdin and arg)', async () => {
  const canary = join(dir, 'pwned');
  const evil = `$(touch ${canary}) \`touch ${canary}\` ; touch ${canary} && echo "quoted' | cat`;
  const viaStdin = await new CliClient(cfg({ args: ['echo-stdin'] }), { env: {} }).complete({ system: '', user: evil });
  assert.equal(viaStdin.text, `STORY<${evil}>`);
  const viaArg = await new CliClient(cfg({ args: ['echo-arg', '--flag'], promptVia: 'arg' }), { env: {} }).complete({ system: 'SYS', user: evil });
  // The whole prompt arrives as exactly one argv element, after the configured args, and stdin is empty.
  assert.equal(viaArg.text, `ARGS${JSON.stringify(['--flag', `SYS\n\n${evil}`])} STDIN<>`);
  assert.equal(existsSync(canary), false);
});

test('API-key env vars are stripped from the child by default', async () => {
  const env = { PATH: process.env.PATH, ANTHROPIC_API_KEY: 'a', OPENAI_API_KEY: 'o', GEMINI_API_KEY: 'g', SOME_VENDOR_API_KEY: 's', openai_api_key: 'l', HOME_TOKEN_HINT: 'keep' };
  const stripped = await new CliClient(cfg({ args: ['env'] }), { env }).complete({ system: '', user: 'hi' });
  assert.deepEqual(JSON.parse(stripped.text), ['HOME_TOKEN_HINT']);
  const kept = await new CliClient(cfg({ args: ['env'], keepApiKeyEnv: true }), { env }).complete({ system: '', user: 'hi' });
  assert.ok(JSON.parse(kept.text).includes('ANTHROPIC_API_KEY'));
  for (const k of ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY']) assert.ok(API_KEY_ENV.includes(k));
});

test('the timeout kills a hung CLI', async () => {
  const t0 = Date.now();
  await assert.rejects(new CliClient(cfg({ args: ['sleep'], timeoutMs: 300 }), { env: {} }).complete({ system: '', user: 'x' }), /timed out after 300 ms/);
  assert.ok(Date.now() - t0 < 10000);
});

test('non-zero exit, empty stdout, oversized output and a missing binary are errors', async () => {
  await assert.rejects(new CliClient(cfg({ args: ['fail'] }), { env: {} }).complete({ system: '', user: 'x' }), /exited with 3: not logged in/);
  await assert.rejects(new CliClient(cfg({ args: ['silent'] }), { env: {} }).complete({ system: '', user: 'x' }), /wrote nothing to stdout/);
  await assert.rejects(new CliClient(cfg({ args: ['flood'], maxOutputBytes: 1024 }), { env: {} }).complete({ system: '', user: 'x' }), /output exceeded 1024 bytes/);
  await assert.rejects(new CliClient(cfg({ command: join(dir, 'no-such-cli') }), { env: {} }).complete({ system: '', user: 'x' }), /could not start/);
});

test('config validation rejects shell strings, API keys and bad types', () => {
  assert.throws(() => createSystem(cfg({ command: '' })), /command must be a non-empty string/);
  assert.throws(() => createSystem(cfg({ args: 'echo-stdin' })), /args must be an array of strings/);
  assert.throws(() => createSystem(cfg({ shell: true })), /shell is not supported/);
  assert.throws(() => createSystem(cfg({ apiKeyEnv: 'ANTHROPIC_API_KEY' })), /take no apiKeyEnv/);
  assert.throws(() => createSystem(cfg({ promptVia: 'file' })), /promptVia must be/);
  assert.throws(() => createSystem(cfg({ timeoutMs: 0 })), /timeoutMs must be a positive integer/);
});

test('a hybrid can plan with one CLI and write with another', async () => {
  const sys = new HybridSystem({ id: 'h', planner: { type: 'cli', command: fake, args: ['echo-stdin'] }, writer: { type: 'cli', command: fake, args: ['echo-stdin'], model: 'writer-x' } }, { env: {} });
  const out = await sys.generate(fixture, { buildWritingPrompt });
  assert.match(out.plan, /^STORY</);
  assert.match(out.text, /Follow this plan:\nSTORY</);
  assert.deepEqual(out.stages.map((s) => [s.stage, s.pricingSource, s.usdEstimate]), [['plan', 'subscription', null], ['write', 'subscription', null]]);
});

test('runBenchmark runs a cli system end to end and keeps cost null', async () => {
  const sys = createSystem(cfg({ args: ['echo-stdin'] }), { env: {} });
  const { rows, receipts } = await runBenchmark({ runId: 'cli', fixtures: [fixture], systems: [sys], taste: false });
  assert.equal(rows.length, 1);
  assert.ok(rows[0].ok, rows[0].error);
  assert.equal(rows[0].receipt.usdEstimate, null);
  assert.ok(receipts.some((r) => r.pricingSource === 'subscription'));
});

test('systems.example.json documents claude, codex and gemini CLI examples without keys', () => {
  const example = JSON.parse(readFileSync(new URL('../systems.example.json', import.meta.url), 'utf8'));
  const clis = example.systems.filter((s) => s.type === 'cli');
  assert.deepEqual(clis.map((s) => s.command).sort(), ['claude', 'codex', 'gemini']);
  for (const s of clis) {
    assert.ok(typeof s.$comment === 'string' && s.$comment.length > 0, `${s.id} has a comment`);
    assert.equal(s.apiKeyEnv, undefined);
    assert.ok(createSystem(s, { env: {} }) instanceof CliSystem);
  }
});

test('hybrid-arcanea accepts a cli planner', () => {
  const sys = createSystem({ id: 'ha-cli', type: 'hybrid-arcanea', planner: { type: 'cli', command: fake, args: ['echo-stdin'] }, extractor: { type: 'mock' } }, { env: {} });
  assert.ok(sys.client instanceof CliClient);
});

test('*_API_TOKEN env vars are stripped too, in any case', async () => {
  const env = { PATH: process.env.PATH, REPLICATE_API_TOKEN: 'r', hf_api_token: 'h', Vendor_Api_Token: 'v', HOME_TOKEN_HINT: 'keep' };
  const stripped = await new CliClient(cfg({ args: ['env'] }), { env }).complete({ system: '', user: 'hi' });
  assert.deepEqual(JSON.parse(stripped.text), ['HOME_TOKEN_HINT']);
});

test('a prompt passed as an argv element can never be read as a CLI option', async () => {
  const client = new CliClient(cfg({ args: ['echo-arg'], promptVia: 'arg' }), { env: {} });
  await assert.rejects(client.complete({ system: '', user: '--model=attacker-chosen' }), /would be read as an option/);
  await assert.rejects(client.complete({ system: '', user: '-p evil' }), /would be read as an option/);
  // stdin delivery has no such ambiguity.
  const viaStdin = await new CliClient(cfg({ args: ['echo-stdin'] }), { env: {} }).complete({ system: '', user: '--flag-looking prose' });
  assert.equal(viaStdin.text, 'STORY<--flag-looking prose>');
});
