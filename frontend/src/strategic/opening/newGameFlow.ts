// ORDER 308 — flödet från startskärmen till första morgonen (main.tsx):
//   startskärmen → Nytt spel → namn och samtycke → öppningen → första morgonen.
// Startskärmen och registreringen (namn och samtycke) är NameEntryOverlay i
// StrategicApp utan introduktion; "Signera" ger händelsen newGame. Då börjar
// introduktionen med öppningen över sig, och när öppningen är slut (eller
// överhoppad) visas första morgonen (regelkortet, sedan mentorn).

import type { PlayerRegistration } from '../types';

export interface NewGameFlowState {
  flow: 'start' | 'introduction';
  /** Öppningen spelas (före första morgonen). */
  opening: boolean;
  player?: PlayerRegistration;
}

export type NewGameFlowEvent = { type: 'newGame'; player: PlayerRegistration } | { type: 'openingDone' };

export const NEW_GAME_FLOW_START: NewGameFlowState = { flow: 'start', opening: false };

export function newGameFlow(s: NewGameFlowState, e: NewGameFlowEvent): NewGameFlowState {
  if (e.type === 'newGame') return s.flow === 'start' ? { flow: 'introduction', opening: true, player: e.player } : s;
  if (e.type === 'openingDone') return s.opening ? { ...s, opening: false } : s;
  return s;
}

/** Vad spelaren ser i flödet (efter startrutan och registreringen). */
export function flowScreen(s: NewGameFlowState): 'start' | 'opening' | 'morning' {
  if (s.flow === 'start') return 'start';
  return s.opening ? 'opening' : 'morning';
}
