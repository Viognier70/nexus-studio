# Leverans — servicekoreografin

**Projekt** nexus-studio · strategiska spåret
**Order** BRIEF_DESIGN_SERVICEKOREOGRAFIN
**Datum** 2026-09-16

---

## Filerna

| Fil | Vad | Var den hör |
| --- | --- | --- |
| `serviceScore.ts` | Partituret som data (38 steg) + de nio nya poserna som kod + `PROVENANCE` | Repot. Läggs vid `figureRig.ts`. |
| `Servicekoreografin.html` | Den godkända modellen, fristående — öppna i valfri webbläsare, inget nät behövs | Granskning. Hör inte i repot. |
| `LEVERANSNOT.md` | Vad som beslutades och varför. Läs den först. | Granskning. |
| `FRAGOR till Claude Code.md` | Öppna frågor, §16–20 är nya | Granskning. |

Ingenting här är binärt. `Servicekoreografin.html` är en enda HTML-fil
med three.js inlinat — den är stor (658 kB) därför att den är
fristående, inte därför att den bär assets.

---

## Vad som ska in i repot

**Bara `serviceScore.ts`.** Den importerar `figureRig.ts` och
ingenting annat. Inga externa beroenden, ingen scengraf, inga
koordinater.

```
import {
  SERVICE_SCORE, SERVICE_DISTANCES, SERVICE_TIMING,
  tempoForGameSpeed, resolveScore,
  poseWelcome, posePoint, poseTakeOrder, poseSetDown, poseOffer,
  poseDine, poseSignal, poseNod, poseAttend,
  poseSitTransition, poseFillWork
} from './serviceScore';
```

### Beror på, redan i main

- `figureRig.ts` (ORDER 141, merge 6bd7fb9) — `FigurePose`,
  `PoseOptions`, `PoseArm`, `poseIdle`, `poseSeated`, `poseCarry`,
  `poseWork`, `blendPose`, `applyPose`.

Vi skickar **ingen kopia** av `figureRig.ts` eller av rumsfilerna.
En andra sanning som ingen läser är värre än ingen.

### Beror på, finns inte än

- Sex ankarroller i `businessRoom.ts`: `greetHost`, `seatSide`,
  `orderSpot`, `serveSpot`, `paySpot`, `farewellSpot`. Alla härledbara
  ur `seats[i]` plus vinkel och avstånd ur `SERVICE_DISTANCES` — men
  härledningen måste veta var möbelkanten går. **Fråga 18.**
- Två gästtillstånd: `dining → wantsCheck`, och bordet upptaget efter
  `leaving`. **Fråga 16** — blockerar två av trettioåtta steg, inte
  resten.
- En realtidsklocka för gestuppgifter. **Fråga 17** — enda punkten i
  leveransen som kostar något i koden.

---

## Ordningen att läsa i

1. `LEVERANSNOT.md` — de tre besluten och talen som rättar en gissning.
2. Öppna `Servicekoreografin.html`. Titta i realtid, sedan **4× på
   spelklockan**, sedan **4× på allt**. Skillnaden mellan de två sista
   är hela argumentet.
3. `serviceScore.ts` — börja i `#region tempo`, sedan `SERVICE_SCORE`,
   sedan `PROVENANCE`.
4. `FRAGOR till Claude Code.md` §16–20.

---

## Det korta svaret

En service har inte en takt. Den har tre, och de får inte skalas med
samma tal. Gest behåller sin realtid vid varje speltempo; förflyttning
och uppehåll skalas rakt. Vid 1× är 34 % av linjen gest, vid 4× på
spelklockan 67 % — och det är den inverteringen som gör att 4×
fortfarande läser som en restaurang.

Fyra steg saknas i briefens §2 och är tillagda: gästen begär notan,
bordet dukas av, att bli mottagen är ett eget steg, och ”beställning”
är ett uppehåll plus en gest.

Partituret är skrivet för **en** gäst vid bordet. Säg om ett par är
normalfallet.
