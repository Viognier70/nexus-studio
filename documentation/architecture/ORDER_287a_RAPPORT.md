# ORDER 287a — Gästerna med kapital (rapport)

**Ordern** (Vision Owner 2026-09-30): "Gästtyper efter Bourdieus kapital. Varje gästtyp har eget ekonomiskt och socialt kapital, och det ska märkas i spelet: Studenten … Medelinkomsttagaren … Höginkomsttagaren … Gästen med socialt kapital … Miljardären, i enkel form … Det här ska synas: gästtyperna i rummet, med färgerna i WARM.guest från Designs leverans 1. Bokningsboken på morgonen visar kvällens gäster efter typ, enligt Designs skärm 1. Kvällens resultat och söndagstidningen visar vilka som kom och vad de betydde. Sittklippen: spela dem i sin egen längd på alla sitsar. Sällskapet räknas som sittande när den sista gästen har landat (beslut 2026-09-30). Balans: alla tal i balance.ts. Kör harness med rimlig och svag spelare. Slumpmålet 70–80 % ska hålla, och rapportera hur intäkten per kväll ändras. Inte i 287a: stjärnorna (287b), rivalerna (288a) och miljardärens promenad (288c). Kontrollera hela veckan från bussen i produktionsbygget."

Registret (rad 287) anger dessutom att hållbarheterna som nivåer 0–10 och stegtiderna 20/20/30 s byggs med 287a. Båda är byggda (§1).

## 1. Vad som byggdes

**Gästtypen** (`frontend/src/strategic/simulation/guestTypes.ts`, talen i `balance.ts` `GUEST_TYPES`). Varje gäst får en typ när hen kommer: student, medelinkomst, höginkomst, socialt kapital eller miljardären. Typen ger:
- plånboken (`GUEST_TYPES.wallet` → `GUESTS.walletSek`): studenten den snåla (300 kr, smak för det billiga, alltså billig öl), medelinkomsttagaren och gästen med socialt kapital den normala, höginkomsttagaren den generösa (1 100 kr, smak för det dyra), miljardären 8 000 kr och smaken för det dyraste;
- sittiden (`stayFactor`): studenten sitter 1,25 gånger så länge (`service.ts` `diningDuration`);
- förväntan (`satisfactionOffset`): höginkomsttagaren kommer in med 0,05 lägre nöjdhet och är svårare att göra nöjd.

Typen läses ur fröet och gästens id och flyttar inte simuleringens slumpflöde.

**Bokningsboken** (`bookingFor`, Designs skärm 1). Kvällens väntade gäster är marknadens tak. 15 % kommer utan bokning, och resten delas efter rummets andelar (vinbaren: studenter 20 %, medelinkomst 55 %, höginkomst 25 %; ölkrogen 40/45/15). Bokade gäster kommer från sin tid: studenter 18.00, medelinkomst 18.30, höginkomst 19.00 och gästen med socialt kapital 19.30. Boken låses när dörrarna öppnar (`reducer.ts` `startService`), så morgonen visar samma bok som kvällen spelar. Gäster som kommer när en typs bokning är slut, eller utan bokning, får typ efter andelarna.

**Gästen med socialt kapital** (`SOCIAL_GUEST`). Hen har bokat ungefär varannan kväll och står med namn i boken. Går hen nöjd (nöjdhet från 0,70) växer marknadens tak med 15 % de tre närmaste servicekvällarna. Går hen missnöjd (under 0,50), ger upp i kön eller går utan mat krymper taket med 12 % (`settleSocialGuest`, `sim/economy.ts` `dailyGuestCap`). Strömmen säger det i stunden, bokningsboken nästa morgon ("Lova Berg spoke well of you: more guests tonight.").

**Miljardären i enkel form** (`BILLIONAIRE`). Han är i byn fredag och lördag. Chansen att han väljer spelarens krog är 10 % plus 40 % gånger ryktet (`bookingFor`). Då kommer han 20.00, också om marknadens tak redan är nått (`maybeBillionaireArrives`). Han beställer det dyraste, en flaska också ensam (`guestOrders.ts`), och bjuder i hälften av besöken hela salen på champagne ur det dyraste vinet i lagret, ett glas per gäst. Det läggs på hans nota, och gästerna i rummet blir nöjdare (`billionaireTreat`). Morgonen säger "The hotel called. They have an unusual guest this weekend." när han är i byn. Får han inget bord och går utan att betala står det så; tidningen säger då att han åt på hotellet.

**Det syns:**
- **I rummet:** gästernas plagg i typens färg ur `WARM.guest` (`WineBarFigures.tsx`, och `InteriorGuests.tsx` för övriga rum). Miljardären är guld. Designs 3D-utseende för typerna kommer i leverans 4.
- **Bokningsboken** (`BookingBook.tsx`): rader med tid, prick i typens färg, vem, en rad om dem och antalet, som Designs skärm 1. Gästen med socialt kapital står med namn, och gästerna utan bokning sist. Stjärnorna i Designs fot hör till 287b och är inte med.
- **Kvällens resultat** (`ResultScreen.tsx`, *Who came*): gäster och intäkt per typ och per gäst, vad gästen med socialt kapital gjorde med ryktet och vad miljardären betalade och bjöd på.
- **Söndagstidningen** (`sim/newspaper.ts`): *Seen in town* (Designs `paper.seen.*`): åt mannen i guld hos spelaren står kvällen och att han bjöd salen; annars gick han längs sjön och åt på hotellet. Marknaden säger vilka som kom mest, och vad gästerna med socialt kapital sa. Tidningen är i ord utan siffror, som förut (ORDER 267).

**Sittklippen i sin egen längd** (`wineBarDirector.ts` `sitSeconds`, `standSeconds`). Regissörens fasta 1,2 s är ersatt av klippets längd: stol 2,2 s, barstol 2,6 s, lounge 3,2 s (sätta sig), och 2,6, 2,2 och 2,8 s (resa sig). Sällskapets tid flyttas till den sista gästens landning, och servitören kallas först när alla har landat (`joinParty`, `advanceParties`). Klippets första bildruta var slutposen när klippet började (progress 0 föll tillbaka på fasen); det är rättat (`theatreClips.ts`).

**Hållbarheterna som nivåer 0–10** (`frontend/src/sim/sustainabilityLevels.ts`, talen i `SUSTAINABILITY_LEVELS`, förslaget i `FORSLAG_HALLBARHETERNA_0_10.md` med Vision Owners villkor). Nivån räknas när servicen stänger och förra kvällens nivå sparas. Kvällens resultat visar tio prickar, guld upp till nivån, och förra kvällens nivå streckad.

**Stegtiderna** är episteme 20, techne 20 och phronesis 30 sekunder (`INCIDENTS.stepSeconds`).

## 2. Balansen

Alla tal står i `balance.ts` (`GUEST_TYPES`, `SOCIAL_GUEST`, `BILLIONAIRE`, `SUSTAINABILITY_LEVELS`), och de valda talen är öppen fråga F57.

**Kalibrering mot hyrans mål.** Med de första talen (studentens sittid 1,4, höginkomsttagarens förväntan −0,08, gästen med socialt kapital nöjd från 0,75) föll den rimliga spelarens resultat från 8,2 % till 3,7 % av veckointäkten, under hyrans mål 5–10 %. Mätt i varianter om 10 frön: sittiden kostade mest, därefter förväntan och gästen med socialt kapital, som oftast gick missnöjd. Talen valdes så att andelen ligger kvar i målet. De första talen, varianterna och deras resultat står inte i en fil; det är mätningar under arbetet (`src/__scratch__`, borttagen).

**Mätt på grenen mot main** (samma skript och frön):

| Mått | main (`cae53c9`) | 287a | Fil |
| --- | --- | --- | --- |
| Slumpmålet, `winShare` (1 000 veckor) | 0,745 | 0,737 | `baseline-randomness.json`, `randomness.json` |
| Rimlig spelare, veckointäkt (20 frön) | 43 561 kr | 44 001 kr | `baseline-week-players.json`, `week-players.json` `mean.rimlig.revenueSek` |
| Rimlig spelare, intäkt per kväll (veckan / 6) | 7 260 kr | 7 334 kr | samma |
| Rimlig spelare, veckans resultat | 1 992 kr | 2 172 kr | samma, `resultSek` |
| Svag spelare, veckans resultat | −33 793 kr | −33 822 kr | samma; minus alla 20 veckor (`svagMinusWeeks`) |
| Hyran: rimlig spelares andel (10 frön) | 8,2 % | 7,6 % | `baseline-rent-check.json`, `rent-check.json` `rows[0].reasonable.meanShare` |
| Hyran: svag spelare nedgraderad | vecka 3 | vecka 3 | samma, `weakDowngradeWeeks` |

Alla filer ligger i `frontend/reports/order287a/` @ `order-287a`. Baslinjen är mätt på main i en egen arbetskopia med samma skript.

**Intäkten per kväll** ändras alltså lite i medel: +73 kr (+1,0 %) för den rimliga spelaren. Fördelningen ändras mer (`guest-types.json`, 20 veckor, 120 kvällar, medel 7 329 kr per kväll):

| Typ | Gäster | Intäkt per gäst |
| --- | --- | --- |
| Student | 918 | 133 kr |
| Medelinkomst | 2 375 | 184 kr |
| Höginkomst | 1 138 | 214 kr |
| Socialt kapital | 56 | 245 kr |
| Miljardären | 4 | 1 557 kr |

(`perType.*.perGuestSek`.) Höginkomsttagaren ger inte mycket mer än medelinkomsttagaren i harnessen, eftersom den rimliga spelaren köper baspaketet och menyn har få dyra val. Med fler viner och rätter (287b) växer skillnaden. Gästen med socialt kapital gick nöjd 49 gånger av 56 och missnöjd ingen gång (`social`). Den rimliga spelaren sköter henne väl; det är den svaga som får höra det i byn. Miljardären kom 4 av 40 möjliga kvällar och bjöd två gånger (`billionaire`), eftersom ryktet i vecka 2 är lågt. Han kommer oftare när ryktet växer.

## 3. Spelarens flöde

**Veckan från bussen i produktionsbygget** (`frontend/reports/order287a/dod.json` och `dod-*.png` @ `order-287a`, skript `frontend/scripts/order271-dod-from-start.mjs`). Hela veckan till söndagen och X1 gick igenom utan fel i sidan (`errors` tom). Varje kväll visade kvällens resultat (`eveningSequences`). Fredagen föll ihop och gick direkt till R1 (`R1 → L1 → K1`).
- **Bokningsboken** varje morgon (`bookings`): typerna och gästen med socialt kapital med namn. Fredag och lördag stod hotellets rad om den ovanliga gästen, och lördag stod ryktet från gästen med socialt kapital ("Signe Dahl spoke well of you: more guests tonight."). Bilder: `dod-46-bokningsboken-2.png` och `-6.png`.
- **Kvällens gäster i R1** (`eveningGuests`): lördag kom miljardären, betalade 3 188 kr och bjöd salen på 19 glas. Bild: `dod-47-R1-gasterna.png`, med nivåprickarna för hållbarheterna.
- **Tidningen** (`newspaperSeen`, `newspaperMarket`): *Seen in town* med mannen i guld hos spelaren, och vilka som kom mest. I 1920 × 1080 står *Seen in town* under skärmkanten i tidningens högra spalt (`dod-10-T1-sondagstidningen.png`).
- **Gästernas färger** syns i rummet (`dod-22-lordag-figurerna-*.png`).

**Rättat i veckoskriptet:** en kväll som faller ihop går direkt till R1 utan sopbil. Skriptet väntade bara på sopbilens skärm och lät kvällen ta slut av sig själv, och den första körningen föll därför på fredagen ("kvällens resultat visades inte"). Felet fanns före 287a: kvällen faller ihop lika ofta på main, cirka 30 % av fredagarna i vecka 2. Nu väntar skriptet också på R1 och L1.

**Bildfrekvensen.** Veckokörningen gav 15 bildrutor per sekund (`fpsService`, 28–29 i 286a och 289). Medan måndagens service mättes körde jag typkontroller i en annan arbetskopia. Därför mätte ett eget skript (`frontend/scripts/order287a-fps.mjs`) samma kväll från sparfilen i båda byggena, utan annan last: main 21 och 10, 287a 19 och 20 (median av fem, `fps-main.json`, `fps-main-2.json`, `fps-order-287a.json`, `fps-order-287a-2.json`). Mätningarna varierar mer än skillnaden, och någon försämring av 287a syns inte. Kravet ≥ 24 (ORDER 286a) är inte mätt om i den här ordern.

## 4. Tester

`frontend/src/sim/__tests__/order287aGuestTypes.test.ts` prövar:
- att bokningsboken är marknadens tak och följer andelarna;
- att gästen med socialt kapital bokar varannan kväll och miljardären bara fredag och lördag, oftare med högre rykte;
- plånboken, sittiden och förväntan per typ;
- att gästerna får typ ur boken, och att bara studenter kommer ur boken före 18.30;
- ryktet de närmaste servicekvällarna åt båda hållen;
- miljardären: att han kommer utanför taket, champagnen till salen, det dyraste på menyn;
- kvällens post och tidningen i ord med *Sett på stan*;
- hållbarheterna 0–10 med förra kvällens nivå;
- sittklippen i sin egen längd på stol, barstol och lounge, och sällskapet sittande när den sista landat.

Ändrade tester, med skäl i koden:
- `order267Pressure`: sittiden 60–90 min (F31) mäts för övriga gäster, och studenten redovisas för sig;
- `m4a`: pristestets golv 6 → 5, samma vippning som ORDER 259;
- `m3`: toleransen 1,05 → 1,06. Avvikelsen är samma 362 kr som ORDER 265 mätte, men kassarörelsen är mindre;
- `newspaper`: tidningen har fem delar när miljardären var i byn;
- `balance`, `order270Incidents`: stegtiderna 20/20/30.

Hela sviten är grön (138 testfiler; 2 213 tester, 4 överhoppade som förut). Två ohanterade `window is not defined` från jsdoms nedstängning fanns redan på main.

## 5. Avvikelser och öppet

- **Hållbarheterna och stegtiderna** står inte i orderns text, men i registrets rad 287 och i speldesignen ("byggs i nästa order"). De är byggda här.
- **Miljardären kommer sällan tidigt i säsongen** (4 av 40 kvällar i vecka 2). Chansen följer ryktet. Om Vision Owner vill se honom oftare i provspelet höjs `BILLIONAIRE.chooseBase`.
- **Gästernas 3D-utseende per typ** kommer med Designs leverans 4. Nu är det plaggets färg.
- **Tidningens hotell** är Designs "Hotellets matsal". Byns övriga krogar kommer med rivalerna (288a).

Gren `order-287a` från `main`.
