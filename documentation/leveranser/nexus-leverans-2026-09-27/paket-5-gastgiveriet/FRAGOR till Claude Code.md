# Frågor till Claude Code — innan de fem rummen monteras

**Projekt** nexus-studio · strategiska spåret
**Gäller** `restaurantRoom.ts`, `brewpubRoom.ts`, `wineBarRoom.ts`,
`innRoom.ts`, `foodTruckRoom.ts`, `figureRig.ts`, `figureProps.ts`,
`silhouetteContrast.zones.ts`

Åtta order är skrivna och alla filer är mätta. Det som står kvar är inte
geometri — det är beslut som bara ni kan fatta, eftersom de rör
simuleringen, reduceraren och repots struktur.

Frågorna är sorterade efter vad de blockerar. **1–4 blockerar montering
över huvud taget.** 5–9 blockerar en funktion var. 10–13 är
arkitekturval där jag har en åsikt men inte sista ordet.

---

## Blockerar all montering

### 1. Var kommer verksamhetsklasserna in?

`BusinessClass` saknar `'ölkrog'`, `'vinbar'` och `'gästgiveri'`. Inget
av de tre rummen kan väljas förrän klassen finns med rätt
`capacityFor` (20, 20, 100).

- Lägger ni till dem i samma ändring som monteringen, eller är det en
  egen order som ska gå först?
- `foodtruck` finns redan men har `businessHasSeats === false`. Är det
  avsiktligt permanent, eller en följd av att klassen aldrig fick en
  matsal?

### 2. Hur får ett rum sin plats i världen?

De fyra rummen placeras med byggnadens OBB, som `interiorLayout.ts`
räknar fram för spelarens byggnad. Men:

- Gästgiveriet mäter 51,85 × 51,50 m medan landmärket
  `gry-gastgivaregard-01` har fotavtryck 28 × 18. Ska landmärket växa,
  eller ska gård och längor deklareras som en egen volym?
- Food trucken har ingen OBB alls och ingen kod ger den en
  placeringspunkt eller kurs. Torget är den uppenbara kandidaten — men
  vem pekar ut den, och i vilken fil?

### 3. Restaurangen har två matsalar i drift. Vilken tar ni bort?

`RESTAURANT_INTERIOR` i `content/grythyttan.ts` (landmärke, 16 × 12 m,
axelparallellt, sex bord i raster, bar längs västra väggen) renderas av
`Restaurant.tsx`. `interiorLayout.ts` (OBB w869907975, 15,6 × 11,8 m
roterad 7°, fem bord i rad, bar längs −Z) styr var `InteriorGuests`
placerar gästerna.

**Gästerna sitter alltså i en annan byggnad än borden står i.**

`restaurantRoom.ts` följer `interiorLayout`, av tre skäl: `TOTAL_SEATS`
matar reducerarens kapacitet, ORDER 042 §3.2 föreskriver OBB, och B:s
byggnad är verklig medan A:s landmärke är märkt `placeholder`.

- Håller ni med om valet?
- Tar ni bort `RESTAURANT_INTERIOR.bar/.kitchen/.tables/.staffHomes` i
  samma ändring? En andra sanning som ingen läser är värre än ingen.

### 4. Vill ni ha ett gemensamt rumskontrakt först?

Fem klasser har i dag fem nästan-lika API:er — `measureBrewpubRoom`,
`measureWineBarRoom`, `measureInnRoom`, `measureRestaurantRoom`,
`measureFoodTruckRoom`; och `walkPathToSeat` utom i food trucken där den
heter `walkPathToQueueSlot`. Monteringskoden får då fem specialfall för
fem saker som gör samma sak.

Jag kan skriva ett `businessRoom.ts` som normaliserar detta —
`createRoom(class, opts)`, `seats`, `resolveWorldPositions`, `measure`,
`FLAGS` — utan att röra rumsfilerna.

- Vill ni ha det före monteringen, eller föredrar ni fem konkreta filer
  och ett tunt lager på er sida?

---

## Blockerar var sin funktion

### 5. Beställning vid disk och vid lucka

Gästens tillståndsmaskin går `arriving → waiting → seated → ordered →
…`. Det finns inget läge för *går fram, beställer, stiger åt sidan,
hämtar, går*.

För ölkrogen och vinbaren är det en variant vi kan avstå ifrån —
flödet blir bordsservering. **För food trucken finns ingen annan väg:**
utan det tillståndet kan vagnen inte servera någon alls.

- Är ett `orderingAtCounter`-tillstånd (plus `awaitingCollection`)
  planerat? Om inte: ska food trucken vänta på det, eller monteras som
  ren geometri utan gäster?

### 6. Kapacitet som inte är platsantal

`DEFAULT_POLICIES.capacity` är ett platsantal. Två av fem rum passar
inte i den modellen:

- Gästgiveriet har 100 platser mot `interiorLayout.TOTAL_SEATS = 16`.
  Kapaciteten måste bli klassberoende — är det en reducerarändring ni
  vill göra, och när?
- Food trucken har **noll** platser. Den begränsas av genomströmning,
  portioner per tidsenhet. Finns den storheten någonstans, eller ska
  vagnen ha en syntetisk kapacitet tills vidare?

### 7. Ståplatser: geometri utan tillstånd

Ölkrogen (8), vinbaren (4), gästgiveriet (8) och food trucken (3) har
ståplatser som geometri. Ingen räknas i kapaciteten, eftersom en
stående gäst inte har något tillstånd.

- Ska `standing` bli ett gästtillstånd, eller ska jag ta bort
  geometrin? Den väger tyngst i food trucken, som annars har noll
  kapacitet i modellen.

### 8. Gästrummen kan inte tilldelas

Gästgiveriets åttio rum finns som specar med dörrar, fönster,
morgonväg och höjdprofil. Men `GuestState` går arriving → … → leaving
inom ett dygn: övernattning, incheckning och nyckel finns inte.

- Är en boendemodell planerad? Tills den finns är morgonrörelsen byggd
  och mätt men kan aldrig utlösas.

### 9. Rutt och vägnät för en mobil verksamhet

`advanceAlongPath()` ger position, kurs och krökning längs en
polylinje. Men det finns ingen rutt, inget schema och ingen
platsvalslogik för en vagn som flyttar sig.

Och `ROADS` i `grythyttan.ts` är osäkra — nitton sträckor går rakt genom
byggnader, och polygon-guarden är beställd men inte byggd. En vagn som
följer dem kör genom en husvägg.

- Ska jag vänta på guarden innan vagnarna får en riktig slinga? Modellen
  använder en platshållarslinga i dag, och den är märkt som sådan.

---

## Arkitekturval — jag har en åsikt, ni har sista ordet

### 10. `FLOOR_COLOUR` är en konstant men vi har sexton golvzoner

`silhouetteContrast.ts` håller bandet mot **ett** golv.
Verksamheterna har tillsammans sexton zoner. Bandet gäller per zon, och
zonerna krymper figurfönstret till snittet över alla — så **en ny
golvzon kan underkänna en palett som redan är godkänd**, utan att någon
figurfärg har ändrats.

`silhouetteContrast.zones.ts` levereras med `FLOOR_ZONES_BY_BUSINESS`,
en generisk `paletteZoneCheck()` och `figureLuminanceWindow()` — den
sista är poängen: den fångar en för mörk ny zon dagen den läggs till.

- Godkänner ni att palettkoden flyttar dit och tas bort ur rumsfilerna?
  **Halvvägs är sämre än inte alls** — då finns både registret och
  kopiorna, och nästa läsare vet inte vilken som gäller.
- Food trucken behöver en egen post och har dessutom en avvikande
  signatur (`checkPaletteAgainstGround`, eftersom klassen inte äger sitt
  golv). Ska den normaliseras eller förbli ett undantag?

### 11. Två konstanter som gör två saker

- `interiorLayout.BAR_WIDTH_M` blandar ihop **strippens** djup
  (renderingshint) med **diskens**. `stoolLocalZ` räknas ur den, så
  ändrar man den flyttar barstolarna. Ska den delas i två?
- `RESTAURANT_INTERIOR.staffHomes` är räknade i den geometri som utgår
  enligt fråga 3. De är omräknade i `restaurantRoom.ts` — bekräfta att
  ingen annan konsument läser dem.

### 12. Barnet kan inte porteras — BESVARAD, PORTAD

SD-004 §3.3 ligger i main (ORDER 141, merge 6bd7fb9): höjdlåset gäller
personal, gästen bär `heightMult` från sin arketyp. `figureRig.ts` tar
nu `heightMult` som riggoption och barnets 0,72 ger 1,22 m. Klippet är
0,70–1,12 med barnet som undre gräns; `variant: 'staff'` tvingar 1,000
i riggen, så personal inte kan råka skalas. Detaljerna i LEVERANS.md.

Kvarstår som följdflagga, ej blockande: under mult ~0,95 når sulan inte
golvet från en 0,45 m sits. Höften sitsankras korrekt — fötterna
hänger, vilket för ett barn på en vuxenstol är rätt svar.

Samma fil: `SKIN_TONES` spänner L 0,057–0,690, alltså rakt genom det
otillåtna spannet mellan kontrastbandets två fönster. Ytan är liten i
dag eftersom riggen saknar ansikten, men blir händer eller nacke
någonsin stora nog att mätas är det en verklig konflikt.

### 13. Kopplingen arketyp → 3D-figur

`assignArchetype()` bor i `ui/foodtruck/` och 3D-scenens gäster har
ingen arketyp. `attachProps()` tar därför nycklarna som argument i
stället för att slå upp dem.

- Bygger ni bryggan, eller vill ni att jag flyttar arketypvalet till en
  neutral modul först?

---

## Vad jag inte frågar om

Geometrin. Alla mått är mätta i renderad scen och står i respektive
DoD — jag har inte påstått ett tal jag inte kan visa. Hittar ni en
avvikelse är det ett fel i min leverans och jag rättar det.

Rekvisitalagret (`roomProps.ts` — bordsdukning, glas, tallrikar) är inte
beställt av någon. Fästena finns i alla fem rummen. Säg till om det ska
med.


---

### 14. Långbordens sittytor — BESVARAD, RÄTTAD

Långborden har stolar (`chair_longA_s1` …). Fältet heter `seatHeight`,
inte `seatY` — det namnet finns inte i leveransen. Felet var att
`seatHeight` mäter från gruppens origo medan sittytan ligger 0,135 m
högre: sockeln 0,110 plus halva sitsplattan 0,025. Rummet publicerar nu
`seatSurfaceY` (0,585 stol / 0,885 barstol) och `floorY` (0,110), samt
`seatNodeId` eftersom `furnitureId` pekar på bordet och inte på stolen.

Inga bänkar behövs. Detaljer och mätning i LEVERANS.md.

### 15. Garanterade rumsfält — BESVARAD

`businessRoom.ts` är kontraktet och listan står nu i filen.
`staffHomes` saknas inte i ölkrogen — det heter `stations` på
kontraktet och `staffStations` på råobjektet, och ölkrogen har fyra.
`queueSlots` fanns bara som mättal; kontraktet bär nu `queue[]`, tomt
för de fem rum som inte har kö men aldrig `undefined`.

Kvarstår, ej blockerande: `floorY` och `seatSurfaceY` är `null` för
fem av sex rum tills de publicerat dem. Ölkrogen är gjord.

---

## Servicekoreografin — nya frågor

Gäller `serviceScore.ts` och modellen `Servicekoreografin.dc.html`.

### 16. Två gästtillstånd som partituret kräver

Vi lade till fyra steg som briefens §2 saknar. Två av dem kräver
kanter som inte finns i `GuestState`:

- **`requestCheck`** — gästen lyfter handen och begär notan. I dag går
  kedjan `dining → paying` utan att någon initierar. Kommer servitören
  av sig själv blir gästen avhyst; kommer ingen sitter gästen kvar i
  evighet. Behövs: en kant `dining → wantsCheck` som personalens
  uppgiftsval kan läsa.
- **`clearTable`** — bordet är upptaget efter att gästen gått, till
  avdukningen är klar. I dag frigörs platsen i samma ögonblick gästen
  byter till `leaving`, och reduceraren kan tilldela den till någon som
  då sätter sig vid ett dukat bord.

Blockerar de två stegen, inte resten av partituret.

### 17. Gest-klassen kräver en egen klocka

Kärnfyndet: en service har tre takter. Gest (hälsning, beställning,
framställning, betalning) måste behålla sin realtid vid varje
speltempo — förflyttning och uppehåll skalas rakt. Vid 4× på allt blir
hälsningen 0,8 s och läser som ett ryck, och det är den enskilda
orsaken till att provspelet såg ut som personal som irrar.

Praktiskt: gestuppgifter får inte drivas av spelets deltatid utan av
en realtidsklocka. `tempoForGameSpeed()` i filen ger avbildningen.
**Det är den enda punkten i leveransen som kostar er något i koden —
bekräfta att den är görbar innan vi skriver mer på det här spåret.**

### 18. Vem publicerar servicepunkterna?

`orderSpot`, `serveSpot`, `paySpot`, `greetHost`, `seatSide` och
`farewellSpot` finns inte i `businessRoom.ts`. Alla är härledbara ur
`seats[i]` plus vinkel och avstånd ur `SERVICE_DISTANCES` — men
härledningen behöver veta var möbelkanten går och vad som är fritt
golv.

Vi förordar att **rummet** publicerar dem, eftersom rummet äger
möblerna. Alternativet är att servicekoden räknar dem och råkar lägga
en servitör i en bordsskiva.

### 19. Är en gäst normalfallet?

Hela partituret är skrivet för **en** gäst vid bordet. Ett par ändrar
tre steg: hälsningen (+0,6 s, värden hälsar på båda), beställningen
(+2,4 s, två ordrar) och avdukningen. Säg vilket som är normalfallet
och vi skriver om partituret för det — det är en halvtimmes arbete i
datat, inte en ny modell.

### 20. Sex poser till `figureRig.ts`

`MISSING_POSES` i filen listar dem med färdiga ledvinklar:
`poseWelcome`, `poseTakeOrder`, `poseSetDown`, `poseDine`, `posePoint`,
`poseSignal`. Ingen kräver nya led eller nya mått, alla är rena
funktioner av tid och framdrift som de sju befintliga.

`poseGreet` ska **behållas** — en vinkning är rätt gest över avstånd.
Men den används i dag som mottagande på armlängds håll, och där läser
den som att man ropar på någon.

Säg till om ni vill ha dem som en egen order i `figureRig.ts` eller om
vi lägger dem i samma ändring som partituret monteras.

---

## Nexus v1, paket 1 — 2026-09-25

Gäller `wineBarRoom.ts` (omgjord), `figureActs.ts` (ny) och skärmarna i
`skarmar/`.

### 21. Tålamod per gäst — BLOCKERANDE för väntans tre lägen

Specen §4.1 vill att spelaren ser vilken gäst som behöver hjälp nu.
Rörelserna finns: `poseWaitCalm`, `poseWaitImpatient`, `poseWaitLeaving`,
och `waitStateFor(patience)` väljer mellan dem (trösklar 0,55 och 0,20,
våra val). Men de kräver ett tålamodsvärde 0..1 per gäst som sim-lagret
inte har. Utan det kan bara "lugn" visas, och då syns ingenting.

**Finns ett sådant värde, eller något vi kan härleda det ur (väntetid
mot förväntan)?**

### 22. Stress per personalroll

Varje personalpose tar `stress` 0..1 för hållningen, och
`staffTempo(stress)` ger klockfaktorn (1,0–1,7×). Vad stressen är — kö
per station, beläggning, antal öppna beställningar — är sim-lagrets.
Vi föreslår kö per station, men beslutet är ert.

### 23. Action-knappen behöver ett insatstillstånd

Skärmarna A1/A2 och spelarens tre rörelser förutsätter:
- en kö av möjliga insatser med mål (gäst/bord/pass) och brådska,
- tre insatser per kväll,
- en pågående insats med framdrift 0..1 (driver ringen och `progress`).

Köns ordning i A1 är "mest brådskande överst". **Vem rangordnar —
sim-lagret eller presentationen?** Vi tycker sim-lagret, för rangordningen
är en spelregel.

### 24. Vinväggens läge och kvällens stämning

`setWineWallLevel(room, 'platina')` kräver medaljtillståndet för
Stensöta. `setMood(room, 'helg')` kräver veckodag och klockslag. Båda är
lägen rummet kan visa men inte avgöra.

### 25. Kamerans verkliga värden och grannhusen

`PLAYER_CAMERA` (lutning 0,84 rad, fov 38°, 23 m) är de värden
modellerna använt sedan SD-004 — övertagna, inte lästa ur spelet.
`checkCameraView()` tar kameran som argument, så provet går att köra mot
den riktiga. Kapningen (`updateCutaway`) löser rummets egna väggar.
Grannhus är scenens: `maxNeighbourHeight(6)` = 6,8 m, alltså skymmer tre
våningar på andra sidan en sex meters gata golvet närmast väggen.
**Tonar scenen grannhus i dag, eller ska det in?**

### 26. Speldesignen har vi inte sett

Specen styrs av `NEXUS_SPELDESIGN_V1.md`, som inte följde med.
Skärmarnas innehåll är därför våra platshållare där specen inte säger
annat: satsningarnas namn, frågorna, bankens och tidningens namn
("Sparbanken Grythyttan", "Grythyttebladet"), mentorns namn ("Ingrid
Malm"), veckans dagar och att söndagen har bankmöte. Formen står sig;
orden ska bytas mot speldesignens. Skicka den, så stämmer vi av.

---

## Nexus v1, paket 2 — 2026-09-25

Gäller `truckPitch.ts` (ny), `figureActs.ts` (åtta nya rörelser) och
uppgraderingsskärmarna U1–U4. `foodTruckRoom.ts` är oförändrad.

### 27. Uppgradering — byte eller tillägg?

Specen §5 säger "vad som följer med och vad som ändras", och det läser vi
som ett byte: Vinbaren lämnas, food trucken tar vid. U2 och U4 är ritade
så. I paket 1 står det på bankmötet (B1) att "Vinbaren behålls". Den
meningen är struken, och B1 följer med i det här paketet som reviderad.
**Om uppgraderingen i stället lägger till en klass behöver U2 och U4
skrivas om.** Formen står sig, men orden gör det inte.

Vad som följer med i U2 (medaljerna, ryktet, kocken och servitören,
mentorn) och vad som lämnas (vinväggen) är våra platshållare, se §26.

### 28. Väder — BLOCKERANDE för att vädret ska synas

Specen: "Vädret syns: sol, regn, blåst." `setWeather(pitch, room, w)`
växlar mark, pölar, regn, löv, markis och vimpel, och figurerna har
rörelserna. Men det finns inget vädertillstånd i sim-lagret. **Per dag
eller per timme?** U3 förutsätter en prognos som mening på morgonen ("sol
till tre, sedan regn"), så per timme med en dagsprognos räcker.

### 29. Köns längd

`presentationQueueLength(site, hour, weather)` är en modellkurva per
plats och väder, och den är vår. Den visar det specen ber om, nämligen
att kön ser olika lång ut vid olika tider. Spelet ska ta längden ur
efterfrågan. Använd kurvorna som målbild eller skriv över dem.

### 30. Tre platser i Grythyttan

Torget, vid Måltidens hus och vid sjön. Utformningen står i `SITES`, men
läget i byn ska deklareras i `content/grythyttan.ts` bredvid
`TorgetPlaza` (SVAR §2). Grannarna i `SITES` är modellens. **Kör
`checkPitchView()` mot de riktiga husen när platserna är deklarerade**,
för ett tre våningars hus på fel sida skymmer kön.

Sjön är inte namngiven. Vi vet inte vilken sjö spelets Grythyttan har.

### 31. Att äta stående

Ätplatserna (ståbord och bänkar) är geometri, och `poseEatStanding` /
`poseEatBench` finns. SVAR §5 gäller fortfarande: vagnen monteras utan
gäster tills `orderingAtCounter` och `awaitingCollection` finns. Att
äta vid ståbordet är ett tredje tillstånd efter dem.

---

## Nexus v1, paket 3 — 2026-09-26

Gäller `restaurantRoom.ts` (omgjord) och `figureActs.ts` (två nya
rörelser).

### 32. Restaurangens byggnad — BLOCKERANDE

Sextio platser, en bar och ett stort kök ryms inte i w869907975
(15,6 × 11,8 m). Den byggnaden är vinbarens sedan paket 1, eftersom specen
säger att "dagens byggda lokal görs om" till vinbaren. Restaurangen behöver
minst 22,0 × 14,8 m, och rummet är ritat på 23,4 × 15,6. **Vilken byggnad i
Grythyttan står restaurangen i?** Rummet returnerar `fits: false` med
underskott om den är för liten. Montera inte med `fits: false`.

Kör `checkCameraView()` med grannhusen som `extra` när byggnaden är vald.

### 33. Sexton låsta platser blir sextiosex

Förra restaurangen hade 16 platser i en låst ordning, och de matade
reducerarens `DEFAULT_POLICIES.capacity` (godkänt 2026-08-08). Specen säger
60 i matsal plus bar. Rummet publicerar `capacity = 66` (60 + 6) och
`checkSeatContract()` prövar 60 bordsplatser före 6 barstolar. **Är
kapaciteten per klass, eller är den fortfarande en konstant?** Om den är
en konstant går spelet sönder vid bytet från vinbar (20) till restaurang.

### 34. Två matsalar i repot — gäller nu vinbaren

ORDER — restaurangen §1 (RESTAURANT_INTERIOR mot interiorLayout) handlar om
w869907975, som är vinbarens byggnad. Felet är detsamma men har bytt
ägare: den som rensar `RESTAURANT_INTERIOR` rensar vinbarens dubbla
sanning. Restaurangen har ingen sådan konflikt, eftersom den inte har
någon byggnad ännu.

### 35. Dagens tre lägen

`setDayMode(room, 'morgon' | 'lunch' | 'middag')` växlar mise en place,
tallrikarna på passet, ljusen och värmelamporna. Beläggningen (0 / 34 / 60
+ 6) i `DAY_MODES` är ett presentationsmål, inte efterfrågan. Kräver
klockslaget från sim-lagret.

### 36. Servitörens runda

`SERVICE_LOOP` och `serviceLoopPoint(u)` är vägen: passet → mittgången →
norra gången → diskluckan → passet. Att en servitör bär en viss rätt till
ett visst bord kräver en order med bordsnummer. Slingan är vägen, inte
händelsen.

---

## Nexus v1, paket 4 — 2026-09-26

Gäller `brewpubRoom.ts` (omgjord) och `figureActs.ts` (en ny rörelse).

### 37. Ölkrogens byggnad — samma adress som vinbaren?

Rummet är 15,6 × 11,8 m, samma mått som w869907975. **Ersätter en klass
den förra på samma adress, eller ligger klasserna på olika platser i
Grythyttan?** I det första fallet behövs ingen ny byggnad för ölkrogen. I
det andra behöver både restaurangen (§32) och ölkrogen en egen. Svaret
avgör också §27 om byte eller tillägg.

### 38. Platsblandningen ändras

Specen: 20 platser vid långbord och bänkar. Förra versionens 8
barstolar och 2 tvåor utgår. `seatIndex` 0–19 är långbord A söder, A
norr, B söder och B norr, väster till öster. Kapaciteten är densamma
(20), men platsernas lägen och `furnitureId` är nya. Allt som läser
`'bar3'` eller `'longA_n1'` ur den gamla filen går sönder.

### 39. Bryggeriet — produktion och personal

Bryggeriet är ett eget rum med två bryggare (`brewerHouse`,
`brewerCellar`). `setBrewDay(room, on)` tänder ångan och omröraren.
**Finns bryggarna som personal i sim-lagret, och finns en bryggdag?**
Utan det står kärlen stilla och bryggarna går på `poseCellarCheck`.

---

## Nexus v1, paket 5 — 2026-09-26

Gäller `innDay.ts` (ny, ligger ovanpå `innRoom.ts`) och `figureActs.ts`
(fyra nya rörelser). `innRoom.ts` är oförändrad.

### 40. Rumsnummer per gäst — BLOCKERANDE för incheckningen

Incheckningen (grind → reception → trappa → rum) och kvällen (sal → rum)
kräver att en gäst bär ett `GuestRoomSpec`-id. innRoom flaggade det redan
(`FLAGS.roomAssignment`). Vägarna finns: `walkPathToReception()`,
`walkPathReceptionToRoom()` och innRooms `walkPathFromRoom()`. Tillståndet
som säger vem som går vart finns inte.

### 41. Dygnet i gästgiveriet

`setInnMode(day, inn, 'frukost' | 'incheckning' | 'middag' | 'kvall')`
kräver klockslaget. Frukost och middag är två serveringar med olika
personal: frukoststationen är bemannad bara på morgonen, och de fyra
vakande servitörerna bara vid middag och sen kväll. **Vet sim-lagret att
gästgiveriet har två serveringar per dygn?**

### 42. Loftgången och trapporna i innRoom

Båda trapporna står under loftgångens däck (X ±12,2 mot däckets
11,7–13,5). En gäst som går upp syns därför inte ovanifrån.
`updateInnCutaway()` tunnar däck, räcke och stolpar till 30 % när
kapningen är på, och då syns trapporna från alla fyra vinklar på
gårdssidan. **Ett bättre fel att rätta i innRoom självt:** lägg trapporna
utanför däcket, 1,8 m längre ut i gården. Det gör vi inte här, eftersom
innRoom inte ingår i leveransen.

---

## Avstämning mot speldesignen — 2026-09-26

`NEXUS_SPELDESIGN_V1.md` är nu läst. Den styr allt, och ändringarna nedan
är gjorda i paket 1.

**Rättat i paket 1:**
- **Söndagstidningen (T1):** säsongen är sommar. Numret är söndag 5 juli, säsongens
  vecka 2 av 8, och nästa högtid är Grythyttedagarna (vecka 3).
- **Bankmötet (B1):** görs vid veckoavräkningen. Banken ställer en diagnos i ord,
  visar medaljerna och säger vad som går att byta till nu (ölkrogen: brons
  i tre, varav Metodköket) och vad som saknas (restaurangen: silver i
  Metodköket). En verksamhet i taget.
- **Kvällsberättelsen (K1):** stängt 23.00, eftersom servicen är 18–23.
- **Morgonens schema (S1):** satsningarna är personalfest, utbildning och
  ekologiska råvaror.
- **Quizen (Q1):** frågorna kommer ur kvällens svagaste axel, och det
  kostar inget att hoppa över.
- **Provet (O2):** åtta frågor, sex rätt ger medaljen.
- **Medaljerna (MD1):** Teatern öppnas med silver i två paviljonger.

**Besvarat av speldesignen:** §27 (byte, en verksamhet i taget), §33
(kapacitet per klass, se klasstabellen) och delar av §26 (säsong,
högtider, satsningar och provets regler). Namnen — Ingrid Malm, Sparbanken
Grythyttan, Grythyttebladet — är fortfarande våra.

### 43. Uppgraderingskärmarna i paket 2 visar fel riktning

U1–U4 visar vinbaren → food trucken. Enligt speldesignen är food trucken
klassen UNDER vinbaren. Skärmarna ska göras om som food trucken →
vinbaren (brons i tre, varav Stensöta). Vid bytet får personalen följa
med, ryktet halveras och kontantinsatsen är en fjärdedel av en veckas golv.
U3 (välj plats) står sig som food truckens morgonskärm. Görs i nästa
leverans. Bygg inte U1, U2 och U4 från paket 2.

### 44. Restaurangen i w869907975

**Det går inte med bar och stort kök.** Byggnaden är 15,6 × 11,8 m, alltså
184 m² brutto. Sextio platser i en packad matsal tar runt 110 m² med
gångar, och det lämnar runt 50 m² till kök, disk och kyl. Det räcker inte
till specens "stort kök med flera stationer" och "plus en bar". Två
möjligheter:
- **En större byggnad, minst 22,0 × 14,8 m.** Paket 3 är ritat på 23,4 × 15,6.
- **w869907975 med 60 platser utan bar och med ett mindre kök** (tre
  stationer och pass). Servisslingan och mise en place står sig, men
  känslan av en klassisk restaurang med bar försvinner.

Säg vilket, så ritar vi den andra varianten om det behövs.

### 45. Servicen 18–23 — kvarvarande avvikelser

- Restaurangens `DAY_MODES.lunch` (12.15) ligger utanför servicen. Bör bli
  "tidig kväll 18.30" med samma beläggning.
- Food truckens efterfrågekurvor har lunchtoppar och klockslag från 07.00.
  Speldesignen säger att kvällen spelas. Ska food trucken ha lunch?
  Midsommar ger "hög efterfrågan på lunch".
- Ölkrogens vardagsläge är satt till 16.00. Bör bli 18.30.
- Gästgiveriets frukost är specens egen dygnsstruktur och ligger utanför
  18–23 med flit. Bekräfta att det är det enda undantaget.
