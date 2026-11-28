/**
 * Canon gates review each validated stage result before it is checkpointed.
 *
 * StructuralCanonGate is pure and deterministic: no model calls, so the same
 * input always gives the same verdict. It never writes anywhere; in particular
 * it never touches .arcanea/lore. Every result stays status "candidate".
 */

import type { StageName } from "./stages.js";
import type { CanonFinding, CanonReview, StageResult } from "./runner-types.js";

export interface CanonContext {
  /** Results completed before this one, in run order. */
  completed: readonly StageResult[];
}

export interface CanonGate {
  review(result: StageResult, context: CanonContext): CanonReview | Promise<CanonReview>;
}

/**
 * Guardian and Godbeast names, mirrored from packages/world-engine/src/canon.ts
 * (GUARDIANS, GODBEASTS). Mirrored instead of imported so this package has no
 * workspace dependency; a test reads canon.ts and fails if the lists drift.
 */
export const RESERVED_CANON_NAMES: readonly string[] = [
  // Guardians
  "Lyssandria", "Leyla", "Draconia", "Maylinn", "Alera", "Lyria", "Aiyami", "Elara", "Ino", "Shinkami",
  // Godbeasts
  "Kaelith", "Veloura", "Draconis", "Laeylinn", "Otome", "Yumiko", "Sol", "Vaelith", "Kyuro",
] as const;

export interface StructuralCanonGateOptions {
  /** Names generated characters may not take. Defaults to RESERVED_CANON_NAMES. */
  reservedNames?: readonly string[];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsWord(haystack: string, term: string): boolean {
  if (!term.trim()) return false;
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(term)}($|[^\\p{L}\\p{N}])`, "iu").test(haystack);
}

/** Inline citations a chapter text may use to point at a world rule: [rule:key]. */
const RULE_CITATION = /\[rule:([a-z0-9][a-z0-9_-]*)\]/g;

function find<S extends StageName>(completed: readonly StageResult[], stage: S): StageResult<S> | undefined {
  return completed.find((r) => r.stage === stage) as StageResult<S> | undefined;
}

export class StructuralCanonGate implements CanonGate {
  private readonly reserved: readonly string[];

  constructor(opts: StructuralCanonGateOptions = {}) {
    this.reserved = opts.reservedNames ?? RESERVED_CANON_NAMES;
  }

  review(result: StageResult, context: CanonContext): CanonReview {
    const findings: CanonFinding[] = [];
    const plan = result.stage === "book_plan" ? undefined : find(context.completed, "book_plan");
    const declaredKeys = new Set(plan?.data.worldRules.map((r) => r.key) ?? []);

    // 1. Forbidden terms declared by world rules must not appear in later stages.
    if (plan) {
      for (const rule of plan.data.worldRules) {
        for (const term of rule.forbiddenTerms) {
          if (containsWord(result.raw, term)) {
            findings.push({
              code: "forbidden_term",
              severity: "block",
              subject: term,
              message: `"${term}" is forbidden by world rule "${rule.key}" but appears in ${result.stage} (${result.unit})`,
            });
          }
        }
      }
    }

    // 2. Rule keys cited later must have been declared in book_plan.
    const cited = new Set<string>();
    if (result.stage === "chapters_plan") {
      for (const c of (result as StageResult<"chapters_plan">).data.chapters) c.ruleKeys.forEach((k) => cited.add(k));
    } else if (result.stage === "scene_breakdown") {
      for (const s of (result as StageResult<"scene_breakdown">).data.scenes) s.ruleKeys.forEach((k) => cited.add(k));
    } else if (result.stage === "chapter_text") {
      for (const m of result.raw.matchAll(RULE_CITATION)) if (m[1]) cited.add(m[1]);
    }
    if (plan) {
      for (const key of cited) {
        if (!declaredKeys.has(key)) {
          findings.push({
            code: "undeclared_rule_key",
            severity: "flag",
            subject: key,
            message: `${result.stage} (${result.unit}) cites rule key "${key}", which book_plan does not declare`,
          });
        }
      }
    }

    // 3. Scene characters must come from characters_list.
    if (result.stage === "scene_breakdown") {
      const cast = find(context.completed, "characters_list");
      if (cast) {
        const known = new Set(cast.data.characters.map((c) => c.name.toLowerCase()));
        const reported = new Set<string>();
        for (const s of (result as StageResult<"scene_breakdown">).data.scenes) {
          for (const name of s.characters) {
            const lower = name.toLowerCase();
            if (!known.has(lower) && !reported.has(lower)) {
              reported.add(lower);
              findings.push({
                code: "unknown_character",
                severity: "flag",
                subject: name,
                message: `scene ${s.index} of ${result.unit} uses "${name}", who is not in characters_list`,
              });
            }
          }
        }
      }
    }

    // 4. Generated characters may not take reserved canon names.
    if (result.stage === "characters_list") {
      for (const c of (result as StageResult<"characters_list">).data.characters) {
        for (const reserved of this.reserved) {
          if (containsWord(c.name, reserved)) {
            findings.push({
              code: "reserved_canon_name",
              severity: "flag",
              subject: c.name,
              message: `generated character "${c.name}" uses reserved canon name "${reserved}"`,
            });
          }
        }
      }
    }

    const verdict = findings.some((f) => f.severity === "block") ? "block" : findings.length > 0 ? "flag" : "pass";
    return { verdict, findings };
  }
}
