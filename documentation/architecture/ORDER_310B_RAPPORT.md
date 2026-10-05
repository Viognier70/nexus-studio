# ORDER 310b — Låset och väntan före avgörandet (rapport)

**Underlag:** Anders 2026-10-05, beslut efter ORDER 310 §3.1–3.2: Designs lås och väntan byggs efter `documentation/leveranser/nexus-leverans-2026-10-05-kvitt-eller-dubbelt/` (LEVERANSNOT §3, `pyramidStake.ts`, prototypen). Svaret låses vid 0,9 s, och avgörandet kommer vid 3,8 s, när gästens reaktion syns. "Det ska dröja, för det är där spänningen finns."

Gren `order-310b` från `main` (`508822e`).

## 1. Simuleringen

Väntan ligger i motorn, inte bara i visningen. Inget av svarets följd syns före avgörandet.

- **`balance.ts` `INCIDENTS`:** `lockSeconds: 0.9` och `verdictSeconds: 3.8`, i verkliga sekunder från trycket, som `choiceSeconds`. Kommentaren står vid talen.
- **`sim/incidents.ts`:**
  - `ActiveIncident.pending { optionId, lockLeft, verdictLeft }` är ett låst svar som väntar.
  - `lockAnswer` låser svaret. Ett struket eller okänt svar avvisas, liksom ett svar under valet och ett andra svar medan det första väntar.
  - `countDown` räknar ned väntan och ger `'verdict'` när den är slut. Stegets klocka står under väntan.
  - `settlePendingAnswer` avgör svaret med `resolveIncident`, som förut.
  - `pendingPhase` ger `'lock'` före 0,9 s och `'wait'` efter.
  - `closeIncidents`: ett svar som väntar när servicen stänger avgörs.
- **`reducer.ts`:**
  - `ANSWER_INCIDENT` låser bara svaret.
  - `TICK` avgör svaret när väntan är slut. Dagen kopieras, som förut i `ANSWER_INCIDENT`.
- **Oförändrat:**
  - Tiden ute avgörs direkt, utan väntan.
  - Valet i kvitt eller dubbelt kommer efter avgörandet och visningen av svaret (`revealLeft`), som förut. Dess 8 s börjar efter visningen.
  - Ekonomins tal, `sim/goods.ts`, butiken, öppningen, byn och morgonens genomgång.
- **Harnessen** (`weekHarness.ts` `answerScenario`) svarar inte medan ett svar väntar.

## 2. Det spelaren ser

**Kortet** (`scenario/IncidentPanel.tsx`) under låset och väntan:
- Det valda svaret har en bläckkant (`data-look="locked"`, `aria-pressed`).
- Alla svar är spärrade, och tangenterna 1–4 svarar inte.
- Klockan står (grå).
- Listen längst ned visar *Låst* med ett lås, i stället för raden om tangenterna.
- Vid 0,9 s (`data-locked="wait"`) tonas kortet till 45 %.
- Om svaret var rätt eller fel syns först vid avgörandet. Bandet, beloppet och mätarnas betoning kommer också först då.

**Kolumnen** (`ui/service/PyramidMoment.tsx`) har två nya lägen, `lock` och `wait`:
- Marken med kreditsymbolen och potten glider upp på steget (150–780 ms), med mässingslåset öppet. Låset slår igen när motorn går över till `wait`.
- Steget pulserar från glöd till ljuslåga med Designs `waitPulse`. Perioden kortas från 900 till 320 ms.
- Raden visar *Steg n · Axis · Potten a → Om rätt b*. Under raden står *Insatsen ligger på steget* (Designs `stake.onTable`).
- Vid avgörandet går kolumnen över till `right` eller `wrong` som i ORDER 310.

**Reducerad rörelse:**
- Väntan är kvar, eftersom den är spelets regel.
- Pulsen står still på 100 %.
- Marken tonas in i stället för att glida.

**Strängar** (`nexusStrings.ts`, sv och en): `rocket.card.locked`, `rocket.card.lockedNote` och `pyramidMoment.onTable`.

## 3. Kontroll i spelarens flöde

`frontend/scripts/order310b-check.mjs` kör på produktionsbygget med sparfilen måndag vecka 2 i vinbaren. Spelaren köper baspaketet, öppnar dörrarna och svarar på raketerna, sina egna (Stå för ditt svar) och kvällens. Alternativen väljs i tur och ordning. Det görs i tre körningar:
- 1440 × 900 med mus och tangent varannan gång;
- 1280 × 720 med pekskärm (`tap`);
- 1440 × 900 med reducerad rörelse.

En slinga i sidan loggar varje ändring av kortets `data-mode` och `data-locked` och kolumnens `data-phase` med `performance.now()`, från trycket. Talen 0,9 och 3,8 är replikerade i skriptets huvud från `balance.ts`.

- Utdata: `frontend/reports/order310b/check.json`. Talen står i `summary` och per tryck i `runs.<körning>.presses`.
- Bilder: `frontend/reports/order310b/<körning>-laset.png`, `-vantan.png`, `-avgorandet-fel.png`, `-avgorandet-ratt.png` och `-valet-efter-avgorandet.png`.

Resultatet står i `check.json`:
- **`summary.verdictMs`:** spannet från trycket till avgörandet. Det ligger kring 3 800 ms och kan bli en tick (100 ms vid farten 2) plus en bildruta senare.
- **`summary.lockMs`:** spannet till låset. Det ligger kring 900 ms. Det största värdet kom när maskinen var belastad av andra agenters körningar.
- **`summary.shownBeforeVerdict`** är 0: inget band, inget belopp, inget rätt eller fel i kortet och ingen betoning av mätarna före avgörandet.
- **Valet efter avgörandet** nåddes i pekskärmskörningen (`runs.1280x720-touch.choiceAfterVerdict`: `choosing`, ringen 8) efter ett rätt svar. De andra körningarna gav bara fel svar på kvällens raketer.
- **Reducerad rörelse:** `reduced` är sant i trycken, och väntan har samma tider.
- **Tangenterna:** två tryck på tangenten 4 gav inget lås (`lockMs` null). Tangenterna 2 och 3 fungerade. Kortets lyssnare tar emot 4 i jsdom. Orsaken i spelet är inte utredd (§6).
- **Kortet kan stå tomt en bildruta** (40–60 ms, `verdictSeq`) mellan avgörandet och utfallet vid ett fel. Det finns sedan förut: `useHeldOutcome` sätter utfallet i en effekt.

## 4. Tester och bygge

**Nya tester:**
- `src/sim/__tests__/order310bVerdict.test.ts` (9 tester):
  - talen;
  - låset vid 0,9 s;
  - avgörandet vid 3,8 s och inte före;
  - inget av svaret före avgörandet: kassan, intäkten, ryktet, moralen, krediterna, gästerna, rummets reaktioner, loggen och portfolion är lika med samma kväll utan svar, och klockan står;
  - fel svar;
  - valet efter avgörandet;
  - tiden ute direkt;
  - stängd service under väntan;
  - en egen raket.
- `src/strategic/ui/service/__tests__/order310bLockAndWait.test.tsx` (4 tester):
  - kortet och kolumnen i låset och väntan, med Låst, bläckkanten, spärrade svar och tangenterna;
  - fel svar;
  - reducerad rörelse;
  - `waitPulse`.

**Ändrade tester:**
- Testerna som förutsatte att svaret avgörs direkt tickar nu förbi väntan med `src/sim/__tests__/verdict.ts` (`answerAndWait`, `untilVerdict`), med samma avsikt som förut:
  - `order270Incidents`, `order276GuestFlow`, `order279QuestionsAndStake` och `order280BackYourKnowledge`;
  - `order284FixesAndUsability`, `order289RocketAndFixes` och `order305Kvitt`;
  - `order310Kvitt` och `serviceScreens`.
- **`order276GuestFlow` "en kväll med rätta svar säljer mer än en med fel":**
  - Med väntan gav fröna 1–4 159 gäster med rätt svar och 164 med fel. Förut var gränsen bad − 2.
  - Gränsen är nu 5 % av kvällens gäster.
  - Intäkten skiljer som förut, 44 336 mot 16 962 kr.

**Helkörningen `npx vitest run`:** 2 415 gröna och 10 som föll på tiden (`Test timed out`). Inget test föll på en kontroll.
- Maskinens belastning var 48–77 under körningen, med andra agenters körningar.
- Vid omkörning en och en var 8 av dem gröna: harnessens fyra filer, `day`, `order137`, `order215` och `smoke`.
- `order131LoadSweep` föll på tiden (300 s) också ensam, med belastningen 69–93. Testet svarar inte på raketer: det använder varken `ANSWER_INCIDENT` eller harnessens svar. Tiden ute avgörs som förut. I ORDER 310 var det grönt ensamt på 170 s.

**`npm run typecheck` och `npm run build`:** gröna.

**Ekonomin:** svaren avgörs nu ungefär 3,8 verkliga sekunder senare, också i harnessen. Det ändrar när följder, gäster och krediter kommer under kvällen, och raketerna står längre öppna. Harnessens tal kan därför flytta sig något. Ekonomiharnessen körs om efter mergen. Ingen ekonomisk konstant är ändrad.

## 5. Avvikelser från Designs leverans

1. **Gästens reaktion** börjar vid avgörandet, inte 300 ms före, som hos Design (3 500 ms). Rummets reaktion (`day.consequence`) skrivs av motorn när svaret avgörs. Att börja tidigare skulle visa utfallet i rummet före avgörandet.
2. **Ingen knapp *Stå för ditt svar*.** Ett klick på svaret, eller tangenten, är trycket. Listen längst ned visar *Låst* efter trycket.
3. **Valet efter avgörandet** kommer efter visningen av svaret (`INCIDENTS.revealSeconds`, 2,4 s), som förut. Hos Design kommer det vid D + 1,2 s (ORDER 310 avvikelse 2 står kvar).
4. **Inte byggt, som i ORDER 310 §3.3–3.4:** kameran in till 11 m, kortet som list i fokusläget, och ljuden `lock.*`, `wait.*` och tystnaden före avgörandet.
5. **Låset i kolumnen** slår igen när motorn går över till `wait` (`pendingPhase`), alltså i takt med simuleringens tick. Marken glider på kolumnens egen klocka.

## 6. Öppet

- **Farten under konsekvensögonblicket.** Motorn räknar verklig tid som `dt / state.speed` (`countDown`). Under konsekvensögonblicket tickar spelet med `effectiveSpeed` 1 (`consequence.ts`). Visningen och valets nedräkning efter ett avgörande går därför långsammare i verklig tid än talen säger, när farten är 2. Det fanns förut och gäller inte väntan i praktiken: ett nytt svar kan komma först när ögonblicket är över. Det mätta avgörandet (`summary.verdictMs`) visar det.
- **Tangenten 4** gav inget lås i två tryck i spelarens flöde (§3). Den bör prövas för sig.
- **Ekonomiharnessen** körs om efter mergen (§4).
