/**
 * Hierarchical narrative plans: Universe > Series > Book > Arc > Chapter > Scene.
 *
 * The Arc level wraps the existing world-engine `NarrativeArc` (produced by
 * `weaveNarrative`) instead of redefining title/type/theme/stakes/acts, and a
 * chapter points at one of that arc's `NarrativeAct`s by act number. That keeps
 * one definition of "what an arc is" across the engine.
 */

import type { NarrativeAct, NarrativeArc } from "../types.js";
import { finding, ORDINAL_TIME, toTick } from "./types.js";
import type { Finding, StoryTime, TimeModel } from "./types.js";

export type PlanLevel = "universe" | "series" | "book" | "arc" | "chapter" | "scene";

/** Fields every plan node may carry. */
export interface PlanNodeBase {
  id: string;
  title: string;
  summary?: string;
  /**
   * A fixed-length numeric description of the node's shape (pacing, tone,
   * conflict mix...). How it is produced is the caller's business; the
   * diversity metrics only require that vectors in one corpus share a length.
   */
  embedding_space?: number[];
  /** Archetypes the node leans on (e.g. "mentor", "threshold-guardian"). */
  archetypes?: string[];
}

export interface ScenePlan extends PlanNodeBase {
  level: "scene";
  at?: StoryTime;
  locationId?: string;
  participants: string[];
  povCharacterId?: string;
}

export interface ChapterPlan extends PlanNodeBase {
  level: "chapter";
  /** Which act of the parent arc this chapter serves (`NarrativeAct.act`). */
  act?: NarrativeAct["act"];
  /** Optional monomyth stage number, matching world-engine MONOMYTH_STAGES. */
  monomythStage?: number;
  scenes: ScenePlan[];
}

export interface ArcPlan extends PlanNodeBase {
  level: "arc";
  /** The arc's narrative definition — reused, not duplicated. */
  narrative: NarrativeArc;
  chapters: ChapterPlan[];
}

export interface BookPlan extends PlanNodeBase {
  level: "book";
  arcs: ArcPlan[];
}

export interface SeriesPlan extends PlanNodeBase {
  level: "series";
  books: BookPlan[];
}

export interface UniversePlan extends PlanNodeBase {
  level: "universe";
  timeModel: TimeModel;
  series: SeriesPlan[];
}

export type PlanNode = UniversePlan | SeriesPlan | BookPlan | ArcPlan | ChapterPlan | ScenePlan;

export interface LocatedNode<T extends PlanNode = PlanNode> {
  node: T;
  /** Slash-joined ids from the universe down to this node. Used as sceneRef. */
  path: string;
}

function childrenOf(node: PlanNode): PlanNode[] {
  switch (node.level) {
    case "universe": return node.series;
    case "series": return node.books;
    case "book": return node.arcs;
    case "arc": return node.chapters;
    case "chapter": return node.scenes;
    case "scene": return [];
  }
}

/** Depth-first, document-order traversal of every node with its path. */
export function walkPlan(root: PlanNode): LocatedNode[] {
  const out: LocatedNode[] = [];
  const visit = (node: PlanNode, prefix: string) => {
    const path = prefix ? `${prefix}/${node.id}` : node.id;
    out.push({ node, path });
    for (const child of childrenOf(node)) visit(child, path);
  };
  visit(root, "");
  return out;
}

/** All scenes in reading order; `path` is the canonical sceneRef. */
export function collectScenes(root: PlanNode): Array<LocatedNode<ScenePlan>> {
  return walkPlan(root).filter((l): l is LocatedNode<ScenePlan> => l.node.level === "scene");
}

/**
 * Turns a `NarrativeArc` (e.g. from `weaveNarrative`) into an `ArcPlan` with
 * one empty chapter per act, so a generated arc can be refined into scenes
 * without re-entering its acts by hand.
 */
export function scaffoldArcPlan(id: string, narrative: NarrativeArc): ArcPlan {
  return {
    level: "arc",
    id,
    title: narrative.title,
    summary: narrative.stakes,
    narrative,
    chapters: narrative.acts.map((act) => ({
      level: "chapter" as const,
      id: `${id}-act-${act.act}`,
      title: act.title,
      summary: act.summary,
      act: act.act,
      scenes: [],
    })),
  };
}

const EXPECTED_CHILD: Partial<Record<PlanLevel, PlanLevel>> = {
  universe: "series",
  series: "book",
  book: "arc",
  arc: "chapter",
  chapter: "scene",
};

/**
 * Structural checks a plan must pass before continuity checks mean anything:
 * unique ids per level, correct nesting, chapters pointing at real acts, and
 * scene times that the universe's time model can read.
 */
export function validatePlanStructure(universe: UniversePlan): Finding[] {
  const findings: Finding[] = [];
  const seen = new Map<string, string>();
  const model = universe.timeModel ?? ORDINAL_TIME;

  const visit = (node: PlanNode, path: string) => {
    const key = `${node.level}:${node.id}`;
    const prior = seen.get(key);
    if (prior !== undefined) {
      findings.push(finding("DUPLICATE_PLAN_ID", "error",
        `${node.level} id "${node.id}" is used at ${prior} and ${path}`, [prior, path], [node.id]));
    } else {
      seen.set(key, path);
    }

    const expected = EXPECTED_CHILD[node.level];
    for (const child of childrenOf(node)) {
      if (child.level !== expected) {
        findings.push(finding("BAD_NESTING", "error",
          `${child.level} "${child.id}" cannot sit directly under ${node.level} "${node.id}"`,
          [`${path}/${child.id}`], [child.id]));
      }
    }

    if (node.level === "arc") {
      const acts = new Set(node.narrative.acts.map((a) => a.act));
      for (const chapter of node.chapters) {
        if (chapter.act !== undefined && !acts.has(chapter.act)) {
          findings.push(finding("UNKNOWN_ACT", "error",
            `chapter "${chapter.id}" serves act ${chapter.act}, but arc "${node.id}" has acts [${[...acts].join(", ")}]`,
            [`${path}/${chapter.id}`], [chapter.id, node.id]));
        }
      }
    }

    if (node.level === "scene" && node.at !== undefined) {
      try {
        // toTick validates both the kind and the calendar ranges.
        toTick(node.at, model);
      } catch (err) {
        findings.push(finding("BAD_STORY_TIME", "error",
          `scene "${node.id}": ${(err as Error).message}`, [path], [node.id]));
      }
    }

    if (node.level !== "scene" && childrenOf(node).length === 0) {
      findings.push(finding("EMPTY_PLAN_NODE", "info",
        `${node.level} "${node.id}" has no children yet`, [path], [node.id]));
    }

    for (const child of childrenOf(node)) visit(child, `${path}/${child.id}`);
  };

  visit(universe, universe.id);
  return findings;
}
