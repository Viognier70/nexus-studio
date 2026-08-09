# ORDER 049 — The Knowledge Engine

**Version:** 1.0
**Status:** Awaiting Vision Owner approval. Not in force until approved.
**Class:** Sprint order — production (precedence level 7)
**Parent:** `ORDER_048_THREE_VOICES_AND_THE_QUESTION.md` §5; `DESIGN_BACKLOG.md` B-010
**Registry:** register in `ORDER_REGISTRY.md` before execution
**Recipient:** Claude Code

---

## 1. Why this order exists

The constitution's core loop has seven movements. Six are built. The seventh — **seeking knowledge** — has never existed, and it is the one that makes Nexus an education rather than a restaurant simulator.

It can now be built, because the knowledge already exists in a form the game can use.

**gusto.science holds gastronomy research with a completed TRIAD analysis on nearly every article.** Each carries three sections that map directly onto the registers Nexus has typed but never surfaced:

- **ε EPISTEME** — what the research establishes. Factual, checkable.
- **τ TECHNE** — how to apply it in practice, and — crucially — *where the abstract does not support a protocol.*
- **φ PHRONESIS** — a situated judgment, written as a scene: *"You are plating a Korean-inspired tasting menu for a mixed Korean, American and Gulf-region table…"*

**Nexus does not need to invent scenarios. They exist, one per article, with a source, a role and a trade-off.**

Two further comparisons drove this order. `somm.upcycledby.com` demonstrated concrete professional questions with a named knowledge form and a citation. `Gastronoma` demonstrated **readiness**: when an event fires, the player is shown what they had prepared, what the situation required, and the consequence — which is the clearest solution yet to a problem the Vision Owner has raised four times.

---

## 2. The player-facing loop

1. **The player invests, whenever they choose, in whatever they choose.** Not a fixed morning phase — an act available during service.
2. **Ten-second countdown.**
3. **A scenario arrives, drawn from the area invested in.** The stake and the question are connected: study the kitchen, get asked about the kitchen.
4. **Answer well and credits are earned in that subject.** This is the motivation to learn more, and it rewards depth over spread.
5. **Answer badly and credits are lost.**
6. **Running a business requires all areas.** Neglect one and revenue fails, because the three sustainabilities and their sub-areas hold each other up.
7. **Bankruptcy sends the player back to school** — Sevilla, to earn the means for a new venture.

### 2.1 Difficulty must rise

Questions grow harder, and more of the alternatives become defensible, **until holding a restaurant is impossible without genuine higher education and familiarity with current research across every related field.**

This is the order's hardest requirement and its whole point. The failure mode in both directions is real: too easy and it is a quiz with scenery; too hard too early and it is an exam. **Progression must begin where a newly graduated student stands and rise from there.**

Report the difficulty model before building it. `9/10 · Chef` in the source data may carry relevance, difficulty, or both — establish which.

---

## 3. Knowledge architecture

**Three stages, and the game never talks to Supabase during play.**

### 3.1 Generation — a script in the repo

A script reads articles from Supabase and generates, per article, up to three questions — one per register. Output is a JSON file in the repo carrying: article id, citation, role, register, question, alternatives, correct answer, and the justification the article itself supplies.

**A generated question may never claim more than the article claims.** The TRIAD analyses are careful about this — *"the abstract does not provide exact values; consult the source"* — and a question that invents a figure is worse than no question. Where the source does not support a determinate answer, the script must produce a phronesis scenario, which has no key, rather than a factual question that does.

Re-runnable as new articles arrive, without touching what has already been reviewed.

### 3.2 Review — the Vision Owner

The generated file is reviewed and each question marked approved or rejected. **This is where quality is decided and it is work only the Vision Owner can do.**

Rejections are kept with their reason, so the prompt can be improved once patterns emerge.

### 3.3 Packaging — Nexus reads only approved questions

Approved questions land in the game's own local bank. **Nexus never queries Supabase in play**: service is real-time and must not wait on a network. Refresh roughly monthly, out of band.

**This supersedes `VERTICAL_SLICE_002.md`'s "no backend, no Supabase" exclusion — for the generation script only.** The running game remains backend-free. Record the supersession in `ORDER_REGISTRY.md`; do not let it quietly widen.

### 3.4 Registers become visible

Nexus has typed episteme, techne and phronesis since ORDER 043 and never shown them. On answering, **name the knowledge form the answer exercised, with the source**. Not as a score — as an attribution. `somm.upcycledby.com` does this well: knowledge form, key concepts, citation.

This is the exception to §9's no-meters rule, and it is narrow: naming what kind of knowledge a question drew on is not a progress bar.

---

## 4. Readiness — from Gastronoma

When a scenario resolves, show **what the player had prepared, what the situation required, and what followed**:

> Personal: 0 · Dryck: 12 → snitt 6/100 → Låg beredskap
> Dålig dag avslöjas för 200 000 följare. Cash −20 kSEK · Social −15

Three lines. The player sees *why* it went badly, not only that it did. This is the answer to the Vision Owner's repeated finding that the connection between choice and outcome cannot be seen.

**Resources not invested in decay.** Passivity must cost.

---

## 5. Bankruptcy and return

Reaching zero in a sustainability ends the venture. The restaurant closes.

**The player returns to school in Sevilla to earn the means for a new business.** This is not a game-over screen: it is the loop's honest shape. You lost the restaurant because you did not know enough, and the way back is to learn.

Vision Owner (2026-08-09): after bankruptcy the portfolio loses competence points, weighted heaviest in the areas where knowledge failed. The next premises purchase requires higher capital — the bank has seen the failure. **Deficits cannot be compensated between areas:** high food/drink competence does not offset a bankruptcy caused by lacking economics. The bank wants to see that the specific deficit has been addressed, which forces the player to study what they were weakest at.

### 5.1 The bank meeting

Vision Owner (2026-08-09): every venture application — the first business at game start, and every application after a failed one — begins with a meeting with the bank director.

**A scene, not a form.** One person, animated, on the other side of a desk. The director asks relevant, tricky questions drawn from the knowledge bank (§3), chosen for the business type applied for. Answers are scored, and the composite decides the loan tier — which decides which premises the player can afford.

- Good answers open the largest tier of financing.
- Poor answers get a refusal for the tier applied for, and a referral to a smaller opportunity — a foodtruck in Grythyttan is the floor and is always offered.
- **After a bankruptcy the bank knows what failed** — the meeting weights the failed area's questions more heavily and lifts its threshold. Excellence in all subjects is the only path to full financing.

Report the mapping from answers to loan amount before building. The mapping is the mechanic's centre: it must let a diligent player earn full financing over time, and must not let a weak area be papered over by a strong one.

---

## 6. Animation and tension

**Every moment where something is at stake must be animated.** The game currently states outcomes; it should stage them.

- **The countdown** — ten seconds, unmissable, rising in intensity.
- **The question timer** — visible depletion, as in `somm.upcycledby.com`.
- **Credits landing** — `+10 · +25 · +35` arriving one after another, not appearing at once.
- **Meters moving** — the affected instrument moves visibly at the moment it moves, and a trade shows both directions in the same beat.
- **Readiness resolving** — the comparison assembles before the consequence lands.
- **The scenario arriving** — a beat of arrival, not a panel that is simply present.
- **Bankruptcy** — the heaviest moment in the game. It must not be a line of text.

Per `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §11 nothing may dominate the view, and per Addendum A §A.3 animation must not become severity signalling — **the same treatment for every event of a kind.** Tension comes from timing, not from decoration. Respect `usePrefersReducedMotion` throughout.

---

## 7. Build order

1. **Generation script** — Supabase read, question generation, JSON output. Report the prompt and twenty sample questions before generating at volume.
2. **Review flow** — approve/reject, reasons retained.
3. **The bank of questions** — approved questions in the game, replacing the three hand-authored questions from ORDER 048 §5.
4. **Invest → countdown → themed scenario** — the loop in §2.
5. **Readiness display** — §4.
6. **Difficulty progression** — §2.1, after the model is reported.
7. **Bankruptcy and return** — §5.
8. **The bank meeting** — §5.1, the scene at first application and after each bankruptcy. Report the answer-to-loan mapping before building.
9. **Animation** — §6, throughout, last.

Report after steps 1, 2, 4 and 8's mapping proposal.

---

## 8. Acceptance

The Vision Owner plays and reports:

1. That investing in an area produced a question from that area, and that this made studying it worthwhile.
2. That a question was real — answerable from professional knowledge, and traceable to a source.
3. That readiness explained an outcome he could not have explained before.
4. That difficulty rose enough that holding the restaurant demanded knowing the field.
5. That losing the restaurant felt like a consequence, and that returning to school felt like the way back.
6. That the moments where something was at stake felt like moments.

---

## 9. What this order does not do

No multiplayer. No competitor businesses. No material or finish work. No persistence beyond session — though §5's carry-across will force that question, and it should be reported rather than solved here.

---

## 10. What this order is for

Everything before this made an evening happen, made it legible, and gave it stakes. This order gives it **content that is true** — questions drawn from research, scenarios written by people who know the field, and a difficulty curve that ends with a restaurant only a knowledgeable operator can keep.

The constitution said the player would seek knowledge, acquire competence, and meet harder problems. This is the order where that stops being a sentence in a document.
