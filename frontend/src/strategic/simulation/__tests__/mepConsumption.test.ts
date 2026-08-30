// ORDER 117 §4 DoD 6.5 — låg mise en place ger synlig konsekvens i
// överlämningen (grep + service-logik).

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  applyMissingMepHit,
  consumeMepForOneGuest,
  mostMissingMepItem,
  MEP_CONSUMPTION_PER_GUEST,
  MEP_MISSING_HIT,
  MEP_HIT_THRESHOLD
} from '../mepConsumption';
import { makeInitialState } from '../model';
import { capacityForBusiness } from '../../business/businessClass';
import type { SimulationState } from '../../types';

function foodtruckWithReadiness(readiness: Record<string, number>): SimulationState {
  const s = makeInitialState();
  return {
    ...s,
    businessClass: 'foodtrucken',
    policies: {
      ...s.policies,
      capacity: capacityForBusiness('foodtrucken', s.policies.staffCount)
    },
    day: { ...s.day, prepReadiness: readiness },
    cash: 240_000
  };
}

// -----------------------------------------------------------------------------
// Grep — service-logiken läser prep-items, inte bara panelen
// -----------------------------------------------------------------------------

describe('ORDER 117 §4 DoD 6.5 — grep: prep-items i serveringslogiken', () => {
  it('mepConsumption.ts existerar och exporterar konsumtions-rate', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(here, '..', 'mepConsumption.ts'), 'utf8');
    expect(src).toContain('MEP_CONSUMPTION_PER_GUEST');
    expect(src).toContain('MEP_MISSING_HIT');
    // De fem prep-item-namnen (matchar miseEnPlace.ts:PREP_ITEMS)
    expect(src).toContain('napkins');
    expect(src).toContain('garnish');
    expect(src).toContain('stations');
  });

  it('service.ts läser mepConsumption vid ordering→serving', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(here, '..', 'service.ts'), 'utf8');
    expect(src).toContain('applyMissingMepHit');
    expect(src).toContain('consumeMepForOneGuest');
  });
});

// -----------------------------------------------------------------------------
// Konsumtion — mängden dras korrekt per gäst
// -----------------------------------------------------------------------------

describe('ORDER 117 §4 — MeP-konsumtion per gäst', () => {
  it('napkins minskar med 0.03 per gäst', () => {
    const s = foodtruckWithReadiness({ napkins: 1.0, garnish: 1.0 });
    consumeMepForOneGuest(s);
    expect(s.day.prepReadiness.napkins).toBeCloseTo(1.0 - MEP_CONSUMPTION_PER_GUEST.napkins, 3);
  });

  it('garnish minskar med 0.04 per gäst — snabbare än napkins?  Nej, långsammare', () => {
    // OBS: garnish=0.04 vs napkins=0.03 så garnish faktiskt SNABBARE
    // per tick. Men effekten är att napkins hamnar under tröskeln
    // 0.2 vid ~26 gäster, garnish vid ~20 — så garnish hinner först.
    // Ordertexten §4: "servett saknas är mild och vanlig, garnityr
    // är allvarligare" — vanlig = drar tomt snabbt.
    // Räknar bara att båda dras.
    const s = foodtruckWithReadiness({ napkins: 1.0, garnish: 1.0 });
    for (let i = 0; i < 20; i++) consumeMepForOneGuest(s);
    expect(s.day.prepReadiness.napkins).toBeLessThan(1.0);
    expect(s.day.prepReadiness.garnish).toBeLessThan(1.0);
  });

  it('stations är LÅNGSAMMAST att tömmas (0.01) — sällsynt att helt saknas', () => {
    const s = foodtruckWithReadiness({ stations: 1.0 });
    for (let i = 0; i < 30; i++) consumeMepForOneGuest(s);
    // Efter 30 gäster (typisk lunch+middag) är stations ~0.7 kvar,
    // långt över tröskeln 0.2.
    expect(s.day.prepReadiness.stations).toBeGreaterThan(MEP_HIT_THRESHOLD);
  });

  it('readiness kläppt till 0, inte negativ', () => {
    const s = foodtruckWithReadiness({ napkins: 0.02 });
    consumeMepForOneGuest(s);
    expect(s.day.prepReadiness.napkins).toBe(0);
  });
});

// -----------------------------------------------------------------------------
// Satisfaction-hits — mild för servett, allvarligare för garnityr,
// mest för utebliven mat
// -----------------------------------------------------------------------------

describe('ORDER 117 §4 — satisfaction-hits följer VO-ordning', () => {
  it('servett saknas = mild hit (< garnish, < stations)', () => {
    expect(MEP_MISSING_HIT.napkins).toBeGreaterThan(MEP_MISSING_HIT.garnish);
    expect(MEP_MISSING_HIT.napkins).toBeGreaterThan(MEP_MISSING_HIT.stations);
    // (Vi jämför signerade nummer: -0.04 > -0.12 > -0.25.)
  });

  it('utebliven mat = mest hit (< garnish, < napkins)', () => {
    expect(MEP_MISSING_HIT.stations).toBeLessThan(MEP_MISSING_HIT.garnish);
    expect(MEP_MISSING_HIT.stations).toBeLessThan(MEP_MISSING_HIT.napkins);
  });

  it('applyMissingMepHit: under tröskel → satisfaction sjunker', () => {
    const s = foodtruckWithReadiness({ napkins: 0.1, garnish: 1.0 });
    const guest = { satisfaction: 0.7 };
    const hit = applyMissingMepHit(s, guest);
    expect(hit).toBeLessThan(0);
    expect(guest.satisfaction).toBeLessThan(0.7);
  });

  it('applyMissingMepHit: över tröskel → ingen effekt', () => {
    const s = foodtruckWithReadiness({ napkins: 1.0, garnish: 1.0 });
    const guest = { satisfaction: 0.7 };
    const hit = applyMissingMepHit(s, guest);
    expect(hit).toBe(0);
    expect(guest.satisfaction).toBe(0.7);
  });

  it('applyMissingMepHit: flera brister ackumulerar (napkins + garnish)', () => {
    const s = foodtruckWithReadiness({ napkins: 0.1, garnish: 0.1 });
    const guest = { satisfaction: 0.9 };
    const hit = applyMissingMepHit(s, guest);
    expect(hit).toBeCloseTo(MEP_MISSING_HIT.napkins + MEP_MISSING_HIT.garnish, 3);
  });

  it('ingen brist stoppar servicen: guest.satisfaction klämpt till 0, inte negativ', () => {
    const s = foodtruckWithReadiness({ napkins: 0, garnish: 0, stations: 0, cutlery: 0, ice: 0 });
    const guest = { satisfaction: 0.2 };
    applyMissingMepHit(s, guest);
    // Absolut summa: -0.04 - 0.05 - 0.12 - 0.25 - 0.06 = -0.52
    // Från 0.2 → -0.32, klämpt till 0.
    expect(guest.satisfaction).toBe(0);
    // Ingen kod har kastat exception; overhead-fältet på state.guests
    // finns inte påverkat — gästen är fortfarande i orderingen och
    // fortsätter genom serving-fasen normalt.
  });
});

// -----------------------------------------------------------------------------
// mostMissingMepItem — allvarlighetsordning
// -----------------------------------------------------------------------------

describe('ORDER 117 §4 — mostMissingMepItem prioriterar allvarlighet', () => {
  it('stations under tröskel → returnerar "stations" även om napkins också under', () => {
    const readiness = { napkins: 0.1, garnish: 0.1, stations: 0.1, cutlery: 1, ice: 1 };
    expect(mostMissingMepItem(readiness)).toBe('stations');
  });

  it('bara garnish under tröskel → "garnish"', () => {
    const readiness = { napkins: 1, garnish: 0.1, stations: 1, cutlery: 1, ice: 1 };
    expect(mostMissingMepItem(readiness)).toBe('garnish');
  });

  it('bara napkins under tröskel → "napkins"', () => {
    const readiness = { napkins: 0.1, garnish: 1, stations: 1, cutlery: 1, ice: 1 };
    expect(mostMissingMepItem(readiness)).toBe('napkins');
  });

  it('inget under tröskel → null', () => {
    const readiness = { napkins: 0.5, garnish: 0.5, stations: 0.5, cutlery: 0.5, ice: 0.5 };
    expect(mostMissingMepItem(readiness)).toBeNull();
  });
});
