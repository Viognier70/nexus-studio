repo: Viognier70/nexus-studio
branch: main
path: frontend/src/strategic, documentation/game-design

## Last sync
date: 2026-08-30T08:20:00Z

### Updated i det här projektet
- Restaurangen levererad som restaurantRoom.ts — fjärde och sista verksamhetsklassen, samma form som brewpubRoom/wineBarRoom/innRoom. Ersätter Restaurant.tsx.
- BLOCKERANDE FYND: repot har två oförenliga matsalar. RESTAURANT_INTERIOR i content/grythyttan.ts (landmärke, 16 × 12 m, axelparallellt, sex bord i 2 × 3-raster, bar längs västra väggen, verificationStatus 'placeholder') renderas av Restaurant.tsx. interiorLayout.ts (OBB w869907975, 15,6 × 11,8 m roterad 7°, fem bord i en rad, bar längs -Z, TOTAL_SEATS = 16) styr var InteriorGuests och InteriorStaff placerar figurer. Gästerna sitter i en annan byggnad än borden står i. Rummet följer interiorLayout — TOTAL_SEATS matar reducerarens kapacitet och ORDER 042 §3.2 föreskriver OBB. RESTAURANT_INTERIOR.bar/.kitchen/.tables/.staffHomes blir död kod vid montering och ska raderas.
- Planlösningen är tre band tvärs långaxeln: runway, bardisk, barstolar, servicegång, bordsrad, norra remsan. Baren är en SERVICEDISK, inte ett mål — fyra av sexton platser vänder sig mot den och de fem borden vänder sig från den, så den får varken bakhylla eller skyltning.
- interiorLayouts BAR_WIDTH_M 1,6 + BAR_OFFSET_M 0,6 lämnade 0,6 m bakom disken, vilket inte är en passage för en kropp på 0,46 m. Löst utan att röra en plats: framkanten ligger kvar på Z = -3,70 (barstolarna härleds ur den) och disken görs 0,70 m djup. Runway 1,30 m. Konstanten blandar ihop strippdjup med diskdjup och bör delas i interiorLayout.
- Platserna är låsta i antal OCH ordning: 4 × tvåa + 1 × fyra + 4 barstolar = 16, bordsplatser index 0-11 före barstolar 12-15. checkSeatContract() prövar båda. Hela ORDER 043 §6-uppsättningen (waitingSlots, declinedSlots, arrivalSlots, deliveryBay, deliveryApproach) exponeras med oförändrade värden.
- Två mätfel rättade under bygget: takhöjden lästes ur den visningsskalade väggruppen och rapporterade 1,00 m i ett rum som är 3,00 (läses nu ur en väggmesh), och entrégången gick på diagonalen och passerade 0,42 m från yttersta tvåans stol (entrénod på lokal X 6,8 — nu 0,93 m smalast).
- Uppmätt: inredning 15,20 × 11,40 m, fri takhöjd 3,00, högsta inredning 2,22 (spiskåpan), bardisk 10,92 m, runway 1,30 m, smalaste passage 0,93 m, platskontraktet håller, kontrast 2,66-2,89 mot tre golvzoner, 33 par prövade utan avvikelse, roll-ΔE 17,9.
- Sju flaggor, varav en blockerande (två layouter) och en ny sorts fynd: landmärket heter 'gry-vinbar-placeholder-01' fast det är restaurangen, vilket nu när vinbaren finns som egen klass är aktivt vilseledande.
- ORDER - restaurangen.md skriven. HTML-modellen "Restaurangen — matsalen": fyra vylägen, seatIndex-etiketter, gånglinjer, ORDER 043-slots som annotation.

## Screen map
| Skärm i projektet | Källfiler i repot |
| --- | --- |
| Restaurangen - matsalen.dc.html + restaurantRoom.ts | frontend/src/strategic/scene/Restaurant.tsx (palett, skal, skylt, avståndstoning), business/interiorLayout.ts (OBB-ram, TABLE_SPECS, barmått, seatIndex-ordning, ORDER 043 §6-slots, leveransankare), content/grythyttan.ts (RESTAURANT_INTERIOR, GRAY_BOX_CAMERA, landmärket), scene/silhouetteContrast.ts (kontrastband) |
| Rekvisitan - hander och huvuden.dc.html + figureProps.ts | frontend/src/strategic/ui/foodtruck/archetypes.ts (HandProp, HeadTopping, SKIN_TONES, ArchetypeBody), scene/figureRig.ts (ankare, huvudradie, kalottens phi), scene/silhouetteContrast.ts (bandet 1,8–3,6), scene/Restaurant.tsx + wineBarRoom/brewpubRoom/innRoom (de fjorton golvzonerna) |
| Gastgiveriet - gard och langor.dc.html + innRoom.ts | frontend/src/strategic/scene/Restaurant.tsx (formspråk, palett, möbelmått), silhouetteContrast.ts (FLOOR_ZONES_BY_BUSINESS, MIN/MAX kontrast, MIN_ROLE_DISTINCTION_DELTA_E, paletteZoneCheck), business/interiorLayout.ts (OBB-lokal ram, seatIndex-ordning, waitingSpot-standoff), business/businessClass.ts (värdshus-klassen som ersätts, hasOvernight), documentation/architecture/ORDER_127_BANDET_BLIR_ZONMEDVETET.md |
| Ölkrog med bryggeri.dc.html + brewpubRoom.ts | frontend/src/strategic/scene/Restaurant.tsx (formspråk, palett, mått), frontend/src/strategic/business/interiorLayout.ts (OBB-lokal ram, seatIndex-ordning, entrance/waitingSpot-standoff), frontend/src/strategic/business/businessClass.ts (verksamhetsklassens struktur, capacityFor) |
| Vinbaren.dc.html + wineBarRoom.ts | frontend/src/strategic/scene/Restaurant.tsx (formspråk, palett, golvfärg #a89577), silhouetteContrast.ts (kontrastband 1,8–3,6, FLOOR_COLOUR, MIN_ROLE_DISTINCTION_DELTA_E), business/interiorLayout.ts (OBB-lokal ram, seatIndex-ordning, entrance/waitingSpot-standoff), business/businessClass.ts (klassens struktur, capacityFor), documentation/architecture/ORDER_123_SILHUETTEN_LASES.md |
| Figurrigg - kroppar i rummet.dc.html + figureRig.ts | frontend/src/strategic/scene/AnimationPrototype.tsx (mått, gångkadens), InteriorGuests.tsx (1,70 m, SIT_DIP_M, pip-ankare), InteriorStaff.tsx (axelradie, uniformsfärger), patternTransform.ts (PIP_OFFSET_ABOVE_PUCK_TOP_M) |
| Personal - perspektiv och rörelser.dc.html | documentation/game-design/CAMERA_AND_VIEW_SYSTEM.md, frontend/src/strategic/scene/InteriorStaff.tsx, RestaurantActors.tsx, Restaurant.tsx, CLAUDE.md |
| Reel - gaster och personal.dc.html | frontend/src/strategic/scene/InteriorStaff.tsx, InteriorGuests.tsx, documentation/game-design/CAMERA_AND_VIEW_SYSTEM.md, frontend/src/strategic/content/strings.sv.ts |
| Yrkesroller - rorelse och uttryck.dc.html | frontend/src/strategic/scene/InteriorStaff.tsx (uniformsfärger, hastighetskonstant), content/strings.sv.ts (roller, staffTasks) |
| Matsalen - i kontext.dc.html | frontend/src/strategic/scene/Restaurant.tsx, InteriorStaff.tsx, InteriorGuests.tsx, content/strings.sv.ts |
| StaffPuck.dc.html | frontend/src/strategic/scene/InteriorStaff.tsx (mått, uniformsfärger), RestaurantActors.tsx (hudton) |
| StaffFace.dc.html | frontend/src/strategic/content/strings.sv.ts (staffTasks), load-begreppet i InteriorStaff.tsx |
| Guest Animation Reel.dc.html | — (byggd före repokopplingen) |

## Sync history
- 2026-08-30T07:05:00Z — rekvisitan: figureProps.ts, fyra handföremål och sex huvudbonader, bandets två fönster.
- 2026-08-29T22:14:26Z — gästgiveriet: innRoom.ts, U-form kring gård, 100 platser, 80 rum, loftgång, gräsmatta/boule/utebar.
- 2026-08-29T20:40:00Z — vinbaren: wineBarRoom.ts, radiell plan kring bardisken, lounger och DJ, fem golvzoner, sju flaggor.
- 2026-08-29T19:46:38Z — ölkrog med bryggeri: brewpubRoom.ts, tre band, siktlinje till jästankarna, fem flaggor.
- 2026-08-29T13:10:00Z — ORDER 121 / SD-004 §3: figureRig.ts, sex poser som ledvinklar, ansikten utgår, HTML-modell för riggen.
- 2026-08-14T10:52:40Z — mimik på huvudet, helkroppsrigg i reelen (SD-003, nu upphävt).
- 2026-08-13T10:38:34Z — matsalen i kontext: Restaurant.tsx, InteriorGuests.tsx, strings.sv.ts.
- 2026-08-13T10:20:00Z — första läsningen: kamerasystem, interiörkod, riggmått.
