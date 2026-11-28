import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  StructuralCanonGate,
  RESERVED_CANON_NAMES,
  runStory,
  collect,
  MockNarrativeModel,
  MemoryCheckpointStore,
} from "../dist/index.js";

const spec = (model, over = {}) => ({
  jobId: "canon-1",
  premise: "p",
  chapterCount: 1,
  model,
  store: new MemoryCheckpointStore(),
  canonGate: new StructuralCanonGate(),
  ...over,
});

const reviews = (events) => events.filter((e) => e.type === "canon_review");

test("clean run passes every canon review", async () => {
  const events = await collect(runStory(spec(new MockNarrativeModel())));
  assert.equal(events.at(-1).type, "done");
  assert.ok(reviews(events).every((e) => e.review.verdict === "pass"));
  assert.equal(reviews(events).length, 6);
});

test("forbidden term from a world rule appearing later blocks the run", async () => {
  const model = new MockNarrativeModel({
    overrides: { chapter_text: ["Chapter 1. She solved it with Teleportation, of course, and the tide forgot her."] },
  });
  const store = new MemoryCheckpointStore();
  const events = await collect(runStory(spec(model, { store })));
  const last = events.at(-1);
  assert.equal(last.type, "error");
  assert.equal(last.code, "canon_block");
  assert.match(last.message, /teleportation/);
  const cp = await store.load("canon-1");
  assert.equal(cp.completed["chapter_text:ch-1"], undefined, "blocked output is not checkpointed");
});

test("chapter citing an undeclared rule key is flagged but continues", async () => {
  const model = new MockNarrativeModel({
    overrides: { chapter_text: ["Chapter 1. The letter burned at the edges [rule:fire-letters] and then went quiet."] },
  });
  const events = await collect(runStory(spec(model)));
  assert.equal(events.at(-1).type, "done");
  const r = reviews(events).find((e) => e.stage === "chapter_text").review;
  assert.equal(r.verdict, "flag");
  assert.equal(r.findings[0].code, "undeclared_rule_key");
  assert.equal(r.findings[0].subject, "fire-letters");
  const final = events.at(-1).results.find((x) => x.stage === "chapter_text");
  assert.equal(final.status, "candidate");
  assert.equal(final.canon.verdict, "flag");
});

test("chapters_plan citing an undeclared rule key is flagged", () => {
  const gate = new StructuralCanonGate();
  const plan = { stage: "book_plan", unit: "book", raw: "", data: { worldRules: [{ key: "a", rule: "r", forbiddenTerms: [] }] } };
  const ch = { stage: "chapters_plan", unit: "book", raw: "{}", data: { chapters: [{ ruleKeys: ["a", "zzz"] }] } };
  const r = gate.review(ch, { completed: [plan] });
  assert.equal(r.verdict, "flag");
  assert.deepEqual(r.findings.map((f) => f.subject), ["zzz"]);
});

test("scene using a character not in characters_list is flagged", async () => {
  const model = new MockNarrativeModel({
    overrides: {
      scene_breakdown: [JSON.stringify({
        chapterIndex: 1,
        scenes: [{ index: 1, summary: "s", characters: ["Mira Tallow", "Stranger Bell"], location: "dock" }],
      })],
    },
  });
  const events = await collect(runStory(spec(model)));
  const r = reviews(events).find((e) => e.stage === "scene_breakdown").review;
  assert.equal(r.verdict, "flag");
  assert.deepEqual(r.findings.map((f) => [f.code, f.subject]), [["unknown_character", "Stranger Bell"]]);
});

test("generated character using a reserved Guardian or Godbeast name is flagged", async () => {
  const model = new MockNarrativeModel({ characterNames: ["Draconia Vale", "Mira Tallow", "Kyuro"] });
  const events = await collect(runStory(spec(model)));
  const r = reviews(events).find((e) => e.stage === "characters_list").review;
  assert.equal(r.verdict, "flag");
  assert.deepEqual(r.findings.map((f) => f.subject), ["Draconia Vale", "Kyuro"]);
  assert.ok(r.findings.every((f) => f.code === "reserved_canon_name"));
});

test("reserved names match whole words only", () => {
  const gate = new StructuralCanonGate();
  const res = { stage: "characters_list", unit: "book", raw: "", data: { characters: [{ name: "Solveig" }, { name: "Inota" }] } };
  assert.equal(gate.review(res, { completed: [] }).verdict, "pass");
});

test("RESERVED_CANON_NAMES matches world-engine GUARDIANS and GODBEASTS", async () => {
  const src = await readFile(new URL("../../world-engine/src/canon.ts", import.meta.url), "utf8");
  const block = (name) => {
    const m = new RegExp(`export const ${name}[^=]*=\\s*\\[([\\s\\S]*?)\\]\\s*as const`).exec(src);
    assert.ok(m, `${name} not found in canon.ts`);
    return [...m[1].matchAll(/name:\s*"([^"]+)"/g)].map((x) => x[1]);
  };
  const expected = [...block("GUARDIANS"), ...block("GODBEASTS")];
  assert.deepEqual([...RESERVED_CANON_NAMES], expected);
});

test("the package never references the lore directory for writing", async () => {
  for (const f of ["canon-gate.js", "runner.js", "checkpoint.js"]) {
    const src = await readFile(new URL(`../dist/${f}`, import.meta.url), "utf8");
    assert.ok(!src.includes(".arcanea/lore") || f === "canon-gate.js", `${f} mentions .arcanea/lore`);
    assert.ok(!/writeFile|appendFile/.test(src) || f === "checkpoint.js", `${f} writes files`);
  }
});
