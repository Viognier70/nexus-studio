// ORDER 285 — kvällens resultat (Vision Owner 2026-09-29, tredje
// provspelet): "Efter kvällen visas tydligt vad man vann och förlorade:
// pengar, krediter, rykte, kunskap, erfarenhet, samt social, ekonomisk och
// ekologisk hållbarhet."
//
// Varje rad läser samma källa som resten av kvällen:
// - pengar: kassans förändring sedan dygnets gryning (day.cashAtDayStart),
//   med morgonens inköp; intäkten ur kvällsavräkningen;
// - krediter och rykte: kvällsavräkningen (eveningAccount.ts metrics);
// - kunskap: kvällens raketsteg, samma rutnät som lärdomen (serviceView.ts
//   eveningGrid, stepsCleared);
// - erfarenhet: serverade rätter (day.portionsServed) och raketer (loggen);
// - social och ekologisk: kapitalen mot dygnets gryning
//   (day.capitalsAtDayStart);
// - ekonomisk: kvällens marginal, resultatet mot intäkten.
// ORDER 287a — de tre hållbarheterna har också sin nivå 0–10 och förra
// kvällens nivå (state.sustainabilityLevels), som skärmen visar som prickar.

import type { SimulationState } from '../types';
import { eveningGrid, stepsCleared } from '../ui/service/serviceView';
import { incidentsOf } from '../../sim/incidents';
import { incidentById } from '../../sim/incidentBank';
import { INCIDENTS } from '../../sim/balance';

export type ResultKey = 'money' | 'credits' | 'reputation' | 'knowledge' | 'experience' | 'social' | 'economic' | 'ecological';
export type Tone = 'won' | 'lost' | 'even';

export interface ResultRow {
  key: ResultKey;
  tone: Tone;
  // Förändringen i radens egen enhet: kronor, krediter, poäng (0–100),
  // steg, rätter, eller marginal som andel.
  delta: number;
  // Underlag till radens förklaring.
  detail: Record<string, number>;
  // ORDER 287a — hållbarheterna som nivåer 0–10 och förra kvällens nivå
  // (sim/sustainabilityLevels.ts; null före första kvällen).
  level?: number;
  previousLevel?: number | null;
}

// Kapital och rykte står i 0–1 och visas som poäng av 100.
export const POINTS = 100;

function tone(delta: number): Tone {
  if (delta > 0) return 'won';
  if (delta < 0) return 'lost';
  return 'even';
}

export function eveningResult(state: SimulationState): ResultRow[] {
  const m = state.eveningAccount?.metrics;
  const revenue = m?.revenue ?? 0;
  const cost = m?.cost ?? 0;
  // Pengar: kassans förändring sedan gryningen (inköp, löner, händelser,
  // sopbilen); saknas startvärdet, kvällsavräkningens resultat.
  const cashStart = state.day.cashAtDayStart;
  const result = cashStart !== null && cashStart !== undefined ? state.cash - cashStart : m?.result ?? revenue - cost;
  const kd = m?.knowledgeDelta ?? { episteme: 0, techne: 0, phronesis: 0 };
  const credits = kd.episteme + kd.techne + kd.phronesis;
  const reputation = Math.round((m?.reputationDelta ?? 0) * POINTS * 10) / 10;
  const { cleared, total } = stepsCleared(eveningGrid(state));
  const served = state.day.portionsServed ?? 0;
  const rockets = incidentsOf(state).log.length;
  const start = state.day.capitalsAtDayStart;
  const social = start ? Math.round((state.capitals.values.social - start.social) * POINTS * 10) / 10 : 0;
  const ecological = start ? Math.round((state.capitals.values.ecological - start.ecological) * POINTS * 10) / 10 : 0;
  const margin = revenue > 0 ? result / revenue : 0;
  const wasteKg = state.lastWaste && state.lastWaste.dayNumber === state.day.dayNumber ? state.lastWaste.kg ?? 0 : 0;
  // ORDER 287a — nivåerna 0–10, satta när servicen stängde. Riktningen är
  // nivån mot förra kvällens; utan förra kvällen, förändringen i poäng.
  const lv = state.sustainabilityLevels && state.sustainabilityLevels.dayNumber === state.day.dayNumber ? state.sustainabilityLevels : null;
  const levelOf = (k: 'social' | 'economic' | 'ecological', fallback: Tone) => lv
    ? { level: lv.levels[k], previousLevel: lv.previous ? lv.previous[k] : null, tone: lv.previous ? tone(lv.levels[k] - lv.previous[k]) : fallback }
    : { tone: fallback };
  return [
    { key: 'money', tone: tone(Math.round(result)), delta: Math.round(result), detail: { revenue: Math.round(revenue), cost: Math.round(revenue - result) } },
    { key: 'credits', tone: tone(credits), delta: credits, detail: {} },
    { key: 'reputation', tone: tone(reputation), delta: reputation, detail: {} },
    // Kunskap: fler steg rätt än fel är en vinst.
    { key: 'knowledge', tone: total === 0 ? 'even' : cleared * 2 >= total ? 'won' : 'lost', delta: cleared, detail: { cleared, total } },
    { key: 'experience', tone: served + rockets > 0 ? 'won' : 'even', delta: served + rockets, detail: { served, rockets } },
    { key: 'social', delta: social, detail: {}, ...levelOf('social', tone(social)) },
    { key: 'economic', delta: margin, detail: { margin }, ...levelOf('economic', tone(Math.round(result))) },
    { key: 'ecological', delta: ecological, detail: { kg: wasteKg }, ...levelOf('ecological', tone(ecological)) }
  ];
}

// ORDER 285 — kvällens händelser i tidsordning (Vision Owner 2026-09-29,
// villkor för Designs leverans: "en händelselogg per kväll (klockslag,
// händelse, klarade steg, förändring per resurs)"). Raketerna ur loggen med
// det de ändrade (IncidentRecord.deltas, samma tal som utfallet), slumpens
// händelser ur strömmen, och sopbilen.
export type EveningEventKind = 'rocket' | 'chance' | 'truck';
export interface EveningEvent {
  kind: EveningEventKind;
  at: number;
  // Klockslaget: raketens context.clock, händelsens clock, sopbilens tid.
  clock: string | null;
  id: string;
  title: string;
  // Raketer: klarade steg av stegen.
  steps?: { cleared: number; total: number };
  // Förändringen per resurs: kronor, krediter, rykte (poäng av 100),
  // gäster in, kilo till sopbilen.
  cashSek?: number;
  credits?: number;
  reputation?: number;
  guestsIn?: number;
  kg?: number;
}

export function eveningEvents(state: SimulationState): EveningEvent[] {
  const cls = state.economy.businessClass;
  const out: EveningEvent[] = [];
  for (const rec of incidentsOf(state).log) {
    const inc = cls ? incidentById(cls, rec.id) : undefined;
    const total = inc?.steps.length ?? INCIDENTS.stepAxes.length;
    const d = rec.deltas;
    out.push({
      kind: 'rocket', at: rec.at, clock: rec.context.clock, id: rec.id, title: inc?.text.title ?? rec.id,
      steps: { cleared: rec.step === null ? total : rec.step, total },
      cashSek: d ? Math.round(d.cashSek) : undefined,
      credits: d?.credits,
      reputation: d ? Math.round(d.reputation * POINTS * 10) / 10 : undefined,
      guestsIn: d?.guestsIn
    });
  }
  const start = state.day.periodStartAt;
  for (const e of state.eventStream) {
    if (!e.kind?.startsWith('chance_') || e.at < (state.day.doorsOpenAt ?? start)) continue;
    out.push({ kind: 'chance', at: e.at, clock: e.clock ?? null, id: e.kind, title: e.text, cashSek: e.chanceSek });
  }
  const w = state.lastWaste;
  if (w && w.dayNumber === state.day.dayNumber && w.fractions) {
    out.push({ kind: 'truck', at: Number.MAX_SAFE_INTEGER, clock: null, id: 'truck', title: '', kg: w.kg ?? 0, cashSek: -(w.feeSek ?? 0) });
  }
  return out.sort((a, b) => a.at - b.at);
}
