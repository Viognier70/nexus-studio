# ORDER 323 — Efter provspel 2026-10-09 kväll (rapport)

Anders 2026-10-09, provspel av `6124209e`. Tio punkter. Gren `order-323` från `main` (`6124209e`). Alla artefakter nedan ligger i `frontend/reports/order323/` @ `order-323` (mergad till `main` i slutet av ordern).

Kontrollerna körs i produktionsbygget (`vite build` + `vite preview`) på svenska, utom fönstren och gatorna som läser kameran och räknarna, som bara finns i vite-dev-servern (`__nxCamera`, `__nxTraffic`, `__nxPeds`). Det redovisas vid varje punkt.

## 1. Språket

- Spelet startar på svenska: `DEFAULT_LANG = 'sv'` (`src/content/language.ts`). Engelska bara om spelaren väljer det i menyn (valet sparas i `nexus.lang`). Webbläsarens språk läses inte (ingen `navigator.language` i koden).
- Testsviten skrevs mot engelskan som standard. Den sätter nu engelskan före varje testfil (`src/test/testLanguage.ts`, `vitest.config.ts setupFiles`), så att 68 tester inte behövde skrivas om. `order273Language.test.ts` prövar att standarden är svenska.
- CLAUDE.md regel 7 är uppdaterad. **Flaggat:** `documentation/foundation/vision/NEXUS_SPELDESIGN_V1.md` (Språk och målgrupp) säger fortfarande "allt i spelet är på engelska". Den filen är projektledningens; förslag: lägg till att spelet startar på svenska och att engelska väljs i menyn (Anders 2026-10-09).

## 2. Kort som inte får plats

**Ändringen.**
- Frågekortet (`IncidentPanel.tsx`): huvudet överst och knapparna/bandet nederst står fast; innehållet däremellan rullar i `.nx-rocket-body`. Förut rullade hela kortet.
- Kvällens skärmar: lärdomen och berättelsen (`EveningBar.tsx`), fikat (`FikaScreen.tsx`), sopbilen (`WasteScreen.tsx`): innehållet i `.nx-evening-scroll`, foten utanför det som rullar. Förut rullade hela skärmen och foten låg `sticky` ovanpå innehållet.
- Resultatet (`ResultScreen.tsx`): knappen flyttad ut ur rutnätet; rutnätet rullar, knappen står fast. Byn i kväll (`CompareScreen.tsx`): tabellen rullar i `.nx-cmp-scroll`.
- Resultatet, sopbilen och Byn i kväll börjar under HUD:ens nederkant (`--nx-hud-bottom`): i 1024 × 600 låg klockan över "Vad kvällen gav".
- Kassarutan: högerhörnet (`.gb-topright`, kassan, farten, menyn) döljs medan fikat står, som under överföringen (`service.css`).
- CSS: slutet av `src/strategic/ui/service/service.css` (ORDER 323 §2).

**Kontrollen.** `scripts/order323-kort.mjs`, spelarens flöde: sparfilen måndag vecka 2 i vinbaren, kvällen i 4× till frågekortet, kvällens skärmar i 1× till morgonen, i 1024 × 600, 1180 × 660, 1280 × 720 och 1440 × 900. Per kort mäts text som något ligger över (textens egna rader, `Range.getClientRects`, tre punkter per rad, bara där texten syns inom sina rullande föräldrar), om knapparna står i bild utanför det som rullar, och om sidan rullar.
- Också foodtrucken: provspelet i vagnen, kvällen i 2× till fikat (`vagnen-fikat-fragan`, `vagnen-fikat-svaret`).
- Före (koden på `ff806d16`, före §2, §7 och §10, worktree): `reports/order323/kort/fore/kort.json` och `fore-vagnen/kort.json`, `errors`:
  - resultatet: knapparna låg över text och stod inte fast, i alla fyra storlekarna;
  - fikat efter svaret: knapparna låg över effekterna, i vinbaren i 1180 × 660 och 1280 × 720, i vagnen i alla fyra storlekarna;
  - Byn i kväll: förklaringen på rubrikens rad, i alla fyra;
  - förberedelseraden i rummets mitt vid Krogen (§10).
- Efter: `reports/order323/kort/efter/kort.json`: `ok: true`, `errors: []`; inget täckt, knapparna fast nederst i alla kort och storlekar, också i vagnen. Bilderna `<skärm>-<storlek>.png` bredvid.
- Frågekortet hade inget fel i kvällens kort (fyra svar). Ändringen gäller kort som inte får plats; med fyra långa svar och en ledtråd rullar nu bara mittdelen.
- Layoutkontrollen (`scripts/order300-layout.mjs`) har 1024 × 600 och 1180 × 660 i sina storlekar (`LAYOUT_SIZES`). Den kördes inte i den här ordern; se Återstår.

**Kassarutan över fikats rubrik.** Gick inte att återskapa i vinbaren: fikats ruta (z 60) låg redan över högerhörnet (z 45). Anders såg felet; hur är inte känt. Rutan döljs nu medan fikat står, och kontrollen mäter fikats rubrik mot HUD:en (`covered`, "utanför kortet"). Vagnens fika mäts i samma fil (`vagnen-fikat-*`), utan träffar.

## 3. Kvitt eller dubbelt

- Pyramiden ritas i en tät ram kring våningarna (`KnowledgePyramid.tsx PYRAMID_CROP`, `crop`), så att den fyller radens höjd: 9,4 vh som stegrutorna (`service.css .nx-stake-pyr`, 11,75 × 9,4 vh). Förut tog ramen 12 % luft ovanför och under.
- "När tiden går ut stannar du" står bara under valen (`PyramidMoment.tsx`). Raden i kortet till vänster är borttagen (`IncidentPanel.tsx`).

## 4. Byggnaderna: fönstren

**Fyndet.** Husen som OsmBuildings ritar hade fönster från två system på olika platser:
- Dagens fönster (lådor) stod på husets omskrivna rektangel (OBB), inte på väggarna. Där väggen inte låg på rektangeln hamnade fönstret inne i huset, och lådans kant stack ut genom väggen.
- Kvällens rutor (`VillageWindows`) lades på de odelade OSM-polygonernas kanter, på fasta höjder (1,6 och 4,4 m), bredvid dagens fönster.

**Ändringen.** En funktion för fönstren, på de ritade väggarna (`OsmBuildings.tsx facadeWindowsOf`, `wallEdges`): polygonens kanter med normalen utåt prövad per kant, en rad per våning mellan sockeln och takfoten. Kvällens rutor tänder samma fönster (`VillageWindows.tsx buildWindows`, samma ritade hus via `drawnOsmBuildings`).

**Mätningen** (`src/strategic/scene/__tests__/order323Fonster.test.ts`, samma funktioner som renderingen; `ORDER323_FONSTER=<tag>` skriver filen):
- Före: `reports/order323/fonster/fore/matning.json` (koden på `984457e6` med bara exporterna tillagda, worktree): `OsmBuildings.inne` 770 av 1 005 lådfönster inne i huset; `VillageWindows.besideDayWindow` 1 618 kvällsrutor bredvid dagens fönster, på 52 hus.
- Efter: `reports/order323/fonster/efter/matning.json`: `inne` 0, `svävar` 0, `vid marken` 0, `över takfoten` 0, `besideDayWindow` 0.
- Testet kräver att inget fönster svävar, är utan hus, går över takfoten eller ligger vid marken, att inget ligger inne i huset och att kvällens rutor ligger på dagens fönster.

**Bilderna** (`scripts/order323-fonster.mjs`, dev-servern): provspelet i vinbaren, kvällen, spelaren trycker C (Kvarterets bild `kvarteret.png`). Sedan tio hus närmast Kvarterets mitt, fem lådhus (OsmBuildings) och fem bostadshus (ProceduralFacades), var och en från sin längsta vägg utifrån på 45 m och 0,45 rad. Avståndet och vinkeln är närmare och lägre än Kvarterets, för att fasaderna ska synas; det är samma rendering, men inte ett läge spelaren når med C (med mushjulet når spelaren det).
- `reports/order323/fonster/fore/` (koden före, `984457e6`, worktree), `efter/`, och sida vid sida i `jamfor/` (`hus-01 … hus-10`, `kvarteret.png`). Husen och vyerna i `fore/hus.json` och `efter/hus.json`.
- Bostadshusen (ProceduralFacades) har sina egna fönster inom 70 m och ändrades inte; de är med i bilderna som jämförelse.

## 5. Fikat följer platsen

- Varje dilemma har en plats (`content/fika/dilemmas.ts places`): vinbarens tolv `wine`, fem nya `truck`. `eligibleDilemmas` tar bara platsens (`fikaPlaceOf`: foodtrucken → vagnen; vinbaren, och bistron som är vinbarens klass ombyggd → vinbaren).
- I vagnen frågar Nils, medhjälparen (`'truck.assistant.name'`; `FIKA_PEOPLE` `assistant`, i laget servitören). Bordet i rummet (`FikaAtTable`) visas bara i vinbaren och bistron.
- Vagnens dilemman (`content/fikaStrings.ts`, svenska och engelska; utlösare ur kvällen vid luckan): kylboxen i solen (⚖, lagtexten dold tills den granskats), kön som gick, dricksen, benen och kylan i vagnen (⚖, dold), kortläsaren. Inget om bokningar, bord eller ett fullt rum.
- **Utkast:** texterna är skrivna för ordern och inte granskade av Anders.
- Testet `src/sim/__tests__/order323Fikat.test.ts`: platsen ur klassen; i vagnen bara vagnens dilemman och Nils, aldrig `fika-bordet`; i vinbaren aldrig Nils; 60 kvällar per plats med rätt plats; Nils i båda språken; vagnens texter utan bokning, bord, sällskap, hovmästare, sommelier och bartender.
- I webbläsaren, i spelarens flöde i foodtrucken: `reports/order323/kort/efter/kort.json` `truck`: "Nils, medhjälpare i vagnen, kommer fram med koppen.", dilemmat `fika-vagn-kylboxen`; bilderna `efter/vagnen-fikat-*.png`. En körning före §5 i webbläsaren finns inte (bygget för "före" i kortkontrollen hade redan §5); hur vinbarens dilemman kom i vagnen visar testet.

## 6. Gatorna

**Gående** (`scene/OsmPedestrians.tsx`, 110 i byn): ben som två egna instanser per figur som svingar med sträckan (`scene/village/streetGait.ts`); farten i meter per sekund, 1,05–1,5 m/s (förut en andel av vägen per sekund, så att en gående på en lång väg gled i upp till 10 m/s); var 12–40 s stannar en gående och sällskapet 2–6 s; i en paus står benen raka och kroppen stilla.

**Kvällens sällskap** (`scene/village/VillageLife.tsx`): samma ben, i pauserna, vid dörren och vid luckan raka. Kvällens klocka går fort (12 m per spelminut), så kadensen har ett tak (2,2 steg per sekund); över taket glider fötterna lite hellre än att benen sprätter.

**Folket vid landmärkena** (`scene/LandmarkGatherers.tsx`): flyttar sig inte längre (förut gled de utan ben till en ny plats var sjunde sekund); de vänder sig ibland.

**Bilar** (`scene/OsmTraffic.tsx`, 24): farten i meter per sekund ur vägens hastighetsgräns (högst 50 km/h i byn), platserna längs vägen ur `scene/trafficStops.ts`:
- korsning: en annan bilväg skär vägen eller slutar på den; bilen bromsar in till 35 % (minst 2,5 m/s);
- övergångsställe: en gångväg som inte är bilväg (gångbana, stig) skär vägen eller slutar på den; står en gående inom 7 m stannar bilen 3,5 m före, högst 8 s; annars 50 %;
- vid vägens ände, där bilen vänder, 2 m/s.

Kvällens bilar till parkeringen (`VillageLife`) saktar in i svängarna (rutten vrider sig mer än 35°), vid övergångsställena i gångnätet där någon står, och mot parkeringen. Bussen kör efter tidtabellen och rörs inte.

**Kontrollen.**
- Testet `src/strategic/__tests__/order323Gatan.test.ts`.
- I spelarens flöde (`scripts/order323-gatan.mjs`, dev-servern för räknarna; provspelet i vinbaren, kvällen, Kvarteret C, 60 s): `reports/order323/gatan/gatan.json` `summary`. Bilarna: i 12 av 120 prov stod en bil vid ett övergångsställe, och i snitt saktade drygt 5 av 24 bilar in. De gående: 5–30 av 110 stod still.
- Bilderna: `kvarteret.png`, `gatan.png`, `gaende-1…3.png` (en gående på 22 m, tre bilder 250 ms isär; benen i olika lägen).
- Ansikten och gester väntar på Design (D11, `documentation/briefs/BRIEF_DESIGN_D11_ANSIKTEN_OCH_GESTER.md`).

## 7. Byn i kväll efter kvällen

- Rubriken och placeringen står på första raden, förklaringen på en egen rad under dem (`CompareScreen.tsx`, `host.css .nx-cmp-head`). Förut tre kolumner, där förklaringen fick det som blev över: ett ord per rad på engelska.
- Kolumnerna: krogens namn 34 %, talen 22 % var (`table-layout: fixed`).
- "the band" → "The village counts the guests during the evening …"; svenska "Byn räknar gästerna under kvällen. …" (`cmp.note`).
- "Vi" / "Us" → "Din krog" / "Your place" (`rival.us`).
- Kontrollen: `reports/order323/kort/efter/kort.json`, `byn-i-kvall` `compare`: förklaringen på en rad och inte på rubrikens eller placeringens rad, kolumnerna 205/133/133/133 px i 1024 × 600 till 289/187/187/187 px i 1440 × 900, etiketten "Din krog". Mätt på svenska; den engelska texten mättes inte i webbläsaren.

**Felöversättningarna.** Alla engelska spelartexter gicks igenom mot svenskan (nexusStrings, fika-, prov-, design- och andra tabeller, situationernas och frågornas JSON; omkring 7 600 strängar). Rättat i den här ordern, där betydelsen var fel:

| Var | Förut | Nu |
|---|---|---|
| `cmp.note` | During the evening the band counts guests | The village counts the guests during the evening |
| `rival.us` | Us | Your place |
| `ladder.line.en.vinbar` | I hear you have been taking money | I hear the money has been coming in |
| `calm.evening` | your name is still small in the village | your reputation in the village is still low |
| `economy.topics.gastronomiskateatern` | the whole | the meal as a whole |
| `legacy.scaleDown.closeLunchDesc` | the room's regular tables notice the door | the regulars notice the closed door |
| `legacy.scaleDown.body` | when the pass is bleeding | when service is losing money |
| `rival.overtake` | Past {name} | Overtook {name} |
| `knowledge.examDone` | Platinum is taken | Platinum earned |
| `rocket.card.stepUnreached` | Locked | Not reached |
| `shop.inSlot` | In tomorrow | Set for tomorrow |
| `villageNow.close` | Fold (B) | Collapse (B) |
| `introduction.steps.exam` | six right gives bronze | six correct answers earn bronze |
| `activityText.book-dj` | Buy wine for it | Stock up on wine |
| `shop.course`, `guestTypes.book.student`, `paper.who.student`, d6 `asa.line.welcome`, serviceMode `cost.skills.sub` | Måltidens hus | the House of the Meal (regel 7) |
| eventStrings `event.bday.a2_4` | the bar runway | the walkway by the bar |
| eventStrings `event.drunk.a3_4`, vinbar vb34 | he's only had water since | since he's only had water |
| vinbar vb35 (fyra varianter, rätt svar) | our own checks | the self-monitoring plan (som förklaringen) |
| menu mn01 | Deer wants a wine | Venison wants a wine |
| menu mn09 | The ale house | The Brewpub |
| situationer320 ft10 | The connection is far more common | A dropped connection is far more common |
| situationer320 ft12 | Careful, but out by the tables is fine | Overly cautious: out by the tables is fine |

**Listat, inte rättat** (val av ord som Anders eller Design äger, svenska fel, eller text som prövas mot en källfil):
- Samma svenska term med olika engelska namn: kassa (Cash / Takings / the till / the account), ork och trivsel (Stamina/Energy, Wellbeing/Morale), Kvarteret (The District / Quarter / The block), krogen (the bar / Your place), satsningar (Initiatives / Investments), dryckeslistan (Wine list / drinks list), vagn (Van / truck, `cmp.van`), sopbilen (refuse truck / bin lorry), golvet (the floor, krockar med matsalens golv), "kr" i engelsk text där resten skriver "SEK n", två HUD-rubriker som båda heter "Tonight" (`hud.feed`, `cashCounter.tillLabel`), roller (head waiter / Maître d', cook / chef, kitchen porter / dishwasher), "grip" för grepp (d8Strings; krockar med "the double grip"), "founded" mot "grounded" i fikats bedömning.
- Onaturlig engelska utan fel betydelse: `ladder.truckMenu` (as the queue goes), `guests.lost` (one more), `morningBuy.less/more`, `newspaper.reviewTitleBad` och `simEvent.cutShort` (did not hold), salvage `options.b`, `village.compare.place` (came 3 of 7), `rules.rule1` (accounts → settlements), `legacy`/fika `wellbeingUp/Down` (feels better), vinbar vb07, vb21, vb29, vb32, vb22, vb40, nyfikna n03 och n06, foodtruck ft02, ft03, ft05, ft08, ft11, `pyramid.full.sub` (räknar fyra, säger tre).
- I frågebanken (`bank.text.en.json`, prövas mot källfilen i dokumentationen): stensota-brons-02 "well-hung rib-eye" (bör vara "well-aged"), kalastorget-brons-06, stensota-brons-10; i utkasten somm-dg2, somm-h2.
- Svenska fel som syntes vid jämförelsen: mn02 "vitt glas" (vidt), ft06 "Kyler dem i varmhållningen", ft13 "nästan hälften så mycket" (13 av 23 kr är 57 %), somm-h7 "mustig", nexusStrings "Måltidbiblioteket".

## 8. Provspelets namnfält

- **Varför krogen hette "musik":** fältet förifylldes med namnet i det senast sparade spelet på samma adress (`provState.ts savedBusinessName`, ORDER 322 C), också autosparningar. "musik" var alltså namnet i ett vanligt spel som sparats i samma webbläsare, inte något spelaren skrev i provspelet. Webbläsarens lagring går inte att läsa härifrån, så vilket spel det var är inte känt.
- **Ändringen:** fältet är tomt, med Hyttgrillen som platshållare; krogen heter det spelaren skriver, och ett tomt fält ger Hyttgrillen (`provBusinessName`). `savedBusinessName` är borttagen, och fältet har `autoComplete="off"`.
- **Flaggat:** det här ersätter ORDER 322 C (namnet ur det senast sparade spelet).
- Testerna: `order322.test.tsx` (namnet), `order321ProvStart.test.tsx` (tomt fält, platshållaren).

## 9. Bistron: föremålen på borden

**Fyndet.**
- Flaskorna i baren placerades alltid vid vinbarens bardisk (`theatreStage.ts BAR_BOTTLES`, ur `WINE_BAR_PLAN`), också i bistron, där den disken inte finns. De stod på 1,1 m höjd bredvid bistrons bord för fyra.
- Karaffen i Karaffen (`DecanterAtLounge`) stod vid vinbarens lounge B, också i bistron.
- Ägarbokens föremål spreds längs bordet utan gräns; plats 3 och uppåt hamnade utanför ett bord för fyra.
- Ytornas höjd (`SURFACE_HEIGHT`) var skivans mitt, inte dess ovansida: föremålen stod 2,5 cm ned i borden och 5 cm ned i disken.

**Ändringen.**
- Föremålen står på skivorna som rummet ritar (`theatreStage.ts propSurfaces`, ur `planRects`): på bistrons bar i bistron, längs skivans långsida och innanför kanten (`spotOnSurface`). Rummet byggs om per layout och dukningen görs om med det, så föremålen följer borden.
- Karaffen i Karaffen visas bara där loungen finns.
- `SURFACE_HEIGHT` är skivornas ovansida.

**Testet** `src/strategic/scene/__tests__/order323Bordet.test.ts`, båda rummen: flaskorna, karafferna och ägarbokens glas, tallrikar och flaskor (plats 0–5 vid varje sällskap) står på en skiva, högst 5 mm från ovansidan; ljusen likaså; i bistron står ingen flaska där vinbarens disk stod.

## 10. Panelerna vid Krogen (Z)

- På nivån Krogen (`body[data-level='room']`) fälls förberedelseraden ihop till sin rubrik (hela texten i `title`), och Byn i kväll före öppningen blir en rad. Båda tar bara den bredd de behöver; förut tog de klockans och kassans bredd.
- Kontrollen (`scripts/order323-kort.mjs`, `krogen-forberedelser` och `krogen-servicen`): ingen panel får skära rektangeln 40 % × 40 % mitt i bilden.
  - Före: förberedelseraden låg i mitten i alla fyra storlekarna (`fore/kort.json`).
  - Efter: inga paneler i mitten (`efter/kort.json`).
  - `hudShare` (panelernas andel av bilden) under förberedelserna: före 0,180 / 0,171 / 0,153 / 0,141, efter 0,112 / 0,107 / 0,105 / 0,097 (1024 × 600 → 1440 × 900).

## Tester och bygget

- Hela sviten: 2739 gröna, 1 förväntat fel, 19 överhoppade (`npx vitest run`, före sista commit). Typecheck och bygget gröna.
- Nya tester: `order323Gatan.test.ts`, `order323Bordet.test.ts`, `order323Fonster.test.ts`, `order323Fikat.test.ts`.

## Återstår

- `scripts/order300-layout.mjs` kördes inte i sju storlekar i den här ordern. Den kördes efteråt (323b, nedan): fel i 1180 × 660 och 1024 × 600.
- Vagnens fem dilemman behöver Anders granskning (text och bedömning). Lagtexterna i två av dem väntar på granskaren.
- Termvalen och de onaturliga raderna i listan under §7.
- `NEXUS_SPELDESIGN_V1.md` (§1, flaggat; ändrat i 323b).
- D11 (ansikten och gester) från Design, inbyggt i en senare order.

## Efter ordern: Anders beslut 2026-10-10 (323b)

1. **Språket i specen.** `documentation/foundation/vision/NEXUS_SPELDESIGN_V1.md` > Språk och målgrupp säger nu att spelet startar på svenska och att engelska är ett val i menyn. Beslutet 2026-09-28 om engelska står kvar, märkt som ersatt. CLAUDE.md regel 7 följer med. Ändringen i foundation gjordes på Anders uppdrag.
2. **Granskningsfilen.** `documentation/blueprints/FÖR_GRANSKNING_323.md` innehåller vagnens fem dilemman på svenska, med svar, nivåer, följder, förklaringar och lagtexter. Texterna är utdragna ur `fikaStrings.ts` och `dilemmas.ts` med ett skript och inte skrivna av för hand. Där finns också termvalen, den onaturliga engelskan, frågebanken och de svenska felen, med förslag. Filen tar upp en fråga till granskaren: kylboxens svar A kostar 600 kr (`discardSomeGoodsSek`), men svaret slänger allt som legat varmt.
3. **Layoutkontrollen i sju storlekar** (`scripts/order300-layout.mjs`, produktionsbygget, svenska; utdata `frontend/reports/order323b/layout.json`):
   - **1280 × 720 och större**: alla 16 skärmar godkända i alla fem storlekarna.
   - **1180 × 660**: 4 av 16 skärmar underkända, alla av samma skäl. Byn och Gatan före öppning, servicen och statusläget: panelflikarna (Lagret, Kvällen, Rummet) ligger över kameraknapparna, 1 155 px² (`overlaps` `camera-buttons` × `service-tabs`). Knappen som vrider kameran åt vänster syns inte (`layout-servicen-1180x660.png`).
   - **1024 × 600**: 13 av 16 skärmar underkända:
     - samma överlappning, 5 319 px², och under servicen dessutom stämningsmätaren över hastighetsknapparna, 495 px²;
     - texten under 12 px: raketens "Situation 1 i kväll" 10,7 px, morgonens och inköpens underrader 11,7 px, avsändarens "Campus" 11,9 px;
     - en paviljong i morgonens lista syns inte utan att listan rullas (`shelfHidden`) i öppningen, regelkortet, mentorn, första morgonen och reglerna.
   - Godkända i alla sju storlekarna: startskärmen, registreringen och fokusläget.
   - Inga sidfel (`errors: []`). Fyra bilder ligger i `reports/order323b/`; de övriga togs bort för att inte checka in 47 MB.
   - Inget av detta är rättat. Det föreslås som en egen order.
4. De tre bakgrundsuppgifterna från ordern, som väntade på foodtruckens körning, är stängda.
