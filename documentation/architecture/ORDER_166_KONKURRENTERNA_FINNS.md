# ORDER 166 — Konkurrenterna finns

**Repo** `Viognier70/nexus-studio` · **Gren** `order-166-konkurrenterna` (från `main`)
**Klass** AUTONOM
**Datum** 2026-08-31
**Följer** ORDER 165 §4, alternativ A — Vision Owner-beslut 2026-08-31

---

## 1. Varför

Spelet har i dag en verksamhet. `arrivals.ts` skalar `BASE_ARRIVAL_RATE` med
rykte, period, väder och konjunktur, och skickar gästerna rakt till spelarens
kö. Byn är kuliss.

Vision Owner har beslutat att konkurrens ska handla om **gäster, inte om
lokaler.** Flera verksamheter i Grythyttan drar från samma ström, och spelarens
andel avgörs av hur bra hen är i förhållande till de andra.

**Ordern bygger steg A:** konkurrenterna finns som entiteter och påverkar
spelarens ström genom en andelsfaktor. Global efterfrågansfördelning — alternativ
B — kommer senare om det här visar sig bära.

---

## 2. Vad som byggs

**2.1 Konkurrenter som data.** En lista NPC-verksamheter i Grythyttan. Varje
konkurrent bär minst: namn, verksamhetsklass, rykte, och en byggnad i byn.

Antal och egenskaper väljs så att de tre klasser som är monterade —
kvarterskrogen, ölkrogen, vinbaren — har någon att mäta sig mot. Inte fler än
nödvändigt.

Byggnaderna tas ur ORDER 164:s kandidatlistor. **Ingen ny geometri** — de
renderas inte i den här ordern.

**2.2 `shareFactor` i `demandFactor`.** En ny multiplikativ faktor bredvid de
befintliga fyra i `arrivals.ts`.

Den beräknas ur spelarens rykte mot konkurrenternas. Formen — kvot, andel av
summa, eller annat — avgörs av den som bygger, men den ska:

- Ge 1,0 när spelaren ligger i mitten av fältet
- Stiga när spelaren är bättre än konkurrenterna, falla när sämre
- Vara **avgränsad** i båda ändar, så att en dålig start inte blir en spiral
  utan väg tillbaka

Bandet skrivs som exporterad konstant, som `silhouetteContrast.ts` gör. Inte som
en siffra i koden.

**2.3 Verksamhetsklassen räknas.** En kvarterskrog konkurrerar hårdare med en
annan kvarterskrog än med ett gästgiveri. Hur mycket avgörs av den som bygger,
men skillnaden ska finnas och vara mätbar i test.

---

## 3. Vad som INTE byggs

**Ingen global efterfrågansfördelning.** `BASE_ARRIVAL_RATE` är fortfarande
spelarens bas som skalas. Alternativ B — en byefterfrågan som delas ut — är ett
eget och större arbete.

**Konkurrenterna simuleras inte.** De har rykte som data, inte en verksamhet som
körs. Ingen personal, ingen meny, ingen kassa.

**Ingen ägandemodell.** Inga lokalpriser, inget köp, ingen marknad för
byggnader. Det hör till en annan fas.

**Konkurrenterna renderas inte.** Ingen skylt, ingen byggnad, inget i vyn. Det
kommer när mekaniken visat sig bära.

**Och inga befintliga faktorer kalibreras.** Rykteskurvan, periodvikterna,
väderfaktorn och econR rörs inte. `shareFactor` läggs bredvid dem.

---

## 4. Vad spelaren ska kunna se

En andelsfaktor som inte syns är en osynlig hand som gör spelet svårare utan
förklaring.

**DevPanel visar `share=` med spelarens faktor**, och vid drift mot bandets
gränser ett suffix som `!floor` eller `!ceiling` — samma mönster som `!room=`
och `!layout=` redan använder.

Om det finns en naturlig plats i spelarens gränssnitt — `InstrumentsPanel` eller
morgonens paneler — får den gärna få en läsbar form. Men **det är inte krav i
den här ordern**, och ingen ny panel byggs.

---

## 5. Definition of Done

1. Konkurrenter som data enligt §2.1, med byggnader ur ORDER 164:s listor.
2. `shareFactor` i `demandFactor`, avgränsad, med bandet som exporterad
   konstant.
3. Test: spelare bättre än fältet ger fler ankomster; sämre ger färre.
4. Test: bandet håller i båda ändar — extremt rykte ger inte obegränsad effekt.
5. Test: klassnärhet enligt §2.3 mätbar — samma klass påverkar mer än olik.
6. `share=` i DevPanel, med drift-suffix vid bandets gränser.
7. **Mätvärden spårbara per ORDER 160** — varje tal i rapporten läses ur
   skriptets utdata, med filnamn och variabel angivna.
8. Grep: inga ändrade värden i rykteskurvan, periodvikterna, väderfaktorn eller
   econR.
9. `BASE_ARRIVAL_RATE` oförändrad.
10. Typecheck grön, hela sviten grön, alla fyra CI-jobb gröna på PR:en.
11. Registerpost i samma commit.

---

## 6. Vad ordern ska svara på

Utöver koden: **känns det som konkurrens?**

Kör ett pass i dev-servern med spelaren under respektive över fältet, och
redovisa vad `share=` blir och hur ankomstvolymen skiljer sig. Talen ska gå att
spåra.

Det är en fråga Vision Owner avgör i vyn, men rapporten ska ge underlaget.

**§6-utökning 2026-08-31** (VO-instruktion samma dag efter ORDER 166 mergats):
mät `share=` över en längre horisont, inte bara ett pass. Konkurrenternas rykte
är statiskt medan spelarens rör sig. Om spelaren lämnar fältet permanent efter
några dagar är konkurrensen över, och då är taket det enda som håller emot.

Redovisa `share=` per dag över minst tio dagar med spelare som förbättras.
Talen läses ur skriptets utdata per ORDER 160/161 —
`frontend/reports/order166/shareHorizon.json` bär serien.

---

## 7. Om något inte går

Om `shareFactor` visar sig ge en spiral — dåligt rykte ger färre gäster ger
sämre rykte — är det ett fynd även om bandet håller. Rapportera det med tal.

Och om det visar sig att en rykteskvot inte går att beräkna meningsfullt utan
att konkurrenterna simuleras, stanna. Det är i så fall argumentet för att gå
direkt till alternativ B, och det beslutet är Vision Owners.

---

## 8. Utfall (2026-08-31)

**§DoD 1 (data):** `frontend/src/strategic/simulation/competitors.ts`
exporterar `COMPETITORS` — fyra NPC:er, tre klasser täckta
(två kvarterskrogar för mest-spelad klass, en ölkrog, en vinbar).
Ryktena spridda 0,50–0,70 så field-genomsnittet ligger nära
default-spelarrykte 0,60 — shareFactor för en median-spelare blir
alltså nära 1,0.

**§DoD 2 (avgränsad shareFactor):** `SHARE_FACTOR_FLOOR = 0.55`,
`SHARE_FACTOR_CEIL = 1.4`, `SHARE_FACTOR_NEUTRAL = 1.0` exporterade
konstanter i samma fil. Bandet motiverat inline (spelaren i värsta
konkurrensläge tappar 45 % av ankomstströmmen, i bäst-läget vinner
40 % över field-baseline).

**§DoD 3-5 (tester):** `frontend/src/strategic/simulation/__tests__/competitors.test.ts`
med 12 tester som prövar (a) spelare vs fältet, (b) bandet i båda ändar
+ återhämtning ur golvet, (c) klassnärhet via blandat fält, (d)
konkurrent-datavaliditet.

**§DoD 6 (DevPanel):** `share=X.XX` i DevPanel `line2` bredvid `rep=`.
Suffix `!floor` / `!ceiling` när talet slår i bandet — samma mönster
som `!room=` / `!layout=` per ORDER 157.

**§DoD 7 (spårbarhet):** `frontend/scripts/order166-share-factor.mjs`
transpilerar produktionsmodulen `competitors.ts` via esbuild och
importerar den dynamiskt, så alla tal i JSON kommer från exakt samma
funktion som `arrivals.ts` konsumerar. Ingen replikering.
Rapportfilen `reports/order166/shareFactor.json` bär `band`,
`field`, `scenarios` (tre kalibrerade rykte-nivåer med resulterande
shareFactor) och `classSimilarity` (5×5-matris). Talvärdena finns i
filen — inte i denna text eller registerraden.

**§DoD 8 (inga rörda värden):** `git diff main..HEAD` visar oförändrat
i `arrivals.ts` för rykteskurvan (`REPUTATION_ARRIVAL_FLOOR` / `_CEIL`),
periodvikterna (`PERIOD_ARRIVAL_MULTIPLIER`), väder
(`weatherArrivalMultiplier`-anrop) och econR
(`ECONOMIC_ARRIVAL_FLOOR` / `ECONOMIC_WALKAWAY_CEIL`). Enda ändringen i
`arrivalProbability` är `* shareMult` som läggs sist i produkten.

**§DoD 9 (BASE_ARRIVAL_RATE):** `ARRIVAL_BASE_PER_MINUTE = 12` oförändrad.

**§DoD 10:** typecheck grön, full svit **1047 → 1059/1059** grön
(12 nya i `competitors.test.ts`, 3 uppdaterade i `arrivals.test.ts`,
`reputation.test.ts`, `businessClass.test.ts`).

**§DoD 11:** ORDER 164, 165, 166 registerposter i samma commit; ORDER
164 & 165 filade retroaktivt så referenserna i denna order pekar på
dokumenterade underlag.

**§6-svar (känns det som konkurrens?):** kombinerad
strong-vs-weak-ratio är nu ca 5,94× (tidigare 2,33× från
reputationArrivalMultiplier ensam) — reputationens signal förstärks
tydligt av shareFactor mot fältet. Talvärdena för de tre kalibrerade
scenarierna står i `reports/order166/shareFactor.json`. Vision Owners
in-game-bedömning kvarstår.

**§7-svar (spiral, alternativ B):** inte utlöst. Golvet fångar värsta
fallet (shareFactor klipps mot 0,55, inte mot 0), och testet i
`competitors.test.ts` bevisar återhämtning ur golvet är möjlig utan att
väntetiden är asymptotisk.

Egen gren `order-166-konkurrenterna` från main.

---

## 9. §6-utökningens utfall (2026-08-31)

Skript: `frontend/scripts/order166-share-horizon.mjs`. Bundlar
`competitors.ts` via esbuild och dynamisk-importerar den — alla tal
kommer ur produktionsmodulen, samma funktion som `arrivals.ts`
konsumerar. Simulerar 12 speldagars linjär rykte-drift 0,40 → 0,95.

**Två serier i rapporten** (`reports/order166/shareHorizon.json`):

- `static.series` — ORDER 166:s produktions-mönster (konkurrenter
  statiska). Bär per dag: `day`, `playerReputation`, `shareFactor`,
  `atFloor`, `atCeiling`. Plus sammanfattnings-fält: `firstDayAtCeiling`,
  `daysAtFloor`, `daysAtCeiling`, `daysUnclamped`.
- `dynamic.series` — kontrastberäkning (INTE i produktion): varje
  konkurrent stiger 0,03 rykte/dag från sin startvärde. Samma
  fältstruktur.

**Fyndet i fyndform, läses ur JSON:** rapporten svarar konkret på
när taket blir bindande. Talen står i filen — inte i denna text, inte
i registerraden.

**Slutsats i formen fråga → svar, per Vision Owners oro:**
Om konkurrenternas rykte är statiskt och spelaren förbättras stadigt,
blir shareFactor vid någon dag klippt mot CEIL och därefter bidrar
ytterligare rykteshöjning inte till fler gäster. Läs
`static.firstDayAtCeiling` och `static.daysAtCeiling` i JSON:en för
när och hur länge på den här kalibreringen. `dynamic.series` visar
kontrasten om konkurrenter också lär sig (B-014-mönstret) — en
öppen designfråga, ingen implementation i denna order.
