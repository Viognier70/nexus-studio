// ORDER 079 (M4a) — attractiveness weighting + substitute/walkout DoD.
//
// Per STRATEGIC_TRACK_MILESTONES_PROPOSAL.md §M4a and the report gate
// at M4A_ATTRACTIVENESS_AND_SUBSTITUTION_REPORT_ORDER_079.md §6.
//
// DoDs:
//   1. Attractiveness weighting shifts demand. Cheap dish sells at
//      least 2× more than the expensive one over a 15-min dinner.
//   2. Both 'guest_substituted' and 'guest_walked' events fire when
//      a target dish runs out and other dishes remain available.

import { describe, expect, it } from 'vitest';
import { runHarness } from './harness';
import type { SimAction } from '../../types';

describe('M4a DoD — attractiveness weighting + substitute/walkout', () => {
  it('DoD 1 — cheap dish sells ≥ 2× the count of expensive dish', () => {
    // Two dishes on the menu with ample stock (no run-outs). One
    // priced well below its suggestedPrice, one well above. Over a
    // 15-min dinner the cheap dish's revenue count must exceed the
    // expensive one's by at least 2×. K=2 gives an expected ratio
    // near 19× — 2× is a loose floor for a small guest sample.
    const script: { atSec: number; action: SimAction }[] = [
      // Stock enough for many plates of each. Buy from the largest
      // suppliers so short-delivery doesn't skew the ingredient
      // counts too much.
      { atSec: 1, action: { type: 'BUY_STOCK', supplierId: 'wholesaler', ingredientId: 'chicken',  units: 30 } },
      { atSec: 2, action: { type: 'BUY_STOCK', supplierId: 'wholesaler', ingredientId: 'pork',     units: 30 } },
      { atSec: 3, action: { type: 'BUY_STOCK', supplierId: 'wholesaler', ingredientId: 'root-veg', units: 60 } },
      { atSec: 4, action: { type: 'BUY_STOCK', supplierId: 'local-veg',  ingredientId: 'herbs',    units: 30 } },
      // chicken-plate suggestedPrice = 175 → price 100 = well below
      // pork-plate    suggestedPrice = 195 → price 400 = well above
      { atSec: 5, action: { type: 'COMPOSE_MENU', dishes: [
          { dishId: 'chicken-plate', price: 100 },
          { dishId: 'pork-plate',    price: 400 }
      ] } },
      { atSec: 6, action: { type: 'SKIP_LUNCH' } },
      { atSec: 60, action: { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: 15 } }
    ];
    const r = runHarness({ seed: 42, script, runUntilSec: 1100 });
    // Count served + substituted events per dish. A served event
    // draws the dish itself; a substituted event serves the
    // substitute (which shows up in guest_substituted's substituted
    // dish name). Under this DoD's setup we're only serving from
    // fresh stock, so guest_substituted / guest_walked events
    // should be zero (both dishes have plenty of plates).
    const chickenPlateStart = 30;   // ingredient chicken start
    const porkPlateStart    = 30;
    const chickenPlatesLeft = r.finalState.stock['chicken'] ?? 0;
    const porkPlatesLeft    = r.finalState.stock['pork']    ?? 0;
    const chickenCount = chickenPlateStart - chickenPlatesLeft;
    const porkCount    = porkPlateStart    - porkPlatesLeft;
    console.log(`[M4a] served counts — chicken-plate @100: ${chickenCount}, pork-plate @400: ${porkCount}`);
    expect(chickenCount, 'no chicken-plate served — attractiveness weighting bug').toBeGreaterThan(0);
    // Cheap dish outsells expensive dish by ≥ 2×. Loose floor —
    // expected ratio at K=2 is ~19× (see report gate §2 math).
    expect(chickenCount, `expected cheap dish to outsell expensive by ≥ 2×; got chicken=${chickenCount} pork=${porkCount}`)
      .toBeGreaterThanOrEqual(porkCount * 2);
  });

  it('DoD 2 — guest_substituted AND guest_walked events both fire', () => {
    // Two-dish menu. One dish has 1 unit of key ingredient (game-
    // plate); the other has plenty (chicken-plate). Chicken-plate
    // is priced attractively (well below suggested) so it's the
    // preferred substitute. Over a 15-min dinner, once the game-
    // plate runs out, subsequent guests wanting it should either
    // substitute (30%) or walk (70%).
    const script: { atSec: number; action: SimAction }[] = [
      // Enough game for 3-4 plates (short-delivery from meat-game
      // reliability 0.80 may drop this by 1); chicken plentiful.
      { atSec: 1, action: { type: 'BUY_STOCK', supplierId: 'meat-game',  ingredientId: 'game',     units: 4 } },
      { atSec: 2, action: { type: 'BUY_STOCK', supplierId: 'wholesaler', ingredientId: 'chicken',  units: 30 } },
      { atSec: 3, action: { type: 'BUY_STOCK', supplierId: 'wholesaler', ingredientId: 'root-veg', units: 60 } },
      { atSec: 4, action: { type: 'BUY_STOCK', supplierId: 'local-veg',  ingredientId: 'herbs',    units: 30 } },
      { atSec: 5, action: { type: 'COMPOSE_MENU', dishes: [
          { dishId: 'game-plate',    price: 400 },   // above suggested 385
          { dishId: 'chicken-plate', price: 100 }    // below suggested 175
      ] } },
      { atSec: 6, action: { type: 'SKIP_LUNCH' } },
      { atSec: 60, action: { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: 15 } }
    ];
    // runUntilSec = 900 lands mid-dinner (opens at t=60, service
    // starts at t=190, ends at ~t=1090). Reading counters at 900
    // catches events before day rollover clears state.day. Counters
    // (state.day.substitutedCount / walkedCount) are used instead
    // of the eventStream because the eventStream ring buffer
    // (STREAM_KEEP = 40) purges older entries as service continues.
    const r = runHarness({ seed: 42, script, runUntilSec: 900 });
    const substitutedCount = r.finalState.day.substitutedCount;
    const walkedCount      = r.finalState.day.walkedCount;
    console.log(`[M4a] game stock left=${r.finalState.stock['game']} chicken stock left=${r.finalState.stock['chicken']}`);
    console.log(`[M4a] substitutedCount=${substitutedCount} walkedCount=${walkedCount}`);
    console.log(`[M4a] final reputation: ${r.finalState.reputation.toFixed(3)} (initial 0.6)`);
    expect(substitutedCount, 'no substitute events fired — substitute mechanic broken').toBeGreaterThanOrEqual(1);
    expect(walkedCount, 'no walkout events fired — walkout mechanic broken').toBeGreaterThanOrEqual(1);
  });
});
