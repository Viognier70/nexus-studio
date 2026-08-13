# M8 playtest brief (ORDER 081)

Vision Owner reference for running the strategic-slice playthrough. Written to be read at the desk before hitting `npm run dev`, and consulted during the run. Nothing new built; this is preparation.

Companion documents:
- `M8_PERCEPTION_PUNCH_LIST.md` — the same 21 rows sorted by source milestone. Use this brief instead when running; use the punch-list when tracing back where a decision came from.
- `STRATEGIC_TRACK_MILESTONES_PROPOSAL.md` §2 — milestone DoDs.

---

## 1. How to start

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173/#playtest=1**

The `#playtest=1` flag hides the aiming crosshair + pixel-probe line 4 in the dev strip. Without it those show as diagnostic noise over the scene. The dev strip's lines 1–3 (FPS, day/period, cash, capitals, weather) stay — useful in the debrief without cluttering the frame.

**Game starts at:** name-entry overlay. Type a name, submit. Then:
- **Period:** `morning` of day 1.
- **Cash:** 120 000 SEK on the till (`INITIAL_CASH_SEK`).
- **Team:** 3 members auto-hired (värd / servitör / kock) at default competence.
- **Menu:** empty. Stock: empty. First morning task is to **compose menu + buy stock** via MorningMenuPanel (right side) before opening dinner.

---

## 2. Dev artifacts — what's on, what's off, how to toggle

| artifact | default in `#playtest=1` | how to turn on | how to turn off |
|---|---|---|---|
| Aiming crosshair (yellow cross at screen centre) | **hidden** | drop the `#playtest=1` flag | already off |
| DevPanel line 4 (`pixel(centre) R=… G=… B=…`) | **hidden** | drop the `#playtest=1` flag | already off |
| Calibration quad (grey square at screen centre) | **hidden** | append `&calibrationQuad=1` to URL | already off |
| DevPanel lines 1–3 (FPS / day-period / cash / capitals / weather) | shown | | drop DevPanel entirely by shipping a prod build |
| `Shift+C` — force a service collapse (dev shortcut) | available | already available in dev mode | not needed for judgment |
| `5` — trigger a scenario now (dev shortcut) | available | already available | not needed for judgment |
| `R` — full reset back to name entry (dev shortcut) | available | already available | not needed for judgment |
| Season toggle `H`, scale reference `G` | available | | ignore during playtest |

If judgment tips one way and you want to re-check something with the diagnostics on, drop the flag and reload — no state persists across reloads today.

---

## 3. The checklist, in the order you'll see things

Grouped by game flow: **morning → prep → service → evening → across the whole run**. Every row: one thing to look at, one line for what counts as OK. 21 items total (bundled from the M8 punch-list). Rows blocked pending M7b (the bank meeting scene) are marked `— skip` in §4 so you know what NOT to look for.

### A. Morning (day starts here)

| # | look at | passes if |
|---|---|---|
| A1 | **The morning panel row** (Team / Investment / Scale-down / Activities / Menu). Overlap? Text hidden underneath other panels? | Everything readable without shifting the eye or moving a panel; each surface holds one thing (ORDER 050 Add A §6.3). |
| A2 | **MorningMenuPanel — supplier + ingredient dropdowns** (ORDER 051 §8 #1). Read three or four supplier choices before buying. | Choosing a supplier feels like a trade-off, not a quality dial with different names on it. Wholesaler being cheap + reliable is a real argument against local-veg being expensive + occasionally short. |
| A3 | **MorningMenuPanel — compose the menu.** Pick 4–6 dishes, set prices deliberately. Try one dish at ~1.5× its suggested price. | Setting the price feels like a bet (ORDER 051 §8 #2). You should think "will they still order this?" — that thought is the mechanic firing. |
| A4 | **InvestmentPanel** — set trainingLevel / pricing / ingredientTier as a morning decision, not an afterthought. | The three dials read as an intentional morning decision (ORDER 046 §6 #2). |

### B. Prep + doors open

| # | look at | passes if |
|---|---|---|
| B1 | **PrepPanel** appears the moment dinner starts. Five items: ice, napkins, cutlery, stations, garnish. | Five concrete items with per-item readiness bars, not one aggregate percentage (M5 DoD 1). |
| B2 | **After-countdown line** in the stream at the door-open moment. | Exactly one line appears saying "Doors open — …" (plain register), with a wording that reflects prep readiness (M5 DoD 3 / ORDER 052 §6). |

### C. Service (dinner in progress)

| # | look at | passes if |
|---|---|---|
| C1 | **Staff pucks in the room — colour ring around each puck.** | Ring reads green / amber / red at a glance without opening a panel (M5 DoD 2). Colour reflects room load: calm=green, chased=red. |
| C2 | **Instruments panel** (top-right area — quality readings + revenue split). | Reading how the evening is going without reading every stream line (ORDER 047 §9 #1). |
| C3 | **Event stream panel** (right side, holds up to 4 recent lines). | Panel is the size of its contents — not a wall of empty rectangle for one line (ORDER 047 §9 #2, M5 DoD 4). |
| C4 | **Stream lines that fire when a scenario resolves or something goes wrong.** Look for a butter-knife-style line (symptom + cause). | Consequence lines name a specific condition, not just the symptom (M6b DoDs 1 + 2). Example: "the ice was thin" rather than "a drink was late". |
| C5 | **PlatesRemainingPanel** — top-left, updates live as guests order. | Watching plates run down is worth watching — the number falling reads as service happening, not decoration (ORDER 051 §8 #3). |
| C6 | **When a scenario fires and you answer it**, check for a visible movement in an instrument bar, rep bar, or capital. | Your answer produces something you can trace to it (ORDER 047 §9 #4). |
| C7 | **When a scenario fires and it carries a professional question**, read the question overlay + answer. | The question reads as real (ORDER 049 §8 #2) — answerable from professional knowledge, source shown. Correct answer produces a positive stream line at t+4s. Only 3 of 6 scenarios currently carry questions and they're all `chef`-sender-tagged (M7c will add sommelier / värd / servitör). |
| C8 | **Force a run-out** to see substitute / walkout: buy only 1 game portion, put game-plate on the menu, run the service. | Guest wanted the dish; either "kitchen substituted X" (30%) or "guest left — no X tonight" (70%). Stream line names both the dish and the outcome (ORDER 051 §8 #4, closed autonomously by M4a but the read is at M8). |
| C9 | **Force a collapse:** hire only 2 staff on day 3 morning + skip prep + open dinner. Or use `Shift+C` during a service. | Collapse reads as a consequence — you can name why (thin team, missing role, strained load), not "the game rolled a die" (ORDER 047 §9 #6 / ORDER 046 §6 #1). |

### D. Evening (period-end, evening account panel)

| # | look at | passes if |
|---|---|---|
| D1 | **EveningAccountPanel** — the paragraph in the observer's voice. | The evening reads back to you in a voice you recognise — not a table, not a stat block (ORDER 046 §6 #3). |
| D2 | **Same panel**, look for a morning-policy line naming what you changed at breakfast. | Morning investment recognisable in the evening (ORDER 047 §9 #5). |
| D3 | **Same panel**, look for the "Today you picked" activity line naming today's picks. | Activities picked read through to evening (M2 DoD 3). |
| D4 | **Ledger table below the paragraph** — every money mover named. | You can answer "where did the money go" from this table alone (ORDER 050 §8 #5). |
| D5 | **Ecological reading** (in InstrumentsPanel or PlayerPanel). Compare against what you actually did today. | The reading points at something you actually did — sourced from `organic` today? reading lifted (ORDER 051 §8 #5). |
| D6 | **Morning planning vs evening outcome** — recall the morning menu + supplier picks; check the evening's ledger + paragraph. | The two feel like the same decision, seen twice (ORDER 051 §8 #6). |

### E. Across the whole run (day 3 debrief)

| # | look at | passes if |
|---|---|---|
| E1 | **A dinner where several scenarios fired.** Were they different in feel, not just different in label? | Service carried several *different* scenarios (ORDER 047 §9 #3). Same opener twice within a service is a fail. |
| E2 | **Trace three consecutive stream events back to one cause chain.** Pick a red rhythm moment or a stock-out and read backwards. | The chain is legible (M5 DoD 2, ORDER 052 §10 #5). Short prep produces running about you can see. |
| E3 | **Debrief question:** what would you do differently on day 4? | You can articulate at least one specific change — a supplier swap, a price shift, a menu drop, a hire (M1 DoD 4). Silence or "not sure" is a fail. |

---

## 4. Rows to skip until M7b lands

The **bank-meeting scene** (M7b) is blocked pending the ORDER 049 §7 step 8 answer-to-loan-mapping report. Until that lands, five perception items from `M8_PERCEPTION_PUNCH_LIST.md` are unreachable in a playthrough — don't waste attention on them:

1. **Punch-list row 15** — *"Investing in an area produced a question from that area."* Needs multi-role bank (M7c) + the bank meeting to draw questions weighted by application.
2. **Punch-list row 17** — *"Readiness explained an outcome you couldn't have explained before."* Depends on the bank-meeting scene's readiness display (ORDER 049 §4).
3. **Punch-list row 18** — *"Losing the restaurant felt like a consequence; returning to school felt like the way back."* Bankruptcy return loop routes through the bank meeting.
4. **Punch-list row 19** — *"The moments where something was at stake felt like moments."* Same — the biggest such moment is the bank meeting itself.
5. **Punch-list row 16** — *"The question was real."* Partially reachable now via in-service chef questions (item C7 above); the bank-meeting-scale version of "real" is the M7b version. The C7 read still counts as evidence.

**Net: skip rows 15, 17, 18, 19 outright. Item 16 partially covered by C7.**

---

## 5. How many days to play

**Recommendation: 3 days minimum, 5 days to be thorough.**

- **Day 1** — normal shakedown. Compose menu, buy stock reasonably, open dinner, let the loop play out. Answer scenarios as they land. This gets you A1–A4, B1–B2, C1–C7 (except C8 + C9), D1–D6.
- **Day 2** — try one deliberate over-price (1.5× suggested on one dish) and one deliberate under-buy (buy 1 unit of an ingredient a dish needs). Gets you C5's real drop, C8 (substitute + walkout), and some E1 scenario variety.
- **Day 3** — the failure day. Fire two staff back to 2 members, don't SET_POLICY at all, open dinner with a full expected load. Gets you C9 (collapse should fire from thin team + strain), and D1's collapsed-branch evening account. Also gives you E1's "different scenarios" if the RNG cooperates.
- **Days 4–5** (optional) — replay of the parts that felt off. Also gives more scenario diversity if day 1–3 only fired two of the three scenario types.

If a specific item didn't fire in 3 days, force it:
- **Collapse (C9):** `Shift+C` during any active service (dev shortcut).
- **Scenario fire (C6/C7):** `5` during a service triggers the next scenario immediately.
- **Substitute/walkout (C8):** the underbuy-recipe trick from day 2.
- **Bank-meeting-tier items (§4 rows 15/17/18/19):** cannot force; wait for M7b.

Time estimate at default 2× speed: one full sim-day ≈ 8–12 minutes of wall-clock time (opening 10 s + prep 60 s + 15-min service = 900 s / 2× = 450 s ≈ 7.5 min, plus morning + evening pause). 3 days ≈ 25–35 minutes plus debrief. 5 days ≈ 45–60 minutes.

Speed toggles (top-right): 1× / 2× / 4×. Sit at 2× default. 4× useful for the between-service periods; 1× useful during a scenario answer so the question overlay doesn't feel rushed.

---

## 6. What NOT to fix mid-playthrough

If something reads wrong (a price feels off, a paragraph's wording is stiff, a colour reads muddy):
- **Don't restart.** Note it. The whole point of M8 is that you sit through the reading and let the feel accumulate.
- **Don't dev-shortcut past it.** The friction is the data.
- **Do** open a text file after the run and write the sightings — one line per fail with the row number from §3.

Two passes is normal — first pass surfaces adjustments (colour thresholds, sentence-bank wording, panel positioning), subsequent pass verifies whether the adjustments landed.

Under the M8 punch-list bundling, ~18 distinct checks × two passes × 30–45 min per pass ≈ ~2 hours of concentrated M8 time before sign-off. If the first pass shows more than ~4 rows failing, expect a third pass after fixes.
