// The narrative engines are git-ignored build output. These tests cover the
// install path: the build script (against a fake monorepo in a mktemp dir, so
// no real dist folder is touched) and the loader error that names it.
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const script = fileURLToPath(new URL("../scripts/build-narrative-engines.mjs", import.meta.url));
const pkgJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

function fakeRepo({ withSources = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), "narrative-engines-"));
  const project = (dir, file, code) => {
    const base = join(root, dir);
    mkdirSync(join(base, "src", ...file.split("/").slice(0, -1)), { recursive: true });
    writeFileSync(join(base, "package.json"), '{"type":"module"}');
    writeFileSync(
      join(base, "tsconfig.json"),
      JSON.stringify({ compilerOptions: { target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", declaration: true, outDir: "./dist", rootDir: "./src", types: [] }, include: ["src/**/*.ts"] }),
    );
    if (withSources) writeFileSync(join(base, "src", file), code);
  };
  project("packages/schemas", "index.ts", "export const schema = 1;\n");
  project("packages/world-engine", "continuity/index.ts", "export function distinctN(): number { return 1; }\n");
  project("packages/narrative-planner", "index.ts", "export function runStory(): void {}\n");
  return root;
}

const run = (args) => spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });

describe("narrative engine build path", () => {
  it("package.json exposes build:engines and the loader names the same command", async () => {
    assert.equal(pkgJson.scripts["build:engines"], "node scripts/build-narrative-engines.mjs");
    const engines = await import("../dist/tools/narrative-engines.js");
    assert.equal(engines.ENGINE_BUILD_COMMAND, "pnpm --filter @arcanea/mcp-server build:engines");
    const mod = await import(pathToFileURL(script).href);
    assert.equal(mod.BUILD_COMMAND, engines.ENGINE_BUILD_COMMAND);
    assert.deepEqual(mod.ENGINES.map((e) => e.name), ["@arcanea/schemas", "@arcanea/world-engine", "@arcanea/narrative-planner"]);
  });

  it("--check reports missing engines with the build command, then builds them in order", () => {
    const root = fakeRepo();
    const before = run(["--check", "--root", root]);
    assert.equal(before.status, 1);
    assert.match(before.stdout, /missing @arcanea\/world-engine: packages\/world-engine\/dist\/continuity\/index\.js/);
    assert.match(before.stderr, /pnpm --filter @arcanea\/mcp-server build:engines/);

    const build = run(["--root", root]);
    assert.equal(build.status, 0, build.stderr);
    assert.deepEqual(build.stdout.match(/building (\S+)/g), ["building @arcanea/schemas", "building @arcanea/world-engine", "building @arcanea/narrative-planner"]);
    assert.ok(existsSync(join(root, "packages/world-engine/dist/continuity/index.js")));
    assert.ok(existsSync(join(root, "packages/narrative-planner/dist/index.js")));

    const after = run(["--check", "--root", root]);
    assert.equal(after.status, 0, after.stderr);
  });

  it("a failing tsc fails the build with the package name", () => {
    const root = fakeRepo({ withSources: false });
    writeFileSync(join(root, "packages/schemas/src/index.ts"), "export const broken: number = 'not a number';\n");
    const r = run(["--root", root]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /@arcanea\/schemas: tsc failed/);
    assert.equal(run(["--bogus"]).status, 2);
  });

  it("a fresh-checkout world-engine (tracked index re-exporting ignored continuity) yields an error naming the build command", async () => {
    const engines = await import("../dist/tools/narrative-engines.js");
    const dir = mkdtempSync(join(tmpdir(), "stale-world-engine-"));
    writeFileSync(join(dir, "package.json"), '{"type":"module"}');
    writeFileSync(join(dir, "index.js"), 'export * from "./continuity/index.js";\n');
    writeFileSync(join(dir, "stale.js"), "export function distinctN() { return 1; }\n");
    const candidates = ["@arcanea/definitely-not-installed", pathToFileURL(join(dir, "index.js")).href, pathToFileURL(join(dir, "stale.js")).href];
    await assert.rejects(
      engines.loadEngineFrom("world-engine", "@arcanea/world-engine", candidates, ["distinctN", "checkTimeline"]),
      (err) => {
        assert.ok(err instanceof engines.NarrativeEngineUnavailable);
        assert.equal(err.engine, "world-engine");
        assert.equal(err.buildCommand, engines.ENGINE_BUILD_COMMAND);
        assert.match(err.message, /pnpm --filter @arcanea\/mcp-server build:engines/);
        assert.match(err.message, /node packages\/arcanea-mcp\/scripts\/build-narrative-engines\.mjs/);
        assert.match(err.message, /continuity\/index\.js/);
        assert.match(err.message, /stale build of @arcanea\/world-engine/);
        return true;
      },
    );
    const ok = await engines.loadEngineFrom("world-engine", "@arcanea/world-engine", [pathToFileURL(join(dir, "stale.js")).href], ["distinctN"]);
    assert.equal(typeof ok.distinctN, "function");
  });

  it("the MCP tool error carries the build command", async () => {
    const engines = await import("../dist/tools/narrative-engines.js");
    const tools = await import("../dist/tools/narrative-intelligence.js");
    const unavailable = { worldEngine: async () => { throw new engines.NarrativeEngineUnavailable("world-engine", "not built"); } };
    const res = await tools.scoreDiversity({ texts: ["one two three"] }, unavailable);
    const body = JSON.parse(res.content[0].text);
    assert.equal(body.error.code, "engine_unavailable");
    assert.equal(body.buildCommand, engines.ENGINE_BUILD_COMMAND);
  });
});
