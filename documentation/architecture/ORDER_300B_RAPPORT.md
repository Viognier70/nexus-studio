# ORDER 300b — Början efter besluten (rapport)

**Underlag:** Anders beslut 2026-10-05 om ORDER 300 (`ORDER_300_RAPPORT.md` §4 och §5, "Att besluta"):
- samtyckestexten får ett andra stycke om forskningen, med knapparna Jag vill delta och Nej tack;
- svaret sparas lokalt, och ingen data skickas någonstans; texten märks i koden som preliminär i väntan på etikprövning;
- regel 1 blir "Klarar du veckans mål blir krogen kvar. Tre bokslut under noll i rad, och den stänger.";
- skripten som startar från bussen görs om efter den nya starten eller tas bort, och inget test får bero på den gamla starten.

Gren `order-300b` från `main` (`9ad033b`). Talen och bilderna pekar på `frontend/reports/order300b/`.

## 1. Samtycket om forskningen

**Kortet Namn och samtycke** (`strategic/business/NameEntryOverlay.tsx`) har nu två stycken:
- Designs text om liggaren, som förut, med Skriv under och Fortsätt utan att skriva under;
- forskningen, med knapparna Jag vill delta och Nej tack (`register-research-yes`, `register-research-no`).

Texten står i `content/nexusStrings.ts` (`introduction.register.researchBody`, `researchYes`, `researchNo`, `researchMenu`), på svenska och engelska:
- **sv:** "Nexus kan spara dina val anonymt för forskning om hur professionell kompetens utvecklas, vid Campus Grythyttan, Örebro universitet. Det är frivilligt, och du kan spela fullt ut utan att delta. Du kan ändra dig när som helst i menyn."
- **en:** "Nexus can save your choices anonymously for research on how professional competence develops, at Campus Grythyttan, Örebro University. It is voluntary, and you can play fully without taking part. You can change your mind at any time in the menu."

**Preliminär:** kommentaren vid texten säger "PRELIMINÄR TEXT, i väntan på etikprövning: får inte användas för att samla in data förrän prövningen är klar". Kortet har samma märkning.

**Svaret** är skilt från underskriften i liggaren:
- det sparas i speltillståndet som `player.research` (`types.ts` `PlayerRegistration`) och följer med sparfilen;
- inget svar räknas som Nej tack (`research: false`); äldre sparfiler saknar fältet, vilket betyder samma sak;
- ingen kod skickar svaret eller något annat någonstans.

**Menyn** har raden Forskningen med Jag vill delta och Nej tack (`ui/TopRightMenu.tsx`, `menu-research`). Raden syns när spelaren har registrerat sig. Valet går genom `SET_RESEARCH_CONSENT` i reducern.

**Kontrollen i spelarens flöde** (`scripts/order300b-check.mjs`, produktionsbygget, 1280 × 720, `check.json`):
- startskärmen → Nytt spel → namnet → Jag vill delta → Skriv under → regelkortet → mentorn → menyn;
- kortets knapp markerad (`cardPressed`), menyn visar Jag vill delta (`menuAfterYes`), byter till Nej tack (`menuAfterNo`) och tillbaka (`menuAfterYesAgain`);
- inga nätverksanrop utanför förhandsvisningens egen server under hela körningen (`externalRequests` tom);
- bilder: `check-samtycket.jpg`, `check-regelkortet.jpg`, `check-menyn.jpg`.

**Layouten:** `scripts/order300-layout.mjs` mäter nu också forskningens två knappar på registreringen. Alla tolv skärmar i alla fem storlekar är godkända, 60 av 60 (`layout/layout.json`). Bilder av registreringen, regelkortet och regelsidan står i `layout/`. I 1280 × 720 fyller kortet nästan hela höjden.

## 2. Regel 1

`rules.rule1` säger nu "Klarar du veckans mål blir krogen kvar. Tre bokslut under noll i rad, och den stänger." och på engelska "Meet the week's target and the restaurant stays. Three accounts below zero in a row, and it closes." Talet kommer som förut ur `RISK.closeAfterWeeksBelowZero` genom ordlistan. Avvikelsen i `ORDER_300_RAPPORT.md` §5 är därmed löst: texten säger "i rad", som spelet räknar.

## 3. Skripten från bussen

Fyra skript började med bussen (`.bus-stage`, samtalet och registreringsbordet i VS001). Alla fyra är omgjorda, inget är borttaget:
- `order267-week-from-bus.mjs` (veckan från start);
- `order270-evening-from-bus.mjs` (kvällen från start);
- `order271-dod-from-start.mjs` (DoD i spelarens vy);
- `order271-winebar-figures.mjs` (figurerna i vinbaren).

De går nu startskärmen → Nytt spel → namn och samtycke (Nej tack, Skriv under) → regelkortet → mentorn, samma väg som `order301-check.mjs`. Resten av varje skript är oförändrat. Hjälpfunktionen som gick i världen (`walkUntilPrompt`) är borttagen. Filnamnen står kvar, eftersom rapporterna hänvisar till dem.

Skripten är syntaxkontrollerade (`node --check`) men inte körda hela vägen i den här ordern; de spelar en vecka eller en kväll och tar lång tid. Starten de använder är den som `order300b-check.mjs` och `order300-layout.mjs` kör.

**Inget test beror på den gamla starten.** Sökningen efter `.bus-stage`, `BusStage`, `stages/` och `.end-buttons` i testerna gav inget. Testet `order300bBorjan.test.ts` fäller om något skript under `frontend/scripts/` åter använder bussens väljare. `App.tsx` och `stages/` ligger kvar för förstapersonsprototypen (`#/first-person-prototype`), som förut.

## 4. Tester och bygge

- **Nytt test:** `sim/__tests__/order300bBorjan.test.ts`, med 5 tester:
  - samtyckets andra stycke på båda språken, knapparna och märkningen som preliminär;
  - svaret i speltillståndet, skilt från underskriften, och ändringen i menyn;
  - inga nätverksanrop i kortet, menyn, introduktionen och reducern;
  - regel 1 ordagrant;
  - inget skript börjar med bussen.
- **Typecheck och bygge** är gröna.
- **Hela sviten:** 2 349 gröna, 16 överhoppade och 2 som tog för lång tid under körningen. Datorn var hårt belastad av en parallell harness (belastning omkring 29 på 12 kärnor). `smoke.test.ts` gick igenom när det kördes ensamt. `order131LoadSweep.test.ts` (200 frön, gräns 5 minuter) nådde gränsen också ensamt under samma belastning; ordern ändrar inget i simuleringen som svepet mäter.

## 5. Öppet

- Texten om forskningen är preliminär tills etikprövningen är klar. Ingen insamling är byggd.
- Spelarens namn används fortfarande inte någonstans i spelet (ORDER 300 §4, punkt 3).
