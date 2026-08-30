# ORDER 145 — Utredning: varför seated cap:ar vid 5 medan waiting når 6

**Utfärdad** 2026-08-30
**Klass** AUTONOM · Utredning, ingen kod ändrad
**Gren** `order-145` (från `main`)
**Följer** ORDER 144-mätning; svarar också på ORDER 124-öppna observation

---

## 0. Rakt svar

**Ingen av de två spåren håller. Premissen faller på fel mätsignal.**

- **Verklig max upptagna platser: 16/16** (via `state.seatedIds.length`)
- **Verklig max kö: 6** (`state.waitingIds.length`)
- **Ticks där waiting > 0 OCH plats finns: 0**

Kön uppstår **endast** när alla 16 platser är fyllda, och töms omedelbart när plats blir ledig. Sim-lagret uppfyller kontraktet.

**Grundorsak till felaktig diagnos:** ORDER 144:s mätning räknade `guests.filter(g.state === 'seated').length` — som är **transient** enligt `service.ts:243`: `if (guest.state === 'seated' && now - guest.stateTime > 4) { guest.state = 'ordering'; }`. Tillståndet `seated` stannar i **4 sim-sekunder** innan gästen växlar till `ordering`. Sedan `dining`, `paying`. Alla fyra tillstånd innebär att gästen sitter vid bord.

Den samlade räkningen (`state='seated' OR 'ordering' OR 'dining' OR 'paying'`) — eller den enklare `state.seatedIds.length` — visar det verkliga antalet sittande gäster.

---

## 1. Metod

`frontend/scripts/order145-seated-cap-audit.mjs` — playwright kör 20-min lunchservice (6000 ticks à 5 Hz, batch 25 per `page.evaluate`), loggar per tick:
- `state.simTime`, `state.day.period`
- `state.policies.capacity` (kapacitetsplafond)
- `state.seatedIds.length` (verkligen upptagna platser)
- `state.waitingIds.length` (verkligen väntande i kö)
- `state.guests` grouperade på `state` (transient-räkning)
- Per staff-medlem: `taskType`, `targetGuestId`, `workload`

Rapport i `frontend/reports/order145/tick-log.json`.

---

## 2. Resultat

### 2.1 Toppvärden

| Signal | Max under 20-min-servicen |
|---|---:|
| `seatedIds.length` (upptagna) | **16/16** |
| `waitingIds.length` (kö) | 6 |
| Ticks (av 240 samples) med waiting > 0 | 25 |
| Ticks med seatedIds = capacity | 31 |
| **Ticks med waiting > 0 OCH freeSeats > 0** | **0** |

### 2.2 Vad personalen gör när waiting > 0

25 ticks × 3 staff = 75 staff-observationer när kön har någon:

| taskType | Antal |
|---|---:|
| order | 45 |
| checkback | 24 |
| idle | 6 |

**Ingen `greet` eller `seat`** — vilket är rätt: eftersom `seatedIds = 16` när kön uppstår, finns ingen ledig plats att sätta väntande gästen på. Personalen betjänar de sittande.

`idle` = `taskType === null`. 6 av 75 (~8 %) = normal transitionstid mellan tasks, inte "On break"-läsning.

---

## 3. Spår (a): deriveStaffAction / On break-läsningen

**Faller inte in.** När waiting > 0 är personalen antingen:
- I `order` (44/75) — betjänar sittande gäst
- I `checkback` (24/75) — tillsyn av dining-gäst
- I `idle` = null (6/75) — kort mellan tasks

Ingen personal är i "greet" eller "seat" när kön har någon — för att alla 16 platser är fyllda. Det är korrekt beteende.

`deriveStaffAction` (som ORDER 124 §2a föreslog kunde vara "trubbig") är inte inblandad — findTaskTarget för `greet`/`seat` returnerar null när ingen arriving-gäst har `moveProgress >= 1`, och det gör den rätt eftersom sätt-vägen är oberoende (se §4).

---

## 4. Spår (b): sätt-logiken

**Faller inte in.** Läs `service.ts:220-241` waiting-branchen av `tickGuests`:

```ts
if (guest.state === 'waiting') {
  const drop = 0.02 * TICK_SECONDS;
  guest.satisfaction = Math.max(0, guest.satisfaction - drop);
  const seat = findFreeSeat(state, guest.scenarioSource);
  if (seat !== null) {
    state.waitingIds = state.waitingIds.filter((id) => id !== guest.id);
    setGuestSeated(state, guest, seat);
  } else if (now - guest.stateTime > 90 && guest.satisfaction < 0.2) {
    // give up
  }
}
```

Väntande gäst går själv från `waiting` till `seated` så fort `findFreeSeat` returnerar ett värde. **Ingen staff-task behövs.** `findFreeSeat` (rad 118-149) itererar över `SEATS_DEFAULT` = [0..15] och returnerar första som (a) inte är över cap och (b) inte är taken. Det ger null endast när ALLA 16 platser är fyllda — precis vad mätningen visar.

`setGuestSeated` (rad 361) tilldelar seatIndex + pushar till seatedIds + sätter state='seated'. Ingen felkälla.

---

## 5. Slutsats

**Sim-lagret uppfyller kontraktet.** Kön töms omedelbart när plats blir ledig; alla 16 platser fylls under normal lunchservice.

**ORDER 145:s premiss (från ORDER 144-tabellen) var felaktig.** ORDER 144-mätningen `max seated 5/16` mätte den transienta `state='seated'`-räkningen, inte den verkliga upptagen-räkningen. Faktiskt max = 16/16.

**Rekommendation för framtida mätningar:** använd `state.seatedIds.length` (eller kombinationen `state='seated' + 'ordering' + 'dining' + 'paying'`) för att räkna sittande gäster. `state='seated'` ensamt är transient (4 sim-sek) och representerar bara ögonblicket mellan seat-completion och första order.

---

## 6. Konsekvens för ORDER 124

**ORDER 124:s dev-observation "seated=0/16" bör ånyo prövas** med samma signalfråga i åtanke. Om observatören läste `guests.filter(g.state === 'seated').length` (som `deriveFaces` gör för `staffAction` och som playwright-scriptet i ORDER 144 gjorde) — kan `seated=0` betyda:

- Alla gäster är faktiskt i `ordering`/`dining`/`paying` (dvs sitter men i annan sub-state), och `seated`-tillståndet råkade vara tomt vid det observationstillfället — **normal drift, inte fel**
- ELLER ingen gäst har någonsin nått bord (skulle vara ett verkligt fel)

Skillnaden avgörs av att också läsa `state.seatedIds.length`. ORDER 124 §1-observationen registrerar bara `seated=0/16`, inte `seatedIds`.

ORDER 124-raden uppdateras med rekommendationen att nästa dev-observation loggar båda signalerna innan grundorsak fastställs.

---

## 7. Vad ORDER 145 INTE gör

- Ingen kod ändrad (`git diff main..HEAD -- frontend/src/` = tomt)
- Ingen ny test tillagd (mätning är .mjs-script, inte vitest)
- Inget värde justerat
- `deriveStaffAction`, `findFreeSeat`, `tickGuests`, `deriveFaces` — alla orörda

---

## 8. Filer

- `documentation/architecture/ORDER_145_SEATED_CAP_UTREDNING.md` — orderfilen
- `documentation/blueprints/ORDER_145_SEATED_CAP_UTREDNING.md` — denna rapport
- `frontend/scripts/order145-seated-cap-audit.mjs` — mätskript, körbart
- `frontend/reports/order145/tick-log.json` — full data (240 samples × capacity/seatedIds/waitingIds/stateCount/staff)
- Registerrad 145 + not på rad 124 (rekommendation om signalfråga)
