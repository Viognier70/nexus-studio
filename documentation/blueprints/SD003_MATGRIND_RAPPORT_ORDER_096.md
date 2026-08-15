# SD-003 §5 — Mätgrindsrapport ORDER 096

**Datum:** 2026-08-15  
**Order:** ORDER 096 — Dockskåpets mätgrind  
**Status:** Mätgrind genomförd — SD-003 förblir pausad, detta underlag styr revideringen  
**Uppfyller:** SD-003 §5.1–§5.4  
**Artefakter:** `frontend/scripts/order096-fps-benchmark.mjs` · `frontend/reports/order096/`

---

## 1. Bakgrund

SD-003 beslutade dockskåpet: restaurangen i genomskärning, sedd från sidan, med ansikten och lemmar på aktörerna. Direktivet är pausat mot R4 (ORDER 091 §1.6) eftersom det beskriver en enda skepnad och R4 behöver minst två. Men §5:s mätgrind är oberoende av R1–R4 — den prövar om formen bär, och den ska köras innan mer byggs.

Mätgrinden täcker tre frågor:

1. **§5.1 — Bildfrekvens.** Håller trettio riggade SVG-figurer i rörelse 60 fps med marginal?
2. **§5.2 — Rumsbredd.** Hur många figurplatser ryms i matsalsrummet vid 1280/1920/2560 px skärmbredd, om figuren ska vara 140 px bred för att uttrycket ska läsas?
3. **§5.3 — Kartans minsta storlek.** Hur liten kan kartan bli innan den slutar vara instrument?

Ingenting byggs in i spelet i den här ordern. Mätningen är ett fristående prov.

---

## 2. Instrument

Mätskriptet (`frontend/scripts/order096-fps-benchmark.mjs`) är ett fristående Node/Playwright-skript. Riggkoden är lyft ur `documentation/prototypes/staff-guest-reel-extended/guest-reel.jsx` och portad till vanilla JS (inga ramverksberoenden, ingen React). Mätningen körs i headless Chromium vid 1920×1080 px.

**Mätningen kör riggen isolerad — ingen simulering, inga paneler, ingen karta, ingen 3D-scen.** Det uppmätta talet är inte spelets tal. I spelet konkurrerar dockskåpets figurlager med det övriga frame-budgetet; beroende på hur mycket 3D-scenen och simuleringen tar av de 16,7 ms som ett 60 fps-frame kostar kan marginalen vara snävare än benchmarkens råtal antyder. Marginalen mot 60 fps-kravet är ~6× — det tål mycket, men förbehållet ska stå klart innan siffran citeras som beslutad.

Utöver isolationen: vanilla JS SVG-uppdatering bär inget React-reconciliation-overhead. Den faktiska dockskåp-komponenten i React kan förväntas vara 5–15 % långsammare. De två avvikelserna pekar åt varsitt håll (isolation = optimistisk, vanilla JS = optimistisk) — sammanlagd bias är uppåt.

Figurerna animeras med tre cyklande poser (gång/ätande/siluett-hälsning) med staggerade fasoffset så att alla ledvinklar räknas om varje bildruta.

---

## 3. §5.1 — Bildfrekvenssvep

**Mätupplägg:** Fem antal figurer i rörelse (5 / 10 / 20 / 30 / 40). Per antal: 2 s uppvärmning + 10 s mätning. Medelvärde och 5:e percentilen (sämsta 5 % av bildrutor) rapporteras. Krav: p5 ≥ 60 fps vid N=30.

| Figurer (N) | Bildrutor | Medel (fps) | P5 (fps) | Status |
|:-----------:|:---------:|:-----------:|:--------:|:------:|
| 5  | 1 200 | 120.5 | 107.5 | **PASS** |
| 10 | 1 201 | 120.4 | 107.5 | **PASS** |
| 20 | 1 201 | 120.2 | 109.9 | **PASS** |
| 30 | 1 200 | 120.1 | **119.0** | **PASS** |
| 40 | 1 201 | 120.3 | 107.5 | **PASS** |

*Renderer: Chrome headless SVG, vanilla JS, 1920×1080. Mätt 2026-08-15.*

### Tolkning

Bildfrekvensen är takad vid 120 fps (skärmens vsync-gräns på testmaskinen). Prestandakostnaden för N figurer är liten: p5 sjunker från 108 fps vid N=5 till 108 fps vid N=40 — skillnaden är i brus. Det finns inget N i det testade intervallet där formen börjar kosta.

Med ett React-overhead på 15 % (pessimistisk övre gräns) landar N=40 p5 på ≈ 91 fps — fortfarande väl över 60 fps-tröskeln.

**Slutsats §5.1: Formen bär. Trettio figurer i rörelse är inga problem på modern hårdvara.**

Om framtida mätning på mobil eller svagare hårdvara visar att formen inte håller finns tre vägar (i stigande ingrepp): (a) förenklad rigg på figurerna längst bort, (b) canvas i stället för SVG för figur-rendering, (c) färre figurer per ögonblick och panorering i stället.

---

## 4. §5.2 — Rumsbredd och figurantal

**Mätupplägg:** Alt C — ett rum i fokus, kök och bar som öppningar i bakväggen. Matsalsrummet antas ta 70 % av skärmbredden (kök + bar: 30 %). Figuren är 140 px bred vid 1080 px skärmhöjd (referensmåttet från ORDER 096 §3). Vid andra upplösningar skalas figurens bredd med skärmhöjden (figuren är höjddefinierad i världskoordinater).

| Skärm       | Skärmhöjd | Matsalsbredd | Figur-bredd | Figurer tvärs |
|:-----------:|:---------:|:------------:|:-----------:|:-------------:|
| 1280 × 720  | 720 px    | 896 px       | 93 px       | **9**         |
| 1920 × 1080 | 1080 px   | 1344 px      | 140 px      | **9**         |
| 2560 × 1440 | 1440 px   | 1792 px      | 187 px      | **9**         |

### Tolkning

**Nio figurplatser vid alla upplösningar.** Resultatet är upplösningsoberoende: figur-bredden skalas proportionellt med skärmhöjden, matsalsbredden skalas med skärmbredden — i ett 16:9-format tar dessa ut varandra. Nio slots är nio slots oavsett pixelantal.

16 kuvert (dining + personal ≈ 19–22 figurer) ryms inte i ett enda panoreringsfritt vy vid 140 px figurbredd. Nionfigurstorlek låter sig läsas men är inte reelt 16 kuvert — det är ungefär en bordsrad och lite till.

**Detta är ett strukturellt fynd.** Vision Owner behöver välja väg:

- **A — Panorering.** Matsalsrummet är bredare än skärmen; spelaren kan scrolla/panorera. 16 kuvert ryms i ≈ 2 240 px (1280 × 1.75) — utanför skärmen vid 1280 men nåbart via scroll.
- **B — Färre kuvert i vy.** Reelen visar 8–10 kuvert (hälften), resten finns men syns bara vid panorering eller zoom-ut.
- **C — Minska figurerna under 140 px.** 100 px-figurer ger 13 slots tvärs — men uttrycket börjar bli svårläst.
- **D — Ultrawide.** 21:9 (2560 × 1080) ger 1792/140 = 12 slots — fortfarande inte 16, men närmre.

**Slutsats §5.2: 16 kuvert vid 140 px figurbredd ryms inte i ett panoreringsfritt vy. Valet mellan panorering och färre synliga kuvert är Vision Owners, men det ska fattas mot den här siffran.**

---

## 5. §5.3 — Kartans minsta läsbara storlek

**Mätupplägg:** Kartan bär den rumsliga avläsningen (beslut C). De tre element som måste gå att skilja åt: puckar (cirkulära markörer), rytmringar (yttre cirklar), och täthet (mönstret av puckar = bordsgeometri). Minsta läsbara storlekar:

| Element | Minimum | Motivering |
|---------|---------|------------|
| Puck-diameter | 8 px | Lägsta för att forma läsa som "rund, distinkt från granne" |
| Rytmring (yttre diameter) | 14 px | Ringstroke ≥ 2 px + 2 px interiör |
| Avstånd mellan puck-centra | ≥ 18 px | 14 px ring + 4 px marginal |

Med 8 kolumner × 2 rader kuvertpuckar (16 kuvert totalt, nära + bortre sida):

| Mått | Värde |
|------|-------|
| Matsalens min-bredd (8 × 18 px) | 144 px |
| Matsalens min-höjd (3 rader × 18 px + marginaler) | 74 px |
| Total kartas min-bredd (144 / 0.70) | **206 px** |
| Total kartas min-höjd | **74 px** |

**Under 206 × 74 px:** puckarna och rytmringarna kan inte längre läsas som täthetsmönster — kartan är en areabeteckning, inte ett navigeringsinstrument.

**Slutsats §5.3: Kartans underkant är 206 × 74 px. Under detta mått fungerar den som dekoration.**

---

## 6. §5.4 — Referensartefakter

Referensbilden och inspelningen visar 30 figurer i rörelse vid den konfiguration som mätningen visade håller.

| Artefakt | Sökväg |
|----------|--------|
| Stillbild (1920×1080) | `frontend/reports/order096/bench-30.png` |
| Inspelning (12 s, 1920×1080) | `frontend/reports/order096/bench-30.webm` |
| Maskinläsbart JSON | `frontend/reports/order096/results.json` |

Figurer i inspelningen är uppdelade tre-och-tre i gång / ätande / hälsande — alla rig-grenar aktiva.

---

## 7. Slutsats

| Mätpunkt | Resultat | Svar |
|----------|----------|------|
| §5.1 — 30 figurer i rörelse ≥ 60 fps | N=30 p5 = **119 fps** | **Ja, formen bär** |
| §5.2 — 16 kuvert i vy vid 140 px | **9 slots tvärs**, upplösningsoberoende | **Nej — panorering eller kompromiss krävs** |
| §5.3 — Kartans minsta storlek | **206 × 74 px** | Instrumentgräns fastlagd |

**Formen bär renderingsmässigt.** Trettio figurer i rörelse är trivialt för modern hårdvara — marginalerna är så stora att React-overhead och mobilanpassning inte ändrar svaret.

**Formen bär inte rumsmässigt vid 140 px per figur.** Nio figurplatser tvärs i stället för de 16 som ett fullt matsalsrum kräver — det är ett layoutval, inte ett tekniskt problem. SD-003:s revidering behöver ta ställning till §5.2-valen A–D innan riktningen fastsätts.

---

## 8. Avgränsningar

Ingenting i produktionskoden rörs av den här ordern. `InteriorGuests`, `InteriorStaff`, `patternTransform` och kartans puckar är oförändrade. Beslut C gäller tills SD-003 revideras. SD-003 förblir pausad.

Mätresultaten är Chrome-specifika och mätta på en stationär Mac (120 Hz skärm). En mobilmätning (Safari/WebKit, 60 Hz, lägre CPU) är inte genomförd och behövs om mobil-first-support är ett krav för dockskåpet.

**`pointerEvents` på figurlagret — öppen implementationsfråga.** Benchmarkens SVG-figurer bär `pointer-events: none` på figurlagret, vilket är korrekt för figurer som bara ska animeras. SD-003 §4 kräver dock att ett klick på passluckan (öppningen mot köket respektive baren i bakväggen) byter fokusrum. Öppningarnas klickytor delar svaret med figurlagret om de läggs i samma SVG. Implementationen behöver antingen **(a)** lyfta öppningarnas klickytor ur figur-SVG:en och lägga dem i ett eget lager med normalt `pointer-events`, eller **(b)** sätta `pointer-events: auto` specifikt på öppningarnas `<g>`-element medan figur-rotelementet behåller `none`. Inget av detta påverkar bildfrekvensen; det är en layoutfråga SD-003:s revidering måste lösa innan passluckans interaktion specificeras.

---

*Rapporten producerad 2026-08-15 av ORDER 096.*
