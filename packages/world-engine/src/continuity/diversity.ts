/**
 * Creative diversity metrics, all model-free.
 *
 * These measure sameness, not quality. A generator that keeps producing the
 * same phrases or the same arc shapes is detectable with arithmetic alone,
 * which means the check is cheap, deterministic and independent of whichever
 * model produced the text.
 */

import type { ArcPlan, PlanNode, UniversePlan } from "./plan.js";
import { walkPlan } from "./plan.js";

/** Lowercased word tokens; letters, digits and inner apostrophes. */
export function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? [];
}

function ngrams(tokens: readonly string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + n <= tokens.length; i++) out.push(tokens.slice(i, i + n).join(" "));
  return out;
}

/**
 * distinct-n = |unique n-grams| / |all n-grams|.
 *
 * Why this ratio: it is the standard cheap proxy for lexical variety (Li et
 * al., 2016). A value near 1 means almost every n-gram is fresh; repetitive,
 * looping prose drives it toward 0. Normalising by the total count keeps
 * texts of different lengths comparable at a coarse level, though longer
 * texts naturally score a little lower, so compare like with like.
 * Returns 0 when the text is shorter than n tokens (no evidence of variety).
 */
export function distinctN(text: string | readonly string[], n = 2): number {
  if (!Number.isInteger(n) || n < 1) throw new RangeError("n must be a positive integer");
  const docs = typeof text === "string" ? [text] : text;
  // n-grams are taken per document so they never span two chapters.
  const grams = docs.flatMap((d) => ngrams(tokenize(d), n));
  if (grams.length === 0) return 0;
  return new Set(grams).size / grams.length;
}

/**
 * Cosine distance = 1 - (a·b)/(|a||b|).
 *
 * Why cosine and not Euclidean: plan vectors describe the *shape* of an arc
 * (proportions of pacing, tension, tone). Two arcs with the same shape at
 * different intensities should read as similar, and cosine ignores magnitude.
 * Range is [0, 2] for arbitrary vectors, [0, 1] for non-negative ones.
 * A zero vector carries no shape information, so it is treated as maximally
 * distant (1) rather than as identical to everything.
 */
export function cosineDistance(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) throw new RangeError(`vector length mismatch: ${a.length} vs ${b.length}`);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 1;
  const cos = Math.max(-1, Math.min(1, dot / (Math.sqrt(na) * Math.sqrt(nb))));
  return 1 - cos;
}

/**
 * Jaccard distance = 1 - |A∩B| / |A∪B| over archetype sets.
 *
 * Why Jaccard: archetypes are labels without magnitude, so overlap of sets is
 * the honest comparison. Two empty sets have no evidence of difference: 0.
 */
export function jaccardDistance(a: Iterable<string>, b: Iterable<string>): number {
  const A = new Set([...a].map((s) => s.toLowerCase()));
  const B = new Set([...b].map((s) => s.toLowerCase()));
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return 1 - inter / (A.size + B.size - inter);
}

export interface NoveltyUnit {
  id: string;
  level: "arc" | "chapter";
  /** Distance to the nearest unit of the same level in the corpus (1 = nothing comparable). */
  nearestDistance: number;
  nearestId?: string;
}

export interface StructuralNovelty {
  /** Mean nearest-neighbour cosine distance over all vectored arcs and chapters. */
  embeddingNovelty: number;
  /** 1 - max archetype-set Jaccard similarity to any single corpus plan. */
  archetypeNovelty: number;
  /** Weighted blend; see `weightEmbedding`. */
  score: number;
  units: NoveltyUnit[];
  nearestPlanId?: string;
}

interface Vectored {
  id: string;
  level: "arc" | "chapter";
  vector: number[];
  planId: string;
}

function vectored(plan: PlanNode): Vectored[] {
  return walkPlan(plan)
    .filter((l) => (l.node.level === "arc" || l.node.level === "chapter") && Array.isArray(l.node.embedding_space))
    .map((l) => ({ id: l.path, level: l.node.level as "arc" | "chapter", vector: l.node.embedding_space!, planId: plan.id }));
}

function archetypesOf(plan: PlanNode): Set<string> {
  const out = new Set<string>();
  for (const { node } of walkPlan(plan)) for (const a of node.archetypes ?? []) out.add(a.toLowerCase());
  return out;
}

/**
 * Plan-level structural novelty against a corpus of prior plans.
 *
 * Why nearest-neighbour rather than mean distance: a new arc that is a near
 * copy of *one* earlier arc is a repeat even if it differs from all the
 * others. Taking the minimum distance per unit catches that; averaging over
 * the candidate's units then summarises how much of the plan is fresh.
 * Arcs are compared only with arcs and chapters with chapters, because their
 * vectors describe different scales of structure.
 * Archetypes use the most similar single corpus plan for the same reason.
 */
export function structuralNovelty(
  candidate: UniversePlan | ArcPlan | PlanNode,
  corpus: readonly PlanNode[],
  options: { weightEmbedding?: number } = {},
): StructuralNovelty {
  const w = options.weightEmbedding ?? 0.5;
  if (w < 0 || w > 1) throw new RangeError("weightEmbedding must be within [0, 1]");

  const prior = corpus.flatMap(vectored);
  const units: NoveltyUnit[] = vectored(candidate).map((u) => {
    let best: Vectored | undefined;
    let bestD = 1;
    for (const p of prior) {
      if (p.level !== u.level || p.vector.length !== u.vector.length) continue;
      const d = cosineDistance(u.vector, p.vector);
      if (!best || d < bestD) { best = p; bestD = d; }
    }
    return { id: u.id, level: u.level, nearestDistance: best ? bestD : 1, nearestId: best?.id };
  });
  const embeddingNovelty = units.length === 0 ? 1 : units.reduce((s, u) => s + u.nearestDistance, 0) / units.length;

  const mine = archetypesOf(candidate);
  let archetypeNovelty = 1;
  let nearestPlanId: string | undefined;
  for (const plan of corpus) {
    const d = jaccardDistance(mine, archetypesOf(plan));
    if (nearestPlanId === undefined || d < archetypeNovelty) {
      archetypeNovelty = d;
      nearestPlanId = plan.id;
    }
  }

  return {
    embeddingNovelty,
    archetypeNovelty,
    score: w * embeddingNovelty + (1 - w) * archetypeNovelty,
    units,
    nearestPlanId,
  };
}

/** Function words that make an n-gram meaningless as a "repeated phrase". */
const STOPWORDS = new Set([
  "a", "an", "and", "as", "at", "be", "but", "by", "for", "from", "had", "has", "have", "he", "her", "his",
  "i", "in", "into", "is", "it", "its", "of", "on", "or", "she", "so", "that", "the", "their", "them",
  "then", "they", "this", "to", "was", "we", "were", "with", "you",
]);

export interface RepeatedPhrase {
  phrase: string;
  /** Number of distinct chapters it occurs in. */
  spread: number;
  occurrences: number;
  chapters: string[];
}

/**
 * Phrases (word n-grams) that recur across chapters.
 *
 * Why count chapters, not raw occurrences: a phrase repeated inside one scene
 * can be deliberate rhetoric, but the same turn of phrase turning up chapter
 * after chapter is the classic signature of a generator's verbal tic.
 * Ranking by spread first, then occurrences, surfaces the tics before the
 * one-off echoes. All-stopword n-grams ("and then the") are ignored.
 */
export function detectRepetition(
  chapters: ReadonlyArray<{ id: string; text: string }>,
  options: { n?: number; minChapters?: number } = {},
): RepeatedPhrase[] {
  const n = options.n ?? 4;
  const minChapters = options.minChapters ?? 2;
  const where = new Map<string, { chapters: Set<string>; occurrences: number }>();
  for (const ch of chapters) {
    for (const g of ngrams(tokenize(ch.text), n)) {
      if (g.split(" ").every((t) => STOPWORDS.has(t))) continue;
      const entry = where.get(g) ?? { chapters: new Set<string>(), occurrences: 0 };
      entry.chapters.add(ch.id);
      entry.occurrences++;
      where.set(g, entry);
    }
  }
  return [...where]
    .filter(([, e]) => e.chapters.size >= minChapters)
    .map(([phrase, e]) => ({ phrase, spread: e.chapters.size, occurrences: e.occurrences, chapters: [...e.chapters] }))
    .sort((a, b) => b.spread - a.spread || b.occurrences - a.occurrences || a.phrase.localeCompare(b.phrase));
}
