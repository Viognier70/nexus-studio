# ORDER 131 — Load-svep per verksamhet

**Repo** `Viognier70/nexus-studio` · **Gren** `order-131` (från `main`)
**Klass** AUTONOM · Mätning, ingen kalibrering
**Datum** 2026-08-28
**Beroende** ORDER 110 och 111 (R4), båda i `main`

---

## 1. Varför

ORDER 111 mätte load per verksamhet och fick p50 **0,72 / 0,79 / 0,98** för
restaurang, food truck och värdshus. Med bandet för `hurried` satt till 0,95
betyder det att en värdshusspelare ser `hurried` nästan konstant medan en food
truck-spelare knappt ser det alls.

**Men tre punkter är inte en fördelning.** Siffrorna kom ur ett fåtal körningar,
och frågan — ska banden vara per verksamhet — kan inte avgöras på dem. Den står
som öppen i registret sedan dess.

Ordern producerar underlaget. Den avgör ingenting.

---

## 2. Vad som ska mätas

Fixed-seed-svep över samtliga tre verksamheter.

**Minst 200 körningar per verksamhet**, seedade så att sviten är
reproducerbar — samma krav som på det befintliga load-testet. Fler om det ryms
inom rimlig körtid; ange faktiskt antal i rapporten.

Per verksamhet redovisas percentilerna **p10, p25, p50, p75, p90, p99** samt
andelen av speltiden över vart och ett av de befintliga ansiktsbanden.

**Och fördelningen ska redovisas som form, inte bara som tal.** Ett histogram i
rapporten, så att det syns om massan ligger samlad eller tvåpucklig. Food
truckens p10 på 0,324 mot restaurangens noll antydde att den aldrig andas —
det är en formskillnad, och den syns inte i en median.

---

## 3. Vad som ska brytas ut

Redovisa fördelningen **per fas** inom passet, inte bara aggregerat över hela.
Värdshusets dygnsstruktur med frukostpass gör att ett medelvärde över dygnet
sannolikt inte beskriver någon enskild timme.

Och redovisa `capacity`-beroendet: food truckens 30 mot restaurangens 16 gör att
kön beter sig olika, och kön toppade en gång på 27 mot tre i personalen.

---

## 4. Vad som INTE får göras

**Inga band kalibreras om.** Inte ett värde ändrat i `deriveFaces` eller i
tröskeltabellen.

Detta är femte gången frestelsen uppstår. ORDER 088 flyttade `hurried` från 0,85
till 0,95 och det var att måla om mätaren — belastningen var pinnad i taket och
förblev det. ORDER 090, 111 och SD-004 har alla avvisat samma sak.

Ordern får heller inte **föreslå** ett värde. Den redovisar var massan ligger;
vilket band som är rätt är en fråga om spelkänsla och avgörs efter spel, inte ur
en fördelning.

---

## 5. Rapporten

Skrivs till `documentation/blueprints/` bredvid de tidigare mätrapporterna.

Ska besvara rakt: **beskriver ett band alla tre verksamheterna, eller inte?**
Om inte — hur långt isär ligger de, uttryckt som andel av speltiden över bandet.

Rapporten får inte dölja ett dåligt resultat. Visar svepet att skillnaden var
ett artefakt av få körningar ska det stå.

---

## 6. Definition of Done

1. Minst 200 fixed-seed-körningar per verksamhet; antal och seed redovisade.
2. Sex percentiler per verksamhet.
3. Andel av speltiden över vart och ett av de befintliga banden, per
   verksamhet.
4. Histogram per verksamhet i rapporten.
5. Fördelning per fas enligt §3.
6. Svepet incheckat som körbart test, inte som engångsskript.
7. Grep: inga ändrade värden i tröskeltabellen eller `deriveFaces`.
8. Registerrad i samma commit.
9. Hela sviten grön, CI grön i båda jobben.

---

## 7. Avgränsningar

Ingen kalibrering, inget förslag på nya band. `capacity` ändras inte. Ingen
produktionskod i sim-lagret rörs — svepet läser, det skriver inte.

Presentationslagret rörs inte alls. `proud`-defekten hör till
ansiktsvokabulärens flytt enligt SD-004 §3.4, inte hit.
