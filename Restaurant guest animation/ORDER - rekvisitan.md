# ORDER — Rekvisitan: montering av `figureProps.ts`

**Projekt** nexus-studio · strategiska spåret
**Lyder under** SUPERSEDING_DIRECTIVE_004 §3 (Kroppar i rummet)
**Mottagare** Claude Code
**Beroenden** `figureRig.ts` i `main` (ankarpunkterna),
`silhouetteContrast.ts` i `main` (kontrastbandet)

Fyra handföremål och sex huvudbonader, monterade på riggens befintliga
ankare. Nycklarna är `archetypes.ts` egna literaler.

---

## 1. Leveransen

```
frontend/src/strategic/scene/figureProps.ts
```

Ren three.js, primitiver, inga externa beroenden utöver `three`, inga
loaders, inga binära assets. Formerna byggs imperativt en gång per figur,
geometrin är delad via cache. Ingen egen klocka, **inget urval** — vilken
arketyp som bär vad är redan bestämt i `archetypes.ts` och rörs inte här.

`figureProps.js` är webbläsarspegeln och **ska inte in i repot.**

### Exporter

| Export | Vad |
| --- | --- |
| `createHandProp(id, options?)` | `'iceCream'` \| `'briefcase'` \| `'camera'` \| `'thermos'`. |
| `createHeadTopping(id, options?)` | `'ruffled'` \| `'shortCut'` \| `'workCap'` \| `'sunHat'` \| `'grayHair'` \| `'hoodRaised'`. |
| `attachProps(rig, spec)` | Monterar en uppsättning på en färdig rigg. |
| `checkCrownCoverage(rig, garment, samples?)` | Silhuettkontraktets prov. |
| `checkPropPalette(floors, min?, max?)` | Kontrastbandet mot inskickade golv. |
| `propContrastRange(floors, garment)` | Spann mot golv och mot garment. |
| `measureProp(handle)` | Faktisk utbredning i världsmått. |
| `disposeFigurePropGeometry()` | Frigör den delade cachen. |
| `PROPS`, `PROP_COLOURS`, `PROP_WINDOW` | Mått och toner som data. |
| `DARK_WINDOW`, `LIGHT_WINDOW`, `CROWN_PHI`, `CROWN_DISC_R` | Bandets två fönster, kalottens vinkel. |

Nycklarna skrivs oförvanskade, så kopplingen blir en **uppslagning** och
inte en översättning.

---

## 2. Montering

```ts
const handles = attachProps(rig, {
  hand: arch.handProp,          // får vara null
  headTopping: arch.headTopping,
  side: 1,                      // 1 = höger hand
  garmentColour: '#5b5045'
});
// vid avmontering:
handles.forEach((h) => h.dispose());
```

Handföremål hamnar på `rig.joints.handAnchorR` respektive `handAnchorL`;
bonader på `rig.joints.head` — **inte** `headAnchor`, som är upptagen av
pip-markören.

`hand` får vara `null`. Två arketyper bär ingenting, och `null` är deras
riktiga värde — inte ett fel att gardera mot.

---

## 3. Svaret på briefens enda verkliga designfråga

SD-004 §3.3: huvudets övre hemisfär bär garment- eller uniformsfärgen. Det
är den enda ytan den strategiska kameran säkert ser, och hela skälet till
att figurerna inte behöver ansikten. En bonad som täcker hjässan tar bort
just den ytan.

Briefen erbjöd tre vägar och begärde ett motiverat val. **Svaret är två
val, och gränsen går mellan hår och huvudbonad** — de är inte samma sorts
sak.

**Hår** (`ruffled`, `shortCut`, `grayHair`) lämnar hjässan fri. Kalotten i
`figureRig` slutar vid 1,15 rad från polen; håret byggs som en *sfärisk
sektor av samma klot*, från exakt den vinkeln och ned förbi ekvatorn.
Alltså kraniets egen yta, flyttad utåt med hårets tjocklek — en sektor av
kraniet kan inte glappa mot kraniet. Det är också anatomiskt rätt: hår
växer inte ovanpå en hjässa, det ramar in den.

**Huvudbonader** (`workCap`, `sunHat`, `hoodRaised`) täcker hjässan — det
är vad de *är*. Att göra dem små nog att kalotten dominerar hade gjort dem
till dekaler. I stället ärver ovansidan identitetsfärgen och igenkänningen
flyttas till formen: skärm 0,17 m fram, brätte med ytterradie 0,27 m mot
huvudets 0,12, äggformat skal på 0,155 m. **Ingen av de tre ändrar vilken
färg kameran ser uppifrån. Alla tre ändrar formen den ser.**

`checkCrownCoverage()` gör frågan mätbar i stället för att påstå den:
strålar rakt ned över hjässan, andel träffar på identitetsfärgad yta.

---

## 4. Bandet har två fönster, inte ett

Detta är fyndet som får rekvisitan att fungera alls, och det gäller **även
rumsleveranserna** som hittills bara använt den ena lösningen.

`silhouetteContrast.ts` kräver 1,8–3,6 mot varje golv en figur kan stå på.
Villkoret är ett intervall på en **kvot**, och kvoten är symmetrisk: en
färg får lika gärna vara *ljusare* än golvet.

Mätt mot samtliga fjorton golvzoner i de fyra klasserna, som spänner
L 0,1864 (ölkrogens bryggerigolv) till L 0,3317 (dess matsal):

| Lösning | Fönster | Bredd |
| --- | --- | --- |
| Mörk | L 0,0560 – 0,0813 | 0,025 |
| **Ljus** | **L 0,6371 – 0,8009** | **0,164 — sex gånger bredare** |

Rekvisitan **måste** använda det ljusa. Garment-färgerna ligger på
L ≈ 0,083, alltså i det mörka fönstret; en portfölj i samma fönster får
kontrast **1,12 mot kroppen den hänger intill** — den klarar golvprovet
och är ändå osynlig. I det ljusa blir samma portfölj 5,79 mot garment och
2,0–3,3 mot varje golv.

Åtta av tolv toner ligger ljust. De två mörka är rufsigt och kortklippt
hår, som aldrig rör kalotten — de sitter i huvudets kant och läses mot
golvet bakom, inte mot garment framför. Grått hår ligger ljust, för att
läsa som grått och inte som en mörk lugg.

**Konsekvens att ta ställning till:** om en framtida figurfärg ska synas
intill en annan figur, inte bara mot golvet, hör den i det ljusa fönstret.
Det gäller lika mycket uniformer som rekvisita.

---

## 5. Blockerande frågor

**1. Barnet kan inte porteras.** ⛔ BLOCKERANDE FÖR DEN ARKETYPEN
`archetypes.ts` ger barnet `heightMult: 0.72`. `figureRig.ts` har ett
mått: 1,70 m, låst av SD-004 §3 för både gäst och personal. **Ett barn på
1,70 m med glass är inte ett barn.** Antingen lyfts höjdlåset för gäster,
eller så kan arketypen inte porteras — och det är ett direktivbeslut, inte
ett geometribeslut. Rekvisitan kan levereras utan att detta avgörs; barnet
kan inte.

**2. `SKIN_TONES` är inte kontrastprövade.**
De sex tonerna spänner L 0,057 till 0,690 — tvärs över **båda** fönstren
och rakt genom det otillåtna spannet mellan dem. Riggen har inga ansikten
så ytan är liten, men om händer eller nacke någonsin blir stora nog att
mätas är det en verklig konflikt mellan `archetypes.ts` och
`silhouetteContrast.ts`.

**3. "Händerna i fickorna" saknar pose.**
Två arketyper bär ingenting: efter-skiftet har händerna i fickorna,
stamgästen bara ingenting. Riggen har ingen fickpose — `poseIdle` håller
armarna hängande — så skillnaden går inte att se. Det kräver en sjunde
pose i `figureRig.ts`, inte en form här.

**4. Kopplingen arketyp → 3D-figur finns inte.**
`assignArchetype()` bor i `ui/foodtruck/` och 3D-scenens gäster har ingen
arketyp. Briefen säger att kopplingen byggs i ordern; den saknas alltså,
och `attachProps()` tar därför nycklarna som argument i stället för att
slå upp dem. **Det är monteringens uppgift att bygga bryggan.**

**5. Palettkoden i fem kopior.**
WCAG-formlerna finns nu i fyra rumsfiler plus den här.
`silhouetteContrast.zones.ts` levereras separat.

---

## 6. Definition of Done

| # | Krav | Referensvärde ur modellen |
| --- | --- | --- |
| 1 | Alla sex bonader klarar hjässans täckning | 0,99–1,00 mot kravet 0,95 |
| 2 | Provets nollpunkt är 1,00 för ett bart huvud | Annars mäter provet kalotten, inte bonaden |
| 3 | `checkPropPalette()` mot alla 14 golvzoner tom | 168 par prövade, 0 utanför |
| 4 | Kontrastspann mot golv | 1,99 – 3,26 (band 1,8 – 3,6) |
| 5 | Lägsta kontrast mot garment, ljusa tonerna | 5,76 |
| 6 | Handföremålens bredd mot axelspannet 0,46 m | portfölj 63 %, övriga under |
| 7 | Inget hår över kalottgränsen | Sektorns `phiStart` = `CROWN_PHI` per konstruktion |
| 8 | Föremålen syns i vyn på monterad figur | Rasterade pixlar, inte bara noder i grafen |

Krav 2 finns av ett skäl: provdisken samplade först 0,96 av huvudradien
och gav **0,92 för ett bart huvud** — det underkände alltså kalotten
själv. Ett prov vars nollpunkt inte är 1,00 kan inte säga något om vad en
bonad kostar. Radien är nu kalottens eget fotavtryck, `sin(1,15) × R`.

Krav 3–5 bör bli tester i `paletteContrast.test.ts`.

---

## 7. Vad som inte ingår

Ansikten och ansiktsuttryck. Kroppsbyggnad och höjdvariation (se flagga
1). Rummens utensilier — bordsdukning, glas, tallrikar, flaskor på
borden — är ett annat lager och inte beställt för något rum.
Huvudbonadernas urval. Ingen simuleringslogik.
