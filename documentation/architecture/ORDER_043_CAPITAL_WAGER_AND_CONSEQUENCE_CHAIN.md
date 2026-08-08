# ORDER 043 — The Service Round: Team, Wager and Consequence

**Version:** 3.0
**Status:** Awaiting Vision Owner approval. Not in force until approved.
**Class:** Sprint order — production (precedence level 7)
**Parent:** `ORDER_042_BUILD_FIRST_PLAYABLE_LOOP.md` §3.5
**Registry:** register in `ORDER_REGISTRY.md` before execution, per `CLAUDE.md` rule 9
**Recipient:** Claude Code

---

## 0. Prerequisites

Verify the order number against `ORDER_REGISTRY.md`. ORDER 042 must be merged to `main`. `LOOP_STATUS.md` rows 1–4 must read DONE on `main`.

**Supersedes ORDER 043 v2 entirely.** Phase A (two-layer capital state model, commit `0be34f3`) and the §4 theme-selection mechanics (`dd20fc1`, `d93241d`) remain valid and are carried forward. B.1's phenomena work is superseded by §5 below.

---

## 1. Why this order exists

ORDER 042 was played on 2026-08-08. The verdict: *the decision felt given — A was obvious — and since nothing else happens, it isn't much fun to play.*

Two things were missing: a stake, and consequence with weight. v2 added the wager and the chain. Playtesting v2's B.1 phenomena then exposed a deeper gap — **there was no business to stake anything in.** No round, no shift, no team, no end to the evening. The simulation ran forever at a constant, gentle rate; nothing could build, so nothing could break.

This version builds the round.

---

## 2. The day as the unit of play

A round is a day. Four periods:

| Period | What happens | Light |
|---|---|---|
| **Morning** | Business closed. The player holds funds, reviews the previous day, invests. | Bright, green |
| **Lunch** | Service, if the business runs lunch. | Full daylight |
| **Dinner** | Service. The principal period. | Dimming |
| **Night** | Service, for businesses that run it. Not all do. | Dark |

**The player chooses the length of each service, between roughly 3 and 30 minutes.** This is itself a wager: longer service yields more scenarios and more credit, and more chances to lose — and with a locked team, a long service runs the staff harder. Choosing a short service when the team is thin is a professionally correct decision, not a shortcut.

**Scenario count is random, weighted by service length.** Never a fixed cadence. There must be air between scenarios — stretches where the player simply watches the room work or fail to work. A scenario every ninety seconds is a quiz with a restaurant painted behind it. One problem may lead directly to another; that is a chain within the evening, distinct from the between-day chain in §8.

Night is a different kind of business — different staff, different economics, different social pressure. **Out of scope for this cycle.** Build morning, lunch and dinner.

---

## 3. The team

The player assembles a team and pays for it. Four roles this cycle — two front of house, two kitchen:

| Role | Cost | Competence |
|---|---|---|
| Runner | Low | Minimal experience, no training |
| Waiter | Medium | Experienced |
| Apprentice cook | Low | In training |
| Chef | High | Experienced, trained |

Cost is per hour of service, so a long service costs more in wages as well as in strain.

**This is a structural cost, locked for a set number of days.** The player cannot re-optimise between scenarios; the team stands, and the player lives with it. Locking is what makes the choice a choice.

**Per `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §7, the player never commands individuals.** Assembling a team is not directing staff: the player hires a chef and does not decide what she does on Tuesday evening. Staff act autonomously under current conditions. What the player buys is capacity and competence. Any interface that reads as "place your staff" violates the directive and must not be built.

### 3.1 Agency staff — the decision inside the evening

When pressure rises mid-service, the player may bring in agency staff. Expensive — several times the standing hourly rate — and available immediately.

**Declining is not "nothing happens".** The existing staff absorb the load, and social sustainability falls. The choice is not whether to solve the problem but **whether to pay in money or in people.**

This is also a blind wager: the player does not know whether the pressure will hold or ease in ten minutes.

The cost appears in tonight's accounts. The other cost appears three weeks later, when someone resigns.

---

## 4. The reputation loop

The central dynamic. It must emerge from the mechanics, not be asserted by a rule:

> Reputation raises demand → demand strains the staff → understaffing degrades service → degraded service lowers reputation.

And the temptation to understaff is economic — so **optimising the economy destroys its own basis.** This satisfies the constitution's requirement that no capital may be optimised in isolation without cost to another, and it satisfies it structurally rather than by decree.

**The delay is the point.** A decision made this morning punishes the player three evenings from now.

---

## 5. Reading the room

Phenomena must be legible before a wager is placed, and must be continuous functions of live state — never elements that appear when a scenario fires.

### 5.1 The queue is deliberately ambiguous

A queue means one of two opposite things: you are understaffed, or you are popular. **This ambiguity is correct and must be preserved.** Resolving it requires reading two quantities, not one:

- Queue long, room full → success.
- Queue long, room half empty → service is too slow.
- Queue long, people abandoning it → the evening is already lost.

A novice sees the queue and thinks business is good. Someone who knows the trade sees the queue *and* the room. **That is the competence the game teaches**, and it is why walk-aways must work — they are what distinguishes the cases.

**Lunch and dinner are read differently — by design.** After the room-flow retune (arrival base 12/min, period multipliers 0.6/1.0, waiting cap 12, dining × (2 − social), walk-away ceiling 0.2), the projection showed lunch never produces a queue at any social value. That is the intended shape:

- **Dinner is the queue reading.** Peak queue grows monotonically as social capital falls (2 → 4 → 4 → 5 → 7 across social 1.0 → 0.0). Pinned as a regression test — see `day.test.ts` "dinner queue grows monotonically as social falls." That invariant is what makes the queue a phenomenon, not noise; it must not slip in a future retune.
- **Lunch is the seat + walk-away reading.** Mean seated rises as social falls (staff bottleneck slows turnover), and walk-away volume tracks economic. A lunch queue is not the signal — its absence is *not a bug.* Do not "fix" it by pushing lunch's multiplier up to dinner's; that would flatten the two services into one and lose the reading contrast.

**The queue has been demoted from the primary social reading (2026-08-08).** The queue-persistence probe (`frontend/reports/queue-persistence.probe.ts`) measured mean dwell < 2 s at any social ≥ 0.3 — below the "buildable phenomenon" threshold. The event stream introduced by **Addendum A** now carries the primary social reading; the queue remains a *secondary signal* at very low social capital (~≤ 0.3) where dwell rises to 4–9 s and the standing line becomes visible. Do not tune diningDuration further to try to force the queue back — the fix is the event stream, not more turnover slowdown.

### 5.2 Two hardcoded caps must be lifted

Probing during v2 found two limits invisible from outside:

- `arrivals.ts` caps concurrent guests at 12.
- `service.ts` caps queue depth at 4 — arrival five is immediately marked declined.

**The second made the specification unsatisfiable**: a queue with a hard ceiling of four can never be a continuous function of anything. Record both in `APPROXIMATION_REGISTER` as the seventh occurrence of *"a simplified representation is not the structure"*.

### 5.3 Ecological — delivery rhythm

Delivery cadence as a function of ecological capital. Absence and rhythm cannot become symbols, and the slowness matches the fact that a poor supplier relationship does not show in one evening. Already built; carried forward.

---

## 6. Service can collapse

A service may end early.

The failures that end an evening are **consequences of staffing, never random accidents**:

- A runner with no training serves a Waldorf salad to a guest with a nut allergy.
- An apprentice pushed to the pass misses that the salmon is badly filleted.
- A contaminated board goes unnoticed; guests are poisoned.

Each is traceable to a morning decision. This teaches what actually goes wrong when competence is absent — which is the content of a culinary education — rather than teaching "train your staff" as a rule.

**Collapse must be rare and clearly traceable.** If every failure ends in a closed restaurant the player becomes risk-averse in the wrong way. There must be bad evenings that are merely bad.

---

## 7. The wager (carried from v2)

After a scenario resolves and before the next arrives, the player may stake credits on what the next scenario will concern. Optional; declining is legitimate and progresses more slowly.

Theme selection is weighted toward the player's weakest sustainability, with mandatory damping: a cap on consecutive recurrence, and a larger return on wins in weak areas. Formula and distribution already landed (`d93241d`): `weight = (1 − v)² + 0.05`, verified across 100 seeds.

The wager attaches to what is about to break in the room. **A stake token dragged onto a themed symbol is a menu with different graphics and is out of scope.**

---

## 8. Capitals, enablers, chain

Unchanged from v2 §3, §5, §6. Three sustainabilities (economic, social, ecological) are the outcome layer — staked, won, lost, invested. Two enablers (scientific, cultural) carry the Aristotelian registers and are **derived from behaviour, never purchased.**

Responses are scored on two axes: which sustainability moved, and which register was exercised. Register writes are hand-authored per response; deriving them from scenario shape would make the register a function of structure, which §5 of v2 explicitly warns against.

A sustainability crossing a threshold produces a concrete event that becomes a later scenario's situation.

---

## 9. What the player sees

**No competence meters.** A visible bar becomes a target to farm, and a farmed judgement bar is no longer judgement. Growth is **noticeable but not measurable**: a fourth response option appears where there were three; the mentor's remark reflects how the player acted; a situation that once cost staff becomes manageable.

Per `EXECUTIVE_DESIGN_DIRECTIVE_001.md`: no avatar, no mode picker, no numeric HUD dominating the view, no result popup, no XP or levels. Swedish player text via `strings.sv.ts`.

A portfolio may later show what the player has done — a history to revisit, never a dashboard to play against.

---

## 10. Build order

1. **The round.** Morning / lunch / dinner, player-chosen service length, random scenario count weighted by length, light shifting with the period.
2. **The team.** Four roles, structural cost, locking period, agency staff mid-service with the social cost of declining.
3. **The room reads.** Lift the two caps, tune arrival pressure against service period, make walk-aways legible.
4. **The reputation loop.** Demand as a function of reputation; strain as a function of demand against team capacity.
5. **Wager and chain** on top of the above.
6. **Collapse**, last — it needs everything else to be traceable.

**Report at each step.** Steps 1 and 2 change what the game is; do not proceed past either without the Vision Owner seeing it run.

---

## 11. Acceptance

Complete when the Vision Owner can play **a full day — morning investment, one service, closing** and report:

1. That the team decision mattered, and that its cost was felt during service.
2. That the wager was a real decision — reading the room mattered.
3. That a loss visibly shaped something later.
4. That no single response dominated.

Then a second and third day, to test whether the reputation loop and the between-day chain are felt.

---

## 12. What this order is for

ORDER 042 proved the loop runs. Playing it proved the loop is not yet a game, and building v2's phenomena proved there was no business for a game to happen in.

This order builds the business: a day, a team, a service that can be chosen and can collapse. The wager and the chain were already right — they had nowhere to live.

Everything here came from playing, not from specification. If a mechanic reads wrong, change what is staked and what is read; do not remove the stake. A restaurant without risk has been tested, and the verdict is in §1.
