# Brief till Claude Design — Rekvisitan

**Projekt** nexus-studio · strategiska spåret
**Lyder under** SD-004 §3 (Kroppar i rummet)
**Bygger på** `figureRig.ts` — din egen leverans, nu i `main`

---

## 1. Vad som ska levereras

Tio små former som monteras på figurernas befintliga ankare.

**Fyra handrekvisita:** glass, portfölj, kamera, termos.
**Sex huvudbonader:** rufsigt hår, kortklippt, keps, solhatt, grått hår, huva.

De finns redan som data i `ui/foodtruck/archetypes.ts` — `HandProp` och
`HeadTopping` — och renderas i SVG-sidovyn. 3D-scenen vet inte att de finns.

Filen heter `figureProps.ts` och är självständig.

---

## 2. Ankarna finns redan

Riggen exponerar dem:

- `joints.handAnchorL` och `joints.handAnchorR` — handrekvisita
- `joints.headAnchor` — sitter 0,18 m över hjässan och bär i dag pip-markören

Huvudbonader monteras på huvudet, inte på `headAnchor` — den är upptagen. Använd
`joints.head` och placera mot huvudradien 0,12 m.

Samma kontrakt som riggen: ren three.js, primitiver, byggd imperativt, ingen
egen klocka, inga binära assets. Geometricache som i `figureRig.ts` — fyrtio
gäster i rummet ska inte betyda fyrtio uppsättningar buffertar.

---

## 3. Den enda verkliga designfrågan

**Huvudbonaden får inte döda silhuettkontraktet.**

SD-004 §3.3 med preciseringen 2026-08-29: hela huvudets övre hemisfär bär
garment- eller uniformsfärgen. Det är den enda ytan den strategiska kameran
säkert ser, och hela skälet till att figurerna inte behöver ansikten.

En solhatt eller en huva som täcker hjässan tar bort just den ytan.

Tre vägar, och du väljer:

- Bonaden **bär** garment-färgen själv och ersätter kalotten
- Bonaden **lämnar** hjässan fri och sitter runt eller bakom
- Bonaden är **liten nog** att kalotten fortfarande dominerar uppifrån

Motivera valet. Det gäller olika för keps och huva än för grått hår.

---

## 4. Kontrasten mäts

`silhouetteContrast.ts` kräver 1,8 till 3,6 i WCAG-kontrast mot varje golv en
figur kan stå på. Restaurangens interiörgolv är `#a08462`; ölkrogen har tre
zoner, vinbaren fem.

En bonad eller ett föremål i en ton som faller mot något golv kommer fångas i
test. Håll dem antingen tydligt ljusare eller tydligt mörkare än golvbanden.

---

## 5. Skalan

Föremålen ska läsas i strategisk kamerahöjd utan att dominera. En portfölj som
är tydlig i närbild kan vara osynlig därifrån — och en som syns bra därifrån kan
se orimlig ut intill kroppen.

Måttet är figuren: 1,70 m hög, 0,46 m axelbredd, huvudradie 0,12 m, handen sitter
i änden av en 0,25 m underarm.

**Storleken får inte lösas genom att förstora.** Samma regel som gällde riggen —
läsbarhet kommer från form och färg, inte från skala.

---

## 6. Vad som INTE ingår

Ansikten. Rummen. Simuleringslogik — vilken arketyp som bär vad är redan
bestämt i `archetypes.ts` och ska inte uppfinnas om.

Och kopplingen mellan arketyp och 3D-figur finns inte än; den byggs i ordern.
Leverera formerna, inte urvalet.

---

## 7. Modellen

En HTML-modell som visar alla tio på en figur i strategisk vinkel, med
närbildsläge. Det är där en kamera som inte läser en keps ska kunna avvisas —
gratis, innan koden byggs in.

Visa gärna en gäst med solhatt bredvid en utan, så att skillnaden i hur hjässan
läses syns direkt.
