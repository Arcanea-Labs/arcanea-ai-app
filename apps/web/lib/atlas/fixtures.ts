// Server-only data. This file must never be imported by client components.
import { World, type WorldRecord } from '@arcanea/schemas/atlas-world';
import canonSource from './canon-source.json';

const syntheticSource = { id: 'fixture', title: 'Synthetic engine fixture', uri: 'urn:arcanea-atlas:synthetic:v1', sha256: 'fac92200da08e558301bf4a0e6cb778ae05ffa6ad70c42b111f532d3ed9147d4', locator: 'packages/world-engine/fixtures/atlas-synthetic-source.md · not a manuscript', synthetic: true };
const point = (x: number, y: number) => ({ system: 'local' as const, frame: 'synthetic-survey', x, y, z: 0, unit: 'm' as const });
const base = { namespace: 'simulation' as const, parentId: null, sourceIds: ['fixture'], status: 'synthetic' as const };
const entry = (id: string, chapter: number, tick: number, title: string, fact: WorldRecord['fact'], rest: Partial<WorldRecord> = {}): WorldRecord => ({ id, logicalId: id, revision: 1, branchId: 'main', validFrom: tick, validTo: null, recordedFrom: '2026-11-01T00:00:00Z', recordedTo: null, revealChapter: chapter, chapterTitle: `Synthetic chapter ${chapter}`, chapterHref: `/atlas/world/chapters/${chapter}`, title, detail: 'A synthetic record used to exercise the world engine. No Arcanea canon is asserted.', audience: 'reader', knownBy: ['witness-a'], sourceIds: ['fixture'], status: 'synthetic', fact, ...rest });

export const simulation = World.parse({
  id: 'synthetic-survey', namespace: 'simulation', title: 'A journey through the unknown', synthetic: true,
  sources: [syntheticSource],
  branches: [{ id: 'main', name: 'Original path', parentId: null, forkAt: null }, { id: 'alternate', name: 'Alternate crossing', parentId: 'main', forkAt: 50 }],
  entities: [
    { ...base, id: 'basin', kind: 'location', name: 'Survey basin', coordinate: point(235, 405), summary: 'The starting point of the synthetic journey.' },
    { ...base, id: 'ridge', kind: 'location', name: 'Ridge station', coordinate: point(465, 270), summary: 'An observation point in a generated test landscape.' },
    { ...base, id: 'crossing', kind: 'location', name: 'Eastern crossing', coordinate: point(690, 360), summary: 'Two witnesses disagree about the crossing. Both reports remain visible.' },
    { ...base, id: 'exit', kind: 'location', name: 'Far station', coordinate: point(820, 170), summary: 'A destination revealed in synthetic chapter four.' },
    { ...base, id: 'portal', kind: 'portal', name: 'Test portal', coordinate: point(700, 325), summary: 'A synthetic spatial discontinuity; not an approved Arcanea portal.' },
    { ...base, id: 'witness-a', kind: 'character', name: 'Witness A', coordinate: null, summary: 'Synthetic observer with an explicitly bounded view.' },
    { ...base, id: 'witness-b', kind: 'character', name: 'Witness B', coordinate: null, summary: 'An independent synthetic observer.' },
  ],
  records: [
    entry('arrival', 1, 0, 'The journey begins', { kind: 'position', entityId: 'witness-a', locationId: 'basin' }, { detail: 'Witness A arrives in the survey basin. Only the first location is known.' }),
    entry('ascent', 2, 25, 'A higher point of view', { kind: 'position', entityId: 'witness-a', locationId: 'ridge' }, { detail: 'The route reaches ridge station. The earlier position remains part of the journey.' }),
    entry('crossing-seen', 3, 50, 'An open crossing', { kind: 'observation', observerId: 'witness-a', entityId: 'crossing', predicate: 'passage', value: 'open', confidence: 0.82 }, { detail: 'Witness A reports an open passage. Confidence is evidence about the report, not a probability of canonical truth.' }),
    entry('crossing-disputed', 3, 50, 'A conflicting account', { kind: 'observation', observerId: 'witness-b', entityId: 'crossing', predicate: 'passage', value: 'closed', confidence: 0.67 }, { knownBy: ['witness-b'], recordedFrom: '2026-11-10T00:00:00Z', detail: 'Witness B reports a closed passage at the same world time. Neither account overwrites the other.' }),
    entry('portal-transit', 4, 75, 'Beyond the crossing', { kind: 'position', entityId: 'witness-a', locationId: 'exit', viaPortalId: 'portal' }, { detail: 'A synthetic portal links the route to far station. This is a test of an explicit discontinuity.' }),
    entry('branch-transit', 4, 75, 'The other route', { kind: 'position', entityId: 'witness-a', locationId: 'crossing' }, { branchId: 'alternate', detail: 'In this branch, the witness reaches the crossing rather than far station.' }),
    entry('sealed-note', 5, 80, 'PRIVATE_AUTHOR_NOTE', { kind: 'assertion', entityId: 'exit', predicate: 'secret', value: 'SPOILER_CANARY_728' }, { audience: 'author', knownBy: [] }),
    entry('proposed-note', 5, 90, 'UNAPPROVED_AGENT_CONTENT', { kind: 'assertion', entityId: 'exit', predicate: 'proposal', value: 'PROPOSAL_CANARY_914' }, { status: 'provisional', audience: 'author', knownBy: [] }),
  ],
});

const gates = [
  ['Lyssandria', 'Foundation', 'Kaelith'], ['Leyla', 'Flow', 'Veloura'], ['Draconia', 'Fire', 'Draconis'],
  ['Maylinn', 'Heart', 'Laeylinn'], ['Alera', 'Voice', 'Otome'], ['Lyria', 'Sight', 'Yumiko'],
  ['Aiyami', 'Crown', 'Sol'], ['Elara', 'Starweave', 'Vaelith'], ['Ino', 'Unity', 'Kyuro'], ['Shinkami', 'Source', 'Source'],
];
export const canon = World.parse({
  id: 'arcanea-canon', namespace: 'arcanea', title: 'The world, as established', synthetic: false,
  sources: [canonSource], branches: [{ id: 'main', name: 'Source ledger', parentId: null, forkAt: null }],
  entities: gates.map(([name, gate]) => ({ id: name.toLowerCase(), namespace: 'arcanea', kind: 'character', name, summary: `${gate} Gate-keeper. Geographic position has not been established by this source.`, coordinate: null, parentId: null, sourceIds: ['arcanea-vault'], status: 'approved' })),
  records: gates.map(([name, gate, beast]) => ({ ...entry(`canon-${name}`, 0, 0, `${name} · ${gate}`, { kind: 'assertion', entityId: name.toLowerCase(), predicate: 'bondedGodbeast', value: beast }), sourceIds: ['arcanea-vault'], status: 'approved', detail: `${name} serves as ${gate} Gate-keeper and is bonded to ${beast}. No location or event date is inferred.`, knownBy: [], chapterHref: null })),
});
export const realWorld = World.parse({ id: 'starlight-real', namespace: 'starlight', title: 'The world we share', synthetic: false, sources: [], entities: [], records: [], branches: [{ id: 'main', name: 'Verified reality', parentId: null, forkAt: null }] });
