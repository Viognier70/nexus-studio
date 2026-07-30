# VS-002 unpause — state audit, prototype design-decisions audit, loop-shape proposal — ORDER 041 §5 steps 1–3

**Status:** Report only. Steps 1–3 of ORDER 041 §5. **Step 4 (build) needs its own order.**
**Class:** Engineering + design report
**Session:** ORDER 041 (2026-07-30)
**Parent order:** `ORDER_041_UNPAUSE_VS002_FIRST_PLAYABLE_LOOP.md`
**Governing:** `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §13 (VS-002 pause); `CAMERA_AND_GAMEPLAY_BIBLE.md`; `LEARNING_AND_SCENARIO_ARCHITECTURE.md`; `SUPERSEDING_DIRECTIVE_002.md` §2 (no avatar)
**Author:** Claude Code, read-only investigation. `git diff` under `frontend/src/` shows 0 lines.

---

## 1. VS-002 current state (§5 step 1)

### 1.1 Routing and shell

- `frontend/src/main.tsx` routes on the URL hash: `#/first-person-prototype` → `App` (VS-001), everything else → `StrategicApp` (VS-002). Default is VS-002.
- `frontend/src/strategic/StrategicApp.tsx` — WebGL detection + `CameraProvider` + `StrategicShell` (canvas host + selection UI). Total 82 lines.

**VS-002 today is a strategic view of Grythyttan.** Camera pans / zooms, lands on landmarks, opens a `SelectionChrome` panel showing what was selected. That is it — no business, no scenarios, no time, no simulation running.

### 1.2 What runs

Living, wired-into-the-Canvas, drawn on every frame — the `StrategicScene` component composes:

- **World geometry** — `OsmTerrain`, `OsmWater`, `OsmForest`, `HorizonForest`, `OsmDistricts`, `OsmYards`, `OsmYardSurfaces`, `OsmParcelBoundaries`, `OsmFences`, `OsmDriveways`, `OsmMeadowVegetation`, `OsmPropertyDetail`, `OsmBoats`.
- **Roads** — `OsmRoads`, `StreetLabels`, `OsmTraffic` (moving vehicles).
- **Buildings** — `OsmBuildings` (274 OSM + procedurally rendered), `OsmProceduralOutbuildings`, `CraftedLandmarks` (D1 handcrafted church, gästgivaregård, torget, guldkringlan, măltidens hus, etc.), `CraftedLandmarksD2` (D2 handcrafted kärnhuset, station corridor).
- **Living-world atmospherics** — `ChimneySmoke`, `OsmPedestrians` (walking figures), `LandmarkGatherers` (small clusters at landmark entrances), `PublicRealm`.
- **Landmarks** — `Landmarks`, `OsmLandmarks` (labels + hit targets for selection).
- **Sky / camera / controls** — `Sky`, `CameraController` + `useDesktopControls` / `useTouchControls` with jump-preset shortcuts.

This is a **living, non-interactive world**. Cars drive, chimneys smoke, pedestrians walk, but the player is a camera. Nothing responds to the player, and nothing changes when they select something except the UI panel.

### 1.3 What was left mid-implementation when the pause landed

`frontend/src/strategic/simulation/` — **1053 lines across 6 files, orphaned**. `grep -r "from '.*simulation'" frontend/src` returns nothing outside `simulation/` itself. Nothing in the running app imports these files.

Contents:

| File | Lines | Contents |
|---|---|---|
| `model.ts` | 196 | `DEFAULT_POLICIES`, `makeStaff`, `initialScenario`, `nextGuestId`, `makeGuest`, initial `SimulationState` shape. Imports `INTERIOR` and `RESIDENT_SPLINES` from `content/layout.ts`. |
| `reducer.ts` | 243 | State-machine reducer. Actions: `SET_POLICY`, `TRIGGER_SCENARIO`, `RESOLVE_SCENARIO`, tick step. `scenarioSpawnStep` and `maybeSpawnGuest` guest-arrival mechanics. |
| `service.ts` | 363 | Restaurant service loop — guests waiting, being seated, being served, leaving. Uses `INTERIOR.seatOrder`, `INTERIOR.waitingSpots`, staff role choreography (`värd` / `servitör` / `kock`). |
| `arrivals.ts` | 29 | Guest arrivals — an ambient trickle + a scenario-spawn burst on demand. |
| `economics.ts` | 72 | Revenue / cost / waste bookkeeping per tick. |
| `sustainability.ts` | 150 | Triple bottom-line (economic / social / ecological). |

**`content/layout.ts` (75 lines)** — hand-authored `BUILDINGS: BuildingRef[]` list of 7 named interior-scene buildings (`Vinbaren`, `Bergslagsbönor`, `Sockerlaven`, `Måltidens hotell`, `Grythyttans campus`, `Grythyttans kyrka`, `Ledig lokal`) + `INTERIOR` layout (bar, prep, storage, waiting spots, seat order, staff homes) + `RESIDENT_SPLINES` for ambient village pedestrians. Also imported only by `simulation/`.

**`content/grythyttan.ts:377` `RESTAURANT_INTERIOR`** — a similar interior definition (bar, kitchen, tables, staffHomes) computed relative to a `RESTAURANT.position` in an older content module (line 377 onward). Also not consumed by StrategicApp — it appears to belong to an earlier VS-01 iteration.

`frontend/src/strategic/types.ts` has the full simulation state schema: `Policies`, `StaffMember`, `Guest`, `Resident`, `Pedestrian`, `DeliveryVehicle`, `ScenarioState`, `SimulationState`. That schema is written, typed, and unused by any running component.

**The picture:** the business, staff, guests, arrivals, economy, and scenario shell were all authored, then the pause landed on 2026-07-22 before the reducer was wired to a UI or a tick loop. All six simulation files were added in one commit — `901f155 feat(digital-twin): District 1 production passes 1-5` — that same commit did the District 1 landmark work. Nothing has touched the simulation since. **The pause interrupted the wiring-up step, not the design step.**

The design encoded there:

- **`Policies`:** staff count (2/3/4), training level (0..3), service style, pricing, capacity, ingredient tier, welcome-drink toggle, local-sourcing toggle.
- **Staff roles:** `värd`, `servitör`, `kock`, `servitör` (order matters).
- **Scenario shape:** `{ hasAutoTriggered, active, awaitingChoice, choice: 'A'|'B'|'C'|null, choiceAt, spawnedRemaining, nextSpawnAt, visibleGuestIds }`. A/B/C choice mechanic; scenario spawns a burst of guests; response is chosen while guests wait.
- **Speed control:** 0 / 1 / 2 / 4×.
- **Triple bottom line:** eco = { econ, social, ecolog }, each a `SustainabilityCondition`.
- **Rolling windows:** revenue / satisfaction / workload / waste.

### 1.4 What VS-002 has that VS-001 (first-person) does not

VS-001 (`frontend/src/App.tsx`) is a separate prototype behind the hash `#/first-person-prototype`: bus arrival → walk → NPC dialogue → registration. Not touched by this order. Its scene tree is `frontend/src/scene/*` (Pavilion, Applicant, BusStop, RegistrationTable, Trees, Mist, Environment) — different codebase, different intent.

**VS-002 has the strategic-camera navigation VS-001 doesn't**; VS-001 has the character-scale dialogue and walk VS-002 doesn't. Neither has a business loop.

---

## 2. Prototype design-decisions audit (§5 step 2, reframed per Vision Owner 2026-07-30)

**Framing correction.** ORDER 041 §4 as written asked for what to lift and what to rewrite from `gastronoma-sim-main/`. The Vision Owner clarified 2026-07-30:

> gastronoma-sim-main is a previous prototype, not the foundation for the new build. Report which design decisions are worth keeping — scenario structure, investment phase, resource decay, Preparedness — not which code can be copied. Nexus is built in its own stack.

**Nothing is lifted verbatim.** The prototype's stack (a different React + Zustand era) and its idioms are not the Nexus stack (React Three Fiber + drei + game-tick reducer). What follows is the four design decisions the Vision Owner named, plus a shortlist of related ones the prototype settled that are worth preserving as design choices when the Nexus build re-creates them in its own idiom.

### 2.1 Scenario structure — KEEP

**Prototype design (`scenarios.ts` in `gastronoma-sim-main`).** Each scenario is a card with:

- `title` — subject the player sees first (`"Chef sjuk"`, `"Allergireklamation"`, `"Åtta walk-in"`), matching `LEARNING_AND_SCENARIO_ARCHITECTURE.md` §4.3's "player sees the subject first" rule.
- `situation` — the specific case revealed once the player commits.
- `checks` — which resource categories determine `Preparedness` for this scenario (e.g. staff-welfare and training for a chef-sick scenario; ekonomi and hygien for an allergy scenario).
- `outcomes` at three tiers keyed on Preparedness — `high` / `medium` / `low`. Each outcome carries an `outcome message` (what happened) + numeric deltas on cash / economic / social / ecological.

**Why it's worth keeping:** the structure separates the *subject-visible-first* moment from the *situation-revealed-second* moment, which is exactly what `LEARNING_AND_SCENARIO_ARCHITECTURE.md` §4.3 requires. It also allows one scenario type to touch multiple resource categories via `checks`, which prevents the "one resource per scenario" reductionism that would flatten the game.

**What Nexus builds instead:** a TypeScript schema for scenarios living in `frontend/src/strategic/content/scenarios.ts` (or similar), typed under `Scenario` in `types.ts`. The 44 prototype scenarios are content, not code — they will need to be re-authored in the Nexus schema, but the shape they should take is settled.

### 2.2 Investment phase — KEEP

**Prototype design.** Between scenarios, the player picks 1–3 resource categories per month to invest in (each with a cost in kSEK). Categories: staff welfare, training, equipment, ingredients, hygiene, marketing (or similar; the specific set is a content choice).

**Why it's worth keeping:** this is exactly what `LEARNING_AND_SCENARIO_ARCHITECTURE.md` §4.4 authorises — *"Free amounts belong here — this is where numbers are legitimate."* The investment panel is the ONE place a numeric HUD is not a design violation, because it's the interface where the player exercises quantitative economic judgement between qualitative scenario judgements. Keeping this separation preserves the "no numbers in the scenario, numbers in the investment" rule the camera bible §11 sets.

**What Nexus builds instead:** an `InvestmentPanel` component that appears between scenarios (not during them). It presents category buttons with per-category cost + running total; commits on "Nästa månad". Purely React UI over the reducer's state; no dependency on the prototype's Zustand shape.

### 2.3 Resource decay — KEEP

**Prototype design.** Every month, categories the player did NOT invest in decay by −5 (or a similar tuning constant). Month-1 grace period so a new player doesn't fall off a cliff.

**Why it's worth keeping:** this is the mechanic that makes `LEARNING_AND_SCENARIO_ARCHITECTURE.md` §4.5's *"error must cost"* legible in the investment phase, not only in scenarios. The Vision Owner's staff-welfare example lands here: an operator who never invests in staff over 12 months finds staff-welfare at 0, so the next staff-related scenario resolves at Preparedness=low, so staff leave / patrons complain / reputation shifts. Removing decay makes investment purely additive, which turns the game into a Skinner box.

**What Nexus builds instead:** a per-tick or per-month step in the reducer that subtracts a decay constant from every resource category not touched by the last investment. Grace-period configurable. The specific decay constant is a tuning choice that will be re-derived once the loop is playable; the *existence* of decay is a design commitment.

### 2.4 Preparedness — KEEP (with modification per §4)

**Prototype design.** `Preparedness ∈ {high, medium, low}` computed *deterministically* from the average of the resource categories the scenario's `checks` list names. The player does NOT wager difficulty; the scenario tells them what their preparedness is once the situation is revealed.

**Why it's worth keeping:** three levels give the scenario-outcomes schema a bounded target (three variants per scenario, not fifteen). Deterministic derivation makes the state predictable and testable. The prototype's tuning proved the design works.

**Modification the Nexus build owes the spec.** `LEARNING_AND_SCENARIO_ARCHITECTURE.md` §4.3 introduces a distinct concept: the player wagers a difficulty level *before* the situation is revealed, and portfolio evidence includes the gap between what the player bid and what the business could actually deliver. **Both belong in Nexus.** ORDER 041 §4 spells this out: *"the four Preparedness levels the prototype computes deterministically should be retained ... the gap between what a player wagers and what the business is actually prepared for is itself readable as evidence."*

**What Nexus builds:** two fields per scenario resolution — `wager: Difficulty` (player's bet, three or four steps of abstract vocabulary per LQ-01) and `preparedness: Preparedness` (deterministic from resources). Outcomes are keyed on `preparedness`; portfolio records both, and the gap `wager − preparedness` becomes portfolio evidence per §4.3's metacognition rule.

### 2.5 Related decisions worth keeping (not on the Vision Owner's named-four list, but load-bearing)

- **Deterministic seed for scenario order.** The prototype's determinism means the same seed replays the same scenarios in the same order. Useful for playtesting comparability; costs almost nothing to keep.
- **Triple bottom line (`eco.{econ, social, ecolog}`) already in Nexus's `types.ts` `SimulationState`.** The prototype's version and Nexus's authored types agree on the shape. Keep the three-axis structure; the specific `SustainabilityCondition` enum is a content choice for later.
- **Rolling windows for revenue / satisfaction / workload / waste.** Already in `SimulationState.rolling`. Keep — needed for consequence-over-time readability per `LEARNING_AND_SCENARIO_ARCHITECTURE.md` §5.

### 2.6 Related decisions from the prototype that are NOT kept

- **Any specific numeric tuning** — investment costs, decay rates, cash starting values, scenario numeric deltas. These are content choices that will be re-derived from Nexus playtesting.
- **The prototype's routing / navigation** — it was a Zustand-based tabbed UI, incompatible with the Nexus canvas-first, camera-based interaction. Nexus produces its own UI.
- **`InvestmentPanel.tsx` specifically** — the LQ-10 audit called it "primary control loop"; that's true of the prototype but Nexus's investment panel is a fresh React component over the Nexus reducer, not a port of prototype JSX.
- **`startFinancing.ts` bankruptcy loop** — outside the first-loop scope per ORDER 041 §2; deferred.

### 2.7 Where the LQ-10 finding stands

The LQ-10 rule (*"where tested design conflicts with the spec, the tested design is presumed correct"*) applies at the DESIGN level, not the CODE level. The four decisions above (scenario structure, investment phase, resource decay, Preparedness) come with LQ-10's presumption. The one significant spec-vs-prototype conflict LQ-10 flagged — the Preparedness-wager gap — is resolved in §2.4 above by keeping both concepts distinct.

---

## 3. Loop shape proposal (§5 step 3)

The four §2 elements, each specified concretely enough to be reviewed against the spec.

### 3.1 A business the player owns (§2.1)

- **State** — `business: { id: string; name: string; buildingId: string; ownedSince: Date; capital: number; staff: { count: 2|3|4; training: 0..3 }; resources: Record<CategoryId, number> }`.
- **Setup** — the game opens with the business already owned (no "buy your first restaurant" screen for the first loop). Player picks a name once at first-run; everything else has default values.
- **No named individual staff** for the first loop — per §2.1, "staff as a count and a competence level, not individuals". Matches the prototype's `staffCount: 2|3|4` + `trainingLevel: 0..3`.
- **Building** — one of the three §6 candidates below. Zoom-in from strategic view to the business is the entry point per `CAMERA_AND_GAMEPLAY_BIBLE.md` §4 (no mode picker).

### 3.2 A scenario arriving unbidden (§2.2)

- **Trigger** — a monthly tick. In the first month, at a randomised offset (5–25 sim-days in), one scenario fires. Non-repeatable, unchosen.
- **Type** — a **judgement** scenario per `LEARNING_AND_SCENARIO_ARCHITECTURE.md` §4.1 (not a knowledge scenario). Concrete first-loop candidate: **the walk-in of eight when the room is nearly full** — the Vision Owner's own example in `CAMERA_AND_GAMEPLAY_BIBLE.md` §8.1. Bounded, socially rich, no correct answer, immediately visible in the room.
- **UX sequence:**
  1. Subject appears: *"En sällskap om åtta anländer utan bord."* Not the full situation — just the subject. Camera cuts to the entrance from the strategic view.
  2. Player wagers difficulty (three abstract steps: `enkel` / `medel` / `svår` or similar per LQ-01). This is the metacognition step.
  3. Situation is revealed: current room state (how many seated, what state the kitchen is in, which staff are on shift), Preparedness computed and shown as a text tag not a number.
  4. Player picks a response from 3–4 options (seat them at 22:00, ask them to wait, ask them to come back, turn away).
  5. Room responds — §3.3 below.
- **Portfolio artefact** — the tuple `(scenario_id, wager, preparedness, choice, room_response)` gets appended to a session log. Not shown to the player during play; it's the substrate the future portfolio will read.

### 3.3 A visible consequence in the world (§2.3) — the hardest, must not be cut

**Per `CAMERA_AND_GAMEPLAY_BIBLE.md` §8:** a decision that produces no visible change in the world did not matter. This is the load-bearing element.

**Concrete mechanism.** After the player picks a response, the camera stays in the room. Over ~30–45 seconds of accelerated sim-time (per `LEARNING_AND_SCENARIO_ARCHITECTURE.md` §5.1's compressed-replay rule for judgement scenarios), one of these plays out:

- **Seat them at 22:00.** Eight guest sprites walk in, sit at the last available table cluster, existing seated guests slow their conversation (a tiny animation state change on the seated crowd), kitchen throughput visibly falls behind (a queue builds in the pass window). Two seated parties leave earlier than they would have. A mentor NPC utterance appears in the corner: *"Åtta sena skänker luft när det redan är fullt — pass op på köket."* No numeric delta appears.
- **Ask them to wait.** They cluster near the entrance, standing. Two of the eight peel off after 90 sim-seconds and leave. The room stays under its capacity limit; kitchen throughput stays steady. Mentor: *"Sex av åtta stannade — ett par gav upp."*
- **Ask them to come back.** They leave. Camera stays with them; they walk toward Torget. No further response is generated. Mentor: *"Ingen risk — ingen nytta."*
- **Turn away.** They leave immediately, with a visible reaction (one of them gestures at the door). Mentor: *"Åtta gäster gick förbi utan att komma in."*

Each response mutates the same visible substrate — the room's rendered state — not a number on a panel. That is what makes it §2.3-compliant.

**Why this is hard.** It requires:

1. An in-scene rendered room view for the chosen building (not the strategic camera). This is a NEW rendering surface — the current `StrategicScene` doesn't have interior geometry.
2. Guest sprites, staff sprites, seated / waiting states, an entrance animation, table cluster hit targets. The prototype has `INTERIOR` layout but no rendered geometry to sit on.
3. A time-compression mechanism (30–45 sim-seconds compressed from real seconds).
4. Mentor NPC utterance overlay — text bubble, not a modal, per §8.1's *"the result lives in the room"*.

**Why it cannot be cut.** Without it, the loop is what §2.3 warns against — *"a quiz with a restaurant painted behind it."* The whole reason to build a first loop at all is to test whether visible-consequence-in-the-room is enjoyable. Cutting it dodges the question the order was written to answer (§9: *"whether Nexus is enjoyable"*).

**How it fits the "no avatar" rule (`SUPERSEDING_DIRECTIVE_002.md` §2).** The camera watches the room; there is no player-character. Guests and staff have positions and animations, but the player is not one of them. Matches the strategic-camera intent.

### 3.4 An investment decision (§2.4)

- **Trigger** — at the end of each sim-month, before the next scenario is spawned.
- **UX** — a full-screen panel (canvas dims, panel foregrounded) with 4–6 category buttons (e.g. Personal / Utbildning / Utrustning / Råvaror). Each button shows a cost in kSEK and, once selected, adds to a running total. Player selects 1–3 categories, hits "Nästa månad".
- **Effect** — selected categories add +N to their resource score; unselected categories decay by −5 (month-1 grace period). New resource averages become inputs to the next scenario's Preparedness computation.
- **Where numbers legitimately appear.** kSEK costs, current capital, running total. Per §2.4 and `LEARNING_AND_SCENARIO_ARCHITECTURE.md` §4.4, this is the one place a numeric HUD is not a design violation.

### 3.5 What the loop deliberately excludes (per §3)

- **No avatar.** No player character; only camera.
- **No mode picker.** Entry is by zooming from strategic view onto the business building. Exit is by zooming back out.
- **No numeric HUD** during scenarios or in the room-view. Numbers appear ONLY in the investment panel.
- **No immediate result popup.** The judgement scenario resolves via §3.3's room response; the mentor utterance is a text bubble in the room, not a modal.
- **No knowledge acquisition surfaces.** No library, no Måltidens Hus, no quizzes, no certification tiers. Reading and study are §11's future scope, not this loop.
- **No multiplayer, no persistence beyond session, no backend.**
- **No new world geometry** — the building for the business is an existing OSM building; the interior rendering is new but built inside the chosen building's footprint.

---

## 4. Three building candidates for the business (§6)

**Constraints applied:**

- Real OSM building (`w*` id, not `vw-*`).
- **NOT** one of the 12 Category B named entities awaiting §4.1 confirmation.
- **NOT** in any of the 39 tier-3 overlap pairs (from `V21_ACCEPTED_OVERLAPS`).
- In D01-historic-centre or D03-torget (both reconstructed per Phase IV).
- Plausibly restaurant/café size: footprint 60–260 m².
- No `amenity` / `tourism` tag in current OSM (Grythyttan's OSM data has none for these buildings — the "plausibility" is spatial, not tag-driven).

Fourteen buildings pass all four hard filters. Three proposed:

### 4.1 Candidate A — `w869907975` — Torget south edge, 146 m² (D03)

- **Position:** local (30.4, −18.1). On Torget's south edge, facing the square.
- **Character:** classic Nordic town-square café spot — small, street-front, visible from the square's centre. If a resident hears *"café at Torget"*, this is the position they picture.
- **Interior fit:** 146 m² gives ~10 tables at Nexus's 12 m² per table pattern (from `RESTAURANT_INTERIOR` in `content/grythyttan.ts`). Right size for a first loop.
- **Camera behaviour:** zoom-in from strategic view falls naturally toward Torget centroid; this building is inside that focus zone.
- **Trade-off:** Torget already has a lot of other rendered elements (paving, trees, monument-less centre); the room-response animation competes with a busy backdrop.

### 4.2 Candidate B — `w193810935` — Prästgatan mid-block, 152 m² (D03)

- **Position:** local (75.9, −0.3). On Prästgatan, roughly halfway between Torget and the Rv 244 T-junction. Ingo petrol station 30 m east; Gästgivaregård 15 m south-east.
- **Character:** through-road restaurant — the position a resident driving Rv 244 into the village would notice. Different social geometry from Candidate A: passers-by rather than square-dwellers.
- **Interior fit:** 152 m² — similar table-count to A.
- **Camera behaviour:** zoom-in from strategic view naturally cuts through the Prästgatan corridor; visible from the Rv 244 approach.
- **Trade-off:** proximity to Pizzans Hus (identity landmark 12 m away) and INGO (identity landmark ~30 m east) — the business shares its scene with two other named entities. That could enrich the setting or clutter it.

### 4.3 Candidate C — `w869907963` — historic-centre restaurant scale, 252 m² (D01)

- **Position:** local (44.9, 44.4). South-east of Torget, in D01-historic-centre, on the block bounded by Prästgatan and Kyrkogårdsgatan.
- **Character:** the largest of the three — 252 m² supports a proper sit-down restaurant with ~15 tables, kitchen, bar. Feels like a *destination* rather than a *walk-in café*.
- **Interior fit:** most room for the §3.3 compressed-replay animation to breathe. Eight-guest walk-in has visible impact on a 15-table room.
- **Camera behaviour:** requires a distinct zoom-in from strategic view — this is not on Torget's immediate edge, so the camera has to travel further. Reads as "the restaurant across the way" rather than "the café on the square".
- **Trade-off:** bigger footprint = more surface to render inside; more scene-tree code; larger first-loop scope. If simpler-is-better for testing enjoyability, A or B is safer.

### 4.4 Recommendation

**Candidate A (Torget south edge, `w869907975`)** for the first loop:

- Smallest scope (146 m², bounded interior render).
- Highest recognisability (Torget is where a resident imagines *"the café in Grythyttan"*).
- Camera path from strategic view is the shortest and most natural.
- The busy Torget backdrop is a feature, not a bug — it means the eight-guest walk-in is against real village activity, not empty stage.

**Fallback: B** if Candidate A's building turns out to be functionally unsuitable when the Vision Owner looks at it on the ground (some `w*` buildings look right on the map but are e.g. sheds or storage in reality — this is exactly what the Category B / OSM-tag audit will surface). Candidate C is reserved for the larger sit-down build if the first loop wants more room per §3.3.

**Vision Owner picks per §6.** All three are ORDER-040-clean (not in tier-3 pairs, not Category B named). All three are in reconstructed districts. Each carries a distinct social geometry the first loop would inherit.

---

## 5. Step 4 — the build — is a separate order

Per §5 wording *"Steps 1 to 3 are this order. Step 4 needs its own."* The build order will pick up:

- Vision Owner's choice of building (§4).
- Vision Owner's approval / amendment of the §3 loop shape.
- The four elements in §2 order — business ownership → scenario arrival → visible consequence → investment — one commit per element, matching the ORDER 040 §-per-commit discipline that has served this session well.

The §3.3 visible-consequence element is the biggest single new piece of code (interior render + sprites + animation + time-compression + mentor overlay). The build order should scope it as its own commit / possibly its own §-block to keep the review boundary sharp — the temptation to cut §3.3 under pressure is exactly what §2.3 of ORDER 041 warns against.

---

## 6. What this report does NOT do

- **Does not build.** Per §7 and §8. Zero code change; `git diff` under `frontend/src/` shows 0 lines.
- **Does not confirm any Category B position** or apply any ORDER 040 §6 correction.
- **Does not modify world geometry / OSM ingest / any building record.**
- **Does not create the §8 Superseding Directive on appearance-vs-position** or lift any ORDER 040 §8 gating.
- **Does not revive VS-001** (the first-person prototype) or touch anything under `frontend/src/scene/` or `frontend/src/App.tsx`.
- **Does not touch `documentation/foundation/`.**
- **Does not add dependencies.**

---

## 7. Acceptance (§8 wording restated)

- [x] VS-002's state reported: what runs (§1.2), what is incomplete (§1.3 — 1053 orphaned simulation lines from commit `901f155` on 2026-07-22 or earlier).
- [x] Prototype design-decisions audit reported before proposal, per Vision Owner's 2026-07-30 clarification (§2).
- [x] Loop proposal covers all four §2 elements (§3.1–§3.4).
- [x] §2.3 visible consequence spelled out concretely (§3.3), with the four response variants and the explicit statement of why it cannot be cut.
- [x] Three building candidates proposed with reasoning (§4). All three pass Vision Owner's constraint filters (not Category B, not in tier-3 pair, D01 or D03).
- [x] **Nothing built.** Repository state under `frontend/src/` unchanged.
- [x] `npm run typecheck`, `npm run build`, `validate-references`, `parity-check`, `validate-world` all green — unchanged from pre-report state (report is pure documentation).

---

*Author: Claude Code, ORDER 041 §5 steps 1–3. Read-only investigation of `frontend/src/strategic/*`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, `content/layout.ts`, `content/grythyttan.ts`, `types.ts`, `simulation/*.ts`; git-log archaeology of `simulation/*`; Python + Shapely against `grythyttan-world.json` for candidate-building filters against V21 and Category B lists. No code, no data, no world geometry changed.*
