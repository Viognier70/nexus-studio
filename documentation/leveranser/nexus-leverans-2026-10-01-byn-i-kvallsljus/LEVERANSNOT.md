# LEVERANSNOT: byn i kvällsljus

**Datum** 2026-10-01, omtag 2026-10-02
**Till** Claude Code, via dig
**Från** Claude Design
**Gäller** Byn i kvällsljus med gatlyktor, upplysta fönster och krogar som lyser när de har öppet, och de fyra nivåerna byn, kvarteret, gatan och krogen (288, före teatern).

Regeln från vardagens koreografi gäller här också: varje ljus som tänds eller släcks har en anledning i byn.

## 0. Omtaget 2026-10-02

Fyra beställningar efter granskningen:

1. **Kartan.** Första versionen byggde på det förenklade gatunätet från *Byn och gästerna*, inte på spelets karta. Byn är nu ombyggd på spelets karta: `grythyttan-world.json` (OpenStreetMap), samma data som `content/world.ts` läser. Se §2.
2. **Köplatserna.** Kön står på exakt samma platser som `room.queueSpots` i vardagens koreografi (`wineBarRoom.ts`). Platserna läses ur rummet. Uppmätt: alla sju platser ligger på samma punkt i byn och i teatern, ner till millimetern. Se §3.
3. **Köns gränser.** Gränserna står som platshållare (`null`) i `VILLAGE_QUEUE`, som läggs i `balance.ts`. **Code sätter talen.** Värdena som var handjusterade för bilden (kapacitet 4, tålamod gånger 4, preferens 30 för vår krog) är borttagna. Se §3.
4. **`kvarteret-2`** är omtagen: kameran står vid pizzerian, och pizzerian stänger i bild. Se §8.

## 1. Innehåll

| Fil | Var | Vad |
|---|---|---|
| `villageEvening.ts` | monteras | Nivåerna (`LEVELS`, nu i rummets ram och med synfält), övergångarna (`BLEND`), faserna och himlen (`PHASES`, `SKY`), ljusreglerna (`LIGHTS`) och färgerna. Inga klockslag. |
| `villageQueue.balance.ts` | läggs i `balance.ts` | `VILLAGE_QUEUE`: köns gränser som platshållare. **Ny.** |
| `byKvallPlats.js` | läses, mönster att följa | Byns platser ur kartan: gatunätet, krogarnas dörrar, bostadshusen och vår krog i rummets ram. Samma regler som `villageNetwork.ts`, `villagePlaces.ts` och `interiorLayout.ts`. **Ny.** |
| `byKvall.js` | läses, mönster att följa | Scenen: husen ur OSM-polygonerna, gatorna, lyktorna, fönstren, krogarnas fasader, kvällens ljus och hur gäster, sällskap, vagnar och bilar ritas på varje nivå. |
| `byKvallSim.js` | läses, monteras inte | Prototypens kväll. Talen hör hemma i `balance.ts` och sim-lagret, se §6. |
| `byKarta.js` | läses inte | Utsnitt ur `grythyttan-world.json`, så att prototypen fungerar fristående. I spelet läses `WORLD`. **Ny.** |
| `villageEveningStrings.ts` | slås in i `STRINGS` | 64 nycklar, `{ sv, en }`. Tre texter ändrade (`byk.level.hint`, `byk.venues.hint`, `byk.desc.venue.party`). Filen hade fel i huvudet i förra versionen, nu rättad. |
| `prototyp/Byn i kvallsljus.html` | läses, monteras inte | Fristående prototyp. three.js och Babel hämtas från nätet. |
| `bilder/1440x900/`, `bilder/1280x720/` | — | 11 kontrollbilder i varje storlek, utan text, alla omtagna. Se §8. |

## 2. Kartan

- **Källan** är `frontend/src/strategic/data/grythyttan-world.json` (main, läst 2026-10-02). Koordinaterna är spelets: meter, +x österut, +z söderut, origo vid 59,70575 N, 14,53723 E. Utsnittet har 184 byggnader och 156 vägar, med torget, Gästgivaregården, kyrkan, Pizzans hus, campus och sjön.
- **Husen** är OSM-polygonerna, resta till en höjd efter `kind` (`buildingLevels` och `height` när de finns). Rektangulära hus får sadeltak längs den långa axeln, och de andra får platt tak. Bostadshus är `house`, `residential`, `apartments`, `detached` och `terrace`, samt `yes` på 40–320 m². Dörren sitter på den kant som vetter mot närmaste gata.
- **Gatunätet** byggs som i `villageNetwork.ts`. Vägarnas punkter är noder, punkter inom 0,5 m slås ihop, och bara den största sammanhängande delen används. Vägarna hittas med Dijkstra. Bilarna kör i bilnätet (utan `track`).
- **Krogarna** står i byggnaderna i `VENUE_BUILDINGS` (`villagePlaces.ts`): Torgkrogen w869907973, Pizzeria Grytan w598989255 (Pizzans hus), Sjöboden w241105722 och hotellets matsal w869907964. Vagnarna står på `TRUCK_SPOT_POINTS` och bilarna parkerar vid `parkingPoint`. Studenterna kommer från Måltidens hus, höginkomsttagarna från hotellet eller bilen, och de andra från bostadshus nära krogen.
- **Vår krog** är rummets skal (15,6 × 11,8 m, `wineBarRoom.ts`), placerat som teatern placerar rummet: `obb = orientedBbox(w869907975)`, gruppen i `obb.centre` och `rotation.y = −obb.angle`. Fasaden, dörren, trottoaren och kantstenen är rummets. OSM-polygonen är 14,5 × 10,1 m, så skalet sticker ut 0,5–0,85 m på varje sida. Inga grannhus står i vägen.
- **Gatlyktorna** finns inte i kartdatan. De står var 30:e meter längs bilgatorna, växelvis på var sin sida. De sex lyktorna närmast vår dörr har en riktig ljuskälla.

## 3. Kön

**Platserna** är rummets `queueSpots` i ordning efter `order`: dörrmattan (`queueIn1`, `queueIn2`, innanför väggen, och de syns först i teatern) och sedan trottoaren (`queueOut1`–`queueOut5`). Prototypen skapar rummet med `createWineBarRoom()`, placerar det som ovan och läser `resolveWorldPositions(room).queueSpots`. Kön kan inte hoppa när teatern tar över, eftersom de två lagren läser samma punkter. Medlemmarna står bredvid varandra, inom 0,6 m från platsen, vända dit platsens `facing` pekar.

**Kön är aldrig längre än platserna** (sju sällskap). Ett sällskap som kommer när alla platser är tagna väljer en annan krog i byn.

**Gränserna** (`VILLAGE_QUEUE` i `villageQueue.balance.ts`) är platshållare. Code sätter dem:
- `seats`: när ett sällskap ställer sig i kö. Förslag: rummets kapacitet (`businessRoom.capacity`).
- `patienceSimSeconds`: hur länge sällskapet står i kö innan det går hem. Den som står först går aldrig. Förslag: `QUEUE.patienceSimSeconds` med kunskapens tillägg, så att byn och servicen har samma tålamod.
- `impatientBelow`: andelen tålamod som är kvar när `queueImpatient` tar över från `queueCalm`.

Prototypen fyller i `null` med `PROTO_QUEUE` (20 platser som i `wineBarRoom` `TOTAL_SEATS`, 45 s och 0,4) för att kunna spelas. De värdena följer inte med.

**Kameran på krogens nivå** är teaterns kamera (`PLAYER_CAMERA`: 24 m, 50°, synfält 42°, yaw 0,7 och mål [0,2, 0,9, 0,2] i rummets ram). Nivåernas mål och vridning står därför i rummets ram (`LEVELS`), och synfältet går från 34° till 42° på väg in.

## 4. De fyra nivåerna

Oförändrade sätt att rita (avstånd 190/90/42/24 m, `BLEND`). Det här är nytt:

| Nivå | Kamerans mål |
|---|---|
| **Byn** | Torget, Gästgivaregården, kyrkan och vår krog, söderifrån. |
| **Kvarteret** | Vår krog, torget med Grillvagnen och Torgkrogen. |
| **Gatan** | Trottoaren framför vår dörr, mot Prästgatan. |
| **Krogen** | Teaterns kamera, se §3. |

Hjulet zoomar, dra vrider, och högerklick och dra (eller skift och dra) flyttar kameran över byn. I listan visar namnet krogen (kameran går dit och ställer sig på dörrens sida), och läget öppnar eller stänger krogen för hand.

## 5. Ljusen

Reglerna i `LIGHTS` är oförändrade (§3 i förra versionen): lyktorna en i taget, husen släcks när sällskapet går ut och tänds när det kommer hem, krogarnas fyra lägen, hotellets rum, kyrktornet, vagnarna och bilarna. Två saker är nya. Campusbyggnaderna (`university`, `school`) följer regeln för Måltidens hus. Ljuscirklarna under lyktorna tonar ner på byns nivå, så att gatorna inte ser prickiga ut. Månens skugga följer kameran.

## 6. Till sim-lagret och balance.ts

Talen i `byKvallSim.js` är prototypens:
- **Öppettider som `e`** (`OPEN`) är oförändrade.
- **Sittiden:** sällskapen sitter 55–95 s (realtid) och går sedan, tidigare när kvällen lider. Förut gick ett slumpvis sällskap med jämna mellanrum, och krogarna tömdes innan de nya gästerna hann fram på den riktiga kartan. I spelet gäller `SITTING`.
- **Kvällen** tar 420 s i prototypen (förut 300), eftersom vägarna är verkliga: torget till Pizzans hus är 330 m.
- **Flödet** är som förut, men sällskapen kommer från bostadshus inom 260 m från krogen, och studenterna från campus när krogen ligger inom 380 m.
- **Slumpen** har ett frö (288).

## 7. Det som följer reglerna

Ingen text i bilderna. All text som nycklar `{ sv, en }`, brittisk engelska, och inga speltal i texterna. Den varma graderingen är bakad i pixlarna. Rött används inte. Prototypen fungerar i helskärm i 1440 × 900 och 1280 × 720.

## 8. Kontrollbilder

Från spelets kamera på varje nivå, i 1440 × 900 och 1280 × 720 och utan text. Alla är granskade i full storlek.

- `krogen-1-24m-fore-oppning`: bara köket lyser.
- `byn-1-190m-skymningen`: lyktorna tänds, husen lyser, gloriorna syns.
- `byn-2-190m-bla-timmen`: alla lyktor tända.
- `byn-3-190m-kvallen`: mitt i kvällen, lyktorna för sällskapen på väg.
- `kvarteret-1-90m-kvallen`: vår krog, torget med Grillvagnen och Torgkrogen.
- `gatan-1-42m-kvallen`: trottoaren med kön, och sällskap på väg in.
- `krogen-2-24m-kon`: fullt hus och kö på rummets köplatser.
- `kvarteret-2-90m-sent`: Pizzeria Grytan 2,4 s efter stängning. Köket lyser, dörren och lyktorna är släckta, och sällskapen går ut ett i taget.
- `byn-4-190m-natten`: de flesta krogar stängda, hotellet lyser.
- `gatan-2-42m-efter-stangning`: vår krog städar, de sista sällskapen går.
- `krogen-3-24m-efter-stangning`: köket lyser, gatan töms.

**Lägen som är satta för bilderna**, så att det som ska synas syns. Inga tal är ändrade.
- `gatan-1` och `krogen-2` visar läget *fullt hus*, som scen 5 i vardagens koreografi: rummet är fullt och sex sällskap står på köplatserna (`fullHouse()`). Kapaciteten och tålamodet är prototypens ifyllnad, se §3.
- `kvarteret-2`: fem sällskap sitter inne på pizzerian när den stänger (`seatParties()`). Annars är den nästan tom så sent, eftersom studenterna har 250 m att gå från campus.

## 9. Att se över

- **Rummet kan vända sig.** `orientedBbox(w869907975)` väljer kanten 0→1 (14,508 m) före 2→3 (14,500 m), en skillnad på 9 mm. Lokala +X pekar då söderut (vinkel 82,99°), och dörren vetter mot Prästgatan i söder, inte mot torget i norr som kommentaren i `interiorLayout.ts` säger (verifierad 2026-08-08). Byn följer koden, så att kön stämmer med teatern. En ändring på en centimeter i OSM vänder rummet och kön 180°. Förslag: låt entrésidan vara data i byggnadsposten, som kommentaren själv föreslår.
- **Byns nivå på 190 m** visar byns kärna, inte hela byn. Pizzans hus (330 m österut) och Sjöboden (500 m mot sydost) når man genom att flytta kameran eller välja krogen i listan. Spelets förval för byn är 900 m (`viewLevels.ts`). Ska byns nivå ligga längre ut?
- **Vägarna ritas oklippta.** Byggnaderna täcker dem där de går genom ett hus. Spelet klipper dem (`CLIPPED_ROADS`).
- **Krogarna** är OSM-polygonerna med fasad på dörrens kant. Interiören hör till teatern.
- **Ingen glöd (bloom).** Ljuset är tillsatta sken och cirklar.
