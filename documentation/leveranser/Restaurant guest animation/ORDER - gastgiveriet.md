# ORDER — Gästgiveriet: montering av `innRoom.ts`

**Projekt** nexus-studio · strategiska spåret
**Lyder under** SUPERSEDING_DIRECTIVE_004 (3D-scen, kroppar utan ansikten)
**Formmall** ORDER — Ölkrog med bryggeri (`brewpubRoom.ts`), samma kontrakt
**Mottagare** Claude Code
**Beroenden** `figureRig.ts` i `main`, `silhouetteContrast.ts` i `main`,
och `silhouetteContrast.zones.ts` (egen order — se §4 flagga 7)

Det största rummet i serien: hundra platser i en U-form kring en gård, plus
åttio gästrum i två längor. Landmärket finns redan som
`gry-gastgivaregard-01` i `content/grythyttan.ts` (28 × 18 m, approximerat).

---

## 1. Leveransen

```
frontend/src/strategic/scene/innRoom.ts
```

Ren three.js, primitiver, inga externa beroenden utöver `three`, ingen
skinning, inga loaders, inga binära assets. Byggs imperativt en gång i
`createInnRoom()`. `updateInnRoom(room, phase)` vrider bara vindflöjeln.

`innRoom.js` är webbläsarspegeln för HTML-modellen och **ska inte in i
repot.**

### Exporter

| Export | Vad |
| --- | --- |
| `createInnRoom(options?)` | Bygger anläggningen. |
| `updateInnRoom(room, phase)` | Enda rörliga delen. |
| `walkPathToSeat` / `exitPathFromSeat` | Vägpunkter i salen, lokal XZ. |
| `walkPathFromRoom(room, roomId)` | Morgonvägen: gästrum → gård → sal. |
| `walkHeightsFromRoom(room, roomId)` | Höjdprofilen för samma väg. **Använd den.** |
| `resolveWorldPositions(room)` | Världskoordinater efter placering. |
| `eyeHeightForSeat(seat)` | Ögonhöjd. Räkna inte själv. |
| `measureInnRoom(room)` | §5-måtten. |
| `checkRoomCount(room)` | Räknar rumsspecar OCH dörrplan i scengrafen. |
| `checkPaletteAgainstFloors()` / `paletteContrastRange()` | Kontrastbandet. |
| `disposeInnGeometry()` | Frigör den delade cachen. |
| `TOTAL_SEATS` = 100, `GUEST_ROOMS` = 80 | |
| `MIN_WIDTH_M`, `MIN_DEPTH_M` | Under dessa: `fits: false`. |
| `BASE_FLOOR`, `ZONE_FLOORS`, `GUEST_GARMENTS`, `STAFF_UNIFORMS` | Paletten som data. |
| `FLAGS` | Nio poster. Se §4. |

`room.parts`: `weathervane`, `roof`, `walls`, `interior`, `wingUpper`,
`courtyard`, `passAnchor`, `buffetAnchor`, `outBarAnchor`.

---

## 2. Montering

### 2.1 Placering

Samma konvention som de tre andra rummen:

```ts
const room = createInnRoom({ width: obb.w, depth: obb.d });
room.group.position.set(obb.centre[0], 0, obb.centre[1]);
room.group.rotation.y = -obb.angle;
```

`resolveWorldPositions(room)` anropas EFTER placeringen.

**Obs om storleken.** Landmärkets fotavtryck är 28 × 18 m, men
anläggningen mäter 51,85 × 51,50 m i vyn — U-formen med gård och längor är
inte samma sak som huvudbyggnadens footprint. Antingen växer landmärket
eller så är gården och längorna en egen volym i världen. **Det är ett
världsbeslut, inte ett geometribeslut** — se flagga 1.

### 2.2 Platserna och rummen

`room.seats` är hundra poster i `interiorLayout`-konventionens ordning
(bordsplatser före övrigt). `room.guestRooms` är åttio poster, var och en
med `wing`, `storey`, `side`, `floorY`, `doorLocal`, `onGallery`,
`stairLocal` och `exitVia`.

Sitshöjd hanteras som i vinbaren:

```ts
rig.root.position.y = PLINTH_M + (seat.seatHeight - 0.45);
```

### 2.3 Morgonrörelsen — använd höjdprofilen

Detta är rummets signatur och den enda plats där monteringen kan gå fel på
ett sätt som syns direkt: gästen ska gå **ned en trappa**, inte sväva.

```ts
const path = walkPathFromRoom(room, roomId);
const ys   = walkHeightsFromRoom(room, roomId);   // samma längd
```

Vägen är data (`exitVia` per rum), inte grenlogik. Övre planets gårdsrum
går ut på **loftgången**, allt annat via korridoren och gavellandningen.

### 2.4 Avståndstoning

`parts.roof`, `parts.walls`, `parts.wingUpper` och `parts.courtyard` är
egna grupper. `wingUpper` är särskilt viktig: den kan tonas oberoende, så
längornas övre plan kan döljas utan att salen påverkas.

### 2.5 Kroppar

`figureRig.ts` i en egen grupp **utanför** `room.group`. Färgerna ur
`GUEST_GARMENTS` och `STAFF_UNIFORMS`.

---

## 3. Vad rummet löser som de andra tre inte behövde

Tre saker är nya i den här klassen och bör inte "förenklas" bort vid
montering:

**Kammen.** Åttio rum läses som åttio bara om varje cell har en egen vägg
och en egen dörr. Elva skiljeväggar per sida och plan, en mörk dörrplan
per rum, plus **ett fönster per rum i båda fasaderna** — utan fönstren
läser längorna som två långa lådor uppifrån.

**Loftgången.** Övre planets gårdsrum öppnar mot en öppen svalgång längs
gårdsfasaden, inte mot en korridor. Det är den som gör morgonrörelsen
läsbar hela vägen; utan den sker den i en korridor kameran aldrig ser, och
då är U-formen bortkastad.

**Trappan vid södra gaveln.** Inte vid längans mittpunkt. Två vinster:
gången till salens dörr blir kort i stället för att korsa halva gården,
och korridoren kan mynna i gaveln utan att en rumscell offras för
passagen.

---

## 4. Blockerande frågor — sim-lagrets, inte monteringens

Nio stycken.

**1. Anläggningen är större än landmärket.** ⛔ BLOCKERANDE
`gry-gastgivaregard-01` har footprint 28 × 18 m. Rummet mäter
51,85 × 51,50 m. Antingen växer landmärket, eller så deklareras gård och
längor som egen volym. Rummet kan inte placeras förrän det är avgjort.

**2. `BusinessClass` har ingen `'gästgiveri'`.** ⛔ BLOCKERANDE
Klassen måste finnas i `businessClass.ts` med `capacityFor = 100` innan
rummet kan väljas.

**3. Hundra platser mot reducerarens sexton.**
`interiorLayout.TOTAL_SEATS` är 16 och matar
`DEFAULT_POLICIES.capacity`. En klass med hundra platser kräver att
kapaciteten blir klassberoende, inte en modulkonstant. Det är en
reducerarändring.

**4. Gästrummen har ingen beläggningsmodell.**
Åttio rum finns som geometri och som specar, men simuleringen har inget
begrepp för en gäst som *bor* — `GuestState` går arriving → waiting →
seated → … → leaving inom ett dygn. Övernattning, incheckning och
nyckelutlämning finns inte. **Rummen kan inte tilldelas.** Morgonvägen är
byggd och mätt, men vem som går den är sim-lagrets fråga.

**5. Utomhusbaren vet inte när den är öppen.**
Varken årstid, väder eller temperatur finns i simuleringen, och en utebar
i februari är inte samma sak som en i juli. Geometrin står kvar året om;
bemanningen kräver ett tillstånd som inte finns. Kapacitet har den ingen —
man står vid disken, och en stående gäst har inget tillstånd.

**6. Boulebanan är en yta, inte ett spel.**
Att någon spelar kräver en aktivitet gästen kan befinna sig i, och
`GuestState` har bara bordsvägen. Banan finns som yta och som plats att
stå på.

**7. `FLOOR_ZONES_BY_BUSINESS` saknar `'gästgiveri'`.**
De fem zonerna här måste in i registret innan paletten kan hävdas i test.
Se den separata ordern för `silhouetteContrast.zones.ts`.

**8. Fem roller, inga uppgiftstillstånd.**
`kitchen`, `hallService`, `host`, `breakfast`, `rooms` finns som geometri
och uniform, men `TeamMember` bär bara `role`. Stationerna är
rollkonstanter, inte händelser. `rooms`-rollen är dessutom den enda i hela
serien vars arbete ligger utanför den byggnad hon är stationerad i.

**9. Sex stationer, ingen rättmodell.**
Samma flagga som de tre andra rummen, nu med fler lådor att inte veta
något om.

---

## 5. Definition of Done

Mätning i vyn, inte närvaro i scengrafen.

| # | Krav | Referensvärde ur modellen |
| --- | --- | --- |
| 1 | Anläggningens utbredning | 51,85 × 51,50 m |
| 2 | Salens utbredning · fri takhöjd | 26,60 × 17,60 m · 5,00 m |
| 3 | Högsta inredning i salen | 2,32 m (spiskåpan) — inte samma tal som taket |
| 4 | Längornas höjd över golv | 5,91 m |
| 5 | Platser i salen | 100 |
| 6 | Gästrum · dörrplan i scengrafen | 80 · 80, `checkRoomCount().ok` |
| 7 | Gårdens yta | 891 m² |
| 8 | Gårdens innehåll | 129 m² gräs · 60 m² boule · 7 träd |
| 9 | Loftgång, båda längorna | 68,0 m |
| 10 | Golvzoner · luminansspann | 5 · 0,008 |
| 11 | Kontrast figur↔golvzon | 2,02 – 2,52 (band 1,8 – 3,6) |
| 12 | `checkPaletteAgainstFloors()` tom | 0 par utanför bandet |
| 13 | Roll-ΔE, minsta par | ≥ 12 |
| 14 | En figur går entré → varje plats | `walkPathToSeat()` × 100 |
| 15 | En figur går gästrum → sal, **med höjd** | `walkPathFromRoom` + `walkHeightsFromRoom` × 80 |
| 16 | Golvytan har figurpixlar där platserna är | Kroppar monterade, inte bara specade |

Krav 3 och 2 är avsiktligt två rader: takhöjden läses ur väggarna,
högsta inredning ur inredningen. Under bygget mättes takhöjden ur
`parts.interior` och rapporterade 2,22 m fri höjd i en sal som är 5,00 —
en mätning som blandar ihop möbler med tak är ingen mätning.

Krav 10–13 bör bli tester i `paletteContrast.test.ts`.

Ett rum mindre än `MIN_WIDTH_M × MIN_DEPTH_M` returnerar `fits: false` med
underskottet i meter. **Montera inte ett rum med `fits: false`.**

---

## 6. Vad som inte ingår

Gäster och personal (`figureRig.ts`). Rekvisita och huvudbonader
(`figureProps.ts`, egen order). Bordsdukning, glas, tallrikar, tavlor,
armaturer — inget löst rekvisitalager finns beställt för något av rummen.
Ljus, himmel, väder. De tre andra verksamhetsklasserna och food trucken.
Ingen simuleringslogik.

---

## 7. Fast kontra ändringsbart

**Fast:** U-formen och gårdens öppning i +Z; att rummen ligger i längorna
och inte över salen; de två trapporna som morgonrörelsens enda punkter,
och loftgången som gör den läsbar; grusstråket X ±3 alltid fritt; kammen;
kökets linje; halvväggarna på 1,5 m; golvzonernas luminansspann på 0,008 —
antalet zoner är fritt, spridningen är inte det.

**Ändringsbart:** antal celler per länga, gräsmattans och boulebanans
mått, ståkanternas längd, kökets sex stationer, anläggningens bredd och
djup inom minimimåtten.
