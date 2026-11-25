// Lexical diversity and repetition.
import { words, ngrams, sentences, paragraphs } from '../lib/text.mjs';

/** distinct-n = unique n-grams / total n-grams (Li et al. 2016 style). */
export function distinctN(tokens, n) {
  const g = ngrams(tokens, n);
  return g.length ? new Set(g).size / g.length : null;
}

/** Share of 4-gram positions whose 4-gram occurs more than once. */
export function repeatedNgramRate(tokens, n = 4) {
  const g = ngrams(tokens, n);
  if (!g.length) return null;
  const counts = new Map();
  for (const x of g) counts.set(x, (counts.get(x) ?? 0) + 1);
  let repeated = 0;
  for (const x of g) if (counts.get(x) > 1) repeated++;
  return repeated / g.length;
}

function duplicateRate(units) {
  const norm = units.map((u) => u.toLowerCase().replace(/\s+/g, ' ').trim()).filter((u) => u.length > 20);
  if (!norm.length) return 0;
  const seen = new Set();
  let dup = 0;
  for (const u of norm) {
    if (seen.has(u)) dup++;
    else seen.add(u);
  }
  return dup / norm.length;
}

/**
 * Longest run of consecutive identical sentences; a cheap detector for the
 * "repetition spiral" failure Pageshift reports on long generations.
 */
export function longestSentenceLoop(text) {
  const s = sentences(text).map((x) => x.toLowerCase());
  let best = s.length ? 1 : 0;
  let run = 1;
  for (let i = 1; i < s.length; i++) {
    run = s[i] === s[i - 1] ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

export function scoreDiversity(text) {
  const t = words(text);
  return {
    tokens: t.length,
    distinct1: distinctN(t, 1),
    distinct2: distinctN(t, 2),
    distinct3: distinctN(t, 3),
    repeated4gramRate: repeatedNgramRate(t, 4),
    duplicateSentenceRate: duplicateRate(sentences(text)),
    duplicateParagraphRate: duplicateRate(paragraphs(text)),
    longestSentenceLoop: longestSentenceLoop(text),
  };
}
