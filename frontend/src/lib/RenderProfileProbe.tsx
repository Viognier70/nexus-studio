// ORDER 297b — mätningen av vad som kostar i scenen (bildfrekvensen på byns
// nivå). Bara när localStorage 'nexus.renderProfile' är satt: ritanropen och
// trianglarna per bildruta skrivs till body.dataset (renderCalls,
// renderTriangles), och scenens namngivna delar
// (och kvällens fart) (<group name="part:…">, se
// StrategicScene.tsx) kan döljas en i taget från kontrollskriptet via
// window.__nexusProfile. Renderar inget.

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { useSimDispatch } from '../strategic/simulation/SimulationProvider';

function enabled(): boolean {
  try {
    return !!localStorage.getItem('nexus.renderProfile');
  } catch {
    return false;
  }
}
const ON = typeof window !== 'undefined' && enabled();

export function RenderProfileProbe() {
  const { gl, scene } = useThree();
  const dispatch = useSimDispatch();
  useEffect(() => {
    if (!ON) return;
    (window as unknown as { __nexusProfile?: unknown }).__nexusProfile = {
      parts: () => scene.children.filter((o) => o.name.startsWith('part:')).map((o) => o.name.slice(5)),
      setVisible: (name: string, v: boolean) => { const o = scene.getObjectByName('part:' + name); if (o) o.visible = v; return !!o; },
      shadows: (v: boolean) => { gl.shadowMap.enabled = v; gl.shadowMap.needsUpdate = true; scene.traverse((o) => { const m = (o as { material?: { needsUpdate: boolean } }).material; if (m) m.needsUpdate = true; }); },
      pixelRatio: (r: number) => gl.setPixelRatio(r),
      // Kvällen står still medan delarna mäts (farten 0 finns i tillståndet, inte i HUD:en).
      setSpeed: (speed: number) => dispatch({ type: 'SET_SPEED', speed } as Parameters<typeof dispatch>[0])
    };
  }, [gl, scene, dispatch]);
  useFrame(() => {
    if (!ON) return;
    document.body.dataset.renderCalls = String(gl.info.render.calls);
    document.body.dataset.renderTriangles = String(gl.info.render.triangles);
  });
  return null;
}
