# ORDER 050 — ADDENDUM A: Pause, Pricing and Attention

**Version:** 1.0
**Status:** Awaiting Vision Owner approval.
**Class:** Addendum to `ORDER_050_ACTIVITIES_AND_THE_LEDGER.md`
**Amends:** §6 (UX), and adds §11 (pricing and the right to charge)
**Recipient:** Claude Code

---

## Why this addendum exists

ORDER 050 replaced the abstract sustainability stake with activities. Two things surfaced in the same conversation that belong with it: **how the player is allowed to attend to a decision**, and **what determines the price the house can ask.**

---

## §6 (revised) — Attention

### 6.1 The clock stops for a decision

The service currently runs while the player reads a scenario, weighs three answers, and chooses. Every decision is made under time pressure.

**Nexus is a game about judgment, not about reaction time.**

- **Automatic pause on a scenario.** When a question or scenario arrives, the clock stops until the player has answered. The room holds. Competence decides the outcome — not reading speed.
- **Manual pause, freely available.** Space bar stops everything. The player may want to open the ledger, weigh whether to call in agency staff, or read the stream without the room filling behind them.

**The counter-argument, acknowledged and answered.** Time pressure is real in a restaurant; a proprietor has no pause mid-service. But the pressure that matters is preserved elsewhere and is truer: **the knowledge you lack cannot be acquired during service.** You should have read up this morning. That is the real constraint, and it survives the pause.

### 6.2 Three speeds, as part of the game

The existing 1× / 2× / 4× toggle stops being a dev tool and becomes part of play: read, play, skip ahead. Name them for what they are rather than as multipliers.

### 6.3 One thing per surface

Five panels currently sit on screen at once during service — stream, instruments, wager, dev, scenario.

- **Morning asks where the money goes.**
- **Service asks what you do now.**
- **Evening tells you what happened.**

Nothing else on any of them. Report the surface-by-surface inventory before rebuilding.

### 6.4 Cash always, everything else on request

The cash figure in kronor is the only number that earns permanent screen presence — it is the business's pulse. Quality, reputation, valuation and the ledger sit one click away.

### 6.5 The room is the protagonist

Text at the edge, never over. **If the player is watching panels instead of watching the restaurant, the interface has beaten the game** — and the 3D view is wasted. Per `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §11.

### 6.6 Consequence appears where the cause was

Pressing *bring in agency staff* shows the cost at the button, in that moment — not only as a line in a ledger opened later. The ledger records it; the button reports it.

---

## §11 Pricing, willingness to pay, and the right to charge

### 11.1 Knowledge is the right to charge

**Without demonstrated knowledge, quality is self-governing** — it becomes whatever the staffing and the ingredients happen to produce, and no more. The player cannot raise prices, because there is no ground for it. The market decides on their behalf.

This makes knowledge the *right to charge* rather than a bonus, and it closes the chain already built in `ORDER_049` §2.1: pricing is bounded by the ceiling, the ceiling is set by demonstrated knowledge, and knowledge is shown in questions and problem-solving. **Documented insight, not assertion.**

### 11.2 Raising the price is a real bet

> Raise the wine list and you earn more — *if* the clientele you serve is willing to pay because everything is of a higher class. If the house does not hold that class, the consequence is fewer guests through falling satisfaction.

This cannot be calculated. It requires reading the situation: **location, demand, guest group, seats available to earn from, revenue per seat, upselling, service level, and the relation between food and wine pricing.** These are the quantities a restaurateur actually weighs, and the game should make them legible enough to weigh.

Report how they connect before building. In particular: what determines the guest clientele, and how much of it is fixed by the premises versus changed by what the player does.

### 11.3 The ceiling must be visible, not mysterious

A price the player cannot set must not read as a bug. The interface should make it plain that the house has not yet earned that level — in the observer's register, not as a locked control with no explanation.

### 11.4 Failure teaches the system

As cash runs down through poor decisions, bankruptcy approaches and the player must work out how it all connects. **That pressure is the teaching.** It should be legible enough to reason about and unforgiving enough to matter — which is the same balance `ORDER_049` §5 strikes for the bank.

---

## Build order

1. **Automatic pause on scenarios** — smallest change, largest effect on how the game feels.
2. **Manual pause.**
3. **Speed as play** (§6.2).
4. **Surface inventory and the one-thing-per-surface pass** (§6.3–6.5). Report the inventory first.
5. **Consequence at the cause** (§6.6).
6. **Pricing and willingness to pay** (§11). Report the model first.

---

## Acceptance

1. That a scenario could be considered rather than reacted to.
2. That the player could stop and think whenever they wanted.
3. That each surface asked one thing.
4. That the player watched the room, not the panels.
5. That raising the price felt like a bet on whether the house had earned it.
6. That being unable to raise it read as *not yet earned*, never as broken.
