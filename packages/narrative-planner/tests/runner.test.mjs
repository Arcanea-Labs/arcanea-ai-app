import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  runStory,
  resume,
  collect,
  planUnits,
  MockNarrativeModel,
  MemoryCheckpointStore,
  FileCheckpointStore,
} from "../dist/index.js";

const spec = (over = {}) => ({
  jobId: "job-1",
  premise: "A lighthouse keeper receives letters from a drowned city.",
  chapterCount: 2,
  model: new MockNarrativeModel(),
  store: new MemoryCheckpointStore(),
  ...over,
});

const completes = (events) => events.filter((e) => e.type === "stage_complete").map((e) => `${e.stage}:${e.unit}`);

test("planUnits orders book stages then scenes and text per chapter", () => {
  assert.deepEqual(planUnits(2).map((u) => `${u.stage}:${u.unit}`), [
    "book_preview:book", "book_plan:book", "chapters_plan:book", "characters_list:book",
    "scene_breakdown:ch-1", "chapter_text:ch-1", "scene_breakdown:ch-2", "chapter_text:ch-2",
  ]);
});

test("a full run completes every unit in stage order and ends with done", async () => {
  const events = await collect(runStory(spec()));
  assert.deepEqual(completes(events), planUnits(2).map((u) => `${u.stage}:${u.unit}`));
  const done = events.at(-1);
  assert.equal(done.type, "done");
  assert.equal(done.results.length, 8);
  assert.ok(done.results.every((r) => r.status === "candidate"));
});

test("each model call sees the stages completed before it", async () => {
  const model = new MockNarrativeModel();
  await collect(runStory(spec({ model })));
  assert.deepEqual(model.calls[0].completedStages, []);
  const textCall = model.calls.find((c) => c.stage === "chapter_text");
  assert.ok(textCall.completedStages.some((s) => s.stage === "scene_breakdown" && s.unit === "ch-1"));
  assert.match(textCall.prompt, /CHAPTER_INDEX: 1/);
});

test("checkpoint is saved after every completed unit", async () => {
  const store = new MemoryCheckpointStore();
  const events = await collect(runStory(spec({ store })));
  assert.equal(events.filter((e) => e.type === "checkpoint").length, 8);
  assert.equal(store.saves, 8);
  const cp = await store.load("job-1");
  assert.equal(Object.keys(cp.completed).length, 8);
});

test("resume skips finished units and does not call the model for them", async () => {
  const store = new MemoryCheckpointStore();
  const ac = new AbortController();
  let n = 0;
  const first = await collect(runStory(spec({
    store,
    signal: ac.signal,
    onReceipt: () => { if (++n === 3) ac.abort(); },
  })));
  assert.equal(first.at(-1).type, "aborted");
  const done1 = completes(first);
  assert.equal(done1.length, 3);

  const model2 = new MockNarrativeModel();
  const second = await collect(resume("job-1", { model: model2, store }));
  assert.equal(second[0].type, "resumed");
  assert.equal(second[0].completedUnits, 3);
  assert.deepEqual(second.filter((e) => e.type === "stage_skipped").map((e) => `${e.stage}:${e.unit}`), done1);
  assert.equal(model2.calls.length, 5);
  const done = second.at(-1);
  assert.equal(done.type, "done");
  assert.equal(done.results.length, 8);
  assert.equal(done.cost.receiptCount, 8, "receipts from the first run are kept");
});

test("abort before start yields aborted without calling the model", async () => {
  const ac = new AbortController();
  ac.abort();
  const model = new MockNarrativeModel();
  const events = await collect(runStory(spec({ model, signal: ac.signal })));
  assert.deepEqual(events.map((e) => e.type), ["aborted"]);
  assert.equal(model.calls.length, 0);
});

test("abort during a model call stops the run", async () => {
  const ac = new AbortController();
  const model = {
    provider: "slow",
    async generate(req) {
      ac.abort();
      if (req.signal?.aborted) { const e = new Error("aborted"); e.name = "AbortError"; throw e; }
      return { text: "x", usage: { inputTokens: 0, outputTokens: 0 }, model: "slow", latencyMs: 0 };
    },
  };
  const events = await collect(runStory(spec({ model, signal: ac.signal })));
  assert.deepEqual(events.map((e) => e.type), ["stage_start", "aborted"]);
});

test("a validation failure is retried with the errors fed back", async () => {
  const model = new MockNarrativeModel({ overrides: { chapters_plan: ['{"chapters": []}'] } });
  const events = await collect(runStory(spec({ model })));
  const vf = events.find((e) => e.type === "validation_failed");
  assert.equal(vf.stage, "chapters_plan");
  const retry = model.calls.filter((c) => c.stage === "chapters_plan")[1];
  assert.match(retry.prompt, /previous output was rejected/);
  assert.equal(events.at(-1).type, "done");
  const result = events.find((e) => e.type === "stage_complete" && e.stage === "chapters_plan").result;
  assert.equal(result.attempts, 2);
});

test("repeated validation failure stops with a validation_exhausted error", async () => {
  const model = new MockNarrativeModel({ overrides: { characters_list: ["nope", "still nope", "{}"] } });
  const store = new MemoryCheckpointStore();
  const events = await collect(runStory(spec({ model, store, maxAttempts: 3 })));
  assert.equal(events.filter((e) => e.type === "validation_failed").length, 3);
  const last = events.at(-1);
  assert.equal(last.type, "error");
  assert.equal(last.code, "validation_exhausted");
  assert.equal(last.stage, "characters_list");
  assert.ok(!events.some((e) => e.type === "stage_start" && e.stage === "scene_breakdown"));
  const cp = await store.load("job-1");
  assert.equal(Object.keys(cp.completed).length, 3);
  assert.equal(cp.receipts.length, 6, "failed attempts are still receipted and saved");
});

test("model errors stop the run with model_error", async () => {
  const model = { provider: "x", async generate() { throw new Error("connection refused"); } };
  const events = await collect(runStory(spec({ model })));
  assert.equal(events.at(-1).code, "model_error");
  assert.match(events.at(-1).message, /connection refused/);
});

test("reusing a jobId with a different premise is rejected", async () => {
  const store = new MemoryCheckpointStore();
  await collect(runStory(spec({ store, chapterCount: 1 })));
  const events = await collect(runStory(spec({ store, chapterCount: 1, premise: "something else" })));
  assert.deepEqual(events.map((e) => e.code), ["job_mismatch"]);
});

test("invalid specs throw before any work", async () => {
  await assert.rejects(collect(runStory(spec({ jobId: "../escape" }))), /invalid jobId/);
  await assert.rejects(collect(runStory(spec({ chapterCount: 0 }))), /chapterCount/);
  await assert.rejects(collect(resume("missing-job", { model: new MockNarrativeModel(), store: new MemoryCheckpointStore() })), /no checkpoint/);
});

test("FileCheckpointStore persists to the caller's directory and resumes across instances", async () => {
  const dir = await mkdtemp(join(tmpdir(), "np-ckpt-"));
  const ac = new AbortController();
  let n = 0;
  await collect(runStory(spec({
    jobId: "file-job", store: new FileCheckpointStore(dir), signal: ac.signal,
    onReceipt: () => { if (++n === 2) ac.abort(); },
  })));
  const onDisk = JSON.parse(await readFile(join(dir, "file-job.checkpoint.json"), "utf8"));
  assert.equal(onDisk.version, 1);
  assert.equal(Object.keys(onDisk.completed).length, 2);

  const model = new MockNarrativeModel();
  const events = await collect(resume("file-job", { model, store: new FileCheckpointStore(dir) }));
  assert.equal(events.at(-1).type, "done");
  assert.equal(model.calls.length, 6);
  assert.throws(() => new FileCheckpointStore(dir).pathFor("a/b"), /invalid jobId/);
  assert.equal(await new FileCheckpointStore(dir).load("never-ran"), null);
});
