// ORDER 277 — servicen startar inte förrän minst en rätt och en dryck finns
// i lager (morgonen är insatsen). Tester som öppnar en klass med paket utan
// att handla köper klassens baspaket först, som den rimliga spelaren i
// harnessen (weekHarness.ts playMorning). Klasser utan paket, och ett lager
// som redan räcker, lämnas orörda.

import { reducer } from '../simulation/reducer';
import { packagesFor } from '../simulation/packages';
import { stockReadiness } from '../simulation/stockPackages';
import type { SimulationState } from '../types';

export function stocked(s: SimulationState): SimulationState {
  const pkgs = packagesFor(s.economy.businessClass);
  if (!pkgs || stockReadiness(s).ready || s.day.period !== 'morning') return s;
  return reducer(s, { type: 'BUY_PACKAGE', packageId: pkgs.base.id });
}
