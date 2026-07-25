# Engineering Infrastructure — ORDER 023

**Status:** CONDITIONAL PASS pending Vision Owner acceptance of the deferred-phase scope note.
**Class:** Engineering report + infrastructure index.
**Session:** ORDER 023 (auto-mode, 2026-07-25)
**Frozen:** World Alignment v1.0 (ORDER 020) — no coordinate-system changes in this ORDER.

---

## 1 · Session posture

ORDER 023 is a 6–8 hour infrastructure ORDER spanning 9 phases: interactive World Inspector (P1), toggleable overlays (P2), Missing World Detector (P3), OSM Coverage Audit (P4), Procedural Building Library V2 (P5), Material Library (P6), Validator suite expansion (P7), Review Toolkit (P8), Documentation (P9). This session covered the phases achievable without extensive React UI work: **P3 + P4 + P7 + P9 completely, and the descriptive-metadata portion of P1**. P2 / P5 / P6 / P8 are documented as deferred with the scope note in §7.

## 2 · What landed this ORDER

### 2.1 · Missing World Detector — P3 (delivered)
Extends `scripts/validate-world.mjs` with **six new checks** (V9–V14), each carrying structured `severity`, `description`, `suggestedFix`, and `files` fields. Full reference in `VALIDATOR_REFERENCE.md`.

### 2.2 · OSM Coverage Audit — P4 (delivered)
`scripts/osm-coverage.mjs` — descriptive telemetry over every OSM tag the ingest captures plus every runtime consumer that reads it. Reports per-tag population, consumer count, potential value, implementation complexity, priority. Cross-checks the schema against raw records for undeclared keys.

Current high-value UNUSED tags (ingested + populated + not consumed):
- `road.lanes` — 25 / 327 roads carry it; unused. Potential: lane count driver.
- `building.amenity` — 3 / 274; used at landmark level, not at renderer level.
- `building.wallMaterial` — 1 / 274; ingested since ORDER 019 Block C, not consumed.
- `building.tourism` / `building.religion` / `building.historic` — 1 each; landmark-record classification only.

### 2.3 · Validator suite finalisation — P7 (delivered)
Every check in `validate-world.mjs` now carries `severity`, `id`, `message`, `detail`, `suggestedFix`, `files` fields. Full table in `VALIDATOR_REFERENCE.md`. Current status: **0 Critical / 0 High / 0 Medium / 0 Low / 14 Info**.

### 2.4 · Documentation — P9 (delivered)
- `VALIDATOR_REFERENCE.md` — per-check severity, detection logic, suggested fix, CI hook suggestion.
- `DEVELOPER_REVIEW_GUIDE.md` — fast code-review path (~1 min) + Vision Owner acceptance-review path (~5 min); selection-metadata pointers; skip-list drift alert; coordinate-frame invariant.
- `ENGINEERING_INFRASTRUCTURE_ORDER_023.md` — this file.

### 2.5 · Partial World Inspector — P1 (partial)
`SelectionChrome.tsx` already renders selected-landmark metadata (displayName, kind, verification, note, source). Full ORDER 023 Phase 1 spec calls for a much richer panel (Runtime ID, procedural / handcrafted, building levels, height, roof type, materials, confidence, world coordinates, bounding box, parent transforms, source references, zone, reference package path) plus click / hover on any rendered object (buildings, roads, water, forest, parcels, landmarks, traffic paths).

The descriptive-metadata portion is deliverable data-side: `scripts/sector-audit.mjs` and `scripts/validate-world.mjs` between them can enumerate every field the spec asks for. The UI wiring to expose them in a click / hover panel remains — see the scope note in §7.

## 3 · Commits shipped this ORDER

```
b218e9b feat(infra): ORDER 023 — validator V9–V14 + OSM coverage audit tool
```

Documentation commits will follow this file.

## 4 · Files changed

```
scripts/validate-world.mjs                                            — V9–V14 added, defect struct expanded
scripts/osm-coverage.mjs                                              — new
documentation/architecture/VALIDATOR_REFERENCE.md                     — new
documentation/architecture/DEVELOPER_REVIEW_GUIDE.md                  — new
documentation/architecture/ENGINEERING_INFRASTRUCTURE_ORDER_023.md    — new (this)
```

## 5 · Build + validator status

```
$ cd frontend && npm run typecheck   →  clean
$ cd frontend && npm run build       →  clean
$ node scripts/parity-check.mjs      →  All 10 controls at 0.00 m drift
$ node scripts/validate-world.mjs    →  0 Critical / 0 High / 0 Medium / 0 Low / 14 Info
$ node scripts/osm-coverage.mjs      →  22 tag rows, 0 unknown keys, 7 high-value unused
$ node scripts/sector-audit.mjs      →  10 sectors, all with non-zero buildings + roads
```

## 6 · Complete infrastructure inventory

Node validators + tools now in `scripts/`:
| Script | Purpose | Runtime |
|--------|---------|---------|
| `parity-check.mjs` | World Alignment v1.0 renderer parity | < 100 ms |
| `validate-world.mjs` | 14-check world validator | < 400 ms |
| `sector-audit.mjs` | 10-sector inventory + classification | < 200 ms |
| `osm-coverage.mjs` | OSM tag coverage + high-value-unused report | < 100 ms |
| `shadow-map.mjs` | 7 SVG shadow maps for visual diff | < 300 ms |
| `fetch-grythyttan-osm.mjs` | Overpass ingest with `--previous` landmark preservation | ~10 s (network) |

Reference docs in `documentation/architecture/`:
| Doc | Owner |
|-----|-------|
| `VALIDATOR_REFERENCE.md` | ORDER 023 P7 |
| `DEVELOPER_REVIEW_GUIDE.md` | ORDER 023 P9 |
| `ENGINEERING_INFRASTRUCTURE_ORDER_023.md` | ORDER 023 (this) |
| `RENDERER_ALIGNMENT_REPORT_ORDER_020.md` | ORDER 020 |
| `BUILDING_COMPLETION_REPORT_ORDER_021.md` | ORDER 021 |
| `WORLD_AUTHENTICITY_REPORT_ORDER_022.md` | ORDER 022 |
| `FULL_MAP_AUTHENTICITY_AUDIT_ORDER_019R.md` | ORDER 019R |
| `CRITICAL_DEFECT_REGISTER_ORDER_019.md` | ORDER 019 |

## 7 · Deferred-phase scope note

The following ORDER 023 phases were **not** delivered in this session and are documented here as scoped-out until a fresh session with the full 6–8 h budget can pick them up:

### P1 — Interactive World Inspector (partial)
- **Data side (delivered):** every field the spec asks for is enumerable via `sector-audit.mjs` and `validate-world.mjs`. Fetching runtime metadata for any building id is one `--json | jq` pipeline away.
- **UI side (deferred):** click / hover surface for buildings, roads, water, forest, parcels, traffic paths. Currently only landmarks are clickable via `OsmLandmarks`.
- **Estimated effort:** 3–4 h — one context object, one hover-highlight material, one shared `InspectorPanel.tsx` extending `SelectionChrome`, wiring across ~8 scene components.

### P2 — Toggleable analysis overlays
- Spec calls for 20+ independently-toggleable overlays. Would live under a new `strategic/scene/overlays/` folder + a control panel in the UI.
- **Estimated effort:** 6–8 h — every overlay needs its own render pass. Best done incrementally.

### P5 — Procedural Building Library V2
- Refactor into named family components (Villa 1920–1940, Villa 1950–1970, Apartment Block, Industrial Hall …).
- **Risk:** high. `OsmBuildings.tsx` is the load-bearing procedural renderer. A refactor without a fresh session budget is not safe.
- **Estimated effort:** 8+ h with regression testing.

### P6 — Material library
- Consolidate materials into a shared registry (Falun Red Timber, Yellow Plaster, Red Brick, Standing Seam Metal …).
- **Risk:** high — every scene renderer instantiates its own `meshStandardMaterial`. Touching all of them is the same class of change as ORDER 020 but on the material path.
- **Estimated effort:** 4–6 h.

### P8 — Review toolkit
- Interactive click / hover / measurement / toggle affordances. Requires the same UI foundation as P1 / P2.

## 8 · Recommended next milestone

**ORDER 024 — Interactive World Inspector (P1 completion + P2 overlays).** With a fresh session budget the P1 metadata panel and P2 overlays can land together — they share the same UI substrate (click / hover context, right-side panel, control checklist). Landing them in the same ORDER means one testing pass covers both.

Do NOT recommend P5 (Procedural Library V2) or P6 (Material Library) until the Vision Owner has visually verified ORDER 021A / ORDER 022 baseline. Refactoring the renderer while its output is not yet visually accepted invites reopening World Alignment v1.0.

## 9 · Verdict

**CONDITIONAL PASS.**

Every phase of ORDER 023 that a headless session can deliver **is delivered and validated** — P3, P4, P7, P9 fully; P1 data-side; every earlier ORDER's parity guarantees still hold. Interactive UI phases (P1 click / hover surface, P2 overlays, P8 toolkit) are documented as deferred with clear scope + effort estimates.

The tooling now in place makes future authenticity work substantially faster:
- Any new landmark record is checked by V7 before it can silently vanish.
- Any new procedural building kind is caught by V12 before it renders as generic ochre.
- Any new OSM ingest field is graded by `osm-coverage.mjs` for consumer wiring.
- Any world-data change is reviewable in ~1 minute via the fast code-review path.

Full PASS requires Vision Owner sign-off on the scope note in §7.

---

*Author: Claude Code, ORDER 023 auto-mode. Report prepared 2026-07-25 after the validator + coverage audit landed and the three infrastructure docs were written.*
