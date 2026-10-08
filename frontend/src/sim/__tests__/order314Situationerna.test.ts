// ORDER 314 (Anders 2026-10-06, beslut A) — allt sker i situationer.
//   1. Inga frivilliga raketer: Stå för ditt svar är borttagen.
//   2. Kvitt eller dubbelt finns kvar inne i varje situation.
//   3. Utan svar tar personalen över med sin kompetens (0,4 utan utbildning,
//      oftare med), alltid sämre än en kunnig spelare.
//   4. Takten: 4–6 per kväll, aldrig två samtidigt, minst 8 spelminuter
//      mellan dem; situationen saktar in spelet till 1×.
// Harnessens tabell (spelartypen "ignorerar") står i ORDER_314_RAPPORT.md
// (reports/order314/efter40/, scripts/order314-harness.sh).

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { effectiveSpeed } from '../../strategic/simulation/consequence';
import { firstDayOfWeek } from '../calendar';
import { incidentById } from '../incidentBank';
import { rankedStepOption, situationGapSimSeconds, staffHandles } from '../incidents';
import { DOUBLE_OR_NOTHING, GAME_MINUTES_PER_SIM_SECOND, SITUATIONS } from '../balance';
import { PLAYERS } from '../../strategic/testHarness/randomness';
import type { SimulationState } from '../../strategic/types';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const TICK = { type: 'TICK', dt: 0.2 } as const;

function service(seed: number, offset = 4): SimulationState {
  let s = makeNewGameState(seed);
  s = { ...s, medals: { ...PLAYERS.baseline }, speed: 4, day: { ...s.day, dayNumber: firstDayOfWeek(2) + offset } };
  s = reducer(s, { type: 'BUY_PACKAGE', packageId: 'vinbar-base' });
  return reducer(s, { type: 'START_SERVICE' });
}

function best(s: SimulationState): string {
  const a = s.incidents.active!;
  return rankedStepOption(incidentById('vinbar', a.id)!.steps[a.step], 'best', a.struck, a.situation);
}

/** En kväll där spelaren svarar bäst (eller inte alls); öppnings- och avgörandetiderna loggas. */
function play(seed: number, answer: boolean, offset = 4) {
  let s = service(seed, offset);
  const opened: number[] = [];
  let twoAtOnce = false;
  let slowed = true;
  let lastId: string | null = null;
  for (let i = 0; i < 60000 && s.day.period === 'dinner'; i++) {
    const a = s.incidents.active;
    if (a && `${a.id}:${a.openedAt}` !== lastId) { lastId = `${a.id}:${a.openedAt}`; opened.push(a.openedAt); }
    if (a && effectiveSpeed(s) !== 1) slowed = false;
    if (a && answer && !a.pending) s = a.choosing ? reducer(s, { type: 'INCIDENT_GO' }) : reducer(s, { type: 'ANSWER_INCIDENT', optionId: best(s) });
    s = reducer(s, TICK);
    if (s.incidents.active && a && s.incidents.active.id !== a.id && s.incidents.active.openedAt === a.openedAt) twoAtOnce = true;
  }
  return { s, opened, twoAtOnce, slowed };
}

describe('ORDER 314 §1 — inga frivilliga raketer', () => {
  it('Stå för ditt svar finns inte: ingen åtgärd, ingen knapp, inga egna raketer', () => {
    expect(readFileSync(resolve(SRC, 'strategic/types.ts'), 'utf8')).not.toContain("'START_BACK'");
    expect(readFileSync(resolve(SRC, 'strategic/ui/service/EventsPanel.tsx'), 'utf8')).not.toContain('back-start');
    expect(readFileSync(resolve(SRC, 'strategic/StrategicApp.tsx'), 'utf8')).not.toContain('mode="back"');
    expect(readFileSync(resolve(SRC, 'sim/incidents.ts'), 'utf8')).not.toMatch(/export function (startBack|canStartBack|whyNotBack)/);
    const { s } = play(3, true);
    expect(s.incidents.log.every((r) => r.kind !== 'backed')).toBe(true);
  });
});

describe('ORDER 314 §2 — kvitt eller dubbelt i varje situation', () => {
  it('efter ett rätt steg väljer spelaren att stanna eller gå vidare, i situationer ur rummet', () => {
    expect(DOUBLE_OR_NOTHING.enabled).toBe(true);
    let s = service(5);
    for (let i = 0; i < 20000 && !(s.incidents.active && (s.incidents.active.introLeft ?? 0) <= 0); i++) s = reducer(s, TICK);
    s = reducer(s, { type: 'ANSWER_INCIDENT', optionId: best(s) });
    for (let i = 0; i < 400 && !s.incidents.active?.choosing; i++) s = reducer(s, TICK);
    expect(s.incidents.active?.choosing).toBe(true);
    expect(s.incidents.active?.backed ?? false).toBe(false);
  });
});

describe('ORDER 314 §3 — personalen tar över med sin kompetens', () => {
  it('utan utbildning klarar personalen det ungefär 0,4, med utbildning oftare', () => {
    const base = service(1);
    const vin = incidentById('vinbar', 'vb01-korken')!; // sommellerie → vin
    const rate = (state: SimulationState) => {
      let s: SimulationState = { ...state };
      let hits = 0;
      for (let i = 0; i < 2000; i++) { const d = { ...s }; if (staffHandles(d, vin)) hits++; s = { ...s, rngState: d.rngState }; }
      return hits / 2000;
    };
    const untrained = { ...base, staff: base.staff.map((m) => ({ ...m, skills: [] })) };
    const trained = { ...base, staff: base.staff.map((m) => ({ ...m, skills: ['vin', 'mat', 'service'] })) };
    expect(Math.abs(rate(untrained) - SITUATIONS.staffSuccessUntrained)).toBeLessThan(0.04);
    expect(Math.abs(rate(trained) - SITUATIONS.staffSuccessTrained)).toBeLessThan(0.04);
    expect(SITUATIONS.staffSuccessTrained).toBeGreaterThan(SITUATIONS.staffSuccessUntrained);
  });

  it('följden är alltid sämre än en kunnig spelares: halva det bästa utfallet, inga krediter, ingen pott', () => {
    expect(SITUATIONS.staffSuccessShare).toBeLessThan(1);
    const kunnig = play(7, true);
    const ignorerar = play(7, false);
    const credits = (s: SimulationState) => s.incidents.log.reduce((n, r) => n + (r.deltas?.credits ?? 0), 0);
    expect(credits(kunnig.s)).toBeGreaterThan(credits(ignorerar.s));
    expect(ignorerar.s.incidents.log.every((r) => r.quality === 'staff' && !r.pot?.taken)).toBe(true);
    // ORDER 306b — personalen lyckas med sannolikheten i SITUATIONS; en kväll kan sakna lyckat övertag, så tre kvällar prövas.
    expect([ignorerar, play(8, false), play(9, false)].some((x) => x.s.incidents.log.some((r) => r.staffCleared))).toBe(true);
  });
});

describe('ORDER 314 §4 — takten', () => {
  it('4–6 situationer per kväll, aldrig två samtidigt, minst 8 spelminuter mellan dem, och 1× under situationen', () => {
    expect(situationGapSimSeconds() * GAME_MINUTES_PER_SIM_SECOND).toBeCloseTo(SITUATIONS.minGapGameMinutes);
    for (const [seed, offset] of [[1, 0], [2, 4], [3, 5], [9, 2]]) {
      const r = play(seed, true, offset);
      const n = r.s.incidents.log.length;
      expect(n, `frö ${seed}`).toBeGreaterThanOrEqual(SITUATIONS.minPerEvening);
      expect(n, `frö ${seed}`).toBeLessThanOrEqual(SITUATIONS.maxPerEvening);
      expect(r.twoAtOnce).toBe(false);
      expect(r.slowed).toBe(true);
      // Pausen räknas från att förra situationen avgjordes (loggens at) till nästa öppning.
      const log = r.s.incidents.log;
      for (let i = 1; i < log.length; i++) {
        const nextOpen = r.opened[i];
        expect(nextOpen - log[i - 1].at, `frö ${seed}, situation ${i + 1}`).toBeGreaterThanOrEqual(situationGapSimSeconds() - 1e-6);
      }
    }
  });
});

// Mätningen av takten (ORDER314_TAKT_OUT=reports/order314/takten.json): antal
// situationer per kväll i vinbaren, måndag, fredag och lördag, tio frön, när
// spelaren svarar bäst. Jämförelsen med före ordern står i rapporten.
describe.skipIf(!process.env.ORDER314_TAKT_OUT)('ORDER 314 — takten mätt', () => {
  it('situationer per kväll', async () => {
    const { writeFileSync, mkdirSync } = await import('node:fs');
    const out: Record<string, number[]> = {};
    for (const [label, offset] of [['måndag', 0], ['fredag', 4], ['lördag', 5]] as const) {
      out[label] = [];
      for (let seed = 1; seed <= 10; seed++) out[label].push(play(seed, true, offset).s.incidents.log.length);
    }
    const all = Object.values(out).flat();
    mkdirSync(dirname(process.env.ORDER314_TAKT_OUT!), { recursive: true });
    writeFileSync(process.env.ORDER314_TAKT_OUT!, JSON.stringify({ perEvening: out, mean: Math.round((all.reduce((a, b) => a + b, 0) / all.length) * 10) / 10, min: Math.min(...all), max: Math.max(...all) }, null, 2) + '\n');
    expect(all.length).toBe(30);
  }, 900000);
});
