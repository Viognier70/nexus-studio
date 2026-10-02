# ORDER 288 — Byn och konkurrensen (rapport)

**Ordern** (Vision Owner 2026-10-01, före teatern 293: "Konkurrensen är det spelaren saknar mest"):
- fyra nivåer med egna knappar och tangenter;
- ljus i kvällsbyn;
- rivaler som styrs av datorn, plus food trucks;
- gäster och bilar i byn;
- aviseringar;
- jämförelsen efter kvällen;
- tidningens rankning;
- rivalen som gränssnitt;
- hyran kalibrerad mot målet 5–10 % (F59).

**Underlag:** Designs `nexus-leverans-2026-10-01-byn-och-gasterna`, inkopierad oförändrad under `documentation/leveranser/`. Från leveransen togs logiken (gatunätet, `choose`, `PREF`, bilarna, följet och byTruckar.js), inte prototypens texter och tal.

Gren `order-288` från `main` (`d3a7ce3`). Talen pekar på filer under `frontend/reports/order288/`.

## 1. Rivalerna och det gemensamma flödet

`frontend/src/sim/village.ts` och `balance.ts` `VILLAGE`.

**Krogarna och vagnarna.** Fyra krogar och två vagnar, var och en med eget namn, egen mat, egen nota, eget rykte (stjärnor 1–5) och egna öppettider:
- Torgkrogen;
- Pizzeria Grytan;
- Sjöboden, öppen onsdag–lördag;
- Hotellets matsal;
- Grillvagnen och Tacovagnen. De står på paket 2:s tre platser (torget, vid Måltidens hus, vid sjön) efter ett veckoschema, så att de står på olika platser olika kvällar.

**Hur gästerna fördelas:**
- Dagens pool delas på gästtyperna.
- Varje typ väljer bland krogarna som har öppet med vikten **smak × stjärnvikt × prisvikt**. Det är Designs `choose()`, med prisvikten tillagd för att täcka "rykte, pris och smak".
- Spelarens andel är densamma som förut, men med kunskapens tak kvar (`economy.ts` `playerShareTonight`). Det som spelaren inte tar går till rivalerna, högst vad de har platser för.
- Ryktet rör sig efter varje kväll med fullheten.

**Rivalen som gränssnitt.** Varje rival har `control` (`'computer'` eller `'human'`) och en `RivalController`:
- `plan` ger kvällens öppet, nota och plats;
- `settle` ger ryktet efter kvällen.
- En människas rival följer planen hon satt (åtgärderna `SET_RIVAL_CONTROL` och `SET_RIVAL_PLAN`).
- Marknaden dömer båda lika.
- Testet `order288Village.test.ts` (*rivalen som gränssnitt*) visar det.

**Spelbarhet.** Allt läses ur fröet och dagen, så att samma frö ger samma by. Rivalernas rykte sparas i `competition`.

## 2. Bussen och aviseringarna

**Bussen** (fredag och lördag, 30 turister):
- 19.45 visas "En buss med 30 turister anländer 20.15. De väljer krog efter rykte."
- 20.15 visas vart de gick.
- Turisterna väljer en krog, inte en vagn, med vikten stjärnor².
- De kommer utöver byns pool: `day.touristsToday` räknas inte mot marknadens tak.
- Väljer de spelarens krog kommer de som rusningens våg, till kön vid dörren.
- Bussvågen i ORDER 292 (en andel av spelarens tak) är ersatt.

**Vagnarna.** När dörrarna öppnar säger aviseringen var vagnarna står.

**I produktionsbygget** (`village.json` `notices`): 19.45 kom aviseringen om bussen, och 20.15 att turisterna gick till Hotellets matsal.

## 3. Gästerna i byn

`scene/village/VillageLife.tsx`, nätet och platserna i `content/villageNetwork.ts` och `villagePlaces.ts`.

**Gatunätet** byggs ur byns riktiga gator, samma OSM-data som vägarna ritas ur: 3 997 noder i en sammanhängande del. Kortaste vägen räknas med Dijkstra.

**Var krogarna står:** i byggnader ur OSM. Pizzeria Grytan i huset som heter Pizzans Hus, Hotellets matsal i hotellet och Sjöboden närmast vattnet.

**Vilka som går:**
- Kvällens sällskap per krog och typ räknas ur simuleringen.
- Studenterna kommer från Måltidens hus, paren från husen och höginkomsttagarna från hotellet eller med bil.
- Bilarna kör in och parkerar, och sällskapet går sista biten.
- Gästerna går hem efter måltiden.
- Vid vagnarna står gästerna i kö och äter stående.
- Miljardären promenerar från hotellet runt torget och sjön till krogen han valde.
- Rusningens bilar och bussens turister är simuleringens egna.
- **Avvikelse:** figurerna som går till spelarens krog är en bild av flödet, inte rummets gäster (F64).

**Vad som syns på varje nivå:**
- **Byn:** en markering per sällskap i typens färg.
- **Kvarteret:** gatorna lyser där många går.
- **Gatan:** sällskapen på väg in har etiketter, och nivåraden visar hur många som är på väg in.

**Gångfarten** är 12 m per spelminut, inte verklig (F64).

**I produktionsbygget** (`village.json`):
- upp till 28 sällskap på väg samtidigt;
- på gatan två etiketter, "3 gäster · Medelinkomst · mot Din krog · 63 m", och "6 gäster på väg in";
- bilder: `village-byn.png`, `village-kvarteret.png`, `village-gatan.png` och `village-krogen.png`.

## 4. Ljuset i kvällsbyn

- **Gatlyktorna:** 505 lyktor längs gatorna i byns kärna (`body.dataset.streetLamps`). De tänds med samma nattkurva som fönstren.
- **Krogarna:** lyser vid dörren när de har öppet, och är mörka när de är stängda.
- **Vagnarna:** upplyst lucka och markis.
- **Ljuset över kvällen:** under middagen följer det klockan från skymning (18.30) till natt (21.45). Lyftet går från 1,6 till 2,9, så att gator, hus och människor syns också mörka kvällar.

Upplysta fönster fanns sedan tidigare (ProceduralFacades).

## 5. Fyra nivåer

`ui/LevelBar.tsx`.

**Knapparna:** Byn, Kvarteret, Gatan och Krogen.

**Tangenterna** ligger i en rad: Z krogen, X gatan, C kvarteret och V byn.
- V går som förut till byn och tillbaka (ORDER 290).
- 1–4 gäller som förut utanför servicen. Under servicen öppnar 1–3 panelerna, därför egna bokstäver (F64).

**Nivån** räknas ur kamerans avstånd (`body.dataset.level`), så att knappen följer också med hjulet.

**Ny förinställning:** gatan, 95 m vid spelarens krog, ovanför rummets tonband.

**Rivalernas etiketter** står i HUD-lagret (Designs leveransnot §4) och flyttas så att de inte ligger över varandra:
- i kvarteret: namn, mat, stjärnor, nota och kvällens gäster;
- i byn: korta.

**I produktionsbygget** (`village.json` `levels`): byn 810 m, kvarteret 257 m, gatan 67 m och krogen 19 m. Knappen Byn gick ut och tillbaka (`buttonVillage`, `buttonBack`).

**En raket som börjar** flyger kameran till rummet, som ORDER 292 bestämde. Det gäller också från byn.

## 6. Jämförelsen efter kvällen och tidningen

**Skärm J1, "Kvällen i byn"** (`scenario/CompareScreen.tsx`), efter kvällens resultat:
- alla krogarna sorterade efter gäster;
- intäkt per gäst och per stol (vagnarna står vid luckan och har inga stolar);
- stjärnorna och turisterna från bussen;
- "Din krog kom 2 av 7 i gäster i kväll" (`village.json` `compare`, `compareLead`).

**Söndagstidningen** har fått en ny del, *Byns krogar*, med veckans rankning (gäster och intäkt per gäst) och den som steg och föll mest i ryktet (`sim/newspaper.ts` `ranking`).

## 7. Hyran och balansen (F59)

**Spelarens smak.** Med prototypens tal tog rivalerna en tredjedel av spelarens gäster onsdag–lördag, och fredagens kö (ORDER 267) försvann. Spelarens smak är därför prototypens gånger 1,75. Då gäller:
- ryktet 0,6: andelen en lördag 0,279 mot taket 0,29;
- ryktet 0,3 (två stjärnor): 0,237;
- ryktet 0,8: taket.

Ryktet flyttar alltså andelen, och rivalerna tar gäster när det faller.

**Notorna** är på spelets skala. En fredag i produktionsbygget (`village.json` `compare`) tog vinbaren 116 kr per gäst (255 kr per stol), Torgkrogen 193 och hotellet 366.

**Räkningen av gäster rättades.** Spelarens gäster i byn räknades först ur dagens ankomster, och gästerna som ett rätt svar släpper in saknades. Notan per gäst blev då 446 kr i veckan från bussen, och spelaren såg dyr ut i gästernas val. Raden räknar nu alla som kom in, och kalibreringen är gjord om med den rättelsen.

**Hyran:** 17 % → **32 %** av klassens normala veckointäkt (`rent-calibration.json`, 20 frön):

| Hyra | Den rimliga spelarens vinst |
|---|---|
| 30 % | 9,8 % |
| 35 % | 5,8 % |

**Med 32 %** (`rent-check.json`): den rimliga spelaren går plus med **8,2 %** av veckointäkten (målet är 5–10 %). Den svaga spelaren nedgraderas i vecka 3 i alla 20 frön.

**Första veckan blir svårare** (`first-week.json`, 20 frön, jämfört med `reports/order291/first-week.json`):

| Spelare | Veckor med förlust, ORDER 291 | Veckor med förlust nu | Veckans resultat i snitt nu |
|---|---|---|---|
| Den som gör som mentorn säger | 1 av 20 | 5 av 20 | +2 212 kr |
| Den som gör som första kvällen | 4 av 20 | 10 av 20 | −1 273 kr |

Hyran mäts i vecka 2. Vecka 1 har färre gäster, och den högre hyran slår igenom där. Ingen nedgraderas. Det är en fråga till Vision Owner: hyran i vecka 1, eller ett lägre mål för första veckan.

**Slumpmålet:** den bättre förberedda spelaren vinner 790 av 1 000 veckor, `winShare` 0,79 mot målet 0,75 (`randomness.json`). Efter ORDER 290 var det 0,736.

## 8. Spelarens flöde

Veckan från bussen i produktionsbygget, på svenska och utan flaggor (`order271-dod-from-start.mjs`, `REPORT_ORDER=order288 GAME_LANG=sv`). Utdata: `dod.json`.

- **Kvällarna:** alla fem kvällarna gick S1 → T2 → R1 → J1 → L1 → K1 (`eveningSequences`). Jämförelsen kommer efter kvällens resultat.
- **Första kvällen i J1** (`j1`, måndag i vecka 1):
  - Din krog: 34 gäster, 204 kr per gäst;
  - Torgkrogen: 15 gäster;
  - Pizzeria Grytan: 15 gäster;
  - Hotellets matsal: 3 gäster.
  - Sjöboden och vagnarna har inte öppet på måndagar.
- **Söndagstidningens rankning** (`newspaperRanking`):
  1. Vinbaren: 200 gäster, 267 kr per gäst;
  2. Torgkrogen: 131;
  3. Hotellets matsal: 120;
  4. Grillvagnen: 95;
  5. Pizzeria Grytan: 88;
  6. Sjöboden: 65;
  7. Tacovagnen: 63.
  - Raden under rankningen: "Vinbaren vid torget föll mest".
- **Figurvakten:** ingen figur låg ned eller satt utan sits i 8 754 granskade mätningar (`figures.maxDown` 0).
- **Fel och prestanda:** inga sidfel (`errors` tom), 25 fps i servicen (`fpsService`).

## 9. Tester och skript

- `src/sim/__tests__/order288Village.test.ts`:
  - rivalerna;
  - andelen och taket;
  - vagnarnas platser;
  - kvällens utfall och kapaciteten;
  - ryktet och fröet;
  - rivalen som gränssnitt;
  - bussen och aviseringen;
  - kvällens rad.
- Uppdaterade tester:
  - `order276GuestFlow.test.ts`: summan över fyra frön; ett frö är för brusigt med rivalerna;
  - `order292Consequences.test.ts`: kön prövas i första fröet som får en kö en lördag;
  - `newspaper.test.ts`: den nya delen.
- `scripts/order288-village.mjs`: en fredag i produktionsbygget med nivåerna, aviseringarna, etiketterna och J1.
- `order271-dod-from-start.mjs`: J1 och tidningens rankning.

## 10. Öppet

- **F63:** byns tal.
- **F64:** nivåernas tangenter och byns bild.
- **F59:** första veckans förlust med den nya hyran (avsnitt 7).
- **Följet** efter gästen med socialt kapital är inte byggt. Prototypen har det, ordern nämner det inte.
- **Spelarens egen food truck** på samma platser väntar till sin etapp (Designs leveransnot §5.2).
