# ORDER 315b del 2 och 3 — Designs D7 med tillägget, och foodtrucken i 3D

**Underlag:**
- Designs leveranser `documentation/leveranser/nexus-leverans-2026-10-06-din-vag/` (D7) och `-2026-10-07-din-vag-tillagg/` (tillägget), uppackade oförändrade.
- Anders beslut 2026-10-07 (BESLUT del 2; besluten om 315b del 2: ryktet, ombyggnaden, avvikelserna, musikhörnan, foodtrucken i 3D).

**Gren:** `order-315b-2` från `main` (`52448521`, efter 318b). Del 1: `ORDER_315B_RAPPORT.md`.

Varje tal pekar på en fil under `frontend/reports/order315b-2/`.

## 1. Texterna

- D7:s nycklar med tillägget i `content/design/dinVagStrings.ts`, inslagna i `STRINGS`. Prototypens ram, exemplen och fikats exempeldilemma är utelämnade; de fyra borttagna nycklarna är borta.
- `asa.row.rep` följer Anders beslut: "Ryktet följer med, byn känner dig redan" (inte D7:s "börjar om till hälften").
- `asa.row.closed`: "Bistron håller stängt {days} kvällar under ombyggnaden" (Anders 2026-10-07), med `LADDER.refitDays` 3.
- `review.fx.class`: "Ryktet på nivån {tier}".

## 2. Din väg (D7 careerPath.ts)

- Stegens ordning är D7:s (`balance.ts LADDER.order`): food truck, vinbar, bistro, ölkrog, restaurang, nattklubb, gästgiveri, stjärnkrogen.
- Linan med klara steg i guld, "Du är här", nästa steg med guldkant och låsta steg streckade (`ui/DinVag.tsx`). Kortet med de tre kraven, en stapel och brickan Klart eller Inte klart; kraven ur `sim/ladder.ts`.
- Knappen Din väg står i morgonens rubrikrad. **Fel som rättades:** den fasta knappen (ORDER 315a) låg under morgonens skärm och gick inte att trycka på (flödeskontrollen).

## 3. Åsas erbjudande vid dörren (D7 ownerOffer.ts)

- Erbjudandet kommer vid stängningen den kväll kraven är klara (`sim/ladder.ts offerAtClose`), som kvällens steg `offer` i fikats ställe; den kvällen blir det inget fika.
- Åsa står på trottoaren 1,25 m ut från dörren och hälsar, kameran glider till 10 m vid dörren (`scene/village/OwnerAtDoor.tsx`), kortet står till höger (`scenario/OwnerOfferScreen.tsx`).
- Ta över fungerar på kvällen; Inte än lämnar erbjudandet stående (morgonens rad).

## 4. Ombyggnaden och bistron (D7 bistroRefit.ts, tillägget bistroRoom.ts)

- Ta över bistron stänger krogen `LADDER.refitDays` (3) dagar (`ladder.refit`). Morgonen visar dagen och de fyra stegen; rummet går igenom tömt, byggt, dukat och tänt (`wineBarRoom.ts setRefitPhase`).
- Bistron byggs i vinbarens hus med tilläggets möblering, **31 platser** (`scene/bistroHouse.ts`): bänken med fyra bord för två, tre bord för fyra, fyra bord för två och tre barstolar. Simuleringen sätter 31 gäster i bistron (`service.ts bistroLayout`, sällskapens grupper och ordningen).
- Gångarna (mittgången, norra och södra gången och glappen mellan borden) bär gästernas och personalens vägar (`bistroRoute`); regissören och serviceflödet följer bistrons möblering.
- **Avvikelser från Design, godkända av Anders 2026-10-07:** vinbarens kök står kvar (med värmelampor över passet); hyllan bakom baren står 0,1 m längre västerut så att personalen (0,40 m) ryms; DJ-hörnet blir en musikhörna med skivspelare.
- Provet `scene/__tests__/order315bBistron.test.ts`: inga platser, gästvägar eller personalvägar i väggarna eller i borden, stolarna, bänken, baren och hyllan, och en full kväll med alla 31 platser utan en figur i en vägg.

## 5. Fikat efter stängning (D7 afterHoursFika.ts, tillägget dilemmaGrades.ts, fikaClips.ts)

- Dilemmakortets tre bedömningar i tilläggets färger (väl grundat grönt, delvis i papper, svagt i mörk mässing; aldrig rött), märkena och papperet efter 650 ms (`FikaScreen.tsx`, `fika.css`).
- Kortet står till höger; laget sitter vid bordet, den som frågar räcker upp handen (`gesture.raiseHand`) och de andra dricker ur koppen (`fika.sipCup`), kameran på 8 m (`scene/FikaAtTable.tsx`).

## 6. Nivåerna (D7 venueTier.ts)

- Spelarens skylt visar nivån med 1–3 knappar och byter material med nivån (griffeltavla, emalj, svart lack); stjärnor står bara på rivalerna.
- Morgonens rad: "Måndag morgon · vecka 2 av 8 · Vinbaren vid torget · Bistro · Mellan", och brickan "Från i dag: {nivå}" den morgon nivån ändras.

## 7. Vagnen och rivalens plats (D7 playerTruck.ts, truckClips.ts; tillägget rivalTorget.ts)

- Spelarens släpvagn på sin egen plats på torget (`scene/playerTruck.ts`, `villagePlaces.ts playerTruckPlacement`): runda gavlar, dragstång med gasolflaskor, dalablå med gräddrand, markisen med bågad kant, skylten med nivåns knappar, trädäcket med ståborden och ljusslingan.
- Rivalernas plats på torget är tilläggets, alla kvällar (`TRUCK_STANDS.torget`).
- Provet mot kartan (`order312PaVagen.test.ts`, `onRoadAudit.ts`): vagnen, trädäcket och rivalernas två vagnar står inte på en väg, inte i ett hus och inte i varandra.
- Klippen `truck.grill`, `truck.hatchServe`, `truck.wipeCounter`, `gesture.raiseHand` och `fika.sipCup` och rekvisitan `tongs`, `foodBox`, `coffeeCup` (`figureClips.ts`, `tableware.ts`; 130 klipp, 34 föremål).

## 8. Del 3: foodtrucken på krogens nivå i 3D

Anders 2026-10-07: "Foodtrucken på krognivån (Z) ska inte vara den gamla 2D-scenen."

- Krogen (Z), Esc och servicens kamera går till den egna vagnen på 12 m med luckans sida mot kameran (`PlayerTruckCrew.tsx`, `CameraContext.tsx setMyBusinessOverride`). Den gamla 2D-scenen över krogens nivå är borta.
- Vagnen är ett skal (golv, väggar med luckans öppning, öppna gavlar), så att besättningen syns när taket kapas (närmare än 20 m); markisen tonas till hälften närmare än 14 m (D7).
- Besättningen vid grillen och luckan spelar D7:s klipp; gästerna står i kön under markisen, vid beställningen och hämtplatsen, och äter vid ståborden.
- Torgets och gatans träd står inte i vagnen eller över trädäcket (kronan skymde vagnen).

## 9. Säsongerna

Samma 17 körningar, 40 frön var (`scripts/order315b-2-harness.sh`, `reports/order315b-2/efter40/`), jämförda med 318b i `reports/order315b-2/jamforelse.json`:

- De som når bistron förlorar omkring 10 000 kr i kassan vid säsongens slut (de tre stängda kvällarna), med samma antal som når bistron.
- Stjärnan vid 0,85: 18 → 19 av 40 (målet omkring hälften). Vid 0,75: 1 av 40, oförändrat (målet 10–25 %, 315c). Vid 0,6: 0.
- De som inte når bistron är oförändrade. Den som har hälften rätt stänger i 33 av 40 (målet 30–50 %, 315c).

## 10. Verifiering

- Flödeskontrollen i produktionsbygget: `reports/order315b-2/check-sv.json` (`ok: true`) och bilderna `check-sv-*.png` (`scripts/order315b-2-check.mjs`): Din väg, erbjudandet vid dörren och Ta över, bistron i servicen, en morgon under ombyggnaden, fikat med svaret, vagnen på torget och krogens nivå i 3D med besättningen synlig (världspositionerna i `truck.crew`).
- Layoutkontrollen i fem storlekar: `reports/order315b-2/layout.json`, inga fel.
- Hela sviten grön (190 filer).

## Kvar

- 315c: halvan (30–50 % stänger) och stjärnan vid 0,75 (10–25 %).
- ORDER 306b efter 315c (`SITUATIONER_306b.md`).
