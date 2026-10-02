# ORDER 296c — Talen låsta, stjärnan, raketerna ur rummet och två nya spelare (rapport)

**Vision Owners beslut 2026-10-02:**
1. Ta bort den dolda regeln att låg kassa vänder bort gäster i dörren. Kalibrera startkapitalet så att den som har hälften rätt stänger i 30–50 % av säsongerna, och lås talen.
2. Stjärnan:
   - kräver guld i Gastronomiska Teatern, högt rykte och gott serviceomdöme två veckor i rad;
   - delas ut i söndagstidningen och kan förloras om nivån sjunker under en vecka;
   - ger facket en tredje plats.
3. Raketerna:
   - utlöses av det som händer i rummet;
   - kommer oftare när det är fullt;
   - har inget tak på tre per kväll; det som begränsas till tre är satsningarna.
4. Harnessen: en spelare som väljer klokt på nålarna och i butiken, och en som låter Per välja allt. Skillnaden ska märkas men inte vara avgörande.

Punkt 5, Flytta personal med figuren och den streckade ringen, väntar till efter provspelet.

Gren `order-296c` från `main` (`02c1998`). Talen pekar på filer under `frontend/reports/order296c/`.

## 1. Kassan styr inte gästerna, och startkapitalet är 15 000 kr

**Regeln är avstängd.** Kassan styr inte längre vilka som vänder vid dörren (`walkAwayProbability`) eller hur många som kommer (`economicArrivalMultiplier`).
- Flaggan är `balance.ts` `RISK.cashTurnsAwayGuests` (false).
- Testerna av den gamla regeln kör med flaggan påslagen (`legacyEconomy.ts`).
- `order296cKassan.test.ts` visar att ingen vänder och att lika många kommer, med tom kassa som med full.

**Kalibreringen.** Utan regeln flyttar startkassan bara kurvan. 20 säsonger med spelets regler:

| Startkassan | Mentorns spelare | Rimlig | Hälften rätt | Alltid fel | Rimligs lägsta kassa | Källa |
|---|---|---|---|---|---|---|
| 25 000 kr | 0 | 0 | 2 (10 %) | 20 | 20 279 kr | `karnan-25000.json` |
| 15 000 kr | 0 | 0 | **7 (35 %)** | 20 | 10 279 kr | `kal-15000.json` |
| 10 000 kr | 0 | 0 | 10 (50 %) | 20 | 5 279 kr | `kal-10000.json` |
| 5 000 kr | 0 | 0 | 14 (70 %) | 20 | 279 kr | `kal-5000.json` |

**Startkapitalet är 15 000 kr, och talen är låsta** (`RISK.startCashSek`). Den som har hälften rätt stänger i 35 % av säsongerna, mitt i bandet med marginal åt den rimliga spelaren. Övriga tal står kvar:
- bara ränta under säsongen;
- veckomålet 0,95 × normal veckointäkt (40 000 kr);
- dubbel ränta vid omförhandling;
- stängning efter tre avräkningar under noll;
- mise en place enligt ORDER 296b.

## 2. Stjärnan

**Gränserna** (`balance.ts` `STAR`, föreslagna):

| Villkoret | Gränsen |
|---|---|
| Medaljen | guld i Gastronomiska Teatern |
| Högt rykte | minst 60 av 100 vid veckoavräkningen. Mentorns spelare ligger omkring 45 (`karnan-slut.json` `repByWeek`), så stjärnan kräver en bättre vecka än mentorns. |
| Gott serviceomdöme | minst 70 % av veckans raketer klarade, av minst 5 |
| För att få den | två veckor i rad |
| För att förlora den | en vecka under någon gräns |

**I spelet:**
- Stjärnan räknas vid veckoavräkningen (`sim/economy.ts` `settleWeek`, `state.star`).
- Söndagstidningen har ett avsnitt *Stjärnan* (`sim/newspaper.ts`). Det säger att krogen fick den, behåller den, förlorade den (med ryktet och andelen klarade raketer), eller att en vecka till ger den.
- Facket har en tredje plats medan stjärnan hålls (`sim/shop.ts` `starReached`). Guld i Teatern ensamt ger ingen plats längre.

Test: `order296cStar.test.ts`.

Ingen av harnessens spelare har guld i Teatern, så ingen fick stjärnan i harnessen.

## 3. Raketerna ur rummet

**Ingen plan med ett antal per kväll** (`sim/incidents.ts` `maybeOpenIncident`, `balance.ts` `INCIDENTS`):
- I kvällens fönster mognar en raket med chansen (0,001 + 0,012 × trycket²) per simsekund, när bankens villkor stämmer: kön, de som sitter, kvällens tid och händelserna.
- **Trycket** är de som sitter plus kön, delat med platserna, högst 1,5 (`roomPressure`).
- Efter varje raket kommer en paus på 25 simsekunder.
- En kedjad raket går först.
- Bågens fas följer kvällens andel.

**Raketerna per kväll** (`rockets.json`, 6 frön per veckodag, harnessen svarar direkt):

| Trycket i snitt | Raketer per kväll |
|---|---|
| 0,4 | 0–2 |
| 0,6 | 2–6, oftast 3–4 |
| över 0,8 | 4–5 |

Snittet är 3,7. Veckodagarna ligger nära varandra, eftersom harnessens rum är ungefär lika fullt varje dag. En spelare som tänker länge får färre raketer, eftersom en raket står öppen medan den besvaras.

**Satsningarna.** Taket gäller satsningarna: Stå för ditt svar, högst tre per kväll (`BACK.maxPerEvening`).
- Knappen visar *3 satsningar kvar i kväll*.
- En egen raket heter *Satsning n av 3*.
- Kvällens raketer heter *Raket n i kväll*, eftersom antalet inte bestäms i förväg.

**I produktionsbygget** (`check.json`):
- Knappen visade *3 satsningar kvar i kväll*.
- Räkningen visade *Raket 2 i kväll* vid 22.10.
- Skriptet svarade sent (det letade efter ringen med musen), så kvällen fick färre raketer än i harnessen.

## 4. De två nya spelarna

`order296Karnan.test.ts` `PLANS`:
- **Klok:** mentorns morgon.
  - Den svarar klokt på varje nål (`weekHarness.ts` `wisePinAnswer`): ger bord om det finns plats, låter sommeliern föreslå flaskan, flyttar servitören till baren och bjuder den som väntat länge.
  - Varje morgon köper den i butiken det den har råd med i en fast ordning: menyns berättelse, flaskan, snabbare pass, stamgästboken och så vidare. De bästa läggs i facket.
- **Per:** mentorns morgon. Per väljer alla nålar, och den köper inget. Det är samma spelare som mentorns.

**Harnessen med de låsta talen** (`karnan-slut.json`, 20 säsonger):

| Spelaren | Stänger | Kassan vecka 8 i snitt | Veckans resultat v3–8 i snitt | Intäkt per vecka v3–8 |
|---|---|---|---|---|
| Mentorns spelare = Per | 0 av 20 | 41 602 kr | +1 549 kr | 51 686 kr |
| Klok | 0 av 20 | 58 145 kr | +4 121 kr | 54 232 kr |
| Rimlig | 0 av 20 | 23 555 kr | — | — |
| Hälften rätt | 7 av 20 | −5 233 kr | — | — |
| Alltid fel | 20 av 20 | −32 338 kr | — | — |
| Slarvig | 20 av 20 | −79 351 kr | — | — |

Den kloka har köpt 3 förmågor i snitt (`meanOwned`).

**Skillnaden märks men avgör inte.** Klok slutar säsongen med 16 543 kr mer, omkring 2 600 kr i veckan efter introduktionshyran, och omkring 5 % mer i intäkt. Varken den kloka eller Per stänger.

## 5. Tester och bygge

- **Nya tester:**
  - `order296cKassan.test.ts`
  - `order296cStar.test.ts`
  - `order296cRockets.test.ts` (mätningen)
- **Ändrade tester:**
  - raketräkningen (ORDER 289, 271): *Raket n i kväll*;
  - vinbarens service har ingen plan (ORDER 270);
  - butikens plats vid stjärnan (ORDER 296);
  - åtta frön i ORDER 287a:s ordning per gäst (med fyra låg studenten och medelinkomsttagaren en krona isär);
  - de gamla ankomstreglerna kör med `legacyEconomy` (`arrivals.test.ts`).
- Hela sviten och bygget är gröna.

## 6. Öppet

- **Flytta personal:** figuren går dit, med den streckade ringen (Vision Owners punkt 5). Väntar till efter provspelet.
- **Stjärnans gränser** (60 i rykte, 70 % klarade, minst 5 raketer) är föreslagna.
