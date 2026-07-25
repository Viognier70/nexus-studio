# Developer Review Guide

**Status:** Living document
**Class:** Engineering handbook
**Owner:** ORDER 023 infrastructure

Fast paths for the two review workflows we run repeatedly: **code review** and **Vision Owner acceptance review**.

## Fast code-review path (~1 min)

```
node scripts/parity-check.mjs         # World Alignment v1.0
node scripts/validate-world.mjs       # 14 world checks
node scripts/sector-audit.mjs         # 10-sector inventory
node scripts/osm-coverage.mjs         # OSM tag coverage telemetry
node scripts/shadow-map.mjs           # regenerate 7 SVGs at reports/shadow-map/
cd frontend && npm run typecheck && npm run build
```

If everything above prints clean or Info-only, and typecheck + build pass, the branch is safe to review. Any Critical / High from the validators must be resolved (or explicitly documented as a known deferred item) before the branch is merge-ready.

## Vision Owner acceptance review path (~5 min)

**Prerequisite:** dev server on `localhost:5173` (or `5174` if 5173 is in use).

1. **Open the shadow-map SVGs** — `reports/shadow-map/centre.svg` first. Compare side-by-side with the corresponding Google Maps screenshot. If the shadow map disagrees geographically, the defect is in the world data / ingest. If it agrees, the world data is fine and any residual issue is in the runtime renderer.
2. **Village preset** — confirm no forest markers in Sör-Älgen / Torrvarpen, no vehicles through buildings, no roads mirrored.
3. **Kvarteret preset over Torget** — window rows sit above the plinth, doors grounded on step, roofs project past walls (except industrial parapets).
4. **Kvarteret preset over Campus** — Kärnhuset main body handcrafted; smaller wing procedural.
5. **Business preset** — random residential entrance; check door + step + lintel proportions.
6. **Pan east** to Rv 244 T-junction — INGO petrol station and Pizzans Hus visible; grocery Tempo visible west on Skolgatan.

Full checkpoint list per ORDER 022 in `WORLD_AUTHENTICITY_REPORT_ORDER_022.md`.

## Selection metadata

Clicking any landmark opens `SelectionChrome` on the right side of the strategic scene. Currently displays:
- `displayName`
- `kind` (institution / commercial / municipal / religious / placeholder)
- `verification` (verified / approximate / placeholder)
- `note`
- `source.osmType` + `source.osmId` when present

Reference ORDER 023 Phase 1 (interactive World Inspector) — the full metadata display (Runtime ID, procedural / handcrafted, building levels, height, roof type, materials, confidence, world coordinates, bounding box, zone, reference package path) is a planned extension of this selection surface. Not landed in this ORDER — see `ENGINEERING_INFRASTRUCTURE_ORDER_023.md` for scope note.

## Common tool cookbook

**"Which sector does building `wXXXXX` belong to?"**
```
node scripts/sector-audit.mjs --json | jq '.[] | select(.buildings.namedList[] | contains("wXXXXX")) | .id'
```

**"Which OSM tags are populated but unused?"**
```
node scripts/osm-coverage.mjs | grep 'ingested — not used'
```

**"Regenerate the world data from Overpass without losing landmark records"**
```
node scripts/fetch-grythyttan-osm.mjs \
  --previous frontend/src/strategic/data/grythyttan-world.json \
  --out frontend/src/strategic/data/grythyttan-world.new.json
```
Only swap the new file in after confirming landmark count and landmark IDs match.

**"What did the last three ORDERs change?"**
```
git log --oneline main..HEAD | head
```

## Skip-list drift alert

`LANDMARK_BUILDING_IDS` in `content/world.ts` hides handcrafted buildings from the procedural `OsmBuildings` layer. Adding a **new landmark record that maps to an OSM way** does NOT automatically make the building invisible — that only happens if the landmark id is added to `HANDCRAFTED_LANDMARK_IDS`. Getting this backwards (adding to the handcrafted set without an actual handcrafted component) is what silently hid INGO and Tempo for two ORDERs.

V7 catches this now. If V7 fires, either:
- add a handcrafted component under `CraftedLandmarks.tsx` composition and mark the landmark handcrafted, OR
- remove the id from `HANDCRAFTED_LANDMARK_IDS` and let the procedural layer render it.

## The two coordinate frames (never change without evidence)

- OSM local frame → `+X east`, `+Z south`.
- World frame (post ORDER 020) → identical to OSM local. World `Z = +OSM Z`.
- Any `THREE.Shape` extruded / triangulated in a scene renderer **must** negate `y` at `shape.moveTo` / `shape.lineTo`, because `rotateX(-π/2)` sends `(x, y, 0) → (x, 0, -y)`. The parity check enforces this.

Never modify the World Alignment v1.0 transforms without an automated regression proving a verified defect.
