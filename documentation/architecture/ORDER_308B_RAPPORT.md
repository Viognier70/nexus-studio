# ORDER 308b — Öppningen efter Anders beslut (rapport)

**Underlag:** Anders beslut 2026-10-05 om öppningen från ORDER 308 (`ORDER_308_RAPPORT.md` §9). Gren `order-308b` från `main` `508822e`. Talen och bilderna ligger i `frontend/reports/order308b/`.

## 1. Raderna

- **Målet är stjärnan** står kvar, och **rad 2** (*Från midsommar till kräftskiva*) är godkänd. Båda är oförändrade i `nexusStrings.ts` (`prologue.goal`, `prologue.line2`). Testet `order308bOppningen.test.tsx` §1 håller dem kvar.

## 2. Den som har sett öppningen

Beteendet stämde redan med beslutet, och koden är oförändrad. Flödet (`newGameFlow.ts`) går alltid via öppningen. `canSkip` (`openingTimeline.ts`) släpper Hoppa över direkt när `nexus.openingSeen` är satt.

- I testet (§2) syns knappen före 3 s, och en tangent före 3 s tar spelaren till morgonen.
- I produktionsbygget är `summary.returningOpeningShown` och `summary.returningSkipBefore3s` sanna (`check.json`). Bilden är `oppning-sett-forut-1280x720.png`.

## 3. Nålen

Nålen över krogen heter nu **Vinbaren som kan bli din** / **The wine bar that could be yours** (`prologue.yours`). Designs fil `content/design/openingStrings.ts` är oförändrad. Testet från ORDER 308 jämför därför alla nycklar utom `yours` mot Designs fil. Texten i spelet står i `summary.pinVenue` och `summary.english`.

## 4. Ljuset

**Mätningen:** `scripts/order308b-ljus.mjs` mäter medelluminansen (Rec. 709) i Designs sex skärmar (`skarmar/1280x720/`) och i spelets skärmar vid samma tid. Den mäter både hela bilden och bildens mitt. Spelets skärmar kommer från `scripts/order308-check.mjs` i produktionsbygget. Utdata finns i `reports/order308b/ljus.json`:
- `before` gäller spelets ljus på `main`, med skärmarna i `fore/`;
- `after` gäller ORDER 308b, med skärmarna direkt i `order308b/`;
- `summary` ger kvoterna spelet/Design.

**Det egna ljuset** ligger i `strategic/opening/openingLight.ts`:
- **Byn:** `OPENING_LIGHT_GAIN` förstärker halvklotets ljus och exponeringen efter kamerans avstånd. Förstärkningen läggs ovanpå kvällsljuset.
- **Vinbarens två scener:** `BAR_EXPOSURE_GAIN` höjer exponeringen på deras egna dukar.

**När det gäller:** `DayLighting.tsx` ger förstärkningen till `EveningLighting` bara i öppningens gren (`useOpeningLight`, som är null när öppningen inte spelas). Spelets kvällsljus är samma formel som förut. `EveningLighting.tsx` har fått en ren funktion, `eveningLightAt`, och testet (§3) visar att den utan förstärkning ger exakt de gamla värdena. Som kontroll är första morgonen efter öppningen lika ljus före och efter (`controlMorningAfter.diffFull` i `ljus.json`).

**Kalibreringen:** värdena är satta i tre omgångar mot `ljus.json`. Resultatet ska läsas där, inte här.

## 5. Kontroller

- **Tester:** `sim/__tests__/order308bOppningen.test.tsx` täcker nålen på sv och en, raderna, den som har sett öppningen, och att ljuset bara gäller under öppningen. `order308Oppningen.test.ts` har ändrats för `yours`.
- **Produktionsbygget:** `order308-check.mjs` skriver nu till `reports/order308b/`. Det har fått flödet E (den som har sett öppningen), valet `FLOWS=…` och fälten `pinVenue` och `returning*`.
- **Typecheck och bygge** (`npm run build`) är gröna.
- **Hela sviten** (`npx vitest run`) körde medan maskinen var hårt belastad av andra sessioners testkörningar: 2 411 gröna, 16 överhoppade och 10 röda. Alla tio röda var tidsgränser (`Test timed out`), inga fel i påståendena. Fallen låg i nio filer: `smoke`, `order131LoadSweep`, veckoharnessen 265, 266 och 267, `order267Randomness`, `day`, `order137BackgroundWork` och `order215QueueGrowthGate`.
- **Omkörning:** åtta av de nio filerna kördes om, och sju var gröna. `smoke.test.ts` var grön när den kördes ensam. `order131LoadSweep` (svepet över 200 frön) kördes inte om; ORDER 308 rapporterade den som röd redan före ordern.
- Ingen av de nio filerna rör öppningen.

## 6. Avvikelser

- **Designs tio bilder utan text** (`bilder/` i leveransen 2026-10-03) finns inte i repot. Jämförelsen görs därför bara mot de sex skärmarna med text. Prototypen hämtar three.js från ett CDN och kördes inte, eftersom skärmarna är dess bilder.
- **Ljusstyrkan, inte färgen:** byns färg är fortfarande spelets, gråbrun mark i stället för Designs grönaktiga. Bara medelluminansen är kalibrerad.
- **Mitten och helheten skiljer sig:** i nålen över vinbaren är bildens mitt mörkare än Designs (`rows[1].after.ratioCentre`), eftersom spelets tak är mörkt. Vid Ingrid är mitten ljusare än Designs. Inramningen skiljer sig också i vinbaren.
- **`fore/`** togs med nålens nya text. Ljuset var `main`s.

## 7. Öppet

- Ska byns färg (marken) också följa Designs skärmar under öppningen, eller räcker ljusstyrkan?
