# VERTICAL_SLICE_001 — Implementation Report

**Version:** 0.1
**Status:** Draft
**Slice:** VERTICAL_SLICE_001
**Design doc:** `VERTICAL_SLICE_001.md`
**Author:** Frontend prototype

---

## 1. Files created

### Frontend source (under `frontend/`)

- `index.html`
- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `README.md`

### Application (under `frontend/src/`)

- `main.tsx` — entry point.
- `App.tsx` — stage machine, input wiring, WebGL gate.
- `index.css` — reset, typography, HUD, overlays, mobile controls, fallback.
- `types.ts` — shared types.
- `audio/AmbienceEngine.ts` — procedural Web Audio ambience with mute.
- `content/dialogue.ts` — opening dialogue tree assembled from strings.
- `content/strings.sv.ts` — single source of Swedish UI copy.
- `controls/MobileControls.tsx` — virtual joystick, drag-to-look, interact button.
- `controls/PlayerController.tsx` — WASD/keyboard + PointerLock + touch look.
- `controls/useIsTouch.ts` — device capability hook.
- `hooks/usePrefersReducedMotion.ts` — motion preference hook.
- `scene/Applicant.tsx` — first NPC with proximity trigger.
- `scene/BusStop.tsx` — geometry.
- `scene/Environment.tsx` — ground, path, water glimpse, campus entrance plinths.
- `scene/Mist.tsx` — low ground fog plane.
- `scene/Pavilion.tsx` — stylised Sevillapaviljongen placeholder.
- `scene/RegistrationTable.tsx` — end-of-slice interactable.
- `scene/Scene.tsx` — R3F Canvas and world composition.
- `scene/Trees.tsx` — instanced forest with subtle sway.
- `stages/BusStage.tsx` — abstract bus arrival, ~10 s.
- `stages/EndStage.tsx` — "Din initiation börjar här." + continue/restart.
- `stages/TitleStage.tsx` — fade-in title.
- `state/gameState.ts` — reducer, initial state, contexts.
- `ui/Dialogue.tsx` — NPC dialogue modal with keyboard shortcuts.
- `ui/Hud.tsx` — objective, mute, pause, contextual key hint.
- `ui/PauseMenu.tsx` — pause overlay with disclaimer.
- `webgl/WebGLFallback.tsx` — feature detection and fallback screen.

### Documentation

- `documentation/architecture/VERTICAL_SLICE_001.md` — design & scope.
- `documentation/architecture/VERTICAL_SLICE_001_IMPLEMENTATION_REPORT.md` — this file.

## 2. Architectural choices

- **Vite + React 18 + strict TypeScript.** Chosen for immediate build reproducibility on any Node 18+ host and for TypeScript strictness catching issues at build time.
- **React Three Fiber + drei.** Declarative Three.js in React. drei used only for `PointerLockControls` and `Instances` — no asset loaders.
- **Single `useReducer` + Context.** No external state library. The stage machine is small and finite; a reducer keeps transitions explicit and testable.
- **Movement/look via refs.** Player input crosses the React↔R3F boundary via `moveRef`/`lookRef` to avoid re-rendering the Canvas on every input tick.
- **Proximity computed inside R3F frame.** Cheaper than lifting camera position into React state; the scene sets React state only when a threshold is crossed.
- **Two contexts (`GameStateContext`, `GameDispatchContext`).** Consumers can subscribe to state or dispatch independently, avoiding needless re-renders.
- **Audio started on first user gesture.** Complies with browser autoplay policies; muteable throughout.
- **All text centralised in `content/strings.sv.ts`.** Prepares later localisation without hunting through files.
- **Prototype disclaimer, not a rights claim.** Explicitly documented in the pause overlay and this report.

## 3. Known limitations

- **No collision.** The player is constrained by an XZ bounding box only; the pavilion, trees, and applicant can be walked through. Acceptable for a tone-first prototype.
- **Single locale.** Swedish only. No language switcher.
- **No persistence.** Reload resets everything; no save/checkpoint.
- **No mobile session compression logic.** The bus is ~10 s on all devices; the source docs anticipate different mobile compression rules that this slice does not model.
- **Dialogue is prototype content.** The NPC prompt and three responses were authored for this slice; they do not appear in the source-of-truth docs.
- **Pavilion is a stylised abstraction.** No architectural fidelity to the real Sevillapaviljongen. Rights checkpoint (`05`) is not closed.
- **No dev-only debug affordances.** No fly cam, no framerate overlay.
- **Bundle size warning.** Vite reports the single JS chunk at ~995 kB (275 kB gzipped) because of Three.js and drei. Acceptable for a prototype; code-splitting deferred.
- **`deprecated three-mesh-bvh@0.7.8`** is pulled in transitively by drei. Not exercised by this slice. No action taken.
- **Ambience under motion-reduced preference.** Audio is still produced when `prefers-reduced-motion` is set; only motion is suppressed. Muting is one click away.
- **No unit or integration tests.** Verification is limited to type check and production build.

## 4. Accessibility considerations

- **Keyboard navigation.** All buttons focusable. Dialogue supports `1/2/3` and `A/B/C` shortcuts; focus is moved to the primary action after a choice.
- **`prefers-reduced-motion`.** Applied to: tree canopy sway, applicant idle bob, bus tree scroll, title fade-in, and CSS transitions.
- **Contrast.** Panels use `#181820` at ≥90% opacity behind `#ece7de` text; primary buttons use `#d9c199` on `#171410`. WCAG AA at these color pairings.
- **Focus outline.** Explicit `:focus-visible` with a warm accent colour on every interactive element.
- **Live regions.** Objective banner and context prompt use `role="status"` with `aria-live="polite"`.
- **Modal semantics.** Pause, dialogue, end card all use `role="dialog"` + `aria-modal="true"` + `aria-labelledby`.
- **Mute is always reachable.** Persistent HUD button plus pause menu.
- **Fallback screen.** If WebGL is missing, the same opening quote is rendered as text with a restart button.
- **Safe-area insets** honoured on touch layouts for iOS notches.
- **No motion-triggered content.** Text remains legible without any motion.

## 5. Desktop and mobile controls

**Desktop**

| Input | Action |
|---|---|
| Click canvas | Enter pointer lock |
| Mouse | Look around |
| W / A / S / D or arrows | Walk |
| Shift (either) | Jog |
| E | Interact (when a context prompt is visible) |
| Escape | Release pointer lock and toggle pause |
| 1 / 2 / 3 or A / B / C | Choose a dialogue reply |

**Mobile / touch**

| Input | Action |
|---|---|
| Left thumb on virtual stick | Walk |
| Drag anywhere on the screen | Look |
| On-screen "Prata" / "Registrera dig" button | Interact |
| Tap "Paus" (HUD) | Open pause menu |
| Tap "Ljud" (HUD) | Toggle mute |
| Tap a numbered choice | Choose a dialogue reply |

## 6. Exact commands to run the demo

```bash
cd frontend
npm install
npm run dev
```

Then open **`http://localhost:5173/`** in a modern browser.

Additional commands:

- Type check: `npm run typecheck` (or `npx tsc --noEmit`)
- Production build: `npm run build`
- Serve the production build: `npm run preview`

## 7. Verification results

Run against Node 18+ on macOS `darwin 25.5.0`.

| Step | Command | Result |
|---|---|---|
| Install | `npm install` | 142 packages added, no errors. Warning: transitive `three-mesh-bvh@0.7.8` deprecation notice only. |
| Type check | `npx tsc --noEmit` | Exit code 0. No diagnostics. |
| Production build | `npm run build` | Exit code 0. 642 modules transformed. `dist/index.html` 0.54 kB, CSS 6.88 kB (2.01 kB gz), JS 995.38 kB (275.82 kB gz). Vite reports a size warning above the 500 kB threshold; accepted. |
| Dev server | `npm run dev` | Vite ready in ~90 ms at `http://localhost:5173/`. HTTP 200 confirmed with `curl`. |

## 8. Recommended next improvements

Prototype-level (small):

1. **Split vendor chunk** using Vite `build.rollupOptions.output.manualChunks` to separate Three.js from application code, reducing initial JS to under the 500 kB warning.
2. **Suppress ambience when `prefers-reduced-motion` is set**, or at least start it muted, and expose that decision in the pause menu.
3. **On-screen click hint on desktop** for the first ~2 seconds of `play` reminding the user to click to lock the pointer.
4. **Debug fly-cam and framerate overlay** behind a dev-only key combination.

Design-level (bigger):

5. **Resolve the `01`↔`02` bus contradiction upstream** in the world docs. This slice makes a prototype-only choice; the real resolution is a WP-02 decision.
6. **Author the missing interaction verbs** identified in `WP02_REVIEW_REPORT.md` §2 before implementing more scenes.
7. **Close the real-place rights checkpoint** for Grythyttan, the pavilion, the church, and the campus institution before art work escalates.
8. **Adopt a session-length model per platform** that matches the source docs (5 min desktop / 45–60 s mobile bus), then re-time the slice to match.
9. **Localisation pipeline** — Swedish source + English content parity — before more copy is added.
10. **First-hour telemetry contract** — decide what a "visible consequence" means as an instrumented event before the initiation scene is built.

Engineering-level:

11. **Add basic Playwright smoke tests** (title reaches play; NPC dialogue completes; registration ends the slice).
12. **Enable stricter ESLint** with `eslint-plugin-react-three` conventions.
13. **CI target** that runs typecheck + build on push.
14. **Prevent duplicate audio contexts** if `ambience.start` were ever raced by two gestures — currently guarded by the `engine?.running` check; a lock could be more explicit.

## 9. What was intentionally not built

- Backend, database, authentication, multiplayer, Supabase, Cloudflare, AI.
- Persistence or profile export.
- Real assets: models, textures, images, fonts, music, SFX.
- Locale switcher.
- Advanced physics or collision.
- Any modification to `documentation/foundation/` or `documentation/world/`.
- Any git operation (no add, commit, push, reset, rebase, etc.).
