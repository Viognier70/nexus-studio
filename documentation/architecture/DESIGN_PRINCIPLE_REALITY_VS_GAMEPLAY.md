# Canonical Design Principle — Reality vs Gameplay

**Status:** CANONICAL — supersedes any workflow rule that conflicts.
**Author:** Vision Owner statement, 2026-07-25.
**Applies to:** every ORDER from 026 onwards.

---

## The principle in one line

**Grythyttan gives the geography. The game gives the future.**

## What is canonical

The **spatial world** must match reality as closely as practical:

- Building footprint
- Building position
- Building orientation
- Number of buildings
- Streets
- Roads
- Footpaths
- Water
- Forest
- Terrain
- District layout

A resident of Grythyttan should immediately recognise the village.

## What is NOT canonical

**Function.** A building is not permanently tied to its present-day real-world use. It represents a **potential place inside Nexus**.

An ordinary Swedish villa can become — without moving a single wall:

- Café · Bakery · Cheese shop · Winery
- Artist studio · Boutique hotel · Cooking school
- Student housing · Research lab · Community kitchen
- Micro brewery · Design studio · Pop-up restaurant · Food laboratory

The shell stays. The gameplay evolves.

## What Nexus Studio is (and is not)

Nexus Studio is **not** a digital copy of Grythyttan.

It is a **simulation platform grounded in Grythyttan**.

- The real village provides: geography, history, identity, architectural language.
- The game provides: future, businesses, people, innovation, stories.
- The player participates in **how the village evolves**, not in **preserving the village as it is**.

The Digital Twin is not a museum. It is a **living laboratory**.

## Production priority ladder

Every review, ORDER, and correction cycle must order work by this ladder:

### HIGH priority
- Correct footprint
- Correct placement
- Correct road network
- Correct districts
- Correct terrain
- Correct landscape

### MEDIUM priority
- Facade character
- Roof shape
- Window rhythm
- Materials
- Colours

### LOW priority
- Exact present-day tenant
- Current shop branding
- Current owner
- Current business
- Temporary signs
- Furniture

## Implications for existing workflow

### `LANDMARK_PROGRAM.md`
- **Historic-tier landmarks** (Kyrka, Gästgivaregården, Station, Kärnhuset, Måltidens Hus, Herrgården) are appropriate — their SHELL is the anchor. Their current tenancy is not the point.
- **Recognition-tier landmark records for present-day tenants** (Tempo, INGO, Direkten, Kantin Hyttblecket, Bergslagshus AB, Guldkringlan, Cornelis, Antikvariat, Glass & Choklad) are POI markers that document a current tenant. They are useful for wayfinding today; in gameplay, they are one possible content of the shell they sit in.
- Adding new landmarks for current shops is Low priority.
- Adding correct footprints for buildings that DON'T yet render is High priority.

### `VISION_REVIEW_WORKFLOW.md`
- §1 Position, §2 Roads, §3 Buildings — massing → HIGH priority. Fail approval on defects here.
- §4 Buildings — facade → MEDIUM priority. Log at Medium; ship if only Medium remains.
- §5 Landmarks — recognition → REFRAMED. Recognition should be:
  1. Footprint recognisable at map view.
  2. Shell shape recognisable at building view.
  3. Whether the current tenant matches is LOW.
- §7 Overall recognition — the question is "does this look like Grythyttan the place", not "does this look like Grythyttan the shop directory".

### `PHASE_IV_PRODUCTION_PLAN.md`
- Fixing a footprint, road, or district assignment: prioritise.
- Facade fidelity work (ORDER 021A window / door / roof fixes): keep.
- Handcrafting a current shop's signage: deprioritise unless the shop is Historic-tier.

### District freeze verdicts
- A district CAN be frozen with Low-priority tenant-marker inaccuracies documented as waivers.
- A district CANNOT be frozen with High-priority footprint / placement defects.

## Concrete examples

### An abandoned warehouse
Correct footprint + correct road access = HIGH priority. Player can then turn it into:
- Food incubator → Micro brewery → Restaurant → International food festival

### The current INGO petrol station
- Correct footprint at (368, −12): HIGH — shell must exist.
- Roof canopy geometry appropriate to a petrol station: MEDIUM — shell should be expressive.
- Ingo-brand signage: LOW — the shell could equally host a farmer's market, a cheese cellar, or a food truck park.

### Guldkringlan bakery inside the Torget long house
- Long house footprint at world (20, 32): HIGH — shell must exist.
- 3-storey Falu-red timber massing: MEDIUM — shell must be characteristically Bergslag.
- "Guldkringlan" specifically as bakery: LOW — the shop could equally host Cornelis restaurant tenants (as it does), or a future wine bar / cheese shop / cooking school.

## What this rules OUT

- ❌ Rejecting a district freeze because a tenant marker points at the wrong current business.
- ❌ Handcrafting per-shop signage as a landmark-tier deliverable.
- ❌ Rebuilding a building's massing because the current tenant changed.

## What this rules IN

- ✅ Rejecting a district freeze because a footprint is missing or misplaced.
- ✅ Handcrafting the church, Gästgivaregården, station — Historic-tier shells that anchor identity.
- ✅ Building the interior / tenant simulation surface as gameplay, atop the frozen spatial layer.

## Related canonical docs

- `PHASE_IV_PRODUCTION_PLAN.md` — production cycle.
- `LANDMARK_PROGRAM.md` — tier definitions.
- `VISION_REVIEW_WORKFLOW.md` — review checklist ordering.
- `documentation/architecture/DEVELOPER_REVIEW_GUIDE.md` — reviewer's fast paths.

---

*Recorded 2026-07-25 as Vision Owner statement. Every future ORDER cites this document when the reality/function boundary is at stake.*
