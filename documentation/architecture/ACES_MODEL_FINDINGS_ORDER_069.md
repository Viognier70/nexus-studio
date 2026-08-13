# ACES Analytic Model — Two Corrections Found During INFRA-1

**Status:** Filed 2026-08-12 under ORDER 069.
**Precondition:** ORDER 066 (calibration quad built), ORDER 067–068
(runner + poses + PNG-per-pose verification).
**Impact:** ORDER 057 Del D and ORDER 061 pt 3 authored roof tones
against a predictive model that turns out to have been wrong by a
factor of ~5×. The rendered result they targeted may not be what
they thought they were targeting. Recommend a review pass once the
strategic slice reaches M0 acceptance (see the
STRATEGIC_TRACK_MILESTONES_PROPOSAL).

## The two errors

### 1. Missing `/ 0.6` exposure normalisation

`THREE.ACESFilmicToneMapping` normalises exposure by 0.6 before
applying `RRTAndODTFit`:

```glsl
// three/src/renderers/shaders/ShaderChunk/tonemapping_pars_fragment.glsl.js
color *= toneMappingExposure / 0.6;
color = ACESInputMat * color;
color = RRTAndODTFit( color );
color = ACESOutputMat * color;
```

This is **undocumented in the material API**. The scene's
`toneMappingExposure = 1.3` therefore produces an *effective*
exposure of `1.3 / 0.6 = 2.167`.

Every earlier analytic prediction that multiplied by 1.3 alone was
under-predicting brightness by 1.67×.

### 2. Missing `/ π` Lambertian BRDF

Three.js's `MeshStandardMaterial` diffuse output follows the
physically-based Lambertian BRDF:

```
diffuse_out = albedo × ( ∑ NdotL × lightColor × lightIntensity ) / π
```

The `/ π` factor is standard for energy conservation. Every earlier
analytic prediction that used `output = albedo × irradiance` was
over-predicting brightness by π ≈ 3.14×.

### Net effect

The two errors partially cancelled: my under-prediction (×0.6, missing
exposure normalisation) and over-prediction (×π ≈ ×3.14, missing BRDF)
combined to (1/0.6) / π = 0.53. Every pre-ORDER-066 analytic reading
I published in ORDER 061 §3 was over-predicting the rendered pixel
by ~1.9× — bright surfaces I said would read at luminance 0.7–0.8
were rendering at luminance closer to 0.4–0.5.

## Verification

Both corrections were caught by the INFRA-1 harness (ORDER 064 + 066)
and confirmed by pixel sampling on a uniform sunlit tegel roof face:

| pose | analytic prediction (post-correction) | measured (uniform ROI) |
|---|---|---|
| calibration-quad (grayscale mid-value ACES test) | R=160 G=160 B=160 | R=160 G=160 B=160 |
| roof-tegel-lunch (tegel `#8a3d28`, sunlit south face at solar noon) | R=120 G=20 B=4 | R=121 G=34 B=21 |

R matches to within 1 LSB. G and B are +14 and +17 above the analytic
prediction — a residual gap of ~15–20 units in the darker channels
that the current model does not explain. Suspects (not yet
discriminated):

- Three.js `ambientLightColor` uniform default lifting darks.
- Environment map contribution I have modelled as zero.
- Hemisphere ground/sky blend precision at unusual normal
  orientations.

The residual is small enough that the model is now usable for
sanity-checking predictions; the pipeline is faithful at the
pixel level.

## Impact on prior orders

**ORDER 057 Del D (roof colour authoring, tegel `#8a3d28`, plåt
`#3e4550`, tjärpapp `#33333a`).** These colours were chosen to
"read as tegel red-brown / plåt slate / tjärpapp near-black" against
an analytic model that over-predicted brightness by ~1.9×. The
render at sunlit noon actually produces a *darker*, less saturated
tegel than the palette authoring likely intended:

- Predicted (pre-correction) sunlit tegel luminance: ~0.70 (bright)
- Measured sunlit tegel luminance ((0.299·121 + 0.587·34 + 0.114·21) / 255):
  0.221 (mid-dark)

The perceived darkness the Vision Owner has flagged three times
(ORDER 061 opening, ORDER 065, ORDER 067) is **at least partly this
gap**. Roofs are not black; they are correctly rendered — but the
authored colour was chosen expecting the render to be brighter.

**ORDER 061 pt 3 (roof normals + fog test proposals).** The
"analytic table" I published in the ORDER 061 report claimed sunlit
south-face tegel should luminance-read at 0.71 at morning and 0.81
at lunch. With the corrected model that becomes 0.20 and 0.22. The
"roofs are dark" observation was accurate against actual render
output — my analytic reassurance was based on the flawed model. The
`ORDER 061 pt 3` fog-attenuation hypothesis needs re-evaluation
against the corrected numbers; the darkness the Vision Owner saw is
consistent with what the render is actually producing at authored
colours, not evidence of a lighting or fog fault.

## Recommendation

Do not adjust roof colours in `frontend/src/lib/facade/schema.ts`
during this order. Two reasons:

1. The gap is between *authored intent* and *actual render*. The
   authoring intent for tegel/plåt/tjärpapp is not written down —
   they were chosen by eye in ORDER 057 Del D against an assumed
   render brightness that turned out to be wrong. Fixing the render
   direction requires deciding what the author *meant*, not just
   what the render shows.
2. The visual-regression harness (INFRA-1) can now enforce whatever
   authoring decision is made and catch drift in either direction.
   The right time to revisit the palette is at M0 acceptance
   (Vision Owner sighting pass) with the harness green.

## Known cross-platform: sub-pixel positioning drift (ORDER 072)

First CI-vs-local comparison of INFRA-1 (ORDER 071) matched five of
six poses byte-identical between macOS-M Metal and ubuntu-latest
software-rasterised Chromium. The sixth (`lit-window-dinner` with
an 8×8 ROI at (296, 362)) diverged completely: local R=245 G=222
B=169, CI R=2 G=0 B=0.

**Cause**: not a rendering fault. Same window layout, same colours,
same building. The 8×8 ROI landed inside a lit sub-pane on macOS
but on the vertical muntin between two panes on ubuntu — a ~4–8 px
cross-platform sub-pixel positioning shift. Muntins are ~2 px wide
and dark; panes are ~10 px wide and bright. An 8-pixel ROI sitting
one muntin-width off centre reads the wrong material.

**Suspected mechanism**: precision differences in matrix multiplies
between Metal and SwiftShader propagate through the vertex pipeline
so an object's projected pixel coordinates can shift by 1-4 px
across platforms — not enough to break coarse layout, enough to
move a small ROI onto or off a specific texel-scale feature.

**Fix in place** — not a workaround, a permanent guard:
1. `lit-window-dinner` ROI moved to a 25×25 rectangle at (506, 409),
   verified 100% uniform lit in both PNGs (625 sampled pixels each,
   zero max−min variance on both platforms).
2. `PixelSampleProbe` now publishes per-channel variance
   (max − min inside the ROI) alongside the mean. `runner`
   surfaces variance in the table and issues a stdout warning
   for any pose reporting non-zero variance greater than 2 per
   channel — that means the ROI is close to a colour edge and
   is a latent cross-platform failure waiting to happen. Variance
   catches the failure mode BEFORE the mean crosses the threshold.

Not investigating the shader precision difference itself. Widening
tolerances to accommodate it would erode the value of ±3 as a
regression signal. Better to require ROIs land firmly on uniform
surfaces, and let the variance metric enforce that rule.

## M6 baseline — pickParagraph divergence (ORDER 073, 2026-08-12)

Recorded here so the number is a moving target with a known start,
not a re-discovery at M6 planning time.

**M1 verification pass 2026-08-12.** The M1 DoD 2 test in
`frontend/src/strategic/simulation/__tests__/m1.test.ts` runs three
parallel 3-day scripts with different scenario-response strategies
(A/B/C, fixed seed) and hashes the concatenated evening-account
paragraphs. Current maximum Jaccard token distance across the three
paragraph strings:

- **Baseline (2026-08-12): 0.000** — evening-account paragraphs are
  byte-identical across scenario-choice variants.

**Cause.** `computeEveningAccount` passes `drewCapital: null` to
`pickParagraph` (frontend/src/strategic/simulation/eveningAccount.ts:73).
The paragraph selector only reads `drewCapital` in the retired
`high_wager_win` / `high_wager_loss` branches (ORDER 050 §5 retired
the theme-wager mechanic). All other branches (`thin`, `mediocre`,
`good`, `collapsed`) select their paragraph without any signal from
the scenario theme — so different scenario choices resolve to the
same branch and pick the same paragraph.

**M6 target: 0.30 Jaccard distance.** That's what the proposal §6.2
DoD 2 rewrite named as the "meaningfully different" bar.

**M6 scope required to hit target.** ORDER 052 §9 step 1 (cause-
aware sentence banks) is the load-bearing piece. Once each stream
event carries its cause and evening-account paragraph pulls from
that cause chain, the paragraph will diverge naturally with choice
history. `pickParagraph` also needs the missing wiring: pass
`drewCapital` (state.day.drawnCapital or equivalent, propagated
from the last scenario) into every branch, and add branch-varying
sub-paragraphs keyed on it.

**Progress checkpoint.** The M1 test emits the current baseline as
a stdout log at the end of the DoD 2 case:

```
[M1] evening account text max cross-strategy divergence: 0.000 (target 0.3 at M6)
```

M6 work should track this number, not re-derive it.

**M6 landing (ORDER 076, 2026-08-12): dAB=0.219 dAC=0.202 dBC=0.212
max=0.219.** The wiring closed as follows:

1. `state.day.drawnCapital` is populated at `RESOLVE_SCENARIO` from
   `scenario.drawnTheme` and read by `computeEveningAccount`.
2. `pickParagraph` (`content/eveningAccount.sv.ts`) now carries
   `GOOD_LEAD_BY_CAPITAL`, `THIN_LEAD_BY_CAPITAL`, and
   `MEDIOCRE_LEAD_BY_CAPITAL` variant maps for the three capitals.
3. Because same-seed A/B/C runs draw the same theme, drawnCapital
   alone did not divide them; `state.day.lastScenarioChoice` is now
   also populated at `RESOLVE_SCENARIO` and fed to `pickParagraph`,
   which appends one per-choice aside sentence (`CHOICE_ASIDE`)
   with distinct vocabulary per A / B / C.

Cleared the ≥ 0.15 first-cut floor from M6 §5 DoD 4. The 0.30
eventual target is ~0.08 away and will close as the sentence banks
themselves are rewritten to name their causes (a separately-scoped
continuation of ORDER 076 §6).

## M3 reconciliation drift baseline (ORDER 074, tracked from 2026-08-13)

Same pattern as the pickParagraph baseline above: record the number
now, follow it forward, do not re-derive it at each milestone.

**M3 3-day baseline (ORDER 074 CI run 31642553749):**
- overall ratio = 101.4 %
- absolute drift = 1135 SEK

Three motivating explanations (test comment carries them, this doc
carries the audit trail):
1. Wages, interest, and idle-cost lines for day N are posted at
   day N+1 morning START, not at day N evening close. Per-day
   ledger partitioning is ~24 h misaligned with per-day cash-
   movement partitioning.
2. Straggler payments landing on the exact tick a period transitions
   have small ordering ambiguity with idle-cost posting on that
   tick.
3. Guest revenue floats through `rev / 1000 × 1000` once per guest
   (kSEK bucket → SEK ledger line); the round-trip introduces
   sub-SEK per-guest drift that compounds to a few hundred SEK over
   100+ guests.

**Initial scaling probe — 7-day run (ORDER 075, 2026-08-13):**
| days | drift (SEK) | revenue (SEK) | guests | drift/guest |
|------|-------------|---------------|--------|-------------|
| 1    | −142        | 51 408        | 168    | −0.84       |
| 3    | −557        | 131 019       | 428    | −1.30       |
| 5    | **+43 155** | 231 800       | 758    | +56.93      |
| 7    | +25 777     | 306 020       | 1 000  | +25.78      |

**Initial interpretation (2026-08-13, WRONG).** I recorded this as
"non-linear, systematic sign-flip at day 5." Three hypotheses were
filed: ring-buffer truncation, reputation-degradation asymmetry,
collapse leak.

**Corrected interpretation (ORDER 076, 2026-08-13).** The
"systematic day-5 spike" was a **test-methodology artifact**, not
a sim behavior. My `runUntilSec = 30 + 1050 * days + 100` formula
assumed each day fits in 1050 s; the actual full-day cycle is
~1080 s (opening 10 + prep 120 + service 900 + evening 30 +
margin). For days ≥ 3, the LAST day's dinner service was still
running when the harness stopped — accumulated in-service revenue
had hit `state.cash` via `applyCashRevenue` per guest, but the
aggregate `revenue` ledger line for that service hadn't posted
yet (posts at service close). The huge +43 kSEK "spike" on day 5
was a whole day's worth of in-flight guest revenue trapped in cash
without a matching ledger line.

**Confirmed via three independent checks:**
1. Bumping `LEDGER_MAX_LINES` 1000 → 100 000: **drift unchanged**
   (same numbers to the SEK). Ring-buffer never fired anyway —
   max ledger length was 91 lines for the 7-day run. Truncation
   hypothesis refuted directly.
2. Runningcash-vs-previous-line diff on the 5-day trace revealed
   a big gap at the final unread lines: last ledger line ran with
   runningCash ≈ 270 kSEK; state.cash at run-end was ≈ 295 kSEK.
   The 25 kSEK gap = in-service revenue applied to cash but not
   yet aggregated to ledger.
3. Rerun with proper `runUntilSec = 1260 * days + 200` (guarantees
   each day's dinner close + evening + wage-post finish):

   | days | drift (SEK) | guests | drift/guest |
   |------|-------------|--------|-------------|
   | 1    | −300        | 166    | −1.81       |
   | 3    | −1027       | 371    | −2.77       |
   | 5    | −1401       | 678    | −2.07       |
   | 7    | −1859       | 960    | −1.94       |

   Drift is now **linear in guests, all negative, ~2 SEK/guest** —
   exactly consistent with the three original motivations
   (round-trip fp compound per guest is the dominant term).

**All three hypotheses REFUTED.** The residual ~2 SEK/guest drift
is what the ACES-model-style explanations above cover. Nothing
more to fix.

**Threshold policy holds unchanged.** M3 test asserts ±2% band +
<1500 SEK absolute on the 3-day script. That fits the corrected
drift (1027 SEK for 3-day). A longer-run test with proper timing
would ALSO fit if the absolute bound scales linearly with guests
(~2 SEK/guest × guest count) — trivial extension when needed.

**Lesson learned.** Test scaffolding artifacts can mimic real
sim bugs. Before hypothesising a mechanism from a scaling curve,
verify the test itself is capturing what it claims to capture.
The day-5 "sign flip" was an obvious tell in retrospect (a real
per-day accounting fault wouldn't unwind by day 7); reading the
runningCash gaps ruled it out in one probe.

## References

- `frontend/src/strategic/testHarness/calibration.ts` — analytic
  pipeline in code, matching three.js's implementation.
- `frontend/scripts/visual-regression.mjs` — runner.
- `frontend/src/strategic/testHarness/visualPoses.ts` — pose
  catalogue with pixel-verified ROIs.
- `frontend/reports/visual-regression/*.png` — pose screenshots
  with ROI drawn (gitignored; regenerated on `npm run test:visual`).
- `documentation/architecture/ORDER_REGISTRY.md` — orders 057, 061,
  064, 066, 067, 068, 069.
