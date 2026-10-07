# ORDER 318 — Byn i ett mått, lagret som syns, svinnet efter hållbarheten och Bankens varning

**Beställt:** Anders 2026-10-07, två meddelanden från provspelet (kl. 22.13 och "Anders svarade fel och köpte för mycket med flit"). Görs före 315c, tillsammans med väggarna och D6 (ORDER 317).
**Gren:** `order-318` från `main` (`f4e23689`).

## 1. Byn i kväll och Byn just nu

Provspelet: "6:e i byn", "Du drar flest gäster i kväll" och "Lugn kväll" stod samtidigt, och panelerna skymde rummet.

- **Ett mått:** placeringen räknas på kvällens nöjda gäster (villageLive `content`, samma som byns kväll), och står i klartext: "3:e av 4 efter nöjda gäster". Utan nöjda gäster finns ingen placering ("Inga nöjda gäster än"). Regeln i `src/sim/villageNow.ts` (`villageNow`, `playerPlace`, `villageNowSummary`).
- **Ihopfälld som standard:** bandet är en rad med placeringen och pilen för den senaste kvarten (`balance.ts VILLAGE_NOW.trendWindowMin` 15, Designs D6). Klick på raden eller **B** fäller ut Byn just nu (`ui/host/VillageNowPanel.tsx`). Bandet är lika brett som klockan också utfällt.
- **Utfällt:** alla krogar som är öppna i kväll, i placeringens ordning, med kolumnerna Gäster och Nöjda. Sammanfattningen följer placeringen, t.ex. "Du drar flest gäster, men få är nöjda. Torgkrogen leder."
- **Lugn kväll** står inte när krogen har flest gäster i byn (`playerHasMostGuests`).
- Före öppning: "I går: 3:e av 7 efter nöjda gäster". Bandet står inte över inköpsskärmen.

## 2. Överlapp

`scripts/order300-layout.mjs` räknar nu också situationens kort, händelsens textrad (`theatre-caption`), meddelandena i rummet och Byn just nu, mäter situationen med panelen ihopfälld och utfälld (`raketen`, `raketen-byn-utfalld`), och har en ny kontroll `covered`: rubriker på en öppen skärm som en HUD-panel ligger över. Den hittade felet från provspelet (bandet över "Dryckeslista" i inköpen, alla fem storlekar). Efter rättningen: alla skärmar ok i alla fem storlekarna, `frontend/reports/order318/layout.json`.

## 3. Lagret, svinnet och tiderna

- **I lager per vara** (`strategic/simulation/morningBuy.ts`, `MorningBuyScreen.tsx`): "I lager: 5 portioner · räcker inte hela kvällen · går ut efter i morgon"; för drycken flaskorna, glasen i en öppnad, "oöppnade flaskor håller" och när den öppnade går ut. Kvällarna räknas på kvällens väntade gäster fördelade på varorna i lager.
- **Inköp i dag** är bara dagens inköp: stegräknaren visar det som köpts i dag (`day.boughtToday`), och bara det går att lämna tillbaka. Foten säger "I lager: … · värde …" i stället för "… i inköp".
- **Svinnet efter hållbarheten** (`src/sim/shelfLife.ts`, `stockPackages.ts`): portionsboken står i partier med inköpsdag och sista kväll (`WASTE.shelfEvenings`, en rätt håller som sin huvudråvara). Gästerna tar ur det äldsta partiet. Efter kvällen blir partier vars sista kväll har varit svinn. Oöppnade flaskor blir aldrig svinn; när en flaska öppnas sparas dagen, och glasen i den blir svinn efter `WASTE.openBottleEvenings` (3) kvällar. Gårdagens rester som tas tillvara säljs samma kväll eller inte alls. Talen är valda, inte beslutade: **F66** i `NEXUS_V1_OPPNA_FRAGOR.md`.
- **Tiderna:** knappen "Öppna dörrarna 19.05" och klockans "Dörrarna öppnar 19.05" läser samma funktion (`sim/clock.ts doorsOpenMinutes`, `formatClock`).

## 4. Bankens varning och kvällens resultat

- Efter första bokslutet under noll säger Banken "Kassan är under noll. Två bokslut till i rad, så stänger krogen.", efter det andra "Ett bokslut till under noll, så stänger vi." (`BankDialog.tsx bankBelowZeroWarning`, `RISK.closeAfterWeeksBelowZero`). Varningen står varje morgon tills nästa bokslut och i avräkningen.
- Kvällens resultat har blocket "Det här drog ned kvällen": svinn (slängt värde och sopbilen), fel svar (antal och kassan) och dagens inköp, störst först (`eveningResult.ts eveningDrags`).

## 5. Säsongerna före och efter hållbarheten

Samma 17 körningar som ORDER 315a, 40 frön var (`frontend/scripts/order318-harness.sh`, `frontend/reports/order318/efter40/`), jämförda i `frontend/reports/order318/jamforelse.json` (`scripts/order318-jamforelse.mjs`). Svinnet blir mindre när maten håller mer än en kväll, och de som köper rimligt tjänar lite mer:

- stjärnspelaren 0,85: stjärna i 11 → 18 av 40 säsonger (målet omkring hälften), bistron 19 → 23;
- stjärnspelaren 0,75: stjärna i 0 → 1 av 40 (målet 10–25 %, fortfarande under);
- stjärnspelaren 0,6: ingen stjärna (som målet);
- trappans stängningar i stort sett oförändrade; den kloka och mentorn når fortfarande inte bistron (hör till 315c).

## 6. Verifiering

- Kontrollen i spelarens flöde, produktionsbygget 1440 × 900: `frontend/reports/order318/check-sv.json` (`ok: true`) med bilderna `check-sv-*.png` (`scripts/order318-check.mjs`).
- Layoutkontrollen i fem storlekar: `frontend/reports/order318/layout.json`.
- Tester: `src/sim/__tests__/order318Byn.test.ts`, `order318Lagret.test.ts`. Två äldre tester (`order275Stock`, `order285EveningResult`) förutsatte att maten blir svinn samma kväll; de följer nu hållbarheten. Hela sviten: 189 filer gröna.
- `wineBarRoom.test.ts` skrev över ORDER 271:s rapport vid varje körning av sviten; nu bara med `WRITE_REPORTS=1`.
- Speldesignen har besluten 2026-10-07 (lagret och svinnet, Bankens varning).

## Kvar

- F66: hållbarhetens tal väntar på beslut.
- 315b del 2 (D7) och 315c enligt ordningen.
