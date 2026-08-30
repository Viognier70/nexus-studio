# ORDER 152 — Personalrollernas vokabulär: Vision Owner-beslut

**Utfärdad** 2026-08-30
**Klass** AUTONOM · Beslutsdokument, ingen kod ändrad
**Gren** `order-152` (från `main`)
**Följer** ORDER 151:s fyra öppna spår
**Form** ORDER 139-mönstret: beslut här, implementering i egna order

---

## 0. Rakt svar — fyra beslut

| # | Spår | Beslut |
|---|---|---|
| 1 | En eller flera StaffRole? | **Fyra i sim, stationer per rum.** `värd, servitör, kock, lärling` är simuleringens vokabulär — de bär lön, arbetsbörda och rykte. Rummens stationer är platser, inte roller. Lokala `StaffRole`-deklarationer i `innRoom` och `nightClubRoom` döps om till `StationRole`. |
| 2 | Vem äger sim→rum-mappningen? | **Kontraktet.** `businessRoom.ts` vet vilken klass det är och har redan `stations`. En `stationFor(role, class)` hör hemma där. Renderaren frågar, räknar inte ut. |
| 3 | STAFF_UNIFORMS vs ROLE_COLOUR? | **ROLE_COLOUR vinner.** Den är kalibrerad mot silhuettbandet genom ORDER 123 och 127, mätt mot varje golvzon. Rumsfilernas STAFF_UNIFORMS är Designs förslag och har aldrig prövats mot bandet. Rumsfilerna ska importera, inte duplicera — samma princip som ZONE_FLOORS. |
| 4 | Lärling-gapet i `INTERIOR.staffHomes` + `STAFF_ROLE_ORDER`? | **Två buggar, inte ett designval.** Lärlingen ska ha ett hem. `INTERIOR.staffHomes` får en lärling-post; `STAFF_ROLE_ORDER` slutar dubblera servitör. |

---

## 1. Beslut 1 — Fyra roller i sim, stationer per rum

### 1.1 Beslut (VO 2026-08-30)

> "Fyra roller i sim, stationer per rum. `värd, servitör, kock, lärling` är simuleringens vokabulär och ska förbli fyra — de bär lön, arbetsbörda och rykte. Rummens stationer är något annat: platser, inte roller. En kock i ölkrogen kan stå vid brewer-stationen utan att bli en ny rolltyp.
>
> De lokala StaffRole-deklarationerna i innRoom och nightClubRoom ska döpas om till StationRole eller liknande. De är stationer, inte anställningar."

### 1.2 Vad det betyder i kod

- `frontend/src/strategic/types.ts:10` — `StaffRole = 'värd' | 'servitör' | 'kock' | 'lärling'` **oförändrad**.
- `frontend/src/strategic/scene/innRoom.ts:94` — `export type StaffRole = 'kitchen' | 'hallService' | 'host' | 'breakfast' | 'rooms'` döps till `export type StationRole = …`. `StaffStation.role: StationRole`.
- `frontend/src/strategic/scene/nightClubRoom.ts:121` — samma sak: `export type StationRole = 'bar' | 'door' | 'floor' | 'dj'`. `StaffStation.role: StationRole`.
- Ingen namnkollision kvar; sim och rum bär olika ord för olika saker.

### 1.3 Klart för implementering

Ja. Ren rename, mekanisk sed + typcheck. Alla anropssidor i respektive rumsfil.

**Följdorder:** ORDER 153 — rename lokal StaffRole → StationRole i innRoom + nightClubRoom.

---

## 2. Beslut 2 — Kontraktet äger mappningen

### 2.1 Beslut (VO 2026-08-30)

> "Kontraktet äger mappningen. `businessRoom.ts` vet vilken klass det är och har redan `stations`. En `stationFor(role, class)` där hör hemma. Renderaren ska fråga, inte räkna ut."

### 2.2 Vad det betyder i kod

Ny funktion i `frontend/src/strategic/scene/businessRoom.ts`:

```ts
/**
 * Vilken station en given sim-roll hör hemma vid i det här rummet.
 * En station är en plats, inte en anställning — en kock i ölkrogen
 * kan stå vid brewer-stationen utan att bli en ny rolltyp. Mappningen
 * hör därför till klassen, inte till renderaren.
 *
 * Returnerar null när klassen inte har någon naturlig plats för rollen
 * (t.ex. foodtrucken har ingen värd-station, ölkrogen ingen kock-station
 * som är kock i simmens mening — beroende på hur mappningen ritas).
 * Renderaren väljer själv vad den gör med null: fallback, dölj, eller
 * standardposition.
 */
export function stationFor(role: StaffRole, roomClass: RoomClass): RoomStation | null;
```

`InteriorStaff.tsx:277` byts från
```ts
const home = stations[member.role] ?? stations['servitör'];
```
till att fråga kontraktet via `businessRoomRef.current`:
```ts
const station = stationFor(member.role, room.roomClass);
const home = station ? worldFromStation(station) : /* fallback */;
```

Den nuvarande `computeStations(layout)` (rad 139-163) — som räknar fyra positioner ur `layout.entrance/bar/centre` — utgår.

### 2.3 Vad som behöver bestämmas FÖRE implementering

Mappningstabellen — **fyra sim-roller × sex klasser = 24 celler**, var och en behöver ett beslut: vilken station? Eller `null`?

Utkast (att bekräftas av Vision Owner före implementering):

| | värd | servitör | kock | lärling |
|---|---|---|---|---|
| **kvarterskrogen** | host | server | chef | ? (i dag: mittemellan server och chef) |
| **ölkrogen** | ? (ingen host-station finns) | runner eller barkeep | cook eller brewer | ? |
| **vinbaren** | ? | runner eller sommelier | cook | ? |
| **gästgiveriet** | host | hallA eller hallB (finns 4 hallService) | chef eller sous (finns 5 kitchen) | ? |
| **foodtrucken** | ? (2 stationer totalt) | window | cook | ? |
| **nattklubben** | door | floor eller barEntry | ? (ingen kitchen) | ? |

`?`-cellerna kan lösas med `null` + renderar-fallback, men det är ett val att göra medvetet. Två sub-frågor:

- **Ölkrogen har inga kockar i restaurangens mening.** `cook`-station finns i geometri; `brewer` också. En sim-`kock` som station-mässigt är brewer läser konceptuellt fel: sim säger "det här är en kock", scenen visar en person vid mäskkaret. Ska mappningen tvinga fram detta, eller ska sim-lagret helt enkelt inte hyra kockar i klasser utan kök? Det senare berör `businessClass.ts` `hasSeats` / `hasMiseEnPlace` (finns redan) — kanske behöver en `hasChef` liknande flagga.
- **Foodtrucken har 2 stationer, sim kan ha 4 roller.** Klass-flaggan `capacityFor` säger 0 för foodtrucken, men rollerna beslutas i sim-lagret oberoende. Om VO vill förbjuda hyrning av värd/lärling i foodtrucken behöver `TeamPanel.HIRE_ROLES` bli klass-medvetet — separat följdorder.

### 2.4 Klart för implementering

Nej — mappningstabellen (24 celler) behöver Vision Owner-beslut. Fyra frågor att svara på:

1. Vilken station får värd i ölkrogen, vinbaren, foodtrucken? (Ingen naturlig kandidat i dessa klasser.)
2. Vilken station får kock i ölkrogen (brewer? cook?) och nattklubben (ingen)?
3. Var står lärlingen per klass? (Rimlig defaultval: "vid närmaste servitör-station", d.v.s. en fallback-position, inte en egen station.)
4. Klass-medveten rollhyrning — ska `TeamPanel.HIRE_ROLES` filtreras per klass, eller får spelaren hyra kock till foodtrucken och renderaren löser fallback?

**Följdorder:** ORDER 154 (uppskattat) — implementera `stationFor` efter VO-svar på §2.3.

---

## 3. Beslut 3 — ROLE_COLOUR vinner

### 3.1 Beslut (VO 2026-08-30)

> "ROLE_COLOUR vinner. Den är kalibrerad mot silhuettbandet genom ORDER 123 och 127, mätt mot varje golvzon. STAFF_UNIFORMS i rumsfilerna är Designs förslag och har aldrig prövats mot bandet. Rumsfilerna ska importera, inte duplicera — samma sak som ZONE_FLOORS."

### 3.2 Vad det betyder i kod

`ROLE_COLOUR` (frontend/src/strategic/scene/InteriorStaff.tsx:99) är fyra strängar, en per sim-roll. Rumsfilernas STAFF_UNIFORMS ska bort som duplikat och ersättas av en import.

Konsekvenser per rum:

- **restaurantRoom.ts:283** `STAFF_UNIFORMS = {host, server, chef}` (3 värden) — bort. Silhouette-kontrast (`checkPaletteAgainstFloors`, rad 307) itererar över `GUEST_GARMENTS.concat(STAFF_UNIFORMS.values)` — måste bytas mot `GUEST_GARMENTS.concat(Object.values(ROLE_COLOUR))`.
- **brewpubRoom.ts** — har inga STAFF_UNIFORMS. Ingen ändring behövs (men saknar palettkontroll mot ROLE_COLOUR — separat följdorder att lägga till).
- **wineBarRoom.ts:294** `STAFF_UNIFORMS = {sommelier, dj, cook, runner}` (4 värden) — bort. Silhuett-kontrast rad 337/361 uppdateras.
- **innRoom.ts:380** `STAFF_UNIFORMS = {kitchen, hallService, host, breakfast, rooms}` (5 värden) — bort. Rad 444, 494, 498-kontroller uppdateras.
- **foodTruckRoom.ts:~950** `STAFF_UNIFORMS = {window, cook}` (2 värden) — bort. Silhuett-kontrast-koden mot gatan uppdateras.
- **nightClubRoom.ts:284** `STAFF_UNIFORMS = {bar, door, floor, dj}` (4 värden) — bort. Om siktlinjeprovet läser dem uppdateras.
- **`StaffStation.uniform: string`-fältet** — bort ur alla rums-interfaces (`restaurantRoom:127`, `wineBarRoom:122`, `foodTruckRoom:100`, `nightClubRoom:174`). Renderaren väljer färg via `ROLE_COLOUR[member.role]` (redan gjort i InteriorStaff.tsx:343), stationen bär inte längre färg.

Efter ändringen: silhuett-kontrast mäter det spelaren FAKTISKT ser (ROLE_COLOUR), inte det Design föreslog (STAFF_UNIFORMS). Uppfyller CLAUDE.md-regeln "Mätningar mot det de beskriver" per ORDER 148.

### 3.3 Vad som behöver bestämmas FÖRE implementering

- Ska `ROLE_COLOUR` flyttas ur `InteriorStaff.tsx` till egen fil (`staffColour.ts` t.ex.) så rumsfilerna kan importera utan cirkulär beroende? Rumsfilerna → InteriorStaff.tsx är omvänd riktning mot dagens InteriorStaff → rumsfiler-läsning (som saknas). Rimligt val: flytta.
- Brewpubs saknade palettkontroll — ska den läggas till i samma ordning eller separat?

### 3.4 Klart för implementering

Nästan. En liten arkitekturbeslut om placeringen av `ROLE_COLOUR` (flytta ur InteriorStaff.tsx eller inte). Rekommendation: flytta till `frontend/src/strategic/scene/staffColour.ts` — en fil, ett värde, ingen risk att en rumsfil drar in InteriorStaff.tsx.

**Följdorder:** ORDER 155 (uppskattat) — flytta ROLE_COLOUR + ta bort STAFF_UNIFORMS ur rumsfilerna + peka silhuett-kontrast dit.

---

## 4. Beslut 4 — Lärlingen ska ha ett hem

### 4.1 Beslut (VO 2026-08-30)

> "Lärlingen ska ha ett hem. `INTERIOR.staffHomes` returnerar undefined för den, och `STAFF_ROLE_ORDER` dubblerar servitör i stället. Det är två buggar, inte ett designval."

### 4.2 Vad det betyder i kod

Två separata fixar i två filer:

**a. `frontend/src/strategic/content/layout.ts:69`** — `INTERIOR.staffHomes` får en fjärde nyckel:
```ts
staffHomes: {
  värd:     { x: 0.8, z: 2.4 },
  servitör: { x: -2.4, z: 0.2 },
  kock:     { x: -3.4, z: -1.6 },
  lärling:  { x: ?, z: ? }        // ← beslut om position behövs
}
```

Följdverkan i `service.ts:490, 548`: `INTERIOR.staffHomes[staff.role]` returnerar nu Vec2 för lärling i stället för undefined. Positionen bör vara i restaurangens matsal, gärna nära "servitör" (rimmar med sim-lagrets intuition att lärlingen avlastar överallt — rad 155 i strings.sv.ts).

**b. `frontend/src/strategic/simulation/model.ts:40`** — `STAFF_ROLE_ORDER`:
```ts
// Innan:
const STAFF_ROLE_ORDER: StaffRole[] = ['värd', 'servitör', 'kock', 'servitör'];
// Efter:
const STAFF_ROLE_ORDER: StaffRole[] = ['värd', 'servitör', 'kock', 'lärling'];
```

Effekt: `makeStaff(4)` ger nu 1H+1S+1C+1L i stället för 1H+2S+1C. `makeStaff(3)` oförändrad (3 första: H+S+C). `makeStaff(2)` oförändrad (H+S).

### 4.3 Vad som behöver bestämmas FÖRE implementering

- **Lärlingens position i restaurangen.** Rimliga val:
  - Nära bardisken bredvid kocken (`{ x: -2.0, z: -1.2 }` t.ex.)
  - Vid pass-luckan (`{ x: -1.5, z: 0.0 }`)
  - Halvvägs mellan servitör och kock (spegling av dagens InteriorStaff.tsx-beräkning `[(servitör + kock) * 0.5]`)
- **Sim-konsekvens av 1H+1S+1C+1L som initialteam.** Med bara EN servitör i stället för två — påverkas balansen? Tester i `simulation/`-suit bör köras för att bekräfta att `serverCoverage`, `strainByRole` osv. håller ut.

### 4.4 Klart för implementering

Nästan. Position för lärlingen behöver ett val. Sim-balans-effekten av 1S i stället för 2S kan behöva bekräftas mot befintlig svit.

**Följdorder:** ORDER 156 (uppskattat) — lägg till lärling till `INTERIOR.staffHomes` + fixa `STAFF_ROLE_ORDER`.

---

## 5. Rekommenderad ordningsföljd

Följande sekvens minimerar risken för mellanliggande brutna tillstånd:

1. **ORDER 153** — Beslut 1 (rename lokal StaffRole → StationRole). Ren mekanisk sed, ingen semantik ändras. Grund för allt annat.
2. **ORDER 156** — Beslut 4 (lärlingens hem + STAFF_ROLE_ORDER-fix). Isolerad bugfix, kan tas parallellt med resten. Rekommenderad tidigt så eventuella nedströms-effekter fångas snabbt.
3. **ORDER 155** — Beslut 3 (ROLE_COLOUR vinner). Kräver inga sim-ändringar, bara rum-städning. Kan följa efter 153.
4. **ORDER 154** — Beslut 2 (`stationFor(role, class)`). Kräver först VO-beslut om 24-cellers mappning + eventuellt klass-medvetet TeamPanel. Största arbetet, största risken. Läggs sist.

Vision Owner behöver besvara §2.3 (mappningstabellen) och §4.3 (lärling-position) innan de motsvarande orderna kan utfärdas.

---

## 6. Vad ORDER 152 INTE gör

- Ingen kod ändrad. `git diff main..HEAD -- frontend/` = tomt.
- Ingen implementation påbörjad — beslutsdokument.
- Ingen mappningstabell antagen — dess 24 celler väntar på Vision Owner.
- Registerraden 152 markerar beslut, inte utförd förändring.

---

## 7. Filer

- `documentation/architecture/ORDER_152_PERSONALROLLER_BESLUT.md` — detta dokument
- Registerrad 152
