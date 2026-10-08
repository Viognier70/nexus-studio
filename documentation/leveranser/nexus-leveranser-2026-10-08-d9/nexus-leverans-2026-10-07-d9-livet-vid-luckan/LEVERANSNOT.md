# D9: livet vid luckan

**Leverans** 2026-10-07 · **Till** Claude Code · **Från** Claude Design · **Bygger på** D7 och tillägget (`nexus-leverans-2026-10-06-din-vag`, `…-2026-10-07-din-vag-tillagg`)

Livet runt spelarens vagn på Torget: de nyfikna med markeringen, de som äter, föremålen, fyra väder och en kväll från dagsljus till skymning. Vagnen står på spelets riktiga karta (`grythyttan-world.json`, utsnittet i `byKarta.js`) på D7:s plats [17,00, −21,90], och rivalen står på tilläggets plats [21,25, −12,75]. Kontrollbilderna är i 1440 × 900 och 1280 × 720, och ingen text är inritad i bilderna. All text är nycklar `{ sv, en }`. Talen som påverkar spelet (andelen nyfikna, gästflödet, priserna) är platshållare från balance.ts.

| Fil | Var | Vad |
|---|---|---|
| `curiousClips.ts` | läggs in i `figureClips.ts` | **Nya klipp:** `guest.slowDown`, `guest.readSign`, `guest.smellPoint`, `guest.hesitate`, `guest.joinQueue`, `guest.walkOn` och `truck.beckon` (§1). |
| `curiousMarker.ts` | monteras | **Ny.** Markeringen för en nyfiken gäst som går att prata med: bubblan, ringen, bågen, och vad klicket gör (§2). |
| `eatingClips.ts` | läggs in i `figureClips.ts` | **Nya klipp:** `guest.eatBun`, `guest.eatPlate`, `guest.drink`, `guest.wipeNapkin`, `guest.binNapkin`, `guest.leaveTable`, och vädrets `guest.warmHands`, `guest.shelter` och `guest.grabNapkin` (§3). |
| `truckProps.ts` | bredvid `playerTruck.ts` | **Ny.** De tolv föremålen i meter, ätplatserna och vägarna (§4). Flyttar skylten och sopkorgen från D7. |
| `truckWeather.ts` | monteras | **Ny.** Sol, regn, blåst och sval kväll (§5). |
| `truckEvening.ts` | bredvid `villageEvening.ts` | **Ny.** Ljuset, skuggorna och marschallerna över kvällen (§6). |
| `luckanStrings.ts` | slås in i `STRINGS` | 17 nycklar: markeringen, menyn, vädren och kvällens lägen. |
| `luckanPlats.json` | underlag | Alla punkter i vagnens och kartans ram, med avstånden till gator, hus och rivalen. |
| `prototyp/Livet vid luckan.html` | läses | Prototypen, fristående. Sex skärmar, båda storlekarna, svenska och engelska. |
| `kontrollbilder/1440x900/`, `kontrollbilder/1280x720/` | — | 23 kontrollbilder per storlek. |

Prototypen ritar uppifrån i 2D som D7. Det är en skiss av läsbarheten och inte teaterns 3D.

## 1. De nyfikna

En förbipasserande på gångvägen söder om vagnen kan bli nyfiken. Ordningen:

1. **Saktar in** (`guest.slowDown`, 1,40 s): farten går från 1,25 till 0,55 m/s och huvudet vrids mot röken. Markeringen tänds vid u 0,2 (`notice`).
2. **Går till skylten** (`guest.walk`, 0,7 m/s) och ställer sig på `readSpot` [−2,2, 4,15], vänd mot skylten.
3. **Läser skylten** (`guest.readSign`, 2,60 s): huvudet framåt, blicken rad för rad i två svep och handen till hakan.
4. **Luktar och pekar** (`guest.smellPoint`, 2,20 s): huvudet bakåt i två korta andetag och armen rakt ut mot röken (0,62 m).
5. **Tvekar** (`guest.hesitate`, 2,80 s, loop): tyngden flyttas mellan fötterna och blicken går mellan kön och gatan, med handen vid hakan. Klippet hålls med `holdUntil` så länge spelaren kan prata (`CURIOUS.windowS`).
6. **Bestämmer sig** (`decide`):
   - **Ställer sig i kön** (`guest.joinQueue`, 1,60 s): går till köns sista lediga plats via en punkt 0,75 m söder om den, tar två korta steg in, kastar en blick mot skylten och lägger händerna ihop.
   - **Går vidare** (`guest.walkOn`, 1,60 s): tar upp farten igen och släpper vagnen med blicken. Det är ingen axelryckning, för det är inget misslyckande.

Alla längder gäller normalt tempo. Lugnt och stressat står i filhuvudet (÷ 0,8 och ÷ 1,5). Den som inte är nyfiken går förbi utan att sakta in, och får ingen markering.

## 2. Markeringen: nyfiken och går att prata med

Den är byggd som stämningssymbolerna, utan rött, grönt och puls (`curiousMarker.ts`):

- **Pratbubblan** sitter 30 px över huvudet (vid 1440 × 900, skalas med höjden). Den är papper med mässingskant, har tre prickar och en spets ned mot huvudet och är lika stor på alla nivåer.
- **Ringen** på marken, 0,44 m, är streckad i mässing.
- **Bågen** runt bubblan krymper medan gästen tvekar och visar hur länge det går att prata.
- **När man pekar på den:** bubblan blir 1,15 gånger större, kanten guld och ringen hel. Pekaren blir en hand.
- **När man klickar:** den vid luckan lutar sig ut och vinkar fram gästen (`truck.beckon`, 1,80 s). Bubblan fylls med guld och står kvar tills gästen står i kön, och tonar ut under `guest.joinQueue`. Gästen ställer sig alltid i kön efter prat. Om kön är full går gästen vidare.
- **Utan klick:** bubblan tonar ut på 0,5 s när gästen bestämmer sig. Prototypen växlar mellan kön och gatan (inställningen *Efter tvekan*), och i spelet är det `CURIOUS.joinChance`.

Bubblan syns på gatans och krogens nivå, högst fyra åt gången. Teckenförklaringen *Nyfiken · går att prata med* står nere till höger i prototypen, och i spelet hör den till teckenförklaringen i D6 (`d6Ui.ts`).

## 3. De som äter

Den som har fått maten vid luckan går till en ledig ätplats. Ordningen (`EAT_FLOW`):

1. **Äter** tre varv:
   - `guest.eatBun` (3,20 s): korven tvärs framför bröstet upp till munnen, huvudet möter den, tuggar. Korven blir kortare för varje tugga, och brickan står på bordet.
   - `guest.eatPlate` (3,40 s): tallriken står på bordet, gaffeln går från den till munnen och moset blir mindre.
2. **Dricker** (`guest.drink`, 2,40 s): burken lyfts med vänster hand, en klunk med huvudet bakåt.
3. **Torkar sig med servetten** (`guest.wipeNapkin`, 2,60 s): drar en servett ur hållaren på bordet, små cirklar vid munnen, sedan händerna mot varandra. Servetten blir en skrynklig boll.
4. **Går till sopkorgen** med servetten och brickan eller tallriken.
5. **Slänger** (`guest.binNapkin`, 1,40 s): båda händerna fram över luckan och släpper. Luckan slår upp (`BIN.flap`), och vita bitar syns i den.
6. **Går därifrån** (`guest.leaveTable`, 1,20 s, två korta steg) och sedan ut på gångvägen, åt väster eller öster.

Servetten är det vitaste i bilden, så den läses från 12 m. Bänken och värmaren har bara korv i bröd. Den som inte hittar en ledig plats tar maten med sig.

## 4. Föremålen

De tolv föremålen finns i bild 15, uppifrån och från sidan med mått (`truckProps.ts`). Möblerna har verklig storlek. Det som står på borden och hålls i handen är 1,5 gånger verklig storlek, som i rummet, och verklig storlek är streckad i bild 15.

| Föremål | Plats (vagnens ram) | Mått |
|---|---|---|
| **Ståbord** ×3 | A [3,9, 1,2], B [5,4, 1,2], C [4,65, 2,9] | Ø 0,68 m, 1,10 m högt, med servetthållare i mitten |
| **Bänk** | [5,75, 2,75], längs däckets östra kant | 1,40 × 0,42 m, sitthöjd 0,45 m, utan rygg |
| **Marschaller** ×6 | två vid kön, tre längs däckets södra kant, en i öster | Ø 0,10 m i hållare 0,75 m |
| **Terrassvärmare** | [3,55, 2,45], däckets västra del | huven Ø 0,80 m, 2,20 m hög |
| **Sopkorg** | [2,7, 3,2], utanför däckets sydvästra hörn | Ø 0,42 m, 0,85 m hög, lucka som slår upp |
| **Servetthållare** | på borden och på hyllan | 0,18 × 0,10 × 0,14 m |
| **Senap och ketchup** | hyllan vid luckan [1,55–2,2, 1,15–1,4] | flaskor Ø 0,06 × 0,20 m |
| **Menyskylt** | [−2,2, 3,5], vänd mot torget | gatupratare 0,60 × 0,95 m |
| **Korv i bröd**, **korv med mos**, **drycker** | i handen och på borden | 0,20 m, tallrik Ø 0,23 m, burk och pappmugg |
| **Röken** | ur skorstenen | stiger från 2,60 till 5 m |

**Två flyttar från D7:**

- **Skylten** stod bakom kön [−2,8, 1,5] och gick inte att läsa från torget. Nu står den framför kön mot gångvägen.
- **Sopkorgen** låg delvis i planteringslådan [3,3, 3,5]. Nu står den utanför hörnet.

**Ätplatsen C-E** tas bort eftersom bänken står där. **Menyns text** står inte på skylten, för skylten har bara krita utan text. Menyn visas i HUD:en när man pekar på skylten (`menu.*`, priserna {price}).

**Kontrollen** (`luckanPlats.json`): ingen punkt ligger i ett hus. Gångvägen går ut på Prästgatan i väster (gångfartsområde) och slutar 0,23 m från gatan Torget i öster, där folk kommer och går. Det är meningen. Närmaste föremål till rivalens kö är 2,12 m bort, där gångvägen passerar.

## 5. Vädret

Ett väder per kväll (`truckWeather.ts`). Code avgör om det följer byns väder.

- **Sol:** skarpa skuggor, och borden och bänken är fulla.
- **Regn:**
  - Markisen fälls ut helt, över hela vagnens längd och 0,6 m längre ut.
  - Kön flyttar in under markisen, och de fyra första står torrt.
  - Borden och däcket är blöta och mörkare med droppar, och ingen äter där. De som äter står vid hyllan på vagnens sida under markisen, eller tar maten med sig.
  - Paraplyer finns ute (72 %) och fälls ihop under markisen.
  - Det finns pölar på torget, droppar längs markisens kant och regnstreck i skärmen.
  - Röken är tunn.
- **Blåst:**
  - Servetterna flyger från borden där någon äter, och den som stod där griper efter dem (`guest.grabNapkin`).
  - Markisens bågkant fladdrar och duken får veck.
  - Ljusslingan svajar och marschallernas lågor lutar.
  - Röken ligger platt.
  - Servetthållarna har en tyngd över servetterna.
- **Sval kväll:**
  - Värmaren är tänd, och de som äter går först till de fyra platserna runt den (`guest.warmHands` mellan tuggorna).
  - Alla har rock och två av tre halsduk, och andedräkten syns.
  - Röken är tät.

## 6. Ljuset en kväll

Samma `e` som byn, 0 till 1 (`truckEvening.ts`).

- **Ljuset över scenen** går från vitt dagsljus över guld (e 0,5) och rosa (0,66) till blått i skymningen (`TRUCK_AMBIENT`).
- **Skuggorna** är korta mot nordost mitt på dagen och långa mot öster på kvällen. De tonar bort när solen går ned efter e 0,62 (`SHADOW`).
- **Ljusslingan och luckan** tonar in med k = smoothstep((e − 0,42) / 0,38).
- **Marschallerna** tänds en i taget från e 0,55, med 0,035 mellan: först de två vid kön, sedan däcket medsols (`TORCHES`). Lågan fladdrar.

Prototypen spelar kvällen på 26 s, eller så drar man i reglaget.

## Kontrollbilder (båda storlekarna)

| Bilder | Vad de visar |
|---|---|
| 01–02 | Livet vid luckan på 24 och 12 m, sen eftermiddag, med en nyfiken gäst vid skylten. |
| 03–09 | De nyfikna på 10 m: saktar in, läser skylten, luktar och pekar, tvekar (markeringen, pekaren över, bågen), prat (guldbubblan och den vid luckan som vinkar), ställer sig i kön och går vidare. |
| 10–14 | De som äter på 7 m: korv i bröd, tallrik och dryck, torkar sig, slänger servetten och går därifrån. |
| 15 | Föremålen. |
| 16–19 | Sol, regn, blåst och sval kväll på 12 m. |
| 20–23 | Ljuset en kväll på 18 m: dagsljus, sen eftermiddag, marschallerna tänds och skymning. |

## Öppet

1. **Vad som sägs vid luckan:** prototypen visar bara att den vid luckan vinkar fram gästen. Om det ska finnas repliker behövs ett beslut.
2. **Marschallerna tänds av sig själva.** Om personalen ska tända dem behövs ett klipp (förslag: `staff.lightTorch`).
3. **Stämningen och bubblan:** gästerna utanför har ingen stämningssymbol. Om båda ska synas går bubblan före, och stämningen tänds i kön.
4. **Talen:** `CURIOUS.windowS`, `CURIOUS.joinChance`, `CURIOUS.share`, `WEATHER.*.footfall` och `.curious`, `WEATHER.rain.queueMax` och `TRUCK.menuMix` sätter Code i balance.ts.
