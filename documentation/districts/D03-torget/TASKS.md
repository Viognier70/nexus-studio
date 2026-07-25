# Outstanding tasks — D03 Torget

_ORDER 026 pre-review sweep — pre-populated. Vision Owner adds/removes rows during / after the visual pass._

## Before Vision Owner review (Claude Code, done)

- [x] Refresh metadata (`district-assign` + `metadata-engine` + `knowledge-graph` + `district-readme`).
- [x] Confirm parity-check green (10/10 controls at 0.00 m drift).
- [x] Confirm validate-world green (0 Critical / 0 High / 0 Medium / 0 Low / 17 Info).
- [x] Populate `KNOWN_ISSUES.md` with candidate defects (12 rows).
- [x] Update `DISTRICT_PRODUCTION_TRACKER.md` D03 status to 🟠 Awaiting Review.
- [x] Add camera-preset suggestions to `README.md`.

## During Vision Owner review

- [ ] Open `reports/shadow-map/centre.svg` — matches Google Maps screenshot 8 area at world centre.
- [ ] Open `localhost:5173` (or `5174`) — dev server running.
- [ ] Load camera presets in `README.md` §Recommended camera positions and walk each.
- [ ] Walk `VISION_REVIEW_WORKFLOW.md` §Review checklist (7 sections).
- [ ] Reclassify each row in `KNOWN_ISSUES.md` from ⚪ Candidate into Critical / High / Medium / Low / Not-a-defect.
- [ ] Add any new defects the checklist surfaces.
- [ ] Record verdict in `REVIEWS.md`.

## After Vision Owner review (Claude Code)

_Populated after verdict:_

- [ ] Fix each Critical / High defect systemically.
- [ ] Re-run validator suite; confirm no regression.
- [ ] Re-request review.

## Freeze prerequisites (from `DISTRICT_FREEZE_GUIDE.md`)

- [ ] Vision Owner writes `Approved for Freeze` verdict in `REVIEWS.md`.
- [ ] No 🔴 Critical or 🟠 High rows remaining in `KNOWN_ISSUES.md`.
- [ ] `parity-check` + `validate-world` green.
- [ ] `typecheck` + `build` clean.
- [ ] `README.md` inventory idempotent under `district-assign + district-readme` regeneration.
- [ ] Every derived correction cited in `APPROXIMATION_REGISTER.md`.
- [ ] Companion files complete.
- [ ] Freeze commit landed following the template in `DISTRICT_FREEZE_GUIDE.md`.
