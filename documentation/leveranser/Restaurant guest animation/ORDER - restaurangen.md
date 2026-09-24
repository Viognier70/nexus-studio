# ORDER — Restaurangen: montering av `restaurantRoom.ts`

**Projekt** nexus-studio · strategiska spåret
**Lyder under** SUPERSEDING_DIRECTIVE_004 (3D-scen, kroppar utan ansikten)
**Formmall** ORDER — Ölkrog med bryggeri (`brewpubRoom.ts`), samma kontrakt
**Mottagare** Claude Code
**Beroenden** `figureRig.ts` i `main`, `silhouetteContrast.ts` i `main`

Rummet **ersätter `Restaurant.tsx`** för spelarens verksamhet. Det är den
fjärde och sista verksamhetsklassen — och den enda som redan fanns byggd.

---

## 1. Läs detta först — repot har två matsalar

Det här är inte en anmärkning i marginalen. Det är ordern.

| | A · `RESTAURANT_INTERIOR` | B · `interiorLayout.ts` |
| --- | --- | --- |
| Ligger i | `content/grythyttan.ts` | `business/interiorLayout.ts` |
| Grund | Landmärke, axelparallellt | OBB, OSM-byggnad w869907975 |
| Mått | 16 × 12 m, centrum (0, 20) | 15,6 × 11,8 m, roterad ~7° |
| Bord | Sex, i ett 2 × 3-raster | Fem, i en rad längs långaxeln |
| Bar | Längs västra väggen, löper i Z | Längs −Z-väggen, löper i X |
| Platser | Inga specade | 16, `TOTAL_SEATS` |
| Renderas av | **`Restaurant.tsx`** | — |
| Används av | — | **`InteriorGuests`, `InteriorStaff`** |

Gästerna sitter alltså i en annan byggnad än borden står i, med annan
rotation och annat centrum. Ingen av filerna vet om det.

**Leveransen följer B.** Skälen är inte smaksak:

1. `TOTAL_SEATS` i B matar reducerarens `DEFAULT_POLICIES.capacity`.
   Ändras platserna ändras spelet.
2. ORDER 042 §3.2 (APPROXIMATION_REGISTER post 5 och 6) föreskriver OBB och
   underkänner uttryckligen AABB-layout. A är AABB.
3. B:s byggnad är verklig. A:s landmärke är märkt `placeholder`.

**Vid montering ska följande raderas, inte lämnas kvar:**
`RESTAURANT_INTERIOR.bar`, `.kitchen`, `.tables`, `.staffHomes`. En andra
sanning som ingen läser är värre än ingen sanning alls — det var precis
den här konstruktionen som lät felet ligga i drift.

---

## 2. Leveransen

```
frontend/src/strategic/scene/restaurantRoom.ts
```

Ren three.js, primitiver, inga externa beroenden utöver `three`. Byggs
imperativt en gång i `createRestaurantRoom()`. `updateRestaurantRoom(room,
phase)` vrider bara fläkthjulet i spiskåpan.

`restaurantRoom.js` är webbläsarspegeln för HTML-modellen och **ska inte in
i repot.**

### Exporter

| Export | Vad |
| --- | --- |
| `createRestaurantRoom(options?)` | Bygger rummet. |
| `updateRestaurantRoom(room, phase)` | Enda rörliga delen. |
| `walkPathToSeat` / `exitPathFromSeat` | Vägpunkter, lokal XZ. |
| `resolveWorldPositions(room)` | Världskoordinater efter placering. |
| `eyeHeightForSeat(seat)` | Ögonhöjd. **Räkna inte själv.** |
| `measureRestaurantRoom(room)` | §5-måtten. |
| `checkSeatContract(room)` | Antal, index­ordning, bordsplatser före stolar. |
| `checkPaletteAgainstFloors()` / `paletteContrastRange()` | Kontrastbandet. |
| `disposeRestaurantGeometry()` | Frigör den delade cachen. |
| `TOTAL_SEATS` = 16, `MIN_WIDTH_M` = 13,0, `MIN_DEPTH_M` = 9,8 | |
| `BASE_FLOOR`, `ZONE_FLOORS`, `GUEST_GARMENTS`, `STAFF_UNIFORMS` | Paletten som data. |
| `FLAGS` | Sju poster. Se §4. |

`room.parts`: `hoodFan`, `roof`, `walls`, `interior`, `bar`, `sign`,
`glassAnchor`, `passAnchor`.

Rummet exponerar dessutom **hela** ORDER 043 §6-uppsättningen —
`waitingSlots`, `declinedSlots`, `arrivalSlots`, `deliveryBay`,
`deliveryApproach` — med samma värden som `interiorLayout` räknar fram i
dag, så konsumenterna kan byta källa utan att byta beteende.

---

## 3. Montering

### 3.1 Placering

```ts
const room = createRestaurantRoom({ width: obb.w, depth: obb.d });
room.group.position.set(obb.centre[0], 0, obb.centre[1]);
room.group.rotation.y = -obb.angle;
```

`resolveWorldPositions(room)` anropas EFTER placeringen.

### 3.2 Platserna är låsta — i antal OCH ordning

4 × tvåa + 1 × fyra + 4 barstolar = 16, per Vision Owner-godkännande
2026-08-08. Reduceraren indexerar rakt in i `seats[]`: bordsplatser
t0…t4 på index 0–11, sedan barstolarna på 12–15.

Till skillnad från de tre andra rummen kan sitsfördelningen **inte**
justeras. `checkSeatContract()` prövar antal och ordning — kör den i test,
för båda kan gå sönder tyst.

Tre sitshöjder förekommer inte här (0,45 stol, 0,75 barstol), men regeln
är densamma som i vinbaren:

```ts
rig.root.position.y = 0.11 + (seat.seatHeight - 0.45);
const eye = eyeHeightForSeat(seat);   // aldrig en konstant
```

### 3.3 Avståndstoning

`parts.roof`, `parts.walls`, `parts.bar` och `parts.sign` är egna grupper.
`Restaurant.tsx` tonar redan tak och väggar med kameraavståndet
(`restaurantRoofFadeMid/Half`, `restaurantInteriorFadeMid/Half` i
`GRAY_BOX_CAMERA`) — den logiken flyttas över oförändrad och pekas om till
grupperna.

**Obs:** om ni skalar `parts.walls` i y för att kapa dem, gör det på
gruppen — `measureRestaurantRoom()` läser takhöjden ur en väggmesh och
påverkas inte. Det var ett fel under bygget: en Box3 över den skalade
gruppen rapporterade 1,00 m fri takhöjd i ett rum som är 3,00.

### 3.4 Kroppar

Monteras med `figureRig.ts` i en egen grupp **utanför** `room.group`.
Färgerna ur `GUEST_GARMENTS` och `STAFF_UNIFORMS`, inte ur en egen palett.

---

## 4. Blockerande frågor — sim-lagrets, inte monteringens

**1. Två layouter i drift.** ⛔ BLOCKERANDE
Se §1. Detta är den enda flaggan i alla fyra rummen som pekar på ett fel
som redan är i produktion, inte på en saknad förutsättning. Ordern kan
inte prövas förrän en av layouterna är borta.

**2. `BAR_WIDTH_M` gör två saker.**
`BAR_WIDTH_M = 1,6` med `BAR_OFFSET_M = 0,6` lämnar 0,6 m mellan disk och
vägg. Det är ingen passage — en figur är 0,46 m bred och behöver dryga
0,8. Konstanten blandar ihop *strippens* djup (en renderingshint) med
*diskens*. Rummet löser det utan att röra en enda plats: framkanten ligger
kvar på lokal Z = −3,70, som barstolarna härleds ur, och disken görs
0,70 m djup. Runwayen blir 1,30 m.
**Men:** ändras `BAR_WIDTH_M` i `interiorLayout` flyttar barstolarna,
eftersom `stoolLocalZ` räknas ur den. Konstanten bör delas i två.

**3. Platsblandningen kan inte ändras.**
Se §3.2. Ingen fråga till sim-lagret — en varning till monteringen.

**4. Tre roller, inga uppgiftstillstånd.**
`host`, `server`, `chef` finns som geometri och uniform, men `TeamMember`
bär bara `role`. Stationerna är rollkonstanter, inte händelser. Samma
flagga som i de tre andra rummen.
`RESTAURANT_INTERIOR.staffHomes` är dessutom räknade i den geometri som
utgår — lägena är omräknade i rummet och ska inte hämtas därifrån.

**5. Landmärket heter vinbar.**
`gry-vinbar-placeholder-01`, displayName `'Restaurang (Gray Box)'`,
`verificationStatus: 'placeholder'`. Nu när vinbaren finns som egen
verksamhetsklass träffar en sökning på "vinbar" i repot restaurangen. Bör
döpas om i samma ändring som RESTAURANT_INTERIOR rensas.

**6. Två stationer, ingen rättmodell.**
Spis och prep är geometri; kopplingen till en rätt kräver en meny-modell
som inte finns.

**7. Palettkoden finns i fyra kopior.**
Fjärde upprepningen av samma WCAG-formler.
`silhouetteContrast.zones.ts` levereras separat och har redan nyckeln
`restaurang` i `FLOOR_ZONES_BY_BUSINESS`. Efter merge tas palettkoden i
rumsfilerna bort.

---

## 5. Definition of Done

Mätning i vyn, inte närvaro i scengrafen.

| # | Krav | Referensvärde ur modellen |
| --- | --- | --- |
| 1 | Inredningen har utbredning i vyn | 15,20 × 11,40 m |
| 2 | Fri takhöjd, mätt ur en väggmesh | 3,00 m |
| 3 | Högsta inredning under taket | 2,22 m (spiskåpan) |
| 4 | Platser: bord / bar | 12 / 4 = 16 |
| 5 | `checkSeatContract()` håller | 16 av 16, ordning ok, bordsplatser först |
| 6 | Bardiskens längd | 10,92 m (= `width` × 0,7) |
| 7 | Runway bakom disken | 1,30 m mot kropp 0,46 m |
| 8 | Smalaste passagen på någon av de sexton vägarna | 0,93 m fri bredd |
| 9 | `checkPaletteAgainstFloors()` tom | 33 par prövade, 0 utanför |
| 10 | Kontrastspann figur↔golvzon | 2,66 – 2,89 (band 1,8 – 3,6) |
| 11 | Roll-ΔE, minsta par | 17,9 (krav 12) |
| 12 | En figur går entré → varje plats | `walkPathToSeat()` för alla sexton |
| 13 | Golvytan har figurpixlar där platserna är | Kroppar monterade, inte bara specade |
| 14 | Slot-uppsättningarna oförändrade | 8 kö, 8 avvisade, 6 ankomst |

Krav 9–11 bör bli tester i `paletteContrast.test.ts`, inte bara en
playwright-mätning. Krav 5 likaså — platsordningen är reducerarens
kontrakt och hör hemma i en assertion.

Ett rum mindre än `MIN_WIDTH_M × MIN_DEPTH_M` returnerar `fits: false` med
underskottet i meter. **Montera inte ett rum med `fits: false`.**

---

## 6. Vad som inte ingår

Gäster och personal (`figureRig.ts`). Rekvisita och huvudbonader
(`figureProps.ts`, egen order). Bordsdukning, glas, tallrikar, tavlor,
armaturer — inget löst rekvisitalager finns beställt för något av de fyra
rummen. Ljus, himmel, väder. De tre andra verksamhetsklasserna. Ingen
simuleringslogik.

---

## 7. Fast kontra ändringsbart

**Fast:** de tre banden tvärs långaxeln; bardiskens framkant på lokal
Z = −3,70; bordsradens Z = 3,00; platsordningen i `seats[]`; entrén i +X
och leveransen i −X; att baren är en servicedisk utan bakhylla.

**Ändringsbart:** bardiskens djup bakåt, kökets två stationer, rummets
bredd och djup inom minimimåtten.

**Inte ändringsbart härifrån:** platsblandningen.
