import test from 'node:test';
import assert from 'node:assert/strict';
import { reconstruct, lineage, validateWorld, distance, checkJourney, consentedLocation } from '../../packages/world-engine/src/atlas-world';
import { Coordinate, World } from '../../packages/schemas/src/atlas-world';
import { simulation, canon } from '../../apps/web/lib/atlas/fixtures';

const reader = { role: 'reader' as const, maxChapter: 5 };
const query = { chapter: 3, validAt: 65, knownAt: '2026-11-13T00:00:00Z', branchId: 'main' };
test('seed packets are valid and source-backed; canon coordinates remain unknown', () => {
  assert.deepEqual(validateWorld(simulation), []); assert.deepEqual(validateWorld(canon), []);
  assert.ok(canon.entities.every(e => e.coordinate === null && e.status === 'approved'));
});
test('reader chapter boundary removes hidden places, facts, counts and source metadata', () => {
  const state = reconstruct(simulation, reader, { ...query, chapter: 1, validAt: 100 });
  assert.deepEqual(state.entities.map(e => e.id).sort(), ['basin','witness-a']);
  assert.equal(state.records.length, 1);
  const json = JSON.stringify(state); for (const secret of ['Far station','Test portal','PRIVATE_AUTHOR_NOTE','SPOILER_CANARY','UNAPPROVED_AGENT_CONTENT','PROPOSAL_CANARY']) assert.ok(!json.includes(secret), secret);
});
test('character sees only their known records; other observer account is absent', () => {
  const state = reconstruct(simulation, { role: 'character', characterId: 'witness-a', maxChapter: 5 }, query);
  assert.ok(state.records.some(r => r.id === 'crossing-seen'));
  assert.ok(!state.records.some(r => r.id === 'crossing-disputed'));
  assert.ok(!state.entities.some(e => e.id === 'witness-b'));
  assert.equal(state.conflicts.length, 0);
});
test('contradictory observations survive, remain attributed and do not become world assertions', () => {
  const state = reconstruct(simulation, reader, query);
  assert.equal(state.conflicts.length, 1);
  assert.deepEqual(state.conflicts[0].recordIds.sort(), ['crossing-disputed','crossing-seen']);
  assert.equal(state.records.filter(r => r.fact.kind === 'observation').length, 2);
});
test('chronology is independent of reveal order and stable under input permutation', () => {
  const at = reconstruct(simulation, reader, { ...query, chapter: 5, validAt: 10 });
  assert.deepEqual(at.positions, [{ entityId: 'witness-a', locationId: 'basin' }]);
  assert.deepEqual(reconstruct({ ...simulation, records: [...simulation.records].reverse() }, reader, query), reconstruct(simulation, reader, query));
});
test('world state inherits only pre-fork parent history', () => {
  const state = reconstruct(simulation, reader, { ...query, branchId: 'alternate', chapter: 5, validAt: 100 });
  assert.deepEqual(state.positions, [{ entityId: 'witness-a', locationId: 'crossing' }]);
  assert.ok(!state.records.some(r => r.id === 'portal-transit'));
});
test('transaction revisions reconstruct the history known at the requested time', () => {
  const world = structuredClone(simulation); const old = world.records.find(r => r.id === 'crossing-seen')!;
  old.recordedTo = '2026-11-12T00:00:00Z';
  world.records.push({ ...old, id: 'corrected-observation', revision: 2, recordedFrom: '2026-11-12T00:00:00Z', recordedTo: null, fact: { kind: 'observation', observerId: 'witness-a', entityId: 'crossing', predicate: 'passage', value: 'closed', confidence: .95 } });
  const before = reconstruct(world, reader, { ...query, knownAt: '2026-11-11T00:00:00Z' });
  const after = reconstruct(world, reader, query);
  assert.equal(before.conflicts.length, 1); assert.equal(after.conflicts.length, 0);
  assert.ok(after.records.some(r => r.id === 'corrected-observation')); assert.ok(!after.records.some(r => r.id === 'crossing-seen'));
});
test('a newly private revision never resurrects its older public content', () => {
  const world = structuredClone(simulation), old = world.records[0];
  world.records.push({ ...old, id: 'withdrawn-arrival', revision: 2, audience: 'author' });
  const state = reconstruct(world, reader, query);
  assert.ok(!state.records.some(r => r.logicalId === old.logicalId));
});
test('author and provisional material never leaks to a reader at the last chapter', () => {
  const state = reconstruct(simulation, reader, { ...query, chapter: 5, validAt: 100 });
  assert.ok(!JSON.stringify(state).includes('CANARY'));
  const author = reconstruct(simulation, { role: 'author', maxChapter: 5 }, { ...query, chapter: 5, validAt: 100 });
  assert.ok(JSON.stringify(author).includes('SPOILER_CANARY'));
});
test('invalid topology and containment cycles fail validation', () => {
  const world = structuredClone(simulation);world.branches[0].parentId='alternate';world.branches[0].forkAt=1;
  assert.throws(() => lineage(world,'main'), /Cyclic/);
  const other = structuredClone(simulation);other.entities[0].parentId=other.entities[0].id;
  assert.ok(validateWorld(other).includes('Containment cycle'));
});
test('coordinate reference systems cannot be mixed or silently converted', () => {
  assert.equal(Coordinate.safeParse({system:'wgs84',longitude:200,latitude:1}).success,false);
  const a = { system:'local' as const, frame:'a',x:0,y:0,z:0,unit:'m' as const };
  assert.throws(()=>distance(a,{...a,frame:'b'}),/Reference frame mismatch/);
  assert.equal(checkJourney(a,{...a,x:1000},10,1),false);
  assert.equal(checkJourney(a,{...a,frame:'b'},10,1,{approved:true,fromFrame:'a',toFrame:'b'}),true);
  assert.equal(checkJourney(a,{...a,frame:'b'},10,1,{approved:false,fromFrame:'a',toFrame:'b'}),false);
});
test('real-world adapter denies missing, revoked, expired, wrong-purpose and future consent', () => {
  const point={system:'wgs84',longitude:4.91234,latitude:52.36789,altitude:9};
  const now=new Date('2026-11-13T00:00:00Z');
  const consent={subjectId:'test-subject',purpose:'atlas-display' as const,precision:'coarse' as const,grantedAt:'2026-11-12T00:00:00Z',expiresAt:'2026-11-14T00:00:00Z',revokedAt:null};
  assert.equal(consentedLocation('test-subject',point,null,now),null);
  assert.equal(consentedLocation('other',point,consent,now),null);
  assert.equal(consentedLocation('test-subject',point,{...consent,revokedAt:'2026-11-12T01:00:00Z'},now),null);
  assert.equal(consentedLocation('test-subject',point,{...consent,expiresAt:'2026-11-12T01:00:00Z'},now),null);
  assert.equal(consentedLocation('test-subject',point,{...consent,grantedAt:'2026-11-14T00:00:00Z'},now),null);
  assert.deepEqual(consentedLocation('test-subject',point,consent,now),{system:'wgs84',longitude:4.9,latitude:52.4});
});
test('schema rejects invalid bitemporal intervals', () => {
  const w=structuredClone(simulation);w.records[0].validTo=-1;
  assert.equal(World.safeParse(w).success,false);
});

test('fractional transaction time does not leak a future record',()=>{
 const world=structuredClone(simulation);world.records=[{...world.records[0],recordedFrom:'2026-11-13T00:00:00.500Z'}];
 assert.equal(reconstruct(world,reader,query).records.length,0);
});
test('branch, entity and source metadata have independent disclosure boundaries',()=>{
 const world=structuredClone(simulation);world.branches.push({id:'future-canary',name:'BRANCH_CANARY',parentId:'main',forkAt:10,revealChapter:5,audience:'author'});
 world.sources.push({...world.sources[0],id:'SOURCE_CANARY',title:'SECRET_SOURCE',audience:'author'});
 world.entities[0].sourceIds.push('SOURCE_CANARY');
 const state=reconstruct(world,reader,query);assert.ok(!JSON.stringify(state).includes('CANARY'));
 world.entities[0].revealChapter=5;
 assert.ok(!reconstruct(world,reader,query).records.some(r=>r.id==='arrival'));
});
test('a future child override does not change the world before it becomes valid',()=>{
 const world=structuredClone(simulation);world.records.push({...world.records[0],id:'child-override',branchId:'alternate',revision:2,validFrom:75,fact:{kind:'position',entityId:'witness-a',locationId:'crossing'}});
 const before=reconstruct(world,reader,{...query,validAt:10,branchId:'alternate'});
 assert.deepEqual(before.positions,[{entityId:'witness-a',locationId:'basin'}]);
});

test('branch and logical identifiers use collision-free tuple keys',()=>{
 const world=structuredClone(simulation);world.branches=[{id:'a',name:'Root',parentId:null,forkAt:null,revealChapter:0,audience:'reader'},{id:'a:b',name:'Child',parentId:'a',forkAt:50,revealChapter:0,audience:'reader'}];
 world.records=[{...world.records[0],id:'root-record',branchId:'a',logicalId:'b:c'},{...world.records[1],id:'child-record',branchId:'a:b',logicalId:'c',validFrom:60}];
 const state=reconstruct(world,reader,{...query,branchId:'a:b',validAt:65});assert.equal(state.records.length,2);
});
