# District Freeze Guide

**Status:** Living process document.
**Owner:** Vision Owner (approval) + Claude Code (execution).
**Related:** `PHASE_IV_PRODUCTION_PLAN.md`, `DISTRICT_PRODUCTION_TRACKER.md`, `VISION_REVIEW_WORKFLOW.md`.

A **Frozen** district is one that the project agrees not to modify without evidence of a verified defect. Freezing a district is a formal act: it locks the current geometry, materials, procedural rules, and reference package for that district as canonical.

## Preconditions

A district can only be frozen once **all** of the following are true:

| # | Precondition | How to verify |
|---|--------------|---------------|
| 1 | Vision Owner has visually approved the district | `REVIEWS.md` carries a `Verdict: Approved` row for the current commit |
| 2 | No Critical defects remain | Latest `KNOWN_ISSUES.md` shows no severity 🔴 |
| 3 | No High defects remain | Latest `KNOWN_ISSUES.md` shows no severity 🟠 |
| 4 | Validators green | `node scripts/parity-check.mjs && node scripts/validate-world.mjs` at 0/0 Critical/High |
| 5 | Typecheck + build clean | `cd frontend && npm run typecheck && npm run build` |
| 6 | `README.md` inventory reflects current data | `node scripts/district-assign.mjs && node scripts/district-readme.mjs` idempotent |
| 7 | Every derived correction cited in `APPROXIMATION_REGISTER.md` | Manual check |
| 8 | Companion files complete | `TASKS.md` empty or only 🟣 Approximate / 📍 Landmark Pending items |

## Freeze workflow

**1 · Vision Owner writes the freeze verdict** in `documentation/districts/<id>/REVIEWS.md`:

```markdown
| 2026-08-01 | Vision Owner | Approved for Freeze | localhost + Google Maps side-by-side; six checkpoints pass |
```

**2 · Claude Code updates the district `README.md`** to reflect the freeze:

```markdown
**Freeze status:** ❄️ Frozen v1.0
**Freeze date:** 2026-08-01
**Freeze commit:** <hash>
**Reviewer:** Vision Owner
**Confidence:** HIGH
```

**3 · Claude Code updates `DISTRICT_PRODUCTION_TRACKER.md`** — status column to ❄️ + freeze-log table row + freeze commit hash.

**4 · Freeze commit** — a single commit containing only:
- The district's `README.md` freeze-status update.
- The `DISTRICT_PRODUCTION_TRACKER.md` row update.
- (Optional) closing entries in `TASKS.md` and `KNOWN_ISSUES.md`.

Commit message template:
```
freeze(<id>): district approved v1.0 — <label>

Vision Owner approved on <date> after <n> review cycles. Freeze
preconditions verified:
  - REVIEWS.md carries Approved verdict for commit <hash>
  - KNOWN_ISSUES.md: 0 Critical / 0 High
  - parity-check + validate-world: green
  - typecheck + build: clean
  - README.md inventory idempotent under district-assign +
    district-readme regeneration

Next unfrozen district: <id>.
```

**5 · District becomes read-only** for the rest of the project unless a verified defect reopens it.

## What "read-only" means

Frozen districts are not immutable — Phase IV is intended to be revisitable. But re-editing a Frozen district requires **all** of:

- A **new** entry in the district's `KNOWN_ISSUES.md` citing the verified defect (source view, reference, severity).
- A dated re-open note in `REVIEWS.md`.
- A new production cycle culminating in a new freeze (v1.1, v1.2, ...).
- The tracker's freeze-log preserves both freezes with a `superseded_by` link.

## What is NOT allowed after freeze

- Silently editing a Frozen district's buildings, roads, or landmarks.
- Global refactors (e.g. procedural library V2) that visually change a Frozen district without a re-freeze.
- Adjusting a Frozen district's camera presets to compensate for a defect — fix the defect and re-freeze.

## Freeze regression guard (future)

A future validator step (V15 candidate) should statically compare every Frozen district's inventory against its README, and fail with High if they drift. Once every district reaches ❄️ this becomes the primary "canonical set" guard.

---

*Author: Claude Code, ORDER 024 auto-mode.*
