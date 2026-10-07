# ORDER 315c — foodtruckens situationer och kalibreringen från foodtrucken

**Underlag:** `ORDER_315_FORSLAG.md` §3 (målen) och §4 (frågorna), `~/Downloads/BESLUT_2026-10-07.md` del 3 (de 20 frågorna med ändringar), och Anders beslut om 315c 2026-10-07 (fyra omgångar).
**Gren:** `order-315c` från `main` (`d934909c`, efter 315b del 2–3).

Varje tal pekar på en fil under `frontend/reports/order315c/`.

## 315b finns på main

315b del 2–3 är mergad till `main` (`d934909c`, "Merge branch 'order-315b-2'") och pushad. Kontrollerat i `main`:
- texten på erbjudandekortet: `asa.row.closed` "Bistron håller stängt {days} kvällar under ombyggnaden" (`content/design/dinVagStrings.ts`);
- musikhörnan med skivspelaren i bistron (`scene/wineBarRoom.ts`, `musicTurntable`);
- foodtrucken på krogens nivå i 3D (`scene/village/PlayerTruckCrew.tsx`, `setMyBusinessOverride`), och den gamla 2D-scenen borta (`StrategicApp.tsx` har inte längre `truck-room`).

## 1. Foodtruckens situationer

- Anders 20 godkända frågor med ändringarna (fråga 4: korvens egna allergener; fråga 9: "och inte längre än några timmar"; den nya frågan om "Tillverkad i Sverige" i stället för dubbletten av 17), som sju situationer om tre steg i förslagets gruppering (`content/incidents/foodtruck.meta.json`, `foodtruck.text.sv.draft.json`, `foodtruck.text.en.json`; fältet `questions` ger frågornas nummer).
- **Spelbara:** Rusningen (7, 8, 16), Drycken till (5, 13, 18) och Rullen (1, 12, 19).
- **Dolda tills de är granskade** (`legal.legalReviewed: false`, `sim/incidentBank.ts legallyCleared`): Leveransen (10), Allergin (4, 15), Stängningen (9, 20) och Ursprunget (3).
- Förklaringarna och följderna i rummet är mina texter och väntar på Anders granskning. Referenserna står tomma.
- Utan bord gäller följderna alla som står vid vagnen (`sim/incidents.ts targetsFor`), så talen är omkring en tredjedel av vinbarens per bord. En klarad situation ger +1 i rykte, ett fel i steg 3 −0,5, och när personalen tar över −0,5.
- Med banken har foodtrucken situationer i stället för de gamla scenarierna vid dörren (deras kassa gav också den som alltid svarar fel ett plus).

## 2. Kalibreringen

- **Harnessen börjar i foodtrucken** (`KARNAN_START=foodtruck`, förval; `startInFoodtruck`). Före 315c började varje säsong i vinbaren, så stegens mål var aldrig mätta från början.
- **Gästerna vid vagnen:** `FOODTRUCK.guestCapFactor` 7 → 4,5. Med 7 tjänade 0,85 omkring 21 000 kr i veckan (förslaget: 12 000) och ryktet sjönk mot 0,2 av kön; med 4,5 omkring 11 000 kr.
- **Vinbarens krav i foodtrucken** (Anders beslut): minst `FOODTRUCK.offerMinSituations` = 6 klarade situationer (halvt grepp 0,5; tills 306b inför halvt grepp räknas ett "ok" i sista steget som halvt) och minst `FOODTRUCK.offerMinEvenings` = 10 kvällar i foodtrucken (`sim/ladder.ts missingFor`, `truckSituations`, `truckEvenings`). Båda visas på Din väg.
- **Den kloka och mentorn** tar proven mot bistrons medaljer (silver i Metodköket, brons i Stensöta) med kunskapen 0,8.
- **Platsen i byn** mäts från vecka 4 (kvällens jämförelse: nöjda gäster, sedan intäkten): andelen kvällar bland de tre främsta och medelplatsen.

Vägen dit (40 säsonger per rad):

| Omgång | Ändring | Ignorerar når vinbaren | 0,6 når vinbaren | 0,85 stjärna |
|---|---|---|---|---|
| `prov40` | guestCapFactor 5 | 14 | 7 | 26 |
| `prov40f` | rykte: återhämtning mot 45, +3 | 4 | 10 | 19 |
| `omg1` | Anders: rykte som förut, krav 8 situationer | 0 | 15 | 20 |
| `omg2` | 6 situationer | 0 | 17 | 17 |
| `efter40` | 6 situationer och 10 kvällar | 0 | 14 | 20 |

## 3. Målen i sista kontrollen (`reports/order315c/efter40/`)

| Mål | Utfall av 40 | |
|---|---|---|
| Den som ignorerar når vinbaren i högst 2 | 0 | ✓ |
| 0,85 når vinbaren vecka 2–3 | vecka 3 (median) | ✓ |
| 0,85 når bistron vecka 4–5 | 30, vecka 5 | ✓ |
| 0,85 får stjärnan i ungefär 50 % | 20 | ✓ |
| 0,6 når vinbaren i minst 15 | 14 | godtaget som brus (Anders 2026-10-07) |
| 0,6 når sällan bistron | 0 | ✓ |
| 0,75 får stjärnan (3 av 40 godtas) | 2 | godtaget som brus |
| Halva når aldrig bistron och får aldrig stjärnan | 0 och 0 (39 stannar i foodtrucken) | ✓ |
| Alltid fel lämnar aldrig foodtrucken | 0 | ✓ |
| Den kloka och mentorn når bistron och är bland de tre bästa | 40 och 40; bland de tre bästa 98 % av kvällarna | ✓ |

## 4. Verifiering

- `src/sim/__tests__/order315cFoodtruck.test.ts`: banken (sju situationer, validerad på båda språken), de dolda och de spelbara, Anders ändringar i frågorna, kraven på situationer och kvällar.
- `order270Incidents.test.ts`: klassen utan bank i provet är nu ölkrogen. `order315aStegen.test.tsx`: erbjudandet om vinbaren med de nya kraven.
- Hela sviten grön, bygget grönt.

## Kvar

- Anders granskar förklaringarna och följderna i foodtruckens situationer, och de ⚖-märkta frågorna mot Livsmedelsverkets råd.
- 306b: situationerna i formen analys → upplevelse → handling (`SITUATIONER_306b.md`), med halvt grepp på riktigt.
