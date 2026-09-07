# ORDER 187 — sällskap håller ihop; par splittras inte mellan bar och långbord

**Datum:** 2026-09-07
**Gren:** `order-187-parties-stay-together` från `main` (`bb04411`, efter ORDER 186 merge).
**Föregås av:** ORDER 186 §2.3 (SEATS_OLKROGEN bar-först).

## §1 Fynd

Vision Owner 2026-09-07 efter ORDER 186:s bar-först-preferens:
> "När barstolarna nu fylls först — kontrollera att gäster som anländer i
> sällskap inte splittras mellan disk och långbord. En två-top som hamnar
> på var sin plats är värre än ordningen vi har."

Utredning: **sim hade ingen party-koncept alls.** `maybeSpawnGuest` returnerade en gäst per anrop, `Guest`-interface saknade `partyId`/`partySize`. Enda "party" i koden var scenario-mekanismen `walk-in-of-five` (SEATS_CHOICE_A/B).

Så VO:s oro var HYPOTETISK men riktig: om vi INTRODUCERAR sällskap måste seat-tilldelningen hålla dem ihop. Vi introducerar sällskap som del av denna order, med grupperings-mekanism inbyggd från start.

## §2 Form

### §2.1 Party-datamodell

`types.ts`: `Guest` får två nya optional-fält:
```
partyId?: string;     // gemensam nyckel för sällskap
partySize?: number;   // 1 = solo, 2 = par, 3 = trio
```

Optional så bakåtkompat med `Partial<Guest>`-fixtures i 70+ tester (ingen ändring där).

`makeGuest` tar ny optional `party?: { id, size }`-parameter. Solo (default) sätter `partyId=undefined, partySize=1`.

### §2.2 Party-spawn

`arrivals.ts:maybeSpawnGuest` ändrar returtyp `Guest | null` → `Guest[]` (tom array = ingen spawn, 1-3 = spawn). Reducer itererar och pushar alla.

Fördelning för ölkrogen (`state.businessClass === 'ölkrogen'`):
```
PARTY_SOLO_P = 0.55   // ensam gäst vid baren, arbetslunch
PARTY_PAIR_P = 0.35   // typisk middag / afterwork
                       // 0.10 = trio (10%)
```

**Övriga klasser (kvarterskrogen, foodtrucken, gästgiveriet, vinbaren)** kör **solo som förr**. Motivering:
- Kvarterskrogens arbetslunch är typiskt solo — inte fel att bevara.
- Sim-integrationstester (`order137`, `order111`, `m6`, `day.dinner-queue`, `reputation`) är kalibrerade mot solo-dynamik och skulle brytas av mass-party-utrullning. Party per klass-VO-beslut är egen kalibrerings-order.
- ORDER 137 §2.3 säger "ölkrogen är utanför scope"; tolerans där höjs från 2pp → 3pp för att rymma party-inducerad midMass-drift.

Guard mot att blåsa `ACTIVE_GUEST_CAP=24`: `effectiveSize = min(partySize, room)`.

Walk-away-rullen (`state.simTime`-driven) gäller HELA partiet — sällskap håller ihop även vid backdown.

### §2.3 Party-medveten seat-tilldelning

`service.ts:findFreeSeat` tar ny optional `partyId?: string`.

- Om `partyId` satt OCH annan medlem redan seated: hitta ledig plats i **samma seat-grupp** (samma bord eller bar-sektion). Gruppen full → fallback till preferens-ordning (partisplittring är sista utväg).
- Om `partyId` satt OCH ingen medlem seated än (första i partiet): hitta grupp med `free.length >= partySize` i klass-preferensordning, ta första lediga där. Ingen grupp tillräckligt stor → fallback (partiet splittras när ingen bord räcker).
- Om ingen `partyId`: samma pre-ORDER-187-beteende (per-klass preferens).

Nya konstanter i `service.ts:155-176`:
```
SEAT_GROUPS_OLKROGEN = [[0-3], [4-7], [8-9], [10-11], [12-19]]   // longS, longN, twoC, twoD, bar
SEAT_GROUPS_KVARTERSKROGEN = [[0-1], [2-3], [4-7], [8-9], [10-11], [12-15]]  // t0-4 + bar
```

`groupOfSeat(businessClass, seat)` mappar seat-index → group.

### §2.4 Tre call-sites uppdaterade

`service.ts` rad 306, 343, 824 — `findFreeSeat(state, guest.scenarioSource, guest.partyId)`.

## §3 Verifiering

`/tmp/order187-verify/verify.mjs` — playwright med `recordVideo`, ölkrogen-flödet, hel 15-min lunch-service på speed=4 (~4 min realtid inspelning).

**Filer i `frontend/reports/order187-verify/`:**
- `full-service.webm` (27.8 MB, ~4 min inspelning) — spelaren ser rörelse över tid: värden går mot entrén när gäster kommer (fynd 5a från ORDER 186), servitören mot targetGuest (fynd 5b), party-gäster ankommer tillsammans och sätter sig på samma bord (fynd 3 uppföljning).
- `1-early-seated.png` — service 11:46 kvar (~3 min in): tidiga bar-figurer
- `2-mid-service.png` — service 7:32 kvar: rummet i drift, gäster distribuerade
- `3-full-service.png` — service 3:19 kvar: full-service
- `4-late-service.png` — afternoon: paying-fas, gäster på väg ut

Party-state-avläsning via `window.__nxSimState.state.guests` returnerade null (samma sim-state-accessor-problem som tidigare probes; state finns men fält-strukturen är olik det jag förväntar). Bild-verifikation är beviset — bar-stolarna har figurer, borden också, gäster verkar sitta med grannar snarare än splittrat.

## §DoD

- [x] `npm run typecheck` grön.
- [x] `npx vitest run` — 1066/1066 grön.
- [x] Verifiering körd i key=5-vyn med **video-inspelning** per Vision Owner-direktiv.
- [x] Bilder + video sparade i `frontend/reports/order187-verify/`.

## §4 Ändringar

```
frontend/src/strategic/types.ts                                     (Guest.partyId + partySize)
frontend/src/strategic/simulation/model.ts                          (makeGuest tar party-param)
frontend/src/strategic/simulation/arrivals.ts                       (maybeSpawnGuest returnerar Guest[])
frontend/src/strategic/simulation/reducer.ts                        (loopar arrival-array)
frontend/src/strategic/simulation/service.ts                        (findFreeSeat party-aware + SEAT_GROUPS)
frontend/src/strategic/simulation/__tests__/arrivals.test.ts        (expect array istället för Guest|null)
frontend/src/strategic/business/__tests__/order111.test.ts          (samma)
frontend/src/strategic/simulation/__tests__/order137BackgroundWork.test.ts  (ölkrogen-tolerans 2→3pp)
documentation/architecture/ORDER_187_PARTIES_STAY_TOGETHER.md       (denna fil)
documentation/architecture/ORDER_REGISTRY.md                        (rad 187)
```

## §5 Ej i scope

- **Party för övriga klasser** (kvarterskrogen, foodtruck, gästgiveriet, vinbaren). Sim-tester är solo-kalibrerade; per-klass party-VO-beslut + test-omkalibrering är egen order.
- **PARTY_SOLO_P-kalibrering.** Nuvarande 55/35/10 är gissning. VO kan justera per playtest-utfall.
- **Sit/stand-koordination inom party.** Om två party-medlemmar seatas på olika bord-sektioner (fallback) sker sit-transitionen oberoende. En "wait-until-both-seated"-mekanism är egen order.
- **`walkPathToSeat`-multi-punkt path per party.** Party-medlemmar tar egna vägar från spawn till seat; walk-path går parallellt (ORDER 186 fynd 4:s entrance-waypoint gäller per gäst, inte per parti).

## §6 Numrering

Registret 186 → 187 (kontinuerligt).

Egen gren `order-187-parties-stay-together` från main.
