import { describe, it, before, after } from "node:test";
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync, readdirSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

const pkgRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const tsc = createRequire(join(pkgRoot, "package.json")).resolve("typescript/bin/tsc");

function parse(result) {
  assert.ok(Array.isArray(result.content));
  assert.equal(result.content[0].type, "text");
  return JSON.parse(result.content[0].text);
}

function compile(args) {
  const r = spawnSync(process.execPath, [tsc, ...args], { encoding: "utf8" });
  assert.equal(r.status, 0, `tsc failed: ${r.stdout}${r.stderr}`);
}

/** Recursive listing with mtimes, to prove a run wrote nothing there. */
function snapshot(dir) {
  const out = [];
  for (const name of readdirSync(dir, { recursive: true })) {
    const s = statSync(join(dir, name));
    out.push(`${name}:${s.size}:${s.mtimeMs}`);
  }
  return out.sort();
}

describe("narrative MCP tools", () => {
  let tools, reg, engines, toolsets, createServer;
  let worldEngine, planner;
  let scratch;

  before(async () => {
    // Build the sibling engines into scratch so the tests never touch their dist folders.
    scratch = mkdtempSync(join(tmpdir(), "narrative-mcp-"));
    writeFileSync(join(scratch, "package.json"), '{"type":"module"}');
    compile(["-p", join(repoRoot, "packages/narrative-planner/tsconfig.json"), "--outDir", join(scratch, "narrative-planner")]);
    const weSrc = join(repoRoot, "packages/world-engine/src");
    compile([
      "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--skipLibCheck",
      "--rootDir", weSrc, "--outDir", join(scratch, "world-engine"), join(weSrc, "continuity/index.ts"),
    ]);
    worldEngine = await import(pathToFileURL(join(scratch, "world-engine/continuity/index.js")).href);
    planner = await import(pathToFileURL(join(scratch, "narrative-planner/index.js")).href);

    tools = await import("../dist/tools/narrative-intelligence.js");
    reg = await import("../dist/tools/narrative-registration.js");
    engines = await import("../dist/tools/narrative-engines.js");
    toolsets = await import("../dist/toolsets.js");
    ({ createServer } = await import("../dist/index.js"));
  });

  after(() => {
    if (scratch) rmSync(scratch, { recursive: true, force: true });
  });

  const deps = () => ({ worldEngine: async () => worldEngine, planner: async () => planner });

  // ── input validation ────────────────────────────────────────────────────

  it("plan input schema rejects a short prompt and out-of-range chapters", () => {
    assert.equal(reg.planStoryInput.safeParse({ prompt: "a lighthouse keeper's letters" }).success, true);
    assert.equal(reg.planStoryInput.safeParse({ prompt: "x" }).success, false);
    assert.equal(reg.planStoryInput.safeParse({ prompt: "valid prompt", chapters: 0 }).success, false);
    assert.equal(reg.planStoryInput.safeParse({ prompt: "valid prompt", chapters: 2.5 }).success, false);
  });

  it("continuity input schema rejects unknown relations and missing fields", () => {
    const ok = { characterEvents: [], timelineEvents: [], constraints: [] };
    assert.equal(reg.checkContinuityInput.safeParse(ok).success, true);
    assert.equal(reg.checkContinuityInput.safeParse({ ...ok, constraints: [{ a: "x", relation: "near", b: "y" }] }).success, false);
    assert.equal(reg.checkContinuityInput.safeParse({ characterEvents: [] }).success, false);
    assert.equal(
      reg.checkContinuityInput.safeParse({ ...ok, characterEvents: [{ characterId: "a", sceneRef: "s", at: 1, changes: { status: "zombie" } }] }).success,
      false,
    );
  });

  it("diversity input schema needs texts or plans", () => {
    assert.equal(reg.scoreDiversityInput.safeParse({}).success, false);
    assert.equal(reg.scoreDiversityInput.safeParse({ texts: [] }).success, false);
    assert.equal(reg.scoreDiversityInput.safeParse({ texts: ["one"] }).success, true);
    assert.equal(reg.scoreDiversityInput.safeParse({ plans: [{ id: "p", level: "galaxy", title: "t" }] }).success, false);
  });

  it("tool functions validate input themselves, before touching a model or engine", async () => {
    const plan = parse(await tools.planStory({ prompt: "" }, { model: { provider: "x", generate: async () => assert.fail("model called") } }));
    assert.equal(plan.error.code, "invalid_input");
    const cont = parse(await tools.checkContinuity({ characterEvents: "nope", timelineEvents: [], constraints: [] }, deps()));
    assert.equal(cont.error.code, "invalid_input");
    const div = parse(await tools.scoreDiversity({ texts: [{ id: "a", text: "x" }, { id: "a", text: "y" }] }, deps()));
    assert.match(div.error.message, /unique/);
  });

  // ── narrative_plan_story ────────────────────────────────────────────────

  it("plan without a model returns no_model_configured and never loads the planner", async () => {
    let loaded = false;
    const result = await tools.planStory({ prompt: "A cartographer maps a city that rearranges itself" }, {
      planner: async () => { loaded = true; return planner; },
    });
    assert.equal(result.isError, true);
    const body = parse(result);
    assert.equal(body.error.code, "no_model_configured");
    assert.match(body.error.message, /no generation model configured/);
    assert.equal(body.canonWritten, false);
    assert.equal(loaded, false);
  });

  it("the registered MCP tool returns no_model_configured end to end", async () => {
    const [serverSide, clientSide] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "narrative-test", version: "0.0.0" });
    await Promise.all([createServer({ toolsets: "narrative" }).connect(serverSide), client.connect(clientSide)]);
    const { tools: listed } = await client.listTools();
    assert.deepEqual(listed.map((t) => t.name).sort(), ["narrative_check_continuity", "narrative_plan_story", "narrative_score_diversity"]);
    const result = await client.callTool({ name: "narrative_plan_story", arguments: { prompt: "A tide that runs backwards" } });
    await client.close();
    assert.equal(result.isError, true);
    assert.equal(parse(result).error.code, "no_model_configured");
  });

  it("narrative toolset is catalogued: plan may reach a model, the checks are local and read-only", () => {
    assert.deepEqual([...toolsets.TOOLSETS.narrative], ["narrative_plan_story", "narrative_check_continuity", "narrative_score_diversity"]);
    for (const name of toolsets.TOOLSETS.narrative) assert.equal(toolsets.TOOL_CATALOG[name].readOnly, true, name);
    assert.equal(toolsets.TOOL_CATALOG.narrative_plan_story.openWorld, true);
    assert.equal(toolsets.TOOL_CATALOG.narrative_check_continuity.openWorld, false);
    assert.ok(!toolsets.TOOLSETS.core.includes("narrative_plan_story"), "core stays small");
  });

  it("plan with an injected model runs only the four planning stages and returns a candidate", async () => {
    const model = new planner.MockNarrativeModel();
    const body = parse(await tools.planStory(
      { prompt: "A lighthouse keeper receives letters from a drowned city", chapters: 2, worldRules: ["The dead cannot speak aloud"] },
      { ...deps(), model },
    ));
    assert.equal(body.status, "candidate");
    assert.deepEqual(body.stagesCompleted, ["book_preview", "book_plan", "chapters_plan", "characters_list"]);
    assert.deepEqual(model.calls.map((c) => c.stage), ["book_preview", "book_plan", "chapters_plan", "characters_list"]);
    for (const stage of Object.values(body.plan)) assert.equal(stage.status, "candidate");
    assert.equal(body.plan.chapters_plan.data.chapters.length, 2);
    assert.equal(body.receipts.length, 4);
    assert.ok(model.calls[0].prompt.includes("The dead cannot speak aloud"), "world rules reach the prompt");
  });

  it("canon is never written: lore and the working directory are untouched by a planning run", async () => {
    const lore = join(repoRoot, ".arcanea/lore");
    const before = snapshot(lore);
    const cwdBefore = snapshot(pkgRoot + "/src");
    const body = parse(await tools.planStory({ prompt: "Guardians of a frozen archive" }, { ...deps(), model: new planner.MockNarrativeModel() }));
    assert.equal(body.canonWritten, false);
    assert.match(body.note, /not canon/);
    assert.deepEqual(snapshot(lore), before);
    assert.deepEqual(snapshot(pkgRoot + "/src"), cwdBefore);
  });

  it("a planner stop (forbidden term) is reported as planner_stopped, with what completed", async () => {
    const model = new planner.MockNarrativeModel({
      overrides: { chapters_plan: [() => '{"chapters":[{"index":1,"name":"Gate","targetWords":1000,"summary":["teleportation everywhere"],"narrativeFocus":"x","ruleKeys":[],"embeddingSpace":{"action":1,"dialog":1,"world_building":1,"exposition":1,"romantic":1,"pacing":1}}]}'] },
    });
    const result = await tools.planStory({ prompt: "A courier between floating towns", chapters: 1 }, { ...deps(), model });
    assert.equal(result.isError, true);
    const body = parse(result);
    assert.equal(body.error.code, "planner_stopped");
    assert.equal(body.error.plannerCode, "canon_block");
    assert.deepEqual(body.stagesCompleted, ["book_preview", "book_plan"]);
    assert.equal(body.status, "candidate");
  });

  // ── narrative_check_continuity ──────────────────────────────────────────

  it("continuity flags a dead actor and a timeline cycle, with scene refs", async () => {
    const body = parse(await tools.checkContinuity({
      characterEvents: [
        { characterId: "mira", sceneRef: "ch1-s3", at: 3, changes: { status: "dead" } },
        { characterId: "mira", sceneRef: "ch2-s1", at: 5, changes: { location: "harbor" } },
      ],
      timelineEvents: [{ id: "duel" }, { id: "flood" }],
      constraints: [
        { a: "duel", relation: "before", b: "flood", sceneRef: "ch1-s1" },
        { a: "flood", relation: "before", b: "duel", sceneRef: "ch3-s2" },
      ],
    }, deps()));
    assert.equal(body.status, "ok");
    assert.equal(body.modelCalls, 0);
    const codes = body.findings.map((f) => f.code);
    assert.ok(codes.includes("DEAD_ACTOR"), codes.join());
    assert.ok(codes.includes("TIMELINE_CYCLE"), codes.join());
    assert.ok(body.findings.find((f) => f.code === "DEAD_ACTOR").sceneRefs.includes("ch2-s1"));
    assert.equal(body.summary.byCheck.ledger + body.summary.byCheck.timeline, body.summary.total);
  });

  it("continuity applies canon world rules to scene facts", async () => {
    const body = parse(await tools.checkContinuity({
      characterEvents: [], timelineEvents: [], constraints: [],
      sceneFacts: [{ sceneRef: "ch4-s2", elements: ["plasma"] }],
    }, deps()));
    const v = body.findings.filter((f) => f.code === "WORLD_RULE_VIOLATION");
    assert.ok(v.length >= 1, JSON.stringify(body.findings));
    assert.deepEqual(v[0].sceneRefs, ["ch4-s2"]);
    assert.equal(body.summary.scenesChecked, 1);
  });

  it("continuity on consistent input finds nothing and does not mutate its input", async () => {
    const input = Object.freeze({
      characterEvents: Object.freeze([
        Object.freeze({ characterId: "oren", sceneRef: "s1", at: 1, changes: Object.freeze({ knowledge: Object.freeze({ learns: Object.freeze(["map"]) }) }) }),
        Object.freeze({ characterId: "oren", sceneRef: "s2", at: 2, changes: Object.freeze({ knowledge: Object.freeze({ uses: Object.freeze(["map"]) }) }) }),
      ]),
      timelineEvents: Object.freeze([Object.freeze({ id: "a", at: 1 }), Object.freeze({ id: "b", at: 2 })]),
      constraints: Object.freeze([Object.freeze({ a: "a", relation: "before", b: "b" })]),
    });
    const body = parse(await tools.checkContinuity(input, deps()));
    assert.equal(body.status, "ok");
    assert.deepEqual(body.findings, []);
    assert.equal(body.summary.total, 0);
  });

  it("continuity reports engine input errors as invalid_input instead of throwing", async () => {
    const result = await tools.checkContinuity({
      characterEvents: [{ characterId: "a", sceneRef: "s", at: { year: 3 }, changes: {} }, { characterId: "a", sceneRef: "t", at: 4, changes: {} }],
      timelineEvents: [], constraints: [],
    }, deps());
    assert.equal(result.isError, true);
    assert.equal(parse(result).error.code, "invalid_input");
  });

  // ── narrative_score_diversity ───────────────────────────────────────────

  it("diversity scores texts with distinct-n and cross-text repetition", async () => {
    const tic = "her eyes glinted like cold steel";
    const body = parse(await tools.scoreDiversity({
      texts: [
        `The harbor woke slowly. ${tic} as the boats came in.`,
        { id: "ch2", text: `Rain on the archive roof. Later, ${tic} again.` },
        "A completely different chapter about bread, ovens and a quiet baker.",
      ],
    }, deps()));
    assert.equal(body.status, "ok");
    for (const k of ["distinct1", "distinct2", "distinct3"]) assert.ok(body.texts[k] > 0 && body.texts[k] <= 1, k);
    assert.ok(body.texts.distinct1 <= body.texts.distinct2, "unigrams repeat more than bigrams");
    assert.deepEqual(body.texts.perText.map((t) => t.id), ["text-1", "ch2", "text-3"]);
    const phrase = body.texts.repetition.phrases.find((p) => p.phrase === "eyes glinted like cold");
    assert.ok(phrase, JSON.stringify(body.texts.repetition.phrases));
    assert.equal(phrase.spread, 2);
  });

  it("diversity scores plan novelty leave-one-out: a near copy scores lower than a fresh plan", async () => {
    const arc = (id, vec, archetypes) => ({
      id, level: "arc", title: id, archetypes, embedding_space: vec,
      narrative: { name: id }, chapters: [],
    });
    const plans = [
      arc("heist-a", [9, 1, 1, 1], ["trickster", "mentor"]),
      arc("heist-b", [9, 1, 1, 1.1], ["trickster", "mentor"]),
      arc("pastoral", [1, 1, 9, 6], ["healer", "herald"]),
    ];
    const body = parse(await tools.scoreDiversity({ plans }, deps()));
    const by = Object.fromEntries(body.plans.perPlan.map((p) => [p.id, p]));
    assert.equal(body.plans.count, 3);
    assert.ok(by["heist-a"].score < by.pastoral.score, JSON.stringify(by));
    assert.equal(by["heist-a"].nearestPlanId, "heist-b");
    assert.ok(body.plans.meanNovelty > 0 && body.plans.meanNovelty <= 1);
  });

  // ── engine loading ──────────────────────────────────────────────────────

  it("an unavailable engine produces engine_unavailable, and stale builds are detected", async () => {
    const unavailable = { worldEngine: async () => { throw new engines.NarrativeEngineUnavailable("world-engine", "not built"); } };
    const result = await tools.scoreDiversity({ texts: ["one two three"] }, unavailable);
    assert.equal(result.isError, true);
    const body = parse(result);
    assert.equal(body.error.code, "engine_unavailable");
    assert.equal(body.engine, "world-engine");
    assert.deepEqual(engines.missingExports({ distinctN() {} }, ["distinctN", "checkTimeline"]), ["checkTimeline"]);
    assert.deepEqual(engines.missingExports(worldEngine, ["detectImpossibleTransitions", "checkTimeline", "validateScene", "buildCanonRules", "distinctN", "detectRepetition", "structuralNovelty"]), []);
  });
});
