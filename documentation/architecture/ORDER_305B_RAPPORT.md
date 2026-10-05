# ORDER 305b — Kvitt eller dubbelt i spelet (rapport)

**Underlag:** Anders 2026-10-05, beslut om ORDER 305:
- Förslag B slås på.
- Potten håller bara krediter.
- Den som stannar får ingen följd, och personalen tar inte över resten av händelsen.
- En raket där spelaren stannar efter steg 2 räknas som klarad i stjärnans andel. Efter steg 1 räknas den inte.
- Kvitt eller dubbelt ersätter säkerheten (Gissar / Tror det / Vet det) i både Stå för ditt svar och de planerade raketerna. Valet att gå vidare är säkerheten.
- Portfolion registrerar valet: gick vidare och hade rätt, gick vidare och hade fel, stannade med rätt.
- Valet har 8 sekunder, och spelaren stannar när tiden går ut.

Gren `order-305b` från `main` (`3e8de1f`). Grenen har också Designs D2 (öppningen), uppackad oförändrad i `documentation/leveranser/nexus-leverans-2026-10-03-oppningen/`.

## 1. Reglerna i spelet

`balance.ts` `DOUBLE_OR_NOTHING`:
- `enabled: true`;
- `potHoldsCash: false`;
- `stopTakesStaffOutcome: false`;
- `choiceSeconds: 8`;
- `growth: 2`;
- `stopCountsAsClearedFrom: 2`.

**Efter ett rätt steg** som inte är det sista går stegets kredit i potten, och spelaren väljer (`INCIDENT_STOP` eller `INCIDENT_GO`). Stegets klocka står medan spelaren väljer, och när valets tid går ut stannar spelaren (`sim/incidents.ts` `countDown`, `reducer.ts` TICK).

**Stanna:** potten bokförs per kunskapsform. Händelsen slutar där. Texten är "Du stannar och tar potten …", och ingen ur personalen tar över. Loggen får kvaliteten `stopped` och `pot.taken`.

**Gå vidare:**
- Rätt ger potten × 2 plus stegets kredit. Hela vägen blir 7 krediter.
- Fel tar potten (`pot.taken: false`), och stegets följd gäller som förut.

**Säkerheten är borttagen:**
- `BACK.confidence`, `stepMultiplier`, `defaultConfidence`, `lockSeconds` och träffsäkerheten;
- det låsta svaret (`PICK_BACK_ANSWER`, `picked`, `lockLeft`);
- `confidence` i `ANSWER_INCIDENT`;
- strängarna som bara de använde.

`BACK.maxPerEvening` (tre egna raketer per kväll) står kvar. Den egna raketen har kvitt eller dubbelt som de planerade.

**Stjärnan** (`sim/economy.ts` `rocketTally`): en raket där spelaren stannade efter minst två steg räknas som klarad.

**Portfolion** (`SimulationState.kvittLog`): varje val med dag, raket, steg och `goRight`, `goWrong` eller `stopRight`. Kvällens räkning står i `incidents.kvittTonight`.

## 2. Det spelaren ser

- **Raketkortet** visar efter svaret potten ("Potten: 3 krediter", med "kredit" i singular) och två knappar, "Stanna och ta potten" och "Kvitt eller dubbelt: nästa steg", med valets nedräkning. Svarsalternativen visas inte medan valet står öppet.
- **Bandet** efter raketen säger "+7 krediter ur potten" eller "potten förlorad (3 krediter)". Den som stannade får bandet "Du stannade".
- **Pyramiden** visar potten och stegens dubbling (×1, ×2, ×4) i stället för säkerheten. Pyramidens ögonblick har raden "Potten × steg → kvällens utfall".
- **Stå för ditt svar:** introduktionen beskriver kvitt eller dubbelt.
- **Formen** är tillfällig tills Designs tillägg till D5 kommer.

**Kontrollen i spelarens flöde** (`scripts/order305b-check.mjs`, produktionsbygget, 1440 × 900, `reports/order305b/check.json`):
- valet syns efter ett rätt steg, svarsalternativen är borta och nedräkningen står på 8;
- ingen säkerhet visas;
- knappen Stanna tar potten.
- Bilder: `check-kvitt-valet.png` och `check-kvitt-stannade.png`.
- Kontrollen hittade två fel, som är rättade:
  - bandet efter Stanna sa "Tiden gick ut · servitören tar över";
  - knapparna radbröts ord för ord.

## 3. Harness

Tabellen med kvitt eller dubbelt påslaget står i `ORDER_303C_RAPPORT.md`. Harnessens spelare går alltid vidare (`KVITT_STOP_AFTER`, förvalt 0), som i ORDER 305:s körning B.

## 4. Tester och bygge

- **`order305Kvitt.test.ts`** (7 tester): valet, stanna, gå vidare och fel, hela vägen, tiden ute och stjärnans räkning.
- **`order280BackYourKnowledge.test.ts`**, omskriven (7 tester): kvitt eller dubbelt i den egna raketen och portfolions tre val.
- **Ändrade tester** som förutsatte att nästa steg öppnas direkt efter ett rätt svar, eller att säkerheten fanns:
  - `order270Incidents`, `order276GuestFlow`, `order279QuestionsAndStake`, `order284FixesAndUsability`, `order289RocketAndFixes`;
  - `order291Playtest`, `order292Consequences`, `order296Host`, `order296bPins`.
