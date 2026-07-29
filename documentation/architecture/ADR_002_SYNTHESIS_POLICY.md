# ADR 002 — Synthesis Policy and Reference Cluster Structure

**Version:** 1.1
**Status:** Proposed. Awaiting Vision Owner approval.
**Date:** 2026-07-28
**Deciders:** Vision Owner
**Author (recording):** Claude (chat)
**Class:** Architecture Decision Record — world production
**Precedence:** Level 3 (per `ADR_001_DIGITAL_TWIN_PHASE.md` §4)
**Parent:** `ADR_001_DIGITAL_TWIN_PHASE.md`
**Companions:** `documentation/world/APPROXIMATION_REGISTER.md`, `documentation/references/README.md`

**Changes in v1.1:** adds §7 (agent memory is derived, never primary) following the ORDER 033 memory audit, and §8.5 recording the specific corrections required to `reference_confidence_rule.md`. Section numbers after §6 have shifted.

---

## 1. Context

Phase IV production is blocked in a specific and uneven way.

The ORDER 033 reference audit established the current position:

- **No landmark reaches the 0.90 identity threshold.** Every identity-tier landmark is blocked by at least one aspect that ground-level photography cannot resolve — footprint, roof form, roof colour.
- **Two clusters pass ordinary tier.** `d2-station-corridor` at 0.77 and `d2-school-complex` at 0.76.
- **Seventy Street View images of ordinary buildings have nowhere to go.** `documentation/references/` contains folders for named landmarks only.
- **Three landmarks have images but no manifest** — `gry-glass`, `gry-pizzanshus`, `gry-herrgard`.
- **Two landmarks have no images at all** — `gry-antik`, `gry-cornelis`.

The blocking aspects are consistent across every identity landmark, and all of them are visible from aerial or oblique imagery. This is not a research problem measured in months. But the village cannot remain unbuilt while it is solved.

`ADR_001_DIGITAL_TWIN_PHASE.md` §2.3 established `APPROXIMATION` as a labelled interim state. This ADR extends that reasoning to the case where an entity will be rendered from typology rather than from reference, and makes that condition equally visible and equally reversible.

---

## 2. Decision

### 2.1 Two tiers, made explicit

The existing threshold policy is confirmed and stated plainly.

**Ordinary tier — 0.75.** Architectural detail may be synthesised from Bergslagen typology. This covers every building not on the identity landmark list: the anonymous dwellings along Kyrkogatan, Nygatan, Badvägen, Magasinsgatan, Hantverksgatan, and all residential, outbuilding and industrial stock across the fifteen districts.

No change. This is how all 274 buildings already work. Synthesis at ordinary tier is the **default**, not an exception.

**Identity tier — 0.90.** The named landmarks a Grythyttan resident recognises. Synthesis is permitted here under §2.2, but never silently.

### 2.2 The `SYNTHESISED` state

An identity-tier entity that cannot reach 0.90 may be rendered from typology, provided it is recorded as `SYNTHESISED`.

`SYNTHESISED` is a third lifecycle state alongside `VERIFIED` and `APPROXIMATION`. It differs from `APPROXIMATION` in kind, not degree:

- `APPROXIMATION` — a well-defined default stands in for a fact that has a known route to verification.
- `SYNTHESISED` — the entity is rendered from typology because reference material does not exist or has not been collected, and the render is not claimed to resemble the real building in the synthesised aspects.

Every `SYNTHESISED` entity carries:

- the aspects that are synthesised, named individually,
- the aspects that remain verified, named individually,
- the reference type that would resolve each synthesised aspect,
- the date the state was entered.

**Partial synthesis is the norm.** A landmark verified for wall material, wall colour, storey count and signage, but synthesised for roof form and footprint, records exactly that. It does not become wholly synthetic because two aspects are unresolved.

**Effect on the STOP rule.** An identity-tier entity below 0.90 previously had one route: stop and issue a reference request. It now has two. Stopping remains correct when the Vision Owner wants the reference collected before the entity is built. Recording as `SYNTHESISED` is correct when production should continue. Neither is automatic; the entity does not silently proceed, and it does not silently halt.

### 2.3 What `SYNTHESISED` does not license

- It does not license invention of **verifiable** facts. Addresses, names, ownership, opening dates and histories remain governed by `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §5 and `ADR_001_DIGITAL_TWIN_PHASE.md` §5.3. Nothing in this ADR touches those.
- It does not license **contradicting** a known fact. Where a reference establishes an aspect, synthesis may not override it. The Sevilla Pavilion flag mast is the worked example: it was rendered, then verified absent, then removed. Verified absence is verified knowledge.
- It does not license silence. **Unlabelled typological rendering of an identity landmark is invention and remains prohibited.** Labelled synthesis is permitted. The label is the entire difference.

### 2.4 Reversibility is the point

`SYNTHESISED` is not an outcome. It is a state with an exit.

When reference material arrives for a synthesised aspect, the aspect is re-derived from the reference and the state is updated. The register records the promotion in its change log, as it already does for `APPROXIMATION` → `VERIFIED`.

The list of `SYNTHESISED` aspects is therefore also the reference shopping list, and should be readable as one.

---

## 3. Scoring correction — verified absence

The audit found `flagMast` scored 0.10 for `gry-campus` while the mast is **verified absent**. A verified absence was being scored as an unknown, depressing overall confidence with a fact.

This is a defect in the scoring model, not in the data.

**Verified absence scores as verified.** An aspect confirmed not to exist is knowledge about the building and contributes to confidence on the same terms as a confirmed presence.

Aspects require an explicit tri-state — present, absent, unknown — rather than a single confidence number that conflates absence with ignorance. Where an aspect is verified absent, it may alternatively be removed from the aspect list with a note, but it may not remain as a low-scoring blocker.

Every aspect currently scoring below 0.30 is re-examined for this pattern before any threshold is recomputed.

---

## 4. Reference cluster structure

`documentation/references/` gains cluster manifests for ordinary buildings, mirroring the pattern already established by `d2-campus-surroundings`, `d2-school-complex` and `d2-station-corridor`.

The cluster manifest schema follows D2 exactly: `{ id, district, clusterZone, buildings: [{ osmWayId, aspects, ... }], collectedSources: [...], publicSourcesExhausted, sourcesFile }`.

Clusters are organised by street or corridor, not by building type. A street is how the images were collected, how they will be reviewed, and how the district freeze cycle proceeds.

Initial D1 clusters, sized from the ORDER 033 triage:

| Cluster | Images |
|---|---|
| `district-1/kyrkogatan-corridor` | 23 |
| `district-1/badvagen-corridor` | 12 |
| `district-1/magasinsgatan-corridor` | 11 |
| `district-1/nygatan-hantverksgatan` | 10 |
| `district-1/skolgatan-remainder` | 7 |
| `district-1/prastgatan-remainder` | 5 |
| `district-1/sorlagsvagen-kvarnvagen` | 5 |
| `district-1/jarnvagsgatan` | 2 |

Every image is bound to one or more OSM way IDs through the cluster's `collectedSources`. An image that cannot be bound to a way ID is recorded in the cluster with the binding left open, never bound by guess.

The single-index alternative considered — one `street-view-index` manifest covering all anonymous images regardless of street — is rejected. It is simpler to maintain but breaks the D2 pattern and does not align with the district freeze cycle.

### 4.1 Missing landmark manifests

Manifests are created for `gry-glass`, `gry-pizzanshus` and `gry-herrgard`, which have reference images and no folder. `gry-antik` and `gry-cornelis` get manifest stubs recording that no reference material exists.

### 4.2 Reference file location

All reference files live under `documentation/references/<district>/<entity>/uploaded/`. Manifest paths are relative to the manifest.

Thirteen reference files currently sit in the repository root while being cited by manifests under filename alone. They are moved and their paths corrected. The same defect previously affected `guldkringlan vid torget.avif` and went unnoticed for five days.

---

## 5. Integrity requirements

Two failures in this class have now occurred. Both are mechanically detectable and neither was detected.

### 5.1 Cited reference must exist

A validator fails hard when any manifest `collectedSources[].path` does not resolve to a file on disk. This is a build-blocking error, not a warning.

### 5.2 Machine-readable review state

Manifests currently record review status in prose. `guldkringlan vid torget.avif` was cited as a source, marked in prose as never read, and its filename alone shaped a manifest entry.

Every `collectedSources` entry carries an explicit machine-readable field recording whether the file has been read as an image. An unread source contributes to no aspect confidence.

### 5.3 Retroactive check

Before any threshold is recomputed: report every `confidenceByAspect` score whose justification cites a source that was never read as an image. Report only — no scores are adjusted without Vision Owner review.

---

## 6. Consequences

**Positive.** The village can be completed now. No entity is blocked. The synthesised set is explicit, small, and doubles as the reference collection list. The seventy orphaned images gain a home. The two integrity failures become impossible to repeat silently.

**Negative.** Identity landmarks will render without resembling their originals in the synthesised aspects until aerial imagery is collected. This is a known and recorded cost, not a hidden one.

**Risk, named.** The most likely failure mode is that `SYNTHESISED` becomes permanent — that the state is entered, the village looks finished, and the reference work never happens. The mitigation is that the state is visible in the register, listed per aspect, and reported at every district freeze. `DISTRICT_FREEZE_GUIDE.md` should treat an unresolved `SYNTHESISED` identity aspect as a freeze blocker, not a known issue.

**Rights.** Rendering a synthesised facade under the sign of an operating business is a different exposure from rendering a verified one. `gry-cornelis` and `gry-antik`, which have no reference material at all, are the sharpest cases. This is recorded here and referred to the rights register created by `ORDER_034_DOCUMENTATION_ALIGNMENT.md` §2. This ADR does not resolve it.

---

## 7. Agent memory is derived, never primary

The ORDER 033 memory audit found that `reference_confidence_rule.md`, held in Claude Code's memory directory, carries production rules — threshold values, a STOP rule, a prohibition on inventing architectural detail — that would block what this ADR permits.

That file is not in the repository. It is not versioned, does not appear in `git log`, was not reviewed by anyone, and nearly failed to survive the move from `~/Downloads` to `~/Projects`. It is nonetheless read at the start of every session and shapes production decisions.

This makes agent memory a fourth source of governance alongside the constitutional chain, the ORDER/ADR stream, and `DESIGN_PRINCIPLE_REALITY_VS_GAMEPLAY.md`. Unlike those three it is invisible to every participant except the agent holding it.

**Therefore:**

1. **Every memory rule that governs a production decision names the versioned document it derives from.** A memory rule without a citation is treated as invalid and is not applied.
2. **Memory summarises. It never extends or narrows.** Where a memory file states a threshold, a prohibition or a workflow, the repository document is the authority and the memory file is a convenience copy.
3. **On conflict, the repository wins.** The agent reports the conflict rather than resolving it in favour of memory.
4. **Memory files are audited when a governing document changes.** Adopting this ADR requires the corrections in §8.5. The same obligation applies to every future directive, ADR and order that touches a rule held in memory.
5. **Memory is not a place to record decisions.** Decisions live in the repository. If something is worth remembering across sessions and is not written down, that is a documentation defect, not a memory feature.

This section governs all memory files, not only `reference_confidence_rule.md`. Ten exist today and there will be more.

---

## 8. What this ADR does not do

- It does not modify `DESIGN_DECISIONS_001.md` or `EXECUTIVE_DESIGN_DIRECTIVE_001.md`. Per `ADR_001_DIGITAL_TWIN_PHASE.md` §4, an ADR may not modify Constitution or Directive text.
- It does not weaken `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §5. Guessing at verifiable facts remains prohibited.
- It does not authorise implementation. Cluster creation, the validator, the scoring correction and the file moves each require a production order.
- It does not assess rights.

---

## 9. Implementation sequence

1. Move the thirteen root-level reference files; correct manifest paths.
2. Add the §5.1 validator. Expect it to fail on first run; fix what it finds.
3. Add the §5.2 review field to the manifest schema.
4. Deliver the §5.3 retroactive report. **Vision Owner reviews before proceeding.**
5. Correct the scoring model per §3; re-examine every aspect below 0.30.
6. Create the eight D1 cluster manifests; bind the seventy images.
7. Create the manifests in §4.1.
8. Recompute thresholds. Record the resulting `SYNTHESISED` set in the register.
9. Update `DISTRICT_FREEZE_GUIDE.md` per §6.

Steps 1–3 are mechanical. Step 4 is a gate.

### 9.1 Memory corrections — on adoption, before any production work

`reference_confidence_rule.md` is corrected on the same day this ADR is accepted. Until then it blocks §2.2, and production against it would be incorrect in both directions.

| # | Current memory rule | Correction |
|---|---|---|
| 1 | Below ~90 % confidence, STOP and produce a reference request | STOP remains available. Recording as `SYNTHESISED` per §2.2 is the second permitted route. Neither is automatic |
| 2 | Never invent architectural detail | Unlabelled typological rendering of an identity landmark remains prohibited. Labelled `SYNTHESISED` rendering is permitted per §2.3 |
| 3 | `APPROXIMATION` is the interim state below 90 % | There are two interim states. `APPROXIMATION` where a verification route is known; `SYNTHESISED` where no reference exists. They differ in kind |
| 4 | *(absent)* | Verified absence is verified knowledge and raises confidence. Aspects are tri-state: present, absent, unknown. Per §3 |
| 5 | ~90 % as the single threshold | Two tiers: 0.75 ordinary, 0.90 identity. Synthesis at ordinary tier is the default for the 274 ordinary buildings, not an exception. Per §2.1 |

Each corrected rule cites this ADR as its source, per §7.1.

Every other memory file is then audited against §7 and reported. No memory file is rewritten beyond adding citations without a separate order.

---

**End of ADR 002.**
