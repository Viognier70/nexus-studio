# ORDER 327 — halvt grepp, signaler för blicken, spelartyper (rapport)

*Anders 2026-10-11. Gren `order-327` från main `272327c9`.*

## A. Halvt grepp bara när gästen och maten är säkra

**Regeln** står nu i båda SITUATIONER-filerna:
- `SITUATIONER_306c_OMG2-4.md`, "Till Code" regel 3, som ersätter den gamla regel 3 om liv och hälsa;
- `SITUATIONER_306c_OMG1.md`, "Till Code".

Lydelsen: halvt grepp bara när gästen och maten faktiskt är säkra; det som saknas får bara vara omsorg, kommunikation eller dokumentation.

*Om numret:* ordern kallar regeln A3. I `ORDER_306_UTKAST/SITUATIONER_306b.md` är A3 redan "Tiden". Jag har därför skrivit regeln som regel 3 i OMG2-4, med "(A3, ORDER 327)" i texten. Säg till om den ska ha ett annat nummer.

**Ändringarna i data** (`content/incidents/vinbar.meta.json`, `vinbar.text.sv.draft.json`, `vinbar.text.en.json`):

| Situation | Svar i filen | Id i spelet | Förut | Nu |
|---|---|---|---|---|
| vb14 steg 3 | 2 (köket får inte veta) | `a` | [A] | [F] |
| vb14 steg 3 | 3 (smulor i korgen) | `b` | [U] | [F] |
| vb21 steg 3 | 3 (ytan saneras inte) | `a` | [U] | [F] |
| vb21 steg 3 | 2 (hem direkt) | `d` | [A] | [A], oförändrad |
| vb06 | — | — | — | oförändrad |

- **vb14:** båda texterna för halvt grepp (`halfGrip`) är borta.
- **vb21:** texten mot upplevelsen är borta (`experience`, `outcomeExperience`). Texten mot analysen står kvar.
- **Förklaringarna** står kvar i alla svaren.
- **Följderna vid fel:** de nya felsvaren har stegets egen följd. I vb14 är det följden som köar vb27, allergireaktionen.
- **I filerna** är svaren märkta [F] med "(ORDER 327: förut …)", och raderna för halvt grepp är borttagna.

**Längdtestet håller** (`reports/order327/langd.json`, `longestWrong`, gränsen ±0,1):

| Vinbaren, nya formen | ORDER 326 | ORDER 327 |
|---|---|---|
| sv, ord | +0,025 | +0,027 |
| sv, tecken | +0,007 | +0,009 |
| en, ord | +0,042 | +0,044 |
| en, tecken | +0,014 | +0,025 |

`order306b4.test.ts`, `order306b3Banken.test.ts` och `order306bSpelartyper.test.ts` (gissaren) är gröna.

**Testerna:**
- `order326Situationer306c.test.ts` kräver inte längre fyra texter för halvt grepp. Varje sida som steg 3 ger halvt grepp ska i stället ha sina två texter.
- Nytt: `src/strategic/scene/__tests__/order327Signaler.test.ts` (del A).

*Fynd utanför ordern, inte ändrat:* vb35-tillsynen-c har texter för halvt grepp mot upplevelsen, men inget svar i steg 3 ger det.

## B. Signaler för blick → hand → vinkning

### Fyndet först: stegen ur ORDER 326 startade aldrig i spelet
ORDER 326 läste `Guest.state === 'seated'` från `waitWatchS` (20 s). I simuleringen är gästen bara i `seated` i 4,2 s (`service.ts:541`). Väntan på beställningen ligger i `ordering`.

Mätt i tre kvällar i vinbaren (`reports/order327/signaler.json`):
- `simSeatedSeconds` har max 4,2 i alla tre;
- `ladder326Frames` = 0.

326:s test matade `MoodGestures` med ett påhittat `stateSinceS` och prövade därför aldrig spelets flöde. Stegen läser nu signalerna nedan i stället.

### Signalerna
**Modulen:** de är skrivna i `src/strategic/scene/wantSignals.ts`.

**Var de beräknas:**
- I vinbaren och bistron räknas signalerna i regissören (`wineBarDirector.ts` `wantNow`, `advanceWants`). Det är regissören som äger personalens uppgifter och föremålen vid borden.
- Gesterna läser dem via `wantOf()` (`WineBarFigures.tsx` → `moodGestures.ts`, `GestureGuestInfo.want`).

**Talen** står i `balance.ts` `GESTURE_BALANCE`.

| Signal | Villkor | Var i koden |
|---|---|---|
| Vill beställa (`wantsOrder`) | sällskapet sitter och servitören är inte framme för beställningen, från `waitWatchS` efter att de satt sig (samma tider som i 326) | `wantNow` |
| Mer i glaset (`wantsRefill`) | glaset tomt, `glassEmptyS` = 40 s (20 spelminuter) efter att det fylldes, och gästen sitter kvar (ingen nota) | `wantNow`, `PartyTrack.glassAt` |
| Notan (`wantsBill`) | gästen har ätit klart (simuleringens dining är slut, `paying`), eller tallriken är undan och glaset tomt i mer än X = `billAfterEmptyS` = 20 s | `wantNow`, `platesGone` |
| Från luckan (`wantsHatch`) | gäst vid ståbord A, B eller C (inte bänken) som har ätit klart (`eatSchedule` slut) och har pengar kvar: plånboken (`profileFor`, `GUESTS.walletSek`) minus `FOODTRUCK.billSek` räcker till det billigaste på `TRUCK_MENU` (20 kr) | `wantsHatch`, `PlayerTruckCrew.tsx` `hatchWantNow` |

**Stegen** räknas från att viljan började:
1. blicken (`guest.seekEye`, vid vagnen `guest.seekEyeStand` mot luckan);
2. handen efter `seekEyeS`;
3. den stora vinkningen från `waitWaveS − waitWatchS`.

**Blickkontakt** (`eyeContact`, `stepWant`):
- **När:** någon i personalen *går* förbi inom `eyeContactM` = 4 m från bordet, med ansiktet mot det (inom `eyeContactConeRad` = 0,6 rad).
- **Bara den som går:** den som står stilla vid sin station räknas inte. Annars skulle ett bord framför en station få kontakt hela tiden.
- **Gästen:** stegen stannar och gästen nickar (`guest.nodApprove`, vid vagnen `guest.nodApproveStand`).
- **Om ingen kommer:** är personalen inte framme inom Y = `eyeContactComeS` = 15 s börjar stegen om med blicken.

### Personalens rutt
**Blickkontakt:**
- Det sällskapet väntar på (beställningen, notan eller påfyllningen) får `priority` och går före de andra väntande uppgifterna (`hurry`, `assignPending`).

**Påfyllningen** är en ny uppgift i regissören (`refill`), utan föremål och utan kostnad:
- **Vem:** bartendern vid baren, sommeliern i loungen (flaskan står där) och servitören vid borden.
- **När den läggs:** när någon har sett gästen, alltså vid blickkontakt eller när handen kommer upp.
- **Sedan:** `glassAt` sätts när den är klar, och glaset räknas tomt igen `glassEmptyS` senare.

### Mätningen i spelets flöde
Mätningen gäller tre kvällar, frön 7, 11 och 23, med bästa svaret. Den använder spelets rum (`createRoom('vinbaren')`) och regissör (`createRoomDirector`), matade med simuleringens gäster var 0,2 s som i `WineBarFigures.tsx`.

Fil: `reports/order327/signaler.json`, `evenings[]`. Kolumnerna är `parties`, `reachedEye`, `reachedHand`, `reachedWave`, `eyeContacts`, `restarts` och `wantSeconds.median`:

| Frö | Vilja | Sällskap | Blicken | Handen | Vinkningen | Blickkontakter | Omstarter | Median (s) |
|---|---|---|---|---|---|---|---|---|
| 7 | beställa | 33 | 25 | 1 | 0 | 95 | 68 | 61 |
| 7 | glaset | 13 | 12 | 0 | 0 | 28 | 15 | 29,8 |
| 7 | notan | 27 | 21 | 0 | 1 | 24 | 0 | 8 |
| 11 | beställa | 30 | 22 | 3 | 0 | 81 | 59 | 57,2 |
| 11 | glaset | 10 | 10 | 0 | 0 | 20 | 13 | 48,6 |
| 11 | notan | 29 | 21 | 0 | 0 | 22 | 0 | 8 |
| 23 | beställa | 36 | 31 | 2 | 1 | 109 | 77 | 67,8 |
| 23 | glaset | 13 | 12 | 0 | 0 | 27 | 14 | 27,2 |
| 23 | notan | 27 | 20 | 0 | 0 | 23 | 0 | 8 |

**Det mätningen visar:**
- **Beställningen ger runt tre blickkontakter och två omstarter per sällskap.** Personalen går ofta förbi inom 4 m, men den som har tid kommer sällan inom 15 s. Gästen nickar alltså flera gånger innan någon kommer. Handen och vinkningen syns sällan, eftersom kontakten kommer före `seekEyeS`.
- **Om det ska bli färre nickar:** det går att reglera med Y (`eyeContactComeS`) och konen (`eyeContactConeRad`). Säg till om det ska justeras.
- **Notan står 8 s,** lika länge som `paying` i simuleringen. Därför syns oftast bara blicken.
- **"Tallriken undan" kan inte uppfyllas i dag.** Regissören dukar av först när sällskapet har gått (`leaveParty`), så den andra vägen till notan finns i koden men slår aldrig till.
  - **Att avgöra:** ska tallriken dukas av när gästen har ätit klart? Det är en ny uppgift i personalens rutt.
  - **Om svaret är ja:** notan före simuleringens `paying` kan inte serveras utan att simuleringen ändras. Det skulle ändra omsättningen, och ordern säger ingen ny ekonomi.

**Vagnen** (`signaler.json`, `truck`):
- **Fönstret:** gästen äter i `TRUCK_SEATING.eatSimSeconds` = 18 s, och ätordningen tar 14,6 s (korv i bröd) eller 15,2 s (mos). Det ger högst 3,4 s från att gästen ätit klart till att den går, utan vägen dit. Vid värmaren är det 17,0 och 17,6 s.
- **Det som syns:** i praktiken bara blicken mot luckan.
- **Pengarna:** den tunnaste plånboken (300 kr) räcker alltid till något mer, så pengarna avgör inte i dag.
- **Blickkontakten:** bara medhjälparen när den går en runda (marschallerna, ett bord) kan ge den. Den vid luckan står still, och ståborden ligger 4,0–5,5 m från luckan (`TRUCK_PROPS.standTable`, `TRUCK_LAYOUT.stations.hatch`).
- **"Personalen kommer fram"** är inte byggt vid vagnen. Medhjälparens väg ut går i simuleringens ärenden (`truckLife.ts`), och ett nytt ärende tar luckan ur bruk, vilket påverkar servicen. Vid vagnen börjar stegen därför om efter Y s.
- **Att avgöra:** vad är svaret på vinkningen vid vagnen?

### Notan börjar nu med blicken
Regissören lät förut gästen be om notan med handen direkt (`askBill`, 2,4 s). Ordern ger stegen blick → hand → vinkning också för notan, så `askBill` spelas inte längre. Personalen går som förut 2,4 s efter att gästen ätit klart. `wineBarDirector.test.ts` väntar inte längre på `askBill`.

### Testerna
- **Nytt:** `order327Signaler.test.ts`, med stegen, blickkontakten, omstarten, nicken, vagnens villkor och mätningen.
- **Uppdaterade**, eftersom stegen nu läser `want`: `order325AnsiktenGester.test.ts`, `order326Blicken.test.ts` och `wineBarDirector.test.ts`.

**Kartan** (`gestureMap.ts`) är Designs och oförändrad. Nicken spelas med Designs `guest.nodApprove`, som inte är en situation i kartan.

## C. Spelartyperna, 40 säsonger utan och med 306c

**Körningarna:**
- **Utan 306c:** main `272327c9`, med vinbarens tre datafiler från `9020fa65` (före ORDER 326). Allt annat är som på main.
- **Med 306c:** main `272327c9` som den är.
- **Skript:** `scripts/order327-harness.sh`, med samma 17 rader och 40 frön som i ORDER 320 och 326.
- **Resultat:** `reports/order327/utan306c/` och `reports/order327/med306c/`.
- **Jämförelse:** `reports/order327/jamforelse.json` (`scripts/order327-jamforelse.mjs`).

**Svar: nej. 306c förklarar inte att raderna med 0,6 når vinbaren 3 gånger mot 7 förut.** De når vinbaren 3 gånger både utan och med 306c (`rows.<rad>.utan306c.reachedVinbar` och `.med306c.reachedVinbar`):

| Rad | ORDER 320 | Utan 306c | Med 306c |
|---|---|---|---|
| koncept-enkel-0.6 | 7 | 3 | 3 |
| stjarna-0.6 | 7 | 3 | 3 |
| koncept-soigne-0.6 | 7 | 3 | 3 |

**Varför 306c inte kan påverka det:**
- Vinbarens situationer spelas först när spelaren har tagit över vinbaren.
- Kravet för att få erbjudandet prövas i foodtrucken (`ladder.ts` `missingFor`): klarade situationer i foodtrucken, kvällar, kassan, ryktet och medaljerna.
- Fallet från 7 till 3 ligger alltså i ORDER 321–325. Vilken av dem det är har jag inte prövat.

**Med 306c** ger körningen exakt samma tal som ORDER 326 i alla 17 rader (`order326` och `med306c` i jämförelsen). Körningen går att upprepa.

**Det 306c påverkar** ligger efter vinbaren: bistron och stjärnan.

| Rad | Nådde bistron, utan → med | Stjärna, utan → med |
|---|---|---|
| stjarna-0.75 | 20 → 25 | 13 → 18 |
| stjarna-0.85 | 36 → 38 | 31 → 35 |
| koncept-bistro-0.85 | 36 → 38 | 31 → 35 |
| trappa-forsiktig | 34 → 38 | 19 → 22 |
| koncept-enkel-0.6 | 0 → 2 | 0 → 1 |
| stjarna-0.6 | 0 → 1 | 0 → 1 |

`finalStepDiffers` listar fröna där säsongens sista steg skiljer.

Inget är ändrat för C.

## Kontroller
- **Typecheck:** grön.
- **Hela testsviten** (`npx vitest run`): 2779 gröna och 6 röda.
  - De sex rörde byn och öppningen (`order322Byn`, `order297Byn`, `order302Gatan` och tre `order308`-tester).
  - Alla sex tog runt 88 s, medan tolv säsongskörningar gick samtidigt.
  - Körda för sig var alla 40 testerna i de sex filerna gröna.
- **Bygget:** `npm run build` är grönt.
