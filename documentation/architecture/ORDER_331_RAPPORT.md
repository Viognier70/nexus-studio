# ORDER 331 — felen, resten av valen, servern (rapport)

*Anders 2026-10-12. Gren `order-331` från main `28b427a3`.*

**Besluten i ordern:**
- `FIKA.plainWellbeing` står kvar på 1.
- D12 (zip 47), vagnen och kvarteren flyttas till ORDER 332. Det står i minnet.
- Designs Grillstugan heter D13 (Anders i ett meddelande under ordern), så beställningslistan i D heter D14.

## A. Vinlistan och välkomstdrinken
**Felet:** `thinWineListAction` (`strategic/simulation/reducer.ts`) slog alltid *på* välkomstdrinken när vinlistan återställdes. Det hände också när drinken var avstängd från början (`model.ts` `welcomeDrink: false`).

**Nu:**
- När vinlistan tunnas sparas drinkens läge i `scaleDown.welcomeDrinkBefore` (`types.ts`).
- När listan återställs får drinken tillbaka det läget.
- Slogs drinken på medan listan var tunn (walk-in-of-five B), står den kvar som påslagen.

**Test:** `sim/__tests__/order331Felen.test.ts`. Det prövar en avstängd drink (tunna och återställa ger avstängd) och en påslagen (tunna ger av, återställa ger på).

## B. Fikats extra hand
**Felet:** svar A i "fika-vagn-nyanstalld" och "fika-passen" (`FIKA.economy.extraHandSek`, 500 kr) kostade, men gav ingen extra hand någon kväll.

**Nu:**
- Svaret ger den extra handen de två närmaste kvällarna med service (`FIKA.economy.extraHandEvenings` 2, `sim/balance.ts`). Två kvällar är min läsning av svarets "de första kvällarna".
- Den nya morgonen sätter `applyFikaHand` (`sim/fika.ts`, anropad i dygnsskiftet i `reducer.ts`) `day.prepHand`, samma väg som `HIRE_PREP_HAND`.
- Kostnaden drogs vid fikat, så ingen morgonkostnad dras.
- Söndagen, som är stängd, räknas inte.

**Det som syns:**
- Vinbaren och bistron: den extra servitören dukar med laget (330 H).
- Vagnen: Jonas står vid grillen och Nils går längs kön (330 G).
- Texter:
  - fikats följdrad: "Jonas står vid grillen de två närmaste kvällarna …" eller "En extra hand är med i laget de två närmaste kvällarna." (`fika.extraHand`);
  - morgonens rad: "… som ni bestämde vid fikat" (`prep.handFromFika`, `prep.handFromFikaTruck`).

**Test:** `order331Felen.test.ts` följer spelarens flöde vid vagnen:
- svaret A ges med `FIKA_ANSWER`;
- de två följande kvällarna med service har `prepHand` under servicen, den tredje inte;
- ingen morgonkostnad dras.

**Spelartyperna**, 17 rader × 40 frön (`scripts/order327-harness.sh`, en worktree på `e863499f`):
- Före: `reports/order330/efter09`. Efter: `reports/order331/efter`. Jämförelsen står i `reports/order331/jamforelse.json` (`scripts/order331-jamforelse.mjs`).
- Harnessen svarar som spelaren med det väl grundade svaret, alltså A.
- Ingen rad ändrar antalet stängda säsonger, vinbarer eller stjärnor.
- Den enda ändringen i stegen är att trappa-mentorn når bistron i en säsong till (39 → 40).
- Kassan vid säsongens slut stiger med som mest 960 kr (koncept-enkel-0.85). Raderna som aldrig får dilemmat är oförändrade.

## C. Valen som syns med befintliga figurer
Det här är raderna i 330 H som gick med befintliga figurer. Scenen läser valen ur simuleringen via `strategic/scene/choicesShown.ts`, och regissören (`wineBarDirector.ts`) spelar dem. Inget av det påverkar simuleringens tal (se Kontroller).

### Anställa och avskeda (`HIRE_TEAM_MEMBER`, `FIRE_TEAM_MEMBER`)
**Regeln** (`crewShown`):
- Rummets figurer står för klassens lag (`TEAM_BY_CLASS`: värd, servitör och kock) och rummets fasta besättning.
- Saknas någon i lagets roller syns figuren inte: Per för värden, servitören och kocken.
- Är någon anställd utöver laget syns en till: en servitör (`extra`) för värd, servitör och lärling, och en kock vid kallskänken (`cook2`, ny figur) för kocken.

**I regissören** (`updateCrew`):
- Den som slutar medan rummet syns går ut genom dörren.
- Uppgifterna går över till de andra.
- Den som anställs kommer in genom dörren.
- Kocken som finns i laget lägger upp.

**Vid vagnen** (`truckCrewShown`, `PlayerTruckCrew.tsx`):
- En anställd utöver vagnens lag är Jonas vid grillen varje kväll.
- Saknas grillaren eller Nils står den platsen tom.

**Begränsning:** fler än en anställd utöver laget syns som en.

### Värdens bjudning och det som säljs in (`HOST_COMP`, `HOST_UPSELL`)
- `sim/hostPins.ts` skriver `day.hostCarries`, vad som bärs till vilket sällskap. Simuleringen läser det inte.
- Servitören hämtar glaset vid baren och bär det till bordet. I baren häller bartendern.
- Efterrätten som sålts in kommer på en tallrik från passet.
- **Kaffet:** det bärs som ett glas, eftersom det inte finns någon kopp bland föremålen. Koppen är beställd (D14 punkt 8).
- **Inte i ordern och inte gjort:** "Flytta personal dit det brinner" (`HOST_MOVE`).

### Utrustningen i bruk
Det simuleringen räknar med (`choicesShown.ts` `equipmentUsesOf`):

| Utrustning | När | Det som syns |
|---|---|---|
| Vinkylen (`vinkyl`) | Sällskapet har vin i beställningen. Simuleringen höjer då nöjdheten (`guestOrders.ts`). | Sommeliern hämtar flaskan vid kylen och bär den till bordet (`somm.present`) |
| Ostvagnen (`ostvagn`) | En osträtt säljs (`brie-plate`, `munster-plate`, `vasterbotten-plate`) | Servitören skjuter vagnen till bordet (`trolley.push`), skär (`cheese.cut`, kupan lyfts och osten skärs) och skjuter tillbaka den |
| Flamberingsvagnen (`flamberingsvagn`) | En efterrätt säljs | Per (eller servitören) skjuter vagnen till bordet och flamberar (`flambe.pour`, lågan ur D5) |
| Avecvagnen (`avecvagn`) | Bordet stannar för avec efter ett rätt svar (`incidents.ts`, `roomReactions` detail `avec`) | Servitören skjuter vagnen till bordet (`trolley.present`) |
| Humidorn | Ingen försäljning i simuleringen än | Står som skåp. Hör till frågebanken (ORDER 306). |

**Tolkning att pröva:** flamberingsvagnen har ingen egen försäljning i simuleringen. Den lyfter konceptet. Jag visar den vid efterrätten. Säg till om den ska kopplas till något annat.

**Vagnarna i rummet** (`roomEquipment.ts` `followCarts`): den som skjuter har vagnen framför sig, och vid bordet står den bredvid. Läget följer mjukt, eftersom vagnarna står med handtaget mot väggen och vänds när de tas. Det står som en synpunkt till Design i D14.

### Morgonens satsningar
Före dörrarna, under förberedelsen (`morningShows`):

| Satsning | Det som syns |
|---|---|
| Utbilda salen (`train-service`) | Per går igenom kvällen vid småborden (`host.point`), och servitörerna står i en ring och lyssnar (`staff.listen`) |
| Vinprovning (`wine-tasting`) | Sommeliern häller vid baren (`somm.pour`), och bartendern och servitörerna lyssnar |
| Lokala råvaror (`local-sourcing`) | Leveransbilen kör till krogen (`DeliveryVan.tsx`), och diskaren bär in två lådor från dörren till passet (`staff.carryCrate`, lådan i handen) |
| Gästkock (`guest-chef`) | En andra kock vid kallskänken hela kvällen (`cook2`, `cook.station`) i husets kökskläder. Den egna uniformen är beställd (D14 punkt 5). |
| Kompostgenomgång (`compost-audit`) | Per går igenom flödet vid disken (`host.point`). Tunnorna är beställda (D14 punkt 6). |

**Vid vagnen:** satsningarna syns inte där. Vagnen har ingen förberedelse före luckan i scenen. Det står kvar som en öppen rad.

**Tester:**
- `strategic/scene/__tests__/order331Valen.test.ts`, 15 tester. Det läser regissörens prov, samma som `WineBarFigures` ritar. Det prövar:
  - laget i spelarens flöde (reducern);
  - att den som slutar går ut;
  - satsningarnas klipp och att lyssnarna är vända mot Per;
  - bjudningen från simuleringen till bordet;
  - de tre vagnarna till bordet och tillbaka;
  - vinkylen;
  - att vagnen i rummet följer.
- Scenens tester (`src/strategic/scene`, 28 filer och 885 tester) är gröna.

**Inte sett i webbläsaren:** jag har inte sett det i webbläsaren. Layoutkontrollen når inte rummet under servicen. Det är verifierat i regissörens prov och i testerna, inte i en bild.

## D. Beställningen till Design
`documentation/leveranser/BESTALLNING_DESIGN_D14.md` har tio punkter, var och en med plats, tillfälle, vad som ska synas, vad som finns i dag och vad som ska levereras:
1. DJ:ns klipp
2. recensenten
3. skylten "Stängt"
4. provsmakningsbordet
5. gästkockens kläder
6. komposttunnan
7. menytavlan som blir kortare
8. kaffekoppen
9. förmågorna som inte syns
10. fikat vid vagnen

Listan har också synpunkter från bygget (vagnarnas parkering och humidorn) och ett förslag till ordning.

## E. Servern (rapport, inget ändrat)

### Svar
**Ja. Simuleringen går att köra utan webbläsare i dag**, med några bindningar som behöver lösas först.

Harnessen kör hela säsonger i node, och mätningen `strategic/testHarness/__tests__/order331Servern.test.ts` skriver `reports/order331/server.json`. Den följer spelarens flöde från början, i foodtrucken, med 5 frön × 14 dagar i node.

| Fråga | Svar | Fält i `server.json` |
|---|---|---|
| Utan webbläsare? | Ja. Vitest i node, ingen jsdom. | — |
| Slump styrd av ett frö? | Ja för spelet: `state.seed` och `rngState` (`reducer.ts`, `incidents.ts`, `serviceChance.ts`) och `hashKey(seed, …)`. Undantaget är lagmedlemmarnas id. | `allDeterministic` true, `allIdenticalRaw` false |
| Ett tillstånd som kan sparas och skickas? | Ja. Det är ren JSON (`sim/save.ts`, rundturstestet `save.test.ts`), och spelet fortsätter identiskt efter en rundtur varje morgon. | `allRoundTrip` true |
| Hur stort? | Omkring 43 000 tecken som JSON på morgonen, högst omkring 65 000 | `stateBytesMean`, `stateBytesMax` |
| Hur tungt? | Omkring 85 ms per spelad dag på en kärna i den här datorn | `msPerDayMean` |

**Undantaget:** två körningar med samma frö skiljer sig bara i lagmedlemmarnas id. De görs med `Math.random` (`strategic/simulation/team.ts:104` och `:216`). Allt annat är lika.

### Det som binder simuleringen till webbläsaren eller scenen
1. **Takten:** klienten driver simuleringen. `SimulationProvider.tsx` (rad 168–210) skickar `TICK` med 0,2 s fem gånger i sekunden från `requestAnimationFrame`, och reducern är ren. På servern driver en loop i stället `TICK` själv. Det gör harnessen redan (`weekHarness.ts` `TICK_DT` 0,2).
2. **Rummets platser kommer från scenen.** `businessRoomRef` (`strategic/scene/interiorSharedState.ts`) fylls när 3D-rummet monteras. Simuleringen läser det i `service.ts`, `sim/incidents.ts` och `sim/hostZones.ts`.
   - Harnessen fyller det med `mountRoomLikeScene` (`testHarness/roomParity.ts`), som bygger rummet med three.js i node.
   - Det fungerar, men servern behöver en ren modul med platserna, utan three.js.
3. **Simuleringen importerar ur scenen och gränssnittet:**
   - `strategic/simulation/eveningResult.ts` ← `ui/service/serviceView`;
   - `service.ts` ← `scene/bistroHouse`;
   - `consequence.ts` ← `scene/guestMood`;
   - `sim/truckLife.ts` ← `scene/truckProps`;
   - `sim/morningReview.ts` ← `scene/staffStatus`;
   - `model.ts` och `valuation.ts` ← `business/interiorLayout`.

   Det mesta är data, men det drar in scenens moduler i serverns bygge.
4. **Språket är globalt, och texten skrivs in i tillståndet.**
   - 12 filer läser `getLanguage()`, och 21 filer läser `strings` (`content/language.ts`, ett värde för hela processen).
   - Kassaboken, strömmen och dagens rader sparas som färdig text på det språk som gällde.
   - En server med spelare på svenska och engelska behöver nycklar och parametrar i tillståndet, och texten görs hos klienten.
5. **Webbläsarens lagring** finns bara i `sim/save.ts` (`window.localStorage`, lagringen kan bytas mot `SaveStore`) och i `content/language.ts` (skyddad med `try`). Det är inget hinder.
6. **Id-räknarna** för gäster och sällskap ligger i modulen (`model.ts`), men läses in ur och skrivs tillbaka till `state.idCounters` vid varje åtgärd.
   - Det är säkert när en process kör en värld i taget, synkront.
   - Det är inte säkert om flera världar varvas asynkront i samma process.
7. **Beslut under kvällen förutsätter att spelaren är där:** situationerna, värdens nålar, fikat och Åsas erbjudande.
   - Harnessen svarar med en spelarprofil (`answerScenario`, `answerFika`, `answerPinsWisely`).
   - På servern behöver en frånvarande ägare samma sak: "ägarens beslut" i visionen (4c). Det är speldesign innan det är kod.

### Uppskattat arbete
| Steg | Innehåll | Uppskattning |
|---|---|---|
| 1. Kärnan ren | Id ur `idCounters` i stället för `Math.random`; platserna som ren data; simuleringen utan import ur `ui/` och `scene/`; ett test som bygger simuleringen utan three.js | 1 order |
| 2. Språket ur tillståndet | Kassabokens, strömmens och dagens texter som nycklar och parametrar, och texten görs vid visningen | 1–2 ordrar (många ställen; testerna läser engelskan) |
| 3. En körare utan klient | `runDay(state, decisions, policy)` ur harnessens `playDay`, med ägarens beslut för det som kommer under kvällen | 1 order, plus speldesignens beslut om ägarens beslut |
| 4. Supabase | Tabellerna, RLS, workern och klienten som skickar beslut (skissen nedan) | 2–3 ordrar |

Steg 1–3 kräver ingen server och kan göras före etapp 1–2 utan att spelet ändras. Varje steg prövas med harnessens 17 rader, och talen ska vara oförändrade.

### Skiss: takten på servern
**Rekommendation: en liten worker i Node, inte en Edge Function, för själva takten.**
- Simuleringen är TypeScript som redan körs i node. En dag för en verksamhet tar omkring 85 ms (`server.json`), så en värld med 50 verksamheter tar några sekunder per service.
- Supabases Edge Functions körs i Deno med en gräns för processortid per anrop. Gränsen bör kontrolleras mot Supabases dokumentation innan beslutet. En batch för en hel värld riskerar att slå i den.
- Edge Functions passar för det som är litet: att ta emot och pröva ett beslut, och att skicka rapporten vid inloggning.

**Flödet:**
1. Klienten skriver spelarens beslut till `decisions`, med RLS: bara ägaren och bara för sin verksamhet. Den läser sitt eget tillstånd och den offentliga bilden av konkurrenterna.
2. Workern väcks på schema, med `pg_cron` eller en schemalagd körning som säger "världen W, service S". Den läser världens tillstånd och de beslut som inte har lagts in, och kör servicen.
   - I läge 4b körs servicen i följd.
   - I läge 4c körs den efter svensk tid.
3. Workern skriver det nya tillståndet, dagens resultat och rapporten, och markerar besluten som inlagda.
4. Workern är den enda som har den hemliga nyckeln, i serverns miljö och aldrig i repot. Frontend har bara den publika nyckeln och RLS, som i visionen.
5. Varje körning skrivs i `sim_runs` med simuleringens version. En värld körs aldrig av två workers samtidigt (lås per värld), och `state_version` skyddar mot dubbel skrivning.

### Skiss: tabellerna
| Tabell | Innehåll | RLS |
|---|---|---|
| `profiles` | `user_id` (auth.users), namn, språk, ålder bekräftad, samtycke till forskning | Läsa och ändra sin egen |
| `worlds` | `id`, läge (`solo`, `multi`, `online`), frö, klockläge, simuleringens version | Läsa de världar man är med i |
| `districts` | Världens kvarter: gäster, plånbok, kräsenhet (ur `balance.ts`, etapp 1) | Läsa i sin värld |
| `premises` | Lokalerna: kvarter, yta, platser, kök, karaktär, ägande verksamhet | Läsa i sin värld |
| `businesses` | `id`, `world_id`, `owner_user_id` (null för AI), AI-profil, klass, lokal, namn, `state` (jsonb, simuleringens tillstånd), `state_version`, dag | Ägaren läser sin egen; bara workern skriver |
| `business_public` (vy) | Det konkurrenterna får se: namn, kvarter, pris, kö, rykte | Läsa i sin värld |
| `decisions` | `business_id`, `user_id`, dag, åtgärd (jsonb, en `SimAction`), `created_at`, `applied_at` | Ägaren skriver till sin verksamhet; ingen ändrar ett inlagt beslut |
| `day_reports` | `business_id`, dag, sammanfattning (jsonb): gästerna, vart de som gick valde att gå och varför | Ägaren läser |
| `portfolio_entries` | `user_id`, dag, sort (svar, fika, provet), innehåll | Ägaren läser; forskningen bara med samtycke |
| `messages`, `blocks`, `abuse_reports` | Meddelanden, blockeringar och anmälningar (4b–4c) | Avsändaren och mottagaren; moderatorer |
| `auctions`, `bids` | Den exekutiva auktionen (etapp 3) | Läsa i sin värld; bjuda för sin verksamhet |
| `sim_runs` | Världen, servicen, start, slut, status, version | Bara workern |

Projektet läggs i en region inom EU, som visionen säger.

### Hemliga nycklar
**Finns en hemlig Supabase-nyckel (sb_secret_ eller service_role) i repot eller i git-historiken? Nej.**

Jag sökte i arbetsträdet och i historiken efter båda orden och efter värden som har en nyckels form. Orden finns bara i text som "aldrig service_role". Den enda `.env`-filen i historiken är `frontend/.env.local.example`, och dess nycklar är tomma.

## F. Kontroller
- **Typecheck och `npm run build`:** gröna.
- **Hela testsviten**, körd ensam: 229 filer och 2821 tester gröna, 16 filer och 21 tester överhoppade, 1 väntat fel, 0 röda.
  - Första körningen var inte ensam. Två vitest-arbetare från en felaktig kontrollkörning gick fortfarande: jag hade delat raderna med `set -- $row` i zsh, som inte delar på mellanslag.
  - Jag avslutade dem och körde om sviten utan något annat igång. Siffrorna ovan är från den körningen.
- **C påverkar inte simuleringens tal.** trappa-klok och stjarna-0.75 (40 frön var) kördes på `f06f6d57` och gav samma `players` som på `e863499f`: `reports/order331/c-kontroll/` mot `reports/order331/efter/`. De andra 15 raderna kördes inte om på C.
- **Spelartyperna för B:** `reports/order331/jamforelse.json` (avsnitt B).
- **Servern:** `reports/order331/server.json` (avsnitt E).

## Kvar och att avgöra
1. **Flamberingsvagnen** visas vid efterrätten. Den har ingen egen försäljning i simuleringen. Rätt koppling?
2. **Satsningarna vid vagnen** syns inte där. Vagnen har ingen förberedelse före luckan i scenen. Ska den få en (genomgången vid luckan, lådorna från bilen)?
3. **Fler än en anställd utöver laget** syns som en figur.
4. **"Flytta personal dit det brinner"** (`HOST_MOVE`) var inte med i ordern och syns inte än.
5. **Inte sett i webbläsaren:** C är prövat i regissörens prov och i testerna, inte i en bild.
6. **D14** är klar att skicka till Design.
7. **Servern:** steg 1–3 kan göras utan server och utan att spelet ändras. Lagmedlemmarnas id (`Math.random`) är det enda som bryter determinismen.
