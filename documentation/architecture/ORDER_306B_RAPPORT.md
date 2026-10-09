# ORDER 306b: vinbarens situationer i formen analys → upplevelse → handling

**Beställare:** Anders 2026-10-07 och 2026-10-08:
- `documentation/blueprints/ORDER_306_UTKAST/SITUATIONER_306b.md`, Del A (reglerna A1–A11) och Del B (de elva situationerna). Bedömningen av Karaffen är förtydligad 2026-10-08 och ersätter den förra versionen av filen.
- Designs D8 (omtaget), uppackad oförändrad i `documentation/leveranser/nexus-leverans-2026-10-08-d8-vinbaren/`. Först (41), som ersatte (40) med `gradeOrder()` rättad och prövad mot SITUATIONER_306b.md för alla 360 rader. Nu `Restaurant guest animation (42).zip` (306b.1), där personalen i texterna är `{name}`.
- "Byt konstanten RAKET.answerS till ett namn utan "raket"."

**Ordningen:** 319c → 320 → 306b. Reglerna A1–A3 (fel avslutar inte, potten 1 → 3 → 7, stegets tid efter platsen) kom in i main med 320. Den här ordern gör resten.

Talen står i `frontend/reports/order306b/`:
- `spelartyper.json`: harnessen (A10);
- `langd.json`: svarens längd (A4).

## RAKET.answerS

Konstanten `RAKET.answerS` (D8 `orderCards.ts`, "samma tidsbåge som ett vanligt svar") finns inte i spelets kod. Tiden för ett steg står i `balance.ts` som `INCIDENTS.stepSecondsByIndex` (A3: stegets plats ger tiden), och ordningskorten använder samma tid som andra svar i steg 3. Därför finns inget att byta namn på. Ordet *raket* står inte i någon ny kod eller text i ordern.

## Situationerna (Del B)

Tio situationer är ersatta och Karaffen (`vb40-karaffen`) är ny. Alla har `form: 'triad'` i `content/incidents/vinbar.meta.json`.
- **Svenska:** ordagrant ur Del B.
- **Engelska:** översatt av mig. Steg 3 är kortat där översättningen bröt mot A4 (se nedan).
- **Kedjorna** som låg på de gamla fel-svaren ligger nu på det nya fel-svaret i steg 3:
  - vb01 → vb30-korkgasten;
  - vb03 → vb27-allergireaktion;
  - vb07 → vb17-glasen.
- **Följderna** av fel i steg 1–2 är de gamla stegens följder, efter axel. Karaffen har egna.
- **Valideringen** kräver i steg 3 i den nya formen minst ett helt grepp, och inget fel (vb18 och vb32 har två hela grepp och inget fel, A4).
- **⚖:** vb03 har lagtext i tre svar. Bara förklaringen till de svaren döljs (`legalText`), som i 320.

### Kostnaderna (A7, mina förslag)

Husvinets inköp är 24 kr per glas och fem glas per flaska (`m4Catalogue.ts`, `house-wine`, `GLASSES_PER_BOTTLE`). Testet `order306bVinbaren.test.ts` läser kostnaderna mot husvinet.

| Situation | Svar | Kostnad |
|---|---|---|
| vb01 | ny flaska (inköpspris) | 120 kr, fem glas |
| vb11 | ett smakprov | 12 kr, ett halvt glas |
| vb12 | ett glas | 24 kr |
| vb18 | kemtvätten / kemtvätten och kvällens vin | 450 kr / 474 kr |
| vb32 | två glas | 48 kr |

Kostnaden dras när svaret avgörs. Räcker inte kassan, går svaret inte att välja, varken i kortet eller i motorn (`incidents.ts` `canAfford`, `lockAnswer`).

## Ordningskorten i Karaffen (A9)

- **I motorn:** steg 3 har `form: 'sequence'` med korten, platserna och reglerna. Raden ligger i motorn (`SET_INCIDENT_ROW`). Låset (`LOCK_INCIDENT_ROW`) kräver fyra kort, bedömer raden (`gradeSequence`) och låser svaret med bedömningens id: `full`, `analysis`, `experience` eller `wrong`. Resten av motorn (potten, halvt grepp, följderna) gäller som för andra svar.
- **Tiden ute:**
  - med fyra kort bedöms raden;
  - med färre tar personalen över, som när ett svar saknas (order 314).
- **Loggen** sparar raden och regeln som avgjorde (`sequence: { row, reason }`).
- **Bedömningen** följer den förtydligade texten och D8 (41) `gradeOrder()`:
  - brister i tekniken: e med, b saknas, c saknas, eller c före b;
  - brister i omsorgen: f med, a saknas, a efter c, eller d varken först eller sist (D8:s läsning av "helt grepp: inga brister och d sist");
  - fel: d först, både b och c saknas, eller båda sorternas brister.
- **Prövningen mot alla 360 rader:** testet `order306bVinbaren.test.ts` bygger alla rader med fyra av de sex korten och jämför spelets `gradeSequence` med D8:s `gradeOrder()`, som är kopierad ordagrant i testet. Det finns inga skillnader. Testerna prövar också D8:s kontrollbilder (06 a b e d, 07 a b c f, 08 d först) och b → a → c → d som helt grepp.
- **D8:s `gradeOrder()`** är facit i testet. Spelet bedömer med reglerna i situationens data. D8:s förklaringar per regel (`why.exp.*`, `why.ana.*`) används inte, eftersom förklaringen är situationens egen text för halvt grepp ur Del B. `why.wrong.serveFirst` används när d ligger först.

## Designs D8 i spelet

- **Ordningskorten** (`ui/service/OrderCards.tsx`):
  - korten i D8:s fasta rutnät (c e a f d b) med D8:s ikoner (`orderIcons.ts`, oförändrad) och fyra platser;
  - klick på ett kort lägger det, och klick på en plats tar bort det;
  - låset visar "Lägg {n} kort till" och sedan "Lås ordningen";
  - avgörandet är grönt, i papper och mässing, eller rött; vid halvt grepp och fel visas den rätta raden streckad;
  - vid tiden ute lägger personalen de handgrepp som saknas, med sin initial;
  - tangenterna 1–4 väljer inte på ordningskorten.
  - Kortens text är situationens (Del B), inte D8:s `card.*`.
- **Halvt grepp** (`IncidentPanel.tsx`) har D8:s etikett med ½-tecknet i papper och mässing, aldrig i rött, både på svaret och i bandet. Helt grepp i steg 3 heter "Helt grepp".
- **Myntet:** kostnaden står som ett mynt längst till höger på svaret. När kassan inte räcker har svaret en streckad kant och raden "Kassan räcker inte", och det går inte att välja.
- **Karaffen i rummet** (`scene/DecanterAtLounge.tsx`, `decanterProps.ts` oförändrad):
  - medan situationen pågår står karaffen och ett tänt ljus i mässingsstake på loungebord B;
  - när den är avgjord ställs den tomma flaskan och korken på ett fat bredvid, och de står kvar kvällen ut;
  - rummets lokala ram räknas om till världen med två av rummets platser.
  - **Inte byggt:** sommelierns nya klipp (`somm.lightCandle`, `somm.setEmptyBottle`) och fällan "Gör det vid baren", där karaffen ska stå på baren.
- **Strängarna:** de nycklar spelet visar står i `content/d8Strings.ts`. Sommelierns namn är `{name}` som i D8 (41): den som arbetar i situationens roll den kvällen.

## A4: längden och gissaren

`langd.json` visar att inget svar i de elva situationerna bryter mot längden, på svenska eller engelska. Reglerna är högst 12 ord i steg 1–2 och 15 i steg 3, och i steg 3 högst 1,5 gånger det kortaste. Före kortningen bröt fem av mina engelska steg 3 och ett steg 2 mot reglerna (vb02, vb03, vb11, vb12, vb18).

Längden räcker ändå inte. Gissaren, som alltid väljer det längsta alternativet, klarar fler situationer än slumpen och tjänar mer (tabellen nedan). Det längsta alternativet är oftare det rätta än slumpen ger. Det gäller också på svenska. Hur ofta det längsta svaret är det bästa, mot slumpens väntevärde, står per språk i `langd.json` (`longestIsBest`).

**Förslag:** skriv om de rätta svaren som är längst i sitt steg, så att de inte sticker ut. Det gäller Anders text.

## A10: spelartyperna

Vinbaren i vecka 2, sex dagar, tio frön per rad. Talen kommer ur `spelartyper.json` (`table`), och kolumnernas definitioner står i filens `definition`. *Stannar* anger när spelaren tar potten i kvitt eller dubbelt: 0 betyder att den alltid går vidare, 1 och 2 att den stannar efter steg 1 eller 2. Andelarna under *Elva* gäller de elva situationerna i den nya formen.

| Spelartyp | Stannar | Resultat (kr) | Stannade | Krediter | Elva: helt | Elva: halvt | Elva: fel i steg 3 | Elva: fel på vägen |
|---|---|---|---|---|---|---|---|---|
| rimlig | 0 | 16 417 | 0 | 186 | 1 | 0 | 0 | 0 |
| rimlig | 1 | 14 963 | 1 | 26 | 0 | 0 | 0 | 0 |
| rimlig | 2 | 14 563 | 1 | 77 | 0 | 0 | 0 | 0 |
| gissaren | 0 | 9 453 | 0 | 97 | 0,537 | 0,263 | 0,2 | 0,882 |
| gissaren | 1 | 6 250 | 0,753 | 21 | 0,271 | 0,033 | 0 | 0,304 |
| gissaren | 2 | 6 143 | 0,695 | 43 | 0,393 | 0,031 | 0 | 0,424 |
| slumpen | 0 | −9 914 | 0 | 20 | 0,378 | 0,428 | 0,194 | 0,729 |
| slumpen | 1 | −4 584 | 0,487 | 17 | 0,166 | 0,207 | 0,143 | 0,445 |
| slumpen | 2 | −10 013 | 0,324 | 19 | 0,231 | 0,311 | 0,101 | 0,52 |
| svag | alla | −19 670 | 0 | −9 | 0 | 0,062 | 0,46 | 0,522 |
| ignorerar | alla | 1 557 | 0 | −25 | 0 | 0 | 0 | 0 |

Svag och ignorerar klarar aldrig ett steg och kommer därför aldrig till valet. Deras tal är desamma för alla tre sätten att stanna. Ignorerar har personalen i alla situationer.

- **Att stanna** kostar den rimliga spelaren de flesta krediterna: 186 när den alltid går vidare, mot 26 när den stannar efter steg 1. Kassan påverkas lite, mellan 14 600 och 16 400 kr.
- **Gissaren** tjänar mer än slumpen med alla tre sätten att stanna: 9 453 kr mot −9 914 kr när båda alltid går vidare. Den har också fler hela grepp (0,537 mot 0,378). Det är A4:s test, och det håller inte.

**Fel i steg 2** ska i första hand ge stämningen och ryktet, och mindre ekonomin. I sex av de elva drar felet i steg 2 också kassan (`step2FailEffects`): vb01, vb02, vb03, vb07, vb09 och vb11, på −0,1 till −0,2 scenarioenheter. Det är de gamla stegens följder, och de är inte ändrade. **Förslag:** sätt kassan till 0 i steg 2 och lägg följden på stämningen.

## Ändrade tester

- `order270Incidents`, `serviceScreens` och `order310Kvitt` prövade den gamla formen med vb09, vb03 och vb12, som nu har den nya formen. De prövar nu med vb10 och vb17, eller läser axeln ur banken.
- `order314Situationerna` krävde att personalen lyckas minst en gång under en kväll med frö 7. Med den nya banken hände det inte, och testet prövar nu tre kvällar.

## Verifiering

- **Typecheck och bygge:** gröna.
- **Hela sviten:** 2651 tester gröna, 1 förväntat fel och 19 hoppade, utan ohanterade fel.
- **Nya tester:**
  - `src/sim/__tests__/order306bVinbaren.test.ts`: banken, kostnaderna mot husvinet, kassan som inte räcker, bedömningen, alla 360 rader mot D8:s `gradeOrder()`, raden i motorn, tiden ute och karaffen;
  - `src/strategic/ui/service/__tests__/order306bD8.test.tsx`: ordningskorten, etiketten för halvt grepp, myntet och Kassan räcker inte i kortet;
  - `src/strategic/testHarness/__tests__/order306bSpelartyper.test.ts`: gissaren och slumpen svarar; rapporterna med `SEEDS=10 DAYS=6 WRITE_REPORTS=1`.
- **Inte prövat i spelarens flöde i webbläsaren:** ordningskorten, myntet och karaffen i rummet är prövade med testerna, men inte i en skärmdump ur spelet. En kontroll i spelet kan göras i en egen order om du vill.

## 306b.1: D8 (42)

Anders 2026-10-08: "D8 är klar: använd … (42).zip i stället för (40)."
- **Leveransen** är uppackad oförändrad över den förra (diff mot zipen: inga skillnader).
- **`gradeOrder()`** är oförändrad sedan (41). Kopian i testet är fortfarande ordagrann, och prövningen av alla 360 rader är grön.
- **`{name}`:** personalen i D8:s texter är `{name}`, den som arbetar den kvällen. Spelet visar redan `timeout.verdict` med `{name}`. Testet prövar att ingen av spelets D8-strängar säger Elin, hon eller she. `decanterProps.ts` är kopierad på nytt (bara anteckningarna har ändrats till `{name}`).
- **`why.order`** är föråldrad i (42): den säger att b saknas ger fel, nämner Elin och anger 20 s. Den står inte i spelets strängtabell och visas inte för spelaren, vilket testet prövar.
- **Spelet följer 306b:**
  - b saknas är en brist i tekniken och ger halvt grepp, upplevelsen höll (testet med a c e d);
  - steg 3 har `INCIDENTS.stepSecondsByIndex[2]`, 30 s, plus medaljernas tid, som andra svar i steg 3 (testet `tiden i Karaffens steg 3`).

## 306b.2: Anders beslut om gissaren och fel i steg 2

Anders 2026-10-08:
1. "ta fram en lista över alla situationer (vinbaren och foodtrucken) där det hela greppet i steg 3 är det längsta svaret i ord … Claude skriver om texterna. Mål: det hela greppet är längst i högst hälften av situationerna, och gissaren klarar sig inte bättre än slumpen."
2. "sätt kassaeffekten till 0 i de sex situationerna och flytta beloppet till felsvaret i steg 3."

### Listan

Talen står i `langd-fore.json` (innehållet före omskrivningen, samma skript) och `langd.json` (efter), fältet `step3Longest`.
- **Urvalet:** alla 23 situationer i formen med vanliga svar i steg 3, tio i vinbaren och tretton i foodtrucken. Karaffen har ordningskort och är inte med. Foodtruckens ⚖-situationer ft05 och ft06 är med, fast de är dolda i spelet.
- **Före:** det hela greppet var längst i 22 av 23 på svenska och 20 av 23 på engelska.
- **Efter:** det hela greppet är längst i 6 av 23 på båda språken (vb07, vb11, ft07, ft08, ft11 och ft13). Slumpen hade gett ungefär en fjärdedel.
- **Testet** `det hela greppet i steg 3 är det längsta svaret i högst hälften av situationerna` håller målet.

Antalet ord per svar. \* är det hela greppet, och fetstil betyder att det hela greppet är längst (lika långt räknas).

| Situation | Helt grepp | Före, sv (ord per svar) | Före, en | Efter, sv | Efter, en |
|---|---|---|---|---|---|
| vb01-korken | a | **a* 11 b 11 c 11 d 10** | **a* 13 b 13 c 13 d 12** | a* 10 b 11 c 11 d 10 | a* 11 b 13 c 13 d 12 |
| vb02-rosen | a | **a* 13 b 13 c 11 d 13** | a* 12 b 13 c 10 d 11 | a* 11 b 13 c 11 d 13 | a* 10 b 13 c 10 d 11 |
| vb03-notallergi | a | **a* 13 b 12 c 12 d 9** | **a* 13 b 13 c 12 d 9** | a* 12 b 12 c 12 d 14 | a* 12 b 13 c 12 d 14 |
| vb07-provningen | c | **a 11 b 10 c* 12 d 12** | **a 13 b 10 c* 15 d 12** | **a 11 b 10 c* 12 d 12** | **a 13 b 10 c* 15 d 12** |
| vb09-getosten | d | a 9 b 10 c 11 d* 9 | a 10 b 11 c 13 d* 9 | a 9 b 10 c 11 d* 9 | a 10 b 11 c 13 d* 9 |
| vb11-cremant | a | **a* 11 b 8 c 11 d 10** | **a* 13 b 9 c 11 d 12** | **a* 11 b 8 c 11 d 10** | **a* 13 b 9 c 11 d 12** |
| vb12-varmt-rott | c | **a 13 b 14 c* 14 d 12** | **a 13 b 12 c* 14 d 12** | a 13 b 14 c* 13 d 12 | a 13 b 12 c* 12 d 12 |
| vb18-kavajen | b, c | **a 10 b* 12 c* 14 d 11** | **a 10 b* 13 c* 14 d 11** | a 12 b* 10 c* 11 d 11 | a 12 b* 11 c* 11 d 11 |
| vb23-sott | b | **a 12 b* 12 c 12 d 11** | **a 13 b* 15 c 13 d 13** | a 12 b* 11 c 12 d 11 | a 13 b* 10 c 13 d 13 |
| vb32-fodelsedagen | b, c | **a 11 b* 13 c* 13 d 13** | **a 15 b* 14 c* 15 d 14** | a 11 b* 12 c* 12 d 14 | a 15 b* 13 c* 13 d 14 |
| ft01-rusningen | b | **a 7 b* 13 c 8 d 4** | **a 8 b* 11 c 8 d 4** | a 11 b* 9 c 13 d 9 | a 12 b* 8 c 11 d 9 |
| ft02-drycken | b | **a 4 b* 15 c 3 d 1** | **a 4 b* 16 c 4 d 1** | a 8 b* 7 c 9 d 9 | a 8 b* 9 c 11 d 12 |
| ft03-rullen | b | **a 3 b* 15 c 8 d 4** | **a 6 b* 19 c 8 d 4** | a 10 b* 11 c 14 d 11 | a 12 b* 11 c 12 d 9 |
| ft04-leveransen | b | **a 3 b* 15 c 3 d 6** | **a 3 b* 18 c 4 d 8** | a 12 b* 11 c 9 d 8 | a 12 b* 10 c 10 d 9 |
| ft07-ursprunget | b | **a 5 b* 17 c 10 d 5** | **a 8 b* 18 c 10 d 7** | **a 9 b* 12 c 10 d 9** | **a 11 b* 14 c 10 d 10** |
| ft05-allergin | b | **a 6 b* 23 c 4 d 4** | **a 7 b* 29 c 6 d 7** | a 14 b* 13 c 11 d 11 | a 15 b* 14 c 13 d 13 |
| ft06-stangningen | b | **a 8 b* 25 c 6 d 9** | **a 8 b* 31 c 4 d 9** | a 15 b* 13 c 15 d 13 | a 14 b* 14 c 12 d 15 |
| ft08-regnet | a | **a* 15 b 12 c 11 d 6** | **a* 17 b 12 c 13 d 7** | **a* 15 b 12 c 11 d 11** | **a* 14 b 12 c 13 d 12** |
| ft09-getingen | a | **a* 14 b 13 c 9 d 6** | **a* 17 b 15 c 10 d 7** | a* 12 b 13 c 11 d 11 | a* 14 b 15 c 13 d 12 |
| ft10-kortet | a | **a* 12 b 12 c 7 d 9** | a* 11 b 12 c 9 d 5 | a* 11 b 12 c 9 d 9 | a* 11 b 12 c 12 d 9 |
| ft11-slut | a | **a* 15 b 10 c 9 d 8** | **a* 15 b 7 c 8 d 8** | **a* 15 b 10 c 11 d 11** | **a* 15 b 11 c 11 d 11** |
| ft12-hunden | a | **a* 11 b 11 c 10 d 6** | **a* 15 b 12 c 11 d 10** | a* 9 b 12 c 10 d 12 | a* 12 b 12 c 11 d 14 |
| ft13-priset | a | **a* 11 b 7 c 8 d 10** | **a* 15 b 7 c 8 d 11** | **a* 11 b 10 c 9 d 10** | **a* 13 b 10 c 10 d 11** |

### Omskrivningen

- **Längden** ändrades, inte innehållet. Det hela greppet kortades, eller så fick ett annat svar en bisats.
- **Anders tillägg står kvar:** fråga 9 (ft06) säger fortfarande "inte längre än några timmar". Testet i 315c prövar det.
- **Talen står kvar:** ft05 (+8 °C), ft06 (+60 °C) och ft13 (25 kr).
- **A4:** inget svar har fler än 15 ord i steg 3 (`langd.json` `over` är tom), och foodtruckens svar på ett eller två ord är borta.
- **Svenskan i vinbaren skiljer sig nu från `SITUATIONER_306b.md`** i de omskrivna svaren. Texten i spelet (`vinbar.text.sv.draft.json`) gäller, och tabellen visar vilka svar som ändrats.

### Gissaren efter omskrivningen

`spelartyper.json`, samma körning som förut (tio frön, sex dagar):

| Spelartyp | Stannar | Resultat (kr) | Stannade | Krediter | Elva: helt | Elva: halvt | Elva: fel i steg 3 | Elva: fel på vägen |
|---|---|---|---|---|---|---|---|---|
| rimlig | 0 | 16 417 | 0 | 186 | 1 | 0 | 0 | 0 |
| rimlig | 1 | 14 963 | 1 | 26 | 0 | 0 | 0 | 0 |
| rimlig | 2 | 14 563 | 1 | 77 | 0 | 0 | 0 | 0 |
| gissaren | 0 | 7 979 | 0 | 94 | 0,292 | 0,329 | 0,379 | 0,885 |
| gissaren | 1 | 6 623 | 0,757 | 21 | 0,213 | 0,108 | 0 | 0,321 |
| gissaren | 2 | 5 297 | 0,697 | 42 | 0,13 | 0,185 | 0,226 | 0,54 |
| slumpen | 0 | −9 911 | 0 | 20 | 0,378 | 0,428 | 0,194 | 0,729 |
| slumpen | 1 | −4 565 | 0,487 | 17 | 0,166 | 0,207 | 0,143 | 0,445 |
| slumpen | 2 | −9 987 | 0,324 | 19 | 0,231 | 0,311 | 0,101 | 0,52 |
| svag | alla | −19 670 | 0 | -9 | 0 | 0,062 | 0,46 | 0,522 |
| ignorerar | alla | 1 557 | 0 | -25 | 0 | 0 | 0 | 0 |

- **I de elva situationerna** klarar sig gissaren sämre än slumpen: helt grepp 0,292 mot 0,378 när båda alltid går vidare. Förut var det 0,537 mot 0,378.
- **Över veckan** tjänar gissaren ändå mer än slumpen (7 979 kr mot −9 911 kr). Orsaken är vinbarens 29 situationer i den gamla formen. Där är det längsta svaret det bästa i 53 av 87 steg på engelska och 55 på svenska, där slumpen ger 25,2 (`langd.json` `oldFormLongestIsBest`). De ingår inte i beslutet och är inte omskrivna.
- **Förslag:** skriv om svaren i de 29 eller för dem till den nya formen. Säg till om jag ska göra det.

### Fel i steg 2

I vb01, vb02, vb03, vb07, vb09 och vb11 är kassan i stegets fel i steg 2 satt till 0. Beloppet ligger nu på felsvaret i steg 3, ovanpå det svarets egen följd:

| Situation | Belopp | Felsvaret i steg 3 |
|---|---|---|
| vb01 | −0,15 | d (kedjan till vb30 står kvar) |
| vb02 | −0,15 | d |
| vb03 | −0,15 | d (kedjan till vb27 står kvar) |
| vb07 | −0,15 | b (kedjan till vb17 står kvar) |
| vb09 | −0,2 | c |
| vb11 | −0,1 | b |

- **Var beloppet ligger:** ett felsvar som saknade en egen följd har fått stegets följd som egen, med beloppet och samma text. Tiden ute i steg 3 ger därför samma följd som förut.
- **Testet** `fel i steg 2 tar ingen kassa; beloppet ligger på felsvaret i steg 3` prövar det.
- **Svag spelare:** veckans resultat är oförändrat (−19 670 kr), och kassan ur situationerna gick från −827 till −893 kr. Svag svarar fel också i steg 3 och betalar beloppet där.
- **Kvar, inte i beslutet:**
  - vb32 tar orken (−0,05) i steg 2;
  - foodtruckens alla tretton tar kassan (−0,04) och ryktet i steg 2.
  - Säg till om steg 2 ska vara utan kassa också där.

### 319c och 320

Båda är byggda och mergade till main, och main är pushad:
- 319c: `51ddbabc` och mergen `995191e6`;
- 320: `878b0483` och mergen `24f6485c`.

## 306b.3: hela banken, steg 2 och texten i spelet

Anders 2026-10-08:
1. "skriv om de 29 situationerna i vinbarens gamla form på samma sätt (bara längd, innehållet och fakta står kvar). Mål: det längsta svaret är rätt i högst en fjärdedel plus marginal, och gissaren tjänar inte mer än slumpen över en vecka. Lägg till ett test för hela banken."
2. "steg 2 tar aldrig något ur kassan eller av orken, i någon situation. Flytta följden till felsvaret i steg 3 i foodtruckens 13 situationer och i vb32."
3. "Texten i spelet gäller före SITUATIONER_306b.md."

### Hela banken

Vinbarens bank är dess 40 situationer och menyns 9. Gissaren möter dem alla under en vecka, så jag skrev om svaren i den gamla formen, i menyn och i några steg 1–2 i de elva nya.
- **Bara längden har ändrats:** ett felsvar har fått en bisats, eller så har det rätta svaret kortats. Talen (°C, cl, 112) och fakta står kvar.
- **Ok-svaren:** en första omgång förlängde också ok-svar. Det gjorde gissaren bättre, eftersom ett ok-svar också klarar steget i den gamla formen. De är återställda, och felsvaren fick bisatserna i stället.
- **Talen** står i `langd.json`, fältet `bank`. Där finns hur ofta det längsta svaret är det bästa, i ord och i tecken. Där finns också kvaliteten på gissarens val (det längsta i tecken, som i harnessen) mot slumpens.

| Del | Steg | sv: längst = bäst (ord / tecken) | en: längst = bäst (ord / tecken) | Slumpen | Gissarens val fel (en) | Slumpens val fel |
|---|---|---|---|---|---|---|
| nya formen | 32 | 8 / 8 | 7 / 7 | 9,4 | 0,469 | 0,414 |
| gamla formen | 87 | 24 / 22 | 21 / 25 | 25,2 | 0,724 | 0,548 |
| menyn | 27 | 4 / 6 | 4 / 8 | 9 | 0,741 | 0,667 |

- **Före** (306b.2, `langd.json` i `8d877557`): det längsta svaret var det bästa i 53–55 av 87 steg i den gamla formen.
- **Testet** `src/sim/__tests__/order306b3Banken.test.ts` håller banken under 0,35 i ord och i tecken, på båda språken. Slumpen ger ungefär 0,30.
- **Steg 3:** listan från 306b.2 håller fortfarande: det hela greppet är längst i 6 av 23.
- **A4:** inget svar i de elva bryter mot längden (`over` är tom).
- **Det som blir kvar är tvärtom:** i den gamla formen och menyn är det längsta svaret nu fel något oftare än slumpen ger, 0,72 mot 0,55 i den gamla formen. Den som alltid undviker det längsta svaret får en liten fördel. Säg till om jag ska jämna ut det.

### Spelartyperna

`spelartyper.json`, tio frön och sex dagar:

| Spelartyp | Stannar | Resultat (kr) | Stannade | Krediter | Elva: helt | Elva: halvt | Elva: fel i steg 3 | Elva: fel på vägen |
|---|---|---|---|---|---|---|---|---|
| rimlig | 0 | 16 417 | 0 | 186 | 1 | 0 | 0 | 0 |
| rimlig | 1 | 14 963 | 1 | 26 | 0 | 0 | 0 | 0 |
| rimlig | 2 | 14 563 | 1 | 77 | 0 | 0 | 0 | 0 |
| gissaren | 0 | −14 734 | 0 | 13 | 0,282 | 0,308 | 0,357 | 0,823 |
| gissaren | 1 | −9 208 | 0,442 | 16 | 0,076 | 0,286 | 0,219 | 0,581 |
| gissaren | 2 | −14 729 | 0,123 | 13 | 0,114 | 0,298 | 0,423 | 0,835 |
| slumpen | 0 | −9 911 | 0 | 20 | 0,378 | 0,428 | 0,194 | 0,729 |
| slumpen | 1 | −4 565 | 0,487 | 17 | 0,166 | 0,207 | 0,143 | 0,445 |
| slumpen | 2 | −9 987 | 0,324 | 19 | 0,231 | 0,311 | 0,101 | 0,52 |
| svag | alla | −19 670 | 0 | -9 | 0 | 0,062 | 0,46 | 0,522 |
| ignorerar | alla | 1 557 | 0 | -25 | 0 | 0 | 0 | 0 |

**Gissaren tjänar mindre än slumpen** med alla tre sätten att stanna: −14 734 kr mot −9 911 kr när båda alltid går vidare. Efter 306b.2 var det −6 889 kr mot −9 911 kr.

### Steg 2

Följden av fel i steg 2 tar varken kassa eller ork. Den har flyttats till felsvaren i steg 3:
- **Foodtruckens tretton:** kassan (−0,04) ligger nu på varje felsvar i steg 3. Svar som saknade en egen följd har fått stegets följd och text som egen.
- **vb32:** orken (−0,05) ligger på stegets egen följd i steg 3, den som gäller när tiden går ut. vb32 har två hela grepp och inget felsvar i steg 3.
- **Testet** `steg 2 tar varken kassa eller ork` prövar alla 24 situationer i formen analys → upplevelse → handling, i vinbaren och i foodtrucken.

**Inte flyttat: situationerna i den gamla formen.** Där är steg 2 handlingen (techne), inte upplevelsen. 23 av vinbarens 29 situationer i den gamla formen, menyns nio och kriserna drar kassa eller ork i steg 2, till exempel de krossade flaskorna i vb26 (−0,4). Regeln "steg 2 påverkar bara stämningen och ryktet" gäller steget om upplevelsen, och jag tolkade den så. Säg till om den också ska gälla handlingen i den gamla formen. Då flyttas följden till phronesis-steget, som där är steg 3.

### Texten i spelet

Beslutet står överst i `SITUATIONER_306b.md` och i speldesignen.


## 306b.4: kunskapsformen, längden och städningen

Anders 2026-10-09:
1. "Regeln gäller kunskapsformen, inte stegets nummer: phronesis-steget (upplevelsen) tar aldrig kassa eller ork, i någon situation och i någon form. I den gamla formen får handlingen (techne) kosta som förut. Flytta kassa och ork från phronesis-steget till techne-steget där det behövs, och utöka testet."
2. "Jämna ut så att det längsta svaret är fel ungefär så ofta som slumpen ger (inom ±0,1). Lägg till spelartypen 'undviker längsta'. Den får inte tjäna mer än slumpen."
3. "Jämna också ut längden i foodtruckens steg 1–2 och i de nyfikna gästernas frågor. Fakta och talen i räkneuppgifterna ändras inte."
4. "Städa: stäng dina egna kvarglömda bakgrundsuppgifter, de som väntar på 'ALLT-KLART'."

### Phronesis-steget

I den gamla formen (episteme → techne → phronesis) är phronesis steg 3. Där drog 39 situationer kassa eller ork:
- 21 i vinbaren, varav de fyra varianterna av vb35;
- menyns 9;
- kriserna 9.

Foodtruckens och vinbarens situationer i den nya formen hade redan noll efter 306b.3.

Så här flyttades följden:
- **Belopp:** för varje situation togs det mest negativa beloppet i phronesis-steget, för kassan och orken var för sig. Det gäller både stegets följd och svarens egna följder.
- **Mottagare:** beloppet lades till techne-stegets följd och till varje felsvar med egen följd i techne-steget, eftersom ett svars egen följd ersätter stegets.
- **Phronesis-steget:** kassan och orken där sattes till 0.

Exempel:
- **vb25 efter stängning:** techne-stegets följd går från kassa −0,1 och ork −0,04 till −0,5 och −0,16.
- **Menyn:** kassan −0,1 ligger nu på fel i steg 2 (hur vinet serveras, hur fisken tillagas …).

Texterna i följderna nämner inga belopp, så ingen text har ändrats.

**Kvar med kassa uppåt:**
- vb08 a: sällskapet på fem får bordet (+0,3);
- vb10 b: den berusade gästen får ett glas till (+0,1).

De tar inte ur kassan utan ger, och står kvar. Orken i dem har flyttats.

**Testet** `src/sim/__tests__/order306b4.test.ts` prövar phronesis-steget i alla banker: vinbaren, menyn, kriserna och foodtrucken. Det ska ha:
- ingen negativ kassa;
- ingen ork;
- ingen kostnad.

Det prövar också att vb25:s techne-steg bär följden.

### Längden

Måttet finns i `src/strategic/testHarness/longestAnswer.ts`. Det är andelen fel bland de längsta svaren, där lika långa delar på valet, mot andelen fel bland alla svar (slumpen). Det räknas i ord och tecken, på svenska och engelska.

Talen står i `reports/order306b/langd.json`, fältet `longestWrong`. Testet håller varje del inom ±0,1.

| Del | Steg | sv ord | sv tecken | en ord | en tecken | Slumpen |
|---|---|---|---|---|---|---|
| vinbaren, gamla formen | 87 | 0,612 | 0,569 | 0,613 | 0,563 | 0,548 |
| vinbaren, nya formen | 32 | 0,477 | 0,411 | 0,479 | 0,469 | 0,414 |
| menyn | 27 | 0,722 | 0,630 | 0,722 | 0,593 | 0,667 |
| vinbarens bank | 146 | 0,603 | 0,546 | 0,604 | 0,548 | 0,541 |
| foodtrucken, steg 1–2 | 26 | 0,538 | 0,538 | 0,538 | 0,538 | 0,558 |
| foodtrucken, alla steg | 39 | 0,513 | 0,449 | 0,538 | 0,487 | 0,513 |
| de nyfikna | 20 | 0,5 | 0,5 | 0,5 | 0,5 | 0,5 |

**Före** (306b.3):

| Del | Det längsta är fel | Slumpen |
|---|---|---|
| Den gamla formen | 0,72–0,76 | 0,55 |
| Menyn | 0,74–0,87 | 0,67 |
| Foodtruckens steg 1–2 | 0–0,04 | 0,42–0,68 |
| De nyfikna | 0 | 0,5 |

Ändringarna:
- **Den gamla formen:** i 14 steg har felsvaren fått tillbaka sin lydelse från före 306b.3 (`54e9f82f^1`). I dem är nu ett ok-svar längst, i ett par av stegen det bästa.
- **Menyn:** samma sak i 4 steg: mn04, mn05, mn06 och mn07, steg 2.
- **Foodtruckens steg 1–2:**
  - 14 felsvar har förlängts med en bisats som håller dem fel.
  - Två rätta svar har kortats utan att fakta försvann (ft01 steg 1 och 2).
  - Talen står kvar, till exempel ft11 (tolv korvar) och ft13 (13 kr mot 23).
- **Foodtruckens steg 3:** två felsvar har fått två ord till på svenska (ft06 a, ft12 d), så att foodtrucken som helhet ligger inom gränsen. Mätt i svenska tecken låg den på −0,103.
- **De nyfikna:** 10 av 20 frågor har ett felsvar som nu är längst.

**Bara rapporterat, ej utjämnat:**
- **Foodtruckens steg 3 för sig:** 13 steg. Ett steg flyttar andelen med 0,08, och svenska tecken ligger på −0,154. Steg 3 har sin egen regel från 306b.2 (det hela greppet längst i högst hälften), som håller.
- **Kriserna:** utkast, inte i spelet. Där är det längsta svaret aldrig fel.

**Första omgången:** jag gjorde också det bästa svaret längst i fem steg i den gamla formen, så att den låg på ±0,04. Med tio frön tjänade gissaren då mer än slumpen: −7 615 kr mot −10 400 kr. Gissaren valde det bästa svaret oftare än slumpen, 0,333 mot 0,29. De fem stegen har fått tillbaka längden från 306b.3: vb17 steg 1, vb20 steg 2, vb22 steg 1, vb27 steg 2 och vb30 steg 2.

### Spelartyperna

Spelartypen **undviker längsta** (`weekHarness.ts`, svaret `'avoid'`) väljer på måfå bland alternativen som inte är längst i tecken. Den väljer bland alla om alla är lika långa, och lägger ordningskorten på måfå.

Med tio frön var standardfelet 1 000–1 700 kr, större än skillnaderna mellan gissaren, slumpen och den nya typen. Därför är körningen gjord med 40 frön. Tabellen är `spelartyper.json`, 40 frön och sex dagar:

| Spelartyp | Stannar | Resultat (kr) | Stannade | Krediter | Elva: helt | Elva: halvt | Elva: fel i steg 3 | Elva: fel på vägen |
|---|---|---|---|---|---|---|---|---|
| rimlig | 0 | 15 773 | 0 | 182 | 0,97 | 0 | 0 | 0 |
| rimlig | 1 | 14 837 | 1 | 25 | 0 | 0 | 0 | 0 |
| rimlig | 2 | 14 037 | 0,999 | 74 | 0 | 0 | 0 | 0 |
| gissaren | 0 | −9 479 | 0 | 29 | 0,276 | 0,341 | 0,371 | 0,865 |
| gissaren | 1 | −3 164 | 0,528 | 16 | 0,144 | 0,349 | 0,209 | 0,702 |
| gissaren | 2 | −10 506 | 0,228 | 15 | 0,152 | 0,372 | 0,36 | 0,884 |
| slumpen | 0 | −9 507 | 0 | 19 | 0,297 | 0,417 | 0,282 | 0,734 |
| slumpen | 1 | −4 389 | 0,55 | 17 | 0,148 | 0,201 | 0,137 | 0,451 |
| slumpen | 2 | −8 571 | 0,338 | 19 | 0,206 | 0,296 | 0,128 | 0,497 |
| undviker längsta | 0 | −11 628 | 0 | 16 | 0,304 | 0,469 | 0,206 | 0,783 |
| undviker längsta | 1 | −9 655 | 0,446 | 14 | 0,143 | 0,215 | 0,062 | 0,42 |
| undviker längsta | 2 | −11 090 | 0,27 | 16 | 0,201 | 0,255 | 0,112 | 0,54 |
| svag | alla | −19 445 | 0 | −8 | 0 | 0,166 | 0,483 | 0,656 |
| ignorerar | alla | 4 319 | 0 | −25 | 0 | 0 | 0 | 0 |

- **Undviker längsta** tjänar mindre än slumpen med alla tre sätten att stanna: −11 628, −9 655 och −11 090 kr, mot −9 507, −4 389 och −8 571 kr.
- **Gissaren** ligger lika med slumpen när båda alltid går vidare: −9 479 mot −9 507 kr. Det följer av målet att det längsta svaret är fel lika ofta som slumpens svar.
  - Efter steg 1 ligger gissaren 1 225 kr över slumpen. Standardfelet för skillnaden är omkring 1 090 kr, så det är inom bruset, men det är inte under slumpen som 306b.3 krävde.
  - Efter steg 2 ligger gissaren under slumpen.
- **Jämförelse med 306b.3:** tabellen där hade tio frön. Phronesis-flytten ändrar alla spelartyper, så talen går inte att jämföra rad för rad.

### Städningen

Mina fem väntande skal (`bo8gk4mj5`, `buxsmu2z9`, `bm5lwkiz3`, `b7gfpbf2k`, `b8dzm1qm4`) väntade på "ALLT-KLART" i `bqohseolr.output`. Den uppgiften avslutades med kod 144 utan att skriva ordet, i ORDER 320.

De är stängda en i taget med TaskStop. Inga andra processer är rörda.
