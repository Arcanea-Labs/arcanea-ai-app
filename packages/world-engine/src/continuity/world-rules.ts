/**
 * World-rule validation.
 *
 * A `WorldRule` is a statement plus an optional pure predicate over facts that
 * have already been extracted from a scene. Rules are built from the typed
 * canon data world-engine exports (GUARDIANS, GODBEASTS, ELEMENTS, HOUSES,
 * getRankFromGates) — never by parsing lore prose — so the checks change
 * exactly when the canon data changes and no model is needed to apply them.
 *
 * Fact extraction (prose -> SceneFacts) is out of scope here on purpose: it
 * may use a model, but validation must not.
 */

import { ELEMENTS, GODBEASTS, GUARDIANS, HOUSES, getRankFromGates } from "../canon.js";
import type { Godbeast, Guardian, MagicRank } from "../types.js";
import { finding } from "./types.js";
import type { Finding, Severity, StoryTime } from "./types.js";

// ── Extracted scene facts ───────────────────────────────────────────────────

export interface SceneCharacterFact {
  id: string;
  gatesOpen?: number;
  rank?: string;
  house?: string;
  element?: string;
}

export interface MagicUseFact {
  casterId: string;
  element?: string;
  gate?: number;
}

export interface GuardianMention {
  name: string;
  gate?: number;
  element?: string;
  domain?: string;
  godbeast?: string;
}

export interface GodbeastMention {
  name: string;
  gate?: number;
}

export interface SceneFacts {
  sceneRef: string;
  at?: StoryTime;
  /** Which plan this scene belongs to, for rule scoping. */
  context?: { universeId?: string; seriesId?: string; bookId?: string };
  characters?: SceneCharacterFact[];
  magic?: MagicUseFact[];
  guardians?: GuardianMention[];
  godbeasts?: GodbeastMention[];
  houses?: string[];
  elements?: string[];
}

// ── Rules ───────────────────────────────────────────────────────────────────

/**
 * "canon" rules apply everywhere. Narrower scopes apply only when the scene's
 * context id matches `scopeId` (e.g. a house rule for one series).
 */
export type RuleScope = "canon" | "universe" | "series" | "book";

/** `true` = pass, `false` = fail, string[] = specific violations (empty = pass). */
export type RuleCheckResult = boolean | readonly string[];

export interface WorldRule {
  id: string;
  statement: string;
  scope: RuleScope;
  scopeId?: string;
  severity: Severity;
  /** Must be pure: same facts, same answer, no side effects. */
  check?: (facts: SceneFacts) => RuleCheckResult;
}

/** The typed canon a rule set is derived from. Injectable for tests and forks. */
export interface CanonSource {
  elements: readonly string[];
  houses: readonly string[];
  guardians: readonly Guardian[];
  godbeasts: readonly Godbeast[];
  rankForGates: (gates: number) => MagicRank;
  /** Highest gate number in the system. */
  maxGate: number;
}

export const WORLD_ENGINE_CANON: CanonSource = Object.freeze({
  elements: ELEMENTS,
  houses: HOUSES,
  guardians: GUARDIANS,
  godbeasts: GODBEASTS,
  rankForGates: getRankFromGates,
  maxGate: Math.max(...GUARDIANS.map((g) => g.gate)),
});

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Builds the canon rule set. Each rule cites the data it came from in its
 * statement, so a finding can be traced back to a canon table, not a vibe.
 */
export function buildCanonRules(canon: CanonSource = WORLD_ENGINE_CANON): WorldRule[] {
  const elements = new Set(canon.elements.map(norm));
  const houses = new Set(canon.houses.map(norm));
  const guardianByName = new Map(canon.guardians.map((g) => [norm(g.name), g]));
  const godbeastByName = new Map(canon.godbeasts.map((b) => [norm(b.name), b]));
  const godbeastByGate = new Map(canon.godbeasts.map((b) => [b.gate, b]));
  // A guardian whose element is "All" may channel any element.
  const universalElement = "all";

  return [
    {
      id: "canon.element.known",
      statement: `Only the canonical elements exist: ${canon.elements.join(", ")}.`,
      scope: "canon",
      severity: "error",
      check: (f) => {
        const used = [...(f.elements ?? []), ...(f.magic ?? []).map((m) => m.element),
          ...(f.characters ?? []).map((c) => c.element)].filter((e): e is string => !!e);
        return used.filter((e) => !elements.has(norm(e))).map((e) => `unknown element "${e}"`);
      },
    },
    {
      id: "canon.house.known",
      statement: `The Academy has exactly these Houses: ${canon.houses.join(", ")}.`,
      scope: "canon",
      severity: "error",
      check: (f) => {
        const used = [...(f.houses ?? []), ...(f.characters ?? []).map((c) => c.house)]
          .filter((h): h is string => !!h);
        return used.filter((h) => !houses.has(norm(h.replace(/^house\s+/i, "")))).map((h) => `unknown House "${h}"`);
      },
    },
    {
      id: "canon.gate.range",
      statement: `Gates are numbered 1 to ${canon.maxGate}; a character has 0 to ${canon.maxGate} open.`,
      scope: "canon",
      severity: "error",
      check: (f) => {
        const out: string[] = [];
        const isGate = (n: number) => Number.isInteger(n) && n >= 1 && n <= canon.maxGate;
        for (const m of f.magic ?? []) if (m.gate !== undefined && !isGate(m.gate)) out.push(`magic by ${m.casterId} at nonexistent Gate ${m.gate}`);
        for (const g of f.guardians ?? []) if (g.gate !== undefined && !isGate(g.gate)) out.push(`${g.name} placed at nonexistent Gate ${g.gate}`);
        for (const b of f.godbeasts ?? []) if (b.gate !== undefined && !isGate(b.gate)) out.push(`${b.name} placed at nonexistent Gate ${b.gate}`);
        for (const c of f.characters ?? []) {
          if (c.gatesOpen !== undefined && !(Number.isInteger(c.gatesOpen) && c.gatesOpen >= 0 && c.gatesOpen <= canon.maxGate)) {
            out.push(`${c.id} has ${c.gatesOpen} Gates open`);
          }
        }
        return out;
      },
    },
    {
      id: "canon.guardian.identity",
      statement: `There are exactly ${canon.guardians.length} Guardians, each bound to one Gate, domain and element: ${canon.guardians.map((g) => `${g.name} (Gate ${g.gate}, ${g.domain}, ${g.element})`).join("; ")}.`,
      scope: "canon",
      severity: "error",
      check: (f) => {
        const out: string[] = [];
        for (const m of f.guardians ?? []) {
          const g = guardianByName.get(norm(m.name));
          if (!g) { out.push(`"${m.name}" is not one of the Guardians`); continue; }
          if (m.gate !== undefined && m.gate !== g.gate) out.push(`${g.name} keeps Gate ${g.gate}, not Gate ${m.gate}`);
          if (m.domain !== undefined && norm(m.domain) !== norm(g.domain)) out.push(`${g.name}'s domain is ${g.domain}, not ${m.domain}`);
          if (m.element !== undefined && norm(g.element) !== universalElement && norm(m.element) !== norm(g.element)) {
            out.push(`${g.name}'s element is ${g.element}, not ${m.element}`);
          }
        }
        return out;
      },
    },
    {
      id: "canon.godbeast.binding",
      statement: `Each Godbeast is bound to one Gate: ${canon.godbeasts.map((b) => `${b.name} (Gate ${b.gate})`).join("; ")}.`,
      scope: "canon",
      severity: "error",
      check: (f) => {
        const out: string[] = [];
        for (const m of f.godbeasts ?? []) {
          const b = godbeastByName.get(norm(m.name));
          if (!b) { out.push(`"${m.name}" is not a canonical Godbeast`); continue; }
          if (m.gate !== undefined && m.gate !== b.gate) out.push(`${b.name} is bound to Gate ${b.gate}, not Gate ${m.gate}`);
        }
        // A Guardian paired with a Godbeast must share its Gate.
        for (const m of f.guardians ?? []) {
          if (!m.godbeast) continue;
          const g = guardianByName.get(norm(m.name));
          const b = godbeastByName.get(norm(m.godbeast));
          if (!g || !b) continue; // identity rules report unknown names
          if (g.gate !== b.gate) {
            const expected = godbeastByGate.get(g.gate);
            out.push(`${g.name} (Gate ${g.gate}) is paired with ${b.name} (Gate ${b.gate})${expected ? `; Gate ${g.gate}'s Godbeast is ${expected.name}` : ""}`);
          }
        }
        return out;
      },
    },
    {
      id: "canon.rank.gates",
      statement: "A character's magic rank is determined by how many Gates they have opened (getRankFromGates).",
      scope: "canon",
      severity: "error",
      check: (f) =>
        (f.characters ?? [])
          .filter((c) => c.rank !== undefined && c.gatesOpen !== undefined)
          .filter((c) => norm(canon.rankForGates(c.gatesOpen!)) !== norm(c.rank!))
          .map((c) => `${c.id} has ${c.gatesOpen} Gates open, which makes them ${canon.rankForGates(c.gatesOpen!)}, not ${c.rank}`),
    },
  ];
}

function ruleApplies(rule: WorldRule, facts: SceneFacts): boolean {
  if (rule.scope === "canon") return true;
  const key = `${rule.scope}Id` as "universeId" | "seriesId" | "bookId";
  return rule.scopeId !== undefined && facts.context?.[key] === rule.scopeId;
}

/**
 * Applies every in-scope rule that has a check. Rules without a check are
 * documentation for humans and produce no findings. A check that throws is
 * reported as RULE_ERROR rather than crashing the whole validation.
 */
export function validateScene(facts: SceneFacts, rules: readonly WorldRule[]): Finding[] {
  const findings: Finding[] = [];
  for (const rule of rules) {
    if (!rule.check || !ruleApplies(rule, facts)) continue;
    let result: RuleCheckResult;
    try {
      result = rule.check(facts);
    } catch (err) {
      findings.push(finding("RULE_ERROR", "error",
        `rule ${rule.id} threw: ${(err as Error).message}`, [facts.sceneRef], [rule.id]));
      continue;
    }
    if (result === true) continue;
    const messages = result === false ? [rule.statement] : [...result];
    for (const message of messages) {
      findings.push(finding("WORLD_RULE_VIOLATION", rule.severity, `${rule.id}: ${message}`, [facts.sceneRef], [rule.id]));
    }
  }
  return findings;
}
