# ORDER 289 — Rättelser efter provspelet av 285 (rapport)

**Ordern** (Vision Owner 2026-09-29, provspel av `8a7db7f` med skärminspelning): "Rätta detta innan 287a: Raketen fastnar (blockerande). I phronesis-steget var ingen säkerhetsnivå förvald, 'Back it' var grå utan förklaring, och klockan stod still medan servicen gick 40 spelminuter. Rätta så att: (a) 'Think so' är förvald i varje steg …; (b) en grå knapp alltid säger varför …; (c) efter att svaret är låst finns en andra tidsgräns på 10 sekunder, och när den går ut satsas 'Guessing' automatiskt. Skriv ett test som spelar alla tre stegen till slut, med och utan att välja nivå. Raketräkningen … Banken … Personalen och satsningarna … Namnet på krogen … Kör layoutkontrollen och hela veckan från bussen igen."

## 1. Vad som rättades

**Raketen fastnade.** I 284 stannade stegets klocka när svaret låstes, utan någon gräns, och ingen säkerhetsnivå var förvald. Valde spelaren ingen nivå stod raketen öppen hela kvällen.
- (a) "Think so" är förvald i varje steg (`BACK.defaultConfidence`), eller "Guessing" om krediterna inte räcker (`IncidentPanel.tsx`).
- (b) En grå knapp säger varför: "Back it" visar "Choose how sure you are" när ingen nivå är vald, och knappen som startar en egen raket visar skälet ("A rocket is already under way", "All three are used tonight", "No question fits tonight's menu right now", "Opens when the doors open"; `incidents.ts` `whyNotBack`, samma villkor som `canStartBack`).
- (c) När svaret är låst går en andra tidsgräns på 10 sekunder (`BACK.lockSeconds`, `ActiveIncident.lockLeft`). Kortet visar den och säger "or it counts as Guessing in N s". När den går ut satsas "Guessing" på det låsta svaret (`reducer.ts` TICK).

**Raketräkningen.** "Rocket 1 of 3" följdes av "Rocket 2 of 4", eftersom följdraketer och egna raketer räknades in. Antalet är nu kvällens planerade raketer och står still (`IncidentsState.plannedCount`, `serviceView.ts` `rocketCounter`). En följdraket säger "Follow-up" och en egen raket "Your rocket 1 of 3" (`IncidentRecord.kind`).

**Banken.** Repliken vid första mötet väljs efter vad spelaren har gjort: prov med medalj ("The Mentor said you took the exam today"), prov utan medalj, eller inget prov (`examsTaken`, nytt; `BankDialog.tsx`).

**Personalen och satsningarna.** De äldre panelerna har fått den varma formen: gb-paletten pekar på designsystemets trä, mässing och grädde, och typsnittet är Figtree (`strategic.css`). Panelkolumnerna börjar under HUD:en och slutar ovanför bottenraden, så att ingenting ligger över panelerna.

**Namnet på krogen** frågas på en egen skärm på mörkt trä med kortet på papper, och morgonen ritas först när namnet är satt (`name-entry.css`, `StrategicApp.tsx`).

**Kvällens resultat visades aldrig (blockerande, tillägg).** Kvällens ordning (sopbilen → resultatet → lärdomen → berättelsen) hölls i komponentens lokala tillstånd, och knapparna vidare ligger på samma plats nere till höger på alla kvällens skärmar. Ett dubbelklick, eller ett klick som landar precis när skärmen byts, tog därför nästa skärm också innan den syntes. Kvällsskriptet återskapade att en skärm kan hoppas över mot koden före rättelsen: kvällen började på R1, och sopbilens skärm hoppades över av ett klick från servicen som landade när skärmen byttes (`frontend/reports/order289-repro/evening-flow-en-double.json` `evenings[0].sequence`). Det exakta klicket i provspelet är inte återskapat. Rättat:
- kvällens steg står i simuleringen (`day.eveningStep`, satt när servicen stänger) och går bara framåt (`EVENING_STEP`): kvällens resultat kan inte hoppas över;
- varje kvällsskärm tar emot klick först 700 ms efter att den visats (`EveningBar.tsx` `useArrivalGuard`);
- kvällens skärmar döljs när natten är begärd.

**Varför veckokörningen inte fångade felet.** Veckoskriptet väntade på R1 bara den första kvällen, efter ett enda klick och långa pauser, så det spelade aldrig som en spelare som klickar snabbt. Tisdag till lördag klickade det "result-continue" om knappen fanns, utan att kontrollera att R1 visades; en kväll utan R1 gick igenom tyst. Layoutskriptet mätte R1 en kväll, också med ett klick efter en paus. Båda prövade att skärmen går att rita, inte att den visas i flödet varje kväll. Nu kräver veckoskriptet R1 varje kväll (`report.eveningSequences`), och kvällsskriptet (`frontend/scripts/order289-evening-flow.mjs`) spelar två kvällar i produktionsbygget med ett klick och med dubbelklick, på engelska och svenska.

**Byns lager** (platsrutan, kartkrediten, raden med zoomnivåerna, platsnamnet) döljs när en skärm är öppen (`strategic.css`).

**Sopbilen** heter efter krogen ("The bin lorry at Vinbaren vid torget").

**Rådet efter kvällen.** Tog maten slut före stängning och gick gäster utan mat är rådet att köpa mer: klockslaget då köket tog slut, hur många som gick utan, och portioner mer avrundat uppåt till ett parti (`day.foodOutClock`, `day.soldOutGuests`, `WasteSettlement.shortage`). Tog maten slut utan att någon gick utan föreslås ett parti till.

**Morgonen.** Allt på morgonen går att nå: varje satsning och paviljong skrollas fram och ligger då överst (layoutskriptet, `screens.morgonenNas`). Byns lager (kartkrediten och raden med zoomnivåerna) låg ovanpå morgonens nedersta del; de döljs nu.

**Singular och plural.** Alla texter med antal i strängtabellen går genom `pl(n, singular, plural)` på båda språken ("1 bottle", "1 flaska", "1 of 1 step"); också räkneord ("one guest"). Glasen i lagrets varning har singular.

## 2. Tal

**Layoutkontrollen** (`frontend/reports/order289/layout.json` och `layout-*.png` @ `order-289`), sju fönsterstorlekar: morgonen, allt på morgonen nåbart (`morgonenNas`), personalen (bottenraden och HUD:en ligger inte över panelerna), M1, servicen, raketkortet, S1, R1, L1, K1 och gårdagens rester är gröna i alla storlekar. Back your knowledge med låst svar är grön i alla utom 844 × 390, där säkerhetspanelen, som står fast längst ned i kortet, täcker det låsta svaret; knapparna som behövs (säkerheten och Back it) syns. Den andra tidsgränsen (`backClock`): klockan räknar ned efter låst svar (`lockCountsDown` true), och när den går ut satsas Guessing (`autoGuessed` true). I layoutens sparfil har spelaren inga krediter, så Guessing är förvald där (`thinkSoPreselected` false); med krediter är Think so förvald (veckokörningen nedan).

**Kvällens flöde** (`frontend/reports/order289/evening-flow-{en,sv}-{single,double}.json` @ `order-289`, skript `frontend/scripts/order289-evening-flow.mjs`): produktionsbygget, två kvällar var på engelska och svenska, med ett klick och med dubbelklick. Varje kväll gick sopbilen → kvällens resultat → lärdomen → berättelsen → morgon (`evenings[].order`), och R1 stod kvar i minst en sekund (`r1VisibleMs`), utan fel i sidan (`ok` true i alla fyra).

**Spelarens flöde** (`frontend/reports/order289/dod.json` och `dod-*.png` @ `order-289`): produktionsbygget från bussen till söndagen och X1, 1920 × 1080, utan fel i sidan (`errors` tom), 28 bildrutor per sekund under servicen (`fpsService`). Kvällens resultat visades varje kväll måndag till lördag (`eveningSequences`: fem kvällar i veckans slinga, alla S1 → R1 → L1 → K1, och måndagen med bild). Think so var förvald i varje steg i Back your knowledge (`backs[].defaults`).

**Tester:** `frontend/src/sim/__tests__/order289RocketAndFixes.test.ts`: en egen raket spelas genom alla tre stegen till slut med vald säkerhet, och utan (den andra tidsgränsen går ut och Guessing satsas; `lastBack.confidence` 0); raketräkningen står still under en kväll med egna raketer; bankens underlag räknar prov och inte övningar. `order284FixesAndUsability.test.ts` och `serviceScreens.test.tsx` följer de nya reglerna. Hela sviten är grön (136 testfiler, 2 185 tester, varav 4 överhoppade som förut, en testfil överhoppad).

## 3. Avvikelser

- Koden påbörjades medan hyran mättes med 40 frön, innan grenen skapades; tidsloggens uppskattning skrevs när grenen skapades.
- En planerad raket som inte hittar någon passande händelse faller bort (som förut). Då kan kvällen sluta på "Rocket 3 of 4".
- I 844 × 390 täcker säkerhetspanelen det låsta svaret i Back your knowledge.
- Det exakta klicket som hoppade över kvällens resultat i provspelet är inte återskapat; mekanismen är det (en skärm som byts under ett klick).

Gren `order-289` från `main`.
