'use client';
import { atlasWorld as palette } from '@arcanea/design-system/atlas-world-tokens';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Snapshot } from '@arcanea/schemas/atlas-world';
import { elevation } from './terrain';

function Controls() {
  const { camera, gl, invalidate } = useThree();
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.target.set(0, 0, 0); controls.enableDamping = false; controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 4; controls.maxDistance = 18;
    controls.addEventListener('change', () => invalidate()); controls.update();
    return () => controls.dispose();
  }, [camera, gl, invalidate]);
  return null;
}
function Terrain() {
  const geometry = useMemo(() => {
    const g = new BufferGeometry(), vertices: number[] = [], colors: number[] = [];
    const n = 65;
    const vertex = (x: number, y: number) => {
      const height = elevation(x * 1000 / n, y * 660 / n);
      vertices.push(x / n * 10 - 5, Math.max(-.18, height / 80), y / n * 6.6 - 3.3);
      const h = Math.max(0, height) / 130;
      colors.push(.055 + h * .32, .13 + h * .3, .13 + h * .19);
    };
    for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) {
      vertex(x,y); vertex(x,y+1); vertex(x+1,y); vertex(x+1,y); vertex(x,y+1); vertex(x+1,y+1);
    }
    g.setAttribute('position', new Float32BufferAttribute(vertices, 3)); g.setAttribute('color', new Float32BufferAttribute(colors, 3)); g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <><mesh geometry={geometry}><meshStandardMaterial vertexColors roughness={1}/></mesh><mesh rotation={[-Math.PI / 2,0,0]} position={[0,-.17,0]}><planeGeometry args={[10,6.6]}/><meshStandardMaterial color={palette.water} roughness={.3}/></mesh></>;
}
export default function AtlasScene({ state, selected, onSelect }: { state: Snapshot; selected: string | null; onSelect: (id: string) => void }) {
  return <div className="atlas-scene" aria-label="Interactive synthetic 3D terrain. Drag to orbit; scroll to zoom. Use the place list to select with a keyboard.">
    <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [7,7,9], fov: 40 }} gl={{ antialias: true, powerPreference: 'low-power' }} fallback={<p>3D is unavailable. Use the 2D map.</p>}>
      <color attach="background" args={[palette.terrain]}/><ambientLight intensity={1.5}/><directionalLight position={[-3,10,5]} intensity={2}/>
      <Terrain/><Controls/>
      {state.entities.map(e => e.coordinate?.system === 'local' ? <mesh key={e.id} position={[e.coordinate.x / 100 - 5, Math.max(0, elevation(e.coordinate.x,e.coordinate.y) / 80) + .1, e.coordinate.y / 100 - 3.3]} onClick={() => onSelect(e.id)}>
        <sphereGeometry args={[selected === e.id ? .1 : .065,16,16]}/><meshStandardMaterial color={(e.kind === 'portal' ? palette.gold : palette.trailHalo)} emissive={(e.kind === 'portal' ? palette.gold : palette.trailHalo)} emissiveIntensity={.7}/>
      </mesh> : null)}
    </Canvas>
    <p className="atlas-scene-hint">{state.entities.find(e => e.id === selected)?.name || 'Synthetic terrain'} · locations only · journeys in 2D<br/>Drag to orbit · scroll to zoom</p>
  </div>;
}
