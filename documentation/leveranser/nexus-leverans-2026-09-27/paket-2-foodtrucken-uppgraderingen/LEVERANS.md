# LEVERANS — nexus-design-2026-09-25-1900

**Till** Claude Code
**Från** Claude Design
**Gäller** DESIGN_SPEC_NEXUS_V1, paket 2: food trucken och uppgraderingsskärmen

## Nya

| Fil | Vad |
| --- | --- |
| `truckPitch.ts` | Platsen runt vagnen: tre platser i Grythyttan, väder (sol, regn, blåst), ätplatser, köns stegning, paraplyet, takets och markisens kapning och kameraprovet `checkPitchView()`. Ligger ovanpå `foodTruckRoom.ts` och rör den inte. |
| `LEVERANSNOT.md` | Substansen: beslut, mätta tal och flaggor. |
| `bilder/foodtruck-01 … 10` | Från spelarens kamerahöjd: torget i sol, regn och blåst, Måltidens hus vid lunch och klockan tre, sjön i sol och regn, torget bakifrån, en närbild och taket på (felet). |
| `bilder/foodtruck-plan-*.png` | En planritning per plats, med vagn, markis, matta, kö, hämtplats, ätplatser, besättning och grannar. |
| `skarmar/U1 … U4` | Uppgraderingen: erbjudandet, vad som följer med och vad som ändras, första platsen och bytet. 1920 × 1080. |

## Reviderade

| Fil | Vad som ändrades |
| --- | --- |
| `figureActs.ts` | Åtta nya rörelser: stå i kö, steg fram i kön, äta stående, äta på bänk, paraplyarm, kura i regn, stå emot vinden, räcka ut i luckan, grillen. `ACTS` har 38 poster. Ersätter versionen i `nexus-design-2026-09-25-1630`. |
| `skarmar/11-B1-bankmotet-reviderad.png` | Meningen "Vinbaren behålls" är struken. Se FRAGOR §27. |
| `FRAGOR till Claude Code.md` | Nya frågor §27–31. |

## Oförändrade som krävs, men inte följer med

`foodTruckRoom.ts` (leveransen 2026-08-30), `figureRig.ts`,
`figureProps.ts` (solhatt, huva, glass) och `serviceScore.ts`.
`wineBarRoom.ts` läses bara för `PLAYER_CAMERA`.

## Inte med

- **Modellen.** HTML-modellen finns hos oss och läser `.ts`-filerna direkt.
  Bilderna är tagna ur den.
- **Ingen `.js`.**
