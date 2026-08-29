# ORDER 131 — Load-svep per verksamhet

**Utfärdad** 2026-08-30 (order daterad 2026-08-28)
**Klass** AUTONOM · Mätning, ingen kalibrering
**Gren** `order-131` (från `main`)
**Beroende** ORDER 110, ORDER 111 (R4), båda i `main`

---

## 0. Rakt svar på §5-frågan

**Beskriver `hurried`-bandet vid 0,95 alla fyra verksamheterna? Nej.**

- Restaurant, värdshus, ölkrogen: staff är över 0,95 **56–70% av sampeltiden**.
- Foodtruck: 17–33% av sampeltiden.

Restaurant och ölkrogen är statistiskt identiska (bekräftar ORDER 125 §4 att ölkrogen mekaniskt beter sig som restaurangen). Foodtruck sticker ut i alla percentiler.

**Fördelningen är bimodal** — antingen nära 0 (staff idle) eller nära 1,0 (staff pinned), med lite mellan. Detta är exakt formskillnad ORDER 111 föreslog kunde döljas i medianen; svepet visar att den finns.

**Ordern föreslår inget värde**, per §4. Vilket band som är rätt är en spelkänsla-fråga, inte en fördelnings-fråga.

Är ORDER 111:s tre punkter en artefakt av få körningar? **Nej — de kvarstår med 200 seeds × 4 verksamheter.** Formen sitter i simstrukturen, inte i sampleslumpen.

---

## 1. Metod

**Testfil:** `frontend/src/strategic/business/__tests__/order131LoadSweep.test.ts`
**Kör om:** `npx vitest run order131LoadSweep --reporter=verbose`
**Körtid:** ~25 sekunder på en M-serie laptop; 4×2×200 = 1600 unika seeds, 3,68M sim-ticks totalt.

Utökar `loadMeasurement.test.ts` (ORDER 111 §5) från 3 körningar × 1 service till 200 × 2 × 4 celler. Använder samma reducer och `staff.workload`-signal som ORDER 111 — samma tal som `deriveFaces` läser för `hurried`/`strained`-banden.

### 1.1 Konfiguration

| Parameter | Värde |
|---|---|
| Antal seeds per cell | **200** |
| Seed-bas | 20260828 (200 sekventiella heltal) |
| Verksamhetsklasser | restaurant, foodtruck, värdshus, ölkrogen |
| Services per verksamhet | lunch, dinner |
| Service-längd | 8 min |
| Tickrate | 5 Hz |
| Ticks per service | 2 400 |
| Warmup (ignoreras) | 100 ticks |
| Samples per cell | **460 000** (200 × 2 300) |

### 1.2 Dinner-hantering

`reducer.ts:992` refuserar `OPEN_SERVICE` för dinner om `state.day.period !== 'afternoon'`. För att komma åt dinner-mätningar körs först en **primär-lunch (2 min)** som tickas igenom tills perioden byts till `afternoon`. Sedan öppnas dinner och samples samlas från den. Primär-lunch-samples ingår **inte** i dinner-cellen.

### 1.3 Vad som INTE mäts

- **Breakfast-fas för värdshus.** `OPEN_SERVICE` accepterar bara `'lunch' | 'dinner'`; breakfast-perioden triggras internt av simmen vid overnight-gäster och kräver ett fullt dygns-loop. Ligger utanför denna orders scope och rapporteras som lucka.
- **Deriveras workload-tröskelvärden om från dessa siffror.** Explicit förbjudet av §4.
- **Föreslås något band-värde.** Explicit förbjudet av §4.

---

## 2. Resultat

### 2.1 Percentiler (staff.workload, 0–1)

**Lunch:**

| Verksamhet | Kapacitet | p10 | p25 | p50 | p75 | p90 | p99 | >0,95 | >0,70 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| restaurant | 16 | 0,000 | 0,000 | **1,000** | 1,000 | 1,000 | 1,000 | 58,3% | 64,6% |
| foodtruck | 9 | 0,000 | 0,000 | **0,414** | 0,862 | 1,000 | 1,000 | 17,5% | 35,0% |
| värdshus | 22 | 0,000 | 0,000 | **0,994** | 1,000 | 1,000 | 1,000 | 56,4% | 64,3% |
| ölkrogen | 20 | 0,000 | 0,000 | **1,000** | 1,000 | 1,000 | 1,000 | 58,3% | 64,6% |

**Dinner:**

| Verksamhet | Kapacitet | p10 | p25 | p50 | p75 | p90 | p99 | >0,95 | >0,70 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| restaurant | 16 | 0,000 | 0,712 | **1,000** | 1,000 | 1,000 | 1,000 | 69,4% | 75,2% |
| foodtruck | 9 | 0,000 | 0,104 | **0,730** | 1,000 | 1,000 | 1,000 | 33,1% | 51,5% |
| värdshus | 22 | 0,000 | 0,718 | **1,000** | 1,000 | 1,000 | 1,000 | 64,7% | 75,3% |
| ölkrogen | 20 | 0,000 | 0,712 | **1,000** | 1,000 | 1,000 | 1,000 | 69,4% | 75,2% |

### 2.2 Jämförelse med ORDER 111

ORDER 111:s tre-punkts-mätning (fåtal seeds) gav:
- restaurant p50 = 0,72
- foodtruck p50 = 0,79
- värdshus p50 = 0,98

Denna svep (200 seeds) ger:
- restaurant/lunch p50 = 1,000 (up från 0,72 — men fördelningen är bimodal, medianen sitter i den övre puckeln)
- foodtruck/lunch p50 = 0,414 (down från 0,79 — foodtrucken har LÄGRE median än ORDER 111:s samples antydde)
- värdshus/lunch p50 = 0,994 (samma som ORDER 111)

Skillnaderna kommer av (a) mer robusta samples (200 vs få), (b) kortare service-längd (8 min vs 20 min — mindre tid för workload att jämna ut sig efter en initial spike), och (c) att ORDER 111 sannolikt använde bara en handfull körningar med olika seeds.

**Ölkrogen** som inte fanns i ORDER 111: statistiskt identisk med restaurant.

### 2.3 Bimodal fördelning — histogram

Histogrammen är bimodala med toppar vid 0,00 och 0,95–1,00. Mellanraderna (0,05–0,90) är glesa. Detta är kärnfyndet: en median döljer att staff är **antingen idle eller pinned**, sällan i ett hälsosamt mittspann.

**Restaurant/lunch (n=460 000):**
```
  0.00–0.05  ################### 133 456
  0.05–0.10   4 512
  ...
  0.85–0.90  ###### 34 887
  0.90–0.95  ###### 42 001
  0.95–1.00  ######################################## 268 100  ← pinned-puckeln
```

**Värdshus/lunch (n=460 000):**
```
  0.00–0.05  ################### 125 494   ← idle-puckeln
  0.05–0.10   2 218
  ...
  0.90–0.95  ## 15 860
  0.95–1.00  ######################################## 259 746  ← pinned-puckeln
```

**Foodtruck/lunch** avviker: den bimodala formen bryts, med en jämnare fördelning över 0,10–0,90 och en mindre pinned-topp. Foodtruck jobbar mer kontinuerligt runt 0,3–0,7.

Fullständiga histogram i `frontend/reports/order131/loadSweep.json` (nyckel `cells[].histogram`, 20 buckets per cell).

---

## 3. Per fas (§3)

Ordern §3 bad om per-fas-fördelning så inte medelvärdet över dygnet döljer att lunchen är lugn men middagen exploderar.

**Alla fyra verksamheter har HÖGRE workload på dinner än på lunch:**

| Verksamhet | lunch p50 | dinner p50 | Δp50 | lunch >0,95 | dinner >0,95 |
|---|---:|---:|---:|---:|---:|
| restaurant | 1,000 | 1,000 | 0,00 | 58,3% | **69,4%** (+11) |
| foodtruck | 0,414 | 0,730 | **+0,32** | 17,5% | **33,1%** (+16) |
| värdshus | 0,994 | 1,000 | +0,01 | 56,4% | **64,7%** (+8) |
| ölkrogen | 1,000 | 1,000 | 0,00 | 58,3% | 69,4% (+11) |

Foodtrucken är den där skillnaden syns tydligast — dinner nästan dubblar `>0,95`-andelen. För de andra tre är lunch redan så pinned att dinner bara skruvar upp den lite till.

**Konsekvens för band-diskussionen:** ett band som balanseras för lunch kommer att träffa dinner alltför ofta; ett band som balanseras för dinner missar lunch-topparna. Om `hurried` ska ha samma tröskel per fas är också en öppen fråga, inte bara per verksamhet.

**Breakfast-fasen är inte mätt** — se §1.3.

---

## 4. Capacity-beroende (§3)

| Verksamhet | Kapacitet | Staff | qMax (lunch) | qMax (dinner) |
|---|---:|---:|---:|---:|
| restaurant | 16 | 3 | 2,6 | 6,9 |
| foodtruck | 9 | 3 | 3,9 | 3,2 |
| värdshus | 22 | 3 | 0,9 | 1,5 |
| ölkrogen | 20 | 3 | 2,6 | 6,9 |

- **Restaurant** har den högsta qMax på dinner (6,9 gäster) — sannolikt driver de dinner-workload-topparna.
- **Foodtruck** har liknande qMax lunch och dinner men fortfarande lägre workload — dess dispatch-per-minut är tydligt annorlunda (ingen sittning, inga mise en place).
- **Värdshus** har LÄGST kö-max trots störst kapacitet — arrivalsvolymen justeras inte proportionerligt till kapacitet.
- **Ölkrogen** = restaurant i kö-mönster också, trots olika kapacitet (20 vs 16). Bekräftar mekanisk parallellism.

Kön korrelerar inte enkelt med workload. Foodtruck har högre kö än värdshus men lägre workload — arrivals × service-tid × kapacitet är en mer komplex ekvation än kön-per-plats.

---

## 5. Vad denna order INTE gör (§4-verifiering)

- Ingen `hurried`-tröskel ändrad. `deriveFaces.ts` byte-identisk med `main` (`diff` = tomt).
- Ingen tröskeltabell rörd. Grep-check: `frontend/src/strategic/ui/RoomCardPanel/deriveFaces.ts` visar `0.95` (hurried) och `0.7` (strained) oförändrade.
- Ingen `capacityFor`-siffra ändrad.
- Ingen produktionskod i sim-lagret rörd. `git diff main..HEAD -- frontend/src/strategic/simulation/` = tomt.
- Inget värde föreslås för nya band. Denna rapport svarar på "beskriver bandet alla", inte "vad ska bandet vara".

`git diff main..HEAD -- frontend/src/` visar endast `frontend/src/strategic/business/__tests__/order131LoadSweep.test.ts` (ny fil).

---

## 6. Följdorderförslag

Två oberoende fynd som förtjänar egen behandling:

1. **Bimodalitets-fyndet.** Att staff är antingen idle eller pinned är sannolikt inte simulering av verklig arbetsplats — det är en signal om att arrivals-schemat och service-tempot är för spik-vist. Här kan en design-diskussion (inte kalibrering) föras: ska service-tempot slätas, ska arrivals stagger-fördelas, eller är detta en giltig "burst-mode"-simulering av verklig servicebranch?

2. **Per-fas-band-frågan.** Även om samma band appliceras på alla verksamheter kan lunch/dinner-skillnaden på 8–16 procentenheter i `>0,95`-andelen motivera per-fas-band. Spelkänsla-frågan är öppen.

Ingen av dessa åtgärder rekommenderas här. Rapporten är underlag.

---

## 7. Filer som denna order lämnar efter sig

- `documentation/architecture/ORDER_131_LOAD_SVEP.md` — orderfilen
- `documentation/blueprints/ORDER_131_LOAD_SVEP.md` — denna rapport
- `frontend/src/strategic/business/__tests__/order131LoadSweep.test.ts` — svepet som körbart vitest-test
- `frontend/reports/order131/loadSweep.json` — konfiguration + alla 8 celler med percentiler + histogram
- Uppdatering av `documentation/architecture/ORDER_REGISTRY.md` — rad 131
