# STREET PROFILE CATALOGUE — ORDER 031 Phase 3

> The spine of the place-character system. Every named street carries a StreetProfile that boundary / surface / vegetation / colour renderers consume.
> Source of truth: `frontend/src/strategic/content/streetProfiles.ts`.
> Evidence source: Vision Owner Street View screenshots + `RECOGNISABILITY_SURVEY.md`.

## What a StreetProfile is

Nine fields per street, plus identity narrative + evidence reference:

| Field | Purpose | Values |
|---|---|---|
| `vegetation` | Roadside verge density | `none` / `sparse` / `moderate` / `dense` / `tunnel` |
| `canopy` | Overhead tree coverage | `open` / `framed` / `tunnel` |
| `boundary` | Property-boundary style | `none` / `hedge` / `wooden-fence` / `picket-fence` / `wire-fence` / `stone-wall` / `retaining-wall` / `mixed` |
| `surface` | Yard / driveway / apron surface | `grass` / `gravel` / `asphalt` / `paving-stones` / `concrete` / `worn-dirt` / `mixed` |
| `slope` | Terrain reading (informs retaining walls) | `flat` / `gentle-slope` / `uphill` / `bowl` / `lakeshore` |
| `plot_openness` | Sightline behaviour from street | `open` / `partial` / `enclosed` |
| `tree_species` | Dominant verge species | `birch` / `conifer` / `mixed` / `ornamental` / `lime` |
| `tree_spacing_m` | Distance between trees along verge | 0 = none, else metres |
| `lighting` | Street furniture style (informs future pass) | `none` / `residential-pole` / `commercial` / `institutional-bollard` |
| `colour_tendency` | Building colour lean along the street | `faluröd-dominant` / `mixed-warm` / `cream-dominant` / `institutional-plaster` / `industrial-brick` / `weathered-timber` |

## Curated streets (17)

Every one derives from Vision Owner Street View evidence except the four peripheral streets marked "no direct observation" (Hammargatan, Åsgatan, Stentrygatan, Skiffergatan, Bergslagsgatan, Baluns väg, Kvarnvägen), which inherit best-fit profiles from adjacent surveyed streets.

### Village historic core

**Kyrkogatan** — `wooden-fence` boundary, `gravel` surface, `dense` vegetation, `framed` canopy, `uphill` slope, `faluröd-dominant`, birch + conifer mix at 12 m spacing.
Historic uphill village core. Dense timber walls, Faluröd + white trim dominant, mature trees frame the street. Sloped terrain reveals retaining walls on the uphill side.
Evidence: 10 SV shots.

**Torget** — `none` boundary (plaza), `paving-stones` surface, `bowl` slope, `faluröd-dominant`, birch alley at 10 m spacing.
Village plaza. Warm sandy-gravel surface (TorgetPlaza), buildings frame rather than enclose, birch alley defines western edge.
Evidence: 8 SV shots.

**Kyrkbacken** — `stone-wall` boundary, `gravel` surface, `uphill` slope, `faluröd-dominant`, tight 10 m tree spacing.
Church corner — sloped short street connecting Torget to the churchyard. Stone / low masonry boundaries typical of ecclesiastical ground.
Evidence: 2 SV shots.

### Institutional / school district

**Skolgatan** — `hedge` boundary, `gravel` surface, `dense` vegetation, `tunnel` canopy, `institutional-plaster`, birch at **8 m** spacing.
The birch tree tunnel that defines Grythyttan's school approach. Cited by the survey as the district's primary visual signature.
Evidence: 8 SV shots.

**Mässingsslatan** — `wire-fence` boundary, `asphalt` surface, `institutional-plaster`, birch at 14 m spacing.
School / care campus access. Paved institutional character, low wire fences around sports and playground areas.
Evidence: 10 SV shots.

### Commercial spine

**Prästgatan** — `mixed` boundary, `asphalt` surface, `sparse` vegetation, `open` canopy, `mixed-warm`, birch at 22 m spacing.
Rv 244 through-village character. Wider road, larger paved forecourts (INGO / Pizzans), sparse birch verges, minimal fencing on commercial frontages.
Evidence: 7 SV shots.

**Nygatan** — `hedge` boundary, `asphalt` surface, `framed` canopy, `industrial-brick`, birch at 18 m spacing.
Mixed light-industrial + residential corridor. The dominant red-brick industrial mass (Grythyttans Glass area) sets the palette.
Evidence: 7 SV shots.

**Lokavägen** — `wire-fence` boundary, `asphalt` surface, `open` canopy, `industrial-brick`, conifer at 26 m spacing.
Rv 205 through-village industrial corridor. Slate-industry cluster (Icopal, Takskifferspecialisten, Swedecote) fronts the road.
Evidence: 2 SV shots.

### Lakeshore residential

**Badvägen** — **`picket-fence`** boundary, `gravel` surface, `moderate` vegetation, `framed` canopy, `lakeshore` slope, **`cream-dominant`**, birch at 16 m spacing.
Lakeside villa street. White picket fences at every plot, gravel driveways, cream / pale-yellow rendered villas dominant (NOT Faluröd), mature birch and conifer backdrop, plots set well back on generous meadow.
Evidence: 9 SV shots — the palette-mismatch anchor of the survey.

### Peripheral (inherited from adjacent street evidence)

**Härjeredvägen** — `mixed` boundary, `gravel`, `sparse`, `open`, `mixed-warm`, mixed species at 24 m.
Peripheral residential fringe. Sparse density, isolated villas across meadow.
Evidence: 4 adjacent shots.

**Hammargatan** — `hedge` boundary, `gravel`, `moderate`, `framed`, `mixed-warm`, mixed at 22 m.
Mid-density residential street south of Prästgatan. Hedges dominant.
Evidence: inherited.

**Åsgatan** — `hedge`, `gravel`, `dense`, `framed`, `mixed-warm`, mixed at 12 m.
Åsen neighbourhood residential street, chapel area.
Evidence: inherited from western-edge shots.

**Stentrygatan** — `hedge`, `gravel`, `moderate`, `framed`, `mixed-warm`, mixed at 18 m.
Chapel-corner residential street.
Evidence: inherited.

**Skiffergatan** — `wooden-fence`, `gravel`, `moderate`, `framed`, `mixed-warm`, mixed at 18 m.
Northern residential access. Historic slate industry adjacent.
Evidence: inherited.

**Bergslagsgatan** — `mixed`, `gravel`, `sparse`, `open`, `mixed-warm`, mixed at 24 m.
Northern residential belt. Low residential density.
Evidence: inherited.

**Baluns väg** — `wire-fence`, `gravel`, `sparse`, `open`, `weathered-timber`, mixed at 30 m.
Rural agricultural / peripheral access. Fields and outbuildings, wire farm-style fencing.
Evidence: inherited.

**Kvarnvägen** — `hedge`, `gravel`, `moderate`, `framed`, `mixed-warm`, mixed at 20 m.
Mill road — leads to Grythytte Qvarn historic mill site. Rural / semi-rural character.
Evidence: inherited.

## What each field drives at runtime

| Field | Consumer(s) | Effect |
|---|---|---|
| `boundary` | `OsmFences.tsx` | Renders per-style geometry: picket / wooden / hedge / stone / wire. Neighbouring plots on the same street share style. |
| `surface` | `OsmYardSurfaces.tsx` | Renders yard-front surface patch in gravel / asphalt / paving / concrete / worn-dirt colours. Grass = skipped (would be invisible against terrain). |
| `vegetation` + `canopy` + `tree_species` + `tree_spacing_m` | `StreetTrees.tsx` | Determines species, spacing, offset from centreline, and density gate. Skolgatan (dense + tunnel + birch + 8 m) produces a tree tunnel; Prästgatan (sparse + open + birch + 22 m) produces isolated sentinel trees. |
| `slope` | `RetainingWalls.tsx` | `uphill` → single-side retaining wall; `bowl` → both-side wall; others → none. |
| `colour_tendency` | `OsmBuildings.tsx toExtruded` | Per-street tint pull on villa walls. Badvägen villas pulled cream; Nygatan brick-toned; Kyrkogatan stays Faluröd. Replaces the deleted ORDER 030 Tier 1b random distribution. |
| `lighting` | (future street-furniture pass) | Not yet consumed. Reserved for lamp-post / bollard placement. |
| `plot_openness` | (future setback pass) | Not yet consumed. Reserved for future setback / hedge-density modulation. |

## Fallback behaviour

Any named street NOT in the catalogue uses `DEFAULT_PROFILE` (moderate vegetation, framed canopy, `mixed` boundary, `gravel` surface, `flat` slope, `mixed` tree species at 24 m, `mixed-warm` colour tendency). Runtime never asks "what colour is this village?" — it asks "what does the closest named street want?" and inherits.

## Determinism

Every function reading a StreetProfile is pure. `nearestStreetProfile(x, z)` walks the road network once per building and returns the closest match. No randomness. No frame-to-frame variation.

## How to add a street

1. Vision Owner drops screenshots for the street into `documentation/references/grythyttan bilder/`.
2. Update `RECOGNISABILITY_SURVEY.md` with per-shot findings.
3. Add a `StreetProfile` entry to `CURATED` in `streetProfiles.ts` with evidence timestamps.
4. Typecheck + build. The renderers pick it up automatically.

No renderer code changes required to add streets.
