# ORDER 315b — Foodtrucken som första steg (rapport, del 1)

**Underlag:**
- `~/Downloads/BESLUT_2026-10-07.md`, del 2.
- Förslaget `ORDER_315_FORSLAG.md` §1 (flödet) och §2 (foodtruckens ekonomi).
- Ordertexten `ORDRAR_314-316_D7.md`, ORDER 315 Flödet.

**Gren:** `order-315b` från `main` (`b6281cb8`, efter 315a).

**Del 1** gäller foodtruckens flöde, ekonomi och plats.
- Designs D7 (`nexus-leverans-2026-10-06-din-vag`) och tillägget (`-2026-10-07-din-vag-tillagg`) kom under ordern. De är uppackade oförändrade och kopplas in i del 2, efter ORDER 317 (provspelets rättningar), i den ordning Anders angav 2026-10-07.
- Det som byggs här med designsystemets enkla delar byts då mot D7:s former: vagnen, luckan, Åsas kort och Din väg.

Varje tal pekar på en fil under `frontend/reports/order315b/`.

## 1. Inträdet: Åsa erbjuder foodtrucken

- När inträdesprovet är klarat säger Åsa på sin skärm (M1) ordagrant som i ordern: *"Du har klarat inträdet. Det står en foodtruck ledig vid Torget. Den är din, om du vill."* (`introduction.steps.bank`).
- **Erbjudandet** (`sim/ladder.ts introOffer`) kommer efter Åsas skärm.
  - Kortet har knapparna Ta över och Inte än, och raden "Ingen insats och inget lån".
  - Inte än står kvar (`introduction.truckDeclined`).
- **Ta över** (`openFoodtruck`) öppnar foodtrucken:
  - inget lån;
  - lagets roller är kocken och lärlingen;
  - ryktet är orört;
  - stegen börjar på foodtrucken.
- **Banken** erbjuder inte längre en första verksamhet i introduktionen. `CHOOSE_CLASS` i introduktionen öppnar inget. Bankens dialog pekar på Åsa: *"Åsa har nycklarna till foodtrucken vid Torget, och den behöver inget lån. När du vill ta över vinbaren kan vi prata om lånet till köpet."*
- **Åsas repliker** om banken i övningen, provet och låset är ändrade så att de inte nämner banken.

## 2. Foodtruckens ekonomi (`balance.ts FOODTRUCK`)

| Post | Värde | Var det verkar |
|---|---|---|
| Notan | 95 kr, gånger plånboken som i klasserna utan meny | `reducer.ts`, betalningen |
| Varorna | 35 % av notan, betalas när gästen betalar | samma ställe, kassabokens rad `ingredient` |
| Lönen | medhjälparen (lärlingens 500 kr); spelaren vid grillen (kocken) får ingen lön | `economy.ts paidMembers` |
| Platsen och tillståndet | 1 500 kr i veckan i stället för hyra, från vecka 1 | `weeklyRentSek` |
| Normal veckointäkt | 40 000 kr (förut 60 744 kr), för veckomålet och scenariernas enhet | `ECONOMY.normalWeeklyRevenueSek` |
| Förbipasserande | dagens tak gånger 7 | `dailyGuestCap` |
| Kön vid luckan | 3 per person, som förut | `businessClass.ts` |
| Morgonen | luckans meny (korv med bröd, tunnbrödsrulle, dryck) i stället för vinbarens menyredigerare; inget lager att fråga om före öppning | `DayActionBar.tsx`, `openShortfall` |

**Rättade fel** som syntes först när foodtrucken spelades:
- **Mise en place:** varje gäst vid luckan fick alla fem avdragen för saknad mise en place (−0,52 i nöjdhet). Foodtrucken har ingen mise en place, så beredskapen var tom.
  - Gästerna betalade därför med nöjdheten 0,2 och ryktet föll.
  - Rättat i `mepConsumption.ts`: verksamheter utan mise en place får inga avdrag.
- **Gästerna i byn:** foodtruckens gäster sätter sig aldrig, så de räknades inte som kvällens gäster (`seatedTonight`). Byn, bandet och "Byn just nu" visade 0, och nöjda gäster räknades inte i placeringen.
  - Nu räknas de som handlat vid luckan.
- **Laget:** hela vinbarens lag följde med till foodtrucken, så lönen var 4 100 kr per kväll. Nu är laget foodtruckens.

**Mätt** (`order315bFoodtruck.test.ts`, åtta frön, tre veckor, spelaren stannar i foodtrucken):

| | Före (`fore.json`) | Efter (`efter.json`) | Förslaget |
|---|---|---|---|
| Gäster per kväll, den bästa | 20 | 66 (8–95) | 50–90 |
| Notan per gäst | 402 kr | 99–101 kr | 95 kr |
| Varornas andel | 3–4 % | 36 % | 35 % |
| Lön per kväll | 4 100 kr | 500 kr | 500 kr |
| Intäkt per vecka, den bästa | 45 600–49 400 kr | 36 400–43 500 kr | 30 000–50 000 kr |
| Resultat per vecka, den bästa | 30 000–33 000 kr | 26 200–31 200 kr | 10 000–14 000 kr (0,85) |
| Resultat per vecka, alltid fel | 9 500–11 900 kr | 18 200–20 500 kr | under noll |

**Resultatet är för högt, och det rättas i 315c:**
- **Scenarierna vid dörren:** foodtrucken har ingen frågebank än, så de gamla scenarierna vid dörren går. Deras kassa (upp till ±20 % av veckointäkten) ger också den som alltid svarar fel ett plus. Med frågebanken i 315c ersätts scenarierna av situationer, som i vinbaren.
- **Förslagets egna tal går inte ihop.** 50–90 gäster à 95 kr med 35 % varor ger 18 000–33 000 kr i täckning per vecka. Efter 3 000 kr i lön och 1 500 kr i avgift blir det 13 500–28 500 kr. Målet 10 000–14 000 kr för 0,85 motsvarar den nedre delen.
- Kalibreringen mot §3 (vinbaren vecka 2–3, alltid fel lämnar aldrig foodtrucken) görs i 315c.
- Stegen i kalibreringen står i `kalib/x1`–`x5.json`.

## 3. Vagnen vid Torget och luckan

- **Spelarens vagn** står vid Torget varje kväll (`village.ts PLAYER_TRUCK_SPOT`). Den är blå med gul markis och tre ståbord, och står först på platsen (`VillageVenues.tsx`).
- **Vinbarens hus** är mörkt så länge spelaren har vagnen.
- **Krogens nivå (Z):** luckan och kön (`FoodtruckScene`, ORDER 113) ligger över 3D-scenen. 3D-scenen står kvar under, så att kameran och nivåraden tar spelaren ut till gatan och byn.
  - Ett första försök, där luckan ersatte 3D-scenen som dockskåpet i provspelsläget, lät inte spelaren lämna nivån.
- **Formen** byts mot D7 i del 2:
  - vagnen `playerTruck.ts`, på D7:s plats [17,00, −21,90];
  - klippen;
  - rivalens nya plats på torget (`rivalTorget.ts`), som enligt Anders gäller alla kvällar.

## 4. Harness

- `weekHarness.ts startInFoodtruck` startar säsongen som spelarens flöde: ett nytt spel, introduktionen, inträdesprovet och Ta över.
- Säsongernas harness från foodtrucken körs i 315c med kalibreringen.

## 5. Körningar och spelarens flöde

- `npm run typecheck`: grönt. `npm run build`: grönt.
- `npx vitest run`: 185 filer gröna och 14 hoppade; 2 527 tester gröna, 2 förväntade fel och 19 överhoppade.
- **Tidsgränser:** fem tester fick längre tidsgränser, eftersom foodtruckens veckor nu har fler gäster.
  - De är `order265`–`order267WeekHarness` (60 → 180 s; 35–38 s ensamma), `smoke` (30 → 90 s; 15 s ensamt) och `order131LoadSweep` (300 → 600 s; 73 s ensamt).
  - I hela sviten gick de över de gamla gränserna.
- **Nytt test:** `src/sim/__tests__/order315bFoodtruck.test.ts`, 6 fall:
  - starten;
  - lönen;
  - avgiften;
  - taket och kön;
  - notan och varorna en kväll, med gästerna räknade i byn;
  - vagnen vid Torget och luckan över 3D-scenen.
- **Ändrade tester:**
  - `introduction.test.ts`, `order271Screens.test.tsx` och `order313AsaBorjan.test.ts`: inträdet och banken i introduktionen.
  - `mepConsumption.test.ts`: fixturen är restaurangen, och ett nytt fall för foodtrucken.
  - `order270Incidents.test.ts`: den svaga spelaren lämnar inte längre foodtrucken på fyra veckor, så rutan prövas med en tvingad nedgradering.
- **Spelarens flöde i produktionsbygget:** `scripts/order315b-truck-check.mjs`, med sparfilen i introduktionens sista steg (`truck-en.json`, `truck-sv.json`, `ok: true`). Flödet:
  - Åsas skärm;
  - erbjudandet (kortet döljs medan Åsas skärm står);
  - Ta över;
  - morgonen med luckans meny;
  - Öppna;
  - luckan och kön på krogens nivå;
  - gatan och kvarteret med vagnen vid Torget.
  - Bilderna heter `truck-<lang>-*.png`.

## 6. Konflikter mellan D7 och Anders beslut, till del 2

1. **Stegens ordning:**
   - D7 har Food truck, Vinbar, Bistro, Ölkrog, Restaurang, Nattklubb, Gästgiveri och Stjärnkrogen.
   - Ordertexten har Foodtruck, Kvarterskrog, Vinbar, Ölhall, Bistro, Nattklubb, Soigné och Gästgiveri. Den står i `LADDER.order` i 315a.
   - Tillägget säger att D7:s ordning gäller. Vilken gäller?
2. **Åsas kort i D7** säger "ryktet börjar om till hälften". Anders beslut (BESLUT del 2, fråga 1) är att ryktet följer med oförändrat. Del 2 följer beslutet om inget annat sägs.
3. **"Stängt i {days} dagar"** under ombyggnaden finns i D7 men inte i besluten. Ska bistron vara stängd några dagar medan den byggs om?
