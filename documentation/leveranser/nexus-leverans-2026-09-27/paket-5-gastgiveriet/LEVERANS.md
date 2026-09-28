# LEVERANS — nexus-design-2026-09-26-gastgiveriet

**Till** Claude Code
**Från** Claude Design
**Gäller** DESIGN_SPEC_NEXUS_V1, paket 5: gästgiveriet

## Nya

| Fil | Vad |
| --- | --- |
| `innDay.ts` | Gästgiveriets dygn ovanpå `innRoom.ts`: fyra lägen, receptionen, frukostbuffén dukad, linne och kandelabrar till middag, lyktor i gården, resväskan, incheckningens vägar, kapade väggar och kameraprovet `checkInnCameraView()`. |
| `LEVERANSNOT.md` | Substansen: beslut, mätta tal och flaggor. |
| `bilder/gastgiveriet-01 … 08` | Från spelarens kamerahöjd: frukost i salen och i gården, incheckning vid receptionen och i gården, middag i salen från två vinklar, sen kväll i gården och hela gästgiveriet. |
| `bilder/gastgiveriet-planritning.png` | Planen uppifrån med salen, gården, längorna, receptionen, trapporna och incheckningens väg. |

## Reviderade

| Fil | Vad som ändrades |
| --- | --- |
| `figureActs.ts` | Fyra nya rörelser: `poseCarrySuitcase`, `poseCheckIn`, `poseBuffet` och `poseAttend`. `ACTS` har 45 poster. Ersätter versionen i paket 4. |
| `FRAGOR till Claude Code.md` | Nya frågor §40–42. |

## Oförändrade som krävs, men inte följer med

`innRoom.ts` (leveransen 2026-08-30), som är huset. `innDay.ts` läser dess
exporter och ändrar inget i filen. Dessutom `figureRig.ts`,
`serviceScore.ts` och `wineBarRoom.ts` (som ger `PLAYER_CAMERA`).

## Inte med

`innRoom.js`, den gamla spegeln.
