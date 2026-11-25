// Bridge to the existing TASTE evaluators in packages/publishing-house/quality.
//
// Those evaluators are TypeScript and are only importable after
// `pnpm --filter @arcanea/publishing-house build`. We import the compiled
// output when it exists instead of copying the slop/cliche patterns here, so
// there is one source of truth. When it is missing we say so; we never
// substitute a home-grown approximation.
import { existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const TASTE_DIST = join(REPO, 'packages', 'publishing-house', 'dist', 'quality', 'evaluators');

let cached;

export async function loadTasteEvaluators(dir = TASTE_DIST) {
  if (cached && cached.dir === dir) return cached.value;
  const uniq = join(dir, 'uniqueness.js');
  const impact = join(dir, 'impact.js');
  let value;
  if (!existsSync(uniq) || !existsSync(impact)) {
    value = { available: false, reason: `publishing-house not built (${relative(REPO, uniq)} missing)` };
  } else {
    try {
      const [u, i] = await Promise.all([import(pathToFileURL(uniq).href), import(pathToFileURL(impact).href)]);
      value = { available: true, evaluateUniqueness: u.evaluateUniqueness, evaluateImpact: i.evaluateImpact };
    } catch (e) {
      value = { available: false, reason: `import failed: ${e.message}` };
    }
  }
  cached = { dir, value };
  return value;
}

export async function scoreTaste(text, opts = {}) {
  const ev = await loadTasteEvaluators(opts.dir);
  if (!ev.available) return { available: false, reason: ev.reason };
  const u = ev.evaluateUniqueness(text);
  const i = ev.evaluateImpact(text);
  return {
    available: true,
    uniqueness: u.score,
    slopPatterns: u.slopPatternsFound.reduce((s, p) => s + p.count, 0),
    impact: i.score,
  };
}
