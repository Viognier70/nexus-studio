# ORDER 302d — Gatans figurer i scenens ljus (rapport)

**Underlag:** ORDER 302c:s rapport (`ORDER_302C_RAPPORT.md`). Beslut av Anders 2026-10-06: alla figurer på gatan tar scenens ljus. De får en lägsta ljushet på kvällen. Undantaget för de oupplysta gästerna tas bort.

**Gren:** `order-302d` från `main` (`7dd7939f`).

## Beslut

1. **Ett material för alla gatans figurer.** Det är `MeshStandardMaterial` med ett golv (`scene/village/streetFigureLight.ts`).
   - Golvet är `outgoingLight = max(outgoingLight, diffuseColor.rgb * golv * andel)`.
   - Det läggs före tonmappningen och dimman.
   - `diffuseColor` är materialets färg gånger instansens. Varje figur behåller sin kulör.
   - Där ljuset redan är starkare, under en lykta eller på dagen, ändras ingenting.
2. **Figurerna som har golvet:**
   - gästerna på gatan (`VillageLife.tsx`, `makeInstanced`): kroppen, benen, huvudet och tecknen. `MeshBasicMaterial` är borta.
   - byns fotgängare och cyklisterna (`OsmPedestrians.tsx`);
   - folket vid landmärkena (`LandmarkGatherers.tsx`);
   - kön utanför dörren (`WineBarFigures.tsx`). Riggens alla upplysta material får golvet. Andelen är gatans andel i bytet vid dörren (`guestLooks.ts`, `applyStreetBlend`). Kön ute har golvet. Gästerna i rummet har det inte.
3. **När golvet gäller.** `EveningLighting.tsx` sätter golvet medan byns kvällsljus är tänt, och nollar det när det tas bort.
4. **Platshållaren.** `STREET_FIGURE_LIGHT.minLight` i `strategic/village/villageEvening.ts`. Kommentaren säger att värdet levereras av Design.
   - Värdet är andelen av figurens egen färg som kroppen minst lyser med, före exponeringen.
   - Startvärdet är **0,55**.
5. **Normalerna.** Gatans figurer ritades oupplysta och hade platta normaler. `mergeGeometries` (`streetLooks.ts`) behåller nu delarnas egna normaler. Kroppar och huvuden blir runda i ljuset.

### Startvärdet

**Skriptet:** `frontend/scripts/order302d-startvarde.mjs`. **Utfallet:** `frontend/reports/order302d/startvarde.json`.

- Underlaget är 302c:s mätning (`reports/order302c/lyktor-1440x900.json`): bakgrunden bakom varje figur.
- Skriptet räknar golvets luminans i bilden med three.js ACES-tonmappning, replikerad i JS.
- **Repliken stämmer:** med golvet 1 ger den samma luminans som de oupplysta gästerna i 302c (`replicaCheck`).
- Skriptet sveper golvet från 0,3 till 1,0 och räknar mätningarna utanför bandet 1,8–3,6.
- 0,55 ger minst utanför bandet (`best`, `sweep[]`).
- Antagandet är att bakgrunden inte ändras och att golvet bestämmer kroppen. Det stämde i spelet: kroppens median blev 0,29 (`jamforelse.json`, `bodyLMedian`).

## Verifiering

### Tester

`frontend/src/sim/__tests__/order302dGatansLjus.test.ts`:

- Golvets rad ligger före `opaque_fragment` och efter `color_fragment`, i standard- och lambertmaterialet.
- Golvet är ett delat värde. Andelen är materialets egen.
- Gästerna i `VillageLife`: alla delar är `MeshStandardMaterial` med golvet och har normaler. `makeInstanced` har ingen `MeshBasicMaterial`.
- Fotgängarna, cyklisterna och folket vid landmärkena: varje material i källan har golvet.
- Riggen för kön: alla upplysta material har riggens andel. Andelen följer bytet vid dörren (1, 0,5 och 0).
- `EveningLighting.tsx` sätter och nollar golvet.
- Platshållaren är märkt och lika med skriptets `best`.

302c:s, 302b:s och 309:s tester är gröna med ändringen (se *Sviten*).

### Lyktmätningen före och efter

**Skriptet:** `frontend/scripts/order302c-lyktor.mjs`. Det tar nu `REPORT_DIR`, `LABEL` och `DIST`. Det skriver också `summary["källa|zon"]`.

- **Före:** `main` `7dd7939f`, produktionsbygget. `reports/order302d/fore-lyktor-1440x900.json`.
- **Efter:** `order-302d` `75518e70`, produktionsbygget. `reports/order302d/efter-lyktor-1440x900.json`.
- Spelarens flöde, gatans nivå, 1440 × 900, stoppen 19.15–22.45 som i 302c.
- **Jämförelsen:** `scripts/order302d-jamfor.mjs` → `reports/order302d/jamforelse.json`. Bara stopp där kameran stod på 42 m räknas.

**Utanför bandet (under / över), per källa och zon** (`jamforelse.json`, `fore.summary` och `efter.summary`):

| Källa | Zon | Före | Efter |
|---|---|---|---|
| Gästerna (`life`) | nära | 1 / 17 av 23 | 2 / 8 av 10 |
| Gästerna (`life`) | borta | 2 / 15 av 29 | 9 / 0 av 9 |
| Fotgängarna (`peds`) | under | 5 / 0 av 17 | 11 / 0 av 23 |
| Fotgängarna (`peds`) | nära | 45 / 0 av 105 | 24 / 4 av 104 |
| Fotgängarna (`peds`) | borta | 46 / 0 av 93 | 0 / 4 av 120 |
| Landmärkena (`gatherers`) | under | 0 / 1 av 1 | 15 / 0 av 15 |
| Landmärkena (`gatherers`) | nära | 13 / 0 av 20 | 19 / 2 av 41 |
| Landmärkena (`gatherers`) | borta | 1 / 0 av 15 | inga |
| **Alla** | under | 5 / 1 av 18 | 26 / 0 av 38 |
| **Alla** | nära | 59 / 17 av 148 | 45 / 14 av 155 |
| **Alla** | borta | 49 / 15 av 137 | 9 / 4 av 129 |

Per D5-grupp står siffrorna under `student|…`, `villager|…`, `tourist|…` och `business|…` i samma fil. Gourmeter fanns inte i någon mätning.

**Vad det betyder:**

- **Borta från lyktorna** fungerar golvet. Utanför bandet gick från 64 till 13 mätningar.
- **Nära lyktorna** blev det något bättre, från 76 till 59.
- **Under lyktorna** blev det sämre, från 6 till 26. Marken under lyktan är ljusare än golvet (bakgrundens median 0,15–0,38). Kroppen ligger kvar på golvet, omkring 0,29. Lyktornas punktljus lyser inte upp kropparna nämnvärt.
- **Gästerna** ligger inte längre över bandet borta från lyktorna. Nära lyktorna ligger 8 av 10 fortfarande över, mot mycket mörka bakgrunder (luminans 0,03).
- **Kroppen är ljusare än bakgrunden** i de flesta mätningarna nu. Förut var de upplysta figurerna mörkare än marken i nästan alla.
- Ett enda golv kan inte ligga i bandet både mot den mörkaste och den ljusaste bakgrunden. Bandet mot bakgrunden 0,03 kräver en kropp under 0,23. Bandet mot 0,30 kräver en kropp över 0,58.

**Bilderna:** `reports/order302d/fore-lyktor-1440x900-<klockslag>.jpg` och `efter-lyktor-1440x900-<klockslag>.jpg`. De är tagna i produktionsbygget. Efter är figurerna jämnt ljusa och skuggade. Kön vid dörren syns i 22.45.

### Bildfrekvensen

**Skriptet:** `frontend/scripts/order302b-fps.mjs` med `REPORT_DIR=order302d`. Två körningar: `reports/order302d/fps-ab-1.json` och `fps-ab-2.json`.

- Grenen och `main` växelvis i samma körning: grenen, main, main, grenen. 1440 × 900, 19.30 och 22.20.
- Lasten står vid varje mätning (`runs[].stops[].levels[].load1`).

**Körning 1 (`fps-ab-1.json`), lastsnittet 7–35:**
- Byn: grenen lägst 20,3, i snitt 22,0. `main` lägst 18,5, i snitt 20,0 (`summary`).
- Gatan: grenen i snitt 26,4, `main` 24,4.
- Båda under 30. Grenen är inte långsammare än `main`.

**Körning 2 (`fps-ab-2.json`):**
- Den sista grenkörningen (`runs[3]`) gick när lasten sjunkit till 2–4.
- **Byn: 53,9 och 54,9 fps.** Gatan: 60.
- De tre första körningarna (last 6–17) gav grenen 18,9–20,6 och `main` 19,7–20,7 i byn.
- I två mätningar stod kameran i rummet i stället för på gatan (`level: "room"`). De räknas inte för gatan.

**Slutsats:** grenen håller ≥ 30 fps i byn på en olastad dator (`fps-ab-2.json` `runs[3]`). Under last ligger grenen och `main` lika, båda under 30. `main` mättes aldrig vid låg last.

## Avvikelser

- **Bildfrekvensen** under last är under 30 för både grenen och `main`. Över 30 är bara visat i en körning vid låg last, och bara för grenen.
- **Kameran stod inte på gatans nivå i alla stopp.** Före: 20.00 (28 m) och 21.00 (12 m). Efter: 22.00 (13 m). Stoppen är listade i `skipped` och räknas inte. Orsaken är inte utredd. Troligen flyttade en händelse kameran.
- **Underlaget är litet** för gästerna efter (19 mätningar) och under lyktorna.
- **Kön vid dörren** mäts inte under lyktorna. Vår trottoar har ingen lykta. Testet visar att kön har golvet.
- **Golvet gäller också i öppningen**, eftersom den använder samma kvällsljus. Öppningens kod är inte ändrad.
- **Två mätskript** (`order302c-lyktor.mjs`, `order302b-fps.mjs`) fick nya miljövariabler. Förvalet är som förut.

## Öppna frågor

- **Till Design: värdet för golvet.** 0,55 är en platshållare.
- **Till Design: golvet under lyktorna.** Ett fast golv räcker inte där marken lyser. Ska kroppen få mer ljus nära en tänd lykta, till exempel ett golv som följer lyktans sken (`lampLive`)? Eller ska lyktornas punktljus lysa upp figurerna mer?
- **Till Design: de mörkaste bakgrunderna.** Nära lyktorna ligger gästerna över bandet mot mycket mörk mark. Är det godtagbart, eller ska bandet gälla bara upp till en viss ljushet?
- Ska mätningen panorera längs gatorna för att få fler mätningar under lyktorna?

## Filer

- `frontend/src/strategic/scene/village/streetFigureLight.ts` (ny): golvet.
- `frontend/src/strategic/village/villageEvening.ts`: `STREET_FIGURE_LIGHT`.
- `frontend/src/strategic/village/EveningLighting.tsx`: sätter golvet på kvällen.
- `frontend/src/strategic/scene/village/VillageLife.tsx`, `OsmPedestrians.tsx`, `LandmarkGatherers.tsx`: upplysta material med golvet.
- `frontend/src/strategic/scene/guestLooks.ts`, `WineBarFigures.tsx`: riggens andel.
- `frontend/src/strategic/scene/village/streetLooks.ts`: normalerna.
- `frontend/src/sim/__tests__/order302dGatansLjus.test.ts` (ny).
- `frontend/scripts/order302d-startvarde.mjs`, `order302d-jamfor.mjs` (nya); `order302c-lyktor.mjs`, `order302b-fps.mjs` (miljövariabler).
- `frontend/reports/order302d/`: `startvarde.json`, `fore-` och `efter-lyktor-1440x900.json` med bilderna, `jamforelse.json`, `fps-ab-1.json`, `fps-ab-2.json`.

## Sviten

- **`npm run typecheck` och `npm run build`:** gröna på `75518e70`.
- **`npx vitest run`, hela sviten:** 2 471 gröna, 16 överhoppade och 7 röda. Lastsnittet var 29–35.
  - Alla sju röda nådde tidsgränsen. Inget test föll på ett påstående.
  - Ensamma är de gröna: `day.test.ts` (30), `order265WeekHarness` (3), `order266WeekHarness` (1), `order267Randomness` (1), `order267WeekHarness` (1) och `order131LoadSweep` (1).
  - `smoke.test.ts` nådde tidsgränsen på 30 s också ensam vid lasten 26. Vid lasten 12 var den grön: 8 av 8.
- **Sidoeffekt:** sviten skriver om `frontend/reports/order271/wineBar-camera-view.json`. Ändringen är återställd och inte committad.
