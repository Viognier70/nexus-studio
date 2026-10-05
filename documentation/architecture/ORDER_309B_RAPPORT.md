# ORDER 309b — Recensioner i morse i kvällens koncept (rapport)

**Underlag:** Anders 2026-10-05. Den öppna frågan i `ORDER_309_RAPPORT.md`: kortet "Recensioner i morse" skrev "Ryktet som bistro" (Designs D5, `morningReviews.ts` och LEVERANSNOT §9) men talen var krogens rykte, eftersom konceptets rykte när kvällen började inte sparades. Ordern: spara konceptets rykte när servicen startar och låt kortets huvud, stapel och rader använda det. Klasserna utan koncept behåller krogens rykte.

**Gren:** `order-309b` från `main` (`508822e`).

## Beslut

**Kontext.** Konceptet står i bokningen (`GuestBooking.concept`, ORDER 307). Bokningen låses i `startService` (`reducer.ts`) innan `openService` körs. Ryktet per koncept är `state.reputationByTier` (`sim/goods.ts` `reputationByTier`). Det flyttas av varje svar i kvällens koncept: felen gånger förlåtelsen hos bordets gästtyp (`sim/incidents.ts`, `moveConceptReputation`). På natten drar det mot krogens rykte (`sim/serviceEvents.ts` `onNewMorning`, `driftConceptReputationInPlace`).

**Beslut.**
1. **Startvärdet.** `DayState.conceptReputationAtServiceStart` (`strategic/types.ts`, skalan 0–1) sätts i `openService` bredvid `reputationAtServiceStart`. Värdet är `reputationByTier(state)[bokningens koncept]`, och null när kvällen saknar koncept.
   - Fältet nollställs inte när servicen stänger, som `reputationAtServiceStart` gör, för morgonen ska kunna läsa det.
   - `initialDay()` (`model.ts`) sätter det till null, så den nya dagen börjar utan värde.
2. **Svarets poäng i konceptet.** `AnswerReview.conceptReputation` sparas i `sim/incidents.ts`. Det är poängen som faktiskt flyttade konceptets rykte (felen gånger förlåtelsen), och null utan koncept.
   - Svar som sparats före 309b saknar fältet. De räknas om på samma sätt i `sim/morningReview.ts` `answerPoints`.
   - Ryktets regler i `sim/goods.ts` är orörda. Filen läses bara.
3. **Kortet.** `buildMorningReview` väljer `scope`:
   - `'concept'` när bokningen har ett koncept och startvärdet finns. Då är `from` konceptets rykte när servicen öppnade, `to` konceptets rykte på morgonen (efter nattens drift), och raderna (`reviewLines(…, scope)`) räknar konceptets poäng. Summan av raderna är fortfarande ändringen. Resten (nattens drift, klämningen vid 0 och 1) hamnar i raden "Byn · Gästernas kväll i övrigt".
   - `'restaurant'` annars. Talen är krogens, som förut.
4. **Kortets huvud.** `ui/MorningReviewLine.tsx`:
   - Med `scope === 'concept'` står "Ryktet som bistro" (`strings.foljder.review.classLine`), annars "Ryktet".
   - Förut stod "Ryktet som …" så fort ett koncept fanns, också när talen var krogens.
   - Huvudet bär `data-scope` och `data-tier`.
   - Inga nya strängar.

**Konsekvenser.**
- I vinbaren (bistro) kan kortet och krogens rykte visa olika tal samma morgon. Det beror på förlåtelsen och nattens drift. Exempel ur kontrollen nedan: konceptet 60 → 57, krogen 60 → 58.
- Raden som öppnar kortet igen i morgonens högerspalt visar samma ändring som kortet (`review.change`).

## Verifiering

**Tester:** `frontend/src/sim/__tests__/order309bConceptReview.test.ts`, 6 st, alla gröna.
- Kortet visar konceptets rykte (`scope`, `from`, `to` och `change` ur `reputationByTier`), inte krogens.
- Raderna räknar felen gånger förlåtelsen (gourmet, student), och summan är konceptets ändring.
- Ett äldre svar utan `conceptReputation` räknas om med förlåtelsen.
- En klass utan koncept visar krogens rykte.
- Ett koncept utan sparat startvärde (äldre sparfil) visar krogens rykte.
- Reducern: `START_SERVICE` sparar `reputationByTier[koncept]` i `day.conceptReputationAtServiceStart`. En spelad kväll till nästa morgon ger ett kort med `scope` concept, `from` lika med startvärdet och `to` lika med morgonens `reputationByTier`. Den nya dagen har inget startvärde.

ORDER 309:s tester (`order309Foljder.test.ts`) och ORDER 303:s (`order303Foljderna.test.ts`) är oförändrade och gröna.

**Spelarens flöde:** `frontend/scripts/order309b-check.mjs` i produktionsbygget, 1440 × 900.
- **Flödet:** måndagens sparfil i vinbaren (`reports/order284/save-mandag-vinbaren.json`, oförändrad), baspaketet, dörrarna öppnas, kvällen i 4× och nästa morgon.
- **Utfall:** `frontend/reports/order309b/check.json`, bild `check-recensioner-i-morse.png`.
- **Kortet:**
  - `steps.review.rep.heading`: "Ryktet som bistro".
  - `steps.review.rep.scope`: concept.
  - `steps.review.rep.from` och `to`.
- **Simuleringen samma morgon:** `steps.morning`, med `reputationByTier` och `reputation`.
- **Kontrollen:** `steps.consistency`.
  - `sumIsChange`: raderna summerar till ändringen.
  - `toIsConceptMorning`: kortets `to` är bistrons rykte på morgonen.
  - `restaurantMorning`: krogens rykte, som skiljer sig.
- **Avvikelse:** sparfilen har ingen `reputationByTier` (den är från före ORDER 307). Konceptets rykte när servicen öppnade är därför krogens rykte (`goods.ts` `reputationByTier`, reservvärdet).
  - Spelet sparar inte under kvällen, så skriptet kan inte läsa startvärdet ur sparfilen (`steps.opened` är morgonens sparfil, `fromIsSavedStart` null).
  - Att startvärdet sparas och läses visas i stället av reducertestet ovan.

**Hela sviten (`npx vitest run`) och `npm run build`:** se avsnittet Sviten nedan.

## Sviten

- **`npm run typecheck` och `npm run build`:** gröna.
- **`npx vitest run`, hela sviten:** 2 412 gröna, 16 överhoppade och 6 röda. Alla sex röda nådde tidsgränsen, inga påståenden föll:
  - `smoke`;
  - `day`;
  - `order266WeekHarness`;
  - `order267Randomness`;
  - `order267WeekHarness`;
  - `order131LoadSweep`.
- **Samma filer ensamma:** gröna. De fem första: 41 gröna. `order131LoadSweep`: 1 grönt på 153 s.
- **Samma tidsgränser i ORDER 309:** samma tester nådde tidsgränsen där (`ORDER_309_RAPPORT.md`, Verifiering).
- **Sidoeffekt:** sviten skriver om `frontend/reports/order271/wineBar-camera-view.json`. Ändringen är återställd och inte committad.

## Filer

- `frontend/src/strategic/types.ts`: `DayState.conceptReputationAtServiceStart` och `AnswerReview.conceptReputation`.
- `frontend/src/strategic/simulation/model.ts`: `initialDay()` med fältet satt till null.
- `frontend/src/strategic/simulation/reducer.ts`: `openService` sparar startvärdet.
- `frontend/src/sim/incidents.ts`: svaret sparar konceptets poäng.
- `frontend/src/sim/morningReview.ts`: `scope`, `answerPoints`, `reviewTier`, och `reviewLines` med `scope`.
- `frontend/src/strategic/ui/MorningReviewLine.tsx`: huvudet efter `scope`.
- `frontend/src/sim/__tests__/order309bConceptReview.test.ts`: testerna.
- `frontend/scripts/order309b-check.mjs` och `frontend/reports/order309b/`: kontrollen.

## Öppna frågor

- **Lunchen:** i klasserna med lunch skrivs startvärdet över när middagen öppnar. Kortet visar då middagens start, och lunchens svar i konceptet räknas i resten. Klasserna med lagerpaket hoppar över lunchen (`skipLunch`), så det gäller inte vinbaren i dag.
- **Två tal samma morgon:** konceptets rykte på kortet och krogens rykte i HUD:en kan gå åt olika håll. Exempel: ett fel hos en gourmet drar konceptet 1,8 gånger så mycket som krogen. Ska kortet också visa krogens ändring, till exempel som en liten rad under stapeln? Fråga till Design.
