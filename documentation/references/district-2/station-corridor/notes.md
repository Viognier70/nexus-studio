# Old Station corridor — D2 zone notes

**Anchor landmark:** Grythyttans Gamla Järnvägsstation (`w870510841`) — FROZEN in District 1.
**Historical anchor:** Bergslagsbanan (BJ) line, opened 1876; Grythyttan operated as a full freight station through the mid-20th century, with a 12-track brick roundhouse at the southern end of the yard and a parallel stall for 4 locomotives added in the 1940s (demolished post-1946 electrification). Modern remaining industrial use is food-industry warehousing (per jarnvag.net Kil–Ställdalen banguide and Bergslagernas Järnvägssällskap history).

## Handcrafted target scope (5 buildings)

Every unnamed industrial or station-adjacent polygon within ~160 m of the station. The remaining ~30 buildings in the corridor stay at procedural fidelity per ORDER 011's industrial / shed / outbuilding sub-typology.

| OSM id | Kind | Distance from station | Footprint | Vertices | Likely function (context-inferred) |
|---|---|---:|---:|---:|---|
| `w870510842` | yes | 14 m | 106 m² | 6 | Station-adjacent outbuilding — possibly the BJ-era switching building noted in the banguide as "north of the stopping point" |
| `w870510839` | industrial | 38 m | 321 m² | 5 | Freight-yard warehouse (godsmagasin) — closest industrial to platform |
| `w870510833` | industrial | 129 m | 398 m² | 5 | Medium warehouse — likely modern food-industry per the "goods loaded to/from food industries in the area" note |
| `w870510834` | industrial | 153 m | 1 064 m² | 14 | Large multi-wing industrial complex — modern food industry, likely main storage/packing volume |
| `w870510823` | industrial | 156 m | 1 297 m² | 6 | Largest single warehouse in the corridor — modern food industry (likely main storage) |

## Public-source audit

### Sources consulted

- jarnvag.net banguide Kil–Ställdalen: https://www.jarnvag.net/banguide/kil-stalldalen
  - Grythyttan Ghy at km 152, passing track removed, new short platform south of old station.
  - "North of the Grythyttan stop is a former station house with a characteristic BJ-style station building and an associated switching building."
  - "Grythyttan was the endpoint of the small Svartälvs Järnväg railway until the 1930s."
- Bergslagernas Järnvägssällskap history: https://sites.google.com/view/bjs-hemsida/bj-historia
  - Confirms BJ line operation and Grythyttan's freight-station role.
- Järnvägshistoriskt forum thread "Lokstation i Grythyttan?": https://www.jvmv2.se/forum/index.php?mode=thread&id=49011
  - 1876 12-track brick roundhouse at southern end of rail yard, 12-metre turntable.
  - 1940s parallel stall with two tracks for four locomotives.
  - Post-1946 electrification: 20 m turntable relocated to Borlänge, parallel stall demolished.
- Wikimedia Commons Category:Grythyttan station: 2 files (no captioned architectural detail).
- OSM (Overpass export cached in `frontend/src/strategic/data/grythyttan-world.json`) — polygon geometry.

### Verified aspects (all 5 buildings)

| Aspect | Confidence | Source |
|---|---|---|
| Footprint | 1.00 | OSM per-building polygon (5–14 vertices each) |
| Placement | 1.00 | OSM polygon centroid |
| Orientation | 1.00 | Baked into polygon vertex order |
| Scale | 1.00 | OSM |
| Function class | 0.85 | OSM `kind=industrial` on 4 of 5; historical context strongly supports freight/warehouse use |
| Corridor era | 0.80 | Mix of BJ 1876–1946 heritage buildings and post-1946 food-industry warehouses per banguide + BJ history |

### ABSENT aspects (all 5 buildings)

- Individual building names (none of the 5 have OSM `name` tag)
- Architect (none identified)
- Wall material (typology-inferred: iron sheet or dark timber cladding — Bergslag industrial default)
- Wall colour (typology-inferred: dark iron sheet grey `#5a5750` or weathered Faluröd `#7a3626`)
- Roof form (typology-inferred: gable for barn-like buildings, flat for modern warehouses)
- Roof colour (typology-inferred)
- Windows, doors, loading-dock positions
- Ridge orientation on complex-shape polygons (heuristic: longest polygon edge)

### Confidence per building (ordinary tier ≥ 0.75)

All 5 buildings clear 0.75 based on: OSM footprint/placement/orientation/scale VERIFIED at 1.00; kind + historical context 0.80–0.85; wall/roof material typology 0.65. Overall ~0.77 each — all proceed to PHASE 1.

## Public sources exhausted

Beyond OSM polygons and the two railway-history sources cited, no per-building identification or imagery for these 5 anonymous industrial polygons is available in public sources. Vision Owner photographs would be needed to reach ≥ 0.90 landmark tier for any of them; without photographs they stay at ordinary tier with typology-driven material choices.

## Scope decision — buildings NOT handcrafted in this zone

The corridor contains ~36 unhandcrafted buildings within a 250 m radius of the station. The 5 selected here are the industrial / station-adjacent set whose distinct multi-vertex polygons benefit most from handcraft. The remaining ~30 (residential + small `yes` outbuildings) stay at procedural fidelity — the ORDER 011 shed / garage / outbuilding / residential sub-typology already handles them defensibly, and adding 30+ near-identical residential handcrafts would not measurably improve the digital twin.
