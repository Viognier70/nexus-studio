// ORDER 309 — fokusläget ur Designs D5 (hudLayout.ts FOCUS_MODE), utan
// speltillstånd. Slås på när kameran går under 14 m och av först över 15,5 m,
// så att det inte fladdrar; H växlar. Ersätter ORDER 303 G:s enkla läge (på
// under 14 m eller så länge H var intryckt).

import { FOCUS_MODE } from './hudLayout';

export interface FocusState { on: boolean; near: boolean }

/**
 * Nästa läge när kameran står på `distance` meter. Gränserna gäller vid
 * passagen: under enterBelowM slås läget på, över exitAboveM av. Mellan dem
 * står det kvar (också om spelaren slog av det med H).
 */
export function focusStep(prev: FocusState, distance: number): FocusState {
  if (!Number.isFinite(distance) || distance <= 0) return prev;
  if (!prev.near && distance < FOCUS_MODE.enterBelowM) return { on: true, near: true };
  if (prev.near && distance > FOCUS_MODE.exitAboveM) return { on: false, near: false };
  return prev;
}

/** H: växlar läget. */
export function focusToggle(prev: FocusState): FocusState {
  return { ...prev, on: !prev.on };
}

let state: FocusState = { on: false, near: false };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export const focusModeOn = () => state.on;
export function focusState(): FocusState { return state; }
export function setFocusState(next: FocusState): void {
  if (next.on === state.on && next.near === state.near) return;
  state = next;
  emit();
}
export const toggleFocusMode = () => setFocusState(focusToggle(state));
export function subscribeFocusMode(f: () => void): () => void {
  subs.add(f);
  return () => { subs.delete(f); };
}
