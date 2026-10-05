# ORDER 306 — Utkast: tio raketer i formen analys → upplevelse → handling (för granskning)

**Underlag:** Anders beslut 2026-10-05 om förslaget i `documentation/architecture/ORDER_301_RAPPORT.md` §5 (alla fem förslagen godkända) och `documentation/foundation/KUNSKAPSGRUND_TRIAD.md` §3.2. Formatet för spelet står i `raketer.meta.json`, `raketer.text.sv.draft.json` och `raketer.text.en.json` i samma katalog. Inget är inbyggt i spelet.

## Formen

Raketen följer det dubbla greppet, enligt TRIAD-modellen (Anders Crichton-Fock, tidigare Herdenstam):

1. **Analys (episteme), 20 s.** En analytisk ledtråd: vad säger glaset, flaskan eller tallriken? Steget är en fråga med svar som är rätt, ok eller fel, som i dag.
2. **Upplevelse (phronesis), 30 s.** En analogisk ledtråd ur situationen, oftast gästens egna ord: vad söker gästen? Också en fråga med rätt, ok och fel.
3. **Handling (techne), 20 s.** Vad gör du? Svaren är märkta med vilket register de håller för:
   - **helt grepp**: handlingen håller för båda ledtrådarna;
   - **halvt, mot analysen**: handlingen håller för analysen men inte för upplevelsen;
   - **halvt, mot upplevelsen**: handlingen håller för upplevelsen men inte för analysen;
   - **fel**: handlingen håller för ingen av dem.

När steg 1 och 2 är besvarade står ledtrådarna kvar på kortet ("Analys: …", "Upplevelse: …"), så att spelaren har båda framför sig när handlingen väljs. Fel på steg 1 eller 2 avslutar raketen som i dag. Halvt grepp räknas som klarad raket med effekten gånger `CONSEQUENCES.halfGrip` (föreslaget 0,5), och återkopplingen säger vad som saknades. Varje raket har därför två texter för halvt grepp.

I varje raket har steg 3 fyra svar, ett av varje sort, så att spelaren alltid kan välja fel på båda hållen. Ordningen är blandad.

## Urvalet

Tio av vinbarens 39 raketer, valda så att de täcker olika situationer: vin (korken, crémant), temperatur (rosé, rött), vin och mat (getost, dessert), allergi (nötter), service (provningen), en olycka i rummet (kavajen), en missnöjd gäst (det varma röda) och ett firande bord (födelsedagen). Varje raket har kvar sitt id, eftersom den är en omskrivning av originalet och är tänkt att ersätta det.

**Vad som är taget ur originalet:** berättelsen, steg 1 med alla svar och förklaringar (frågan är på några ställen omformulerad till en ledtråd: "Vad säger …?"), spår, fas, effekterna, `success` (utom i vb32) och `staff`. Steg 2:s följd vid fel har originalets phronesis-effekt, steg 3:s har originalets techne-effekt. Kedjan från vb01 till vb30 (korkgästen) ligger kvar på felsvaret i steg 3.

**Vad som är nytt:** steg 2 (gästens ord och frågan "Vad söker gästen?") och steg 3:s svar, som oftast slår ihop originalets techne- och phronesis-svar till en handling. Fakta i handlingarna är originalets. Gästernas repliker är nya och påstår inga fakta.

## Nya fält i datan

| Fil | Fält | Betydelse |
|---|---|---|
| `raketer.meta.json` | `schemaVersion: 3` | Formen med grepp (vinbar har 2). |
| `raketer.meta.json` | `steps[]` i ordningen `episteme`, `phronesis`, `techne` | Var `episteme`, `techne`, `phronesis` (`INCIDENTS.stepAxes`). |
| `raketer.meta.json` | `steps[2].options[].grip` | `'full' \| 'analysis' \| 'experience' \| 'none'`, i stället för `quality`. Steg 1 och 2 har `quality` som förut. |
| `raketer.text.*.json` | `steps[0].clue`, `steps[1].clue` | Ledtråden som står kvar på kortet när steget är besvarat. |
| `raketer.text.*.json` | `halfGrip.analysis` | Återkopplingen när valet har `grip: 'analysis'` (höll för analysen, upplevelsen saknades). |
| `raketer.text.*.json` | `halfGrip.experience` | Återkopplingen när valet har `grip: 'experience'` (höll för upplevelsen, analysen saknades). |

`validateIncidentBank` i `incidentBank.ts` godtar inte filerna som de är (stegens ordning och `quality` i steg 3). Det ändras när formen byggs in.

## Raketerna

Svaren står i den ordning de har i spelet. Förklaringen under varje svar är lärdomen spelaren får se.

## 1. Första flaskan

**vb01-korken** · omskriven från `vb01-korken` (Första flaskan) · vin, ett fel i flaskan · spår sommellerie · fas opening

*Situationen:* Kvällens första flaska: {gäst} vid bord {bord} har beställt en {vin}. När {personal} drar korken luktar det fuktig källare och våt kartong.

### Steg 1 · Analys (episteme)

Korken är dragen. Vad säger doften av fuktig källare och våt kartong?

1. Reduktion, alltså svavelföreningar **(fel)**  
   *Reduktion luktar tändsticka, svavel eller ruttet ägg. Den kan ofta luftas bort. Fuktig källare är något annat.*
2. Oxidation, vinet har fått för mycket syre **(fel)**  
   *Ett oxiderat vin luktar trött äpple, nötter eller sherry och kan ha brunaktig färg. Källare och våt kartong pekar på korken.*
3. Korkdefekt, ämnet TCA **(rätt)**  
   *Doften av fuktig källare och våt kartong är korkdefekt, orsakad av ämnet TCA. Det är ett fel i just den flaskan, inte i vinet som sådant.*
4. Ett ungt vin som behöver luftas **(fel)**  
   *Ett ungt vin kan vara stängt och säga lite, men det luktar inte källare. Den doften är ett fel, inte en ålder.*

*Ledtråden på kortet:* Analys: Korkdefekt (TCA). Felet sitter i just den här flaskan.

*Vid fel:* {personal} ställer flaskan på bordet utan att veta vad som är fel. Gästen väntar.

### Steg 2 · Upplevelse (phronesis)

{gäst} har sett dig lukta på korken och säger lite oroligt: "Det är väl inget fel? Vi har sett fram emot just det här vinet hela veckan." Vad söker gästen?

1. Att slippa höra om problem, kvällen ska kännas lätt **(fel)**  
   *Gästen frågade rakt ut om något var fel. Den som frågar vill ha ett svar, inte en tystnad.*
2. Just det vinet hen har valt, och ett ärligt besked om flaskan **(rätt)**  
   *Två saker i samma mening: vinet de längtat efter och frågan om något är fel. Båda behöver ett svar.*
3. Ett gott vin att komma igång med, vilket som helst **(ok)**  
   *Gästen vill komma igång, men sa också "just det här vinet". Ett annat vin missar halva meningen.*

*Ledtråden på kortet:* Upplevelse: Gästen vill ha just det här vinet, och ett ärligt besked.

*Vid fel:* {personal} hör bara att gästen vill komma igång. Frågan om flaskan blir hängande.

### Steg 3 · Handling (techne)

Du har analysen och gästens ord framför dig. Vad gör du?

1. Säg ärligt att något är fel med vinet, och dekantera det så att doften luftas bort **(halvt, mot upplevelsen)**  
   *Ärligheten är rätt, men luftning hjälper mot reduktion, inte mot korkdefekt. TCA försvinner inte med syre.*
2. Servera ändå, det är nog vinets karaktär **(fel)** (leder till `vb30-korkgasten`)  
   *Korkdefekt är ett fel i flaskan, inte vinets karaktär. Gästen märker det, och förtroendet för hela vinlistan sjunker.*
3. Öppna en ny flaska av samma vin och byt glas, men säg inget om felet **(halvt, mot analysen)**  
   *Flaskan och glasen byts rätt. Men gästen såg dig lukta på korken och frågade. Tystnad ser ut som att krogen döljer något.*
4. Säg rakt ut att flaskan är korkad, öppna en ny av samma vin, byt glas och låt gästen smaka. Bara den nya hamnar på notan **(helt grepp)**  
   *En korkad flaska byts alltid, och nya glas behövs eftersom doften sitter kvar i de gamla. Korkdefekt är ingen skam, den drabbar en del flaskor med naturkork. Att säga det öppet och inte ta betalt för felet bygger förtroende.*

*Vid fel:* Flaskan står öppen på bordet. Ingen säger något om doften. Pågår: Flaskan står öppen på bordet. Doften av källare sitter kvar.

**Halvt grepp, mot analysen** (valet höll för analysen, upplevelsen saknades): Halvt grepp: valet höll för analysen, men inte för gästens upplevelse. Flaskan och glasen byttes rätt, men gästen fick inget svar på sin fråga och undrar fortfarande vad som hände.

**Halvt grepp, mot upplevelsen** (valet höll för upplevelsen, analysen saknades): Halvt grepp: valet höll för gästens upplevelse, men inte för analysen. Gästen fick ett ärligt besked, men korkdefekt går inte att lufta bort. Bara en ny flaska hjälper.

*Klarad:* Ny flaska och nya glas på bordet. Gästen nickar efter första smaken.  
*Personalen tar över:* Personalen tar över: flaskan serverades som den var, och gästen skickade tillbaka den efter första glaset.

*Referens:* (tom, Anders väljer)

## 2. Roséns temperatur

**vb02-rosen** · omskriven från `vb02-rosen` (Roséns temperatur) · vin, temperatur · spår sommellerie · fas opening

*Situationen:* Kvällen är varm. {personal} säger att vitvinerna håller 10 grader i kylen, men roséerna som just kom står i 24 grader. De första gästerna vill ha rosé.

### Steg 1 · Analys (episteme)

Termometern i lådan visar 24 grader. Vid vilken temperatur ska en rosé serveras?

1. Rumstemperatur, runt 22 grader **(fel)**  
   *Så varmt smakar roséen tung och söt, och alkoholen sticker fram. Rumstemperatur är inte ens rätt för rött.*
2. 16–18 grader, som ett rött **(fel)**  
   *Det passar många röda viner. En rosé behöver vara kallare för att friskheten och syran ska komma fram.*
3. Iskall, 2–4 grader **(fel)**  
   *För kallt stänger doften, och vinet smakar nästan ingenting. Kallt är bra, men inte kallare än kylen.*
4. 8–10 grader **(rätt)**  
   *En rosé serveras vid 8–10 grader. Då är den frisk utan att doften försvinner.*

*Ledtråden på kortet:* Analys: Rosé ska vara 8–10 grader. Flaskorna står i 24.

*Vid fel:* {personal} häller upp ett glas rosé från hyllan. Det smakar ljummet.

### Steg 2 · Upplevelse (phronesis)

De första gästerna lutar sig mot bardisken: "Något kallt och friskt, gärna rosé. Vi har gått i solen hela dagen." Vad söker gästerna?

1. Rosé, och temperaturen spelar mindre roll **(fel)**  
   *De sa "kallt och friskt" först. En ljummen rosé en varm kväll är det de minns.*
2. Något att dricka snabbt, vad som helst **(ok)**  
   *Det brådskar, det stämmer. Men de bad om rosé, och de bad om något friskt.*
3. Något kallt i handen direkt, och en rosé som är frisk när den kommer **(rätt)**  
   *Två önskningar: svalka nu, och roséen de bad om. Dagen i solen säger att väntan utan något i handen känns lång.*

*Ledtråden på kortet:* Upplevelse: Gästerna vill ha något kallt i handen nu, och en frisk rosé.

*Vid fel:* Gästerna i baren byter blickar. Några beställer öl i stället.

### Steg 3 · Handling (techne)

Flaskorna behöver kylas och gästerna står vid baren. Vad gör du?

1. Lägg roséflaskorna i en hink med is och vatten, säg att de är kalla om tio minuter och erbjud ett kallt glas vitt eller vatten så länge **(helt grepp)**  
   *Is och vatten kyler en flaska på omkring tio minuter, mycket fortare än kylen. Gästerna vet varför det dröjer och får något kallt direkt.*
2. Servera roséen direkt, med isbitar i glaset **(halvt, mot upplevelsen)**  
   *Gästerna får något kallt på en gång. Men isen späder vinet och tar bort både doft och syra. Det är flaskan som ska kylas.*
3. Servera den varma roséen och hoppas att ingen märker **(fel)**  
   *Gästerna märker det på första klunken. Rumstemperatur gör roséen tung och söt, och alkoholen sticker fram.*
4. Lägg flaskorna i is och vatten och ta upp beställningen, utan att säga något om väntan **(halvt, mot analysen)**  
   *Kylningen är rätt. Men gästerna står med tomma händer och vet inte varför det dröjer. Tio minuter utan besked känns längre.*

*Vid fel:* Isbitarna klirrar. Efter en stund smakar vinet vatten. Pågår: Roséglasen står halvfulla på borden. Gästerna beställer inget mer.

**Halvt grepp, mot analysen** (valet höll för analysen, upplevelsen saknades): Halvt grepp: valet höll för analysen, men inte för gästernas upplevelse. Roséen blev kall, men gästerna stod utan något i handen och utan besked.

**Halvt grepp, mot upplevelsen** (valet höll för upplevelsen, analysen saknades): Halvt grepp: valet höll för gästernas upplevelse, men inte för analysen. De fick något kallt direkt, men isen späder roséen. Flaskan ska ner till 8–10 grader i is och vatten.

*Klarad:* Hinkarna står på bardisken. Första roséglasen är kalla och immiga.  
*Personalen tar över:* Personalen tar över: roséen serverades som den var. Den smakade varmt och sött.

*Referens:* (tom, Anders väljer)

## 3. Nötallergi

**vb03-notallergi** · omskriven från `vb03-notallergi` (Nötallergi) · mat, allergi · spår kok · fas opening

*Situationen:* {gäst} vid bord {bord} har nötallergi och frågar om bruschettan med basilikapesto går bra. {personal} är osäker på vad som finns i peston.

### Steg 1 · Analys (episteme)

Vad säger receptet på en klassisk basilikapesto? Vilka nötter brukar finnas i den?

1. Pinjenötter **(rätt)**  
   *Klassisk pesto görs på basilika, pinjenötter, vitlök, hårdost och olivolja. Andra varianter kan ha andra nötter, så receptet måste ändå kollas.*
2. Jordnötter **(fel)**  
   *Jordnötter hör inte till klassisk pesto. Men att peston saknar just jordnötter betyder inte att den saknar nötter.*
3. Hasselnötter **(fel)**  
   *Hasselnötter finns inte i den klassiska peston. Nöten i originalet är pinjenöten.*
4. Inga, bara basilika, ost och olja **(fel)**  
   *Det är en vanlig miss. Klassisk pesto innehåller pinjenötter, och det är just därför frågan ska tas på allvar.*

*Ledtråden på kortet:* Analys: Klassisk pesto har pinjenötter. Kvällens recept måste ändå kollas.

*Vid fel:* {personal} står kvar vid bordet utan svar. Gästen väntar på besked.

### Steg 2 · Upplevelse (phronesis)

{gäst} säger lågt: "Jag brukar inte våga beställa något med sås när jag äter ute. I kväll vill jag bara kunna äta utan att oroa mig." Vad söker gästen?

1. Att slippa peston **(ok)**  
   *Det är en del av svaret. Men gästen vill äta utan oro hela kvällen, inte bara undvika en sås.*
2. Att bli lugnad med att det nog går bra **(fel)**  
   *"Nog" är just det som gör gästen orolig. En gissning om allergener är aldrig ett lugnande svar.*
3. Ett säkert besked, och en rätt hen kan äta utan att oroa sig **(rätt)**  
   *Gästen ber om två saker: fakta om peston och en kväll utan oro. Båda kräver att köket vet om allergin.*

*Ledtråden på kortet:* Upplevelse: Gästen vill ha ett säkert besked och en rätt hen kan äta utan oro.

*Vid fel:* Gästen får ett vagt svar och sitter tyst med menyn.

### Steg 3 · Handling (techne)

Vad gör du nu?

1. Kolla receptet med köket, säg att peston har pinjenötter och låt gästen välja själv ur menyn **(halvt, mot analysen)**  
   *Beskedet är rätt och bygger på receptet. Men gästen står nu ensam med samma oro inför nästa rätt. Hjälp hellre till att hitta en rätt som köket vet är säker.*
2. Kolla receptet med köket, säg rakt ut att peston har pinjenötter, föreslå en rätt köket bekräftat och märk ordern som allergi **(helt grepp)**  
   *En allergifråga besvaras med fakta ur receptet och från köket. När ordern är märkt vet köket att den ska hållas fri från nötter hela vägen till bordet, och gästen kan äta utan oro.*
3. Avråd från bruschettan direkt och föreslå en rätt utan pesto, utan att fråga köket **(halvt, mot upplevelsen)**  
   *Gästen känner sig omhändertagen, och det är bra. Men ingen vet vad som finns i den nya rätten, och köket vet inget om allergin. Samma bräda eller kniv kan användas.*
4. Svara att det nog inte finns nötter i den **(fel)**  
   *Klassisk pesto görs med pinjenötter. Att gissa om allergener är det farligaste misstaget i en servering, och enligt livsmedelslagstiftningen ska gästen få korrekt allergeninformation.*

*Vid fel:* Bruschettan går ut till bordet. Pågår: Bruschettan står på bordet. Ingen vet vad som finns i peston.

**Halvt grepp, mot analysen** (valet höll för analysen, upplevelsen saknades): Halvt grepp: valet höll för analysen, men inte för gästens upplevelse. Beskedet om pinjenötterna var rätt, men gästen fick leta själv och sitter kvar med oron.

**Halvt grepp, mot upplevelsen** (valet höll för upplevelsen, analysen saknades): Halvt grepp: valet höll för gästens upplevelse, men inte för analysen. Gästen kände sig omhändertagen, men ingen kollade receptet och köket vet inget om allergin.

*Klarad:* Gästen får en rätt som köket bekräftat. Hen nickar och tackar för att frågan togs på allvar.  
*Personalen tar över:* Personalen tar över: de svarade på måfå och serverade bruschettan.

*Referens:* (tom, Anders väljer)

## 4. Provning för fyra

**vb07-provningen** · omskriven från `vb07-provningen` (Provning för fyra) · vin och service, en provning · spår sommellerie · fas rush

*Situationen:* Ett sällskap på fyra vid bord {bord} vill ha en provning med tre viner. {personal} undrar vilka glas som ska fram.

### Steg 1 · Analys (episteme)

Tre viner ska provas. Vad säger provningens ordning?

1. Dyrast först, medan gommen är pigg **(fel)**  
   *Priset säger inget om ordningen. Ett kraftigt dyrt vin först gör att de lättare vinerna efteråt smakar tunt.*
2. Fylligast först, för att värma upp gommen **(fel)**  
   *Ett fylligt vin tar över smaken, och de lätta vinerna efteråt försvinner. Man bygger upp, inte ner.*
3. Sött först, för att väcka aptiten **(fel)**  
   *Sötma sitter kvar i munnen och gör att torra viner efteråt smakar surt och magert.*
4. Lätt före fylligt, torrt före sött **(rätt)**  
   *Varje vin får då visa sig utan att det förra tar över. Så byggs en provning upp.*

*Ledtråden på kortet:* Analys: Lätt före fylligt, torrt före sött.

*Vid fel:* Det kraftigaste vinet går först. Gästerna tycker att resten smakar tunt.

### Steg 2 · Upplevelse (phronesis)

En i sällskapet säger: "Jag kör hem i kväll, men jag vill inte sitta bredvid och titta." Vad söker gästen?

1. Att få lika mycket som de andra, det är ju små glas **(fel)**  
   *Tre små glas blir tillsammans ett par glas vin. Gästen sa själv att hen kör.*
2. Att få vara med i provningen fullt ut, utan att dricka **(rätt)**  
   *Gästen vill smaka, jämföra och prata med de andra. Att smaka utan att dricka går, och det är det som behövs.*
3. Något eget att dricka medan de andra provar **(ok)**  
   *Omtänksamt, men gästen sa att hen inte vill sitta bredvid. Ett eget glas är fortfarande att sitta bredvid.*
4. Att slippa vara med **(fel)**  
   *Gästen sa tvärtom. Att utesluta hen förstör kvällen för hela sällskapet.*

*Ledtråden på kortet:* Upplevelse: Gästen som kör vill vara med fullt ut, utan att dricka.

*Vid fel:* Gästen som kör sitter med fulla glas och ser obekväm ut.

### Steg 3 · Handling (techne)

Hur dukar och häller du provningen?

1. Samma tulpanformade provglas, ett nytt glas per vin och person, vinerna från lätt till fylligt och lika påfyllning till alla **(halvt, mot analysen)**  
   *Glasen och ordningen är rätt. Men gästen som kör får samma påfyllning som de andra och har inget sätt att smaka utan att dricka.*
2. De glas som finns närmast, det fylligaste vinet först och lika till alla **(fel)**  
   *Ett fylligt vin först gör att de lättare vinerna efteråt smakar tunt, och gästen som kör blir lämnad med fulla glas.*
3. Samma tulpanformade provglas, nytt glas per vin och person, lätt före fylligt, och spottkopp och vatten på bordet med mindre påfyllning till den som kör **(helt grepp)**  
   *Ett neutralt provglas gör vinerna jämförbara, och nya glas gör att dofterna inte blandas. Att spotta är helt normalt på en provning. Gästen är med fullt ut, och krogen tar sitt ansvar för alkoholserveringen.*
4. Spottkopp och vatten på bordet, och ett glas per person som sköljs med vatten mellan vinerna **(halvt, mot upplevelsen)**  
   *Gästen som kör får vara med, och det är rätt. Men vattnet späder nästa vin och tar med sig doft. Sköljer man, gör man det med en skvätt av nästa vin.*

*Vid fel:* Glasen sköljs vid bordet. Nästa vin smakar tunt. Pågår: Bordet jämför viner som smakar vatten. Provningen blir tyst.

**Halvt grepp, mot analysen** (valet höll för analysen, upplevelsen saknades): Halvt grepp: valet höll för analysen, men inte för gästernas upplevelse. Provningen var rätt byggd, men gästen som kör fick inget sätt att vara med utan att dricka.

**Halvt grepp, mot upplevelsen** (valet höll för upplevelsen, analysen saknades): Halvt grepp: valet höll för gästernas upplevelse, men inte för analysen. Alla fick vara med, men vatten i glaset späder nästa vin. Ett nytt glas per vin håller dofterna isär.

*Klarad:* Tolv glas i rader på bordet. Gästerna jämför och diskuterar.  
*Personalen tar över:* Personalen tar över: de tog de glas som fanns närmast.

*Referens:* (tom, Anders väljer)

## 5. Vin till getosten

**vb09-getosten** · omskriven från `vb09-getosten` (Vin till getosten) · vin och mat · spår sommellerie · fas rush

*Situationen:* {gäst} vid bord {bord} beställer den färska getosten med honung och frågar vilket vin som passar.

### Steg 1 · Analys (episteme)

Vad säger tallriken? Vad är det som präglar smaken i en färsk getost?

1. Kraftig, lagrad smak av nötter **(fel)**  
   *Det gäller lagrade ostar. En färsk getost har inte hunnit utveckla lagringssmaker.*
2. Sötma, som i en färskost **(fel)**  
   *Färsk getost är mild men inte söt. Sötman på tallriken kommer från honungen.*
3. Frisk syra och krämighet **(rätt)**  
   *Färsk getost är syrlig och krämig. Syran är det vinet måste möta, annars smakar vinet platt.*
4. Sälta från saltlake **(fel)**  
   *Saltlake hör till ostar som fetaost. Den färska getosten här är syrlig snarare än salt.*

*Ledtråden på kortet:* Analys: Frisk syra och krämighet. Vinet måste möta syran.

*Vid fel:* Du tvekar om osten, och vinförslaget blir en gissning.

### Steg 2 · Upplevelse (phronesis)

{gäst} säger: "Jag dricker bara rött. Vitt vin känns som en vardagslunch för mig." Vad söker gästen?

1. Ett rött vin, och en kväll som känns som hens egen **(rätt)**  
   *Gästen sa det rakt ut. Önskan är inte ett hinder, den är en ledtråd till vad som ska väljas.*
2. Något som känns mer festligt, färgen spelar mindre roll **(ok)**  
   *Det ligger något i det, kvällen ska kännas speciell. Men gästen sa "bara rött", och det ska tas på orden.*
3. Att bli övertygad om att vitt passar osten bäst **(fel)**  
   *Gästen bad inte om en lektion. Den som får sin önskan överkörd minns det, inte vinet.*

*Ledtråden på kortet:* Upplevelse: Gästen vill ha rött, och en kväll som känns som hens egen.

*Vid fel:* Gästen får ett vin hen inte ville ha, eller ett som inte passar osten.

### Steg 3 · Handling (techne)

Vilket vin föreslår du till getosten med honung?

1. Den fylliga, ekade Cabernet Sauvignon som gästen pekar på **(halvt, mot upplevelsen)**  
   *Gästen får sitt röda. Men kraftiga tanniner mot en färsk, syrlig ost ger en metallisk, bitter smak.*
2. En torr Sauvignon Blanc från Loire, med en förklaring till varför vitt passar osten **(halvt, mot analysen)**  
   *Färsk getost och Sauvignon Blanc från Sancerre är en klassisk kombination. Men gästen sa att hen bara dricker rött och känner sig överkörd.*
3. Säg att rött inte går till getost och servera husets vita **(fel)**  
   *Det stämmer inte, ett lätt rött kan fungera fint. Och inget vin passar all ost. Gästen får varken sin önskan eller en kombination som ser till osten.*
4. Ett lätt, fruktigt rött med mjuka tanniner och frisk syra **(helt grepp)**  
   *Du tar gästens önskan på allvar och väljer ändå med osten i tanke. Lite tannin och frisk syra möter getosten bäst bland de röda.*

*Vid fel:* Gästen smakar. Osten och vinet drar åt var sitt håll. Pågår: Osten står kvar på tallriken. Gästen dricker vinet för sig.

**Halvt grepp, mot analysen** (valet höll för analysen, upplevelsen saknades): Halvt grepp: valet höll för analysen, men inte för gästens upplevelse. Vinet mötte ostens syra, men gästen bad om rött och fick vitt.

**Halvt grepp, mot upplevelsen** (valet höll för upplevelsen, analysen saknades): Halvt grepp: valet höll för gästens upplevelse, men inte för analysen. Gästen fick sitt röda, men kraftiga tanniner gör den färska osten bitter. Ett lätt rött hade burit båda.

*Klarad:* Gästen smakar, nickar och beställer ett glas till.  
*Personalen tar över:* Personalen tar över: gästen får husets rödvin. Det passar inte osten.

*Referens:* (tom, Anders väljer)

## 6. Är det champagne?

**vb11-cremant** · omskriven från `vb11-cremant` (Är det champagne?) · vin, en tveksam gäst · spår sommellerie · fas rush

*Situationen:* {gäst} vid bord {bord} pekar på det mousserande på glas och frågar om det är champagne. Det är en crémant de Loire.

### Steg 1 · Analys (episteme)

Vad säger etiketten? Vad skiljer en crémant från champagne?

1. Inget, det är i stort sett samma sak **(fel)**  
   *Att kalla en crémant för champagne är fel och vilseledande. Champagne är en skyddad ursprungsbeteckning.*
2. Bara priset, crémant är billigare **(ok)**  
   *Den är ofta billigare, men det säger inget om hur den görs. Metoden och ursprunget är det som skiljer.*
3. Crémant jäser i tank, inte på flaska **(fel)**  
   *Det stämmer inte. Crémant görs med den traditionella metoden, med andra jäsningen på flaska, precis som champagne.*
4. Samma metod, men gjord utanför Champagne **(rätt)**  
   *Champagne är en skyddad ursprungsbeteckning. Crémant görs med samma traditionella metod, med andra jäsningen på flaska, men i andra franska regioner.*

*Ledtråden på kortet:* Analys: Samma traditionella metod, med andra jäsningen på flaska, men gjord utanför Champagne.

*Vid fel:* Du svarar att det i stort sett är champagne. Senare läser gästen etiketten på flaskan. Pågår: Gästen läser etiketten igen och ser tveksam ut.

### Steg 2 · Upplevelse (phronesis)

Gästen tvekar: "Crémant … låter som champagnens lillebror. Jag vill ju unna mig något i kväll." Vad söker gästen?

1. Det billigaste mousserande som finns **(fel)**  
   *Gästen sa "unna mig". Det handlar inte om priset utan om känslan av att ha valt något fint.*
2. Champagne, för att vara säker **(ok)**  
   *Champagne kan passa den som vill fira. Men gästen frågade om ett glas, och tvekan gäller vad crémant är.*
3. Något som känns som att unna sig, och att få veta att valet är bra **(rätt)**  
   *Gästen tvekar inför ordet, inte inför vinet. Den som får veta vad hen dricker kan njuta av det.*

*Ledtråden på kortet:* Upplevelse: Gästen vill unna sig, och känna att valet är bra.

*Vid fel:* Gästen tar ett glas rött i stället.

### Steg 3 · Handling (techne)

Vad gör du?

1. Berätta kort att crémant görs med samma metod som champagne, utanför Champagne, och erbjud en liten smakskvätt **(helt grepp)**  
   *Metoden är det som säljer en crémant, och en smak visar mer än ord. Gästen bestämmer själv med vinet i munnen och vet att valet är bra.*
2. Säg att de flesta ändå inte känner skillnad **(fel)**  
   *Det låter som att du tycker att gästen inte förstår. Det säljer varken vinet eller förtroendet.*
3. Föreslå champagnen på flaska i stället, så att kvällen känns festlig **(halvt, mot upplevelsen)**  
   *Gästen får något att fira med. Men hen frågade om ett glas, och du missar chansen att visa att crémanten är gjord på samma sätt och ett bra köp.*
4. Förklara noga metoden, andra jäsningen och ursprungsbeteckningen, och lämna valet där **(halvt, mot analysen)**  
   *Allt stämmer. Men gästen ville unna sig, inte gå en kurs. En kort mening och en smak hade gjort mer.*

*Vid fel:* Gästen ser förvirrad ut och tar något annat.

**Halvt grepp, mot analysen** (valet höll för analysen, upplevelsen saknades): Halvt grepp: valet höll för analysen, men inte för gästens upplevelse. Fakta om crémant var rätt, men gästen ville unna sig. En smak hade sagt mer än förklaringen.

**Halvt grepp, mot upplevelsen** (valet höll för upplevelsen, analysen saknades): Halvt grepp: valet höll för gästens upplevelse, men inte för analysen. Kvällen blev festlig, men crémanten görs på samma sätt som champagne. Den var redan ett bra val.

*Klarad:* Gästen blir nyfiken, smakar och beställer ett glas.  
*Personalen tar över:* Personalen tar över och svarar vagt. Gästen tar något annat.

*Referens:* (tom, Anders väljer)

## 7. För varmt

**vb12-varmt-rott** · omskriven från `vb12-varmt-rott` (För varmt) · vin, temperatur, en missnöjd gäst · spår sommellerie · fas rush

*Situationen:* {gäst} vid bord {bord} skickar tillbaka ett glas {vin}: vinet är för varmt. Flaskan har stått på bardisken hela kvällen.

### Steg 1 · Analys (episteme)

Flaskan har stått på bardisken hela kvällen. Vid vilken temperatur smakar ett rött vin bäst?

1. Rumstemperatur, som i en varm bar **(fel)**  
   *Regeln om rumstemperatur kommer från svala stenhus. En varm bar är för varm för rött vin.*
2. Runt 16–18 grader, svalare än rummet **(rätt)**  
   *Rumstemperatur betyder 16–18 grader, inte en varm bar. Då hålls alkoholen tillbaka och frukten blir frisk.*
3. Kylskåpskallt, som ett vitt vin **(fel)**  
   *För kallt rött blir stramt och tanninerna känns hårda. Rött ska vara svalt, inte kallt.*
4. Temperaturen påverkar inte smaken **(fel)**  
   *Temperaturen ändrar smaken mycket. För varmt rött smakar alkohol och sylt.*

*Ledtråden på kortet:* Analys: Rött ska vara 16–18 grader, svalare än en varm bar.

*Vid fel:* Du håller med om att vinet har rätt temperatur. Gästen ser inte övertygad ut.

### Steg 2 · Upplevelse (phronesis)

{gäst} säger: "Det smakar som varm saft. Jag trodde att rött skulle vara rumsvarmt, men det här är inte gott." Vad söker gästen?

1. En förklaring av regeln om rumstemperatur **(fel)**  
   *Gästen kan regeln och märker ändå att något är fel. Det är vinet som ska rättas, inte gästen.*
2. Ett annat vin **(ok)**  
   *Kanske, men gästen beställde det här vinet. Det är temperaturen som är fel, inte valet.*
3. Ett svalare glas av samma vin, och att få höra att hen hade rätt **(rätt)**  
   *Gästen tvivlar på sig själv ("jag trodde …") men smakade rätt. Ett svalare glas och ett ja gör klagomålet till något gott.*

*Ledtråden på kortet:* Upplevelse: Gästen vill ha ett svalare glas, och höra att hen hade rätt.

*Vid fel:* Gästen tar glaset men ler inte.

### Steg 3 · Handling (techne)

Vad gör du?

1. Häll ett nytt glas ur en svalare flaska, flytta de öppna röda till vinkylen och förklara utförligt hur värme får alkoholen att ta över **(halvt, mot analysen)**  
   *Vinet blir rätt. Men gästen ville ha ett svalare glas, inte en föreläsning, och fick aldrig höra att hen hade rätt.*
2. Ge gästen rätt, tacka för att hen sa till och lägg en isbit i glaset **(halvt, mot upplevelsen)**  
   *Gästen känner sig hörd, och det är bra. Men isen späder vinet. Det är flaskan som ska kylas, inte glaset.*
3. Ge gästen rätt och tacka för att hen sa till, häll ett nytt glas ur en svalare flaska och flytta de öppna röda till vinkylen **(helt grepp)**  
   *För varmt rött smakar alkohol och sylt. En sval vinkyl, eller en kort stund i isvatten, räddar det. Gästen hade rätt, och det ska märkas.*
4. Förklara att rött vin ska serveras i rumstemperatur **(fel)**  
   *Regeln om rumstemperatur kommer från svala stenhus. I en varm bar är vinet för varmt, och gästen har rätt.*

*Vid fel:* Gästen dricker glaset utan att säga mer. Pågår: Glaset står orört. Gästen vid bord {bord} beställer inget mer.

**Halvt grepp, mot analysen** (valet höll för analysen, upplevelsen saknades): Halvt grepp: valet höll för analysen, men inte för gästens upplevelse. Vinet blev svalt, men gästen fick en föreläsning i stället för ett tack.

**Halvt grepp, mot upplevelsen** (valet höll för upplevelsen, analysen saknades): Halvt grepp: valet höll för gästens upplevelse, men inte för analysen. Gästen fick rätt, men isen späder vinet. Flaskan ska ner till 16–18 grader.

*Klarad:* Nytt glas på bordet. Gästen smakar och nickar. De öppna flaskorna flyttas bort från disken.  
*Personalen tar över:* Personalen tar över men svarar inte på klagomålet. Gästen låter glaset stå.

*Referens:* (tom, Anders väljer)

## 8. Vin på kavajen

**vb18-kavajen** · omskriven från `vb18-kavajen` (Vin på kavajen) · en olycka i rummet (kris) · spår sommellerie · fas crisis

*Situationen:* {personal} tappar en flaska {vin} vid bord {bord}. Den går sönder, och vin stänker på en gästs ljusa kavaj.

### Steg 1 · Analys (episteme)

Vad säger fläcken? Vad i rödvinet är det som färgar tyget?

1. Färgämnen från druvskalen, antocyaner **(rätt)**  
   *Rödvinets färg kommer från skalen, som får ligga med musten under jäsningen. Det är de färgämnena som fastnar i tyget.*
2. Tanninerna från ekfatet **(fel)**  
   *Tanniner ger strävhet, och de flesta kommer från skal och kärnor. Färgen kommer från skalens färgämnen.*
3. Alkoholen, som bränner in färgen **(fel)**  
   *Alkoholen färgar inte. Det är druvskalens färgämnen som ger fläcken.*

*Ledtråden på kortet:* Analys: Färgämnen från druvskalen, antocyaner. Fläcken är färsk.

*Vid fel:* Personalen står osäker bredvid gästen medan fläcken sprider sig.

### Steg 2 · Upplevelse (phronesis)

Gästen ser ner på kavajen och säger tyst: "Den var min pappas. Jag har den bara när det är något särskilt." Vad söker gästen?

1. Att få ersättning för kavajen **(ok)**  
   *Kemtvätt hör till, men gästen talade om pappan, inte om pengar. Det är omtanken som behövs först.*
2. Att kavajen tas på allvar, och att någon tar hand om hen **(rätt)**  
   *Kavajen är inte vilket plagg som helst. Den som visar att hen förstår det, och gör det rätta för tyget, tar hand om både gästen och kvällen.*
3. Att det går fort och inte görs någon sak av **(fel)**  
   *Gästen sa motsatsen. Den som sopar undan en olycka gör den till en förolämpning.*

*Ledtråden på kortet:* Upplevelse: Kavajen betyder något. Gästen vill att den tas på allvar, och att någon tar hand om hen.

*Vid fel:* Glaset sopas upp. Gästen sitter kvar med en röd fläck. Pågår: Gästen med den fläckiga kavajen sitter kvar och ser på fläcken.

### Steg 3 · Handling (techne)

Vad gör du nu, med fläcken och med gästen?

1. Be om ursäkt, ta en servett med varmt vatten och gnid bort fläcken med gästen **(halvt, mot upplevelsen)**  
   *Ursäkten och omtanken är rätt. Men att gnida pressar in färgen i tyget, och värme kan fästa fläcken.*
2. Be om ursäkt, ge gästen ren servett och kallt vatten att badda med utan att gnida, erbjud att betala kemtvätten och bjud på kvällens vin **(helt grepp)**  
   *Kallt vatten och försiktig baddning tar upp det mesta av vinet utan att pressa in färgen, och gästen bestämmer själv över sin kavaj. En olycka blir en historia om hur krogen tog hand om sin gäst.*
3. Ge gästen ren servett och kallt vatten att badda med, och sopa sedan upp glaset och gå vidare **(halvt, mot analysen)**  
   *Fläcken sköts rätt. Men utan en ursäkt och utan ett ord om kavajen blir olyckan en förolämpning. Det är bemötandet efteråt gästen minns.*
4. Strö salt på fläcken, låt det torka in och sopa upp glaset **(fel)**  
   *Salt kan suga upp lite vätska, men en fläck som torkar in är svårare att få bort. Och gästen blir lämnad med den.*

*Vid fel:* Fläcken blir större och mörkare. Gästen suckar.

**Halvt grepp, mot analysen** (valet höll för analysen, upplevelsen saknades): Halvt grepp: valet höll för analysen, men inte för gästens upplevelse. Fläcken sköttes rätt, men kavajen var pappans och ingen bad om ursäkt.

**Halvt grepp, mot upplevelsen** (valet höll för upplevelsen, analysen saknades): Halvt grepp: valet höll för gästens upplevelse, men inte för analysen. Omtanken var rätt, men gnidning och varmt vatten fäster druvskalens färg i tyget. Kallt vatten och baddning hade räddat mer.

*Klarad:* Gästen skakar av sig, skrattar lite och tar emot erbjudandet.  
*Personalen tar över:* Personalen tar över: glaset sopas upp och någon ber kort om ursäkt.

*Referens:* (tom, Anders väljer)

## 9. Något sött

**vb23-sott** · omskriven från `vb23-sott` (Något sött) · vin och mat, dessert · spår sommellerie · fas closing

*Situationen:* Bord {bord} vill avsluta med chokladtryffeln och frågar vad de ska dricka till.

### Steg 1 · Analys (episteme)

Vad säger desserten? Vad händer med ett torrt vin som dricks till en söt dessert?

1. Det smakar sötare **(fel)**  
   *Tvärtom. Sötman i maten får vinet att smaka mindre sött.*
2. Det smakar fylligare **(fel)**  
   *Vinet blir inte fylligare. Det tappar frukt och känns tunnare.*
3. Ingenting, sötman påverkar bara maten **(fel)**  
   *Sötma i maten påverkar hur vinet smakar. Det är en av de säkraste reglerna i mat och vin.*
4. Det smakar surare och tunnare **(rätt)**  
   *Sötma i maten gör ett torrt vin surare och tunnare. Därför ska vinet vara minst lika sött som desserten.*

*Ledtråden på kortet:* Analys: Sötma i maten gör ett torrt vin surare och tunnare. Vinet ska vara minst lika sött som desserten.

*Vid fel:* Gästerna får ett förslag som inte passar och ser tveksamma ut.

### Steg 2 · Upplevelse (phronesis)

Värden vid bordet säger: "Vi vill avsluta med något som känns som en present." En i sällskapet lägger handen över sitt glas: hen dricker inte alkohol. Vad söker bordet?

1. Något festligt till dem som dricker vin **(ok)**  
   *Det är en del. Men handen över glaset säger att en vid bordet också behöver en present.*
2. Att kvällen avrundas snabbt, kaffe och nota **(fel)**  
   *Värden bad om en present, inte om notan. Avslutningen är det bordet minns.*
3. En avslutning som hela bordet kan dela, också den som inte dricker **(rätt)**  
   *Alla vid bordet ska få skåla. Den som inte dricker visade det utan ord, och det är också en önskan.*

*Ledtråden på kortet:* Upplevelse: En avslutning som hela bordet kan dela, också den som inte dricker.

*Vid fel:* En gäst sitter utan glas när de andra skålar.

### Steg 3 · Handling (techne)

Vad serverar du till chokladtryffeln?

1. Ett glas torrt rött till alla, det går alltid till choklad **(fel)**  
   *Sötman i tryffeln gör det torra vinet surt och tunt, och gästen som inte dricker får ett glas hen inte vill ha.*
2. Ett litet glas ung ruby-portvin, lätt svalt, och fråga gästen som inte dricker vad hen tycker om: kaffe eller en söt must **(helt grepp)**  
   *En ung, fruktig portvin klarar chokladens sötma och beska, och ett litet glas räcker. Ett eget förslag till gästen som inte dricker visar att hens val tas på allvar. Hela bordet skålar.*
3. Ett glas torrt mousserande till alla, och alkoholfritt bubbel till den som inte dricker **(halvt, mot upplevelsen)**  
   *Alla kan skåla, och det är rätt tanke. Men sötma i maten gör ett torrt vin surare och tunnare mot chokladen.*
4. Ung ruby-portvin till alla vid bordet, gästen som inte dricker kan låta bli **(halvt, mot analysen)**  
   *Vinet är rätt till tryffeln. Men ett glas gästen inte vill ha sätter fokus på det hen valt bort. Fråga i stället.*

*Vid fel:* Gästerna smakar. Vinet blir surt och tunt mot chokladen. Pågår: Glasen står kvar bredvid tryffeln.

**Halvt grepp, mot analysen** (valet höll för analysen, upplevelsen saknades): Halvt grepp: valet höll för analysen, men inte för gästernas upplevelse. Portvinen bar chokladen, men gästen som inte dricker fick ett glas hen inte ville ha.

**Halvt grepp, mot upplevelsen** (valet höll för upplevelsen, analysen saknades): Halvt grepp: valet höll för gästernas upplevelse, men inte för analysen. Alla fick skåla, men ett torrt vin blir surt mot en söt dessert. Vinet ska vara minst lika sött som tryffeln.

*Klarad:* Hela bordet skålar till tryffeln och beställer ett glas till.  
*Personalen tar över:* Personalen tar över: bordet får kvällens rödvin till chokladen.

*Referens:* (tom, Anders väljer)

## 10. Födelsedagen

**vb32-fodelsedagen** · omskriven från `vb32-fodelsedagen` (Födelsedagen) · ett firande bord, och grannbordet · spår sommellerie · fas rush

*Situationen:* Värden i lounge A vinkar diskret till Per, lutar sig fram och viskar att det är Karins födelsedag i kväll.

### Steg 1 · Analys (episteme)

Per ska beställa en efterrätt med ljus. Vad behöver köket veta först?

1. Att ljus och tändare ska ligga på brickan **(fel)**  
   *Köket planerar i antal och tid. Allergier går före allt annat, också på en fest.*
2. Hur många som ska ha och när den ska ut **(fel)**  
   *Köket planerar i antal och tid. Allergier går före allt annat, också på en fest.*
3. Antal, allergier och när den ska ut **(rätt)**  
   *Köket planerar i antal och tid. Allergier går före allt annat, också på en fest.*
4. Vilken efterrätt värden helst vill ha **(fel)**  
   *Köket planerar i antal och tid. Allergier går före allt annat, också på en fest.*

*Ledtråden på kortet:* Analys: Köket behöver antal, allergier och när den ska ut.

*Vid fel:* Jag tar hand om det.

### Steg 2 · Upplevelse (phronesis)

Värden viskar: "Hon vet ingenting, och hon älskar att sjunga." I lounge B sitter två gäster i ett affärssamtal och vill ha lugn. Vad behöver kvällen vid de två borden?

1. En kort fest för Karin, och lugn för grannarna i lounge B **(rätt)**  
   *Kvällen tillhör alla bord. Överraskningen och sången är Karins, lugnet är grannarnas. Båda går att ge.*
2. Så mycket musik och ljud som möjligt, så att festen märks i hela rummet **(fel)**  
   *Då hör grannarna inte sitt eget samtal. En fest som tar över rummet tar något från de andra borden.*
3. Att Karin blir firad, grannarna får stå ut en stund **(ok)**  
   *Karin ska firas, det stämmer. Men grannarna bad om lugn, och de är också kvällens gäster.*

*Ledtråden på kortet:* Upplevelse: En kort fest för Karin, och lugn för grannarna i lounge B.

*Vid fel:* Jag tar hand om det. Pågår: Jag tar hand om det.

### Steg 3 · Handling (techne)

Vad gör du?

1. Ge köket antal, allergier och tid, och be sällskapet vänta med sången tills grannarna har gått **(halvt, mot analysen)**  
   *Köket får det det behöver. Men grannarna kan sitta kvar länge, och då blir det ingen sång alls för Karin.*
2. En vers för Karin och något på huset till grannarna, och tårtan ut så fort som möjligt, utan att köket frågat om allergier **(halvt, mot upplevelsen)**  
   *Kvällen blir rätt för båda borden. Men allergier går före allt annat, också på en fest. Köket planerar i antal, allergier och tid.*
3. Be DJ:n höja musiken så att sången smälter in, och tårtan bärs högt över gästerna **(fel)**  
   *Grannarna får mer ljud, inte mindre, och öppen låga bland gäster kräver fri väg, lågt grepp och lugnt tempo.*
4. Ge köket antal, allergier och tid, låt sällskapet sjunga en vers och bjud grannarna i lounge B **(helt grepp)**  
   *Köket kan göra efterrätten säker och i tid. En kort fest och en gest till grannarna håller båda borden nöjda.*

*Vid fel:* Jag tar hand om det.

**Halvt grepp, mot analysen** (valet höll för analysen, upplevelsen saknades): Halvt grepp: valet höll för analysen, men inte för kvällens upplevelse. Köket fick allt det behövde, men Karin fick ingen sång.

**Halvt grepp, mot upplevelsen** (valet höll för upplevelsen, analysen saknades): Halvt grepp: valet höll för kvällens upplevelse, men inte för analysen. Båda borden fick sitt, men ingen frågade om allergier innan tårtan gick ut.

*Klarad:* Tårtan tänds vid luckan och bärs lågt i fri gång. En vers, sedan dämpar vi.  
*Personalen tar över:* Per tar över.

*Referens:* (tom, Anders väljer)

## Att granska

1. **Karaffering.** Ingen av de 39 raketerna handlar om att karaffera. Det finns bara som ett felsvar (korkdefekt luftas inte bort). En ny raket behöver skrivas om karaffering ska vara med.
2. **Det som föll bort.** Tre steg blev två frågor och en handling, så en del av originalens innehåll står inte längre som en egen fråga:
   - vb02: frysen (förut ok) är inte med;
   - vb11: hur en mousserande flaska öppnas (förut techne) är borta;
   - vb32: hur efterrätten med tända ljus bärs ut (förut techne) står nu i texten för klarad raket och i felsvarets förklaring;
   - vb01, vb12, vb18, vb23: originalets techne- och phronesis-svar är ihopslagna i det hela greppet.
3. **Rummet vid halvt grepp.** `success.outcome` beskriver ett helt grepp ("Gästen nickar efter första smaken"). Vid halvt grepp passar den texten inte alltid. Ett förslag är en egen text per raket (`halfGrip.outcome`), eller att bara återkopplingen visas.
4. **Gästernas repliker** är nya (till exempel kavajen som var pappans). De ska ge steg 2 något att läsa, inte ändra fakta. Säg till om någon känns för mycket.
5. **vb32 (födelsedagen)** har originalets röst: personalen talar ("Jag tar hand om det."). Texterna vid fel är originalets.
6. **Effekterna** är oförändrade. Steg 2:s fel ger originalets phronesis-effekt fast steget nu handlar om att läsa gästen, inte om att handla. Det kan behöva prövas i harness.
7. **Referenserna** är tomma. Anders väljer källorna, Gusto Science-biblioteket och etablerade referensverk först.
