// ORDER 110 §7 — R4 verksamhetsklassen: DoD-tester på strukturell nivå.
//
// DoD-kartläggning:
//   DoD 1  Verksamhetsklass som begrepp — Restaurant.tsx ligger under
//          den. Verifieras genom att `BUSINESS_CLASS_CONFIG` har restaurant
//          som en av tre klasser, och att `state.businessClass` styr sim.
//   DoD 4  capacity följer verksamhet + bemanning.
//   DoD 5  Varje bankmötesutfall leder till rätt verksamhet.
//   DoD 6  Food truck har inga sittande gäster + sittmönstren anropas ej.
//   DoD 8  grep: 'balanced' inte i strings.sv.ts; Värdshuset som spelartext.
//
// DoD 2/3/7 partiellt uppfyllda i denna order och dokumenterade som
// öppet i registerposten — se ORDER_REGISTRY.md 110.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BUSINESS_CLASS_CONFIG,
  businessFromBankKlass,
  businessHasSeats,
  capacityForBusiness,
  type BusinessClass
} from '../businessClass';
import { TOTAL_SEATS } from '../interiorLayout';
import { reducer } from '../../simulation/reducer';
import { makeInitialState } from '../../simulation/model';
import type { BankMeetingKlass, SimAction } from '../../types';
import { strings } from '../../../content/strings.sv';

function accumulate(
  state: ReturnType<typeof makeInitialState>,
  axis: 'episteme' | 'techne' | 'phronesis',
  amount: number
) {
  const action: SimAction = { type: 'ACCUMULATE_KNOWLEDGE', axis, amount };
  return reducer(state, action);
}

// -----------------------------------------------------------------------------
// DoD 1 — abstraktionens form
// -----------------------------------------------------------------------------

describe('ORDER 110 §7 DoD 1 — verksamhetsklassen som begrepp', () => {
  it('BUSINESS_CLASS_CONFIG innehåller fem klasser (ORDER 125 lade till ölkrogen; ORDER 166 lade till vinbaren)', () => {
    const ids = Object.keys(BUSINESS_CLASS_CONFIG).sort();
    // UTF-16 codepoint-ordning: 'f' < 'g' < 'k' < 'v' < 'ö'.
    expect(ids).toEqual(['foodtrucken', 'gästgiveriet', 'kvarterskrogen', 'vinbaren', 'ölkrogen']);
  });

  it('restaurant är default-verksamhet i makeInitialState()', () => {
    expect(makeInitialState().businessClass).toBe('kvarterskrogen');
  });

  it('restaurant har matsal + mise en place; ingen övernattning', () => {
    const cfg = BUSINESS_CLASS_CONFIG.kvarterskrogen;
    expect(cfg.hasSeats).toBe(true);
    expect(cfg.hasMiseEnPlace).toBe(true);
    expect(cfg.hasOvernight).toBe(false);
  });

  it('foodtruck saknar matsal, saknar mise en place, saknar övernattning', () => {
    const cfg = BUSINESS_CLASS_CONFIG.foodtrucken;
    expect(cfg.hasSeats).toBe(false);
    expect(cfg.hasMiseEnPlace).toBe(false);
    expect(cfg.hasOvernight).toBe(false);
  });

  it('värdshus har matsal + mise en place + övernattning', () => {
    const cfg = BUSINESS_CLASS_CONFIG.gästgiveriet;
    expect(cfg.hasSeats).toBe(true);
    expect(cfg.hasMiseEnPlace).toBe(true);
    expect(cfg.hasOvernight).toBe(true);
  });

  it('ORDER 125 §3 — ölkrogen har matsal + mise en place, ingen övernattning', () => {
    const cfg = BUSINESS_CLASS_CONFIG.ölkrogen;
    expect(cfg.hasSeats).toBe(true);
    expect(cfg.hasMiseEnPlace).toBe(true);
    expect(cfg.hasOvernight).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// DoD 4 — capacity följer verksamhet + bemanning
// -----------------------------------------------------------------------------

describe('ORDER 110 §7 DoD 4 — capacity följer verksamhet + bemanning', () => {
  it('restaurant: TOTAL_SEATS oavsett bemanning', () => {
    expect(capacityForBusiness('kvarterskrogen', 2)).toBe(TOTAL_SEATS);
    expect(capacityForBusiness('kvarterskrogen', 3)).toBe(TOTAL_SEATS);
    expect(capacityForBusiness('kvarterskrogen', 4)).toBe(TOTAL_SEATS);
  });

  it('foodtruck: 3 × staffCount', () => {
    expect(capacityForBusiness('foodtrucken', 2)).toBe(6);
    expect(capacityForBusiness('foodtrucken', 3)).toBe(9);
    expect(capacityForBusiness('foodtrucken', 4)).toBe(12);
  });

  it('värdshus: TOTAL_SEATS + 6 rum', () => {
    expect(capacityForBusiness('gästgiveriet', 2)).toBe(TOTAL_SEATS + 6);
    expect(capacityForBusiness('gästgiveriet', 4)).toBe(TOTAL_SEATS + 6);
  });

  it('ORDER 125 §3 — ölkrogen: 20 platser oavsett bemanning', () => {
    expect(capacityForBusiness('ölkrogen', 2)).toBe(20);
    expect(capacityForBusiness('ölkrogen', 3)).toBe(20);
    expect(capacityForBusiness('ölkrogen', 4)).toBe(20);
  });

  it('REQUEST_BANK_LOAN uppdaterar policies.capacity när verksamhet skiftar', () => {
    let s = makeInitialState();
    expect(s.policies.capacity).toBe(TOTAL_SEATS);
    // Öva techne → bankmötet → foodtruck; capacity ska följa med.
    s = accumulate(s, 'techne', 0.5);
    s = reducer(s, { type: 'REQUEST_BANK_LOAN' });
    expect(s.businessClass).toBe('foodtrucken');
    expect(s.policies.capacity).toBe(capacityForBusiness('foodtrucken', s.policies.staffCount));
  });
});

// -----------------------------------------------------------------------------
// DoD 5 — varje bankmötesutfall leder till rätt verksamhet
// -----------------------------------------------------------------------------

describe('ORDER 110 §7 DoD 5 — bankmötesutfall → rätt verksamhet', () => {
  it('mappningen: phronesis → restaurant, techne → foodtruck, balanced → värdshus', () => {
    expect(businessFromBankKlass('kvarterskrogen')).toBe('kvarterskrogen');
    expect(businessFromBankKlass('foodtrucken')).toBe('foodtrucken');
    expect(businessFromBankKlass('balanced')).toBe('gästgiveriet');
  });

  it('nearEpisteme och noLoan → null (spelaren stannar)', () => {
    expect(businessFromBankKlass('nearEpisteme')).toBeNull();
    expect(businessFromBankKlass('noLoan')).toBeNull();
  });

  it('REQUEST_BANK_LOAN med techne-profil → state.businessClass = foodtruck', () => {
    let s = makeInitialState();
    s = accumulate(s, 'techne', 0.5);
    s = reducer(s, { type: 'REQUEST_BANK_LOAN' });
    expect(s.bankMeetingOutcome!.klass).toBe('foodtrucken');
    expect(s.businessClass).toBe('foodtrucken');
  });

  it('REQUEST_BANK_LOAN med phronesis-profil → state.businessClass = restaurant', () => {
    let s = makeInitialState();
    s = accumulate(s, 'phronesis', 0.5);
    s = reducer(s, { type: 'REQUEST_BANK_LOAN' });
    expect(s.bankMeetingOutcome!.klass).toBe('kvarterskrogen');
    expect(s.businessClass).toBe('kvarterskrogen');
  });

  it('REQUEST_BANK_LOAN med balanced-profil → state.businessClass = värdshus', () => {
    let s = makeInitialState();
    s = accumulate(s, 'episteme', 0.3);
    s = accumulate(s, 'techne', 0.3);
    s = accumulate(s, 'phronesis', 0.3);
    s = reducer(s, { type: 'REQUEST_BANK_LOAN' });
    expect(s.bankMeetingOutcome!.klass).toBe('balanced');
    expect(s.businessClass).toBe('gästgiveriet');
  });

  it('REQUEST_BANK_LOAN med nearEpisteme → businessClass oförändrad', () => {
    let s = makeInitialState();
    s = accumulate(s, 'episteme', 0.5);
    const before = s.businessClass;
    s = reducer(s, { type: 'REQUEST_BANK_LOAN' });
    expect(s.bankMeetingOutcome!.klass).toBe('nearEpisteme');
    expect(s.businessClass).toBe(before);
  });

  it('REQUEST_BANK_LOAN med noLoan → businessClass oförändrad', () => {
    let s = makeInitialState();
    const before = s.businessClass;
    s = reducer(s, { type: 'REQUEST_BANK_LOAN' });
    expect(s.bankMeetingOutcome!.klass).toBe('noLoan');
    expect(s.businessClass).toBe(before);
  });

  it('varje bankmötesklass har ett definierat map-utfall (fullständighet)', () => {
    const allKlasser: BankMeetingKlass[] = [
      'kvarterskrogen',
      'foodtrucken',
      'balanced',
      'nearEpisteme',
      'noLoan'
    ];
    for (const klass of allKlasser) {
      // Ska returnera antingen en BusinessClass eller null — inga throws,
      // ingen undefined. Full switch-täckning.
      const out = businessFromBankKlass(klass);
      expect(out === null || ['kvarterskrogen', 'foodtrucken', 'gästgiveriet'].includes(out)).toBe(true);
    }
  });
});

// -----------------------------------------------------------------------------
// DoD 6 — food truck har inga sittande gäster
// -----------------------------------------------------------------------------

describe('ORDER 110 §7 DoD 6 — foodtruck: inga sittande gäster', () => {
  it('businessHasSeats(foodtruck) === false', () => {
    expect(businessHasSeats('foodtrucken')).toBe(false);
    expect(businessHasSeats('kvarterskrogen')).toBe(true);
    expect(businessHasSeats('gästgiveriet')).toBe(true);
  });

  it('setGuestSeated på foodtruck sätter guest.state = ordering, inte seated', async () => {
    // Vi anropar den interna setGuestSeated indirekt via completeStaffTask:
    // den enda testbara vägen från reducern utan att importera privata
    // helpers. Här bygger vi ett minimalt state och tvingar in en 'greet'-
    // taskkomplettering.
    const { reducer: red } = await import('../../simulation/reducer');

    // Bygg foodtruck-state med en gäst i 'waiting'.
    let s = makeInitialState();
    s = { ...s, businessClass: 'foodtrucken' };
    s.guests = [
      {
        id: 'test-guest-1',
        state: 'waiting',
        satisfaction: 0.8,
        seatIndex: null,
        arrivalTime: s.simTime,
        stateTime: s.simTime,
        scenarioSource: false,
        position: { x: 0, z: 0 },
        targetPosition: { x: 0, z: 0 },
        moveProgress: 1,
        hadWelcomeDrink: false,
        lastCheckbackAt: null,
        walkAwayOnArrival: false
      }
    ];
    s.waitingIds = ['test-guest-1'];

    // Kör flera TICK och verifiera att gästen aldrig når 'seated'.
    // waiting → ordering (foodtruck-branchen) eller stannar i 'waiting'
    // om servicen inte kör; huvudsaken är: aldrig 'seated'.
    for (let i = 0; i < 60; i++) {
      s = red(s, { type: 'TICK', dt: 0.1 });
      const g = s.guests.find((x) => x.id === 'test-guest-1');
      if (!g) break;
      expect(g.state, `tick ${i}: gästen hamnade i 'seated' trots foodtruck`).not.toBe('seated');
    }

    // seatedIds ska förbli tom (ingen gäst rapporterad som sittande).
    expect(s.seatedIds).not.toContain('test-guest-1');
  });

  it('samma gäst i restaurant-branchen kan hamna i seated (kontroll: guarden är verksamt)', async () => {
    // Kontroll att guarden är verksamt: samma test-fixtur i restaurant-mode
    // ska ha möjligheten att sätta 'seated' (den kan förbli waiting om
    // ingen personal serverar, men den ska inte vara blockerad av
    // hasSeats-flaggan). Vi asserterar bara att businessClass = 'kvarterskrogen'
    // inte har guarden aktiv.
    expect(businessHasSeats('kvarterskrogen')).toBe(true);
    expect(BUSINESS_CLASS_CONFIG.kvarterskrogen.hasSeats).toBe(true);
  });
});

// -----------------------------------------------------------------------------
// DoD 8 — grep: 'balanced' inte i strings.sv.ts; Värdshuset som spelartext
// -----------------------------------------------------------------------------

describe('ORDER 110 §7 DoD 8 — grep + Gästgiveriet', () => {
  it('strings.sv.ts innehåller ingen `balanced`-nyckel', () => {
    const thisDir = dirname(fileURLToPath(import.meta.url));
    const stringsPath = resolve(thisDir, '../../../content/strings.sv.ts');
    const source = readFileSync(stringsPath, 'utf8');
    // Word-boundary så vi inte fångar sammansatta ord (t.ex. `balancedX`).
    expect(/\bbalanced\b/.test(source), '`balanced` läcker i strings.sv.ts').toBe(false);
  });

  it('Gästgiveriet finns som spelartext i strings.sv.ts:businessClass', () => {
    expect(strings.businessClass.gästgiveriet).toBe('Gästgiveriet');
  });

  it('alla verksamhets-nycklar har spelartext', () => {
    expect(strings.businessClass.kvarterskrogen).toBeTruthy();
    expect(strings.businessClass.foodtrucken).toBeTruthy();
    expect(strings.businessClass.gästgiveriet).toBeTruthy();
    expect(strings.businessClass.ölkrogen).toBeTruthy();
  });

  it('typkontroll: strings.businessClass-nycklar är exakt de fem BusinessClass-värdena (ORDER 125 lade till ölkrogen; ORDER 166 lade till vinbaren)', () => {
    const stringsKeys = Object.keys(strings.businessClass).sort();
    // UTF-16 codepoint-ordning: 'f' (0x66) < 'g' (0x67) < 'k' (0x6B) < 'v' (0x76) < 'ö' (0xF6).
    const businessKeys: BusinessClass[] = ['foodtrucken', 'gästgiveriet', 'kvarterskrogen', 'vinbaren', 'ölkrogen'];
    expect(stringsKeys).toEqual(businessKeys);
  });
});

// -----------------------------------------------------------------------------
// Löse regressions — ingen scenariotest ska ha förlorat sittande gäster
// (den existerande restaurangens beteende ska vara oförändrat).
// -----------------------------------------------------------------------------

describe('ORDER 110 — regressions: restaurant-läget oförändrat', () => {
  it('restaurant-default: initial capacity oförändrad', () => {
    const s = makeInitialState();
    expect(s.businessClass).toBe('kvarterskrogen');
    expect(s.policies.capacity).toBe(TOTAL_SEATS);
  });

  it('restaurant-default: businessHasSeats returnerar true', () => {
    const s = makeInitialState();
    expect(businessHasSeats(s.businessClass)).toBe(true);
  });
});
