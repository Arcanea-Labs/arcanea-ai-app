import { z } from 'zod';

export const Namespace = z.enum(['arcanea', 'starlight', 'simulation']);
export const Coordinate = z.discriminatedUnion('system', [
  z.object({ system: z.literal('local'), frame: z.string().min(1), x: z.number().finite(), y: z.number().finite(), z: z.number().finite().default(0), unit: z.literal('m') }),
  z.object({ system: z.literal('wgs84'), longitude: z.number().min(-180).max(180), latitude: z.number().min(-90).max(90), altitude: z.number().finite().optional() }),
]);
const Disclosure = { revealChapter: z.number().int().nonnegative().default(0), audience: z.enum(['reader','author']).default('reader') };
export const Source = z.object({ id: z.string().min(1).max(160), title: z.string().max(240), uri: z.string().max(2000), sha256: z.string().regex(/^[a-f0-9]{64}$/), locator: z.string().max(500), synthetic: z.boolean(), ...Disclosure });
export const Entity = z.object({ id: z.string().min(1).max(160), namespace: Namespace, kind: z.enum(['character', 'location', 'region', 'portal']), name: z.string().max(240), summary: z.string().max(2000), coordinate: Coordinate.nullable(), parentId: z.string().nullable(), sourceIds: z.array(z.string()).min(1).max(30), status: z.enum(['approved', 'provisional', 'synthetic']), ...Disclosure });
export const Branch = z.object({ id: z.string(), name: z.string(), parentId: z.string().nullable(), forkAt: z.number().finite().nullable(), revealChapter: z.number().int().nonnegative().default(0), audience: z.enum(['reader','author']).default('reader') });
const Fact = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('position'), entityId: z.string(), locationId: z.string(), viaPortalId: z.string().optional() }),
  z.object({ kind: z.literal('assertion'), entityId: z.string(), predicate: z.string(), value: z.string() }),
  z.object({ kind: z.literal('observation'), observerId: z.string(), entityId: z.string(), predicate: z.string(), value: z.string(), confidence: z.number().min(0).max(1) }),
]);
export const Record = z.object({
  id: z.string(), logicalId: z.string(), revision: z.number().int().positive(), branchId: z.string(),
  validFrom: z.number().finite(), validTo: z.number().finite().nullable(),
  recordedFrom: z.string().datetime(), recordedTo: z.string().datetime().nullable(),
  revealChapter: z.number().int().min(0), chapterTitle: z.string(), chapterHref: z.string().nullable(),
  title: z.string(), detail: z.string(), audience: z.enum(['reader', 'character', 'author']),
  knownBy: z.array(z.string()), sourceIds: z.array(z.string()).min(1),
  status: z.enum(['approved', 'provisional', 'synthetic']), fact: Fact,
}).superRefine((r, ctx) => {
  if (r.validTo !== null && r.validTo <= r.validFrom) ctx.addIssue({ code: 'custom', message: 'Empty valid interval' });
  if (r.recordedTo !== null && Date.parse(r.recordedTo) <= Date.parse(r.recordedFrom)) ctx.addIssue({ code: 'custom', message: 'Empty transaction interval' });
});
export const World = z.object({ id: z.string(), namespace: Namespace, title: z.string(), synthetic: z.boolean(), sources: z.array(Source), entities: z.array(Entity), branches: z.array(Branch), records: z.array(Record) });
export type Coordinate = z.infer<typeof Coordinate>;
export type Entity = z.infer<typeof Entity>;
export type World = z.infer<typeof World>;
export type WorldRecord = z.infer<typeof Record>;
export type Principal = { role: 'reader' | 'character' | 'author'; userId?: string; characterId?: string; maxChapter: number };
export type Query = { chapter: number; validAt: number; knownAt: string; branchId: string };
export type Snapshot = Omit<World, 'records'> & { records: WorldRecord[]; positions: { entityId: string; locationId: string }[]; conflicts: { entityId: string; predicate: string; recordIds: string[] }[]; query: Query; perspective: Principal['role'] };
