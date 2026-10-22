// ORDER 332 G — spelaren väljer vagnens plats i morgonrutan (strategic/scenario/DayActionBar.tsx). Platsen står kvar
// tills den byts. Avgiften dras när dörrarna öppnar (balance.ts DISTRICTS.truckSpotFeeSek; Torget ingår i veckans
// tillstånd). En plats som inte är öppen den veckan (sjön efter badsäsongen) går inte att välja, och står vagnen där
// när säsongen slutar kör den tillbaka till Torget.
import type { SimulationState } from '../strategic/types';
import { applyCashCost, postLedger } from '../strategic/simulation/cashReading';
import { strings } from '../content/strings';
import { playerTruckSpotOf, truckSpotFeeSek, truckSpotOpen, type TruckSpotId } from './districts';

export function setTruckSpot(state: SimulationState, spot: TruckSpotId): SimulationState {
  if (state.economy.businessClass !== 'foodtruck') return state;
  if (state.day.period !== 'morning' && state.day.period !== 'afternoon') return state;
  if (!truckSpotOpen(spot, state.day.dayNumber) || playerTruckSpotOf(state) === spot) return state;
  return { ...state, economy: { ...state.economy, truckSpot: spot } };
}

/** När dörrarna öppnar: en stängd plats blir Torget, och platsens avgift dras. */
export function applyTruckSpotAtDoors(draft: SimulationState): void {
  if (draft.economy.businessClass !== 'foodtruck') return;
  if (!truckSpotOpen(playerTruckSpotOf(draft), draft.day.dayNumber)) draft.economy = { ...draft.economy, truckSpot: 'torget' };
  // ORDER 334 B — kvällen räknas på platsen (en gång per dag), för stamgästerna på Magasinsgatan.
  if (draft.economy.truckNightDay !== draft.day.dayNumber) {
    const spot = playerTruckSpotOf(draft), nights = draft.economy.truckNights ?? {};
    draft.economy = { ...draft.economy, truckNights: { ...nights, [spot]: (nights[spot] ?? 0) + 1 }, truckNightDay: draft.day.dayNumber };
  }
  const fee = truckSpotFeeSek(playerTruckSpotOf(draft));
  if (fee <= 0) return;
  draft.ledger = [...draft.ledger];
  applyCashCost(draft, fee);
  postLedger(draft, { category: 'other', amount: -fee, cause: strings.economy.ledger.spotFee });
}
