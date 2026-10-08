# ORDER 306b: elva situationer i formen analys → upplevelse → handling

Beslut från Anders 2026-10-07, kör efter 315c. Detta utkast ersätter `UTKAST_RAKETER.md` (306) och bygger på `GRANSKNING_306.md`. Innehållet är skrivet av Claude på Anders uppdrag. Formen bygger på TRIAD-modellen och det dubbla greppet (Crichton-Fock, tidigare Herdenstam).

---

## Del A. Regler för Code

### A1. Fel i ett steg avslutar inte situationen
Spelaren handlar alltid i steg 3, också när ett tidigare steg blev fel. Det dubbla greppet lär ut just detta: att handla med bara det ena registret ger ett halvt grepp.

- **Fel i steg 1 eller 2:** ledtråden blir i stället *"Analys: (oklart)"* eller *"Upplevelse: (oklart)"*, och steg 3 spelas ändå.
- Följden av felet gäller (originalets effekt), och potten nollas (se A2).

### A2. Kvitt eller dubbelt över tre steg
Potten är **1 → 3 → 7** krediter:

| Läge | Vad som händer |
|---|---|
| Rätt i steg 1 | Potten blir 1. Spelaren väljer *Stanna* eller *Gå vidare*. |
| Rätt i steg 2 | Potten blir 3. Spelaren väljer *Stanna* eller *Gå vidare*. |
| Helt grepp i steg 3 | Potten blir 7. |
| Halvt grepp i steg 3 | Potten blir 3 × `CONSEQUENCES.halfGrip` (0,5), alltså avrundat 2. |
| Ok i steg 1 eller 2 | Potten står still. |
| Fel i ett steg | Potten nollas, men situationen fortsätter (A1). |

**Stanna:** krediterna är säkrade, och **personalen gör resten av situationen** med sin egen kompetens (0,4, eller 0,65 med utbildning). Det är att delegera, och det är också omdöme. Låset, väntan och nedräkningen gäller som i dag.

### A3. Tiden
- Steg 1: 20 s.
- Steg 2: 30 s.
- Steg 3: **30 s** (var 20).

### A4. Alternativen går inte att gissa
- **Högst 15 ord per alternativ** i steg 3, och högst 12 i steg 1 och 2. Förklaringen visas först efter svaret.
- **Ungefär lika långa:** i steg 3 får inget alternativ vara mer än 1,5 gånger så långt (i ord) som det kortaste. Lägg till ett test i `validateIncidentBank`, och rapportera de alternativ som inte klarar det.
- **Ordningen blandas** varje gång situationen visas.
- **Steg 3:** minst ett helt grepp, och resten fritt mellan halvt mot analysen, halvt mot upplevelsen och fel. Två situationer (vb18 och vb32) har två hela grepp med olika kostnad.

### A5. Ledtrådarna visar riktningen, inte svaret
Ledtrådarna är kortare än i 306. De säger vad spelaren har förstått, men inte vad hon ska göra.

### A6. Gästens replik har varianter
Varje situation har två repliker (A och B) med samma önskan. Repliken lottas, och samma variant visas inte två gånger i rad för samma spelare. Tanken är att steg 2 ska läsas, inte kännas igen. *Senare (306c): varianter med olika önskan, som leder till olika hela grepp, och stamgäster som minns förra besöket.*

### A7. Det hela greppet kan kosta
Fältet `cost` (kr) per alternativ i steg 3 dras från kassan direkt. Vinsten kommer i stället i stämning och rykte. Beloppen är förslag och kalibreras i harness.

### A8. Nya fält
| Fält | Betydelse |
|---|---|
| `guestLine.a`, `guestLine.b` | Gästens två repliker i steg 2. |
| `steps[2].options[].cost` | Kostnaden i kr för valet, 0 om den saknas. |
| `halfGrip.analysis`, `halfGrip.experience` | Återkopplingen. **Utan inledningen "Halvt grepp: valet höll för …"**, som kortet visar som etikett. |
| `halfGrip.outcomeAnalysis`, `halfGrip.outcomeExperience` | Vad som syns i rummet vid halvt grepp. |
| `staff.success`, `staff.fail` | Personalen tar över: text när personalen lyckas och när den misslyckas. |
| `steps[2].form` | `'choice'` (standard) eller `'sequence'` (pilot i vb40, se A9). |

### A9. Steg 3 som ordning (pilot i vb40)
Spelaren lägger handlingskort i rätt ordning, och några kort ska inte vara med. Greppet räknas ut ur vilka kort hon väljer och i vilken ordning. Design ritar korten (D8). Om det fungerar provas formen i fler situationer.

### A10. Harness
- Fel i steg 2 ska i första hand påverka stämningen och ryktet, och mindre ekonomin.
- Mät hur ofta de olika spelartyperna stannar, och vad det gör med kassan.
- "Gissaren", en ny typ som alltid väljer det längsta alternativet, ska inte lyckas bättre än slumpen. Det är testet för A4.
- Rapportera tabellen. Merga och pusha.

### A11. Referenser
Står tomma tills Anders har fyllt i dem. Fakta som är märkta ⚖ visas inte förrän de är granskade (`legalReviewed: false`).

---

## Del B. Situationerna

Märkningen i steg 3: **[H]** helt grepp · **[A]** halvt, mot analysen (analysen höll, upplevelsen saknades) · **[U]** halvt, mot upplevelsen (upplevelsen höll, analysen saknades) · **[F]** fel.

---

### 1. Första flaskan (vb01-korken) · sommellerie · opening

*Situationen:* Kvällens första flaska: {gäst} vid bord {bord} har beställt en {vin}. När {personal} drar korken luktar det fuktig källare och våt kartong.

**Steg 1 · Analys.** Vad säger doften av fuktig källare och våt kartong?
1. Reduktion, alltså svavelföreningar (fel). *Reduktion luktar tändsticka eller svavel och kan ofta luftas bort. Fuktig källare är något annat.*
2. Oxidation, för mycket syre (fel). *Oxiderat vin luktar trött äpple, nötter eller sherry. Källare och kartong pekar på korken.*
3. Korkdefekt, ämnet TCA (rätt). *Doften kommer av ämnet TCA. Felet sitter i just den flaskan, inte i vinet som sådant.*
4. Ett ungt, stängt vin (fel). *Ett ungt vin kan säga lite, men det luktar inte källare. Doften är ett fel, inte en ålder.*

*Ledtråd:* Analys: Felet sitter i korken.

**Steg 2 · Upplevelse.**
- *A:* "Det är väl inget fel? Vi har sett fram emot just det här vinet hela veckan."
- *B:* "Du luktade länge på korken. Är allt som det ska? Det är vårt favoritvin."

Vad söker gästen?
1. Att slippa höra om problem (fel). *Gästen frågade rakt ut. Den som frågar vill ha ett svar.*
2. Just det vinet, och ett ärligt besked (rätt). *Gästen vill ha vinet hen valt och veta vad som händer.*
3. Något gott att börja med, vad som helst (ok). *Gästen vill komma igång, men har valt just det vinet.*

*Ledtråd:* Upplevelse: Gästen frågade rakt ut.

**Steg 3 · Handling.** Vad gör du?
1. **[H]** Säg att flaskan är korkad, öppna en ny och byt glas. *Kostnad: flaskans inköpspris.* *En korkad flaska byts alltid, och glasen också, eftersom doften sitter kvar. Korkdefekt är ingen skam. Att säga det öppet bygger förtroende.*
2. **[A]** Öppna en ny flaska, byt glas och säg inget om felet. *Kostnad: flaskans inköpspris.* *Flaskan och glasen byts rätt. Men gästen frågade, och tystnad ser ut som att krogen döljer något.*
3. **[U]** Säg ärligt att vinet är stängt och karaffera det vid bordet. *Ärligheten är rätt, men luft hjälper mot reduktion, inte mot korkdefekt. TCA försvinner inte med syre.*
4. **[F]** Servera ändå och säg att doften hör till vinets karaktär. (Leder till `vb30-korkgasten`.) *Korkdefekt är ett fel i flaskan. Gästen märker det, och förtroendet för hela vinlistan sjunker.*

*Halvt grepp, mot analysen:* Flaskan byttes rätt, men gästen fick inget svar på sin fråga.
*I rummet:* Ny flaska på bordet, men gästen ser fortfarande frågande ut.
*Halvt grepp, mot upplevelsen:* Beskedet var ärligt, men korkdefekt går inte att lufta bort. Bara en ny flaska hjälper.
*I rummet:* Karaffen står på bordet. Gästen smakar och rynkar på näsan.
*Klarad:* Ny flaska och nya glas. Gästen nickar efter första smaken.
*Personalen lyckas:* Sara känner igen korken och byter flaskan utan att säga mycket.
*Personalen misslyckas:* Flaskan serveras som den är, och gästen skickar tillbaka den efter första glaset.

---

### 2. Roséns temperatur (vb02-rosen) · sommellerie · opening

*Situationen:* Kvällen är varm. Vitvinerna håller 10 grader i kylen, men roséerna som just kom står i 24 grader. De första gästerna vill ha rosé.

**Steg 1 · Analys.** Vid vilken temperatur ska en rosé serveras?
1. Rumstemperatur, runt 22 grader (fel). *Så varmt smakar roséen tung och söt, och alkoholen sticker fram.*
2. 16–18 grader, som ett rött (fel). *Det passar många röda. En rosé behöver vara kallare för att friskheten ska synas.*
3. Iskall, 2–4 grader (fel). *För kallt stänger doften, och vinet smakar nästan ingenting.*
4. 8–10 grader (rätt). *Då är roséen frisk utan att doften försvinner.*

*Ledtråd:* Analys: Flaskorna är för varma.

**Steg 2 · Upplevelse.**
- *A:* "Något kallt och friskt, gärna rosé. Vi har gått i solen hela dagen."
- *B:* "Vi har cyklat från Hjulsjö. Har ni rosé, riktigt kall?"

Vad söker gästerna?
1. Rosé, och temperaturen spelar mindre roll (fel). *De sa kallt först. En ljummen rosé en varm kväll minns de.*
2. Något att dricka snabbt, vad som helst (ok). *Det brådskar, men de bad om rosé.*
3. Svalka nu, och en kall rosé (rätt). *Två önskningar: något kallt direkt, och roséen de bad om.*

*Ledtråd:* Upplevelse: Gästerna är varma och törstiga.

**Steg 3 · Handling.** Vad gör du?
1. **[H]** Flaskorna i is och vatten, säg "tio minuter" och bjud på kallt vatten. *Kostnad: 0 kr.* *Is och vatten kyler en flaska på tio–femton minuter, mycket fortare än kylen. Gästerna vet varför det dröjer och har något kallt i handen.*
2. **[U]** Servera roséen direkt, med några isbitar i glaset så att den blir kall. *Gästerna får något kallt direkt, men isen späder vinet och tar bort både doft och syra.*
3. **[A]** Flaskorna i is och vatten, och ta upp beställningen under tiden. *Kylningen är rätt, men gästerna står med tomma händer och vet inte varför det dröjer.*
4. **[F]** Servera den varma roséen som den är och hoppas att ingen märker något. *Gästerna märker det på första klunken.*

*Halvt grepp, mot analysen:* Roséen blev kall, men gästerna stod utan något i handen och utan besked.
*I rummet:* Gästerna väntar vid baren och tittar på klockan.
*Halvt grepp, mot upplevelsen:* De fick något kallt direkt, men isen späder roséen. Det är flaskan som ska kylas.
*I rummet:* Isbitarna klirrar. Efter en stund smakar vinet vatten.
*Klarad:* Hinkarna står på bardisken. De första roséglasen är kalla och immiga.
*Personalen lyckas:* Per lägger flaskorna i is och häller upp vatten så länge.
*Personalen misslyckas:* Roséen serveras som den är. Den smakar varmt och sött.

---

### 3. Nötallergi (vb03-notallergi) · kök · opening · ⚖

*Situationen:* {gäst} vid bord {bord} har nötallergi och frågar om bruschettan med basilikapesto går bra. {personal} är osäker på vad som finns i peston.

**Steg 1 · Analys.** Vad finns i en klassisk basilikapesto?
1. Basilika, pinjenötter, vitlök, hårdost och olivolja (rätt). *Pinjenötter är fröer och räknas inte till de nötter som ska märkas enligt EU:s regler, men många med nötallergi reagerar på dem. Hårdosten innehåller mjölk, som också är ett allergen. Kvällens recept måste ändå kollas.* ⚖
2. Basilika, jordnötter och olja (fel). *Jordnötter hör inte till klassisk pesto.*
3. Basilika, hasselnötter och ost (fel). *Nöten i originalet är pinjenöten.*
4. Bara basilika, ost och olja (fel). *Det är en vanlig miss. Klassisk pesto innehåller pinjenötter.*

*Ledtråd:* Analys: Peston kan innehålla något gästen reagerar på.

**Steg 2 · Upplevelse.**
- *A:* "Jag brukar inte våga beställa något med sås när jag äter ute. I kväll vill jag bara äta utan att oroa mig."
- *B:* "Förra gången jag åt ute fick jag åka in. Jag vill bara ha en vanlig kväll."

Vad söker gästen?
1. Att slippa peston (ok). *Det är en del, men gästen vill äta utan oro hela kvällen.*
2. Att bli lugnad med att det nog går bra (fel). *"Nog" är just det som gör gästen orolig.*
3. Ett säkert besked och en rätt utan oro (rätt). *Gästen behöver fakta och en kväll utan oro, och båda kräver att köket vet.*

*Ledtråd:* Upplevelse: Gästen är rädd och vill kunna slappna av.

**Steg 3 · Handling.** Vad gör du?
1. **[H]** Kolla med köket, ge rakt besked, föreslå en säker rätt och märk ordern. *Kostnad: 0 kr.* *Ett allergisvar bygger på receptet och köket. När ordern är märkt hålls den fri från nötter hela vägen till bordet.* ⚖
2. **[A]** Kolla med köket, säg vad peston innehåller och låt gästen välja själv. *Beskedet är rätt, men gästen står ensam med oron inför nästa rätt.*
3. **[U]** Avråd från bruschettan och föreslå en annan rätt, utan att fråga köket. *Gästen känner sig omhändertagen, men ingen vet vad som finns i den nya rätten.*
4. **[F]** Säg att det nog inte finns nötter i peston. *Att gissa om allergener är det farligaste misstaget i en servering. Gästen ska få korrekt allergeninformation.* ⚖

*Halvt grepp, mot analysen:* Beskedet var rätt, men gästen fick leta själv och sitter kvar med oron.
*I rummet:* Gästen läser menyn länge och beställer bara bröd.
*Halvt grepp, mot upplevelsen:* Gästen kände sig omhändertagen, men ingen frågade köket och ordern är inte märkt.
*I rummet:* Rätten går ut. Köket vet inget om allergin.
*Klarad:* Gästen får en rätt som köket har bekräftat, och tackar för att frågan togs på allvar.
*Personalen lyckas:* Elin går till köket, kollar receptet och märker ordern.
*Personalen misslyckas:* Personalen svarar på måfå och serverar bruschettan.

---

### 4. Provning för fyra (vb07-provningen) · sommellerie · rush

*Situationen:* Ett sällskap på fyra vid bord {bord} vill ha en provning med tre viner.

**Steg 1 · Analys.** I vilken ordning provas tre viner?
1. Dyrast först, medan gommen är pigg (fel). *Priset säger inget om ordningen.*
2. Fylligast först, för att värma upp (fel). *Ett fylligt vin tar över, och de lätta försvinner efteråt.*
3. Sött först, för att väcka aptiten (fel). *Sötma sitter kvar och gör torra viner sura efteråt.*
4. Lätt före fylligt, torrt före sött (rätt). *Varje vin får visa sig utan att det förra tar över.*

*Ledtråd:* Analys: Ordningen avgör hur vinerna smakar.

**Steg 2 · Upplevelse.**
- *A:* En i sällskapet säger: "Jag kör hem i kväll, men jag vill inte sitta bredvid och titta."
- *B:* En i sällskapet säger: "Jag är chaufför i kväll. Får jag vara med ändå?"

Vad söker gästen?
1. Lika mycket som de andra, det är små glas (fel). *Tre små glas blir ett par glas vin, och gästen kör.*
2. Att vara med fullt ut, utan att dricka (rätt). *Gästen vill smaka och jämföra. Att smaka utan att dricka går.*
3. Något eget att dricka under tiden (ok). *Omtänksamt, men ett eget glas är fortfarande att sitta bredvid.*
4. Att slippa vara med (fel). *Gästen sa tvärtom.*

*Ledtråd:* Upplevelse: En gäst kör men vill vara med.

**Steg 3 · Handling.** Hur dukar och häller du?
1. **[A]** Nytt provglas per vin, lätt före fylligt, lika påfyllning till alla. *Glas och ordning är rätt, men gästen som kör kan inte smaka utan att dricka.*
2. **[F]** De glas som finns närmast, fylligast först, lika till alla. *Fylligt först gör resten tunt, och gästen som kör lämnas med fulla glas.*
3. **[H]** Nytt provglas per vin, lätt före fylligt, spottkopp och vatten på bordet. *Kostnad: 0 kr.* *Nya glas håller dofterna isär. Att spotta är normalt på en provning, och gästen som kör kan vara med fullt ut. Krogen tar sitt ansvar för alkoholserveringen.*
4. **[U]** Spottkopp på bordet, ett glas per person, sköljt med vatten mellan vinerna. *Gästen får vara med, men vatten späder nästa vin. Skölj med en skvätt av nästa vin, att avinera glaset.*

*Halvt grepp, mot analysen:* Provningen var rätt byggd, men gästen som kör kunde inte vara med.
*I rummet:* En gäst sitter med tre fulla glas framför sig.
*Halvt grepp, mot upplevelsen:* Alla fick vara med, men vatten i glaset späder nästa vin.
*I rummet:* Bordet jämför viner som smakar vatten.
*Klarad:* Tolv glas i rader på bordet. Gästerna jämför och diskuterar, och en av dem spottar och skrattar.
*Personalen lyckas:* Sara dukar provglas och ställer fram en spottkopp.
*Personalen misslyckas:* Personalen tar de glas som finns närmast.

---

### 5. Vin till getosten (vb09-getosten) · sommellerie · rush

*Situationen:* {gäst} vid bord {bord} beställer den färska getosten med honung och frågar vilket vin som passar.

**Steg 1 · Analys.** Vad präglar smaken i en färsk getost?
1. Kraftig, lagrad smak av nötter (fel). *Det gäller lagrade ostar.*
2. Sötma, som i en färskost (fel). *Sötman på tallriken kommer från honungen.*
3. Frisk syra och krämighet (rätt). *Syran är det vinet måste möta, annars smakar vinet platt.*
4. Sälta från saltlake (fel). *Saltlake hör till ostar som fetaost.*

*Ledtråd:* Analys: Vinet måste klara ostens syra.

**Steg 2 · Upplevelse.**
- *A:* "Jag dricker bara rött. Vitt vin känns som en vardagslunch för mig."
- *B:* "Vitt är inte min grej. Har ni något rött som funkar?"

Vad söker gästen?
1. Ett rött vin, och att önskan tas på allvar (rätt). *Önskan är inte ett hinder. Den säger vad som ska väljas.*
2. Något festligt, färgen spelar mindre roll (ok). *Gästen sa rött och ska tas på orden.*
3. Att bli övertygad om att vitt passar bäst (fel). *Gästen bad inte om en lektion.*

*Ledtråd:* Upplevelse: Gästen vill ha rött.

**Steg 3 · Handling.** Vad föreslår du?
1. **[U]** Den fylliga, ekade Cabernet Sauvignon som gästen pekar på. *Gästen får sitt röda, men kraftiga tanniner mot syrlig ost ger en bitter, metallisk smak.*
2. **[A]** En torr Sancerre blanc, och en kort förklaring om osten. *En klassisk kombination, men gästen bad om rött och känner sig överkörd.*
3. **[F]** Säg att rött inte går till getost och servera husets vita. *Det stämmer inte, och gästen får varken önskan eller ett val som ser till osten.*
4. **[H]** En lätt Sancerre rouge eller gamay, med mjuka tanniner. *Kostnad: 0 kr.* *Lite tannin och frisk syra möter getosten bäst bland de röda. Sancerre rouge görs av pinot noir i samma trakt som Crottin de Chavignol.*

*Halvt grepp, mot analysen:* Vinet mötte ostens syra, men gästen bad om rött och fick vitt.
*I rummet:* Gästen smakar artigt och lämnar halva glaset.
*Halvt grepp, mot upplevelsen:* Gästen fick sitt röda, men tanninerna gör osten bitter.
*I rummet:* Osten står kvar på tallriken. Gästen dricker vinet för sig.
*Klarad:* Gästen smakar, nickar och beställer ett glas till.
*Personalen lyckas:* Per hittar en gamay och nämner att den passar osten.
*Personalen misslyckas:* Gästen får husets rödvin. Det passar inte osten.

---

### 6. Är det champagne? (vb11-cremant) · sommellerie · rush

*Situationen:* {gäst} vid bord {bord} pekar på det mousserande på glas och frågar om det är champagne. Det är en crémant de Loire.

**Steg 1 · Analys.** Vad skiljer en crémant från champagne?
1. Inget, det är i stort sett samma sak (fel). *Champagne är en skyddad ursprungsbeteckning. Att kalla crémant champagne är vilseledande.*
2. Bara priset (ok). *Crémant är ofta billigare, men det är metoden och ursprunget som skiljer.*
3. Crémant jäser i tank, inte på flaska (fel). *Crémant görs med den traditionella metoden, med andra jäsningen på flaska.*
4. Samma metod, men gjord utanför Champagne (rätt). *Andra jäsningen sker på flaska, som i champagne, men i andra franska regioner.*

*Ledtråd:* Analys: Det är inte champagne, men gjort på samma sätt.

**Steg 2 · Upplevelse.**
- *A:* "Crémant … låter som champagnens lillebror. Jag vill ju unna mig något i kväll."
- *B:* "Jag har fått nytt jobb i dag! Är crémant fint nog för det?"

Vad söker gästen?
1. Det billigaste mousserande som finns (fel). *Gästen vill unna sig. Det handlar om känslan av ett fint val.*
2. Champagne, för att vara säker (ok). *Det kan passa, men gästen frågade om ett glas.*
3. Att unna sig, och veta att valet är bra (rätt). *Gästen tvekar inför ordet, inte inför vinet.*

*Ledtråd:* Upplevelse: Gästen vill fira, men tvekar.

**Steg 3 · Handling.** Vad gör du?
1. **[H]** Säg kort att metoden är densamma, och bjud på en smakskvätt. *Kostnad: ett smakprov.* *Metoden säljer en crémant, och en smak visar mer än ord. Gästen väljer med vinet i munnen.*
2. **[F]** Säg att de flesta ändå inte känner skillnad. *Det låter som att gästen inte förstår. Det säljer varken vinet eller förtroendet.*
3. **[U]** Föreslå champagnen på flaska i stället, så att kvällen blir festlig. *Festligt, men gästen frågade om ett glas, och crémanten var redan ett bra val.*
4. **[A]** Förklara noga metoden, den andra jäsningen och vad ursprungsbeteckningen innebär. *Allt stämmer, men gästen ville fira, inte gå en kurs.*

*Halvt grepp, mot analysen:* Fakta var rätt, men gästen ville unna sig. En smak hade sagt mer.
*I rummet:* Gästen nickar artigt och tar ett glas vitt.
*Halvt grepp, mot upplevelsen:* Kvällen blev festlig, men crémanten var redan ett bra val, gjord på samma sätt.
*I rummet:* Gästen får en flaska champagne och ser lite på notan.
*Klarad:* Gästen smakar, ler och beställer ett glas.
*Personalen lyckas:* Sara låter gästen smaka och säger att det är samma metod.
*Personalen misslyckas:* Personalen svarar vagt. Gästen tar något annat.

---

### 7. För varmt (vb12-varmt-rott) · sommellerie · rush

*Situationen:* {gäst} vid bord {bord} skickar tillbaka ett glas {vin}: det är för varmt. Flaskan har stått på bardisken hela kvällen.

**Steg 1 · Analys.** Vid vilken temperatur smakar rött vin bäst?
1. Rumstemperatur, som i en varm bar (fel). *Regeln kommer från svala stenhus. En varm bar är för varm.*
2. Svalare än rummet: 14–16 för lätta, 16–18 för fylliga (rätt). *Då hålls alkoholen tillbaka och frukten blir frisk.*
3. Kylskåpskallt, som ett vitt (fel). *För kallt rött blir stramt och tanninerna känns hårda.*
4. Temperaturen påverkar inte smaken (fel). *För varmt rött smakar alkohol och sylt.*

*Ledtråd:* Analys: Vinet är varmare än det ska vara.

**Steg 2 · Upplevelse.**
- *A:* "Det smakar som varm saft. Jag trodde att rött skulle vara rumsvarmt, men det här är inte gott."
- *B:* "Förlåt att jag klagar, men är det här verkligen som det ska?"

Vad söker gästen?
1. En förklaring av regeln om rumstemperatur (fel). *Det är vinet som ska rättas, inte gästen.*
2. Ett annat vin (ok). *Kanske, men gästen valde det här vinet.*
3. Ett svalare glas, och höra att hen hade rätt (rätt). *Gästen tvivlar på sig själv men smakade rätt.*

*Ledtråd:* Upplevelse: Gästen är osäker på sitt eget omdöme.

**Steg 3 · Handling.** Vad gör du?
1. **[A]** Nytt glas ur en sval flaska, och förklara noga hur värme påverkar vinet. *Vinet blir rätt, men gästen fick en föreläsning och aldrig höra att hen hade rätt.*
2. **[U]** Ge gästen rätt, tacka för att hen sa till och lägg i en isbit. *Gästen känner sig hörd, men isen späder vinet.*
3. **[H]** Ge gästen rätt, häll ur en sval flaska och flytta de öppna till kylen. *Kostnad: ett glas.* *En sval vinkyl eller en stund i isvatten räddar det. Gästen hade rätt, och det ska märkas.*
4. **[F]** Förklara vänligt att rött vin ska serveras i rumstemperatur, så som här. *I en varm bar är vinet för varmt, och gästen har rätt.*

*Halvt grepp, mot analysen:* Vinet blev svalt, men gästen fick en föreläsning i stället för ett tack.
*I rummet:* Gästen dricker tyst och beställer inte mer.
*Halvt grepp, mot upplevelsen:* Gästen fick rätt, men isen späder vinet. Det är flaskan som ska kylas.
*I rummet:* Isbiten smälter. Vinet blir vattnigt.
*Klarad:* Nytt glas på bordet. Gästen smakar och nickar. De öppna flaskorna är borta från disken.
*Personalen lyckas:* Per byter glaset och ställer flaskorna i vinkylen.
*Personalen misslyckas:* Personalen svarar inte på klagomålet. Gästen låter glaset stå.

---

### 8. Vin på kavajen (vb18-kavajen) · sommellerie · crisis

*Situationen:* {personal} tappar en flaska {vin} vid bord {bord}. Den går sönder, och vin stänker på en gästs ljusa kavaj.

**Steg 1 · Analys.** Vad i rödvinet färgar tyget?
1. Färgämnen från druvskalen, antocyaner (rätt). *Rödvinets färg kommer från skalen, och det är de färgämnena som fastnar i tyget.*
2. Tanninerna från ekfatet (fel). *Tanniner ger strävhet, men färgen kommer från skalen.*
3. Alkoholen, som bränner in färgen (fel). *Alkoholen färgar inte.*

*Ledtråd:* Analys: Fläcken är färsk, och färgen fäster lätt.

**Steg 2 · Upplevelse.**
- *A:* Gästen ser ner på kavajen och säger tyst: "Den var min pappas. Jag har den bara när det är något särskilt."
- *B:* Gästen ser ner på kavajen: "Jag köpte den till min disputation. Det är första gången jag har den på mig sedan dess."

Vad söker gästen?
1. Att få ersättning för kavajen (ok). *Kemtvätt hör till, men gästen talade om vad kavajen betyder.*
2. Att kavajen tas på allvar, och att någon tar hand om hen (rätt). *Kavajen är inte vilket plagg som helst.*
3. Att det går fort och inte görs någon sak av (fel). *Den som sopar undan en olycka gör den till en förolämpning.*

*Ledtråd:* Upplevelse: Kavajen betyder mycket för gästen.

**Steg 3 · Handling.** Vad gör du? (Två hela grepp med olika kostnad.)
1. **[U]** Be om ursäkt och gnid bort fläcken med varmt vatten. *Omtanken är rätt, men gnidning och värme pressar in och fäster färgen.*
2. **[H]** Be om ursäkt, ge kallt vatten att badda med och betala kemtvätten. *Kostnad: 450 kr.* *Kallt vatten och baddning tar upp vinet utan att fästa färgen. Gästen bestämmer själv över sin kavaj.*
3. **[H]** Be om ursäkt, kallt vatten att badda med, kemtvätt och kvällens vin på huset. *Kostnad: 450 kr plus kvällens vin.* *Samma rätta hantering, och en gest som gör olyckan till en historia om hur krogen tog hand om sin gäst. Det kostar mer, men ryktet växer mer.*
4. **[A]** Ge kallt vatten att badda med, sopa upp och gå vidare. *Fläcken sköts rätt, men utan ursäkt blir olyckan en förolämpning.*

*Halvt grepp, mot analysen:* Fläcken sköttes rätt, men kavajen betydde något och ingen bad om ursäkt.
*I rummet:* Gästen baddar ensam med servetten och betalar tidigt.
*Halvt grepp, mot upplevelsen:* Omtanken var rätt, men varmt vatten och gnidning fäste färgen i tyget.
*I rummet:* Fläcken blir större och mörkare.
*Klarad (2):* Gästen baddar fläcken och tackar.
*Klarad (3):* Gästen skrattar lite och skålar med sällskapet. Grannbordet har sett allt.
*Personalen lyckas:* Mira hämtar kallt vatten och ber om ursäkt.
*Personalen misslyckas:* Glaset sopas upp, och någon ber kort om ursäkt.

---

### 9. Något sött (vb23-sott) · sommellerie · closing

*Situationen:* Bord {bord} vill avsluta med chokladtryffeln och frågar vad de ska dricka till.

**Steg 1 · Analys.** Vad händer med ett torrt vin till en söt dessert?
1. Det smakar sötare (fel). *Tvärtom. Sötman i maten får vinet att smaka mindre sött.*
2. Det smakar fylligare (fel). *Vinet tappar frukt och känns tunnare.*
3. Ingenting, sötman påverkar bara maten (fel). *Sötma i maten påverkar alltid hur vinet smakar.*
4. Det smakar surare och tunnare (rätt). *Därför ska vinet vara minst lika sött som desserten.*

*Ledtråd:* Analys: Desserten är söt, och det påverkar vinet.

**Steg 2 · Upplevelse.**
- *A:* Värden säger: "Vi vill avsluta med något som känns som en present." En i sällskapet lägger handen över sitt glas.
- *B:* Värden säger: "Något fint att skåla med till sist!" En i sällskapet säger tyst att hen inte dricker alkohol.

Vad söker bordet?
1. Något festligt till dem som dricker vin (ok). *Det är en del, men en vid bordet behöver också något.*
2. Att avrunda snabbt, med kaffe och nota (fel). *Värden bad om en avslutning att minnas.*
3. En avslutning för hela bordet, också den som inte dricker (rätt). *Alla ska få skåla.*

*Ledtråd:* Upplevelse: En vid bordet dricker inte.

**Steg 3 · Handling.** Vad serverar du till tryffeln?
1. **[F]** Ett glas torrt rött till alla, för rött går alltid till choklad. *Sötman gör vinet surt, och gästen som inte dricker får ett glas hen inte vill ha.*
2. **[H]** Lite ruby-portvin, och fråga den som inte dricker vad hen vill ha. *Kostnad: 0 kr.* *En ung, fruktig portvin klarar chokladens sötma och beska. Söta röda som Banyuls eller Maury fungerar också. Ett eget förslag till gästen som inte dricker visar att hens val räknas.*
3. **[U]** Torrt mousserande till alla, och alkoholfritt bubbel till den som inte dricker. *Alla skålar, men ett torrt vin blir surt mot chokladen.*
4. **[A]** Ruby-portvin till alla, och den som inte dricker kan låta bli. *Vinet är rätt, men ett glas gästen inte vill ha pekar ut hen.*

*Halvt grepp, mot analysen:* Portvinen bar chokladen, men gästen som inte dricker fick ett glas hen inte ville ha.
*I rummet:* Ett orört glas portvin står framför en gäst.
*Halvt grepp, mot upplevelsen:* Alla fick skåla, men ett torrt vin blir surt mot en söt dessert.
*I rummet:* Gästerna smakar och grimaserar lite mot chokladen.
*Klarad:* Hela bordet skålar till tryffeln.
*Personalen lyckas:* Sara häller portvin och frågar den som inte dricker vad hen vill ha.
*Personalen misslyckas:* Bordet får kvällens rödvin till chokladen.

---

### 10. Födelsedagen (vb32-fodelsedagen) · sommellerie · rush

*Situationen:* Värden i lounge A vinkar diskret till Per och viskar att det är Karins födelsedag i kväll. Hon vet ingenting.

**Steg 1 · Analys.** Per ska beställa en efterrätt med ljus. Vad behöver köket veta?
1. Att ljus och tändare ska ligga på brickan (fel). *Ljusen sköter salen. Köket behöver veta vad, hur många och när.*
2. Hur många som ska ha och när (ok). *Nästan, men allergier går före allt annat, också på en fest.*
3. Antal, allergier och när den ska ut (rätt). *Köket planerar i antal och tid, och allergier går före allt annat.*
4. Vilken efterrätt värden helst vill ha (fel). *Önskan är viktig, men först behöver köket veta vad som är säkert.*

*Ledtråd:* Analys: Köket behöver mer än en beställning.

**Steg 2 · Upplevelse.**
- *A:* Värden viskar: "Hon vet ingenting, och hon älskar att sjunga." I lounge B sitter två gäster i ett affärssamtal.
- *B:* Värden viskar: "Vi vill sjunga för henne!" I lounge B sitter ett par som just har fått sin varmrätt och pratar lågt.

Vad behöver kvällen vid de två borden?
1. En kort fest för Karin, och lugn för grannarna (rätt). *Kvällen tillhör alla bord, och båda går att ge.*
2. Så mycket ljud som möjligt, så att festen märks (fel). *Då hör grannarna inte sitt eget samtal.*
3. Att Karin firas, och grannarna får stå ut (ok). *Grannarna är också kvällens gäster.*

*Ledtråd:* Upplevelse: Två bord vill ha olika saker av kvällen.

**Steg 3 · Handling.** Vad gör du? (Två hela grepp med olika kostnad.)
1. **[A]** Ge köket allt det behöver, och be sällskapet vänta med sången. *Köket får rätt besked, men grannarna kan sitta länge, och då blir det ingen sång för Karin.*
2. **[H]** Ge köket allt, en vers för Karin, och bjud grannarna på ett glas. *Kostnad: två glas vin.* *En kort fest och en gest till grannarna. Det kostar, men båda borden minns kvällen.*
3. **[H]** Ge köket allt, en vers för Karin, och förvarna grannarna med en ursäkt. *Kostnad: 0 kr.* *Grannarna vet vad som kommer och känner sig sedda. Det är billigare, men gesten är mindre.*
4. **[U]** En vers, något till grannarna, och tårtan ut utan att fråga om allergier. *Båda borden får sitt, men ingen frågade om allergier.*

*Halvt grepp, mot analysen:* Köket fick allt det behövde, men Karin fick ingen sång.
*I rummet:* Tårtan kommer fram i tystnad. Värden ser besviken ut.
*Halvt grepp, mot upplevelsen:* Båda borden fick sitt, men ingen frågade om allergier innan tårtan gick ut.
*I rummet:* En gäst i sällskapet låter bli att äta av tårtan.
*Klarad (2):* En vers för Karin. I lounge B höjer grannarna sina glas mot henne.
*Klarad (3):* En vers för Karin. Grannarna ler och fortsätter sitt samtal.
*Personalen lyckas:* Per frågar om allergier och ber sällskapet ta en vers.
*Personalen misslyckas:* Per tar över. Tårtan går ut, men ingen har frågat om allergier.

*Utförandet:* tårtan bärs lågt med ljusen tända, i fri gång genom rummet, och efter en vers dämpas sången.

---

### 11. Karaffen (vb40-karaffen) · sommellerie · rush · ny

*Situationen:* {gäst} vid bord {bord} beställer en äldre Barolo, årgång 2008. När {personal} lutar flaskan mot ljuset syns bottensats.

**Steg 1 · Analys.** Varför karafferar man ett äldre vin?
1. För att lufta det, som ett ungt vin (fel). *Ett äldre vin är skört och kan tappa doft av för mycket luft.*
2. För att skilja vinet från bottensatsen (rätt). *Satsen är gamla färgämnen och tanniner som fallit ut. Den smakar bittert och grumlar glaset.*
3. För att värma vinet till rätt temperatur (fel). *Karaffen ändrar inte temperaturen nämnvärt.*
4. För att det ser fint ut vid bordet (ok). *Det gör det, men karafferingen har ett syfte.*

*Ledtråd:* Analys: Flaskan har sats, och vinet är skört.

**Steg 2 · Upplevelse.**
- *A:* "Den här köpte vi när vår dotter föddes. Vi har sparat den i femton år."
- *B:* "Det här är vår bröllopsårgång. I dag är det femton år sedan."

Vad söker gästerna?
1. Att vinet serveras snabbt (fel). *De har väntat i femton år. Det är inte tempot som räknas i kväll.*
2. Att flaskan behandlas som det minne den är (rätt). *Hur flaskan öppnas är en del av kvällen.*
3. En förklaring av hur Barolo åldras (ok). *Det kan vara roligt, men gästerna talade om sitt minne, inte om druvan.*

*Ledtråd:* Upplevelse: Flaskan är ett minne.

**Steg 3 · Handling (ordning, pilot).** Lägg korten i den ordning du gör det. Du behöver inte använda alla.

Kort:
- **a.** Visa flaskan vid bordet.
- **b.** Tänd ett ljus under flaskhalsen.
- **c.** Häll försiktigt, och stanna när satsen når halsen.
- **d.** Servera direkt, och ställ den tomma flaskan på bordet.
- **e.** Låt karaffen stå en timme innan servering. *(fälla)*
- **f.** Gör det vid baren, så går det snabbt. *(fälla)*

Bedömning:
- **[H]** a → b → c → d, utan e och f.
- **[A]** b → c → d med f, eller utan a. Tekniken är rätt, men gästerna var inte med.
- **[U]** a och e med, eller c saknas eller hamnar före b. Omtanken är rätt, men vinet får för mycket luft eller satsen följer med.
- **[F]** varken b eller c, eller d först.

*Förklaring:* Ljuset visar när satsen kommer, och försiktig hällning skyddar ett skört vin. Att göra det vid bordet gör öppnandet till en del av minnet.

*Halvt grepp, mot analysen:* Tekniken var rätt, men gästerna var inte med när deras flaska öppnades.
*I rummet:* Karaffen kommer från baren. Gästerna ser på den tomma flaskan.
*Halvt grepp, mot upplevelsen:* Omtanken var rätt, men för mycket luft och väntan tar doften från ett äldre vin.
*I rummet:* Gästerna väntar. Vinet doftar mindre än de mindes.
*Klarad:* Karaffen står på bordet med den tomma flaskan bredvid. Gästerna skålar.
*Personalen lyckas:* Sara karafferar över ett ljus vid bordet.
*Personalen misslyckas:* Vinet hälls direkt ur flaskan. Det blir grumligt i botten av glasen.

---

## Del C. Till Design: D8 (litet)

1. **Korten för ordningen i steg 3**, pilot i vb40: sex handlingskort som dras till en rad med fyra platser, med en ikon för varje handling.
2. **Etiketten för halvt grepp:** "Halvt grepp: analysen höll" och "Halvt grepp: upplevelsen höll", i papper och mässing, aldrig i rött.
3. **Kostnaden** på ett alternativ i steg 3: liten text i kr, eller ett mynt.

Leverera i det vanliga formatet, med kontrollbilder i 1440 × 900 och 1280 × 720.
