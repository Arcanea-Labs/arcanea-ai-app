// Character ledger + temporal continuity. All fixtures are invented here:
// "wren", "tamsin" and "oddo" are throwaway test characters, not lore.
import test from "node:test";
import assert from "node:assert/strict";
import {
  CharacterLedger,
  foldCharacterState,
  detectImpossibleTransitions,
  checkTimeline,
  orderTimeline,
  toTick,
  compareStoryTime,
} from "../dist/index.js";

const CAL = { kind: "calendar", monthsPerYear: 10, daysPerMonth: 30, hoursPerDay: 20 };
const codes = (findings) => findings.map((f) => f.code).sort();

// ── Story time ──────────────────────────────────────────────────────────────

test("calendar story-time flattens to comparable ticks using the universe's own calendar", () => {
  assert.equal(toTick({ year: 0, month: 1, day: 1, hour: 0 }, CAL), 0);
  assert.equal(toTick({ year: 0, month: 1, day: 2 }, CAL), 20);
  assert.equal(toTick({ year: 1 }, CAL), 10 * 30 * 20);
  assert.ok(compareStoryTime({ year: 3, month: 2 }, { year: 3, month: 1, day: 30, hour: 19 }, CAL) > 0);
});

test("mixing ordinal and calendar time is refused instead of guessed", () => {
  assert.throws(() => toTick(5, CAL), /Ordinal time/);
  assert.throws(() => toTick({ year: 1 }), /Calendar time/);
  assert.throws(() => toTick({ year: 1, month: 11 }, CAL), /Month 11/);
});

// ── Ledger ──────────────────────────────────────────────────────────────────

test("ledger is append-only: stored events are frozen copies and there is no way to edit them", () => {
  const ledger = new CharacterLedger();
  const ev = { characterId: "wren", sceneRef: "s1", at: 1, changes: { location: "mill" } };
  ledger.append(ev);
  ev.changes.location = "tampered";
  const [stored] = ledger.events();
  assert.equal(stored.changes.location, "mill");
  assert.ok(Object.isFrozen(stored) && Object.isFrozen(stored.changes));
  assert.throws(() => { stored.changes.location = "x"; }, TypeError);
  assert.throws(() => ledger.events().push(ev), TypeError);
  assert.equal(typeof ledger.remove, "undefined");
  assert.equal(typeof ledger.update, "undefined");
  assert.throws(() => ledger.append({ characterId: "wren", at: 2, changes: {} }), /sceneRef/);
});

test("foldCharacterState replays traits, relationships, knowledge, location and status up to a time", () => {
  const events = [
    { characterId: "wren", sceneRef: "c1/s1", at: 1, changes: { traits: { add: ["wary"] }, location: "mill" } },
    { characterId: "wren", sceneRef: "c1/s2", at: 2, changes: { relationships: { tamsin: "rival" }, knowledge: { learns: ["mill-key"] } } },
    { characterId: "wren", sceneRef: "c2/s1", at: 5, changes: { traits: { add: ["bold"], remove: ["wary"] }, relationships: { tamsin: "friend" }, location: "ridge" } },
    { characterId: "wren", sceneRef: "c3/s1", at: 9, changes: { relationships: { tamsin: null }, status: "missing" } },
  ];
  const early = foldCharacterState(events, 2);
  assert.deepEqual(early.traits, ["wary"]);
  assert.deepEqual(early.relationships, { tamsin: "rival" });
  assert.deepEqual(early.knowledge, ["mill-key"]);
  assert.equal(early.location, "mill");
  assert.equal(early.lastSceneRef, "c1/s2");

  const mid = foldCharacterState(events, 6);
  assert.deepEqual(mid.traits, ["bold"]);
  assert.equal(mid.relationships.tamsin, "friend");
  assert.equal(mid.location, "ridge");
  assert.equal(mid.status, "alive");

  const late = foldCharacterState(events, 100);
  assert.deepEqual(late.relationships, {});
  assert.equal(late.status, "missing");
  assert.equal(late.appliedEvents, 4);
});

test("fold order is story-time, not writing order (a flashback written later applies earlier)", () => {
  const events = [
    { characterId: "wren", sceneRef: "ch9/flashback", at: 1, changes: { location: "harbour" } },
    { characterId: "wren", sceneRef: "ch2/s1", at: 4, changes: { location: "ridge" } },
  ].reverse();
  assert.equal(foldCharacterState(events, 2).location, "harbour");
  assert.equal(foldCharacterState(events, 4).location, "ridge");
});

test("fold refuses to blend a mixed ledger unless a character is chosen", () => {
  const events = [
    { characterId: "wren", sceneRef: "s1", at: 1, changes: { location: "a" } },
    { characterId: "oddo", sceneRef: "s1", at: 1, changes: { location: "b" } },
  ];
  assert.throws(() => foldCharacterState(events, 1), /2 characters/);
  assert.equal(foldCharacterState(events, 1, { characterId: "oddo" }).location, "b");
});

test("detects a dead character acting later, citing both the death scene and the offending scene", () => {
  const findings = detectImpossibleTransitions([
    { characterId: "oddo", sceneRef: "bk1/ch4/s2", at: 10, changes: { status: "dead" } },
    { characterId: "oddo", sceneRef: "bk1/ch7/s1", at: 15, changes: { location: "bridge" } },
  ]);
  assert.deepEqual(codes(findings), ["DEAD_ACTOR"]);
  assert.deepEqual(findings[0].sceneRefs, ["bk1/ch4/s2", "bk1/ch7/s1"]);
  assert.equal(findings[0].severity, "error");
});

test("a revival needs a reason; with one it is accepted and later acts are fine", () => {
  const base = [
    { characterId: "oddo", sceneRef: "s1", at: 1, changes: { status: "dead" } },
    { characterId: "oddo", sceneRef: "s2", at: 2, changes: { status: "alive" } },
    { characterId: "oddo", sceneRef: "s3", at: 3, changes: { location: "gate" } },
  ];
  assert.deepEqual(codes(detectImpossibleTransitions(base)), ["UNEXPLAINED_RESURRECTION"]);
  const explained = structuredClone(base);
  explained[1].changes.statusReason = "the healer's bargain in s2";
  assert.deepEqual(detectImpossibleTransitions(explained), []);
});

test("detects knowledge used before it is learned, and unsourced knowledge", () => {
  const findings = detectImpossibleTransitions([
    { characterId: "tamsin", sceneRef: "ch1/s3", at: 3, changes: { knowledge: { uses: ["vault-word"] } } },
    { characterId: "tamsin", sceneRef: "ch5/s1", at: 8, changes: { knowledge: { learns: ["vault-word"] } } },
    { characterId: "tamsin", sceneRef: "ch6/s1", at: 9, changes: { knowledge: { uses: ["ferry-route"] } } },
  ]);
  const before = findings.find((f) => f.code === "KNOWLEDGE_BEFORE_LEARNED");
  assert.ok(before);
  assert.deepEqual(before.sceneRefs, ["ch1/s3", "ch5/s1"]);
  assert.ok(before.subjects.includes("vault-word"));
  assert.equal(findings.find((f) => f.code === "UNSOURCED_KNOWLEDGE").severity, "warning");
});

test("initial knowledge and same-scene learn-then-use are not flagged; use after forgetting is", () => {
  const ok = detectImpossibleTransitions(
    [
      { characterId: "tamsin", sceneRef: "s1", at: 1, changes: { knowledge: { uses: ["home-song"] } } },
      { characterId: "tamsin", sceneRef: "s2", at: 2, changes: { knowledge: { learns: ["cipher"], uses: ["cipher"] } } },
    ],
    { initial: { tamsin: { knowledge: ["home-song"] } } },
  );
  assert.deepEqual(ok, []);
  const forgot = detectImpossibleTransitions([
    { characterId: "tamsin", sceneRef: "s1", at: 1, changes: { knowledge: { learns: ["cipher"] } } },
    { characterId: "tamsin", sceneRef: "s2", at: 2, changes: { knowledge: { forgets: ["cipher"] } } },
    { characterId: "tamsin", sceneRef: "s3", at: 3, changes: { knowledge: { uses: ["cipher"] } } },
  ]);
  assert.deepEqual(codes(forgot), ["KNOWLEDGE_AFTER_FORGOTTEN"]);
});

test("detects a character in two places at one story-time (calendar universe)", () => {
  const at = { year: 12, month: 3, day: 4, hour: 6 };
  const findings = detectImpossibleTransitions(
    [
      { characterId: "wren", sceneRef: "bk2/ch1/s1", at, changes: { location: "lighthouse" } },
      { characterId: "wren", sceneRef: "bk2/ch3/s2", at: { ...at }, changes: { location: "orchard" } },
      { characterId: "wren", sceneRef: "bk2/ch3/s3", at: { ...at, hour: 7 }, changes: { location: "orchard" } },
    ],
    { model: CAL },
  );
  assert.deepEqual(codes(findings), ["BILOCATION"]);
  assert.deepEqual(findings[0].sceneRefs, ["bk2/ch1/s1", "bk2/ch3/s2"]);
});

// ── Timeline ────────────────────────────────────────────────────────────────

const ev = (id, extra = {}) => ({ id, sceneRef: `scene-${id}`, ...extra });

test("consistent before/after/during constraints produce no findings and a reading order", () => {
  const events = [ev("storm", { at: 1, end: 6 }), ev("shipwreck", { at: 3 }), ev("rescue"), ev("trial")];
  const constraints = [
    { a: "shipwreck", relation: "during", b: "storm" },
    { a: "rescue", relation: "after", b: "shipwreck" },
    { a: "rescue", relation: "before", b: "trial" },
  ];
  assert.deepEqual(checkTimeline(events, constraints), []);
  assert.deepEqual(orderTimeline(events, constraints), ["storm", "shipwreck", "rescue", "trial"]);
});

test("finds an ordering cycle and names every constraint and scene in it", () => {
  const findings = checkTimeline(
    [ev("a"), ev("b"), ev("c")],
    [
      { a: "a", relation: "before", b: "b", sceneRef: "ch1/s1" },
      { a: "b", relation: "before", b: "c", sceneRef: "ch2/s4" },
      { a: "c", relation: "before", b: "a", sceneRef: "ch9/s2" },
    ],
  );
  assert.deepEqual(codes(findings), ["TIMELINE_CYCLE"]);
  for (const ref of ["ch1/s1", "ch2/s4", "ch9/s2"]) assert.ok(findings[0].sceneRefs.includes(ref), ref);
  assert.deepEqual([...findings[0].subjects].sort(), ["a", "b", "c"]);
  assert.equal(orderTimeline([ev("a"), ev("b"), ev("c")], [{ a: "a", relation: "before", b: "a" }]), null);
});

test("mutual 'during' is an equality, not a cycle; but it contradicts different anchors", () => {
  const mutual = [
    { a: "x", relation: "during", b: "y" },
    { a: "y", relation: "during", b: "x" },
  ];
  assert.deepEqual(checkTimeline([ev("x"), ev("y")], mutual), []);
  const clash = checkTimeline([ev("x", { at: 1 }), ev("y", { at: 4 })], mutual);
  assert.ok(clash.some((f) => f.code === "TIMELINE_CONTRADICTION"));
});

test("finds an indirect contradiction between anchored times through an unanchored event", () => {
  const findings = checkTimeline(
    [ev("coronation", { at: 50 }), ev("exile"), ev("letter", { at: 30 })],
    [
      { a: "coronation", relation: "before", b: "exile", sceneRef: "ch3/s1" },
      { a: "exile", relation: "before", b: "letter", sceneRef: "ch8/s2" },
    ],
  );
  assert.deepEqual(codes(findings), ["TIMELINE_CONTRADICTION"]);
  const f = findings[0];
  assert.ok(f.sceneRefs.includes("ch3/s1") && f.sceneRefs.includes("ch8/s2"));
  assert.ok(f.sceneRefs.includes("scene-coronation") && f.sceneRefs.includes("scene-letter"));
  assert.match(f.message, /coronation before exile -> exile before letter/);
});

test("'during' outside the container's anchored span is a contradiction; equal instants with 'before' too", () => {
  const during = checkTimeline(
    [ev("feast", { at: 10, end: 12 }), ev("toast", { at: 14 })],
    [{ a: "toast", relation: "during", b: "feast" }],
  );
  assert.deepEqual(codes(during), ["TIMELINE_CONTRADICTION"]);
  const sameInstant = checkTimeline([ev("p", { at: 5 }), ev("q", { at: 5 })], [{ a: "p", relation: "before", b: "q" }]);
  assert.deepEqual(codes(sameInstant), ["TIMELINE_CONTRADICTION"]);
});

test("reports unknown events, negative durations and duplicates precisely", () => {
  const findings = checkTimeline(
    [ev("a", { at: 9, end: 3 }), ev("b"), ev("b")],
    [{ id: "c-7", a: "a", relation: "before", b: "ghost", sceneRef: "ch2/s2" }],
  );
  assert.deepEqual(codes(findings), ["DUPLICATE_EVENT", "NEGATIVE_DURATION", "UNKNOWN_EVENT"]);
  const unknown = findings.find((f) => f.code === "UNKNOWN_EVENT");
  assert.deepEqual(unknown.subjects, ["ghost"]);
  assert.deepEqual(unknown.sceneRefs, ["ch2/s2"]);
  assert.match(unknown.message, /c-7/);
});
