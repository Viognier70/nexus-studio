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

`reports/order319b/nyfikna.json`: 6 frön, foodtruckens servicekvällar vecka 1, 36 kvällar per spelartyp. Situationerna svaras rätt för alla.

| Spelartyp | Notor från de nyfikna per kväll | Gäster via de nyfikna per kväll (varav vänner) | Kvällens intäkt | Kollapsade kvällar |
|---|---|---|---|---|
| Kan (klickar och svarar rätt) | 705 kr (12 %) | 7,3 (1,9) | 5 824 kr | 5 |
| Gissar (klickar och väljer på måfå) | 212 kr | 2,1 (0,6) | 5 776 kr | 4 |
| Klickar inte | 0 kr | 0 | 5 752 kr | 3 |

**Skillnaden mellan den som kan och den som inte kan är tydlig, och de nyfikna är inte den största källan.** Hos den som kan ger de andra gästerna 5 119 kr per kväll.

**Men nettot är litet.** Kvällarna jämfördes en och en mot samma kväll för den som inte klickar, bara kvällar där ingen av de två kollapsade (`pairedNet`):
- Den som kan får 250 kr mer per kväll, och den som gissar 107 kr mer.
- De nyfikna gav 712 kr samma kvällar, alltså tog de nyfikna plats i kön från gäster som annars hade kommit.
- Vagnen går redan nära sin gräns: kön är full ibland och gäster vänder.
- Fler gäster ger också mer belastning, och kollapserna på den kulturella axeln (319a) kom något oftare: 5 mot 3 kvällar. Urvalet är litet.

Jag provade att låta de nyfikna bara stanna när kön är kort. Nettot blev ungefär detsamma, och antalet nyfikna halverades, så jag tog bort det igen.

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

## Kvar till Anders

- **Nettot från de nyfikna är litet**, eftersom vagnen går nära sin gräns. Ska vagnen klara fler gäster (köns tak eller personalens takt), så att kunskapen ger mer i kassan?
- **Kollapserna** (från 319a), som blir något fler med fler gäster.
- **Vännen kommer gående från byn**, inte bredvid gästen.
- **Frågan på kortet är en kunskapsfråga ur banken**, och raden om vad gästen gör står ovanför. Bankens frågor är inte skrivna som något en gäst säger, som *"Vad är det för korv?"*. Egna frågor till de nyfikna kräver en leverans från Claude.
