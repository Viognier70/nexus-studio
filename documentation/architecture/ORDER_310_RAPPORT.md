# ORDER 310 — Kvitt eller dubbelt i Designs form, och pyramiden i raketens ordning (rapport)

**Underlag:** Anders 2026-10-05:
1. Designs leverans `documentation/leveranser/nexus-leverans-2026-10-05-kvitt-eller-dubbelt/` (LEVERANSNOT §0 före §2–§4, `pyramidStake.ts`, `kvittStrings.ts`, prototypen och skärmarna) ersätter de tillfälliga knapparna från ORDER 305b.
2. Pyramiden visar varje rakets egen stegordning (`incident.steps[].axis`), så att ORDER 306:s raketer (episteme, phronesis, techne) får handlingen i toppen. Övriga raketer behåller den gamla ordningen.

Gren `order-310` från `67650e0`. Simuleringens regler och tal är oförändrade (`balance.ts` `DOUBLE_OR_NOTHING`, `sim/incidents.ts`).

## 1. Det spelaren ser

**Kolumnen** (`ui/service/PyramidMoment.tsx`) står i mitten av den fria ytan till höger om raketkortet, som Designs `STAKE_MOMENT.column`:
- pyramiden på 34 % av höjden;
- raden *Steg n · Axis · potten → Om rätt*;
- valet.

Kolumnen visas i fem lägen (`data-phase`):

| Läge | När | Vad |
|---|---|---|
| `right` | svaret i stunden efter ett rätt steg | Steget fylls i grönt. Potten rullar upp i 8 steg (200–900 ms). Fältet heter *Stegets kredit* när potten var tom, annars *Dubbelt + steget*. |
| `choosing` | motorns val (`active.choosing`) | Två knappar: *Stanna, och ta det du har* (*1 kredit är din* / *n krediter är dina*) och *Gå vidare, med allt på spel* (*Techne: 1 → 3 om rätt, 0 om fel*). Mellan dem står ringen med nedräkningen ur `choiceLeft` (8 s). De tre sista sekunderna pulserar ringen. Under knapparna står *När tiden går ut stannar du*. Våningen ovanför har streckad kant i ljuslåga. Tangenterna 1 och 2 väljer. |
| `done` | hela raketen rätt | Hel pyramid och potten 7. Inget val. Kolumnen krymper bort 2 150–2 600 ms (D5 `pyramidMoment.ts` `t.shrink`). |
| `wrong` | fel eller tiden ute | Steget spricker. Marken med potten faller. Fältet heter *Potten är borta* och beloppet streckas, eller *Potten var tom* på steg 1. Kolumnen tonas ut från 1 800 ms. |
| `stopped` | efter Stanna | Stanna står markerad och *Gå vidare* tonas. Texten är *Du stannar. Krediterna är dina.* Kolumnen står i 1,2 s. |

**Kortet** under valet:
- Frågan, svaren och nedräkningen står inte på kortet.
- Kortet visar *Potten: n krediter* och *När tiden går ut stannar du*.
- Resten av kortet tonas till 45 %.
- De gamla knapparna och `kvitt.note` är borta.

**Potten** visas som simuleringen räknar den (`potCredits(active.pot)` och `lastOutcome.pot`):
- *Om rätt* och *Gå vidare*:s *a → b* räknas med motorns regel, potten × `growth` + `INCIDENTS.bestAnswerCredit` (`potIfRight`).
- Med dagens tal blir det 1, 3 och 7.

**Strängarna** ligger i `nexusStrings.ts`, med Designs text ur `kvittStrings.ts`:
- `rocket.card.kvitt`: `stop`, `go`, `stopSub`, `goSub`, `timeout`, `pickedStop`, `pickedGo`, `aria` och `secondsLeft`;
- `pyramidMoment`: `stepTerm`, `pot`, `doubled`, `first`, `ifRight`, `none`, `gone` och `rowAria`.

## 2. Pyramiden i raketens ordning

Det gäller `KnowledgePyramid`, `PyramidStrip` och kolumnen:
- De tar `axes`, raketens steg nedifrån och upp (`axesOf(incident.steps)`).
- Våningarnas form och multiplikatorn (×1, ×2, ×4) hör till platsen, alltså steg 1, 2 och 3.
- Namnen, `data-axis` och nästa stegs namn i *Gå vidare* följer raketen.
- Utan `axes` gäller den gamla ordningen. Det gäller bland annat `ResultScreen`, som inte är ändrad.

## 3. Avvikelser från Designs leverans

Simuleringens regler är oförändrade. Avvikelserna nedan är rapporterade och inte byggda:

1. **Låset och väntan (0–3 800 ms före avgörandet)** finns inte. Motorn avgör svaret direkt vid `ANSWER_INCIDENT`, och kortet visar det i stunden.
   - Designs väntan vid bordet kräver att avgörandet skjuts upp 3,8 s, i motorn eller i visningen.
   - Det är en regel om vad som visas när. Den lämnas till beslut.
2. **Valet kommer efter svaret i stunden.** Det kommer efter `INCIDENTS.revealSeconds` (2,4 s, eller teaterns `eventAskSeconds`), inte vid D + 1,2 s som hos Design. Motorns `revealLeft` styr.
3. **Inte byggt:**
   - kameran in till 11 m och tillbaka;
   - rummet dämpat till 65 %;
   - kortet som list i fokusläget.

   Kameran och fokusläget hör till en annan agent. Kortet tonas i stället.
4. **Ljuden** (`lock.*`, `wait.*`, `pot.roll`, `token.drop`, `choice.tick*`) är inte byggda. Kortet har ingen ljudkrok.
5. **"Om rätt" förutsätter bästa svaret.** Ett rätt men inte bästa svar (`good`) ger ingen stegkredit i motorn (`incidents.ts`: `stepCredit` bara vid `best`). Potten blir då 2 i stället för 3. Raden visar motorns pott efter svaret.
6. **Designs skärm `kvitt-8`** visar *Dubbelt + steget* och *1 krediter* efter steg 1. Byggt efter LEVERANSNOT §0 (*Stegets kredit*, *1 kredit är din*).
7. **`guestGroups.ts`** i leveransen skiljer sig från D5:s. Luvan har ryggsäckens kontrastfärg och ligger nedfälld som krage. Den är inte monterad och lämnas till agenten för gästerna.

## 4. Kontroll i spelarens flöde

`frontend/scripts/order310-check.mjs` kör på produktionsbygget med sparfilen måndag vecka 2 i vinbaren. Spelaren svarar med alternativen i tur och ordning och startar egna raketer. Kontrollen görs i 1440 × 900 och 1280 × 720. Den läser kolumnens läge, raden, valet, ringen och pyramidens våningar, och räknar överlapp mot kortet och HUD:en.

- Utdata: `frontend/reports/order310/check.json`.
- Bilder: `frontend/reports/order310/<storlek>-kvitt-*.png`.

Resultatet står i `check.json`, fälten `sizes.<storlek>.firstChoice`, `seen` och `overlaps`.

- **Båda storlekarna** nådde valet efter steg 1 i spelarens flöde. I 1440 × 900 behövdes ett andra försök (`attempt`), eftersom inget svar var rätt i det första.
  - Raden, undertexterna och ringen står i `firstChoice.row` och `firstChoice.choice`.
  - Pyramidens våningar står i `firstChoice.floors`.
  - `overlaps` är tom i alla lästa lägen.
- **I 1440 × 900** gick kontrollen vidare med tangenten 2, och nästa steg blev fel (`seen`: `wrong` på steg 2). Bilden av det läget är `kvitt-wrong`.
- **I 1280 × 720** stannade kontrollen med tangenten 1 (`kvitt-stannade`).
- **Inte nått i flödet:** valet efter steg 2 (`secondChoice` saknas) och ringens sista sekunder. Svaren klickas i tur och ordning, och kvällen gav inte två rätta steg i rad. De lägena prövas i testerna (§5).
- **Kolumnen täcker inte rummets notiser.** De döljs medan kolumnen står. En pratbubbla i 3D-rummet kan ändå synas bakom knapparna (`1280x720-kvitt-valet.png`).

## 5. Tester och bygge

- `src/strategic/ui/service/__tests__/order310Kvitt.test.tsx` (10 tester):
  - potten 1, 3 och 7;
  - valet efter steg 1 och steg 2 med Designs text;
  - ringen 8, och pulsen de tre sista sekunderna;
  - tangenterna 1 och 2;
  - fel med *Potten är borta* och *Potten var tom*;
  - stannade;
  - pyramiden i ordningen episteme, phronesis, techne, i komponenterna och i en raket i spelet med omordnade steg.
- **`npx vitest run`:** 2 363 gröna och 2 som föll på tiden: `smoke.test.ts` (30 s) och `order131LoadSweep.test.ts` (300 s).
  - Båda är gröna när de körs ensamma: smoke på 12 s, svepet på 170 s.
  - De föll på samma sätt i båda helkörningarna, när maskinen var belastad av andra agenters körningar. Ingen av dem rör raketkortet.
- **`npm run build` och `npm run typecheck`:** gröna.

## 6. Öppet

- **ORDER 306:s raketer kan inte läggas in än.** `validateIncidentBank` (`sim/incidentBank.ts`) kräver ordningen `INCIDENTS.stepAxes`. Det är en ändring i banken och simuleringen. Gränssnittet är klart för den.
- **Ska låset och väntan byggas?** Det kräver ett beslut om att skjuta upp avgörandet, se §3.1.
