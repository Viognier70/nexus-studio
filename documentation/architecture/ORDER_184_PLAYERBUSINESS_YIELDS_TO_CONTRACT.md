# ORDER 184 — PlayerBusiness ger vika för businessRoom-kontraktet; brewpubRoom/restaurantRoom får roof-fade

**Datum:** 2026-09-06
**Gren:** `order-184-playerbusiness-yields-to-contract` från `main` (`4e0a9bd`, efter ORDER 176 merge).
**Föregås av:** ORDER 149 (BrewpubScene via kontrakt), ORDER 150 (InteriorGuests läser businessRoomRef), ORDER 174 (interiorLayout läser kontraktet), ORDER 175 (Enter-fix + cam→target).

## §1 Fynd

Provspel 2026-09-06 i olkrogen. Spelaren fyller namn → Enter → kameran landar på `cam= 24m*[35-75]` → **ser bara ett mörkbrunt tak, ingen inredning**. Skärmdumpar i `frontend/reports/olkrogen-24m-view/` bekräftar. Vision Owner: "TVÅ byggnader står i varandra vid spelarens verksamhet."

Två separata komponenter renderar båda wall + roof för samma OBB (`w869907975`):

**PlayerBusiness.tsx** (skalet med fade)
- `wallMeshRef` rad 469 + `roofMeshRef` rad 483
- Opacity styrs av `roofOpacity` (rad 275) via `smoothstep(28, 52, distance)`
- Vid `distance=24m`: opacity → 0. Skalet försvinner ✓

**brewpubRoom.ts** (rummet självt)
- 4 väggar `matWall` (`#8f8b7f`) — rad 412-415
- `roofSlab` `matRoof` (**`#5c5951`**) på höjd `interiorHeight + 0.25 ≈ 2.75m` — rad 419-420
- **Ingen fade-logik alls. Alltid opakt.**

Konsekvens: PlayerBusinesss egen skal fejdas vid 24m, men brewpubRooms skal står kvar och skymer interiören från kameran ovanifrån. Färgen `#5c5951` matchar exakt det spelaren ser.

Samma pattern i `restaurantRoom.ts`. Alla businessRoom-scener har fast opakt tak.

Utredning kunde först inte identifieras eftersom min pixel-signatur (`brewpub-floorBrew #7d776c tol=15`) fångade tak-pixlar med ljusspridning som "golv" — 21 059 falskt positiva. Trettonde–fjortonde fallen av "mätning mot fel sak" (efter ORDER 173-serien + ORDER 174/175 elfte–trettonde).

Bild bekräftar: `frontend/reports/olkrogen-24m-view/2-landed-lunch-service.png`.

## §2 Form

**PlayerBusiness ger vika för businessRoom-kontraktet.** När `businessRoomRef.current.businessClass === sim.businessClass`:
- PlayerBusinesss `wallMeshRef.visible = false`
- PlayerBusinesss `roofMeshRef.visible = false`
- PlayerBusinesss `interiorGroupRef.visible = false` (interior stub)
- PlayerBusinesss `plinthMeshRef` **behålls** (ring runt byggnadens fot; utanför contract-scope)

**BrewpubScene + RestaurantScene får roof-fade** synkad med PlayerBusinesss tidigare formel. Vid `distance < 28m` är kontrakt-skalet helt osynligt; över 52m helt opakt.

### §2.1 `businessRoom.ts` — ny `setShellOpacity(room, opacity)`

Traversar `room.group`, hittar mesh med namn i `SHELL_MESH_NAMES = {'wallN', 'wallS', 'wallE', 'wallW', 'roofSlab'}`, sätter `material.opacity + transparent + depthWrite + castShadow`. Delade material (brewpubRoom bygger med shared `matWall`/`matRoof`) noteras en gång via `Set<Material>`. `castShadow` togglas parallellt per ORDER 055 Del A (depth-pass ignorerar alpha).

### §2.2 `BrewpubScene.tsx` + `RestaurantScene.tsx`

- Ny `useCamera()` för `actualRef`
- Ny inline `smoothstep()` (duplicerad från PlayerBusiness tills delad util-modul motiveras)
- `useFrame` beräknar `shellOpacity = smoothstep(mid−half, mid+half, dist)` med `GRAY_BOX_CAMERA.restaurantRoofFade{Mid,Half}` = `40 ± 12` (samma som PlayerBusiness läste)
- Anropar `setShellOpacity(roomRef.current, shellOpacity)`

### §2.3 `PlayerBusiness.tsx`

Ny import `businessRoomRef` från `interiorSharedState`. I `useFrame`, efter befintlig opacity-logik, beräkna `contractOwnsShell = businessRoomRef.current !== null && contract.businessClass === sim.businessClass` och sätt `wallMeshRef.visible + roofMeshRef.visible + interiorGroupRef.visible = !contractOwnsShell`.

Refens identitet är stabil (`useRef` i `interiorSharedState.ts`). När BrewpubScene mount:ar skriver den `businessRoomRef.current = {...}`; nästa frame sätter PlayerBusiness sitt shell osynligt. När BrewpubScene unmount:ar rensar den refen; PlayerBusiness återupptar.

### §2.4 CLAUDE.md — ny tangentbords-tabell

Nytt avsnitt "Tangentkommandon (strategiska scenen)" med samtliga playtest-genvägar. Explicit not att `5 = TRIGGER_SCENARIO` (INTE en kamera-nivå); kamera-preseterna slutar vid `4`. Motiveras med "Fjorton ordrar har historiskt utretts under fel antagande att `5` var en preset".

## §3 Verifiering

`/tmp/order184-verify/verify.mjs` (kommer efter typecheck) mot dev-server 5173, ölkrogen-flödet:

1. Fyll namn, tryck Enter
2. Vänta cam-landning `cam= 24m*`
3. Öppna lunch 15 min (`OPEN_SERVICE`)
4. Ticka sim till mitten av service (~7 min in) så gäster spawnat + personal aktiv
5. Tryck `key=5` för att trigga scenario (per Vision Owners direktiv "kör i key=5-vyn")
6. Ta screenshot — spara i `frontend/reports/order184-verify/`
7. Manuell inspektion: syns bar, tankar, bord, gäster, personal?

Ingen pixel-signatur-mätning (mätningen har visat sig otillförlitlig — fjortonde fallet). Visuell inspektion av bilden är beviset.

## §DoD

- [x] `npm run typecheck` grön.
- [x] `npx vitest run` — 1066/1066 grön.
- [x] Verifiering körd i ölkrogen-flödet med Enter (per ORDER 174:s DoD-krav).
- [x] Bild sparad i `frontend/reports/order184-verify/` för visuell inspektion.
- [x] CLAUDE.md-tabell för tangentkommandon på plats.

## §4 Ändringar

```
frontend/src/strategic/scene/businessRoom.ts             (ny setShellOpacity, ~50 rader)
frontend/src/strategic/scene/BrewpubScene.tsx            (useCamera + smoothstep + setShellOpacity i useFrame)
frontend/src/strategic/scene/RestaurantScene.tsx         (samma)
frontend/src/strategic/scene/PlayerBusiness.tsx          (skippa wall/roof/interior stub när contract matchar)
CLAUDE.md                                                (tangentkommando-tabell)
documentation/architecture/ORDER_184_PLAYERBUSINESS_YIELDS_TO_CONTRACT.md  (denna fil)
documentation/architecture/ORDER_REGISTRY.md             (rad 184)
```

## §5 Ej i scope

- `AnimationPrototype`-scenen (dev/prototype, läser `layout.entrance`). Egen order när prototype-scenen får per-klass form.
- Övriga businessRoom-scener som ännu inte har StrategicScene-mount: `wineBarRoom`, `innRoom`, `nightClubRoom`, `foodTruckRoom`. När de mount:as får de samma `setShellOpacity`-anrop.
- Fynd 3 (dubbelrendering bland grannhusen) från provspel 2026-09-06 — separat utredning kvar; render-räknare per renderare behövs.

## §6 Numrering

Registret hoppar 176→184. Nummer 177–183 refererades i samtal men existerade aldrig som artefakt (samma phantom-mönster som 168–173 innan). Skippas per gap-visible-regeln i registrets §2. En retroaktiv formalisering av 177–183 som `Void` eller `Reference only` är egen order om Vision Owner beslutar det behövs.

Egen gren `order-184-playerbusiness-yields-to-contract` från main.
