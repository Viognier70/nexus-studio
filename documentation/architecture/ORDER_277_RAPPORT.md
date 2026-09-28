# ORDER 277 — Morgonen som insats (rapport)

**Ordern** (Vision Owner 2026-09-28, andra provspelet): "Menyn och dryckeslistan (viner på glas och flaska, öl, alkoholfritt) och mängder måste sättas innan servicen kan starta. Kassan syns hela tiden och räknas ner animerat vid varje inköp. Gästerna får kost (till exempel vegetarian, vegan, allergi) och plånbok. Saknas ett alternativ tappar man försäljning och rykte, och ett sällskap kan lämna."

Besluten står i speldesignen under Servicen > Lagret och Servicen > Gästerna, med en tolkning att bekräfta (spärren vid öppning).

## 1. Vad som byggdes

**Menyn och dryckeslistan** (`strategic/simulation/m4Catalogue.ts`, `packages.ts`):
- Kost och allergener läses ur recepten. En rätt med kött är kött, med fisk fisk, med mejeri eller ägg vegetarisk, annars vegansk. Mejeri ger laktos och mjöl gluten (`dishDiet`, `dishAllergens`).
- Nya rätter: linser med rostade rotfrukter (vegansk), kantareller på toast (vegetarisk, laktos och gluten) och lingonsorbet (vegansk).
- Dryckeslistan har fyra sorter (`Dish.drink`): vin på glas (Grüner Veltliner, Pinot Noir), vin på flaska (samma viner, fem glas per flaska, `glassesPerBottle`), öl och alkoholfritt (lingondricka).
- Baspaketet har nu något för varje gäst: en vegansk rätt och dessert, vin på glas och flaska, öl och alkoholfritt. Två nya tillsatser: Grönt och Mer alkoholfritt.

**Inköpslistan** (`StockPackagesPanel.tsx`, `BUY_ITEMS`, `stockPackages.ts` `buyItems`):
- Morgonens högerspalt är en lista med menyns rätter och dryckeslistans drycker, grupperade efter sort.
- Varje rad visar kost och allergener, gästens pris, kostnaden per portion, vad som finns i lager och en mängd med − och +.
- Paketen fyller listan i stället för att köpa direkt. "Köp listan" drar kassan direkt, med kassabokens rad `stock`.

**Spärren** (`stockPackages.ts` `stockReadiness`, `reducer.ts` `startService`):
- Servicen startar inte förrän minst en rätt och en dryck finns i lager (`MORNING_STAKE.minDishesToOpen`, `minDrinksToOpen`).
- Knappen "Open for the evening" är avstängd. Raden under säger vad som saknas (`strings.stock.notReady`).
- Mängden är spelarens sak: den som köper för lite får öppna (tolkningen i speldesignen).

**Kassan** (`strategic/ui/CashCounter.tsx`):
- Syns överst i mitten hela tiden, över morgonens schema och ovanför servicens klocka.
- Beloppet räknas mot det nya under `MORNING_STAKE.cashTickMs` (700 ms), och förändringen visas bredvid.
- Med prefers-reduced-motion byts talet direkt. `useTickingNumber` används också av krediterna i ORDER 279.

**Gästerna** (`strategic/simulation/guestOrders.ts`):
- Varje gäst har kost, en allergi eller ingen, om hen dricker alkohol, och sällskapets plånbok. Andelarna står i `balance.ts` `GUESTS`.
- Profilen läses ur spelets frö och gästens id, så den är densamma varje gång och flyttar inte simuleringens slumpflöde.
- Vid betalningen väljer gästen en rätt som passar kosten och allergin och ryms i plånboken, viktat efter plånbokens smak för pris. Sedan väljer hen en dryck.
- Ett generöst sällskap av minst två tar en flaska, och bordet delar på den.
- **Saknas ett alternativ:** gästen går utan att betala och ryktet sjunker. Med sannolikheten `GUESTS.partyLeavesChance` går sällskapet med. En rad står i strömmen, till exempel "A guest at table 3 found nothing vegan on the menu and left without ordering. Their party left with them, one more."
- Räcker plånboken inte till någon rätt tar gästen bara en dryck. Finns inget alkoholfritt får gästen som inte dricker alkohol inget glas. Båda sänker ryktet lite och ger en rad.

**Harnessen:** den svaga spelaren köper ett glas vin per kuvert utöver råvarorna (`scenarios.ts` `weakMorning`), eftersom servicen annars inte startar. Tester som öppnar vinbaren utan att handla köper baspaketet först (`testHarness/stocked.ts`). Tester av den gamla menyvägen (M4a, M6, ryktet) körs i en klass utan paket (`marketHeadroom.ts` `withoutPackages`).

## 2. Tal

**Rimlig mot svag** (`frontend/reports/order277/week-players.json` @ `order-277`, 20 veckor, vecka 2):
- Den rimliga spelaren (baspaketet varje morgon, bästa svaret) har `mean.rimlig.resultSek` 8 293 kr i veckan, mot 9 422 kr efter ORDER 276 (`reports/order276/week-players.json`). Skillnaden är gäster som inte hittar något för sin kost eller plånbok, och baspaketets nya rader.
- Den svaga har `mean.svag.resultSek` −24 756 kr och går minus i `svagMinusWeeks` 20 av 20 veckor.

**Slumpmålet** mäts efter ORDER 279, som Vision Owner bestämt.

**Tester:** `frontend/src/sim/__tests__/order277MorningStake.test.ts` (16 tester) prövar
- kost och allergener ur recepten, dryckeslistans fyra sorter och flaskans glas;
- inköpslistan (kassan direkt, bara på morgonen, bara klassens artiklar);
- spärren (inget lager, bara mat eller bara dryck ger ingen service; en rätt och en dryck räcker; klasser utan paket spärras inte);
- profilerna (samma varje gång, andelarna mot `balance.ts`, sällskapet delar plånbok, fröet ger andra gäster);
- saknade alternativ (vegan utan veganskt, sällskapet som går, snål plånbok, flaskan som bordet delar, alkoholfritt som saknas);
- att baspaketet tappar färre gäster än en meny utan veganskt och alkoholfritt.

Hela sviten är grön (2 137 tester, varav 4 överhoppade som förut).

**Spelarens flöde** (`frontend/reports/order277/dod.json` och `dod-*.png` @ `order-277`), produktionsbygget från normal start, bussen till söndagen och X1:
- `stock.startDisabledBefore` true och `stock.blockedText` "Set the menu and the drinks list before you open: at least one dish and one drink in stock." (`dod-26-lagret-spärren.png`).
- Listan fylld med baspaketet, Grönt och en flaska till: `stock.sheetTotal` 2 067 kr (`dod-26-lagret-fore-kop.png`, `dod-26b-dryckeslistan.png`).
- Kassan mitt i animationen: `stock.counterMid.shown` 118 025 mot `value` 117 834, förändringen `delta` −2 067 (`dod-27-kassan-raknas-ner.png`). Efter: `stock.counterAfter.shown` 117 833.
- `stock.startDisabledAfter` false: servicen kunde starta (`dod-27-lagret-efter-kop.png`).
- Veckan gick igenom med listan köpt varje morgon, utan fel i sidan (`errors` tom).
- En gäst utan alternativ fångades inte på bild i den här körningen (`lostSale` saknas i `dod.json`): med baspaketet och Grönt fanns något för alla kosttyper. Raden prövas i testerna (vegan utan veganskt, sällskapet som går).

## 3. Öppet (F50)

- Tolkningen av spärren mot "att bli stoppad är det inte" (speldesignen, att bekräfta).
- Andelarna för kost, allergi, alkohol och plånbok, och vad ett saknat alternativ kostar, är valda tal.
- Kassan överst krockar med raden i rummet mitt i servicen (den ligger på samma höjd som klockan). Klockans synlighet är en del av ORDER 280.
