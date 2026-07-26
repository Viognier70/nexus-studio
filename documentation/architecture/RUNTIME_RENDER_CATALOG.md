# RUNTIME RENDER CATALOG — what localhost produces per building family

> Internal reference. Ground-truth "expected localhost look" side for Street-View-vs-localhost surveys.
> Extracted from `frontend/src/strategic/scene/OsmBuildings.tsx` and its procgen helpers 2026-07-26.
> Regenerate/verify when OsmBuildings.tsx or the procgen helpers change materially.

## Global rules

- **Neighbourhood tinting**: 12 OSM residential polygons, alternating warm ochre `#c98f5a` or cool grey-blue `#7a8a92` at 0.08–0.14 strength. Excluded: `shed`, `garage`. Roof secondary tint at 0.6× wall strength (warm → `#3a2620`, cool → `#2f333a`). Influence tapers > 180 m from zone centroid.
- **Wobble**: ±6–12% per building ID (deterministic), applied to wall / roof colour and height.
- **Roof aging**: deterministic hash bumps roof toward `#4a5142` (35%+) or `#5f5748` (75%+).
- **COMMERCIAL_STATUS palette**: `open` (sage), `busy` (darker sage), `quiet` (ochre-tan), `closed` (grey), `for_sale` (vibrant pink `#c86a9c`), `for_lease` (softer pink `#d99cbd`), `renovation` (orange-tan), `future` (cool blue). Applied 55% wall / 35% roof blend.
- **D2 handcrafted skip list** (OsmBuildings does NOT render these — CraftedLandmarksD2 draws them): Kärnhuset `w193810921`; Station corridor `w870510842`, `w870510839`, `w870510833`, `w870510834`, `w870510823`; School complex `w870510877–871`, `w870510884`, `w870510866`, `w870510869`, `w870510870`, `w870510872`, `w870510876`, `w870510878`.
- **Church filter**: `building=church` explicitly excluded (line 1180). Handcrafted `ChurchLandmark` (gry-kyrka) replaces it.

## Per family

### Villa (~40–50)
- Roof: gable, ridge parallel to longest edge (OBB-aligned), pitch ~35°, wealth-scaled 0.88× / 1.0× / 1.18×, min 2.8 m above eave
- Height: 4.5 m base + ±12% wobble. OSM `building:levels` overrides (3.0 m / storey)
- Walls: Faluröd `#a24a3a` softened, wobbled. Wealth tint: modest → weathered dark `#403830` (10%); prosperous → cream `#f0e8d4` (14%)
- Chimneys: 1 (modest / standard) or 2 (prosperous). 0.55 × 1.7 m dark box on ridge, ±0.5 m X wobble
- Dormers: only on gable, modest = 0, standard ≈ 0 or 1, prosperous = 2. 1.5×1.4×1.4 m box, pyramid cap, cream pane on +Z pitch
- Plinth: 0.32 / 0.42 / 0.65 m stone (grey `#8a8478` or warm `#948e82`), inset 0.35 m
- Entrance steps: yes, 0.30 m step, 0.5 m projection, cream lintel, warm door lantern
- Corner boards: ~70% of eligible houses. 0.25 m vertical cream `#efe6d4` boards at four OBB corners
- Balconies: **none**
- Windows: procedural grid, 0.95 × 1.35 m cream panes with `#f4c680` warm emissive (0.14 intensity). Bay count 2–8 long side, 1–4 short side. Storeys from levels or `usable_height / 2.7`
- Garden / setback / fence / hedge / driveway: **none** (buildings sit on procedural terrain; the road network is a separate layer)

### Apartment (~25–30)
- Roof: hip, ridge parallel to longest edge, pitch 0.22× depth capped 1.8 m
- Height: 8.5 m base (2–3 storey). OSM levels override
- Walls: warm ochre plaster `#c2b092`. Roof `#3f342a` charcoal. Institutional cool `#e0dccc` 10% overlay
- Chimneys: 2 (0.6 × 1.5 m boxes on hip ridge, one per side of peak)
- Dormers: **none** (hip)
- Plinth: 0.42 m `#8a8478` inset 0.35 m
- Entrance steps: yes if ridge width ≥ 4 m and depth ≥ 3.5 m
- Corner boards: **none** (apartments not in eligible set)
- Balconies: **none**
- Windows: procedural grid + storey bands (`#000000` 35% strength) at 3.0 m intervals for buildings > 6.5 m
- Garden / fence / driveway: **none**

### Garage (~17–22)
- Roof: shed monopitch, 0.18× depth capped 1.2 m, ascending +Z
- Height: 3.2 m base + ±12% wobble
- Walls: small Faluröd `#a24a3a`. Roof `#3a2b22` creosoted timber. **Neighbourhood tint NOT applied.**
- Chimneys: **none**. Dormers: **none**. Plinth: **none** (sits on ground). Corner boards: **none**. Windows: **none**. Balconies: **none**
- Entrance / doors: **not rendered** (no formal entry marker). Garage door NOT visible.

### Shed (~30–40)
- Roof: shed monopitch, same as garage
- Height: 2.6 m base (smallest in dataset)
- Walls: creosoted timber `#7d5b3f` (darker than garage). Roof `#3a2b22`. **Neighbourhood tint NOT applied.**
- Chimneys / dormers / plinth / corner boards / windows / balconies / entrance: **none**

### Outbuilding (~20–25)
- Roof: gable, pitch 0.32× depth capped 2.8 m
- Height: 4.0 m base + ±12% wobble
- Walls: ochre `#b8a68a`. Roof `#4a4136`. Neighbourhood tint APPLIED (unlike shed / garage)
- Chimneys: 1 (standard profile). Dormers: **none** (standard profile)
- Plinth: 0.42 m `#8a8478`. Entrance steps: yes if ≥ 4 m × 3.5 m. Corner boards: ~70%
- Windows: procedural grid rendered
- Balconies: **none**

### School (~1–2 procedural; complex handcrafted)
- Roof: hip 0.22× depth cap 1.8 m. Height 8 m base
- Walls: warm ochre plaster `#c9b28e`. Roof `#7b3f2b` rustic red-brown. Institutional cool `#e0dccc` 10% overlay
- Chimney: 1. Dormer: none. Plinth: 0.42 m. Entrance steps: yes
- Corner boards: **none** (institutional). Balconies: **none**. Windows: grid + storey bands
- NOTE: Grythyttans skola 9-building complex is D2 handcrafted; procedural layer skips

### University (~0–1 procedural)
- Roof: hip. Height 9 m base (tallest institutional)
- Walls: pale plaster `#e7dcc7`. Roof `#5a5044` dark. Institutional cool 10%
- All other rules same as School
- NOTE: Måltidens hus + Kärnhuset are D2 handcrafted; procedural layer skips both

### Historic (~0–1)
- No dedicated historic palette / rules. OSM `historic=*` alone does NOT reclassify — the building renders under its `building=*` kind.
- Handcrafted overlays exist for gry-kyrka, gry-gastgivaregard, gry-jarnvag, gry-herrgard, gry-pizzanshus etc.

### Religious
- `building=church` filter removes procedural render. ChurchLandmark handcrafted. No procedural chapel / kapell rendering exists.

### Commercial (~8–12)
- Roof: gable, reclassified from `building=yes` if > 140 m²
- Height: 6 m base
- Walls: ochre plaster `#b8a68a`. Roof `#4a4136`. Institutional cool 10% overlay for explicit `building=commercial`
- **Status override**: COMMERCIAL_STATUS landmarks tint 55% wall / 35% roof (Gästgivaregård busy; Cornelis open; Pizzans open; Herrgården quiet; Antikvariat for_sale pink; Skola for_lease softer pink; Järnväg renovation)
- Chimney: 1. Dormers: **none** (no dormer typology for commercial gable). Plinth: 0.42 m. Entrance: yes. Corner boards: ~70%
- Windows: grid rendered
- Balconies: **none**

### Restaurant / Retail
- OSM `amenity=restaurant` / `shop=*` do NOT reclassify. Building renders under its `building=*` kind (typically house, detached, or commercial → follow those rules)

### Industrial (~8–12)
- Roof: **flat** (parapet band 0.4 m + ventilation strips 0.3 m deep at ±20% depth in trim colour `#8a8478`). Reclassifies to **barn** (steep gable 50% depth cap 3.6 m) if aspect > 2.2 AND area > 150 m²
- Height: 7 m base
- Walls: muted grey `#6a675e`. Roof `#3d3a34` charcoal
- **Chimneys, dormers, plinths, entrance steps, corner boards, balconies, windows: NONE**. Only frame + roof + parapet + vent strips
- NOTE: Station corridor 5 industrials + Kärnhuset are D2 handcrafted; procedural layer skips

### Warehouse (~3–5)
- `building=warehouse` → maps to industrial. Renders as industrial (flat or barn per aspect)

### Barn (~3–5)
- Roof: steep double-pitch gable, pitch 0.5× depth cap 3.6 m
- Height: 6 m base
- Walls: dark red vertical-board timber `#6a3226`. Roof `#312622`
- Chimneys / dormers / plinths / corner boards / windows / balconies / entrance: **none**
- Small dark ridge cap board 0.08 m

## Systematic absences (affect every family)

- **No fencing** (wood, metal, hedge)
- **No garden geometry** (lawn, hedge, tree in yard)
- **No driveway markers** (gravel, paving to garage)
- **No retaining walls** (Grythyttan has sloped terrain — retaining walls are common but never rendered)
- **No mailboxes / lamp posts / small street furniture**
- **No parking bay markings**
- **No garage doors** (garages are flat rectangles with a shed roof — no door graphic)
- **No basement / cellar entrance detail**
- **No industrial yard clutter** (pallets, containers, machinery bays)
- **No loading dock ramps or covered service areas**

## D2 handcraft coverage

- Kärnhuset (KarnhusetD2Pass5) — one building
- Station corridor (IndustrialShedD2Pass5) — 5 buildings
- School complex (SchoolBuildingD2Pass5) — 9 buildings
- D1 handcraft: Kyrka, Gästgivaregård, Herrgård, Skola landmark, Järnväg, IP
- Everything else procedural

## What this catalog is for

Every survey compares Street View reality against this catalog. When a Street View shot shows something on the ground and the catalog says "this family renders X", the difference is a defect for the Vision Owner review.
