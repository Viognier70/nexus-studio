# ORDER 293 — Teatern (rapport)

**Ordern** (Vision Owner 2026-10-01, efter 288): Designs leverans 3 (händelserna) och vardagens koreografi.

**Inkopierat**, båda granskade och godkända:
- `documentation/leveranser/nexus-leverans-2026-09-29-handelserna/`;
- `documentation/leveranser/nexus-leverans-2026-10-01-vardagens-koreografi/`.

Vardagens versioner av de gemensamma filerna gäller. Ordern omfattar:
- de fem händelserna med kameran, strålkastaren och rätt och fel slut;
- Per som värd i dörren, med Designs plats, klipp och köplatser;
- ritualerna, mise en place och personalens små stunder (LEVERANSNOT §4 och §6);
- otålighetens gränser i `balance.ts`.

Gren `order-293` från `main` (`feb5671`). Talen pekar på filer under `frontend/reports/order293/`.

## 1. Leveranserna in i koden

**`figureClips.ts` och `tableware.ts`** var oförändrade sedan förra leveransen och ersattes med vardagens versioner. Två avvikelser:
- Två oanvända variabler i klippen fick nya namn, eftersom `noUnusedLocals` annars stoppar bygget.
- Brödkorgens höjd är rättad till den uppmätta, 0,086 m. Leveransen angav 0,09, och `measureProp` tillåter 2 mm.

**`wineBarRoom.ts`** är sammanslaget tre vägar: leveransen 2026-09-28 som bas, spelets fil och vardagens fil. Spelets egna ändringar står kvar (fotringen, loungebordet på 4,15 m, ytornas höjder). Nytt från Design:
- köplatserna och platserna för mise en place;
- värdpulten och trottoaren;
- tavlan och vinkylen.

**Pers kostym** är `#4a4243`, inte Designs `#2e2a2b`. Designs färg låg utanför rummets kontrastband mot golven (4,0–4,9 mot bandet 1,8–3,6, `checkPaletteAgainstFloors`). `#4a4243` är den mörkaste som ligger inom bandet.

**Strängarna** är inslagna i `STRINGS` via `content/design/eventStrings.ts`, `theatreStrings.ts` och `everydayStrings.ts`. Leveransens `everydayStrings.ts` gick inte att kompilera: rad 7 hade prototypens huvud inklistrat. Det är rättat i spelets kopia; leveransen är orörd.

**Manusen.** `handelserManus.js` är inkopierad oförändrad med en typfil (`scene/events/`). `vardagManus.js` är, som leveransen säger, en mall och inte monterad. `teaterScen.js` är portad till `scene/eventTheatre.ts` (avsnitt 3).

## 2. Vardagens koreografi i rummet

`scene/wineBarDirector.ts`, `theatreClips.ts`, `WineBarFigures.tsx`.

**Per, hovmästaren**, är en egen figur med en egen ring (rollen `host`). Han tar över dörren från sommeliern:
- Vid pulten läser han bokningarna (`host.checkBook`).
- När ett sällskap kommer kliver han fram och hälsar (`host.greetDoor`).
- Står någon otålig i kön går han ut och pratar med dem (`staff.chat`). De lugnar sig i 6 s, så länge simuleringen inte låter dem gå.
- Han går före sällskapet till bordet och räcker över menyerna (`host.presentMenu`).
- Övertagandet efter ett fel i rollen `värd` är nu Per.

**Kön** står på Designs köplatser: två på dörrmattan och fem på trottoaren.
- Ett sällskap per plats, med medlemmarna inom 0,6 m.
- Sällskapet ställer sig där någon i sällskapet redan står.
- När en plats blir tom flyttar kön fram en plats.
- De uträknade köplatserna från ORDER 292 är borta.

**Köns klipp** väljs efter tålamodet:
- `guest.queueCalm` över 0,55;
- `guest.queueImpatient` under 0,55;
- `guest.queueLeaving` under 0,20.

Gränserna står i `balance.ts` (`QUEUE_MOOD`), som ordern säger, och läses av `figureActs.ts`.

**Ritualerna** när sällskapet har landat:
- servitören ställer fram bröd (`waiter.setBread`) och häller upp vatten (`waiter.pourWater`);
- i loungen serverar sommeliern fördrinken (`waiter.serveAperitif`);
- baren har inget bröd.

**Mise en place** före dörrarna:
- Per skriver på tavlan (`staff.writeBoard`);
- servitören dukar småborden (`waiter.setTable`);
- sommeliern fyller vinkylen (`bar.stockFridge`);
- bartendern och den andra servitören putsar glas (`bar.polishGlass`).

När dörrarna öppnar håller Per dörren i 4 s.

**Personalens små stunder.** En servitör eller sommelier utan uppgift får en stund med syfte, i Designs ordning:
1. kontrollera ett dukat bord (`staff.checkTable`);
2. torka det (`staff.wipeTable`);
3. fylla på vatten vid ett upptaget bord.

Bartendern torkar disken som förut.

**I produktionsbygget:**
- `scene-01-fore-oppning.png`: personalen vid sina platser 18.18.
- `scene-11-kon.png`: kön utanför dörren, med Per hos sällskapen.
- `figures.json`: en fredag med 171 granskade mätningar. Ingen figur låg ned eller satt utan sits (`maxDown` 0).

## 3. Händelserna som teater

**I raketbanken** (`content/incidents/vinbar.*`), genererade ur Designs `eventStrings.ts` och manusens svarstabeller:
- vb32 födelsedagen;
- vb33 vasen;
- vb34 gästen som vinglar;
- vb35 tillsynen;
- vb36 gästen vid passet.

Svaren följer manusen: rätt, försvarbart (`ok`) och fel. Förklaringen till ett försvarbart svar är dess `near3`, annars stegets `why`. Tillsynens påföljd står per felsvar, och erinran och varning sänker ryktet.

**Tillsynen** är fyra raketer i en familj, högst en per kväll. Varianten väljs i Designs ordning: A efter den nekade gästen, B med studenter i rummet, D när köket har slut, annars C (`sim/incidents.ts` `inspectionVariant`).

**Teatern** (`scene/eventTheatre.ts`) är en port av Designs `teaterScen.js`. Manuset blir en tidslinje per figur: klipp, vägar, sitsar, blick och rekvisitans händelser. Vasen som faller, ljuset som faller och kritan är med. Samma tid ger samma bild.

Teatern spelar i spelets vinbar, i rummets koordinater. Rummets egna figurer vilar medan scenen spelas.

**Raketen styr manuset** (`scene/theatreEvents.ts`):
- Kortet väntar på uppbyggnaden. Introt är manusets första fråga, `THEATRE.eventAskSeconds`.
- Manuset står still vid varje fråga tills spelaren har svarat.
- Svaret visas medan scenen spelar fram till nästa fråga.
- Ett fel byter till manusets felvariant för steget, och scenen spelas klart.
- Kamerans takter flyttar spelets kamera, med lounge-vinkeln och kameran som följer Sara. Den går tillbaka till spelarens vinkel när scenen är slut.
- Strålkastaren sänker rummets ljus till 45 % och lägger en ljuspöl under den som gör något.
- Kortet visar manusets roll och plats, till exempel "Hovmästaren · lounge A".
- Efter ett fel tar Per över.

**I produktionsbygget** (`events.json`, `scripts/order293-events.mjs`): åtta körningar, alla spelade till slutet.

| Händelse | Rätt | Fel |
|---|---|---|
| Födelsedagen | ✓ | i steg 2 |
| Vasen | ✓ | i steg 1 |
| Gästen som vinglar | ✓ | — |
| Tillsynen, variant C | ✓ | — |
| Gästen vid passet | ✓ | i steg 3 |

- Kameran stod på 10–13 m under scenen och 23–24 m efteråt (`shots[].cam`).
- Ingen figur låg ned (`maxDown` 0 i alla åtta), och inga sidfel.
- Bilderna `events-*.png` står bredvid Designs kontrollbilder, till exempel `fodelsedagen-2-12m-fragan` mot `events-fodelsedagen-ratt-00-uppbyggnaden.png`.
- Händelserna köas där med provspelets flagga `#playtest=1&rocket=<id>` (`QUEUE_INCIDENT`). Spelarens egen väg är veckan från bussen (avsnitt 5), där händelserna dras som andra raketer.

## 4. Balansen

Raketbanken har åtta nya raketer, som dras som de andra:
- **Slumpmålet** (`randomness.json`, 1 000 veckor): den bättre förberedda spelaren vinner 809 veckor, `winShare` 0,809 mot målet 0,75. Efter ORDER 288 var det 0,79.
- **Hyran** (`rent-check.json`, 20 frön, hyran 32 %): den rimliga spelaren går plus med 8,1 % av veckointäkten (målet är 5–10 %). Den svaga nedgraderas i vecka 3 i alla frön.

## 5. Spelarens flöde

Veckan från bussen i produktionsbygget, på svenska och utan flaggor (`order271-dod-from-start.mjs`, `REPORT_ORDER=order293 GAME_LANG=sv`). Utdata: `dod.json`.

- **Kvällarna:** alla fem kvällarna gick S1 → T2 → R1 → J1 → L1 → K1.
- **Figurvakten:** ingen figur låg ned eller satt utan sits i 8 329 granskade mätningar (`figures.maxDown` 0). Den räknar också händelsernas figurer när de spelar.
- **Fel och prestanda:** inga sidfel (`errors` tom), 24 fps i servicen (`fpsService`).
- **Tidningens rankning:** vinbaren först med 176 gäster (`newspaperRanking`).
- **Saknas:** skriptet antecknar raketerna bara den första kvällen (`rockets`). Vilka av händelserna som drogs under veckan är därför inte redovisat; det redovisas i `events.json` (avsnitt 3).

## 6. Tester och skript

- `scene/__tests__/order293Theatre.test.ts`:
  - alla manus och varianter går att ladda och spela, och varje klipp finns;
  - sitsarna i manusen finns i vinbaren;
  - kortets takter;
  - de fem händelserna i banken;
  - tillsynens variant.
- Uppdaterade tester: klippen 46 → 107, föremålen 17 → 31, raketerna 31 → 39 (`order286aTheatre.test.ts`, `order270Incidents.test.ts`).
- `scripts/order293-events.mjs`: händelserna i produktionsbygget.

## 7. Öppet

- **F65**: teaterns tal och förenklingar.
- **Brevet från kommunen** i morgonens post (tillsynens påföljd) är inte byggt. Påföljden står i kvällens resultat och sänker ryktet.
- **Variant A:s "nekad, men tiden skrevs inte upp"** är inte byggd. Det kräver att den vinglande gästens anteckning följer med till tillsynen.
- **Saknade felvarianter.** Födelsedagen har bara fel i steg 2 i manuset. Ett fel i ett annat steg spelas med den närmaste felvarianten.
- **Rummets andra gäster syns inte** medan en händelse spelas. Manusen har sina egna gäster.
- **Rocken som rekvisita** väntar, som Designs beslut 2026-10-01 säger.
