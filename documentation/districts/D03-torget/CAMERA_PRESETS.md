# Camera presets — D03 Torget

_Pre-review suggestions from Claude Code. Vision Owner refines these on the first pass. Every subsequent review uses the same positions so side-by-side diffing works._

D03 anchor: `(12.49, -27.59)` — Torget plaza landmark.
D03 radius: `100 m`.

## Suggested presets

### Overview
Shows Torget in the wider village context (D01 + D04 also visible).
- **focus:** `(12.5, -27.6)`
- **distance:** ~500 m
- **pitch:** 32°
- **yaw:** −0.35 rad
- **purpose:** confirms Torget's position relative to church + long house + Prästgatan approach

### Village
Same as the built-in village preset — Torget + Campus both in frame.
- **focus:** midway Torget ↔ Campus, i.e. `(290, -57)`
- **distance:** 900 m
- **pitch:** 32°
- **yaw:** −0.35 rad
- **purpose:** whole-village view — required for the trees / roads / water sanity checks in `VISION_REVIEW_WORKFLOW.md` §1 (position)

### Kvarteret (district)
Same as the built-in `district` preset — Torget in the middle third of the frame.
- **focus:** `(0, -24)` (Torget slightly SE of centre so the church tower fits)
- **distance:** 210 m
- **pitch:** 40°
- **yaw:** −0.30 rad
- **purpose:** primary district review shot — every window / door / roof-overhang check per `VISION_REVIEW_WORKFLOW.md` §3 / §4

### Torget direct — Gästgivaregården
Close view of the Torget–Gästgivaregården hospitality frontage.
- **focus:** `(35, 5)` (midpoint between Torget landmark and Gästgivaregården centroid)
- **distance:** 90 m
- **pitch:** 34°
- **yaw:** 0
- **purpose:** verify Gästgivaregården reference-package details (walls, roof, chimneys, dormers, sign, lantern)

### Torget long-house frontage
Close view of the D01 long house (technically in D01 but tenants appear from D03).
- **focus:** `(20, 32)` (long house centroid)
- **distance:** 70 m
- **pitch:** 34°
- **yaw:** 0.3 rad
- **purpose:** verify Kringlan / Cornelis / Antik tenant markers sit ON the long-house facade

### Business
Same as the built-in `business` preset.
- **focus:** `(12.5, -27.6)` (Torget centre)
- **distance:** 55 m
- **pitch:** 34°
- **yaw:** 0.15 rad
- **purpose:** verify plaza rendering per `KNOWN_ISSUES` D03-V-02 + D03-V-08 + D03-V-09

## After the first review

Vision Owner refines the numeric values and pins the finalised presets here. Every subsequent D03 review MUST use the same positions.
