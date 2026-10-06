# ORDER 302c — Gästernas färger på gatan (rapport)

**Underlag:** Anders 2026-10-06. Designs leverans `documentation/leveranser/nexus-leverans-2026-10-06-gastfargerna-gatan/` (LEVERANSNOT.md, guestGroups.ts med en gatuvariant per utseende, `looks[].street`).

**Gren:** `order-302c` från `main` (`51c7cbb7`).

## Beslut

1. **Leveransen** ligger oförändrad i `documentation/leveranser/nexus-leverans-2026-10-06-gastfargerna-gatan/`.
2. **`scene/guestGroups.ts`** är leveransens fil, oförändrad.
   - Filen har också Designs tillägg 2026-10-05 (rummets färger inom bandet mot vinbarens golv), som inte fanns i repot. Rummets kroppsfärger ändras därför också.
   - ORDER 309:s test (`order309Foljder.test.ts`) väntade sig 8 kroppar utanför bandet. Nu är det 0 (`reports/order309/palett.json`).
3. **Gatans figurer bär gatans variant:**
   - gästerna på gatan (`VillageLife.tsx` via `streetLooks.ts` `streetLookOf` → `lookOf(…, 'street')`);
   - byns fotgängare (`OsmPedestrians.tsx`).
   - Studentens luva ritas nu också på gatan (`streetSignGeometry`), i den mörka accentfärgen, som en krage inom kroppens kontur uppifrån.
4. **Bytet vid dörren** (LEVERANSNOT §4, `STREET_BLEND`), i `guestLooks.ts` och `WineBarFigures.tsx`:
   - Dörrmattan är `room.queueSpots[0]`. Riktningen mot gatan går från mattan mot `waitingSpot`.
   - En figur utanför mattan bär gatans färger, en figur innanför rummets. Det gäller kroppen, lemmarna och den synliga gruppens tecken.
   - Bytet tar 0,6 s med inOutSine, åt båda hållen.
   - Inom 0,1 m från mattan står bytet kvar (`DOOR_MAT_MARGIN_M`). Kön på mattan har därför gatans färger tills den går in.
   - En ny gäst i figuren får sin sida direkt, utan övergång.
   - Gatans färger på tecknen tas ur leveransens `dressGroup(…, 'street')` på en tom rigg, mesh för mesh.
5. **Byns övriga folk.** 302b:s påstående stämde för `OsmPedestrians` men inte för allt folk i byn:
   - **`LandmarkGatherers.tsx`**, folket vid landmärkena (Torget, Campus, Gästgivaregården …), hade en egen palett med tegelrött. De får nu D5:s grupper i gatans färger och gruppernas tecken.
   - **Cyklisterna** (`OsmPedestrians.tsx`) hade tegelrött bland sina fyra färger. De får nu byborna och studenterna i gatans färger. Cyklisterna har inga tecken.
   - Personalen från Måltidens hus är som förut.
   - Lyktorna och fläckarna på avstånd är som i 302b.

## Verifiering

### Tester

`frontend/src/sim/__tests__/order302cGastfargerGatan.test.ts`:

- **Leveransens kontroller:**
  - `checkGroupsAgainstStreet()`, `checkStreetSigns()` och `checkGroupsAgainstFloors()` ger 0 fel.
  - Varje kvot läses ur samma funktioner och skrivs till `frontend/reports/order302c/modell.json` (`rows[].streetMin`, `streetMax`, `sign`).
  - Mot gatans ytor ligger kvoterna inom 1,837–3,476. Tecknet mot kroppen ligger inom 1,998–4,885. Det stämmer med leveransens tabell.
- **Gatans variant** i `streetLookOf`, fotgängarna, cyklisterna och folket vid landmärkena (källkoden grepas): ingen tegelröd färg kvar.
- **Bytet vid dörren:**
  - Kön ute och väntplatsen ligger utanför mattan, borden och ingången innanför.
  - Halva tiden ger hälften av bytet.
  - Bytet tar 0,6 s, och vägen ut är det omvända.
  - Riggen bär gatans kropp, lemmar och tecken vid andelen 1 och rummets vid 0.

**Ändrade tester:**
- `order302bGatansGrupper.test.ts` väntar sig gatans variant.
- Ordningen "hatten och sjalen störst uppifrån" prövas nu mot kepsen och skjortan, och mot ryggsäckens bredd. Luvan och ryggsäcken ger tillsammans en ram från ryggen till bröstet som är djupare än brättet. Ramen mäter inte tecknets yta.
- Testet skriver om `reports/order302b/signs.json` (fältet `topXM` är nytt). Den nya filen är committad.

### Kontrasten under lyktorna, i spelet

**Skriptet:** `frontend/scripts/order302c-lyktor.mjs`.
- Produktionsbygget och spelarens flöde som i 302b: fredagens sparfil i vinbaren, baspaketet, dörrarna öppnas.
- Gatans nivå (X, 42 m), i 1× och 1440 × 900.
- Stoppen: 19.15, 20.00, 21.00, 22.00 och 22.45. Alla 187 lyktor var tända.
- Åtta mätningar per stopp. Samma figur kan finnas i flera mätningar.

**Mätningen:** `src/strategic/scene/village/lampProbe.ts`. Den körs bara när skriptet ber om den.
- Efter att bildrutan ritats läses dukens bildpunkter (readPixels).
- Samma bildruta ritas en gång till utan figurerna. Då syns bakgrunden i samma punkter, i samma ljus.
- Kvoten är (ljusa + 0,05) / (mörka + 0,05) mellan kroppen och bakgrunden.
- Bildpunkter som inte ändras när figuren döljs är skymda och räknas inte.

**Zonerna:**
- under lyktan: inom `poolRadiusM` (5 m) från en tänd lykta;
- nära: 5–10 m;
- borta: längre bort.

**Utfallet:** `frontend/reports/order302c/lyktor-1440x900.json`.
- `rows[]`: varje figur med `ratio`, `bodyL`, `backL`, `lampM` och `zone`.
- `summary["grupp:variant|zon|källa"]`: `n`, `below`, `above`, `min`, `median` och `max`.
- Bilderna heter `lyktor-1440x900-<klockslag>.jpg`.

**Resultat:**

- **Under lyktorna (≤ 5 m)** finns bara fotgängare och folket vid landmärkena. Ingen gäst från `VillageLife` kom närmare än 5,18 m.
  - Under bandet: **turister variant 1, en mätning, kvoten 1,24** (`summary["tourist:1|under|peds"]`).
  - Inom bandet: studenter 0 (2,21–2,40), bybor 0 (2,33–2,73) och bybor 1 bland fotgängarna (2,52–2,73).
  - Över bandet: bybor 1 vid landmärkena (4,42–5,98).
  - Affärsfolk och gourmeter har inga mätningar under lyktorna.
- **Nära och borta från lyktorna** faller alla grupper under 1,8 i en del mätningar, i synnerhet bland figurerna som tar ljus.
  - Affärsfolk 1 vid landmärkena, nära: 6 av 7 under bandet, lägst 1,135.
  - Turister 0, nära: 16 av 23 under bandet, lägst 1,034.
  - Siffrorna står i `summary`.

**Det viktiga är materialet, inte lyktorna.** Leveransens modell räknar med att kroppen och marken får samma ljus (k · L). Så är det inte i spelet:

- **Fotgängarna och folket vid landmärkena** har `MeshStandardMaterial` och tar ljus.
  - I kvällsljuset blir kroppen mörkare än marken i 98 % respektive 96 % av mätningarna. Förhållandet är alltså det omvända mot leveransens avsikt.
  - Kroppen har L 0–0,28 och marken L 0,01–0,38.
  - 128 av 379 respektive 40 av 103 mätningar ligger under 1,8.
- **Gatans gäster** (`VillageLife`) har `MeshBasicMaterial` och tar inget ljus.
  - Kroppen är ljusare än bakgrunden i 96 % av mätningarna. Kroppens L är omkring 0,49–0,50.
  - 26 av 55 mätningar ligger **över** 3,6, upp till 14,1. De syns tydligt men ligger ljusare än bandet.
  - 6 av 55 ligger under 1,8, lägst 1,20 (studenter variant 0, borta från lyktorna).
- **Lasten:** datorn var lastad under de senare stoppen. Lastsnittet var 1,8, 2,1, 29,1, 74,7 och 74,5 (`load1`). Bildfrekvensen påverkar inte bildpunkterna.

## Sviten och bygget

Se avsnittet *Sviten* längst ned.

## Filer

- `documentation/leveranser/nexus-leverans-2026-10-06-gastfargerna-gatan/` (ny, oförändrad).
- `frontend/src/strategic/scene/guestGroups.ts`: leveransens fil.
- `frontend/src/strategic/scene/guestLooks.ts`: rummets och gatans färger, och bytet vid dörren.
- `frontend/src/strategic/scene/WineBarFigures.tsx`: bytet per figur.
- `frontend/src/strategic/scene/village/streetLooks.ts`: gatans variant, luvan och `OSM_FRAME`.
- `frontend/src/strategic/scene/OsmPedestrians.tsx`, `LandmarkGatherers.tsx`: gatans färger, tecknen vid landmärkena och mätningen.
- `frontend/src/strategic/scene/village/VillageLife.tsx`, `StreetLamps.tsx` (`lampLive`), `lampProbe.ts` (ny): mätningen.
- `frontend/src/sim/__tests__/order302cGastfargerGatan.test.ts` (ny); `order302bGatansGrupper.test.ts` och `order309Foljder.test.ts` (ändrade).
- `frontend/scripts/order302c-lyktor.mjs` (ny).
- `frontend/reports/order302c/`. Dessutom är `reports/order302b/signs.json` och `reports/order309/palett.json` omskrivna av testerna.

## Avvikelser

- **Rummets färger** ändras också, eftersom leveransens fil bär tillägget 2026-10-05.
- **Luvan** ritas på gatans figur, mindre än D5:s, inom kroppens kontur. Testordningen i 302b är justerad (se ovan).
- **Folket vid landmärkena och cyklisterna** var inte nämnda i ordern. De fick gatans färger enligt punkt 5.
- **Mätningen** gäller bara 1440 × 900.
- **Kön vid dörren** (vinbarens riggar) mäts inte under lyktorna. Vår trottoar har ingen lykta.
- **Mätningen ritar bildrutan två gånger extra**, men bara när skriptet begär det.

## Öppna frågor

- **Fråga till Design:** gatans färger bygger på att kroppen och marken får samma ljus. I spelet tar gästerna på gatan inget ljus och ligger över bandet. Fotgängarna och folket vid landmärkena tar ljus och blir mörkare än marken.
  - Ska alla gatans figurer vara oupplysta, som `VillageLife`?
  - Eller ska de upplysta få en egen ljushet för kvällen?
- **Under lyktorna** är underlaget litet (28 mätningar, inga gourmeter eller affärsfolk). Ska mätningen panorera längs gatorna för att få fler?
- Händelsernas teater (`eventTheatre.ts` LOOKS) har kvar sina egna gästfärger. Det är rummet, utanför ordern.

## Sviten

- **`npm run typecheck` och `npm run build`:** gröna, på commit `0819b7d5`. Därefter är bara rapporten ändrad.
- **`npx vitest run`, hela sviten:** 2 451 gröna, 16 överhoppade och 2 röda. Lastsnittet var 25–47, eftersom en annan session körde samtidigt.
  - **`smoke.test.ts`** nådde tidsgränsen på 30 s. Ensam är den grön: 8 av 8.
  - **`order131LoadSweep`** nådde tidsgränsen. Ensam är den grön på 100 s. Samma test nådde tidsgränsen också i ORDER 302b och 309.
- **Sidoeffekt:** sviten skriver om `frontend/reports/order271/wineBar-camera-view.json`. Ändringen är återställd och inte committad.
