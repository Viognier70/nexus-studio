# M7a — Chef service-questions (report gate under ORDER 080)

**Status:** Report gate. Opens implementation when committed.
**Parent:** `M5_MISE_EN_PLACE_AND_RHYTHM_REPORT_ORDER_078.md` §9 (the M7 split recommendation the Vision Owner accepted); `ORDER_049_THE_KNOWLEDGE_ENGINE.md` §2 + §7 step 3.
**Milestone target:** `STRATEGIC_TRACK_MILESTONES_PROPOSAL.md` §M7 (M7a is the "chef service-questions unblocked" portion; M7b is the bank-meeting scene, blocked; M7c is multi-role question coverage, blocked pending three knowledge-generate runs).

---

## 1. Purpose

Close M7's chef-service-question DoD portion: professional questions fire from the bank during dinner service, correct answers write to enablers, and enabler tallies feed the ceiling chain from ORDER 049 §2.1. Nothing new to build — the mechanism is complete; M7a is the autonomous-DoD trail that proves it.

## 2. What's already built (not adding, verifying)

- Bank of 272 approved chef questions in `reports/knowledge/questions.json` (ORDER 049 §7 step 2 committed 6c09e29).
- `pickBankQuestion` in `src/content/knowledgeBank.ts` — draws by register + sender + deterministic index.
- `BankQuestionRef` + `ProfessionalQuestion` types in `scenarios.ts` §99–§136 with `correctEnablerWrite: EnablerWrite` — every question carries its enabler-write target.
- 3 of 6 scenario choices in `scenarios.ts` carry `professionalQuestion` (walk-in-of-five, closing-menu-early, and one other) — questions fire on 3/6 scenario draws, roughly.
- Answer flow in `reducer.ts` §2388–§2500 (`answerProfessionalQuestion`) — right answer writes to enabler + records history + optionally fires a scenario line at t+4s. Wrong answer decays the SAME enabler tally the correct answer would have written (ORDER 049 §2 amendment 2026-08-09: "knowledge that failed regresses").
- Ceiling chain in `reputation.ts` §193 — `reputationCeiling` drifts toward a target that reads from `state.enablers.*.episteme`.
- Overlay UI in `ScenarioOverlay.tsx` §121–§130 — renders question body + options when `scenario.phase === 'question'`.

## 3. What M7a adds

Only DoD tests. No new mechanics, no new UI. If the tests fail to prove the flow, the fix goes on the mechanism side, not on M7a's scope.

## 4. Deferred to M7b / M7c

- **M7b — bank meeting scene.** ORDER 049 §5.1: first-application + post-bankruptcy scene where the bank director draws weighted questions and returns a loan tier. Blocked pending an answer-to-loan mapping report (ORDER 049 §7 step 8 says "report before building").
- **M7c — multi-role question coverage.** Current bank is 272 chef-only questions. Sommelier / värd / servitör need one generation-script run each. Not blocked; just not run.
- **Bankruptcy return loop (ORDER 049 §5).** Interacts with M7b's bank meeting.
- **Readiness display (ORDER 049 §4).** Post-scenario "what you had prepared vs what the situation required" panel — deferred.
- **Difficulty progression (ORDER 049 §2.1 difficulty rise).** Long-arc claim.

## 5. DoD verification

Autonomous tests in `src/strategic/simulation/__tests__/m7a.test.ts` via INFRA-2 harness:

1. **DoD 1 — a professional question fires during a scripted dinner.** Fixed seed, three days, scenarios triggered on each day. Assert at least one tick has `state.scenario.pendingQuestion !== null` OR at least one `ANSWER_QUESTION` dispatch happened in the harness. Direct proof the bank/scenario coupling fires end-to-end.
2. **DoD 2 — a correct answer writes to the target enabler.** Force a scenario that carries a `professionalQuestion` (walk-in-of-five, choice A), harvest the pending question, dispatch `ANSWER_QUESTION` with the correct option's index, assert the corresponding enabler's tally increased.
3. **DoD 3 — the ceiling chain moves.** After a correct-answer enabler write, tick the harness far enough for the reputation-ceiling drift to catch up (`REP_CEILING_DRIFT_PER_TICK` runs per tick). Assert `state.reputationCeiling` is higher at end than at start. This proves the full episteme → ceiling chain from ORDER 049 §2.1.

Plus typecheck + build green; full sim suite unchanged.

## 5.a. Landing (2026-08-13)

DoD tests committed under ORDER 080. All three pass:

- **DoD 1** — walk-in-of-five (choice A) drew a värd-tagged bank question (`sourceBankId=fe0f64f9-…::episteme::13`) at the first triggered scenario in the scripted dinner. Question overlay-shaped payload — non-empty body, options with the correct-flag set.
- **DoD 2** — one correct answer dispatched. Cultural episteme delta +0.048 (matches the `amount: 0.05` write on walk-in-of-five's `correctEnablerWrite` minus a tick or two of overnight decay). Scientific episteme delta 0.000 — time-pressure didn't fire this run because the RNG picked walk-in-of-five first, but the mechanic proved on the register that was fired.
- **DoD 3** — reputationCeiling with answers 0.5548 vs without 0.5519 — the ceiling drift is slow but the direction is right (episteme write → higher target → ceiling drifts up). The comparison holds even when both runs cross the day rollover's overnight-decay step because decay applies to both equally.

The test file (`__tests__/m7a.test.ts`) drives the reducer directly rather than through `runHarness` because ANSWER_QUESTION needs to fire reactively when `pendingQuestion` becomes non-null. Introduced a small local `driveUntil` helper that behaves like the harness but also dispatches ANSWER_QUESTION on each tick where a pending question is present.

M7a closes. M7b (bank meeting) and M7c (multi-role coverage) remain per §4.

Full sim suite 34 files / 448 tests green; typecheck + build green.

## 6. What "opens" this gate

Under ORDER 080 §4 cohesive-block execution the report gate opens when this file is committed. Implementation proceeds as DoD tests only. If the flow is broken end-to-end, the tests will surface where — and the fix goes into the existing mechanism, not into M7a's scope.
