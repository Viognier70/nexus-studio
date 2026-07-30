# ORDER REGISTRY

**Version:** 1.0 (initial — created under `ORDER_034_DOCUMENTATION_ALIGNMENT.md` §0)
**Date:** 2026-07-29
**Governing rule:** Per `CLAUDE.md`, no ORDER number may be issued without an entry below. Renumber before issue if collision is found.

---

## 1. Scope

Every ORDER number that appears anywhere in the repository — filename, document header, status line, change-log entry, or narrative reference — is recorded here. Gaps in the sequence are shown, not hidden. An ORDER cited only in agent memory but never written into the repository is a documentation defect and is **not** eligible for a registry entry (per `ADR_002_SYNTHESIS_POLICY.md` §7.5).

**Non-ORDER governance instruments** with a defective provenance (a Superseding Directive that has no artefact in the repository, for example) are also recorded here per `ORDER_035_MEMORY_PROVENANCE_REPAIR.md` §2.3, so the gap does not sit invisible. Such rows carry their instrument type in the `#` column (e.g. `SD-001`) and are not part of the ORDER number sequence.

## 2. Legend — Carrier

- **Own document** — the ORDER text itself is committed as its own file. This is the only carrier that qualifies as a versioned instrument.
- **Report only** — the ORDER produced one or more report files but the order text itself was never committed. The ORDER exists as an artefact but not as an instrument.
- **Reference only** — the number is cited by other documents but no order document or report exists in the repository. The ORDER is inferred, not evidenced.
- **Not found in repo** — the number does not appear anywhere in `documentation/`. Included in the sequence for gap-visibility.
- **Void** — a draft was issued but withdrawn before ever taking effect (recorded here so the number is not silently reused).
- **Reserved** — a number has been claimed in this registry per `CLAUDE.md` rule 9 but no order file is committed yet. Held pending file authoring or Vision Owner approval.

## 3. Registry

| # | Title / subject | Status | Carrier | File(s) |
|---|---|---|---|---|
| 001 | *(unknown)* | Not found in repo | — | Referenced only in agent memory (`nexus_framework_governance.md`) as "Director's Addendum issued after Order 001". Not evidenced in repo. |
| 002 | Recognisable-village exploration prototype (first playable) | Superseded / historical | Reference only | Cited by `ADR_001_DIGITAL_TWIN_PHASE.md`, `SUPERSEDING_DIRECTIVE_002.md`. No order document committed. |
| 003 | Digital Twin Reconstruction — District 1 | Superseded / historical | Reference only | Cited by `DISTRICT_PRODUCTION_TRACKER.md`, `DISTRICT_1_REFERENCE_REQUEST.md`, `APPROXIMATION_REGISTER.md`. No order document. |
| 003A | *(unknown sub-variant)* | Unclear | Reference only | Single mention in `APPROXIMATION_REGISTER.md`. |
| 004 | PASS 1 baseline placement (District 1) | Superseded / historical | Reference only | Cited by `APPROXIMATION_REGISTER.md`, `RENDERER_ALIGNMENT_REPORT_ORDER_020.md`. **No own order document (per ADR 002 memory audit).** Provenance evidence: `ORDER_RECONSTRUCTION_004_005_019_020.md` §2 (ORDER 035 §2.2). |
| 005 | Production Mode — 60-minute work cycles | Active workflow rule | Reference only | Cited by `APPROXIMATION_REGISTER.md` and agent memory. **No own order document (per ADR 002 memory audit).** Provenance evidence: `ORDER_RECONSTRUCTION_004_005_019_020.md` §3 (ORDER 035 §2.2). |
| 006 | Torget long-house block modelling | Superseded / historical | Reference only | Cited by `APPROXIMATION_REGISTER.md`. No order document. |
| 007 | — | Not found in repo | — | Gap in sequence — number possibly never issued. |
| 008 | — | Not found in repo | — | Gap in sequence — number possibly never issued. |
| 009 | — | Not found in repo | — | Gap in sequence — number possibly never issued. |
| 010 | — | Not found in repo | — | Gap in sequence — number possibly never issued. |
| 011 | District 2 PHASE 1 modelling constraints | Historical | Reference only | Cited by `documentation/references/district-2/*/notes.md`. No order document. |
| 012 | — | Not found in repo | — | Gap in sequence — number possibly never issued. |
| 013 | — | Not found in repo | — | Gap in sequence — number possibly never issued. |
| 014 | *(unknown)* | Unclear | Reference only | Single mention in `APPROXIMATION_REGISTER.md`. |
| 015 | *(unknown)* | Unclear | Reference only | Single mention in `APPROXIMATION_REGISTER.md`. |
| 016 | — | Not found in repo | — | Gap in sequence — number possibly never issued. |
| 017a | *(unknown sub-variant)* | Unclear | Reference only | Single mention in `APPROXIMATION_REGISTER.md`. |
| 018 | Road-hierarchy rebuild | Historical | Reference only | Cited by `WORLD_ALIGNMENT_AUDIT_ORDER_019.md`, `APPROXIMATION_REGISTER.md`. No order document. |
| 019 | World Alignment | Executed — reported | Report only | `WORLD_ALIGNMENT_REPORT_ORDER_019.md`, `WORLD_ALIGNMENT_AUDIT_ORDER_019.md`, `CRITICAL_DEFECT_REGISTER_ORDER_019.md`. **No own order document (per ADR 002 memory audit).** Provenance evidence: `ORDER_RECONSTRUCTION_004_005_019_020.md` §4 (ORDER 035 §2.2). |
| 019R | Full-map authenticity re-audit (revision of 019) | Executed — reported | Report only | `FULL_MAP_AUTHENTICITY_AUDIT_ORDER_019R.md`. |
| 020 | District Coherence — landmark procedural detail unification | Executed — reported | Report only | `RENDERER_ALIGNMENT_REPORT_ORDER_020.md`. **No own order document (per ADR 002 memory audit).** Provenance evidence: `ORDER_RECONSTRUCTION_004_005_019_020.md` §5 (ORDER 035 §2.2) — records the title/content mismatch between the ORDER 019 proposal ("District Coherence") and the executed report ("Renderer Alignment"). |
| 020 *(draft, competing)* | Documentation Alignment (competing draft) | Void | — | Withdrawn by `ORDER_034_DOCUMENTATION_ALIGNMENT.md` header — collided with the existing ORDER 020 above. |
| 021 | Building completion | Executed — reported | Report only | `BUILDING_COMPLETION_REPORT_ORDER_021.md`, `BUILDING_COMPLETION_AUDIT_ORDER_021.md`. |
| 021A | Performance preparation / phase gate | Historical | Reference only | Cited by `PERFORMANCE_PREPARATION_REFERENCE.md`, `WORLD_AUTHENTICITY_REPORT_ORDER_022.md`. |
| 022 | World Authenticity | Executed — reported | Report only | `WORLD_AUTHENTICITY_REPORT_ORDER_022.md`. |
| 023 | Engineering Infrastructure | Executed — reported | Report only | `ENGINEERING_INFRASTRUCTURE_ORDER_023.md`. |
| 024 | Phase IV Kickoff | Executed — reported | Report only | `PHASE_IV_KICKOFF_REPORT_ORDER_024.md`. |
| 025 | Engineering (optimisation forbidden) | Executed — reported | Report only | `ORDER_025_ENGINEERING_REPORT.md`. |
| 026 | Pre-review defect sweep (D03) | Executed | Reference only | Cited by `DISTRICT_PRODUCTION_TRACKER.md`, `ORDER_027_FINAL_REPORT.md`, and district review files. No order or report document. |
| 027 | Place Framework & Adaptive World Model | Executed — reported | Report only | `ORDER_027_FINAL_REPORT.md`. |
| 028 | District Completeness (Phase 2 → Phase 7) | Executed — reported | Report only | `DISTRICT_COMPLETENESS.md` (Phase 7), `LANDMARK_CATALOGUE.md` (Phase 2), `BUILDING_CATALOGUE.md`, `ADAPTIVE_BUILDINGS.md`. |
| 029 | Review Package | Executed — reported | Report only | `REVIEW_PACKAGE_ORDER_029.md`. Updates `LANDMARK_CATALOGUE.md`. |
| 030 | Recognisability lift — Tier 1 systemic fixes | Proposed (title only) | Reference only | Proposed as next-order title in `RECOGNISABILITY_SURVEY.md`; also cited by `STREET_PROFILE_CATALOGUE.md`, `REVIEW_PACKAGE_ORDER_029.md`. No order document. |
| 030 *(draft, competing)* | Documentation Alignment (companion to SD-002) | Void | — | Withdrawn by `ORDER_034_DOCUMENTATION_ALIGNMENT.md` header — collided with the ORDER 030 proposed title above. Note: `SUPERSEDING_DIRECTIVE_002.md` still names this file as a companion — dangling reference, to be corrected via §8 companion integrity report. |
| 031 | Street profile catalogue / authenticity matrix (Phase 3) | Executed | Reference only | Cited by `STREET_PROFILE_CATALOGUE.md`, `AUTHENTICITY_MATRIX.md`, `VISUAL_IDENTITY_AUDIT.md`. No order document. |
| 032 | — | Not found in repo | — | Number possibly never issued. |
| 033 | Reference audit & memory audit | Executed | Reference only | Cited by `ADR_002_SYNTHESIS_POLICY.md` §1 (reference audit) and §7 (memory audit). Findings absorbed into ADR 002 rather than a standalone report. |
| 034 | Documentation Alignment | Awaiting Vision Owner approval | **Own document** | `ORDER_034_DOCUMENTATION_ALIGNMENT.md`. |
| 035 | Memory Provenance Repair | Awaiting Vision Owner approval | **Own document** | `ORDER_035_MEMORY_PROVENANCE_REPAIR.md`. Parent: `ADR_002_SYNTHESIS_POLICY.md` §7, §9.1. |
| 036 | Reference Integrity Infrastructure | Executed 2026-07-29 | **Own document** | `ORDER_036_REFERENCE_INTEGRITY_INFRASTRUCTURE.md`. Parent: `ADR_002_SYNTHESIS_POLICY.md` §4.2, §5, §9 steps 1–3. Executed in four section commits: `9e826c9` (§0, registry entries), `71ae625` (§2, 13 relocations + manifest paths), `73420e3` (§3, `scripts/validate-references.mjs` + `VALIDATOR_REFERENCE.md`), `e29d354` (§4, `reviewState` backfill + schema in `documentation/references/README.md`). Steps 4–8 of ADR 002 §9 remain out of scope per §5. |
| 100 | Nexus Studio Game Design Constitution (vision reference) | Reclassified as vision reference (outside precedence order) per SD-002 §3 | **Own document** | `documentation/foundation/vision/ORDER_100_VISION.md` (markdown). Converted from `.docx` and relocated under ORDER 034 §6, commit `69df962`; source `.docx` archived alongside the previous name. |
| SD-001 | Superseding Directive 001 — declares Digital Twin Phase, installs authenticity, defines precedence order | Governance instrument gap — referenced as issued but never written to the repository | Reference only | Not an ORDER. Attested as issued 2026-07-22 by `ADR_001_DIGITAL_TWIN_PHASE.md` §1.4; cited in ADR 001 (11 refs), `DISTRICT_1_REFERENCE_REQUEST.md` line 221, and agent memory `reference_confidence_rule.md` line 29. Provenance evidence: `documentation/foundation/SD_001_RECONSTRUCTION_RECORD.md` (ORDER 035 §2.1). Vision Owner decision (ORDER 035 §2.4, 2026-07-29): Alternative A — a real `SUPERSEDING_DIRECTIVE_001.md` shall be authored from the reconstruction record under the mandatory reconstruction markings, in a separate commit after review. |

## 4. Findings

**Observation 1 — Instrumental deficit.** Only two ORDER numbers carry their own instrument: ORDER 034 (this order's parent) and ORDER 100 (currently as a binary). Every other ORDER exists only as its downstream report, or as a bare reference. This matches the pattern ORDER 034 §0 was written to correct.

**Observation 2 — Draft collision.** Two competing drafts (ORDER 020 draft, ORDER 030 draft) were withdrawn before this order existed. This is the specific pathology §0 exists to prevent recurrence of.

**Observation 3 (resolved 2026-07-29 by commits `9b16962` + `2f5f523`).** `SUPERSEDING_DIRECTIVE_002.md` §1 header and §6 previously named the void `ORDER_030_DOCUMENTATION_ALIGNMENT.md` draft. Both references now repointed to `ORDER_034_DOCUMENTATION_ALIGNMENT.md`.

**Observation 4 — Number gaps.** 001, 007, 008, 009, 010, 012, 013, 016, 032 do not appear in the repository. Whether they were verbally issued and lost, deliberately skipped, or never issued is not determinable from the repo. Numbers 003A, 014, 015, 017a appear once each without descriptive context.

**Observation 5 — ORDER 001 is memory-only.** Cited in `nexus_framework_governance.md` (agent memory) as the parent of a "Director's Addendum". Not evidenced in the repository. Under `ADR_002_SYNTHESIS_POLICY.md` §7.5 this is a documentation defect, not a memory feature.

## 5. Maintenance

- New ORDER: reserve the next number in this registry with title, date and status *before* the order text is written. Update to "Own document" when the file lands.
- Superseded/void: never delete an entry. Update status; retain the row so the number cannot be reused silently.
- Discovered ORDER: if repository archaeology surfaces an ORDER referenced only in agent memory or external channels, add it as "Reference only" with a note on where it was found.

---

**End of ORDER REGISTRY v1.0.**
