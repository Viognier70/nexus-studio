repo: Viognier70/nexus-studio
branch: main
path: frontend/src/strategic, documentation/game-design

## Last sync
date: 2026-08-29T20:40:00Z

### Updated i det här projektet
- Ny verksamhetsklass som rum: vinbar med lounger och DJ. Levererad som wineBarRoom.ts — samma form som brewpubRoom.ts (ren three.js, imperativ konstruktion en gång, ingen egen klocka, ingen sim-logik, FLAGS-block).
- Planlösningen läses radiellt i stället för i band: bardisken är mitten, flaskhyllan bakom den i −X, barstolarna framför. Loungen längs norra väggen, tvåorna i södra bandet, DJ:n vid södra väggen mitt för det öppna golvet. Kök i NV-hörnet med två stationer; vinförråd i SV-hörnet.
- 20 platser: 8 lounge (2 × 4 separata dynor, 0,38 m) + 6 barstolar + 6 vid tre tvåor. 4 ståplatser vid diskens norra kortände, utanför kapaciteten.
- Tre medvetna avvikelser från formmallen: bakhyllan är obligatorisk här (ölkrogen förbjöd den — samma siktlinjeresonemang, motsatt slutsats); golvet är en palettparameter, inte dekor; loungen är fyra dynor med 0,08 m glapp, inte en soffa.
- Paletten satt av silhouetteContrast.ts (ORDER 123 §5): fem golvzoner krymper figurfönstret till L 0,0509–0,1154, så garment/uniform siktar på L ≈ 0,083. Uppmätt kontrast 2,22–2,75 mot samtliga fem zoner (band 1,8–3,6), 60 par prövade, noll utanför; roll-ΔE minst 16,6 (krav 12). Exporterat som ZONE_FLOORS / GUEST_GARMENTS / STAFF_UNIFORMS + checkPaletteAgainstFloors().
- Mätningen ändrade geometrin två gånger: ögonhöjd räknas nu från sitsen (eyeHeightForSeat, 0,11 + sits + 0,84) i stället för en fast 1,29 m, och flaskhyllans visningsband flyttades upp till 1,35–2,13 m eftersom det nedersta planet låg bakom en disk på 1,10 m. Resultat: 6/6 barstolar ser alla fyra hyllplan, 20/20 platser ser hyllan, 20/20 ser DJ:n, smalaste passagen 0,95 m fri bredd.
- Sju flaggor mot §6, ny sedan ölkrogen: FLOOR_COLOUR i silhouetteContrast.ts är EN konstant men vinbaren har fem zoner — zonerna krymper figurfönstret, så en ny zon kan underkänna en redan godkänd palett. Beslutet hör i den filen. Övriga: BusinessClass saknar 'vinbar' (blockerande), DJ-tillstånd saknas, sommelierens ärende saknas, ståplats saknar tillstånd, loungen saknar sällskapsbegrepp, kökets stationer saknar rättmodell.
- HTML-modellen "Vinbaren" — vridbar, fyra vylägen inkl. gästens öga vid baren, gånglinjer, siktlinjer mot hyllan, och måtten läsna ur scenen.

## Screen map
| Skärm i projektet | Källfiler i repot |
| --- | --- |
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
- 2026-08-29T19:46:38Z — ölkrog med bryggeri: brewpubRoom.ts, tre band, siktlinje till jästankarna, fem flaggor.
- 2026-08-29T13:10:00Z — ORDER 121 / SD-004 §3: figureRig.ts, sex poser som ledvinklar, ansikten utgår, HTML-modell för riggen.
- 2026-08-14T10:52:40Z — mimik på huvudet, helkroppsrigg i reelen (SD-003, nu upphävt).
- 2026-08-13T10:38:34Z — matsalen i kontext: Restaurant.tsx, InteriorGuests.tsx, strings.sv.ts.
- 2026-08-13T10:20:00Z — första läsningen: kamerasystem, interiörkod, riggmått.
