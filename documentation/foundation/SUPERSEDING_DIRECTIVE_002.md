# Superseding Directive 002

**Version:** 1.0
**Status:** Awaiting Vision Owner approval. Not in force until approved and dated.
**Class:** Directive-level instrument
**Precedence:** Level 2 (per `ADR_001_DIGITAL_TWIN_PHASE.md` §4)
**Modifies:** `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §11
**Records:** Vision Owner decisions A, C and D
**Companion order:** `ORDER_034_DOCUMENTATION_ALIGNMENT.md`

> **Note (ORDER 034 §3):** Any `NN_*.md` document referenced below (e.g. `02_FIRST_ARRIVAL.md` in §2.4) lives at `documentation/archive/world-wp02/` after ORDER 034 §4 — the WP-02 corpus is historical, not authoritative.

---

## 1. Why this instrument

`ADR_001_DIGITAL_TWIN_PHASE.md` §4 states that an ADR may operationalise a Vision Owner decision but may not modify Constitution or Directive text, and that the correct instrument for such a change is a numbered successor or a Superseding Directive.

Decision A below modifies a named non-goal in `EXECUTIVE_DESIGN_DIRECTIVE_001.md` §11. A sprint order is not competent to make that change. This directive is.

Decisions C and D are recorded here because they concern document authority, which is directive matter.

**Decision B requires no instrument.** Curvature control points traced from public aerial imagery, with the tile reference recorded, already satisfy `ADR_001_DIGITAL_TWIN_PHASE.md` §2.2 as *verified*. Decision B is confirmation that the Vision Owner wants the work done, not an authorisation to do something previously prohibited. It proceeds under the existing ADR.

---

## 2. Decision A — No avatar. One camera, always.

### 2.1 The change

`EXECUTIVE_DESIGN_DIRECTIVE_001.md` §11 currently reads:

> First-person control of the player during strategic play.

This is **widened** to:

> First-person control of the player, or any avatar the player inhabits or moves, at any point in Nexus and in any mode of play — strategic, educational, ceremonial or introductory.

The clause is not deleted from the source document. Per `ADR_001_DIGITAL_TWIN_PHASE.md` §3, the original text remains as historical record and is read together with this directive.

### 2.2 Rationale

The continuous world is the load-bearing promise of the player experience. `CAMERA_AND_GAMEPLAY_BIBLE.md` §2 and §4 forbid the mode picker, the cut and the reload. An avatar cannot be entered from a damped zoom curve without a control-scheme handover, and that handover is the mode picker under another name.

Two input schemes would also have to be carried on both desktop and touch, against the single-scheme accessibility requirements of `CAMERA_AND_GAMEPLAY_BIBLE.md` §13.

And `NEXUS_GAMEPLAY_FRAMEWORK.md` §3.2 makes the director's chair a refusal rather than a preference. If the player *can* step into a body, the chair becomes an option instead of a condition, and the refusal stops meaning anything.

### 2.3 What this resolves

- `NEXUS_GAMEPLAY_FRAMEWORK.md` GQ-04 — resolved: no.
- `MALTIDENS_HUS_EDUCATIONAL_ARCHITECTURE.md` MQ-04 — dissolved. There is no avatar-to-camera transition to author.
- The conflict between `CAMERA_AND_GAMEPLAY_BIBLE.md` §14 and `MALTIDENS_HUS_EDUCATIONAL_ARCHITECTURE.md` §8 — resolved in favour of the camera bible.

### 2.4 What this does not remove

**Interiors remain reachable.** The roof crossfade below the interior threshold (`CAMERA_AND_GAMEPLAY_BIBLE.md` §4.1) is how every interior in Nexus is entered, including the five spaces of Måltidens Hus. Nothing in the educational architecture requires locomotion; it requires presence, and the camera provides presence.

**The opening survives, and improves.** `02_FIRST_ARRIVAL.md` specifies looking, observing and selecting one object to inspect. Those are camera verbs. Only the granting of "full movement" toward campus depended on an avatar.

The opening is therefore respecified as follows, and this is a directive-level statement of intent, not an implementation specification:

> Nexus opens with the camera at the innermost point of the zoom curve, at approximately human height, inside the arriving bus. Over the opening minutes the camera draws slowly outward until it rests at the director's reading distance. The first minutes are the movement from being someone in the village to being the one who reads it.

The implementation specification for the opening is authorised separately and is not part of this directive.

---

## 3. Decision C — ORDER 100 is a vision reference.

`ORDER 100 — Nexus Studio Game Design Constitution` was authored outside the precedence order of `ADR_001_DIGITAL_TWIN_PHASE.md` §4 and claims, in its own text, that all future gameplay design shall conform to it.

That claim is **retired**.

ORDER 100 is reclassified as a **vision reference**. It sits outside the seven-level precedence order and carries no binding force. It is cited for intent, never for authority. Where it conflicts with any level 1–7 document, the document prevails without further analysis.

### 3.1 Specifically inoperative

- **Professional Maturity** as a player-facing ladder (Novice → Practitioner → Reflective Practitioner → Professional → Expert). Conflicts with `NEXUS_GAMEPLAY_FRAMEWORK.md` §5.9 and §13, which sit at level 4 and are frozen.
- The **five-capital list** in its SUSTAINABILITY passage (Economic / Social / Ecological / Cultural / Scientific). The operative capital model is `DESIGN_DECISIONS_001.md` §6 at level 1.
- The **portfolio as the primary in-game progression surface**.

### 3.2 Specifically retained, by separation

The educational contribution of ORDER 100 is real. It is preserved by separating two surfaces that ORDER 100 conflated:

- **In-game:** the director's log (`NEXUS_GAMEPLAY_FRAMEWORK.md` §5.4). Diegetic, prose, no numbers, no tiers, no bars. It reads as a working notebook.
- **Institutional:** a competence portfolio generated *from* the log as an export. Never rendered in the game. This is where evidence-based competence statements, and the maturity stages if the Vision Owner wants them, may live for educational and research use.

One mind for the player. One report for the institution. They are not the same object and must not share an interface.

### 3.3 Framework remains frozen

Nothing in this section modifies `NEXUS_GAMEPLAY_FRAMEWORK.md`. Its text is untouched. Per `ADR_001_DIGITAL_TWIN_PHASE.md` §5.5 the framework remains frozen at v2.0 and unfreezing requires separate explicit Vision Owner authorisation.

---

## 4. Decision D — Independent review is retained.

No document authored by a given system is reviewed only by that system.

The C-01–C-05, D-01–D-05 and M-01–M-06 analysis in `DESIGN_DECISIONS_001.md` was produced by a reader working against documents it had not authored. That check found real conflicts and is a project asset. It is not surrendered when the toolchain is consolidated.

The current reviewer is recorded in `CLAUDE.md` and updated when it changes.

---

## 5. Effect on the precedence order

The precedence order in `ADR_001_DIGITAL_TWIN_PHASE.md` §4 is **unchanged**. This directive operates at level 2 and modifies level-2 text only. ORDER 100 is placed outside the order entirely by §3 above.

---

## 6. What this directive does not do

- It does not modify `DESIGN_DECISIONS_001.md`. Constitutional change requires `DESIGN_DECISIONS_002.md`.
- It does not modify `NEXUS_GAMEPLAY_FRAMEWORK.md`, which remains frozen.
- It does not modify `GRYTHYTTAN_WORLD_SPECIFICATION.md`.
- It does not authorise any code.
- It does not archive, move or delete any file. Those actions are ordered separately in `ORDER_034_DOCUMENTATION_ALIGNMENT.md`.
- It does not specify the opening. §2.4 states intent; the specification is authorised separately.

---

**End of Superseding Directive 002.**
