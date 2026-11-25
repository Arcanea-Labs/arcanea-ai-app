/**
 * Shared types for the narrative-continuity layer.
 *
 * Everything in `continuity/` is pure TypeScript over typed data: no model
 * calls, no I/O, no randomness. Canonical knowledge must stay checkable
 * without any LLM, so every checker returns structured `Finding`s that a
 * human (or a model) can act on, rather than prose verdicts.
 */

export type Severity = "error" | "warning" | "info";

/**
 * A precise, machine-readable problem report.
 *
 * `sceneRefs` always names the scene(s) that produced the conflicting facts,
 * because a continuity error is only fixable when you know where to look.
 */
export interface Finding {
  /** Stable code, e.g. "DEAD_ACTOR" or "TIMELINE_CYCLE". */
  code: string;
  severity: Severity;
  message: string;
  sceneRefs: string[];
  /** Entities involved (character ids, event ids, rule ids...). */
  subjects: string[];
}

// ── Story time ──────────────────────────────────────────────────────────────

/** A calendar instant inside a fictional calendar. Unset parts default to their first unit. */
export interface CalendarTime {
  year: number;
  month?: number;
  day?: number;
  hour?: number;
}

/**
 * Story-time is either an ordinal (a plain number: scene order, "day 12") or
 * a calendar instant. A universe picks one model; mixing them is an error.
 */
export type StoryTime = number | CalendarTime;

export type TimeModel =
  | { kind: "ordinal" }
  | {
      kind: "calendar";
      monthsPerYear: number;
      daysPerMonth: number;
      hoursPerDay: number;
    };

export const ORDINAL_TIME: TimeModel = Object.freeze({ kind: "ordinal" });

/**
 * Converts story-time into a single comparable number.
 *
 * Why a tick rather than comparing structs: every checker (ledger, timeline,
 * rules) needs a total order, and a fictional calendar can have any month or
 * day length. Flattening once, through the universe's own model, keeps all
 * comparisons consistent and makes "same instant" an exact equality.
 */
export function toTick(time: StoryTime, model: TimeModel = ORDINAL_TIME): number {
  if (typeof time === "number") {
    if (model.kind !== "ordinal") {
      throw new TypeError(`Ordinal time ${time} used in a calendar universe`);
    }
    if (!Number.isFinite(time)) throw new RangeError("Story-time must be finite");
    return time;
  }
  if (model.kind !== "calendar") {
    throw new TypeError("Calendar time used in an ordinal universe");
  }
  const { monthsPerYear, daysPerMonth, hoursPerDay } = model;
  const month = time.month ?? 1;
  const day = time.day ?? 1;
  const hour = time.hour ?? 0;
  if (month < 1 || month > monthsPerYear) throw new RangeError(`Month ${month} outside 1..${monthsPerYear}`);
  if (day < 1 || day > daysPerMonth) throw new RangeError(`Day ${day} outside 1..${daysPerMonth}`);
  if (hour < 0 || hour >= hoursPerDay) throw new RangeError(`Hour ${hour} outside 0..${hoursPerDay - 1}`);
  const days = (time.year * monthsPerYear + (month - 1)) * daysPerMonth + (day - 1);
  return days * hoursPerDay + hour;
}

export function compareStoryTime(a: StoryTime, b: StoryTime, model: TimeModel = ORDINAL_TIME): number {
  return toTick(a, model) - toTick(b, model);
}

export function formatStoryTime(time: StoryTime): string {
  if (typeof time === "number") return `t=${time}`;
  const parts = [`Y${time.year}`];
  if (time.month !== undefined) parts.push(`M${time.month}`);
  if (time.day !== undefined) parts.push(`D${time.day}`);
  if (time.hour !== undefined) parts.push(`H${time.hour}`);
  return parts.join("-");
}

export function finding(
  code: string,
  severity: Severity,
  message: string,
  sceneRefs: Array<string | undefined>,
  subjects: string[],
): Finding {
  const refs = [...new Set(sceneRefs.filter((r): r is string => typeof r === "string" && r.length > 0))];
  return { code, severity, message, sceneRefs: refs, subjects: [...new Set(subjects)] };
}
