# RECOGNISABILITY SURVEY — Street View vs localhost

> **Status:** Superseded by `PLACE_CHARACTER_REPORT.md`. Retained for historical reference only.
> Field survey against the 91 Google Street View + map screenshots in `documentation/references/grythyttan bilder/`.
> The objective is VISUAL RECOGNISABILITY, not metadata completeness. Every visible thing on the street that localhost does not render is a defect.
> Companion catalog: `RUNTIME_RENDER_CATALOG.md` (what localhost currently produces per family).
> Survey mode: architectural surveyor, not OSM contributor.
> Survey date: 2026-07-26.

## Score per street corridor

| Corridor | Shots surveyed | Recognisability | Primary blockers |
|---|---:|---:|---|
| Badvägen (lakeshore villas) | 12 | **32 / 100** | Yellow / cream villas render red; every plot missing white picket fence; garages absent; no driveways |
| Kyrkogatan + Torget + Skolgatan (core) | ~28 | **42 / 100** | Torget-edge historic long-houses render as isolated ochre villas (should be Faluröd multi-gable timber); no plaza surface; no tree-tunnel canopy on Skolgatan; no retaining walls on the uphill sections |
| Prästgatan + Rv 244 + Nygatan (commercial spine) | ~18 | **38 / 100** | INGO fuel-pump canopy completely missing (single most-diagnostic defect on the street); red-brick industrial mass renders as grey plaster; apartment-family hip roofs where Street View shows gables with dormers |
| Mässingsslatan + school district | ~15 | **52 / 100** | Handcrafted D2 school complex uses flat parapet roofs where Street View shows steep-gable dark-shingle roofs; no playground equipment; no goal posts / floodlights on Fotbollsplan; no perimeter fencing |
| **Weighted overall** | ~73 SV | **≈ 40 / 100** | Village is recognisable in aerial / map but not from a person's viewpoint on any street. |

Uncovered: 2 Lokavägen shots (subsumed into Prästgatan survey), 6 map / satellite overviews (not Street View), a handful of near-duplicates.

## Systemic defects (present on every street)

These are the fixes that would lift the score most across the board.

### Tier 1 — every plot, every street, catastrophic

1. **No fencing anywhere** — Grythyttan is a fenced village. White picket, dark timber field fence, low stone wall + picket combo, wire farm fence, hedges — every plot in every screenshot has *some* boundary marker. Localhost renders none. Systemic across residential, historic, institutional, sports and commercial. Cited in every one of the four surveys as the largest single visual absence.
2. **No trees on plots or overhead canopy** — the birch alleys of Skolgatan and Kyrkogatan; the mature front-yard tree at 8 Badvägen; the birch shelter belts framing every institutional approach; the conifer backdrops behind lakeshore villas. Renderer treats trees as flat green terrain. Recognition of Skolgatan collapses without its tree tunnel; recognition of Torget collapses without its birch alley.
3. **No ground-cover distinction** — no gravel driveway, no paved plaza, no asphalt forecourt, no changing-room apron, no fuel-station forecourt, no parking bay. Every property has a drive from road to garage; the plaza has gravel; INGO has painted bay markings. Localhost renders one continuous grass mat + road strip.
4. **No retaining walls** — Kyrkogatan runs uphill, properties elevated 0.5–1.5 m on stone / timber walls; several Badvägen plots have low stone garden walls; Torget sits in a shallow bowl. Runtime is flat; walls do not exist. Documented as a known absence in `RUNTIME_RENDER_CATALOG.md`.

### Tier 2 — family-specific, high impact

5. **Wall colour override does not exist per building** — most acute on Badvägen (bright yellow / gold and cream / white villas rendered as Faluröd red because Villa-family default is `#a24a3a`) and on Prästgatan + Nygatan (Faluröd-brick industrial buildings rendered as institutional grey `#6a675e` because Industrial-family default is grey). At least on Badvägen this is the single most-cited defect. There is no mechanism in the pipeline to pass a per-building wall colour hint into the renderer.
6. **Apartment hip roofs where reality is gable-with-dormers** — Prästgatan 16 and 18, and multiple Kyrkogatan / Nygatan institutional apartments show clear gable roofs with 2 cream dormers on the front pitch. Apartment family renders hip only, dormers explicitly disabled. Silhouette breaks at every apartment building.
7. **Long-house typology absent** — the historic Torget-edge and Kyrkogatan buildings are 30–50 m long multi-gable Faluröd-timber cluster masses with 3–4 roof peaks sharing a single ridge line, multiple tenants at ground floor. Localhost renders each such building as a single-ridge villa, so Torget reads as isolated villas around empty space instead of a walled plaza. Cited as *critical* by the core survey.
8. **Industrial buildings have windows and pitched roofs** — reality on Prästgatan 10, Nygatan and the Swedecote cluster: red-brick, pitched slate roof, sparse but regular window openings. Industrial family: grey plaster, flat roof with parapet + vent strips, *no windows*. Cladding / roof / fenestration all wrong.
9. **Barn roofs are gambrel, not monopitch** — Kyrkogatan 26 dark-red vertical-board barn is 2.5-storey with gambrel roof + upper loft dormers. Barn family renders steep single-pitch gable, no dormers.

### Tier 3 — landmark-specific, signature defects

10. **INGO fuel-station canopy** — orange steel-column canopy sheltering the pump island is the single element that makes INGO recognisable. Runtime renders it as a plain 6 m gable ochre commercial building. **Recognisability of the entire east end of Prästgatan is destroyed without this canopy.**
11. **Pizzans Hus** — the front terrace + rear service yard split, plus signage, is what makes Pizzans read as a restaurant. Runtime renders the building only.
12. **Grythyttans skola D2 handcraft has wrong roof** — 9-building complex is rendered with flat parapet institutional-industrial roofs; Street View shows steep gable roofs with dark shingles typical of Bergslag schools. Fix in `CraftedLandmarksD2.tsx` `SchoolBuildingD2Pass5`.
13. **Fotbollsplan** — freshly promoted in ORDER 029 as a landmark marker only. Reality has painted white lines on grass, two goal frames, low spectator fence, small pavilion with changing rooms, tall floodlight poles at corners. Runtime renders a point marker on flat grass.
14. **Church perimeter** — Kyrka has a picket fence around the churchyard visible in Street View. Handcrafted `ChurchLandmark` does not include a fence — needs a perimeter picket ring on the church footprint.
15. **Grythyttans IP** — sports-ground pavilion needs its own facade + parking-yard geometry.
16. **Torget plaza surface** — the plaza itself is a landmark but has no visible surface. Needs a paved / gravel plaza mesh distinct from grass and road.

### Tier 4 — street furniture and micro-detail

17. Mailboxes on posts at every plot entrance
18. Overhead power lines + wooden utility poles along every street
19. Lamp posts on the plaza and along Prästgatan
20. Bollards defining institutional / school-zone pedestrian priority
21. Blue school-zone triangular warning signs
22. Directional signage on Rv 244 and Rv 205 at junctions
23. Building name plates (Sörgårdens, Jaktakademin, Grythyttans skola, Församlingshem)
24. Fuel-pump dispensers on the INGO forecourt
25. Bus shelter next to Kyrka (visible in 16.09.26)
26. Playground equipment on the school apron

## What is NOT a defect

- Every building in `landmarks.json` is correctly positioned to within parity tolerance (`parity-check.mjs` clean; ORDER 029).
- Road network + named streets present and correctly oriented (Rv 244 = 7.5 km, Rv 205 = 12.1 km; all 15 ORDER-named streets accounted for).
- Water bodies + forest zones + district assignment complete (660 / 660 assigned).
- 15 landmarks from the previous Vision Owner batch that lack OSM tags remain UNRESOLVED (Grythytte Qvarn, Kapell, badplats, CSVWellness, slate cluster, förskola, Församlingshem, etc.) — cannot be added without inventing geometry per canonical rule. This is a data upstream (OSM) problem, not a rendering problem, and is separate from every defect above.

## What order to fix

Tier 1 fixes give the biggest recognisability jump per hour of work. Suggested sequence:

1. **Add procedural fencing to residential family** (any building with `kind ∈ {yes, house, detached, residential}` in a residential-zone polygon → generate a low picket / dark-timber fence along the road-facing edge of a computed setback). Expected lift: **≈+10 points overall** because every survey cites this.
2. **Add a per-building `wall_colour_hint` override in world.json** and read it in `OsmBuildings.tsx toExtruded` before applying palette. Populate at least the ~20 obvious cream / yellow / red-brick buildings on Badvägen, Kyrkogatan, Nygatan. Expected lift: **≈+8 points**.
3. **Add ground-cover paint for the driveway / plaza / forecourt** — a simple concrete-or-gravel colour mesh drawn from residential-plot centroid to nearest road, plus a hand-drawn plaza polygon under gry-torget. Expected lift: **≈+5 points**.
4. **Instance mature trees along Skolgatan + Kyrkogatan + Torget** — even a naive per-metre-along-named-street tree-line would resurrect the tree tunnel. Expected lift: **≈+8 points for the core district**.
5. **Add INGO canopy** — one D2 handcrafted primitive: 6 m × 10 m × 4 m orange steel canopy with 4 column supports, positioned at INGO's front. Expected lift: **≈+5 points for the whole commercial corridor**.
6. **Correct the school-complex roofs to steep-gable dark-shingle in `SchoolBuildingD2Pass5`.** Expected lift: **≈+3 points for the school district**.
7. **Add goal frames + white pitch lines on Fotbollsplan.** Expected lift: **≈+2 points for the school district**.

Estimated combined lift: **≈+40 points**, taking the weighted overall recognisability from **40 / 100 to ~80 / 100** — the recognisability threshold where "when I stand on Badvägen it feels like Badvägen".

## What this ORDER did NOT do

Per instruction: no implementation. This is a survey deliverable only. Recommended next-order title: `ORDER 030 — recognisability lift, Tier 1 systemic fixes`.

Also NOT done: adding new landmarks, adding new roads, changing OSM tags, changing the geometry of any building. This survey is entirely about surfacing what the runtime does not show a person standing on the street.

## Where the per-street detail lives

The four per-street defect registers (one per surveyor pass, ~2500 words each) are held in-conversation. If needed I can persist them as separate files (`SURVEY_BADVAGEN.md`, `SURVEY_CORE.md`, `SURVEY_PRASTGATAN.md`, `SURVEY_SCHOOL.md`). Ask if you want them saved.
