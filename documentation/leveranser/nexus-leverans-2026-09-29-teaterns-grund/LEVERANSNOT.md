# LEVERANSNOT — teaterns grund

**Leverans** 2 av 5 efter tredje provspelet
**Datum** 2026-09-29
**Till** Claude Code
**Från** Claude Design
**Gäller** Rummets kroppsspråk: namngivna klipp på den befintliga riggen i tre tempon, samspel mellan två figurer, klipp till dagens raketer, handpunkter, rekvisita i meter och sittregeln.

Nästa leverans är 3: händelserna (ett manus per händelse).

---

## 0. Två regler från och med nu

- **Inga speltal i texterna.** `theatreStrings.ts` har inga siffror. Längder och mått skrivs som platshållare (`{s}`, `{w} × {h} × {d}`) och formateras i koden. Krediter, tider och priser kommer från `balance.ts`.
- **Bilderna har den varma graderingen.** Alla bilder och videon är graderade med `WARM.roomGrade.service` och vinjetten ur `nexusTheme.warm.ts`.

Leverans 1 följer inte den första regeln överallt. Nycklarna `hud.week`, `hud.left`, `hud.opens`, `brief.schedule.1.sub`, `brief.book.*.note`, `brief.book.stars` och `rocketCard.stepOf` innehåller tal. De behöver platshållare innan de slås in. Jag skickar en rättad nyckelfil om ni vill.

## 1. Innehåll

| Fil | Status | Vart | Vad |
|---|---|---|---|
| `figureClips.ts` | ny | `strategic/scene/`, bredvid `figureRig.ts` | 42 klipp. `TEMPO`, `SEAT_RULE`, `sampleClip()`, `crossfade()`, `eventTime()`, `validateClips()`, `clipTable()`. Sittregeln: `sitApproach()`, `canSit()`, `checkSeated()`. |
| `figureInteractions.ts` | ny | samma | 8 samspel. `scheduleInteraction(id, tempo)` och `checkInteractions()`. |
| `tableware.ts` | ny | samma | 17 föremål i meter, `HANDPOINTS` (10 grepp), `holdProp()`, `updateHeld()`, `placeProp()`, `releaseToSurface()`, `setOnProp()`, `measureProp()`. |
| `theatreStrings.ts` | ny | slås in i `STRINGS` i `nexusStrings.ts` | Klippens, samspelens, raketernas och rekvisitans namn, `{ sv, en }`. |
| `prototyp/Teaterns grund - prototyp.html` | ny | läses, monteras inte | Servering, raketer, klippbiblioteket i tre tempon och rekvisitan. SV/EN. Fristående fil, men three.js, Babel och typsnitten hämtas från nätet. |
| `bilder/*.png` | nya | — | 24 kontrollbilder, 1440 × 900. Se §7. |
| `video/servering-bord-4.webm` | ny | — | En hel servering vid bord 4, 57 s, 1280 × 720, 25 bilder/s, VP9. |

`figureRig.ts` är oförändrad och följer inte med. `figureActs.ts` gäller som förut. Klippen är ett lager ovanpå poserna, med längd, början och slut.

## 2. Beslut

**Klipp i stället för poser.** En pose säger hur kroppen ser ut. Ett klipp säger dessutom hur länge rörelsen pågår, om den loopar, vad händerna håller före och efter, när något tas eller släpps och vilka klipp som får komma sedan. Simuleringen väljer klipp, och klippet sköter kroppen.

**Tempot är takt, fart och hållning.** Lugnt: 0,8 × takten och 0,9 m/s. Normalt: 1,0 och 1,2 m/s. Stressat: 1,5 × takten, 1,6 m/s och längre steg. Personalens bål går 0,08 rad framåt vid full stress. Gästernas hållning ändras inte med tempot; de har egna klipp för otålighet. Byt tempo vid klippgräns, annars hoppar fasen. Övergången blandas under `TEMPO.blendSec` (0,4 / 0,3 / 0,18 s).

**Förstorat för 24 m.** Från spelets kamera är en figur 55–80 px hög. Vinkningen går över huvudet. Hällningen tippar flaskan 1,9 rad. Glasen i skålen möts över bordets mitt. Den som skär sig viker sig framåt och backar ett steg. Diskret betyder osynligt på det avståndet.

**Rekvisitan hänger inte i handen.** `updateHeld()` lägger föremålet i världen efter handankaret varje bildruta. Om tallriken satt under handen i scengrafen skulle den krympa med gästens `heightMult`, och den skulle luta med underarmen. Tallrikar, glas och brickor är vågräta. Det som lutar (flaskan vid hällning, glaset vid klunken) får sin lutning från klippets `tilt`.

**Föremål släpps där handen är.** `releaseToSurface()` ställer föremålet rakt under handen på ytans höjd. Tallriken hamnar där servitören faktiskt lade den. I `waiter.serve` är handen 0,81 m över golvet vid släppet, så tallriken sjunker högst 7 cm till bordsskivan.

**Enhandsklipp speglas.** `ctx.hand = 'L'` speglar klippet. Den andra handen kan hålla kvar det den bär (`ctx.keep`). Så bär servitören två tallrikar och serverar en i taget.

## 3. Sittregeln

I provspelet satt en gäst på golvet. Den sittande posen spelades där gästen råkade stå, utan någon stol under. Regeln:

1. En sittande pose får bara spelas av en figur som har en stol (`Seat`). Roten står på sitsens mitt. `canSit()` säger nej om stolen saknas eller om sitshöjden avviker mer än 3 cm från 0,45 m.
2. Man kommer till stolen från sidan. `sitApproach(seat, side)` ger punkten 0,45 m åt sidan och 0,12 m fram. Gången ska sluta där, och `guest.sit` börjar där.
3. Höften sänks först när bäckenet är över sitsen. Uppmätt: vid 0,1 m sänkning står bäckenet 0,04 m från sitsens mitt.
4. Stolen dras ut 0,26 m när gästen kliver in och skjuts in när hen sätter sig (`chair(u)`). Rummet flyttar stolen efter klippet.
5. `checkSeated()` mäter höftens höjd mot sitsen och avståndet till sitsens mitt. Uppmätt i serveringen: 811 mätningar på sittande gäster med `heightMult` 0,92–1,06. Största höjdfel 8 mm, största sidofel 0 mm. Riggens sitsankare håller också för 0,72 och 1,12.

## 4. Klippen

Längderna gäller lugn / normal / stressad i sekunder. För klipp som går (G) är längden en gångcykel. Gången drivs av sträckan, inte av klockan.

| Klipp | Typ | Längd | Läge | Håller → efter | Följs av |
|---|---|---|---|---|---|
| `staff.idle` | loop | 5 / 4 / 2,65 | står | — | allt som börjar stående |
| `staff.walk` | G | 1,25 / 1,05 / 0,95 | går | — | idle, dodge, takeOrder, pickUp, clear, presentBill, present, pour, receive |
| `staff.dodge` | engång | 1,75 / 1,4 / 0,95 | går | — | walk |
| `waiter.carryPlate` | G | 1,25 / 1,05 / 0,95 | går | R tallrik | carryPlate, serve, dodge |
| `waiter.carryTwoPlates` | G | 1,25 / 1,05 / 0,95 | går | L+R tallrik | carryTwoPlates, serve, dodge |
| `waiter.carryTray` | G | 1,25 / 1,05 / 0,95 | går | L bricka | carryTray, serve, dodge |
| `waiter.pickUp` | engång | 1,75 / 1,4 / 0,95 | står | — → R tallrik | pickUp, carry* |
| `waiter.serve` | engång | 3 / 2,4 / 1,6 | står | R → — | idle, walk, serve, clear |
| `waiter.clear` | engång | 3,75 / 3 / 2 | står | — → R tallrik | clear, carryPlate, carryTwoPlates, walk |
| `waiter.takeOrder` | loop | 5 / 4 / 2,65 | står | L block | takeOrder, walk, idle |
| `waiter.presentBill` | engång | 4 / 3,2 / 2,15 | står | R notamapp | walk, idle |
| `bar.pour` | engång | 3,25 / 2,6 / 1,75 | står | R flaska | pour, setDown, wipe, idle |
| `bar.setDown` | engång | 2 / 1,6 / 1,05 | står | R → — | wipe, pour, idle, walk |
| `bar.wipe` | loop | 2,75 / 2,2 / 1,45 | står | R servett | wipe, pour, idle |
| `somm.present` | engång | 3,75 / 3 / 2 | står | R flaska | open |
| `somm.open` | engång | 5 / 4 / 2,65 | står | R flaska (via L) | hostTaste, pour, bar.pour |
| `somm.hostTaste` | engång | 5,65 / 4,5 / 3 | står | R flaska | pour, walk |
| `somm.pour` | engång | 3 / 2,4 / 1,6 | står | R flaska | pour, setDown, walk |
| `cook.station` | loop | 3 / 2,4 / 1,6 | står | — | station, plate, idle |
| `cook.plate` | engång | 3,75 / 3 / 2 | står | — | plate, toPass |
| `cook.toPass` | engång | 2,5 / 2 / 1,35 | står | — | station, plate |
| `dish.receive` | engång | 2,25 / 1,8 / 1,2 | står | — → R tallrik | wash |
| `dish.wash` | loop | 2,5 / 2 / 1,35 | står | R disk | wash, receive, idle |
| `guest.walk` | G | 1,25 / 1,05 / 0,95 | går | — | walk, sit |
| `guest.sit` | engång | 2,75 / 2,2 / 1,45 | står → sitter | — | readMenu, seatedIdle, gesture |
| `guest.seatedIdle` | loop | 6,25 / 5 / 3,35 | sitter | — | alla sittande klipp, leave |
| `guest.readMenu` | loop | 6,25 / 5 / 3,35 | sitter | R meny | readMenu, order, waveStaff, askPointMenu |
| `guest.order` | engång | 5 / 4 / 2,65 | sitter | R meny → — | seatedIdle, gesture, lean |
| `guest.eat` | loop | 4,4 / 3,5 / 2,35 | sitter | L kniv, R gaffel | eat, seatedIdle, toast, gesture |
| `guest.toast` | engång | 3,75 / 3 / 2 | sitter (eller står) | — | seatedIdle, gesture, lean, eat |
| `guest.tasteApprove` | engång | 3,75 / 3 / 2 | sitter | — | seatedIdle, gesture |
| `guest.gesture` | loop | 3,75 / 3 / 2 | sitter (eller står) | — | gesture, lean, seatedIdle, toast, eat |
| `guest.lean` | loop | 5 / 4 / 2,65 | sitter (eller står) | — | lean, gesture, seatedIdle, toast |
| `guest.waveStaff` | engång | 2,75 / 2,2 / 1,45 | sitter | — | seatedIdle, order, pay |
| `guest.riseGreet` | engång | 5,5 / 4,4 / 2,95 | sitter → står → sitter | — | seatedIdle, gesture, readMenu |
| `guest.pay` | engång | 3,75 / 3 / 2 | sitter | — | seatedIdle, leave |
| `guest.leave` | engång | 3,25 / 2,6 / 1,75 | sitter → står | — | walk |
| `rocket.cutHand` | engång | 4,25 / 3,4 / 2,25 | står → skadad | R flaska → — | holdHand |
| `rocket.holdHand` | loop | 2,5 / 2 / 1,35 | skadad | — | holdHand, walk |
| `rocket.smellWine` | engång | 5 / 4 / 2,65 | sitter | — | waveStaff, seatedIdle |
| `rocket.askPointMenu` | engång | 5 / 4 / 2,65 | sitter | R meny → L meny | order, seatedIdle, askPointMenu |
| `rocket.walkToKitchen` | G | 1,25 / 1,05 / 0,95 | går | — | walkToKitchen, idle |

Händelserna (grepp, släpp, överlämning, byte av hand, klink, kork, upplagt, ringklocka, betalning, skärsår) står i `CLIPS[id].events` med sin plats i klippet (0..1). `eventTime(id, typ, tempo)` ger sekunderna. `validateClips()` kontrollerar att varje efterföljare finns och att slutläget passar nästa klipps början. Resultat: inga fel.

## 5. Samspelen

| Samspel | Vilka | Det som måste stämma |
|---|---|---|
| `order` | servitör, gäst | Gästen tittar upp när servitören lyfter blicken. Menyn går från gästens vänstra hand till servitörens högra. |
| `passHandoff` | kock, servitör | Tallriken ligger på passet 0,35 s innan servitören tar den. |
| `wineService` | sommelier, värd | Värden tar glaset 0,3 s efter att flaskan rätats upp. |
| `toast` | gäst, gäst | Klinket sker i samma bildruta för båda. |
| `talk` | gäst, gäst | De byter tur samtidigt. |
| `dodge` | bärare, personal | Den som inte bär väjer när avståndet är 1,6 m. |
| `payment` | servitör, gäst | Gästen betalar när mappen ligger på bordet, innan servitören tar den igen. |
| `dishHandoff` | servitör, diskare | Tallriken byter hand i en bildruta. |

`checkInteractions()` mäter alla synkpunkter i de tre tempona: 0 av 21 utanför toleransen (0,06 s).

## 6. Rekvisitan och handpunkterna

Nollpunkten ligger mitt på undersidan, och fästpunkten är den punkt som ligger i greppet. Måtten nedan är uppmätta med `measureProp()` och räknar in fyllningen. Alla 17 stämmer med `CATALOGUE` inom 2 mm, och undersidan ligger på y = 0.

Tallrik 0,27 × 0,055 × 0,27 · assiett 0,17 × 0,041 × 0,17 · djup tallrik 0,23 × 0,052 × 0,23 · vinglas 0,086 × 0,21 · vattenglas 0,074 × 0,11 · vinflaska 0,077 × 0,30 · vattenflaska 0,07 × 0,267 · karaff 0,13 × 0,26 · bricka 0,40 × 0,02 · gaffel 0,188 · kniv 0,22 · sked 0,18 · servett 0,12 × 0,014 · tårta med ljus 0,30 × 0,213 · menykort 0,22 × 0,31 · beställningsblock 0,08 × 0,11 · notamapp 0,11 × 0,21 (m).

Greppen i `HANDPOINTS` är tallrik, bricka, glas med fot, glas utan fot, flaska, hals, bestick, servett, kort och tårta med två händer. Uppmätt vid normalt tempo: handankaret på 1,12 m när servitören bär en tallrik och brickan på 1,33 m.

Färgerna följer `figureProps.ts` §2: det som ligger mot kroppen hör till det ljusa kontrastfönstret. Flaskan är mörk, men den har en ljus etikett och en kapsyl i mässing, så att den syns i handen. Menykortet, blocket och notamappen tillkommer utöver beställningen, eftersom raketerna och beställningen behöver dem.

## 7. Kontroll

**Bilder** (1440 × 900, graderade, ingen text):
- `servering-01 … 11` från spelets kamera (fov 42°, lutning 50°, 24 m), i tidsordning: gästerna kommer in, menyn, beställningen, köket lägger upp, värden smakar, passet, mötet i gången, serveringen, skålen, notan och gästerna som går.
- `raket-01 … 04` från spelets kamera, och samma ögonblick på 9 m (`-nara`): bartendern skär sig, värden luktar på vinet och ställer ned glaset, gästen vid bord 4 frågar om soppan och pekar i menyn, och en gäst går mot köket.
- `tempo-01, 02`: samma klipp i lugnt, normalt och stressat tempo bredvid varandra (bär bricka och häller). Samma lutning, 8,5 m.
- `sitsen-01, 02`: gästen på väg ned och gästen som landar på stolen.
- `rekvisita-01`: alla föremål på bordet, med en servitör och en sommelier som visar skalan och greppen.

**Video.** `servering-bord-4.webm` visar en hel servering vid bord 4. Paret kommer in och sätter sig. Sedan följer menyn, beställningen, köket som lägger upp och sommeliern som visar, öppnar och låter värden smaka. Därefter kommer passet, mötet i gången och serveringen av två tallrikar. Sommeliern häller, gästerna äter och skålar, och sedan kommer notan. Videon slutar när paret går. Samtidigt spelar rummet vidare: bartendern, kocken, diskaren, en andra servitör som dukar av och fyra bord med gäster. Kameran har spelets lutning men står på 14 m, så att klippen går att se. Bilderna visar samma rum på 24 m.

## 8. Behövs från sim-lagret

- **En uppgift per anställd.** Vad hen bär, varifrån och vart (FRÅGOR §1–2 i `figureRig.ts`). Utan det kan presentationslagret inte välja mellan `carryPlate`, `carryTray` och `serve`.
- **En stol per sittande gäst.** `Seat` med position, riktning och sitshöjd, samt en regel för vad som händer när stolen saknas. Förslag: gästen står och väntar vid bordet (`staff.idle` med gästens utseende) tills stolen finns.
- **Raketernas utlösare pekar på en figur.** Varje raket behöver veta vem som gör något och vilket klipp som spelas först. Därefter kommer frågan. Kopplingen till raketkortets ring och bildtext görs i leverans 3.
- **Ägandet av föremålen.** Händelserna i klippen säger när något tas och släpps. Sim-lagret behöver hålla reda på vem som har vad, så att en tallrik inte finns på två ställen.

## 9. Frågor och gränser

- **Barstolar och loungesoffor** har andra sitshöjder och behöver egna sittklipp. De ingår inte. `canSit()` säger nej till dem i dag.
- **Grepp från bordet.** Ett föremål som tas hoppar till handen. Hoppet är högst 20 cm och syns inte på 24 m, men det syns på nära håll. Exakt grepp kräver en enkel arm-IK som inte ingår.
- **Glas på brickan** sitter fast i brickan med `setOnProp()`. Om brickan lutar lutar glasen med den, vilket är rätt. De glider inte.
- **Tårtans ljus** lyser av sig själva men kastar inget ljus. En punktljuskälla per tårta avgör rummen.
- **Videoformatet** är WebM (VP9). Det spelas i webbläsare och i VLC. Säg till om ni behöver MP4.
