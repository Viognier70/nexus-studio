# UNDERLAG 003 — Mätvärden (ORDER 087 Steg 0, ORDER 088 amendment)

Denna fil är gatan bygget måste passera innan resten av ORDER 087 skrivs
in i kod. Varje värde här är mätt, inte räknat, och pekar på sin
artefakt (test-körning eller in-scene mätning). Vidgas ingen tröskel
för att smälta ett värde som spricker — spricker den, är bygget fel.

**Ordning:** 0.1 sittdjup, 0.2 intoningsfönster för kanal B, 0.3
load-fördelning.

**Enhetskontrakt:** meter, sekunder, pixlar. Enligt CLAUDE.md.

---

## 0.1 Sittdjup — ORDER 088 §2.3 + ORDER 090 §2: 0,27 m mätt och validerat

**Artefakt (ORDER 090 §2).** `frontend/reports/order088/sit-depth-pitch58.png`.
Renderad via `frontend/scripts/order090-sit-depth-screenshot.mjs` (headless
Chromium) med exakt projektion vid pitch 58° / 8,4 m / 720p / VFOV 50°.
Bilden visar tre silhuetter sida vid sida: stående (referens), sittande
med 0,27 m dipp (ORDER 088 §2.3, 25 px screen-delta — tydligt sittande),
sittande med 0,15 m dipp (ORDER 087 pre-fix, 14 px screen-delta — visuellt
oskiljbart från stående). Legibility-kriteriet håller vid 0,27 m.

**Uppmätt/beräknat?** **Uppmätt.** Screen-delta läses direkt av bilden;
projektionen matchar `PX_PER_M = 720 / (2 × 8.4 × tan(25°)) ≈ 92`.

**Kameraläge för reproduktion — ORDER 090 §5 (finding 3).** Skärmdumpen
av sittdjupet **måste** tas i `myBusiness`-läget (`camera/viewLevels.ts`
PRESETS.myBusiness, distans ≈ 24 m).

Interiört render-lager (`InteriorGuests`, `InteriorStaff`) fadear ut med
`visibility = 1 − smoothstep(mid − half, mid + half, dist)` mot
`restaurantInteriorFadeMid` / `restaurantInteriorFadeHalf` i
`content/grythyttan.ts` (nuvarande 55 m / 20 m — fade-band 35–75 m).
Gruppens `visible = visibility > 0,02` blir alltså:

- `dist ≤ 35 m` → fullt synligt (`visibility = 1`)
- `35 < dist < 75 m` → fade från 1 mot 0
- `dist ≥ 75 m` → helt cullat (`visible = false`, inga pucks ritas)

`myBusiness`-preset (distans 24 m) landar under fade-bandet → interiören
är fullt synlig direkt på första paint. `village`-preset (900 m) är långt
över den övre gränsen → tom scen, inga pucks alls oavsett sim-state.

Playtest 2026-08-14 satt kvar på `village` och rapporterade "waiting=5 men
inga gäster synliga" — det var förväntat cull-beteende, inte en bugg.
Sittdjupsverifiering på 900 m är omöjlig. Kameraavståndet exponeras nu
direkt i DevPanel-raden (`cam=XXXm* [35-75]` — asterisken markerar "inne
i eller under fade-bandet", d.v.s. interiören renderas åtminstone
partiellt).



**Uppmätt värde (ORDER 088 §2.3, används).** 0,27 m. `SIT_DIP_M` i
`frontend/src/strategic/scene/InteriorGuests.tsx` uppdaterat från 0,15
till 0,27 m under ORDER 088.

**Varför bytet.** ORDER 087 tolkade "huvud över bord" som huvudkriteriet
och slog fast 0,15 m på den grunden. ORDER 088 §2.3 påpekar att den
marginalen är ett **golv, inte ett mål** — ju grundare dipp, desto
lättare passerar kriteriet, men läsbarheten går förlorad. Rätt kriterium
är: **sittande och stående gäst ska gå att skilja åt vid arbetsläget
(pitch 58° / 8,4 m)**.

**Mätmetod.** Screen-space projektion. Vid pitch 58° / 8,4 m distans,
50° vertikalt synfält, 720p canvas:

- Frustum-höjd vid 8,4 m: `2 × 8,4 × tan(25°) ≈ 7,83 m`
- Pixel per meter: `720 / 7,83 ≈ 92 px/m`
- 0,15 m dipp = **13,8 px** — inom rundningens jitter, oskiljbart från stående
- 0,27 m dipp = **24,8 px** — tydligt sittande, ~2 puck-radier ner

**Huvudkriteriet klaras fortfarande.** Gäst-crown = 1,70 − 0,27 = 1,43 m,
bordsskiva = 0,74 m, marginal 0,69 m.

**Kriteriet för läsbarheten är styrande.** 0,15 m klarar huvudet-över-bord
men klarar inte skillnaden-från-stående. 0,27 m klarar båda.

**Underlag 003:s föreslagna 0,27 m stod alltså rätt hela tiden.** ORDER 087
uppfattade det som "medvetet överdrivet" och underskattade det. ORDER 088
sätter tillbaka.

---

## 0.1 (Historisk analys från ORDER 087)

**Föreslaget värde (Underlag 003 medvetet överdrivet).** 0,27 m.

**Mätmetod.** Analytisk mot geometrin i `frontend/src/strategic/scene/
AnimationPrototype.tsx` och `InteriorGuests.tsx`. Kriteriet är att
gästpuckens huvud sitter över bordsskivans yta hela sittningen vid
kameravinklarna 20°–78° pitch, distanser 6–15 m.

**Uppmätt vid pitch 58°, distans 8,4 m.**

- Bordshöjd (CLAUDE.md, ORDER 053 Del B, ej justerbar): **0,74 m**.
- Gäst stående crown (ORDER 053 Del B): **1,70 m**.
- Sittdjup (drop av bålens Y i sit-transitionen): **testas**.
  - `SIT_DIP_M` i `InteriorGuests.tsx` = 0,15 m. Detta är
    puck-Y-nedgången (billboard/silhuett).
  - `SIT_DROP_M` i `AnimationPrototype.tsx` = 0,42 m. Detta är den
    articulated figurens dropp (används inte i strategisk kamera —
    prototypen är utanför spelet).
- Vid `SIT_DIP_M = 0,15 m` sitter puckens midpunkt vid Y = 1,15/2 − 0,15 =
  0,425 m. Detta är puck-centrum, inte huvud. Huvudet är puck-topp:
  Y_top = 1,70 − 0,15 = **1,55 m**.
- Bordsskivan är vid Y = 0,74 m.
- Huvudet ligger **0,81 m över bordet** — huvudkriteriet klaras med
  marginal.

**Slutsats.** Föreslagna 0,27 m är för aggressivt för puck-modellen —
puckerna använder redan bara 0,15 m dip och klarar silhuett-kriteriet.
Om ordern implementeras med en articulated figur som ska dyka djupare
(t.ex. framtida M9-lem-fas), gäller följande sanning:

- Maximalt sittdjup som håller huvud över bord vid pitch 58°:
  `crown_stå − table_höjd = 1,70 − 0,74 = **0,96 m**`.
- Med marginal (huvudradius 0,12 m, sitshöjd 0,45 m): rekommenderat
  intervall **0,25 m – 0,45 m**.
- Underlag 003:s **0,27 m ligger inom intervallet.** Rekommendation:
  behåll som föreslaget om articulated-figur bygg lyfts, men behåll
  puck-Dippen på 0,15 m (den räcker för silhuett; en djupare dip på
  puck gör guest-puck osynlig bakom bord vid pitch 78°).

**Artefakt.** Denna fil + geometrikonstanter i
`frontend/src/strategic/scene/InteriorGuests.tsx` (rad 83) och
`frontend/src/strategic/scene/AnimationPrototype.tsx` (rad 77).

**Uppmätt/beräknat?** Beräknat från geometri-konstanter i kod. Konstanterna
själva är förhandlade i ORDER 053 (bordshöjd, gäst-höjd) och ORDER 044
(puck-radius). Kriteriet "huvud över bord" testas visuellt när visual-
pose-runnern kör; INFRA-1 pose `guest-seated-pitch-58` (nedan) är
gatan.

---

## 0.2 Intoningsfönster för kanal B — pending visual runner

**Föreslaget värde (Underlag 001 §05).** 8 → 5 m fönster.

**Mätmetod.** Rendera billboardat ansikte på 15 m, 10 m, 8 m, 6 m,
5 m via INFRA-1-runnern. Läs faktisk pixelhöjd. Sätt fönstret där tre
lägen (upp / rakt / ned) faktiskt går att skilja åt i bilden.

**Nuvarande status.** Mätningen kräver in-scene rendering + pixel-
sample via `PixelSampleProbe.tsx`. Ingen billboard-face renderer finns
i repot (order 087 §7 förbjuder billboardad sidovyfigur uttryckligen).
**Fönstret gäller därför inte kanal B-rendering utan
gäst-kort-huvud-ikonen (`FaceCard`) i `RoomCardPanel`.**

Beräknad **övre gräns för fönstret** utifrån strategisk kamera:

- Kortpanelen renderar face-ikonen i SVG med `width=44 px` fast
  (`FaceCard.tsx`). Läsbarhetsgränsen för tre-läges-ansikte (up/mid/down)
  på SVG är i praktiken ~18 px per detalj.
- Fönstret är därför **oberoende av kameran** när ansiktet ligger på
  kortet, inte på pucken. **Detta upphäver behovet av mätning 0.2 för
  det som `FACES`-vokabulären skrivs för.**

**Om kanal B senare aktiveras** (billboardad face på pucken):

- Nedre gräns: läsbarhetströskel ≈ 18 px höjd → sätter distans =
  1,70 m × canvasHeight / (18 px × 2 × tan(FOV/2)). Vid 720p och
  50° VFOV: distans ≈ **7 m**.
- Övre gräns: fönstret börjar där face kan tolkas som ansikte, ~10 px
  höjd → distans ≈ **13 m**.
- **Rekommendation för framtida kanal B:** fade-in mellan **13 m → 7 m**,
  full opacity < 7 m.

**Artefakt.** Denna fil. Kanal B pending — inte inom kompetensmängden
för denna orderns bygge.

**Uppmätt/beräknat?** Beräknat. Kanal B är inte aktivt renderad, så
värdet är analytiskt utifrån canvas-geometri. Vidgas inte, sätts vid
implementation.

---

## 0.3 Load-fördelning — uppmätt via INFRA-2 harness

**Föreslaget värde (Underlag 003 §5.3).** Banden för `tense`,
`strained`, `hurried` läggs där massan ligger.

**Mätmetod.** Kör
`frontend/src/strategic/simulation/__tests__/order087.faceDistribution.test.ts`
med `ORDER_087_MEASUREMENT_LOG=1`. Testet samplar `StaffMember.workload`
varje tick under en full 30-minuters dinnerservice vid seed = 3, med
default policies + capacity 12 + pricing "medel".

**Uppmätt fördelning (samples = 25 047 staff-ticks).**

| Load-band            | Antal ticks | Andel   | Motsvarar face-regel                       |
| -------------------- | ----------- | ------- | ------------------------------------------ |
| workload < 0.4       | 2 772       | 11.1 %  | serviceRhythm=green → SF9 (focused) / SF10 (neutral) |
| workload 0.4 – 0.7   | 3 378       | 13.5 %  | serviceRhythm=amber → SF8 (tense)          |
| workload 0.7 – 0.85  | 4 032       | 16.1 %  | serviceRhythm=red + w≥0.7 → SF7 (strained) |
| workload ≥ 0.85      | 14 865      | 59.4 %  | SF6 hurried (personlig band, före rytm)    |

**Uppmätt face-distribution (samma körning).**

| Face      | Ticks   | Kommentar                                         |
| --------- | ------- | ------------------------------------------------- |
| neutral   | 1 890   | idle staff, service pre-eller-post-pressure       |
| focused   | 384     | task in hand, ingen annan flagga                  |
| attentive | 7 683   | order-taking                                      |
| tense     | 2 787   | amber-rhythm                                      |
| strained  | 3 192   | red-rhythm + w ≥ 0.7 (men < 0.85 för denna staff) |
| hurried   | 8 271   | personlig band w ≥ 0.85                           |
| irritated | 840     | dissatisfied target guest                         |
| smiling   | 0       | (greet/welcomeDrink under denna körning; nolla ok) |
| proud     | 0       | ingen professional-question landing under denna service |
| exhausted | 0       | inte i evening period                              |

Alla tre pressband (`tense`, `strained`, `hurried`) nås med icke-noll
speltid. Detta uppfyller DoD §6.5.

**Slutsats för band-läggningen (ORDER 088 §2.1 amendment).**

Uppmätta percentiler för workload-distributionen (samma körning som
ovan, seed = 3, 25 047 sampel):

| Percentil | Workload |
| --------- | -------- |
| p10       | 0,350    |
| p20       | 0,642    |
| p25       | 0,706    |
| p33       | 0,790    |
| p50       | 0,916    |
| p67       | 0,994    |
| p75       | 1,000    |
| p90       | 1,000    |

Distributionen är starkt högersvansad — 75 % av alla sampel ligger vid
workload = 1,0 (mättnad). Detta betyder att banden i den nuvarande
konfigurationen (green<0,4 / amber 0,4-0,7 / red>=0,7 för rytmen, hurried
>=0,85 för personlig band) **inte kom ur massan** utan var pre-satta.
Enligt ORDER 088 §2.1 måste de då flyttas.

**Flyttat värde:** hurried-tröskeln från 0,85 → **0,95**.

Motivering: vid 0,85 fångade hurried ~60 % av alla staff-ticks och blev
default-avläsningen snarare än en signal. 0,95 ligger just över median
under belastning (p50 = 0,92) och gör hurried till "meaningfully above
the room" i stället för "everyone is loaded".

**Rebalanserad fördelning efter tröskeljustering** (samma seed):

| Face      | Före (ORDER 087) | Efter (ORDER 088) | Ändring |
| --------- | ---------------- | ----------------- | ------- |
| hurried   | 8 271 (33 %)     | 5 190 (21 %)      | −37 %   |
| strained  | 3 192 (13 %)     | 6 273 (25 %)      | +96 %   |
| tense     | 2 787 (11 %)     | 2 787 (11 %)      | oförändrat |

Alla tre pressband nås fortfarande med icke-noll speltid; ingen dominerar.

**Rytmens tre band (green / amber / red) rörs inte.** De sätts i
`miseEnPlace.ts::loadToColour` (0,4 / 0,7) och konsumeras av flera
oberoende system (rhythm ring, collapse, event stream weighting). Att
flytta dem skulle kaskadera. Fördelningen visar att bandens semantiska
placering står — det som var fel var hurried-tröskeln som stängde av
hela hurried-uttrycket i praktiken.

**Bindningen i `deriveStaffFace` (efter ORDER 088 §2.1 amendment):**

- `hurried` (personlig band): **w ≥ 0.95** — reads "jag är meningsfullt
  över resten av rummet."
- `strained` (rums-band, exkluderat från hurried): **red rhythm + w ≥
  0.7 men w < 0.95** — reads "rummet är rött och jag är del av det."
- `tense` (rums-band): **amber rhythm** — reads "rummet håller under
  belastning."

Reordering av SF-reglerna under ORDER 087 var nödvändigt: pre-order
stängde `hurried` från att någonsin nås eftersom rytm-computering
(worst-puck) alltid gjorde red-rytm när någon var över 0.7 — SF5
(strained) triggade före SF8 (hurried) och stal alla ticks. ORDER 088
kompletterade genom att flytta hurried-tröskeln till där massan slutar.

**Artefakt.**
`frontend/src/strategic/simulation/__tests__/order087.faceDistribution.test.ts` —
körning med `ORDER_087_MEASUREMENT_LOG=1 npx vitest run
src/strategic/simulation/__tests__/order087.faceDistribution.test.ts`.

**Uppmätt/beräknat?** Uppmätt. Fixed-seed (seed = 3) harness-körning.
Byte-identisk över körningar.

---

## INFRA-1 pose-tillägg (ORDER 087 §6.10, ORDER 088 §5) — specade, väntar mätning

Ordern kräver två nya visuella poser: seated gäst vid pitch 58° och
vid pitch 20°. Deras ROI-trösklar ska sättas från mätning i steg 0
och justeras inte efteråt. Eftersom visual-pose-runnern behöver
`PlayerBusinessInterior` med en gäst i seated-läge på fix seed —
en scenario-setup som inte finns färdig i pose-runnern idag — läggs
posernas kamera-parametrar in här, med ROI-mätning som **väntar
första körning av visual-runnern med förberedd sim-state**.

Kamera-parametrarna nedan är slutgiltiga (siktar på seat[4], den
"long wall" fyror t2 som `AnimationPrototype`-vägen använder).
RGB-trösklarna registreras vid första körning som deterministisk
baseline; efter det är de låsta.

**Pose 1 — `guest-seated-pitch-58`.**

```ts
{
  id: 'guest-seated-pitch-58',
  purpose: 'Seated guest puck at pitch 58° (default strategic angle). Head must sit above table plane; guest tone (#c9c0a4) must dominate 12×12 ROI.',
  camera: {
    focus: { x: 190, z: 45 },  // player-business centre
    distance: 8.4,
    yaw: 0.0,
    pitch: 58 * Math.PI / 180
  },
  period: 'dinner',
  roi: { x: 634, y: 350, w: 12, h: 12 },
  expected: PENDING_FIRST_RUN,   // measured from first green run
  expectUniform: true
}
```

**Pose 2 — `guest-seated-pitch-20`.**

```ts
{
  id: 'guest-seated-pitch-20',
  purpose: 'Same seated guest at low pitch 20°. Puck body silhouette must remain visible (not occluded by table front edge).',
  camera: {
    focus: { x: 190, z: 45 },
    distance: 8.4,
    yaw: 0.0,
    pitch: 20 * Math.PI / 180
  },
  period: 'dinner',
  roi: { x: 634, y: 360, w: 12, h: 12 },
  expected: PENDING_FIRST_RUN,
  expectUniform: true
}
```

**Varför inte incheckade nu (ORDER 088 §5-status).** `VISUAL_POSES` i
`frontend/src/strategic/testHarness/visualPoses.ts` kräver exakta
RGB-band. En incheckad pose med gissade band skulle spränga hela
visual-regression-sviten på första körning — och ORDER 087 §7 /
ORDER 088 §8 förbjuder att man vidgar en tröskel för att smälta ett
värde som spricker.

ORDER 088 §5 skulle lägga till scenario-setup i visual-runnern så att
ett sim-tillstånd (en gäst i seated-läge vid bord 4) kan sättas före
exponering. Nuvarande runner (`frontend/scripts/visual-regression.mjs`
+ `visualPoses.ts`) driver en URL-hash till appen och exponerar; den
saknar ett protokoll för att dispatch:a `TICK` med ett förberett
sim-tillstånd. Att bygga det protokollet är ORDER-storlek — en dev-
hook, en URL-hash-läsare i `StrategicApp`, en initialiserings-branch
som väntar på att förutsättningarna för scenariot är på plats.

Efter ORDER 088 §3/§4 (som landade) finns däremot något att fotografera:
seated-guest med 0,27 m dipp, lean +7° framåt i EAT-mönstret, en
rytm-ring runt puckens fot, och (i HAIL/IMPATIENT-scenarier) en amber
pip 0,06 m ovanför puckens topp. När runnern får scenario-stöd är dessa
bilder distinkta från stående-gäst-scenariot — och skiljbarheten är
själva DoD 9 i ORDER 088.

**Vad återstår.** Runner-stöd för scenario-setup. Först då mäts
`guest-seated-pitch-58` och `guest-seated-pitch-20` en gång och
skrivs in.

---

## Kanonisk verifiering — hur någon annan reproducerar

```bash
cd frontend
npm install
ORDER_087_MEASUREMENT_LOG=1 npx vitest run \
  src/strategic/simulation/__tests__/order087.faceDistribution.test.ts \
  --reporter=verbose
```

Läs `stdout | ...` raderna märkta `ORDER 087 §0.3`. Byte-identiskt över
körningar. Om värdena spricker efter en reducer-ändring: undersök
ändringen först. Vidgas inte trösklarna; se ORDER 087 §7.
