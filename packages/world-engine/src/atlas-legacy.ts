import type { World } from '@arcanea/schemas/atlas-world';
import { projectAtlasStaging, type AtlasStagingInput } from './geography.js';

/** Reuse existing geometry/containment validation. A staging packet never becomes approved canon. */
export function atlasStagingToWorld(input: AtlasStagingInput): World {
  const projected = projectAtlasStaging(input);
  const identities = [...new Map(projected.features.map(f => [f.entityId, f])).values()];
  const sourceMap = new Map(projected.features.map(f => [f.source.sha256, f.source]));
  return {
    id: projected.timeline.worldId, namespace: 'arcanea', title: projected.title, synthetic: false,
    sources: [...sourceMap].map(([sha256, source]) => ({ id: sha256, title: source.path, uri: `urn:arcanea:source:${sha256}`, sha256, locator: source.path, synthetic: false, revealChapter: 0, audience: 'author' })),
    branches: [{ id: projected.timelineId, name: 'Existing staging timeline', parentId: null, forkAt: null, revealChapter: 0, audience: 'reader' }],
    entities: identities.map(f => ({ id: f.entityId, namespace: 'arcanea', kind: f.kind === 'region' ? 'region' : 'location', name: f.label, summary: f.description, coordinate: null, parentId: f.parentId, sourceIds: [f.source.sha256], status: 'provisional', revealChapter: 0, audience: 'author' })),
    records: projected.features.map(f => ({ id: f.assertionId, logicalId: f.assertionId, revision: 1, branchId: projected.timelineId, validFrom: f.validity.from, validTo: f.validity.to, recordedFrom: '2026-11-13T00:00:00Z', recordedTo: null, revealChapter: 0, chapterTitle: 'Existing staging source', chapterHref: null, title: f.label, detail: f.description, audience: 'author', knownBy: [], sourceIds: [f.source.sha256], status: 'provisional', fact: { kind: 'assertion', entityId: f.entityId, predicate: 'geography-staging', value: JSON.stringify(f.geometry) } })),
  };
}
