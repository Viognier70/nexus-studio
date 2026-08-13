# M2 Report Gate — Activity Model (ORDER 050 §7 step 1)

**Status:** Filed 2026-08-13 under ORDER 075 as the report gate that
must open before M2 build proceeds.
**Milestone:** M2 (Morning Legibility — activities visible), per
`STRATEGIC_TRACK_MILESTONES_PROPOSAL.md` §2.
**Parent:** ORDER 050 §7 step 1 (Activities and the Ledger — activity
list with three-column effects).

## 0. Purpose

Replace the abstract theme-wager retired in ORDER 050 §5 with a
concrete surface where the player picks named work each morning.
Every activity's effect on the three sustainability capitals is
visible on the card as three numbers; no card labels itself as
"serving" any one capital (ORDER 050 §4 constraint — the numbers
are the teaching).

## 1. Data model

```ts
export type CapitalDelta = {
  economic: number;   // SEK, positive = income, negative = cost
  social: number;     // [-0.05, +0.05], capital-scale
  ecological: number; // [-0.05, +0.05], capital-scale
};

export interface Activity {
  id: string;               // stable identifier for the ledger causeId
  name: string;             // player-facing (English per CLAUDE.md rule 7)
  description: string;      // one line, what the activity is
  costSek: number;          // upfront cost paid when the activity is picked
  effect: CapitalDelta;     // applied at end-of-day, alongside wages
  availability: 'always' | 'weekly';  // 'weekly' = can only pick once per 7 days
}
```

Rationale:
- Cost is separated from `effect.economic` so the ledger line at
  pick-time reads as "cost of activity X" (category `other`, negative
  amount) and the end-of-day activity effect posts as a separate
  ledger line (category `other`, signed by `effect.economic`).
- Three-column effect capped at ±0.05 per capital per activity so
  no single choice swings the game; three activities can shift a
  capital by ±0.15 which is meaningful but recoverable.
- `availability: 'weekly'` allows exceptional activities (guest chef,
  audit) that shouldn't be picked every day.

## 2. Initial activity catalogue (cycle-1)

Six activities to demonstrate the mechanic. Numbers are proposals;
the numbers are the teaching per ORDER 050 §4 and are the load-
bearing part of this report — tuning them changes what the game
teaches.

| id | name | cost SEK | econ | social | ecolog | availability |
|---|---|---|---|---|---|---|
| `train-service` | Train the service team | 3 000 | −3 000 | +0.04 | 0 | always |
| `runner-shift` | Bring in a floor runner | 1 800 | −1 800 | +0.03 | 0 | always |
| `local-sourcing` | Switch tonight's produce to local | 2 500 | −2 500 | +0.02 | +0.05 | always |
| `wine-tasting` | Team wine tasting hour | 2 000 | +1 000 | +0.02 | 0 | always |
| `guest-chef` | Guest chef for the evening | 8 000 | +6 000 | +0.02 | 0 | weekly |
| `compost-audit` | Kitchen composting audit | 4 000 | −4 000 | +0.01 | +0.04 | weekly |

**Reading conventions.**
- `econ` shown on the card is the NET impact after cost (some
  activities pay back, others don't). Cost is charged immediately;
  `econ` posts at end of day.
- `social` and `ecological` are scaled to the [0,1] capital range
  so the number on the card and the movement it produces match
  directly. +0.04 social = "moves social capital 0.04 up tonight."

Notes on the specific choices:
- `train-service` and `runner-shift` are both social-forward but
  cost different amounts; player can compare "buy talent" vs "buy
  attention" at different price points.
- `local-sourcing` is the ecological archetype but has a real
  economic cost — teaches the ecological/economic tension without
  labelling it.
- `wine-tasting` is the positive-econ activity — some choices grow
  the till, which the pure-cost activities above wouldn't teach on
  their own.
- `guest-chef` weekly — high cost, meaningful econ payoff. Marks
  "special-occasion" investment. Rate-limited so it can't dominate.
- `compost-audit` weekly — the ecological cousin of guest-chef.
  Rate-limited to keep the eco-gain honest (grinding it every day
  would trivialise the ecological reading).

## 3. Player interaction

**Morning:** `MorningActivityPanel` renders a card per available
activity. Player clicks up to 3 cards (activity selection state
tracked on `state.day`). Cost posts immediately to the till + ledger
(`other` category, negative amount, cause `"Activity: ${name}"`).
Selection latches until end of day; no re-picks.

**End of day:** as part of the existing evening-close pipeline,
apply each chosen activity's `effect` to capitals (`social`,
`ecological`) and post one `other` ledger line per activity for its
`econ` amount.

**Evening account:** the paragraph selector prepends "Idag valde du
{activity.name}" style sentences before the observer's paragraph if
one or more activities were picked. This is what closes DoD 3.

## 4. Reducer surface

New action:
```ts
| { type: 'PICK_ACTIVITY'; id: string }
| { type: 'UNPICK_ACTIVITY'; id: string }
```

Constraints:
- Only fires when `state.day.period === 'morning'`.
- Rejects `PICK_ACTIVITY` if already at 3 selections.
- Rejects `PICK_ACTIVITY` if the activity is 'weekly' and picked
  within the last 7 days (recorded in `state.day` as an activity
  history).

New state fields on `DayState`:
```ts
pickedActivityIds: string[];               // today's picks, reset at rollover
```

New state fields at top level:
```ts
activityHistory: { id: string; pickedOnDay: number }[];  // for weekly gate
```

## 5. DoD verification

Per proposal §2 M2 DoD:

1. Player picks 1–3 activities morning of day 1 — enforced by
   reducer + tested via harness dispatching PICK_ACTIVITY actions.
2. Every card shows econ / social / ecological effect visually —
   MorningActivityPanel renders three labelled fields per card;
   DOM assertion via testing-library.
3. Evening account names at least one chosen activity by name —
   asserted in test via string-includes check on the paragraph.
4. No activity states which sustainability it "serves" — the six
   proposed activities' `name` and `description` strings do not
   include the tokens `social`, `ekonom`, `ekolog` etc. Grep
   assertion in test.

## 6. Out of scope for M2

- Rich activity graphics / iconography — plain text card is enough
  for M2 legibility.
- Activity persistence across sessions — starts fresh each session.
- Weekly gate reset semantics if a session runs > 7 days (probably
  a moot case for now).
- Ledger click-through from evening account → activity line — M3
  deliverable already noted this as skipped.
- Enabler wiring — activities affect capitals directly for M2;
  routing through enablers is M6/M7 scope.

## 7. Threshold policy for the activity numbers themselves

The six numbers in §2 are the teaching. Vision Owner override at
any time; changing a number changes what the game claims about the
world. Filed here so a future refactor can grep for
`M2_ACTIVITY_MODEL_REPORT_ORDER_075` and re-derive.

## 8. What "opens" this gate

Under ORDER 075's cohesive-block execution the report gate opens
when this file is committed. Vision Owner may course-correct on
the activity list or numbers at any time. Implementation proceeds
against the numbers above unless overridden.
