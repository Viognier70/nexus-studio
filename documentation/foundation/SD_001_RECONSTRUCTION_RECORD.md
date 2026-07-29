# SD_001_RECONSTRUCTION_RECORD — Evidence gathering for Superseding Directive 001

**Status:** Evidence record. **This document has NO governing authority.** It records what is knowable about `SUPERSEDING_DIRECTIVE_001` from repository artefacts. It is not the instrument SD-001 would have been, and it may not be cited as authority. Whether a real `SUPERSEDING_DIRECTIVE_001.md` is authored from this record is a Vision Owner decision — recorded in `documentation/architecture/ORDER_035_MEMORY_PROVENANCE_REPAIR.md` §2.4 (decision 2026-07-29: Alternative A, authored under mandatory reconstruction markings, in a separate commit after this record is reviewed).

**Class:** Evidence record — governance provenance repair
**Order of authorship:** `ORDER_035_MEMORY_PROVENANCE_REPAIR.md` §2.1
**Date:** 2026-07-29
**Author (recording):** Claude Code

**Reading conventions.** Every substantive line in §2 and §3 is marked one of:

- **[known]** — quoted verbatim from an existing repository document.
- **[inferred]** — reconstructed from a downstream artefact that records SD-001 as having authorised the item; the wording is the downstream document's, not SD-001's.
- **[unrecoverable]** — attested nowhere; cannot be established from current repository state.

---

## 1. Purpose

`SUPERSEDING_DIRECTIVE_001` is referenced across the repository as the Vision Owner instrument that authorised the Digital Twin Phase and, indirectly, the entire ADR 001 chain that governs current production. The instrument itself was never written to the repository — the ORDER 034 §8.4 audit and `ORDER_035_MEMORY_PROVENANCE_REPAIR.md` §2.1 confirm this.

What follows is everything that can be established about SD-001 from what exists. It is the raw material for the authoring step §2.4 Alternative A envisages; it is not a substitute for it.

---

## 2. Every SD-001 reference in the repository (verbatim)

### 2.1 `documentation/architecture/ADR_001_DIGITAL_TWIN_PHASE.md`

Nine explicit references plus two diagram annotations.

- Line 5 (Deciders header) — **[known]**
  > Vision Owner (via Superseding Directive 001, following ORDER 002)

- Line 49 (§1.4 Trigger) — **[known]**
  > Superseding Directive 001, issued 2026-07-22, rescinds the moratorium, declares the Digital Twin Phase, installs authenticity as a primary design objective, and defines a new precedence order for governing documents. This ADR records that decision.

- Line 105 (§3 Superseded restrictions) — **[known]**
  > `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §13 (strategic prototype pause) — **superseded by Superseding Directive 001** (a Directive-level instrument, competent to modify Directive text). This ADR *records* the supersession; it does not perform it.

- Line 106 (§3) — **[known]**
  > `DESIGN_DECISIONS_001.md §11` strict priority ordering for this sprint — **superseded via the Constitution's own escape clause**, which admits superseding directives. ORDER 002 combined with Superseding Directive 001 constitute such a directive for the current sprint. This ADR *records* the supersession; it does not perform it. The default ordering rule remains in force for future sprints unless a further superseding directive is issued.

- Line 109 (§3) — **[known]**
  > These clauses are not deleted from their source documents. Future readers will encounter them as historical context together with this ADR (or with the Superseding Directive 001, where relevant).

- Line 179 (§7 Compliance) — **[known]**
  > #4 — foundation and world documents are not modified without Vision Owner authorisation. This ADR is authorised by Superseding Directive 001 and does not itself modify foundation or world files.

- Line 187 (§8 Objections anticipated) — **[known]**
  > **Prevent premature commitment** → Superseding Directive 001 explicitly authorises OpenStreetMap and Google Street View. The choice is made.

- Line 235 (Appendix — supersession diagram) — **[known]**
  > │                                        ORDER 002 + Superseding Directive 001,

- Line 244 (Appendix — supersession diagram) — **[known]**
  > └── §13 VS-02 pause ................... superseded by Superseding Directive 001

- Line 277 (§9 Status) — **[known]**
  > This ADR records decisions the Vision Owner has already made through Superseding Directive 001. It is treated as **Accepted** upon writing.

### 2.2 `documentation/architecture/DISTRICT_1_REFERENCE_REQUEST.md`

- Line 221 — **[known]**
  > **VQ-04 confirmed.** ORDER 003 refers to *Guldkringlan*; the world spec's original text refers to *Kringlan*. Superseding Directive 001 / ADR 001 canonicalised these as the same establishment. Confirm that Guldkringlan is the canonical name (currently rendered `displayName: 'Guldkringlan'`).

### 2.3 Agent memory — `reference_confidence_rule.md`

- Line 29 — **[known]**
  > Under the Executive Design Directive §5 ("verify or mark"), Superseding Directive 001 ("guessing is prohibited, verification is mandatory"), and ADR 001 §2.2 / §2.3 (verified vs. approximation states), any unlabelled detail without a source pollutes Layer B.

Note: the parenthetical *"guessing is prohibited, verification is mandatory"* is presented as a direct quotation of SD-001. Whether the wording is verbatim from SD-001 or a summary is **[unrecoverable]** — see §3.6.

### 2.4 `documentation/architecture/ORDER_035_MEMORY_PROVENANCE_REPAIR.md`

The order that produced this record. References SD-001 as the object of §2.1 (this section) and §2.4 (Vision Owner decision). Not counted as a source citation of SD-001 substance; ORDER 035 is the instruction to compile this record, not a witness to SD-001 content.

### 2.5 References not found

`SUPERSEDING_DIRECTIVE_002.md` does not reference SD-001. It stands as its own instrument. SD-002 does establish the shape a Superseding Directive takes in this repository — Version / Status / Precedence / Parent / Modifies header, decision list, compliance clause, precedence-order reaffirmation — which is available as a template if SD-001 is authored under §2.4.

---

## 3. What ADR 001 states SD-001 authorised

Compiled from §2 above. This section restates the substance downstream documents attribute to SD-001. Every item is **[inferred]** because it derives from a document that records the decision, not from SD-001 itself.

### 3.1 The Digital Twin Phase begins — **[inferred]**

Effective 2026-07-22, the project enters a Digital Twin Phase. The world layer tracks the real Grythyttan progressively more closely. Real-world geographic information is used whenever legally and technically appropriate. Real buildings, roads, lakes and terrain are reconstructed. Approximation is acceptable only until sufficient references are collected. Guessing remains prohibited; verification remains mandatory.

*Downstream source:* ADR 001 §1.4 (trigger) and §2.1 (operationalisation).

### 3.2 Authenticity installed as a primary design objective — **[inferred]**

Authenticity of the world becomes a functional requirement of gameplay, not merely a stylistic ambition. The perception principle in `NEXUS_GAMEPLAY_FRAMEWORK.md` v2.0 makes recognisability of Grythyttan load-bearing for the intended play experience.

*Downstream source:* ADR 001 §1.3 (what has changed).

### 3.3 Rescission of prior categorical restrictions — **[inferred]**

Four categorical prohibitions become inactive project constraints:

- Geographic reconstruction moratorium
- OSM prohibition
- Coordinate acquisition prohibition
- Digital Twin implementation prohibition

They remain in the historical record but are no longer in force.

*Downstream source:* ADR 001 §3.

### 3.4 Explicit authorisations — **[inferred]**

- OpenStreetMap and Google Street View are explicitly authorised as data sources. *Downstream source:* ADR 001 §8 (line 187, "Superseding Directive 001 explicitly authorises OpenStreetMap and Google Street View").
- SD-001 directly supersedes `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §13 (strategic prototype pause / VS-02 pause). *Downstream source:* ADR 001 §3 (lines 105, 244).
- SD-001 combined with ORDER 002 constitutes a superseding directive for the current sprint against `DESIGN_DECISIONS_001.md` §11 strict priority ordering. *Downstream source:* ADR 001 §3 (line 106).

### 3.5 A new precedence order for governing documents — **[inferred]** with an unrecoverable component

SD-001 "defines a new precedence order for governing documents" (ADR 001 §1.4). The five-level order in ADR 001 §4 (Constitution → Executive Design Directive → Approved ADRs → Sprint plans and orders → Companions) is the current in-force order.

**[unrecoverable]:** whether the §4 list is verbatim from SD-001 or ADR 001's operationalisation of an SD-001 principle cannot be separated. A reconstructed SD-001 should state the *principle* (Vision Owner establishes a precedence order for governing documents) and cite ADR 001 §4 as the encoded list, rather than claim §4 is quoted from SD-001.

### 3.6 "Guessing prohibited / verification mandatory" wording — **[inferred]** at ADR level, **[unrecoverable]** at SD-001 verbatim level

ADR 001 §2.1 states the substance:

> **Guessing is still prohibited.**
> **Verification remains mandatory.**

Agent memory (`reference_confidence_rule.md`, line 29) presents *"guessing is prohibited, verification is mandatory"* as a direct SD-001 quotation. Whether the exact wording is from SD-001 or a paraphrase absorbed into memory is **[unrecoverable]**. The substance is downstream-attested; the verbatim status is not.

### 3.7 Canonicalisation of individual entity names — **[inferred]**

`DISTRICT_1_REFERENCE_REQUEST.md` line 221 attributes to "Superseding Directive 001 / ADR 001" the canonicalisation of *Guldkringlan* (versus the earlier *Kringlan*). Whether SD-001 authored the canonicalisation itself, ADR 001 did so under SD-001's authority, or the memory-only ORDER 003 did the naming — the reference conflates all three. This is a low-severity provenance blur; the name *Guldkringlan* is stable in current practice.

---

## 4. Whether any repository document carries the same authorisation under another name

**Yes.** `ADR_001_DIGITAL_TWIN_PHASE.md` operationalises every decision this record attributes to SD-001. It is treated as **Accepted** and is in force. The Digital Twin Phase is active. The OSM ingest, the two-state verified/approximation model, the recognisability objective, and the §4 precedence order are all load-bearing throughout the project.

The distinction that remains is *authority*, not *substance*. ADR 001 line 179 says "This ADR is authorised by Superseding Directive 001". ADR 001 does not claim to be a Directive itself; it is a level-3 ADR recording a level-2 Directive-level decision. Removing SD-001 without a reconstructed instrument would leave ADR 001 citing an unreadable authority.

---

## 5. Whether the substance survives in current practice

**Yes, fully.** Every substantive element §3 attributes to SD-001 is active practice:

- **Digital Twin Phase** — ongoing. Vertical Slice 001 in production; District 1 and District 2 reference collection under way per `documentation/references/README.md`.
- **OSM ingest** — implemented. `frontend/src/strategic/data/grythyttan-world.json` is the OSM-derived world; `scripts/parity-check.mjs` and `scripts/validate-world.mjs` guard the pipeline.
- **Verified / Approximation two-state system** — implemented per-aspect across every reference manifest under `documentation/references/`.
- **Authenticity as functional requirement** — carried through ORDER 025–029 recognisability work; codified further in `DESIGN_PRINCIPLE_REALITY_VS_GAMEPLAY.md`.
- **New precedence order** — cited by every recent order and ADR (ORDER 034, ORDER 035, ORDER 036, ADR 002).
- **OSM + Google Street View authorisation** — actively used; the `documentation/references/grythyttan bilder/` folder consists overwhelmingly of Street View captures (see `TRIAGE.md`).

The instrument was never written; the substance is fully in effect.

---

## 6. What is unrecoverable

- **Exact text of any SD-001 clause.** Downstream documents record what SD-001 authorised, not what it said.
- **Medium of issue.** Whether SD-001 was written down at the time of issue (in an off-repository document, a chat message, an email) or was purely a verbal decision that ADR 001 was told to record. The date 2026-07-22 is preserved in ADR 001 §1.4; the medium is unattested.
- **Any SD-001 clause not preserved by any downstream document.** By construction, anything not cited downstream is not visible here.
- **Formal signatory or attestation format.** `SUPERSEDING_DIRECTIVE_002.md` establishes what a Superseding Directive looks like in this repository, but whether SD-001 followed the same shape is unknowable.
- **Whether SD-001 explicitly named a §4 precedence list** or established only the principle that a precedence order applies. See §3.5.

---

## 7. Basis for a reconstructed instrument (per ORDER 035 §2.4)

Should a real `SUPERSEDING_DIRECTIVE_001.md` be authored per ORDER 035 §2.4 Alternative A, this record supplies the substantive content of §3.1–§3.7 above. Under §2.4's marking rule:

- **Every clause in the reconstructed instrument will carry the `reconstructed` mark**, because no verbatim SD-001 text exists in the repository to quote. No clause qualifies as `known` in §2.4's sense.
- This is a property of the situation, not a defect of the reconstruction. The Vision Owner's decision explicitly acknowledges this: SD-001 is being reconstructed *because* the original was never captured.
- The mandatory status line specified by §2.4 shall appear verbatim in the reconstructed instrument's header, above all other content.
- The retroactive effective date is **2026-07-22** (from ADR 001 §1.4, quoted in §2.1 above), stated without an "approximate" qualifier because ADR 001 preserves the exact date.
- The downstream-prevails clause per §2.4 shall be explicit: where a reconstructed SD-001 clause conflicts with any document authored under the original SD-001 (notably ADR 001), the downstream document prevails.
- No amendment to ADR 001 is authorised or required by the reconstruction; the citation resolves to the reconstructed instrument automatically once that file exists.

---

## 8. Cross-reference to ORDER 001 / Director's Addendum

Agent memory (`nexus_framework_governance.md`) references a *"Director's Addendum issued after Order 001"* which matches no repository file. Whether:

- SD-001 and this Director's Addendum are the same instrument under different names,
- they are two related but distinct governance gaps at the same era, or
- the Director's Addendum reference is an artefact of an unrelated conversation absorbed into memory

is not determinable from the repository. This record establishes SD-001 only. The Director's Addendum is dispositioned separately under ORDER 035 §4.8 (and its status may itself become `unrecoverable`).

---

**End of SD_001_RECONSTRUCTION_RECORD.**
