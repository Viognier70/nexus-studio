# ORDER 038 — Rv 244 Curvature Layer

**Version:** 1.0  
**Status:** Awaiting Vision Owner approval. Not in force until approved.  
**Class:** Sprint order — production (precedence level 7)  
**Parent:** `ADR_001_DIGITAL_TWIN_PHASE.md` §2.2, §2.3; `SUPERSEDING_DIRECTIVE_002.md` §1 (decision B)  
**Registry:** register in `ORDER_REGISTRY.md` before execution, per `CLAUDE.md` rule 9  
**Recipient:** Claude Code  

---

## 0. Prerequisites

Verify the order number against `ORDER_REGISTRY.md`. If 038 is taken, stop and report — do not renumber.

---

## 1. Purpose

`APPROXIMATION_REGISTER.md` records Rv 244 (Hälleforsvägen) as deferred: OpenStreetMap carries only eight nodes across 446 m, and one stretch of roughly 175 m renders as a straight line where the road visibly curves.

This is not a defect in the ingest. It is missing data upstream.

`SUPERSEDING_DIRECTIVE_002.md` §1 records the Vision Owner's decision to trace the curvature, and notes that no new instrument is required: curvature control points read from public aerial imagery with the tile reference recorded already satisfy `ADR_001_DIGITAL_TWIN_PHASE.md` §2.2 as **verified**, not derived.

`NEXUS_GAMEPLAY_FRAMEWORK.md` §11.2 makes verisimilitude a competitive advantage, and `03_GRYTHYTTAN.md` required the village to be recognisable to people who know it. A 175 m straight run on the main road through the village is the first thing a resident sees.

---

## 2. Raw OSM data is not mutated

The traced points live in a **separate layer above** the raw geometry, in the same manner that `roadRoles.ts::displayNameFor` sits above raw `road.name`.

This is the load-bearing constraint of the order. A future OSM refresh must not silently discard the traced points, and must not silently overwrite raw data with them.

Report how the existing ingest pipeline handles layering before implementing, and follow the established pattern rather than inventing a second one.

---

## 3. Scope — road centreline only

The traced layer applies to **Rv 244 centreline geometry only**: ways `w1006222227` and the sparse segments of `w25514870` as identified in the register.

It does not extend to any other road, to building footprints, to water, or to terrain. Extending it requires its own order.

---

## 4. Method

1. **Read the register entry** for Rv 244 first. Do not re-derive what is already recorded.
2. **Identify the sparse stretch** precisely — which node pair, which coordinates, how long.
3. **Trace control points** from public aerial imagery along the actual curve. Enough points to render the curve smoothly; not so many that the layer becomes an unmaintainable point cloud. Propose the count and spacing before applying.
4. **Record provenance per point set**: the imagery source, the tile or viewpoint reference, the date read, and who read it. Per `ADR_001_DIGITAL_TWIN_PHASE.md` §2.2 this is what makes the points verified rather than invented — without it they are neither.
5. **Land the layer** in the format §2's report establishes.
6. **Verify visually.** Run the dev server and confirm the curve reads correctly against the aerial imagery. Per `PHASE_IV_PRODUCTION_PLAN.md`, the acceptance criterion is whether it looks like Grythyttan, not whether the validator passes.

---

## 5. Register the change

Add a change-log entry to `APPROXIMATION_REGISTER.md` recording:

- The traced layer, its source and its date
- That Rv 244 curvature moves from deferred to resolved
- Which aspects of the Rv 244 entry the tracing does **not** resolve

---

## 6. What this order does not authorise

- Mutating raw OSM geometry for any way.
- Tracing any road other than Rv 244.
- Tracing building footprints, water or terrain.
- Any change to `landmarks.json` or building fidelity.
- Recomputing any confidence score or threshold. ADR 002 §9 step 4 remains a Vision Owner gate.
- Adding dependencies. If a geometry helper is needed, report it and ask — `CLAUDE.md` rule 5 applies.
- Any change under `documentation/foundation/`.
- Adjusting road position or geometry "to fix composition". Per `PHASE_IV_PRODUCTION_PLAN.md`, fix the coordinate chain, never the appearance.

---

## 7. Acceptance criteria

- Raw OSM data for `w1006222227` and `w25514870` is unmodified.
- The traced layer sits above raw geometry in the established layering pattern, reported in §2 before implementation.
- Every traced point set carries source, tile or viewpoint reference, and date.
- The 175 m straight stretch renders as a curve matching the aerial imagery.
- Visual confirmation performed on the dev server, not inferred from data.
- `APPROXIMATION_REGISTER.md` records the change and what remains unresolved.
- Point count and spacing were proposed and approved before application.
- No other road, footprint, water body or terrain feature changed.
- `npm run typecheck`, `npm run build`, `validate-world.mjs`, `parity-check.mjs` and `validate-references.mjs` all green.
- One commit per section, no squash.

---

**End of ORDER 038.**
