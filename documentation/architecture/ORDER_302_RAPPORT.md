# ORDER 302 — Gatans folk (rapport)

**Underlag:** Anders 2026-10-04 (`ORDRAR_300-302.md`): "Folket på gatan går i rad, med samma avstånd och samma fart."

Gren `order-302` från `main` (`dde10f7`). Talen pekar på `frontend/reports/order302/check-1440x900.json` och `check-1280x720.json`. Kontrollen är `scripts/order297-check.mjs` i produktionsbygget, fredagens sparfil i vinbaren, med stoppen 18.50, 19.30, 21.00, 22.20 och 22.50 på fyra nivåer. Gatans läge läses ur `body.dataset.villageStreet`, som `VillageLife.tsx` skriver.

## 1. Fanns koreografin redan?

Ja, delvis, i Designs leverans Byn i kvällsljus 10-01 (`byKvallSim.js`, `byKvall.js`; `villageQueue.balance.ts` gäller kön). D3 (omtaget 10-02) har ingen egen koreografi för gatan.

**Det leveransen har, och som används:**
- **Sällskapets storlek per gästtyp:** studenter 2–4, medel 2–3, hög 2.
- **Fart:** en per typ, plus eller minus 10 % per sällskap.
- **Formationen:** medlemmarna i en liten kil med drift.
- **Vid dörren:** sällskapet samlas utanför innan det går in (1,8 s).
- **Kön och nästa krog:** kön, och en annan krog när kön är full (byggt i ORDER 297).
- **Lova och miljardären:** folk stannar och vinkar.

**Det leveransen inte har:** trottoarer (prototypen går på vägens mittlinje), pauser för att peka, prata eller läsa menyn, och en fart- och avståndsspridning som ger ojämna avstånd. Det byggs här.

## 2. Sällskapen

- **Storleken** är 1–4: 8 % ensamma, 47 % två, 25 % tre och 20 % fyra (`VillageLife.tsx` `PARTY_WEIGHTS`). Förut var det 1–3 jämnt fördelat för alla utom studenterna, så en tredjedel gick ensam.
  - I kontrollen: `villageStreet.sizes` [ensamma, två, tre, fyra], till exempel 19.30 i 1440 × 900: [1, 3, 1, 1] och 21.00: [1, 7, 2, 0].
- **Bredvid varandra:** två i bredd (0,62 m isär), och raderna efter varandra (0,95 m). Förut gick de i rad.
- **Fart och avstånd:** varje sällskap har sin egen fart, plus eller minus 25 % kring gästtypens (`PACE_SPREAD`). Avstånden mellan sällskapen blir därmed ojämna.
- **Båda trottoarerna:** varje sällskap har sin sida och går på trottoaren, halva gatans bredd plus kantstenen från mittlinjen. På gångvägar och stigar går man på vägen (`villageNetwork.ts` `sidewalkOffsets`, samma bredder som byns lyktor läser).
  - I kontrollen: `left` och `right`, till exempel 19.30: 3 och 3, 21.00: 4 och 6.
  - Ingen går mitt i en bilgata.

## 3. Pauserna

- **Peka eller prata:** var tredje sällskap (`PAUSE_CHANCE` 0,35) stannar en gång på vägen i 0,6–1,8 spelminuter. När de pekar vänder de sig åt sidan, när de pratar mot varandra.
- **Läsa menyn:** går vägen förbi en annan krogs dörr stannar sällskapet där ibland (`MENU_CHANCE` 0,3) och vänder sig mot dörren.
- Pauserna är korta mot promenaden, så de syns sällan i ett enskilt stopp (`pausing` 0–1).
- **Avvikelse:** gatans figurer har ingen arm att peka med. Pekandet och läsandet visas med att sällskapet stannar och vänder sig, inte med en gest.

## 4. Målen

- **Mål:** varje sällskap är på väg till en bestämd krog, eller hem efter måltiden. Det fanns sedan ORDER 288/297.
- **Före 19.00 tätnar det mot krogarna:** sällskapen ger sig av upp till 30 spelminuter tidigare (`EARLY_LEAVE_MIN`), och den som är framme före sin tid väntar utanför dörren. Förut var gatan tom före 19.00.
  - I kontrollen kl. 18.50: 3 sällskap ute (`villageGroups`).
- **Efter 22 glesnar det:** 21.00: 11 grupper, 22.20: 9 och 22.50: 6 (1440 × 900).

## 5. Konkurrensen som syns

- **Vid dörren:** varje sällskap samlas utanför dörren innan det går in, också hos konkurrenterna (`GATHER_MIN` 0,9 spelminuter). Den som väljer en konkurrent syns alltså stanna vid den dörren och gå in.
- **Ordet på gatan (ORDER 303 C):** efter fel svar stannar några sällskap på väg till oss vid vår dörr, läser menyn och går vidare till den närmaste öppna konkurrenten. Hur många följer ordet på gatan (`sim/streetWord.ts`).
  - I kontrollen i 1280 × 720 vände 2 gäster så från 21.00 (`villageStreet.wordAway`). I 1440 × 900-körningen hände det inte.
- **Skyltarna:** gatans etiketter ("En gäst · Medelinkomst · mot Din krog") försvinner de sista 15 metrarna, så att de inte ligger på vår skylt vid dörren (ORDER 300 §7).

## 6. Bildfrekvensen

Byns nivå (660 m) i alla stopp:

| Storlek | Bilder per sekund | Lägst på någon nivå |
|---|---|---|
| 1440 × 900 | 54,5–55,9 | 54,5 |
| 1280 × 720 | 55,0–60,0 | 55,0 |

Kravet är minst 30.

## 7. Tester och bygge

- **Nytt test:** `sim/__tests__/order302Gatan.test.ts`, med 2 tester: trottoarens avstånd längs en rutt, och sällskapens storlek med de nya reglerna.
- **Hela sviten:** 2 346 gröna och 16 överhoppade. Typecheck och bygge är gröna.
