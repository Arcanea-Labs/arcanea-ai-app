'use client';
import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

/** Mount only after consent to the external basemap. No person or device coordinates are supplied. */
export default function GeographicMap() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({ container: ref.current, center: [0,20], zoom: 1.1, attributionControl: { compact: true }, style: {
      version: 8, sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } },
      layers: [{ id: 'basemap', type: 'raster', source: 'osm', paint: { 'raster-saturation': -.8, 'raster-brightness-max': .45 } }],
    } });
    map.addControl(new maplibregl.NavigationControl());
    return () => map.remove();
  }, []);
  return <div ref={ref} className="atlas-geographic" aria-label="Geographic basemap with no personal locations"/>;
}
