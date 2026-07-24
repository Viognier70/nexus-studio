# Approximation Register

**Status:** Living document
**Class:** Reference tracking (governance)
**Parent:** `documentation/architecture/ADR_001_DIGITAL_TWIN_PHASE.md` §2.3, §5.2
**Companion:** `documentation/architecture/DISTRICT_1_REFERENCE_REQUEST.md`

Every entity currently rendered under an **APPROXIMATION** marker per ADR 001 §2.3. Each row records what is approximated, the reason it is not yet verified, and the reference material that would promote it to `VERIFIED`.

**Rule of thumb:** if a rendered detail could not be defended in front of a Grythyttan resident with a source, it belongs here.

---

## District 1 — Historic Town Centre

### `gry-kyrka` — Grythyttans kyrka

**Current render state (post Vision Owner reference ingest, 2026-07-23):** Wooden church reconstruction is in progress from `kyrkan.jpg`, `kyrkan.jpeg`, `kyrkan2.jpeg`. See `documentation/references/district-1/kyrka/manifest.json` for the per-aspect confidence rating that authorises this pass.

| Aspect | State | Missing reference | Promoted when |
|---|---|---|---|
| Footprint | VERIFIED (OSM way 869907961) | — | already verified |
| Position (WGS84 → local) | VERIFIED (OSM) | — | already verified |
| Wall material (horizontal timber `liggtimmer` clad with shingles / spån) | VERIFIED (3 photos + sv.wikipedia.org/wiki/Grythyttans_kyrka) | — | verified — shingle texture on walls is a PASS 3 refinement, current smooth extrusion reads as shingled surface at village scale |
| Wall colour (red clay paint / Falu red) | VERIFIED (3 photos + Wikipedia) | — | verified |
| Roof form (steep gable, cross-shaped plan with transepts) | VERIFIED (3 photos + Wikipedia — cross arms added 1680) | — | verified |
| Roof colour (dark charcoal / near-black) | VERIFIED (3 photos) | — | verified |
| Roof material (slate / skiffer from local quarry, replaced original shingle in 1904) | VERIFIED (Wikipedia) | — | verified |
| Dormers on nave roof | VERIFIED (2 dormers on north pitch, kyrkan2.jpeg) | — | verified |
| Bell tower — presence | VERIFIED (3 photos) | — | verified |
| Bell tower — position on plan | VERIFIED (west end, integrated with west wall) | — | verified |
| Bell tower — shape (square base + ogee cap + spire) | VERIFIED (3 photos) | — | verified |
| Bell tower — height (approx 2× nave-wall height) | APPROXIMATION | scaled reference | 0.80 confidence — proportion readable from foreground objects |
| Spire form | VERIFIED (slender spire with cross finial) | — | verified |
| Clock face on tower west face | VERIFIED (kyrkan2.jpeg) | — | verified |
| Cross finial | VERIFIED (kyrkan2.jpeg) | — | verified |
| Windows on nave (arched, white-framed) | VERIFIED (rhythm visible in 3 photos) | — | verified |
| Window count per long facade | APPROXIMATION (5 arched windows per side rendered in PASS 3, 2026-07-23; arch tops now legible) | straight-on facade photograph | 0.70 confidence — exact count still unverified |
| Entrance (south porch on the south transept protrusion) | APPROXIMATION | straight-on entrance photograph | 0.70 confidence — partial view in kyrkan.jpg |
| Churchyard low rubble stone wall | DEFERRED | full perimeter photographs OR OSM churchyard polygon | perimeter dimensions verified; previous interim rectangle intersected roads |
| Mature trees around churchyard | RENDERED (PASS 4, 2026-07-23) — 6 deciduous + 1 large conifer on the east side per kyrkan.jpeg | tree species / precise positions | close-up + Vision Owner note |

### `gry-gastgivaregard` — Grythyttans Gästgivaregård

**Current render state (ORDER 005 PASS 3, 2026-07-23):** OSM footprint extruded 8 m in the shared crafted-landmark local frame, tinted Faluröd. Steep gable roof (~7.2 m ridge) with 2 chimneys and 3 courtyard-side dormers. PASS 3 additions: rhythmic small-paned windows on both long facades (6 × 2 storeys = 12 windows per side), a round oculus in each dormer, a round oculus in the +Z gable end, a dark entrance door and a burgundy hanging sign board with a warm lantern beside it (visible in gästgiveriet.jpeg and gästgiveriet 4.jpeg).

| Aspect | State | Missing reference | Promoted when |
|---|---|---|---|
| Footprint | VERIFIED (OSM way 869907964) | — | already verified |
| Position (WGS84 → local) | VERIFIED (OSM) | — | already verified |
| Wall material (timber siding) | VERIFIED (4 photos) | — | verified |
| Wall colour (Faluröd) | VERIFIED (4 photos) | — | verified |
| Wall extrusion height (8 m default) | APPROXIMATION | gable-end photograph with scale | measurable in reference |
| Storey count | VERIFIED (2 storeys) | — | verified |
| Roof form (steep gable) | VERIFIED and RENDERED | — | verified |
| Roof colour (dark charcoal) | VERIFIED and RENDERED | — | verified |
| Chimneys (2 along ridge) | RENDERED | precise horizontal positions | photograph of ridge from above |
| Dormers (3 gabled bumps on courtyard pitch) | RENDERED (count approximated) | count + horizontal positions | photograph of full courtyard elevation |
| Which pitch carries the dormers | APPROXIMATION | Google Maps aerial or a note from Vision Owner | pitch orientation verified |
| Wing extension along street | PART OF FOOTPRINT (verified in gästgiveriet.jpeg) — already included in the OSM polygon | — | already verified |
| Rear terrace / courtyard | RENDERED (PASS 4, 2026-07-23) — gravel-toned patio on the courtyard side with two umbrella-form markers; furniture placement approximated | precise layout | close-up photograph of the courtyard from above |
| Street-side cobbled strip along Prästgatan | RENDERED (PASS 4, 2026-07-23) — darker paved strip along the street facade | precise cobble pattern | close-up |
| Street-side deciduous trees | RENDERED (PASS 4, 2026-07-23) — 2 hand-placed | positions | Vision Owner note |
| Windows on long facades | RENDERED (PASS 3, 2026-07-23; count = 12 per side, rhythm approximated) | straight-on facade photograph per side | exact count + rhythm |
| Round oculus in dormer windows | RENDERED (PASS 3, oculus form only; leaded pattern → later) | — | verified rendered |
| Round oculus in gable end | RENDERED (PASS 3) | — | verified rendered |
| Entrance dark door + hanging sign board + lantern | RENDERED (PASS 3; the sign is a colour block, actual '1641' text needs bitmap tooling beyond strategic scope) | — | verified rendered |

### `gry-guldkringlan` — Guldkringlan

**Current render state (ORDER 006 Block 2, 2026-07-23):** Rendered as one tenant inside the new **Torget long house `w869907962`** (see the shared-container section below), specifically the east-end storefront at local X = +16.75 offset from the polygon centroid. `guldkringlan2.jpg` verifies the 3-storey Falu-red vertical timber siding used for the whole long house. Storefront marker (canopy + illuminated sign + lantern) placed on the +Z facade. The Guldkringlan landmark id still resolves for selection / camera focus via `OsmLandmarks`.

| Aspect | State | Missing reference | Promoted when |
|---|---|---|---|
| Position (WGS84 → local) | VERIFIED (OSM node 3587736399) | — | already verified |
| Wall material (Falu-red timber) | VERIFIED-when-modelled (guldkringlan2.jpg) | — | rendered in PASS 3 |
| Wall colour (Falu red) | VERIFIED-when-modelled | — | rendered in PASS 3 |
| Storey count (3) | VERIFIED-when-modelled | — | rendered in PASS 2 |
| Window rhythm (3 bays × 3 storeys) | VERIFIED-when-modelled | — | rendered in PASS 3 |
| Entrance (central, ramp, doors, sign) | VERIFIED-when-modelled | — | rendered in PASS 3 |
| Signage 'GULDKRINGLAN' | VERIFIED-when-modelled | — | rendered in PASS 3 |
| Footprint | ABSENT | Google Maps aerial of the parcel | polygon derivable — required to leave marker state |
| Orientation | ABSENT | aerial + street-facing photograph | orientation derivable |
| Roof form / colour | ABSENT | aerial or gable-end photograph | roof legible |

### `gry-cornelis` — Cornelis

**Current render state (ORDER 006 Block 2, 2026-07-23):** Rendered as the west-end tenant inside the **Torget long house `w869907962`**, next to the church as the description says (local X = −18.7 offset from the polygon centroid). Storefront marker on the +Z facade. Function verified via cornelisgrythyttan.com / Bergslagen.se as a pub/restaurant with a whiskey cellar.

| Aspect | State | Missing reference | Promoted when |
|---|---|---|---|
| Position (WGS84 → local) | VERIFIED (OSM node) | — | already verified |
| Footprint | ABSENT | Google Maps aerial of the parcel | polygon derivable |
| Orientation | ABSENT | aerial + street photograph | orientation derivable |
| Height / storey count | ABSENT | facade photograph | storey count legible |
| Wall material / colour | ABSENT | daylight facade photograph | material identifiable |
| Roof form / colour | ABSENT | aerial or gable-end photograph | roof legible |
| Windows / entrance / awning / signage | ABSENT | facade photograph | features identifiable |

### `gry-glass` — Neerings Glass & Choklad

**Current render state (ORDER 006 Block 2, 2026-07-23):** `ApproximationMarker` overlaid on OSM building `w869907970` (19.7 × 12.7 m, Kyrkogatan 1, Torget) which continues to render at generic OsmBuildings fidelity. Below the ≥ 70 % overall-massing threshold since we have only a "fresh/modern shop, since 2006" text description and no facade photograph. Marker preserved for selection targeting.

| Aspect | State | Missing reference | Promoted when |
|---|---|---|---|
| Position (WGS84 → local) | VERIFIED (OSM node) | — | already verified |
| Everything else | ABSENT | aerial + facade photographs | as above |

### `gry-antik` — Antikvariatet

**Current render state (ORDER 006 Block 2, 2026-07-23):** Rendered as the centre tenant inside the **Torget long house `w869907962`** (local X = −2.9 offset from the polygon centroid). Storefront marker on the +Z facade. No specific-building references supplied; the shared long house handles massing.

### `w869907962` — Torget long house (shared container for Cornelis, Antikvariat, Guldkringlan)

**Current render state (ORDER 006 Block 2, 2026-07-23):** Not itself a landmark; a physical container building. OSM footprint 50.9 × 16.8 m extruded 10.5 m (3 storeys per `guldkringlan2.jpg`), Falu-red vertical timber walls, steep gable roof running along the long axis with a ~4.6 m ridge, two chimneys near each end, three storefront markers on the +Z facade at each tenant's X offset. Added to `LANDMARK_BUILDING_IDS` via `SHARED_CONTAINER_BUILDING_IDS` extension so the generic OsmBuildings layer skips it.

| Aspect | State | Missing reference | Promoted when |
|---|---|---|---|
| Footprint | VERIFIED (OSM way 869907962) | — | already verified |
| Wall material (Falu-red vertical timber) | VERIFIED (guldkringlan2.jpg) | — | verified |
| Storey count (3) | VERIFIED (guldkringlan2.jpg) | — | verified |
| Wall extrusion height (10.5 m) | APPROXIMATION (3 × 3.5 m storey) | facade photograph with human scale | measurable in reference |
| Roof form (steep gable, ridge along long axis) | APPROXIMATION (Bergslag typology) | Google Maps aerial | roof form legible in aerial |
| Ridge height (4.6 m) | APPROXIMATION | gable-end photograph | scaled source |
| Chimneys (2, one near each end of the ridge) | APPROXIMATION (typology) | aerial view of the roof | any real reference |
| Facade orientation (+Z assumed street-facing) | APPROXIMATION | aerial + Street View | which side faces Torget |
| Storefront positions along the facade | VERIFIED-per-tenant (OSM node positions used) | — | verified from OSM nodes |
| Cornelis / Antikvariat / Guldkringlan sign detail | PASS 3 (colour blocks only; text is out of scope for strategic scale) | close-up photographs | rendered as facade text |

| Aspect | State | Missing reference | Promoted when |
|---|---|---|---|
| Position (WGS84 → local) | VERIFIED (OSM node) | — | already verified |
| Everything else | ABSENT | aerial + facade photographs | as above |

### `gry-torget` — Torget

**Current render state (ORDER 004 PASS 1, corrected 2026-07-23):** A 36 × 30 placeholder paved plane at the OSM-verified centre `landmark.position`. Note: PASS 1 report claimed the OSM boundary polygon was wired in — that was incorrect. In `grythyttan-world.json`, way `w122157681` (name "Torget") is stored under `roads`, not `buildings`, and its `poly` is a 4-vertex 54 × 4 m linear feature, not a closed area polygon. `TorgetLandmark`'s `buildingFor(landmark)` therefore returns `null` and falls back to the 36 × 30 rectangle. Fixing the ingestion so a plaza polygon reaches the buildings/areas layer is a separate PASS 1 follow-up not part of PASS 2. The three historic photographs still disprove a central monument (nothing visible in any of them).

| Aspect | State | Missing reference | Promoted when |
|---|---|---|---|
| Position (WGS84 → local) | VERIFIED (OSM way 122157681 stored as road) | — | already verified |
| Boundary polygon (visual ground shape) | APPROXIMATION (36 × 30 placeholder) | Ingest w122157681 as an area polygon in `grythyttan-world.json` | polygon reaches the buildings/areas layer |
| Ground surface (paving pattern / material) | APPROXIMATION | photograph of the square surface | material identifiable |
| Central monument (existence) | DISPROVEN by supplied photos (0.25 confidence) | Vision Owner confirmation if any monument exists today | confirmed present |
| Formal tree avenue along the square | RENDERED (PASS 4, 2026-07-23) — 10 deciduous trees, 5 on each long edge | precise tree positions | Vision Owner note or Street View |
| Benches / lamp posts / planters / kiosks | ABSENT | photograph of the square | features identifiable |
| Perimeter buildings | PASS 4 (deferred — outside the current landmark scope) | Street View of each of four sides | perimeter modellable |

### `gry-campus` — Måltidens hus / Sevillapaviljongen (Campus Grythyttan)

**Current render state (ORDER 005 PASS 3, 2026-07-23):** Måltidens hus main building — OSM footprint extruded 10 m in the shared local frame with a thin flat modernist roof cap. Sevillapaviljongen fully faceted this pass: round drum tower with (i) a checkerboard base of 24 alternating light-dark vertical strips on the lower ~4 m, (ii) a glazed upper band with 12 vertical mullions reading as observation-storey windows, (iii) a viewing balcony ring near the top, (iv) a small conical gilded finial on the crown. The flat canopy carries an 8 × 8 grid of deterministic-seeded multicoloured mosaic tiles on its top surface. Pavilion placement (off local −Z of the campus footprint) is still an approximation until an aerial confirms the parcel position.

| Aspect | State | Missing reference | Promoted when |
|---|---|---|---|
| Footprint of main building | VERIFIED (OSM way 193810975) | — | already verified |
| Position (WGS84 → local) | VERIFIED (OSM) | — | already verified |
| Wall extrusion height of main building (10 m default) | APPROXIMATION | facade photograph with scale | measurable in reference |
| Main-building roof form (flat modernist) | RENDERED (thin flat cap) | — | verified |
| Main-building facade colour / angled treatment | APPROXIMATION (light stone approximation colour; angled walls not yet modelled) | close facade photograph | angle + shading legible |
| Sevillapaviljongen drum tower | RENDERED | — | verified |
| Sevillapaviljongen viewing balcony ring | RENDERED | — | verified |
| Sevillapaviljongen conical / gilded finial | RENDERED | — | verified |
| Four heavy timber column pairs | RENDERED | — | verified |
| Flat canopy (form) | RENDERED | — | verified |
| Multicoloured mosaic on the canopy top | RENDERED (PASS 3, 8 × 8 grid, palette approximation) | close-up photograph of the canopy pattern | precise per-tile colours |
| Drum tower checkerboard base | RENDERED (PASS 3, 24 alternating strips on lower 4 m) | close-up | precise pattern size |
| Drum tower glazed upper storeys | RENDERED (PASS 3, subtle glass band with 12 vertical mullions) | close-up | glass framing verified |
| Pavilion position within the parcel | APPROXIMATION (placed off local +Z end of the polygon; flipped from -Z after Vision Owner PASS 4 review) | Google Maps aerial of the parcel | position derivable |
| Flag mast (previously invented) | DISPROVEN by supplied photos | — | not present |
| Glowing sphere lantern (previously invented) | DISPROVEN by supplied photos | — | not present |

### `gry-pizzanshus` — Pizzans Hus

**Current render state (ORDER 006 Block 2, 2026-07-23):** OSM footprint extruded 6 m, Bergslag ochre approximation walls, steep gable roof with ridge along the polygon's long axis (~3.6 m ridge, dark charcoal), single dark chimney for the pizza-oven flue. Overall silhouette confidence ~70 % (OSM footprint + Prästgatan 23 commercial pizzeria + Bergslag regional typology). See `PizzansHusPass2` in `CraftedLandmarks.tsx`.

| Aspect | State | Missing reference | Promoted when |
|---|---|---|---|
| Footprint | VERIFIED (OSM way 598989255) | — | already verified |
| Position (WGS84 → local) | VERIFIED (OSM) | — | already verified |
| Wall extrusion height (6 m) | APPROXIMATION | gable-end photograph with scale | measurable in reference |
| Wall colour (ochre) | APPROXIMATION | daylight facade photograph | daylight-lit source |
| Roof form (steep gable, ridge along long axis) | APPROXIMATION (Bergslag typology) | Google Maps 45° aerial | roof form legible |
| Ridge height (3.6 m) | APPROXIMATION | gable-end photograph | scaled source |
| Chimney (1, for pizza oven) | APPROXIMATION (typology) | aerial view of roof | position verified |
| Sign block over entrance | PASS 3 (deferred) | entrance photograph | any real reference |
| Windows | PASS 3 | facade photograph per side | count + rhythm legible |

### `gry-herrgard` — Herrgården Grythyttan

**Current render state (ORDER 006 Block 2, 2026-07-23):** OSM footprint extruded 9 m, pale plaster approximation walls, steep gable roof with ridge along the polygon's long axis (~5.4 m ridge, dark charcoal), two symmetrical chimneys on the ridge, two small gabled dormers on the +X pitch. Overall silhouette confidence ~72 % (OSM footprint + early-1800s Bergslag manor typology). Roof-form choice: safer gable rather than hipped/mansard until an aerial confirms. See `HerrgardPass2` in `CraftedLandmarks.tsx`.

| Aspect | State | Missing reference | Promoted when |
|---|---|---|---|
| Footprint | VERIFIED (OSM way 611766160) | — | already verified |
| Position (WGS84 → local) | VERIFIED (OSM) | — | already verified |
| Wall extrusion height (9 m for 2-storey manor) | APPROXIMATION | gable-end photograph with scale | measurable in reference |
| Wall colour (pale plaster) | APPROXIMATION | daylight facade photograph | daylight-lit source |
| Roof form (steep gable) | APPROXIMATION (safer than hipped/mansard) | Google Maps 45° aerial | roof form verified |
| Ridge height (5.4 m) | APPROXIMATION | gable-end photograph | scaled source |
| Chimneys (2 symmetrical) | APPROXIMATION (manor typology) | aerial view | count + position verified |
| Dormers (2 small gabled on +X pitch) | APPROXIMATION (manor typology) | Street View | count + which pitch verified |
| Windows | PASS 3 | facade photograph per side | count + rhythm legible |
| Entrance | PASS 3 | photograph of entrance | position + form |

### `gry-jarnvag` — Grythyttans Gamla Järnvägsstation (Old Railway Station)

**Current render state (ORDER 006 Block 2, 2026-07-23):** OSM footprint extruded 7 m, Faluröd approximation walls, steep gable roof running along the tracks (~4.4 m ridge, dark charcoal), two chimneys on the ridge, a platform-side canopy overhang on the +X side supported by five slim posts. Overall silhouette confidence ~72 % (OSM footprint + 1876 BJ station on Kil-Ställdalen line + standard Edelsvärd-era rural Swedish station typology). See `OldStationPass2` in `CraftedLandmarks.tsx`.

| Aspect | State | Missing reference | Promoted when |
|---|---|---|---|
| Footprint | VERIFIED (OSM way 870510841) | — | already verified |
| Position (WGS84 → local) | VERIFIED (OSM) | — | already verified |
| Wall extrusion height (7 m for 1.5-storey station) | APPROXIMATION | gable-end photograph with scale | measurable in reference |
| Wall colour (Falu red) | APPROXIMATION | daylight facade photograph | daylight-lit source |
| Roof form (steep gable, ridge along tracks) | APPROXIMATION (Edelsvärd-era typology) | aerial | roof form legible |
| Ridge height (4.4 m) | APPROXIMATION | gable-end photograph | scaled source |
| Chimneys (2 on the ridge) | APPROXIMATION (typology) | aerial view of roof | any real reference |
| Platform-side canopy overhang (five posts, +X side) | APPROXIMATION (typology) | Street View or facade photograph | canopy verified |
| Windows | PASS 3 | facade photograph per side | count + rhythm legible |
| Cross-wing at one end (sometimes present) | ABSENT (not modelled) | aerial view | any real reference |

### District 1 — surroundings

| Aspect | State | Missing reference | Promoted when |
|---|---|---|---|
| Terrain relief (currently flat) | APPROXIMATION | elevation data or one-line notes from Vision Owner | source available |
| Curbs / sidewalks | ABSENT | any Street View along a District 1 street | any real reference |
| Fences / walls / gates | ABSENT | aerial + perimeter Street View | any real reference |
| Trees along streets | ABSENT | Street View | any real reference |

---

## Districts 2–N

Not yet started. Rows will be added when a district enters reconstruction.

---

## Change log

- 2026-07-22 — Register instantiated in response to ORDER 003 (Digital Twin Reconstruction — District 1) and Vision Owner clarification approving the interim workflow. Initial rows drafted from the District 1 reference request audit.
- 2026-07-23 — §4.3 honest-approximation pass executed on the four District 1 landmarks (`gry-kyrka`, `gry-gastgivaregard`, `gry-torget`, `gry-kringlan`). Invented details removed in `frontend/src/strategic/scene/CraftedLandmarks.tsx`: church bell tower + spire + roof monitor; Gästgivaregården roof volume + chimneys + entrance wing; Torget obelisk monument + benches; Guldkringlan generic node-building replaced by an `ApproximationMarker`. Each landmark table above updated; aspects previously labelled `INVENTED — to be removed` (or matching hidden invention) now labelled `SUPPRESSED (§4.3)`. OSM-verified footprints, positions and orientations retained. Living-world systems (traffic, pedestrians, gatherers, chimney smoke on non-landmark residential buildings, commercial status tints, camera) untouched.
- 2026-07-23 — Vision Owner reference photographs inventoried and per-landmark `manifest.json` files updated with `collectedSources` and `confidenceByAspect`. Files inspected: `kyrkan.jpg`, `kyrkan.jpeg`, `kyrkan2.jpeg` (church, 3 views); `gästgiveriet.jpeg`, `gästgiveriet3.jpeg`, `gästgiveriet 4.jpeg`, `gästgibveriet på prästgatan.jpeg` (Gästgivaregård, 4 views); `guldkringlan2.jpg` (Guldkringlan, 1 facade view); `torget.jpeg`, `torget2.jpeg`, `torget 3.jpg` (Torget, 3 historic/period views); `maltidens-hus-i-norden 1.jpg`, `maltidens-hus-i-norden2.jpg`, `maltidens-hus-i-norden3.jpg` (Sevillapaviljongen + Måltidens hus, 3 views). `guldkringlan vid torget.avif` present but not read this pass (AVIF too large for the current pipeline; inventoried by filename only). New finding for Torget: no central monument is visible in any supplied photo — the previously-suppressed obelisk was correctly removed. New finding for Sevillapaviljongen: it is a round drum tower under a flat multicoloured canopy on four column pairs, not the octagonal wooden pavilion + flag mast + glowing sphere currently in the model. That correction is queued but not part of this pass.
- 2026-07-23 — **ORDER 004 / ORDER 005 PASS 1** executed for the eleven District 1 landmarks. Root-cause coordinate-frame bug identified from the m3-district capture: the extrusion pipeline placed each landmark's walls at `world Z = -poly.y` while overlaid decor was placed at `world Z = +poly.y`, opening a 2 × centre[1] gap that scaled with each landmark's distance from the OSM projection centre (~35 m for the church, ~78 m for Gästgivaregård, ~170 m for Måltidens hus, ~220 m for Herrgården). The fix, first proven on the church rev 2 and now applied to every crafted District 1 landmark, is a shared `useLandmarkWallGeo` helper that negates the shape Y before extrusion, centres the shape at the polygon centroid, and lives inside a single `<group>` anchored at `landmark.position`. Walls and decor share one local frame and cannot come apart. `THREE.DoubleSide` on the wall material defends against CW-wound OSM polygons. In the same pass, all invented silhouette detail on Måltidens hus (Sevillapaviljongen model), Gästgivaregården (already stripped), Pizzans Hus (hipped roof, chimney, sign), Herrgården (mansard stack), the Old Railway Station (long gable, ridge) is removed. Cornelis, Glass & Choklad, Antikvariatet CraftedNode boxes are replaced by `ApproximationMarker`. Torget PASS 1 report claimed the OSM polygon became the ground shape — that was incorrect, way `w122157681` is stored under `roads` and is a linear feature not an area polygon, so the render still uses a 36 × 30 placeholder. Skola and IP are outside the ORDER 004 list and retain their prior (still-offset) state — they will be brought into the new frame when their district enters reconstruction. Living-world systems, OSM roads / water / forest / terrain, traffic, pedestrians, gatherers, chimney smoke, commercial status tints and camera are all untouched.
- 2026-07-23 — **ORDER 005 PASS 2** executed for District 1. Silhouette work delivered on the two landmarks whose references support it: (1) Gästgivaregården — steep Bergslag gable roof (ridge along the polygon's long axis, ~7.2 m ridge above the eaves, dark charcoal), two chimneys along the ridge, three gabled dormers on the courtyard-side pitch; (2) Måltidens hus / Sevillapaviljongen — main-building thin flat roof cap (modernist), plus the pavilion as a round drum tower (5.0 m radius, 12.5 m tall) with a viewing balcony ring, a small conical gilded finial, four pairs of heavy timber columns holding a flat 24 × 24 m canopy 15.4 m above ground. Multicoloured checkered canopy pattern, drum checkerboard base and glazed upper storeys deferred to PASS 3. Church remains at ORDER 003A level (already ahead of PASS 2). Pizzans Hus, Herrgården, Old Railway Station, Cornelis, Glass & Choklad, Antikvariatet — no references supplied, so nothing added this pass per the never-invent rule; they remain at PASS 1 flat extrusions or ApproximationMarker. Torget is not a building — its silhouette is empty by definition. Guldkringlan facade photograph verifies storey count and height but lacks a footprint, so the ApproximationMarker cannot be promoted to a silhouette. Living-world systems and non-landmark scene layers untouched.
- 2026-07-23 — **ORDER 005 PASS 3** executed for District 1. Facade / material work delivered for the three landmarks with sufficient references: (1) Gästgivaregården — 24 rhythmic small-paned windows on the two long facades (6 × 2 storeys per side), a round oculus in each of the three courtyard-pitch dormers, a round oculus in the +Z gable end, a dark entrance door on the street facade, a burgundy hanging sign board and a warm lantern (form only — the '1641' text is a bitmap job outside the strategic scope); (2) Måltidens hus / Sevillapaviljongen — Sevillapaviljongen drum tower now carries a 24-strip checkerboard base on the lower ~4 m, a steel-blue glass band with 12 vertical mullions on the observation storey, and the flat canopy has an 8 × 8 grid of deterministically seeded multicoloured mosaic tiles on its top surface (palette derived from maltidens-hus-i-norden 1.jpg); (3) Grythyttans kyrka — rectangular window placeholders on the two long nave facades are replaced with true arched windows (Shape + ExtrudeGeometry, half-round tops) with a dark tinted glass pane behind each frame, matching the arch tops verified in kyrkan.jpg and kyrkan2.jpeg. The remaining eight District 1 landmarks (Torget, Guldkringlan, Cornelis, Glass, Antik, Pizzans, Herrgården, Old Station) receive no PASS 3 work — either no references, no footprint, or not a building. Nothing invented. Living-world systems, OSM roads / water / forest / terrain, traffic, pedestrians, gatherers, chimney smoke, commercial status tints and camera all untouched.
- 2026-07-23 — **ORDER 005 PASS 4** executed for District 1. Immediate surroundings delivered for the three landmarks with sufficient references: (1) Grythyttans kyrka — 7 hand-placed mature trees around the churchyard (1 large conifer on the east side per kyrkan.jpeg, 6 deciduous around the perimeter), positioned outside the polygon envelope so no tree clips walls or transepts. The perimeter rubble-stone wall remains DEFERRED — the interim rectangle intersected roads in a previous revision, and no verified perimeter dimensions exist yet; a new shared `LandmarkTree` helper introduced this pass so tree geometry stays consistent across landmarks; (2) Torget — 10-tree formal deciduous avenue lining both long edges of the square, verified in torget.jpeg, torget2.jpeg and torget 3.jpg; (3) Gästgivaregården — rear gravel-toned courtyard patio on the courtyard-pitch side with two umbrella-form markers (matching gästgiveriet3.jpeg's terrace with umbrellas), a darker cobbled strip along Prästgatan on the street side, and two street-side deciduous trees. The five node landmarks (Guldkringlan, Cornelis, Glass, Antik) and the four un-referenced way landmarks (Pizzans, Herrgården, Old Station, plus Måltidens hus which sits in grass) receive no PASS 4 additions. Living-world systems, OSM roads / water / forest / terrain, traffic, pedestrians, gatherers, chimney smoke, commercial status tints and camera all untouched.
- 2026-07-23 — **ORDER 005 PASS 4 review correction**. Vision Owner flagged the Sevillapaviljongen as being on the wrong side of the main Måltidens hus building. Pavilion offset flipped from local `PAV_Z = -38` to `PAV_Z = +38` in `CraftedLandmarks.tsx::MaltidensHusPass2`. Position within the parcel remains an APPROXIMATION until a Google Maps aerial is supplied.
- 2026-07-23 — **ORDER 005 PASS 5** executed for District 1. Fine details delivered for the three landmarks with sufficient references and completed PASSes 1–4: (1) Grythyttans kyrka — a stone path leading south from the porch out toward the churchyard perimeter (matching kyrkan2.jpeg) and a small cluster of 5 gravestones (foreground gravestone verified in kyrkan2.jpeg; count and layout conservatively approximated); (2) Gästgivaregården — four small round courtyard tables (two under the umbrellas from PASS 4, two additional standalone matching the wider table cluster in gästgiveriet3.jpeg); (3) Måltidens hus / Sevillapaviljongen — six small outdoor tables under the pavilion canopy in two small clusters (form-only tables verified in the foreground of maltidens-hus-i-norden 1.jpg). Torget, Guldkringlan, Cornelis, Glass, Antik, Pizzans, Herrgården and Old Station receive no PASS 5 additions — no supplied references support fine-detail work, and the "never invent" rule holds. Living-world systems and non-landmark scene layers untouched.
- 2026-07-23 — **ORDER 006 Autonomous Production Block 1** — research on the seven un-referenced District 1 landmarks (Guldkringlan, Cornelis, Neerings Glass & Choklad, Antikvariat, Pizzans Hus, Herrgården, Grythyttans gamla järnvägsstation). Sources consulted: `sv.wikipedia.org` (Grythyttan, Grythyttans_kyrka), `commons.wikimedia.org/wiki/Category:Grythyttan` (16 file KMB photos of the church, 2 file station category, buildings-in-Grythyttan overview), Bergslagen.se, hstrom.se antikvariat, allabolag.se (Pizzans Hus, org.nr 559128-3600). Findings: (1) Wikipedia confirms the church's wall material as *liggtimmer* clad with *spån* (shingles) painted with red clay paint, and the roof as slate (*skiffer*) from the local quarry since 1904 replacing the earlier shingle roof — this **confirms** the current model's colour and material choices; church aspect entries promoted to VERIFIED with Wikipedia citations. (2) Address confirmations: Guldkringlan → Torget 2A (since 1928); Neerings Glass & Choklad → Kyrkogatan 1, Torget (since 2006); Cornelis → next to the church on the town square; Pizzans Hus → Prästgatan 23; Herrgården → early-1800s manor 5 min walk from centre. (3) The Wikimedia Commons Grythyttan Station category has 2 files but neither includes an architectural description in the caption, and the Digitalt Museum entry for the station is blocked by 403. Bebyggelseregistret specific-entry URLs redirect back to the search landing page. No code changes this block; the register is updated with source-cited findings only.
- 2026-07-23 — **ORDER 006 clarification** on the reconstruction philosophy: never-invent means never fabricate UNSUPPORTED features, not that reconstruction must wait for 100 % certainty. Reconstruction proceeds when the overall building massing / silhouette can be synthesised at ≥ 70 % confidence using the union of Vision Owner photos, Google Street View, Google Maps, heritage sources, OSM footprint, and architectural reasoning. Small unknowns (rear facade, exact window count, gutters, drainpipes) remain approximated but do not block reconstruction. Applied retroactively in Block 2 below.
- 2026-07-23 — **ORDER 006 Autonomous Production Block 2** — PASS 2 silhouettes promoted for four landmarks that Block 1 held as blocked: (1) **Pizzans Hus** — dedicated `PizzansHusPass2` component: OSM footprint `w598989255` extruded 6 m, Bergslag ochre approximation walls, steep gable roof (ridge along the polygon's long axis, ~3.6 m ridge, dark charcoal), single dark chimney for the pizza-oven flue. Synthesis: Prästgatan 23 commercial pizzeria + OSM footprint + Bergslag regional typology, overall silhouette confidence ~70 %. (2) **Herrgården Grythyttan** — dedicated `HerrgardPass2` component: OSM footprint `w611766160` extruded 9 m, pale-plaster approximation walls, steep gable roof (~5.4 m ridge), two symmetrical chimneys on the ridge, two small gabled dormers on the +X pitch. Synthesis: early-1800s manor in a Bergslag setting + OSM footprint + Bergslag manor typology (two-storey timber, steep roof, symmetric chimneys, characteristic dormers). Roof-form choice: safer gable rather than hipped/mansard until aerial confirms. Confidence ~72 %. (3) **Grythyttans gamla järnvägsstation** — dedicated `OldStationPass2` component: OSM footprint `w870510841` extruded 7 m, Faluröd approximation walls, steep gable roof running along the tracks (~4.4 m ridge), two chimneys on the ridge, a platform-side canopy overhang on the +X side supported by five slim posts. Synthesis: 1876 BJ station + OSM footprint + standard Edelsvärd-era rural Swedish station typology (1.5–2-storey timber, steep gable along tracks, ochre or Falu red walls, platform canopy). Confidence ~72 %. (4) **Torget long house w869907962** — new `TorgetLonghusPass2` component and a `SHARED_CONTAINER_BUILDING_IDS` extension to `LANDMARK_BUILDING_IDS` in `content/world.ts`. The 50.9 × 16.8 m OSM building on Torget physically houses three commercial node landmarks (Guldkringlan Torget 2A east, Antikvariat centre, Cornelis west next to church). Rendered as a 3-storey Falu-red vertical timber long house (height verified by `guldkringlan2.jpg`) with a steep gable roof running the full 50 m length, two chimneys near each end, and three storefront markers on the +Z (assumed street-facing) facade at each tenant's X offset. Guldkringlan/Cornelis/Antikvariat ApproximationMarkers retired — the shared long house is now their physical building; their landmark ids still resolve for selection / camera focus via `OsmLandmarks`. Confidence ~78 % (facade evidence for Guldkringlan section + Bergslag long-house typology + OSM footprint). Facade orientation still an approximation until an aerial confirms which side faces Torget. (5) **Neerings Glass & Choklad** — remains at `ApproximationMarker` overlaying the OSM building `w869907970` it occupies; the OSM building itself continues to render at generic OsmBuildings fidelity. Below the ≥ 70 % overall-massing threshold since we have only "modern shop" text and no facade photograph. (6) The former shared `CraftedFootprintPass1` helper is retired now that every District 1 way-landmark has a dedicated PASS 2 component; recover from git if a future district needs it. Living-world systems, OSM roads / water / forest / terrain, traffic, pedestrians, gatherers, chimney smoke, commercial status tints and camera all untouched.
- 2026-07-23 — **ORDER 006 Autonomous Production Block 3** — PASS 3 facade detail on the four buildings promoted in Block 2. (1) **Pizzans Hus** — 8 small-paned windows on both long facades (4 per side, single storey), dark entrance door on the assumed street-facing +Z facade, warm-red illuminated sign block above the entrance. (2) **Herrgården Grythyttan** — 20 symmetric windows on both long facades (5 bays × 2 storeys × 2 sides), central portico on the +X (street) facade with a small overhang and two slim columns, manor entrance door. (3) **Grythyttans gamla järnvägsstation** — 12 station-style windows on both long facades (6 per side), passenger entrance on the tracks (+X) side under the platform canopy, illuminated station name board above the entrance. (4) **Torget long house `w869907962`** — 90 rhythmic small-paned windows across the full 50 m long house (15 bays × 3 storeys × 2 sides), plus tenant-specific storefront treatments on the +Z facade: Guldkringlan (east) gets the burgundy-gold-emissive sign palette verified from `guldkringlan2.jpg`; Cornelis (west) gets a warm dark pub palette per cornelisgrythyttan.com; Antikvariat (centre) gets a neutral bookshop palette. All three tenants share the same canopy + door + lantern template. Rear-facade window rhythm is regional-typology approximation. No changes to the four already-PASS-3 landmarks (church, Gästgivaregården, Måltidens hus, Sevillapaviljongen). Neerings Glass & Choklad still below threshold. Living-world systems and non-landmark scene layers untouched.
- 2026-07-23 — **ORDER 006 Autonomous Production Block 4** — PASS 4 immediate surroundings on the four Block 2 promotions. (1) **Pizzans Hus** — small cobbled forecourt on the +Z street side + two streetside deciduous trees flanking the entrance. (2) **Herrgården Grythyttan** — gravel driveway curving along the +X (entrance) side + three mature perimeter trees (two deciduous, one large conifer near the gable end) forming a small front garden. (3) **Grythyttans gamla järnvägsstation** — 4.0 m wide station platform on the tracks (+X) side under the canopy with a white edge stripe, two platform benches, and a warm platform lamp mast. (4) **Torget long house `w869907962`** — 54 × 4.5 m pedestrian sidewalk running the full length of the +Z facade, kerb along the sidewalk edge, two benches between the storefronts, two lamp posts flanking the sidewalk at the ends of the building. Surroundings are regional-typology synthesis (no close-up references supplied for any of the four); paved-area dimensions and lamp/bench placement remain approximation. Living-world systems and non-landmark scene layers untouched.
- 2026-07-24 — **ORDER 006 Autonomous Production Block 5** — PASS 5 fine detail on the five buildings named in the order (Grythyttans Gästgivaregård, Pizzans Hus, Herrgården, Grythyttans gamla järnvägsstation, and the Torget long house `w869907962` including its Guldkringlan / Cornelis / Antikvariat tenants). Under the ORDER 006 clarification, fine detail additions were restricted to items defensible from either supplied photographs or standard Bergslag / Edelsvärd-era typology; no unique historical ornamentation was invented.
   - **Shared additions** applied consistently to all five buildings: cream-painted window trim board surround around every visible window, cream cornerboards at each of the four wall corners (a defining detail of Bergslag Falu-red timber buildings — verified on gästgiveriet.jpeg and standard across the typology), cream-painted fascia board along both long eaves, dark painted-metal gutter box under both long eaves, dark drainpipes at the wall corners, chimney base flashings (small darker collars around the chimney bases), and a small stone / painted-timber threshold step and dark-timber planter pair flanking every entrance.
   - **Gästgivaregården** additions on top of the shared set: cream address plate on the street facade beside the door, a wall-mounted lantern to the courtyard side of the door balancing the existing sign-side lantern, and a small painted-timber street bench under one of the ground-floor windows (verified as a small seat under a window in gästgiveriet.jpeg).
   - **Pizzans Hus** additions on top of the shared set: single wall-mounted entrance lantern beside the door.
   - **Herrgården** additions on top of the shared set: small painted-glass dormer window pane on each of the two +X-pitch dormers, portico step in front of the manor entrance, two wall-mounted entrance lanterns flanking the portico, and a low painted-timber post-and-rail fence along the outside edge of the driveway (six posts + a horizontal rail — standard manor detail).
   - **Old Railway Station** additions on top of the shared set: fascia board along the platform-side canopy edge, cast-iron platform bench near the entrance in addition to the two existing PASS-4 benches, a freestanding illuminated information / departures board on the platform, a second platform lamp mast further along the platform, an entrance step and a wall lantern beside the passenger door, and a street-side path leading from the road to the entrance. Drainpipes are placed only at the street-side corners (the tracks-side eave drains onto the platform through the canopy).
   - **Torget long house `w869907962`** additions on top of the shared set: drainpipes added at both facade corners of each of the three tenant boundaries as well as at the four building corners (eight total), plus per-tenant dark-timber planters flanking each of the three storefront doors, a stone threshold step per storefront, an additional hanging shop lantern per storefront balancing the existing wall lantern, and three young sidewalk saplings with small tree pits placed between the existing sidewalk benches and lamp posts.
   - No changes to Måltidens hus / Sevillapaviljongen (already at PASS 5 per ORDER 005), the church (already at ORDER 003A + PASS 5 detail), Torget or Neerings Glass & Choklad (below the ≥ 70 % threshold). Living-world systems, OSM roads / water / forest / terrain, traffic, pedestrians, gatherers, chimney smoke, commercial status tints and camera all untouched.
- 2026-07-24 — **ORDER 014 District 2 PHASE 0** — reference audit. Selected zone: Campus Grythyttan surroundings. Reference package created at `documentation/references/district-2/{karnhuset,campus-surroundings}/`. Public sources exhausted (Wikipedia sv+en, Wikimedia Commons 3 categories, Akademiska Hus building records, Örebro universitet institutional pages, HälleforsNytt, Svenskt Trä, Levande Kulturarv, se.top10place, hitta.se, findglocal, mynewsdesk, WebSearch × 5). Verified for Kärnhuset (`w193810921`): address Sörälgsvägen 1, year 1993, operator Akademiska Hus (since 2007), tenant Örebro universitet, function admin/classrooms/food+sensory lab/2 lecture halls (K112 30-seat floor 1, K215 60-seat floor 2)/Studentpuben, 2+ storeys, OSM footprint 69.5 × 97.6 m bbox actual area 1971 m², property Grythyttan 6:419. Not identifiable from any public source: architect, wall material, wall colour, roof form, roof colour, windows, entrance composition, orientation within the 70×98 m polygon. Anonymous polygons `w611766155/6/7` south of Måltidens hus have no public identification and are left at procedural fidelity. Hälsans Hus (Akademiska Hus T0014003) is on Carl Jans väg, outside the Sörälgsvägen cluster, currently vacant with plans to dismantle — excluded from D2 scope.
- 2026-07-24 — **ORDER 014 policy update** — confidence threshold reduced from 0.90 to 0.75 for ordinary buildings. Landmark tier (0.90) retained for identity-defining buildings. Footprint, placement, orientation and scale must remain reference-verified for both tiers. Architectural detail (window rhythm, entrance geometry, roof detailing, minor facade elements) may be reconstructed using Bergslag typology where direct references are unavailable — for ordinary buildings only. Kärnhuset assessed as ordinary tier (support / administration building on Campus Grythyttan, not identity-defining).
- 2026-07-24 — **ORDER 014 District 2 BLOCK 1 — Kärnhuset PHASE 1**. New `CraftedLandmarksD2.tsx` scene module (separate file so ORDER 014 work cannot regress the frozen D1 file). New `D2_HANDCRAFTED_BUILDING_IDS` set extension in `content/world.ts::LANDMARK_BUILDING_IDS` so the procedural OsmBuildings layer skips Kärnhuset. `KarnhusetD2Pass1` extrudes the actual 26-vertex irregular multi-wing OSM polygon (`w193810921`) to a 7 m institutional wall height. Wall colour set to `#e0d8c2` — a very slight desaturation of the procedural `university` KIND_COLOUR baseline `#e7dcc7`, chosen so the handcrafted rendering does not invent a divergent identity against neighbouring institutional buildings. Placement anchored to the polygon centroid `(407.8, -89.6)` via the D1 useLandmarkWallGeo Y-negation convention. Overall confidence 0.80 (footprint/placement/orientation/scale all VERIFIED from OSM at 1.00; year + function + storey count VERIFIED at 0.90–0.95; wall material/colour typology-synthesised at 0.70; roof and facade detail not yet rendered — PHASES 2–5 remain). No changes to any frozen system. No modelling of the anonymous surrounding polygons.
- 2026-07-24 — **ORDER 014 District 2 BLOCK 2 — Kärnhuset PHASE 2**. Adds a flat parapetted roof to `KarnhusetD2Pass2` (component renamed from Pass1). Roof is a second extrusion of the same polygon at 0.5 m height, positioned at Y = 7 m so it caps the walls with a shallow parapet edge visible from oblique views. Roof colour `#3a352d` (dark grey-brown institutional flat roof). Choice of flat roof (rather than per-wing gables) is a defensible Bergslag 1993 institutional-typology default that also matches the neighbouring frozen Måltidens hus roof geometry — inventing per-wing ridge lines on a 26-vertex multi-wing polygon would be architectural fabrication for an ordinary-tier building. No other changes.
- 2026-07-24 — **ORDER 014 District 2 BLOCK 3 — Kärnhuset PHASE 3**. Facade elements derived from the polygon geometry:
   - **Windows** — regular institutional rhythm (~3.5 m bays × 2 storeys at Y = 2.4 m and Y = 4.9 m) on every outer edge ≥ 4 m long. Each window is a small emissive box (0.95 × 1.35 × 0.06 m) rotated to face the edge's outward normal, positioned 0.06 m proud of the wall. Rendered via a single drei Instances group.
   - **Cornerboards** — cream painted 0.28 × 7 × 0.28 m posts at every CONVEX polygon vertex (concave notches skipped). Cross-product sign in the CCW-wound polygon determines convex vs concave. One Instances group.
   - **Fascia** — dark 0.22 m strip along every outer edge at Y = 6.94 m (just below the parapet), reads as the shadow band at the wall/roof junction. Per-instance scaled along the edge length. One Instances group.
   - **Main entrance** — placed on the LONGEST outer edge (heuristic: the main facade). Twin doors, cream lintel, small dark canopy overhead, one warm wall lantern to the side. Restrained institutional composition — no portico, no columns, no historic detail the reference package cannot support.
   - Component renamed `KarnhusetD2Pass2` → `KarnhusetD2Pass3` following the D1 convention. All new geometry uses drei Instances so PHASE 3 adds 3 draw calls total (windows + cornerboards + fascia). Entrance is one group of small meshes. Overall Kärnhuset confidence rises to 0.83 as facade rhythm now reads at close and district zoom.
- 2026-07-24 — **ORDER 014 District 2 BLOCK 4 — Kärnhuset PHASE 4**. Minimal PHASE 4 additions: a single 6.5 × 3.6 m paved apron directly in front of the entrance (institutional-typology standard, matches Bergslag academic-institution norm). No perimeter trees, no parking, no bicycle stand, no bollards — none of these have location support in the reference package, and placing them without a reference would be architectural fabrication for an ordinary-tier building. Component renamed `KarnhusetD2Pass3` → `KarnhusetD2Pass4`.

**End of approximation register.**
