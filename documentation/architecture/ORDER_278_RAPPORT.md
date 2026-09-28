# ORDER 278 — Servicen syns (rapport)

**Ordern** (Vision Owner 2026-09-28, andra provspelet): "En händelseström som i stunden visar beställningar, betalningar som tickar in, dricks och slumpens händelser. Lagret syns under servicen: portioner och flaskor per artikel. Det som tar slut ger missnöjda gäster. Svinn räknas efter kvällen, en del kan användas nästa dag, resten hämtas av sopbilen mot en miljöavgift som växer med råvarans pris och mängd."

Besluten står i speldesignen under Servicen > Händelseströmmen och Servicen > Lagret.

## 1. Vad som byggdes

**Beställningen i stunden** (`reducer.ts`, `guestOrders.ts`):
- I klasser med paket beställer gästen när maten beställs (gästen går till `dining`), inte när hen betalar. Lagret går ner då.
- Strömmen säger till exempel "Table 4 orders: Pork with root veg, Grüner Veltliner, by the glass."
- Hittar gästen inget för sin kost eller plånbok går hen direkt, och sällskapet kan gå med (ORDER 277).
- En service som öppnats utan meny (äldre tester via `OPEN_SERVICE`) beställer vid betalningen som förut.

**Betalningen och dricksen:**
- När gästen betalar står notan och dricksen i strömmen: "Table 4 pays 310 SEK and leaves 37 SEK as a tip."
- Dricksen är en andel av notan efter gästens nöjdhet (`SERVICE_STREAM.tipBands`). Den går till kassan och räknas i `day.tipsSek`.
- Kassan överst (ORDER 277) tickar upp vid varje betalning.

**Slumpens händelser** (`sim/serviceChance.ts`):
- Mellan två och sex per kväll, utspridda över tiden med öppna dörrar: ett glas vin välter (ett glas ur lagret), en stamgäst bjuder baren på en runda, ett sällskap firar en födelsedag med en flaska, gäster kommer in utan att ha bokat, grannen klagar på ljudet, en gäst berömmer stället.
- Varje händelse verkar direkt (lagret, kassan, gästerna) och står i strömmen.
- Går den dragna händelsen inte (till exempel inget vin i lager) prövas nästa.

**Strömmen** (`EventStreamPanel.tsx`) i designsystemets färger, nederst i mitten, fri från raketkortet och mätarna.

**Lagret under servicen** (`PlatesRemainingPanel.tsx`, `data-testid=service-stock`):
- Till vänster, under mise en place och ovanför mätarna, i designsystemets form.
- Rätterna i portioner, vinet på glas i glas, flaskorna i flaskor.
- Det som tagit slut står som OUT och tonas ned, i samma stund som strömmen säger det.

**Det som tar slut ger missnöjda gäster** (`guestOrders.ts`):
- Gästen vill ha en viss rätt, också en som tagit slut.
- Är den slut får hen en annan som passar och tappar `SERVICE_STREAM.soldOutSatisfaction` i nöjdhet. Det ger lägre dricks.
- Strömmen säger till exempel "Table 3 wanted the poached pike-perch, but it had run out."
- Finns inget som passar går gästen, och ryktet sjunker.

**Svinnet** (`stockPackages.ts` `wasteAtDayEnd`):
- Efter kvällen går en del av den osålda maten att använda nästa dag, per råvara (`WASTE.carryShare`). Färsk fisk, örter och sallad sparas inte.
- Resten hämtas av sopbilen. Miljöavgiften är en fast avgift plus en andel av svinnets värde plus en avgift per portion (`WASTE.feeBaseSek`, `feeShareOfValue`, `feePerUnitSek`). Den växer alltså med både pris och mängd.
- Avgiften dras ur kassan med kassabokens nya rad `waste`.
- Strömmen säger det vid dagens slut, och morgonens lista visar vad som sparades, svinnet och avgiften.

## 2. Tal

**Rimlig mot svag** (`frontend/reports/order278/week-players.json` @ `order-278`, 20 veckor, vecka 2):
- Den rimliga spelaren har `mean.rimlig.resultSek` 14 035 kr i veckan, mot 8 293 kr efter ORDER 277. Skillnaden är dricksen, slumpens rundor och flaskor, och maten som sparas till nästa dag, minus sopbilens avgift.
- Den svaga har `mean.svag.resultSek` −26 049 kr och går minus i `svagMinusWeeks` 20 av 20 veckor.

**Tester:** `frontend/src/sim/__tests__/order278ServiceVisible.test.ts` (9 tester) prövar
- att beställningen läggs vid bordet och betalningen står i strömmen, med dricks;
- dricksens band efter nöjdheten;
- slumpens händelser (antal per kväll, tiderna inom kvällen, ett glas som välter tar ett glas ur lagret);
- gästen som ville ha en rätt som tagit slut, fick en annan och blev missnöjd;
- svinnet (det som sparas per råvara, miljöavgiften efter pris och mängd, dyrare råvara ger högre avgift) och att avgiften dras ur kassan med raden `waste`.

Hela sviten är grön (2 145 tester, varav 4 överhoppade som förut).

**Spelarens flöde** (`frontend/reports/order278/dod.json` och `dod-*.png` @ `order-278`), produktionsbygget från normal start, bussen till söndagen och X1, utan fel i sidan (`errors` tom):
- Lagret under servicen: `serviceStock` har en rad per artikel med `left` (till exempel soppan 18, kycklingen 10), i portioner, glas och flaskor (`dod-33-lagret-under-servicen.png`).
- Strömmen under måndagskvällen (`stream`, 60 rader): 22 beställningar ("Table 4 orders: …"), 21 betalningar med dricks ("Table 4 pays 468 SEK and leaves 56 SEK as a tip."), och en rätt som tog slut: "Table 5 wanted the chanterelles on toast, but it had run out. They took the roast roots with lentils, and they are not pleased." (`dod-34-strommen.png`).
- En slumpens händelse: `chanceShot` "A glass of wine was knocked over at the bar. One glass from the stock is gone." (`dod-35-slumpens-handelse.png`).
- Svinnet på tisdagsmorgonen: `waste` "Yesterday: 25 portions were kept for today. 34 portions went to waste (237 SEK), and the refuse truck charged 199 SEK as an environmental fee." (`dod-36-svinnet-morgonen.png`).

## 3. Öppet (F51)

- Dricksens band, slumpens händelser och vikter, missnöjet när något tar slut, vad som sparas per råvara och miljöavgiften är valda tal.
- Dricksen går till kassan. I verkligheten går den ofta till personalen; det kan höra till personalnöjdheten i ORDER 281.
- Kassan överst ligger på samma höjd som raden i rummet mitt i servicen (se ORDER 277 §3).
