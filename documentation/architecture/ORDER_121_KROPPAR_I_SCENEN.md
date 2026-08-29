# ORDER 121 — Kroppar i scenen

**Repo** `Viognier70/nexus-studio` · **Gren** `order-121` (från `main`)
**Klass** AUTONOM
**Datum** 2026-08-29
**Status** **Reserved — blockerad 2026-08-29 på saknad källa.** Ordern kan
inte utföras förrän `handoff/ORDER-gaster-och-personal.md` och `figureRig.ts`
från Claude Design finns i repot. Verifierat 2026-08-29: `handoff/`-katalogen
existerar inte, ingen `figureRig.*`-fil finns, pose-namnen i §4
(`poseWalk`/`poseIdle`/`poseSeated`/`poseGreet`/`poseWork`/`poseCarry`) har
noll träffar i kod utanför SD-004 §3.2 och denna orderfil. Utan källan skulle
§2 (kopiera in) och §3 (imperativ three.js-rigg) behöva uppfinnas, vilket §4
förbjuder och §10 explicit varnar för (jfr ORDER 112 §4:s `SKEPNAD EJ BYGGD`).
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
