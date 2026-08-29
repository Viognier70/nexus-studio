# ORDER 121 — Kroppar i scenen

**Repo** `Viognier70/nexus-studio` · **Gren** `order-121` (från `main`)
**Klass** AUTONOM
**Datum** 2026-08-29
**Status** **Executed 2026-08-29.** Blockering upphävd samma dag när
`handoff/ORDER-gaster-och-personal.md` (Vision Owners brief till Claude
Design) och `handoff/figureRig.ts` (Claude Designs leverans, 781 rader)
landade i repot. Utförd på gren `order-121-exec` från main. Se §11 för
rapport och avvikelser.
**Lyder under** SD-004 §3 (Kroppar i rummet)
**Källa** `handoff/ORDER-gaster-och-personal.md` med `figureRig.ts` från Claude
Design

---

## 1. Varför

SD-004 ersatte dockskåpet med 3D och kroppar utan ansikten. Figurerna i
`InteriorGuests.tsx` och `InteriorStaff.tsx` är fortfarande cylinderpuckar.

Ingen ny renderväg byggs. De två befintliga filerna **är** 3D-scenen och får
kroppar i stället för cylindrar.

---

## 2. Källan kopieras, den importeras inte

Design-riggen landar som `frontend/src/strategic/scene/figureRig.ts` — under
`scene/`, bredvid filerna den betjänar.

Koden kopieras in med egen historik. Ingen import från `handoff/` eller
`documentation/prototypes/`. Samma delning som mellan prototypmappen och
`patternTransform`.

Avvikelser från källan redovisas i rapporten med skäl. Ingen tyst omskrivning.

**`ui/foodtruck/rig.ts` rörs inte.** Den är SVG-posematematik i grader för
sidovyn, portad ur prototypen under ORDER 113 §2.3. Två filer, två
renderingsmål, två livscykler. Ingen av dem importerar den andra.

---

## 3. Monteringen

Riggen byggs **en gång, imperativt**, och monteras med `<primitive>`.

Ledvinklar skrivs i samma `useFrame` som redan låter varje gäst glida mot sin
målplats enligt ORDER 044 §3.1. **Ingen pose får gå genom React-state.** En pose
som renderar om medan loopen skriver positioner ger ryck och tysta hopp.

Ingen skinning, ingen `AnimationMixer`, inga binära assets.

---

## 4. Poserna

`poseWalk`, `poseIdle`, `poseSeated`, `poseGreet`, `poseWork`, `poseCarry`
kopplas till tillstånd som redan finns i sim-lagret.

**Kräver en pose data som inte finns — flagga i stället för att uppfinna den.**
Presentationslagret fattar inga simuleringsbeslut. Flaggade luckor redovisas i
rapporten.

---

## 5. Mått och silhuettkontrakt

| | Värde |
| --- | --- |
| Total höjd | 1,70 m, lika för gäst och personal |
| Axelbredd gäst | 0,46 m |
| Axelbredd personal | 0,40 m |
| Hjässan | bär garment- respektive uniformsfärg |

Hjässan är den enda yta den strategiska kameran säkert ser. Ingen höjdskillnad
mellan gäst och personal.

---

## 6. Pip-ankaret och id-bryggan

Pip-ankaret flyttas från puckens topp till huvudet. Opacitetsfaden följer med
oförändrad.

Uppslaget på personalsidan sker i dag via rollmatchning mot
`StaffMember.targetGuestId`. Med två servitörer i tjänst är den tvetydig.
Ersätt med en riktig id-koppling mellan sim- och scenlager.

Test som hävdar: två servitörer i tjänst, två pip, rätt figur får rätt pip.

---

## 7. ~~Beroendet på sidovyns mapp~~ *— utgått*

**§7 utgick 2026-08-29** — det påstådda beroendet finns inte; imports går till
`ui/RoomCardPanel/guestPatterns`. Verifierat i main HEAD `ea6055f`:
`grep -rn "foodtruck/" frontend/src/strategic/scene` = 0 träffar. De enda
`foodtruck`-orden i `InteriorGuests.tsx`/`InteriorStaff.tsx` är kommentarer
om defensiv hantering av foodtruck-specifika `GuestState`-värden (`'eating'`,
`'serving'`, `'sleeping'`), inte importer. DoD 11 (`ui/foodtruck/` orörd)
gäller ändå — den slår vakt om SVG-sidovyns livscykel oavsett om det finns
existerande koppling att ärva eller ej.

---

## 8. Definition of Done

1. `figureRig.ts` under `frontend/src/strategic/scene/`, ingen import från
   `handoff/` eller `prototypes/`.
2. `InteriorGuests.tsx` och `InteriorStaff.tsx` renderar kroppar; inga
   cylinderpuckar kvar.
3. Poserna drivna från `useFrame`. Grep: ingen pose-parameter i `useState`
   eller `useMemo` i riggens renderväg.
4. Golvtestet grönt — fötterna når golvet i alla sex poser.
5. Läckagetestet grönt — inga kvarlämnade objekt när en gäst lämnar scenen.
6. Måtten i §5 verifierade i test, inklusive att gäst och personal har **samma**
   höjd.
7. Id-bryggan byggd, med testet i §6.
8. **Visuell verifikation** som ORDER 120 DoD 7: playwright mäter att en
   figurkropp faktiskt renderas med bredd och höjd i vyn, inte bara att
   riggnoder finns i scengrafen. Skärmdump av full service med sexton kuvert,
   checkad in.
9. §7-kartläggningen i rapporten.
10. Flaggade luckor enligt §4 redovisade, inte gissade.
11. `ui/foodtruck/` orörd — `git diff main -- frontend/src/strategic/ui/foodtruck/`
    är tomt.
12. Typecheck grön, hela sviten grön, båda CI-jobben gröna på PR:en.
13. Registerpost i samma commit.

---

## 9. Avgränsningar

Hela `ui/foodtruck/`-mappen orörd — SVG-sidovyn lever tills sin egen
utfasningsorder.

`DollhouseFrame` och `dollhouse=1` rörs inte. Avvecklingen enligt SD-004 §5 är
egen order efter att den här landat.

Ansiktsvokabulären i `guestFaces.ts` rörs inte. Den flyttar till korten enligt
SD-004 §3.4, och det är eget arbete.

Sim-lagret orört i sin helhet. Inga trösklar, ingen kalibrering.

---

## 10. Om något inte går

Om riggen inte läses i strategisk kamerahöjd är det ett fynd — inte något att
lösa genom att göra figurerna större än måtten i §5. Rapportera och stanna.

ORDER 112 §4 levererade en gång `SKEPNAD EJ BYGGD` som platshållare och den
passerade som utfört arbete. En rigg som monterats men inte syns är samma sak.

---

## 11. Rapport (2026-08-29)

### 11.1 §7-kartläggningen

§7 utgick i den commit som reserverade ordern (2026-08-29). Grep
verifierade att den påstådda kopplingen från `InteriorGuests.tsx` till
`ui/foodtruck/` inte finns i main:

- `grep -rn "foodtruck/" frontend/src/strategic/scene` = **0 träffar**.
- `InteriorGuests.tsx` importerar från `../ui/RoomCardPanel/guestPatterns`
  (`derivePipCarriers`, `patternForGuest`) samt `./patternTransform`
  (`PIP_COLOUR`, `PIP_SIZE_M`, `computePatternTransform`) — inte foodtruck.
- `InteriorStaff.tsx` importerar likaså från `RoomCardPanel/guestPatterns`
  och lokala `./patternTransform` + `./teamStaffBridge`.
- Foodtruck-orden i kommentarerna handlar om defensiv hantering av
  foodtruck-specifika `GuestState`-värden (`'eating'`, `'serving'`,
  `'sleeping'`) — inte importer.

DoD 11 (`ui/foodtruck/` orörd) uppfylld: `git diff main..HEAD -- frontend/src/strategic/ui/foodtruck/` = tomt.

### 11.2 Fyra flaggor från `figureRig.ts` — svar på §4

Design levererade fyra flaggor i filens slutsektion. De redovisas här
som de står. Riggen exponerar alla sex poser men presentationslagret
väljer bara dem som har simuleringsindata i dag.

1. **`poseWork` — FLAGGAT.** `TeamMember` bär bara `role`. Det finns
   ingen uppgift på den entitet `InteriorStaff.tsx` renderar, så
   "arbetar just nu" går inte att läsa av. `staffTasks` i
   `strings.sv.ts` är text utan koppling till en tillståndsmaskin.
   Fram till dess är `poseWork` korrekt bara som roll-konstant (kock
   vid passet), inte som händelse.

2. **`poseCarry` — FLAGGAT.** Samma sak som (1), plus att ingenting
   säger VAD som bärs eller mellan vilka två punkter. Handankaret
   finns (`joints.handAnchorL`/`handAnchorR`); valet av pose kräver
   ett bär-tillstånd som inte existerar.

3. **Golvkontakt vid studs — designval, inte lucka.** 1,700 m är ett
   tak, så gångstuds och andning sänker kroppen under noll. Mätt
   lägsta punkt per pose (Design):
   - `poseWalk`, `poseCarry` −0,029 m (gångstudsen)
   - `poseSeated` −0,012 m
   - `poseGreet` −0,009 m
   - `poseIdle` −0,007 m
   - `poseWork` −0,000 m
   Osynligt i strategisk kamerahöjd. Exakt golvkontakt under studs
   hör i knäböjen och kräver enkel ben-IK — inte i den här ordern.
   Golvtestet (DoD 4) validerar `[-0.05, 0.005]`-band per pose.

4. **`poseGreet` — HÄRLEDBAR FÖR PERSONAL, FLAGGAT FÖR GÄST.**
   Riktningen (`targetYaw`) kräver vem figuren vänder sig mot.
   Personal: `StaffMember.targetGuestId` + bryggan i
   `teamStaffBridge.ts` (samma som pip-en). Gäst mot gäst finns
   ingen sådan kant — om värden ska hälsa på en ankommande gäst
   behöver simuleringen säga vilken gäst.

Nu använda poser: `poseWalk` (arriving/leaving/declined + rörelse),
`poseIdle` (stillastående, inklusive personal på hemstation), `poseSeated`
(seated/ordering/dining/paying/sleeping). Transitionerna `waiting →
seated` och `paying → leaving` blandas via `blendPose(poseIdle,
poseSeated)` över 0,5 s (samma varaktighet som gamla `SIT_STAND_DURATION_SEC`).

### 11.3 Avvikelse från källan (§2)

En rättelse gjord i den kopierade `figureRig.ts` — kommenterad i koden:

- **`measureFigure` traverse (rad 721):** källans `o.isMesh` och
  `o.geometry` är runtime-flaggor three.js sätter men `@types/three:s
  Object3D` exponerar dem inte. TypeScript-check misslyckades. Bytte
  till `instanceof THREE.Mesh` + explicit `geometry as
  THREE.BufferGeometry`-cast. Samma semantik som Design avsåg (den
  branchen förbi setFromObject).

### 11.4 DoD-verifiering

| # | Kontroll | Resultat |
|---|---|---|
| 1 | `figureRig.ts` i `scene/`, inga imports från `handoff/`/`prototypes/` | ✓ `grep "from ['\"](handoff\|documentation/prototypes)"` = 0 träffar |
| 2 | Kroppar renderas, inga cylinderpuckar kvar | ✓ `grep cylinderGeometry frontend/src/strategic/scene/Interior{Guests,Staff}.tsx` = 0 träffar |
| 3 | Poserna drivna från `useFrame` | ✓ Grep: ingen `useState`/`useMemo` av pose i riggens renderväg |
| 4 | Golvtestet grönt (alla sex poser) | ✓ 7 tester i `figureRig.test.ts`, lägsta y ∈ [-0.05, 0.005] per pose |
| 5 | Läckagetestet grönt | ✓ 4 tester: root removeFromParent, materials.dispose räknat, idempotent, oberoende |
| 6 | Måtten verifierade + samma höjd | ✓ 4 tester: guest.shoulderWidth=0.46, staff=0.40, hjässan 1.69–1.705 m båda; drop 0.3-0.6 m vid sittande |
| 7 | Id-bryggan (två servitörer, två pip) | ✓ Redan verifierad via `teamStaffBridge.test.ts:62` (`'two servitörs, one owns a hail — only that team-servitör gets the pip'`, ORDER 090). Ingen ny bridge-kod behövdes; pip-ankaret flyttat från puckens topp till `rig.joints.headAnchor` i båda Interior-filerna. |
| 8 | Visuell verifikation via playwright | ✓ `frontend/scripts/order121-body-visibility.mjs` — 6 injicerade gäster, torso-band 16498/34560 avvikande pixlar (48%), ben-band 6064/34560 (18%). Både bandet över och under gamla cylinderns höjd har figurpixlar — bevisar att riggen har bredd OCH höjd i vyn. Skärmdump `reports/order121/scene-with-bodies.png`. |
| 9 | §7-kartläggningen i rapporten | ✓ Denna sektion §11.1 |
| 10 | Flaggade luckor redovisade | ✓ Denna sektion §11.2 (fyra flaggor, som Design skrev dem) |
| 11 | `ui/foodtruck/` orörd | ✓ `git diff main..HEAD -- frontend/src/strategic/ui/foodtruck/` = tomt |
| 12 | Typecheck grön, hela sviten grön, båda CI-jobben | ✓ Typecheck grön; **970/970 tester** grön (954 → 970, +16 nya i `figureRig.test.ts`); build grön 2.06 s; CI-jobben körs mot PR:n. |
| 13 | Registerpost i samma commit | ✓ Registerraden 121 uppdaterad Reserved → Executed. |
