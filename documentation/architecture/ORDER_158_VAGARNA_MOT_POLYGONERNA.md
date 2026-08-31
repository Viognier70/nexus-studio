# ORDER 158 — Vägarna mot polygonerna

**Repo** `Viognier70/nexus-studio` · **Gren** `order-158` (från `main`)
**Klass** AUTONOM
**Datum** 2026-08-30 (utfärdad) · **Executed** 2026-08-31
**Följer** ORDER 136 §6 — enda strukturella lösningen

---

## 1. Läget

ORDER 135 fann att mätningen läste OSM-taggar medan renderingen läser
`ROLE_SPECS`. Med rätt geometri: **32 byggnader kolliderar med renderad
vägenvelope**, det värsta 4,36 meter.

ORDER 136 prövade om smalare vägar löser det. **Nej.** Två alternativa scheman
gav 32 kollisioner i alla tre regimer — bara djupet krympte, från 4,36 till 3,06
meter.

Uppdelningen förklarar varför: **19 av 32 är strukturella.** Vägens polyline går
fysiskt genom byggnaden. Ingen bredd hjälper mot det. Återstående 13 skulle kräva
envelope under 1–2 meter, vilket inte är en väg.

Vision Owner har sett det i dev-servern: vägar går rakt in under tak och tar slut
mitt i huskroppar.

---

## 2. Vad som byggs

En polygon-guard i `OsmRoads.tsx`, **analog med ORDER 132:s `windowsFor`-guard.**

Läs ORDER 132:s lösning först och följ dess strategi. Två guards med olika logik
för samma sorts problem är hur felen uppstod från början.

**Hela envelopen klipps, inte bara mittlinjen.** Trottoaren är en del av det som
renderas och en del av det som kolliderar — ORDER 135 visade att skillnaden
mellan carriageway och envelope var 30 mot 32 byggnader.

---

## 3. Vad som INTE får göras

**Inga vägbredder ändras.** ORDER 136 visade att det inte löser något, och
`ROLE_SPECS` styr hur hela byn ser ut.

**Inga byggnader flyttas.** Inga polygoner redigeras. Ingen OSM-data ändras.

**Vägnätet får inte gå sönder.** En guard som klipper för mycket ger avbrutna
gator — och en väg som slutar mitt i luften är värre än en som korsar ett hus.

---

## 4. Definition of Done

1. Guarden följer ORDER 132:s strategi; avvikelser motiverade.
2. **Mätningen körs om** med ORDER 135:s skript — samma envelope-geometri.
   Antal kolliderande byggnader före och efter.
3. **Vägnätet är intakt.** Test som hävdar att inget vägsegment blivit tomt, och
   att antalet renderade segment är oförändrat eller nästan.
4. **Sammanhängande gator.** De 19 strukturella fallen är vägar som går genom
   hus — efter klippningen uppstår ett hål där huset står. Redovisa hur det ser
   ut: bryts gatan i två delar, eller försvinner ett parti?

   Det här är ordens känsligaste punkt. En gata med ett hål mitt i är synligt fel
   på ett annat sätt än en gata genom ett hus.
5. Skärmdumpar före och efter av de två vyer Vision Owner rapporterade — den
   svarta byggnaden där vägen tar slut, och den stora röda längan tvärs över
   gaturummet.
6. `git diff` visar `ROLE_SPECS`, `roadRoles.ts` och byggnadsgeometrin orörda.
7. Typecheck grön, hela sviten grön, båda CI-jobben gröna.
8. Registerpost i samma commit, och ORDER 130:s rad uppdaterad så att
   §3.1-fyndet inte står öppet.

---

## 5. Om något inte går

**Om DoD 4 visar att hålen ser sämre ut än överlappen — stanna.** Rapportera med
skärmdumpar och bygg inte vidare.

De 19 strukturella fallen betyder att vägens linje är dragen genom huset.
Klippning döljer symptomet; den rätta lösningen kan vara att flytta polylinen,
och det är ett annat och större arbete.

Det är bättre att veta det med bilder än att gissa nu.
