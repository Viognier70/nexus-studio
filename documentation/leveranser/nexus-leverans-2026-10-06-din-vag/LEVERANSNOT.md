# D7: vagnen, din väg, Åsas erbjudande, ombyggnaden, fikat och nivåerna

**Leverans** 2026-10-06 · **Till** Claude Code · **Från** Claude Design

Sex saker i en leverans. Vagnen står på spelets riktiga karta (`grythyttan-world.json`, utsnittet i `byKarta.js`). Kontrollbilderna är i 1440 × 900 och 1280 × 720. Ingen text är inritad i bilderna. All text är nycklar `{ sv, en }`. Speltalen (kassa, rykte, dagar, insats, trivsel) är platshållare som kommer från balance.ts. Talen i prototypen är exempel.

| Fil | Var | Vad |
|---|---|---|
| `playerTruck.ts` | monteras | **Ny.** Spelarens vagn: planformen `trailer`, färger, mått, besättning och platsen på Torget. |
| `truckClips.ts` | läggs in i `figureClips.ts` | **Nya klipp:** `truck.grill`, `truck.hatchServe` och `truck.wipeCounter`, samt nya typer. |
| `careerPath.ts` | monteras | **Ny.** De åtta stegen, stegens tillstånd, kraven och när Åsa kommer. |
| `ownerOffer.ts` | monteras | **Ny.** Åsas scen och kort, med Ta över och Inte än. |
| `bistroRefit.ts` | monteras | **Ny.** Bistrons plan, de fyra stegen i ombyggnaden, dukningen och ljuset. |
| `afterHoursFika.ts` | monteras | **Ny.** Fikat efter stängning och dilemmakortet, med ett exempel. |
| `venueTier.ts` | monteras | **Ny.** Nivåerna Enkel, Mellan och Exklusiv på skylten och på morgonen. |
| `dinVagStrings.ts` | slås in i `STRINGS` | 138 nycklar. `review.fx.class` ändras (§6). |
| `truckPlats.json` | underlag | Vagnens punkter i kartans ram och mätningarna mot vägar, hus, rivalen och vinbarens kö. |
| `prototyp/Din vag och vagnen.html` | läses | Prototypen, fristående. Sju skärmar, båda storlekarna, svenska och engelska. |
| `skarmar/1440x900/`, `skarmar/1280x720/` | — | 15 kontrollbilder per storlek. |

Prototypen ritar uppifrån i 2D med kamerans bredd (24 m motsvarar 36 m mark i bild). Det är en skiss av läsbarheten och inte teaterns 3D.

## 1. Vagnen på Torget

**Platsen** (`truckPlats.json`, kartans ram):

- **Mitten** är [17,00, −21,90], och vinkeln −6,29°, parallell med gatan Torget (`w122157681`).
- **Luckan** vetter söderut mot torgytan, mellan Torget och Prästgatan.
- **Kön** går västerut under markisen: beställning, hämtplats och sex platser med 0,9 m mellan.
- **Trädäcket** ligger öster om vagnen, 3,2 × 3,6 m, med tre ståbord, en papperskorg och fyra planteringslådor med stolpar för ljusslingan.

**Kontrollen:**

- Ingen punkt ligger på en körbana eller i ett hus.
- Minsta marginalen till körbanan är 2,68 m med 5 m gata och 1,93 m med 6,5 m.
- Rivalernas plats på torget (`TRUCK_SPOT_POINTS.torget`) ligger 5,56 m från köns sista plats, så en rival kan stå där samma kväll.
- Däckets hörn ligger 1,59 m från vinbarens kö (`queueOut5`). Vinbaren är tom så länge spelaren har vagnen.

**Så skiljer sig vagnen från Grillvagnen och Tacovagnen uppifrån:**

- **Planformen:** en släpvagn med runda gavlar, dragstång och gasolflaskor, utan hytt.
- **Färgen:** dalablå med gräddrand.
- **Markisen:** hel duk i grädde med bågad kant i blått, inte randig.
- **Runt vagnen:** rök från skorstenen och trädäcket med ljusslingan.

Rivalerna är raka skåpbilar med hytt och randig markis, och de har ingen servering. Jämförelsen finns i bild 02.

**Taket:** taket kapas som i `truckPitch.setTruckCutaway`. Listen är 0,26 m, så att blått syns uppifrån, och skylten står kvar på bakkanten med nivåns knappar. På 12 m tonas markisen till 50 %, så att handen genom luckan syns.

**Namnet** på skylten är företagets namn ur liggaren. *Hyttgrillen* är ett exempel.

## 2. Klippen

| Klipp | Vem | Längd lugn / normal / stressad | Vad som syns |
|---|---|---|---|
| `truck.grill` | grillaren | 2,50 / 2,00 / 1,35 s | Armen över gallret, ett vrid med tången (`flip` vid 0,42) och en pust rök och gnistor. |
| `truck.hatchServe` | vid luckan | 3,25 / 2,60 / 1,75 s | Vrider sig mot bänken och tar brickan (`grab` 0,28), sträcker armen ut genom luckan och lutar sig fram (`give` 0,60), nickar. |
| `truck.wipeCounter` | vid luckan | 3,00 / 2,40 / 1,60 s | Tre cirklar per svep längs bänken. Stressad: blicken upp mot kön. |

- **Grillaren** lämnar brickan med `cook.toPass`, som finns redan. Bänken är `pass`.
- **Vid luckan** används vänster hand (`ctx.hand = 'L'`), för hämtplatsen ligger åt vänster.
- **Nya typer:** `Needs` `'hatch'`, `PropId` `'tongs'`, `'foodBox'` och `'coffeeCup'` samt `ClipEventType` `'flip'`.

## 3. Din väg

Åtta steg på en lina, i samma form som ställningen mot rivalerna:

1. Food truck
2. Vinbar
3. Bistro
4. Ölkrog
5. Restaurang
6. Nattklubb
7. Gästgiveri
8. Stjärnkrogen

**Hur stegen visas:**

- **Klara steg** är i guld med en bock.
- **Där spelaren står** visas med papper och sken och texten *Du är här*.
- **Nästa steg** har en guldkant, och kortet under linan visar de tre kraven.
- **Låsta steg** har streckad kant och *Kommer senare*, utan krav.

**Kraven** är kassa, rykte och medalj. Varje krav har en stapel och brickan *Klart* eller *Inte klart*. Det finns inget rött eller grönt, eftersom det inte är ett svar. När alla tre är klara kommer Åsa.

**Förslag (`careerPath.ts`):** ordningen, och att bistron kräver silver i Metodköket. Ölkrogen är ett sidosteg i speldesignen. Kassa och rykte är `CAREER.<steg>.cash` och `.rep` i balance.ts.

## 4. Åsas erbjudande

**Scenen:** efter stängning, den kväll kraven är klara. Kameran glider in till 10 m vid dörren ([30,71, −23,94]). Åsa står på trottoaren med nycklarna, och spelaren står i dörren.

**Kortet:** *Ett erbjudande*, Åsa (*Äger huset vid torget*), repliken och fyra rader om vad det betyder:

- stängt i {days} dagar
- kontantinsats {deposit}
- ryktet börjar om till hälften
- personalen och kunskapen följer med

**Knapparna:**

- **Ta över:** handslag, nycklarna byter hand, svaret på papper och knappen *Till ombyggnaden*.
- **Inte än:** Åsa sänker handen och erbjudandet står kvar. Det kostar ingenting.

## 5. Ombyggnaden från vinbar till bistro

Rummet är detsamma, 15,6 × 11,8 m. Ombyggnaden går i fyra steg:

1. **Tömt:** loungerna, DJ:n och tvåorna går ut. Virke, stege och skyddsdukar kommer in, med arbetsljus.
2. **Byggt:** väggen mot köket öppnas till ett pass med värmelampor. Baren blir kortare och flyttar söderut. Bänken byggs längs norra väggen med fem bord för två. Fyra bord för fyra ställs i mitten och två bord för två där DJ:n stod. Värdpulten står vid dörren.
3. **Dukat:** linne under papper, tallrik, bestick, glas och karaff.
4. **Tänt:** en pendel över varje bord, lampetter längs bänken och vitt ljus i passet. Det blir ljusare men lika varmt.

Antalet platser går från 20 till 34. Salen får ett varmare ekgolv (`BISTRO_FLOOR.hall` `#ad9673`), så figurernas kontrastband ska prövas mot det innan rummet byggs.

## 6. Fikat efter stängning

**Scenen:** laget sitter vid två tvåor som skjutits ihop. Stolarna står uppe på de andra borden, en pendel är tänd och resten av rummet är mörkt. Det finns kaffekoppar, en termos och bullar. Kameran är på 8 m. Sara frågar: hon lyfter handen och får ett mjukt ljus.

**Kortet:** vem som frågar, frågan och fyra svar av ungefär samma längd. Två svar är försvarbara och båda är gröna, eftersom det är phronesis. De två felsvaren är verkliga misstag.

**Efter svaret:**

- Förklaringen kommer på papper efter 650 ms, med domen *Rätt* eller *Inte den här gången* och raden *Två svar håller här*.
- Vid fel svar får båda de rätta svaren streckad grön kant och *Det här hade hållit*.
- Följden visas som en bricka: *Saras trivsel {delta}*.

Det finns ett dilemma, som exempel. Fler behövs för granskning.

## 7. Nivåerna Enkel, Mellan och Exklusiv

**Varför:** *Bistro* är nu ett steg. Därför får nivån neutrala namn: Enkel, Mellan och Exklusiv (`TIER_FROM_D5`: enkel → simple, bistro → mid, soigné → fine). Nivån räknas som förut ur varukorgen.

**Skylten:** krogens namn, steget och 1–3 knappar. Materialet följer nivån:

- **Enkel:** griffeltavla i träram, krita.
- **Mellan:** emalj i grädde med mässingskant.
- **Exklusiv:** svart lack med förgylld dubbelkant och en lampa ovanför.

Vagnens skylt har knapparna i högra änden. Stjärnor används inte, för stjärnan är målet.

**Morgonen:** raden *Tisdag morgon · Hyttan · Bistro · Mellan*. Den morgon nivån ändras står brickan *Från i dag: Mellan*.

**Nyckeländring:** `review.fx.class` blir *Ryktet på nivån {tier} {delta}* / *Reputation at the {tier} level {delta}* och ersätter *Ryktet som {cls} {delta}*.

## Kontrollbilder (båda storlekarna)

| Bilder | Vad de visar |
|---|---|
| 01–02 | Vagnen på 24 m med Grillvagnen på torget, och jämförelsen. |
| 03–05 | Klippen på 12 m: grilla, servera (brickan i handen genom luckan) och torka. |
| 06 | Din väg. |
| 07–08 | Åsa: erbjudandet, och efter Ta över. |
| 09–11 | Ombyggnaden: vinbaren, byggt och tänt. |
| 12–14 | Fikat: frågan, rätt svar och fel svar. |
| 15 | Nivåerna. |

## Öppet

1. **Stegen:** ordningen och bistrons medaljkrav är förslag.
2. **Rivalens kö på torget** hamnar på Prästgatan, som är gångfartsområde (`FLAGS.rivalPitch`).
3. **Klipp som saknas:** `gesture.raiseHand` finns inte, och inte heller ett klipp för att dricka ur koppen.
4. **Bistrons rum** finns inte än. Det byggs ur `BISTRO` (`FLAGS.room`), och rummet är fortfarande större än huset.
