# ORDER 169 — On break-spåret: prep-fasgränsen och avläsningen av DevPanel

**Repo** `Viognier70/nexus-studio` · **Gren** `order-169-on-break-utredning` (från `main`)
**Klass** AUTONOM — utredning
**Datum** 2026-09-02
**Följer** ORDER 146 §slutord (On break-fyndet stod kvar som separat spår när ORDER 124 stängdes av ORDER 147)
**Följer** ORDER 160 — verifierande tal läses ur skriptets utdata
**Bara utredning.** Ingen produktionskod ändras. Inga trösklar kalibreras.

---

## 1. Läget

Observation 2026-09-01 på dev-servern:

- Verksamhet: **ölkrogen**
- DevPanel: `service=12:51/15min`, `waiting=3`
- Alla tre roller: `On break`

Ordertexten läser detta som "prep-fasen fortsätter tolv minuter in i ett
femtonminuterspass, samtidigt som kön har tre gäster — vilket motsäger ORDER 124
§2-fyndet att ankomster och personal-handlingar grindar på samma `prepEndsAt`".

Talvärden nedan citeras ur `frontend/reports/order169/prep-gate-audit.json`,
producerad av `frontend/scripts/order169-prep-gate-audit.mjs`. Skriptet
importerar `derivePhase` + `deriveStaffAction` från produktionsmodulen
`frontend/src/strategic/ui/RoomCardPanel/deriveActions.ts` via esbuild-
transpilering — samma referenser som RoomCardPanel + DevPanel konsumerar.
Konstanterna läses via regex mot källfilerna, och fältnamnen
`constants.OPENING_DURATION_SEC`, `constants.PREP_DURATION_SEC`,
`constants.businessHasMiseEnPlace(ölkrogen)`, `derivedTimeline.prepEndsAt`,
`probes[*].derivePhase`, `probes[*].allThreeOnBreak`,
`probes[*].devPanelServiceReadout` och `observationInterpretation.*` i
JSON-filen är källan för allt som står här.

---

## 2. När sätts `prepEndsAt`? Vilket värde får det i ölkrogen?

`prepEndsAt` sätts vid `OPEN_SERVICE`-action:en i reducern. Källrader citeras
i JSON-fältet `sourceCitations.reducerPrepEndsAtAssign` — tilldelningen ligger
i `reducer.ts` och grenar på `businessHasMiseEnPlace(state.businessClass)`:

- **Med mise en place:** `prepEndsAt = simTime + OPENING_DURATION_SEC + PREP_DURATION_SEC`
- **Utan mise en place** (t.ex. foodtrucken): `prepEndsAt = simTime + OPENING_DURATION_SEC`

För **ölkrogen** står `hasMiseEnPlace: true` i BUSINESS_CLASS_CONFIG — värdet och
källraden ligger i JSON-fältet `constants.businessHasMiseEnPlace(ölkrogen)`.

Med de tre inputvärdena (fältet `constants` i JSON) blir `prepEndsAt` för ölkrogen
`derivedTimeline.prepEndsAt` sekunder efter `periodStartAt` (fältet
`derivedTimeline.prepEndsAtMinutesInService` uttrycker samma tal i minuter).

---

## 3. Varför står personalen i prep-läge när observationen tas?

**Kort svar:** de gör det inte i den mening ordertexten läser observationen.
Observationens tolkning ("tolv minuter in") kommer från att `service=12:51/15min`
lästs som *elapsed* men fältet är *remaining*.

### 3.1 DevPanels `service=`-fält är REMAINING, inte elapsed

DevPanels formel citeras i JSON-fältet `sourceCitations.devPanelServiceFormulaLine`.
Formeln beräknar `rem = totalSec − elapsed` och skriver `"m:ss / N min"`. En
avläsning `service=12:51/15min` betyder alltså `12 min 51 s KVAR`, inte
`12 min 51 s FÖRFLUTNA`. Elapsed sedan service-start är därför
`15 × 60 − (12 × 60 + 51)` = `observationInterpretation.elapsedSecondsFromObservation`
sekunder (JSON), eller `observationInterpretation.elapsedMinutes` minuter.

### 3.2 Prep-slutet ligger senare än observationen — med marginal på sekunder

`derivedTimeline.prepEndsAt` (JSON) står i sekunder efter service-start.
`observationInterpretation.elapsedIsLessThanPrepEndsAt` är JSON-fältet som säger
om observationen ligger inom prep-fönstret; `observationInterpretation.secondsUntilPrepEnds`
säger hur många sekunder som återstår. Se JSON.

Skriptet probear `derivePhase` från produktionen vid nio elapsed-punkter
(`probes[*]` i JSON), inklusive den elapsed-punkt observationen faktiskt
motsvarar. Fältet `probes[*].derivePhase` säger vilken fas produktionen
returnerar; `probes[*].allThreeOnBreak` säger om alla tre roller får `On break`
vid samma tidpunkt (via `deriveStaffAction`, S2-raden). Läs `probes`-arrayen i
JSON för att se hur båda växlar exakt när `elapsed` passerar prep-gränsen.

### 3.3 Slutsats om "12 min in"

Ordertextens formulering "personalen är fortfarande i prep-läge tolv minuter in"
bygger på att `service=12:51` tolkas som förflutna. Panelen visar återstående.
Elapsed vid observationen är det som `observationInterpretation.elapsedMinutes`
säger — och prep-slutet ligger vid `derivedTimeline.prepEndsAt / 60` minuter in.
Fältet `observationInterpretation.onBreakIsExpected` bär utfallet. Sim-lagret
gör det den ska; observationens läsning behöver rättas.

---

## 4. ORDER 124 §2-fyndet stämmer — men var oprecist

Ordertexten refererar ORDER 124 §2:s formulering "ankomster och handlingar
grindar på SAMMA `prepEndsAt`" och drar slutsatsen att tre väntande gäster
motsäger den. Två saker separeras här.

### 4.1 Vad `waiting=3` faktiskt betyder i DevPanel

`waiting=` på DevPanels väderrad är **inte** live-kön. Fältet är
`d.waitingAtOpening` — en *forecast* som sätts vid `OPEN_SERVICE` (reputation ×
väder × world-factors, capp:ad vid 6) och är **konstant över hela passet**.
Källraden citeras i JSON-fältet `sourceCitations.devPanelWaitingLine`.

Live-kön står på samma DevPanel-rad som `queue=X` (tillagd i ORDER 097). Det
här är samma familj av signal-artefakt som ORDER 145/146 fångade:
`state='seated'` som transient-räknat "sittande" istället för `seatedIds`-
räknat. En observatör som läser `waiting=3` som "tre gäster i kön" tar
forecast-fältet för live-räkning. `waiting=3` betyder "tre gäster förväntas
stå utanför när dörrarna öppnar", inte "tre gäster står i kön just nu".

`waitingAtOpening`-gästerna spawnar **vid `prepEndsAt`**, inte innan. Källraden
citeras i JSON-fältet `sourceCitations.reducerDoorsOpenSpawn` — spawn-koden
gate:as på `!draft.day.doorsOpenedThisService && draft.day.waitingAtOpening > 0`
och kör i samma tick där prep-slutet upptäcks.

### 4.2 Ankomster grindar faktiskt på `prepEndsAt` (§1 i ORDER 124 var inexakt)

ORDER 124 §1 skrev tabellen:

| System | Grindar på |
| --- | --- |
| Ankomster (`arrivals.ts`) | `period` — lunch 0,6 / middag 1,0 |
| Personalens handlingar | `phase` — `prep` ger `On break` |

Den tabellen är inte hela sanningen. `arrivalProbability`-funktionens
prep-gate — `state.simTime < state.day.prepEndsAt → return 0` — citeras i
JSON-fältet `sourceCitations.arrivalsPrepGate` (och det direkt föregående
`return 0`-uttrycket i `sourceCitations.arrivalsReturnZeroAfterGate`). Gaten
har funnits sedan ORDER 043 Addendum A (git-blame säger `dd24dbcd 2026-08-08`),
alltså tre veckor före ORDER 124.

`period`-multiplikatorn (lunch 0,6 / middag 1,0) är EN faktor i produkten,
men prep-gaten är en early-return som föregår multiplikatorn. Ordertextens
läsning "ankomster och handlingar grindar på SAMMA `prepEndsAt`" är därför
**korrekt om produktionskoden idag** — men ORDER 124 §1:s formulering var
oprecis: den beskrev `period`-multiplikatorn som om det vore hela grinden.

### 4.3 Konsekvens

Med prep-gaten på plats kan **inga live-arrivals hända under prep**.
`waiting=3` i DevPanel vid observationens tidpunkt är forecast, inte kö.
De tre gästerna finns inte i `state.guests` ännu — de spawnar när samma tick
som `simTime >= prepEndsAt` triggar `doors-open`-blocket (JSON:
`sourceCitations.reducerDoorsOpenSpawn`).

---

## 5. Grundorsak

Ingen sim-defekt.

Två sammanfallande läsfel på DevPanel-strängen:

1. **`service=12:51/15min` lästs som elapsed** — fältet är remaining. Elapsed
   är `observationInterpretation.elapsedSecondsFromObservation` sekunder in
   i passet, en sekund innan prep-slutet.
2. **`waiting=3` lästs som live-kö** — fältet är forecast (`waitingAtOpening`),
   stabil hela passet. Live-kön är `queue=` på samma rad.

Kombinationen ser ut som en bug ("prep pågår 12 min in, gäster står och
väntar"), men både `On break` × 3 och `waiting=3` är väntad, kontraktenlig
utsignal vid den elapsed-punkt observationen faktiskt gjordes (`elapsed` en
sekund innan `prepEndsAt` — se `probes[*]`-serien i JSON).

Familj: samma signal-artefakt-mönster som ORDER 145 (`state='seated'` transient
lästes som "sittande") och ORDER 146 (`seated=0/16` var forecast/räknar-fel,
inte sim-fel).

---

## 6. Vad som INTE ska byggas

- **Ingen ändring i `deriveStaffAction`.** Rad S2 (`phase='prep' && taskType===null →
  On break`) är korrekt för fasen. Om personalen ska ha en aktivare
  prep-vokabulär är det ett designval, inte ett fel i grinden.
- **Ingen ändring i `arrivalProbability`.** Prep-gaten
  (`sourceCitations.arrivalsPrepGate`) står korrekt och har verkat sedan
  ORDER 043 Addendum A.
- **Ingen ändring i `OPEN_SERVICE`.** `prepEndsAt`-tilldelningen är korrekt.
- **Inga trösklar kalibreras.**

Om det finns ett upplevelse-problem här är det **läsbarheten på DevPanel**:
`service=` visar remaining medan mental modell lätt hamnar på elapsed, och
`waiting=` sitter bredvid `queue=` med snarlik namngivning fast med olika
semantik. Det är egen läsbarhetsfråga (jfr ORDER 147:s Alt B breakdown-suffix
till `seated=`), inte en simuleringsfråga. Utfallet där hör hemma i egen
följdorder om Vision Owner beslutar att panelens ordval ska ändras.

---

## 7. Rekommendation

**Stäng On break-spåret.** Sim-lagret gör det den ska: prep varar
`derivedTimeline.prepEndsAt` sekunder efter service-start; alla tre roller är
`On break` under prep; live-arrivals är omöjliga under prep. DevPanels
`waiting=`-forecast och `service=`-remaining är utsignaler observatören
läste in mer i än de bär.

Om läsbarhetsfrågan (§6 slutstycket) ska adresseras — det är egen order.
Beroenden: ingen kod ändras här, ingen registerrad väntar på beslut,
On break-spåret behöver inte hållas öppet.

---

## 8. DoD

1. Grundorsak fastställd med tal — talvärden ligger i `prep-gate-audit.json`
   som skriptet skrev, rapporten citerar filnamn + fält per ORDER 160.
2. Ingen produktionskod rörd (endast dokumentation + verifieringsskript +
   report-JSON).
3. Ingen tröskel kalibrerad.
4. Verifieringsskript importerar `derivePhase` + `deriveStaffAction` från
   produktionsmodulen (ingen replikering).
5. Registerpost i samma commit.

---

## 9. Filer

- `frontend/scripts/order169-prep-gate-audit.mjs` — verifieringsskript.
  Bundlar `deriveActions.ts` via esbuild och probear `derivePhase` +
  `deriveStaffAction` vid nio elapsed-punkter för ett ölkrogen-lunchpass.
  Läser konstanter via regex mot källfilerna. Skriver
  `frontend/reports/order169/prep-gate-audit.json`.
- `frontend/reports/order169/prep-gate-audit.json` — produktion-verifierade
  tal + källrad-citeringar + probe-serie.
- `frontend/reports/order169/deriveActions.bundle.mjs` — esbuild-artefakt
  (transpilerad produktionsmodul). Regenereras av skriptet.
- `documentation/architecture/ORDER_169_ON_BREAK_UTREDNING.md` — denna text.
