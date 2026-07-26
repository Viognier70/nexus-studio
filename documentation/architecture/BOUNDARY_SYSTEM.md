# BOUNDARY SYSTEM — ORDER 031 Phase 1

> Runtime component: `frontend/src/strategic/scene/OsmFences.tsx` (replaces the ORDER 030 Tier 1a picket-fence-for-everyone).
> Datum: `StreetProfile.boundary` on the fronting street.

## Design rule

**Neighbouring properties on the same street share their boundary style.** Diversity comes from the streets, not from per-building randomness. The Vision Owner survey saw this pattern clearly: every plot on Badvägen has a white picket fence, every plot on Nygatan has a hedge, and the churchyard has a low stone wall. The village reads coherently because each street is coherent, not because each plot is different.

## Seven boundary types

| Style | Geometry | Colour | Where it appears |
|---|---|---|---|
| `none` | (skipped) | — | Commercial forecourts, industrial frontage, Torget plaza edge |
| `hedge` | 4 segments per plot, rounded dark green box, small Y jitter, no posts | `#5a6b4b` | Nygatan, Åsgatan, Hammargatan, Stentrygatan, Kvarnvägen |
| `wooden-fence` | Continuous dark timber vertical-board panel with dark posts every 2.5 m | walls `#5a4630`, posts `#3a2e20` | Kyrkogatan, Skiffergatan |
| `picket-fence` | Cream picket + dark corner + interior posts every 3.0 m | walls `#e8dcbe`, posts `#4a3a2e` | Badvägen |
| `wire-fence` | Very thin dark strip + thin light posts every 4.0 m | walls `#7d7d75`, posts `#3a3a30` | Mässingsslatan, Lokavägen, Baluns väg |
| `stone-wall` | 3 short low masonry segments, thicker than fences, no posts | `#8a8478` | Kyrkbacken (churchyard corner) |
| `retaining-wall` | Handled by `RetainingWalls.tsx`, not this component | — | Kyrkogatan uphill, Torget bowl |
| `mixed` | Picket panel + dark posts every 3.5 m, distinct tan-cream `#c9b998` so peripheral streets read as a distinct fallback | walls `#c9b998`, posts `#4a3a2e` | Härjeredvägen, Bergslagsgatan, Prästgatan (partial) |

## How the boundary is chosen per plot

```ts
// OsmFences.tsx
const profile = nearestStreetProfile(obb.centre[0], obb.centre[1]);
if (profile.boundary === 'none') continue;                // skip
if (profile.boundary === 'retaining-wall') continue;      // handled elsewhere
const spec = BOUNDARY_SPECS[profile.boundary];
// render according to spec
```

That is the entire lookup — no per-building hash, no per-neighbourhood override. The plot's centroid dictates which street it belongs to, and the street dictates the boundary style.

## Segmentation

Panels are drawn in one continuous piece by default (`segmentCount: 1`). Two styles use multi-segment panels:

- **hedge** — 4 segments per plot, with a small per-segment Y-jitter (`0.08 m`) so the hedge doesn't read as a rigid box. Different plots visibly wobble differently but neighbouring segments on the same plot share their wobble seed.
- **stone-wall** — 3 segments, `0.05 m` Y-jitter, thicker (`0.35 m` deep). Reads as masonry courses at village zoom, as a fence-shaped mass at strategic zoom.

## Draw cost

Grouped by style. Each style with any panel gets one `Instances` group for panels + one for posts (if `postSpacingM > 0`). Total: **≤ 12 draw calls** (6 styles × 2 groups) regardless of building count.

## Coverage

The component skips:

- Landmark buildings (`LANDMARK_BUILDING_IDS`) — those are handcrafted with their own micro-detail
- Buildings not of a residential family (industrial + warehouse + garage don't get fences)
- Buildings smaller than 45 m² footprint (sheds under the entrance-step threshold)
- Buildings whose OBB long side is under 5 m (too narrow for a proper fence)
- Buildings more than 55 m from any car road (deep-field farmhouses)

## Extensibility

Adding a new boundary style requires (1) an entry in `BoundaryStyle` union, (2) a `BoundarySpec` in `BOUNDARY_SPECS`, (3) inclusion in the `stylesWithPanels` render list. Adding style-specific animation (e.g. wind-swept hedge) is per-material shader work, out of this ORDER's scope.
