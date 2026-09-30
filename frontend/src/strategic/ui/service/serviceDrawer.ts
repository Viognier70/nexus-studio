// ORDER 290 — serviceläget (Vision Owner 2026-09-30, Designs leverans
// serviceläget §3): panelerna ligger hopfällda som tre runda flikar nere till
// vänster (Lagret, Kvällen, Rummet). Bara en panel är öppen åt gången.
// Händelselistans belopp är avslagna som standard. Läget hålls i sidan, inte i
// sparfilen: det är ett val om vad spelaren vill se.
//
// `all` visar alla paneler på en gång (tester av panelerna var för sig).

import { useSyncExternalStore } from 'react';

export type ServicePanel = 'stock' | 'stream' | 'room';
export const SERVICE_PANELS: readonly ServicePanel[] = ['stock', 'stream', 'room'];

interface DrawerState { panel: ServicePanel | null; all: boolean; amounts: boolean }
let state: DrawerState = { panel: null, all: false, amounts: false };
const listeners = new Set<() => void>();

function set(next: Partial<DrawerState>): void {
  state = { ...state, ...next };
  for (const l of listeners) l();
}

export function openServicePanel(panel: ServicePanel | null): void { set({ panel }); }
export function toggleServicePanel(panel: ServicePanel): void { set({ panel: state.panel === panel ? null : panel }); }
export function setServiceDrawerOpen(all: boolean): void { set({ all }); }
export function setServiceAmounts(amounts: boolean): void { set({ amounts }); }
export function serviceDrawer(): DrawerState { return state; }

export function panelOpen(s: DrawerState, panel: ServicePanel): boolean { return s.all || s.panel === panel; }

export function useServiceDrawer(): DrawerState {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
    () => state
  );
}
