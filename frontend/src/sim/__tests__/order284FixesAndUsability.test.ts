// ORDER 284 — felen och användbarheten (Vision Owner 2026-09-29, tredje
// provspelet). Här prövas det som går att pröva i simuleringen:
// - "Maten tog slut 20.41 men 26 portioner blev svinn": en rätt kan bara
//   säljas ur sina egna portioner, och svinnet räknas i portioner.
// - Back your knowledge: klockan stannar när svaret är valt, och svaret
//   går inte att byta.
// - Kvällsberättelsen säger inte "nothing to learn" när raketer gick fel.
// Knapparna och klockans plats prövas i webbläsaren
// (scripts/order284-layout.mjs), gästen på golvet i wineBarRoom.test.ts.
//
// Med WRITE_REPORTS=1 skrivs sparfilen som layoutskriptet laddar:
// reports/order284/save-mandag-vinbaren.json.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { firstDayOfWeek } from '../calendar';
import { DOUBLE_OR_NOTHING } from '../balance';
import { incidentById } from '../incidentBank';
import { rankedStepOption } from '../incidents';
import { answerAndWait } from './verdict';
import { PLAYERS } from '../../strategic/testHarness/randomness';
import { computePlatesRemaining, takeFromStock, wasteAtDayEnd } from '../../strategic/simulation/stockPackages';
import { pickParagraph } from '../../content/eveningAccount.en';
import type { SimulationState } from '../../strategic/types';

const TICK = { type: 'TICK', dt: 0.2 } as const;

function monday(seed = 3): SimulationState {
  const s = makeNewGameState(seed);
  return { ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
}

describe('ORDER 284 — portionerna per rätt', () => {
  it('soppan kan inte ta fläskets rotfrukter och örter', () => {
    // Soppan (rotfrukter ×2, mejeri, örter) delar mejeriet med efterrätten
    // och rotfrukterna och örterna med fläsket.
    let s = reducer(monday(), { type: 'BUY_ITEMS', items: { 'root-soup': 5, 'pork-plate': 5, 'dairy-dessert': 5, 'house-wine-glass': 5 } });
    expect(s.dishPortions).toMatchObject({ 'root-soup': 5, 'pork-plate': 5, 'dairy-dessert': 5 });
    s = reducer(s, { type: 'START_SERVICE' });
    const d: SimulationState = { ...s, day: { ...s.day } };
    for (let i = 0; i < 5; i++) takeFromStock(d, 'root-soup', d.simTime);
    // Soppan är slut, men fläsket har kvar alla sina portioner.
    expect(d.day.platesRemaining['root-soup']).toBe(0);
    expect(d.day.platesRemaining['pork-plate']).toBe(5);
    // Utan portionsboken hade soppan fått fortsätta på fläskets råvaror.
    const without = computePlatesRemaining(d.menu, d.stock);
    expect(without['root-soup']).toBeGreaterThan(0);
  });

  it('svinnet räknas i portioner, samma enhet som lagret under servicen', () => {
    let s = reducer(monday(), { type: 'BUY_ITEMS', items: { 'chicken-plate': 5, 'pork-plate': 5, 'root-soup': 5, 'house-wine-glass': 5 } });
    s = reducer(s, { type: 'START_SERVICE' });
    const d: SimulationState = { ...s, day: { ...s.day } };
    takeFromStock(d, 'chicken-plate', d.simTime);
    takeFromStock(d, 'root-soup', d.simTime);
    const left = Object.entries(d.day.platesRemaining).filter(([id]) => id !== 'house-wine-glass' && !id.includes('wine')).reduce((a, [, n]) => a + n, 0);
    const { waste, dishPortions } = wasteAtDayEnd(d);
    // Osålda portioner = det lagret visade kvar: det som sparas plus svinnet.
    // ORDER 285 — plus portionerna som lagts undan till morgonens fråga.
    expect(waste!.units + waste!.kept + (waste!.aside?.portions ?? 0)).toBe(left);
    expect(waste!.fractions.find((f) => f.key === 'unsold')!.count).toBe(waste!.units);
    // De sparade portionerna har kvar sina råvaror till nästa dag.
    const kept = Object.values(dishPortions ?? {}).reduce((a, n) => a + n, 0);
    expect(kept).toBe(waste!.kept);
  });

  it('när alla rätter är slut säger strömmen att köket inte har mat kvar', () => {
    let s = reducer(monday(), { type: 'BUY_ITEMS', items: { 'root-soup': 5, 'house-wine-glass': 5 } });
    s = reducer(s, { type: 'START_SERVICE' });
    const d: SimulationState = { ...s, day: { ...s.day } };
    for (let i = 0; i < 5; i++) takeFromStock(d, 'root-soup', d.simTime);
    expect(d.eventStream.some((e) => /kitchen is out of food/.test(e.text))).toBe(true);
  });
});

// ORDER 314 — Stå för ditt svar är borttagen; provet görs på en situation ur rummet.
describe('ORDER 284 — klockan i situationen', () => {
  it('stegets klocka står medan spelaren väljer i kvitt eller dubbelt (ORDER 305b)', () => {
    let s = monday(5);
    s = { ...s, day: { ...s.day, dayNumber: s.day.dayNumber + 4 } };
    s = reducer(s, { type: 'BUY_PACKAGE', packageId: 'vinbar-base' });
    s = reducer(s, { type: 'START_SERVICE' });
    for (let i = 0; i < 20000 && !(s.incidents.active && (s.incidents.active.introLeft ?? 0) <= 0) && s.day.period === 'dinner'; i++) s = reducer(s, TICK);
    const a = s.incidents.active!;
    expect(a.step).toBe(0);
    // ORDER 305b — svaret låses inte längre (säkerheten är borttagen). I
    // stället står stegets klocka medan spelaren väljer i kvitt eller dubbelt.
    const step = incidentById('vinbar', a.id)!.steps[a.step];
    // ORDER 310b — svaret avgörs efter låset och väntan.
    s = answerAndWait(s, rankedStepOption(step, 'best', a.struck, a.situation));
    expect(s.incidents.active!.choosing).toBe(true);
    for (let i = 0; i < 300 && (s.incidents.active?.revealLeft ?? 0) > 0; i++) s = reducer(s, TICK);
    const waiting = s.incidents.active!.secondsLeft;
    for (let i = 0; i < 5; i++) s = reducer(s, TICK);
    expect(s.incidents.active!.secondsLeft).toBe(waiting);
    expect(s.incidents.active!.choiceLeft!).toBeLessThan(DOUBLE_OR_NOTHING.choiceSeconds);
  });
});

describe('ORDER 284 — kvällsberättelsen mot felen', () => {
  it('"nothing to learn" bara när ingen raket gick fel', () => {
    const base = { branch: 'mediocre' as const, collapseAxis: null, wagerCapital: null, drewCapital: null, lastChoice: null };
    expect(pickParagraph({ ...base, failedCount: 0 })).toMatch(/nothing to learn/);
    expect(pickParagraph({ ...base, failedCount: 5 })).not.toMatch(/nothing to learn/);
  });
});

describe('ORDER 284 — sparfilen till layoutskriptet', () => {
  it('måndag morgon vecka 2 i vinbaren', async () => {
    const s = monday(3);
    expect(s.economy.businessClass).toBe('vinbar');
    expect(s.day.period).toBe('morning');
    if (process.env.WRITE_REPORTS === '1') {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const { makeSaveFile } = await import('../save');
      const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../reports/order284');
      mkdirSync(out, { recursive: true });
      writeFileSync(resolve(out, 'save-mandag-vinbaren.json'), JSON.stringify(makeSaveFile(s, 'Vinbaren vid torget', 'auto', new Date('2026-09-29T12:00:00Z'))) + '\n');
    }
  });
});
