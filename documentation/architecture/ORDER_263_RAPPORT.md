# ORDER 263 — Nexus v1 etapp 1: Tiden (rapport)

**Order** `documentation/orders/ORDER_NEXUS_V1_HELA_SPELET.md`, etapp 1
**Speldesign** `NEXUS_SPELDESIGN_V1.md` > Tiden, > Ramar för version 1 > Sparande
**Gren** `order-263` från `main` `e251d14`
**Datum** 2026-09-25

---

## 1. Vad som byggdes

**Kalendern** (`frontend/src/sim/calendar.ts`)
- Kalendern härleder allt ur `day.dayNumber`: säsong, vecka (1–8), veckodag, högtid, antal schemaplatser och gästfaktor.
- Dag 1 är måndag i vecka 1. Kalendern har inget eget tillstånd, så det finns inget extra att spara och inget som kan glida isär från simuleringen.
- Alla tal kommer från `balance.ts`.

**v1-dagen i simuleringen**
- `START_SERVICE` öppnar kvällens service med fast längd, `SERVICE.simMinutes` (F11). Lunchen hoppas över.
- `CLOSE_DAY` avslutar söndagen, som är stängd. `OPEN_SERVICE` vägrar på en stängd dag.
- Ankomsterna multipliceras med kalenderns gästfaktor: veckodag × högtid × första veckan.
- Morgonens schemaplatser kommer från kalendern: två på vardagar, fyra på söndag. De ersätter `MAX_ACTIVITIES_PER_DAY = 3`.

**ORDER 171**
- Felet fanns kvar på `main`. `prepEndsAt` heter nu `doorsOpenAt` i hela `src/` och `scripts/`, och `openService` räknar dörrarnas öppningstid på ett ställe.
- Tidigare räknades tiden på tre ställen. För food trucken, som saknar mise en place, hamnade scenarioschemat och morgonbeslutens utfall därför 120 s efter att dörrarna öppnat.
- Grenen `order-171-doors-open-at` arkiveras med taggen `arkiv/order-171` vid mergen.

**Sparandet** (`frontend/src/sim/save.ts`, `strategic/save/`)
- Tre platser. En sparfil innehåller hela simuleringens tillstånd plus verksamhetens namn och är versionerad (F12).
- Ett nytt spel tar första lediga plats när namnet är inskrivet, och dag 1 sparas direkt med en veckokopia.
- Autospar vid varje dagsavslut, och en veckokopia när en ny vecka börjar.
- Är alla tre platser tagna sparas inget automatiskt förrän spelaren själv väljer en plats (F14).
- Sparmenyn nås från menyn uppe till höger och från startrutan ("Fortsätt ett sparat spel").
- **Fel som hittades och rättades:** gästernas och sällskapens id kom från räknare på modulnivå som inte ingick i tillståndet. Efter en laddning kunde nya gäster få samma id som gäster i rummet, och spelet fortsatte inte identiskt. Räknarna ligger nu i tillståndet (`idCounters`).

**Gränssnittet** (svenska enligt F9)
- `DayBadge` visar veckodag, "Vecka N av 8", fas och högtid.
- `DayActionBar` ersätter tjänstelängdsväljaren med "Öppna för kvällen" och "Avsluta söndagen", och visar hur många schemaplatser som återstår.
- `SaveMenu` visar de tre platserna och veckokopiorna.
- **Fel som hittades i spelarens vy och rättades:** menyn uppe till höger låg under panelkolumnerna (`z-index` 10 mot 33), så dess val, också det befintliga "Om denna prototyp", gick inte att klicka när morgonpanelen var uppe.

## 2. Hur det verifierades i spelarens vy

**Skript:** `frontend/scripts/order263-week-playthrough.mjs` med `PREVIEW=1`. Utdata: `frontend/reports/order263/week-playthrough.json`, fältet `build` = "produktion (vite build + preview)".

**Bygge och start**
- Körningen använder produktionsbygget (`vite build` och `vite preview` på port 4173), alltså samma bygge som spelaren får. Inga DEV-paneler och ingen DEV-krok är med.
- Spelet startas på `/` utan hash och utan URL-flaggor (`url`, `flags` i JSON).
- Endast spelarens knappar används: namnrutan, fartknappen 4×, "Öppna för kvällen", "Avsluta söndagen", menyn, "Fortsätt ett sparat spel" och "Ladda".

**DoD 1 — från måndag morgon, via söndagen, till nästa vecka**
- `days[0..6]` visar varje dag: veckodag, vald åtgärd, service, kväll och nästa morgon, avläst ur dagsmärket i gränssnittet.
- Söndagen visas som "Stängt" och avslutas utan service.
- `endOfWeek.badge` visar "Måndag · Vecka 2 av 8 · Morgon", och `errors` är tom.
- Skärmdumpar:
  - `d1-måndag-*.png` till `d7-söndag-*.png`: morgon, service och kväll för varje dag.
  - `d8-mandag-vecka2.png`: måndag i vecka 2.

**DoD 2 — spara och ladda**
- *Helt tillstånd:* `frontend/src/sim/__tests__/save.test.ts` sparar mitt i en service med gäster i rummet och laddar via `LOAD_STATE`. Hela tillståndet är lika (`toEqual`), och spelet fortsätter identiskt i 3 000 tick från original och laddat.
- *I spelarens vy:*
  - `saveMenu.hasWeek1Copy` och `hasWeek2Copy` visar att veckokopiorna finns. Se `sparmeny-vecka2.png`.
  - Sidan laddades om, spelaren valde "Fortsätt ett sparat spel", plats 1 och "Ladda": `saveLoad.sameDay` och `saveLoad.fileAfterLoad`, samt `omstart-fortsatt.png` och `efter-laddning.png`.
  - I produktionsbygget finns ingen DEV-krok, så jämförelsen görs mellan gränssnittets dagsmärke före och efter och sparfilens dagnummer. Att hela tillståndet stämmer visas av enhetstestet ovan.

**Touch och mobil**
- `mobile` i JSON, `mobil-sparmeny.png` och `mobil-morgon.png`: sparmenyn och "Ladda" nås med tryck, och sidan har ingen vågrät rullning.
- Dagsmärket fick en kort form för smala skärmar efter att den första körningen visat att det trycktes ihop till 84 px. Efter rättningen finns `mobil-dagsmarke-kort.png` ("Mån · v. 1 · Morgon" med högtidsraden under).

**Två fel som körningen hittade och som är rättade**
1. Menyn uppe till höger låg under panelkolumnen, så "Spara och ladda" gick inte att klicka. Första körningen på dev-servern föll på just det klicket.
2. Dagsmärket på mobil, se ovan.

**Kvar, som fanns före etappen**
- En obesvarad kunskapsfråga från kvällen ligger kvar över nästa morgons knappar (se `d7-söndag-1-morgon.png`). Knapparna går att nå eftersom de ligger överst. Frågorna flyttas till quizen efter servicen i etapp 2.
- På mobil trängs de befintliga panelerna. Fartknapparna och menyn hamnar på en andra rad ovanpå vänsterpanelens överkant, men går att klicka.

**Reduced motion och WebGL-reserv:** etappen rör inte animationer eller rendering, bara paneler och simulering.

**Svit:** typecheck och build är gröna. Vitest: 1953 godkända och 3 förväntade fel. Före etappen var det 1933 godkända och 4 förväntade fel; ORDER 255:s förväntade fel går nu igenom.

## 3. Veckoharnessens tal

Ej tillämpligt. Veckoharnessen körs från etapp 3 (ordern §1.2). Hela veckan körs dessutom i simuleringen i `order263Week.test.ts`, och i spelarens vy enligt §2.

## 4. Avvikelser från speldesignen och varför

- **Lunchen finns kvar i simuleringen.** Den hoppas över i v1-flödet (`START_SERVICE`), men perioderna lunch och eftermiddag och deras tester ligger kvar. Att ta bort dem skulle röra hundratals tester utan synlig vinst i v1. Det kan göras när klasserna byggs om (etapp 5–10).
- **Fyra tester ändrade:**
  - **M2 DoD 1** prövade den gamla regeln med upp till tre val per morgon och prövar nu två på vardagar och fyra på söndag.
  - **Ankomstformeln** har fått med kalenderfaktorn.
  - **`day.test.ts`, ORDER 255:s kända avvikelse:** den går igenom igen med lägre ankomsttakt och är nu ett vanligt test.
  - **M3 DoD 3:** kvotgränsen är höjd från 1,03 till 1,04. Den absoluta avvikelsen är mätt till 901 SEK både med och utan kalenderfaktorn; kvoten steg enbart för att kassarörelsen är mindre under vecka 1:s lugna dagar. Den absoluta gränsen på under 1 500 SEK är oförändrad, och själva avvikelsen rättas i etapp 3.
- **Servicens längd** är vald: 10 simulerade minuter, alltså 5 minuter i verkligheten i farten 2× (F11). Mise en place ingår i de 10 minuterna, så dörrarna står öppna i knappt 8.
- **Gränssnittet är blandat svenska och engelska.** Allt nytt är på svenska. Befintlig text, till exempel menypanelen och kvällens frågor, är fortfarande engelska tills den översätts i en egen omgång (F9).

## 5. Öppna frågor

Nya i `NEXUS_V1_OPPNA_FRAGOR.md`:
- **F11:** servicens längd.
- **F12:** sparfilens version.
- **F13:** första veckan och högtidsdagarna.
- **F14:** platsval och överskrivning.
