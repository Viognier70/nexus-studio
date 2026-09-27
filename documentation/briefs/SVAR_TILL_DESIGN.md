# Svar till Design — FRAGOR §1–50

**Datum** 2026-09-27 · **Status** klar för Vision Owner att skicka till Design
**Gäller** `documentation/leveranser/nexus-leverans-2026-09-27/FRAGOR till Claude Code.md` (versionen i leveransens rot, §1–50)

ORDER 271 bygger in två av leveransens sex paket: **paket 1** (vinbaren, skärmarna för en vecka, mentorn, figurerna, med `figureActs.ts` från paket 5) och **paket 6** (raketkortet, mätarna, kvällens lärdom, rutan utan verksamhet, koreografin). A1, A2 (action-knappen), Q1, Q2 (quizen) och händelsekorten H1–H3 byggs inte, eftersom raketerna ersätter dem. Paket 2–5 (food trucken, restaurangen, ölkrogen, gästgiveriet) monteras i senare etapper, en klass per etapp i ordningen food truck (etapp 6), restaurang (7), ölkrog (8) och gästgiveri (9), enligt `documentation/orders/ORDER_NEXUS_V1_HELA_SPELET.md`.

Varje svar har en av tre statusar:
- **Redan löst** — svaret finns i repot. Fil och konstant anges.
- **Beslutat nu** — Vision Owners beslut 2026-09-27, eller det ORDER 271 bygger.
- **Öppet** — det som saknas och vem som äger beslutet.

"F" med nummer syftar på `documentation/architecture/NEXUS_V1_OPPNA_FRAGOR.md`. "Speldesignen" är `documentation/foundation/vision/NEXUS_SPELDESIGN_V1.md`.

| § | Ämne | Status |
| --- | --- | --- |
| 1 | Verksamhetsklasserna | Redan löst |
| 2 | Rummens plats i världen | Öppet |
| 3 | Två matsalar i restaurangen | Redan löst |
| 4 | Gemensamt rumskontrakt | Redan löst |
| 5 | Beställning vid disk och lucka | Öppet |
| 6 | Kapacitet som inte är platsantal | Redan löst |
| 7 | Ståplatser | Öppet |
| 8 | Gästrummen | Öppet |
| 9 | Vagnens rutt och vägnätet | Redan löst |
| 10 | Golvzonerna och `FLOOR_COLOUR` | Öppet |
| 11 | Två konstanter som gör två saker | Öppet |
| 12 | Barnet | Redan löst |
| 13 | Arketyp till 3D-figur | Öppet |
| 14 | Långbordens sittytor | Redan löst |
| 15 | Garanterade rumsfält | Redan löst |
| 16 | Notan och avdukningen | Öppet |
| 17 | Gesternas egen klocka | Öppet |
| 18 | Servicepunkterna | Öppet |
| 19 | En gäst eller ett par | Redan löst |
| 20 | Sex nya poser | Beslutat nu |
| 21 | Tålamod per gäst | Beslutat nu |
| 22 | Stress per personalroll | Öppet |
| 23 | Action-knappen | Redan löst |
| 24 | Vinväggen och kvällens stämning | Redan löst |
| 25 | Kameran och grannhusen | Redan löst |
| 26 | Speldesignen och platshållarna | Beslutat nu |
| 27 | Uppgradering: byte eller tillägg | Redan löst |
| 28 | Vädret | Öppet |
| 29 | Köns längd | Öppet |
| 30 | Food truckens tre platser | Öppet |
| 31 | Att äta stående | Öppet |
| 32 | Restaurangens byggnad | Redan löst |
| 33 | Kapacitet per klass | Redan löst |
| 34 | Två matsalar, nu vinbarens | Redan löst |
| 35 | Restaurangens tre lägen | Redan löst |
| 36 | Servitörens runda | Redan löst |
| 37 | Ölkrogens adress | Öppet |
| 38 | Ölkrogens nya platser | Öppet |
| 39 | Bryggeriet | Öppet |
| 40 | Rumsnummer per gäst | Öppet |
| 41 | Gästgiveriets dygn | Öppet |
| 42 | Trapporna under loftgången | Öppet |
| 43 | Uppgraderingens riktning | Redan löst |
| 44 | Restaurangen i w869907975 | Redan löst |
| 45 | Tider utanför 18–23 | Redan löst |
| 46 | Första klassen efter provet | Beslutat nu (införs i etapp 6) |
| 47 | Servicen som händelser | Redan löst |
| 48 | Koreografin mellan raketerna | Beslutat nu |
| 49 | Raketbanken och vem som tar över | Beslutat nu |
| 50 | Utan verksamhet och pengar | Beslutat nu |

---

## §1 — Verksamhetsklasserna

**Redan löst.** Rummens klasser finns: `BusinessClass` är `'kvarterskrogen' | 'foodtrucken' | 'gästgiveriet' | 'ölkrogen' | 'vinbaren'` (`frontend/src/strategic/types.ts:196`), med `capacityFor` per klass i `BUSINESS_CLASS_CONFIG` (`strategic/business/businessClass.ts:63–111`). Speldesignens sex klasser står i `BUSINESS_CLASSES` i `frontend/src/sim/balance.ts` och pekar på rummen genom `V1_CLASS_TO_ROOM` (`sim/economy.ts:47`, F20). Att food trucken saknar platser är avsiktligt: speldesignens klasstabell säger "kö", och `BUSINESS_CLASSES` har `seats: null`.

## §2 — Rummens plats i världen

**Öppet.** Alla klasser med platser står i dag i spelarens byggnad w869907975 (`computePlayerBusinessInterior`, `strategic/business/interiorLayout.ts:212`). ORDER 164 (`documentation/architecture/ORDER_164_BYGGNAD_PER_KLASS_KARTLAGGNING.md` §4) fann att gästgiveriets hela gård inte ryms i någon befintlig byggnad och att en egen volym behövs, men den är inte byggd. Food trucken har ännu ingen plats i 3D-världen. Vision Owner beslutar var gästgiveriet och food trucken ligger, och Claude Code deklarerar det i `content/grythyttan.ts` i etapp 6 och 9.

## §3 — Två matsalar i restaurangen

**Redan löst.** ORDER 144 gjorde `interiorLayout` till enda sanningen och tog bort `RESTAURANT_INTERIOR.bar/.kitchen/.tables/.staffHomes`. Kvar står bara byggnadens mått och entré (`strategic/content/grythyttan.ts:380–392`, se även kommentaren i `strategic/scene/RestaurantScene.tsx:11–14`).

## §4 — Gemensamt rumskontrakt

**Redan löst.** `businessRoom.ts` ligger i `frontend/src/strategic/scene/` sedan ORDER 142–143. Kvarterskrogen (ORDER 144) och ölkrogen (ORDER 149) monteras genom `createRoom` och `updateRoom`, och vinbaren på samma sätt (`WineBarScene` i `strategic/scene/BrewpubScene.tsx`).

## §5 — Beställning vid disk och lucka

**Öppet.** Gästen har i dag två tillstånd som bara gäller food trucken: `serving` (överlämningen i luckan) och `eating` (äter vid uteplatsen) (`strategic/types.ts:29–48`, ORDER 115). `orderingAtCounter` och `awaitingCollection` finns inte. Food trucken byggs som eget spel i etapp 6 och ersätter då dagens SVG-vy. Claude Code äger tillståndsmaskinen.

## §6 — Kapacitet som inte är platsantal

**Redan löst.** Kapaciteten räknas per klass, inte ur en konstant: `service.ts` läser `capacityForBusiness(businessClass, staffCount)` (`strategic/simulation/service.ts:121–128`, ORDER 186). Food trucken har en tillfällig kapacitet `max(3, personal × 3)` (`businessClass.ts:76`) tills dess eget spel byggs i etapp 6. Gästgiveriets 100 platser (`BUSINESS_CLASSES` i `balance.ts`) förs in i rummet i etapp 9; i dag ger `capacityFor` 22.

## §7 — Ståplatser

**Öppet.** `standing` är inget gästtillstånd, och ståplatserna räknas inte i kapaciteten (kommentaren i `businessClass.ts:85–91`). Behåll geometrin. Claude Code avgör per klass i dess etapp, först för food trucken i etapp 6, om stående gäster får ett tillstånd.

## §8 — Gästrummen

**Öppet.** Det finns ett tillstånd `sleeping` för gäster som stannar över natten och ett frukostpass (ORDER 111, `strategic/types.ts:39–43`, `strategic/simulation/reducer.ts:1496–1505`). Incheckning, rumsnummer och nyckel finns inte. Etapp 9 bygger gästgiveriets egen tillståndsmaskin (`ORDER_NEXUS_V1_HELA_SPELET.md`, etapp 6–10). Claude Code äger den.

## §9 — Vagnens rutt och vägnätet

**Redan löst.** Guarden är byggd: ORDER 158 klipper vägarna mot byggnadernas polygoner (`documentation/architecture/ORDER_158_VAGARNA_MOT_POLYGONERNA.md`, `strategic/scene/OsmRoads.tsx`), och ORDER 176 lade till guarden åt andra hållet (`ORDER_176_BUILDINGS_OFF_ROADS.md`). Ni behöver alltså inte vänta på den. Om vagnen alls ska köra mellan platserna, eller bara välja plats på morgonen (U3), avgörs i etapp 6.

## §10 — Golvzonerna och `FLOOR_COLOUR`

**Öppet.** Läget är det halvvägs ni varnar för. `FLOOR_ZONES_BY_BUSINESS` finns både i `strategic/scene/silhouetteContrast.ts` (ORDER 127) och i `silhouetteContrast.zones.ts`, och `innRoom.ts` och `foodTruckRoom.ts` har egna palettprov (`checkPaletteAgainstFloors`, `checkPaletteAgainstGround`). Claude Code föreslår en ordning och Vision Owner godkänner. Det ingår inte i ORDER 271.

## §11 — Två konstanter som gör två saker

**Öppet.** `BAR_WIDTH_M` är fortfarande en konstant för både strippen och disken (`strategic/business/interiorLayout.ts:40`, läses på rad 227–239). Delningen är Claude Codes. Andra delen är löst: `RESTAURANT_INTERIOR.staffHomes` togs bort i ORDER 144 (se §3), så ingen läser den.

## §12 — Barnet

**Redan löst.** Enligt er egen rad: SD-004 §3.3 ligger i main (ORDER 141), och `figureRig.ts` tar `heightMult`. Kvar och inte blockerande: `SKIN_TONES` går genom det otillåtna spannet i kontrastbandet. Det blir en fråga först om händer eller ansikten blir stora nog att mätas.

## §13 — Arketyp till 3D-figur

**Öppet.** `assignArchetype()` bor kvar i `strategic/ui/foodtruck/archetypes.ts`, och gästerna i 3D-scenen har ingen arketyp. Claude Code avgör om arketypvalet flyttas till en neutral modul. Det ingår inte i ORDER 271.

## §14 — Långbordens sittytor

**Redan löst.** Enligt er egen rad: rummen publicerar `seatSurfaceY`, `floorY` och `seatNodeId`. Inga bänkar behövs.

## §15 — Garanterade rumsfält

**Redan löst.** `businessRoom.ts` är kontraktet, och `stations` används direkt sedan ORDER 204 (`documentation/architecture/ORDER_REGISTRY.md`, rad 204). Kvar: `floorY` och `seatSurfaceY` är `null` i de rum som inte publicerat dem.

## §16 — Notan och avdukningen

**Öppet.** Det finns ingen kant `dining → wantsCheck`, och platsen frigörs fortfarande när gästen går. Uppgiften `clear` finns men riktar sig mot en gäst som går (`strategic/simulation/service.ts:1206–1208`). Paket 6 bygger på samma regel ("ett nytt sällskap får bordet först när det förra har gått och bordet är avdukat"). Claude Code äger gästtillstånden.

## §17 — Gesternas egen klocka

**Öppet.** `tempoForGameSpeed()` finns i er `serviceScore.ts` (i dag i `handoff/`), men ingen gest drivs av en realtidsklocka i spelet. Raketernas nedräkning går redan i verklig tid (F43), så en realtidsklocka i sig är görbar. Claude Code bekräftar kopplingen till gesterna.

## §18 — Servicepunkterna

**Öppet.** `orderSpot`, `serveSpot`, `paySpot`, `greetHost`, `seatSide` och `farewellSpot` finns inte i `businessRoom.ts`. Ert förslag att rummet publicerar dem, eftersom rummet äger möblerna, ligger hos Claude Code som äger kontraktet.

## §19 — En gäst eller ett par

**Redan löst.** En gäst är normalfallet. Sällskap finns bara i ölkrogen: 55 % ensamma, 35 % par och 10 % tre (`strategic/simulation/arrivals.ts:213–244`, ORDER 187). Alla andra klasser, också vinbaren, får en gäst i taget. Vill Vision Owner ha sällskap i vinbaren blir det en egen kalibrering.

## §20 — Sex nya poser

**Beslutat nu.** ORDER 271 har monterat `serviceScore.ts` och `figureActs.ts` (paket 5) bredvid `figureRig.ts` i `frontend/src/strategic/scene/`. Gesterna (`poseDine`, `poseTakeOrder`, `poseOffer`, `poseNod`, `posePoint`, `poseSignal`) lånas därifrån. Inget är ändrat i `figureRig.ts`.

## §21 — Tålamod per gäst

**Beslutat nu.** Vision Owner: tålamodet per gäst finns redan (F29), och ORDER 271 kopplar det till väntans tre lägen (`scene/wineBarDirector.ts`). I kön är tålamodet det som återstår av tiden (`QUEUE`, 60 s) eller av nöjdheten till gränsen för att ge upp (0,35), det av dem som räcker längst. Kalastorget flyttar båda per medaljsteg. Vid bordet gäller samma tidsramp. Läget "på väg att gå" visas där bara när nöjdheten redan är under gränsen, eftersom en sittande gäst inte går i simuleringen. Om sittande gäster ska kunna ge upp är öppet för Vision Owner.

## §22 — Stress per personalroll

**Öppet.** Sim-lagret har ingen stress per roll. Det finns bara lagets belastning som helhet (`strategic/simulation/team.ts`, bland annat `AGENCY_OFFER_LOAD_THRESHOLD`). Ert förslag, kö per station, ligger hos Claude Code.

## §23 — Action-knappen

**Redan löst.** Action-knappen är borttagen (Vision Owner 2026-09-26, F25 och F43, ORDER 270). A1 och A2 byggs inte. Raketerna ersätter den.

## §24 — Vinväggen och kvällens stämning

**Redan löst.** Värdena finns i sim-lagret: medaljerna i `state.medals`, veckodagen och högtiden i `calendarFor(dayNumber)` (`sim/calendar.ts:44`) och klockslaget i `clockMinutes(state)` (`sim/incidents.ts:208`, servicen 18–23, F31). Rummet kan alltså få läget när `wineBarRoom.ts` monteras i paket 1.

## §25 — Kameran och grannhusen

**Redan löst.** Spelets kamera har fov 42° och står i vinbarens närvy med 50° lutning på 24 m avstånd (`strategic/camera/viewLevels.ts`). Det skiljer sig från `PLAYER_CAMERA` (38°, 23 m). ORDER 271 kör `checkCameraView()` mot spelets kamera från åtta vinklar, med grannhusen ur renderingen som `extra`, i båda vinväggslägena. Provet är tomt: `frontend/reports/order271/wineBar-camera-view.json`. Tre stationer flyttades för att nå det: bartendern och sommelieren till stråkets mitt (z ±0,74) och diskaren 0,45 m österut. `updateCutaway` körs när kamerans vinkel, fokus eller avstånd ändras.

## §26 — Speldesignen och platshållarna

**Beslutat nu.** Speldesignen är skickad och läst (er avstämning 2026-09-26), och den styr. Text på skärmarna som inte står i speldesignen är platshållare. Där spelet redan har text behålls spelets, till exempel "Mentorn" och "Lokaltidningen i Grythyttan" (`frontend/src/content/strings.sv.ts`). Namnen Ingrid Malm, Sparbanken Grythyttan och Grythyttebladet tas inte in.

## §27 — Uppgradering: byte eller tillägg

**Redan löst.** Byte, en verksamhet i taget. Speldesignen (Uppgradering och Nedgradering) säger att lokalen byts, att personalen får följa med och att ryktet halveras (`UPGRADE.reputationFactor` 0,5 i `balance.ts`).

## §28 — Vädret

**Öppet.** Vädret finns per kväll. Det dras när servicen öppnar och påverkar ankomsterna (`generateWeather`, `strategic/simulation/weather.ts:51`, banden i `WEATHER` i `balance.ts`). Väder per timme och en prognos på morgonen finns inte. Claude Code bygger det i etapp 6, när food trucken byggs.

## §29 — Köns längd

**Öppet.** Kön ska komma ur efterfrågan: marknadens tak och ankomsttakten (F21, F32). Era kurvor används som målbild tills food truckens spel byggs i etapp 6. Claude Code äger det.

## §30 — Food truckens tre platser

**Öppet.** Platserna är inte deklarerade i `content/grythyttan.ts`, och repot namnger ingen sjö. Vision Owner bestämmer platserna och sjöns namn. Claude Code deklarerar dem och kör `checkPitchView()` mot de riktiga husen i etapp 6.

## §31 — Att äta stående

**Öppet.** Tillståndet `eating` (äter vid uteplatsen) finns redan för food trucken (`strategic/types.ts:44–48`). Beställningen vid luckan saknas (§5). Byggs i etapp 6, och Claude Code äger det.

## §32 — Restaurangens byggnad

**Redan löst.** Vision Owner 2026-09-26, infört i FRAGOR under "Beslut och nya frågor": en egen byggnad på egen adress, minst 22,0 × 14,8 m, med 60 platser, bar och stort kök. Vilken byggnad det blir väljs i etapp 7. ORDER 164 har kandidatlistorna.

## §33 — Kapacitet per klass

**Redan löst.** Per klass, enligt speldesignens klasstabell och `BUSINESS_CLASSES` i `balance.ts` (vinbar 20, food truck kö, restaurang 60, ölkrog 20, gästgiveri 100, nattklubb 150). Simuleringen läser kapaciteten per klass (§6). Restaurangen spelas i kvarterskrogens rum tills etapp 7 (F20).

## §34 — Två matsalar, nu vinbarens

**Redan löst.** Samma städning som §3 (ORDER 144). `RESTAURANT_INTERIOR` har bara byggnadens mått och entré kvar (`content/grythyttan.ts:380–392`).

## §35 — Restaurangens tre lägen

**Redan löst.** Klockslaget finns i sim-lagret (`clockMinutes`, `sim/incidents.ts:208`). Lunchläget är borttaget (§45). Rummet monteras i etapp 7.

## §36 — Servitörens runda

**Redan löst.** Personalens uppgifter pekar på en gäst (`targetGuestId`, `strategic/types.ts:240`), och gästen har en plats (`seatIndex`). Uppgiften `serve` har alltså ett bord. Slingan kopplas till uppgifterna när restaurangen monteras i etapp 7.

## §37 — Ölkrogens adress

**Öppet.** I dag spelas alla klasser med platser i samma byggnad, w869907975 (§2). Restaurangen har fått en egen adress (§32). Vision Owner beslutar om ölkrogen ska ligga på vinbarens adress eller ha en egen.

## §38 — Ölkrogens nya platser

**Öppet.** `service.ts` läser i dag ölkrogens gamla platser (`SEATS_OLKROGEN`, ORDER 186). Claude Code uppdaterar allt som läser `'bar3'` och `'longA_n1'` när `brewpubRoom.ts` byts i etapp 8.

## §39 — Bryggeriet

**Öppet.** Det finns inga bryggare och ingen bryggdag i sim-lagret. Ölkrogens lag är värd, servitör och kock (`TEAM_BY_CLASS` i `balance.ts`, F37). Vision Owner beslutar om bryggarna är anställda med lön, och Claude Code bygger det i etapp 8.

## §40 — Rumsnummer per gäst

**Öppet.** Ingen gäst bär ett rum (§8). Claude Code bygger det i gästgiveriets tillståndsmaskin i etapp 9.

## §41 — Gästgiveriets dygn

**Öppet.** Sim-lagret har ett frukostpass för gästgiveriet (ORDER 111, `strategic/simulation/reducer.ts:1496–1505`) och kvällens service, alltså två serveringar. Olika personal per servering finns inte. Claude Code bygger det i etapp 9.

## §42 — Trapporna under loftgången

**Öppet.** Ert förslag att flytta trapporna 1,8 m ut i gården gäller `innRoom.ts`, som är er fil. Design gör ändringen i en kommande leverans av gästgiveriet. Paket 5 monteras i etapp 9.

## §43 — Uppgraderingens riktning

**Redan löst.** Besvarat 2026-09-26 i FRAGOR: U1–U4 är omgjorda som food trucken → Vinbaren. Det stämmer med speldesignen (food trucken är den minsta klassen). Monteras med paket 2 i etapp 6.

## §44 — Restaurangen i w869907975

**Redan löst.** Samma beslut som §32: en större byggnad, och bar och stort kök behålls.

## §45 — Tider utanför 18–23

**Redan löst.** Besvarat 2026-09-26 i FRAGOR. Servicen är 18–23 (`SITTING.serviceStartHour`/`serviceEndHour` i `balance.ts`, F31). Gästgiveriets frukost är det enda undantaget.

## §46 — Första klassen efter provet

**Beslutat nu.** Vision Owner 2026-09-27: speldesignens regel gäller, men den införs först i etapp 6, när food trucken är byggd. Då kräver vinbaren brons i tre paviljonger, varav Stensöta, och ett godkänt introduktionsprov ger food trucken (brons i en). Tröskeln 8 av 8 på första provet används inte. Tills dess gäller F33: brons i Stensöta räcker för den första vinbaren (`startRequirements` i `BUSINESS_CLASSES`, `frontend/src/sim/balance.ts`). Annars skulle nya spelare aldrig nå vinbaren under provspelet. Bankmötet B0b byggs efter den regel som gäller nu, och B0a används från etapp 6.

## §47 — Servicen som händelser

**Redan löst.** Ersatt av raketerna (§49), som ni själva skriver. Det som frågades efter finns: banken i `frontend/src/content/incidents/vinbar.*.json`, de tre mätarna (`serviceMeters`, F44), bord bara när någon sitter där (`needsTable`, F45) och tid ute som fel svar (F43). Tempot 0,25× gäller inte: rummet går i full fart medan nedräkningen går (speldesignen, beslut 2026-09-27).

## §48 — Koreografin mellan raketerna

**Beslutat nu (ORDER 271).** Simuleringen är sanningen för vilka gäster som finns, var de sitter, deras nöjdhet och tålamod. Figurerna läser `sim.guests` varje bildruta, och gästernas tillstånd blir akter ur `figureActs`: kön, att gå in och sätta sig, att läsa menyn, beställa, få vinet, skåla, äta, prata, be om notan, betala och gå (missnöjd under gränsen). Personalen tar uppgifterna ur samma händelser som i `serviceFlow`, längs `staffRoute()`, med överlämningar vid baren och passet (`scene/wineBarDirector.ts`, `WineBarFigures.tsx`). `createServiceFlow()` används inte i spelet, eftersom ankomster och avfärder kommer ur simuleringen. Sällskap i vinbaren (§19) är fortfarande öppet.

## §49 — Raketbanken och vem som tar över

**Beslutat nu.** Vision Owner: banken är den som redan finns, `frontend/src/content/incidents/vinbar.*.json` (31 raketer i tre steg, utkast för Vision Owners granskning). Klasser utan bank behåller scenarierna vid dörren (F43). Vid fel tar den ordinarie personalen i rollen över och lämnar sin uppgift, så att andra bord får vänta synligt. Rollen står per steg i `INCIDENTS.takeoverRole` (kök → kock, sommellerie → servitör, phronesis → värd), i `INCIDENTS.takeoverSimSeconds` (30 spelsekunder) och i `takeoverActive(state)` (`sim/incidents.ts`). Tid ute räknas som fel och kostar en kredit. Stegens tider är 15, 20 och 30 s, och antalet 2–4 per kväll (`INCIDENTS.stepSeconds`, `perWeekday`). Svaret visas `INCIDENTS.revealSeconds` = 2,4 s innan nästa steg börjar.

## §50 — Utan verksamhet och pengar

**Beslutat nu.** Klassen kan redan vara `null` (`economy.businessClass`, `withoutBusiness`). Vision Owner: minsta insats är en fjärdedel av en veckas golv, som vid uppgradering i ORDER 268. ORDER 271 har byggt det: `NO_BUSINESS.minimumStakeShareOfWeekFloor` = 0,25 i `balance.ts`, och `minimumStakeSek` i `sim/economy.ts`. Insatsen räknas i den billigaste klass spelaren kan starta. X1 visas när spelaren står utan verksamhet och kassan är under minsta insats (`isStrandedWithoutBusiness`), aldrig mitt i en kväll. Rutan har en knapp. Den leder till Måltidens hus, eller till banken när bankens krav är uppfyllt. Banken ger nytt lån först efter en hel vecka i Måltidens hus med minst ett prov (`NEW_START`, F38), så ett godkänt prov räcker inte ensamt.
