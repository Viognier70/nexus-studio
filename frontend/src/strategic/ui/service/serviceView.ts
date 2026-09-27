// ORDER 271 — Designs paket 6 (servicen som raketer): det gränssnittet
// läser ur simuleringen. Rena funktioner, så att raketkortet, mätarna och
// kvällens lärdom kan provas utan att rendera.
//
// Källorna är desamma som simuleringen skriver: `incidents.log` (varje
// raket i kvällen, `step` = steget där den föll, null när den höll),
// `incidents.lesson` (lessonFor), kassan, gästernas nöjdhet och moralen
// (sim/incidents.ts `serviceMeters`).

import { ECONOMY, WEEK } from '../../../sim/balance';
import { incidentById } from '../../../sim/incidentBank';
import { incidentsOf, serviceMeters, type IncidentDeltas, type IncidentRecord } from '../../../sim/incidents';
import type { SimulationState } from '../../types';

// Tio steg per mätare (Design paket 6 §4, `METER_STEPS`).
export const METER_STEPS = 10;
// Direkt efter ett svar växer mätarna och visar vad det kostade så här
// länge (verklig tid, Design paket 6 §4).
export const METER_EMPHASIS_MS = 3200;
// Nedräkningen står i bläck till 6 s och i accent de sista fem (R1).
export const COUNTDOWN_ACCENT_SECONDS = 5;

// ---------------------------------------------------------------------
// Raketerna i kväll
// ---------------------------------------------------------------------

// Raket n av totalt: de som redan gått, den som står öppen och de som är
// planerade (kedjade raketer läggs till i planen när de uppstår).
export function rocketCounter(state: SimulationState): { n: number; total: number } {
  const inc = incidentsOf(state);
  const open = inc.active ? 1 : 0;
  return { n: inc.log.length + open, total: inc.log.length + open + inc.slots.length };
}

export type CellState = 'cleared' | 'failed' | 'unreached';

// Ett steg i en raket i efterhand: klarat före steget där den föll, fel
// där, och inte nått efter. En raket som höll är klarad i alla steg.
export function cellsFor(rec: Pick<IncidentRecord, 'step'>, steps: number): CellState[] {
  return Array.from({ length: steps }, (_, i): CellState => {
    if (rec.step === null || i < rec.step) return 'cleared';
    return i === rec.step ? 'failed' : 'unreached';
  });
}

export interface GridRow {
  record: IncidentRecord;
  title: string;
  cells: CellState[];
}

// Kvällens rutnät, raketerna × stegen (L1).
export function eveningGrid(state: SimulationState): GridRow[] {
  const cls = state.economy.businessClass;
  return incidentsOf(state).log.flatMap((record) => {
    const incident = cls ? incidentById(cls, record.id) : undefined;
    if (!incident) return [];
    return [{ record, title: incident.text.title, cells: cellsFor(record, incident.steps.length) }];
  });
}

// Lärdomen hämtas ur det tidigaste fallet: ett missat episteme väger
// tyngre än ett missat phronesis (Designs `pickLesson`). Vid lika steg
// gäller raketen som kom först. Index i loggen, eller null när allt höll.
export function pickLessonIndex(log: readonly Pick<IncidentRecord, 'step' | 'at'>[]): number | null {
  let best: number | null = null;
  log.forEach((r, i) => {
    if (r.step === null) return;
    const b = best === null ? null : log[best];
    if (!b || r.step < (b.step as number) || (r.step === b.step && r.at < b.at)) best = i;
  });
  return best;
}

export function stepsCleared(grid: readonly GridRow[]): { cleared: number; total: number } {
  const cells = grid.flatMap((r) => r.cells);
  return { cleared: cells.filter((c) => c === 'cleared').length, total: cells.length };
}

// ---------------------------------------------------------------------
// Mätarna: tio steg var, riktning och inte belopp
// ---------------------------------------------------------------------

// En normal kvälls intäkt i klassen: veckans normala intäkt delat på
// servicedagarna. Tio steg i kassan är en normal kväll.
export function normalEveningSek(state: SimulationState): number {
  const cls = state.economy.businessClass;
  return cls ? ECONOMY.normalWeeklyRevenueSek[cls] / WEEK.serviceDays : 0;
}

// Kvällens kassa hittills: gästernas intäkt sedan servicen öppnade och
// raketernas kassa i kväll (bokförd som 'scenario' i dagens bok).
export function tonightCashSek(state: SimulationState): number {
  const start = state.day.revenueAtServiceStart;
  const revenue = start === null ? 0 : state.revenue - start;
  const incidentIds = new Set(incidentsOf(state).log.map((r) => r.id));
  const incidents = state.ledger
    .filter((l) => l.day === state.day.dayNumber && l.category === 'scenario' && l.causeId !== undefined && incidentIds.has(l.causeId))
    .reduce((sum, l) => sum + l.amount, 0);
  return revenue + incidents;
}

const clampSteps = (v: number) => Math.max(0, Math.min(METER_STEPS, Math.round(v)));

export interface MeterSteps { cash: number; satisfaction: number; stamina: number }

export function meterSteps(state: SimulationState): MeterSteps {
  const m = serviceMeters(state);
  const evening = normalEveningSek(state);
  return {
    cash: evening > 0 ? clampSteps((tonightCashSek(state) / evening) * METER_STEPS) : 0,
    satisfaction: clampSteps((m.satisfaction ?? 0) * METER_STEPS),
    stamina: clampSteps(m.stamina * METER_STEPS)
  };
}

// Vad ett svar gjorde, i steg. En förändring som inte fyller ett helt
// steg visas ändå som ett steg: mätarna visar riktningen.
export function deltaSteps(state: SimulationState, d: IncidentDeltas): MeterSteps {
  const evening = normalEveningSek(state);
  const steps = (v: number) => (Math.abs(v) < 1e-9 ? 0 : Math.sign(v) * Math.max(1, Math.round(Math.abs(v))));
  return {
    cash: steps(evening > 0 ? (d.cashSek / evening) * METER_STEPS : 0),
    satisfaction: steps(d.satisfaction * METER_STEPS),
    stamina: steps(d.stamina * METER_STEPS)
  };
}
