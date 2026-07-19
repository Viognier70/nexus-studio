export type Stage = 'title' | 'bus' | 'play' | 'end';

export type ChoiceId = 'A' | 'B' | 'C';

export type ContextTarget = 'npc' | 'table';

export interface ContextPrompt {
  target: ContextTarget;
  label: string;
}

export interface GameState {
  stage: Stage;
  hasSpokenToApplicant: boolean;
  chosenResponse: ChoiceId | null;
  objective: string | null;
  dialogueOpen: boolean;
  paused: boolean;
  muted: boolean;
  ended: boolean;
}

export type GameAction =
  | { type: 'START_BUS' }
  | { type: 'START_PLAY' }
  | { type: 'OPEN_DIALOGUE' }
  | { type: 'CLOSE_DIALOGUE'; choice: ChoiceId }
  | { type: 'END_DEMO' }
  | { type: 'DISMISS_END' }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'RESET' };
