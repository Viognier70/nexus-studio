# ORDER 188 — poseSeated-fix + kö-slots + seatedIds/staff-städning + sitYaw-warning + nearestSeat-tak

**Datum:** 2026-09-07
**Gren:** `order-188-pose-and-cleanup` från `main` (`820b33a`, efter ORDER 187 merge).
**Föregås av:** 185 (sit-lift), 186 (fynd 1/2/4 + fynd 5b), 187 (party-spawn).

## §1 Fynd — inspelning 2026-09-07 14:58 (VO)

1. **Gäster LIGGER NER på golvet, horisontellt.** poseSeated roterar hela kroppen istället för att böja knän. Regression från ORDER 185/187.
2. **Klunga med 6-7 gäster staplade på samma punkt vid entrén.** ORDER 186 fynd 4:s entrance-waypoint har ingen kö-spacing.
3. **Gäster ligger utanför rummets väggar, på gräset.** Symptom av fynd 1 + fynd 2.
4. **Barstolarna aldrig använda** trots ORDER 187:s tilldelningsordning. Symptom av fynd 1 (låg gäst syns inte som "vid baren").
5. **Personal försvinner ur rummet under passet.** seatedIds-städning + staff.targetGuestId följer borttagen gäst.

VO-tillägg:
- (a) `sitYaw ?? 0` ska logga varning när yaw saknas — datafel, inte normalläge.
- (b) `nearestSeat` behöver ett avståndstak så gäst långt från alla platser inte matchas.

## §2 Form

### §2.1 Fynd 1 — poseSeated ben-swing negeras

**Rot-orsak:** `applyLeg:450` sätter `hip.rotation.x = −(l.swing ?? 0)`. Minus-tecknet är kalibrerat för `poseWalk`:s sin/cos-signering. `poseSeated` hade `swing = +1.46` (avsett "framåt"), som blev `hip.rotation.x = −1.46` = benet BAKÅT-och-uppåt. Kroppen tippar framåt för balans → figuren la sig platt på magen.

Buggen fanns FÖRE ORDER 185 också, men figuren var UNDER golvnivån (utan sit-lift) → osynlig. ORDER 185:s Y-lyft exponerade den.

**Fix:** `poseSeated.legL/R.swing = −1.46` (negera). `applyLeg`-minus flippar tillbaka till `hip.rotation.x = +1.46` = benet framåt-och-nedåt = sittande position. `poseWalk` orörd (dess swing-oscillation är osymmetrisk mellan L/R som avsett).

`figureRig.test.ts` §DoD 4 golv-test uppdaterat: `poseSeated` övre tolerans 0.005 → 0.5 (sit-lift lyfter fötter 0.30-0.40 m över rig-root; kombineras med InteriorGuests group.y=0.45 för world-golv). Övriga poser behåller strikt 0.005-tolerans.

### §2.2 Fynd 2 — kö-spacing vid entrance-waypoint

`InteriorGuests.tsx` (ORDER 186 fynd 4-block): lateral jitter per `phaseSeed`. `sin(seed)*1.8` X-offset, `cos(seed)*1.8` Z-offset från entrance-punkt. Deterministisk per gäst-id, sprider 6-8 samtidiga gäster utan överlapp.

### §2.3 Fynd 4 — bar-mappning bekräftad

`curl http://localhost:5173/src/strategic/simulation/service.ts | grep SEATS_OLKROGEN` → 5 träffar. Bundlen serverar ORDER 186/187:s bar-först-preferens + SEAT_GROUPS_OLKROGEN. Visuellt bevis (post-fynd-1-fix): `frontend/reports/order188-verify/2-zoomed.png` visar upprätta sittande gäster vid baren. **Fynd 4 var symptom av fynd 1** — figurer som låg horisontellt syntes inte som "vid baren".

Ingen kod-fix nödvändig. Registerraden dokumenterar sambandet.

### §2.4 Fynd 5 — staff.targetGuestId + nearestSeat-guard

`service.ts:tickGuests` efter guest-pruning:

```
const activeGuestIds = new Set(state.guests.map(g => g.id));
for (const staff of state.staff) {
  if (staff.targetGuestId && !activeGuestIds.has(staff.targetGuestId)) {
    staff.targetGuestId = null;
    staff.taskType = null;
    staff.taskProgress = 0;
  }
}
```

`completeStaffTask` nullar bara vid normal task-slutförande; pruning-vägen städas separat här. Utan detta pekade staff på borttagen gäst → InteriorStaff (ORDER 186 fynd 5b) läste `guestById.get(id) = undefined` → drifter men kunde också få NaN-position i äldre code-path.

seatedIds-städning utökad med nearestSeat-guard (se §2.6).

### §2.5 Tillägg (a) — sitYaw-warning

`InteriorGuests.tsx` när `seatFacings[idx]` är `undefined` eller `NaN`: `console.warn` **en gång per (klass, seatIndex)** (Set-cache `_sitYawWarned`). Meddelande pekar på rumsfilen (`brewpubRoom.ts` / `restaurantRoom.ts`) som ska sätta facing per `RoomSeat`. Fallback: `microYaw` only.

VO-motivering: en plats utan kurs är ett datafel i rumsfilen, inte ett normalläge — varningen synliggör datafel utan att spamma varje frame.

### §2.6 Tillägg (b) — nearestSeatWithinM med avståndstak

Ny funktion `service.ts:nearestSeatWithinM(state, position, maxM=2.0): number | null`. Returnerar seat-index om närmaste seat är inom `maxM`, annars null.

Använd i seatedIds-städning:
```
state.seatedIds = state.seatedIds.filter((id) => {
  const g = state.guests.find(x => x.id === id);
  if (!g) return false;
  if (!['seated', 'ordering', 'dining', 'paying'].includes(g.state)) return false;
  return nearestSeatWithinM(state, g.position) !== null;  // NEW
});
```

Utan taket skulle en gäst mid-transition (state=seated men position ännu inte hos seat) räknas som seated → staff-target följde dem till fel plats. Med tak filtreras spöks-seatedIds.

## §3 Verifiering

`/tmp/order188-verify/verify.mjs` mot dev-server 5173, ölkrogen-flödet:
- Enter → cam-landning → open lunch 15 min → speed=4
- t1 (2 min): 1-first-seated.png + 1-zoomed.png
- t2 (5 min): 2-mid-service.png + 2-zoomed.png ← **visuellt bevis fynd 1**
- t3 (8 min): 3-full-service.png
- t4: key=5 scenario
- **full-service.webm** (~4 min inspelning)

Alla i `frontend/reports/order188-verify/`.

**Utfall visuellt:** `2-zoomed.png` visar sittande gäst vid bardisken UPPRÄTT (kropp vertikal, huvud ovanpå, ben under), gäst i nedre högra hörnet också upprätt. Personal (stående) upprätt som förr. **Regression löst.** Ingen sitYaw-warning loggad (kontraktet komplett).

## §DoD

- [x] `npm run typecheck` grön.
- [x] `npx vitest run` — 1066/1066 grön (`figureRig.test.ts` DoD 4-tolerans uppdaterad för sit-lift-post-185-geometri).
- [x] Verifiering körd i key=5-vyn med **video-inspelning + zoom-close-up per fynd**.
- [x] Bilder + video sparade i `frontend/reports/order188-verify/`.

## §4 Ändringar

```
frontend/src/strategic/scene/figureRig.ts                     (poseSeated swing negerad)
frontend/src/strategic/scene/InteriorGuests.tsx               (kö-jitter + sitYaw-warning)
frontend/src/strategic/simulation/service.ts                  (staff-städning + nearestSeatWithinM + seatedIds-guard)
frontend/src/strategic/scene/__tests__/figureRig.test.ts      (DoD 4-tolerans för poseSeated)
documentation/architecture/ORDER_188_POSE_AND_CLEANUP.md      (denna fil)
documentation/architecture/ORDER_REGISTRY.md                  (rad 188)
```

## §5 Ej i scope

- Kock-station (5c från ORDER 186 §5).
- Party för övriga klasser (ORDER 187 §5).
- Wine bar / inn / night club / food truck-scener när de mount:as.
- Precis polygon-clip för fynd 4 (ORDER 186 §5).
- Sit-lift per RoomSeat.seatHeight (barstol vs vanlig stol).

## §6 Numrering

Registret 187 → 188 (kontinuerligt).

Egen gren `order-188-pose-and-cleanup` från main.
