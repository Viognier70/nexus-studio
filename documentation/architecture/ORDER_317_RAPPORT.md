# ORDER 317 — Vinbaren i huset, väggarna, texterna från 314 och Designs D6 (rapport)

**Underlag:** Anders 2026-10-07, tre meddelanden från provspelet:
- figurerna går genom väggarna;
- vinbarens möblering och D6 Åsa ska kopplas in;
- texterna från 314 ska rättas;
- de fem leveranserna i `Restaurant guest animation (31).zip`, i Anders ordning.

Panelerna, byns tal, lagret, svinnet, varningarna och tiderna ur samma provspel görs i ORDER 318.

**Gren:** `order-317` från `main` (`512acf36`, efter 315b del 1).

Varje tal pekar på en fil under `frontend/reports/order317/`.

## 0. Leveranserna

Fem mappar i zip-filen (12:42), uppackade oförändrade i `documentation/leveranser/`. Med `diff -r` mot zip-filen: inga skillnader.

| Mapp | Filer | Kopplas in |
|---|---|---|
| `nexus-leverans-2026-10-07-vinbaren-i-huset` | 8 | här |
| `nexus-leverans-2026-10-07-d6-asa` | 22 | här |
| `nexus-leverans-2026-10-07-d6-del-2` | 22 | här, utom Byn just nu (ORDER 318) |
| `nexus-leverans-2026-10-06-din-vag` (D7) | 41 | ORDER 315b del 2 |
| `nexus-leverans-2026-10-07-din-vag-tillagg` | 27 | ORDER 315b del 2 |

## 1. Vinbaren i huset

**Felet från provspelet:** 312b krympte rummets väggar till huset (14,47 × 10,05 m), men möblerna, platserna, personalens platser, köplatserna och gånggrafen stod kvar på det gamla rummets koordinater (15,6 × 11,8 m). Några exempel:
- loungernas ryggar stod på z 5,62 med väggen på 4,825;
- köplatsen innanför dörren stod på x 7,2 med väggen på 7,035.

**Rättningen:**
- `wineBarHouse.ts` (Designs fil, oförändrad, i `strategic/scene/`) ger alla mått.
- `wineBarRoom.ts` läser:
  - baren, vinväggen och dess mittlinje;
  - köket med halvväggar, passluckan och de tre platserna;
  - DJ-hörnet och förrådet;
  - loungerna, tvåorna och barstolarna;
  - ståplatserna, pulten, tavlan, vinkylen och dörrmattan;
  - entrén, väntplatsen och köplatserna;
  - mise en place och personalens platser;
  - gånggrafens linjer och personalens väg kök → bar.
- Det minsta rummet är 14,4 × 10,0 m (`MIN_WIDTH_M`, `MIN_DEPTH_M` ur `MIN_SIZE`). Rummet ryms nu (`fits: true`).

**Baren står inte symmetriskt kring z 0.** Vinväggens mittlinje är z −0,4.
- Rummet exporterar planen (`WINE_BAR_PLAN`).
- Serviceflödet, regissören, rekvisitan och ljuset läser den i stället för egna kopior:
  - `serviceFlow.ts`: korridoren, barens öppning, gångarna, hämtplatsen, hällplatsen, serveringspunkterna och södra diskens tallriksplats (förut speglad);
  - `wineBarDirector.ts`: passet, köksdörren, flaskan och kökets kant;
  - `theatreStage.ts`: flaskorna på disken;
  - `WineBarFigures.tsx`: DJ:n och ljusen över vinväggen och borden.

**Fyra justeringar från kameraprovet** (`wineBarRoom.test.ts`, spelets kamera från åtta vinklar):
1. **Pendlarna** står på samma avstånd från barens mitt som förut.
2. **Kåpan över varma stationen** börjar 0,6 m in och är 0,55 m djup. Den skymde diskarens och kockens kalott.
3. **Sommelieren** står 0,74 m från vinväggens mittlinje, som ORDER 271 krävde. I Designs fil står hon i stråkets mitt, 0,71 m.
4. **Bartendern** står 0,80 m från mittlinjen. Platinaväggens krön skymde henne från norr också vid 0,74 m. Det är 0,4 m kvar till disken.

Kameraprovet är grönt igen (`wineBar-camera-view.json`: 16 vyer, ingen skymd plats eller station). Det var markerat som känd avvikelse (`it.fails`) sedan 312b och är nu ett vanligt prov.

**Sikten** mot vinväggen och DJ:n (`sikten-jamforelse.json`, `checkSightLines`):

| | Designs ursprungliga rum (main) | main i husets mått (spelet efter 312b) | Nu |
|---|---|---|---|
| Platser som ser vinväggen, bas / platina | 20 / 20 | 14 / 14 | 20 / 20 |
| Loungerna, hyllplan sedda (bas / platina) | 1 av 4 / 3 av 6 | 0 av 4 / 0 av 6 | 1 av 4 / 3 av 6 |
| Barstolarna (bas / platina) | 3 av 4 / 5 av 6 | 3 av 4 / 5 av 6 | 3 av 4 / 5 av 6 |
| Platser som ser DJ:n (bas / platina) | 20 / 17 | 14 / 11 | 20 / 18 |

Det lägsta hyllplanet skyms av disken från barstolarna, också i Designs ursprungliga rum. Provet kräver minst Designs ursprungliga sikt.

## 2. Väggarna: det nya provet

`strategic/scene/__tests__/order317Vaggarna.test.ts`, utdata `vaggarna.json` (`ORDER317_OUT=1`).

**Väggarna** läses ur rummets meshar: de yttre väggarna och kökets halvväggar, i rummets lokala ram. Överstycket över dörren från 2,2 m räknas inte, eftersom det inte stoppar en figur.

**Figurens bredd** kommer ur `figureRig.ts FIGURE`, samma som renderingen: en gäst 0,46 m och personalen 0,40 m. Inget får ligga närmare en vägg än halva bredden.

**Provet går igenom:**
1. platserna, ståplatserna och deras vägar in;
2. personalens platser, mise en place, köplatserna, entrén och väntplatsen;
3. serveringspunkterna och arbetsplatserna;
4. gästernas vägar till och från varje plats;
5. personalens vägar mellan stationerna, borden och passet;
6. en full kväll med alla tjugo platser: varje figur som regissören ritar, var tionde sekund, 58 469 prov (`vaggarna.json` `evening.samples`);
7. Designs händelsemanus i alla varianter och öppningens två scener.

**Provet fäller.** Ett eget fall lägger en plats i norra väggen och en väg rakt från köplatsen utanför till köplatsen innanför, som före ordern. Provet hittar båda.

**Vad provet hittade, och rättningen:**
- **Dörren:** 324 prov under kvällen. Gästerna gick rakt mellan köplatserna utanför och innanför och skar genom väggen bredvid dörren. Det var "mellanväggen vid dörren" från provspelet.
  - Nu går varje väg mellan rummet, dörröppningen och trottoaren längs dörrens axel (`wineBarRoom.ts doorPath`, som regissören och manusen läser).
- **Manusen:** 34 punkter. Designs manus är skrivna i det gamla rummet.
  - De står kvar oförändrade, och varje punkt översätts när manuset byggs (`oldRoomMap.ts`, styckvis linjärt per zon med ankare i måtten som finns i båda rummen).
  - Punkter i dörrens väggband står i dörröppningen.
  - Vägar genom köksdörren går genom dörrens mitt.
  - Spelarens kamera i manusen översätts inte.
- **Efter rättningen:** 0 prov i en vägg för platserna och vägarna, 0 under kvällen och 0 i manusen (`vaggarna.json` `points`, `paths`, `evening.hits`, `scripts`).

## 3. Texterna från 314

- **"Raket"** blev "Situation" i alla spelarens strängar, på svenska och engelska, också Designs tabeller. Det gäller 50 strängar, till exempel *"Situation n i kväll"* / *"Situation n tonight"*.
- **Tidsregeln:** *"Går tiden ut räknas det som fel svar"* blev *"Går tiden ut tar personalen över."* (en. *"If time runs out, the staff take over."*), på båda ställena.
- **Sökningen:**
  - "fel svar" står kvar bara där ett svar verkligen var fel (recensionernas *"ett bord fick fel svar"*);
  - "raket" står kvar bara i filanteckningar och utvecklarnas FLAGS, inte i spelarens text.
- Provet `order317TexterOchD6.test.tsx` läser hela strängtabellen.

## 4. Designs D6, del 1: Intendent Åsa

- **Namnet** är *Curator Åsa* på engelska i alla texter, och *Intendent Åsa* på svenska.
- **Modellen:** `asaFigure.ts` (oförändrad) med hatten och klänningen. Den används i öppningen.
- **Klippen:** `asa.greet`, `asa.point` och `asa.nodApprove` är inlagda i `figureClips.ts` efter `staff.idle`, med typerna `mentor` och händelsen `signal`. Det är 125 klipp.
- **Öppningen:** Designs nya `oppningManus.js` ersätter den gamla. Åsa står i dörren och hälsar mot vägen vid `greetAt`.
- **Porträttet** (Designs bild) står på Åsas skärm i stället för monogrammet.
- **Pratbubblan** följer kontrollbild 06: porträttet, namnet i guld med Campus, repliken på papper och Vidare.
  - Den ersätter 313:s enkla kort när låset släpper och vid första servicen.
  - Namnet står på en valnötsplatta, så att det går att läsa över morgonens skärm.
- **Avvikelse:** leveransens repliker (`asa.line.*`) nämner banken. Spelets repliker är Åsas utan banken, efter beslutet om foodtrucken i 315b. Bara namnet, formen och knappen är tagna ur leveransen.

## 5. Designs D6, del 2

- **Avsändarna** (`SenderTag.tsx`, `d6Ui.ts SENDERS`):
  - Banken, Per, Byn och Måltidens hus har märket, namnet och raden om vad avsändaren är;
  - Åsa har sitt porträtt.
  - **Personalen** (BESLUT del 4 punkt 7): notisen när personalen tar över har avsändaren *"Sara, servitör"* med initialen i rollringens färg. Lärlingen har inget namn och får ingen avsändare.
- **Kockens färg** (BESLUT punkt 8): #7fa8ff. Rummet (`staffRing.ts`), statusläget (`staffStatus.ts`, förut #ffffff) och teckenförklaringen läser samma tabell (`d6Ui.ROLE_RING`).
- **Teckenförklaringen** har fyra grupper:
  - rollen, sju ringar;
  - orken, pigg, trött och slut, ritade ur `ORK_RING`;
  - trivseln;
  - stämningen.
  - I statusläget står den nere till höger. I menyn står den med en rad om varje grupp.
- **Kurskortet:**
  - raderna Lär ut, Ger, Gäller och Kräver;
  - ✓ i bläck med guld och ✗ i streckad valnöt;
  - tre lägen: *Gå kursen*, *Du behöver n krediter till* och *Kräver brons i Stensöta*. Medaljen visas före krediterna.
- **Det låsta i början:** låset i stället för ikonen, streckad kant och texten i full kontrast. Brickan *Öppet nu* visas den morgon låset släpper (`startUnlockedDay`).
- **Byn just nu:** Designs form kopplas in i ORDER 318, tillsammans med Anders krav från provspelet. Det är två kolumner, Gäster och Nöjda, för alla sju krogarna, ett mått för placeringen och panelen ihopfälld som standard.
- **Engelskan:** *Måltidens hus* heter *the House of the Meal* på engelska (CLAUDE.md regel 7). Tre av D6:s engelska strängar har det.
- **Strängarna:** D6:s 108 nycklar ligger först i `STRINGS`. Spelets befintliga nycklar går före de nio som krockar: `role.*` står med stor bokstav i spelet, och `mood.*` är oförändrade.

## 6. Körningar och spelarens flöde

- `npm run typecheck`: grönt. `npm run build`: grönt.
- `npx vitest run`: 187 filer gröna och 14 hoppade; 2 544 tester gröna, 1 förväntat fel (provsmakningen från 314, i ORDER 318) och 19 överhoppade.
- **Nya tester:**
  - `order317Vaggarna.test.ts`, 8 fall: väggarna, platserna, vägarna, kvällen, manusen, sikten och att provet fäller;
  - `order317TexterOchD6.test.tsx`, 9 fall.
- **Ändrade tester:**
  - `wineBarRoom.test.ts`: rummet ryms, och kameraprovet är `it` igen;
  - `order296Fixes`: loungebordets z 3,3;
  - `order286aTheatre`: loungebordet 0,985 m framför dynan, ±0,05 m från 0,95 m; 125 klipp;
  - `order313AsaBorjan`: Curator Åsa, och förklaringen med raderna;
  - `order300Borjan`: porträttet i stället för monogrammet;
  - `order273NoSwedishPlayerText`: Designs `d6Strings.ts` och `d6Ui.ts`.
- **Spelarens flöde i produktionsbygget:** `scripts/order317-check.mjs` (`check-en.json`, `check-sv.json`, `ok: true`). Kontrollen gick igenom:
  - Åsas skärm med porträttet;
  - de låsta satsningarna med lås;
  - pratbubblan när låset släpper;
  - en kväll i vinbaren, där situationskortet säger *"Situation 1 tonight"* och raden om personalen;
  - rummet på krogens nivå i statusläget, med teckenförklaringens fyra grupper och kocken #7fa8ff.
  - Bilderna heter `check-<lang>-1`–`5-*.png`.

## 7. Frågor

1. **Bartenderns och sommelierens platser** avviker från Designs fil (0,80 och 0,74 m från vinväggens mittlinje, i stället för stråkets mitt 0,71 m), så att kameran ser dem. Ska Design flytta platserna i filen?
2. **Kåpan** är kortare och smalare än stationen (0,55 m djup, från 0,6 m in). Godtas det, eller ska Design rita om köket?
