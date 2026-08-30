# ORDER 133 — Vägarnas bredd

**Utfärdad** 2026-08-30
**Klass** AUTONOM · Utredning, ingen rättelse
**Gren** `order-133` (från `main`)
**Följer** ORDER 130 §6, följdorderförslag (2)

---

## 0. Rakt svar på slutfrågan

**Vilken sorts fel är det — parameter, data eller placering?**

Hypotesen är **främst data (OSM-taggar), med placering som mindre bidrag**. Kod-parametrar (våra kind-defaults) är inte huvudorsak. Bevis:

- 4 av 37 kollisioner försvinner om alla vägar tvingas till kind-norm (ignorera OSM-widths). Dessa 4 är samlade kring **Prästgatan** (`w122157691`), som OSM-taggar som `living_street width=12`. Normen är 5 m. Sannolikt fel-taggad i OSM (living_street är per definition 3-5 m).
- 33 av 37 kvarstår med normerade bredder. De ligger med 0,09-1,98 m överlapp mot service-vägar (mestadels default-bredd 3 m) och residential-vägar med rimliga OSM-widths (4,5-6 m). Detta är småöverlapp — sannolikt äkta tät bebyggelse där footprints ligger några decimeter över vägbanan.
- **Bredder per kind-defaults är inte fel:** service (134 vägar, 133 utan OSM-width) är default 3 m — rimligt. secondary/tertiary har alla OSM-widths satta, och de matchar norm väl (median 6,5-8 m, alla under 1,5× norm).

**Egentliga OSM-datafel identifierade:** 4 vägar med `width` ≥ 10 m — Prästgatan (living_street 12 m) och tre residential-vägar (10, 10, 13 m). Sannolikt taggade utan att omfatta stjärnväg + trottoar + parkering, eller från kartrenderingsverktyg som satte hela gaturummet som `width`. Detta är inte vår kod att rätta.

---

## 1. Metod

`frontend/scripts/order133-road-width-audit.mjs` — ren Node-mätning. Kör om:
```
node frontend/scripts/order133-road-width-audit.mjs
```

Två regimer jämförs mot samma kollisions-algoritm (samma som ORDER 130):
- **Baseline** — OSM-tagg om finns, annars kind-norm. Detta är ORDER 130:s siffra: **37 byggnader** träffar minst en väg.
- **Normed** — kind-norm alltid (ignorera OSM-widths). Ger **33 byggnader** — fyra försvinner.

Skillnaden = 4 byggnader (`w869907976`, `w869907977`, `vw-bv-4`, `vw-pra-8`) — alla samlade kring Prästgatan. Se `frontend/reports/order133/widthAudit.json`.

---

## 2. §2.1 — var kommer 12 m ifrån

**OSM-datan direkt.** `grythyttan-world.json` → `roads[]` som preprocessing importerar från `grythyttan-osm.json`. Fältet `width: 12` sitter på:

- `w122157691` **Prästgatan** (kind=`living_street`) — 12 m

Vår kod (`frontend/scripts/order130-map-measurements.mjs:defaultRoadWidth`, som mätningen använder) väljer OSM-`width` om det finns; annars kind-default. För Prästgatan finns OSM-tagg, så koden respekterar 12 m. **Preprocessingen översätter, den uppfinner inte.** Talet kommer utifrån.

### Andra suspekta OSM-bredder

Ytterligare tre vägar över 10 m, samtliga residential:

| ID | Kind | OSM width | Norm | Över med |
|---|---|---:|---:|---:|
| `w122157691` | living_street (Prästgatan) | **12 m** | 5 m | +7,0 m |
| `w287143007` | residential | 10 m | 4,5 m | +5,5 m |
| `w1329020079` | residential | 10 m | 4,5 m | +5,5 m |
| `w1329020081` | residential | **13 m** | 4,5 m | +8,5 m |

Alla fyra är sannolikt OSM-datafel — kanske "gaturum inkl. trottoar/parkering", kanske editor-misstag. Ingen normal norm för `living_street` eller `residential` når 10-13 m.

---

## 3. §2.2 — bredd per vägtyp

| kind | n | OSM-taggar | Norm | OSM-median | OSM-max | > 1,5× norm |
|---|---:|---:|---:|---:|---:|---:|
| service | 134 | 1 | 3 | 6 | 6 | 1 |
| residential | 53 | 25 | 4,5 | 5,5 | **13** | 4 |
| path | 36 | 0 | 1 | — | — | 0 |
| unclassified | 28 | 0 | 4 | — | — | 0 |
| track | 27 | 0 | 3 | — | — | 0 |
| cycleway | 14 | 0 | 2 | — | — | 0 |
| secondary | 12 | 12 | 6,5 | 8 | 8 | 0 |
| footway | 11 | 0 | 1,5 | — | — | 0 |
| tertiary | 7 | 7 | 5,5 | 5,5 | 6,5 | 0 |
| living_street | 3 | 3 | 5 | 5,5 | **12** | 1 |
| platform | 2 | 0 | 3 | — | — | 0 |

**Observationer:**

- **secondary/tertiary** har OSM-widths på alla 12+7 vägar, alla väl inom norm — dessa är korrekt taggade.
- **residential** har OSM-widths på 25/53, mestadels 3-6,5 m (rimligt), men 4 utstickare över 1,5× norm (7-13 m).
- **service** har 1/134 (0,7%) OSM-width. Resten defaultar till 3 m — rimligt för OSM service-normen.
- **path/track/cycleway/footway** har inga OSM-widths — våra defaults (1-2 m) matchar normen.
- **living_street** är extremfallet: 3 vägar, 1 med osannolika 12 m.

Vår kod-defaults (`normFor()` i audit-scriptet) är i grova drag samma som `defaultRoadWidth()` i `order130-map-measurements.mjs`. Se `frontend/scripts/order133-road-width-audit.mjs:NORM_WIDTH` för exakta värden.

---

## 4. §2.3 — hur många försvinner med normerade bredder

| Regim | Kolliderande byggnader |
|---|---:|
| Baseline (OSM width if present, else kind-norm) | **37** |
| Normed (kind-norm alltid) | **33** |
| **Försvunna med norm** | **4** |

De fyra som försvinner:

- `w869907976`
- `w869907977`
- `vw-bv-4`
- `vw-pra-8`

Alla samlade nära Prästgatan. Deras överlapp i baseline kommer från Prästgatans 12 m-bredd — 3,5 m av varje sida. När Prästgatan sätts till 5 m (norm) släpper alla fyra.

**Så: 4 av 37 (11 %) av kollisionerna är breddproblem** — och specifikt Prästgatan är den enda living_street som är fel-taggad. De tre residential-utstickarna (10, 10, 13 m) triggar inte topp-5-fallen i ORDER 130 § men skulle ge extra kollisioner om deras bredder var noggrant mätta.

---

## 5. §2.4 — kvarvarande fall vid normerade bredder

Topp 20 med worstOverlap i fallande ordning (full lista i `widthAudit.json`, cell `stillHitting`):

| # | Byggnad | Kind | Centre | Worst | Väg |
|---:|---|---|---|---:|---|
| 1 | `vw-nyg-3` | house | (−45, −75) | 1,98 m | tertiary(5,5m osm5,5) |
| 2 | `vw-jarn-9` | house | (−410, −50) | 1,75 m | residential(4,5m osm5) |
| 3 | `vw-pra-19n` | apartments | (383, 29) | 1,61 m | service(3m def), secondary(6,5m osm8) |
| 4 | `w870510826` | industrial | (−624, −268) | 1,50 m | service(3m def) ×3 |
| 5 | `w870510828` | industrial | (−649, −369) | 1,50 m | service(3m def) ×3 |
| 6 | `w1422743880` | yes | (−30, 76) | 1,37 m | service(3m def) |
| 7 | `vw-pra-15s` | house | (352, 5) | 1,35 m | service(3m def) |
| 8 | `vw-pra-djurskyddet` | house | (355, 15) | 1,33 m | service(3m def) |
| 9 | `vw-jaktakademin` | house | (−265, 60) | 1,24 m | residential(4,5m osm5,5) |
| 10 | `w611776645` | yes | (−409, 1299) | 0,82 m | service(3m def) |
| 11 | `vw-hjv-5` | house | (−350, −160) | 0,78 m | residential(4,5m osm6) |
| 12 | `vw-mag-warehouse` | industrial | (−420, 200) | 0,67 m | residential(4,5m osm5,5) |
| 13 | `vw-barbellclub` | house | (−280, 45) | 0,65 m | residential(4,5m osm5), residential(4,5m def) |
| 14 | `vw-forskola` | house | (−215, −250) | 0,42 m | service(3m def) |
| 15 | `w1422745011` | yes | (−87, −229) | 0,28 m | tertiary(5,5m osm5,5) |
| 16 | `w869907965` | yes | (92, 24) | 0,26 m | service(3m def) |
| 17 | `w869907964` | hotel | (62, 39) | 0,26 m | residential(4,5m def) |
| 18 | `w611766160` | yes | (689, 111) | 0,15 m | service(3m def) |
| 19 | `vw-torget-west-corner` | house | (−52, −30) | 0,11 m | residential(4,5m osm5,5) |
| 20 | `w193810975` | university | (569, −84) | 0,09 m | service(3m def) |

Ytterligare 13 fall med worstOverlap < 0,09 m — i praktiken kant-i-kant-fall som är svåra att bedöma som riktiga överlappningar.

**Vad är de kvarvarande fallen?**

- **Service-vägar (default 3 m):** flest kvarstår. Servicevägar är smala bakgator som per definition går närmast fastigheter — 0,1-1,5 m intrusion kan vara verklig gränsmark eller footprint-precision (OSM-noggrannhet ligger sällan under 1 m).
- **Residential-vägar med OSM-widths:** mindre bidrag, oftast under 1 m — sannolikt äkta granngårdar där husets fastighet ligger nära gatuavgränsningen.
- **Två industrier (−624/−648):** ligger utanför byn i tätbebyggt industriområde. Sannolikt verkliga överlappningar mellan bygg-footprint och service-väg.

---

## 6. Vad ORDER 133 INTE gör (§3-verifiering)

- Ingen vägbredd ändrad. `grythyttan-world.json` orörd (`git diff main..HEAD -- frontend/src/strategic/data/` = tomt).
- Ingen byggnad flyttad.
- Ingen OSM-data redigerad.
- Ingen `defaultRoadWidth`-funktion ändrad i order130-scripten eller produktionskod.
- Ingen produktionskod utanför mätskript rörd. `git diff main..HEAD -- frontend/src/` = tomt.

`git diff main..HEAD` visar bara: `order133-road-width-audit.mjs`, `widthAudit.json`, denna rapport, orderfilen och registerrad.

---

## 7. §5 — om något inte går

**Ja, delvis.** Prästgatans 12 m är sannolikt fel i OSM. Vår mätning kan inte rätta OSM, och att skriva över `r.width` i preprocessing skulle vara att uppfinna data. Det är ett större beslut:

- Alternativ A: Respektera OSM som ordagrann. Behåll 12 m. Acceptera 4 falska överlapp.
- Alternativ B: Normalisera in preprocessing — cap `width` per kind (t.ex. `living_street ≤ 6`). Ger renare geometri men förfalskar OSM-data.
- Alternativ C: Rätta uppströms i OpenStreetMap. Långsam väg men den enda som håller.

Detta är designfråga, ligger utanför ORDER 133:s scope.

---

## 8. Rekommendation (som hypotes, inte diagnos)

**Blandad orsak, dominerad av OSM-data.** Fördelning:

- **~11 % av kollisionerna (4 av 37) är OSM-taggfel** — Prästgatans 12 m är den enda enskilda källan i topp-4-tabellen.
- **~89 % (33 av 37) kvarstår med normerade bredder** — spridd över byn, mestadels < 1 m intrusion mot smala service-vägar. Sannolikt äkta OSM-geometri i tätbebyggda kvarter.
- **Kod-parametrar (kind-defaults) är inte huvudorsak.** Kollektivt fungerar defaults väl; utfallet skiljer sig 4 byggnader på 338 (1,2 %).
- **Placering (equirectangular-transform) är inte huvudorsak.** Om det var det skulle fel växa med avstånd från origo — vilket ORDER 130 §3.3 redan uteslöt.

**Nästa steg för Vision Owner:** avgöra om Alternativ A/B/C ovan är rätt väg. Ingen av dem är kodfix; alla tre är designbeslut om hur felaktig indata hanteras.

---

## 9. Filer som denna order lämnar efter sig

- `documentation/architecture/ORDER_133_VAGARNAS_BREDD.md` — orderfilen
- `documentation/blueprints/ORDER_133_VAGARNAS_BREDD.md` — denna rapport
- `frontend/scripts/order133-road-width-audit.mjs` — mätskript, körbart
- `frontend/reports/order133/widthAudit.json` — full data (kind-report, baseline/normed listor, per-byggnad-detaljer)
- Uppdatering av `documentation/architecture/ORDER_REGISTRY.md` — rad 133 + not på rad 130 (§6.2-punkten utredd)
