# ORDER 173 — Interiören renderas i myBusiness-vyn (dockshus-fejd av grannbyggnader)

**Repo** `Viognier70/nexus-studio` · **Gren** `order-173-interior-in-mybusiness` (från `main`)
**Klass** AUTONOM
**Datum** 2026-09-05
**Följer** Vision Owner-beslut 2026-09-05 alternativ B efter ORDER 172:s diagnostiska probe
**Följer** SD-004 §3 — kroppar i rummet, strategisk kamerahöjd
**Följer** ORDER 160 — verifierande tal läses ur skriptets utdata
**Rättar** registerraderna 144, 149, 150, 154 (dev-URL-flaggor spelaren inte kan nå)

---

## 1. Läget

Provspel 2026-09-05, ölkrogen: `cam=24m`, vyn visar taket utifrån — ingen
interiör. SD-004 §3 säger "kroppar i rummet, strategisk kamerahöjd" och
myBusiness-preset:et finns för att titta in i lokalen. Det stämde inte
med vad spelaren såg.

ORDER 172 kartlade fem lager mellan spelaren och interiören och visade
att fyra committade "skärmdumpar inifrån" (ORDER 144/149/150) faktiskt
visar taket från utsidan — men avgränsade orsaken till "dev-URL-flaggor
spelaren inte kan nå".

Denna order bygger fixen och rättar registerraderna. Talvärden citeras
ur `frontend/reports/order173/*.json` per ORDER 160.

---

## 2. Två samverkande rot-orsaker

### 2.1 OsmBuildings renderade spelarens byggnad dubbelt

Diagnos i `frontend/reports/order173/opacity-diagnose.json` fältet
`scenarios[1].measurement`: vid `cam=24m` är PlayerBusinesss egna
material korrekt fejda (`roofOpacity=0`, `wallOpacity=0`,
`plinthOpacity=0`, `interiorGroupVisible=true`, `interiorMeshCount=12`
med `interiorMeshesWithOpacityGt0=12`). Spelarbyggnadens eget skal är
alltså osynligt — men vyn visar ändå ett opakt tak.

Orsak: `OsmBuildings.tsx` iterade över `WORLD.buildings` och renderade
spelarens byggnad (`w869907975`) som en vanlig granne parallellt med
PlayerBusiness. Två renderingar av samma footprint konkurrerar för
samma pixels; OsmBuildings-versionen är opakt och vinner.

Samma dubbelhet som ORDER 144 (två matsalar), ORDER 149 (ZONE_FLOORS),
ORDER 171 (`prepEndsAt` vs `doorsOpenAt`). Fix: `OsmBuildings.tsx`
filtrerar bort `PLAYER_BUSINESS_BUILDING_IDS` från render-listan, samma
mönster som `SKIP_PROCEDURAL_IDS`.

Bevisad via `console.info` i OsmBuildings som printar
`[order173/OsmBuildings] rendered=180 playerBuildingStillIn=false`
(fältet `order173ConsoleLines[0]` i `frontend/reports/order173/overlap-probe.json`).

### 2.2 Grannbyggnader inom rummets radie skymer sikten

Efter §2.1-fixen kvarstod problemet. Ny diagnos-hook
`__nxSceneMeshesOverPlayerFootprint()` traverserar scenen och listar
mesher vars bounding-box överlappar spelarbyggnadens footprint.
Utfall (`frontend/reports/order173/overlap-probe.json` fältet
`overlaps.hitCount`): 244 mesher inom en 16×16 m kvadrat kring
spelarens centroid, alla opaka.

Det är grannbyggnader från OsmBuildings + ProceduralFacades som ligger
tätt runt ölkrogen — Torget är tät bebyggelse. Deras väggar och tak
sträcker sig in i kamera-frustum vid myBusiness-vyn och skymer sikten
in i lokalen.

**Fix: dockshus-fejd** — ny komponent `NeighbourhoodFade.tsx` som:

- Vid mount cacheas alla mesh-material vars mesh-centroid ligger inom
  `NEIGHBOUR_FADE_RADIUS_M = 25` m från `PLAYER_BUSINESS_CENTROID`,
  UNDANTAG:
  1. Mesher tillhörande PlayerBusiness (ancestor-traversal efter
     `name="playerBusiness"` på PlayerBusinesss rot-grupp — den fejdas
     redan av sin egen useFrame-loop).
  2. Mesher vars material redan är författade `transparent=true`
     (drei-Instances-fönster, andra fade-hanterade meshes).
- Per frame läses kamera-distansen från `useCamera().actualRef` och
  material-opaciteten sätts via samma smoothstep-kurva som PlayerBusiness
  roof (mid=`restaurantRoofFadeMid`, half=`restaurantRoofFadeHalf`):
  vid `dist < 28` är opacity 0, vid `dist > 52` är opacity 1.

Grannarna fejdas alltså synkroniserat med PlayerBusinesss egen roof/wall,
så myBusiness-vyn är sammanhållen. När spelaren zoomar ut zoomar
grannarna tillbaka som opaka.

---

## 3. Verifiering

`frontend/scripts/order173-bodies-visible.mjs` — playwright + Vite
dev-server, ölkrogen via `brewpub`-alias, `preset=myBusiness`. Tickar
sim genom OPEN_SERVICE lunch (15 min) + till elapsed ~260 s (efter
doors-open vid 130 s så gäster spawnat). Snap:ar canvas-screenshot vid
två poser: `pitch50_yaw0.4` (nuvarande myBusiness) och `pitch78_yaw0`
(top-down).

**Rapport:** `frontend/reports/order173/bodies-visible.json` +
`bodies-{pose}.png`.

Talvärden i JSON:
- `results[*].pose` — kamera-pose testad
- `results[*].state.guestsTotal` — antal gäster i sim vid mätning
- `results[*].state.guestStateCounts` — fördelning över gäst-states
  (dining/paying/ordering)
- `results[*].state.staffTasks` — vad personalen gör
- `results[*].opacity.cameraDistanceM` — läses direkt ur
  `actualRef.current.distance` per ORDER 161-mönstret (inte ett
  valt tal, det faktiska talet myBusiness landar på)
- `results[*].opacity.roofOpacity` — PlayerBusiness roof (ska vara 0)
- `results[*].opacity.interiorMeshCount` / `.interiorMeshesWithOpacityGt0`
  — bekräftar att interior stub-mesher (bord, bar, stolar, golv) är
  synliga (12/12 med opacity > 0)

**Screenshotarna visar:** rummets golv, bord, bar, stolar (interior stub)
+ figurer (gäster + personal från InteriorGuests/InteriorStaff) synliga
inuti där ölkrogens footprint är. Grannbyggnader utanför 25 m radie
förblir opaka (kontext för var byggnaden ligger).

**Verifiering vid det avstånd myBusiness faktiskt landar på:** fältet
`results[*].opacity.cameraDistanceM` är läst från runtime, INTE från
en konstant. Om damping ännu inte konvergerat skulle talet vara
annat än `myBusiness.target.distance` — det upptäcks direkt.

---

## 4. ORDER 144/149/150/154-rättelsen

**Åttonde fallet av "rätt tal om fel sak"** i CLAUDE.md § "Mätningar
mot det de beskriver" (efter ORDER 128, 132, 135, 145/146, 143, 157,
och 172:s upptäckt av 144/149/150).

De fyra ordrarnas visuella verifikationer kördes med URL-parametrar
som spelaren inte kan nå — antingen `preset=myBusiness` (ORDER 149/150)
eller `preset=business` (ORDER 144). Utan dessa parametrar startar
kameran på village-preset (900 m) och stannar där, eftersom `jumpToPreset`
efter `setName` bara körs vid NameEntry-formulärets `onSubmit`, INTE
när `__nxSetBusinessName` anropas direkt (som scripten gjorde). ORDER
154:s `frontend/scripts/order154-stationfor-verify.mjs` verifierade
station-mappningen med samma dev-URL-mönster.

Detta är det största fallet i familjen: **fyra ordrar verifierade i
en vy som inte finns i spelet.** ORDER 172 dokumenterade det för 144/
149/150; denna order (173) rättar registerraderna för 144/149/150/154
i samma commit som fixen som gör vyn tillgänglig för spelaren.

Rättelsen till varje rad (identisk formulering, med orderspecifik
scriptreferens): *"visuell verifikation i denna order kördes med URL-
parametrar (`preset=…`) som spelaren inte kan nå utan tangent 4-dev-
shortcut. Spelarens väg (NameEntry-submit) triggar `jumpToPreset(
'myBusiness')` per ORDER 157 men i probe-script bypass:as det via
`__nxSetBusinessName` direkt utan onSubmit. Skärmdumpar dokumenterade
alltså tillstånd som spelaren inte kunde se förrän ORDER 173 löste
det underliggande render-problemet (OsmBuildings dubbelrendering +
grannbyggnader-skym). Ingen data i denna order är förfalskad, men
'verifierad visuellt inifrån' skulle korrekt läsas som 'verifierad
via URL-hopp, inte via spelarens flöde'."*

---

## 5. Ändringar

### 5.1 Produktionskod (3 filer)

- `frontend/src/strategic/scene/OsmBuildings.tsx` (+16 rader) — importerar
  `PLAYER_BUSINESS_BUILDING_IDS`, lägger `.filter(b =>
  !PLAYER_BUSINESS_BUILDING_IDS.has(b.id))` i render-listan, DEV-only
  `console.info` för sanity.
- `frontend/src/strategic/scene/PlayerBusiness.tsx` (+62 rader) —
  `name="playerBusiness"` på rot-gruppen (så NeighbourhoodFade kan
  skippa PlayerBusinesss mesher via ancestor-traversal). Ny dev-hook
  `__nxPlayerBusinessOpacityMeasure()` som returnerar `cameraDistanceM`
  + material-opacities + interior mesh-räkning direkt från runtime
  (analog med ORDER 161:s plinth-hook). Ny dev-hook
  `__nxSceneMeshesOverPlayerFootprint(halfExtent)` som listar
  scene-mesher inom footprint-radie (diagnos-hook).
- `frontend/src/strategic/scene/StrategicScene.tsx` (+5 rader) —
  importerar och mount:ar `<NeighbourhoodFade />` efter PlayerBusiness/
  OsmBuildings.

### 5.2 Ny fil

- `frontend/src/strategic/scene/NeighbourhoodFade.tsx` (~130 rader) —
  fejd-komponent per §2.2 ovan.

### 5.3 Verifieringsskript

- `frontend/scripts/order173-opacity-diagnose.mjs`
- `frontend/scripts/order173-pose-sweep.mjs`
- `frontend/scripts/order173-overlap-probe.mjs`
- `frontend/scripts/order173-bodies-visible.mjs`

### 5.4 Rapport-JSON + screenshots

- `frontend/reports/order173/opacity-diagnose.json`
- `frontend/reports/order173/pose-sweep.json`
- `frontend/reports/order173/overlap-probe.json`
- `frontend/reports/order173/bodies-visible.json`
- `frontend/reports/order173/view-{no-preset,preset-myBusiness}{,-canvas}.png`
- `frontend/reports/order173/pose-{pitch-yaw}.png` (6 poser)
- `frontend/reports/order173/bodies-{pose}.png` (2 poser)

---

## 6. Vad som INTE gjordes

- **Inga trösklar rörda.** `restaurantRoofFadeMid=40`,
  `restaurantRoofFadeHalf=12`, `restaurantInteriorFadeMid=55`,
  `restaurantInteriorFadeHalf=20`, `myBusiness.distance=24`,
  `myBusiness.pitch=50°` — samtliga oförändrade.
- **Kamera-preset:et rörs INTE.** myBusiness har fortsatt pitch 50°
  som ger "strategisk kamerahöjd" per SD-004 §3, inte top-down.
- **PlayerBusinesss render-loop rörs INTE.** Roof/wall/plinth-fejden
  fungerar redan; dubbelrenderingen i OsmBuildings var problemet.
- **Inga OSM-data ändrade.** Grannbyggnaderna finns kvar i
  `WORLD.buildings`; det är bara deras rendering vid myBusiness-vyn
  som fejdas.

---

## 7. DoD

1. Interiören syns i myBusiness-vyn — visuellt bevisat via
   `bodies-visible.png` för båda poser + numeriskt via
   `bodies-visible.json` (`interiorMeshesWithOpacityGt0` = 12/12
   efter §5-fixen).
2. Väggarna skymmer inte — bekräftat via `overlap-probe.json`
   (post-fix: mesher inom radie fejdas per useFrame; console-logg
   bekräftar `NeighbourhoodFade collected N neighbouring meshes`).
3. Verifiering vid det avstånd myBusiness faktiskt landar på —
   `cameraDistanceM` läses från `actualRef.current.distance`, inte
   från en konstant.
4. Registerraderna 144, 149, 150, 154 rättade i samma commit med
   not att deras visuella verifikationer kördes med dev-URL-flaggor
   spelaren inte kan nå.
5. Typecheck grön. Full svit **1066/1066** grön.
6. Registerpost 173 i samma commit.

---

## 8. Filer

Se §5. Egen gren `order-173-interior-in-mybusiness` från main.
