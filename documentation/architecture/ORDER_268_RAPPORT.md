# ORDER 268 — Vägen tillbaka efter nedgradering (rapport)

**Ordern** Vision Owner 2026-09-26, vid SPELSTOPP 1: rätta vägen tillbaka efter nedgradering, enligt punkt 1 i `NEXUS_V1_OPPNA_FRAGOR.md`. Speldesignens princip 3 gäller: "Det finns alltid en väg tillbaka." Samma regler som `ORDER_NEXUS_V1_HELA_SPELET.md`.
**DoD (Vision Owner 2026-09-26):** harnessen visar vinbar → food truck → vinbar genom att spelaren arbetar sig tillbaka, inom säsongens åtta veckor, i spelarens vy.
**Gren** `order-268` från main `c53197d`.

**Vision Owners beslut 2026-09-26, i två omgångar.** Båda står daterade i speldesignen och i `balance.ts`.

Första omgången, om vägen tillbaka:
- Golvet är kreditram.
- Lön dras bara på servicedagar.
- Lokalen säljs för 50 % av inventarievärdet.
- Kontantinsatsen vid uppgradering är 25 % av en veckas golv.
- Efter inget lån krävs en hel vecka i Måltidens hus med minst ett prov.

Andra omgången, efter att verifieringen visat att harnessen inte svarade på scenarierna:
- Harnessen svarar som spelaren.
- Scenarierna ger högst cirka 20 % av en normal veckointäkt, åt båda hållen.
- Harnessen har två spelare: en rimlig och en svag.

## 1. Vad som byggdes

**Vägen tillbaka** (Ekonomin > Lånet, > Nedgradering; Verksamhetsklasserna > Uppgradering):
- **Golvet som kreditram.** Nedgraderingen räknar kassan vid dagsavslut plus en veckas golv (`economy.ts` `dayEndHeadroom`, `DOWNGRADE.creditLineInWeeksOfFloor`). Varningarna i kvällsberättelsen säger "under det banken lånar ut mot".
- **Lön bara på servicedagar**, vid dygnsskiftet efter kvällens intäkt; söndag ingen lön (`dailyWagesSek`, `WAGES`).
- **Försäljningen vid tvingad nedgradering.** 50 % av inventarievärdet blir startkassa. Inventarievärdet är hälften av startlånet (F40). Ett underskott skrivs av med lokalen, och en rad står i kassaboken (`saleProceedsSek`).
- **Kontantinsatsen.** Byte uppåt från en verksamhet drar 25 % av en veckas golv i den nya klassen (`upgradeDepositSek`).
- **Efter inget lån.** Banken lånar ut igen efter sju dagar med minst ett avslutat prov, och då utan insats (`bankReadyAfterNoBusiness`, `NEW_START`, `EconomyState.withoutBusiness`). Banken säger det i ord.
- **Personalen följer klassen (F37).** Food trucken har en kock och en lärling. Utan verksamhet finns ingen personal och inga kostnader (`TEAM_BY_CLASS`, `teamForClass`, `costPerMinuteToTick`).
- **Inspektionen gäller bara klasser med mise en place (F39).** Food trucken fick förut en inspektion med avgift (2 000 SEK, −5 rykte) varje morgon (`serviceEvents.ts`).

**Scenarierna och harnessen (F41):**
- **Scenariernas belopp** ligger i `balance.ts` `SCENARIO_CASH` som andelar av klassens normala veckointäkt. En enhet är 2 %.
  - Kvällens ekonomiska tema ger en enhet gånger valets tecken.
  - Valens egna belopp står i enheter: gästerna vid dörren A ½, fisken A ⅓.
  - Veckans summa hålls inom ±20 % (`clampScenarioCash`, `EconomyState.weekScenarioCashSek`).
  - `SCENARIO_CASH_DELTA_SEK` (6 000) och valens fasta kronbelopp är borttagna.
- **Harnessen svarar på scenarierna** (`weekHarness.ts` `answerScenario`).
  - Den rimliga spelaren väljer valet som lyfter kvällens tema mest (`capitalSign` i `scenarios.ts`, samma tal som simuleringen läser) och svarar rätt på frågan.
  - Den svaga väljer det lägsta, svarar fel och har en meny med två rätter och råvaror till ungefär fyra kuvert om dagen (`scenarios.ts` `weakMorning`).

**Sparfilen.** Två nya fält, `withoutBusiness` och `weekScenarioCashSek`, är valfria. En fil utan dem laddas som förut, och formatversionen är oförändrad.

**Tester:**
- `order265WeekHarness` är grönt; det var förut `it.fails`.
- Nytt: `order268WayBack.test.ts`.
- `order267Randomness.test.ts` skriver under en senare orders katalog med `REPORT_ORDER`.

## 2. Hur det verifierades i spelarens vy

**Skriptet:** `frontend/scripts/order268-way-back.mjs`, produktionsbygget (`vite build` + `preview`), start på `/` utan flaggor. **Utdata:** `frontend/reports/order268/way-back.json` och skärmdumparna `b01`–`b12`.

**Avvikelse (CLAUDE.md, flöde som spelaren inte når):** utgångsläget är veckoharnessens lördag vecka 1 för den svaga spelaren (ingen kassa, inga medaljer, tre dagsavslut under noll). Sparfilen `reports/order268/save-lordag-vecka1.json` läggs på sparplats 1 innan sidan laddas. Ett nytt spel börjar med 120 000 kr och når ingen nedgradering på en vecka. Allt efter laddningen görs med spelarens knappar.

Spelaren svarar på scenarierna som harnessens spelare: sämst före nedgraderingen, bäst efter. Rangordningen läses ur `scenarios.ts`, och svaren står i `way-back.json` `scenarioAnswers`. Lördagens meny och lager sätts inte i webbläsaren, men nedgraderingen var redan bestämd efter fredagen.

**DoD: UPPNÅDD i spelarens vy.** Stegen, med utdata i `way-back.json` (fälten `steps`, `newspaper1`, `bank1`, `newspaper2`, `bank2`, `back`, `scenarioAnswers`, `days`, `errors`):

| Steg | Skärmdump | Vad som syns |
| --- | --- | --- |
| Startrutan → Fortsätt ett sparat spel → Ladda plats 1 | `b01` | |
| Lördag i vinbaren | `b02` | "Banken ringde i morse" |
| Lördagens kväll | `b03` | Spelaren svarade sämst: fisken tas, sällskapet avvisas |
| Söndagstidningen | `b04` | "Banken tog vinbaren och köpte inventarierna. Det blir din kassa när du fortsätter med food trucken." |
| Söndagsmorgonen | `b05` | "FOOD TRUCK"; laget är kock och lärling |
| Brons i Stensöta, Metodköket och Kalastorget | `b06` | |
| Banken | `b07` | Spelaren stannar i food trucken |
| Måndag–lördag i food trucken, med bästa svaren | `b08` | Food truckens service |
| Söndagstidningen vecka 2 | `b09` | "Veckan gav mer än golvet" |
| Banken | `b10` | "Byt till vinbar"; kassan 41 kSEK |
| Klick på Byt till vinbar | `b11` | "SÖNDAG · MORGON · VINBAR"; värd och servitör anställda |
| Måndagens kväll i vinbaren | `b12` | "Tolv gick härifrån nöjda. Ingen gav upp i kön." |

`errors` är tom.

**Paritet med harnessen.** Food truckens vecka gav 21 → 41 kSEK i spelarens vy och 21 045 → 45 610 SEK i harnessen. Före ändringarna var det cirka 80 kSEK mot 22 125 SEK. Den kvarvarande skillnaden kommer av att webbläsaren tickar medan spelaren klickar, så att slumpföljden blir en annan.

**Kvar att se:** efter laddningen av ett sparat spel står kameran i byns vy (`b12`). Interiören syns när spelaren zoomar in. Det är oförändrat från etapp 5.

## 3. Veckoharnessens tal

Källa: `frontend/reports/order268/week-harness.json`, skriven av `order268WayBack.test.ts` med `WRITE_REPORTS=1`.

**Scenariot "nedgradering-och-tillbaka"** (åtta veckor, frö 42), fältet `settlements`:

| Vecka | Klass vid avräkningen | Kassa | Vad som hände |
| --- | --- | --- | --- |
| 1 | food truck | 21 045 | Den svaga spelaren. Vinbaren togs; försäljningen blev startkassa |
| 2 | food truck | 45 610 | Rimligt spel: brons i tre, en vecka i food trucken. Samma söndag tillbaka till vinbaren (insatsen 1 263 SEK) |
| 3–8 | vinbar | 54 434 → 121 780 | Vinbaren håller säsongen ut |

Testet kontrollerar att vägen går direkt från food trucken, utan ingen verksamhet emellan, inom åtta veckor, och att laget i food trucken är kock och lärling.

**Utan verksamhet** (`reports/order268/utan-verksamhet.json`):
- Kassan står still dag 1–7.
- Banken svarar `bankWait` dag 4–7 och ja dag 8 (`bankAnswers`).

**Scenariernas kassa** (`reports/order268/scenario-cash.json`, andel av vinbarens normala veckointäkt, fältet `share`):
- den rimliga spelaren 0,08–0,15;
- den svaga −0,06 till +0,01.

**En vanlig rimlig vinbar i fyra veckor** (`reports/order268/vanlig-vinbar-4-veckor.json`, `weeks[].cashChangeSek`): +21 454, +23 210 och +15 009 SEK. Den förlust från vecka 3 som rapporterades före beslutet fanns bara i harnessen, som inte svarade på scenarierna och drog söndagens löner.

**Slumpmålet:** `reports/order268/randomness.json` (1 000 veckor, scenarierna inräknade, båda spelarna rimliga), fältet `winShare`: 0,548 (548 vinster, 0 lika). Kalibreringen görs i ORDER 269.

## 4. Avvikelser från speldesignen och varför

- **Första försöket nådde inte DoD.** Vägen gick genom en andra nedgradering, och kassakravet gjorde vägen direkt från food trucken omöjlig. Vision Owner beslutade den första omgången.
- **Harnessen mätte ett annat spel än spelarens.** Verifieringen i spelarens vy visade att food truckens vecka gav cirka 80 kSEK mot 22 125 SEK i harnessen. Skälet var att harnessen aldrig svarade på scenarierna, som gav 21 000–36 000 SEK i veckan. Alla veckotal från etapp 3 till 5 saknade scenarierna. Vision Owner beslutade den andra omgången. Det här är samma slags fel som i CLAUDE.md, "Mätningar mot det de beskriver": rätt tal om fel sak.
- **Att gå under kan löna sig (F40, att se över).** Försäljningen skriver av skulden och ger en startkassa. Vägen tillbaka kostar bara insatsen. Food truckens startlån är större än vinbarens.
- **Laget växer vid vägen tillbaka (F37).** Kocken och lärlingen följer med och värd och servitör anställs, så vinbaren får fyra anställda.
- **Figurerna i rummet följer inte laget.** Food truckens service visar tre figurer. Figurerna och lönelaget är skilda sedan ORDER 043; food truckens egen vy byggs i etapp 6.
- **Mentorn** ska enligt speldesignen dyka upp igen vid nedgradering. Det är inte byggt; mentorn är platshållare.

## 5. Öppna frågor

- F37 (personalen), F38 (ersatt av beslutet), F39 (inspektionen), F40 (inventarievärdet, och om det ska löna sig att gå under), F41 (scenariernas enhet och spelarna), i `NEXUS_V1_OPPNA_FRAGOR.md`.
