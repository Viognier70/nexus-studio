// ORDER 265 (Nexus v1 etapp 3) — testhjälp: rummets mekanik utan
// marknadens tak.
//
// Speldesign > Marknaden: spelarens andel av dagens gästpool har ett tak
// (src/sim/economy.ts dailyGuestCap). Poolen är räknad för en v1-kväll
// (tio simulerade minuter). Tester av rummets mekanik (kö, rykte, meny,
// händelsekedjor) kör ofta längre eller kortare pass och prövar inte
// marknaden; de stänger av taket uttryckligen här.
//
// Försök som inte höll (mätt 2026-09-25): medaljer som ger utrymme
// (brons 35 %, guld 65 % i alla fem) räckte inte för 15-minuterspass dag
// 1; att skala taket med passets längd gjorde korta pass (3 min) för
// snäva. Växeln är ärligare än att vrida medaljerna.
import type { SimulationState } from '../../types';

export function withoutMarketCap(s: SimulationState): SimulationState {
  return { ...s, policies: { ...s.policies, marketCapEnabled: false } };
}
