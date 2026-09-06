# ORDER 174 — interiorLayout läser businessRoom-kontraktet + DoD-krav "verifiering i fyndets flöde"

**Datum:** 2026-09-06
**Gren:** `order-174-interiorlayout-contract` från `main` (topp `8950729`, ORDER 166 alt-B close).
**Föregås av:** ORDER 149 (BrewpubScene via kontrakt), ORDER 150 (InteriorGuests läser `businessRoomRef.seats`).

## §1 Fynd

Provspel 2026-09-06: interiören syns inte i spelarvyn för `business=olkrogen`.
Utredningsmätning (`/tmp/order-178-playercheck/measurement.json`, samma dag):

- Bundlen som dev-servern serverar är `main` = 8950729 (ORDER 167-territoriet).
- Efter `__nxSetBusinessName('Ölkrogen')` landar kameran på `cam=900m [35-75]`, INTE på myBusiness-preset:et 24 m. Preset:et nås inte automatiskt av namninmatning på main (bekräftar ORDER 157 §Fynd 1).
- `usePlayerBusinessInterior()` anropas utan `businessClass`-argument i fyra call-sites (`PlayerBusiness.tsx:170`, `InteriorGuests.tsx:213`, `InteriorStaff.tsx:171`, `AnimationPrototype.tsx:131`). Utan argument returneras alltid restaurangens 16-stols-matsal via TABLE_SPECS.
- ORDER 149 §Uppföljning noterade själv: *"Känd pre-existerande gap: `InteriorGuests` läser `usePlayerBusinessInterior().seats` som fortfarande ger restaurangens 16 positioner — gäst 17–20 hamnar på seats[0] fallback i den vyn. Kontraktet har 20 seat-positioner (bevisat i probe); interiorLayout-anpassning för ölkrogen är separat följdorder."* Den följdordern är denna.

Utredning 2026-09-06 identifierade åtta grindar som delar dockskåps-era-antagandet
"restaurangens matsal är default eftersom bara dockskåpet visar dessa scener". Fem av dem
är nedströms av interiorLayout: `PlayerBusiness`-stubben, `InteriorGuests`-fallback,
`InteriorStaff`-fallback, `AnimationPrototype`-anrop, StrategicScene:s mount-lista.
Kärngrinden är interiorLayout självt.

## §2 Form

**Kontraktet är källan för `seats` och kapacitet.** Byggnads-geometrin (width, depth,
centre, worldAngle, entrance, waitingSlots, arrivalSlots, deliveryBay/Approach) förblir
OBB-derivad och klass-oberoende.

### §2.1 `interiorLayout.ts`

- Ny import: `businessRoomRef` från `../scene/interiorSharedState`.
- Ny privat hjälpare `readContractSeats(bc)`: returnerar `{seats, capacity}` om
  `businessRoomRef.current !== null` och klass matchar och `seats.length > 0`, annars
  `null`.
- `computePlayerBusinessInterior(businessClass)`: efter befintlig OBB + TABLE_SPECS-
  beräkning, sätt `finalSeats = contract?.seats ?? seats` och
  `finalTotalSeats = contract?.capacity ?? TOTAL_SEATS`. Returnera dem i `InteriorLayout`.
- Kommentar-block (rader 190-208) skrivet om för att förklara ORDER 174-mönstret.
- `tables[]`, `bar`, `barStoolPositions` orörda — den historiska restaurang-formen
  används som fallback av PlayerBusinesss interior-stub tills stubben skalas ner
  eller `RoomSeat`-modellen bär full möbel-struktur. Egen order när det behövs.

### §2.2 Consumers

- `PlayerBusiness.tsx:170` → `useSimState()` flyttas före `usePlayerBusinessInterior()`;
  argumentet blir `sim.businessClass`.
- `InteriorGuests.tsx:213` → samma omordning.
- `InteriorStaff.tsx:171` → samma omordning.
- `AnimationPrototype.tsx:131` → orörd i denna order. Är dev/prototype-scen och
  läser bara `layout.entrance` (byggnads-geometri, klass-oberoende). Migration till
  `sim.businessClass` blir egen order när prototype-scenen får sin egen anpassning
  per klass.

### §2.3 CLAUDE.md — Definition of Done

Ny bullet under §Definition of Done: *"Verifieringen kör i den klass och det flöde
felet rapporterades i."* Följt av en mening om URL-preset/dollhouse-flaggan och
redovisningskrav när skriptet nödgas använda dem.

Elfte fallet i "mätning mot fel sak"-serien (efter 128/132/135/145/146/143/157/173).
ORDER 178 (påstådd, aldrig committad) rapporterade mätning i `business=kvarterskrogen`
medan fyndet gällde `business=olkrogen`. Med DoD-punkten skulle den ha fångats innan
rapport.

## §3 Verifiering

Playwright-skript `frontend/scripts/order174-interior-in-playerview.mjs`. Skriver
`frontend/reports/order174/interior-in-playerview.json`. Talvärdena läses ur JSON:en
per ORDER 161-regeln.

Två klass-flöden mäts identiskt:

1. `business=olkrogen`: `__nxSetBusinessName('Ölkrogen')`, ticka sim till service igång,
   läs `layout.seats.length` via `window.__nxBusinessRoomRef` och `window.__nxSimState`.
   Förväntat: `seats.length === 20` (brewpubRoom-kontraktet) efter BrewpubScene mount.
2. `business=kvarterskrogen`: samma flöde. Förväntat: `seats.length === 16` (oförändrat).

Ingen `dollhouse=1`, ingen `focus/distance/yaw/pitch`-URL-preset. Om kameran landar
på overview (`cam=900m`) och inte på myBusiness-preset:et, redovisas det som separat
fynd — kameraflygningens frånvaro efter namninmatning är egen order (troligen
ORDER 175, camera-preset-hook för `__nxSetBusinessName`).

## §DoD

- [x] `npm run typecheck` grön.
- [x] `npx vitest run` — 1066/1066 tester grön (samma antal som ORDER 167).
- [x] Ingen kod i `documentation/foundation/` eller `documentation/world/` rörd.
- [x] Bevarar `TOTAL_SEATS = 16` för anrop UTAN `businessClass`-argument (test-
      kompatibilitet: `interiorLayout.test.ts` kallar utan arg).
- [ ] Playwright-verifiering i olkrogen-flödet mäter kontrakt-läsning aktiv.

## §4 Ändringar

```
frontend/src/strategic/business/interiorLayout.ts       (+kontrakt-läsning, kommentar)
frontend/src/strategic/scene/PlayerBusiness.tsx         (call-site: skickar businessClass)
frontend/src/strategic/scene/InteriorGuests.tsx         (call-site: skickar businessClass)
frontend/src/strategic/scene/InteriorStaff.tsx          (call-site: skickar businessClass)
CLAUDE.md                                               (ny DoD-bullet)
documentation/architecture/ORDER_174_INTERIORLAYOUT_CONTRACT.md  (denna fil)
documentation/architecture/ORDER_REGISTRY.md            (rad 174)
```

## §5 Ej i scope

- Fynd 2 (dubbelrendering PlayerBusiness + OSM): kräver ORDER 173:s `PLAYER_BUSINESS_BUILDING_IDS`-filter i `OsmBuildings.tsx` mergad till main. Den är opushad på `order-173-interior-in-mybusiness`-branchen. Egen mergning.
- Fynd 3 (hus i vägar): ORDER 158 mätte väg-vertex-inuti-byggnadsenvelope; motsatta riktningen (byggnads-vertex-inuti-vägenvelope) inte mätt. Egen order.
- `RESTAURANT_INTERIOR`-restposten i `content/grythyttan.ts:387` och restaurang-flaggan i `restaurantRoom.ts:348-388`. Egen order.
- Väggen som skymer interiören vid myBusiness-preset (`PlayerBusiness.tsx:428, 442`
  "Dollhouse-view deferred"). Egen order.
- `StrategicScene.tsx:132-133` mount-lista (vinbaren, gästgiveriet, foodtrucken saknar
  scen). Egen order.
- `AnimationPrototype`-call-site. Egen order när prototype-scenen får per-klass form.

## §6 Not om ORDER 174/175/176/177/178

Registret hoppar från 167 till 174. Numren 168-173 finns som opushade worktrees
(`order-168` t.o.m. `order-173`) — inte registrerade på main. Nummer 174 är därför
nästa fria efter det som ligger som pending arbete.

ORDER 175/176/177/178 refererades i samtal 2026-09-06 men existerade aldrig som
artefakt — inga branches, inga PRs, inga .md-filer, inga skript. Denna order tar
174 i god tro; om worktree-arbetet 168-173 registreras retroaktivt kan
renumreringsregeln (CLAUDE.md §9) tillämpas.
