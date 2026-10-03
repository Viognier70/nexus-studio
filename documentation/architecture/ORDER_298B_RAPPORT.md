# ORDER 298b — Golvet, Lugn kväll, provsmakningen och stjärnans gränser (rapport)

**Vision Owners beslut 2026-10-03, efter ORDER 298:**
1. **Den tunna kvällen.** Lågt rykte ska fortfarande ge färre gäster, men golvet blir 10 sällskap per kväll.
2. **Lugn kväll.** När ryktet håller nere gästerna står raden "Lugn kväll: ryktet är ännu lågt i byn" i HUD:en före och under kvällen, och redan på morgonen bredvid satsningen.
3. **Provsmakning på torget.**
   - Satsningen kostar pengar, med beloppet i `balance.ts`.
   - Den ger fler sällskap samma kväll.
   - Effekten växer med medaljerna i Stensöta och Kalastorget.
   - Harnessen körs för alla spelartyper. Den som svarar slarvigt ska fortfarande stänga.
4. **Stjärnan.** Tre veckor i rad ligger fast. Gränserna kalibreras mot målen:
   - med 0,85 rätt per steg nås stjärnan i minst 70 % av säsongerna, i snitt vecka 5–6;
   - med 0,75 i 20–40 %;
   - med 0,6 eller sämre aldrig.
   - Inget annat i trappan ändras.

Gren `order-298b` från `main` (`47a9101`). Talen pekar på filer under `frontend/reports/order298b/`.

## 1. Golvet: tio sällskap per kväll

**Regeln** (`balance.ts` `GUEST_FLOOR`, `arrivals.ts` `pacedArrivals`):
- Marknaden ger sina gäster som förut.
- När de inte räcker för att nå tio sällskap kommer fler, i den takt som behövs för att tio har kommit senast 21.30 (90 spelminuter före stängning, så att de hinner sitta).
- Golvet fyller bara upp skillnaden mot marknadens takt. En vanlig kväll är därför oförändrad.
- Dragningen görs med `hashKey` och inte med servicens slumptal, så marknadens gäster kommer som förut.
- Kvällens sällskap räknas i `day.partiesTonight`, med kön, dörren och vågorna.

**Testerna** (`order298bGolvet.test.ts`):
- Ryktet 0,05 och 0,2, frö 1, 2 och 10, måndag och fredag: minst tio sällskap kommer, och minst tio sitter vid bord.
- Lågt rykte ger fortfarande färre gäster vid bord än gott rykte (0,2 mot 0,6).

**Mer i rummet.** Raketerna tar in sällskap när rummet fylls (gäster med `grp-`-id ur `makeGuest`, utanför ankomsterna). En kväll som golvet lyfter får därför ofta fler än tio sällskap vid bord.

**Trappan med golvet** (20 säsonger, `trappa-utan-golv.json` mot `trappa-golv.json`):

| Spelaren | Stänger utan golv | Stänger med golv | Kassan vecka 8 utan | Kassan vecka 8 med |
|---|---|---|---|---|
| Mentorn = Per | 0 | 0 | 45 224 kr | 45 941 kr |
| Klok | 0 | 0 | 58 020 kr | 57 694 kr |
| Stjärnspelaren (0,75) | 0 | 0 | 50 453 kr | 52 958 kr |
| Rimlig | 0 | 0 | 22 125 kr | 24 088 kr |
| Hälften rätt | 5 | 4 | 2 461 kr | 1 604 kr |
| Alltid fel | 20 | 20 | −31 668 kr | −26 313 kr |
| Slarvig | 20 | 20 | −78 936 kr | −79 195 kr |

Golvet lyfter de svaga spelarnas kvällar men räddar inte den som svarar fel; den slarviga och den som alltid svarar fel stänger fortfarande alla säsonger.

## 2. Lugn kväll

**Villkoret** (`arrivals.ts` `reputationHoldsGuests`, `balance.ts` `GUEST_FLOOR`). Raden står när två saker gäller:
- ryktet drar ner gästerna: ryktets del av dragningskraften (rykteskurvan gånger andelen mot byns krogar) är under 1;
- kvällen blir tunn: dagens tak gånger ryktets del ger färre gäster än 0,75 av rummets platser, alltså 15 i vinbaren.

Söndag (stängt) står den inte.

**Varför inte bara ryktet.** Första versionen visade raden när ryktets del var under 0,75. Det gällde nästan hela säsongen för de flesta spelare (ryktet ligger omkring 0,3).
- Vinbarens rum tar omkring 30 notor en kväll.
- Redan vecka 2 kommer 19–29 sällskap med ryktet 0,3, och rummet fylls ändå.
- Provsmakningen gav då nästan ingenting.

**Varför inte hela dragningskraften.** Andra versionen räknade med hela dragningskraften. Världens faktorer sätts när dörrarna öppnar, så raden stod på morgonen men försvann vid öppning (produktionskontrollen). Taket och ryktet står stilla under dagen. Testet *säger samma sak på morgonen, före och efter öppning* håller det.

**Var den står:**
- **På morgonen** står raden överst i satsningarna, i samma grupp som "Provsmakning på torget", som då står först (`MorningActivityPanel.tsx`). Under satsningen står "{n} sällskap till i kväll. Fler med medaljer i Stensöta och Kalastorget."
- **Före och under kvällen** står den under raden i Byn i kväll (`RivalBand.tsx`).

**Produktionsbygget** (`check.json`, måndag vecka 2, ryktet 0,2, `check-morgon.jpg`, `check-fore-oppning.jpg`, `check-1940.jpg`):
- På morgonen står raden i gruppen med provsmakningen, som är först, med *4 sällskap till i kväll*.
- Från 18.16 till 22.50 står den i bandet.

## 3. Provsmakning på torget

**Satsningen** (`activities.ts`, `balance.ts` `TASTING`, `arrivals.ts` `pacedArrivals`):
- Den kostar **600 kr**.
- Den ger 2 sällskap, plus 1 för varje medaljsteg i Stensöta och Kalastorget (brons 1 … platina 4).
- Sällskapen kommer utöver marknaden och golvet, jämnt fram till 21.30. De räknas inte mot golvet, för då skulle provsmakningen inte ge något just de kvällar raden står.
- Kostnaden står bland kvällens satsningar i insatsen.
- Testerna: provsmakningens sällskap kommer, fler sitter vid bord än utan (fyra frön), och antalet växer med medaljerna i Stensöta och Kalastorget men inte med andra.

**Priset** (`kvallarna.json`: samma kväll med och utan, vecka 1, 2 och 4, måndag, onsdag och fredag, ryktet 0,15, 0,3 och 0,5, tre frön):

| | Kvällar | Kvällskassan med mot utan | Efter priset 600 kr |
|---|---|---|---|
| Lugn kväll, brons i Stensöta | 30 | +816 kr | +216 kr |
| Lugn kväll, silver i Stensöta | 30 | +1 067 kr | +467 kr |
| Ingen Lugn kväll, brons | 51 | +241 kr | −359 kr |
| Ingen Lugn kväll, silver | 51 | +369 kr | −231 kr |

Lagret köps på morgonen i båda fallen, så skillnaden i kvällskassan är vinsten. Med 600 kr lönar sig provsmakningen lite en lugn kväll, mer med medaljerna, och inte en kväll som fylls ändå.

Första priset, 1 500 kr, gjorde den till en fälla:
- När spelarna köpte den varje kväll ryktet var lågt, stängde mentorn i 9 och den rimliga i 20 av 20 säsonger.
- Rummet var redan fullt de kvällarna.

**Trappan med provsmakningen** (`trappa-provsmakning.json` mot `trappa-golv.json`). Varje spelare köper provsmakningen de morgnar Lugn kväll står.

| Spelaren | Provsmakningar per säsong | Stänger | Kassan vecka 8 | Säsonger med provsmakning: skillnad i kassan |
|---|---|---|---|---|
| Mentorn = Per | 0,9 | 0 → 0 | 45 941 → 45 196 kr | −1 655 kr (9 säsonger) |
| Klok | 0,7 | 0 → 0 | 57 694 → 56 565 kr | −3 226 kr (7) |
| Stjärnspelaren | 10,6 | 0 → 0 | 52 958 → 53 579 kr | +621 kr (20) |
| Rimlig | 2,0 | 0 → 0 | 24 088 → 27 121 kr | +3 568 kr (17) |
| Hälften rätt | 8,5 | 4 → 3 | 1 604 → 1 869 kr | +264 kr (20) |
| Alltid fel | 12,9 | 20 → 20 | −26 313 → −29 752 kr | −3 439 kr (20) |
| **Slarvig** | 14,6 | **20 → 20** | −79 195 → −80 905 kr | −1 710 kr (20) |

- **Den slarviga stänger fortfarande alla säsonger.**
- Raden står sällan för de goda spelarna (under en gång per säsong). För dem är skillnaden i kassan brus: en provsmakning ändrar kvällen och allt som följer.
- Säsonger utan provsmakning är identiska med körningen utan (kontrollerat för alla spelare).
- Satsningen märks i trappan men avgör den inte.
- **Ett fel hittat på vägen:** raden stod också på söndagar, när marknaden ger 0. Harnessen köpte då provsmakningen för en stängd kväll. Rättat och testat.

## 4. Stjärnans gränser

**Prövningen.** Stjärnspelaren (mentorns morgon, kloka val, paviljongerna mot guld i Teatern) spelades 40 säsonger med 0,85, 0,75 och 0,6 rätt per steg (`stjarna-data-*.json`). Varje avräknings rykte, klarade raketer, andel rätta steg och antal raketer sparades. Gränserna prövades sedan mot samma veckor med samma regel som `settleWeek` (`scripts/order298b-star-sweep.mjs` → `stjarna-svep.json`).

**Nivåerna vid avräkningen** (`stjarna-svep.json` `level`):

| Rätt per steg | Ryktet | Klarade raketer | Rätta steg | Raketer per vecka |
|---|---|---|---|---|
| 0,85 | 0,335 | 0,65 | 0,86 | 15,7 |
| 0,75 | 0,300 | 0,44 | 0,75 | 13,9 |
| 0,6 | 0,286 | 0,24 | 0,60 | 12,3 |

**Ryktet är det som binder.** Också den skickliga spelaren ligger omkring 0,33, så gränsen 0,36 höll sällan tre veckor i rad. Ingen gräns för ryktet över 0,25 når målen.

**Gränserna som når målen** (`stjarna-svep.json` `meetsGoals`):

| Omdömet räknas på | Ryktet | Gränsen | 0,85 | 0,75 | 0,6 |
|---|---|---|---|---|---|
| klarade raketer | 0,20 | 0,40 | 78 %, v 5,6 | 38 % | 0 % |
| **klarade raketer** | **0,20** | **0,45** | **75 %, v 5,6** | **28 %** | **0 %** |
| rätta steg | 0,20 | 0,74 | 80 %, v 5,6 | 38 % | 0 % |
| rätta steg | 0,20 | 0,76 | 75 %, v 5,7 | 35 % | 0 % |
| rätta steg | 0,20 | 0,78 | 70 %, v 5,5 | 23 % | 0 % |
| rätta steg | 0,25 | 0,70 | 75 %, v 5,9 | 20 % | 0 % |

**Valet: ryktet minst 0,20 och minst 45 % klarade raketer**, av minst 5 raketer i veckan, tre veckor i rad (`balance.ts` `STAR`).
- Spelaren med 0,75 hamnar mitt i bandet 20–40 %, med marginal åt båda hållen.
- Med rätta steg hamnar gränsen nära den spelarens eget snitt (0,75). Utfallet blir då nästan slantsingling, och resultaten ligger nära bandets kant.

**Kontrollen med gränserna i spelet** (40 säsonger, stjärnans tredje plats i facket räknad):

| Rätt per steg | Når stjärnan | Vecka i snitt | Behåller den till vecka 8 | Källa |
|---|---|---|---|---|
| 0,85 | 30 av 40 (75 %) | 5,6 | 22 | `stjarna-085.json` |
| **0,75** | **11 av 40 (28 %)** | **5,5** | 3 | `stjarna-075.json` |
| 0,6 | 0 av 40 | — | — | `stjarna-06.json` |

- **Spelaren som jagar stjärnan med 0,75 rätt per steg når den i snitt vecka 5,5**, i 28 % av säsongerna.
- Med 20 säsonger varierar andelen: 7 av 20 i `trappa-golv.json` och 3 av 20 i `trappa-provsmakning.json`.
- Stjärnan förloras ofta igen. Det gäller särskilt med 0,75: av 11 behåller 3 den till vecka 8. En vecka under någon gräns tar den.
- Inget annat i trappan är ändrat.

## 5. Tester och bygge

- **Nya tester:** `order298bGolvet.test.ts` (6 tester).
- **Mätningarna:**
  - `order298bKvallarna.test.ts` (styrd av `KVALLARNA`);
  - harnessens `KARNAN_TASTING=1` i `order296Karnan.test.ts`;
  - `scripts/order298b-star-sweep.mjs`;
  - produktionskontrollen `scripts/order298b-check.mjs`.
- Hela sviten och bygget är gröna.

## 6. Öppet

- **ORDER 299** börjar efter merge.
- **Designs leverans D1** (`documentation/leveranser/nexus-leverans-2026-10-03-stamning/`, `Stamningen.dc.html`) finns inte i repot eller på datorn. Inte heller byns omtag (`…-byn-omtag-2`, D3) finns.
  - Delarna av ORDER 299 som inte behöver D1 byggs först.
  - Konsekvensögonblickets manus och stämningens symboler, gester och ansikten väntar på filerna.
