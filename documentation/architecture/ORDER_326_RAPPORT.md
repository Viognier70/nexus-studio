# ORDER 326 — Vinbarens 29 äldre situationer i den nya formen (306c), och D11 del 2 (rapport)

*Anders 2026-10-11. Gren `order-326` från main `9020fa65`.*

## A. 306c: de 29 i formen analys → upplevelse → handling

**Filerna** `SITUATIONER_306c_OMG1.md` och `SITUATIONER_306c_OMG2-4.md` ligger oförändrade i `documentation/blueprints/`. De är inbyggda i `content/incidents/vinbar.meta.json`, `vinbar.text.sv.draft.json` och `vinbar.text.en.json`.

**De 29** är vb04, vb05, vb06, vb08, vb10, vb13–vb17, vb19–vb22, vb24–vb31, vb33, vb34, vb36 och tillsynens fyra varianter (vb35 a–d). Alla 40 i vinbarens bank har nu formen.

### Hur filerna är lästa
- **Steg 1** har samma fråga, svar, förklaringar och följder som förut. Det enda nya är ledtråden.
  - vb33, vb34, vb36 och vb35 har nya förklaringar ur filen.
  - Svarens etiketter är spelets, eftersom de är längdjusterade sedan 306b.3. Filen förkortar några av dem.
  - Följdtexten vid fel ("Vid fel") är filens; den ersätter platshållarna.
- **Steg 2** är nytt: repliken (A eller B), frågan, tre svar (rätt, ok, fel) och ledtråden.
- **Steg 3** har fyra svar:
  - [H] helt grepp;
  - [A] halvt grepp mot analysen;
  - [U] halvt grepp mot upplevelsen;
  - [F] fel.

  Frågan är "Vad gör du?". I vb35 är frågan i stället variantens egen ur filen.
- **Återkopplingen och utfallen:**
  - Halvt grepp mot analysen och mot upplevelsen, med raden "I rummet", står i `halfGrip`.
  - Klarad står i `success`.
  - Personalen lyckas och misslyckas står i `staffTexts`.
- **Engelskan** är min översättning.

### Följderna (OMG2-4, regel 1)
Följderna går efter axeln, som i 306b.
- **Steg 2 (upplevelsen)** får den gamla phronesis-följden, men bara stämningen och ryktet. Konkret:
  - kassan och orken är 0;
  - i den pågående följden är orken per minut 0 och tempot 1;
  - gästerna som går (`room`) och kedjorna är flyttade till steg 3.
- **Steg 3 (handlingen)** får den gamla techne-följden, med texten.
- **Testet** för att steg 2 inte tar kassa eller ork täcker nu alla 53 i formen (`order306b3Banken.test.ts`).
- **Platshållare som ersatts med mina texter**, eftersom filen inte har någon:
  - steg 3 vid fel i vb33, vb34, vb36 och vb35;
  - den pågående följden i steg 2 i samma fyra.

  Texterna står i `PLACEHOLDER_FAIL3` och `PLACEHOLDER_ONGOING2` i `build306c.py`.
- **vb35:s egna följder på svaren** ("Risk för varning") är borttagna. Steg 3 har nu stegets följd.

### Kedjorna (OMG2-4, regel 2)
Kedjorna ligger på de svar filen anger:

| Svar | Kedja |
|---|---|
| vb08 [U] ihopskjutna bord | vb17 |
| vb10 [U] ett sista glas | vb29 |
| vb10 [F] flaskan | vb29, med följden ur steg 1 |
| vb14 [F] surdegen går bra | vb27, med följden ur steg 1 svar a |

- **Halvt grepp med kedja är nytt i motorn.**
  - `StepOptionMeta.triggers` bär kedjan.
  - `incidents.ts` köar den när svaret ger halvt grepp.
  - Testet `order326Situationer306c.test.ts` spelar vb08 med de ihopskjutna borden och ser att vb17 köas.
- **Kedjor till dolda situationer köas inte** (`incidents.ts`). Det gäller i dag vb03 → vb27.

### Inget halvt grepp i liv och hälsa (regel 3)
vb15, vb27 och vb28 har bara helt grepp och fel i steg 3, som filen säger.

**Att avgöra:** regel 3 säger "liv, hälsa och livsmedelssäkerhet", men filen ger halvt grepp i tre situationer som också rör det:
- vb06 [U]: avvikelsen skrivs inte in;
- vb14 [A] och [U]: köket får inte veta, och smulor i korgen;
- vb21 [U]: ytan saneras inte.

Jag har följt filens märkning. Säg till om de ska bli fel.

### Svar efter variant (regel 4, vb31)
- **Varianten** väljs som förut efter klockan: middag före 20.00, efter middagen därefter.
- **Steg 3** följer tabellen i filen. `in` har fått `grip` (`IncidentSituationalOption.grip`), och `optionGrip()` ger sidan i kvällens läge.
- **Repliken** följer varianten: A vid middag, B efter (`IncidentMeta.lineBySituation`).

### Tillsynen (regel 5)
- Steg 1 och 2 är gemensamma, och steg 3 är variantens egen. Det gamla steget "Vad visar du dem?" har utgått.
- Klarad är per variant, ur filen.

### ⚖ (regel 8)
- **Dolda tills de är granskade:** de femton vb06, vb10, vb14, vb15, vb21, vb25, vb27, vb28, vb29, vb34, vb36 och vb35 a–d.
  - Dolda betyder `legal: { legalReviewed: false }` och alla steg märkta.
  - Vinbarens bank filtreras nu med `legallyCleared`, som foodtruckens.
- **I spelet:** vinbaren har nu 25 situationer, menyn 9.
- **Granskning:** när Anders har granskat en av dem sätts `legalReviewed: true` i `vinbar.meta.json`.

### Lägen som utgår
Steg 3 har ett helt grepp oavsett läge i filen, så kvällens läge avgör inte längre svaret.

| Situation | Förut | Nu |
|---|---|---|
| vb05 | tidigt och sent | Kommer bara tidigt (före 21.00), eftersom texten förutsätter ett halvtomt rum |
| vb08 | fullt och lugnt | Kommer bara när minst nio sitter, eftersom det hela greppet väntar på sexbordet |
| vb13 | lugnt | Läget är borttaget |
| vb19 | sent | Läget är borttaget |

### Kostnaderna (förslag, som i 306b A7)

| Kostnad | Kronor | Räknat så |
|---|---|---|
| två glas (vb04) | 48 | husvinets inköp, 24 kr per glas |
| ett glas (vb16) | 24 | husvinets inköp |
| en tallrik bröd (vb10) | 6 | tre portioner mjöl à 2 kr |
| bröd till borden (vb19) | 36 | sex tallrikar bröd |
| kaffe till bordet (vb20) | 50 | två koppar à `compCoffeeCostSek` 25 kr |
| hela notan (vb20 [U]) | 184 | inköpet för två varmrätter och en flaska husvin |
| flaskan (vb30 [H] och [U]) | 120 | fem glas |

### Längden och svarens ordning (regel 7)
**Längden.** Längdtestet (`order306b4.test.ts`, ±0,1) och testet för vinbarens bank (`order306b3Banken.test.ts`, det längsta är rätt i högst 0,35) höll inte med filernas text.
- I steg 3 är det hela greppet nästan alltid längst, eftersom det slår ihop analysen och upplevelsen.
- Jag har gjort som i 306b.3 och bara ändrat längden: ett felsvar eller halvt grepp har fått en bisats, och det rätta svaret och förklaringarna står kvar.
- Det gäller 37 svar, 36 på svenska och 34 på engelska. Listan står i `EDITS` i `frontend/scripts/order326-306c/edits306c.py`.
- Exempel: vb35 steg 2 "Att hitta fel att anmärka på" blev "Att hitta fel som de kan anmärka på i rapporten".

| Del | Resultat | Källa |
|---|---|---|
| Vinbaren, nya formen | sv +0,025 ord / +0,007 tecken, en +0,042 / +0,014 | `reports/order326/langd.json` `longestWrong` |
| Vinbarens bank | inom ±0,1 | samma fil |
| Det hela greppet längst i steg 3 | 10 av 52 situationer i vinbaren och foodtrucken, på båda språken | `step3Longest` |

**Svarens ordning i data.** I filerna står det rätta svaret först, så testet "det bästa svaret står inte oftast först" föll (0,5 mot 0,4). Konverteringen roterar svaren i steg 2 och 3 i en fast ordning per situation och steg. Kortet blandar som förut vid varje visning.

### Konverteringen
- **Skripten** ligger i `frontend/scripts/order326-306c/` och kördes en gång mot den gamla formen:
  - `parse306c.py` läser filernas svenska;
  - `build306c.py` skriver de tre filerna, med `edits306c.py` och den engelska översättningen `en306c.json`.
- **Granskning:** svenskan är filernas utom längdändringarna ovan. Den går att granska i spelet eller i `vinbar.text.sv.draft.json`.

### Testerna
- **Nytt:** `src/sim/__tests__/order326Situationer306c.test.ts`.
- **Uppdaterade**, därför att vb10, vb15 och vb27 är dolda och den gamla formen är borta:
  - `order270Incidents.test.ts` prövar stegen med vb22 och kedjan med vb01 → vb30;
  - `order306b4.test.ts`;
  - `order306b3Banken.test.ts`;
  - `order306bVinbaren.test.ts`;
  - `strategic/testHarness/longestAnswer.ts`: delen "gamla formen" är tom och prövas inte.

## B. D11 del 2: söka personalens blick

**Leveransen.** `~/Downloads/Restaurant guest animation (46).zip` är uppackad oförändrad i `documentation/leveranser/nexus-leverans-2026-10-10-d11-ansikten-och-gester/`.
- Den ersätter (44) och (45), med samma mapp och 103 filer.
- Nytt sedan (44): `guest.seekEye` och `guest.seekEyeStand`, fyra nya situationer, `wantLadder`, `noCameraGaze` och omtaget 2026-10-11 där händerna ligger stilla.

**Klippen** (`figureClips.ts`) är Designs två ur (46), oförändrade. Klippen är nu 195.

**Kartan** (`gestureMap.ts`) är Designs (46), med talen i `balance.ts`. Texterna (`d11Strings.ts`) är oförändrade ur (46).

**Stegen** i `balance.ts` `GESTURE_BALANCE`, `seekEyeS` = 12:
- **Vinbaren och bistron** (`moodGestures.ts`): gästen sitter utan att ha beställt.
  1. Från `waitWatchS` (20 s) söker gästen blicken (`wantsOrder`, `guest.seekEye`).
  2. Efter ytterligare `seekEyeS` (12 s) kommer handen upp (`readyToOrder`, `guest.waveStaff`).
  3. Från `waitWaveS` (40 s) kommer den stora vinkningen (`waitedTooLong`, `guest.waveWaiter`).
  4. Därefter tittar gästen på klockan var `watchEveryS`.

  Stegen stannar när personalen kommer till bordet, eftersom gästens tillstånd då byts.
- **Vagnen** (`PlayerTruckCrew.tsx`): vid luckan när medhjälparen är ute gäller samma steg stående (`seekEyeStand`, `waveStand`, `waveWaiterStand`), räknat från att gästen ställt sig vid luckan. Blicken går rakt in genom luckan mot grillaren.
- **Stämningens egna gester:** blicken är också den första av gesterna för väntar och otålig (`MOOD_MAP`).

**Ingen gäst tittar mot kameran.**
- Blicken vänds mot den närmaste i personalen som syns, annars mot baren (`WineBarFigures.tsx` `seekEyeYaw`, högst 1,3 rad). Det är kartans `seekEyeTarget`.
- Ingen kod vänder ett huvud mot kameran.

**Kartans situationer utan signal i spelet:** `wantsRefill` (mer i glaset), `wantsBill` (notan) och `wantsHatch` (ståbordet vid vagnen) är inte inbyggda. "Personalen vänder sig mot bordet" som blickkontakt finns inte heller; stegen stannar först när någon kommer till bordet.

**Testerna:** `src/strategic/scene/__tests__/order326Blicken.test.ts`, och `order325AnsiktenGester.test.ts` och `order286aTheatre.test.ts` är uppdaterade.

## C. Det nära ansiktet vid vagnen
`balance.ts` `FACE_LOD`:

| Skal | Förut | Nu |
|---|---|---|
| Det nära | helt till 9 m, borta vid 12 m | helt till 14 m, borta vid 17 m |
| Det långa | från 9 m, helt från 12 m | från 14 m, helt från 17 m |

- **Vagnen:** huvudena vid Z är 9–12 m bort (`reports/order325/kamera.json`), så de visar det nära ansiktet helt, utan övertoning.
- **Vinbaren och bistron:** huvudena vid Z är 20–28 m bort och visar det långa helt som förut.

Testet står i `order325AnsiktenGester.test.ts`.

## D. ft06 på engelska
Svar A lyder nu "Chill them in the cool box and sell them tomorrow." (`foodtruck/bas.text.en.json`), med testet i `order324Beslut.test.ts`.

## Spelartyperna, 40 säsonger

**Körningen** är densamma som i ORDER 320 (`scripts/order326-harness.sh`), med 17 rader och 40 frön per rad.
- Resultaten står i `frontend/reports/order326/efter40/`.
- Jämförelsen mot 320 står i `reports/order326/jamforelse.json` (`scripts/order326-jamforelse.mjs`).
- Mellan körningarna ligger också ORDER 321–325, så skillnaden kommer inte bara från 306c.

**Ingen rad stänger fler säsonger än förut.**

| Rad | Nådde bistron | Stjärna | Övrigt |
|---|---|---|---|
| stjarna-0.75 | 12 → 25 | 5 → 18 | — |
| stjarna-0.85 | 35 → 38 | 30 → 35 | — |
| koncept-bistro-0.85 | 35 → 38 | 30 → 35 | — |
| trappa-forsiktig | 33 → 38 | — | — |
| koncept-enkel-0.6, stjarna-0.6, koncept-soigne-0.6 | — | — | nådde vinbaren 7 → 3; soigne-0.6 stängda 5 → 3 |

- **Trappans andra rader** når vinbaren och bistron som förut. trappa-mentorn når bistron en vecka senare i median (4 → 5).
- **Varför det kan bli lättare:** en trolig orsak är att vinbaren nu har 25 situationer i spelet, när femton ⚖ är dolda, och färre svåra kedjor. Det är inte prövat för sig.

**Gissaren och slumpen** över en vecka i vinbaren, med 10 frön, när spelaren alltid går vidare (`reports/order326/spelartyper.json`, `table`, stopAfter 0):

| Spelartyp | Kassan efter veckan | Helt grepp i steg 3 | Halvt grepp |
|---|---|---|---|
| Gissaren | −4 275 kr | 0,10 | 0,63 |
| Slumpen | −3 704 kr | 0,30 | 0,50 |
| Undviker längsta | −8 149 kr | 0,35 | 0,38 |
| Rimlig | +16 722 kr | 1,00 | — |

- **Gissaren tjänar inte mer än slumpen.** Den väljer oftare ett halvt grepp, som är det längsta svaret i många situationer efter längdändringarna.
- **Testet för gissaren** (`order306bSpelartyper.test.ts`) är grönt.
- **Det hela greppet är längst** i 10 av 52 situationer (`langd.json`), under gränsen på hälften.
