// LLM-judge interface, rubric, blinding and panel aggregation.
//
// A judge client is anything with:
//   id: string                      stable label, e.g. "workers-ai:@cf/openai/gpt-oss-120b"
//   family: string                  model family, used to require a mixed panel
//   async complete({system, user}) -> { text, usage?: {inputTokens, outputTokens}, latencyMs? }
//
// Judges only ever see a blind id, the fixture brief and world, and the text.
import { createHash, randomBytes } from 'node:crypto';

export const RUBRIC = {
  version: 'narrative-bench-rubric-v0',
  literaryQuality:
    'Prose craft 1-10: sentence control, specificity of image, voice, scene construction, dialogue that does work. 1 = unreadable, 5 = competent and forgettable, 8 = would hold an editor, 10 = exceptional.',
  originality:
    'Originality 1-10 judged against what the brief makes obvious: does the piece make choices the brief did not require (situation, structure, image, turn) and avoid stock phrasing? 1 = stock, 5 = familiar but sound, 10 = surprising and earned.',
  editorial:
    'Editorial decision for an anthology that commissioned this brief: "accept" (publishable with copyedits), "revise" (worth a revision round; say what), "reject" (say why). Give 1-4 concrete reasons.',
};

export const VERDICTS = ['accept', 'revise', 'reject'];

/** Deterministic, unguessable-without-salt blind id for a (system, fixture) pair. */
export function blindId(salt, systemId, fixtureId) {
  return 'b-' + createHash('sha256').update(`${salt}\u0000${systemId}\u0000${fixtureId}`).digest('hex').slice(0, 12);
}

export function newSalt() {
  return randomBytes(16).toString('hex');
}

/**
 * Remove strings that would reveal the producing system (its id, model names,
 * vendor names) before a judge sees the text.
 */
export function redactSystemMarkers(text, markers = []) {
  let out = String(text);
  const all = [...new Set(markers.filter((m) => typeof m === 'string' && m.trim().length >= 3))].sort((a, b) => b.length - a.length);
  for (const m of all) {
    out = out.replace(new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'giu'), '[redacted]');
  }
  return out;
}

export function buildJudgePrompt({ blind, fixture, text }) {
  const system = [
    'You are a blind fiction editor. You do not know which writer or model produced the text and must not guess.',
    'Score strictly against the rubric. Return ONLY a JSON object, no prose before or after.',
    '',
    `Rubric (${RUBRIC.version}):`,
    `- literary_quality: ${RUBRIC.literaryQuality}`,
    `- originality: ${RUBRIC.originality}`,
    `- editorial: ${RUBRIC.editorial}`,
    '',
    'JSON shape: {"literary_quality": <int 1-10>, "originality": <int 1-10>, "editorial": {"verdict": "accept"|"revise"|"reject", "reasons": [<string>, ...]}}',
  ].join('\n');
  const user = [
    `Submission id: ${blind}`,
    `Brief: ${fixture.brief}`,
    `World rules: ${fixture.worldBible.join(' | ')}`,
    `Target length: about ${fixture.targetLength.words} words.`,
    '',
    '--- SUBMISSION START ---',
    text,
    '--- SUBMISSION END ---',
  ].join('\n');
  return { system, user };
}

function extractJson(raw) {
  const s = String(raw ?? '');
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(s);
  const body = fenced ? fenced[1] : s;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('no JSON object in judge response');
  return JSON.parse(body.slice(start, end + 1));
}

function int1to10(v, name) {
  const n = typeof v === 'string' ? Number(v) : v;
  if (!Number.isFinite(n) || n < 1 || n > 10) throw new Error(`${name} must be a number 1-10, got ${JSON.stringify(v)}`);
  return Math.round(n);
}

/** Strict parse; throws with a reason rather than guessing a score. */
export function parseJudgeResponse(raw) {
  const j = extractJson(raw);
  const verdict = String(j?.editorial?.verdict ?? '').toLowerCase().trim();
  if (!VERDICTS.includes(verdict)) throw new Error(`editorial.verdict must be one of ${VERDICTS.join('/')}, got ${JSON.stringify(j?.editorial?.verdict)}`);
  const reasons = Array.isArray(j.editorial.reasons) ? j.editorial.reasons.map(String).slice(0, 6) : [];
  return {
    literaryQuality: int1to10(j.literary_quality ?? j.literaryQuality, 'literary_quality'),
    originality: int1to10(j.originality, 'originality'),
    editorial: { verdict, reasons },
  };
}

function spread(values) {
  if (!values.length) return null;
  return { min: Math.min(...values), max: Math.max(...values), spread: Math.max(...values) - Math.min(...values) };
}

/**
 * Summarise how much the judges disagree. Nothing here is averaged: the
 * caller gets every judge's score plus the range, and a flag when the range
 * crosses the threshold or the editorial verdicts differ.
 */
export function panelDisagreement(scores, { spreadThreshold = 3 } = {}) {
  const lq = spread(scores.map((s) => s.literaryQuality));
  const og = spread(scores.map((s) => s.originality));
  const verdicts = scores.map((s) => s.editorial.verdict);
  const unanimous = verdicts.length > 0 && verdicts.every((v) => v === verdicts[0]);
  const flags = [];
  if (lq && lq.spread >= spreadThreshold) flags.push(`literary_quality spread ${lq.spread}`);
  if (og && og.spread >= spreadThreshold) flags.push(`originality spread ${og.spread}`);
  if (verdicts.length > 1 && !unanimous) flags.push(`editorial verdicts differ: ${verdicts.join('/')}`);
  return { literaryQuality: lq, originality: og, editorial: { verdicts, unanimous }, spreadThreshold, flags, disagree: flags.length > 0 };
}

export class JudgePanel {
  constructor(judges, { requireDistinctFamilies = true, spreadThreshold = 3 } = {}) {
    if (!Array.isArray(judges) || judges.length === 0) throw new Error('JudgePanel needs at least one judge');
    if (requireDistinctFamilies && judges.length > 1) {
      const fams = new Set(judges.map((j) => j.family));
      if (fams.size < 2) throw new Error(`JudgePanel needs judges from at least two model families, got ${[...fams].join(', ')}`);
    }
    this.judges = judges;
    this.spreadThreshold = spreadThreshold;
  }

  /** Judges one blinded item. A judge failure is recorded, never dropped. */
  async judge({ blind, fixture, text }) {
    const prompt = buildJudgePrompt({ blind, fixture, text });
    const perJudge = [];
    for (const j of this.judges) {
      const t0 = Date.now();
      try {
        const res = await j.complete(prompt);
        const parsed = parseJudgeResponse(res.text);
        perJudge.push({ judge: j.id, family: j.family, ok: true, ...parsed, latencyMs: res.latencyMs ?? Date.now() - t0, usage: res.usage ?? null });
      } catch (e) {
        perJudge.push({ judge: j.id, family: j.family, ok: false, error: String(e.message ?? e), latencyMs: Date.now() - t0 });
      }
    }
    const okScores = perJudge.filter((p) => p.ok);
    return {
      rubric: RUBRIC.version,
      blindId: blind,
      complete: okScores.length === this.judges.length,
      judges: perJudge,
      disagreement: panelDisagreement(okScores, { spreadThreshold: this.spreadThreshold }),
    };
  }
}
