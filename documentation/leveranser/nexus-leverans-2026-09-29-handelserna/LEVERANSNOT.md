# LEVERANSNOT: händelsernas manus (andra utkastet, för granskning)

**Leverans** 3 av 5, del 1: manusen
**Datum** 2026-09-30, rättad samma dag efter andra granskningen
**Till** dig, för granskning. Går till Claude Code först när manusen är godkända och ritade.
**Från** Claude Design
**Gäller** De fem händelserna, omskrivna efter din granskning: alla i vinbaren, jämnare svar, trovärdiga felsvar, ärlighet som aldrig är fel och tillsynen som i verkligheten.

Inget är ritat. Videon eller prototypen och kontrollbilderna kommer när manusen är godkända.

---

## 1. Innehåll

| Fil | Vad |
|---|---|
| `manus/00-gemensamt.md` | Vinbarens platser och personal, hur en händelse går, regler för svaren, kameran och strålkastaren. |
| `manus/01-fodelsedagen.md` | Hovmästaren · lounge A |
| `manus/02-vasen-pa-pulten.md` | Servitören · entrén (ersätter *Vasen i passagen*) |
| `manus/03-gasten-som-vinglar.md` | Bartendern · baren |
| `manus/04-tillsynen.md` | Serveringsansvarig · ståbordet, med steg 3 i fyra varianter |
| `manus/05-gasten-vid-passet.md` | Kocken · passet |
| `eventStrings.ts` | 201 nycklar, `{ sv, en }`. Sex av dem ersätter nycklar i leverans 1, se §5. |

## 2. Dina svar, så som de står i manusen

- **Raketen slutar vid första felet, och scenen spelas alltid klart.** Varje manus har ett felslut för varje felsvar, inte bara för varje steg. Per tar över i alla händelser utom tillsynen, där han själv är huvudpersonen.
- **Tillsynen kan komma alla kvällar.** Steg 3 väljs i ordningen A nekad gäst, B ålderskontroll, D kravet på mat, C egenkontroll. Villkoren står i manus 4.
- **Vasen står på värdpulten vid entrén.** Ingen piedestal.

## 3. Ändringarna

**Vinbaren (4).** Alla platser är vinbarens: baren och barstolarna, loungen, småborden, ståborden, barens kortände, entrén och passluckan. Vinbaren saknar i dag en värdpult och en hovmästare. Jag lägger till båda: `hostDesk` vid [6,6, −0,55] och en station för Per bakom den. Per behövs för att *Per tog över* i leverans 1 ska stämma. Bartendern heter Mira, sommeliern Elin som i leverans 1.

**Lika långa svar (5).** På svenska skiljer sig svaren i ett steg högst 11 tecken. Det rätta är aldrig ensamt längst, på svenska eller på engelska. Code blandar ordningen.

**Trovärdiga felsvar (6).** De uppenbara felsvaren är borta. I stället finns vanliga misstag, till exempel att bära fort så att ljusen inte brinner ned, att servera öl men inte sprit, att lita på kursen i stället för listan, att torka vattnet före glaset och att säga *det kan hända vem som helst*. Varje Phronesis-steg har två försvarbara svar, och det näst bästa har en egen förklaring (`near3_N`).

**Ärlighet är aldrig fel (7).** Om tiden inte skrevs upp i manus 3 blir det ärliga svaret *Säger som det är: nekad, men tiden skrevs inte upp*. Det räknas som rätt, men ger en anmärkning i rapporten, och lärdomen pekar tillbaka på anteckningen. Inget annat manus har ett ärligt svar som räknas som fel.

**Tillsynen (8).** En alkoholhandläggare från kommunens tillståndsenhet och en polis kommer, var och en med sin legitimation. De iakttar först och ger sig till känna efter en stund. Påföljden beslutas av kommunen efteråt: erinran, varning eller återkallat tillstånd. I spelet visar kvällens resultat vad rapporten riskerar, och beslutet kommer som ett brev i morgonens post. Varje felsvar i manus 4 har sin påföljd. Fick gästen alkohol efter att han var märkbart påverkad blir det varning, vilket svar spelaren än väljer i tillsynen.

**Vasen (9).** Behållen: felet är krogens. Det nya felsvaret *det kan hända vem som helst* är fällan, eftersom det låter vänligt men lägger felet hos gästen.

## 4. Det som behöver ritas

**I rummet:** `hostDesk` med Pers station (`STAFF_STATIONS.host`).

**Nya klipp, 37 stycken.**

- *Gäster:* `guest.whisper`, `guest.clap`, `guest.sing`, `guest.stagger`, `guest.balance`, `guest.startle`, `guest.comfort`, `guest.slip`, `guest.peek`, `guest.showId`, `guest.standBar`, `guest.wheel`, `guest.wheelTurn`, `guest.wheelToTable`
- *Hovmästaren:* `host.welcome`, `host.point`, `host.introduce`, `host.fetchFolder`
- *All personal:* `staff.listen`, `staff.beckon`, `staff.halt`, `staff.kneelTalk`, `staff.sweep`, `staff.wipeFloor`, `staff.push`, `staff.escort`, `staff.decline`, `staff.write`, `staff.openFolder`, `staff.holdDoor`, `staff.smother`, `staff.checkId`
- *Servitör och bar:* `waiter.lightCandles`, `waiter.carryCake` (lugnt och stressat), `waiter.trayWobble`, `bar.leanIn`, `bar.pourWater`

Dessutom rekvisitans `vase.fall` och `candleDrop`, och `guest.reachGlass` från tillägget till leverans 2.

**Ny rekvisita, 10 föremål:** `hostDesk`, `wheelchair`, `vase`, `broom`, `dustpan`, `councilId`, `policeId`, `licenceFolder`, `apron`, `lighter`. Tårtan ska dessutom kunna stå på brickan.

**Blicken:** `ctx.lookAt` i de sittande och stående looparna, i stället för ett eget klipp.

## 5. Nycklar som ersätts i leverans 1

Händelserna spelas nu i vinbaren, så sex nycklar i `nexusStrings.varm.ts` får ny text. De står sist i `eventStrings.ts`: `lesson.rocket.3.who`, `lesson.when` (nu `{place}` i stället för bord), `lesson.principle`, `lesson.story` (ljuset faller på loungebordet), `lesson.yours.text` och `lesson.held.text`. `evening.event.4.line` (*Per tog över*) gäller som förut.

## 6. Beslut efter andra granskningen

- **Variant D är kravet på mat.** Lagad mat ska gå att beställa under hela serveringstiden. Varianten väljs när köket har slut på mat. Felen ger erinran (snacks i stället för mat) eller varning (serveringen fortsätter utan mat). Allergenerna blir en egen händelse senare, med livsmedelsinspektören.
- **Variant A** gäller tiden då gästen nekades. Ingen femte variant.
- **Värdpulten och Pers plats** i vinbaren är godkända.
- **Åldersgränsen 18 år** står utskriven i variant B. Det är lag, inte ett speltal.

## 7. Nästa steg när manusen är godkända

1. Rita klippen, rekvisitan och värdpulten.
2. En kort video per händelse från spelets kamera, med rätt och fel slut i minst ett av manusen.
3. Kontrollbilder från 12 m och 24 m, i helskärm 1440 × 900 och 1280 × 720.

## 8. Ritat 2026-09-30

- **Värdpulten** (`hostDesk`, 0,60 × 1,10 × 0,45 m) står i `wineBarRoom.ts` vid [6,6, −0,55] med framsidan mot dörren. **Pers station** `host` ligger bakom den, vid [6,1, −0,55], vänd mot dörren.
- **Tio föremål** i `tableware.ts`, uppmätta med `measureProp()`: värdpult, rullstol (0,62 × 0,92 × 1,05), vas med blommor, sopkvast, sopskyffel, kommunens och polisens legitimation, pärmen med tillståndet, förkläde och stormtändare. Nya grepp: `pole`, `card`, `push` och `none`. Nya ytor: `desk` (1,10 m) och `floor`. Tårtan kan stå på brickan.
- **38 klipp** i `figureClips.ts`: de 37 i §4 och `guest.reachGlass`. `validateClips()` ger inga fel, och katalogen har nu 84 klipp. Ny roll och grupp: `host`. Nya händelser: `light`, `drop`, `show` och `smother`. Namnen står i `theatreStrings.ts`.
- **Kvar:** videon per händelse med kameran och strålkastaren, rekvisitans egna rörelser (`vase.fall`, `candleDrop`) och kontrollbilderna.

## 9. Ritat 2026-09-30, andra omgången

**Teatern i vinbaren.** `teaterScen.js` bygger nu vinbarens riktiga rum (`createWineBarRoom`, helgläget, utan tak) med `set: 'winebar'`. Sittplatserna kommer ur rummets `seats`, och väggarna kapas mot kameran med `updateCutaway` varje bildruta. Tallrikar, glas och bestick är 1,5 gånger verklig storlek (beslutet 2026-09-30).

**Strålkastaren** (`spot`): resten av rummet sänks till 45 % ljus, och den som gör något står i en ljuspöl på 1,2 m i ljuslåga. Pölen följer figuren och tonas in och ut på ungefär en halv sekund.

**Kameran:** spelets 24 m, inglidning till 12 m när uppbyggnaden börjar, följer Sara på 13 m och går tillbaka till 24 m när slutet har spelat. Takten motsvarar inglidningen på 1,2 s och återgången på 1,6 s.

**Rekvisitans egna rörelser**, som effekter i `teaterScen.js`:
- `vaseFall`: vasen tippar från pulten, faller, går sönder i sju skärvor, blommorna hamnar på golvet och vattnet breder ut sig till 0,45 m. `clean` tar bort skärvorna (efter sopningen) och `dry` torkar vattnet.
- `candleDrop`: ett ljus lossnar från tårtan där den bärs, faller i en båge på 0,5 s och brinner på loungebordet. Ett brännmärke växer tills `out` (Pers `smother`) släcker det.

**Födelsedagen** (`handelserManus.js`, `birthday`) är ritad i båda slut:
- *Rätt:* alla tre steg, 47 s. Per hör viskningen, går till passluckan, kocken ställer fram tårtan, Sara tänder ljusen och bär lugnt i norra gången, sällskapet klappar och sjunger en vers, och Elin bjuder grannarna.
- *Fel:* steg 2, *fort*, 36 s. Sara bär stressat, gästen på `bar2` kliver ned, Sara väjer, ett ljus faller på loungebordet, och Per kväver det med förklädet. Pyramiden spricker i mitten.

**Prototypen** `prototyp/Handelserna - video.html` spelar händelserna från spelets kamera, med kapitel, SV/EN och båda storlekarna. Pyramiden står i hörnet i samma tillstånd som raketkortet. *Spela in WebM* spelar in scenen med pyramiden, utan text, i 25 bilder/s och laddar ned filen. **WebM-filerna ligger inte i mappen:** jag kan inte spara video härifrån, så de behöver spelas in med knappen.

**Kontrollbilder** i `bilder/1440x900/` och `bilder/1280x720/`, utan text:
- `fodelsedagen-1-24m-fragan`, `-2-12m-fragan`, `-3-13m-tartan-bars-lugnt`, `-4-13m-ljuset-faller`, `-5-12m-per-kvaver-ljuset`
- `rekvisitan-1-6m-vasen-faller`, `rekvisitan-2-6m-ljuset-faller`

**Att se över:** spelets kamera står i nordost, så sällskapen i loungen längs norra väggen syns bakifrån, även vid 12 m. Manuset säger att kameran ska vrida åt det håll som visar ansiktena, högst 35°. Det räcker inte för loungen. Förslag: för händelser i loungen vrids kameran 35° mot väster och sänks till 45°.

**Kvar:** manus 2–5 som tidslinjer (vasen, gästen som vinglar, tillsynen och gästen vid passet). Vasens fall och Pers pult finns redan i rummet.

## 10. Beslut och ritat 2026-09-30, tredje omgången

- **Kameran i loungen:** vid händelser i loungen vrids kameran 35° mot väster och lutar brantare (64°), så att ansiktena syns. Efteråt går den tillbaka till spelarens vinkel på 24 m. Det gäller födelsedagen från och med nu (`lounge()` i `handelserManus.js`).
- **Videofilerna** behövs inte. Prototypen är underlaget.
- **Manus 2, vasen på pulten** (`vase`), i båda slut:
  - *Rätt:* 45 s. Per välkomnar gästen i rullstolen vid dörren. Gästen svänger vänster runt pulten, handen tar i hörnet och vasen faller: skärvor, blommor och en blank vattenfläck framför hjulen. Följeslagaren lägger handen på gästens axel. Steg 1: Sara går lugnt fram och stannar före skärvorna med handen ute, och Per håller dörren. Steg 2: Sara sätter sig på huk och pratar med gästen, sopar och torkar sedan, och fläcken torkar bort. Steg 3: Per visar vägen och följer sällskapet till lounge B.
  - *Fel i steg 1:* 27 s. En gäst från ståbordet går mot dörren över vattnet, halkar och tar balansen. Sara springer fram och städar. Pyramiden spricker i botten.
- **Nytt i riggen:** `guest.wheelRoll` (rullstolen rullar framåt, händerna på ringarna). Rekvisita kan följa en figur (`follow`), så rullstolen följer gästen.
- **Vattnet** är en mörk, blank fläck och inte ljusblå, eftersom ljusblått inte syns mot det ljusa trägolvet. Skärvorna är 1,5 gånger verklig storlek, som det andra på golvet.
- **Kontrollbilder:** `vasen-1-24m-fragan`, `-2-11m-fragan`, `-3-11m-sara-sopar` och `-4-11m-gasten-halkar`, i båda storlekarna.

**Kvar:** manus 3–5 (gästen som vinglar, tillsynen och gästen vid passet). Ritade i §13.

## 11. Efter granskningen av vasen, 2026-09-30

- **Fri sikt mot skärvorna:** gästen i rullstolen stannar 0,5 m tidigare, vid [7,0, 0,45], och vasen faller åt sydost, ned mellan pulten och dörrväggen. Följeslagaren står öster om gästen. Kameran tittar från nordväst över pulten mot dörren (10 m, 57°), så fläcken ligger fritt när frågan kommer.
- **Kameran i loungen, provad mot bilderna:** 35° mot väster räckte inte. Sällskapen sitter med ryggen mot norra väggen och alltså mot kameran. Kameran går därför runt till södra sidan, 20° mot öster och 55° lutning. Då syns ansiktena och passluckan (`fodelsedagen-2-12m-fragan`). Efteråt går den tillbaka till spelarens vinkel.
- **Alla felslut i vasen:** varianterna heter nu `wrong1`, `wrong2` och `wrong3`, och födelsedagens fel heter `wrong2`.
  - *Fel i steg 2,* 30 s: Sara plockar en skärva med handen, skär sig och håller om handen (`rocket.cutHand`, `rocket.holdHand`). Per tar över med borsten. Fläcken står kvar.
  - *Fel i steg 3,* 42 s: pulten står kvar. Gästen vänder rullstolen och rullar ut, och följeslagaren följer med. Per håller dörren.
- **Nya kontrollbilder:** `vasen-5-11m-sara-skar-sig` och `vasen-6-11m-sallskapet-gar`. Bilderna 2–4 av vasen och födelsedagen 2 och 5 är tagna om med de nya vinklarna, i båda storlekarna.

## 12. Efter granskningen, 2026-09-30

- **Skärvorna** är större (10–15 cm), ljusa och har vita glimtar som blinkar i ljuset, så att glassplittret syns när frågan ställs.
- **Inglidningen i loungen** är längre och mjukare, ungefär 1,8 s, eftersom kameran vänder till södra sidan.
- **Vasen faller nu åt nordost**, framför pulten och mellan pulten och rullstolen, eftersom pulten skymde skärvorna när de låg söder om den. Gästen stannar 0,8 m före dem. Vasens bilder 2–6 är tagna om i båda storlekarna.
- **Innan leverans 3 lämnas över** granskas alla kontrollbilder i full storlek. Det är inte gjort än.

## 13. Ritat 2026-09-30, fjärde omgången: manus 3–5

Alla fem händelserna är nu ritade i `handelserManus.js` och spelas i prototypen. Varje felvariant visar felet i ett steg och spelas klart. Per tar över i gästen som vinglar och gästen vid passet.

**Manus 3, gästen som vinglar** (`drunk`). Kameran 12 m över loungen in mot disken, så att Mira syns bakom den.
- *Rätt,* 39 s. Gästen på `bar3` kliver ned, tar ett steg för långt bakåt och går in i Saras bricka (`waiter.trayWobble`, glasen står kvar). Han tar tag i stolen och svajar (`guest.balance`, `guest.stagger`). Steg 1: Mira lutar sig fram (`bar.leanIn`), Sara går vidare till lounge A. Steg 2: han sätter sig igen, Mira häller upp vatten. Steg 3: vännen på `bar4` vinkar, Mira skakar på huvudet och skriver upp tiden (`staff.decline`, `staff.write`).
- *Fel i steg 1,* 25 s: Mira häller upp vin och han tar glaset. *Fel i steg 2,* 31 s: vännerna klappar och han blir högljudd. *Fel i steg 3,* 42 s: vännen får ett glas och ger det till honom. Per kommer från pulten i alla tre.

**Manus 4, tillsynen** (`inspection`). Kameran 13 m mot barens östra kortände, med pulten i högra kanten.
- *Rätt, variant A,* 54,5 s. Handläggaren och polisen går förbi pulten till kortänden, Elin häller upp två glas vatten, de iakttar rummet. Per kommer, och de visar var sin legitimation (`guest.showId`). Steg 1: Per visar på sig själv (`host.introduce`). Steg 2: Per hämtar pärmen i pulten och lägger den öppen på disken. Steg 3: kameran glider 2 s mot gästen på `bar3` med vattenglaset och tillbaka. Mira kommer med blocket. De skriver sin rapport och går.
- *Rätt, variant D,* 67,5 s: under uppbyggnaden säger kocken till Sara att maten är slut. I steg 3 lägger kocken upp en enkel rätt, och Sara bär den till kortänden.
- *Fel i steg 1,* 31,5 s: Per pekar på Mira, handläggaren skriver. *Fel i steg 2,* 48,5 s: handläggaren skriver när pärmen är framme. *Fel i steg 3 (A, bara vatten),* 54 s: polisen skakar på huvudet, handläggaren skriver.

**Manus 5, gästen vid passet** (`kitchen`). Kameran 12 m från öster, in över kökets halvvägg.
- *Rätt,* 46 s. Matskribenten reser sig i lounge A och går till luckan, Sara kliver åt sidan, hon lutar sig in (`guest.peek`) och kocken tittar upp. Steg 1: kocken kommer till luckan och håller upp en hand. Steg 2: kocken håller köksdörren, ger henne förklädet och hon tittar in. Kameran glider söderut till dörren. Steg 3: hon går tillbaka och sätter sig, kocken lägger upp en smakbit och Sara bär den till bordet.
- *Fel i steg 1,* 28 s: hon går in utan förkläde, kocken följer ut henne. *Fel i steg 2,* 33 s: hon tas in direkt, kocken kliver undan, Per följer ut henne. *Fel i steg 3 (en lugnare kväll),* 47 s: hon sätter sig, och Per kommer med notan.

**Nytt i teatern:** `LOOKS.dj` och `stand` (figurens höjd över golvet, till exempel DJ-plattan). DJ:n står inte i händelserna, men i ringens prövning.

**Kontrollbilder,** i båda storlekarna, utan text:
- `vinglar-1-12m-fragan`, `-2-12m-mira-haller-vatten`, `-3-12m-mira-skriver-upp-tiden`, `-4-13m-per-tar-over`
- `tillsynen-1-13m-legitimationen`, `-2-13m-parmen`, `-3-12m-den-nekade-gasten`, `-4-12m-kocken-lagar-mat`, `-5-13m-handlaggaren-skriver`
- `passet-1-12m-fragan`, `-2-12m-koksdorren`, `-3-12m-smakbiten`, `-4-12m-per-foljer-ut`

**Förenklat, att se över:**
- Varje fel visar *ett* av felsvaren i steget, inte alla. De andra står i manusen.
- Tillsynens variant B och C är ritade i §14.
- Skålen med smårätter i manus 3 och pannan i manus 5 är utelämnade. Vattenglaset och smakbiten syns.
- Mira räcker inte blocket till Per i tillsynen. Hon visar det själv från disken.

**Kvar:** ingenting. Se §14.

## 14. Tillsynen B och C, granskningen och överlämningen (2026-10-01)

**Variant B, ålderskontrollen** (`rightB`, 57,5 s). Två unga gäster sitter i lounge B. Efter steg 2 går Sara dit och tar upp deras beställning med blocket (`waiter.takeOrder`), och kameran följer med. Steg 3 öppnas medan hon står kvar. *Rätt:* Sara ber om legitimation innan hon häller (`staff.checkId`, en gäst i taget), och båda visar sin sittande (**nytt** `guest.showIdSeated`). Handläggaren och polisen tittar på Sara.

**Variant C, egenkontrollen** (`rightC`, 58,5 s). Pärmen ligger öppen på disken sedan steg 2. Handläggaren bläddrar i den (`host.checkBook`) och frågar hur personalen vet vad som står i den. *Rätt:* Per vinkar till sig Mira (`staff.beckon`), hon går till kortänden, lyssnar, pekar i pärmen (`host.point`) och svarar. Handläggaren tittar på henne och skriver ingenting.

Felen i steg 3 visas i variant A, som förut. Nya nycklar för prototypen står i `eventVideoStrings.ts`: `evv.variant.rightB`, `.rightC`, `evv.ch.iaskB`, `.iendB`, `.iaskC` och `.iendC`. Prototypen har nu sju varianter av tillsynen.

**Nya kontrollbilder** i båda storlekarna: `tillsynen-6-11m-variant-b-bestallningen`, `-7-11m-variant-b-legitimationen`, `-8-11m-variant-c-egenkontrollen` och `-9-12m-variant-c-mira-visar`.

**Granskningen i full storlek.** Alla 30 bilder i 1440 × 900 är granskade en och en, och 1280 × 720 i kontaktark för beskärningen. Huvudpersonen står i bild i alla, och ingen bild har text. Åtgärdat och att veta:
- `rekvisitan-1-6m-vasen-faller` var tagen före §12 och visade de gamla, små skärvorna. Den är tagen om med de större, ljusa skärvorna.
- `rekvisitan-1` och `tillsynen-6` till `-9` är tagna i rummet från *vardagens koreografi* (`nexus-leverans-2026-10-01-vardagens-koreografi`). Där syns tavlan vid pulten, vinkylen i södra stråket och trottoaren. Rummet i den här mappen saknar dem. Bygger Code båda leveranserna efter varandra, stämmer bilderna.
- I `fodelsedagen-4-13m-ljuset-faller` är ljuset som faller bara en prick på 13 m. Rörelsen syns i `rekvisitan-2-6m-ljuset-faller`.
- Pyramiden i hörnet finns bara i vasens bilder, eftersom de togs från prototypens inspelning. Den innehåller ingen text.
- I tillsynen på 13 m syns barstolsgästerna på norra sidan bakifrån. Det är väntat med kameran mot kortänden.

**Överlämning.** Leverans 3 är klar att lämnas till Code. `figureClips.ts` här innehåller klippen till och med leverans 3 plus `guest.showIdSeated`. Vardagens klipp ligger i nästa leverans.
