# ORDER 280 — Kassan, kvällen och resten av engelskan (rapport)

**Ordern** (Vision Owner 2026-09-28, andra provspelet): "Resten av engelskan, även frågorna och äldre komponenter. Kontrollera också att klockan för servicen syns tydligt." Utvidgad 2026-09-29: "Insatsen görs bara i krediter … Inget extra belopp dras från eller läggs till kassan. Kassa och krediter byter aldrig plats. Namnet är 'Back your knowledge'. Inga casinodrag … Utfallet avgörs bara av svaren. Krediter kan aldrig köpas." Och: "Trycket ska i stället komma från de fasta kostnaderna. Inför en veckohyra per klass, dragen vid veckoavräkningen och synlig i tidningen, och visa lönerna som en veckorad i avräkningen. Kalibrera hyran så att den rimliga spelaren går plus med ungefär 5–10 % av veckointäkten, och den svaga spelaren nedgraderas inom två till tre veckor. Mät om slumpmålet. … Använd juice.ts och skärmarna M1–K1 i ORDER 280." Svar på mina frågor: Designs säkerhet per steg, dricksen till personalens pott, Designs kg-taxa, Designs partier.

Besluten står i speldesignen: Servicen > Back your knowledge (ersätter insatsen, "Ersatt 2026-09-29"), spärren vid öppning "Bekräftat", Ekonomin > Hyran och lönerna, dricksen och svinnet. Talen står i F53.

## 1. Vad som byggdes

**Hyran och lönerna** (`sim/economy.ts` `weeklyRentSek`, `settleWeek`; `balance.ts` `RENT`):
- Veckohyra per klass = `RENT.shareOfNormalWeeklyRevenue` × klassens normala veckointäkt, dragen vid veckoavräkningen (kassaboksrad `rent`), och synlig som rad i tidningen och avräkningen.
- Veckans löner summeras när de bokas (`weekWagesSek`) och visas som en veckorad i avräkningen. De dras som förut per dag; raden visar summan.

**Back your knowledge** (`sim/incidents.ts` `canStartBack`, `startBack`, `backAnswer`, `recordCalibration`, `calibrationNote`; `reducer.ts` `START_BACK`; `scenario/IncidentPanel.tsx`, `scenario/BackPanels.tsx`; `balance.ts` `BACK`):
- Bara krediter. Kassan rörs inte av Back your knowledge; raketens vanliga följder gäller som för varje raket. Den gamla insatsen (`BET`, `BetPanel.tsx`, kassaboksraden för insatsen i kronor) är borttagen.
- Designs säkerhet per steg: före varje svar väljer spelaren Guessing (+1 om rätt, ±0 om fel), Think so (+2 / −2) eller Know it (+3 / −6). Stegen väger ×1, ×1,5, ×2. Högst tre per kväll.
- B1: raketen till vänster lyfter ett steg per rätt svar och tippar vid fel; "How sure you were" visar kvällens träffsäkerhet per säkerhet med en mening om kalibreringen. Spelartexten för Back your knowledge (`strings.back`) har inga ord som bet, gamble eller jackpot, och det finns inga hjul. `grep -niwE "bet|gamble|jackpot|wager" frontend/src/content/nexusStrings.ts` ger bara kassabokens nyckel `bet` (som visar "Stake" för gamla rader, ingen ny rad skrivs) och den gamla gruppen `wager` från ORDER 043, som ingen komponent läser.

**Designs leverans kassan och kvällen** (`ui/juice/juice.ts` från leveransen, `ui/juice/fx.ts`):
- **K1** klockan (`ui/service/ServiceClock.tsx`): klockslaget i 60 px med fast bredd, etiketten (Morning, Service, Rush, Last orders, Closed) och tiden kvar, tio halvtimmesrutor 18–23 med den sista i accent. På morgonen "Doors open 18:00", efter stängning sopbilens tid.
- Kassan och krediterna (`ui/CashCounter.tsx`) som två rutor i HUD:en, räknade i steg med `countTo`. En lapp som flyger till kassan räknas först när den landat.
- **M1** morgonens inköp (`business/MorningBuyScreen.tsx`, `simulation/morningBuy.ts`): meny och vinlista med partier (rätt 5 portioner, flaska 2, öl 6), köpt i dag, täckning mot väntade gäster, glas per gäst och intäkten om allt säljs. Lappen flyger till kassan vid varje köp; ångra ger pengarna tillbaka (`RETURN_ITEMS`).
- **L1** lagret under servicen (`business/PlatesRemainingPanel.tsx`): portioner och flaskor kvar med In stock, Running low och Sold out.
- **H1** händelserna (`ui/service/EventsPanel.tsx`): beställt, betalt och dricks med belopp, varningar om lagret, I kväll (betalt, dricks till personalen, öppna notor) och knappen till Back your knowledge.
- **S1** sopbilen (`scenario/WasteScreen.tsx`): första skärmen på kvällen, fyra fraktioner i kg, svinnets värde och miljöavgiften (hämtning + kr per kg) som flyger till kassan, och ett råd till morgondagen.
- Juice-inställningen Balatro/Lugn i menyn (`ui/TopRightMenu.tsx`); Lugn och reduced motion skalar ner utslagen och stänger av skaket.

**Dricksen till personalens pott** (`reducer.ts`): dricksen syns i strömmen och i I kväll men går aldrig till kassan (`staffTipPotSek`).

**Svinnet med kg-taxa** (`stockPackages.ts` `wasteAtDayEnd`, `settleWaste`; `balance.ts` `WASTE`): avgiften räknas och dras när servicen stänger, och ingår i kvällens kostnad.

**Resten av engelskan:** äldre komponenter (`ControlsHint`, `OutwardButton`, `SelectionChrome`, `ScenarioOverlay`, `ScaleDownPanel`, gamla `StockPackagesPanel` borttagen) läser nu strängtabellen (grupp `legacy`). Frågorna i spelet går via raket- och frågebankerna, som redan har engelska.

## 2. Tal

**Hyran.** Den rimliga spelaren mäts på två sätt, och hyran är satt så att båda ligger inom målet 5–10 %:
- Kalibreringens spelare (vecka 2, vinbaren, baspaketet och bästa svaret, tio frön; `frontend/reports/order280/rent-check.json` @ `order-280`): med `RENT.shareOfNormalWeeklyRevenue` 0,15 är `rows[0].reasonable.meanShare` 0,097 (`meanResultSek` 4 781 kr av `meanRevenueSek` 45 743 kr).
- Harnessens veckospelare (vecka 2, bästa svaret, ingen morgon, 20 frön; `frontend/reports/order280/week-players.json` @ `order-280`): `mean.rimlig.resultShare` 0,057 (`resultSek` 2 953 kr av `revenueSek` 43 956 kr). Intäkten och andelen är nya fält i rapporten (`order270Incidents.test.ts`).

Svepet (`frontend/reports/order280/rent-calibration.json`) gav för kalibreringens spelare 0,236 utan hyra, 0,143 vid 0,1, 0,097 vid 0,15 och 0,051 vid 0,2. Först valdes 0,175 (7,4 %), men veckospelaren fick då bara 3,2 % (1 901 kr); därför 0,15. Filens `chosenShare` 0,2 är svepets utgångsvärde; det valda står i `rent-check.json`. Hyran i vinbaren blir 6 314 kr i veckan (0,15 × 42 090 kr, `ECONOMY.normalWeeklyRevenueSek.vinbar`).

Den svaga spelaren (från vecka 1, weakMorning) nedgraderas vid avräkningen efter vecka 3 i alla tio frön (`rows[0].weakDowngradeWeeks`), inom målet två till tre veckor. Men hon gör det också utan hyra (`rent-calibration.json` `rows[0]`): startkassan och hennes förluster avgör, inte hyran.

**Slumpmålet** (`frontend/reports/order280/randomness.json` @ `order-280`, 1 000 veckor): `winShare` 0,739 (`betterWins` 739, `ties` 0). Målet är 70–80 %. Efter 279 var det 0,734. Mätt om efter att hyran sattes till 0,15; hyran är densamma för båda spelarna och flyttar inte vem som vinner.

**Rimlig mot svag** (`frontend/reports/order280/week-players.json` @ `order-280`, 20 veckor): `mean.rimlig.resultSek` 2 953 kr, `mean.svag.resultSek` −33 734 kr, `svagMinusWeeks` 20 av 20. Efter 279 var den rimliga 14 374 kr. Skillnaden är hyran och att dricksen inte längre går till kassan.

**Tester:** `frontend/src/sim/__tests__/order280BackYourKnowledge.test.ts` (9 tester: bara krediter, kassan orörd, säkerhet per steg, stegens vikt, högst tre per kväll, kalibreringen), `frontend/src/strategic/testHarness/__tests__/order280RentCalibration.test.ts` (hyran inom målet, tio frön; svepet med `CALIBRATE=1`), `economy.test.ts` (hyran i avräkningen), `order278ServiceVisible.test.ts` och `order275Stock.test.ts` (kg-taxan, avgiften vid stängning), `order279QuestionsAndStake.test.ts` (insatsens tester borttagna, menyraketerna kvar). Hela sviten är grön (133 testfiler, 2 164 tester, varav 4 överhoppade som förut, en testfil överhoppad).

**Spelarens flöde** (`frontend/reports/order280/dod.json` och `dod-*.png` @ `order-280`): produktionsbygget från normal start, bussen till söndagen och X1, med hyran 0,15. Inga fel i sidan (`errors` tom).
- **M1** (`dod-26-lagret-spärren.png`, `dod-27-M1-morgonen.png`, `dod-27-M1-lappen-flyger.png`): öppna-knappen är spärrad utan rätt och dryck (`stock.startDisabledBefore` true, `blockedText`). Under lappens flygning visar kassan det gamla talet (`stock.midFly`: `value` 118 294, `shown` 118 894) och sedan det nya (`afterBigBuy` 118 291 / 118 291). Köpt i dag `stock.spent` 1 580 kr, täckning `coverage` 25 kuvert mot 17 väntade gäster. Ett ångrat köp ger pengarna tillbaka (`afterReturn`).
- **K1** klockan (`dod-25-tiden-kvar-1.png`, `-2.png`): `clock[0].text` "18:08 Service 4 h 52 min left", `clock[1]` "19:09 … 3 h 51 min left".
- **L1** och **H1** (`dod-33-lagret-under-servicen.png`, `dod-34-strommen.png`, `dod-38-H1-handelser.png`): lagret per rätt (`serviceStock`), beställningar med bord och belopp och varningar om lagret i strömmen (`stream`).
- **B1** Back your knowledge (`dod-39-B1-*.png`, `dod-40-B1-*.png`): `backs[0]` (`mn05-linser`, bästa svaret med Know it, Think so, Think so) gav krediterna 22 → 26 → 30 → 35: säkerhetens krediter gånger stegets vikt, plus raketens vanliga kredit för rätt svar. `backs[1]` (`mn06-lingon`, fel svar med Think so) gav 35 → 33. Kassan rör sig bara med kvällens intäkter och raketens vanliga följd.
- **S1** sopbilen (`dod-42-S1-sopbilen-bilen.png`, `dod-42-S1-sopbilen.png`): `s1.kg` 16,8 kg, `s1.fee` 469 kr (16,8 × 2,90 + 420). När skärmen öppnas visar kassan talet utan avgiften (`s1.cashAtOpen`: `value` 124 302, `shown` 124 771); när lappen har landat visar den värdet med avgiften dragen (`afterFly` 124 292 / 124 292).
- **Tidningen** (`dod-10-T1-sondagstidningen.png`): "The week's rent for the premises, SEK 6,314, has been paid. Wages for the week came to SEK 21,600." (`report.newspaper` fångar bara tidningens huvud, så beviset är skärmdumpen.)
- **X1** (`dod-50-X1-utan-verksamhet-och-pengar.png`): som förut.

## 3. Avvikelser och öppet

- **Klockan** står vid x 540 i stället för Designs x 740, som krockar med kassan, krediterna, farten och menyn i spelets högra kluster.
- **Krediterna:** Designs klassiska skala 1 / 2 / 3 med förlust 0 / 2 / 6, inte 20 / 40 / 60, eftersom krediterna i spelet är små heltal (F53).
- **M1:** portionerna per rätt är "upp till", eftersom rätterna delar råvaror.
- **AboutPanel** har kvar hårdkodad engelska. Den gamla frågemallen (`questionTemplates`, svensk) nås inte från spelet (den gamla `START_EXAM`) och är inte översatt.
- **Hyran nedgraderar inte den svaga spelaren**: det gör startkassan och hennes förluster, också utan hyra.
- Personalnöjdheten (281) och ritualerna (282) återstår.

Öppen fråga F53. Gren `order-280` från `main`.
