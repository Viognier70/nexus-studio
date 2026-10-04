// ORDER 303 C (Anders 2026-10-04): "Recensioner i morse: varje morgon visas
// en kort rad om vad byn säger om gårdagens kväll, och hur ryktet ändrades
// och varför. Exempel: 'Ryktet −4: två bord fick fel vin till fisken.'"
// Byggs när dagen byts (reducer.ts), efter nattens självläkning: ryktets
// ändring från kvällens början till morgonen, kvällens svar (day.answerReviews)
// med händelsernas namn, och resten som gästernas egen kväll.

import type { SimulationState } from '../strategic/types';
import { CONSEQUENCES, REPUTATION } from './balance';
import { incidentById } from './incidentBank';

export interface MorningReview {
  dayNumber: number;
  // Poäng 0–100, avrundade.
  change: number;
  fromAnswers: number;
  wrongTables: number;
  rightTables: number;
  grave: number;
  wrongTitles: string[];
  rightTitles: string[];
}

export function buildMorningReview(evening: SimulationState, morning: SimulationState): MorningReview | null {
  // Ryktet när gårdagen började (servicens startvärde nollställs när den stänger).
  const start = evening.day.reputationAtServiceStart ?? evening.day.reputationAtDayStart;
  const served = (evening.day.seatedTonight ?? 0) > 0 || (evening.day.answerReviews?.length ?? 0) > 0;
  if (start === undefined || start === null || !served) return null;
  const reviews = evening.day.answerReviews ?? [];
  const title = (id: string) => incidentById(evening.economy.businessClass, id)?.text.title ?? id;
  const wrong = reviews.filter((r) => !r.right);
  // Raketer klarade hela vägen: svaret som också bar raketens ryktesdel.
  const cleared = reviews.filter((r) => r.right && r.reputation >= CONSEQUENCES.right.clearedReputation);
  const uniq = (xs: string[]) => [...new Set(xs)];
  return {
    dayNumber: evening.day.dayNumber,
    change: Math.round((morning.reputation - start) * REPUTATION.scale),
    fromAnswers: Math.round(reviews.reduce((a, r) => a + r.reputation, 0)),
    wrongTables: wrong.length,
    rightTables: cleared.length,
    grave: wrong.filter((r) => r.severity === 'grave').length,
    wrongTitles: uniq(wrong.map((r) => title(r.incidentId))),
    rightTitles: uniq(cleared.map((r) => title(r.incidentId)))
  };
}
