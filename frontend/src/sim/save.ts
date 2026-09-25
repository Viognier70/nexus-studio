// ORDER 263 (Nexus v1 etapp 1) — sparande.
//
// Speldesign > Ramar för version 1 > Sparande: "Spelet sparas
// automatiskt vid varje dagsavslut. Varje veckoavräkning sparas
// dessutom som en egen kopia, så att spelaren kan gå tillbaka en
// vecka. Tre sparplatser per spelare."
//
// En sparfil är hela simuleringens tillstånd plus verksamhetens namn
// (som ligger utanför simuleringen, i BusinessContext). Tillståndet är
// ren JSON; `__tests__/save.test.ts` hävdar att en rundtur ger exakt
// samma tillstånd och att spelet fortsätter identiskt efter laddning.
//
// Lagringen är injicerbar (`SaveStore`) så att testerna kan köra utan
// webbläsare; i spelet är den `window.localStorage`.
//
// Formatet är versionerat (`SAVING.formatVersion`). En fil i en annan
// version laddas inte utan visas som äldre (NEXUS_V1_OPPNA_FRAGOR F12).

import { SAVING } from './balance';
import { calendarFor } from './calendar';
import { V1_CLASS_TO_ROOM } from './economy';
import type { SimulationState } from '../strategic/types';
import { awardMedal } from '../strategic/knowledge/pavilionVisit';

export interface SaveStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type SaveKind = 'auto' | 'weekly' | 'manual';

export interface SaveFile {
  formatVersion: number;
  kind: SaveKind;
  savedAt: string;
  businessName: string | null;
  sim: SimulationState;
}

export type SlotStatus =
  | { status: 'empty' }
  | { status: 'ok'; file: SaveFile }
  | { status: 'older' }
  | { status: 'corrupt' };

const PREFIX = 'nexus.v1';

// Platserna numreras 1..SAVING.slots.
export function slotNumbers(): number[] {
  return Array.from({ length: SAVING.slots }, (_, i) => i + 1);
}

function slotKey(slot: number): string {
  return `${PREFIX}.slot${slot}`;
}
function weekKey(slot: number, week: number): string {
  return `${PREFIX}.slot${slot}.week${week}`;
}
function weekIndexKey(slot: number): string {
  return `${PREFIX}.slot${slot}.weeks`;
}

export function makeSaveFile(
  sim: SimulationState,
  businessName: string | null,
  kind: SaveKind,
  now: Date = new Date()
): SaveFile {
  return {
    formatVersion: SAVING.formatVersion,
    kind,
    savedAt: now.toISOString(),
    businessName,
    sim
  };
}

// ORDER 267 — en fil från före etapp 5 har vinbaren i kvarterskrogens
// rum. Rummet sätts efter klassen (sim/economy.ts V1_CLASS_TO_ROOM);
// resten av tillståndet är oförändrat.
function migrate(file: SaveFile): SaveFile {
  const cls = file.sim.economy?.businessClass;
  const sim = cls ? { ...file.sim, businessClass: V1_CLASS_TO_ROOM[cls] } : file.sim;
  return { ...file, formatVersion: SAVING.formatVersion, sim };
}

function parse(raw: string | null): SlotStatus {
  if (raw === null) return { status: 'empty' };
  try {
    const file = JSON.parse(raw) as SaveFile;
    const migratable = (SAVING.migratableVersions as readonly number[]).includes(file.formatVersion);
    if (file.formatVersion !== SAVING.formatVersion && !migratable) return { status: 'older' };
    if (!file.sim || typeof file.sim.day?.dayNumber !== 'number') return { status: 'corrupt' };
    return { status: 'ok', file: migratable ? migrate(file) : file };
  } catch {
    return { status: 'corrupt' };
  }
}

export function readSlot(store: SaveStore, slot: number): SlotStatus {
  return parse(store.getItem(slotKey(slot)));
}

export function writeSlot(store: SaveStore, slot: number, file: SaveFile): void {
  store.setItem(slotKey(slot), JSON.stringify(file));
}

// Veckokopior per plats, nyckade på veckan de börjar (absolut vecka).
export function listWeeklyCopies(store: SaveStore, slot: number): number[] {
  try {
    const weeks = JSON.parse(store.getItem(weekIndexKey(slot)) ?? '[]') as number[];
    return Array.isArray(weeks) ? weeks.filter((w) => typeof w === 'number') : [];
  } catch {
    return [];
  }
}

export function readWeeklyCopy(store: SaveStore, slot: number, week: number): SlotStatus {
  return parse(store.getItem(weekKey(slot, week)));
}

export function writeWeeklyCopy(store: SaveStore, slot: number, file: SaveFile): void {
  const week = calendarFor(file.sim.day.dayNumber).absoluteWeek;
  store.setItem(weekKey(slot, week), JSON.stringify(file));
  const weeks = listWeeklyCopies(store, slot).filter((w) => w !== week);
  store.setItem(weekIndexKey(slot), JSON.stringify([...weeks, week].sort((a, b) => a - b)));
}

// Tömmer en plats helt (spelet och dess veckokopior). Används när en
// plats skrivs över med ett annat spel.
export function clearSlot(store: SaveStore, slot: number): void {
  for (const w of listWeeklyCopies(store, slot)) store.removeItem(weekKey(slot, w));
  store.removeItem(weekIndexKey(slot));
  store.removeItem(slotKey(slot));
}

// Första lediga plats, eller null om alla är tagna.
export function firstEmptySlot(store: SaveStore): number | null {
  return slotNumbers().find((n) => readSlot(store, n).status === 'empty') ?? null;
}

// Vad som ska sparas när dagen har bytts från `prevDay` till `sim`:s dag.
// Autospar vid varje dagsavslut; veckokopia när den nya dagen är
// veckans första (efter söndagens veckoavräkning).
export function savesForDayChange(prevDay: number, sim: SimulationState): SaveKind[] {
  if (sim.day.dayNumber <= prevDay) return [];
  const cal = calendarFor(sim.day.dayNumber);
  const startsWeek = cal.weekday === calendarFor(1).weekday;
  return startsWeek ? ['auto', 'weekly'] : ['auto'];
}

// Webbläsarens lagring, eller null om den inte går att använda
// (privat läge, blockerad webbplatsdata).
export function browserStore(): SaveStore | null {
  try {
    const ls = window.localStorage;
    const probe = `${PREFIX}.probe`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

// ORDER 264 (F19) — tillbaka en vecka utan att förlora kunskap.
// Speldesign > Spelslingan: "Kassan kan gå förlorad, kunskapen kan det
// inte." > Medaljerna: "En medalj som är tagen behålls alltid." När
// spelaren laddar en veckokopia på samma plats spolas allt tillbaka
// utom kunskapen: medaljerna blir de högsta av nu och kopian, och
// krediterna och kvällsquizräkningen behålls från nu.
export function carryKnowledge(current: SimulationState, loaded: SimulationState): SimulationState {
  let medals = loaded.medals ?? {};
  for (const [pavilion, level] of Object.entries(current.medals ?? {})) {
    if (level) medals = awardMedal(medals, pavilion as keyof SimulationState['medals'], level);
  }
  return {
    ...loaded,
    medals,
    knowledgeCredits: { ...current.knowledgeCredits },
    knowledgeTracks: {
      episteme: { ...current.knowledgeTracks.episteme },
      techne: { ...current.knowledgeTracks.techne },
      phronesis: { ...current.knowledgeTracks.phronesis }
    },
    postServiceQuizzesTaken: Math.max(current.postServiceQuizzesTaken ?? 0, loaded.postServiceQuizzesTaken ?? 0)
  };
}
