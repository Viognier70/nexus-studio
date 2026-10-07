# ORDER 306b — hur kvitt eller dubbelt (A2) och ordningsformen (A9) byggs in

Kort rapport före bygget (Anders 2026-10-07: "Börja med en kort rapport om hur kvitt eller dubbelt (A2) och ordningsformen (A9) byggs in"). Underlag: `documentation/blueprints/ORDER_306_UTKAST/SITUATIONER_306b.md`, som ersätter `UTKAST_RAKETER.md`.

## A2. Kvitt eller dubbelt över tre steg

**I dag (ORDER 305b):** potten är krediter per kunskapsaxel och dubblas för varje rätt steg (`DOUBLE_OR_NOTHING.growth` 2, `sim/incidents.ts growPot`). Ett fel avslutar situationen, och personalen tar resten. Stannar spelaren tar hon potten, och situationen slutar utan personalens utfall (`stopTakesStaffOutcome: false`).

**Så byggs A2:**
1. **Potten följer en regel:** efter ett rätt steg blir den 2 × potten + 1. Det ger 0 → 1 → 3 → 7. Ett ok-svar lämnar potten som den är, och ett fel nollställer den. Halvt grepp i steg 3 ger potten före steget × `CONSEQUENCES.halfGrip` (0,5), avrundat uppåt, alltså 3 → 2. Talen står i `balance.ts DOUBLE_OR_NOTHING` (`potStep` 1, `growth` 2).
2. **Krediterna bokförs på stegens axlar:** stegets eget tillskott bokförs på dess axel (episteme 1, techne +2, phronesis +4 när allt går rätt), så Kunskapens tre axlar fylls som förut.
3. **A1, fel avslutar inte:** stegets följd verkar som i dag och potten nollas, men nästa steg öppnas med ledtråden "Analys: (oklart)" eller "Upplevelse: (oklart)". Spelaren handlar alltid i steg 3. Efter ett fel finns inget att säkra, så valet Stanna/Gå vidare visas bara efter ett rätt steg.
4. **Stanna:** krediterna säkras, och personalen gör resten med sin kompetens (`SITUATIONS.staffSuccessTrained` 0,65, annars `staffSuccessUntrained` 0,4, samma slumpdragning som i dag). Lyckas personalen gäller situationens klarade utfall gånger personalens andel, med texten `staff.success`. Misslyckas den gäller personalens utfall med texten `staff.fail`. Låset, väntan och nedräkningen är oförändrade.
5. **Steg 3 har grepp i stället för rätt och fel:** varje alternativ i steg 3 bär `grip`, alltså helt, halvt mot analysen, halvt mot upplevelsen eller fel. Helt grepp ger klarad, halvt grepp ger `halfGrip.outcomeAnalysis` eller `outcomeExperience` (effekterna är klarads gånger `CONSEQUENCES.halfGrip`), och fel ger stegets följd. `cost` (kr) dras från kassan när alternativet väljs (A7).

## A9. Steg 3 som ordning (pilot i vb40)

**Datan:** `steps[2].form: 'sequence'`, korten (`cards`: a–f, med text) och bedömningen som regler i ordning, där den första som stämmer gäller:
- helt grepp: a → b → c → d i den ordningen, utan e och f;
- halvt mot analysen: b → c → d och f med, eller a saknas;
- halvt mot upplevelsen: a och e med, eller c saknas, eller c före b;
- annars fel ("varken b eller c, eller d först").

Reglerna skrivs som villkor (`has`, `lacks`, `before`, `first`), så att formen kan prövas i fler situationer utan ny kod. `validateIncidentBank` prövar att varje regel bara nämner kort som finns, och att den hela ordningen ger helt grepp.

**Kortet:** tills Design levererar D8 lägger spelaren korten med designsystemets enkla delar. Hon klickar på ett kort för att lägga det på nästa plats i en rad med fyra platser, klickar på en plats för att ta bort kortet, och lägger fram raden. Samma lås och samma nedräkning som ett vanligt svar, 30 s. När D8 kommer byts formen.

**Harness:** spelartyperna lägger den hela ordningen med sin kunskap, och annars en slumpad rad. Gissaren lägger så många kort som får plats (det motsvarar det längsta alternativet) och ska inte lyckas bättre än slumpen.

## Ordningen för bygget

1. Reglerna A1–A3 och A5–A8 i simuleringen och kortet: potten, fel som fortsätter, stanna med personalen, tiderna (20 / 30 / 30 s), greppen och kostnaden, ledtrådarna, replikerna A och B (lottade, inte samma två gånger i rad).
2. A4: ordningen blandas varje gång, och valideringen av ordlängderna (högst 12 ord i steg 1 och 2, högst 15 i steg 3, högst 1,5 gånger det kortaste i steg 3), med en rapport över alternativen som inte klarar det.
3. De elva situationerna i del B i bankens format, med svenska och engelska och ⚖ på vb03.
4. A9 i vb40.
5. Harness med gissaren, och tabellen för A10.
