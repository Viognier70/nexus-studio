# ORDER 300 — Början och layouten (rapport)

**Underlag:**
- Anders 2026-10-04 (`ORDRAR_300-302.md`).
- Tillägg samma dag: söndagens text ska få samma ord ("fyra val i dag"), och strängarna ska sökas igenom efter "schema".

Gren `order-300` från `main` (`ae43150`). Talen pekar på filer under `frontend/reports/order300/`:
- `layout.json`, med bilder `layout-<skärm>-<storlek>.jpg`, är produktionsbygget efter ändringarna (`scripts/order300-layout.mjs`).
- `fore/layout.json` är samma kontroll före ändringarna.

## 0. Bekräftelse: kalibreringen av stämningen (297b punkt 1)

Kalibreringen är gjord och redovisad.
- **Gjordes i:** ORDER 299b (`ORDER_299B_RAPPORT.md` §3, siffrorna i `reports/order299b/stamning-*.json`).
- **Bekräftades i:** `ORDER_297B_RAPPORT.md` §1.
- **Den som har 0,85 rätt per steg lyfter rummet minst lika ofta som det sjunker.** I snitt stiger läget 2,1 gånger och sjunker 1,9 gånger per kväll, över 48 kvällar.
- **Med 0,6:** stiger 2,0 och sjunker 2,3.
- **Den slarviga:** otåligt eller missnöjt rum 48 av 48 kvällar.
- **Ekonomins trappa:** identisk med 298b i 160 av 160 säsonger (`reports/order299b/trappa.json`).

## 1. Allt ryms i fönstret

**Kontrollen** (`scripts/order300-layout.mjs`) går igenom elva skärmar i fem storlekar: 1280 × 720, 1366 × 768, 1440 × 900, 1512 × 982 och 1500 × 950.

Skärmarna:
- startskärmen, registreringen, regelkortet, mentorn, första morgonen och sidan Spelets regler, i spelarens flöde från Nytt spel;
- morgonen, inköpen, byn och gatan före öppning, och servicen, med sparfilen måndag vecka 2 i vinbaren.

För varje skärm och storlek mäts:
- om sidan rullar;
- vilka element som rullar och hur stor del av fönstret de täcker (över 60 % räknas som en hel skärm som rullar, vilket är fel);
- den minsta synliga texten mot golvet 12 px;
- om knappar radbryts eller klipps;
- om alla fem paviljongerna syns utan att listan rullas.

**Resultat:**
- **Före:** 0 av 55 (`fore/layout.json`).
  - Morgonen rullade som en hel skärm, 672–733 px för hög i 1280 × 720.
  - Texter låg under 12 px.
  - I den första kontrollen räknades också text som låg dold under en helskärm. Mätningen räknar nu bara text som ligger överst, så talen för minsta text före och efter är inte helt jämförbara.
- **Efter:** 55 av 55 (`layout.json`).

**Det som scrollar nu** är bara listor i sin egen panel:
- inköpens rader och högerspalt;
- satsningarna och bokningsboken på morgonen när de inte ryms.

**Ändringar:**
- **Morgonen** är byggd om för fönster bredare än 900 px:
  - rubriken börjar under HUD:ens band Byn i kväll, som förut täckte rubriken;
  - bottenraden står sist i skärmen, inte klistrad ovanpå listorna;
  - kolumnerna krymper till fönstret, och listorna scrollar i sin egen panel;
  - raderna är tätare.
  - Under 900 px gäller den rullande skärmen som förut.
- **Textgolvet 12 px** gäller nu i alla `font-size: max(…)` som hade 8–11 px. Det gäller också inköpens rader, klockans etikett och tallrikspanelen.

## 2. Krediternas ram

Den gula markeringen var en tjockare övre kant på en rundad ram. Den bågnade över ramen och gjorde rutan högre än kassans. Nu är den ett rakt streck inom ramen, indraget med ramens radie (`CashCounter.tsx`, `.nx-credits-mark`).

## 3. Morgonen

- **"Dagens val: 0 av 2"** ersätter "Schemat: 0 av 2 platser".
- **Söndagen:** "Söndag. Krogen är stängd, och du har fyra val i dag." / "Sunday. The restaurant is closed, and you have four choices today."
- **Sökningen efter "schema"**, med spelartexten omskriven:
  - mentorns provsteg ("räknas inte bland dagens val");
  - morgonens rad ("Gör dagens val och öppna för kvällen");
  - paviljongernas rad ("Ett besök är ett av dagens val");
  - "Dagens val är gjorda";
  - två "Tillbaka till dagens val";
  - Designs `byk.resetSchedule`, som inte används ("Följ kvällens gång");
  - ett svar i vinbarens raketer om personalens schema ("enligt arbetstiderna").
  - "Schema" står nu bara i kodkommentarer.
  - Testet `order300Borjan.test.ts` prövar att inget "schema" eller "schedule" finns i spelarens text.
- **Alla fem paviljongerna syns, också Kalastorget och Gastronomiska Teatern**, i alla fem storlekar, både första morgonen och vecka 2 (`layout.json` `shelfHidden` tomt).
  - Knappen Måltidens hus står i rubrikraden bredvid Dagens val.
- **Mentorns ruta står i högerspalten** och ligger därför aldrig ovanpå listan. Förut stod raden i den klistrade bottenraden, som växte över listan.

## 4. Den gamla vildmarksstarten borttagen

- **Ordningen** är startskärmen → Nytt spel → namn och samtycke → första morgonen (`main.tsx`). Bussen (VS001) är borttagen ur starten, och länken till förstapersonsprototypen ur menyn.
  - Prototypen går fortfarande att öppna med `#/first-person-prototype`. Filerna (`App.tsx`, `stages/`) ligger kvar.
- **Namn och samtycke** är ett kort efter startskärmen:
  - namnfältet;
  - Designs text om liggaren (`arrivalStrings.ts`: "Det du lär dig här skrivs in i boken och följer med dig. Skriv under, så vet huset att det är ditt.");
  - knapparna Skriv under, Fortsätt utan att skriva under och Tillbaka.
  - Namnet och samtycket sparas i speltillståndet (`player: { name, consent }`).
- **Mentorns närbild** är ersatt med ett porträtt med monogram: initialen i en mässingsring (`Monogram.tsx`).
- **Designs nya öppning (D2)** kopplas in när den har levererats.

**Att besluta:**
1. Texten om samtycket är Designs om liggaren. Den säger inget om forskning. Om framstegen ska användas i forskning behöver samtyckestexten skrivas för det, av Vision Owner och den som ansvarar för forskningen.
2. Samtycket kan inte ändras i menyn ännu. Designs tabell säger "Inställningarna".
3. Spelets namn på spelaren används inte än någonstans.

**Skripten som börjar med bussen** fungerar inte längre: `order271-dod-from-start.mjs`, `order267-week-from-bus.mjs` och `order270-evening-from-bus.mjs`. De behöver gå via registreringen.

## 5. Regelkortet dag 1 och Spelets regler

`ui/RulesPanel.tsx`:
- **Kortet** visas första morgonen i ett nytt spel, före mentorn, med de tre reglerna och knappen Börja. Det visas en gång (`rulesSeen`).
- **Sidan Spelets regler** i menyn har dessutom vad som inte gäller och stjärnan med de verkliga gränserna:
  > Stjärnan kräver guld i Gastronomiska Teatern, ett rykte på minst 20 av 100 och att du klarar minst 45 % av veckans raketer, av minst 5. Gränserna ska hålla tre veckor i rad. En vecka under någon av dem, och stjärnan går förlorad.
- **Talen** kommer ur `balance.ts`: `SEASON.weeks` (åtta), `RISK.closeAfterWeeksBelowZero` (tre) och `STAR`. Talen skrivs ut som ord, i en ordlista i strängtabellen.
- Nycklarna är `{ sv, en }` (`rules.*`).

**Avvikelse att känna till.** Regel 1 är Anders text: "Tre bokslut under noll, och den stänger." Spelet stänger efter tre veckoavräkningar *i rad* under noll (`RISK`). Texten säger inte "i rad". Beslut: lägg till "i rad", eller låt det stå.

## 6. Bynivån före öppning

- **Vyknapparna** heter Byn (V) · Kvarteret (C) · Gatan (X) · Krogen (Z). Den aktiva vyn är markerad i guld, och texten radbryts inte.
  - Byn går alltid till byn (förut "Byn och tillbaka", med texten "Tillbaka till krogen").
  - Knappen Tillbaka är borttagen.
  - Esc går till Krogen (`useDesktopControls.ts`). Tangenttabellen i `CLAUDE.md` är uppdaterad.
- **Raketknappen** före öppning är grå (en avstängd huvudknapp är nu grå överallt, inte blekt gul) och säger "Öppnar 19.05", utan radbrytning (`layout.json` `clipped` tomt). Raden bredvid säger hur många satsningar kvällen har.
- **Tangenttipsen** nere till vänster står på en egen platta.
  - Ikonernas etiketter (Lagret, Kvällen, Rummet) syns när muspekaren ligger över ikonen. Förut ritades etiketten bara för den öppna panelen.
- **Förberedelsetiden** visar en rad under bandet (`PrepHint.tsx`):
  > Förberedelser · Personalen gör mise en place. Titta på konkurrenterna i byn (V) under tiden. Klockan går i 4× fram till öppningen 19.05.
  - Spelaren har ingen hand i förberedelserna: mise en place görs av personalen och visas först när dörrarna öppnat. Därför går klockan minst i `PREP_TIME.speedAtLeast` (4×, `balance.ts`, avsnitt Tiden) fram till öppningen (`simulation/consequence.ts` `effectiveSpeed`).
  - Pausen och konsekvensögonblicket gäller som förut.

## 7. Kvarteret och Gatan

- **Spelarens skylt** visar "Vinbaren vid torget, din krog", stilen (Vinbar), stjärnorna, priset ("omkring 160 kr per gäst") och kvällens gäster, i samma form som konkurrenternas.
  - I byn är det vår etikett bland de andra.
  - På kvarterets och gatans nivå är det en större skylt vid entrén (`VillageVenues.tsx`).
  - Den gamla skylten över taket (`PlayerBusiness.tsx`), som hängde vid den gamla byggnadens mitt och hamnade under HUD:en på gatan, är borttagen.
- **Skyltarna ligger inte på varandra.**
  - Vår skylt nära och etiketterna i byn visas på olika avstånd (110 m).
  - Etiketterna i byn flyttas isär som förut. Nu räknas också HUD:ens rutor som upptagna, så en etikett flyttas nedåt i stället för in under klockan.
- **På gatunivån** står krogen mitt i bilden. Målet i rummets ram är [0, 0] i stället för Designs [9, −2] (`eveningLevels.ts`, Designs fil oförändrad). Skylten är läsbar i 1280 × 720 (`layout-gatan-fore-oppning-1280x720.jpg`; namnets storlek är `max(15px, 24u)` i `service.css` `.nx-venue-label.is-near`, inte mätt i en fil).
  - Det stora trädet mitt i gatans bild (ORDER 297b §2) står nu till höger om krogen.

## 8. Tester och bygge

- `sim/__tests__/order300Borjan.test.ts`, med 6 tester:
  - "schema" och "schedule" i spelarens text;
  - Dagens val och söndagen;
  - flödet utan bussen och spelaren i tillståndet;
  - regelkortet en gång och talen ur `balance.ts`;
  - förberedelsernas fart;
  - nivåknapparnas namn, Esc och Tillbaka;
  - vår skylts namn.
- Hela sviten: 2 335 gröna och 15 överhoppade.
- Typecheck och bygge är gröna.
- Touch: under 900 px bredd gäller morgonens rullande skärm som förut. Nivåknapparna har samma storlek, minst 36 px.
