# ORDER 309c — Båda ryktena på kortet Recensioner i morse (rapport)

**Underlag:** Anders 2026-10-06. Den öppna frågan i `ORDER_309B_RAPPORT.md` (Två tal samma morgon) gällde konceptets rykte på kortet och krogens rykte i HUD:en, som kan gå åt olika håll. Beslutet: kortet "Recensioner i morse" visar både konceptets och krogens ändring, till exempel "Ryktet som bistro +3 · Krogens rykte +1", och samma sak på engelska. Klasserna utan koncept visar bara krogens.

**Gren:** `order-309c` från `main` (`51c7cbb7`).

## Beslut

**Kontext.** Sedan ORDER 309b visar kortets huvud, stapel och rader konceptets rykte (`scope === 'concept'`) när kvällen hade ett koncept. Krogens rykte samma kväll räknades inte ut för kortet.

**Beslut.**
1. **Talen.** `buildMorningReview` (`sim/morningReview.ts`) räknar nu också krogens rykte, `MorningReview.restaurant = { from, to, change }` (0–100, avrundat).
   - Krogens startvärde är detsamma som förut: `reputationAtServiceStart`, annars `reputationAtDayStart`.
   - Slutvärdet är `morning.reputation`.
   - I klasserna utan koncept är talen desamma som kortets `from`, `to` och `change`.
2. **`reviewChanges(review)`** ger ändringarna som kortet visar:
   - `concept` är kortets ändring när kortet visar konceptets rykte, annars null.
   - `restaurant` är krogens ändring.
   - Ett kort som sparats före 309c saknar `restaurant`. Utan koncept är krogens ändring då kortets egen. Med koncept saknas den, och bara konceptets ändring visas.
3. **Kortet.** `ui/MorningReviewLine.tsx`: under stapeln står en rad, `data-testid="morning-review-changes"`.
   - Med koncept: "Ryktet som bistro +3 · Krogens rykte +1".
   - Utan koncept: "Krogens rykte −2".
   - Raden bär `data-concept-change` och `data-restaurant-change`. Stilen är `.nx-review-changes` i `foljder.css`, i kortets dämpade färg.
4. **Strängarna** finns i `nexusStrings.ts` under `foljder.review`, med `sv` och `en`:
   - `classChange`: "Ryktet som {klass} {±n}" och "Reputation as a {class} {±n}";
   - `venueChange`: "Krogens rykte {±n}" och "Your venue’s reputation {±n}" (Designs ordval "Your venue’s class");
   - `changesJoin`: " · ".
   - Tecknen är `+n`, `−n` (minustecken) och `±0`, som brickorna på kortets rader.

**Oförändrat:** ryktets regler, ekonomin och raderna på kortet. Huvudet ("Ryktet som bistro"), stapeln och raderna visar fortfarande konceptets rykte, som i ORDER 309b.

**Konsekvenser.** Spelaren ser samma morgon både vad konceptet och krogen fick. HUD:ens rykte är krogens, så kortets andra tal stämmer med HUD:en.

## Verifiering

**Testerna** finns i `frontend/src/sim/__tests__/order309cBadaRyktena.test.tsx`, 7 st:
- Talen med koncept: bistron +3 och krogen +1 var för sig (`restaurant`, `reviewChanges`).
- Talen utan koncept: bara krogens, samma som kortets ändring.
- Ett äldre kort utan `restaurant`.
- Kortet renderat på svenska: "Ryktet som bistro +3 · Krogens rykte +1".
- Kortet renderat på engelska: "Reputation as a bistro +3 · Your venue’s reputation +1".
- Kortet utan koncept: "Krogens rykte −2" och "Your venue’s reputation −2".
- Strängarna, med ±0 och minustecken.

ORDER 309b:s, 309:s och 303:s tester är oförändrade och gröna.

**Spelarens flöde:** `frontend/scripts/order309c-check.mjs` i produktionsbygget, 1440 × 900. Flödet är detsamma som i 309b:
- måndagens sparfil i vinbaren (`reports/order284/save-mandag-vinbaren.json`, oförändrad);
- baspaketet, dörrarna öppnas, kvällen i 4× och nästa morgon;
- sedan engelska: språket byts, sidan laddas om och samma morgon öppnas.

**Utfall:** `frontend/reports/order309c/check.json`, med bilderna `check-recensioner-i-morse.png` (svenska) och `check-recensioner-i-morse-en.png` (engelska).
- `steps.review.changes` är raden på kortet: texten och de två talen.
- `steps.reviewEn.changes` är samma rad på engelska.
- `steps.morning.morningReview.restaurant` är simuleringens tal ur sparfilen.
- `steps.consistency` är kontrollerna:
  - `conceptChangeIsCardChange`: konceptets tal är kortets ändring;
  - `restaurantChangeIsSim`: krogens tal är simuleringens;
  - `restaurantToIsMorning`: krogens slutvärde är `reputation` på morgonen;
  - `conceptToIsMorning`: konceptets slutvärde är bistrons rykte på morgonen;
  - `sumIsChange`: raderna summerar till ändringen.

**Utfallet i flödet.** Kvällen gav bistron −1 och krogen ±0. Kortet visade "Ryktet som bistro −1 · Krogens rykte ±0", och på engelska "Reputation as a bistro −1 · Your venue’s reputation ±0" (`steps.consistency.text`, `textEn`). Alla fem kontrollerna i `steps.consistency` är sanna.

**Iakttagelse, inte ändrad:** i samma körning visar kortets huvud 60 → 60, medan ändringen är −1 (`steps.review.rep` och `steps.review.change`). Det beror på avrundningen i `buildMorningReview` sedan ORDER 309: `from` och `to` avrundas var för sig, och `change` avrundas från skillnaden. Det är äldre än 309c och ligger utanför ordern.

## Sviten

- **`npm run typecheck` och `npm run build`:** gröna. Bygget kördes av `order309c-check.mjs`.
- **`npx vitest run`, hela sviten:** körde medan maskinen var belastad av en annan sessions testkörningar. Resultatet var 2 451 gröna, 16 överhoppade och 1 röd.
  - Den röda är `order131LoadSweep`, svepet över 200 frön. Den nådde tidsgränsen på 300 s, och inget påstående föll.
  - Samma test nådde tidsgränsen i ORDER 308b och 309b.
  - Omkörd ensam nådde den också tidsgränsen: testet tog 531 s, mot gränsen 300 s, och maskinen var fortfarande belastad. Ingen av 309c:s filer används av svepet. I ORDER 309b gick samma test igenom ensam på 153 s.
- **Sidoeffekt:** sviten skriver om `frontend/reports/order271/wineBar-camera-view.json`. Ändringen är återställd och inte committad.

## Filer

- `frontend/src/sim/morningReview.ts`: `MorningReview.restaurant` och `reviewChanges`.
- `frontend/src/strategic/ui/MorningReviewLine.tsx`: raden under stapeln.
- `frontend/src/strategic/ui/foljder.css`: `.nx-review-changes`.
- `frontend/src/content/nexusStrings.ts`: `foljder.review.classChange`, `venueChange` och `changesJoin`.
- `frontend/src/sim/__tests__/order309cBadaRyktena.test.tsx`: testerna.
- `frontend/scripts/order309c-check.mjs` och `frontend/reports/order309c/`: kontrollen.

## Öppna frågor

- **Var raden står:** den står under stapeln i kortets huvud, i kortets dämpade färg. Design har inte ritat raden. Ska den ha en egen plats eller form i D5?
