# D11: ansiktsuttryck och gester

**Leverans** 2026-10-10, tillägg samma dag (§7), omtag 2026-10-11 (§7) · **Till** Claude Code · **Från** Claude Design · **Beställning** `uploads/BRIEF_DESIGN_D11_ANSIKTEN_OCH_GESTER.md` (Anders 2026-10-09) · **Byggs in** i en senare order. ORDER 323 §6 (gångrörelse i byn, bilarnas körning) påverkas inte.

Syftet är att spelaren ska kunna läsa gästerna (phronesis) utan symboler. Leveransen gäller vinbaren och foodtrucken. Kontrollbilderna finns i 1440 × 900 och 1280 × 720, och det står ingen text i bilderna. All text är nycklar `{ sv, en }`. Inga speltal: tider och sannolikheter är nycklar i `GESTURE_BALANCE` (balance.ts).

## 0. Det som redan fanns

En stor del av briefen fanns sedan tidigare. D11 bygger på det och ändrar det inte.

- **Ansikten:** fem uttryck i `figureFace.ts` (D1, 2026-10-03). Där tändes de först under 9 m. Nu syns de också på krogens nivå (§1).
- **Gäster:** vinka till servitören (`guest.waveStaff`, och `guest.waveWaiter` för otålig), titta på klockan, skratta, skåla (`guest.cheers`), lukta på vinet och peka i menyn (förut raketklipp), knuffa undan tallriken och korsa armarna.
- **Personal:** bära bricka, hälla upp, torka av vid baren, lyssna och peka.

**Nytt i D11:**

- Ansiktet på långt håll.
- Fyra gäster: luta sig fram och prata, rycka på axlarna, nicka efter första smaken, och vinka stående.
- Stående varianter för vagnen.
- Lyssna med lutat huvud, och torka av ett bord.
- Gatans sex klipp.
- Kartan.
- Huvudets lutning i riggen.

| Fil | Vad |
|---|---|
| `figureFace.ts` | **Ersätter D1:s.** Två skal (nära och långt) med samma fem uttryck i kantig form. API:t är detsamma: `attachFace`, `set`, `update` och `faceCanvas`. `update` ger nu `{ near, far, distM }`. |
| `figureClips.ts` | Hela filen med avsnittet D11 sist: 25 nya klipp (23 och de två i tillägget). |
| `d11Clips.ts` | Utdrag av avsnittet D11, så att det går att läsa för sig. Samma kod som i `figureClips.ts`. |
| `figureRig.ts` | `PoseHead.roll`: huvudet på sned. Ändrat i `applyPose` och `blendPose`, men ingen ny nod. |
| `gestureMap.ts` | **Ny.** Kartan: stämningens egna gester, 29 situationer, reglerna, `pickGesture()` och nycklarna i balance.ts. |
| `d11Manus.js` | Tidslinjerna för prototypen (samma format som `stamningManus.js`) och vagnens och gatans platser (`TRUCK_SET`). |
| `d11Strings.ts` | 175 nycklar. |
| `prototyp/D11 - Ansikten och gester.html` | Prototypen med sex skärmar. Symbolerna är av från början och kan slås på. Luppen visar huvudena i skärmens egna pixlar. |
| `kontrollbilder/1440x900/`, `kontrollbilder/1280x720/` | 47 kontrollbilder per storlek. |

## 1. Ansiktena på krogens nivå

**Mått:** på 24 m är huvudet 9 px högt i 1280 × 720 och 12 px i 1440 × 900. Huvudena förstoras inte (beslut 2026-10-03).

**Problemet:** spelets kamera lutar 50°, så mitten av det kameran ser på huvudet ligger 40° från hjässan, inne i håret. D1:s mun låg 70° från blicken och försvann helt i förkortningen.

**Två skal, samma uttryck** (`FACE_D11`):

- **Nära** (helt synligt under 9 m, borta vid 12 m) är D1:s ansikte på samma plats. Formen är nu kantig: fyrkantiga ögon, raka streck och inga rundade ändar.
- **Långt** (från 9 m, helt synligt från 12 m, tonas ut mellan 30 och 42 m) är en mask i hudens färg som ligger över hårfästet. Masken har radien 1,045, utanför kalotten som har 1,03. Den flyttar ansiktet 26° uppåt, så att ögonen ligger 18° och munnen 43° från blicken. Uttrycken är förenklade till tre block med tjocka streck. På 24 m motsvarar en skärmpixel 23 px på duken, så ögonen är 32 px stora och strecken 20–24 px.
- Mellan 9 och 12 m tonar skalen över i varandra. Uttrycket är detsamma i båda, så inget hoppar. Ansiktet byts samtidigt som gesten (`swapMs` 120).

**Det som syns på 24 m** (bild 01, med luppen):

- glad: en öppen mun, det mörkaste blocket lågt i ansiktet
- otålig och missnöjd: mörka bryn
- munnens riktning: uppåt för nöjd, nedåt för missnöjd

Nöjd och väntar går inte att skilja åt på ansiktet från 24 m. Där är det kroppen som visar skillnaden (§5). På 14 m (raketens avstånd, bild 02) går alla fem att skilja åt.

**Gränsen:** bara de gäster som vänder ansiktet mot kameran visar det. Vid ett bord för två sitter gästerna med sidan mot kameran. Gesterna är därför fortfarande det som bär stämningen från 24 m, och ansiktet förstärker dem.

## 2. Gästernas gester (bild 05–16)

Tempot är gestens styrka: lugnt tempo ger en antydan, stressat en gest som läses från 24 m (`moodK`). Den stående varianten är samma pose med `ctx.seated = false`.

| Briefen | Klipp | Stämning | Stående |
|---|---|---|---|
| Vinka till servitören | `guest.waveStaff` (finns), `guest.waveWaiter` (otålig, finns) | nöjd / otålig | `guest.waveStand`, `guest.waveWaiterStand` |
| Titta på klockan | `guest.checkWatch` (finns) | väntar | `guest.checkWatchStand` |
| Luta sig fram och prata | **`guest.leanTalk`** | nöjd | `guest.leanTalkStand` |
| Skratta | `guest.laugh` (finns) | glad | `guest.laughStand` |
| Skåla | `guest.cheers` (finns) | glad | – |
| Lukta på vinet | `guest.smellWine` (förut `rocket.smellWine`) | ändrar inte stämningen | – |
| Peka i menyn | `guest.pointMenu` (förut `rocket.askPointMenu`) | nöjd | – |
| Knuffa undan tallriken | `guest.pushPlate` (finns) | missnöjd | – |
| Rycka på axlarna | **`guest.shrug`**: handflatorna upp, kroppen lyfts, huvudet på sned | väntar | `guest.shrugStand` |
| Korsa armarna | `guest.armsCrossed` (finns) | missnöjd | `guest.armsCrossedStand` |
| Nicka efter första smaken | **`guest.nodFirstBite`**: gaffeln till munnen, tugga, två nickar (tre och ett lyft när gästen är glad) | nöjd / glad | `guest.nodFirstBiteStand` |

**Namnen krockar:** D9:s `tillaggClips.ts` har stående klipp med samma namn som D1:s sittande, `guest.checkWatch` och `guest.armsCrossed`. D11 ger de stående klippen ett eget namn (`…Stand`). D9:s namn blir alias för dem i kön (`GESTURE_RULES.standingAlias`).

## 3. Personalen (bild 17–22)

| Briefen | Klipp |
|---|---|
| Bära bricka | `waiter.carryTray` (finns) |
| Hälla upp | `somm.pour`, `bar.pour` (finns) |
| Torka av | **`waiter.wipeTable`**: fram över bordet, två breda svep per varv. Med `ctx.high` för ståbordet på 1,05 m. `bar.wipe` gäller som förut vid baren. |
| Lyssna med lutat huvud | **`staff.listenTilt`**: huvudet 0,28 rad på sned mot gästen och bålen fram. Lutningen syns från 24 m, till skillnad från `staff.listen`. |
| Peka mot ett bord | `host.point` (finns) |

## 4. Vagnen (bild 23–32)

Det här är gesterna från vinbaren i stående varianter, på vagnens platser (ramen från D9 och D10):

- vid luckan: `guest.waveStand`, och grillaren svarar med `staff.listenTilt`
- i kön: klockan, armarna i kors och en axelryckning
- vid ståbord A: prat och skratt
- vid ståbord B: första tuggan och en nick
- vid ståbord C: Nils torkar av bordet med `ctx.high`

Vagnen och ståborden i prototypen är förenklade. Code har vagnen från D7 och D10.

## 5. Gatan (bild 33–40)

Gångarterna drivs av sträckan, som `guest.walk`. Farten sätts i manuset. Gatans nivå, 42 m, har inga ansikten (bild 34). Där syns farten, lutningen och vem man går med.

| Briefen | Klipp | Fart |
|---|---|---|
| Lugn | `street.walkCalm`: upprätt, korta armsvängar, blicken längs fasaderna | 0,85 × gästens gång |
| Brådskande | `street.walkHurried`: bålen fram, huvudet ned, pumpande armar | 1,45 × |
| Med barn | `street.walkWithChild` (den vuxna) och `street.childWalk` (barnet, heightMult 0,58, på den vuxnas vänstra sida, hand i hand) | 0,7 × |
| Med hund | `street.walkWithDog`: kopplet i höger hand, hunden 0,95 m före och 0,3 m åt höger, ett ryck i kopplet var tredje cykel | 0,9 × |
| Stanna och titta | `street.stopLook`: vänder sig mot det som syns (`ctx.yaw`), handen till hakan, pekar | – |
| Hälsa på någon | `street.greet`: handen högt på håll, ett steg fram (0,32 m), handslag och nick. Båda spelar klippet, den ena 0,25 s efter. | – |

Hunden i prototypen är en enkel modell med måtten 0,62 × 0,24 m och mankhöjden 0,54 m. Kopplet är 1,6 m.

## 6. Kartan (`gestureMap.ts`, bild 41–45)

- **`MOOD_MAP`:** för varje stämning finns ansiktet, de sittande och de stående gesterna, och vad som läses från 24 m. Gesterna väljs i tur och ordning per gäst, inte slumpvis.
- **`MOOD_STRENGTH`:** tempot per stämning. Glad, otålig och missnöjd har stressat tempo, så att de syns från 24 m.
- **`SITUATIONS`:** 29 situationer med utlösare, klipp, stående variant, stämning och prioritet. Några exempel:
  - Gästen tittar på klockan efter `{waitWatchS}` utan kontakt, och vinkar efter `{waitWaveS}` om personalen syns.
  - Första tuggan ger en nick.
  - En rätt under `{pushPlateBelow}` skjuts undan.
  - Halvt grepp (D8) och "nästan" på frågekortet (D9) ger en axelryckning, liksom när korven är slut (D10).
  - En gäst som såg ett fel svar korsar armarna.
  - Personalen lyssnar med lutat huvud när en gäst pratar med dem.
  - På gatan stannar man vid skyltar och upplysta fönster, och hälsar på bekanta.
- **`GESTURE_RULES`:**
  - Ansiktet följer gesten.
  - Ett sällskap gör en gest i taget, med 0,18 s mellan grannarna.
  - Medan gästerna serveras görs bara de gester som hör till serveringen.
  - Ordningen är raketens manus först, sedan situationen och sist stämningen.
  - Samma kväll ser likadan ut.
- **`pickGesture()`:** väljer gest för en gäst utifrån det sim-lagret vet.

I bild 41–45 är hela rummet i en stämning åt gången, från spelets kamera och utan symboler.

## Kontrollbilder (båda storlekarna)

| Bild | Vad den visar |
|---|---|
| 01–04 | Ansiktena på 24, 14, 9 och 7 m. Tio gäster som vänder ansiktet mot kameran, två per stämning. Inga gester. Luppen nere till vänster. |
| 05 | Gästernas elva gester från 24 m |
| 06–16 | Gesterna en i taget på 10 m, i briefens ordning |
| 17 | Personalen från 24 m |
| 18–22 | Bricka, hälla upp, torka av, lyssna med lutat huvud, peka mot ett bord |
| 23 | Vagnen från 16 m |
| 24–32 | Luckan, grillaren, kön (tre bilder), ståborden (tre bilder) och Nils som torkar |
| 33–34 | Gatan från 24 m och från gatans nivå, 42 m |
| 35–40 | Lugn, brådskande, med barn, med hund, stanna och titta, hälsa |
| 41–45 | Kartan: glad, nöjd, väntar, otålig och missnöjd från 24 m, utan symboler. 43 och 44 är tagna om, så att de visar blicken. |
| 46 | Söka personalens blick i vinbaren, på 10 m (lounge A, mot Sara) |
| 47 | Söka grillarens blick vid ståbord C, på 10 m |

Bild 05 och 23 är också tagna om, med den nya gästen i bilden. Bild 05, 23, 43, 44, 46 och 47 är tagna om igen 2026-10-11, med händerna stilla.

## 7. Tillägg samma dag: svaren på granskningen

**Beslut 2026-10-10:**

1. Regeln om 9 m ersätts av det förenklade ansiktet på avstånd (§1).
2. Inga gäster lyfter blicken mot kameran (`GESTURE_RULES.noCameraGaze`). I stället finns en ny gest: att söka personalens blick.
3. Code tar reda på kamerans verkliga avstånd vid Krogen (Z) och sätter gränserna i balance.ts.

**Söka personalens blick** (`guest.seekEye`, och `guest.seekEyeStand` vid vagnen):

- Huvudet vänds först mot servitören eller baren (`ctx.yaw`, hela vinkeln, u 0,04–0,20). Sedan rätas ryggen och hakan lyfts (0,3 rad, från u 0,16). Blicken hålls kvar i 3,2 s.
- **Omtag 2026-10-11:** händerna ligger kvar där de var under hela gesten. Förut lyftes höger hand från bordet, och den syntes före huvudvridningen och lästes som en halv vinkning. Handen kommer upp först i nästa steg (`guest.waveStaff`), som i `wantLadder`. Bålen följer huvudet med 0,3 av vinkeln (förut 0,4), så att det är huvudet som vrids.
- När gästen är otålig (stressat tempo) rycker hakan två gånger medan blicken hålls.
- Från 24 m syns en rak rygg och ett huvud som är vänt bort från sällskapet.
- Gesten hör till stämningarna väntar och otålig (`MOOD_MAP`), och till fyra nya situationer där gästen vill något:
  - `wantsOrder`: vill beställa, men personalen tittar inte hitåt
  - `wantsRefill`: vill ha mer i glaset
  - `wantsBill`: vill betala
  - `wantsHatch`: vid ståbordet, vill ha något från luckan
- **Stegen** (`GESTURE_RULES.wantLadder`): blicken först, efter `{seekEyeS}` handen (`guest.waveStaff`), och efter `{waitWaveS}` den stora vinkningen (`guest.waveWaiter`). Får gästen blickkontakt stannar stegen. Blickkontakt betyder att personalen vänder sig mot bordet, lyssnar med lutat huvud eller tar ett steg mot bordet. `readyToOrder` är nu andra steget, efter blicken.
- Blicken söks mot den närmaste i personalen som syns från platsen, annars mot baren (`seekEyeTarget`).

**Ansiktets gränser:** `FACE_LOD_BALANCE` i `figureFace.ts` har sex nycklar som Code sätter i balance.ts. Så länge de är null gäller prototypens värden: nära under 9–12 m, långt 9–42 m. Det långa ansiktet ska vara helt synligt på krogens avstånd (`farFullFromM` under det och `farFadeFromM` över det).

## Öppet

1. **Talen:** nycklarna i `GESTURE_BALANCE` (nu med `seekEyeS`) och `FACE_LOD_BALANCE` sätter Code i balance.ts.
