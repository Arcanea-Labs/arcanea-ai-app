import { boundedJson } from '@/lib/atlas/http';
import { NextRequest, NextResponse } from 'next/server';
import { atlasRpc, CreateWorld, worldErrors } from '@/lib/atlas/store';

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Origin mismatch' }, { status: 403 });
  let value; try { value = await boundedJson(request, 2_000_000); } catch { return NextResponse.json({ error: 'Invalid or oversized JSON' }, { status: 400 }); }
  const parsed = CreateWorld.safeParse(value);
  if (!parsed.success || worldErrors(parsed.data.document).length) return NextResponse.json({ error: 'Invalid world packet' }, { status: 400 });
  const { document, legacyWorldId } = parsed.data;
  if (document.records.some(r => r.status !== 'provisional')) return NextResponse.json({ error: 'Imported assertions must be provisional' }, { status: 400 });
  const result = await atlasRpc('atlas_create_world', { p_document: document, p_legacy_world: legacyWorldId });
  if (result.error) return NextResponse.json({ error: result.error.code === '42501' ? 'Sign in or check world ownership' : 'World could not be created' }, { status: result.error.code === '42501' ? 403 : 503 });
  return NextResponse.json({ worldId: result.data, status: 'provisional' }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
}
