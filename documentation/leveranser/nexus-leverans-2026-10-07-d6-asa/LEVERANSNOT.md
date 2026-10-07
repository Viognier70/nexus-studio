# D6, del 1: Intendent Åsa

**Leverans** 2026-10-07 · **Till** Claude Code · **Från** Claude Design · **Gäller** D6 punkt 1 och ORDER 313 §1 och §3 (Åsas pratbubbla)

Åsa ersätter Ingrid som mentor. Den här leveransen innehåller hennes modell, porträttet, pratbubblan, tre klipp och öppningen där hon står i Ingrids ställe. Avsändarmärkena, teckenförklaringen, kurskortet, "Byn just nu" och det låsta i början kommer i nästa del. Ingen text är inritad i bilderna. All text är nycklar `{ sv, en }`.

| Fil | Var | Vad |
|---|---|---|
| `asaFigure.ts` | monteras | **Ny.** `ASA` (färger och mått), `ASA_RIG_OPTIONS`, `createAsa(R)`, `dressAsa(rig)` och `setAsaSeated(rig, seated)`. |
| `asaClips.ts` | läggs in i `figureClips.ts` efter `staff.idle` | **Nya klipp:** `asa.greet`, `asa.point` och `asa.nodApprove`. |
| `asaStrings.ts` | slås in i `STRINGS` | `asa.name`, `asa.from`, `asa.next`, `asa.line.welcome`, `asa.line.unlock` och den nya `opening.mentor`. Resten är prototypens etiketter. |
| `portratt/asa-portratt-256.png` | asset | Porträttet för pratbubblan, renderat ur modellen. 256 × 256, genomskinlig bakgrund. |
| `oppningen/oppningManus.js`, `oppningen/oppningStrings.js` | ersätter | Öppningen med Åsa i dörren till Måltidens hus. |
| `prototyp/Asa.html` | läses | Modellen, klippen och pratbubblan, fristående. Kräver nätet för three.js. |
| `kontrollbilder/1440x900/`, `kontrollbilder/1280x720/` | — | 7 bilder per storlek. |

## 1. Modellen

Åsa byggs på `figureRig` som personalen (`variant: 'staff'`, höjdlåst) och kläs med `dressAsa(rig)`. Riggen ändras inte.

- **Håret:** mörkt (#1f1814), en page till käklinjen. Ansiktet lämnas fritt, och `figureFace` tänds på nära håll som för alla figurer.
- **Hatten:** brättet är 0,66 m brett, djupblått (#2b5797) med vit kant och sluttar svagt nedåt. Kullen är vit med ett blått band och en rosett på vänster sida. Hatten lutar lätt framåt och bärs alltid, också inne.
- **Klänningen:** blått liv (#24477a), vit krage, vitt skärp och vita manschetter. Kjolen är klockformad med vit fåll och slutar mitt på vaden. Den hänger i `pelvis`, så den följer kroppen men inte bålens lutning.
- **Inga varumärken** eller logotyper.

**Läsbarheten:**

- Från 24 m och uppifrån är det hatten som syns: en blå skiva med vit ring och vit mitt, som ingen annan figur har. Turistens solhatt är 0,46 m och kräm.
- Klänningens blå har L 0,0604 och ligger i kontrastbandet för kroppar (0,0509–0,0913).
- Inget rött och inget grönt. Det blå skiljer sig från vagnens dalablå (#2f4b6e) och kockens ring (#7fa8ff).

**Höjden** med hatt är 1,81 m. `headAnchor` flyttas 0,11 m upp, så att pip och nål hamnar ovanför hatten.

**Sitta:** inget av Åsas klipp är sittande. Om hon ska sitta senare plattas kjolen till med `setAsaSeated(rig, true)`.

**I spelet** ersätter hon `MENTOR_GARMENT` (#585b31) i `wineBarRoom.ts` och mentorn i alla scener.

## 2. Klippen

| Klipp | Längd lugn / normal / stressad | Vad som syns |
|---|---|---|
| `asa.greet` | 3,00 / 2,40 / 1,60 s | Höger hand upp till brättet, en liten bugning och handen ned. Läses som ett hej på avstånd. `ctx.yaw` vrider huvudet mot den hon hälsar på. |
| `asa.point` | 3,25 / 2,60 / 1,75 s | Bålen och huvudet vrids mot platsen (`ctx.yaw`), armen rak ut i axelhöjd, stilla och tillbaka. Med `ctx.hand = 'L'` pekar hon med vänster arm. |
| `asa.nodApprove` | 2,75 / 2,20 / 1,45 s | Händerna knäppta framför sig, två långsamma nickar och en lätt lutning bakåt. Gillande, utan färg och utan puls. |

- Alla tre rör hatten, eftersom det är den kameran ser från 24 m: handen till brättet, brättet som vrids och brättet som gungar.
- `asa.greet` och `asa.point` har händelsen `signal` (vid u 0,3 och 0,4), när gesten syns och repliken eller pratbubblan kan öppnas.
- **Typer:** `Role` + `'mentor'` och `ClipGroup` + `'mentor'`.
- Åsa spelas nästan alltid lugnt.

## 3. Porträttet och pratbubblan

**Porträttet** är renderat ur modellen: huvud och axlar snett framifrån, med ansiktet *nöjd* och varmt ljus. I spelet visas det i en rund ram på pappersgrund med en guldring.

**Pratbubblan** (bild 01 och 06) visas nere till vänster i rummet:

- porträttet, 12 % av höjden
- namnet *Intendent Åsa* i Young Serif och guld, med *Campus* som etikett
- repliken på papper med en pil mot porträttet
- knappen *Vidare*, med texten till vänster

Formen är den varma (`nexusTheme.warm`), som raketkortet och fikat.

Repliken är `asa.line.*`. Två är med: första morgonen (`asa.line.welcome`, ORDER 313 §3) och efter första provet (`asa.line.unlock`, §2).

## 4. Öppningen

Åsa står i Ingrids ställe i dörren till Måltidens hus, på 36–40 m (bild 07).

- **Nålen:** *Intendent Åsa, din mentor* / *Curator Åsa, your mentor*.
- **Rörelsen:** hon tittar ut mot vägen vid 34,6 s och hälsar mot vägen med handen till brättet vid 35,4 s (`asa.greet`, lugnt). Det ersätter blicken som Ingrid hade.
- **Storleken:** samma placering och skala (1,45) som förut. Hatten syns tydligt på avståndet.
- `MENTOR` i `oppningManus.js` har nu `who: 'asa'`, `greetAt` och `greetYaw` i stället för `garment`.

## Kontrollbilder (båda storlekarna)

| Bild | Vad den visar |
|---|---|
| 01 | Nära, 4 m: Åsa hälsar, med pratbubblan första morgonen. Per och en turist står bredvid. |
| 02 | Nära: Åsa pekar. |
| 03 | Nära: Åsa nickar gillande. |
| 04 | Spelets kamera, 24 m: hatten är det som syns. |
| 05 | Uppifrån: brättet och armen när hon pekar. |
| 06 | Pratbubblan efter första provet. |
| 07 | Öppningen: Åsa i dörren till Måltidens hus med nålen. |

## Nästa del av D6

Pratbubblans avsändarmärken (Banken, Per, Byn, Måltidens hus och personalen, till exempel *Sara, servitör*), teckenförklaringen med kockens #7fa8ff, kurskortet, "Byn just nu" och det låsta i början.
