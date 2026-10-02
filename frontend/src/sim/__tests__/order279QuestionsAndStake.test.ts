// ORDER 279 — frågorna och insatsen (Vision Owner 2026-09-28, andra
// provspelet): raketer där gäster frågar om kvällens rätter och drycker
// utifrån menyn och dryckeslistan; rätt svar ger högre dricks; action-
// knappen tillbaka som live betting med krediter, vinst och förlust; stora
// förluster, och en dålig vecka kan leda till nedgradering.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { firstDayOfWeek } from '../calendar';
import { MENU_ROCKETS } from '../balance';
import { fitsMenu, incidentBankFor, incidentById } from '../incidentBank';
import { rankedStepOption } from '../incidents';
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


function answer(s: SimulationState, rank: 'best' | 'worst'): SimulationState {
  const a = s.incidents.active!;
  const step = incidentById('vinbar', a.id)!.steps[a.step];
  return reducer(s, { type: 'ANSWER_INCIDENT', optionId: rankedStepOption(step, rank, a.struck, a.situation) });
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
    // ORDER 296b — tolv kvällar: andelen är ett snitt (sex kvällar gav 0,17
    // efter balansändringarna, trettio ger 0,26).
    for (const seed of Array.from({ length: 12 }, (_, i) => i + 1)) {
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

// ORDER 280 (Vision Owner 2026-09-29): insatsen görs bara i krediter och
// heter Back your knowledge. Testerna står i order280BackYourKnowledge.test.ts.
