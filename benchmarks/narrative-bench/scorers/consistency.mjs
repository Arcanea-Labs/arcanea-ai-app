// Probe-fact consistency: lexical checks declared in each fixture.
//
// These are smoke checks, not understanding. A regex can miss a paraphrase
// (false "not-evidenced") or fire on a negated sentence it was not written
// for. Every fixture ships pass/fail examples that the test suite runs, so
// each check is at least known to behave on its own examples.

const re = (src) => new RegExp(src, 'iu');

function firstMatch(text, patterns = []) {
  for (const src of patterns) {
    const m = re(src).exec(text);
    if (m) return { pattern: src, match: m[0], index: m.index };
  }
  return null;
}

/** mustHold: violated when any `contradicts` pattern matches. */
export function scoreMustHold(text, mustHold) {
  const items = mustHold.map((m) => {
    const hit = firstMatch(text, m.contradicts);
    return { id: m.id, held: !hit, ...(hit ? { evidence: hit.match } : {}) };
  });
  const violated = items.filter((i) => !i.held).length;
  return { total: items.length, violated, holdRate: items.length ? (items.length - violated) / items.length : null, items };
}

/**
 * Probes: three-way status.
 *   contradicted   a `contradicts` pattern matched (takes precedence)
 *   pass           an `evidence` pattern matched
 *   not-evidenced  neither matched; the text is silent or paraphrased
 */
export function scoreProbes(text, probes) {
  const items = probes.map((p) => {
    const bad = firstMatch(text, p.contradicts ?? []);
    if (bad) return { id: p.id, question: p.question, status: 'contradicted', evidence: bad.match };
    const good = firstMatch(text, p.evidence);
    if (good) return { id: p.id, question: p.question, status: 'pass', evidence: good.match };
    return { id: p.id, question: p.question, status: 'not-evidenced' };
  });
  const count = (s) => items.filter((i) => i.status === s).length;
  const pass = count('pass');
  return {
    total: items.length,
    pass,
    contradicted: count('contradicted'),
    notEvidenced: count('not-evidenced'),
    passRate: items.length ? pass / items.length : null,
    items,
  };
}
