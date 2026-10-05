// ORDER 310b — testernas väg genom låset och väntan: ett svar avgörs först
// INCIDENTS.verdictSeconds (verkliga sekunder) efter trycket. Testerna som
// prövar vad ett svar ger tickar förbi väntan, som spelet gör.

import { reducer } from '../../strategic/simulation/reducer';
import type { SimulationState } from '../../strategic/types';

const TICK = { type: 'TICK', dt: 0.2 } as const;

// Tickar tills det låsta svaret har avgjorts (eller raketen är borta).
export function untilVerdict(s: SimulationState): SimulationState {
  for (let i = 0; i < 2000 && s.incidents?.active?.pending; i++) s = reducer(s, TICK);
  return s;
}

// Svaret och avgörandet: ANSWER_INCIDENT och väntan. Ett avvisat svar
// (struket, okänt, under valet) ger samma tillstånd tillbaka.
export function answerAndWait(s: SimulationState, optionId: string): SimulationState {
  const locked = reducer(s, { type: 'ANSWER_INCIDENT', optionId });
  return locked === s ? s : untilVerdict(locked);
}
