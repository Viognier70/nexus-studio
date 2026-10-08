# ORDER 320: sex nya situationer vid foodtrucken

**Beställare:** Anders 2026-10-08:
- `documentation/blueprints/ORDER_320_FOODTRUCK_SITUATIONER.md`;
- Designs D10, uppackad oförändrad i `documentation/leveranser/nexus-leverans-2026-10-08-d10-vid-vagnen/`. Det är omtaget samma dag, ur `Restaurant guest animation (37).zip`, med stamgästen vid vår vagn;
- beslutet om priserna och korven ("Priserna i balance.ts ska stämma med räkneuppgifterna i ORDER_320 …").

**Formen från 306b:** reglerna A1–A3 från grenen `order-306b` (`febcb99d`, och underlaget `SITUATIONER_306b.md`) är inmergade i 320, eftersom situationerna kräver dem. Resten av 306b fortsätter efter 320.

Talen står i `frontend/reports/order320/`:
- `sasonger.json`: 40 säsonger à 3 veckor;
- `jamforelse.json`: målen från 315c, i 40 säsonger per spelartyp;
- `check-sv.json`: kontrollen i spelet.

## Situationerna

De sex står i leveransen `src/content/incidents/foodtruck/situationer320.*` och har frågorna 22–39.
- **Svenska:** ordagrant ur ordern.
- **Engelska:** översatt av mig.
- **Följderna** i rummet har samma storlek som i `bas`.

| Id | Situation | Det som syns först (`cue`) | När den kan komma (`sim/truckSituations.ts`) |
|---|---|---|---|
| ft08-regnet | Regnet | Regnet börjar | Just när det har börjat regna (`TRUCK_SITUATIONS.rainWindowE`) |
| ft09-getingen | Getingen | Getingar vid ketchupen och en burk på bord A | En solig kväll när någon äter vid ett ståbord |
| ft10-kortet | Kortläsaren | Ringen blinkar och HUD-nålen visar "Ingen kontakt. Försök igen." | Minst `cardAtHatch` (6) väntar eller beställer |
| ft11-slut | Korven tar slut | Lådan visar få korvar | Högst `SAUSAGE.lowAt` (12) korvar kvar och minst `queueAtLow` (9) vid luckan |
| ft12-hunden ⚖ | Hunden | En hund i koppel vid ståbord A | När någon äter vid ett ståbord och det inte regnar |
| ft13-priset | Grillvagnen sänker priset | Grillvagnens nya skylt med HUD-nålen | När Grillvagnen står på torget (torsdag och fredag) |

**Formen från 306b:**
- **Fel i ett steg** avslutar inte situationen.
- **Potten** går 1 → 3 → 7.
- **Steg 3** har ett helt grepp, ett halvt mot analysen, ett halvt mot upplevelsen och ett fel, med kostnaden i kronor (`cost`).
- **Kostnaderna** är mina förslag:
  - tråg med lock i ft08: 40 kr;
  - kvällens skuld i ft10: 95 kr, alltså en nota;
  - kaffet i ft13: 20 kr.
- **Gästens två repliker** (`guestLine`) lottas, och samma variant visas aldrig två gånger i rad (`IncidentsState.lastLines`).
- **Ledtrådarna** (`clue`) står ovanför frågan i steg 2 och 3. Efter ett fel står "(oklart)".
- **Alternativen blandas** varje gång situationen visas (`sim/incidents.ts optionOrder`). Det gäller situationerna med repliker, alltså de sex nya. Situationerna i `bas` står kvar i sin ordning tills de får 306b-formen.

**⚖ i ft-hunden:** bara lagtexten döljs.
- Situationen visas.
- Förklaringen till det rätta svaret i steg 1 ("Djur ska hållas borta från där livsmedel hanteras …") ersätts av "Förklaringen granskas och visas senare." tills `legalText.legalReviewed` sätts till `true` (`incidentBank.ts optionExplanationHidden`).

**Takten:**
- **Aldrig samma situation två kvällar i rad om det finns andra:** förra servicekvällens situationer (`previousEvening`) kommer bara när ingen annan kan komma just då.
- **Rättat på vägen:** loggen tömdes över natten innan den sparades, så regeln bet inte först. Nu sparas den vid dagsskiftet (`reducer.ts`).

## Talen i räkneuppgifterna

I `balance.ts`:
- **`TRUCK_MENU`:** halv special 35 kr och inköpet för en halv special 12 kr (`goodsHalfSpecial`).
- **`RIVAL_PRICES`:** Grillvagnens halv special 25 kr.
- **`SAUSAGE`:**
  - kvällen börjar med 60 korvar;
  - "få kvar" från 12;
  - situationen kan komma när högst 12 är kvar och minst 9 står i kön;
  - en tredjedel tar hel special, med två korvar.

**Testet `sim/__tests__/order320Talen.test.ts`** räknar fram talen i ft-priset och ft-slut ur `balance.ts`, på svenska och engelska. För ft-priset gäller det 25, 35, 12, 23, 13, 10 och kvoten 1,8. För ft-slut gäller det tolv, nio, var tredje, sex, tre, 6 + 6 = 12 och arton. Testet fallerar:
- om ett tal i texten inte går att räkna fram;
- om ett tal som uppgiften bygger på saknas;
- om kön och andelen hel special inte längre ger precis lådans "få kvar".

**Menyn på skylten** (D10 `truckMenu.ts`, `TruckMenuCard.tsx`) har åtta rader. Priserna jag har satt:

| Rad | Pris |
|---|---|
| Grillad korv | 30 kr |
| Halv special | 35 kr |
| Tunnbrödsrulle | 75 kr |
| Korv med mos | 50 kr |
| Vegokorv (ny) | 30 kr |
| Mild senap (ny) | utan pris |
| Läsk | 20 kr |
| Kaffe (ny) | 20 kr |

## Scenen (D10)

**Föremålen** (`playerTruck.ts`, `truckPropsD10.ts` oförändrad):
- vegodelen på grillens västra del bakom en list, med två vegokorvar och egen tång med mässingshandtag. Den ersätter min vegodel från 319b del 3, som låg i östra änden;
- korvlådan, med korvarna kvar ur simuleringen och papper på de tomma platserna;
- de tre såserna med lock;
- betalhyllan med kortläsaren och Swish-skylten;
- vattenskålen.

**Vattenskålen** stod i D10 på vägen till ätplatsen B-E, 0,03 m från den. Nu står den på norra sidan av ståbord B (`truckProps.ts WATER_BOWL_AT`). Föremålen mot vägarna står i `reports/order319c/platsen.json`: 16 föremål, inget närmare en väg än 0,22 m.

**Situationerna i bild** (`TruckSituationsScene.tsx`, `PlayerTruckCrew.tsx`):

| Situation | Det som syns |
|---|---|
| Regnet | Ståbord A bärs in under markisen efter ett helt grepp. Tråget räcks ut med locket stängt. Kön står tätt under markisen (`QUEUE_TIGHT`) med armarna in. |
| Getingen | Getingar i öglor, sju gånger verklig storlek, kring ketchupen och burken. Gästen vid bord A stelnar till. Efter lock på såserna flyger getingarna vid hyllan i väg. |
| Kortläsaren | Gästen håller fram kortet och försöker igen, och Nils lutar sig ut och trycker. Efter ett helt grepp visas Swish-nålen, och Nils pekar på skylten. |
| Korven | Grillaren tar korv ur lådan. Han byter också till vegotången och vänder vegokorven med jämna mellanrum. |
| Hunden | En hund i koppel vid ståbord A, och gästen tar ett steg åt sidan. Efter ett helt grepp dricker hunden vid vattenskålen och lägger sig. |
| Grillvagnen | Skylten med gul lapp och HUD-nålen "Halv special 25 kr". Stamgästen står vid vår vagn (`TRUCK_REGULAR`) med kaffet som spelaren bjöd på. Var sjätte sekund dricker hen och skålar sedan mot skylten (`guest.toastCup`). |

**Klippen:** D10 levererade 25 klipp som längd och anteckning, utan poser. De 20 för människorna har jag skrivit själv (`figureClips.ts`, nu 172 klipp). `fika.sipCup` fanns redan. Getingarna och hunden är egna modeller i scenen.

**Förenklat:**
- Nils bär inte bordet i regnet. Bordet glider in under markisen.
- Ingen äter vid det flyttade bordet. Platserna i regnet är fortfarande hyllan.
- Gästen backar inte från getingen. Hen stelnar till.

## 40 säsonger (`reports/order320/sasonger.json`)

Mätningen gäller 40 säsonger à 3 veckor, alltså 720 kvällar, med rätt svar.

**Olika situationer per kväll:**
- Kvällarna som inte föll ihop (600) fick 4 (583 kvällar) eller 5 (17 kvällar), i medel 4,03.
- Alla kvällar fick i medel 3,76 (`distinctPerEvening`).
- Ingen situation kom två gånger samma kväll.

**Samma situation två kvällar i rad:** 176 av 680 kvällspar (25,9 %) hade minst en situation som kom också kvällen före, i medel 0,3 per par (`repeats`). Det händer när ingen annan situation kan komma just då.

**Hur många kvällar varje situation kom** (`perSituation`):

| Situation | Kvällar |
|---|---|
| ft03-rullen | 416 |
| ft01-rusningen | 374 |
| ft10-kortet | 368 |
| ft04-leveransen | 323 |
| ft02-drycken | 311 |
| ft07-ursprunget | 310 |
| ft12-hunden | 225 |
| ft09-getingen | 128 |
| ft13-priset | 107 |
| ft11-slut | 76 |
| ft08-regnet | 72 |

- **Regnet** kom bara regnkvällar.
- **Getingen** kom bara soliga kvällar.
- **Gästens replik** kom 740 gånger i en situation som redan kommit i säsongen, och aldrig med samma variant som förra gången (`lines`).

## Målen från 315c (`reports/order320/jamforelse.json`)

Jämförelsen gäller samma 17 körningar à 40 säsonger som i 315c:s sista kontroll (`scripts/order320-harness.sh`, `order320-jamforelse.mjs`).

| Mål (315c) | 315c | Nu | |
|---|---|---|---|
| Den som ignorerar når vinbaren i högst 2 | 0 | 0 | ✓ |
| 0,85 når vinbaren vecka 2–3 | vecka 3 | vecka 2 | ✓ |
| 0,85 når bistron vecka 4–5 | 30, vecka 5 | 35, vecka 4 | ✓ |
| 0,85 får stjärnan i ungefär 50 % | 20 | **30** | ✗ för många |
| 0,6 når vinbaren i minst 15 | 14 | **7** | ✗ för få |
| 0,6 når sällan bistron | 0 | 0 | ✓ |
| 0,75 får stjärnan (3 av 40 godtas) | 2 | **5** | något över |
| Halva når aldrig bistron och får aldrig stjärnan | 0 och 0 | 0 och 0 | ✓ |
| Den slarviga lämnar aldrig foodtrucken | 0 | 0 | ✓ |
| Den kloka och mentorn når bistron och är bland de tre bästa | 40 och 40, 98 % | 40 och 39, 98 och 97 % | ✓ |

**Vad det betyder:**
- **Den som kan går fortare igenom foodtrucken:** vinbaren i vecka 2 i stället för 3. Det beror på fler situationer, bättre fördelade, med halvt grepp i steg 3. Därför kommer stjärnan oftare.
- **Den som har 0,6 rätt klarar färre:** den når de sex klarade situationerna (`FOODTRUCK.offerMinSituations`) mer sällan.
- **Jag har inte kalibrerat om**, eftersom du beslutade "ingen mer kalibrering före provspel".
- **Om stjärnan ska tillbaka mot hälften** kan erbjudandet om vinbaren kräva fler klarade situationer, eller fler kvällar (`offerMinEvenings`). Det beslutet är ditt.

## 306b A4: alternativens längd

Kontrollerat mot texten i ordern:
- **Steg 3:** i alla sex situationer är något alternativ mer än 1,5 gånger så långt som det kortaste. Kvoterna är 1,6–2,5, och det hela greppet är ofta det längsta.
- **ft13 steg 1:** det rätta svaret har 13 ord (gränsen är 12).

Texten är din, så jag har inte ändrat den. Valideringen för A4 hör till resten av 306b.

## Prövningen

- **`sim/__tests__/order320Situationer.test.ts`** (9 test):
  - banken och formen;
  - ⚖ i ft-hunden;
  - de blandade alternativen;
  - utlösarna;
  - korven i lådan;
  - förra kvällens situationer.
- **`sim/__tests__/order320Talen.test.ts`** (3 test): talen i ft-priset och ft-slut.
- **`testHarness/__tests__/order320Sasonger.test.ts`:** de 40 säsongerna.
- **Ändrade test:**
  - `order286aTheatre`: 172 klipp;
  - `order319aFoodtruckBank`: frågorna 22–39;
  - `order319bCurious`: D10:s menyrader.
- **Hela sviten:** 2 631 test gröna.

## Kontrollen i spelet (`reports/order320/check-sv.json`)

`frontend/scripts/order320-check.mjs` spelar kvällar i spelarens flöde i 4×, i produktionsbygget. Den varierar väder, veckodag och frö tills alla sex situationerna har kommit, högst tolv kvällar. När en situation kommer tar den kontrollbilder av förvarningen, kortet, steg 2 och utfallet, och svarar rätt i varje steg.

**Fyra av de sex kom under de tolv kvällarna:**
- **Kortläsaren:** nålen "Ingen kontakt. Försök igen.", gästen med kortet och, efter rätt svar, Swish-nålen.
- **Hunden:** vid ståbord A, och efter rätt svar vid vattenskålen.
- **Grillvagnen:** skylten och nålen "Halv special 25 kr".
- **Getingen:** locken på såserna efter rätt svar.

**I alla fyra:**
- steg 2 visade gästens replik och ledtråden från steg 1;
- svaren var blandade;
- utfallet blev ett helt grepp.

**Regnet och korven kom inte.**
- Regnet kan bara komma strax efter att det har börjat regna, och korven bara mot slutet av en kväll med lång kö. Det är sällan: 72 och 76 av 720 kvällar i mätningen.
- Båda prövas i simuleringen: utlösarna i `order320Situationer.test.ts` och kvällarna i `sasonger.json`.
- Kontrollen redovisar `ok: false`, eftersom de två saknas i spelet. Det står som det är.

**Getingarna** syns knappt på krogens 12 m. D10 säger själv att de syns på 6 m eller närmare.

## Kvar till Anders

1. Målen från 315c: stjärnan för 0,85 och vinbaren för 0,6 (ovan).
2. ⚖ i ft-hunden: lagtexten ska granskas.
3. A4: alternativens längd i ordern.
4. Kostnaderna i steg 3 och menyns priser.
**Avgjort av dig 2026-10-08:**
- stamgästen står vid vår vagn;
- getingarna ritas sju gånger verklig storlek;
- kortläsaren blinkar i mässing;
- den milda senapen står på hyllan.
