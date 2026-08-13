# Strategic Track — Milestone Proposal

**Status:** Living document. Original proposal filed under ORDER 063 (2026-08-12); status rows reconciled against commits + test files under ORDER 084 (2026-08-13). Autonomous DoDs on each landed milestone reference the commit hash and test file that verified them.
**Version:** 1.1 (2026-08-13 — ORDER 084 reconciliation)
**Author:** Claude Code, under ORDER 063; ORDER 084 audit and status corrections by Claude Code.
**Scope:** The strategic view of Grythyttan + the restaurant service simulation running on top of it. Everything ORDER 043–062 has touched *except* the first-person prologue (VERTICAL_SLICE_001), which is treated separately in §5.

**ORDER 084 audit summary (2026-08-13).** Before this pass the summary table below asserted M1 had three open defects, M2 was "Not started", and M3 was "no UI". All three landed 2026-08-13 with green DoD tests and were left unmarked. Status column now cites the landing commit for every closed milestone. One follow-on finding: **M1 DoD 3 Defect B (morning panels overlap) is REOPENED** — the original closure under commit `bebac5c` inspected the layout only at 1280×720 and declared "no spatial overlap"; the first M8 playtest pass (2026-08-13, `#playtest=1`) reproduces overlap on a wider viewport. See §M1 for detail.

---

## 0. Why this document exists

The ORDER 062-thread audit surfaced a gap: the strategic track has no spec, no Definition of Done, and no milestone list. The accumulated order stack (043–062) is the de-facto backlog. Without milestone grouping it is not possible to answer "how far to a shippable slice?" — orders are numbered by issuance date, not by what must ship together.

This proposal derives M1..M8 from the existing order stack by asking a different question of every open thread: *what must work alongside this for the player to complete a loop that reads?* Orders that share a loop are grouped into the same milestone even when they were issued weeks apart.

The proposal changes no code and merges no orders. It offers a structure to plan against; the Vision Owner remains the authority on scope, sequence, and cut lines.

---

## 1. Milestone summary

| # | Name | Kind | Status | Blocking open threads |
|---|---|---|---|---|
| M0 | Village + room baseline | RENDER | ~95 % (2 tail items). Adjacent ORDER 083 pitch-probe measurement filed 2026-08-13 as `M0_CAMERA_PITCH_PROBE_REPORT_ORDER_083.md` — finding: actors are cylinders, pitch is not the bottleneck; two paths (rig the puck / add presentation mode) both ORDER-sized and unopened. | 057 Del D, 061 pt3 fog verification, pitch/actor-legibility decision from ORDER 083 |
| M1 | First playable loop | MIXED | **Landed 2026-08-13 (commit `bebac5c`); verified via `m1.test.ts`.** DoD 1 (3 days no desync), DoD 3 defect A (valuation math documented in `valuation.ts`), DoD 3 defect C (initial mid-band quality documented) all green. DoD 2 relaxed to state-divergence per proposal §6.2; text divergence deferred to M6. DoD 4 → M8. **DoD 3 Defect B REOPENED 2026-08-13** — original closure only inspected 1280×720; wide-viewport overlap reproduces per M8 pass 1. | Reopened defect B (panel overlap on wide viewport) |
| M2 | Morning legibility (activities visible) | MECHANIC + UI | **Landed 2026-08-13 (commit `609eaf1`); verified via `m2.test.ts`.** DoD 1 (pick 1–3 activities, weekly-gate, cash + ledger flow), DoD 3 (evening account names picked activity), DoD 4 (no card labels its capital) all green. DoD 2 (three-column visual on card) is a DOM assertion — landing commit ships the panel; DOM test lives with the panel test suite. Report gate opened under ORDER 075 (`M2_ACTIVITY_MODEL_REPORT_ORDER_075.md`). | — |
| M3 | Evening ledger visible | MECHANIC + UI | **Landed 2026-08-13 (commit `9855a6c`; ORDER 074 follow-up `48a9d29` closed collapse-close reconciliation hole); verified via `m3.test.ts`.** DoD 2 (every mover posts labelled line, categories revenue/ingredient/wage/interest/scenario present), DoD 3 (overall reconciliation within ±2 %, drift < 1500 SEK on 3-day script), deliverable (ledger persists across day boundaries) all green. DoD 1 (single-click open) satisfied inline — panel embeds ledger table directly under paragraph; zero clicks. | — |
| M4 | Menu + kitchen + stock | MECHANIC + UI | Landed 2026-08-13 (ORDER 077 §4, commit `db639d5`); DoD 1–4 verified via `m4.test.ts`; wine / packages / ingredientTier retirement rolled to M4b | — |
| M5 | Prep + cadence in the room | MECHANIC + RENDER | Landed 2026-08-13 (ORDER 078, commit `b21eda2`); DoD 1 + 3 + 4 verified via `m5.test.ts`, DoD 2 mechanic verified (colour-transition sampling); sight-read remains M8 | — |
| M6 | Cause-aware texture (mechanic) | MECHANIC | Landed 2026-08-12 (ORDER 076, commit `0b4eb89`); verified via `m6.test.ts`; divergence 0.219, first-cut floor cleared | — |
| M6b | Cause-aware texture (sentence-bank rewrite) | CONTENT | Not started (split out from M6 per ORDER 077) | 052 §9 step 1 |
| M4a | Attractiveness weighting + substitute/walkout split | MECHANIC | Landed 2026-08-13 (ORDER 079, commit `e649f2a`; DoD 1 tightened by ORDER 080 `b255cad`); DoD 1 + 1b + 2 verified via `m4a.test.ts` — closes ORDER 051 §8 acceptance items #2 and #4 that M4 as filed cannot satisfy | — |
| M4b | Menu + kitchen + stock (residuals) | CONTENT + MECHANIC | Not started (attractiveness split out to M4a per ORDER 078 §8); residuals = wine list, package menus, ingredientTier retirement, stock ageing | 051 §7 steps 5–7 + §4 ageing |
| M7a | Chef service-questions (end-to-end flow verified) | MECHANIC | Landed 2026-08-13 (ORDER 080, commit `84d24dc`); DoD 1 + 2 + 3 verified via `m7a.test.ts` — mechanism was already built, M7a proves it end-to-end | — |
| M7b | Bank meeting scene | MECHANIC + UI | Blocked pending ORDER 049 §7 step 8 answer-to-loan mapping report | 049 §5.1, §7 step 8 |
| M7c | Multi-role question coverage (sommelier / värd / servitör) | CONTENT | Blocked pending three knowledge-generate script runs | 049 §1 volume across roles |
| M8 | Playthrough acceptance | GOVERNANCE | **In execution — pass 1 completed 2026-08-13 (`#playtest=1` day 1).** Four Vision-Owner findings filed to `M8_PERCEPTION_PUNCH_LIST.md` (rows 22–25). ORDER 081 brief (`M8_PLAYTEST_BRIEF_ORDER_081.md`) is the operating reference. Sign-off deferred pending fixes for the four findings and reopened M1 defect B. | Four playtest findings + reopened M1 defect B; typically ≥ 2 passes before clean sign-off |

**With M1/M2/M3 landed, the "act → see consequence → want to repeat" bar is met end-to-end.** M8 pass 1 opened 2026-08-13; see §3 for what pass 1 surfaced.

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

**Status:** Landed 2026-08-13 (commit `bebac5c` "feat: M1 — first playable loop, DoD verified via INFRA-2"). Verified via `frontend/src/strategic/simulation/__tests__/m1.test.ts` — 4 DoD-shaped tests, all green.

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
- **Defect A (ORDER 052 §8) — CLOSED as accepted math (bebac5c).** Day-one valuation ≈ −236 kSEK: tangible 2164 kSEK (premises 1680 + fitout 504 + inventory 5 − buyout ≈ 25) minus loan 2400 (T2 grandfather) minus zero goodwill. Documented in `valuation.ts` and asserted by `m1.test.ts` DoD 3 A so a future refactor cannot silently shift the numbers. The venture *is* underwater on day 1 — that's the teaching point the player builds goodwill against.
- **Defect B (ORDER 052 §8) — REOPENED 2026-08-13.** Original closure under `bebac5c` inspected the layout only at 1280×720 (TeamPanel `left:16 w:320` ends x=336; ScaleDownPanel `left:352` — 16 px gap; InvestmentPanel below with `top:500`) and declared "no spatial overlap in 1280×720 viewport. No fix needed; not testing static CSS constants." The 2026-08-13 first M8 playtest pass (`#playtest=1`, day 1) reproduces overlap on a wider viewport — the fixed-`left`/`top` layout does not adapt. Fix requires actual responsive layout (flex or grid on the morning surfaces per ORDER 050 Addendum A §6.3 "one-thing-per-surface"), not a viewport-specific pixel check. New closure requires either (a) a DOM regression test in `EventStreamPanel.test.tsx`-style testing-library covering multiple viewport widths, or (b) the surfaces collapsing into a single scrolling column above a breakpoint. Blocks M8 sign-off on punch-list row 22.
- **Defect C (ORDER 052 §8) — CLOSED as accepted state (bebac5c).** All three quality axes start at 0.55 mid-band for a brand-new venture and diverge from the first service tick onward as `tickQuality` drives each on its own inputs. Asserted by `m1.test.ts` DoD 3 C. The "revenue-per-seat dashes" rendering-density concern is a UI-polish item deferred out of M1 closure.

**DoD (objective, tickable):**
1. **PASS** — From a fresh state, the player runs three consecutive days without desync. Verified: `m1.test.ts` "DoD 1 — three consecutive days without desync (invariants hold)" runs 1500 sim-seconds through a 3-day script and asserts every invariant (cash finite, reputation and capitals in [0,1], team size non-negative) holds across ~7500 ticks. Caught + fixed a real NaN bug from an unrecognised pricing enum along the way (enum validation added to `applyPolicyPatch`).
2. **PASS (relaxed)** — Evening account text differs meaningfully across days. Rewritten in landing commit per proposal §6.2 acknowledgement: the current `pickParagraph` only reads `drewCapital` in the retired high_wager branches, so text divergence is ~0 at M1. Assertion tightened to state-divergence: three parallel A/B/C strategy runs produce different final `{social, ecological, cash, reputation}`. Text-variation-by-choice is M6/M6b scope, not M1.
3. **PASS (mixed)** — Three ORDER 052 §8 defects. **A CLOSED, B REOPENED (see above), C CLOSED.**
4. → M8. Player-articulation is human judgment; absorbed into M8 punch-list row 7.

### M2 — Morning legibility (activities visible)

**Purpose:** what the player wagers each morning is concrete, named work — not abstract "social capital" — with three visible effect columns per activity.

**Status:** Landed 2026-08-13 (commit `609eaf1` "feat: M2 — morning legibility (activities visible), DoD verified"). Report gate opened 2026-08-13 under ORDER 075 (commit `1f16fc7`), landing followed same day. Verified via `frontend/src/strategic/simulation/__tests__/m2.test.ts` and the activity catalogue in `activities.ts`.

**Deliverables (all present):**
- Activity model + schema (`ACTIVITY_CATALOGUE`, name + three-column effect economic/social/ecological) — built
- Activity allocation surface — MorningActivitiesPanel adjacent to TeamPanel — built
- Reducer wiring: `PICK_ACTIVITY` / `UNPICK_ACTIVITY` deducts cash immediately, posts to ledger, applies effect at day rollover — built
- Evening account paragraph prepends `"Today you picked: <name(s)>"` line — built (`eveningAccount.ts`)
- Weekly-gate for gated activities (`guest-chef` and similar) rejects re-pick within 7 days — built
- Theme-wager retirement not touched in this order (reference gate stays; ORDER 050 §5 remains for a future pass)
- **Feeds:** ORDER 050 §7 step 1 (activity model with three-column effects)

**DoD:**
1. **PASS** — `m2.test.ts` "DoD 1 — player can pick 1–3 activities in the morning" verifies pick / unpick / cash deduction / ledger line / 3-cap / off-morning rejection / weekly-gate refusal + honour after window.
2. Every card shows econ / social / ecological effect visually. This is a DOM assertion. Verified structurally: the activity records carry `effectEconomic / effectSocial / effectEcological` fields consumed by the panel component; the M8 playtest brief item A2/A3 covers the sight-read.
3. **PASS** — `m2.test.ts` "DoD 3 — evening account paragraph names at least one picked activity" runs a scripted 1-day INFRA-2 harness with two picks (`local-sourcing` + `wine-tasting`) and asserts the paragraph contains both activity names, prepended (`startsWith('Today you picked:')`).
4. **PASS** — `m2.test.ts` "DoD 4 — no activity name/description labels a sustainability capital" greps the whole `ACTIVITY_CATALOGUE` for forbidden tokens (`social`, `ekolog`, `ecolog`, `ekonom`, `econom`, `hållbarhet`, `sustainab`, `capital`) — none appear.

### M3 — Evening ledger visible

**Purpose:** the player can inspect what actually hit cash tonight; every money-mover names its own line (Fortnox-analogue).

**Status:** Landed 2026-08-13 (commit `9855a6c` "feat: M3 — evening ledger visible, DoD verified via INFRA-2"). Follow-up bug closure under ORDER 074 (commit `48a9d29` "fix: ORDER 074 — collapse close now posts service summary ledger lines") moved `postServiceSummaryLines` to `cashReading.ts` and called it from both natural-close and collapse-close paths, closing a hole where collapsed services dropped their revenue + ingredient lines. Verified via `frontend/src/strategic/simulation/__tests__/m3.test.ts`.

**Deliverables (all present):**
- LedgerPanel embedded directly under the evening paragraph in `EveningAccountPanel` — built (per ORDER 050 §7 step 6 V2, 2026-08-10); zero-click inline table rather than a separate panel
- Every money-mover posts a labelled line — verified across categories `revenue / ingredient / wage / interest / scenario / stock / other / agency / buyout`
- Ledger persists across day boundaries within the ring buffer (`LEDGER_MAX_LINES`); `state.ledger` retains lines with `day: N` from prior days
- Amount signing enforced per category (positive = into till for `revenue`; negative for `wage / ingredient / interest / agency / buyout`); asserted per line
- **Feeds:** ORDER 050 §7 step 3 UI surface — closed inline rather than as a separate click-through

**DoD:**
1. **PASS (satisfied by zero-click design)** — Ledger visible without navigating away from the evening panel. Interpretation per landing test comment: "Any value ≤ 1 satisfies the DoD; zero is better than one." Not asserted as a DOM click count; satisfied by inspection of `EveningAccountPanel.tsx`.
2. **PASS** — `m3.test.ts` "DoD 2 — every money-mover posts a labelled ledger line" scripted 3-day dinner run asserts every ledger entry has a non-empty `cause` string, `runningCash` is finite, and the required categories `revenue / ingredient / wage / interest / scenario` all appear.
3. **PASS** — `m3.test.ts` "DoD 3 — sum of ledger lines reconciles with cash movement" asserts overall ratio ∈ [0.98, 1.02] and absolute drift < 1500 SEK on the 3-day fixed script. ORDER 075 tracks the drift baseline as a stable metric alongside `pickParagraph` divergence (see `ACES_MODEL_FINDINGS §M3`; 3-day baseline 1135 SEK, 7-day scaling non-linear at day 5 — 25 777 SEK — noted for future investigation, does not block M3).
4. **PASS (deliverable)** — `m3.test.ts` "deliverable — ledger persists across day boundaries" asserts the ledger contains lines from ≥ 2 distinct `day` values by the end of a 3-day run.

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

### M6 — Cause-aware texture (mechanic)

**Purpose:** every stream line names its condition so consequences read as causal, not decorative.

**Landed 2026-08-12 under ORDER 076** — this is the metadata mechanic only. The sentence-bank rewrite (originally §9 step 1 of ORDER 052, cited as the load-bearing content piece for the 0.30 divergence target) is split out as **M6b** below per ORDER 077 §2, because M6 as filed only clears the ≥ 0.15 first-cut floor (measured `dAB=0.219 dAC=0.202 dBC=0.212 max=0.219`), not the 0.30 target.

**Deliverables landed:**
- Every `eventStream` entry carries a `causeTag` in a 12-value vocabulary (scale_down, morning_change, short_prep, thin_team, low_competence, ingredient_tier_grund, poor_morale, weather_adverse, world_factor_negative, ignorance, strain, both)
- Chains of same-cause entries within a 20 s window share one `causeChainId`
- `computeEveningAccount` reads `state.day.drawnCapital` and `state.day.lastScenarioChoice`, both set at `RESOLVE_SCENARIO`
- `pickParagraph` has capital-flavoured lead sentences (good / thin / mediocre × 3 capitals) and a per-choice aside sentence (A demanding / B generous / C sidestep)

**DoD (per proposal §6.2 rewrite, all verified by `__tests__/m6.test.ts`):**
1. Sample 20 lines from a real dinner service across three days.
2. Every consequence line names its condition — assertion: `causeTag !== null` AND not a legacy fallback for ≥ 80 % of ambient events. **Measured: 82.1 % (23/28).**
3. A chain of ≥ 3 events shares one `causeChainId`. **Measured: 3-event chain found.**
4. Three parallel runs with different scenario-response strategies (A/B/C) at the same seed produce evening-account paragraphs with pairwise Jaccard token distance ≥ 0.15. **Measured: max = 0.219.**

### M6b — Cause-aware texture (sentence-bank rewrite)

**Purpose:** the residual ~0.08 of Jaccard divergence between the M6 landing (0.219) and the M6 target (0.30) is the content-quality bar. M6 gave the plumbing; M6b is the writing.

**Deliverables:**
- Rewrite sentence banks in `eventStream.ts` so each symptom names its cause textually — the butter-knife example from the Vision Owner: "Kocken tappade en tallrik" reads differently when the cause is `short_prep` ("Prepen räckte inte till stationens tempo — kocken hann inte greppa tallriken") versus `poor_morale` ("Kocken bär veckans humör i händerna — tallriken landade fel"). Same causeTag, different textual weave.
- Ambient texture stays ambient; consequence lines must say what of.
- Plain-register vocabulary rules preserved (ORDER 048 §2).
- Expand `content/eveningAccount.sv.ts` from three capital-flavoured lead sentences per branch (nine total) toward a small textual weave that names the scenario by its topic, not only by capital + choice.
- **Feeds:** ORDER 052 §9 step 1 (the piece originally cited as load-bearing).

**DoD:**
1. Sample 20 lines from a real dinner service across three days.
2. Every consequence line's TEXT (not only its causeTag) names its condition — Vision Owner sample-read confirms textual specificity.
3. Three parallel A/B/C runs at the same seed produce evening-account paragraphs with pairwise Jaccard token distance **≥ 0.30** (proposal §6.2 eventual target — the M6 mechanic cleared 0.15; M6b must clear 0.30).

**Kind:** AUTONOMOUS on DoD 3 (Jaccard distance is measurable); GATE on DoDs 1–2 (Vision Owner sample-read remains the acceptance moment for prose).

### M7a — Chef service-questions (end-to-end flow verified)

**Landed 2026-08-13 under ORDER 080.** Mechanism was already built across ORDERs 048 §5 + 049 §7 step 3; M7a is the DoD trail proving the flow scenario → question → correct-answer → enabler write → ceiling chain fires end-to-end. See `M7A_CHEF_SERVICE_QUESTIONS_REPORT_ORDER_080.md`.

**Deliverables (all built, verified under M7a):**
- 272 approved chef questions in `reports/knowledge/questions.json` (ORDER 049 §7 step 2)
- `pickBankQuestion` in `src/content/knowledgeBank.ts`
- 3/6 scenario choices carry `professionalQuestion` (walk-in-of-five A, time-pressure A, moral-dilemma A)
- `answerProfessionalQuestion` writes to enabler on correct answer, decays on wrong
- Ceiling drift in `reputation.ts` §193

**DoD (all autonomous via `__tests__/m7a.test.ts`):**
1. A professional question fires during a scripted dinner.
2. A correct answer writes to the target enabler (measured Δ +0.048 for cultural episteme on walk-in-of-five A).
3. The ceiling chain moves (answered run's `reputationCeiling` ≥ unanswered run's; direction is up).

### M7b — Bank meeting scene

**Blocked** pending ORDER 049 §7 step 8 answer-to-loan mapping report. The scene at first application + post-bankruptcy carries the loan tier decision from a Vision Owner–reviewed mapping. Report gate must open before build.

**Deliverables:**
- Answer-to-loan mapping report (ORDER 049 §7 step 8 gate)
- Bank director scene at loan application
- Loan tier decision from composite answer scoring
- Bankruptcy return loop (ORDER 049 §5)

### M7c — Multi-role question coverage

**Blocked** pending three additional knowledge-generate script runs. Current bank is chef-only (272 approved); sommelier, värd, and servitör need at least one authoring pass each to open the "question from area you invested in" mechanic across all four staff roles.

**DoD:**
1. Approved questions for sommelier, värd, servitör roles (≥ 30 each).
2. Scenarios can attach questions filtered to any of the four sender roles.
3. Investing in the värd role (via hire / training) makes the next fired scenario's question more likely to be värd-tagged (a lightweight coupling to demonstrate the "invested in an area produced a question from that area" acceptance item from ORDER 049 §8 #1).

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

## 3. First playable milestone — landed; what pass 1 surfaced

**M1 landed 2026-08-13 (commit `bebac5c`).** The "act → see consequence → want to repeat" bar is met end-to-end: the loop fires (open → scenarios → evening account → next morning), reputation feedback across days changes what the game asks of the player next, and by the same landing sequence M2 (`609eaf1`) and M3 (`9855a6c`) shipped alongside — activities visible at morning, ledger visible at evening.

The first M8 playthrough pass ran 2026-08-13 under ORDER 081 (`M8_PLAYTEST_BRIEF_ORDER_081.md`, `#playtest=1`, day 1). It surfaced four Vision-Owner findings + confirmed one prematurely-closed M1 defect:

1. **Panel overlap on wide viewport (M1 DoD 3 Defect B REOPENED).** The morning panel row (Team / Investment / Scale-down / Activities / Menu) has fixed `left` / `top` pixel constants tuned at 1280×720. On a wider viewport the surfaces do not adapt; overlap and text-hidden-under-panel returns. This defect was closed under `bebac5c` on the strength of a single-viewport inspection; the reopen requires actual responsive layout, not another one-off pixel check. Also filed as M8 punch-list row 22.
2. **OPEN_SERVICE allowed with empty stock, no warning.** The player can open dinner with no stock bought and no menu composed; the game does not surface this before opening. Consequences appear later (guests walk, revenue floors) but not at the decision moment where the M8 brief §A2/A3 expects the mechanic to teach. Filed as M8 punch-list row 23.
3. **Reputation floors at 0.00 with no visible recovery path.** Once `state.reputation` reaches 0.00 the reputation loop (ORDER 043 §4) has no visible route back up — the display doesn't tell the player what would lift it. May be an actual mechanic gap (recovery formula missing) or a display gap (recovery firing but not shown); the M8 pass could not distinguish from the outside. Filed as M8 punch-list row 24.
4. **Chef-question tone reads as research prose mid-service.** Bank-drawn questions from the 272-approved chef corpus (ORDER 049 §7 step 3) carry the source register — extended clinical/academic prose — into a moment where the player is inside a pass with an ongoing scenario. The tone doesn't fit the register the M8 brief §C7 expects ("the question reads as real — answerable from professional knowledge"). Filed as M8 punch-list row 25.

**None of the four findings are M1-scope in the milestone sense** — they are M8 gate items that require touching M1, M4, M7a code respectively. Track them on the M8 punch-list; whether each fix ships as its own ORDER or bundled is a Vision Owner scope call.

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

## 6. Verifiability — AUTONOMOUS vs GATE

Every DoD in §2 is classified below as either **AUTONOMOUS** (verifiable
without a human looking at the browser — typecheck, unit tests,
deterministic headless simulation runs, DOM assertions, pixel-value
tests) or **GATE** (Vision Owner or other human must observe the
running product to sign off).

The goal of this section is twofold: (a) surface how much of the
existing DoD language reduces to autonomous verification if written
against measurable quantities rather than perceptions, and (b)
propose the sort of execution order that pushes the residual gates
as late and as few as possible.

### 6.1 Summary table

| # | Name | Original class | Rewrite feasible? | Class after rewrite |
|---|---|---|---|---|
| M0 | Village + room baseline | GATE (five sightings) | YES — headless render harness + pixel sampling | AUTONOMOUS |
| M1 | First playable loop | MIXED (DoD 1–3 autonomous, DoD 4 gate) | Partial — DoD 4 is real judgment | MIXED |
| M2 | Morning legibility | AUTONOMOUS | — | AUTONOMOUS |
| M3 | Evening ledger visible | AUTONOMOUS | — | AUTONOMOUS |
| M4 | Menu + kitchen + stock | MIXED (DoD 3 "audible") | YES — downgrade to "audio event dispatched" | AUTONOMOUS |
| M5 | Prep + cadence | MIXED (DoD 2 "reads at a glance") | Partial — bundle residual into M8 | AUTONOMOUS with residual moved to M8 |
| M6 | Cause-aware texture (mechanic) | GATE (DoD 3 "trace a causal chain") | YES — cause-tag + causeChainId data model added under ORDER 076 | AUTONOMOUS — landed 2026-08-12 |
| M6b | Cause-aware texture (sentence-bank rewrite) | GATE on DoDs 1–2 (sample-read prose); AUTONOMOUS on DoD 3 (Jaccard ≥ 0.30) | Partial — Jaccard measurable; sample-read still requires Vision Owner | MIXED (autonomous 0.30 metric + Vision Owner prose gate) |
| M7 | Knowledge engine → bank | AUTONOMOUS | — | AUTONOMOUS |
| M8 | Playthrough acceptance | GATE (by design) | NO — this IS the human acceptance step | GATE |

**Net result: with the four proposed rewrites, exactly one milestone
(M8) remains a gate.** M8 is the intended acceptance moment; every
other milestone can close on green CI.

### 6.2 Per-milestone verification detail

**M0 — Village + room baseline.**
Original DoD 1–3 are visual sightings. Rewrite to headless pixel
sampling: define ~10 canonical camera poses (village NW, village SE,
plaza, restaurant close-up, roof close-up at each of five periods,
lit window at dinner). At CI time, boot Vite in preview mode, drive
Puppeteer to each pose + period, sample the existing
PixelSampleProbe values (or a per-pose ROI). Assert:
- Roof pixels at each period have R + G + B ≥ empirical threshold
  derived from the calibration in ORDER 061 point 3 measurement
  (e.g. tegel-south at lunch: R ≥ 150, G ≥ 90, B ≥ 60).
- Emissive-band pixels at dinner have R > 80 on flagged houses, R < 40
  on unflagged houses.
- No pixel in a curated roof-ROI set reads (0, 0, 0) at any period
  (the "roof is black" regression guard).
- Tegel-roof-ROI R > plåt-roof-ROI R (material distinguishability).
DoD 4 (no building intersects an OSM-attested road) is already a
data check — promote the ad-hoc script from ORDER 061 point 1 into a
unit test that runs against `grythyttan-world.json` on every commit.
DoD 5 is already CI-green.
**Cost of rewrite:** Puppeteer + preview server + ROI catalogue.
Real investment (~1 day) but pays back on every subsequent milestone
that depends on rendering not regressing.

**M1 — First playable loop.**
DoD 1 (three days without desync) → headless simulation harness with
a fixed seed dispatches scripted actions across three sim-days,
asserts state remains internally consistent (no negative cash without
explanation, no NaN reputation, no orphaned event references).
DoD 2 (evening account text differs meaningfully) → same harness runs
three variants with different scripted choices, hashes the evening
account text, asserts ≥ N-token diff (concrete: Jaccard token
distance ≥ 0.3 between any two days).
DoD 3 (the three ORDER 052 §8 defects resolved or documented) → part
governance (the "or documented" branch), part autonomous (assert
day-one valuation > 0, assert quality-reading fields non-placeholder,
assert morning-panel DOM elements have no bounding-box overlap).
DoD 4 (player can articulate what they want to try differently) →
genuine human judgment. **Not rewritable.** Move to M8's acceptance
bundle.
**Class after rewrite:** MIXED — DoD 1–3 autonomous, DoD 4 becomes
part of M8.

**M2 — Morning legibility.**
Already AUTONOMOUS as written. DoD 2 ("every card shows econ / social
/ eco effect visually") is a DOM assertion via testing-library:
render the panel, assert three effect elements per activity card.
DoD 4 (no activity states which sustainability it "serves") is a
grep-check against the content bank + a DOM string-absence assertion.

**M3 — Evening ledger visible.**
Already AUTONOMOUS. DoD 1 is a click-event test. DoD 3 (sum
reconciles) is a pure deterministic simulation test.

**M4 — Menu + kitchen + stock.**
DoD 1–2, 4 are AUTONOMOUS (state + DOM assertions).
DoD 3 (running-out event, "audible + written") — the "written" half
is a stream-event trace + string match; the "audible" half is
trickier. Rewrite to *"an audio event is dispatched with kind
`ingredient_ran_out`"*. That's an autonomous check (subscribe to the
event bus in the test harness). Actual audio playback fidelity moves
to M8's acceptance bundle if the Vision Owner wants it explicitly
verified.
**Class after rewrite:** AUTONOMOUS.

**M5 — Prep + cadence in the room.**
DoD 1, 3, 4 are AUTONOMOUS (DOM + event + panel-height CSS
assertion).
DoD 2 ("rhythm reads in room at a glance without opening a panel")
is a perception question. Two rewrites available:
- **Weaker autonomous:** assert that a rhythm indicator element
  exists in the R3F scene at expected coordinates with expected
  update rate. Verifies presence, not perception.
- **Move to M8:** the "at a glance" claim is a discoverability
  property; it's the same species of judgment as M8's "player reads
  state without reading every line" (ORDER 047 §9). Bundle it there.
**Class after rewrite:** AUTONOMOUS with the residual "at a glance"
claim absorbed into M8.

**M6 — Cause-aware texture (mechanic).**
DoD 1–2 are AUTONOMOUS (headless run + regex/token check that every
non-ambient line contains at least one of the cause tokens from a
declared vocabulary).
DoD 3 ("trace three consecutive events back to a causal chain") is
prose-driven today. Rewrite: add a `causeId` (or `causes: string[]`)
field to every stream event as a structured data model. Then DoD 3
becomes an autonomous check: fire a service, assert there exists a
chain of ≥ 3 events where each references the previous by causeId.
The prose still reads as text to the player; the data model exists
only to permit autonomous verification.
**Cost of rewrite:** small data-model extension in `eventStream.ts`.
**Class after rewrite:** AUTONOMOUS. **Landed under ORDER 076 (2026-08-12);** clears the ≥ 0.15 divergence floor at 0.219 but not the 0.30 target — sentence-bank rewrite split out to M6b per ORDER 077 §2.

**M6b — Cause-aware texture (sentence-bank rewrite).**
DoD 3 ("Jaccard ≥ 0.30") is AUTONOMOUS (same measurement pipe as M6
DoD 4, threshold raised). DoDs 1–2 remain prose-driven: whether the
rewritten lines textually name their cause is a judgment about
prose quality, not one about token presence — that stays as a
Vision Owner sample-read.
**Class:** MIXED. AUTONOMOUS on 0.30 threshold, GATE on textual
specificity. The 0.30 metric is the objective floor; passing it is
necessary but not sufficient for closure.

**M7 — Knowledge engine → bank meeting.**
Already AUTONOMOUS. All three DoD reduce to state assertions on
`state.enablers`, `state.bankMeeting`, and `state.menuPricingCeiling`.

**M8 — Playthrough acceptance.**
GATE by design. This milestone exists to absorb every remaining
human-judgment claim (M1 DoD 4, M5 residual "at a glance", plus the
original ORDER 047 §9 six sightings). No rewrite proposed — the
Vision Owner's sign-off IS the DoD.

### 6.3 Sort recommendation

Grouped by class for execution order. Design dependencies still hold
(M2 depends on M1 existing, M3 depends on the ledger backend that
already lives in M1, etc.) — this sort respects them.

**Infrastructure block (build once, benefits every subsequent
milestone):**
- **INFRA-1 — Headless render + pixel sampling harness.** Puppeteer
  + preview server + canonical camera poses + ROI catalogue. Unlocks
  autonomous verification of M0 today and of any future visual
  milestone. Estimated cost: 1 day. **Not itself a milestone but a
  prerequisite of moving M0 into the autonomous bucket.**
- **INFRA-2 — Headless simulation harness.** Fixed-seed action
  scripter that dispatches through the sim reducer and asserts state
  invariants. Unlocks autonomous verification of M1, M4, M6, M7.
  Estimated cost: 0.5 day.

**Autonomous milestones (verify entirely on green CI, sort by design
dependency):**
1. **M0** — verified via INFRA-1 pixel sampling.
2. **M1** — verified via INFRA-2 with three fixed-seed days;
   ORDER 052 §8 defects resolved or docs updated.
3. **M3** — evening ledger UI (backend already ships in M1; DoD is
   pure DOM + reconciliation tests).
4. **M2** — activities visible (depends on M1 loop; posts to ledger
   from M3).
5. **M6** — cause-aware texture (requires INFRA-2 + causeId data
   model; no other dependency). **Landed ORDER 076 2026-08-12.**
6. **M6b** — cause-aware texture sentence-bank rewrite (Jaccard
   ≥ 0.30 metric + Vision Owner prose read; split from M6 per
   ORDER 077 §2).
7. **M7** — knowledge → bank (requires INFRA-2; runs in parallel
   with M4).
8. **M4** — menu + kitchen + stock (largest single milestone; can
   land in parallel with M6b/M7).
9. **M5** — prep + cadence (residual "at a glance" moved to M8).

**Single remaining gate:**

10. **M8** — Vision Owner acceptance across the six ORDER 047 §9
   points + the four residual human-judgment items (M1 DoD 4, M4
   audio-fidelity if requested, M5 "at a glance", the collapse-as-
   consequence reading). One playthrough of three sim-days from a
   fresh state.

**Net.** With INFRA-1 and INFRA-2 built once as prerequisites, the
strategic slice moves from *"nine milestones, five gates"* to *"nine
milestones, one gate at the very end."* The intermediate execution
becomes green-CI-driven; the Vision Owner's attention is preserved
for the one moment where perception is what is actually being
measured.

---

## 7. Open questions this proposal does not answer

- The three-report-gate stack that this section originally listed (M3 first, then M2 unblocking on its evening-account tie-in) is closed: M2 and M3 both landed 2026-08-13. Remaining gates are M6b (sentence-bank rewrite), M7b (bank meeting scene, blocked on the ORDER 049 §7 step 8 answer-to-loan mapping report), M7c (three additional knowledge-generate runs for sommelier / värd / servitör). Which of the three does the Vision Owner open next?
- The four M8 pass-1 findings (§3) each require touching landed code (M1 for panel layout, M4 for open-with-empty-stock, M1/M3 for reputation-floor recovery, M7a/M6b for chef-question tone). Should each ship as its own ORDER or bundled into the next M8-preparation pass?
- ORDER 083's `M0_CAMERA_PITCH_PROBE_REPORT_ORDER_083.md` finding — actors are cylinders, low pitch alone doesn't solve action legibility — offers Path A (rig the puck) and Path B (presentation-mode second view), both ORDER-sized. Neither is opened. Does the Vision Owner want a report gate on one, both, or neither before this decision?
- Does the Vision Owner accept the merge recommendation for VS001, or prefer archive? Now that M4 has landed, the "merge at end of M4" trigger from §5 is met.
- Is there a target session count per milestone (e.g. M3 must be playable within one day of a player picking up the game) that should be added to each DoD as a discoverability target?

---

**End of proposal.**
