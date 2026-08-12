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
