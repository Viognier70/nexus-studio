# LOOP STATUS

**The only question this file answers:** how much of the playable loop exists?

Four elements, from `ORDER_042_BUILD_FIRST_PLAYABLE_LOOP.md` §3. Nothing else belongs here — not world work, not validators, not documentation. Those have `ORDER_REGISTRY.md`.

Update rule: every order that touches §3 updates the matching row in the same commit. One line per row. No prose.

---

| # | Element | Status | Evidence |
|---|---------|--------|----------|
| 1 | **The business exists** — a building that reads as the player's, reachable by zoom, interior visible | DONE | `d92f700`, `db99fd3`, `189a302`, `84a63f9` — `w869907975`, VINBAREN, roof crossfade working |
| 2 | **Time runs** — simulation ticks, guests arrive and leave unattended | DONE | `afe2f2c` — `SimulationProvider` + `InteriorGuests`, 45 tests green |
| 3 | **The judgement moment** — a decision that is a real trade-off | BLOCKED | Scenario/building mismatch, see below |
| 4 | **Visible consequence** — the decision changes the rendered room | NOT STARTED | — |

---

## Is it fun?

**Unanswered.** The question cannot be asked until element 4 is built. Elements 1 and 2 alone are a world with a clock in it.

## Open block on element 3

ORDER 042 §1 premises candidate C — `w869907963`, 252 m², sit-down — and justifies *walk-in-of-eight* on the grounds that eight guests almost fit there.

§3.1 swapped the player business to candidate A — `w869907975`, 146 m², 11.8 × 15.6 m, six tables.

On candidate A, eight guests is not a trade-off; it is a capacity limit. `RESOLVE_SCENARIO` currently schedules 8/8/3. Either the scenario changes to one that is a genuine dilemma at café scale, or the building changes back. Building the scenario before this is settled produces a decision that isn't one — and then element 4 cannot be evaluated, because a flat loop won't distinguish "the loop is boring" from "the scenario was wrong".

Inherited artefact: `interiorLayout.ts` still carries a comment referencing the 252 m² footprint and a 10.8 × 38.5 m bbox. Stale from candidate C.

## Known defects, non-blocking

- View turns brownish-red at full transparency.
- Dev server may bind 5174 when 5173 is in use.

## Deliberately parked

ORDER 040 §6 (39 overlapping pairs, including the church), the twelve `vw-named-*` confirmations, the SD directive on appearance vs. location. None of these block the loop. All of them will feel more urgent than they are.
