# Event Framework Reference

**Source of truth:** `EVENT_BY_CLASS` in `scripts/place-engine.mjs` + `reports/semantic/places.json[i].event_capabilities`.
**Constraint:** metadata only — no gameplay event scheduling implemented in this ORDER.

Every Place declares what KINDS of events it is capable of hosting. Future gameplay picks from this menu; the shell never requires structural change to host any capability on its list.

## Event capability distribution (current world)

23 distinct event kinds across 90 Places:

| Event | Places capable | Anchor classes |
|-------|----------------|----------------|
| Community gathering | many | Public Space / Religious / Historic Landmark |
| Festival | many | Public Space / Historic Landmark / Hospitality |
| Market | many | Public Space / Agricultural / Commercial Space |
| Lecture | some | Educational Institution / Historic Landmark |
| Cooking demonstration | some | Educational Institution / Hospitality |
| Wine tasting | some | Hospitality |
| Cultural performance | some | Historic Landmark / Public Space |
| Ceremony | some | Hospitality / Public Space |
| Concert | some | Religious |
| Sports event | some | Recreational |
| Innovation demo | some | Industrial / Research |
| Maker fair | some | Industrial |
| Trade fair | some | Industrial |
| Harvest event | some | Agricultural |
| Field school | some | Agricultural |
| Symposium | some | Research |
| Research seminar | some | Educational Institution |
| Student exhibition | some | Educational Institution |
| Alumni gathering | some | Educational Institution |
| Pop-up | some | Commercial Space |
| Product launch | some | Commercial Space |
| Private dining | some | Hospitality |
| Service | some | Religious |

Full histogram in `reports/semantic/places.json.summary.event_capability_distribution`.

## Assignment rule

`EVENT_BY_CLASS[place.classification]` — one map lookup per Place. Residential + Transport classes have empty event lists (private / functional shells).

## Contract for gameplay code (future)

A gameplay scheduler MUST:

1. Query `place.event_capabilities` before proposing an event.
2. Skip Places that lack the capability.
3. Respect Place `constraints` — some events (Festival, Market) need Places whose surroundings support them (a shell alone isn't enough; the district needs public space).

## District dominant events

`districts-identity.json[i].cultural_profile.dominant_events` surfaces the top-4 event capabilities per district. Vision Owner + future event designers use this to pitch district-scale programming.

## Extending

Add class → event list entry in `EVENT_BY_CLASS`. Regenerate. Every Place of that class picks up the new capability.
