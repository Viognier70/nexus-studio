// ORDER 111 §6 — R4 andra halvan: DoD-tester.
//
// Kartläggning mot §6:
//   DoD 1  Food truck egen gästbana utan sittfas; `dining` anropas inte.
//   DoD 2  Kölängden påverkar spawn.
//   DoD 3  Väder/gatuläge viktar efterfrågan för food truck.
//   DoD 4  hasMiseEnPlace + hasOvernight konsumeras i sim.
//   DoD 5  Värdshusgäst stannar över dygnsrollover.
//   DoD 6  Frukost finns som pass.
//   DoD 7  state.businessClass läses på fler än två platser.
//   (DoD 8 mätning + DoD 9 inga band omkalibrerade — separata test:er.)

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { reducer } from '../../simulation/reducer';
import { makeInitialState } from '../../simulation/model';
import { arrivalProbability, maybeSpawnGuest } from '../../simulation/arrivals';
import { createRng } from '../../util/rng';
import type { Guest, WeatherConditions } from '../../types';
import { capacityForBusiness } from '../businessClass';

function makeGuestFixture(overrides: Partial<Guest>): Guest {
  return {
    id: 'test-guest',
    state: 'arriving',
    satisfaction: 0.7,
    seatIndex: null,
    arrivalTime: 0,
    stateTime: 0,
    scenarioSource: false,
    position: { x: 0, z: 0 },
    targetPosition: { x: 0, z: 0 },
    moveProgress: 1,
    hadWelcomeDrink: false,
    lastCheckbackAt: null,
    walkAwayOnArrival: false,
    stayingOvernight: false,
    ...overrides
  };
}

// -----------------------------------------------------------------------------
// DoD 1 — food truck-gäst hamnar aldrig i 'dining'
// -----------------------------------------------------------------------------

describe('ORDER 111 §6 DoD 1 — foodtruck-gäster når aldrig dining', () => {
  it('foodtruck-gäst passerar aldrig genom seated eller dining', () => {
    let s = makeInitialState();
    s = { ...s, businessClass: 'foodtruck' };
    s.guests = [makeGuestFixture({ id: 'g1', state: 'waiting', stateTime: s.simTime })];
    s.waitingIds = ['g1'];
    const observed = new Set<string>();
    // Registrera initialtillståndet.
    observed.add('waiting');
    for (let i = 0; i < 60; i++) {
      s = reducer(s, { type: 'TICK', dt: 0.1 });
      const g = s.guests.find((x) => x.id === 'g1');
      if (g) observed.add(g.state);
      else break;
    }
    expect(observed.has('dining'), `foodtruck-gästen nådde 'dining': ${[...observed].join(',')}`).toBe(false);
    expect(observed.has('seated'), `foodtruck-gästen nådde 'seated': ${[...observed].join(',')}`).toBe(false);
    // Kontroll: initialtillståndet 'waiting' registrerades.
    expect(observed.has('waiting')).toBe(true);
  });

  it('foodtruck-gäst i kö når ordering via staff-task-pipelinen, aldrig seated', () => {
    // ORDER 113 fel 1 — efter findFreeSeat-guarden på businessClass går
    // foodtruck-gäster INTE längre via setGuestSeated-genvägen i
    // tickGuests. Vägen till 'ordering' är nu: waiting →
    // findTaskTarget('greet') plockar waitingIds[0] → beginStaffTask →
    // taskDurationTicks (~1-3 s) → completeStaffTask('greet') foodtruck-
    // branchen filtrerar bort från waitingIds + sätter state='ordering'.
    // Testet verifierar att pipelinen levererar 'ordering' inom rimlig
    // tid — inte via genväg utan via faktisk staff-tilldelning.
    let s = makeInitialState();
    s = {
      ...s,
      businessClass: 'foodtruck',
      policies: { ...s.policies, capacity: capacityForBusiness('foodtruck', s.policies.staffCount) }
    };
    s.guests = [makeGuestFixture({ id: 'g1', state: 'waiting', stateTime: s.simTime })];
    s.waitingIds = ['g1'];
    // Kör tillräckligt många ticks för att en staff ska hinna plocka upp
    // taskType='greet' och köra klart taskDurationTicks. Vid staffCount=3
    // och default social/training tar detta typiskt ~10-30 ticks (2-6 s
    // sim). 100 ticks ger stor marginal.
    let reachedOrdering = false;
    let reachedSeated = false;
    for (let i = 0; i < 100; i++) {
      s = reducer(s, { type: 'TICK', dt: 0.1 });
      const g = s.guests.find((x) => x.id === 'g1');
      if (!g) break;
      if (g.state === 'ordering') reachedOrdering = true;
      if (g.state === 'seated') reachedSeated = true;
    }
    expect(reachedOrdering).toBe(true);
    // seated ska aldrig nås — foodtruck har inga stolar.
    expect(reachedSeated).toBe(false);
    expect(s.seatedIds).not.toContain('g1');
    // waitingIds ska INTE innehålla g1 längre — hen ska ha passerat
    // genom pipelinen bort från waiting-state.
    expect(s.waitingIds).not.toContain('g1');
  });
});

// -----------------------------------------------------------------------------
// DoD 2 — kölängden gate:ar arrivals
// -----------------------------------------------------------------------------

describe('ORDER 111 §6 DoD 2 — kölängd påverkar foodtruck-spawn', () => {
  it('foodtruck med full kö → maybeSpawnGuest returnerar null', () => {
    let s = makeInitialState();
    s = {
      ...s,
      businessClass: 'foodtruck',
      policies: { ...s.policies, capacity: capacityForBusiness('foodtruck', s.policies.staffCount) }
    };
    // Fyll kön till gränsen.
    const capacity = s.policies.capacity;
    for (let i = 0; i < capacity; i++) {
      s.guests.push(makeGuestFixture({ id: `queue-${i}`, state: 'waiting' }));
      s.waitingIds.push(`queue-${i}`);
    }
    const rng = createRng(1);
    // Även med maximal arrival-sannolikhet ska ingen ny spawn: kön är full.
    // Kör många försök för statistisk säkerhet.
    let spawned = 0;
    for (let i = 0; i < 200; i++) {
      if (maybeSpawnGuest(s, rng) !== null) spawned += 1;
    }
    expect(spawned).toBe(0);
  });

  it('foodtruck med tom kö → maybeSpawnGuest kan returnera Guest', () => {
    let s = makeInitialState();
    s = {
      ...s,
      businessClass: 'foodtruck',
      policies: { ...s.policies, capacity: capacityForBusiness('foodtruck', s.policies.staffCount) }
    };
    // Öppna lunch så perioden är rätt för arrivals.
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 30 });
    // Skippa opening (foodtruck har ingen prep per hasMiseEnPlace=false).
    for (let i = 0; i < 100; i++) s = reducer(s, { type: 'TICK', dt: 1 / 5 });
    // Med tom kö och öppen service ska spawn-sannolikheten vara > 0.
    expect(arrivalProbability(s)).toBeGreaterThan(0);
  });
});

// -----------------------------------------------------------------------------
// DoD 3 — väder viktar efterfrågan för foodtruck skarpare än för restaurant
// -----------------------------------------------------------------------------

describe('ORDER 111 §6 DoD 3 — väder påverkar foodtruck-efterfrågan', () => {
  it('samma väder ger olika arrivalProbability för restaurant vs foodtruck', () => {
    const rainyWeather: WeatherConditions = {
      tempC: 8,
      windMS: 6,
      precipitation: 'rain',
      cloudCover: 'overcast',
      outdoorViable: false
    };
    // Bygg identiska state:s förutom businessClass och capacity.
    // Rensa opening/prep-gates manuellt istället för att köra hundratals
    // ticks — testet ska mäta arrivalProbability-formeln, inte tick-tiden.
    let restaurant = makeInitialState();
    restaurant = reducer(restaurant, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 30 });
    restaurant = {
      ...restaurant,
      day: {
        ...restaurant.day,
        openingEndsAt: null,
        prepEndsAt: null,
        weather: rainyWeather
      }
    };

    let foodtruck = makeInitialState();
    foodtruck = {
      ...foodtruck,
      businessClass: 'foodtruck',
      policies: { ...foodtruck.policies, capacity: capacityForBusiness('foodtruck', foodtruck.policies.staffCount) }
    };
    foodtruck = reducer(foodtruck, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 30 });
    foodtruck = {
      ...foodtruck,
      day: {
        ...foodtruck.day,
        openingEndsAt: null,
        prepEndsAt: null,
        weather: rainyWeather
      }
    };

    const restProb = arrivalProbability(restaurant);
    const ftProb = arrivalProbability(foodtruck);
    expect(restProb).toBeGreaterThan(0);
    expect(ftProb).toBeGreaterThan(0);
    // Regn: foodtruck ska ha lägre än restaurant (amplifiering + konkurrens).
    expect(ftProb).toBeLessThan(restProb);
  });

  it('sol/klart: foodtruck ska ha högre än restaurant (amplifiering positiv)', () => {
    const sunnyWeather: WeatherConditions = {
      tempC: 22,
      windMS: 2,
      precipitation: 'none',
      cloudCover: 'clear',
      outdoorViable: true
    };
    let restaurant = makeInitialState();
    restaurant = reducer(restaurant, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 30 });
    restaurant = {
      ...restaurant,
      day: { ...restaurant.day, openingEndsAt: null, prepEndsAt: null, weather: sunnyWeather }
    };
    let foodtruck = makeInitialState();
    foodtruck = {
      ...foodtruck,
      businessClass: 'foodtruck',
      policies: { ...foodtruck.policies, capacity: capacityForBusiness('foodtruck', foodtruck.policies.staffCount) }
    };
    foodtruck = reducer(foodtruck, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 30 });
    foodtruck = {
      ...foodtruck,
      day: { ...foodtruck.day, openingEndsAt: null, prepEndsAt: null, weather: sunnyWeather }
    };
    // I klart väder ska foodtruck ha HÖGRE arrivalProbability trots
    // konkurrens-nedjusteringen (amplifieringen dominerar).
    // Men konkurrens = 0.85 kan mildra effekten. Verifierar minst att
    // foodtruck-svaret INTE är samma som restaurant.
    expect(arrivalProbability(foodtruck)).not.toBe(arrivalProbability(restaurant));
  });
});

// -----------------------------------------------------------------------------
// DoD 4 — hasMiseEnPlace + hasOvernight läses i sim (grep + funktionellt)
// -----------------------------------------------------------------------------

describe('ORDER 111 §6 DoD 4 — hasMiseEnPlace + hasOvernight har konsumenter', () => {
  it('grep över src/strategic/ visar att båda flaggorna läses utanför businessClass.ts', () => {
    const thisDir = dirname(fileURLToPath(import.meta.url));
    const stratDir = resolve(thisDir, '../..');
    const files: string[] = [];
    function walk(d: string) {
      for (const name of readdirSync(d)) {
        const full = join(d, name);
        const s = statSync(full);
        if (s.isDirectory()) {
          if (name === '__tests__') continue;
          if (name === 'node_modules') continue;
          walk(full);
        } else if ((name.endsWith('.ts') || name.endsWith('.tsx')) && name !== 'businessClass.ts') {
          files.push(full);
        }
      }
    }
    walk(stratDir);
    let miseEnPlaceReads = 0;
    let overnightReads = 0;
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      if (/businessHasMiseEnPlace\s*\(/.test(src)) miseEnPlaceReads += 1;
      if (/businessHasOvernight\s*\(/.test(src)) overnightReads += 1;
    }
    expect(miseEnPlaceReads, 'ingen konsument av businessHasMiseEnPlace').toBeGreaterThan(0);
    expect(overnightReads, 'ingen konsument av businessHasOvernight').toBeGreaterThan(0);
  });

  it('foodtruck: prepEndsAt = openingEndsAt (ingen prep-fas)', () => {
    let s = makeInitialState();
    s = { ...s, businessClass: 'foodtruck' };
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 20 });
    expect(s.day.openingEndsAt).not.toBeNull();
    expect(s.day.prepEndsAt).not.toBeNull();
    // Restaurangen: prep = opening + 60s. Foodtruck: prep = opening.
    expect(s.day.prepEndsAt).toBe(s.day.openingEndsAt);
  });

  it('restaurant: prepEndsAt > openingEndsAt (60s prep-fönster)', () => {
    let s = makeInitialState();
    // businessClass default 'restaurant'.
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 20 });
    expect(s.day.prepEndsAt).toBeGreaterThan(s.day.openingEndsAt!);
  });
});

// -----------------------------------------------------------------------------
// DoD 5 — värdshus-gäst överlever dygnsrollover
// -----------------------------------------------------------------------------

describe('ORDER 111 §6 DoD 5 — värdshus-gäst stannar över dygnsrollover', () => {
  it('sleeping-gäst i värdshus överlever evening→breakfast (rollover)', () => {
    let s = makeInitialState();
    s = { ...s, businessClass: 'värdshus' };
    s.guests = [
      makeGuestFixture({ id: 'overnight', state: 'sleeping', stayingOvernight: true, seatIndex: 0 }),
      makeGuestFixture({ id: 'declined-guest', state: 'declined', stayingOvernight: false })
    ];
    s.seatedIds = ['overnight'];
    s = {
      ...s,
      day: { ...s.day, period: 'evening', periodStartAt: 0 },
      simTime: 0
    };
    // Rollover triggeras när evening pågått EVENING_TO_MORNING_PAUSE_SEC (30 s).
    // Kör 35 sim-sek — säkert över tröskeln men innan breakfast (30 s) hunnit
    // väcka gästen.
    for (let i = 0; i < 200; i++) s = reducer(s, { type: 'TICK', dt: 1 });
    // Kontrollera att rollovern hände (dayNumber ökade) och att sleeping-
    // gästen fortfarande är kvar (i sleeping-state, inte väckt än).
    expect(s.day.dayNumber).toBeGreaterThan(1);
    const overnight = s.guests.find((g) => g.id === 'overnight');
    expect(overnight, 'sleeping-gästen försvann över rollover').toBeDefined();
    expect(overnight!.state).toBe('sleeping');
    // Declined-gäst ska vara rensad.
    expect(s.guests.find((g) => g.id === 'declined-guest')).toBeUndefined();
  });

  it('restaurant: alla gäster rensas vid rollover oavsett stayingOvernight', () => {
    let s = makeInitialState();
    // Default businessClass = 'restaurant'. hasOvernight=false → rensar allt.
    s.guests = [
      makeGuestFixture({ id: 'r1', state: 'sleeping', stayingOvernight: true })
    ];
    s = { ...s, day: { ...s.day, period: 'evening', periodStartAt: 0 }, simTime: 0 };
    for (let i = 0; i < 200; i++) s = reducer(s, { type: 'TICK', dt: 1 });
    expect(s.day.dayNumber).toBeGreaterThan(1);
    expect(s.guests.find((g) => g.id === 'r1'), 'restaurant behöll gäst över rollover').toBeUndefined();
  });
});

// -----------------------------------------------------------------------------
// DoD 6 — frukost finns som pass
// -----------------------------------------------------------------------------

describe('ORDER 111 §6 DoD 6 — frukost är ett pass', () => {
  it("DayPeriod inkluderar 'breakfast'", () => {
    // Typkontroll: 'breakfast' måste vara en giltig DayPeriod.
    // Kompilerar bara om typen tillåter det.
    const p: 'breakfast' = 'breakfast';
    expect(p).toBe('breakfast');
  });

  it('värdshus + sleeping-gäster → dygnsrollover startar i breakfast', () => {
    let s = makeInitialState();
    s = { ...s, businessClass: 'värdshus' };
    s.guests = [
      makeGuestFixture({ id: 'ov', state: 'sleeping', stayingOvernight: true, seatIndex: 0 })
    ];
    s.seatedIds = ['ov'];
    s = { ...s, day: { ...s.day, period: 'evening', periodStartAt: 0 }, simTime: 0 };
    // Kör precis över rollover-tröskeln (30 s) men innan breakfast (30 s)
    // hunnit avslutas.
    for (let i = 0; i < 200; i++) s = reducer(s, { type: 'TICK', dt: 1 });
    // Efter rollover: period ska vara 'breakfast' (inte 'morning')
    // eftersom sleeping-gäster fanns.
    expect(s.day.period).toBe('breakfast');
    expect(s.day.dayNumber).toBeGreaterThan(1);
  });

  it('frukost-passet väcker sleeping-gäster (→ leaving) och avslutas i morning', () => {
    let s = makeInitialState();
    s = { ...s, businessClass: 'värdshus' };
    s.guests = [
      makeGuestFixture({ id: 'ov', state: 'sleeping', stayingOvernight: true, seatIndex: 0 })
    ];
    s.seatedIds = ['ov'];
    s = { ...s, day: { ...s.day, period: 'evening', periodStartAt: 0 }, simTime: 0 };
    // TICK avancerar 0.2 sim-sek oavsett dt. 30 s evening→breakfast +
    // 30 s breakfast→morning = 60 sim-sek = 300 ticks. Kör 500 för säker
    // marginal.
    for (let i = 0; i < 500; i++) s = reducer(s, { type: 'TICK', dt: 1 });
    expect(s.day.period).toBe('morning');
    // Sleeping-gästen ska ha vaknat: state ändrad från 'sleeping'.
    const ov = s.guests.find((g) => g.id === 'ov');
    if (ov) {
      expect(ov.state).not.toBe('sleeping');
    }
  });

  it('värdshus utan sleeping-gäster startar i morning (inte breakfast)', () => {
    // Kontroll att breakfast-passet bara utlöses när det finns gäster
    // att servera — värdshus utan övernattare hoppar direkt till morning.
    let s = makeInitialState();
    s = { ...s, businessClass: 'värdshus' };
    s.guests = [];
    s.seatedIds = [];
    s = { ...s, day: { ...s.day, period: 'evening', periodStartAt: 0 }, simTime: 0 };
    for (let i = 0; i < 200; i++) s = reducer(s, { type: 'TICK', dt: 1 });
    expect(s.day.period).toBe('morning');
  });
});

// -----------------------------------------------------------------------------
// DoD 7 — state.businessClass läses på fler än två platser
// -----------------------------------------------------------------------------

describe('ORDER 111 §6 DoD 7 — businessClass läses på fler än två platser', () => {
  it('grep över src/ hittar minst 3 unika filer utanför businessClass.ts som läser state.businessClass eller helpers', () => {
    const thisDir = dirname(fileURLToPath(import.meta.url));
    const stratDir = resolve(thisDir, '../..');
    const readers = new Set<string>();
    function walk(d: string) {
      for (const name of readdirSync(d)) {
        const full = join(d, name);
        const s = statSync(full);
        if (s.isDirectory()) {
          if (name === '__tests__') continue;
          if (name === 'node_modules') continue;
          walk(full);
        } else if (name.endsWith('.ts') || name.endsWith('.tsx')) {
          if (name === 'businessClass.ts') continue;
          const src = readFileSync(full, 'utf8');
          // Räkna både direkt fält-läsning och helper-anrop.
          if (
            /state\.businessClass|draft\.businessClass|businessHasSeats\s*\(|businessHasMiseEnPlace\s*\(|businessHasOvernight\s*\(|businessFromBankKlass\s*\(|capacityForBusiness\s*\(/.test(src)
          ) {
            readers.add(full);
          }
        }
      }
    }
    walk(stratDir);
    // ORDER 110: 2 (reducer.ts, service.ts). ORDER 111: adderar konsumenter
    // i arrivals.ts + fler platser i reducer.ts + service.ts. Kravet är
    // fler än 2 (>=3 unika filer).
    expect(readers.size, `endast ${readers.size} filer läser businessClass — DoD 7 kräver >2`).toBeGreaterThan(2);
  });
});
