# D12: levande figurer och grillvagnen

**Leverans** 2026-10-11 · **Till** Claude Code och Anders · **Från** Claude Design · **Beställning** brief D12 (Anders 2026-10-11, efter provspelet) · **Bygger på** D11 (zip 46), som inte ändras utöver det som står här.

Kontrollbilderna finns i 1280 × 720 och 1024 × 600, utan text i bilderna. All text är nycklar `{ sv, en }`. Talen för temperament, intensitet, svar och liv är platshållare för balance.ts (prototypens värden står i tabellerna).

| Fil | Vad |
|---|---|
| `figureFace.ts` | **Ersätter D11:s.** Samma två skal och samma fem uttryck, nu som former som glider över i varandra, i tre intensiteter, med blinkningar och blick. API:t är D11:s plus `show(state)`. |
| `figureLife.ts` | **Ny.** Livet i vila (blinkningar, blickar, huvudets små rörelser, tyngdbyten), temperamentets storlek på gesten (`scalePose`) och ansiktets övergångar (`faceAt`). |
| `gestureMap.ts` | D11:s karta plus `TEMPERAMENT`, `INTENSITY`, `VARIANTS`, `REACTIONS`, `LIFE_RULES` och en ny `pickGesture()` som ger klipp, variant, hand, tempo, storlek och ansikte. |
| `figureClips.ts` | Hela filen. Avsnittet D12 sist: 11 varianter, 6 svar och möten, 12 stående. Barnets och förälderns arm är rättade (§1). |
| `d12Clips.ts` | Utdrag av avsnittet D12, samma kod. |
| `guestGroups.ts` | Ryggsäcken, luvan och turistens kamera rättade. `BACKPACK`, `CARRY_RULES` och `checkCarried()` är nya. |
| `grillvagnar.js` | De tre förslagen på grillvagnen som three.js, med måtten som data (`TRUCKS`). |
| `d12Manus.js` | Tidslinjerna för prototypen, och `party()`, som bygger ett samtal med svaren ur `REACTIONS`. |
| `d12Strings.js` | Texterna. |
| `prototyp/D12 - Levande figurer och grillvagnen.html` | Prototypen med tio skärmar. *Livet* kan slås av för att jämföra med D11. |
| `kontrollbilder/1280x720/`, `kontrollbilder/1024x600/` | 32 bilder per storlek. |

## 1. Det de bär

**Felet:** `joints.chest` sitter i höftlinjen (`figureRig`: chest hänger i pelvis på y 0, och bröstkorgen går från 0,24 till 0,588 ovanför). Ryggsäcken låg på chest-y −0,05, alltså 5 cm under höften.

**Rättat i `guestGroups.ts` (`BACKPACK`):**

- Säcken är 0,30 × 0,40 × 0,15 m. Överkanten ligger i axelhöjd (0,60) och underkanten på 0,20, så den sitter högt på ryggen.
- Lock och framficka.
- Två remmar går över axlarna och ned över bröstet, på x ±0,095, innanför axellederna (±0,185) så att armarna inte går igenom dem.
- Den hänger i chest, så den följer överkroppen när figuren går, lutar sig och vrider sig (bild 01–03).
- Luvan låg på 0,49, inne i bröstet. Nu ligger den på axlarna (0,60).

**Alla som bär något, genomgångna:**

| Vem | Före | Nu |
|---|---|---|
| Studenterna, ryggsäcken | på rumpan | högt på ryggen, remmar över axlarna |
| Turisten, kameran | kameran på chest-y −0,12, under höften | remmen från vänster axel till höger höft, kameran framför höger höft (0,20) |
| Förälder och barn, handen | händerna 0,60 m isär (D11) | 4,5 cm isär (mätt i prototypen, bild 04) |
| Hunden, kopplet | rätt | oförändrat |
| Väska, kasse | finns inte i spelet | reglerna står i `CARRY_RULES` |

**Barnet:** förälderns arm går närmare kroppen (lift 0,42 → 0,20, axeln sänkt 0,10). Barnet lyfter armen till 1,0. Kropparna står 0,81 m isär och barnet går 0,10 m före (`d12Manus.CHILD_SIDE`, `CHILD_AHEAD`). Ett barn som är 1 m långt måste ha armen nästan vågrät för att nå en vuxens hand, därför avståndet.

`checkCarried(rig)` kontrollerar ryggsäckens över- och underkant. Prototypen kör den i varje bildruta, och raden under tidslinjen säger *ryggsäckarna rätt*.

## 2. Mimiken lever

**Övergångar:** ögon, bryn och mun är polygoner med lika många hörn i alla fem uttrycken (`FACE_SHAPES`). Ett uttryck går därför över i nästa hörn för hörn. Inget byts ut, och det går 0,3–0,6 s beroende på temperamentet. Bild 05–07 och 30–32 visar början, mitten och slutet av nöjd → glad efter första tuggan, och bild 08–10 samma sak från krogens nivå.

**Uttrycket är ett svar på något.** Ansiktet ändras av en händelse i tidslinjen, eller av en gest (`clip.mood`). Det stannar sedan tills något nytt händer, och slappnar av mot nöjd efter ett skratt.

**Svaren (`REACTIONS`):**

- `listen`: den som lyssnar vänder huvudet mot den som pratar och nickar lite.
- `jokeLands`: efter poängen i `guest.tellJoke` (u 0,64) svarar den närmaste efter sin `reactDelayS` med temperamentets svar.
- `smileSpreads`: de andra ler i platsordning, 0,35 s isär.
- `tellerReplies`: den som berättade småskrattar tillbaka.
- `staffSpeaks`, `badNews` och `passNod`: personalen nickar åt en gäst i förbifarten, och gästen nickar tillbaka.

Bild 11–13 visar svaren, och i vagnens bilder nickar kön åt medhjälparen.

**Livet i vila (`figureLife.ts`):**

- Blinkningar. En blinkning tar 0,14 s, var sjunde är dubbel, och en följer var tredje blick.
- Blickar: ögonen flyttar sig först (0,06 s) och huvudet efter (0,3 s) till 60 % av vinkeln. Sedan går ögonen delvis tillbaka.
- Huvudets drift är två långsamma sinusvågor per led.
- Stående figurer flyttar tyngden ibland.
- Under en gest dämpas blickarna och driften till 0,3. Blinkningarna fortsätter.
- Blickarna väljs i rummet, aldrig mot kameran (D11).

**Ordningen per bildruta:** `sampleClip` → `scalePose` → `applyPose` → `applyLife` (läggs till på leden) → `face.show(faceAt(...))`. Allt är en funktion av tiden, så samma t ger samma bild. Prototypen gör schemat ur ett frö per figur, och spelet kan göra detsamma eller köra timers.

## 3. Olika personer, olika uttryck

**Temperament (`TEMPERAMENT`, platshållare):**

| | Gesten | Ansiktet | Övergång | Svarar efter | Svar på skämt | Blickar |
|---|---|---|---|---|---|---|
| Lugn | 0,8 | 0,85 | 0,5 s | 0,45 s | småskratt | var 3,4–6 s, 0,3 rad |
| Livlig | 1,3 | 1,15 | 0,3 s | 0,25 s | skratt | var 1,6–3,2 s, 0,5 rad |
| Reserverad | 0,6 | 0,7 | 0,6 s | 0,6 s | leende | var 4–7 s, 0,2 rad |

Storleken på gesten är avvikelsen från vilan gånger talet (`scalePose`). Benen, sitthöjden och lyftet ur sitsen skalas inte, och armens sving begränsas till 2,9 rad. Temperamentet väljs ur gästens nummer (`temperamentOf`), med andelar per gästgrupp i `TEMPERAMENT_BALANCE` (null = lika många). Bild 14–15 visar samma klipp, samma intensitet och samma ögonblick hos en lugn och en livlig gäst.

**Intensitet (`INTENSITY`):**

- svag: lugnt tempo, ansiktet 0,5, gesten 0,8
- tydlig: normalt tempo, D11:s ansikte, gesten 1,0
- stark: stressat tempo, ansiktet 1,3, gesten 1,2

Ansiktets intensitet räknas från ett vilande ansikte mot uttrycket, och stark går förbi D11:s ritning. `intensityFor(tryck)` väljer nivå med gränser i `INTENSITY_BALANCE`. Måttligt otålig = tydlig, mycket otålig = stark (bild 16–17). Panelen visar otålig och glad i alla tre nivåerna.

**Varianter (`VARIANTS`):** varje vanlig gest har två varianter. A är klippet från D1 och D11, B är nytt:

- vinka: A har armen rakt upp, B handen i huvudhöjd och en vinkning från armbågen
- otålig vinkning: A har stora svep, B armen upp och handen som pumpar
- skratta: A kastar huvudet bakåt, B lutar sig framåt med handen för munnen
- prata: A har en hand som ritar, B armbågarna på bordet och båda händerna
- nicka: A gör två nickar med öppen hand, B en djup nick med handen mot bröstet
- klockan: A tittar ned, B suckar upp i taket och sedan en kort blick på klockan
- armarna i kors: A är stängd, B lutad bakåt med handen mot hakan
- axelryckning: A med båda axlarna, B med en
- söka blicken: A vänder huvudet, B reser sig halvt och vrider bålen
- skåla: A över huvudet, B mot grannen

Alla finns också stående för vagnen (`…StandB`). `pickVariant` väljer A eller B ur gästens nummer och hur många gånger hen gjort gesten. Var femte gäst använder vänster hand (`leftHandShare`), och två grannar gör aldrig samma variant samtidigt (bild 18–19).

## 4. Grillvagnen, tre förslag (bild 21–29)

Alla tre står i vagnens ram från D7 och D10: lådan är 4,6 × 2,3 m, luckan vetter mot kön, och kön, ståborden och serveringen står där D10 har dem. Alla har lucka, markis, meny på tavlan, grill och en kyl som syns.

- Två arbetar i vagnen: grillaren vid grillen och en i luckan som tar beställningen. De står på vagnens golv (`floorY`).
- Medhjälparen går ut genom dörren och längs kön utanför kölinjen (z 3,05). Hen nickar åt dem som står där, tar en beställning längst bak och går tillbaka (`TRUCKS[id].helper`).

| | A · Kiosksläpet | B · Grillstugan | C · Skåpbilen |
|---|---|---|---|
| Form | den klassiska korvkiosken på släp, rundade hörn, dragstång med gasol och stödhjul | oljad furu med dalablå knutar och sadeltak av plåt | ombyggd skåpbil med hytten där dragstången annars står (x −3,5…−1,9) |
| Färg | dalablå nedtill, gräddvit upptill, aluminiumlist i diskens höjd | trä, dalablått, mörk plåt | dalablå, gräddvitt tak och list |
| Lucka | skjutfönster, 2,4 × 1,24 m | träskiva som fälls upp på stöttor | nedre halvan fälls ned och blir disk |
| Markis | randig över luckan, festonger, glödlampor | festonger på luckan, och en egen randig markis över kön | rullmarkis över luckan |
| Meny | kritmeny på väggen | kritmeny på ett ställ, vänd mot kön | ljusskylt vid luckan |
| Grill | stekhäll bak och korvrulle i luckan | kolgrill i luckan, glöd och rök ur skorstenen | stekbord i luckan, fläkthuv |
| Kyl | glasdörrskyl rakt bakom luckan | glaskyl ute under markisen, medhjälparen tar ur den | hög glasdörrskyl, bakdörrarna öppna mot serveringen |
| Golvet | 0,32 m | 0,38 m | 0,62 m |

**Taket och markisen på krogens nivå:** taket tonar ut som husens (`ROOF_BLEND`: helt synligt från 40 m, borta vid 26 m), men taklisten och skylten står kvar. Kamerans lutning gör att en markis annars döljer den som står i luckan, och B:s markis döljer kön. Markiserna tonas därför ned till 0,3 på samma avstånd (`CANOPY_MIN`). Bild 23, 26 och 29 visar vagnarna med taket på, från gatans nivå (42 m).

**Att tänka på:**

- C:s stötfångare går 0,12 m förbi D7:s dragkrok (x −3,52 mot −3,4).
- B:s markis över kön går ut till x −4,6, alltså över köplatserna 1–4.

Anders väljer ett förslag, och det byggs i nästa leverans.

## Kontrollbilder (båda storlekarna)

| Bild | Vad den visar |
|---|---|
| 01–02 | Studenterna med ryggsäck, Z och 10 m |
| 03 | Ryggsäcken bakifrån, 7 m |
| 04 | Hand i hand, 10 m |
| 05–07 | Ansiktet går över (nöjd → glad), 10 m, början, mitten och slutet, med luppen |
| 08–10 | Samma från Z |
| 11–12 | Två gäster som svarar varandra, 10 m och Z |
| 13 | Leendet som sprider sig i loungen, 10 m |
| 14–15 | Samma gest hos en lugn och en livlig gäst, 10 m och Z |
| 16–17 | Otålig i tre nivåer, 11 m och Z |
| 18–19 | Varianterna A och B, 10 m och Z |
| 20 | Rummet lever, Z |
| 21–23 | Vagn A: 10 m, Z, 42 m |
| 24–26 | Vagn B: 10 m, Z, 42 m |
| 27–29 | Vagn C: 10 m, Z, 42 m |
| 30–32 | Ansiktet går över, 6 m, början, mitten och slutet |

Luppen nere till vänster visar huvudena i skärmens egna pixlar. På 10 m ligger ansiktet i D11:s övergång mellan det nära och det långa skalet. Bild 30–32 visar därför övergången också på 6 m.

## Öppet

1. **Talen:** `TEMPERAMENT`, `INTENSITY` och `INTENSITY_BALANCE`, `REACTION_BALANCE`, `LIFE_RULES`, `VARIANT_RULES.leftHandShare`, `FACE_INTENSITY` och `TEMPERAMENT_BALANCE.share` sätter Code i balance.ts.
2. **Vagnen:** Anders väljer A, B eller C.
3. **Väska och kasse:** de finns inte i spelet. Om de läggs till gäller `CARRY_RULES`.
