# Strategic Track — Milestone Proposal

**Status:** Proposal — awaiting Vision Owner approval.
**Version:** 1.0 (2026-08-12)
**Author:** Claude Code, under ORDER 063.
**Scope:** The strategic view of Grythyttan + the restaurant service simulation running on top of it. Everything ORDER 043–062 has touched *except* the first-person prologue (VERTICAL_SLICE_001), which is treated separately in §5.

---

## 0. Why this document exists

The ORDER 062-thread audit surfaced a gap: the strategic track has no spec, no Definition of Done, and no milestone list. The accumulated order stack (043–062) is the de-facto backlog. Without milestone grouping it is not possible to answer "how far to a shippable slice?" — orders are numbered by issuance date, not by what must ship together.

This proposal derives M1..M8 from the existing order stack by asking a different question of every open thread: *what must work alongside this for the player to complete a loop that reads?* Orders that share a loop are grouped into the same milestone even when they were issued weeks apart.

The proposal changes no code and merges no orders. It offers a structure to plan against; the Vision Owner remains the authority on scope, sequence, and cut lines.

---

## 1. Milestone summary

| # | Name | Kind | Status | Blocking open threads |
|---|---|---|---|---|
| M0 | Village + room baseline | RENDER | ~95 % (2 tail items) | 057 Del D, 061 pt3 fog verification |
| M1 | First playable loop | MIXED | LOOP FIRES; 3 readability defects | 052 §8 (three defects) |
| M2 | Morning legibility (activities visible) | MECHANIC + UI | Not started, backend absent | 050 §7 step 1 |
| M3 | Evening ledger visible | MECHANIC + UI | Backend built, no UI | 050 §7 step 3 UI |
| M4 | Menu + kitchen + stock | MECHANIC + UI | Not started | 051 §7 all steps |
| M5 | Prep + cadence in the room | MECHANIC + RENDER | Not started | 052 §9 steps 2, 3, 5, 6 |
| M6 | Cause-aware texture | CONTENT + MECHANIC | Not started | 052 §9 step 1 (rewrite banks) |
| M7 | Knowledge engine → bank meeting | MECHANIC + UI + CONTENT | Blocked upstream | 049 §5.1, §5.2, §1 volume review |
| M8 | Playthrough acceptance | GOVERNANCE | Not scheduled | — |

**M1 is the first milestone at which the "act → see consequence → want to repeat" bar is met.** See §3.

---

## 2. Per-milestone detail

### M0 — Village + room baseline

**Purpose:** the digital twin of Grythyttan reads as a place at any sun angle, and the restaurant room reads as a room.

**Deliverables (all present unless flagged):**
- OSM extraction + terrain + water + forest + roads (built, ORDER 053–056)
- ACES tone map + calibrated sun rig + fog (built, ORDER 054–055)
- Procedural facades per building, LOD 0/1 (built, ORDER 056–058)
- Correct roof + wall face normals (built, ORDER 060–061)
- Night lighting: emissive bands + lit-glass swap on 60 % flagged houses (built, ORDER 057 + 061)
- **Pending:** ORDER 057 Del D — checkered roof pattern + Torget poles
- **Pending:** ORDER 061 pt3 — pixel-sampler measurement + fog range verification (roofs may still read darker than the math predicts; measurement not yet gathered)

**DoD (objective, tickable):**
1. Vision Owner points camera at any village-scale view and confirms: no visible black surfaces where a lit face should be, at morning / lunch / afternoon / dinner / evening (five sightings).
2. Roofs render tegel / plåt / tjärpapp colour distinguishably at lunch strategic zoom.
3. Night-lit windows visible on strategic view at dinner (`nightFactor > 0.05`).
4. No building intersects an OSM-attested road (Point 1 rule from ORDER 061; register documents removals).
5. `npm run build` green; typecheck green; facade test suite green (405 tests currently passing).

### M1 — First playable loop

**Purpose:** the player can open a service, answer scenarios, and see an evening account that reads as consequence — and want to open the next service.

**Deliverables (all present unless flagged):**
- SET_POLICY morning action (training, pricing, ingredient tier) — built (ORDER 046)
- OPEN_SERVICE with 3–30 min length choice — built (ORDER 047)
- Scenario draw from stream (weighted, not deterministic) — built (ORDER 047)
- Capital + cash movement on scenario choice — built (ORDER 043 v3)
- Team hire/fire + agency staff mid-service — built (ORDER 043)
- Weather + world factors in opening panel — built (ORDER 045)
- Reputation loop (demand → strain → degrade → fall) — built (ORDER 043 §4)
- Evening account paragraph (six branches incl. mediocre) — built (ORDER 046 §3)
- Skala-ner reversible retreat — built (ORDER 043)
- Guests + staff render with attention-lean, arrival/departure — built (ORDER 044)
- **Defect A (ORDER 052 §8):** day-one valuation −229 kSEK (T2 loan too large for premises OR missing valuation input; report before fixing)
- **Defect B (ORDER 052 §8):** morning panels overlap spatially
- **Defect C (ORDER 052 §8):** all four quality readings show "Godtagbar" placeholder + revenue-per-seat dashes

**DoD (objective, tickable):**
1. From a fresh state, the player runs three consecutive days without desync.
2. Evening account text differs meaningfully across the three days based on the player's choices (not templated repetition).
3. The three ORDER 052 §8 defects are resolved or documented as accepted.
4. At the end of day 3 the player can articulate one thing the game asked them to try that they now want to try differently.

### M2 — Morning legibility (activities visible)

**Purpose:** what the player wagers each morning is concrete, named work — not abstract "social capital" — with three visible effect columns per activity.

**Deliverables:**
- Activity model + schema (name, three-column effect: economic / social / ecological)
- Activity allocation surface — morning panel adjacent to TeamPanel
- Reducer wiring: chosen activities post to enablers and to ledger
- Evening account references chosen activities by name
- Retirement or re-anchoring of the abstract theme-wager (ORDER 050 §5)
- **Feeds:** ORDER 050 §7 step 1 (activity model with three-column effects)

**DoD:**
1. Player picks 1–3 activities morning of day 1.
2. Every card shows econ / social / ecological effect visually (icons, numbers, or bars).
3. Evening account at end of day 1 names at least one chosen activity by name.
4. No activity states which sustainability it "serves"; the three numbers are the teaching (ORDER 050 §4 constraint).

### M3 — Evening ledger visible

**Purpose:** the player can inspect what actually hit cash tonight; every money-mover names its own line (Fortnox-analogue).

**Deliverables:**
- LedgerPanel UI reading `state.ledger` ring buffer (backend built, ORDER 050 §3 wired)
- Income / expense grouping; sortable by amount and time
- Click-through from evening account paragraph to relevant ledger line(s)
- Ledger persists across day boundaries within the same session
- **Feeds:** ORDER 050 §7 step 3 UI surface (backend already built)

**DoD:**
1. Player opens ledger from evening panel with one click.
2. Every scenario choice, wage payout, ingredient purchase, interest movement produces a labelled line.
3. Sum of ledger lines from a service reconciles with cash movement for that service (deterministic test).

### M4 — Menu + kitchen + stock

**Purpose:** replace the three-position `ingredientTier` dial with actual named dishes, supplier decisions, stock draw, and running-out events.

**Deliverables:**
- Supplier set (~6–8 suppliers) with four-axis numbers: price, quality, reliability, ecological reading impact
- Ingredient tier retired; menu composed morning of, priced by player
- Stock buy-before-service → draw-down-during-service → visible plates-remaining reading
- Running-out event: posts to stream, costs satisfaction + reputation
- Leftover stock persists across days but ages
- Package menus (3/5/7-course fixed) as distinct decision (Vision Owner report gated per ORDER 051 §3)
- **Feeds:** ORDER 051 §7 steps 1–7

**DoD:**
1. Player composes menu morning of day 1; every dish has a price and an ingredient cost.
2. Stock draws down visibly during service; plates-remaining reading updates in room panel.
3. At least one dish can run out mid-service on a fresh play, producing an audible + written stream event.
4. Ingredient purchase posts a labelled ledger line (integrates with M3).

### M5 — Prep + cadence in the room

**Purpose:** mise en place stops being a countdown and becomes concrete work-done-or-not; the room's rhythm becomes readable *inside* the room, not beside it.

**Deliverables:**
- Mise en place inventory: ice, napkins, cutlery, stations, garnish (five-axis, not one score)
- Prep quality driven by team size × competence × prep length × morning changes × business load (ORDER 052 §2 model, report gated)
- Rhythm / pulse visualisation in room during service (form gated per ORDER 052 §3 — diagram, pulse, or staff-puck colour)
- After-countdown line: one plain-register line at door-opening moment (ORDER 052 §6)
- Stream panel sizing correction: shrink to contents; entries pick one direction (ORDER 052 §5)
- **Feeds:** ORDER 052 §9 steps 2 (stream sizing), 3 (after-countdown), 5 (mise en place), 6 (rhythm)

**DoD:**
1. Player can look at prep panel and see five concrete inventory items with per-item readiness, not one aggregate percentage.
2. Rhythm reads in room without opening a panel: at a glance the player knows whether the room is working in time or chasing itself.
3. First door-open in a service always fires the after-countdown line in the plain register.
4. Stream panel never renders taller than its contents.

### M6 — Cause-aware texture

**Purpose:** every stream line names its condition so consequences read as causal, not decorative.

**Deliverables:**
- Rewrite sentence banks in `eventStream.ts` so each symptom carries its cause (thin team, low competence, poor morale, short prep, morning change, ingredient tier, active scale-down, supplier short-delivery)
- Ambient texture stays ambient; consequence lines must say what of
- Plain-register vocabulary rules preserved (ORDER 048 §2)
- **Feeds:** ORDER 052 §9 step 1 (biggest effect, no new systems)

**DoD:**
1. Sample 20 lines from a real dinner service across three days.
2. Every consequence line (not ambient) names its condition.
3. Vision Owner can trace at least three consecutive stream events back to a causal chain (choice → strain → symptom → collapse or recovery).

### M7 — Knowledge engine → bank meeting

**Purpose:** the player's episteme accumulates through professional-question moments and unlocks capital via bank meeting scenes.

**Deliverables:**
- Knowledge generation script reviewed + run at volume (ORDER 049 §1 gate)
- Question corpus in runtime bank (≥ 50 questions)
- Scenarios attach 1–3 questions during service; player answers write to enablers
- Bank meeting scene with concrete allocation options (ORDER 049 §5.1)
- Ceiling-lift: episteme → pricing ceiling → menu (integrates with M4)
- Difficulty tuning per axis (scientific / cultural / practical — practical currently drawn from cultural × 0.6, see APPROXIMATION_REGISTER)
- **Feeds:** ORDER 049 §1, §5.1, §5.2

**DoD:**
1. Player answers at least one professional question during a service.
2. Bank meeting fires at appropriate trigger and offers concrete numbers.
3. Rising episteme visibly changes what the player is permitted to charge for a dish (integrates with M4 menu pricing).

### M8 — Playthrough acceptance

**Purpose:** the strategic slice is shippable when the Vision Owner reports the DoD across M0–M7 as met in a fresh three-day playthrough.

**Deliverables:**
- Three-day playtest, fresh state, no dev tools
- Sign-off report referencing every DoD line above

**DoD (from ORDER 047 §9):**
1. Player reads state without reading every line.
2. Player glances rather than reads.
3. Player sees several different scenarios (no repeat opener within a service).
4. Player attributes a scenario-answer to a visible movement.
5. Player recognises a morning investment in the evening account.
6. Player sees a collapse read as consequence.

---

## 3. First playable milestone

**M1 is the first milestone at which the player can perform an action, see a consequence, and want to do it again.** This bar is *literally* met right now — the loop fires end-to-end (open → scenarios → evening account → next morning) and reputation feedback across days changes what the game asks of the player next.

**What is missing for M1 specifically, and nothing else:**
- **The three ORDER 052 §8 defects.** Not features — quality gaps in the loop that is already firing:
  - Day-one valuation displays −229 kSEK. Either the T2 loan sizing is wrong for the starting premises, or the valuation formula is missing an input. ORDER 052 §8 requires a report before touching it.
  - Morning panels overlap spatially (§6.3 separated them logically, not visually).
  - All four quality readings show the placeholder text "Godtagbar" and revenue-per-seat displays dashes. Identical readings read as decoration; unfilled ones read worse.

Everything above is scope for M1 closure. M2 and later are *additions*, not fixes for M1. The Vision Owner may choose to defer M1's three defects into M2 rather than address them separately — that is a scope call, not a milestone-definition question.

---

## 4. Render vs mechanic work share (ORDER 043–062)

| Kind | Orders | Count | Status skew |
|---|---|---|---|
| RENDER | 053, 054, 055, 056, 057, 058, 059, 060, 061 | 9 | mostly **built** |
| MECHANIC | 043, 045, 046, 047, 048, 049, 050, 051, 052 | 9 | ~50 % **built**, ~50 % **approved-not-started** |
| MIXED | 044 | 1 | **built** |

**Roughly 50/50 render vs mechanic.** The instructive asymmetry is not in the split itself but in the completion pattern: rendering orders converged (each fix built on the previous within a couple of days); mechanic orders diverged (each order opened new gates awaiting a report before the next could build).

**Milestone-level implication.** Milestones M2–M7 are all mechanic-heavy, in the "approved-not-started" bucket, each behind a specific report gate. Unblocking them is content and design work (reports, gates), not implementation. M0 is nearly complete on rendering; M8 is governance. **The critical path to a closed strategic slice is not more implementation — it is the six report gates blocking M2–M7 build authorisation.**

---

## 5. Relationship to VERTICAL_SLICE_001

**VS001 is a first-person prologue** (bus arrival → NPC → registration table at Sevillapaviljongen). Feature-complete against `documentation/blueprints/VERTICAL_SLICE_001.md`. Ships from route `#/first-person-prototype`. Shares no source directory with the strategic track: VS001 lives under `src/scene` + `src/stages`; the strategic track lives under `src/strategic`.

**The two are not two products.** They are two modes of the same intended game. CLAUDE.md describes VS001 as *"den spelbara öppningen"* — the opening — which by construction implies something comes after. The strategic loop is what comes after.

**Recommendation: MERGE, do not archive.**

Reasons for merge:
- The strategic loop is not narratively self-standing. A player arriving into the strategic view via `#/strategic` has no context for why they inherited a restaurant.
- VS001 is exactly the missing prologue: bus in, register at pavilion, then the strategic loop begins with the same character now inhabiting the business.
- Cost of merging is small — a route redirect + a "you now control the restaurant" moment at the end of the FP walk. No re-architecture required.
- Cost of archiving VS001 is small too but throws away an accepted deliverable that the Vision Owner has already signed off on aesthetically.

Reasons *against* merge (and why they don't win):
- **Bus contradiction between `01_THE_ORIGIN.md` and `02_FIRST_ARRIVAL.md`** is real, but a merge does not force it to be resolved this week — the FP walk works either way. Deferring the bus decision is not the same as blocking the merge.
- **Session-timing model** (10 s bus vs platform-specific target) is a UX polish item, not a merge blocker.
- **Rights clearance** for real Grythyttan / pavilion is required for both tracks equally; not merger-specific.

**Proposed sequencing.** Merge VS001 → strategic at the end of M4 (Menu + kitchen + stock). By then the strategic loop is thick enough that "you now control the restaurant" arrives on a game the player can actually play. Before M4, the strategic loop is too thin to warrant a curated prologue.

**Archiving VS001 would be a valid alternative choice** if the Vision Owner has decided the strategic track subsumes it — the FP prototype code can be lifted, its lessons retained in `documentation/foundation/`, and the route retired. This document recommends *merge* on the balance of cost / value / preserved work, but the call is the Vision Owner's.

---

## 6. Open questions this proposal does not answer

- Which of the six report gates blocking M2–M7 does the Vision Owner want to open first? Recommend M3 (Evening ledger visible) — it is UI-only on a built backend, produces immediately visible player value, and unblocks M2's evening-account activity referencing.
- Should ORDER 052 §8's three defects be M1 closure work or absorbed into later milestones?
- Does the Vision Owner accept the merge recommendation for VS001, or prefer archive?
- Is there a target session count per milestone (e.g. M3 must be playable within one day of a player picking up the game) that should be added to each DoD as a discoverability target?

---

**End of proposal.**
