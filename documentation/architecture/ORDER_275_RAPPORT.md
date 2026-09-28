# ORDER 275 — Lagret är insatsen (rapport)

**Ordern** (Vision Owner 2026-09-28, provspel):
- Före servicen köper spelaren ett baspaket av rätter och drycker, och kan köpa till fler viner och rätter.
- Kassan sjunker direkt.
- Under servicen säljs portioner ur lagret. Osålt blir svinn.
- Paketen ersätter inköpen i morgonens gränssnitt, och leverantörerna tas bort därifrån.
- Ingredienserna står kvar under ytan: ett paket är en samling ingredienser, så att recept, lager och svinn fungerar som förut.

## 1. Vad som byggdes

**Paketen** (`frontend/src/strategic/simulation/packages.ts`). Vinbaren har ett baspaket och sex tillköp:

| Paket | Innehåll |
| --- | --- |
| Baspaket | 6 soppor, 10 kyckling, 8 fläsk, 6 desserter, 30 glas husets vin och 8 öl |
| Fler kuvert | kyckling, fläsk och husets vin |
| Insjöfisk | fisk |
| Lamm | lamm |
| Vilt | vilt |
| Finare vin | finare vin på glas |
| Mer husets vin | husets vin på glas |

- Ett paket är portioner. Portionerna räknas om till ingredienser via recepten (`packageIngredients`).
- Priset är ingrediensernas kostnad hos den billigaste leverantören (`packageCostSek`). Baspaketet kostar 1 560 kr.
- Klasser utan paket behåller inköpen per ingrediens tills deras paket är skrivna.

**Vinet blir en lagervara** (`m4Catalogue.ts`): leverantören Bergslagen wine merchant, ingredienserna husets vin och finare vin, och rätterna vin på glas med `kind: 'drink'`. Ölen är också en dryck.

**Köpet** (`BUY_PACKAGE`, `stockPackages.ts` `buyPackage`):
- Paket köps bara på morgonen.
- Kassan sjunker direkt, med kassabokens rad `stock`. Lagret fylls.
- Menyn blir det som finns i lagret, till katalogens pris.

**Servicen:**
- Varje gäst tar en rätt och en dryck ur lagret, och ett andra glas med sannolikheten `STOCK.secondDrinkChance` 0,5 (`balance.ts`).
- Portionerna är betalda vid köpet. En såld portion drar därför ingen kostnad vid betalningen, och den dubbla kostnaden sedan ORDER 258/259 är borta i klasser med paket.
- Utan något i lagret finns inget att beställa, och gästen går utan att betala. Den gamla vägen, där gäster betalade utan lager, gäller inte vinbaren längre.
- En meny som redan är satt samma dag står kvar med sina priser. Menyn hämtas ur lagret vid `OPEN_SERVICE`, både till lunch och middag.

**Svinnet** (`wasteAtDayEnd`):
- Vid dagens slut blir osåld mat svinn.
- Drycken står sig till nästa dag.
- Svinnet i kronor står i `lastWaste`, och strömmen säger "Unsold food went to waste at closing".

**Gränssnittet** (`StockPackagesPanel.tsx`, i S1:s högra spalt):
- Visar baspaketet och tillköpen med innehåll, pris och "Buy", och vad som finns i lagret nu.
- Visar hur många gäster maten räcker till, att drycken står sig men maten inte, och gårdagens svinn.
- Menyn med egna priser och leverantörerna syns inte längre.
- Prognosen i schemat räknar kuvert på maten.

**Harnessen:** den rimliga spelaren köper baspaketet varje morgon (`MorningPlan.stock`, förvalt `'base'`). Den svaga köper inget paket, bara råvaror till ungefär fyra kuvert (`weakMorning`, `stock: 'none'`).

## 2. Tal

**Rimlig mot svag** (`frontend/reports/order275/week-players.json`, 20 veckor, vecka 2):
- Den rimliga spelaren har `mean.rimlig.resultSek` 4 596 kr i veckan. Före ordern var det 28 862 kr (`reports/order270/week-players.json`).
- Den svaga spelaren har −27 211 kr och går minus i `svagMinusWeeks` 20 av 20 veckor.
- Intäkten per gäst är lägre än på den gamla vägen: cirka 300 kr med rätt och dryck, mot 340 kr. Baspaketet kostar 1 560 kr om dagen.
- Gästflödet i ORDER 276 ger fler gäster vid rätta svar. Slumpmålet mäts om efter ORDER 277, som Vision Owner bestämt.

**Tester:**
- `frontend/src/sim/__tests__/order275Stock.test.ts` prövar paketen, köpet (kassan direkt, bara på morgonen), servicen (rätt och dryck ur lagret, inget lager ger ingen intäkt) och svinnet (maten kastas, drycken står sig).
- De äldre kassaboktesterna (`ledger`, `m3`, `order230`) köper nu baspaketet på morgonen.
- I avstämningen räknas kvoten utan lagerköpen på båda sidor. Driften i kronor är densamma som förut: 362 kr, den kända avvikelsen från ORDER 260.
- Hela sviten är grön.

**Spelarens flöde:** `frontend/reports/order275/dod.json`, `dod-26-lagret-fore-kop.png` och `dod-27-lagret-efter-kop.png`.
- `stock.before` "Cash120 k SEK" och `stock.after` "Cash118 k SEK": kassan sjönk med baspaketet direkt.
- `stock.inStock` 30 kuvert.
- Veckan gick igenom från normal start med ett köpt baspaket varje morgon.
- Rätterna delar ingredienser, så portionerna per rätt är ett tak ("up to 15 portions"). Kuverten räknas med `stockForecast`. Den gamla prognosrutan döljs i klasser med paket.

## 3. Öppet (F48)

- Paketens innehåll, andra glaset (0,5) och att drycken står sig är valda tal och val.
- Klasser utan paket har kvar den dubbla ingredienskostnaden från ORDER 258/259, när de köper råvaror. Det rättas när deras paket skrivs.
