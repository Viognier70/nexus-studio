# PROPERTY CHARACTER GUIDE — ORDER 031 Phase 2

> Runtime component: `frontend/src/strategic/scene/OsmYardSurfaces.tsx`.
> Companion: `OsmDriveways.tsx` (unchanged narrow gravel-strip driveways).
> Datum: `StreetProfile.surface`.

## What "property character" means

The Vision Owner survey found the runtime rendered every plot as a flat green carpet. Street View shows the opposite — the layer between road and building varies systematically per street:

- **Badvägen** — every plot has a gravel driveway with a broader gravel apron in front of the house
- **Prästgatan** — asphalt forecourts at commercial buildings, wider than any residential yard
- **Torget** — paving-stone plaza (handled separately by `TorgetPlaza`)
- **Skolgatan** — gravel with worn dirt at edges
- **Nygatan** — asphalt at the industrial-adjacent plots
- **Rural periphery (Baluns väg)** — worn dirt / mixed gravel-and-grass

The system renders a surface patch per plot on the road-facing side, styled by the fronting street. Same rule as boundaries: neighbouring plots share the style; the diversity comes from the streets.

## Seven surface types

| Style | Colour | Roughness | Where it appears |
|---|---|---|---|
| `grass` | (skipped) | — | Rendered as terrain; a surface patch would be invisible. Default for lightly-used plots. |
| `gravel` | `#a89a80` warm gravel | 0.98 | Badvägen, Kyrkogatan, most residential streets |
| `asphalt` | `#3f3d38` dark grey | 0.90 | Prästgatan, Nygatan, Lokavägen, Mässingsslatan |
| `paving-stones` | `#8a8478` mid grey | 0.85 | Torget plaza + adjacent civic plots |
| `concrete` | `#a8a29a` light grey | 0.85 | Modern service yards, industrial forecourts |
| `worn-dirt` | `#6e5c48` warm brown | 1.00 | Rural / farm access (Baluns väg) |
| `mixed` | `#8a7c66` neutral tan | 0.95 | Peripheral / semi-rural |

## Geometry

Each patch is a single `Instance` (box `1 × 0.02 × 1` at scale `[patchLen, 1, patchDepth]`):

- `patchLen = min(OBB.w + 2.0 m, 30 m)` — building's long-side width plus a small overshoot, capped to avoid mega-buildings spilling
- `patchDepth = 3.0 m` — from the building's road-facing edge outward
- Position: `SURFACE_OFFSET (2.0 m) + OBB.d/2` from the building centroid, on the same road-facing side that `OsmFences` chooses

## Draw cost

Grouped by style, one `Instances` group per style. Total: **≤ 6 draw calls** (6 non-grass styles) regardless of plot count.

## Layering

Surfaces sit **below** the driveway strip:

- OsmYardSurfaces `Y = 0.05` (wide patch)
- OsmDriveways `Y = 0.16` (narrow driveway on top)
- OsmFences base `Y = 0.02` (fence panel just above ground plane)
- OsmBuildings base `Y = 0` (extruded upward)

So a plot reads: **grass terrain → wide surface patch → narrow driveway on top → fence at edge → house rising behind**.

## Coordination with `OsmDriveways`

The two components are complementary:

- `OsmDriveways` draws a narrow gravel strip **road → garage** for `house / detached / residential` kinds > 55 m². It's the driveway proper.
- `OsmYardSurfaces` draws a wider patch **road-side of the whole plot front** for all residential-family buildings > 45 m². It's the front yard / apron area.

They don't overlap logically: the driveway is a narrow gravel line, the yard patch is a broader ground colour, they sit at different Y so both render.

## What surfaces do NOT do

- No garden geometry (lawns, planting beds, individual flower beds)
- No parking bay markings (white lines on the asphalt)
- No paved pattern (paving-stones renders as a single flat colour, not individual stones)
- No wear textures (worn-dirt is a colour, not a normal map)
- No shadow-baking

All those are future graphical-richness passes. This ORDER commits to recognition, not richness.

## Skipping conditions

Same filters as `OsmFences`: skip landmarks, skip industrial / warehouse / garage kinds, skip tiny footprints, skip far-from-road buildings. And skip `surface === 'grass'` (invisible).
