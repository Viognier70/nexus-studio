# Load-kedja: kod-trace 2026-08-15

Kort rapport. Ingen refaktor. Frågan: när `RoomCardPanel` visar tom
`load`-mätare med `seated=16/16`, var i kedjan ligger felet — och
läser panelen samma load som ansiktsuttrycken?

Utfört mot repo-tillstånd på `order-049` HEAD `9cb0af8` +
oc­ommitterade ändringar (2026-08-15).

---

## 1. Frånvaro (verifierat)

Följande strukturer finns *inte* i kodbasen. Utfört mot alla tre
worktrees (`~/Projects/nexus-studio`, `.worktrees/order-095`,
`.worktrees/order-096`):

| Struktur | Fynd |
|---|---|
| `guests.ts`, `guestFlow.ts`, `capacityGate*` | `find` returnerar 0 träffar |
| `TeamMember.load` fält | `TeamMember`-interfacet i `frontend/src/strategic/types.ts:84` har `id, role, competence, dailyCost, hiredOnDay, contractEndsDay, isAgency`. Ingen `load` |
| `sim.tables` / `state.tables` | Inget sådant fält i `SimulationState`. Enda `.tables` som finns är `layout.tables` i `frontend/src/strategic/business/interiorLayout.ts:139` — visuell möbel-array, inte sim-state |
| `serviceQuality`, `waitRatio`, `pressure` som fält | `grep` returnerar 0 träffar för `serviceQuality`/`waitRatio`. "pressure" finns bara i kommentar-prosa |

## 2. Vad koden faktiskt gör

### Aktörsmodellen

Två parallella entitetstyper, olika livslängd (types.ts:64 vs :84):

- **`StaffMember`** (`state.staff: StaffMember[]`) — golv-lagret som
  utför tasks. Fält som räknas här: `workload: number` (types.ts:67).
- **`TeamMember`** (`state.team.members: TeamMember[]`) — det ekonomiska
  lagret (kontrakt, kostnad, kompetens). Ingen `workload`, ingen `load`.

Populeras vid `makeInitialState`:
- `state.staff = makeStaff(policies.staffCount)` — default 3 (`frontend/src/strategic/simulation/model.ts:218`)
- `state.team = initialTeam()` — default 3 members (`frontend/src/strategic/simulation/team.ts:114`)

De två synkas inte automatiskt. En agentur-hyra lägger till
`TeamMember` utan `StaffMember` (types.ts:82).

### Kedja: `state.guests` → `StaffMember.workload`

`workload` skrivs på två ställen (`frontend/src/strategic/simulation/service.ts`):

- Rad **349**: `staff.workload = Math.max(0, staff.workload - 0.03 * TICK_SECONDS)` — idle-decay
- Rad **354**: `if (staff.taskType) staff.workload = Math.min(1, staff.workload + 0.05 * TICK_SECONDS)` — task-active bump

Task tilldelas i `tickStaff` (service.ts:315). För varje idle staff
söks nästa task i `PRIORITY`-listan (service.ts:304):

```
const PRIORITY: TaskType[] = [
  'greet', 'seat', 'welcomeDrink', 'order', 'serve',
  'decant', 'flambe', 'clear'
];
```

Task-matchning i `findTaskTarget` (service.ts:359):

| Task | Villkor för match |
|---|---|
| `greet`/`seat` | Guest i `arriving`-state med `moveProgress >= 1` |
| `welcomeDrink` | `policies.welcomeDrink && guest.state === 'waiting' && !hadWelcomeDrink` |
| `order` | Guest i `ordering`-state |
| `serve` | Guest i `seated`-state med `simTime - stateTime > 6` |
| `decant`/`flambe` | `policies.service === 'formell' && guest.state === 'dining' && simTime - stateTime < 4` |
| `clear` | Guest i `leaving`-state |

**`dining`-state matchar ingen task under `service='vardaglig'` (default).**
Bara `decant`/`flambe` triggar på `dining`, och båda är gated bakom
`policies.service === 'formell'` (service.ts:385). När *alla* sittande
är i `dining` finns ingen task för någon staff, och `workload` decayar
mot 0 med −0.03·dt/tick.

### Kedja: `StaffMember.workload` → `RoomCardPanel` "load"-mätare

Panelen bygger staff-kort i `RoomCardPanel.tsx:83–110`:

```
sideBarValue: s.workload,   // rad 104
sideBarLabel: 'load',       // rad 105
```

`FaceCard` renderar mätaren via `BAR_FILL(model.sideBarValue)`
(`FaceCard.tsx:127`) — bredd = värde × 100 %. `workload=0` → tom bar.

### Kedja: `StaffMember.workload` → ansiktsuttryck

`deriveStaffFace` (`frontend/src/strategic/ui/RoomCardPanel/deriveFaces.ts`)
läser `staff.workload` för trycklika band:

- Rad **116**: `if (staff.workload >= 0.95) return 'hurried'`
- Rad **119**: `if (day.serviceRhythm === 'red' && staff.workload >= 0.7) return 'strained'`

**Samma fält** som panelen — samma `staff.workload`, samma tick, samma
källa. Om baren är tom är `workload = 0`, och ansiktet läser något ur
de icke-trycklika banden (SF1–SF5 i deriveFaces.ts, som täcker
task-baserade uttryck, service-rhythm ≠ red, etc).

## 3. Svar på frågorna

### 3.1 Vad driver `TeamMember.load` faktiskt?

`TeamMember.load` **finns inte**. Fältet är inte definierat på
interfacet (types.ts:84–99). Ingen kod läser eller skriver det.

Om "load" i frågan syftar på RoomCardPanel:s `load`-mätare per
staff-kort, är källan `StaffMember.workload` — se §2. Kedjan är:

```
state.guests[*].state
  → tickStaff picks task via PRIORITY (service.ts:315)
  → staff.workload +/- (service.ts:349, 354)
  → RoomCardPanel.tsx:104 (sideBarValue)
  → FaceCard.tsx:127 (BAR_FILL width)
```

`TeamMember` är parallell och kopplas *inte* till workload. Enda
platsen där `team.members` läses för något "load"-liknande är
`InstrumentsPanel.tsx:293`:

```
const teamCap = Math.max(1, sim.team.members.length * COVERS_PER_MEMBER);
```

Där ger `teamCap = 3 × 5 = 15` för default team, och `tempoReading`
(rad 94) beräknar `load = activeGuests / teamCap` — en helt annan
beräkning än `staff.workload`. Den läses bara till "Room pace"-badge
("Calm" / "Together" / "Under pressure" / "Off tempo"), inte till
någon mätare med värde.

### 3.2 Om `sim.tables` aldrig läses — vad var den till för?

`sim.tables` **existerar inte**. Sökt över alla worktrees:

- `grep -rE "sim\.tables|state\.tables|draft\.tables"` → 0 träffar
- `types.ts` deklarerar inte `tables` som fält på `SimulationState`
- `find -name "guests.ts" -o -name "guestFlow.ts"` → 0 träffar

Enda `.tables` som finns är `layout.tables` (`interiorLayout.ts:139`)
— en `TableLayout[]`-array med möbelgeometri (position, seat-koord,
storlek), byggd i `computePlayerBusinessInterior`. Läses två platser:

- `interiorLayout.ts:236` — i konstruktorn själv, för att flatmap:a
  `seatWorldPositions` till en flat `seats`-array
- `PlayerBusiness.tsx:424` — `layout.tables.map(...)` för JSX-render av
  bordslådorna i scenen

Båda är läsningar. Ingen fil skriver `.tables`. Ingen `guestFlow` att
koppla den mot.

### 3.3 Läser panelen samma load som ansiktsuttrycken?

**Ja.** `RoomCardPanel.tsx:104` (sideBarValue) och `deriveFaces.ts:116/119`
(hurried/strained-trösklar) läser samma fält, `staff.workload`, ur
samma `state.staff[i]` per tick.

Playtest-observationen "seated=16/16 med tom load-mätare" är därför
reproducerbar utan tråd-fel: vid en tick där alla sittande är i
`dining`-state under `vardaglig` service har alla tre staff ingen task,
och `staff.workload` har decayat mot 0. Ansiktet under samma
tick faller ur trycklika banden och läser något ur de lugna (typiskt
`attentive` eftersom `s.taskType` är null, se SF-reglerna i
deriveFaces.ts).

Att ansiktsuttrycken *ändå* fires 56.9 % över en hel service
(order087.faceDistribution.test.ts §6.5, seed=3, sample size 25 047)
är inte en motsägelse — det är fönster-effekten. All-dining-tillstånd
är korta pauser mellan `ordering` (task-genererande),
serve-transitions och `paying`-triggers. Över en 30-min service
dominerar de aktiva transitionerna, inte pauserna.

## 4. Sammanfattning

- Kopplingen `sim.guests` → `RoomCardPanel` "load" **är hel**. Samma
  fält (`staff.workload`) driver både bar och ansikte.
- Tom bar med fullt rum är **ett äkta beteende**: `dining`-state
  konsumerar inga PRIORITY-tasks under `vardaglig`, så staff blir
  idle och workload decayar. Inte en trasig ledning — ett hål i
  task-modellen.
- `TeamMember.load`, `sim.tables`, `guests.ts`, `guestFlow.ts`,
  `capacityGate`, `serviceQuality`, `waitRatio` — inga av dessa
  existerar i kodbasen. En order som förutsätter dem behöver
  antingen ändra premiss eller specificera att den bygger dem från
  grunden.

Fix (om det ska bli en fix) tillhör egen order och rör
`service.ts:PRIORITY` + `findTaskTarget`. Denna rapport namnger bara
gapet.
