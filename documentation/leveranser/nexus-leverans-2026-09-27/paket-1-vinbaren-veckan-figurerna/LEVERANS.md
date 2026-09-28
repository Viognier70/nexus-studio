# LEVERANS — nexus-design-2026-09-25-1630

**Till** Claude Code
**Från** Claude Design
**Gäller** DESIGN_SPEC_NEXUS_V1, paket 1: vinbaren, skärmarna för en vecka,
mentorn, gäst- och personalanimationer

## Nya

| Fil | Vad |
| --- | --- |
| `figureActs.ts` | Trettio rörelser på riggen: femton för gäster (med väntans tre lägen), nio personalroller med lugnt och stressat läge, spelarens tre insatser, mentorns tre lägen. Plus insatsringen och katalogen `ACTS`. |
| `LEVERANSNOT.md` | Substansen: beslut, mätta tal och flaggor för alla tre delarna. |
| `bilder/vinbaren-01 … 05` | Vinbaren från spelarens kamerahöjd: lördag, tisdag, platina från två vinklar, och en närbild över baren. |
| `bilder/vinbaren-planritning.png` | Planritningen uppifrån med zoner, platser, stationer och mått. |
| `bilder/anim-01 … 04` | Figurerna: väntans tre lägen, alla från kamerahöjd, personal lugn/stressad, spelaren och mentorn. |
| `bilder/figur-mentorn.png`, `figur-sommelieren.png` | Porträtten skärmarna använder. |
| `skarmar/00 … 15` | Sexton bilder, 1920 × 1080: systemet (typografi, mått, färg) och femton lägen i veckans ordning. |

## Reviderade

| Fil | Vad som ändrades |
| --- | --- |
| `wineBarRoom.ts` | Omgjord enligt specen §2.1: central bar med vinväggen mitt i, vinväggen i två lägen (bas/platina), DJ i hörnet, ljus på borden, två kvällsstämningar, kapade väggar på kamerasidan och ett kameraprov i kod. Ersätter versionen i `nexus-design-2026-08-30-1245`. |
| `FRAGOR till Claude Code.md` | Nya frågor §21–26. §1–20 oförändrade. |

## Oförändrade som krävs, men inte följer med

`figureRig.ts` och `serviceScore.ts`. `figureActs.ts` importerar sex gester
ur `serviceScore.ts` (leveransen servicekoreografin). Finns den inte i
`main` ännu följer den med den leveransen, inte den här.

## Inte med

- **Food trucken och uppgraderingsskärmen** — paket 2.
- **Modellerna.** Tre HTML-modeller finns hos oss (vinbaren, figurerna,
  skärmarna). De läser `.ts`-filerna direkt, utan speglar. Bilderna i
  `bilder/` och `skarmar/` är tagna ur dem.
- **Ingen `.js`.**
- **Skärmdumparna specen hänvisar till** kom inte med i vårt underlag. Vi har
  fortsatt i förra leveransernas stil för rummen och figurerna, och i
  projektets designsystem för skärmarna (Archivo, hörn 0, linjer 2 px, en
  röd accent). Skicka dumparna om spelet redan har en annan stil i
  gränssnittet.
- **Speldesignen** (`NEXUS_SPELDESIGN_V1.md`) har vi inte sett. Se FRAGOR §26.
