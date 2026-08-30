# ORDER 134 — Bimodaliteten

**Utfärdad** 2026-08-30
**Klass** AUTONOM · Utredning, ingen kalibrering
**Gren** `order-134` (från `main`)
**Följer** ORDER 131 §6, följdorderförslag (1)

---

## 0. Rakt svar på §4-frågorna

**Är tudelningen en egenskap hos ankomsterna eller hos tilldelningen?**

**Tilldelningen.** Ankomstfrekvensen är låg och jämn (~0,02 ankomster/tick = ~6 gäster/min för restaurang, ~4 för foodtruck) med Poisson-liknande varians. Om ankomstmönstret var bimodalt skulle vi se ankomster i klungor separerade av tomma perioder — histogrammet visar tvärtom en smal massa runt medlet.

Det bimodala mönstret uppstår i hur `staff.workload` ackumuleras: rate up = 0,05/TICK_SECONDS = 0,25/s när task är aktiv, rate down = 0,03/TICK_SECONDS = 0,15/s när idle. Så snart en task tar tag kliver workload snabbt mot 1,0 och stannar där tills tasken tar slut — och det gör den inte förrän kön är tömd, vilket den nästan aldrig är under en aktiv service.

**Är den ett problem, eller är det så en restaurangservice faktiskt känns?**

**Delvis trogen (foodtruck), delvis förenklad (restaurang).**

- Foodtrucken har 32 % mittmassa och lägeslängder i sekunder (10-20 s) — vilket motsvarar hur ett fönster verkligen känns: enskilda ordrar startar och slutar, med korta andningsintervall däremellan.
- Restaurangen har 8 % mittmassa och lägeslängder i minuter (2-5 min) — vilket överdriver ihållandet. Verkliga kök har konstant småarbete (torka, packa upp, förbereda nästa station) som håller workload i mellanspannet 0,4-0,7. Simmens task-modell saknar detta lager.

Slutsats: bimodaliteten är **strukturell — inte en ren bugg men en förenkling** som är trogen för foodtrucken (diskreta beställningar) och otrogen för restaurangen (kontinuerligt kökarbete). Att flytta `hurried`-bandet från 0,95 löser inte detta — den måste antingen modellera task-flödet mer granulärt eller acceptera att `hurried` är en binär signal (över/under), inte en kontinuerlig läsning.

---

## 1. Metod

**Testfil:** `frontend/src/strategic/business/__tests__/order134Bimodality.test.ts`
**Kör om:** `npx vitest run order134Bimodality --reporter=verbose`
**Körtid:** ~11 s. 4 verksamheter × 3 staffCount × 50 seeds = 600 unika seeds.

Bygger vidare på ORDER 131:s harness. Nytt: separat ankomsträkning, run-length-analys, staffCount-svep via `SET_POLICY`-action (`reducer.ts:2251` triggerar `needsStaffRebuild` som byter ut hela staff-listan via `makeStaff(count)`).

### 1.1 Konfiguration

| Parameter | Värde |
|---|---|
| Verksamheter | restaurant, foodtruck, värdshus, ölkrogen |
| staffCount | 2, 3, 4 (`makeStaff`-signaturen accepterar bara dessa) |
| Seeds per cell | 50 |
| Service | lunch, 8 min, 5 Hz = 2 400 ticks |
| Warmup | 100 ticks (20 s) |
| Mittband (bimodalitet) | [0,2 – 0,8] — massa här = jämnare fördelning |
| Lägeströsklar | HÖG ≥ 0,7, LÅG ≤ 0,3, MITT däremellan |

### 1.2 Mått

- **`arrivalsPerTickMean`** — genomsnittligt antal gäster som spawnat per tick under servicen.
- **`workloadMidMass`** — andel samples i mittbandet [0,2 – 0,8]. Låg = bimodal, hög = jämn.
- **`runLenSec.{high,low,mid}P50`** — mediansekunder för sammanhängande perioder över/under trösklar.

### 1.3 Vad som INTE mäts

- **Task-flödet i simmen på mikronivå.** Vi mäter *resultatet* av tilldelningen (workload), inte hur enskilda tasks fördelas mellan personer. Om orsaken ligger i `deriveActions`-svepet på hur task-listan grupperas är det ett djupare mätsvep.
- **Breakfast-fasen för värdshus** — samma begränsning som ORDER 131.

---

## 2. Resultat

### 2.1 Fullständig svep-tabell

| Cell (business/staff) | Cap | arr/tick | midMass | loMass | hiMass | runHi (p50) | runLo (p50) | runMid (p50) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| restaurant/2 | 16 | 0,022 | **8,4 %** | 27,8 % | 63,8 % | **285,6 s** | 122,0 s | 8,8 s |
| restaurant/3 | 16 | 0,022 | 8,3 % | 27,8 % | 63,9 % | 286,4 s | 122,0 s | 8,8 s |
| restaurant/4 | 16 | 0,022 | 8,3 % | 27,8 % | 63,9 % | 286,4 s | 122,0 s | 8,8 s |
| foodtruck/2 | 6 | 0,013 | **32,0 %** | 39,7 % | 28,3 % | **10,1 s** | 18,6 s | 8,3 s |
| foodtruck/3 | 9 | 0,013 | 32,0 % | 38,7 % | 29,3 % | 10,2 s | 20,0 s | 8,2 s |
| foodtruck/4 | 12 | 0,013 | 32,0 % | 38,7 % | 29,3 % | 10,2 s | 20,0 s | 8,2 s |
| värdshus/2 | 22 | 0,021 | 9,1 % | 27,3 % | 63,6 % | 285,6 s | 122,0 s | 8,8 s |
| värdshus/3 | 22 | 0,021 | 9,0 % | 27,3 % | 63,8 % | 243,6 s | 122,0 s | 8,8 s |
| värdshus/4 | 22 | 0,021 | 9,1 % | 27,3 % | 63,6 % | 232,3 s | 122,0 s | 8,8 s |
| ölkrogen/2 | 20 | 0,022 | 8,4 % | 27,8 % | 63,8 % | 285,6 s | 122,0 s | 8,8 s |
| ölkrogen/3 | 20 | 0,022 | 8,3 % | 27,8 % | 63,9 % | 286,4 s | 122,0 s | 8,8 s |
| ölkrogen/4 | 20 | 0,022 | 8,3 % | 27,8 % | 63,9 % | 286,4 s | 122,0 s | 8,8 s |

**Nyckelmönster:**

- **StaffCount ändrar inte bimodaliteten** — <0,2 procentenhet skillnad mellan staff=2 och staff=4 i alla fyra verksamheterna. Detta är kraftigast fyndet: bemanning löser inte formen.
- **Restaurant = ölkrogen = värdshus** — statistiskt identiska (bekräftar återigen ORDER 125 §4 mekanisk parallellism, plus att värdshusets sömn-flöde inte påverkar lunch-workload).
- **Foodtrucken avviker strukturellt** — 4× högre mittmassa, 27× kortare hög-perioder.

### 2.2 Histogram — foodtruck vs restaurant (staff=3)

**Restaurant staff=3** (bimodal, hi-tung):
```
  0.00–0.05  ###################   30 264   ← låg-puckel
  0.05–0.10                             443
  0.10–0.15                             627
  ...
  0.85–0.90  #                       1 565
  0.90–0.95  ##                      2 860
  0.95–1.00  ########################  67 949   ← hög-puckel
```
Två pucklar, nästan ingen mittdal (< 900 samples i varje bucket 0,05-0,50).

**Foodtruck staff=3** (jämnare):
```
  0.00–0.05  ########################  32 232   ← låg-puckel
  0.05–0.10  ######                     4 599
  0.10–0.15  #####                      3 859
  0.20–0.25  ####                       3 062
  0.40–0.45  ####                       3 124
  0.55–0.60  ####                       2 966
  0.70–0.75  ####                       3 322
  0.90–0.95  ######                     5 185
  0.95–1.00  #########################  20 367   ← hög-puckel
```
Fortfarande högre topp vid 0 och 1, men **hela mittspannet är befolkat** — 2 500-5 000 samples per bucket 0,05-0,90.

Fullständiga histogram i `frontend/reports/order134/bimodality.json`.

---

## 3. §2.1 — ankomster separat från belastning

**Ankomstfrekvenser (arrivals/tick):**

- restaurant: 0,022 = **6,6 gäster/min**
- värdshus: 0,021 = **6,3 gäster/min**
- ölkrogen: 0,022 = **6,6 gäster/min**
- foodtruck: **0,013 = 3,9 gäster/min**

Foodtrucken har LÄGST ankomstfrekvens men jämnast fördelning. Fördelningen per tick är dominerad av 0 arrivals-buckets (Poisson-liknande med låg rate). Se `arrivalsPerTickHistogram` per cell i JSON.

**Slutsats:** ankomsterna är inte klungiga. Skillnaden mellan foodtruck och de andra ligger inte i *när* gästerna kommer utan i hur simmen översätter en gäst → task → staff.workload. **Tudelningen ligger i tilldelningen.**

---

## 4. §2.2 — lägeslängder

| Verksamhet | Hög-läge (p50) | Låg-läge (p50) | Mitt-läge (p50) |
|---|---:|---:|---:|
| restaurant (staff=3) | **286 s** (~4,8 min) | 122 s (~2 min) | 9 s |
| värdshus (staff=3) | 244 s (~4 min) | 122 s | 9 s |
| ölkrogen (staff=3) | 286 s (~4,8 min) | 122 s | 9 s |
| foodtruck (staff=3) | **10 s** | 20 s | 8 s |

**Fyra fynd:**

1. **Restaurang-hög-perioder är 4-5 minuter långa** — mer än halva servicen. Personalen är pinned i över halva servicetid utan att komma till mittspannet.
2. **Low-perioder är 2 minuter** — motsvarar öppning och stängning (staff idle innan gäster kommer + efter sista utgår).
3. **Mid-perioder är alltid ~9 sekunder oavsett verksamhet** — övergångstiden mellan lägen är strukturellt kort. Med workload-rates 0,25/s upp och 0,15/s ned är fönstret mellan 0,3 och 0,7 alltid runt 2-3 sekunder per övergång, och 9 s medianen är summan av flera små passager.
4. **Foodtruck-lägen växlar 30× snabbare** än restaurang. Det är ett kvalitativt annat mönster.

**Ett läge som varar två sekunder är brus; ett som varar två minuter är spelupplevelse** (ordertext §2.2). Restaurangens 5-min-höglägen är definitivt spelupplevelse — det är ihållande stress, exakt vad `hurried` säger. Men vokabulären "personalen är pressad" fångar inte att de är pressade *hela servicen*, inte bara vid toppar.

---

## 5. §2.3 — svep över staffCount

**Blir det mindre bimodalt med fler i personalen? Nej.**

Restaurant midMass: 8,4 % (staff=2) → 8,3 % (staff=3) → 8,3 % (staff=4). Skillnad **< 0,2 procentenhet**.

Alla fyra verksamheter visar samma mönster: **staffCount påverkar inte fördelningens form**, bara capacity (och därmed hur ofta kön svämmar över). Formen sitter i workload-dynamiken per staff, inte i deras antal.

Detta motbevisar en möjlig lösning — "lägg till en person så jämnar det ut sig" gör inte det. Varje ny person bidrar med samma bimodala kurva.

**Notera:** `makeStaff` accepterar bara `2 | 3 | 4` (`model.ts:42`). Att modellen begränsar bemanning till dessa tre är i sig en pusselbit — spelaren kan inte lösa "för lite folk" med steglös bemanning. Om staffCount tilläts högre skulle ändå bimodaliteten kvarstå per person.

---

## 6. §2.4 — food trucken

**Ja, foodtrucken är bimodal — men mycket mindre.** Fyra gånger så mycket mittmassa (32 % vs 8 %). Lägeslängder 27× kortare (10 s vs 286 s hi-läge).

Föredragen tolkning: foodtruckens task-flöde (varje order tar ~20-30 s att expediera) matchar bättre workloadens rate-konstanter (0,25/s upp, 0,15/s ned = full cykel på ~10 s). Restaurangens tasks är per sittning (30-60 min) — så tasken pinnar workload på max i hela sitt intervall.

**Detta stöder tolkningen att formen är trogen för foodtruck och förenklad för restaurang.** Foodtruckens diskreta korta ordrar är en giltig modell; restaurangens 5-min-högperioder överdriver ihållandet.

---

## 7. Vad ORDER 134 INTE gör (§3-verifiering)

- **Ingen tröskel kalibrerad.** `deriveFaces.ts` byte-identisk med `main` (grep-check: 0,95 och 0,7 oförändrade).
- **Ingen ankomstmultiplikator ändrad.** `arrivals.ts` orörd.
- **Inget värde föreslås.** Rapporten svarar på §4-frågan; vad som ska göras är designbeslut.
- **Ingen produktionskod utanför testfilen rörd.** `git diff main..HEAD -- frontend/src/` = tomt utom den nya testfilen.

`git diff main..HEAD` visar endast: `order134Bimodality.test.ts`, `bimodality.json`, denna rapport, orderfilen och registerrad.

---

## 8. Slutsats — är formen ett fel eller en trogen modell?

**Blandad.** Foodtruckens 32 % mittmassa är sannolikt trogen — verkliga foodtrucks har korta pikar och pauser. Restaurangens 8 % är förenklad — verkliga restaurangkök har ihållande låg-till-medel-aktivitet mellan servicetoppar (torka, prepping, mise en place-underhåll) som simmen saknar.

**Konsekvens för Vision Owner:**

- **Alternativ A:** Acceptera bimodaliteten som modellens sanning. Ansiktsvokabulären beskriver två lägen (pressad/pausar), inte gradienter. `hurried` blir en binär signal.
- **Alternativ B:** Bygg ut task-modellen med "bakgrundsarbete" som håller workload i 0,3-0,6 mellan direkta tasks. Ändrar hela simsvavet — spelmekaniken kring `hurried` blir kontinuerlig igen. Stor design-implikation.
- **Alternativ C:** Två-fas-modell — `hurried` mäter tid-i-hög-läge över en fönster, inte instantvärdet. Behåller sim-strukturen men förändrar läsningen.

Ingen av dessa rekommenderas här — det är ett designbeslut som ORDER 134 lämnar öppet.

---

## 9. Vad väntar på detta (per orderns §6)

Per-fas-bandfrågan från ORDER 131 §6 (dinner ligger 8-16 procentenheter över lunch i andel > 0,95). Denna order rapporterar att bimodaliteten är den dominerande effekten — så lunch-vs-dinner-skillnaden är sannolikt en bieffekt av att dinner har högre kö-max (ORDER 131 rapport 4) vilket ökar tiden simmen står i hi-läget. **Per-fas-band skulle inte lösa formen** — den skulle bara flytta gränsen mellan två lägen som redan är dominerande. Följdordern om per-fas-band avråds tills bimodaliteten är designbeslutad (Alternativ A/B/C ovan).

---

## 10. Filer

- `documentation/architecture/ORDER_134_BIMODALITETEN.md` — orderfilen
- `documentation/blueprints/ORDER_134_BIMODALITETEN.md` — denna rapport
- `frontend/src/strategic/business/__tests__/order134Bimodality.test.ts` — svepet som körbart test
- `frontend/reports/order134/bimodality.json` — 12 celler med histogram + lägeslängder + ankomstfördelningar
- Uppdatering av `documentation/architecture/ORDER_REGISTRY.md` — rad 134 + not på rad 131 (§6 följdorderförslag 1 utredd)
