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

## Kvar

- B (byn): B.1, listan över skillnaderna mot den riktiga kartan, visas för Anders innan något rättas. B.2 och B.3, testerna för etiketterna och vägändarna, kommer efter det.
