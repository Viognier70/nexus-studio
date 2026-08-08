# LOOP STATUS

**The only question this file answers:** how much of the playable loop exists?

Four elements. Rows 1 and 2 track ORDER 042 §3 as shipped. Rows 3 and 4 reformulated 2026-08-08 to track `ORDER_043_CAPITAL_WAGER_AND_CONSEQUENCE_CHAIN.md` v3 §11 acceptance criteria — v2's "judgement moment" and "visible consequence" formulations turned out to describe mechanics without a business to live in.

Update rule: every order that touches §3 updates the matching row in the same commit. One line per row. No prose.

---

| # | Element | Status | Evidence |
|---|---------|--------|----------|
| 1 | **The business exists** — a building that reads as the player's, reachable by zoom, interior visible | DONE | `d92f700`, `db99fd3`, `189a302`, `84a63f9` — `w869907975`, VINBAREN, roof crossfade working |
| 2 | **Time runs** — simulation ticks, guests arrive and leave unattended | DONE | `afe2f2c` — `SimulationProvider` + `InteriorGuests`, 45 tests green |
| 3 | **The service round with a team** — a day (morning / lunch / dinner), player-chosen service length, a hired team locked for N days, agency staff callable mid-service at the money-vs-people trade-off | NOT STARTED | v3 §2, §3, §10 steps 1–2 |
| 4 | **Consequence with weight** — reputation loop (staffing → demand → strain → reputation), wager on room-visible signals, loss shapes a later scenario, services can collapse from traceable failures | NOT STARTED | v3 §4, §6, §7, §10 steps 3–6 |

---

## Is it fun?

**Partly, 2026-08-08.** The loop runs end-to-end at ORDER 042 shape — the room, the tick, walk-in-of-five, the mentor comment. Playing it exposed two gaps that no further tuning of the existing mechanics could fill: **no stake** (choice A was obvious because nothing was at risk) and **no weight** (the visible consequence was one puck moving 2 m). ORDER 043 v2 added the wager and the chain; playtesting v2's B.1 phenomena then exposed the deeper problem that there was no business for the wager to live in — the sim ran forever at a constant gentle rate, nothing could build, so nothing could break. v3 rebuilds around a day, a team, and a service that can be chosen and can collapse. The answer will be re-askable when v3 §10 step 2 (the team) lands.

## Known defects, non-blocking

- Dev server may bind 5174 when 5173 is in use.
- Guest cycle at speed=1 runs ~55 sim-s per guest; the mentor comment surfaces at simTime+35 while some guests are still dining. Design decision, not a bug — the mentor line reads as mid-service observation, not a post-mortem.

## Deliberately parked

ORDER 040 §6 (39 overlapping pairs, including the church), the twelve `vw-named-*` confirmations, the SD directive on appearance vs. location. None of these block the loop. All of them will feel more urgent than they are.
