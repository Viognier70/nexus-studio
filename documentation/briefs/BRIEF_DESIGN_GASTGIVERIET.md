# Brief till Claude Design — Gästgiveriet

**Projekt** nexus-studio · strategiska spåret
**Lyder under** SD-004 (3D-scen, kroppar utan ansikten)
**Formmall** `brewpubRoom.ts` — samma struktur, samma kontrakt

---

## 1. Formen är satt

Ölkrogen levererades som `brewpubRoom.ts` och vinbaren som `wineBarRoom.ts`. Ren
three.js, byggd imperativt en gång, ingen egen klocka, ingen simuleringslogik.
Platsspecar med kurs, gångvägsfunktioner, siktlinjekontroll, minimimått med
`fits: false` i stället för en krympt plan, och ett FLAGS-block för det som
kräver tillstånd sim-lagret inte har.

**Gästgiveriet byggs i samma form.** Filen heter `innRoom.ts` och är
självständig.

---

## 2. Vad gästgiveriet är

Hundra platser i matsalen. **Åttio gästrum.** Stort kök med flera stationer,
soignée servering, mycket personal.

Det ersätter värdshuset, som är beslutat i R4 men aldrig byggt — dygnsstruktur,
gäster som stannar över natten, frukostpass. Beslutet att gästgiveriet ersätter
det togs 2026-08-29.

Det här är den största klassen som byggs. Ölkrogen och vinbaren har tjugo
platser; det här har fem gånger fler och ett helt andra våningsplan.

---

## 3. Två avgöranden som redan är fattade

**Rummen som volym, matsalen möblerad.** De åttio gästrummen får dörrar,
väggar och volym — men ingen inredning. Kameran ser ovansidor, och åttio sängar
med nattduksbord är geometri som aldrig läses.

Det spelaren styr är serveringen och personalen. Sovrummen är kapacitet, inte
scen.

**Byggnadens form är din.** En huvudbyggnad med flyglar, eller huvudbyggnad plus
längor runt en gård — det senare är hur svenska gästgiverier faktiskt ser ut.
Välj och motivera kort.

---

## 4. Rummets frågor

**Var ligger de åttio rummen?** Ett plan över matsalen, en länga i markplan,
eller båda? Det avgör om kameran ser ett tak eller en gård.

**Frukostpasset.** Samma matsal som middagen, eller egen yta? En gäst som bor
där kommer ner på morgonen — den rörelsen mellan rum och matsal är
verksamhetens signatur.

**Hundra platser är mycket.** Fördelningen mellan stora bord, mindre sällskap
och eventuell separat sal är en läsbarhetsfråga: hundra stolar i ett rum blir
en matta av cylindrar uppifrån om de inte grupperas.

**Köket med flera stationer.** Ölkrogen har tre, vinbaren två. Hur många här,
och hur läses de som ett arbetsflöde snarare än som lådor?

Svara med planlösningen, inte med frågor tillbaka.

---

## 5. Måtten, kameran och golvet

Meter, samma som scenens världskoordinater. Figurer 1,70 m, axelbredd 0,46 m för
gäst och 0,40 m för personal. Passager ska rymma en människa.

**Golvfärgerna är kritiska och en fälla.** `silhouetteContrast.ts` kräver att
figurer läses mot varje golv de kan stå på — bandet är 1,8 till 3,6 i
WCAG-kontrast.

Vinbarens leverans kalibrerade mot `#a89577`, vilket visade sig vara skyltblocket
och inte interiörgolvet. **Det faktiska interiörgolvet är `#a08462`.** Kalibrera
mot det.

Och ju fler zoner, desto smalare blir fönstret för figurernas färger. Ölkrogen
har tre golv, vinbaren fem. Håll antalet nere, och undvik mörka golv — DJ-zonens
L 0,2478 i vinbaren var nära att stänga fönstret helt.

---

## 6. Vad som INTE ingår

Gäster och personal — `figureRig.ts` finns. Ljus, himmel, väder — byggt.
Rekvisita och huvudbonader. De andra klasserna. Ingen simuleringslogik.

Ingen inredning i gästrummen, per §3.

---

## 7. Flagga i stället för att uppfinna

Vinbarens sju flaggor var leveransens bästa del. Samma regel här.

Troliga fall: **övernattning** — en gäst som bor kvar har inget tillstånd i
simuleringen som säger vilket rum eller hur länge. **Frukost som eget pass** —
dygnsstrukturen är beslutad i R4 men det är oklart vad koden faktiskt bär.
**Rumsstädning och personal mellan planen** — rörelse som kräver tillstånd som
inte finns.

Åttio rum utan tillstånd för vem som bor i dem är geometri, och det ska sägas i
flaggan.
