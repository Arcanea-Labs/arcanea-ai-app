#!/usr/bin/env node
// Compares supabase/migrations (what the repo would apply) with
// supabase/production-history (what production has applied, mirrored from
// supabase_migrations.schema_migrations).
//
//   node scripts/supabase-drift.mjs             offline report
//   node scripts/supabase-drift.mjs --json      machine-readable report
//   node scripts/supabase-drift.mjs --refresh   re-mirror production first
//                                               (needs SUPABASE_ACCESS_TOKEN, a
//                                               scoped PAT with database read)
//
// Exit code 1 only when a repo migration is newer than production's latest
// and still unapplied, the "merged but never deployed" case that left chat
// snapshots, generation jobs and creation-engine assets missing in October
// 2026. Older repo-only files need the object check in drift-report.json:
// the billing kernel predates production's head and was never applied either.

import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS = join(ROOT, 'supabase', 'migrations');
const HISTORY = join(ROOT, 'supabase', 'production-history');
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'hcfhyssdzphudaqatxbk';
const args = new Set(process.argv.slice(2));

const versionsIn = (dir) =>
  new Map(
    readdirSync(dir)
      .filter((f) => /^\d{14}_.+\.sql$/.test(f))
      .map((f) => [f.slice(0, 14), f]),
  );

async function refreshHistory() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error('--refresh needs SUPABASE_ACCESS_TOKEN');
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query/read-only`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query:
          "select version, name, array_to_string(statements, E';\\n') as sql from supabase_migrations.schema_migrations order by version",
      }),
    },
  );
  if (!res.ok) throw new Error(`Management API ${res.status}: ${await res.text()}`);
  const rows = await res.json();
  mkdirSync(HISTORY, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  for (const { version, name, sql } of rows) {
    const header =
      `-- Production migration ${version}_${name} on Supabase project ${PROJECT_REF}.\n` +
      `-- Mirrored verbatim from supabase_migrations.schema_migrations on ${today}. Read-only record; do not edit.\n\n`;
    writeFileSync(join(HISTORY, `${version}_${name}.sql`), header + sql.trimEnd() + '\n');
  }
  return rows.length;
}

if (args.has('--refresh')) {
  const n = await refreshHistory();
  if (!args.has('--json')) console.log(`mirrored ${n} production migrations`);
}

const repo = versionsIn(MIGRATIONS);
const prod = versionsIn(HISTORY);
const latestProd = [...prod.keys()].sort().at(-1) ?? '0';

const repoOnly = [...repo.keys()].filter((v) => !prod.has(v)).sort();
const report = {
  project: PROJECT_REF,
  production: prod.size,
  repo: repo.size,
  shared: [...repo.keys()].filter((v) => prod.has(v)).length,
  productionOnly: [...prod.keys()].filter((v) => !repo.has(v)).sort().map((v) => prod.get(v)),
  // Older than production's head: usually the same change applied under a
  // different timestamp, sometimes never applied. Check drift-report.json.
  repoOnlyBehindHead: repoOnly.filter((v) => v <= latestProd).map((v) => repo.get(v)),
  pending: repoOnly.filter((v) => v > latestProd).map((v) => repo.get(v)),
};

if (args.has('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`production ${report.production} | repo ${report.repo} | shared ${report.shared}`);
  console.log(`production-only (missing from repo): ${report.productionOnly.length}`);
  console.log(`repo-only, older than production head: ${report.repoOnlyBehindHead.length}`);
  console.log(`pending (newer than production head, unapplied): ${report.pending.length}`);
  for (const f of report.pending) console.log(`  ${f}`);
}

process.exit(report.pending.length > 0 ? 1 : 0);
