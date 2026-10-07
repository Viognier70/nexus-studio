# ORDER 314 — Allt sker i situationer (rapport)

**Underlag:** `~/Downloads/ORDRAR_314-316_D7.md`, ORDER 314 (beslut A, Anders 2026-10-06). Principen i konstitutionen: simuleringen skapar problemen, och kunskapen löser dem.

**Gren:** `order-314` från `main` (`3bfedbfb`).

Varje tal pekar på en fil under `frontend/reports/order314/`.

## 1. Inga frivilliga raketer

- **Borttaget:**
  - "Stå för ditt svar": knappen `back-start`, åtgärden `START_BACK` och `whyNotBack`, `canStartBack` och `startBack` i `sim/incidents.ts`;
  - knappens montering i `StrategicApp` (`EventsPanel mode="back"`);
  - harnessens `backs`.
- Raketer som spelaren väljer i förväg fanns inte. Ordet `planned` i loggen betyder "rummet utlöste den".
- **Följder:**
  - Låset på "Stå för ditt svar" från 313 är borta med knappen. Satsningarna och butiken är fortfarande låsta tills första provet.
  - Raden om krediterna i kvällens resultat säger nu "Rätta svar i kvällens situationer".
  - Testet `order280BackYourKnowledge.test.ts` är borttaget. Fyra tester som startade en egen raket för att pröva något annat väntar nu på en situation ur rummet: `order284`, `order289`, `order310b` och `order313`.
- **Kvar i koden:** strängarna `back.*` och kontrollerna av `active.backed` i gränssnittet. De gäller bara sparfiler från före ordern och kan tas bort i en städorder.

## 2. Kvitt eller dubbelt

Det fanns redan i varje situation (ORDER 305b: potten, låset, väntan, att stanna eller gå vidare). Det gällde inte bara egna raketer, och inget är ändrat. Testet `order314Situationerna` §2 prövar valet i en situation ur rummet.

## 3. Personalen tar över

När tiden går ut utan svar (`resolveIncident`, `staffHandles`) klarar personalen situationen:
- med sannolikheten `SITUATIONS.staffSuccessUntrained` 0,4 när ingen i laget har situationens kunskapsområde (`staffKnows`, `incidentArea`: vin, mat, service ur ORDER 303);
- med `staffSuccessTrained` 0,65 när någon har det.

**Klarar de det:**
- följden blir `staffSuccessShare` 0,5 av det bästa utfallet;
- inga krediter (spelaren tappar en kredit, som förut när personalen beslutade själv), ingen pott och inga gäster som ett rätt svar släpper in;
- loggen får `staffCleared`, och det räknas inte som klarat i stjärnans räkning.

**Klarar de det inte:** som förut, stegets fel och personalens utfall.

Följden är alltså alltid sämre än en kunnig spelares. Testet `order314Situationerna` §3 prövar sannolikheterna och att krediterna är färre.

## 4. Takten

- **4–6 situationer per kväll** (`SITUATIONS.minPerEvening`, `maxPerEvening`). Kvällens antal dras när servicen börjar (`planIncidents`, `plannedCount`).
  - De första fyra kommer senast på jämnt fördelade tider i kvällens fönster.
  - Resten, upp till kvällens antal, mognar ur rummets tryck som förut.
  - En köad följd av ett tidigare fel kommer på sin tid, 40 simsekunder efter felet (`chainDelaySimSeconds`), och får komma upp till 6.
  - Följdens tid lagrades förut men lästes aldrig, så följden kom bara när slumpen träffade.
- **Aldrig två samtidigt:** som förut.
- **Minst 8 spelminuter mellan dem:** `minGapGameMinutes`, alltså 16 simsekunder från att förra situationen avgjordes. Förut var det 25 simsekunder.
- **1× under situationen:** `consequence.ts effectiveSpeed`. Spelet pausar inte. Kortets klockor räknas i verklig tid med samma hastighet (`countDown`).
- **Mätt i vinbaren** när spelaren svarar bäst, tio frön per dag (`takten.json`): i snitt 4,1 per kväll, från 2 till 6. Före ordern var det 2,5 (`takten-fore-main.json`, samma kvällar på `main`).
- **Avvikelse:** frö 8 får bara 2 situationer på fredag och lördag. Köket tar slut och kvällen stänger vid ungefär 43 % av fönstret, så de senare tiderna hinns inte med.

## 5. Kalibreringen

Med fler situationer gav varje situations följder för mycket åt båda hållen:
- enkel med 0,6 rätt stängde alla säsonger;
- soigné med 0,85 slutade på 226 759 kr (första körningen).

Vad som rättades:
- **`SITUATIONS.effectShare` 0,45.** Situationens andel av sina följder: kassan (utfallen, bordets merbeställning och mindre nota, avec, dricksen), stämningen och nöjdheten, ryktet, orken, ordet på gatan och gästerna som ett rätt svar släpper in.
  - Krediterna (potten 1 → 3 → 7) skalas inte. En skala på dem ändrade kassan mindre än 3 %.
  - Gästerna som går skalas inte heller.
- **Konceptens personal** (`CONCEPT.wageFactor`): bistro 0,96 → 1,04, soigné 1,4 → 2,1.
- **Stämningen nedåt i enkel** (`CONCEPT.moodDownFactor`): 0,4 → 0,15.
- **Kötaket gäller också gästerna som en situation släpper in** (`reducer.ts`, scenariots gäster). Med fler situationer stod annars nio sällskap i kön mot taket sju (`order296bBalans`).

Försöken står i `kalib/`:
- `main/`: samma spelare på `main`;
- `x/n-*`: med kalibreringen;
- `x/m*`, `x/w66`: enkel.

## 6. Tabellen, 40 säsonger

Talen står i `efter40/`, och skriptet är `scripts/order314-harness.sh`. Kvällarna (förlust och 1:a) står i `efter/kvallar-*.json`, med fyra frön och tre veckor.

| Spelaren | Före (311b) | Efter | Mål |
|---|---|---|---|
| Enkel 0,85 | 0 av 40, 56 048 kr | 0 av 40, **56 546 kr** | stänger aldrig, 40 000–60 000 kr: **uppfyllt** |
| Enkel 0,6 | 15 av 40, 2 114 kr | **17 av 40 (43 %)**, 820 kr | 30–55 %: **uppfyllt** |
| Bistro 0,85 | 0 av 40, 98 760 kr | 0 av 40, **91 866 kr** | 90 000–100 000 kr: **uppfyllt** |
| Soigné 0,85 | 3 av 40, 124 402 kr | 1 av 40, **119 243 kr** | 110 000–130 000 kr och minst 10 % över den kloka (69 318 kr): **uppfyllt** |
| Soigné 0,6 | 40 av 40 | 40 av 40, −78 260 kr | stänger alltid: **uppfyllt** |
| Halva | 32 av 40 (80 %) | **19 av 40 (48 %)**, −1 155 kr | högst 65 % (80 % godtogs): **uppfyllt** |
| Alltid fel | 40 av 40 | 40 av 40, −52 118 kr | — |
| Den slarviga | 40 av 40 | 40 av 40, −70 488 kr | stänger alltid: **uppfyllt** |
| **Ignorerar** | — | **40 av 40**, −44 374 kr | stänger minst 80 %: **uppfyllt** |
| **Ignorerar, utbildad personal** | — | **27 av 40**, −5 795 kr, stjärna 0 | kan överleva med låg marginal, aldrig stjärnan: **uppfyllt** (överlever 13 av 40) |
| Den kloka | 0 av 40, 109 268 kr | 0 av 40, 69 318 kr | — |
| Mentorn | 0 av 40, 105 191 kr | 0 av 40, 51 648 kr | — |
| Den förnuftiga | 0 av 40, 87 568 kr | 0 av 40, 39 426 kr | — |

| Övriga | Före | Efter | Mål |
|---|---|---|---|
| Stjärnan 0,85 / 0,75 / 0,6 | 78 % / 35 % / 0 % | **98 % / 50 % / 0 %** | 0,6 aldrig: **uppfyllt** |
| Alltid fel 1:a i byn | vecka 1: 9 av 24; vecka 2–3: 0 | **0 av 72** | **uppfyllt** |
| Ignorerar, kvällar med förlust | — | **38 av 72 (53 %)**: vecka 1 10 av 24, vecka 2 12 av 24, vecka 3 16 av 24 | de flesta kvällar: **uppfyllt**, men inte vecka 1 |

Den utbildade lär sig vin, mat och service med morgonens satsningar `wine-tasting`, `guest-chef` och `train-service`.

## 7. Frågor

1. **Den kloka, mentorn och den förnuftiga tjänar omkring hälften så mycket som förut** (69 318, 51 648 och 39 426 kr).
   - De svarar bäst men gör inga prov mot stjärnan.
   - Skalan på situationens följder tar mest från den som vinner flest situationer.
   - Bistro med 0,85, som gör proven och får stjärnan i 98 % av säsongerna, tjänar nu mer än den kloka.
   - Ska den kloka ha ett mål?
2. **Stjärnan blir vanligare** (0,85: 98 %, 0,75: 50 %). Fler situationer ger fler raketer i veckan mot kravet på fem (`STAR.minRocketsInWeek`). Ska kravet höjas med takten?
3. **Provsmakningen (ORDER 298b)** gav fler sittande sällskap mest genom fler raketer i ett fullare rum.
   - Med takten, där de fyra första situationerna kommer oavsett trycket, blir skillnaden vid rykte 0,2 nästan noll: 340 mot 338 sällskap över 16 frön (`provsmakningen-16.json`).
   - Testet är märkt som känd avvikelse (`order298bGolvet`, `it.fails`).
   - Ska provsmakningen ge gäster på annat sätt?
4. **Scenariots gäster vid dörren går nu också genom kötaket** (§5). Förut kom de alltid in.
5. **Ordet i spelet:** kortet heter fortfarande "Raket n i kväll". Ska det heta "Situation"?

## 8. Körningar och spelarens flöde

- `npm run typecheck`: grönt. `npm run build`: grönt.
- `npx vitest run`: 182 filer gröna, 12 hoppade; 2 494 tester gröna, 2 förväntade fel, 17 överhoppade. De förväntade felen är vinbarens kameraprov (312b) och provsmakningen (§7.3).
- Nytt test: `src/sim/__tests__/order314Situationerna.test.ts`. Mätningen av takten körs med `ORDER314_TAKT_OUT`.
- **Spelarens flöde i produktionsbygget:** sparfilen, baspaketet, dörrarna öppnas och gatans nivå (`scripts/order312-on-road.mjs` med `OUT_DIR=reports/order314`). Bilden `efter-01-kvallen.png` visar kvällen utan rutan "Stå för ditt svar" nere till höger.
- **Rättat från 313:** panelen "Byn just nu" visade alla sju krogarna och täckte en stor del av byn. Den visar nu de tre främsta och spelarens krog (`VillageNowPanel.tsx`).
