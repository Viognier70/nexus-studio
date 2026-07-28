# ORDER 034 — Documentation Alignment

**Version:** 1.0
**Status:** Awaiting Vision Owner approval. Not in force until approved.
**Class:** Sprint order — documentation only (precedence level 7)
**Parent:** `SUPERSEDING_DIRECTIVE_002.md`
**Governing:** `ADR_001_DIGITAL_TWIN_PHASE.md` §4
**Recipient:** Claude Code
**Voids:** the drafts numbered ORDER 020 and ORDER 030, both of which collided with existing orders and are withdrawn.

---

## 0. Number verification — do this first

Two previous drafts of this order collided with orders already in the tree. The cause is that no register of issued ORDER numbers exists.

**Before executing anything below:**

1. Establish the highest ORDER number in use. Search filenames, document headers, status lines and change-log entries across the whole repository, not only `documentation/`.
2. If any ORDER 034 already exists, **stop and report**. Do not renumber this order yourself.
3. Create `documentation/architecture/ORDER_REGISTRY.md`: a single table of every ORDER number found, its title, its date, its status, and the file that carries it. Include orders whose only trace is a status line or a change-log entry.
4. Add a line to `CLAUDE.md`: no ORDER number is issued without an entry in the registry.

The registry is the first deliverable. Everything else waits on it.

---

## 1. Purpose

`SUPERSEDING_DIRECTIVE_002.md` records Vision Owner decisions A, C and D. This order performs the documentation work that follows, plus the repairs identified by the ORDER 033 documentation audit.

Documentation only. No source file is touched.

---

## 2. Extract the rights checkpoint — before any archival

`MALTIDENS_HUS_EDUCATIONAL_ARCHITECTURE.md` cites `05_SEVILLA_PAVILION.md` as the project's rights checkpoint. That is the only rights instrument recorded anywhere in `documentation/`.

**Before §4 moves anything:**

1. Create `documentation/foundation/RIGHTS_REGISTER.md`.
2. Carry across, verbatim and attributed, the rights checkpoint language from `05_SEVILLA_PAVILION.md`.
3. Carry across every rights, legal, GDPR and content-rating item from `WP02_REVIEW_REPORT.md` §4, marked as open.
4. Add `MALTIDENS_HUS_EDUCATIONAL_ARCHITECTURE.md` MQ-05 (faculty and guest-chef likeness) as an open item.
5. Add one row per real named entity currently rendered in the world — landmark, institution or commercial premise — with its OSM or reference source and a blank clearance column.

The register is a **stub with open items**, not a legal opinion. Do not assess, conclude or recommend on any item. Marking an item as cleared requires a Vision Owner entry.

Repoint `MALTIDENS_HUS_EDUCATIONAL_ARCHITECTURE.md` MQ-05 at the new register.

---

## 3. Repair source-of-truth pointers — before any archival

`VERTICAL_SLICE_001.md` names `01_THE_ORIGIN.md`, `02_FIRST_ARRIVAL.md` and `05_SEVILLA_PAVILION.md` as its source of truth. VS-001 remains committed and reachable per `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §13.

For `VERTICAL_SLICE_001.md`, `VERTICAL_SLICE_002.md` and `WP02_REVIEW_REPORT.md`: update every path that §4 will move, so it points into `documentation/archive/world-wp02/`, and add a note that the cited document is historical.

Do not otherwise edit these three files.

---

## 4. Archival — named files only

Move these ten from `documentation/world/` to `documentation/archive/world-wp02/`:

`01_THE_ORIGIN.md`, `02_FIRST_ARRIVAL.md`, `03_GRYTHYTTAN.md`, `04_CAMPUS_GRYTHYTTAN.md`, `05_SEVILLA_PAVILION.md`, `06_TRADITIONS_AND_CEREMONIES.md`, `07_THE_INITIATION.md`, `08_FIRST_HOUR_PLAYER_JOURNEY.md`, `09_NPC_AND_PLAYER_GROUPS.md`, `10_WP02_REVIEW_AND_HANDOFF.md`

Move `WP02_REVIEW_REPORT.md` to the same folder — it reviews that corpus.

Header for each:

```
**Status:** Historical — superseded. Retained for tone, narrative and cultural reference.
Not an active specification. Superseded by SUPERSEDING_DIRECTIVE_002 (avatar) and by
EXECUTIVE_DESIGN_DIRECTIVE_001 §12 (authenticity). Rights items extracted to
documentation/foundation/RIGHTS_REGISTER.md.
```

### 4.1 Do not touch

`documentation/world/APPROXIMATION_REGISTER.md` stays where it is. `ADR_001_DIGITAL_TWIN_PHASE.md` §5.2 designates that exact path as canonical. Do not move, rename or head it.

### 4.2 Nothing is deleted

Archival is `git mv`. The only deletion this order authorises is §6.4.

---

## 5. Status-header repairs

The audit found several documents whose own headers contradict their governance status.

| File | Header says | Should say |
|---|---|---|
| `CAMERA_AND_VIEW_SYSTEM.md` | Draft | Superseded as a design specification by `CAMERA_AND_GAMEPLAY_BIBLE.md`. Retained only for the strategic camera coordinate reference cited by `REVIEW_PACKAGE_ORDER_029.md`. Do not cite for design intent. |
| `VERTICAL_SLICE_002.md` | Draft | Paused per `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §13. Historical reference. Not authoritative, not extended. |
| `RUNTIME_RENDER_CATALOG.md` | internal reference | Superseded by `PLACE_CHARACTER_REPORT.md` |
| `RECOGNISABILITY_SURVEY.md` | field survey | Superseded by `PLACE_CHARACTER_REPORT.md` |

Also repoint `STREET_PROFILE_CATALOGUE.md`, which still names `RECOGNISABILITY_SURVEY.md` as a companion, at `PLACE_CHARACTER_REPORT.md`.

**Do not archive `CAMERA_AND_VIEW_SYSTEM.md`.** `DESIGN_DECISIONS_001.md` M-06 recommends it, but ORDER 029 cites it operationally. Archival follows once that reference has moved.

---

## 6. ORDER 100

1. Convert `documentation/foundation/NEXUS_STUDIO_GAME_DESIGN_CONSTITUTION.md` to true markdown. It carries a `.md` extension but is a Word `.docx` binary, invisible to diff, grep and CI.
2. Place at `documentation/foundation/vision/ORDER_100_VISION.md`.
3. Add the status header from `SUPERSEDING_DIRECTIVE_002.md` §3: vision reference, outside the precedence order, no binding force.
4. Delete `documentation/foundation/~$XUS_STUDIO_GAME_DESIGN_CONSTITUTION.md.docx` — a 162-byte Word lock file committed by accident.
5. Add `~$*` to `.gitignore`.

---

## 7. Proposed diffs — present, do not land

`CLAUDE.md` rule 4 applies. Produce each diff and stop.

| # | Document | Change |
|---|---|---|
| 7.1 | `CAMERA_AND_GAMEPLAY_BIBLE.md` §14 | Widen the avatar non-goal per `SUPERSEDING_DIRECTIVE_002.md` §2.1 |
| 7.2 | `CAMERA_AND_GAMEPLAY_BIBLE.md` §3–4 | Add the opening camera movement per `SUPERSEDING_DIRECTIVE_002.md` §2.4, as intent only |
| 7.3 | `MALTIDENS_HUS_EDUCATIONAL_ARCHITECTURE.md` §8 | Remove the avatar-presence sentence. Mark MQ-04 dissolved. Remove `04`, `05`, `09` from Companions |
| 7.4 | `MALTIDENS_HUS_EDUCATIONAL_ARCHITECTURE.md` §2, §4 | Restate the five spaces as zoom-reachable interiors. No loop may presume locomotion |
| 7.5 | `GRYTHYTTAN_WORLD_SPECIFICATION.md` §9 | Header note: all five clauses superseded by `ADR_001_DIGITAL_TWIN_PHASE.md` §3. Text preserved |

---

## 8. Reporting tasks — no changes

1. **`DESIGN_PRINCIPLE_REALITY_VS_GAMEPLAY.md`.** It carries status *"CANONICAL — supersedes conflicting rules"*, is parent directive to four documents, and is named as canonical priority by `VISION_REVIEW_WORKFLOW.md` — but states no level in the `ADR_001_DIGITAL_TWIN_PHASE.md` §4 precedence order and names no specific rule it supersedes. Report: which level it should occupy, which rules it conflicts with, and whether any of those sit above it. Propose nothing; report only.

2. **Unplaced architecture documents.** 57 files under `documentation/architecture/`, most with no stated precedence level. Group them: ADR, living process, auto-generated, order report, reference. Report which groups need explicit placement.

3. **Auto-generated documents.** Several are produced by `scripts/*.mjs` and carry do-not-hand-edit headers. Report which, and whether their generators are covered by the precedence order at all.

4. **Forward-declared successors.** `DESIGN_DECISIONS_002.md`, `EXECUTIVE_DESIGN_DIRECTIVE_002.md`, `SUSTAINABILITY_AND_CAPITALS.md` and `KNOWLEDGE_ENGINE.md` are cited but do not exist. Note that `SUPERSEDING_DIRECTIVE_002.md` is **not** `EXECUTIVE_DESIGN_DIRECTIVE_002.md`; that slot remains open.

5. **`documentation/blueprints/`** is empty apart from `.gitkeep` despite being named in `CLAUDE.md`. Report whether it should be populated or removed from the guide.

6. **Companion integrity.** After §4, list every active document still naming an archived file.

---

## 9. What this order does not authorise

- Any change under `frontend/`, `backend/`, `database/`, `ai/`, `scripts/` or `testing/`.
- Implementation of the opening camera movement.
- Implementation of the Rv 244 curvature layer — already authorised by `ADR_001_DIGITAL_TWIN_PHASE.md` §2.2, but it needs its own production order.
- Any change to `DESIGN_DECISIONS_001.md`, `EXECUTIVE_DESIGN_DIRECTIVE_001.md` or `NEXUS_GAMEPLAY_FRAMEWORK.md`.
- Any change to `DESIGN_PRINCIPLE_REALITY_VS_GAMEPLAY.md` — report only.
- Landing any diff from §7.
- Any legal assessment or clearance conclusion in the rights register.
- Any deletion except §6.4.
- Any change to living-world systems, OSM ingest, road roles, traffic, validators or camera code.
- District production work. Phase IV continues on its own track.

---

## 10. Referred to the Vision Owner

The rights register created by §2 is a container with open items. Filling it is not orderable work.

`WP02_REVIEW_REPORT.md` recommendation 5 called for a formal legal register covering the village, the campus institution, the church, the municipality and the named traditions, plus a decision on tobacco and alcohol depiction. It is unanswered, and since it was written the world has grown to 23 named landmarks including operating commercial premises.

This requires the Vision Owner and, in the author's view, competent legal advice.

---

## 11. Acceptance criteria

- `ORDER_REGISTRY.md` exists and lists every ORDER number found anywhere in the repository.
- `CLAUDE.md` requires registry entry before an ORDER number is issued.
- `RIGHTS_REGISTER.md` exists, carries the extracted checkpoint and every open item, and contains no assessment or conclusion.
- `VERTICAL_SLICE_001.md`, `VERTICAL_SLICE_002.md` and `WP02_REVIEW_REPORT.md` resolve every path they cite.
- The ten named files and `WP02_REVIEW_REPORT.md` are under `documentation/archive/world-wp02/` with the §4 header.
- `documentation/world/APPROXIMATION_REGISTER.md` is unmoved and unmodified.
- Every status header in §5 is corrected. `CAMERA_AND_VIEW_SYSTEM.md` is still in place.
- ORDER 100 is readable markdown at `documentation/foundation/vision/` and returns `grep` matches.
- Nothing deleted except the Word lock file.
- The five diffs in §7 are presented and unlanded.
- The six reports in §8 are delivered.
- `npm run typecheck` and `npm run build` green — no source file changed.
- One commit per section, `docs:` prefix, no squash.

---

**End of ORDER 034.**
