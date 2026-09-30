# ORDER 291 — Rättelser från provspelet av `4795192` (rapport)

**Ordern** (Vision Owner 2026-09-30, provspel av `4795192`, två tillägg, *före allt annat*): raketen och ölkrogen som första val, råvarorna efter servicen, rummet per verksamhet, skärmarna (punkt 4–12), ett resultat räknat på ett sätt, gästtypernas notor, erfarenheten och hållbarheterna, kurser som investering, inköpens text och varning, innehållet på svenska och balansen första veckan. Stanna när det går att spela.

Gren `order-291` från `main` (`4795192`). Talen i rapporten står i filerna under `frontend/reports/order291/`; varje tal nedan pekar på filen och fältet.

## 1. Orsakerna

Före rättelsen kördes en kväll i produktionsbygget (tillägg 1: "skriv ut talen från kvällskassan, T2 och R1 bredvid varandra"). Skript `frontend/scripts/order291-numbers.mjs`, sparfilen måndag i vinbaren, på svenska, med utbildningen och DJ:n. Utdata `numbers-before.json` (`sideBySide`): T2 sa −6 199 kr, R1 sa +2 067 kr och kassan föll 4 247 kr över dygnet. Tre tal för samma kväll.

- **Dygnets utgångskassa** (`day.cashAtDayStart`) sattes före gårdagens löner, ränta och satsningarnas följd. T2 räknade dem en gång till, och R1 räknade från en annan bas.
- **Köksdriften tickade efter stängningen.** Kvällens resultat räknade nedåt medan R1 var öppen (tillägg 2).
- **Satsningarna drogs två gånger:** priset när de valdes och en negativ följd lika stor vid dygnsskiftet (`activities.ts`).
- **Gäster betalade efter stängningen:** de som satt kvar, och i klasserna utan lagerpaket de som stod i kö. När kvällen föll ihop (`collapse.ts`) betalade alla som satt kvar efter överföringen, sopbilen kom vid dygnsskiftet och en scenarioruta blev stående.
- **Ölkrogen blev första val** genom brons i Metodköket (`startRequirements`). Ölkrogen spelas i den äldre vägen: ingen raketbank (bara vinbaren har en), inga lagerpaket, notan utan plånbok och rätternas kostnad dragen vid betalningen. Det förklarar punkt 1, 1b, 2 (råvaror 0 kr, täckningsgrad 100 %), tillägg 1 om lika notor (357 kr) och "0 gäster serverade".
- **Engelska:** raketerna, frågorna och kvällens texter läste de engelska filerna fast de svenska utkasten fanns bredvid. Rätterna, satsningarna, scenarierna och strömmens rader fanns bara på engelska. Talen skrevs med `en-GB` på 15 ställen.

## 2. Vad som rättades

**Ett resultat** (`eveningEconomy.ts` `eveningTransfer`; speldesign, beslut 2026-09-30):
- Kvällens resultat = kontot efter mot kontot i morse, utom kurserna. Samma tal står på T2 (resultatet och knappen, "För över +214 kr") och i R1 (`result-money`).
- Utgångskassan sätts efter dygnsskiftets avräkning. Den flyttas när pengar rör sig som inte är kvällens: banklånet och klassbytets försäljning och kontantinsats (`economy.ts` `changeClass`). En sparfil från före ordern får den vid laddning (`LOAD_STATE`).
- Efter stängningen: köksdriften står still, de som har beställt betalar vid stängningen (`closeOpenBills`), och ingen betalar efter (`payGuest`). Sopbilen och scenariot hanteras likadant när kvällen faller ihop.
- Satsningarnas pris dras en gång.
- **Kurser är investeringar** (tillägg 2, i speldesignen under Kvällens ekonomi). Insatsen räknar råvaror, personal, DJ och kvällens satsningar. Utbildningen av salen och vinprovningen står utanför kvällens resultat, i T2 som en rad *Kurser — en investering, inte kvällens kostnad*, och i veckoavräkningen (`economy.weekCoursesSek`, `lastSettlement.coursesSek`, raden i morgonens avräkning och tidningen).
- T2:s rader: personal, DJ, satsningar, kvällens händelser och sopbilen.

**Talen efter** (`numbers-after.json` `sideBySide`, samma sparfil och satsningar): T2 +214 kr, R1 +214 kr vid alla fem läsningarna under 8 s, kontot efter 117 214 kr, kassan nästa morgon 117 211 kr. De 3 kr är nästa morgons köksdrift, som tickar medan morgonskärmen är öppen. Kassans förändring över dygnet (−2 787 kr) är resultatet minus kursen (3 000 kr). Testet `order291Playtest.test.ts` (*kontot efter överföringen är kassan nästa morgon*) prövar åtta frön med tio spelminuter på kvällens skärmar.

**Punkt 1 och 3b, ölkrogen och raketen.** Den första verksamheten är vinbar eller food truck (`balance.ts` `BUSINESS_CLASSES.firstChoices`). Ölkrogen står som *byggs i etapp 8* i banken (`notYetBuilt`) och är inte längre målet för en nedgradering. En klass utan raketbank visar varför knappen är grå: *Den här verksamheten har inga raketer ännu*.
- **Testet i produktionsbygget:** `order291-numbers.mjs` trycker på *Starta raketen* när knappen går att trycka på. I `numbers-after.json` (`rocket`) startas raketen efter 87 s och kortet öppnas. Knappens text innan dess var *Öppnar när dörrarna öppnar*.

**Punkt 2, råvarorna.** De sålda rätternas kostnad räknas i alla klasser (`day.ingredientPaidTonight` i `stockSpentToday`). I klasserna utan lagerpaket dras den vid betalningen och räknas in i insatsen och T2. Täckningsgraden i vinbaren efter: 0,78 (`numbers-after.json` `T2.ratio`).

**Punkt 3, rummet per verksamhet** (`classes-*.png`, `screens-classes.json`, `order291-classes.mjs`):
- Graderingen är en och samma för alla klasser (`RoomGrade.tsx` på `<body>`): `roomGrade` är `service` i både vinbaren och food trucken.
- Rekvisitan i 1,5 finns bara i vinbarens teater; de andra rummen har ingen bordsrekvisita.
- Gästtypernas färger bärs i vinbaren (`WineBarFigures`) och i de andra rummen (`InteriorGuests`).
- **Food trucken saknar rum i scenen.** Från 24 m syns en tom plats (`classes-foodtruck-service.png`), se F60.

**Punkt 4, rubriken som klipptes.** Två saker låg i överkanten:
- Skylten över taket (`PlayerBusiness.tsx`) växer när kameran kommer nära och klipptes vid 24 m. Den döljs när taket tonas bort och rummet syns.
- Platsnamnet (`ViewLabel`) låg bakom klockan. Det står under HUD-raden, på spelarens språk ("Kvarteret").

**Punkt 5, morgonens HUD.** Platsnamnet var den halvgenomskinliga rutan bakom HUD:en. Morgonens rubrik mättes i sex fönsterstorlekar (1920 × 1080 till 1024 × 768), och ingen HUD-ruta överlappar den (`screens-after-ui.json` och `screens-after-ui-small.json`, `hudOverHead` tom). Klockans morgontext klipps inte längre ("Dörrarna öppnar 18.00").

**Punkt 6, hovringen.** Raderna på morgonen fick papperets ljusgrå hovring (`#ebe9e8`) under grädde text. Nu tonas de i grädde och guld på trä, och de ljusa tonerna gäller bara på papper (`screens.css`). Mätt: bakgrunden `rgba(244, 230, 204, 0.08)` med texten `rgb(244, 230, 204)` (`screens-after-ui.json` `hover`).

**Punkt 7, satsningarna på svenska.** Alla sju står i strängtabellen (`activityText`): *Utbilda salen*, *Ta in en springare* och de andra, också i dagsraden, kassaboken och kvällsberättelsen ("I dag valde du: …").

**Punkt 8, rummet och personalen.** Laget, investeringen och skala ner är i den varma formen (trä, mässingskant, morgonens rader). De ligger till vänster om rummet, under HUD:en och ovanför bottenraden (`room.css`). Bottenraden överlappar ingen panel i sex storlekar (`barOverPanels` tom). Byns lager (platsrutan, kartkrediten) döljs där.

**Punkt 9.** Ljudknappen säger *Ljud på* eller *Ljud av*.

**Punkt 10.** Ett scenario eller en fråga som väntar på svar läggs undan när servicen stänger, också när kvällen faller ihop, och rutan visas bara under servicen. Scenarierna finns på svenska (se 4).

**Punkt 11.** Talen skrivs efter spelarens språk (`language.ts` `numberLocale`, `formatNumber`): "6 069 kr" på svenska.

**Punkt 12.** Överföringens knapp visar kvällens resultat.

**Tillägg 1:**
- **Gästtyperna betalar olika.** I klasserna utan lagerpaket gånger notan en faktor per plånbok (`GUEST_TYPES.legacyBillFactor`: snål 0,8, vanlig 1, generös 1,35, guld 3). Notorna per typ räknas (`day.guestTypeBills`); testet visar studentens snittnota under medelinkomsttagarens och höginkomsttagarens över.
- **"0 gäster serverade"** räknade `portionsServed`, som bara lagerpaketens väg ökar. R1 räknar notorna (`billsTonight`).
- **Hållbarheterna** räknas efter överföringen och med samma resultat. Den ekologiska nivån utan lagret vid öppning räknar osålt mot sålt, och blir 0 när det inte finns något.

**Tillägg 2, inköpen:**
- *34 portioner till 31 väntade gäster* (`numbers-after.json` `buy.coverage`).
- En varning när mat eller dryck är mer än dubbelt behovet (`STOCK.overBuyFactor`). Behovet är en portion och 1 + `secondDrinkChance` glas per väntad gäst.
- **Baspaketet följer bokningen** (`STOCK.baseCoversPerGuest` 1,3, minst en av varje, högst paketet). Den första måndagen gav baspaketet 34 portioner till 13 gäster, så varningen hade kommit när spelaren gjort som mentorn sa.

## 3. Balansen

**Första veckan** (`first-week.json`, test `order291FirstWeek.test.ts`, 20 frön). Vinbaren från vecka 1, brons i tre paviljonger, startkassan, bästa svaret och baspaketet efter bokningen. Kvällens resultat är `day.transfer.resultSek`, samma tal som T2 och R1. Veckans resultat är kassans förändring måndag till måndag efter avräkningen, utan golvets påfyllnad och med amorteringen återlagd.

| Spelaren | Veckor med förlust | Veckans resultat, medel / sämsta | Första kvällen, medel / sämsta | Lägsta kassa | Nedgraderad |
|---|---|---|---|---|---|
| Mentorn: baspaketet, inga satsningar | 1 av 20 | +6 378 / −318 kr | +1 264 / −2 760 kr | 109 159 kr | 0 |
| Som provspelet: utbildningen och DJ:n första kvällen | 4 av 20 | +4 276 / −1 447 kr | +413 / −4 461 kr | 108 030 kr | 0 |
| DJ och springaren varje kväll | 20 av 20 | −12 974 / −23 407 kr | −1 352 / −6 261 kr | 86 070 kr | 0 |
| Kurserna varje kväll | 20 av 20 | −18 574 / −25 806 kr | +1 279 / −2 760 kr | 83 671 kr | 0 |

Fälten: `players.<spelare>.weeksWithLoss`, `meanWeekResultSek`, `worstWeekResultSek`, `firstEvening`, `lowestCashSek`, `downgradedOrPending`.

- Den som gör som mentorn säger går plus första veckan i 19 av 20 frön. Den sämsta första kvällen är −2 760 kr, långt från provspelets −12 068 kr.
- Ingen spelare nedgraderas första veckan, och kassan går aldrig under 83 000 kr.
- DJ och springaren varje kväll förlorar varje vecka: DJ:n lönar sig bara en full kväll, och första veckan har färre gäster.
- Kurserna varje kväll ger positiva kvällar, eftersom kurserna står utanför kvällens resultat, men veckan faller med kursernas pris (5 000 kr per dag). Det är beslutet: kurser är investeringar.
- Testet kräver att mentorns spelare aldrig nedgraderas och att kassan håller.

**Avvikelse:** introduktionen och startlånet spelas inte i harnessen; kassan är startkassan. Veckan från bussen (avsnitt 5) spelar spelarens flöde.

**Slumpen och hyran** (samma mätningar som ORDER 290):
- Den bättre spelaren vinner 77,6 % av 1 000 veckor (mål 70–80 %). `randomness.json` `winShare`; ORDER 290: 73,6 %.
- Den rimliga spelaren går plus med 19,2 % av veckointäkten (20 frön), målet är 5–10 %. `rent-check.json` `rows[0].reasonable.meanShare`; ORDER 290: 8,9 % med 10 frön.
- Ökningen kommer av rättelserna: satsningarnas pris dras en gång, notorna tas vid stängningen och baspaketet följer bokningen. Hyran är inte ändrad (F59).
- Den svaga spelaren nedgraderas i vecka 3 i alla 20 frön (`weakDowngradeWeeks`).
- Veckospelarna: `week-players.json`.

## 4. Svenska

På spelarens språk nu:
- **Raketerna:** vinbarens 31 och menyns 9, ur `*.text.sv.draft.json`.
- **Frågebanken** (`activeBankLanguage`).
- **Kvällens texter:** kvällsberättelsen, kollapsen och värdekvotens rader.
- **Satsningarna** och morgonens ändringar ("Du höjde priserna för i dag").
- **Rätter, råvaror och leverantörer** (`strings.catalogue`, 41 namn).
- **Scenarierna vid dörren**, de tre och rollernas namn (`content/scenarios.sv.ts`).
- **Servicerapportens rader i strömmen** (`content/serviceReport.sv.ts`, samma form som den engelska, så att en rad inte kan saknas).
- **Kassabokens rader** och händelseloggens rader.
- **Platsnamnet, ljudknappen och talen.**

Engelska som finns kvar, och varför:
- **Utkast:** raketernas och frågornas svenska text är utkasten som skrevs bredvid den engelska (`"status": "draft"`). De är i spelet men inte granskade.
- **Kriskorten** (`crises.*`) är utkast och inte i spelet.
- **Syns inte i v1:**
  - `ui/RoomCardPanel/deriveActions.ts` (personalens och gästernas handlingar på engelska; panelen visas inte i v1);
  - det gamla lånets ränterad (`reducer.ts`, lånet används inte i v1);
  - värderingens nivånamn (`valuation.ts`; `PlayerPanel` är inte monterad).
- **Bara svenska:** food truckens ansiktsrader (`ui/foodtruck/guestFaces.ts`). Scenen visas inte.

## 5. Spelarens flöde

**Veckan från bussen** i produktionsbygget, på svenska (`scripts/order271-dod-from-start.mjs`, `REPORT_ORDER=order291 GAME_LANG=sv`), med bara spelarens knappar. Utdata `frontend/reports/order291/dod.json` och `dod-*.png`.

Flödet: bussen, samtalet ("Prata"), registreringen, mentorn, Måltidens hus, banken (B0a med food trucken, B0b med vinbaren) och vinbaren. Därefter måndagens service med två raketer genom stegen, och veckan till söndagen och tidningen.
- Alla fem kvällarna går S1 → T2 → R1 → L1 → K1 (`eveningSequences`). Inga sidfel (`errors` tom), 29 fps under servicen (`fpsService`).
- Måndagens resultat: T2 +733 kr (`t2.result`), R1 +733 kr (`r1[result-money].delta`), och erfarenheten +24 (`result-experience`).
- Hållbarheterna: social 5, ekonomisk 6, ekologisk 10 (`r1Levels`). Den ekologiska är 10 fast sopbilen kom (469 kr): de osålda portionerna lades undan till nästa dag och togs till vara med rätt svar (`salvage`). Avgiften kom av de andra fraktionerna, så nivån följer regeln.

Skärmdumparna per punkt:

| Punkt | Bild |
|---|---|
| 1 raketen startar | `numbers-after-05-raket.png`, `dod-30-raket-1-steg-1-fraga.png` |
| 2 råvarorna och täckningsgraden | `dod-48-T2-efter-servicen.png` (råvaror 1 427 kr, 79,0 %) |
| 3 rummet | `classes-vinbar-service.png`, `classes-foodtruck-service.png`, `dod-20-vinbaren-spelarens-kamera.png` |
| 4 skylten | `classes-vinbar-service.png` före (skylten i överkanten), `dod-20-vinbaren-spelarens-kamera.png` efter |
| 5 morgonens HUD | `screens-after-ui-*-02-morgon.png` (sex storlekar) |
| 6 hovringen | `screens-after-ui-*-03-hover.png` |
| 7 satsningarna | `screens-after-ui-1920x1080-02-morgon.png` |
| 8 rummet och personalen | `screens-after-ui-*-04-rummet.png` |
| 9 ljudknappen | `dod-00-startrutan.png` |
| 10 inga engelska rutor | `dod-41-K1-kvallsberattelsen.png`, `dod-43-R1-kvallens-resultat.png` |
| 11 svenskt talformat | `dod-48-T2-efter-servicen.png` ("6 783 kr") |
| 12 knappen | `dod-48-T2-efter-servicen.png` ("För över +733 kr") |
| Inköpen | `numbers-after-00-inkopen.png` |

Efter körningen ändrades två av T2:s texter och lärdomens rubrikrad (commit `a23abdb`):
- flödets rad hette *Personal, DJ och kompetens*; den heter nu *Resten av insatsen*, eftersom kurserna inte längre ingår;
- resultatets underrad säger *Täckningsbidraget minus resten av insatsen*;
- en rubrik som slutar på frågetecken får inget kolon efter sig.

Bilderna ovan visar de gamla texterna. Typecheck, testerna och bygget är gröna med de nya.

## 6. Tester

- `frontend/src/sim/__tests__/order291Playtest.test.ts`:
  - food truckens snittnota per typ;
  - inköpens text och varning, och att baspaketet inte ger varningen;
  - talformatet;
  - raketerna, frågorna, rätterna, satsningarna och scenarierna på svenska;
  - scenariot som läggs undan vid stängningen;
  - kurserna i veckoavräkningen;
  - kontot efter överföringen mot kassan nästa morgon, åtta frön med tio spelminuter på kvällens skärmar.
- `frontend/src/strategic/testHarness/__tests__/order291FirstWeek.test.ts`: första veckan för fyra spelare.
- Ändrade tester:
  - `order289RocketAndFixes` (inköpens text);
  - `economy`, `introduction`, `m2`, `order285EveningResult` och `order290EveningEconomy` (ett resultat, ölkrogen, satsningarnas pris);
  - `order280RentCalibration`: taket borttaget tills F59 är besvarad.
- Hela sviten: 2 232 gröna, 4 överhoppade. Typecheck och bygget gröna.
- Skript: `order291-numbers.mjs` (talen sida vid sida och raketen), `order291-screens.mjs` (skärmarna i sex storlekar), `order291-classes.mjs` (rummet per klass). `order271-dod-from-start.mjs` fick `GAME_LANG`.

## 7. Avvikelser och öppet

- **F60, food trucken.** Den är ett av de två första valen, men den saknar rum i scenen (från 24 m syns en tom plats) och raketbank. Banken erbjuder den med brons i vilken paviljong som helst. Vision Owner behöver välja:
  - (a) vinbaren som enda första val tills food trucken är byggd; eller
  - (b) en order som bygger food truckens plats och en raketbank.
  - Inget är ändrat.
- **F59, hyran.** Den rimliga spelaren går plus med 19,2 %, målet är 5–10 %. En högre hyra gör första veckan svårare; tabellen i avsnitt 3 är underlaget.
- **Punkt 5** återskapades inte exakt. Platsnamnet var rutan bakom HUD:en i provspelets fönster. Ingen överlappning mättes i sex storlekar efter rättelsen, men provspelets fönsterstorlek är okänd.
- **Utkasten:** de svenska raketerna och frågorna är i spelet utan granskning (avsnitt 4).
- **Mätningarnas sparfil:** `numbers-*` och `screens-*` spelar sparfilen från ORDER 284, som saknade dygnets utgångskassa; den sätts nu vid laddning. `numbers-after.json` är körd efter den rättelsen.
- **Nästa morgons 3 kr** (T2:s konto efter 117 214 kr, kassan nästa morgon 117 211 kr) är köksdriften som tickar på morgonen, och räknas till nästa dag.
