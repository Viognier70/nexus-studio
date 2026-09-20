# ORDER 227 — ankarmätning under ett fullständigt pass

**Klass:** mätning (ingen sim-kod ändras) · **Datum:** 2026-09-20
**Gren:** `order-227-ankarmatning` från `main` (HEAD `4a6a3ee`)
**Trigger:** VO 2026-09-20 provspel — "Ankarsystemet från ORDER 225 syns inte i provspel. Ingen fråga kom i samband med kockens arbete vid karen."

---

## §0. Kort svar

VO:s tre triage-frågor besvarade:

| Fråga | Svar | Data |
|---|---|---|
| 1. Ankaret aktiveras aldrig? | **Delvis.** 4 av 5 ankaren fyrar 85–89 ggr/pass. `setDown` fyrar noll ggr — dead mapping. | Se §2 |
| 2. Ankaret aktiveras men inget scenario matchar taggen? | **Ja, som förväntat.** Inget scenario har någon anchor-tag idag. | Se §3 |
| 3. Scenariot väljs men presenteras vid fel tidpunkt? | **Nej — och det är själva pointen.** De 2 scenarier som fyrade under passet fyrades av RNG-schemat, inte av ankaren. Ingen anchor→scenario-koppling existerar. | Se §3 |

**"Hur många av de fem ankrade scenarierna dök upp under passet?"** Frågan är
felformulerad: ORDER 225 (Fas 1) ankrade *ankaren* (fem observabla moments),
inte *scenarier*. Nolla scenarier är anchor-anslutna. Kopplingen finns inte;
det är Fas 2 (event-lager + `pickScenarioForEvent`), som inte är byggd.

**Chefs arbete vid karen** är inte något av ORDER 225:s fem koreografi-
ankaren — det är ett `staff_at_station`-event enligt ORDER 224 §7 (Fas 2,
sim-arbete, egen order per händelse).

---

## §1. Metod

`frontend/src/strategic/simulation/__tests__/order227AnchorMeasurement.test.ts`
kör en 15-min dinner via reducer-driven tick-loop (5 Hz, dt=0.2 s ⇒ 4 500
ticks). Seed=42. Setup: `SET_POLICY` (medel + grund) → `SKIP_LUNCH` →
`OPEN_SERVICE(dinner, 15 min)`. Auto-resolver simulerar en engagerad
spelare (`ADVANCE_SCENARIO_TO_SITUATION` → `RESOLVE_SCENARIO(A)` →
`ANSWER_QUESTION(0)`) så scenarion inte fastnar och blockerar auto-firen.

Per tick samplas `deriveActiveAnchors(state)` och `countActiveAnchors(state)`.
Scenariotransitioner spåras separat. Utdata:

- `frontend/reports/order227-anchor-measurement/anchors-timeline.json` —
  aggregerad summary + tidsserie (icke-noll-frames + var 10:e-sek-heartbeat).

Ingen sim-kod ändras. Diagnostisk test som producerar mätdata.

---

## §2. Fynd 1 — ankar-aktivering per pass (seed=42, 15 min dinner)

| Ankare | Fires (distinkta) | Frames aktivt | Sim-sekunder aktivt |
|---|---:|---:|---:|
| `greet` | **89** | 435 | 87,0 |
| `order` | **86** | 1 111 | 222,2 |
| `setDown` | **0** ⚠️ | 0 | 0,0 |
| `requestCheck` | **85** | 1 321 | 264,2 |
| `pay` | **85** | 2 125 | 425,0 |
| **Total** | **345 fires** | 3 022 frames med ≥ 1 ankare (67,2 % av passet) |

- 85 gäster hann fullborda ett besök under passet (`completedGuests: 85`).
- 4 av 5 ankare fyrar ungefär en gång per gäst. Systemet fungerar.

**Anomali: `setDown` fyrar 0 gånger.**

**Rotorsak:** ORDER 225 mappade `setDown` till `staff.taskType === 'serve'`.
Men `findTaskTarget('serve')` (`service.ts:1095-1099`) söker gäster med
`state === 'seated' && stateTime > 6`. I restaurangflödet transitionerar
seated → ordering redan vid `stateTime > 4` (`service.ts:408-411`). Villkoret
`seated && stateTime > 6` är alltså aldrig sant för restaurang/värdshus. `serve`-
tasken har en dead branch för with-seats-klasser.

I foodtruck-flödet är villkoret också dead — foodtruck går ordering → serving
→ paying utan att någonsin passera `seated` (`service.ts:1235-1237`). `serving`
är dessutom staff-oberoende (inget task fyras för den fasen).

**Konsekvens för Fas 1:** ORDER 225:s `setDown`-anchor är ansluten till en död
sim-signal. Fix skulle vara att mappa om `setDown` till en signal som faktiskt
fyrar — t.ex. `guest.state === 'dining' && (simTime - stateTime) < THRESHOLD`
("just fått maten"). Detta är dock **inte i scope för ORDER 227 (mätning)**;
det är en ORDER 225-uppföljning i egen ordning.

Detta är sextonde/sjuttonde fallet av "rätt tal om fel sak"-kedjan från
CLAUDE.md: ORDER 225:s tester passerade eftersom de använde fixtures som
matchade mappningen; ingen test kollade om mappningen fyrar under riktigt
sim-flöde. Kartläggningen ORDER 224 §4 klassificerade `setDown` som "svag
ankarkandidat" — det svaghets-omdömet visar sig nu i mätning: mappningen är
inte bara svag, den är död.

---

## §3. Fynd 2 — scenarier under samma pass

Under samma 15-min dinner:

- **Planerade scenarier:** 2 (via `planScenariosForService`, densitet 0,22/min)
- **Fyrade scenarier:** 2 av 2
- **Fyrade scenario-ids:** `walk-in-of-five` (kl. 439,4 s), `moral-dilemma`
  (kl. 768,2 s)
- **`time-pressure` fyrades INTE** — precis som ORDER 226 (Fas 3) designade:
  `phase='morning'` filtreras bort av auto-firen.

Fas-transitioner för första scenariot (`walk-in-of-five`, seed=42):

```
439,4 s  idle → subject         (drawnTheme=social)
439,6 s  subject → situation
439,8 s  situation → question   (efter auto-RESOLVE_SCENARIO A)
440,0 s  question → resolving   (efter auto-ANSWER_QUESTION 0)
474,8 s  resolving → settled    (efter SCENARIO_SETTLE_AFTER ~35 s)
```

**Kritiskt fynd: koppling till ankaren är noll.** `pickScenarioSpecFiltered`
läser bara `SustainabilityKey`, `firedIds`, `avoidOpenerId` och (från ORDER
226) `phase`. **Inget scenario har en anchor-tag; ingen picker läser
anchor-info; ingen anchor-transition dispatchar ett scenario.** De 2 scenarier
som fyrar gör det via `scenarioTriggerTimes` (RNG-schema från `OPEN_SERVICE`),
oberoende av rummets ögonblick.

`walk-in-of-five` fyrade kl. 7 min 19 s in i servicen, med 21 gäster i rummet.
Det var ingen doorway-händelse just då som utlöste — bara att slot-tiden
kommit. Det är precis vad ORDER 224 §2 beskrev som "acontextual".

---

## §4. Vad mätningen INTE svarar på

- **Foodtruck-flöde.** Testet körs mot default businessClass (restaurang).
  Foodtruck har annan state-graph (ordering → serving → paying, inga seats)
  och skulle sannolikt ge andra siffror — särskilt att `order` fyrar mindre
  och `pay` fyrar direkt efter `serve` med kort gap. Egen mätning om det
  behövs.
- **Andra seeds.** Bara seed=42 mätt. Antal spawnade gäster och exakta fires
  varierar per seed; storleksordningen (∼85 gäster per 15-min dinner)
  är stabil.
- **Chefs arbete vid karen.** Ingen station-signal i ORDER 225:s ankare —
  `staff.taskType` reflekterar gäst-riktade tasks, inte station-lokala
  bakgrundsuppgifter. Kockens brew/prep-arbete syns idag i `misEnPlace`/
  `dish`/`restock`/`clean`-tasks (bg-tasks per ORDER 213). Att koppla en
  fråga till stationssarbete är Fas 2 `staff_at_station`-event enligt ORDER
  224 §7 (åtta av nio föreslagna sim-events har redan signaler i sim;
  station-taggen kommer via `staff.station`, som existerar men inte läses av
  någon trigger).

---

## §5. Rekommendationer (för VO att välja mellan)

1. **`setDown`-anchor uppdateras.** ORDER 225:s mappning är död för både
   restaurang och foodtruck. Ny mappning:
   `guest.state === 'dining' && (simTime - stateTime) < 3 s` ("just fått maten")
   — eller `guest.satisfaction` som tar ett hopp vid dining-inträdet
   (`service.ts:1255-1256`). Egen order.
2. **Fas 2 för `staff_at_station`.** Om VO vill se en fråga i samband med
   kockens brew-arbete är det den händelsen som ska byggas — och sedan
   ett scenario/kunskapsfråga taggat mot brewhouse-station som fyras när
   staff når stationen. Cirka det som ORDER 224 §7 planerade.
3. **Fas 2 för `guest_complaint`** (VO:s prio 1 av 9 från plan-svaret).
   Även när ankaren fungerar (som `requestCheck` gör här — 85 fires) finns
   inget scenario som fyras av dem. Det är den kopplingen som saknas.

Ingen av dessa är i scope för ORDER 227.

---

## §6. DoD

- ✅ Mätning körd, seed=42, 15-min dinner.
- ✅ Rapport skriven i `documentation/blueprints/`.
- ✅ Rådata i `frontend/reports/order227-anchor-measurement/anchors-timeline.json`
  (per ORDER 160-regeln — talen i den här rapporten läses ur skriptets utdata).
- ✅ Diagnostisk test i `__tests__/order227AnchorMeasurement.test.ts` grön;
  kan köras om vid framtida ändringar av sim-flöde.
- ✅ Registerpost i samma commit.
- Ingen ändring till sim-kod: `git diff main..HEAD -- src/` innehåller endast
  det nya test-filen + två små ändringar i `scenarios.ts`/`reducer.ts`? Nej —
  ingen sim-kod ändras, endast ny testfil tillagd.

---

## §7. Källor

- `frontend/src/strategic/simulation/anchors.ts` — ORDER 225:s ankar-derivation.
- `frontend/src/strategic/simulation/service.ts:1034-1128` — `findTaskTarget`.
- `frontend/src/strategic/simulation/service.ts:408-429` — guest-state-transitioner.
- `frontend/src/strategic/simulation/scenarios.ts` — scenario-specs + phase-filter.
- `frontend/src/strategic/simulation/reducer.ts:2171-2205` — auto-fire (post-ORDER 226).
- `frontend/reports/order227-anchor-measurement/anchors-timeline.json` — mätdata.

Alla siffror i den här rapporten läses direkt ur mätfilen (`summary`-blocket)
och kan verifieras genom att köra om testet:

```bash
cd frontend && npx vitest run src/strategic/simulation/__tests__/order227AnchorMeasurement.test.ts
```
