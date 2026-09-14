# UTREDNING — varför personal inte möter gäster efter C3 (2026-09-14)

VO 2026-09-14: "C3 löste inte trovärdigheten. Personalen irrar omkring i
stället för att röra sig mot sina uppgifter. Ingen möter gästerna. Utred
innan något byggs."

Utred-order, ingen kod byggd. Läsning + logg + kod-audit.

---

## Q1 — Vilken position styr figuren när staff har aktiv task?

**Svar:** i renderingen (`InteriorStaff.tsx:500-548`) beräknas targetX/Z i två
steg per frame:

```
targetX = home.x + jitterDrift + strainPull    // default
if (taskGuest) {
  const guestRender = guestPositionsRef.current.get(taskGuestId)
  if (guestRender) { targetX = guestRender.x; targetZ = guestRender.z }
  // else: FALLBACK ÄR HOME. Kommentar: "första frames före InteriorGuests
  // hunnit skriva". Ingen DEV-warning om det händer permanent.
}
```

Sedan appliceras ORDER 217/218 walkPath-routing OVANPÅ targetX/Z om
staff är far från home (staffPathsByRole) eller om taskGuest är seated
(walkPathsToSeatsByIndex).

**Sim-lagret** (`service.ts:1100`) kallar `moveStaff(staff, guest.position)`
i beginStaffTask — men `sim.staff.position` **läses inte av rendering**.
Rendering har egen `AnimatedStaff.cx/cz` som ease:as mot targetX/Z per frame.
Sim-staff-positionen är i praktiken dead code för visuell rendering.

## Q2 — serve → stol eller station?

**Svar:** stol (via `guestPositionsRef` som är gäst-render-position vid
sätet). Fungerar mekaniskt korrekt när:
- `bridgeTeamToStaff` returnerar giltigt staff-id för team-medlem
- `sim.staff.targetGuestId` är satt (av beginStaffTask)
- `guestPositionsRef.current.get(targetGuestId)` returnerar värde
- guest är i seated-state (ORDER 218 walkPath tar över)

Alla fyra villkor uppfylldes i loggen (se Q5) för order/checkback/clear
när dessa tasks fyrade.

## Q3 — greet_guest — finns tasken, vem tilldelas?

**Kritiskt fynd. Tasken existerar men fyras aldrig för restaurangsklasser.**

`PRIORITY[0] = 'greet'` (service.ts:583). `TASK_ROLE_ASSIGNMENT.greet = 'värd'`
(service.ts:751). Så när en greet-target hittas köas den på värd.

MEN `findTaskTarget('greet')` (service.ts:1020-1034):

```
if (!businessHasSeats(state.businessClass) && state.waitingIds.length > 0) {
  return state.waitingIds[0];        // foodtruck-path
}
const arriving = state.guests.find(g => g.state === 'arriving' && g.moveProgress >= 1);
return arriving?.id ?? null;         // with-seats-path
```

**With-seats-path (kvarterskrogen/ölkrogen/gästgiveriet):** kravet är
`state === 'arriving' && moveProgress >= 1`. Men `tickGuests` (service.ts:
324-366) transitionerar `arriving → seated ELLER arriving → waiting` i
**samma sim-tick** som `moveProgress` når 1:

```
if (guest.state === 'arriving') {
  if (guest.moveProgress >= 1) {
    ...
    if (seat) { setGuestSeated(...) }  // → state = 'seated'
    else     { guest.state = 'waiting' }
  }
}
```

Reducer-ordningen (reducer.ts:1896-1897): `tickGuests(draft); tickStaff(draft)`
— tickStaff (som kör scheduleTasks som kör findTaskTarget) körs EFTER
tickGuests har genomfört transitionen. **Det finns aldrig ett tick där
en with-seats-guest är i tillståndet `arriving && moveProgress>=1`.**

**Konsekvens:** greet-task tilldelas aldrig för restaurangs-klasser. Ingen
staff går för att möta gästen vid entrén. Gästen går från arriving direkt
till seated (eller waiting) utan att en figur går fram och möter dem.

Detta har varit fallet sedan ORDER 198 (dokumenterat i header §1 där som
deferrat) men aldrig åtgärdat. **Detta är den primära förklaringen till
"Ingen möter gästerna."**

Foodtruck-path FUNGERAR: `waitingIds.length > 0` → returnerar front-of-queue.

## Q3-b — Ölkrogen värd renderas inte alls

Andra kritiska fyndet, oberoende av Q3.

`STATION_MAP.ölkrogen.värd = 'taps'` (businessRoom.ts:511). Men ölkrogens
`staffStations` innehåller: `barkeep`, `brewer`, `cook`, `runner`
(brewpubRoom.ts:690-715). **'taps' finns inte.**

`stationFor('värd', ölkrogen)` → null → `staffHomeFor('värd', ölkrogen)` → null
→ `contractHomes.värd` → null → InteriorStaff:s puck-loop skippar värd-medlemmen
(InteriorStaff.tsx:436-448) med DEV-warning en gång per klass.

**Ölkrogen renderar 3 av 4 staff-pucker.** Ingen figur står vid entrén ens
när ingen greet-task finns. VO:s observation "ingen möter gästerna" har två
lager i ölkrogen: (a) greet-tasken fyras aldrig, och (b) det finns inte ens
en värd-puck att göra det med.

ANTAGANDE-taggat i STATION_MAP med öppen Design-fråga
`STATION_ROLE_MAPPING_QUESTION_2026-09-10.md` sedan ORDER 205.

## Q4 — Vad händer mellan uppgifter?

**Svar:** staff går tillbaka till hemplatsen.

`completeStaffTask` (service.ts:1104-1112) nollar `taskType` och `targetGuestId`.
Nästa tick:
1. `scheduleTasks` försöker tilldela ny task (guest-task via findTaskTarget,
   eller bg-task om queue.length + activeBg < BG_BACKLOG_TARGET=1)
2. Om ingen task fyras: `taskGuest = null` i rendering → `targetX = home + jitter`
3. Om far från home: ORDER 217 walkPath-routing aktiveras → staff går hem via
   korridorer

Så staff GÅR tillbaka till hem mellan uppgifter, med path-routing när det
behövs. Om många staff har få gäster (över-bemannat eller tomma köer) står
majoriteten hemma med bg-tasks som cyklas var 2-8 sim-sek. Rörelsen är
liten och lokal.

## Q5 — Servitör-position per tick under ett pass

Skript: `frontend/scripts/order219-servitor-tick-log.mjs`.
Utdata: `$TMPDIR/nexus-order219-1789384541158/servitor-log.csv` + JSON.
Metod: 5 min lunch ölkrogen, sim-speed=1, poll var 200 ms = 1 sample/sim-sek,
loggar `staff.position`, `taskType`, `targetGuestId`, `taskProgress`, kö-djup,
totalPending, guestStates.

**693 distinkta sim-tick-sample. Rörelse: 238.30 m total.**

### Task-distribution (av samplade sim-ticks)

| task | count | % | anmärkning |
|---|---:|---:|---|
| **restock** | 235 | 33.9% | bg-task, hemma vid station |
| **order** | 209 | 30.2% | gäst-task, servitör → gäst-position |
| **checkback** | 123 | 17.7% | gäst-task, kort tillsyn vid gäst |
| (idle) | 64 | 9.2% | ingen task |
| **clear** | 62 | 8.9% | carry-task, gäst → hem |
| **greet** | **0** | **0%** | **fyras aldrig, se Q3** |
| **serve** | **0** | **0%** | fyrades aldrig i loggens fönster |
| **welcomeDrink** | 0 | 0% | policies.welcomeDrink=false default |

### Rörelselängd

- Total sim-distans över loggen: **238.30 m**
- Medan idle (taskType=null): 13.31 m (5.6 %)
- Medan i task: 224.99 m (94.4 %)

**Servitören rör sig aktivt när hen har en task.** Endast 5.6 % av rörelsen
sker utan task (drift + jitter hem).

### Position-band

- x: [-2.40, 2.00] (bredd 4.40 m)
- z: [-2.60, 8.00] (bredd 10.60 m)

Täcker rummet från servitörens home (-2.4, 0.2) till gäster vid bord.

### Task-övergångar (första 20)

Före t=185 (första 100+ sim-sek): position LÅST vid (-2.4, 0.2) — servitörens
sim-hem. Alternerar `restock ↔ (idle) ↔ restock` var 0.5-2 sek. **Ingen
förflyttning eftersom bg-tasks körs på plats.**

Från t=185.8: task=order gst-6 → position (-2.4, 0.2) → (-1.53, -0.2) →
(-0.22, -0.79) → (2, -1.8). Servitören går till gästen.

Från t=187.2 och framåt: **position STANNAR (2, -1.8) för alla nästkommande
order-tasks på gst-7, gst-8, gst-9, gst-10, gst-14, gst-15, gst-28, gst-29
osv.** targetGuestId ändras varje ~1-2 sek men sim-position rör sig inte.

### Fynd 3 (sido-bugg) — seatSlot är hårdkodad restaurang-layout

`service.ts:114`:
```typescript
export function seatSlot(_state: SimulationState, index: number): Vec2 {
  return INTERIOR.seatOrder[index] ?? INTERIOR.seatOrder[0];
}
```

`INTERIOR.seatOrder` (content/layout.ts:55-68) är restaurangens 12 platser
i lokala koordinater (0.5..2, -2.6..2.6). Ölkrogen har 20 sittplatser via
`brewpubRoom.seats` — DE ANVÄNDS INTE av sim.

Gäster med seatIndex >= 12 får `guest.position` = `INTERIOR.seatOrder[0]` =
(2, -1.8) via `??`-fallback. Alla gäster som råkar sitta på plats 12+ hamnar
på **exakt samma sim-position** (2, -1.8). När servitören får en task mot en
sådan gäst kallas `moveStaff(staff, guest.position)` med samma tal → servitörens
sim-position ändras aldrig efter första order-tasken.

**Detta påverkar INTE renderingen.** Rendering läser gäst-render-position via
`guestPositionsRef.current` som fylls av InteriorGuests med `seatsForFrame`
(kontraktets seats per klass, brewpubRoom.seats för ölkrogen). Render-servitör
går till korrekt bord.

Men det påverkar allt som läser sim-lagrets position: framtida sim-tester,
DevPanel-utläsning av "var är servitören", eventuellt collision-logik.
Egen order när det blir aktuellt.

---

## Sammanfattning för VO — vad utred-loggen säger

1. **Servitören GÖR tasks.** 94.4 % av rörelsen sker under en aktiv task.
   Modellen fungerar mekaniskt: task-guest sätts, staff rör sig mot gäst-
   render-position, poseWork/poseCarry spelar korrekt.

2. **Servitören möter aldrig gäster med `greet`.** Task-typen fyras aldrig
   för restaurangs-klasser p.g.a. tick-ordning: gäster transitionerar
   arriving → seated/waiting samma tick som moveProgress når 1, medan
   scheduleTasks körs *efter*. `findTaskTarget('greet')` hittar aldrig
   kvalificerad gäst. Dokumenterat sedan ORDER 198 header. **Detta är den
   primära förklaringen till "Ingen möter gästerna."**

3. **Ölkrogen har ingen renderad värd.** STATION_MAP.ölkrogen.värd = 'taps'
   men 'taps'-station finns inte i geometrin. Fjärde staff-pucken saknas
   helt. Även om greet fixades finns ingen figur vid entrén. Andra lagret
   i "ingen möter gästerna."

4. **"Personalen irrar" är visuellt läsbart även fast mekaniken fungerar.**
   Bg-tasks utförs vid home med poseWork — armar rör sig, kroppen inte.
   Väldigt korta gäst-tasks (order 2 sim-sek, checkback 1-2 sim-sek) mellan
   längre bg-tasks skapar en rörelseprofil som ser "planlös" ut jämfört
   med rytmen av en riktig servitör (en resa mellan bord tar 3-5 sek + tid
   vid bordet). Kan behöva batch:as (samla flera orders/checkbacks före
   återgång till home) för att läsa som en avsiktlig runda.

5. **Sido-bugg (fynd 3):** `seatSlot` läser hårdkodat INTERIOR.seatOrder
   (restaurang-layout) för alla klasser. Sim.staff.position blir fel för
   ölkrogens gäster på seat 12+. Påverkar inte render men är en tickande
   bomb för framtida sim-läsare av staff-position.

## Vad utredningen INTE föreslår att bygga

Skriver ingen kod. Beslut till VO om vad som ska prioriteras:

**A. Fixa greet.** Rework tickGuests/tickStaff-ordningen så en arriving-guest
   är kvalificerad för greet ETT tick, ELLER separera greet-triggern
   (findTaskTarget('greet') letar efter waiting-gäster som just tillhört
   arriving under senaste 1 sek). Kräver design-beslut kring var "möter"
   ska hända — vid dörren, vid kön, vid bordet.

**B. Fixa ölkrogen värd-station.** Design-fråga öppen sedan ORDER 205. Antingen
   döp om `barkeep` → `taps`, eller lägg till en `taps`-station, eller ändra
   STATION_MAP.ölkrogen.värd till en existerande station.

**C. Fixa seatSlot.** Ändra `seatSlot(state, index)` så den läser klassens
   kontrakt-seats i st f INTERIOR.seatOrder. Sim-layer-fix, ingen render-
   konsekvens men rensar en bombfälla.

**D. Batch-schemalägg gäst-tasks.** Låt en servitör samla 2-3 orders i rad
   innan hen går tillbaka till home. Kräver ändring i scheduleTasks eller
   tickStaff:s consume-loop. Design-beslut om rytm.

A + B är minsta ändring som svarar direkt på VO:s ord ("Ingen möter
gästerna"). D är läsbarhets-fråga bortom bug-fix.

---

## Filreferens

- Log-script: `frontend/scripts/order219-servitor-tick-log.mjs` @ `main`
- CSV/JSON-utdata: `$TMPDIR/nexus-order219-1789384541158/` (lokalt hos agent,
  per CLAUDE.md Observation 7 §342)
- Kod-referenser: alla i frontend/src/strategic/, rad-nummer i texten ovan
