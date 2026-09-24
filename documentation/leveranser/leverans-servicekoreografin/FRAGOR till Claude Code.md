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
