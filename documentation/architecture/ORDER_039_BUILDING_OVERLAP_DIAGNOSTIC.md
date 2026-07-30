# ORDER 039 — Building Overlap Diagnostic

**Version:** 1.0  
**Status:** Awaiting Vision Owner approval. Not in force until approved.  
**Class:** Sprint order — diagnostic only (precedence level 7)  
**Parent:** `PHASE_IV_PRODUCTION_PLAN.md` (visual acceptance criterion); `ADR_001_DIGITAL_TWIN_PHASE.md`  
**Registry:** register in `ORDER_REGISTRY.md` before execution, per `CLAUDE.md` rule 9  
**Recipient:** Claude Code  

---

## 0. Prerequisites

Verify the order number against `ORDER_REGISTRY.md`. If 039 is taken, stop and report — do not renumber.

---

## 1. Purpose

A Vision Owner review on 2026-07-30 reported that Grythyttans kyrka is not distinguishable in the render: the cross marker is present, but the church is occluded by, or overlapping with, adjacent building volumes.

**Twenty validators are green.** `validate-world.mjs` reports zero road-versus-building conflicts, resolved under ORDER 017a/018/019R. But no validator checks **building against building.** If two footprints intersect, or a building is placed where another already stands, nothing reports it.

That is the same class of defect as the phantom AVIF citation: mechanically detectable, and nobody looked.

This order looks. It changes nothing.

---

## 2. Geometric overlap sweep

Compute pairwise footprint intersection across all buildings in `grythyttan-world.json`.

Report every intersecting pair:

- both OSM way IDs
- both names where known, or `—`
- district
- intersection area in m², and as a percentage of the smaller footprint
- whether either is an identity-tier landmark

Sort by intersection area, largest first.

**Expect legitimate cases.** Loading bays, attached wings, courtyard structures and building complexes genuinely share edges or overlap slightly in OSM. Do not treat every hit as a defect. Distinguish, as far as the data allows:

- **Shared edge only** — adjacent buildings, terraced rows. Normal.
- **Small overlap** — likely OSM digitisation noise. Report but flag as probably benign.
- **Substantial overlap** — one footprint significantly inside another. This is what we are looking for.

Propose the threshold that separates the second from the third before reporting, and say what it is based on.

---

## 3. The church specifically

Independent of §2, report on `gry-kyrka`:

1. Its OSM way ID, footprint, and rendered height.
2. Every building whose footprint lies within 30 m of it, with way ID, name, footprint area and rendered height.
3. What OSM says each of those is — `building=*`, `amenity=*`, `landuse=*`, any tag that explains what it represents.
4. Whether any of them is a **non-building polygon rendered as a building** — a churchyard, a landuse area, a parcel boundary. That is a specific and plausible failure: OSM often carries `landuse=cemetery` or `amenity=place_of_worship` as an *area* separate from the church structure, and an ingest that treats every closed way as a building would extrude the churchyard into a volume.
5. The rendered heights of the neighbours compared to the church. A 6 m church beside a 12 m neighbour reads as occluded even with no overlap at all.

Point 4 and point 5 are the two most likely explanations, and they need different fixes. Establish which before anything is changed.

---

## 4. Height assignment audit

While the above is being read, report how building height is currently assigned: from OSM `height` or `building:levels` where present, from typology default otherwise, or some other rule.

For the buildings named in §3, state which mechanism produced each height and whether the source tag exists.

This is diagnostic context, not a change.

---

## 5. Visual confirmation

Take a screenshot of the church area from the dev server, at a camera angle where the problem is visible.

Save it to `documentation/references/district-1/kyrka/uploaded/` with a descriptive filename and a note that it is a render, not a reference. Per ORDER 036 §4 its `reviewState` treatment matters: **a render of our own output is never reference evidence.** If a manifest entry is created for it at all, it must be marked so it cannot contribute to aspect confidence.

Per `PHASE_IV_PRODUCTION_PLAN.md`, the acceptance criterion is visual. The screenshot is what the fix will be measured against.

---

## 6. What this order does not authorise

- Moving, resizing, deleting or hiding any building.
- Changing any height, footprint or geometry.
- Adding a validator. That comes after we know what it should catch.
- Changing the OSM ingest.
- Any fix of any kind. This order reports.
- Adjusting anything "to fix composition". Per `PHASE_IV_PRODUCTION_PLAN.md`, fix the coordinate chain, never the appearance.
- Any change under `documentation/foundation/`.

---

## 7. Referred to the Vision Owner

The report will make one thing decidable that currently is not: **what "the village is done" means.**

If it means *"I recognise the village"*, it will not arrive — five identity landmarks are `SYNTHESISED` under ADR 002 without aerial references, by your own decision of 2026-07-30.

If it means *"no geometric defects, no building in the wrong place, the church reads as a church"*, that is bounded and reachable, and this report tells you how far away it is.

Three months of world-building have happened without that criterion being stated. Stating it is not part of this order, but the report is the input to it.

---

## 8. Acceptance criteria

- Every intersecting building pair is reported, sorted by area, with the §2 classification applied.
- The overlap threshold was proposed with reasoning before the report was produced.
- All five §3 points are answered for the church.
- §4 states the height-assignment mechanism for each building named in §3.
- A screenshot exists, is marked as a render rather than a reference, and cannot contribute to aspect confidence.
- **No building geometry, height or position changed.** `git diff` shows no change under `frontend/src/strategic/data/`.
- `npm run typecheck`, `npm run build` and all existing validators green — unchanged, since nothing was modified.

---

**End of ORDER 039.**
