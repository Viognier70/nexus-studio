# LOOP STATUS

**The only question this file answers:** how much of the playable loop exists?

Four elements, from `ORDER_042_BUILD_FIRST_PLAYABLE_LOOP.md` §3. Nothing else belongs here — not world work, not validators, not documentation. Those have `ORDER_REGISTRY.md`.

Update rule: every order that touches §3 updates the matching row in the same commit. One line per row. No prose.

---

| # | Element | Status | Evidence |
|---|---------|--------|----------|
| 1 | **The business exists** — a building that reads as the player's, reachable by zoom, interior visible | DONE | `d92f700`, `db99fd3`, `189a302`, `84a63f9` — `w869907975`, VINBAREN, roof crossfade working |
| 2 | **Time runs** — simulation ticks, guests arrive and leave unattended | DONE | `afe2f2c` — `SimulationProvider` + `InteriorGuests`, 45 tests green |
| 3 | **The judgement moment** — a decision that is a real trade-off | DONE | `092cca1`, `3f85e96`, `28d9cfe` — walk-in-of-five, phase model (subject → difficulty → situation), ScenarioOverlay, key-5 manual trigger, 70 tests green |
| 4 | **Visible consequence** — the decision changes the rendered room | DONE | `092cca1`, `3f85e96` — 5 guests visibly arrive → sit → leave over ~55 sim-s; mentor comment surfaces in-world (drei &lt;Html&gt;) at simTime+35 |

---

## Is it fun?

**Now askable.** Load the app, press key 4 to zoom into the player business, press key 5 to trigger walk-in-of-five immediately (or wait ~30 s for the auto-trigger). Walk through subject → difficulty wager → situation → response (A/B/C). Watch the room fill up. Mentor comment appears in the world after ~35 sim-seconds. Key R resets so the loop can be replayed with a different (choice × difficulty) combination.

## Known defects, non-blocking

- Dev server may bind 5174 when 5173 is in use.
- Guest cycle at speed=1 runs ~55 sim-s per guest; the mentor comment surfaces at simTime+35 while some guests are still dining. Design decision, not a bug — the mentor line reads as mid-service observation, not a post-mortem.

## Deliberately parked

ORDER 040 §6 (39 overlapping pairs, including the church), the twelve `vw-named-*` confirmations, the SD directive on appearance vs. location. None of these block the loop. All of them will feel more urgent than they are.
