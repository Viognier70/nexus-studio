# ORDER 045 — The Opening Image

**Version:** 1.0 (retrospective — see §0 provenance note)
**Status:** Executed 2026-08-08 (built from Vision Owner conversation over 3 exchanges without prior order text). Awaiting Vision Owner approval of this retrospective document.
**Class:** Sprint order — production (precedence level 7)
**Parent:** `ORDER_043_CAPITAL_WAGER_AND_CONSEQUENCE_CHAIN.md` (Addendum A — the service event stream); `ORDER_044_THE_VILLAGE_MADE_LEGIBLE.md` §3
**Registry:** registered in `ORDER_REGISTRY.md` after execution, per Vision Owner instruction 2026-08-08 ("Den byggdes ur samtal utan order, och registret ska stämma med koden")
**Recipient:** Claude Code

---

## 0. Provenance note (retrospective)

This order was built without a prior document. Three Vision Owner instructions on 2026-08-08, delivered as chat turns during the ORDER 044 execution, specified in order:

1. **Opening image before mise en place** (weather, temperature, wind, outdoor viability, count waiting outside; 10-second countdown; then prep phase). Weather to affect the simulation measurably. Waiting count derived from reputation. Staff to move faster during prep. Weather readable in the wager.
2. **Outer-world factors expansion** — konjunktur, vägarbeten, säsong, evenemang — affecting the simulation measurably, not merely described. Rarity requirement: "Tre faktorer före varje service blir tapet." Report rarity + affected quantities before building.
3. **Rarity approval — Option A** (independent Bernoulli, ~63 % of services quiet).

The mechanics landed in commits `b25231e`, `39ed5b3`, `34a290a`, `7ac1bf7` on branch `order-044`. The Vision Owner then instructed: "Skriv sedan ORDER 045 som ett dokument i efterhand." This document is that retrospective. **Nothing here is speculative.** Every constant, every multiplier, every rate cited below is what is in the code on the branch; the parts that are still open (§9 acceptance) are marked as such.

**Consequence for the class system.** This is an "Own document" per the registry legend, authored *after* the executed commits rather than *before* them. Recorded in the registry so the number cannot be silently reused and so the code has a document to answer to.

---

## 1. Why this order exists

ORDER 043 built the day (opening the doors, mise en place, service, close). ORDER 044 made the room legible. In between, the sim's OPEN_SERVICE was a hard cut: player picks a length, prep starts, guests arrive. Two things were missing.

**The evening had no character before it started.** Every service played out the same shape — the only difference between an evening was the seed that governed downstream rolls. No wind, no cold night, no "the town is empty because everyone is at the hockey match." The world outside the door was invisible until the door opened, and even then only the arrival rate carried it.

**The wager had no context.** A stake on social capital reads the same whether the staff are strong or thin — the player had no way to see "this evening the team is undermanned and it's a warm still night, so the risk is different." The wager needed the weather.

This order builds the pre-service reading: what the evening *is* before it starts, and how the outside world nudges what happens inside.

---

## 2. The opening image

### 2.1 Sequence

`OPEN_SERVICE` from morning or afternoon now sets three timestamps on `day`:

- `openingEndsAt = simTime + 10` — the briefing panel is up for ten seconds.
- `prepEndsAt = simTime + 10 + 120` — mise en place runs for two minutes after the briefing.
- `doorsOpenedThisService = false` — flips to `true` the tick prep closes and never again this service.

Guests do not arrive during opening or prep. Scenario schedule is shifted by (opening + prep) so no scenario fires while the doors are still closed. The waiting-at-opening guests spawn exactly once at `prepEndsAt` (see §4).

### 2.2 What the panel shows

A centre-of-screen overlay for exactly 10 seconds, then closed:

- **Weather line.** `14°C, vind 3.2 m/s, uppehåll, halvklart.`
- **Outdoor terrace status.** One line — viable, or explicitly closed.
- **Any active outer-world factors.** Zero, one or two lines with label + one-sentence body. Most evenings this block is empty (§3.1).
- **Waiting-outside count.** "3 personer står redan utanför dörren." — or "Ingen står utanför ännu." for a bad evening.
- **Countdown.** "Dörrarna öppnar om Ns" at the bottom, decrementing per tick.

No numeric HUD elsewhere on screen changes during the opening. Per `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §11, the panel is the only surface carrying numbers.

### 2.3 Staff during opening

Nothing yet — the opening is a **briefing moment**, not staff activity. Staff pucks sit at their home stations for the 10-second window. The prep-tempo boost (§5.2) begins the moment opening closes.

---

## 3. The weather

### 3.1 Generation

Deterministic per rng state, generated at `OPEN_SERVICE`. Cycle-1 season is late-summer / early-autumn Grythyttan; a future order can add a calendar and per-season bands. Weighted distributions:

| Axis | Bands (min–max, weight) |
|---|---|
| Temperature (°C) | 6–9 w=1, 10–13 w=3, 14–17 w=4, 18–21 w=2 |
| Wind (m/s) | 0.5–2.0 w=4, 2.0–5.5 w=4, 5.5–10.0 w=2 |
| Precipitation | none w=7, drizzle w=2, rain w=1 |
| Cloud cover | clear w=3, partly w=4, overcast w=3 |

Snow deferred until a real calendar exists.

### 3.2 Mechanical effect

`weatherArrivalMultiplier(w)` composes multiplicatively into `arrivalProbability`:

```
tempMult   = 0.75 + ((tempC - 6) / 15) * 0.45          // 0.75× at 6 °C → 1.20× at 21 °C
windMult   = 1.0 - ((windMS - 0.5) / 9.5) * 0.25        // 1.0× at 0.5 m/s → 0.75× at 10 m/s
precipMult = { none: 1.0, drizzle: 0.9, rain: 0.75, snow: 0.65 }
weatherMult = tempMult × windMult × precipMult
```

Endpoints:
- Warm still clear: ~**1.28×**
- Baseline (mid): ~**1.00×**
- Cold windy drizzle: ~**0.55×**

Weather does not otherwise touch capital or reputation directly — its effect enters the loop through arrivals and the derived waiting count (§4).

### 3.3 Outdoor terrace viability

`isOutdoorViable(tempC, windMS, precipitation)`:
- `precipitation !== 'none'` → false
- `tempC < 14` → false
- `windMS > 5.5` → false
- otherwise → true

Rendered as a single Swedish sentence in the opening panel. No mechanical effect on arrivals or capacity in cycle 1 — its role is a reading cue for the player ("I'd stake differently on an outdoor-viable evening").

---

## 4. Waiting-at-opening

Guests already outside when the doors are about to open, derived at `OPEN_SERVICE`:

```
baseWaiting = min(6, max(0, round(8 × clamp01(reputation) × weatherArrivalMultiplier(weather))))
finalWaiting = min(6, round(baseWaiting × worldFactorWaitingMultiplier(worldFactors)))
```

The 8-guest scaling was chosen so a strong reputation (1.0) on ideal weather produces a small standing queue (6, capped); a weak reputation (0.1) usually produces 0 or 1.

**When they spawn.** Not immediately. The count is stored on `day.waitingAtOpening` while opening + prep run. At the moment `simTime >= prepEndsAt` (doors open), the reducer spawns exactly that many guests as arrivals — each rolled independently for walk-away per current economic capital. `doorsOpenedThisService` is set true to guarantee this fires once per service.

The reading in the room is: doors open, and a small crowd is already on the arrival arc, walking in. On a bad night, no one is there.

---

## 5. Outer-world factors

### 5.1 Rarity — Option A (Vision Owner approved 2026-08-08)

Independent per-service Bernoulli rolls at OPEN_SERVICE:

| Factor | Fire rate | Realisations |
|---|---:|---|
| Konjunktur | 8 % | uppgång 50 % / nedgång 50 % |
| Vägarbeten | 10 % | single realisation |
| Säsong | 12 % | turism 55 % / semestervecka 45 % |
| Evenemang | 17 % | festival 60 % / hockey 40 % |

Distribution over 1000 seeds (test-verified):

| Factors per service | Rate |
|---:|---:|
| 0 | ~63 % |
| 1 | ~31 % |
| 2 | ~5 % |
| 3+ | <1 % |

Vision Owner's "not wallpaper" invariant is the <2 % rate for 3+ factors — pinned as a test in `worldFactors.test.ts`.

### 5.2 Multipliers

Every knob is a scalar composed multiplicatively into an existing computation. No new capital layer, no new event category. Missing knob → 1.0.

| Factor (kind) | arrival | waiting | revenue | delivery |
|---|---:|---:|---:|---:|
| `konjunktur_uppgang` | 1.10 | 1.15 | 1.10 | 1.00 |
| `konjunktur_nedgang` | 0.85 | 0.70 | 0.85 | 1.00 |
| `vagarbeten` | 0.75 | 0.50 | 1.00 | 1.40 |
| `sasong_turism` | 1.15 | 1.20 | 1.00 | 1.00 |
| `sasong_semester` | 0.70 | 0.50 | 1.00 | 1.00 |
| `evenemang_festival` | 1.15 | 1.60 | 1.05 | 1.00 |
| `evenemang_hockey` | 1.05 | 1.30 | 0.90 | 1.00 |

Compositional rules:
- `arrival` multiplies into `arrivalProbability` alongside period / economic / reputation / weather / rhythm.
- `waiting` multiplies into `waitingAtOpening` after the reputation × weather derivation, capped again at 6.
- `revenue` multiplies `revenuePerGuest(policies)` at the payment tick.
- `delivery` multiplies the ecological cooldown base — vägarbeten stretches the van's absence from ~60 s to ~84 s.

### 5.3 What is NOT built this pass

- **Gästmix as guest-side data.** No `guest.tier` or `guest.type` field. The "casual crowd" character of a hockey factor reads through `revenue: 0.90`, not through a per-guest type.
- **Correlated factors.** Each factor rolls independently. A recession affecting local hockey attendance would need a joint model.
- **Multi-service persistence.** Each factor is per-service. A three-day roadwork event is a follow-up order.

### 5.4 Player-facing text

Per realisation, one label + one body line, both Swedish. Committed in `simulation/worldFactors.ts` as `FACTOR_LABEL` / `FACTOR_BODY` (not in `strings.sv.ts` because they are tightly coupled to the mechanic — moving them would decouple the text from the multiplier table).

Rendered in the opening panel below the weather line. A future order may echo one into the ambient stream 30–60 s into service so the player sees the reason for what the room is doing; not built this pass.

---

## 6. Weather in the wager

Vision Owner 2026-08-08: *"en varm kväll med tunn bemanning är en annan risk än en kall."*

`WagerPanel` renders a small tail line under the capital buttons whenever a service is running:

```
Kvällen: 14°C, vind 3.2 m/s, uppehåll — konjunktur uppgang
```

Weather is always shown; world-factor names are appended when active. No numeric multiplier is exposed — the player reads *cold + windy + hockey crowd* against a *thin team* and stakes accordingly. This is the reading the wager was missing.

---

## 7. Staff prep tempo

Vision Owner 2026-08-08: *"Personalen rör sig för långsamt under prep — de ska arbeta, inte driva. Höj takten under förberedelsen och låt den falla när rummet är klart."*

During the prep window (opening closed, `prepEndsAt` set, `simTime < prepEndsAt`), `InteriorStaff` multiplies three animation parameters:

| Parameter | Service default | Prep boost | Reads as |
|---|---|---|---|
| Pace | 1.4 m/s | ×1.8 → 2.52 m/s | crossing the floor with intent |
| Drift amplitude | 0.5 m | ×3 → 1.5 m | visibly leaving the station, not idling at it |
| Drift frequency | 0.4 Hz | ~×2.75 → 1.1 Hz | a purposeful working cadence, not a drift |

The boost falls back the moment prep closes. Load-based pull-into-the-room (§044 §3.2) then takes over for service.

No state change — the boost is a pure per-frame rendering shift. Nothing to test in vitest; the reading is checked in-scene.

---

## 8. What this order does not do

- **No mode-picker weather.** The Vision Owner never chooses the evening. Weather is generated deterministically per seed, same as the scenario chain.
- **No dynamic weather during service.** The weather record is fixed at `OPEN_SERVICE` and does not change until close. A sudden storm mid-service is a later order.
- **No calendar or seasonality.** All seeds sample from the same autumn bands. A future order should add a `day.season` field and per-season bands.
- **No visual weather in the 3D scene.** No rain particles, no wind on trees, no sky colour shift. The reading is text — the opening panel, the DevPanel line, and the WagerPanel tail. Per `ORDER_044` §4, no material or finish work until §11 of ORDER 043 is answered.
- **No world-factor scenarios.** A vägarbete does not become a scenario; it only shifts the multipliers. A future order could add "the road was closed, a supplier can't arrive — do you accept a substitution?"
- **No collapse trigger from weather.** A cold-windy-recession evening does not cause a §6 collapse. Collapse remains an ORDER 043 §6 concern gated by staffing failures.

---

## 9. Acceptance

This order is complete when the Vision Owner can play a service and report:

1. **The opening panel reads the evening.** They can name the weather, know whether the terrace is open, and see how many people are outside — from the panel alone, before the countdown finishes.
2. **The weather is felt in the room.** A cold windy drizzle evening visibly thins the arrival stream compared to a warm still clear one on the same seed sequence.
3. **World factors are rare enough to matter.** After 20 services, they can name 1–2 memorable factor evenings but do not feel the outer world is constantly reporting in.
4. **The wager reads against the evening.** They stake differently on a warm night with a thin team than on the same team with a cold rainy night.
5. **Staff are visibly working during prep.** The two-minute mise en place window shows pucks crossing stations, not drifting at them.

Acceptance criteria 3 and 4 are the loop-shaping requirements — the others are single-service reads.

---

## 10. Implementation record

Landed on branch `order-044` in 4 commits (order-044 PR #9, merged pending):

- `b25231e` — weather model + arrival mult + waiting-at-opening + opening phase mechanic + doors-open guest spawn
- `39ed5b3` — outer-world factors (types, generation, multipliers, integration, tests)
- `34a290a` — OpeningPanel UI + Swedish text + DevPanel weather line + WagerPanel weather tail
- `7ac1bf7` — staff prep-tempo boost

Files added:
- `frontend/src/strategic/simulation/weather.ts`
- `frontend/src/strategic/simulation/worldFactors.ts`
- `frontend/src/strategic/scenario/OpeningPanel.tsx`
- `frontend/src/strategic/simulation/__tests__/weather.test.ts`
- `frontend/src/strategic/simulation/__tests__/worldFactors.test.ts`

Files modified:
- `frontend/src/strategic/types.ts` — `WeatherConditions`, `PrecipitationKind`, `CloudCover`, `WorldFactorKind`, `ActiveWorldFactor`, `DayState` extensions
- `frontend/src/strategic/simulation/model.ts` — `initialDay` extension
- `frontend/src/strategic/simulation/reducer.ts` — `openService` weather+factors generation, opening→prep→doors-open transitions, revenue + delivery cooldown multipliers, waiting-at-opening spawn
- `frontend/src/strategic/simulation/arrivals.ts` — arrival multiplier composition with weather + world factors, opening/prep gate
- `frontend/src/content/strings.sv.ts` — `opening` + `wager.weatherPrefix` blocks
- `frontend/src/strategic/ui/DevPanel.tsx` — third line with weather + waiting + factor kinds
- `frontend/src/strategic/scenario/WagerPanel.tsx` — weather tail line
- `frontend/src/strategic/scene/InteriorStaff.tsx` — prep-tempo boost
- `frontend/src/strategic/StrategicApp.tsx` — OpeningPanel mount

Tests: 39 new invariants across `weather.test.ts` (22) + `worldFactors.test.ts` (17). Total suite 291 passing. Typecheck green.

---

## 11. What this order is for

The service now has a curtain-rise moment. What the evening *is* — weather, factors, standing crowd — reads in ten seconds, and then the doors open onto a two-minute mise en place where the team is visibly working. The wager, when it comes, reads against something. A cold windy evening with a thin team is now a different bet than a warm still one with the same team.

None of this changes what the game rewards — no new capital, no new scenario, no new response to a scenario. It changes what the player has to look at before they answer the questions the game already asks.
