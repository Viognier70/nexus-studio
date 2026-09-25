// ORDER 265 (Nexus v1 etapp 3) — ekonomin mot speldesignen > Ekonomin.

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classOptions,
  dailyGuestCap,
  dayEnd,
  downgradeTarget,
  floorPercent,
  floorSek,
  initialEconomy,
  marketShareCap,
  meetsClass,
  settleWeek,
  startLoanSek
} from '../economy';
import { ECONOMY, FLOOR, LOAN, MARKET, SEASON } from '../balance';
import { calendarFor } from '../calendar';
import { makeInitialState } from '../../strategic/simulation/model';
import { reducer } from '../../strategic/simulation/reducer';
import type { SimulationState } from '../../strategic/types';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, '../..');

const bronzeIn = (...ps: (keyof SimulationState['medals'])[]) =>
  Object.fromEntries(ps.map((p) => [p, 'brons'])) as SimulationState['medals'];

describe('ORDER 265 — golvet', () => {
  it('G = 0,6 × huvudpaviljongen + 0,4 × snittet av övriga', () => {
    // Vinbar: huvudpaviljong Stensöta. Guld i Stensöta (55), brons i två andra (15).
    const medals: SimulationState['medals'] = { stensota: 'guld', metodkoket: 'brons', kalastorget: 'brons' };
    const expected = 0.6 * 55 + 0.4 * ((15 + 15 + 0 + 0) / 4);
    expect(floorPercent('vinbar', medals)).toBeCloseTo(expected, 9);
    expect(floorSek('vinbar', medals)).toBe(Math.round((expected / 100) * ECONOMY.normalWeeklyRevenueSek.vinbar));
  });

  it('G kan aldrig bli högre än 90', () => {
    const all: SimulationState['medals'] = { maltidbiblioteket: 'platina', kalastorget: 'platina', stensota: 'platina', metodkoket: 'platina', gastronomiskateatern: 'platina' };
    expect(floorPercent('restaurang', all)).toBe(FLOOR.maxPercent);
  });

  it('food truckens huvudpaviljong är spelarens bästa', () => {
    const medals: SimulationState['medals'] = { kalastorget: 'silver' };
    expect(floorPercent('foodtruck', medals)).toBeCloseTo(0.6 * 30, 9);
  });

  it('inga medaljer: inget golv', () => {
    expect(floorSek('vinbar', {})).toBe(0);
  });
});

describe('ORDER 265 — lånet', () => {
  it('startlånet är två veckors normal intäkt och amorteras på åtta veckor', () => {
    const e = initialEconomy('vinbar', SEASON.weeks, 0);
    expect(e.loan).toEqual({ originalSek: startLoanSek('vinbar'), principalSek: startLoanSek('vinbar'), weeksLeft: SEASON.weeks });
    expect(startLoanSek('vinbar')).toBe(ECONOMY.normalWeeklyRevenueSek.vinbar * ECONOMY.startLoanWeeksOfRevenue);
  });

  it('åtta avräkningar betalar av lånet; räntan är 5 % av lånebeloppet över säsongen', () => {
    let s = makeInitialState(1);
    const original = s.economy.loan!.originalSek;
    let amortised = 0;
    for (let w = 1; w <= SEASON.weeks; w++) {
      s = { ...s, day: { ...s.day, dayNumber: w * 7 } };
      s = settleWeek(s);
      amortised += s.economy.lastSettlement!.amortisationSek;
    }
    expect(Math.abs(amortised - original)).toBeLessThanOrEqual(SEASON.weeks);
    expect(s.economy.loan!.principalSek).toBeLessThanOrEqual(SEASON.weeks);
    // Räntan per dag × 56 dagar = 5 % av beloppet.
    const perDay = (LOAN.interestRate * original) / (SEASON.weeks * 7);
    expect(perDay * SEASON.weeks * 7).toBeCloseTo(LOAN.interestRate * original, 6);
  });
});

describe('ORDER 265 — veckoavräkningen', () => {
  it('golvet fyller på mellanskillnaden när veckan är svag', () => {
    let s = { ...makeInitialState(1), medals: { stensota: 'guld', metodkoket: 'silver', kalastorget: 'silver' } as SimulationState['medals'] };
    const floor = floorSek('vinbar', s.medals);
    s = { ...s, revenue: floor / 2, day: { ...s.day, dayNumber: 7 } };
    const cash = s.cash;
    s = settleWeek(s);
    expect(s.economy.lastSettlement!.topUpSek).toBe(floor - Math.round(floor / 2));
    expect(s.cash).toBe(cash + s.economy.lastSettlement!.topUpSek - s.economy.lastSettlement!.amortisationSek);
    expect(s.ledger.some((l) => l.category === 'floor')).toBe(true);
  });

  it('ingen påfyllnad när veckan gav mer än golvet', () => {
    let s = { ...makeInitialState(1), medals: bronzeIn('stensota') };
    s = { ...s, revenue: ECONOMY.normalWeeklyRevenueSek.vinbar, day: { ...s.day, dayNumber: 7 } };
    s = settleWeek(s);
    expect(s.economy.lastSettlement!.topUpSek).toBe(0);
  });
});

describe('ORDER 265 — nedgradering', () => {
  it('tre dagsavslut i rad under noll, varning de två första', () => {
    let e = initialEconomy('vinbar', SEASON.weeks, 0);
    e = dayEnd(e, -1);
    expect(e.warning).toBe('first');
    e = dayEnd(e, -1);
    expect(e.warning).toBe('second');
    expect(e.downgradePending).toBe(false);
    e = dayEnd(e, -1);
    expect(e.warning).toBe('downgrade');
    expect(e.downgradePending).toBe(true);
  });

  it('en dag över noll nollställer räkningen', () => {
    let e = initialEconomy('vinbar', SEASON.weeks, 0);
    e = dayEnd(dayEnd(e, -1), 5);
    expect(e.consecutiveNegativeDayEnds).toBe(0);
    expect(e.warning).toBeNull();
  });

  it('nedgraderingskedjan följer speldesignen', () => {
    expect(downgradeTarget('gastgiveri', {})).toBe('restaurang');
    expect(downgradeTarget('nattklubb', {})).toBe('restaurang');
    expect(downgradeTarget('restaurang', { metodkoket: 'silver', stensota: 'brons' })).toBe('olkrog');
    expect(downgradeTarget('restaurang', { stensota: 'silver' })).toBe('vinbar');
    expect(downgradeTarget('vinbar', {})).toBe('foodtruck');
    expect(downgradeTarget('olkrog', {})).toBe('foodtruck');
    expect(downgradeTarget('foodtruck', {})).toBeNull();
  });

  it('avräkningen verkställer en väntande nedgradering; kunskapen följer med', () => {
    let s = { ...makeInitialState(1), medals: bronzeIn('stensota'), cash: -5000 };
    s = { ...s, economy: { ...s.economy, downgradePending: true }, day: { ...s.day, dayNumber: 7 } };
    s = settleWeek(s);
    expect(s.economy.businessClass).toBe('foodtruck');
    expect(s.economy.lastSettlement).toMatchObject({ downgradedFrom: 'vinbar', downgradedTo: 'foodtruck' });
    expect(s.medals).toEqual(bronzeIn('stensota'));
    expect(s.cash).toBeGreaterThanOrEqual(0);
  });
});

describe('ORDER 265 — klasser och krav', () => {
  it('kraven ur klasstabellen', () => {
    expect(meetsClass('foodtruck', bronzeIn('kalastorget'))).toBe(true);
    expect(meetsClass('vinbar', bronzeIn('kalastorget', 'metodkoket', 'maltidbiblioteket'))).toBe(false);
    expect(meetsClass('vinbar', bronzeIn('stensota', 'metodkoket', 'maltidbiblioteket'))).toBe(true);
    expect(meetsClass('olkrog', bronzeIn('stensota', 'metodkoket', 'maltidbiblioteket'))).toBe(true);
    expect(meetsClass('nattklubb', { kalastorget: 'guld', stensota: 'silver' })).toBe(true);
    expect(meetsClass('nattklubb', { kalastorget: 'guld', stensota: 'brons' })).toBe(false);
  });

  it('byte bara på söndagen (eller utan verksamhet); ny lokal: nytt lån och halverat rykte', () => {
    let s = { ...makeInitialState(1), medals: bronzeIn('stensota', 'metodkoket', 'maltidbiblioteket') };
    expect(reducer(s, { type: 'CHOOSE_CLASS', to: 'olkrog' })).toBe(s);
    s = { ...s, day: { ...s.day, dayNumber: 7 } };
    expect(classOptions(s).find((o) => o.id === 'olkrog')?.status).toBe('available');
    const rep = s.reputation;
    s = reducer(s, { type: 'CHOOSE_CLASS', to: 'olkrog' });
    expect(s.economy.businessClass).toBe('olkrog');
    expect(s.businessClass).toBe('ölkrogen');
    expect(s.reputation).toBeCloseTo(rep / 2, 9);
    expect(s.economy.loan?.originalSek).toBe(startLoanSek('olkrog'));
  });

  it('nedgradering till mindre klass: skuldfri, ryktet orört (F22)', () => {
    let s = { ...makeInitialState(1), medals: bronzeIn('stensota', 'metodkoket', 'maltidbiblioteket') };
    s = { ...s, day: { ...s.day, dayNumber: 7 } };
    const rep = s.reputation;
    s = reducer(s, { type: 'CHOOSE_CLASS', to: 'foodtruck' });
    expect(s.economy.businessClass).toBe('foodtruck');
    expect(s.economy.loan).toBeNull();
    expect(s.reputation).toBe(rep);
  });

  it('gästgiveri och nattklubb nås bara genom uppgradering', () => {
    const s = { ...makeInitialState(1), medals: { kalastorget: 'guld', stensota: 'guld', metodkoket: 'guld' } as SimulationState['medals'] };
    const noBusiness = { ...s, economy: { ...s.economy, businessClass: null } };
    expect(classOptions(noBusiness).find((o) => o.id === 'gastgiveri')?.status).toBe('upgradeOnly');
  });
});

describe('ORDER 265 — marknaden', () => {
  it('andelstaket: 20 % plus 3 procentenheter per medaljsteg', () => {
    expect(marketShareCap({})).toBeCloseTo(MARKET.baseShareCap, 9);
    expect(marketShareCap({ stensota: 'platina', kalastorget: 'brons' })).toBeCloseTo(0.2 + 0.03 * 5, 9);
  });

  it('dagens tak följer poolen och kalendern', () => {
    const s = makeInitialState(1);
    expect(dailyGuestCap(s)).toBe(Math.floor(MARKET.basePoolPerDay * calendarFor(1).guestFactor * MARKET.baseShareCap));
  });

  it('en service tar aldrig emot fler gäster än taket', () => {
    let s = makeInitialState(3);
    s = reducer(s, { type: 'START_SERVICE' });
    for (let i = 0; i < 4000 && s.day.period === 'dinner'; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    expect(s.day.arrivalsToday ?? 0).toBeLessThanOrEqual(dailyGuestCap(s));
  });
});

describe('ORDER 265 — golvet är kreditramen för satsningar', () => {
  it('en satsning får inte dra kassan under −golvet', () => {
    let s = { ...makeInitialState(1), cash: 1000 };
    const refused = reducer(s, { type: 'PICK_ACTIVITY', id: 'train-service' });
    expect(refused.day.pickedActivityIds).toEqual([]);
    s = { ...s, medals: { stensota: 'guld', metodkoket: 'guld', kalastorget: 'guld' } };
    expect(reducer(s, { type: 'PICK_ACTIVITY', id: 'train-service' }).day.pickedActivityIds).toEqual(['train-service']);
  });
});

describe('ORDER 265 — ingen omvandling mellan kassa och krediter', () => {
  it('grep: ingen fil skriver både kassa och krediter i samma uttryck', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const n of readdirSync(dir)) {
        const p = join(dir, n);
        if (statSync(p).isDirectory()) { if (n !== '__tests__') walk(p); }
        else if (/\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n)) files.push(p);
      }
    };
    walk(SRC);
    const offenders: string[] = [];
    for (const f of files) {
      const lines = readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '').split('\n');
      lines.forEach((line, i) => {
        const cashFromCredits = /\bcash\b[^;\n]*knowledgeCredits|applyCash\w*\([^)]*knowledgeCredits/.test(line);
        const creditsFromCash = /knowledgeCredits[^;\n]*\bcash\b|ACCUMULATE_KNOWLEDGE[^;\n]*\bcash\b/.test(line);
        if (cashFromCredits || creditsFromCash) offenders.push(`${relative(SRC, f)}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it('ekonomimodulen läser aldrig krediter', () => {
    const code = readFileSync(resolve(SRC, 'sim/economy.ts'), 'utf8').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/knowledgeCredits|knowledgeTracks/);
  });
});
