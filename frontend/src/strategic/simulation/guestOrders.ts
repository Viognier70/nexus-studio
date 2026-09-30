// ORDER 277 — gästerna har kost och plånbok (Vision Owner 2026-09-28,
// andra provspelet). Speldesign > Servicen > Gästerna.
//
// "Gästerna får kost (till exempel vegetarian, vegan, allergi) och
// plånbok. Saknas ett alternativ tappar man försäljning och rykte, och ett
// sällskap kan lämna."
//
// Varje gäst har en profil: kost (äter allt, vegetarian, vegan), en
// allergi eller ingen, om hen dricker alkohol, och sällskapets plånbok.
// Profilen läses ur spelets frö och gästens id (sällskapets id för
// plånboken), så att den är densamma varje gång den läses och inte flyttar
// simuleringens slumpflöde. Andelarna står i `balance.ts` `GUESTS`.
//
// Beställningen görs när gästen betalar (samma tick som förut, ORDER 275):
// en rätt som passar kosten och allergin och ryms i plånboken, och en
// dryck ur dryckeslistan. Ett generöst sällskap tar en flaska till bordet.
// Finns inget som passar går gästen utan att betala, ryktet sjunker och
// sällskapet kan gå med hen.

import type { Allergen, Guest, SimulationState } from '../types';
import { GUESTS, GUEST_TYPES, INCIDENTS, SERVICE_STREAM, STOCK } from '../../sim/balance';
import { strings } from '../../content/strings';
import { clampReputation } from './reputation';
import { dishAllergens, dishDiet, findDish } from './m4Catalogue';
import { takeFromStock } from './stockPackages';
import { REPEAT_GUARD_SEC } from './eventStream';

export type GuestDiet = 'any' | 'vegetarian' | 'vegan';
export type Wallet = keyof typeof GUESTS.walletSek;

export interface GuestProfile {
  diet: GuestDiet;
  allergy: Allergen | null;
  noAlcohol: boolean;
  wallet: Wallet;
}

// Vad som saknades för gästen.
export type MissingReason = 'vegetarian' | 'vegan' | 'lactose' | 'gluten' | 'soldOut' | 'wallet' | 'alcoholFree';

export type GuestOrder =
  | { kind: 'served'; dishId: string | null; drinks: string[]; revenueSek: number; missing: MissingReason | null }
  | { kind: 'lost'; reason: MissingReason; partyLeft: number };

// Ett tal i [0, 1) ur fröet och en nyckel (FNV-1a).
export function hash01(seed: number, key: string): number {
  let h = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h / 4294967296;
}

// ORDER 287a — gästens typ ger plånboken (balance.ts GUEST_TYPES.wallet);
// en gäst utan typ (äldre fixturer) har plånboken ur fröet som förut.
export function profileFor(seed: number, guest: Pick<Guest, 'id' | 'partyId' | 'guestType'>): GuestProfile {
  const d = hash01(seed, `${guest.id}|diet`);
  const diet: GuestDiet = d < GUESTS.dietShare.vegan ? 'vegan'
    : d < GUESTS.dietShare.vegan + GUESTS.dietShare.vegetarian ? 'vegetarian' : 'any';
  const a = hash01(seed, `${guest.id}|allergy`);
  const allergy: Allergen | null = a < GUESTS.allergyShare.lactose ? 'lactose'
    : a < GUESTS.allergyShare.lactose + GUESTS.allergyShare.gluten ? 'gluten' : null;
  const noAlcohol = hash01(seed, `${guest.id}|alcohol`) < GUESTS.noAlcoholShare;
  const w = hash01(seed, `${guest.partyId ?? guest.id}|wallet`);
  const wallet: Wallet = guest.guestType ? GUEST_TYPES.wallet[guest.guestType]
    : w < GUESTS.walletShare.tight ? 'tight'
    : w < GUESTS.walletShare.tight + GUESTS.walletShare.normal ? 'normal' : 'generous';
  return { diet, allergy, noAlcohol, wallet };
}

export function suitsProfile(dishId: string, p: GuestProfile): boolean {
  const diet = dishDiet(dishId);
  if (p.diet === 'vegan' && diet !== 'vegan') return false;
  if (p.diet === 'vegetarian' && diet !== 'vegan' && diet !== 'vegetarian') return false;
  if (p.allergy && dishAllergens(dishId).includes(p.allergy)) return false;
  return true;
}

// Varför inget på menyn passar gästen: kosten först, sedan allergin.
function dietReason(p: GuestProfile, menuIds: string[]): MissingReason {
  const dietOnly = { ...p, allergy: null };
  if (p.diet !== 'any' && !menuIds.some((id) => suitsProfile(id, dietOnly))) return p.diet;
  return p.allergy ?? 'soldOut';
}

type Entry = SimulationState['menu'][number];

// Viktat val efter plånbokens smak för pris.
function pickByTaste(items: Entry[], wallet: Wallet, r: number): Entry {
  const weights = items.map((m) => Math.pow(Math.max(1, m.price), GUESTS.priceTaste[wallet]));
  const total = weights.reduce((a, b) => a + b, 0);
  let x = r * total;
  for (let i = 0; i < items.length; i++) {
    x -= weights[i];
    if (x <= 0) return items[i];
  }
  return items[items.length - 1];
}

const left = (draft: SimulationState, dishId: string) => draft.day.platesRemaining[dishId] ?? 0;

export function tableOf(guest: Pick<Guest, 'seatIndex'>): number | null {
  return guest.seatIndex === null || guest.seatIndex === undefined ? null : Math.floor(guest.seatIndex / INCIDENTS.seatsPerTable) + 1;
}

// ORDER 278 — beställningen och betalningen i strömmen (positiva rader).
// ORDER 280 — med Designs H1-fält (slag, bord, belopp).
export function streamOrderLine(draft: SimulationState, text: string, kind: string, meta?: { feed: 'ordered' | 'paid' | 'tip' | 'miss'; table: number | null; amountSek?: number }): void {
  // Beställningar, betalningar och dricks upprepas med samma text (samma
  // bord), och de räknas alla; spärren gäller bara övriga meningar.
  const counted = meta && meta.feed !== 'miss';
  if (!counted && draft.eventStream.some((e) => e.text === text && draft.simTime - e.at <= REPEAT_GUARD_SEC)) return;
  draft.eventStream = [...draft.eventStream, {
    at: draft.simTime, text, category: meta?.feed === 'miss' ? 'ambient' : 'positive', causeTag: null, causeChainId: null,
    sustainability: 'economic', kind, scenarioId: null, ...(meta ?? {})
  }];
}

// ORDER 280 — beställningen som rader i Designs H1: "1 × Pork with root veg
// · 2 glasses Grüner Veltliner".
export function orderFeedLines(order: { dishId: string | null; drinks: string[] }): string {
  const parts: string[] = [];
  if (order.dishId) parts.push(strings.feed.linePortion(1, findDish(order.dishId)?.name ?? order.dishId));
  const counts = new Map<string, number>();
  for (const d of order.drinks) counts.set(d, (counts.get(d) ?? 0) + 1);
  for (const [id, n] of counts) {
    const dish = findDish(id);
    const name = (dish?.name ?? id).replace(/, by the glass$/, '').replace(/, bottle$/, '');
    parts.push(dish?.drink === 'wine-bottle' ? strings.feed.lineBottle(name) : dish?.drink === 'beer' ? strings.feed.linePortion(n, name) : strings.feed.lineGlass(n, name));
  }
  return parts.join(' · ');
}

// Samma mening upprepas inte inom strömmens spärr (eventStream.ts).
function streamLine(draft: SimulationState, text: string, kind: string): void {
  if (draft.eventStream.some((e) => e.text === text && draft.simTime - e.at <= REPEAT_GUARD_SEC)) return;
  draft.eventStream = [...draft.eventStream, {
    at: draft.simTime, text, category: 'ambient', causeTag: 'stock_out', causeChainId: null,
    sustainability: 'social', kind, scenarioId: null
  }];
}

// Sällskapet går med gästen: de som ännu inte betalat lämnar bordet.
function partyLeaves(draft: SimulationState, guest: Guest): number {
  if (!guest.partyId) return 0;
  const rest = draft.guests.filter((g) => g.partyId === guest.partyId && g.id !== guest.id
    && g.state !== 'leaving' && g.state !== 'declined' && g.state !== 'paying');
  for (const g of rest) {
    draft.waitingIds = draft.waitingIds.filter((id) => id !== g.id);
    draft.seatedIds = draft.seatedIds.filter((id) => id !== g.id);
    g.state = 'leaving';
    g.stateTime = draft.simTime;
    g.seatIndex = null;
    g.targetPosition = { x: 0, z: INCIDENTS.exitZ };
    g.moveProgress = 0;
  }
  return rest.length;
}

// Gästens beställning ur lagret. Muterar draft (lagret, ryktet, strömmen).
export function orderForGuest(draft: SimulationState, guest: Guest, rand: () => number): GuestOrder {
  const p = profileFor(draft.seed ?? 0, guest);
  const walletSek = GUESTS.walletSek[p.wallet];
  const table = tableOf(guest);
  const s = strings.guests;
  const food = draft.menu.filter((m) => findDish(m.dishId)?.kind !== 'drink');
  const suits = food.filter((m) => suitsProfile(m.dishId, p));
  const inStock = suits.filter((m) => left(draft, m.dishId) > 0);
  const affordable = inStock.filter((m) => m.price <= walletSek * GUESTS.dishShareOfWallet);

  // ORDER 278 — gästen vill ha en rätt (också en som tagit slut). Finns den
  // inte får hen en annan som passar, och blir missnöjd.
  const wanted = suits.filter((m) => m.price <= walletSek * GUESTS.dishShareOfWallet);
  let dish: Entry | null = null;
  let missing: MissingReason | null = null;
  const lost = (reason: MissingReason): GuestOrder => {
    draft.reputation = clampReputation(draft.reputation - GUESTS.missingOptionReputation);
    const partyLeft = rand() < GUESTS.partyLeavesChance ? partyLeaves(draft, guest) : 0;
    // ORDER 289 — gäster som gick utan mat, till rådet efter kvällen.
    if (reason === 'soldOut') draft.day.soldOutGuests = (draft.day.soldOutGuests ?? 0) + 1 + partyLeft;
    streamLine(draft, s.lost(reason, table, partyLeft), 'guest_lost_sale');
    return { kind: 'lost', reason, partyLeft };
  };
  if (wanted.length > 0) {
    const target = pickByTaste(wanted, p.wallet, rand());
    if (left(draft, target.dishId) > 0) {
      dish = target;
    } else if (affordable.length > 0) {
      dish = pickByTaste(affordable, p.wallet, rand());
      guest.satisfaction = Math.max(0, guest.satisfaction + SERVICE_STREAM.soldOutSatisfaction);
      draft.day.substitutedCount = (draft.day.substitutedCount ?? 0) + 1;
      streamOrderLine(draft, strings.feed.miss(table === null ? strings.feed.guest : String(table), findDish(target.dishId)?.name ?? target.dishId), 'guest_substituted', { feed: 'miss', table });
    } else if (inStock.length > 0) {
      missing = 'wallet';
    } else {
      return lost('soldOut');
    }
  } else if (inStock.length > 0) {
    // Plånboken räcker inte till någon rätt: gästen tar bara en dryck.
    missing = 'wallet';
  } else {
    return lost(suits.length === 0 ? dietReason(p, food.map((m) => m.dishId)) : 'soldOut');
  }

  let revenueSek = 0;
  if (dish) {
    takeFromStock(draft, dish.dishId, draft.simTime);
    revenueSek += dish.price;
  }

  // Drycken. Ett sällskap som redan har en flaska på bordet delar på den.
  const drinks: string[] = [];
  const partyKey = guest.partyId ?? null;
  const shared = partyKey !== null && (draft.day.bottlePartyIds ?? []).includes(partyKey);
  if (!shared) {
    const onList = draft.menu.filter((m) => findDish(m.dishId)?.kind === 'drink');
    const avail = onList.filter((m) => left(draft, m.dishId) > 0);
    let budget = walletSek - revenueSek;
    const bottles = avail.filter((m) => findDish(m.dishId)?.drink === 'wine-bottle' && m.price <= walletSek);
    const bottleRoll = rand();
    // ORDER 287a — miljardären tar det dyraste, en flaska också ensam.
    const gold = p.wallet === 'gold';
    if (!p.noAlcohol && bottles.length > 0 && (gold || (p.wallet === 'generous' && partyKey !== null && (guest.partySize ?? 1) >= GUESTS.minPartyForBottle
      && bottleRoll < GUESTS.bottleChance))) {
      const b = pickByTaste(bottles, p.wallet, rand());
      takeFromStock(draft, b.dishId, draft.simTime);
      drinks.push(b.dishId);
      revenueSek += b.price;
      if (partyKey !== null) draft.day = { ...draft.day, bottlePartyIds: [...(draft.day.bottlePartyIds ?? []), partyKey] };
    } else {
      const kinds = p.noAlcohol ? ['alcohol-free'] : ['wine-glass', 'beer'];
      const fits = (m: Entry) => kinds.includes(findDish(m.dishId)?.drink ?? '') && m.price <= budget;
      if (p.noAlcohol && !onList.some((m) => findDish(m.dishId)?.drink === 'alcohol-free')) {
        draft.reputation = clampReputation(draft.reputation - GUESTS.missingDrinkReputation);
        streamLine(draft, s.noAlcoholFree(table), 'guest_missing_drink');
        missing = missing ?? 'alcoholFree';
      }
      for (let glass = 0; glass < 2; glass++) {
        const options = avail.filter((m) => fits(m) && left(draft, m.dishId) > 0);
        if (options.length === 0) break;
        if (glass > 0 && rand() >= STOCK.secondDrinkChance) break;
        const d = pickByTaste(options, p.wallet, rand());
        takeFromStock(draft, d.dishId, draft.simTime);
        drinks.push(d.dishId);
        revenueSek += d.price;
        budget -= d.price;
      }
    }
  }

  if (missing === 'wallet') {
    guest.satisfaction = Math.max(0, guest.satisfaction + GUESTS.drinkOnlySatisfaction);
    draft.reputation = clampReputation(draft.reputation - GUESTS.missingDrinkReputation);
    streamLine(draft, s.drinkOnly(table), 'guest_wallet');
  }
  return { kind: 'served', dishId: dish?.dishId ?? null, drinks, revenueSek, missing };
}

// ORDER 278 — dricksen: en andel av notan efter gästens nöjdhet när hen
// betalar (balance.ts SERVICE_STREAM.tipBands).
export function tipShare(satisfaction: number): number {
  return SERVICE_STREAM.tipBands.find((b) => satisfaction >= b.minSatisfaction)?.share ?? 0;
}

// Vad gästen beställde, som text i strömmen.
export function orderItemNames(order: { dishId: string | null; drinks: string[] }): string[] {
  return [order.dishId, ...order.drinks].filter((id): id is string => !!id).map((id) => findDish(id)?.name ?? id);
}
