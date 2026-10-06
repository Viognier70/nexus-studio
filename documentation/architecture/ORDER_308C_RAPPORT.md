# ORDER 308c — Byns mark i öppningen (rapport)

**Underlag:** Anders 2026-10-06. Den öppna frågan i `ORDER_308B_RAPPORT.md` §7: ska byns mark också följa Designs skärmar under öppningen? Beslutet: ja, under öppningen följer marken Designs grönare ton (`documentation/leveranser/nexus-leverans-2026-10-04-oppningen-omtag/skarmar/`). Bara under öppningen; spelets mark efteråt är oförändrad.

**Gren:** `order-308c` från `main` (`51c7cbb7`). Talen och bilderna ligger i `frontend/reports/order308c/`.

## Beslut

**Kontext.** Spelets mark ritas av tre lager:
- terrängen (`scene/OsmTerrain.tsx`), med färg per hörn;
- landytorna (`scene/OsmDistricts.tsx`): skog, gräs, bostadsområden och kyrkogårdar;
- gårdarnas ytor (`scene/OsmYardSurfaces.tsx`).

Bostadsområdena är sandfärgade (`#a89e85`). I öppningens varma kvällsljus (ORDER 308b, `openingLight.ts`) läses marken som gråbrun. Designs mark är mörk och grönaktig.

**Beslut.**
1. **Modulen** `strategic/opening/openingGround.ts`, bredvid `openingLight.ts`:
   - `OPENING_GROUND.colour` är öppningens markfärg, före ljuset.
   - `OPENING_GROUND.mix` är andelen av den färgen i markens färg. Lite av markens egen variation blir kvar.
   - `openingGroundColour` blandar en hexfärg. `openingGroundRgb` blandar terrängens linjära färger per hörn.
   - `useOpeningGround()` är sann bara medan öppningen spelas. Den läser `openingStage().active`, samma källa som öppningens ljus.
2. **Terrängen.** Spelets färger per hörn sparas när geometrin byggs. När öppningen börjar eller slutar läggs de alltid tillbaka först. Öppningens blandning läggs på bara när öppningen spelas.
3. **Landytorna.** Med öppningen ritas polygonernas färg genom `openingGroundColour`, annars är den spelets.
   - Geometrierna byggs nu en gång, i `useMemo`. Förut byggdes de i varje rendering, och komponenten ritades bara en gång.
   - Nu ritas komponenten om två gånger: när öppningen börjar och när den slutar.
4. **Gårdarna.** Bara de mjuka ytorna (gräs, grus, trampad jord, blandad) följer öppningens mark. Asfalt, plattor och betong är oförändrade.
5. **Oförändrat.** Vägar, hus, tak, träd och ljus ändras inte. Ljuset från ORDER 308b är orört.

**Kalibreringen** gjordes i två omgångar mot `mark.json`:
- Första färgen, `#5c7864`, gav rätt riktning i kulören men en för mörk mark.
- Den slutliga färgen är `#5c8c7c`, med andelen 0,8. Siffrorna står i `mark.json`.

**Konsekvenser.**
- Under öppningen ser byn grönare ut, närmare Designs skärmar.
- I klippet vid vinbaren (ORDER 308b) syns det tydligast på gräsmattan runt huset.
- När öppningen slutar ritas marken med spelets färger igen. Det kostar en omritning av landytorna.

## Mätningen

`frontend/scripts/order308c-mark.mjs` skriver till `frontend/reports/order308c/mark.json`.

- **Marken** är medelfärgen i utvalda rutor där bilden visar mark (`ZONES` i skriptet), en lista för Designs bild och en för spelets. Rutorna är inritade i `reports/order308c/zoner/` så att de kan granskas.
- **Måtten** är medel-RGB, kulören (HSV, grader), mättnaden och grönheten g − (r + b) / 2. `dist` är RGB-avståndet till Designs markfärg.
- **Bilderna** kommer från `scripts/order308-check.mjs` i produktionsbygget, 1280 × 720:
  - `before` är `reports/order308c/fore/`, `main` 51c7cbb7;
  - `after` är `reports/order308c/`.
- **Summan** står i `summary.before` och `summary.after` (`meanHue`, `meanGreen`, `meanDist`, `maxDist`, `meanAbsDHue`). Designs värden står i `summary.design`.
- **Raderna** per bild står i `rows[]`.

**Kontrollen** är att spelets mark efter öppningen är oförändrad. Den står i `mark.json` `controlVillageAfter`:
- Bilden är byn efter öppningen, `oppning-byn-efter-1280x720.png`.
- Flödet F i `order308-check.mjs`: sparfilen måndag i vinbaren (oförändrad), baspaketet, dörrarna öppnas, nivån Byn (V).
- Bilden tas när klockan visar 18.52, så att kvällsljuset är detsamma i båda körningarna.
- Före och efter jämförs bildpunkt för bildpunkt (`meanAbsDiff`). Det som skiljer är gäster och bilar som rör sig.

**Testerna** finns i `frontend/src/sim/__tests__/order308cOppningensMark.test.tsx`:
1. `useOpeningGround` och `openingGroundActive` följer öppningens läge och ritar om när öppningen börjar och slutar.
2. Blandningen gör markens färger grönare. Terrängens linjära blandning är densamma som formeln.
3. Var och en av de tre komponenterna byter färg bara i öppningens gren, och terrängen lägger alltid tillbaka spelets färger först. Det kontrolleras ur källkoden.
4. Ingen annan del av scenen (vägarna, husen, ljuset) läser öppningens mark.

ORDER 308b:s tester (`order308bOppningen.test.tsx`) är oförändrade och gröna.

**Produktionsbygget:** `order308-check.mjs` med `REPORT_ORDER=order308c FLOWS=full,village` gav `reports/order308c/check.json`. Flödet A är oförändrat: raderna, nålarna, inga nätverksanrop och inga fel (`summary.externalRequests`, `summary.errors`). Skriptet har fått:
- flödet F (`village`);
- `CHECK_JSON`, så att en extra körning inte skriver över `check.json`.

## Sviten

- **`npm run typecheck` och `npm run build`:** gröna. Bygget kördes av `order308-check.mjs`.
- **`npx vitest run`, hela sviten:** körde medan maskinen var belastad av en annan sessions testkörningar. Resultatet var 2 452 gröna, 16 överhoppade och 1 röd.
  - Den röda är `order131LoadSweep`, svepet över 200 frön. Den nådde tidsgränsen på 300 s, och inget påstående föll.
  - Samma test nådde tidsgränsen i ORDER 308b och 309b.
- **Sidoeffekt:** sviten skriver om `frontend/reports/order271/wineBar-camera-view.json`. Ändringen är återställd och inte committad.

## Avvikelser

- **Nålen över vinbaren mäts inte.** Kameran sjunker i den bilden, och bilden tas 0,1–0,2 s olika i olika körningar. Inramningen flyttar sig därför, och fasta rutor hamnade på gräsmattan i en körning och på trottoaren i nästa. Mätningen gäller de tre andra bilderna av byn: texten, Ingrid och stjärnan.
- **Rutorna är handplockade**, inte en mask ur renderingen. De är inritade i `zoner/` för granskning.
- **Ljusstyrkan skiljer sig fortfarande per bild.** Vid Ingrid är spelets mark lika ljus som Designs. I översikten och vid stjärnan är den något mörkare. En färg kan inte träffa alla tre exakt, eftersom ljuset (ORDER 308b) skiljer sig per avstånd.
- **Kontrollen före togs i två körningar.**
  - `fore/check.json` är flödet A på `main`. Där togs byn utan väntan på klockan 18.52, så den bilden är ersatt.
  - `fore/check-village.json` och `fore/oppning-byn-efter-1280x720.png` är flödet F med klockan 18.52.

## Filer

- `frontend/src/strategic/opening/openingGround.ts` (ny).
- `frontend/src/strategic/scene/OsmTerrain.tsx`, `OsmDistricts.tsx` och `OsmYardSurfaces.tsx`.
- `frontend/src/sim/__tests__/order308cOppningensMark.test.tsx` (ny).
- `frontend/scripts/order308c-mark.mjs` (ny) och `frontend/scripts/order308-check.mjs` (flödet F och `CHECK_JSON`).
- `frontend/reports/order308c/`.

## Öppet

- **Nålen över vinbaren:** ska den mätas med en mask ur renderingen, till exempel en bild där bara marken ritas? Det kräver en flagga i bygget, som spelaren inte kan nå.
