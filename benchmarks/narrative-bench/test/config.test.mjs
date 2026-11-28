import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSystem } from '../systems/index.mjs';

const example = JSON.parse(readFileSync(new URL('../systems.example.json', import.meta.url), 'utf8'));
const decisions = readFileSync(new URL('../../../docs/research/narrative-intelligence/DECISIONS.md', import.meta.url), 'utf8');

test('systems.example.json has no PageStorm system (ADR-006) and every system constructs', () => {
  assert.doesNotMatch(JSON.stringify(example.systems), /pagestorm/i);
  const ids = example.systems.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'system ids are unique');
  for (const cfg of example.systems) assert.ok(createSystem(cfg, { env: {} }), cfg.id);
});

test('systems.example.json holds env-var names only, never keys', () => {
  const raw = JSON.stringify(example);
  assert.doesNotMatch(raw, /sk-[A-Za-z0-9]{10,}|"apiKey"\s*:/);
});

test('ADR-006 is accepted and marks the PageStorm parts of ADR-001 and ADR-003 superseded', () => {
  const adr6 = decisions.split('## ADR-006')[1];
  assert.ok(adr6, 'ADR-006 exists');
  assert.match(adr6, /Status: accepted/);
  assert.match(adr6, /2026-11-26/);
  assert.match(adr6, /Decider: Frank/);
  for (const n of ['001', '003']) {
    const section = decisions.split(`## ADR-${n}`)[1].split('\n## ')[0];
    assert.match(section, /superseded by ADR-006/i, `ADR-${n}`);
  }
  // Safety classifier and cost receipts survive as general rules.
  assert.match(adr6, /Safety classifier/);
  assert.match(adr6, /usdEstimate: null/);
});
