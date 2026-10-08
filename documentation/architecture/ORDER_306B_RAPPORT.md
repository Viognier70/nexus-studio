# ORDER 306b: vinbarens situationer i formen analys → upplevelse → handling

**Beställare:** Anders 2026-10-07 och 2026-10-08:
- `documentation/blueprints/ORDER_306_UTKAST/SITUATIONER_306b.md`, Del A (reglerna A1–A11) och Del B (de elva situationerna). Bedömningen av Karaffen är förtydligad 2026-10-08 och ersätter den förra versionen av filen.
- Designs D8 (omtaget), uppackad oförändrad i `documentation/leveranser/nexus-leverans-2026-10-08-d8-vinbaren/`. Det är `Restaurant guest animation (41).zip`, som ersätter (40) med `gradeOrder()` rättad och prövad mot SITUATIONER_306b.md för alla 360 rader.
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
