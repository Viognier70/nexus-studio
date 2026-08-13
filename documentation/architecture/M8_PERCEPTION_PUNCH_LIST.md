# M8 perception punch-list (per ORDER 079)

**Purpose.** Every perception item that will land on the Vision Owner's plate at M8. One row per point: where it came from, what specifically is being assessed, and in what game state it appears when the Vision Owner is looking for it. Read this before entering M8 so the length of the gate is visible.

**Sources.** ORDER 047 §9 (the six items M8 was built around), ORDER 052 §10, ORDER 051 §8, ORDER 049 §8, ORDER 046 §6, plus milestone-specific residuals routed to M8 in `STRATEGIC_TRACK_MILESTONES_PROPOSAL.md` §6.3. **Rows 22–25 added 2026-08-13 under ORDER 084** from the first M8 playthrough pass (`#playtest=1`, day 1).

**Total: 25 items** (21 original + 4 from M8 pass 1). Split by shape at §3.

---

## 1. Punch-list

| # | Source | What is being assessed | Game state when it appears | Autonomous half already landed? |
|---|---|---|---|---|
| 1  | ORDER 047 §9 #1 (M8 built-in) | Instruments make it possible to see how the evening is going without reading every line | Dinner service in progress, player watching instruments panel + room | Panels shipped (ORDER 047); "at a glance" is the sight-read |
| 2  | ORDER 047 §9 #2 (M8 built-in) | Stream is readable at a glance rather than a wall | Any tick during service with events flowing | Sizing mechanic verified in M5 DoM test; "readable" is the sight-read |
| 3  | ORDER 047 §9 #3 (M8 built-in) | Service carried several different scenarios (not the same opener twice) | End of one 15-min dinner where ≥ 2 scenarios fired | Scenario diversity is autonomous (`firedScenarioIds` no repeats); "different in feel" is the sight-read |
| 4  | ORDER 047 §9 #4 (M8 built-in) | Answering a scenario produced a visible movement attributable to the answer | Immediately after RESOLVE_SCENARIO, watching instruments / rep bar | M6 mechanic verified via capital + rep deltas; "visible + attributable" is the sight-read |
| 5  | ORDER 047 §9 #5 (M8 built-in) | Morning investment recognisable in the evening account | Reading the evening-account paragraph on a day with morning SET_POLICY changes | Paragraph names morning changes (ORDER 047 §6 code); "recognisable to a player" is the sight-read |
| 6  | ORDER 047 §9 #6 (M8 built-in) | Collapse reads as consequence, not as accident | Post-collapse state — a service that fired `serviceCollapsed=true`, evening account showing the collapsed branch | Collapse formula shaped so weakest × strain drives it (ORDER 046 §1); Vision Owner reads whether it feels earned |
| 7  | M1 DoD 4 (proposal §6.3) | Player can articulate what they would try differently after a three-day playthrough | End of day 3 fresh state, no dev tools, Vision Owner debrief | Not rewritable — pure prose/self-report; genuine human judgment |
| 8  | M5 DoD 2 (proposal §6.3, M5 report §7) | Rhythm reads in the room *at a glance* without opening a panel | Mid-dinner service, staff-puck colour ring visible in room camera | Ring installed under ORDER 078 driven by `state.day.serviceRhythm`; the "at a glance" claim is the sight-read |
| 9  | M6b DoD 1 (M6b entry in proposal §1) | Sentence banks textually name their cause, not only via `causeTag` metadata | Reading event stream during a 3-day dinner sample | Jaccard divergence ≥ 0.30 is autonomous (M6 landed 0.219); textual quality is the sight-read |
| 10 | M6b DoD 2 (M6b entry in proposal §1) | Every consequence line's TEXT names its condition — Vision Owner sample-read of 20 lines | Post-service, reading event-stream backlog | Coverage ≥ 80 % `causeTag` verified in M6 (82.1 %); textual "names its condition" is the sight-read |
| 11 | ORDER 051 §8 #1 (M4 acceptance) | Choosing a supplier felt like a real trade-off, not a quality dial with names on it | Morning BUY_STOCK panel across three days | Supplier catalogue with 4-axis numbers landed (M4); "felt real" is the sight-read |
| 12 | ORDER 051 §8 #3 (M4 acceptance) | Watching plates run down during service was worth watching | Mid-dinner with a menu composed, PlatesRemainingPanel visible | Panel installed under M4; "worth watching" is the sight-read |
| 13 | ORDER 051 §8 #5 (M4 acceptance) | Ecological reading pointed at something the player actually did | End-of-day capital reading after a BUY_STOCK from `organic` or `local-veg` | `ecoDelta` per unit is mechanical (M4); "reading points at what you did" is the sight-read |
| 14 | ORDER 051 §8 #6 (M4 acceptance) | Morning planning and evening outcome felt like the same decision, seen twice | Comparison of morning MorningMenuPanel state and evening account | Evening account carries menu + activity + morning-change lines (M2 + M3 + M4); the "same decision" phenomenology is the sight-read |
| 15 | ORDER 049 §8 #1 (M7 acceptance) | Investing in an area produced a question from that area, made studying it worthwhile | Dinner service with a scenario firing a professional question after morning INVEST | Requires M7a (chef service-questions) + multi-role M7c to fire the "from that area" attribution |
| 16 | ORDER 049 §8 #2 (M7 acceptance) | The question was real — answerable from professional knowledge, traceable to a source | Reading a pending-question overlay with citation | 272 chef questions approved + citations landed; realness of an individual question is the sight-read |
| 17 | ORDER 049 §8 #3 (M7 acceptance) | Readiness explained an outcome the player could not have explained before | Post-scenario answer + evening account | Readiness display is M7 scope; explanatory power is the sight-read |
| 18 | ORDER 049 §8 #5 (M7 acceptance) | Losing the restaurant felt like a consequence; returning to school felt like the way back | Post-bankruptcy transition (M7b bank-meeting scene) | Blocked pending M7b answer-to-loan mapping + build |
| 19 | ORDER 049 §8 #6 (M7 acceptance) | The moments where something was at stake felt like moments | Any scenario with a wager or a bank-meeting decision | Requires M7b + subjective judgment |
| 20 | ORDER 052 §10 #4 (M5 acceptance) | Room's rhythm was visible while it was happening | Mid-service with the puck rings visible | Same as row 8 — M5 mechanic + M8 sight-read (this is the same claim from the M5-source side) |
| 21 | ORDER 052 §10 #5 (M5 acceptance) | Short prep produced running about the player could see | Mid-service after a scripted SKIP_PREP or morning changes | Staff-puck load reading + prep-readiness panel installed under ORDER 078; "running about you could see" is the sight-read |
| 22 | ORDER 084 — M8 pass 1 finding (2026-08-13) | **Morning panel row does not adapt to wider viewports.** Overlap between Team / Investment / Scale-down / Activities / Menu returns above the layout's tuned 1280×720. Also **reopens M1 DoD 3 Defect B** — original closure in commit `bebac5c` only inspected 1280×720. | Morning of any day on a viewport wider than the developer's default (e.g. 1920×1080). | Nothing autonomous yet — fix requires responsive layout (flex/grid on morning surfaces per ORDER 050 Addendum A §6.3), plus a DOM regression test at multiple viewport widths. Row is BOTH an M1 defect-B reopen and an M8 sight-read item. |
| 23 | ORDER 084 — M8 pass 1 finding (2026-08-13) | **Game allows OPEN_SERVICE with empty stock and no warning.** The player can open dinner with no menu composed and no stock bought; nothing surfaces the state at the decision moment. Consequences appear later (guests walk, revenue floors) but not where the mechanic should teach. | Morning → OPEN_SERVICE dispatch, without a prior COMPOSE_MENU or BUY_STOCK. | Mechanic-level: the reducer already knows `state.menu.length === 0` and `Object.values(state.stock).every(v => v === 0)`. Missing: a UI-level pre-open confirmation or a stream-line at t=0 ("Doors open — pantry is empty"). Autonomous check possible once the guard exists (assert an event or a blocking dialog appears). |
| 24 | ORDER 084 — M8 pass 1 finding (2026-08-13) | **Reputation floors at 0.00 with no visible recovery path.** Once `state.reputation` hits 0.00 the reputation loop (ORDER 043 §4) offers no legible route back up. Cannot distinguish from outside whether recovery is missing (mechanic gap) or firing invisibly (display gap). | Any day after a run of collapsed services or repeated bad-scenario answers has driven reputation to 0.00. | Diagnostic first, then design decision: measure whether `state.reputationCeiling` and `state.reputationTarget` lift under any conditions from a 0.00 floor across a scripted N-day run. If yes → display gap (surface a "how do I lift this" reading). If no → mechanic gap (recovery function needs a non-zero source when reputation itself is zero). |
| 25 | ORDER 084 — M8 pass 1 finding (2026-08-13) | **Chef-question tone reads as research prose mid-service.** Bank-drawn questions from the 272-approved chef corpus (ORDER 049 §7 step 3, verbatim from gusto.science TRIAD articles per §3) carry the source register — extended clinical/academic sentences — into a moment where the player is inside a pass. Tone doesn't fit ORDER 048 §5's intent of "knowledge tested at the moment it is needed by the person who needs it." | Any dinner where walk-in-of-five (A) / time-pressure (A) / moral-dilemma (A) fires and its `professionalQuestion` overlay appears. | Verbatim-source policy is a governance decision (ORDER_REGISTRY Observation 6: "Content of type 'verbatim': pre-written scenarios in `articles.scenario_chef` and sister columns are used as-is; no translation, no adaptation"). Fix either (a) revises the verbatim policy for the service-question surface — allow tone-adjustment per sender role, or (b) filters the bank to the subset whose source register already reads as a spoken question. Whichever path, needs a Vision Owner report gate before build. |

---

## 2. Two items ORDER 077 §2 called out that M4a already closed

These are here for the receipt trail — they are NOT part of the M8 punch-list. Included so the reader can verify the promotion from M8-block-of-4 to M8-block-of-2 that ORDER 079 §M4a closed.

- ORDER 051 §8 #2 — *"Setting a price felt like a bet on how the room would respond."* Closed autonomously by M4a DoD 1 (attractiveness weighting shifts demand): a chicken-plate at 100 SEK sold 29 units vs a pork-plate at 400 SEK sold 0 units in the same 15-min dinner. The mechanic is now proven.
- ORDER 051 §8 #4 — *"Running out of a dish was a consequence he could trace to his own pricing."* Closed autonomously by M4a DoD 2 + M4 DoD 3: `guest_substituted` and `guest_walked` events fire when a target dish runs out, both are named traceable outcomes.

---

## 3. Shape of the gate

**25 items total, grouped by how they close:**

- **6 items** — ORDER 047 §9's original list (rows 1–6). These are M8's founding purpose; unavoidable.
- **1 item** — M1 DoD 4 (row 7). Pure articulation test — not rewritable, not reducible to any mechanic.
- **2 items** — M5 DoD 2 + ORDER 052 §10 #4 (rows 8, 20). Same claim from two sources — the rhythm ring reads at a glance. Should count as one perception check, two ledger entries.
- **2 items** — M6b DoD 1 + DoD 2 (rows 9, 10). Both about prose specificity in sentence banks. If M6b's Jaccard ≥ 0.30 target lands autonomously, the sample-read becomes a confirming pass rather than an evaluating one.
- **4 items** — ORDER 051 §8 items 1, 3, 5, 6 (rows 11–14). All about M4's material feel. Panels shipped; Vision Owner reads whether they carry weight.
- **5 items** — ORDER 049 §8 items 1, 2, 3, 5, 6 (rows 15–19). All M7-tier; some blocked pending M7b/M7c. Half will be gated by M7 landing, not by M8 itself.
- **1 item** — ORDER 052 §10 #5 (row 21). Prep-readiness reading visible in the room.
- **4 items — M8 pass 1 findings, ORDER 084 (rows 22–25).** Panel overlap on wide viewport (also M1 defect-B reopen), OPEN_SERVICE with empty stock, reputation floors at 0.00, chef-question tone. Each requires either an ORDER-sized fix or a Vision Owner scope call before pass 2.

**Bundling recommendation.** Treat rows 8 + 20 as one item and rows 9 + 10 as one closely-related pair. Row 22 double-counts as an M1 defect reopen but only requires one sight-read. That collapses the effective count from 25 to ~21 distinct perception checks. Rows 15–19 (M7-tier, five items) only enter M8 after M7 lands; if the strategic slice ships without a working bank meeting they drop from the list entirely. Rows 22–25 are pass-1 blockers — none of them close by re-reading, all four need a fix or a scope decision before pass 2.

**Practical M8 length.** Under the bundling above, a fresh three-day playthrough that touches every mechanic and lets the Vision Owner sit with the reading will run ~30–45 minutes plus debrief time per pass. Pass 1 (2026-08-13) surfaced 4 blockers; expect a second pass after they're addressed, then likely a third pass to verify.

## 4. What's *not* in the punch-list

- **ORDER 046 §6 items 1–4** — subsumed by ORDER 047 §9; already reflected in rows 5, 6.
- **ORDER 050 §8 items 1–6** — closed by M2 + M3 autonomous DoDs (three-column effects visible, ledger reconciles, agency cost immediate); no perception residual routed to M8.
- **ORDER 049 §8 #4** — "difficulty rose enough that holding the restaurant demanded knowing the field." Long-arc claim requiring a multi-hour session; deferred as a post-M8 quality bar, not blocking sign-off.
- **M0 items** — all autonomous now (pixel-sampling via visual-regression harness under ORDER 070); no perception residual routed to M8.

## 5. Living document

Every subsequent order that defers a perception judgment to M8 must add its row here. The list is source-of-truth for what M8 has to close. If a row moves to autonomous verification, mark it closed with the commit hash and the mechanism (do not delete — the acceptance trail matters).
