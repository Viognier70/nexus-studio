// ORDER 309 — orkringen ur Designs D5 (staffStatus.ts ORK_RING) i rummet.
//
// D5 ritar ringen på en 2D-duk över allt (prototypen). I spelet står den i
// rummet som rollringen (staffMarks.ts), så att väggar och disken skymmer den:
// tre bågar à 108° med 12° glipa mellan 0,64 och 0,76 m, 0,04 m över golvet.
// Den första bågen är vänd mot kameran (gruppens vridning sätts per bildruta).
// Fylld båge: bläck med en kant i papper. Tom båge: en svag fyllning och en
// streckad kant. Ingen puls, inget rött eller grönt (D5 §2).
//
// Renderreglerna (CLAUDE.md): materialen är genomskinliga med fast opacitet,
// och ingen del kastar skugga (castShadow sätts aldrig).

import * as THREE from 'three';
import { ORK_RING, type StaminaId } from './staffStatus';

/** Färgen och alfat ur en rgba()-sträng i D5:s tabell. */
export function parseRgba(s: string): { colour: string; alpha: number } {
  const m = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/.exec(s);
  if (!m) return { colour: s, alpha: 1 };
  const hex = (v: string) => Math.round(Number(v)).toString(16).padStart(2, '0');
  return { colour: `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`, alpha: m[4] === undefined ? 1 : Number(m[4]) };
}

/** Bågarnas vinklar (radianer) runt riggen, med den första centrerad på vinkeln 0. */
export function orkArcs(): { a0: number; a1: number }[] {
  const seg = (Math.PI * 2) / ORK_RING.segments;
  const gap = (ORK_RING.gapDeg * Math.PI) / 180;
  return Array.from({ length: ORK_RING.segments }, (_, i) => {
    const a0 = -seg / 2 + gap / 2 + i * seg;
    return { a0, a1: a0 + seg - gap };
  });
}

/** Hur många bågar som är fyllda (D5 ORK_RING.count). */
export const orkFilled = (s: StaminaId): number => ORK_RING.count[s];

/** Syns ringen? I statusläget för alla, annars bara för den som är slut (D5 ORK_RING.show). */
export function orkRingShown(stamina: StaminaId, statusMode: boolean): boolean {
  return statusMode || ORK_RING.show.otherwise.includes(stamina);
}

/** Gruppens vridning (rotation.y) så att den första bågen pekar mot kameran (dx, dz i rummets ram). */
export function orkFacing(dx: number, dz: number): number {
  return Math.atan2(-dz, dx);
}

export interface OrkRing {
  group: THREE.Group;
  set(stamina: StaminaId): void;
  dispose(): void;
}

// Materialen delas mellan alla ringar (samma fasta färger).
let shared: { filled: THREE.MeshBasicMaterial; empty: THREE.MeshBasicMaterial; edge: THREE.LineBasicMaterial; dashed: THREE.LineDashedMaterial; users: number } | null = null;
function materials() {
  if (shared) { shared.users++; return shared; }
  const f = parseRgba(ORK_RING.filled.fill);
  const e = parseRgba(ORK_RING.empty.fill);
  const fe = parseRgba(ORK_RING.filled.edge);
  const ee = parseRgba(ORK_RING.empty.edge);
  const base = { transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide } as const;
  shared = {
    filled: new THREE.MeshBasicMaterial({ ...base, color: f.colour, opacity: f.alpha }),
    empty: new THREE.MeshBasicMaterial({ ...base, color: e.colour, opacity: e.alpha }),
    edge: new THREE.LineBasicMaterial({ color: fe.colour, opacity: fe.alpha, transparent: true, depthWrite: false, toneMapped: false }),
    // Streckningen i meter: D5:s [3, 4] px vid 24 m och 1440 × 900 är omkring 3 och 4 cm.
    dashed: new THREE.LineDashedMaterial({ color: ee.colour, opacity: ee.alpha, transparent: true, depthWrite: false, toneMapped: false, dashSize: 0.03, gapSize: 0.04 }),
    users: 1
  };
  return shared;
}

export function createOrkRing(): OrkRing {
  const m = materials();
  const group = new THREE.Group();
  group.name = 'orkRing';
  group.visible = false;
  group.renderOrder = 6;
  const R = ORK_RING;
  const fills: THREE.Mesh[] = [];
  const edges: THREE.Line[] = [];
  const geos: THREE.BufferGeometry[] = [];
  for (const { a0, a1 } of orkArcs()) {
    // RingGeometry i XY; rotateX(−π/2) lägger vinkeln a på (cos a, −sin a) i XZ, som rotation.y.
    const g = new THREE.RingGeometry(R.innerM, R.outerM, 18, 1, a0, a1 - a0);
    g.rotateX(-Math.PI / 2);
    geos.push(g);
    const fill = new THREE.Mesh(g, m.filled);
    fill.position.y = R.yM;
    fill.renderOrder = 6;
    fill.castShadow = false;
    group.add(fill);
    fills.push(fill);
    const pts: THREE.Vector3[] = [];
    const n = 18;
    for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; pts.push(new THREE.Vector3(Math.cos(a) * R.outerM, 0, -Math.sin(a) * R.outerM)); }
    for (let i = n; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / n; pts.push(new THREE.Vector3(Math.cos(a) * R.innerM, 0, -Math.sin(a) * R.innerM)); }
    pts.push(pts[0].clone());
    const lg = new THREE.BufferGeometry().setFromPoints(pts);
    geos.push(lg);
    const line = new THREE.Line(lg, m.edge);
    line.computeLineDistances();
    line.position.y = R.yM + 0.002;
    line.renderOrder = 7;
    group.add(line);
    edges.push(line);
  }
  let last: StaminaId | null = null;
  return {
    group,
    set(stamina) {
      if (stamina === last) return;
      last = stamina;
      const n = orkFilled(stamina);
      fills.forEach((f, i) => { f.material = i < n ? m.filled : m.empty; });
      edges.forEach((e, i) => { e.material = i < n ? m.edge : m.dashed; });
    },
    dispose() {
      geos.forEach((g) => g.dispose());
      group.removeFromParent();
      if (shared && --shared.users <= 0) {
        shared.filled.dispose(); shared.empty.dispose(); shared.edge.dispose(); shared.dashed.dispose();
        shared = null;
      }
    }
  };
}
