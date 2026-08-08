# ORDER 042 — Build the First Playable Loop

**Version:** 1.0  
**Status:** Awaiting Vision Owner approval. Not in force until approved.  
**Class:** Sprint order — production (precedence level 7)  
**Parent:** `ORDER_041_UNPAUSE_VS002_FIRST_PLAYABLE_LOOP.md` §5 step 4  
**Input:** `VS002_UNPAUSE_STATE_AND_LOOP_PROPOSAL_ORDER_041.md`  
**Registry:** register in `ORDER_REGISTRY.md` before execution, per `CLAUDE.md` rule 9  
**Recipient:** Claude Code  

---

## 0. Prerequisites

Verify the order number against `ORDER_REGISTRY.md`. If 042 is taken, stop and report.

The ORDER 041 report must be on `main`.

---

## 1. Vision Owner decision — the premises

**`w869907975`** — Torget south edge, 146 m², café-scale. Candidate A.

Chosen because the loop's first scenario is *walk-in-of-five*, and a party of five is only a dilemma where it almost fits. On a 12–16 cover café the answer is contested: seat all five by combining a 4-top with a 2-top and disrupting an already-seated couple, seat four and offer the fifth a bar stool, or turn them away and keep the evening's shape. On a 252 m² sit-down room five would seat trivially and no is not a decision.

The same reasoning governs the visible consequence in §4: a change in the room is only legible when there are enough guests for a change to show, and when the party's arrival forces the room to reconfigure.

**Superseded pick — 2026-07-30 and 2026-08-08.** Version 1.0 of this order picked `w869907963` (Candidate C, 252 m²) with walk-in-of-eight as the scenario. The ORDER 041 §6 candidate-filter miss (see `documentation/world/APPROXIMATION_REGISTER.md`) disqualified `w869907963` on spatial grounds (Guldkringlan and Gästgivaregård within 8 m); §3.1 swapped to `w869907975` on 2026-07-30. Scenario re-scaled here on 2026-08-08 so the "almost fits" dilemma structure holds at 146 m² — proportional to §1's original reasoning, applied to the smaller footprint. Table mix and precise cover count are set in `frontend/src/strategic/business/interiorLayout.ts`; capacity flows from there rather than being restated here so the doc and the code cannot drift again.

---

## 2. This order builds. Nothing before it did.

ORDER 034 through 041 changed no gameplay. This one does.

The reason it can move quickly is ORDER 041 §5.1: `frontend/src/strategic/simulation/` already contains 1053 lines across six files — model, reducer, service, arrivals, economics, sustainability — plus the full `Policies` / `StaffMember` / `Guest` / `ScenarioState` schema in `types.ts`. All of it typed, none of it imported by anything.

**The simulation exists. It was never connected.**

This order connects it, adds a tick loop, and puts the four elements of `ORDER_041` §2 on screen. It does not redesign what is already written. Where the existing simulation code and this order disagree, report the conflict rather than rewriting the simulation.

---

## 3. Build order

One element at a time, in this sequence. Each is a commit. Each must be visible before the next begins.

### 3.1 The business exists

`w869907975` becomes the player's premises (per §1's superseded-pick note). It needs:

- a name the player sets on first run
- staff as a count and a competence level, per `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §7 — never individuals the player commands
- capital, revenue, costs

**Interior reachable by zoom only.** `CAMERA_AND_GAMEPLAY_BIBLE.md` §4.1: the roof crossfades transparent below the interior threshold. No mode picker, no button, no separate scene.

Stop here and show it. The building should read as *yours* before anything else is added.

### 3.2 Time runs

A tick loop. The world keeps living whether or not the player acts, per `CAMERA_AND_GAMEPLAY_BIBLE.md` §12.

**`LEARNING_AND_SCENARIO_ARCHITECTURE.md` LQ-04 is unanswered** — no document defines what a unit of time is, whether the world runs while the player is away, or how a season relates to a session.

Do not answer it. Pick the smallest thing that lets the loop run — a single service evening, compressed — and record the choice as provisional in the commit message. The full time model is a separate decision and this order must not settle it by implementation.

Stop and show it: guests should arrive and leave without the player doing anything.

### 3.3 The scenario arrives

Walk-in-of-five. Unbidden, unscheduled, in the business. (§1's superseded-pick note: originally walk-in-of-eight for the 252 m² Candidate C; rescaled to five on 2026-08-08 with the swap to the 146 m² Candidate A so the party remains marginal on the actual footprint.)

The player sees the subject, chooses a difficulty level, then sees the situation and responds. Per `LEARNING_AND_SCENARIO_ARCHITECTURE.md` §4.3, difficulty is chosen **before** the situation is revealed.

Per §4.2: several responses are sound, differing in consequence rather than correctness. The interface must not mark any as right or wrong.

Per `CAMERA_AND_GAMEPLAY_BIBLE.md` §8.1: **no result popup.** The response resolves in the room.

Retain the existing `Preparedness` computation from the simulation code. Per the ORDER 036 LQ-10 audit it gives an objective reading of what the business can actually handle, alongside the player's subjective wager. The gap between the two is itself readable.

### 3.4 The consequence shows

This is the element the whole order exists to test, and the one that will be under pressure to cut.

Over 30–45 seconds of compressed simulated time, the room changes in a way the player can watch: guests seated or turned away, staff moving differently, tables filling or emptying, pace shifting. Then a mentor NPC comments — in the world, not in a modal.

**If this cannot be built, stop and report.** A loop without it is a quiz with a restaurant painted behind it, and testing that would answer the wrong question.

Report the approach before building it.

### 3.5 The investment decision

Between scenarios: a budget, and categories — staff welfare, training, equipment, ingredients.

Free amounts here. Per `LEARNING_AND_SCENARIO_ARCHITECTURE.md` §4.4 this is the one place numbers legitimately belong.

Resource decay applies, per the existing simulation code: uninvested categories degrade. This is the mechanism that makes the Vision Owner's own example work — an operator who never spends on their people gets people who leave, and it slides back onto the business.

---

## 4. Constraints

Drawn from binding documents. Each has a citation because each will be tempting to break.

| Constraint | Source |
|---|---|
| No avatar, at any point | `SUPERSEDING_DIRECTIVE_002.md` §2.1 |
| No mode picker; interior reached by zoom | `CAMERA_AND_GAMEPLAY_BIBLE.md` §4 |
| No numeric HUD dominating the interface | `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §11 |
| No result popup for judgement scenarios | `CAMERA_AND_GAMEPLAY_BIBLE.md` §8.1 |
| No individual move-orders on staff or guests | `CAMERA_AND_GAMEPLAY_BIBLE.md` §7 |
| No XP, levels, or progression bars | `NEXUS_GAMEPLAY_FRAMEWORK.md` §13 |
| World keeps simulating during selection and scenarios | `CAMERA_AND_GAMEPLAY_BIBLE.md` §12 |
| Player text in Swedish via the strings file | `CLAUDE.md` rule 7 |
| Ask before adding dependencies | `CLAUDE.md` rule 5 |

---

## 5. Out of scope

- Måltidens Hus, the library, quizzes, certification tiers.
- Knowledge acquisition of any kind.
- The director's log and the portfolio.
- More than one scenario.
- Multiplayer, persistence beyond the session, any backend.
- Any change to world geometry, buildings, roads or landmarks.
- The ORDER 040 §6 overlap corrections.
- Answering LQ-04 or LQ-05.
- The first-person prototype.

---

## 6. Acceptance criteria

- `w869907963` is the player's premises, named by the player, reachable by zoom alone.
- Time runs; guests arrive and leave unprompted.
- Walk-in-of-eight arrives unbidden; difficulty is chosen before the situation is revealed.
- Several responses are available; none is marked correct.
- **The consequence is visible in the room before it is legible in any interface.**
- The investment phase accepts free amounts; uninvested categories decay.
- Every constraint in §4 holds. State each explicitly at completion.
- The provisional time-unit choice is recorded in the commit message, marked provisional.
- `npm run typecheck`, `npm run build` and all validators green.
- One commit per §3 subsection, no squash. Each shown before the next begins.

---

## 7. What this order is for

After it, one thing is knowable that is not knowable today: **whether Nexus is enjoyable.**

Not whether the village is accurate — that has been the question for three months and it has been answered well. Whether there is a game in it.

The answer may be no, or not yet. That is worth finding out now rather than after another three months of world-building.

---

**End of ORDER 042.**
