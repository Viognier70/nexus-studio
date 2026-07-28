# Grythyttan World Specification

**Version:** 1.0
**Status:** Specification — canonical
**Class:** Game-design specification
**Parent directive:** `documentation/foundation/EXECUTIVE_DESIGN_DIRECTIVE_001.md`
**Companion:** `documentation/game-design/CAMERA_AND_GAMEPLAY_BIBLE.md`

---

## 1. Purpose

This document specifies the world of Nexus at foundation. It defines the three data layers that compose Grythyttan, the authenticity requirement for institutions and currently operating commercial premises, the stable building identifier, the Building Passport schema, and the concept of the future Property Engine.

Nothing in this document authorises the fetching, invention or hard-coding of geographic coordinates, footprints or property records. All specific facts are either verified with a source, or explicitly marked **VERIFICATION REQUIRED**.

---

## 2. Three data layers

The world of Nexus is composed of three layers, referenced everywhere else in the project by the letters below.

### 2.1 Layer A — Verified geographic layer

Layer A is the fixed geographic reality of Grythyttan. It is the **foundation** on which the rest of the world sits. Layer A does not change through play.

Layer A contains:

- roads,
- paths,
- building footprints,
- parcels,
- water,
- terrain (heights, slopes, meaningful ground features),
- public spaces.

Every element in Layer A must be traceable to a documented source. Where a fact is not yet documented with a source, the element is marked **VERIFICATION REQUIRED** and is not used as a foundation for gameplay decisions.

Layer A does not include ownership, tenants, business use, opening hours, or economic activity. Those belong to Layer B and Layer C.

### 2.2 Layer B — Authentic institution and commercial layer

Layer B binds real, currently operating institutions and commercial premises in Grythyttan to specific building footprints in Layer A. It is the **authenticity layer**.

Elements of Layer B are authored, not simulated. They do not change through play. Where a Layer B element opens, closes or changes use in the real village, the specification is updated by hand, with a source, in a numbered successor to this document.

Layer B must, at foundation, include the following institutions and currently operating commercial premises. Each is treated as authoritative and represented authentically in the game world.

- **Campus Grythyttan** — VERIFICATION REQUIRED for full name and canonical designation used in the game.
- **Måltidens hus / Sevillapaviljongen** — VERIFICATION REQUIRED for relationship between the two names and for current custodianship.
- **Grythyttans kyrka** — VERIFICATION REQUIRED for parish designation and any active use restrictions relevant to representation.
- **Grythyttans Gästgivaregård** — VERIFICATION REQUIRED for operator, current use profile and any protected status.
- **Kringlan** — VERIFICATION REQUIRED for use type (café / bakery / other), operator and location.
- **Cornelis** — VERIFICATION REQUIRED for use type, operator and location.
- **Pizzans hus** — VERIFICATION REQUIRED for exact name, use type, operator and location.
- **Other verified existing commercial premises** — enumerated below in section 5.5, each marked VERIFICATION REQUIRED until confirmed.

No entry above is treated as fully verified until its Building Passport (section 5) is completed and its **verification status** is set to `verified`.

### 2.3 Layer C — Living simulation layer

Layer C is what the game simulates on top of Layers A and B. It is **not authored** with a source. It is generated deterministically from a seed, policy inputs and time.

Layer C contains:

- current use of each Layer B building at a given moment in the simulation (may match the real-world use or, over simulated time, diverge from it),
- ownership,
- tenants,
- vacancies,
- closures,
- acquisitions,
- new player businesses (activation of latent parcels or repurposing of existing buildings),
- future changes in commercial use.

Layer C is where the game **lives**. Layer A anchors the world; Layer B anchors the starting truth; Layer C is the domain in which the player operates.

---

## 3. The relationship between layers

The layers relate asymmetrically.

- **Layer A never changes through play.** No mechanic modifies roads, paths, footprints, parcels, water, terrain or public spaces.
- **Layer B is stable at prototype start** and reflects the real village at the time this specification was authored. Layer B is updated by hand when reality changes, not by the simulation.
- **Layer C changes through play.** Ownership, use, tenancy, vacancy and business viability move as the simulation proceeds.

The map does not follow the market. The market operates inside the map. A building keeps its Layer A footprint even when its Layer C use changes. A Layer B institution keeps its authoritative name and identity even when its Layer C occupancy changes.

---

## 4. Stable building identifier

Every real building in Layer A that is relevant to gameplay receives a **stable building ID**. The ID is assigned once and does not change when use, ownership or occupancy changes.

Requirements for the stable building ID:

- Unique per building.
- Human-readable, lower-case, hyphenated (e.g. `gry-campus-01`, `gry-kyrka-01`, `gry-gastgivaregard-01`). Naming convention to be finalised in the implementation ADR.
- Not derived from current use. `gry-old-bakery-01` is a bad ID; `gry-block-b04-01` (where `b04` is a documented parcel or block reference) is a good ID.
- Not derived from current owner or operator.
- Traceable to a documented source (parcel reference, cadastral entry, or a documented alternative).

Stable IDs are the key by which Layer B references Layer A, and by which Layer C references Layer B. They are also the key by which the Building Passport (section 5) attaches to a specific building.

The exact ID scheme, prefix and issuance rules are to be recorded in a dedicated architecture decision record when implementation resumes.

---

## 5. The Building Passport

Every commercial property in Grythyttan that is relevant to gameplay receives a **Building Passport**. The passport is the canonical record of what a building *is* and what it *can be used for*, independent of who currently occupies it.

Non-commercial buildings may also receive a passport if they are relevant to the game (for example, the church and the campus).

### 5.1 Passport fields

The Building Passport contains the following fields. Every field is either verified with a source, or marked **VERIFICATION REQUIRED**.

| Field | Description | Notes |
|---|---|---|
| **Stable ID** | Unique building identifier per section 4. | Assigned once; never changed. |
| **Name** | Canonical Swedish name used in-game. | May differ from historical or informal names; document any divergence. |
| **Address** | Street address as documented. | Marked VERIFICATION REQUIRED until confirmed against a public record. |
| **Coordinates** | Geographic coordinates. | Do not fetch or invent at this stage. Field is present; value is `VERIFICATION REQUIRED`. |
| **Building footprint reference** | Reference to the Layer A footprint associated with this building. | Documented as a foreign key into Layer A. |
| **Current verified use** | The real-world current use at the time of the passport entry. | Distinct from the simulated use in Layer C. |
| **Classification** | `institution` \| `commercial` \| `residential` \| `mixed`. | One value; if mixed, document the mix. |
| **Commercial suitability** | Whether the building can host commercial hospitality use and under what conditions. | `not-suitable` \| `suitable-with-adaptation` \| `suitable` \| `already-in-use`. Reasons documented. |
| **Size** | Usable interior area for the commercial use in question. | Units: m². Marked VERIFICATION REQUIRED until sourced. |
| **Kitchen potential** | Suitability for installing or maintaining a professional kitchen. | `none` \| `limited` \| `existing` \| `full-professional`. Reasons documented. |
| **Service capacity** | Approximate seated capacity for hospitality use, if applicable. | Units: seats. Marked VERIFICATION REQUIRED until sourced. |
| **Delivery access** | Suitability for goods delivery: back entrance, loading zone, street constraints. | Free-text summary with source references. |
| **Accessibility** | Physical accessibility (steps, ramps, doorway widths, staff-only areas). | Free-text summary with source references. |
| **Energy characteristics** | Heating source, insulation notes, known energy performance. | Free-text; VERIFICATION REQUIRED until sourced. |
| **Cultural / historical constraints** | Protected status, heritage constraints, ecclesiastical constraints, other restrictions that affect commercial use or representation. | Free-text with source references. |
| **Ownership status** | Ownership record: private, municipal, ecclesiastical, foundation, other. Owner name if publicly documented. | Ownership is not simulated at this level; the passport records the real-world state. |
| **Occupancy status** | Real-world occupancy at the time of the passport entry: occupied, vacant, seasonally used. | Distinct from Layer C simulated occupancy. |
| **Verification status** | `unverified` \| `partial` \| `verified` \| `contested`. | Set per source review. |
| **Source references** | Ordered list of the sources used to establish the fields above. | Public records, official listings, verified visits, documented interviews. |
| **Gameplay availability** | Whether this building is available to the simulation as a candidate for use changes, at prototype start. | `not-available` \| `available-latent` \| `available-active`. Governed by section 6. |

### 5.2 Passport lifecycle

Building Passports are versioned as reality changes. The lifecycle is:

- **Draft** — the passport exists but has one or more `VERIFICATION REQUIRED` fields.
- **Verified** — every required field has a source. The passport is authoritative.
- **Contested** — a source contradicts a verified field. The passport enters a review state.
- **Superseded** — reality has changed (a business closed, an institution moved, a use changed). The passport is preserved as a historical record and a successor passport is issued.

Passports are stored under `documentation/game-design/passports/` when implementation resumes. Naming and format for the passport files is a task for the implementation ADR.

### 5.3 What the passport does not contain

- Simulated ownership, occupancy or use. Those live in Layer C.
- Player business plans, projections, or reputation. Those live in the player's own record.
- Guest satisfaction or workload measurements. Those live in the simulation state.
- Ratings, reviews or opinions.

### 5.4 What the passport constrains

The passport constrains what the simulation is allowed to do with the building:

- A building with **Commercial suitability = not-suitable** cannot host a hospitality business in the simulation, regardless of ownership or vacancy.
- A building with **Kitchen potential = none** cannot host a restaurant concept requiring a full kitchen.
- A building with **Cultural / historical constraints** applying cannot be redeveloped in ways prohibited by those constraints.
- A building with **Gameplay availability = not-available** is not offered to the player as a candidate, even if it becomes vacant in the simulation.

The passport therefore functions both as a description of reality and as a set of rules the simulation must respect.

### 5.5 Initial passport population

At foundation, the following buildings receive a passport draft. Every entry is marked **VERIFICATION REQUIRED** until its fields are established from documented sources.

1. Campus Grythyttan.
2. Måltidens hus / Sevillapaviljongen.
3. Grythyttans kyrka.
4. Grythyttans Gästgivaregård.
5. Kringlan.
6. Cornelis.
7. Pizzans hus.
8. Other currently operating commercial premises in Grythyttan — to be enumerated and passport-drafted as verified sources are gathered. This section may not be filled in from memory or from best-guesses.

No entry above is treated as active gameplay content until its passport reaches `verified` status.

---

## 6. Gameplay availability and simulated use

The distinction between Layer B and Layer C is expressed through the passport field **Gameplay availability**.

- **`not-available`** — the building is part of the world but is not a candidate for use changes in the simulation. It appears authentically but is not touched by ownership, tenancy or vacancy mechanics. Typical for institutions with strong constraints (church, campus) unless a specific mechanic authorises otherwise.
- **`available-latent`** — the building is a candidate for future commercial use changes, but does not participate in the simulation at prototype start. It is visible and identified in the world; it may become active as the simulation evolves and as verified information supports activation.
- **`available-active`** — the building actively participates in the simulation from the start. Ownership, tenancy, vacancy and business viability are modelled.

**Availability is determined by the simulation, not by arbitrary visual generation.** The map does not conjure vacancies from an empty slot. A building becomes a live candidate only when the Building Passport supports it and when the Property Engine (section 7) has a specified rule for how such a change is triggered.

**Buildings remain geographically correct even when their future use changes.** A building that becomes a wine bar in Layer C is still the same building in Layer A. Its footprint, address and stable ID do not move.

**Fictional additions are explicitly labelled.** Where the simulation projects a future commercial use that does not correspond to a currently operating premise, the resulting entity is labelled in the world and in documentation as **simulated future development**. It is never presented as a real, present-day business. It never claims the identity of a real business that does not exist at that location.

---

## 7. The future Property Engine

The Property Engine is the future set of mechanics by which Layer C evolves over simulated time. It is defined here at concept level. Implementation belongs to a later vertical slice and is not part of any current prototype.

### 7.1 Concept

The Property Engine models how commercial property in Grythyttan changes hands, use, and viability. It sits above the passport constraints and below the player interface. Its state is deterministic given a seed, the passport constraints and the accumulated history of the simulation.

### 7.2 State transitions

The Property Engine models the following transitions between property states:

- **Vacancy** — a commercial premise becomes vacant.
- **Lease** — a vacant or leaseable premise is leased to an operator (player or NPC).
- **Sale** — ownership of a premise transfers.
- **Bankruptcy** — a business fails and the premise returns to a vacant or leaseable state.
- **Retirement** — an operator exits voluntarily.
- **Inheritance** — ownership transfers on the retirement or death of an owner, when applicable.
- **Municipal allocation** — the municipality allocates a premise under public-interest rules.
- **Redevelopment** — a premise is modified in ways permitted by its passport (never in violation of constraints).

### 7.3 Eligibility

Not every actor is eligible for every transition. Eligibility depends on:

- **Competition between players** — where multiple players (or players and NPCs) seek the same premise, the engine determines the outcome via documented rules, not by first-come-first-served.
- **Bank and investor assessment** — access to financing depends on documented viability, prior track record and current sustainability conditions of the applicant. The engine consults a modelled banking function; the banking function is deterministic and its criteria are documented.
- **Professional reputation** — an operator's history in Grythyttan and in wider Nexus play affects eligibility. Reputation is a modelled quantity, not a morality score.
- **Knowledge and judgement prerequisites** — some premises require documented training or verified experience to acquire or operate. Kitchen-heavy premises, premises with strong cultural constraints, and premises requiring specific certifications are examples. Prerequisites are stated in the passport constraints and enforced by the engine.

### 7.4 Determinism

The Property Engine is deterministic given:

- the same seed,
- the same passport data,
- the same accumulated history of policy decisions and player actions.

Randomness in the engine exists to give the property market texture (bankruptcies do not happen on a fixed schedule) but does not create outcomes untraceable to inputs.

### 7.5 What the Property Engine is not

- It is not a stock market simulation.
- It is not a rent optimiser.
- It is not a landlord role for the player.
- It does not generate speculative buildings on empty parcels.
- It does not override passport constraints.
- It does not offer a building for use in ways the building cannot host.

---

## 8. Interaction with the player

- The player never selects a building from a menu of "available commercial premises." The player observes Grythyttan and reads what is happening. Vacancy is visible in the world; a lease opportunity manifests through the same world, not through a shop screen.
- The player never edits a Building Passport. The passport is authored reality. Player influence enters through Layer C.
- The player never rewrites geography.
- The player may propose to acquire, lease or redevelop a premise, subject to eligibility and passport constraints. Proposals are resolved by the Property Engine, not by player will.

---

## 9. What this specification prohibits

- **No coordinate fetching.** No implementation may fetch geographic coordinates for real buildings at this stage.
- **No coordinate invention.** No implementation may fabricate coordinates for real buildings.
- **No geodata import.** No implementation may import OpenStreetMap, cadastral data, satellite tiles or any other geodata source at this stage.
- **No strategic scene code.** No implementation may author strategic scene geometry, building meshes or camera behaviour that depends on this specification at this stage.
- **No dependency additions** to support geodata or map rendering at this stage.
- **No modification of previously approved documents** to bring them in line with this specification.
- **No Git operations** in response to this specification alone.

---

## 10. Verification workflow (concept only)

To move a passport from `unverified` to `verified`, the field values must be established from:

- a public record (parcel data, municipal registry, ecclesiastical registry, cadastral entry),
- an official listing from the institution or operator itself,
- a documented on-the-ground observation with a date and observer,
- or a documented interview with a named source.

The workflow itself is not implemented by this specification. It is a governance concept for the Vision Owner. When implementation resumes, a dedicated tool or process may be authored to support it.

---

## 11. Non-goals

- Procedural generation of the village map.
- Historical simulation of Grythyttan before the game's present.
- Player-driven redesign of parcels or roads.
- Real-time integration with external data sources.
- Player leaderboards, ratings or reviews of real premises.
- Any depiction of real individuals by name or likeness.
- Any mechanic that presents fictional additions as if they were real premises.

---

## 12. Open questions requiring Vision Owner decision

These questions cannot be resolved by implementation. They require the Vision Owner.

- **VQ-01.** Is the canonical designation of the campus "Campus Grythyttan," "Restaurang- och hotellhögskolan," "Örebro universitet Campus Grythyttan," or a game-canonical name distinct from any of the above?
- **VQ-02.** Are Måltidens hus and Sevillapaviljongen the same building for game purposes, adjacent buildings sharing a passport family, or separate passports?
- **VQ-03.** What is the game-canonical name and status of Grythyttans kyrka's role in ceremonies (see WP-02 traditions)?
- **VQ-04.** Which of Kringlan, Cornelis and Pizzans hus are represented at foundation and which enter as later verified additions?
- **VQ-05.** What is the initial list of "other verified existing commercial premises" beyond the seven named in section 2.2? The list is intentionally left empty at foundation until sources are gathered.
- **VQ-06.** Does the player begin with a specific existing wine-bar business, with a latent plot, or with a decision between the two?
- **VQ-07.** What is the game-canonical time period? Present-day, near-future, or unstated?
- **VQ-08.** May a real premise close in the simulation only when a documented real-world closure is entered into Layer B, or may the simulation project closures that have not occurred in reality?
- **VQ-09.** How is a "simulated future development" building visually distinguished in the world so it never reads as a real premise? (Chrome? Label? Silhouette treatment?)
- **VQ-10.** What is the game-canonical spelling and case convention for stable building IDs?

Until VQ-01 through VQ-10 are answered, the initial passport population in section 5.5 remains at draft.

---

**End of Grythyttan world specification.**
