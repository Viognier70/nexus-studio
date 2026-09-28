// ORDER 270 — händelserna i servicen (Vision Owner 2026-09-26, efter
// provspelet): action-knappen bort, servicen som en följd av händelser,
// kvällens lärdom i stället för quizen. Vision Owner 2026-09-27: varje
// händelse är en raket i tre steg (episteme, techne, phronesis).

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { changeClass } from '../economy';
import { firstDayOfWeek, calendarFor } from '../calendar';
import { INCIDENTS } from '../balance';
import { incidentBankFor, incidentById, optionQuality, validateIncidentBank } from '../incidentBank';
import { arcFor, clockMinutes, formatIncidentText, incidentsTonight, rankedStepOption } from '../incidents';
import vinbarMeta from '../../content/incidents/vinbar.meta.json';
import vinbarText from '../../content/incidents/vinbar.text.sv.draft.json';
import type { SimulationState } from '../../strategic/types';

const TICK = { type: 'TICK', dt: 0.2 } as const;

function tick(s: SimulationState, n: number): SimulationState {
  for (let i = 0; i < n; i++) s = reducer(s, TICK);
  return s;
}

// En vanlig vecka (vecka 2), vinbaren, dörrarna öppna.
function wineBarService(weekdayOffset = 0, medals: SimulationState['medals'] = {}): SimulationState {
  let s = makeNewGameState(7);
  s = { ...s, medals: { stensota: 'brons', metodkoket: 'brons', kalastorget: 'brons', ...medals }, speed: 2 };
  s = { ...s, day: { ...s.day, dayNumber: firstDayOfWeek(2) + weekdayOffset } };
  s = reducer(s, { type: 'START_SERVICE' });
  expect(s.day.period).toBe('dinner');
  return s;
}

// Svaret som harnessen ger på raketens aktuella steg.
function answer(s: SimulationState, rank: 'best' | 'worst' = 'best'): SimulationState {
  const a = s.incidents.active!;
  const step = incidentById('vinbar', a.id)!.steps[a.step];
  return reducer(s, { type: 'ANSWER_INCIDENT', optionId: rankedStepOption(step, rank, a.struck, a.situation) });
}

// Öppna en bestämd händelse nu (samma väg som en kedjad händelse).
function openNow(s: SimulationState, id: string): SimulationState {
  s = { ...s, incidents: { ...s.incidents, slots: [{ at: s.simTime, phase: 'rush' }, ...s.incidents.slots], queued: [id] } };
  if (!s.day.doorsOpenedThisService) s = tick(s, 700);
  for (let i = 0; i < 2000 && s.incidents.active?.id !== id; i++) {
    if (s.incidents.active) s = answer(s);
    s = reducer(s, TICK);
  }
  expect(s.incidents.active?.id).toBe(id);
  expect(s.incidents.active?.step).toBe(0);
  return s;
}

const tracks = (x: SimulationState, axis: 'episteme' | 'techne' | 'phronesis') =>
  Object.values(x.knowledgeTracks[axis]).reduce((p, v) => p + v, 0);

describe('ORDER 270 — händelsebanken som raketer', () => {
  const bank = incidentBankFor('vinbar');

  it('31 raketer för vinbaren (30 utkast och servetterna och isen), som data, utan fel', () => {
    expect(bank).toHaveLength(31);
    expect(validateIncidentBank(vinbarMeta as never, vinbarText as never)).toEqual([]);
  });

  it('varje raket har tre steg: episteme, techne, phronesis, var och ett med 3–4 svar, ett bästa och minst ett fel', () => {
    for (const i of bank) {
      expect(i.steps.map((s) => s.axis)).toEqual(['episteme', 'techne', 'phronesis']);
      for (const s of i.steps) {
        expect(s.options.length).toBeGreaterThanOrEqual(INCIDENTS.optionsMin);
        expect(s.options.length).toBeLessThanOrEqual(INCIDENTS.optionsMax);
        expect(s.options.filter((o) => o.quality === 'best')).toHaveLength(1);
        expect(s.options.some((o) => o.quality === 'wrong')).toBe(true);
        expect(s.text.question.endsWith('?')).toBe(true);
      }
    }
  });

  it('stegens paviljonger: Måltidsbiblioteket, spårets techne-paviljong, Kalastorget', () => {
    for (const i of bank) {
      expect(i.steps[0].pavilion).toBe('maltidbiblioteket');
      expect(i.steps[1].pavilion).toBe(i.track === 'kok' ? 'metodkoket' : 'stensota');
      expect(i.steps[2].pavilion).toBe('kalastorget');
    }
  });

  it('det bästa svaret står inte oftast först', () => {
    const steps = bank.flatMap((i) => i.steps);
    const first = steps.filter((s) => s.options[0].quality === 'best').length;
    expect(first / steps.length).toBeLessThan(0.4);
  });

  it('bågen och kedjorna finns i banken', () => {
    const arcs = new Set(bank.map((i) => i.arc));
    expect([...arcs].sort()).toEqual(['closing', 'crisis', 'opening', 'rush']);
    const outcomes = bank.flatMap((i) => [i.success, i.staff, ...i.steps.flatMap((s) => [s.fail, ...s.options.flatMap((o) => (o.fail ? [o.fail] : []))])]);
    expect(outcomes.some((o) => (o.triggers ?? []).length > 0)).toBe(true);
    expect(outcomes.some((o) => (o.prevents ?? []).length > 0)).toBe(true);
    expect(bank.some((i) => i.chainOnly)).toBe(true);
  });

  it('scenarierna vid dörren har flyttat in som händelser', () => {
    for (const id of ['vb08-sallskap-pa-fem', 'vb13-delegationen', 'vb15-fisken']) expect(incidentById('vinbar', id)).toBeDefined();
  });

  it('platshållarna fylls ur kvällens sammanhang', () => {
    const t = formatIncidentText('{gäst} vid bord {bord} vill ha {vin}. {personal} hämtar.', { table: 4, guestIds: [], guest: 'ett par', wine: 'Barolo', staff: 'servitören', clock: '20.30' });
    expect(t).toBe('Ett par vid bord 4 vill ha Barolo. Servitören hämtar.');
  });
});

describe('ORDER 270 — kvällens båge', () => {
  it('2–4 raketer per kväll, fler fredag och lördag', () => {
    const mon = firstDayOfWeek(2);
    const counts = Array.from({ length: 6 }, (_, i) => incidentsTonight(mon + i));
    expect(calendarFor(mon).weekday).toBe('mon');
    expect(INCIDENTS.minPerEvening).toBe(2);
    expect(INCIDENTS.maxPerEvening).toBe(4);
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(INCIDENTS.minPerEvening);
    expect(Math.max(...counts)).toBeLessThanOrEqual(INCIDENTS.maxPerEvening);
    expect(counts[4]).toBeGreaterThan(counts[0]);
    expect(counts[5]).toBeGreaterThan(counts[0]);
  });

  it('öppning först, kris näst sist, avslut sist', () => {
    expect(arcFor(3)).toEqual(['opening', 'crisis', 'closing']);
    expect(arcFor(4)).toEqual(['opening', 'rush', 'crisis', 'closing']);
  });

  it('vinbarens service planerar raketer och inga scenarier vid dörren', () => {
    const s = wineBarService(5);
    expect(s.incidents.enabled).toBe(true);
    expect(s.incidents.slots.length).toBe(incidentsTonight(s.day.dayNumber));
    expect(s.day.scenarioTriggerTimes).toEqual([]);
  });

  it('en klass utan händelsebank behåller scenarierna', () => {
    let s = makeNewGameState(7);
    s = changeClass({ ...s, day: { ...s.day, dayNumber: firstDayOfWeek(2) } }, 'foodtruck', false);
    s = reducer(s, { type: 'START_SERVICE' });
    expect(s.incidents.enabled).toBe(false);
    expect(s.day.scenarioTriggerTimes.length).toBeGreaterThan(0);
  });
});

describe('ORDER 270 — en raket', () => {
  it('tiderna står i balance.ts: episteme 15 s, techne 20 s, phronesis 30 s', () => {
    expect(INCIDENTS.stepSeconds).toEqual({ episteme: 15, techne: 20, phronesis: 30 });
  });

  it('rummet står inte still: servicen fortsätter medan nedräkningen går', () => {
    const s = openNow(wineBarService(), 'vb09-getosten');
    const later = tick(s, 20);
    expect(later.simTime).toBeGreaterThan(s.simTime);
    expect(later.incidents.active?.id).toBe('vb09-getosten');
    expect(later.incidents.active!.secondsLeft).toBeLessThan(s.incidents.active!.secondsLeft);
  });

  it('nästa steg nås bara genom att klara det förra; varje bästa svar ger en kredit på stegets axel', () => {
    // Brons i Stensöta och Kalastorget, ingen medalj i Måltidsbiblioteket.
    const s0 = openNow(wineBarService(), 'vb09-getosten');
    expect(s0.incidents.active!.secondsTotal).toBe(INCIDENTS.stepSeconds.episteme);
    const s1 = reducer(s0, { type: 'ANSWER_INCIDENT', optionId: 'c' });
    expect(s1.incidents.active).toMatchObject({ id: 'vb09-getosten', step: 1 });
    expect(s1.incidents.active!.secondsTotal).toBe(INCIDENTS.stepSeconds.techne + INCIDENTS.extraSecondsPerMedalStep);
    expect(s1.knowledgeCredits.episteme - s0.knowledgeCredits.episteme).toBe(INCIDENTS.bestAnswerCredit);
    const s2 = reducer(s1, { type: 'ANSWER_INCIDENT', optionId: 'b' });
    expect(s2.incidents.active).toMatchObject({ id: 'vb09-getosten', step: 2 });
    expect(s2.incidents.active!.secondsTotal).toBe(INCIDENTS.stepSeconds.phronesis + INCIDENTS.extraSecondsPerMedalStep);
    expect(s2.knowledgeTracks.techne.sommellerie - s1.knowledgeTracks.techne.sommellerie).toBe(INCIDENTS.bestAnswerCredit);
    // Hela raketen klarad: bästa utfall.
    const done = reducer(s2, { type: 'ANSWER_INCIDENT', optionId: 'd' });
    expect(done.incidents.active).toBeNull();
    expect(done.knowledgeCredits.phronesis - s2.knowledgeCredits.phronesis).toBe(INCIDENTS.bestAnswerCredit);
    expect(done.cash).toBeGreaterThan(s2.cash);
    expect(done.incidents.lastOutcome?.text).toBe(incidentById('vinbar', 'vb09-getosten')!.text.success.outcome);
    expect(done.incidents.log.at(-1)).toMatchObject({ id: 'vb09-getosten', step: null, quality: 'best' });
    expect(done.eventStream.at(-1)?.kind).toBe('v1_incident');
  });

  it('fel svar på ett steg: stegets konsekvens, personalen tar över resten, raketen är slut', () => {
    const s = openNow(wineBarService(), 'vb09-getosten');
    const after = reducer(s, { type: 'ANSWER_INCIDENT', optionId: 'a' });
    expect(after.incidents.active).toBeNull();
    expect(after.incidents.log.at(-1)).toMatchObject({ id: 'vb09-getosten', step: 0, optionId: 'a', quality: 'wrong' });
    const inc = incidentById('vinbar', 'vb09-getosten')!;
    expect(after.incidents.lastOutcome?.text).toContain(inc.steps[0].text.fail.outcome.slice(0, 20));
    expect(after.incidents.lastOutcome?.text).toContain('The staff take over');
    expect(after.cash).toBeLessThan(s.cash);
    // Ingen kredit för ett fel svar, och ingen straffkredit.
    expect(after.knowledgeCredits.episteme).toBe(s.knowledgeCredits.episteme);
  });

  it('personalen tar över färre steg ju längre raketen kom', () => {
    expect(INCIDENTS.staffShareByFailedStep).toHaveLength(3);
    expect(INCIDENTS.staffShareByFailedStep[0]).toBe(1);
    expect(INCIDENTS.staffShareByFailedStep[1]).toBeLessThan(INCIDENTS.staffShareByFailedStep[0]);
    expect(INCIDENTS.staffShareByFailedStep[2]).toBeLessThan(INCIDENTS.staffShareByFailedStep[1]);
  });

  it('utan svar på ett steg beslutar personalen själv: sämre utfall och −1 kredit på stegets axel', () => {
    let s = openNow(wineBarService(), 'vb09-getosten');
    s = reducer(s, { type: 'ANSWER_INCIDENT', optionId: 'c' });
    s = { ...s, knowledgeCredits: { ...s.knowledgeCredits, techne: 3 }, knowledgeTracks: { ...s.knowledgeTracks, techne: { ...s.knowledgeTracks.techne, untagged: 3 } } };
    // Farten 2: en tick är 0,1 s i verkligheten.
    // ORDER 271: först visas det förra svaret i revealSeconds.
    const ticks = Math.ceil((s.incidents.active!.secondsTotal + (s.incidents.active!.revealLeft ?? 0)) / (0.2 / 2));
    const before = tick(s, ticks - 2);
    expect(before.incidents.active?.step).toBe(1);
    const after = tick(before, 3);
    expect(after.incidents.active?.id).not.toBe('vb09-getosten');
    expect(after.incidents.log.find((r) => r.id === 'vb09-getosten')).toMatchObject({ step: 1, optionId: null, quality: 'staff' });
    expect(tracks(after, 'techne')).toBe(tracks(before, 'techne') - INCIDENTS.timeoutCreditPenalty);
  });

  it('medaljer i stegets paviljong ger mer tid på just det steget och stryker ett fel alternativ', () => {
    const plain = reducer(openNow(wineBarService(0, { stensota: 'brons' }), 'vb09-getosten'), { type: 'ANSWER_INCIDENT', optionId: 'c' });
    const silver = reducer(openNow(wineBarService(0, { stensota: 'silver' }), 'vb09-getosten'), { type: 'ANSWER_INCIDENT', optionId: 'c' });
    expect(plain.incidents.active!.step).toBe(1);
    expect(plain.incidents.active!.struck).toEqual([]);
    expect(silver.incidents.active!.secondsTotal).toBe(plain.incidents.active!.secondsTotal + INCIDENTS.extraSecondsPerMedalStep);
    expect(silver.incidents.active!.struck).toHaveLength(1);
    const struck = silver.incidents.active!.struck[0];
    expect(incidentById('vinbar', 'vb09-getosten')!.steps[1].options.find((o) => o.id === struck)?.quality).toBe('wrong');
    // Ett struket alternativ går inte att välja.
    expect(reducer(silver, { type: 'ANSWER_INCIDENT', optionId: struck })).toBe(silver);
    // Episteme-steget har ingen medalj i Måltidsbiblioteket: ingen extra tid.
    const lib = openNow(wineBarService(0, { stensota: 'silver' }), 'vb09-getosten');
    expect(lib.incidents.active!.secondsTotal).toBe(INCIDENTS.stepSeconds.episteme);
    const libBronze = openNow(wineBarService(0, { maltidbiblioteket: 'brons' }), 'vb09-getosten');
    expect(libBronze.incidents.active!.secondsTotal).toBe(INCIDENTS.stepSeconds.episteme + INCIDENTS.extraSecondsPerMedalStep);
  });

  it('ett fel kan utlösa en senare raket samma kväll, och en klarad raket förhindra den', () => {
    const s = openNow(wineBarService(), 'vb03-notallergi');
    const passed = reducer(s, { type: 'ANSWER_INCIDENT', optionId: 'a' });
    const bad = reducer(passed, { type: 'ANSWER_INCIDENT', optionId: 'c' });
    expect(bad.incidents.queued).toContain('vb27-allergireaktion');
    let later = bad;
    for (let i = 0; i < 2000 && later.incidents.active?.id !== 'vb27-allergireaktion' && later.day.period === 'dinner'; i++) {
      if (later.incidents.active) later = answer(later);
      later = reducer(later, TICK);
    }
    expect(later.incidents.active?.id).toBe('vb27-allergireaktion');
    expect(later.incidents.active?.chained).toBe(true);
    // Samma bord som valet gällde.
    expect(later.incidents.active?.context.table).toBe(s.incidents.active!.context.table);

    let good = s;
    for (const id of ['a', 'b', 'd']) good = reducer(good, { type: 'ANSWER_INCIDENT', optionId: id });
    expect(good.incidents.active).toBeNull();
    expect(good.incidents.blocked).toContain('vb27-allergireaktion');
    expect(good.incidents.queued).not.toContain('vb27-allergireaktion');
  });

  it('harnessens svar: den rimliga väljer det bästa i varje steg, den svaga ett fel', () => {
    for (const i of incidentBankFor('vinbar')) {
      for (const s of i.steps) {
        expect(s.options.find((o) => o.id === rankedStepOption(s, 'best'))?.quality).toBe('best');
        expect(s.options.find((o) => o.id === rankedStepOption(s, 'worst'))?.quality).toBe('wrong');
      }
    }
  });
});

describe('ORDER 270 — kvällens lärdom', () => {
  it('förklarar steget där raketen föll', () => {
    let s = openNow(wineBarService(), 'vb12-varmt-rott');
    s = reducer(s, { type: 'ANSWER_INCIDENT', optionId: 'a' });
    for (let i = 0; i < 20000 && s.day.period === 'dinner'; i++) {
      if (s.incidents.active) s = answer(s);
      s = reducer(s, TICK);
    }
    expect(s.day.period).toBe('evening');
    const lesson = s.incidents.lesson!;
    expect(lesson.map((l) => l.incidentId)).toEqual(['vb12-varmt-rott']);
    expect(lesson[0].stepAxis).toBe('episteme');
    expect(lesson[0].question).toBe(incidentById('vinbar', 'vb12-varmt-rott')!.steps[0].text.question);
    expect(lesson[0].chosen).toContain('Room temperature');
    expect(lesson[0].better).toContain('16–18 degrees');
    expect(s.incidents.lessonEvenings).toBe(1);
    const next = tick(reducer(s, { type: 'END_EVENING' }), 5);
    expect(next.day.period).toBe('morning');
    expect(next.incidents.lesson).toBeNull();
  });
});

// Harnessen svarar på händelserna som rimlig och svag spelare (Vision
// Owner 2026-09-26). Provspel 2026-09-27: den svaga spelaren ska gå minus
// över en vecka. Med WRITE_REPORTS=1 skrivs reports/order270/week-players.json:
// vecka 2, vinbaren, brons i tre; veckans resultat enligt slumpmålets
// definition (randomness.ts: kassans förändring utan avräkningens påfyllnad
// och amortering) och händelsernas kassa som andel av en normal veckointäkt.
describe('ORDER 270 — harnessen svarar på händelserna', () => {
  it('den rimliga spelaren går plus och den svaga minus över en vecka', async () => {
    const { playDay } = await import('../../strategic/testHarness/weekHarness');
    const { PLAYERS } = await import('../../strategic/testHarness/randomness');
    const { weakMorning } = await import('../../strategic/testHarness/scenarios');
    const { ECONOMY } = await import('../balance');
    const seeds = process.env.WRITE_REPORTS === '1' ? Array.from({ length: 20 }, (_, i) => i + 1) : [1, 2, 3];
    const rows: { seed: number; player: string; resultSek: number; incidentsWithCash: number; incidentCashShare: number }[] = [];
    for (const seed of seeds) {
      for (const player of ['rimlig', 'svag'] as const) {
        let s = makeNewGameState(seed);
        s = { ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
        const cashStart = s.cash;
        for (let d = 0; d < 6; d++) s = playDay(s, player === 'svag' ? weakMorning() : {}).state;
        const st = s.economy.lastSettlement;
        const resultSek = Math.round(s.cash - cashStart - (st?.topUpSek ?? 0) + (st?.amortisationSek ?? 0));
        // Händelsernas kassa står i kassaboken med händelsens id.
        const lines = s.ledger.filter((l) => l.category === 'scenario' && (l.causeId ?? '').startsWith('vb'));
        rows.push({
          seed, player, resultSek,
          incidentsWithCash: lines.length,
          incidentCashShare: Math.round((lines.reduce((x, l) => x + l.amount, 0) / ECONOMY.normalWeeklyRevenueSek.vinbar) * 1000) / 1000
        });
      }
    }
    const mean = (p: string, k: 'resultSek' | 'incidentCashShare') => rows.filter((r) => r.player === p).reduce((x, r) => x + r[k], 0) / seeds.length;
    if (process.env.WRITE_REPORTS === '1') {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../reports/order270');
      mkdirSync(out, { recursive: true });
      writeFileSync(resolve(out, 'week-players.json'), JSON.stringify({
        definition: 'Vecka 2, vinbaren, brons i Stensöta, Metodköket och Kalastorget. rimlig = bästa svaret och ingen morgon; svag = sämsta svaret, två rätter och råvaror till fyra kuvert (scenarios.ts weakMorning). resultSek = kassans förändring måndag–söndag utan avräkningens påfyllnad och amortering (randomness.ts). incidentCashShare = händelsernas kassa (kassabokens rader med händelsens id) som andel av vinbarens normala veckointäkt.',
        mean: {
          rimlig: { resultSek: mean('rimlig', 'resultSek'), incidentCashShare: mean('rimlig', 'incidentCashShare') },
          svag: { resultSek: mean('svag', 'resultSek'), incidentCashShare: mean('svag', 'incidentCashShare') }
        },
        svagMinusWeeks: rows.filter((r) => r.player === 'svag' && r.resultSek < 0).length,
        weeks: seeds.length,
        rows
      }, null, 2) + '\n');
    }
    expect(mean('rimlig', 'resultSek')).toBeGreaterThan(0);
    expect(mean('svag', 'resultSek')).toBeLessThan(0);
    expect(mean('rimlig', 'incidentCashShare')).toBeGreaterThan(mean('svag', 'incidentCashShare'));
  }, 600000);
});

// Provspel 2026-09-27.
describe('ORDER 270 — tillägg efter provspel 2026-09-27', () => {
  it('rätt svar beror på kvällens läge: isen efter åtta, servetterna före', () => {
    const inc = incidentById('vinbar', 'vb31-servetter-och-isen')!;
    const step = inc.steps[2];
    const q = (sit: string, id: string) => optionQuality(step.options.find((o) => o.id === id)!, sit);
    expect(q('efter-middag', 'd')).toBe('best');
    expect(q('efter-middag', 'b')).toBe('wrong');
    expect(q('middag', 'b')).toBe('best');
    expect(q('middag', 'd')).toBe('wrong');
    // I spelet: klockan avgör läget.
    let s = wineBarService();
    s = tick(s, 700);
    for (let i = 0; i < 4000 && clockMinutes(s) < 20 * 60 + 30; i++) {
      if (s.incidents.active) s = answer(s);
      s = reducer(s, TICK);
    }
    s = openNow(s, 'vb31-servetter-och-isen');
    expect(s.incidents.active?.situation).toBe('efter-middag');
    expect(s.incidents.active?.context.clock.startsWith('20:')).toBe(true);
  });

  it('fel val låser: följden pågår i rummet tills nästa raket, och svaret går inte att ändra', () => {
    // Episteme och techne klarade; phronesis-steget fälls.
    const toPhronesis = (x: SimulationState) => answer(answer(x));
    let s = toPhronesis(openNow(wineBarService(), 'vb31-servetter-och-isen'));
    expect(s.incidents.active?.step).toBe(2);
    s = answer(s, 'worst');
    const o = s.incidents.ongoing!;
    expect(o.incidentId).toBe('vb31-servetter-och-isen');
    expect(o.text.length).toBeGreaterThan(0);
    // Ett nytt svar på samma raket går inte.
    expect(reducer(s, { type: 'ANSWER_INCIDENT', optionId: 'a' })).toBe(s);
    // Kontrafaktiskt: samma kväll med det bästa svaret, samma gäster efter 50 tick.
    const good = tick(answer(toPhronesis(openNow(wineBarService(), 'vb31-servetter-och-isen'))), 50);
    const later = tick(s, 50);
    expect(later.incidents.ongoing?.incidentId).toBe('vb31-servetter-och-isen');
    expect(good.incidents.ongoing).toBeNull();
    const ids = later.guests.filter((g) => good.guests.some((x) => x.id === g.id)).map((g) => g.id);
    const mean = (x: SimulationState) => ids.reduce((acc, id) => acc + x.guests.find((g) => g.id === id)!.satisfaction, 0) / ids.length;
    expect(ids.length).toBeGreaterThan(0);
    expect(mean(later)).toBeLessThan(mean(good));
    // Nästa raket avslutar följden.
    let next = later;
    for (let i = 0; i < 5000 && !next.incidents.active && next.day.period === 'dinner'; i++) next = reducer(next, TICK);
    if (next.incidents.active) expect(next.incidents.ongoing).toBeNull();
  });

  it('inga händelser om ett bord utan gäster', () => {
    const tableIncidents = incidentBankFor('vinbar').filter((i) => i.needsTable);
    expect(tableIncidents.length).toBeGreaterThan(0);
    for (const seed of [1, 2, 3, 4]) {
      let s = makeNewGameState(seed);
      s = { ...s, medals: { stensota: 'brons', metodkoket: 'brons', kalastorget: 'brons' }, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
      s = reducer(s, { type: 'START_SERVICE' });
      for (let i = 0; i < 6000 && s.day.period === 'dinner'; i++) {
        const a = s.incidents.active;
        if (a && a.openedAt === s.simTime && a.step === 0) {
          const inc = incidentById('vinbar', a.id)!;
          if (inc.needsTable) {
            const seatedIds = s.guests.filter((g) => ['seated', 'ordering', 'dining', 'paying'].includes(g.state) && g.seatIndex !== null).map((g) => g.id);
            expect(a.context.guestIds.some((id) => seatedIds.includes(id)), `${a.id} utan gäst vid bordet`).toBe(true);
          }
        }
        if (a) s = answer(s);
        s = reducer(s, TICK);
      }
    }
  });

  it('provet på tid: när tiden går ut räknas svaret som fel; övningen tar inte emot det', async () => {
    const { EXAM } = await import('../balance');
    const { TIMED_OUT } = await import('../../strategic/knowledge/pavilionVisit');
    expect(EXAM.secondsPerQuestion).toBe(30);
    let s = makeNewGameState(3);
    s = reducer(s, { type: 'VISIT_PAVILION', pavilion: 'maltidbiblioteket', mode: 'exam' });
    const exam = reducer(s, { type: 'ANSWER_VISIT', chosenIndex: TIMED_OUT });
    expect(exam.pavilionVisit?.answers.at(-1)).toMatchObject({ chosenIndex: TIMED_OUT, correct: false });
    let p = makeNewGameState(3);
    p = reducer(p, { type: 'VISIT_PAVILION', pavilion: 'maltidbiblioteket', mode: 'practice' });
    expect(reducer(p, { type: 'ANSWER_VISIT', chosenIndex: TIMED_OUT })).toBe(p);
  });

  it('utan verksamhet: dagen slutar av sig själv när schemat är fullt (rutan har bara en knapp)', async () => {
    const { changeClass: change, isStrandedWithoutBusiness } = await import('../economy');
    let s = makeNewGameState(5);
    // ORDER 271 (FRAGOR §50): rutan gäller när kassan är under minsta insats.
    s = { ...change({ ...s, introduction: null }, null as never, true), cash: 0 };
    expect(isStrandedWithoutBusiness(s)).toBe(true);
    const day = s.day.dayNumber;
    for (let i = 0; i < 4 && s.day.dayNumber === day && s.day.period !== 'evening'; i++) {
      s = reducer(s, { type: 'VISIT_PAVILION', pavilion: 'kalastorget', mode: 'practice' });
      const qs = s.pavilionVisit?.questionIds ?? [];
      for (let q = 0; q < qs.length; q++) {
        s = reducer(s, { type: 'ANSWER_VISIT', chosenIndex: 0 });
        s = reducer(s, { type: 'NEXT_VISIT_QUESTION' });
      }
      s = reducer(s, { type: 'CLOSE_VISIT' });
    }
    expect(s.day.period).toBe('evening');
  });

  it('frågebanken och händelsebanken har fältet reference, tomt tills vidare', async () => {
    const { BANK_META } = await import('../../strategic/knowledge/questionBank');
    expect(BANK_META.every((q) => q.reference === null)).toBe(true);
    expect(incidentBankFor('vinbar').every((i) => i.reference === null)).toBe(true);
  });
});

// Verifieringen i spelarens vy av rutan utan verksamhet: den svaga
// spelaren spelar tills verksamheten är borta (vinbar → food truck →
// inget lån). Med WRITE_REPORTS=1 skrivs sparfilen den morgonen, som
// scripts/order270-no-business.mjs laddar på sparplats 1.
describe('ORDER 270 — den svaga spelaren står till slut utan verksamhet', () => {
  it('vinbar → food truck → ingen verksamhet, och rutan visas', async () => {
    const { runWeeks } = await import('../../strategic/testHarness/weekHarness');
    const { weakMorning } = await import('../../strategic/testHarness/scenarios');
    const { isStrandedWithoutBusiness, minimumStakeSek } = await import('../economy');
    const { makeSaveFile } = await import('../save');
    // ORDER 271 (FRAGOR §50): utan verksamhet visas rutan bara när kassan
    // är under minsta insats. Den svaga spelaren får sälja food trucken och
    // har kassa kvar; rutan prövas därför i samma läge med kassan under
    // insatsen (redovisat, inte spelarens eget flöde).
    let noBusiness: SimulationState | null = null;
    const run = runWeeks({
      seed: 11,
      weeks: 4,
      // Som ORDER 268:s svaga spelare: ingen kassa och inga medaljer.
      setup: (s) => ({ ...s, cash: 0 }),
      plan: (s) => {
        if (!noBusiness && s.economy.businessClass === null && s.economy.withoutBusiness && !s.introduction) noBusiness = s;
        return noBusiness ? {} : weakMorning();
      }
    });
    const classes = [...new Set(run.days.map((d) => d.businessClass))];
    expect(classes).toContain('foodtruck');
    expect(noBusiness).not.toBeNull();
    const nb = noBusiness!;
    expect(isStrandedWithoutBusiness(nb)).toBe(nb.cash < minimumStakeSek(nb));
    const stranded: SimulationState = nb.cash < minimumStakeSek(nb) ? nb : { ...nb, cash: 0 };
    expect(isStrandedWithoutBusiness(stranded)).toBe(true);
    if (process.env.WRITE_REPORTS === '1') {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../reports/order270');
      mkdirSync(out, { recursive: true });
      writeFileSync(resolve(out, 'save-utan-verksamhet.json'), JSON.stringify(makeSaveFile(stranded, 'Vinbaren vid torget', 'auto', new Date('2026-09-27T12:00:00Z'))) + '\n');
      writeFileSync(resolve(out, 'vag-till-ingen-verksamhet.json'), JSON.stringify({ seed: 11, classes, strandedDay: stranded.day.dayNumber, cashAtNoBusiness: Math.round(nb.cash), minimumStakeSek: minimumStakeSek(nb), days: run.days.map((d) => ({ day: d.dayNumber, week: d.week, weekday: d.weekday, class: d.businessClass, cash: Math.round(d.cash) })) }, null, 2) + '\n');
    }
  }, 600000);
});

// ORDER 271 — Designs paket 6 (R2/R3) och FRAGOR §49.
describe('ORDER 271 — svaret i stunden och vem som tar över', () => {
  it('ett klarat steg visar svaret i 2,4 s innan nästa stegs tid börjar', () => {
    const s = reducer(openNow(wineBarService(), 'vb09-getosten'), { type: 'ANSWER_INCIDENT', optionId: 'c' });
    const a = s.incidents.active!;
    expect(a.revealed).toMatchObject({ step: 0, optionId: 'c', correctId: 'c', cleared: true });
    expect(a.revealLeft).toBe(INCIDENTS.revealSeconds);
    // Farten 2: en tick är 0,1 s. Under visningen står nedräkningen still.
    const mid = tick(s, 10);
    expect(mid.incidents.active!.secondsLeft).toBe(a.secondsTotal);
    const after = tick(s, Math.ceil(INCIDENTS.revealSeconds / 0.1) + 5);
    expect(after.incidents.active!.revealed).toBeNull();
    expect(after.incidents.active!.secondsLeft).toBeLessThan(a.secondsTotal);
  });

  it('vid fel tar den ordinarie personalen i rollen över en stund', async () => {
    const { takeoverActive } = await import('../incidents');
    const s = openNow(wineBarService(), 'vb09-getosten');
    const after = reducer(s, { type: 'ANSWER_INCIDENT', optionId: 'a' });
    const o = after.incidents.lastOutcome!;
    expect(o.reveal).toMatchObject({ step: 0, optionId: 'a', correctId: 'c', cleared: false });
    expect(o.takeover?.role).toBeDefined();
    expect(takeoverActive(after)).not.toBeNull();
    expect(takeoverActive(tick(after, Math.ceil(INCIDENTS.takeoverSimSeconds / 0.2) + 2))).toBeNull();
  });
});

// ORDER 271 — Vision Owner FRAGOR §50: minsta insats är en fjärdedel av en
// veckas golv (som ORDER 268), och rutan gäller först under den.
describe('ORDER 271 — minsta insats utan verksamhet', () => {
  it('insatsen är en fjärdedel av golvet i den billigaste klassen, och rutan följer kassan', async () => {
    const { changeClass: change, floorSek, isStrandedWithoutBusiness, minimumStakeSek } = await import('../economy');
    const { NO_BUSINESS, UPGRADE } = await import('../balance');
    expect(NO_BUSINESS.minimumStakeShareOfWeekFloor).toBe(UPGRADE.depositShareOfWeekFloor);
    let s = makeNewGameState(5);
    s = change({ ...s, introduction: null }, null as never, true);
    const stake = minimumStakeSek(s);
    expect(stake).toBeGreaterThan(0);
    // Vinbarens krav (brons i tre, varav Stensöta) ger det lägsta golvet här.
    const vinbar = Math.round(floorSek('vinbar', { stensota: 'brons', maltidbiblioteket: 'brons', kalastorget: 'brons' }) * 0.25);
    expect(stake).toBeLessThanOrEqual(vinbar);
    expect(isStrandedWithoutBusiness({ ...s, cash: stake - 1 })).toBe(true);
    expect(isStrandedWithoutBusiness({ ...s, cash: stake })).toBe(false);
    // Med verksamhet gäller rutan aldrig.
    expect(isStrandedWithoutBusiness({ ...wineBarService(), cash: 0 })).toBe(false);
  });
});
