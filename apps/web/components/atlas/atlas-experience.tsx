/* eslint-disable @next/next/no-html-link-for-pages -- Full document navigation applies and removes the Atlas-only CSP. */
'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, CaretRight as ChevronRight, Compass, Download, Eye, GitBranch, Globe as Globe2, Stack as Layers3, MapPin, Shield as ShieldCheck, Sparkle as Sparkles, Users, X } from '@/lib/phosphor-icons';
import { ArcaneanMark } from '@/components/brand/arcanea-mark';
import type { Snapshot } from '@arcanea/schemas/atlas-world';
import { AtlasMap } from './atlas-map';
import { SourceDialog } from './source-dialog';
import { MapBoundary } from './map-boundary';

const Scene = dynamic(() => import('./atlas-scene'), { ssr: false, loading: () => <div className="atlas-empty">Loading the 3D scene…</div> });
const Geographic = dynamic(() => import('./geographic-map'), { ssr: false, loading: () => <div className="atlas-empty">Loading geographic view…</div> });
const names = { simulation: 'Synthetic world', arcanea: 'Arcanea canon', starlight: 'Starlight reality' };
const chapters = ['Arrival', 'The ascent', 'Two accounts', 'The crossing', 'Afterward'];

export function AtlasExperience({ initial, liveWorldId }: { initial: Snapshot; liveWorldId?: string }) {
  const [state, setState] = useState(initial);
  const [namespace, setNamespace] = useState<Snapshot['namespace']>(initial.namespace);
  const [chapter, setChapter] = useState(initial.query.chapter), [tick, setTick] = useState(initial.query.validAt);
  const [branch, setBranch] = useState(initial.query.branchId), [perspective, setPerspective] = useState(initial.perspective === 'character' ? 'character' : 'reader');
  const [selected, setSelected] = useState<string | null>('ridge');
  const [mode, setMode] = useState<'2d' | '3d'>('2d');
  const [journey, setJourney] = useState(true), [contours, setContours] = useState(true);
  const [tab, setTab] = useState<'places' | 'events' | 'sources'>('places');
  const [query, setQuery] = useState(''), [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [retry, setRetry] = useState(0), [sourceOpen, setSourceOpen] = useState(false);
  const [knownAt, setKnownAt] = useState(initial.query.knownAt);
  const version = useRef(0), committedRetry = useRef(0);
  useEffect(() => {
    if (retry === committedRetry.current && namespace === state.namespace && chapter === state.query.chapter && tick === state.query.validAt && branch === state.query.branchId && knownAt === state.query.knownAt && (liveWorldId || perspective === state.perspective)) return;
    const controller = new AbortController(), requestVersion = ++version.current;
    queueMicrotask(() => { if (!controller.signal.aborted) { setBusy(true); setError(''); } });
    const params = new URLSearchParams({ namespace, chapter: String(chapter), validAt: String(tick), branch, perspective, knownAt });
    const liveParams = new URLSearchParams({ chapter: String(chapter), validAt: String(tick), branch, knownAt });
    fetch(liveWorldId ? `/api/atlas/worlds/${liveWorldId}?${liveParams}` : `/api/atlas/snapshot?${params}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => { if (!response.ok) throw new Error('The world could not be loaded.'); return response.json() as Promise<Snapshot>; })
      .then(next => { if (version.current !== requestVersion) return; committedRetry.current = retry; setState(next); setNamespace(next.namespace); setChapter(next.query.chapter); setTick(next.query.validAt); setBranch(next.query.branchId); setKnownAt(next.query.knownAt); if (!liveWorldId) setPerspective(next.perspective === 'character' ? 'character' : 'reader'); setSelected(id => next.entities.some(e => e.id === id) ? id : next.entities[0]?.id || null); })
      .catch(e => { if (e.name !== 'AbortError') { setError('That change could not be applied. The displayed view and controls have been restored.'); setNamespace(state.namespace); setChapter(state.query.chapter); setTick(state.query.validAt); setBranch(state.query.branchId); setKnownAt(state.query.knownAt); setPerspective(state.perspective === 'character' ? 'character' : 'reader'); committedRetry.current = 0; setRetry(0); } })
      .finally(() => { if (version.current === requestVersion) setBusy(false); });
    return () => controller.abort();
  }, [namespace, chapter, tick, branch, perspective, retry, knownAt, liveWorldId, state]);
  const entity = state.entities.find(e => e.id === selected);
  const locatedAt = state.entities.find(e => e.id === state.positions.find(p => p.entityId === selected)?.locationId);
  const displayedCoordinate = entity?.coordinate || locatedAt?.coordinate;
  const returnParams = new URLSearchParams({ returnChapter: String(state.query.chapter), validAt: String(state.query.validAt), branch: state.query.branchId, knownAt: state.query.knownAt, perspective: state.perspective }).toString();
  const relevant = state.records.filter(r => r.fact.entityId === selected || r.fact.kind === 'position' && r.fact.locationId === selected);
  const filtered = state.entities.filter(e => `${e.name} ${e.kind}`.toLowerCase().includes(query.toLowerCase()));
  const isSynthetic = state.namespace === 'simulation';
  const recordedPresets = ['2026-11-13T00:00:00Z', '2026-11-01T00:00:00Z'];
  const recordedChoices = recordedPresets.some(value => Date.parse(value) === Date.parse(knownAt))
    ? recordedPresets.map(value => Date.parse(value) === Date.parse(knownAt) ? knownAt : value)
    : [knownAt, ...recordedPresets];
  const switchWorld = (value: Snapshot['namespace']) => { setNamespace(value); setBranch('main'); setPerspective('reader'); setMode('2d'); setConsent(false); setQuery(''); };
  const exportState = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `${state.id}-chapter-${state.query.chapter}.json`; a.click(); URL.revokeObjectURL(url);
  };
  return <div className="atlas-app">
    <header className="atlas-header">
      <a href="/" className="atlas-brand" aria-label="Arcanea home"><ArcaneanMark size={24}/><span>Arcanea <small>Atlas</small></span></a>
      {!liveWorldId && <nav className="atlas-worlds" aria-label="World namespaces">{(['arcanea','simulation','starlight'] as const).map(n => <button key={n} aria-pressed={namespace === n} onClick={() => switchWorld(n)}>{n === 'starlight' ? <Globe2 size={14}/> : n === 'arcanea' ? <Sparkles size={14}/> : <Layers3 size={14}/>}<span>{names[n]}</span></button>)}</nav>}
      <button className="atlas-export" onClick={exportState}><Download size={15}/><span>Export this view</span></button>
    </header>
    <section className="atlas-heading">
      <div><div className="atlas-eyebrow">PLACE · TIME · PERSPECTIVE</div><h1>{state.title}</h1><p>{isSynthetic ? 'Follow a journey. Change the chapter. See only what is known.' : state.namespace === 'arcanea' ? 'Established identities, traced to the source. Unplaced until geography is approved.' : 'Verified entities belong here. Personal locations require scoped, expiring consent.'}</p></div>
      <button className={`atlas-truth-badge ${isSynthetic ? 'synthetic' : ''}`} onClick={() => setSourceOpen(true)}>{isSynthetic ? <Layers3 size={15}/> : <ShieldCheck size={15}/>}<span>{isSynthetic ? 'Synthetic demonstration' : 'Source-backed boundary'}<small>{isSynthetic ? 'All terrain and events are test data' : 'No inferred geography or location data'}</small></span><ChevronRight size={14}/></button>
    </section>
    <div className="atlas-workspace" aria-busy={busy}>
      <aside className="atlas-index">
        <div className="atlas-index-title"><BookOpen size={16}/><span>World index</span><small>{state.entities.length.toString().padStart(2,'0')}</small></div>
        <div className="atlas-index-tabs" role="group" aria-label="Index content">{(['places','events','sources'] as const).map(t => <button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t === 'places' && !isSynthetic ? 'Entities' : t[0].toUpperCase()+t.slice(1)}</button>)}</div>
        {tab === 'places' && <><label className="atlas-search"><span className="sr-only">Find a place or character</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find in this world…"/></label><div className="atlas-entity-list">{filtered.map(e=><button className="atlas-entity" key={e.id} aria-pressed={selected===e.id} onClick={()=>setSelected(e.id)}><span className="atlas-entity-icon">{e.kind==='character'?<Users size={15}/>:<MapPin size={15}/>}</span><span>{e.name}<small>{e.coordinate ? e.kind === 'portal' ? 'Spatial connection' : 'Revealed location' : state.positions.some(p => p.entityId === e.id) ? 'Position known in this view' : 'Position unestablished'}</small></span><ChevronRight size={13}/></button>)}{filtered.length===0 && <p className="atlas-muted">{state.entities.length ? 'No matches in this view.' : 'No entities admitted yet.'}</p>}</div></>}
        {tab === 'events' && <div className="atlas-event-list">{state.records.map(r=><button key={r.id} onClick={()=>{setSelected(r.fact.entityId);setTick(r.validFrom);}}><small>CH {r.revealChapter} · T+{r.validFrom}</small><span>{r.title}</span><ChevronRight size={13}/></button>)}{!state.records.length && <p className="atlas-muted">No visible events.</p>}</div>}
        {tab === 'sources' && <div className="atlas-source-list">{state.sources.map(s=><div key={s.id}><ShieldCheck size={16}/><strong>{s.title}</strong><p>{s.locator}</p>{s.uri.startsWith('https://') ? <a href={s.uri} target="_blank" rel="noreferrer">Inspect source <ArrowRight size={12}/></a> : <small>Test fixture · no manuscript</small>}<code title={s.sha256}>SHA-256 {s.sha256.slice(0,12)}…</code></div>)}{!state.sources.length && <p className="atlas-muted">No sources admitted yet.</p>}</div>}
        <div className="atlas-index-footer"><ShieldCheck size={14}/><span>{state.perspective==='character' ? 'Witness A’s knowledge only' : 'Chapter boundary enforced'}<small>Visibility resolved on the server</small></span></div>
      </aside>
      <section className="atlas-stage">{error && <p role="alert" className="atlas-stage-error">{error}</p>}
        <div className="atlas-stage-toolbar"><div><span className="atlas-dot"/>{names[state.namespace]}<small>{busy ? 'Updating…' : `Chapter ${state.query.chapter} · ${state.perspective}`}</small></div>{isSynthetic && <div className="atlas-segment" role="group" aria-label="Map dimension"><button aria-pressed={mode==='2d'} onClick={()=>setMode('2d')}>2D map</button><button aria-pressed={mode==='3d'} onClick={()=>setMode('3d')}>3D terrain</button></div>}</div>
        {isSynthetic ? mode==='2d' ? <AtlasMap state={state} selected={selected} onSelect={setSelected} showJourney={journey} showContours={contours}/> : <MapBoundary key="terrain" onReturn={()=>setMode('2d')}><Scene state={state} selected={selected} onSelect={setSelected}/></MapBoundary> : state.namespace === 'arcanea' ? <div className="atlas-unplaced"><div className="atlas-orbit" aria-hidden="true"><Compass size={44}/></div><span className="atlas-eyebrow">GEOGRAPHY AWAITS EVIDENCE</span><h2>A name is not<br/><em>a coordinate.</em></h2><p>Ten source-backed Gate-keepers. No geographic positions established by the vault. Select an identity to inspect its provenance.</p><button onClick={()=>{setTab('sources');setSourceOpen(true);}}>Inspect the source <ArrowRight size={15}/></button></div> : consent ? <div className="atlas-real-stage"><MapBoundary key="geographic" onReturn={()=>setConsent(false)}><Geographic/></MapBoundary><button className="atlas-revoke" onClick={()=>setConsent(false)}>Unload external basemap</button></div> : <div className="atlas-unplaced"><Globe2 size={44}/><span className="atlas-eyebrow">STARLIGHT · VERIFIED REALITY</span><h2>Presence,<br/><em>with permission.</em></h2><p>No personal location is collected. Loading the basemap sends your IP and viewed map area to OpenStreetMap. Consent lasts for this view.</p><button onClick={()=>setConsent(true)}>Load geographic basemap <ArrowRight size={15}/></button></div>}
        {isSynthetic && mode==='2d' && <div className="atlas-layerbar"><label><input type="checkbox" checked={journey} onChange={e=>setJourney(e.target.checked)}/><span>Character journey</span></label><label><input type="checkbox" checked={contours} onChange={e=>setContours(e.target.checked)}/><span>Contours</span></label><span className="atlas-map-note">Illustrative terrain · not canon</span></div>}
      </section>
      <aside className="atlas-inspector">
        <div className="atlas-inspector-heading"><Eye size={15}/><span>In this view</span></div>
        {entity ? <><span className="atlas-eyebrow">{entity.kind.toUpperCase()} · {entity.status.toUpperCase()}</span><h2>{entity.name}</h2><p>{entity.summary}</p><div className="atlas-coordinate">{displayedCoordinate?.system==='local' ? <><span>LOCAL COORDINATES</span><strong>{displayedCoordinate.x} <small>X</small> / {displayedCoordinate.y} <small>Y</small></strong><small>{displayedCoordinate.frame} · metres</small></> : <><MapPin size={16}/><span>Unplaced</span><small>No approved position in source</small></>}</div><div className="atlas-inspector-divider"/><h3>What is known</h3><div className="atlas-facts">{relevant.map(r=><article key={r.id}><span className="atlas-dot"/><div><strong>{r.title}</strong><p>{r.detail}</p>{r.fact.kind==='observation' && <span className="atlas-confidence">{Math.round(r.fact.confidence*100)}% confidence · {r.fact.observerId==='witness-a'?'Witness A':'Witness B'}</span>}<small>Chapter {r.revealChapter} · world time {r.validFrom}</small>{r.chapterHref && /^\/atlas\/world\/chapters\/[1-5]$/.test(r.chapterHref) && <a className="atlas-chapter-link" href={`${r.chapterHref}?${returnParams}`}>Read this chapter <ArrowRight size={11}/></a>}</div></article>)}</div>{relevant.length===0 && <p className="atlas-muted">No additional visible records.</p>}</> : <div className="atlas-inspector-empty"><ShieldCheck size={26}/><h2>Nothing inferred.</h2><p>Sources and consented entities will appear here when admitted.</p></div>}
        {state.conflicts.length>0 && <div className="atlas-conflict"><GitBranch size={15}/><strong>Accounts diverge</strong><p>{state.conflicts.length} visible contradiction. Reports remain attributed; neither is promoted to truth.</p><button onClick={()=>setSelected(state.conflicts[0].entityId)}>Compare accounts <ArrowRight size={12}/></button></div>}
      </aside>
    </div>
    {isSynthetic && !liveWorldId && <section className="atlas-time"><div className="atlas-time-top"><div><BookOpen size={15}/><strong>Read through the world</strong><span>Synthetic chapter sequence</span></div><label><Eye size={14}/><span className="sr-only">Perspective</span><select aria-label="Perspective" value={perspective} onChange={e=>setPerspective(e.target.value)}><option value="reader">Reader perspective</option><option value="character">Witness A’s perspective</option></select></label></div><div className="atlas-chapters">{chapters.map((c,i)=><button key={c} aria-pressed={chapter===i+1} onClick={()=>{setChapter(i+1);setTick(Math.min(100,i*25+15));}}><span>{String(i+1).padStart(2,'0')}</span><div><small>CHAPTER {i+1}</small><strong>{c}</strong></div>{chapter===i+1 && <span className="atlas-chapter-dot"/>}</button>)}</div><div className="atlas-time-controls"><label className="atlas-branch"><GitBranch size={14}/><span className="sr-only">Timeline branch</span><select aria-label="Timeline branch" value={branch} onChange={e=>setBranch(e.target.value)}><option value="main">Original path</option><option value="alternate">Alternate crossing</option></select></label><button aria-label="Previous world time" onClick={()=>setTick(t=>Math.max(0,t-10))}><ArrowLeft size={14}/></button><label className="atlas-time-slider"><span className="sr-only">World time</span><input aria-label="World time" type="range" min="0" max="100" value={tick} onChange={e=>setTick(Number(e.target.value))}/></label><button aria-label="Next world time" onClick={()=>setTick(t=>Math.min(100,t+10))}><ArrowRight size={14}/></button><code>T+{tick.toString().padStart(3,'0')}</code><label className="atlas-known-time"><span className="sr-only">Recorded as of</span><select aria-label="Recorded as of" value={knownAt} onChange={e=>setKnownAt(e.target.value)}>{recordedChoices.map(value => <option key={value} value={value}>Recorded {new Date(value).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})}</option>)}</select></label></div></section>}
    {liveWorldId && <section className="atlas-time"><div className="atlas-time-controls"><label>Chapter <input aria-label="Private world chapter" type="number" min="0" max="10000" value={chapter} onChange={e=>setChapter(Number(e.target.value))}/></label><label>World time <input aria-label="Private world time" type="number" value={tick} onChange={e=>setTick(Number(e.target.value))}/></label><select aria-label="Private timeline" value={branch} onChange={e=>setBranch(e.target.value)}>{state.branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><button onClick={()=>setKnownAt(new Date().toISOString())}>Refresh to now</button><span>{state.perspective} · access resolved from your account</span></div></section>}
    <footer className="atlas-footer"><a href="/atlas/world/review">Review provisional changes</a><span><ShieldCheck size={13}/> A world remembers its sources.</span><span>{state.records.length} visible records · {state.sources.length} sources · {state.perspective} view</span></footer>
    <div className="atlas-live" role="status" aria-live="polite">{error ? <><span>{error}</span><button onClick={()=>setRetry(n=>n+1)}>Retry</button></> : busy ? 'Reconstructing world state…' : ''}</div>
    {sourceOpen && <SourceDialog onClose={()=>setSourceOpen(false)}><button autoFocus aria-label="Close source details" onClick={()=>setSourceOpen(false)}><X size={19}/></button><ShieldCheck size={27}/><h2 id="atlas-source-title">{isSynthetic ? 'A demonstration, explicitly.' : 'Authority stays with the source.'}</h2><p>{isSynthetic ? 'This landscape, its witnesses, chapter sequence and events are synthetic engine fixtures. They are not a manuscript, an approved Arcanea map or canonical history.' : 'The Arcanea vault is pinned to an immutable repository revision and SHA-256. Canon records here are a limited projection of Tier 2. No visual character interpretation, spatial position or new narrative is added.'}</p><p>Agent proposals remain provisional. Only an authorized owner can approve a specific revision. Reader and character responses exclude author-only material.</p><button className="atlas-modal-done" onClick={()=>{setSourceOpen(false);setTab('sources');}}><Check size={15}/> View source ledger</button></SourceDialog>}
  </div>;
}
