import { createContext, useContext, type Dispatch } from 'react';
import type { GameAction, GameState } from '../types';
import { strings } from '../content/strings.sv';

export const initialState: GameState = {
  stage: 'title',
  hasSpokenToApplicant: false,
  chosenResponse: null,
  objective: null,
  dialogueOpen: false,
  paused: false,
  muted: false,
  ended: false
};

export function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_BUS':
      return { ...state, stage: 'bus' };
    case 'START_PLAY':
      return { ...state, stage: 'play' };
    case 'OPEN_DIALOGUE':
      return { ...state, dialogueOpen: true };
    case 'CLOSE_DIALOGUE':
      return {
        ...state,
        dialogueOpen: false,
        hasSpokenToApplicant: true,
        chosenResponse: action.choice,
        objective: strings.objective
      };
    case 'END_DEMO':
      return { ...state, stage: 'end', ended: true };
    case 'DISMISS_END':
      return { ...state, stage: 'play', objective: null };
    case 'TOGGLE_MUTE':
      return { ...state, muted: !state.muted };
    case 'TOGGLE_PAUSE':
      return { ...state, paused: !state.paused };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

export const GameStateContext = createContext<GameState>(initialState);
export const GameDispatchContext = createContext<Dispatch<GameAction>>(() => {});

export function useGameState(): GameState {
  return useContext(GameStateContext);
}

export function useGameDispatch(): Dispatch<GameAction> {
  return useContext(GameDispatchContext);
}
