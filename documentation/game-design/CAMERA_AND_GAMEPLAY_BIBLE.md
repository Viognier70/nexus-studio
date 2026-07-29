# Camera and Gameplay Bible

**Version:** 1.0
**Status:** Design bible — canonical statement
**Class:** Game-design specification
**Parent directive:** `documentation/foundation/EXECUTIVE_DESIGN_DIRECTIVE_001.md`
**Companion:** `documentation/game-design/GRYTHYTTAN_WORLD_SPECIFICATION.md`
**Supersedes:** `documentation/game-design/CAMERA_AND_VIEW_SYSTEM.md` (draft)

---

## 1. Purpose

This document is the canonical statement of how the camera and the moment-to-moment gameplay experience of Nexus fit together. It defines one continuous strategic world with three spatial scales, the rules for continuous zoom between them, the information the player can read at each scale, the ways decisions become visible in the world, and the reason the player never directly moves individual staff or guests.

The camera is not a viewer's convenience in Nexus. The camera is the mechanism by which the player earns the right to make each kind of decision.

---

## 2. One continuous strategic world

Nexus is played as a single continuous world. It is not a stack of three maps, not a nested set of menus, and not a mode picker. Zooming out and zooming in reveal the *same* Grythyttan at different reading distances.

- The world does not pause between scales.
- The world is not reloaded between scales.
- The camera does not cut, teleport or fade to black between scales.
- The world is not procedurally regenerated between sessions.

What changes with distance is not the world. What changes is what the player can see clearly, what they can select, and what kinds of decisions become available.

---

## 3. The three spatial scales

### 3.1 Grythyttan view

The player reads the village.

**Visible:**
- roads and paths,
- districts,
- institutions,
- currently operating commercial premises,
- water, terrain and landscape edges,
- ambient population flows through the village,
- movement between institutions, commercial premises and residential areas,
- competition and traffic between actors visible as aggregate flow.

**Decision family:**
Positioning within Grythyttan — how the village is behaving around the player's business, where traffic actually goes, which institutions and neighbours draw people, where opportunity or pressure lives.

### 3.2 District view

The player reads the neighbourhood around their business.

**Visible:**
- neighbouring businesses in higher detail,
- pedestrians choosing between destinations,
- deliveries arriving and departing,
- employees moving between work and rest,
- visitors and residents in the district,
- local events and small gatherings,
- direct competition for guest flows.

**Decision family:**
Competition and relationships — who the neighbours are, where the guests are actually choosing to go, what the district is doing to and around the business.

### 3.3 Business view

The player reads the interior of the business.

**Visible (cutaway interior):**
- the dining room,
- the bar and preparation area,
- the entrance and waiting area,
- storage where relevant,
- staff carrying out service actions,
- seated and arriving guests,
- simplified but recognisable service actions: greeting, seating, serving, decanting, tableside flambé (as a visual placeholder), clearing,
- the visible consequences of the player's strategic decisions.

**Decision family:**
Operations and service culture — how the business breathes, where pressure is building, what hospitality actually looks like right now.

---

## 4. Continuous zoom

Zoom is a single continuous variable. Mouse wheel, pinch and the outward control move the camera along one smooth curve. There are **no three buttons for three views**. The player never selects a "mode."

- The camera does not snap to preset distances.
- The camera does not step in discrete increments.
- The player can settle the camera anywhere on the zoom curve and stay there.

The three scales named in section 3 are ways to describe the *reading* of the world at different distances, not selectable modes. The player passes through them by living in the world.

### 4.1 Threshold behaviours

Along the continuous zoom curve there are defined **soft thresholds** at which the system changes what is presented. The changes are crossfaded in a narrow band around each threshold so the world reads as living, not as a menu.

Threshold-driven changes include:

- **Information density.** Village-scale ambient population fades in at long distance; district-scale pedestrian detail fades in at mid distance; interior detail fades in at short distance.
- **Roof visibility.** The roof of the player's business becomes progressively transparent below a defined distance, revealing the interior cutaway.
- **Interaction affordances.** At long distance, selection targets are buildings and districts. At mid distance, selection targets are buildings and people. At short distance, selection targets are people and interior fixtures.
- **Label chrome.** The current scale label (Grythyttan, Kvarteret, Vinbaren) fades between states without cutting.

The camera does not change. What can be read and clicked changes.

### 4.2 Transition character

All camera changes are **exponentially damped**. There are no instant cuts. There are no jump transitions between scales. Every camera change resolves within roughly one second. The world remains simulating during transitions; nothing pauses because the camera moved.

### 4.3 The opening (intent)

Nexus opens with the camera at the innermost point of the zoom curve, at approximately human height, inside the arriving bus. Over the opening minutes the camera draws slowly outward until it rests at the director's reading distance. The first minutes are the movement from being someone in the village to being the one who reads it.

This is directive intent per `SUPERSEDING_DIRECTIVE_002.md` §2.4. The implementation specification for the opening is authorised separately and is not part of this bible.

---

## 5. Information density by scale

Selection semantics and shown detail differ by camera distance. The player learns to read the world at each scale.

| Scale | Selection targets | Detail shown | Interface density |
|---|---|---|---|
| Grythyttan | buildings, districts | aggregate flows, silhouettes, institutions, commercial premises | very light — labels only where a selection is active |
| Kvarteret | buildings, people | individual pedestrians, deliveries, small events, competitive draws | light — cards on selection, contextual chrome only |
| Vinbaren | people, fixtures | full service activity, workload cues, guest reactions | moderate — sustainability conditions, operations chrome, policies within reach |

No scale shows a spreadsheet. Interior detail is legible from staff posture, guest state and table pace, not from stat panels.

---

## 6. Selection and focus

### 6.1 Selection

Selection is a passive act. Clicking a building or a person **describes** it but does not command it.

- At the village and district scales, selecting a building shows its name and role in a small chrome element.
- At the district and business scales, selecting a person shows a minimal card:
  - **Roll** (role — student, boende, gäst, servitör, leverantör, etc.),
  - **Just nu** (immediate intention — one short phrase),
  - **På väg mot** (current destination — one short phrase).
- No card exposes numeric hidden AI state. Curiosity is rewarded by watching the world, not by reading a spreadsheet.

### 6.2 Focus

Focus is a compositional act. When the player double-clicks or taps to focus a building or an area, the camera glides the focus point toward that location and the distance moves one comfortable step inward.

- Focus is always **damped**, never cut.
- Focus does not automatically zoom to a specific scale. It moves toward the target on the continuous zoom curve.
- Focus does not select a person as a controllable unit. A person can be selected for reading, never assigned as a target.

### 6.3 Outward

Moving outward is an explicit gesture:

- **Desktop:** Escape moves the camera outward one comfortable step and clears selection.
- **Mobile:** a persistent "Bakåt" button performs the same action.
- Wheel and pinch out are also outward gestures on the continuous zoom curve.

There is no "Back to Grythyttan" menu button. Outward is always continuous.

---

## 7. Why the player never directly moves individuals

Nexus is a game about hospitality as a craft. The craft is not that a proprietor puppeteers a server across a dining room. The craft is that a proprietor **arranges the conditions** under which a server, trained and paid and equipped, can do the work well.

Allowing direct move-orders would:

- collapse the game into a real-time-strategy puppet show,
- reward micro-optimisation instead of judgement,
- destroy the difference between good and bad service concepts,
- render every learning system (training, service concept, purchasing) redundant,
- misrepresent the profession the game is built on.

**Therefore:**

- Individual staff and guests are autonomous within the current conditions.
- The player influences behaviour by changing conditions and by making decisions.
- The player never issues a "walk here" or "do this now" command to a specific individual.

This is a design **line**, not a preference.

---

## 8. Decisions and visible activity

Every meaningful strategic decision must have a **visible signature in the world** before it has a legible signature in the interface. A judgement scenario resolves through what happens in the restaurant, not through a popup with three numeric outcomes.

The decision loop is:

1. **Observe** — read the world at the appropriate scale.
2. **Understand** — infer state from environmental cues, staff posture and guest reactions.
3. **Decide** — adjust conditions or answer a scenario, at the scale where the decision belongs.
4. **Watch** — consequences unfold over simulated time inside the world.
5. **Read** — the sustainability conditions summarise direction, cause and expected consequence, once there is enough signal to summarise.

If the world does not visibly change, the decision did not matter. This is a testability constraint on every future mechanic.

### 8.1 Judgement scenarios

Judgement scenarios (for example: a larger group arrives without a reservation while the dining room is nearly full) present the player with a small number of concrete responses. The scenarios have no universally correct answer. The response the player picks unfolds **inside the business view**:

- guests arrive or turn back,
- staff respond,
- waiting or seating changes,
- workload changes,
- guest reactions become observable,
- sustainability conditions move over the following sim time.

Scenarios are never resolved by an immediate results popup. The result lives in the room.

### 8.2 Sustainability as reading conditions

The three sustainability conditions (Ekonomisk, Social, Ekologisk) are readouts of how the world is currently living. Each shows:

- **direction** (stabil, förbättras, försämras, kritisk),
- **cause** (a short phrase quoting the most recent operational event),
- **delayed consequence** (a short phrase when the system has enough signal to project one).

The conditions **interact**. A decision that pushes one condition in one direction typically moves others in different directions and often at different delays. See the parent directive for the full statement.

---

## 9. Desktop interaction principles

| Input | Effect |
|---|---|
| Mouse wheel | Continuous zoom along the world curve |
| Left-drag on the world | Pan the focus point |
| Middle-drag or right-drag on the world | Orbit yaw and pitch around the focus |
| Q / E | Orbit yaw |
| Click on a building | Select and describe |
| Double-click or dedicated focus gesture | Focus and glide inward one comfortable step |
| Click on a person | Select and open the minimal card |
| Escape | Outward and clear selection |
| 1 / 2 / 3 | **Development shortcut only.** Not part of the player interface. |

Pitch is clamped within a comfortable range so the world plane is always the ground. Yaw is unrestricted. Roll is always zero.

Keyboard 1 / 2 / 3 exists only as a development shortcut for internal work. It is not exposed in help screens and is not advertised in the interface. It is not the intended interaction model.

---

## 10. Mobile / touch interaction principles

| Input | Effect |
|---|---|
| Pinch | Continuous zoom |
| One-finger drag | Pan the focus point |
| Two-finger drag | Orbit |
| Tap | Select |
| Persistent "Bakåt" button | Outward and clear selection |
| Long-press | Focus and glide inward one comfortable step |

Mobile input is a first-class scheme, not a secondary port. The persistent outward button on mobile compensates for the absence of Escape and is always reachable in one thumb.

---

## 11. Information the player never sees

- Numeric AI state on any NPC card.
- Rolling averages, satisfaction scores, workload percentages, ecological indices as headline numbers.
- Any morality bar or virtue score.
- Any dashboard that reduces the world to a spreadsheet.
- Timed countdown timers for arrival waves, service completion or scenario resolution.

Internal numeric state may exist. It does not dominate the interface.

---

## 12. Continuity and living world guarantees

- The simulation continues to run during camera transitions, selections, policy edits, and open scenarios.
- Selecting a person does not pause them.
- Opening the policy panel does not pause the world.
- Opening a scenario modal does not pause the world; the world continues, and the scenario begins to unfold inside the business view once the player picks a response.
- The player may zoom, pan and select while a scenario is unfolding. The scenario continues in the world regardless of camera position.

---

## 13. Accessibility

- All camera controls are reachable from keyboard on desktop.
- All camera controls are reachable from one-thumb touch on mobile.
- The persistent outward gesture (Escape / "Bakåt") is always available.
- Motion honours `prefers-reduced-motion`; damping is preserved but shortened, and non-essential motion is suppressed.
- Text contrast meets WCAG AA minimum.
- Selection cards are keyboard-navigable and screen-reader-legible.
- No mechanic requires holding a modifier and a mouse button simultaneously.

---

## 14. Non-goals

- First-person control of the player, or any avatar the player inhabits or moves, at any point in Nexus and in any mode of play — strategic, educational, ceremonial or introductory. (Per `SUPERSEDING_DIRECTIVE_002.md` §2.1.)
- Individual move-orders on any autonomous NPC.
- Snap-to-preset camera behaviour on the primary player interface.
- Numeric HUDs that dominate the interface.
- Cutscenes for scale transitions.
- Pause on selection.
- Immediate popups for judgement scenario outcomes.
- Menu-driven "Go to district" or "Go to business" navigation buttons.

---

## 15. Acceptance criteria for any strategic prototype

Before a strategic prototype may be considered acceptable, it must satisfy:

- All three scales are reachable through continuous zoom alone.
- Roof visibility and NPC / interior density crossfade smoothly around the defined thresholds.
- The world keeps living through every transition and selection.
- Selection semantics change with scale as described in section 5.
- The player-facing sustainability surface is qualitative (direction + cause + consequence). No morality bars appear.
- At least one strategic decision produces a visible signature in the world before it produces a legible one in the interface.
- The player never issues an individual move-order.
- Keyboard 1 / 2 / 3 is not shown as a player-facing control.
- Same seed and same policy inputs produce the same run (parent directive requirement).

---

**End of camera and gameplay bible.**
