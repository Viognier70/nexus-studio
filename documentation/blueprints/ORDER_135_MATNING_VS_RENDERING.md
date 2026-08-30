# ORDER 135 — Mäter ORDER 133 samma geometri som renderas?

**Utfärdad** 2026-08-30
**Klass** AUTONOM · Utredning, ingen rättelse
**Gren** `order-135` (från `main`)
**Följer** Vision Owner observation 2026-08-30 (vägar korsar hus i meter, inte centimeter)

---

## 0. Rakt svar

**Nej. ORDER 133 använde helt andra bredder än renderingen.** Slutsatsen "89 % av 37 fallen är verkliga smågränsöverlappningar under 1 m" är fel — den mätte mot en fiktiv vägbredd som inte finns i det spelaren ser.

**Vad renderingen faktiskt använder:** `ROLE_SPECS[roleFor(road)].width` i `frontend/src/strategic/content/roadRoles.ts:104`, plus valfri `sidewalkWidth` per sida. `OsmRoads.tsx:172` läser `spec.width / 2` som half-width — **OSM-taggarnas `width` ignoreras helt.**

**Vad ORDER 133 mätte mot:** `road.width` (OSM-tagg) om finns, annars kind-default (`defaultRoadWidth()` i `order130-map-measurements.mjs`). En helt annan tabell.

De två tabellerna skiljer sig med **upp till 6,6 m per väg**. För Rv 244 (Hälleforsvägen) mätte ORDER 133 en 8 m mittlinje mot renderingens **13,2 m envelope** (10 m carriageway + 1,6 m trottoar × 2). För alla 6 primary-segment gäller detsamma.

**Resultat med rätt bredd:**

| Regim | Antal byggnader med kollision | Värsta överlapp |
|---|---:|---:|
| A. ORDER 133 (som rapporterat) | **37** | 3,48 m |
| B. Renderad carriageway | **30** | 2,86 m |
| C. Renderad envelope (med trottoar) | **32** | **4,36 m** |

Värsta fallet i C: `vw-pra-19n` (apartments) går **4,36 m** in i Lokavägens envelope. ORDER 133 rapporterade det som 2,36 m mot service(3m) + secondary(8m) — men rendering gör Lokavägen till main-tier med 12 m envelope.

---

## 1. Var felet ligger i mätningen

`frontend/scripts/order130-map-measurements.mjs` (som ORDER 133 återanvände) väljer bredd så här (rad ~166):

```js
function defaultRoadWidth(kind) {
  switch (kind) {
    case 'motorway': case 'trunk': case 'primary': return 8;
    case 'secondary': case 'tertiary': return 6;
    case 'unclassified': case 'residential': return 4;
    case 'service': case 'track': return 3;
    case 'footway': case 'pedestrian': case 'path': case 'cycleway': case 'steps':
      return 1.5;
    default: return 3;
  }
}
```

Och ORDER 133 lade ovanpå det: `road.width` om OSM-tagg finns, annars `defaultRoadWidth(kind)`. Fungerar som en OSM-first-heuristik.

`frontend/src/strategic/scene/OsmRoads.tsx:172`:
```ts
const spec = specFor(road);
const half = spec.width / 2;
```

`frontend/src/strategic/content/roadRoles.ts:352`:
```ts
export function specFor(road: RawRoad): RoadRoleSpec {
  const role = roleFor(road);
  const base = ROLE_SPECS[role];  // <-- FAST tabell per roll
  const colour = surfaceApplied(base.colour, road.surface);
  return { role, ...base, colour };
}
```

Renderingen läser **aldrig** `road.width`. Den använder rollen (via `roleFor`) och slår upp bredden i `ROLE_SPECS`. OSM-tagg påverkar inte utseendet.

---

## 2. Bredd-jämförelse per roll

| Roll | ROLE_SPECS.width | +sidewalk×2 | ORDER 133 typiskt |
|---|---:|---:|---:|
| primary (Rv 244) | 10,0 | 13,2 | **8** (kind=secondary→8) |
| main (Rv 205 etc.) | 9,0 | 12,0 | **6–8** (osm om finns, annars kind-default) |
| secondary_connector (Kyrkogatan) | 6,2 | 8,6 | **4,5–5,5** (osm om finns, annars 6) |
| local_street | 5,0 | 7,0 | **4** (unclassified) |
| village_street (Prästgatan, Nygatan, m.fl.) | 4,6 | 6,4 | **12** för Prästgatan (osm), **4** annars |
| residential | 3,6 | 3,6 | **4–13** (osm variabelt) |
| service | 2,8 | 2,8 | **3** (default) |
| track | 2,4 | 2,4 | **3** (default) |
| cycleway | 2,0 | 2,0 | **2** |
| footpath | 1,3 | 1,3 | **1,5** |

**Två strukturella skillnader:**

1. **Renderingen är genomgående bredare för trafikvägar.** Rv 244 primary är 13,2 m envelope, ORDER 133 mätte 8 m. Kyrkogatan (secondary_connector) är 8,6 m, ORDER 133 mätte 4,5-5,5 m. Detta förklarar varför Vision Owner ser vägar meter in i hus som mätningen missade.

2. **Renderingen är smalare för OSM-fel-taggade small streets.** Prästgatan (OSM width=12) renderas som village_street 4,6 m (envelope 6,4 m). ORDER 133-slutsatsen om att Prästgatan skapade 4 falska överlapp var själva-falsk — den skapade inte kollisioner i renderingen alls, för renderingen struntar i 12-taggen.

**Rendering-tabellen är alltså både mer restriktiv (respekterar inte OSM-utstickare) OCH mer generös (adderar trottoar + upp-skalar principalvägar).**

---

## 3. Nya fall som ORDER 133 missade

**Nya kollisioner i renderingen (envelope) som ORDER 133 inte hittade:** 3 byggnader.

Från jämförelsen `hitsC \ hitsA` i `renderVsMeasurement.json`:

Låt oss titta på topp 10 av C-mätningen som ORDER 133 antingen missade eller underskattade:

| Byggnad | Kind | Centre | worst (C) | worst (A) | Väg |
|---|---|---|---:|---:|---|
| `vw-pra-19n` | apartments | (383, 29) | **4,36 m** | 2,36 m | main(12m,Lokavägen), service(2,8m) |
| `vw-nyg-3` | house | (−45, −75) | **3,53 m** | 1,98 m | secondary_connector(8,6m,Kyrkogatan) |
| `vw-jarn-9` | house | (−410, −50) | **2,70 m** | 1,75 m | village_street(6,4m,Järnvägsgatan) |
| `vw-pra-18` | apartments | (387, 11) | **2,57 m** | ORDER 133 missade | main(12m,Lokavägen) |
| `vw-jaktakademin` | house | (−265, 60) | **2,19 m** | 1,24 m | village_street(6,4m,Magasinsgatan) |
| `w1422745011` | yes | (−87, −229) | **1,83 m** | 0,28 m | secondary_connector(8,6m,Kyrkogatan) |
| `vw-hjv-5` | house | (−350, −160) | **1,73 m** | 0,78 m | village_street(6,4m,Hantverksgatan) |
| `vw-mag-warehouse` | industrial | (−420, 200) | **1,62 m** | 0,67 m | village_street(6,4m,Magasinsgatan) |
| `vw-barbellclub` | house | (−280, 45) | 1,59 m | 0,65 m | village_street(6,4m) |
| `vw-kyr-9e-mansard` | house | (−14, 5) | 1,46 m | (utanför topp 20) | secondary_connector(8,6m,Smedsgatan) |

**Sanningen:** 2-4 meter intrusion, inte centimeter. Vision Owners observation stämmer.

---

## 4. Fall som ORDER 133 rapporterade men rendering inte har

**Dropp i C jämfört med A:** 8 fall som ORDER 133 rapporterade som kolliderande men som inte kolliderar i renderad envelope.

Dessa är hus som satt nära Prästgatan (OSM width=12) eller Närkesgatan (OSM width=13) — där renderingen istället använder village_street envelope 6,4 m och alltså inte når fram till huset.

Exempelvis `w869907976`, `w869907977`, `vw-bv-4`, `vw-pra-8` — alla de fyra ORDER 133 sade "försvinner om vi använder norm" — försvinner faktiskt i renderingen också, men av en annan anledning: renderingen respekterar aldrig 12-taggen från början.

Så ORDER 133:s siffra "4 av 37 är OSM-taggfel" var **matematiskt korrekt men logiskt fel** — de 4 var falska i mätningen, inte i verkligheten.

---

## 5. Vad detta betyder för ORDER 133:s slutsatser

| ORDER 133-påstående | Verklighet |
|---|---|
| "37 byggnader skär vägbanan" | 30 (carriageway) eller 32 (envelope) — men delvis andra hus |
| "89 % av dem (33/37) är verkliga smågränsöverlappningar under 1 m" | Falskt. I renderingen är 8 av topp 10 över 1,5 m; värsta 4,36 m |
| "Kod-parametrar (våra kind-defaults) är inte huvudorsak" | Falskt. Rendering-tabellen `ROLE_SPECS` är exakt en kod-parameter — och den är huvudorsaken |
| "OSM-datafel driver 4 av 37" (Prästgatan 12 m) | Falskt. Renderingen använder inte OSM-widths alls. Prästgatan-fallen är en artefakt av att mätningen mätte fel |
| "Placering/transform är inte huvudorsak" | Sant — men slutsatsen om placering vs data blev fel eftersom mätningen mätte fel geometri |

**ORDER 133 behöver antingen revideras eller markeras som "obsolete pga mätfel"** — det är en registerbeslut, inte denna orders sak.

---

## 6. Rekommenderade följdorder (som uppslag, inte rekommendation)

1. **Uppdatera `order130-map-measurements.mjs` att använda `ROLE_SPECS`-bredder** (det som spelaren ser). Byt `defaultRoadWidth` → `specFor(road).width + 2 × spec.sidewalkWidth`. Kör om och rapportera nya siffran.
2. **Bygg polygon-guard i `OsmRoads.tsx`** analogt med ORDER 132:s windowsFor-guard: `buildRoadShape` klipper redan mot byggnader (via `CLIPPED_ROADS`) men bara mittlinjen — inte den utökade envelope med trottoar. Klippa `spec.width/2 + sidewalkWidth`-envelope mot polygonen.
3. **Sortera OSM-fel-taggarna separat.** Prästgatan 12 m är fortfarande fel i OSM. Även om det inte påverkar renderingen just nu, gör det siffror-jämförelser omöjliga. Kan rapporteras uppströms till OpenStreetMap.

Ingen av dessa rekommenderas av denna order. Den utreder bara och lämnar beslut till Vision Owner.

---

## 7. Vad ORDER 135 INTE gör

- Ingen geometri ändrad
- Ingen roadRoles.ts-parameter ändrad
- Ingen OSM-data redigerad
- Ingen produktionskod rörd (`git diff main..HEAD -- frontend/src/` = tomt)
- Ingen ändring av order130-map-measurements.mjs (måste beslutas separat)

`git diff main..HEAD` visar bara `order135-render-vs-measurement.mjs`, `renderVsMeasurement.json`, denna rapport, orderfilen och registerrad.

---

## 8. Filer

- `documentation/architecture/ORDER_135_MATNING_VS_RENDERING.md` — orderfilen
- `documentation/blueprints/ORDER_135_MATNING_VS_RENDERING.md` — denna rapport
- `frontend/scripts/order135-render-vs-measurement.mjs` — mätskriptet
- `frontend/reports/order135/renderVsMeasurement.json` — full data (3 mätningsserier + per-road-bredder + nya/droppade IDs)
- Uppdatering av `documentation/architecture/ORDER_REGISTRY.md` — rad 135, plus not på rad 133 om reviderad slutsats
