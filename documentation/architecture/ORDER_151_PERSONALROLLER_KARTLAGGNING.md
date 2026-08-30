# ORDER 151 — Kartläggning av personalrollernas vokabulär

**Utfärdad** 2026-08-30
**Klass** AUTONOM · Ren research, ingen kod ändrad
**Gren** `order-151` (från `main`)
**Följer** ORDER 150 §5-öppningen om per-klass staff-role→station-mapping
**Form** Följer ORDER 140:s förarbete — kartan först, beslutet i egen ordning

---

## 0. Rakt svar

**Fyra ordböcker, en mappning som inte finns i kod.**

| Domän | Roll-vokabulär | Källa |
|---|---|---|
| Sim-lager (types.ts) | `värd \| servitör \| kock \| lärling` | `frontend/src/strategic/types.ts:10` |
| Layout-shim (content/layout.ts) | `värd \| servitör \| kock` (ingen lärling) | `frontend/src/strategic/content/layout.ts:69` |
| restaurantRoom | `host \| server \| chef` | `frontend/src/strategic/scene/restaurantRoom.ts:754` |
| brewpubRoom | `barkeep \| brewer \| cook \| runner` | `frontend/src/strategic/scene/brewpubRoom.ts:690` |
| wineBarRoom | `sommelier \| dj \| cook \| runner` | `frontend/src/strategic/scene/wineBarRoom.ts:833` |
| innRoom | `host \| kitchen \| hallService \| breakfast \| rooms` (LOKAL `StaffRole`-typ) | `frontend/src/strategic/scene/innRoom.ts:94, 1269` |
| foodTruckRoom | `window \| cook` | `frontend/src/strategic/scene/foodTruckRoom.ts:943` |
| nightClubRoom | `bar \| door \| floor \| dj` (LOKAL `StaffRole`-typ) | `frontend/src/strategic/scene/nightClubRoom.ts:121, 848` |
| Svenska UI (strings.sv.ts) | `Värd, Servitör, Kock, Lärling` | `frontend/src/content/strings.sv.ts:147` |
| Engelska UI (RoomCardPanel) | `Host, Server, Chef, Apprentice` | `frontend/src/strategic/ui/RoomCardPanel/RoomCardPanel.tsx:64` |

**Ingen `ROLE_STATION_MAP` finns i koden.** `InteriorStaff.tsx` läser INTE rumsfilernas `staffStations` — den beräknar fyra positioner (en per sim-roll) från `layout.entrance / bar.worldPosition / centre` (restaurangens shape via OBB). Rumsfilernas stationer är alltså monterade i geometri men konsumeras aldrig av personalvisualiseringen.

**Två rumsfiler redeklarerar `StaffRole` lokalt** (innRoom, nightClubRoom) med sina egna värden. Namnkollisionen är tyst — TS ser dem som olika typer eftersom de exporteras från olika moduler — och osynlig från sim-lagret, som aldrig läser stationerna alls.

---

## 1. Sim-lagret — vad staff-roller HETER och GÖR

### 1.1 Typen

`frontend/src/strategic/types.ts:10`
```ts
export type StaffRole = 'värd' | 'servitör' | 'kock' | 'lärling';
```

### 1.2 Initial team-composition (första fyra hyrningarna)

`frontend/src/strategic/simulation/model.ts:40`
```ts
const STAFF_ROLE_ORDER: StaffRole[] = ['värd', 'servitör', 'kock', 'servitör'];
```

Sic — `'servitör'` två gånger, `'lärling'` saknas. Läses av `makeStaff(count)` för att initiera teamet (2, 3 eller 4). Lärling hyras endast manuellt via `TeamPanel`.

### 1.3 Alla hyrbara roller (UI)

`frontend/src/strategic/business/TeamPanel.tsx:22`
```ts
const HIRE_ROLES: readonly StaffRole[] = ['värd', 'servitör', 'kock', 'lärling'];
```

### 1.4 Konsumenter i sim

- `reducer.ts:263` — `hireTeamMember(state, action.role)` (rad 1704: signaturen tar `StaffRole`)
- `reducer.ts:1613` — hårdkodad `role: 'lärling'` vid en R7-händelse
- `service.ts:490, 548` — `INTERIOR.staffHomes[staff.role]` (se §1.5)
- `TeamMember.role: StaffRole` (types.ts:226), `StaffMember.role: StaffRole` (types.ts:246), `StaffStrain.role: StaffRole` (types.ts:282)

### 1.5 Layout-shim `INTERIOR.staffHomes`

`frontend/src/strategic/content/layout.ts:69`
```ts
staffHomes: {
  värd:     { x: 0.8, z: 2.4 },
  servitör: { x: -2.4, z: 0.2 },
  kock:     { x: -3.4, z: -1.6 }
} as Record<string, Vec2>
```

Tre nycklar (`lärling` saknas). Läses av `service.ts` för sim-lagrets egna "var står staffen"-uppslagningar. Restaurangspecifika koordinater, ingen klassbrytpunkt. Om `staff.role === 'lärling'` returnerar uppslagningen `undefined`.

---

## 2. Rumsfiler — vad stationerna heter, vad de bär, vem vet om dem

### 2.1 Kvarterskrogen (restaurantRoom.ts)

**Interface** (rad 122): `{ id, local, facing, uniform: string, note }` — ingen `role`-fält.

**Stationer** (rad 754):

| id | uniform | note (koncentrerad) |
|---|---|---|
| `host` | STAFF_UNIFORMS.host = `#624b52` | Vid entrén |
| `server` | STAFF_UNIFORMS.server = `#435368` | Servicegången |
| `chef` | STAFF_UNIFORMS.chef = `#435641` | Vid passluckan |

**STAFF_UNIFORMS** (rad 283): tre nycklar (`host, server, chef`). Nyckeln kommenteras "Tre roller, ur RESTAURANT_INTERIOR.staffHomes" — kopplingen sim→rum finns i en kommentar, inte i kod.

### 2.2 Ölkrogen (brewpubRoom.ts)

**Interface** (rad 106): `{ id, local, facing, note }` — INGA `uniform`- eller `role`-fält.

**Stationer** (rad 690):

| id | note (koncentrerad) |
|---|---|
| `barkeep` | Bakom disken, mitt för tapptornet |
| `brewer` | L-hörnet mellan tankraden och bryggverket |
| `cook` | Vid spisen |
| `runner` | Vid passluckan |

**STAFF_UNIFORMS**: SAKNAS. Brewpub har inga uniformer i sin egen fil.

### 2.3 Vinbaren (wineBarRoom.ts)

**Interface** (rad 122): `{ id, local, standHeight, facing, uniform, note }`.

**Stationer** (rad 833) med uniformer:

| id | uniform |
|---|---|
| `sommelier` | STAFF_UNIFORMS.sommelier = `#445269` |
| `dj` | STAFF_UNIFORMS.dj = `#664958` |
| `cook` | STAFF_UNIFORMS.cook = `#425741` |
| `runner` | STAFF_UNIFORMS.runner = `#5e4f37` |

**STAFF_UNIFORMS** (rad 294): fyra nycklar. Kommentar: "Personalens uniformer per roll" — men "roll" här är rumsroll, inte sim-roll.

### 2.4 Gästgiveriet (innRoom.ts) — SÄRFALL

**Redeklarerar `StaffRole` lokalt** (rad 94):
```ts
export type StaffRole = 'kitchen' | 'hallService' | 'host' | 'breakfast' | 'rooms';
```

Fem värden, INGEN överlapp med sim-lagrets `värd | servitör | kock | lärling`.

**Interface** (rad 143): `{ id, role: StaffRole, local, facing, note }` — `role`-fält KRÄVS och typas mot den LOKALA `StaffRole`.

**Stationer** (rad 1269) — 12 stationer, 5 unika roles:

| id | role (LOKAL) | note (koncentrerad) |
|---|---|---|
| `host` | `host` | Reception |
| `chef, sous, grill, plating, dish` | `kitchen` | Fem kökspositioner |
| `hallA, hallB, salWaiter, outdoorBar` | `hallService` | Fyra salsservice-positioner |
| `breakfast` | `breakfast` | Frukostbuffé |
| `rooms` | `rooms` | Städ/gäster |

**STAFF_UNIFORMS** (rad 380): fem nycklar — samma som lokala StaffRole-värden. Färger valda per rolltyp.

### 2.5 Foodtrucken (foodTruckRoom.ts)

**Interface** (rad 100): `{ id, local, standHeight, facing, uniform, note }`.

**Stationer** (rad 943):

| id | uniform |
|---|---|
| `window` | STAFF_UNIFORMS.window = `#5e4d55` |
| `cook` | STAFF_UNIFORMS.cook = `#425646` |

**STAFF_UNIFORMS** (rad ~950): två nycklar.

### 2.6 Nattklubben (nightClubRoom.ts) — SÄRFALL

**Redeklarerar `StaffRole` lokalt** (rad 121):
```ts
export type StaffRole = 'bar' | 'door' | 'floor' | 'dj';
```

Fyra värden, INGEN överlapp med sim-lagrets typ.

**Interface** (rad 174): `{ id, role: StaffRole, local, standHeight, facing, uniform, note }` — `role`-fält på LOKAL typ.

**Stationer** (rad 848):

| id | role (LOKAL) | uniform |
|---|---|---|
| `barMain` | `bar` | STAFF_UNIFORMS.bar = `#8a5263` |
| `barEntry` | `bar` | STAFF_UNIFORMS.bar |
| `door` | `door` | STAFF_UNIFORMS.door = `#706137` |
| `floor` | `floor` | STAFF_UNIFORMS.floor = `#226e62` |
| `dj` | `dj` | STAFF_UNIFORMS.dj = `#43658d` |

**STAFF_UNIFORMS** (rad 284): fyra nycklar.

---

## 3. Strings — vad rollerna KALLAS i UI

### 3.1 Svenska (spelartext-fasen, pre-ORDER-140-omstart)

`frontend/src/content/strings.sv.ts:147`
```ts
roleLabel: {
  värd:     'Värd',
  servitör: 'Servitör',
  kock:     'Kock',
  lärling:  'Lärling'
}
roleDescription: {
  värd:     'Hälsar och styr rummet — hög kulturell kompetens.',
  servitör: 'Bär order och håller flöde — balanserad rustning.',
  kock:     'Håller köket — hög vetenskaplig kompetens.',
  lärling:  'Lärling som avlastar överallt — låg kompetens, låg kostnad.'
}
```

Fyra nycklar, en per sim-roll.

### 3.2 Engelska (post-ORDER-125-beslut per CLAUDE.md regel 7)

`frontend/src/strategic/ui/RoomCardPanel/RoomCardPanel.tsx:64`
```ts
const ROLE_LABEL: Record<StaffRole, string> = {
  kock: 'Chef', servitör: 'Server', värd: 'Host', lärling: 'Apprentice'
};
```

Fyra nycklar, en per sim-roll.

### 3.3 Prep-item per roll

`frontend/src/strategic/ui/RoomCardPanel/deriveActions.ts:77`
```ts
const PREP_ITEM_FOR_ROLE: Record<StaffRole, string> = {
  kock:     'stations',
  servitör: 'cutlery',
  värd:     'napkins',
  lärling:  'garnish'
};
```

Fyra nycklar. Används i mise-en-place-visualiseringen.

---

## 4. InteriorStaff.tsx — vad som FAKTISKT konsumeras

### 4.1 Positionsberäkning

`frontend/src/strategic/scene/InteriorStaff.tsx:139-163`
```ts
function computeStations(layout): Record<StaffRole, XZ> {
  const { entrance, bar, centre } = layout;    // usePlayerBusinessInterior()
  // ...
  const värd: XZ     = [ex + inwardDx * 1.5, ez + inwardDz * 1.5];
  const servitör: XZ = [cx, cz];               // room centre
  const kock: XZ     = [bar.worldPosition[0], bar.worldPosition[1]];
  const lärling: XZ  = [(servitör[0] + kock[0]) * 0.5, (servitör[1] + kock[1]) * 0.5];
  return { värd, servitör, kock, lärling };
}
```

Fyra positioner beräknade från restaurangens layout-shape (entrance-inåt, centrum, bar-position). **`bar.worldPosition` kommer från `interiorLayout.ts`** — restaurang-hårdkodad geometri, klass-agnostisk via OBB.

### 4.2 Roll-lookup

`frontend/src/strategic/scene/InteriorStaff.tsx:277`
```ts
const home = stations[member.role] ?? stations['servitör'];
```

`member.role` är sim-lagrets `StaffRole` (`värd | servitör | kock | lärling`). Fallback till `servitör` om nyckeln saknas.

### 4.3 Färg

`frontend/src/strategic/scene/InteriorStaff.tsx:99`
```ts
export const ROLE_COLOUR: Record<StaffRole, string> = {
  värd:     '#2f4a68',
  servitör: '#454a52',
  kock:     '#7a3e3a',
  lärling:  '#d8d3ce'
};
```

Egen färg-tabell, matchar sim-rollerna. Rumsfilernas `STAFF_UNIFORMS` läses INTE av InteriorStaff — de existerar för silhuett-kontrast-mätning (`checkPaletteAgainstFloors`), inte för rendering av staff-figurer.

### 4.4 Kanalen till rumsfilernas stationer

Ingen. `InteriorStaff.tsx` importerar aldrig från någon rumsfil. `businessRoom.ts`-kontraktet exponerar `room.stations: RoomStation[]` (från ORDER 149) med `standHeight`, `uniform`, `note` — men `InteriorStaff.tsx` läser inte kontraktet heller. Det enda som `InteriorStaff` läser är `usePlayerBusinessInterior()`.

Kontraktets `stations`-fält är alltså monterad men okonsumerad av personalvisualiseringen.

---

## 5. Sammanfattning — vokabulär-kollisioner och saknade broar

### 5.1 Vokabulärlista

| Term | Antal värden | Domän |
|---|---:|---|
| Sim `StaffRole` | 4 | värd, servitör, kock, lärling |
| innRoom (LOKAL) `StaffRole` | 5 | kitchen, hallService, host, breakfast, rooms |
| nightClubRoom (LOKAL) `StaffRole` | 4 | bar, door, floor, dj |
| restaurantRoom station-ids | 3 | host, server, chef |
| brewpubRoom station-ids | 4 | barkeep, brewer, cook, runner |
| wineBarRoom station-ids | 4 | sommelier, dj, cook, runner |
| innRoom station-ids | 12 | host, chef, sous, grill, plating, dish, hallA, hallB, salWaiter, outdoorBar, breakfast, rooms |
| foodTruckRoom station-ids | 2 | window, cook |
| nightClubRoom station-ids | 5 | barMain, barEntry, door, floor, dj |
| STAFF_UNIFORMS-nycklar/rum | 3-5 | matchar station-ids (utom brewpub som saknar helt) |

### 5.2 Sim→rum-mappning som INTE finns

Ingen fil i `frontend/src/` innehåller en tabell av formen:
```
{ [businessClass]: { värd → [stationId], servitör → [stationId], … } }
```

Om en sådan tabell skulle skrivas är den ENDA plats som skulle konsumera den `InteriorStaff.tsx:277` — och där behövs den bara om `InteriorStaff` byggs om att läsa rumsfilernas stationer. I dag beräknar den fyra positioner från layoutens OBB och kringgår hela stationssystemet.

### 5.3 Kollisioner

- **Två `export type StaffRole`-definitioner utöver den kanoniska.** `innRoom.ts:94` och `nightClubRoom.ts:121` deklarerar egna, med värden som inte överlappar sim-lagrets. TypeScript ser dem som separata typer eftersom de kommer från olika moduler; ingen kompilator-varning fångar detta. Sim-lagret importerar aldrig från de två filerna, så namnkonflikten är tyst.
- **`STAFF_ROLE_ORDER = ['värd', 'servitör', 'kock', 'servitör']`** (model.ts:40) — `lärling` saknas i initial-teamet; `servitör` dubblerad. Effekt: fyra första hyrningarna får 1 värd + 2 servitörer + 1 kock. Lärling nås bara via `TeamPanel.HIRE_ROLES` som listar alla fyra.
- **`INTERIOR.staffHomes`** (layout.ts:69) saknar `lärling`. `service.ts:490, 548` gör `INTERIOR.staffHomes[staff.role]` som returnerar `undefined` för lärlingar. Konsekvenser bortom denna kartläggning.
- **restaurantRoom.STAFF_UNIFORMS `{host, server, chef}`** — engelska nycklar, medan sim-rollerna är svenska. Ingen mappning finns i kod; kopplingen är kommentarsbaserad ("Tre roller, ur RESTAURANT_INTERIOR.staffHomes" — men staffHomes-nycklarna är svenska, medan STAFF_UNIFORMS-nycklarna är engelska).
- **wineBarRoom och brewpubRoom har `cook`** — samma id, samma engelska ord. Om en delad staff-figur-modul någonsin läser stations per class-agnostisk id, är det den enda kollisionen som skulle vara meningsfull.

### 5.4 InteriorStaff-observationens rot

Det som gäster ser i scenen som "personal på plats" är fyra pucks vid fyra positioner beräknade från restaurangens layout — oavsett vilken klass som är aktiv. I ölkrogen ligger `kock`-pucken på `bar.worldPosition` — vilket är restaurangens bar, inte ölkrogens bardisk (som ligger på annan lokal X per `brewpubRoom.ts:181` `BAR_X = -2.2`). Position är därför visuellt fel för alla klasser utom kvarterskrogen; sim-lagrets logik påverkas inte eftersom sim ser (x, z) och inte "vid disken".

---

## 6. Vad ORDER 151 INTE gör

- Inget beslut om vilket vokabulär som ska vinna (sim, engelska, svenska, per klass).
- Ingen kod ändrad. `git diff main..HEAD -- frontend/src/` = tomt.
- Inget test skrivet mot dagens gap.
- Ingen dedup av de tre `StaffRole`-typerna.

Beslutet — och den efterföljande omritningen av `InteriorStaff` och/eller `businessRoom.stations`-läsningen — hör till egen order när Vision Owner tar det.

---

## 7. Öppna spår för beslutsordning

1. **En eller flera StaffRole?** Sim-lagrets fyra räcker inte för ölkrogens fyra distinkt-namngivna stationer eller värdshusets fem rolltyper. Antingen (a) rumsfilernas roller mappas ner till simens fyra (`barkeep, brewer, runner` → `servitör`, `cook` → `kock` osv), eller (b) sim-lagret utökas per klass. (a) håller sim-modellen konstant; (b) speglar realiteten men växlar en typ till en union eller record.
2. **Vem äger mappningen?** Om (a): antingen `businessRoom.ts`-kontraktet exponerar `stationsByRole: Record<StaffRole, RoomStation[]>` (klassens ansvar), eller `InteriorStaff.tsx` bär en per-klass-tabell (renderarens ansvar).
3. **STAFF_UNIFORMS vs ROLE_COLOUR** — två parallella färgsystem. `STAFF_UNIFORMS` per rum går obemärkt in i silhuett-kontrast-mätningar; `ROLE_COLOUR` per sim-roll är det spelaren ser på figuren. Beslut: ska de vara samma?
4. **`INTERIOR.staffHomes` saknar lärling** — separat gap, konsekvenser i `service.ts`-uppslagningar bör bekräftas.

---

## 8. Filer

- `documentation/architecture/ORDER_151_PERSONALROLLER_KARTLAGGNING.md` — detta dokument
- Registerrad 151

Ingen kod rörd, ingen playwright-verifikation behövs.
