import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MockExtractor,
  WorkersAiExtractor,
  ExtractionError,
  DEFAULT_WORKERS_AI_MODEL,
  extractEvidence,
  parseModelJson,
  readWorkersAiText,
  runDiagnostic,
  runAll,
  validate,
  splitParagraphs,
  numberParagraphs,
  dedupeById,
  DIAGNOSTICS,
} from '../dist/index.js';
import * as F from './fixtures.mjs';

test('validate: rejects wrong types, missing keys, extra keys, bad enums, paragraph 0', () => {
  const schema = DIAGNOSTICS.blocked_goal_response.schema;
  const bad = {
    previewPackages: [{ id: 'b1', paragraph: 0, actor: 'Isel', goal: 'x', blocker: 'y', extra: 1 }],
    chapterGoals: 'none',
    responses: [{ id: 'r1', paragraph: 1.5, actor: 'Isel', active: 'yes', text: 'x' }],
  };
  const errors = validate(bad, schema);
  assert.ok(errors.some((e) => e.includes('minimum')));
  assert.ok(errors.some((e) => e.includes('unexpected property "extra"')));
  assert.ok(errors.some((e) => e.includes('chapterGoals: expected array')));
  assert.ok(errors.some((e) => e.includes('paragraph: expected integer')));
  assert.ok(errors.some((e) => e.includes('active: expected boolean')));
  assert.deepEqual(validate({ previewPackages: [] }, schema).length, 2);
});

test('parseModelJson: strips think blocks and code fences; rejects non-JSON', () => {
  assert.deepEqual(parseModelJson('<think>hmm {"no":1}</think>\n```json\n{"a":1}\n```').value, { a: 1 });
  assert.equal(parseModelJson('no json here').ok, false);
  assert.equal(parseModelJson('{"a":').ok, false);
});

test('extractEvidence: valid first answer uses one attempt', async () => {
  const mock = new MockExtractor([F.blockedGoalPass]);
  const spec = DIAGNOSTICS.blocked_goal_response;
  const out = await extractEvidence(mock, { system: 's', user: 'u' }, spec.schema);
  assert.equal(out.attempts, 1);
  assert.equal(mock.requests[0].maxTokens, 16000);
});

test('extractEvidence: retries once on invalid JSON and sends the errors back', async () => {
  const mock = new MockExtractor(['{"previewPackages": [,]}', F.blockedGoalPass]);
  const out = await extractEvidence(mock, { system: 's', user: 'u' }, DIAGNOSTICS.blocked_goal_response.schema);
  assert.equal(out.attempts, 2);
  assert.match(mock.requests[1].user, /CORRECTION/);
  assert.match(mock.requests[1].user, /invalid JSON/);
});

test('extractEvidence: retries once on schema violation, then throws ExtractionError', async () => {
  const mock = new MockExtractor([{ wrong: true }, { still: 'wrong' }, F.blockedGoalPass]);
  await assert.rejects(
    extractEvidence(mock, { system: 's', user: 'u' }, DIAGNOSTICS.blocked_goal_response.schema),
    (e) => e instanceof ExtractionError && e.attempts.length === 2,
  );
  assert.equal(mock.requests.length, 2, 'exactly one retry');
});

test('WorkersAiExtractor: calls the account endpoint with gateway header, bearer token, and max_tokens >= 16000', async () => {
  const calls = [];
  const fakeFetch = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, text: async () => JSON.stringify({ success: true, result: { response: '{"a":1}' } }) };
  };
  const ex = new WorkersAiExtractor({ accountId: 'acct123', apiToken: 'test-token', fetch: fakeFetch });
  const text = await ex.run({ system: 'S', user: 'U', maxTokens: 512 });
  assert.equal(text, '{"a":1}');
  assert.equal(calls[0].url, `https://api.cloudflare.com/client/v4/accounts/acct123/ai/run/${DEFAULT_WORKERS_AI_MODEL}`);
  assert.equal(DEFAULT_WORKERS_AI_MODEL, '@cf/deepseek-ai/deepseek-v4.1-flash-1017');
  assert.equal(calls[0].init.headers['cf-aig-gateway-id'], 'starlight-review');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer test-token');
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.max_tokens, 16000);
  assert.deepEqual(body.messages.map((m) => m.role), ['system', 'user']);
});

test('WorkersAiExtractor: HTTP errors throw; fromEnv requires both variables', async () => {
  const ex = new WorkersAiExtractor({ accountId: 'a', apiToken: 't', fetch: async () => ({ ok: false, status: 429, text: async () => 'rate limited' }) });
  await assert.rejects(ex.run({ system: '', user: '', maxTokens: 1 }), /HTTP 429/);
  assert.throws(() => WorkersAiExtractor.fromEnv({ CLOUDFLARE_ACCOUNT_ID: 'a' }), /apiToken/);
  assert.equal(WorkersAiExtractor.fromEnv({ CLOUDFLARE_ACCOUNT_ID: 'a', CLOUDFLARE_API_TOKEN: 't' }, { fetch: async () => ({}) }).name, `workers-ai:${DEFAULT_WORKERS_AI_MODEL}`);
});

test('readWorkersAiText: handles response string, response object and chat choices', () => {
  assert.equal(readWorkersAiText('{"result":{"response":"x"}}'), 'x');
  assert.equal(readWorkersAiText('{"result":{"response":{"a":1}}}'), '{"a":1}');
  assert.equal(readWorkersAiText('{"result":{"choices":[{"message":{"content":"y"}}]}}'), 'y');
  assert.throws(() => readWorkersAiText('{"errors":[]}'), /no result/);
});

test('text helpers: 1-indexed paragraphs, window cut, dedupe keeps first', () => {
  assert.equal(splitParagraphs(F.CHAPTER_TEXT).length, 12);
  const numbered = numberParagraphs(F.CHAPTER_TEXT, 4);
  assert.match(numbered, /^\[P1\] The bell/);
  assert.match(numbered, /\[P4\]/);
  assert.doesNotMatch(numbered, /\[P5\]/);
  assert.deepEqual(dedupeById([{ id: 'a', v: 1 }, { id: 'a', v: 2 }, { id: 'b', v: 3 }]).map((x) => x.v), [1, 3]);
});

test('runDiagnostic: end to end with MockExtractor; prompt carries preview and numbered chapter', async () => {
  const mock = new MockExtractor([F.setupLiveProblemPass]);
  const run = await runDiagnostic(mock, 'setup_live_problem', { preview: F.PREVIEW_TEXT, chapter: F.CHAPTER_TEXT });
  assert.equal(run.result.pass, true);
  assert.equal(run.attempts, 1);
  assert.match(mock.requests[0].user, /=== PREVIEW ===/);
  assert.match(mock.requests[0].user, /\[P12\] Someone had broken/);
  assert.match(mock.requests[0].system, /Do not grade the writing/);
});

test('runDiagnostic: missing required text is rejected before any call', async () => {
  const mock = new MockExtractor([]);
  await assert.rejects(runDiagnostic(mock, 'blocked_goal_response', { chapter: F.CHAPTER_TEXT }), /needs preview/);
  assert.equal(mock.requests.length, 0);
});

test('runDiagnostic: viewpoint openingLength comes from the chapter text', async () => {
  const short = 'One.\n\nTwo.\n\nThree.';
  const ev = { spans: [{ id: 'v1', startParagraph: 1, endParagraph: 3, viewpointCharacter: 'Isel', clarity: 'clear', interiorityCharacters: ['Isel'], shiftSignal: false, text: 'x' }] };
  const run = await runDiagnostic(new MockExtractor([ev]), 'viewpoint_control', { chapter: short });
  assert.equal(run.result.pass, true);
  assert.equal(run.result.counts.requiredCoverage, 3);
});

test('runAll: runs only the diagnostics whose inputs are present', async () => {
  const chapterOnly = ['same_goal_active', 'mystery_unresolved', 'initial_situation_clear', 'viewpoint_control', 'exposition_local_need'];
  const fixtures = [F.sameGoalPass, F.mysteryPass, F.situationPass, F.viewpointPass, F.expositionPass];
  const runs = await runAll(new MockExtractor(fixtures), { chapter: F.CHAPTER_TEXT });
  assert.deepEqual(runs.map((r) => r.diagnostic), chapterOnly);
  assert.ok(runs.every((r) => r.result.pass));
});
