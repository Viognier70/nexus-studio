# ORDER 286a — Servicen som teater, teaterns grund (rapport)

**Ordern** (Vision Owner 2026-09-29, Designs leverans 2 *teaterns grund*, granskad och godkänd): "Bygg in klippen, samspelen och rekvisitan enligt LEVERANSNOT. Simuleringen ska ge det som §8 kräver: en uppgift per anställd, en stol per sittande gäst, raketens utlösare pekar på en figur och vilket klipp som spelas först, och varje föremål har en ägare (ingen tallrik på två ställen). … Raketen börjar i rummet: figuren spelar raketklippet först, sedan öppnas kortet. Kameran glider närmare (~12 m) när raketen börjar, ring och bildtext från Designs raketkort visas, och kameran glider tillbaka efter svaret. Avstånd och tider i balance.ts. Tempot följer trycket: lugnt, normalt eller stressat per anställd. Verifiera i produktionsbygget att en hel kväll spelas med klippen och ≥ 24 bildrutor per sekund."

**Tillägget** (Vision Owner 2026-09-29, Designs tillägg till leverans 2, granskat och godkänt): "Sittklippen för barstol och lounge. Undantaget för barstolar och loungesoffor tas bort: alla platser i vinbaren följer nu sittregeln. Vinbarens rum (wineBarRoom.ts): loungebordet flyttas till 0,95 m från dynan, och barstolarna får en fotring 0,30 m över golvet. Nyckelfilen i rattelse-leverans-1/ ersätter den förra. Välj singular när ett tal är 1, på engelska och svenska. Kontroll i vinbarens eget rum: bilder från 12 m där gäster sätter sig på barstol och i lounge, med fötterna i golvet eller på ringen och glaset inom räckhåll."

## 1. Vad som byggdes

**Designs filer, oförändrade.** `figureClips.ts` (tilläggets version, 46 klipp), `figureInteractions.ts` och `tableware.ts` ligger i `frontend/src/strategic/scene/` som de levererades. Leveranserna ligger i `documentation/leveranser/nexus-leverans-2026-09-29-teaterns-grund/` och `…-teaterns-grund-tillagg/`. `figureRig.ts` har fått `FIGURE.seatedHipDrop` (0,41), som klippen läser.

**Klippen i stället för poserna** (`theatreClips.ts`, `theatreStage.ts`, `WineBarFigures.tsx`). Regissören säger fortfarande var figuren är och vad den gör. Klippet för det väljs ur provet: gång, bära en tallrik, två tallrikar eller brickan, ta upp, servera, duka av, hälla, visa flaskan, laga, diska och stå och hålla uppsikt för personalen; gå, sätta sig, läsa menyn, beställa, äta, skåla, gestikulera, vinka på notan, betala och resa sig för gästerna. Poser utan motsvarande klipp behåller figureActs-posen.

**Sittregeln för alla sitsar** (tillägget). Sittklippet väljs efter sitsen: stol (`guest.sit`), barstol (`guest.sitStool`) och lounge (`guest.sitLounge`), och de sittande looparna läggs om till sitsen (`ctx.seatKind`). Vinbarens sorter översätts med Designs `seatKindFromRoom`. Undantaget från 286a:s första del (bara stolarna vid tvåborden, `THEATRE.chairSeats`) är borttaget. Klippen sänker höften från golvet, så en sittande gästs rot står i golvet medan ett klipp spelar; regissörens egen höjd spärras vid golvet (`wineBarDirector.ts` `seatedY`).

**Tempot per anställd** följer trycket (`THEATRE.tempo`: lugnt under 0,34, stressat från 0,67) och byts bara när klippet byts, så att fasen inte hoppar (LEVERANSNOT §2).

**Rekvisitan har en ägare** (`wineBarDirector.ts` `propLedger`). Varje tallrik, glas och flaska som en uppgift bär registreras med ägare: den anställda som bär den, eller bordet där den står. Det som bärs ligger i handen (`tableware.holdProp`), det som står på bordet står på bordsskivan på rummets höjd (`SURFACE_HEIGHT`). Menyn, blocket, notamappen, servetten och brickan följer klippets händer.

**Simuleringen ger det §8 kräver:**
- en uppgift per anställd: `staffTask(key, t)`;
- en stol per sittande gäst: `guestSeat(guestId)`;
- raketens utlösare pekar på en figur och vilket klipp som spelas först: `IncidentContext.figure` (`sim/theatreTriggers.ts`: bartendern som skär sig, värden som luktar på vinet, gästen som frågar och pekar i menyn, gästen som går mot köket);
- varje föremål har en ägare: `propLedger(t)`, med test att samma tallrik aldrig finns på två ställen.

**Raketen börjar i rummet.** När en raket öppnas spelar figuren sitt raketklipp först (`ActiveIncident.introLeft`, längderna i `THEATRE.rocketIntroSeconds` är klippens vid normalt tempo). Kortet öppnas och stegets klocka börjar gå först när klippet har spelats. Kameran glider in mot figuren till 12 m på 1,2 s och tillbaka på 1,0 s efter svaret (`THEATRE.camera`). Ringen står vid figuren och bildtexten ovanför den (`theatre.caption` i strängtabellen, Designs `rocket.*`-texter; bordsnumret formateras i koden). Gästen som går mot köket reser sig och går en bit mot passet medan introt spelar och går tillbaka efter svaret (`THEATRE.kitchenWalkShare`).

**Vinbarens rum** (tillägget, `wineBarRoom.ts`):
- loungebordet står 0,95 m framför dynans mitt (`LOUNGE_TABLE_Z` 4,15, förut 3,75, alltså 1,35 m);
- barstolarna har en fotring i mässing 0,30 m över golvet (`STOOL_FOOTRING`);
- gången mellan loungebordet och dynornas sockel ligger mitt i glappet (`LOUNGE_INNER_Z` 4,56).

**Singular och plural.** De nycklar i Designs rättade nyckelfil som behöver singular (`brief.book.1–3.note`, `brief.book.stars`, `brief.greet.body`, `evening.gain.credits.cause`) finns inte i spelet: bokningarna, stjärnorna och välkomsttexten byggdes inte i 285 ("bygg formen, inte framtiden"). Spelets texter med tal gick redan genom `pl()` (289). Två ställen till har rättats: "1 portion of … is left" och "Know it held 1 of 1 time".

## 2. Avvikelser att godkänna

- **Loungens dyna är 0,38 m igen.** ORDER 284 höjde den till 0,45 m, eftersom de gamla sittposerna var byggda för stolens höjd och roten räknades ur sitsen. Designs loungeklipp är författade för 0,38 m (`SEAT_KINDS.lounge`), och tilläggets LEVERANSNOT §2 anger 0,38 m som vinbarens mått. Med dynan på 0,45 m hade höften legat 7 cm inne i dynan. Dynan står nu på 0,38 m; figurens rot står i golvet, så felet från 284 kommer inte tillbaka (`wineBarRoom.test.ts` "ingen sittande gäst hamnar under golvet" prövar nu att varje sits passar sin sort).
- **Sätta sig tar regissörens 1,2 s** på alla sitsar. Klippen för barstol (2,6 s) och lounge (3,2 s) spelas på den tiden. Regissörens tid styr när sällskapet räknas som sittande, så den har inte ändrats.
- **Bilderna från 12 m är tagna i dev-servern** (se §3).
- **Designs `theatreStrings.ts`** (klippens och prototypens namn) är inte inslagen i strängtabellen; spelet visar inga klippnamn. Raketernas bildtexter finns i `theatre.caption`.

## 3. Tal och bilder

**Spelarens flöde i produktionsbygget** (`frontend/reports/order286a/dod.json` och `dod-*.png` @ `order-286a`, skript `frontend/scripts/order271-dod-from-start.mjs`): från bussen till söndagen och X1, 1920 × 1080, utan fel i sidan (`errors` tom), 29 bildrutor per sekund under servicen (`fpsService`) med klippen, rekvisitan och 42 figurer. Kvällens resultat visades varje kväll (`eveningSequences`: S1 → R1 → L1 → K1 fem kvällar). Raketen i rummet syns i `dod-30-raket-1-steg-1-fraga.png`: kameran har glidit in mot gästen vid bord 5, ringen står vid gästen och bildtexten "The guest at table 5 asks and points at the menu" ovanför.

**Sitsarna från 12 m** (`frontend/reports/order286a/seats-bar.json`, `seats-lounge.json` och `seats-*.png`, skript `frontend/scripts/order286a-seats-dev.mjs`). Kameran står på 12 m (`shots[].camera.actual`) med spelets lutning:
- barstolen (`seats-barstol-1-*.png`, plats `bar1`): gästen sätter sig, underarmen på disken, fötterna på fotringen; ringarna syns på alla barstolar;
- loungen (`seats-lounge-1-*.png`, plats `loungeA1`): gästen sätter sig på dynan och lutar sig mot ryggstödet, med glaset på bordet framför sig.

*Avvikelse (CLAUDE.md DoD, ORDER 174):* bilderna är tagna i dev-servern, eftersom kamerans avstånd och vilken sits gästen sätter sig på bara kan läsas där (`__nxCamera`, `__nxWineBarDirector`). Barstolen med dev-flaggorna `#playtest=1&business=vinbaren&start=dinner15` (dörrarna öppnas med `START_SERVICE`, samma åtgärd som knappen). Loungen i spelarens flöde från sparfilen måndag vecka 2 (`FLOW=save`), eftersom dev-kvällen dag 1 inte sätter något sällskap i loungen. Bildfrekvensen och flödet är mätta i produktionsbygget ovan.

**Tester:** `frontend/src/strategic/scene/__tests__/order286aTheatre.test.ts`: Designs kontroller (46 klipp utan fel, samspelen inom toleransen, 17 föremål inom 2 mm), sittregeln för stol, barstol och lounge, varje plats i vinbaren klarar sittregeln för sin sort, loungebordet 0,95 m från dynan, fotringen 0,30 m över golvet, sulan på ringen på barstolen och i golvet i loungen, introts längder lika med klippens, och att stegets klocka står medan raketklippet spelas. `wineBarDirector.test.ts`: samma tallrik finns aldrig på två ställen. Hela sviten är grön (137 testfiler, 2 197 tester, varav 4 överhoppade som förut, en testfil överhoppad).

Gren `order-286a` från `main`.
