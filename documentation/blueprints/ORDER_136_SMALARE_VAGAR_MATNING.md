# ORDER 136 — Smalare vägar, mätning innan beslut

**Utfärdad** 2026-08-30
**Klass** AUTONOM · Utredning, ingen rättelse
**Gren** `order-136` (från `main`)
**Följer** ORDER 135 (som accepterades och stängde ORDER 133:s premiss)

---

## 0. Rakt svar

**Smalare vägar löser inte problemet.** Ingen av de två alternativa
scheman minskar antalet kollisioner (kvarstår 32) — bara *djupet* i de
kollisioner som kvarstår.

Underliggande skäl: **19 av 32 fall (59 %) är strukturella** — vägens
polyline går fysiskt genom byggnadens polygon eller så ligger byggnadens
hörn på vägens mittlinje. Bredden är sekundär: även vid noll bredd skulle
dessa 19 kvarstå. De 13 återstående (widthOnly) är minskbara med smalare
värden men försvinner inte förrän envelope < avstånd byggnad-mittlinje —
vilket kräver envelope < 0-1 m för de närmaste fallen.

**Åtgärden är inte smalare vägar. Det är polygon-guard eller data-flytt.**
Analogt med ORDER 132:s `windowsFor`-guard, eller — mer djupgående —
klipp `CLIPPED_ROADS` mot envelope inkl. sidewalk, inte bara centerline.

---

## 1. §2.1 — Dagens `ROLE_SPECS` mot svensk bruksort-norm

| Roll | CURRENT | ALT_A | ALT_B | NORM_SE | Δ CUR−NORM |
|---|---|---|---|---|---:|
| primary | 10+3,2=**13,2** | 10+2=12,0 | 7+2,4=9,4 | 7,5+4=11,5 | **+1,7 m** |
| main | 9+3=**12,0** | 9+2=11,0 | 7+2,4=9,4 | 6,5+3,6=10,1 | **+1,9 m** |
| secondary_connector | 6,2+2,4=8,6 | 6,2+2,4=8,6 | 5,5+2=7,5 | 5,5+3=8,5 | +0,1 m |
| local_street | 5+2=7,0 | 5+2=7,0 | 5+2=7,0 | 4,5+2=6,5 | +0,5 m |
| village_street | 4,6+1,8=6,4 | 4,6+1,8=6,4 | 4,6+1,8=6,4 | 4,5+1,8=6,3 | +0,1 m |
| residential | 3,6+0=3,6 | 3,6+0=3,6 | 3,6+0=3,6 | 3,5+0=3,5 | +0,1 m |
| service | 2,8+0=2,8 | 2,8+0=2,8 | 2,8+0=2,8 | 3+0=3,0 | −0,2 m |
| track | 2,4+0=2,4 | 2,4+0=2,4 | 2,4+0=2,4 | 2,5+0=2,5 | −0,1 m |
| cycleway | 2+0=2,0 | 2+0=2,0 | 2+0=2,0 | 2+0=2,0 | 0 m |
| footpath | 1,3+0=1,3 | 1,3+0=1,3 | 1,3+0=1,3 | 1,5+0=1,5 | −0,2 m |

Format: `width + sidewalk × 2 = envelope`, meter.

**Observationer:**

- **primary + main är genomgående för breda.** +1,7 och +1,9 m envelope
  jämfört med svensk norm (VGU 2020 kap. 6 för bygator, Trafikverket
  landsbygdsvägar för Rv). Rv 244 renderas 13,2 m envelope; en riktig
  bruksvägriksväg 244 i Grythyttan är 6-7 m körbana + 1,5-2 m gångbana =
  ~10-11 m envelope.
- **secondary/local/village är i grov paritet med norm.** Skillnad < 0,5 m
  envelope.
- **service och track är rimliga eller aning smala.** Ingen justering
  motiverad utifrån norm.
- **Nuvarande värden fungerar utan sidewalk** (residential, service, track,
  cycleway, footpath) — där är envelope = carriageway, inget att krympa.

**Källor:**
- VGU 2020 (Vägar och Gators Utformning), Trafikverket + SKR, kapitel 6.2 (bygator) — carriageway 5,5-7 m, gångbana 1,8-2,4 m
- Trafikverket landsbygdsvägar 60-70 km/h — riksväg körbana 6,5-8 m, vägren 0,25-1 m
- Bygglag för bostadsgator — 3-4,5 m karrigäng
- ROLE_SPECS-rubriken själv: *"Visual target, tuned against the localhost screenshots — not a legal survey claim"* (`roadRoles.ts:67`). Talen är alltså visuella val, inte mätta värden — vilket förklarar utstickarna.

---

## 2. §2.2 — Kollisioner per regim

**Regimer:**

| ID | Beskrivning |
|---|---|
| CURRENT | Dagens `ROLE_SPECS` (matchar `roadRoles.ts` i main) |
| ALT_A | Smala trottoarer — primary/main sidewalk 1,6/1,5 → 1,0 m |
| ALT_B | Smalare vägar + trottoarer — primary 10→7, main 9→7, secondary_connector 6,2→5,5, sidewalks krympta |

**Resultat:**

| Regim | Byggnader | Värsta | Försvann | widthOnly | Strukturella |
|---|---:|---:|---:|---:|---:|
| CURRENT | **32** | 4,36 m | — | 13 | **19** |
| ALT_A | 32 | 3,86 m | **0** | 13 | 19 |
| ALT_B | 32 | 3,06 m | **0** | 13 | 19 |

**Trigger-uppdelning:**

- **widthOnly** — kollisionen fångas endast av "byggnad-vertex innanför envelope". Bredd påverkar direkt.
- **strukturell** — vägen har antingen en polyline-vertex INUTI byggnaden, eller vägens edge korsar byggnadens edge. Oberoende av bredd.

**19 av 32 fall är strukturella.** Att krympa envelope kan inte stänga dem — vägen går fysiskt igenom eller in i byggnaden. De 13 widthOnly-fallen minskar i djup men försvinner inte förrän envelope krymper under avståndet mellan byggnad-hörn och vägens mittlinje, vilket för alla de 13 skulle kräva envelope < 1-2 m.

**Slutsats:** varken ALT_A eller ALT_B löser problemet. Största effekten är att värsta djup går från 4,36 m → 3,06 m. Vision Owner kommer fortfarande se meter-in-hus.

---

## 3. §2.3 — Kvarvarande fall vid ALT_B (djupast först)

| # | Byggnad | Kind | Centre | Djup (ALT_B) | Djup (CUR) | Väg |
|---:|---|---|---|---:|---:|---|
| 1 | `vw-pra-19n` | apartments | (383, 29) | **3,06 m** | 4,36 m | main(9,4m,Lokavägen) + service |
| 2 | `vw-nyg-3` | house | (−45, −75) | 2,98 m | 3,53 m | secondary_connector(7,5m,Kyrkogatan) |
| 3 | `vw-jarn-9` | house | (−410, −50) | 2,70 m | 2,70 m | village_street(6,4m,Järnvägsgatan) |
| 4 | `vw-jaktakademin` | house | (−265, 60) | 2,19 m | 2,19 m | village_street(6,4m,Magasinsgatan) |
| 5 | `vw-hjv-5` | house | (−350, −160) | 1,73 m | 1,73 m | village_street(6,4m,Hantverksgatan) |
| 6 | `vw-mag-warehouse` | industrial | (−420, 200) | 1,62 m | 1,62 m | village_street(6,4m,Magasinsgatan) |
| 7 | `vw-barbellclub` | house | (−280, 45) | 1,59 m | 1,59 m | village_street(6,4m) |
| 8 | `w870510826` | industrial | (−624, −268) | 1,40 m | 1,40 m | service(2,8m) ×3 |
| 9 | `w870510828` | industrial | (−649, −369) | 1,40 m | 1,40 m | service(2,8m) ×3 |
| 10 | `w1422745011` | yes | (−87, −229) | 1,28 m | 1,83 m | secondary_connector(7,5m,Kyrkogatan) |

Fall 3-9 påverkas **inte alls** av bredd-ändringen (samma djup CUR/ALT_B) — de är strukturella. Fall 1, 2 och 10 minskar men försvinner inte.

De resterande 22 fallen (utanför topp 10) har djup 0,05-1,3 m i ALT_B. Full lista i `roleSpecsSweep.json` → `results.ALT_B`.

---

## 4. §2.4 — Tre skärmdumpar

Samma vy: `focus=(380, 15)`, `distance=150`, `pitch=1,0` (~57°), `yaw=0,3`. Prästgatan/Lokavägen-området där värsta fallet `vw-pra-19n` sitter.

- **`frontend/reports/order136/roads-current.png`** — dagens `ROLE_SPECS` (Lokavägen 12 m envelope). Vision Owners referenspunkt.
- **`frontend/reports/order136/roads-alt-a.png`** — trottoarer krympta till 1,0 m per sida.
- **`frontend/reports/order136/roads-alt-b.png`** — primary+main körbana till 7 m, secondary till 5,5 m, trottoarer till 1,2 m.

Skärmdumparna togs genom att temporärt patcha `roadRoles.ts` i arbetsträdet, ta skärmdumpen via `frontend/scripts/order136-shot.mjs`, sedan `git checkout -- roadRoles.ts` för att återställa. Commit innehåller inte patchen — `git diff main..HEAD -- frontend/src/strategic/content/roadRoles.ts` = tomt.

---

## 5. §4 — Föreslagen regel för CLAUDE.md

**Tre gånger på två dagar har en mätning läst annan geometri än renderingen:**

1. **ORDER 128** (2026-08-29) — silhuett-kontrastbandet kalibrerades mot `FLOOR_COLOUR = '#a89577'` (skyltblocket i `Restaurant.tsx:108`), inte spelarens interiörsgolv (`INTERIOR_FLOOR_COLOUR = '#a08462'` i `PlayerBusiness.tsx:75`).
2. **ORDER 132** (2026-08-29) — `windowsFor()` i OsmBuildings placerade fönster på OBB-facen (`ridgeW`/`ridgeD`); mätningen antog polygonen. Rendering och mätning läste olika geometri för samma "fönsterposition".
3. **ORDER 135** (2026-08-30) — mätningen läste `road.width` (OSM-tagg) medan rendering läser `ROLE_SPECS[roleFor(road)].width` (visuell tabell). OSM-taggen ignoreras helt av renderingen.

Alla tre gav "korrekt data om fel yta" — vilket är farligare än ingen data, eftersom slutsatserna såg giltiga ut. ORDER 133:s slutsats blev föråldrad inom 24 timmar när ORDER 135 upptäckte att mätningen mätte en fiktiv väg.

**Föreslagen text för `CLAUDE.md` (efter §Renderregler eller som eget avsnitt):**

> ## Mätningar mot renderad geometri
>
> När en mätning påstår något om vad spelaren ser, ska den läsa samma
> källa som renderingskoden. Konkret:
>
> - Konstanter (bredder, färger, offsets, tröskelvärden) importeras från
>   samma modul renderingen läser dem ur — inte replikeras med
>   "rimliga defaults" eller läses från angränsande data-källa (OSM-tagg,
>   asset-metadata) som renderingen inte konsulterar.
> - Om replikering behövs (t.ex. `.mjs`-script som inte kan importera
>   TypeScript direkt) ska en verifieringsrutin bevisa att replikat =
>   rendering, inte anta det. Mätning som inte kan verifiera detta måste
>   explicit dokumentera avvikelsen och varför den är rimlig.
> - En rapport som säger "X gäller i spelet" måste referera till samma
>   import som rendering, eller explicit dokumentera vilken avvikelse
>   mätningen gör.
>
> Motivering: tre gånger på två dagar (ORDER 128, 132, 135) har en mätning
> läst annan geometri än den som renderas — silhuettkalibrering mot
> skyltblock istället för golv, fönster-inklusion mot OBB istället för
> polygon, vägbredd mot OSM-tagg istället för `ROLE_SPECS`. Alla tre gav
> "korrekt data om fel yta", vilket är farligare än ingen data eftersom
> slutsatserna såg giltiga ut. ORDER 133:s hela slutsats blev föråldrad
> inom 24 timmar av det skälet.

Regeln är ett förslag — Vision Owner tar in den i `CLAUDE.md` eller avfärdar
den. Om den antas: `order130-map-measurements.mjs`, `order133-road-width-audit.mjs`
och `order135-render-vs-measurement.mjs` bör markeras som "läser replikerad
`ROLE_SPECS`; verifierad mot roadRoles.ts:104 per 2026-08-30" i sina header-
kommentarer.

---

## 6. Vad ORDER 136 INTE gör (§3-verifiering)

- **Ingen `ROLE_SPECS`-ändring committad.** `git diff main..HEAD -- frontend/src/strategic/content/roadRoles.ts` = tomt.
- **Ingen guard lagd** i `OsmRoads.tsx` eller någon annanstans.
- **Ingen produktionskod rörd.** `git diff main..HEAD -- frontend/src/` = tomt.
- **`CLAUDE.md` orörd** — regelförslaget i §5 är text i denna rapport, inte lagt in i CLAUDE.md än.

`git diff main..HEAD` visar bara: `order136-role-specs-sweep.mjs`, `order136-shot.mjs`, `roleSpecsSweep.json`, tre PNG-skärmdumpar, denna rapport, orderfilen och registerrad.

---

## 7. Rekommenderade följdorder (som uppslag, inte rekommendation)

Två oberoende åtgärder Vision Owner kan välja mellan (eller kombinera):

1. **Polygon-guard i `OsmRoads.tsx`** — analog med ORDER 132:s `windowsFor`-guard. `buildRoadShape` klipper via `CLIPPED_ROADS` mot mittlinjen; guarden skulle klippa envelope (inkl. sidewalk) mot polygon. Stänger de 19 strukturella + minskar de 13 widthOnly. **Enda åtgärden som kan lösa problemet strukturellt.**

2. **Bredd-justering närmare norm** (t.ex. ALT_B). Minskar djup i värsta fallen från 4,36 → 3,06 m. Löser inget helt men gör intrusionen mindre iögonfallande visuellt. **Kan kombineras med (1).**

Ingen av dessa rekommenderas här. Rapporten är underlag.

En tredje åtgärd som ligger utanför denna orders scope: **rätta OSM-polylinjer** som uppenbart går genom hus. Ligger uppströms i OpenStreetMap. Långsam väg men den enda som eliminerar de strukturella fallen på verklighetsnivån.

---

## 8. Filer

- `documentation/architecture/ORDER_136_SMALARE_VAGAR_MATNING.md` — orderfilen
- `documentation/blueprints/ORDER_136_SMALARE_VAGAR_MATNING.md` — denna rapport
- `frontend/scripts/order136-role-specs-sweep.mjs` — kollisionsräknare mot tre regimer
- `frontend/scripts/order136-shot.mjs` — skärmdumps-driver
- `frontend/reports/order136/roleSpecsSweep.json` — full data (regimen-parametrar + norm-jämförelse + trigger-uppdelning + full kollisionslista per regim)
- `frontend/reports/order136/roads-current.png` — skärmdump 1
- `frontend/reports/order136/roads-alt-a.png` — skärmdump 2
- `frontend/reports/order136/roads-alt-b.png` — skärmdump 3
- Uppdatering av `documentation/architecture/ORDER_REGISTRY.md` — rad 136
