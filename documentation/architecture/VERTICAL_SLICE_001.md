# VERTICAL_SLICE_001 — Nexus Opening Prototype

**Version:** 0.1
**Status:** Draft — prototype only
**Owner:** Frontend / prototype
**Source of truth:** `documentation/archive/world-wp02/01_THE_ORIGIN.md`, `documentation/archive/world-wp02/02_FIRST_ARRIVAL.md`, `documentation/archive/world-wp02/05_SEVILLA_PAVILION.md`
**Related:** `documentation/archive/world-wp02/WP02_REVIEW_REPORT.md`

> **Note (ORDER 034 §3):** The `NN_*.md` and `WP02_REVIEW_REPORT.md` documents cited below live at `documentation/archive/world-wp02/` after ORDER 034 §4. They are **historical** and no longer authoritative — see the archival header on each. VS-001 itself remains committed and reachable per `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §13; only the source-of-truth documents have moved.

## Purpose

Deliver a first playable interpretation of The Origin: title → bus arrival → walk to the Sevillapaviljongen → first NPC encounter → registration → end card. The slice exists to validate tone, pacing, control feel, and the first-contact narrative moment against the world documents.

## Non-goals

- No backend, database, authentication, multiplayer, Supabase, Cloudflare, or AI.
- No persistence between sessions.
- No permanent role assignment or profile system.
- No claim of architectural or geographic accuracy.
- No modification of foundation or world documents.

## Scope

Included:

- Title fade-in with `NEXUS` / `Grythyttan — The Origin`.
- ~10-second non-interactive bus arrival with the Swedish first-text overlay.
- Playable open scene with bus stop, gravel path, forest, water glimpse, campus entrance, and a stylised Sevillapaviljongen placeholder.
- One NPC applicant with a three-choice dialogue.
- One objective and one interaction target (registration table) that ends the slice.
- Pause overlay with disclaimer, controls, and mute toggle.
- WebGL absence fallback.

Excluded:

- Real-world persistence, telemetry, or user accounts.
- Advanced physics or collision — the player walks on a flat plane with an XZ bounding box.
- Localisation beyond Swedish.
- Any external asset (models, textures, images, fonts, music, SFX).

## Design decisions

### D1. Resolve the `01_THE_ORIGIN.md` vs `02_FIRST_ARRIVAL.md` bus contradiction toward `01`.

The bus sequence in this slice is fully non-interactive. This resolves the contradiction identified in `WP02_REVIEW_REPORT.md` §1.2 and §1.4 in favour of the `01` position (control given only after the first text fades). This decision applies to this prototype only and is not authoritative for the game.

### D2. Extreme compression of the bus beat.

The bus is compressed to approximately 10 seconds, versus 5 minutes desktop / 45–60s mobile suggested in the source documents. Compression is a prototype affordance: the moment must land immediately so a first-time reviewer can reach the interactive scene inside a minute.

### D3. NPC dialogue is prototype content.

The NPC prompt "Är du också här för antagningen?" and the three player responses were authored for this slice and are not present in the source documents. They are labelled as prototype content and stored only in local React state (never persisted, never treated as a role assignment). This preserves the `01` principle "Identity is discovered, not selected."

### D4. Ambient audio, not music.

`01` states "No dramatic music." Audio in this slice is a filtered noise wind bed and occasional short bird-like sine chirps generated at runtime. Started only after the first user gesture. Muteable from the HUD and pause menu. Reflected in the "no external assets" constraint by generating everything at runtime.

### D5. Discreet development disclaimer instead of a rights claim.

The pavilion is a real building. Rights are not cleared. The in-app disclaimer under Pause → Om denna prototyp states that all places, buildings, and people are stylised placeholders. This satisfies prototype needs but does not close the rights checkpoint required by `05_SEVILLA_PAVILION.md`.

### D6. No minimap, no XP, no quest log.

Consistent with `02_FIRST_ARRIVAL.md` and the "Minimal, elegant and restrained" brief. Only the objective banner and mute/pause buttons are persistent. Interaction prompts are contextual.

### D7. Locally generated primitives only.

All geometry is built from `three` primitives (planes, boxes, cylinders, cones, spheres). Trees are drei `Instances`. No `GLTFLoader`, no textures, no HDRIs. This keeps the repository asset-free and the build fully offline.

## Architecture

### Runtime state machine

`title → bus → play → end`

- `title`: fade-in title card, auto-advances.
- `bus`: separate R3F canvas with abstract bus interior + moving forest; timed text overlay; auto-advances.
- `play`: main scene, controls active, HUD visible.
- `end`: modal overlay over the main scene; player may dismiss to explore further or restart.

State is a `useReducer` in `App.tsx` shared through two React contexts (`GameStateContext`, `GameDispatchContext`).

### Rendering

- One primary `Canvas` for the play scene, one small `Canvas` for the bus.
- No shadows, no post-processing, simple hemi + directional lighting.
- Scene fog and a low semi-transparent ground plane approximate morning-after-rain mist.
- Camera is first-person at eye height 1.7 m.

### Controls

- Desktop: drei `PointerLockControls` for look; keyboard for movement; `Shift` jog; `E` interact; `Escape` pause.
- Touch: a custom left-hand virtual joystick and a right-hand drag-to-look region, plus a contextual interact button. Pointer lock is not used on touch.
- Both paths write to the same `moveRef` and `lookRef`, consumed by `PlayerController` inside the Canvas.

### Proximity and interaction

- `Applicant` and `RegistrationTable` each compute their own distance to the camera on every frame and call a proximity callback when the state crosses a radius threshold.
- `App` maps proximity + game state into a `contextPromptLabel`; interaction is a single `E`/button dispatch that reads the current prompt.

### Audio

- `AmbienceEngine` module. Uses Web Audio API. Filtered white noise (lowpass 380 Hz) for wind. A recurring timer schedules 1–3 short sine chirps at randomised frequencies. Master gain ramps between 0 and 0.55 on mute toggle. Started only on the first user gesture to comply with autoplay policy.

### Accessibility

- `prefers-reduced-motion` honoured: canopy sway, applicant idle, bus tree scroll, title fade timing, and CSS transitions all reduced.
- Full keyboard navigation for dialogue with 1/2/3 or A/B/C shortcuts.
- WCAG AA contrast on all overlays; explicit `:focus-visible` outlines.
- Mute is always reachable via HUD and pause.
- WebGL fallback screen with the same first-text quote and a restart button.

### Layout

- HUD uses `pointer-events: none` on the container and `auto` on the interactive elements so it never blocks the canvas.
- Full-screen, viewport-fit-cover, no zooming on mobile; safe-area insets respected for the joystick and interact button.

## File map

```
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── index.css
    ├── types.ts
    ├── audio/AmbienceEngine.ts
    ├── content/
    │   ├── dialogue.ts
    │   └── strings.sv.ts
    ├── controls/
    │   ├── MobileControls.tsx
    │   ├── PlayerController.tsx
    │   └── useIsTouch.ts
    ├── hooks/
    │   └── usePrefersReducedMotion.ts
    ├── scene/
    │   ├── Applicant.tsx
    │   ├── BusStop.tsx
    │   ├── Environment.tsx
    │   ├── Mist.tsx
    │   ├── Pavilion.tsx
    │   ├── RegistrationTable.tsx
    │   ├── Scene.tsx
    │   └── Trees.tsx
    ├── stages/
    │   ├── BusStage.tsx
    │   ├── EndStage.tsx
    │   └── TitleStage.tsx
    ├── state/
    │   └── gameState.ts
    ├── ui/
    │   ├── Dialogue.tsx
    │   ├── Hud.tsx
    │   └── PauseMenu.tsx
    └── webgl/
        └── WebGLFallback.tsx
```

## Mapping to source of truth

| Source | Element in this slice |
|---|---|
| `01_THE_ORIGIN.md` — First Text | Swedish bus overlay: "Alla kommer hit med drömmar. Ingen vet ännu vem de kommer att bli." |
| `01_THE_ORIGIN.md` — "Curiosity precedes reward" | No visible score, XP, or reward surface. |
| `01_THE_ORIGIN.md` — "Identity is discovered, not selected" | Choice is saved only in local state; no role assignment. |
| `01_THE_ORIGIN.md` — "No dramatic music" | Procedural ambient only, muteable. |
| `02_FIRST_ARRIVAL.md` — subtle objective | Single objective banner after dialogue: "Hitta registreringen vid Sevillapaviljongen." |
| `05_SEVILLA_PAVILION.md` — first symbol | Pavilion is the visual landmark and the objective's destination. |
| `05_SEVILLA_PAVILION.md` — "revealed gradually" | Pavilion is visible on foot approach; no cutscene. |
| `05_SEVILLA_PAVILION.md` — rights checkpoint | Prototype disclaimer under pause. Rights work still pending. |

## Deferred to later slices

- Character embodiment, avatar system.
- Save / resume between sessions.
- Save at the "control handed to player" boundary.
- Real-place clearance workflow.
- Localisation (English source, additional locales).
- Analytics for the first-hour journey.
- Weather/season/time-of-day system.
- Consequence instrumentation for the initiation.
