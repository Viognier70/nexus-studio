# Design Decisions 001

**Version:** 1.0
**Status:** Approved by the Vision Owner. Binding.
**Class:** Constitution — freezes the core architectural and gameplay decisions in force before strategic-prototype implementation continues.
**Companions (in force):**
- `documentation/foundation/EXECUTIVE_DESIGN_DIRECTIVE_001.md`
- `documentation/game-design/CAMERA_AND_GAMEPLAY_BIBLE.md`
- `documentation/game-design/GRYTHYTTAN_WORLD_SPECIFICATION.md`

This is not a design proposal. It is not a discussion document. It is the current constitution of Nexus. No system beyond what is stated here is authorised. No section here may be expanded, replaced or reinterpreted without a numbered successor (`DESIGN_DECISIONS_002.md`).

---

## Section 1 — Nexus philosophy

Nexus is a **professional knowledge strategy simulator**. It is a game in which the player operates a business inside a real Swedish village and, through that business, participates in a living gastronomic ecosystem. What separates Nexus from a management simulation is what it treats as valuable: professional knowledge and the judgement that grows from it, rather than optimisation of a resource loop.

Two premises stand behind everything else in this document.

**Reality forms the foundation.** Grythyttan is a real place. Its geography, its institutions and its currently operating commercial premises are the starting condition of the game world. They are not fictionalised, not renamed, not relocated and not replaced with generic analogues. What the player encounters at the beginning of a Nexus session is what Grythyttan is.

**Simulation creates the future.** On top of that foundation Nexus simulates change. Ownership shifts. Businesses open and close. Vacancies appear and are filled. New commercial use activates real buildings. A future Grythyttan grows out of the choices of the players who inhabit it, without the map ever being rewritten to accommodate them.

Between these two premises lives the third: **professional judgement is more important than optimisation.** Nexus does not reward the player who finds the shortest path from input to output. It rewards the player who reads a situation, brings craft understanding to bear, and makes a decision a professional would make. Two players with the same numeric resources can achieve very different outcomes if one carries deeper professional knowledge than the other. This is not a UX preference. It is the core of the game.

Everything that follows in this document — the director principle, the continuous world, the capital model, the knowledge model, the randomness principle — exists to make those three premises legible in play.

---

## Section 2 — Director principle

The player is the **director** of the business.

- The player is never an avatar in strategic play.
- The player never directly controls staff.
- The player never issues movement orders to individual staff or guests.

The player's influence enters the world through the following levers:

- **Organisation** — the structure and composition of the team.
- **Knowledge** — investment in what the organisation understands.
- **Leadership** — how the organisation is led and held together.
- **Culture** — the standards, habits and expectations that shape work.
- **Investment** — allocation of capital across time.
- **Capacity** — the physical, temporal and human capacity of the operation.
- **Service philosophy** — the concept of hospitality the business pursues.

The organisation performs the work. The player shapes the conditions under which the organisation performs it.

This principle is a **design line**, not a preference. No mechanic that violates it may enter Nexus.

---

## Section 3 — The real Grythyttan

Nexus is set in the real Grythyttan. The geographic layer of the world is authentic and fixed.

**Authentic and fixed:**

- roads,
- buildings,
- terrain,
- water,
- institutions,
- currently operating commercial premises.

These do not move, do not rename, and are not generated procedurally. Where a fact about them cannot be established from a source, it is marked `VERIFICATION REQUIRED` (per the parent directive) and left unresolved.

**Simulated and mutable:**

- **Businesses may evolve.** An operator improves or fails; a concept matures or drifts; a menu changes.
- **Ownership may change.** Premises are sold, inherited, leased, allocated by the municipality, taken over after bankruptcy.
- **Future development is simulated.** New commercial use may activate a real building that today serves a different purpose. New businesses may appear, always inside real buildings and always labelled as simulated future development when they do not correspond to a currently operating premise.

The map does not follow the market. The market operates inside the map.

---

## Section 4 — Continuous world

Nexus is one world. There is no loading, no map-swap, and no mode picker between the four reading distances:

**Village → District → Business → Interior.**

The transition between these distances is created by **camera movement** on a single continuous zoom curve. The player never selects a view. The player zooms, and the world crossfades information density, roof visibility, selection semantics and interaction affordances at defined thresholds. Everything that lives in the world at one distance is still there at another distance; what changes is what the player can read and act on.

Camera transitions are damped. The simulation does not pause during a transition. The world does not reload.

---

## Section 5 — Building Passport

Every real building in Grythyttan becomes a **persistent simulation object**. Every commercial property carries a **Building Passport** as its canonical record.

The Building Passport contains the following fields, at the constitutional minimum:

- **Permanent ID.** A stable identifier assigned once, never changed, never derived from current use, owner or occupancy.
- **Coordinates.** Geographic coordinates of the building. Marked `VERIFICATION REQUIRED` until sourced.
- **Address.** Documented street address. Marked `VERIFICATION REQUIRED` until sourced.
- **Current use.** The real-world use at the time of the passport entry.
- **Historical notes.** Relevant history that constrains future use or representation, including cultural and heritage constraints.
- **Ownership.** Documented ownership record: private, municipal, ecclesiastical, foundation, other. Owner name where publicly documented.
- **Commercial suitability.** Whether the building can host commercial hospitality use and under what conditions.
- **Gameplay state.** The building's current role in the simulation: not-available, available-latent, available-active, in-use-by-player, in-use-by-npc, in-transition. Distinct from real-world occupancy.
- **Verification status.** unverified, partial, verified, contested.

A Building Passport is authoritative reality. The player does not edit it. The simulation reads it. Passport constraints limit what the simulation is allowed to do with the building.

The broader passport schema in `GRYTHYTTAN_WORLD_SPECIFICATION.md` is compatible with this constitutional minimum and remains in force where it does not conflict.

---

## Section 6 — Capital model

Nexus recognises **five interacting capitals**:

- **Economic** — money, revenue, cost, financial reserve, access to financing.
- **Human** — staff, staffing capacity, wellbeing, retention, working conditions.
- **Social** — relationships with guests, neighbours, suppliers, community and municipality; reputation as a social entity.
- **Knowledge** — the organisation's professional knowledge base: what the team understands, what has been learned, what can be taught to a new hire.
- **Cultural** — the identity, standards, aesthetics and traditions the business embodies and contributes to Grythyttan.

Players **invest in capitals**. Capitals create **capability**. Capability is what allows the organisation to do things it could not do before.

The five capitals **interact**. Investment in one commonly affects others, sometimes immediately and sometimes with delay. No capital is a morality score. No capital is a level. No capital is independently optimisable.

The three sustainability conditions defined in `EXECUTIVE_DESIGN_DIRECTIVE_001.md` and `CAMERA_AND_GAMEPLAY_BIBLE.md` (Ekonomisk, Social, Ekologisk) are the **operational surface** through which the state of the capitals is read at the business scale. They report direction, cause and expected consequence, not the capital values themselves. Their relationship to the five capitals is: sustainability conditions are read; capitals are invested in. Reconciliation of the two surfaces into a coherent interface is a task for the strategic-prototype design phase.

---

## Section 7 — Knowledge model

Professional capability develops through three phases of knowledge, treated in Nexus as an Aristotelian triad:

- **Episteme** — theoretical knowledge. What the organisation understands as principle.
- **Techne** — practical craft. What the organisation can execute.
- **Phronesis** — practical wisdom, judgement. The capacity to bring the right knowledge to bear in a specific situation.

These three **never become skill trees.** They are not points to be spent, they are not tiers to be unlocked, they are not visually represented as a progression bar. They are conditions of the organisation, tracked internally and expressed through what the organisation is able to do.

**Professional judgement emerges from the interaction of the three.** An organisation strong in techne but weak in phronesis executes correctly in familiar situations and fails in unfamiliar ones. An organisation strong in episteme but weak in techne knows what should happen and cannot make it happen. An organisation strong in phronesis but weak in episteme and techne makes wise judgements it cannot enact.

The Knowledge Engine (see Section 11, Priority 7) is the future subsystem that models the three phases, their acquisition, their decay and their interaction. It is not implemented at this stage.

---

## Section 8 — Randomness

Randomness always exists in Nexus.

- **Knowledge never removes uncertainty.** No amount of investment in the knowledge capital produces a deterministic outcome from a real-world situation.
- **Knowledge changes probability distributions.** A better-trained team is more likely to handle a difficult evening well. It is not guaranteed to.
- **Professional organisations become more resilient rather than perfect.** Resilience is expressed as narrower, more favourable outcome distributions — not as the elimination of adverse outcomes.

Randomness is authored, not accidental. Every random draw in Nexus derives from a **seeded** source per the parent directive. The same seed and the same decisions produce the same run. Determinism-under-seed and player-facing randomness are not in tension: the underlying computation is reproducible; the player-facing experience is uncertain because the player does not control the seed and does not read the distributions.

---

## Section 9 — Living organisation

The organisation the player leads is **alive over time**.

- The organisation **learns.** Repeated exposure to a situation shapes how the organisation responds to it next time.
- **Culture evolves.** The standards and habits of the team change with the choices the director makes and with the situations the team encounters.
- **Knowledge accumulates.** Investment in the knowledge capital does not evaporate at the end of a session; it becomes part of what the organisation is.
- **Trust grows.** Between staff members, between staff and director, between the business and its guests and suppliers.
- **Leadership develops.** The director's own capability improves through play. A team led by a director who has learned to read situations reads them differently than a team led by a director who has not.

**The player gradually needs fewer interventions.** A well-run Nexus session moves the player from constant micro-decisions early on toward increasingly strategic, spaced decisions later. The organisation becomes capable of handling most operational moments on its own. The player's role becomes the shaping of longer arcs and the reading of harder cases.

---

## Section 10 — Living village

Grythyttan continues to function **without the player**. The village does not need the player to exist and does not pause when the player is not looking.

Autonomous village life includes:

- **Residents** — living, working, moving through the village.
- **Students** — attending campus, using services, forming their own patterns.
- **Visitors** — arriving, choosing between destinations, staying or leaving.
- **Businesses** — operating, competing, sometimes struggling, sometimes flourishing.
- **Institutions** — the campus, the church, the municipality and other institutional actors continuing their work.
- **Transport** — buses, deliveries, private and commercial movement through the village.
- **Daily rhythms** — mornings, afternoons, evenings and nights have their own character.
- **Seasonal rhythms** — the village changes over the year, with tourism, education and hospitality all following seasonal patterns.

The player enters this world. The world does not exist for the player.

---

## Section 11 — Implementation priorities

Implementation of the strategic prototype and beyond follows this priority order. No later priority is authorised for implementation while an earlier priority is unfinished, unless a superseding directive is issued.

- **Priority 1 — Playable Gray Box Grythyttan.** A traversable, camera-navigable, procedurally geometric Grythyttan with correct roads, correct building footprints, correct water and terrain, and stable building IDs. No polished art. No full simulation. The village is a playable model.
- **Priority 2 — Continuous strategic camera.** The full camera and gameplay bible in play, in the Gray Box village.
- **Priority 3 — Living village.** Residents, students, visitors, deliveries and daily rhythms populate the world.
- **Priority 4 — Living restaurant.** The player's business runs an autonomous, deterministic simulation of service.
- **Priority 5 — First strategic scenario.** The group-arrival scenario (or its constitutional successor) unfolds inside the living restaurant with visible consequences.
- **Priority 6 — Capital investment.** The five-capital model becomes operable: the player can invest, capabilities emerge, capitals interact.
- **Priority 7 — Knowledge engine.** Episteme, techne and phronesis become tracked conditions with acquisition, decay and interaction.
- **Priority 8 — Property engine.** Vacancy, lease, sale, bankruptcy, retirement, inheritance, municipal allocation and redevelopment become simulated over Grythyttan's real buildings, respecting passport constraints.

---

## Section 12 — Project rules

- **Every sprint must end with something playable.** A sprint that produces only documents, only planning, or only refactoring without a playable improvement is a sprint that fails its rule.
- **Design documents support implementation.** Documents exist to make implementation possible, not to substitute for it.
- **Implementation has priority over additional documentation.** When forced to choose between writing another design document and shipping a playable improvement, ship the playable improvement.
- **Whenever possible: Build. Play. Evaluate. Improve. Repeat.**

---

**End of constitution.**

---

# Comparison against approved companion documents

The following analysis compares this constitution against the three documents currently in force. No document is modified. Recommendations are proposals only, to be acted on by the Vision Owner.

## Contradictions

**C-01. Sustainability surface vs. capital model.**
The parent directive (`EXECUTIVE_DESIGN_DIRECTIVE_001.md` §9) and the camera and gameplay bible (`CAMERA_AND_GAMEPLAY_BIBLE.md` §8.2) present three sustainability conditions (Ekonomisk, Social, Ekologisk) as the operational surface through which the state of the business is read. This constitution (§6) introduces five capitals (Economic, Human, Social, Knowledge, Cultural) as the model in which the player invests. There is overlap (Economic and Social appear in both). There is divergence (Ekologisk does not appear in the capitals; Human, Knowledge and Cultural do not appear in the sustainability conditions). §6 of this constitution proposes a reconciliation ("sustainability conditions are read; capitals are invested in") but the reconciliation is a proposal, not a resolution. A definitive statement is required before implementation. Recommended resolution: keep both surfaces; clarify their relationship in a dedicated `SUSTAINABILITY_AND_CAPITALS.md` before Priority 6.

**C-02. Determinism vs. randomness.**
The parent directive (§7 companion documents and `CAMERA_AND_GAMEPLAY_BIBLE.md` §15) states that "same seed + same policy inputs produce the same run." This constitution (§8) states that "randomness always exists" and "knowledge never removes uncertainty." These are reconcilable — determinism-under-seed governs the computation, and player-facing randomness is a matter of what the player controls and observes — but naive readings of the two statements sound contradictory. §8 of this constitution states the reconciliation. It should be lifted into the parent directive when the parent is next revised, so both statements read as one position.

**C-03. Building Passport field set.**
`GRYTHYTTAN_WORLD_SPECIFICATION.md` §5.1 defines twenty passport fields. This constitution (§5) defines nine. The two are not in direct contradiction — the constitutional nine are a subset of the specification's twenty — but the two surfaces are not identical and could confuse a reader. Recommended resolution: mark the constitutional nine as **required at minimum** and the specification's twenty as **the full authored schema at foundation**, so the two documents agree on that framing.

**C-04. Knowledge as concept vs. as tracked system.**
`EXECUTIVE_DESIGN_DIRECTIVE_001.md` §8 says knowledge, experience and judgement change outcomes. This constitution (§7) names them as Episteme, Techne and Phronesis and states they are tracked conditions in the organisation. This is an expansion, not a contradiction, but the parent directive was silent on the tri-partite structure. The constitution should be treated as the operative statement; the parent directive can be reconciled at its next revision.

**C-05. Priority ordering vs. earlier draft documents.**
The paused-draft `documentation/architecture/VERTICAL_SLICE_002.md` was ordered around a specific scenario-first pilot. This constitution (§11) reorders implementation with Gray Box Grythyttan as Priority 1 and the scenario as Priority 5. This is intentional and correct under the constitution. The paused-draft VS-002 document therefore does not describe the next implementation step and should be treated as historical.

## Duplicates

**D-01. Director principle.**
Stated in `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §7 and in `CAMERA_AND_GAMEPLAY_BIBLE.md` §7, and now again in this constitution §2. Three restatements. The wording differs slightly across the three. Recommended: the constitution's wording is now canonical; the two companion documents should be adjusted to reference §2 of this constitution rather than restate it, next time they are revised.

**D-02. Continuous world / continuous zoom.**
Stated in `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §5, in `CAMERA_AND_GAMEPLAY_BIBLE.md` §2 and §4, and now again in this constitution §4. The bible is the fullest treatment; the constitution provides the shortest. Recommended: bible remains the operational specification; the constitution's §4 is the constitutional summary. The parent directive should be trimmed at its next revision to reference the bible rather than restate.

**D-03. Real Grythyttan geographic authenticity.**
Stated in `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §2 and §3, in `GRYTHYTTAN_WORLD_SPECIFICATION.md` §2 and §3, and now again in this constitution §3. Three statements. Content is compatible. Recommended: the world specification is the operational specification; the constitution's §3 is the constitutional summary. The parent directive should reference the world specification rather than restate.

**D-04. Building Passport.**
Stated in `GRYTHYTTAN_WORLD_SPECIFICATION.md` §5 and now again in this constitution §5. As covered in C-03: reconcile as constitutional minimum vs. authored schema.

**D-05. Living village.**
Stated implicitly in `GRYTHYTTAN_WORLD_SPECIFICATION.md` §2.3 (Layer C), in `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §6, and explicitly in this constitution §10. The constitution's §10 is the fullest statement of what "living" means at the village scale. Recommended: constitution §10 is canonical; the world specification is the technical layering; the parent directive can reference both.

## Recommended eventual merges

These are proposals for the Vision Owner and are not to be acted on without direction.

**M-01. Consolidate director-principle statements** into a single canonical passage in this constitution (§2), with all other documents referencing it. Reduces drift risk.

**M-02. Consolidate continuous-world / camera statements** so that the operational specification lives in `CAMERA_AND_GAMEPLAY_BIBLE.md` and every other document references it rather than restating.

**M-03. Author a single `SUSTAINABILITY_AND_CAPITALS.md`** that resolves C-01 by defining how the three sustainability conditions and the five capitals relate: what the player sees, what the simulation tracks, what is invested in, and how the two surfaces map. This is required before Priority 6.

**M-04. Consolidate Building Passport into `GRYTHYTTAN_WORLD_SPECIFICATION.md`** as the authored schema. Keep §5 of this constitution as the constitutional minimum and mark the world specification as the authored schema in a paired header. Do not maintain two separate passport definitions long-term.

**M-05. Author a single `KNOWLEDGE_ENGINE.md`** to hold the Episteme / Techne / Phronesis specification when Priority 7 approaches. Until then the constitution §7 is sufficient; the concept should not be expanded elsewhere.

**M-06. Retire the paused-draft `documentation/architecture/VERTICAL_SLICE_002.md` and `documentation/game-design/CAMERA_AND_VIEW_SYSTEM.md`** by moving them to a `documentation/archive/` folder or by marking their status as `Historical — superseded by DESIGN_DECISIONS_001.md and companion documents`. They are still present in the tree and can mislead a future contributor.

## Nothing here modifies any existing document.

All recommendations above are proposals for the Vision Owner. This document changes nothing except by being added.

**End of comparison.**
