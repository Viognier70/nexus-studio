// ORDER 290 — ringen under personalen (Designs leverans ringen 2026-09-30,
// scene/staffRing.ts): en ring på golvet i rollens färg, 1,12 m i diameter och
// 0,14 m bred, med en mjuk pöl under. Ledig eller på väg: hel ring, svag pöl.
// En uppgift pågår: ringen dämpas och en båge fylls medurs från klockan 12 i
// takt med uppgiften, och pölen blir starkare. En svag kopia utan djuptest syns
// genom disk och bar. Materialen har toneMapped: false.
//
// Linjen (Vision Owner 2026-09-30: "ring och linje under personalen som visar
// vem som gör vad") går från ringen till platsen uppgiften gäller.

import * as THREE from 'three';
import type { StaffKey } from './wineBarDirector';
import { ROLE_COLOUR, RING, type StaffRole } from './staffRing';
import { THEATRE } from '../../sim/balance';

// Vinbarens personal mot Designs roller.
export const ROLE_OF: Record<StaffKey, StaffRole> = {
  server: 'waiter', server2: 'waiter', bartender: 'bartender', sommelier: 'sommelier', cook: 'cook', dish: 'dishwasher'
};

export interface StaffMark {
  group: THREE.Group;
  ring: THREE.Mesh;
  xray: THREE.Mesh;
  glow: THREE.Mesh;
  arcs: THREE.Mesh[];
  line: THREE.Line;
  positions: Float32Array;
}

function basic(colour: THREE.Color, opacity: number, depthTest = true, additive = false): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, depthWrite: false, depthTest, toneMapped: false, side: THREE.DoubleSide, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
}

// Pölens mjuka kant: en radiell gradient som textur.
let glowTexture: THREE.Texture | null = null;
function glowMap(): THREE.Texture {
  if (glowTexture) return glowTexture;
  const size = 64;
  const c = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!c) { glowTexture = new THREE.Texture(); return glowTexture; }
  c.width = size; c.height = size;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  glowTexture = new THREE.CanvasTexture(c);
  return glowTexture;
}

export function createStaffMark(key: StaffKey): StaffMark {
  const group = new THREE.Group();
  const colour = new THREE.Color(ROLE_COLOUR[ROLE_OF[key]]);
  const flat = (m: THREE.Mesh) => { m.rotation.x = -Math.PI / 2; m.castShadow = false; m.renderOrder = 3; return m; };
  const ringGeo = new THREE.RingGeometry(RING.innerM, RING.outerM, 48);
  const ring = flat(new THREE.Mesh(ringGeo, basic(colour, RING.states.free.ring)));
  const xray = flat(new THREE.Mesh(ringGeo, basic(colour, RING.xrayOpacity, false)));
  xray.renderOrder = 4;
  const glowMat = basic(colour, RING.states.free.glow, true, true);
  glowMat.map = glowMap();
  const glow = flat(new THREE.Mesh(new THREE.CircleGeometry(RING.glowRadiusM, 32), glowMat));
  glow.renderOrder = 2;
  // Bågens förbyggda steg (RING.arcSteps), medurs från klockan 12.
  const arcMat = basic(colour, 1);
  const arcs: THREE.Mesh[] = [];
  for (let i = 1; i <= RING.arcSteps; i++) {
    const len = (i / RING.arcSteps) * Math.PI * 2;
    const a = flat(new THREE.Mesh(new THREE.RingGeometry(RING.innerM, RING.outerM, Math.max(3, i), 1, Math.PI / 2 - len, len), arcMat));
    a.visible = false;
    arcs.push(a);
  }
  const positions = new Float32Array(6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: colour, transparent: true, opacity: THEATRE.staffLine.opacity, dashSize: THEATRE.staffLine.dashM, gapSize: THEATRE.staffLine.dashM, depthWrite: false, toneMapped: false }));
  line.renderOrder = 3;
  group.add(glow, ring, xray, ...arcs, line);
  return { group, ring, xray, glow, arcs, line, positions };
}

// `progress` är uppgiftens andel (0..1), eller null när personen är ledig
// eller på väg. `to` är platsen uppgiften gäller.
export function updateStaffMark(mark: StaffMark, visible: boolean, at: { x: number; z: number }, to: { x: number; z: number } | null, progress: number | null, floorY: number): void {
  mark.group.visible = visible;
  if (!visible) return;
  const y = floorY + RING.yM;
  const busy = progress !== null;
  const st = busy ? RING.states.busy : RING.states.free;
  for (const m of [mark.ring, mark.xray, mark.glow, ...mark.arcs]) m.position.set(at.x, y, at.z);
  (mark.ring.material as THREE.MeshBasicMaterial).opacity = st.ring;
  (mark.glow.material as THREE.MeshBasicMaterial).opacity = st.glow;
  const step = busy ? Math.max(0, Math.min(RING.arcSteps, Math.round(progress! * RING.arcSteps))) : 0;
  mark.arcs.forEach((a, i) => { a.visible = busy && i === step - 1; });
  const far = to && Math.hypot(to.x - at.x, to.z - at.z) > RING.outerM * 2;
  mark.line.visible = !!far;
  if (!far || !to) return;
  mark.positions.set([at.x, y, at.z, to.x, y, to.z]);
  (mark.line.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  mark.line.computeLineDistances();
  mark.line.geometry.computeBoundingSphere();
}

export function disposeStaffMark(mark: StaffMark): void {
  mark.group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | undefined;
    if (mat) mat.dispose();
  });
  mark.group.removeFromParent();
}
