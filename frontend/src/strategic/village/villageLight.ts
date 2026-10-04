// ORDER 297 — ljusnivån i byn (Designs VILLAGE_LIGHT.level, förval 1, från 0,5
// till 2): spelarens inställning, sparad i webbläsaren. Den multiplicerar
// himlens ljus och nivåns förstärkning och höjer exponeringen lite.

import { VILLAGE_LIGHT } from './villageEvening';

const KEY = 'nexus.villageLight';
let level: number = (() => {
  try {
    const v = Number(localStorage.getItem(KEY));
    return Number.isFinite(v) && v > 0 ? clamp(v) : VILLAGE_LIGHT.level;
  } catch {
    return VILLAGE_LIGHT.level;
  }
})();
const listeners = new Set<() => void>();

function clamp(v: number): number {
  return Math.max(VILLAGE_LIGHT.range[0], Math.min(VILLAGE_LIGHT.range[1], v));
}

export function villageLightLevel(): number {
  return level;
}

export function setVillageLightLevel(v: number): void {
  level = clamp(v);
  try { localStorage.setItem(KEY, String(level)); } catch { /* utan lagring gäller nivån tills sidan laddas om */ }
  listeners.forEach((f) => f());
}

export function subscribeVillageLight(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}
