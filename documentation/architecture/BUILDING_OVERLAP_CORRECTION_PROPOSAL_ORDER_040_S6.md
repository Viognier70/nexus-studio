# Building Overlap Correction Proposal — ORDER 040 §6

**Status:** Proposal only. **Not applied.** §6 gate: *"Present the proposal. Do not apply it."*
**Class:** Engineering proposal — building geometry correction
**Session:** ORDER 040 §6 (2026-07-30)
**Parent order:** `ORDER_040_SYNTHETIC_BUILDING_MARKING.md` §6
**Input:** `BUILDING_OVERLAP_DIAGNOSTIC_REPORT_ORDER_039.md` §2.3–§2.4 (with the 2026-07-30 corrections); `V21_ACCEPTED_OVERLAPS` in `scripts/validate-world.mjs`
**Governing:** `ADR_001_DIGITAL_TWIN_PHASE.md`; `ADR_002_SYNTHESIS_POLICY.md` §2.1–§2.3; `PHASE_IV_PRODUCTION_PLAN.md` (visual acceptance criterion; *"fix the coordinate chain, never the appearance"*)

---

## 1. Executive summary

**39 tier-3 building overlaps** were catalogued by ORDER 039 §2. This proposal recommends a correction approach for each, per the categories §6 permits: nudge, shrink, remove. Two categories §6 explicitly reserves are also observed:

- **`vw × w` pairs:** 16. The synthetic `vw-*` moves; the OSM `w*` is never moved (§6 constraint).
- **`vw × vw` pairs:** 23. Either can be adjusted; case-by-case.
- **`w × w` pairs:** **0.** No OSM-only overlaps in the current world. §6's "report separately as upstream data question" is inapplicable.
- **Pairs involving one of the 12 Category B named entities:** **0.** Vision Owner's §4-awaits rule (*"Ligger byggnaden fel är knuffning fel lösning"*) catches none of the 39 — none of the 12 named entities is in a tier-3 pair.

**Priority per §6:** 7 church intrusions first, 1 Tempo intrusion second, 31 others follow.

**Nothing in this proposal is applied.** Each recommendation is a first-pass suggestion; the fix order (ORDER 041 or later) is where corrections land.

---

## 2. Method

- Every tier-3 pair is examined against three axes: **provenance** of each building (`osm` / `synthesised` — the ORDER 040 §2 field), **overlap magnitude** (intersection area A and fraction f of smaller footprint), and **nature of the intruder's identity claim** (address-only fill, descriptive fill, or Category B named entity).
- Recommendations follow the ADR 002 §2 spirit — synthetic buildings are the default at the ordinary tier, but a synthesised building sitting inside an identity landmark's polygon is a defect of placement, not of tier.
- **Boundary rule from Vision Owner 2026-07-30:** *"If the building is in the wrong place, nudging is the wrong solution."* Nudge is only proposed where there is defensible evidence of a nearby correct position (adjacent street frontage with clear free space, plot pattern that continues the row). Where a building's correct position is genuinely uncertain, **remove** is preferred over **nudge** because it does not fabricate a new claim; the fix order can add the building back once the Vision Owner supplies a confirmed position.

### 2.1 The four recommendation categories

| Category | When | Effect |
|---|---|---|
| **nudge** | Adjacent free space matches a defensible street-frontage pattern; intruder's centre can shift to that space without fabrication | Building translates; footprint size unchanged |
| **shrink** | Intruder's centre is right but its footprint overreaches into the other polygon by a small margin (edge overlap only) | Footprint dimensions reduced; centre unchanged |
| **remove** | Intruder is substantially inside the other polygon with no defensible correct position nearby; or two `vw × vw` buildings are effectively describing the same house | Building record deleted from `world.json` |
| **await Vision Owner ground truth** | Position claim requires the Vision Owner to confirm the intended real-world location before any correction can be defensible | No recommendation; pair moves off the tier-3 list only after Vision Owner sheet |

Category *"await"* is invoked wherever the "if the building is wrong, nudge is wrong" principle applies more strongly than the geometric analysis alone can resolve.

---

## 3. Priority 1 — the 7 church intrusions (`w869907961` = Grythyttans kyrka, 552 m²)

Church footprint: bbox 35.5 × 29.5 m, centroid (−44.23, 17.69). ChurchLandmark renders at nave-wall 8.0 m, ridge 14.2 m, tower body 18 m. Any building intruding on the nave wall from Kyrkogatan-side occludes the nave silhouette per ORDER 039 §3.5.

| Pair | A (m²) | f (%) | Intruder area / kind / height | Recommendation |
|---|---|---|---|---|
| `vw-kyr-9-rear-villa` × church | 80.0 | **100.0** | 80 m² / house / default 4.5 m | **remove.** 100 % of the intruder is inside the church footprint; there is no partial position to nudge to. The "rear-villa" description implies it was meant behind #9 Kyrkogatan; if a rear-lot villa is real, its position needs Vision Owner ground truth. Removal now is the honest state; re-add in a follow-up order once the position is confirmed. |
| `vw-kyr-9-rear-barn` × church | 43.4 | 90.3 | 48 m² / outbuilding / default 4.0 m | **remove.** Same reasoning as `vw-kyr-9-rear-villa`. |
| `vw-kyr-16` × church | 131.4 | **85.3** | 154 m² / apartments / 8.4 m | **await Vision Owner ground truth.** This is the primary occluder (ORDER 039 §3.5). An apartment block substantially inside the church footprint is either mis-placed by tens of metres or the "16 Kyrkogatan" reference refers to a building that isn't actually at that OSM-derived church parcel. Nudging without Vision Owner confirmation of the intended real position risks fabricating a location. Removal drops a substantial-footprint claim. Between the two: prefer **remove** if the Vision Owner cannot immediately supply the correct position; the building is a bigger claim than the village needs. |
| `vw-kyr-13` × church | 52.1 | 40.1 | 130 m² / house / 5.7 m | **await Vision Owner ground truth.** 60 % of the footprint is outside the church, suggesting a nudge east/west to clear might be viable — but only if the Vision Owner confirms the intended plot is adjacent. Prefer **remove** on Claude Code's own judgement (no ground truth); nudge only if Vision Owner supplies the correct position. |
| `vw-kyr-11` × church | 43.7 | 54.7 | 80 m² / house / 3.0 m (see also ORDER 039 §4.3 note — 3.0 m for `kind=house` is anomalous) | **await Vision Owner ground truth.** 45 % outside the church; same reasoning as `vw-kyr-13`. Prefer **remove** on Claude Code's own judgement. |
| `vw-kyr-kyrkbacken-lh` × church | 38.1 | 25.4 | 150 m² / house / 5.7 m | **nudge candidate.** 75 % of the footprint is outside the church. The "Kyrkbacken corner cluster" descriptive name suggests a corner position; if the actual corner is south of the church (Kyrkbacken meets Kyrkogatan south of the nave), a small nudge south could clear. Nudge distance: ~15–20 m south. **Vision Owner should confirm the intended position before nudge is applied.** |
| `vw-kyr-18` × church | 15.0 | 11.6 | 130 m² / house / 5.7 m | **shrink or nudge.** 12 % intrusion is an edge overlap. Either shrink the footprint by ~4 m on the church-facing side (retains the address's approximate centre), or nudge ~5 m north-east away from the church. Both are defensible; the Vision Owner should confirm which reflects the actual house geometry. |

**Aggregate church proposal:**

- 2 pairs → **remove** without preconditions (100 % / 90 % inside; no viable position).
- 3 pairs → **await Vision Owner ground truth** (Claude Code's judgement inclines to remove; Vision Owner can rescue with a confirmed nudge position).
- 1 pair → **nudge candidate** pending Vision Owner corner-position confirmation.
- 1 pair → **shrink or nudge** (Vision Owner selects).

Once these 7 are corrected (whichever mechanism), the church body is clear of `vw-*` intrusion. That is the specific defect the Vision Owner reported on 2026-07-30.

---

## 4. Priority 2 — the 1 Tempo intrusion (`w1250001245` = Tempo, 471 m²)

| Pair | A (m²) | f (%) | Intruder area / kind / height | Recommendation |
|---|---|---|---|---|
| `vw-skg-11` × Tempo | 56.4 | 40.3 | 140 m² / house / 5.7 m | **await Vision Owner ground truth.** "11 Skolgatan" and Tempo (a grocery store at 4 Skolgatan) sit on the same street. If the address "11 Skolgatan" is a real house east or west of Tempo, nudge to that position after confirmation. If the position was approximate and there is no #11 house adjacent, **remove**. Prefer **remove** on Claude Code's own judgement. |

Tempo is an identity landmark (OSM `w1250001245`, name "Tempo"). Its geometry does not move.

---

## 5. Priority 3 — 15 further `vw × w` pairs (synthetic × OSM)

`w*` stays; `vw-*` moves. Grouped by district for review coherence.

### 5.1 D03 Torget cluster (4 pairs)

| Pair | A (m²) | f (%) | vw kind / area | Recommendation |
|---|---|---|---|---|
| `vw-torget-east-lh` × `w869907977` | 145.4 | 42.8 | house / 495 m² | **shrink or nudge.** The "Torget east long-house" describes a placement zone along Torget's east edge; the OSM `w869907977` is a real building at that edge. The vw was likely intended to model the long-house that IS `w869907977` — potential **merge** (delete the vw; the w already covers the geometry). |
| `vw-torget-east-lh` × `w869907976` | 42.1 | 41.4 | house / 495 m² | Same "east long-house" vw overlapping another OSM building — reinforces the **merge/remove** reading. If the entire east-side long-house block is represented by w869907976 + w869907977 in OSM already, `vw-torget-east-lh` is redundant. **Remove**. |
| `vw-torget-north-lh` × `w869907971` | 123.4 | 60.9 | house / 540 m² | Same pattern: "Torget north long-house" overlapping OSM `w869907971`. **Remove** (redundant with OSM). |
| `vw-torget-kyrkbacken-pair` × `vw-torget-north-lh` | 63.3 | 22.0 | (both vw) | vw × vw — see §6 below. |

### 5.2 D08 Prästgatan (1 pair)

| Pair | A (m²) | f (%) | vw kind / area | Recommendation |
|---|---|---|---|---|
| `vw-pra-12s` × `w193810941` | 138.1 | 89.7 | apartments / 154 m² | **remove.** 90 % inside an OSM building — the vw is redundant modelling of what OSM already carries. |

### 5.3 D03/D06 Nygatan (2 pairs)

| Pair | A (m²) | f (%) | vw kind / area | Recommendation |
|---|---|---|---|---|
| `vw-nyg-1` × `w869907972` | 40.4 | 25.6 | apartments / 192 m² | **shrink or nudge.** Vision Owner ground truth on whether "1 Nygatan" is adjacent to the OSM building or overlapping it. Prefer **shrink** by ~5 m on the OSM-facing side; retains the centre. |
| `vw-nyg-20` × `w870510857` | 69.2 | 32.0 | apartments / 216 m² | **shrink or nudge.** Same reasoning. Prefer **shrink**. |

### 5.4 D13 Skolgatan (1 pair, non-Tempo)

| Pair | A (m²) | f (%) | vw kind / area | Recommendation |
|---|---|---|---|---|
| `vw-skg-9` × `w1250001244` | 49.3 | 35.2 | house / 140 m² | **shrink or nudge.** "9 Skolgatan" overlapping a nearby OSM building. Prefer **shrink** on the OSM-facing side. |

### 5.5 D05 Station corridor (1 pair)

| Pair | A (m²) | f (%) | vw kind / area | Recommendation |
|---|---|---|---|---|
| `vw-stn-8` × `w870510842` | 47.3 | 44.7 | industrial / 308 m² | **remove.** "8 Stationsgatan" as an industrial building — likely redundant with the OSM `w870510842` (Bergslagsbanan-era switching building). See ORDER 039 §3.3 for `w870510842`'s role. |

---

## 6. Priority 4 — 23 `vw × vw` pairs (both synthetic)

Case-by-case; either can adjust. I group by street to make the pattern visible.

### 6.1 Kyrkogatan cluster (11 pairs — dense zone)

Kyrkogatan carries the highest density of `vw-kyr-*` fill. Many pairs are adjacent houses whose Vision-Owner-placed footprints touched or slightly overlapped. Recommend a **coordinated re-spacing** rather than pair-by-pair fixes:

| Pair | A (m²) | f (%) | Recommendation |
|---|---|---|---|
| `vw-kyr-11` × `vw-kyr-13` | 52.0 | 65.0 | Adjacent houses overlapping substantially. **merge or nudge apart.** |
| `vw-kyr-12` × `vw-kyr-14` | 8.0 | 6.7 | Edge overlap. **shrink.** |
| `vw-kyr-14` × `vw-kyr-kyrkbacken-lh` | 30.0 | 25.0 | See church note for kyrkbacken-lh — its position is itself uncertain. **await Vision Owner ground truth** on kyrkbacken-lh, then re-evaluate. |
| `vw-kyr-16` × `vw-kyr-18` | 35.0 | 26.9 | See church notes — both are church-adjacent. **await Vision Owner ground truth** on 16's correct position, then re-evaluate. |
| `vw-kyr-16` × `vw-kyr-kyrkbacken-lh` | 32.0 | 21.3 | Same — **await**. |
| `vw-kyr-18` × `vw-kyr-20` | 30.0 | 23.1 | Adjacent houses. **nudge apart by ~2 m each.** |
| `vw-kyr-20` × `vw-kyr-20-garage` | 19.0 | 23.8 | House and its own garage overlapping. **nudge garage 3 m from house** (garage is a normal-shape auxiliary of the house). |
| `vw-kyr-20` × `vw-kyr-22` | 40.0 | 30.8 | Adjacent houses. **nudge apart by ~3 m each.** |
| `vw-kyr-20-garage` × `vw-kyr-22` | 11.25 | 14.1 | Same cluster. Resolves with 20-garage-nudge above. |
| `vw-kyr-22` × `vw-kyr-26` | 28.0 | 29.2 | Adjacent houses. **nudge apart.** |
| `vw-kyr-5` × `vw-kyr-5-barn` | 39.0 | 55.7 | House and its own barn overlapping. **nudge barn 4 m away from house.** |
| `vw-kyr-5-barn` × `vw-kyr-9` | 11.0 | 15.7 | Edge overlap. Resolves with 5-barn-nudge above. |
| `vw-kyr-1` × `vw-kyr-torget-lh` | 20.0 | 25.0 | Corner cluster. **shrink kyr-torget-lh** on the corner-facing side. |
| `vw-kyr-1-booth` × `vw-kyr-torget-lh` | 30.0 | 100.0 | 100 % of the small booth is inside `vw-kyr-torget-lh`. **remove** the booth (it's a synthetic decoration; the corner cluster covers the visible footprint). |

**Aggregate Kyrkogatan proposal:** Vision Owner sketches the intended row-spacing along Kyrkogatan (5–7 houses over ~150 m); Claude Code applies coordinated nudges + selective shrinks; the "await" pairs get resolved as a group once 16, 13, 11 and kyrkbacken-lh have Vision-Owner-confirmed positions.

### 6.2 Prästgatan cluster (5 pairs)

| Pair | A (m²) | f (%) | Recommendation |
|---|---|---|---|
| `vw-pra-16` × `vw-pra-19n` | 36.0 | 27.7 | Adjacent houses. **nudge apart.** |
| `vw-pra-20s` × `vw-pra-21` | 82.5 | 83.3 | Substantial overlap. Almost certainly meant to be a single building or two very close ones. **merge or remove one** (Vision Owner picks). |
| `vw-pra-4n` × `vw-pra-6n` | 48.75 | 49.2 | Adjacent houses. **nudge apart or shrink both.** |
| `vw-pra-4n` × `vw-pra-8` | 8.0 | 10.0 | Edge overlap. **shrink pra-4n** on pra-8 side. |
| `vw-pra-6n` × `vw-pra-8` | 35.75 | 44.7 | Adjacent houses. **nudge apart.** |

### 6.3 Torget cluster (1 pair, plus 2 already covered)

| Pair | A (m²) | f (%) | Recommendation |
|---|---|---|---|
| `vw-torget-kyrkbacken-pair` × `vw-torget-north-lh` | 63.3 | 22.0 | Both are descriptive-fill north-side cluster records. If `vw-torget-north-lh` gets **removed** per §5.1 (redundant with OSM `w869907971`), this pair resolves automatically. Otherwise **merge or nudge apart**. |
| `vw-kyr-torget-lh` × `vw-torget-bus-shelter` | 8.75 | 100.0 | 100 % of the small bus shelter is inside `vw-kyr-torget-lh`. **remove** the shelter or **nudge** to street edge. |

### 6.4 Badvägen lakeshore cluster (2 pairs)

| Pair | A (m²) | f (%) | Recommendation |
|---|---|---|---|
| `vw-bv-lakeshore` × `vw-bv-lakeshore-boathouse` | 9.18 | 38.2 | House and its own boathouse overlapping. **nudge boathouse ~4 m to lakeside** (matches "boathouse" descriptor — should be at the water). |
| `vw-bv-tree-cluster` × `vw-bv-tree-garage` | 5.31 | 15.2 | Edge overlap. **shrink or nudge garage.** |

---

## 7. Roll-up

| Recommendation | Count |
|---|---|
| **remove** | 8 (church: 2; Tempo-candidate: 1; redundant-with-OSM: 4; booth/shelter inside larger cluster: 2 — some are conditional) |
| **await Vision Owner ground truth** | 5 (church: 3; Tempo: 1; Kyrkogatan-cluster-cascade: covered by 3 primary + 2 dependent) |
| **shrink** | ~7 (edge-only overlaps, primarily `vw × w` and small `vw × vw`) |
| **nudge** | ~12 (adjacent-house pairs on Kyrkogatan / Prästgatan; garage / boathouse / booth adjustments) |
| **merge or remove-one** | 5 (Torget vw × w redundancies; `vw-pra-20s` × `vw-pra-21`; kyr-11 × kyr-13) |

Numbers add to > 39 because some pairs carry an OR between two categories, and some pairs resolve automatically once another pair's fix lands. **The 7 church intrusions and 1 Tempo intrusion are the priority per §6.**

---

## 8. What this proposal does NOT authorise

Per ORDER 040 §9 and this order's own scope:

- **No application.** This is a §6 proposal only; the fix lands in a follow-up order (ORDER 041 candidate).
- **No movement of any OSM (`w*`) building.** OSM geometry is stable per §6.
- **No change to identity landmarks' geometry** — church, Tempo, Kärnhuset, Gästgivaregård, Måltidens hus, Grythyttans gamla järnvägsstation.
- **No confirmation of any Category B (`vw-*` named entity) position.** That is ORDER 040 §4, whose `vision-owner` marking is §8-directive-blocked.
- **No adjustment "to fix composition"** — every proposed nudge / shrink / remove is because the coordinate chain places the building wrong, not because it looks wrong.
- **No change under `documentation/foundation/`.**
- **No change to `world.json`.** Zero data-file changes in this proposal's commit.
- **No new dependencies.**

---

## 9. Follow-up mechanism

Once the Vision Owner has reviewed:

1. **Accept-in-principle** the recommendations that are clear (remove-inside-OSM, adjacent-nudge, garage-nudge). Fix-order applies them, each fix removes its pair from `V21_ACCEPTED_OVERLAPS` in the same commit.
2. **Ground-truth-supply** for the *"await"* cases: Vision Owner marks the intended position of `vw-kyr-16`, `vw-kyr-13`, `vw-kyr-11`, `vw-kyr-kyrkbacken-lh`, `vw-skg-11`, and any others where nudge is contingent on real-position confirmation. Sheet format parallel to §4.1 confirmation sheet: id, current position, intended position, source (e.g. Street View tile URL or dated screenshot).
3. **Amend** any specific recommendation before the fix-order takes it (e.g. reject a merge, request a different nudge direction).

Once the fix-order lands, `V21_ACCEPTED_OVERLAPS` shrinks from 39 toward 0. The V21 validator then guards every future placement — the safety net that would have caught the church intrusions on original commit is now in place per ORDER 040 §7.

---

## 10. Acceptance (§6 wording restated)

- [x] Correction approach proposed for every one of the 39 tier-3 pairs.
- [x] 8 church intrusions treated as priority (§3 above).
- [x] OSM-derived buildings are not moved in any proposed recommendation.
- [x] `w × w` pairs reported separately — **zero exist in the current world**; no upstream question to report.
- [x] Pairs involving the 12 Category B named entities marked *"awaits §4 confirmation"* — **zero exist**; none of the 12 is in a tier-3 pair.
- [x] "If the building is wrong, nudge is wrong" boundary respected — where a `vw-*` intruder's correct position is uncertain, **remove** or **await Vision Owner ground truth** are preferred over fabricated nudges.
- [x] Presented; not applied. No change to `world.json`.
- [x] `npm run typecheck`, `npm run build`, `validate-references`, `parity-check`, `validate-world` all green — unchanged from the pre-§6 state.

---

*Author: Claude Code, ORDER 040 §6. Analysis via read-only Python + Shapely against `grythyttan-world.json` post-§2/§3 state; no data touched.*
