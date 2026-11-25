import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, appendFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  estimateUsd,
  makeReceipt,
  receiptsFromJsonl,
  receiptsToJsonl,
  totalCost,
  runStory,
  collect,
  MockNarrativeModel,
  MemoryCheckpointStore,
} from "../dist/index.js";

const fixedNow = () => new Date("2026-11-25T00:00:00.000Z");
// Test-only prices; not real list prices.
const PRICING = {
  "tok-model": { kind: "tokens", usdPerMillionInput: 2, usdPerMillionOutput: 10, source: "test-fixture" },
  "gpu-model": { kind: "gpu", gpuHourlyUsd: 3.6, source: "test-fixture" },
};

test("token pricing: input and output priced per million", () => {
  const r = estimateUsd("tok-model", { inputTokens: 500_000, outputTokens: 100_000 }, 0, PRICING);
  assert.equal(r.usdEstimate, 1 + 1);
  assert.equal(r.pricingSource, "tokens:test-fixture");
});

test("GPU pricing: hourly rate times wallclock", () => {
  const r = estimateUsd("gpu-model", { inputTokens: 1, outputTokens: 1 }, 10_000, PRICING);
  assert.ok(Math.abs(r.usdEstimate - 0.01) < 1e-12);
  assert.equal(r.pricingSource, "gpu-wallclock:test-fixture");
});

test("unknown price gives usdEstimate null and pricingSource unknown", () => {
  assert.deepEqual(estimateUsd("other", { inputTokens: 5, outputTokens: 5 }, 5, PRICING), { usdEstimate: null, pricingSource: "unknown" });
  assert.deepEqual(estimateUsd("other", { inputTokens: 5, outputTokens: 5 }, 5, undefined), { usdEstimate: null, pricingSource: "unknown" });
});

test("receipt has every required field", () => {
  const r = makeReceipt({ jobId: "j", stage: "book_plan", unit: "book", model: "tok-model", provider: "p", usage: { inputTokens: 1, outputTokens: 2 }, latencyMs: 3, pricing: PRICING, now: fixedNow });
  assert.deepEqual(Object.keys(r).sort(), ["inputTokens", "jobId", "latencyMs", "model", "outputTokens", "pricingSource", "provider", "stage", "ts", "unit", "usdEstimate"]);
  assert.equal(r.ts, "2026-11-25T00:00:00.000Z");
});

test("JSONL round trip preserves receipts including null prices", async () => {
  const rs = [
    makeReceipt({ jobId: "j", stage: "book_plan", unit: "book", model: "tok-model", provider: "p", usage: { inputTokens: 1, outputTokens: 2 }, latencyMs: 3, pricing: PRICING, now: fixedNow }),
    makeReceipt({ jobId: "j", stage: "chapter_text", unit: "ch-1", model: "nope", provider: "p", usage: { inputTokens: 4, outputTokens: 5 }, latencyMs: 6, pricing: PRICING, now: fixedNow }),
  ];
  const dir = await mkdtemp(join(tmpdir(), "np-receipts-"));
  const file = join(dir, "receipts.jsonl");
  await appendFile(file, receiptsToJsonl(rs), "utf8");
  const back = receiptsFromJsonl(await readFile(file, "utf8"));
  assert.deepEqual(back, rs);
  assert.equal(back[1].usdEstimate, null);
  assert.throws(() => receiptsFromJsonl('{"jobId":"j"}\n'), /missing/);
});

test("totalCost counts unpriced receipts instead of treating them as zero", () => {
  const base = { jobId: "j", stage: "book_plan", unit: "book", model: "m", provider: "p", latencyMs: 1, ts: "t" };
  const t = totalCost([
    { ...base, inputTokens: 10, outputTokens: 20, usdEstimate: 0.5, pricingSource: "tokens:x" },
    { ...base, inputTokens: 1, outputTokens: 2, usdEstimate: null, pricingSource: "unknown" },
    { ...base, inputTokens: 3, outputTokens: 4, usdEstimate: 0.25, pricingSource: "tokens:x" },
  ]);
  assert.equal(t.pricedUsd, 0.75);
  assert.equal(t.pricedCount, 2);
  assert.equal(t.unpricedCount, 1);
  assert.equal(t.receiptCount, 3);
  assert.equal(t.complete, false);
  assert.equal(t.inputTokens, 14);
  assert.equal(t.outputTokens, 26);
  assert.equal(totalCost([]).complete, true);
});

test("a run writes one receipt per model call, including failed attempts", async () => {
  const model = new MockNarrativeModel({ model: "tok-model", overrides: { book_plan: ["not json"] } });
  const seen = [];
  const events = await collect(runStory({
    jobId: "rc-1", premise: "p", chapterCount: 1, model, store: new MemoryCheckpointStore(), pricing: PRICING,
    onReceipt: (r) => seen.push(r), now: fixedNow,
  }));
  const done = events.at(-1);
  assert.equal(done.type, "done");
  // 4 book stages + 1 failed retry + 2 chapter stages
  assert.equal(seen.length, 7);
  assert.equal(model.calls.length, 7);
  assert.equal(done.cost.receiptCount, 7);
  assert.equal(done.cost.unpricedCount, 0);
  assert.ok(seen.every((r) => r.provider === "mock" && r.jobId === "rc-1"));
  assert.equal(seen.filter((r) => r.stage === "book_plan").length, 2);
});

test("a run on an unpriced model reports every receipt as unknown", async () => {
  const events = await collect(runStory({ jobId: "rc-2", premise: "p", chapterCount: 1, model: new MockNarrativeModel(), store: new MemoryCheckpointStore() }));
  const done = events.at(-1);
  assert.equal(done.cost.pricedCount, 0);
  assert.equal(done.cost.unpricedCount, 6);
  assert.equal(done.cost.complete, false);
});
