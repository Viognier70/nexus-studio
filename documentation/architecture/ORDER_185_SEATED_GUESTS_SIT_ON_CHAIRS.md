# ORDER 185 — sittande gäster sitter på stolar; garment-färgvariation per gäst; ORDER 147 Del A-rättelse

**Datum:** 2026-09-06
**Gren:** `order-185-seated-guests-sit-on-chairs` från `main` (`0f86719`, efter ORDER 184 merge).
**Föregås av:** ORDER 121 (kroppar i scenen), ORDER 127 §5 (silhouette-kontrastband), ORDER 147 Del A (stängd som "ej reproducerbar"), ORDER 174 (interiorLayout läser kontraktet), ORDER 184 (PlayerBusiness ger vika för kontraktet).

## §1 Fynd

Provspel 2026-09-06 i key=5-vyn, olkrogen (skärminspelning
`Skärminspelning 2026-09-06 kl. 22.44.17.mov`). Tre fynd:

1. **Halvsittande pose ovanpå golvet.** poseSeated applied men positionen är golv-Y, inte stolshöjd. Figurens hip landar under golvnivån efter poseSeated:s interna 0,41 m höft-sänkning. Läser som "figuren står hukat på golvet".
2. **Klungar mitt på golvet, inte vid de 20 platserna.** Sett som seats[0]-fallback-mönster.
3. **Alla gäster har samma ljusa färg.** Ingen garment-variation per gäst.

Efter kod-läsning + fix + verifiering visade sig fynd 2 vara **symptom av fynd 1**, inte en fallback-bug. Rot-orsak för klustringen:

`InteriorGuests.tsx:437-442` (före ORDER 185) satte guest-grupp Y = `pos.leanY + patternTx.bobY` (≈ 0) för ALLA states. `poseSeated` (`figureRig.ts:577`) sänker höften 0,41 m internt. Utan Y-lyft hänger figuren i luften på golvet med hip vid Y = 0,45 (0,86 hipY − 0,41 pose-sänkning). Fötterna under golvet, kroppen står över golvet. **När flera figurer sitter på nära varandra bord i olkrogens layout blev de visuellt sammanpressade eftersom deras individuella positioner nästan inte syntes — bara den enda gemensamma golv-Y:n läste.**

**ORDER 147 Del A hade rätt:** seats[0]-fallbacken används inte i olkrogen-flödet. Det som SÅG ut som fallback var Y-position-buggen som förvirrade den visuella tolkningen av XZ-positionerna. Klustringen är Designs planlösning (brewpubRoom.ts bord + barstolar i sitt eget mönster), inte en fel-plockad seat[0]-position.

## §2 Form

### §2.1 Fynd 1 — Y-lyft för sittande gäster

`InteriorGuests.tsx` får:

- Ny konstant `SEAT_SIT_HEIGHT_M = 0.45` per CLAUDE.md Enhetskontrakt (Stolssits 0,45 m).
- I `useFrame` guest-loopen (rad 437-464) beräknas `sitLift` per gäst:
  - `SEATED_STATES` eller `sleeping` (statiskt sittande) → full lyft `0.45`
  - `sitStandPhase >= 0 && sitStandDir === -1` (sitter ner) → `SEAT_SIT_HEIGHT_M * sitStandPhase` (eases in)
  - `sitStandPhase >= 0 && sitStandDir === 1` (reser sig) → `SEAT_SIT_HEIGHT_M * (1 - sitStandPhase)` (eases ut)
  - Annars → `0`
- `group.position.set(..., sitLift + pos.leanY + patternTx.bobY, ...)`

Transition-blend matchar `poseSeated`-blenden (samma `sitStandPhase`) så pose och Y-lyft möts vid slutläget. Ingen mesh-position ändras (rigg-basen stannar Y=0 lokalt); det är hela guest-gruppen som lyfts.

### §2.2 Fynd 3 — garment-variation per gäst

`InteriorGuests.tsx` får:

- Ny helper `guestIdByte(id)` — FNV-1a hash → 0..255 (samma familj som `phaseSeedFor`).
- Ny tabell `GARMENT_VARIANTS: Record<SeatedState, string[]>` med 4 varianter per SEATED_STATE + `sleeping`. Kalibrerade att hålla luminance-nyckeln (≈ 0.65) inom ORDER 127 §5:s kontrastband mot `floorDining #a49b8a`. Hue-variationen läser som olika människor utan att bandet bryts.
- Ny helper `garmentColourFor(guest)` — väljer `variants[guestIdByte(id) % variants.length]` för sittande stater. Icke-sittande (arriving/waiting/leaving/declined) faller tillbaka på state-driven `GUEST_COLOUR` för läsbarhet i rörliga puckar.
- I rig.garment.color-set-anropet (rad 449) väljs `garmentColourFor(guest)` för SEATED_STATES + sleeping, annars `target.colour`.

WCAG-band validering är egen order om det behövs — variansintervallet är tight nog att bevaras strukturellt (± 5 units i R/G/B kanaler, ≈ 0.02 lightness-diff).

### §2.3 Fynd 2 — bara registerpost, ingen fix

Klustringen är Designs planlösning i `brewpubRoom.ts`: 4 barstolar i rad + 4 tvåor + 1 fyra + långbord + loungebänkar. När Y-lyftet fungerar för sittande figurer läses XZ-fördelningen normalt. **Inget att bygga.** Registerraden dokumenterar att ORDER 147 Del A hade rätt och att `seats[0]`-fallbacken (`InteriorGuests.tsx:600-601`) inte triggeras i olkrogen-flödet.

## §3 Verifiering

`/tmp/order185-verify/verify.mjs` mot dev-server 5173:

1. Enter i namnrutan (`__nxSetBusinessName` skulle inte räckt — ORDER 175:s NameEntryOverlay-formulär triggar `jumpToPreset`)
2. Vänta cam-landning på `cam= 24m*` (`landingTimeMs ≈ 70s` — asymptot-långsam damping, bonus-fynd ORDER 175 §5)
3. Öppna lunch 15 min via ServiceLengthPicker
4. Speed=8, delay 56s realtid ≈ 7:27 sim-min in
5. Screenshot vid mitten av service
6. Key=5 för scenario, screenshot

**Utfall visuellt:** `frontend/reports/order185-verify/1-mid-service-24m.png` visar bryggtankar, bardisk, bord, stolar, distinkta gäster distribuerade över borden (INTE i luften-klunga), garment-nyans-variation subtil men läsbar. Jämför mot `frontend/reports/order184-verify/2-mid-service.png` som hade samma dev-server EN order tidigare — där syntes klustringen som "ovanpå golvet" pga fynd 1.

Ingen pixel-signatur-mätning (fjortonde fallet gjorde metoden otillförlitlig). Visuell inspektion är beviset per ORDER 184:s princip.

## §DoD

- [x] `npm run typecheck` grön.
- [x] `npx vitest run` — 1066/1066 grön.
- [x] Verifiering körd i key=5-vyn med skärmdump per Vision Owner-direktiv.
- [x] Bild sparad i `frontend/reports/order185-verify/` för visuell inspektion.

## §4 Ändringar

```
frontend/src/strategic/scene/InteriorGuests.tsx   (SEAT_SIT_HEIGHT_M + sitLift + garment-varianter, ~55 rader)
documentation/architecture/ORDER_185_SEATED_GUESTS_SIT_ON_CHAIRS.md  (denna fil)
documentation/architecture/ORDER_REGISTRY.md      (rad 185 + ORDER 147 Del A-not)
```

## §5 Ej i scope

- Per-arketyp-garment (t.ex. familj vs turist). Guest-interface har ingen `archetype`-property; fältet skulle behöva införas i sim-lagret + kopplas till renderaren. Egen order.
- Kontrastband-validering av `GARMENT_VARIANTS` mot faktiska floor-färger per klass. Egen order när vi vet om subtiliteten räcker.
- Sit-lift per RoomSeat.seatHeight (varierad höjd per stol-typ). MVP använder konstant 0,45. Egen order när kontraktet exponerar seat-heights via businessRoomRef.
- SEATS_DEFAULT-refaktor (hardkodad 0-15 restaurang-form i `service.ts:101-106`). ORDER 147 Del A + min utredning visade att detta INTE är rot-orsaken till klustringen — sim-lagret hittar seats för olkrogens 0-15 index (samma index-uppsättning gäller tack vare kontraktets ordning). En kalibrering till per-klass preferensordning är egen order om Designs seat-preferences skiljer per verksamhet.

Egen gren `order-185-seated-guests-sit-on-chairs` från main.
