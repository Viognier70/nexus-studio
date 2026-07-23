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
| Wall material (vertical timber siding) | VERIFIED (3 photos) | — | verified |
| Wall colour (Falu red) | VERIFIED (3 photos) | — | verified |
| Roof form (steep gable) | VERIFIED (3 photos) | — | verified |
| Roof colour (dark charcoal / near-black) | VERIFIED (3 photos) | — | verified |
| Roof material (painted metal or shingle) | APPROXIMATION | close roof photograph | 0.65 confidence — dark surface, exact material not readable |
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

**Current render state (ORDER 004 PASS 1, 2026-07-23):** `ApproximationMarker` — low pad + short post at the OSM node position. Retained from §4.3. Guldkringlan facade `guldkringlan2.jpg` supplies wall material / colour / storey count / entrance / signage information but not a footprint. Until a Google Maps aerial of the parcel is supplied, the marker cannot be promoted to a real building.

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

**Current render state (ORDER 004 PASS 1, 2026-07-23):** `ApproximationMarker` at the OSM node position. The previous invented gabled node-building (10 × 5.5 × 8, Falu-red walls, dark-brown gable, red awning) has been removed. No references supplied for Cornelis yet.

| Aspect | State | Missing reference | Promoted when |
|---|---|---|---|
| Position (WGS84 → local) | VERIFIED (OSM node) | — | already verified |
| Footprint | ABSENT | Google Maps aerial of the parcel | polygon derivable |
| Orientation | ABSENT | aerial + street photograph | orientation derivable |
| Height / storey count | ABSENT | facade photograph | storey count legible |
| Wall material / colour | ABSENT | daylight facade photograph | material identifiable |
| Roof form / colour | ABSENT | aerial or gable-end photograph | roof legible |
| Windows / entrance / awning / signage | ABSENT | facade photograph | features identifiable |

### `gry-glass` — Glass & Choklad

**Current render state (ORDER 004 PASS 1, 2026-07-23):** `ApproximationMarker` at the OSM node position. The previous invented cream-walled gabled node-building with a blue awning has been removed. No references supplied.

| Aspect | State | Missing reference | Promoted when |
|---|---|---|---|
| Position (WGS84 → local) | VERIFIED (OSM node) | — | already verified |
| Everything else | ABSENT | aerial + facade photographs | as above |

### `gry-antik` — Antikvariatet

**Current render state (ORDER 004 PASS 1, 2026-07-23):** `ApproximationMarker` at the OSM node position. The previous invented grey gabled node-building has been removed. No references supplied.

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

**Current render state (ORDER 004 PASS 1, 2026-07-23):** OSM footprint extruded 6 m in the shared local frame, plausibly-inferred ochre approximation colour. The previous invented hipped roof, brick chimney and warm-red sign block have been removed. No reference material available yet.

| Aspect | State | Missing reference | Promoted when |
|---|---|---|---|
| Footprint | VERIFIED (OSM way 598989255) | — | already verified |
| Position (WGS84 → local) | VERIFIED (OSM) | — | already verified |
| Wall extrusion height (6 m default) | APPROXIMATION | gable-end photograph with scale | measurable in reference |
| Wall colour (ochre) | APPROXIMATION | daylight facade photograph | daylight-lit source |
| Roof form / colour | PASS 2 (deferred) | Google Maps 45° aerial | roof form legible |
| Chimney | PASS 2 (was invented) | aerial view of roof | any real reference |
| Sign block over entrance | PASS 3 (was invented) | entrance photograph | any real reference |
| Windows | PASS 3 | facade photograph per side | count + rhythm legible |

### `gry-herrgard` — Herrgården Grythyttan

**Current render state (ORDER 004 PASS 1, 2026-07-23):** OSM footprint extruded 9 m in the shared local frame, plausibly-inferred pale plaster approximation colour. The previous invented mansard cap (three-tier stack) has been removed. No reference material available yet.

| Aspect | State | Missing reference | Promoted when |
|---|---|---|---|
| Footprint | VERIFIED (OSM way 611766160) | — | already verified |
| Position (WGS84 → local) | VERIFIED (OSM) | — | already verified |
| Wall extrusion height (9 m default) | APPROXIMATION | gable-end photograph with scale | measurable in reference |
| Wall colour (pale plaster) | APPROXIMATION | daylight facade photograph | daylight-lit source |
| Roof form (mansard?) | PASS 2 (deferred, previously invented) | aerial | roof legible |
| Central mansard cap / spire | PASS 2 (was invented) | Google Maps 45° aerial | roof legible |
| Windows | PASS 3 | facade photograph per side | count + rhythm legible |

### `gry-jarnvag` — Grythyttans Gamla Järnvägsstation (Old Railway Station)

**Current render state (ORDER 004 PASS 1, 2026-07-23):** OSM footprint extruded 6 m in the shared local frame, plausibly-inferred Falu-red approximation colour. The previous invented long gable ridge and ridge stripe have been removed. No reference material available yet.

| Aspect | State | Missing reference | Promoted when |
|---|---|---|---|
| Footprint | VERIFIED (OSM way 870510841) | — | already verified |
| Position (WGS84 → local) | VERIFIED (OSM) | — | already verified |
| Wall extrusion height (6 m default) | APPROXIMATION | gable-end photograph with scale | measurable in reference |
| Wall colour (Falu red) | APPROXIMATION | daylight facade photograph | daylight-lit source |
| Roof form (gable running along tracks) | PASS 2 (deferred, previously invented) | aerial or gable-end photograph | roof legible |
| Windows | PASS 3 | facade photograph per side | count + rhythm legible |
| Platform / awning | PASS 4 | — | if any survives |

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

**End of approximation register.**
