// ORDER 287a — de tre hållbarheterna som nivåer 0–10 (förslaget i
// documentation/game-design/FORSLAG_HALLBARHETERNA_0_10.md, godkänt av
// Vision Owner 2026-09-29 med villkor). Nivån räknas ur kvällen, när
// servicen stänger (reducer.ts), och förra kvällens nivå visas bredvid.
// Talen står i balance.ts SUSTAINABILITY_LEVELS.
//
// `before` är tillståndet när servicen stänger, `after` efter stängningen
// (sopbilen avräknad), samma par som recordEvening läser.

import type { SimulationState, SustainabilityLevels } from '../strategic/types';
import { SUSTAINABILITY_LEVELS as L } from './balance';
import { findDish } from '../strategic/simulation/m4Catalogue';

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const level = (x: number) => Math.round(L.max * clamp01(x));

// Social: andelen av kvällens gäster som gick nöjda, och personalens ork.
export function socialLevel(before: SimulationState, after: SimulationState): number {
  const guests = before.day.arrivalsToday ?? 0;
  const happy = (after.metrics.happyDeparturesTotal ?? 0) - (before.day.happyAtServiceStart ?? after.metrics.happyDeparturesTotal ?? 0);
  const share = guests > 0 ? clamp01(happy / guests) : 0;
  return level(share * L.socialHappy + clamp01(after.morale) * L.socialMorale);
}

// Ekonomisk: dagens marginal med morgonens inköp (kassans förändring
// sedan gryningen) mot kvällens intäkt.
export function economicMargin(before: SimulationState, after: SimulationState): number | null {
  const revenue = after.eveningAccount?.metrics?.revenue ?? 0;
  const start = before.day.cashAtDayStart;
  if (revenue <= 0 || start === null || start === undefined) return null;
  return (after.cash - start) / revenue;
}

export function economicLevel(before: SimulationState, after: SimulationState): number {
  const margin = economicMargin(before, after);
  if (margin === null) return 0;
  return level((margin - L.economicFloor) / (L.economicCeil - L.economicFloor));
}

// Ekologisk: osålda portioner till sopbilen mot portionerna vid öppning,
// och gårdagens rester som gick till sopbilen.
export function ecologicalLevel(before: SimulationState, after: SimulationState): number {
  const day = before.day.dayNumber;
  const atOpen = Object.entries(before.day.stockAtOpen ?? {})
    .filter(([id]) => findDish(id)?.kind !== 'drink')
    .reduce((a, [, n]) => a + n, 0);
  const w = after.lastWaste;
  const unsold = w && w.dayNumber === day ? w.fractions?.find((f) => f.key === 'unsold')?.count ?? 0 : 0;
  const base = atOpen > 0 ? L.max * clamp01(1 - unsold / atOpen) : L.max;
  const s = before.salvage;
  const leftoversBinned = !!s && s.fromDay < day && (s.resolved === 'wrong' || s.resolved === 'discarded');
  return Math.max(0, Math.round(base) - (leftoversBinned ? L.ecologicalLeftoverPenalty : 0));
}

export function sustainabilityLevelsFor(before: SimulationState, after: SimulationState): SustainabilityLevels {
  return {
    social: socialLevel(before, after),
    economic: economicLevel(before, after),
    ecological: ecologicalLevel(before, after)
  };
}
