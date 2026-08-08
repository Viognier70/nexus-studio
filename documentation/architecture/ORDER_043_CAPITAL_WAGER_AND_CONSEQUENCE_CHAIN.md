# ORDER 043 — The Capital Wager and the Consequence Chain

**Version:** 1.0
**Status:** Awaiting Vision Owner approval. Not in force until approved.
**Class:** Sprint order — production (precedence level 7)
**Parent:** `ORDER_042_BUILD_FIRST_PLAYABLE_LOOP.md` §3.5
**Registry:** register in `ORDER_REGISTRY.md` before execution, per `CLAUDE.md` rule 9
**Recipient:** Claude Code

---

## 0. Prerequisites

Verify the order number against `ORDER_REGISTRY.md`. If 043 is taken, stop and report.

ORDER 042 must be merged to `main`. `LOOP_STATUS.md` rows 1–4 must read DONE.

---

## 1. Why this order exists

ORDER 042 built the loop and it was played on 2026-08-08. The Vision Owner's verdict, verbatim in substance:

> The decision felt given — A was obvious — and since nothing else happens, it isn't much fun to play.

Both halves are correct and neither is an implementation defect.

**A dominates because there is no stake.** Seating five guests reads as pure revenue. The cost exists in the simulation but the player never feels it. A choice with no risk is a form, not a judgement.

**Nothing else happens because the outcome is one guest puck two metres away.** Choice A and choice B render as visually identical rooms. §2.3 of ORDER 042 asked for consequence in the room; what shipped is consequence in the data.

Enriching the visible consequence would not fix the first problem. A scenario with three outcomes and no stake cannot become tense however well it renders. **The missing element is the wager**, and this order builds it.

---

## 2. The loop, as the Vision Owner specified it

Six steps. This section is the premise; §§3–7 implement it.

1. The player goes to their restaurant and opens for service.
2. Something happens — guests arrive, the evening takes shape.
3. Scenarios play out; the player's knowledge is tested.
4. **After a scenario resolves, the player may wager on which theme the next scenario will concern.** The cue must not be obvious.
5. Depending on how the player acts and answers — across the Aristotelian registers: theoretical question (*episteme*), practical action (*techne*), practical wisdom (*phronesis*) — the player wins or loses knowledge credits.
6. Won credits may be invested. Lost credits in an area degrade that capital, and **the degraded capital shapes the next scenario**: answer poorly on a staffing matter and social capital falls, raising the risk that staff resign — which becomes the next problem.

Step 4 is the element that makes this a game rather than a quiz. Step 6 is the element that makes it a chain rather than a series.

---

## 3. Capital is the only resource system

**There are no separate competence tracks.** Staff competence *is* social capital expressed in the business. Sourcing is ecological. Method knowledge is scientific. The place's tradition is cultural. Money is economic.

The five capitals from `GAME_DESIGN_CONSTITUTION.md` become the game's actual mechanics rather than a list in a document:

| Capital | What it covers in the business |
|---|---|
| Economic | Margin, cash, the evening's takings |
| Social | Staff, guests, the village's regard |
| Ecological | Sourcing, waste, the seasons |
| Cultural | The place's tradition, the room, what the house stands for |
| Scientific | Method, technique, what the kitchen knows |

Each capital is a value the player wagers, wins, loses, and invests. A capital falling below a threshold produces a concrete event in the business — staff resign, a supplier drops the house, regulars stop coming.

**Constraint:** no capital may be optimised in isolation without cost to another. There must be no dominant strategy. This is the constitution's own requirement and it is the acceptance criterion for §7.

---

## 4. The wager

After a scenario resolves and before the next arrives, the player may stake capital on **which theme the next scenario will concern**.

- The stake is placed in a specific capital. Correct reading returns more than it cost; wrong reading loses the stake.
- The wager is optional. Declining is a legitimate play, and a player who never wagers must still be able to progress — more slowly.
- The wager is placed in the world, not in a menu. See §6.

**Theme selection is weighted by weakness.** The next scenario's theme is drawn at random, weighted toward the capital the player is weakest in. This is pedagogically correct — the game seeks out what the player cannot do — and it makes the wager a real decision: stake on a strong capital where you would likely win but rarely be asked, or on the weak one where the question comes often and you more often lose.

**Damping is mandatory.** Pure weakness-weighting is punitive: the weakest capital always draws the question, the player loses there, and it grows weaker still. Implement both of:

- a cap on how often the same theme may recur consecutively;
- a larger return on a win in a weak capital, so the spiral can be broken by skill rather than luck.

Report the numbers chosen. They will need tuning against play, not against theory.

---

## 5. The three registers

Scenario responses are scored across the Aristotelian registers, per `GAME_DESIGN_CONSTITUTION.md`:

- **Episteme** — the theoretical question. Is the fact known?
- **Techne** — the practical action. Can it be done?
- **Phronesis** — judgement. Given this room, this evening, these people, what should be done — weighed against economic, ecological and social sustainability?

Phronesis is the highest register and must never reduce to a correct answer. A phronesis outcome is a trade-off with costs on both sides, and the credit awarded reflects the quality of the weighing, not the matching of a key.

---

## 6. Cues live in the room

The wager requires something readable, or it is a lottery.

Capital states must be legible in the rendered business before the player stakes: strained staff show, tired sourcing shows, a thinning regular crowd shows. The player reads what is about to break — they do not pick a category from a menu.

This supersedes ORDER 042 §3.3's difficulty selector, which the Vision Owner found read as a form rather than as part of the evening. **The difficulty selector is removed.** The wager replaces it.

Per `EXECUTIVE_DESIGN_DIRECTIVE_001.md`: no avatar, no mode picker, no numeric HUD dominating the view, no result popup, no individual move-orders on staff or guests, no XP or levels. Capital states are shown in the room's behaviour, with at most a compact peripheral readout.

---

## 7. Investment

Won credits may be invested per ORDER 042 §3.5's premise: staffing, training level, pricing, sourcing tier — the `Policies` schema already typed in `types.ts`.

Investment converts capital into changed conditions, which changes what scenarios arrive, which changes what may be wagered. This closes the loop the constitution describes.

---

## 8. Acceptance

This order is complete when the Vision Owner can play **four scenarios in sequence** and report:

1. That the wager was a real decision — that reading the room mattered and the theme was neither obvious nor arbitrary.
2. That a loss in one scenario visibly shaped a later one.
3. That no single response dominated across the four.

One scenario proves nothing here. The chain is what is being tested, and a session must run long enough for a consequence to arrive.

**Do not build a fifth scenario, a second business, or any world work until §8 is answered.**

---

## 9. What this order is for

ORDER 042 proved the loop runs and the room renders. It also proved the loop is not yet a game. This order adds the stake and the chain — the two things the Vision Owner identified by playing, not by specification.

Everything here is reversible. If the wager reads as gambling rather than as professional judgement, the correct response is to change what is staked and what is read, not to abandon the stake. A scenario without risk has already been tested, and the verdict is recorded above.
