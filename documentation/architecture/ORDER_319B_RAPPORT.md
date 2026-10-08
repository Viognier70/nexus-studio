# ORDER 319b: nyfikna gäster vid foodtrucken, och trängseln

**Underlag:**
- `documentation/blueprints/ORDRAR_319_D9.md` (319b).
- Anders beslut 2026-10-08:
  - D9 och tillägget används i 319b och 319c.
  - Frågorna tas ur foodtruckens bank.
  - Trängseln gäller i alla verksamheter.
  - Designs tider och gränser ligger i balance.ts.
- Designs leveranser i `documentation/leveranser/nexus-leveranser-2026-10-08-d9/`, uppackade oförändrade: D9, tillägget och trängseln.

**Gren:** `order-319b` från `main` (`e681e68f`).

Alla tal nedan kommer ur rapportfilerna i `frontend/reports/order319b/`.

---

## 319b.1–3: de nyfikna

### Simuleringen (`src/sim/curious.ts`)

1. **En förbipasserande blir nyfiken.** Det sker under foodtruckens service, högst en åt gången, med `CURIOUS.gapSimSeconds` mellan dem.
   - Figuren kommer gående längs gångvägen söder om vagnen, från en punkt utanför bild minst 40 m bort.
   - Hen saktar in vid skylten. Därefter läser hen, luktar och pekar mot röken, tittar på klockan och tvekar, i Designs ordning (`CURIOUS.phaseSeconds`).
2. **Bubblan och fönstret.** Medan bubblan syns kan spelaren klicka på bubblan eller figuren.
   - Fönstret är 20 s (`CURIOUS.windowSeconds`).
   - Utan svar går gästen vidare.
3. **Kortet.** Klicket öppnar kortet med en fråga ur foodtruckens bank.
   - Frågorna är stegen i de granskade situationerna, alltså inte ⚖-frågorna och inte prototypens exempel.
   - Ingen fråga kommer två gånger samma kväll.
   - Raden om vad spelaren ser följer vad gästen gör (`curious.moment.*`).
   - Medan kortet är öppet går kvällen i 1× och ingen situation öppnas.
4. **Svaret avgör:**
   - **Rätt:** gästen ställer sig i kön. Figuren är densamma, och gästen får ett id i simuleringen. Med `CURIOUS.friendChance` kommer en vän gående från byn. Medhjälparen vinkar fram gästen (`truck.beckon`) och säger en av fyra repliker i tur och ordning.
   - **Nästan:** gästen tvekar, tittar på klockan och tvekar igen (`CURIOUS.okHoldSeconds`). Sedan ställer hen sig i kön med `CURIOUS.okJoinChance`.
   - **Fel:** gästen skakar på huvudet och går vidare.
   - Är kön full går gästen vidare.
5. **Krediter och portfolio.** Rätt svar ger `CURIOUS.creditRight` (0,25) på frågans axel. En situations steg ger 1. Varje svar bokförs i portfolion (`state.curiousLog`, hela säsongen).

### Scenen

- **Klippen:** Designs elva klipp ligger i `figureClips.ts`. Två har bytt namn, eftersom namnen redan användes av stämningens sittande klipp:
  - `guest.checkWatch` heter `guest.checkWatchStand`.
  - `guest.armsCrossed` heter `guest.armsCrossedStand`.
- **Markeringen** (`scene/village/CuriousMarker.tsx`, `ui/curious/CuriousViews.tsx`) har Designs mått:
  - pratbubblan, som är guld när ni pratar och efter rätt svar tills gästen står i kön;
  - bågen medan gästen tvekar;
  - den streckade ringen på marken, som blir hel när pekaren är över.
  - Den syns på krogens och gatans nivå.
- **Frågekortet** (`ui/curious/CuriousCard.tsx`) har Designs mått och färgerna för rätt, nästan och fel.
- **Repliken från luckan** har avsändaren *Elin, medhjälpare*. Namnet är Designs exempel (`truck.assistant.name`), eftersom vagnens personal saknar namn i spelet.
- **Kroppsspråket i kön:** en blick på klockan efter `STREET_QUEUE.patienceSeconds`, sedan var `watchEverySeconds`.
- **Menyskylten** står på Designs nya plats framför kön, vänd mot torget, som en gatupratare.

Prototypens felsökningsetikett är inte med.

### Två fel som kontrollen i spelet hittade (rättade)

- **Klicket på bubblan nådde scenen under.** Torgets landmärke tog klicket, och kameran flög ut till kvarteret. Nu tar bubblan själv emot klicket.
- **Gästerna försvann 0,13 m innanför gränsen på 40 m.** Det berodde på att de ritas till höger om vägen. Nu prövas försvinnandet där figuren senast ritades, och en ny figur börjar med en marginal.

## 319b.4: vad de nyfikna lägger till i intäkt

### Första mätningen (före del 2)

Mätningen gällde en kväll åt gången. Den som kan fick 705 kr per kväll i notor från de nyfikna, men nettot mot den som inte klickar var bara omkring 250 kr. De nyfikna tog platser i kön från gäster som annars hade kommit, eftersom vagnen går nära sin gräns. Det ledde till Anders beslut i del 2 nedan.

### Efter del 2

`reports/order319b/nyfikna.json`: 6 frön, en hel vecka i foodtrucken per frö (vecka 1, `playDay`), 36 servicekvällar per spelartyp. Situationerna svaras rätt för alla.

| Spelartyp | Veckans intäkt | Från de nyfikna per kväll | Varav stamgästerna | Ryktet över veckan |
|---|---|---|---|---|
| Kan (klickar och svarar rätt) | 30 864 kr | 887 kr | 232 kr | +13,5 poäng |
| Gissar (klickar och väljer på måfå) | 29 634 kr | 239 kr | 40 kr | +7,5 poäng |
| Klickar inte | 29 437 kr | 0 kr | 0 kr | +6,1 poäng |

- **Skillnaden i veckan:**
  - Den som kan får 1 427 kr mer än den som inte klickar och 1 230 kr mer än den som gissar.
  - Ryktet stiger 7,4 poäng mer för den som kan än för den som inte klickar.
- **Inte den största källan:** de andra gästerna ger den som kan 4 257 kr per kväll, mot 887 kr från de nyfikna.
- **Inga kvällar kollapsade** i den här mätningen (`collapsedEvenings`). Kollapserna mäts med 40 säsonger i 319c, enligt Anders beslut.

## Trängseln (Anders 2026-10-08)

`scene/personalSpace.ts` innehåller Designs mått, oförändrade. Reglerna:
- **Väja:** saktar in för den framför, som en eftersläpning bakom vägens punkt.
- **Knuffas isär:** efter massan. Den som går rakt mot någon kliver åt höger, så att två i en smal gång kan passera.
- **Hålla till höger:** gäller bara vid vagnen.

Var regeln används:
- **Vid vagnen:** i gästflödet (`truckGuestFlow.ts`) för gäster och nyfikna. Personalen i vagnen räknas inte, enligt Designs regel.
- **I vinbaren och bistron:** i `WineBarFigures.tsx` efter regissören, för gäster och personal. Gäster som sitter flyttas inte.

**Test** (`scene/__tests__/order319bTrangseln.test.ts`, `reports/order319b/trangseln.json`): en hel kväll per frö och verksamhet, alla par av synliga figurer i varje tick.

| Verksamhet | Kvällar | Närmast utan regeln | Närmast med regeln |
|---|---|---|---|
| Foodtrucken (med de nyfikna) | 2 | 0,00 m | 0,40 m |
| Vinbaren | 2 | 0,00 m | 0,40 m |
| Bistron | 2 | 0,00 m | 0,40 m |

Testet kräver minst 0,35 m.

## Talen i balance.ts

Talen ligger i `CURIOUS` och `STREET_QUEUE`:
- kortets sekunder och tiderna efter svaret;
- fönstret, tidslinjen, nästan-tvekan och chanserna;
- krediten;
- blicken på klockan.

Kögränsen för marschallerna (`TORCH`) kommer med marschallerna i 319c.

Beslutsraden från 2026-10-08 står i `NEXUS_SPELDESIGN_V1.md`.

## Verifiering

- **typecheck och bygget:** gröna.
- **vitest:** 198 testfiler och 2 590 test gröna, inga fel. Nya test:
  - `sim/__tests__/order319bCurious.test.ts`
  - `testHarness/__tests__/order319bNyfikna.test.ts`
  - `scene/__tests__/order319bTrangseln.test.ts`
- **`scripts/order319b-check.mjs`** (produktionsbygget, `reports/order319b/check-sv.json` och kontrollbilderna): ok i 1440 × 900 och 1280 × 720.
  - Bubblan syns och blir större när pekaren är över.
  - Klicket öppnar kortet med en fråga ur banken.
  - Rätt svar: gästen ställer sig i kön och repliken syns.
  - Fel svar: gästen går vidare.
  - Utan klick: gästen går vidare.
  - Ingen figur dök upp eller försvann i bild eller närmare än 40 m. Det minsta avståndet mellan två gäster var 0,43 m.
- **`scripts/order319a-check.mjs`:** ok. Figurerna följs nu per objekt, eftersom en nyfiken som ställer sig i kön byter id men inte figur.
- **`scripts/order300-layout.mjs`:** alla lägen ok.

---

## Del 2 (Anders beslut 2026-10-08)

### Vagnens kapacitet ökas inte

Kunskapen syns i stället på tre sätt (`sim/curious.ts`, talen i `balance.ts CURIOUS`):

1. **Varje köp blir större.** Den som fick ett rätt svar tar en dryck eller en hel special i stället för en halv: notan gånger 1 + `rightBillBonus` (0,35).
2. **Gästen kommer tillbaka som stamgäst.** Efter ett rätt svar och ett köp händer det med `returnChance` (0,5).
   - Stamgästen kommer någon av de `returnWithinServiceDays` (3) närmaste servicedagarna och köper lika mycket.
   - Stamgästerna ligger i `state.curiousRegulars` till dess.
3. **Ryktet stiger** med `reputationRight` poäng per rätt svar.
   - Först satte jag 0,25, men då steg ryktet 10 poäng mer i veckan än för den som inte klickar. Det är lika mycket som tio klarade situationer, så nu är det 0,1.

Mer kapacitet, som en andra grill, kan bli en satsning som spelaren köper. Den är inte byggd.

### Frågorna i gästens egen röst

Underlaget är `documentation/blueprints/NYFIKNA_FRAGOR_319.md`, Anders 20 frågor.

- **Filerna:** frågorna ligger i `src/content/curious/`: `nyfikna.meta.json`, `nyfikna.text.sv.json` och `nyfikna.text.en.json`. Engelskan har jag översatt.
- **Validering:** `sim/curiousBank.ts` validerar frågorna när spelet startar.
- **Utlösaren** följer vad gästen gör i bild:
  - läser skylten;
  - luktar på röken;
  - fryser (en sval kväll, med vädret i 319c);
  - ser på priset, när en del av dem som läser skylten tittar på priserna (`priceShare`);
  - kommer med barn (`childShare`). Barnet går bredvid i scenen och följer med till kön eller vidare, och kortet säger vem som talar (*Föräldern*, *Barnet pekar på grillen*).
- **Svaren blandas** varje gång.
- **Upprepning:** en fråga kommer inte två gånger samma kväll, och inte samma som förra kvällen så länge det finns andra. Finns ingen fråga kvar för det gästen gör tas en annan.
- **⚖:** n09, n12 och n19 är dolda tills de är granskade. De andra 17 är med.
- **Förklaringen** på kortet är frågans egen.
- **Krediten** bokförs på frågans axel.

**Mina synpunkter på frågorna** (inbyggda som de är):
- **n04** "Har ni något utan kött?": det rätta svaret är vegokorven, men den finns inte på vagnens meny i Designs D9 (`menu.*`).
- **n08** "Grillar ni på kol?": svar 3, "Det är en vanlig elgrill", är markerat ok men är fel i sak, eftersom vagnen grillar på gasol.
- **n18** senapen till en femåring: det rätta svaret kallar skånsk senap söt och mild. Skånsk senap brukar vara söt men ganska stark.

### Medhjälparens namn

**Nils**, enligt Anders förslag, eftersom Elin finns i vinbarens personal (`truck.assistant.name`).

### Prövningen av del 2

- **`sim/__tests__/order319bCurious.test.ts`** (11 test):
  - frågebanken, utlösarna och ⚖;
  - fel i banken stoppas av valideringen;
  - frågan följer vad gästen gör, och svaren är blandade;
  - rätt svar ger ett större köp och ett högre rykte;
  - stamgästen kommer en senare servicedag och köper lika mycket.
- **`testHarness/__tests__/order319bNyfikna.test.ts`:** veckorna i tabellen ovan.
- **`scripts/order319b-check.mjs`:** ok i båda storlekarna.
  - Den första nyfikna kom med barn och fick fråga n18 med blandade svar.
  - Repliken var från *Nils, medhjälpare*.
  - 0 figurer dök upp eller försvann i bild eller närmare än 40 m.
  - Det minsta avståndet mellan två figurer var 0,44 m.

## Kvar till Anders

- **Kollapserna** mäts med 40 säsonger i 319c.
- **Vännen** kommer gående från byn, inte bredvid gästen.
- **⚖-frågorna** n09, n12 och n19 ska granskas.
- **Mina synpunkter** på n04, n08 och n18 (ovan).
