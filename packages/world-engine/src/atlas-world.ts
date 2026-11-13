import type { World, WorldRecord, Principal, Query, Snapshot, Coordinate } from '@arcanea/schemas/atlas-world';

/** Branch ancestry is clipped at each fork: a child never inherits its parent's future. */
export function lineage(world: World, branchId: string): Map<string, number> {
  const result = new Map<string, number>();
  let id: string | null = branchId;
  let ceiling = Infinity;
  while (id) {
    if (result.has(id)) throw new Error('Cyclic timeline');
    const branch = world.branches.find(b => b.id === id);
    if (!branch) throw new Error('Unknown timeline');
    result.set(id, ceiling);
    if (branch.parentId) {
      if (branch.forkAt === null) throw new Error('Missing fork time');
      ceiling = Math.min(ceiling, branch.forkAt);
    }
    id = branch.parentId;
  }
  return result;
}

function permits(record: WorldRecord, principal: Principal, chapter: number): boolean {
  if (principal.role === 'author') return true;
  if (record.status === 'provisional' || record.audience === 'author') return false;
  if (record.revealChapter > Math.min(chapter, principal.maxChapter)) return false;
  if (principal.role === 'character') return !!principal.characterId && record.knownBy.includes(principal.characterId);
  return record.audience === 'reader';
}

/** The only outbound projection. Hidden records never reach HTML, JSON, search, counts or scene props. */
export function reconstruct(world: World, principal: Principal, query: Query): Snapshot {
  const visibleBranches = world.branches.filter(b => principal.role === 'author' || b.audience === 'reader' && b.revealChapter <= Math.min(query.chapter, principal.maxChapter));
  if (!visibleBranches.some(b => b.id === query.branchId)) throw new Error('Timeline unavailable');
  const branches = lineage(world, query.branchId);
  const latest = new Map<string, WorldRecord>();
  // Pick transaction revisions BEFORE visibility, so a withdrawn assertion cannot resurrect.
  const knownAt = Date.parse(query.knownAt);
  if (!Number.isFinite(knownAt) || !Number.isFinite(query.validAt) || !Number.isInteger(query.chapter)) throw new Error('Invalid reconstruction query');
  const candidates = world.records.filter(r => branches.has(r.branchId) && r.validFrom <= branches.get(r.branchId)! && Date.parse(r.recordedFrom) <= knownAt && (!r.recordedTo || knownAt < Date.parse(r.recordedTo)));
  const depth = [...branches.keys()];
  candidates.sort((a, b) => depth.indexOf(b.branchId) - depth.indexOf(a.branchId) || a.revision - b.revision || a.id.localeCompare(b.id));
  for (const record of candidates) latest.set(JSON.stringify([record.branchId, record.logicalId]), record);
  const overlay = new Map<string, WorldRecord>();
  for (const record of [...latest.values()].filter(r => r.validFrom <= query.validAt && (r.validTo === null || query.validAt < r.validTo)).sort((a,b) => depth.indexOf(b.branchId) - depth.indexOf(a.branchId))) overlay.set(record.logicalId,record);
  const metadataVisible = (item: { audience: string; revealChapter: number }) => principal.role === 'author' || item.audience === 'reader' && item.revealChapter <= Math.min(query.chapter, principal.maxChapter);
  const visibleSources = new Set(world.sources.filter(metadataVisible).map(s => s.id));
  const visibleEntities = new Set(world.entities.filter(e => metadataVisible(e) && (principal.role === 'author' || e.status !== 'provisional') && e.sourceIds.some(id => visibleSources.has(id))).map(e => e.id));
  const records = [...overlay.values()].filter(r => r.validFrom <= query.validAt && (r.validTo === null || query.validAt < r.validTo) && visibleBranches.some(b => b.id === r.branchId) && permits(r, principal, query.chapter) && r.sourceIds.every(id => visibleSources.has(id)) && visibleEntities.has(r.fact.entityId) && (r.fact.kind !== 'position' || visibleEntities.has(r.fact.locationId) && (!r.fact.viaPortalId || visibleEntities.has(r.fact.viaPortalId))) && (r.fact.kind !== 'observation' || visibleEntities.has(r.fact.observerId))).sort((a, b) => a.validFrom - b.validFrom || a.id.localeCompare(b.id));
  const allowed = new Set<string>();
  for (const r of records) {
    allowed.add(r.fact.entityId);
    if (r.fact.kind === 'position') { allowed.add(r.fact.locationId); if (r.fact.viaPortalId) allowed.add(r.fact.viaPortalId); }
    if (r.fact.kind === 'observation') allowed.add(r.fact.observerId);
  }
  // Parent containment is included only when independently revealed; never traverse secret ancestors.
  const entities = world.entities.filter(e => allowed.has(e.id) && visibleEntities.has(e.id)).map(e => ({ ...e, sourceIds: e.sourceIds.filter(id => visibleSources.has(id)), parentId: e.parentId && allowed.has(e.parentId) && visibleEntities.has(e.parentId) ? e.parentId : null }));
  const sourceIds = new Set([...records.flatMap(r => r.sourceIds), ...entities.flatMap(e => e.sourceIds)]);
  const sources = world.sources.filter(s => sourceIds.has(s.id));
  const positions = new Map<string, string>();
  const observations = new Map<string, WorldRecord[]>();
  for (const r of records) {
    if (r.fact.kind === 'position') positions.set(r.fact.entityId, r.fact.locationId);
    if (r.fact.kind === 'observation') {
      const key = `${r.fact.entityId}:${r.fact.predicate}`;
      observations.set(key, [...(observations.get(key) || []), r]);
    }
  }
  const conflicts: Snapshot['conflicts'] = [];
  for (const group of observations.values()) {
    const values = new Set(group.map(r => r.fact.kind === 'observation' ? r.fact.value : ''));
    const fact = group[0].fact;
    if (values.size > 1 && fact.kind === 'observation') conflicts.push({ entityId: fact.entityId, predicate: fact.predicate, recordIds: group.map(r => r.id) });
  }
  const visibleIds = new Set(visibleBranches.map(b => b.id));
  return { id: world.id, namespace: world.namespace, title: world.title, synthetic: world.synthetic, sources, entities, branches: visibleBranches.map(b => ({ ...b, parentId: b.parentId && visibleIds.has(b.parentId) ? b.parentId : null, forkAt: b.parentId && !visibleIds.has(b.parentId) ? null : b.forkAt })), records: records.map(r => ({ ...r, knownBy: principal.role === 'author' ? r.knownBy : r.knownBy.filter(id => allowed.has(id)) })), positions: [...positions].map(([entityId, locationId]) => ({ entityId, locationId })), conflicts, query, perspective: principal.role };
}

export function distance(a: Coordinate, b: Coordinate): number {
  if (a.system !== b.system) throw new Error('Coordinate reference mismatch');
  if (a.system === 'local' && b.system === 'local') {
    if (a.frame !== b.frame) throw new Error('Reference frame mismatch');
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  }
  if (a.system === 'wgs84' && b.system === 'wgs84') {
    const rad = Math.PI / 180;
    const dlat = (b.latitude - a.latitude) * rad, dlon = (b.longitude - a.longitude) * rad;
    return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.sin(dlat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dlon / 2) ** 2));
  }
  throw new Error('Unsupported coordinate reference');
}

export function validateWorld(world: World): string[] {
  const errors: string[] = [];
  const entities = new Map(world.entities.map(e => [e.id, e]));
  const sources = new Set(world.sources.map(s => s.id));
  if (entities.size !== world.entities.length) errors.push('Duplicate entity');
  if (new Set(world.records.map(r => r.id)).size !== world.records.length) errors.push('Duplicate record');
  if (sources.size !== world.sources.length) errors.push('Duplicate source');
  if (new Set(world.branches.map(b => b.id)).size !== world.branches.length) errors.push('Duplicate branch');
  for (const b of world.branches) { try { lineage(world, b.id); } catch (e) { errors.push(String(e)); } }
  for (const e of world.entities) {
    if (e.namespace !== world.namespace) errors.push('Cross-namespace entity');
    if (e.coordinate?.system === 'wgs84' && world.namespace !== 'starlight') errors.push('Geographic coordinate in fictional world');
    if (e.coordinate?.system === 'local' && world.namespace === 'starlight') errors.push('Fictional coordinate in real world');
    const seen = new Set([e.id]); let parent = e.parentId;
    while (parent) { if (seen.has(parent)) { errors.push('Containment cycle'); break; } seen.add(parent); const p = entities.get(parent); if (!p) { errors.push('Missing container'); break; } parent = p.parentId; }
    if (e.sourceIds.some(id => !sources.has(id))) errors.push('Missing entity provenance');
  }
  for (const r of world.records) {
    if (!world.branches.some(b => b.id === r.branchId)) errors.push('Missing record timeline');
    if (!entities.has(r.fact.entityId)) errors.push('Missing subject');
    if (r.sourceIds.some(id => !sources.has(id))) errors.push('Missing record provenance');
    if (r.fact.kind === 'position') {
      if (!entities.has(r.fact.locationId)) errors.push('Missing destination');
      if (r.fact.viaPortalId && entities.get(r.fact.viaPortalId)?.kind !== 'portal') errors.push('Missing portal');
    }
    if (r.fact.kind === 'observation' && entities.get(r.fact.observerId)?.kind !== 'character') errors.push('Missing observer');
    if (r.knownBy.some(id => entities.get(id)?.kind !== 'character')) errors.push('Missing knowledge observer');
  }
  return errors;
}

export function checkJourney(from: Coordinate, to: Coordinate, seconds: number, maxMetresPerSecond: number, portal?: { approved: boolean; fromFrame: string; toFrame: string }): boolean {
  if (!Number.isFinite(seconds) || !Number.isFinite(maxMetresPerSecond) || seconds <= 0 || maxMetresPerSecond < 0) return false;
  if (portal?.approved && from.system === 'local' && to.system === 'local' && portal.fromFrame === from.frame && portal.toFrame === to.frame) return true;
  try { return distance(from, to) <= seconds * maxMetresPerSecond; } catch { return false; }
}

export { consentedLocation } from './atlas-location-consent.js';
export type { LocationConsent } from './atlas-location-consent.js';
