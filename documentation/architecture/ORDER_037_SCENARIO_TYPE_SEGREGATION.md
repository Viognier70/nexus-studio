# ORDER 037 — Scenario Type Segregation

**Version:** 1.0  
**Status:** Awaiting Vision Owner approval. Not in force until approved.  
**Class:** Sprint order — production (precedence level 7)  
**Parent:** `documentation/game-design/LEARNING_AND_SCENARIO_ARCHITECTURE.md` §4.1, §4.6, §5  
**Registry:** register in `ORDER_REGISTRY.md` before execution, per `CLAUDE.md` rule 9  
**Recipient:** Claude Code  

---

## 0. Prerequisites

Verify the order number against `ORDER_REGISTRY.md`. If 037 is taken, stop and report — do not renumber.

`LEARNING_AND_SCENARIO_ARCHITECTURE.md` is in the repository at v0.1. If it is not, stop and report.

---

## 1. Purpose

`LEARNING_AND_SCENARIO_ARCHITECTURE.md` §4.1 states that knowledge scenarios and judgement scenarios must never be blended, and calls that blending *"the single failure mode that would destroy the assessment value of the whole system."*

The ORDER 036 LQ-10 audit found the failure already present. The 44 scenarios in the prototype share one schema — `outcomes[high|medium|low]` with numeric deltas — and carry no type field. Allergen handling and staff conflict are structurally indistinguishable.

This matters because the two types have different rules:

- **Knowledge scenarios** have correct answers. Food safety, allergens, hygiene, alcohol service law. A wrong answer must hurt, and relativism does not belong.
- **Judgement scenarios** have no correct answer. They are trade-offs, and both `CAMERA_AND_GAMEPLAY_BIBLE.md` §8.1 and the framework state so.

Without the distinction in the data, three later systems cannot be built correctly: the wager prohibition in §4.6, the three feedback kinds in §5, and the portfolio's evidence provenance in §10.1.

Every scenario authored from here adds to the cost of the fix. This order pays it now.

---

## 2. Add the type field

Add a required type discriminator to the scenario schema in `scenarios.ts`.

**Minimum vocabulary:**

- `knowledge` — has a correct answer or a correct set of components
- `judgement` — no correct answer; responses differ in consequence, not in correctness

Propose the field name and whether a third value is needed before applying it. A third value may be warranted for scenarios that are neither — pure economic events, external shocks, weather — but do not introduce one speculatively. If the 44 classify cleanly into two, use two.

TypeScript types must make the field required, so that a new scenario cannot be authored without it. That compile-time requirement is the durable part of this order.

---

## 3. Classify the 44

Read each scenario and assign its type. Report the classification as a table — scenario identifier, subject, assigned type, one-line reason — **before** applying it.

### 3.1 Classification rule

Ask: **is there an answer a competent professional would call wrong?**

- Yes → `knowledge`
- No, only trade-offs with different costs → `judgement`

### 3.2 Where the honest answer is "unclear"

Some will not classify cleanly. A scenario about whether to serve a guest who has had enough is partly law and partly judgement.

**Do not force these.** Report them as a separate list with the ambiguity described. They are a Vision Owner decision, and they are more interesting than the clear cases — they may indicate scenarios that should be split in two.

### 3.3 Do not rewrite scenario content

This order classifies. It does not rebalance, reword or restructure any scenario. Where a scenario appears to blend both types in one situation, report it under §3.2 rather than fixing it.

---

## 4. Report the consequences of the classification

Once the classification is agreed and applied, report without changing anything:

1. **The split.** How many knowledge, how many judgement, how many unclear.
2. **Wager eligibility.** Per §4.6, allergens, hygiene, fire safety and anything bearing on physical harm permit no wager. List which scenarios fall in that set under the classification.
3. **Feedback implications.** Per §5, the three types need different feedback. The prototype currently delivers immediate static feedback with numeric deltas to all of them. List which scenarios would need the compressed-replay treatment of §5.1 instead of an immediate result.
4. **Balance.** If the 44 are heavily weighted toward one type, say so. A game claiming to develop phronesis with four judgement scenarios out of 44 would not support that claim.

---

## 5. What this order does not authorise

- Rewriting, rebalancing or rewording any scenario.
- Authoring new scenarios.
- Implementing the wager mechanic, difficulty selection, or compressed replay.
- Changing the outcome model (`outcomes[high|medium|low]`) or any numeric delta.
- Changing `resources.ts`, `gameLogic.ts`, `InvestmentPanel.tsx` or `startFinancing.ts` beyond what the type field strictly requires.
- Any change to `world.ts`, OSM ingest, road roles, traffic, camera or renderer.
- Any change under `documentation/foundation/`.
- Resolving the §3.2 unclear cases. Those are reported, not decided.

---

## 6. Acceptance criteria

- The type field exists in the scenario schema and is **required** at compile time.
- All 44 scenarios carry a type, or are listed under §3.2 as unclear with the ambiguity described.
- The classification table was reported and approved before being applied.
- No scenario's content, outcomes or numeric deltas changed.
- The four §4 reports are delivered.
- `npm run typecheck` and `npm run build` green.
- One commit per section, no squash.

---

**End of ORDER 037.**
