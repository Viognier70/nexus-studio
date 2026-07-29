# ORDER_RECONSTRUCTION_004_005_019_020 — Evidence record for four sprint orders

**Status:** Evidence record. **This document has NO governing authority.** It records what is knowable about ORDER 004, ORDER 005, ORDER 019 and ORDER 020 from repository artefacts. It is not a reconstruction of the orders themselves and it may not be cited as authority. Any reconstructed instrument authored later must be marked as such per the pattern in `ORDER_035_MEMORY_PROVENANCE_REPAIR.md` §2.4; no Vision Owner decision to author reconstructed instruments for these four orders has been recorded — that decision remains open under §7 of ORDER 035.

**Class:** Evidence record — governance provenance repair
**Order of authorship:** `ORDER_035_MEMORY_PROVENANCE_REPAIR.md` §2.2
**Date:** 2026-07-29
**Author (recording):** Claude Code

**Reading conventions.** Every substantive line is marked one of:

- **[known]** — quoted verbatim from an existing repository document (including its own downstream report).
- **[inferred]** — reconstructed from downstream reports and registers that describe what the order authorised or achieved; the wording is the downstream document's, not the order's.
- **[unrecoverable]** — attested nowhere; cannot be established from current repository state.

**Two very different provenance profiles.** ORDERs 019 and 020 have committed reports in the tree (in some cases multiple reports and an audit). ORDER 004 and ORDER 005 have no report and no order document — their only traces are entries in `APPROXIMATION_REGISTER.md` and rules in agent memory. This asymmetry is called out at every point where it matters.

---

## 1. Purpose

Four sprint orders were referenced by execution reports, registers, and agent memory, but none carries its own order document in the repository. ORDER 035 §2.2 requires this record to compile what can be established about each, distinguishing known from inferred from unrecoverable, so the Vision Owner can decide (under §7 of ORDER 035, still open) whether any of the four should follow SD-001 into reconstructed-instrument status.

The four are treated in one record because they share a provenance defect and a review context; the §-sections below can be read independently.

---

## 2. ORDER 004 — PASS 1 baseline placement (District 1)

### 2.1 References

- `documentation/world/APPROXIMATION_REGISTER.md` line 244 (dated 2026-07-23) — **[known]**
  > **ORDER 004 / ORDER 005 PASS 1** executed for the eleven District 1 landmarks. Root-cause coordinate-frame bug identified from the m3-district capture: the extrusion pipeline placed each landmark's walls at `world Z = -poly.y` while overlaid decor was placed at `world Z = +poly.y`, opening a 2 × centre[1] gap that scaled with each landmark's distance from the OSM projection centre (~35 m for the church, ~78 m for Gästgivaregård, ~170 m for Måltidens hus, ~220 m for Herrgården). The fix, first proven on the church rev 2 and now applied to every crafted District 1 landmark, is a shared `useLandmarkWallGeo` helper that negates the shape Y before extrusion, centres the shape at the polygon centroid, and lives inside a single `<group>` anchored at `landmark.position`.

- `documentation/architecture/RENDERER_ALIGNMENT_REPORT_ORDER_020.md` §2 — **[known]**
  > Comments at `CraftedLandmarks.tsx:111-128` explicitly document the flip and introduce `useLandmarkWallGeo` as the "shared local frame" fix — but the ORDER 004 PASS 1 fix was applied only to the handcrafted-landmark path. The OSM-driven renderers stayed on the flipped frame for 15+ commits.

- Agent memory `production_mode_workflow.md` line 41 — **[known]**
  > The pass ladder for the Digital Twin reconstruction is ORDER 004 PASS 1 → PASS 2 → PASS 3 → PASS 4 → PASS 5. Each pass covers **all** landmarks in the current production target (currently District 1) simultaneously before the next pass begins.

- `documentation/architecture/ORDER_REGISTRY.md` row 004 — **[known]**
  > 004 | PASS 1 baseline placement (District 1) | Superseded / historical | Reference only | Cited by APPROXIMATION_REGISTER.md, RENDERER_ALIGNMENT_REPORT_ORDER_020.md. **No own order document (per ADR 002 memory audit).**

### 2.2 What it instructed — **[inferred]**

ORDER 004 instructed a PASS 1 baseline for eleven District 1 landmarks (church, Gästgivaregård, Måltidens hus / Sevillapaviljongen, Herrgården, Pizzans Hus, Cornelis, Glass & Choklad, Antikvariatet, Old Railway Station, Torget, Guldkringlan). PASS 1 = coordinate-frame corrected placement + OSM-footprint extrusion + removal of all invented silhouette detail from earlier revisions, replacing anything without a reference with an `ApproximationMarker`.

The eleven-landmark list is knowable from register line 244; the "PASS 1" semantics are knowable from the register plus the pass ladder in memory.

### 2.3 Whether another document carries the rule

**Partially.** The coordinate-frame fix survives as `frontend/src/strategic/scene/CraftedLandmarks.tsx::useLandmarkWallGeo` and its D2 sibling; the geometric convention is recorded in memory (`feedback_transform_frame_convention.md`) but that memory currently cites ORDER 020, not ORDER 004. The eleven-landmark scope is recorded only in `APPROXIMATION_REGISTER.md` line 244 and in the PASS 2–5 register entries that reference it (lines 245–249).

The "never invent silhouette detail without a reference" rule that ORDER 004 PASS 1 applied is now codified in `documentation/foundation/DESIGN_PRINCIPLE_REALITY_VS_GAMEPLAY.md`.

### 2.4 Whether the substance survives in practice

**Yes, fully.** Every District 1 landmark now renders through the shared coordinate frame; the extrusion pipeline the register describes is live in `CraftedLandmarks.tsx`; the eleven landmarks have been carried through PASS 2, PASS 3, PASS 4, PASS 5 with the same helper.

### 2.5 Unrecoverable

- **The exact wording of ORDER 004.** No text of the order exists.
- **The Vision Owner instruction that triggered ORDER 004** — whether it named "PASS 1" explicitly or whether "PASS 1" was a Claude Code coinage adopted retroactively is not attested.
- **Whether ORDER 004 was ever intended to end at PASS 1**, with subsequent passes issued as separate orders. Register line 245 uses "ORDER 005 PASS 2" and lines 246–249 use "ORDER 005 PASS 3/4/5", suggesting PASSes 2–5 were issued under ORDER 005 rather than as continuations of ORDER 004. Line 244 conflates them ("ORDER 004 / ORDER 005 PASS 1"). Memory (`production_mode_workflow.md`) attributes the pass ladder to ORDER 004. This attribution conflict is unrecoverable at the order level.

---

## 3. ORDER 005 — Production Mode work-cycle rules

### 3.1 References

- Agent memory `production_mode_workflow.md` — **[known]** (verbatim of the whole file; frontmatter attributes the rule to ORDER 005)
  > name: Production Mode work-cycle rules (ORDER 005)
  > […]
  > The project is in **Production Mode** (ORDER 005 onward). The objective is to maximise uninterrupted productive work while maintaining review quality.

  followed by:
  - work in ~60-minute production blocks;
  - do not stop after every individual landmark;
  - only stop at end of a complete pass or a genuine blocker;
  - interrupt Vision Owner only for typecheck fail / reference conflict / architecture decision / pass completion;
  - six-step end-of-block report (save; typecheck; confirm Vite; report changes; recommend camera preset; ask for refresh);
  - no commits or pushes at end of block;
  - pass ladder = ORDER 004 PASS 1 → PASS 5, each pass covers all landmarks simultaneously.

- Agent memory `production_mode_no_optional_diagnostics.md` line 9 — **[known]**
  > Production blocks are timed work-cycles under ORDER 005; interruptions for approval prompts break the flow.

- `documentation/world/APPROXIMATION_REGISTER.md` lines 245–249 (dated 2026-07-23) — **[known]**
  Detailed PASS 2 / PASS 3 / PASS 4 / PASS 5 execution logs, each headed "ORDER 005 PASS N executed for District 1".

- `documentation/architecture/ORDER_REGISTRY.md` row 005 — **[known]**
  > 005 | Production Mode — 60-minute work cycles | Active workflow rule | Reference only | Cited by APPROXIMATION_REGISTER.md and agent memory. **No own order document (per ADR 002 memory audit).**

### 3.2 What it instructed — **[inferred]**

Two distinct sets of instructions are attributed to ORDER 005 by the available evidence, and the two sets do not fit the same shape:

- **A workflow-rule set** (from `production_mode_workflow.md` and `production_mode_no_optional_diagnostics.md`): production blocks, non-interruption rules, end-of-block report. This reads as a durable process instrument.
- **An execution set** (from `APPROXIMATION_REGISTER.md`): PASS 2 → PASS 5 of the District 1 landmark reconstruction. This reads as a sprint order.

Whether ORDER 005 was one order with both meanings, or whether the register's "ORDER 005 PASS N" tags are shorthand for "the ongoing production block sequence run under ORDER 005's work-cycle rules", is not determinable from the record. The two interpretations are compatible: PASSes 2–5 were the work performed during Production Mode as defined by ORDER 005.

### 3.3 Whether another document carries the rule

**No — this is the biggest gap of the four orders.**

The workflow rules exist only in agent memory. `documentation/architecture/PHASE_IV_PRODUCTION_PLAN.md` and other production documents reference the practice but do not codify the specific rules (60-minute blocks, six-step end-of-block report, interruption criteria). If the memory files are lost or invalidated, the rules that govern how production is actually run vanish with them.

The PASS 2–5 substance survives in the code (the landmark geometry is in `CraftedLandmarks.tsx` at its post-PASS-5 state) but the rule "each pass covers all landmarks simultaneously before the next begins" survives only in memory.

### 3.4 Whether the substance survives in practice

**Workflow rules — yes, in practice; no, in the repository.** They govern day-to-day production and are honoured session-to-session, but that fact rides on the memory files.

**Execution outcomes — yes.** The District 1 landmarks are at their PASS 5 state (Gästgivaregård, church, Måltidens hus with facade / material work and immediate-surroundings detail per register lines 246–249).

### 3.5 Unrecoverable

- **The exact wording of ORDER 005.** No text of the order exists.
- **The precise scope boundary between ORDER 004 and ORDER 005** (see §2.5).
- **Whether ORDER 005 was issued once or amended in-flight** — memory presents a single coherent rule set, but the register entries span multiple execution passes across days.
- **Whether the "six-step end-of-block report" and "no commits or pushes at end of block" clauses were verbatim in ORDER 005** or were derived operational rules that Claude Code recorded in memory.

---

## 4. ORDER 019 — World Alignment

### 4.1 References

- `documentation/architecture/WORLD_ALIGNMENT_REPORT_ORDER_019.md` header — **[known]**
  > # World Alignment Report — ORDER 019
  > […]
  > **Session:** ORDER 019 (auto-mode, 2026-07-25)

- `documentation/architecture/WORLD_ALIGNMENT_AUDIT_ORDER_019.md` header — **[known]**
  > # World Alignment Audit — ORDER 019 Phase 1
  > **Status:** Living
  > **Class:** Engineering audit + intervention plan
  > **Session:** ORDER 019 (auto-mode, 2026-07-25)
  > **Parent:** `ADR_001_DIGITAL_TWIN_PHASE.md`

- `documentation/architecture/CRITICAL_DEFECT_REGISTER_ORDER_019.md` header — **[known]**
  > # Critical Defect Register — ORDER 019 (reopened)
  > […]
  > Vision Owner rejected ORDER 019 on visual inspection. The numeric audits reported success but the running scene still fails core acceptance criteria.

- Commit list quoted in `WORLD_ALIGNMENT_REPORT_ORDER_019.md` — **[known]**
  > 424cc69 docs(architecture): ORDER 019 Phase 1 — world alignment audit
  > 9b754e5 feat(traffic):      ORDER 019 Block A — hierarchy-weighted vehicle spawning
  > c248b74 feat(roads):        ORDER 019 Block B — OSM surface differentiates road tone
  > 32174c9 feat(ingest):       ORDER 019 Block C — capture roof:shape + structural OSM tags
  > b161384 feat(scene):        ORDER 019 Block E — distant Bergslag forest ring
  > […]
  > c27ffa0 docs(register):     ORDER 019 derivations

- Agent memory `feedback_visual_validation_authoritative.md` line 9 — **[known]**
  > ORDER 019 shipped 8 commits with green typecheck + build + a numeric proof that traffic and label hierarchies were working. Vision Owner rejected the ORDER because the running scene still showed roads that don't match Grythyttan, forest inside lakes, vehicles through buildings, and Kärnhuset in the wrong place. The numeric checks were measuring the wrong things.

### 4.2 What it instructed — **[inferred]**

ORDER 019 instructed a "world alignment" pass: make localhost visually read as the real Grythyttan without a resident needing Google Maps for reference (audit §1 objective). The audit + intervention plan divides the work into a Phase-1 audit followed by systemic blocks: Block A (hierarchy-weighted vehicle spawning), Block B (OSM surface differentiates road tone), Block C (capture roof:shape + structural OSM tags), Block E (distant Bergslag forest ring). Block D is absent from the commit list — its content is not attested.

The order was executed in "auto-mode" — a working mode where Claude Code proceeds through the intervention plan without pause between blocks. "Auto-mode" is not defined elsewhere in the repository; it appears as a session tag on ORDER 019, ORDER 019R and ORDER 020.

### 4.3 Whether another document carries the rule

**Yes, at the outcome level.** Every intervention that ORDER 019 or its remediation ORDER 019R applied is recorded in the reports listed in §4.1, and the substance survives in the code (`roadRoles.ts`, `HorizonForest.tsx` water exclusion, `scripts/validate-world.mjs`).

At the rule level — what makes something a valid "world alignment" ORDER — nothing else codifies it. `FULL_MAP_AUTHENTICITY_AUDIT_ORDER_019R.md` records the remediation pattern (Vision Owner FAIL → root-cause audit → systemic fix) but does not formalise it.

### 4.4 Whether the substance survives in practice

**Yes.** The Phase-1 audit's findings are executed (roof:shape ingest, surface-differentiated roads, traffic hierarchy). The Vision Owner FAIL that made this a special order in the record produced two lasting artefacts: `feedback_visual_validation_authoritative.md` (memory rule) and the `scripts/validate-world.mjs` validator (from 019R). Both are in daily use.

### 4.5 Unrecoverable

- **The exact wording of ORDER 019.** No text of the order exists.
- **What Block D contained** (commit list skips A → B → C → E).
- **Whether "auto-mode" was an ORDER 019 instruction or a Claude Code operational choice** absorbed as a session tag.
- **Whether the objective as stated in the audit ("make localhost visually read as the real Grythyttan without a resident needing Google Maps for reference") is verbatim from ORDER 019** or Claude Code's paraphrase.

---

## 5. ORDER 020 — District Coherence / Renderer Alignment

### 5.1 References

- `documentation/architecture/RENDERER_ALIGNMENT_REPORT_ORDER_020.md` header — **[known]**
  > # Renderer Alignment Report — ORDER 020
  > **Status:** CONDITIONAL PASS pending Vision Owner visual re-review of localhost.
  > **Session:** ORDER 020 (auto-mode, 2026-07-25)
  > **Parent audits:** WORLD_ALIGNMENT_AUDIT_ORDER_019.md, FULL_MAP_AUTHENTICITY_AUDIT_ORDER_019R.md, CRITICAL_DEFECT_REGISTER_ORDER_019.md

- `documentation/architecture/WORLD_ALIGNMENT_REPORT_ORDER_019.md` line 123 (ORDER 019's proposal for its successor) — **[known]**
  > **ORDER 020 — District Coherence.** Bring the handcrafted (District 1 + District 2) landmarks onto the same procedural detail system that `OsmBuildings` uses, so a resident cannot tell where the handcrafted zone ends.

- Agent memory `feedback_transform_frame_convention.md` line 17 — **[known]**
  > **Why:** ORDER 020 traced every visual defect in Vision Owner defect reports back to this. `OsmBuildings`, `OsmRoads`, `OsmWater`, `OsmDistricts`, and the shared `CraftedLandmarks.extrudeShape` helper all rendered mirrored across the east-west axis while every position-based component ran in the correct frame.

- `documentation/architecture/VALIDATOR_REFERENCE.md` line 11 — **[known]**
  > Runtime transform-parity guard from ORDER 020. Ensures every shape-based renderer projects OSM (x, z) to world (x, z) — never mirrored.

- `documentation/architecture/ORDER_REGISTRY.md` row 020 — **[known]**
  > 020 | District Coherence — landmark procedural detail unification | Executed — reported | Report only | RENDERER_ALIGNMENT_REPORT_ORDER_020.md. **No own order document (per ADR 002 memory audit).**

### 5.2 What it instructed — **[inferred]**, with a title / content mismatch

**Two different subjects are attributed to ORDER 020:**

- As proposed by ORDER 019 (§4.1 above), ORDER 020 was "District Coherence — bring handcrafted landmarks onto the same procedural detail system as `OsmBuildings`".
- As executed and reported (`RENDERER_ALIGNMENT_REPORT_ORDER_020.md`), ORDER 020 was the coordinate-frame unification: fix Convention A → Convention B across every renderer so nothing renders mirrored across the east-west axis. Ship `scripts/parity-check.mjs` as the guard against recurrence.

The registry row (row 020) preserves the ORDER 019 proposal title ("District Coherence — landmark procedural detail unification") even though the report addresses a different subject. Whether the Vision Owner reissued ORDER 020 with a different mandate between the ORDER 019 report and execution, or whether the coordinate-frame fix was reprioritised inside ORDER 020's execution as more urgent than the procedural-detail unification, is not attested.

Some artefacts of the *proposed* "District Coherence" work landed later under other orders (ORDER 021 building completion; ORDER 022 world authenticity; ORDER 025 engineering). The *executed* "Renderer Alignment" content is the coordinate-frame fix.

### 5.3 Whether another document carries the rule

**Yes.** The coordinate-frame convention that ORDER 020 established is now enforced by `scripts/parity-check.mjs` (statically and empirically) and codified in `documentation/architecture/VALIDATOR_REFERENCE.md`. Agent memory (`feedback_transform_frame_convention.md`) also holds the rule but currently cites ORDER 020's report — which ORDER 035 §4.5 flags as citing evidence, not authority.

### 5.4 Whether the substance survives in practice

**Yes.** All shape-based renderers use Convention B. `scripts/parity-check.mjs` guards against regression. No mirrored-geometry defect has recurred in reports since ORDER 020's landing.

### 5.5 Unrecoverable

- **The exact wording of ORDER 020.** No text of the order exists.
- **Which subject ORDER 020 was actually issued for** — District Coherence per the ORDER 019 proposal, or Renderer Alignment per the executed report, or both.
- **Whether the CONDITIONAL PASS status in the report was ever converted to unconditional PASS** by the Vision Owner visual re-review it references. No follow-up review report exists.

---

## 6. Summary — asymmetric provenance profiles

| Order | Own document | Reports in tree | Substance survives? | Rule has repository home? |
|---|---|---|---|---|
| 004 | No | No | Yes (code + register) | Partial — code + `DESIGN_PRINCIPLE_REALITY_VS_GAMEPLAY.md` for "never invent"; scope only in register |
| 005 | No | No | Yes (workflow in memory; execution in code + register) | **No** — workflow rules live only in memory files |
| 019 | No | Yes (3 files) | Yes (code + validator + memory) | Yes at outcome level; no at rule level |
| 020 | No | Yes (1 file) | Yes (parity-check + all renderers on Convention B) | Yes — `VALIDATOR_REFERENCE.md`, `parity-check.mjs` |

**The load-bearing gap is ORDER 005.** It is the only one whose *rules* have no repository home. ORDER 035 §4.9 and §4.10 (production-mode memory files) both depend on this record for their disposition. Under ORDER 035 §7's still-open question 2 ("should every order be written before execution?"), ORDER 005 is the strongest argument for yes: the day-to-day practice that governs how work happens is currently unrecoverable from the repository alone.

**ORDER 004 is a lighter version of the same gap:** the eleven-landmark scope and PASS-1 semantics exist only in `APPROXIMATION_REGISTER.md` line 244 and in memory.

**ORDERs 019 and 020 have reports** and are the least at risk. Their reports are however *records of execution*, not *records of instruction*: a report says what was done, not what was authorised. That distinction — evidence versus authority — is exactly the one ADR 002 §7.1 makes normative.

---

## 7. Basis for possible reconstructed instruments

Should the Vision Owner decide under ORDER 035 §7 that any of the four should follow SD-001 into reconstructed-instrument status:

- **ORDER 004** and **ORDER 005** would have most clauses marked `reconstructed`, with only their execution outcomes (landmark list, pass ladder, workflow-rule text) as recovered material.
- **ORDER 019** and **ORDER 020** could reasonably lift their audit / report §1 objective and §2 findings into a reconstructed instrument's body, with `known` marks where the reports quote what was asked for and `reconstructed` marks elsewhere.
- The mandatory reconstruction markings from ORDER 035 §2.4 apply in all cases: verbatim status line, per-clause marks, retroactive date (where recoverable), and downstream-prevails clause.

No such decision is recorded at 2026-07-29. This section is contingency only.

---

**End of ORDER_RECONSTRUCTION_004_005_019_020.**
