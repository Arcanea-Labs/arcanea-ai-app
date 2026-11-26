#!/usr/bin/env node
// Arcanea Narrative Benchmark v0 runner.
//
//   node runner.mjs --dry-run                         offline: mock systems + mock judges
//   node runner.mjs --systems systems.json            real run (needs endpoints and env)
//   options: --fixtures a,b  --only-systems x,y  --limit N  --run-id ID  --out DIR
//            --no-judge  --no-taste  --overwrite
//
// Writes <out>/<runId>/{run.json, results.jsonl, receipts.jsonl, summary.md}.
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFixtures, buildWritingPrompt, FIXTURE_DIR } from './lib/fixtures.mjs';
import { scoreDeterministic, crossStoryContinuity } from './scorers/deterministic.mjs';
import { JudgePanel, blindId, newSalt, redactSystemMarkers, RUBRIC } from './scorers/judge.mjs';
import { mockPanelJudges } from './scorers/mock-judge.mjs';
import { workersAiJudgesFromEnv } from './scorers/workers-ai-judge.mjs';
import { createSystem, DRY_RUN_SYSTEMS } from './systems/index.mjs';
import { totalReceipt } from './lib/receipts.mjs';
import { safetyClassifierFromConfig, WITHHELD } from './lib/safety.mjs';
import { mean, median, round, prng, hash32 } from './lib/text.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

export function parseArgs(argv) {
  const a = { dryRun: false, judge: true, taste: true, overwrite: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${k} needs a value`);
      return v;
    };
    if (k === '--dry-run') a.dryRun = true;
    else if (k === '--no-judge') a.judge = false;
    else if (k === '--no-taste') a.taste = false;
    else if (k === '--overwrite') a.overwrite = true;
    else if (k === '--systems') a.systems = next();
    else if (k === '--fixtures') a.fixtures = next().split(',');
    else if (k === '--only-systems') a.onlySystems = next().split(',');
    else if (k === '--limit') a.limit = Number(next());
    else if (k === '--run-id') a.runId = next();
    else if (k === '--out') a.out = next();
    else if (k === '--help' || k === '-h') a.help = true;
    else throw new Error(`unknown argument ${k}`);
  }
  return a;
}

function shuffled(list, seed) {
  const r = prng(hash32(seed));
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Core loop, importable for tests. `systems` are instances (see systems/).
 * Returns rows and receipts; writing files is left to writeRun().
 */
export async function runBenchmark({ runId, fixtures, systems, panel = null, salt = newSalt(), safetyClassifier = null, taste = true, log = () => {} }) {
  for (const s of systems) {
    if (s.unsafeModel && !safetyClassifier)
      throw new Error(`system ${s.id} is marked unsafeModel (no safety training) and no safetyClassifier is configured; refusing to run it`);
  }
  const rows = [];
  const receipts = [];
  for (const sys of systems) {
    for (const fx of fixtures) {
      const blind = blindId(salt, sys.id, fx.id);
      const row = { runId, systemId: sys.id, fixtureId: fx.id, blindId: blind, ok: false };
      log(`generate ${sys.id} x ${fx.id}`);
      try {
        const out = await sys.generate(fx, { buildWritingPrompt });
        for (const st of out.stages) receipts.push({ runId, kind: 'system', systemId: sys.id, fixtureId: fx.id, blindId: blind, ...st });
        row.receipt = totalReceipt(out.stages);
        let text = out.text;
        if (sys.unsafeModel) {
          const verdict = await safetyClassifier.classify(text);
          row.safety = { classifier: safetyClassifier.id, safe: verdict.safe, label: verdict.label };
        }
        row.deterministic = await scoreDeterministic(text, fx, { taste });
        row.ok = true;
        if (row.safety && !row.safety.safe) {
          row.text = WITHHELD;
          row.withheld = true;
        } else {
          row.text = text;
          if (out.plan) row.plan = out.plan;
        }
        row._judgeText = row.withheld ? null : redactSystemMarkers(text, sys.markers);
      } catch (e) {
        row.error = String(e.message ?? e);
      }
      rows.push(row);
    }
  }

  if (panel) {
    // Judge in a salted shuffled order so calls are not grouped by system.
    for (const row of shuffled(rows, salt)) {
      if (!row.ok || row._judgeText === null) continue;
      const fx = fixtures.find((f) => f.id === row.fixtureId);
      log(`judge ${row.blindId}`);
      row.judge = await panel.judge({ blind: row.blindId, fixture: fx, text: row._judgeText });
      for (const j of row.judge.judges) {
        receipts.push({
          runId,
          kind: 'judge',
          blindId: row.blindId,
          judge: j.judge,
          ok: j.ok,
          latencyMs: j.latencyMs,
          inputTokens: j.usage?.inputTokens ?? null,
          outputTokens: j.usage?.outputTokens ?? null,
          // Judge prices are not configured, mocks included: unknown is null, never 0.
          usdEstimate: null,
          priceSource: null,
        });
      }
    }
  }
  for (const r of rows) delete r._judgeText;
  return { rows, receipts, salt };
}

const fmt = (v, p = 3) => (v === null || v === undefined ? '—' : String(round(v, p)));
const pct = (v) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`);

export function renderSummary({ runId, meta, rows, receipts, fixtures }) {
  const systems = [...new Set(rows.map((r) => r.systemId))];
  const byId = new Map(fixtures.map((f) => [f.id, f]));
  const L = [];
  L.push(`# Narrative Bench v0 — run \`${runId}\``, '');
  L.push(`- Created: ${meta.createdAt}`);
  L.push(`- Mode: ${meta.dryRun ? '**dry run** (mock systems, mock judges; numbers below test the pipeline, not any model)' : 'live'}`);
  L.push(`- Fixtures: ${fixtures.length} · Systems: ${systems.join(', ')}`);
  L.push(`- Judges: ${meta.judges.length ? meta.judges.join(', ') : 'none (--no-judge)'} · Rubric: ${RUBRIC.version}`);
  L.push(`- TASTE bridge: ${meta.taste}`, '');

  L.push('## Deterministic scores', '');
  L.push('| System | OK | Facts held | Probes pass / contra / silent | Length in tol | distinct-2 | rep. 4-gram | max loop | alias drift | unknown names | cast cov. |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const s of systems) {
    const all = rows.filter((r) => r.systemId === s);
    const ok = all.filter((r) => r.ok);
    const d = ok.map((r) => r.deterministic);
    const sum = (f) => d.reduce((a, x) => a + f(x), 0);
    const held = sum((x) => x.mustHold.total - x.mustHold.violated);
    const facts = sum((x) => x.mustHold.total);
    L.push(
      `| ${s} | ${ok.length}/${all.length} | ${held}/${facts} | ${sum((x) => x.probes.pass)} / ${sum((x) => x.probes.contradicted)} / ${sum((x) => x.probes.notEvidenced)} | ${sum((x) => (x.length.within ? 1 : 0))}/${ok.length} | ${fmt(mean(d.map((x) => x.diversity.distinct2)))} | ${fmt(mean(d.map((x) => x.diversity.repeated4gramRate)))} | ${d.length ? Math.max(...d.map((x) => x.diversity.longestSentenceLoop)) : '—'} | ${sum((x) => x.drift.aliasDrift.length)} | ${sum((x) => x.drift.unknownNames.length)} | ${pct(mean(d.map((x) => x.drift.castCoverage)))} |`
    );
  }
  L.push('');

  const cross = crossStoryContinuity(rows, byId);
  if (cross.length) {
    L.push('## Cross-story continuity (shared micro-world)', '');
    L.push('| System | Group | World facts held in every story |', '|---|---|---|');
    for (const c of cross) L.push(`| ${c.systemId} | ${c.group} | ${c.heldAcrossAll}/${c.worldFacts} |`);
    L.push('');
  }

  const judged = rows.filter((r) => r.judge);
  if (judged.length) {
    L.push('## Judge panel (per judge, never pooled)', '');
    L.push('| System | Judge | Items | Errors | Literary mean | Originality mean | accept / revise / reject |', '|---|---|---|---|---|---|---|');
    for (const s of systems) {
      const jr = judged.filter((r) => r.systemId === s);
      const ids = [...new Set(jr.flatMap((r) => r.judge.judges.map((j) => j.judge)))];
      for (const id of ids) {
        const js = jr.map((r) => r.judge.judges.find((j) => j.judge === id)).filter(Boolean);
        const ok = js.filter((j) => j.ok);
        const v = (x) => ok.filter((j) => j.editorial.verdict === x).length;
        L.push(`| ${s} | ${id} | ${js.length} | ${js.length - ok.length} | ${fmt(mean(ok.map((j) => j.literaryQuality)), 2)} | ${fmt(mean(ok.map((j) => j.originality)), 2)} | ${v('accept')} / ${v('revise')} / ${v('reject')} |`);
      }
    }
    L.push('');
    L.push('Panel disagreement (spread ≥ threshold on a 1-10 score, or differing editorial verdicts):', '');
    for (const s of systems) {
      const jr = judged.filter((r) => r.systemId === s);
      const flagged = jr.filter((r) => r.judge.disagreement.disagree).length;
      const incomplete = jr.filter((r) => !r.judge.complete).length;
      L.push(`- ${s}: ${flagged}/${jr.length} items flagged; ${incomplete} items with a failed judge`);
    }
    L.push('');
  }

  L.push('## Latency and cost', '');
  L.push('| System | p50 latency (ms) | input tok | output tok | token source | USD |', '|---|---|---|---|---|---|');
  for (const s of systems) {
    const rs = receipts.filter((r) => r.kind === 'system' && r.systemId === s);
    const perItem = rows.filter((r) => r.systemId === s && r.receipt).map((r) => r.receipt);
    const usdKnown = perItem.length > 0 && perItem.every((r) => typeof r.usdEstimate === 'number');
    const srcs = [...new Set(rs.map((r) => r.tokensSource))].join(', ') || '—';
    L.push(`| ${s} | ${fmt(median(perItem.map((r) => r.latencyMs)), 0)} | ${perItem.reduce((a, r) => a + r.inputTokens, 0)} | ${perItem.reduce((a, r) => a + r.outputTokens, 0)} | ${srcs} | ${usdKnown ? '$' + perItem.reduce((a, r) => a + r.usdEstimate, 0).toFixed(4) : 'unknown'} |`);
  }
  L.push('');
  const failed = rows.filter((r) => !r.ok);
  if (failed.length) {
    L.push('## Errors', '');
    for (const r of failed) L.push(`- ${r.systemId} × ${r.fixtureId}: ${r.error}`);
    L.push('');
  }
  const withheld = rows.filter((r) => r.withheld).length;
  if (withheld) L.push(`${withheld} output(s) withheld by the safety classifier and not judged.`, '');
  return L.join('\n');
}

export function writeRun({ dir, runId, meta, rows, receipts, fixtures, overwrite = false }) {
  mkdirSync(dir, { recursive: true });
  const resultsPath = join(dir, 'results.jsonl');
  if (existsSync(resultsPath) && !overwrite) throw new Error(`${resultsPath} exists; pass --overwrite or a new --run-id`);
  writeFileSync(join(dir, 'run.json'), JSON.stringify(meta, null, 2) + '\n');
  writeFileSync(resultsPath, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  writeFileSync(join(dir, 'receipts.jsonl'), receipts.map((r) => JSON.stringify(r)).join('\n') + '\n');
  writeFileSync(join(dir, 'summary.md'), renderSummary({ runId, meta, rows, receipts, fixtures }) + '\n');
  return { dir, files: ['run.json', 'results.jsonl', 'receipts.jsonl', 'summary.md'] };
}

export async function main(argv = process.argv.slice(2), { env = process.env, log = (m) => process.stderr.write(m + '\n') } = {}) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 9).join('\n') + '\n');
    return null;
  }
  let fixtures = loadFixtures(FIXTURE_DIR, { only: args.fixtures });
  if (args.limit) fixtures = fixtures.slice(0, args.limit);

  let cfg;
  if (args.dryRun) cfg = { systems: DRY_RUN_SYSTEMS };
  else {
    if (!args.systems) throw new Error('--systems <config.json> is required unless --dry-run');
    cfg = JSON.parse(readFileSync(resolve(args.systems), 'utf8'));
  }
  let sysCfgs = cfg.systems;
  if (args.onlySystems) sysCfgs = sysCfgs.filter((s) => args.onlySystems.includes(s.id));
  const systems = sysCfgs.map((c) => createSystem(c, { env }));

  let judges = [];
  if (args.judge) judges = args.dryRun ? mockPanelJudges() : workersAiJudgesFromEnv({ ...env, ...(cfg.judges?.models ? { NARRATIVE_BENCH_JUDGE_MODELS: env.NARRATIVE_BENCH_JUDGE_MODELS || cfg.judges.models.join(',') } : {}) });
  const panel = judges.length ? new JudgePanel(judges, { spreadThreshold: cfg.judges?.spreadThreshold ?? 3 }) : null;
  const safetyClassifier = safetyClassifierFromConfig(cfg.safetyClassifier, env);

  const runId = args.runId ?? (args.dryRun ? 'dry-run-' : 'run-') + new Date().toISOString().replace(/[:.]/g, '-');
  const salt = args.dryRun ? 'narrative-bench-dry-run' : newSalt();
  const { rows, receipts } = await runBenchmark({ runId, fixtures, systems, panel, salt, safetyClassifier, taste: args.taste, log });
  const tasteRow = rows.find((r) => r.ok)?.deterministic?.taste;
  const meta = {
    runId,
    createdAt: new Date().toISOString(),
    dryRun: args.dryRun,
    fixtures: fixtures.map((f) => f.id),
    systems: sysCfgs,
    judges: judges.map((j) => j.id),
    rubric: RUBRIC.version,
    blindSalt: salt,
    safetyClassifier: safetyClassifier?.id ?? null,
    taste: tasteRow ? (tasteRow.available ? 'available' : `unavailable: ${tasteRow.reason}`) : 'n/a',
  };
  const dir = join(args.out ? resolve(args.out) : join(HERE, 'results'), runId);
  const written = writeRun({ dir, runId, meta, rows, receipts, fixtures, overwrite: args.overwrite });
  log(`wrote ${written.files.map((f) => join(dir, f)).join(', ')}`);
  return { dir, rows, receipts, meta };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    process.stderr.write(`narrative-bench: ${e.message}\n`);
    process.exit(1);
  });
}
