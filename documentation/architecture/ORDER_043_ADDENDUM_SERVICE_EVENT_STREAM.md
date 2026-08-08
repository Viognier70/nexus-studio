# ORDER 043 — Addendum A: The Service Event Stream

**Version:** 1.0
**Status:** Awaiting Vision Owner approval.
**Class:** Addendum to `ORDER_043_CAPITAL_WAGER_AND_CONSEQUENCE_CHAIN.md` v3
**Inserts as:** §5.4 (Reading the room) and amends §10 build order
**Recipient:** Claude Code

---

## A.1 Why this addendum exists

Step 3 of §10 landed and the room now runs: dinner fills to capacity, guests arrive and leave, the flow is visible. Two findings from the 2026-08-08 walkthrough:

**The queue does not read.** Projected peak queue is 7 at social=0, but mean queue is 0.11 — the queue exists for moments and drains instantly. A signal that lasts under two seconds is not something a player can read. The queue cannot carry the social reading alone.

**The time between scenarios is empty.** The Vision Owner: *it feels slow, hard to judge without scenarios to meet.* Filling that time with side activities — quizzes, minigames — would break attention away from the room and teach the player that the restaurant is the waiting area between questions. That is precisely what §9 forbids.

This addendum solves both with one mechanism.

---

## A.2 The event stream

During service, short written notices appear as things happen in the room: an order that comes back wrong, a guest who looks unhappy, a plate returned, a table waiting too long for its main course, a delivery that arrives short.

**Frequency and severity are weighted against the team and the enablers.** With runners and an apprentice, small errors come often. With an experienced brigade, the stream is quiet. This makes the stream a direct reading of the staffing decision made that morning — the consequence of §3's team choice, felt continuously rather than only at scenario time.

### What this fixes

**The room becomes legible without geometry.** The stream says what the pucks cannot: that service is losing its order, that the kitchen is falling behind. In a gray box this is more readable than spatial signals, and it does not depend on the queue holding.

**The wager becomes possible.** The player reads the stream, sees errors clustering on the kitchen side, and stakes accordingly. That is reading what is about to break — in words rather than in geometry, which §7 permits: the requirement is that the player reads the business's state, not that the reading is spatial.

**Scenarios become culminations.** Five small notices about slow service, then the scenario about a table that wants to complain. The player saw it building. A scenario that arrives out of nowhere is an interruption; one that arrives after a visible drift is a consequence.

---

## A.3 Two failure modes to design against

**The stream must not become a log the player stops reading.** If every entry is the same weight it becomes noise. Vary it: most entries small and observational, a few that make the player look up. Severity should be visibly different — not by colour-coding, which is a symbol, but by what the entry describes and how often its kind occurs.

**The stream must not replace the room.** If all the information lives in the text, the 3D view becomes decoration. The text says what is happening; the room shows that it is happening. A plate going back should ideally also be a puck moving wrongly. Where an event has no visible correlate, prefer events that do.

---

## A.4 Relation to the wager and the chain

The stream is the substrate the wager reads. It is not itself a decision point and generates no credits directly — credits come from scenario responses (§8) and from the wager (§7).

Events may feed the consequence chain: a run of kitchen errors is what a later scenario is *about*. This is the within-evening chain §2 describes, feeding the between-day chain of §8.

---

## A.5 Relation to agency staff

§3.1's agency staff is the decision the stream makes readable. The player watches pressure build in the stream, and chooses to pay or to let the staff absorb it. Without the stream, the pressure is invisible and the decision arbitrary.

**Build the stream before agency staff.** The decision needs something to be a decision about.

---

## A.6 Amended build order

§10 is amended:

1. The round — **done** (`d5e9f9f`, `bbfa3f0`)
2. The room reads — **done** (`ab1dc35`, `98bf1ac`, `c3b2e97`)
3. **The event stream** — new, this addendum
4. Scenario firing — connect the existing scheduler so planned scenarios actually fire, spread across the service
5. The team, including agency staff
6. The reputation loop
7. Wager and chain
8. Collapse

Steps 3 and 4 together are what let the Vision Owner judge the rhythm of a service — whether the air between scenarios is right. That judgement blocks everything after.

---

## A.7 Scope for this cycle

- Event kinds tied to the three sustainabilities and to both enablers, so the stream reads differently depending on where the team is weak.
- Weighting against team composition and enabler levels. With no team system yet (§10 step 5), weight against `Policies.staffCount` and `trainingLevel` as a stand-in and note the substitution.
- Swedish text via `strings.sv.ts` per `CLAUDE.md` rule 7.
- No new dependencies.

**Report with a sample stream** — twenty consecutive events at a weak team and at a strong one — before wiring it to the view. The texts are the mechanic here; if they read as filler, the mechanism fails regardless of how it is wired.

---

## A.8 Acceptance

The stream is right when the Vision Owner can play a dinner service and say what was going wrong before a scenario arrived — and was right.
