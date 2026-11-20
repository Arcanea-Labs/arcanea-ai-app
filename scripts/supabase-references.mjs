#!/usr/bin/env node
// Finds app code that queries a table, view, RPC or storage bucket that does
// not exist in production. TypeScript cannot catch this while the Supabase
// clients are typed `any`, which is how billing, chat snapshots and
// generation jobs shipped against missing tables in October 2026.
//
//   node scripts/supabase-references.mjs           fail on new missing references
//   node scripts/supabase-references.mjs --list    print every missing reference
//   node scripts/supabase-references.mjs --baseline  rewrite the allow-list
//
// Production objects: supabase/production-objects.json (refresh it whenever
// a migration is applied). Already-known gaps: supabase/known-missing-references.json.

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN = ['apps/web/app', 'apps/web/lib', 'apps/web/components', 'apps/web/hooks'];
const SKIP_DIR = new Set(['node_modules', '.next', '__tests__', '__mocks__']);
const OBJECTS = join(ROOT, 'supabase', 'production-objects.json');
const BASELINE = join(ROOT, 'supabase', 'known-missing-references.json');
const args = new Set(process.argv.slice(2));

const prod = JSON.parse(readFileSync(OBJECTS, 'utf8'));
const relations = new Set(prod.relations);
const functions = new Set(prod.functions);
const buckets = new Set(prod.buckets);

function* sourceFiles(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (SKIP_DIR.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* sourceFiles(full);
    else if (/\.(ts|tsx|js|mjs)$/.test(name) && !/\.(test|spec)\./.test(name)) yield full;
  }
}

// `.from('x')` is a table unless the chain is a storage call; look back far
// enough to cover `supabase.storage\n    .from(`.
const FROM = /\.from\(\s*['"`]([a-z0-9_\-]+)['"`]\s*\)/gi;
const RPC = /\.rpc\(\s*['"`]([a-z0-9_]+)['"`]/gi;

const missing = new Map(); // "kind:name" -> Set(file)
const note = (key, file) => {
  if (!missing.has(key)) missing.set(key, new Set());
  missing.get(key).add(relative(ROOT, file).split(sep).join('/'));
};

for (const base of SCAN) {
  for (const file of sourceFiles(join(ROOT, base))) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(FROM)) {
      const isStorage = /storage\s*(\?\.)?\s*$/.test(text.slice(Math.max(0, m.index - 40), m.index));
      const name = m[1];
      if (isStorage ? !buckets.has(name) : !relations.has(name)) {
        note(`${isStorage ? 'bucket' : 'table'}:${name}`, file);
      }
    }
    for (const m of text.matchAll(RPC)) {
      if (!functions.has(m[1])) note(`rpc:${m[1]}`, file);
    }
  }
}

const found = [...missing.keys()].sort();

if (args.has('--baseline')) {
  writeFileSync(BASELINE, JSON.stringify({ note: 'Known references to objects production lacks. Shrink this list; never grow it to make CI pass without a decision.', references: found }, null, 2) + '\n');
  console.log(`baseline written: ${found.length} known missing references`);
  process.exit(0);
}

if (args.has('--list')) {
  for (const key of found) console.log(`${key}  <-  ${[...missing.get(key)].join(', ')}`);
}

let known = new Set();
try {
  known = new Set(JSON.parse(readFileSync(BASELINE, 'utf8')).references);
} catch {
  // No baseline yet: every missing reference counts as new.
}
const fresh = found.filter((k) => !known.has(k));
const fixed = [...known].filter((k) => !missing.has(k));

console.log(`missing in production: ${found.length} (known ${found.length - fresh.length}, new ${fresh.length})`);
for (const key of fresh) console.log(`  NEW ${key}  <-  ${[...missing.get(key)].join(', ')}`);
if (fixed.length) console.log(`no longer missing, remove from baseline: ${fixed.join(', ')}`);
process.exit(fresh.length ? 1 : 0);
