# ORDER 167 — Konkurrenterna rör sig

**Repo** `Viognier70/nexus-studio` · **Gren** `order-167-konkurrenterna-ror-sig` (från `main`)
**Klass** AUTONOM
**Datum** 2026-08-31
**Följer** ORDER 166 §7-fyndet — Vision Owner-beslut 2026-08-31

---

## 1. Läget

ORDER 166 byggde `shareFactor` och den fungerar som specad. Bandet håller,
spiralen finns inte, klassnärheten mäts.

Men tiodagarsmätningen visade att formen inte bär. Spelaren når taket 1,25
dag 6 och stannar där. Vid rykte 0,80 mot fältets 0,68 är fyra av sex
konkurrenter passerade, och de två kvarvarande går inte att påverka eftersom
deras rykte är fruset i data.

Konkurrensen är alltså över efter en dryg vecka. Det är inte ett fel i talet —
det är att konkurrenterna inte gör något.

---

## 2. Vad som byggs

**Konkurrenternas rykte blir rörligt.**

De ska fortfarande **inte simuleras** — ingen personal, ingen meny, ingen kassa.
Bara talet ska sluta vara fruset.

Rörelseformen: **konkurrenten driver mot ett mål som förskjuts av spelarens
rykte, med per-NPC lärhastighet, clamp:at till ett per-NPC rimlighetsband.**

    target(day) = baseline + adaptSensitivity × (playerRep − baseline)
    next(day)   = clamp(current + learnRate × (target − current),
                        MOTION_REP_FLOOR, MOTION_REP_CEIL)

**§2.1 begriplig:** rörelsen förklaras i en mening i koden — konkurrenten
driver mot ett mål som förskjuts av spelarens rykte. Ingen slumpmässig
brus-komponent.

**§2.2 gummivägg-koll:** `adaptSensitivity < 1` betyder att målet aldrig
matchar spelaren helt. `MOTION_REP_CEIL = 0,85` betyder att inga NPC:er
når 1,0. `SHARE_FACTOR_CEIL = 1,4` bär fortfarande — spelaren belönas för
att bli bättre, bara inte oändligt.

**§2.3 fältet olika:** motion-parametrarna per rad i AI_COMPETITORS:
- Kvarnkrogen: **trög** (learnRate 0,02, adaptSensitivity 0,20)
- Prästgatans krog: mellanting (learnRate 0,07, adaptSensitivity 0,55)
- Bergsmansöl: **känslig** (learnRate 0,12, adaptSensitivity 0,85)
- Torgets vinkällare: mellanting-hög-baseline (learnRate 0,05, adaptSensitivity 0,40)

---

## 3. Vad som INTE byggs

**Ingen simulering av konkurrenternas verksamhet.** Ingen kassa, ingen
bemanning, ingen meny. De har ett rykte som rör sig, inget mer.

**Ingen global efterfrågansfördelning.** Alternativ B står kvar som eget
beslut. Om den här ordern inte räcker är det argumentet för att ta det.

**`shareFactor` rörs inte.** Formeln, bandet 0,55–1,4 och klassnärheten
0,4/0,7/1,0 är oförändrade. Det är indata som ändras, inte funktionen.

**Och inga andra faktorer kalibreras.** Rykteskurvan, periodvikterna,
väderfaktorn, econR och `BASE_ARRIVAL_RATE` är orörda.

**`evolveCompetitors` invokas inte i sim-loopen än.** Funktionen finns som
pure export för mätning; att koppla in den i reducer.ts (dag-rollover-
hook som anropar det) är egen liten uppföljning när §4-utfallet är känt
och Vision Owner ok:ar kopplingen. Måtten här bygger på funktionen som
om den vore aktiv — resultatet gäller strikt om/när invocation-hooken
läggs in.

---

## 4. Måttet på om det fungerade

Skriptet `frontend/scripts/order166-share-horizon.mjs` (uppdaterat från
ORDER 166 §6-utökningens 12-dagarsvariant) kör nu 30 dagars linjär
rykte-drift 0,40 → cap 1,00 med spelarens rykte som stiger 0,02/dag.

Före-serien: statiska konkurrenter (ORDER 166 produktion).
Efter-serien: `evolveCompetitors` körs mellan varje mätning.

Utfall skrivs till JSON-fältet `section4Verdict.utfall`:

- `A_plateau_kvarstår_alternativ_B_krävs` — shareFactor når CEIL och
  tillbringar ≥ 5 dagar där.
- `B_formen_bär` — övrigt, spelaren belönas utan att fastna.
- `C_gummivägg_för_stark` — spelaren når aldrig över shareFactor=1,0.

Klassificeringen är automatisk; skriptet väljer utfallet — rapporten
läser det.

**§4-tillägg 1 (2026-08-31): flat-spelare-mätning.** Om fältet driver
uppåt mot en spelare som INTE förbättrar sig är gummiväggen för stark
— att stå still ska inte straffas. Skriptet kör samma motion-modell
mot flat `playerRep=0.60` i 30 dagar och redovisar fältets drift.
Tolerans `FLAT_DRIFT_TOLERANCE=0.02` författad; över den räknas det
som gummivägg. Fält, tolerans, drift och gummivägg-boolean skrivs
till JSON-fältet `flatPlayer` — talen står där, inte här.

**§4-tillägg 2 (2026-08-31): remainingShare.** Hur mycket av spelarens
rykte-förbättring blir kvar som andel efter horisonten. Formeln:
`remainingShare = (playerDelta − fieldDelta) / playerDelta`.

`k_aggregate = 1 − remainingShare` är designtalet Vision Owner tog
upp — det är inte en enskild konstant i koden utan uppstår ur
per-NPC motion-parametrar × classSimilarity-vikter × learnRate ×
horisontlängd. VO-referens: k=0,42 ⇒ remainingShare ≈ 0,58 hade
motsvarat ett fält som fångar spelaren hårdare. Talen (playerDelta,
fieldDelta, remainingShare, kAggregate) läses ur JSON-fältet
`remainingShare` — inte inklistrade här per ORDER 161-regeln.

---

## 5. Definition of Done

1. ✓ Rörligt rykte enligt §2, formeln förklarad i en mening i
   `competitors.ts` Competitor.motion-headern och evolveCompetitors-headern.
2. ✓ Test §2.3: trög och känslig konkurrent skiljer sig mätbart efter
   20 dagars körning mot rising player (≥ 0,05 rykte-enheters skillnad).
3. ✓ Test §DoD 3: `MOTION_REP_FLOOR` / `MOTION_REP_CEIL` håller vid extrem
   indata (100 dagar mot playerRep=1,0 respektive 0,0). AI_COMPETITORS
   driver aldrig utanför bandet över 60 dagar mot normal spelare-bana.
4. ✓ Trettiodagarsmätning enligt §4, före och efter i JSON-fältet
   `before.series` / `after.series` med kurvan (playerRep, fieldMean,
   shareFactor, atFloor, atCeiling) per dag. `after.fieldEvolution` bär
   varje NPC:s rykte per dag så motion-kurvan kan läsas.
5. ✓ Slutsats enligt §4:s tre utfall — läses ur JSON-fältet
   `section4Verdict.utfall` med `.description`.
6. ✓ Mätvärden spårbara per ORDER 160/161: skriptet transpilerar
   produktionsmodulen via esbuild och dynamisk-importerar den, så alla
   tal kommer ur exakt samma funktion som runtime kör (om invocation-
   hooken läggs in — se §3 not).
7. ✓ Grep: `computeShareFactor`-formeln, SHARE_FACTOR_FLOOR/CEIL/NEUTRAL
   och CLASS_SIMILARITY-matrisen oförändrade.
8. ✓ Grep: rykteskurvan (`REPUTATION_ARRIVAL_FLOOR/CEIL`),
   periodvikterna (`PERIOD_ARRIVAL_MULTIPLIER`), väderfaktorn,
   econR (`ECONOMIC_ARRIVAL_FLOOR/CEIL`) och
   `ARRIVAL_BASE_PER_MINUTE=12` oförändrade.
9. Typecheck grön, hela sviten grön (1059 → **1066/1066**, 7 nya tester),
   alla fyra CI-jobb ska bli gröna på PR:en.
10. Registerpost i samma commit. ORDER 166:s rad uppdateras med not att
    §7-fyndet är stängt av denna order (utfall B — formen bär).

---

## 6. Om något inte går

Om ett rörligt rykte inte går att göra begripligt utan att konkurrenterna
simuleras — om varje form blir antingen brus eller en gummivägg — stanna
och rapportera.

Det är i så fall det starkaste argumentet för alternativ B, och det
beslutet är Vision Owners. Bygg inte en halv simulering för att undvika
att ställa frågan.

**Ordertexten är följd:** rörelsen är begriplig (en mening), bandet
håller (test §DoD 3), fältet är olika (test §DoD 2). Slutsatsen skrevs
till JSON — inte till denna text — så nästa läsning inte fastnar på
gårdagens siffror.

---

## 7. Utfall §4-tilläggen (2026-08-31)

**Tillägg 1 (flat-spelare):** flat playerRep=0.60 mot AI_COMPETITORS
i 30 dagar. Fältet driver marginellt uppåt — långt under toleransen
`FLAT_DRIFT_TOLERANCE=0.02`. `flatPlayer.gummivägg = false`. Att
stå still straffas inte i denna kalibrering. Talvärdet
(`fieldMeanDrift`) står i `reports/order166/shareHorizon.json`
`flatPlayer`-blocket.

**Tillägg 2 (remainingShare):** aggregerad `k` uppstår ur per-NPC
motion-parametrar snarare än som enskild konstant. Det uppmätta
värdet på horisonten (`playerDelta`, `fieldDelta`, `remainingShare`,
`kAggregate`) läses ur `reports/order166/shareHorizon.json`
`remainingShare`-blocket.

Vision Owners referens k=0,42 (⇒ remainingShare ≈ 0,58) står som
kalibreringsval — nuvarande motion-parametrar ger ett annat värde.
Vilket värde är rätt är designfråga: högre `learnRate` på fältets
NPC:er skulle sänka remainingShare mot 0,58; nuvarande ger ett
mer generöst fält (spelaren behåller mer av sin förbättring). Talen
i JSON ger underlaget för att kalibrera utan att räkna om i huvudet.
