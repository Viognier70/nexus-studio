# ORDER 322 — Efter provspel 2026-10-09, del A och C (rapport)

Anders 2026-10-09: "Gör A och C först, merga och pusha. Sedan B.1 (listan) till mig." Den här rapporten gäller A (kvitt eller dubbelt i vinbaren) och C (provspelet). B (byn) kommer separat, och listan i B.1 visas för Anders innan något rättas.

## A. Kvitt eller dubbelt

**A1. Pyramiden.**
- Den stora pyramiden stod mitt i rummet, ovanpå gäster och bardisk. Den är borttagen.
- En liten pyramid står nu först i raden längst ner, direkt före "Steg 1 · Episteme" (`PyramidMoment.tsx`, `data-testid="stake-pyramid"`). Den är lika hög som rutorna i raden: 9,4 % av höjden (`service.css .nx-stake-pyr`).
- Pyramiden står i radens flöde och har ingen egen plats i rummet. Marken och låset i väntan har krympt så att de ryms på den.
- Ingenting i ögonblicket ritas längre utanför raden och valen.

**A2. "Om rätt".**
- Rutan visar nu potten efter nästa rätta svar (`PyramidMoment.tsx` `ifRight`):

  | Läge | Potten | Om rätt |
  |---|---|---|
  | Väntan på steg 1 | 0 | 1 |
  | Valet efter steg 1 | 1 | 3 |
  | Valet efter steg 2 | 3 | 7 |

- Förut visade rutan vid valet samma tal som potten, alltså stegets kredit 1 efter steg 1.
- Efter det sista steget, och när spelaren har stannat, finns inget nästa svar. Då står rutan inte alls.
- Vid fel visar den, som förut, vad svaret hade gett.
- `potIfRight` räknar nu med `DOUBLE_OR_NOTHING.potStep`, samma tal som motorn (`sim/incidents.ts growPot`). Förut räknade den med `INCIDENTS.bestAnswerCredit`. Båda talen är 1 i dag, men nu kommer siffran ur samma källa som potten.

**A3. Teckenförklaringen.** Den visas i statusläget (S).
- **Stängd från början:** i hörnet står bara en liten ruta med tangenten och rubriken, `L` och "Teckenförklaring" (`StatusLegend.tsx`, `STATUS_LEGEND.key` i `scene/staffStatus.ts`).
- **Öppnas och stängs med L,** eller med ett klick på rutan. Den är stängd igen varje gång statusläget slås på.
- **Rubriken klipps inte:** den står på en rad, ovanför den del som rullar.
- **Platsen:** uppe till höger, under farten. Förut stod den nere till höger och täckte "Gå vidare".
- **Under kvitt eller dubbelt** slutar rutan 12 px ovanför raden med potten (`screens.css`, `body:has(.nx-stake)`). Den kan alltså aldrig täcka valen, och resten av innehållet rullar inuti rutan.
- **Texten:** "L öppnar och stänger" (`legend.keyHint`), på svenska och engelska. Den ersätter "S visar och döljer".

**A4. Kontrollen.**
- `scripts/order322-check.mjs` kör produktionsbygget på svenska, i 1440 × 900 och 1280 × 720.
- Flödet: provspelet i vinbaren med den tvingade situationen vb01-korken. Spelaren svarar rätt i varje steg och går vidare vid valet.
- Det som mäts, vid varje väntan, varje val, statusläget och den öppna teckenförklaringen:
  - om någon ruta ligger ovanpå en annan;
  - om någon pyramid står utanför raden;
  - om rubriken klipps;
  - talet i "Om rätt".
- Resultatet står i `frontend/reports/order322/check.json`:
  - `ok: true` och `errors: []`;
  - `runs[].moments[].overlaps` är tom i alla mätningar;
  - `pyramids` är en pyramid med `inRow: true`;
  - `ifRight` vid valen är 3 och 7.
- Bilderna ligger i `frontend/reports/order322/check-*.png`.

## C. Provspelet

**Namnet.**
- Krogen heter inte längre "Provspelet". Startskärmen har ett fält för verksamhetens namn (`prov-name`).
- Fältet förifylls med namnet i det senast sparade spelet, alltså liggarens namn (`SaveFile.businessName`, `provState.ts savedBusinessName`). Lagringen läses bara, och provspelet skriver fortfarande aldrig.
- Utan sparat spel förifylls Designs exempel Hyttgrillen (`prov.businessName`; din väg, LEVERANSNOT).
- Kontrollen kördes i en ny webbläsarprofil, så fältet var förifyllt med Hyttgrillen och namnet syntes i spelet (`check.json` `nameDefault`, `bodyHasName`).

**"Följd".**
- En köad situation räknades som kedjad, eftersom kön är densamma som för följderna efter ett val. Därför stod det "Följd" på kortet.
- Nu märks en situation som köas med `QUEUE_INCIDENT` som tvingad (`incidents.forced`). Den kommer fortfarande på sin tid, men räknas och visas som en vanlig situation: kortet säger "Situation 1 i kväll" (`check.json` `runs[].count`).
- En följd efter ett val är fortfarande en följd.
- Detsamma gäller `#playtest=1&rocket=`.

## Tester

- `strategic/ui/service/__tests__/order322.test.tsx` täcker:
  - att pyramiden står i raden;
  - "Om rätt" 1 → 3 → 7, och att rutan inte står efter det sista steget;
  - teckenförklaringen och dess tangent, och att den slutar ovanför raden;
  - att den tvingade situationen inte är en följd, men att en följd efter ett val är det;
  - namnet.
- `order310Kvitt.test.tsx` (om rätt 3 efter steg 1, ingen ruta efter steg 3) och `order321ProvStart.test.tsx` (namnet) är uppdaterade.
- Hela sviten: 2711 gröna, 1 förväntat fel, 19 överhoppade. Typecheck och bygget är gröna.

## B.1. Byn mot den riktiga kartan (listan, inget är rättat)

**Hur jämförelsen görs.**
- `scripts/order322-karta.mjs` lägger spelets karta ovanpå den riktiga och skriver `frontend/reports/order322/karta.json` och bilderna `karta-*.png`.
- **Spelets karta** tas ur renderingens egna moduler (`src/strategic/__tests__/order322Karta.test.ts`):
  - vägytan som `OsmRoads` ritar (`roadRenderPieces`, med bredden per vägtyp);
  - Torgets plan;
  - husen som ritas (`renderedFootprints`, utan de dolda i `BUILDINGS_ON_ROADS`, med uthusen);
  - de handbyggda landmärkena där `CraftedLandmarks.tsx` ställer dem.
- **Den riktiga kartan** är kartunderlaget `grythyttan-osm.json` (OSM 2026-07-02) och `grythyttan-world.json`, i spelets projektion.
- **Byn** är de riktiga husens utbredning plus 60 m. 323 av 327 vägar ligger där.

**Bilderna.**
- `karta-karnan.png` visar byns kärna.
- `karta-torget.png` visar Torget, med sex pixlar per meter.
- `karta-1.png` till `karta-10.png` är utsnitt kring skillnaderna.
- `karta-byn.png` visar hela området.
- Teckenförklaringen står under varje bild:
  - blå linje: riktig väg;
  - svart kant: riktigt hus;
  - orange: spelets väg;
  - rött, grönt och lila: spelets hus, syntetiska hus och uthus;
  - röd linje: där vägen saknas i spelet;
  - röd kant: ett riktigt hus som saknas.

**Vägarna** (`karta.json` `roadIssues`, `counts.roadIssues`, `counts.gapMetres`).
- Varje riktig väg i byn provas meter för meter mot spelets vägyta för samma väg.
- 32 sträckor saknas i spelet, och den längsta är 44 m. Tre av dem saknas helt (`kind: 'saknas'`).
- Orsakerna (`roadIssues[].building`):

  | Orsak | Sträckor | Nummer |
  |---|---|---|
  | **Dolda syntetiska hus** | 19 | 2, 3, 5, 7–14, 16, 17, 20, 21, 23–25, 29 |
  | Riktiga hus som dolts | 4 | 4, 6, 31, 32 |
  | Riktiga hus nära vägen | 5 | 1, 15, 18, 27, 30 |
  | Synliga syntetiska hus på vägen | 4 | 19, 22, 26, 28 |

  - **Dolda syntetiska hus.** De 16 husen i `BUILDINGS_ON_ROADS` som inte finns i OSM (till exempel `vw-kyr-torget-lh`, `vw-pra-18`, `vw-sorgarden`, `vw-mag-warehouse`) ritas inte, eftersom en väg går genom dem. De klipper ändå vägen. Där står alltså varken hus eller väg.
    - Lokavägen bryts 34 m vid Prästgatan.
    - Kyrkbacken saknar 38 m mot Torget.
    - Kyrkogatan saknas helt mellan Torget och Smedsgatan.
    - Skolgatan, Magasinsgatan och Åsgatan bryts.
  - **Riktiga hus som dolts.** De två industrihusen `w870510826` och `w870510828` vid stationen döljs, eftersom en serviceväg går genom dem i OSM. De klipper också vägen. Båda vägarna, `w1329020075` och `w1329020076`, saknas helt.
  - **Riktiga hus nära vägen.** Trottoaren skulle gå in i huset, så hela vägen klipps (`roadSurface.ts`, ORDER 158):
    - Artur Lindqvists gata saknar 44 m mellan `w869907963` och huset bredvid, och når inte fram till sin fortsättning;
    - Kyrkogatan saknar 10 m;
    - tre servicevägar saknar 3–14 m.
  - **Synliga syntetiska hus på vägen:** Järnvägsgatan (`vw-jarn-9`), Smedsgatan (`vw-kyr-9e-mansard`), Hantverksgatan (`vw-hjv-5`) och Prästgatan (`vw-pra-8`).
- **Ändarna.** Av spelets 668 vägändar i byn är 57 varken en riktig återvändsgata eller en anslutning till en annan väg (`counts.gameEndsNotRealEnds`). Det är luckornas ändar.

**Husen.**
- **Saknas:** 2 riktiga hus, de dolda industrihusen ovan (`missing`). Alla andra 273 riktiga hus ritas.
- **Står fel:** de sex handbyggda landmärkena står 0,9–3,2 m från sin plats på kartan (`moved`):

  | Landmärke | Avstånd |
  |---|---|
  | Herrgården | 3,2 m |
  | Campus | 2,3 m |
  | Pizzans hus | 1,8 m |
  | Gästgivaregården | 1,7 m |
  | Kyrkan | 1,4 m |
  | Järnvägsstationen | 0,9 m |

  Orsaken: ingesten räknade landmärkets mitt med den slutande punkten två gånger, medan `CraftedLandmarks.tsx` centrerar polygonen utan den.
- **Finns i spelet men inte på kartan:**
  - 47 syntetiska hus (`synthesised`, `counts.synthesisedShown`). Fem av dem står på en riktig väg (`synthesisedOnRoad`): de fyra ovan och `vw-pra-15s`, `vw-forskola`.
  - 56 uthus (`counts.outbuildings`). Inget av uthusen står på ett riktigt hus eller en riktig väg (`counts.shedConflicts` 0).

## B. Rättningen efter Anders beslut (2026-10-09)

Anders: "Princip: den riktiga kartan gäller." Fem beslut om B.1, sedan B.2 och B.3.

**Bilderna, före och efter.**
- `scripts/order322-karta.mjs` med `KARTA_TAG=fore` (före rättningen) och `KARTA_TAG=efter` skriver samma bilder som i B.1 till `frontend/reports/order322/fore/` och `.../efter/`, med var sin `karta.json`.
- Utsnitten är låsta i `reports/order322/karta-vyer.json`, så att `karta-1.png` före och efter visar samma ruta.
- `reports/order322/jamfor/karta-*.png` har före till vänster och efter till höger.
- Ny i bilderna: en svart ring vid varje vägände som inte finns i verkligheten (`karta.json` `falseEnds`).
- Före-körningen gav samma tal som B.1 (`fore/karta.json` `counts`).

**Talen** (`fore/karta.json` och `efter/karta.json`, `counts`):

| Mått | Före | Efter |
|---|---|---|
| Luckor i vägarna (`roadIssues`) | 32 | 0 |
| Meter lucka (`gapMetres`) | 441 | 0 |
| Vägändar som inte finns i verkligheten (`gameEndsNotRealEnds`) | 57 | 1 |
| Riktiga hus som saknas (`missing`) | 2 | 0 |
| Dolda påhittade hus (`synthesisedHidden`) | 16 | 0 |
| Påhittade hus på en riktig väg (`synthesisedOnRoad`) | 5 | 0 |
| Landmärken som står fel (`moved[].distM` > 0) | 6 | 0 |

**1. De 16 dolda påhittade husen** är borttagna ur `grythyttan-world.json`. Vägarna genom dem är hela: Lokavägen vid Prästgatan, Kyrkbacken mot Torget, Kyrkogatan mellan Torget och Smedsgatan, Skolgatan, Magasinsgatan och Åsgatan.

**2. Industrihusen vid stationen** (`w870510826`, `w870510828`) står.
- Ett riktigt hus döljs aldrig (`buildingsOnRoads.ts`: `provenance 'osm'` hoppas över). Mängden `BUILDINGS_ON_ROADS` är nu tom.
- De två servicevägarna (`w1329020075`, `w1329020076`) är i OSM märkta `tunnel=building_passage`: en genomfart genom huset, från vägg till vägg. De ritas inte.
- Vägarna som möter dem ritas fram till husets vägg. Jämförelsen räknar genomfarterna för sig (`efter/karta.json` `passages`), inte som luckor.
- Ändarna vid väggarna räknas som riktiga ändar (`gameEndsAtPassage`).

**3. Riktiga hus nära vägen.** Vägen klipps inte längre (`roadSurface.ts`, `splitRoad`). Mittlinjen provas varje meter:
- trottoaren ritas där dess kant är fri från hus. Annars ritas biten utan trottoar;
- går också körbanans kant in i ett hus, ritas körbanan smalare där, så bred som ryms. Det sker i steg om 0,25 m, ner till 1 m körbana (`MIN_HALF_M`);
- vägen klipps bara där mittlinjen själv går in i ett hus, eller där inte ens 1 m körbana ryms;
- en väg som går rakt mot en gavel ritas fram till gaveln. Bitarna delar sin gränspunkt, så det blir ingen glipa;
- en väg som inte når något hus är orörd.
- Artur Lindqvists gata (förut 44 m borta), Kyrkogatan och servicevägarna är hela. Där riktiga uppfarter går 0,6–1,3 m från en vägg ritas de smalare.
- Bilarna kör fortfarande på sin egen klippta väg (`world.ts` `CLIPPED_ROADS_VEHICLE`, 3,2 m från hus) och inte på de smala bitarna.

**4. De sex påhittade husen på riktiga vägar** är borttagna: `vw-jarn-9`, `vw-kyr-9e-mansard`, `vw-hjv-5`, `vw-pra-8`, `vw-pra-15s`, `vw-forskola`.
- Inget av dem används i spelet. Ingen kod läser deras id eller namn; de fanns bara i `grythyttan-world.json`.
- Förskolan `vw-forskola` ("Grythyttans förskola") hade ett namn i datan, men ingen kod läste det. Den riktiga förskolan (Björken/Linden, `w870510884`, `w870510872`) ritas av `CraftedLandmarksD2.tsx` och står kvar. Ingenting behövde alltså flyttas.
- Det finns två uthus färre (`outbuildings` 56 → 54). Uthusen ställs per hus (`onRoadAudit.ts`, `<hus>:uthus`), men vilka två som försvann är inte utrett.
- Rättelse till B.1: där stod "fem av dem", men listan hade sex. `synthesisedOnRoad` var 5, eftersom `vw-pra-8` klippte Prästgatan genom trottoaren men inte stod på mittlinjen.

**5. Landmärkena.**
- Räknefelet var att ingesten räknade den slutande punkten två gånger. `polyCentroid` i `scripts/fetch-grythyttan-osm.mjs` räknar den nu en gång, som `CraftedLandmarks.tsx` gör.
- `landmark.position` i `grythyttan-world.json` är rättad för de sex: Kyrkan, Campus, Gästgivaregården, Pizzans hus, Herrgården och Järnvägsstationen. Avståndet är 0 för alla (`efter/karta.json` `moved[].distM`).
- Kärnhuset (0,9 m) och Länsmansgården (2,5 m) hade samma fel och är rättade på samma sätt. Det flyttar bara deras markör, inte husen.
- Foodtruckens plats vid Måltidens hus (`villagePlaces.ts` `CAMPUS`) har kvar det gamla talet, så att vagnen står där den stod.

**B.3. Vägändarna.**
- Testet `src/strategic/__tests__/order322Byn.test.ts` provar varje ände av en ritad vägbit i byn (`roadRenderPieces`) mot OSM. Det använder samma mått och toleranser som `order322-karta.mjs`.
- En ände är godkänd om den är en riktig återvändsgata, ligger vid en genomfarts vägg eller ligger på en annan ritad vägbit.
- Testet prövar också beslut 1–5.
- **Av de 57 ändarna är 1 kvar** (`efter/karta.json` `falseEnds`):
  - **55** försvann för att luckorna är stängda;
  - **1** (Järnvägsgatans serviceväg `w870510829` vid industrihuset) är nu en riktig ände vid genomfartens vägg (beslut 2);
  - **1 är kvar:** uppfarten `w862853244` förbi Länsmansgården (`w1422743880`). I OSM går mittlinjen 0,34 m från husets hörn, så inte ens 1 m körbana ryms. Vägen bryts 3,6 m. Testet har den som enda undantag (`KNOWN_ENDS`).
- Uppfarten kan bli hel på två sätt: att vägen får gå 0,2 m in under hörnet, eller att mittlinjen flyttas en halv meter från huset. Båda avviker från kartan, så det är Anders beslut.

**B.2. Etiketterna.**
- Det fanns ingen ordertext för B.2 i repot. Claude Codes tolkning: byns etiketter får inte ligga på varandra på skärmen. Byns etiketter är krogarnas skyltar, sällskapen på väg till krogen och gatunamnen.
- Krogarnas skyltar flyttades redan isär sinsemellan (ORDER 297/300). Gatunamnen och sällskapen räknades inte mot något.
- `scene/LabelDeclutter.tsx` placerar etiketterna i ordning, var sjätte bildruta:
  1. krogarnas skyltar står kvar;
  2. sällskapen, närmast dörren först;
  3. gatunamnen, huvudvägarna först.
- En etikett som skulle ligga på en som redan står döljs tills den har plats. Rektangeln är den omslutande på skärmen. För ett vridet gatunamn är den något större än texten, så hellre ett namn för mycket dolt än två på varandra.
- **Kontrollen:** `scripts/order322-etiketter.mjs` körs i produktionsbygget, på svenska, i 1440 × 900 och 1280 × 720.
  - Flödet: provspelet i vinbaren, förberedelserna och kvällen efter 19.05, på nivåerna Byn (V), Kvarteret (C) och Gatan (X).
  - Morgonen mäts inte, eftersom morgonens panel täcker byn.
  - Det som mäts är de synliga etiketternas rektanglar, par för par.
- **Före** (`reports/order322/fore/etiketter.json`): 3–4 par per bild på nivån Byn, i 1280 × 720 som mest 4. Alla par var gatunamn under en krogskylt (Artur Lindqvists gata under Hyttgrillen, Hotellets matsal och Grillvagnen; Hyttgatan under Pizzeria Grytan) eller två gatunamn (Östra Bergvägen och Kolargatan).
- **Efter** (`reports/order322/efter/etiketter.json`): `ok: true`, 0 par i alla tolv mätningar. På nivån Byn är 3 gatunamn dolda.
- Bilderna ligger i `fore/etiketter-*.png` och `efter/etiketter-*.png`.
- På nivåerna Kvarteret och Gatan stod som mest två etiketter, och de låg inte på varandra varken före eller efter.

**Ändrade filer.**
- `grythyttan-world.json`: 22 påhittade hus borttagna och åtta landmärkens position rättad.
- `content/roadSurface.ts`: vägen ritas smalare eller utan trottoar i stället för att klippas.
- `content/buildingsOnRoads.ts`: riktiga hus döljs aldrig.
- `scripts/fetch-grythyttan-osm.mjs`: mitten räknas rätt.
- `scene/LabelDeclutter.tsx` och `StrategicScene.tsx`: etiketterna.
- Testerna `order322Byn.test.ts` och `order312bTillFots.test.ts`. Prästgatan är hel, så biten heter inte längre `#p1`.
- Skripten `order322-karta.mjs` och `order322-etiketter.mjs`.

## Kvar

- Uppfarten vid Länsmansgården (B.3 ovan): Anders beslut om den sista vägänden.
- B.2 byggdes efter Claude Codes tolkning (byns etiketter på skärmen). Gällde beslutet andra etiketter, behöver det sägas.
