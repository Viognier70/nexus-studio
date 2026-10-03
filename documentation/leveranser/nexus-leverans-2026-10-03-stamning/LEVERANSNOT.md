# LEVERANSNOT: gästernas stämning (D1)

**Datum** 2026-10-03
**Till** Claude Code, via dig
**Från** Claude Design
**Gäller** D1, tillägg till vardagens koreografi (`nexus-leverans-2026-10-01-vardagens-koreografi`). Gester, symboler, ansikten, mätaren i HUD:en och konsekvensögonblicket efter ett raketsvar. Code väntar på den här leveransen.

Regeln från 2026-09-30 gäller: rött och grönt betyder bara rätt och fel svar. Ingen stämning är röd eller grön, och ingen symbol pulserar (pulsen i ljuslåga är klockans och varmrätternas).

---

## 1. Innehåll

| Fil | Var | Vad |
|---|---|---|
| `figureClips.ts` | ersätter leveransen 2026-10-01 | 8 nya gestklipp (§2), typen `MoodId`, fältet `mood` på `ClipSpec` och `MOOD_GESTURES`. `validateClips()` ger inga fel. |
| `guestMood.ts` | ny, `src/sim/guests/` eller där Code vill | De fem lägena, symbolerna (sökvägar, färger, visningsregler, rörelser), `FACE`, `MOOD_METER`, `CONSEQUENCE` och nycklarna till balance.ts (`MOOD_BALANCE`). `moodSymbolSvg()` och `drawMoodSymbol()` ritar samma symbol som SVG och på en duk. |
| `figureFace.ts` | ny, bredvid `figureRig.ts` | Ansiktena: `attachFace(rig)` sätter ett tunt skal på huvudet, `set(mood)` byter uttryck, `update(camera)` tonar efter avståndet. Riggen ändras inte. |
| `handelserManus.js` | ersätter leverans 3 (felsluten 2026-10-02) | Beslut 2026-10-03: födelsedagens fel i steg 3 och kameran för gästen som vinglar (§11). |
| `stamningManus.js` | läses, monteras inte | Konsekvensögonblicket för födelsedagen (steg 3) och gästen som vinglar (steg 1), rätt och fel, plus gesterna, ansiktena och symbolerna som egna scener. Kamerans nyckelbilder, strålkastaren, symbolerna, ansiktena och mätaren som tidslinjer. |
| `moodStrings.ts` | slås in i `STRINGS` | 100 nycklar, `{ sv, en }`: lägena, HUD:en, gesterna och prototypens kapitel och syften. |
| `prototyp/Stamningen.html` | läses, monteras inte | Alla scener, SV/EN, båda skärmstorlekarna, tempo för gesterna, spelets kamera eller manusets, och *Spela in WebM*. three.js och Babel hämtas från nätet. |
| `bilder/1440x900/`, `bilder/1280x720/` | — | 29 kontrollbilder i varje storlek, utan text (§8). |
| `skarmar/1440x900/`, `skarmar/1280x720/` | — | Mätaren i HUD:en när stämningen stiger och sjunker. |

## 2. Gestklippen

Alla sittande, på stol, barstol och lounge (`reseat` lägger om dem). **Tempot är styrkan**: lugn är en antydan, normal det vanliga och stressad en gest som läses från 24 m. Längderna kommer ur `def()` som för de andra klippen.

| Klipp | Stämning | Det man ser | Normal | Händer |
|---|---|---|---|---|
| `guest.leanCurious` | nöjd | lutar sig fram mot det som händer, underarmarna mot knäna, huvudet på sned | 3,2 s | — |
| `guest.laugh` | glad | huvudet bakåt, axlarna som studsar, en hand mot bröstet, sedan framåt och tillbaka | 2,4 s | — |
| `guest.cheers` | glad | glaset över huvudhöjd mot bordets mitt, ingen klunk | 3,4 s | grab, clink, release (R) |
| `guest.nodApprove` | nöjd | två långsamma nickar med öppen handflata mot den som gjorde något | 2,2 s | — |
| `guest.armsCrossed` | missnöjd | loop: armarna i kors, bålen bakåt, blicken bort från det som stör, en suck per varv | 4 s | — |
| `guest.checkWatch` | väntar | handleden upp, blicken på klockan och sedan ut efter personalen | 2,6 s | — |
| `guest.waveWaiter` | otålig | armen rakt upp, halvvägs upp från sitsen, stora svep | 2,8 s | — |
| `guest.pushPlate` | missnöjd | rak arm som skjuter tallriken ifrån sig, sedan armarna i kors | 3 s | grab, release (R) |

- `guest.cheers` är inte `guest.toast` (skålen och klunken). `guest.waveWaiter` är inte `guest.waveStaff` (fingret upp, *vi vill beställa*). De gamla klippen är kvar.
- `MOOD_GESTURES` säger vilka gester som hör till varje läge, i den ordning sim-lagret väljer. Väntar har en gest, `checkWatch`. Otålig har `waveWaiter` och `checkWatch` i stressat tempo.
- Stående gäster i kön har redan sina klipp (`queueCalm`, `queueImpatient`, `queueLeaving`).

## 3. Symbolerna

Fem symboler på en rund bricka, **24 px på skärmen** oavsett kamerans avstånd. Figuren skiljer lägena åt, inte färgen, och brickorna är i två grupper:

| Läge | Bricka | Kant | Figur |
|---|---|---|---|
| Glad | guld `#e8b93a` | bläck | två gnistor |
| Nöjd | papper `#f5ead5` | bläck | hjärta |
| Väntar | skuggat papper `#e9d9bc` | bläck | timglas med sanden kvar uppe |
| Otålig | valnöt `#3a281c` | mässing `#f0cd82` | väckarklocka |
| Missnöjd | valnöt `#1a120d` | mässing | moln med regn |

- **Kvällsljus och dagsljus:** de ljusa brickorna har en mörk kant och en svag ljusgloria, så de syns mot det ljusa golvet på dagen. De mörka har mässingskant, så de syns i det dämpade kvällsljuset. Samma brickor i båda ljusen (`symboler-1`, `symboler-2`).
- **Var:** över dynornas mitt i loungen (1,75 m), över bordets mitt vid småborden (1,6 m) och 0,42 m över hjässan på en ensam gäst vid baren eller i kön (`MOOD_SYMBOL.anchor`). Två symboler som skulle överlappa flyttas isär med minst 4 px, och den senast ändrade ligger överst.
- **När:** väntar, otålig och missnöjd syns alltid, eftersom något behöver göras. Glad och nöjd syns i 4 s efter att läget ändrats och tonas sedan ut.
- **Rörelsen** följer svarsraderna: när läget blir bättre lyfter symbolen 6 px med en liten överskalning, och när det blir sämre skakar den 4 px tre gånger. Den pulserar aldrig.

## 4. Ansiktena

Fem uttryck i bläck på huvudets framsida, under kalotten: nöjd (prickar och ett litet leende), glad (hopknipna ögon och öppen mun), väntar (blicken åt sidan och rak mun), otålig (raka bryn och en mun som drar åt sidan) och missnöjd (bryn som sluttar inåt och en mun som går nedåt). Uttrycket byts samtidigt som gesten börjar.

**När de tänds:** från **9 m** mellan kameran och huvudet tonas de in, och vid **7 m** är de fullt synliga (`FACE`, `faceOpacity()`). Vid 7 m är huvudet 32 px högt i 1280 × 720 och 40 px i 1440 × 900. Spelets 24 m och raketens 10–14 m visar alltså aldrig ansikten. Där bär gesterna och symbolerna stämningen. Personalen har alltid uttrycket nöjd.

Kameran sänks till 35–40° när den går in, annars ser man bara hjässan. Ansiktena syns bäst från södra vinkeln (`SOUTH` i manuset), eftersom loungerna och de norra barstolarna vänder sig mot söder.

## 5. Mätaren: Stämningen i rummet

I HUD:ens översta rad, till höger om kassan, i samma trä och mässing (`MOOD_METER`, `skarmar/`). Rutan har etiketten, symbolen för rummets läge med ordet för läget, och ett spår i fem steg med en fyllning i guld. **Inga siffror.**

- När stämningen stiger växer fyllningen på 0,9 s och lyser upp en stund, och symbolen lyfter.
- När den sjunker krymper fyllningen, och det som förlorades står kvar **streckat** i 1,6 s (som fel i den varma formen) innan det tonas ut. Symbolen skakar.
- Mätaren ändras alltid **efter** symbolerna över borden, så att spelaren ser orsaken först.
- Värdet är medelvärdet av gästernas stämning per sällskap. Gränserna mellan lägena ligger i balance.ts (`MOOD_BALANCE.threshold`). Prototypen använder 0,8 / 0,6 / 0,4 / 0,2 som platshållare.

## 6. Konsekvensögonblicket

De 3,8 sekunderna efter att svaret låses, räknat från samma ögonblick som `WARM_RIGHT_WRONG.motion`. Kortet står kvar till vänster med förklaringen (3,5–32,5 % av bredden), så det som reagerar ramas mellan 36 och 96 %: ett bord på 62 %, två grannbord på 69–72 % (`CONSEQUENCE.frameX`).

| Tid | Rätt | Fel |
|---|---|---|
| 0–0,45 s | kortet blir grönt och lyfter, kameran står kvar på raketens 12–13 m | kortet blir rött och skakar, kameran står kvar |
| 0,45–1,45 s | kameran går in till **7 m** i en mjuk båge (12°) och sänks till 35° | från 0,6 s rakt in till 7 m, ingen båge, 40° |
| 0,6 s → | gästerna börjar sina gester, närmast händelsen först, 0,18 s mellan dem; ansiktena byter uttryck | samma |
| 1,1 s | symbolerna över borden byts: lyfter | byts: skakar |
| 1,25 s | mätaren stiger | mätaren sjunker, det förlorade står streckat |
| 1,45–2,3 s | kameran står still på 7 m, ansiktena syns | samma |
| 2,3–3,8 s | kameran går långsamt in till **5,5 m** (tillägg, §11) | samma |
| 3,8–4,8 s | efter ögonblicket: tillbaka till 24 m, ansiktena slocknar på vägen | samma |

Strålkastaren och kortet ligger kvar till 3,8 s och tonas ut på 0,5 s. Efter återgången fortsätter händelsens slut som i manuset.

### Födelsedagen, steg 3 (musiken)

*Frågan:* sällskapet i lounge A vill sjunga för Karin. Grannarna i lounge B äter. Kameran är på 13 m från södra sidan.

- **Rätt:** Elin går med fördrinken till grannarna. Värden skålar, Karin och vännen skrattar, grannen i B1 lutar sig fram nyfiket och grannen i B2 nickar. Lounge A går från väntar till glad, och B stannar på nöjd. Mätaren stiger.
- **Fel:** Per pekar mot DJ:n och musiken går upp på 0,6 s. Sällskapet sjunger och skålar (glad), men B1 lägger armarna i kors, B2 vinkar efter servitören och tittar sedan på klockan, och gästen på bar4 tittar på klockan. Lounge B blir missnöjd och baren otålig. Ett bord blir gladare och två blir missnöjda, så mätaren sjunker.

### Gästen som vinglar, steg 1

*Frågan:* gästen från bar3 står mellan baren och loungen och vill ha ett glas till. Kameran är på 12 m från södra sidan, så att ansiktena vid de norra barstolarna och i lounge A syns när kameran går in.

- **Rätt:** Mira lutar sig fram och pratar lugnt med hen, och Sara går vidare med brickan. Bar2 och bar1 nickar, bar4 och lounge A2 lutar sig fram. Baren och lounge A går från väntar till nöjd. Mätaren stiger.
- **Fel:** Mira häller upp ett glas till, och gästen blir glad. Bar2 lägger armarna i kors, bar4 tittar på klockan, bar1 skjuter undan tallriken, lounge A2 vinkar efter servitören (vill betala) och A1 lägger armarna i kors. Baren blir missnöjd och lounge A otålig. Mätaren sjunker.

## 7. Till sim-lagret

- **Gästens stämning** är ett värde 0..1 per gäst. Läget kommer ur `MOOD_BALANCE.threshold`. Ett raketsvar flyttar de gäster som såg det med `{gain}` eller `{loss}` inom `witnessRadiusM`, och väntan utan att någon kommer sänker värdet med `{decay}` per spelminut. Alla värden är Codes.
- **Gesten** väljs ur `MOOD_GESTURES[läge]` när läget ändras, och därefter då och då i luckorna (samma princip som personalens små stunder). Tempot följer hur långt in i läget gästen är: lugn just över gränsen, stressad långt in.
- **Ansiktet** följer gästens läge. `attachFace()` en gång per figur, `set()` vid byte, `update(camera)` varje bildruta efter `applyPose`.
- **Konsekvensögonblicket** är en mall, som ritualerna i `serviceRituals.ts`. Sim-lagret säger vilka gäster som påverkas, och presentationen tar kamerabanan, ordningen och tiderna från `CONSEQUENCE`.

## 8. Kontrollbilder

Från spelets kamera (24 m), raketens (12–13 m), konsekvensögonblicket (7 m) och ansiktena (6,5 m), i 1440 × 900 och 1280 × 720 och utan text. Kortets plats till vänster syns inte i bilderna, bara i prototypen och i `skarmar/`.

- `fodelsedagen-ratt-1-13m-fragan`, `-2-7m-skratt-och-skal`, `-3-24m-tillbaka`
- `fodelsedagen-fel-1-10m-kameran-gar-in`, `-2-7m-armarna-i-kors`, `-3-5.5m-narbild`
- `vinglar-ratt-1-12m-fragan`, `-2-7m-grannarna-nickar`, `-3-5.5m-narbild`
- `vinglar-fel-1-7m-lounge-a-vinkar`, `-2-7m-tallriken-undan`
- `gester-1-24m-alla-atta`, `-2-12m-alla-atta`, och en per gest på 10 m: `-3-skratta`, `-4-skala`, `-5-luta-sig-fram`, `-6-nicka-gillande`, `-7-armarna-i-kors`, `-8-skjuta-undan-tallriken`, `-9-titta-pa-klockan`, `-10-vinka-efter-servitoren`
- `ansikten-0-11m-inga-ansikten`, `-1-6.5m-nojd`, `-2-glad`, `-3-vantar`, `-4-otalig`, `-5-missnojd`
- `symboler-1-24m-kvallsljus`, `-2-24m-dagsljus`
- `skarmar/`: `hud-1-matare-stiger`, `hud-2-matare-sjunker`

## 9. Att se över

- **Födelsedagens fel i steg 3:** i manuset från leverans 3 går Elin till DJ:n och musiken kommer upp 7 s efter svaret. I konsekvensögonblicket pekar Per direkt mot DJ:n, så att reaktionen kommer inom 3,8 s. Förslag: ändra manuset på samma sätt.
- **Raketens vinkel för gästen som vinglar** byts till den södra, som i loungen. Med den gamla vinkeln (från norr) har barstolarna ryggen mot kameran och ansiktena syns inte när kameran går in.
- **Ansiktena är små** även på 7 m (32–40 px huvud). Om de ska läsas längre ut behövs ett större huvud i närbild, inte större drag.
- **Mätarens bredd:** klockan, kassan och mätaren är tillsammans cirka 1015 px i 1280 × 720. Det får plats, men bandet med rivalerna under raden blir inte bredare.
- **Dagsljuset** i prototypen är en ljusare variant av teaterns ljus, eftersom DayLighting äger ljuset i spelet. Symbolerna är granskade mot båda.

## 10. D2–D4

- **D3, byn i kvällsljus:** de fyra rättelserna (ingången som data, en bredare bynivå, ett ljusare och justerbart ljus och taket som tas bort på krognivån) är levererade 2026-10-02 i `nexus-leverans-2026-10-02-byn-omtag-2`. Ingenting nytt här.
- **D2, öppningen:** pågår, nästa leverans.
- **D4, gatans koreografi:** väntar på Codes svar i 302.

## 11. Tillägg efter godkännandet (2026-10-03)

D1 är godkänd. Besluten om §9:

- **Födelsedagens fel i steg 3** (`handelserManus.js`): Per ger DJ:n tecken direkt vid svaret, och musiken går upp 0,6 s senare. Elin står kvar med brickan, och glasen till grannarna blir aldrig serverade. Grannarna reagerar inom konsekvensögonblicket: B1 lägger armarna i kors och vinkar sedan på Per, B2 vinkar efter servitören och tittar på klockan. Per tar notan till lounge B som förut. Resten av slutet ligger 6,4 s tidigare, och scenen är 51,6 s i stället för 58 s.
- **Gästen som vinglar** (`handelserManus.js`): raketens kamera står i söder, som i loungen, både under frågan och efter felet.
- **Huvudena förstoras inte.** Kameran går i stället långsamt in från 7 till **5,5 m** under konsekvensögonblickets sista 1,5 s (2,3–3,8 s, `CONSEQUENCE.camera.closeFrom/closeTo/closeM`). Där är huvudet 41 px högt i 1280 × 720 och 51 px i 1440 × 900. Återgången till 24 m tar 1 s och ligger efter ögonblicket. Kontrollbilder: `fodelsedagen-fel-3-5.5m-narbild` och `vinglar-ratt-3-5.5m-narbild` i båda storlekarna.
- **Gränserna för stämningen** sätter Code i balance.ts (`MOOD_BALANCE`).
