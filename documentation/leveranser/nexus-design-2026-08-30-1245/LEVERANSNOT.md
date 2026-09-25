# LEVERANSNOT.md

Substansen ur de åtta orderdokumenten, utan ordernummer och utan
DoD-numrering. Lyft in det som behövs i de ordrar som faktiskt utfärdas.

Ordnad per fil. Alla tal är mätta i renderad geometri.

---

## `businessRoom.ts` — kontraktet

Normaliserar **ovanpå** rumsfilerna; rör dem inte. `createRoom`,
`updateRoom`, `walkPathToSeat`, `walkPathToBar`, `exitPath`,
`eyeHeightForSeat`, `measureRoom`, `resolveWorldPositions`, `allFlags`,
`blockingFlags`.

`walkPathToSeat` heter så i alla sex, även i foodtrucken där den leder
till en köplats: ett namn ska beskriva rollen, inte möbeln.

**Vad som medvetet inte normaliseras.** Skillnader som är verkliga ska
synas:

- foodtruckens `capacity` är **0**. Klassen begränsas av genomströmning.
- nattklubbens är **150**, varav 24 i `seats` och 126 i
  `occupancyAreas`. Rummets eget tal vinner över `seats.length`.
- foodtrucken äger inte sin mark, så `checkPaletteAgainstGround` stannar
  i sin egen fil och tar gatans färger som argument.
- foodtruckens `pitch` är skild från `group`.
- gästgiveriets `guestRooms` och nattklubbens `occupancyAreas` är tomma
  för de andra i stället för att gömmas bakom en flagga.

**Att verifiera:** `createRoom` bygger alla sex utan att någon rumsfil
ändras; okänd nyckel kastar; `seats` behåller varje rums egen
`seatIndex`-ordning; `capacity` blir 16 / 20 / 20 / 100 / 0 / 150;
`measureRoom().height` läses ur väggar respektive kaross, aldrig ur
inredning.

Det sista har ett skäl: felet gjordes två gånger under bygget.
Gästgiveriets sal rapporterade 2,22 m fri höjd i en sal som är 5,00, och
restaurangens 1,00 i ett rum som är 3,00 — båda för att mätningen läste
inredningen eller en visningsskalad grupp.

---

## `restaurantRoom.ts` — och två fynd i repot

Tre band längs långaxeln: bardisk mot den långa −Z-väggen, bordsrad mot
+Z, servicegång emellan. Baren är en **servicedisk**, inte ett mål —
fyra av sexton platser vänder sig mot den, de fem borden vänder sig
från den. Därför ingen bakhylla.

Mätt: inredning 15,20 × 11,40 m, fri takhöjd 3,00, högsta inredning
2,22 (spiskåpan), bardisk 10,92, runway 1,30, smalaste passage 0,93 m
fri bredd mot kropp 0,46. Platskontraktet håller: 16 av 16, ordning ok.
Kontrast 2,66–2,89 mot tre golvzoner, noll par utanför bandet.

### Två matsalar i drift

`RESTAURANT_INTERIOR` i `content/grythyttan.ts` (landmärke, 16 × 12 m,
axelparallellt, sex bord i raster, bar längs västra väggen) renderas av
`Restaurant.tsx`. `interiorLayout.ts` (OBB w869907975, 15,6 × 11,8 m
roterad 7°, fem bord i rad, bar längs −Z) styr var `InteriorGuests`
placerar gästerna.

**Gästerna sitter i en annan byggnad än borden står i.**

Filen följer `interiorLayout`: `TOTAL_SEATS` matar reducerarens
kapacitet, OBB är föreskrivet, och A:s landmärke är märkt
`placeholder`. Vid montering ska `.bar`, `.kitchen`, `.tables` och
`.staffHomes` raderas — en andra sanning som ingen läser är värre än
ingen.

**Pröva sambandet med utredningen av `seated=0/16`.** Om en gäst
tilldelas en plats vars världskoordinat ligger i en annan byggnad, i en
annan rotation, kan varje ankomstvillkor som jämför position mot bord
falla tyst. Det är en kandidat som inte fanns på listan.

### En konstant som gör två saker

`interiorLayout.BAR_WIDTH_M = 1,6` är både renderingshint för
barstrippen och styr `stoolLocalZ`. Med `BAR_OFFSET_M = 0,6` lämnar den
0,6 m bakom disken, vilket inte är en passage för en kropp på 0,46 m.
Rummet löser det utan att röra en plats — framkanten ligger kvar på
Z = −3,70 och disken görs 0,70 djup — men konstanten bör delas i två.

---

## `brewpubRoom.ts`

Tre band: bryggeri och kök i −X-änden vid leveransfickan, bardisk som
gräns, matsal mot entrén. Ölen går tank → disk → gäst längs en axel.

Bryggeriet ligger **inte** bakom glas — ett glasparti är ingenting från
strategisk höjd. Zonen markeras med 0,35 m sockelkant och golvbyte. Och
ingen bakhylla bakom baren: tapptornet flyttades till diskens norra
ände efter att siktlinjemätningen visade att det skymde alla fyra
tankar för stolen rakt bakom.

Mätt: 20/20 platser ser bryggeriet, 8/8 barstolar ser alla fyra
jästankar, högsta kärl 2,73 m under tak 3,40, smalaste passage 0,95 m.

Flaggat: klassen saknas i `BusinessClass`; beställning vid disk saknar
gästtillstånd; ståplatser saknar tillstånd; bryggfasen är inte sim-data;
kökets tre stationer saknar rättmodell.

---

## `wineBarRoom.ts`

Läses radiellt, inte i band: bardisken är mitten och allt vänder sig
mot den. Tre avvikelser från formmallen, alla medvetna:

1. **Bakhyllan är obligatorisk här.** I ölkrogen var frånvaron ett krav.
   Samma siktlinjeresonemang, motsatt slutsats.
2. **Golvet är en palettparameter.** Fem zoner betyder fem
   kontrastunderlag.
3. **Loungen är fyra dynor, inte en soffa.** Uppifrån läser en
   genomgående sits som ett bord.

Mätningen ändrade geometrin två gånger: ögonhöjd räknas ur **sitsen**
(0,11 + sits + 0,84), inte ur golvet — en fast 1,29 m gav 0 av 6
barstolar med sikt. Och flaskhyllans visningsband flyttades till
1,35–2,13 m eftersom det nedersta planet låg bakom en disk på 1,10.
Resultat: 6/6 barstolar ser alla fyra hyllplan, 20/20 ser hyllan.

Kontrast 2,22–2,75 mot fem zoner, roll-ΔE minst 16,6.

---

## `innRoom.ts`

U-form kring gård: 100 platser i salen, 80 gästrum i två längor.

Tre saker som inte får förenklas bort: **kammen** (elva skiljeväggar
per sida och plan, en dörrplan och ett fönster per rum — utan fönstren
läser längorna som två lådor); **loftgången** på övre plan, som gör
morgonrörelsen läsbar hela vägen i stället för bara i trappan; och
**trappan vid södra gaveln** i stället för mittpunkten, vilket kortar
gången till salen och låter korridoren mynna i gaveln utan att offra en
rumscell.

Morgonvägen är data: `exitVia` per rum plus `walkHeightsFromRoom()` för
höjdprofilen. Använd höjdprofilen — annars svävar gästen nedför trappan.

Mätt: anläggning 51,85 × 51,50 m, sal 26,60 × 17,60 med **5,00 m fri
takhöjd** (högsta inredning 2,32 — spiskåpan, inte taket), 80 rum och
80 dörrplan i grafen, gård 891 m², loftgång 68,0 m. Fem golvzoner inom
0,008 luminans; kontrast 2,02–2,52.

**Anläggningen är större än landmärket** (28 × 18 m). Gård och längor
ska deklareras som egen volym; landmärket växer inte.

Gästrummen kan inte tilldelas: ingen boendemodell finns. Morgonrörelsen
är byggd och mätt men kan inte utlösas.

---

## `foodTruckRoom.ts` — tre varianter

Skiljs åt i **planform**, för det är den kameran ser:

| | Transport | Hjul | Signatur |
| --- | --- | --- | --- |
| `hVan` | 5,51 × 2,13 × 2,66 | 4 | Avsmalnande nos, rundat trapets. Luckan **är** markisen. |
| `boxVan` | 7,38 × 2,51 × 3,57 | 6 | Lång låda, tvillingaxel, skyltlåda på taket. |
| `cabBox` | 6,18 × 2,41 × 3,03 | 4 | Två rektanglar med höjdhopp — läser inte som en kropp. |

Alla under 2,60 m i transportläge, alltså road-legala på Rv 244.

**Serveringsgeometrin** är klassens enda riktiga konstruktionsproblem:
chassit lyfter personalen 0,42–0,62 m, så hon tittar ned på gästen. Två
ytor löser konflikten — inre disk 1,50 (arbetshöjd), luckans underkant
1,30, yttre hylla 1,15 (gästens). Raycastat ser gästen besättningen och
pentryt, men båda diskarna ligger under hennes öga och ses kant-i-kant:
**luckan visar besättningen, inte processen.**

**Färdläget:** `updateFoodTruckRoom(room, 0)` fäller markisen **ned över
luckan**, drar in hyllan, lyfter stödbenen. Fordonets höjd är densamma
i båda lägena (2,75 / 3,66 / 3,12). Hjulen snurrar ur tillryggalagd
sträcka, inte ur väggklockan — och de har ekrar, för en slät cylinder
kan rulla hur fort som helst utan att det syns.

**Mattan är platsen, inte fordonet.** `room.pitch` är egen grupp och
ligger kvar när vagnen kör. Mattans bredd följer **kön**, inte
karossen: centrerad på vagnen hamnade tre köplatser utanför den enda
kontrastprövade markytan.

Elva flaggor, tre blockerande: ingen placeringspunkt, ingen rutt (och
`ROADS` har nitton sträckor genom byggnader — slingan i min modell är
en platshållare), och beställning vid lucka.

---

## `nightClubRoom.ts`

Två saker skiljer den från allt annat.

### `seats[]` beskriver inte kapaciteten

150 platser är inte 150 stolar. 24 är loungebänkar; de övriga 126 är
ståplatser, och ett dansgolv har inga punkter. Att hitta på 126
diskreta punkter hade varit att låtsas.

Levereras därför som `occupancyAreas[]` — rektangel, m², persondensitet
— plus `distributeStanding(area, n)`, deterministisk så två klienter
renderar samma bildruta likadant.

Barerna är däremot **diskreta**: man köar vid en bar, och det är en
ordning. `barApproaches[]` har punkter.

`checkCapacity()` visar 150 och reducerarens 24 sida vid sida i stället
för att gömma glappet.

### Mörkret vänder paletten — räknat, inte känt

För att en delad gästton (L 0,083) ska klara bandet [1,8 · 3,6] måste
golvet ligga **L ≤ 0,0239 eller L ≥ 0,1894**. Mellanrummet
0,024–0,189 är förbjudet, och det är precis där en "dov klubbgrå" vald
på känsla hamnar. Alla zoner måste dessutom ligga på samma sida:
blandar man en mycket mörk med en ljus stängs fönstret helt.

Tre zoner, alla mörka (L 0,0125–0,0188). Figurfönstret blir **0,101
brett** — bredare än vinbarens 0,064. Mörkret är inte fienden;
spridningen är.

Följden: här är figurerna **ljusare** än golvet, till skillnad från de
fem andra klasserna. Personalens fyra uniformer ligger på L 0,124, och
hueseparationen är löst i Lab — vid låst ljushet kan skillnaden bara
komma ur kroma. Gissade riktningar gav ΔE 7,7; de räknade ger 36,5.

Mätt: kontrast 1,92–2,79, noll par utanför bandet.

**Trussen ramar, den täcker inte.** Öppen ram på 4,20 m över
dansgolvet; kropparna syns igenom. En solid skiva hade varit lättare
att läsa och gömt det som ska läsas.

Loungeplattformen är upphöjd 0,35 m av ett enda skäl: annars är en
sittplats i en nattklubb en plats med utsikt över ryggar.

Tre barer i tre relationer till flödet — entrébaren man stöter på,
huvudbaren man går längs, satellitbaren som betjänar loungen utan att
gästen korsar dansgolvet.

**Rörligt ljus är den enda flaggan där min mätning kan bli fel.** En
jämn nedsänkning av exponeringen sänker figur och golv proportionellt.
En upplyst golvfläck gör det inte — den blir en ny, ljusare zon som
ingen deklarerat, och den kan hamna i mellanrummet. Läggs rörligt ljus
till måste dess ljusaste fläck deklareras som zon och prövas.

---

## `figureRig.ts`

1,700 m hjässa exakt: höft 0,860 + bål 0,588 + nacke 0,012 + huvud
0,240. Prototypens 1,2 cm underskott blev nacken i stället för ett
avrundningsfel.

**1,700 är ett tak, inte ett medelvärde.** Gångstuds, andning och
vaggning svajar nedåt. Mätt lägsta punkt per pose: gång och bärande
−0,029 m, sittande −0,012, hälsning −0,009, stillastående −0,007,
arbete −0,000.

Sex poser som rena funktioner av anroparens fas eller tid. `poseWalk`
drivs av **sträcka**, inte klocka.

Kvar: höjdlåset gäller fortfarande både gäst och personal. När
SD-004-preciseringen är committad kan `heightMult` porteras och barnet
byggas.

---

## `figureProps.ts`

Silhuettkontraktet fick **två** svar, inte ett, och gränsen går mellan
hår och huvudbonad.

**Hår** byggs som en sfärisk sektor av samma klot som kraniet, från
kalottens vinkel och ned förbi ekvatorn — kraniets egen yta, flyttad
utåt. En rak extruderad ring mot ett runt kranium glappar 5,6 mm och
visar en öppen ränna uppifrån.

**Huvudbonader** täcker hjässan, för det är vad de är. De bär
garment-färgen på ovansidan och igenkänningen flyttas till formen:
skärm 0,17 m, brätte med ytterradie 0,27 mot huvudets 0,12, äggformat
skal. Ingen av de sex ändrar vilken färg kameran ser uppifrån.

`checkCrownCoverage()` mäter det: 0,99–1,00 mot kravet 0,95. Provdisken
är kalottens eget fotavtryck — en tidigare version samplade bredare och
gav 0,92 för ett **bart** huvud, alltså underkände kalotten själv.

**Bandet har två fönster.** Kvoten är symmetrisk, så mot golvspannet
L 0,186–0,332 finns ett mörkt fönster L 0,056–0,081 och ett ljust
L 0,637–0,801 — det ljusa sex gånger bredare. Rekvisitan måste använda
det: garment ligger i det mörka, så en portfölj där får kontrast 1,12
mot kroppen den hänger intill. Godkänd mot golvet, osynlig mot gästen.

168 par mot fjorton golvzoner, noll utanför.

Flaggat: barnet (direktivbeslut), `SKIN_TONES` som spänner rakt genom
det otillåtna spannet, "händerna i fickorna" som saknar pose, och att
kopplingen arketyp → 3D-figur inte finns.

---

## `silhouetteContrast.zones.ts`

Tar bort en duplikation som redan är farlig: WCAG-formlerna finns i sju
filer. Ändras MIN/MAX i `silhouetteContrast.ts` följer kopiorna inte
med, och rummen fortsätter rapportera noll fel mot ett band som inte
gäller.

`figureLuminanceWindow()` är poängen. Utan den upptäcks en för mörk ny
golvzon först när någon lägger till en figurfärg som faller — långt
efter att zonen committades, och av någon som inte vet att zonen är
orsaken.

**Regeln som inte syns i talen:** det är inte antalet zoner som kostar,
det är spridningen. Gästgiveriet har lika många zoner som vinbaren och
nästan dubbelt så brett fönster.

Kvar att göra: posten `nattklubben` med de tre zonerna som
`nightClubRoom.ZONE_FLOORS` deklarerar. Och städningen — palettkoden
ska bort ur rumsfilerna i samma ändring. **Halvvägs är sämre än inte
alls:** då finns både registret och kopiorna, och nästa läsare vet inte
vilken som gäller.

`GUEST_GARMENTS` och `STAFF_UNIFORMS` stannar i rumsfilerna. De är
klassens innehåll, inte bandets.
