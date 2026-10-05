// ORDER 307 (ORDER 304, Anders 2026-10-05) — konceptet och varukorgen:
// varornas nivå, krogens leverantörer, utrustningen och konceptet ur det som
// står på menyn i kväll. Talen står i balance.ts CONCEPT, GOODS_SUPPLIERS och
// EQUIPMENT. Frågorna per vara väntar på ORDER 306.

import type { PavilionKey, SimulationState } from '../strategic/types';
import { CONCEPT, EQUIPMENT, GOODS_SUPPLIERS, MEDAL_LEVELS } from './balance';
import { findDish } from '../strategic/simulation/m4Catalogue';

export type Tier = 'enkel' | 'bistro' | 'soigne';
export const TIERS: readonly Tier[] = ['enkel', 'bistro', 'soigne'];
export type GoodsSupplierId = 'grossisten' | 'fiskaren' | 'vinhandlaren' | 'ostaffinoren' | 'charkuteristen';
export const GOODS_SUPPLIER_IDS: readonly GoodsSupplierId[] = ['grossisten', 'fiskaren', 'vinhandlaren', 'ostaffinoren', 'charkuteristen'];
export type EquipmentId = 'vinkyl' | 'flamberingsvagn' | 'ostvagn' | 'avecvagn' | 'humidor';
// Tabellerna i balance.ts utan fältet section.
const SUPPLIER_SPEC = GOODS_SUPPLIERS as unknown as Record<Exclude<GoodsSupplierId, 'grossisten'>, { pavilion: PavilionKey; medal: string; credits: number }>;
const EQUIPMENT_SPEC = EQUIPMENT as unknown as Record<EquipmentId, { tier: Tier; priceSek: number; pavilion: PavilionKey; medal: string; credits: number; avecShare?: number; satisfaction?: number }>;
export function equipmentSpec(id: EquipmentId) {
  return EQUIPMENT_SPEC[id];
}
export function supplierSpec(id: Exclude<GoodsSupplierId, 'grossisten'>) {
  return SUPPLIER_SPEC[id];
}
export const EQUIPMENT_IDS: readonly EquipmentId[] = ['vinkyl', 'flamberingsvagn', 'ostvagn', 'avecvagn', 'humidor'];

// Varans nivå i varukorgen och leverantören. Det billiga och vardagliga är
// enkelt, baspaketets kött och husets vin bistro, och de sällsynta varorna
// soigné. Varor som inte står här räknas som bistro.
export const GOODS: Record<string, { tier: Tier; supplier: GoodsSupplierId }> = {
  'root-soup': { tier: 'enkel', supplier: 'grossisten' },
  'lentil-plate': { tier: 'enkel', supplier: 'grossisten' },
  'dairy-dessert': { tier: 'enkel', supplier: 'grossisten' },
  'lingon-sorbet': { tier: 'enkel', supplier: 'grossisten' },
  'beer-pairing': { tier: 'enkel', supplier: 'grossisten' },
  'alcohol-free-glass': { tier: 'enkel', supplier: 'grossisten' },
  'chicken-plate': { tier: 'bistro', supplier: 'grossisten' },
  'pork-plate': { tier: 'bistro', supplier: 'grossisten' },
  'house-wine-glass': { tier: 'bistro', supplier: 'grossisten' },
  'house-wine-bottle': { tier: 'bistro', supplier: 'grossisten' },
  'chanterelle-toast': { tier: 'bistro', supplier: 'grossisten' },
  'lamb-plate': { tier: 'bistro', supplier: 'grossisten' },
  'fine-wine-glass': { tier: 'bistro', supplier: 'grossisten' },
  'fine-wine-bottle': { tier: 'soigne', supplier: 'grossisten' },
  'game-plate': { tier: 'soigne', supplier: 'grossisten' },
  // Fiskaren vid sjön: gösen (förut i grossistens fiskpaket) och rödingen.
  'fish-plate': { tier: 'bistro', supplier: 'fiskaren' },
  'char-plate': { tier: 'soigne', supplier: 'fiskaren' },
  // Vinhandlaren.
  'chablis-glass': { tier: 'bistro', supplier: 'vinhandlaren' },
  'riesling-glass': { tier: 'bistro', supplier: 'vinhandlaren' },
  'priorat-bottle': { tier: 'soigne', supplier: 'vinhandlaren' },
  // Ostaffinören.
  'brie-plate': { tier: 'soigne', supplier: 'ostaffinoren' },
  'munster-plate': { tier: 'bistro', supplier: 'ostaffinoren' },
  'vasterbotten-plate': { tier: 'bistro', supplier: 'ostaffinoren' },
  // Charkuteristen.
  'jamon-plate': { tier: 'soigne', supplier: 'charkuteristen' }
};

export function tierOf(dishId: string): Tier {
  return GOODS[dishId]?.tier ?? 'bistro';
}
export function supplierOf(dishId: string): GoodsSupplierId {
  return GOODS[dishId]?.supplier ?? 'grossisten';
}
export function supplierDishes(id: GoodsSupplierId): string[] {
  return Object.entries(GOODS).filter(([, g]) => g.supplier === id).map(([d]) => d);
}

function medalRank(level: string | undefined): number {
  return level ? (MEDAL_LEVELS as readonly string[]).indexOf(level) + 1 : 0;
}
function medalOpens(state: Pick<SimulationState, 'medals'>, pavilion: PavilionKey, medal: string): boolean {
  return medalRank(state.medals[pavilion]) >= medalRank(medal);
}

// ----- Leverantörerna -----

export function ownedSuppliers(state: Pick<SimulationState, 'goodsSuppliers'>): GoodsSupplierId[] {
  return ['grossisten', ...((state.goodsSuppliers ?? []) as GoodsSupplierId[])];
}
export function supplierOwned(state: Pick<SimulationState, 'goodsSuppliers'>, id: GoodsSupplierId): boolean {
  return ownedSuppliers(state).includes(id);
}
export function supplierUnlocked(state: Pick<SimulationState, 'medals'>, id: GoodsSupplierId): boolean {
  if (id === 'grossisten') return true;
  const u = SUPPLIER_SPEC[id];
  return medalOpens(state, u.pavilion, u.medal);
}
export function supplierPrice(id: GoodsSupplierId): number {
  return id === 'grossisten' ? 0 : SUPPLIER_SPEC[id].credits;
}
// Kan varan köpas i morgon? Bara när leverantören är öppnad.
export function goodAvailable(state: Pick<SimulationState, 'goodsSuppliers'>, dishId: string): boolean {
  return supplierOwned(state, supplierOf(dishId));
}

// ----- Utrustningen -----

export function ownedEquipment(state: Pick<SimulationState, 'equipment'>): EquipmentId[] {
  return (state.equipment ?? []) as EquipmentId[];
}
export function equipmentOwned(state: Pick<SimulationState, 'equipment'>, id: EquipmentId): boolean {
  return ownedEquipment(state).includes(id);
}
// Medaljen öppnar stenen; krediterna öppnar saken (en gång, equipmentOpened);
// kassan köper den (equipmentOwned).
export function equipmentUnlocked(state: Pick<SimulationState, 'medals'>, id: EquipmentId): boolean {
  const e = EQUIPMENT_SPEC[id];
  return medalOpens(state, e.pavilion, e.medal);
}
export function equipmentOpened(state: Pick<SimulationState, 'equipmentOpened' | 'equipment'>, id: EquipmentId): boolean {
  return (state.equipmentOpened ?? []).includes(id) || equipmentOwned(state, id);
}

// Stenens läge (som butikens förmågor): din, öppen, krediterna räcker inte, låst.
export type GoodsStone = 'owned' | 'open' | 'short' | 'locked';
export function supplierStone(state: SimulationState, id: GoodsSupplierId, credits: number): GoodsStone {
  if (supplierOwned(state, id)) return 'owned';
  if (!supplierUnlocked(state, id)) return 'locked';
  return credits >= supplierPrice(id) ? 'open' : 'short';
}
export function equipmentStone(state: SimulationState, id: EquipmentId, credits: number): GoodsStone {
  if (equipmentOwned(state, id)) return 'owned';
  if (!equipmentUnlocked(state, id)) return 'locked';
  if (equipmentOpened(state, id)) return state.cash >= EQUIPMENT_SPEC[id].priceSek ? 'open' : 'short';
  return credits >= EQUIPMENT_SPEC[id].credits ? 'open' : 'short';
}
// ORDER 307 — avecvagnen öppnar avec (balance.ts EQUIPMENT.avecvagn).
export function avecShareFor(state: Pick<SimulationState, 'equipment'>): number {
  return equipmentOwned(state, 'avecvagn') ? EQUIPMENT_SPEC.avecvagn.avecShare ?? 0 : 0;
}

// ----- Konceptet -----

// Varukorgens nivå på skalan 0–2: det som står på menyn i kväll (portioner
// kvar × pris), och utrustningen i rummet som lyfter mot sin nivå.
export function basketLevel(state: Pick<SimulationState, 'menu' | 'day' | 'equipment'>): number {
  let value = 0;
  let weighted = 0;
  for (const m of state.menu) {
    const n = state.day.platesRemaining?.[m.dishId] ?? 0;
    if (n <= 0 || !findDish(m.dishId)) continue;
    const v = n * m.price;
    value += v;
    weighted += v * CONCEPT.tierValue[tierOf(m.dishId)];
  }
  const basket = value > 0 ? weighted / value : CONCEPT.tierValue.bistro;
  const eq = ownedEquipment(state);
  const w = CONCEPT.equipmentWeight;
  const lift = eq.reduce((a, id) => a + CONCEPT.tierValue[EQUIPMENT_SPEC[id].tier], 0);
  return (basket + w * lift) / (1 + w * eq.length);
}

export function tierForLevel(level: number): Tier {
  return level >= CONCEPT.soigneFrom ? 'soigne' : level >= CONCEPT.bistroFrom ? 'bistro' : 'enkel';
}

export function conceptOf(state: Pick<SimulationState, 'menu' | 'day' | 'equipment'>): Tier {
  return tierForLevel(basketLevel(state));
}

// ----- Ryktet per koncept -----

export function reputationByTier(state: Pick<SimulationState, 'reputationByTier' | 'reputation'>): Record<Tier, number> {
  return state.reputationByTier ?? { enkel: state.reputation, bistro: state.reputation, soigne: state.reputation };
}

// Natten: varje koncepts rykte drar mot krogens (CONCEPT.reputationDriftPerDay).
export function driftConceptReputation(state: SimulationState): SimulationState {
  const r = reputationByTier(state);
  const k = CONCEPT.reputationDriftPerDay;
  const next = Object.fromEntries(TIERS.map((t) => [t, r[t] + (state.reputation - r[t]) * k])) as Record<Tier, number>;
  return { ...state, reputationByTier: next };
}

// Samma som driftConceptReputation, i ett utkast (natten i serviceEvents.ts).
export function driftConceptReputationInPlace(draft: SimulationState): void {
  draft.reputationByTier = driftConceptReputation(draft).reputationByTier;
}

// ORDER 307 — ett svar flyttar ryktet i kvällens koncept: ORDER 303:s
// poäng, och ett fel gånger förlåtelsen hos bordets gästtyp
// (balance.ts GUEST_TYPES.forgiveness). Poängen på skalan 0–100.
export function moveConceptReputation(draft: SimulationState, tier: Tier, points: number, scale: number): void {
  const r = { ...reputationByTier(draft) };
  r[tier] = Math.max(0, Math.min(1, r[tier] + points / scale));
  draft.reputationByTier = r;
}

// ORDER 307b — hårdare följder av fel svar i högre klass (CONCEPT.wrongFactor),
// efter kvällens koncept i bokningen.
export function conceptWrongFactor(state: Pick<SimulationState, 'day'>): number {
  const b = state.day.booking;
  const c = b && b.dayNumber === state.day.dayNumber ? b.concept : null;
  return c ? CONCEPT.wrongFactor[c] : 1;
}
