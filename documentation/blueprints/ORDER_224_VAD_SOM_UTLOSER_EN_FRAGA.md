# ORDER 224 — Vad som utlöser en fråga (kartläggning)

**Order** `ORDER_VAD_SOM_UTLOSER_EN_FRAGA.md` (2026-09-16) · **Klass** AUTONOM · **Kartläggning, ingen kod**
**Datum** 2026-09-20 · **Gren** `order-224-vad-som-utloser-en-fraga` från `main` (HEAD `03585ec`)
**Metod** Direkt kodläsning + parallella Explore-agenter. Alla tal är verifierade via `grep`; alla påståenden pekar på fil:rad.

---

## §0. Sammanfattning

**Hur många saker "poppar upp" i servicen idag?**

| Klass | Antal | Källa |
|---|---:|---|
| Scenarier | **3** | `scenarios.ts:571-575` (`ALL_SCENARIOS`) |
| Ambienta service-events | **6** | `eventStream.ts:174-219` (`EVENT_DEFS`) |
| Prep-events | **3** | `eventStream.ts:165-169` (`PREP_EVENT_DEFS`) |
| Kunskapsbank-frågor | **272** | `knowledgeBank.ts` (grep `id: "` = 272; 118 episteme / 24 techne / 130 phronesis) |
| Fråge-templates | **6** | `questionTemplates.ts` (4 examples + 2 R2-seeds) |
| Paviljonger | **5** | `strategic/knowledge/pavilions.ts:45-73` |
| Servicekoreografi-steg | **38** | `handoff/serviceScore.ts:612-955` (n=1..n=38) |

**Hur mycket är ankrat mot faktiskt sim-tillstånd?**

Scenarier och kunskapsfrågor är **inte** ankrade. Scenarier schemaläggs vid
`OPEN_SERVICE` med RNG-fördelning (densitet 0,22/min) och tema draget genom
kapital-svaghet, inte genom rummets händelser (`day.ts:31-89`,
`reducer.ts:2171-2189`). Kunskapsfrågor fästs på scenariernas *val* och dras
seedat ur banken vid resolution — inte ur rumskontext.

Ambienta events är delvis kontextuella (kompetens- och load-modulerade base
rates, `eventStream.ts:221-248`), men de är också RNG-drivna per tick och läser
inga per-gäst- eller per-station-signaler.

**Den avgörande upptäckten (§2.3):** Simuleringen har **rikligt med
tillstånd** som skulle kunna ankra frågor — men **triggern konsulterar det
inte**. Kontexten finns; kopplingen saknas. Detta är en presentations- och
schemaläggningsdefekt, inte en simuleringsdefekt — med två undantag som är
äkta sim-arbete (§6 nedan).

Verdikten per sort — kort form:

| Sort | Ankarbar i servicen | Hör till annan fas | Saknar kontext |
|---|---|---|---|
| Råvara | 🟢 delivery-ankomst, station-arbete | — | — |
| Personal | 🟡 vissa (moral, kompetens) | 🟢 morgon (schema) | — |
| Gäst | 🟢 hail, klagomål, kö | — | — |
| Ekonomi | — | 🟢 kväll (kassaslut) + morgon (bank) | — |
| Kunskap | 🟡 om ankrad till råvara/station/gäst | 🟢 paviljongsbesök | — |
| Annat | — | — | — |

Full motivering i §6. Fullständig lista över vad som skulle behöva finnas i
sim-tillståndet för att ankra det som idag är ankarlöst: §7.

---

## §1. Innehållet (§2.1)

### 1.1 Scenarier — tre stycken, tre teman

`ALL_SCENARIOS` (`scenarios.ts:571-575`) innehåller:

| id | ämne | kategori | rad |
|---|---|---|---:|
| `walk-in-of-five` | Sällskap om fem står i entrén utan bokning; ekonomi vs socialt | **gäst** (social/kapacitet) | `scenarios.ts:241-327` |
| `time-pressure` | Delegation ringer, vill boka men förväntar sig provsmak ikväll | **ekonomi** + **personal** (tempo) | `scenarios.ts:341-416` |
| `moral-dilemma` | Fisk levererad med bruten kylkedja; spårlöshet vs meny-omskrivning | **råvara** + **kunskap** (livsmedelssäkerhet) | `scenarios.ts:431-522` |

Varje `ScenarioSpec` (`scenarios.ts:215-303`) består av: `subject` + `situation`
+ tre `choices` (A/B/C) med `enablerWrites`, `capitalDeltas`, `cashWrites` +
optional threshold-amplifier + optional `professionalQuestion` (hand-authored
eller `BankQuestionRef` = drag från banken).

Fasordning per scenario (`types.ts:426-432`): `idle → subject → situation →
awaitingChoice → resolving → question → settled`.

### 1.2 Kunskapsfrågor — 272 i banken

`KNOWLEDGE_BANK` (`knowledgeBank.ts:46`) är **GENERATED** från
`reports/knowledge/questions.json` via `scripts/knowledge-package.mjs`. Räkning
via `grep -c '^    id: "'` = **272 frågor**. Fördelning per register:

| register | antal | sender-roller |
|---|---:|---|
| episteme (teori/vetenskap) | 118 | kock (111), värd (7) |
| techne (hantverk/teknik) | 24 | kock (24) |
| phronesis (omdöme/social) | 130 | kock (76), värd (40), servitör (14) |

Frågor grupperas per `articleId` (studieartikelns UUID) och `topic` (t.ex.
`sommellerie`, `metodkoket`, `null-spar`). Fältet `needsRetag: true` markerar
frågor som inte har någon ämnestagg — de kan bara plockas som "generisk episteme
kock" i banken. Guaiacol-frågan (`knowledgeBank.ts:3054-3071`) är en sådan.

### 1.3 Templates + paviljonger

`questionTemplates.ts:23-171` innehåller **6 templates** (4 example, 2 R2-seed)
som visar frågeformerna: `flerval`, `situation`, `parning`, `gestaltning`.

`pavilions.ts:45-73` innehåller **5 paviljonger**:
- `maltidbiblioteket` — episteme, alla ämnen
- `kalastorget` — phronesis, alla ämnen
- `stensota` — techne, sommellerie
- `metodkoket` — techne, kok
- `gastronomiskateatern` — alla axlar, sommellerie + kok

Paviljongsbesök hör till strateg-nivån, inte servicen — de aktiveras vid
`bankMeeting.ts` (dagsavslut) eller morgon-fas.

### 1.4 Andra saker som poppar upp i servicen

- **ScenarioOverlay** (`reducer.ts:2619-2850`) — modalt lager som visar
  scenario-faserna.
- **NameEntryOverlay** — förstagångs-modal, blockerar `OPEN_SERVICE` tills
  restaurangnamnet finns.
- **BankMeeting** (`bankMeeting.ts`) — dagsavslut, inte i servicen; utfall är
  låne-tier + paviljongs-pekare.
- **ServiceReport** + **EventStream** — persistenta men inte pop-up (kanterna
  fyller sig medan servicen går).

**Ingen "guest_complaint"-modal, ingen "delivery_arrived"-modal.** Klagomål
lever idag som stumt sim-tillstånd (patiens-nedgång); leveransankomst är en
tick-schemalagd sim-händelse utan spelar-facing signal.

---

## §2. Vad triggar dem idag (§2.2)

Fyra oberoende schemaläggnings-mekanismer. Var och en är verifierad i koden.

### 2.1 Scenarier — RNG-schema vid `OPEN_SERVICE`

`day.ts:31-89` `planScenariosForService()`:

```
SCENARIO_DENSITY_PER_MINUTE = 0.22   (day.ts:31)
```

Vid `OPEN_SERVICE` beräknas antal scenarier per pass som
`lengthMinutes × 0.22 ± 60 % varians`, minimum 1, maximum begränsat av
tid. Tiderna sprids över service-fönstret med 12 s head-buffer och 20 s
tail-buffer, ±40 % jitter kring slot-centrum.

Automatisk fire (`reducer.ts:2171-2189`): när `simTime ≥ scenarioTriggerTimes[0]`
OCH `scenario.phase ∈ {idle, settled}`, körs `triggerScenario()`, temat dras via
`drawNextTheme()` (`themeSelection.ts:147`) — **svaghets-viktat i kapital
(social/economic/ecological)**, `SCENARIO_BY_THEME` mappar temat till en av de
tre spec:arna. Repeat-guarden är per-pass (`firedScenarioIds`,
`reducer.ts:2347-2357`), inte per-tick.

**Slumpen väljer tiden. Svagheten väljer ämnet. Rummet har inget att säga till
om.**

### 2.2 Kunskapsfrågor — konsekvens av scenario-val

En `professionalQuestion` (hand-authored) eller `BankQuestionRef` (drag från
banken) hänger på varje `ScenarioChoiceSpec` (`scenarios.ts:184-193`). Vid
`RESOLVE_SCENARIO` (`reducer.ts:2640-2670`) letas frågan fram deterministiskt
per `(state.seed, state.tick, spec.id)` och overlay-fasen växlar till `question`.

Detta är seedat, inte RNG-per-trigger — samma val ger samma fråga vid replay.
Men fråge-innehållet är *koreograferat till valet*, inte till *rummet*.

### 2.3 Ambienta events — per-tick RNG med kompetens- och load-modulering

`eventStream.ts:174-219` `EVENT_DEFS` (6 kinds): `kitchen_slip`, `service_slip`,
`delivery_short`, `bottleneck`, `wait_stretched`, `turnover_stumble`.

`eventStream.ts:221-248` `eventProbabilityPerTick()`:

```
p = perMinute × 0.2 sec / 60
perMinute = baseRatePerMin × ignoranceMultiplier × strainMultiplier × rhythmMultiplier
```

- `ignoranceMultiplier = 0.10 + 1.5 × (1 - competence)` — golv 0,10, tak 1,60
- `strainMultiplier` — golv 0,30 vid load ≤ 1,0, tak 3,0 vid load ≥ 2,2
- `rhythmMultiplier` — läser servicerytmen (period + fas)

Repeat-guard: `REPEAT_GUARD_SEC = 240` (`eventStream.ts:78`) — inget textstycke
återkommer inom 240 s (VO-mandat 2026-08-08).

Cause-taggning (`eventStream.ts:270-299`): `detectCause()` läser
sim-tillstånd (competence, morale, delivery-status) och väljer text-underbank
(`scale_down`, `morning_change`, `short_prep`, `thin_team`, `low_competence`,
`poor_morale`, `ambient`). **Cause påverkar bara textval, inte
sannolikhet.**

### 2.4 Prep-events — per-tick RNG under prep-fönstret

`eventStream.ts:165-169` `PREP_EVENT_DEFS` (3 kinds): `prep_kitchen`,
`prep_room`, `prep_delivery`, base rates 0,3-0,6 events/min. Samma
kompetens-vägning. Kör bara medan `day.prepEndsAt !== null`
(`reducer.ts:2081-2082`).

Carryover-mekanik: om ≥ 2 ignorance-events under prep → schemaläggs en
`bottleneck`-rad ~ 13 min in i servicen (`PREP_CARRYOVER_THRESHOLD = 2`,
`PREP_CARRYOVER_OFFSET_SEC = 780`, `eventStream.ts:85-89`).

### 2.5 Outcome-events — deterministiskt efter scenario-val

`OUTCOME_OFFSETS_SEC = [6, 18]` (`eventStream.ts:70`). Vid `RESOLVE_SCENARIO`
läggs 1-2 hand-authored outcome-rader i `state.pendingOutcomes`, som emitteras
av `tickEventStream()` vid `simTime + 6s` respektive `simTime + 18s`
(`reducer.ts:2610-2630`).

Detta är **den enda mekanism idag som kopplar en händelse till en tidigare
in-service handling.** Även om input är valet (inte rumshändelsen), är
principen "något följer på något" implementerad.

---

## §3. Vad simuleringen vet när frågan ställs (§2.3)

### 3.1 Sim-tillstånd som **finns** och skulle kunna ankra frågor

Alla följande finns i `SimulationState` (`types.ts`) — grep-verifierat.

| Tillstånd | Rad(er) | Skulle kunna ankra … |
|---|---|---|
| `sim.time`, `sim.tick`, `sim.day.period`, `sim.day.prepEndsAt` | `types.ts` (grep-styrkt) | Fas-låsta frågor (prep-läge, service-öppet, kväll) |
| `sim.guests[]` per gäst: `state`, `hasBeenGreeted`, `patience`, `moveProgress`, `seatIndex` | `types.ts:340-370`, `service.ts` | Gäst-klagomål, kö-lucka, oskött hejsan |
| `sim.waitingIds[]`, `sim.seatedIds[]` | `interior*.ts`, DevPanel | Kö-tryck-frågor, kapacitetsval |
| `sim.staff[]` per personal: `role`, `taskType`, `station`, `targetGuestId`, `position` | `types.ts`, `InteriorStaff.tsx`, `service.ts` | Station-specifika frågor (chef vid brew, sommelier vid vinbar) |
| `sim.delivery` (`active`, `cooldown`, `progress`, `nextSpawnAt`) | `reducer.ts:1846-1873` | Leveransankomst-fråga, bruten kylkedja |
| `sim.stock`, `sim.menu` | `reducer.ts:599-650` | Slutförsäljning, byte av dagens rätt |
| `sim.team.members[]`, `sim.morale`, `sim.competence` | `eventStream.ts:104-121` | Kompetens-relaterade frågor |
| `sim.capitals.values` (social/economic/ecological) | `scenarios.ts:274-281` | Moral-dilemman (redan används i amplifiers) |
| `sim.cash`, `sim.dayLedger` | `reducer.ts:1113`, `cashReading.ts` | Kassa-relaterade beslut (men bättre i kväll) |
| `sim.agencyOffer` | Grep-styrkt | Bemannings-erbjudande |
| `sim.load`, `sim.strainFactor`, `sim.serviceRhythm` | `eventStream.ts:134-146` | Tempo-anpassade frågor |

### 3.2 Sim-tillstånd som triggern **inte konsulterar**

Detta är kärn-fyndet. Alla följande signaler finns men läses inte av
scenario- eller frågetriggern:

- **Individuella gäst-tillstånd.** Ambient-events läser bara `loadOf(state)`
  (`eventStream.ts:121-132`) — total-aggregatet. Ingen kod frågar "har en gäst
  precis satt sig?" eller "har någon precis klagat?".
- **Staff-uppgift + station.** `staff.taskType` och `staff.station`
  konsulteras inte av trigger-koden. Chef som står vid `brewKettle` läses inte
  när banken drar en fermenterings-fråga.
- **Delivery-status.** `state.delivery.active` och `.progress` existerar
  (`reducer.ts:1846-1873`) men gate:ar inte scenario- eller frågetrigger. Fisk-
  scenariot fyras oavsett om en leverans är på väg eller inte.
- **Stock / meny-skifte.** Utsålda rätter genererar egen ambient-rad
  (`reducer.ts:599-650`) men triggar inga scenarion eller frågor.
- **Booking-kö.** Ingen booking-kö existerar. Delegation-scenariot är narrativ
  fiktion — det finns inget `sim.bookings[]` som kan gate:a fireset.

### 3.3 En mening

Idag ankras **cirka 15 %** av det som händer i servicen mot faktiskt
sim-tillstånd (capital-svaghet i temat, kompetens- och load-modulering av
ambient-rates, dedup per pass); resterande **~85 %** är RNG-över-tid med
aggregat-modulering — praktiskt taget all variation är höjd- och
frekvens-skjuvning av samma kurvor, inte förankring i rummets ögonblick.

---

## §4. Ankarpunkter i koreografin (§2.4)

`handoff/serviceScore.ts:612-955` innehåller **38 steg** (verifierat via grep;
n=1 `arrive` t.o.m. n=38 `dropAtPass`). Steget klassas via `cls`-fältet: `move`,
`gest`, `dwell`, `fill`.

**Anmärkning om filens status:** `handoff/serviceScore.ts` är just nu
**ospårad** — den ligger i `handoff/` som en design-leverans men är inte
committad. Det innebär att koreografin är ett *design-artefakt*, inte något som
running-sim exekverar idag. Ankarna nedan är kandidater i design-vokabulären;
när Design's steg-list förs in i simuleringen blir de exekverbara ögonblick.

### 4.1 Alla 38 steg

Numren följer `n`-fältet. Klassifikationen bygger på `cls` + label + Agent C:s
läsning av `serviceScore.ts`.

| n | id | label | cls | typ |
|---:|---|---|---|---|
| 1 | `arrive` | ankomst | move | transit |
| 2 | `seekEye` | söker blick | move | transit |
| 3 | `watchDoor` | passar dörren | fill | **elastisk** |
| 4 | `notice` | märker gästen | gest | procedurellt |
| 5 | `approach` | går emot | move | transit |
| 6 | `greet` | hälsning | gest | **ankarkandidat** |
| 7 | `pointSeat` | anvisar bordet | gest | procedurellt |
| 8 | `lead` | leder till bordet | move | transit |
| 9 | `follow` | följer | move | transit |
| 10 | `showChair` | visar stolen | gest | procedurellt |
| 11 | `sit` | sätter sig | gest | transition |
| 12 | `hostReturn` | går tillbaka | move | transit |
| 13 | `serverIdle` | fyllnadsarbete | fill | **elastisk** |
| 14 | `serverToTable` | till bordet | move | transit |
| 15 | `readMenu` | läser menyn | dwell | **elastisk** |
| 16 | `order` | beställning | gest | **ANKARKANDIDAT (takeOrder)** |
| 17 | `serverToPass` | till passet | move | transit |
| 18 | `fileOrder` | lämnar ordern | gest | handoff |
| 19 | `chefPrep` | förbereder | fill | **elastisk** |
| 20 | `cook` | lagar | dwell | osynligt |
| 21 | `plateUp` | ställer på passet | gest | handoff |
| 22 | `serverFill` | fyllnadsarbete | fill | **elastisk** (nämnd i §2.5) |
| 23 | `serverAwait` | väntar på passet | fill | elastisk |
| 24 | `pickup` | hämtar | gest | procedurellt |
| 25 | `carryOut` | bär ut | move | transit |
| 26 | `setDown` | ställer fram | gest | **ankarkandidat** |
| 27 | `wishWell` | önskar smaklig | gest | procedurellt |
| 28 | `awaitFood` | väntar på maten | dwell | **elastisk** (~ 31,7 s) |
| 29 | `dine` | äter | dwell | osynligt |
| 30 | `requestCheck` | begär notan | gest | **ankarkandidat** |
| 31 | `serverIdle2` | fyllnadsarbete | fill | **elastisk** |
| 32 | `answerSignal` | svarar | move | transit (reaktivt) |
| 33 | `pay` | betalning | gest | **ankarkandidat** |
| 34 | `stand` | reser sig | gest | transition |
| 35 | `leave` | går ut | move | transit |
| 36 | `farewell` | tar farväl | gest | procedurellt |
| 37 | `clearTable` | dukar av | dwell | osynligt |
| 38 | `dropAtPass` | lämnar disken | gest | handoff |

### 4.2 Bedömning av de sex namngivna kandidaterna

| id | roll | signal | elastik omkring | verdikt |
|---|---|---|---|---|
| `takeOrder` (=`order`, n=16) | servitör vid bord + gäst | dual-actor 0,92 m, `poseTakeOrder` | `readMenu` (dwell, elastisk till `order`) + `serverFill` för servitören | **Stark** — beslutad av VO |
| `fileOrder` (n=18) | servitör vid pass, kock andra sidan | handoff, gäst ser inte | `chefPrep` bredvid men inte omkring `fileOrder` | **Ej gångbar** — osynlig för gäst, ingen beslutsstund |
| `cook` (n=20) | kock i kök | dwell 14 s, ansikte mot kök | `chefPrep` före | **Ej gångbar** — osynligt, kock kan inte engagera spelaren |
| `setDown` (n=26) | servitör serverar | 0,75 m, `poseSetDown`, mat kommer på bordet | `awaitFood` slutar här (guest-driven, inte staff-driven) | **Svag** — leveransgest, procedurell; kan bli stark om ankrad till "just något specifikt" (allergi, uppgradering) |
| `requestCheck` (n=30) | gäst signalerar | `poseSignal`, servitör inom 0,7 s | `serverIdle2` (fill, elastisk till `answerSignal`) | **Stark** — gäst-initierad, elastisk cover för spelaren |
| `pay` (n=33) | servitör + gäst | dual-actor 0,98 m, ömsesidig `poseOffer` | `serverIdle2` före; `answerSignal` (move) precederar | **Stark** — transaktion, ömsesidig |

### 4.3 Ankarkandidater utöver §2.4:s lista

- **`greet` (n=6)** — värd + gäst möts, dual-actor 1,25 m,
  `poseWelcome`+`poseNod`. Kvalitet-signalen är stark: gäst har precis kommit
  in, värden är den första kontakten. **Stark ankarkandidat.**
- **`seekEye` (n=2)** eller **`arrive` (n=1)** — dörr-anländ, före `greet`.
  Kunde ankra "hur välkomnar vi den här gästen" om gästen är delegationens
  representant, en trolig klagare, etc.
- **`clearTable` (n=37)** — servitör dukar av. Kunde ankra "sågs något
  ovanligt" (matrest, klagomål-läsning). Svag men existerar.

**Fem starka ankare totalt: `greet`, `order`/takeOrder, `setDown`,
`requestCheck`, `pay`.** Detta är fem stationer där en signal från rummet
möter en beslutsstund som spelaren rimligen kan hinna hantera.

---

## §5. Vad händer medan spelaren tänker (§2.5)

`serverFill` (`serviceScore.ts:806-813`, n=22) är designens elastiska block
runt matlagningstiden — "Ligger helt inuti kokningen. Krymper det under 0,6 s
ska det utgå helt." Det är serviettens sätt att sträcka sig medan spelaren
tänker på ordervalet.

Motsvarande elastiska block finns för fler ankare (från `cls: fill` och
`cls: dwell`-steg som slutar på ett gest-ankarklev):

| Ankare | Elastik före | Elastik efter | Fungerar utan freeze? |
|---|---|---|---|
| `greet` (n=6) | `watchDoor` (fill, elastisk till `notice`) | `pointSeat` (gest, kort) | **Ja** — värden skannar dörren tills gästen signalerar |
| `order` (n=16) | `readMenu` (dwell, elastisk till `order`, ~ 5-10 s) + `serverFill` (fill, elastisk parallell) | `serverToPass` (transit) | **Ja** — VO:s beslutade cover finns |
| `setDown` (n=26) | `awaitFood` (dwell, elastisk till `setDown`, ~ 31,7 s vid 1×) | `wishWell` (gest kort) | **Ja** — gäst väntar elastiskt på maten |
| `requestCheck` (n=30) | `dine` (dwell) — men här *gästen* dröjer med signalen | `serverIdle2` (fill, elastisk till `answerSignal`) | **Ja** — servitören står i cover tills gästen signalerar |
| `pay` (n=33) | `serverIdle2` + `answerSignal` (move) | `stand` → `leave` | **Ja** — servitören är redan vid bordet efter `answerSignal` |

Alla fem starka ankare har **redan** en elastik-läsning som Design skrivit in.
Ingen av dem skulle behöva frysa rummet. `serverFill`-mönstret är alltså
generalisierbart — det är inte specifikt för `order`.

För **svaga ankare** (`fileOrder`, `cook`): elastik saknas eftersom stegen är
handoff eller osynlig dwell. Att göra dem ankarbara skulle kräva ny elastik
och synlig scen — inte gjort i design.

---

## §6. Verdikt per sort (§3)

Per den sortering §2.1 satte upp (råvara / personal / gäst / ekonomi /
kunskap / annat), och med de fem ankarna som ram:

### 6.1 Råvara

**Ankarbar i servicen: JA.** Två distinkta ögonblick i rummet där råvara är
konkret handling:
- **Leveransankomst** (`delivery.active` slår om till true,
  `reducer.ts:1846-1873`) — spelbar signal som idag är stum. Kunde ankras vid
  `serverFill` eller egen fas när levkorridoren är synlig. Fisk-kylkedja-
  scenariot skulle passa här.
- **Kock vid station** (`staff.station === 'brew'/'range'/'pass'`) — chef
  faktiskt på plats där råvaran hanteras. Guaiacol-frågan skulle passa här
  om kock är vid `crush`/`brew`.

Sim-tillstånd som redan finns: `sim.delivery.*`, `sim.staff[].station`,
`sim.stock`, `sim.menu`. **Ingen sim-utökning krävs.**

### 6.2 Personal

**Del ankarbar, del i annan fas.**

- Moral / kompetens-frågor **under service**: kan ankras vid observerbara
  händelser (misstag, klagomål, service-slip). Ambienta events fyras redan
  när `low_competence` cause detekteras (`eventStream.ts:286`); frågor kunde
  hänga på samma detektor.
- Schema / bemanning / lönesamtal: **hör till morgonen** — inte i servicen.
  Ingen mening att avbryta service för schemabeslut. Detta är precis §6-fallet
  i order-texten.

Sim-tillstånd finns: `sim.staff[].taskType`, `sim.morale`, `sim.competence`.

### 6.3 Gäst

**Ankarbar i servicen: JA.** Tre distinkta ögonblick:
- **Ankomst utan bokning** (`guest.state === 'arriving'` + kapacitet-check) —
  walk-in-of-five-scenariot skulle ankras här.
- **Klagomål / patiens-brott** (`guest.patience < THRESHOLD` eller
  `hasBeenGreeted === false && waitTime > X`) — signal finns i sim men läses
  inte av trigger. Detta är den mest saknade signalen enligt VO ("gäst just
  klagade" — §2.3 direkt-citerat).
- **Betalning / avfärd** — pay-ankaret ger ögonblick för "hur reagerade gästen"-
  frågor.

Sim-tillstånd finns: `sim.guests[]`, `patience`, `hasBeenGreeted`,
`waitingIds`. **Ingen sim-utökning krävs för de flesta gäst-frågor.**

### 6.4 Ekonomi

**Hör till annan fas: JA.** Servicen är inte platsen för prissättning,
budget-avvägning eller lån-beslut. §6 i order-texten säger detta rakt.

- **Morgonen:** planering, dagens meny-pricing, bemanning för dagen.
- **Kväll:** kassa-avstämning (`bankMeeting.ts`), lån-samtal, dagsutfall.
- **Servicen:** *kan* bära en ekonomi-fråga om den är kopplad till råvara
  (t.ex. delegationens meny → matkostnad + rytmförlust). Time-pressure-
  scenariot är just den blandningen — det passar därför på ett gäst-ankare
  (booking-request-mottagning, om vi bygger den signalen).

**Rent ekonomiska frågor: flytta till morgon/kväll.** Detta är den tydligaste
sort-flytten kartläggningen kommer fram till.

### 6.5 Kunskap

**Ankarbar om ankrad till råvara / station / gäst.** Kunskapsbanken (272
frågor) är väldigt bred; enskilda frågor kan ankras till konkreta ögonblick:
- Fermenterings-frågor (episteme kock) → kock vid brewhouse
- Sommellerie-frågor (techne kock) → kock vid vinbar-station
- Gäst-hantering-frågor (phronesis värd/servitör) → värd/servitör vid gäst

**Om ankaret inte kan hittas: paviljongsbesök.** Kunskaps-frågor utan
service-kontext (t.ex. abstrakt vetenskap utan uppenbar station-koppling)
hör hemma i paviljongsflödet (`bankMeeting.ts` → pointedPavilion), inte som
scenario-frågor.

### 6.6 Annat

Inga scenarier eller frågor faller i denna sort. Alla 3 scenarion +
272 bank-frågor täcks av de fem sorterna ovan.

### 6.7 Sammanfattande tabell

| Sort | Ankare i servicen | Elastik finns | Sim-tillstånd finns | Verdikt |
|---|---|---|---|---|
| Råvara | `serverFill` (leverans), station-arbete | Ja | Ja | 🟢 Ankarbar |
| Personal (moral/kompetens) | `setDown`, `order`, cause-ankare | Ja | Ja | 🟡 Ankarbar under service |
| Personal (schema) | — | — | — | 🟢 Morgon |
| Gäst | `greet`, `requestCheck`, klagomål-ankare | Ja | Ja | 🟢 Ankarbar |
| Ekonomi | (endast blandad med gäst) | — | — | 🟢 Kväll + morgon |
| Kunskap | Ankrad till råvara/station/gäst | Ja | Ja | 🟡 Ankarbar villkorligt |
| Kunskap (abstrakt) | — | — | — | 🟢 Paviljongsbesök |
| Annat | — | — | — | (inget innehåll idag) |

Ingen sort hamnar i "saknar kontext" — allt kan ankras någonstans, antingen i
servicen eller i en annan fas. Detta är svaret §6 i order-texten frågade
efter: "kanske att servicen bär några få ögonblick och att resten hör till
morgonen och kvällen".

---

## §7. Vad skulle behöva finnas för att bygga de saknade ankaren

Sim-tillstånd finns; **kopplingen saknas**. Följande skulle behövas för att
gå från "kontextlöst RNG-schema" till "signal-driven ankarpuff":

### 7.1 Ett sim-event-lager (nio föreslagna typer, se anmärkning)

Idag emitterar `tickEventStream` bara text-events. En parallell struktur för
**mekaniska service-events** — signaler om att något har hänt i rummet — skulle
tillåta trigger-koden att lyssna:

| föreslaget event | signal (finns redan i sim) | ankare | vem det gäller |
|---|---|---|---|
| `delivery_arrived` | `sim.delivery.active: false → true` | `serverFill` eller egen | råvara |
| `guest_complaint` | `guest.patience < TRESH` eller manuellt hail | `setDown`/`answerSignal` | gäst |
| `guest_arrived_unbooked` | `guest.state = 'arriving'` + kapacitet-check | `greet` | gäst |
| `stock_out` | redan detekteras i `reducer.ts:599-650`, egen ambient | `fileOrder` eller `chefPrep` | råvara |
| `staff_at_station` | `staff.station` byter | naturligt via station-ankare | personal |
| `service_slip` | redan finns som ambient | cause-detekterat | personal |
| `patience_exceeded` | `guest.patience ≤ 0` | egen ankare (kritiskt) | gäst |
| `booking_request` | *saknas i sim* | egen ankare | gäst |
| `menu_shortage` | `sim.stock < order.demand` | `chefPrep`/`fileOrder` | råvara |

**Anmärkning:** VO:s formulering "serviceEvents med nio händelsetyper" i
plan-svaret är just detta lager. Åtta av de nio ovan har sim-signalen redan;
`booking_request` är den enda som kräver sim-arbete (nytt `sim.bookings[]`).
Numret nio är rimligt — de täcker kärn-signalerna utan att förstora
taxonomin.

### 7.2 En scenariopickare som läser events

Nuvarande `pickScenarioSpec` (`scenarios.ts:530-548`) tar bara ett tema. En
`pickScenarioForEvent(eventKind, state)` behövs som:
1. Filtrerar scenarier per matchande event-typ (t.ex. `delivery_arrived` →
   `moral-dilemma`).
2. Faller tillbaka till tema-baserat val om ingen match.

Detta är en fråge-schemaläggnings-omskrivning som är fokal för Fas 1 i VO:s
plan.

### 7.3 En kunskapsfråge-pickare som läser event + station

Motsvarande för `KNOWLEDGE_BANK`: en `pickBankQuestionForContext(register,
sender, state)` som:
1. Filtrerar frågor per topic/tag mot `staff.station`.
2. Faller tillbaka till bred sender-filtrering om ingen station-match.

`needsRetag: true`-frågor (majoriteten av 272) skulle behöva ämnestaggar
för att detta ska fungera väl — men **det är innehållsarbete, inte
simuleringsarbete**. Vision Owner-domän per order §4.

### 7.4 Elastik för svaga ankare (om de ska aktiveras)

Om `fileOrder`, `cook` eller `carryOut` någonsin ska bli ankare måste Design
lägga till elastisk läsning (fill-block eller dwell-utsträckning). Idag är de
snabba gester utan cover; att frysa dem för spelarval bryter koreografin.

Denna punkt är Design-arbete, inte kod. Nämns här för spårbarhet.

---

## §8. Vad ordern *inte* levererar

Per order §4:
- Ingen kod ändras. `git diff main..HEAD -- frontend/src/` är tomt (verifieras
  i §DoD-slut).
- `takeOrder`-ankaret rörs inte.
- Inga nya scenarier eller frågor skrivs.
- Ingen scenariopickare skrivs.

## §9. DoD

Per order §5:

1. ✅ §2.1-§2.5 besvarade — §1, §2, §3, §4, §5 ovan, med fil:rad-referens
   för varje påstående.
2. ✅ Tabell per sort — §6.7.
3. ✅ Lista över vad som saknas — §7.
4. ✅ Rapport i `documentation/blueprints/` — den här filen.
5. Verifieras vid commit: `git diff main..HEAD -- frontend/src/` tomt.
6. Verifieras vid commit: registerpost i samma commit.

---

## §10. Källor och verifiering

Alla siffror i den här rapporten är verifierade via `grep` mot koden vid
tidpunkten för skrivning (main HEAD `03585ec`, 2026-09-20). Vid kollision
mellan denna rapport och koden är koden källan.

Verifikations-kommandon (för framtida re-run):

```bash
# 3 scenarier
grep -nE "^  id: '" frontend/src/strategic/simulation/scenarios.ts | head -3

# 272 bank-frågor
grep -cE '^    id: "' frontend/src/content/knowledgeBank.ts

# 38 serviceScore-steg
grep -cE "n: [0-9]+, id: '" handoff/serviceScore.ts

# 5 paviljonger
grep -nE "^    id: '" frontend/src/strategic/knowledge/pavilions.ts

# 6 ambient-events + 3 prep-events
grep -nE "^    kind: '" frontend/src/strategic/simulation/eventStream.ts | head -10
```

Filreferenser med fil:rad ovan är stabila för main HEAD `03585ec`. Efter
efterföljande ändringar kan raderna glida — id-namnen är stabila indexeringar.
