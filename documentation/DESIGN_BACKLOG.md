# DESIGN BACKLOG

**What this file is.** Design decisions and ideas that arose in conversation and are not yet specified in any order. Each entry records what was decided, why, and what would need to be true before it could be built.

**Why it exists.** On 2026-08-08 the Vision Owner asked about competition, multiplayer and premises choice, saying "I have a feeling we discussed this." All four had been discussed — in foundation documents, never in an order — so nobody knew where. In the same session, the ambition-wager, the competitor visit, the evening's account and the reduction of eight staff roles to four were all decided in conversation and written down nowhere.

**The rule.** When something is decided in conversation and is not going into an order that day, it lands here the same day. An entry here is not a commitment to build — it is a commitment not to lose it.

**Status values:** `open` (not scheduled), `next` (candidate for the next order), `folded in` (now specified in an order — cite which), `dropped` (decided against — record why).

---

## Entries

### B-001 · The ambition wager
**Recorded:** 2026-08-08 · **Status:** open — overlap evaluation 2026-08-09

A stake placed *before* service rather than between scenarios: the player sets the evening's ambition — mise en place, staffing, menu — which costs money before a single guest arrives and returns more if the evening holds. A blind bet on one's own capability.

Discussed at length as the alternative to the difficulty selector, then set aside when the theme wager (ORDER 043 §4) took its place. It is not the same mechanic: the theme wager is a reading between scenarios, this is a commitment before the service.

**Before it can be built:** it overlaps with the team system (ORDER 043 §3) and service-length choice (§2), which already carry some of this weight. Decide whether it adds a distinct decision or duplicates one.

**Overlap evaluation, 2026-08-09 (post-ORDER-046).** The service-length picker sets the shape of the evening but does not stake money — a 15-minute dinner and a 30-minute dinner cost the same up-front and differ only in what they can hold. The investment panel (ORDER 046 §2) and team hiring (ORDER 043 §10 step 5) do stake money: ingredient tier + team dailyCost + agency spend all draw against economic capital before revenue arrives, and the evening account (ORDER 046 §3) is what tells the player whether they were right to. That covers three of the four movements of the proposed ambition wager (spend, wait, read the evening).

**What remains distinct.** The specific "returns *more* if the evening holds" bonus layer — a payout multiplier on top of the natural revenue, contingent on a self-declared ambition level. Cycle-1 has no such multiplier: raising ingredient tier costs more and yields the same per-guest revenue (revenuePerGuest reads pricing tier only). Adding an ambition-wager would need a distinct scoring gate ("did the evening meet the declared level?") and a bonus payout, neither of which the current ledger has.

**Verdict.** The mechanic is not duplicated by what has landed, but its motivating decisions largely are. Before building, the Vision Owner should confirm whether the ambition wager is (a) the missing bonus multiplier that turns morning spend into an actual bet — worth building — or (b) a fifth morning surface stacked on top of team + investment + service length + wager, which risks the morning becoming a spreadsheet. If (b), fold into ORDER 046's investment panel by adding a fourth dial ("ambition"). If (a), it deserves its own order and its own scoring gate.

---

### B-002 · Visiting competitors
**Recorded:** 2026-08-08 · **Status:** open

The player enters a competitor's premises and reads *their* event stream — sees the kitchen falling behind, the service inexperienced. Reconnaissance by the same reading skill used on one's own room.

Strong because the stream already exists: a competitor becomes legible for free once it has a business to read.

**Before it can be built:** competitors are currently buildings with no business behind them. Simulating their staffing, competence and strain means running the model in several instances — Priority 8 work per `DESIGN_DECISIONS_001.md`, after the property engine.

**Open question:** what does the player do with what they see? Reconnaissance without action is tourism. Poach their chef? Undercut them? Or is it purely knowledge that makes one better at reading one's own room — which is the truest answer, since that is how the trade is learnt.

---

### B-003 · The evening's account
**Recorded:** 2026-08-08 · **Status:** folded in — ORDER 046 §3, commit `7b6abc8` (PR #10, 2026-08-09)

Service ends, cost is charged, morning arrives — and the player is shown nothing. No summary of what the night gave: revenue, cost, how the sustainabilities moved, what credits were earned.

Without it the player invests without knowing what they are investing on the basis of.

**Should be in the observer's voice** (ORDER 043 Addendum B), not a table. What a proprietor tells themselves after closing.

**Pairs with:** the investment panel (ORDER 043 §7, specified but unbuilt).

**As built (ORDER 046 §3):** paragraph in the observer's voice at evening-period-start, snapshotted at close so drift during the fade doesn't re-pick a branch mid-read. Six branches keyed off state: `collapsed` (preempts all), `high_wager_win` (weak-capital win, delta ≥ 0.14), `high_wager_loss`, `good` (rep held, net revenue > cost × 1.15), `thin` (revenue < cost × 0.90), `mediocre` (fallback, per Vision Owner's explicit ask: "kvällen bara var medioker — inte varje kväll ska ha en poäng"). Money named as "täckte kostnaderna" / "gick back" / "gick över" — no figures. `EVENING_TO_MORNING_PAUSE_SEC` bumped 15 → 30 to hold the fade. Investment panel landed alongside in ORDER 046 §2 (`cd311d4`), realising the "pairs with" note above.

---

### B-004 · The full staff roster
**Recorded:** 2026-08-08 · **Status:** open

The Vision Owner named eight roles across two sides: runner, waiter, experienced-and-trained waiter, sommelier; apprentice, cook, sous chef, head chef. ORDER 043 §3 narrowed this to four (värd, servitör, kock, lärling) for the first cycle — **at the assistant's suggestion, to keep the first version balanceable**, not because the Vision Owner preferred four.

The narrowing is in ORDER 043. The original eight are recorded nowhere.

**Before it can be built:** the four-role version must first prove the hiring decision is felt. Eight roles is more to balance and more to make legible in the room.

---

### B-005 · Persistence and time between sessions
**Recorded:** 2026-08-08 · **Status:** open · **Also:** LQ-04, unresolved since July

Nothing survives a reload. `LEARNING_AND_SCENARIO_ARCHITECTURE.md` §11.1 requires that time not depend on the player being logged in, and ORDER 043's state model was shaped to keep that possible (plain-object records, simTime timestamps, event-log-as-primary) — but no persistence layer exists.

**Consequence today:** the reputation loop and the consequence chain are the mechanics that most need days to accumulate, and they reset every reload.

---

### B-006 · Nightclub as a business type
**Recorded:** 2026-08-08 · **Status:** open

ORDER 043 §2 defines four periods and defers night explicitly: different staff, different economics, different social pressure. Grythyttan's nightclub is a real place and a real business type, not a fourth service on the same model.

---

### B-007 · Weather, roadworks and the ecological reading overlap
**Recorded:** 2026-08-08 · **Status:** open · **Kind:** known ambiguity, deliberate

The roadworks factor (ORDER 045) slows delivery cadence by 1.4×. Delivery cadence is also the ecological capital reading (ORDER 043 §5A.3). On a roadworks evening the two are indistinguishable: what looks like falling ecological capital may be a closed road.

Deliberate, in the spirit of the queue's ambiguity — but it makes an ecological wager hard to judge on those evenings. Watch whether it reads as texture or as noise.

---

### B-008 · The stream is not yet the room
**Recorded:** 2026-08-08 · **Status:** open

ORDER 044 §3.3 mapped all 99 stream sentences against visual correlates. Roughly 55 have none — kitchen-internal events and phone-call outcomes happen off-screen.

Per §A.3 inventing weak correlates is worse than none, so they stay text-only. But it means more than half the stream describes things the room cannot show, which is a standing tension with Addendum A §5A.2's requirement that the text say what happens and the room show that it happens.

**Worth revisiting** once the kitchen exists as a place rather than a bar puck.

---

### B-009 · No menu, and whether that holds
**Recorded:** 2026-08-08 · **Status:** open

After forty-five orders there is no start menu; the player lands in the village. Much is settled implicitly by `CAMERA_AND_GAMEPLAY_BIBLE.md` §4 (no mode picker) and `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §11 (no dominant HUD).

The working assumption: **the village is the menu, the morning is the interface**, and the only thing outside the fiction is choosing a business the first time. Choosing premises from available buildings is Priority 8 (property engine).

Not yet decided by the Vision Owner. Recorded so the assumption is visible rather than accidental.

---

### B-010 · Knowledge-seeking — the missing limb
**Recorded:** 2026-08-08 · **Status:** next · **Largest gap in the project**

The constitution's core loop has seven movements: explore the village, meet problems, **seek knowledge**, acquire competence, invest, change the business, meet harder problems.

Competence now grows from behaviour (ORDER 043 §3.3) — the player learns by doing. But there is nowhere to *go to learn*. `MALTIDENS_HUS_EDUCATIONAL_ARCHITECTURE.md` specifies this in detail and has never been built.

This is the limb that makes Nexus an education rather than a restaurant simulator.

**Before it can be built:** ORDER 043 must be complete and its loop judged to hold. Then it deserves its own order — probably the largest since 042.

---

### B-011 · Player-to-player economy
**Recorded:** 2026-08-09 · **Status:** open · **Priority:** 8 or later per `DESIGN_DECISIONS_001.md`

Cross-account financial primitives between players — the economy stops being solitaire and starts being a small market:

- **Liquidation with capital parked at the bank as a pause mechanism.** A player who sells their venture (per ORDER 049 §5.2) may choose to leave the proceeds on deposit at the bank rather than immediately reinvest. The account remains theirs; they can return, take a bank meeting, and reactivate a venture from that capital when they are ready. Effectively an in-fiction "log out with your winnings intact" that is not persistence-as-savefile but persistence-as-account.
- **Financing of other players' ventures.** A player with capital on deposit can back another player's application — either supplementing what the bank offers (letting the receiving player reach a higher tier than the bank alone would fund) or offering financing when the bank has refused.
- **Direct messages and transfers between players.** Amount, interest rate, term, share (equity vs. straight loan vs. revenue share) all negotiated freely by the players themselves. The system holds the ledger and enforces the contract; it does not set the terms.

**Preconditions.** This presupposes `LEARNING_AND_SCENARIO_ARCHITECTURE.md` §11.1's six conditions in their entirety: persistent state, real accounts, a shared world, time that advances independently of any single player being logged in, portable state, and the portfolio format already required for other reasons. `B-005` (persistence + time between sessions) is a strict prerequisite — this backlog entry cannot be built until §11.1 lands as a whole.

**Own order when the knowledge engine bears.** The knowledge engine (ORDER 049) is the loop's current centre of gravity; the between-player market layers on top of it once single-player play has been judged to hold across a run of days. Deserves its own order at that point — comparable in scope to ORDER 043.

**Not decided by this entry:** whether financing another player creates a legible in-fiction relationship (a named backer whose reputation is tied to the venture's outcome) or whether it is a pure ledger transaction. The former is truer to the game's overall grammar; the latter is much cheaper to build. Report before building.

---

## How to use this file

Add an entry the day a decision is made outside an order. When an entry is folded into an order, change its status and cite the order — do not delete it. The record of *when* something was decided is worth as much as the decision.
