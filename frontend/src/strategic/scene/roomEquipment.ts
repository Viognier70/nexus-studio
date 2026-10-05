// ORDER 309 — utrustningen i vinbaren ur Designs D5 (equipment.ts): de fem
// sakerna som modeller i meter på sina hemplatser, när krogen äger dem
// (state.equipment, ORDER 307 sim/goods.ts). Spelets id:n är svenska, D5:s
// engelska; tabellen nedan översätter.
//
// Modellen byggs första gången saken finns (när köpet syns, inte i
// renderloopen) och står kvar så länge den ägs. Gruppen hängs i rummets
// grupp, så att den följer rummets placering och synlighet.
//
// Vagnarnas klipp (trolley.push, trolley.present, cheese.cut, flambe.pour,
// flambe.tilt) finns i figureClips.ts, och lågan i equipment.ts. Händelserna
// som använder dem (flamberingen, ostvagnen, avec efter kaffet) kommer med
// frågebanken (ORDER 306); tills dess står vagnarna parkerade.

import * as THREE from 'three';
import { createEquipment, EQUIPMENT, type EquipmentHandle, type EquipmentId } from './equipment';
import type { EquipmentId as GameEquipmentId } from '../../sim/goods';

export const D5_EQUIPMENT_OF: Record<GameEquipmentId, EquipmentId> = {
  vinkyl: 'wineFridge',
  flamberingsvagn: 'flambeCart',
  ostvagn: 'cheeseCart',
  avecvagn: 'avecCart',
  humidor: 'humidor'
};

/** D5-sakerna som ska stå i rummet, ur krogens utrustning (okända id:n hoppas över). */
export function equipmentInRoom(owned: readonly string[] | undefined): EquipmentId[] {
  const out: EquipmentId[] = [];
  for (const id of owned ?? []) {
    const d5 = D5_EQUIPMENT_OF[id as GameEquipmentId];
    if (d5 && !out.includes(d5)) out.push(d5);
  }
  return out;
}

export class RoomEquipment {
  readonly group = new THREE.Group();
  private readonly items = new Map<EquipmentId, EquipmentHandle>();

  constructor(private readonly floorY: number, private readonly create: (id: EquipmentId) => EquipmentHandle = createEquipment) {
    this.group.name = 'roomEquipment';
  }

  /** Visar det som ägs och döljer resten. Returnerar det som står i rummet. */
  sync(owned: readonly string[] | undefined): EquipmentId[] {
    const want = equipmentInRoom(owned);
    for (const id of want) {
      let h = this.items.get(id);
      if (!h) {
        h = this.create(id);
        const home = EQUIPMENT[id].home;
        h.group.position.set(home.at[0], this.floorY, home.at[1]);
        h.group.rotation.y = home.yaw;
        // Kupan stängd och lågan släckt när vagnen står parkerad.
        h.setCloche?.(0);
        h.setFlame?.(0, 0);
        this.group.add(h.group);
        this.items.set(id, h);
      }
      h.group.visible = true;
    }
    for (const [id, h] of this.items) if (!want.includes(id)) h.group.visible = false;
    return want;
  }

  shown(): EquipmentId[] {
    return [...this.items].filter(([, h]) => h.group.visible).map(([id]) => id);
  }

  dispose(): void {
    for (const h of this.items.values()) {
      h.group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); });
    }
    this.items.clear();
    this.group.removeFromParent();
  }
}
