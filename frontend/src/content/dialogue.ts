import type { ChoiceId } from '../types';
import { strings } from './strings';

export interface DialogueChoice {
  id: ChoiceId;
  playerLine: string;
  npcResponse: string;
}

export interface OpeningDialogue {
  prompt: string;
  choices: DialogueChoice[];
}

const choiceIds: ChoiceId[] = ['A', 'B', 'C'];

// ORDER 273 — läses vid åtkomst, så att dialogen följer det valda språket.
export const openingDialogue: OpeningDialogue = {
  get prompt() {
    return strings.npc.prompt;
  },
  get choices() {
    return choiceIds.map((id) => ({
      id,
      playerLine: strings.npc.choices[id],
      npcResponse: strings.npc.responses[id]
    }));
  }
};
