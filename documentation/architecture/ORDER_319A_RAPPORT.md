# ORDER 319a: rätta det som är trasigt vid foodtrucken

**Underlag:** Anders beslut 2026-10-07 efter provspel av `b412a276`, `documentation/blueprints/ORDRAR_319_D9.md`, och Anders beslut om 319a.3 samma dag.
**Gren:** `order-319a` från `main` (`b412a276`).

Alla tal nedan kommer ur rapportfilerna i `frontend/reports/order319a/`. Spelet går före resten av 306b, som ligger på grenen `order-306b` (steg 1 committat, `febcb99d`).

---

## 319a.3: foodtruckens situationer

### Vad mätningen visade (före ändringen)

- **Situationerna var inbyggda (315c), men bara 3 av 7 var med i spelet.** Ett ⚖-märke dolde hela situationen, så frågorna 2, 6, 11, 14 och 17 försvann med ⚖-frågorna.
- **Kvällarna fick högst 3 situationer.** En situation kommer bara en gång per kväll, så tre situationer gav ett tak på 3, trots att kvällen planerade 4–6.

### Anders beslut, som de är byggda

1. **Omgrupperade frågor.** De 15 frågorna utan ⚖ (inklusive 21) ligger nu i fem situationer, i ordningen episteme → phronesis → techne (`form: 'triad'`):

   | Situation | Frågor |
   |---|---|
   | Rusningen | 7, 16, 8 |
   | Drycken till | 5, 18, 13 |
   | Rullen | 1, 19, 12 |
   | Leveransen | 6, 17, 14 |
   | Ursprunget | 2, 21, 11 |

   De sex ⚖-frågorna ligger i två egna situationer, Allergin (4, 15, 10) och Stängningen (3, 20, 9), som är dolda tills de är granskade. Id:na är desamma som förut.
2. **Ett ⚖-märke döljer aldrig frågor utan ⚖.** Valideringen i `sim/incidentBank.ts` stoppar en situation som blandar ⚖-frågor och andra frågor, och en ⚖-fråga som saknar granskningsstatus. Testet ligger i `sim/__tests__/order319aFoodtruckBank.test.ts`.
3. **Kvällarna med 0–2 situationer** beskrivs nedan.
4. **Nya situationer läggs in som filer.** Varje leverans är tre filer i `src/content/incidents/foodtruck/`:
   - `<namn>.meta.json`
   - `<namn>.text.sv.draft.json`
   - `<namn>.text.en.json`

   Banken läser alla leveranser (`import.meta.glob`) och validerar dem tillsammans. Id och frågenummer måste vara unika över alla leveranser. Formen beskrivs i `README.md` i samma katalog. Den första leveransen heter `bas`.
5. **De sex ⚖-frågorna att granska**, med svar och förklaringar på svenska och engelska: `documentation/blueprints/GRANSKNING_319_FOODTRUCK_JURIDIK.md`. En kopia ligger i Hämtade filer.

### Situationer per kväll efter ändringen

Mätningen gäller 8 seeds × 2 veckor från foodtrucken, med rätt svar (`reports/order319a/situationer.json`):

| Kvällar | Antal | Situationer per kväll |
|---|---|---|
| Alla | 96 | medel 3,68 |
| Som inte kollapsade | 80 | 4 situationer 75 kvällar, 5 situationer 5 kvällar |
| Som kollapsade | 16 | medel 1,75 |

**Golvet styr antalet.** Situationerna kommer på golvets tider (`maybeOpenIncident`, `behind`). Chansen ur rummets tryck utlöser sällan någon vid vagnen, så kvällen hamnar i regel på golvet, 4, inte på 4–6.

### Orsaken till kvällarna med 0–2 situationer

Alla 16 kvällar under 4 situationer **kollapsade** (`day.serviceCollapsed`, `strategic/simulation/collapse.ts`, ORDER 046):

- Servicen tog slut mellan 17 % och 93 % av kvällens fönster (`collapsed.endedAt`), alltid på den kulturella axeln.
- Situationer som var planerade efter kollapsen kom aldrig.

Varför kollapserna sker:

- Risken räknas på lagets svagaste axel, och då gäller det bästa värdet i laget på varje axel.
- Foodtruckens lag är en kock (kulturell 0,2) och en lärling (kulturell 0,3), så det bästa värdet på den kulturella axeln är 0,3.
- Det ger en hög risk per tick, och 16 av 96 kvällar (17 %) kollapsar.

**Beslut behövs:**
- Ska kollapsen gälla foodtrucken?
- Ska lagets kulturella kompetens vara högre?
- Ska en kollapsad kväll fortfarande få sina situationer?

Jag har inte ändrat kollapsen.

---

## 319a.1: inga gäster som uppstår eller försvinner i bild

### Orsaken

`scene/village/PlayerTruckCrew.tsx` hade 17 dolda figurer på fasta platser. Varje bild tändes figurer i turordning efter gästernas läge, och de som blev över släcktes. Det gav tre fel:

- **Gästerna tändes på sin plats** i kön eller vid luckan och släcktes vid ståborden.
- **Figurerna hoppade mellan platserna** när någon i kön bytte läge.
- **Kläderna bytte figur**, eftersom de hörde till platsen och inte till gästen.

### Ändringen

**En figur per gäst, med gästens id som nyckel** (`scene/village/truckGuestFlow.ts`):

- Kläderna följer gästen.
- En ny gäst börjar på byns gångnät (`content/villageNetwork.ts`), från ett hus eller en plats minst 70 m bort.
- Gästen kliver in på vägen vid den sista punkten som ligger **minst 40 m från vagnen och utanför kamerans bild**, och går sedan till sin plats.
- När gästen går, går figuren till ett hus eller en gata. Den försvinner där den senast ritades, när den är minst 40 m bort och utanför bilden.
- Byter gästen plats i kön, går figuren dit.
- Figurerna går i spelets fart: 2× och 4× går fortare, och när spelet står still står de också still.

**Personalen** tänds och släcks inte längre med servicen. Den syns när vagnen syns.

### Prövningen

**Test** (`testHarness/__tests__/order319aGaster.test.ts`, `reports/order319a/gaster.json`):
- En kväll matas genom samma flöde.
- Krogens kamera ställs med samma funktion som i spelet (`truckCamera.ts`, `applyCameraState`), i 16:9 och 4:3.
- Resultat: 51 gäster börjar och 51 slutar, **0 i bild**, och den kortaste distansen till vagnen är 40 m.

**I spelet** (`scripts/order319a-check.mjs`, `reports/order319a/check-sv.json`):
- Produktionsbygget kördes som foodtruck. Varje gästfigur följdes bild för bild i 120 s mot spelets egen kamera.
- Resultat: 35 nya gäster (1440 × 900) och 16 nya gäster (1280 × 720), **0 dök upp eller försvann i bild och 0 närmare än 40 m**.
- Kontrollbilderna ligger i samma katalog.

**Kvar:** `lagShare` 0,22 i testet. I 22 % av tiden som en gäst beställer i simuleringen är figuren fortfarande på väg till luckan, eftersom den börjar minst 40 m bort.

---

## 319a.2: föremål som hoppar fram

| Vad | Orsaken | Ändringen |
|---|---|---|
| Folket på Torget (`LandmarkGatherers.tsx`) | Växte fram och krympte bort på stället mitt i bilden, 7 m från vagnen, och drev genom kön | Går bara när ingen ser det, kommer bara till en plats utanför bilden och håller sig minst 10 m från vagnen. Står redan där när scenen visas. |
| Gående och cyklister (`OsmPedestrians.tsx`) | Bytte väg genom att försvinna och växa fram på en ny plats | Byter bara när varken den gamla eller den nya platsen syns |
| Bilarna i byn (`OsmTraffic.tsx`) | Samma, och de tonades bara in, aldrig ut | Samma ändring |
| Byns gående (`VillageLife.tsx`) | Alla tändes och släcktes vid 20 m från kameran | Tonas in mellan 16 och 26 m |
| Vagnens tak, skylt och skorsten | Försvann vid 20 m. Taket delar material med vagnens kropp. | Tonas över 17–23 m, med en egen kopia av materialet |
| Markisen | Hoppade till 50 % vid 14 m | Tonas över 12–16 m |
| Husens detaljnivå (`ProceduralFacades.tsx`) | Bytte vid exakt 70 m från kameran, fram och tillbaka när kameran vreds | Ett band på ±6 m där huset behåller sin nivå. Syns inte vid nivå Z. |
| Besättningen i vagnen | Tändes och släcktes med servicen | Följer vagnens synlighet |

**Inga föremål laddas sent.** Allt byggs i kod när scenen startar, och det finns ingen `THREE.LOD`.

---

## 319a.4: situationerna syns innan de kommer

**Förvarningen ligger i datan.** Varje foodtrucksituation har en förvarning (`cue`) i datan, och valideringen kräver den i foodtrucken. Kortet väntar på förvarningen (`introLeft`), som teatern i vinbaren:

**`guestAtHatch`** (sex situationer). En gäst går fram till luckan och pekar, i ett stående `rocket.askPointMenu` i 4 s. Simuleringen väljer gästen (`hatchGuest`) i den här ordningen:

1. Den som stått längst i kön eller vid luckan och hunnit gå fram i bild, alltså minst 50 s sedan ankomsten (`THEATRE.cueGuestSettledSeconds`).
2. Annars en gäst vid ståborden.
3. En lugn kväll: den som varit där längst, också om hen är på väg in. Då väntar kortet tills gästen hunnit gå fram.

En gäst som hämtar eller betalar pekar inte, eftersom hen strax går. Utan gäst kommer ingen gästsituation.

**`delivery`** (Leveransen). Leveransbilen kör in längs byns bilnät i 6 s (`THEATRE.cueSeconds.delivery`):
- Den börjar minst 40 m bort och utanför bilden.
- Den stannar i bild på gatan bakom vagnen och står kvar under situationen.
- Sedan kör den samma väg ut.
- Förut körde leveransbilen till vinbarens hus även i foodtrucken.

**Prövningen:**
- `order319aForvarning.test.ts`: alla kort under en kväll börjar med sin förvarning.
- `order319aGaster.test.ts`: gästen som pekar står vid sin plats under alla 38 tick som hen pekar (`cueSettledShare` 1). Bilens väg börjar minst 40 m bort och utanför bilden, och slutar i bild.

Regn som förvarning kommer med vädret i 319c.

---

## Verifiering

- typecheck och bygget är gröna.
- vitest: 195 testfiler och 2 581 test gröna, inga fel.
- `scripts/order319a-check.mjs`: ok.
- `scripts/order315b-2-check.mjs`: ok. Gästerna räknas nu i gästgruppen.
- `scripts/order300-layout.mjs`: alla lägen ok i alla fem storlekar.

## Kvar till Anders

- **Kollapserna i foodtrucken** (17 % av kvällarna, se ovan).
- **Granskningen av de sex ⚖-frågorna.**
- **Golvet ger i regel 4 situationer per kväll.** Ska chansen ur trycket höjas vid vagnen?
