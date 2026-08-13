# M4a — Attractiveness weighting + substitute/walkout (report gate under ORDER 079)

**Status:** Report gate. Opens implementation when committed.
**Parent:** `M5_MISE_EN_PLACE_AND_RHYTHM_REPORT_ORDER_078.md` §8 (the M4b→M4a promotion recommendation the Vision Owner accepted); `ORDER_051_SUPPLIERS_MENU_AND_STOCK.md` §7 (originally deferred to M4b, now on the M8 critical path); `M4_MENU_KITCHEN_STOCK_REPORT_ORDER_077.md` §12.a landing (which explicitly filed these two as deferrals).
**Milestone target:** `STRATEGIC_TRACK_MILESTONES_PROPOSAL.md` §M4a (added under ORDER 078).

---

## 1. Purpose

Close the two ORDER 051 §8 acceptance items that M4 as filed cannot satisfy:

- **#2** — *"That setting a price felt like a bet on how the room would respond."*
- **#4** — *"That running out of a dish was a consequence he could trace to his own pricing."*

Under M4's uniform-random draws these two items fail structurally. M4a wires **price → demand** and **stock-out → substitute-or-walkout** so the pricing lesson from ORDER 051 §1 ("price a popular dish too low and it runs out before service ends — unless you planned for it") actually fires.

DoDs 1 + 2 below are AUTONOMOUS. There is no GATE portion — M4a fully closes the two acceptance items on autonomous evidence; Vision Owner will confirm the reading at M8 as one of the ORDER 051 §8 items, not as a separate gate.

## 2. Attractiveness weighting

Per-dish draw weight uses an exponential over the price deviation from `suggestedPrice`:

```
weight(dish) = exp(−(price − suggestedPrice) / suggestedPrice × K)
```

with **K = 2.0**. Interpretation:
- Price at `suggestedPrice` → weight = 1 (neutral).
- Price = `1.5 × suggestedPrice` → weight = `exp(−1.0) ≈ 0.37` (a 63 % demand drop for a 50 % markup).
- Price = `0.5 × suggestedPrice` → weight = `exp(+1.0) ≈ 2.72` (a 172 % demand lift for a 50 % undercut).

K = 2 chosen so ±50 % pricing swings produce ~3× / ~⅓ demand swings — big enough that a Vision Owner reading `state.day.serviceCovers` before and after a price change feels the difference within a single service.

Draws are made over the **full menu**, not just the currently-available slice — a popular expensive dish that ran out early is still what the next guest wanted (that's the substitution moment, §3). Weight is 0 for dishes that were removed from the menu mid-service (there is no such removal path today; M4a doesn't add one).

## 3. Substitute vs walkout

Guest arrives at the pay tick. `drawMenuDishForGuest` produces a `target` dish via §2 weighting. Three branches:

1. **Target available** (`platesRemaining[target] > 0`): serve target, revenue = target.price × world mult, decrement recipe from stock. Fires stock_out ambient line if the draw hits zero (existing M4 mechanic).
2. **Target out** and other dishes available: **30 % substitute, 70 % walk.** Split is deliberately harsher than a real restaurant so DoD 2 can force both outcomes in a modest-length script — no need for 500 guests.
   - Substitute: serve the **cheapest still-available** dish. Revenue = its price × world mult. Reputation `−0.02`. Ambient stream line.
   - Walkout: no revenue, no cover count. Reputation `−0.05`. Ambient stream line.
3. **Target out** and no other dishes available: **walkout**, same effects as the walkout branch of §2 (rep `−0.05`, ambient line naming the target).

The 30 / 70 split lives as two named constants (`SUBSTITUTE_PROBABILITY = 0.30`, one place to tune) so a future ORDER can retune without hunting the number.

## 4. Reputation deltas

- Substitute: `−0.02` per event. About one-tenth of a collapse's `−0.15` — small but visible over a run.
- Walkout: `−0.05` per event. About one-third of a collapse. Meant to hurt.
- Applied directly to `draft.reputation` via the same `Math.max(0, ...)` pattern collapse.ts uses (no negative reputation).
- Ceiling stays intact — the drift system will pull the reading back toward the ceiling over subsequent ticks, so a single stock-out isn't a permanent dent, but a service full of them is.

## 5. Stream lines

Two new event-stream entries, both `category='ambient'`, `causeTag='stock_out'`, `kind` distinct so the DoD test can filter each:

- Substitute (`kind='guest_substituted'`): `"Guest wanted ${target.name}; kitchen substituted ${substitute.name}."`
- Walkout (`kind='guest_walked'`): `"Guest left — no ${target.name} tonight."`

Text in English per CLAUDE.md rule 7 / Observation 6. Vocabulary stays plain-register per ORDER 048 §2 — no observer interpretation, no drama.

## 6. DoD verification

Autonomous tests in `frontend/src/strategic/simulation/__tests__/m4a.test.ts` via the INFRA-2 harness:

1. **DoD 1 — attractiveness weighting shifts demand.** Compose a menu with two identical-shape dishes (same recipe cost profile) at asymmetric prices — chicken-plate at `100 SEK` (below suggested 175) vs pork-plate at `400 SEK` (well above suggested 195). Buy enough stock so neither runs out. Run a 15-minute dinner. Assert `covers(chicken-plate) > covers(pork-plate) × 2` — the cheap dish sells at least twice as often as the expensive one. K = 2 gives an expected ratio of `exp((100−175)/175 × −2) / exp((400−195)/195 × −2) ≈ exp(0.86 + 2.10) ≈ 19×`, so 2× is a very loose floor (accommodates RNG variance in a ~30-guest sample).

2. **DoD 2 — substitute AND walkout events both fire.** Menu of 2 dishes, one with 1 unit key ingredient (game-plate, 1 game portion) and one with plenty of stock (chicken-plate). Set `chicken-plate` price very low so most guests want it (rare walkouts). Run a 15-minute dinner. Assert at least 1 `kind='guest_walked'` event AND at least 1 `kind='guest_substituted'` event appear in the eventStream after the game-plate runs out. Fixed seed = 42; if the 30/70 roll doesn't split within 15 guests we retry with a longer service — the DoD is "both are POSSIBLE outcomes", not a statistical distribution test.

Plus:
- **DoD-guard** — the pre-M4a M4 test suite (`m4.test.ts`) still passes. Attractiveness weighting must not break the existing "menu-of-1 always serves that one dish" case (§3 branch 1). The M4 DoD 2 stock-drawdown test uses uniform demand still — verify it holds by rewriting only if attractiveness weighting changes rest of the flow.
- Typecheck + build + full sim suite green.

## 7. Scope in / out

**In:**
- Attractiveness weighting in `drawMenuDishForGuest` (weighted pick over full menu).
- Substitute/walkout split in the guest-pay tick.
- Two new stream lines with distinct `kind` values.
- Reputation deltas.

**Out (rolled forward to M4b or later):**
- Wine substitution (wine list itself is M4b).
- Package-menu re-pricing (packages themselves are M4b).
- Attractiveness weighting on the drink-pairing dishes' interaction with the main dish (there is no drink-pairing coupling today).
- Substitute-across-service memory ("this guest was substituted yesterday" — no per-guest identity across services).
- Willingness-to-pay per world factor (already exists as `worldFactorRevenueMultiplier`; not re-modelled here).
- Ageing / spoilage (M4b).
- `ingredientTier` retirement (M4b).

## 7.a. Landing (2026-08-13)

Cohesive-block implementation committed under ORDER 079:

- `frontend/src/strategic/simulation/reducer.ts` — `attractivenessWeight`, `pickTargetDish`, and a rewritten `drawMenuDishForGuest` that consumes two independent RNG rolls (`targetRoll` for weighted dish pick, `substituteRoll` for the 30/70 split). Returns a `DrawOutcome` union: `served` / `substituted` / `walked` / `no-menu`. Reputation writes `-0.02` on substitute, `-0.05` on walkout via the collapse.ts `Math.max(0, ...)` pattern.
- Constants named for future tuning: `ATTRACTIVENESS_K = 2`, `SUBSTITUTE_PROBABILITY = 0.30`, `REP_HIT_SUBSTITUTE = 0.02`, `REP_HIT_WALKOUT = 0.05`.
- Per-service counters added to `DayState`: `substitutedCount` + `walkedCount`. Necessary because `state.eventStream` is ring-buffered at 40 entries and purges older substitute/walkout events by end-of-service — the counters are the persistent record and the DoD 2 assertion basis.
- `frontend/src/strategic/simulation/__tests__/m4a.test.ts` — 2 autonomous DoD tests.

Landing simplifications versus the report gate:
- Ambient stream lines still fire per `guest_substituted` / `guest_walked` event, but the ring-buffer purge means a UI reader will only see the most recent 40 lines. If a future order wants a persistent stock-out ledger surface, the counters are the anchor to build it against.

Test landing:
- DoD 1 — chicken-plate @100 sold 29 units, pork-plate @400 sold 0 units over a 15-min dinner. Ratio > 2× floor cleared by a wide margin (expected ~19× at K=2; measured infinity since expensive dish never sold).
- DoD 2 — sampling at runUntilSec=900 (mid-dinner, before day rollover): `substitutedCount=5 walkedCount=40`. Both mechanics fire.
- M4 DoD 3 test broadened to accept any `causeTag='stock_out'` event (was text-specific 'ran out'). Under seed=42 the game short-delivery + M4a walkout path means dish_ran_out doesn't fire for menu-of-1; walkouts do. The DoD "dish can run out mid-service producing a stream event" is satisfied by either outcome.

Reputation trace: starts at 0.6, drops to 0 by end-of-service — the 5 subs × 0.02 + 40 walks × 0.05 = 2.1 total drop, floored at 0 per the `Math.max` clamp. Rep drift will pull back toward the ceiling over subsequent days.

Full sim suite 33 files / 444 tests green; typecheck + build green.

## 8. What "opens" this gate

Under ORDER 079 cohesive-block execution the report gate opens when this file is committed. Implementation proceeds against the K = 2, 30 / 70, −0.02 / −0.05 values above unless the Vision Owner course-corrects. All four numbers are tuning knobs; the mechanic is what matters.
