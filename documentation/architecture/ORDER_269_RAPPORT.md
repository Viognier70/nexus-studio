# ORDER 269 — Kunskapen in i servicen (rapport)

**Ordern** Vision Owner 2026-09-26, före etapp 6:
- Flytta först kollapsens och vädrets konstanter till `balance.ts`.
- Låt sedan medaljerna verka: Metodköket sänker köksmisstag och kollapsrisk, Stensöta höjer intäkt per gäst via dryck, Kalastorget gör att klagande gäster oftare stannar, och huvudpaviljongen styr personalens tempo.
- Fyll på krediterna enligt speldesignen (F15, F27).
- Sänk inte marknadens gästpool.
- Låt scenariernas utfall bero på kunskap: med medaljer i Kalastorget ger det bästa svaret mer.

**DoD:** slumpmålet mellan 70 och 80 %, där A och B bara skiljer sig i medaljer. Slumpmålet mäts med scenarierna inräknade.
**Gren** `order-269` från main `0023779` (efter ORDER 268).

## 1. Vad som byggdes

**Konstanterna** står nu i `balance.ts`, med oförändrade värden:
- `COLLAPSE`, med golv, förstärkning och ryktets fall. `collapse.ts` läser dem.
- `WEATHER`, med band, vikter, uteplatsens gränser och ankomstfaktorer. `weather.ts` läser dem.
- Hela sviten var grön efter flytten, före nästa steg.

**Medaljerna i servicen.** Talen står i `balance.ts` `KNOWLEDGE_IN_SERVICE`, och faktorerna räknas i `src/sim/knowledgeInService.ts`. Varje effekt gäller per medaljsteg:

| Paviljong | Verkan per steg | Var den läses |
| --- | --- | --- |
| Metodköket | köksmissar −10 % | `eventStream.ts` `eventProbabilityPerTick` (kitchen_slip) |
| Metodköket | kollapsrisk −10 % | `collapse.ts` `collapseProbabilityPerTick` |
| Stensöta | intäkt per betalande gäst +10 %, via dryck | `reducer.ts`, betalningen |
| Kalastorget | gästen i kön tål 10 s längre och ger upp först vid 0,03 lägre nöjdhet | `service.ts`, kön |
| Kalastorget | scenariots bästa svar ger +25 % kassa | `reducer.ts` `resolveScenario` |
| Huvudpaviljongen (vinbar: Stensöta; ölkrog: Metodköket; food truck: bästa) | uppgifternas tid −5 % | `economics.ts` `taskDurationTicks` via `service.ts` |

- **Krediterna** fyller rummets `enablers` (ryktets tak och kvalitetens takt) i samma register, 0,02 per kredit och högst 1. De sänks aldrig. Det sker vid varje dygnsskifte (`enablersWithCredits`).
- **Det bästa svaret** är valet som lyfter kvällens tema mest (`scenarios.ts` `rankedScenarioChoice`). Samma rangordning används av harnessens rimliga spelare och av playwright-skripten.
- **Marknadens gästpool** är orörd (`MARKET.basePoolPerDay` 134).
- **Speldesignen** (Servicen) har beslutet daterat 2026-09-26.

**Mätningen:**
- `testHarness/randomness.ts` skriver veckans sämsta och bästa kväll.
- `order267Randomness.test.ts` skriver andelen veckor med en kväll utan intäkt (`weeksWithEmptyEvening`).
- `order267-week-from-bus.mjs` skriver under en senare orders katalog med `REPORT_ORDER`.

## 2. Hur det verifierades i spelarens vy

Ordern ändrar inga paneler. Den ändrar hur kvällarna går: intäkten, kön och scenariernas kassa. **Kontrollen:** etapp 5:s vecka från bussen, körd igen i produktionsbygget från `/` utan flaggor (`REPORT_ORDER=order269 node scripts/order267-week-from-bus.mjs`). **Utdata:** `frontend/reports/order269/week-from-bus.json` och skärmdumparna `w01`–`w13`.

**Resultat:** hela veckan gick igenom utan fel (`errors` tomt). Utdrag ur `week-from-bus.json`:
- `days[].evening`, måndag–fredag: "Ingen gav upp i kön". Lördagen föll ihop: "Kvällen slutade innan den skulle."
- `intervention`: fredagens insats för en gäst på väg att gå gav "Gästen stannade kvar i stället för att gå".
- `newspaper`: söndagstidningen kom ("Veckan gav mer än golvet").

**Avvikelse:** etapp 5:s skript svarar på scenarierna med den första knappen, inte som harnessens rimliga spelare. Verkan på slumpmålet är mätt i harnessen, inte i webbläsaren.

## 3. Veckoharnessens tal

**Slumpmålet** (`frontend/reports/order269/randomness.json`, 1 000 veckor, scenarierna inräknade, båda spelarna rimliga):
- `winShare` 0,735 (`betterWins` 735, `ties` 0). Målet 70–80 % är nått.
- Veckans genomsnittliga resultat (`meanResultSek`): 44 589 SEK mot 36 448 SEK.
- A och B skiljer sig bara i medaljer (`PLAYERS`): A har silver i Stensöta och brons i Måltidsbiblioteket utöver B:s brons i tre. Frön som förut (2i och 2i + 1).
- **En kväll kan fortfarande gå riktigt illa:** `weeksWithEmptyEvening.better` 0,206, alltså A hade en kväll utan intäkt i drygt var femte vecka (B 0,193).
- Före ordern (`reports/order268/randomness.json`, samma definition, scenarierna inräknade): 0,548.

**Veckoharnessen** (`frontend/reports/order269/week-harness.json`, fältet `settlements`):
- Nedgraderingsscenariot håller: vinbar → food truck vecka 1, tillbaka till vinbaren söndag vecka 2, och vinbaren håller säsongen ut.
- Scenariernas kassa ligger fortfarande inom ±20 % (`order268WayBack.test.ts`, med Kalastorgets bonus).

**Svit:** typecheck och build är gröna. Vitest: 2 037 godkända, 4 överhoppade (mätningar och rapportskrivning), inga förväntade fel.

## 4. Avvikelser från speldesignen och varför

- **Kalastorget och Metodköket verkar inte i slumpmålet.** A och B har samma brons där (F35). Målet nås med Stensöta (drycken och tempot, eftersom Stensöta är vinbarens huvudpaviljong) och med marknadens tak. Kalibreringen ändrade bara Stensöta, från 8 till 10 % per steg.
- **"Lättare att känna igen"** är inte byggt; bara "ger mer". Spelaren ser samma tre knappar oavsett medaljer.
- **Krediterna verkar inte i slumpmålet.** A och B har inga krediter.
- **Tempot per steg** gäller huvudpaviljongen. Med guld i Stensöta går vinbarens personal 15 % fortare, och golvet är 70 %.

## 5. Öppna frågor

- F42 (talen per steg och krediterna), i `NEXUS_V1_OPPNA_FRAGOR.md`.
- Ska slumpmålets A också skilja sig i Metodköket eller Kalastorget, så att alla paviljongers verkan prövas? Dagens definition (F35) låter Stensöta bära skillnaden.
