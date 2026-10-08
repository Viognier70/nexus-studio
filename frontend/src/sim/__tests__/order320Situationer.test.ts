// ORDER 320 (Anders 2026-10-08, ORDER_320_FOODTRUCK_SITUATIONER.md) — sex nya situationer vid foodtrucken i
// formen från 306b: banken (leveransen situationer320), utlösarna som syns i bild (sim/truckSituations.ts),
// ⚖ i ft-hunden döljer bara lagtexten, alternativen blandas, gästens replik lottas och växlar, och förra
// kvällens situationer kommer inte igen om det finns andra.

import { describe, expect, it } from 'vitest';
import { playMorning, startInFoodtruck } from '../../strategic/testHarness/weekHarness';
import { reducer } from '../../strategic/simulation/reducer';
import { makeGuest } from '../../strategic/simulation/model';
import { firstDayOfWeek } from '../calendar';
import { eveningProgress } from '../clock';
import { SAUSAGE, TRUCK_SITUATIONS } from '../balance';
import { FOODTRUCK_ALL, incidentBankFor, optionExplanationHidden, validateIncidentBank, FOODTRUCK_FILES } from '../incidentBank';
import { optionOrder, planIncidents } from '../incidents';
import { truckCueReady, grillTruckAtTorget } from '../truckSituations';
import { truckOf, type TruckWeatherKind } from '../truckLife';
import type { SimulationState } from '../../strategic/types';

const IDS = ['ft08-regnet', 'ft09-getingen', 'ft10-kortet', 'ft11-slut', 'ft12-hunden', 'ft13-priset'];
const TICK = { type: 'TICK', dt: 0.2 } as const;

function open(seed = 1, day = firstDayOfWeek(1), weather?: TruckWeatherKind, extra: Record<string, unknown> = {}): SimulationState {
  let s = playMorning(startInFoodtruck(seed, day), { scenarioAnswer: 'best', ladder: 'never' });
  if (weather) s = { ...s, day: { ...s.day, truck: { ...truckOf(s), weather, rainFromE: weather === 'rain' ? 0.2 : null, ...extra } } };
  return reducer(s, { type: 'START_SERVICE' });
}

function until(s: SimulationState, done: (s: SimulationState) => boolean, max = 20000): SimulationState {
  for (let i = 0; i < max && !done(s); i++) { s = reducer(s, TICK); if (s.day.period !== 'dinner') break; }
  return s;
}

function withGuests(s: SimulationState, n: number, state: 'waiting' | 'ordering' | 'eating', spot?: string): SimulationState {
  const guests = [...s.guests];
  for (let i = 0; i < n; i++) { const g = makeGuest(s.simTime, false, false); g.state = state; if (spot) g.truckSpot = spot; guests.push(g); }
  return { ...s, guests };
}

describe('ORDER 320 — banken', () => {
  const six = FOODTRUCK_ALL.filter((i) => IDS.includes(i.id));

  it('sex situationer i formen från 306b, giltiga på båda språken, och alla i spelet', () => {
    expect(six.map((i) => i.id).sort()).toEqual([...IDS].sort());
    expect(validateIncidentBank(FOODTRUCK_FILES.meta, FOODTRUCK_FILES.sv)).toEqual([]);
    for (const i of six) {
      expect(i.form).toBe('triad');
      expect(i.steps.map((s) => s.axis)).toEqual(['episteme', 'phronesis', 'techne']);
      // Gästens två repliker, ledtrådarna efter steg 1 och 2, halvt grepp åt båda hållen och personalens utfall.
      expect(i.text.guestLine?.a && i.text.guestLine?.b).toBeTruthy();
      expect(i.steps[0].text.clue && i.steps[1].text.clue).toBeTruthy();
      expect(i.text.halfGrip?.analysis && i.text.halfGrip?.experience && i.text.halfGrip?.outcomeAnalysis && i.text.halfGrip?.outcomeExperience).toBeTruthy();
      expect(i.text.staffTexts?.success && i.text.staffTexts?.fail).toBeTruthy();
      // Steg 3: ett helt grepp, ett halvt mot analysen, ett halvt mot upplevelsen och ett fel.
      const s3 = i.steps[2].options;
      expect(s3.filter((o) => o.quality === 'best')).toHaveLength(1);
      expect(s3.filter((o) => o.grip === 'analysis')).toHaveLength(1);
      expect(s3.filter((o) => o.grip === 'experience')).toHaveLength(1);
      expect(s3.filter((o) => o.quality === 'wrong')).toHaveLength(1);
      expect(i.cue).toBeTruthy();
    }
    expect(incidentBankFor('foodtruck').filter((i) => IDS.includes(i.id))).toHaveLength(6);
  });

  it('ft-hunden är ⚖: situationen visas, och bara lagtexten (svaret om var hunden får vara) döljs', () => {
    const dog = FOODTRUCK_ALL.find((i) => i.id === 'ft12-hunden')!;
    expect(dog.legal).toBeUndefined();
    expect(dog.legalText?.legalReviewed).toBe(false);
    const hidden = dog.steps.flatMap((s) => s.options.filter((o) => optionExplanationHidden(dog, o)).map((o) => `${s.axis}:${o.id}`));
    expect(hidden).toEqual(['episteme:a']);
    expect(optionExplanationHidden({ legalText: { legalReviewed: true } }, dog.steps[0].options[0])).toBe(false);
  });

  it('alternativen blandas: samma ordning för samma situation och steg, en annan när situationen öppnas på nytt', () => {
    const i = FOODTRUCK_ALL.find((x) => x.id === 'ft10-kortet')!;
    const a = optionOrder(i, { openedAt: 100 }, 2, 7).map((o) => o.id);
    expect(optionOrder(i, { openedAt: 100 }, 2, 7).map((o) => o.id)).toEqual(a);
    expect([...a].sort()).toEqual(['a', 'b', 'c', 'd']);
    const orders = new Set(Array.from({ length: 12 }, (_, k) => optionOrder(i, { openedAt: 100 + 37 * k }, 2, 7).map((o) => o.id).join('')));
    expect(orders.size).toBeGreaterThan(3);
    // Situationerna utan repliker (bas) blandas inte.
    const bas = FOODTRUCK_ALL.find((x) => x.id === 'ft01-rusningen')!;
    expect(optionOrder(bas, { openedAt: 100 }, 0, 7).map((o) => o.id)).toEqual(bas.steps[0].options.map((o) => o.id));
  });
});

describe('ORDER 320 — utlösarna syns i bild', () => {
  it('regnet: just när det börjat regna, inte före och inte långt efter', () => {
    let s = open(1, firstDayOfWeek(1), 'rain');
    expect(truckCueReady(s, 'rainStarts')).toBe(false);
    s = until(s, (x) => (eveningProgress(x) ?? 0) >= 0.21);
    expect(truckCueReady(s, 'rainStarts')).toBe(true);
    s = until(s, (x) => (eveningProgress(x) ?? 0) >= 0.2 + TRUCK_SITUATIONS.rainWindowE + 0.02);
    expect(truckCueReady(s, 'rainStarts')).toBe(false);
  });

  it('getingarna en solig kväll och hunden när någon äter vid ett ståbord', () => {
    const s = open(1, firstDayOfWeek(1), 'sun');
    expect(truckCueReady(s, 'wasps')).toBe(false);
    expect(truckCueReady(s, 'dog')).toBe(false);
    const eating = withGuests(s, 1, 'eating', 'A-W');
    expect(truckCueReady(eating, 'wasps')).toBe(true);
    expect(truckCueReady(eating, 'dog')).toBe(true);
    const cool = withGuests(open(1, firstDayOfWeek(1), 'cool'), 1, 'eating', 'A-W');
    expect(truckCueReady(cool, 'wasps')).toBe(false);
    expect(truckCueReady(withGuests(open(1, firstDayOfWeek(1), 'sun'), 1, 'eating', 'bench0'), 'dog')).toBe(false);
  });

  it('kortläsaren i rusningen: minst cardAtHatch vid luckan', () => {
    const s = open(1, firstDayOfWeek(1), 'sun');
    expect(truckCueReady(withGuests(s, TRUCK_SITUATIONS.cardAtHatch - 1, 'waiting'), 'cardReader')).toBe(false);
    expect(truckCueReady(withGuests(s, TRUCK_SITUATIONS.cardAtHatch, 'ordering'), 'cardReader')).toBe(true);
  });

  it('korven tar slut: högst SAUSAGE.lowAt korvar kvar och minst SAUSAGE.queueAtLow vid luckan; varje gäst tar korv ur lådan', () => {
    let s = open(1, firstDayOfWeek(1), 'sun');
    expect(truckOf(s).sausagesLeft).toBe(SAUSAGE.perEvening);
    s = until(s, (x) => (x.day.billsTonight ?? 0) >= 5);
    expect(truckOf(s).sausagesLeft!).toBeLessThan(SAUSAGE.perEvening - 4);
    const low = { ...s, guests: s.guests.filter((g) => g.state !== 'waiting' && g.state !== 'ordering'), day: { ...s.day, truck: { ...truckOf(s), sausagesLeft: SAUSAGE.lowAt } } };
    const busy = withGuests(low, SAUSAGE.queueAtLow, 'waiting');
    expect(truckCueReady(busy, 'stockLow')).toBe(true);
    expect(truckCueReady(withGuests(low, SAUSAGE.queueAtLow - 1, 'waiting'), 'stockLow')).toBe(false);
    expect(truckCueReady({ ...busy, day: { ...busy.day, truck: { ...truckOf(busy), sausagesLeft: SAUSAGE.lowAt + 1 } } }, 'stockLow')).toBe(false);
  });

  it('Grillvagnens skylt bara när Grillvagnen står på torget', () => {
    // Vecka 1: dag 4 är torsdag (Grillvagnen på torget), dag 2 tisdag (vid Måltidens hus).
    for (const d of [1, 2, 3, 4, 5, 6]) {
      const s = open(1, firstDayOfWeek(1) + d - 1, 'sun');
      expect(truckCueReady(s, 'rivalSign')).toBe(grillTruckAtTorget(s));
    }
    expect([1, 2, 3, 4, 5, 6].some((d) => grillTruckAtTorget(open(1, firstDayOfWeek(1) + d - 1, 'sun')))).toBe(true);
  });
});

describe('ORDER 320 — takten', () => {
  it('förra servicekvällens situationer följer med till nästa kväll', () => {
    let s = until(open(2, firstDayOfWeek(1), 'sun'), (x) => (x.incidents?.log.length ?? 0) >= 2);
    const tonight = s.incidents!.log.map((r) => r.id);
    expect(tonight.length).toBeGreaterThan(1);
    s = planIncidents(s, s.simTime, s.simTime + 600);
    expect(s.incidents!.previousEvening).toEqual(tonight);
  });
});
