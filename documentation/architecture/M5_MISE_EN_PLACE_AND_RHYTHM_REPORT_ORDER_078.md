# M5 — Mise en place + rhythm (report gate under ORDER 078)

**Status:** Report gate. Opens implementation when committed.
**Parent:** `ORDER_052_MISE_EN_PLACE_AND_THE_CAUSE.md` §9 steps 2 + 3 + 5 + 6 (with the model + form report gates §2 + §3 explicitly asks for), consolidated into one file per cohesive-block execution.
**Milestone target:** `STRATEGIC_TRACK_MILESTONES_PROPOSAL.md` §M5.

Also carries two side-notes per ORDER 078: **§8** — the M4b attractiveness-weighting assessment ("is it M8-blocking?"). **§9** — the M7 upstream-blockage status check on ORDER 049 §5.1 + §1 volume.

---

## 1. Purpose

Close M5 DoD 1–4:

1. Player can look at prep panel and see **five concrete inventory items** with per-item readiness — not one aggregate percentage.
2. **Rhythm reads in room without opening a panel** — at a glance the player knows whether the room is working in time or chasing itself.
3. First door-open in a service always fires the **after-countdown line** in the plain register.
4. Stream panel never renders taller than its contents.

DoDs 1, 3, 4 are AUTONOMOUS via INFRA-2 + a tiny DOM measurement. DoD 2 is GATE (Vision Owner "at a glance" is prose judgement); §6.3 of the milestone proposal already routes the residual into M8. This report gate treats DoDs 1 + 3 + 4 as M5 close and DoD 2 as "mechanic installed, Vision Owner sight-read at M8" — same shape as M6's mechanic/prose split.

## 2. Mise en place model (ORDER 052 §2 report gate)

Five concrete inventory items, chosen so each corresponds to a physical station and can shortfall independently:

| id | station | note |
|---|---|---|
| ice        | bar        | drinks service starves without it |
| napkins    | dining floor | table turn without them is visible |
| cutlery    | dining floor | the butter-knife case from ORDER 052 §1 |
| stations   | kitchen line | prep station setup — mise en place proper |
| garnish    | pass       | plating dressing, the final touch |

Each item is `readiness ∈ [0, 1]`. Prep readiness = min over items (weakest station bottlenecks the service, same shape as the collapse formula's `weakest = min over axes`).

**Model** — per-item readiness at doors-open:

```
readiness[item] = clamp01(
  baseFromTeam[item] × prepFraction × moraleBoost × (1 − morningChangePenalty) × capacityLoad
)
```

Where:
- `baseFromTeam[item] = min(1, teamSizeFraction × axisCompetence[item])` — the axis a station reads: ice/garnish read `cultural`, stations reads `scientific`, cutlery/napkins read `practical`. Axis mapping mirrors the collapse formula's `weakestAxis` reading.
- `prepFraction = min(1, actualPrepSeconds / PREP_DURATION_SEC)` — SKIP_PREP or a shortened prep produces a linear cut. Anchors the "prep length is the player's own choice" mechanic from §2.
- `moraleBoost = 0.9 + 0.2 × state.morale` — morale in `[0, 1]` maps to `[0.9, 1.1]`, small effect. Poor morale drags every station a little; excellent morale lifts a little.
- `morningChangePenalty = 0.15 × state.day.morningPolicyChanges.length` (cap 0.6) — the improvised-menu case; morning changes eat prep time. This is the ORDER 052 §2 "a menu rewritten that morning eats the prep window."
- `capacityLoad = 1 − 0.1 × max(0, coversExpected / 30 − 1)` — a bigger room load pulls readiness down (only above 30 covers). Anchors the "what the business is carrying" clause of §2.

Reported once at doors-open; recorded on `state.day.prepReadiness` for the whole service. Not re-computed per tick — the shortfall becomes causal input to eventStream (via ORDER 076's `causeTag` vocabulary — see §6 below), not a live rolling instrument.

## 3. Rhythm + pulse (ORDER 052 §3 form gate)

**Form pick: staff-puck colour ring.** Rejecting the diagram and the beside-panel pulse because:
- A diagram is a new instrument, and EDD §11 + ORDER 050 Addendum A §6.5 say the room stays the protagonist.
- A beside-panel pulse duplicates the existing instrument panel's shape.
- A colour ring on the existing staff pucks in the room reads without shifting the eye, and requires no new geometry.

Ring colour = per-staff current-load reading:
- `load = staff.workload` clamped in `[0, 1]`.
- `load < 0.4` → green `#7bce8f` (working in time)
- `0.4 ≤ load < 0.7` → amber `#e8c169` (steady, no slack)
- `load ≥ 0.7` → red `#d97070` (chasing itself)
- Ring only visible during `lunch` or `dinner` period. Absent in morning / opening / prep / evening.
- 3 mm ring around the existing puck circle; opacity 0.85 so it reads without dominating the puck's own colour.

Aggregated **service rhythm**: `state.day.serviceRhythm ∈ {'green','amber','red'}` = worst puck this tick (min over staff loads mapped to colour). Only used by the DoD 2 GATE sight-read and by future ORDER 076 cause-tag rules (a `red` rhythm signals a `strain` chain). Not surfaced in a numeric panel.

## 4. After-countdown line (ORDER 052 §6, §9 step 3)

At the door-opening tick (`prepEndsAt` crossed, `doorsOpenedThisService` flips true) the reducer posts one `plain-register` event-stream line. Wording keyed on `state.day.prepReadiness`:

- All items ≥ 0.7: `"Doors open — the room is ready."`
- Weakest item < 0.4: `"Doors open — ${weakestItem.station} is thin (${weakestItem.id})."`
- Otherwise: `"Doors open — service begins."`

Category `ambient`, `kind='doors_open'`, `causeTag` set to `short_prep` when weakest < 0.4 (extends ORDER 076 §3 vocabulary with a concrete producer for that tag).

## 5. Stream panel sizing + direction (ORDER 052 §5, §9 step 2)

**DoD 4 is likely already satisfied.** The panel at `frontend/src/strategic/ui/EventStreamPanel.tsx:57–78` uses no explicit `height`/`minHeight`; it grows from contents. Comment lines 47–50 already document this decision under ORDER 047 §3. What M5 adds:
- **DoM measurement test**: render the panel with 1 entry and with 4 entries; assert the 4-entry version is taller and the 1-entry version has height ≤ 4-entry version × 0.5. Uses jsdom + `getComputedStyle` on the panel container. If the panel already sizes-to-content this test passes on the first run — that's the correctness claim, not something to build.

**Direction.** Current implementation reads bottom-up (newest at top after slice). The Vision Owner ask in ORDER 052 §5 was "pick one direction and hold it" — the code already does. What's missing is the ORDER 052 §5 acknowledgement in the file header. M5 adds a comment stating the chosen direction (newest at top) so a future editor sees the choice was made, not accidental.

## 6. Cause-tag extension (integrates with M6)

The five inventory items compose into two existing `causeTag` values:
- `short_prep` — fires when `prepReadiness.min < 0.4` and the event's station matches the weakest one. Enriches the M6 vocabulary with a specific producer: not just "any short prep" but "the ice was thin, so the drink was late."
- `low_competence` — the axis→station mapping means a low `scientific` competence produces a low `stations` readiness, which fires the same tag path.

No new `causeTag` values added by M5. Report gate: this is deliberate — M5 makes existing tags more specific by feeding them actual measurements, not by growing the vocabulary.

## 7. DoD verification

Autonomous tests in `frontend/src/strategic/simulation/__tests__/m5.test.ts` via INFRA-2 harness:

1. **DoD 1** — open a service with a normal script, tick past doors-open, assert `state.day.prepReadiness` is a 5-key record with each value in `[0, 1]`.
2. **DoD 2 mechanic-only** (GATE portion deferred to M8) — assert `state.day.serviceRhythm` transitions through at least two distinct colours across a 15-minute dinner as guest load rises + falls. Sight-read remains M8's job.
3. **DoD 3** — script an OPEN_SERVICE, tick past `prepEndsAt`, assert at least one event stream entry has `kind === 'doors_open'` and text starting with `"Doors open —"`.
4. **DoD 4** — DOM test in `frontend/src/strategic/ui/__tests__/EventStreamPanel.test.tsx` renders the panel with 1 vs 4 entries and asserts height scales.

Plus type-check + full sim + build green.

## 8. M4b assessment (ORDER 078 §2) — is attractiveness weighting M8-blocking?

**Answer: YES, it is M8-blocking.**

Under M4 as it landed, guest-dish draws are uniform-random among available menu dishes. That means:
- Price is applied when a dish is drawn, so setting a dish price changes **margin per plate**.
- But the DRAW RATE per dish is independent of price.
- Therefore raising a dish's price has no effect on demand, and lowering it does not accelerate a run-out.
- Therefore "price a popular dish too low and it runs out before service ends — unless you planned for it" (ORDER 051 §1, the load-bearing lesson) **does not actually fire**. The player can price attractively or unattractively with no differential outcome beyond margin arithmetic.

Cross-check against the ORDER 051 §8 acceptance script that M8 will hold Vision Owner sight-read against:
- ✗ Item 2 — *"That setting a price felt like a bet on how the room would respond."* Fails: prices don't move demand, only margin.
- ✓ Item 3 — *"That watching plates run down during service was worth watching."* Holds: draw-down is visible.
- ✗ Item 4 — *"That running out of a dish was a consequence he could trace to his own pricing."* Fails: run-outs trace to stock quantity vs guest count, not to price.
- ✓ Item 5 — *"That the ecological reading finally pointed at something he had actually done."* Holds: supplier `ecoDelta` fires per unit.

Two of the six §8 acceptance items fail under uniform-random draws. That's a hard M8 block: M8 is the moment the Vision Owner reads the acceptance script and says done/not-done, and two items reading "not done" is not something a Vision Owner sign-off will absorb.

Vision Owner's paraphrased M8 criterion — *"the player can formulate what they would do differently"* — cannot be met on pricing. The player has no lever to describe a pricing lesson, because there is no pricing lesson to learn.

**Recommendation, filed for Vision Owner course-correct at the top of the next order:**

Split M4b into two: **M4a** carries the attractiveness weighting + substitution/walkout split; **M4b** carries the pure-content residuals (wine, package menus, `ingredientTier` retirement, stock ageing).
- M4a sits on the critical path to M8, immediately after M5.
- M4b stays where it is (parallel with M7, no M8 dependency).

Sizing note: M4a is a small numeric addition to `drawMenuDishForGuest` in `reducer.ts` — a weight per menu entry, e.g. `weight = exp(−(price − suggestedPrice) / suggestedPrice × K)` with `K ≈ 2`. Plus the 30/70 substitute/walkout split I already deferred in the M4 report §12.a. Estimated cost: half the work M4 itself carried.

**This report gate does not build M4a.** ORDER 078 explicitly said *"bygg inte om något nu"* — the assessment is the deliverable; the build is filed for the next order.

## 9. M7 upstream blockage status (ORDER 078 §3)

**Status: PARTIALLY UNBLOCKED.**

Evidence:

- `reports/knowledge/questions.json`: **272 questions approved** (over the ≥ 50 threshold implied by M7's DoD). Register distribution: episteme 118 / techne 24 / phronesis 130. Wired into the game as of commit `7f4baa1` "feat: ORDER 049 §7 step 3 — bank picks replace hand-authored questions."
- The knowledge-generate script exists and runs at volume (ORDER 049 §7 step 1 already delivered).
- ORDER 049 §5.2 (player panel + valuation + sell) landed under commits `aa6e061` (sim), `d0ad5a6` (UI).

Remaining blockers:

1. **All 272 approved questions are `role: chef` only.** M7's per-scenario question drawing needs coverage across the other three roles (`värd` / host, `servitör` / waiter, `sommelier`). This is a **run-the-existing-script-again** step, not a build step — the generation pipeline is proven. Estimated cost: one authoring pass per role.
2. **ORDER 049 §5.1 answer-to-loan mapping — report gate not opened.** ORDER 049 §7 step 8 says *"Report the mapping from answers to loan amount before building"* and that report has not been filed. This IS a build-blocking gate — the bank meeting scene cannot land without the mapping.

Net: M7 can start on the first two thirds — draw questions during service, feed enablers, lift ceilings — for chef-only scenarios TODAY. The bank meeting scene and multi-role coverage need one report + one generation pass respectively before full M7 close.

**Recommendation:** M7 remains after M5 + M4a on the milestone list, but the block-open threads for M7 should be split:
- **M7a** — service-question flow for chef (unblocked, ready to build; requires only INFRA-2 harness support).
- **M7b** — bank-meeting scene (blocked pending ORDER 049 §5.1 answer-to-loan mapping report).
- **M7c** — multi-role question coverage (blocked pending three additional knowledge-generate runs).

Same shape as the M6/M6b split done under ORDER 077 §2: a block that can land now, and its content-quality continuations filed separately so neither hides behind the other.

## 10. Scope in / out

**In:** the five-item prep readiness model, the staff-puck colour ring, the door-open line, the stream panel measurement test.

**Out (deferred to M8 or later):**
- Vision Owner "at a glance" sight-read of the rhythm reading (M8 acceptance moment; M5 installs the colour ring, M8 confirms it reads).
- Any rewrite of existing stream sentence banks (M6b territory).
- Any per-item recovery mechanic mid-service (readiness is fixed at doors-open; a low ice reading stays low all service).
- Rhythm visualisation for kitchen or non-visible staff (only the pucks in the room get the ring).

## 11. What "opens" this gate

Under ORDER 078 cohesive-block execution the report gate opens when this file is committed. Implementation proceeds against the values above unless Vision Owner course-corrects on:
- the axis→station mapping (§2),
- the colour thresholds `0.4 / 0.7` (§3),
- the recommendation to promote M4a onto the M8 critical path (§8),
- the M7 split into M7a/M7b/M7c (§9).

The M4a promotion and M7 split are recommendations, not commitments. This order does not touch M4 or M7 code; it flags them for the next order.
