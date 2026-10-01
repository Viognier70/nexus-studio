// ORDER 292 — följder nästa dag (Vision Owner 2026-10-01): "Bokningsboken
// visar vad gårdagens svar gav, till exempel '3 bokningar tack vare gårdagens
// vin'."
//
// När servicen stänger räknas kvällens raketer (incidents.log): en klarad
// raket ger NEXT_DAY.bookingsPerClearedRocket bokningar till nästa servicedag,
// en fälld raket kostar bookingsLostPerFailedRocket. Bokningarna står per
// raketens spår (vinet, maten). Marknadens tak den dagen ökar eller minskar
// lika mycket (economy.ts dailyGuestCap), och bokningsboken visar raderna.

import { NEXT_DAY } from './balance';
import { calendarFor } from './calendar';
import { incidentById } from './incidentBank';
import type { SimulationState } from '../strategic/types';

type Track = 'sommellerie' | 'kok' | 'service';

function nextServiceDay(day: number): number {
  let d = day + 1;
  while (!calendarFor(d).isServiceDay) d += 1;
  return d;
}

export function recordAnswerBookings(draft: SimulationState): void {
  const log = draft.incidents?.log ?? [];
  const today = draft.day.dayNumber;
  const byTrack = new Map<Track, number>();
  for (const r of log) {
    const inc = incidentById(draft.economy.businessClass, r.id);
    const track: Track = inc?.track ?? 'service';
    const delta = r.step === null ? NEXT_DAY.bookingsPerClearedRocket : -NEXT_DAY.bookingsLostPerFailedRocket;
    byTrack.set(track, (byTrack.get(track) ?? 0) + delta);
  }
  const items = [...byTrack.entries()].filter(([, n]) => n !== 0).map(([track, n]) => ({ track, n }));
  draft.answerBookings = items.length > 0 ? { forDay: nextServiceDay(today), items } : null;
}

// Nettot av gårdagens svar för kvällen (0 andra dagar).
export function answerBookingsFor(state: Pick<SimulationState, 'answerBookings' | 'day'>): number {
  const a = state.answerBookings;
  if (!a || a.forDay !== state.day.dayNumber) return 0;
  return a.items.reduce((sum, i) => sum + i.n, 0);
}
