'use client';
import { atlasWorld as palette } from '@arcanea/design-system/atlas-world-tokens';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, ArrowCounterClockwise as RotateCcw } from '@/lib/phosphor-icons';
import type { Entity, Snapshot } from '@arcanea/schemas/atlas-world';
import { contours } from './terrain';

export function AtlasMap({ state, selected, onSelect, showJourney, showContours }: { state: Snapshot; selected: string | null; onSelect: (id: string) => void; showJourney: boolean; showContours: boolean }) {
  const lines = useMemo(() => contours(), []);
  const [zoom, setZoom] = useState(1);
  const svg = useRef<SVGSVGElement>(null), [pixelsPerMetre, setPixelsPerMetre] = useState(1);
  useEffect(() => { const element = svg.current; if (!element) return; const measure = () => setPixelsPerMetre(element.getScreenCTM()?.a || 1); const observer = new ResizeObserver(measure); observer.observe(element); measure(); return () => observer.disconnect(); }, [zoom]);
  const scaleMetres = 200 * pixelsPerMetre > 150 ? 100 : 200;
  const places = state.entities.filter(e => e.coordinate?.system === 'local');
  const coordinate = (entity: Entity) => entity.coordinate?.system === 'local' ? [entity.coordinate.x, entity.coordinate.y] : [0, 0];
  const journey = state.records.flatMap(r => { const fact = r.fact; if (fact.kind !== 'position') return []; const place = state.entities.find(e => e.id === fact.locationId); return place ? [place] : []; });
  const selectedPoint = state.entities.find(e => e.id === selected)?.coordinate;
  const centerX = zoom > 1 && selectedPoint?.system === 'local' ? Math.max(500 / zoom, Math.min(1000 - 500 / zoom, selectedPoint.x)) : 500;
  const centerY = zoom > 1 && selectedPoint?.system === 'local' ? Math.max(330 / zoom, Math.min(660 - 330 / zoom, selectedPoint.y)) : 330;
  const path = journey.map(e => coordinate(e).join(',')).join(' ');
  const current = journey.at(-1);
  return <div className="atlas-map" aria-label="Synthetic world map">
    <svg ref={svg} preserveAspectRatio="xMidYMid slice" viewBox={`${centerX - 500 / zoom} ${centerY - 330 / zoom} ${1000 / zoom} ${660 / zoom}`} className="atlas-map-svg" aria-label="Synthetic survey with revealed places and journey" role="img">
      <defs>
        <radialGradient id="atlas-ground"><stop stopColor={palette.ground}/><stop offset=".6" stopColor={palette.lowland}/><stop offset="1" stopColor={palette.terrain}/></radialGradient>
        <radialGradient id="atlas-height"><stop stopColor={palette.summit} stopOpacity=".19"/><stop offset="1" stopColor={palette.forest} stopOpacity="0"/></radialGradient>
        <pattern id="atlas-grid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M 100 0 L 0 0 0 100" fill="none" stroke={palette.grid} strokeOpacity=".055"/></pattern>
        <filter id="atlas-glow"><feGaussianBlur stdDeviation="5"/></filter>
      </defs>
      <rect width="1000" height="660" fill="url(#atlas-ground)"/>
      <ellipse cx="520" cy="210" rx="290" ry="240" fill="url(#atlas-height)"/>
      <ellipse cx="730" cy="430" rx="250" ry="200" fill="url(#atlas-height)"/>
      <path d="M-20 605 C170 520 140 430 280 455 S410 410 415 330 S520 370 555 465 S740 530 890 600 L1020 700 L-20 700Z" fill={palette.water} stroke={palette.waterEdge} strokeOpacity=".38"/>
      <path d="M-20 612 C170 525 140 438 280 463 S420 420 423 335 S530 370 563 465 S740 538 890 609" fill="none" stroke={palette.waterLight} strokeOpacity=".25"/>
      {showContours && lines.map(({ level, path: d }) => <path key={level} d={d} fill="none" stroke={level % 18 === 0 ? palette.majorContour : palette.minorContour} strokeOpacity={level % 18 === 0 ? .26 : .16} strokeWidth={level % 18 === 0 ? 1 : .65}/>) }
      <rect width="1000" height="660" fill="url(#atlas-grid)"/>
      <text x="395" y="140" className="atlas-terrain-label" transform="rotate(-14 395 140)">SYNTHETIC HIGH GROUND</text>
      <text x="90" y="570" className="atlas-terrain-label" transform="rotate(-20 90 570)">GENERATED TERRAIN</text>
      {showJourney && <><polyline points={path} fill="none" stroke={palette.trailHalo} strokeWidth="7" opacity=".15" filter="url(#atlas-glow)"/><polyline points={path} fill="none" stroke={palette.trail} strokeWidth="1.8" strokeDasharray="5 7"/></>}
      {places.map(place => {
        const [x, y] = coordinate(place), active = selected === place.id;
        return <g key={place.id} transform={`translate(${x} ${y})`} className="atlas-pin" onClick={() => onSelect(place.id)}>
          <circle r={active ? 23 : 17} fill={active ? `${palette.trailHalo}18` : `${palette.pinBackground}e0`} stroke={active ? palette.selectedPin : `${palette.pin}60`} strokeWidth="1"/>
          <circle r={place.kind === 'portal' ? 6 : 4} fill={place.kind === 'portal' ? palette.gold : palette.pin}/>
          {active && <circle r="29" fill="none" stroke={palette.selectedPin} strokeOpacity=".18"/>}
          <text x="0" y="-34" textAnchor="middle" className="atlas-map-place">{place.name}</text>
        </g>;
      })}
      {showJourney && current && <g transform={`translate(${coordinate(current).join(' ')})`}><circle r="8" fill={palette.trailHalo}/><circle r="3" fill={palette.terrain}/></g>}
    </svg>
    <div className="atlas-map-caption"><span className="atlas-dot"/> Local reference frame <b>synthetic-survey</b></div>

    <div className="atlas-map-scale"><span style={{ width: scaleMetres * pixelsPerMetre }}/>{scaleMetres} m <small>synthetic scale</small></div>
    <div className="atlas-map-tools"><button aria-label="Zoom in" onClick={() => setZoom(v => Math.min(2.5, v + .25))}><Plus size={16}/></button><button aria-label="Zoom out" onClick={() => setZoom(v => Math.max(1, v - .25))}><Minus size={16}/></button><button aria-label="Reset map view" onClick={() => setZoom(1)}><RotateCcw size={14}/></button></div>
  </div>;
}
