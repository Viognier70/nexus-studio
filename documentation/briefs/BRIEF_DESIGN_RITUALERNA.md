# Brief till Claude Design — Ritualerna i servicen

**Projekt** nexus-studio · strategiska spåret
**Datum** 2026-09-28
**Lyder under** SD-004 §3 (Kroppar i rummet) och NEXUS_SPELDESIGN_V1 (Servicen > Ritualerna, Personalen)
**Bygger på** `figureRig.ts`, `figureProps.ts`, `serviceScore.ts`, `figureActs.ts` (paket 5), `serviceFlow.ts` (paket 6) och `wineBarRoom.ts` (paket 1), alla nu i `main`

---

## 1. Beslutet

Vision Owner 2026-09-28, efter provspel: **hantverket syns som ritualer i servicen.** Åtta ritualer ingår:

1. **Välkomna och placera:** hovmästaren tar emot sällskapet vid entrén och följer det till bordet.
2. **Ta upp beställning:** servitören vid bordet.
3. **Bröd och vatten:** korg och karaff ställs på bordet strax efter att gästerna satt sig.
4. **Fördrink:** ett glas till var och en innan maten.
5. **Vinservering på bricka:** glasen bärs på bricka från baren och ställs ned från gästens högra sida.
6. **Dukning:** duka fram och av mellan rätterna, bestick och glas.
7. **Servering på tallrik:** tallrikarna bärs från passet och ställs ned samtidigt vid bordet.
8. **Dekantering:** sommelieren häller över vinet i en karaff vid bordet eller vid baren.

En ritual kan utlösa en raket, alltså en händelse med tre frågor. Raketen står då i ritualens sammanhang: vilket bord, vem och vad som hålls i handen.

**Senare, som uppgraderingar per klass (inte i den här leveransen):** avecvagn, vintageport, flambering, ostvagn och cigarr. Tänk gärna på att formen ska kunna bära dem.

## 2. Personalen

Rollerna ändras samtidigt (Vision Owner 2026-09-28):

- **Matsalen:** runner, servitör, sommelier och hovmästare ersätter värd och servitör. Hovmästaren tar över värdens uppgifter.
- **Köket:** kocken finns kvar. Lärlingen blir kökets billiga roll, med fler misstag.
- **Runnern** är billig men tappar glas och kan inte svara gästerna, och det sänker ryktet. Att hon tappar ett glas ska synas i rummet.

**Behövs:** färger för runnern och hovmästaren i rummets palett, med samma krav som paket 1:
- ΔE ≥ 12 mellan roller;
- kontrasten mot golvzonerna i bandet 1,8–3,6.

Rollen ska kunna läsas av silhuett och plats, inte av ansikte (SD-004).

## 3. Vad som ska levereras

1. **`ritualActs.ts`** bredvid `figureActs.ts`, i samma form: en rörelse per ritual och roll, med `stress` 0..1 och tempot från anroparen, som i paket 1 §2. Katalogen `RITUALS` ska för varje ritual ange:
   - vem som utför den;
   - vilken station eller vilket bord den hör till;
   - vilken rekvisita som behövs;
   - hur länge den varar;
   - var i rörelsen en raket kan öppnas.
2. **Rekvisitan** i `figureProps.ts` eller en egen fil: brödkorg, vattenkaraff, glas, bricka med glas, vinflaska, dekanteringskaraff, tallrik, bestick och servett.
   - Rekvisitan monteras på `handAnchorL` och `handAnchorR` och på bordet.
   - Den byggs en gång och skapas inte i renderloopen.
3. **Runnerns tappade glas:** en kort händelse i rummet (glaset faller och personalen stannar upp) som syns från spelarens kamera.
4. **Bilder** från spelarens kamerahöjd i vinbaren:
   - varje ritual i ett ögonblick som läses på 23 meter;
   - dekanteringen och brickan även i närbild.

## 4. Villkor

- **Kameran:** det som ska läsas är höjd, riktning, tempo och föremål i handen, inte fingrar (paket 1 §2). Brickan och karaffen måste synas ovanifrån.
- **Rummet:** vinbarens stationer och vägar (`staffRoute()`, korridoren längs x −4,1, överlämningarna vid baren och passet) gäller. Ingen ritual går genom en möbel.
- **Koreografin:** simuleringen avgör gästerna och deras tillstånd, och figurerna läser dem (ORDER 271, FRAGOR §48). Ritualerna ska kunna kopplas till gästens tillstånd: seated → bröd och vatten, ordering → beställning, dining → servering och dukning.
- **Språket:** spelets text är på engelska från ORDER 273 (Vision Owner 2026-09-28). Etiketter i modellerna får vara på engelska.
- **Reducerad rörelse:** varje ritual ska ha ett läge utan animation, där slutbilden räcker.

## 5. Frågor till er

1. Behöver hovmästaren en egen station, till exempel en pulpet vid entrén, eller räcker entréns matta?
2. Ska dekanteringen ske vid bordet eller vid baren i vinbaren? Speldesignen säger inget.
3. Hur visas det att en ritual utlöser en raket, utan att det krockar med raketkortet och ringen på golvet (paket 6)?
