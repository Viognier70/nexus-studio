# Learning and Scenario Architecture

**Version:** 0.1  
**Status:** Draft — ready for review. Records Vision Owner decisions of 2026-07-29.  
**Class:** Subsystem specification (precedence level 6)  
**Parent directive:** `documentation/foundation/EXECUTIVE_DESIGN_DIRECTIVE_001.md`  
**Constitution:** `documentation/foundation/DESIGN_DECISIONS_001.md`  
**Framework:** `documentation/game-design/NEXUS_GAMEPLAY_FRAMEWORK.md` v2.0  
**Companions:** `CAMERA_AND_GAMEPLAY_BIBLE.md`, `MALTIDENS_HUS_EDUCATIONAL_ARCHITECTURE.md`  
**Supersedes:** the knowledge-acquisition model in `documentation/foundation/vision/ORDER_100_VISION.md`  
**Reconciles:** `COHERENCE_AUDIT_001.md` §3, whose conclusion this document corrects  

---

## 1. Purpose

`COHERENCE_AUDIT_001.md` §3 found that ORDER 100 contains two incompatible theories of learning — knowledge as a resource to be gathered and spent, and competence as something demonstrated rather than earned — and concluded the project must choose one.

That framing was wrong, and the Vision Owner's answer is better than either option the audit offered.

**Knowledge is not a currency. Knowledge is the capacity to earn one.** The player does not spend episteme; the player uses it to survive a situation that produces capital. The audit's dichotomy dissolves once that distinction is made.

This document specifies the resulting architecture.

---

## 2. The load-bearing principle

> **The building trains. The world tests.**

Inside Måltidens Hus the player practises: the form is known, the stakes are absent, repetition is permitted. Out in the business, scenarios arrive unbidden, unchosen, and consequential.

This resolves the apparent conflict with framework §5.5, which states that understandings arise through play and not through reading, lectures or quizzes. Under this architecture:

- Reading and quizzes produce **theoretical knowledge** (episteme).
- Understanding arises when that knowledge meets a situation the player did not choose.
- The scenario *is* the play. The library is preparation for it.

Framework §5.5 is therefore satisfied, not contradicted. §14.1 records the reinterpretation this requires.

---

## 3. The three knowledge forms

Each form has one place where it is acquired or trained, and one place where it is proven.

| Form | Acquired / trained in | Proven in | Nature |
|---|---|---|---|
| **Episteme** | Måltidsbiblioteket | Every scenario, indirectly | Theory, research, facts, principles |
| **Techne** | Metodköket, Stensöta | Execution scenarios | Method, craft, timing, coordination |
| **Phronesis** | Gastronomiska Teatern, Kalastorget | Judgement scenarios | Weighing, ethics, leadership, context |

### 3.1 A form may not be acquired where it does not belong

**This is a hard rule.** Quizzes produce episteme only. No amount of reading produces techne or phronesis.

A player may study flambé technique to the highest certification tier and still fail to execute it. That gap is the point. If study could produce techne, the portfolio would document a competence the player does not have, and the assessment claim in §10 would be false.

### 3.2 Episteme unlocks capability, never capital

Knowledge does not convert to money. It changes what the player can **see and do** inside a scenario:

- Response options that are invisible to an untrained player become visible.
- Signals in the world become legible — a sauce breaking, a room turning, a supplier hedging.
- Actions become available: a wine pairing menu, a tableside preparation, a supplier negotiation.

`APPROXIMATION_REGISTER`-style verification does not apply here; this is a design rule, not a fact about Grythyttan. But it is the rule that keeps knowledge from becoming a farm.

**Rationale.** Capital is fungible and invisible — more money does not feel like progress. Capability is a function that opens, which the player can see, try and describe. It also protects the assessment: a player cannot buy competence.

---

## 4. Scenario architecture

Scenarios are what happens **to** the player. They are not selected, not scheduled, and not repeatable. They emerge from the simulation per ORDER 100's simulation-first principle and framework §8.

### 4.1 Two types, kept apart

**Knowledge scenarios have correct answers.** Allergens, food safety, hygiene, alcohol service law, statutory requirements. Relativism does not belong here. A nut allergy is handled correctly or it is not, and a wrong answer must hurt.

**Judgement scenarios have no correct answer.** Whether to seat the party of eight when the room is nearly full. Whether the money goes to staff welfare or to the new refrigeration unit. These are trade-offs, and both `CAMERA_AND_GAMEPLAY_BIBLE.md` §8.1 and framework §5 state that such scenarios have no universally correct response.

**The two types must never be blended.** If they are, players learn answer keys instead of judgement, and the portfolio documents memorisation. This is the single failure mode that would destroy the assessment value of the whole system.

### 4.2 Multiple valid answers

A scenario presents several responses. In judgement scenarios more than one may be sound, with different consequences. In knowledge scenarios there may be several correct components, and selecting three of four sound measures is not failure but a gap — and the gap has a consequence.

The interface does not mark answers right or wrong. The world responds, per framework §8: a decision that produces no visible change in the world did not matter.

### 4.3 Difficulty is chosen before the scenario is known

The player sees the **subject** — beverage pairing, staff conflict, supply failure — and chooses a difficulty level before the situation is revealed.

This is deliberate risk under uncertainty. The player must assess her own competence, which is metacognition and among the harder things to teach. An inexperienced player bids high on everything. An experienced one knows where she is strong.

**That behaviour is itself portfolio evidence.** A player who consistently overestimates her beverage knowledge has demonstrated something about self-assessment.

### 4.4 Stakes are in the choice, not on a dial

There is no bet slider. `CAMERA_AND_GAMEPLAY_BIBLE.md` §11 and `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §11 prohibit interfaces where numbers dominate, and a wager control is exactly that. A restaurateur does not stake money on a guest being satisfied; the situation carries its own exposure.

| Where | Form of stake |
|---|---|
| Difficulty selection | Abstract risk level, three or four steps |
| The scenario response | Diegetic — options carry different exposure |
| Investment between scenarios | Free allocation of budget. Numbers belong here |

### 4.5 Error must cost

A failed high-difficulty scenario does not merely withhold reward. It damages something: reputation, staff trust, finances, a supplier relationship. Withheld reward is not risk.

The worked example is the Vision Owner's own: a proprietor who never invests in staff welfare — celebrations, study visits, training — gets staff who feel no loyalty, who leave, or who do the work poorly. An experienced operator budgets for this regularly. An inexperienced one does not. Nothing in the interface states this; the world simply behaves that way, and the player either understood or did not.

### 4.6 Subjects that permit no wager

Allergens, hygiene, fire safety, and anything bearing on physical harm. These are trained in Metodköket and proven in the business, and the risk there is inherent to the situation rather than selected by the player. Wagering on patient safety is the wrong signal in an educational product.

---

## 5. Feedback

Every question, everywhere, gives feedback. But the three forms require different kinds, and conflating them is a design error.

| Form | Feedback | Timing |
|---|---|---|
| **Episteme** | Explanation — why this is so, what principle underlies it | Immediate |
| **Techne** | Outcome — what happened to the product, what went wrong in execution | Immediate |
| **Phronesis** | Consequence — how the evening unfolded, what followed | Compressed, never instant |

### 5.1 Judgement feedback is a replay, not a verdict

`CAMERA_AND_GAMEPLAY_BIBLE.md` §8.1 forbids resolving judgement scenarios through an immediate results popup: the result lives in the room.

In practice, on Kalastorget and in the Teatern, this means **compressed replay**. The evening plays out in perhaps thirty seconds of accelerated time. The player watches guests react, staff cope, atmosphere shift. A mentor NPC then comments — not *"the correct answer was B"* but *"here is how the evening went, and here is what an experienced host would have noticed earlier."*

This preserves the absence of an answer key while still teaching. It also produces shareable artefacts, which matters commercially.

---

## 6. Practice and test are structurally different

| | Practice (inside Måltidens Hus) | Test (in the business) |
|---|---|---|
| Chosen by player | Yes | No |
| Repeatable | Yes | No |
| Carries stakes | No | Yes |
| Wager available | No | Yes |
| Writes to portfolio | As episteme or techne evidence | As phronesis evidence |

A wager is only possible where the outcome is real. This follows from §4.4 and needs no separate rule.

---

## 7. Certification tiers

Episteme carries tiers — bronze, silver, gold, platinum — mapped to real professional qualifications where such qualifications exist.

This is realism, not gamification. WSET has four levels; the Court of Master Sommeliers has four. Mirroring the profession is consistent with `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §2.

**Tiers apply to episteme only.** Techne is demonstrated, not certified in tiers. Phronesis has no levels at all — judgement does not come in bronze.

§14.2 records the framework reinterpretation this requires.

---

## 8. Bankruptcy and return

Failure is a chapter, not an ending.

### 8.1 The loop

> Insolvency → courses and certification → **the bank reassesses** → financing → new venture

### 8.2 Knowledge does not print money

Study does not produce capital directly. It produces a case the bank can evaluate. `09_NPC_AND_PLAYER_GROUPS` (archived) described the bank as an actor assessing financing, market understanding, risk and trust — and that is exactly the right mechanic.

The bank weighs several things: what the player has studied, how her previous decisions read, whether her new plan is credible. It can say *"you have done the courses, but your last three decisions were poor."* This is why the loop cannot be farmed, and it is the only anti-farm mechanism needed.

### 8.3 No diminishing returns

A second bankruptcy is not made harder than the first. Escalating difficulty punishes precisely the players who most need help, and they leave.

Instead, the second start is **different**: other premises available, other opportunities, a reputation to handle. Variation retains players; escalating difficulty drives them away.

### 8.4 What survives

| Survives | Lost |
|---|---|
| Knowledge and certifications | Capital |
| The director's log and portfolio | The premises |
| Relationships and contacts | Staff |
| Reputation — **recoverable** | The business itself |

Reputation persists, or no decision means anything over time. But it is recoverable, and the recovery is content: rebuilding trust is among the better stories the game can offer.

---

## 9. Scarcity, vacancy and expansion

Full occupancy is not a problem. It is the condition that makes ownership worth something.

Pressure is relieved in the order below, and geographic expansion is **not** a relief valve:

1. **Turnover.** Businesses fail, premises free up, someone takes over. A living village needs churn, not growth.
2. **New use of existing buildings.** `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §6 already permits new commercial use to activate a real building serving another purpose today. A dwelling can become a café — more commercial premises, no new geography.
3. **Geographic expansion.** Districts 3 through 15 are defined and are the growth path when growth is wanted. They are not a pressure valve: each district requires OSM data, references and the five-pass reconstruction, measured in weeks.

---

## 10. The portfolio documents the player

The portfolio records **the player's** professional competence, not the fictional organisation's.

A document stating *"has handled 18 staff situations, shows sound decision-making under financial uncertainty, weighs ethics against economics less well under time pressure"* follows the person, can be shown to an employer, and is a credential.

A document stating *"the restaurant has high techne, medium episteme"* describes a company in a game, disappears at bankruptcy, and is worth nothing to anyone.

**This conflicts with `DESIGN_DECISIONS_001.md` §7**, which locates the knowledge forms in the organisation. §14.3 records what is required.

### 10.1 Evidence provenance

Because §3 fixes where each form is acquired and proven, the portfolio's structure is not designed — it is derived. Library results are episteme. Metodköket tests are techne. Business scenarios are phronesis. The architecture *is* the measurement instrument.

This is why the five spaces are not decoration.

### 10.2 Two surfaces, one source

Per `SUPERSEDING_DIRECTIVE_002.md` §3.2: the **director's log** is the in-game surface — diegetic, prose, no numbers, no tiers. The **portfolio** is an export generated from it for institutional use. They are not the same object and must not share an interface.

---

## 11. Product shape

The product is built as a **course mode now, with multiplayer held open**.

No backend is built at this stage. But no design decision may foreclose a persistent shared world, because scarcity, ownership and accumulated reputation all require other players to mean anything.

### 11.1 Constraints that must be honoured from the start

- **Premises are individually identified.** Never "a café slot" — always a specific building with a specific OSM way ID.
- **Ownership is exclusive by design**, even while only one player exists.
- **Reputation persists** beyond a single venture and is externally legible.
- **Time does not depend on the player being logged in.** See LQ-04.
- **The portfolio is a portable format** from the outset, not a screen.
- **Economy is expressible as shared** — no assumption that the player is the only actor in the market.

### 11.2 What is not promised

Nothing in this document commits the project to a persistent world. It commits the project to not building one out.

---

## 12. Content sources and scaling

**Episteme is self-renewing.** Research publishes continuously, and the Vision Owner maintains a research feed in a separate product (Gustema, gusto.science). A library fed by current publication does not run dry — an unusual asset, since most serious games die of content starvation.

**Techne and phronesis are authored.** A new paper on fermentation yields library material and quiz material. It does not yield a scenario in which a player must weigh staff trust against margin under time pressure. That content is written, and that is where the content obligation sits.

### 12.1 Two items for the rights register

Both belong in `documentation/foundation/RIGHTS_REGISTER.md`:

1. **Copyright in research articles.** Metadata, titles and often abstracts may be displayed; full text generally may not without licence.
2. **External dependency.** If the library draws content from Gustema, what happens to the library when that service is unavailable? A fallback is required.

---

## 13. Open questions

Following the project's convention. None blocks the architecture above; each blocks a specific system.

- **LQ-01.** How many difficulty steps, and what is the abstract vocabulary for them? Numbers are prohibited by §4.4.
- **LQ-02.** How does a knowledge scenario's cost of error differ in kind from a judgement scenario's? §4.5 requires that error costs; it does not say whether the currencies differ.
- **LQ-03.** Does the difficulty wager affect only reward magnitude, or also which response options appear?
- **LQ-04.** **What is a unit of time?** Does the world run while the player is absent? How does a season relate to a session? Seasons, decay, delayed consequence and §11.1 all depend on this. No document in the chain answers it.
- **LQ-05.** Can two players share one kitchen shift? `MALTIDENS_HUS_EDUCATIONAL_ARCHITECTURE.md` assumes player brigades; framework and camera bible are written throughout for a single director. A class of students is inherently multiplayer.
- **LQ-06.** How is compressed replay (§5.1) authored — recorded simulation, or scripted consequence? The first is expensive and honest; the second is cheap and can lie.
- **LQ-07.** Which real qualifications do the four tiers map to, per subject area?
- **LQ-08.** How does the bank's assessment (§8.2) read previous decisions without exposing a hidden score? Framework §13 prohibits numeric ranking.
- **LQ-09.** How is a certification tier displayed without becoming the progression bar framework §5.9 forbids?
- **LQ-10.** **Reconciliation with the existing prototypes.** Working scenario and investment mechanics exist in the repository — `scenarios.ts`, `gameLogic.ts`, `resources.ts`, `InvestmentPanel.tsx`, `startFinancing.ts`, and the two untracked prototype projects. This document was authored **without reading them**. Where tested design conflicts with §4, the tested design should be presumed correct until examined.

---

## 14. Instruments required

This document is level 6 and cannot make these changes itself.

### 14.1 Framework §5.5 — reinterpretation

§5.5 states understandings arise through play, not through reading, lectures or quizzes. §2 above holds this true while permitting quizzes to produce episteme, on the ground that understanding arises in the scenario rather than in the study.

The framework is frozen at v2.0. Per `ADR_001_DIGITAL_TWIN_PHASE.md` §5.5, reinterpretation requires explicit Vision Owner authorisation.

### 14.2 Framework §5.9 — reinterpretation

§5.9 states the knowledge forms are not tiers to be unlocked and not represented as a progression bar. §7 introduces certification tiers for episteme only.

The rule is correct for phronesis and arguably for techne. It is wrong for episteme, where the profession itself has named levels. Reinterpretation requires the same authorisation.

### 14.3 Constitution §7 — amendment

§10 locates competence in the player. `DESIGN_DECISIONS_001.md` §7 locates it in the organisation.

This is an amendment, not a reinterpretation, and requires `DESIGN_DECISIONS_002.md` per that document's own governance clause.

### 14.4 ORDER 100 — acquisition model retired

The library-as-knowledge-shop model in ORDER 100 is inoperative. ORDER 100 already carries no binding force per `SUPERSEDING_DIRECTIVE_002.md` §3, so no instrument is required — but this document should be cited from it.

---

## 15. What this document does not do

- It does not specify the five taxonomies. `SUSTAINABILITY_AND_CAPITALS.md` remains required by C-01, M-03 and GQ-05.
- It does not specify time. See LQ-04.
- It does not specify multiplayer. See LQ-05.
- It does not authorise code.
- It does not modify the framework, the constitution or the directive. See §14.
- It does not supersede the tested prototypes. See LQ-10.

---

**End of Learning and Scenario Architecture.**
