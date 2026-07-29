# VERTICAL_SLICE_002 — Strategic Prototype

**Version:** 0.1
**Status:** Draft — prototype only
**Owner:** Frontend / prototype
**Source of truth:** `documentation/archive/world-wp02/*` (historical WP-02 corpus), `documentation/world/APPROXIMATION_REGISTER.md` (remaining active world document), `documentation/game-design/CAMERA_AND_VIEW_SYSTEM.md`
**Related:** `VERTICAL_SLICE_001.md`

> **Note (ORDER 034 §3):** The WP-02 corpus previously at `documentation/world/*` has been archived to `documentation/archive/world-wp02/` by ORDER 034 §4 and is **historical**, not authoritative — see the archival header on each. Only `APPROXIMATION_REGISTER.md` remains at `documentation/world/` per `ADR_001_DIGITAL_TWIN_PHASE.md` §5.2. VS-002 itself is paused per `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §13.

## Purpose

Demonstrate the intended **foundational perspective** of Nexus: the player is the director of a living gastronomic enterprise, not an avatar. Prove that a single continuous world can be experienced across three spatial scales — village, district, business — with camera transitions carrying the player between kinds of decisions.

## Scope

Included:

- Continuous zoom camera with soft threshold behaviour across village (Grythyttan), district (Kvarteret), and business interior (Vinbaren) as defined in `CAMERA_AND_VIEW_SYSTEM.md`.
- Procedural low-poly Grythyttan: roads, forest, water, campus, church, hotel, café, bakery, wine bar, one available business plot.
- Ambient village flow: residents, students, visitors, a simple delivery vehicle.
- District view of the block around the wine bar with visible pedestrians choosing between neighbouring venues.
- Cutaway wine-bar interior with dining room, bar, small preparation area, storage, entrance.
- Deterministic seeded simulation of the wine bar:
  - 3 staff (one host, one server, one chef), player-adjustable to 2 or 4 via a policy panel.
  - Up to 12 potential guests active at any time.
  - Arrival flow, waiting queue, seating, service, dining, payment, departure.
- Player influences the business through **policies only**:
  - staffing size,
  - training level,
  - service concept (vardaglig / formell),
  - pricing tier,
  - seat capacity,
  - purchasing / ingredient tier,
  - sustainability choices (welcome-drink policy, local sourcing),
  - responses to strategic scenarios.
- Sustainability represented as three **operational conditions** (Ekonomisk, Social, Ekologisk) with direction + cause + consequence, not as morality bars.
- One strategic scenario (group arrives without reservation), auto-triggered once per prototype run, replayable from a development control after resolution.
- VS-01 remains reachable at `#/first-person-prototype`. VS-02 becomes the default route.

Excluded:

- No backend, database, authentication, multiplayer, Supabase, Cloudflare, or AI.
- No persistence between sessions.
- No architectural fidelity or claim on rights.
- No individual staff or guest move-orders from the player.
- No numeric HUD that dominates the interface.

## Non-goals

- **The player is not an avatar.** No first-person control anywhere in VS-02.
- **No direct move-orders.** The player never commands "walk to table 4." Player intent flows through policies and scenario decisions.
- **No stat spreadsheet.** Numeric quantities exist internally but the visible interface stays qualitative.
- **No global victory or failure condition.** VS-02 is a rehearsal for how the game reads and thinks, not a scored session.

## Simulation model

Deterministic. All randomness flows from a seeded Mulberry32 stream initialised at simulation start. The same seed and same policy inputs yield the same run.

### Clock

- Fixed 5 Hz simulation tick. Player-facing speed: 1× / 2× / 4×. Pause available.
- Sim second ≈ 200 ms real time at 1×.

### Entities

- **Staff** — role (host / server / chef), workload (0…1), current task, position.
- **Guest** — state ∈ {`arriving`, `waiting`, `seated`, `ordering`, `dining`, `paying`, `leaving`, `declined`}, satisfaction, seat index, timestamps.
- **Village residents** — ambient dots on baked splines. No individuality.
- **District pedestrians** — choose between wine bar / café / bakery based on time of day and current draw.

### Wine bar lifecycle

1. Arrivals sampled from a Poisson-like process influenced by service concept and pricing tier.
2. Arriving guest enters via entrance path.
3. If a seat is free, host greets → seats. Otherwise guest joins waiting queue up to a configured maximum.
4. Server takes order (duration modulated by training level).
5. Service arc: order → serve → optional decant / flambé flourish → dining.
6. Guest sits for dining duration modulated by service concept.
7. Guest pays and leaves. Table becomes free after clearing.

### Player-controllable policies

| Policy | Values | Effect surface |
|---|---|---|
| Staff count | 2 · 3 · 4 | Workload distribution, cost |
| Training level | 1 · 2 · 3 | Service durations, waste, satisfaction |
| Service concept | vardaglig · formell | Dining duration, pace, revenue per guest, arrival rate profile |
| Pricing tier | låg · medel · hög | Revenue per guest, arrival rate, guest tolerance for waiting |
| Seat capacity | 6 · 8 · 10 · 12 | Ceiling for concurrent seated guests |
| Ingredient tier | grund · utvald · premium | Cost, satisfaction ceiling, waste sensitivity |
| Welcome drink | av · på | Waste, social buffer during waits |
| Local sourcing | av · på | Ecological trend, cost, delivery cadence |

None of these are morality controls. Each moves the world in several directions.

### Metrics (internal)

- Revenue (per served guest).
- Cost (per sim-minute staffing + purchasing + waste penalty).
- Waste (welcome drinks not consumed, service errors).
- Rolling guest satisfaction average.
- Rolling staff workload average.
- Completion counter.

### Placeholder formulas (transparent, not tuned)

```
arrivalRate = base(serviceConcept) * priceMultiplier * timeOfDayCurve
serviceDuration = base(taskType) * (1.6 - 0.3 * trainingLevel)
guestSatisfaction = clamp(baseline + serviceQuality - waitPenalty - pressurePenalty, 0, 1)
revenuePerGuest = base(pricingTier) * ingredientMultiplier
costPerSimMinute = base(staffCount) + tier(purchasing) + waste * penalty
```

All base values are documented in `frontend/src/strategic/simulation/economics.ts`.

## Sustainability interactions

Three qualitative conditions, each showing direction, recent cause, and — where relevant — a delayed consequence. Numeric values exist internally to derive direction; they do not dominate the interface.

| Condition | Underlying signals |
|---|---|
| **Ekonomisk** | 10-min rolling revenue – cost |
| **Social** | 5-min rolling guest satisfaction, penalised by staff workload > 0.75 |
| **Ekologisk** | Waste per completed cover + ingredient tier + delivery cadence |

Each operational decision moves at least two conditions. Some effects are immediate (welcome drink → waste up now), others delayed (understaffing → satisfaction drop in 2–4 sim-min).

### Reading rules

- Directions used: `stabil`, `förbättras`, `försämras`, `kritisk`.
- Cause phrases quote the most recent operational event (e.g. "Full beläggning och hög arbetsbelastning").
- Consequence phrases appear only when the system has enough signal to project one (e.g. "Missnöje väntar om ca. 2 min").

## The judgement scenario

**"A larger group arrives without a reservation while the dining room is nearly full."**

- Triggered automatically once per prototype run at ~2 sim-minutes, if seating utilisation is over 70 % and staff workload > 0.4.
- A modal presents the situation and three responses:
  - **A. Ta emot alla direkt.** Group is seated immediately if capacity allows; overflow spawns pressure on staff.
  - **B. Be gruppen vänta och bjud på välkomstdryck.** Group joins the waiting queue; welcome drinks are poured (visible), waste rises, guest goodwill absorbs part of the wait.
  - **C. Avvisa gruppen för att skydda kvällens service.** Group turns around at the entrance and leaves. Existing guests continue normally; slight reputation dip.
- The outcome depends on:
  - staffing (count + training),
  - current workload,
  - service concept and pricing,
  - existing waiting queue length,
  - ingredient tier and welcome-drink policy.
- **No immediate results popup.** After the player picks, guests actually arrive (or don't), staff respond, and the sustainability conditions move over the following ~2 sim-minutes.
- After resolution, a small development control allows the scenario to be replayed for observation.

## Interaction with camera

The camera scale determines what the player can select and what information density is shown. Rules live in `CAMERA_AND_VIEW_SYSTEM.md`. Selection never issues movement orders.

## Non-goals (repeated for emphasis)

- No first-person avatar.
- No individual move-orders.
- No morality bars.
- No numeric-dominant HUD.
- No architectural fidelity.
- No external assets.

## Acceptance criteria

- All three view scales are reachable through continuous zoom alone.
- Roof visibility and NPC/interior density crossfade around thresholds; no popping.
- Wine bar operates without any player micromanagement of individual staff.
- Player-facing sustainability is qualitative (direction + cause + consequence) with no visible morality-bar surface.
- The scenario auto-triggers once and can be replayed via a development control after it resolves.
- The scenario unfolds visibly inside the wine bar; results are not delivered by immediate popup.
- Same seed + same policies produce the same run.
- VS-01 remains reachable at `#/first-person-prototype`.

## Explicit deferrals

- Multi-day / seasonal rhythm.
- Persistence.
- English localisation.
- Real staff/guest characters with continuity.
- Second and third player-owned businesses.
- Real economy across Grythyttan.
- Save / replay of specific runs beyond seed control.
