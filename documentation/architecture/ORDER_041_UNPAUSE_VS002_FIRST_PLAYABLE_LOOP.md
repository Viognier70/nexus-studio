# ORDER 041 — Unpause Vertical Slice 002: The First Playable Loop

**Version:** 1.0  
**Status:** Awaiting Vision Owner approval. Not in force until approved.  
**Class:** Sprint order — production (precedence level 7)  
**Parent:** `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §13; `CAMERA_AND_GAMEPLAY_BIBLE.md`; `LEARNING_AND_SCENARIO_ARCHITECTURE.md`  
**Registry:** register in `ORDER_REGISTRY.md` before execution, per `CLAUDE.md` rule 9  
**Recipient:** Claude Code  

---

## 0. Prerequisites

Verify the order number against `ORDER_REGISTRY.md`. If 041 is taken, stop and report.

---

## 1. The pause is over

`EXECUTIVE_DESIGN_DIRECTIVE_001.md` §13, dated 2026-07-22:

> The strategic prototype (Vertical Slice 002) remains **paused pending review** of this directive and the two companion documents. No further strategic prototype code is authored until the companion documents are approved.

Every condition is now met:

- `CAMERA_AND_GAMEPLAY_BIBLE.md` — approved, v1.0, amended under ORDER 034 §7
- `GRYTHYTTAN_WORLD_SPECIFICATION.md` — canonical, §9 prohibitions marked superseded
- The avatar question — resolved by `SUPERSEDING_DIRECTIVE_002.md` §2
- `LEARNING_AND_SCENARIO_ARCHITECTURE.md` — written, records the learning model

**VS-002 is unpaused.**

### 1.1 What happened during the pause

Eight days. In them: OSM ingest, 274 buildings, 327 roads, 23 landmarks, two districts reconstructed across five passes, road hierarchy, traffic, twenty validators, and — over the last two days — the entire governance repair from ORDER 034 to ORDER 040.

None of it is gameplay. The village is complete enough to be worth playing in, and nobody has built anything to do there.

That is not a criticism of the work. World-building has a pull: there is always one more building to correct, and each correction is real. But the decision to spend three months on it was never taken — it accumulated. This order takes the opposite decision explicitly.

### 1.2 World work pauses here

The 39 tier-3 overlaps stay as they are. V21 catches new ones; the existing set sits in the accepted-exception list. The `SYNTHESISED` set stays unresolved. The five identity landmarks stay without aerial references.

None of it blocks a playable loop, and none of it will be noticed by a player who has something to do.

World corrections resume when there is a loop to correct the world *for*.

---

## 2. What the first loop must contain

Not a vertical slice of the whole game. The smallest thing that answers one question: **is this enjoyable?**

Four elements. Nothing else.

### 2.1 A business the player owns

One premises in Grythyttan, in a real building, at a real address, with:

- a name the player chooses
- staff, as a count and a competence level — not individuals
- a small economy: capital, revenue, costs

Which building is a Vision Owner decision (§6). Do not choose it.

### 2.2 A scenario arriving unbidden

One scenario type, from the 44 in the prototype. It appears in the business, unchosen and unscheduled.

The player sees the subject, chooses a difficulty level, then sees the situation and responds.

**Per `LEARNING_AND_SCENARIO_ARCHITECTURE.md` §4.1**, use a **judgement** scenario, not a knowledge one. Judgement is what the game claims to develop, and it is the harder of the two to make enjoyable. If a knowledge scenario is fun and a judgement scenario is not, the loop is not the one the project set out to build.

### 2.3 A visible consequence in the world

Per `CAMERA_AND_GAMEPLAY_BIBLE.md` §8: a decision that produces no visible change in the world did not matter.

The response changes something the player can see at the business — guests arriving or turning away, staff moving differently, the room filling or emptying. Not a number in a panel.

This is the hardest of the four and the one most likely to be cut under pressure. Do not cut it. Without it the loop is a quiz with a restaurant painted behind it.

### 2.4 An investment decision

Between scenarios: a small budget, and categories to spend it on. Staff welfare, training, equipment, ingredients.

Per `LEARNING_AND_SCENARIO_ARCHITECTURE.md` §4.4, free amounts belong here — this is where numbers are legitimate.

The prototype's resource decay applies: uninvested categories degrade. That is the mechanic that makes the Vision Owner's staff-welfare example work — an operator who never spends on their people gets people who leave.

---

## 3. What the loop must not contain

- **No avatar.** `SUPERSEDING_DIRECTIVE_002.md` §2. The camera is the only instrument.
- **No mode picker.** The business is reached by zooming, per `CAMERA_AND_GAMEPLAY_BIBLE.md` §4.
- **No numeric HUD.** `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §11.
- **No immediate result popup** for the judgement scenario. §8.1 of the camera bible: the result lives in the room.
- **No knowledge acquisition.** Måltidens Hus, the library, quizzes, certification tiers — all out of scope. `LEARNING_AND_SCENARIO_ARCHITECTURE.md` describes them; none is needed to test whether the core loop is enjoyable.
- **No multiplayer, no persistence beyond the session, no backend.**
- **No new world geometry.**

---

## 4. Reuse before building

`gastronoma-sim-main/` contains a working scenario system, investment phase, resource decay and economy-of-scale discount. It is tested design.

Per `LEARNING_AND_SCENARIO_ARCHITECTURE.md` LQ-10, where tested design conflicts with the specification, the tested design is presumed correct.

**Report first** what can be lifted and what must be rewritten, before writing anything. The prototype is a different stack — that matters for reuse, not for the design.

The four `Preparedness` levels the prototype computes deterministically from resource averages should be retained. Per the ORDER 036 LQ-10 audit, they give an objective reference the specification's subjective difficulty wager lacks — and the gap between what a player wagers and what the business is actually prepared for is itself readable as evidence.

---

## 5. Sequence

1. **Report** on VS-002's current state: what exists, what runs, what was left mid-implementation when the pause landed.
2. **Report** on prototype reuse per §4.
3. **Propose** the loop's shape from those two reports. Present it. Do not build.
4. Build, after approval, one element at a time in the §2 order.

Steps 1 to 3 are this order. Step 4 needs its own.

---

## 6. Referred to the Vision Owner

**Which building the player's business occupies.** It should be a real premises, plausibly a restaurant or café, in a district already reconstructed — D01 or D03. It must not be one of the twelve named entities awaiting confirmation, and not a building involved in a tier-3 overlap.

Propose three candidates with reasoning. The Vision Owner chooses.

---

## 7. What this order does not authorise

- Building the loop. Steps 1 to 3 only.
- Any change to world geometry, buildings, roads or landmarks.
- Applying the ORDER 040 §6 corrections.
- Any change under `documentation/foundation/`.
- Reviving the first-person prototype.
- Anything from Måltidens Hus.
- Adding dependencies without asking, per `CLAUDE.md` rule 5.

---

## 8. Acceptance criteria

- VS-002's state is reported: what runs, what is incomplete, what the pause interrupted.
- Prototype reuse is reported before any proposal is drafted.
- The loop proposal covers all four §2 elements and states how §2.3 — the visible consequence — will be achieved specifically.
- Three building candidates are proposed with reasoning.
- **Nothing is built.** `git diff` shows no change under `frontend/src/` beyond documentation.
- `npm run typecheck`, `npm run build` and all validators green.

---

## 9. The question this order exists to answer

After step 4, one thing becomes knowable that is not knowable today: **whether Nexus is enjoyable.**

Three months of work rest on the assumption that it is. The assumption may be right. It has not been tested, and it cannot be tested by building more village.

---

**End of ORDER 041.**
