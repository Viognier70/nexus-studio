// ORDER 270 — händelserna i servicen (Vision Owner 2026-09-26, efter
// provspelet): action-knappen bort, servicen som en följd av händelser,
// kvällens lärdom i stället för quizen.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { changeClass } from '../economy';
import { firstDayOfWeek, calendarFor } from '../calendar';
import { INCIDENTS } from '../balance';
import { incidentBankFor, incidentById, validateIncidentBank } from '../incidentBank';
import { arcFor, formatIncidentText, incidentsTonight, rankedIncidentOption } from '../incidents';
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

// Öppna en bestämd händelse nu (samma väg som en kedjad händelse).
function openNow(s: SimulationState, id: string): SimulationState {
  s = { ...s, incidents: { ...s.incidents, slots: [{ at: s.simTime, phase: 'rush' }, ...s.incidents.slots], queued: [id] } };
  if (!s.day.doorsOpenedThisService) s = tick(s, 700);
  for (let i = 0; i < 2000 && s.incidents.active?.id !== id; i++) {
    if (s.incidents.active) s = reducer(s, { type: 'ANSWER_INCIDENT', optionId: incidentById('vinbar', s.incidents.active.id)!.options[0].id });
    s = reducer(s, TICK);
  }
  expect(s.incidents.active?.id).toBe(id);
  return s;
}

describe('ORDER 270 — händelsebanken', () => {
  const bank = incidentBankFor('vinbar');

  it('30 händelser för vinbaren, som data, utan fel', () => {
    expect(bank).toHaveLength(30);
    expect(validateIncidentBank(vinbarMeta as never, vinbarText as never)).toEqual([]);
  });

  it('varje händelse har paviljong, axel, 3–4 svar, ett bästa och minst ett fel', () => {
    for (const i of bank) {
      expect(i.options.length).toBeGreaterThanOrEqual(INCIDENTS.optionsMin);
      expect(i.options.length).toBeLessThanOrEqual(INCIDENTS.optionsMax);
      expect(i.options.filter((o) => o.quality === 'best')).toHaveLength(1);
      expect(i.options.some((o) => o.quality === 'wrong')).toBe(true);
      expect(['episteme', 'techne', 'phronesis']).toContain(i.axis);
    }
  });

  it('bågen och kedjorna finns i banken', () => {
    const arcs = new Set(bank.map((i) => i.arc));
    expect([...arcs].sort()).toEqual(['closing', 'crisis', 'opening', 'rush']);
    const outcomes = bank.flatMap((i) => [...i.options, i.staff]);
    expect(outcomes.some((o) => (o.triggers ?? []).length > 0)).toBe(true);
    expect(outcomes.some((o) => (o.prevents ?? []).length > 0)).toBe(true);
    expect(bank.some((i) => i.chainOnly)).toBe(true);
  });

  it('scenarierna vid dörren har flyttat in som händelser', () => {
    for (const id of ['vb08-sallskap-pa-fem', 'vb13-delegationen', 'vb15-fisken']) expect(incidentById('vinbar', id)).toBeDefined();
  });

  it('platshållarna fylls ur kvällens sammanhang', () => {
    const t = formatIncidentText('{gäst} vid bord {bord} vill ha {vin}. {personal} hämtar.', { table: 4, guestIds: [], guest: 'ett par', wine: 'Barolo', staff: 'servitören' });
    expect(t).toBe('Ett par vid bord 4 vill ha Barolo. Servitören hämtar.');
  });
});

describe('ORDER 270 — kvällens båge', () => {
  it('3–6 per kväll, fler fredag och lördag', () => {
    const mon = firstDayOfWeek(2);
    const counts = Array.from({ length: 6 }, (_, i) => incidentsTonight(mon + i));
    expect(calendarFor(mon).weekday).toBe('mon');
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(INCIDENTS.minPerEvening);
    expect(Math.max(...counts)).toBeLessThanOrEqual(INCIDENTS.maxPerEvening);
    expect(counts[4]).toBeGreaterThan(counts[0]);
    expect(counts[5]).toBeGreaterThan(counts[0]);
  });

  it('öppning först, kris näst sist, avslut sist', () => {
    expect(arcFor(3)).toEqual(['opening', 'crisis', 'closing']);
    expect(arcFor(6)).toEqual(['opening', 'rush', 'rush', 'rush', 'crisis', 'closing']);
  });

  it('vinbarens service planerar händelser och inga scenarier vid dörren', () => {
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

describe('ORDER 270 — en händelse', () => {
  it('rummet står stilla medan händelsen är öppen', () => {
    const s = openNow(wineBarService(), 'vb09-getosten');
    const later = tick(s, 20);
    expect(later.simTime).toBe(s.simTime);
    expect(later.incidents.active!.secondsLeft).toBeLessThan(s.incidents.active!.secondsLeft);
  });

  it('det bästa svaret ger en kredit på axeln och syns i kassan och rummet', () => {
    const s = openNow(wineBarService(), 'vb09-getosten');
    const after = reducer(s, { type: 'ANSWER_INCIDENT', optionId: 'a' });
    expect(after.incidents.active).toBeNull();
    expect(after.knowledgeCredits.techne - s.knowledgeCredits.techne).toBe(INCIDENTS.bestAnswerCredit);
    expect(after.knowledgeTracks.techne.sommellerie - s.knowledgeTracks.techne.sommellerie).toBe(INCIDENTS.bestAnswerCredit);
    expect(after.cash).toBeGreaterThan(s.cash);
    expect(after.incidents.lastOutcome?.text).toContain('Gästen smakar');
    expect(after.eventStream.at(-1)?.kind).toBe('v1_incident');
  });

  it('utan svar beslutar personalen själv efter 20 s: sämre utfall och −1 kredit', () => {
    let s = openNow(wineBarService(), 'vb09-getosten');
    s = { ...s, knowledgeCredits: { ...s.knowledgeCredits, techne: 3 }, knowledgeTracks: { ...s.knowledgeTracks, techne: { ...s.knowledgeTracks.techne, untagged: 3 } } };
    // Farten 2: en tick är 0,1 s i verkligheten.
    const ticks = Math.ceil(INCIDENTS.countdownSeconds / (0.2 / 2));
    const before = tick(s, ticks - 2);
    expect(before.incidents.active).not.toBeNull();
    const after = tick(before, 3);
    expect(after.incidents.active).toBeNull();
    expect(after.incidents.log.at(-1)).toMatchObject({ id: 'vb09-getosten', optionId: null, quality: 'staff' });
    expect(after.knowledgeCredits.techne).toBe(3 - INCIDENTS.timeoutCreditPenalty);
  });

  it('medaljer i paviljongen ger mer tid och stryker ett fel alternativ', () => {
    const plain = openNow(wineBarService(0, { stensota: 'brons' }), 'vb09-getosten');
    const silver = openNow(wineBarService(0, { stensota: 'silver' }), 'vb09-getosten');
    expect(plain.incidents.active!.secondsTotal).toBe(INCIDENTS.countdownSeconds + INCIDENTS.extraSecondsPerMedalStep);
    expect(plain.incidents.active!.struck).toEqual([]);
    expect(silver.incidents.active!.secondsTotal).toBeGreaterThan(plain.incidents.active!.secondsTotal);
    expect(silver.incidents.active!.struck).toHaveLength(1);
    const struck = silver.incidents.active!.struck[0];
    expect(incidentById('vinbar', 'vb09-getosten')!.options.find((o) => o.id === struck)?.quality).toBe('wrong');
    // Ett struket alternativ går inte att välja.
    expect(reducer(silver, { type: 'ANSWER_INCIDENT', optionId: struck })).toBe(silver);
  });

  it('ett val kan utlösa en senare händelse samma kväll, och ett annat förhindra den', () => {
    const s = openNow(wineBarService(), 'vb03-notallergi');
    const bad = reducer(s, { type: 'ANSWER_INCIDENT', optionId: 'b' });
    expect(bad.incidents.queued).toContain('vb27-allergireaktion');
    const later = tick(bad, INCIDENTS.chainDelaySimSeconds * 5 + 5);
    expect(later.incidents.active?.id).toBe('vb27-allergireaktion');
    expect(later.incidents.active?.chained).toBe(true);

    const good = reducer(s, { type: 'ANSWER_INCIDENT', optionId: 'a' });
    expect(good.incidents.blocked).toContain('vb27-allergireaktion');
    expect(good.incidents.queued).not.toContain('vb27-allergireaktion');
  });

  it('harnessens svar: den rimliga väljer det bästa, den svaga ett fel', () => {
    for (const i of incidentBankFor('vinbar')) {
      expect(i.options.find((o) => o.id === rankedIncidentOption(i, 'best'))?.quality).toBe('best');
      expect(i.options.find((o) => o.id === rankedIncidentOption(i, 'worst'))?.quality).toBe('wrong');
    }
  });
});

describe('ORDER 270 — kvällens lärdom', () => {
  it('förklarar de fel beslut spelaren tog', () => {
    let s = openNow(wineBarService(), 'vb12-varmt-rott');
    s = reducer(s, { type: 'ANSWER_INCIDENT', optionId: 'b' });
    for (let i = 0; i < 20000 && s.day.period === 'dinner'; i++) {
      if (s.incidents.active) {
        const inc = incidentById('vinbar', s.incidents.active.id)!;
        s = reducer(s, { type: 'ANSWER_INCIDENT', optionId: rankedIncidentOption(inc, 'best', s.incidents.active.struck) });
      }
      s = reducer(s, TICK);
    }
    expect(s.day.period).toBe('evening');
    const lesson = s.incidents.lesson!;
    expect(lesson.map((l) => l.incidentId)).toEqual(['vb12-varmt-rott']);
    expect(lesson[0].chosen).toContain('rumstemperatur');
    expect(lesson[0].better).toContain('svalare flaska');
    expect(s.incidents.lessonEvenings).toBe(1);
    const next = tick(reducer(s, { type: 'END_EVENING' }), 5);
    expect(next.day.period).toBe('morning');
    expect(next.incidents.lesson).toBeNull();
  });
});

// Harnessen svarar på händelserna som rimlig och svag spelare (Vision
// Owner 2026-09-26). Med WRITE_REPORTS=1 skrivs reports/order270/
// incident-cash.json: veckans händelsekassa som andel av klassens
// normala veckointäkt, vecka 2, vinbaren, brons i tre.
describe('ORDER 270 — harnessen svarar på händelserna', () => {
  it('den rimliga spelaren får mer ur veckans händelser än den svaga', async () => {
    const { playDay } = await import('../../strategic/testHarness/weekHarness');
    const { PLAYERS } = await import('../../strategic/testHarness/randomness');
    const { ECONOMY } = await import('../balance');
    const seeds = process.env.WRITE_REPORTS === '1' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [1, 2];
    const rows: { seed: number; player: string; incidentsWithCash: number; cashShare: number }[] = [];
    for (const seed of seeds) {
      for (const player of ['rimlig', 'svag'] as const) {
        let s = makeNewGameState(seed);
        s = { ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
        for (let d = 0; d < 6; d++) {
          const r = playDay(s, player === 'svag' ? { scenarioAnswer: 'worst' } : {});
          s = r.state;
        }
        // Händelsernas kassa står i kassaboken med händelsens id (veckans
        // summa i economy nollställs av söndagens avräkning).
        const lines = s.ledger.filter((l) => l.category === 'scenario' && (l.causeId ?? '').startsWith('vb'));
        const incidentsWithCash = lines.length;
        const cashShare = lines.reduce((a, l) => a + l.amount, 0) / ECONOMY.normalWeeklyRevenueSek.vinbar;
        rows.push({ seed, player, incidentsWithCash, cashShare: Math.round(cashShare * 1000) / 1000 });
      }
    }
    const mean = (p: string) => rows.filter((r) => r.player === p).reduce((a, r) => a + r.cashShare, 0) / seeds.length;
    expect(mean('rimlig')).toBeGreaterThan(mean('svag'));
    expect(Math.abs(mean('rimlig'))).toBeLessThanOrEqual(0.2 + 1e-9);
    if (process.env.WRITE_REPORTS === '1') {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../reports/order270');
      mkdirSync(out, { recursive: true });
      writeFileSync(resolve(out, 'incident-cash.json'), JSON.stringify({
        definition: 'Vecka 2, vinbaren, brons i Stensöta, Metodköket och Kalastorget. Kassan från kvällarnas händelser (kassabokens rader med händelsens id, måndag–lördag) som andel av vinbarens normala veckointäkt. rimlig = bästa svaret, svag = sämsta svaret och tunn meny.',
        meanShare: { rimlig: mean('rimlig'), svag: mean('svag') },
        rows
      }, null, 2) + '\n');
    }
  }, 600000);
});
