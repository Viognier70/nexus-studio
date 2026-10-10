# ORDER 325 — Ansikten och gester (D11) (rapport)

*Anders 2026-10-10. Gren `order-325` från main `06dc137d`.*

Leveransen ligger oförändrad i `documentation/leveranser/nexus-leverans-2026-10-10-d11-ansikten-och-gester/`, uppackad ur `~/Downloads/Restaurant guest animation (44).zip`. Zipen innehöll bara den mappen, 99 filer.

## 1. Ansiktena, klippen och kartan

**Ansiktena** (`strategic/scene/figureFace.ts`, ersätter D1:s)
- Designs två skal med samma fem uttryck: det nära (ögon, bryn och mun som förut) och det långa (masken över hårfästet).
- Avvikelser från Designs fil:
  - `MoodId` kommer ur `guestMood.ts`, som förut.
  - Gränserna läses ur `balance.ts` `FACE_LOD` (§2), inte ur konstanter i filen.
  - Hyn läses med three:s typer i stället för `any`.
- D1:s gräns (ansiktena in från 9 m, helt synliga vid 7 m) är borttagen ur `guestMood.ts`.
- Ansikten sitter på:
  - gästerna och personalen i vinbaren och bistron (`WineBarFigures.tsx`, som förut);
  - gästerna och besättningen vid vagnen, som är nya (`village/PlayerTruckCrew.tsx`).

**Riggen.** `PoseHead.roll` (huvudet på sned) i `applyPose` och `blendPose` (`figureRig.ts`). `mirrorPose` (`figureClips.ts`) speglar lutningen som bålens, vilket Designs fil inte gjorde.

**Klippen** (`figureClips.ts`, avsnittet D11 sist, ur `d11Clips.ts`)
- 21 nya klipp. Leveransens 23 omfattar också `guest.checkWatchStand` och `guest.armsCrossedStand`. De två namnen har spelet redan för D9:s stående klipp i kön (ORDER 319b), så D11:s versioner med samma namn läggs inte in. D9:s gäller i kön som förut, vilket är det kartans alias pekar på.
- Klippen är nu 193 (`order286aTheatre.test.ts`).
- `ClipCtx.high` gäller ståbordet i `waiter.wipeTable`. Designs fil skrev `(c as any).high`.

**Kartan** (`strategic/scene/gestureMap.ts`)
- Designs fil, med talen i `balance.ts` `GESTURE_BALANCE`.
- Texterna ligger i `content/design/d11Strings.ts`, oförändrade.
- Gesterna följer kartan så här.

*Vinbaren och bistron* (`moodGestures.ts`, skrivs om; anropet i `WineBarFigures.tsx`)

| Situation | När | Klipp |
|---|---|---|
| Stämningens egna (`MOOD_MAP`) | Var `moodGestureEveryS` ± `moodGestureJitter` när gästen bara sitter, i tur och ordning per gäst | t.ex. nöjd: `guest.leanTalk`, `guest.nodApprove`, `guest.leanCurious` |
| `talking`, `joke` | Bara i sällskap om två eller fler; den som sitter ensam lutar sig inte fram och pratar | `guest.leanTalk`, `guest.laugh` |
| `waitedLong` | Gästen sitter utan att ha beställt (`Guest.state` 'seated') i `waitWatchS`, sedan var `watchEveryS` | `guest.checkWatch` |
| `waitedTooLong` | Efter `waitWaveS`, en gång | `guest.waveWaiter` |
| `firstBite`, `firstBiteGreat`, `dishBelow` | När klippet `guest.eat` börjar (rätten är framställd). Gesten tar över ätandet; det är det enda undantaget (kartans `quietWhileServed`). | `guest.nodFirstBite` (glad: stressat, tre nickar), eller `guest.pushPlate` |
| `wrongWitnessed` | Fel svar, gästen vid bordet eller som vittne (konsekvensögonblicket, i tur och ordning som förut) | `guest.armsCrossed` |

- Tempot är stämningens styrka (`MOOD_STRENGTH`). Förut var tempot hur djupt in i läget gästen var.
- En gest i taget per sällskap (`onePerParty`, `staggerS`).
- Ansiktet följer gesten (`faceFor`): situationens stämning medan gesten spelas.

*Personalen* (`theatreClips.ts`)
- Den som tar över en situation vid bordet (`handle`) lyssnar med lutat huvud (`staff.listenTilt`). Förut skrev den på blocket (`waiter.takeOrder`).
- Avtorkningen av ett tomt bord (`wipeTable`, ORDER 293) spelar Designs nya `waiter.wipeTable`.

*Vagnen* (`PlayerTruckCrew.tsx`)
- Vid luckan, när medhjälparen är ute: gästen vinkar (`guest.waveStand`), och grillaren vänder sig och lyssnar (`staff.listenTilt`).
- I kön rycker gästerna på axlarna när korven tar slut (ft11, `guest.shrugStand`).
- Den nyfikna som fick "nästan" tvekar, rycker på axlarna och tvekar igen. Förut tittade hen på klockan i mitten.
- Vid ståborden:
  - första tuggan med en nick (`guest.nodFirstBiteStand`), när stämningen är nöjd eller glad;
  - prat och skratt mellan tuggorna när fler står vid samma bord (`guest.leanTalkStand`, `guest.laughStand`).
- Nils torkar ståbordet med `waiter.wipeTable` i ståbordshöjd. Rundans tid är som förut.

**Det simuleringen inte vet**
- *Betyget per rätt.* Simuleringen har inget betyg per rätt. `pushPlateBelow` (0,4) läser därför gästens stämning vid första tuggan, på samma skala som stämningens gränser.
- *Situationerna utan signal.* Det finns ingen signal för `readyToOrder` med "ingen personal inom synhåll", `ordering`, `winePoured`, `drinksArrive`, `twoOrMore`, `pour` eller `seatParty` vid bordet. De spelas inte av kartan; spelets egna klipp (beställningen, upphällningen, brickan, värdens pekning) gäller som förut.
- *Halvt grepp i vinbaren.* `halfGrip` i vinbaren (D8) kräver halvt grepp i konsekvensögonblicket, och det ögonblicket bär bara rätt eller fel.

## 2. Kamerans avstånd vid Krogen (Z) och gränserna

**Mätningen** (`frontend/scripts/order325-check.mjs`, utdata `frontend/reports/order325/kamera.json`, fälten `places.<plats>[].atZ` och `.at10`)
- Produktionsbygget, i spelarens flöde: sparfilen måndag vecka 2, servicen öppnad som spelaren gör, 4×, tangenten Z.
- `camDistance`, `camTarget` och `camFov` är kamerans egna (`CameraController.tsx`).
- Avståndet till varje synligt huvud räknas som `figureFace.ts` `update()` räknar det, alltså samma tal som tonar skalen. `faceProbe.ts` skriver det i `body.dataset.faceDist` och `faceDistTruck`.

| Plats | Kameran vid Z | Huvudena (min, median, max) | Nära / långt visas |
|---|---|---|---|
| Vinbaren | 24 m, synfält 42° | omkring 20,5, 26,4, 28,0 m | 0 / alla |
| Bistron | 24 m | 20,5, 24,4, 25,4 m | 0 / alla |
| Vagnen | 12 m | omkring 8,9, 11,5–11,8, köns och byns bortre upp till 48 m | båda tonar över |

Exakta tal per storlek står i `kamera.json`. På 10 m (zoomat in med knappen till kamerans minsta avstånd) visar vinbaren och vagnen båda skalen.

**Gränserna** (`sim/balance.ts` `FACE_LOD`)
- Designs värden står kvar:
  - det nära skalet helt till 9 m och borta vid 12 m;
  - det långa in från 9 m, helt från 12 m, och ut mellan 30 och 42 m.
- Mätningen visar att de räcker:
  - Vid Z i vinbaren och bistron ligger alla huvuden inom 20,4–28,0 m. Där är det långa skalet helt och det nära borta. Marginalen till 30 m är 2 m.
  - Vid vagnen (12 m) ligger huvudena i övergången mellan skalen. Uttrycket är detsamma i båda, så inget hoppar.
  - Gatans nivå (42 m) har inga ansikten.
- Designs tolkning (leveransnotens öppna punkt 4: Z är 24 m) stämmer för vinbaren och bistron. För vagnen är Z 12 m (`truckCamera.ts`).
- Testet `order325AnsiktenGester.test.ts` låser att avstånden vid Z ger det långa skalet helt.

## 3. Gatan: de sex gångsätten

- Gatans figurer är instansade (`VillageLife.tsx`), och riggens klipp går inte att spela på instanser.
- De som står närmast kameran ritas nu med riggen, högst 18 och inom 45 m från kamerans mål, när kameran är närmare än 60 m. Gatans nivå (42 m) räknas dit. Deras instanser döljs; de andra går som förut (`streetGait.ts`).
- Modulen heter `strategic/scene/village/streetGaits.ts`.

| Gångsätt | Klipp | När |
|---|---|---|
| Lugn | `street.walkCalm` | Förvalet, 0,85 × sällskapets fart |
| Brådskande | `street.walkHurried` | I regnet och när kvällen har gått längre än `hurryFromE` (0,8), 1,45 × |
| Med barn | `street.walkWithChild` och `street.childWalk` | Barnet på den vuxnas vänstra sida, hand i hand. Sällskap om två eller fler, andelen `childShare` (fler på dagen), 0,7 × |
| Med hund | `street.walkWithDog` | Hunden 0,95 m före och 0,3 m åt höger, med kopplet. Andelen `dogShare`, inte i regnet, 0,9 × |
| Stanna och titta | `street.stopLook` | Pauserna vid en annan krogs meny och de där någon pekar (ORDER 302). Sannolikheten och avståndet står nu i `GESTURE_BALANCE` (`stopLookP` 0,3, `stopLookRadiusM` 9, samma som förut). |
| Hälsa | `street.greet` | Två ur byn som går förbi varandra inom `greetRadiusM` (4 m) nära kameran stannar med sannolikheten `greetP` och hälsar; den andra börjar 0,25 s efter |

- Sällskapens pauser för prat spelas stående (`guest.leanTalkStand`).
- Hunden är byggd i kod: 0,62 × 0,24 m, mankhöjd 0,54 m.
- Gatans riggar har kvällens ljusgolv som gatans figurer (`withStreetFloor`).

**Mätningen på gatans nivå** (`kamera.json` `street`; kameran 42 m, nivån `street`)
- Under fyra minuter av kvällen spelade riggarna lugn gång, med barn (och barnets gång), med hund, stanna och titta, och hälsa.
- Brådskande syns först sent på kvällen eller i regn, och kom inte med i fönstret. Regeln prövas i testet.
- Bilder: `kontroll-gatan-X-1…4-1280x720.png`. På 42 m är figurerna små.

## 4. Kontrollbilderna

I `frontend/reports/order325/`:
- `kontroll-vinbaren-Z-1280x720.png`, `kontroll-vinbaren-10m-1280x720.png`, `kontroll-vinbaren-Z-1024x600.png`, `kontroll-vinbaren-10m-1024x600.png`;
- `kontroll-vagnen-Z-1280x720.png`, `kontroll-vagnen-10m-1280x720.png`, `kontroll-vagnen-Z-1024x600.png`, `kontroll-vagnen-10m-1024x600.png`.

Inga sidfel (`kamera.json` `errors`). Bistron mäts men har inga bilder.

- Vid Z är huvudena 9–12 px. Ansiktet syns som Design beskriver: öppen mun, mörka bryn och munnens riktning.
- Bara de som vänder ansiktet mot kameran visar det. Vid vagnen står kön med ryggen mot kameran mot luckan, och medhjälparen i luckan visar ansiktet.
- Köns armar framåt vid vagnen är köns klipp från förut (samma i `reports/order320/`).

## Tester

- `src/strategic/scene/__tests__/order325AnsiktenGester.test.ts`, 16 tester:
  - gränserna och avstånden vid Z;
  - klippen och huvudets lutning;
  - personalens klipp;
  - kartan och texterna;
  - situationerna i vinbaren (klockan, vinkningen, första tuggan, tallriken, ensam eller i sällskap, fel svar);
  - gatans gångsätt och andelar.
- `order286aTheatre.test.ts`: 193 klipp.
- Hela sviten: 2 766 gröna, 1 förväntat fel, 19 överhoppade. Typecheck och bygget är gröna.

## Öppet

- *Blicken mot kameran.* Leveransnotens punkt 2 föreslår att sittande gäster lyfter blicken 0,15 rad när kameran är längre bort än 12 m, så att fler ansikten syns från 24 m. Det är inte gjort, och Anders beslutar.
- *Situationerna utan signal.* De sju situationerna i kartan som simuleringen saknar signal för (se §1) kräver att simuleringen får den signalen.
- *Halvt grepp i vinbaren* kräver att konsekvensögonblicket bär halvt grepp.
- *Kameran vid vagnen.* Mätningen gäller en solig kväll med kortläsarens situation, och skalens övergång ligger vid vagnens 12 m. Vill Anders ha det nära skalet helt vid vagnen, behöver `FACE_LOD.near.fullUntilM` upp till omkring 12 m.
