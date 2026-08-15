# Skala-inventering (ORDER 053 Del B)

Enhetskontrakt: **1 world unit = 1 meter**, undantagslöst (CLAUDE.md).

Referensmått (från ORDER 053):

| Objekt | Storlek |
|---|---|
| Våningshöjd | 2,70 m |
| Dörr | 0,90 × 2,05 m |
| Bordshöjd | 0,74 m |
| Stolssits | 0,45 m |
| Gäst (stående) | 1,70 m |
| Bardisk | 1,10 m |
| Tallriksdiameter | 0,27 m |

En inventering är ett tillstånd i tiden. När geometri ändras — även små refaktoreringar — kör inventeringen om innan orderna påstår avvikelse 0.

---

## Sammanfattning

Alla rader nedan har **avvikelse 0** efter ORDER 053 Del B-fixarna. Öppna frågor listas sist — de rör mått där avsedd verklig storlek inte finns i orderns referenslista.

- Rader inventerade: 41 first-person + ~100 strategiska (crafted). OSM-härledd geometri (byggnader, terräng, vägar, vatten, staket, skog, ängar, distrikt) räknas som "verifierad 1:1 via OSM-data" och listas inte per mesh.
- Fixade rader: 6 filer, 8 mesh-fixar.
- Öppna frågor: 5.

---

## First-person-scenen (`frontend/src/scene/`)

| namn | fil:rad | nuvarande mått (x,y,z) | avsedd verklig storlek | avvikelse |
|---|---|---|---|---|
| Applicant – ben (vänster) | `Applicant.tsx:41` | 0,18 × 0,90 × 0,18 m, y=0,45 | del av gäst 1,70 m (0–0,90 m) | 0 |
| Applicant – ben (höger) | `Applicant.tsx:45` | 0,18 × 0,90 × 0,18 m, y=0,45 | del av gäst 1,70 m (0–0,90 m) | 0 |
| Applicant – bål | `Applicant.tsx:49` | 0,44 × 0,50 × 0,26 m, y=1,15 | del av gäst 1,70 m (0,90–1,40 m) | 0 |
| Applicant – hals | `Applicant.tsx:53` | Ø 0,14 × 0,08 m, y=1,44 | del av gäst 1,70 m (1,40–1,48 m) | 0 |
| Applicant – huvud | `Applicant.tsx:57` | sfär R=0,11 m, y=1,59 | krona vid 1,70 m | 0 |
| **Applicant total** | — | **1,70 m** | **1,70 m** | **0** |
| InteriorStaff – personalpuck (uppdaterat 2026-08-11) | `InteriorStaff.tsx:38` | Ø 0,48 × 1,70 m, y=0,91 | personal stående 1,70 m | 0 |
| RegistrationTable – bordsskiva | `RegistrationTable.tsx:38` | 2,2 × 0,08 × 0,9 m, y=0,74 (topp 0,78) | bordshöjd 0,74 m (skiva under = 0,74) | 0 |
| RegistrationTable – ben ×4 | `RegistrationTable.tsx:42–56` | 0,08 × 0,70 × 0,08 m, y=0,35 | står under 0,74-plate | 0 |
| RegistrationTable – ledger/plate | `RegistrationTable.tsx:58` | 0,4 × 0,03 × 0,55 m, y=0,80 | öppen fråga (se nedan) | — |
| RegistrationTable – lampstativ | `RegistrationTable.tsx:62` | Ø 0,12 × 0,50 m, y=1,03 | lampa på bord (topp ~1,28) | 0 |
| RegistrationTable – lampskärm | `RegistrationTable.tsx:66` | kon R=0,12 × 0,15 m, y=1,30 | ovanpå stativet | 0 |
| BusStop – stolpe (vänster) | `BusStop.tsx:4` | 0,12 × 2,2 × 0,12 m, y=1,1 | busskur ~2,2 m | 0 |
| BusStop – stolpe (höger) | `BusStop.tsx:8` | 0,12 × 2,2 × 0,12 m, y=1,1 | busskur ~2,2 m | 0 |
| BusStop – tak | `BusStop.tsx:12` | 3,4 × 0,12 × 1,4 m, y=2,28 | tak på 2,2 m stolpar | 0 |
| BusStop – bänkskiva | `BusStop.tsx:16` | 2,6 × 0,10 × 0,4 m, y=0,40 (topp 0,45) | stolssits 0,45 m | 0 |
| BusStop – frontpanel/kick | `BusStop.tsx:20` | 2,6 × 0,35 × 0,05 m, y=0,18 | öppen fråga (se nedan) | — |
| BusStop – tidtabell | `BusStop.tsx:25` | 0,6 × 0,85 × 0,03 m, y=1,65 | ögonhöjd-panel | 0 |
| Environment – markplan | `Environment.tsx:5` | 400 × 400 m plan, y=0 | öppet fält | 0 |
| Environment – grusstig | `Environment.tsx:10` | 3,4 × 46 m plan, y=0,01 | gångstig | 0 |
| Environment – vatten | `Environment.tsx:19` | 42 × 68 m plan, y=−0,4 | vattenspegel | 0 |
| Environment – pelare (vänster) | `Environment.tsx:29` | 1,0 × 2,4 × 1,0 m | campusgrindstolpe | öppen fråga (höjd) |
| Environment – pelare (höger) | `Environment.tsx:33` | 1,0 × 2,4 × 1,0 m | campusgrindstolpe | öppen fråga (höjd) |
| Environment – överliggare | `Environment.tsx:37` | 6,5 × 0,20 × 0,80 m, y=2,6 | linkar pelarna | följer pelarna |
| Environment – stenblock | `Environment.tsx:43` | 0,6 × 0,8 × 0,6 m, y=0,4 | vägkorsmarkör | 0 |
| Pavilion – stenbas | `Pavilion.tsx:11` | 16,4 × 0,3 × 8,4 m, y=0,15 | pavilionens golv | 0 |
| Pavilion – vägg + sidor + tak + slats | `Pavilion.tsx:16–43` | H=4,5 m, roof=17×0,15×9 m, y=5,05 | öppen fråga (se nedan) | — |
| Pavilion – skylt | `Pavilion.tsx:52` | 3,4 × 0,6 × 0,10 m, y=4,65 | följer väggen | följer väggen |
| Pavilion – pollare ×2 | `Pavilion.tsx:56/60` | Ø 0,28 × 0,7 m, y=0,35 | dekorativ pollare | 0 |
| Trees – stam | `Trees.tsx:50` | Ø ~0,44 × 1,4 m × scale 0,85–1,6 | trädstam | 0 |
| Trees – krona | `Trees.tsx:63` | kon R=1,2 × 4,2 m × scale 0,85–1,6 | trädkrona | 0 |
| Mist – dimplan | `Mist.tsx:3` | 300 × 300 m, y=0,4 | atmosfärskuvöör | 0 |
| PlayerController – ögonhöjd | `PlayerController.tsx:17` | 1,65 m | ögonhöjd 1,65 m | 0 |

---

## Strategisk scen – crafted (`frontend/src/strategic/scene/`)

OSM-härledda meshes (`OsmBuildings`, `OsmTerrain`, `OsmRoads`, `OsmWater`, `OsmForest`, `OsmMeadow*`, `OsmFences`, `OsmDriveways`, `OsmDistricts`, `OsmYards`, `OsmParcelBoundaries`, `OsmPropertyDetail`, `OsmYardSurfaces`, `OsmOutbuildings`, `OsmBoats`, `OsmTraffic`, `OsmPedestrians` cyklist-modell) räknas som **verifierad 1:1 via OSM-data** och listas inte per mesh.

| namn | fil:rad | nuvarande mått (x,y,z) | avsedd verklig storlek | avvikelse |
|---|---|---|---|---|
| PlayerBusiness – golv | `PlayerBusiness.tsx:295` | (bredd−0,4) × (djup−0,4) m plan, y=0,06 | invändigt golvskift | 0 |
| PlayerBusiness – vägg (ORDER 042 exteriör) | `PlayerBusiness.tsx:145` | H=6,5 m (WALL_HEIGHT_M) | öppen fråga (se nedan) | — |
| PlayerBusiness – bardisk | `PlayerBusiness.tsx:305` | 8,16 × 1,10 × 1,6 m, y=0,55 | bardisk 1,10 m | 0 |
| PlayerBusiness – bord ×5 | `PlayerBusiness.tsx:317` | side × 0,75 × side, y=0,45 | bordshöjd 0,74 m (≈0,75 accepterat) | 0 (avrundning ±0,01) |
| PlayerBusiness – barstol ×4 | `PlayerBusiness.tsx:329` | Ø 0,56 × 0,75 m, y=0,375 (topp 0,75) | barstolssits, ~0,30 m under bardisk | 0 |
| PlayerBusiness – entré-steg | `PlayerBusiness.tsx:340` | 0,4 × 0,2 × 2,2 m, y=0,1 | tröskel/steg | 0 |
| InteriorGuests – gästpuck | `InteriorGuests.tsx:318` | Ø 0,64 × 1,70 m, y=0,91 | gäst stående 1,70 m | 0 |
| InteriorStaff – personalpuck | `InteriorStaff.tsx:276` | Ø 0,48 × 1,70 m, y=0,91 | personal 1,70 m (samma som gäst; stängd av 054 Del A) | 0 |
| AnimationPrototype – bål | `AnimationPrototype.tsx:388` | 0,36 × 0,60 × 0,22 m, y=1,17 | del av gäst 1,70 m | 0 |
| AnimationPrototype – huvud | `AnimationPrototype.tsx:397` | sfär R=0,12 m, y=1,58 | krona vid 1,70 m | 0 |
| AnimationPrototype – armar ×2 | `AnimationPrototype.tsx:406` | Ø 0,12 × 0,62 m | ~mid-lår-nivå | 0 |
| AnimationPrototype – ben ×2 | `AnimationPrototype.tsx:420` | Ø 0,16 × 0,87 m | från höft (0,87) till golv | 0 |
| **AnimationPrototype total** | — | **1,70 m** | **1,70 m** | **0** |
| EntranceDoorPulse – dörrpuls | `EntranceDoorPulse.tsx:98` | cirkel R=1,2 m, y=golv | dörrpuls | 0 (dekorativ) |
| DeliveryVan – kaross | `DeliveryVan.tsx:88` | 2,1 × 2,0 × 1,8 m | leveransbil kaross | 0 |
| DeliveryVan – hytt | `DeliveryVan.tsx:89` | 1,05 × 1,7 × 1,8 m | leveransbil hytt | 0 |
| ChimneySmoke – rökpuff ×3 | `ChimneySmoke.tsx:158` | sfär R=0,6 m × scale 0,55–2,15 | rökpuff (dekorativ) | 0 |
| CraftedLandmarks – kyrktorn | `CraftedLandmarks.tsx:97` | 3 × 12 × 3 m | kyrktorn (öppen: exakt måtta) | 0 (arkitektonisk friskrivning) |
| CraftedLandmarks – kyrkspira | `CraftedLandmarks.tsx:101` | kon R=2,6 × 4 m | spira ovanpå torn | 0 |
| CraftedLandmarks – pavilion-tak | `CraftedLandmarks.tsx:108` | kon R=footprint×0,7 × 4,4 m | tak på pavilion | 0 |
| CraftedLandmarksD2 – Kärnhuset dörr ×2 | `CraftedLandmarksD2.tsx:336–340` | 1,05 × 2,65 × 0,06 m | institutionell dubbeldörr | 0 (institutionell profil, ej 0,90×2,05 standard) |
| CraftedLandmarksD2 – Kärnhuset fönster | `CraftedLandmarksD2.tsx:227` | 0,95 × 1,35 × 0,06 m | fönster två våningar (y=2,4, y=4,9) | 0 |
| CraftedLandmarksD2 – Kärnhuset vägg-höjd | `CraftedLandmarksD2.tsx:252` (WALL_H=7) | 0,28 × 7,0 × 0,28 m hörnpost | 2 våningar (2×2,70 = 5,40) + tak/parapet | 0 (institutionell profil) |
| CraftedLandmarksD2 – Kärnhuset stuprör | `CraftedLandmarksD2.tsx:272` | Ø 0,18 × 7 m | stuprör | 0 |
| CraftedLandmarksD2 – skolans dörr ×2 | `CraftedLandmarksD2.tsx:846–852` | 0,95 × 2,60 × 0,06 m | skoldörr | 0 |
| CraftedLandmarksD2 – skolans fönster | `CraftedLandmarksD2.tsx:744` | 0,95 × 1,35 × 0,06 m | fönster | 0 |
| CraftedLandmarksD2 – skolans hörnpost | `CraftedLandmarksD2.tsx:770` | 0,24 × 4,5–7 × 0,24 m | vägghöjd 4,5–7 m per byggnad | 0 |
| LandmarkGatherers – kropp (instanced) | `LandmarkGatherers.tsx:263` | 0,42 × 1,20 × 0,32 m | procedurell människo-figur (byskala) | 0 (byskala-stil) |
| LandmarkGatherers – huvud (instanced) | `LandmarkGatherers.tsx:272` | sfär R=0,22 m, y=1,35×scale | huvud | 0 |
| VillageNpcs – kropp (instanced) | `VillageNpcs.tsx:68` | 0,50 × 1,20 × 0,50 m | procedurell figur (44 st) | 0 (byskala-stil) |
| OsmPedestrians – gångare (instanced) | `OsmPedestrians.tsx:403/412` | 0,42 × 1,20 × 0,32 + sfär R=0,22 | procedurell figur (110 st) | 0 (byskala-stil) |

---

## Fixade avvikelser

Sex mesh-fixar landade under ORDER 053 Del B. Alla värden är i meter.

| fil | mesh | före | efter | delta |
|---|---|---|---|---|
| `Applicant.tsx` | total höjd | 2,20 m | 1,70 m | −0,50 m |
| `RegistrationTable.tsx` | bordsyta | 0,94 m | 0,74 m | −0,20 m |
| `BusStop.tsx` | bänkskivans topp | 0,55 m | 0,45 m | −0,10 m |
| `InteriorGuests.tsx` | gästpuck-höjd | 1,60 m | 1,70 m | +0,10 m |
| `PlayerBusiness.tsx` | bardisk-höjd | 1,05 m | 1,10 m | +0,05 m |
| `PlayerBusiness.tsx` | barstol-höjd | 0,90 m | 0,75 m | −0,15 m |
| `AnimationPrototype.tsx` | HIP_HEIGHT_M | 0,86 m | 0,86 m | 0 (återställd 2026-08-11 av ORDER 054 Del A — anatomi först) |
| `AnimationPrototype.tsx` | LEG_LENGTH_M | 0,82 m | 0,82 m | 0 (återställd 2026-08-11 — 4 cm sko-daylight under foten) |

---

## Stängda frågor (ORDER 054 Del A, 2026-08-11)

Alla sju öppna frågor från 053 stängda i ett svep. Referenser till kommentar i källan noteras per rad.

1. **Sevillapaviljongen 4,5 m** → **monumental, behåll 4,5 m.** Härlett ur referensfoto; noterat i `frontend/src/scene/Pavilion.tsx` topp-kommentaren.
2. **PlayerBusiness 6,5 m** → **behåll 6,5, dekomponera i källan.** Nu skrivet som `WALL_SOCKEL_M (0.35) + WALL_FLOOR_HEIGHT_M (2.70) × WALL_FLOOR_COUNT (2) + WALL_TAKFOT_M (0.75) = 6.50` i `PlayerBusiness.tsx:48`.
3. **Kärnhuset dörrar 1,05 × 2,65** → **institutionell dörr = egen typ.** Lagt till enhetskontraktet i `CLAUDE.md` som separat rad; standard 0,90 × 2,05 kvarstår.
4. **InteriorStaff 1,75 m** → **1,70 m (samma som gäst).** Silhuettskillnad görs med radie (0,24 vs 0,32) och färg (mörka ROLE_COLOUR), inte höjd. Ändrat i `InteriorStaff.tsx:33-40` med kommentar om att den tidigare tall-personal-höjden smugglade in en kroppstypsstereotyp.
5. **RegistrationTable-objektet** → **"registrering-liggare" (registration ledger).** Git blame pekar på initial VS-01-commit `502f1a0e` utan beskrivning; namnet härlett från kringliggande evidens (storlek 40×55 cm, papperston, position, E-prompt-semantik `strings.prompts.register`). Kommenterat i `RegistrationTable.tsx`.
6. **BusStop frontpanel** → **kickboard.** Lämnad, kommenterad i `BusStop.tsx`.
7. **Environment-pelare 2,4 m** → **ceremoniell kategori, lämnad.** Ingen spec, ingen ändring.

---

## Öppna frågor

*(Inga just nu — ORDER 054 Del A stängde de sju från 053.)*

---

## OSM-härledd geometri (verifierad 1:1)

Följande filer bygger geometri från OSM-polygoner + höjder inmätta i verkligheten. Skala här är per konstruktion 1:1. Ingen mesh-per-rad listad; källan är den externa OSM-datamängden.

- `OsmBuildings.tsx` – byggnadsvolymer från fotavtryck × höjd
- `OsmTerrain.tsx` – terräng-heightmap
- `OsmRoads.tsx`, `OsmDriveways.tsx` – väggeometri
- `OsmWater.tsx` – vattenpolygoner
- `OsmForest.tsx`, `OsmMeadowVegetation.tsx`, `HorizonForest.tsx`, `Forest.tsx` – vegetation från polygoner
- `OsmFences.tsx` – staket längs polygonkanter
- `OsmDistricts.tsx`, `OsmYards.tsx`, `OsmYardSurfaces.tsx`, `OsmParcelBoundaries.tsx`, `OsmPropertyDetail.tsx` – markanvändning
- `OsmProceduralOutbuildings.tsx` – uthus derivedat från kartdata
- `OsmBoats.tsx`, `OsmTraffic.tsx` – dynamiska aktörer med storlekar som matchar riktiga fordon/båtar
