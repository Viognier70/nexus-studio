# Superseding Directive 003

**Version:** 1.0  
**Status:** Awaiting Vision Owner approval. Not in force until approved and dated.  
**Class:** Directive-level instrument  
**Precedence:** Level 2 (per `ADR_001_DIGITAL_TWIN_PHASE.md` §4)  
**Modifies:** `SUPERSEDING_DIRECTIVE_002.md` §4  
**Records:** Vision Owner decision of 2026-07-30  

---

## 1. Why this instrument

`SUPERSEDING_DIRECTIVE_002.md` §4 states that no document authored by a given system is reviewed only by that system, and that the current reviewer is recorded in `CLAUDE.md`.

No reviewer was ever recorded. The project has one person. Independent human review is not available and will not become available by leaving the rule in place.

An unenforced rule in a binding directive is the exact defect this project spent 2026-07-29 correcting. `SUPERSEDING_DIRECTIVE_001` was cited as authority by `ADR_001_DIGITAL_TWIN_PHASE.md` and could not be read. Rules that everyone nods at and no one follows are worse than no rule, because they create the appearance of a check that does not exist.

This directive therefore replaces §4 with a rule that is enforceable, and states plainly what that rule does not cover.

---

## 2. Decision — review is by session, not by system

`SUPERSEDING_DIRECTIVE_002.md` §4 is replaced by the following.

### 2.1 The rule

**No document is reviewed by the session that authored it.**

A document authored in one session is reviewed by a different session before it is treated as settled. The reviewing session reads the document against the repository as it actually stands, not against the authoring session's account of it.

This applies to instruments, specifications, orders and audits. It does not apply to reports, which are records of work rather than statements of intent.

### 2.2 Why this is not a weaker rule

Session-boundary review found real defects on 2026-07-29, in the space of one working session:

- `ORDER_034_DOCUMENTATION_ALIGNMENT.md` §4 would have archived `05_SEVILLA_PAVILION.md` and with it the project's only recorded rights checkpoint. Caught before execution; §2 was added to extract the checkpoint first.
- §6.4 asserted the Word lock file had been committed by accident. It had never been tracked. The premise was false and the instruction would have failed.
- §7.5 referred to five prohibition clauses in `GRYTHYTTAN_WORLD_SPECIFICATION.md` §9. There are seven.
- §3 named five stale path references in `MALTIDENS_HUS_EDUCATIONAL_ARCHITECTURE.md`. There were seven, found by search rather than by enumeration.
- An instruction stating that certain reference images had been triaged "in this session" was contradicted rather than complied with, because the reviewing session had no record of a triage step. The correct evidence — `TRIAGE.md` in the repository — was then identified.

Each of those is a defect the authoring session did not see in its own work.

### 2.3 What this rule does not cover

**Session review finds inconsistencies. It does not find wrong premises.**

Every defect in §2.2 is of one kind: a statement that contradicts the repository, or a count that does not match. None of them questions whether the approach itself is right.

Nobody asked, on 2026-07-29, whether a seven-level precedence order is the correct instrument for a project with one person and two models. Whether an order registry, a rights register, a citation format and a transition period are proportionate to the work they govern. Whether parts of the governance apparatus exist because they catch real errors, or because they resemble what a larger project would have.

Those questions cannot be answered by a session reading a document against a repository. They require someone willing to ask whether the document should exist. That is the Vision Owner's, or another person's, and this directive does not pretend otherwise.

### 2.4 Consequence

Governance is added only where a specific failure has occurred or is concretely foreseen. Where an existing governance artefact has not caught a defect within a reasonable period, it is a candidate for removal rather than extension.

`documentation/blueprints/` is the worked example: named in `CLAUDE.md`, empty for ten days through the most document-intensive week of the project, and recommended for removal by `ORDER_034_DOCUMENTATION_ALIGNMENT.md` §8.5. Structure that goes unused is not neutral — it misleads readers and invites misfiling.

---

## 3. `CLAUDE.md`

The reviewer-recording requirement in `SUPERSEDING_DIRECTIVE_002.md` §4 is replaced. `CLAUDE.md` instead states the §2.1 rule directly, since it is a rule about how work is done rather than a fact about who is doing it.

---

## 4. What this directive does not do

- It does not modify `DESIGN_DECISIONS_001.md`. Constitutional change requires `DESIGN_DECISIONS_002.md`.
- It does not modify `NEXUS_GAMEPLAY_FRAMEWORK.md`, which remains frozen.
- It does not modify `SUPERSEDING_DIRECTIVE_002.md` §2 (no avatar) or §3 (ORDER 100 as vision reference). Those stand unchanged.
- It does not authorise any code.
- It does not remove any governance artefact. §2.4 states a principle; removals require their own instrument.
- It does not resolve the open decisions carried by `ORDER_035_MEMORY_PROVENANCE_REPAIR.md` §7.

---

**End of Superseding Directive 003.**
