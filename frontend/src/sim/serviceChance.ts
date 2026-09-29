// ORDER 278 — slumpens händelser i servicen (Vision Owner 2026-09-28,
// andra provspelet): "En händelseström som i stunden visar beställningar,
// betalningar som tickar in, dricks och slumpens händelser."
// Speldesign > Servicen > Händelseströmmen.
//
// Några gånger per kväll händer något som ingen planerat: ett glas välter,
// en stamgäst bjuder på en runda, ett sällskap firar med en flaska, gäster
// kommer in utan att ha bokat, grannen klagar eller en gäst berömmer
// stället. Varje händelse verkar direkt (lagret, kassan, gästerna) och
// står i strömmen. Talen står i `balance.ts` `SERVICE_STREAM`.

import { clockMinutes, formatClock } from './incidents';
import type { SimulationState } from '../strategic/types';
import { createRng } from '../strategic/util/rng';
import { applyCashRevenue } from '../strategic/simulation/cashReading';
import { findDish } from '../strategic/simulation/m4Catalogue';
import { takeFromStock } from '../strategic/simulation/stockPackages';
import { strings } from '../content/strings';
import { INCIDENTS, SERVICE_STREAM } from './balance';

export type ChanceKind = keyof typeof SERVICE_STREAM.chance;
const KINDS = Object.keys(SERVICE_STREAM.chance) as ChanceKind[];

// När servicen öppnar: kvällens tidpunkter, utspridda över tiden med öppna
// dörrar (samma fönster som raketerna).
export function planChance(state: SimulationState, doorsOpenAt: number, serviceEndsAt: number): SimulationState {
  const rng = createRng(state.rngState);
  const n = rng.int(SERVICE_STREAM.chanceMin, SERVICE_STREAM.chanceMax);
  const window = serviceEndsAt - doorsOpenAt;
  const times = Array.from({ length: n }, () => doorsOpenAt + window * rng.range(INCIDENTS.windowStart, INCIDENTS.windowEnd)).sort((a, b) => a - b);
  return { ...state, rngState: rng.state, day: { ...state.day, chanceTimes: times } };
}

const PRESENT = new Set(['seated', 'ordering', 'dining', 'paying']);

function drinksInStock(draft: SimulationState, kinds: string[]): string[] {
  return draft.menu
    .filter((m) => kinds.includes(findDish(m.dishId)?.drink ?? '') && (draft.day.platesRemaining[m.dishId] ?? 0) > 0)
    .map((m) => m.dishId);
}

function sell(draft: SimulationState, dishId: string): number {
  const entry = draft.menu.find((m) => m.dishId === dishId);
  if (!entry) return 0;
  takeFromStock(draft, dishId, draft.simTime);
  applyCashRevenue(draft, entry.price);
  draft.serviceRevenueToday.dinner += entry.price / SERVICE_STREAM.sekPerKsek;
  return entry.price;
}

const sek = (v: number) => strings.service.meters.sek(Math.round(v).toLocaleString('en-GB'));

// En händelse: verkan och raden i strömmen. Null när den inte kan hända
// just nu (till exempel inget vin i lager).
function apply(draft: SimulationState, kind: ChanceKind, r: () => number): string | null {
  const t = strings.chance;
  const c = SERVICE_STREAM.chance;
  switch (kind) {
    case 'glassBroken': {
      const glasses = drinksInStock(draft, ['wine-glass']);
      if (glasses.length === 0) return null;
      for (let i = 0; i < c.glassBroken.glasses; i++) takeFromStock(draft, glasses[Math.floor(r() * glasses.length)], draft.simTime);
      return t.glassBroken;
    }
    case 'regularRound': {
      let n = 0;
      let total = 0;
      for (let i = 0; i < c.regularRound.glasses; i++) {
        const glasses = drinksInStock(draft, ['wine-glass', 'beer']);
        if (glasses.length === 0) break;
        total += sell(draft, glasses[Math.floor(r() * glasses.length)]);
        n++;
      }
      return n > 0 ? t.regularRound(n, sek(total)) : null;
    }
    case 'birthday': {
      const bottles = drinksInStock(draft, ['wine-bottle']);
      if (bottles.length === 0) return null;
      const id = bottles[Math.floor(r() * bottles.length)];
      const paid = sell(draft, id);
      return t.birthday(findDish(id)?.name ?? id, sek(paid));
    }
    case 'walkIns':
      draft.scenario = { ...draft.scenario, spawnedRemaining: draft.scenario.spawnedRemaining + c.walkIns.guests, nextSpawnAt: draft.simTime };
      return t.walkIns(c.walkIns.guests);
    case 'neighbour':
    case 'goodWord': {
      const d = c[kind].satisfaction;
      for (const g of draft.guests) if (PRESENT.has(g.state)) g.satisfaction = Math.max(0, Math.min(1, g.satisfaction + d));
      return t[kind];
    }
  }
}

// Varje tick under servicen: när kvällens nästa tidpunkt har kommit händer
// något, viktat efter händelsernas vikt. Går den dragna inte, prövas nästa.
export function maybeChance(draft: SimulationState): void {
  const times = draft.day.chanceTimes;
  if (!times || times.length === 0 || draft.day.period !== 'dinner') return;
  if (draft.simTime < times[0]) return;
  const rng = createRng(draft.rngState);
  const r = () => rng.next();
  const total = KINDS.reduce((sum, k) => sum + SERVICE_STREAM.chance[k].weight, 0);
  let x = r() * total;
  let start = KINDS.length - 1;
  for (let i = 0; i < KINDS.length; i++) {
    x -= SERVICE_STREAM.chance[KINDS[i]].weight;
    if (x <= 0) { start = i; break; }
  }
  let text: string | null = null;
  let kind: ChanceKind = KINDS[start];
  // ORDER 285 — vad händelsen sålde, till kvällens händelselogg.
  const cashBefore = draft.cash;
  for (let i = 0; i < KINDS.length && text === null; i++) {
    kind = KINDS[(start + i) % KINDS.length];
    text = apply(draft, kind, r);
  }
  const soldSek = Math.round(draft.cash - cashBefore);
  draft.rngState = rng.state;
  draft.day = { ...draft.day, chanceTimes: times.slice(1) };
  if (text) {
    draft.eventStream = [...draft.eventStream, {
      at: draft.simTime, text, category: kind === 'neighbour' || kind === 'glassBroken' ? 'ambient' : 'positive',
      causeTag: null, causeChainId: null, sustainability: 'social', kind: `chance_${kind}`, scenarioId: null,
      clock: formatClock(clockMinutes(draft)),
      ...(soldSek !== 0 ? { chanceSek: soldSek } : {})
    }];
  }
}
