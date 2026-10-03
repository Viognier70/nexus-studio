// ORDER 298 — varför kommer gästerna så sent? (Vision Owner, provspel: "kl.
// 19.37 med status Rusning var krogen tom och kvällskassan stod på 0 kr, 32
// minuter efter öppning.")
//
// Kvällen spelas som i provspelet: nytt spel, vinbaren vecka 1, baspaketet på
// morgonen. Varje spelminut loggas: sällskap som genererats, som gått in och
// som satts vid bord (med klockslag), kvällskassan, mise en place och lagret,
// och de regler som kan hålla tillbaka gästerna (marknadens tak, ankomsttakten,
// kön och greet-steget vid dörren).
//
//   KVALL_DAYS=mon,fri [KVALL_REP=0.2] [KVALL_SEED_LIST=10] WRITE_REPORTS=1 REPORT_ORDER=order298 npx vitest run src/strategic/testHarness/__tests__/order298Kvallen.test.ts

import { describe, expect, it } from 'vitest';
import { makeNewGameState } from '../../simulation/model';
import { reducer } from '../../simulation/reducer';
import { playMorning, tickUntil } from '../weekHarness';
import { mountRoomLikeScene } from '../roomParity';
import { firstDayOfWeek, calendarFor } from '../../../sim/calendar';
import { clockMinutes, formatClock } from '../../../sim/clock';
import { tillSek } from '../../simulation/eveningEconomy';
import { coverage } from '../../simulation/morningBuy';
import { dailyGuestCap } from '../../../sim/economy';
import { arrivalAttraction } from '../../simulation/arrivals';
import type { SimulationState } from '../../types';

const OFFSET: Record<string, number> = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5 };

function evening(seed: number, weekday: string) {
  let s: SimulationState = makeNewGameState(seed);
  // KVALL_REP sätter ryktet (provspelets sena kväll: lågt rykte och ingen vid dörren).
  s = { ...s, ...(process.env.KVALL_REP ? { reputation: Number(process.env.KVALL_REP) } : {}), day: { ...s.day, dayNumber: firstDayOfWeek(1) + OFFSET[weekday] } };
  s = playMorning(s, {});
  mountRoomLikeScene(s.businessClass);
  const morning = { covers: coverage(s).covers, marketCap: dailyGuestCap(s), booking: s.day.booking?.total ?? null, attraction: +arrivalAttraction(s).toFixed(3) };
  s = reducer(s, { type: 'START_SERVICE' });
  const seen = new Map<string, string>();
  const parties = new Map<string, { generatedAt: string; enteredAt?: string; seatedAt?: string; size: number; source: string }>();
  const minutes: Record<string, unknown>[] = [];
  let lastMinute = -1;
  const open = { doorsOpenAt: s.day.doorsOpenAt, doorsOpen: s.day.doorsOpenMinutes };
  s = tickUntil(s, (x) => {
    const clock = formatClock(clockMinutes(x));
    for (const g of x.guests) {
      const key = g.partyId ?? g.id;
      const prev = seen.get(g.id);
      if (!prev) {
        if (!parties.has(key)) parties.set(key, { generatedAt: clock, size: g.partySize ?? 1, source: g.scenarioSource ? 'raket' : 'flödet' });
      }
      const p = parties.get(key);
      if (p && prev !== g.state) {
        if (!p.enteredAt && (g.state === 'waiting' || g.state === 'seated' || g.state === 'ordering')) p.enteredAt = clock;
        if (!p.seatedAt && g.seatIndex !== null && g.seatIndex !== undefined) p.seatedAt = clock;
      }
      seen.set(g.id, g.state);
    }
    const m = Math.floor(clockMinutes(x));
    if (x.day.period === 'dinner' && m !== lastMinute && m % 5 === 0) {
      lastMinute = m;
      minutes.push({
        clock,
        doorsOpened: !!x.day.doorsOpenedThisService,
        arrivalsToday: x.day.arrivalsToday ?? 0,
        guests: x.guests.length,
        arriving: x.guests.filter((g) => g.state === 'arriving').length,
        notGreeted: x.guests.filter((g) => g.state === 'arriving' && !g.hasBeenGreeted).length,
        waiting: x.waitingIds.length,
        seated: x.seatedIds.length,
        bills: x.day.billsTonight ?? 0,
        till: Math.round(tillSek(x)),
        readiness: x.day.prepReadiness ? Object.fromEntries(Object.entries(x.day.prepReadiness).map(([k, v]) => [k, +(+v).toFixed(2)])) : null,
        backlogMin: x.day.prepBacklogMin ?? 0,
        reputation: +x.reputation.toFixed(3),
        rocket: x.incidents?.active?.id ?? null
      });
    }
    return x.day.period === 'evening' || x.day.period === 'morning';
  });
  const list = [...parties.values()];
  return {
    seed, weekday, week: calendarFor(s.day.dayNumber).week, morning, open,
    firstGenerated: list[0]?.generatedAt ?? null,
    firstSeated: list.filter((p) => p.seatedAt).map((p) => p.seatedAt!).sort()[0] ?? null,
    parties: list.length,
    seatedParties: list.filter((p) => p.seatedAt).length,
    partyLog: list,
    minutes
  };
}

describe.skipIf(!process.env.KVALL_DAYS)('ORDER 298 — kvällen loggad', () => {
  it('loggar sällskapen och kvällskassan minut för minut', async () => {
    const days = process.env.KVALL_DAYS!.split(',');
    const seeds = process.env.KVALL_SEED_LIST ? process.env.KVALL_SEED_LIST.split(',').map(Number) : Array.from({ length: Number(process.env.KVALL_SEEDS ?? 3) }, (_, i) => i + 1);
    const runs = days.flatMap((d) => seeds.map((seed) => evening(seed, d)));
    if (process.env.WRITE_REPORTS === '1') {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports', process.env.REPORT_ORDER ?? 'order298');
      mkdirSync(out, { recursive: true });
      writeFileSync(resolve(out, process.env.KVALL_OUT ?? 'kvallen.json'), JSON.stringify({ definition: 'Nytt spel, vinbaren vecka 1, baspaketet. Sällskapen med klockslag (genererat, gått in, satt vid bord) och var femte spelminut: ankomster, kön, de som sitter, notor, kvällskassan, mise en place och ryktet.', runs }, null, 2) + '\n');
    }
    expect(runs.length).toBeGreaterThan(0);
  }, 600000);
});
