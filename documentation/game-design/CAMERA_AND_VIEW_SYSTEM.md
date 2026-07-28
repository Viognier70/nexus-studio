# Camera and View System

**Version:** 0.1
**Status:** Draft
**Owner:** Game Design / Camera
**Scope:** Vertical Slice 002 and forward
**Related:** `VERTICAL_SLICE_002.md`

---

## Purpose

Define the camera and view system that carries the player between the three foundational spatial scales of Nexus: **village**, **district**, and **business interior**. The system must make the world feel continuous while allowing information density, interaction affordances, and building visibility to change at defined thresholds.

The player is not an avatar. The player is a director. The camera is the primary instrument of comprehension and decision.

---

## The three view levels

Each level names both a *place* and a *decision scale*.

### Level 1 — Grythyttan (village)

- Angled top-down view of the entire village and its surroundings.
- Visible: roads, forest, water, campus, church, hotel, café, bakery, wine bar, the available business plot.
- Shows ambient flow: residents, students, visitors, deliveries.
- Interaction: click a building to focus on it (camera glides toward that building).
- Decision scale: **positioning within Grythyttan** — what the village is doing to my business.

### Level 2 — Kvarteret (district)

- Closer view of the block around the player's wine bar.
- Visible: neighbouring businesses, pedestrians in higher detail, deliveries, small events, competitive draws between venues.
- Interaction: click a person to see a minimal information card (role, immediate intention, current destination). Click a neighbouring business to see its silhouette and traffic.
- Decision scale: **competition and relationships** — how the wine bar reads against its neighbours.

### Level 3 — Vinbaren (business)

- Cutaway of the wine bar: roof faded, walls partially reduced.
- Visible: dining room, bar, small preparation area, storage, entrance, staff and guests carrying out simplified activities.
- Interaction: click a person to see the same minimal card. No individual move-orders.
- Decision scale: **operations and service culture** — how the business breathes.

---

## Continuous zoom, threshold-driven behaviour

The player experiences **one continuous zoom**. Wheel and pinch move the camera closer or farther from a focus point on a single smooth curve. No level is a "menu button."

At defined distance thresholds the *system* changes what is shown and what can be interacted with:

| Camera distance | Label shown | Roof visible | Village NPCs | District pedestrians | Interior detail | Click semantics |
|---|---|---|---|---|---|---|
| far (60+) | **Grythyttan** | yes | full | fading in below 90 | none | select building |
| middle (15–60) | **Kvarteret** | fading between 25 and 15 | fading out above 60 | full | fading in below 25 | select building or person |
| near (< 15) | **Vinbaren** | hidden | none | none | full | select person |

Transitions between rows are **smooth crossfades in a 10–15 % band** around each threshold — no popping.

The camera itself does not snap. Only *what the camera sees and what the player can click* changes at thresholds.

---

## Camera controls

### Desktop

| Input | Effect |
|---|---|
| Mouse wheel | Continuous zoom (approach / retreat focus) |
| Left drag | Pan focus point in world plane |
| Middle drag or right drag | Orbit yaw and pitch around focus |
| Q / E | Orbit yaw left / right |
| Click on building | Camera focus glides to that building; zoom moves in one comfortable step |
| Click on person | Select and open info card (business level) |
| Escape | Zoom out one comfortable step; unselects |
| 1 / 2 / 3 | **Development shortcut only.** Jump-to-preset for village / district / business. Not part of the intended player interface. |

### Mobile / touch

| Input | Effect |
|---|---|
| Pinch | Continuous zoom |
| One-finger drag | Pan focus |
| Two-finger drag | Orbit |
| Tap | Select |
| Persistent "Bakåt" button | Zoom out one comfortable step; unselects |

### Rotation limits

- Pitch clamped between roughly 20° and 78° from horizontal. The player never sees underneath the world plane or straight down.
- Yaw unrestricted; the world has no canonical "north" the player must respect.
- Roll locked to zero.

### Transition character

Camera changes are **exponentially damped** (spring-like). No instant cuts. Each change resolves within roughly one second. The world remains simulating during transitions; nothing pauses.

---

## Selection and information density

### At the village level

- Buildings are selectable. Roads and terrain are not.
- Selecting a building moves the camera focus and shows the building's name in the view label chrome. No stat panels.

### At the district level

- People become selectable. Buildings remain selectable.
- Selecting a person shows a compact card:
  - **Roll** (role — student, boende, gäst, servitör, leverantör, etc.).
  - **Just nu** (immediate intention — one short phrase).
  - **På väg mot** (current destination — one short phrase).
- The card exposes no numeric hidden AI state. Curiosity comes from watching the world, not reading a spreadsheet.

### At the business level

- Staff and guests are selectable. The same card format applies.
- Selecting does not command. The player can watch but cannot move an individual.
- Interior detail (staff activity, table state, service pace) becomes visible only when the roof is transparent.

---

## Relationship between spatial scale and decision scale

The camera does not just move the player through space — it moves the player through **kinds of decisions**.

| Scale | Player's question |
|---|---|
| Village | Where does this business live in Grythyttan? What draws people through the village? |
| District | Who are my neighbours? Where are guests choosing to go, and why? |
| Business | How does service actually feel? Where is pressure building? What does hospitality look like right now? |

Every decision the player makes acts on the **business**, but the *reason* for the decision is often visible only at another scale. The camera is the mechanism by which the player earns the right to decide.

---

## Non-goals

- **No first-person view** at any point in the strategic experience.
- **No individual move-orders.** The player does not command a specific staff member to walk somewhere.
- **No stat panels.** No numeric HUD that reduces the world to a spreadsheet.
- **No architectural fidelity.** All buildings are procedural low-poly placeholders until rights and references are settled.
- **No cutscenes** at level transitions.

---

## Acceptance criteria for VS-02 use

- The player can reach all three view levels by zooming, without ever using keyboard 1/2/3.
- Roof visibility and NPC/interior density crossfade smoothly through the thresholds.
- Selection semantics change based on scale, per the table above.
- The world keeps living through every transition and selection.
