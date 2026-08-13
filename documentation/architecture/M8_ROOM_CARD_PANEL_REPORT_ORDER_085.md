# M8 Room Card Panel — Report Gate (ORDER 085)

**Status:** Report gate. **No code touched.** Awaiting Vision Owner approval before build.
**Order:** ORDER 085 — Path C selected from ORDER 083's two-path proposal plus ORDER 084's third option; report first.
**Parents:** `M0_CAMERA_PITCH_PROBE_REPORT_ORDER_083.md` (the two paths and why neither was picked), `ORDER_REGISTRY.md` §084 (the addition of Path C to the comparison and its assessment), `M8_PERCEPTION_PUNCH_LIST.md` (the rows this order promotes), `ORDER 044 §3.2` (the puck-silhouette design decision preserved), `ORDER 082` (unsent — StaffFace prototype referenced).
**Companion during build (once approved):** the `guest-reel.jsx` reel — its 8 pose names remain the label vocabulary so any card action traces back to the reel state that inspired it.

---

## 0. What was decided and what was not

**Decided (in the order itself):** the room stays aggregate. Position, density, and the M5 rhythm ring keep doing what they do; nothing about `InteriorStaff.tsx` / `InteriorGuests.tsx` / `Scene.tsx` is touched by ORDER 085. Action-reading — "what is this person doing right now" — moves out of the room and onto a data-driven card panel.

**Not decided (this report will not pick):**
- Panel placement (left column / right column / bottom drawer / floating over the room). §3 will describe the fields but not the layout.
- Whether cards render in the same DOM tree as the R3F canvas or in a separate `<div>` overlay.
- Which rendering approach for the face — inline SVG, `<canvas>`, or per-expression PNG spritesheet. §2 describes the derivation contract; the render approach is a follow-on pick.
- Whether the `Table` concept becomes a first-class state entity or stays derived from `Guest.seatIndex` clusters. §3.1 shows the trade-off.

Vision Owner reads this report, chooses on §1–§4 as specified, then a follow-on order authorises the build with the picks marked.

---

## 1. `currentAction` as a pure function

The order's constraint is precise: *ren funktion av befintligt state, ingen handförfattad koreografi, ska kunna testas: state in, text+ikon ut.*

### 1.1 What "existing state" concretely means (verified against `frontend/src/strategic/types.ts`)

The report writes only against what is already in the state tree today. No fields are proposed as additions to `SimulationState` under this order.

**Guest** (`Guest` interface, `types.ts:129`):
- `id: string`
- `state: GuestState` = `'arriving' | 'waiting' | 'seated' | 'ordering' | 'dining' | 'paying' | 'leaving' | 'declined'`
- `satisfaction: number` ∈ [0, 1]
- `seatIndex: number | null`
- `arrivalTime: number` (simTime at spawn)
- `stateTime: number` (simTime when current `state` was entered)
- `scenarioSource: boolean`
- `walkAwayOnArrival: boolean`
- `hadWelcomeDrink: boolean`

**Waiting time is derivable** as `state.simTime − guest.stateTime`. The order named "väntetid" as an input; no new field needed — the arithmetic is one subtraction against `simTime`.

**StaffMember (visual puck, `types.ts:64`):**
- `id: string`
- `role: StaffRole`
- `workload: number`
- `taskType: TaskType | null` = `'greet' | 'seat' | 'order' | 'serve' | 'decant' | 'flambe' | 'clear' | 'welcomeDrink'`
- `taskProgress: number`, `taskDuration: number`
- `targetGuestId: string | null` — which guest they are working on
- `position`, `targetPosition`, `moveProgress`

**Day-level state consumed:**
- `state.day.platesRemaining: Record<string, number>` (ORDER 077 §4)
- `state.day.serviceRhythm: 'green' | 'amber' | 'red' | null` (ORDER 078)
- `state.day.prepReadiness: Record<string, number>` (ORDER 078)
- `state.day.period` — the phase gate; the same guest with `state='seated'` reads differently during `prep` vs `service`

Nothing proposed here requires a schema change to `types.ts`. That is deliberate — the whole point of Path C is that the state model is already rich enough; only the read-out was missing.

### 1.2 Staff currentAction derivation table

The function signature:

```ts
type StaffCardAction = { text: string; iconKey: StaffIconKey };
function deriveStaffAction(
  staff: StaffMember,
  guests: readonly Guest[],       // to look up targetGuestId → guest.state
  day: DayState,                  // period, serviceRhythm, prepReadiness
  simTime: number
): StaffCardAction;
```

Full derivation is table-based, evaluated top to bottom (first matching row wins). This preserves the "no hand-authored choreography" constraint — the function is a `switch` over declared inputs, not a script.

| # | Condition | Text | iconKey | Reel-name traceability |
|---|---|---|---|---|
| S1 | `day.period` ∈ {`morning`, `opening`} | `"Preparing today's plan"` | `plan` | (pre-service, off-reel) |
| S2 | `day.period === 'prep'` AND `staff.taskType === null` | `"On break"` | `pause` | (off-reel) |
| S3 | `day.period === 'prep'` AND `staff.taskType !== null` AND lowest `prepReadiness[itemId]` < 0.5 | `"Chasing ${weakestItem}"` | `chase` | (short-prep → running-about; feeds punch-list row 21) |
| S4 | `day.period === 'prep'` (fallback) | `"Mise en place — ${itemForRole}"` | `prep` | (off-reel) |
| S5 | `staff.taskType === 'greet'` | `"Greeting ${guestLabel}"` | `hail-response` | (mirrors reel HAIL from staff side) |
| S6 | `staff.taskType === 'seat'` | `"Seating ${guestLabel}"` | `seat` | (mirrors reel SIT-DOWN) |
| S7 | `staff.taskType === 'order'` | `"Taking order at ${seatLabel}"` | `order` | (mirrors reel READ-MENU) |
| S8 | `staff.taskType === 'welcomeDrink'` | `"Pouring welcome drink for ${guestLabel}"` | `drink` | (off-reel) |
| S9 | `staff.taskType === 'serve'` | `"Serving ${dishName ?? 'plate'} to ${seatLabel}"` | `serve` | (mirrors reel EAT — serve is the deliver-half) |
| S10 | `staff.taskType === 'decant'` | `"Decanting for ${seatLabel}"` | `decant` | (off-reel — sommelier work) |
| S11 | `staff.taskType === 'flambe'` | `"Flambéing at ${seatLabel}"` | `flambe` | (off-reel — chef spectacle) |
| S12 | `staff.taskType === 'clear'` | `"Clearing ${seatLabel}"` | `clear` | (post-EAT, pre-EXIT bridge) |
| S13 | `day.period === 'service'` AND `staff.taskType === null` AND `day.serviceRhythm === 'red'` | `"Standing by — room chasing itself"` | `standby-strain` | (M5 rhythm × idle) |
| S14 | `day.period === 'service'` AND `staff.taskType === null` (fallback) | `"Standing by"` | `standby` | (off-reel) |
| S15 | `day.period === 'evening'` | `"Closing down"` | `close` | (off-reel) |

`weakestItem` = the `id` in `prepReadiness` with the lowest value at this tick. `itemForRole` = static role → prep-item map (kock → stations, servitör → cutlery, värd → napkins) — this is one line of a lookup table, not choreography.

`guestLabel` and `seatLabel` are also pure lookups: `guests.find(g => g.id === staff.targetGuestId)?.seatIndex ?? '?'` formatted as `"Seat ${n}"` or `"the door"` when `null`.

### 1.3 Guest currentAction derivation table

```ts
type GuestCardAction = { text: string; iconKey: GuestIconKey };
function deriveGuestAction(
  guest: Guest,
  day: DayState,
  simTime: number,
  menu: readonly MenuEntry[]     // for dish name if ordered
): GuestCardAction;
```

Waiting-time thresholds are the only tunable numbers in this function. Two constants are named here so testing can fix them:

- `WAIT_IMPATIENT_SEC = 30` — waiting/ordering past this switches label to the impatient reading
- `WAIT_HAIL_SEC = 60` — waiting/ordering past this switches to hail

| # | Condition | Text | iconKey | Reel-name traceability |
|---|---|---|---|---|
| G1 | `guest.walkAwayOnArrival === true` AND `guest.state === 'leaving'` | `"Turned away at the door"` | `walk-away` | (reel EXIT, sad variant) |
| G2 | `guest.state === 'arriving'` | `"Arriving"` | `arriving` | reel **IDLE** (doorway) |
| G3 | `guest.state === 'waiting'` AND `(simTime − guest.stateTime) < WAIT_IMPATIENT_SEC` | `"Waiting to be seated"` | `waiting` | reel **IDLE** at door → **WALK** in |
| G4 | `guest.state === 'waiting'` AND `(simTime − guest.stateTime) ≥ WAIT_IMPATIENT_SEC` AND `< WAIT_HAIL_SEC` | `"Waiting — 40 s"` (auto-formatted seconds) | `waiting-impatient` | reel **IMPATIENT** (foot-tap) |
| G5 | `guest.state === 'waiting'` AND `(simTime − guest.stateTime) ≥ WAIT_HAIL_SEC` | `"Trying to catch someone's eye"` | `hail` | reel **HAIL** |
| G6 | `guest.state === 'seated'` AND `!guest.hadWelcomeDrink` AND `day.period === 'service'` | `"Just seated"` | `seated` | reel **SIT DOWN** completed |
| G7 | `guest.state === 'seated'` AND `guest.hadWelcomeDrink` | `"Sipping welcome drink"` | `drink` | (reel-adjacent; sits between SIT-DOWN and READ-MENU) |
| G8 | `guest.state === 'ordering'` AND `(simTime − guest.stateTime) < WAIT_IMPATIENT_SEC` | `"Reading the menu"` | `read-menu` | reel **READ MENU** |
| G9 | `guest.state === 'ordering'` AND `(simTime − guest.stateTime) ≥ WAIT_IMPATIENT_SEC` | `"Ready to order"` | `ready-to-order` | reel **HAIL** (soft variant) |
| G10 | `guest.state === 'dining'` AND `guest.satisfaction ≥ 0.7` | `"Enjoying the ${dishName}"` | `eat-good` | reel **EAT** |
| G11 | `guest.state === 'dining'` AND `guest.satisfaction < 0.7` | `"Eating quietly"` | `eat-neutral` | reel **EAT** |
| G12 | `guest.state === 'paying'` AND `guest.satisfaction ≥ 0.7` | `"Paying — happy"` | `pay-good` | (reel-adjacent; post-EAT) |
| G13 | `guest.state === 'paying'` AND `guest.satisfaction < 0.7` | `"Paying — quietly"` | `pay-neutral` | (reel-adjacent) |
| G14 | `guest.state === 'leaving'` | `"Leaving"` | `exit` | reel **EXIT** |
| G15 | `guest.state === 'declined'` | `"Left before being seated"` | `declined` | reel **EXIT** (walk-away variant) |

`dishName` resolves via `menu.find(m => m.dishId === guest.orderedDishId)?.name ?? 'plate'` — if the game state doesn't currently carry `orderedDishId` per guest (it doesn't, verified against `types.ts`), the label uses `'plate'` and the report gate flags this as an accepted small imprecision. Adding `orderedDishId` to `Guest` is a possible follow-on but is not required for the DoD in §4.

### 1.4 Reel-name traceability

Every card action that maps to a reel pose keeps the reel name in a comment beside its lookup entry. Grep test: `grep -c "reel \*\*" src/strategic/panels/RoomCardPanel/deriveActions.ts` must return ≥ 8 (one per reel state). This is the trace-back the order asked for.

### 1.5 Purity and testability

Both functions are:
- **Pure** — same inputs, same output; no `Math.random`, no `Date.now()`, no side effects, no reads of `window` or `document`.
- **Total** — every reachable state combination hits a row. TS union-narrowing on `GuestState` and `TaskType` enforces exhaustiveness via `assertNever` in the final `default` branch.
- **Tick-idempotent** — repeated calls at the same `simTime` with unchanged state return identical output.

**Test surface (proposed under §4):**
- One unit test per row of both tables — 15 staff rows + 15 guest rows = 30 explicit `(input, expectedOutput)` assertions. Rows without wildcards can be tested against literal `{text, iconKey}` values; rows with template strings (`${weakestItem}`, `${dishName}`) test with a fixture guest/staff.
- Exhaustiveness test: iterate every value of `GuestState`, every value of `TaskType`, assert the deriver returns a non-null result for each — no state reaches the `assertNever` fallback.
- Property test: for a scripted 3-day dinner run (INFRA-2 harness), assert `deriveGuestAction` returns a stable output across two consecutive calls when `simTime` and guest state are unchanged.

---

## 2. StaffFace — 10 expressions, derived from the same state

**ORDER 082 unsent context.** The 10 expressions below are proposed here for the first time under ORDER 085 — ORDER 082 filed the direction but its own document was never written. This report is the first artefact that fixes the 10; if a later ORDER 082-real document ships, it should be reconciled against this list rather than treated as authoritative independently.

### 2.1 The 10 expressions

**Reconciled under ORDER 086 (2026-08-13).** Original §2.1 proposed a list independently of the StaffFace prototype (referenced from unsent ORDER 082). The prototype has `irriterad / förvirrad / förvånad / stolt`; the report had `apologetic / hurried / attentive / satisfied` (among others). ORDER 086 asks which ten actually ship. **Final vocabulary — one list, motivated per drop:**

1. `neutral` — resting; nothing being demanded of them
2. `focused` — task in hand, working
3. `smiling` — greeting or a warm moment (S3 in staff table)
4. `attentive` — leaning in, listening (order-taking, question)
5. `tense` — under pressure but coping (amber rhythm)
6. `strained` — coping breaking (red rhythm + high personal load)
7. `hurried` — moving faster than composed (personal load ≥ 0.85)
8. `exhausted` — end-of-service or post-collapse
9. `proud` — landed correct answer / dish served well. *Replaces `satisfied` from the original list AND `stolt` from the prototype.* Rationale: the state that would fire "satisfied" (a landed moment) reads as active pride at the strategic scale — passive contentment doesn't distinguish from `neutral` in a 96 × 96 SVG at a distance.
10. `irritated` — task failed OR target guest satisfaction < 0.3. *New from prototype `irriterad`.* Fires on `recentAnswerWrong` (episteme write blocked) OR when this staff's `targetGuestId` points at a guest with `satisfaction < 0.3`. Reveals a real state that no other expression covered.

**Dropped from the original report:**
- `apologetic` — the state it would reveal (red rhythm + own low load, "softening toward the guest during strain") is edge-case and the visual distinction from `strained` at 96 × 96 is a rendering nuance (softer eyes), not a state distinction. The state gets absorbed into `strained` — one face for room-in-trouble, not two.

**Dropped from the prototype:**
- `förvirrad (confused)` — no reachable state fires it. Wrong-answer-to-professional-question reads as `irritated` (irritation at own failure), not confusion; the state model has no "staff faces an unknown scenario" branch (scenarios always draw from a known bank). Would reveal no state the model actually enters.
- `förvånad (surprised)` — momentary reaction that would either flash for one tick (unreadable at 60 fps) or persist for seconds after its trigger (dishonest). Belongs in a transition animation, not a steady-state face vocabulary that cards refresh per-tick against.

Each is one authored SVG face; variants per role and per guest arketype (kock / servitör / värd / lärling + scarf / cap / bun) share the same expression key. Asset budget: 10 expressions × 4 role palettes = 40 staff SVGs, and 10 × 3 guest palettes = 30 guest SVGs, totalling 70 files. Authored under build step 2 (§6).

### 2.2 Staff face derivation table

Same pure-function shape as §1.2 — table-based, first-match, no choreography:

```ts
type FaceKey = 'neutral' | 'focused' | 'smiling' | 'attentive' | 'tense' | 'strained'
             | 'hurried' | 'exhausted' | 'proud' | 'irritated';
function deriveStaffFace(
  staff: StaffMember,
  day: DayState,
  workload: number,          // from staff.workload
  simTime: number,
  recentAnswerHit: boolean   // derived from state.enablers history — see below
): FaceKey;
```

| # | Condition | Face | Rationale traced to existing state |
|---|---|---|---|
| SF1 | `day.period === 'evening'` OR `serviceJustCollapsed(day, simTime)` | `exhausted` | Post-service or post-collapse |
| SF2 | `recentAnswerHit === true` (correct professionalQuestion within last 5 s) | `proud` | Enabler history increment in the last 5 s of simTime (renamed from `satisfied` per ORDER 086 §2.1) |
| SF3 | `staff.taskType === 'greet'` OR `staff.taskType === 'welcomeDrink'` | `smiling` | Greeting tasks — outward warmth |
| SF4 | `staff.taskType === 'order'` | `attentive` | Order-taking — listening |
| SF5 | `day.serviceRhythm === 'red'` AND `workload ≥ 0.7` | `strained` | The rhythm the room is calling |
| SF6 | `targetGuest.satisfaction < 0.3` (this staff's assigned guest is visibly unhappy) OR `recentAnswerWrong === true` | `irritated` | Task failing at this staff — replaces the dropped `apologetic` slot with `irritated` per ORDER 086 reconciliation |
| SF7 | `day.serviceRhythm === 'amber'` | `tense` | Middle band |
| SF8 | `workload ≥ 0.85` (regardless of rhythm) | `hurried` | Personal-load-driven — reading fast |
| SF9 | `staff.taskType !== null` (fallback while working) | `focused` | Any task in hand with no other flag |
| SF10 | (fallback) | `neutral` | Not working, not stressed |

`serviceJustCollapsed(day, simTime)` = a pure predicate over `state.day` reading whether the last service ended via `fireCollapse` within the last N seconds. It's already computable from existing state (`day.serviceOutcome`, `day.serviceClosedAt`) — no new field.

`recentAnswerHit` derives from `state.enablers.<role>.<axis>.history[-1].simTime` — if the newest history entry across all enablers is within `simTime - 5s`, the flag is true. Pure, testable, no time-travel.

### 2.3 Guest face variant (same 10 expressions applied)

Guests also use the 10-expression vocabulary — same SVG kit, different arketype palette (scarf / cap / bun from the reel's `variant` prop). Derivation:

| # | Condition | Face |
|---|---|---|
| GF1 | `guest.state === 'declined'` OR `walkAwayOnArrival === true` | `strained` (turned-away read) |
| GF2 | `guest.state === 'leaving'` AND `guest.satisfaction ≥ 0.7` | `proud` |
| GF3 | `guest.state === 'leaving'` AND `guest.satisfaction < 0.4` | `irritated` (silent-frown read; replaces the dropped `apologetic` slot) |
| GF4 | `guest.state === 'leaving'` (fallback) | `neutral` |
| GF5 | `guest.state === 'paying'` AND `guest.satisfaction ≥ 0.7` | `smiling` |
| GF6 | `guest.state === 'paying'` (fallback) | `neutral` |
| GF7 | `guest.state === 'dining'` AND `guest.satisfaction ≥ 0.7` | `proud` |
| GF8 | `guest.state === 'dining'` (fallback) | `focused` |
| GF9 | `guest.state === 'ordering'` | `attentive` |
| GF10 | `guest.state === 'waiting'` AND `(simTime − guest.stateTime) ≥ WAIT_HAIL_SEC` | `hurried` (also the HAIL card badge) |
| GF11 | `guest.state === 'waiting'` AND `(simTime − guest.stateTime) ≥ WAIT_IMPATIENT_SEC` | `tense` |
| GF12 | `guest.state === 'waiting'` (fallback) | `neutral` |
| GF13 | `guest.state === 'arriving'` OR `'seated'` (fallback) | `neutral` |

### 2.4 Purity — same as §1.5

The face derivations join the action derivations in the same test surface: one unit per row, exhaustiveness on `GuestState` × `TaskType` × rhythm buckets, property test for tick-idempotence.

---

## 3. Table cards vs staff cards

### 3.1 Is there a `Table` entity?

**No, not today.** `Guest.seatIndex` is a number ∈ [0, capacity). There is no `Table` interface, no `state.day.tables`. Two paths:

- **Path 3a — table = per-guest card indexed by `seatIndex`.** One card per living guest. Simple; no state change. "Table 3" is just the label rendered for the guest whose `seatIndex === 3`. Cards disappear when the guest leaves.
- **Path 3b — introduce a first-class `Table` entity.** Adds `state.day.tables: TableState[]` with `{ id, seatCount, guests: string[], groupId? }`. Enables party-of-N modelling later. Not required for ORDER 085's card panel to work.

**Recommendation:** Path 3a for ORDER 085 build. Group modelling is out of scope; the card-per-guest read is what the punch-list rows require. Path 3b can promote later without invalidating any ORDER 085 code — the card panel just switches its enumeration source.

### 3.2 Staff card fields (per member)

| Field | Source | Notes |
|---|---|---|
| Face | `deriveStaffFace(...)` (§2) | 96 × 96 SVG at panel scale |
| Role label | `staff.role` | e.g. "Chef", "Servitör", "Värd" |
| Name (optional) | `teamMember.name` if present | Not carried in `TeamMember` today — falls back to role + index |
| currentAction text | `deriveStaffAction(...)` (§1.2) | e.g. "Serving pork-plate to Seat 3" |
| currentAction icon | same, `iconKey` | 24 × 24 SVG |
| Rhythm ring | `day.serviceRhythm` mirrored | Same colour as the puck's ring in-scene; ORDER 078 continuity |
| Workload bar | `staff.workload` | Small horizontal bar, [0, 1] |
| Task progress | `staff.taskProgress / staff.taskDuration` | Only visible when `taskType !== null` |
| Competence dots | `teamMember.competence` | Read-only; three axes as a small chip |

### 3.3 Table card fields (per guest, seatIndex-indexed)

| Field | Source | Notes |
|---|---|---|
| Face | `deriveGuestFace(...)` (§2.3) | Same 96 × 96 slot as staff |
| Seat label | `guest.seatIndex` | "Seat 3" / "At the door" if `null` |
| Arketype | derived from guest id hash → variant | scarf / cap / bun palette from reel |
| currentAction text | `deriveGuestAction(...)` (§1.3) | e.g. "Waiting — 40 s" |
| currentAction icon | same, `iconKey` | 24 × 24 SVG |
| Satisfaction dot | `guest.satisfaction` | Small circle, colour banded green / yellow / red |
| Time-in-state | `simTime − guest.stateTime` | Formatted as "40 s" — matches the impatient threshold reading |
| Dish + plates-remaining | `guest.orderedDishId` (if added) → `day.platesRemaining[dishId]` | If unset, hides; if the dish they ordered is at 0 elsewhere it flashes |
| Assigned-to badge | `staff.find(s => s.targetGuestId === guest.id)?.role` | Which staff role is en route or engaged |

### 3.4 The difference

Staff cards emphasise **what is being done** — task, progress, load. The visual weight is on the action line and the workload bar. Every staff card represents a *worker*.

Table cards emphasise **where the guest is in the arc** — state, time in state, satisfaction. The visual weight is on the state label and the time-in-state reading. Every table card represents a *waiter (in the noun sense — someone waiting)*.

Both share the same face vocabulary (§2) but the derivation table differs. Both share the currentAction shape `{text, iconKey}` but consume different source data. This shared shape is what lets the panel render them in the same visual grid with no branching per card type — the panel iterates a single list of `{face, headerText, actionText, iconKey, sideBar, sideBarValue}` structs.

---

## 4. Which punch-list rows this promotes from perception to autonomous DoD

The order asked which rows *move* from perception to autonomous. Movement means: the row can now be asserted in a test file (typecheck / vitest / DOM-testing-library) rather than requiring the Vision Owner to sit at the desk and read.

### 4.1 Rows that move to autonomous

| Punch-list row | Original perception check | Autonomous DoD enabled by Path C |
|---|---|---|
| **Row 1** — instruments make it possible to see how the evening is going without reading every line | Sight-read of the instruments panel | The card panel *is* the instruments panel for the room. DoD: assert every active `StaffMember` and every living `Guest` has a card in the panel at every tick. `expect(cards.length).toBe(staffs.length + guests.length)`. Panel presence + card presence per entity is a DOM assertion. |
| **Row 4** — answering a scenario produces a visible movement attributable to the answer | Vision Owner watches for a moving instrument | DoD: dispatch RESOLVE_SCENARIO, assert the staff card whose `targetGuestId === scenario.guestId` (or the affected enabler-bearing role) shows a `satisfied` face within `2 × TICK_DT` and its currentAction text changes. Pure DOM + state assertion. |
| **Row 8 / 20** — rhythm reads at a glance in the room | Sight-read of staff-puck ring colour | Card panel already carries the same ring colour on staff cards (§3.2). DoD: `expect(card.querySelector('.rhythm-ring').dataset.colour).toBe(state.day.serviceRhythm)` on every staff card, every tick. Removes the edge-on visibility problem entirely (rings in 2D CSS, not on the 3D floor plane). |
| **Row 12** — watching plates run down was worth watching | Sight-read of PlatesRemainingPanel | Table cards show `platesRemaining[orderedDishId]` for each guest. DoD: assert count monotonically decreases (never increases mid-service), and reaches zero at least once when scripted to do so. Already covered mechanically in `m4.test.ts`; card panel makes it visible per-seat rather than per-dish aggregate. |
| **Row 21** — short prep produced running-about the player could see | Sight-read of puck movement | DoD: SKIP_PREP scripted, assert ≥ 30 % of staff cards show `iconKey === 'chase'` within the first minute of service. Rule S3 in §1.2 fires deterministically on `prepReadiness` inputs — assertable end-to-end. |

**Five rows promoted.** All five previously required a human at the browser; all five become vitest assertions.

### 4.2 Rows that STAY perception

| Row | Why it stays |
|---|---|
| Row 2 (stream readable) | Stream panel sizing, unrelated to cards |
| Row 3 (several different scenarios) | Scenario diversity, unrelated |
| Row 5 (morning investment in evening) | Evening-account paragraph text, unrelated |
| Row 6 (collapse reads as consequence) | Partly card (staff cards flip to `exhausted`) but the "reads as consequence" claim is a narrative read the paragraph carries — sight-read stays |
| Row 7 (M1 DoD 4 articulation) | Human judgment by construction |
| Row 9 / 10 (M6b prose) | Sentence-bank quality, unrelated |
| Row 11 (supplier trade-off) | Morning surface, unrelated |
| Row 13 (ecological reading) | Morning + evening read, unrelated |
| Row 14 (morning ↔ evening same decision) | Cross-surface read, unrelated |
| Row 15–19 (M7-tier) | Bank meeting scene, unrelated |
| Row 22 (wide-viewport overlap) | Layout responsiveness — the panel-as-a-surface has its own layout problem; ORDER 085 must not repeat M1 defect B's mistake (see §5 note) |
| Row 23 (open with empty stock) | UI-guard concern, unrelated |
| Row 24 (rep floors at 0.00) | Recovery mechanism, unrelated |
| Row 25 (chef-question tone) | Content policy, unrelated |

### 4.3 Net effect on M8 pass 2

Under bundling from `M8_PERCEPTION_PUNCH_LIST.md` §3 the perception-check total was ~21. This order takes 5 of those to autonomous. Pass-2 sight-read count drops to ~16 distinct checks. First rough gain to the Vision Owner: pass length ~30–45 min → ~25–35 min for the reading part; combined with the four playtest findings being fixed, this measurably shortens the gate.

---

## 5. Not decided here (calls for follow-on)

- **Panel layout on wide viewport.** ORDER 085 must ship with responsive layout from the first commit — reopened M1 Defect B is exactly this failure mode. Concrete constraint: the panel must pass a DOM regression at 1280 × 720, 1920 × 1080, and 2560 × 1440 without fixed-`left`/`top` pixel constants. If the panel would ever exceed viewport height, cards scroll within the panel — the panel does not grow off-screen.
- **Card ordering** — natural options are seatIndex-sorted, arrival-time-sorted, or attention-priority-sorted (impatient/hail first). Recommendation: seatIndex-sorted with a stable slot per guest until they leave, so the panel doesn't shuffle every tick. Not decided here.
- **Should the R3F room still show pucks with rings if the panel carries the read?** Yes — the room stays as the aggregate view (position, density, rhythm). This is not up for revisit under ORDER 085; the whole point was to keep both surfaces honest.
- **Guest `orderedDishId` field addition.** Not required by this report — the derivation falls back to `'plate'`. Adding it is a small follow-on ORDER if the Vision Owner wants dish-name specificity on the guest card.
- **StaffFace SVG authorship** — three role palettes × ten expressions = 30 SVGs. Author under a follow-on content order or bundle with the build order.

## 6. Build order after Vision Owner gate opens

Sequenced so each step ships green before the next starts:

1. `deriveStaffAction` + `deriveGuestAction` + `deriveStaffFace` + `deriveGuestFace` — four pure functions, ~200 LOC total. Full test coverage per §1.5 / §2.4 in the same commit. **Green: unit tests only, no rendering yet.**
2. Icon SVG kit — enumerate every `iconKey` from the derivation tables, author one SVG per key. **Green: importing the icons compiles; no visual change yet.**
3. FaceCard component — takes `{face, headerText, actionText, iconKey, ...}` and renders. **Green: Storybook or a dev-only smoke route renders every expression once.**
4. RoomCardPanel — enumerates staff + guests, drives `FaceCard` per entity, handles the responsive layout constraint from §5 up front. **Green: DOM regression at three viewport widths.**
5. Wire panel into `StrategicScene` layout. **Green: `#playtest=1` shows the panel; typecheck + build + all existing tests pass.**
6. Autonomous-DoD tests per §4.1 — the five rows that moved. **Green: those assertions pass on a scripted 3-day dinner run.**

Any step failing green stops the sequence; no half-finished implementations per CLAUDE.md guidance.

---

## 7. Reel-name mapping — the audit trail

For each of the reel's 8 pose names, one card action row and one face row must trace back with the reel name written in-code (comment beside the derivation entry). Audit grep at build time:

```
grep -c "reel IDLE\|reel WALK\|reel SIT DOWN\|reel READ MENU\|reel HAIL\|reel IMPATIENT\|reel EAT\|reel EXIT" src/strategic/panels/RoomCardPanel/deriveActions.ts
```

Must return ≥ 8. If it returns fewer, a reel state was silently dropped and the card panel no longer covers the vocabulary the report gate approved.

---

**End of report gate. Awaiting Vision Owner sign-off before any code lands.**
