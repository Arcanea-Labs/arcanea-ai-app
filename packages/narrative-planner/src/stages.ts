/**
 * Stage protocol for hierarchical narrative planning.
 *
 * Clean-room implementation. Written from the published paper description of a
 * top-down planning scaffold (preview -> plan -> chapter plans -> characters ->
 * scenes -> text). No code from github.com/Pageshift-ai/pagestorm is used.
 *
 * Every structured stage has a hand-written validator that returns either a
 * typed value or a list of human-readable errors. No schema library.
 */

export type StageName =
  | "book_preview"
  | "book_plan"
  | "chapters_plan"
  | "characters_list"
  | "scene_breakdown"
  | "chapter_text";

/** Book-level stages run once; chapter-level stages run once per chapter. */
export const BOOK_STAGES: readonly StageName[] = [
  "book_preview",
  "book_plan",
  "chapters_plan",
  "characters_list",
] as const;

export const CHAPTER_STAGES: readonly StageName[] = ["scene_breakdown", "chapter_text"] as const;

export const STAGE_ORDER: readonly StageName[] = [...BOOK_STAGES, ...CHAPTER_STAGES] as const;

export interface BookPreview {
  text: string;
}

export interface WorldRule {
  key: string;
  rule: string;
  /** Terms that must not appear in any later stage output. */
  forbiddenTerms: string[];
}

export interface StoryArc {
  name: string;
  description: string;
}

export interface CharacterArchetype {
  archetype: string;
  role: string;
}

export interface WritingStyle {
  pov: string;
  tense: string;
  tone: string;
  notes: string;
}

export interface BookPlan {
  title: string;
  worldRules: WorldRule[];
  storyArcs: StoryArc[];
  characterArchetypes: CharacterArchetype[];
  writingStyle: WritingStyle;
}

export const EMBEDDING_AXES = [
  "action",
  "dialog",
  "world_building",
  "exposition",
  "romantic",
  "pacing",
] as const;
export type EmbeddingAxis = (typeof EMBEDDING_AXES)[number];
export type EmbeddingSpace = Record<EmbeddingAxis, number>;

export interface ChapterPlan {
  index: number;
  name: string;
  targetWords: number;
  summary: string[];
  narrativeFocus: string;
  /** Keys of book_plan world rules this chapter leans on. */
  ruleKeys: string[];
  embeddingSpace: EmbeddingSpace;
}

export interface ChaptersPlan {
  chapters: ChapterPlan[];
}

export interface Character {
  name: string;
  role: string;
  description: string;
  archetype: string;
}

export interface CharactersList {
  characters: Character[];
}

export interface Scene {
  index: number;
  summary: string;
  characters: string[];
  location: string;
  ruleKeys: string[];
}

export interface SceneBreakdown {
  chapterIndex: number;
  scenes: Scene[];
}

export interface ChapterText {
  chapterIndex: number;
  text: string;
}

export interface StageDataMap {
  book_preview: BookPreview;
  book_plan: BookPlan;
  chapters_plan: ChaptersPlan;
  characters_list: CharactersList;
  scene_breakdown: SceneBreakdown;
  chapter_text: ChapterText;
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

// ── JSON extraction ─────────────────────────────────────────────────────────

/**
 * Pull a JSON value out of model output. Accepts a ```json fenced block, any
 * fenced block, or bare JSON (the first balanced object/array in the text).
 * Returns undefined when nothing parses.
 */
export function extractJson(text: string): unknown {
  const fence = /```(?:json|JSON)?\s*\n?([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(text)) !== null) {
    const body = (m[1] ?? "").trim();
    const parsed = tryParse(body);
    if (parsed !== undefined) return parsed;
  }
  const whole = tryParse(text.trim());
  if (whole !== undefined) return whole;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== "{" && ch !== "[") continue;
    const end = findBalancedEnd(text, i);
    if (end === -1) continue;
    const parsed = tryParse(text.slice(i, end + 1));
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

function tryParse(s: string): unknown {
  if (s.length === 0) return undefined;
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return undefined;
  }
}

function findBalancedEnd(text: string, start: number): number {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
    else if (ch === "}" || ch === "]") {
      if (stack.pop() !== ch) return -1;
      if (stack.length === 0) return i;
    }
  }
  return -1;
}

// ── Validator helpers ───────────────────────────────────────────────────────

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(o: Obj, key: string, path: string, errors: string[], optional = false): string {
  const v = o[key];
  if (optional && (v === undefined || v === "")) return "";
  if (typeof v !== "string" || v.trim().length === 0) {
    errors.push(`${path}.${key} must be a non-empty string`);
    return "";
  }
  return v;
}

function strArray(o: Obj, key: string, path: string, errors: string[], optional = false): string[] {
  const v = o[key];
  if (v === undefined && optional) return [];
  if (!Array.isArray(v)) {
    errors.push(`${path}.${key} must be an array of strings`);
    return [];
  }
  const out: string[] = [];
  v.forEach((item, i) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      errors.push(`${path}.${key}[${i}] must be a non-empty string`);
    } else out.push(item);
  });
  return out;
}

function int(o: Obj, key: string, path: string, errors: string[], min: number, max: number): number {
  const v = o[key];
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
    errors.push(`${path}.${key} must be an integer in [${min}, ${max}]`);
    return min;
  }
  return v;
}

function objArray(o: Obj, key: string, path: string, errors: string[], minLen = 1): Obj[] {
  const v = o[key];
  if (!Array.isArray(v) || v.length < minLen) {
    errors.push(`${path}.${key} must be an array with at least ${minLen} item(s)`);
    return [];
  }
  const out: Obj[] = [];
  v.forEach((item, i) => {
    if (!isObj(item)) errors.push(`${path}.${key}[${i}] must be an object`);
    else out.push(item);
  });
  return out;
}

function root(input: unknown): { obj: Obj | null; errors: string[] } {
  if (!isObj(input)) return { obj: null, errors: ["output must be a JSON object"] };
  return { obj: input, errors: [] };
}

function done<T>(value: T, errors: string[]): ValidationResult<T> {
  return errors.length === 0 ? { ok: true, value } : { ok: false, errors };
}

// ── Stage validators ────────────────────────────────────────────────────────

const MIN_PROSE_CHARS = 20;

export function validateBookPreview(text: string): ValidationResult<BookPreview> {
  const t = text.trim();
  if (t.length < MIN_PROSE_CHARS) {
    return { ok: false, errors: [`book_preview must be at least ${MIN_PROSE_CHARS} characters of prose`] };
  }
  return { ok: true, value: { text: t } };
}

export function validateBookPlan(input: unknown): ValidationResult<BookPlan> {
  const { obj, errors } = root(input);
  if (!obj) return { ok: false, errors };
  const title = str(obj, "title", "book_plan", errors);
  const seenKeys = new Set<string>();
  const worldRules = objArray(obj, "worldRules", "book_plan", errors).map((r, i) => {
    const p = `book_plan.worldRules[${i}]`;
    const key = str(r, "key", p, errors);
    if (key && !/^[a-z0-9][a-z0-9_-]*$/.test(key)) errors.push(`${p}.key must match ^[a-z0-9][a-z0-9_-]*$`);
    if (key && seenKeys.has(key)) errors.push(`${p}.key "${key}" is duplicated`);
    seenKeys.add(key);
    return { key, rule: str(r, "rule", p, errors), forbiddenTerms: strArray(r, "forbiddenTerms", p, errors, true) };
  });
  const storyArcs = objArray(obj, "storyArcs", "book_plan", errors).map((a, i) => {
    const p = `book_plan.storyArcs[${i}]`;
    return { name: str(a, "name", p, errors), description: str(a, "description", p, errors) };
  });
  const characterArchetypes = objArray(obj, "characterArchetypes", "book_plan", errors).map((a, i) => {
    const p = `book_plan.characterArchetypes[${i}]`;
    return { archetype: str(a, "archetype", p, errors), role: str(a, "role", p, errors) };
  });
  let writingStyle: WritingStyle = { pov: "", tense: "", tone: "", notes: "" };
  const ws = obj["writingStyle"];
  if (!isObj(ws)) errors.push("book_plan.writingStyle must be an object");
  else {
    const p = "book_plan.writingStyle";
    writingStyle = {
      pov: str(ws, "pov", p, errors),
      tense: str(ws, "tense", p, errors),
      tone: str(ws, "tone", p, errors),
      notes: str(ws, "notes", p, errors, true),
    };
  }
  return done({ title, worldRules, storyArcs, characterArchetypes, writingStyle }, errors);
}

export function validateChaptersPlan(input: unknown, expectedChapters?: number): ValidationResult<ChaptersPlan> {
  const { obj, errors } = root(input);
  if (!obj) return { ok: false, errors };
  const chapters = objArray(obj, "chapters", "chapters_plan", errors).map((c, i) => {
    const p = `chapters_plan.chapters[${i}]`;
    const index = int(c, "index", p, errors, 1, 10_000);
    if (index !== i + 1) errors.push(`${p}.index must be ${i + 1} (chapters are numbered in order from 1)`);
    const summary = strArray(c, "summary", p, errors);
    if (summary.length === 0) errors.push(`${p}.summary must have at least one bullet`);
    const embeddingSpace = {} as EmbeddingSpace;
    const es = c["embeddingSpace"];
    if (!isObj(es)) {
      errors.push(`${p}.embeddingSpace must be an object`);
      for (const axis of EMBEDDING_AXES) embeddingSpace[axis] = 0;
    } else {
      for (const axis of EMBEDDING_AXES) embeddingSpace[axis] = int(es, axis, `${p}.embeddingSpace`, errors, 0, 100);
    }
    return {
      index,
      name: str(c, "name", p, errors),
      targetWords: int(c, "targetWords", p, errors, 1, 1_000_000),
      summary,
      narrativeFocus: str(c, "narrativeFocus", p, errors),
      ruleKeys: strArray(c, "ruleKeys", p, errors, true),
      embeddingSpace,
    };
  });
  if (expectedChapters !== undefined && chapters.length !== expectedChapters) {
    errors.push(`chapters_plan must contain exactly ${expectedChapters} chapters (got ${chapters.length})`);
  }
  return done({ chapters }, errors);
}

export function validateCharactersList(input: unknown): ValidationResult<CharactersList> {
  const { obj, errors } = root(input);
  if (!obj) return { ok: false, errors };
  const seen = new Set<string>();
  const characters = objArray(obj, "characters", "characters_list", errors).map((c, i) => {
    const p = `characters_list.characters[${i}]`;
    const name = str(c, "name", p, errors);
    const lower = name.toLowerCase();
    if (name && seen.has(lower)) errors.push(`${p}.name "${name}" is duplicated`);
    seen.add(lower);
    return {
      name,
      role: str(c, "role", p, errors),
      description: str(c, "description", p, errors),
      archetype: str(c, "archetype", p, errors, true),
    };
  });
  return done({ characters }, errors);
}

export function validateSceneBreakdown(input: unknown, chapterIndex?: number): ValidationResult<SceneBreakdown> {
  const { obj, errors } = root(input);
  if (!obj) return { ok: false, errors };
  const ci = int(obj, "chapterIndex", "scene_breakdown", errors, 1, 10_000);
  if (chapterIndex !== undefined && ci !== chapterIndex) {
    errors.push(`scene_breakdown.chapterIndex must be ${chapterIndex}`);
  }
  const scenes = objArray(obj, "scenes", "scene_breakdown", errors).map((s, i) => {
    const p = `scene_breakdown.scenes[${i}]`;
    const index = int(s, "index", p, errors, 1, 10_000);
    if (index !== i + 1) errors.push(`${p}.index must be ${i + 1}`);
    return {
      index,
      summary: str(s, "summary", p, errors),
      characters: strArray(s, "characters", p, errors),
      location: str(s, "location", p, errors),
      ruleKeys: strArray(s, "ruleKeys", p, errors, true),
    };
  });
  return done({ chapterIndex: ci, scenes }, errors);
}

export function validateChapterText(text: string, chapterIndex: number): ValidationResult<ChapterText> {
  const t = text.trim();
  if (t.length < MIN_PROSE_CHARS) {
    return { ok: false, errors: [`chapter_text must be at least ${MIN_PROSE_CHARS} characters of prose`] };
  }
  return { ok: true, value: { chapterIndex, text: t } };
}

/**
 * Parse and validate raw model output for a stage. Prose stages take the text
 * as is; structured stages go through extractJson first.
 */
export function parseStage<S extends StageName>(
  stage: S,
  raw: string,
  opts: { chapterIndex?: number; expectedChapters?: number } = {},
): ValidationResult<StageDataMap[S]> {
  const r = parseStageUntyped(stage, raw, opts);
  return r as ValidationResult<StageDataMap[S]>;
}

function parseStageUntyped(
  stage: StageName,
  raw: string,
  opts: { chapterIndex?: number; expectedChapters?: number },
): ValidationResult<unknown> {
  if (stage === "book_preview") return validateBookPreview(raw);
  if (stage === "chapter_text") return validateChapterText(raw, opts.chapterIndex ?? 1);
  const json = extractJson(raw);
  if (json === undefined) return { ok: false, errors: [`${stage}: no parseable JSON found in output`] };
  switch (stage) {
    case "book_plan":
      return validateBookPlan(json);
    case "chapters_plan":
      return validateChaptersPlan(json, opts.expectedChapters);
    case "characters_list":
      return validateCharactersList(json);
    case "scene_breakdown":
      return validateSceneBreakdown(json, opts.chapterIndex);
  }
}
