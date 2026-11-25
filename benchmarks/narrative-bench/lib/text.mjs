// Plain text helpers shared by the scorers. Deterministic, no I/O.

/** Lowercased word tokens (letters, digits, apostrophes; Unicode-aware). */
export function words(text) {
  return String(text ?? '').toLowerCase().match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu) ?? [];
}

/** Rough sentence split on terminal punctuation followed by whitespace. */
export function sentences(text) {
  return String(text ?? '')
    .split(/(?<=[.!?])["”’)]*\s+/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Non-empty paragraphs separated by blank lines. */
export function paragraphs(text) {
  return String(text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function wordCount(text) {
  return words(text).length;
}

export function ngrams(tokens, n) {
  const out = [];
  for (let i = 0; i + n <= tokens.length; i++) out.push(tokens.slice(i, i + n).join(' '));
  return out;
}

export function round(value, places = 3) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const f = 10 ** places;
  return Math.round(value * f) / f;
}

export function mean(values) {
  const v = values.filter((x) => typeof x === 'number' && !Number.isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export function median(values) {
  const v = values.filter((x) => typeof x === 'number' && !Number.isNaN(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/** Levenshtein distance, small strings only (names). */
export function editDistance(a, b) {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  const prev = Array.from({ length: t.length + 1 }, (_, i) => i);
  for (let i = 1; i <= s.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= t.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (s[i - 1] === t[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[t.length];
}

/** Seeded PRNG (mulberry32) so mocks are reproducible. */
export function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a 32-bit hash of a string, for seeding. */
export function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
