# ORDER 047 — The Instruments of Service

**Version:** 1.0
**Status:** Awaiting Vision Owner approval. Not in force until approved.
**Class:** Sprint order — production (precedence level 7)
**Parent:** `ORDER_043_CAPITAL_WAGER_AND_CONSEQUENCE_CHAIN.md` v3 and its addenda; `ORDER_046_THE_CYCLE_CLOSES.md`
**Registry:** register in `ORDER_REGISTRY.md` before execution, per `CLAUDE.md` rule 9
**Recipient:** Claude Code

---

## 0. Prerequisite — remove the sabotage

`NameEntryOverlay` throws `SYNTHETIC MOUNT-TEST SABOTAGE` in the running app. Test scaffolding was left in a production component. Remove it before anything else, and add a check that no such marker ships: grep the source for test-only sabotage strings as part of the smoke suite.

---

## 1. Why this order exists

The full cycle was played on 2026-08-09 — morning, team, investment, opening image, prep, service, stream, scenario, wager, evening account. The voice of the stream landed: *"Hm, det är den där ineffektiviteten som är svår att peka på men lätt att räkna på i slutet av månaden."* That part works.

The Vision Owner's verdict on the rest:

> Too much text, service too long, too few scenarios and always the same one, hard to understand what the investment did, hard to see the connection between answering a question and its effect.

And a proposal: **instruments that take the temperature of the service** — service level, guest satisfaction, revenue, tips, staff morale, food and drink quality.

Five findings pointing one way: **the player can read the evening's texture but not its state.** The stream says what is happening; nothing says how it is going.

---

## 2. Instruments are not competence meters

`ORDER_043` §9 forbids meters, and that constraint stands — **for competence.** A visible judgement bar becomes a target, and a farmed judgement bar is no longer judgement.

**Business instruments are a different thing.** Service level, guest satisfaction, revenue, tips, staff morale, quality of food and drink — these are what every restaurateur actually follows. Reading them is not gamification; it is the trade. The earlier prohibition failed to distinguish the two, and this order draws the line:

| Shown | Hidden |
|---|---|
| What the business is doing tonight | What the player has become |
| Service level, satisfaction, revenue, tips, morale, quality | Scientific and cultural competence, the registers, the portfolio tally |

Competence stays derived from behaviour and invisible (`ORDER_043` §3.3, §9). Instruments are the state of the business, live.

### 2.1 What they must do

**Move during service**, visibly, in response to what happens. A guest who gives up drops satisfaction. A scenario answered well lifts something nameable. This is what makes the connection between a decision and its effect legible — the Vision Owner's fourth finding.

**Sit at the edge, not in the middle.** Per `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §11 no numeric HUD may dominate the view. Compact, peripheral, glanceable — and they must never be the thing the player watches instead of the room.

**Carry into the evening account.** The account (`ORDER_046` §3) should be able to name a movement the player watched happen.

Propose the set and the layout before building. Six instruments is the Vision Owner's list; fewer may read better. Report which are derived from existing state and which need new state.

---

## 3. Less text

The stream is now a wall. Addendum B's four movements were right and the volume is wrong.

- **Fewer visible entries at once.** The panel currently holds eight long paragraphs; three or four is likelier.
- **Older entries collapse rather than scroll.** What has passed should recede to a line or disappear, not stack.
- **Not every event needs four movements.** Addendum B already allows this; in practice nearly every line has all four. Vary the length — some observations are a single clause.

The voice is not the problem. Do not rewrite it. Reduce it.

---

## 4. More scenarios, and different ones

Three scenarios exist — walk-in-of-five, time-pressure, moral-dilemma. The player saw the same one every service.

- **Raise the count per service** so a fifteen-minute dinner carries three or four, not one.
- **Do not repeat a scenario within a service**, and avoid repeating the previous service's opener.
- **Report why the same one kept drawing.** If theme weighting collapses onto social, that is a defect in the selection, not in the content.

---

## 5. The scenario must connect to the evening

The wager asks which sustainability the next situation concerns — before the player has grounds to answer. If the stream has spent five lines on the kitchen and the next scenario is economic, the connection cannot be seen.

Two candidate fixes; **report which is sounder before building**:

- **Draw the scenario from what has happened.** The theme is weighted by what the stream has been reporting, so a kitchen-heavy service produces a kitchen scenario. The reading becomes real.
- **Move the wager between subject and situation.** The player learns what it concerns, then stakes on it, then sees the situation. Closer to `LEARNING_AND_SCENARIO_ARCHITECTURE.md` §4.3, and it makes the stake a judgement about one's own footing rather than a prediction.

The first is truer to §5A's "read what is about to break." The second is cheaper. They are not exclusive.

---

## 6. Investments must show their work

"Utbildningsnivå 2 → 3" tells the player nothing.

- **Name the consequence at the point of choice**, in the observer's voice: what it costs per day, and what it is expected to change.
- **Name it again when it lands.** The next service should carry a stream line or an instrument movement attributable to the change.
- **The evening account should reference it** when a change was made that morning.

---

## 7. Compress time rather than shorten service

Fifteen minutes felt long because too little happened in it; five is too short for a chain to be felt.

The likelier fix is **a faster clock, not a shorter service** — more compressed simulated time per real second, so a full evening's arc fits in less real time without thinning its content.

Report what a speed increase does to readability before changing it. If events arrive faster than they can be read, the fix has traded one problem for another.

---

## 8. Collapse must be observable on demand

Collapse shipped (`ORDER_046` §1) and the Vision Owner has never seen it — by design it is rare, requiring an untrained team under overload.

**Add a dev-only trigger** that forces the next scenario resolution to collapse the service, so the mechanic can be seen, judged and tuned. Behind `import.meta.env.DEV`, like the existing capital cycles and the dev panel.

---

## 9. Acceptance

The Vision Owner plays one dinner and reports:

1. That the instruments made it possible to see how the evening was going without reading every line.
2. That the stream is readable at a glance rather than a wall.
3. That the service carried several different scenarios.
4. That answering a scenario produced a visible movement he could attribute to his answer.
5. That an investment made in the morning was recognisable in the evening.
6. Having seen a collapse at least once, that it read as a consequence rather than as an accident.

---

## 10. What this order does not do

No material or finish work. No new geometry. No persistence. No knowledge-seeking (`DESIGN_BACKLOG.md` B-010) — that is the next large order and it needs the loop settled first.

---

## 11. What this order is for

Everything in ORDER 043 through 046 was built to make an evening happen. This order is the first built to make an evening *legible* — not what it feels like, but what it is doing.

The voice landed on the first attempt. The instruments are what let the voice mean something: without a sense of how the night is going, even a well-observed remark is just a remark.
