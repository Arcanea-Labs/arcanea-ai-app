import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { canon, realWorld, simulation } from '@/lib/atlas/fixtures';
import { reconstruct } from '@arcanea/world-engine/atlas-world';

export const dynamic = 'force-dynamic';
const Input = z.object({ namespace: z.enum(['arcanea', 'simulation', 'starlight']).default('simulation'), chapter: z.coerce.number().int().min(1).max(5).default(3), validAt: z.coerce.number().min(0).max(100).default(65), branch: z.enum(['main', 'alternate']).default('main'), perspective: z.enum(['reader', 'character']).default('reader'), knownAt: z.string().datetime().default('2026-11-13T00:00:00Z') }).strict();

export async function GET(request: NextRequest) {
  const parsed = Input.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid world query' }, { status: 400 });
  const q = parsed.data;
  const world = q.namespace === 'simulation' ? simulation : q.namespace === 'arcanea' ? canon : realWorld;
  // Persona switching is limited to this PUBLIC SYNTHETIC fixture. Never derives live auth from query params.
  const principal = q.namespace === 'simulation' && q.perspective === 'character'
    ? { role: 'character' as const, characterId: 'witness-a', maxChapter: q.chapter }
    : { role: 'reader' as const, maxChapter: q.chapter };
  const state = reconstruct(world, principal, { chapter: q.chapter, validAt: q.validAt, knownAt: q.knownAt, branchId: q.namespace === 'simulation' ? q.branch : 'main' });
  return NextResponse.json(state, { headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
