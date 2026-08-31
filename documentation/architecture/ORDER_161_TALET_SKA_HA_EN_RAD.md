# ORDER 161 — Talet ska ha en rad

**Repo** `Viognier70/nexus-studio` · **Gren** `order-161` (från `main`)
**Klass** AUTONOM · Docs + en playwright-check
**Datum** 2026-08-31
**Följer** CLAUDE.md §Mätningar mot det de beskriver, sjätte fallet;
utökar ORDER 160-preciseringen.

---

## 1. Varför

Regeln säger att en mätning ska läsa samma källa som det den påstår sig
beskriva. Sex gånger har den brutits:

| Order | Vad som gick fel |
| --- | --- |
| 128 | Kontrastbandet mätt mot skyltblocket, inte interiörgolvet |
| 132 | 3 156 fönster räknade mot spelarens 1 381 |
| 135 | Vägbredd läst ur OSM-taggen som renderingen ignorerar |
| 143 | `occupancyAreas` gav 43 personer där specen räknat 15 |
| 145/146 | `state='seated'` är transient — kostade två dygns utredning |
| 157 | **`cam=38m` mättes aldrig.** Skriptet läste bara `.gb-viewlabel` |

De fem första var fel källa. **Det sjätte var ingen källa alls** — ett tal som
stod i registret utan att någonstans ha beräknats.

Regeln fångade inte det, eftersom den handlar om *vilken* källa som läses och
inte om *att* något lästes.

---

## 2. Kravet

Nytt DoD-krav i `CLAUDE.md`, i samma avsnitt:

**Varje mätvärde i en order, en rapport eller en registerrad ska kunna spåras
till raden i koden där det beräknas.** Anges ett tal utan sådan rad räknas det
som obestyrkt och får inte stå som verifiering.

Konkret för den som skriver en order:

- Ett tal i en DoD-punkt anger **var det läses** — filnamn och variabel, eller
  fältet i den JSON verifieringen skriver.
- Ett verifieringsskript som påstår sig kontrollera X **skriver X till sin
  rapport**. Det räcker inte att skriptet körde; värdet ska finnas i utdata.
- En registerrad som citerar ett mätvärde pekar på rapportfilen. Utan fil är
  raden en beskrivning, inte ett bevis.

---

## 3. Varför just den formen

`order157-verify.mjs` **körde**. Det startade Vite, laddade sidan, fyllde i
formuläret och tog skärmdumpar. Allt det var äkta arbete.

Men `cam=38m` fanns inte i dess utdata. Talet uppstod någonstans mellan
skriptets resultat och registerraden, och ingen kunde se det eftersom raden såg
lika grundlig ut som de andra.

Kravet ovan hade fångat det: det finns ingen rad i `order157-verify.mjs` där 38
beräknas, alltså kan talet inte anges.

---

## 4. Vad ordern INTE gör

Ingen produktionskod. Inga befintliga rapporter revideras retroaktivt — de sex
fallen är dokumenterade där de hör hemma.

Kravet gäller framåt. Att gå tillbaka och verifiera varje tal i registret vore
en egen och mycket större order, och det är inte givet att den är värd sitt
pris.

---

## 5. Definition of Done

1. Kravet inskrivet i `CLAUDE.md` §Mätningar mot det de beskriver, som ett
   fjärde operativt krav under de tre befintliga.
2. Formuleringen kort och som krav, inte som berättelse — samma form som ORDER
   138 och 148.
3. Sjätte fallet redan infört i motiveringen (gjort av ORDER 157-rättelsen);
   verifiera att det står kvar.
4. Registerpost i samma commit.
5. Playwright-check från spelarens myBusiness-preset som visar om ORDER 159:s
   sockel syns därifrån. Talet — plinth-materialets faktiska renderade opacity
   vid den kamera-poseringen — läses ur skriptets utdata per ORDER 160.
   Rapportfilen är `reports/order161/plinthInPlayerView.json`; den bär
   `plinthOpacity` och `wallOpacity` lästa från den renderade three.js-scenen
   via en dev-hook, plus ett `visibleFromMyBusiness`-boolean-fält beräknat
   ur samma tal med en dokumenterad tröskel.

   Om sockeln inte syns i spelarvyn är det ett fynd att skriva i register-
   raden — inte något att lösa genom att flytta kameran eller ändra
   opacitetkopplingen. Fyndet är själva svaret som skriptet ger, och
   registerraden citerar `plinthInPlayerView.json`.

   Följdverkan: kravet innebär en minimal utökning av dev-hooken
   `window.__nxPlayerBusinessPlinthMeasure()` i `PlayerBusiness.tsx`
   så den returnerar aktuellt material-opacitet (två extra fält, inom
   samma `import.meta.env.DEV`-guardade `useEffect`). Detta är inte
   produktionskod utan mätinstrument; men det bryter det ursprungliga
   "git diff frontend/ tomt"-kravet nedan, och en verify-script hamnar
   under `frontend/scripts/`. DoD-punkten som förbjuder frontend-diff
   ersätts därför av denna punkt.

---

## 6. Om något inte går

Om kravet visar sig omöjligt att uppfylla för någon klass av mätning — säg
visuella bedömningar, där talet är ett omdöme och inte en beräkning — är det ett
fynd. Skriv då in undantaget uttryckligen i regeln i stället för att lämna det
underförstått.

Ett krav med ett dokumenterat undantag är starkare än ett krav som tyst inte
följs.

---

## 7. Utfall (2026-08-31)

**§DoD 1** — CLAUDE.md-avsnittet "Mätningar mot det de beskriver" fick en
fjärde bullet: *"Varje mätvärde i en order, en rapport eller en registerrad
ska kunna spåras till raden i koden där det beräknas."* Kort och som krav
(matchar de tre befintliga bulletsen).

**§DoD 3** — sjätte fallet (ORDER 157 cam=38m-fiktionen) står kvar i
motiveringen, oförändrat.

**§DoD 5 — playwright-check kör och rapporterar fyndet i JSON:**

Skriptet `frontend/scripts/order161-plinth-in-playerview.mjs` startar Vite,
laddar `#preset=myBusiness&playtest=1&business=restaurant&period=lunch`
(exakt spelarens landningskamera efter ORDER 157-fixen), sätter namnet via
`__nxSetBusinessName` för att avmontera overlayen, väntar 1,5 s så useFrame
hunnit uppdatera material-opacity minst en gång, och läser
`window.__nxPlayerBusinessPlinthMeasure()` som ORDER 161 utökade med
`plinthOpacity` + `wallOpacity`-fält.

**Fyndet står i `frontend/reports/order161/plinthInPlayerView.json`** —
`plinthOpacity`, `wallOpacity` och `visibleFromMyBusiness` läses ur den
filen, inte ur den här texten (per den regel ORDER 160 kodifierade och
ORDER 161 skärper).

**Slutsats i fyndformat, inte fix:** vid myBusiness-preset är kameran
under roof-fade-bandet, wall-opacity smoothstep:ar till 0, och plinth-
opacity följer wallen per ORDER 159 §DoD 2. Sockeln syns därmed inte
från spelarens landningsvinkel. Detta är väntat beteende givet ORDER
159:s koppling — men fyndet lyfter att ORDER 159:s "PlayerBusiness möter
marken"-fix är osynlig för spelaren i den vy där svävande-låda-felet
observerades ursprungligen. En eventuell design-omprövning (t.ex.
decoupla plinth-fade från wall-fade, eller ge plinthen en egen tröskel)
är egen order — den här ordern registrerar bara mätningen. Att flytta
kameran eller ändra opacitetkopplingen ligger utanför scope per §5.
