# ORDER 328 — svar på 327, städning, felsökning (rapport)

*Anders 2026-10-11. Gren `order-328` från main `7a60bb66`.*

## A. Tallriken dukas av när gästen ätit klart

**Avdukningen** sker i regissören (`wineBarDirector.ts` `clearPlates`).
- **När:** `GESTURE_BALANCE.plateEatenS` = 50 s (25 spelminuter) efter att tallriken med maten ställdes fram. Regissören har ingen egen tid för när gästen ätit klart, så talet står nu i `balance.ts`.
- **Vem:** servitören dukar av tallriken och bär disken till passet. Det är en uppgift i personalens rutt, utan kostnad.
- **Sedan:** gästen dricker i stället för att äta (`seatedPose`).
- **Om notan kommer först:** avdukningen avbryts när notan kommer, och tallriken tas då av den vanliga avdukningen när sällskapet går (`leaveParty`).

**Notan:**
- Notan står som förut i 8 s (`paying` i simuleringen). Ingen ändring i ekonomin.
- Notans andra väg, "tallriken undan och glaset tomt i mer än `billAfterEmptyS`", kan nu slå till. I mätningen hände det för ett av de 83 sällskap som ville ha notan under de tre kvällarna, på frö 7 (`reports/order328/signaler.json`, `bill.whileDining`). Påfyllningen hinner oftast före.

**Testet:** `wineBarDirector.test.ts`, "tallriken dukas av när gästen ätit klart, före notan".

## B. Vagnen svarar från luckan
**Vem svarar** på en gäst vid ståbordet som söker blicken, räcker upp handen eller vinkar (`PlayerTruckCrew.tsx` `hatchAck`):
- medhjälparen, när den står vid luckan och inte serverar, vinkar in en nyfiken eller sköter kortläsaren;
- annars grillaren, när den inte lyssnar vid luckan eller tar korv ur lådan.

**Svaret:**
- Den som svarar tittar upp mot gästen och nickar med Designs `staff.listenTilt` (en nick på ett kvarts varv, vänd mot gästen högst `SEEK_MAX_YAW`). Sedan lyfter den handen med Designs `staff.halt` (`poseAnswer`).
- Svaret räknas som blickkontakt, en gång: gästen nickar tillbaka och stegen stannar.
- Ingen ny väg ut.

*Förbehåll:* inget av Designs klipp är exakt "titta upp, nicka och lyfta handen", så svaret är två av deras klipp efter varandra. `staff.halt` vrids inte mot gästen. Säg till om Design ska göra ett eget klipp.

## C. Blickkontakten: en nick per steg, högst en omstart, Y = 25 s
`wantSignals.ts` `stepWant`, med talen i `balance.ts`:
- `eyeContactComeS` = 25 och `eyeContactMaxRestarts` = 1.
- **En nick per steg:** har gästen redan nickat i blicken går stegen vidare till handen, även om någon går förbi igen.
- **Efter den enda omstarten:** stegen står stilla efter nicken tills personalen är framme.

**Nickar per sällskap**, i samma mätning som i 327 (`reports/order328/signaler.json`, `nodsPerParty`). I medel räknas nickarna över alla viljor:

| Frö | 327: nickar per sällskap | 328: nickar per sällskap | 328: högst | 328: fördelning (antal nickar: sällskap) |
|---|---|---|---|---|
| 7 | 4,45 (147/33) | 2,61 | 3 | 1: 1, 2: 11, 3: 21 |
| 11 | 4,10 (123/30) | 2,43 | 3 | 1: 2, 2: 13, 3: 15 |
| 23 | 4,42 (159/36) | 2,56 | 3 | 2: 16, 3: 20 |

- **Var talen för 327 kommer ifrån:** summan av `eyeContacts` för beställningen, glaset och notan i `reports/order327/signaler.json`, delad med antalet sällskap.
- **Omstarterna:** beställningen har nu 16–23 per kväll (förut 59–77), aldrig fler än en per sällskap. Testet kontrollerar det i mätningen.
- **Handen syns oftare:** i beställningen nu i 12–16 sällskap per kväll, förut i 1–3.

**Testerna:** `order327Signaler.test.ts`, med en nick per steg, en omstart, Y = 25 och mätningen.

## D. Regeln heter A12
Regeln heter nu A12 i `SITUATIONER_306c_OMG1.md` och `SITUATIONER_306c_OMG2-4.md`. Numret är ledigt i 306b-filen, där A1–A11 finns.

## E. vb35-tillsynen-c
- **Borttaget:** texterna för halvt grepp mot upplevelsen (`experience`, `outcomeExperience`), på svenska och engelska. Inget svar använde dem, eftersom steg 3 bara ger halvt grepp mot analysen.
- **Testet** `order326Situationer306c.test.ts` är strikt igen: det kräver texter för exakt de sidor som steg 3 ger.

## F. Felsökningen: när 0,6-raderna går från 7 till 3 vinbarer, och varför
Inget i spelet är ändrat för F.

**Körningarna:**
- **Skript:** spelartyperna med 40 säsonger (`scripts/order327-harness.sh`), körda i tillfälliga worktrees.
- **Resultat:** `reports/order328/<körning>/`.
- **Jämförelse:** `reports/order328/jamforelse.json` (`scripts/order328-jamforelse.mjs`).
- **Merge-committarna** för ORDER 320–325 kördes med alla 17 rader.
- **Avsmalningen** och försöket gjordes med bara de tre 0,6-raderna.

| Körning | Commit | koncept-enkel-0.6 | stjarna-0.6 | koncept-soigne-0.6 |
|---|---|---|---|---|
| o320 | `24f6485c` (merge 320) | 7 | 7 | 7 |
| o321 | `336ad09d` (merge 321, med 306b–306b4 före) | 7 | 7 | 7 |
| o322 | `492d177f` (merge 322) | 7 | 7 | 7 |
| b322b3 | `6124209e` (merge 322b3, före 323) | 7 | 7 | 7 |
| b323s4 | `fbd6bac0` (323 §4, före §5) | 7 | 7 | 7 |
| **b323s5** | **`281ff99b` (323 §5)** | **3** | **3** | **3** |
| o323 | `0ba2c48d` (merge 323) | 3 | 3 | 3 |
| x323utanplats | `0ba2c48d`, fikats platsfilter bortkopplat | **7** | **7** | **7** |
| o324 | `bff029cd` (merge 324) | 3 | 3 | 3 |
| o325 | `9020fa65` (merge 325) | 3 | 3 | 3 |

Värdena är `runs.<körning>.rows.<rad>.reachedVinbar`, antal säsonger av 40.

**Svar: efter ORDER 323, och mer precist commit `281ff99b`, ORDER 323 §5 "fikat följer platsen".**
- Kopplas den raden bort på 323:s merge (`sim/fika.ts` `eligibleDilemmas`: `if (!place || !dl.places.includes(place)) return false;`) blir det 7 igen i alla tre raderna.
- Samma fyra frön (3, 7, 27 och 30) tappar vinbaren i alla tre raderna. I de andra 14 raderna är det bara stjarna-0.75 som ändras: 37, 37, 37, 38, 38, 35 vinbarer genom 320–325.

**Varför.** Före §5 valdes fikat i foodtrucken bland de 12 dilemman som fanns, alla vinbarens. §5 lade till vagnens 5 och gav varje dilemma en plats, så i foodtrucken väljs det sedan bara bland vagnens 5. Försöket utan filtret har alla 17. Samma dilemma kommer högst en gång per 14 dagar (`FIKA.repeatAfterDays`).

Mätt med den rimliga spelaren i 21 dagar i foodtrucken på 40 frön (`reports/order328/fika.json`, skriptet `scripts/order328-fika-matning.test.ts.txt`):

| | Fika per 21 dagar | Lagets trivsel dag 21 |
|---|---|---|
| Utan platsfiltret (17 dilemman) | 14,57 (14–15) | 0,952 |
| Med platsfiltret (spelet, 5 dilemman) | 7,83 (7–8) | 0,921 |

**Den troliga vägen till ryktet:**
1. Varje fika som besvaras väl ger trivsel: `FIKA.wellbeing.well` 2 poäng × `wellbeingPerPoint` 0,03.
2. Trivseln går in i `staffEffect` (`staffCondition.ts`): 0,4 + 0,6 × lagets medel av ork och trivsel.
3. `staffEffect` multiplicerar ryktet från varje rätt svar i en situation (`incidents.ts:883`).
4. Med färre fika blir trivseln lägre, och varje rätt svar ger lite mindre rykte.
5. Vinbaren kräver ryktet 0,5 (`LADDER.requirements.vinbar`). De fyra fröna låg nära gränsen och når den inte längre.
   - Exempel, frö 3 i koncept-enkel-0.6 morgon 16–20 (`runs[].mornings[].rep`): 0,44, 0,47, 0,49, 0,50, 0,58 före §5, mot 0,34, 0,36, 0,34, 0,38, 0,40 efter.

Tempot påverkas inte: `slowFactor` slår till först under 0,5.

*Förbehåll:*
- **Säkert:** att §5 är orsaken, eftersom avsmalningen och försöket med filtret visar det.
- **Inte isolerat:** vägen genom `staffEffect` är den troliga, men jag har inte isolerat den för 0,6-raderna.
- **Den rimliga spelaren:** i fikamätningen sjunker ryktet dag 21 inte för den rimliga spelaren (0,573 med filtret, 0,560 utan). Det som gäller 0,6-raderna har jag alltså inte visat med samma mätning.
- **Det som återstår:** att isolera vägen, till exempel genom att köra 0,6-raderna med `staffEffect` fast vid 1.

## G. Testsviten ensam
Hela testsviten kördes ensam, utan säsongskörningar samtidigt. Inga andra vitest-processer gick: 224 filer och 2786 tester gröna, 14 filer och 19 tester överhoppade, 1 väntat fel, 0 röda, på 410,8 s.

## Kontroller
- Typecheck och `npm run build`: gröna.
