// ORDER 296 — de äldre ekonomireglerna i testerna som prövar dem: nedgradering
// efter tre dagsavslut, golvets påfyllnad och amortering under säsongen.
// Kärnans risk (balance.ts RISK) stänger av dem i spelet; testerna av de
// gamla reglerna kör med dem påslagna och med den förra startkassan.
// ORDER 303c — och med den förra introduktionshyran (17 % veckorna 1–2,
// ORDER 294); spelet har nu ingen hyra de fyra första veckorna.

import { afterAll, beforeAll } from 'vitest';
import { RENT, RISK } from '../../sim/balance';

export const LEGACY_START_CASH_SEK = 120_000;

const LEGACY = { downgrade: true, floorTopUp: true, amortiseDuringSeason: true, startCashSek: LEGACY_START_CASH_SEK, cashTurnsAwayGuests: true } as const;
const LEGACY_RENT = { introWeeks: 2, introShareOfNormalWeeklyRevenue: 0.17 } as const;

// `now`: reglerna slås på direkt, för filer som kör scenariot när filen läses
// (utanför it och beforeAll). De slås av igen när filen är klar.
export function useLegacyEconomy(opts: { now?: boolean } = {}): void {
  const saved: Partial<Record<keyof typeof LEGACY, boolean | number>> = {};
  const savedRent: Partial<Record<keyof typeof LEGACY_RENT, number>> = {};
  const r = RISK as unknown as Record<string, boolean | number>;
  const rent = RENT as unknown as Record<string, number>;
  const on = () => {
    for (const k of Object.keys(LEGACY) as (keyof typeof LEGACY)[]) { saved[k] = r[k]; r[k] = LEGACY[k]; }
    for (const k of Object.keys(LEGACY_RENT) as (keyof typeof LEGACY_RENT)[]) { savedRent[k] = rent[k]; rent[k] = LEGACY_RENT[k]; }
  };
  if (opts.now) on();
  else beforeAll(on);
  afterAll(() => {
    for (const k of Object.keys(LEGACY) as (keyof typeof LEGACY)[]) r[k] = saved[k]!;
    for (const k of Object.keys(LEGACY_RENT) as (keyof typeof LEGACY_RENT)[]) rent[k] = savedRent[k]!;
  });
}
