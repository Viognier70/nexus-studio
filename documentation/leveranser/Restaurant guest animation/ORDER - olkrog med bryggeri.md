# ORDER — Ölkrog med bryggeri: montering av `brewpubRoom.ts`

**Projekt** nexus-studio · strategiska spåret
**Lyder under** SUPERSEDING_DIRECTIVE_004 (3D-scen, kroppar utan ansikten)
**Mottagare** Claude Code
**Beroende** ORDER 121 (`figureRig.ts`) måste ligga i `main` först — rummet
placerar kroppar med den riggen.

---

## 1. Leveransen som ska monteras

En fil, självständig, ren three.js:

```
frontend/src/strategic/scene/brewpubRoom.ts
```

Inga binära assets. Inga externa beroenden utöver `three`. Ingen skinning,
inga loaders. Rummet byggs imperativt en gång i `createBrewpubRoom()` och
äger ingen klocka — `updateBrewpubRoom(room, phase)` är den enda muterande
funktionen och driver bara omrörararmen i mäskkaret.

`brewpubRoom.js` (webbläsarspegeln som HTML-modellen kör) **ska inte in i
repot.** Den finns bara för att kunna se rummet innan det byggs in.

---

## 2. Vad filen exporterar

| Export | Vad |
| --- | --- |
| `createBrewpubRoom(options?)` | Bygger rummet. Returnerar `BrewpubRoom`. |
| `updateBrewpubRoom(room, phase)` | Enda rörliga delen. `phase` 0..1 från anroparen. |
| `walkPathToSeat(room, seatId)` | Vägpunkter entré → plats, lokal XZ. |
| `exitPathFromSeat(room, seatId)` | Samma korridorer baklänges, ut till väntplatsen. |
| `resolveWorldPositions(room)` | Världskoordinater efter placering. Bron till sim-lagret. |
| `measureBrewpubRoom(room)` | §7-måtten: utbredning, kärl, platser. |
| `checkSightLines(room)` | Per plats: hur många jästankar som syns. |
| `disposeBrewpubGeometry()` | Frigör den delade geometricachen. |
| `TOTAL_SEATS` = 20, `STANDING_SPOTS` = 8 | |
| `MIN_WIDTH_M` = 13.4, `MIN_DEPTH_M` = 9.6 | Under detta: `fits: false`. |
| `EYE_SEATED_M` = 1.29, `EYE_STANDING_M` = 1.55 | Siktlinjeprovets ögonhöjder. |
| `SIGHT_LINE_NOTE`, `FLAGS` | Varför disken ser ut som den gör; vad som är oavgjort. |

`room.parts` bär namngivna noder monteringskoden behöver:
`mashRake`, `roof`, `walls`, `interior`, `brewery`, `fermenterTops[]`,
`tapAnchor`, `passAnchor`.

---

## 3. Montering

### 3.1 Placering

Rummet byggs i byggnadens OBB-lokala ram, samma konvention som
`interiorLayout.ts`: lokal +X är långa axeln med entrén i +X-änden, lokal +Z
är korta axeln, origo i polygonens centroid, golvplanet y = 0.

```ts
const room = createBrewpubRoom({ width: obb.w, depth: obb.d });
room.group.position.set(obb.centre[0], 0, obb.centre[1]);
room.group.rotation.y = -obb.angle;   // samma tecken som Restaurant.tsx
```

`resolveWorldPositions(room)` anropas EFTER placeringen. Sim-lagret ska inte
göra om transformen själv.

### 3.2 Kapacitet och platser

`room.seats` är tjugo poster i `interiorLayout`-konventionens ordning:
bordsplatser 0–11 (två långbord om fyra, två tvåor), barstolar 12–19.
Varje post bär `id`, `kind`, `seatIndex`, `furnitureId`, lokal XZ, `seatHeight`,
`facing` och angörningsnod med korridor.

`room.standing` är åtta ståplatser. **De ingår inte i kapaciteten** — se
flagga 3.

### 3.3 Avståndstoning

`parts.roof` och `parts.walls` är egna grupper, av samma skäl som
`Restaurant.tsx` håller sina isär: tak och vägg tonas med kameraavståndet.
`parts.interior` tonas in när kameran närmar sig.

### 3.4 Kroppar

Gäster och personal monteras med `figureRig.ts`, i en egen grupp **utanför**
`room.group`. Det är inte kosmetik: `checkSightLines()` raycastar mot
`room.group`, och kroppar inuti den gör provet meningslöst.

Sitshöjden: `rig.root.position.y = 0.11 + (seat.seatHeight - 0.45)` —
sockeln är 0,11 m och `poseSeated` är kalibrerad för en 0,45 m sits.

### 3.5 Fästen

`parts.tapAnchor` (tappningsindikator) och `parts.passAnchor` (tallrik vid
passluckan) är tomma `Object3D`. Föremålen porteras i senare order.

---

## 4. Blockerande frågor — måste besvaras av sim-lagret, inte av monteringen

Fem stycken. Nummer ett blockerar hela ordern; resten blockerar var sin
funktion. Presentationslagret fattar inga simuleringsbeslut.

**1. `BusinessClass` har ingen `'ölkrog'`.** ⛔ BLOCKERANDE
Rummet kan inte väljas förrän klassen finns i `businessClass.ts` med
`capacityFor = 20`. Det är en förutsättning för monteringen och ingår inte i
den här leveransen. Ingen annan del av ordern går att pröva innan den finns.

**2. Beställning vid disk saknar gästtillstånd.**
Geometrin stöder det — stolarna vänder mot tanken, disken har fri passage i
båda ändar. Men gästens tillståndsmaskin går `arriving → waiting → seated →
ordered`; det finns inget tillstånd för *går till disken, beställer, bär
tillbaka*. **Serveringsflödet är bordsservering tills ett sådant tillstånd
finns.** Uppfinn det inte i monteringen.

**3. Ståplatserna saknar tillstånd.**
Sim-lagret känner bara `seats[]` och `TOTAL_SEATS`. En stående gäst har inget
tillstånd, så de åtta ståplatserna räknas inte som kapacitet. De finns som
geometri och kan tas i bruk den dag tillståndet finns.

**4. Bryggfasen är inte sim-data.**
`updateBrewpubRoom(room, phase)` vrider omrörararmen. Om den ska vrida sig
alls — vilket kärl som är varmt, om det bryggs i dag — är produktionstillstånd
som inte finns. **Skicka `phase = 0` tills det gör det.**

**5. Kökets tre stationer saknar rättmodell.**
Vilken station en given rätt använder kräver en meny-/rättmodell som inte
finns. Geometrin är tre stationer; kopplingen är öppen.

---

## 5. Definition of Done

Rummet monteras i scenen och mäts i playwright. Kravet är mätning i vyn, inte
närvaro i scengrafen — en tidigare leverans passerade som utförd med en
platshållare som aldrig syntes.

| # | Krav | Referensvärde ur modellen |
| --- | --- | --- |
| 1 | Inredningen har utbredning i vyn | 15,20 × 11,45 m |
| 2 | Högsta kärl står under taket | 2,73 m mot innertak 3,40 m |
| 3 | Kärl räknade i scengrafen | 7 |
| 4 | Platser · ståplatser | 20 · 8 |
| 5 | Platser med fri sikt till bryggeriet | 20 av 20 |
| 6 | Barstolar som ser alla fyra jästankar | 8 av 8 |
| 7 | Smalaste passagen på någon av de tjugo vägarna | 0,95 m fri bredd mot kropp 0,46 m |
| 8 | En figur går entré → varje plats | `walkPathToSeat()` för alla tjugo |
| 9 | Golvytan har figurpixlar där platserna är | Kroppar monterade, inte bara specade |

Krav 1–7 läses med `measureBrewpubRoom()` och `checkSightLines()`.
Krav 8–9 är §7-provet: gå vägarna, rendera, mät.

Ett rum som är mindre än `MIN_WIDTH_M × MIN_DEPTH_M` returnerar
`fits: false` med underskottet i meter. **Montera inte ett rum med
`fits: false`** — planen ska inte krympas tyst.

---

## 6. Vad som inte ingår

Gäster och personal (finns som `figureRig.ts`, monteras separat).
Ljussättning, himmel, väder. Vinbaren, gästgiveriet, nattklubben, food
trucken. Rekvisita och huvudbonader. Ingen simuleringslogik — rummet är
geometri; vad som händer i det är sim-lagrets sak.

---

## 7. Fast kontra ändringsbart

**Fast** (bär planlösningen; ändra inte utan att läsa om rummet):
bandindelningen längs +X, sockelkantens linje på −3,6, bardiskens läge och att
stolarna vänder mot tankarna, frånvaron av bakhylla, passagerna på 1,05–1,20 m,
taket i 3,40 m.

**Ändringsbart** (parametrar; ändrar inte hur rummet läses): antal jästankar,
sitsfördelningen inom de tjugo, ståkanternas längd, kökets tre stationer,
rummets bredd och djup inom minimimåtten.
