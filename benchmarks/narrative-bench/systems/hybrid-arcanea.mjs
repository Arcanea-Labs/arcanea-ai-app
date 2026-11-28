// Hybrid Arcanea pipeline: plan → check continuity between chapters → score.
//
//   { type: "hybrid-arcanea", id, chapters?: 3,
//     planner:   { type: "mock" } | { type: "cli", command, args, ... } | <openai-compatible client config>,
//     extractor: { type: "mock" } | { type: "workers-ai", model? },
//     continuity?: { stopOnError?: false } }
//
// 1. @arcanea/narrative-planner drives the stage protocol (book_preview →
//    book_plan → chapters_plan → characters_list → (scene_breakdown →
//    chapter_text) × N) with its structural canon gate.
// 2. After each chapter's scene_breakdown, before that chapter's prose, the
//    @arcanea/world-engine continuity checker runs over every scene planned so
//    far: character transitions (bilocation and the rest) and timeline order.
// 3. @arcanea/narrative-diagnostics scores plan following per chapter
//    (extraction plus deterministic rules).
//
// The packages are imported from their built dist via relative paths, so the
// bench keeps no dependencies, but they must be built first:
//   tsc -p packages/world-engine && tsc -p packages/narrative-planner && tsc -p packages/narrative-diagnostics
//
// In the dry run, MockNarrativeModel plans from the fixture and MockExtractor
// replays evidence from a word-overlap heuristic. Those numbers test the
// wiring and say nothing about any model.
import { existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { OpenAICompatibleClient } from './openai-compatible.mjs';
import { CliClient } from './cli.mjs';
import { mockText } from './mock.mjs';
import { stageReceipt } from '../lib/receipts.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const PACKAGE_DIST = {
  planner: join(REPO, 'packages', 'narrative-planner', 'dist', 'index.js'),
  // The continuity barrel only; the package index also pulls in @arcanea/schemas.
  continuity: join(REPO, 'packages', 'world-engine', 'dist', 'continuity', 'index.js'),
  diagnostics: join(REPO, 'packages', 'narrative-diagnostics', 'dist', 'index.js'),
};

let loaded;
export async function loadArcaneaPackages() {
  if (!loaded) {
    loaded = (async () => {
      const missing = Object.values(PACKAGE_DIST).filter((p) => !existsSync(p));
      if (missing.length) throw new Error(`hybrid-arcanea: packages not built (${missing.map((p) => relative(REPO, p)).join(', ')} missing); run tsc -p on world-engine, narrative-planner and narrative-diagnostics`);
      const [planner, continuity, diagnostics] = await Promise.all(Object.values(PACKAGE_DIST).map((p) => import(pathToFileURL(p).href)));
      return { planner, continuity, diagnostics };
    })();
    loaded.catch(() => (loaded = undefined));
  }
  return loaded;
}

// ── Dry-run planner: a MockNarrativeModel whose outputs come from the fixture ─

const sentences = (para) => para.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()).filter(Boolean) ?? [para.trim()];

/** Split the faithful mock text into `n` chapters of whole paragraphs. */
export function chapterChunks(fixture, n) {
  const paras = mockText(fixture, 'faithful').split(/\n\s*\n/);
  const per = Math.ceil(paras.length / n);
  return Array.from({ length: n }, (_, i) => paras.slice(i * per, (i + 1) * per)).map((ps) => (ps.length ? ps : ['The day passed quietly.']));
}

function mockPlanner(P, fixture, n) {
  const chunks = chapterChunks(fixture, n);
  const bullets = chunks.map((ps) => sentences(ps[0]).slice(0, 3));
  const idx = (req) => Number(/CHAPTER_INDEX:\s*(\d+)/.exec(req.prompt)?.[1] ?? '1');
  const names = fixture.cast.map((c) => c.name);
  return new P.MockNarrativeModel({
    model: 'mock-narrative-1',
    latencyMs: 0,
    characterNames: names,
    forbiddenTerms: [],
    overrides: {
      chapters_plan: [
        () =>
          JSON.stringify({
            chapters: bullets.map((summary, i) => ({
              index: i + 1,
              name: `${fixture.title} ${i + 1}`,
              targetWords: Math.max(1, Math.round(fixture.targetLength.words / n)),
              summary,
              narrativeFocus: i === 0 ? 'setup' : 'escalation',
              ruleKeys: ['tide-letters'],
              embeddingSpace: { action: 20, dialog: 30, world_building: 50, exposition: 25, romantic: 10, pacing: 40 + i },
            })),
          }),
      ],
      scene_breakdown: Array.from({ length: n }, () => (req) => {
        const c = idx(req);
        return JSON.stringify({
          chapterIndex: c,
          scenes: (bullets[c - 1] ?? []).slice(0, 2).map((summary, i) => ({
            index: i + 1,
            summary,
            characters: [names[(c - 1 + i) % names.length]],
            location: `${fixture.id} place ${c}.${i + 1}`,
            ruleKeys: [],
          })),
        });
      }),
      chapter_text: Array.from({ length: n }, () => (req) => chunks[idx(req) - 1].join('\n\n')),
    },
  });
}

/** Adapts the bench's OpenAI-compatible client to the planner's NarrativeModel. */
class ClientNarrativeModel {
  constructor(client) {
    this.provider = client instanceof CliClient ? 'cli' : 'openai-compatible';
    this.client = client;
  }
  async generate(req) {
    const { text, receipt } = await this.client.complete({ system: '', user: req.prompt }, { stage: req.stage, maxTokens: req.maxTokens });
    return { text, usage: { inputTokens: receipt.inputTokens, outputTokens: receipt.outputTokens }, model: receipt.model, latencyMs: receipt.latencyMs };
  }
}

// ── Dry-run extractor: evidence from a word-overlap heuristic ────────────────

const words = (s) => new Set(s.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? []);
const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** Plan-following evidence in the diagnostics schema, without a model. */
export function heuristicPlanEvidence(text, planBullets) {
  const paras = text.replace(/\r\n?/g, '\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return {
    bullets: planBullets.map((b, i) => {
      const exact = paras.findIndex((p) => norm(p).includes(norm(b)));
      if (exact >= 0) return { id: `b${i + 1}`, bullet: i + 1, status: 'realized', paragraph: exact + 1, text: b };
      const want = words(b);
      let best = { p: -1, overlap: 0 };
      paras.forEach((p, j) => {
        const have = words(p);
        const overlap = want.size ? [...want].filter((w) => have.has(w)).length / want.size : 0;
        if (overlap > best.overlap) best = { p: j, overlap };
      });
      if (best.overlap >= 0.6) return { id: `b${i + 1}`, bullet: i + 1, status: 'partial', paragraph: best.p + 1, text: '' };
      return { id: `b${i + 1}`, bullet: i + 1, status: 'missing', paragraph: null, text: '' };
    }),
  };
}

// ── Continuity between chapters ──────────────────────────────────────────────

/** Turns planned scenes into ledger and timeline facts and checks them. */
export class ChapterContinuity {
  constructor(C) {
    this.C = C;
    this.tick = 0;
    this.stateEvents = [];
    this.timelineEvents = [];
    this.constraints = [];
    this.checks = [];
  }
  addChapter(chapterIndex, scenes) {
    for (const s of scenes) {
      this.tick += 1;
      const ref = `ch-${chapterIndex}/s${s.index}`;
      for (const name of s.characters) this.stateEvents.push({ characterId: name, sceneRef: ref, at: this.tick, changes: { location: s.location } });
      const prev = this.timelineEvents.at(-1);
      this.timelineEvents.push({ id: ref, sceneRef: ref, at: this.tick });
      if (prev) this.constraints.push({ a: prev.id, relation: 'before', b: ref, sceneRef: ref });
    }
    const findings = [...this.C.detectImpossibleTransitions(this.stateEvents), ...this.C.checkTimeline(this.timelineEvents, this.constraints)];
    const check = {
      afterChapterPlan: chapterIndex,
      scenesChecked: this.timelineEvents.length,
      errors: findings.filter((f) => f.severity === 'error').length,
      warnings: findings.filter((f) => f.severity === 'warning').length,
      codes: [...new Set(findings.map((f) => f.code))].sort(),
    };
    this.checks.push(check);
    return check;
  }
}

function toBenchReceipt(r) {
  return {
    stage: `plan:${r.stage}:${r.unit}`,
    model: r.model,
    latencyMs: r.latencyMs,
    inputTokens: r.inputTokens,
    outputTokens: r.outputTokens,
    tokensSource: r.provider === 'mock' ? 'mock-usage' : 'planner-reported',
    usdEstimate: typeof r.usdEstimate === 'number' ? r.usdEstimate : null,
    priceSource: typeof r.usdEstimate === 'number' ? r.pricingSource : null,
  };
}

function plannerPricing(cfg) {
  const p = cfg?.pricing;
  if (!p || typeof p.inputPerMTok !== 'number' || typeof p.outputPerMTok !== 'number' || !cfg.model) return undefined;
  return { [cfg.model]: { kind: 'tokens', usdPerMillionInput: p.inputPerMTok, usdPerMillionOutput: p.outputPerMTok, source: p.source ?? 'config' } };
}

export class HybridArcaneaSystem {
  constructor(cfg, deps = {}) {
    if (!cfg.planner || !cfg.extractor) throw new Error(`hybrid-arcanea system ${cfg.id}: planner and extractor are required`);
    const n = cfg.chapters ?? 3;
    if (!Number.isInteger(n) || n < 1 || n > 20) throw new Error(`hybrid-arcanea system ${cfg.id}: chapters must be an integer in [1, 20]`);
    if (!['mock', 'workers-ai'].includes(cfg.extractor.type)) throw new Error(`hybrid-arcanea system ${cfg.id}: unknown extractor type ${cfg.extractor.type}`);
    this.id = cfg.id;
    this.cfg = { ...cfg, chapters: n };
    this.unsafeModel = !!cfg.planner.unsafeModel;
    this.markers = [cfg.id, cfg.planner.model].filter(Boolean);
    const plannerId = cfg.planner.id ?? cfg.planner.model ?? cfg.planner.command;
    if (cfg.planner.type === 'mock') this.client = null;
    else if (cfg.planner.type === 'cli') this.client = new CliClient({ ...cfg.planner, id: plannerId }, deps);
    else this.client = new OpenAICompatibleClient({ ...cfg.planner, id: plannerId }, deps);
    Object.defineProperty(this, 'env', { value: deps.env ?? process.env, enumerable: false });
  }

  async generate(fixture, { buildWritingPrompt }) {
    const { planner: P, continuity: C, diagnostics: D } = await loadArcaneaPackages();
    const n = this.cfg.chapters;
    const stages = [];
    const model = this.client ? new ClientNarrativeModel(this.client) : mockPlanner(P, fixture, n);
    const continuity = new ChapterContinuity(C);
    const abort = new AbortController();
    const writing = buildWritingPrompt(fixture);

    let done = null;
    let stopped = null;
    let breaking = null;
    const canonFlags = [];
    for await (const ev of P.runStory({
      jobId: `bench-${fixture.id}`,
      premise: `${writing.user}`,
      chapterCount: n,
      model,
      store: new P.MemoryCheckpointStore(),
      canonGate: new P.StructuralCanonGate(),
      pricing: plannerPricing(this.cfg.planner),
      signal: abort.signal,
      onReceipt: (r) => {
        stages.push(toBenchReceipt(r));
      },
    })) {
      if (ev.type === 'canon_review') canonFlags.push(...ev.review.findings.map((f) => f.code));
      if (ev.type === 'stage_complete' && ev.stage === 'scene_breakdown') {
        const check = continuity.addChapter(ev.result.data.chapterIndex, ev.result.data.scenes);
        if (check.errors && this.cfg.continuity?.stopOnError) {
          breaking = check;
          abort.abort();
        }
      }
      if (ev.type === 'error') stopped = `${ev.code}: ${ev.message}`;
      if (ev.type === 'aborted') stopped = breaking ? `aborted after continuity errors (${breaking.codes.join(', ')})` : 'aborted';
      if (ev.type === 'done') done = ev;
    }
    if (!done) throw new Error(`hybrid-arcanea planner stopped: ${stopped ?? 'no done event'}`);

    const byStage = (s) => done.results.filter((r) => r.stage === s);
    const chapterPlan = byStage('chapters_plan')[0].data.chapters;
    const textByIndex = new Map(byStage('chapter_text').map((r) => [r.data.chapterIndex, r.data.text]));
    const chapters = chapterPlan.map((ch) => ({ chapter: ch.index, text: textByIndex.get(ch.index) ?? '', planBullets: ch.summary }));

    const inner = this.cfg.extractor.type === 'mock'
      ? new D.MockExtractor(chapters.map((ch) => heuristicPlanEvidence(ch.text, ch.planBullets)))
      : D.WorkersAiExtractor.fromEnv(this.env, this.cfg.extractor.model ? { model: this.cfg.extractor.model } : {});
    const extractorPricing = this.cfg.extractor.pricing ?? null;
    const extractor = {
      name: inner.name,
      async run(req) {
        const t0 = Date.now();
        const out = await inner.run(req);
        stages.push(stageReceipt({ stage: 'diagnose:plan_following', model: `extractor:${inner.name}`, latencyMs: Date.now() - t0, usage: null, promptText: req.system + req.user, outputText: out, pricing: extractorPricing }));
        return out;
      },
    };
    const plan = await D.runPlanFollowing(extractor, chapters);

    return {
      text: chapters.map((c) => c.text).join('\n\n'),
      plan: chapterPlan.map((c) => `${c.index}. ${c.name}: ${c.summary.join(' ')}`).join('\n'),
      stages,
      continuity: {
        checks: continuity.checks,
        errors: continuity.checks.reduce((a, c) => Math.max(a, c.errors), 0),
        canonFlags: [...new Set(canonFlags)].sort(),
      },
      diagnostics: {
        planFollowing: {
          extractor: inner.name,
          pass: plan.pass,
          failedGate: plan.failedGate,
          curve: plan.curve.map((c) => ({ chapter: c.chapter, percent: Math.round(c.percent), realized: c.realized, partial: c.partial, missing: c.missing, contradicted: c.contradicted })),
          attempts: plan.attempts,
        },
      },
    };
  }
}
