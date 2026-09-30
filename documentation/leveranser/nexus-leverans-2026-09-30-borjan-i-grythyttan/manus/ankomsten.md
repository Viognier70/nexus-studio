# Manus · Ankomsten till Grythyttan

Första utkastet, för granskning. Inget är ritat.

Ersätter dagens början, där spelaren står i vildmarken och fyller i ett formulär. Registreringen sker nu i scenen: på biljetten, i samtalet på bussen, i husets liggare och vid långbordet. Inget formulär visas.

## Grundidén

Spelaren kommer med bussen på en enkel biljett. Det finns ingen väg tillbaka i kväll. Bussen är full av studenter i olika åldrar, och alla går samma väg: Storgatan upp till Måltidens hus. Där sitter man vid **långbordet**, och det är måltiden vid det bordet som håller ihop Nexus: huset, byn, krogarna och människorna.

Spelaren kan ta sig därifrån, eftersom hållplatsen står kvar och bussen går tillbaka. Men först ska hen visa att hen kan stanna. I huset får den som har lagat något till bordet en nyckel. Med nyckeln har man ett rum och en plats i byn, och från och med då finns bussen tillbaka i tidtabellen.

## Personerna

| Vem | Vad | Klipp och utseende |
|---|---|---|
| **Spelaren** | Syns i scen 1 bara som händer och biljett. Från scen 2 en figur med ryggsäck. | `guest.walk`, `guest.standBar` (ny i leverans 3), ryggsäck ur leverans 4 |
| **Noor Haddad** | 41 år. Sjuksköterska i tjugo år, nu student i köket. Sitter bredvid spelaren. | studentens utseende från leverans 4, äldre |
| **Busschauffören** | Säger en mening. | sittande, syns i backspegeln |
| **Studenterna** | 14–18 stycken, mellan 19 och 60 år, med ryggsäckar, väskor på hjul och en gitarr. | `WARM.guest.student` |
| **Lova Berg** | Byns sociala kapital. Står på torget och hälsar på alla. | gästtypen *socialt kapital* (leverans 4) |
| **Ingrid Malm** | Spelarens mentor, krögare i trettio år. Står i dörren till Måltidens hus med liggaren. | som i morgonskärmen, nu i 3D |

## Registreringen i scenen

| Uppgift | Var i scenen | Hur spelaren svarar | Kan ändras senare |
|---|---|---|---|
| Språk | Scen 1, biljetten | Biljetten är tryckt på svenska och engelska. Spelaren trycker på den sida hen läser. | Inställningarna |
| Namn | Scen 1, Noor frågar | Namnet skrivs på biljettens namnrad, med handstil. | Inställningarna |
| Tilltal | Scen 1, Noor frågar hur hon ska presentera spelaren | *hon*, *han*, *hen* eller *bara namnet* | Inställningarna |
| Vad hen vill lära sig först | Scen 4, liggaren | Tre stationer syns i hallen bakom Ingrid: köket, vinet och salen. Spelaren pekar. | Styr bara var första övningen sker. Alla paviljonger är öppna som förut. |
| Samtycke till att spara framstegen | Scen 4, liggaren, sista raden | *Skriv under* | Inställningarna |

Formulärets övriga fält, om det finns fler, behöver jag veta innan ritningen (se frågorna sist).

## Scen 1 · Bussen

**Plats:** inne i bussen, sista biten före Grythyttan. Kvällssol genom fönstren, midsommarveckan.
**Längd:** 60–90 s.

**Kameran:** i sittande ögonhöjd bredvid spelaren, 1,2 m från Noor. Det här är spelets enda bild inifrån, och den hålls stilla. Skogen och vattnet glider förbi i fönstret.

1. Svart. Bussens motor och sorlet från studenterna (ljudet *rummets sorl* i en tunnare variant, se beställning 4). Bilden tonar upp.
2. Spelarens händer håller biljetten. Den är tryckt på två språk: `arrival.ticket.sv` på ena halvan och `arrival.ticket.en` på den andra. **Spelaren trycker på den halva hen läser.** Språket sätts, och den andra halvan tonas bort.
3. Noor lutar sig fram och tittar på biljetten: `arrival.noor.1`.
4. Spelaren svarar med en av två rader: `arrival.you.1a` eller `arrival.you.1b`. Båda leder vidare. Noor svarar på det spelaren valde: `arrival.noor.2a` eller `arrival.noor.2b`.
5. Noor: `arrival.noor.3`. **Biljettens namnrad blir ett skrivfält.** Namnet syns med handstil.
6. Noor: `arrival.noor.4`. **Fyra val som rader i samtalet:** `arrival.pronoun.she`, `.he`, `.they`, `.name`. Noor: `arrival.noor.5`. Valet hörs första gången i scen 4, när hon presenterar spelaren.
7. Busschauffören i backspegeln: `arrival.driver`. Bussen bromsar in.

## Scen 2 · Hållplatsen

**Plats:** hållplatsen vid infarten, där vägen från Örebro och Karlstad kommer in.
**Längd:** 30–40 s.

**Kameran:** går ut ur bussen och stannar på 6 m, i höjd med dörrarna. När den sista studenten har klivit av drar den sig bakåt och uppåt till **24 m** på 4 s, medan bussen kör iväg. Då syns byn för första gången, och Storgatan leder uppåt mot Måltidens hus.

1. Dörrarna öppnas. Studenterna kliver av en och en, med väskor, en gitarr och en cykel från bagaget. Spelaren kliver av sist tillsammans med Noor.
2. Bussen kör. Ljudet försvinner uppför backen.
3. **Hållplatsskylten** går att trycka på: `arrival.stop.none`. Det finns ingen buss tillbaka i kväll.
4. Noor, på väg: `arrival.noor.6`.

**Bara en väg:** Storgatan uppåt. De andra vägarna är stängda på riktigt, inte med osynliga väggar: en grind till en hage, sjön, och vägen ut ur byn där bussen försvann. Går spelaren åt fel håll vänder en student sig om och vinkar: `arrival.student.wave`.

## Scen 3 · Vägen

**Plats:** Storgatan förbi torget. Kvällsljus.
**Längd:** 60–90 s. Spelaren går själv, och studenterna går i klungor före och efter.

**Kameran:** spelets 24 m och spelarens vridning. Inget glider in.

1. Förbi **vinbaren**, som är mörk. En skylt i fönstret, en ikon utan text: nyckeln. Ingen säger något om den ännu.
2. **Lova Berg** står på torget och hälsar på alla som går förbi: `arrival.lova.1`. Om spelaren stannar vid henne: `arrival.lova.2`.
3. Två studenter bråkar vänligt om vem som ska bära gitarren. Klippen `guest.clap` och `guest.sing` (nya i leverans 3).
4. Måltidens hus syns i slutet av gatan, med ljus i alla fönster.

## Scen 4 · Dörren och liggaren

**Plats:** trappan och hallen i Måltidens hus.
**Längd:** 60–90 s.

**Kameran:** glider in till **12 m** på 1,2 s när spelaren når trappan, med Ingrid i vänstra tredjedelen och hallen med de tre stationerna bakom henne. Hålls under hela liggaren.

1. Ingrid står i dörren med liggaren, en stor inbunden bok, och hälsar på varje student med namn. Spelaren kommer sist, med Noor. Noor presenterar spelaren med det tilltal hen valde: `arrival.noor.intro.she`, `.he`, `.they` eller `.name`.
2. Ingrid: `arrival.ingrid.1`.
3. Ingrid öppnar liggaren (klippet `staff.openFolder`, nytt i leverans 3, med boken i stället för mappen). Liggaren visas som papper i gränssnittet, `color.paper`. Namnet står redan där, med samma handstil som på biljetten.
4. Ingrid: `arrival.ingrid.2`. Bakom henne syns tre stationer i hallen: köket, vinet och salen. **Spelaren pekar på en.** Liggaren fyller i raden med stationens ikon: `chef-hat`, `wine` eller `hand-platter`.
5. Ingrid: `arrival.ingrid.3`, om att det spelaren gör i huset sparas. **Den sista raden i liggaren är en namnteckning:** `arrival.ledger.sign`.
6. Ingrid stänger boken: `arrival.ingrid.4`.

## Scen 5 · Långbordet: att visa att man kan stanna

**Plats:** stora salen i Måltidens hus. Ett långbord för alla studenterna.
**Längd:** 2–3 min. Det här är spelets första övning, och den ser ut som en kväll, inte som ett prov.

**Kameran:** 12 m över bordets mitt, vriden så att köksluckan syns. Den följer spelaren med 0,4 s eftersläpning.

1. Studenterna dukar långbordet tillsammans. Noor bär bröd. Ingrid: `arrival.ingrid.5`.
2. Spelaren får tre uppgifter vid bordet, en per steg, från den station hen valde. Svaren är raketkortets svarsrader, med kunskapspyramiden ur beställning 4. Exemplet nedan gäller *salen*. Köket och vinet får egna frågor av samma slag när Vision Owner har levererat dem.
   - **Episteme:** Var ska kniven ligga? `arrival.q1`, svaren `a1_1`–`a1_4`. Rätt: till höger, eggen in mot tallriken.
   - **Techne:** Hur bär du fyra vinglas utan bricka? `arrival.q2`. Rätt: upp och ned, med foten mellan fingrarna.
   - **Phronesis:** En student kommer sent, och alla platser är tagna. `arrival.q3`. Rätt: flytta ihop och duka en plats till. Försvarbart: ge bort sin egen plats (`near3_3`), vänligt men då saknas spelaren vid bordet.
   - Svaren i ett steg skiljer sig högst 6 tecken på svenska.
3. **Rätt svar** är grönt och **fel svar** rött, enligt den nya regeln. Förklaringen efteråt är lika vänlig som förut, och Ingrid säger den (`arrival.qN.why`). **Ingen kan misslyckas här.** Ett fel svar förklaras, och scenen fortsätter som om det hade gått rätt. Noor tar över uppgiften, i samma anda som *Per tog över*.
4. Alla sätter sig. Klippen `guest.sit`, `guest.toast` och `guest.eat`. Ljudet *skål*. Ingrid höjer glaset: `arrival.ingrid.6`.

## Scen 6 · Nyckeln

**Plats:** långbordet, sedan trappan utanför.
**Längd:** 30–40 s.

**Kameran:** stannar på 12 m medan Ingrid ger nyckeln. Sedan går den ut genom fönstret och upp till **24 m** över byn på 6 s. Skymning. Vinbaren längre ned på gatan syns mörk.

1. Ingrid lägger en nyckel bredvid spelarens tallrik: `arrival.ingrid.7`.
2. Spelaren tar nyckeln. Den läggs i HUD:en, där kassan senare kommer att stå.
3. Kameran drar sig upp över byn. Vinbarens skylt med nyckelikonen tänds svagt: den visar att det finns något att öppna där.
4. `arrival.end` tonas in som enda text, och sedan börjar morgonen dag 1 (leverans 1, skärm 1).

## Att ta sig därifrån

- **Hållplatsen står kvar hela säsongen.** Före nyckeln säger skylten `arrival.stop.none`.
- **Efter nyckeln** står nästa avgång på skylten: `arrival.stop.next` med `{time}` ur tidtabellen.
- **Att ta bussen** betyder att lämna säsongen. Frågan ställs i ord, inte i en ruta: busschauffören säger `arrival.driver.leave`, och spelaren svarar `arrival.you.leave` eller `arrival.you.stay`.
- **Det spelaren har lärt sig följer med**, som i speldesignen. Kommer hen tillbaka en annan säsong står det *Tur och retur* på biljetten (`arrival.ticket.return`), och Ingrid känner igen hen i dörren (`arrival.ingrid.back`).

## Den som har spelat förut

Efter första gången går det att hoppa över bussen och vägen. Då börjar spelaren i dörren till Måltidens hus. Biljetten och liggaren är redan ifyllda, och scen 4 tar 10 s.

## Tider och kamera i sammandrag

| Scen | Längd | Kameran |
|---|---|---|
| 1 Bussen | 60–90 s | inne, sittande ögonhöjd, stilla |
| 2 Hållplatsen | 30–40 s | 6 m, sedan ut till 24 m på 4 s |
| 3 Vägen | 60–90 s | 24 m |
| 4 Liggaren | 60–90 s | in till 12 m på 1,2 s |
| 5 Långbordet | 2–3 min | 12 m, följer spelaren |
| 6 Nyckeln | 30–40 s | 12 m, sedan ut till 24 m på 6 s |
| **Hela** | **6–9 min** | |
