// ORDER 269 — kunskapen i servicen. Speldesign > Servicen: "Servicen är
// slumpen, viktad av spelarens förberedelser. Det spelaren gjort på
// morgonen, och det hon kan, avgör hur ofta saker går rätt."
//
// Medaljerna verkar i servicen genom de faktorer som står här; alla tal
// kommer från balance.ts KNOWLEDGE_IN_SERVICE. Kassa och krediter byter
// aldrig plats: filen läser medaljer och krediter och skriver inga.

import { KNOWLEDGE_IN_SERVICE, MEDAL_LEVELS, QUEUE } from './balance';
import { mainPavilionFor } from './economy';
import type { EnablerKey, PavilionKey, SimulationState } from '../strategic/types';

const K = KNOWLEDGE_IN_SERVICE;

// Medaljsteg i en paviljong: brons ett, platina fyra.
export function medalSteps(medals: SimulationState['medals'], pavilion: PavilionKey): number {
  const level = medals[pavilion];
  return level ? MEDAL_LEVELS.indexOf(level) + 1 : 0;
}

// Metodköket: köksmissar och kollapsrisk.
export function kitchenMistakeFactor(state: SimulationState): number {
  return Math.max(K.metodkoket.minFactor, 1 - K.metodkoket.kitchenMistakeCutPerStep * medalSteps(state.medals, 'metodkoket'));
}

export function collapseRiskFactor(state: SimulationState): number {
  return Math.max(K.metodkoket.minFactor, 1 - K.metodkoket.collapseCutPerStep * medalSteps(state.medals, 'metodkoket'));
}

// Stensöta: intäkt per betalande gäst, via dryck.
export function drinkRevenueFactor(state: SimulationState): number {
  return 1 + K.stensota.drinkRevenuePerStep * medalSteps(state.medals, 'stensota');
}

// Kalastorget: gästen i kön ger upp senare och vid lägre nöjdhet.
export function giveUpSatisfaction(state: SimulationState): number {
  return QUEUE.giveUpSatisfaction - K.kalastorget.giveUpSatisfactionCutPerStep * medalSteps(state.medals, 'kalastorget');
}

export function queuePatienceSeconds(state: SimulationState): number {
  return QUEUE.patienceSimSeconds + K.kalastorget.patienceSecondsPerStep * medalSteps(state.medals, 'kalastorget');
}

// Kalastorget: scenariots bästa svar ger mer.
export function bestAnswerFactor(state: SimulationState): number {
  return 1 + K.kalastorget.bestAnswerBonusPerStep * medalSteps(state.medals, 'kalastorget');
}

// Huvudpaviljongen: personalens tempo (uppgifternas tid). Utan
// verksamhet (introduktionen) finns ingen huvudpaviljong.
export function staffTempoFactor(state: SimulationState): number {
  const cls = state.economy?.businessClass;
  if (!cls) return 1;
  const steps = medalSteps(state.medals, mainPavilionFor(cls, state.medals));
  return Math.max(K.mainPavilion.minFactor, 1 - K.mainPavilion.tempoCutPerStep * steps);
}

// Krediterna fyller rummets enablers i samma register, på båda axlarna.
// Ett värde sänks aldrig (F27: kunskapen går inte förlorad).
export function enablersWithCredits(state: SimulationState): SimulationState['enablers'] {
  const next = { ...state.enablers };
  for (const axis of Object.keys(next) as EnablerKey[]) {
    const rec = { ...next[axis] };
    for (const reg of ['episteme', 'techne', 'phronesis'] as const) {
      const fromCredits = Math.min(K.credits.enablerMax, Math.max(0, state.knowledgeCredits[reg]) * K.credits.enablerPerCredit);
      rec[reg] = Math.max(rec[reg], fromCredits);
    }
    next[axis] = rec;
  }
  return next;
}
