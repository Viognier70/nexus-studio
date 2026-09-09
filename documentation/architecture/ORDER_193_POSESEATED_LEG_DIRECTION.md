# ORDER 193 — poseSeated: benet framåt-och-nedåt, inte bakåt-och-uppåt

**Datum:** 2026-09-09
**Gren:** `order-193-poseseated-forward-legs` från `main` (`07ac5cb`, efter ORDER 190 merge).
**Föregås av:** 121 (kroppar), 185 (sit-lift), 188 (§2.1 pose-fix).

## §1 Fynd — inspelning 2026-09-09 16:12 (VO)

VO-rapport ur ölkrogen key=5-scenariot:

1. **Regression: gäster ligger horisontellt över stolsryggarna vid vänstra bordet.** ORDER 188 §2.1:s pose-fix förväntades stänga fyndet. Symptomet finns kvar.
2. Personal utanför rummet med röd ring — separat, hänvisas till egen order.
3. Kluster vid entrén utanför väggen — separat.

Denna order tar bara fynd 1.

## §2 Rot-orsak — tecknet i ORDER 188 §2.1

ORDER 188 §2.1 negerade `poseSeated.legL/R.swing` från `+1.46` till `-1.46` med motivering att `applyLeg` sätter `hip.rotation.x = -(swing)` och att `swing=+1.46 → hip.rot.x = -1.46 → benet BAKÅT-och-uppåt`. **Kommentaren beskrev fel riktning.** Rig-inspektion via `window.__nxRigDebug` 2026-09-09 (`frontend/reports/order193-verify/rig-inspection.json`) visar:

Före denna order (`swing = -1.46`):
```
hipL.rotation.x = +1.46   (från applyLeg: −(−1.46))
kneeL.rotation.x = +1.77
```

Räknar man ut vart benet pekar i figurens **lokala** ram (three.js right-handed: positiv rot om +X vrider +Y mot +Z):

- Vilo-riktning för benet från höftleden: `(0, -1, 0)` (hänger rakt ner).
- `Rx(+1.46) * (0, -1, 0) = (0, -cos1.46, -sin1.46) = (0, -0.11, -0.99)`.
- Lokal `-Z` är BAKÅT från figuren. Figuren tittar mot `+Z` när `facing=0` (`brewpubRoom.ts:598`).
- Alltså: **thigh horisontellt bakåt från stolen — inte framåt mot bordet.**

Med `kneeL.rot.x = +1.77` bakom det: shinets riktning efter både höft- och knärotation blir `(0, +0.99, +0.086)` — **shinet pekar uppåt**. Figuren har lår horisontellt bakåt och skenben uppåt-bakåt.

Från spelarvyn i key=5 (kamera 24 m, lutad topp-ned) läses detta som "gästen ligger horisontellt över stolsryggen": huvudet syns på stolens plats, thigh-cylindern sträcker sig bakåt över stolens ryggstöd (`brewpubRoom.ts:574` — `box(0.42, 0.4, 0.04)` vid `z = -0.2` lokalt), och shinet är osynligt i ovansikten. Silhuetten blir en horisontell fläck över stolen — precis VO:s formulering.

## §3 Form

`figureRig.ts:599-600` — nya värden:

```
legL: { swing: 1.46, spread: 0.06, knee: 1.46, ankle: 0 },
legR: { swing: 1.46, spread: 0.06, knee: 1.46, ankle: 0 }
```

- `swing = +1.46 → hip.rot.x = -1.46 → thigh (0, -0.11, +0.995) = lokal +Z = FRAMÅT mot bordet.`
- `knee = +1.46`: shinet i knä-lokal riktning blir `(0, -cos1.46, -sin1.46) = (0, -0.11, -0.995)`. Efter parentens `Rx(-1.46)` blir shinets världsriktning `(0, -1, 0)` = rakt ner. Foten landar under låret där tyngdkraften vill ha den.
- `ankle = 0`: knä-vinkeln 1,46 rad var kalibrerat för att bära shinet lodrätt. Ingen extra fotledsböj behövs; ORDER 188:s 0,31 kompenserade för fel shin-riktning.

## §4 Verifiering

**Runtime rig-inspektion**: `window.__nxRigDebug` exponerar `rigsRef.current` (Map<guestId, FigureRig>) i DEV så playwright kan läsa faktiska `joint.rotation`-värden efter `applyPose`. Innan denna order behövde man gissa vad `applyPose` gjorde. Nu:

```
rig-inspection.json (efter fix):
  id=gst-70 state=paying seat=16
    hipL.rot = [-1.46, 0, -0.06]
    kneeL.rot = [+1.46, 0, 0]
```

Före fix (samma dump-format med `swing=-1.46`):
```
    hipL.rot = [+1.46, 0, -0.06]
    kneeL.rot = [+1.77, 0, 0]
```

**Visuellt bevis:**
- `frontend/reports/order193-verify/LT_full.png`: helskärm av ölkrogen 24 m efter 90 s speed=4-service. Gäster på alla platskategorier: bar (12-19), långbord (0-7), tvåbord (8-11).
- `frontend/reports/order193-verify/MEGA1.png`: super-zoom (12×) på seated gäst vid långbord. Thigh horisontellt framåt, shin lodrätt ner — samma silhuett som stående gäst men lägre.

**Tester:**
- `npm run typecheck` grön.
- `npx vitest run` — **1067/1067** grön. `figureRig.test.ts` DoD 4-tolerans från ORDER 188 (poseSeated övre 0,5) fortfarande satisfierad — nya benkonstruktionen ger ankel på golvplanet inom samma tolerans.

## §DoD

- [x] `npm run typecheck` grön.
- [x] `npx vitest run` — 1067/1067 grön.
- [x] Rig-inspektion via `window.__nxRigDebug` visar önskade rotationer.
- [x] Visuell verifiering i key=5-vyn med gäster vid långbord.
- [x] `frontend/reports/order193-verify/` innehåller helskärm + zoom + rig-dump.

## §5 Ändringar

```
frontend/src/strategic/scene/figureRig.ts               (swing +1.46, knee +1.46, ankle 0)
frontend/src/strategic/scene/InteriorGuests.tsx         (__nxRigDebug-exponering)
documentation/architecture/ORDER_193_POSESEATED_LEG_DIRECTION.md   (denna fil)
documentation/architecture/ORDER_REGISTRY.md            (rad 193)
```

## §6 Ej i scope

- **Fynd 2** (personal utanför rummet med röd ring) — egen order. Rot-orsak är stationsvärde eller `room.group` världstransform, inte poseSeated.
- **Fynd 3** (kluster vid entrén utanför väggen) — egen order.
- **Sit-lift per RoomSeat.seatHeight** (bar 0,75 m vs stol 0,45 m). Nuvarande sit-lift 0,45 m är hardcoded i `InteriorGuests.tsx:107`. Ölkrogen bar-stolar (0,86 m sitthöjd) och långbord (0,58 m sitthöjd) delar samma sit-lift → figuren sitter 30 cm över barstolen respektive lite över långbordsstolen. Separat kalibreringsorder.
- **Poseoptions.targetYaw** i poseSeated för att låta bålen luta mot bordet — ORDER 188 §2 lämnade det ur scope och det görs inte här heller.

## §7 Numrering

Registret 191 → 192 (denna order är 192 om `192` inte finns, annars 193 nästa lediga). ORDER 191 §6 säger att 190 är reserverad — 190 användes i själva verket. Nästa lediga nummer är **193**. Registret får rad 193.

Egen gren `order-193-poseseated-forward-legs` från main.
