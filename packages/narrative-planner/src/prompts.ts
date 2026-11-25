/**
 * Default prompt templates. Original to Arcanea, model-agnostic, instruction
 * style. They do NOT reproduce PageStorm's training template, so how well
 * PageStorm follows them is unmeasured. Callers can supply their own builder.
 */

import type { StageName } from "./stages.js";
import type { StageResult } from "./runner-types.js";

export interface PromptContext {
  premise: string;
  chapterCount: number;
  /** Set for chapter-level stages. */
  chapterIndex?: number;
  completed: readonly StageResult[];
  /** Validation errors from the previous attempt, if this is a retry. */
  retryErrors?: readonly string[];
}

export type PromptBuilder = (stage: StageName, ctx: PromptContext) => string;

const SCHEMAS: Record<StageName, string> = {
  book_preview: "Plain prose, one to three paragraphs. No JSON, no headings.",
  book_plan:
    '{"title": string, "worldRules": [{"key": "kebab-case-id", "rule": string, "forbiddenTerms": [string]}], ' +
    '"storyArcs": [{"name": string, "description": string}], ' +
    '"characterArchetypes": [{"archetype": string, "role": string}], ' +
    '"writingStyle": {"pov": string, "tense": string, "tone": string, "notes": string}}',
  chapters_plan:
    '{"chapters": [{"index": 1, "name": string, "targetWords": integer, "summary": [string], ' +
    '"narrativeFocus": string, "ruleKeys": [worldRule key], "embeddingSpace": {"action": 0-100, ' +
    '"dialog": 0-100, "world_building": 0-100, "exposition": 0-100, "romantic": 0-100, "pacing": 0-100}}]}',
  characters_list:
    '{"characters": [{"name": string, "role": string, "description": string, "archetype": string}]}',
  scene_breakdown:
    '{"chapterIndex": integer, "scenes": [{"index": 1, "summary": string, "characters": [name from characters_list], ' +
    '"location": string, "ruleKeys": [worldRule key]}]}',
  chapter_text:
    "Plain prose for this chapter only. You may cite a world rule inline as [rule:key]. No JSON, no headings.",
};

const INSTRUCTIONS: Record<StageName, string> = {
  book_preview: "Write a short preview of the book this premise could become: the situation, the pressure, the hook.",
  book_plan: "Plan the book. Declare world rules with stable keys. List terms the world forbids in forbiddenTerms.",
  chapters_plan: "Plan every chapter in order. Each chapter cites the world rule keys it depends on.",
  characters_list: "List the cast. Use original names only.",
  scene_breakdown: "Break this chapter into scenes. Use only characters from the cast list.",
  chapter_text: "Write this chapter, following its plan and scenes, in the declared writing style.",
};

function section(title: string, body: string): string {
  return `## ${title}\n${body}\n`;
}

function pick<S extends StageName>(completed: readonly StageResult[], stage: S, unit?: string): StageResult<S> | undefined {
  return completed.find((r) => r.stage === stage && (unit === undefined || r.unit === unit)) as StageResult<S> | undefined;
}

export const defaultPromptBuilder: PromptBuilder = (stage, ctx) => {
  const parts: string[] = [];
  parts.push(section("Task", `STAGE: ${stage}\n${INSTRUCTIONS[stage]}`));
  parts.push(section("Premise", ctx.premise));
  parts.push(section("Shape", `CHAPTER_COUNT: ${ctx.chapterCount}` + (ctx.chapterIndex ? `\nCHAPTER_INDEX: ${ctx.chapterIndex}` : "")));

  const preview = pick(ctx.completed, "book_preview");
  if (preview && stage !== "book_preview") parts.push(section("Book preview", preview.data.text));
  const plan = pick(ctx.completed, "book_plan");
  if (plan) parts.push(section("Book plan", JSON.stringify(plan.data)));
  const chapters = pick(ctx.completed, "chapters_plan");
  if (chapters) {
    if (ctx.chapterIndex) {
      const ch = chapters.data.chapters.find((c) => c.index === ctx.chapterIndex);
      if (ch) parts.push(section("This chapter's plan", JSON.stringify(ch)));
    } else parts.push(section("Chapters plan", JSON.stringify(chapters.data)));
  }
  const cast = pick(ctx.completed, "characters_list");
  if (cast) parts.push(section("Cast", JSON.stringify(cast.data)));
  if (stage === "chapter_text" && ctx.chapterIndex) {
    const scenes = pick(ctx.completed, "scene_breakdown", `ch-${ctx.chapterIndex}`);
    if (scenes) parts.push(section("Scenes", JSON.stringify(scenes.data)));
  }

  parts.push(section("Output format", SCHEMAS[stage]));
  if (ctx.retryErrors && ctx.retryErrors.length > 0) {
    parts.push(section("Your previous output was rejected", ctx.retryErrors.map((e) => `- ${e}`).join("\n")));
  }
  return parts.join("\n");
};
