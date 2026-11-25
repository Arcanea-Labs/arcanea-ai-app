import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AiSdkNarrativeModel,
  MockNarrativeModel,
  PageStormVllmModel,
  PAGESTORM_DEFAULT_MODEL,
  SafetyRefusalError,
  runStory,
  collect,
  MemoryCheckpointStore,
} from "../dist/index.js";

const allow = { check: () => ({ allowed: true }) };
const req = (over = {}) => ({ stage: "book_preview", prompt: "premise", completedStages: [], maxTokens: 64, ...over });

function fakeFetch(response = {}) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: async () => response.json ?? {
        model: PAGESTORM_DEFAULT_MODEL,
        choices: [{ text: "A long, quiet preview of a drowned city." }],
        usage: { prompt_tokens: 11, completion_tokens: 22 },
      },
      text: async () => response.text ?? "",
    };
  };
  fn.calls = calls;
  return fn;
}

test("PageStormVllmModel throws at construction without a SafetyClassifier", () => {
  assert.throws(() => new PageStormVllmModel({ baseUrl: "http://127.0.0.1:8000" }), /SafetyClassifier/);
  assert.throws(() => new PageStormVllmModel({ baseUrl: "http://x", safety: {} }), /SafetyClassifier/);
});

test("PageStormVllmModel has no default endpoint", () => {
  assert.throws(() => new PageStormVllmModel({ safety: allow, env: {} }), /PAGESTORM_BASE_URL/);
});

test("PageStormVllmModel reads PAGESTORM_BASE_URL and normalises a trailing /v1", () => {
  const m = new PageStormVllmModel({ safety: allow, env: { PAGESTORM_BASE_URL: "http://gpu.local:8000/v1/" }, fetch: fakeFetch() });
  assert.equal(m.baseUrl, "http://gpu.local:8000");
  assert.equal(m.model, PAGESTORM_DEFAULT_MODEL);
});

test("PageStormVllmModel sends an OpenAI-compatible /v1/completions request", async () => {
  const f = fakeFetch();
  const m = new PageStormVllmModel({ safety: allow, baseUrl: "http://127.0.0.1:8000", fetch: f, temperature: 0.8, apiKey: "local-test" });
  const out = await m.generate(req({ prompt: "Write a preview.", maxTokens: 300 }));
  assert.equal(f.calls.length, 1);
  const c = f.calls[0];
  assert.equal(c.url, "http://127.0.0.1:8000/v1/completions");
  assert.equal(c.init.method, "POST");
  assert.equal(c.init.headers["content-type"], "application/json");
  assert.equal(c.init.headers["authorization"], "Bearer local-test");
  assert.deepEqual(c.body, { model: PAGESTORM_DEFAULT_MODEL, prompt: "Write a preview.", max_tokens: 300, temperature: 0.8 });
  assert.deepEqual(out.usage, { inputTokens: 11, outputTokens: 22 });
  assert.equal(out.model, PAGESTORM_DEFAULT_MODEL);
});

test("PageStormVllmModel refuses an unsafe prompt before any network call", async () => {
  const f = fakeFetch();
  const m = new PageStormVllmModel({
    safety: { check: (t) => (t.includes("BAD") ? { allowed: false, reason: "policy" } : { allowed: true }) },
    baseUrl: "http://x", fetch: f,
  });
  await assert.rejects(m.generate(req({ prompt: "BAD prompt" })), (e) => e instanceof SafetyRefusalError && e.phase === "prompt" && e.reason === "policy");
  assert.equal(f.calls.length, 0);
});

test("PageStormVllmModel classifies every output and refuses unsafe text", async () => {
  const seen = [];
  const m = new PageStormVllmModel({
    safety: { check: async (t) => { seen.push(t); return t.includes("drowned") ? { allowed: false, reason: "output flagged" } : { allowed: true }; } },
    baseUrl: "http://x", fetch: fakeFetch(),
  });
  await assert.rejects(m.generate(req()), (e) => e instanceof SafetyRefusalError && e.phase === "output");
  assert.deepEqual(seen, ["premise", "A long, quiet preview of a drowned city."]);
});

test("PageStormVllmModel surfaces HTTP errors", async () => {
  const m = new PageStormVllmModel({ safety: allow, baseUrl: "http://x", fetch: fakeFetch({ ok: false, status: 503, text: "busy" }) });
  await assert.rejects(m.generate(req()), /HTTP 503: busy/);
});

test("runtime safety refusal stops a run with a safety_refusal error event", async () => {
  const m = new PageStormVllmModel({ safety: { check: () => ({ allowed: false, reason: "nope" }) }, baseUrl: "http://x", fetch: fakeFetch() });
  const events = await collect(runStory({ jobId: "safe-1", premise: "p", chapterCount: 1, model: m, store: new MemoryCheckpointStore() }));
  const last = events.at(-1);
  assert.equal(last.type, "error");
  assert.equal(last.code, "safety_refusal");
  assert.equal(events.filter((e) => e.type === "stage_start").length, 1, "no retry after a refusal");
});

test("AiSdkNarrativeModel passes injected model and maps v5 and v4 usage shapes", async () => {
  const calls = [];
  const fakeModel = { id: "fake" };
  const gen = async (args) => { calls.push(args); return { text: "ok", usage: { inputTokens: 3, outputTokens: 4 } }; };
  const m = new AiSdkNarrativeModel({ generateText: gen, model: fakeModel, modelId: "provider/model-x" });
  const out = await m.generate(req({ maxTokens: 99 }));
  assert.equal(calls[0].model, fakeModel);
  assert.equal(calls[0].maxOutputTokens, 99);
  assert.deepEqual(out.usage, { inputTokens: 3, outputTokens: 4 });
  assert.equal(out.model, "provider/model-x");
  assert.equal(m.provider, "ai-sdk");

  const v4 = new AiSdkNarrativeModel({
    generateText: async () => ({ text: "ok", usage: { promptTokens: 7, completionTokens: 8 }, response: { modelId: "m-v4" } }),
    model: {}, modelId: "fallback",
  });
  const o4 = await v4.generate(req());
  assert.deepEqual(o4.usage, { inputTokens: 7, outputTokens: 8 });
  assert.equal(o4.model, "m-v4");
});

test("MockNarrativeModel is deterministic", async () => {
  const a = await new MockNarrativeModel().generate(req({ stage: "book_plan" }));
  const b = await new MockNarrativeModel().generate(req({ stage: "book_plan" }));
  assert.equal(a.text, b.text);
  assert.deepEqual(a.usage, b.usage);
});
