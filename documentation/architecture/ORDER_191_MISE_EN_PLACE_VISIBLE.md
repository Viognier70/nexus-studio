# ORDER 191 — Mise en place vinner över "On break" under prep

**Datum:** 2026-09-07
**Gren:** `order-191-mise-en-place-visible` från `main` (`0a851c5`, efter ORDER 188 merge).
**Föregås av:** 121 (kroppar), 137 (bakgrundslistor per klass), 188 (staff-städning).

## §1 Fynd (VO-direktiv: kolla sambandet först)

VO 2026-09-07 17:22: "Rummet är tomt — EN gäst under hela 53-sekunders-inspelningen. Panelen visar tre roller On break hela tiden. Sätts gäster alls?"

**VO:s hypotes:** "om phase aldrig blir 'service' kanske ankomstfönstret heller aldrig öppnar. Kolla det sambandet först."

### §1.1 Audit — sambandet är intakt

Pure-sim probe (utan browser, direkt reducer+arrivals+service-anrop) körde 500 sim-sek av ölkrogen med `OPEN_SERVICE lunch 15min`:

```
firstServicePhaseAt:       130 sim-sek
firstNonZeroArrivalProbAt: 130 sim-sek  (samma tick)
firstGuestSpawnedAt:       130 sim-sek  (samma tick)
firstTaskAt:               135.6 sim-sek (5.6s efter första gäst)
Totalt spawnat efter 500s: 110 gäster (67 completed + 20 seated + 23 pågående)
```

Sambandet är rätt: `arrivalProbability = 0` under prep (`arrivals.ts:125-130`) → 0 gäster; efter `simTime >= prepEndsAt` → arrivals öppnar, gäster spawnas, tasks tilldelas.

### §1.2 Rot-orsaken är visuell, inte funktionell

Prep-fasen är **130 sim-sek** (opening 10s + `PREP_DURATION_SEC_M5 = 120s`). Vid default speed=1× i browsern tar det 130 realtids-sek innan gäster kommer. VO:s 53s-inspelning nådde bara ~40% av prep-fasen.

**Under prep visas "On break" på panelen** — men personalen arbetar mise en place per design. `deriveActions.ts:132-133` (före ORDER 191) sätter "On break" när `phase='prep' && staff.taskType === null`. Sim-lagret sätter `taskType=null` under prep eftersom `findTaskTarget` behöver gäster (inga finns) och `pickBackgroundTaskFor` returnerar null för ölkrogen (per ORDER 137). Så panel-priority S2 föll INNAN S4 (mise en place) och personalen läste som lediga.

## §2 Form

`deriveActions.ts` — priority-flip: **S3/S4 (mise en place / chasing) vinner över S2 (On break) när `workload >= 0.1`.** Prep-tid är arbetstid; personalen har jobb att göra även om sim inte tilldelar guest-driven task.

"On break" reserveras för verklig inaktivitet: `workload < 0.1` efter längre tid utan uppgifter. Workload decays 0.03/s vid null task (`service.ts:729`), så typisk kock med default workload 0.3 tar ~7s att nå 0.1.

```
// ORDER 191 — mise en place vinner när workload är hög
if (phase === 'prep' && staff.taskType === null && staff.workload >= 0.1) {
  return chaseOrMiseEnPlace(...);  // S3/S4
}
// S2 — verkligt idle (workload dyk)
if (phase === 'prep' && staff.taskType === null) {
  return { text: 'On break', iconKey: 'pause' };
}
```

**Inte ändrat:**
- `PREP_DURATION_SEC_M5 = 120s` — designkonstant, kräver VO-diskussion.
- Sim-lagret task-tilldelning — task=null under prep är korrekt (inga direct-tasks tillgängliga).
- `arrivalProbability = 0` under prep — designen ("doors haven't opened yet").
- Ölkrogens saknade bakgrundslista i `pickBackgroundTaskFor` (ORDER 137 §2.3) — separat beslut.

## §3 Verifiering

- Pure-sim audit (temporär vitest-test, borttagen efter run) bekräftar timeline.
- Ny test `deriveActions.test.ts` rad 108-127: både S2-onbreak (workload=0) och S2-överskridning till mise en place (workload=0.3) verifieras.
- Existerande S2-onbreak-test uppdaterat att kräva `workload=0` explicit.

## §DoD

- [x] `npm run typecheck` grön.
- [x] `npx vitest run` — **1067/1067** grön (+1 nytt test för ORDER 191 mise-en-place-override).
- [x] Audit-data visar sambandet phase→arrivals intakt (rapport §1.1).

## §4 Ändringar

```
frontend/src/strategic/ui/RoomCardPanel/deriveActions.ts     (mise en place vinner före On break)
frontend/src/strategic/ui/RoomCardPanel/__tests__/deriveActions.test.ts  (uppdaterad + nytt test)
documentation/architecture/ORDER_191_MISE_EN_PLACE_VISIBLE.md (denna fil)
documentation/architecture/ORDER_REGISTRY.md                  (rad 191)
```

## §5 Ej i scope

- **Kortare prep-fas** (`PREP_DURATION_SEC_M5`). Designkonstant. Om VO vill kortare visuell prep, egen order.
- **Background-tasks för ölkrogen** i sim (`service.ts:706-712` ORDER 137-not). Skulle sätta `staff.taskType` till bakgrundsvärde → panelen visade det istället för mise en place. ORDER 137:s beslut var explicit att inte lägga för ölkrogen. Egen order.
- **Auto-boost sim-speed under prep**. Skulle förkorta väntetiden för spelare. Ändrar spel-mekanik. Egen order.
- **Fynd 3 (gäst bredvid stolen)** — ORDER 190.
- **Fynd 4 (värd i golvöppning)** — ORDER 190.

## §6 Numrering

Registret 188 → 191 (hoppar 189/190). Nummer 189 refererades av VO i tidigare meddelande men existerade inte; 190 är reserverad för nästa order (fynd 3+4). Gap dokumenteras enligt registrets §2.

Egen gren `order-191-mise-en-place-visible` från main.
