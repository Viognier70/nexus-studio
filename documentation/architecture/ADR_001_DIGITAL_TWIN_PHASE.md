# ADR 001 — Digital Twin Phase

**Status:** Accepted
**Date:** 2026-07-22
**Deciders:** Vision Owner (via Superseding Directive 001, following ORDER 002)
**Author (recording):** Claude Code
**Class:** Architecture Decision Record — governance
**Scope:** Records the project's transition into the Digital Twin Phase. Records the rescission of the geographic-data moratorium and specifies a new precedence order for governing documents.

---

## 1. Context

### 1.1 The previous restrictions

At foundation, three documents jointly prohibited any implementation that would fetch, import, or embed real-world geographic data for Grythyttan.

**`GRYTHYTTAN_WORLD_SPECIFICATION.md §9`** — the strongest statement. Verbatim:

- *No coordinate fetching.* No implementation may fetch geographic coordinates for real buildings at this stage.
- *No coordinate invention.* No implementation may fabricate coordinates for real buildings.
- *No geodata import.* No implementation may import OpenStreetMap, cadastral data, satellite tiles or any other geodata source at this stage.
- *No strategic scene code.* No implementation may author strategic scene geometry, building meshes or camera behaviour that depends on this specification at this stage.
- *No dependency additions* to support geodata or map rendering at this stage.

**`EXECUTIVE_DESIGN_DIRECTIVE_001.md §5`** — *"Do not guess. Verify or mark."* — required every specific fact about Grythyttan to be either verified with a documented source or marked `VERIFICATION REQUIRED`.

**`EXECUTIVE_DESIGN_DIRECTIVE_001.md §13`** — paused the strategic prototype pending review of the companion documents.

### 1.2 Why those restrictions existed

The moratorium was load-bearing at the time, for four reasons:

1. **Prevent invention.** The greatest risk at foundation was that a plausible-looking fictional Grythyttan would ship, indistinguishable in a demo from a verified one but wrong in fact.
2. **Prevent dependency creep.** Geodata pipelines carry heavy tooling — map tile providers, coordinate projection libraries, cadastral parsers, potentially proprietary APIs. The stack was to remain minimal until the direction of travel was clear.
3. **Prevent premature commitment.** Choosing OSM vs. cadastral vs. satellite tiles has long-term consequences for licensing, verification workflow and update cadence. That decision was reserved for the Vision Owner.
4. **Prevent Layer B pollution.** Without a Building Passport workflow in place, imported footprints would have entered the world without provenance, contradicting the verify-or-mark line.

These concerns are still valid. They are now addressed *differently* — through verification workflow, approximation markers, and passport lifecycle — rather than through prohibition. See §5.

### 1.3 What has changed

- `NEXUS_GAMEPLAY_FRAMEWORK.md v2.0` was authored and frozen. It establishes the **perception principle**: the player's progression is a progression of perception, and knowledge changes what the director can see.
- ORDER 002 was issued, tasking the sprint with a genuinely playable first prototype whose declared goal is that walking around Grythyttan should already invite exploration.
- The perception principle and the ORDER 002 exploration goal jointly require a *recognisable* village. A set of coloured blocks cannot carry the perception the framework promises. Authenticity of the world becomes a **functional requirement of the gameplay**, not merely a stylistic ambition.

### 1.4 Trigger

**Superseding Directive 001**, issued 2026-07-22, rescinds the moratorium, declares the Digital Twin Phase, installs authenticity as a primary design objective, and defines a new precedence order for governing documents. This ADR records that decision.

---

## 2. Decision

### 2.1 The Digital Twin Phase begins

Effective this ADR, the project enters the **Digital Twin Phase**. In this phase:

- The world layer of Nexus tracks the real Grythyttan progressively more closely.
- Real-world geographic information shall be used whenever legally and technically appropriate.
- Real buildings are reconstructed procedurally.
- Real roads, real lakes, real terrain are reconstructed.
- Approximation is acceptable only until sufficient references are collected.
- **Guessing is still prohibited.**
- **Verification remains mandatory.**

### 2.2 What "verification" means under the new rules

A fact about Grythyttan is *verified* when at least one of the following is true, and the source is cited in the affected Building Passport or scene descriptor:

- The fact is present in a public dataset (OpenStreetMap, Lantmäteriet open data, municipal open records, or equivalent), with the query and dataset version recorded.
- The fact is directly observable in Google Street View or in a public aerial image, with the viewpoint or tile reference recorded.
- The fact is documented by the institution or operator itself in a public listing, with the URL and access date recorded.
- The fact is established by a Vision Owner note in the repository, dated and attributed.

A fact meeting none of these is either `VERIFICATION REQUIRED` (per Directive §5, still in force) or `APPROXIMATION` (per §2.3 below).

### 2.3 What "approximation" means as an interim state

Approximation is a **labelled, temporary** state for entities whose references are not yet sufficient:

- A footprint derived from a single OSM query without Street View confirmation of the roofline is `APPROXIMATION`.
- A building height inferred by category default (residential ≈ 6 m, commercial ≈ 8 m) without Street View confirmation is `APPROXIMATION`.
- A road width inferred by OSM `highway=*` category without confirmation is `APPROXIMATION`.
- A terrain height inferred by regional average without an elevation source is `APPROXIMATION`.

Approximation entities must carry an `APPROXIMATION` marker and be tracked in a canonical register (see §5.2). They are resolved to `VERIFIED` as references arrive.

**Approximation is not invention.** Invention asserts a fact without any source. Approximation uses a well-defined default while honestly flagging the entity as provisional.

---

## 3. Superseded restrictions

The following restrictions are **no longer active project constraints**. They remain in the historical record for future readers.

- **Geographic reconstruction moratorium** — the categorical prohibition against reconstructing real geography procedurally.
- **OSM prohibition** — the categorical prohibition against importing OpenStreetMap or equivalent datasets.
- **Coordinate acquisition prohibition** — the categorical prohibition against fetching real geographic coordinates for real buildings.
- **Digital Twin implementation prohibition** — the categorical prohibition against authoring strategic scene code and supporting dependencies for a digital twin of Grythyttan.

**Textual anchor points** in currently-in-force documents that become inactive:

- `GRYTHYTTAN_WORLD_SPECIFICATION.md §9` — all five clauses. **Superseded by this ADR** (World Spec sits below ADRs in the precedence order of §4, so this ADR is competent to supersede it directly).
- `EXECUTIVE_DESIGN_DIRECTIVE_001.md §13` (strategic prototype pause) — **superseded by Superseding Directive 001** (a Directive-level instrument, competent to modify Directive text). This ADR *records* the supersession; it does not perform it.
- `DESIGN_DECISIONS_001.md §11` strict priority ordering for this sprint — **superseded via the Constitution's own escape clause**, which admits superseding directives. ORDER 002 combined with Superseding Directive 001 constitute such a directive for the current sprint. This ADR *records* the supersession; it does not perform it. The default ordering rule remains in force for future sprints unless a further superseding directive is issued.
- `DESIGN_DECISIONS_001.md §11` Priority 1 characterisation of the village as "gray box" — **interpreted, not superseded**. Under the new authenticity objective, "gray box" is read as: procedural geometry (no polished art, no imported 3D models) with real footprints, silhouettes and networks. This is an interpretation of the Constitution's text under the new phase; it is not a modification of the Constitution.

These clauses are not deleted from their source documents. Future readers will encounter them as historical context together with this ADR (or with the Superseding Directive 001, where relevant).

---

## 4. Active governing documents — precedence order

Effective this ADR, Nexus is governed by the following documents, in the following order of precedence (highest first):

1. **Nexus Studio Constitution** — `DESIGN_DECISIONS_001.md`
2. **Executive Design Directive** — `EXECUTIVE_DESIGN_DIRECTIVE_001.md`
3. **Approved ADRs** — `documentation/architecture/ADR_00N_*.md` (including this one)
4. **Nexus Gameplay Framework** — `NEXUS_GAMEPLAY_FRAMEWORK.md` (frozen, v2.0)
5. **World Specification** — `GRYTHYTTAN_WORLD_SPECIFICATION.md`
6. **Subsystem and feature specifications** — camera bible, world docs, game-design specs, feature specs
7. **Sprint orders and implementation reports** — ORDER 00N documents, `VERTICAL_SLICE_00N_IMPLEMENTATION_REPORT.md`, and equivalent

**Conflict resolution.** If any lower-level document conflicts with a higher-level document, the higher-level document prevails until the conflict is resolved through a new ADR.

**ADR reach.** An ADR may supersede a specific lower-level rule, but **may not silently replace the Constitution**. Where a Vision Owner decision affects the Constitution or the Directive, the appropriate instrument is a Constitution successor (`DESIGN_DECISIONS_002.md`) or a Directive successor (`EXECUTIVE_DESIGN_DIRECTIVE_002.md` or a Superseding Directive). ADRs record and operationalise such decisions; they do not themselves modify Constitution or Directive text.

### 4.1 Notes on the precedence

- The **Constitution** sits at the top. It is the load-bearing statement of what Nexus is. Changes to it are made through numbered successors, not through ADRs.
- The **Executive Design Directive** sits second. It carries the same architectural authority as the Constitution but on directive matters (workflow, phase boundaries, non-goals). Changes are made through numbered successors or superseding directives.
- **Approved ADRs** (level 3) operationalise decisions made at levels 1–2 and may modify any document at level 4 or below. This ADR sits at level 3 and modifies the World Specification (level 5) accordingly.
- The **Gameplay Framework** (level 4) is the frozen parent of every gameplay system. Its own opening text subordinates it to the parent directive and to the Constitution. The precedence order in §4 is consistent with that self-subordination and further clarifies that Approved ADRs sit between the Directive and the Framework, so an ADR may supersede a framework passage where required (and the Director's Addendum rule applies: unfreezing or content-expanding the framework requires explicit Vision Owner authorisation).
- The **World Specification** (level 5) sits below the Framework and is where the digital-twin operational rules live. §9 of the World Spec is superseded by this ADR at level 3 accordingly.
- **Subsystem and feature specifications** (level 6) inherit from levels 1–5 and cite them.
- **Sprint orders and implementation reports** (level 7) sit at the bottom. They may invoke a Constitution escape clause (as ORDER 002 did with §11) but do not themselves rewrite higher-level rules.

---

## 5. What remains valid

Everything not explicitly listed in §3 remains in force. The following items are called out because they are especially load-bearing.

### 5.1 Verify or mark

Directive §5 remains in force. The Digital Twin Phase changes the *means* of verification (§2.2) and adds an interim `APPROXIMATION` state (§2.3). It does not weaken the rule. **Guessing is prohibited.**

### 5.2 The `APPROXIMATION` register

To operationalise §2.3, a canonical register will be authored at `documentation/world/APPROXIMATION_REGISTER.md` when Digital Twin implementation begins. It records every entity currently in `APPROXIMATION` state, the reason, and the reference(s) needed to promote it to `VERIFIED`. The register is a living document.

### 5.3 Non-goals of the parent directive

Directive §11 (Named non-goals) remains fully in force. Specifically:

- Fictionalising the geography of Grythyttan — still prohibited.
- Renaming or relocating real institutions or commercial premises — still prohibited.
- Inventing addresses, coordinates, ownership records, opening dates, histories — still prohibited (verification is easier now, but invention is not authorised).
- Populating buildings with best-guess uses — still prohibited.
- First-person control of the player during strategic play — still prohibited.
- Individual move-orders on staff or guests — still prohibited.
- Morality bars, numeric-dominant HUDs, procedural map regeneration between sessions — still prohibited.

### 5.4 Constitutional invariants

DESIGN_DECISIONS_001.md remains in force, unmodified by this ADR. Director principle, five capitals, knowledge model (episteme / techne / phronesis), randomness with determinism-under-seed, living organisation, living village, project rules (playable every sprint, implementation over documentation) — all in force.

### 5.5 The frozen framework

`NEXUS_GAMEPLAY_FRAMEWORK.md v2.0` remains frozen and remains the parent gameplay document at level 4 of the precedence order. Its text is untouched by this ADR.

The framework's Chapter 14 first-playable specification (one shift, one business, one scenario) remains valid as a description of the **inhabited-loop first playable**. ORDER 002 introduces a distinct first playable — the **recognisable-village exploration prototype** — which is a different shape. Both can coexist; the Vision Owner has directed the exploration prototype for this sprint.

### 5.6 CLAUDE.md rules

All CLAUDE.md rules remain in force. In particular:

- **#4** — foundation and world documents are not modified without Vision Owner authorisation. This ADR is authorised by Superseding Directive 001 and does not itself modify foundation or world files.
- **#5** — new dependencies in `package.json` still require Vision Owner approval. The Digital Twin Phase does **not** blanket-authorise new deps; it removes the *categorical prohibition* on geodata-related deps. Each proposed dependency is reviewed individually.
- **#7** — Swedish in-game text via `strings.sv.ts`; English in code and documentation.

### 5.7 How the previous concerns are now addressed

- **Prevent invention** → §2.2 verification workflow + §2.3 labelled approximation + §5.3 non-goals still in force.
- **Prevent dependency creep** → CLAUDE.md #5 still in force. Preferred approach: implement procedurally where feasible; add dependencies only when the alternative is significantly worse.
- **Prevent premature commitment** → Superseding Directive 001 explicitly authorises OpenStreetMap and Google Street View. The choice is made.
- **Prevent Layer B pollution** → Building Passport workflow (World Spec §5) is the receiving surface for verified data. Passports move from `unverified` → `partial` → `verified` as references accumulate.

---

## 6. Consequences

### 6.1 Immediate

- Sprint work on ORDER 002 may begin.
- OSM ingestion pipelines may be authored (subject to CLAUDE.md #5 for any new npm dependencies).
- Google Street View, Google Maps and aerial imagery may be used as **offline human reference** to inform procedural geometry and to verify passport fields.
- No raster imagery is shipped as runtime asset by default. Any exception requires an explicit Vision Owner note and a licence review.
- Building Passports for Layer B entities may be drafted, progressed and (with sufficient sources per §2.2) marked `verified`.
- The `APPROXIMATION_REGISTER` is instantiated on the first Digital Twin commit.

### 6.2 Ongoing

- Every commit that touches strategic scene geometry carries provenance: the source or approximation state of the affected entities is stated in the commit message or in an updated register.
- Every landmark receives a Building Passport before it is authored as handcrafted geometry.
- Landmarks without sufficient references remain in `APPROXIMATION` state (procedural extrusion from footprint + category-default height) rather than being invented.
- The verification workflow in §2.2 is the standard against which any Vision Owner review of the digital twin is conducted.

### 6.3 What this ADR does NOT do

- Does not authorise fictional additions to Grythyttan.
- Does not authorise renaming, relocating, or reimagining institutions.
- Does not authorise shipping raster imagery from Google or any other source without explicit further authorisation.
- Does not unfreeze `NEXUS_GAMEPLAY_FRAMEWORK.md`.
- Does not resolve the remaining open Vision Questions (VQ-03, VQ-05, VQ-06, VQ-07, VQ-08, VQ-09, VQ-10). VQ-01 and VQ-02 are resolved by ORDER 002.
- Does not create a general pattern of "future directives lift future constraints." Each supersession requires an explicit Vision Owner instrument (a superseding directive, an ADR at its authorised level, or a numbered document successor).
- Does not modify the Constitution or the Executive Design Directive. ADRs may record decisions that touch those documents; they may not silently replace their text.

### 6.4 Deferred to a later ADR

- The definitive coordinate system for Nexus (WGS84 → local tangent plane vs. Web Mercator vs. Swedish national grid). To be recorded in **ADR 002** when the first ingestion is implemented.
- The definitive OSM query scheme (bounding box, tags, filters) for Grythyttan Layer A ingestion. ADR 002.
- The runtime data format (JSON module import at build time vs. runtime fetch). ADR 002.

---

## 7. Authority chain (updated)

```
1. DESIGN_DECISIONS_001.md (Constitution) — highest
       │
       ├── §1–§10 ............................ in force
       ├── §11 priority ordering ............. superseded for this sprint by
       │                                        ORDER 002 + Superseding Directive 001,
       │                                        via the Constitution's own escape clause
       ├── §11 Priority 1 "gray box" ......... interpreted (§3, §5)
       └── §12 project rules ................. in force

2. EXECUTIVE_DESIGN_DIRECTIVE_001.md
       │
       ├── §5 verify-or-mark  ................ in force
       ├── §11 non-goals ..................... in force
       └── §13 VS-02 pause ................... superseded by Superseding Directive 001

3. Approved ADRs
       │
       └── ADR_001_DIGITAL_TWIN_PHASE.md (this document) — Accepted, in force
              │
              └── supersedes GRYTHYTTAN_WORLD_SPECIFICATION.md §9 (level 5)

4. NEXUS_GAMEPLAY_FRAMEWORK.md v2.0 .......... frozen; parent gameplay document; untouched

5. GRYTHYTTAN_WORLD_SPECIFICATION.md
       │
       ├── §1–§8 ............................. in force
       ├── §9 prohibitions ................... SUPERSEDED by ADR 001 (level 3)
       ├── §10 verification workflow ......... in force; refined by §2.2 of this ADR
       ├── §11 non-goals ..................... in force
       └── §12 open questions ................ VQ-01, VQ-02 resolved by ORDER 002; others open

6. Subsystem and feature specifications
       ├── CAMERA_AND_GAMEPLAY_BIBLE.md ....... in force
       ├── documentation/world/* .............. in force
       ├── MALTIDENS_HUS_EDUCATIONAL_ARCHITECTURE.md ... conceptual vision; not implementation-ready
       └── APPROXIMATION_REGISTER.md .......... planned, on first Digital Twin commit

7. Sprint orders and implementation reports
       ├── ORDER 002 (recognisable-village prototype) ... in force
       └── VERTICAL_SLICE_001_IMPLEMENTATION_REPORT.md ... historical
```

---

## 8. Vision Owner sign-off

This ADR records decisions the Vision Owner has already made through Superseding Directive 001. It is treated as **Accepted** upon writing.

The Vision Owner is asked to raise objection if any part of this record misstates the intent of the Superseding Directive.

---

**End of ADR 001.**
