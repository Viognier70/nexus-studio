# ORDER 329 — fikat vid vagnen (rapport)

*Anders 2026-10-11. Gren `order-329` från main `853dc23f`.*

## A. Sju nya dilemman vid vagnen
**Filen:** `FIKA_VAGNEN_329.md` ligger oförändrad i `documentation/blueprints/`.

**De sju** ligger i `content/fika/dilemmas.ts` och `content/fikaStrings.ts`, i samma form som vagnens fem:
- Nils frågar (`asker: 'assistant'`, `places: TRUCK`);
- A är väl grundat, B svagt grundat och C delvis grundat.

| Dilemma | Utlöses av | ⚖ (`legalReviewed: false`) | Ekonomi |
|---|---|---|---|
| fika-vagn-allergin | ft05-allergin | EU 1169/2011 | A: `suggestAbility` 'allergen' |
| fika-vagn-regnet | ft08-regnet | — | — |
| fika-vagn-ursprunget | ft07-ursprunget | — | — |
| fika-vagn-getingen | ft09-getingen | SFS 1977:1160 | — |
| fika-vagn-hunden | ft12-hunden | — | — |
| fika-vagn-nyanstalld | teamChanged | — | A: `extraHandSek` |
| fika-vagn-handskarna | prepBacklog, ft03-rullen | EG 852/2004 | — |

- **Antalet:** vagnen har nu 12 dilemman, lika många som vinbaren.
- **Lagtexten** för de tre ⚖ finns i `legalNote` men visas inte förrän den är granskad.
- **Svenskan** är filens. Testet jämför varje fråga, svar, förklaring och lagtext med filen.
- **Engelskan** är min, på brittisk engelska. Ett val att granska: "Den nya" blev "The new starter".

**Testerna:** `src/sim/__tests__/order329Fikat.test.tsx`. `order323Fikat.test.ts` räknar nu 12 i vagnen.

## B. Vanligt fika
- **Simuleringen** (`sim/fika.ts` `planFika`): passar inget dilemma kvällen sitter laget ändå en stund.
  - Hela laget får `FIKA.plainWellbeing` = 1 poäng i trivsel, alltså +0,03 (`wellbeingPerPoint`).
  - Kvällen sparas i `fika.plain`.
  - Ingen fråga och ingen ekonomi.
- **Platserna:** det gäller vagnen och vinbaren (och bistron, samma klass).
- **Kvällens fikasteg** (`FikaScreen.tsx` `PlainFikaScreen`, `EveningBar.tsx`) visar en rad och "Laget trivs bättre":
  - vagnen: "Nils och du tar en kopp efter stängning." / "You and Nils have a cup of coffee after closing.";
  - vinbaren: "Laget tar en kopp efter stängning." / "The team have a cup of coffee after closing."

  Raden för vinbaren är min, eftersom Nils inte är med där.
- **Ingen bild vid bordet:** det vanliga fikat har ingen scen. Laget vid bordet i vinbaren (`FikaAtTable.tsx`) kräver ett dilemma, eftersom den som frågar räcker upp handen. Säg till om laget ska sitta vid bordet också då.
- **Undantag:** den kväll Åsas erbjudande kommer blir det inget fika alls, som förut.

## C. Mätningen före och efter
- **Före:** main `853dc23f`.
- **Efter:** `a6155c4e` på grenen, med A och B.
- **Körningar:** båda i tillfälliga worktrees.
- **Fikat:** `src/strategic/testHarness/__tests__/order329FikaVagnen.test.ts`, samma mätning som i 328.
- **Spelartyperna:** `scripts/order327-harness.sh`, med 17 rader och 40 frön.
- **Resultat:** `reports/order329/fore/`, `reports/order329/efter/` och `reports/order329/jamforelse.json` (`scripts/order329-jamforelse.mjs`).

### Fikat per 21 dagar i vagnen
Fältet är `fika.json` i respektive mapp. Mätningen gäller den rimliga spelaren med 40 frön.

| | Dilemman | Vanligt fika | Trivsel dag 21 | Ryktet dag 21 |
|---|---|---|---|---|
| Före 323 §5 (`reports/order328/fika.json`, utan filtret) | 14,57 | — | 0,952 | 0,560 |
| Före (main) | 7,72 (7–8) | 0 | 0,918 | 0,570 |
| Efter | 12,90 (11–14) | 4,25 | 0,953 | 0,551 |

Efter ändringen fikar laget 17,2 av 21 kvällar, och trivseln är tillbaka där den var före §5.

### Spelartyperna, före → efter
Kolumnerna är `reachedVinbar`, `reachedBistro`, `starEarned`, `closed` och `meanCashEnd`.

| Rad | Vinbaren | Bistron | Stjärna | Stängda | Kassan vid slutet (kr) |
|---|---|---|---|---|---|
| koncept-enkel-0.6 | 3 → **5** | 2 → 3 | 1 → 3 | 0 → 0 | 155 584 → 151 394 |
| stjarna-0.6 | 3 → **5** | 1 → 1 | 1 → 1 | 0 → 0 | 155 770 → 150 893 |
| koncept-soigne-0.6 | 3 → **5** | 0 → 2 | 0 → 2 | 3 → 1 | 140 398 → 149 841 |
| stjarna-0.75 | 35 → 39 | 25 → 25 | 18 → 16 | 0 → 0 | 104 360 → 101 460 |
| stjarna-0.85 | 40 → 40 | 38 → 39 | 35 → 36 | 0 → 0 | 103 815 → 101 122 |
| koncept-bistro-0.85 | 40 → 40 | 38 → 39 | 35 → 36 | 0 → 0 | 103 815 → 101 122 |
| koncept-enkel-0.85 | 40 → 40 | 40 → 40 | 38 → 39 | 0 → 0 | 66 375 → 68 574 |
| koncept-soigne-0.85 | 40 → 40 | 40 → 40 | 39 → 39 | 0 → 0 | 298 371 → 299 788 |
| trappa-forsiktig | 40 → 40 | 38 → 36 | 22 → 25 | 0 → 0 | 92 700 → 95 079 |
| trappa-mentorn | 40 → 40 | 39 → 36 | 0 → 0 | 0 → 0 | 37 690 → 40 448 |
| trappa-klok | 40 → 40 | 40 → 40 | 0 → 0 | 0 → 0 | 59 002 → 60 201 |
| trappa-rimlig | 40 → 40 | 0 → 0 | 0 → 0 | 0 → 0 | 29 249 → 30 352 |

De fem raderna som aldrig når vinbaren (halva, halvbra, ignorerar, ignorerarUtbildad, slarvig) har 0 både före och efter.

**Målet är nått till hälften.**
- **0,6-raderna:** de når vinbaren 5 gånger av 40, inte 7 som före 323 §5 (`reports/order328/b323s4`).
- **De starka raderna drar inte ifrån:**
  - 0,85-raderna ändras med högst en säsong i bistron och stjärnan;
  - trappa-forsiktig får 22 → 25 stjärnor men når bistron 38 → 36;
  - trappa-mentorn når bistron 39 → 36.

**Försöket med större trivsel:** jag körde 0,6-raderna med `plainWellbeing` = 2 i en tillfällig worktree. Det är inte ändrat i spelet (`reports/order329/x-plain2/`).

| Rad | Vinbaren | Bistron | Stjärna | Stängda |
|---|---|---|---|---|
| koncept-enkel-0.6 | 6 | 4 | 3 | 0 |
| stjarna-0.6 | 6 | 0 | 0 | 0 |
| koncept-soigne-0.6 | 6 | 3 | 2 | 1 |

**Att avgöra:** ska `FIKA.plainWellbeing` vara 1 som ordern säger, eller 2? Med 2 når 0,6-raderna vinbaren 6 gånger.
- De starka raderna med 2 har jag inte kört.
- Ordern anger 1, så spelet har 1.

## D. Testsviten ensam
Hela testsviten kördes ensam, utan säsongskörningar samtidigt: 225 filer och 2793 tester gröna, 15 filer och 20 tester överhoppade, 1 väntat fel, 0 röda, på 410,0 s. Typecheck och bygget är gröna.
