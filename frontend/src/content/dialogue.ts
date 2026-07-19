import type { ChoiceId } from '../types';
import { strings } from './strings.sv';

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

export const openingDialogue: OpeningDialogue = {
  prompt: strings.npc.prompt,
  choices: choiceIds.map((id) => ({
    id,
    playerLine: strings.npc.choices[id],
    npcResponse: strings.npc.responses[id]
  }))
};
