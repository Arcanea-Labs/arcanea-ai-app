/**
 * Character evolution ledger.
 *
 * Character state is never stored, only derived: the ledger is an append-only
 * list of `CharacterStateEvent`s and `foldCharacterState` replays them up to a
 * story-time. Why event-sourcing: drafts get written out of order (a flashback
 * in chapter 9 happens before chapter 2), so "the state at time T" must be
 * computable from any subset of scenes, and an impossible transition can be
 * pinned to the exact scene that introduced it.
 */

import { finding, formatStoryTime, ORDINAL_TIME, toTick } from "./types.js";
import type { Finding, StoryTime, TimeModel } from "./types.js";

export type CharacterStatus = "alive" | "dead" | "missing" | "transformed";

export interface CharacterStateChanges {
  traits?: { add?: string[]; remove?: string[] };
  /** otherCharacterId -> relationship label; `null` ends the relationship. */
  relationships?: Record<string, string | null>;
  knowledge?: {
    learns?: string[];
    forgets?: string[];
    /** Facts the character acts on in this scene. They must already be known. */
    uses?: string[];
  };
  /** Where the character is at this story-time. */
  location?: string;
  status?: CharacterStatus;
  /** Required explanation when a dead character returns to any other status. */
  statusReason?: string;
}

export interface CharacterStateEvent {
  characterId: string;
  sceneRef: string;
  at: StoryTime;
  changes: CharacterStateChanges;
}

export interface CharacterInitialState {
  status?: CharacterStatus;
  location?: string;
  traits?: string[];
  relationships?: Record<string, string>;
  knowledge?: string[];
}

export interface CharacterState {
  characterId: string;
  status: CharacterStatus;
  location?: string;
  traits: string[];
  relationships: Record<string, string>;
  knowledge: string[];
  /** Tick the state was folded to. */
  asOf: number;
  appliedEvents: number;
  lastSceneRef?: string;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
  }
  return value;
}

/**
 * Append-only store. There is deliberately no update or delete: a correction
 * is a new event, so the history of how a character changed stays auditable.
 */
export class CharacterLedger {
  readonly #events: CharacterStateEvent[] = [];

  append(event: CharacterStateEvent): number {
    if (!event || typeof event.characterId !== "string" || event.characterId.length === 0) {
      throw new TypeError("CharacterStateEvent.characterId is required");
    }
    if (typeof event.sceneRef !== "string" || event.sceneRef.length === 0) {
      throw new TypeError("CharacterStateEvent.sceneRef is required");
    }
    if (event.at === undefined || event.at === null) {
      throw new TypeError("CharacterStateEvent.at is required");
    }
    // Copy before freezing so the caller's object is not frozen under them.
    this.#events.push(deepFreeze(structuredClone(event)));
    return this.#events.length;
  }

  get size(): number {
    return this.#events.length;
  }

  /** Snapshot in append order. The array and its events are frozen. */
  events(): readonly CharacterStateEvent[] {
    return Object.freeze([...this.#events]);
  }

  forCharacter(characterId: string): readonly CharacterStateEvent[] {
    return Object.freeze(this.#events.filter((e) => e.characterId === characterId));
  }
}

interface Ordered {
  event: CharacterStateEvent;
  tick: number;
  seq: number;
}

/** Story-time order; ties keep append order so same-scene sequences stay stable. */
function order(events: readonly CharacterStateEvent[], model: TimeModel): Ordered[] {
  return events
    .map((event, seq) => ({ event, tick: toTick(event.at, model), seq }))
    .sort((a, b) => a.tick - b.tick || a.seq - b.seq);
}

export interface FoldOptions {
  characterId?: string;
  model?: TimeModel;
  initial?: CharacterInitialState;
}

/**
 * Replays every event at or before `atTime` (inclusive) and returns the
 * character's state. Events for other characters are rejected unless
 * `characterId` selects one, so a mixed ledger cannot silently blend people.
 */
export function foldCharacterState(
  events: readonly CharacterStateEvent[],
  atTime: StoryTime,
  options: FoldOptions = {},
): CharacterState {
  const model = options.model ?? ORDINAL_TIME;
  const ids = new Set(events.map((e) => e.characterId));
  const characterId = options.characterId ?? (ids.size === 1 ? [...ids][0] : undefined);
  if (characterId === undefined) {
    throw new TypeError(
      ids.size === 0
        ? "foldCharacterState needs options.characterId when there are no events"
        : `foldCharacterState got events for ${ids.size} characters; pass options.characterId`,
    );
  }

  const limit = toTick(atTime, model);
  const init = options.initial ?? {};
  const traits = new Set(init.traits ?? []);
  const relationships = new Map(Object.entries(init.relationships ?? {}));
  const knowledge = new Set(init.knowledge ?? []);
  let status: CharacterStatus = init.status ?? "alive";
  let location = init.location;
  let applied = 0;
  let lastSceneRef: string | undefined;

  for (const { event, tick } of order(events.filter((e) => e.characterId === characterId), model)) {
    if (tick > limit) break;
    const c = event.changes;
    for (const t of c.traits?.add ?? []) traits.add(t);
    for (const t of c.traits?.remove ?? []) traits.delete(t);
    for (const [other, label] of Object.entries(c.relationships ?? {})) {
      if (label === null) relationships.delete(other);
      else relationships.set(other, label);
    }
    for (const k of c.knowledge?.learns ?? []) knowledge.add(k);
    for (const k of c.knowledge?.forgets ?? []) knowledge.delete(k);
    if (c.location !== undefined) location = c.location;
    if (c.status !== undefined) status = c.status;
    applied++;
    lastSceneRef = event.sceneRef;
  }

  return {
    characterId,
    status,
    location,
    traits: [...traits].sort(),
    relationships: Object.fromEntries([...relationships].sort(([a], [b]) => a.localeCompare(b))),
    knowledge: [...knowledge].sort(),
    asOf: limit,
    appliedEvents: applied,
    lastSceneRef,
  };
}

export interface TransitionCheckOptions {
  model?: TimeModel;
  /** Per-character starting state (e.g. knowledge they begin the story with). */
  initial?: Record<string, CharacterInitialState>;
}

/**
 * Finds transitions no reader would accept:
 * - DEAD_ACTOR: any event after the character died that is not an explicit revival.
 * - UNEXPLAINED_RESURRECTION: a revival without `statusReason`.
 * - KNOWLEDGE_BEFORE_LEARNED: a fact used earlier in story-time than it is learned.
 * - UNSOURCED_KNOWLEDGE: a fact used that is never learned nor initially known.
 * - KNOWLEDGE_AFTER_FORGOTTEN: a fact used after it was forgotten and not relearned.
 * - BILOCATION: two different locations at the same story-time.
 */
export function detectImpossibleTransitions(
  events: readonly CharacterStateEvent[],
  options: TransitionCheckOptions = {},
): Finding[] {
  const model = options.model ?? ORDINAL_TIME;
  const findings: Finding[] = [];
  const byCharacter = new Map<string, CharacterStateEvent[]>();
  for (const e of events) {
    const list = byCharacter.get(e.characterId) ?? [];
    list.push(e);
    byCharacter.set(e.characterId, list);
  }

  for (const [id, list] of byCharacter) {
    const ordered = order(list, model);
    const init = options.initial?.[id] ?? {};

    // Death and revival.
    let death: Ordered | undefined;
    let deadFromStart = init.status === "dead";
    for (const o of ordered) {
      const isDead = deadFromStart || death !== undefined;
      const revives = o.event.changes.status !== undefined && o.event.changes.status !== "dead";
      if (isDead && revives) {
        if (!o.event.changes.statusReason) {
          findings.push(finding("UNEXPLAINED_RESURRECTION", "warning",
            `${id} returns as "${o.event.changes.status}" at ${formatStoryTime(o.event.at)} after dying${death ? ` in ${death.event.sceneRef}` : " before the story"}, with no statusReason`,
            [death?.event.sceneRef, o.event.sceneRef], [id]));
        }
        death = undefined;
        deadFromStart = false;
      } else if (isDead) {
        findings.push(finding("DEAD_ACTOR", "error",
          `${id} appears at ${formatStoryTime(o.event.at)} but died${death ? ` at ${formatStoryTime(death.event.at)} (${death.event.sceneRef})` : " before the story began"}`,
          [death?.event.sceneRef, o.event.sceneRef], [id]));
      } else if (o.event.changes.status === "dead") {
        death = o;
      }
    }

    // Knowledge provenance: each fact's timeline of learn/forget.
    const initiallyKnown = new Set(init.knowledge ?? []);
    const learns = new Map<string, Ordered[]>();
    const forgets = new Map<string, Ordered[]>();
    for (const o of ordered) {
      for (const k of o.event.changes.knowledge?.learns ?? []) learns.set(k, [...(learns.get(k) ?? []), o]);
      for (const k of o.event.changes.knowledge?.forgets ?? []) forgets.set(k, [...(forgets.get(k) ?? []), o]);
    }
    const before = (a: Ordered, b: Ordered) => a.tick < b.tick || (a.tick === b.tick && a.seq <= b.seq);
    for (const o of ordered) {
      for (const fact of o.event.changes.knowledge?.uses ?? []) {
        const learnedBy = (learns.get(fact) ?? []).filter((l) => before(l, o));
        const known = initiallyKnown.has(fact) || learnedBy.length > 0;
        if (!known) {
          const later = learns.get(fact)?.[0];
          if (later) {
            findings.push(finding("KNOWLEDGE_BEFORE_LEARNED", "error",
              `${id} uses "${fact}" at ${formatStoryTime(o.event.at)} but only learns it at ${formatStoryTime(later.event.at)}`,
              [o.event.sceneRef, later.event.sceneRef], [id, fact]));
          } else {
            findings.push(finding("UNSOURCED_KNOWLEDGE", "warning",
              `${id} uses "${fact}" at ${formatStoryTime(o.event.at)}, which no scene shows them learning`,
              [o.event.sceneRef], [id, fact]));
          }
          continue;
        }
        const lastLearn = learnedBy[learnedBy.length - 1];
        const lostAfter = (forgets.get(fact) ?? []).filter(
          (f) => before(f, o) && f.seq !== o.seq && (!lastLearn || !before(f, lastLearn)),
        );
        if (lostAfter.length > 0) {
          const f = lostAfter[lostAfter.length - 1];
          findings.push(finding("KNOWLEDGE_AFTER_FORGOTTEN", "warning",
            `${id} uses "${fact}" at ${formatStoryTime(o.event.at)} after forgetting it at ${formatStoryTime(f.event.at)}`,
            [f.event.sceneRef, o.event.sceneRef], [id, fact]));
        }
      }
    }

    // One body, one place per instant.
    const byTick = new Map<number, Ordered[]>();
    for (const o of ordered) {
      if (o.event.changes.location === undefined) continue;
      byTick.set(o.tick, [...(byTick.get(o.tick) ?? []), o]);
    }
    for (const group of byTick.values()) {
      const places = new Set(group.map((g) => g.event.changes.location));
      if (places.size > 1) {
        findings.push(finding("BILOCATION", "error",
          `${id} is in ${[...places].map((p) => `"${p}"`).join(" and ")} at ${formatStoryTime(group[0].event.at)}`,
          group.map((g) => g.event.sceneRef), [id]));
      }
    }
  }
  return findings;
}
