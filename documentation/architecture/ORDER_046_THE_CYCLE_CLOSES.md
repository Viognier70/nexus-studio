# ORDER 046 — The Cycle Closes

**Status:** In execution 2026-08-08 by Claude Code
**Parent orders:** `ORDER_043_CAPITAL_WAGER_AND_CONSEQUENCE_CHAIN.md` §6, §7, §10 step 6; `documentation/DESIGN_BACKLOG.md` B-003; `ORDER_044_THE_VILLAGE_MADE_LEGIBLE.md` §3
**Branch:** `order-046` (cut from `order-044` after PR #9 approval; will rebase onto `main` when PR #9 lands)

---

## §0 · Why this order exists

ORDER 043 v3 §10 step 6 names collapse as the last mechanic to build — "it needs everything else to be traceable." Everything else is now built. The Vision Owner also asked for two adjacent things in the same turn: the morning investment surface named in §7 but not yet realised, and the evening account named in `DESIGN_BACKLOG.md` B-003. Together with a small animation pass those four turn the day into a cycle instead of a series of evenings.

The Vision Owner reviewed the initial collapse formula (`0.05 × max(0, 1 − 2 × weakest)`, per-service-tick) and rejected it: **a threshold at `weakest ≥ 0.5` makes collapse impossible for a competent team, but a competent team under hard strain must still be able to miss an allergy.** The corrected formula (§1 below) removes the hard threshold, keeps a small floor, and weights the risk by strain — not by competence alone.

---

## §1 · Service collapse (§6 + §10 step 6)

**Rare and clearly traceable.** A service that collapses ends early with a hand-authored line in the event stream, a reputation dip, and a `ConsequenceEvent` appended so the failure can shape a later scenario.

### §1.1 · Trigger formula

Per collapse-check tick during a running service (post-prep, doors open):

```
weakest    = min over axes { scientific, cultural, practical } of
             the maximum team competence in that axis
strainMult = strainMultiplier(loadOf(state))   // from eventStream.ts
collapseProb_per_tick = COLLAPSE_FLOOR + (1 − weakest) × strainMult × COLLAPSE_STRAIN_GAIN
```

Constants:
- `COLLAPSE_FLOOR = 0.00003` — per-tick floor (~0.9 %/min at rest)
- `COLLAPSE_STRAIN_GAIN = 0.00025` — strain slope (per tick)
- Collapse-check runs at every sim tick during service, after prep closes.

**Why this shape.** The Vision Owner's rejection specifically named the case: "det handlar om lärlingen som tvingas stå i luckan, inte om lärlingen i sig." A competent team at rest still has a small floor. A weak team at rest is only somewhat exposed. A weak team under strain is much more exposed. A competent team under hard strain is also exposed — the apprentice is at the pass because the runner is already carrying five plates. Both axes bite.

**Expected rate** (calibration target, per 15-min service):
- Team of three defaults (värd/servitör/kock, weakest ≈ 0.30), calm (strain 0.30×): ~1.3 % collapse chance per service
- Same team at strain 1.0× (load ≈ 1.5): ~9 % per service
- Weak team (lärling-heavy, weakest ≈ 0.20) at strain 1.5× (load ≈ 1.8): ~20 % per service
- Strong team (specialist stack, weakest ≈ 0.65) at strain 2.0×: ~11 % per service

Verified in `collapse.test.ts` by a 1000-service simulation per composition.

### §1.2 · What "weakest" means

`weakest` reads the MAX across team members in each axis (a single competent person covers a station), then MIN across axes. A team with a specialist kock (scientific 0.75) but no värd (cultural max = 0.20 from the lärling) reads weakest 0.20 on cultural. Adding a värd lifts weakest to 0.75.

This mirrors the prep-floor polarity check (eventStream.ts line 442) — prep is a single-station activity, and so is the moment of collapse (the runner at the pass, the cook at the board). Collapse is a specific person at a specific station failing.

### §1.3 · Fire effects

When the probability roll lands:

1. `state.day.serviceCollapsed = true`
2. Hand-authored line inserted directly into `state.eventStream` (category `'ambient'`, causeTag `'ignorance'`, sustainability chosen from the axis that failed — `scientific` → 'social' (kitchen), `cultural` → 'social' (room), `practical` → 'economic' (house standard)).
3. `state.reputation -= 0.15` (clamped to 0)
4. `state.consequenceEvents` gains one entry: kind `'staff_resigns'` (default for collapse), capital `'social'`, firedAt `simTime`, active `true`.
5. Period force-transitions to `evening` immediately — `periodStartAt = simTime`, service state cleared exactly as in the natural close.
6. Agency members and offers cleared, same as natural close.

The line naming the cause is picked from three banks keyed by the failing axis:
- **scientific** — allergy / raw-food / contamination lines
- **cultural** — service breakdown lines (a guest walked out mid-meal, a booking was lost)
- **practical** — house-standard lines (a table waited 40 min for food, an order was botched three times)

Bank size: 4 lines per axis, so the same collapse line doesn't repeat on adjacent evenings.

### §1.4 · Not what collapse is

- **Not weather-driven.** Bad weather quiets the room; it does not close it (per ORDER 045 non-scope).
- **Not scenario-driven.** A scenario refusal costs reputation via the existing choice C mechanic; it does not force close.
- **Not random.** Every collapse traces to a competence gap and a strain moment. The player can look at the team roster and the load curve and see why it happened.
- **Not always the same axis.** A three-role team without a värd fails culturally. Without a kock, scientifically. Without any specialist and with a lärling on the floor, practically. Which axis fails is decided by which is weakest at the moment of the roll.

### §1.5 · Test coverage

`collapse.test.ts`:
- Weakest calculation across a range of team compositions
- Formula monotonicity (higher strain → higher probability at fixed competence)
- Rate calibration (1000-service simulation returns collapse rate within ±3 % of the analytical prediction for the three team archetypes above)
- State transitions when collapse fires (period → evening, rep drops, stream entry appended, consequence appended, agency cleared)
- Never fires during opening or prep (only post-prep service)
- Never fires twice in the same service

---

## §2 · Morning investment panel (§7)

**A morning surface for the four dials.** Staff count is already the TeamPanel; three more sit alongside it: `trainingLevel` (1/2/3), `pricing` (låg/medel/hög), `ingredientTier` (grund/utvald/premium).

All three exist in `Policies` and are wired through the existing `SET_POLICY` action; the panel is a thin surface over that action. Nothing changes about the simulation semantics; the panel is what turns them from dev-cycled numbers into an intentional morning decision.

### §2.1 · Layout

- Position: below the TeamPanel on the left column (top: 72 + TeamPanel height + 16), same visual language.
- Visible only during `state.day.period === 'morning'` (same as TeamPanel).
- Each dial is a row of buttons with the current value highlighted; clicking a value dispatches `SET_POLICY` with that patch.
- Text via `strings.sv.ts` under `strings.invest`.

### §2.2 · Why not read from the room

The three dials shape the room but their reading is diffuse — training level touches every event; pricing shifts revenue; ingredient tier shifts cost. The player doesn't need a numeric dashboard, but they do need to see what they set. The panel is the "set" surface. The "read" surface is the room and the evening account (§3).

### §2.3 · Not what this panel is

- Not a scoreboard. No numbers past the button labels.
- Not a modal. Non-blocking, sits open while morning runs.
- Not new mechanics. Only wiring existing `SET_POLICY` fields into player-reachable buttons.

---

## §3 · The evening's account (DESIGN_BACKLOG B-003)

**In the observer's voice, not a table.** What a proprietor tells themselves after closing.

### §3.1 · When and how it appears

- Fires at the moment `day.period` transitions to `'evening'` (natural close or collapse).
- Rendered as a paragraph panel in the centre of the viewport, over the room, in the same voice register as the stream (ORDER 043 Addendum B).
- Held for ~25 s (visible), then fades over ~5 s. `EVENING_TO_MORNING_PAUSE_SEC` extended 15 → 30 to give it space.
- Non-blocking; the player can dismiss with a click if they've read it.

### §3.2 · Branches

The panel picks one of six templates from state at evening start:

1. **Collapsed** — `day.serviceCollapsed === true`. Opens on the failure ("Kvällen slutade innan den skulle."), names what the room said (from the collapse line), notes the reputation carried out.
2. **High-wager-win** — a wager was won on a weak capital (delta ≥ 0.09, i.e. the weak-win multiplier fired). Opens on the gamble ("Du satsade på det ekonomiska, och kvällen bekräftade det.").
3. **High-wager-loss** — a wager was placed and lost. Opens on the misread ("Du läste kvällen fel, och den svarade snabbt.").
4. **Good night** — no collapse, revenue > cost × 1.15, reputation held or grew. Opens on the flow ("Kvällen höll ihop utan att någon behövde påminnas.").
5. **Thin night** — no collapse, revenue < cost × 0.90. Opens on the empty room ("Rummet höll formen, men beställningarna kom aldrig.").
6. **Mediocre** — everything else. The Vision Owner's specific ask: "kvällen bara var medioker — inte varje kväll ska ha en poäng." Deliberately non-committal ("Kvällen gick — utan att lämna något efter sig som säger något om laget.")

Each template is a 3–5 sentence paragraph in `strings.sv.ts` under `strings.eveningAccount`. Numbers not surfaced; the paragraph observes. Money is named as "täckte kostnaderna", "gick back", "gick över", not as a figure.

### §3.3 · Test coverage

`eveningAccount.test.ts`:
- Branch selection covers all six for the constructed state pairs
- Collapsed branch preempts wager branches when both conditions are true
- Mediocre branch is the fallback when no other criterion trips
- Template strings are non-empty and end on a sentence terminator

---

## §4 · Animation polish

**Animate what already exists. No new geometry, no new materials.** Three targets:

### §4.1 · Guest sit / stand

- On the tick a guest transitions `waiting → seated`, ease their Y by −0.15 m over ~500 ms (a "sit down" dip), then hold.
- On the tick a guest transitions `paying → leaving`, ease Y back up over ~500 ms before the walk-away path takes over.
- Implementation: `InteriorGuests` tracks previous state per guest; a Y-offset animation curve overlays the existing lean-Y.

### §4.2 · Staff at station

- While a StaffMember has a non-null `taskType`, overlay a small Y-bob (±0.03 m, ~2 Hz) on their position.
- The bob is on top of the existing drift; a staff member walking + working reads as walking with rhythm.
- Idle staff (taskType === null) do not bob — the difference between "doing something" and "waiting for something" is the reading.

### §4.3 · Door opening moment

- At the tick the prep window ends (existing `doorsOpenedThisService` flip), draw a transparent quad at `layout.entrance` that scales from 0.9× to 1.15× and fades out over 1.5 s.
- Neutral colour matching the interior warm-beige; no icon, no text.
- Signals "the doors have opened" as a room event, not just as a stream line.

None of these touch simulation state. All three are pure `useFrame` overlays on existing mesh transforms.

---

## §5 · Build order

Four commits, one per delmoment, in this order:

1. Collapse (§1) — new state field, formula, tick check, sentence banks, `SET_POLICY`-parallel infrastructure. `collapse.test.ts` added.
2. Investment panel (§2) — `InvestmentPanel.tsx`, `strings.invest`, mounted alongside TeamPanel in StrategicApp.
3. Evening account (§3) — `EveningAccountPanel.tsx`, `strings.eveningAccount`, `EVENING_TO_MORNING_PAUSE_SEC` bumped, branch selector, `eveningAccount.test.ts`.
4. Animation polish (§4) — three overlays inside InteriorGuests / InteriorStaff / a small `EntranceDoorPulse` component under StrategicScene.

Report separately per commit per Vision Owner instruction.

---

## §6 · Acceptance

Vision Owner plays 3–5 days across a range of hiring choices and reports:

1. **Collapse felt rare and traceable.** When it fired, they could name why (the lärling on the pass, the missing värd, the strained load). If they had a strong team it never fired; if they went cheap it eventually did.
2. **The investment panel changed how the morning read.** They set the three dials as a decision, not as an afterthought.
3. **The evening account arrived in a voice they recognised.** It named the flow of the evening without a table; the mediocre branch fired on evenings that deserved it.
4. **The room read as animated, not shifted.** Guests sat and stood; staff moved with rhythm at their station; the door opening was a moment.

If (1) reads as too rare, `COLLAPSE_STRAIN_GAIN` doubles. If too frequent, halves. First-cycle tuning is expected.

---

## §7 · Out of scope

- Nightclub as a fourth service (B-006).
- Persistence between sessions (B-005).
- The eight-role staff expansion (B-004).
- Any new geometry or materials in the interior.
- Multiplayer, competitor visits, ambition-wager (B-001 / B-002).
- Rebalancing the reputation loop, wager math, or scenario weighting.

---

## §8 · File touchpoints (expected)

**New:**
- `documentation/architecture/ORDER_046_THE_CYCLE_CLOSES.md` (this file)
- `frontend/src/strategic/simulation/collapse.ts`
- `frontend/src/strategic/simulation/eveningAccount.ts`
- `frontend/src/strategic/simulation/__tests__/collapse.test.ts`
- `frontend/src/strategic/simulation/__tests__/eveningAccount.test.ts`
- `frontend/src/strategic/business/InvestmentPanel.tsx`
- `frontend/src/strategic/scenario/EveningAccountPanel.tsx`
- `frontend/src/strategic/scene/EntranceDoorPulse.tsx`
- `frontend/src/content/eveningAccount.sv.ts` (paragraph templates)

**Touched:**
- `frontend/src/strategic/types.ts` — DayState + SimulationState fields for `serviceCollapsed`, `collapseAxis`, `eveningAccountShownAt`.
- `frontend/src/strategic/simulation/model.ts` — new fields in `initialDay()`.
- `frontend/src/strategic/simulation/reducer.ts` — collapse tick, `EVENING_TO_MORNING_PAUSE_SEC` bump, force-evening in transitions.
- `frontend/src/strategic/StrategicApp.tsx` — mount `InvestmentPanel` + `EveningAccountPanel`.
- `frontend/src/strategic/scene/StrategicScene.tsx` — mount `EntranceDoorPulse`.
- `frontend/src/strategic/scene/InteriorGuests.tsx` — sit / stand Y animation.
- `frontend/src/strategic/scene/InteriorStaff.tsx` — task bob overlay.
- `frontend/src/content/strings.sv.ts` — `strings.invest`, `strings.eveningAccount`.
- `documentation/architecture/ORDER_REGISTRY.md` — row for 046.
- `documentation/DESIGN_BACKLOG.md` — mark B-003 executed.
