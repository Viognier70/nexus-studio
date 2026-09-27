# LEVERANS — nexus-design-2026-09-26-restaurangen

**Till** Claude Code
**Från** Claude Design
**Gäller** DESIGN_SPEC_NEXUS_V1, paket 3: restaurangen

## Nya

| Fil | Vad |
| --- | --- |
| `LEVERANSNOT.md` | Substansen: planen, beslut, mätta tal, flaggor. |
| `bilder/restaurangen-01 … 08` | Från spelarens kamerahöjd: middag, hela rummet, morgon, lunch vriden, bakifrån med servisslingan, samt två närbilder av köket (mise en place på morgonen, passet vid middag). Bild 08 visar felet med väggarna hela. |
| `bilder/restaurangen-planritning.png` | Planen uppifrån med zoner, 66 numrerade platser, 13 stationer, servisslingan och mått. |

## Reviderade

| Fil | Vad som ändrades |
| --- | --- |
| `restaurantRoom.ts` | Omgjord från grunden efter specen §2.3: 60 platser plus en bar med 6 stolar, ett kök med fem stationer, pass, disk och kylrum, servisslingan, dagens tre lägen, kapade väggar och kameraprov. Ersätter 16-platsersrummet i `nexus-design-2026-08-30-1245`. |
| `figureActs.ts` | Två nya rörelser: `posePassCall` (köksmästaren vid passet) och `poseLayTable` (dukning). `ACTS` har 40 poster. Ersätter versionen i `nexus-design-2026-09-25-1900`. |
| `FRAGOR till Claude Code.md` | Nya frågor §32–36. |

## Oförändrade som krävs, men inte följer med

`figureRig.ts`, `serviceScore.ts` (`poseTakeOrder`, `poseDine`) och
`wineBarRoom.ts` (som ger `PLAYER_CAMERA`).

## Inte med

- **`restaurantRoom.js`** — webbläsarspegeln av den gamla filen. Den ska inte
  in, och den stämmer inte längre.
- **Modellen.** HTML-modellen läser `.ts`-filerna direkt, och bilderna är
  tagna ur den.
