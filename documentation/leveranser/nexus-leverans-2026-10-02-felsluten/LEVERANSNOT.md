# LEVERANSNOT: felsluten i händelserna

**Datum** 2026-10-02
**Till** Claude Code, via dig
**Från** Claude Design
**Gäller** Felsluten som saknades i leverans 3: födelsedagen (steg 1 och 3) och tillsynen, variant B och C (steg 3).

Bara ändrade och nya filer finns här. Allt annat i `nexus-leverans-2026-09-29-handelserna` gäller som förut.

## 1. Innehåll

| Fil | Var | Vad |
|---|---|---|
| `handelserManus.js` | ersätter leverans 3:s | `birthday` har `wrong1`, `wrong2` och `wrong3`. `inspection` har även `wrongB3` och `wrongC3`. `stepOf` känner igen `wrongB3` och `wrongC3` som fel i steg 3. `EVENTS` listar de nya varianterna. |
| `teaterScen.js` | ersätter leverans 3:s | Ny rumshändelse `musicUp` (DJ:n höjer). Inget annat är ändrat. |
| `eventVideoStrings.ts` | ersätter leverans 3:s | 71 nycklar, 6 nya: `evv.ch.fail1`, `evv.ch.fail3`, `evv.ch.ifailB`, `evv.ch.ifailC`, `evv.variant.wrongB3`, `evv.variant.wrongC3`. Visas bara i prototypen. |
| `manus/01-fodelsedagen.md` | ersätter | Nytt avsnitt *Ritade felslut*: tidslinje, klipp och kamera för steg 1 och 3. |
| `manus/04-tillsynen.md` | ersätter | Nytt avsnitt *Ritade felslut i steg 3, variant B och C*. |
| `prototyp/Handelserna - video.html` | läses | Fristående prototyp med alla varianter. |
| `bilder/1440x900/`, `bilder/1280x720/` | — | 9 nya kontrollbilder i varje storlek, utan text, granskade i full storlek. |

## 2. Felsluten

Raketen slutar vid första felet, men scenen spelas alltid klart. Per tar över i alla fel. Felet ligger hos krogen, och förklaringen efteråt är lika vänlig som förut.

**Födelsedagen**
- **Steg 1** (`a1_1`, `a1_2`, `a1_4`). Köket får inte veta om nötallergin. Kocken ställer ut tårtan och Sara tänder ljusen. Värden vinkar, Per går tillbaka i stressat tempo, stoppar Sara vid luckan, och hon ställer tillbaka tårtan. Per går in till kocken, och kocken tar tillbaka tårtan. Den nya kommer senare, utan att kameran följer.
- **Steg 2**, *fort*: oförändrat.
- **Steg 3**, *höja musiken* (`a3_4`). Per vinkar till sig Elin och pekar mot DJ:n. Elin går dit med brickan, och DJ:n höjer (`musicUp`). Sällskapet sjunger över musiken, grannarna i lounge B vinkar efter notan, och Per tar den till dem.

De försvarbara svaren i steg 3, *vänta* och *fråga först*, får inga egna slut (beslut 2026-10-02). Lärdomen visar `near3_1` och `near3_2`, och scenen spelas som vid rätt svar. Felsvaren *högt* och *genom baren* i steg 2 är beskrivna i manuset men inte ritade.

**Tillsynen**
- **B, steg 3** (`a3_1`, samma följd för `a3_4`). Sara frågar hur gamla de är och litar på svaret. Hon hämtar flaskan på disken och häller upp två glas. Handläggaren skriver och polisen skakar på huvudet.
- **C, steg 3** (`a3_3`). Per säger att han skrev egenkontrollen själv. Handläggaren vinkar till sig Mira, som inte vet vad som står i den, och skriver. `a3_1` får samma slut utan Miras del.

Steg 1 och 2 är desamma i alla varianter, så `wrong1` och `wrong2` gäller också B och C.

## 3. Nytt för Code

- **`musicUp`** (rumshändelse): `{ type: 'musicUp', t, at: [x, y, z], until? }`. Rummets `parts.djGlow` pulserar i takten (120 bpm), med ett sken och en punktljuskälla över pulten. Tonar in på 1,2 s.
- **DJ:n i födelsedagen.** Hon står bakom pulten i sydöstra hörnet i alla varianter, eftersom det är helgkväll. Det syns i de rätta varianterna också, men mest utanför bild. Inga egna klipp ännu: arbetet vid pulten spelas med `cook.station`, och hon står 0,25 m upp (`stand`). Hennes `cook.station` byts mot DJ-klipp när de finns.
- **Rekvisita i B:** `wineBottle` på barens norra disk och två `wineGlass` på lounge B:s bord, bara i `wrongB3`.
- Inga nya klipp och inga nya nycklar i spelets `STRINGS`. Pratbubblorna är de som redan finns (`fail` och `event.sanction.*`).

## 4. Kontrollbilder

Från spelets kamera, i 1440 × 900 och 1280 × 720, med den varma graderingen och utan text.

- `fodelsedagen-6-11m-per-stoppar-tartan`: Per stoppar Sara vid luckan med de tända ljusen.
- `fodelsedagen-7-12m-per-hos-kocken`: Per hos kocken innanför köksväggen, tårtan kvar på luckan.
- `fodelsedagen-8-13m-dj-hojer`: Elin vid DJ-hörnet, pulten lyser.
- `fodelsedagen-9-13m-per-tar-notan`: Per med notan vid lounge B, sällskapet i lounge A.
- `tillsynen-10-11m-variant-b-sara-fragar`: Sara frågar de unga gästerna hur gamla de är.
- `tillsynen-11-11m-variant-b-sara-haller-upp`: Sara häller upp.
- `tillsynen-12-13m-variant-b-handlaggaren-skriver`: handläggaren skriver och polisen skakar på huvudet.
- `tillsynen-13-12m-variant-c-mira-vet-inte`: Mira vid kortänden skakar på huvudet.
- `tillsynen-14-12m-variant-c-handlaggaren-skriver`: handläggaren skriver.
