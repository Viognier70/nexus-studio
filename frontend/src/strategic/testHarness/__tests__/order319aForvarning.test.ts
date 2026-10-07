// ORDER 319a.4 (Anders 2026-10-07) — "Kortet kommer inte ur tomma intet": en situation i
// foodtrucken börjar med något som syns. Gästen först vid luckan går fram och pekar
// (askPointMenu), eller leveransbilen kommer; kortet väntar på förvarningen (introLeft).

import { describe, expect, it } from 'vitest';
import { playMorning, startInFoodtruck, tickUntil, type MorningPlan } from '../weekHarness';
import { reducer } from '../../simulation/reducer';
import { firstDayOfWeek } from '../../../sim/calendar';
import { PLAYERS } from '../randomness';
import { THEATRE } from '../../../sim/balance';
import { FOODTRUCK_ALL } from '../../../sim/incidentBank';
import type { ActiveIncident } from '../../../sim/incidents';

// Introt räknas ner redan i ticken då kortet öppnas.
const TICK = 0.5;

describe('ORDER 319a.4 — förvarningen före foodtruckens kort', () => {
  it('varje foodtrucksituation har en förvarning; leveransen kommer med bilen', () => {
    for (const i of FOODTRUCK_ALL) expect(i.cue).toBeDefined();
    expect(FOODTRUCK_ALL.find((i) => i.id === 'ft04-leveransen')!.cue).toBe('delivery');
    expect(THEATRE.cueSeconds.guestAtHatch).toBe(THEATRE.rocketIntroSeconds.askPointMenu);
  });

  it('en kväll: varje kort börjar med förvarningen, och gästen som pekar är vid vagnen', () => {
    const plan: MorningPlan = { scenarioAnswer: 'best', ladder: 'never' };
    let s = startInFoodtruck(1, firstDayOfWeek(1));
    s = { ...s, medals: { ...PLAYERS.baseline } };
    const opened: { active: ActiveIncident; guestState: string | null }[] = [];
    let last: string | null = null;
    tickUntil(reducer(playMorning(s, plan), { type: 'START_SERVICE' }), (x) => {
      const a = x.incidents?.active ?? null;
      if (a && a.id !== last) {
        const g = a.context.figure?.guestId ? x.guests.find((y) => y.id === a.context.figure!.guestId) : null;
        opened.push({ active: a, guestState: g ? g.state : null });
      }
      last = a?.id ?? null;
      return x.day.period === 'evening' || x.day.period === 'morning';
    });
    expect(opened.length).toBeGreaterThan(0);
    for (const { active, guestState } of opened) {
      expect(active.cue).toBeDefined();
      if (active.cue === 'delivery') {
        expect(active.introLeft).toBeGreaterThan(THEATRE.cueSeconds.delivery - TICK);
      } else {
        expect(active.context.figure?.clip).toBe('askPointMenu');
        expect(active.introLeft).toBeGreaterThan(THEATRE.rocketIntroSeconds.askPointMenu - TICK);
        expect(active.introLeft).toBeLessThanOrEqual(THEATRE.rocketIntroSeconds.askPointMenu + THEATRE.cueGuestSettledSeconds);
        expect(['arriving', 'waiting', 'ordering', 'eating']).toContain(guestState);
      }
    }
  });
});
