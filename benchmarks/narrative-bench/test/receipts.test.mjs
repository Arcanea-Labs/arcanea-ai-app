import { test } from 'node:test';
import assert from 'node:assert/strict';
import { usdEstimate, stageReceipt, totalReceipt } from '../lib/receipts.mjs';
import { OpenAICompatibleSystem } from '../systems/openai-compatible.mjs';
import { HybridSystem } from '../systems/hybrid.mjs';
import { loadFixtures, buildWritingPrompt } from '../lib/fixtures.mjs';

const fixture = loadFixtures()[0];

test('usdEstimate is null whenever price or token counts are unknown', () => {
  assert.equal(usdEstimate(1000, 1000, null), null);
  assert.equal(usdEstimate(1000, null, { inputPerMTok: 1, outputPerMTok: 2 }), null);
  assert.equal(usdEstimate(1_000_000, 500_000, { inputPerMTok: 1, outputPerMTok: 2 }), 2);
});

test('receipts mark estimated tokens and keep the total null if any stage price is unknown', () => {
  const est = stageReceipt({ stage: 'write', model: 'm', latencyMs: 5, usage: null, promptText: 'abcdefgh', outputText: 'abcd', pricing: null });
  assert.equal(est.tokensSource, 'estimate-chars-div-4');
  assert.equal(est.inputTokens, 2);
  assert.equal(est.usdEstimate, null);
  const known = stageReceipt({ stage: 'plan', model: 'm', latencyMs: 7, usage: { inputTokens: 10, outputTokens: 20 }, promptText: '', outputText: '', pricing: { inputPerMTok: 0, outputPerMTok: 0, source: 'free' } });
  assert.equal(known.tokensSource, 'api');
  const t = totalReceipt([known, est]);
  assert.equal(t.latencyMs, 12);
  assert.equal(t.usdEstimate, null);
  assert.equal(totalReceipt([known]).usdEstimate, 0);
});

test('OpenAI-compatible system reads the key from env at call time and records API usage', async () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push({ url, init });
    return new Response(JSON.stringify({ choices: [{ message: { content: 'A story.' } }], usage: { prompt_tokens: 100, completion_tokens: 50 } }), { status: 200 });
  };
  const cfg = { id: 'frontier', type: 'openai-compatible', baseUrl: 'https://example.invalid/v1/', model: 'vendor/model-x', apiKeyEnv: 'BENCH_KEY', pricing: { inputPerMTok: 2, outputPerMTok: 10, source: 'test' } };
  const missing = new OpenAICompatibleSystem(cfg, { env: {}, fetchImpl });
  await assert.rejects(missing.generate(fixture, { buildWritingPrompt }), /BENCH_KEY is not set/);
  const sys = new OpenAICompatibleSystem(cfg, { env: { BENCH_KEY: 'k1' }, fetchImpl });
  const out = await sys.generate(fixture, { buildWritingPrompt });
  assert.equal(seen[0].url, 'https://example.invalid/v1/chat/completions');
  assert.equal(seen[0].init.headers.authorization, 'Bearer k1');
  assert.equal(out.stages[0].inputTokens, 100);
  assert.equal(out.stages[0].usdEstimate, (100 * 2 + 50 * 10) / 1e6);
  assert.doesNotMatch(JSON.stringify(sys), /k1/);
});

test('completions mode (PageStorm on vLLM) posts a prompt to /completions', async () => {
  let url;
  let body;
  const fetchImpl = async (u, init) => {
    url = u;
    body = JSON.parse(init.body);
    return new Response(JSON.stringify({ choices: [{ text: 'Base-model prose.' }] }), { status: 200 });
  };
  const sys = new OpenAICompatibleSystem({ id: 'ps', baseUrl: 'http://localhost:8000/v1', model: 'pagestorm', mode: 'completions', unsafeModel: true }, { env: {}, fetchImpl });
  const out = await sys.generate(fixture, { buildWritingPrompt });
  assert.equal(url, 'http://localhost:8000/v1/completions');
  assert.equal(typeof body.prompt, 'string');
  assert.equal(out.stages[0].tokensSource, 'estimate-chars-div-4');
  assert.equal(out.stages[0].usdEstimate, null);
  assert.equal(sys.unsafeModel, true);
});

test('hybrid system plans with one model, writes with another, one receipt per stage', async () => {
  const models = [];
  const fetchImpl = async (_u, init) => {
    const b = JSON.parse(init.body);
    models.push(b.model);
    const content = b.model === 'planner-m' ? '1. Scene one.\n2. Scene two.' : 'The finished story.';
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  };
  const sys = new HybridSystem({ id: 'hybrid', planner: { baseUrl: 'http://p/v1', model: 'planner-m' }, writer: { baseUrl: 'http://w/v1', model: 'writer-m' } }, { env: {}, fetchImpl });
  const out = await sys.generate(fixture, { buildWritingPrompt });
  assert.deepEqual(models, ['planner-m', 'writer-m']);
  assert.deepEqual(out.stages.map((s) => s.stage), ['plan', 'write']);
  assert.equal(out.text, 'The finished story.');
  assert.match(out.plan, /Scene one/);
});
