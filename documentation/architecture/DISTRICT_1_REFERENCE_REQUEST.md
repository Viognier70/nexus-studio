# District 1 — Reference Request (Historic Town Centre)

**Status:** STOP + REFERENCE REQUEST issued
**Trigger:** ORDER 003 (Digital Twin Reconstruction — District 1) rule: *"If references are insufficient, STOP and produce REFERENCE REQUEST. Never invent architecture."*
**Author:** Claude Code
**Response requested from:** Vision Owner
**Scope:** Torget, Guldkringlan, Grythyttans Gästgivaregård, Grythyttans Kyrka, and their immediate surroundings.

**No geometry has been modified.** Living-world systems continue to function unchanged (per ORDER 003 rule: "keep existing systems functioning while reconstruction proceeds").

---

## 1. Why this document exists

The order instructs me to reconstruct each District 1 landmark to match its real footprint, proportions, roof, windows, entrances, colours, facade rhythm, height and orientation. The rule *"Do not approximate if references exist. Never invent architecture. If references are insufficient, STOP and produce REFERENCE REQUEST"* forbids me from continuing on the current basis, because the current basis is invention.

The repository contains **no reference photographs**. A repo-wide search returned only prior render captures. There is no `documentation/references/`, no uploaded photos, no image assets. I have no interactive access to Google Street View or Google Maps satellite imagery from this environment. Under ADR 001 §6.1, raster imagery is not shipped as a runtime asset by default. Under Directive §5, guessing is prohibited.

Section 2 audits what is currently in the model. Section 3 lists the minimum reference material needed per landmark. Section 4 lists what can safely proceed without new references. Section 5 gives current confidence estimates.

---

## 2. Per-landmark audit — what is verified, inferred, and invented

For each landmark: (a) what is **verified** from OSM way/node data (present in `frontend/src/strategic/data/grythyttan-world.json`, Overpass fetch 2026-07-02); (b) what is **plausibly inferred** from generic Bergslag / Nordic-village conventions but not sourced to a specific reference; (c) what is **invented** — present in the model without any source.

### 2.1 Grythyttans Kyrka (`gry-kyrka`)

- **Verified from OSM** (way 869907961):
  - Building footprint polygon (13 vertices).
  - Bounding-box size: **35.5 m × 29.5 m**.
  - Kind tag: `church`.
  - Local-metric position: **[-45.54, 17.24]** m from projection centre (59.70575°N, 14.53723°E).
- **Plausibly inferred (not sourced):**
  - White-washed walls (`#efe7d3`).
  - Oxidised copper roof colour (`#4a6c5a`).
- **Invented:**
  - Bell tower height (24 m), footprint (3.8 m square), placement on the plan.
  - Copper roof panel (8.5 m × 5.5 m rectangle at centre of nave).
  - Spire form (four-sided cone, 4 m tall).
  - Cross geometry, dimensions and material.
  - Windows — none rendered at all.
  - Entrance — none rendered at all.
  - Facade rhythm — undefined.
  - Churchyard walls, fences, monuments — not present.

### 2.2 Grythyttans Gästgivaregård (`gry-gastgivaregard`)

- **Verified from OSM** (way 869907964):
  - Building footprint polygon (12 vertices).
  - Bounding-box size: **24.7 m × 42.7 m**.
  - Kind tag: `hotel`.
  - Local-metric position: **[61.61, 37.79]** m.
- **Plausibly inferred (not sourced):**
  - Faluröd wall base colour (`#c9482f`, before status tint) — traditional Bergslag palette.
  - Steep pitched roof form — common Bergslag inn typology.
- **Invented:**
  - Roof dimensions (24 m × 16 m volume, 5.2 m ridge height).
  - Two chimneys (positions arbitrary).
  - Entrance canopy dimensions and placement.
  - Wing extension on the south side.
  - Facade rhythm — undefined.
  - Windows — none rendered.
  - Colour of doors and shutters.
  - Terrace, garden or arrival court — not present.

### 2.3 Torget (`gry-torget`)

- **Verified from OSM** (way 122157681):
  - Boundary polygon of the square area.
  - Kind tag: `municipal`.
  - Local-metric position (centre): **[12.48, -27.59]** m.
- **Plausibly inferred (not sourced):**
  - Paved plaza reads as one flat surface.
- **Invented:**
  - Central obelisk monument (form, height, base). A monument does exist in reality but its shape, material and inscription are not sourced.
  - Ground surface material and colour.
  - Benches, planters, kiosks, lamp posts — not present.
  - Trees — not placed.
  - Curbs, drainage, paving pattern — not present.
  - Any surrounding low walls or fences.

### 2.4 Guldkringlan (`gry-kringlan`)

- **Verified from OSM** (node 3587736399):
  - A single **point** on the map. That is all OSM provides.
  - Local-metric position: **[31.63, 27.63]** m.
- **Plausibly inferred:**
  - It is a real bakery / café in Grythyttan (per world spec §2.2).
- **Invented — everything:**
  - Footprint (9 m × 7.5 m generic rectangle).
  - Height (5 m).
  - Roof form (gable).
  - Wall colour (`#d9c9a4` cream).
  - Roof colour (`#7b3f2b`).
  - Awning (yellow `#e7c26a`, 8.5 m × 1.4 m).
  - Entrance position, signage, windows, doors.
  - Orientation on the parcel.

Under ORDER 003's "Never invent architecture" rule, **the Guldkringlan model as it stands must be considered non-authorised** and cannot be improved without at least a footprint reference and one street-view angle.

### 2.5 Surrounding streets, buildings, trees, walls, fences, monuments, terrain

- **Verified from OSM:** road centrelines (widths inferred from `highway=*` category), building footprints for named buildings, water bodies, forest polygons.
- **Inferred:** road widths (constant per category), pavement (none rendered), curbs (none).
- **Invented / missing:** all trees, all fences (except those specifically in OSM which are almost none for this area), all walls, all monuments other than the Torget obelisk, terrain relief (currently flat), churchyard boundary treatment.

---

## 3. Reference request — what is needed per landmark

Format used per landmark: view angles required, plus specific detail shots.

### 3.1 Grythyttans Kyrka — **required**

- **A.** North façade (entrance side) — full building, filled frame, straight-on.
- **B.** South façade — same treatment, so we can determine window count and rhythm on both long sides.
- **C.** East gable (or apse if it is an apsidal church) — full-height, straight-on.
- **D.** West gable — same.
- **E.** Bell tower — close shot showing its position on the plan (attached to which end / detached), its shape (square, octagonal, etc.), roof form (spire, cap, dome), and its material.
- **F.** Roof from a raised angle — Google Maps 45° aerial view is enough to determine roof pitch, ridge orientation, and whether there is a tower or dormers.
- **G.** Churchyard perimeter — one photo per side showing any wall, fence or hedge, and the entrance gate.
- **H.** Any datable interior or exterior detail that fixes construction period (a plaque, a keystone) — helpful but optional.

### 3.2 Grythyttans Gästgivaregård — **required**

- **A.** Main street-facing façade — full building, straight-on.
- **B.** Rear façade / courtyard side — full building, straight-on.
- **C.** Both gable ends — straight-on.
- **D.** Roof from Google Maps 45° aerial view — chimney count, ridge shape, wing extensions.
- **E.** Entrance detail — canopy, steps, colour of door and shutters.
- **F.** Any documented sign board with the establishment name in current form.
- **G.** Terrace or arrival court, if any, seen from at least one angle.
- **H.** Colour reference in bright daylight (Bergslag red covers a range of hues — a photo taken around noon settles the specific tone).

### 3.3 Torget — **required**

- **A.** Overhead / aerial view of the square (Google Maps aerial suffices) showing boundary, paving pattern and monument placement.
- **B.** The central monument — one straight-on photo per side, tall enough to include base and inscription.
- **C.** Any benches, planters, lamp posts, kiosks — one photo of each type.
- **D.** Trees or shrubs on the square — one photo showing extent.
- **E.** All four building edges of the square — one photo per side so the perimeter frontage can be modelled.
- **F.** Ground material — paving stone type, curb height, drainage.

### 3.4 Guldkringlan — **required (highest priority — currently pure invention)**

Because OSM gives only a point, everything must be reference-derived.

- **A.** Front façade — full building, straight-on.
- **B.** Side façades — one per side if the building has more than one exposed side.
- **C.** Google Maps aerial view of the parcel — establishes footprint outline, roof shape, and orientation relative to the street.
- **D.** Entrance detail — door, awning, signage.
- **E.** Any window rhythm — one clear shot showing the pattern of the fenestration.
- **F.** Ground level context — what is on either side; how the building meets the pavement.
- **G.** Colour reference — daylight photo of the wall material.

### 3.5 Surrounding streets, buildings, trees, walls, fences, monuments

Lower priority than the four landmarks, but noted so the district reads as a real place around them.

- **A.** Google Maps aerial view centred on Torget at a zoom level where all four landmarks and their neighbours are visible.
- **B.** Street View or equivalent shots along the four sides of Torget so the immediate perimeter buildings can be modelled at their actual heights and colours.
- **C.** Any obvious churchyard wall, fence around Gästgivaregården, gate, garden hedge.
- **D.** Any tree line, avenue or single mature tree that shapes the square's read.
- **E.** Any terrain notes (is the square level? does the church sit up on a small rise?). A one-line note per building from you would suffice.

---

## 4. What can proceed without new references (proposed for parallel work)

While reference material is being gathered, the following would improve accuracy without inventing anything:

- **4.1 Confirm OSM footprint currency.** Refetch the Overpass query and diff against the current committed `grythyttan-osm.json`. OSM data has moved since the 2026-07-02 snapshot; any new / edited buildings can be pulled in.
- **4.2 Verify road widths against the OSM `width` tag where present** (rather than the category-default heuristic currently in use). This is a data-driven correction, not a guess.
- **4.3 Suppress invented details until references arrive.** Specifically: strip the bell-tower geometry from the church, strip the roof monitor and chimneys from Gästgivaregården, replace the Guldkringlan generic-node building with a small ground marker (a footprint outline at the OSM point until the real footprint is known). All three become honestly `APPROXIMATION` per ADR 001 §2.3 rather than misleadingly detailed inventions.
- **4.4 Populate the `APPROXIMATION_REGISTER.md`** (ADR 001 §5.2) with the current provisional state of each District 1 landmark so future reference work has a clear docket.
- **4.5 Add a `documentation/references/district-1/` folder scaffolded with subfolders for each landmark**, so uploaded photographs have a canonical home.
- **4.6 Wire a per-landmark manifest** (`references/manifest.json`) mapping each landmark id to the list of reference files that would be considered sufficient. Updated as references arrive.

These are proposed only; I have not started them. They stay within ORDER 003's "reconstruct the world" scope and do not touch gameplay, NPC behaviour or economy.

Please confirm 4.1–4.6 as approved before I begin any of them, and specifically confirm 4.3 (visually reducing landmarks until references arrive), since it will visibly change the current build.

---

## 5. Confidence estimates for District 1 landmarks

Format: current confidence that the *rendered building matches the real building*. This is a self-report, not an external verification. Ranges reflect: footprint accuracy (from OSM), colour plausibility, silhouette plausibility, and detail invention.

| Landmark | Footprint | Silhouette | Colour | Details | Overall confidence |
|---|---|---|---|---|---|
| Grythyttans Kyrka | ~95 % (OSM) | ~35 % (tower invented) | ~55 % (whitewash / copper plausible) | ~15 % (windows/entrance absent, cross/spire invented) | **~35 %** |
| Grythyttans Gästgivaregård | ~95 % (OSM) | ~45 % (Bergslag roof plausible, wings invented) | ~60 % (Faluröd traditional but specific hue unverified) | ~15 % (chimneys/entrance/windows invented or absent) | **~40 %** |
| Torget | ~90 % (OSM square boundary) | ~40 % (monument form invented; benches, planters, trees absent) | ~50 % (paved plaza plausible) | ~10 % (nothing on the square is sourced) | **~35 %** |
| Guldkringlan | **~0 %** (OSM point only; footprint is a guess) | ~0 % (fully invented) | ~0 % (fully invented) | ~0 % (fully invented) | **~5 %** |
| Surrounding buildings | ~90 % (OSM footprints, procedural heights) | ~40 % (generic extrusion + hashed height wobble; roof forms procedural) | ~50 % (kind-based defaults) | ~10 % | **~35 %** |
| Streets | ~95 % (OSM alignments) | ~70 % (widths approximated by category) | ~70 % (uniform tone) | ~20 % (no curbs, no sidewalks, no drainage) | **~65 %** |

These confidences will move as reference material arrives. My honest read: **no District 1 landmark currently exceeds 45 % confidence, and Guldkringlan is not authorised under the current rule until at least a footprint reference is provided.**

---

## 6. What I have NOT done under ORDER 003

- No District 1 geometry has been modified.
- No living-world systems have been altered (per rule).
- No new textures or raster imagery added.
- No new dependencies added.
- No commits, no pushes.

---

## 7. Requested Vision Owner responses

Please respond to the following, in whatever order is convenient. Any one of them unblocks a subset of the work.

1. **Reference material.** Upload photographs / Street View captures / aerial captures per §3, or authorise me to add a `documentation/references/district-1/` folder into which you will drop them progressively. Even a partial upload (one landmark) unblocks work on that landmark.
2. **Google Maps aerial approach.** May I use Google Maps aerial 45° views (via URL / screenshot workflow you provide) as an approved reference source? ADR 001 §2.2 admits Street View / aerial as a verification source when the reference is cited; §6.1 forbids *shipping* raster imagery but *offline reference use* is authorised.
3. **Approval to suppress invented details** (§4.3) until references arrive — visually the build gets simpler in the interim.
4. **Approval for §4.1, §4.4, §4.5, §4.6** — the reference-hygiene work that can proceed in parallel without inventing anything.
5. **VQ-04 confirmed.** ORDER 003 refers to *Guldkringlan*; the world spec's original text refers to *Kringlan*. Superseding Directive 001 / ADR 001 canonicalised these as the same establishment. Confirm that Guldkringlan is the canonical name (currently rendered `displayName: 'Guldkringlan'`).
6. **Priority order among the four landmarks.** All are named as District 1, but if you would like me to concentrate first-arriving references on one of them, please say which.

---

## 8. Summary

Under the "Never invent architecture" rule, the current District 1 model **cannot proceed to reconstruction on its current basis**. It is not a rendering-quality problem; it is a reference-material problem. I am stopping here per the order's own instruction, and requesting the material listed in §3 so that the next milestone produces *reconstruction*, not *interpretation*.

Everything I *can* legitimately improve without new references is proposed in §4 and awaits your approval.

**End of District 1 reference request.**
