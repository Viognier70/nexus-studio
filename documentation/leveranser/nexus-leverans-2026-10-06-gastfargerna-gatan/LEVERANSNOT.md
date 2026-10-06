# LEVERANSNOT: gästernas färger på gatan (tillägg till D5, Code 302b)

**Datum** 2026-10-06
**Till** Claude Code
**Gäller** `guestGroups.ts` (D5 och tillägget 2026-10-05). Färgerna inne i vinbaren är oförändrade. Varje utseende har fått en gatuvariant: `looks[].street = { body, limb, accent }`.

## 1. Varför

Gatans markytor är mörkare än vinbarens golv: L 0,051–0,115 mot 0,25–0,31. Rummets kroppar (L 0,053–0,086) är gjorda för att ligga under golvet, och på gatan hamnar de därför på samma ljushet som marken. Det är därför plommon, kol och grafit flöt ihop med gatan. På gatan vänds förhållandet: kroppen ligger ovanför marken, med samma kulör som i rummet.

## 2. Fönstret

Kvoten och ljusen är desamma som i tillägget 2026-10-05 (`LIGHT_SCALES`: dag 1,0, kväll 0,62, sen kväll 0,48). Gatans markytor finns i `STREET_SURFACES` och är tagna ur `byKvall.js`: vägen, gångvägen, torget, vår trottoar, de andra krogarnas trottoar, gräset, tomtmarken och grönytorna.

- **Det undre fönstret**, kvot ≥ 1,8 i sent kvällsljus mot de andra krogarnas trottoar (`#6b5d4e`, den ljusaste ytan): L ≥ 0,2904.
- **Det övre fönstret**, kvot ≤ 3,6 i dagsljus mot grönytorna (`#36442f`, den mörkaste ytan): L ≤ 0,3145.
- Alla tio kroppar ligger på L 0,2985–0,3019 och ger kvoten 1,84–3,48 mot alla åtta ytor i alla tre ljusen.
- **Kantstenen** (`#7d796e`, 0,15 m bred) ingår inte, eftersom ingen står på den. Mot den är kvoten 1,46.

## 3. Färgerna

| Grupp | Variant | Rummet | Gatan | Lemmar | Tecknet på gatan | Tecknet mot kroppen |
|---|---|---|---|---|---|---|
| Student | 0 | `#074e7d` | `#529bd8` | `#4376a1` | `#3a2412` mörk ryggsäck och luva | 4,88 |
| Student | 1 | `#2d447d` | `#7494de` | `#5a71a6` | `#3d2614` mörk ryggsäck och luva | 4,73 |
| Bybo | 0 | `#6b4624` | `#bb8b62` | `#8d6b4e` | `#3a2c20` keps (som förut) | 4,47 |
| Bybo | 1 | `#3f5830` | `#7f9e6c` | `#617754` | `#3a3028` keps (som förut) | 4,29 |
| Turist | 0 | `#63510d` | `#aa934a` | `#80703d` | `#efe1c0` solhatt (som förut) | 2,32 |
| Turist | 1 | `#22584f` | `#61a095` | `#4c7971` | `#efe1c0` solhatt (som förut) | 2,32 |
| Gourmet | 0 | `#63335c` | `#bf81b5` | `#916489` | `#f6d98e` ljusare guld | 2,17 |
| Gourmet | 1 | `#4d3b61` | `#a28cbe` | `#7b6c8f` | `#f2cf86` ljusare guld | 2,00 |
| Affärsfolk | 0 | `#46526a` | `#7e98b4` | `#617488` | `#f1ece2` skjorta (som förut) | 2,53 |
| Affärsfolk | 1 | `#3e4148` | `#9a948d` | `#75716c` | `#f1ece2` skjorta (som förut) | 2,55 |

- **Kulören** är rummets kulör, lyft till L ≈ 0,30 i OKLCH, med 15 % mer kulör eftersom en ljusare färg bär mer. Affärsfolket skiljs åt på kulören: 0 är skifferblå och 1 är varmgrå, eftersom de annars låg för nära varandra (ΔE 7,6).
- **Mellan grupperna** är skillnaden minst ΔE 13,5. Varianterna inom en grupp skiljer sig med minst 13,5.
- **Tecknen:** studenternas guld och kopparn låg på kroppens ljushet (kvot 1,2). På gatan blir ryggsäcken och luvan därför mörka. Gourmeternas sjal blir ljusare guld. Kepsen, hatten och skjortan klarar sig som de är.
- **Lemmarna** är kroppens färg med ljusheten sänkt 0,12 i OKLCH och kulören dragen till 75 %. Mot vägen i dagsljus är kvoten 2,0–2,1.
- **Inget rött och inget grönt som signal.** Mossgrönt och havsgrönt är dämpade plaggfärger, som i rummet.

## 4. Bytet vid dörren

En figur som går in byter från gatans färger till rummets på dörrmattan (`room.queueSpots[0]`), på 0,6 s med `inOutSine` (`STREET_BLEND`). Ut gäller det omvända. Kön utanför dörren har gatans färger också när teatern visar den på 24 m, eftersom den står på trottoaren.

## 5. API

- `lookOf(group, variant, where = 'room')` och `dressGroup(rig, group, variant, where = 'room')`. `where` är `'room'` eller `'street'`.
- `checkGroupsAgainstStreet(surfaces?, lo?, hi?)` ger 0 fel.
- `checkStreetSigns(min = 1,8)` ger 0 fel.
- `checkGroupsAgainstFloors()` för rummet är oförändrad och ger fortfarande 0 fel.

## 6. Kontrollbilder

Alla tio gäster står i två rader framför vår dörr: på trottoaren och på Prästgatan. Bilderna finns i 1440 × 900 och 1280 × 720.

- `gatan-kvall-rummets-farger`, `gatan-kvall-gatans-farger`: gatans nivå (42 m), kvällen 0,55.
- `gatan-sen-kvall-rummets-farger`, `gatan-sen-kvall-gatans-farger`: sen kväll (0,92). Här syns skillnaden tydligast.
- `gatan-skymning-gatans-farger`: skymningen (0,02), som är det ljusaste byn har. Byn har inget dagsljus i prototypen. Dagsljuset (1,0) är prövat i talen i §2.
- `kvarteret-kvall-gatans-farger`: kvarterets nivå (90 m).

Prototypen *Byn i kvällsljus* har fått `groupLineup('room' | 'street' | null)` för de här bilderna. Byns egna gästtyper (`varmScen.LOOKS`) är oförändrade.

## 7. Att se över

- **Under gatlyktorna** blir marken ljusare än `STREET_SURFACES`. Där kan kvoten sjunka under 1,8, även om tecknen syns. Om det behövs kan kroppen hållas kvar och ljuskäglan dämpas.
- **Byns gästtyper** i `varmScen.LOOKS` (student, medel, hög, social, miljardär) har samma problem. `hog` (`#1b1a20`) syns som två mörka figurer i den första kontrollbilden 2026-10-06. De byts ut när byn använder D5:s grupper.
