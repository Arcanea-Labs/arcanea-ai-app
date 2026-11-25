// All deterministic scorers for one output.
import { scoreMustHold, scoreProbes } from './consistency.mjs';
import { scoreLength } from './length.mjs';
import { scoreDiversity } from './diversity.mjs';
import { scoreDrift } from './drift.mjs';
import { scoreTaste } from './taste-bridge.mjs';

export async function scoreDeterministic(text, fixture, opts = {}) {
  return {
    mustHold: scoreMustHold(text, fixture.mustHold),
    probes: scoreProbes(text, fixture.probes),
    length: scoreLength(text, fixture.targetLength),
    diversity: scoreDiversity(text),
    drift: scoreDrift(text, fixture),
    taste: opts.taste === false ? { available: false, reason: 'disabled' } : await scoreTaste(text, opts.tasteOpts),
  };
}

/**
 * Cross-story continuity for fixtures sharing a `continuityGroup`: a
 * world-scoped mustHold fact (scope: "world") counts as held for a system
 * only if it held in every story of the group that system wrote.
 */
export function crossStoryContinuity(rows, fixturesById) {
  const groups = new Map(); // `${system}::${group}` -> Map(factId -> {held, stories})
  for (const r of rows) {
    if (!r.ok) continue;
    const f = fixturesById.get(r.fixtureId);
    if (!f?.continuityGroup) continue;
    const key = `${r.systemId}::${f.continuityGroup}`;
    if (!groups.has(key)) groups.set(key, new Map());
    const facts = groups.get(key);
    for (const m of f.mustHold) {
      if (m.scope !== 'world') continue;
      const item = r.deterministic.mustHold.items.find((i) => i.id === m.id);
      const cur = facts.get(m.id) ?? { held: true, stories: 0 };
      cur.held = cur.held && !!item?.held;
      cur.stories += 1;
      facts.set(m.id, cur);
    }
  }
  return [...groups].map(([key, facts]) => {
    const [systemId, group] = key.split('::');
    const list = [...facts].map(([id, v]) => ({ id, ...v }));
    const held = list.filter((x) => x.held).length;
    return { systemId, group, worldFacts: list.length, heldAcrossAll: held, rate: list.length ? held / list.length : null, facts: list };
  });
}
