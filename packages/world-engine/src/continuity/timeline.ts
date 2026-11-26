/**
 * Temporal continuity: events, before/after/during constraints, and a checker
 * that finds cycles and contradictions.
 *
 * Model: every event is an interval [start, end] (an instant has start = end).
 * Each constraint becomes edges between those endpoints:
 *   A before B  ->  A.end   <  B.start     (strict)
 *   A after B   ->  B.end   <  A.start     (strict)
 *   A during B  ->  B.start <= A.start  and  A.end <= B.end   (non-strict)
 * plus the intrinsic A.start <= A.end.
 *
 * Why endpoints instead of whole events: "during" cannot be expressed as an
 * order between two events, but it is two orders between four points. With
 * points, every relation is an edge and contradictions become graph facts.
 */

import { finding, formatStoryTime, ORDINAL_TIME, toTick } from "./types.js";
import type { Finding, StoryTime, TimeModel } from "./types.js";

export interface TimelineEvent {
  id: string;
  label?: string;
  sceneRef?: string;
  /** Absolute anchor for the start. Without `end`, the event is an instant. */
  at?: StoryTime;
  end?: StoryTime;
}

export type TemporalRelation = "before" | "after" | "during";

export interface TemporalConstraint {
  /** Optional id so findings can name the constraint. */
  id?: string;
  a: string;
  relation: TemporalRelation;
  b: string;
  /** Scene asserting this ordering (e.g. "two days after the duel"). */
  sceneRef?: string;
}

interface Edge {
  from: string;
  to: string;
  strict: boolean;
  /** Human description and provenance, for findings. */
  why: string;
  sceneRefs: string[];
  constraintId?: string;
  /** The implicit start <= end edge of one event; omitted from messages. */
  intrinsic?: boolean;
}

const startOf = (id: string) => `${id}@start`;
const endOf = (id: string) => `${id}@end`;
const eventOf = (point: string) => point.slice(0, point.lastIndexOf("@"));

function constraintLabel(c: TemporalConstraint): string {
  return c.id ?? `${c.a} ${c.relation} ${c.b}`;
}

/** Tarjan's SCC. Returns component index per node. */
function stronglyConnected(nodes: string[], adj: Map<string, Edge[]>): Map<string, number> {
  let index = 0;
  let comp = 0;
  const idx = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const result = new Map<string, number>();

  const strong = (v: string) => {
    idx.set(v, index);
    low.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);
    for (const e of adj.get(v) ?? []) {
      if (!idx.has(e.to)) {
        strong(e.to);
        low.set(v, Math.min(low.get(v)!, low.get(e.to)!));
      } else if (onStack.has(e.to)) {
        low.set(v, Math.min(low.get(v)!, idx.get(e.to)!));
      }
    }
    if (low.get(v) === idx.get(v)) {
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        result.set(w, comp);
      } while (w !== v);
      comp++;
    }
  };
  for (const n of nodes) if (!idx.has(n)) strong(n);
  return result;
}

/** Shortest edge path from `from` to `to` using only nodes in one component. */
function pathWithin(from: string, to: string, adj: Map<string, Edge[]>, comp: Map<string, number>): Edge[] {
  const c = comp.get(from);
  const prev = new Map<string, Edge>();
  const queue = [from];
  const seen = new Set([from]);
  while (queue.length > 0) {
    const v = queue.shift()!;
    if (v === to) break;
    for (const e of adj.get(v) ?? []) {
      if (comp.get(e.to) !== c || seen.has(e.to)) continue;
      seen.add(e.to);
      prev.set(e.to, e);
      queue.push(e.to);
    }
  }
  const path: Edge[] = [];
  let cur = to;
  while (cur !== from && prev.has(cur)) {
    const e = prev.get(cur)!;
    path.unshift(e);
    cur = e.from;
  }
  return path;
}

interface Bound {
  tick: number;
  strict: boolean;
  anchor: string;
  trail: Edge[];
}

/** True when `a` is a tighter (greater) lower bound than `b`. */
const tighter = (a: Bound, b: Bound | undefined) =>
  !b || a.tick > b.tick || (a.tick === b.tick && a.strict && !b.strict);

export function checkTimeline(
  events: readonly TimelineEvent[],
  constraints: readonly TemporalConstraint[],
  model: TimeModel = ORDINAL_TIME,
): Finding[] {
  const findings: Finding[] = [];
  const byId = new Map<string, TimelineEvent>();
  for (const ev of events) {
    if (byId.has(ev.id)) {
      findings.push(finding("DUPLICATE_EVENT", "error", `timeline event "${ev.id}" is defined twice`,
        [byId.get(ev.id)!.sceneRef, ev.sceneRef], [ev.id]));
    }
    byId.set(ev.id, ev);
  }

  const anchors = new Map<string, number>();
  const nodes: string[] = [];
  const adj = new Map<string, Edge[]>();
  const addEdge = (e: Edge) => {
    adj.set(e.from, [...(adj.get(e.from) ?? []), e]);
  };

  for (const ev of byId.values()) {
    const s = startOf(ev.id);
    const t = endOf(ev.id);
    nodes.push(s, t);
    addEdge({ from: s, to: t, strict: false, intrinsic: true, why: `${ev.id} starts before it ends`, sceneRefs: ev.sceneRef ? [ev.sceneRef] : [] });
    try {
      if (ev.at !== undefined) {
        anchors.set(s, toTick(ev.at, model));
        anchors.set(t, toTick(ev.end ?? ev.at, model));
      } else if (ev.end !== undefined) {
        anchors.set(t, toTick(ev.end, model));
      }
    } catch (err) {
      findings.push(finding("BAD_STORY_TIME", "error", `event "${ev.id}": ${(err as Error).message}`, [ev.sceneRef], [ev.id]));
    }
    if (ev.at !== undefined && ev.end !== undefined && anchors.has(s) && anchors.get(t)! < anchors.get(s)!) {
      findings.push(finding("NEGATIVE_DURATION", "error",
        `event "${ev.id}" ends (${formatStoryTime(ev.end)}) before it starts (${formatStoryTime(ev.at)})`,
        [ev.sceneRef], [ev.id]));
      // Already reported; keep the bad end from echoing as a contradiction.
      anchors.delete(t);
    }
  }

  for (const c of constraints) {
    const missing = [c.a, c.b].filter((id) => !byId.has(id));
    if (missing.length > 0) {
      findings.push(finding("UNKNOWN_EVENT", "error",
        `constraint "${constraintLabel(c)}" references unknown event(s): ${missing.join(", ")}`, [c.sceneRef], missing));
      continue;
    }
    if (c.a === c.b) {
      findings.push(finding("SELF_CONSTRAINT", c.relation === "during" ? "info" : "error",
        `constraint "${constraintLabel(c)}" relates "${c.a}" to itself`, [c.sceneRef], [c.a]));
      // Already reported. A strict self-edge would also surface as a
      // duplicate TIMELINE_CYCLE, so no self-constraint adds edges.
      continue;
    }
    const refs = [c.sceneRef, byId.get(c.a)!.sceneRef, byId.get(c.b)!.sceneRef].filter((r): r is string => !!r);
    const why = `${c.a} ${c.relation} ${c.b}`;
    const base = { why, sceneRefs: refs, constraintId: constraintLabel(c) };
    if (c.relation === "before") addEdge({ ...base, from: endOf(c.a), to: startOf(c.b), strict: true });
    else if (c.relation === "after") addEdge({ ...base, from: endOf(c.b), to: startOf(c.a), strict: true });
    else {
      addEdge({ ...base, from: startOf(c.b), to: startOf(c.a), strict: false });
      addEdge({ ...base, from: endOf(c.a), to: endOf(c.b), strict: false });
    }
  }

  // 1. Cycles. A cycle of only "<=" just forces equality (fine); a cycle with
  //    any strict "<" demands x < x, which no timeline can satisfy.
  const comp = stronglyConnected(nodes, adj);
  const reportedComponents = new Set<number>();
  for (const edges of adj.values()) {
    for (const e of edges) {
      const c = comp.get(e.from);
      if (!e.strict || c !== comp.get(e.to) || reportedComponents.has(c!)) continue;
      reportedComponents.add(c!);
      const cycle = [e, ...pathWithin(e.to, e.from, adj, comp)];
      const involved = [...new Set(cycle.map((x) => eventOf(x.from)))];
      findings.push(finding("TIMELINE_CYCLE", "error",
        `impossible ordering cycle: ${cycle.filter((x) => !x.intrinsic).map((x) => x.why).filter((w, i, a) => a.indexOf(w) === i).join(" -> ")}`,
        cycle.flatMap((x) => x.sceneRefs), involved));
    }
  }

  // 2. Anchored contradictions. Propagate the tightest lower bound implied by
  //    any upstream anchor along the DAG of components; an anchor that sits
  //    below its implied bound contradicts the constraints. This finds
  //    indirect conflicts (A@5 before C, C before B@3) that pairwise checks miss.
  if (reportedComponents.size === 0) {
    // With no strict cycle, every component is a set of points forced equal
    // (a cycle of "<="). Collapse each to one node so the graph is a DAG.
    const members = new Map<number, string[]>();
    for (const n of nodes) members.set(comp.get(n)!, [...(members.get(comp.get(n)!) ?? []), n]);

    const compAnchor = new Map<number, { tick: number; point: string }>();
    for (const [c, pts] of members) {
      const anchored = pts.filter((p) => anchors.has(p));
      for (const p of anchored) {
        const first = compAnchor.get(c);
        if (!first) compAnchor.set(c, { tick: anchors.get(p)!, point: p });
        else if (first.tick !== anchors.get(p)) {
          findings.push(finding("TIMELINE_CONTRADICTION", "error",
            `${first.point.replace("@", " ")} (tick ${first.tick}) and ${p.replace("@", " ")} (tick ${anchors.get(p)}) are forced to the same instant by mutual "during" constraints`,
            [byId.get(eventOf(first.point))?.sceneRef, byId.get(eventOf(p))?.sceneRef],
            [eventOf(first.point), eventOf(p)]));
        }
      }
    }

    const compEdges = new Map<number, Edge[]>();
    const indeg = new Map<number, number>([...members.keys()].map((c) => [c, 0]));
    for (const edges of adj.values()) {
      for (const e of edges) {
        const [a, b] = [comp.get(e.from)!, comp.get(e.to)!];
        if (a === b) continue;
        compEdges.set(a, [...(compEdges.get(a) ?? []), e]);
        indeg.set(b, indeg.get(b)! + 1);
      }
    }

    const queue = [...indeg].filter(([, d]) => d === 0).map(([c]) => c);
    const bound = new Map<number, Bound>();
    while (queue.length > 0) {
      const c = queue.shift()!;
      const own = compAnchor.get(c);
      const incoming = bound.get(c);
      const violated = !!own && !!incoming && (own.tick < incoming.tick || (own.tick === incoming.tick && incoming.strict));
      if (own && incoming && violated) {
        const chain = incoming.trail.filter((x) => !x.intrinsic).map((x) => x.why).filter((w, i, a) => a.indexOf(w) === i);
        findings.push(finding("TIMELINE_CONTRADICTION", "error",
          `${own.point.replace("@", " ")} is anchored at tick ${own.tick}, but ${incoming.anchor.replace("@", " ")} (tick ${incoming.tick}) must come ${incoming.strict ? "strictly " : ""}earlier via ${chain.join(" -> ")}`,
          [byId.get(eventOf(incoming.anchor))?.sceneRef, ...incoming.trail.flatMap((x) => x.sceneRefs), byId.get(eventOf(own.point))?.sceneRef],
          [eventOf(incoming.anchor), eventOf(own.point)]));
      }
      // An anchor restarts the bound from itself unless the incoming one is
      // tighter, so a trail always names the nearest binding anchor. After a
      // reported contradiction the anchor restarts unconditionally: carrying
      // the contested bound onward would only echo the same conflict at every
      // later point (e.g. the violated event's own end).
      let out: Bound | undefined = incoming;
      if (own) {
        const self: Bound = { tick: own.tick, strict: false, anchor: own.point, trail: [] };
        if (violated || tighter(self, incoming)) out = self;
      }
      for (const e of compEdges.get(c) ?? []) {
        const to = comp.get(e.to)!;
        if (out) {
          const next: Bound = { tick: out.tick, strict: out.strict || e.strict, anchor: out.anchor, trail: [...out.trail, e] };
          if (tighter(next, bound.get(to))) bound.set(to, next);
        }
        indeg.set(to, indeg.get(to)! - 1);
        if (indeg.get(to) === 0) queue.push(to);
      }
    }
  }

  return findings;
}

/**
 * A consistent reading order for events, earliest first, when one exists.
 * Ties are broken by anchor tick, then id, so the result is deterministic.
 * Returns null when `checkTimeline` reports any error.
 */
export function orderTimeline(
  events: readonly TimelineEvent[],
  constraints: readonly TemporalConstraint[],
  model: TimeModel = ORDINAL_TIME,
): string[] | null {
  if (checkTimeline(events, constraints, model).some((f) => f.severity === "error")) return null;
  const ids = events.map((e) => e.id);
  const succ = new Map<string, Set<string>>(ids.map((i) => [i, new Set()]));
  const indeg = new Map<string, number>(ids.map((i) => [i, 0]));
  const link = (from: string, to: string) => {
    if (from === to || succ.get(from)!.has(to)) return;
    succ.get(from)!.add(to);
    indeg.set(to, indeg.get(to)! + 1);
  };
  for (const c of constraints) {
    if (c.relation === "before") link(c.a, c.b);
    else if (c.relation === "after") link(c.b, c.a);
    else link(c.b, c.a); // the container is introduced first
  }
  const tick = (id: string) => {
    const at = events.find((e) => e.id === id)?.at;
    return at === undefined ? Number.POSITIVE_INFINITY : toTick(at, model);
  };
  const ready = ids.filter((i) => indeg.get(i) === 0);
  const out: string[] = [];
  while (ready.length > 0) {
    ready.sort((x, y) => tick(x) - tick(y) || x.localeCompare(y));
    const v = ready.shift()!;
    out.push(v);
    for (const w of succ.get(v)!) {
      indeg.set(w, indeg.get(w)! - 1);
      if (indeg.get(w) === 0) ready.push(w);
    }
  }
  return out.length === ids.length ? out : null;
}
