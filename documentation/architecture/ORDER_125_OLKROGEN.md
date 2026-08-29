# ORDER 125 — Ölkrogen

**Repo** `Viognier70/nexus-studio` · **Gren** `order-125` (från `main`)
**Klass** AUTONOM
**Datum** 2026-08-29
**Lyder under** SD-004 (3D-scen, kroppar utan ansikten)
**Källa** `handoff/brewpubRoom.ts` — Claude Designs leverans, 900 rader
**Brief** `handoff/ORDER-olkrogen-brief.md` — Vision Owners brief till Design

> Nummer 125 verifierat mot `ORDER_REGISTRY.md` 2026-08-29: 100–124 populerade,
> 125 nästa lediga. Källan (`handoff/brewpubRoom.ts`, 900 rader) och briefen
> landade i repot samma dag; blockering upphävd.

---

## 1. Varför

Ölkrogen är den första nya verksamhetsklassen sedan R4. Rummet är levererat som
kod: tjugo platser, litet kök, och bryggeriet i samma rum som gästerna.

Den ska gå att **välja och spela** när ordern är klar. Ett rum ingen kan öppna
går inte att pröva, och tre gånger i dag har något som såg rätt ut i tal sett
fel ut i vyn.

---

## 2. Källan kopieras, den importeras inte

`brewpubRoom.ts` läggs som `frontend/src/strategic/scene/brewpubRoom.ts` — under
`scene/`, bredvid `figureRig.ts`.

Kopieras med egen historik. Ingen import från `handoff/`. Samma delning som
mellan prototypmappen och `patternTransform`.

`brewpubRoom.js` i Designs projekt är webbläsarspegeln för modellen och ska
**inte** med.

Avvikelser från källan redovisas i rapporten med skäl. Ingen tyst omskrivning.
Om typecheck kräver en ändring — som `measureFigure`-traversen krävde i
ORDER 121 — dokumenteras den i koden.

---

## 3. Klassen

`BusinessClass` utökas med ölkrogen. `capacityFor` ger 20.

Rummet monteras när klassen är vald, på samma sätt som `Restaurant.tsx` monteras
i dag. Placeringen sker enligt källans header:

```
room.group.position.set(obb.centre[0], 0, obb.centre[1]);
room.group.rotation.y = -obb.angle;
```

`resolveWorldPositions()` ger världskoordinater efter placeringen. **Sim-lagret
gör inte om transformen själv** — det är hela poängen med att funktionen finns.

Platserna ur `seats[]` tilldelas som `interiorLayout` gör i dag. Gäster och
personal renderas med `figureRig` precis som i restaurangen.

---

## 4. Vad ordern INTE gör

**Ingen egen mekanik för ölkrogen.** Den beter sig som restaurangen i övrigt.
Att kök, gästbeteende och pass skiljer sig är sant men hör till ett eget arbete
när verksamhetsklasserna är beslutade.

**Ingen omdöpning av dagens restaurang.** Att den blir vinbaren är utkast, inte
beslut, och rör kod som ORDER 124 arbetar i.

**Inga beslut om progression, uppgradering eller kunskapskoppling.** Det ligger
i Vision Owner-utkastet.

`ui/foodtruck/` orörd. `figureRig.ts` orörd. Trösklar, ansiktsband och
ankomstmultiplikatorer orörda.

---

## 5. De fem flaggorna

Design flaggade fem luckor. De redovisas i rapporten **som de står** — de är
svar, inte hinder. Fyra av dem kräver ingen åtgärd i den här ordern:

| Flagga | Läge |
| --- | --- |
| `businessClass` | **Åtgärdas här** — klassen läggs till med `capacityFor = 20` |
| `counterOrder` | Geometrin stöder beställning vid disk, men gästens tillståndsmaskin saknar det. Bordsservering tills vidare |
| `standing` | Åtta ståplatser finns som geometri, räknas inte i kapaciteten |
| `brewPhase` | `updateBrewpubRoom(room, phase)` anropas med `phase = 0` tills produktionstillstånd finns |
| `kitchenStations` | Tre stationer är geometri; vilken rätt som använder vilken kräver en menymodell |

**Ingen av dem uppfinns.** En flagga som fylls med en gissning är värre än en
flagga som står kvar.

---

## 6. Definition of Done

1. `brewpubRoom.ts` under `frontend/src/strategic/scene/`, ingen import från
   `handoff/`.
2. Ölkrogen valbar som `BusinessClass` med kapacitet 20.
3. Rummet monteras och placeras enligt §3; `resolveWorldPositions()` används.
4. Gäster och personal renderas med `figureRig` i rummet.
5. **Gångvägstest:** `walkPathToSeat` och `exitPathFromSeat` ger en väg från
   entrén till varje av de tjugo platserna och tillbaka. Ingen plats onåbar.
6. **Måttest:** `measureBrewpubRoom` mot `MIN_WIDTH_M` / `MIN_DEPTH_M`. Om
   byggnadens OBB understiger dem ska `fits: false` returneras med underskottet
   — **inte** en omtolkad plan.
7. **Siktlinjetest:** `checkSightLines` grön. Barstolarna ska se tankarna.
8. **Visuell verifikation** som ORDER 121 DoD 8 och ORDER 123: diff-baserad
   playwright-mätning som isolerar rummets bidrag, i dagsljus och kvällsljus.
   Skärmdumpar checkade in.
9. **Silhuettbandet hålls.** Rummets nya färger — stål, koppar, våt betong —
   prövas mot `silhouetteContrast.ts`. Figurer ska läsas mot det nya golvet lika
   väl som mot restaurangens.
10. De fem flaggorna redovisade enligt §5.
11. `git diff` visar `ui/foodtruck/` och `figureRig.ts` orörda.
12. Typecheck grön, hela sviten grön, båda CI-jobben gröna på PR:en.
13. Registerpost i samma commit.

---

## 7. Om något inte går

Om rummet inte får plats i byggnadens OBB är det ett fynd. `fits: false` med
underskottet redovisas — planen krymps inte, och byggnaden byggs inte om i den
här ordern.

Om figurerna inte läses mot bryggeriets mörkare betong är det ett fynd av samma
slag som ORDER 123 löste. Rapportera och stanna; lös det inte genom att göra
figurerna större eller genom att lysa upp zonen.

Och om `BusinessClass`-utökningen visar sig dra in mekanik som §4 avgränsar bort
— stanna. Ölkrogen som valbar klass ska vara ett litet tillägg, inte en ny
verksamhetsmodell.

---

## 8. Rapport (2026-08-29, `order-125`)

**Status: Executed med §7-fynd. DoD 8 (playwright visuell verifikation) uppskjuten till följdorder.**

### 8.1 Vad som byggts (DoD 1–7, 10–13)

| # | Kontroll | Resultat |
|---|---|---|
| 1 | `brewpubRoom.ts` under `scene/`, byte-identisk med handoff | ✓ `cmp` bekräftat; ingen avvikelse behövdes. Grep: 0 imports från `handoff/` i produktionskod. |
| 2 | Ölkrogen valbar som `BusinessClass` med kapacitet 20 | ✓ `types.ts` + `business/businessClass.ts` + `strings.sv.ts` + `testHarness/urlParams.ts` utökade. Test asserterar `capacityForBusiness('ölkrogen', X) === 20` oavsett `staffCount`. |
| 3 | Rummet monteras + placeras via `resolveWorldPositions` | ✓ Ny `scene/BrewpubScene.tsx` gate:as på `sim.businessClass === 'ölkrogen'`; `createBrewpubRoom` en gång i `useEffect`; placerad via `layout.centre[0], 0, layout.centre[1]` + `rotation.y = -layout.worldAngle` per handoff-headers exempel; `updateBrewpubRoom(room, 0)` varje bildruta per §5 `brewPhase`-flagga. |
| 4 | Figurer via `figureRig` (befintlig InteriorGuests/Staff) | ✓ Inga nya renderare — InteriorGuests + InteriorStaff (från ORDER 121) räknar ölkrogen som restaurang-liknande via `hasSeats=true` och renderar figurer på samma sätt. |
| 5 | Gångvägstest alla 20 platser | ✓ `brewpubRoom.test.ts` iterar alla 20 seatIds; ingen plats onåbar. Okänt seatId → tom väg (defensiv). |
| 6 | `measureBrewpubRoom` mot MIN | ✓ Footprint ≥ 13.4 × 9.6 m. Vessel-count ≥ 4. Interiör-mesh-höjd > 2 m. |
| 7 | `checkSightLines` — barstolar ser tankarna | ✓ Alla 8 barstolar (`kind='bar'`) ser alla jästankar. `blindSeats.length < TOTAL_SEATS`. |
| 10 | Fem flaggor redovisade | ✓ Se §8.4 nedan |
| 11 | `ui/foodtruck/` + `figureRig.ts` orörda | ✓ `git diff main -- frontend/src/strategic/ui/foodtruck/ frontend/src/strategic/scene/figureRig.ts` = tomt |
| 12 | Typecheck + svit + build | ✓ Typecheck grön, **1042/1042** tester (1003 → 1042, +39 nya), build 2.14s |
| 13 | Registerpost i samma commit | ✓ Rad 125 uppdaterad Pending → Executed med §7-fynd |

### 8.2 §7-fynd — DoD 9 stannar

Bandet [1.8, 3.6]:1 mot brewpub-golvzoner bryts på TVÅ punkter:

| Färg | Golvzon | Uppmätt | Krav | Avvikelse |
|---|---|---:|---:|---|
| `paying #e8c99e` (gäst) | `floorDining #a49b8a` | **1.74:1** | ≥ 1.8 | 0.06 under MIN, borderline |
| `servitör #6b6260` (uniform) | `floorBrew #7d776c` | **1.33:1** | ≥ 1.8 | 0.47 under MIN — matchar precis §7:s förutsägelse |

Servitör-fyndet är exakt vad §7 varnar för: "Om figurerna inte läses mot bryggeriets mörkare betong är det ett fynd av samma slag som ORDER 123 löste. Rapportera och stanna; lös det inte genom att göra figurerna större eller genom att lysa upp zonen."

Warm-neutral uniformsfärg (`#6b6260`) kollapsar mot bryggeriets warm-mid betongton (`#7d776c`) — SD-004 §3.3-preciseringen varnade för "kroppen blir en skugga", men här är problemet det motsatta: FÖR LITE kontrast, inte för mycket.

**Testerna dokumenterar båda fynden som "kända avvikelser" i `brewpubContrast.test.ts:20-36`** — brytning av bandet är förväntad tills en följdorder fixar. Om paletten eller golvet tunas oavsiktligt slår `.toBeCloseTo(measured, 1)` larm.

Per §7 STANNAR jag. **Fixet får inte vara i denna order:**
- Palett-tuning bryter ORDER 123:s kalibrering mot restaurangens golv
- Golv-ändring bryter §2 "koden kopieras"
- Zon-lyftning eller större figurer förbjuds explicit av §7

Möjliga vägar för följdorder:
- Ny hue för servitör som fungerar mot BÅDE restaurangens #a89577 och brewpubs #7d776c
- Zon-specifik uniform (servitör i brewpub har annan färg än servitör i restaurang)
- Design-omkalibrering av brewpub-golv (kräver ny handoff-leverans)

### 8.3 DoD 8 — playwright visuell verifikation uppskjuten

Med §7-fynd öppna är visuell verifikation inte meningsfull: skärmdumpen skulle bevisa exakt det testerna redan hävdar (servitör försvinner i bryggeriets golv). Playwright-scriptet skjuts till samma följdorder som §7-fyndet — där skulle dagsljus/kvällsljus-diff-mätningen bekräfta att fixen räckte.

### 8.4 Fem Design-flaggor per §5 (DoD 10)

Redovisade som Design skrev dem i `handoff/brewpubRoom.ts` `FLAGS`-tabellen:

1. **`businessClass`** — ÅTGÄRDAD i denna order. Klass tillagd med `capacityFor = 20`.
2. **`counterOrder`** — INTE ÅTGÄRDAD. Geometrin stöder beställning vid disk men gästens tillståndsmaskin saknar det. Bordsservering tills vidare.
3. **`standing`** — INTE ÅTGÄRDAD. Åtta ståplatser finns som geometri (`STANDING_SPOTS = 8`) men räknas inte i kapaciteten.
4. **`brewPhase`** — INTE ÅTGÄRDAD. `updateBrewpubRoom(room, phase)` anropas med `phase = 0` tills produktionstillstånd finns i sim-lagret.
5. **`kitchenStations`** — INTE ÅTGÄRDAD. Tre kock-stationer är geometri men vilken rätt som använder vilken kräver en menymodell.

Ingen flagga fylls med gissning per §5:s regel "en flagga som fylls med en gissning är värre än en flagga som står kvar".
