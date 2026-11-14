/* eslint-disable @next/next/no-html-link-for-pages -- Full document navigation applies and removes the Atlas-only CSP. */
'use client';
import { useState } from 'react';

type Proposal = { id: string; record: { title: string; detail: string; [key: string]: unknown }; entitySnapshot: unknown[]; sourceSnapshot: unknown[]; contentHash: string; baseRevision: number; status: string };
export function AtlasReview() {
  const [worldId,setWorldId]=useState(''),[packet,setPacket]=useState(''),[record,setRecord]=useState('');
  const [revision,setRevision]=useState(1),[proposals,setProposals]=useState<Proposal[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  async function request(url: string, body?: unknown) {
    const response=await fetch(url,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,cache:'no-store'});
    const value=await response.json(); if(!response.ok)throw new Error(value.error||'The request failed');return value;
  }
  async function run(action:()=>Promise<void>){setBusy(true);setMessage('');try{await action();}catch(e){setMessage(e instanceof Error?e.message:'The request failed');}finally{setBusy(false);}}
  async function load(){const value=await request(`/api/atlas/worlds/${worldId}?pending=true`);setProposals(value);setMessage('Proposal ledger loaded.');}
  return <div className="atlas-review-grid">
    <section><h2>Import a private world</h2><p>Paste a world packet with source hashes, entities, branches and provisional records. Personal WGS84 positions are rejected on import.</p><label>World packet JSON<textarea value={packet} onChange={e=>setPacket(e.target.value)} spellCheck={false}/></label><button disabled={busy||!packet} onClick={()=>run(async()=>{const value=await request('/api/atlas/worlds',{document:JSON.parse(packet)});setWorldId(value.worldId);setRevision(1);setMessage('Private provisional world saved.');})}>Save provisional world</button></section>
    <section><h2>Propose an assertion</h2>{worldId && <a href={`/atlas/world?world=${encodeURIComponent(worldId)}`}>Open this private world →</a>}<label>World ID<input value={worldId} onChange={e=>setWorldId(e.target.value)} autoComplete="off"/></label><label>Base revision<input type="number" min="1" value={revision} onChange={e=>setRevision(Number(e.target.value))}/></label><label>Provisional record JSON<textarea value={record} onChange={e=>setRecord(e.target.value)} spellCheck={false}/></label><button disabled={busy||!worldId||!record} onClick={()=>run(async()=>{await request(`/api/atlas/worlds/${worldId}`,{record:JSON.parse(record),revision});await load();})}>Submit for review</button><button disabled={busy||!worldId} onClick={()=>run(load)}>Load proposal ledger</button></section>
    <section className="atlas-review-ledger"><h2>Decisions belong to the owner</h2><p>Read the exact record and source references before deciding. A changed world revision invalidates the pending decision.</p>{proposals.map(p=><article key={p.id}><h3>{p.record.title}</h3><p>{p.status} · base revision {p.baseRevision}</p><pre>{JSON.stringify({record:p.record,entities:p.entitySnapshot,sources:p.sourceSnapshot},null,2)}</pre><code>SHA-256 {p.contentHash}</code>{p.status==='provisional' && <div>{(['approved','rejected'] as const).map(decision=><button key={decision} disabled={busy} onClick={()=>run(async()=>{const result=await request(`/api/atlas/worlds/${worldId}`,{proposalId:p.id,contentHash:p.contentHash,revision:p.baseRevision,decision});setRevision(result.revision);await load();setMessage(`Decision saved: ${result.status}.`);})}>{decision==='approved'?'Approve this exact revision':'Reject proposal'}</button>)}</div>}</article>)}{!proposals.length && <p>No proposals loaded.</p>}</section>
    <div role="status" aria-live="polite">{busy?'Saving…':message}</div>
    <a href="/auth/login?next=/atlas/world/review">Sign in to Arcanea</a>
  </div>;
}
