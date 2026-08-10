# ORDER 050 — Activities and the Ledger

**Version:** 1.0
**Status:** Awaiting Vision Owner approval. Not in force until approved.
**Class:** Sprint order — production (precedence level 7)
**Parent:** `ORDER_043_CAPITAL_WAGER_AND_CONSEQUENCE_CHAIN.md` §4; `ORDER_049_THE_KNOWLEDGE_ENGINE.md` §5.2
**Registry:** register in `ORDER_REGISTRY.md` before execution
**Recipient:** Claude Code

---

## 1. Why this order exists

The Vision Owner played the built cycle on 2026-08-09 and reported three things:

> The view is not UX-optimised. The logic and how it is communicated is extremely unclear. And still — what does *"stake on social sustainability"* actually mean?

The third is the real finding, and it names a design error that has stood since ORDER 043 §4.

**"Stake on social" is an abstraction. "Hire a trained sommelier" is an action.**

The comparison that exposed it was the Vision Owner's own `Gastronoma`, where the player picks *Anställ sommelier/utbildad personal* and sees `−5 economic · +25 social · +5 ecological`. The connection between the action and the three sustainabilities is **visible but not spelled out** — and learning to read that connection *is the learning*. That a staff dinner builds social capital while costing money is knowledge about running a business.

Nexus skipped the whole limb. The player stakes directly on an abstract category, and the game's central pedagogical moment disappears with it.

It is also internally inconsistent: the investment panel already offers concrete choices — training level, pricing, ingredient tier — while the wager panel offers three nouns.

**This order replaces the abstraction with activities, and gives the money a ledger.**

---

## 2. Investments are activities

The player never chooses a sustainability. They choose something a restaurateur would actually do, and each activity shows what it costs and what it builds — in all three dimensions, on the card, before the choice.

The sustainabilities become **the reading**, never the input.

### 2.1 The activity set

Build a broad set — far more than the six that fit on one screen — so that no two mornings offer the same slate and the player must actually weigh what this business needs now. Cover at least these families:

- **People** — hire by role, training days, staff dinner, raise wages, bring in a specialist for a period
- **Sourcing** — organic produce, local suppliers, a better fish supplier, seasonal contract, certification (KRAV/Svanen)
- **The room** — refurbish the dining room, better lighting, acoustics, new tableware, terrace furniture
- **Drink** — invest in the cellar, a wider by-the-glass list, non-alcoholic programme, sommelier training
- **Reach** — press and marketing, a guide submission, a collaboration with the campus, an event evening
- **Operations** — new kitchen equipment, a dishwasher that keeps up, waste handling, energy efficiency
- **Knowledge** — subscribe to research, send someone to a course, a study visit

Report the full list with its three-column effects before building it. Each activity needs a one-line description in the observer's register — what it does and what it costs you — not a marketing line.

### 2.2 The player allocates

**The player decides how resources are distributed**, as in the Vision Owner's other games. Not a single pick: a slate of available activities, a budget, and a choice about how to spread it.

Report the shape: fixed cost per activity with a cap on how many, or a divisible budget the player apportions. The first is legible, the second is a truer management decision. They can be combined — fixed-cost activities plus a discretionary remainder.

**What is not invested in decays.** This is already in `ORDER 049` §2.1 for the enabler tallies; extend the same logic here so passivity has a cost.

---

## 3. Money is money

Economic capital stops being an abstract score. **It is kronor, and it is the restaurant's cash.**

Every economic effect the player sees is the same number that moves the bank balance. There is no separate economic meter that behaves differently from the till.

### 3.1 The business account

A view of its own, in the manner of a bookkeeping landing page — the Vision Owner names Fortnox as the reference:

- **Accumulated cash**, prominent, current
- **Revenue and costs per service** — lunch and dinner separately, not merged into a daily total
- **Unexpected costs** shown as what they were, not as an adjustment
- **The transactions themselves**, listed, in order, readable

The player should be able to open this view and see where the money went, line by line.

### 3.2 Transactions are immediate and visible

Pressing *bring in agency staff* posts a cost for that evening, then and there. The player sees the line appear.

Every mechanic that touches money posts a line: wages, agency, ingredient tier, rent, loan interest, an investment, a scale-down saving. Nothing changes the cash silently.

**Report the transaction model before building** — what a line carries (timestamp, service, category, amount, cause), and how it relates to the existing `state.revenue` and `state.cost` accumulators.

---

## 4. The connection stays unexplained

**No activity may state which sustainability it serves.** The card shows the three numbers; the player draws the conclusion.

A card that says *"this builds social sustainability"* destroys the exact learning this order exists to restore. The numbers are the teaching; a label would replace it with a lookup.

The same applies in the ledger: a transaction says what it was for, not which capital it fed.

---

## 5. What happens to the wager

`ORDER 043` §4's wager on a theme is superseded. If a wager is kept it attaches to an activity — *you backed the training day; did it pay?* — and resolves against what actually happened.

Report whether the wager survives in that form or is retired. It may be that the activity choice, with its visible three-way cost, is already the stake and the wager is redundant.

---

## 6. UX

The Vision Owner: *the view is not UX-optimised, and the logic and how it is communicated is extremely unclear.*

- **One decision per surface.** The morning asks where the money goes. The service asks what you do now. The evening tells you what happened.
- **Numbers where numbers help** — kronor in the ledger, three-column effects on the cards. Word bands stay for the slow readings (`ORDER 047` §2) where a number would be false precision.
- **Nothing dominates the room** per `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §11. The business account is a view the player opens, not a panel that sits over the restaurant.

Report the layout before building it.

---

## 7. Build order

1. **The activity model** — the full set with three-column effects. Report before building.
2. **The allocation surface** — the morning slate and how the player apportions.
3. **The ledger** — transactions, the business account view, revenue and cost per service.
4. **Wire every money-touching mechanic to post a line.**
5. **Retire or re-anchor the wager** (§5), after reporting.
6. **UX pass** across morning, service and evening.

Report after 1 and 3.

---

## 8. Acceptance

The Vision Owner plays and reports:

1. That choosing an activity felt like a business decision, not a category pick.
2. That the three-column effects taught the connection without stating it.
3. That the cash in the ledger is the same money as the economic reading.
4. That pressing *agency staff* produced a visible cost, immediately.
5. That the business account answered "where did the money go" without help.
6. That each surface asked one thing.

---

## 9. What this order does not do

No multiplayer. No persistence. No new geometry. The knowledge engine (`ORDER 049`) continues in parallel — this order changes what is invested in, not what is asked.

---

## 10. What this order is for

The three sustainabilities were meant to teach that a business cannot be optimised in one dimension without cost in another. Asking the player to stake on them directly turned that lesson into a category selector.

An activity with three numbers on it teaches the same thing by making the player do the arithmetic themselves — and a ledger that shows the kronor makes one of those three dimensions concrete enough to feel.
