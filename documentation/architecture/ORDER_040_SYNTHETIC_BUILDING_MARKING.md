# ORDER 040 — Synthetic Building Marking and Densifier Repair

**Version:** 1.0  
**Status:** Awaiting Vision Owner approval. Not in force until approved.  
**Class:** Sprint order — production (precedence level 7)  
**Parent:** `ADR_002_SYNTHESIS_POLICY.md` §2.1–§2.3; `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §5  
**Input:** `BUILDING_OVERLAP_DIAGNOSTIC_REPORT_ORDER_039.md`  
**Registry:** register in `ORDER_REGISTRY.md` before execution, per `CLAUDE.md` rule 9  
**Recipient:** Claude Code  

---

## 0. Prerequisites

Verify the order number against `ORDER_REGISTRY.md`. If 040 is taken, stop and report.

`BUILDING_OVERLAP_DIAGNOSTIC_REPORT_ORDER_039.md` must be in the repository. If not, stop.

---

## 1. Vision Owner decision, 2026-07-30

> **Appearance need not match reality. Position must.**

This resolves a tension the documents did not previously carry. `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §5 requires every specific fact to be verified or marked, and can be read to demand that every building resemble its real counterpart. It does not.

The distinction:

- **Appearance** — wall colour, roof shape, window rhythm, storey count. An approximation. Getting it wrong is a fidelity shortfall, not a false claim.
- **Position** — where a thing is. A fact. Placing a real institution where it does not stand is a false statement about the village.

The 87 handcrafted `vw-*` buildings are kept. What changes is what they claim.

§8 records the instrument required to make this binding.

---

## 2. Schema — the marking field

`RawBuilding` in `frontend/src/strategic/content/world.ts` has no field for verification state. Add one.

**Minimum vocabulary:**

- `osm` — geometry from OpenStreetMap
- `synthesised` — handcrafted; makes no claim beyond "a building stands here"
- `vision-owner` — position supplied by the Vision Owner, not OSM-derived

Propose the field name and whether a fourth value is needed before applying it.

**Required at compile time.** A new building must not be authorable without it. That compile-time requirement is the durable part of this order — the same reasoning as ORDER 037 §2.

Backfill: 274 `w*` buildings as `osm`, 1 relation-based `r*` building as `osm`, and all 87 `vw-*` as `synthesised`.

**Correction 2026-07-30 (Vision Owner):** the original clause exempted `vw-qvarn` on the basis of its landmark record's `resolvedFrom: "vision-owner-2026-07-26"`. That reasoning was wrong. A `resolvedFrom` value shows a record was **written under that reference**; it is not evidence the cited authority **confirmed** the underlying position. All twelve Category B named entities (including `vw-qvarn`) go on the §4.1 sheet at `synthesised`, and `vision-owner` is set only after the Vision Owner marks the sheet. Pattern also captured under memory `feedback_citation_is_not_endorsement.md`.

---

## 3. Category A — the 75 anonymous fill buildings

53 address-only, 17 descriptive, 5 unnamed.

### 3.1 Remove the address names

`"9 Kyrkogatan"`, `"16 Kyrkogatan"`, `"20 Prästgatan S"` and the rest are **claims about specific properties**, and `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §5 names addresses first in its list of facts that may not be invented.

The name is not needed to render the building. Remove it.

If the identifier is needed internally, keep it in `id` — `vw-kyr-9` carries no claim, `"9 Kyrkogatan"` does.

Report first whether any name is displayed to the player anywhere — street labels, selection cards, tooltips. If none is, removal is invisible and free. If some are, say which before removing.

### 3.2 Descriptive names may stay

`"Torget east long-house"`, `"Kyrkogatan back-lot cream villa"` describe placement, not identity. They claim nothing about the real world and are useful to whoever reads the data.

### 3.3 Mark them

All 75 become `synthesised` per §2.

---

## 4. Category B — the 12 named real entities

Grythytte Qvarn, Djurskyddet Vilsna Tassar, Sörgårdens Äldreboende, Jaktakademin, Grythyttan Stålmöbler, Barbellclub Bergslagen, Grythyttans förskola, SolidFeet, Icopal Skifferverk, Takskifferspecialisten AB, Grythyttevikens Skiffertak AB, CSVWellness.

These are kept. Their appearance is an approximation and that is acceptable. **Their positions are factual claims and need confirming.**

Seven of the twelve were recorded by `FULL_MAP_AUTHENTICITY_AUDIT_ORDER_019R.md` §9 as visible in Vision Owner reference screenshots — evidence they exist, not that they are correctly placed.

### 4.1 Produce a position confirmation sheet

For each of the twelve: name, current local coordinates, nearest named street, and a one-line description of the surroundings as the data shows them — *"north side of Prästgatan, between the INGO forecourt and the Torget corner"*.

Include a rendered overview image with the twelve marked, if that can be produced without adding dependencies.

The Vision Owner marks each **confirmed**, **wrong — move to X**, or **unsure**.

### 4.2 Do not move anything

This order produces the sheet. Corrections follow in their own order once the sheet comes back.

### 4.3 Marking

The twelve become `vision-owner` once confirmed, `synthesised` while unconfirmed. An unconfirmed named entity may not carry a marking that implies its position is established.

---

## 5. Repair the densifier

`scripts/densify-villagerings.mjs` states it skips positions overlapping existing buildings, water, forest polygons, or landmark zones. ORDER 039 found 39 substantial overlaps, 8 inside the church and 1 inside Tempo. The skip logic does not work.

1. **Find out why.** Read it and report the cause before changing anything. Likely candidates: bounding-box test instead of polygon intersection, landmark zones read from a list that omits handcrafted landmarks, or the check running before placement rather than after.
2. **Fix it**, matching the existing style in `scripts/`.
3. **Verify** by re-running the ORDER 039 sweep. Report the new tier-3 count.

**Do not regenerate the 87 buildings.** The script is repaired for future runs. The existing 39 overlaps are corrected in §6.

---

## 6. The 39 overlaps

Once §5 is repaired, propose a correction approach for the existing tier-3 pairs. Options include nudging the synthetic building clear, shrinking its footprint, or removing it where the position is untenable.

**Present the proposal. Do not apply it.** The 8 church intrusions are the priority; the rest can follow.

OSM-derived buildings are never moved. Where an overlap is between two `w*` buildings, report it separately — that is an upstream data question, not ours to fix by nudging.

---

## 7. Add the validator

Once §6 is applied, add a validator that fails when two building footprints overlap above the ORDER 039 tier-3 threshold, excluding pairs recorded as accepted exceptions.

Register it in `VALIDATOR_REFERENCE.md`.

Twenty validators were green while eight buildings sat inside the church. This is the gap that allowed it.

---

## 8. Instrument required

§1 states a principle the current documents do not carry: appearance is approximation, position is fact.

`EXECUTIVE_DESIGN_DIRECTIVE_001.md` §5 is directive-level and states there is no third option between verified and `VERIFICATION REQUIRED`. §1 introduces a distinction within that — one class of fact requiring verification, another explicitly not.

**This requires a Superseding Directive.** This order does not create it, and §1 is not binding until it exists. Report this as the first item of the order's output so it is not forgotten.

---

## 9. What this order does not authorise

- Moving, resizing or deleting any building. §6 proposes only.
- Regenerating the 87 via the densifier.
- Changing any OSM-derived building's geometry.
- Adding the §7 validator before §6 is applied.
- Creating the §8 directive.
- Removing descriptive names per §3.2.
- Confirming any Category B position on Claude Code's own judgement. §4.1 produces a sheet; the Vision Owner marks it.
- Any change under `documentation/foundation/`.

---

## 10. Acceptance criteria

- The marking field exists, is required at compile time, and every one of the 362 buildings carries a value.
- Address names removed from the 53; descriptive names intact; a report on player-facing name usage was delivered before removal.
- The §4.1 confirmation sheet exists and is awaiting Vision Owner marking.
- No Category B building moved.
- The densifier cause is reported before the fix, and the post-fix tier-3 count is stated.
- The §6 proposal is presented and unapplied.
- The §8 directive requirement is reported as the first output item.
- `npm run typecheck`, `npm run build` and all validators green.
- One commit per section, no squash.

---

**End of ORDER 040.**
