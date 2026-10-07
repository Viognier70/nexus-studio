# Tillägg till D7: granskningens sex punkter

**Leverans** 2026-10-07 · **Till** Claude Code · **Från** Claude Design · **Gäller** `nexus-leverans-2026-10-06-din-vag`

D7 är godkänd. Stegens ordning och kravet på silver i Metodköket för bistron gäller som de är. Det här tillägget gör de fem ändringarna från granskningen. Allt annat i D7 gäller oförändrat. Kontrollbilderna är i 1440 × 900 och 1280 × 720, och ingen text är inritad i bilderna. All text är nycklar `{ sv, en }`.

| Fil | Var | Vad |
|---|---|---|
| `rivalTorget.ts` | ersätter `TRUCK_SPOT_POINTS.torget` | Rivalernas nya plats på torget, med vinkel och köplatser, och kontrollen mot kartan (§2). |
| `bistroRoom.ts` | ersätter `BISTRO` i `bistroRefit.ts` | Bistron inom husets mått, 14,47 × 10,05 m, med 31 platser (§4). |
| `dilemmaGrades.ts` | ersätter `right: boolean` i `afterHoursFika.ts` | Dilemmakortets tre bedömningar, färgerna och vad som händer efter svaret (§5). |
| `fikaClips.ts` | läggs in i `figureClips.ts` | **Nya klipp:** `gesture.raiseHand` och `fika.sipCup` (§3). |
| `dinVagStrings.tillagg.ts` | slås in över `dinVagStrings.ts` | 13 ändrade eller nya nycklar och 4 som tas bort. |
| `prototyp/Din vag och vagnen.html` | läses | Prototypen, fristående, med ändringarna. |
| `skarmar/1440x900/`, `skarmar/1280x720/` | — | 10 kontrollbilder per storlek. |

## 1. Åsa

Åsa äger inte huset. Hon förmedlar erbjudandet och har nycklarna, och huset ägs av någon annan i byn.

- `asa.role`: *Har nycklarna till huset vid torget*.
- `asa.line`: *”Jag har pratat med den som äger huset. Vinbaren har gått bra hela sommaren, och nu kan hela huset bli ditt. Vill du ta över och göra en bistro av det?”*
- `asa.reply.take`: *”Då kommer jag i morgon med ritningarna och ägarens kontrakt.”*

Scenen är densamma: Åsa står på trottoaren med nycklarna, och nycklarna byter hand vid Ta över. Ägaren syns inte och har inget namn. Bilder 02–03.

## 2. Rivalernas kö på torget

**Före:** `TRUCK_SPOT_POINTS.torget` var [6,49, −21,59] med luckan söderut. Kön stod 0,41 m inne på Prästgatan. Att vända luckan räcker inte där, eftersom torgytan väster om spelarens vagn bara är cirka 6 m mellan gatan Torget och Prästgatan. Därför flyttas platsen.

**Efter (`rivalTorget.ts`, kartans ram):**

- **Mitten** är [21,25, −12,75], på torgytans breda del, söder om spelarens vagn och väster om vinbarens hus.
- **Vinkeln** är 212,58° (`yaw` 3,7103, `yawForThree` −3,7103). Vagnen står parallellt med Prästgatan.
- **Luckan** vetter mot nordost, mot torget och spelarens trädäck. Kön står på torgytan.
- **Den nya vinkeln** står i `TRUCK_SPOT_PITCH`. Den behövs, för annars vrider `installTrucks()` vagnen efter närmaste gångnod.

**Kontrollen:**

- Ingen punkt på vagnen eller i kön ligger på en gata eller i ett hus.
- Vagnens närmaste hörn ligger 2,06 m från Prästgatans kant (12 m bred), och kön ligger minst 6,27 m från den.
- Köns sista plats ligger 1,74 m från vinbarens västra gavel, som inte har någon dörr.
- Avståndet till spelarens vagn (dragstång, kö och trädäck) är minst 2,55 m, så båda kan stå där samma kväll med en gång mellan köerna.

Vinbarens dörr, trottoaren och väntplatsen (`VENUE_OUTSIDE`) ligger på husets norra sida och berörs inte. Bild 01.

## 3. Klippen

| Klipp | Vem | Längd lugn / normal / stressad | Vad som syns från 8 m |
|---|---|---|---|
| `gesture.raiseHand` | den som frågar | 2,25 / 1,80 / 1,20 s | Armen rakt upp över huvudet med öppen hand, stilla och utan vinkning. Bålen rätar upp sig och huvudet lyfts. |
| `fika.sipCup` | de andra vid bordet | 3,75 / 3,00 / 2,00 s | Koppen lyfts i handtaget med vänster hand under fatet, en klunk med huvudet bakåt, och sedan ned. |

- `gesture.raiseHand` hålls uppe med `holdUntil` tills kortet öppnas. Klippet fungerar också stående (`c.seated = false`).
- Den nya händelsen `signal` vid u 0,4 betyder att handen syns och att kortet kan öppnas.
- `fika.sipCup` använder `coffeeCup` från `truckClips.ts`. De andra vid bordet börjar med 0, 2,5 och 4,0 s förskjutning.

## 4. Bistrons rum inom huset

Rummet är lika stort som huset, **14,47 × 10,05 m**, med dörren i östra väggen och köket i väster (`bistroRoom.ts`, rummets ram som `wineBarRoom.ts`).

**Möbleringen:**

- **Bänken** längs norra väggen har fyra bord för två.
- **I salen** står tre bord för fyra och fyra bord för två.
- **Baren** är kortare och har tre barstolar. Den står i sydväst, framför passet.
- **Passet** har tre värmelampor och sitter i köksväggen.
- **Innanför dörren** finns värdpulten och en väntplats för två.

**Platserna:** 31 (8 + 12 + 8 vid borden och 3 vid baren). Förslaget i D7 var 34, i ett rum som inte rymdes i huset.

**Gångarna:** minst 0,83 m mellan stolarnas kanter, 1,36 m i mittgången från dörren och 1,75 m fritt innanför dörren.

**I ombyggnaden** krymper rummet till husets mått medan det töms, under steget *Tömt*. I steget *Vinbaren* visas husets mått streckat. Vinbarens rum är fortfarande 15,6 × 11,8 m och större än huset. Det är inte ändrat här, och Code avgör det som i kartkontrollen. Bilder 04–06.

## 5. Dilemmakortets tre bedömningar

Dilemmakortet har tre bedömningar och aldrig rätt eller fel (`dilemmaGrades.ts`):

| Bedömning | Färg | Märke | Rörelse | Följden |
|---|---|---|---|---|
| **Väl grundat** | grönt, som rätt svar | ✓ | lyft | `FIKA.morale.well` |
| **Delvis grundat** | neutralt, i pappersfärg | ½ | stiger in | `FIKA.morale.partly` |
| **Svagt grundat** | mörk mässing, som *missnöjd* | ○ | skakar | `FIKA.morale.weak` |

Rött används aldrig på kortet.

**Efter svaret:**

- Det valda svaret fylls med bedömningens färg.
- De andra svaren visar sin bedömning under texten.
- Ett väl grundat svar som inte valdes får papper och streckad grön kant.
- Papperet kommer efter 650 ms med bedömningens namn och raden *Väl, delvis eller svagt grundat*.
- Den som frågar lutar sig tillbaka vid väl grundat, nickar vid delvis och tittar ned vid svagt.

**Innehållet:** de fyra svaren i prototypen är exempel (ett väl, ett delvis och två svagt). Dilemmana och deras bedömningar kommer från Codes dilemman efter Anders granskning.

**Nycklarna:** `fika.right`, `fika.wrong`, `fika.held` och `fika.two` tas bort. Nya är `fika.grade.well`, `fika.grade.partly`, `fika.grade.weak` och `fika.scale`. Bilder 07–10.

## Kontrollbilder (båda storlekarna)

| Bild | Vad den visar |
|---|---|
| 01 | Vagnen på 24 m med Grillvagnen på rivalernas nya plats och kön på torget. |
| 02–03 | Åsa: erbjudandet med den nya repliken, och efter Ta över. |
| 04 | Ombyggnaden: vinbaren med husets mått streckat. |
| 05–06 | Bistron byggd och tänd, med 31 platser inom huset. |
| 07 | Fikat: frågan. |
| 08–10 | Fikat: väl, delvis och svagt grundat. |

## Öppet

1. **Rivalens plats:** den nya platsen gäller också de kvällar spelaren inte har vagnen. Code avgör om torget ska ha en andra plats för rivaler när spelarens vagn inte står där.
2. **Vinbarens rum** är fortfarande större än huset (kartkontrollen 2026-10-06 §1.3).
3. **Följden vid delvis grundat** (`FIKA.morale.partly`) sätter Code i balance.ts. Prototypen visar 0.
