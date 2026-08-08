# ORDER 044 — The Village Made Legible

**Version:** 1.0
**Status:** Awaiting Vision Owner approval. Not in force until approved.
**Class:** Sprint order — production (precedence level 7)
**Parent:** `ORDER_040_SYNTHETIC_BUILDING_MARKING.md` §6; `ORDER_043_CAPITAL_WAGER_AND_CONSEQUENCE_CHAIN.md` §5A.2
**Registry:** register in `ORDER_REGISTRY.md` before execution, per `CLAUDE.md` rule 9
**Recipient:** Claude Code

---

## 0. Prerequisites

Verify the order number against `ORDER_REGISTRY.md`. ORDER 043 must be merged to `main`, excluding collapse (§6), which remains open for its own cycle.

---

## 1. Why this order exists

Three months of world work were paused on 2026-07-30 so the loop could be built. The loop now runs: a day, a team, a service with a readable event stream, three scenarios, a wager, a consequence chain.

Two things follow.

**The paused world defects are no longer justified by the pause.** ORDER 040 §6 classified 39 overlapping building pairs and was never applied. Eight `vw-kyr-*` buildings still stand inside the church's footprint. The village is the one part of this project that will exist regardless of what the game mechanics become — it is a digital twin of a real place, and a church surrounded by buildings that are not there is simply wrong.

**The gray box has done its job and is now in the way.** Every finding today — the queue that could not carry a reading, capacity existing in three contradictory forms, the building rotated 7° off axis — was found because nothing decorative obscured it. But the Vision Owner cannot judge whether the game is enjoyable while looking at pucks. `ORDER_043` §5A.2 requires that the text says what is happening and the room shows that it is happening; at present the text carries almost everything.

This order closes the world defects and makes the room legible. It does not make it beautiful — material and finish work is a later order, after §11 of ORDER 043 is answered.

---

## 2. Part One — the church and the overlaps

### 2.1 Apply ORDER 040 §6

The correction proposal exists and classifies 39 tier-3 pairs as nudge, shrink, or remove. Apply it.

**Five cases await ground truth from the Vision Owner.** Report those five separately with what is known about each, so a decision can be made on evidence rather than on memory. Do not guess them.

**Pairs involving any of the twelve `vw-named-*` entities in the open confirmation sheet get no automatic action** — they remain marked awaiting §4 confirmation, per ORDER 040's own rule. If a building is in the wrong place, nudging it is the wrong fix.

### 2.2 The church specifically

Eight `vw-kyr-*` buildings stand in the church's footprint. These are synthetic fill, not real structures. Remove them.

The church is `gry-kyrkan` and its real footprint is in the OSM data. After removal, verify in the running scene that the church reads as a free-standing building with open ground around it, as it is in Grythyttan.

### 2.3 A validator, not a one-off fix

V21 catches new overlaps; the 39 sit in an exception list. **After this order the exception list should be empty or near-empty.** Report what remains and why.

Record in `APPROXIMATION_REGISTER` that synthetic fill was permitted to stand inside a real landmark's footprint for six weeks because the defect was documented rather than corrected. Documenting a defect is not fixing it — that is the same class as the register's existing entries, in a new form.

---

## 3. Part Two — the room made legible

### 3.1 Guests move

Guests currently teleport between states — a puck at the entrance becomes a puck at a table with nothing between. This makes two different behaviours look identical: a guest being seated and a guest turning away.

Guests must **travel**: entrance → waiting position → seat → exit, along a path, at a walking pace. A guest who turns away walks back out the way they came, and this must be visibly different from a guest who is seated.

This is the cheapest single improvement to legibility in the whole scene, and it makes the economic phenomenon (walk-aways) readable for the first time.

### 3.2 Staff exist in the room

`ORDER_042` §3.4 named "staff moving differently" as one of four vectors for visible consequence. It was never built, and until now there was nothing to show. There is now: a team of up to six, with roles.

Render staff as pucks distinguishable from guests. They move between stations — pass, bar, floor, entrance — and their movement reflects load: unhurried when the room is comfortable, constant when it is not.

**Per `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §7 the player never commands them.** They are not selectable, not assignable, not clickable. They act autonomously under current conditions. What the player sees is the consequence of who they hired.

### 3.3 The room shows what the stream says

Where an event in the stream has a plausible visual correlate, it should have one. A plate going back should be a puck moving wrongly. A table waiting too long should be a table with someone at it and no one attending.

**Not every event needs one**, and inventing weak correlates is worse than none. Report which of the 48 stream sentences have a natural visual expression and which do not; build the ones that do.

This is `ORDER_043` §5A.2's requirement, which is currently unmet.

---

## 4. What this order does not do

**No material or finish work.** No façade textures, no roof materials, no vegetation detail, no lighting beyond what the day cycle already does. That is a separate order, and it should wait until `ORDER_043` §11 is answered — if the loop does not hold, a beautiful version of it is wasted.

**No interior furnishing.** Tables remain boxes for now.

**No collapse mechanic.** It belongs to ORDER 043 and needs its own cycle.

---

## 5. Build order

1. **The church.** Remove the eight `vw-kyr-*` buildings, verify in scene.
2. **The remaining overlaps.** Apply ORDER 040 §6's classification; report the five awaiting ground truth and any pairs blocked by the `vw-named-*` confirmation sheet.
3. **Guests move.** Paths, walking pace, visibly distinct walk-aways.
4. **Staff in the room.** Roles distinguishable, movement reflecting load, never selectable.
5. **Visual correlates.** Report the mapping first; build what is natural.

Report after step 2 and after step 4. The Vision Owner should see the church standing free before the room work begins.

---

## 6. Acceptance

1. The church stands alone in its own footprint, as it does in Grythyttan.
2. The V21 exception list is empty or its remaining entries are individually justified.
3. A guest who is seated and a guest who turns away are distinguishable at a glance, without reading the stream.
4. A team of four and a team of two look different in the room, not only in the text.

---

## 7. What this order is for

The village is the part of Nexus that is true independent of any game design. It is a digital twin of Grythyttan, and every wrong building in it is a claim about a real place that is not so. That is worth correcting on its own terms.

The room is the part the player judges the game by. Right now it is pucks, and the Vision Owner is right that enjoyment cannot be assessed from pucks. Making guests walk and staff exist is not decoration — it is the difference between reading the game and watching it.
