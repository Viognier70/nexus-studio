# ORDER — Vinbaren: montering av `wineBarRoom.ts`

**Projekt** nexus-studio · strategiska spåret
**Lyder under** SUPERSEDING_DIRECTIVE_004 (3D-scen, kroppar utan ansikten)
**Formmall** ORDER — Ölkrog med bryggeri (`brewpubRoom.ts`), samma kontrakt
**Mottagare** Claude Code
**Beroenden** `figureRig.ts` i `main` (kroppar), `silhouetteContrast.ts` i `main`
(kontrastbandet — finns sedan ORDER 123)

Rummet **ersätter `Restaurant.tsx`** för den lokal som i dag bär skylten
`VINBAREN`. Det ska läsa som samma plats sedd på nytt, inte som en annan
byggnad.

---

## 1. Leveransen som ska monteras

En fil, självständig, ren three.js:

```
frontend/src/strategic/scene/wineBarRoom.ts
```

Inga binära assets, inga externa beroenden utöver `three`, ingen skinning,
inga loaders. Rummet byggs imperativt en gång i `createWineBarRoom()` och äger
ingen klocka — `updateWineBarRoom(room, phase)` vrider bara skivtallriken.

`wineBarRoom.js` (webbläsarspegeln som HTML-modellen kör) **ska inte in i
repot.**

---

## 2. Vad filen exporterar

| Export | Vad |
| --- | --- |
| `createWineBarRoom(options?)` | Bygger rummet. Returnerar `WineBarRoom`. |
| `updateWineBarRoom(room, phase)` | Enda rörliga delen. `phase` 0..1 från anroparen. |
| `walkPathToSeat(room, seatId)` | Vägpunkter entré → plats, lokal XZ. |
| `exitPathFromSeat(room, seatId)` | Samma korridorer baklänges, ut till väntplatsen. |
| `resolveWorldPositions(room)` | Världskoordinater efter placering. Bron till sim-lagret. |
| `eyeHeightForSeat(seat)` | Ögonhöjd i lokal y. **Använd denna, räkna inte själv.** |
| `measureWineBarRoom(room)` | §5-måtten. |
| `checkSightLines(room)` | Per plats: hyllplan som syns + om DJ:n syns. |
| `checkPaletteAgainstFloors(min?, max?)` | Kontrastbandet per golvzon. Tom lista = godkänt. |
| `paletteContrastRange()` | Lägsta och högsta uppmätta kontrast. |
| `disposeWineBarGeometry()` | Frigör den delade geometricachen. |
| `TOTAL_SEATS` = 20, `STANDING_SPOTS` = 4 | |
| `MIN_WIDTH_M` = 13.8, `MIN_DEPTH_M` = 10.2 | Under detta: `fits: false`. |
| `EYE_ABOVE_SEAT_M` = 0.84, `PLINTH_M` = 0.11, `EYE_STANDING_M` = 1.66 | |
| `BASE_FLOOR`, `ZONE_FLOORS`, `GUEST_GARMENTS`, `STAFF_UNIFORMS` | Paletten som data. |
| `FLAGS` | Sju poster. Se §4. |

`room.parts`: `turntable`, `roof`, `walls`, `interior`, `bar`,
`shelfTargets[]`, `djTarget`, `glassAnchor`, `passAnchor`, `bottleAnchor`.

---

## 3. Montering

### 3.1 Placering

Samma konvention som `brewpubRoom.ts` och `interiorLayout.ts`: lokal +X är
långa axeln med entrén i +X-änden, lokal +Z korta axeln, origo i polygonens
centroid, golvplanet y = 0.

```ts
const room = createWineBarRoom({ width: obb.w, depth: obb.d });
room.group.position.set(obb.centre[0], 0, obb.centre[1]);
room.group.rotation.y = -obb.angle;
```

`resolveWorldPositions(room)` anropas EFTER placeringen.

### 3.2 Kapacitet och platser

`room.seats` är tjugo poster i `interiorLayout`-konventionens ordning:
loungeplatser 0–7, tvåor 8–13, barstolar 14–19. Tre sitshöjder förekommer —
lounge 0,38, stol 0,45, barstol 0,75 — och det påverkar två saker:

```ts
// figurens rot
rig.root.position.y = PLINTH_M + (seat.seatHeight - 0.45);
// ögonhöjd, om monteringen behöver den
const eye = eyeHeightForSeat(seat);
```

`poseSeated` i `figureRig.ts` är kalibrerad för en 0,45 m sits; differensen
tas i rotens y. **Räkna inte ögonhöjd som en konstant** — det felet gav 0 av 6
barstolar med sikt till flaskhyllan under utvecklingen av det här rummet.

`room.standing` är fyra ståplatser. **Ingår inte i kapaciteten** — flagga 4.

### 3.3 Avståndstoning

`parts.roof` och `parts.walls` är egna grupper, som `Restaurant.tsx` håller
sina isär. `parts.interior` tonas in när kameran närmar sig. `parts.bar` är en
egen grupp om baren ska hållas synlig längre än resten.

### 3.4 Kroppar

Gäster och personal monteras med `figureRig.ts` i en egen grupp **utanför**
`room.group`. `checkSightLines()` raycastar mot `room.group`; kroppar inuti
den gör provet meningslöst.

Färgerna tas ur `GUEST_GARMENTS` och `STAFF_UNIFORMS` — **inte** ur en egen
palett. Se §4 flagga 7.

### 3.5 Fästen

`parts.glassAnchor` (glas på disken), `parts.bottleAnchor` (flaska i hyllan),
`parts.passAnchor` (tallrik vid passluckan). Tomma `Object3D`; rekvisitan
porteras i senare order.

---

## 4. Blockerande frågor — sim-lagrets, inte monteringens

Sju stycken. Nummer ett blockerar hela ordern; resten blockerar var sin
funktion. Presentationslagret fattar inga simuleringsbeslut.

**1. `BusinessClass` har ingen `'vinbar'`.** ⛔ BLOCKERANDE
Rummet kan inte väljas förrän klassen finns i `businessClass.ts` med
`capacityFor = 20`. Förutsättning för monteringen, inte en del av leveransen.
Inget av kraven i §5 går att pröva innan den finns.

**2. DJ-tillstånd saknas.**
Geometrin har platta, fond, pult och skivtallrik. Men ingenting i
simulationen säger om det spelas nu: ingen kvällsfas, ingen musiknivå, ingen
publikrespons. **Skicka `phase = 0`** tills ett sådant tillstånd finns.
DJ-figuren står i `poseWork` som roll­konstant, inte som händelse.

**3. Sommelierens ärende saknas.**
Rörelsen mellan gäst och hylla är rummets signatur och kan inte drivas
härifrån. Det finns inget ärende-tillstånd — ingen "hämtar flaska till bord
3". Fästena finns; ärendet gör det inte. Fram till dess står sommelieren vid
disken.

**4. Ståplats vid baren saknar tillstånd.**
Sim-lagret känner bara `seats[]` och `TOTAL_SEATS`. En stående gäst har inget
tillstånd, så de fyra ståplatserna räknas inte som kapacitet.

**5. Loungen saknar sällskapsbegrepp.**
Sim-lagret tilldelar platser som en platt lista. En ensam gäst kan hamna mitt
i en tom loungegrupp medan en fyra splittras över två grupper. Rummet
exponerar `furnitureId` per plats så gruppering blir möjlig — urvalet är
sim-lagrets.

**6. Kökets två stationer saknar rättmodell.**
Smårätter betyder färre stationer än ölkrogens tre. Vilken station en given
rätt använder kräver en meny-/rättmodell som inte finns.

**7. `FLOOR_COLOUR` är en konstant men rummet har fem golvzoner.** ⚠ NY
`silhouetteContrast.ts` håller bandet mot ETT golv (`#a89577`, luminans
0,3115), vilket ger figurfönstret L ∈ [0,050 · 0,151]. Med fem zoner gäller
bandet per zon, och fönstret krymper till **snittet** över alla fem:
undre gränsen sätts av det ljusaste golvet, övre av det mörkaste. Här blir det
L ∈ [0,0509 · 0,1154].

Konsekvensen är inte kosmetisk: **en ny golvzon kan underkänna en palett som
redan är godkänd**, utan att någon figurfärg har ändrats.
`checkPaletteAgainstFloors()` hävdar bandet mot alla fem zoner i det här
rummet, men den riktiga lösningen är att `FLOOR_COLOUR` blir en lista eller en
funktion av zon i `silhouetteContrast.ts`, med `paletteContrast.test.ts`
uppdaterad. **Beslutet hör i den filen, inte i det här rummet.**

Rummet håller sig därför inom ett medvetet smalt luminansspann,
0,248–0,313, i stället för att sprida zonerna. Det öppna golvet i mitten har
med flit huvudgolvets färg och ingen egen zon — en sjätte zon skulle krympa
figurfönstret ytterligare.

---

## 5. Definition of Done

Rummet monteras i scenen och mäts i playwright. Kravet är mätning i vyn, inte
närvaro i scengrafen — en tidigare leverans passerade som utförd med en
platshållare som aldrig syntes.

| # | Krav | Referensvärde ur modellen |
| --- | --- | --- |
| 1 | Inredningen har utbredning i vyn | 15,20 × 11,40 m |
| 2 | Flaskhyllans topp under taket | 2,51 m mot innertak 3,40 m |
| 3 | DJ-zonens golvyta | 6,60 m² (platta 3,0 × 2,2 + zonmarkering) |
| 4 | Platser: lounge / bar / bord | 8 / 6 / 6, plus 4 ståplatser |
| 5 | Platser med fri sikt till flaskhyllan | 20 av 20 |
| 6 | Barstolar som ser alla fyra hyllplan | 6 av 6 |
| 7 | Platser som ser DJ:n | 20 av 20 |
| 8 | Smalaste passagen på någon av de tjugo vägarna | 0,95 m fri bredd mot kropp 0,46 m |
| 9 | `checkPaletteAgainstFloors()` returnerar tom lista | 60 par prövade, 0 utanför bandet |
| 10 | Kontrastspann figur↔golvzon | 2,22 – 2,75 (band 1,8 – 3,6) |
| 11 | Roll-ΔE, minsta personalpar | 16,6 (krav 12) |
| 12 | En figur går entré → varje plats | `walkPathToSeat()` för alla tjugo |
| 13 | Golvytan har figurpixlar där platserna är | Kroppar monterade, inte bara specade |

Krav 1–4 läses med `measureWineBarRoom()`, 5–7 med `checkSightLines()`,
9–11 med `checkPaletteAgainstFloors()` / `paletteContrastRange()`.
Krav 12–13 är vyprovet: gå vägarna, rendera, mät.

Krav 9–11 bör dessutom bli **tester**, inte bara en playwright-mätning —
`paletteContrast.test.ts` finns redan och är rätt ställe.

Ett rum mindre än `MIN_WIDTH_M × MIN_DEPTH_M` returnerar `fits: false` med
underskottet i meter. **Montera inte ett rum med `fits: false`** — planen ska
inte krympas tyst.

---

## 6. Vad som inte ingår

Gäster och personal (`figureRig.ts`, monteras separat). Ljussättning, himmel,
väder. Ölkrogen, gästgiveriet, nattklubben, food trucken. Rekvisita och
huvudbonader. Ingen simuleringslogik.

---

## 7. Fast kontra ändringsbart

**Fast** (bär planlösningen): bardiskens läge som rummets mitt; flaskhyllan
bakom den; att barstolarna vänder mot hyllan; visningsbandet över diskens
överkant; sommelierens runway 1,00 m; DJ-plattans zon — platta **plus**
golvbyte **plus** fond, inte bara pulten; loungens fyra separata dynor;
golvzonernas smala luminansspann; taket 3,40 m.

**Ändringsbart**: antal hyllplan (4), sitsfördelningen inom de tjugo,
ståkantens längd, kökets två stationer, rummets bredd och djup inom
minimimåtten.
