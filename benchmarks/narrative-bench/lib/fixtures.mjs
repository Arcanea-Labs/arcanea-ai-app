// Fixture loading and schema validation. Hand-written checks, no dependencies.
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

const REQUIRED = ['id', 'title', 'brief', 'worldBible', 'cast', 'knownNames', 'mustHold', 'probes', 'targetLength', 'tags'];

const isStringList = (v) => Array.isArray(v) && v.every((s) => typeof s === 'string' && s.trim().length > 0);

function checkRegexList(list, where, errors) {
  if (!Array.isArray(list)) return errors.push(`${where} must be an array of regex strings`);
  for (const src of list) {
    try {
      new RegExp(src, 'iu');
    } catch (e) {
      errors.push(`${where}: invalid regex ${JSON.stringify(src)} (${e.message})`);
    }
  }
}

/** Returns a list of error strings; empty means valid. */
export function validateFixture(f) {
  const errors = [];
  for (const k of REQUIRED) if (f?.[k] === undefined) errors.push(`missing field ${k}`);
  if (errors.length) return errors;
  if (!/^[a-z0-9-]+$/.test(f.id)) errors.push('id must be kebab-case');
  if (!Array.isArray(f.worldBible) || f.worldBible.length < 5 || f.worldBible.length > 10)
    errors.push('worldBible must hold 5-10 rules');
  if (!Array.isArray(f.cast) || f.cast.length < 3 || f.cast.length > 6) errors.push('cast must hold 3-6 characters');
  for (const c of f.cast ?? []) {
    if (!c.name || !Array.isArray(c.traits) || !c.traits.length) errors.push(`cast entry needs name and traits: ${JSON.stringify(c)}`);
    if (c.aliases !== undefined && !isStringList(c.aliases)) errors.push(`cast ${c.name} aliases must be an array of non-empty strings`);
  }
  // The drift scorer treats knownNames as the allow-list for capitalised
  // non-cast tokens; a missing list would flag every place name as drift.
  if (!isStringList(f.knownNames)) errors.push('knownNames must be an array of non-empty strings');
  if (!Array.isArray(f.mustHold) || !f.mustHold.length) errors.push('mustHold must be a non-empty array');
  for (const m of f.mustHold ?? []) {
    if (!m.id || !m.fact) errors.push(`mustHold entry needs id and fact: ${JSON.stringify(m)}`);
    checkRegexList(m.contradicts, `mustHold ${m.id}.contradicts`, errors);
    if (typeof m.violationExample !== 'string') errors.push(`mustHold ${m.id} needs violationExample`);
  }
  if (!Array.isArray(f.probes) || !f.probes.length) errors.push('probes must be a non-empty array');
  for (const p of f.probes ?? []) {
    if (!p.id || !p.question) errors.push(`probe needs id and question: ${JSON.stringify(p)}`);
    checkRegexList(p.evidence, `probe ${p.id}.evidence`, errors);
    checkRegexList(p.contradicts ?? [], `probe ${p.id}.contradicts`, errors);
    if (typeof p.passExample !== 'string') errors.push(`probe ${p.id} needs passExample`);
    if (p.contradicts?.length && typeof p.failExample !== 'string') errors.push(`probe ${p.id} needs failExample`);
  }
  const tl = f.targetLength;
  if (!tl || !Number.isInteger(tl.words) || tl.words <= 0) errors.push('targetLength.words must be a positive integer');
  if (tl && tl.tolerance !== undefined && !(tl.tolerance > 0 && tl.tolerance < 1)) errors.push('targetLength.tolerance must be in (0,1)');
  if (!Array.isArray(f.tags) || !f.tags.length) errors.push('tags must be a non-empty array');
  return errors;
}

export function loadFixtures(dir = FIXTURE_DIR, { only } = {}) {
  const files = readdirSync(dir).filter((n) => n.endsWith('.json')).sort();
  const fixtures = [];
  for (const name of files) {
    const f = JSON.parse(readFileSync(join(dir, name), 'utf8'));
    const errors = validateFixture(f);
    if (errors.length) throw new Error(`fixture ${name} invalid:\n  ${errors.join('\n  ')}`);
    if (only && !only.includes(f.id)) continue;
    fixtures.push(f);
  }
  return fixtures;
}

/** The writing prompt every system receives. Probes are never shown. */
export function buildWritingPrompt(f) {
  const cast = f.cast.map((c) => `- ${c.name}${c.role ? ` (${c.role})` : ''}: ${c.traits.join('; ')}`).join('\n');
  const rules = f.worldBible.map((r, i) => `${i + 1}. ${r}`).join('\n');
  const facts = f.mustHold.map((m) => `- ${m.fact}`).join('\n');
  const system =
    'You are a fiction writer. Write original prose only, with no preamble, notes or headings unless the brief asks for them.';
  const user = [
    `Brief: ${f.brief}`,
    '',
    'World rules:',
    rules,
    '',
    'Cast:',
    cast,
    '',
    'Facts that must stay true throughout:',
    facts,
    '',
    `Target length: about ${f.targetLength.words} words.`,
  ].join('\n');
  return { system, user };
}
