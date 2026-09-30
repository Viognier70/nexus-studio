// ORDER 290 — serviceläget (Vision Owner 2026-09-30): panelerna (mise en
// place, lagret, händelselistan och mätarna) fälls ihop under servicen; bara
// klockan och kvällskassan syns, och resten öppnas med en knapp.
// Händelselistans belopp är avslagna som standard. Läget hålls i sidan (inte
// i sparfilen): det är ett val om vad spelaren vill se.

import { useSyncExternalStore } from 'react';

interface DrawerState { open: boolean; amounts: boolean }
let state: DrawerState = { open: false, amounts: false };
const listeners = new Set<() => void>();

function set(next: Partial<DrawerState>): void {
  state = { ...state, ...next };
  for (const l of listeners) l();
}

export function setServiceDrawerOpen(open: boolean): void { set({ open }); }
export function setServiceAmounts(amounts: boolean): void { set({ amounts }); }
export function serviceDrawer(): DrawerState { return state; }

export function useServiceDrawer(): DrawerState {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
    () => state
  );
}
