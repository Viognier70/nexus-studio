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
import { cartPose, createEquipment, EQUIPMENT, type EquipmentHandle, type EquipmentId } from './equipment';
import type { CartId, DirectorPose } from './wineBarDirector';

/** ORDER 331 C — vagnen just nu ur regissören (WineBarDirector.cartAt), eller null när den står parkerad. */
export type CartNow = { x: number; z: number; facing: number; pose: DirectorPose; progress: number; walking: boolean } | null;
const CARTS: readonly CartId[] = ['cheeseCart', 'flambeCart', 'avecCart'];
/** Vagnen bredvid den som arbetar vid bordet (m åt höger), och hur fort den visade vagnen följer (1/s). */
const CART_SIDE_M = 0.62;
const CART_FOLLOW_RATE = 8;
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

  /**
   * ORDER 331 C — vagnarna i bruk (grundregeln): den som skjuter har vagnen framför sig (cartPose), vid bordet står
   * den bredvid; annars på sin plats. Det visade läget följer mjukt, så att vagnen inte hoppar när den tas.
   * Kupan lyfts och osten skärs i cheese.cut, lågan tar sig i flambe.pour.
   */
  followCarts(at: (id: CartId) => CartNow, dt: number, t: number): void {
    const k = 1 - Math.exp(-CART_FOLLOW_RATE * Math.max(0, dt));
    for (const id of CARTS) {
      const h = this.items.get(id);
      if (!h || !h.group.visible) continue;
      const c = at(id);
      const home = EQUIPMENT[id].home;
      const want = !c ? { x: home.at[0], z: home.at[1], yaw: home.yaw }
        : c.walking ? cartPose(id, c.x, c.z, c.facing)
          : { x: c.x + Math.cos(c.facing) * CART_SIDE_M, z: c.z - Math.sin(c.facing) * CART_SIDE_M, yaw: c.facing };
      const g = h.group;
      g.position.x += (want.x - g.position.x) * k;
      g.position.z += (want.z - g.position.z) * k;
      let dy = want.yaw - g.rotation.y;
      while (dy > Math.PI) dy -= 2 * Math.PI;
      while (dy < -Math.PI) dy += 2 * Math.PI;
      g.rotation.y += dy * k;
      const cutting = !!c && c.pose === 'cheeseCut';
      h.setCloche?.(cutting ? Math.min(1, c!.progress * 4, (1 - c!.progress) * 4) : 0);
      h.setCut?.(cutting ? c!.progress : 0);
      h.setFlame?.(c && c.pose === 'flambePour' ? Math.sin(Math.PI * c.progress) : 0, t);
    }
  }

  /** ORDER 331 C — vagnens läge i rummet (för testerna och kontrollen). */
  cartPlace(id: CartId): { x: number; z: number; yaw: number } | null {
    const h = this.items.get(id);
    return h ? { x: h.group.position.x, z: h.group.position.z, yaw: h.group.rotation.y } : null;
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
