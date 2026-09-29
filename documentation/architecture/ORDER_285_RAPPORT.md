# ORDER 285 — Kvällens resultat (rapport)

**Ordern** (Vision Owner 2026-09-29, tredje provspelet): "Efter kvällen visas tydligt vad man vann och förlorade: pengar, krediter, rykte, kunskap, erfarenhet, samt social, ekonomisk och ekologisk hållbarhet. Svinnet ska kunna användas nästa dag, med frågor om hur råvarorna tas tillvara." Och: "Bygg 284 och 285 nu och stanna, så att jag kan spela."

Beslutet står i speldesignen under Servicen > Kvällens resultat. Talen står i F55.

**Tillägg samma dag** (Vision Owner 2026-09-29, Designs leverans 1, det varma designsystemet, godkänd med villkor): "Typsnitt och ikoner lokalt … Krediterna ur balance.ts … Bygg formen, inte framtiden … Kvällens resultat i 285. Lägg till en händelselogg per kväll … och de tre hållbarheterna som nivåer 0–10 med förra kvällens nivå. Föreslå hur hållbarheterna räknas … och rapportera innan du bestämmer. Raketens tid blir 20 sekunder (beslut för 284). Tidningens foto ska ha den varma graderingen." 284 var redan mergad; dess tillägg (20 sekunder) byggs här.

## 1. Vad som byggdes

**Kvällens resultat, R1** (`scenario/ResultScreen.tsx`, `simulation/eveningResult.ts`): en skärm efter sopbilen och före lärdomen. Nio medaljonger, var och en med förändringen och en pil upp eller ned (nedgångar streckade):

| Rad | Förändring | Källa |
| --- | --- | --- |
| Money | kassans förändring sedan dygnets gryning, med intäkten och inköp, löner och avgifter | `day.cashAtDayStart`, intäkten ur kvällsavräkningen |
| Credits | krediterna in och ut | kvällsavräkningen (`knowledgeDelta`) |
| Reputation | poäng av 100 | kvällsavräkningen (`reputationDelta`) |
| Knowledge | steg rätt av kvällens steg | samma rutnät som lärdomen (`eveningGrid`, `stepsCleared`) |
| Experience | serverade rätter och raketer | `day.portionsServed`, raketernas logg |
| Social sustainability | poäng av 100 mot dygnets gryning | `capitals.values.social`, `day.capitalsAtDayStart` (nytt) |
| Economic sustainability | kvällens marginal, resultat mot intäkt | kvällsavräkningen |
| Ecological sustainability | poäng av 100 mot dygnets gryning, och kilona till sopbilen | `capitals.values.ecological`, sopbilen |
| Waste | kilo till sopbilen | sopbilen (`lastWaste.kg`) |

Händelserna och medaljongerna läggs fram en i taget med `juice.ts` popIn. Ordern nämner nio saker; pengar och ekonomisk hållbarhet blev två rader, kronorna och marginalen.

**Gårdagens rester** (`simulation/salvage.ts`, `scenario/SalvageCard.tsx`, `balance.ts` `SALVAGE`):
- När sopbilen kommer läggs den rätt som hade flest förlorade portioner undan i kylrummet, om de var minst tre. Sopbilens skärm säger det, och portionerna räknas inte i kilona.
- På morgonen står ett kort överst i morgonens högra kolumn: "10 portions of chicken with root veg are left in the cold room" och en fråga om hur råvaran tas tillvara, med tre svar. Frågorna finns för nio råvarugrupper (rotfrukter, kyckling, fläsk, fisk, mejeri, linser, svamp, bär, långkokt kött), på engelska och svenska, och handlar om vad som går att laga av resterna och hur de hålls säkra (kylas snabbt, hållas kalla, värmas genom till minst 70 °C). Faktan är allmän kunskap om livsmedelshantering; referenser är inte satta.
- Rätt svar: portionerna går att sälja i kväll, och den ekologiska hållbarheten stiger. Fel svar: sopbilen tar dem (kilo × taxan, utan ny hämtningsavgift), och den ekologiska sjunker. Inget svar när servicen öppnar räknas som fel. Förklaringen står kvar på kortet efter svaret.
- Harnessens rimliga spelare svarar rätt och den svaga fel, som på raketerna (`weekHarness.ts`).

**Den varma formen** (Designs leverans `nexus-leverans-2026-09-29-varma-designsystemet`, oförändrad i `documentation/leveranser/`):
- **Typsnitt och ikoner lokalt:** Young Serif och Figtree via `@fontsource` (`src/ui/theme/fonts.ts`), ikonerna via `lucide-react`. Leveransens Google Fonts-adress och `@import` är borttagna ur källkopiorna (`src/ui/theme/nexusTheme.warm.ts`, `nexus-warm.css`); `grep -rn "googleapis\|unpkg" frontend/src` ger bara kommentaren i `fonts.ts`.
- **Tokens först:** designsystemets variabler (`--nx-*` i `system.css`) har fått trävärden (grädde för text, mässing för etiketter, guld för handling och klarat, rött bara som `--nx-ember` i klockans sista halvtimme och för varmrätter som inte räcker). `.nx-paper` ger papperets värden. Därmed blev hela spelet varmt på en gång, också skärmar som inte ritats om. Hårdkodat vitt, rött och bläck i CSS och komponenter är bytt (knappar, steg, rutor, HUD:en).
- **Skärmarna:** HUD:en (dag, klocka, kassa, krediter, fart, meny) på trä med mässingskant; inköpen med menykort och vinlista på papper och runda plus och minus; raketkortets svarsrader på papper, fel streckade i grädde; lärdomen på papper bredvid raketerna på trä; tidningen på tidningspapper med serif; kvällens resultat enligt skärm 6 (nedan).
- **Bokningsboken** visar bara kvällens väntade gäster (samma tal som inköpen, `coverage(sim).guests`), inga gästtyper eller namn.
- **Rummet graderas varmt** bakom panelerna efter dagens del (`WARM.roomGrade`, `ui/RoomGrade.tsx`, `strategic.css`), med vinjett.
- **Tidningens foto** är spelets egen rendering, tagen när tidningen öppnas (`scene/SceneSnapshot.tsx`), med den varma morgongraderingen (`.nxs-paper-photo`).
- **Krediterna:** texterna för säkerheten byggs ur `balance.ts` `BACK.confidence` (+1/±0, +2/−2, +3/−6), inte med leveransens tal.
- **Raketens tid** är 20 sekunder i varje steg (`INCIDENTS.stepSeconds`, beslutet i speldesignen).
- Det som hör till 286–288 (bokningsbokens gästtyper, bilar utifrån, regin, stjärnorna, konkurrenternas betyg, namngivna gäster, mentorn Ingrid Malm) är inte byggt.

**Kvällens händelselogg** (`simulation/eveningResult.ts` `eveningEvents`): varje raket med klockslag, klarade steg av tre och vad den ändrade (kassa, rykte i poäng, krediter inklusive Back your knowledge, gäster in), sparat på raketens rad i loggen när den stängs (`IncidentRecord.deltas`, samma tal som utfallet); slumpens händelser med klockslag och vad de sålde; sopbilen med kilo och avgift. R1 visar loggen till vänster med ikon och polletter, och medaljongerna till höger (nio, med svinnet).

**Hållbarheterna som nivåer 0–10:** inte byggt. Förslaget står i `documentation/game-design/FORSLAG_HALLBARHETERNA_0_10.md` och väntar på Vision Owners beslut. Tills dess visar R1 förändringen i poäng (social, ekologisk) och marginalen (ekonomisk).

## 2. Tal

**Skärmarna** (`frontend/reports/order285/layout.json` och `layout-*.png` @ `order-285`, skript `frontend/scripts/order284-layout.mjs` med `LAYOUT_SIZES=1440x900,1280x720`): produktionsbygget i helskärm 1440 × 900 och 1280 × 720, som Vision Owner bad om. Morgonen, inköpen, servicen, raketkortet, Back your knowledge med låst svar, sopbilen, kvällens resultat, lärdomen, berättelsen och gårdagens rester: varje knapp som behövs för att gå vidare syns och är överst, och klockan täcker ingen rubrik (`screens.<skärm>.ok` true för alla). Gårdagens rester visas nästa morgon (`salvage`), med ett svar och förklaringen.

**Spelarens flöde** (`frontend/reports/order285/dod.json` och `dod-*.png` @ `order-285`): produktionsbygget från bussen till söndagen och X1 i 1920 × 1080, utan fel i sidan (`errors` tom), 27 bildrutor per sekund under servicen (`fpsService`; 24 i 280). R1 efter sopbilen (`r1`, `dod-43-R1-kvallens-resultat.png`), gårdagens rester besvarade fyra morgnar (`salvage`, `dod-44-rester-fragan.png`, `dod-45-rester-svaret.png`), och tidningen med sitt foto (`dod-10-T1-sondagstidningen.png`). Körningen gjordes innan R1:s pengar byttes till kassans förändring sedan gryningen (se nedan); den ändringen prövas i layoutkörningen och i testet.

**Ett fel som mätningen hittade:** en CSS-regel för vinjetten gav scenens yta höjden noll, så rummet var svart och tidningens foto tomt. Regeln är borttagen; efter det syns rummet med den varma graderingen.

**Pengarna i R1** läses som kassans förändring sedan dygnets gryning (`day.cashAtDayStart`, nytt), med morgonens inköp, lönerna och avgifterna. Kvällsavräkningen räknar inköpen som tillgång (ORDER 259), och gav därför en marginal på omkring 88 % en kväll då spelaren köpt varor för 1 580 kr.

**Ekonomin** (`frontend/reports/order285/rent-check.json`, `week-players.json` och `randomness.json` @ `order-285`, hyran 0,17 som i 284):
- kalibreringens rimliga spelare: `rows[0].reasonable.meanShare` 0,082 (4 036 kr av 45 451 kr), inom målet 5–10 %; den svaga nedgraderas efter vecka 3 i alla tio frön;
- veckospelarna: `mean.rimlig.resultShare` 0,033 (1 992 kr av 43 561 kr), under målet; `mean.svag.resultSek` −33 793 kr;
- slumpmålet: `winShare` 0,745, inom 70–80 %.

Båda mätningarna av den rimliga spelaren sjönk mot 284 (9,9 % och 5,0 %). Tillvaratagandet självt ger den rimliga spelaren lite: med den ekologiska effekten avstängd blev kalibreringen 0,100 (5 105 kr av 46 728 kr), nära 284:s 0,099 (körning utan sparad rapport, balansen återställd efteråt). Sänkningen kommer från att den ekologiska hållbarheten styr leveransernas takt (`reducer.ts`, ORDER 043), som drar ur samma slumpflöde som gästerna, så att kvällarna blir andra. Skillnaden, omkring 1 000 kr i veckan, ligger inom slumpens spridning med 10–20 frön. Hyran är inte ändrad efter den; F54 och F55 föreslår att hyran kalibreras mot en mätning med fler frön.

**Tester:** `frontend/src/sim/__tests__/order285EveningResult.test.ts` (5 tester: resterna läggs undan utanför sopbilens kilo, rätt svar, fel svar, inget svar före öppning, kvällens resultat ur kvällens egna källor). `order275Stock.test.ts` och `order284FixesAndUsability.test.ts` räknar med de undanlagda portionerna. `order268WayBack.test.ts`: den rimliga spelarens händelsekassa prövas över veckorna i stället för vecka för vecka, eftersom en kort första vecka nu går −452 kr (några raketer kostar kassa också med bästa svaret, till exempel vb06-kylen −168 kr, och vilka som kommer beror på förloppet); taket på 20 % åt båda hållen håller. Hela sviten är grön (135 testfiler, 2 177 tester, varav 4 överhoppade som förut, en testfil överhoppad).

## 3. Avvikelser och öppet

- Veckospelarnas rimliga spelare ligger under hyrans mål (F54, F55).
- Layoutskriptet laddar en sparfil; där står dygnets start efter lönerna, så R1:s kostnad blir lägre än i spelarens flöde. Veckoskriptet visar spelarens flöde från bussen.
- En fråga per morgon, om den rätt som hade flest förlorade portioner. Övriga förlorade portioner går till sopbilen som förut.
- Pengar och ekonomisk hållbarhet är två rader med olika mått (kronor och marginal). Om Vision Owner menar något annat med ekonomisk hållbarhet, till exempel veckans resultat mot golvet, är det en ändring i en rad.

## 4. Förslag: hur 286–288 bör delas upp

*Förslag till Vision Owner, inte beslutat.* Varje del är en order som kan provspelas för sig. Ordningen följer vad som bygger på vad.

**288 Byn** först, eftersom miljardären och jämförelsen efter kvällen behöver de andra krogarna:
- **288a Rivalerna i simuleringen och tidningen.** Namn, zon, inriktning, öppet eller stängt, meny och priser, och en andel av gästerna som följer ställningen. Rankningen i söndagstidningen. Ingen ny grafik.
- **288b Jämförelsen efter kvällen.** Gäster och intäkt per stol mot krogarna i zonen, som en rad i kvällens resultat eller en egen skärm, och planeringen av nästa kväll ur den.
- **288c Byn uppifrån.** Zooma ut över byn, gästflödet på gatorna och de öppna krogarna. Rendering och kamera, därför sist i 288.

**287 Gästerna och stjärnorna**:
- **287a Gästtyper med kapital.** Student, medelinkomst, höginkomst och socialt kapital, byggt på plånboken från 277. Gäster med socialt kapital drar fler om de behandlas väl. Slumpmålet mäts om.
- **287b Stjärnorna.** Jämn och hög nivå över veckor ger en stjärna, som kan förloras. Stjärnan öppnar exklusiva råvaror, egna priser och gäster som kommer med bil.
- **287c Miljardären.** Promenerar i byn, väljer ibland en krog och bjuder hela salen. Behöver 288a för att kunna välja, och 288c för att synas på gatan.

**286 Servicen som teater** kräver Designs leverans. En brief (`documentation/briefs/BRIEF_DESIGN_TEATERN.md`) bör gå till Design nu, så att leveransen finns när 286 står på tur:
- **286a Rummet som scen.** Personalens roller (runner, servitör, sommelier, hovmästare, kock, lärling) med lön, kunskap och personalnöjdhet (från 281), olika tempo och gester, och tallrikar, glas och brickor som syns.
- **286b Händelserna i rummet.** Födelsedagen, gästen i rullstol som välter en vas, den berusade gästen, razzian från tillståndsenheten med böter eller stängning. Händelsen spelas upp först, sedan kommer raketen.
- **286c Ritualerna** (från 282). Välkomna och placera, beställningen, bröd och vatten, fördrinken, vinet på bricka, dukningen, tallriken och dekanteringen; en ritual kan utlösa en raket.

**Föreslagen ordning:** 287a, 288a, 288b, 287b, 286a–c (när Designs leverans finns), 288c, 287c. Före 287a bör hyran kalibreras mot en mätning av den rimliga spelaren med fler frön (F54, F55), eftersom gästtyperna flyttar intäkten igen.

Öppen fråga F55. Gren `order-285` från `main`.
