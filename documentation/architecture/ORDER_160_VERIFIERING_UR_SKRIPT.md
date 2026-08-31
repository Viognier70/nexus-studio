# ORDER 160 — Verifieringsvärden läses ur skriptets utdata

**Repo** `Viognier70/nexus-studio` · **Gren** `order-160-verifiering-ur-skript` (från `main`)
**Klass** AUTONOM
**Datum** 2026-08-31
**Följer** Vision Owner-instruktion 2026-08-31 efter ORDER 157-rättelsen
**Utökar** CLAUDE.md § "Mätningar mot det de beskriver"

---

## 1. Läget

ORDER 157:s registerrad rapporterade `cam=38m (från 900)` som bevis
på att kamera-fixen fungerade. Talet var **fiktion** — verify-scriptet
(`frontend/scripts/order157-verify.mjs:64-88`) läste bara ViewLabel-
textContent, aldrig `camera.actual.distance`. Rättelsen 2026-08-31
klassade det som sjätte fallet i CLAUDE.md-avsnittets "Mätningar mot
det de beskriver" (efter ORDER 128, 132, 135, 145/146, 143).

CLAUDE.md-regeln säger att en mätning ska läsa samma källa som det
den påstår sig beskriva. Regeln säger däremot **inte** var själva
det rapporterade talet ska komma från. ORDER 157:s fel var inte att
scriptet mätte fel geometri — det var att RAPPORTEN nämnde ett tal
som scriptet aldrig producerade. Talet såg giltigt ut eftersom det
stod i en verify-kontext.

## 2. Regeln

**Ett tal som verifierar en renderad egenskap ska läsas ur skriptets
utdata, inte anges i rapporten.** Konkret:

- Om en rapport påstår "sockelhöjden är X m" ska X komma från
  `reports/<order>/<script>.json` (eller motsvarande skript-output),
  där skriptet läste den ur den faktiska three.js-scenen (bounding
  box, world-y på mesh, pixel-mätning — beroende på vad talet är).
- Rapporten refererar filen som talet står i, inte talet.
- Om skriptet inte producerar talet ska rapporten säga "inte mätt"
  eller "obestyrkt", inte gissa ett nummer som ser giltigt ut.

## 3. Vad som INTE räknas som verifiering

- Ett tal som är författat i JavaScript-kod (`const PLINTH_H = 0.42`)
  och rapporten skriver `sockelhöjden är 0,42 m per konstant` —
  det bevisar bara att konstanten existerar, inte att den nådde
  skärmen som avsett. Kan användas som *referens* till spec, men
  inte som verifiering av rendering.
- Ett tal som scriptet loggar till stdout utan att skriva till en
  fil — flyktigt, går inte att spåra i git. Måste skrivas till
  `reports/<order>/<name>.{json,txt}`.
- Ett tal som scriptet räknar ut med sin egen kopia av produktions-
  logik (redan täckt av CLAUDE.md-regeln "Mätningar mot det de
  beskriver"). Den här ordern lägger till: även när scriptet läser
  RÄTT källa ska talet inte hoppa från skriptet till rapporten via
  manuell inklistring — rapporten citerar filen.

## 4. Två godkända mönster för att läsa från scenen

**A. `window.__nx*`-dev-hook.** Playwright-scriptet exponerar en
funktion i dev-build som gör en scen-lookup och returnerar ett
värde. Skriptet `page.evaluate()`-anropar den och skriver JSON.
Exempel: `window.__nxPlayerBusinessPlinthMeasure()` traversar
three.js-scenen, hittar plinth-mesh, returnerar `{yMin, yMax,
heightM}` från dess bounding box.

**B. Pixel-mätning.** Playwright tar screenshot av ROI, en analys-
funktion identifierar färg-övergången (t.ex. plinth-grå mot vägg-
röd) och räknar y-pixlar. Robust men kräver kalibrerad kamera-vy.
Använd bara när scen-traversering inte räcker.

Båda skriver resultatet till `reports/<order>/<name>.json`. Rapporten
citerar filnamnet och centrala fält, inte talvärden inbäddade.

## 5. Definition of Done

1. `CLAUDE.md` uppdaterad med en referens till denna order i
   "Mätningar mot det de beskriver"-avsnittet — kort not att
   ORDER 160 preciserar var det verifierande talet ska stå.
2. ORDER 159 och framåt följer regeln. Retroaktiv genomgång av
   äldre order är inte krav — regeln gäller nya.
3. Registerpost i samma commit.
4. Typecheck grön (docs-only, ingen kod), full svit grön (påverkas
   inte).

## 6. Om något inte går

Regeln är avsedd att vara enkel att följa. Om ett skripts utdata
inte kan skrivas som JSON (t.ex. binär skärmdump som är själva
mätningen) — då är skärmdumpen skriptets utdata, och rapporten
refererar filen. Ingen tal-fiktion i rapport-text i något fall.
