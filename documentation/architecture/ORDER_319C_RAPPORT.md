# ORDER 319c: platsen och vädret vid vagnen

**Beställare:** Anders 2026-10-07 (`documentation/blueprints/ORDRAR_319_D9.md`, ORDER 319c) och 2026-10-08 ("319c: uteserveringen, föremålen, de som äter, vädret och marschallerna enligt ORDRAR_319_D9.md och D9, med 40 säsonger för kollapserna").
**Underlag:** Designs D9 och tillägget, oförändrade i `documentation/leveranser/nexus-leveranser-2026-10-08-d9/`.

Alla tal nedan står i rapportfilerna i `frontend/reports/order319c/`:
- `sasonger.json`: 40 säsonger à 3 veckor;
- `platsen.json`: föremålen mot gångvägarna;
- `check-sv.json`: kontrollen i spelet.

## Vad som är byggt

### Simuleringen (`sim/truckLife.ts`, talen i `balance.ts` TRUCK_WEATHER, TRUCK_SEATING, TORCH, TRUCK_MENU)

1. **Vädret, ett per kväll:** sol, regn, blåst eller sval kväll.
   - Byns väder slumpas när servicen öppnar och syns inte på morgonen. Därför har vagnen en egen prognos ur säsongens frö och dagen. Den står på morgonen i vagnens ruta ("Vädret i kväll vid vagnen: Regn").
   - Byns väder vid vagnen samma kväll rättas så att det stämmer med vagnens, så att texterna säger samma sak.
   - **Gästflödet:** ankomsterna går gånger `footfall` (sol 1,15, regn 0,8, blåst 0,92, sval 0,97) i stället för byns väder förstärkt. Dagens tak på gäster ändras inte: det begränsar inte vagnen.
   - **De nyfikna:** tiden mellan två nyfikna går gånger `curiousGap` (sol fler, regn färre).
   - **Regnet** börjar en bit in i kvällen (`rainFromE`), så att det syns när det börjar. Det behövs för ft-regnet i 320.
   - **Den svala kvällen:** de nyfikna fryser och får frågorna om kylan (n13–n15).
2. **De som äter:** gästen som har fått maten äter vid en ledig plats i `eatSimSeconds`, annars tar gästen maten med sig.
   - Platserna är Designs `EAT_SPOTS`: ståborden och bänken; en sval kväll först runt värmaren; i regnet vid hyllan på vagnens sida.
   - Förut åt ingen vid den nya vagnen: ätandet krävde den gamla vagnens uteplats (`policies.hasUteplats`).
3. **Skräpet:** när det är mycket folk lämnar en del skräp och servetter på bordet.
   - Ett bord med skräp används inte, och färre förbipasserande blir nyfikna.
   - Medhjälparen städar när kön är tom och ingen äter vid bordet. Spelaren kan klicka på skräpet och städa själv (`TRUCK_CLEAR_TABLE`).
4. **Marschallerna:** medhjälparen går ut och tänder dem när kvällen passerar `fromE`, väntar så länge kön är `queueMax` eller längre och går senast vid `latestE`. Rundan tar `roundSimSeconds` (Designs väg i 1,3 m/s och sex tändningar).
5. **Luckan står tom** medan medhjälparen är ute: inga beställningar tas, grillaren arbetar vidare. I simuleringen sköts luckan av värden och servitören, så båda väntar.

### Scenen

- **Föremålen** ur D9 i vagnens modell (`playerTruck.ts`): tre ståbord med servetthållare, bänken, terrassvärmaren, sopkorgen med luckan, sex marschaller och hyllan vid luckan med ketchup, skånsk senap och mild senap.
- **Maten** som föremål (`tableware.ts`): korv i bröd, tråg, papperstallrik med mos, burk, pappmugg, använd servett och paraply. Nio klipp ur D9 och två ur tillägget är inlagda (`figureClips.ts`, nu 152).
- **De som äter** (`PlayerTruckCrew.tsx`, `truckGuestFlow.ts`):
  - går upp på däcket till sin plats, äter tre varv och dricker;
  - torkar sig med servetten, går till sopkorgen, slänger den och går därifrån;
  - på bänken sittande; runt värmaren värmer de händerna; i blåsten griper de efter servetten.
- **Kylan:** rock, halsduk på två av tre, andedräkt och armarna i kors för den som står still.
- **Regnet:** markisen utfälld, kön under markisen, blöta bord och däck, pölar, regnstreck och paraplyer (`TruckLife.tsx`).
- **Blåsten:** servetter som flyger, fladdrande bågkant, svajande ljusslinga, lutande lågor och tyngder på servetthållarna.
- **Kvällsljuset:** ljusslingan och luckans sken tonar in med kvällen; marschallerna och värmaren har sken på marken. Det är inga riktiga ljuskällor, så att byns ljus och skuggor inte ändras. Designs `TRUCK_AMBIENT` (färgen över hela scenen) är inte använd: byns kvällsljus gäller redan.
- **Röken** ur skorstenen följer vädret.
- **Medhjälparens rundor** (`torchRound.ts`): ut genom dörren med tändaren och tillbaka, eller ut och torka ett bord.
- **Menyn** visas när pekaren är över skylten (`TruckMenuCard.tsx`). Priserna står i `TRUCK_MENU`. Halv special 35 kr kommer ur ORDER 320; de andra priserna är mina förslag.

### Rättat på vägen

- **Gästen som pekar** inför en situation blev ibland serverad mitt i förvarningen och gick till hämtplatsen. Nu väntar luckan med den gästen tills kortet kommer (`service.ts cueHolds`). Den som äter pekar bara mellan 6 och 12 s in i måltiden (`THEATRE.cueEaterWindowSimSeconds`).
- **Rivalvagn nummer 2 på torget** stod i spelarens kö, vid skylten och marschallen. Den platsen används bara när en människas rival väljer torget samma kväll som en annan rival. Nu står den 7 m åt andra hållet och 2 m bakåt (`villagePlaces.ts SECOND_TRUCK_OFFSET_M`).
- **Två vägar ur D9** gick för nära föremål och har fått ett steg emellan (`truckProps.ts EAT_DECK_STEP`, `EAT_LEAVE_STEP`):
  - vägen från däckets ingång gick 0,14 m från värmarens fot;
  - vägen från sopkorgen gick 0,06 m från marschallen vid däckets hörn.
- **Vägen från bordet till sopkorgen** går tillbaka runt borden i stället för rakt genom värmaren.

## Kollapserna i 40 säsonger

Mätningen gäller 40 säsonger à 3 veckor från foodtrucken, alltså 720 kvällar, med rätt svar (`reports/order319c/sasonger.json`, `collapsed`):

| | Kvällar | Andel | Situationer per kväll |
|---|---|---|---|
| Föll ihop | 123 | 17,1 % | 2,35 |
| Föll inte ihop | 597 | | 4,04 |

- **Säsonger med minst en kollaps:** 37 av 40.
- **Axeln:** alla 123 kollapserna var på den kulturella axeln.
- **När:** servicen slutade i medel vid 58 % av kvällens fönster, som tidigast vid 3 %.

Det är samma bild som i 319a (17 % av 96 kvällar). Orsaken är densamma: risken räknas på lagets svagaste axel, och foodtruckens lag har som bäst 0,3 på den kulturella. Jag har inte ändrat kollapsen.

**Beslut behövs fortfarande:**
- Ska kollapsen gälla foodtrucken?
- Ska lagets kulturella kompetens vara högre?
- Ska en kollapsad kväll få sina situationer?

## Vädret

Ur samma mätning (`byWeather`):

| Väder | Andel kvällar | Gäster som kom | Gäster som betalade | Nyfikna | Intäkt per kväll |
|---|---|---|---|---|---|
| Sol | 35 % | 209,6 | 42,2 | 5,68 | 5 712 kr |
| Regn | 15 % | 166,8 | 41,9 | 4,94 | 6 120 kr |
| Blåst | 23 % | 172,6 | 43,2 | 5,71 | 6 114 kr |
| Sval kväll | 27 % | 182,3 | 43,8 | 5,68 | 6 161 kr |

**Vädret ändrar hur många som kommer, men inte hur många vagnen hinner med.**
- Vagnen serverar omkring 42 gäster per kväll i alla väder. Fler än så kommer varje kväll, också i regn, och resten går utan mat (`unserved`, 125–167 per kväll).
- Upp till omkring 18 står samtidigt och väntar eller beställer vid luckan (`maxAtHatch`).
- Det gällde före 319c också: 319c har bara bytt byns slumpade väder mot vagnens. Det stämmer med beslutet att vagnens kapacitet inte ökas, men det betyder att fyra av fem som kommer går utan mat.
- Intäkten per kväll skiljer sig lite och inte i vädrets riktning. Den följer kollapserna och situationerna mer än vädret.

**Beslut behövs:** ska vagnen hinna med fler, eller ska färre komma?

## Platsen

Föremålen mot gångvägarna (`reports/order319c/platsen.json`):
- **49 vägar mot 14 föremål:** inget föremål står närmare en väg än en halv figurbredd (`tight` tom). Närmast är 0,22 m (`minRouteToPropM`).
- **Föremålen står inte i varandra** (`overlaps` tom).
- **En av Designs ätplatser**, `heat0` vid värmaren, står 0,19 m från ståbord C (`spotsNear`). Gästen står där och går inte förbi, så platsen står kvar.
- **Rivalvagn nummer 2** står minst 7,88 m från spelarens föremål, däck och vägar (`rivalTwoGapM`).
- **Marschallrundan** tar 42 s i 1,29 m/s, och marschallerna tänds 8,1, 13,1, 20,8, 24,8, 28,9 och 34,1 s in i rundan (`torchRound`).
- **Layoutkontrollen** (`onRoadAudit.ts auditTrucks`, `order312PaVagen.test.ts`): varje föremål står på land, inte på vägen, inte i ett hus och inte i en rivalvagn.

## Kontrollen i spelet

`frontend/scripts/order319c-check.mjs` kör produktionsbygget med en sparfil per väder: fyra väder i 1440 × 900 och den svala kvällen i 1280 × 720. Resultatet står i `reports/order319c/check-sv.json`, med kontrollbilder `check-sv-*.png`. Alla fem körningar gick igenom (`ok`):

- **Prognosen** på morgonen stämmer med kvällens väder.
- **Skräpet:** medhjälparen städar ståbord A först, och spelaren klickar bort skräpet på ståbord C (`clearedByPlayer` 1).
- **Menyn** visas när pekaren är över skylten, med vegokorven och mild senap.
- **De som äter** står vid sina platser, i regnet vid hyllan.
- **Marschallerna:** medhjälparen går ut och tänder dem, och de är tända efteråt.
- **Figurerna:**
  - ingen dök upp eller försvann i bild eller närmare än 40 m;
  - de kom aldrig närmare varandra än 0,40 m.

**En tidig körning** gav 0,27 m i regnet. Den startade i 4× från början och hade inte skriptets parläsning, och avståndet kom inte tillbaka i de senare körningarna. Trängselns test har nu också en regnkväll och en sval kväll (`order319bTrangseln.test.ts`).

## Prövningen

- **`sim/__tests__/order319cPlatsen.test.ts`** (11 test):
  - vädret per kväll, och att det ändrar ankomsterna;
  - byns väder vid vagnen;
  - regnet som börjar, kylan och de nyfikna;
  - de som äter, och de som tar maten med sig;
  - skräpet och vem som städar;
  - marschallerna, kön och den tomma luckan.
- **`scene/__tests__/order319cPlatsen.test.ts`** (4 test): föremålen, vägarna, rundan och städningen.
- **`testHarness/__tests__/order319cSasonger.test.ts`:** de 40 säsongerna.
- **Ändrade test:**
  - `order286aTheatre`: 152 klipp och 41 föremål;
  - `order319bCurious`: menyn, med n04, n08, n15 och n18;
  - `order319bTrangseln`: regn och kyla.
- **Hela sviten:** 2 615 test gröna.

## Kvar till Anders

1. **Kollapserna:** 17 % av kvällarna i foodtrucken (se ovan). Beslut om kollapsen i foodtrucken.
2. **Vagnens genomströmning:** omkring 42 serverade per kväll, medan 167–210 kommer. Vädret syns därför i hur många som kommer och står vid luckan, inte i intäkten.
3. **Priserna på menyn** (`TRUCK_MENU`), utom halv special, är mina förslag.
4. **Designs `TRUCK_AMBIENT`** är inte använd: byns kvällsljus gäller redan över vagnen.
