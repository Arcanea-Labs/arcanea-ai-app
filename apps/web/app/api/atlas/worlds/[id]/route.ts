import { boundedJson } from '@/lib/atlas/http';
import { NextRequest, NextResponse } from 'next/server';
import { atlasRpc, ProposeRecord, ReviewRecord } from '@/lib/atlas/store';
import { World, type Principal } from '@arcanea/schemas/atlas-world';
import { reconstruct } from '@arcanea/world-engine/atlas-world';
import { z } from 'zod';

const Query = z.object({ chapter: z.coerce.number().int().min(0).max(10000).default(0), validAt: z.coerce.number().finite().default(0), knownAt: z.string().datetime().default(() => new Date().toISOString()), branch: z.string().min(1).max(160).default('main'), pending: z.literal('true').optional() }).strict();
type Context = { params: Promise<{ id: string }> };
function failure(code: string) { return NextResponse.json({ error: code === '40001' ? 'Revision changed. Reload before reviewing.' : 'World unavailable or not authorized' }, { status: code === '40001' ? 409 : code === '42501' ? 403 : 503, headers: { 'Cache-Control': 'private, no-store' } }); }
export async function GET(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const parsed = Query.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!z.string().uuid().safeParse(id).success || !parsed.success) return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
  const q = parsed.data;
  const result = await atlasRpc(q.pending ? 'atlas_pending' : 'atlas_world_context', q.pending ? { p_world: id } : { p_world: id, p_chapter: q.chapter, p_branch: q.branch, p_valid: q.validAt, p_known: q.knownAt });
  if (result.error) return failure(result.error.code);
  if (q.pending) return NextResponse.json(result.data, { headers: { 'Cache-Control': 'private, no-store' } });
  const value = result.data as { document: unknown; principal: Principal; revision: number };
  const world = World.safeParse(value.document);
  if (!world.success) return failure('invalid-packet');
  return NextResponse.json({ ...reconstruct(world.data, value.principal, { chapter: Math.min(q.chapter,value.principal.maxChapter), validAt: q.validAt, knownAt: q.knownAt, branchId: q.branch }), revision: value.revision }, { headers: { 'Cache-Control': 'private, no-store' } });
}
export async function POST(request: NextRequest, context: Context) {
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid world' }, { status: 400 });
  if (request.headers.get('origin') !== request.nextUrl.origin) return failure('42501');
  let input; try { input = await boundedJson(request, 40000); } catch { return NextResponse.json({ error: 'Invalid or oversized JSON' }, { status: 400 }); }
  const proposal = ProposeRecord.safeParse(input), decision = ReviewRecord.safeParse(input);
  if (!proposal.success && !decision.success) return NextResponse.json({ error: 'Invalid proposal or decision' }, { status: 400 });
  if (proposal.success && proposal.data.record.status !== 'provisional') return NextResponse.json({ error: 'Agent changes must remain provisional' }, { status: 400 });
  const result = proposal.success ? await atlasRpc('atlas_propose', { p_world: id, p_record: proposal.data.record, p_revision: proposal.data.revision }) : await atlasRpc('atlas_review', { p_world: id, p_proposal: decision.data!.proposalId, p_hash: decision.data!.contentHash, p_revision: decision.data!.revision, p_decision: decision.data!.decision });
  if (result.error) return failure(result.error.code);
  return NextResponse.json(result.data, { headers: { 'Cache-Control': 'private, no-store' } });
}
