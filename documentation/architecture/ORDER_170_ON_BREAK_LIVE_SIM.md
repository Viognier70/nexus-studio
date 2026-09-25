# ORDER 170 — On break-spåret: live-sim-audit i ölkrogen

**Repo** `Viognier70/nexus-studio` · **Gren** `order-170-on-break-live-sim` (från `main`)
**Klass** AUTONOM — utredning
**Datum** 2026-09-05
**Följer** ORDER 146 §slutord (On break-fyndet stod kvar som separat spår) och ordertextens uppdaterade observationer 2026-09-01 + 2026-09-05
**Följer** ORDER 160 — verifierande tal läses ur skriptets utdata
**Bara utredning.** Ingen produktionskod ändras.

---

## 1. Läget

Två observationer i ölkrogen, båda med samma mönster:

- **2026-09-01:** `service=12:51/15min`, `waiting=3`, alla tre roller `On break`
- **2026-09-05:** `service=14:40/15min`, `waiting=5`, alla tre roller `On break`

Ordertexten läser `14:40/15min` som "fjorton av femton minuter gångna",
det vill säga elapsed. Om det stämde skulle prep-fasen pågå sent i passet
— vilket motsäger ORDER 124 §2:s fynd att ankomster och personal-handlingar
grindar på samma `prepEndsAt`, samtidigt som fem gäster väntar.

Ordertexten frågar också om något av ORDER 137 (bakgrundsarbete), ORDER 154
(rollmappning) eller ORDER 163 (klassberoende kapacitet) har rört grinden.

Talvärden nedan citeras ur `frontend/reports/order170/on-break-live-audit.json`,
producerad av `frontend/scripts/order170-on-break-live-audit.mjs`. Skriptet
startar Vite dev-server, laddar `#playtest=1&business=brewpub&period=lunch`
(alias för ölkrogen per `urlParams.ts:169`), dispatch:ar `OPEN_SERVICE(lunch,
15 min)`, sätter `speed=0` och driver ticken manuellt (dt=0.2, 5 Hz). Vid
varje probe-punkt läses `state.simTime`, `state.day.prepEndsAt`,
`state.day.waitingAtOpening`, alla `state.staff.taskType`, `state.guests.length`,
`state.waitingIds.length`, och **DevPanel-strängens `service=`-fält direkt
från renderad DOM** (regex `service=(\S+)` mot text-noden med `day=`).

---

## 2. När sätts `prepEndsAt`? Vilket värde får det i ölkrogen?

Oförändrat sedan ORDER 169-utredningen (som ligger commit:ad i grenen
`order-169-on-break-utredning` men ännu inte i main):

- `prepEndsAt` sätts i `reducer.ts` vid `OPEN_SERVICE`-action:en. Fältet
  `snapshots[0].prepEndsAt` i JSON bär värdet vid t=0 för ölkrogen-lunch-
  passet (`periodStartAt` och `prepEndsAt` båda synliga där).
- Formeln grenar på `businessHasMiseEnPlace(businessClass)`. För ölkrogen
  (`hasMiseEnPlace: true` i `businessClass.ts:95`) blir `prepEndsAt =
  periodStartAt + OPENING_DURATION_SEC + PREP_DURATION_SEC`.
- Uttryckt i sekunder: prep-fasen slutar `130 s` efter service-start
  (opening 10 s + prep 120 s). Talvärdena är låsta i `snapshots[0]` +
  `snapshots[*].prepEndsAt` som skriptet skrev.

**Ingen av ORDER 137, 154 eller 163 har rört den här formeln.**

- **ORDER 137 (bakgrundsarbete)** — commit `02c83fe` — rörde `service.ts`
  (`findBackgroundTaskFor` + preemption + workload-target för bg-tasks),
  `economics.ts` (`TASK_BASE_TICKS` för bg-typer), `types.ts` (utökade
  `TaskType`). Rörde EJ `reducer.ts` (`openService` / `prepEndsAt`), EJ
  `arrivals.ts` (prep-gaten), EJ `deriveActions.ts` (S2-raden). Ordertexten
  i commit-messagen är explicit: *"arrivals.ts orörd, businessClass.ts
  capacityFor orörd, presentationslagret helt orört"*. `git log` mot
  `arrivals.ts` bekräftar (senast rörd av ORDER 166 `b851580`, endast
  `* shareMult` sist i produkten — grinden intakt).

- **ORDER 154 (stationFor)** — commit `533e59f` — rörde
  `businessRoom.ts` (STATION_MAP + `stationFor`), `InteriorStaff.tsx`,
  `RestaurantScene.tsx`, `BrewpubScene.tsx`, `interiorSharedState.ts`.
  Rörde EJ sim-lagret (`reducer.ts`, `service.ts`, `arrivals.ts`) och EJ
  `deriveActions.ts`.

- **ORDER 163 (klassberoende kapacitet)** — **finns inte i repot.**
  `grep -rn "ORDER 163" documentation/` = tomt. Registret hoppar 162 → 164
  (rad `sequences-hål`-mönstret; verifierat i `ORDER_REGISTRY.md`).
  Klassberoende kapacitet är sakligt vad ORDER 150 (`businessRoomRef.capacity`)
  och ORDER 157 (`DevPanel` läser `roomChan.capacity` med `!room=`-suffix)
  gjorde — båda rörde presentationslagret + DevPanels avläsning, inte
  arrivals-grinden.

Sammanfattning: grinden är oberörd. `reducer.ts` senast committad av
ORDER 117 (2026-08-18), `arrivals.ts` senast av ORDER 166 (bara en
faktor lagd till produkten), `deriveActions.ts` senast av ORDER 088
(2026-08-13). Se `git log --all --oneline -- <fil>` för respektive.

---

## 3. Varför står personalen `On break` sent i passet?

**Kort svar: den gör inte det.** Ordertextens tolkning av
`service=14:40/15min` som "14:40 elapsed" är felläsning av panelen.
DevPanel-fältet är REMAINING (kvarvarande tid), inte elapsed.

### 3.1 Panelen visar remaining — bekräftat i live-DOM

DevPanels formel (rad 107-117 i `DevPanel.tsx`) beräknar
`rem = totalSec − elapsed` och skriver `"m:ss / N min"`. Fältet är
alltså återstående tid — se `sourceCitations.devPanelServiceFormulaLine`
i ORDER 169:s JSON (samma fil idag).

Live-verifieringen i denna orders JSON pin:nar det:
`snapshots[*].elapsedSinceServiceStart` (verklig elapsed i sim) och
`snapshots[*].devPanelServiceField` (strängen panelen faktiskt visade).
Läs raderna i JSON och matcha `elapsed` mot `service`-fältet — remaining
= `15 min − elapsed` faller ut exakt.

### 3.2 Ordertextens `14:40/15min` motsvarar elapsed ~20 s — mitt i prep

Prep slutar vid `prepEndsAt = periodStartAt + 130 s`. Vid elapsed
`~15 min − 14 min 40 s = 20 s` är vi 20 sekunder in i lunchpasset, alltså
110 sekunder INNAN prep slutar. Fältet
`observationInterpretation.observation2_14_40` i JSON säger vad
skriptet observerade vid samma elapsed (och `earlyPrepCheck` säger vad
panelen skulle visa vid en verkligt tidig probe-punkt).

Fältet `snapshots[*].computedPhase` bär phase-utfallet från
`derivePhase`-logiken (reproducerad i skriptet från
`deriveActions.ts:60-69`). Under de tre tidiga probe-punkterna
(motsvarande observationens elapsed-fönster) är `computedPhase='prep'` och
`onBreakByS2=true` — de tre rollerna har `taskType=null` under prep, S2-
raden matchar, alla tre säger 'On break'. Kontraktenlig utsignal.

### 3.3 Observation 1 (`12:51/15min`) — samma familj

Fältet `observationInterpretation.observation1_12_51` i JSON. Elapsed
`~15 min − 12 min 51 s = 2 min 9 s = 129 s` — en sekund innan prep-
slutet. Under mätningen (probe-punkt närmaste 129 s) föll skriptet över
prep-slutet något (`actualElapsed` några sim-sekunder efter target;
`computedPhase='service'`, `taskType='order'` för alla tre, `On break`
gäller inte längre). Marginalen är låg men riktningen är entydig:
`12:51/15min` remaining = elapsed 129 s = sista sekunden i prep, inte
tolv minuter in.

---

## 4. `waiting=3`/`waiting=5` — forecast, inte live-kö

DevPanel-fältet `waiting=X` är `d.waitingAtOpening` (per
`DevPanel.tsx:215`), en *forecast* som sätts vid `OPEN_SERVICE`
(reputation × väder × world-factors, cap:ad vid 6) och är konstant över
hela passet. Live-kön står som `queue=X` på samma DevPanel-rad.

Fältet `snapshots[*].waitingAtOpening` bär forecast-värdet (samma över
alla probes); `snapshots[*].waitingIdsCount` bär live-kön. Under prep-
fönstret (tidiga probe-punkter) är `waitingIdsCount = 0` och `guestsTotal
= 0` — INGA gäster har spawnat, för prep-gaten (`arrivals.ts:126-127`)
returnerar `0` från `arrivalProbability` medan `simTime < prepEndsAt`.

`waitingAtOpening`-gästerna spawnar först vid `prepEndsAt` — i probe-
punkten närmast prep-slutet (target=131 s) syns det: `guestsTotal` gick
från 0 till `waitingAtOpening`-värdet, `waitingIdsCount` följer efter,
`taskType` för alla tre roller växlar från `null` till `'order'`.

`waiting=5` i observation 2 betyder alltså inte "fem gäster i kön just
nu" — det betyder "fem gäster förväntas anlända när dörrarna öppnar".
De står inte utanför före prep-slut; de finns inte i `state.guests`
förrän prep-slutet.

---

## 5. Grundorsak

Ingen sim-defekt. Ingen grind rörd av ORDER 137 / 154 / 163.

Två samtidiga läsfel på DevPanel-strängen:

1. **`service=X:XX/15min` lästs som elapsed** — fältet är remaining
   (bekräftat via live-verifiering: elapsed 44 s → `service=14:15`;
   elapsed 524 s → `service=6:15`; se `snapshots[*]` i JSON).
2. **`waiting=X` lästs som live-kö** — fältet är forecast
   (`waitingAtOpening`, stabil hela passet). Live-kön är `queue=` på
   samma rad. Fem forecast-gäster har inte anlänt förrän prep-slutet
   (verifierat: `guestsTotal=0` under alla prep-probe-punkter).

Kombinationen ser ut som "prep pågår 14 min in, fem gäster står och
väntar", men det är två samfallande felläsningar av samma panel.
Familj: samma signal-artefakt-mönster som ORDER 145 (`state='seated'`
transient) och ORDER 146 (`seated=0/16` forecast).

**Not om ORDER 137:** ölkrogen står med tom bg-task-lista
(`service.ts:452` `ölkrogen: []`) per §2.3 (bryggeri = egen order). Det
förklarar varför ölkrogen under prep visar `On break` (S2-raden) medan
kvarterskrogen och gästgiveriet under prep visar `Mise en place — …`
(S4-raden, för att `pickBackgroundTaskFor` sätter en bg-task-typ). Båda
är kontraktenlig utsignal — prep-gränsen är fortfarande 130 s för alla
klasser med `hasMiseEnPlace: true`.

---

## 6. Vad som INTE ska byggas

- **Ingen ändring i `deriveStaffAction`.** S2-raden (prep + null →
  'On break') är korrekt givet klassen. Om det finns läsbarhetsvärde
  i att ölkrogen får en aktivare prep-vokabulär (som kvarterskrogens
  'Mise en place — ...') är det en designfråga för ORDER 137-scope-
  utökningen (bryggeri-arbete i ölkrogen), inte en grind-fix.
- **Ingen ändring i `arrivalProbability`.** Prep-gaten står korrekt.
- **Ingen ändring i `OPEN_SERVICE`.**
- **Inga trösklar kalibreras.**

Om det finns ett upplevelse-problem här är det **DevPanels läsbarhet**:
`service=` visar remaining medan mental modell lätt hamnar på elapsed,
och `waiting=` sitter bredvid `queue=` med snarlik namngivning fast med
olika semantik. Efter TVÅ observationer med samma felläsning på tre dagar
är hypotesen att panelens ordval faktiskt driver läsfelet svårare att
avfärda. Läsbarhetsfixen är egen order (jfr ORDER 147:s Alt B breakdown-
suffix till `seated=`). Alternativ att väga:

- **A.** Byt `service=X:XX/15min` till `service=elapsed:XX/15min` (eller
  omvänt: byt formatet så det syns vilken sida av bråket som är kvar).
- **B.** Visa båda: `service=2:15/15min (kvar 12:45)` eller motsvarande.
- **C.** Byt `waiting=` (forecast) till `wait_forecast=` eller `waitOP=`
  så det inte kan förväxlas med kön `queue=`.

Vilken (eller ingen) är egen VO-ordning.

---

## 7. Rekommendation

**Stäng On break-spåret för andra gången.** Sim-lagret gör det den ska:
prep varar 130 s efter service-start; ölkrogens tre roller är `On break`
under prep (S2, för att bg-lista är tom per ORDER 137 §2.3); live-
arrivals är omöjliga under prep; `waiting=`-forecast-gästerna spawnar
vid prep-slutet. ORDER 137/154/163 har inte rört någon del av grinden.

Efter tre iterationer (ORDER 124 → 145/146/147 → 169 → 170) samma
grundorsak: DevPanel-strängens läsbarhet lurar observatören. Om det
återkommer bör åtgärden ligga på PANELEN, inte simuleringen.

---

## 8. DoD

1. Grundorsak fastställd med tal — talvärden ligger i
   `on-break-live-audit.json` som skriptet skrev; rapporten citerar
   filnamn + fält per ORDER 160.
2. Ingen produktionskod rörd (endast dokumentation + verifieringsskript
   + report-JSON).
3. Ingen tröskel kalibrerad.
4. Verifieringsskript kör LIVE-sim (Vite + playwright); skriptets JSON
   speglar renderad DOM-textnod + `state.simTime`/`.prepEndsAt`/
   `.staff.taskType` från runtime.
5. Registerpost i samma commit.

---

## 9. Filer

- `frontend/scripts/order170-on-break-live-audit.mjs` — verifieringsskript
  (playwright + Vite dev-server).
- `frontend/reports/order170/on-break-live-audit.json` — live-observation
  vid nio elapsed-punkter, DevPanel-strängens `service=`-fält, staff-
  tasks, computedPhase.
- `documentation/architecture/ORDER_170_ON_BREAK_LIVE_SIM.md` — denna text.
