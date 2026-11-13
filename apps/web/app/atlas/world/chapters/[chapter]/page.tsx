import Link from 'next/link';
import { notFound } from 'next/navigation';
import { simulation } from '@/lib/atlas/fixtures';
import { reconstruct } from '@arcanea/world-engine/atlas-world';
import '../../atlas.css';
export default async function SyntheticChapter({params,searchParams}:{params:Promise<{chapter:string}>;searchParams:Promise<{returnChapter?:string;validAt?:string;knownAt?:string;branch?:string;perspective?:string}>}) {
  const raw=(await params).chapter;
  if(!/^[1-5]$/.test(raw))notFound();
  const chapter=Number(raw);
  const query=await searchParams;const back=new URLSearchParams({chapter:query.returnChapter && /^[1-5]$/.test(query.returnChapter)?query.returnChapter:String(chapter)});
  for(const key of ['validAt','knownAt','branch','perspective'] as const)if(query[key])back.set(key,query[key]!);
  const perspective=query.perspective==='character'?'character':'reader';
  const knownAt=query.knownAt && Number.isFinite(Date.parse(query.knownAt))?new Date(query.knownAt).toISOString():'2026-11-13T00:00:00Z';
  const branchId=query.branch==='alternate'?'alternate':'main';
  const state=reconstruct(simulation,{role:perspective,maxChapter:chapter,...(perspective==='character'?{characterId:'witness-a'}:{})},{chapter,validAt:100,knownAt,branchId});
  const records=state.records.filter(r=>r.revealChapter===chapter);
  return <div className="atlas-root"><article className="atlas-reading-page"><Link href={`/atlas/world?${back}`}>← Locate this chapter in the world</Link><p className="atlas-eyebrow">SYNTHETIC CHAPTER {chapter} · {perspective==='character'?'WITNESS A':'READER'} · {branchId==='alternate'?'ALTERNATE CROSSING':'ORIGINAL PATH'}</p><h1>{['Arrival','The ascent','Two accounts','The crossing','Afterward'][chapter-1]}</h1><p>This is a synthetic chapter record, not an Arcanea manuscript or approved narrative.</p>{records.map(r=><section key={r.id}><h2>{r.title}</h2><p>{r.detail}</p><small>World time {r.validFrom} · {r.fact.kind} · source-backed test fixture</small></section>)}{!records.length && <p>No additional reader-visible event is revealed in this chapter.</p>}</article></div>;
}
