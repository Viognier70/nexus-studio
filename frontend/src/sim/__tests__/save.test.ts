// ORDER 263 (Nexus v1 etapp 1) — sparande och laddning.
//
// DoD: "Sparande och laddning återställer exakt samma läge, testat genom
// att spara, ladda och jämföra hela tillståndet." Testet sparar mitt i
// en service (gäster i rummet), laddar via LOAD_STATE, jämför hela
// tillståndet och spelar sedan vidare parallellt från original och
// laddat för att visa att spelet fortsätter identiskt.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeInitialState } from '../../strategic/simulation/model';
import type { SimulationState } from '../../strategic/types';
import {
  clearSlot,
  firstEmptySlot,
  listWeeklyCopies,
  makeSaveFile,
  readSlot,
  readWeeklyCopy,
  savesForDayChange,
  slotNumbers,
  writeSlot,
  writeWeeklyCopy,
  type SaveStore
} from '../save';
import { SAVING } from '../balance';
import { V1_CLASS_TO_ROOM } from '../economy';

class MemoryStore implements SaveStore {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

function ticks(s: SimulationState, n: number): SimulationState {
  for (let i = 0; i < n; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
  return s;
}

function midService(): SimulationState {
  let s = makeInitialState(42);
  s = reducer(s, { type: 'PICK_ACTIVITY', id: 'train-service' });
  s = reducer(s, { type: 'START_SERVICE' });
  return ticks(s, 1800);
}

describe('ORDER 263 — sparande', () => {
  it('spara, ladda och jämför hela tillståndet mitt i en service', () => {
    const store = new MemoryStore();
    const s = midService();
    expect(s.day.period).toBe('dinner');
    expect(s.guests.length).toBeGreaterThan(0);
    writeSlot(store, 1, makeSaveFile(s, 'Vinbaren', 'manual'));
    const read = readSlot(store, 1);
    expect(read.status).toBe('ok');
    if (read.status !== 'ok') return;
    expect(read.file.businessName).toBe('Vinbaren');
    const loaded = reducer(makeInitialState(1), { type: 'LOAD_STATE', state: read.file.sim });
    expect(loaded).toEqual(s);
  });

  it('det laddade spelet fortsätter exakt som originalet', () => {
    const store = new MemoryStore();
    const s = midService();
    writeSlot(store, 2, makeSaveFile(s, null, 'auto'));
    const read = readSlot(store, 2);
    if (read.status !== 'ok') throw new Error(read.status);
    let a = s;
    let b = reducer(makeInitialState(1), { type: 'LOAD_STATE', state: read.file.sim });
    a = ticks(a, 3000);
    b = ticks(b, 3000);
    expect(b).toEqual(a);
    expect(a.day.dayNumber).toBeGreaterThanOrEqual(1);
  });

  it('tre platser; första lediga väljs; en äldre version laddas inte', () => {
    const store = new MemoryStore();
    expect(slotNumbers()).toHaveLength(SAVING.slots);
    expect(firstEmptySlot(store)).toBe(1);
    writeSlot(store, 1, makeSaveFile(makeInitialState(1), 'A', 'auto'));
    expect(firstEmptySlot(store)).toBe(2);
    writeSlot(store, 2, makeSaveFile(makeInitialState(1), 'B', 'auto'));
    writeSlot(store, 3, makeSaveFile(makeInitialState(1), 'C', 'auto'));
    expect(firstEmptySlot(store)).toBeNull();
    const oldest = Math.min(...SAVING.migratableVersions);
    const old = { ...makeSaveFile(makeInitialState(1), 'D', 'auto'), formatVersion: oldest - 1 };
    store.setItem('nexus.v1.slot3', JSON.stringify(old));
    expect(readSlot(store, 3).status).toBe('older');
    store.setItem('nexus.v1.slot3', '{trasig');
    expect(readSlot(store, 3).status).toBe('corrupt');
  });

  // ORDER 267 — en fil i version 1 (vinbaren i kvarterskrogens rum)
  // laddas i vinbarens rum; resten av tillståndet är detsamma.
  it('en fil från före etapp 5 laddas med vinbarens rum', () => {
    const store = new MemoryStore();
    const sim = makeInitialState(1);
    expect(sim.economy.businessClass).toBe('vinbar');
    const v1 = { ...makeSaveFile(sim, 'E', 'auto'), formatVersion: Math.min(...SAVING.migratableVersions) };
    store.setItem('nexus.v1.slot1', JSON.stringify(v1));
    const read = readSlot(store, 1);
    if (read.status !== 'ok') throw new Error(read.status);
    expect(read.file.formatVersion).toBe(SAVING.formatVersion);
    expect(read.file.sim.businessClass).toBe(V1_CLASS_TO_ROOM.vinbar);
    expect({ ...read.file.sim, businessClass: sim.businessClass }).toEqual(JSON.parse(JSON.stringify(sim)));
  });

  it('autospar vid varje dagsavslut, veckokopia när en ny vecka börjar', () => {
    const at = (dayNumber: number) => {
      const s = makeInitialState(1);
      return { ...s, day: { ...s.day, dayNumber } };
    };
    expect(savesForDayChange(1, at(1))).toEqual([]);
    expect(savesForDayChange(1, at(2))).toEqual(['auto']);
    expect(savesForDayChange(7, at(8))).toEqual(['auto', 'weekly']);
  });

  it('veckokopior sparas per vecka och kan läsas tillbaka; platsen kan tömmas', () => {
    const store = new MemoryStore();
    const w2 = makeInitialState(1);
    const monday2 = { ...w2, day: { ...w2.day, dayNumber: 8 } };
    const monday3 = { ...w2, day: { ...w2.day, dayNumber: 15 } };
    writeWeeklyCopy(store, 1, makeSaveFile(monday2, 'A', 'weekly'));
    writeWeeklyCopy(store, 1, makeSaveFile(monday3, 'A', 'weekly'));
    writeWeeklyCopy(store, 1, makeSaveFile(monday2, 'A', 'weekly'));
    expect(listWeeklyCopies(store, 1)).toEqual([2, 3]);
    const copy = readWeeklyCopy(store, 1, 2);
    expect(copy.status === 'ok' && copy.file.sim.day.dayNumber).toBe(8);
    writeSlot(store, 1, makeSaveFile(monday3, 'A', 'auto'));
    clearSlot(store, 1);
    expect(readSlot(store, 1).status).toBe('empty');
    expect(listWeeklyCopies(store, 1)).toEqual([]);
    expect(store.data.size).toBe(0);
  });
});
