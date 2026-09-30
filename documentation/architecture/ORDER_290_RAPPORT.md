# ORDER 290 — Kvällens ekonomi och scenen (rapport)

**Ordern** (Vision Owner 2026-09-30, provspel av `cae53c9`): kvällens ekonomi (kvällskassan från noll, kvällens insats när dörrarna öppnas, linjen för break-even, täckningsbidrag, täckningsgrad och resultatet som en överföring till företagskontot, prognosen i veckor, svarens följd i rummet), scenen (serviceläget med panelerna hopfällda, ring och linje under personalen, rekvisitan från spelarens höjd, raketens kamera i produktionsbygget, byn med knapp och tangent och en ljusare kväll, byns text borta under servicen, början i den varma formen), rätt och fel (grönt och rött), kunskapspyramiden och ljudet. Besluten står i speldesignen.

**Designs leveranser 2026-09-30** (granskade och godkända av Vision Owner, i `documentation/leveranser/nexus-leverans-2026-09-30-*`): *serviceläget* (punkt 1–6), *ringen* (punkt 7 och 8, rekvisitan i 1,5), *rätt, fel och pyramiden* (punkt 13–15, ljuden efter `LJUDEN.md`; rött betyder bara fel svar; klockans sista halvtimme och varmrätter som inte räcker pulserar i ljuslåga) och *början i Grythyttan* (bara läst; manuset skrivs om och byggs i en egen order).

## 1. Vad som byggdes

**Kvällens ekonomi** (`frontend/src/strategic/simulation/eveningEconomy.ts`, talen i `balance.ts` `EVENING_ECONOMY`, öppen fråga F58).
- **Insatsen** sätts när dörrarna öppnar (`day.stake`): råvarorna (dagens inköp i kassaboken), personalen (kvällens löner, köksdriften under servicen och räntan), DJ, kompetens och övriga satsningar.
- **Kvällskassan** börjar på noll och fylls av notorna (`tillSek`). Designs stapel står bredvid klockan: linjen på 1 / 1,3, ljuslåga under linjen, guld med glöd över. Klockslaget när den passerar sparas (`day.tillPassedAt`), och ljudet för kassan spelas en gång. Ett tryck fäller ut insatsen på papper; när dörrarna öppnar fälls den ut en stund av sig själv (`TillBar.tsx`).
- **DJ** är en ny satsning (`book-dj`, 1 500 kr). Den drar 15 % fler gäster i kväll genom marknadens tak, så den lönar sig en full kväll men inte en lugn.
- **Efter servicen** kommer en ny skärm, `screen-T2` (`TransferScreen.tsx`, Designs skärm 5 och 6), mellan sopbilen och kvällens resultat. Pappret visar försäljningen och antalet notor, råvarorna, täckningsbidraget, täckningsgraden, resten av insatsen och kvällens resultat. Panelen visar överföringen: knappen flyttar kvällskassan till företagskontot, och kontot räknas till läget efter kvällen, med skillnaden mot i morse.
  - Resultatet går ihop med kassan. Kontot efter är kassan vid dagsavslut (`dayEndCash`), och resultatet är kontot efter mot kontot i morse, utan sopbilens avgift, som dras på sopbilens skärm.
  - Raketernas kassa står som egen rad, *Kvällens händelser*.
- **Prognosen** (`forecastWeeks`) räknas på de senaste sex kvällarnas resultat, hyran och amorteringen. Den säger "Med det här konceptet klarar du dig {n} veckor", eller resten av säsongen när kvällarna bär sig.

**Svarens följd i rummet** (`sim/incidents.ts` `answerConsequence`, `ANSWER_EFFECTS`):
- Rätt svar ger fler gäster (som förut) och en högre nota vid bordet: +6 % (`guest.billBonus`).
- Fel svar ger en lägre nota (−6 %), missnöjda gäster vid bordet och en gäst i kön som går.
- Händelsen står över bordet i rummet (`day.roomReactions`).

**Serviceläget** (Designs §2–3). Under servicen syns klockan och kvällskassan. Dagsmärket, kassan och krediterna döljs.
- Panelerna ligger som tre runda flikar nere till vänster: Lagret (lagret och mise en place), Kvällen (strömmen) och Rummet (gästernas och personalens mätare; kassans mätare utgår). En prick i ljuslåga visar att något är nytt.
- Panelerna öppnas med fliken eller tangenterna 1–3 och stängs med krysset, Esc, samma flik eller ett klick i rummet. Bara en är öppen åt gången, och en raket fäller ihop allt (`ServiceTabs.tsx`).
- Strömmen visas utan belopp; en knapp i panelen visar dem.
- Back your knowledge står kvar nere till höger.

**Ringen** (Designs `scene/staffRing.ts`, `staffMarks.ts`):
- En ring i rollens färg under varje anställd, med en mjuk pöl och en svag kopia genom disk och bar.
- När en uppgift pågår dämpas ringen, och en båge fylls medurs i takt med uppgiften.
- En streckad linje går till platsen uppgiften gäller.
- Rekvisitan (tallrikar, glas, flaskor, bestick) visas i 1,5 gånger verklig storlek. Brickan, tårtan, menyn, blocket och notan står kvar i 1,0.

**Raketens kamera.** Rummets egen glidning körs bara när vinbaren ritas, alltså närmare än cirka 75 m. Från byn gled kameran aldrig in, och det förklarar provspelet.
- Nu flyger kameran till krogen när servicen börjar och när en raket börjar och rummet inte syns (`ServiceCamera.tsx`). Rummets glidning tar sedan över mot figuren (12 m), och efter raketen går kameran tillbaka.
- Kamerans avstånd står i sidan (`body[data-cam-distance]`, `CameraController.tsx`). Det är samma kamera som ritar bilden. Tidningens fotorendering skrev förut samma värde från sin egen kamera.

**Byn.**
- Knappen *Byn* och tangenten V flyger ut till byn och tillbaka (`VillageButton.tsx`). Tangenten gäller utan `#playtest=1`, till skillnad från kamerans 1–4.
- Kvällens ljus är lyft (`DayLighting.tsx`, service ×1,35 och kväll ×1,9), och graderingen efter stängning och vinjetten är lättare.
- Byns text (zoomnivåerna, kartkrediten, platsnamnet) döljs under servicen.

**Rätt och fel** (Designs tokens `nexusTheme.warm.rattfel.ts`):
- Rätt: grönt med mörk text, bock i nyckeln, och raden lyfter och sjunker tillbaka.
- Fel: rött med mörk text, kryss, och raden skakar tre gånger.
- Det rätta svaret får streckad grön kant och *Det här hade hållit*.
- Domen är *Rätt* eller *Inte den här gången*, på papper 650 ms efter svaret.
- Frågorna i Måltidens hus följer samma färger.
- Rött finns bara för fel svar: det som var glöd är ljuslåga. Klockans sista halvtimme och varmrätter som inte räcker pulserar.

**Kunskapspyramiden** (`KnowledgePyramid.tsx`) ersätter lyktorna i raketkortet. Episteme ligger i botten och phronesis i toppen, med namnen till höger och stegets multiplikator i Back your knowledge.
- En våning fylls grön nedifrån, spricker röd, eller släcks ovanför en sprucken.
- En hel pyramid blir guld, med strålar.
- Kvällens resultat visar kvällens pyramider, en per raket.

**Ljudet** (`sound/sound.ts`, `SoundDirector.tsx`) följer Designs recept i Web Audio, utan ljudfiler: rätt, fel, våning, full pyramid, gäst in, notan, insatsen passerad, skål och sorlet.
- Sorlet följer antalet gäster och dämpas 6 dB när raketkortet är öppet.
- Menyn har *Ljud* på och av och en volym. Förvalet är lågt (25 %), och valet sparas i sidan.

**Början i den varma formen** (`warm-start.css`): startrutan, namnet, bussen, registreringsbordets dialog, pausmenyn och slutskärmen har Designs trä, papper och typsnitt. Designs nya början (*Början i Grythyttan*) byggs i en egen order.

## 2. Balansen

| Mått | 287a | 290 | Fil |
| --- | --- | --- | --- |
| Slumpmålet, `winShare` (1 000 veckor) | 0,737 | 0,736 | `frontend/reports/order290/randomness.json` |
| Rimlig spelare, veckointäkt (20 frön) | 44 001 kr | 44 628 kr | `week-players.json` `mean.rimlig.revenueSek` |
| Rimlig spelare, veckans resultat | 2 172 kr | 2 789 kr | samma, `resultSek` |
| Svag spelare, veckans resultat | −33 822 kr | −33 612 kr | samma; minus alla 20 veckor |
| Hyran: rimlig spelares andel (10 frön) | 7,6 % | 8,9 % | `rent-check.json` |

Rätt svar höjer notan vid bordet, och den rimliga spelaren svarar rätt, så intäkten per kväll steg med ungefär 105 kr. Harnessen väljer ingen DJ.

## 3. Spelarens flöde

**Scenen i produktionsbygget** (`frontend/reports/order290/scene.json` och `scene-*.png` @ `order-290`, skript `frontend/scripts/order290-scene.mjs`, sparfilen måndag i vinbaren):
- Startrutan i den varma formen.
- Insatsen när dörrarna öppnar: råvaror, personal, DJ och linjen (`stake`).
- Serviceläget: flikarna, inga paneler öppna, dagsmärket och byns text dolda (`serviceMode`). Lagret, Kvällen (utan belopp) och Rummet öppnas med klick och tangenterna 2 och 3, och Esc stänger (`tabStock`, `tabStream`, `tabRoom`, `tabsClosed`).
- Servicen öppnar med kameran vid krogen (24 m). Knappen *Byn* flyger ut (`village`).
- Raketen glider från 29 m till 12 m på spelarens kamera (`rockets[1].cam`).
- Rätt och fel med pyramiden (`scene-50`, `scene-51`).
- Överföringen (`transfer`): resultatet −3 197 kr en måndag med DJ, kontot −3 675 kr mot i morse (sopbilen 476 kr), prognosen "3 weeks". Kvällens pyramider i R1.

**Veckan från bussen i produktionsbygget** (`frontend/reports/order290/dod.json` och `dod-*.png` @ `order-290`, skript `frontend/scripts/order271-dod-from-start.mjs`):
- Från bussen till söndagen och X1 utan fel i sidan (`errors` tom), med 29 bildrutor per sekund under servicen (`fpsService`).
- Skärmen efter servicen varje kväll: `S1 → T2 → R1 → L1 → K1`. Fredagen föll ihop och gick direkt till T2 (`eveningSequences`).
- Måndagens överföring (`t2`): resultatet +1 512 kr och täckningsgraden 78,9 %, prognosen resten av säsongen (`dod-48-T2-efter-servicen.png`, `dod-49-T2-overfort.png`).
- Ringarna i rollernas färger på lördagen (`dod-22-lordag-figurerna-*.png`).

Veckoskriptet känner igen T2: överföringens knapp trycks, sedan går skriptet vidare.

## 4. Tester

`frontend/src/sim/__tests__/order290EveningEconomy.test.ts` prövar:
- insatsen när dörrarna öppnar;
- att kvällskassan börjar på noll och står kvar efter stängningen;
- DJ:n i insatsen och i marknadens tak;
- att kompetens står som kompetens;
- att överföringen går ihop (täckningsbidrag, täckningsgrad, resultat, kontot före och efter, resten av insatsen) och att kontot efter är kassan vid dagsavslut;
- att nästa morgons kassa är kontot efter;
- prognosen;
- svarens följd i rummet.

Ändrade tester, med skäl i koden:
- `order267Pressure`: räknar gäster som går ur kön, eftersom fel svar skickar en gäst ur kön.
- `PrepPanel`, `serviceScreens`: panelerna öppnas med flikarna; mätarna är två.
- `order271Screens`: fel är inte längre streckat.
- `order273NoSwedishPlayerText`: Designs strängtabeller.

Hela sviten är grön (139 testfiler; 2 222 tester, 4 överhoppade).

## 5. Avvikelser och öppet

- **Designs fyra rader i insatsen** är råvaror, personal, DJ och kompetens. Ordern nämner också satsningar; de står som egen rad när spelaren valt någon. Räntan och köksdriften räknas till personalen.
- **Satsningar och DJ betalas på morgonen när de väljs**, som förut, inte vid överföringen som i Designs text. Därför kan kontot *före* på skärmen efter servicen vara högre än det spelaren såg på morgonen, med satsningarnas pris.
- **Linjen till uppgiften** finns inte i Designs ring (den har en båge i stället). Den är kvar eftersom ordern säger "ring och linje".
- **Etiketten vid hovring** (*roll · uppgift*) är inte byggd. Strängarna finns (`ring.*`).
- **Lärdomen (L1)** visar fortfarande lyktorna; Design har inte ritat om den.
- **Gäster på väg mot krogen** ritas inte i byn. Simuleringens gäster dyker upp vid dörren, och folket på gatorna är stämning. Kvällen är ljusare, men det Vision Owner beskrev finns inte i spelet.
- **Tangenterna 1–3** öppnar panelerna under servicen och går före kamerans förval (som bara gäller med `#playtest=1`).
- **Frågor ur Designs leverans ringen** till Vision Owner: ska ringen synas hela tiden eller bara vid hovring och tangent? Hovmästaren får grädde; vill du ha en annan färg?

Gren `order-290` från `main`.
