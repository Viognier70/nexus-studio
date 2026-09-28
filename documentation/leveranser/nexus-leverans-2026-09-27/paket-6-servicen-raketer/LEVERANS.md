# LEVERANS — nexus-design-2026-09-26-servicen (paket 6, rev. 2026-09-27)

**Till** Claude Code
**Från** Claude Design
**Gäller** Provspelet: servicen som raketer i tre steg, mätarna, kvällens lärdom, rutan utan verksamhet och pengar, och koreografin mellan raketerna

## Innehåll

| Fil | Vad |
| --- | --- |
| `serviceFlow.ts` | Kvällen som händelser i tid (`createServiceFlow`, `sampleActor`, `staffRoute`, `flowStats`). Innehåller också raketerna: `STEPS`, `ROCKETS` (fyra för Vinbaren, lördag), `rocketsForEvening(busy)`, `applyOutcome`, `pickLesson` och `isStranded`. Ren data, inget three.js. |
| `LEVERANSNOT.md` | Substansen. |
| `skarmar/R1-raketkortet.png` | Raketkortet med de tre stegen, pågående steg och nedräkningen. |
| `skarmar/R2-ratt-svar.png` | Ett rätt svar i stunden, med tidslinje. |
| `skarmar/R3-fel-svar.png` | Ett fel svar i stunden: följden i rummet och att personalen tar över. |
| `skarmar/L1-kvallens-lardom.png` | Vilka steg som klarades, vad som gick fel och varför. |
| `skarmar/X1-utan-verksamhet-och-pengar.png` | Rutan mitt på skärmen, med en enda väg: Måltidens hus. |
| `bilder/servicen-01-mellan-handelserna.png` | Rummet mellan raketerna. |
| `bilder/servicen-02-raket-techne.png` | Ur modellen: en raket på steg 2. |
| `bilder/servicen-rummet-under-handelse.png`, `servicen-rummet-efter-fel-svar.png` | Rummet utan gränssnitt, under en raket och efter ett fel svar. |
| `FRAGOR till Claude Code.md` | §1–50. |

## Utgår

- Action-knappen (A1, A2) och quizen (Q1, Q2) i paket 1.
- Händelsekorten från den förra versionen av paket 6 (H1–H3). Raketerna ersätter dem.

## Krävs, men följer med andra paket

`wineBarRoom.ts` (paket 1), `figureActs.ts` (paket 5), `serviceScore.ts` och `figureRig.ts`.
