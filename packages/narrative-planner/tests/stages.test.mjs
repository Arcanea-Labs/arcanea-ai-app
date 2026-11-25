import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractJson,
  parseStage,
  validateBookPlan,
  validateChaptersPlan,
  validateCharactersList,
  validateSceneBreakdown,
  STAGE_ORDER,
} from "../dist/index.js";

const goodPlan = {
  title: "T",
  worldRules: [{ key: "tide-letters", rule: "Letters arrive on the spring tide.", forbiddenTerms: ["teleportation"] }],
  storyArcs: [{ name: "A", description: "B" }],
  characterArchetypes: [{ archetype: "Seeker", role: "protagonist" }],
  writingStyle: { pov: "third", tense: "past", tone: "quiet" },
};

const chapter = (i, extra = {}) => ({
  index: i,
  name: `C${i}`,
  targetWords: 2000,
  summary: ["x"],
  narrativeFocus: "setup",
  embeddingSpace: { action: 1, dialog: 2, world_building: 3, exposition: 4, romantic: 5, pacing: 6 },
  ...extra,
});

test("stage order is preview, plan, chapters, characters, scenes, text", () => {
  assert.deepEqual(STAGE_ORDER, [
    "book_preview", "book_plan", "chapters_plan", "characters_list", "scene_breakdown", "chapter_text",
  ]);
});

test("extractJson reads a ```json fenced block", () => {
  assert.deepEqual(extractJson('Here:\n```json\n{"a": 1}\n```\nthanks'), { a: 1 });
});

test("extractJson reads an unlabelled fence", () => {
  assert.deepEqual(extractJson("```\n[1,2]\n```"), [1, 2]);
});

test("extractJson reads bare JSON with surrounding prose and braces inside strings", () => {
  assert.deepEqual(extractJson('Sure! {"a": "has } brace", "b": [1]} done'), { a: "has } brace", b: [1] });
});

test("extractJson returns undefined when nothing parses", () => {
  assert.equal(extractJson("no json {here"), undefined);
});

test("validateBookPlan accepts a valid plan and defaults notes and forbiddenTerms", () => {
  const r = validateBookPlan({ ...goodPlan, worldRules: [{ key: "k1", rule: "r" }] });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value.worldRules[0].forbiddenTerms, []);
  assert.equal(r.value.writingStyle.notes, "");
});

test("validateBookPlan rejects duplicate and malformed rule keys", () => {
  const r = validateBookPlan({
    ...goodPlan,
    worldRules: [{ key: "Bad Key", rule: "r" }, { key: "a", rule: "r" }, { key: "a", rule: "r" }],
  });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("must match")));
  assert.ok(r.errors.some((e) => e.includes("duplicated")));
});

test("validateBookPlan rejects a missing writingStyle", () => {
  const { writingStyle, ...rest } = goodPlan;
  const r = validateBookPlan(rest);
  assert.equal(r.ok, false);
  assert.ok(r.errors.includes("book_plan.writingStyle must be an object"));
});

test("validateChaptersPlan enforces embedding_space range 0-100", () => {
  const r = validateChaptersPlan({ chapters: [chapter(1, { embeddingSpace: { action: 101, dialog: 0, world_building: 0, exposition: 0, romantic: 0, pacing: -1 } })] });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("embeddingSpace.action")));
  assert.ok(r.errors.some((e) => e.includes("embeddingSpace.pacing")));
});

test("validateChaptersPlan enforces sequential indices and expected count", () => {
  const r = validateChaptersPlan({ chapters: [chapter(1), chapter(3)] }, 3);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("index must be 2")));
  assert.ok(r.errors.some((e) => e.includes("exactly 3 chapters")));
});

test("validateCharactersList rejects case-insensitive duplicate names", () => {
  const c = (name) => ({ name, role: "r", description: "d" });
  const r = validateCharactersList({ characters: [c("Mira"), c("mira")] });
  assert.equal(r.ok, false);
});

test("validateSceneBreakdown checks chapterIndex and scene characters", () => {
  const r = validateSceneBreakdown({ chapterIndex: 2, scenes: [{ index: 1, summary: "s", characters: [], location: "l" }] }, 3);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("chapterIndex must be 3")));
});

test("parseStage reports missing JSON for a structured stage and accepts prose stages", () => {
  const bad = parseStage("book_plan", "I could not do it.");
  assert.equal(bad.ok, false);
  assert.match(bad.errors[0], /no parseable JSON/);
  const prose = parseStage("chapter_text", "  The tide came in, slow and grey, over the stones.  ", { chapterIndex: 4 });
  assert.equal(prose.ok, true);
  assert.equal(prose.value.chapterIndex, 4);
});
