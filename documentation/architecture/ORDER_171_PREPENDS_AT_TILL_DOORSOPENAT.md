# ORDER 171 — prepEndsAt bunden till doorsOpenAt (samma ögonblick, ett namn)

**Repo** `Viognier70/nexus-studio` · **Gren** `order-171-doors-open-at` (från `main`)
**Klass** AUTONOM
**Datum** 2026-09-05
**Följer** Vision Owner-beslut 2026-09-05 (alternativ C efter ORDER 170:s live-audit)
**Följer** ORDER 160 — verifierande tal läses ur skriptets utdata
**Rättar** ORDER 124:s registerrad §2-slutsats

---

## 1. Läget

`state.day.prepEndsAt` och begreppet *doors-open-tidpunkten* är samma
ögonblick uttryckt på två sätt:

- `reducer.ts:openService` sätter `prepEndsAt = periodStartAt + OPENING +
  PREP` (klasser med `hasMiseEnPlace=true`) eller `= periodStartAt + OPENING`
  (foodtrucken).
- Doors-open-blocket i `reducer.ts:advanceTick` fires när `simTime >=
  prepEndsAt`, spawnar `waitingAtOpening`-gästerna, sätter
  `doorsOpenedThisService = true` och nollar fältet.

Två konstanter, en händelse. **Samma dubbelhet ORDER 144 tog bort med de
två matsalarna (`RESTAURANT_INTERIOR` vs `interiorLayout`) och ORDER 149
med `ZONE_FLOORS` i rumsfilerna.** ORDER 124 §2:s (b)-hypotes ("prepEndsAt
sätts för sent") och ORDER 124:s §1-tabell ("arrivals grindar på period,
handlingar på phase") kunde formuleras just för att de två benämningarna
såg ut att beskriva olika saker.

Den här ordern binder dem: **fältet heter `doorsOpenAt`**. Prep-fasen
(mellan `openingEndsAt` och `doorsOpenAt`) är oförändrad — den finns
kvar, den heter `'prep'` i `LogicalPhase`, den varar `PREP_DURATION_SEC`
sekunder för klasser med mise en place. Det som ändras är namnet på
tidsstämpeln; ingen semantik-ändring.

---

## 2. Ändringen

### 2.1 Fältet

`frontend/src/strategic/types.ts` — `DayState.prepEndsAt` byter namn till
`DayState.doorsOpenAt`. Kommentaren skrivs om till att förklara att
fältet beskriver **ögonblicket dörrarna öppnar**; prep-fasen är
[`openingEndsAt`, `doorsOpenAt`], noll för foodtrucken (samma tal), 120 s
för de fyra klasserna med mise en place.

### 2.2 Läsarna

Mekanisk rename över 16 filer (13 produktion + 4 tester + `strings`-
graden orörd):

- `simulation/reducer.ts` — 9 träffar (openService, doors-open-blocket,
  period-reset-vägar, forceCollapse-guard).
- `simulation/arrivals.ts` — 1 träff (early-return i `arrivalProbability`).
- `simulation/collapse.ts`, `morale.ts`, `eventStream.ts`, `model.ts` —
  5 träffar (init-state, guards, prep-window-check).
- `ui/RoomCardPanel/deriveActions.ts` — 1 träff (derivePhase `simTime <
  day.doorsOpenAt → 'prep'`).
- `ui/InstrumentsPanel.tsx`, `scene/InteriorStaff.tsx` — läsare i UI.
- Tester: `weather.test.ts`, `order111.test.ts`, `collapse.test.ts`,
  `morale.test.ts`, `eveningAccount.test.ts`,
  `RoomCardPanel/deriveActions.test.ts`.

Kommentaren i `types.ts` refererar ORDER 144 och ORDER 149 som prejudikat
för samma-ögonblick-ett-namn-mönstret.

### 2.3 Beteendet

Ingen skillnad. `doorsOpenAt` sätts vid samma OPEN_SERVICE till samma
värde som `prepEndsAt` gjorde. `arrivalProbability` early-return:ar när
`simTime < doorsOpenAt` (samma villkor som tidigare). `derivePhase`
returnerar `'prep'` när `simTime < doorsOpenAt` (samma villkor).
Doors-open-blocket fires vid `simTime >= doorsOpenAt` och nollar fältet
(samma logik).

---

## 3. Verifiering (§Vad händer i båda passlängder)

`frontend/scripts/order171-passlangd-verify.mjs` — playwright + Vite
dev-server, ölkrogen (via `brewpub`-alias) med två olika `lengthMinutes`:
15 och 30. `speed=0` + manuell TICK. Vid nyckelpunkter läses `state.simTime`,
`state.day.doorsOpenAt`, `state.day.periodStartAt`, `state.day.openingEndsAt`,
`state.day.doorsOpenedThisService`, `state.day.currentServiceLengthMinutes`,
`state.day.waitingAtOpening`, `state.guests.length`, `state.waitingIds.length`,
alla `state.staff.taskType`, samt DevPanel `service=`-fältet från renderad DOM.

**Rapport:** `frontend/reports/order171/passlangd-verify.json`

Talvärden per ORDER 160 — rapporten citerar filnamn + fält, inte tal:

- `pass15min.doorsOpenAtSec` och `pass30min.doorsOpenAtSec` — samma
  offset från `periodStartAt` i båda pass (`OPENING + PREP` för
  hasMiseEnPlace=true, inte skalning av passlängden).
- `pass15min.prepPercentOfPass` respektive `pass30min.prepPercentOfPass`
  — hur stor andel av passet som är prep. För 15 min-pass är prep
  `130/900` av passet; för 30 min-pass `130/1800`. Talvärden i JSON
  under samma fältnamn.
- `pass15min.snapshots[*]` och `pass30min.snapshots[*]` — snapshots vid
  nyckelpunkter. Fältet `doorsOpenedThisService` växlar från `false` till
  `true` mellan probe-punkten precis före och precis efter
  `doorsOpenAt`. Fältet `guestsTotal` växlar från `0` till
  `waitingAtOpening`-värdet i samma tick.
- `assertions.doorsOpenTimeIdenticalBothPasses` — bekräftar att prep-
  slut-tiden inte skalar med passlängden.
- `assertions.doorsOpenFired15min` och `.doorsOpenFired30min` — bekräftar
  att doors-open-blocket fires i BÅDA passlängder.
- `assertions.anyOnBreakWhileQueueNonEmpty15min` och `.…30min` — false
  betyder ingen `On break × 3` med `waitingIds > 0`. Personalen står inte
  stilla när gäster väntar (vilket är den observerbara egenskap
  ordertexten frågade efter). Talvärdet står i JSON.

### 3.1 Vad händer i 15-min-passet

Prep varar 130 s (≈ 14,4 % av passet). Doors öppnar vid `t = 130 s`;
`waitingAtOpening`-gästerna spawnar då. Service pågår 130..900 s (770 s
= 12 min 50 s). `snapshots`-serien i JSON pin:nar övergångarna.

### 3.2 Vad händer i 30-min-passet

Prep varar 130 s (≈ 7,2 % av passet). Doors öppnar vid `t = 130 s` —
**samma tal som 15-min-passet**. Service pågår 130..1800 s (1670 s = 27 min
50 s). `snapshots`-serien i JSON pin:nar övergångarna.

### 3.3 Ingen försämring

Refaktorn ändrar inte något beteende: `doorsOpenAt` sätts till exakt
samma tal `prepEndsAt` sattes till, alla läsare är rename:ade, ingen
threshold rörd, ingen tidsberäkning ändrad. Full svit `1066/1066` grön
efter refaktorn (samma antal som före). Tester som pin:nar prep-fönstrets
längd (`weather.test.ts` "sets doorsOpenAt to opening-end + prep-duration",
`order111.test.ts` "restaurant: doorsOpenAt > openingEndsAt (60s prep-
fönster)") pass:ar oförändrat.

---

## 4. ORDER 124-registerradens rättelse

**Rättad i samma commit.** Se rad `| 124 |` i `ORDER_REGISTRY.md`. Notet
tillagt:

> **Rättelse 2026-09-05 (ORDER 171):** ORDER 124 §1-tabellens formulering
> att "Ankomster (arrivals.ts) grindar på `period`" var oprecis. Prep-
> gaten `state.simTime < state.day.prepEndsAt → return 0` fanns i
> `arrivalProbability` redan sedan ORDER 043 Addendum A (git-blame
> `dd24dbcd`, 2026-08-08 — tre veckor före ORDER 124). ORDER 124 §2:s
> (b)-hypotes ("prepEndsAt sätts för sent") förutsatte att arrivals
> kunde ligga under prep, vilket koden hindrade. **Både ankomster och
> personal-handlingar grindar på samma tidsstämpel** — den heter numera
> `doorsOpenAt` per ORDER 171 (som eliminerade dubbelheten som §2 sneglade
> på). §3:s val "endast den grundorsak §2 fastställer" var därför ett
> falskt val: både (a) och (b) skulle ha visat sig icke-nödvändiga vid
> mätning, eftersom den observerade `On break × 3 + waiting=X` var en
> forecast/remaining-felläsning av DevPanel, inte en grind-defekt.
> Utredningsspåret följdes upp av ORDER 145/146/147 (seated-signal-
> artefakt), ORDER 169/170 (On break-live-audit) och stängs i sim-
> lagret av ORDER 171 (dubbelheten).

---

## 5. Vad som INTE gjordes

- **Prep-fasen togs inte bort.** ORDER 043 Addendum A + Addendum B, ORDER
  078 (M5 mise en place readiness), ORDER 111 §3 (`hasMiseEnPlace`-
  grenen), ORDER 117 §4 (mise en place-konsumtion) och ORDER 137
  (bakgrundsarbete-inklusive-under-prep) läser prep-fönstret. Fönstret
  bevaras. Bara benämningen av dess slut-ögonblick är rensad.
- **Inga trösklar kalibreras.** `OPENING_DURATION_SEC = 10`,
  `PREP_DURATION_SEC = 120` oförändrade.
- **Ingen ändring i `deriveStaffAction`.** S2-raden (`prep + null → On
  break`) står — det är kontraktenlig utsignal när staff har ingen task
  under prep. Ölkrogens öppna bg-tasks-scope (ORDER 137 §2.3, bryggeri =
  egen order) är oförändrat.
- **Ingen ändring i doors-open-blocket.** Guest-spawn, mise en place
  readiness, after-countdown-line — allt oförändrat.

---

## 6. DoD

1. `doorsOpenAt` ersätter `prepEndsAt` överallt i sim + UI + tester
   (`grep -rn "prepEndsAt" frontend/src` = 0 träffar).
2. Typecheck grön; full svit `1066/1066` grön (samma antal som före
   refaktorn).
3. `frontend/reports/order171/passlangd-verify.json` bevisar att
   doors-open fires i båda passlängder och att ingen `On break × 3` med
   `waitingIds > 0` observeras. Talvärden per ORDER 160.
4. ORDER 124-registerraden rättad i samma commit.
5. Registerpost 171 i samma commit.

---

## 7. Filer

- `frontend/src/strategic/types.ts` — `prepEndsAt` → `doorsOpenAt` +
  omskriven kommentar med ORDER 144/149-prejudikat.
- `frontend/src/strategic/simulation/{reducer,arrivals,collapse,morale,eventStream,model}.ts`
  — mekanisk rename + en förklarande kommentar i `reducer.openService`.
- `frontend/src/strategic/ui/RoomCardPanel/deriveActions.ts`,
  `frontend/src/strategic/ui/InstrumentsPanel.tsx`,
  `frontend/src/strategic/scene/InteriorStaff.tsx` — mekanisk rename.
- `frontend/src/strategic/simulation/__tests__/{weather,collapse,morale,eveningAccount}.test.ts`,
  `frontend/src/strategic/business/__tests__/order111.test.ts`,
  `frontend/src/strategic/ui/RoomCardPanel/__tests__/deriveActions.test.ts`
  — mekanisk rename.
- `frontend/scripts/order171-passlangd-verify.mjs` — verifieringsskript.
- `frontend/reports/order171/passlangd-verify.json` — live-observation
  vid nyckelpunkter för 15 min + 30 min-pass.
- `documentation/architecture/ORDER_171_PREPENDS_AT_TILL_DOORSOPENAT.md`
  — denna text.
- `documentation/architecture/ORDER_REGISTRY.md` — registerpost 171 +
  rättelse-not på 124-raden.
