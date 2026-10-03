// ORDER 296 — kärnan (Vision Owner 2026-10-02): "Föreslå talen (startkapital,
// veckomål, mise en place-tid) och kör harness: en rimlig spelare ska klara
// säsongen, en slarvig ska riskera att stänga." ORDER 296b: "Kör harness med
// fem spelare … och rapportera innan talen låses."
//
// Säsongen (åtta veckor) spelas med spelets egna regler från vecka 1:
// vinbaren, brons i tre, startkassan ur balance.ts RISK (KARNAN_START skriver
// över den), veckomålet, omförhandlingen och stängningen som simuleringen
// räknar dem (sim/economy.ts settleWeek, economy.risk). Ingenting räknas vid
// sidan av spelet: kassan styr också det ekonomiska kapitalet, som får gäster
// att vända vid dörren (cashReading.ts economicReadingNormalised).
//
// Spelarna: se PLANS. Morgnarna sparas för mise en place (sim/miseEnPlace.ts,
// samma plan som morgonens skärm) och ryktet.
//
//   WRITE_REPORTS=1 KARNAN_SEEDS=20 [KARNAN_START=25000] [KARNAN_VARIANT='{"RISK":{...}}'] npx vitest run src/strategic/testHarness/__tests__/order296Karnan.test.ts

import { describe, expect, it } from 'vitest';
import { makeNewGameState } from '../../simulation/model';
import { playDay, playMorning, type MorningPlan } from '../weekHarness';
import { weakMorning } from '../scenarios';
import { PLAYERS } from '../randomness';
import { calendarFor, firstDayOfWeek } from '../../../sim/calendar';
import { coverage } from '../../simulation/morningBuy';
import { bookingFor } from '../../simulation/guestTypes';
import type { MedalLevelId, PavilionKey, SimAction, SimulationState } from '../../types';
import { misePlan } from '../../../sim/miseEnPlace';
import { EXAM } from '../../../sim/balance';
import { hashKey } from '../../util/hash';
import { reputationHoldsGuests } from '../../simulation/arrivals';
import { TASTING } from '../../../sim/balance';

type PlayerId = 'mentorn' | 'klok' | 'per' | 'stjarna' | 'rimlig' | 'halva' | 'halvbra' | 'slarvig';
// Den rimliga köper baspaketet bara när lagret inte räcker till bokningen
// (fyller på); mentorn köper det varje morgon och svarar bäst; den halva
// svarar rätt på varannan raket hela vägen; den halvbra svarar alltid fel;
// den slarviga köper för lite och svarar fel (scenarios.ts weakMorning).
const TOP_UP_SHARE = 1.1;
// Den extra handen (kärnan punkt 5): de som planerar tar in den när
// förberedelsen inte hinns (sim/miseEnPlace.ts misePlan, samma som morgonens
// skärm visar); den slarviga gör det aldrig.
const hand = (s: SimulationState) => (misePlan(s).backlogMin > 0 ? [{ type: 'HIRE_PREP_HAND' as const }] : []);
// ORDER 296c — den kloka i butiken: köper det den har råd med i den här
// ordningen (det som ger mest i vinbaren först) och lägger de bästa i facket.
const WISE_SHOP = ['menuStory', 'sommBottle', 'fastPass', 'regulars', 'chefsTable', 'wineTasting', 'leftovers', 'mise', 'lova', 'birthday', 'wineFridge', 'signature', 'allergen', 'critic'];
const wiseShop = (): SimAction[] => [
  ...WISE_SHOP.map((id) => ({ type: 'SHOP_BUY' as const, id })),
  ...WISE_SHOP.map((id) => ({ type: 'SHOP_SLOT' as const, id, on: false })),
  ...WISE_SHOP.map((id) => ({ type: 'SHOP_SLOT' as const, id, on: true }))
];
// Vägen mot stjärnan: silver i två paviljonger (Teatern är låst till dess),
// sedan Teatern brons, silver och guld. Ett prov om morgonen, med
// spelarens kunskap (STAR_SKILL; sex rätt av åtta ger medaljen).
const STAR_PATH: { pavilion: PavilionKey; level: MedalLevelId }[] = [
  { pavilion: 'stensota', level: 'silver' },
  { pavilion: 'metodkoket', level: 'silver' },
  { pavilion: 'gastronomiskateatern', level: 'brons' },
  { pavilion: 'gastronomiskateatern', level: 'silver' },
  { pavilion: 'gastronomiskateatern', level: 'guld' }
];
// Spelarens kunskap: varje fråga rätt med den här sannolikheten (Teatern är
// svårare). Antalet rätt dras ur fröet och dagen, så att proven ibland går
// fel som för en riktig spelare; sex av åtta ger medaljen (balance.ts EXAM).
const STAR_SKILL = { other: Number(process.env.STAR_SKILL ?? 0.65), theatre: Number(process.env.STAR_SKILL_THEATRE ?? 0.55) };
const RANK: Record<string, number> = { brons: 1, silver: 2, guld: 3, platina: 4 };
function correctCount(s: SimulationState, p: number): number {
  let n = 0;
  // Nyckeln börjar med det som skiljer (FNV sprider dåligt när bara slutet gör det).
  for (let i = 0; i < EXAM.questionsDrawn; i++) if (hashKey(s.seed ?? 0, `${i * 7919 + s.day.dayNumber}|exam`) < p) n++;
  return n;
}
function nextStarExam(s: SimulationState): MorningPlan['exams'] {
  const next = STAR_PATH.find((p) => (RANK[s.medals[p.pavilion] ?? ''] ?? 0) < RANK[p.level]);
  if (!next) return [];
  return [{ pavilion: next.pavilion, correct: correctCount(s, next.pavilion === 'gastronomiskateatern' ? STAR_SKILL.theatre : STAR_SKILL.other) }];
}
const PLANS: Record<PlayerId, (s: SimulationState) => MorningPlan> = {
  mentorn: () => ({ actions: hand }),
  // ORDER 296c (Vision Owner 2026-10-02): "en spelare som väljer klokt på
  // nålarna och i butiken, och en som låter Per välja allt". Båda har
  // mentorns morgon; Per-spelaren är densamma som mentorns.
  klok: () => ({ actions: (s) => [...wiseShop(), ...hand(s)], pins: 'wise' }),
  per: () => ({ actions: hand }),
  // ORDER 296d (Vision Owner 2026-10-02): "en spelare som siktar på stjärnan:
  // tar paviljongerna mot guld i Teatern och väljer klokt." Som den kloka,
  // och ett prov om morgonen tills guld i Teatern (STAR_PATH).
  // ORDER 296e: svarar rätt på varje raketsteg med sannolikheten 0,75 ('skill').
  stjarna: (s) => ({ actions: (x) => [...wiseShop(), ...hand(x)], pins: 'wise', exams: nextStarExam(s), scenarioAnswer: 'skill' }),
  rimlig: (s) => ({ stock: coverage(s).covers >= bookingFor(s).total * TOP_UP_SHARE ? 'none' : 'base', actions: hand }),
  // ORDER 296b: varannan raket rätt hela vägen ('half' växlade per steg och
  // klarade nästan ingen raket).
  halva: () => ({ scenarioAnswer: 'halfRocket', actions: hand }),
  halvbra: () => ({ scenarioAnswer: 'worst', actions: hand }),
  slarvig: () => weakMorning()
};

// ORDER 298b — KARNAN_TASTING=1: spelaren köper "Provsmakning på torget" de
// morgnar raden "Lugn kväll" står (arrivals.ts reputationHoldsGuests), som
// morgonens skärm föreslår.
const TASTING_ON = process.env.KARNAN_TASTING === '1';
function withTasting(s: SimulationState, plan: MorningPlan): MorningPlan {
  if (!TASTING_ON || !reputationHoldsGuests(s)) return plan;
  return { ...plan, activities: [...(plan.activities ?? []), TASTING.activityId] };
}

interface Week { week: number; credits: number; resultSek: number; revenueSek: number; rentSek: number; wagesSek: number; cashEnd: number; targetSek: number; targetHit: boolean; renegotiatedNow: boolean; closedNow: boolean }
interface Morning { week: number; weekday: string; needMin: number; capacityMin: number; backlogMin: number; hand: boolean; booked: number; rep: number }

function season(seed: number, player: PlayerId, weeks: number, start: number | null) {
  let s: SimulationState = makeNewGameState(seed);
  s = { ...s, ...(start !== null ? { cash: start } : {}), medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(1) } };
  const startCash = s.cash;
  const out: Week[] = [];
  const mornings: Morning[] = [];
  let weekStartCash = s.cash;
  let lastWeek = -1;
  // ORDER 296d — stjärnan: första veckan den delades ut, veckan med guld i
  // Teatern, och nivån vid varje avräkning.
  let starWeek: number | null = null;
  let goldWeek: number | null = null;
  let tastings = 0;
  const starWeeks: { week: number; held: boolean; reputation: number; judgement: number; stepShare: number; rockets: number }[] = [];
  for (let d = 0; d < weeks * 7; d++) {
    const cal = calendarFor(s.day.dayNumber);
    const plan = withTasting(s, PLANS[player](s));
    if (plan.activities?.includes(TASTING.activityId)) tastings++;
    if (cal.isServiceDay && s.economy.businessClass) {
      const m = playMorning(s, plan);
      const mp = misePlan(m);
      mornings.push({ week: cal.week, weekday: cal.weekday, needMin: mp.needMin, capacityMin: mp.capacityMin, backlogMin: mp.backlogMin, hand: mp.extraHand, booked: mp.booked, rep: s.reputation });
    }
    s = playDay(s, plan).state;
    const st = s.economy.lastSettlement;
    if (st && st.week !== lastWeek) {
      lastWeek = st.week;
      out.push({
        week: st.week,
        credits: s.knowledgeCredits.episteme + s.knowledgeCredits.techne + s.knowledgeCredits.phronesis,
        resultSek: Math.round(s.cash - weekStartCash),
        revenueSek: st.revenueSek,
        rentSek: st.rentSek ?? 0,
        wagesSek: st.wagesSek ?? 0,
        cashEnd: Math.round(s.cash),
        targetSek: st.targetSek ?? 0,
        targetHit: !!st.targetHit,
        renegotiatedNow: !!st.renegotiatedNow,
        closedNow: !!st.closedNow
      });
      weekStartCash = s.cash;
      if (st.star?.earnedNow && starWeek === null) starWeek = st.week;
      if (goldWeek === null && s.medals.gastronomiskateatern === 'guld') goldWeek = st.week;
      starWeeks.push({ week: st.week, held: !!st.star?.held, reputation: +(st.star?.reputation ?? 0).toFixed(3), judgement: +(st.star?.judgement ?? 0).toFixed(2), stepShare: +(st.star?.stepShare ?? 0).toFixed(2), rockets: st.star?.rockets ?? 0 });
      if (st.closedNow) break;
    }
  }
  return { startCash, weeks: out, mornings, closedWeek: s.economy.risk?.closedWeek ?? null, renegotiated: !!s.economy.risk?.renegotiated, owned: s.shop?.owned ?? [], star: !!s.star?.held, starWeek, goldWeek, starWeeks, tastings };
}

describe.skipIf(!process.env.KARNAN_SEEDS)('ORDER 296 — kärnans tal', () => {
  it('säsongen för fem spelare med spelets regler', async () => {
    const seeds = Array.from({ length: Number(process.env.KARNAN_SEEDS ?? 4) }, (_, i) => i + 1);
    const start = process.env.KARNAN_START ? Number(process.env.KARNAN_START) : null;
    const weeks = Number(process.env.KARNAN_WEEKS ?? 8);
    // Prövning av tal i minnet: KARNAN_VARIANT='{"INCIDENTS":{"wrongCashShare":1}}'.
    const balance = await import('../../../sim/balance');
    for (const [k, v] of Object.entries(JSON.parse(process.env.KARNAN_VARIANT ?? '{}') as Record<string, Record<string, unknown>>)) Object.assign((balance as unknown as Record<string, Record<string, unknown>>)[k], v);
    const all: PlayerId[] = ['mentorn', 'klok', 'per', 'stjarna', 'rimlig', 'halva', 'halvbra', 'slarvig'];
    // KARNAN_PLAYERS=halva,rimlig kör bara de spelarna (kalibreringen).
    const players = process.env.KARNAN_PLAYERS ? all.filter((p) => process.env.KARNAN_PLAYERS!.split(',').includes(p)) : all;
    const result: Record<string, unknown> = {};
    for (const p of players) {
      const runs = seeds.map((seed) => ({ seed, ...season(seed, p, weeks, start) }));
      const mean = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length));
      const byWeek = Array.from({ length: weeks }, (_, i) => {
        const ws = runs.map((r) => r.weeks[i]).filter(Boolean);
        return { week: i + 1, n: ws.length, meanResultSek: mean(ws.map((w) => w.resultSek)), meanRevenueSek: mean(ws.map((w) => w.revenueSek)), meanCashEnd: mean(ws.map((w) => w.cashEnd)), meanCredits: mean(ws.map((w) => w.credits)), targetHit: ws.filter((w) => w.targetHit).length, rentSek: ws[0]?.rentSek ?? 0 };
      });
      const allMornings = runs.flatMap((r) => r.mornings);
      const repByWeek = Array.from({ length: weeks }, (_, i) => {
        const ms = allMornings.filter((x) => x.week === i + 1);
        const at = (wd: string) => +(ms.filter((x) => x.weekday === wd).reduce((a, x) => a + x.rep, 0) / Math.max(1, ms.filter((x) => x.weekday === wd).length)).toFixed(3);
        return { week: i + 1, mon: at('mon'), sat: at('sat') };
      });
      // Mise en place per veckodag, ur spelets plan (sim/miseEnPlace.ts).
      const mise = Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((wd) => {
        const r = allMornings.filter((x) => x.weekday === wd);
        return [wd, { meanNeedMin: mean(r.map((x) => x.needMin)), meanCapacityMin: mean(r.map((x) => x.capacityMin)), handShare: Math.round((r.filter((x) => x.hand).length / Math.max(1, r.length)) * 100) / 100, meanBacklogMin: mean(r.map((x) => x.backlogMin)) }];
      }));
      result[p] = {
        closed: runs.filter((r) => r.closedWeek !== null).length,
        closedWeeks: runs.map((r) => r.closedWeek).filter((w): w is number => w !== null),
        renegotiated: runs.filter((r) => r.renegotiated).length,
        lowestCash: Math.min(...runs.flatMap((r) => r.weeks.map((w) => w.cashEnd))),
        meanCashEnd: mean(runs.map((r) => r.weeks[r.weeks.length - 1]?.cashEnd ?? r.startCash)),
        targetHitShare: Math.round((runs.flatMap((r) => r.weeks).filter((w) => w.targetHit).length / Math.max(1, runs.flatMap((r) => r.weeks).length)) * 100) / 100,
        meanTastings: Math.round((runs.reduce((a, r) => a + r.tastings, 0) / runs.length) * 10) / 10,
        meanOwned: Math.round((runs.reduce((a, r) => a + r.owned.length, 0) / runs.length) * 10) / 10,
        stars: runs.filter((r) => r.star).length,
        starEarned: runs.filter((r) => r.starWeek !== null).length,
        starWeeks: runs.map((r) => r.starWeek).filter((w): w is number => w !== null),
        goldWeeks: runs.map((r) => r.goldWeek),
        meanRepAtSettlement: Array.from({ length: weeks }, (_, i) => { const xs = runs.map((r) => r.starWeeks[i]?.reputation).filter((x): x is number => x !== undefined); return +(xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)).toFixed(3); }),
        meanJudgement: Array.from({ length: weeks }, (_, i) => { const xs = runs.map((r) => r.starWeeks[i]?.judgement).filter((x): x is number => x !== undefined); return +(xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)).toFixed(2); }),
        byWeek, repByWeek, mise, runs
      };
    }
    if (process.env.WRITE_REPORTS === '1') {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports', process.env.REPORT_ORDER ?? 'order296');
      mkdirSync(out, { recursive: true });
      writeFileSync(resolve(out, process.env.KARNAN_OUT ?? 'karnan.json'), JSON.stringify({ tasting: TASTING_ON, definition: 'Säsongen med spelets regler (balance.ts RISK): startkassan, veckomålet på intäkten, omförhandlingen och stängningen räknas av simuleringen (sim/economy.ts settleWeek). resultSek = kassans förändring vecka till vecka. Mise en place ur sim/miseEnPlace.ts misePlan (behov, hinns, eftersläp i spelminuter, och den extra handen).', start, variant: process.env.KARNAN_VARIANT ?? null, seeds, weeks, players: result }, null, 2) + '\n');
    }
    expect(Object.keys(result).length).toBe(players.length);
  }, 3600000);
});
