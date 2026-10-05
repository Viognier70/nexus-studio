# ORDER 302b — Gatans folk i Designs D5-grupper (rapport)

**Underlag:** Anders 2026-10-05. Folket på gatan ska få D5:s fem gästgrupper. Underlag:
- gatans folk: ORDER 302, `ORDER_302_RAPPORT.md`, `scene/village/VillageLife.tsx`;
- grupperna: Designs D5, `scene/guestGroups.ts` `dressGroup` och `lookOf`, och `scene/guestLooks.ts` från ORDER 309.

Grupperna är studenter, bybor, turister, gourmeter och affärsfolk. Tecknen ska läsas på gatans nivå (D5 LEVERANSNOT §6: "På 14 m syns hatten och sjalen först"). Byns nivå ska ha minst 30 bilder per sekund.

**Gren:** `order-302b` från `main` (`508822e`), oberoende av `order-309b`.

## Beslut

**Kontext.**
- Gatans figurer i `VillageLife.tsx` är instansade: en cylinder och ett huvud, i en `InstancedMesh` med typens färg (`WARM.guest`).
- D5:s `dressGroup` klär en figurrigg med leder (`joints.head`, `joints.chest`) och skapar egna meshar per figur. Den kan inte läggas på 360 instanser utan att varje figur blir en egen rigg.
- Byns fotgängare (`OsmPedestrians.tsx`, 110 st) är en annan instansad figur: en låda och ett huvud. De går också på gatan i kvällsbyn och syns i samma bild. Deras palett hade rött och orange för turisterna, och D5 säger "inget rött".

**Beslut.**
1. **`scene/village/streetLooks.ts`** (ny) bygger D5:s grupper för instansade figurer:
   - **Kroppen** är tre delar: överkroppen i gruppens kroppsfärg, benen i lemmarnas färg (`lookOf`) och huvudet i riggarnas hy (`figureRig.ts` `DEFAULT_SKIN`, nu exporterad).
   - **Tecknen** är D5:s fem, byggda som geometri i figurens ram (`streetSignGeometry`). Varje tecken är ett eget `InstancedMesh` i gruppens accentfärg (`GUEST_GROUPS[g].looks[v].accent`): ryggsäcken, kepsen, solhatten, sjalen och den vita skjortan med kragen.
   - **Studentens luva** ritas inte på gatan. Den är i kroppens färg i D5 och syns inte mot kroppen.
   - **Tecknens mått:** D5:s mått, något större där gatans figur kräver det. Hatten och sjalen är störst uppifrån, så de läses först, och kepsen och skjortan sedan.
2. **Gatans sorter till grupperna** (`streetGroupOf`). Valet är deterministiskt ur fröet och sällskapets nyckel (`util/hash.ts` `hashKey`), inte ur sällskapets slumpflöde. Fart, sida och pauser från ORDER 302 är därför oförändrade.

   | Gatans sort | Grupp |
   |---|---|
   | `student` | studenter |
   | bussens `tourist` | turister |
   | `middle` | bybor; till vår krog blir en del turister med kvällens koncepts andel (`CONCEPT.touristOfMiddle`, bistro 0), som vid dörren (`guestTypes.ts` `atOurDoor`) |
   | `high` | gourmeter eller affärsfolk; till vår krog med kvällens koncepts andel (`CONCEPT.gourmetOfHigh`), till de andra krogarna med bistrons andel (`RIVAL_GOURMET_SHARE` = `CONCEPT.gourmetOfHigh.bistro`) |
   | `social`, `billionaire` | som i `guestLooks.ts`: bybor, och affärsfolk med kroppen i guld |
   | rusningens typer (`gourmet`, `business` …) | som i `guestLooks.ts` |

   Hela sällskapet har samma grupp. Varannan i sällskapet bär gruppens andra färgvariant.
3. **Byns fotgängare** (`OsmPedestrians.tsx`) får samma grupper och tecken:
   - rollerna: `resident` → bybor, `student` → studenter, `tourist` → turister och `conference` → affärsfolk;
   - kropparnas färger är D5:s två varianter;
   - tecknet sitter i lådfigurens ram (`OSM_FRAME`);
   - personalen från Måltidens hus är ingen gästgrupp och går som förut;
   - slumpflödet är oförändrat: samma antal dragningar, så vägar, fart och grupper är desamma.
4. **Lyktorna och fläckarna** på byns och kvarterets avstånd behåller gästtypens färg (`WARM.guest`). De är sällskap, inte personer.
5. **Etiketten på gatan** (`StreetArrivals.tsx`) säger "Gourmeter" eller "Affärsfolk" när sällskapet bär det tecknet. Förut stod "Höginkomst". Strängarna fanns redan (`guestTypes.label`).
6. **För kontrollen:** `body.dataset.villageStreet` har två nya fält.
   - `groups`: figurerna på gatan per grupp.
   - `screen`: sällskapen i bild, med gruppen, antalet och om de står stilla, och punkten i bildens andelar.
   - Fälten skrivs några gånger i sekunden, som förut (`villageLive.ts`).

**Konsekvenser.**
- Gatans figur är tre instansade delar och fem tecken i stället för en, alltså sju ritanrop mer. Fotgängarna har fem ritanrop mer.
- På byns nivå (660 m) ritas inga figurer från `VillageLife`, och tecknens antal är 0 (`BLEND.figuresUntil` 135 m).
- Figurerna har kvar sin höjd (1,57 m utan nivåns förstoring).

## Verifiering

### Tester

`frontend/src/sim/__tests__/order302bGatansGrupper.test.ts`, 5 st, alla gröna:
- sorterna till grupperna, också social, miljardären och rusningens typer;
- delningen är deterministisk. Med 2 000 nycklar ligger andelarna inom 0,05 från `RIVAL_GOURMET_SHARE`, `CONCEPT.gourmetOfHigh.soigne` och `CONCEPT.touristOfMiddle.soigne`, och bistro ger inga turister;
- kropp, lemmar och accent är D5:s, med två varianter, och miljardären är i guld;
- **tecknens storlek i bild:** räknad ur samma geometri som renderingen (`streetSignGeometry`) och samma nivåer (`villageEvening.ts` `LEVELS`: avstånd, synfält, `figureScale`). Utdata: `frontend/reports/order302b/signs.json` (`rows[].street900px`, `street720px`, `block900px`, `block720px`).
  - Hatten och sjalen är störst uppifrån (`topM`).
  - Varje tecken är minst 10 bildpunkter på gatans nivå i 1280 × 720.
- **grep:** `VillageLife.tsx` använder `streetGroupOf`, `streetLookOf` och ett `InstancedMesh` per tecken, och `OsmPedestrians.tsx` använder `streetSignGeometry(g, OSM_FRAME)` utan den gamla röda paletten.

ORDER 302:s test (`order302Gatan.test.ts`) är grönt.

### Spelarens flöde, bilder

`frontend/scripts/order302b-check.mjs`, produktionsbygget, 1440 × 900 och 1280 × 720.
- **Flödet:** fredagens sparfil i vinbaren (som ORDER 302), baspaketet, dörrarna öppnas, 2×.
- **Stoppen:** 19.00, 19.30, 20.15, 21.00 och 21.45, i 1×, på gatan (X) och kvarteret (C).
- **Panorering:** finns en grupp som ännu saknar utsnitt drar skriptet kameran dit med musen (spelarens panorering) och tar en bild till (`-panorerad`).
- **Utfall:** `frontend/reports/order302b/closeup-1440x900.json` och `closeup-1280x720.json`.
  - `stops[].levels[].street.groups`: figurerna per grupp.
  - `crops[].file`: utsnitten, 160 × 160 bildpunkter ur skärmens egen bild, utan förstoring.
  - `blocked`: sällskap under HUD:en, som inte fick något utsnitt.
- **Bilder:** helbilderna `closeup-<storlek>-<klockslag>-<nivå>.jpg` och utsnitten `closeup-…-<grupp>.png`. Helbilderna och `check-*` är konverterade till JPEG (kvalitet 80) efter körningen, och utsnitten är PNG som skriptet skrev dem. Utsnitt finns för studenter, bybor, gourmeter och affärsfolk i 1440 × 900, och för bybor och affärsfolk i 1280 × 720. Exempel:
  - studenterna med ryggsäcken: `closeup-1440x900-2015-kvarteret-panorerad-student.png`;
  - gourmeterna med sjalen: `closeup-1440x900-1930-kvarteret-panorerad-gourmet.png`;
  - mannen i guld med skjortan: `closeup-1440x900-1930-gatan-panorerad-business.png`;
  - byborna med kepsen: `closeup-1440x900-1930-gatan-villager.png`.
- **Turister i `VillageLife`** gick inte på gatan den här kvällen: `groups.tourist` är 0 i alla stopp. Konceptet är bistro (`touristOfMiddle` 0), och bussen valde en annan krog eller kom inte.
  - Solhatten syns på byns fotgängare (rollen `tourist`) i helbilderna.
  - Solhattens storlek står i `signs.json`.
- **Klockan 21.00** stod kameran i rummet (12 m) i båda storlekarna. Raketens ögonblick höll kameran, och nivåknapparna gick inte igenom. Det stoppet saknar bilder av gatan.

### Bildfrekvensen

**ORDER 302:s mätning, samma skript och stopp:** `scripts/order297-check.mjs`, körd med `REPORT_ORDER=order302b` och `CHECK_CLOCKS=18.50,19.30,21.00,22.20,22.50`. Utfall: `frontend/reports/order302b/check-1440x900.json` och `check-1280x720.json` (`stops[].levels[].fps`) med bilderna `check-*.jpg`.
- **Byns nivå: under 30** i båda storlekarna.
- **Alla nivåer föll mot ORDER 302:s körning**, också rummet, som låg på 60 i ORDER 302.
- **Datorn var hårt lastad under körningen:** lastsnittet 44–90 på 12 kärnor, enligt `uptime` och `os.loadavg()`. Andra agenter körde test och webbläsare samtidigt. Webbläsaren ritar WebGL i mjukvara utan skärm, så bildfrekvensen följer processorns last.

**Jämförelse med main under samma last:** `frontend/scripts/order302b-fps.mjs`.
- **Byggena:** grenens bygge mot main:s bygge (`508822e`, byggt i samma arbetsträd).
- **Ordningen:** växelvis, grenen, main, main och grenen, i varje storlek.
- **Flödet och mätningen:** samma flöde, och samma mätning av bildrutor per sekund som `order297-check.mjs`.
- **Lasten:** lastsnittet står vid varje mätning.
- **Utfall:** `frontend/reports/order302b/fps-ab.json`.
  - `summary`: lägsta värdet och medelvärdet per bygge, storlek och nivå.
  - `runs[].stops[].levels[].fps` och `load1`: varje mätning.
- **Resultat:** grenen och main ligger lika. Skillnaden är mindre än spridningen mellan körningarna av samma bygge (`summary`: grenen lägre i 1440 × 900, högre i 1280 × 720).
- **Ingen av dem nådde 30 på byns nivå** under den lasten.

**Slutsats:** kravet minst 30 bilder per sekund på byns nivå är **inte visat** i den här miljön. Mätningen visar ingen skillnad mot main. Byns nivå ritar inga gatufigurer från `VillageLife` (tecknens antal är 0 över 135 m). Fotgängarnas tecken är fem ritanrop med sammanlagt omkring 100 instanser. Mätningen bör köras om på en dator utan annan last, med samma två kommandon.

### Hela sviten och bygget

Se avsnittet Sviten.

## Sviten

- **`npm run typecheck` och `npm run build`:** gröna, på commit `8ddb224`. Därefter är bara skript, utfall och dokument ändrade.
- **`npx vitest run`, hela sviten:** 2 416 gröna, 16 överhoppade och 1 röd.
  - Den röda är `order131LoadSweep`, som nådde tidsgränsen på 300 s. Ensam är den grön på 269 s.
  - Samma test nådde tidsgränsen i ORDER 309 (`ORDER_309_RAPPORT.md`).
- **Sidoeffekt:** sviten skriver om `frontend/reports/order271/wineBar-camera-view.json`. Ändringen är återställd och inte committad.

## Filer

- `frontend/src/strategic/scene/village/streetLooks.ts` (ny): grupperna, utseendet, figurens delar och tecknen.
- `frontend/src/strategic/scene/village/VillageLife.tsx`: figurens delar, tecknen, gruppen per sällskap och fälten för kontrollen.
- `frontend/src/strategic/scene/village/villageLive.ts`: fälten `group`, `groups` och `screen`.
- `frontend/src/strategic/scene/village/StreetArrivals.tsx`: etiketten efter gruppen.
- `frontend/src/strategic/scene/OsmPedestrians.tsx`: byns fotgängare i grupperna.
- `frontend/src/strategic/scene/figureRig.ts`: `DEFAULT_SKIN` exporterad.
- `frontend/src/sim/__tests__/order302bGatansGrupper.test.ts`: testerna.
- `frontend/scripts/order302b-check.mjs` och `frontend/scripts/order302b-fps.mjs`: kontrollerna.
- `frontend/reports/order302b/`: utfallen och bilderna.

## Avvikelser

- **Byns fotgängare** (`OsmPedestrians.tsx`) ingår, fast ordern nämner `VillageLife.tsx`. De går på samma gata i samma bild, och deras röda turister stred mot D5.
- **Etiketten** säger gourmeter eller affärsfolk i stället för höginkomst, så att den stämmer med figuren.
- **Bildfrekvensen** är inte visad över 30. Se ovan.
- **Turisterna i `VillageLife`** syns inte i bilderna, eftersom ingen turist gick på gatan den kvällen. De syns bland fotgängarna.

## Öppna frågor

- **Gourmeternas andel hos konkurrenterna:** 0,5 (bistrons) är vårt val. Ska konkurrenterna ha egna koncept (Torgkrogen soigné och så vidare), så att gatan visar vilka gäster som går dit?
- **Paletten:** ORDER 309 noterade att åtta av D5:s tio kroppsfärger ligger utanför kontrastbandet mot vinbarens golv. På gatan är figurerna oupplysta (`MeshBasicMaterial`, som förut). Gourmeternas plommon och kol och affärsfolkets grafit är mörka mot kvällens gata, och tecknen bär läsningen. Fråga till Design: ska gatan ha egen ljushet för kropparna?

## Tillägg 2026-10-06: bildfrekvensen på en ledig dator

ORDER 302:s mätning (`scripts/order297-check.mjs`) kördes om på `main` med 302b, 307b, 308b, 309b och 310b inmergade, när ingen annan körning gick (lastsnittet omkring 5). Talen står i `frontend/reports/order302b/ledig/check-*.json`.
- **1440 × 900:** 53,6–60,1 bilder per sekund. Lägst är byns nivå (660 m).
- **1280 × 720:** 58,2–60,2 bilder per sekund.

Kravet, minst 30 på byns nivå, är uppfyllt. Förut var det 54–60 i ORDER 302.
