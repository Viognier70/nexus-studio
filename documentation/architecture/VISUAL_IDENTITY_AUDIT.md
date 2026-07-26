# VISUAL IDENTITY AUDIT — ORDER 031 Phase 9

> Re-walk of every surveyed street with ORDER 031 systems applied.
> Compare Street View reference vs. the theoretical rendering produced by the current StreetProfile + Boundary + Surface + Vegetation + RetainingWall + PublicRealm stack.
> Predecessor: `RECOGNISABILITY_SURVEY.md` (baseline: 40 / 100 weighted).

## Methodology

For each of the four surveyed corridors, three questions:

1. **What did the survey say was missing?** (from `RECOGNISABILITY_SURVEY.md`)
2. **What does ORDER 031 now provide?** (from `STREET_PROFILE_CATALOGUE.md` + code)
3. **What defect remains open?** (candidate for future ORDERs)

Scores are projections based on which specific survey findings are now addressed. Vision Owner visual verification against localhost is required to confirm.

## Corridor 1 — Badvägen (lakeshore)

**Baseline score: 32 / 100**

### What the survey said

- Yellow / cream villas render red (Faluröd default)
- Every plot missing a white picket fence
- Garages absent
- No driveways / gravel surfaces

### What ORDER 031 provides

- ✅ `colour_tendency: cream-dominant` on Badvägen — villa walls pull cream instead of Faluröd default
- ✅ `boundary: picket-fence` on Badvägen — every plot gets a white picket panel with dark posts
- ✅ `surface: gravel` on Badvägen — yard patches render in warm gravel `#a89a80` on the road-facing side of every plot
- ✅ StreetTrees at 16 m birch spacing along the verge

### Remaining open

- Actual garage / shed structures deep in world.json need OSM survey to appear (out of scope)
- Individual per-villa colour differences (some are white, some are golden, some are cream) — requires per-building OSM tag which the fetcher already supports; each yellow / white villa needs a Vision Owner OSM edit to be individually assigned
- Mailboxes on posts at plot entrances (Tier 4 street furniture)
- Yellow villa hue specifically (`e6c76a`) — the current cream tint pulls toward `#e8dcb8`; individual buildings can override via OSM `building:colour` tag

**Projected score after ORDER 031: 60 / 100** (+28)

## Corridor 2 — Kyrkogatan + Torget + Skolgatan (village core)

**Baseline score: 42 / 100**

### What the survey said

- Torget-edge historic long-houses render as isolated ochre villas
- No plaza surface (fixed in ORDER 030)
- No tree-tunnel canopy on Skolgatan
- No retaining walls on the uphill Kyrkogatan sections

### What ORDER 031 provides

- ✅ `boundary: wooden-fence` on Kyrkogatan — dark timber panels + posts every 2.5 m
- ✅ `slope: uphill` on Kyrkogatan → `RetainingWalls.tsx` renders low masonry wall along one side every 4 m
- ✅ `slope: bowl` on Torget → walls on both sides (the plaza sits below the surrounding building level)
- ✅ Skolgatan `vegetation: dense`, `canopy: tunnel`, `tree_species: birch`, `tree_spacing_m: 8` — the tree tunnel is now rendered at high density
- ✅ Kyrkogatan `colour_tendency: faluröd-dominant` keeps historic village-core palette
- ✅ Kyrkbacken `boundary: stone-wall`
- ✅ Church `PublicRealm.ChurchyardBoundary` — low cream picket around the church footprint

### Remaining open

- Long-house multi-gable typology (Torget-edge historic buildings render as isolated single-gable villas — this is a per-building geometry defect requiring a new architectural family, out of scope for a place-character ORDER)
- Church spire silhouette height check (needs Vision Owner visual)
- Torget-edge bus shelter (Tier 4)

**Projected score after ORDER 031: 70 / 100** (+28)

## Corridor 3 — Prästgatan + Rv 244 + Nygatan (commercial spine)

**Baseline score: 38 / 100**

### What the survey said

- INGO fuel canopy missing (signature)
- Red-brick industrial mass renders as grey plaster
- Apartment hip roofs where reality is gable+dormer

### What ORDER 031 provides

- ✅ Prästgatan `surface: asphalt` — commercial forecourts now render as dark asphalt patches
- ✅ Prästgatan `colour_tendency: mixed-warm` — mixed apartment / commercial fronts stay heterogeneous
- ✅ Nygatan `colour_tendency: industrial-brick` — residential + industrial buildings on Nygatan pull toward `#8a4232` brick-tone
- ✅ Nygatan `boundary: hedge` — the dense hedging the survey cited as an absence
- ✅ Prästgatan `vegetation: sparse`, `tree_species: birch`, `tree_spacing_m: 22` — occasional sentinel birches, not a tunnel

### Remaining open

- **INGO orange fuel-pump canopy** — the survey's single most-cited defect on the entire corridor. Requires a D2 handcraft addition to the INGO building. Explicitly listed as a next-ORDER candidate.
- **Apartment gable+dormer variant** — apartment family currently renders hip only. Requires a new roof-style option in `OsmBuildings.roofStyleFor` and per-building geometry. Not a place-character concern.
- **Industrial buildings with windows** — industrial family renders no windows; historic red-brick industrial has sparse rectangular openings. Requires a new industrial-with-windows variant.
- **Pizzans service yard + terrace split** — needs per-building yard geometry (out of scope; PublicRealm covers only landmarks).

**Projected score after ORDER 031: 55 / 100** (+17)

Lower lift here than the residential corridors because the highest-impact fix (INGO canopy) is a Tier-3 landmark defect ORDER 031 explicitly did not address.

## Corridor 4 — Mässingsslatan + school district

**Baseline score: 52 / 100**

### What the survey said

- Handcrafted D2 school uses flat parapet roofs (reality is steep gable + dark shingle)
- No playground equipment
- No goal posts / floodlights / spectator fence on Fotbollsplan
- No perimeter fencing on campus

### What ORDER 031 provides

- ✅ Mässingsslatan `boundary: wire-fence` — low institutional fence around campus edges and sports areas
- ✅ Mässingsslatan `surface: asphalt` — paved institutional character
- ✅ Skolgatan tree tunnel (see Corridor 2) frames the campus approach
- ✅ Fotbollsplan `PublicRealm.FotbollsplanGoals` — two goal frames + nets + touch lines + centre circle
- ✅ School `PublicRealm.SchoolPlayground` — swing frame + sandbox + climbing frame silhouettes on the apron
- ✅ Mässingsslatan `colour_tendency: institutional-plaster` — residential + institutional buildings pull toward cool plaster

### Remaining open

- **D2 school-complex roof correction** — `SchoolBuildingD2Pass5` still renders flat parapet. Reality is steep gable + dark shingle. Requires a rewrite of the handcraft pass (~1 hour). Deliberately not touched in this ORDER (risk of regressions to handcrafted geometry).
- Sports floodlights (Tier 4 street furniture)
- School-zone triangular warning signs (Tier 4 street furniture)

**Projected score after ORDER 031: 72 / 100** (+20)

## Weighted overall

| Corridor | Baseline | Projected | Lift |
|---|---:|---:|---:|
| Badvägen | 32 | 60 | +28 |
| Village core | 42 | 70 | +28 |
| Prästgatan | 38 | 55 | +17 |
| School district | 52 | 72 | +20 |
| **Weighted overall** | **40** | **~64 / 100** | **+24** |

Original recognisability threshold ("when I stand on Badvägen it feels like Badvägen") was cited as ~80. ORDER 031 closes about half the remaining gap. The other half is:

- Landmark micro-details (INGO canopy, D2 school roof, Pizzans yard)
- Per-building geometric variants (apartment gable+dormer, long-house typology, industrial-with-windows)
- Street furniture (Tier 4)

Those are all explicitly out of scope for a place-character ORDER.

## What Vision Owner must confirm

The scores above are projections. Actual recognisability requires the Vision Owner to stand at each of the recommended camera positions in `PLACE_CHARACTER_REPORT.md` and compare against the referenced Street View shot.

Confirm or contest each of these seven views:

| Corridor | Camera | Reference SV | Verdict |
|---|---|---|---|
| Badvägen | `[-350, -400]` alt 55 m | `16.29.42.png` | (Vision Owner to fill) |
| Kyrkogatan | `[-30, 40]` alt 45 m | `16.08.33.png` | |
| Torget | `[12.5, -27.6]` alt 40 m | `16.00.16.png` | |
| Skolgatan | `[-260, -220]` alt 50 m | `16.02.04.png` | |
| Prästgatan | `[365, -12]` alt 60 m | `15.59.26.png` | |
| Fotbollsplan | `[-306, -391]` alt 45 m | `16.03.00.png` | |
| Church | `[-46, 17]` alt 40 m | `16.06.43.png` | |
