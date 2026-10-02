// ORDER 296 — butiken mellan kvällarna: förmågorna, medaljens grind,
// krediterna och facket. Data och regler ur Designs hostShop.ts (ABILITIES,
// SHOP); talen i balance.ts SHOP. Förmågornas verkan läses av simuleringen
// med abilityActive (bara det som ligger i facket gäller).

import type { PavilionKey, SimulationState } from '../strategic/types';
import { MEDAL_LEVELS, SHOP } from './balance';

export type ShopPavilion = 'stensota' | 'method' | 'library' | 'party' | 'theatre';

// Förmågorna i vägens ordning (Designs ABILITIES): id, gren, ikon och om det
// är en kurs för personalen (rollens färg i ringen).
export const ABILITY_LIST: readonly { id: string; pavilion: ShopPavilion; icon: string; course?: 'sommelier' | 'chef' | 'floor' }[] = [
  { id: 'sommBottle', pavilion: 'stensota', icon: 'wine', course: 'sommelier' },
  { id: 'wineFridge', pavilion: 'stensota', icon: 'refrigerator' },
  { id: 'wineTasting', pavilion: 'stensota', icon: 'grape', course: 'floor' },
  { id: 'fastPass', pavilion: 'method', icon: 'timer', course: 'chef' },
  { id: 'leftovers', pavilion: 'method', icon: 'recycle' },
  { id: 'mise', pavilion: 'method', icon: 'chef-hat', course: 'chef' },
  { id: 'menuStory', pavilion: 'library', icon: 'book-open-text' },
  { id: 'allergen', pavilion: 'library', icon: 'wheat-off' },
  { id: 'critic', pavilion: 'library', icon: 'newspaper' },
  { id: 'regulars', pavilion: 'party', icon: 'book-user' },
  { id: 'birthday', pavilion: 'party', icon: 'cake' },
  { id: 'lova', pavilion: 'party', icon: 'heart-handshake' },
  { id: 'chefsTable', pavilion: 'theatre', icon: 'utensils-crossed' },
  { id: 'signature', pavilion: 'theatre', icon: 'sparkles' }
];

export const SHOP_PAVILION: Record<ShopPavilion, PavilionKey> = {
  stensota: 'stensota',
  method: 'metodkoket',
  library: 'maltidbiblioteket',
  party: 'kalastorget',
  theatre: 'gastronomiskateatern'
};

export interface ShopState {
  owned: string[];
  slot: string[];
}

export function shopOf(state: Pick<SimulationState, 'shop'>): ShopState {
  return state.shop ?? { owned: [], slot: [] };
}

function medalRank(level: string | undefined): number {
  return level ? (MEDAL_LEVELS as readonly string[]).indexOf(level) + 1 : 0;
}

export function abilityPavilion(id: string): PavilionKey | null {
  const a = ABILITY_LIST.find((x) => x.id === id);
  return a ? SHOP_PAVILION[a.pavilion] : null;
}

// Medaljen öppnar stenen (förbrukas inte).
export function abilityUnlocked(state: SimulationState, id: string): boolean {
  const spec = SHOP.abilities[id];
  const pav = abilityPavilion(id);
  if (!spec || !pav) return false;
  return medalRank(state.medals[pav]) >= medalRank(spec.requires);
}

export function creditsOf(state: SimulationState): number {
  return state.knowledgeCredits.episteme + state.knowledgeCredits.techne + state.knowledgeCredits.phronesis;
}

export function starReached(state: SimulationState): boolean {
  return medalRank(state.medals[SHOP.starPavilion]) >= medalRank(SHOP.starMedal);
}

export function slotCount(state: SimulationState): number {
  return starReached(state) ? SHOP.slotsAtStar : SHOP.slots;
}

export type StoneState = 'owned' | 'open' | 'short' | 'locked';

export function stoneState(state: SimulationState, id: string): StoneState {
  if (shopOf(state).owned.includes(id)) return 'owned';
  if (!abilityUnlocked(state, id)) return 'locked';
  return creditsOf(state) >= (SHOP.abilities[id]?.price ?? Infinity) ? 'open' : 'short';
}

// Förmågan gäller i kväll när den ligger i facket.
export function abilityActive(state: Pick<SimulationState, 'shop'>, id: string): boolean {
  return shopOf(state).slot.includes(id);
}

// Facket: lägg i (om det finns plats och förmågan är köpt) eller ta ur.
export function setSlot(state: SimulationState, id: string, on: boolean): SimulationState {
  const shop = shopOf(state);
  if (!shop.owned.includes(id)) return state;
  if (on) {
    if (shop.slot.includes(id) || shop.slot.length >= slotCount(state)) return state;
    return { ...state, shop: { ...shop, slot: [...shop.slot, id] } };
  }
  if (!shop.slot.includes(id)) return state;
  return { ...state, shop: { ...shop, slot: shop.slot.filter((x) => x !== id) } };
}
