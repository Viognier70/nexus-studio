# M6 Report Gate — Cause-Aware Texture

**Status:** Filed 2026-08-13 under ORDER 076 as the report gate that
must open before M6 build proceeds.
**Milestone:** M6 (Cause-aware texture), per
`STRATEGIC_TRACK_MILESTONES_PROPOSAL.md` §2.
**Parent:** ORDER 052 §9 step 1 (cause-aware sentence banks).

## 0. Purpose

Every stream line names its condition so consequences read as
causal, not decorative. Vision Owner 2026-08-10:

> "A butter knife was missing — what does that mean? It is the
> consequence of having taken on cheaper staff, or staff who do
> not care." A line that reports a symptom without its cause is
> not worth the space it takes.

The M6 mechanism is a structured `causeTag` field on every stream
event, extended from the current 3-value tag (`'ignorance' |
'strain' | 'both'`) to a real vocabulary of named conditions, PLUS
a `causeChainId` that links consecutive events triggered by the
same underlying condition. Together they let the DoD 3 assertion
run autonomously: "there exists a chain of ≥ 3 events all sharing
one causeChainId."

## 1. Cause vocabulary

Extending `EventStreamCauseTag` from 3 values to a labelled set.
Each value names a concrete condition the sim can detect at the
moment a line fires:

```ts
export type CauseCondition =
  // Team conditions
  | 'thin_team'              // fewer members than needed for load
  | 'low_competence'         // team competence below threshold on failing axis
  | 'poor_morale'            // morale < 0.35
  // Prep conditions
  | 'short_prep'             // prep length ≤ 60 s (skipped or minimal)
  // Policy conditions
  | 'morning_change'         // player changed a policy this morning
  | 'low_ingredient_tier'    // ingredientTier === 'grund'
  | 'active_scale_down'      // any scaleDown flag set
  // World conditions
  | 'weather_adverse'        // weather.precipitation !== 'clear' OR windMS > 8
  | 'world_factor_negative'  // any negative-multiplier world factor active
  // Retained legacy
  | 'ignorance'              // fallback: competence-driven ambient event
  | 'strain'                 // fallback: load-driven ambient event
  | 'both';                  // fallback: both above
```

The three retained values (`ignorance`, `strain`, `both`) exist so
the existing sentence banks keep firing during migration. New
lines authored under this order attach a specific condition; legacy
lines are re-labelled incrementally.

## 2. causeChainId

A short opaque id (base36 of the tick where the chain started)
linking events caused by the same underlying condition. Set on the
first event of a chain; propagated to subsequent events that name
the same `causeTag` within a short window (≤ 20 sim-seconds).
Cleared when the tick's cause vanishes.

Data model:
```ts
export interface EventStreamEntry {
  at: number;
  text: string;
  category: EventStreamCategory;
  causeTag: CauseCondition | null;    // was EventStreamCauseTag
  causeChainId: string | null;         // NEW
  sustainability: SustainabilityKey;
  kind: string;
  scenarioId: string | null;
}
```

State model (top-level, tracks currently-active chains):
```ts
activeCauseChains: { causeTag: CauseCondition; chainId: string; startedAt: number }[];
```

Chain rules:
1. On stream-entry emission, if `causeTag` matches an active chain
   AND `simTime - chain.startedAt <= 20`, reuse that `chainId`.
2. Otherwise assign a fresh `chainId = state.tick.toString(36)`.
3. Every 20 sim-seconds without a re-firing, chains expire.
4. If the condition itself vanishes (team hired, morale recovered,
   scale-down retracted), the chain expires at the next tick.

## 3. Cause-detection rule per tag

The rule that returns the `CauseCondition` for a firing event, run
in `eventStream.ts` at emission time. Applied in order; first
matching condition wins so the most specific label attaches.

| condition | detection rule |
|---|---|
| `active_scale_down` | any of `state.scaleDown.{closedLunch, closedDinner, shortenedMenu, thinWineList}` |
| `poor_morale` | `state.morale < 0.35` |
| `low_competence` | `weakestAxis(team).max < 0.35` (per-axis MAX across team is low) |
| `thin_team` | `team.members.length < 3` |
| `short_prep` | current-service prep ran ≤ 60 s (SKIP_PREP or manual) |
| `morning_change` | `state.day.morningPolicyChanges.length > 0` AND event fires within first ~5 min of service |
| `low_ingredient_tier` | `state.policies.ingredientTier === 'grund'` |
| `weather_adverse` | `state.day.weather.precipitation !== 'clear' \|\| state.day.weather.windMS > 8` |
| `world_factor_negative` | `state.day.worldFactors.some(f => negative-multiplier factor)` |
| `ignorance` / `strain` / `both` | fallback if no specific condition matches |

Detection is cheap — all reads from `state` fields, no per-guest
iteration.

## 4. pickParagraph wiring (closes M6 DoD's paragraph divergence)

Currently `computeEveningAccount` passes `drewCapital: null` to
`pickParagraph`, so the paragraph doesn't vary by scenario theme
even though scenario choice moves capitals. M6 wires this properly:

1. `state.day.drawnCapital` set at the LAST resolved scenario's
   drawnTheme (already tracked on `state.scenario.drawnTheme` per
   scenario; copy to `state.day.drawnCapital` at resolution time).
2. `computeEveningAccount` reads that and passes it to
   `pickParagraph`.
3. `pickParagraph` branches (`good`, `thin`, `mediocre`,
   `collapsed`) get one 2-3-sentence variant per capital:
   `good_social`, `good_ecological`, `good_economic`, etc. Picks
   the variant matching drawnCapital when set; falls back to the
   current single variant when null.

Content authoring: ~9 new short variants (3 capitals × 3 branches
that don't already vary by capital). Written in the observer's
voice per ORDER 048 §2 register.

## 5. DoD verification

Per proposal §2 M6 DoD (§6.2 rewrite):

1. Sample 20 lines from a real dinner service across three days —
   INFRA-2 test runs a scripted 3-day dinner and captures every
   emitted `state.eventStream` entry.
2. Every consequence line (`category === 'outcome'` or a specific
   subset of ambient lines) names its condition — assertion:
   `.causeTag !== null` AND `.causeTag !== 'ignorance' | 'strain' | 'both'` (must be
   a specific named condition) for ≥ 80 % of consequence lines.
   Legacy fallbacks tolerated at 20 %.
3. Autonomous DoD 3 (per §6.2 rewrite): "there exists a chain of
   ≥ 3 events all sharing one causeChainId within the run."

Plus the pickParagraph divergence baseline check (see
ACES_MODEL_FINDINGS §M6 baseline):
4. Multi-run scenario-choice divergence: three parallel runs with
   different scenario-response strategies (A/B/C) produce evening
   account text with Jaccard token distance ≥ 0.15 between at
   least one pair. Baseline 2026-08-13 was 0.000; M6 target 0.30
   from proposal §6.2, initial M6 landing ≥ 0.15 acceptable with
   note.

## 6. Content scope

Minimal content authoring for M6 close:
- Extend `EventStreamCauseTag` type (already 3 values → new set).
- Add causeChainId tracking in `eventStream.ts`.
- Add detection function in `eventStream.ts` (one function, uses
  `state` fields, returns `CauseCondition`).
- Existing sentence banks stay as-is (their text already reads as
  the symptom). This order only ADDS the cause metadata, not
  rewrites the sentences.
- pickParagraph capital-variant branches: ~9 new short variants
  in `content/eveningAccount.sv.ts`.

Rewriting the sentence banks themselves to name causes textually
(as the Vision Owner butter-knife example suggests) is a
CONTINUATION of this order, not part of M6 close. M6 gives the
mechanic; content evolves per Vision Owner review.

## 6.a. Landing amendment (2026-08-12) — per-choice aside

While wiring §4, the divergence check landed at exactly 0.000: with
the same seed, `state.scenario.drawnTheme` is drawn from the same
RNG stream regardless of choice A/B/C, so all three strategies read
the same `state.day.drawnCapital` at evening and thus the same
capital-flavoured lead sentence. The drawn-capital mechanism is
correct — it just doesn't carry choice information.

Amendment: `state.day.lastScenarioChoice` is now also set at
`RESOLVE_SCENARIO`, threaded into `pickParagraph`, and consumed by
one per-choice aside sentence (`CHOICE_ASIDE` in
`content/eveningAccount.sv.ts`) appended to the branch paragraph.
Three short observer-voice asides — demanding read (A), generous
read (B), sidestep (C) — provide the textual variance the
divergence check measures without exploding the sentence bank into
27 variants. Deeper textual weaving of the specific scenario named
by name remains the deferred continuation of §6.

Measured landing 2026-08-12: `dAB=0.219 dAC=0.202 dBC=0.212
max=0.219`. Clears the ≥ 0.15 first-cut floor; ~0.08 below the
0.30 eventual target, which is expected to close as the sentence
banks themselves are rewritten under future orders.

## 7. Out of scope

- Rewriting all existing sentence banks (deferred, iterative).
- UI display of causeChainId (would clutter the stream; the tag
  is for the ledger / evening account / autonomous tests).
- Supplier-short-delivery cause (system not built yet — M4).
- Cross-service chain persistence (chains scoped to service).
- Legal / typing migration of scenario-driven capitals to the new
  cause vocabulary (they already carry `sustainability`, that stays).

## 8. What "opens" this gate

Under ORDER 076 cohesive-block execution the report gate opens
when this file is committed. Vision Owner may course-correct on
the cause vocabulary or thresholds at any time. Implementation
proceeds against the values above unless overridden.
