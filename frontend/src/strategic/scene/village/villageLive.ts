// ORDER 288 — byns levande läge för HUD:en och etiketterna: hur många som
// har kommit till varje krog i kväll i byn, och vilka sällskap som är på väg
// in till spelarens krog. Skrivs av VillageLife (useFrame, några gånger i
// sekunden) och läses av VillageVenues och nivåraden. Spelarens rad läses ur
// simuleringen (arrivalsToday) där den visas; rivalernas är byns figurer.

export interface OnWayGroup {
  key: string;
  n: number;
  type: string;
  metres: number;
  x: number;
  z: number;
}

export interface VillageLiveState {
  arrived: Record<string, number>;
  onWay: OnWayGroup[];
  groupsWalking: number;
  // ORDER 297 — hur många som sitter inne på varje krog, och husen vars
  // sällskap är ute i kväll (Designs Byn i kvällsljus: fönster och gloria).
  inside: Record<string, number>;
  outHomes: string[];
}

let state: VillageLiveState = { arrived: {}, onWay: [], groupsWalking: 0, inside: {}, outHomes: [] };
const listeners = new Set<() => void>();

export function villageLive(): VillageLiveState {
  return state;
}

export function publishVillageLive(next: VillageLiveState): void {
  state = next;
  if (typeof document !== 'undefined') {
    document.body.dataset.villageOnWay = String(next.onWay.reduce((a, g) => a + g.n, 0));
    document.body.dataset.villageGroups = String(next.groupsWalking);
  }
  for (const l of listeners) l();
}

export function subscribeVillageLive(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
