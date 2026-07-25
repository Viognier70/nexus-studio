# Phase IV — District-by-District Digital Twin Production

**Status:** Framework prepared (ORDER 024).
**Owner:** Vision Owner (visual authority) + Claude Code (execution).
**Frozen prerequisites:** World Alignment v1.0 (ORDER 020), procedural facade fidelity (ORDER 021A), engineering infrastructure (ORDER 023).

Phase IV is the first ORDER cycle where the acceptance criterion is **"does this look like Grythyttan?"** and no longer **"does the validator pass?"**. Validators remain a necessary guard but are not sufficient for approval.

## Working model

The village is reconstructed **district by district**. 15 districts have been defined (see `DISTRICT_PRODUCTION_TRACKER.md`). Each district goes through this cycle:

```
Not Started
    → In Progress            (production tasks logged in TASKS.md)
    → Awaiting Review        (Vision Owner sees rendered scene)
    → Approved               (visual pass, no Critical/High defects)
    → Frozen                 (no further edits without a verified defect)
```

A single district is the atomic unit of production. Never merge a partial district into `main` history; every district commit set is either complete-to-Approved or documented in `KNOWN_ISSUES.md` as an intentional pause.

## Recommended first district

**D03 Torget** — 14 buildings + 5 roads + 2 landmarks (Torget plaza, Glass & Choklad). Small footprint, highest recognition density, best test bed for the whole pipeline (docs → review → freeze). Once D03 flows cleanly, the same pipeline runs unchanged for the other 14.

Suggested order after D03:
1. **D04 Church** (small, highest recognition)
2. **D02 Campus** (already 90 % handcrafted)
3. **D06 School** (D2 handcrafted set)
4. **D05 Station** (D2 handcrafted set)
5. **D08 Hälleforsvägen Corridor** (the through-road, high impact on all views)
6. **D09 Prästgatan Corridor** (connects Torget to Rv 244)
7. **D01 Historic Centre** (Prästgatan chain west of Torget)
8. **D10 Residential North**
9. **D11 Residential South**
10. **D13 Residential West** (contains Tempo landmark)
11. **D12 Residential East** (contains Herrgården)
12. **D07 Industrial Area**
13. **D14 Lakeshore**
14. **D15 Forest Edge** (outlying rural — lowest priority)

## What one district cycle looks like

For each district `Dxx`:

**1 · Pre-review sweep (Claude Code, 10 min)**
- `node scripts/district-assign.mjs && node scripts/district-readme.mjs`
- Confirm the district README inventory matches expectations.
- Cross-check `KNOWN_ISSUES.md` and `TASKS.md`.

**2 · Vision Owner review (5–15 min)**
- Open `reports/shadow-map/<zone>.svg` for the district's zone.
- Compare with the equivalent Google Maps region.
- Load localhost, use the district's recommended camera positions from `documentation/districts/<id>/README.md`.
- Walk the review checklist from `VISION_REVIEW_WORKFLOW.md`.
- Record findings under `REVIEWS.md`.

**3 · Correction (Claude Code, variable)**
- Fix each Critical / High defect systemically. Prefer edits to shared systems (procedural building parameters, road classification, landmark records) over per-object patches.
- After each fix: `npm run typecheck && npm run build && node scripts/validate-world.mjs && node scripts/parity-check.mjs`.
- Commit per subsystem, not per file.

**4 · Re-review (Vision Owner)**
- Repeat step 2 with only the defects flagged in step 2.

**5 · Freeze (Vision Owner sign-off)**
- Follow `DISTRICT_FREEZE_GUIDE.md`.

## Rules for Phase IV

- Never move a building visually to "fix composition". Fix the coordinate chain that placed it wrong.
- Never redesign a landmark that has already been Vision-Owner-approved.
- Never re-open ORDER 020 alignment without a parity-check regression proving a verified defect.
- Every new decorative element must be documented in `APPROXIMATION_REGISTER.md`.
- Every derived geometry layer must cite the control points that authorise it.
- The five spec docs (this file, `DISTRICT_PRODUCTION_TRACKER.md`, `DISTRICT_FREEZE_GUIDE.md`, `VISION_REVIEW_WORKFLOW.md`, `LANDMARK_PROGRAM.md`) are the source of truth for Phase IV. Update them alongside production, not after.

## Estimated work remaining

Assuming the D03 pipeline settles in one cycle (~2 h Claude + ~1 h Vision Owner review + fix + re-review + freeze):
- 14 remaining districts × ~3 h each = ~42 h Vision Owner engagement.
- ~2 × that in Claude Code execution.

Districts vary widely — D14 Lakeshore and D15 Forest Edge should each take under an hour; D01 Historic Centre and D08 Hälleforsvägen may take double.

## Deliverables

Every completed district produces:
- Frozen `README.md` + companion files under `documentation/districts/<id>/`
- Approved commit set on `feature/strategic-camera`
- Freeze record in `DISTRICT_PRODUCTION_TRACKER.md`
- Screenshots (Vision Owner supplied) archived under `reports/reviews/<id>/`

---

*Author: Claude Code, ORDER 024 auto-mode.*
