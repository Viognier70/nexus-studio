// ORDER 306b A10 (SITUATIONER_306b.md Del A) — harnessen: hur ofta spelartyperna stannar i kvitt eller
// dubbelt och vad det gör med kassan; gissaren (det längsta alternativet) mot slumpen, testet för A4;
// följderna av fel i steg 2. A4 — svarens längd: högst 12 ord i steg 1–2 och 15 i steg 3, och i steg 3
// högst 1,5 gånger det kortaste. Testet rapporterar och fäller inte.
//
//   SEEDS=20 WRITE_REPORTS=1 npx vitest run src/strategic/testHarness/__tests__/order306bSpelartyper.test.ts
// skriver reports/order306b/spelartyper.json och reports/order306b/langd.json.

import { describe, expect, it } from 'vitest';
import { playDay, setKvittStopAfter, type ScenarioAnswer } from '../weekHarness';
import { makeNewGameState } from '../../simulation/model';
import { firstDayOfWeek } from '../../../sim/calendar';
import { PLAYERS } from '../randomness';
import { incidentBankFor } from '../../../sim/incidentBank';
import type { IncidentRecord } from '../../../sim/incidents';
import vinbarMeta from '../../../content/incidents/vinbar.meta.json';
import sv from '../../../content/incidents/vinbar.text.sv.draft.json';
import en from '../../../content/incidents/vinbar.text.en.json';
import type { SimulationState } from '../../types';

const TYPES: { player: string; answer: ScenarioAnswer }[] = [
  { player: 'rimlig', answer: 'best' }, { player: 'svag', answer: 'worst' }, { player: 'gissaren', answer: 'guess' },
  { player: 'slumpen', answer: 'random' }, { player: 'ignorerar', answer: 'ignore' }
];
// Kvitt eller dubbelt: gå alltid vidare (0), stanna efter steg 1 eller efter steg 2.
const STOPS = [0, 1, 2];
const TRIAD = new Set(incidentBankFor('vinbar').filter((i) => i.form === 'triad').map((i) => i.id));

function week(seed: number, answer: ScenarioAnswer, stopAfter: number, days: number) {
  setKvittStopAfter(stopAfter);
  let s: SimulationState = makeNewGameState(seed);
  s = { ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
  const cashStart = s.cash;
  const log: IncidentRecord[] = [];
  let tonight: IncidentRecord[] = [];
  for (let d = 0; d < days; d++) {
    s = playDay(s, { scenarioAnswer: answer, onTick: (x) => { tonight = x.incidents?.log ?? tonight; return x; } }).state;
    log.push(...tonight);
    tonight = [];
  }
  setKvittStopAfter(0);
  const st = s.economy.lastSettlement;
  return { log, resultSek: Math.round(s.cash - cashStart - (st?.topUpSek ?? 0) + (st?.amortisationSek ?? 0)) };
}

const share = (n: number, d: number) => +(n / Math.max(1, d)).toFixed(3);

function summary(log: IncidentRecord[]) {
  const t = log.filter((r) => TRIAD.has(r.id));
  return {
    situations: log.length, stopped: share(log.filter((r) => r.quality === 'stopped').length, log.length),
    triad: {
      n: t.length,
      fullGrip: share(t.filter((r) => r.step === null && r.quality === 'best').length, t.length),
      halfGrip: share(t.filter((r) => r.step === null && r.quality === 'ok').length, t.length),
      wrongLastStep: share(t.filter((r) => r.step === 2 && r.quality === 'wrong').length, t.length),
      staff: share(t.filter((r) => r.quality === 'staff').length, t.length),
      stopped: share(t.filter((r) => r.quality === 'stopped').length, t.length),
      missedOnTheWay: share(t.filter((r) => (r.missed?.length ?? 0) > 0).length, t.length)
    },
    credits: log.reduce((n, r) => n + (r.deltas?.credits ?? 0), 0),
    incidentCashSek: Math.round(log.reduce((n, r) => n + (r.deltas?.cashSek ?? 0), 0))
  };
}

type Texts = { texts: Record<string, { steps: { options: Record<string, { label: string }> }[] }> };
const words = (x: string) => x.trim().split(/\s+/).length;

function lengths(texts: Texts) {
  const rows: { id: string; step: number; maxWords: number; minWords: number; ratio: number; overWords: boolean; overRatio: boolean }[] = [];
  for (const id of TRIAD) {
    texts.texts[id].steps.forEach((st, k) => {
      // Ordningskortens bedömningar (full, analysis, …) är inga svar spelaren läser.
      if ('full' in st.options) return;
      const w = Object.values(st.options).map((o) => words(o.label));
      if (!w.length) return;
      const max = Math.max(...w), min = Math.min(...w);
      rows.push({ id, step: k + 1, maxWords: max, minWords: min, ratio: +(max / min).toFixed(2), overWords: max > (k < 2 ? 12 : 15), overRatio: k === 2 && max / min > 1.5 });
    });
  }
  return rows;
}

// A4 — hur ofta det längsta svaret (i tecken) är det bästa, mot vad slumpen ger (andelen bästa svar i steget).
function longestIsBest(texts: Texts) {
  let steps = 0, hits = 0, expected = 0;
  for (const inc of incidentBankFor('vinbar').filter((i) => i.form === 'triad')) {
    inc.steps.forEach((st, k) => {
      if (st.form === 'sequence') return;
      const label = (id: string) => texts.texts[inc.id].steps[k].options[id].label.length;
      const longest = [...st.options].sort((a, b) => label(b.id) - label(a.id))[0];
      steps++;
      if (longest.quality === 'best') hits++;
      expected += st.options.filter((o) => o.quality === 'best').length / st.options.length;
    });
  }
  return { steps, hits, randomExpectation: +expected.toFixed(1) };
}

describe('ORDER 306b A10 — spelartyperna och A4:s längder', () => {
  it('gissaren och slumpen svarar på situationerna, också på ordningskorten', () => {
    const g = week(1, 'guess', 0, 1);
    const r = week(1, 'random', 0, 1);
    expect(g.log.length).toBeGreaterThan(0);
    expect(r.log.length).toBeGreaterThan(0);
    expect(g.log.some((x) => x.quality !== 'staff')).toBe(true);
  }, 600000);

  it('rapporten', async () => {
    const sl = lengths(sv as unknown as Texts), el = lengths(en as unknown as Texts);
    expect(sl.length).toBeGreaterThan(0);
    if (!process.env.WRITE_REPORTS) return;
    const { mkdirSync, writeFileSync } = await import('node:fs');
    const { dirname, resolve } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order306b');
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'langd.json'), JSON.stringify({
      definition: 'A4: svarens längd i ord (mellanslag) i de elva situationerna. overWords: fler än 12 ord i steg 1–2 eller 15 i steg 3; overRatio: i steg 3 längsta / kortaste över 1,5. longestIsBest: steg (utom ordningskorten) där det längsta svaret i tecken är det bästa, mot slumpens väntevärde. sv: Anders text (vinbar.text.sv.draft.json); en: översättningen (vinbar.text.en.json).',
      longestIsBest: { sv: longestIsBest(sv as unknown as Texts), en: longestIsBest(en as unknown as Texts) },
      sv: { over: sl.filter((r) => r.overWords || r.overRatio), rows: sl }, en: { over: el.filter((r) => r.overWords || r.overRatio), rows: el }
    }, null, 2) + '\n');
    // SEEDS=0 skriver bara längderna.
    const seeds = Number(process.env.SEEDS ?? 2);
    if (seeds === 0) return;
    const days = Number(process.env.DAYS ?? 6);
    const rows: { player: string; stopAfter: number; seed: number; resultSek: number; summary: ReturnType<typeof summary> }[] = [];
    for (const { player, answer } of TYPES) for (const stopAfter of STOPS) for (let seed = 1; seed <= seeds; seed++) {
      const w = week(seed, answer, stopAfter, days);
      rows.push({ player, stopAfter, seed, resultSek: w.resultSek, summary: summary(w.log) });
    }
    const mean = (xs: number[]) => +(xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)).toFixed(3);
    const table = TYPES.flatMap(({ player }) => STOPS.map((stopAfter) => {
      const rs = rows.filter((r) => r.player === player && r.stopAfter === stopAfter);
      return {
        player, stopAfter, weeks: rs.length,
        resultSek: Math.round(mean(rs.map((r) => r.resultSek))),
        stoppedShare: mean(rs.map((r) => r.summary.stopped)),
        credits: mean(rs.map((r) => r.summary.credits)),
        incidentCashSek: Math.round(mean(rs.map((r) => r.summary.incidentCashSek))),
        triad: {
          fullGrip: mean(rs.map((r) => r.summary.triad.fullGrip)), halfGrip: mean(rs.map((r) => r.summary.triad.halfGrip)),
          wrongLastStep: mean(rs.map((r) => r.summary.triad.wrongLastStep)), staff: mean(rs.map((r) => r.summary.triad.staff)),
          stopped: mean(rs.map((r) => r.summary.triad.stopped)), missedOnTheWay: mean(rs.map((r) => r.summary.triad.missedOnTheWay))
        }
      };
    }));
    // Fel i steg 2 (phronesis i formen) ska i första hand ge stämningen och ryktet, mindre kassan.
    const step2 = (vinbarMeta as { incidents: { id: string; form?: string; steps: { fail: { effects: Record<string, number> } }[] }[] }).incidents
      .filter((i) => i.form === 'triad').map((i) => ({ id: i.id, ...i.steps[1].fail.effects }));
    writeFileSync(resolve(dir, 'spelartyper.json'), JSON.stringify({
      definition: 'Vinbaren, vecka 2 (DAYS dagar), medaljerna PLAYERS.baseline, frö 1..SEEDS, texterna på engelska (spelets förval; gissaren mäter längden i tecken). Spelartyperna: rimlig (bästa svaret), svag (sämsta), gissaren (det längsta alternativet; ordningskorten fyra på måfå), slumpen (ett alternativ på måfå; ordningskorten fyra på måfå), ignorerar (svarar inte). stopAfter: kvitt eller dubbelt, stanna efter n klarade steg (0 = gå alltid vidare; weekHarness setKvittStopAfter). resultSek: kassans förändring utan avräkningens påfyllnad och amortering (som order270 week-players). stoppedShare: andel situationer som slutade med att spelaren stannade. triad: de elva situationerna i formen analys → upplevelse → handling (fullGrip/halfGrip: klarade med helt/halvt grepp; wrongLastStep: fel i steg 3; staff: tiden ute; missedOnTheWay: fel i steg 1 eller 2). credits och incidentCashSek: loggens deltas. step2FailEffects: följden av fel i steg 2 (meta, i scenarioenheter).',
      seeds, days, table, step2FailEffects: step2, rows
    }, null, 2) + '\n');
  }, 7200000);
});
