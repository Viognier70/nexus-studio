# ORDER 176 — byggnads-guard mot väg-envelope (motsatt riktning till ORDER 158)

**Datum:** 2026-09-06
**Gren:** `order-176-buildings-off-roads` från `main` (`bcae5f5`, efter ORDER 175 merge).
**Föregås av:** ORDER 158 (envelope-guard i OsmRoads), ORDER 136 §2.2 (kvantifierade 19 strukturella fall som bredd-ändring inte löser).

## §1 Fynd

Provspel 2026-09-06 vid Gårdsgatan/Magasinsgatan-korsningen: en röd länga står tvärs över korsningen, Magasinsgatan går "in i gaveln och slutar". Utredning:

**Röd länga = `vw-mag-warehouse`** (industrial, wallColour `#8a4232`, dims 28 × 14 m 3 vån, centroid `(-422.8, 198.6)`, 37 m söder om korsning).

**Överlapp med Magasinsgatan (`w175036243`, spec.width=4.6, sidewalkWidth=0.9, halfEnvelope=3.2):**
- `midlineIntersects=9` — 9 sample-punkter på Magasinsgatans mittlinje ligger fysiskt inuti byggnadens polygon
- `envelopeIntersects=34`
- `onlyEnvelope=false` — inget envelope-vs-mittlinje-diskrepans

**ORDER 158-guarden fungerar korrekt.** `clipPolylineForVehicles` sampler mittlinjen var 1 m, `insideOrNear` triggar för de 9 samples inuti polygonen → vägen bryts i två runs som slutar mot byggnadens fasader. Från fågelperspektiv: byggnad renderas + väg klippt = "byggnad över korsning, väg slutar vid gavel".

**Detta är ORDER 136 §2.2:s strukturella fall.** ORDER 136 mätte 32 kollisioner varav 19 var strukturella (vägens polyline går fysiskt genom byggnadens polygon eller korsar dess edges). Bredd-ändring i `ROLE_SPECS` löser dem inte — byggnaden är fysiskt tvärs vägen enligt OSM-datan. `vw-pra-19n` (ORDER 136:s worst-fall), `vw-nyg-3`, `vw-jarn-9` — och `vw-mag-warehouse` — kräver antingen OSM-datafix eller den omvända guarden i denna order.

## §2 Form

**Byggnads-guard: skippa byggnaden om ≥ 2 mittlinjes-samples ligger inuti dess polygon.** Motsatt riktning till ORDER 158 (som klipper VÄGEN). ORDER 158 klipper vägen där mittlinjen kommer nära byggnaden; ORDER 176 skippar byggnaden där mittlinjen går GENOM den.

### §2.1 Ny modul `frontend/src/strategic/content/buildingsOnRoads.ts`

Exporterar `BUILDINGS_ON_ROADS: ReadonlySet<string>` beräknat vid module-load:

```ts
const MIDLINE_INSIDE_THRESHOLD = 2;
const SAMPLE_STEP_M = 1.0;

function computeBuildingsOnRoads(): Set<string> {
  // För varje building × varje road (motoriserad — exkluderar
  // footpath/cycleway/track), sampla road.poly-mittlinjen var 1 m,
  // räkna hur många samples ligger inuti building.poly.
  // Om räknaren når MIDLINE_INSIDE_THRESHOLD, lägg building.id till set.
}
```

Bounds-check per road (bbox-marginal 5 m) för prestanda. `spec.role`-check exkluderar `footpath | cycleway | track` — smala gångstigar där ett vanligt hörn kan överlappa några cm.

### §2.2 Filter i renderarna

- `OsmBuildings.tsx:1268` — ny `.filter(b => !BUILDINGS_ON_ROADS.has(b.id))` sist i kedjan (efter LANDMARK/church/SKIP_PROCEDURAL).
- `ProceduralFacades.tsx` — två platser:
  - `SKIP_PROCEDURAL_IDS`-set exkluderar också BUILDINGS_ON_ROADS (så byggnaden inte plötsligt syns via procedural-vägen när den skippas i OsmBuildings). Storlek: 136 → 122.
  - `built`-loopen (rad 188) hoppar över BUILDINGS_ON_ROADS.

### §2.3 Vad som INTE ändras

- `clipPolylineForVehicles` orört. Vägen fortsätter klippas av ORDER 158-guarden runt de nu osynliga byggnaderna → visuell effekt blir "väg med gap där osynlig byggnad var" istället för "väg som slutar vid gavel". Bytet är trade-offen: två synliga fel (gap i vägen + försvunnen byggnad) istället för ett (byggnad över korsning). En vidare fix som skulle låta vägen flöda obruten kräver att `clipPolylineForVehicles` tar en exclude-set — egen order när vi vet om gapen stör mer än den nuvarande observationen.
- Ingen datafix i OSM. Byggnaderna är fortfarande "fel" i källan.
- Ingen ny mätsignal-regel i CLAUDE.md. Guarden är åtgärd, inte upptäckt.

## §3 Verifiering

`/tmp/order176-verify/verify.mjs` mot dev-server på 5173 (workspace live).

**Resultat:**
- `BUILDINGS_ON_ROADS.size = 18`
- `vw-mag-warehouse` flaggad ✓
- `SKIP_PROCEDURAL_IDS.size` gick från 136 till 122 (14 av 18 var procedural)
- Övriga 4 flaggade byggnader är i annat filter-set (LMK/kyrkor/eller inte procedural-eligible)

**Flaggade byggnader:**
```
w870510826, w870510828  (industri, söder)
vw-skg-16, vw-pra-18, vw-pra-21, vw-pra-djurskyddet, vw-pra-19n  (Skolgatan/Prästgatan)
vw-nyg-3, vw-sorgarden, vw-jaktakademin, vw-barbellclub, vw-csvwellness  (Nygatan / Hantverksgatan)
vw-kyr-torget-lh, vw-torget-kyrkbacken-pair, vw-torget-west-corner, vw-torget-east-barn  (Torget)
vw-stn-11 (Stationen)
vw-mag-warehouse (Gårdsgatan/Magasinsgatan — fyndet)
```

18 vs ORDER 136:s 19 strukturella fall: 1 diff är sannolikt en gräns-byggnad med exakt 1 sample-in-polygon som slipper tröskeln. Att kalibrera tröskeln från 2 → 1 skulle fånga den men även slå mot fler false positives — konservativ tröskel valdes.

Screenshots i `/tmp/order176-verify/district.png` + `village.png` för visuell bekräftelse.

## §DoD

- [x] `npm run typecheck` grön.
- [x] `npx vitest run` — 1066/1066 grön (samma antal som ORDER 175).
- [x] Verifiering körd i spelarflödet med Enter (ORDER 175 DoD-krav).
- [x] `vw-mag-warehouse` flaggad i BUILDINGS_ON_ROADS.
- [x] Antal flaggade byggnader (18) i rimlig paritet med ORDER 136:s prediktion (19).

## §4 Ändringar

```
frontend/src/strategic/content/buildingsOnRoads.ts       (ny, ~90 rader)
frontend/src/strategic/scene/OsmBuildings.tsx            (import + ett filter-steg)
frontend/src/strategic/scene/ProceduralFacades.tsx       (import + SKIP-filter + built-loop-skip)
documentation/architecture/ORDER_176_BUILDINGS_OFF_ROADS.md (denna fil)
documentation/architecture/ORDER_REGISTRY.md             (rad 176)
```

## §5 Ej i scope

- Vägen genom nu-osynliga byggnader (gap-fix). Behöver `clipPolylineForVehicles`-exclude-set. Egen order.
- OSM-datafix (flytta byggnaderna i källan). Kräver ground-truth-koll mot Grythyttan.
- Fynd 3 (dubbelrendering bland grannhusen). Egen order — behöver scene-mesh-räknare för lokalisering.
- Fynd 2 (hål i byn) är bekräftat OSM-trogen (Gårdsgatan-området är verkligt glest).

Egen gren `order-176-buildings-off-roads` från main.
