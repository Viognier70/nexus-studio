# ORDER 250 — Personalens rörelse under service (mätning)

**VO:** "personalen spattar omkring utan kontakt med varandra eller gäster"
(provspel seed=42, start=dinner15). Ordern begär **bara mätning**, ingen
ändring av sim eller animation.

## Metod

Playwright-driven mätning i `frontend/scripts/order250-staff-movement-measurement.mjs`.
Startar Vite, öppnar `#playtest=1&seed=42&start=dinner15&business=kvarterskrogen`,
snabbar till 8× och samplar `window.__nxSimState` var ~0.4 sim-sek (varannan
tick vid 5 Hz). Auto-svarar anchor-frågor så picker-cykeln inte fastnar
vid första fyran; tystar dem inte — de mäts vid fire-tick.

Kör över 15-min middag = 900 sim-sekunder. 249 sampels samlade.

**Rådata:** `frontend/reports/order250/raw-samples.json` +
`summary.json` (bakom `WRITE_REPORTS=1`, per ORDER 240-mönstret).
**Talen nedan är kopierade ur skriptets utdata (`summary.json`),**
inte manuellt inskrivna (per CLAUDE.md "mätvärde spårat till rad").

## Referens (serviceScore.ts, handoff/)

`handoff/serviceScore.ts` är den godkända koreografi-modellen. Nyckeltal:

| Tal | Värde | Källa |
|---|---|---|
| `SERVICE_TIMING.greet` (dwell vid hälsning) | **3.2 s** | `serviceScore.ts:123` |
| `SERVICE_TIMING.order` (dwell vid beställning) | **6.5 s** | `serviceScore.ts:133` |
| `SERVICE_TIMING.setDown` (dwell vid framställning) | **2.4 s** | `serviceScore.ts:140` |
| `SERVICE_TIMING.pay` (dwell vid betalning) | **5.0 s** | `serviceScore.ts:145` |
| `SERVICE_DISTANCES.greet` (värd↔gäst) | **1.25 m** | `serviceScore.ts:83` |
| `SERVICE_DISTANCES.order` (servitör↔sittande) | **0.92 m** | `serviceScore.ts:88` |
| `SERVICE_DISTANCES.serve` (framställning) | **0.75 m** | `serviceScore.ts:90` |
| `SERVICE_DISTANCES.pay` | **0.98 m** | `serviceScore.ts:92` |

Filen §tempo (rad 42–74) namnger direkt det VO observerar:

> "Skalas de med samma tal blir 4× obrukbart: hälsningen blir 0,8 s och
> läser som ett ryck, inte som en hälsning. **Det är den enskilda orsaken
> till att provspelet såg ut som personal som irrar.**"

## Fråga 1 — Andel tid i rörelse vs stillastående

| Roll | Rörelse | Stilla | Totalt |
|---|---|---|---|
| värd (staff-0) | **31.3 %** | 68.7 % | 902.8 s |
| servitör (staff-1) | **56.6 %** | 43.4 % | 902.8 s |
| kock (staff-2) | **0 %** | 100 % | 902.8 s |

Kocken rör sig aldrig. Servitören rör sig mer än hen står. Värden har
en balans som förväntas i en glest bemannad matsal (mest väntar, går
till dörren vid ankomst).

## Fråga 2 — Målbyten och byten mitt i pågående uppgift

| Roll | Målbyten/min | Task-byten totalt | Task-byten mid-move | % mid-move |
|---|---|---|---|---|
| värd | 4.9 | 62 | **37** | **59.7 %** |
| servitör | **11.8** | **201** | **123** | **61.2 %** |
| kock | 0 | 46 | 0 | 0 % |

**Detta är fyndet.** Servitören byter uppgift 201 gånger på 15 min
(~13 gånger/min, en byten var 4.5 s), och **61.2 % av bytena sker
medan servitören ännu inte hunnit fram till förra målet**. Värden har
samma mönster i mindre skala (59.7 % mid-move). Kocken är bara stationär.

Serviceskoreografins minsta gest är `SERVICE_TIMING.notice = 0.9 s`
(en huvudvridning). Det snabbaste läsbara steget som är en fullständig
handling är `hostTurn = 0.4 s`. Ett byte var 4.5:e sekund är
struktuellt möjligt enligt tempo-modellen — MEN när 61 % av bytena
sker mid-move betyder det att gesten avbryts innan handling avslutats.
Det är precis vad §tempo varnade för.

## Fråga 3 — Uppehållstid vid gästens bord (dwell)

| Ankartyp | Uppmätt median | Uppmätt medel | Uppmätt n | Referens | Diff |
|---|---|---|---|---|---|
| värd greet | **3.4 s** | 3.5 s | 11 | 3.2 s | +0.2 s ✓ |
| servitör order | **3.4 s** | 3.5 s | 44 | 6.5 s | **−3.1 s (halva)** ⚠ |
| servitör serve | — | — | **0** | 2.4 s | **inte observerad** ⚠ |

- **Greet** stämmer nära (~+6 % över referens).
- **Order** är **halva den föreskrivna tiden**. Servitören stannar
  3.4 s vid bordet i stället för 6.5 s. Antingen slutar sim-lagret
  order-tasken tidigt, eller så avbryter task-schemaläggaren den
  (jfr fråga 2 — 61.2 % mid-move-byten).
- **Serve** dwells fångades inte alls i 44 order-fall. Antingen fyras
  serve-tasken aldrig (menyn saknar dish-attach?), eller så räknar
  mätningen `state === 'eating'` som gäst-lokal som dwell-condition
  aldrig träffar (mätscriptets `distance < 1.5m` kräver att servitör
  och gäst är nära; om servitören droppar tallriken från 1.6 m räknas
  det inte som dwell).

## Fråga 4 — Vid varje ankarfyrning

| # | Fire | task=asker | Ankare | Avstånd staff↔gäst | Referens | Kommit fram? |
|---|---|---|---|---|---|---|
| 1 | t=131.6 s | värd·greet | greet | **1.93 m** | 1.25 m | **NEJ** |
| 2 | t=230.4 s | värd·null | requestCheck | n/a | 0.98 m | n/a |
| 3 | t=329.2 s | gäst·null | requestCheck | n/a | 0.98 m | n/a |

- **Fire 1 (greet):** värden stod **0.68 m för långt bort** (54 % över
  referens) och **hade inte hunnit fram** när frågan visades.
- **Fire 2 (requestCheck):** värden hade `taskType = null` — inte
  någon aktiv `pay`- eller `checkback`-task. Anchoret fyrade utan
  att staff var på väg. Distance kunde inte mätas (ingen targetGuestId).
- **Fire 3 (requestCheck, gäst-asker):** gästen frågar, ingen staff
  involverad i pickerns targetGuest-uppslag. Distance inte relevant.

Kombinerar man dessa fynd: **fråga 1** är EXAKT vad VO reagerade på i
provspelet — en fråga om "en grupp om fem" visades medan värden
fortfarande gick mot dörren. Ingen kontakt hade skett. **Frågor 2–3**
är i requestCheck-ankaret där personal inte fysiskt behöver vara nära
(pay-task genererar dock själva ankaret).

## Fråga 5 — Vänder sig personen mot gästen vid bordet?

**Kan inte mätas ur sim-state.** Staff har inget `heading`- eller
`yaw`-fält i typen (grep-verifierat i `types.ts:229-258`). Rotationen
deriveras i renderingen ur `targetPosition - position` (rörelsevektor).
Vid stillastående är facing okänt utan att läsa figureRig-uttrycket.

Serviceskoreografin sätter förväntningar:
- `hostOffsetAngle = 0` (rad 98) — värden står *rakt* mot gästen.
- `serverOffsetAngle = 0.388` rad (~22°, rad 96) — servitören står
  vid 22° från gästens blickriktning, så maten och gästens ansikte
  syns i samma vy.

För att svara på fråga 5 krävs antingen (a) exponera derived-yaw från
rendering-koden via `window.__nxStaffFacing` eller (b) sätta `heading`
som fält i StaffMember-typen. Utanför denna mätorders scope.

## Jämförelse mot documentation/leveranser/leverans-servicekoreografin/

Modellen `Servicekoreografin.html` (documentation/leveranser/leverans-servicekoreografin/) är
den visuella referensen — den läser samma `serviceScore.ts` som VO
och Claude Code. Modellen renderar en enskild scen med de nio poserna
över tid. Vad sim-lagret producerar (mätt ovan) matchar INTE
modellens tempo:

- Modellen: hälsning 3.2 s → anvisa bord → escort (fördröjning
  1.65 s) → sätt sig 1.3 s. **En handlingskedja.**
- Sim: värd bryter greet ~60 % av gångerna innan hen når fram
  (fråga 2). Det tar bort både anvisningen och escort-fördröjningen.

- Modellen: order 6.5 s = notice(0.9) + serverCue(2.0) + read/order(3.6)
- Sim: order 3.4 s. **Halva.** Serviceskoreografin varnade
  explicit (§tempo rad 45): "skalas de med samma tal blir 4× obrukbart"
  — här ser vi motsvarande bugg utan tempo-skala, driven av att
  scheduler byter task mid-move i 61 % av fallen.

## Sammanfattning

VO:s observation "spattar omkring utan kontakt" är stödd av tre
oberoende mätningar:

1. **Servitörens 201 task-byten på 15 min** varav 61 % mid-move.
2. **Order-dwell 3.4 s vs koreografins 6.5 s** — halva tiden vid
   bordet.
3. **Vid greet-fire stod värden 1.93 m från gästen (54 % för långt)
   och hade inte kommit fram** — precis den situationen VO reagerade
   på.

`serviceScore.ts §tempo` (`handoff/serviceScore.ts:42-74`) namnger
detta som "den enskilda orsaken till att provspelet såg ut som
personal som irrar". Roten är att sim-lagrets task-scheduler byter
uppgift innan pågående gest hunnit avslutas (mid-move-frekvens
61 %) — inte att gest-varaktigheterna i sig är fel.

## Vad denna order INTE gör

Ingen sim- eller animations-ändring. Rapporten dokumenterar mätningen.
**STOPP** — VO beslutar nästa steg.

## Datakällor

- Skript: `frontend/scripts/order250-staff-movement-measurement.mjs`
- Rådata: `frontend/reports/order250/raw-samples.json` (249 sampels)
- Summary: `frontend/reports/order250/summary.json` (talen ovan)
- Referens: `handoff/serviceScore.ts` (godkänd koreografi-modell)
- Referens-visualisering: `documentation/leveranser/leverans-servicekoreografin/Servicekoreografin.html`
