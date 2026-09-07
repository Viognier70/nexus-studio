# ORDER 186 — rummet blir begripligt (sex fynd från key=5-vyn 2026-09-07)

**Datum:** 2026-09-07
**Gren:** `order-186-room-becomes-legible` från `main` (`c9d0981`, efter ORDER 185 merge).
**Föregås av:** ORDER 121 (kroppar), 127 §5 (kontrastband), 149/150 (kontrakt), 154 (staff-station-map), 174 (interiorLayout-kontrakt), 184 (PlayerBusiness ger vika), 185 (Y-lyft + garment-variant).

## §1 Fynd

Provspel 2026-09-07 i key=5-vyn olkrogen (skärminspelning
`Skärminspelning 2026-09-07 kl. 12.48.58.mov`). Sex fynd.

1. **Böjd/rak-oscillation.** Sittande gäster växlar mellan `poseSeated` och `poseWalk` när `movedThisFrame` jitter:ar över tröskeln (lean-easing + pattern-bob triggar rörelse-flaggan).
2. **Ryggen mot bordet.** `SharedBusinessRoom.seats: XZ[]` tappade `RoomSeat.facing`. `rotation.y = microYawRad` bara — inget seat-facing applicerat.
3. **Barstolarna aldrig.** `SEATS_DEFAULT` (16 index restaurang-form) nådde aldrig bar-stolar 16-19 för ölkrogen; 12-15 tilldelades sist. Ingen sitter vid baren i en ölkrog.
4. **Flyger genom väggen.** Linjär interpolation spawn → seat utan waypoint via entrance-punkten.
5. **Personal utan mål.** Staff-puckar drifter runt home-station. Sim-task-pipelinen (greet/seat/order/checkback) körs osynligt; renderaren visualiserar bara drift.
6. **Gäster utanför på gräset.** arriving/waiting-slots ligger utanför byggnaden per design (interiorLayout: `ARRIVAL_SLOT_RADIUS=6.0`, `WAITING_SLOT_DEPTHS=[2.5..5.2]`). Del design, del symptom av fynd 4.

## §2 Form

### §2.1 Fynd 1 — pose-hysteres

`InteriorGuests.tsx:540-560` — state-check FÖRE movement-check:
```
if (sit/stand-transition)       → blendPose
else if (SEATED_STATES/sleeping) → poseSeated  ← wins over jitter
else if (movedThisFrame)         → poseWalk
else                             → poseIdle
```
Sittande gäster kvar i `poseSeated` oavsett XZ-jitter. Motion pose bara för icke-sittande.

### §2.2 Fynd 2 — seat facing via kontraktet

- `brewpubRoom.ts:894-915` + `restaurantRoom.ts:972-1008` — `resolveWorldPositions` returnerar `seatFacings: number[]` (world-facing = `seat.facing + room.group.rotation.y`).
- `interiorSharedState.ts:60-73` — `SharedBusinessRoom.seatFacings: number[]` (parallell array, samma index som `seats`).
- `BrewpubScene.tsx` + `RestaurantScene.tsx` — skriver `seatFacings` till `businessRoomRef.current` vid mount.
- `InteriorGuests.tsx:508-528` — läser `seatFacingsForFrame[guest.seatIndex]`, sätter `group.rotation.y = facing + patternTx.microYawRad` för sittande gäster. Icke-sittande behåller mikro-yaw-jitter.

### §2.3 Fynd 3 — bar först i ölkrogen + capacity per klass

- `service.ts:73-84` — `isSeatedCapacity` läser `capacityForBusiness(state.businessClass, state.policies.staffCount)` istället för `state.policies.capacity`. Cache-invalidering-problem försvinner: policies.capacity behöver inte uppdateras vid klass-init/-byte.
- `service.ts:108-130` — ny `SEATS_OLKROGEN` = `[12..19, 0..7, 8..11]` (bar först, communal sedan, twotop sist). Ny `seatsPreferenceFor(businessClass)` returnerar rätt ordning per klass.
- `service.ts:findFreeSeat` (rad 155) — itererar `seatsPreferenceFor(state.businessClass)` istället för hardkodad `SEATS_DEFAULT`.

Ölkrogens 20 platser är nu alla nåbara. Bar fylls först (klassens karaktär).

### §2.4 Fynd 4 — waypoint via entrance

`InteriorGuests.tsx:438-472` — när seated OCH `distFromCentre > halfW * 1.02` OCH `distToEntrance > 0.8m`, sätt effektivt target till `layout.entrance`. När vid entrance byter target till seat. Ingen ändring i pathing när gäster är inne i byggnaden — linjär interpolation ok där.

OBB-approximation (`halfW * 1.02`) är konservativ men tillräcklig för vanliga vägg-passager. Exakt polygon-clip är egen order om enkla heuristiken visar sig otillräcklig.

### §2.5 Fynd 5 — värd vid entré + servitör mot targetGuest

`InteriorStaff.tsx:266-310`:
- `bridgeTeamToStaff(sim.team.members, sim.staff)` mappar TeamMember (economic) → StaffMember (task) per pattern från ORDER 090.
- Om `bridgedStaff.targetGuestId != null` → target = guest.position (task-driven, gäller alla roller inkl. värd som greet:ar).
- Annars om `member.role === 'värd'` → target = `roomChan.entrance` (eller `layout.entrance` fallback). Lätt jitter (40% av normal drift) så värden inte står helt still.
- Annars → home + jitter + load-pull (oförändrat).

Utan detta driftade puckar planlöst runt home-station medan sim körde task-pipelinen osynligt. Nu läser rummet task-riktningen.

Ur scope enligt Vision Owner-direktiv: **kockens stationsrörelse** — egen order (5c).

### §2.6 Fynd 6 — arriving/waiting utanför byggnaden är designen

`interiorLayout.ts:98-110`:
```
WAITING_SLOT_DEPTHS = [2.5, 3.4, 4.3, 5.2]  // meter utanför entrance-wall
ARRIVAL_SLOT_RADIUS = 6.0                    // meter från entrance
```

Gäster i state `arriving | waiting | declined` STÅR UTANFÖR byggnaden per design. `seated` gäster är inne (fynd 4 fixade wall-passage). Symptomet "gäster på gräset" är korrekt beteende för dessa states — de köar utanför dörren, precis som i verkligheten.

**Ingen fix.** Registerraden dokumenterar att detta är designen.

## §3 Verifiering

`/tmp/order186-verify/verify.mjs` mot dev-server 5173, ölkrogen-flödet:
- Enter i namnrutan
- Vänta cam-landning på `cam= 24m*`
- Öppna lunch 15 min, speed=4, snapshots vid t1 (2 min), t2 (5 min), t3 (8 min sim)
- Key=5 för scenario

**Bilder i `frontend/reports/order186-verify/`:**
- `t1-early-service.png` — tidiga gäster ankommer
- `t2-mid-service.png` — **bar-stolar används (mörk barlinje längs väggen har figurer), gäster på stolar runt bord, personal syns vid entrén**
- `t3-full-service.png` — full service
- `t4-scenario.png` — key=5 scenario-overlay

Ingen pixel-signatur-mätning per ORDER 184-principen (fjortonde fallet gjorde metoden otillförlitlig).

## §DoD

- [x] `npm run typecheck` grön.
- [x] `npx vitest run` — 1066/1066 grön.
- [x] Verifiering körd i key=5-vyn med skärmdump per fynd.
- [x] Bilder sparade i `frontend/reports/order186-verify/`.

## §4 Ändringar

```
frontend/src/strategic/scene/InteriorGuests.tsx       (fynd 1 pose-hysteres, fynd 2 rotation, fynd 4 waypoint)
frontend/src/strategic/scene/InteriorStaff.tsx        (fynd 5 värd/servitör targeting)
frontend/src/strategic/scene/BrewpubScene.tsx         (skriver seatFacings)
frontend/src/strategic/scene/RestaurantScene.tsx      (skriver seatFacings)
frontend/src/strategic/scene/brewpubRoom.ts           (resolveWorldPositions returnerar seatFacings)
frontend/src/strategic/scene/restaurantRoom.ts        (samma)
frontend/src/strategic/scene/interiorSharedState.ts   (SharedBusinessRoom.seatFacings)
frontend/src/strategic/simulation/service.ts          (fynd 3 SEATS_OLKROGEN + capacityForBusiness i isSeatedCapacity)
documentation/architecture/ORDER_186_ROOM_BECOMES_LEGIBLE.md  (denna fil)
documentation/architecture/ORDER_REGISTRY.md          (rad 186)
```

## §5 Ej i scope

- **Fynd 5c — kockens stationsrörelse** (Vision Owner-direktiv: egen order senare). Kock-puck står vid kokstation utan mål-driven rörelse; senare fix bör läsa aktiv order-task ur sim och animera mot spis-anchor.
- **Wine bar / inn / night club / food truck** — samma seat-facing + shell-fade behövs när deras scener monteras (`wineBarRoom.ts`, `innRoom.ts`, `nightClubRoom.ts`, `foodTruckRoom.ts` finns men inga *Scene-komponenter mount:ade i StrategicScene).
- **Precis polygon-clip för fynd 4** — nuvarande halfW-approximation är konservativ; exakt polygon-vs-linjesegment-clip är egen order.
- **Sit-lift per RoomSeat.seatHeight** — kontraktets `seatHeight`-fält utnyttjas inte än (barstolar är 0.75m, chair är 0.45m). Egen order.
- **`GARMENT_VARIANTS` kontrastvalidering** (ORDER 185 §5).

## §6 Numrering

Registret 185 → 186 (kontinuerligt).

Egen gren `order-186-room-becomes-legible` från main.
