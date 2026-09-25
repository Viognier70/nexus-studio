# ORDER 266 — Nexus v1 etapp 4: Servicen (rapport)

**Order** `documentation/orders/ORDER_NEXUS_V1_HELA_SPELET.md`, etapp 4
**Speldesign** `NEXUS_SPELDESIGN_V1.md` > Servicen
**Gren** `order-266` från `main` `1564a25`
**Datum** 2026-09-25
**Status** **Stoppad — DoD inte uppnådd.** Grenen är inte mergad. Se §2 och §4.

---

## 1. Vad som byggdes

**Action-knappen** (`frontend/src/sim/actionButton.ts`, F25)
- **Kön** härleds ur gästerna i rummet. Den har två sorters uppgifter: lugna en gäst i kön, och ta en beställning. Gäster i kön under nöjdhet 0,6 visas som "på väg att gå" och står först.
- **Insatsen** tar 14 spelsekunder / (1 + 0,05 × techne-krediter), minst 5. Rummet och panelerna skyms i 20 spelsekunder (`BlindOverlay`), och spelaren har högst tre insatser per kväll.
- **Under insatsen** ger gästen som spelaren står hos inte upp.
- **En lyckad insats** ger en techne-kredit, en rad i strömmen ("Du lugnade gästen i kön. Gästen stannade kvar i stället för att gå.") och räknas som en vänd kväll, vilket mognadsstegen i etapp 12 läser.
- **PLACEHOLDER_DESIGN:** spelarens figur i rummet (designspecifikationen 4.3) finns inte i Designs leveranser. Insatsen visas som ett skymt rum med en mening om var spelaren är.

**Kön** (F29)
- Regeln för att ge upp var 90 s och nöjdhet under 0,2. Den var gjord för pass på 15–30 minuter, och i v1 gav ingen upp.
- Nu gäller 60 s och nöjdhet under 0,35. Det ger omkring tre gäster på väg att gå en tung kväll, lika många som spelarens insatser. Talen är mätta; se `balance.ts` `QUEUE`.

**Ryktet** (F26)
- Golvet 10 av 100 gäller vid varje skrivställe (`clampReputation`) och i reducern efter varje åtgärd.
- Självläkning: +2 av 100 per dag under 50.
- Återhämtning genom händelser: en kväll där ingen gav upp ger +3, en lyckad insats +1. Båda lyfter bara mot 50, inte över.
- Varje återhämtning får en rad i strömmen.

**Händelser med orsak** (`frontend/src/sim/serviceEvents.ts`, F28)
- **Inspektion** kommer om stationerna varit ostädade under kvällen, alltså om den lägsta nivån efter att dörrarna öppnat understigit 0,4. Den ger −5 rykte och en avgift på 2 000 SEK nästa morgon.
- **Recensent** kommer när ryktet är minst 70 när servicen öppnar. Omdömet följer kvällen.
- **Samtal från banken** kommer morgonen efter ett dagsavslut under noll.
- Morgonens händelser visas på morgonraden ("I morse: …"), eftersom strömmen bara syns under servicen.

**Lagret** (`frontend/src/sim/stockForecast.ts`): "Råvaror till ungefär elva kuvert." står på morgonraden.
- Kuverten räknas genom att fördela lagret mellan menyns rätter i tur och ordning, eftersom rätterna delar råvaror.
- Öppning blockeras aldrig.

**Medgång**
- Kvällsberättelsen börjar med det som gick bra: nöjda gäster, att ingen gav upp och en lyckad insats. Tal skrivs med ord upp till tjugo.
- `proud` är borttaget. Det utlöstes bara av rätt svar mitt i servicen, och sådana frågor finns inte i v1. De övriga nio ansiktena har var sin utlösare.

**Avklingningen** av `enablers` (5 % per natt) är borttagen (F27).

**ORDER 261** ("en gäst, en position") behövs inte. Action-knappen pekar ut gästen via id i simuleringen, inte via position i rummet. Grenen `order-261` får ligga.

**Fel som hittades och rättades under etappen**
- Efter en kollaps gav en kväll där ingen gav upp både ryktesbonus och raden "Ingen gick ifrån". En kollaps räknas nu aldrig som en ren kväll.
- Kvällsredovisningens ryktesförändring räknades innan kvällens händelser. Nu räknas de med.
- Inspektionen läste stationernas nivå medan förberedelserna pågick (0,05) och slog till varje morgon. Nu räknas bara tiden från att dörrarna öppnat.
- Action-panelen växte utanför skärmen och markerade beställningar som "på väg att gå". Nu visar den högst sex uppgifter, och bara kön kan vara i riskzonen.

## 2. Hur det verifierades i spelarens vy

**DoD 1 — "i spelarens vy kan en spelare rycka in och se en gäst stanna som annars hade gått, och se det nämnas i strömmen": INTE UPPNÅDD.**

**Vad som är visat**
- **I simuleringen:** `frontend/src/sim/__tests__/service.test.ts`, testet "kontrafaktiskt". En gäst i kön med fullt rum ger upp utan insats och stannar med den. Det lyckade fallet ger en techne-kredit och raden i strömmen. Testet är mutationsprövat: utan spärren för gästen som spelaren står hos faller det.
- **I spelarens vy** (`frontend/scripts/order266-service-playthrough.mjs`, produktionsbygget, start på `/`, tre körningar):
  - Knappen "Rycka in" och panelen finns och fungerar. En felsökning på dev-servern med ett laddat fredagsläge visade uppgifter märkta "på väg att gå".
  - Men i en riktig spelsession uppstod ingen kö under veckan. Ingen gäst var någonsin på väg att gå, så insatsen kunde inte göras.
  - Utdata: `frontend/reports/order266/service-playthrough.json`, där fältet `intervention` saknas.

**Varför: harnessen mätte ett annat rum än spelaren ser**
- Simuleringen läser platsernas positioner ur rummet som 3D-scenen monterar (`businessRoomRef`, `service.ts` `seatSlot`). Harnessen hade ingen scen och föll tillbaka på `INTERIOR.seatOrder`, tolv platser där plats 12–15 hamnar på samma punkt. Där uppstod köer som aldrig uppstår i spelet.
- Mätt, standardfrö, fredag vecka 1 med brons i tre:

| | Gäster | Längsta kö | Rykte |
| --- | --- | --- | --- |
| Harnessen utan rummet | 53 | 8 | 0,96 → 0,76 |
| Med rummet | 53 | 0 | 1,00 → 1,00 |

- **Rättat i den här etappen:** harnessen monterar nu samma rum som scenen (`frontend/src/strategic/testHarness/roomParity.ts`), med samma funktioner (`computePlayerBusinessInterior`, `createRoom`, `resolveWorldPositions`).
- Med rummet på plats bildas ingen kö i någon uppmätt kväll (fredag och lördag vecka 2, högtidslördag vecka 3, kräftskivan vecka 8), med brons i tre, brons i fem eller guld i fem. Ankomsterna planar ut på 50–54 per kväll: taket på samtidiga gäster (`ACTIVE_GUEST_CAP = 24`, `arrivals.ts:107`) tar bort efterfrågan i tysthet.
- Med taket höjt till 40 kommer upp till 68 gäster, och kön är fortfarande tom. Rummets 16 platser vänder så fort att ingen behöver vänta.

**Övriga delar i spelarens vy** (`service-playthrough.json` `days[].evening` och `morning`, `0-morgon-prognos.png`)
- Kvällsberättelsen börjar med det som gick bra, till exempel "Fler än tjugo gick härifrån nöjda. Ingen gav upp i kön. …".
- Morgonraden visar lagerprognosen. Utan meny står det "Ingen meny satt i dag.".

**DoD 2 — "Veckoharnessen visar att ryktet aldrig går under 10": UPPNÅDD.** Se §3 och `order266WeekHarness.test.ts`.

**Svit:** typecheck och build är gröna. Vitest: 2010 godkända, 4 förväntade fel (ett nytt, se §4) och 2 överhoppade (mätningar).

## 3. Veckoharnessens tal

**Utdata:** `frontend/reports/order266/week-harness.json`, skriven av `order266WeekHarness.test.ts` med `WRITE_REPORTS=1`. Scenarierna är desamma som i etapp 3 och ligger i `testHarness/scenarios.ts`.

- **DoD, ryktet aldrig under 10:** fältet `lowestReputation` (lägsta ryktet i alla scenarier, alla dagar) jämförs med `reputationFloor`, och testet hävdar `lowestReputation ≥ reputationFloor` ur samma körning.
- **Nedgradering och väg tillbaka** (`scenarios["nedgradering-och-tillbaka"].settlements`): vinbar, food truck vid avräkningen vecka 2, och vinbar igen samma söndag efter tre prov.
  - Scenariot ändrades i den här etappen. Förut kom vägen tillbaka först vecka 3, med 2 000 SEK i startkassa.
  - Efter att avklingningen togs bort räckte marginalen, och spelaren gick aldrig under. Med ingen startkassa blev food truckens egen simulering (etapp 6) för svag för att bära vägen tillbaka.
  - Nu gör spelaren proven på söndagen, "veckans stora övningsdag".

## 4. Avvikelser från speldesignen och varför

**Beslut som behövs från Vision Owner (skäl till stoppet)**
- **Servicens tryck.** Speldesignen förutsätter tunga kvällar där gäster väntar och kan gå: "lugna en gäst som väntat länge", "en gäst som stannar i stället för att gå". I spelarens rum uppstår det aldrig, eftersom taket på samtidiga gäster (24) och en snabb vändning i rummet (servicens tempo från ORDER 251–260) gör att alla får plats. Att ändra det rör Vision Owners egna kalibreringar från ORDER 253–260. Tre vägar:
  1. **Höj eller ta bort taket på samtidiga gäster** och låt köns tak (`WAITING_QUEUE_CAP`) och tålamodet styra. Veckodagar, högtider och marknadens tak börjar då märkas. Mätningen visar att enbart det inte räcker, eftersom vändningen också är för snabb.
  2. **Längre sittningar i v1:s tiominuterskväll**, alltså ett långsammare tempo per gäst, så att rummet fylls de tunga kvällarna.
  3. **Låt action-knappens huvudsyfte vara beställningarna** (som redan köar) och inte gäster som går. Det avviker från speldesignens exempel.
- **Etapp 3:s DoD-bevis vilade på harnessen utan rummet.** Med rummet håller nedgraderingen, men vägen tillbaka i scenariot gör det inte: söndagens kassa (4 144 SEK) räcker inte till en veckas golv i vinbaren (5 051 SEK), och food trucken går under igen. Testet är märkt som känd avvikelse (`order265WeekHarness.test.ts`, `it.fails`), och talen står i `reports/order266/week-harness.json`. Food trucken byggs om i etapp 6.
- **Talen som härleddes ur harnessen** är mätta om med rummet: `reports/order266/normal-weekly-revenue.json`.
  - Kvarterskrogen 42 090 → 41 519 SEK och ölkrogen 47 044 → 41 850 SEK. `balance.ts` är inte uppdaterad; det görs när beslutet ovan är fattat, eftersom det ändrar talen igen.
  - Poolen (F21) vilar på gästantalet, som är nästan oförändrat (median 258 mot 259,5 gäster per vecka).
  - Tålamodet (F29) är mätt i harnessen utan rummet och är obestyrkt i spelarens rum, där ingen kö uppstår.

**Andra avvikelser**

- **Tester ändrade efter v1:s regler**
  - Ryktets golv: `reputation.test` och `collapse.test` förväntade 0.
  - Ansiktslistan: nio uttryck i stället för tio.
  - M2 DoD 3: kvällsberättelsen börjar nu med det som gick bra, inte med "Today you picked:".
  - `day.test`, köns tryck: nu toppen i kön plus de som gav upp. Kontrollen mellan grannsteg är borttagen och ändpunktskontrollen kvar. Mätvärdena står i testet.
- **Ryktet sjunker en vanlig helg** när ingen rycker in, i scenariot `vanlig-vecka` från cirka 1,0 till 0,49. Det är trycket speldesignen vill ha, men bör provspelas.
- **Den svenska och den engelska texten blandas fortfarande.** Strömmens äldre rader är på engelska (F9).
- **Värderingen och kassapillret** står kvar (se ORDER 265 §4).

## 5. Öppna frågor

Nya i `NEXUS_V1_OPPNA_FRAGOR.md`:
- **F25:** action-knappen.
- **F26:** ryktets återhämtning.
- **F27:** avklingningen.
- **F28:** händelserna.
- **F29:** köns tålamod.
