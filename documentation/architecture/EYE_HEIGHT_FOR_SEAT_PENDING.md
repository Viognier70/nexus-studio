# Pending order — `eyeHeightForSeat` från leverans/, alla fem rummen i ett svep

**Öppnad** 2026-09-10 (ORDER 208 stub-not)
**Ska bli** en egen order (nummer TBD) när den skrivs
**Grund** VO 2026-09-10 kl. 17:30: "eyeHeightForSeat-blockeraren:
när den ordern skrivs ska den täcka alla fem rummen i ett svep, per
Designs egen not om att floorY är null överallt utom ölkrogen."

---

## Vad är det som blockerar

`leverans/businessRoom.ts:273` exporterar
`eyeHeightForSeat(room, seatId)`:

```ts
export function eyeHeightForSeat(room: BusinessRoom, seatId: string): number {
  const mod = moduleFor(room.roomClass);
  if (room.roomClass === 'foodtrucken') return mod.EYE_STANDING_M;
  const seat = room.raw.seats.find(function (s: any) { return s.id === seatId; });
  if (!seat) return mod.EYE_STANDING_M ?? 1.66;
  return mod.eyeHeightForSeat(seat);
}
```

Delegerar till rums-modulens `eyeHeightForSeat(seat)`, som i `leverans/`
finns för:

- `wineBarRoom.ts:245` — `PLINTH_M + seat.seatHeight + EYE_ABOVE_SEAT_M`
- `innRoom.ts:301` — samma formel
- `nightClubRoom.ts:252` — `PLINTH_M + seat.standHeight + seat.seatHeight + EYE_ABOVE_SEAT_M`
- `restaurantRoom.ts:244` — samma formel

**Nuvarande repo har varken `businessRoom.eyeHeightForSeat` eller
per-rums-varianter** (bortsett från det som råkar ligga i leverans-
mapparna).

## Vad ordern ska göra

**Ett svep över alla fem rum** — inte styckvis. Design har skickat
med en not (VO 2026-09-10): `floorY` är `null` överallt utom
ölkrogen. Alltså:

- ölkrogen ska ha `floorY` publicerad
- restaurant / wineBar / inn / nightClub / foodtruck: `floorY = null`
  eller `PLINTH_M`-fallback (behöver klargöras)
- Alla fem rum ska ha `eyeHeightForSeat(seat)`-export
- `businessRoom.ts` ska ha delegator-versionen

## Konsumenter

Idag: ingen. `eyeHeightForSeat` behövs för framtida kamera-look-at,
DevPanel-diagnostik, och (eventuellt) sitLift-formeln (`ORDER 200`
long-bord-frågan). Ingen brådskande, men kod-vägen är laid down
i leverans/-paketet och ska inte glömmas.

## Vad denna not ÄR och INTE ÄR

Detta är EN NOT, inte en order. Skriven för att när nästa order i
området skrivs, ska den täcka alla fem rummen i ett svep — inte en
tredjedel som blockerar en fjärdedel.

Se `documentation/blueprints/LEVERANSNOT.md` (från
`nexus-design-2026-08-30-1245/`) och `leverans/businessRoom.ts` för
Designs formulering av kontraktet.
