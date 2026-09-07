# ORDER 190 — gäst når faktisk seat + värd sjunker inte i golvöppning

**Datum:** 2026-09-07
**Gren:** `order-190-guest-on-chair-staff-y` från `main` (`984cf1a`, efter ORDER 191 merge).
**Föregås av:** 186 (entrance-waypoint, staff-target), 188 (pose-fix), 191 (mise-en-place-panel).

## §1 Fynd

VO-inspelning 2026-09-07 17:22 (efter ORDER 191 för fynd 1+2):
3. **Den enda gästen står bredvid stolen, inte på den.**
4. **Värden delvis nedsjunken i entréns golvöppning.**

## §2 Form

### §2.1 Fynd 3 — waypoint släpper vid distToSeat < 1.5 m

`InteriorGuests.tsx` (ORDER 186 fynd 4-block): entrance-waypoint höll gästen vid entrance-jittern trots att seat-position redan var nådd. Före ORDER 190:
```
if (distFromCentre > halfW * 1.02) {
  // waypoint till entrance
}
```

Om jitter (`sin(phaseSeed)*1.8`) hela tiden gjorde `distToEntrance > 0.8`, waypoint släppte aldrig — gästen stannade vid entrance istället för att gå till seat.

Fix: lägg till `distToSeat > 1.5` som del av villkoret. När gästen är närmare seat än 1.5 m släpper waypoint automatiskt → final approach går direkt till seat.

```
const seatIdx = guest.seatIndex ?? -1;
const distToSeat = seatIdx >= 0 && seatIdx < seatsForFrame.length
  ? Math.hypot(pos.cx - seatsForFrame[seatIdx][0], pos.cz - seatsForFrame[seatIdx][1])
  : Infinity;
if (distFromCentre > halfW * 1.02 && distToSeat > 1.5) {
  // waypoint aktiv
}
```

### §2.2 Fynd 4 — bobY clampas ≥ 0

`InteriorStaff.tsx:387`: `grp.position.set(pos.cx, bobY, pos.cz)` där `bobY = Math.sin(...) * TASK_BOB_AMPLITUDE_M = ±0.05m`.

Under negativ sving sjönk staff 5 cm under Y=0. Vid entrance-punkten (där brewpubRoom har golv-cutout för dörr-mesh) blev värden delvis synligt under golv-planet — VO "delvis nedsjunken i entréns golvöppning".

Fix: `grp.position.set(pos.cx, Math.max(0, bobY), pos.cz)`. Bob upp bibehålls (rörelsen läses), bob ner kapas till 0. Staff aldrig penetrerar golvet.

## §3 Verifiering

`frontend/reports/order190-verify/`:
- `full-service.webm` — inspelning
- `2-zoomed.png` — visar sittande gäst PÅ barsits, sittande gäst PÅ tvåbord (nedre vänster), sittande gäster PÅ fyra-bord (nedre höger). Inga "bredvid"-figurer.

## §DoD

- [x] `npm run typecheck` grön.
- [x] `npx vitest run` — 1067/1067 grön.
- [x] Video + zoom-close-up sparade.

## §4 Ändringar

```
frontend/src/strategic/scene/InteriorGuests.tsx  (distToSeat-check i waypoint-guard)
frontend/src/strategic/scene/InteriorStaff.tsx   (bobY clampas ≥ 0)
documentation/architecture/ORDER_190_GUEST_ON_CHAIR_STAFF_Y.md (denna fil)
documentation/architecture/ORDER_REGISTRY.md     (rad 190)
```

## §5 Ej i scope

- Precis polygon-clip för waypoint (ORDER 186 §5).
- Sit-lift per RoomSeat.seatHeight för barstol vs vanlig stol.
- Kock-station rörelse (5c från ORDER 186).
- Prep-fasens längd (`PREP_DURATION_SEC_M5`).

## §6 Numrering

Registret 191 → 190 (VO valde att köra 191 först). Egen gren `order-190-guest-on-chair-staff-y` från main.
