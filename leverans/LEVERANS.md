# LEVERANS — sex verksamhetsrum, riggen och rekvisitan

**Från** Claude Design
**Till** Claude Code
**Datum** 2026-08-30
**Projekt** nexus-studio · strategiska spåret
**Lyder under** SUPERSEDING_DIRECTIVE_004

Tio `.ts`-filer. Inget annat. Ingen order, inga modeller, inga
webbläsarspeglar.

**Detta paket ersätter allt tidigare.** Har du filer i `handoff/` från
förmiddagen: byt ut dem mot dessa, jämför inte. Byteantalen i tabellen
nedan är exakta och går att verifiera med `wc -c`.

---

## 1. Filerna

Alla ska ligga i `frontend/src/strategic/scene/`.

| Fil | Byte | Status |
| --- | --- | --- |
| `businessRoom.ts` | 12 001 | **NY.** Gemensamt rumskontrakt. Läs §2. |
| `restaurantRoom.ts` | 39 433 | Oförändrad sedan förmiddagens paket — samma byteantal. |
| `brewpubRoom.ts` | 35 113 | Oförändrad. |
| `wineBarRoom.ts` | 43 124 | Oförändrad. |
| `innRoom.ts` | 66 020 | Oförändrad. |
| `foodTruckRoom.ts` | 52 526 | **KRAFTIGT REVIDERAD.** Tre fordonsvarianter, körläge, karosseridetalj. |
| `nightClubRoom.ts` | 44 719 | **NY.** Sjätte och sista klassen. |
| `figureRig.ts` | 29 800 | Oförändrad. |
| `figureProps.ts` | 30 148 | Oförändrad. |
| `silhouetteContrast.zones.ts` | 11 996 | **REVIDERAD.** Bestämd form, två klasser tillagda, iterativ signatur. |

Summa 364 880 byte.

### Vad som INTE finns i paketet, med flit

**Inga `.js`-filer.** Varje rumsfil har en webbläsarspegel som mina
HTML-modeller kör. De skiljer sig bara på import-raden och strippade
typer, och de **ska inte in i repot** — de är arbetsmaterial.

**Inga orderdokument.** De åtta `ORDER - *.md` beskriver montering,
DoD-krav och flaggor. De hör i din inkorg, inte i `scene/`. Säg till om
du vill ha dem, men de ska inte committas som kod.

**Inga modeller.** `.dc.html`-filerna är visningar jag byggt för att
kunna avvisa geometri innan den monteras. De hör inte hit.

---

## 2. Monteringsordning — `businessRoom.ts` går först

Vision Owner 2026-08-30, svar på min fråga 4: skriv kontraktet **före**
monteringen.

Skälet: de sex rumsfilerna har sex nästan-lika API:er
(`measureRestaurantRoom`, `measureBrewpubRoom`, … `walkPathToSeat` utom
i foodtrucken där den hette `walkPathToQueueSlot`). Monteringskod mot
dem direkt får sex specialfall för sex saker som gör samma sak, och
specialfall är där fel gömmer sig — vilket restaurangens två matsalar
just visade.

```ts
import { createRoom, updateRoom, walkPathToSeat,
         measureRoom, resolveWorldPositions, blockingFlags } from './businessRoom';

const room = createRoom('kvarterskrogen', { width: obb.w, depth: obb.d });
room.group.position.set(obb.centre[0], 0, obb.centre[1]);
room.group.rotation.y = -obb.angle;
const world = resolveWorldPositions(room);
```

Nycklarna är bestämd form per ORDER 139: `kvarterskrogen`, `ölkrogen`,
`vinbaren`, `gästgiveriet`, `foodtrucken`, `nattklubben`. En okänd
nyckel **kastar** — en klass som saknas ska bli ett fel, inte ett tomt
rum.

**Obs:** `businessRoom.ts` känner i dag fem klasser. Nattklubben
tillkom efter att kontraktet skrevs och behöver en rad i `MODULES`,
`FACTORY`, `MEASURE` och `UPDATE`. Det är fyra rader; jag har lämnat
dem åt dig eftersom du ändå rör filen vid monteringen.

### Kör detta först

```ts
console.table(blockingFlags());
```

Tre flaggor stoppar montering, och alla tre är sim-sidiga. De löses
inte av mer geometri.

---

## 3. Vad som ändrats sedan förmiddagens paket

### `silhouetteContrast.zones.ts` — tre rättningar, alla begärda

1. **Nycklarna är bestämd form** per ORDER 139. Utkastet hade `ölkrog`
   och `gästgiveri`.
2. **`kvarterskrogen` och `foodtrucken` fanns inte** trots att båda
   finns i `BusinessClass`. Nu finns de.
3. **`paletteZoneCheck(figureHex, business)` är iterativ**, som
   nuvarande anropare bygger på. Batch heter `paletteZoneCheckAll`.

Kvar att göra: posten `nattklubben` med de tre zonerna som
`nightClubRoom.ZONE_FLOORS` deklarerar.

Foodtruckens `checkPaletteAgainstGround` normaliseras **inte** hit.
Klassen äger inte sin mark och tar gatans färger som argument — den
skillnaden är verklig och ska synas i signaturen.

### `foodTruckRoom.ts` — tre varianter i stället för en

`hVan` (klassikern, 5,51 × 2,13 × 2,66 m, 4 hjul), `boxVan`
(7,38 × 2,51 × 3,57, 6 hjul, skyltlåda på taket) och `cabBox`
(6,18 × 2,41 × 3,03, separat hytt). Alla under 2,60 m i transportläge.

Nytt sedan förra paketet: körläge (`updateFoodTruckRoom(room, 0)` fäller
markisen ned över luckan, drar in hyllan, lyfter stödbenen),
hjulrotation ur tillryggalagd sträcka, `advanceAlongPath()`, hjulhus,
kupat tak, räfflor, nederband, lyktor.

Och en begreppsändring som påverkar monteringen: **`room.pitch` är en
egen grupp.** Serveringsmattan är PLATSEN, inte fordonet — den ligger
kvar när vagnen kör vidare. Lägg båda i scenen och placera dem var för
sig.

---

## 4. Nattklubben — läs detta innan du monterar den

Två saker skiljer den från de fem andra och går inte att slätas ut.

### `seats[]` beskriver inte kapaciteten

150 platser är inte 150 stolar. 24 är loungebänkar; de övriga 126 är
ståplatser, och ett dansgolv har inga punkter. Filen levererar därför
`occupancyAreas[]` — rektangel, kvadratmeter, persondensitet — plus
`distributeStanding(area, n)`.

**Reduceraren skulle se 24.** `checkCapacity()` visar båda talen sida
vid sida i stället för att gömma glappet.

### Mörkret vänder paletten

De fem andra klasserna har figurer som är mörkare än golvet. Här måste
de vara ljusare, och det är räknat:

För att en delad gästton (L 0,083) ska klara bandet [1,8 · 3,6] måste
golvet ligga **L ≤ 0,0239 eller L ≥ 0,1894**. Mellanrummet
0,024–0,189 är förbjudet — och det är precis där en "dov klubbgrå"
vald på känsla hamnar.

Alla zoner måste dessutom ligga på samma sida. Blandar man en mycket
mörk zon med en ljus stängs fönstret helt.

Nattklubbens tre zoner ligger alla mörkt (L 0,0125–0,0188) och
figurfönstret blir 0,101 brett — bredare än vinbarens 0,064. Mörkret är
inte fienden; spridningen är. Uppmätt kontrast 1,92–2,79, noll par
utanför bandet, roll-ΔE 36,5 mot kravet 12.

`forbiddenFloorBand(figureHex)` är den regeln som funktion.

**En varning som hör till leveransen:** en kvällscykel som sänker
exponeringen sänker figur och golv proportionellt, så kvoten består.
Ett **rörligt** klubbljus gör det inte — en upplyst golvfläck blir en
ny, ljusare zon som ingen deklarerat, och den kan hamna i mellanrummet.
Se `FLAGS.movingLight`.

---

## 5. De tre blockerarna

Ingen av dem är geometri.

1. **`BusinessClass` saknar klasser.** `ölkrogen`, `vinbaren`,
   `gästgiveriet`, `nattklubben`. Egna ordrar efter vokabulärbytet
   (ORDER 139), per Vision Owners svar.
2. **Kapaciteten är ett platsantal.** Gästgiveriet har 100 platser mot
   `TOTAL_SEATS = 16`; nattklubben 150 mot 24; foodtrucken **noll** och
   begränsas av genomströmning. Klassberoende kapacitet är beställd men
   inte byggd.
3. **Gästens tillståndsmaskin saknar barbeställning.**
   `orderingAtCounter` och `awaitingCollection` finns inte. Ölkrogen och
   vinbaren klarar sig med bordsservering. **Foodtrucken och
   nattklubben gör det inte** — de är byggda på det. Foodtrucken
   monteras därför som geometri utan gäster, per Vision Owners beslut.

---

## 6. Två fynd som inte är mina att åtgärda

**Restaurangen har två matsalar i drift.** `RESTAURANT_INTERIOR` i
`content/grythyttan.ts` renderas av `Restaurant.tsx`;
`interiorLayout.ts` styr var `InteriorGuests` placerar gästerna.
Gästerna sitter i en annan byggnad än borden står i, med annan rotation
och annat centrum.

`restaurantRoom.ts` följer `interiorLayout` — `TOTAL_SEATS` matar
reducerarens kapacitet, ORDER 042 §3.2 föreskriver OBB, och A:s
landmärke är märkt `placeholder`. Vision Owner har bekräftat valet och
begärt att `.bar`, `.kitchen`, `.tables` och `.staffHomes` raderas i
samma ändring.

**Och pröva sambandet med ORDER 124.** Den utreder `seated=0/16` med
gäster i kön som aldrig töms. Om en gäst tilldelas en plats vars
världskoordinat ligger i en annan byggnad kan varje ankomstvillkor som
jämför position mot bord falla tyst. Det är en kandidat som inte fanns
på listan.

**`interiorLayout.BAR_WIDTH_M` gör två saker.** Den är både
renderingshint för barstrippen och styr `stoolLocalZ`, så ändrar man
den flyttar barstolarna. Vision Owner har begärt att den delas i två.

---

## 7. Om ett tal inte stämmer

Varje mått i filerna är mätt i renderad scen, inte beräknat på papper.
Hittar du en avvikelse är det ett fel i min leverans, inte i din
montering — säg till och jag rättar det.

Det som INTE är mätt, och som jag därför inte påstår: hur rummen ser ut
under `DayLighting`. Talen är mätta mot färgen. Nattklubben är den enda
klassen där skillnaden kan bli stor, och den flaggan står i §4.
