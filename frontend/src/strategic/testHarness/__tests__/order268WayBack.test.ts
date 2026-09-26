// ORDER 268 — vägen tillbaka efter nedgradering (NEXUS_V1_OPPNA_FRAGOR.md,
// punkten "Rättas först efter SPELSTOPP 1").
//
// Speldesign > Principer 3: "Det finns alltid en väg tillbaka. Medaljer
// förloras aldrig, nedgradering är inte slutet, och paviljongerna är
// alltid öppna." DoD: veckoharnessen visar i vinbarens rum en
// nedgradering till food truck följd av en väg tillbaka.
//
// Med WRITE_REPORTS=1 skrivs
//   reports/order268/week-harness.json — alla scenarier, per dag och
//     avräkning (samma form som reports/order267/week-harness.json);
//   reports/order268/utan-verksamhet.json — spelaren som inte öppnar igen;
//   reports/order268/vanlig-vinbar-4-veckor.json — en vanlig vinbar
//     (brons i tre, startkassan) i fyra veckor, veckans resultat efter
//     avräkningen (fältet weeks[].cashChangeSek);
//   reports/order268/save-lordag-vecka1.json — sparfilen på lördagsmorgonen
//     före nedgraderingen, som scripts/order268-way-back.mjs laddar i
//     spelarens vy.

import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { daySummary, examsFirstDays, SCENARIOS, weakMorning, type ScenarioRun } from '../scenarios';
import { runWeeks } from '../weekHarness';
import { calendarFor } from '../../../sim/calendar';
import { ECONOMY, NEW_START, SCENARIO_CASH, TEAM_BY_CLASS } from '../../../sim/balance';
import { changeClass, classOptions } from '../../../sim/economy';
import { makeSaveFile } from '../../../sim/save';
import type { PavilionKey, SimulationState } from '../../types';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order268');
const WRITE = process.env.WRITE_REPORTS === '1';

type Settlement = { week: number; downgradedFrom: string | null; downgradedTo: string | null; class: string | null; cash: number; team: string[] };

describe('ORDER 268 — vägen tillbaka efter nedgradering', () => {
  let saturday: SimulationState | null = null;
  const run: ScenarioRun = SCENARIOS['nedgradering-och-tillbaka']((s) => {
    const cal = calendarFor(s.day.dayNumber);
    if (cal.absoluteWeek === 1 && cal.weekday === 'sat') saturday = s;
  });
  const settlements = run.settlements as Settlement[];
  const classes = run.run.days.map((d) => d.businessClass);

  it('vinbaren nedgraderas till food truck, och spelaren står sedan i vinbaren igen', () => {
    const first = settlements.find((s) => s.downgradedFrom);
    expect(first).toMatchObject({ downgradedFrom: 'vinbar', downgradedTo: 'foodtruck' });
    const truck = classes.indexOf('foodtruck');
    expect(truck).toBeGreaterThan(-1);
    const back = classes.indexOf('vinbar', truck);
    expect(back).toBeGreaterThan(truck);
    // Spelaren arbetar sig tillbaka: direkt från food trucken, utan att
    // gå under igen, inom säsongens åtta veckor.
    expect(classes.slice(truck, back)).not.toContain(null);
    expect(run.run.days[back].week).toBeLessThanOrEqual(8);
  });

  it('personalen följer klassen: food trucken bär sitt eget lag', () => {
    const inTruck = settlements.find((s) => s.class === 'foodtruck')!;
    expect(inTruck.team).toEqual([...TEAM_BY_CLASS.roles.foodtruck]);
    for (const s of settlements.filter((x) => x.class === null)) expect(s.team).toEqual([]);
  });

  // Spelaren utan verksamhet (efter "food truck till inget lån"): inga
  // löner och ingen ränta, så kassan står still. Banken lånar ut igen
  // först efter en hel vecka i Måltidens hus med minst ett prov
  // (Vision Owner 2026-09-26). Spelaren gör brons i tre de första
  // morgnarna och frågar banken varje morgon.
  const bankAnswers: { day: number; vinbar: string }[] = [];
  const idle = runWeeks({
    seed: 42,
    weeks: 2,
    setup: (s) => changeClass({ ...s, cash: 0 }, null, true),
    plan: (s) => {
      if (s.economy.businessClass === null) bankAnswers.push({ day: s.day.dayNumber, vinbar: classOptions(s).find((o) => o.id === 'vinbar')!.status });
      const next = (['stensota', 'metodkoket', 'kalastorget'] as PavilionKey[]).find((p) => !s.medals[p]);
      return { exams: next ? [{ pavilion: next, correct: Number.MAX_SAFE_INTEGER }] : [], actions: [{ type: 'CHOOSE_CLASS', to: 'vinbar' }] };
    }
  });

  it('utan verksamhet kostar personalen ingenting, och kassan står still', () => {
    const without = idle.days.filter((d) => d.businessClass === null);
    expect(without.length).toBeGreaterThan(0);
    expect(new Set(without.map((d) => d.cash)).size).toBe(1);
  });

  it('utan verksamhet lånar banken ut först efter en hel vecka med minst ett prov, och sedan utan kontantinsats', () => {
    const firstYes = bankAnswers.find((b) => b.vinbar === 'available');
    expect(bankAnswers.filter((b) => b.day < 1 + NEW_START.daysWithoutBusiness).every((b) => b.vinbar !== 'available')).toBe(true);
    expect(firstYes?.day).toBe(1 + NEW_START.daysWithoutBusiness);
    expect(idle.days.find((d) => d.dayNumber === firstYes!.day)?.businessClass).toBe('vinbar');
  });

  // Scenariernas kassa per vecka, för den rimliga och den svaga spelaren
  // i vinbaren (Vision Owner 2026-09-26: högst cirka 20 % av en normal
  // veckointäkt, åt båda hållen). Läses ur kassabokens scenariorader.
  const scenarioWeeks = (r: ReturnType<typeof runWeeks>) => {
    const byWeek = new Map<number, number>();
    for (const l of r.final.ledger) if (l.category === 'scenario') byWeek.set(Math.ceil(l.day / 7), (byWeek.get(Math.ceil(l.day / 7)) ?? 0) + l.amount);
    return [...byWeek.entries()].map(([week, sek]) => ({ week, sek: Math.round(sek), share: Math.round((sek / ECONOMY.normalWeeklyRevenueSek.vinbar) * 1000) / 1000 }));
  };
  const rational = runWeeks({ seed: 42, weeks: 4, plan: examsFirstDays });
  const weakRun = runWeeks({ seed: 42, weeks: 4, plan: (s) => ({ ...examsFirstDays(s), ...weakMorning() }) });

  it('scenarierna ger högst 20 % av en normal veckointäkt, åt båda hållen', () => {
    const cap = ECONOMY.normalWeeklyRevenueSek.vinbar * SCENARIO_CASH.weeklyCapShareOfNormalRevenue;
    for (const w of [...scenarioWeeks(rational), ...scenarioWeeks(weakRun)]) expect(Math.abs(w.sek)).toBeLessThanOrEqual(cap + 1);
    expect(scenarioWeeks(rational).every((w) => w.sek > 0)).toBe(true);
    // Bara kvällar med ekonomiskt tema flyttar kassan, så en enskild
    // vecka kan gå jämnt upp; över fyra veckor förlorar den svaga.
    expect(scenarioWeeks(weakRun).reduce((a, w) => a + w.sek, 0)).toBeLessThan(0);
  });

  it.runIf(WRITE)('rapporterna och sparfilen skrivs', () => {
    mkdirSync(OUT, { recursive: true });
    const all: Record<string, unknown> = {};
    for (const [name, scenario] of Object.entries(SCENARIOS)) {
      const r = name === 'nedgradering-och-tillbaka' ? run : scenario();
      all[name] = { seed: r.run.seed, settlements: r.settlements, days: daySummary(r.run) };
    }
    writeFileSync(resolve(OUT, 'week-harness.json'), JSON.stringify({ scenarios: all }, null, 2) + '\n');
    writeFileSync(
      resolve(OUT, 'utan-verksamhet.json'),
      JSON.stringify({ seed: idle.seed, bankAnswers, days: idle.days.map((d) => ({ day: d.dayNumber, week: d.week, weekday: d.weekday, class: d.businessClass, cash: d.cash })) }, null, 2) + '\n'
    );
    // En vanlig vinbar i fyra veckor: kassan söndag mot söndag.
    const normal = runWeeks({ seed: 42, weeks: 4, plan: examsFirstDays });
    const sundays = normal.days.filter((d) => d.weekday === 'sun');
    const weeks = sundays.map((d, i) => ({ week: d.week, cashSunday: d.cash, cashChangeSek: i === 0 ? null : d.cash - sundays[i - 1].cash }));
    writeFileSync(
      resolve(OUT, 'vanlig-vinbar-4-veckor.json'),
      JSON.stringify({ seed: normal.seed, weeks, days: daySummary(normal) }, null, 2) + '\n'
    );
    writeFileSync(
      resolve(OUT, 'scenario-cash.json'),
      JSON.stringify({ capShare: SCENARIO_CASH.weeklyCapShareOfNormalRevenue, normalWeeklyRevenueSek: ECONOMY.normalWeeklyRevenueSek.vinbar, rational: scenarioWeeks(rational), weak: scenarioWeeks(weakRun) }, null, 2) + '\n'
    );
    expect(saturday).not.toBeNull();
    writeFileSync(resolve(OUT, 'save-lordag-vecka1.json'), JSON.stringify(makeSaveFile(saturday!, 'Vinbaren vid torget', 'auto', new Date('2026-09-26T12:00:00Z'))) + '\n');
  });
});
