// World-rule validation + diversity metrics. Canon names used here are only
// those already exported by world-engine (GUARDIANS, GODBEASTS, HOUSES, ELEMENTS).
// All prose fixtures are short invented sentences written for these tests.
import test from "node:test";
import assert from "node:assert/strict";
import {
  GUARDIANS,
  GODBEASTS,
  buildCanonRules,
  validateScene,
  WORLD_ENGINE_CANON,
  distinctN,
  cosineDistance,
  jaccardDistance,
  structuralNovelty,
  detectRepetition,
  tokenize,
} from "../dist/index.js";

const rules = buildCanonRules();
const violations = (facts) => validateScene(facts, rules);

// ── World rules ─────────────────────────────────────────────────────────────

test("canon rules are derived from exported canon data, not prose", () => {
  const ids = rules.map((r) => r.id).sort();
  assert.deepEqual(ids, [
    "canon.element.known", "canon.gate.range", "canon.godbeast.binding",
    "canon.guardian.identity", "canon.house.known", "canon.rank.gates",
  ]);
  const identity = rules.find((r) => r.id === "canon.guardian.identity");
  for (const g of GUARDIANS) assert.ok(identity.statement.includes(g.name), g.name);
  assert.equal(WORLD_ENGINE_CANON.maxGate, 10);
  assert.ok(rules.every((r) => r.scope === "canon" && typeof r.check === "function"));
});

test("a scene consistent with canon produces no findings", () => {
  const facts = {
    sceneRef: "bk1/ch2/s1",
    characters: [{ id: "wren", gatesOpen: 3, rank: "Mage", house: "House Pyros", element: "Fire" }],
    magic: [{ casterId: "wren", element: "fire", gate: 3 }],
    guardians: [{ name: "Draconia", gate: 3, element: "Fire", godbeast: "Draconis" }],
    godbeasts: [{ name: "Kaelith", gate: 1 }],
    houses: ["Terra"],
    elements: ["Water", "Void"],
  };
  assert.deepEqual(violations(facts), []);
});

test("flags a Guardian at the wrong Gate, wrong element and an invented Guardian", () => {
  const findings = violations({
    sceneRef: "bk1/ch5/s3",
    guardians: [
      { name: "Lyssandria", gate: 4, element: "Water" },
      { name: "Shinkami", element: "Fire" }, // element "All" accepts any element
      { name: "Marrowind" },
    ],
  });
  const msgs = findings.map((f) => f.message);
  assert.equal(findings.length, 3);
  assert.ok(msgs.some((m) => /Lyssandria keeps Gate 1, not Gate 4/.test(m)));
  assert.ok(msgs.some((m) => /Lyssandria's element is Earth, not Water/.test(m)));
  assert.ok(msgs.some((m) => /"Marrowind" is not one of the Guardians/.test(m)));
  assert.ok(findings.every((f) => f.severity === "error" && f.sceneRefs[0] === "bk1/ch5/s3"));
});

test("flags a Guardian paired with another Gate's Godbeast and names the right one", () => {
  const draconia = GUARDIANS.find((g) => g.name === "Draconia");
  const expected = GODBEASTS.find((b) => b.gate === draconia.gate);
  const [f] = violations({ sceneRef: "s9", guardians: [{ name: "Draconia", godbeast: "Veloura" }] });
  assert.equal(f.subjects[0], "canon.godbeast.binding");
  assert.match(f.message, new RegExp(`Gate ${draconia.gate}'s Godbeast is ${expected.name}`));
});

test("flags rank inconsistent with open Gates, out-of-range Gates, unknown Houses and elements", () => {
  const findings = violations({
    sceneRef: "s4",
    characters: [{ id: "oddo", gatesOpen: 7, rank: "Apprentice", house: "House Umbra" }],
    magic: [{ casterId: "oddo", gate: 11, element: "Lightning" }],
  });
  const byRule = (id) => findings.filter((f) => f.subjects.includes(id));
  assert.match(byRule("canon.rank.gates")[0].message, /makes them Archmage, not Apprentice/);
  assert.match(byRule("canon.gate.range")[0].message, /nonexistent Gate 11/);
  assert.match(byRule("canon.house.known")[0].message, /House Umbra/);
  assert.match(byRule("canon.element.known")[0].message, /Lightning/);
});

test("custom rules: scoped rules apply only in their scope; boolean checks; throwing checks are contained", () => {
  const custom = [
    { id: "series.no-flight", statement: "Nobody flies in this series.", scope: "series", scopeId: "tidewall",
      severity: "warning", check: (f) => !(f.magic ?? []).some((m) => m.element === "Wind") },
    { id: "doc-only", statement: "Documentation rule with no check.", scope: "canon", severity: "info" },
    { id: "broken", statement: "Throws.", scope: "canon", severity: "error", check: () => { throw new Error("boom"); } },
  ];
  const facts = { sceneRef: "s1", magic: [{ casterId: "wren", element: "Wind" }] };
  assert.deepEqual(validateScene(facts, custom).map((f) => f.code), ["RULE_ERROR"]);
  const inSeries = validateScene({ ...facts, context: { seriesId: "tidewall" } }, custom);
  assert.deepEqual(inSeries.map((f) => [f.code, f.severity]).sort(), [["RULE_ERROR", "error"], ["WORLD_RULE_VIOLATION", "warning"]]);
  assert.match(inSeries.find((f) => f.code === "WORLD_RULE_VIOLATION").message, /Nobody flies/);
});

test("rules can be built from an injected canon source (forks, tests) without touching defaults", () => {
  const tiny = buildCanonRules({
    elements: ["Salt"], houses: ["Brine"], guardians: [{ name: "Keel", gate: 1, domain: "Depth", element: "Salt" }],
    godbeasts: [], rankForGates: () => "Apprentice", maxGate: 1,
  });
  assert.equal(validateScene({ sceneRef: "x", elements: ["Fire"] }, tiny).length, 1);
  assert.equal(validateScene({ sceneRef: "x", elements: ["Fire"] }, rules).length, 0);
});

// ── Diversity ───────────────────────────────────────────────────────────────

test("distinct-n is 1 for fully varied text, low for looping text, 0 without enough tokens", () => {
  assert.equal(distinctN("one two three four five", 2), 1);
  const loop = distinctN("the bell rang the bell rang the bell rang the bell rang", 2);
  assert.ok(loop < 0.4, `loop=${loop}`);
  assert.equal(distinctN("solitary", 2), 0);
  assert.throws(() => distinctN("x", 0), RangeError);
  // n-grams never span two documents
  assert.equal(distinctN(["a b", "c d"], 2), 1);
  assert.deepEqual(tokenize("Wren's lamp—lit, twice."), ["wren's", "lamp", "lit", "twice"]);
});

test("cosine distance ignores magnitude, rejects mismatched vectors, treats zero vectors as distant", () => {
  assert.ok(cosineDistance([1, 2, 3], [2, 4, 6]) < 1e-12);
  assert.ok(Math.abs(cosineDistance([1, 0], [0, 1]) - 1) < 1e-12);
  assert.equal(cosineDistance([0, 0], [1, 1]), 1);
  assert.throws(() => cosineDistance([1], [1, 2]), /mismatch/);
  assert.equal(jaccardDistance(["Mentor", "trickster"], ["mentor", "herald"]), 1 - 1 / 3);
  assert.equal(jaccardDistance([], []), 0);
});

const arcPlan = (id, vec, chapterVecs, archetypes) => ({
  level: "arc", id, title: id, archetypes, embedding_space: vec,
  narrative: { title: id, type: "quest", acts: [], stakes: "", theme: "", estimatedChapters: chapterVecs.length },
  chapters: chapterVecs.map((v, i) => ({ level: "chapter", id: `${id}-c${i}`, title: "", embedding_space: v, scenes: [] })),
});

test("structural novelty: a near-copy of one prior plan scores low, a different shape scores high", () => {
  const corpus = [
    arcPlan("prior-a", [1, 0, 0], [[1, 0, 0], [0.9, 0.1, 0]], ["mentor", "threshold"]),
    arcPlan("prior-b", [0, 1, 0], [[0, 1, 0]], ["trickster"]),
  ];
  const copy = structuralNovelty(arcPlan("new-copy", [2, 0, 0], [[1, 0, 0], [0.9, 0.1, 0]], ["mentor", "threshold"]), corpus);
  const fresh = structuralNovelty(arcPlan("new-fresh", [0, 0, 1], [[0, 0, 1]], ["exile", "witness"]), corpus);
  assert.ok(copy.embeddingNovelty < 1e-9);
  assert.equal(copy.archetypeNovelty, 0);
  assert.equal(copy.nearestPlanId, "prior-a");
  assert.equal(copy.units.find((u) => u.level === "arc").nearestId, "prior-a");
  assert.ok(fresh.score > 0.9, `fresh=${fresh.score}`);
  assert.ok(copy.score < fresh.score);
  // empty corpus: everything is novel
  assert.equal(structuralNovelty(arcPlan("solo", [1, 1], [], ["x"]), []).score, 1);
});

test("repetition detector surfaces phrases recurring across chapters, ranked by spread", () => {
  const chapters = [
    { id: "ch1", text: "Her breath caught in her throat as the tide turned silver." },
    { id: "ch2", text: "At the gate, her breath caught in her throat once more." },
    { id: "ch3", text: "Again her breath caught in her throat. The tide turned silver." },
    { id: "ch4", text: "Nothing repeats here at all, truly." },
  ];
  const reps = detectRepetition(chapters, { n: 4 });
  assert.equal(reps[0].phrase, "breath caught in her");
  assert.equal(reps[0].spread, 3);
  assert.deepEqual(reps[0].chapters, ["ch1", "ch2", "ch3"]);
  const tide = reps.find((r) => r.phrase === "the tide turned silver");
  assert.equal(tide.spread, 2);
  assert.ok(!reps.some((r) => r.chapters.includes("ch4")));
  assert.deepEqual(detectRepetition(chapters, { n: 4, minChapters: 4 }), []);
});
