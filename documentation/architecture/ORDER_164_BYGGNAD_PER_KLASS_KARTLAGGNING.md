# ORDER 164 — Byggnad per klass (kartläggning inför BusinessClass-tilldelning)

**Repo** `Viognier70/nexus-studio` · **Gren** `order-166-konkurrenterna` (mergad i samma PR som ORDER 165 + 166 per retroaktiv formalisering)
**Klass** AUTONOM · Docs, ingen kod
**Datum** 2026-08-31
**Följer** Vision Owner-instruktion 2026-08-31 ("kartlägg vilka byggnader som rymmer respektive klass, bara mätning")

---

## 1. Vad ordern är

Vision Owner-beslut 2026-08-31 §3-4: **byggnad per klass, och tillräckligt
stora byggnader.** Innan tilldelning krävs kartläggning av vilka OSM-
footprints i Grythyttan som geometriskt rymmer respektive rums
`MIN_WIDTH_M × MIN_DEPTH_M`. Utan mätningen kan tilldelningen blir
gissning, med den blir en lista.

Kartläggningen genomförd i samtal 2026-08-31 innan ORDER 166 startades.
Denna fil formaliserar resultatet så ORDER 166:s referens
("byggnaderna tas ur ORDER 164:s kandidatlistor") pekar på ett
dokumenterat underlag.

---

## 2. MIN-mått per klass (avlästa ur rumsfilerna)

| Klass | Rumsfil | MIN_WIDTH × MIN_DEPTH |
|---|---|---|
| kvarterskrogen | `restaurantRoom.ts:195-196` | 13,0 × 9,8 m |
| ölkrogen | `brewpubRoom.ts:175-176` | 13,4 × 9,6 m |
| vinbaren | `wineBarRoom.ts:199-200` | 13,8 × 10,2 m |
| gästgiveriet (huvud) | `innRoom.ts:238-239` (`MIN_MAIN_*`) | 24,0 × 16,0 m |
| gästgiveriet (total) | VO 2026-08-31 | 51,85 × 51,50 m |
| nattklubben | `nightClubRoom.ts:240-241` | 24,0 × 14,0 m |

---

## 3. Kandidat-antal per klass

Mätning mot 338 byggnader i `frontend/src/strategic/data/grythyttan-world.json`.
`Fits`-test: `obb.w ≥ MIN_W && obb.d ≥ MIN_D` med OBB beräknat via
polygonens längsta kant som lokal X-axel.

| Klass | MIN | Kandidater |
|---|---|---|
| kvarterskrogen | 13,0 × 9,8 | **141 / 338** |
| ölkrogen | 13,4 × 9,6 | **139 / 338** |
| vinbaren | 13,8 × 10,2 | **116 / 338** |
| gästgiveriet HUVUD | 24,0 × 16,0 | **27 / 338** |
| **gästgiveriet TOTAL** | 51,85 × 51,50 | **1 / 338 — Swedecote** (industrial, 117,6 × 76,1) |
| nattklubben | 24,0 × 14,0 | **37 / 338** |

## 4. Slutsatser

**De tre små:** överflöd av kandidater. `w869907975` (nuvarande
PlayerBusiness, OBB 15,6 × 11,8 m) rymmer alla tre med tighta marginaler
för vinbaren (+1,8 × +1,6 m).

**Gästgiveriet:** bekräftar ORDER 143. Grythyttans egen
`w869907964` (Grythyttans Gästgivaregård, hotel, 41,10 × 25,57) rymmer
huvudbyggnaden med +17 × +9,6 m men når inte totalytan — den befintliga
OSM-polygonen täcker bara hotellet, inte gården eller längorna. Enda
footprint som geometriskt rymmer 51,85 × 51,50 är Swedecote-fabriken,
som är helt fel typologi. **Ny crafted-volume krävs** som kombinerar
hotellet + gården + längorna till en polygon.

**Nattklubben:** 37 kandidater. Många industribyggnader och skolor.
Ingen naturlig kandidat med "nightclub"-typologi i OSM-data — dålig
tagning i byn.

## 5. Vad kartläggningen inte gjorde

- Ingen korskontroll mot `LANDMARK_BUILDING_IDS` /
  `HANDCRAFTED_LANDMARK_IDS` — flera topp-kandidater är redan tagna som
  landmärken (Kärnhuset, Måltidens hus, Grythyttans Gästgivaregård,
  kyrkan).
- Ingen tematisk lämplighetsbedömning — bara geometrisk plats.
- Ingen närhetskontroll (avstånd till Torget, till annan verksamhet).

## 6. Konsumenter

- **ORDER 166 §2.1** — refererar denna som "ORDER 164:s kandidatlistor"
  när NPC-konkurrenternas byggnads-id:n väljs.
- Framtida tilldelnings-order — när en klass ska få egen byggnad.

Ingen kod, ingen mätning som script — kartläggningen är en enda
tabell och kan reproduceras med några rader Python mot `grythyttan-world.json`.
