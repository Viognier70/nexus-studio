# ORDER 276 — Raketerna styr gästflödet (rapport)

**Ordern** (Vision Owner 2026-09-28, provspel): "Raketerna styr gästflödet: fler rätta svar ger fler gäster in i lokalen, som köper mer ur lagret." Efter ORDER 276 stannar arbetet, så att Vision Owner kan spela lagret och gästflödet innan personalen (277) och ritualerna (278) byggs.

## 1. Vad som byggdes

- **Gästerna** (`sim/incidents.ts` `letGuestsIn`):
  - Varje klarat steg släpper in `INCIDENTS.guestsPerClearedStep` (1) gäst.
  - En hel klarad raket släpper in `INCIDENTS.guestsOnRocketCleared` (1) till. En raket genom alla tre stegen ger alltså fyra gäster.
  - Ett fel eller en utebliven tid släpper inte in någon.
  - Gästerna kommer in på samma väg som ett utfall med `room.arrive` (`scenario.spawnedRemaining`) och köper ur lagret som andra gäster.
- **Svaret i stunden:** `StepReveal.guestsIn` bär antalet gäster. Raketkortets band säger "One more guest comes in." eller "3 more guests come in." (`strings.rocket.guestsIn`).
- **Talen** står i `balance.ts` `INCIDENTS` och är valda (F49).

## 2. Tal

**Rimlig mot svag** (`frontend/reports/order276/week-players.json`, 20 veckor):
- Den rimliga spelaren har `mean.rimlig.resultSek` 9 422 kr i veckan, mot 4 596 kr efter ORDER 275.
- Den svaga har −27 052 kr och går minus i `svagMinusWeeks` 20 av 20 veckor.

**Slumpmålet, mellanmätning** (`frontend/reports/order276/randomness.json`, 1 000 veckor):
- `winShare` är 0,721, inom 70–80 %.
- Vision Owner bestämde att slumpmålet mäts om efter punkt 2–4 (lagret, gästflödet och personalen). Den mätning som gäller görs därför efter ORDER 277. Den här är en mellanmätning.
- Harnessen svarar direkt och rätt i varje steg, så båda spelarna får gästflödet. Skillnaden mellan dem är medaljerna.

**Tester:** `frontend/src/sim/__tests__/order276GuestFlow.test.ts` prövar tre saker:
- ett klarat steg ger en gäst, och en hel raket en till;
- ett fel ger inga;
- en kväll med rätta svar har fler gäster och högre intäkt än en med fel.

Hela sviten är grön.

**Spelarens flöde:** `frontend/reports/order276/dod.json` och `dod-*.png`. Raketens band med gästerna syns i `dod-30-raket-1-steg-*-svar.png`.

## 3. Öppet (F49)

- Hur många gäster ett rätt svar ger. Med ett baspaket (cirka 30 kuvert) och fyra raketer en lördag kan lagret ta slut. Då går gästerna utan att beställa, och det är spelarens beslut att köpa till.
- Harnessens rimliga spelare köper bara baspaketet och inga tillköp.
