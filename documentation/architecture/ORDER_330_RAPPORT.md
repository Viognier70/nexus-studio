# ORDER 330 — talarmärket i inledningen, grundregeln, Jonas vid vagnen, genomgången av valen (rapport)

*Anders 2026-10-11. Gren `order-330` från main `e401f17f`. Punkterna F–H kom i ett eget meddelande. Jag läser dem som en del av ORDER 330, eftersom bokstäverna fortsätter efter E.*

## A. Talarmärket
**Felet:** talarmärket var en pastill med bild, namn och roll på samma rad.
- I bankens samtal stod pastillen i en fast kolumn på 170 enheter (`.nxs-say`). Den var smalare än pastillen, så namnet gick in i repliken.
- På mentorns skärm och i morgonens kort satt pastillen tätt mot repliken.
- Namnet stod dessutom två gånger, en gång i pastillen och en gång i etiketten under.

**Nu** (`ui/SenderTag.tsx`):
- `SenderTag stacked`: bilden överst, namnet och rollen under, aldrig i bilden.
- `SpeakerLine`: märket i en egen kolumn (`--nx-speaker-col`) och repliken till höger med fast mellanrum (`--nx-speaker-gap`), i `screens.css`.
- Långa namn bryts i sin kolumn. De flyter inte in i repliken.

**Där det gäller:**
- bankens samtal (`BankDialog.tsx` `Say`);
- morgonens kort för Åsa och banken (`DayActionBar.tsx`);
- Åsas erbjudande (`LadderOfferCard.tsx`);
- Åsas bubbla (`AsaBubble.tsx`);
- mentorns skärm M1 (`MentorPanel.tsx`): namnet och rollen under det stora porträttet. Pastillen i dialogen visas bara när porträttet är dolt i ett smalt fönster.

*Om "inledningsfilmen":* öppningsfilmen (`OpeningSequence.tsx`) har inga talare, bara bildtexter. Talarna i inledningen är introduktionens Åsa, banken och Måltidens hus. Säg till om du menade något annat.

## B. Porträtten
- Åsa visar `asa-portratt-256.png` (`AsaPortrait`).
- Banken, Måltidens hus, Per och Byn visar sin ikon ur Designs D6 (`d6Ui.ts SENDERS`).
- Testet `ui/__tests__/order330Talare.test.tsx` kontrollerar att varje talare har en bild.

## C. Bankens diagnos dag 1
**Texten:**
- sv: "Du har inte börjat än. När du har visat vad du kan i Måltidens hus, till exempel med en medalj, kan vi prata om lån."
- en: "You haven’t started yet. Once you have shown what you can do in the House of the Meal, with a medal for example, we can talk about a loan."

**När den gäller** (`bankNothingYet`, `BankDialog.tsx`): dag 1, utan verksamhet, utan medalj, utan övning och utan prov. Senare dagar gäller den vanliga texten.

**Var den står:** i bankens diagnos och i morgonens kort.

**Testet** står i samma fil som för B.

## D. Layoutkontrollen
**Det som är nytt i kontrollen** (`scripts/order300-layout.mjs`):
- rutan `banken-dag1`;
- mätningen `speakerOverlaps`:
  - märket får inte ligga på repliken;
  - bilden får inte ligga på namnet;
  - repliken får inte skymmas av något utanför talarraden.

  En talarrad bakom en öppen dialog räknas inte.
- Klicken på "Nytt spel" och "Fortsätt" väntar inte efteråt. Förut fick de ibland tidsgränsen medan spelet laddade.

**Resultatet:** öppningen, regelkortet, mentorn, morgonen dag 1 och banken dag 1, i 1280 × 720, 1024 × 600 och 1920 × 1080, på svenska och engelska. Alla godkända.
- Svenska: `frontend/reports/order330/layout-sv/layout.json`.
- Engelska: `frontend/reports/order330/layout-en/layout.json`.
- Bilderna ligger i samma mappar.

**Ett fel som kontrollen fångade under arbetet:** i 1024 × 600 gick bankens längre rad i morgonens kort ner under bottenraden. Därför är märkets kolumn smalare i morgonens kort.

## E. Testsviten
Se kontrollerna sist.

## F. Grundregeln
"Allt spelaren väljer som påverkar spelet ska alltid synas i spelet …" står nu på två ställen:
- i `CLAUDE.md`, avsnittet "Grundregel: varje val syns";
- i konstitutionen, `documentation/foundation/vision/ORDER_100_VISION.md` > EVERY CHOICE IS SEEN, på engelska som resten av dokumentet och med svenskan under.

## G. Jonas vid vagnen
**Valet** är den extra handen (`HIRE_PREP_HAND`, 800 kr).
- Den gick förut bara att ta in från inköpsskärmen. Den skärmen finns inte vid vagnen.
- Nu har vagnens morgonruta en knapp: "Ta in Jonas vid grillen · 800 kr · Nils tar beställningar i kön" (`DayActionBar.tsx`).
- Är han inne står raden "Jonas står vid grillen i kväll, och Nils går längs kön och tar beställningarna."

**Simuleringen:** beställningen vid luckan tar `FOODTRUCK.extraHandOrderTime` = 0,9 av tiden de kvällarna (`service.ts`). Kön går alltså fortare på riktigt. Jag började med 0,7. Varför det blev 0,9 står under spelartyperna nedan.

**Scenen** (`PlayerTruckCrew.tsx`):
- Jonas (en tredje figur, kockens färger) står vid grillen.
- Grillaren tar luckan och allt som hör till den.
- Nils går från gäst till gäst i kön (`village/queueWalk.ts`): blocket (`staff.write`) i `FOODTRUCK.queueWalk.takeS` sekunder vid varje gäst, och vid luckans sida när kön är tom.
- Ska han tända marschallerna eller torka ett bord gör han det först.
- Kvällar utan Jonas står Nils i luckan som förut.

**Mätningen i spelarens flöde** (`reports/order330/kon.json`, `src/sim/__tests__/order330Vagnen.test.ts`): första kvällen i foodtrucken, frö 1–10.

| | Notor | Gick ur kön | Väntan i kön (s, medel) |
|---|---|---|---|
| Utan Jonas | 490 | 0 | 52,4 |
| Med Jonas | 500 | 0 | 46,9 |

Med 0,7 blev det 514 notor och 25,6 s.

*Förbehåll:* jag har inte sett Jonas och Nils runda i webbläsaren. Vagnen nås först efter introduktionen och Åsas erbjudande, och layoutkontrollen har ingen sparfil för vagnen. Riggen syns för kontrollskripten i `window.__nxTruckCrew.jonas`.

### Spelartyperna efter G
- **Körningen:** 40 säsonger med 17 rader (`scripts/order327-harness.sh`).
- **Före:** `reports/order329/efter`.
- **Jämförelse:** `reports/order330/jamforelse.json` (`scripts/order330-jamforelse.mjs`).
- **Varför G slår igenom:** harnessens spelare tar in den extra handen 92–97 % av morgnarna (`mornings[].hand`), så nästan varje kväll vid vagnen påverkas.

| Rad | Före | 0,7 (`reports/order330/efter`) | 0,9, i spelet (`reports/order330/efter09`) |
|---|---|---|---|
| koncept-enkel-0.6: vinbaren, stängda | 5, 0 | 40, 0 | 10, 0 |
| koncept-soigne-0.6: vinbaren, stängda | 5, 1 | 40, **12** | 10, 3 |
| stjarna-0.6: vinbaren, stängda | 5, 0 | 40, 0 | 10, 0 |
| stjarna-0.75: stjärna | 16 | 30 | 21 |
| stjarna-0.85, koncept-bistro-0.85: stjärna | 36 | 39 | 38 |
| trappa-forsiktig: stjärna | 25 | 33 | 30 |

**Beslutet:** 0,7 lyfte 0,6-raderna till 40 och lät soigne-0.6 stänga 12 säsonger. Det krockar med målet i ORDER 329. Anders valde då en mildare effekt med ny mätning.

**Med 0,9:**
- 0,6-raderna når vinbaren 10 gånger. Målet var ungefär 7, alltså det de nådde före 323 §5.
- De starka raderna rör sig med högst två stjärnor, utom stjarna-0.75 (+5) och trappa-forsiktig (+5).

## H. Genomgången av spelarens val
Underlag:
- en kartläggning av koden (`types.ts SimAction`, reducern, simuleringen och scenerna);
- mina egna stickprov på det som rättades och på felen.

| Val | Syns i världen, var och när | Bedömning | Gjort i 330 / beställning |
|---|---|---|---|
| Extra hand (HIRE_PREP_HAND) | Vagnen: Jonas vid grillen, Nils längs kön, hela kvällen. Vinbaren och bistron: en extra servitör dukar med laget före dörrarna. | **synligt** | **Rättat** (G och H) |
| Springaren (satsningen `runner-shift`) | Vinbaren och bistron: den extra servitören bär och dukar av vid borden under servicen. Han tar riktiga uppgifter i regissören. | **synligt** | **Rättat** (`wineBarDirector.ts` `extra`, `FrameInput.extraStaff`) |
| Bemanningsbyrån, ja (ACCEPT_AGENCY) | Samma extra servitör under servicen så länge byråns lärling är i laget | **synligt** | **Rättat** |
| Morgonens inköp (BUY_ITEMS, BUY_STOCK) | Leveransbilen kör till krogen en gång samma dag. Bara i scenen; simuleringens leveranscykel och slump rörs inte. | **synligt** | **Rättat** (`DeliveryVan.tsx`, `balance.ts DELIVERY`) |
| Anställa, avskeda (HIRE/FIRE_TEAM_MEMBER) | Vinbaren har alltid sju i personalen; laget styr inte vilka som syns | inget syns | Går med befintliga figurer: tänd eller släck rollerna efter laget, den som slutar går ut med `staff.walk`. Inte gjort. |
| Bemanningsbyrån, nej | Inget | inget syns | Kan visas med stressad takt (`staffTempo`) den kvällen. Inte gjort. |
| Utbildningsnivå, prisnivå, råvarunivå (SET_POLICY i investeringarna) | Bara indirekt: nöjdhet och humör | bara siffra | Går med befintligt: takten efter utbildningen, `guest.pay` följt av nick eller huvudskak efter priset, `guest.nodFirstBite` mot `guest.pushPlate` efter råvaran. Inte gjort. |
| DJ (`book-dj`) | Vinbaren: DJ i båset och skenet från 21.00 | synligt | Beställning: ett eget DJ-klipp (i dag `cook.station`) |
| Utbilda salen, vinprovning, gästkock, lokala råvaror, kompostkontroll (satsningarna) | Inget, utom trivselplattan i statusläget | inget syns | Går med befintligt på morgonen före dörrarna: genomgång med `host.point` och `staff.listen`, `somm.pour`, en andra kock med `cook.plate`, bilen med `crate`. Inte gjort. Beställning: gästkockens uniform och ett komposttunna. |
| Provsmakning på torget | Bara indirekt: längre kö | bara siffra | Beställning: ett provsmakningsbord på torget |
| Utrustning (BUY_EQUIPMENT) | Modellen står i rummet från köpet | synligt (stilla) | Går med befintligt: `trolley.push`, `cheese.cut` och `flambe.pour` när det säljs. Inte gjort. |
| Förmågorna (SHOP_BUY, SHOP_SLOT) | Bara indirekt (stamgästerna och Lova ger fler bybor i rummet) | bara siffra | Går med befintligt för några: flaskan med `somm.present`, tårtan med `waiter.carryCake`, kocken vid bordet. Inte gjort. Beställning: en recensent, och något för allergen, menyns berättelse, signaturrätten, mise och resterna. |
| Menyn och priserna (COMPOSE_MENU) | Tallrikarna är desamma oavsett rätt | bara siffra | Går med befintligt: tallriken efter rättens sort (`soupBowl`, `plate`, `cake`). Inte gjort. |
| Kortare meny, tunnare vinlista | Inget | inget syns | Beställning: en menytavla som blir kortare. Välkomstdrinken (`waiter.serveAperitif`) går med befintligt. |
| Stänga lunch eller middag (CLOSE_SERVICE) | Ingen kvällsscen; byn säger att stället är öppet | inget syns | Går med befintligt: släckt ljus (`venueLight`). Beställning: en skylt "Stängt". Inte gjort. |
| Byta klass, ta över nästa steg (CHOOSE_CLASS, LADDER_TAKE) | Ett nytt rum, vagnen eller bistrons ombyggnad | synligt | — |
| Placera ett sällskap, kön först (HOST_SEAT, SEAT_FIRST) | Sällskapet går till bordet | synligt | — |
| Bjuda, merförsälja, hjälpa i en zon (HOST_COMP, HOST_UPSELL, HOST_MOVE) | Bara humöret; inget bärs fram och ingen går dit | bara siffra | Går med befintligt: ett glas eller en kopp bärs till bordet, `waiter.carryCake` med tårtan, figuren går till zonen. Inte gjort. |
| Vagnens bord, den nyfikna (TRUCK_CLEAR_TABLE, CURIOUS_ANSWER) | Skräpet försvinner; den nyfikna ställer sig i kön eller går | synligt | Avdukningen kunde göras av en figur (`waiter.wipeTable`). |
| Händelserna (ANSWER_INCIDENT) | Delvis: en del situationer i vinbaren har olika slut för rätt och fel | delvis | Händelseteatern kan byggas ut |
| Fikat, alla svar (FIKA_ANSWER) | Vinbaren: laget vid bordet, samma för alla svar. Vagnen: inget. | bara text | — |
| Fikat: kostnaden, inspektionsrisken | Kostnaden syns inte. Inspektionen kommer senare i vinbaren, men i vagnen finns ingen inspektion. | delvis | Går med befintligt: en inspektion vid vagnen med inspektörens föremål. Inte gjort. |
| Fikat: risken att någon slutar, den föreslagna förmågan | Inget, och ingen följd i spelet heller (`quitRisk` sänker bara lojaliteten, som inget läser; `fika.suggested` läses inte) | inget syns | Spelet behöver en följd först. Att avgöra. |

**Kvar att göra:** av raderna "går med befintligt" har jag rättat de fyra överst: den extra handen, springaren, byråns lärling och inköpen. Resten är för många för den här ordern. Säg vilken ordning de ska tas i, eller ge dem en egen order.

**Fel som genomgången hittade.** De är kontrollerade, men inte ändrade:
- **Tunnare vinlista** (`reducer.ts` `thinWineListAction`): att återställa vinlistan slår *på* välkomstdrinken, fast den är avstängd från början (`model.ts`, `welcomeDrink: false`).
- **Fikats `extraHandSek`** (fika-vagn-nyanstalld A, fika-passen A) kostar men ger ingen extra hand någon kväll.

*Rättelse av kartläggningen:*
- **Stängningen ligger kvar mellan dagar.** Det är avsiktligt enligt harnessen ("växeln ligger kvar mellan dagar", `weekHarness.ts`). Det är alltså inget fel, men det syns inte.
- **`policies.localSourcing`** startar som `true` (`model.ts`), inte `false` som kartläggningen sa.

## Kontroller
- **Typecheck och `npm run build`:** gröna.
- **Hela testsviten**, körd ensam utan säsongskörningar: 227 filer och 2800 tester gröna, 15 filer och 20 tester överhoppade, 1 väntat fel, 0 röda.
  - Första körningen hade ett rött test: `order313AsaBorjan` sökte den gamla texten `<SenderTag sender="asa" />`. Testet godtar nu också `SpeakerLine`.
  - Sviten kördes sedan om, ensam.
- **Visionen** "Kvarteren, konkurrensen och spellägena" ligger oförändrad i `documentation/foundation/vision/KVARTEREN_KONKURRENSEN_SPELLAGEN.md`. Den är bakgrund, och inget är byggt ur den.
