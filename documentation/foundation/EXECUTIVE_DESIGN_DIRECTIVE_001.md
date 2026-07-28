# Executive Design Directive 001

**Version:** 1.0
**Status:** Foundation — binding
**Class:** Foundation directive
**Companions:**
- `documentation/game-design/CAMERA_AND_GAMEPLAY_BIBLE.md`
- `documentation/game-design/GRYTHYTTAN_WORLD_SPECIFICATION.md`

---

## 1. Purpose

This directive fixes the foundational design position of Nexus after the review that followed Vertical Slice 001 and the paused Vertical Slice 002 implementation. It is the load-bearing statement against which all subsequent design, engineering, art, sound, UX and production work is measured. Where any earlier document conflicts with this directive, this directive prevails.

Nothing in this document authorises implementation of the strategic prototype. Implementation resumes only after the two companion documents above have been reviewed and approved.

---

## 2. Nexus begins with the real Grythyttan

Nexus is not set in a fictional analogue of Grythyttan. It is set in Grythyttan. The village exists. Its roads, its landscape, its institutions, its church, its campus, its hospitality, its residents and its silences are the starting condition of the game.

The player enters a place that existed before them and will continue after them. That premise is only credible if the place is treated as real.

---

## 3. Geographic reality is fixed

The following geographic facts are treated as **fixed** and are not subject to fictionalisation:

- roads,
- paths,
- building positions and footprints,
- water,
- terrain,
- parcels,
- public spaces.

These form the **verified geographic layer** of the world. They are documented and referenced, not invented. Where a fact cannot be established with a source, it is marked **VERIFICATION REQUIRED** and left unresolved until verified.

Geographic layout does not change through play. The village is not procedurally regenerated. Roads do not move.

---

## 4. Authentic institution and commercial layer

Existing important institutions and currently operating commercial premises in Grythyttan must be represented **authentically** in the game world. They are not renamed, not relocated and not reduced to generic types.

Where such an institution or commercial premise is in the world at prototype start, it appears in the world at prototype start. Where new premises appear during development, they are added because a verified source confirms them, not because a slot was empty.

The named list of institutions and commercial premises that must be represented is maintained in `GRYTHYTTAN_WORLD_SPECIFICATION.md`.

---

## 5. Do not guess. Verify or mark.

No geographic, commercial or historical fact about Grythyttan is invented. Every specific fact — an address, a footprint, a name, a use, an owner, a date — is either:

- **verified** with a documented source, or
- **marked VERIFICATION REQUIRED** and left unresolved.

There is no third option. Placeholder names, placeholder addresses and best-guess histories are prohibited in any document that will inform design or implementation. They may appear only in explicit stub sections that are visibly labelled.

---

## 6. Geography stable, life variable

The verified geographic layer is stable. On top of it the world lives:

- ownership changes,
- use changes,
- businesses open and close,
- vacancies appear and are filled,
- tenants come and go,
- the player's own business emerges and evolves,
- new commercial use may activate a real building that today serves another purpose.

This variability is the domain of the **living simulation layer** (see the world specification).

The relationship is asymmetric: **the map does not follow the market; the market operates inside the map.** A building remains where it is even when its use changes. A road stays where it is even when the businesses along it turn over. Simulated change is expressed through the world, not by rewriting the world.

---

## 7. The player is a strategic director

The player is the director of a business inside Grythyttan. The player influences the world through conditions and decisions, not by moving individual people.

- The player does not issue movement orders to staff.
- The player does not choreograph individual guests.
- The player does not micromanage service actions.

The player influences: staffing, training, service concept, pricing, purchasing, capacity, hospitality policy, sustainability decisions, engagement with traditions and ceremonies, and responses to strategic scenarios.

Individual staff and guests act autonomously according to the current conditions. What the player changes is the conditions under which the world behaves.

---

## 8. Knowledge, experience and judgement change outcomes

The quality of decisions is not equal for all players. Knowledge, professional experience and situational judgement change what a decision produces.

- The right staff mix in the wrong service concept produces one outcome.
- The right service concept without the training to sustain it produces another.
- A judgement scenario resolved with a plausible but shallow answer produces a different consequence than the same scenario resolved with informed craft judgement.

Outcomes are not read off a stat sheet. They emerge from the interaction between what the player chose, what the world was capable of, and what the moment required.

Learning is therefore itself a game mechanic. What the player has learned to see determines what the player can do.

---

## 9. Sustainability as interacting conditions

Nexus recognises three sustainability conditions:

- **Ekonomisk**
- **Social**
- **Ekologisk**

They are not morality bars. They are not scores. They are not comparable to XP. They are operational conditions with:

- current direction,
- recent cause,
- delayed consequence where relevant.

Every meaningful operational decision affects several conditions at once, sometimes immediately and sometimes after a delay. The three conditions **interact**: pressure in the social condition can produce ecological consequences (welcome drinks to soften a wait), economic recovery can create social pressure (increased throughput), ecological choices can shift economic conditions (local sourcing changes cost and cadence).

No policy improves all three simultaneously and permanently. Trade-offs are structural.

Numeric values may exist internally to derive direction. They do not dominate the player interface.

---

## 10. Reality is the foundation; player action shapes the future

The starting condition of Nexus is what Grythyttan is. The gameplay condition of Nexus is what the players make of it.

The player does not rewrite the village's past. The player does not overwrite its geography. The player can, over time, change who occupies which building, whose business survives, what standards of hospitality are practised in the village, and what a future Grythyttan looks like.

The game is therefore a dialogue between reality and possibility. Reality supplies the ground truth; player action, sustained over time, becomes the future.

---

## 11. Named non-goals

The following are **not** part of Nexus under this directive and must not be introduced without a superseding directive:

- Fictionalising the geography of Grythyttan.
- Renaming or relocating real institutions or currently operating commercial premises.
- Inventing addresses, coordinates, ownership records, opening dates, or histories.
- Populating buildings with best-guess uses when the actual use is unknown.
- First-person control of the player during strategic play.
- Individual move-orders on staff or guests during strategic play.
- Morality bars, karma meters, or any single-dimensional virtue score.
- Numeric-dominant HUDs.
- Immediate results popups for judgement scenarios.
- Procedural regeneration of the village map between sessions.
- External AI integrations for NPC behaviour in prototype work.

---

## 12. Governance

- This directive is authored under project ownership. It is binding on Claude Code and on any contributor.
- Revisions produce a numbered successor (`EXECUTIVE_DESIGN_DIRECTIVE_002.md`), not an in-place edit.
- Where implementation reveals a design conflict that would require inventing a new core mechanic, work must **stop and report**, not invent.
- Where implementation reveals a directive item is impractical, the correct response is to report and propose a revision, not to silently deviate.
- Documents authored during earlier work that are inconsistent with this directive are treated as historical context, not as active specifications, until reviewed and reconciled.

---

## 13. Immediate operational effect

- The strategic prototype (Vertical Slice 002) remains **paused pending review** of this directive and the two companion documents.
- No further strategic prototype code is authored until the companion documents are approved.
- The first-person prototype (Vertical Slice 001) remains committed and reachable at `#/first-person-prototype`.
- The paused partial VS-02 implementation on the current branch is preserved as historical reference. It is not authoritative and is not extended.
- The earlier `documentation/game-design/CAMERA_AND_VIEW_SYSTEM.md` and `documentation/architecture/VERTICAL_SLICE_002.md`, authored during the paused implementation, are treated as draft and are **superseded by the two companion documents** as they are approved.

**End of directive.**
