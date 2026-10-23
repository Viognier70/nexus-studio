// ORDER 340 B (Anders 2026-10-23: "se till att det högre priset syns för spelaren (bistrons meny och notan)") — procenten
// som menyn om morgonen (MorningBuyScreen.tsx) och kvällens resultat (ResultScreen.tsx) visar. Notan står i balance.ts
// LADDER.steps.*.billFactor och läggs på i reducern (sim/ladderStep.ts ladderBillFactor).
import { LADDER } from '../../sim/balance';
import { ladderBillFactor } from '../../sim/ladderStep';
import type { SimulationState } from '../types';

/** Hur mycket högre notan är i krogens steg än i vinbaren, i procent (0 i vinbaren och vagnen). */
export function billAboveVinbarPct(state: Pick<SimulationState, 'ladder' | 'economy'>): number {
  return Math.round((ladderBillFactor(state) / LADDER.steps.vinbar.billFactor - 1) * 100);
}
