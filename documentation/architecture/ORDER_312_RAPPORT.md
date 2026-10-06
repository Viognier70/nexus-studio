# ORDER 312 — Ligger något i spelet på vägen? (rapport)

**Underlag:** Anders 2026-10-06. Husen låg på vägarna i Designs prototyp av byn. Ordern prövar att spelet inte har samma fel, med ett automatiskt test på den riktiga kartan (`frontend/src/strategic/data/grythyttan-world.json`).

**Gren:** `order-312` från `main` (`51c7cbb7`).

Varje tal pekar på en fil under `frontend/reports/order312/`:
- `conflicts-fore.json`: mätningen före rättningen;
- `conflicts.json`: mätningen efter rättningen;
- `shots-fore.json`, `shots-efter.json`: bilderna, med kamerans mål och felet i meter;
- `fore-NN-*.png`, `efter-NN-*.png`: bilderna från gatan i produktionsbygget.

Skriptet är `frontend/scripts/order312-on-road.mjs`.

## 1. Mätningen läser renderingens källor

- **Vägytan.** `OsmRoads.tsx` räknade vägbitarna inne i komponenten. Beräkningen står nu i `content/roadSurface.ts` (`roadRenderPieces`). OsmRoads ritar ur den, och mätningen läser samma funktion.
- **Bredden** kommer ur `roadRoles.ts` `ROLE_SPECS[roleFor(road)]`, inte ur OSM-taggen. Hälleforsvägen är 10 m, gångvägen 1,3 m. Testet prövar det.
- **Trottoaren** räknas där OsmRoads ritar den.
- **Husen** är de som ritas: `WORLD.buildings` utom `BUILDINGS_ON_ROADS`, och uthusen (`OsmProceduralOutbuildings`, platsen ur `procgen/parcel.ts`).
- **Vinbaren:** rummet som `WineBarScene` placerar det (`interiorLayout.ts` `playerObb`, `businessRoom.ts` `roomSizeFor`). Entrén ur `computePlayerBusinessInterior`.
- **Rivalerna och vagnarna:** `villagePlaces.ts` `venuePlaces`, `venueLampPoint` och `truckPlacement`. `VillageVenues.tsx` ritar dem därifrån.
- **Bilarna:** tre sorter.
  - Byns bilar och bussen (`VillageLife.tsx`) kör `villageNetwork.ts` `driveNetwork` och `routeBetween`.
  - Trafiken (`OsmTraffic.tsx`) kör `eligibleRoads(kind)` med körfältets förskjutning (`vehicleLaneOffset`).
  - Leveransbilen (`DeliveryVan.tsx`).

Mätningen står i `scene/onRoadAudit.ts`. Toleransen är 0,1 m (`ON_ROAD_TOLERANCE_M`). Kantstenen är 0,18 m.

**Avvikelser som mätningen inte täcker:**
- Takets utsprång räknas inte, bara väggarnas fot.
- De handgjorda landmärkena ritar väggarna ur polygonen men kan ha detaljer utanför den.
- Bilarnas förstoring på håll (`readabilityScale`) räknas inte.
- Byns fotgängare (`VillageLife` walkNetwork) prövas inte. Ordern gällde bilarna.

## 2. Konflikterna före rättningen

Antalen står i `conflicts-fore.json` `counts`. Koordinaterna är meter i byns ram (+X öster, +Z söder).

**Uthus på vägen** (`outbuilding-on-road`), åtta uthus:

| Uthus vid | Punkt | Väg | Bild före / efter |
|---|---|---|---|
| w193810959 | (183,34, 65,82) | gångväg w193810985 | `fore-01` / `efter-01` |
| w870510856 | (−338,06, −151,89) | Hantverksgatan | `fore-02` / `efter-02` |
| w1239589275 | (−80,66, −204,51) | Kyrkogatan | `fore-03` / `efter-03` |
| w1239589279 | (−52,09, −146,46) | Kyrkogatan | `fore-04` / `efter-04` |
| w1239589281 | (−55,43, −150,67) | Kyrkogatan | `fore-04` / `efter-04` (samma plats) |
| w1239589282 | (−51,45, −132,46) | Kyrkogatan | `fore-05` / `efter-05` |
| vw-kyr-25 | (−16,75, 56,80) | Smedsgatan | `fore-06` / `efter-06` |
| vw-hjv-5 | (−348,20, −169,50) | w862853198 | `fore-07` / `efter-07` |

Bilderna heter `frontend/reports/order312/fore-NN-*.png` och `efter-NN-*.png`.

Uthusen stod upp till 3,1 m in på körbanan (`depthM`). Inga OSM-hus och inga syntetiska hus stod på vägen. ORDER 158 klipper redan vägen runt dem.

**Vagnarna** (`truck-on-road`, `truck-in-building`):
- Grillvagnen på torget stod i Torgkrogens hus (w869907973) och på Torgets trottoar, vid (0,74, −30,70). Det gäller torsdag och fredag i schemat. Bild `fore-10` / `efter-10`.
- En andra vagn vid Måltidens hus hade stått på gångvägen w983402520, vid (542,81, −54,63). Bild `fore-11` / `efter-11`.

**Byns bilar** (`car-off-car-road`): bilnätet byggdes ur OSM-linjerna. Där OsmRoads klippt bort vägen nära ett hus körde bilarna över gräs och gårdar:
- (−262,5, 68,2): 13 m;
- (−65,2, −29,8): 39 m;
- (−19,3, −27,2): 21 m;
- (400,5, 3,6): 44 m (vid Ingo);
- (305,9, 37,5): 9 m;
- (75,2, 13,6): 23 m.

Bilderna är `fore-12` till `fore-17`, i den ordningen.

**Trafiken** (`OsmTraffic`):
- Bilar genom uthusen ovan, 7–10 m per väg (`car-through-building`).
- Bilarnas mitt 1–3 m utanför körbanan där vägbiten slutar, på 80 vägbitar.
- Prov på 1 m över en gång- eller cykelväg, till exempel (−442,5, −146,0) vid Stationsgatan (`car-on-footpath`).

Trafikens längre bitar och gångvägarna: `fore-18` till `fore-24`.

**Leveransbilen** körde 7 m över gården bakom vinbaren, vid (33,46, −1,60). Den ligger inom bilden `fore-08`.

**Vinbaren** (`winebar-room-outside-building`): se §4.

**Rivalernas krogar:** inga konflikter. Alla fem husen ritas, inget står på vägen, och lyktan vid dörren hänger inte över körbanan.

## 3. Rättat i spelets data

Kartan är inte ändrad.
- **Uthusen** (`procgen/parcel.ts`): en sida prövas bara om uthuset står minst 0,5 m från den ritade vägytan och inte i ett annat hus. Det ska inte heller stå i vägens lucka, där OsmRoads klippt bort remsan. Annars prövas nästa sida, eller inget uthus.
- **Vagnarna** (`villagePlaces.ts` `TRUCK_STANDS`): platserna är data i stället för en regel.
  - Torget: (1,20, −22,03), på torgytan söder om Torget, luckan mot norr.
  - Måltidens hus: (547,00, −60,87), 4 m norr om den gamla platsen.
  - Sjön: oförändrad, (376,16, 230,32).
- **Byns bilnät** (`villageNetwork.ts` `driveNetwork`): en kant finns bara om den ligger helt på ritad körbana för bilar.
- **Trafiken** (`OsmTraffic.tsx`): varje väg klipps till ritad körbana för bilar, med 1,2 m åt sidorna och halva det längsta fordonet framåt och bakåt.
- **Leveransbilen** (`business/deliveryStop.ts`): bilen stannar på gatan närmast lastplatsen, i körfältet mot huset, och kör in 8 m längs gatan. För vinbaren är det Västra Bergvägen öster om huset. Lastplatsen i `interiorLayout.ts` står kvar som husets baksida.

## 4. Vinbaren

- Entrén (30,79, −23,34) ligger i husets fot.
- Entrén vetter mot Torget (w122157681), 2,75 m ut (`conflicts.json` `wineBar.facing`).
- Rummet ligger inte på någon väg och inte i ett grannhus.
- **Rummet är större än huset.** `roomSizeFor` bygger vinbarens rum i Designs minimimått 14,6 × 11,0 m. Huset w869907975 är 14,51 × 10,09 m. Väggarna står 0,46–0,47 m utanför husets fot på långsidorna (`conflicts.json`, fyra hörn). Det är samma avvikelse som ORDER 271 redovisade som öppen fråga.
- Bilder: `fore-08` och `fore-09` (två hörn).
- **Inget av vinbarens data är ändrat** (entrén, rummet, köplatserna). Anders 2026-10-06: Designs egen kontroll av entrén, rummet och köplatserna mot kartan kommer som tillägg. Den jämförs med testet innan något rättas.
- Testet tillåter rummets avvikelse, högst 0,5 m, och faller om den växer.
- **Köplatserna** (`interiorLayout.ts` `waitingSlots`, `declinedSlots`, `arrivalSlots`) är inte prövade i testet. De väntar på Designs tillägg.

## 5. Testet

`src/strategic/__tests__/order312PaVagen.test.ts`, fem fall:
1. vägytan har renderingens bredd per vägtyp (Hälleforsvägen mot gångvägen);
2. inget hus och inget uthus står på en väg;
3. bilarna kör bara på bilvägar;
4. vinbaren: entrén i husets fot och mot en gata, rummet inte på vägen eller i grannhuset;
5. rivalernas krogar och vagnarnas platser står på land.

Före rättningen föll testet (`conflicts-fore.json` `test`). Efter rättningen är det grönt (`conflicts.json` `test`).

## 6. Bilderna

Produktionsbygget, 1440 × 900. Sparfilen måndag i vinbaren, flyttad till torsdag. Kvällen startas som i spelarens flöde: baspaketet, dörrarna öppnas. Kameran går till gatans nivå (X), panoreras med musen och zoomas till 45 m tills målet står på konflikten. Ringen i bildens mitt är punkten.

- `fore-*.png`: konflikterna före rättningen, en bild per plats.
- `efter-*.png`: samma platser efter rättningen.
- Kamerans mål och felet i meter står i `shots-*.json` (`focusErrorM`). 23 av 24 bilder står inom 1,5 m från målet.
- **`efter-24` saknas i praktiken.** Platsen (−806,6, 1 076,5) ligger långt utanför byn. Kameran nådde den inte i efter-körningen (felet 1 378 m, tre försök). Mätningen i `conflicts.json` visar ändå ingen konflikt där.

## 7. Körningar

- `npm run typecheck`: grönt.
- `npm run build`: grönt (i `order312-on-road.mjs`, PHASE=efter).
- `npx vitest run`: 173 filer gröna, 12 hoppade, en föll på tid: `order131LoadSweep.test.ts` (341 s mot 300 s, datorn hade last 20–35 av andra jobb). Körd ensam: grön på 108 s.
- `order312PaVagen.test.ts`: 5 av 5 gröna (`conflicts.json` `test`), omkring 12–20 s.

## 8. Öppna frågor

- **Vinbarens rum** är 0,46 m bredare än huset på varje långsida (§4). Väntar på Designs tillägg. Sedan behöver Design eller Vision Owner välja: mindre rum, rummet utanför huset som nu, eller ett annat hus.
- **Köplatserna** prövas när Designs tillägg kommer.
- **Lastplatsen** ligger nu på Västra Bergvägen, öster om vinbaren. Om leveranserna ska komma från Prästgatan i söder behövs ett beslut.
- **Fotgängarna** i byn går på OSM-linjerna (`walkNetwork`), också där vägen är bortklippt. Det är inte prövat här.
