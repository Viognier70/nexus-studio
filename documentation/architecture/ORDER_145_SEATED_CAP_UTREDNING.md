# ORDER 145 — Utredning: seated cap:ar vid 5 medan waiting når 6

**Repo** `Viognier70/nexus-studio` · **Gren** `order-145` (från `main`)
**Klass** AUTONOM · **Utredning, ingen kod ändrad**
**Datum** 2026-08-30
**Följer** ORDER 144-mätning

---

## 1. Läget

ORDER 144:s baseline/after-mätning rapporterade `max seated 5/16` medan
`max waiting 6`. Elva platser skulle stå tomma medan kön växer.

Två spår att fastställa mellan:

**(a) deriveStaffAction** — personalen väljer inte att sätta väntande
gäster (`On break`-läsningen från ORDER 124 §2a). Ingen staff kör
`seat`-tasken när kön har någon.

**(b) sätt-logiken** — vad krävs för att en gäst går från `waiting` till
`seated`, och vilket villkor faller? (`findFreeSeat` returnerar null,
`setGuestSeated` gate:as bort, seat-index-räkningen skiljer sig.)

---

## 2. Vad som mäts

Playwright loggar per tick:
- `waiting`, `seated` (både transient och `seatedIds.length`)
- lediga platser
- vad varje staff-medlem gör (`taskType`, `targetGuestId`)

20-min lunchservice, 6000 ticks à 5 Hz. Ingen kod rörs.

---

## 3. Ingen rättelse

Ordern mäter och rapporterar. Om (a) eller (b) fastställs blir rättelsen
en egen order — inte klumpas in här.

---

## 4. Definition of Done

1. Per-tick-logg incheckad i `frontend/reports/order145/tick-log.json`.
2. Rapport i `documentation/blueprints/` med slutsats om (a), (b), eller
   annan grundorsak.
3. Registerrad; not på rad 124 om utredningen påverkar dess status.
4. `git diff main..HEAD -- frontend/src/` = tomt.
5. Typecheck grön, hela sviten grön.

---

## 5. Om något inte går

Om mätningen visar att grundorsaken är varken (a) eller (b) — t.ex. att
ORDER 144:s mätsignal var fel — så säg det rakt och pröva vad det
betyder för ORDER 124.
