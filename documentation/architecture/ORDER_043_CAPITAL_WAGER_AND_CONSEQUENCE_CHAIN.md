# ORDER 043 — The Capital Wager and the Consequence Chain

**Version:** 2.0
**Status:** Awaiting Vision Owner approval. Not in force until approved.
**Class:** Sprint order — production (precedence level 7)
**Parent:** `ORDER_042_BUILD_FIRST_PLAYABLE_LOOP.md` §3.5
**Registry:** register in `ORDER_REGISTRY.md` before execution, per `CLAUDE.md` rule 9
**Recipient:** Claude Code

---

## 0. Prerequisites

Verify the order number against `ORDER_REGISTRY.md`. If 043 is taken, stop and report.

ORDER 042 must be merged to `main`. `LOOP_STATUS.md` rows 1–4 must read DONE on `main`.

---

## 1. Why this order exists

ORDER 042 built the loop and it was played on 2026-08-08. The Vision Owner's verdict, verbatim in substance:

> The decision felt given — A was obvious — and since nothing else happens, it isn't much fun to play.

Both halves are correct and neither is an implementation defect.

**A dominates because there is no stake.** Seating five guests reads as pure revenue. The cost exists in the simulation but the player never feels it. A choice with no risk is a form, not a judgement.

**Nothing else happens because the outcome is one guest puck two metres away.** Choices A and B render as visually identical rooms.

Enriching the visible consequence would not fix the first problem. A scenario with three outcomes and no stake cannot become tense however well it renders. **The missing elements are the wager and the chain**, and this order builds them.

---

## 2. The loop, as the Vision Owner specified it

1. The player goes to their restaurant and opens for service.
2. Something happens — guests arrive, the evening takes shape.
3. Scenarios play out; the player's knowledge is tested.
4. **After a scenario resolves, the player may wager on what the next scenario will concern.** The cue must not be obvious.
5. Depending on how the player acts and answers — across *episteme*, *techne*, *phronesis* — the player wins or loses credits.
6. Won credits may be invested. Lost credits degrade a sustainability, and **the degraded state shapes the next scenario**: answer poorly on a staffing matter and social sustainability falls, raising the risk that staff resign — which becomes the next problem.

---

## 3. Two layers, not one list

The five capitals of `GAME_DESIGN_CONSTITUTION.md` are **not one flat resource pool.** They divide by function.

### 3.1 Outcomes — what is earned, staked and lost

Three sustainabilities. These carry credits and decide whether the business survives.

| Sustainability | What it covers in the business |
|---|---|
| Economic | Margin, cash, the evening's takings |
| Social | Staff, guests, the village's regard |
| Ecological | Sourcing, waste, the seasons |

These are what the player wagers on (§4), what scenario outcomes move (§5), what the consequence chain runs through (§6), and what investment spends (§7).

**Constraint:** none may be optimised in isolation without cost to another. No dominant strategy. This is the constitution's requirement and an acceptance criterion in §9.

### 3.2 Enablers — what makes the three possible

**Scientific knowledge** (method, technique, what the kitchen knows) and **cultural understanding** (the place's tradition, the room, what the house stands for) are *not* outcomes. They are competences that enable the three sustainabilities.

The player does not earn cultural capital. The player uses cultural understanding to make a decision that earns social credit. A restaurateur who does not understand the place's tradition makes worse guest decisions — but "tradition" does not appear in the accounts.

Both enablers carry all three Aristotelian registers:

- **Episteme** — is the fact known?
- **Techne** — can it be done?
- **Phronesis** — given this room, this evening, these people, what should be done?

### 3.3 Competence is derived from behaviour, never purchased

**Enabler competence grows from how the player plays.** Consistently trying methods grows techne. Reading the room and departing from the rule when the situation demands it grows phronesis. Nothing may be bought: credits buy changes to the business (§7), never competence.

This is `GAME_DESIGN_CONSTITUTION.md`'s evidence-based portfolio given a mechanism at last — the player *demonstrates* competence and it is derived from behaviour.

It also makes the game unoptimisable around a weakness. To get better at staffing you must make staffing decisions, and some will go wrong.

---

## 4. The wager

After a scenario resolves and before the next arrives, the player may stake credits on **what the next scenario will concern**.

- The stake is placed in a sustainability. Correct reading returns more than it cost; wrong reading loses the stake.
- The wager is optional. A player who never wagers must still progress — more slowly.
- The wager is placed in the world, not in a menu (§8).

**Theme selection is weighted toward weakness.** The next scenario is drawn at random, weighted toward the sustainability the player is weakest in. This is pedagogically correct — the game seeks out what the player cannot do — and it makes the wager a real decision: stake on a strong area where you would likely win but are rarely asked, or on the weak one where the question comes often and you more often lose.

**Damping is mandatory.** Pure weakness-weighting is punitive: the weakest area always draws the question, the player loses there, it grows weaker still. Implement both:

- a cap on consecutive recurrence of the same theme;
- a larger return on a win in a weak area, so the spiral breaks by skill rather than luck.

Report the numbers chosen. They will need tuning against play, not theory.

---

## 5. Scoring a response

A response is scored on two axes:

**Which sustainability it moves, and by how much** — the credit outcome.

**Which register it exercised** — recorded against the relevant enabler, feeding §3.3's derivation. Not shown as a score.

Phronesis must never reduce to a correct answer. A phronesis outcome is a trade-off with costs on both sides, and what is recorded is the quality of the weighing, not a match against a key.

---

## 6. The consequence chain

A sustainability falling below a threshold produces a concrete event in the business: staff resign, a supplier drops the house, regulars stop coming. The event becomes the next scenario's situation.

One consequence event per sustainability in this cycle. Simple threshold triggers are acceptable; the chain matters more than the sophistication of any link.

---

## 7. Investment

Won credits may be invested per the `Policies` schema already typed in `types.ts`: staffing, training level, pricing, sourcing tier.

**Investment changes the business's conditions — never the player's competence.** Changed conditions change what scenarios arrive, which changes what may be wagered. This closes the constitution's core loop.

---

## 8. What the player sees

**No competence meters.** A visible bar becomes a target to farm, and the moment a player optimises a judgement bar, it stops being judgement.

Growth must be **noticeable but not measurable**:

- A fourth response option appears where there were three, without explanation. The player notices it when it happens.
- The mentor's remark after a scenario reflects *how the player acted*, not how many points were scored.
- A situation that previously cost staff becomes manageable.

Cues for the wager live in the room. Strained staff show. Tired sourcing shows. A thinning regular crowd shows. **The player reads what is about to break** — they do not pick a category from a menu. A stake token dragged onto a themed symbol is a menu with different graphics; that is not what this order asks for.

This supersedes ORDER 042 §3.3's difficulty selector, which read as a form rather than as part of the evening. **The difficulty selector is removed.**

Per `EXECUTIVE_DESIGN_DIRECTIVE_001.md`: no avatar, no mode picker, no numeric HUD dominating the view, no result popup, no individual move-orders on staff or guests, no XP or levels.

A portfolio may later show what the player has done — as a history to revisit, never as a dashboard to play against.

---

## 9. Acceptance

Complete when the Vision Owner can play **four scenarios in sequence** and report:

1. That the wager was a real decision — reading the room mattered, and the theme was neither obvious nor arbitrary.
2. That a loss in one scenario visibly shaped a later one.
3. That no single response dominated across the four.

One scenario proves nothing. The chain is what is being tested, and a session must run long enough for a consequence to arrive.

**Do not build a fifth scenario, a second business, or any world work until §9 is answered.**

---

## 10. Scope for this cycle

- **Three sustainabilities**, all of them: economic, social, ecological. They are the outcome layer and cannot be partially built.
- **Both enablers** in the derivation model, but scenarios need not exercise every register evenly in the first cycle.
- **One scenario per sustainability** minimum. Four plays means one theme recurs — which tests the weakness-weighting.
- **One consequence event per sustainability.**

Report after the state model and reducer wiring, before building scenarios.

---

## 11. What this order is for

ORDER 042 proved the loop runs and the room renders. It also proved the loop is not yet a game. This order adds the stake, the chain, and the distinction between what is earned and what is learned — all three identified by playing, not by specification.

Everything here is reversible. If the wager reads as gambling rather than as professional judgement, change what is staked and what is read — do not abandon the stake. A scenario without risk has already been tested, and the verdict is recorded in §1.
