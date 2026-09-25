// ORDER 267 (Nexus v1 etapp 5) — slumpmålet (ordern §1.2).
//
// Speldesign > Ekonomin > Slumpen: "En enskild kväll får gå riktigt illa
// även för en duktig spelare. Över en vecka ska den bättre förberedda
// spelaren vinna ungefär tre veckor av fyra. […] Målet mäts med 1 000
// simulerade veckor och fast fröslump." (balance.ts RANDOMNESS)
//
// Tolkningen (F35):
//   - veckan: vecka 2, en vanlig vecka (ingen introduktionsfaktor, ingen
//     högtid), vinbaren i spelarens rum (roomParity.ts via playDay);
//   - spelarna: B har vinbarens krav (brons i Stensöta, Metodköket och
//     Kalastorget); A är bättre förberedd med två medaljsteg till
//     (silver i Stensöta, brons i Måltidsbiblioteket). Båda öppnar varje
//     kväll och gör inget annat på morgonen;
//   - vinna: veckans resultat, kassans förändring från måndag morgon till
//     söndag morgon utan avräkningens påfyllnad och amortering, är högre;
//   - slumpen: A och B spelar var sin fast frövecka (2i och 2i + 1), så
//     att väder, gäster och händelser skiljer sig som mellan två veckor.

import { playDay } from './weekHarness';
import { makeNewGameState } from '../simulation/model';
import { WEEK } from '../../sim/balance';
import { firstDayOfWeek } from '../../sim/calendar';
import type { SimulationState } from '../types';

export const MEASURED_WEEK = 2;

export const PLAYERS: Record<'better' | 'baseline', SimulationState['medals']> = {
  baseline: { stensota: 'brons', metodkoket: 'brons', kalastorget: 'brons' },
  better: { stensota: 'silver', metodkoket: 'brons', kalastorget: 'brons', maltidbiblioteket: 'brons' }
};

export interface WeekResult {
  seed: number;
  resultSek: number;
  guests: number;
  reputationEnd: number;
}

export function playMeasuredWeek(seed: number, medals: SimulationState['medals']): WeekResult {
  let s = makeNewGameState(seed);
  s = { ...s, medals: { ...medals }, day: { ...s.day, dayNumber: firstDayOfWeek(MEASURED_WEEK) } };
  const cashStart = s.cash;
  let guests = 0;
  for (let d = 0; d < WEEK.daysPerWeek - 1; d++) {
    const r = playDay(s, {});
    s = r.state;
    guests += r.guests;
  }
  const settlement = s.economy.lastSettlement;
  const topUp = settlement?.topUpSek ?? 0;
  const amortisation = settlement?.amortisationSek ?? 0;
  return { seed, resultSek: Math.round(s.cash - cashStart - topUp + amortisation), guests, reputationEnd: s.reputation };
}

export interface RandomnessMeasurement {
  weeks: number;
  betterWins: number;
  ties: number;
  winShare: number;
  pairs: { better: WeekResult; baseline: WeekResult }[];
}

export function measureRandomness(weeks: number, seedBase = 1): RandomnessMeasurement {
  const pairs: RandomnessMeasurement['pairs'] = [];
  let betterWins = 0;
  let ties = 0;
  for (let i = 0; i < weeks; i++) {
    const better = playMeasuredWeek(seedBase + 2 * i, PLAYERS.better);
    const baseline = playMeasuredWeek(seedBase + 2 * i + 1, PLAYERS.baseline);
    if (better.resultSek > baseline.resultSek) betterWins++;
    else if (better.resultSek === baseline.resultSek) ties++;
    pairs.push({ better, baseline });
  }
  return { weeks, betterWins, ties, winShare: betterWins / Math.max(1, weeks), pairs };
}
