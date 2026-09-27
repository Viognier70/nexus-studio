# ORDER 271 — Designs paket 1 och 6 i spelet (rapport)

**Ordern** (Vision Owner 2026-09-27):
- Bygg in paket 1 (vinbaren, skärmarna, mentorn, figurerna) och paket 6 (raketkortet, mätarna, kvällens lärdom, rutan utan verksamhet och koreografin) ur `documentation/leveranser/nexus-leverans-2026-09-27/`.
- Följ INSTRUKTION och varje LEVERANSNOT, med senaste versionen av varje fil enligt versionstabellen.
- Bygg inte A1, A2, Q1 och Q2 (och inte H1–H3).
- Svara på FRAGOR §1–50 i `documentation/briefs/SVAR_TILL_DESIGN.md`.

**Vision Owners beslut:**
- §46: F33 gäller tills vidare, och speldesignens regel införs i etapp 6 (F47).
- §49: vid fel tar den ordinarie personalen i rollen över och lämnar sin uppgift.
- §50: minsta insats är en fjärdedel av en veckas golv.
- §21: tålamodet per gäst kopplas till väntans tre lägen.

**Gren och grund:** grenen `order-271` utgår från `order-270`, inte från `main`. Paket 6 bygger på raketerna i ORDER 270, som inte är mergad (stopp för provspel). Det avviker från regeln "en gren från main". Mergas ORDER 270 först kan ORDER 271 mergas efter den.

## 1. Vad som byggdes

**Designsystemet** (paket 1, skärm 00-SYS), `frontend/src/strategic/ui/system/`:
- Archivo ligger lokalt i bygget (`public/assets/fonts/archivo/`, OFL), så inget hämtas i runtime.
- Allt mäts i designens pixlar (1920 × 1080) gånger `--nx-u`.
- Typografin följer 88/56/36/28/20.
- Grunden, bläcket och accenten (`#f3f2f2`, `#201e1d`, `#ec3013`).
- Hörn 0, linjer 2 px, knapparna 72 px med pil, och tio steg utan tal.

**Paket 1: skärmarna** (`ui/screens/`, omskrivna komponenter):

| Skärm | Komponent | Ändrat |
| --- | --- | --- |
| M1, M2 | `MentorPanel` | M2 pekar på raketkortet och mätarna i stället för action-knappen. |
| B0a, B0b | `BankDialog` | B0 följer F33 som koden har i dag. |
| B1 | `BankDialog` | — |
| S1, S2 | `DayActionBar`, `MorningActivityPanel`, `MorningMenuPanel`, `PrepPanel` | Schemat börjar alltid överst på morgonen. |
| T1 | `NewspaperDialog` | Knappen Till banken. Marknaden har en egen rad utan verksamhet. |
| O1, O2 | `MaltidensHusDialog`, `QuestionCard` | — |
| MD1, MD2 | `MedalShelf` | — |

- Namnen på Designs skärmar är platshållare (Ingrid Malm, Sparbanken, Grythyttebladet), så spelets egna texter står kvar. Rader utan data i spelet är utelämnade: vinglasen och citatet i T1, platinaraden i MD2 och frågornas ämnen i O2.

**Paket 1: vinbaren och figurerna** (`scene/`):
- `wineBarRoom.ts` kommer från paket 1. `figureActs.ts` kommer från paket 5 (senaste versionen) och `serviceScore.ts` ur leveransen servicekoreografin.
- `updateCutaway` körs när kameran vridits. `setMood` ger helgstämningen fredag och lördag från 21.00, och vinväggen blir platina med platina i Stensöta.
- **Kameraprovet** med spelets kamera från åtta vinklar och grannhusen är tomt: `frontend/reports/order271/wineBar-camera-view.json`. `checkPaletteAgainstFloors()` är också tom. Tre stationer flyttades för att nå det: bartendern, sommelieren och diskaren.
- **Kvällsljuset** (`WINE_BAR_LIGHTS`): fem punktljus utan skuggor, med stämningen ur `LIGHT_MOODS`. Före ordern hade vinbaren inget inomhusljus alls.

**Paket 6: koreografin** (`serviceFlow.ts`, `wineBarDirector.ts`, `WineBarFigures.tsx`):
- **Simuleringen är sanningen.** Den bestämmer vilka gäster som finns, var de sitter, deras nöjdhet och tålamod (FRAGOR §48).
- **Gästerna:** deras tillstånd blir akter ur `figureActs`. De kommer in, sätter sig, läser menyn, beställer, får vinet, skålar, äter, ber om notan, betalar och går.
- **Personalen:** två servitörer, bartender, sommelier, kock och diskare. De tar uppgifterna i tidsordning längs `staffRoute()`, med överlämningar vid baren och passet.
- `createServiceFlow()` används inte, eftersom ankomster och avfärder kommer ur simuleringen.
- **§21:** tålamodet ur `QUEUE` (tiden eller nöjdheten, det som räcker längst) styr väntans tre lägen.
- **§49:** vid fel lämnar personen i rollen sin uppgift och går stressat till raketens bord, stannar och går tillbaka. Det hen inte hann göra väntar kvar, så andra bord får vänta synligt. Ringen på golvet visar vem raketen gäller och fylls med stegets tid.

**Paket 6: gränssnittet:**
- **R1–R3:** raketkortet i högerkanten (632 px), med stegrutorna, nedräkningen och svaren på tangenterna 1–4.
- **Svaret i stunden:** svaret visas i 2,4 s innan nästa steg börjar (`INCIDENTS.revealSeconds`). Vid fel står bandet "Fel · <Rollen> tar över", och den som tar över bestäms av `INCIDENTS.takeoverRole` och `takeoverSimSeconds`.
- **Mätarna:** tio steg var, som växer efter ett svar.
- **L1:** raketerna gånger stegen, med lärdomen ur det tidigaste steget. Därefter kommer K1.
- **X1:** en knapp och rummet svartvitt bakom rutan. §50 styr: rutan visas utan verksamhet när kassan är under minsta insats (`NO_BUSINESS.minimumStakeShareOfWeekFloor` 0,25, `minimumStakeSek`).

**Motorn** (`sim/incidents.ts`) har bara fått tillägg: `revealed`/`revealLeft`, `lastOutcome.reveal`/`takeover` och `takeoverActive()`, med tester i `order270Incidents.test.ts`.

## 2. Verifiering i spelarens vy

`frontend/scripts/order271-dod-from-start.mjs` kör produktionsbygget från `/` utan flaggor, med spelarens knappar och tangenter, i 1920 × 1080. Stegen och tiderna står i `frontend/reports/order271/dod.json`, och bilderna heter `dod-*.png`:
- Varje skärm i paket 1: M1, S1 (introduktionen och måndagen), MD1, O1, O2 (övning och prov), MD2, B0a, B0b, M2, T1, B1 och S2.
- Vinbaren från spelarens kamera: `dod-20`.
- Kvällen med figurerna i rörelse: `dod-21` (måndagen) och `dod-22` (lördagen, två tidpunkter).
- En raket genom alla tre stegen: `dod-30-raket-1-steg-{1,2,3}-{fraga,svar}`. En raket fälld på techne: `dod-31` (R3).
- Utfallet i rummet och på mätarna: `dod-32`. Därefter L1 (`dod-40`) och K1 (`dod-41`).
- X1 (`dod-50`) nås inte från normal start på en vecka. Bilden tas med sparfilen `reports/order270/save-utan-verksamhet.json`, med kassan satt till 0 i kopian som laddas (`dod-x1.json`). Sparfilens kassa (ca 30 000 kr) ligger över minsta insats, och då visas rutan inte enligt §50.
- **S1 efter avskedet:** skärmen stod 432 px nedskrollad före bilden (`s1ScrollTopBeforeShot`). Orsaken är att Playwright skrollar knappen den klickar på in i vyn, så en spelare med mus ser det inte. Skriptet mäter läget, skrollar upp och tar bilden som spelaren ser den. Schemat skrollas också upp varje ny morgon (`DayActionBar.tsx`).
- **Gästerna:** den rimliga spelaren i harnessen har 19–51 gäster per kväll i vecka 1, med lördagen störst. Lördagsbilderna (`dod-22`) tas 130 och 142 s efter öppning, när rummet har fyllts. Morgnarna lämnas orörda som harnessens rimliga spelare. En egen meny med tre rätter tömde köket i en tidigare körning.
- Bildfrekvensen under servicen var 24 fps i produktionsbygget (`fpsService`). Kvällsskriptet från ORDER 270, som hängde efter andra raketen, gick igenom hela veckan i den här körningen.

Sviten är grön: typkontrollen och `vitest run` utan fel, med nya tester för rummet, regissören, skärmarna och raketens svar i stunden.

## 3. Avvikelser

1. **Byggnaden är för liten** för Designs minimimått. OSM-huset är 14,5 × 10,1 m, och minimimåttet är 14,6 × 11,0 m. Rummet byggs i minimimåtten och står upp till 0,45 m utanför polygonen.
2. **Tre stationer är flyttade** för att kameraprovet ska bli tomt.
3. **Inga föremål i händerna.** Bärandet syns bara i posen.
4. **Övertagandet** varar 30 spelsekunder (`takeoverSimSeconds`), inte Designs 6 s. Motivet är att andra bord ska hinna vänta synligt.
5. **Mätarna visar kassan** som kvällens intäkt och raketernas kassa mot en normal kväll.
6. **Rätt-bandet** visar förklaringen till det valda svaret, eftersom banken inte har någon utfallstext per steg.
7. **`--nx-u` har inget golv.** På en telefon blir brödtexten mycket liten, men knapparna har minst 44 px. Det gäller hela systemet och behöver ett beslut om telefon.
8. **X1:s knapp** leder till banken när bankens krav är uppfyllt (F46), annars till Måltidens hus. Utan verksamhet växer kassan inte.

## 4. Öppet

- Sällskap i vinbaren (FRAGOR §19) och en egen gräns för sittande gäster att ge upp (§21).
- Byggnadens storlek mot Designs minimimått.
- F47: speldesignens regel för första klassen införs i etapp 6.
- Paket 2–5 monteras i etapp 6–9.
