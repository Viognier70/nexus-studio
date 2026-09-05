# ORDER 172 — Kameran, interiören och playwright-scripten: utredning

**Repo** `Viognier70/nexus-studio` · **Gren** `order-172-camera-interior-utredning` (från `main`)
**Klass** AUTONOM — utredning
**Datum** 2026-09-05
**Följer** provspel 2026-09-05 (ölkrogen, cam=24m, vyn visar taket utifrån)
**Följer** ORDER 160 — verifierande tal läses ur skriptets utdata
**Bara utredning.** Ingen produktionskod ändras.

---

## 1. Läget

Provspel 2026-09-05 i ölkrogen: `cam=24m`, vyn visar taket utifrån —
ingen interiör. ORDER 161 mätte att myBusiness-preset:et landar på 24 m
och ORDER 162 att interiören ska synas i det bandet. Det stämmer inte
med vad spelaren ser.

Frågan har två delar:

1. **Vad krävs faktiskt** för att `InteriorGuests`, `InteriorStaff` och
   rummet ska renderas? Kameraavstånd, vy-nivå, clip-plan, eller något
   annat?
2. **Hur kom playwright-scripten i ORDER 144/149/150 in i rummet?** De
   rapporterade skärmdumpar "inifrån".

Talvärden citeras ur `frontend/reports/order172/interior-probe.json`
och screenshoten `frontend/reports/order172/view.png`.

---

## 2. Vad koden kräver för att interiören ska renderas

Fem lager sitter mellan spelaren och en synlig interiör:

### 2.1 PlayerBusiness taket + väggarna + sockeln (skalet)

`PlayerBusiness.tsx:270-345` (useFrame). Vid varje frame:

- `roofOpacity = smoothstep(restaurantRoofFadeMid − restaurantRoofFadeHalf,
  restaurantRoofFadeMid + restaurantRoofFadeHalf, dist)`
- `wallOpacity = roofOpacity` (samma kurva)
- `plinthOpacity = wallOpacity` (per ORDER 159 §DoD 2)

`GRAY_BOX_CAMERA.restaurantRoofFadeMid = 40`, `.restaurantRoofFadeHalf = 12`
(`grythyttan.ts:275-276`). Roof-fade-band [28, 52]. Vid `dist < 28` är
taket opacity = 0. Motsvarande `mat.transparent = true`, `mat.depthWrite =
false`. Krävs för att kameran ska "se genom" taket.

**Konsekvens:** om useFrame-loopen som räknar `roofOpacity` inte kör (eller
kör innan `actualRef.current.distance` konvergerat mot preset:et), står
`mat.opacity` kvar på sitt default-värde 1 och taket är opakt.

### 2.2 PlayerBusiness interior stub (bar, golv, bord som förlaga)

`PlayerBusiness.tsx:378`. `interiorGroupRef.current.visible =
interiorVisibility > 0.02` där `interiorVisibility = 1 − smoothstep(
restaurantInteriorFadeMid − restaurantInteriorFadeHalf,
restaurantInteriorFadeMid + restaurantInteriorFadeHalf, dist)`.

`restaurantInteriorFadeMid = 55`, `.restaurantInteriorFadeHalf = 20`
(`grythyttan.ts:277-278`). Interior-fade-band [35, 75]. Vid `dist < 35`
är visibility ≈ 1.

### 2.3 InteriorGuests + InteriorStaff

`InteriorGuests.tsx:286-292` och `InteriorStaff.tsx:210-215`. Båda
använder samma `interiorVisibility`-formel som §2.2 och samma
`visible > 0.02`-gate. Vid `dist < 35` är båda synliga.

### 2.4 RestaurantScene + BrewpubScene (rummet: bord, disk, jäskar, …)

`BrewpubScene.tsx:98` och `RestaurantScene.tsx`. Grupperna renderas
UTAN visibility-fade — de gate:as bara på `sim.businessClass ===
'ölkrogen'` respektive `'kvarterskrogen'`. Rummet renderas alltid när
klassen matchar. Inget kameraavstånd påverkar deras visibility.

### 2.5 businessRoomRef (kontraktet)

`interiorSharedState.ts`. `BrewpubScene`s `useEffect` skriver
`businessRoomRef.current = { businessClass: 'ölkrogen', seats: [...20
platser], capacity: 20, ... }` vid mount. `InteriorGuests` läser
kontraktet (per ORDER 150) för att placera gäster på rätt platser.
Fältet `snapshots.businessRoomRef` i JSON bekräftar att kontraktet är
monterat efter mount.

**Sammanfattning §2:** interiör synligt kräver:
1. `dist < 28` → roof/wall/plinth opacity 0 (skalet försvinner)
2. `dist < 35` → interior stub + InteriorGuests + InteriorStaff visible
3. `sim.businessClass` matchar mot scen-komponent → rummet monterat

Krav #2 och #3 gäller separat från kamera-fejden — Brewpub/Restaurant-
rummet är alltid synligt, men det ligger INUTI byggnadens skal. Utan
krav #1 (skalet transparent) skyms rummet av taket + väggarna.

`myBusiness`-preset:et sätter `distance = restaurantRoofFadeMid −
restaurantRoofFadeHalf − 4 = 24` (`viewLevels.ts:107-110`), 4 m marginal
under roof-fade-bandets undre kant. Vid `dist = 24` ska taket vara
fullständigt transparent.

---

## 3. Vad playwright-scripten faktiskt visar

**Fyra committade skärmdumpar från ORDER 144, 149 och 150 undersökta:**

- `frontend/reports/order144/kvarterskrogen-16-kuvert.png` (ORDER 144
  rapporterade "16/16 seated injicerade via `__nxSimState`-mutation")
- `frontend/reports/order149/brewpub-day-lunch.png` (ORDER 149
  rapporterade "20 seated-gäster + brewpub dagsljus")
- `frontend/reports/order149/brewpub-evening.png` (ORDER 149
  rapporterade "brewpub kväll")
- `frontend/reports/order150/brewpub-20-guests.png` (ORDER 150
  rapporterade "ölkrogen: 20 gäster på 20 platser")

**Utfall vid inspektion:** alla fyra visar **taket från utsidan** —
grönt gräs uppe, brun/grå takyta i mitten (PlayerBusiness roof-cap
opakt), träd runt. Ingen interiör syns. `kvarterskrogen-16-kuvert.png`
visar dessutom NameEntryOverlay-modalen framför en village-vy (spelaren
har inte fyllt i verksamhetens namn ännu, sim pausad).

**Denna orders probe** (`frontend/scripts/order172-interior-probe.mjs`)
öppnade `#playtest=1&business=brewpub&preset=myBusiness&period=lunch`
— exakt samma URL-mönster som ORDER 149/150 — och skippade NameEntry
via `window.__nxSetBusinessName('Ölkrogen')` (samma dev-hook som
ORDER 149:s rad 142 och ORDER 150:s rad 160). Efter 8 s väntan
snappades `frontend/reports/order172/view.png`. Vyn är
**praktiskt identisk med ORDER 149/150:s committade skärmdumpar** —
taket från utsidan, ingen interiör.

**Slutsats §3:** ORDER 144/149/150-scripten kom **INTE** in i rummet.
De rapporterade skärmdumpar som "inifrån" när skärmdumpar visar utsidan.
Rapporternas beskrivning ("kvarterskrogen 16 kuvert", "brewpub-day-lunch
med 20 seated-gäster", "ölkrogen: 20 gäster på 20 platser") baserades
på state-injektion via `__nxSimDispatch`, inte på visuell verifiering
av att gästerna faktiskt renderades. Skärmdumparna var per bildinnehåll
oförenliga med rapport-texten. Samma familj av fel som ORDER 157:s
"cam=38m" (påhittad siffra i verify-rapport).

---

## 4. Vad probe:n läste från runtime

Fältet `probe` i `frontend/reports/order172/interior-probe.json` bär:

- `simState.businessClass` — bekräftar att `business=brewpub` alias:et
  mappade till ölkrogen (per `urlParams.ts:169`).
- `businessRoomRef` — bekräftar att BrewpubScene:s useEffect körde och
  monterade rummets kontrakt (fält `seatsCount`, `capacity`, `entrance`
  bär rummets tal).
- `seatSource` — `'businessRoomContract'` bekräftar att InteriorGuests
  läser rummets kontrakt per ORDER 150.
- `devPanelText` — DevPanel-strängen som DOM renderade vid mättillfället.
  Fältet `cam=` bär kamerans faktiska distans vid mättillfället.
- Scen-traversal (fältet `scene`) — misslyckades hitta three.js-scenen
  via r3f-internals (API-versionskänsligt). Camera/material-opacity gick
  därför inte att läsa direkt.

`devPanelText` visar dessutom `- fps(strat)` (0 fps) — canvas har inte
räknat frames sedan senaste `fpsMeter`-mätning. Detta ÄR den observation
som gör att `cam=` och material-opacity inte kan verifieras via
DevPanel: strängen uppdateras (setInterval 250 ms), men om useFrame-
loopen inte kör så uppdaterar `fpsMeter` inte, och om `cam` läser en
initialiserings-post istället för dampat värde är strängen missvisande.

**Vad detta INTE bevisar:** att renderingen faktiskt är trasig i
provspel med GPU. Playwright kör headless swiftshader-WebGL som kan
suspendera useFrame-loopen på ett sätt browsern med GPU inte gör.

**Vad detta bevisar:** att headless-playwright *inte* kan användas
som visuell verifiering av interiören — ORDER 149/150 gjorde det ändå,
och deras skärmdumpar var därför per bildinnehåll oförenliga med
rapport-texten. Att bygga vidare på deras "20 gäster på 20 platser"-
påstående kräver en annan verifiering.

---

## 5. Hypoteser för VO:s observation i provspelet

Provspel 2026-09-05 använder GPU-baserad browser (inte headless
swiftshader), så useFrame-loopen ska köra normalt. Ändå ser VO taket
från utsidan.

Två hypoteser som förklarar det:

### 5.1 Damping ännu inte konvergerad

Kameran startar med `#preset=myBusiness` → `actualRef.current.distance
= 24` från mount (`CameraContext.tsx:130` `actualRef = cloneTarget(start)`).
Damping är alltså inte inblandad om preset-URL:en används.

Men provspel 2026-09-05 använde troligen INTE `#preset=myBusiness`-URL.
Spelaren gick sannolikt genom bank-möte + NameEntryOverlay-submit; efter
namn-submit anropas `useCamera().jumpToPreset('myBusiness')` (ORDER 157
§Fynd 1). Damping kör då från village (900 m) mot myBusiness (24 m)
med `dampDistance = 1.6 s`. Konvergering till <1% skillnad tar ~5×
tidskonstanten = 8 s.

**Om VO läste `cam=24m` men flygningen inte var färdig** — kameran
kunde vara på väg genom fade-bandet (52..28 m) där tak-opacity fejdar
från 1 mot 0. Vid t.ex. 30 m är `roofOpacity = smoothstep(28, 52, 30) =
0.083` — taket är fortfarande delvis synligt (opakt ~8%). Det räcker
för att skym interiören visuellt.

Men VO rapporterade `cam=24m` — så DevPanel:s cam-fält (som läser
`actualRef.current.distance`) visade 24. Antingen har damping
konvergerat, eller så visade DevPanel initialposten (samma som ORDER
172-probe:n `cam=0m`-artefakt kan tyda på).

### 5.2 useFrame-loopens opacity-uppdatering körs inte

`PlayerBusiness.tsx:270-345` innehåller loopen som sätter `mat.opacity =
roofOpacity`. Om useFrame kör men ref:erna är null (mount race), eller
om `roofMaterialRef.current` är null vid första tick och sedan aldrig
skrivs igen, står `mat.opacity` kvar på Three:s default 1.

Detta är inte visat men är den tekniska mekanism som skulle producera
observationen. En dev-hook analog med ORDER 161:s
`__nxPlayerBusinessPlinthMeasure()` — exempelvis
`__nxPlayerBusinessOpacityMeasure()` som returnerar
`{roofOpacity, wallOpacity, plinthOpacity, cameraDistance}` från
runtime — skulle bevisa vilken hypotes som stämmer.

---

## 6. Vad som INTE gjordes

- **Ingen kod-ändring i produktionsfiler.** Utredning.
- **Ingen fix.** Ordertexten sa "bara utredning".
- **Inga trösklar rörda.** Fade-band-konstanterna (`restaurantRoofFadeMid`,
  `restaurantInteriorFadeMid`, `myBusiness.distance`) står oförändrade.

Följdorder rekommenderas för att avgöra §5:s två hypoteser:

**a.** Lägg dev-hook `__nxPlayerBusinessOpacityMeasure()` i PlayerBusiness
som returnerar `{roofOpacity, wallOpacity, plinthOpacity,
cameraDistance}` från runtime. VO kan öppna provspelets browser-konsol
och läsa värdet — om `roofOpacity > 0` vid `cameraDistance = 24` är det
en genuine bug i useFrame-loopen; om `roofOpacity = 0` är det
frame-rate-problem eller att spelaren såg damping-passage genom fade-
bandet.

**b.** Alternativt: en probe som INTE använder headless-playwright utan
kör mot `npm run dev` i vanlig browser (Vision Owner via
window.open(...)/direkt spelning) och sparar en screenshot lokalt.

**c.** Rätta ORDER 144-, 149- och 150-registerraderna: deras
"skärmdumpar inifrån"-påståenden är motbevisade av inspektion. Samma
mönster som ORDER 124-rättningen i ORDER 171. Ligger utanför denna
orders scope men bör läggas som följdorder.

---

## 7. Rekommendation

Bygg ingenting förrän §5:s två hypoteser är avgjorda med tal. Rätta
imellan ORDER 144/149/150-registerraderna så framtida agenter inte
förlitar sig på deras "inifrån-skärmdumpar" som bevisning. Skärmdumpar
inuti rummet finns inte i repot.

---

## 8. DoD

1. Vad koden kräver för att interiören ska renderas — kartlagt i §2
   med källrader.
2. Vad playwright-scripten faktiskt visar — bekräftat via inspektion
   av fyra committade skärmdumpar (§3) + probe screenshot
   (`frontend/reports/order172/view.png`).
3. Vad probe:n läste från runtime — i
   `frontend/reports/order172/interior-probe.json`.
4. Hypoteser för VO:s observation — i §5.
5. Ingen produktionskod rörd. Registerpost 172 i samma commit.

---

## 9. Filer

- `frontend/scripts/order172-interior-probe.mjs` — verifieringsskript.
- `frontend/reports/order172/interior-probe.json` — probe-läsning
  från runtime.
- `frontend/reports/order172/view.png` — screenshot vid `#preset=
  myBusiness` + `__nxSetBusinessName` (samma URL-mönster ORDER 149/150
  använde).
- `documentation/architecture/ORDER_172_KAMERA_INTERIOR_UTREDNING.md`
  — denna text.
