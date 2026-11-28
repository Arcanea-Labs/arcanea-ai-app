import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JudgePanel, parseJudgeResponse, panelDisagreement, blindId, redactSystemMarkers, buildJudgePrompt } from '../scorers/judge.mjs';
import { WorkersAiJudge, workersAiJudgesFromEnv, extractWorkersAiText, modelFamily, DEFAULT_JUDGE_MODELS } from '../scorers/workers-ai-judge.mjs';
import { loadFixtures } from '../lib/fixtures.mjs';

const fixture = loadFixtures()[0];
const fixed = (id, family, obj) => ({ id, family, async complete() { return { text: typeof obj === 'string' ? obj : JSON.stringify(obj) }; } });
const score = (lq, og, verdict) => ({ literary_quality: lq, originality: og, editorial: { verdict, reasons: ['r'] } });

test('parseJudgeResponse accepts fenced JSON and rejects out-of-range or unknown verdicts', () => {
  const ok = parseJudgeResponse('Here:\n```json\n' + JSON.stringify(score(7, 6, 'Revise')) + '\n```');
  assert.deepEqual(ok, { literaryQuality: 7, originality: 6, editorial: { verdict: 'revise', reasons: ['r'] } });
  assert.throws(() => parseJudgeResponse(JSON.stringify(score(11, 6, 'accept'))), /1-10/);
  assert.throws(() => parseJudgeResponse(JSON.stringify(score(7, 6, 'maybe'))), /verdict/);
  assert.throws(() => parseJudgeResponse('no json here'), /no JSON/);
});

test('panel disagreement is reported per dimension and never averaged', () => {
  const d = panelDisagreement([
    { literaryQuality: 8, originality: 5, editorial: { verdict: 'accept' } },
    { literaryQuality: 4, originality: 6, editorial: { verdict: 'revise' } },
  ]);
  assert.deepEqual(d.literaryQuality, { min: 4, max: 8, spread: 4 });
  assert.equal(d.disagree, true);
  assert.equal(d.flags.length, 2); // literary spread + verdicts; originality spread 1 is fine
  assert.equal('mean' in d.literaryQuality, false);
});

test('JudgePanel requires two model families and records a failing judge instead of dropping it', async () => {
  assert.throws(() => new JudgePanel([fixed('a', 'x', {}), fixed('b', 'x', {})]), /two model families/);
  const panel = new JudgePanel([fixed('good', 'fam-a', score(6, 6, 'revise')), fixed('broken', 'fam-b', 'I refuse to answer in JSON')]);
  const r = await panel.judge({ blind: 'b-1', fixture, text: 'Some story.' });
  assert.equal(r.complete, false);
  assert.equal(r.judges.length, 2);
  assert.equal(r.judges[1].ok, false);
  assert.match(r.judges[1].error, /no JSON/);
});

test('blinding: ids are stable per salt, differ across salts, and reveal no system name', () => {
  const a = blindId('salt1', 'pagestorm-14b', 'fx-1');
  assert.equal(a, blindId('salt1', 'pagestorm-14b', 'fx-1'));
  assert.notEqual(a, blindId('salt2', 'pagestorm-14b', 'fx-1'));
  assert.notEqual(a, blindId('salt1', 'frontier', 'fx-1'));
  assert.doesNotMatch(a, /pagestorm/i);
  const red = redactSystemMarkers('As PageStorm-14B I wrote this. pagestorm-14b out.', ['pagestorm-14b']);
  assert.doesNotMatch(red, /pagestorm/i);
  const prompt = buildJudgePrompt({ blind: a, fixture, text: red });
  assert.ok(prompt.user.includes(a));
  assert.doesNotMatch(prompt.system + prompt.user, /pagestorm/i);
});

test('WorkersAiJudge calls the AI Gateway REST path with bearer auth and never exposes the token', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ success: true, result: { response: JSON.stringify(score(7, 8, 'accept')), usage: { prompt_tokens: 10, completion_tokens: 5 } } }), { status: 200 });
  };
  const j = new WorkersAiJudge({ accountId: 'acct123', apiToken: 'tok-secret', model: '@cf/openai/gpt-oss-120b', fetchImpl });
  const res = await j.complete({ system: 's', user: 'u' });
  assert.equal(calls[0].url, 'https://gateway.ai.cloudflare.com/v1/acct123/starlight-review/workers-ai/@cf/openai/gpt-oss-120b');
  assert.equal(calls[0].init.headers.authorization, 'Bearer tok-secret');
  assert.deepEqual(JSON.parse(calls[0].init.body).messages.map((m) => m.role), ['system', 'user']);
  assert.deepEqual(res.usage, { inputTokens: 10, outputTokens: 5 });
  assert.equal(parseJudgeResponse(res.text).literaryQuality, 7);
  assert.doesNotMatch(JSON.stringify(j), /tok-secret/);
  assert.equal(j.family, 'openai');
});

test('WorkersAiJudge surfaces HTTP errors and handles chat-completions response shapes', async () => {
  const j = new WorkersAiJudge({ accountId: 'a', apiToken: 't', model: '@cf/x/y', fetchImpl: async () => new Response('denied', { status: 403 }) });
  await assert.rejects(j.complete({ system: 's', user: 'u' }), /HTTP 403/);
  assert.equal(extractWorkersAiText({ result: { choices: [{ message: { content: 'hi' } }] } }), 'hi');
  assert.equal(extractWorkersAiText({ choices: [{ text: 'yo' }] }), 'yo');
  assert.throws(() => extractWorkersAiText({ result: {} }), /unrecognised/);
});

test('default Workers AI panel comes from env: two families, overridable, fails without credentials', () => {
  assert.throws(() => workersAiJudgesFromEnv({}), /CLOUDFLARE_ACCOUNT_ID/);
  const env = { CLOUDFLARE_ACCOUNT_ID: 'a', CLOUDFLARE_API_TOKEN: 't' };
  const def = workersAiJudgesFromEnv(env);
  assert.deepEqual(def.map((j) => j.model), DEFAULT_JUDGE_MODELS);
  assert.equal(new Set(def.map((j) => j.family)).size, 2);
  const custom = workersAiJudgesFromEnv({ ...env, NARRATIVE_BENCH_JUDGE_MODELS: '@cf/meta/a, @cf/qwen/b', NARRATIVE_BENCH_AI_GATEWAY: 'other' });
  assert.deepEqual(custom.map((j) => j.family), ['meta', 'qwen']);
  assert.match(custom[0].url, /\/other\/workers-ai\//);
  assert.equal(modelFamily('@cf/deepseek-ai/deepseek-v4.1-flash-1017'), 'deepseek-ai');
});
