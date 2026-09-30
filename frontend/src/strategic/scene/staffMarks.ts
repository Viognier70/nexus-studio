// ORDER 290 — en ring och en linje under personalen som visar vem som gör
// vad, med rollens färg (Vision Owner 2026-09-30). Ringen står under
// figuren; linjen går till den plats uppgiften gäller (regissörens
// staffTask(key, t).to), så länge uppgiften pågår. Bara under servicen.

import * as THREE from 'three';
import type { StaffKey } from './wineBarDirector';
import { THEATRE } from '../../sim/balance';

// Rollens färg: ljusa toner ur Designs varma palett, så att de syns på
// golvet i kvällsljuset (uniformerna i wineBarRoom.ts är mörka).
export const ROLE_MARK_COLOUR: Record<StaffKey, string> = {
  server: '#e2b457',
  server2: '#e2b457',
  bartender: '#7fc8bd',
  sommelier: '#b79be0',
  cook: '#b9cc8c',
  dish: '#c9a878'
};

export interface StaffMark {
  group: THREE.Group;
  ring: THREE.Mesh;
  line: THREE.Line;
  positions: Float32Array;
}

export function createStaffMark(key: StaffKey): StaffMark {
  const group = new THREE.Group();
  const colour = new THREE.Color(ROLE_MARK_COLOUR[key]);
  const m = THEATRE.staffMark;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(m.innerM, m.outerM, 40),
    new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: m.opacity, depthWrite: false, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.castShadow = false;
  ring.renderOrder = 2;
  const positions = new Float32Array(6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: colour, transparent: true, opacity: m.opacity, dashSize: m.dashM, gapSize: m.dashM, depthWrite: false }));
  line.renderOrder = 2;
  group.add(ring);
  group.add(line);
  return { group, ring, line, positions };
}

export function updateStaffMark(mark: StaffMark, visible: boolean, at: { x: number; z: number }, to: { x: number; z: number } | null, floorY: number): void {
  mark.group.visible = visible;
  if (!visible) return;
  const y = floorY + THEATRE.staffMark.liftM;
  mark.ring.position.set(at.x, y, at.z);
  const far = to && Math.hypot(to.x - at.x, to.z - at.z) > THEATRE.staffMark.outerM;
  mark.line.visible = !!far;
  if (!far || !to) return;
  mark.positions.set([at.x, y, at.z, to.x, y, to.z]);
  const attr = mark.line.geometry.getAttribute('position') as THREE.BufferAttribute;
  attr.needsUpdate = true;
  mark.line.computeLineDistances();
  mark.line.geometry.computeBoundingSphere();
}

export function disposeStaffMark(mark: StaffMark): void {
  mark.ring.geometry.dispose();
  (mark.ring.material as THREE.Material).dispose();
  mark.line.geometry.dispose();
  (mark.line.material as THREE.Material).dispose();
  mark.group.removeFromParent();
}
