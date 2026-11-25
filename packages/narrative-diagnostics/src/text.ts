import type { EvidenceItem, JsonSchema, PromptPair } from './types.js';

/** Default opening window used by most diagnostics (paragraphs 1-12). */
export const OPENING_WINDOW = 12;

/** Split prose into paragraphs on blank lines. Paragraph numbers are 1-indexed. */
export function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** Render paragraphs as `[P1] ...` lines, optionally cut to the first `limit`. */
export function numberParagraphs(text: string, limit?: number): string {
  const paras = splitParagraphs(text);
  const kept = limit === undefined ? paras : paras.slice(0, limit);
  return kept.map((p, i) => `[P${i + 1}] ${p}`).join('\n\n');
}

/** Keep the first occurrence of every id. */
export function dedupeById<T extends { id: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

export function inRange(p: number, lo: number, hi: number): boolean {
  return Number.isInteger(p) && p >= lo && p <= hi;
}

export function within<T extends EvidenceItem>(items: readonly T[], lo: number, hi: number): T[] {
  return items.filter((i) => inRange(i.paragraph, lo, hi));
}

export function nonEmpty(s: string | null | undefined): boolean {
  return typeof s === 'string' && s.trim().length > 0;
}

/**
 * Shared system prompt. The wording is ours. The model is told to extract,
 * never to grade: the verdict belongs to the deterministic scorer.
 */
export function systemPrompt(task: string, schema: JsonSchema): string {
  return [
    'You are an evidence extractor for a narrative analysis tool.',
    'Read the numbered text and record what is on the page. Do not grade the writing and do not decide whether it passes any test; a separate program does that from your output.',
    'Rules:',
    '- Paragraph numbers are the [P#] labels, starting at 1. Use them exactly.',
    '- Give every item a short id that is unique within your answer (for example "g1", "q2").',
    '- Only record what the text supports. Leave an array empty rather than guessing.',
    '- Quote or closely paraphrase the text in the "text" fields; keep them under 30 words.',
    '- Answer with a single JSON object and nothing else: no prose, no code fences.',
    '',
    `Task: ${task}`,
    '',
    'The JSON object must match this schema exactly (no extra keys):',
    JSON.stringify(schema),
  ].join('\n');
}

export function section(title: string, body: string | undefined): string {
  return `=== ${title} ===\n${body && body.trim() ? body : '(none provided)'}`;
}

export function prompt(task: string, schema: JsonSchema, sections: string[]): PromptPair {
  return { system: systemPrompt(task, schema), user: sections.join('\n\n') };
}
