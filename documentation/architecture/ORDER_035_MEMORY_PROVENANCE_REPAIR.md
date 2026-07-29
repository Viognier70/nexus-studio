# ORDER 035 — Memory Provenance Repair

**Version:** 1.1  
**Status:** Awaiting Vision Owner approval. Not in force until approved.  
**Class:** Sprint order — documentation and memory (precedence level 7)  
**Parent:** `ADR_002_SYNTHESIS_POLICY.md` §7, §9.1  
**Registry:** entered in `ORDER_REGISTRY.md`  
**Recipient:** Claude Code  

**Changes in v1.1:** §2 extended to include `SUPERSEDING_DIRECTIVE_001`, which the ORDER 034 §8.4 audit found to be referenced as issued — and as the authority for ADR 001 — while having no artifact in the repository. This is a heavier gap than the four sprint orders and is treated first.

---

## 0. Prerequisites

`ORDER_034_DOCUMENTATION_ALIGNMENT.md` is complete and `documentation/architecture/ORDER_REGISTRY.md` exists. If it does not, stop and report.

---

## 1. Purpose

The ADR 002 §7 memory audit found eight of nine memory rule files failing §7.1. The audit also found the cause, which is not a memory defect:

**Memory files cite governance instruments that have no artifact in the repository.**

The ORDER 034 §8.4 audit then found the same pattern one level higher, and worse: `SUPERSEDING_DIRECTIVE_001` is referenced as issued, and as the authority under which `ADR_001_DIGITAL_TWIN_PHASE.md` operates. ADR 001 authorised the entire Digital Twin Phase — the OSM ingest, the confidence thresholds, every district reconstruction. Its stated authority cannot be read.

A citation cannot be added to a document that does not exist. The primary work of this order is to establish repository homes for rules that have none, and only then to attach citations.

---

## 2. Reconstruct the missing governance record

### 2.1 `SUPERSEDING_DIRECTIVE_001` — first, and separately

Establish, without inventing:

1. Every reference to SD-001 anywhere in the repository and in agent memory. Quote each verbatim with its location.
2. What ADR 001 states SD-001 authorised.
3. Whether any repository document carries the same authorisation under another name.
4. Whether the substance survives in current practice.

Produce `documentation/foundation/SD_001_RECONSTRUCTION_RECORD.md`. It states plainly what is **known** (quoted from existing documents), what is **inferred**, and what is **unrecoverable**. Inferred content is marked inferred on every line.

**This record is evidence, not an instrument.** It does not carry the authority SD-001 would have had, and it must say so in its own header. Whether a real SD-001 is authored from it — retroactively dated and marked as reconstructed — is a Vision Owner decision recorded in §7.

Do not write `SUPERSEDING_DIRECTIVE_001.md`. Do not amend ADR 001.

### 2.2 ORDER 004, 005, 019, 020

Same treatment, one record for all four: `documentation/architecture/ORDER_RECONSTRUCTION_004_005_019_020.md`.

For each: what it instructed as far as its reports allow reconstruction, whether another document carries the rule, and whether it survives in practice. Known, inferred and unrecoverable distinguished throughout.

Note that ORDER 019 and 020 have reports in the tree (`WORLD_ALIGNMENT_AUDIT_ORDER_019.md`, `RENDERER_ALIGNMENT_REPORT_ORDER_020.md`); ORDER 004 and 005 have no trace beyond memory. Say so.

### 2.3 Update the registry

Both records are cited from `ORDER_REGISTRY.md` against their respective entries, and SD-001 is added to the registry as a governance instrument gap even though it is not an ORDER.

### 2.4 Vision Owner decision on SD-001 (recorded 2026-07-29)

**Alternative A is chosen: a real `SUPERSEDING_DIRECTIVE_001.md` shall be authored from the §2.1 reconstruction record.**

**Conditions.**

- Authored only after the §2.1 record is delivered and reviewed. Not authored from memory or inference alone.
- Mandatory header marking, above all other content:
  - **Status line**, verbatim: `Reconstructed 2026-07-29 from SD_001_RECONSTRUCTION_RECORD.md. This is not the instrument that was issued. The original was never written to the repository.`
  - Every clause marked either **known** (quoted from an existing document) or **reconstructed** (inferred from downstream artefacts). No clause left unmarked.
  - Retroactive effective date as established by §2.1, stated as approximate where it cannot be fixed.
  - An explicit statement that where the reconstruction conflicts with any document authored under the original instrument, the downstream document prevails. The reconstruction cannot retroactively invalidate work done under the instrument it reconstructs.

`ADR_001_DIGITAL_TWIN_PHASE.md` remains unmodified. Its citation resolves to the reconstructed instrument once that exists; no amendment to ADR 001 text is authorised by this order.

**§6 is amended accordingly:** writing `SUPERSEDING_DIRECTIVE_001.md` is authorised, but only in a separate commit after the §2.1 record is reviewed.

---

## 3. Transition period

`ADR_002_SYNTHESIS_POLICY.md` §7.1 states an uncited memory rule is invalid and not applied. Applied immediately that clause invalidates eight of nine files and halts production. That is not its purpose.

**§7.1 takes effect for a given memory file when that file's disposition in §4 is complete.** Until then the file applies as written, except where §4 marks a rule as an immediate correction.

The transition ends when every file in §4 is dispositioned. From that point §7.1 applies without exception, including to memory files created later.

---

## 4. Per-file disposition

### 4.1 `reference_confidence_rule.md` — complete

Corrected under ADR 002 §9.1. No further action.

**Disposition 2026-07-30:** file was already substantively correct per §9.1. §5 citation block appended to the memory file body (memory-side, outside repo): authority `ADR_002_SYNTHESIS_POLICY.md` §2.1 + §2.2 + §2.3 + §3 + §7 + §9.1 (six sections in one line, per §5 rule 4); related evidence `ADR_001_DIGITAL_TWIN_PHASE.md` §2.2/§2.3/§5.3/§6.1 and `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §5. **§7.1 transition: complete** — applies without exception.

### 4.2 `MEMORY.md` — refresh

The index hook for `reference_confidence_rule.md` still describes the pre-correction rule. Update it. Re-check every other hook against its file.

**Disposition 2026-07-30:** hook for `reference_confidence_rule.md` rewritten to reflect the ADR-002 two-tier + interim-state model (no longer a single-90% threshold rule). Every other hook spot-checked against its file's frontmatter and first paragraph — all match. MEMORY.md is an index rather than a rule file, so no §5 citation block applies to it. **§7.1 transition: complete.**

### 4.3 `digital_twin_hot_reload_workflow.md` — immediate correction, then home

**Immediate:** the "≥ 90 % bar" in *How to apply* contradicts ADR 002 §2.1. Correct now, ahead of the transition, citing ADR 002.

**Then:** the workflow rules have no repository home. Propose `documentation/architecture/HOT_RELOAD_REVIEW_WORKFLOW.md`, or a section in an existing living-process document. Present the proposal; do not create the file.

**Disposition 2026-07-30:**

- **Immediate correction applied** to the memory file: the "≥ 90 % bar" language rewritten to cite the ADR 002 §2.1 two-tier + interim-state model rather than the pre-correction single threshold. Points readers at `reference_confidence_rule.md` (which is itself now correct per §4.1) and at ADR 002 as the authority.
- **Home proposal — preferred:** extend `documentation/architecture/VISION_REVIEW_WORKFLOW.md` with a new "Hot-reload inspection loop" section formalising the five-step cycle (dev-server confirmation → typecheck → refresh prompt → change summary → camera preset). Rationale: the workflow *is* a vision-review workflow — the semantic fit is exact, avoids creating a new sibling doc, and puts the rule beside the "does this look like Grythyttan?" acceptance criterion that governs its output.
- **Home proposal — alternatives:** (a) new `documentation/architecture/HOT_RELOAD_REVIEW_WORKFLOW.md` as ORDER 035 names, if VISION_REVIEW_WORKFLOW.md should stay narrowly scoped; (b) section in `PHASE_IV_PRODUCTION_PLAN.md` if the production-plan doc is preferred as the living-process container.
- **Not created** per §6. Awaiting Vision Owner selection among options.
- **§7.1 transition: under §3** — rule applies as written until an authority lands.

### 4.4 `feedback_reality_vs_gameplay_principle.md` — cite, provisionally

`DESIGN_PRINCIPLE_REALITY_VS_GAMEPLAY.md` exists and is the versioned authority. Add the citation.

**Caveat:** ORDER 034 §8.1 found that document claims *"CANONICAL — supersedes any workflow rule"* while stating no precedence level and naming no specific rule it supersedes. Its placement is unresolved. Mark the citation provisional.

Report whether this memory file should be reduced to a pointer rather than restating design content, which `memory_scope.md` prohibits.

**Disposition 2026-07-30:**

- **Provisional citation applied** to the memory file: authority `documentation/architecture/DESIGN_PRINCIPLE_REALITY_VS_GAMEPLAY.md` (four sections in one line per §5 rule 4). The path is `architecture/`, not `foundation/` as the ORDER 035 wording implies. Provisional flag references the ORDER 034 §8.1 unresolved-placement finding.
- **Reduction recommendation (report only, not applied per §6):** yes, the memory file should eventually be reduced to a pointer. Its `**Rule:**` paragraph (line 7) and `**Priority ladder**` block (lines 9–13) restate design content already carried by the authority doc — `memory_scope.md` prohibits this. The `**How to apply:**` block (lines 17–23) is operational workflow and belongs in memory. Recommended reduction: delete the Rule paragraph and the Priority ladder; keep the frontmatter, Why, How to apply, Not to confuse with, and the new citation block. Estimated file size change: 26 → ~18 lines.
- **Not reduced** per §6 (memory rule content rewriting beyond named corrections). Vision Owner decision required.
- **§7.1 transition: under §3** until the authority-doc placement is resolved *and* the reduction is either applied or declined.

### 4.5 `feedback_transform_frame_convention.md` — home needed

Cites ORDER 020, which exists only as a report. A report records findings; it does not govern.

The transform frame convention — projection, sign convention, polygon winding — is load-bearing engineering. Propose `documentation/architecture/TRANSFORM_FRAME_CONVENTION.md`, derived from the report and from `scripts/parity-check.mjs`. Present the proposal; do not create the file.

Where the report is cited in the interim, cite it as **evidence, not authority**.

### 4.6 `feedback_visual_validation_authoritative.md` — home needed

The principle that visual validation outranks code audit has no repository home and is one of the most consequential rules the project holds.

It may already be embodied in `PHASE_IV_PRODUCTION_PLAN.md` and `VISION_REVIEW_WORKFLOW.md`, whose acceptance criterion is *"does this look like Grythyttan?"* rather than *"does the validator pass?"* Report whether either states it sufficiently for citation. If neither does, propose where it should live.

### 4.7 `memory_scope.md` — retire or reduce

ADR 002 §7 now governs the same question from the repository. Reduce this file to a pointer at §7, or retire it. Report which, with reasoning, and report any rule it contains that §7 does not cover — such a rule needs a repository home, not deletion.

### 4.8 `nexus_framework_governance.md` — resolve dangling reference

The only file passing §7.1. It cites `NEXUS_GAMEPLAY_FRAMEWORK.md` v2.0 correctly.

It also references a *"Director's Addendum issued after Order 001"* matching no file. Establish whether it exists under another name, was never written, or is the same instrument as something now in the tree. If unrecoverable, mark it so rather than removing it — a lost instrument is a fact worth keeping. Cross-reference §2.1, since ORDER 001 and SD-001 may be related gaps.

### 4.9 `production_mode_no_optional_diagnostics.md` — home needed

Cites ORDER 005. Await §2.2, then cite whatever document is found to carry the rule, or propose a home.

### 4.10 `production_mode_workflow.md` — home needed, last

Cites ORDER 004 and 005. Same treatment as §4.9.

This file governs how production is actually run. It is the strongest argument for §3 and must be dispositioned last.

### 4.11 `feedback_manifest_read_evidence.md` — cite (repository home established under ORDER 036 §4)

New file created 2026-07-29 under ORDER 036 §4 to capture the evidence rule for `reviewState = "read"`. The rule's authority is `documentation/references/README.md` §"Evidence rule for `read`" (added by the same order, commit `e29d354`). Add the citation using the ORDER 035 §5 format once approved. No transition-period gap: this file was created after ADR 002 §7 was Accepted and its home landed in the same commit series, so §7.1 applies immediately.

---

## 5. Citation format

Every surviving memory rule carries a citation in a consistent form: repository path, section, and whether the cited document is authority or evidence.

**Approved 2026-07-30.** Each rule carries one citation block appended to its body, after any `**Why:**` and `**How to apply:**` lines. Block shape:

```markdown
**Rule:** <rule name — required only when the file carries more than one rule>

**Repository home (authority):** `path/to/document.md` §"Section title" — one-sentence
statement of what that section authoritatively defines relative to this rule.
Multiple sections in the same document may be listed on one line
(e.g. §"Section A" + §"Section B" — combined statement).

**Related evidence (not authority):** `path/to/report.md` — one-sentence statement of
what the report demonstrates that supports (but does not establish) the rule.
(Optional. Omit if none. Multiple evidence lines allowed.)
```

**Rules for filling it in:**

1. **One `Repository home (authority)` block per rule, not per file.** Files that carry more than one rule get one block per rule, with the rule named at the top of the block via the `Rule:` line. Files that carry exactly one rule may omit the `Rule:` line.
2. If a rule has no authority anywhere in the repository, it is not eligible for `read`-state promotion under ADR 002 §7.1 — it stays under §3 transition until a home is proposed in §4 or a home is created and cited.
3. Zero or more `Related evidence (not authority)` lines. Reports are evidence, not authority, per ORDER 035 §4.5.
4. Paths are repository-root-relative posix paths. Section names are quoted verbatim from the target document's heading. Multiple section names in the same document may be combined on one line rather than repeating the path.
5. A memory file is never a valid authority — cite the underlying repository document instead. If no such document exists, propose a home in §4.

---

## 6. What this order does not authorise

- Writing `SUPERSEDING_DIRECTIVE_001.md` **except** as authorised by §2.4 — only after the §2.1 record is reviewed, in a separate commit, under the mandatory reconstruction markings §2.4 specifies. §2.1 by itself produces only the reconstruction record.
- Amending `ADR_001_DIGITAL_TWIN_PHASE.md` in any way.
- Creating the proposed documents in §4.3, §4.5, §4.6. Each requires Vision Owner approval.
- Deleting any memory file.
- Rewriting memory rule content beyond the corrections named in §4 and in ADR 002 §9.1.
- Any change under `frontend/`, `backend/`, `database/`, `ai/`, `scripts/` or `testing/`.
- Any change to `DESIGN_PRINCIPLE_REALITY_VS_GAMEPLAY.md`.
- Treating any reconstruction as carrying original authority.

---

## 7. Referred to the Vision Owner

**Governance instruments were issued that were never written down.** At least five, at two levels: four sprint orders, and one Superseding Directive on which the entire Digital Twin Phase rests.

The work itself is sound — the decisions were made, executed, and validated. But the record of the decisions exists only in chat logs. The order registry addresses discovery. It does not address the practice that produced the gap.

Two decisions follow:

1. **Should a real `SUPERSEDING_DIRECTIVE_001.md` be authored** from the §2.1 record, retroactively dated and explicitly marked as reconstructed? The alternative is to leave ADR 001 citing an unreadable authority, which is honest but leaves a load-bearing gap.
2. **Should every order be written to `documentation/architecture/` before execution?** This would prevent recurrence but adds friction to fast production cycles.

Neither is an implementation question.

---

## 8. Acceptance criteria

- `SD_001_RECONSTRUCTION_RECORD.md` exists, distinguishes known from inferred from unrecoverable, and states in its header that it carries no authority.
- `ORDER_RECONSTRUCTION_004_005_019_020.md` exists on the same terms.
- `ORDER_REGISTRY.md` cites both and records SD-001 as a governance gap.
- `SUPERSEDING_DIRECTIVE_001.md` has **not** been created.
- `ADR_001_DIGITAL_TWIN_PHASE.md` is unmodified.
- `MEMORY.md` hooks match their files.
- The `≥ 90 %` bar in `digital_twin_hot_reload_workflow.md` is corrected and cites ADR 002.
- `feedback_reality_vs_gameplay_principle.md` cites its authority, marked provisional.
- Proposals for §4.3, §4.5, §4.6 presented and unimplemented.
- `memory_scope.md` disposition reported with reasoning.
- The Director's Addendum reference is resolved or marked unrecoverable.
- A citation format is proposed.
- Every memory file's §7.1 transition status is stated.
- No memory file deleted. No repository document created beyond the two reconstruction records.
- `npm run typecheck` and `npm run build` green.

---

**End of ORDER 035.**
