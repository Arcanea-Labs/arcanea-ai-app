import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { checkContinuity, planStory, scoreDiversity } from "./narrative-intelligence.js";

/**
 * Registration for the narrative_* tools. It lives beside the tools rather
 * than in src/registrations/ only because of lane ownership on the
 * narrative-intelligence slice; it follows the same registerTool pattern.
 */

const storyTime = z.union([
  z.number().finite(),
  z.object({
    year: z.number().int(),
    month: z.number().int().optional(),
    day: z.number().int().optional(),
    hour: z.number().int().optional(),
  }),
]);

const timeModel = z.union([
  z.object({ kind: z.literal("ordinal") }),
  z.object({
    kind: z.literal("calendar"),
    monthsPerYear: z.number().int().positive(),
    daysPerMonth: z.number().int().positive(),
    hoursPerDay: z.number().int().positive(),
  }),
]);

const id = z.string().min(1).max(200);
const ids = z.array(id).max(200);

export const characterEventSchema = z.object({
  characterId: id,
  sceneRef: id,
  at: storyTime,
  changes: z.object({
    traits: z.object({ add: ids.optional(), remove: ids.optional() }).optional(),
    relationships: z.record(z.string().max(200), z.string().max(200).nullable()).optional(),
    knowledge: z.object({ learns: ids.optional(), forgets: ids.optional(), uses: ids.optional() }).optional(),
    location: z.string().max(200).optional(),
    status: z.enum(["alive", "dead", "missing", "transformed"]).optional(),
    statusReason: z.string().max(1000).optional(),
  }),
});

export const timelineEventSchema = z.object({
  id,
  label: z.string().max(500).optional(),
  sceneRef: id.optional(),
  at: storyTime.optional(),
  end: storyTime.optional(),
});

export const constraintSchema = z.object({
  id: id.optional(),
  a: id,
  relation: z.enum(["before", "after", "during"]),
  b: id,
  sceneRef: id.optional(),
});

export const sceneFactsSchema = z.object({
  sceneRef: id,
  at: storyTime.optional(),
  context: z.object({ universeId: id.optional(), seriesId: id.optional(), bookId: id.optional() }).optional(),
  characters: z
    .array(z.object({ id, gatesOpen: z.number().int().optional(), rank: z.string().max(100).optional(), house: z.string().max(100).optional(), element: z.string().max(100).optional() }))
    .max(200)
    .optional(),
  magic: z.array(z.object({ casterId: id, element: z.string().max(100).optional(), gate: z.number().int().optional() })).max(200).optional(),
  guardians: z
    .array(z.object({ name: z.string().max(100), gate: z.number().int().optional(), element: z.string().max(100).optional(), domain: z.string().max(200).optional(), godbeast: z.string().max(100).optional() }))
    .max(50)
    .optional(),
  godbeasts: z.array(z.object({ name: z.string().max(100), gate: z.number().int().optional() })).max(50).optional(),
  houses: z.array(z.string().max(100)).max(50).optional(),
  elements: z.array(z.string().max(100)).max(50).optional(),
});

const initialState = z.object({
  status: z.enum(["alive", "dead", "missing", "transformed"]).optional(),
  location: z.string().max(200).optional(),
  traits: ids.optional(),
  relationships: z.record(z.string().max(200), z.string().max(200)).optional(),
  knowledge: ids.optional(),
});

export const planStoryInput = z.object({
  prompt: z.string().min(3).max(4000),
  chapters: z.number().int().min(1).max(200).optional(),
  worldRules: z.array(z.string().min(1).max(500)).max(50).optional(),
});

export const checkContinuityInput = z.object({
  characterEvents: z.array(characterEventSchema).max(5000),
  timelineEvents: z.array(timelineEventSchema).max(5000),
  constraints: z.array(constraintSchema).max(5000),
  sceneFacts: z.array(sceneFactsSchema).max(2000).optional(),
  initialStates: z.record(id, initialState).optional(),
  timeModel: timeModel.optional(),
});

/** A plan tree node. Children are walked by world-engine, so they are not re-validated here. */
const planNode = z.looseObject({
  id,
  level: z.enum(["universe", "series", "book", "arc", "chapter", "scene"]),
  title: z.string().max(500),
});

export const scoreDiversityInput = z
  .object({
    texts: z
      .array(z.union([z.string().max(200_000), z.object({ id, text: z.string().max(200_000) })]))
      .max(200)
      .optional(),
    plans: z.array(planNode).max(50).optional(),
    repetitionN: z.number().int().min(2).max(8).optional(),
    maxPhrases: z.number().int().min(1).max(200).optional(),
  })
  .refine((v) => (v.texts?.length ?? 0) + (v.plans?.length ?? 0) > 0, {
    message: "provide texts[] or plans[] (at least one item)",
  });

export function registerNarrativeTools(server: McpServer) {
  server.registerTool(
    "narrative_plan_story",
    {
      description:
        "Plan a story with @arcanea/narrative-planner (book preview, book plan, chapter plans, character list only; no prose). Output is a candidate, never canon. Requires a configured generation model; this server has none, so it returns a no_model_configured error.",
      inputSchema: planStoryInput,
    },
    async (args) => planStory(args),
  );

  server.registerTool(
    "narrative_check_continuity",
    {
      description:
        "Check story continuity with world-engine, without a model: character ledger (dead actors, unexplained resurrections, unsourced knowledge, bilocation), timeline constraints (cycles, contradictions) and canon world rules per scene.",
      inputSchema: checkContinuityInput,
    },
    async (args) => checkContinuity(args),
  );

  server.registerTool(
    "narrative_score_diversity",
    {
      description:
        "Score creative diversity with world-engine, without a model: distinct-1/2/3 and cross-text repeated phrases for texts, leave-one-out structural novelty for plan trees.",
      inputSchema: scoreDiversityInput,
    },
    async (args) => scoreDiversity(args),
  );
}
