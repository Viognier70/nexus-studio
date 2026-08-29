# Brief till Claude Design — Kroppar i rummet

**Projekt** nexus-studio · strategiska spåret
**Lyder under** SUPERSEDING_DIRECTIVE_004 §3 (Kroppar i rummet)
**Mottagare** Claude Code, via ORDER 121 (ligger i `main` som Reserved,
blockerad på den här leveransen)

---

## 1. Vad som ska levereras

En ledad figurrigg i three.js som ersätter dagens cylinderpuckar för gäster och
personal i restaurangens 3D-scen.

**Kroppar utan ansikten.** Hållning och gest bär uttrycket. Ingen ansiktsgeometri
alls — kameran står i strategisk höjd och ett ansikte skulle ändå inte läsas.

---

## 2. Leveransformat — det viktigaste i briefen

**Kod, inte bild.** En `.ts`-fil med ren three.js.

Repot förbjuder binära assets. En `.glb`, `.fbx` eller exporterad modell går inte
att ta emot — den kan inte committas. En bild eller skiss går inte heller, för då
blir monteringen gissningar.

Konkret:

- Ren three.js, inga externa beroenden.
- Riggen byggs **imperativt, en gång** — inte deklarativt per bildruta.
- Ingen skinning, ingen `AnimationMixer`, inga inlästa modeller.
- Geometri av primitiver (box, cylinder, sphere) är helt i sin ordning.
- Filen ska heta `figureRig.ts` och vara självständig — den ska kunna kopieras
  rakt in i `frontend/src/strategic/scene/`.

**Och en HTML-modell som rör sig.** Så att formen går att se innan koden byggs
in — en gest som inte läses ska kunna avvisas nu, inte efter integrationen.

---

## 3. Måtten är låsta

| | Värde |
| --- | --- |
| Total höjd | 1,70 m — **lika för gäst och personal** |
| Axelbredd gäst | 0,46 m |
| Axelbredd personal | 0,40 m |
| Enhet | meter, samma som scenens världskoordinater |

Ingen höjdskillnad mellan gäst och personal. Skillnaden ligger i axelspann och
färg, inte i storlek.

**Silhuettkontraktet:** hjässan bär garment-färgen för gäster och uniformsfärgen
för personal. Det är den enda ytan kameran säkert ser uppifrån, så färgen måste
sitta där och inte på bröstet.

---

## 4. Sex poser

`poseWalk`, `poseIdle`, `poseSeated`, `poseGreet`, `poseWork`, `poseCarry`

Poserna ska skrivas som ledvinklar, så att en extern loop kan sätta dem varje
bildruta. De får inte kapsla in egen tid eller egen animation — spelet driver
klockan.

`poseCarry` bär något. Föremålet ingår inte i den här leveransen, men handen
ska ha ett fäste där ett föremål kan monteras senare.

**Om en pose kräver information spelet inte har — flagga det, uppfinn det inte.**
Det gäller särskilt om en gest behöver ett tillstånd som inte finns i
simuleringen. Presentationslagret ska inte fatta simuleringsbeslut.

---

## 5. Vad som ska följa med

- Ett fäste i huvudet där en indikator kan ankras (ersätter dagens ankare på
  puckens topp).
- Namngivna ledreferenser, så att monteringskoden når dem utan att gräva i
  scengrafen.
- En kort not om vilka ledvinklar varje pose faktiskt sätter.

---

## 6. Vad som INTE ingår

Ansikten och ansiktsuttryck. Rekvisita (glass, portfölj, kamera, termos) och
huvudbonader — de finns som data men porteras i en senare order. Food truckens
vagn, värdshuset, paviljongerna. Miljö, ljus, möbler — de är redan byggda.

---

## 7. Hur leveransen prövas

Riggen monteras i `InteriorGuests.tsx` och `InteriorStaff.tsx` och mäts sedan i
playwright: en figurkropp ska ha faktisk bredd och höjd i vyn, inte bara finnas i
scengrafen.

Det kravet finns av ett skäl. En tidigare leverans passerade som utförd med en
platshållare som aldrig syntes. En rigg som monterats men inte läses är samma
sak.

---

## 8. Innan du börjar

Det finns redan en ledad figur i repot: `frontend/src/strategic/scene/
AnimationPrototype.tsx` — procedurell, byggd av sphere, box och cylinder, med ben
som svänger ur fas. Den ligger isolerad bakom en flagga och byggdes före ORDER
053.

Titta på den först. Delar av arbetet kan redan vara gjort, och om den håller är
det bättre att bygga vidare på den än att börja om.
