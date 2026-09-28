// ORDER 279 — frågorna och insatsen (Vision Owner 2026-09-28, andra
// provspelet): raketer där gäster frågar om kvällens rätter och drycker
// utifrån menyn och dryckeslistan; rätt svar ger högre dricks; action-
// knappen tillbaka som live betting med krediter, vinst och förlust; stora
// förluster, och en dålig vecka kan leda till nedgradering.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { firstDayOfWeek } from '../calendar';
import { BET, MENU_ROCKETS } from '../balance';
import { fitsMenu, incidentBankFor, incidentById } from '../incidentBank';
import { canStartBet, rankedStepOption } from '../incidents';
import { runWeeks } from '../../strategic/testHarness/weekHarness';
import { weakMorning } from '../../strategic/testHarness/scenarios';
import { PLAYERS } from '../../strategic/testHarness/randomness';
import type { SimulationState } from '../../strategic/types';

const TICK = { type: 'TICK', dt: 0.2 } as const;
const CREDITS = 40;

function withCredits(s: SimulationState, n = CREDITS): SimulationState {
  return {
    ...s,
    knowledgeCredits: { episteme: n, techne: n, phronesis: n },
    knowledgeTracks: {
      episteme: { untagged: n, sommellerie: 0, kok: 0 },
      techne: { untagged: n, sommellerie: 0, kok: 0 },
      phronesis: { untagged: n, sommellerie: 0, kok: 0 }
    }
  };
}

function evening(seed: number, items: Record<string, number> | 'base' = 'base'): SimulationState {
  let s = makeNewGameState(seed);
  s = withCredits({ ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(2) + 4 } });
  s = items === 'base' ? reducer(s, { type: 'BUY_PACKAGE', packageId: 'vinbar-base' }) : reducer(s, { type: 'BUY_ITEMS', items });
  return reducer(s, { type: 'START_SERVICE' });
}

const total = (s: SimulationState) => s.knowledgeCredits.episteme + s.knowledgeCredits.techne + s.knowledgeCredits.phronesis;

function answer(s: SimulationState, rank: 'best' | 'worst'): SimulationState {
  const a = s.incidents.active!;
  const step = incidentById('vinbar', a.id)!.steps[a.step];
  return reducer(s, { type: 'ANSWER_INCIDENT', optionId: rankedStepOption(step, rank, a.struck, a.situation) });
}

// Till första tillfället en insats går att starta (dörrarna öppna, ingen raket).
function toBettable(s: SimulationState, stake: number): SimulationState {
  for (let i = 0; i < 20000 && !canStartBet(s, stake) && s.day.period === 'dinner'; i++) {
    if (s.incidents.active) s = answer(s, 'best');
    s = reducer(s, TICK);
  }
  expect(canStartBet(s, stake)).toBe(true);
  return s;
}

function finishRocket(s: SimulationState, rank: 'best' | 'worst'): SimulationState {
  for (let i = 0; i < 10 && s.incidents.active; i++) s = answer(s, rank);
  return s;
}

describe('ORDER 279 — gästerna frågar om kvällens meny', () => {
  const menuRockets = incidentBankFor('vinbar').filter((i) => i.requiresOnMenu);

  it('nio raketer om rätter och drycker, var och en knuten till menyn', () => {
    expect(menuRockets.length).toBe(9);
    for (const r of menuRockets) expect(r.requiresOnMenu!.length).toBeGreaterThan(0);
    expect(fitsMenu(menuRockets.find((r) => r.id === 'mn03-gos')!, ['chicken-plate'])).toBe(false);
    expect(fitsMenu(menuRockets.find((r) => r.id === 'mn03-gos')!, ['fish-plate'])).toBe(true);
  });

  it('en raket om en rätt kommer bara när rätten står på menyn, och menyn ger sina raketer', () => {
    const fired: string[] = [];
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      let s = evening(seed);
      for (let i = 0; i < 30000 && s.day.period === 'dinner'; i++) {
        if (s.incidents.active && !(s.incidents.active.revealLeft ?? 0)) s = answer(s, 'best');
        s = reducer(s, TICK);
      }
      fired.push(...s.incidents.log.map((r) => r.id));
    }
    // Baspaketet har ingen fisk och inga kantareller.
    expect(fired).not.toContain('mn03-gos');
    expect(fired).not.toContain('mn04-kantareller');
    const fromMenu = fired.filter((id) => id.startsWith('mn')).length;
    expect(fromMenu / fired.length).toBeGreaterThan(MENU_ROCKETS.share / 2);
  });

  it('rätt svar höjer dricksen hos bordets gäster', () => {
    let s = evening(3);
    for (let i = 0; i < 20000 && !s.incidents.active; i++) s = reducer(s, TICK);
    const ids = s.incidents.active!.context.guestIds;
    s = answer(s, 'best');
    const g = s.guests.find((x) => ids.includes(x.id));
    if (g) expect(g.tipBonus).toBeCloseTo(MENU_ROCKETS.tipBonusPerClearedStep, 9);
    s = finishRocket(s, 'best');
    const after = s.guests.find((x) => ids.includes(x.id));
    if (after) expect(after.tipBonus).toBeCloseTo(3 * MENU_ROCKETS.tipBonusPerClearedStep + MENU_ROCKETS.tipBonusOnRocketCleared, 9);
  });
});

describe('ORDER 279 — insatsen', () => {
  it('insatsen drar krediterna och öppnar en egen raket', () => {
    const s = toBettable(evening(3), 5);
    const b = reducer(s, { type: 'START_BET', stake: 5 });
    expect(total(b)).toBe(total(s) - 5);
    expect(b.incidents.active?.bet).toEqual({ stake: 5 });
    expect(b.incidents.betsTonight).toBe(1);
    // Inte medan en raket står öppen, och bara de valbara insatserna.
    expect(canStartBet(b, 1)).toBe(false);
    expect(canStartBet(s, 7)).toBe(false);
  });

  it('en vunnen insats ger dubbla krediterna tillbaka och en intäkt', () => {
    const s = reducer(toBettable(evening(3), 10), { type: 'START_BET', stake: 10 });
    const cash = s.cash;
    const done = finishRocket(s, 'best');
    expect(done.incidents.lastBet).toMatchObject({ won: true, stake: 10, credits: 10 * BET.winCreditFactor });
    expect(total(done)).toBeGreaterThanOrEqual(total(s) + 10 * BET.winCreditFactor);
    const betLine = done.ledger.filter((l) => l.category === 'bet').at(-1)!;
    expect(betLine.amount).toBe(Math.round(10 * BET.cashPerCredit * BET.winCashFactor));
    expect(done.cash).toBeGreaterThan(cash);
  });

  it('en förlorad insats tar krediterna och ett större belopp ur kassan', () => {
    const s = reducer(toBettable(evening(3), 10), { type: 'START_BET', stake: 10 });
    const done = finishRocket(s, 'worst');
    expect(done.incidents.lastBet).toMatchObject({ won: false, stake: 10, credits: 0 });
    expect(total(done)).toBeLessThanOrEqual(total(s));
    expect(done.ledger.filter((l) => l.category === 'bet').at(-1)!.amount).toBe(-Math.round(10 * BET.cashPerCredit * BET.lossCashFactor));
    expect(BET.lossCashFactor).toBeGreaterThan(BET.winCashFactor);
  });

  it('en insats som får tiden att rinna ut förlorar', () => {
    let s = reducer(toBettable(evening(3), 3), { type: 'START_BET', stake: 3 });
    for (let i = 0; i < 20000 && s.incidents.active?.bet; i++) s = reducer(s, TICK);
    expect(s.incidents.lastBet).toMatchObject({ won: false, stake: 3 });
  });

  it('högst BET.maxPerEvening insatser per kväll, och inte fler krediter än spelaren har', () => {
    let s = toBettable(evening(3), 1);
    for (let n = 0; n < BET.maxPerEvening; n++) {
      s = toBettable(s, 1);
      s = finishRocket(reducer(s, { type: 'START_BET', stake: 1 }), 'best');
    }
    expect(s.incidents.betsTonight).toBe(BET.maxPerEvening);
    expect(canStartBet(s, 1)).toBe(false);
    // En kredit per axel: tre sammanlagt.
    const poor = withCredits(toBettable(evening(4), 1), 1);
    expect(canStartBet(poor, 5)).toBe(false);
    expect(canStartBet(poor, 3)).toBe(true);
  });

  it('en dålig vecka med stora insatser leder till nedgradering; samma spelare utan insats klarar sig', () => {
    const setup = (s: SimulationState) => withCredits({ ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(2) } });
    const play = (betStake?: number) => runWeeks({ seed: 7, weeks: 1, setup, plan: () => ({ ...weakMorning(), betStake }) });
    const bettor = play(10);
    const calm = play(undefined);
    expect(bettor.final.economy.lastSettlement?.downgradedTo).toBe('foodtruck');
    expect(calm.final.economy.lastSettlement?.downgradedTo ?? null).toBeNull();
    if (process.env.WRITE_REPORTS === '1') {
      void (async () => {
        const { mkdirSync, writeFileSync } = await import('node:fs');
        const { dirname, resolve } = await import('node:path');
        const { fileURLToPath } = await import('node:url');
        const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../reports/order279');
        mkdirSync(out, { recursive: true });
        writeFileSync(resolve(out, 'bet-downgrade.json'), JSON.stringify({
          definition: 'Vecka 2, vinbaren, brons i tre, 40 krediter per axel. Svag spelare (scenarios.ts weakMorning, sämsta svaret) med insatsen 10 så ofta det går (högst tre per kväll) mot samma spelare utan insats, frö 7. downgradedTo läses ur veckoavräkningen (economy.lastSettlement).',
          bettor: { downgradedTo: bettor.final.economy.lastSettlement?.downgradedTo ?? null, days: bettor.days.map((d) => ({ day: d.dayNumber, weekday: d.weekday, cash: d.cash, floor: d.floor, class: d.businessClass })) },
          calm: { downgradedTo: calm.final.economy.lastSettlement?.downgradedTo ?? null, days: calm.days.map((d) => ({ day: d.dayNumber, weekday: d.weekday, cash: d.cash, floor: d.floor, class: d.businessClass })) }
        }, null, 2) + '\n');
      })();
    }
  }, 120000);
});
