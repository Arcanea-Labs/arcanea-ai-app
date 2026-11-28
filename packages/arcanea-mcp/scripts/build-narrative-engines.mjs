#!/usr/bin/env node
// Builds the narrative engines that the narrative_* MCP tools load lazily.
//
// world-engine's dist/continuity/ and narrative-planner's dist/ are
// git-ignored build output. On a fresh checkout they are missing, and
// narrative_check_continuity / narrative_score_diversity / narrative_plan_story
// answer engine_unavailable. This script compiles them in dependency order:
//
//   schemas -> world-engine -> narrative-planner
//
// Usage (from anywhere):
//   pnpm --filter @arcanea/mcp-server build:engines
//   node packages/arcanea-mcp/scripts/build-narrative-engines.mjs [--check] [--root <repo>]
//
//   --check   report which engine outputs are missing; build nothing.
//             Exit 0 when all are present, 1 otherwise.
//   --root    monorepo root (default: two levels above this package). For tests.
//
// tsc is spawned with an argv array (no shell), using the TypeScript that
// @arcanea/mcp-server itself depends on.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEFAULT_REPO_ROOT = resolve(PKG_ROOT, "..", "..");

export const BUILD_COMMAND = "pnpm --filter @arcanea/mcp-server build:engines";

/** Build order and the file each build must produce for the MCP tools to load it. */
export const ENGINES = [
  { name: "@arcanea/schemas", dir: "packages/schemas", output: "dist/index.d.ts" },
  { name: "@arcanea/world-engine", dir: "packages/world-engine", output: "dist/continuity/index.js" },
  { name: "@arcanea/narrative-planner", dir: "packages/narrative-planner", output: "dist/index.js" },
];

export function engineStatus(root = DEFAULT_REPO_ROOT) {
  return ENGINES.map((e) => {
    const output = join(root, e.dir, e.output);
    return { ...e, output, present: existsSync(output), hasProject: existsSync(join(root, e.dir, "tsconfig.json")) };
  });
}

export function resolveTsc() {
  return createRequire(join(PKG_ROOT, "package.json")).resolve("typescript/bin/tsc");
}

export function buildEngines({ root = DEFAULT_REPO_ROOT, log = (m) => process.stdout.write(m + "\n") } = {}) {
  const tsc = resolveTsc();
  for (const e of engineStatus(root)) {
    if (!e.hasProject) throw new Error(`${e.name}: no tsconfig.json in ${join(root, e.dir)}`);
    log(`building ${e.name} (${e.dir})`);
    const r = spawnSync(process.execPath, [tsc, "-p", join(root, e.dir)], { encoding: "utf8", shell: false });
    if (r.status !== 0) throw new Error(`${e.name}: tsc failed (exit ${r.status ?? r.signal})\n${r.stdout}${r.stderr}`.trim());
    if (!existsSync(e.output)) throw new Error(`${e.name}: tsc succeeded but ${relative(root, e.output)} is missing`);
  }
  return engineStatus(root);
}

function parseArgs(argv) {
  const a = { check: false, root: DEFAULT_REPO_ROOT };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--check") a.check = true;
    else if (argv[i] === "--root") a.root = resolve(argv[++i] ?? "");
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  return a;
}

export function main(argv = process.argv.slice(2), { log = (m) => process.stdout.write(m + "\n"), err = (m) => process.stderr.write(m + "\n") } = {}) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    err(e.message);
    return 2;
  }
  if (args.check) {
    const status = engineStatus(args.root);
    for (const s of status) log(`${s.present ? "ok     " : "missing"} ${s.name}: ${relative(args.root, s.output)}`);
    const missing = status.filter((s) => !s.present);
    if (missing.length) err(`narrative engines not built; run from the repo root: ${BUILD_COMMAND}`);
    return missing.length ? 1 : 0;
  }
  try {
    buildEngines({ root: args.root, log });
  } catch (e) {
    err(e.message);
    return 1;
  }
  log("narrative engines built");
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
