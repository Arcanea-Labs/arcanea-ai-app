// Named-character drift: cast coverage, near-miss spellings of cast names,
// and recurring capitalised names nobody declared.
import { editDistance, sentences } from '../lib/text.mjs';

// Capitalised words that are not names. Sentence-initial words are skipped
// separately, so this only needs words that are capitalised mid-sentence.
const STOP = new Set(
  ('I Mr Mrs Ms Dr Sir Madam Captain Mother Father Aunt Uncle Grandmother Grandfather Gran Grandpa Mum Mom Dad God ' +
    'Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August ' +
    'September October November December North South East West Chapter Part Choice Option Branch End The A OK')
    .split(' ')
);

function nameTokens(fixture) {
  const cast = new Map(); // token -> canonical cast name
  for (const c of fixture.cast) {
    for (const part of [c.name, ...(c.aliases ?? [])].flatMap((n) => n.split(/\s+/))) {
      const clean = part.replace(/[^\p{L}'-]/gu, '');
      if (clean) cast.set(clean, c.name);
    }
  }
  const known = new Set((fixture.knownNames ?? []).flatMap((n) => n.split(/\s+/)).map((p) => p.replace(/[^\p{L}'-]/gu, '')));
  return { cast, known };
}

/** Mid-sentence capitalised tokens with counts. */
export function capitalisedTokens(text) {
  const counts = new Map();
  for (const s of sentences(text)) {
    const toks = s.split(/\s+/);
    for (let i = 1; i < toks.length; i++) {
      const prev = toks[i - 1];
      if (/[:;"“]$/.test(prev)) continue; // likely start of quoted speech
      const m = /^["“‘(]?(\p{Lu}[\p{Ll}'’]+(?:-\p{Lu}?[\p{Ll}'’]+)*)/u.exec(toks[i]);
      if (!m) continue;
      const w = m[1].replace(/['’]s$/u, '');
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return counts;
}

export function scoreDrift(text, fixture, { minUnknownCount = 2 } = {}) {
  const { cast, known } = nameTokens(fixture);
  const caps = capitalisedTokens(text);
  const lower = text.toLowerCase();

  const castMentioned = fixture.cast.filter((c) =>
    [c.name, ...(c.aliases ?? [])].some((n) => lower.includes(n.split(/\s+/)[0].toLowerCase()))
  );

  const aliasDrift = [];
  const unknownNames = [];
  for (const [tok, count] of caps) {
    if (cast.has(tok) || known.has(tok) || STOP.has(tok)) continue;
    let near = null;
    for (const castTok of cast.keys()) {
      const limit = castTok.length <= 5 ? 1 : 2;
      const d = editDistance(tok, castTok);
      if (d > 0 && d <= limit) {
        near = cast.get(castTok);
        break;
      }
    }
    if (near) aliasDrift.push({ found: tok, castName: near, count });
    else if (count >= minUnknownCount) unknownNames.push({ name: tok, count });
  }
  return {
    castSize: fixture.cast.length,
    castMentioned: castMentioned.length,
    castCoverage: castMentioned.length / fixture.cast.length,
    missingCast: fixture.cast.filter((c) => !castMentioned.includes(c)).map((c) => c.name),
    aliasDrift,
    unknownNames,
  };
}
