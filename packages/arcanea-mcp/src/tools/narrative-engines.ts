/**
 * Loads the narrative engines the narrative_* tools call into.
 *
 * Why lazy and not a static import: @arcanea/mcp-server is published to npm
 * and its release gate (scripts/verify-package.mjs) rejects workspace:,
 * file: and relative dependencies. @arcanea/world-engine and
 * @arcanea/narrative-planner are workspace packages (narrative-planner is
 * private), so they cannot be declared dependencies. A static import would
 * crash the whole server for npm consumers; a lazy import only makes these
 * three tools report "engine unavailable".
 *
 * Resolution order per engine:
 *   1. the package name, if the host has it installed or linked;
 *   2. the sibling build inside this monorepo (packages/<name>/dist/index.js).
 * The loaded module is checked for the exports the tools use, so a stale
 * build (e.g. a world-engine dist built before the continuity module existed)
 * produces a clear error instead of a TypeError deep inside a tool.
 */

// ── Engine surfaces (structural, so this package keeps no type dependency) ──

export interface EngineFinding {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
  sceneRefs: string[];
  subjects: string[];
}

export interface EngineRepeatedPhrase {
  phrase: string;
  spread: number;
  occurrences: number;
  chapters: string[];
}

export interface EngineStructuralNovelty {
  embeddingNovelty: number;
  archetypeNovelty: number;
  score: number;
  units: Array<{ id: string; level: "arc" | "chapter"; nearestDistance: number; nearestId?: string }>;
  nearestPlanId?: string;
}

export interface WorldEngineContinuity {
  detectImpossibleTransitions(
    events: readonly unknown[],
    options?: { model?: unknown; initial?: Record<string, unknown> },
  ): EngineFinding[];
  checkTimeline(events: readonly unknown[], constraints: readonly unknown[], model?: unknown): EngineFinding[];
  validateScene(facts: unknown, rules: readonly unknown[]): EngineFinding[];
  buildCanonRules(): unknown[];
  distinctN(text: string | readonly string[], n?: number): number;
  detectRepetition(
    chapters: ReadonlyArray<{ id: string; text: string }>,
    options?: { n?: number; minChapters?: number },
  ): EngineRepeatedPhrase[];
  structuralNovelty(
    candidate: unknown,
    corpus: readonly unknown[],
    options?: { weightEmbedding?: number },
  ): EngineStructuralNovelty;
}

/** The subset of a narrative-planner NarrativeModel the runner needs. */
export interface NarrativeModelLike {
  readonly provider: string;
  generate(req: unknown): Promise<unknown>;
}

export interface PlannerStageResult {
  stage: string;
  unit: string;
  data: unknown;
  model: string;
  attempts: number;
  status: string;
  canon?: { verdict: string; findings: unknown[] };
}

export type PlannerEvent =
  | { type: "stage_start"; stage: string; unit: string; attempt: number }
  | { type: "stage_complete"; stage: string; unit: string; result: PlannerStageResult }
  | { type: "receipt"; receipt: Record<string, unknown> }
  | { type: "validation_failed"; stage: string; unit: string; attempt: number; errors: string[] }
  | { type: "error"; code: string; message: string; stage?: string; unit?: string }
  | { type: string; [key: string]: unknown };

export interface NarrativePlannerModule {
  runStory(spec: {
    jobId: string;
    premise: string;
    chapterCount: number;
    model: NarrativeModelLike;
    store: unknown;
    canonGate?: unknown;
    maxAttempts?: number;
    signal?: AbortSignal;
  }): AsyncGenerator<PlannerEvent, void, undefined>;
  MemoryCheckpointStore: new () => unknown;
  StructuralCanonGate: new () => unknown;
}

/** Injected by tests and library callers; the MCP handlers use the default loaders. */
export interface NarrativeEngines {
  worldEngine?: () => Promise<WorldEngineContinuity>;
  planner?: () => Promise<NarrativePlannerModule>;
}

export class NarrativeEngineUnavailable extends Error {
  readonly engine: string;
  constructor(engine: string, message: string) {
    super(message);
    this.name = "NarrativeEngineUnavailable";
    this.engine = engine;
  }
}

const WORLD_ENGINE_EXPORTS = [
  "detectImpossibleTransitions",
  "checkTimeline",
  "validateScene",
  "buildCanonRules",
  "distinctN",
  "detectRepetition",
  "structuralNovelty",
] as const;

const PLANNER_EXPORTS = ["runStory", "MemoryCheckpointStore", "StructuralCanonGate"] as const;

/** Exported for tests: pure check that a loaded module has every required export. */
export function missingExports(mod: unknown, names: readonly string[]): string[] {
  const record = (mod ?? {}) as Record<string, unknown>;
  return names.filter((name) => typeof record[name] !== "function");
}

async function loadEngine<T>(
  engine: string,
  packageName: string,
  siblingDir: string,
  required: readonly string[],
): Promise<T> {
  // Specifiers are variables so tsc does not try to resolve them at build time.
  const candidates: string[] = [
    packageName,
    // dist/tools/narrative-engines.js -> packages/<siblingDir>/dist/index.js
    new URL(`../../../${siblingDir}/dist/index.js`, import.meta.url).href,
  ];
  const problems: string[] = [];
  for (const specifier of candidates) {
    let mod: unknown;
    try {
      mod = await import(specifier);
    } catch (err) {
      problems.push(`${specifier}: ${(err as Error).message.split("\n")[0]}`);
      continue;
    }
    const missing = missingExports(mod, required);
    if (missing.length === 0) return mod as T;
    problems.push(`${specifier}: build is missing exports ${missing.join(", ")} (rebuild ${packageName})`);
  }
  throw new NarrativeEngineUnavailable(
    engine,
    `${packageName} could not be loaded. Build it in this monorepo or install it next to @arcanea/mcp-server. Tried: ${problems.join(" | ")}`,
  );
}

let worldEngineCache: Promise<WorldEngineContinuity> | undefined;
let plannerCache: Promise<NarrativePlannerModule> | undefined;

export function loadWorldEngine(): Promise<WorldEngineContinuity> {
  worldEngineCache ??= loadEngine<WorldEngineContinuity>(
    "world-engine",
    "@arcanea/world-engine",
    "world-engine",
    WORLD_ENGINE_EXPORTS,
  ).catch((err) => {
    worldEngineCache = undefined; // a later build can still succeed
    throw err;
  });
  return worldEngineCache;
}

export function loadNarrativePlanner(): Promise<NarrativePlannerModule> {
  plannerCache ??= loadEngine<NarrativePlannerModule>(
    "narrative-planner",
    "@arcanea/narrative-planner",
    "narrative-planner",
    PLANNER_EXPORTS,
  ).catch((err) => {
    plannerCache = undefined;
    throw err;
  });
  return plannerCache;
}
