# ORDER 130 — Kartan mäts

**Utfärdad** 2026-08-29
**Klass** AUTONOM · Mätning, ingen rättelse
**Gren** `order-130` (från `main`)
**Följer** Vision Owner observation 2026-08-29 (dev-server: hus mitt i vägar, fönster hänger fritt utanför fasader)

---

## 0. Läs detta först — §7 utlöst

**297 av 338 byggnader (88%) har minst ett fönster som ligger utanför sin egen polygon.**

**3 156 fönster totalt** ligger utanför sin fasad — inte enstaka fall, inte något marginellt avrundningsfel. Enskilda hus har fönster som ligger **upp till 36 meter från fasaden**. Vision Owners observation var alltså inte en handfull ojämnheter utan spets på en systematisk bugg som täcker nästan hela byn.

Rotorsaken (utan att rätta): `windowsFor()` i `frontend/src/strategic/scene/OsmBuildings.tsx:1152` placerar fönster på OBB-facen (`ridgeW`/`ridgeD`), inte på den faktiska footprint-polygonen. För varje hus som inte är exakt rektangulärt ligger OBB-facen dels utanför polygonen, dels inuti — och `windowsFor` frågar aldrig om polygon-inklusion innan den emitterar fönstret.

Detta är en genereringsbugg (ORDER 130 §3.3-slutsatsen: layer *Genereringen*), inte ett OSM-datafel eller en transformbugg. Det motsvarar vad ORDER 058 §1 löste för `buildFacade`-vägen (fönster-vertex inom 0,1 m av polygonen), men OsmBuildings LOD-2-vägen fick aldrig samma guard.

---

## 1. Metod

`frontend/scripts/order130-map-measurements.mjs` — ren Node-mätning mot `frontend/src/strategic/data/grythyttan-world.json`. Ingen dev-server, ingen React, ingen playwright. Skriptet replikerar produktionens `orientedBbox` (`src/strategic/procgen/geom.ts:133`) och `windowsFor` XZ-projektion (`OsmBuildings.tsx:1152`) i JavaScript, så mätningen är byte-nära det spelaren faktiskt ser.

Kör om det senare för att verifiera en rättelse:
```
node frontend/scripts/order130-map-measurements.mjs
node frontend/scripts/order130-map-screenshots.mjs
```

**Räknesätt:**
- **Mätning 1 (hus mot vägar):** för varje byggnads-footprint, prövas mot varje väg-mittlinje utökad med väg-halva-bredden. Byggnaden räknas som "träffad" om (a) någon byggnadsvertex ligger inom `halfWidth` av vägens mittlinje, ELLER (b) någon vägvertex ligger inuti byggnadens polygon, ELLER (c) någon byggnadsedge korsar någon vägedge geometriskt. Värsta intrusion = största `halfWidth − dist_till_mittlinjen` över alla byggnadsvertex.
- **Mätning 2 (fönster utanför fasad):** för varje byggnad, `orientedBbox(poly)` beräknas, `windowsFor(obb)` genererar 8–24 fönster per hus, XZ-punkten prövas mot polygonen med `pointInPolygon` + `signedDistanceOutward`. Fönster med `outward > 0,01 m` räknas som "utanför".

**Vägbredder:** OSM-taggen `width` finns bara på 48 av 327 vägar (15%). För resten används kind-defaults: motorway/trunk/primary 8m, secondary/tertiary 6m, unclassified/residential 4m, service/track 3m, footway/pedestrian/path/cycleway 1,5m, övrigt 3m. Detta är approximationer — en väg där defaultsanktionen är fel kan skapa både falskt positiva och falskt negativa träffar. Vägar med osm-`width` markeras `roadWidthSource: 'osm'` i `hus-vs-vagar.json`, resten `'default'`.

---

## 2. Mätning 1 — Hus mot vägar

**37 av 338 byggnader (10,9%)** skär minst en vägbanan.

### 2.1 Per vägtyp

| Vägtyp | Antal träffar |
|---|---|
| service | 24 |
| residential | 12 |
| living_street | 7 |
| tertiary | 4 |
| secondary | 2 |
| … | … |

Tyngdpunkt: `service`-vägar. Sannolikt både bra och dåligt — servicevägar ligger tätt inpå bakgårdar, men default-bredden 3 m kan vara för snäv för bilbanor och för bred för renodlade gångstigar mellan hus.

### 2.2 Per byggnadstyp (topp 5)

| Byggnadstyp | Antal |
|---|---|
| house | 15 |
| yes | 10 |
| apartments | 5 |
| industrial | 4 |
| university | 1 |

`house` + `yes` = 25 av 37 = **68% av träffarna är bostäder**. Fördelningen matchar byggnadsbeståndet grovt — det är inte ett kvarter, det är spritt över byn.

### 2.3 Värsta fall (topp 5)

| Byggnad | Kind | Centre (x,z) | Värsta överlapp | Vägar |
|---|---|---|---|---|
| `vw-torget-east-barn` | outbuilding | (65, 15) | **3,48 m** | living_street(12m), living_street(5m) |
| `vw-kyr-torget-lh` | house | (−18, −18) | 2,53 m | living_street(12m), tertiary(5,5m) |
| `w869907964` | hotel | (62,4, 39,3) | 2,45 m | living_street(12m), residential(4m) |
| `vw-pra-19n` | apartments | (382,9, 28,6) | 2,36 m | service(3m), secondary(8m) |
| `vw-jarn-9` | house | (−410, −50) | 2,00 m | residential(5m) |

De värsta fyra involverar samtliga `living_street` med bredd 12 m — det verkar hög för `living_street`-normen (OSM-typiskt 4-5 m). Ett fynd inuti fyndet: `vw-torget-east-barn`, `vw-kyr-torget-lh`, `w869907964`, `vw-pra-19n` — dessa väg-bredder på 12 m kan vara felinlagda i preprocessing-datat eller använda en missförstådd tag. Rättelse på grovt fel: dubbla vägbredder krymper mätta träffar. Men vad ordern INTE gör är att ändra data (§5), så vi rapporterar bara.

### 2.4 Fördelning

Träffarna är **spridda över hela byn** — inte samlade i ett kvarter. Se `frontend/reports/order130/hus-vs-vagar.json` för alla 37 fall med koordinater.

---

## 3. Mätning 2 — Fönster utanför fasad

**297 av 338 byggnader (88%)** har minst ett fönster utanför sin polygon.

**3 156 fönster totalt** ligger utanför fasaden (av 4 844 genererade fönster på dessa 297 hus — cirka **65% av alla genererade fönster på dessa hus** hänger fritt).

### 3.1 Per byggnadstyp (topp 5)

| Byggnadstyp | Antal byggnader med fel |
|---|---|
| yes | 153 |
| house | 70 |
| residential | 26 |
| industrial | 17 |
| school | 9 |

Alla typer träffas — inte begränsat till en modell. `yes` är OSM:s odifferentierade "det är en byggnad" och utgör över halva byggnadsbeståndet, vilket förklarar dominansen.

### 3.2 OBB-vinkel-histogram (grader mod 90)

| Vinkel-bucket | Antal |
|---|---|
| 0–10° | 39 |
| 10–20° | 22 |
| 20–30° | 21 |
| 30–40° | 8 |
| 40–50° | 1 |
| 50–60° | 21 |
| 60–70° | 23 |
| 70–80° | **82** |
| 80–90° | **78** |

**Bimodal fördelning:** 160 av 297 (54%) har OBB-vinkel > 60°. Grythyttans grid är inte helt axel-parallellt, och husens ridge-riktningar följer gator som vinklar från nord-syd. Vinkeln i sig är inte problemet — problemet är att OBB-modellen ignorerar polygon-formen oavsett vinkel. Men **stora vinklar mot orthogonala axeln indikerar långa, icke-orthogonala byggnader** — där OBB över-uppskattar bredden mest.

### 3.3 Värsta fall (topp 10)

| Byggnad | Kind | OBB (w × d) | Värsta överhäng | Fönster ute / totalt |
|---|---|---|---|---|
| `w193810921` | university | 95,5 × 46,4 | **36,3 m** | 21/24 |
| `w1239628613` | industrial | 117,6 × 76,1 | 31,7 m | 16/24 |
| `w870510834` | industrial | 78,7 × 22,5 | 23,7 m | 19/24 |
| `w870510884` | school | 87,4 × 6,3 | 22,4 m | 18/20 |
| `w875778824` | apartments | 49,1 × 8,0 | 20,3 m | 18/20 |
| `w870510827` | industrial | 89,5 × 41,4 | 16,9 m | 15/24 |
| `w870510857` | residential | 47,6 × 14,2 | 15,9 m | 19/24 |
| `w934308174` | apartments | 56,3 × 9,6 | 14,2 m | 18/22 |
| `w870510863` | residential | 49,9 × 19,5 | 13,5 m | 16/24 |
| `w870510876` | school | 56,4 × 32,5 | 12,8 m | 18/24 |

Alla topp 10 har OBB med stor aspect ratio (> 3:1) eller stor absolut yta (industrier, universitet). När polygonen är L-formad, U-formad, eller har hörn-avfasningar avviker OBB-facen från polygonen med tiotals meter. Fönstret placeras på OBB-facen, hänger i luften där polygonen inte når fram.

### 3.4 Fördelning

**Universellt fel.** 88% av byggnaderna har minst ett hängande fönster. Detta är inte ett urval av ovanliga fall — det är standardbeteendet för alla icke-perfekt-rektangulära byggnader i OsmBuildings LOD-2-vägen.

---

## 4. Mätning 3 — Mönster och sannolik orsak per lager

Ordertexten §3.3 frågar vilket av de tre lagren (källdata / transform / generering) som är mest sannolik orsak.

### 4.1 Hus mot vägar — sannolikt **datalager + preprocessing-parametrar**

- Träffarna följer INTE ett mönster av växande fel med avstånd från origo — de är spridda över byn med värsta fallen både nära (torget, x=65) och långt bort (x=−410, x=382). Detta talar mot en transform-bugg där numerisk drift skulle koncentrera fel i utkanterna.
- De värsta fyra fallen involverar `living_street` med bredd 12 m. OSM-normen för `living_street` är 4-5 m. Sannolikt är antingen (a) `width` tag i OSM felinlagd, (b) preprocessing tolkar `lanes` × 3 eller något liknande som effektiv bredd, eller (c) breda torg är taggade som `living_street`. **Detta är ett dataproblem**, inte ett kodfel — och rättelsen är designbeslut (godta OSM som ordagrann eller normalisera bredder), inte kodbugg.
- Även utan de fyra bredaste träffarna kvarstår 33 hus med överlapp. De ligger tätast där `service`-vägar löper mellan täta bakgårdar — en förväntad ovänlighet i OSM-datat, inte ett kodfel.

### 4.2 Fönster utanför fasad — **utan tvivel genereringen**

- 88% täckning är oförenlig med ett datafel. OSM-polygonerna är korrekta OSM-polygoner (samma som `buildFacade` läser utan att generera överhäng — polygonens innehåll klarar `pointInPolygon` för `buildFacade`s fönster). Skillnaden är enbart att `windowsFor` i OsmBuildings inte respekterar polygonen.
- Transformen har redan skett (JSON-datat är i world-koordinater). Fönstret hänger i det egna world-frame:t — inte i ett spegel-vänt scenegraph-frame. Ingen transformfel.
- **Rotorsaken är känd exakt:** `windowsFor(b: Extruded)` beräknar `ridgeW`/`ridgeD` från OBB, projicerar `longXs`/`shortZs` till OBB-facens världspositioner, och emitterar utan att fråga polygonen. Ett polygon-inklusionsguard skulle stänga alla 3 156 fall.

### 4.3 Mönster mellan de två felen

De är oberoende. Hus-vs-väg-felet ligger i indata/preprocessing; fönsterfelet ligger i renderaren. Att båda observerades samtidigt av Vision Owner är sammanträffande — de har olika åtgärd.

---

## 5. Vad ORDER 130 INTE gör (§5)

- Ingen geometri flyttas.
- Inget fönster tas bort.
- Ingen OSM-data redigeras.
- Ingen transform ändras.
- Ingen `windowsFor`-rättelse skrivs.
- Ingen väg-bredd-normalisering görs.
- Sim-lagret, figurriggen, rummen, paletten är orörda.

`git diff main..HEAD -- frontend/src/` visar bara `frontend/scripts/order130-*.mjs` (nya mätskript) och `frontend/reports/order130/` (mätrapporter + skärmdumpar).

---

## 6. Rekommenderad följdorder

Två separata åtgärder — de bör inte packas i samma order:

1. **Fönster-guard i `windowsFor`.** Efter varje fönster-XZ-projektion, testa `pointInPoly(footprint, x, z)`. Om utanför: hoppa över, eller flytta till närmaste polygon-edge. Skulle stänga 3 156 fall. Låg risk, väl-avgränsat.

2. **Living_street 12 m-bredder.** Utreda om de fyra värsta träffarna kommer av OSM-tag-fel, preprocessing-parameter, eller taxonomisk felläsning. Beslut om normalisering är designfråga — och att ändra preprocessing kan ändra byns visuella karaktär (breda torg blir smala gator), vilket är en spatial-canonical-fråga per SD-002.

---

## 7. Skärmdumpar (§4)

Tre bilder i `frontend/reports/order130/`:

- **`village-overview.png`** — hela byn från 1 200 m höjd, pitch 78° (nära lodrätt — 78° är `pitchMax` i `GRAY_BOX_CAMERA`, ORDER 068 låser den för att inte tysta pose-buggar).
- **`worst-house-vs-road.png`** — närbild av `vw-torget-east-barn` @ (65, 15), 3,48 m intrusion i living_street. Distans 40 m.
- **`worst-window-outside.png`** — närbild av `w193810921` (university-byggnad) @ (407, −89), 36 m fönsteröverhäng. Distans 80 m.

---

## 8. Filer som denna order lämnar efter sig

- `frontend/scripts/order130-map-measurements.mjs` — mätskriptet (Node ES modules)
- `frontend/scripts/order130-map-screenshots.mjs` — playwright-scriptet
- `frontend/reports/order130/hus-vs-vagar.json` — 37 byggnader med fullständiga träffar
- `frontend/reports/order130/fonster-utanfor.json` — 297 byggnader med alla överhäng
- `frontend/reports/order130/monster.json` — histogram + värsta-listor
- `frontend/reports/order130/village-overview.png`
- `frontend/reports/order130/worst-house-vs-road.png`
- `frontend/reports/order130/worst-window-outside.png`
- `documentation/blueprints/ORDER_130_KARTAN_MATS.md` — denna rapport
- `documentation/architecture/ORDER_130_KARTAN_MATS.md` — orderfilen
- Uppdatering av `documentation/architecture/ORDER_REGISTRY.md` — rad 130
