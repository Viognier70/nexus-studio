# M0 — Vinbaren camera-pitch probe (report under ORDER 083)

**Status:** Measurement report. No architecture change.
**Order:** ORDER 083 — measure before deciding on a side view.
**Companion artefacts:** `frontend/reports/pitch-probe/pitch-15.png`, `pitch-25.png`, `pitch-35.png`, `pitch-45.png`, `pitch-58.png` — one PNG per requested pitch. Probe script: `frontend/scripts/pitch-probe.mjs`.

---

## 1. What was measured

Five pitches at focus (31.6, −16.7) (player-business centroid), distance 8.4 m, yaw 0.4 rad. Period forced to `lunch` (dinner ran too dark to read anything at low pitch). Sim seeded to mid-service (~200 sim-seconds into dinner) so staff pucks and guest pucks are in the room.

| pitch | camera altitude | camera horizontal offset | image |
|------:|----------------:|------------------------:|---|
| 58° | 7.13 m | 4.45 m | `pitch-58.png` |
| 45° | 5.94 m | 5.94 m | `pitch-45.png` |
| 35° | 4.82 m | 6.88 m | `pitch-35.png` |
| 25° | 3.55 m | 7.61 m | `pitch-25.png` |
| 15° | 2.17 m | 8.11 m | `pitch-15.png` |

Guest counts across the five shots vary (14 / 24 / 9 / 6 / 5) because the RAF-driven tick loop leaks a few TICKs between page load and the probe's `SET_SPEED 0` dispatch, so each pose lands in a slightly different sim state. This affects population density but not the pitch-composition finding below.

**Both distance 8.4 m and pitch 15° sit below the game's live camera clamps** (`minDistance = 10`, `pitchMin = 18°`, `grythyttan.ts`). The throw in `CameraContext.tsx` §92 that normally catches below-clamp poses was temporarily relaxed to a `console.warn` for this measurement and **reverted before commit** — no permanent hole in the guard.

## 2. Per-pitch reading

### 58° (current)
Steep top-down look. Staff puck reads as a short dark cylinder with the M5 rhythm ring visible at the base. Surrounding buildings' rooftops (which do NOT fade — only the player business roof fades below 28 m) dominate the frame. Interior floor stub is visible. Guests read as small dark cylinders. No arms, no head direction — the cylinder geometry has none.

### 45°
Better sense of side profile. One dark cylinder occupies centre-frame (a staff puck). Some faint character silhouettes visible top-left corner with what LOOKS like head + body distinction, but that's actually just the puck's cylinder end-cap catching a highlight. Rooftops still fill 40 % of the frame.

### 35°
Same central staff puck, tilted slightly more toward the side. A small figure in the top-left is more clearly separated from the ground plane. Still no limb articulation because the underlying geometry doesn't have limbs.

### 25°
More horizontal. The rhythm ring is visible around the base of the central puck (pink/red in the shot — matches "chased" load per the M5 threshold at load ≥ 0.7). One character puck is visible in top-left with what reads as "figure standing" — but again, cylinder geometry, no gait/arm cue.

### 15°
Near-horizontal. Camera is essentially at head height (2.17 m). Reads as an isometric-lean composition. Puck cylinders are more clearly separated from the ground and adjacent buildings' walls now dominate the sides rather than their roofs the top. Central staff puck still reads as an upright dark cylinder with no bodily articulation.

## 3. The finding — pitch is not the bottleneck

**At no measured pitch do the actors' ACTIONS become legible, because the actors are cylinders.** InteriorStaff.tsx renders each team member as a single `cylinderGeometry` (0.24 m radius × 1.70 m height, plus the ORDER 078 rhythm ring below it). InteriorGuests.tsx uses the same shape. There are no arms to raise, no head to turn, no leg to step. A guest waving vs a guest waiting is the same silhouette.

Answering the order's own question — *"vid vilken pitch blir personalens och gästernas HANDLINGAR läsbara — inte miner, utan gång, sittande, vinkande, väntande?"* — with these images gives an honest answer of "none of them". What DOES change with pitch is:

- **58° → 15°** the ROOM COMPOSITION shifts from mostly-rooftops (58°) to mostly-walls-and-floor (15°). Better presentation frame for the interior, but doesn't create actions where there are none.
- **58° → 15°** the RHYTHM RING becomes progressively harder to see (it sits on the floor plane, edge-on at 15°) and easier to see (it sits nearly flat to the eye at 58°). If the ring is the M5 "at a glance" reading, low pitch hurts it.
- **All pitches** the surrounding buildings' geometry occludes ~40 % of the frame at this distance (8.4 m). This is the camera being INSIDE the district, not just above it — every neighbour building's wall is in-shot.

## 4. Bordsrader — do rows occlude each other?

The interior stub currently is a flat grid without authored table rows. Nothing to occlude nothing else, so this specific question is unanswerable from the shots. If tables were placed later, the geometry at 15° pitch would have front rows blocking back rows in exactly the way an isometric camera does — that's a design consequence any low-pitch view would inherit.

## 5. The guest-reel.jsx question

The order notes that `guest-reel.jsx` (external reference, not in this repo) is a **profile animation with limb angles** — the pose vocabulary of a legible-action character. It exists at all because the pose shape carries the meaning: raised arm = waving, angled leg = walking, straight body = waiting.

Two paths ORDER 083 offers, both with clear costs the Vision Owner should see before choosing:

### Path A — translate the reel's poses to the 3D rig

Give the current staff/guest characters ARMS, LEGS, and a HEAD as separate meshes (or a skinned rig), then animate them per the reel's poses. Then a low-pitch view of the dining room reads actions the way the reel does.

- **Cost:** authoring a humanoid rig + walk / sit / wave / wait animations. Ships as `.glb` per ORDER 053 Del A's asset policy (external humanoid geometry allowed, must be CC0/Mixamo, license file alongside).
- **Return:** legible actions at any pitch, not just low ones. The measurement above becomes moot — the answer becomes "58° works too" rather than "we need a side view".
- **Risk:** breaks the ORDER 053 unit contract if the rig is authored at the wrong height; breaks the ORDER 057 §3 tolerance band (1.55–1.90 m) if the rig doesn't fit; breaks the ORDER 044 §3.2 puck-silhouette design decision that used cylinder radius + colour tone as the deliberate staff/guest differentiator.

### Path B — the dining room becomes a presentation mode

Keep the pucks. Accept that the strategic-scale simulation shows action ABSTRACTLY (colour of ring for rhythm, position of puck for who's where). Add a SECOND view — a dining-room-specific presentation with its own camera, its own actor geometry, its own asset budget — that the player enters at key moments (evening account, scenario resolution, service opening).

- **Cost:** an entire second render pipeline for the dining room. New camera controller, new asset pipeline, new UI transitions between strategic view and dining view.
- **Return:** the two scales stay honest — strategic view says what's happening in aggregate; presentation mode shows the moment.
- **Risk:** the second mode competes with the strategic view for attention; every improvement to the dining view is deferred while the mode's plumbing is built; the player's attention gets split by a mode switch instead of held on the room.

**This is a big decision. It should not be taken on feel.** The pitch-legibility measurement, as filed here, tells you that under the current puck geometry the answer to the low-pitch question is "no meaningful gain". Both Path A and Path B are ORDER-sized commitments and both should have their own report gates before build.

## 6. Not decided in this report

- Which of Path A / Path B / neither.
- Whether to relax the camera clamps below the current `minDistance = 10 / pitchMin = 18°` bounds.
- Whether to author interior table rows (they'd change the occlusion picture at low pitch).
- Whether the M5 rhythm ring reads acceptably at low pitch or needs its own re-shape.

Vision Owner sees the five images; the next order picks a direction, or declines to.

## 7. Housekeeping

Dev-only hooks added to make the probe possible (kept — generally useful for future measurements):
- `SimulationProvider` publishes `window.__nxSimDispatch` and `window.__nxSimState` in DEV.
- `BusinessProvider` publishes `window.__nxSetBusinessName` in DEV.
- Both tree-shake at prod build via `import.meta.env.DEV` guard.

Camera-clamp throw at `CameraContext.tsx` §92: temporarily relaxed for the probe, **reverted before commit**. The throw remains the guard against ORDER 067–style pose-authoring bugs.

Probe script left at `frontend/scripts/pitch-probe.mjs` for re-running under changed camera or geometry hypotheses.
