# District Production Tracker

**Status:** Living dashboard for Phase IV.
**Last updated:** 2026-07-25 (ORDER 024).
**Refresh:** Update the status column when a district changes state. Verdicts and commit hashes belong in the district's `REVIEWS.md`.

## Status legend

| Symbol | Status | Meaning |
|--------|--------|---------|
| ⬜ | Not Started | No production cycle opened |
| 🟡 | In Progress | Production commits landing |
| 🟠 | Awaiting Review | Ready for Vision Owner visual pass |
| 🟢 | Approved | Vision Owner accepted; no Critical / High defects |
| ❄️ | Frozen | Approved + docs updated + validators green + freeze commit landed |
| 🔴 | Blocked | Waiting on external evidence or design decision |
| 🟣 | Approximate | Landing at approximate-tier confidence (documented in `KNOWN_ISSUES.md`) |
| 📍 | Landmark Pending | Landmark-tier reconstruction outstanding |

## Districts

| ID | Label | Buildings | Landmarks | Status | Notes |
|----|-------|-----------|-----------|--------|-------|
| **D03** | Torget | 14 | 2 | ⬜ | Recommended first district — small footprint, high recognition density |
| **D04** | Church | 3 | 1 | ⬜ | Kyrkan handcrafted (ORDER 003); mostly frozen at data level |
| **D02** | Campus | 2 | 2 | ⬜ | Kärnhuset + Måltidens Hus handcrafted; Kantin marker |
| **D06** | School | 48 | 2 | ⬜ | 9 D2-handcrafted school buildings; residential grid around |
| **D05** | Station | 10 | 1 | ⬜ | 6 D2-handcrafted station corridor buildings |
| **D08** | Hälleforsvägen Corridor | 20 | 3 | ⬜ | INGO + Pizzans handcrafted; Rv 244 curvature deferred |
| **D09** | Prästgatan Corridor | 24 | 0 | ⬜ | Connects Torget → Rv 244 T-junction |
| **D01** | Historic Centre | 3 | 1 | ⬜ | Prästgatan chain west of Torget |
| **D10** | Residential North | 18 | 1 | ⬜ | Bergslagshus AB DIY shop |
| **D11** | Residential South | 5 | 0 | ⬜ | Small — mostly Rv 205 side |
| **D13** | Residential West | 3 | 1 | ⬜ | Tempo grocery |
| **D12** | Residential East | 6 | 1 | ⬜ | Herrgården Grythyttan |
| **D07** | Industrial Area | 13 | 0 | ⬜ | Swedecote + Länsmansgården adjacent |
| **D14** | Lakeshore | 26 | 0 | ⬜ | Torrvarpen shoreline scatter |
| **D15** | Forest Edge | 80 | 3 | ⬜ | Outlying rural buildings; lowest priority |

## Roll-up totals

- **Districts:** 15
- **Total objects assigned:** 655 (buildings 274, roads 327, landmarks 18, water 6, forest 15, residential 12, grass 2, graveyards 1)
- **100 % coverage:** every world entity belongs to exactly one district (`node scripts/district-assign.mjs` asserts this on every run)
- **Districts Approved / Frozen:** 0 / 0
- **Estimated Vision Owner engagement remaining:** ~42 h (2–3 h per district average)

## Regeneration

- Assignment: `node scripts/district-assign.mjs`
- Per-district READMEs: `node scripts/district-readme.mjs`
- Inventory counts here: manually maintained during the first pass; a future script may automate.

## Freeze log

_(Empty. Populated as districts reach ❄️ Frozen status. Each entry cites the freeze commit hash and the ORDER that produced it.)_

| Date | District | Freeze commit | ORDER | Reviewer |
|------|----------|---------------|-------|----------|

## Blocker log

_(Districts marked 🔴 Blocked must list their blocker here with an owner + expected resolution date.)_

| District | Blocker | Owner | Expected resolution |
|----------|---------|-------|---------------------|

---

*Author: Claude Code, ORDER 024 auto-mode. Update this table alongside the district's `REVIEWS.md` — never let the two disagree.*
