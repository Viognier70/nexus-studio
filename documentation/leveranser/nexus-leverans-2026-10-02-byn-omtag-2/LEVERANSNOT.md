# LEVERANSNOT: byn i kvällsljus, andra omtaget

**Datum** 2026-10-02
**Till** Claude Code, via dig
**Från** Claude Design
**Gäller** De fyra ändringarna efter omtaget: entrén som data, byns nivå längre ut, ljusare by med inställbar ljusnivå, och krogens nivå där taket försvinner och teatern tar över.

Här finns bara ändrade och nya filer. Allt annat i `nexus-leverans-2026-10-01-byn-i-kvallsljus` gäller som förut.

## 1. Innehåll

| Fil | Var | Vad |
|---|---|---|
| `venueEntrance.ts` | monteras | **Ny.** `entranceObb` och `VENUE_ENTRANCES`. interiorLayout.ts placerar rummet med den i stället för orientedBbox. |
| `villageEvening.ts` | ersätter | `LEVELS` (byns nivå 660 m, `frame`, `light`), `BLEND.roof`, `BLEND.zoom`, `VILLAGE_LIGHT` (ny) och ljusare `SKY`. |
| `villageEveningStrings.ts` | ersätter | 66 nycklar. Nya: `byk.light`, `byk.enter`. Ändrade: `byk.desc.village.guests`, `byk.desc.venue.venue`. |
| `byKvallPlats.js` | läses, mönster | `entranceObb`. `playerVenue` använder den. |
| `byKvall.js` | läses, mönster | Rummets skal i byn, taket som lyfts, kapningen, scenljuset, `createInterior`, ljusnivån och nivåerna i byns ram. |
| `byKarta.js` | läses inte | Utsnittet. Byggnadsposten w869907975 har fått `entrance`. |
| `prototyp/Byn i kvallsljus.html` | läses | Fristående prototyp. |
| `bilder/1440x900/`, `bilder/1280x720/` | — | 16 kontrollbilder i varje storlek, utan text. De elva från förra omtaget är omtagna (byns nivå heter nu 660 m), och fem är nya. |

## 2. Entrén som data

Byggnadsposten får `entrance: { towards: 'gry-torget' }`. `entranceObb` tar orientedBbox och vänder vinkeln 180° om rummets lokala +X (entrén) inte pekar mot torget. En ändring på några millimeter i OSM kan inte längre vända rummet.

**Följden:** vinbarens dörr vetter nu mot torget i norr, inte mot Prästgatan i söder. Trottoaren, kön och de sju köplatserna följer med, eftersom de står i rummets ram. Teatern påverkas inte, för den ritar i rummets ram. Kontrollerat: kön står på samma platser i byn och i teatern.

**Att se över:** den riktiga ingången på byggnaden är inte kontrollerad på plats. Om den ligger åt ett annat håll ändras bara `towards`.

## 3. Byns nivå

Byns nivå ligger nu på **660 m** (förut 190), från söder (`yaw` 0,05, lutning 0,95, mål [250, 130] i byns ram). Allt det här syns samtidigt, i både 1440 × 900 och 1280 × 720, med plats för namnen i HUD:en ovanför:

- alla fem krogar: vinbaren, Torgkrogen, Pizzeria Grytan, hotellets matsal och Sjöboden
- truckarnas tre platser: torget, Måltidens hus och sjön

660 m är det närmaste där allt ryms. Sällskapen syns ändå på gatorna, eftersom lyktan och kärnan nu växer med avståndet upp till 2,4 gånger (förut 1,4). Ringen kring Lova och miljardären växer på samma sätt.

Nivåerna kan nu stå i byns ram (`frame: 'world'`). Byn och kvarteret gör det, eftersom de inte ska vända sig när rummet vänder sig. Gatan och krogen står kvar i rummets ram, så att krogens nivå fortsätter att vara teaterns kamera. Mellan nivåerna interpoleras målet i byns ram och vridningen den kortaste vägen. Hjulet går nu ut till 760 m.

Spelets förval för byn är 900 m (`viewLevels.ts`). Byns nivå i den här leveransen är kortare, eftersom sällskapen annars inte syns på gatorna.

## 4. Ljuset

- **Ljusare himmel.** `SKY` är höjd i alla fyra nycklar. Natten har ungefär lika mycket ljus som förra versionens blå timme.
- **Mer ljus längre ut.** `LEVELS.light` förstärker ljuset per nivå: byn 1,4, kvarteret 1,3, gatan 1,0 och krogen 0,7. Krogens nivå är mörkare, så att rummet inifrån liknar teatern.
- **Inställbar nivå.** `VILLAGE_LIGHT.level` (förval 1, från 0,5 till 2) multiplicerar himlens ljus och nivåns förstärkning och höjer exponeringen lite (`exposurePerLevel`). I prototypen ställs den med reglaget *Ljusnivå*, och i Tweaks med `lightLevel`. Bilderna `byn-5` och `byn-6` visar 0,6 och 1,6.
- **Graderingen** är något ljusare i byn: ingen sänkt ljusstyrka, och vinjetten är mörk till 50 % i stället för 72 %.

Ljusreglerna (`LIGHTS`) är oförändrade: lyktor, fönster och krogar tänds och släcks som förut. Bara mörkret mellan dem är ljusare.

## 5. Krogens nivå: taket försvinner och teatern tar över

Vår krog ritas nu i byn med rummets eget skal (`createWineBarRoom()`), med samma väggar, golv och inredning som i teatern. Taket har byns takfärg, eftersom teatern aldrig visar det.

På väg in (`BLEND.roof` = [26, 40] m):

| Avstånd | Det som händer |
|---|---|
| över 40 m | Taket ligger på. |
| 40 → 33 m | Taket lyfts (upp till 5 m) och tonar ut. Rummet syns genom det. |
| under 33 m | Väggarna på kamerans sida kapas med `updateCutaway`, som i teatern. Dörren, skylten och fönstren på de kapade sidorna döljs. Ett scenljus tänds rakt ovanför rummet. Det är svagare när krogen är stängd och starkare när den har öppet. |
| 26 m | Taket är borta. Från 24 m är det teaterns kamera, och teatern tar över. |

Inne i rummet står personalen på sina stationer (`staffStations`) när krogen har öppet, gör i ordning eller städar. Gästerna sitter på platserna (`seats`), lika många som sim-lagret har inne. I spelet är det teatern som ritar detta med klippen. Prototypen visar bara att övergången landar i samma rum, och att kön utanför står kvar.

Knappen **Visa övergången in i krogen** ställer kameran på gatans nivå och glider sedan långsamt in till krogens. Bilderna `krogen-4` till `krogen-6` visar 36, 31 och 27 m.

**För Code:** i spelet görs övergången bäst genom att teaterns rum ersätter byns skal vid `BLEND.roof[1]`, och att taket och kapningen styrs av samma avstånd. Kameran behöver inte byta, eftersom krogens nivå redan är teaterns kamera.

## 6. Mindre ändringar

- Inga gatlyktor står inne i vårt rum eller på dess trottoar. Rummets skal är större än OSM-polygonen.
- Månens skugga täcker upp till 420 m från kameran (förut 180), så att byns nivå har skuggor.
- Kamerans bortre gräns är 2 800 m.

## 7. Det som följer reglerna

Ingen text i bilderna. All text som nycklar `{ sv, en }`, brittisk engelska, och inga speltal i texterna. Den varma graderingen är bakad i pixlarna, och rött används inte. Prototypen fungerar i helskärm i 1440 × 900 och 1280 × 720.

## 8. Kontrollbilder

Från spelets kamera på varje nivå, i 1440 × 900 och 1280 × 720 och utan text. Granskade i full storlek.

- `krogen-1-24m-fore-oppning`: personalen gör i ordning, scenljuset är svagt.
- `byn-1-660m-skymningen`, `byn-2-660m-bla-timmen`, `byn-3-660m-kvallen`, `byn-4-660m-natten`: hela byn med alla krogar och truckplatser.
- `kvarteret-1-90m-kvallen`: vår krog med dörren mot torget, Grillvagnen och Torgkrogen.
- `gatan-1-42m-kvallen`: läget *fullt hus*, med kön på trottoaren mot torget.
- `krogen-2-24m-kon`: fullt hus inne och kö på köplatserna.
- `kvarteret-2-90m-sent`: Pizzeria Grytan stänger, och sällskapen går ut.
- `gatan-2-42m-efter-stangning`, `krogen-3-24m-efter-stangning`: vår krog städar, och de sista går.
- `krogen-4-36m-taket-lyfts`, `krogen-5-31m-taket-tonar-ut`, `krogen-6-27m-rummet-syns`: övergången. **Nya.**
- `byn-5-660m-ljusniva-0-6`, `byn-6-660m-ljusniva-1-6`: samma kväll med ljusnivå 0,6 och 1,6. **Nya.**

Lägen som är satta för bilderna (inga tal ändrade): `gatan-1`, `krogen-2` och `krogen-4` till `krogen-6` visar *fullt hus* (`fullHouse()`). I `kvarteret-2` sitter fem sällskap inne på pizzerian (`seatParties()`).

## 9. Att se över

- Är den riktiga ingången mot torget? Se §2.
- Byns nivå på 660 m i stället för spelets 900 m. Se §3.
- Namnen i HUD:en för vinbaren, Torgkrogen och Grillvagnen ligger nära varandra på byns nivå och täcker delvis varandra. HUD:en behöver en regel för när namn krockar, till exempel att vår krog alltid ligger överst.
