# SUPERSEDING DIRECTIVE 004 — Kroppar i rummet

**Nexus Studio · Grythyttan**
**Utfärdad** 2026-08-22 · **Vision Owner** Anders
**Instrument** styrande handling. Ordrar lyder under denna.
**Ersätter** dockskåpsdirektivet (refererat som SD-003 rev. 2), vilket aldrig committades som instrument.

---

## 1. Beslutet

**Rummet är 3D. Figurerna har kroppar men inga ansikten. Känsla bärs av
hållning, gest och rörelse.**

Dockskåpet i sidovy upphör som presentationsform.

---

## 2. Varför SD-003 faller

**Not om vilken SD-003 som avses.** `documentation/foundation/SUPERSEDING_DIRECTIVE_003.md`
v1.0 rör sessionsbaserad granskning (modifierar SD-002 §4) och berörs
**inte** av denna handling. Sessionsregeln gäller oförändrad. Det som §2 här
faller är dockskåpsdirektivet — refererat som SD-003 rev. 2, aldrig committat
som instrument, men behandlat som gällande i `ORDER_091 §1.6` (pausbeslutet
mot R4) och i `documentation/blueprints/SD003_MATGRIND_RAPPORT_ORDER_096.md`.

SD-003 valde sidovy av **ett** skäl: ansikten kräver ungefär 140 px för att
läsas, och den bredden finns bara i en platt genomskärning. Allt annat i
direktivet — fokusrum, luckor i bakväggen, pixelbudget, kuvertantal — följde ur
det kravet.

**Tas ansiktena bort faller hela kedjan.** En gest läses på tjugo meter; ett
ansikte gör det inte. Utan ansiktskravet finns inget skäl att platta ut rummet,
och 3D ger tillbaka det sidovyn kostade: fri kamera, alla bord synliga, djup.

**Och praktiken bekräftade det.** Food truckens skepnad tog en vecka och en
lång rad koordinatfel — skalning som bara verkade på halva måtten, munnens
position, köns placering, spegling runt fel origo. Varje fel hade samma rot:
sidovyn måste uppfinna en rumslighet som 3D-scenen redan har.

`findFreeSeat`, `layout.seats`, OBB och gångvägar vet var människor är.
Dockskåpet fick räkna om det i två dimensioner och räknade fel.

---

## 3. Vad som ersätter det

**3.1 Ledade figurer i den befintliga 3D-scenen.** `figureRig.ts` byter
cylinderpucken mot en kropp i `InteriorGuests.tsx` och `InteriorStaff.tsx`.
Ingen ny renderväg, ingen skinning, ingen mixer — ren three.js byggd en gång
imperativt och driven av samma `useFrame` som i dag skriver positionen.

**3.2 Poser i stället för uttryck.** `poseWalk`, `poseIdle`, `poseSeated`,
`poseGreet`, `poseWork`, `poseCarry` — kopplade till tillstånd som redan finns.

**3.3 Silhuettkontraktet gäller fortfarande.** Hjässan bär garment- eller
uniformsfärgen; det är den enda pixel den strategiska kameran säkert ser.
Gästens axelspann är bredare än personalens. Ingen höjdskillnad mellan dem —
ORDER 053/054/055 står kvar.

**3.4 Ansiktsvokabulären flyttar till korten.** De tjugo uttrycken i
`deriveFaces` försvinner inte; de blir kortens uppgift. Nyansen bor där, och
rummet bär riktningen.

---

## 4. Vad som överlever

Allt i simuleringslagret. Kön, serving-fasen, uteplatsen och dess villkor,
värdekvoten med sin asymmetriska fördröjning, mise en place-konsumtionen,
gästarketyperna, verksamhetsklasserna. Ingenting av det var beroende av
presentationen.

`patternTransform`, `InteriorGuests` och `InteriorStaff` överlever — de **är**
3D-scenen och får nu kroppar i stället för cylindrar.

Gästarketyperna kartas om: kroppsbyggnad, huvudbonad och prop i stället för
ansiktsdrag. Sex av nio är byggda.

---

## 5. Vad som utgår

`DollhouseFrame`, `FoodTruckShape` och deras tester. `dollhouse=1`-växeln.
Dockskåpsdirektivet — refererat som SD-003 rev. 2 men aldrig committat som
instrument — utgår som riktning. Skälen ligger kvar läsbara i
`documentation/blueprints/SD003_MATGRIND_RAPPORT_ORDER_096.md` (mätgrindsrapporten)
och i `documentation/architecture/ORDER_REGISTRY.md` under ORDER 091 §1.6
(pausbeslutet mot R4). Båda märks som historiska av samma commit som utfärdar
detta instrument.

**Pixelgolvet utgår.** 140 px, 96 px och tolv kuvert var alla följder av
ansiktskravet. Sexton kuvert är åter möjligt.

ORDER 096:s mätningar — 40 figurer i SVG på 380 fps, ansiktets läsbarhet,
kartans golv — gäller en form som inte längre byggs. De ska märkas som
historiska, inte raderas.

---

## 6. Vad som ska avgöras

**6.1 Food truckens vy.** En lucka sedd från gatan fungerar även i 3D, och
sidovyn där gav faktiskt en läsbar bild. Behålls den som undantag, eller blir
food trucken 3D som de andra? Vision Owner avgör.

**Beslut 2026-08-29 (Vision Owner Anders):** Food trucken blir 3D som övriga
verksamhetsklasser. Inget sidovy-undantag. Sidovyns läsbarhet vid luckan var
inte skäl nog att bära två presentationsformer parallellt; den principen som
gäller resten av rummet (3D, kroppar, gest bär betydelsen) gäller även här.
Nuvarande `FoodtruckScene.tsx` med `rig.ts`/`Figure.tsx` fasas ut i separat
följdorder när 3D-food-trucken byggs.

**6.2 Kartan.** Den bar aggregatet sedan beslut C flyttade dit. Med 3D tillbaka
kan rummet bära det igen — eller så behålls kartan som överblick. Frågan hör
till A2 i vägkartan.

**6.3 Paviljongerna** har fortfarande ingen presentationsform. ORDER 104 Q5 sköt
den till SD-003; nu skjuts den hit. Egen yta eller fjärde skepnad?

---

## 7. Vad detta inte ändrar

Byn och nivåerna 1–3 i 3D. Procedurell geometri, inga binära assets. Regeln om
inga stat-paneler. Att trösklar sätts från mätning. Simuleringen i sin helhet.

VS001 som övergång in i verksamheten.

---

## 8. Om att byta riktning en fjärde gång

Presentationsfrågan har öppnats fyra gånger: kortpanelen, riggen, dockskåpet,
och nu 3D med kroppar.

Varje gång har skälet varit att underlaget växte. Den här gången är skälet
starkare än förut: **kravet som motiverade sidovyn har tagits bort.** Ansikten
i rummet var det enda argumentet för en platt scen, och de ska inte finnas där.

En vecka på food truckens skepnad är förlorad som kod. Som kunskap är den det
inte — arketyperna, serving-fasen, uteplatsen och värdekvoten kom ur den, och
de ligger alla i simuleringen.
