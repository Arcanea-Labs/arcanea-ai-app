// Hierarchical plans + promotion guard. Fixtures are invented for these tests.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  weaveNarrative,
  scaffoldArcPlan,
  walkPlan,
  collectScenes,
  validatePlanStructure,
  asCandidate,
  attachHumanApproval,
  promoteToCanon,
  assertPromotionState,
  approvalProblem,
} from "../dist/index.js";

const NOW = new Date("2026-11-25T12:00:00Z");

function sampleUniverse() {
  const narrative = {
    title: "The Lantern Debt", type: "quest", theme: "what we owe the dark", stakes: "a village's memory",
    estimatedChapters: 2,
    acts: [
      { act: 1, title: "The Loan", summary: "", involvedCreations: [], keyEvent: "" },
      { act: 2, title: "The Repayment", summary: "", involvedCreations: [], keyEvent: "" },
    ],
  };
  const scene = (id, at, participants) => ({ level: "scene", id, title: id, at, participants });
  return {
    level: "universe", id: "u", title: "Test Universe", timeModel: { kind: "ordinal" },
    series: [{
      level: "series", id: "s", title: "Series", books: [{
        level: "book", id: "b1", title: "Book One", arcs: [{
          level: "arc", id: "a1", title: narrative.title, narrative,
          chapters: [
            { level: "chapter", id: "c1", title: "One", act: 1, scenes: [scene("x1", 1, ["wren"]), scene("x2", 2, ["wren", "oddo"])] },
            { level: "chapter", id: "c2", title: "Two", act: 2, scenes: [scene("x3", 5, ["oddo"])] },
          ],
        }],
      }],
    }],
  };
}

// ── Plans ───────────────────────────────────────────────────────────────────

test("plan hierarchy walks Universe > Series > Book > Arc > Chapter > Scene with path sceneRefs", () => {
  const u = sampleUniverse();
  const levels = walkPlan(u).map((l) => l.node.level);
  assert.deepEqual([...new Set(levels)], ["universe", "series", "book", "arc", "chapter", "scene"]);
  assert.deepEqual(collectScenes(u).map((s) => s.path), ["u/s/b1/a1/c1/x1", "u/s/b1/a1/c1/x2", "u/s/b1/a1/c2/x3"]);
  assert.deepEqual(validatePlanStructure(u), []);
});

test("arcs reuse world-engine NarrativeArc: weaveNarrative output scaffolds one chapter per act", () => {
  const node = (id, name, type, extra = {}) => ({ id, name, type, createdAt: "2026-01-01", metadata: {}, ...extra });
  const nodes = [node("1", "Wren", "character", { gate: 2, element: "Water" }), node("2", "Oddo", "character"), node("3", "Mill", "location")];
  const arc = weaveNarrative(nodes, [{ id: "e", sourceId: "1", targetId: "2", relationship: "allies_with", strength: 1 }]);
  const plan = scaffoldArcPlan("arc-woven", arc);
  assert.equal(plan.narrative, arc, "the NarrativeArc object is embedded, not copied into new fields");
  assert.equal(plan.chapters.length, arc.acts.length);
  assert.deepEqual(plan.chapters.map((c) => c.act), arc.acts.map((a) => a.act));
});

test("structure validation reports duplicate ids, unknown acts, bad nesting and bad story-time", () => {
  const u = sampleUniverse();
  const arc = u.series[0].books[0].arcs[0];
  arc.chapters[1].act = 7;
  arc.chapters[1].scenes.push({ level: "scene", id: "x1", title: "dup", participants: [] });
  arc.chapters[0].scenes.push({ level: "scene", id: "x9", title: "cal", at: { year: 1 }, participants: [] });
  u.series[0].books[0].arcs.push({ level: "chapter", id: "stray", title: "", scenes: [] });
  const found = validatePlanStructure(u).map((f) => f.code).sort();
  for (const code of ["BAD_NESTING", "BAD_STORY_TIME", "DUPLICATE_PLAN_ID", "UNKNOWN_ACT"]) assert.ok(found.includes(code), code);
  const unknownAct = validatePlanStructure(u).find((f) => f.code === "UNKNOWN_ACT");
  assert.deepEqual(unknownAct.sceneRefs, ["u/s/b1/a1/c2"]);
});

// ── Promotion guard ─────────────────────────────────────────────────────────

const approval = { approver: "frank", ts: "2026-11-20T09:30:00Z", ref: "decision-log#42" };

test("generated material always starts as a candidate and cannot be promoted to canon without approval", () => {
  const draft = asCandidate("char-wren", "character", { name: "Wren" });
  assert.equal(draft.status, "candidate");
  assert.equal(draft.origin, "generated");
  assert.ok(Object.isFrozen(draft));
  const refused = promoteToCanon(draft);
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /candidate/);
  assert.equal(refused.entity.status, "candidate");
});

test("missing or invalid approvals are refused and leave the entity a candidate", () => {
  const draft = asCandidate("loc-mill", "location", {});
  const bad = [
    undefined,
    { ...approval, approver: "" },
    { ...approval, approver: "agent:starlight-ceo" },
    { ...approval, approver: "claude-code" },
    { ...approval, ref: " " },
    { ...approval, ts: "yesterday" },
    { ...approval, ts: "2027-01-01T00:00:00Z" },
  ];
  for (const a of bad) {
    const r = attachHumanApproval(draft, a, NOW);
    assert.equal(r.ok, false, JSON.stringify(a));
    assert.equal(r.entity.status, "candidate");
  }
  assert.match(approvalProblem({ ...approval, approver: "agent:starlight-ceo" }, NOW), /not a human/);
});

test("a valid human approval makes it human-approved — and even then promoteToCanon refuses", () => {
  const draft = asCandidate("art-lamp", "artifact", { name: "Debt Lantern" });
  const r = attachHumanApproval(draft, approval, NOW);
  assert.equal(r.ok, true);
  assert.equal(r.entity.status, "human-approved");
  assert.deepEqual(r.entity.approval, approval);
  assert.equal(draft.status, "candidate", "the original is not mutated");
  const p = promoteToCanon(r.entity);
  assert.equal(p.ok, false);
  assert.match(p.reason, /\/lock-decision/);
  assert.notEqual(p.entity.status, "canon");
});

test("tampered entities (forged canon status, approval-less approved status) are rejected", () => {
  assert.throws(() => assertPromotionState({ id: "x", kind: "k", origin: "generated", status: "canon", payload: {} }), /forbidden status "canon"/);
  assert.throws(() => assertPromotionState({ id: "x", kind: "k", origin: "generated", status: "human-approved", payload: {} }), /claims approval/);
  assert.throws(() => assertPromotionState({ id: "x", status: "candidate" }), /not a generated entity/);
  assert.doesNotThrow(() => assertPromotionState(asCandidate("ok", "k", 1)));
  const forged = { ...asCandidate("y", "k", {}), status: "human-approved" };
  assert.equal(promoteToCanon(forged).ok, false);
});

test("the continuity layer performs no I/O and never references .arcanea/lore writes", async () => {
  const dir = new URL("../src/continuity/", import.meta.url);
  const files = (await readdir(dir)).filter((f) => f.endsWith(".ts"));
  assert.ok(files.length >= 7);
  for (const f of files) {
    const src = await readFile(new URL(f, dir), "utf8");
    assert.doesNotMatch(src, /from\s+["'](node:)?(fs|fs\/promises|child_process|net|http|https)["']/, f);
    assert.doesNotMatch(src, /\bfetch\s*\(|writeFile|appendFile/, f);
  }
  // Running the whole guard flow in a scratch dir leaves it untouched.
  const scratch = mkdtempSync(join(tmpdir(), "continuity-"));
  const r = attachHumanApproval(asCandidate("z", "k", {}), approval, NOW);
  promoteToCanon(r.entity);
  assert.deepEqual(readdirSync(scratch), []);
});
