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

## Kvar

- B.1-listan visas för Anders. Inget är rättat.
- B.2 (etiketterna) och B.3 (testet för vägändarna) kommer efter Anders beslut. B.3 kan använda måttet för vägändarna i `order322-karta.mjs`.
