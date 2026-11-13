import type { Metadata } from 'next';
import { AtlasExperience } from '@/components/atlas/atlas-experience';
import { simulation } from '@/lib/atlas/fixtures';
import { reconstruct } from '@arcanea/world-engine/atlas-world';
import { World, type Principal } from '@arcanea/schemas/atlas-world';
import { atlasRpc } from '@/lib/atlas/store';
import Link from 'next/link';
import './atlas.css';

export const metadata: Metadata = { title: 'Atlas · Arcanea', description: 'Explore place, time and perspective in a source-backed literary world.', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AtlasPage({ searchParams }: { searchParams: Promise<{ chapter?: string; world?: string; branch?: string; validAt?: string; knownAt?: string; perspective?: string }> }) {
  const params = await searchParams;
  const raw = params.chapter;
  const chapter = raw && /^[1-5]$/.test(raw) ? Number(raw) : 3;
  if (params.world) {
    if (!/^[a-f0-9-]{36}$/.test(params.world)) return <p>Invalid world identifier.</p>;
    const branch = params.branch || 'main', knownAt = new Date().toISOString();
    const result = await atlasRpc('atlas_world_context', { p_world: params.world, p_chapter: chapter, p_branch: branch, p_valid: 100, p_known: knownAt });
    if (result.error) return <div className="atlas-root atlas-review-page"><h1>Private world</h1><p>Sign in with an account granted access to this world.</p><Link href="/auth/login">Sign in to Arcanea</Link></div>;
    const value = result.data as { document: unknown; principal: Principal };
    const document = World.safeParse(value.document);
    if (!document.success) return <p>The world packet could not be validated.</p>;
    const state = reconstruct(document.data, value.principal, { chapter: Math.min(chapter,value.principal.maxChapter), validAt: 100, knownAt, branchId: branch });
    return <div className="atlas-root"><AtlasExperience initial={state} liveWorldId={params.world}/></div>;
  }
  const validAt=params.validAt && Number.isFinite(Number(params.validAt))?Math.max(0,Math.min(100,Number(params.validAt))):Math.min(100,(chapter-1)*25+15);
  const knownAt=params.knownAt && /^\d{4}-\d\d-\d\dT/.test(params.knownAt) && Number.isFinite(Date.parse(params.knownAt))?new Date(params.knownAt).toISOString():'2026-11-13T00:00:00Z';
  const principal=params.perspective==='character'?{role:'character' as const,characterId:'witness-a',maxChapter:chapter}:{role:'reader' as const,maxChapter:chapter};
  const state = reconstruct(simulation, principal, { chapter, validAt, knownAt, branchId: params.branch==='alternate'?'alternate':'main' });
  return <div className={'atlas-root'}><AtlasExperience initial={state}/></div>;
}
