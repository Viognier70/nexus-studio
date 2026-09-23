# ORDER 168 — Ytterväggen mot marken (fasad + interior får inte skymmas)

**Repo** `Viognier70/nexus-studio` · **Gren** `order-168` (från `main`)
**Klass** AUTONOM med VO-eskalering vid strukturell konflikt
**Datum** 2026-09-02
**Följer** ORDER 162 §5-rekommendationen 2026-09-01

---

## 1. Läget

ORDER 162 mätte skillnaden mellan grannarnas alltid-opaka wall+plinth
(`OsmBuildings.tsx:1341` ExtrudeGeometry-mesh utan `transparent`;
`BuildingPlinth`-mesh utan `transparent`) och PlayerBusiness egna
wall+plinth som fejdar till opacity 0 vid myBusiness-preset (dist 24 m).
Se `frontend/reports/order162/wallSurfaceAudit.json` — `finding` och
`recommendationFor23` bär mätningen och slutsatsen.

Vision Owner-beslut 2026-09-01: implementera fasaden som möter marken
samma mönster som grannarnas.

**Kritiskt VO-krav (2026-09-01):** *"skalet får inte skymma interiören
vid den vy där man spelar. Verifiera vid cam=24m att både fasaden syns
OCH att gäster och personal går att se. Om det inte går samtidigt är
det ett fynd — rapportera med skärmdumpar innan du väljer."*

Det innebär att ordern måste bevisa båda samtidigt, inte bara ena.

---

## 2. Vad som ändras

### 2.1 Fas A — minsta ändringen (default)

- `PlayerBusiness.tsx:318` — ta bort `const wallOpacity = roofOpacity`.
  Ersätt med `const wallOpacity = 1`. Wall-materialet blir opakt konstant.
- `PlayerBusiness.tsx:329-345` — plinth-materialets opacity slutar följa
  wallOpacity. Sätts konstant till 1 (opakt) och `transparent = false`.
  Motiverad avvikelse från ORDER 159 §DoD 2 (som lyft att sockeln inte
  ska stå kvar när väggen är borta) eftersom väggen inte längre försvinner.
- `castShadow`-toggle på wall + plinth kan tas bort eller ersättas med
  `castShadow={true}` statiskt (som grannarna). ORDER 055 Del A-motivet
  gäller bara när opacity kan bli < 0.5 — här är opacity alltid 1.
- Roof-fade rörs INTE. `roofOpacity` fejdar fortfarande med kamera-distans
  som författat i ORDER 042 §3.2 så interiören kan visas via genomskinligt
  tak vid cam < 28 m.

### 2.2 Verifieringsscript

Nytt skript `frontend/scripts/order168-facade-and-interior.mjs`:

1. Startar Vite med `#preset=myBusiness&playtest=1&business=restaurant&period=lunch`.
2. Väntar in att `__nxSetBusinessName` finns; sätter namn. (Detta krävs
   för att `InteriorGuests`/`InteriorStaff` ska montera guest+staff-pucks.)
3. Väntar 3 s så sim-tick har spawn:at gäster in i lokalen.
4. **Fasad-check:** projicerar player-centre till skärm vid ground-Y
   (y=0.02) och läser en pixel. Om R+G+B > threshold (t.ex. > 60 vardera):
   `facadeVisible = true`. Även vertex-audit via ORDER 162:s hook om den
   finns i main (annars re-mount lokal probe).
5. **Interior-check:** hämtar `window.__nxGuestPositions` (existerande dev-hook
   från `InteriorGuests.tsx:250`), projicerar första guest-position till
   skärm, läser pixel. Om R+G+B avviker från golv-färg (`INTERIOR_FLOOR_COLOUR
   = '#a08462'` ≈ R160 G132 B98) med minst threshold på minst en kanal:
   `interiorVisible = true`.
6. Skärmdumpar två poser: `myBusiness-view.png` (dist 24 m), `village-view.png`
   (dist ~60 m, för sanity-check att byggnaden fortfarande ser normal ut).
7. Skriver `frontend/reports/order168/facadeAndInterior.json` med:
   - `facadeVisible` (bool)
   - `interiorVisible` (bool)
   - `facadePixel` / `interiorPixel` (RGB)
   - `guestPositionsSampled` (int)
   - `finding` — en av tre:
     - `"OK — fasad + interior syns samtidigt vid cam=24m"` (båda true)
     - `"FYND — fasad syns men interior skyms av väggarna"` (facade true, interior false)
     - `"FYND — interior syns men fasad saknas"` (facade false, interior true)
     - `"FYND — varken fasad eller interior syns"` (båda false)

### 2.3 Om Fas A ger båda `true`

Ordern klar. §DoD checkas av. Ingen Fas B behövs.

### 2.4 Om Fas A ger `interiorVisible = false` (skalet skymmer)

Rapportera fynd med båda skärmdumparna kopplade. **Föreslå Fas B som
uppföljning** men implementera INTE utan VO-godkännande:

**Fas B (ej implementerad utan VO-val):** per-face-culling (dollhouse-
mönster som ORDER 042 §3.2-kommentaren refererar till som "the proper
long-term answer"). Split `sideWallGeometry` i fyra per-edge-meshar,
i `useFrame` beräkna för varje mesh `dot(outwardNormal, cameraDir)`;
opacity = `outsideDot > 0 ? nearWallOpacity : 1` med `nearWallOpacity =
smoothstep(28, 52, dist)` (samma fade-kurva som roofOpacity). Effekt:
vid dist > 52 m är alla väggar opaka (village view: normal byggnad);
vid dist < 28 m är kamera-riktade väggar transparenta (dollhouse: två
opaka fjärran-väggar bildar fasad, två near-väggar borta så interiören
syns). Plinth förblir alltid opak — höjden 0.42 m skymmer inte 1.70 m
gäster meningsfullt vid pitch 50°. Roof-fade oförändrad.

Motivet till att INTE gå direkt till Fas B: VO-kravet lyder "Om det
inte går samtidigt är det ett fynd — rapportera med skärmdumpar innan
du väljer." Fas B ändrar strukturen på väggen (fyra meshar istället för
en). Det är ett större arkitekturval än Fas A och ska bekräftas.

---

## 3. Vad som INTE görs

- **Ingen ändring av `OsmBuildings.tsx`.** Grannarnas rendering är
  referensen.
- **Ingen ändring av roof-fade-kurvan.** ORDER 042 §3.2:s
  `restaurantRoofFadeMid=40, restaurantRoofFadeHalf=12` är kalibrerat och
  gör interiören synlig via genomskinligt tak; ändras inte här.
- **Ingen implementation av Fas B utan VO-val** om Fas A visar sig
  strukturellt otillräcklig.

---

## 4. Definition of Done

1. Fas A implementerad i `PlayerBusiness.tsx` (wall+plinth konstant opaka,
   fade-koppling borta).
2. Verifieringsscript `frontend/scripts/order168-facade-and-interior.mjs`
   skriver `reports/order168/facadeAndInterior.json` med båda bool-fälten
   och skärmdumpar.
3. **Om båda true**: ordern klar; §DoD 4-6 nedan.
4. **Om ena false**: fyndrapport i §5 Utfall, skärmdumpar in-committade,
   Fas B beskriven men EJ implementerad utan VO-svar.
5. `documentation/architecture/ORDER_168_YTTERVAGGEN_FASAD_OCH_INTERIOR.md`
   (denna fil) uppdaterad med §5 Utfall.
6. `ORDER_REGISTRY.md` uppdateras från Pending → Executed 2026-09-02 (om
   klar) eller Pending — awaiting VO decision (om Fas B behövs).
7. Typecheck grön, full svit grön.
8. Egen gren `order-168` från main. Commit + PR mot main.

---

## 5. Utfall

*(skrivs efter Fas A körts + verifierats)*
