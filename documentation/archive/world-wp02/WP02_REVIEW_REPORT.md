# WP-02 Review Report

**Version:** 0.1
**Status:** Historical — superseded. Retained for tone, narrative and cultural reference.
Not an active specification. Superseded by SUPERSEDING_DIRECTIVE_002 (avatar) and by
EXECUTIVE_DESIGN_DIRECTIVE_001 §12 (authenticity). Rights items extracted to
documentation/foundation/RIGHTS_REGISTER.md.
**Reviewer:** Claude Code (per instruction in `10_WP02_REVIEW_AND_HANDOFF.md`)

> **Note (ORDER 034 §3):** After ORDER 034 §4, this report and every `NN_*.md` document cited below live under `documentation/archive/world-wp02/` and are **historical** — retained for tone, narrative and cultural reference; not authoritative. Rights items originally in §4 of this report have been extracted to `documentation/foundation/RIGHTS_REGISTER.md` and remain open there.
**Scope:** All Markdown files under `documentation/world/`
**Files reviewed:**

- `01_THE_ORIGIN.md`
- `02_FIRST_ARRIVAL.md`
- `03_GRYTHYTTAN.md`
- `04_CAMPUS_GRYTHYTTAN.md`
- `05_SEVILLA_PAVILION.md`
- `06_TRADITIONS_AND_CEREMONIES.md`
- `07_THE_INITIATION.md`
- `08_FIRST_HOUR_PLAYER_JOURNEY.md`
- `09_NPC_AND_PLAYER_GROUPS.md`
- `10_WP02_REVIEW_AND_HANDOFF.md`

---

## Executive Summary

WP-02 successfully establishes tone, place, and intent for The Origin. The corpus is emotionally coherent and tonally distinctive. However, it is not yet internally consistent as a spec: the opening sequence contradicts itself across `01` and `02`, several player verbs are named but not mechanically defined, the first hour is described in minutes but not in transitions, and MVP scope in `01` conflicts with the world content described in `03` and `09`. Legal exposure is acknowledged only for the Sevilla Pavilion (`05`) — Grythyttan itself, the campus, the church, tobacco/alcohol content, and GDPR handling of real-world player data are not addressed. Mobile is mentioned once (`02`) with a rule that does not scale to the rest of the corpus.

The exit gate cannot be cleared as-is. Specific blockers and recommendations are enumerated below.

---

## 1. Contradictions

### 1.1 Opening duration — 10 minutes vs. 5 minutes
`01_THE_ORIGIN.md` states "The first ten minutes must create curiosity, calm, anticipation, respect, belonging." `02_FIRST_ARRIVAL.md` scopes itself to "the player's first five minutes" with a 00:00–05:00 timeline. `08_FIRST_HOUR_PLAYER_JOURNEY.md` allocates 0–5 minutes to "Arrival," then 5–12 minutes to a "Human encounter." The three documents disagree on what the "opening" is and what belongs inside it.

### 1.2 Player verbs on the bus — enumerated vs. exclusive
`01` lists four bus actions as things the player *can* do concurrently: "look through the window, read an admission folder, observe other applicants, remain silent." `02` says: "Interaction is limited to looking, observing and selecting one object to inspect" from a four-item list (admission folder, neighbouring passenger, landscape, luggage tag). These are different verbs, different lists, and different affordance models (multi-verb vs. single-selection). "Remain silent" from `01` is absent from `02`; "luggage tag" and "landscape" from `02` are absent from `01`.

### 1.3 First sight of the Sevilla Pavilion — from the bus vs. after disembarking
`01` says: "After a final bend the bus enters Grythyttan. The first landmark is the Sevilla Pavilion." This locates the reveal from inside the bus, before arrival. `02` places the Pavilion reveal at 03:30–05:00, *after* the bus stops and doors open, with the player already on gravel. `05_SEVILLA_PAVILION.md` says the pavilion is "revealed gradually rather than through a dramatic cutscene… first notice its geometry through trees and then understand its scale and detail while approaching," which most naturally implies a walking approach, aligning with `02`, contradicting `01`.

### 1.4 When control is given
`01` says control is given after "The First Text" fades. `02` says the player "regains full movement" at 03:30 (arrival) and lists interactive verbs on the bus prior to that. These cannot both be true. The transition from cinematic to interactive is undefined and inconsistently placed.

### 1.5 "No tutorial" vs. explicit objective
`01`: "No tutorial appears." `02`: "One subtle objective appears only after the player has looked around: `Find the registration table`." A displayed objective is a tutorialisation surface, regardless of subtlety. Position needs to be reconciled.

### 1.6 MVP exclusions vs. described world
`01` MVP explicitly excludes: economy, multiplayer, business ownership, quizzes, banking.
- `03_GRYTHYTTAN.md` describes hospitality businesses, closures, bankruptcies, expansion plots, seasonal demand, local reputation as present in the village.
- `09_NPC_AND_PLAYER_GROUPS.md` includes Business owners, Bank, Suppliers, and Municipality as initial NPC groups.
- `07_THE_INITIATION.md` refers to employment options and starting opportunities that presuppose an economy.
- `08` at 47–57 min requires a visible consequence "affecting a person, event or organisation."

Either the MVP exclusion list in `01` is incorrect, or `03`, `07`, `08`, `09` describe post-MVP scope without labelling it as such.

### 1.7 The first human encounter — where and when
`02` at 03:30–05:00 says the player "may… speak to another applicant" and provides a first line of dialogue. `08` allocates 5–12 minutes to "Human encounter" with "an applicant, alumnus or staff member." The two documents place the first social interaction in overlapping but not identical windows, with different NPC scopes.

### 1.8 Ceremony overlap — welcome ceremony vs. initiation
`06_TRADITIONS_AND_CEREMONIES.md` MVP includes "one simplified welcome ceremony." `07` describes an initiation. `08` mentions "assist at a welcome dinner" as a first-hour choice. Whether the welcome ceremony *is* the initiation, follows it, or is unrelated is unspecified.

### 1.9 Initiation task set — inputs vs. sample
`07` lists initiation inputs abstractly (background, dreams, knowledge questions, practical micro-scenarios, judgement situations, interaction preferences). `08` at 12–25 min specifies a concrete sample: "one factual question, one practical ordering task, one ambiguous scenario, one reflection prompt." The mapping between the abstract input list and the concrete sample is unstated. Whichever is authoritative should be declared.

### 1.10 Single-player MVP vs. player substitution
`01` excludes multiplayer from MVP. `09` describes a "Player substitution rule" whereby players progressively replace NPC roles as population grows. In an MVP without multiplayer, this rule is inert and should be labelled post-MVP.

### 1.11 Season vs. traditions calendar
`01` sets the opening in July. `06` lists Mårten Goose dinner (November), winter ball, Christmas celebration, spring ball, church-based graduation — real seasonal traditions tied to specific dates. How the seasonal calendar advances (real-time, compressed, per-session) is not defined, and the mismatch between the July opening and the tradition list is unaddressed.

---

## 2. Undefined Player Interactions

The following verbs are named in the corpus but have no mechanical specification. Each is a production blocker.

| Verb / interaction | Source | What is undefined |
|---|---|---|
| "Read admission folder" | `01`, `02` | Diegetic held object vs. menu overlay; contents; reading time; skippability |
| "Observe other applicants" | `01`, `02` | Camera behaviour; NPC awareness of being observed; social feedback |
| "Remain silent" | `01` | Whether inaction is tracked; how the player learns silence is a valid choice |
| "Select one object to inspect" | `02` | Selection UI; consequences of choice; whether the choice is revisitable |
| Gradual pavilion reveal | `05` | Camera choreography; player agency during reveal; forced framing vs. free look |
| "Situated prompts" (table-setting, service observation, etc.) | `04` | Every one of these is named but has no interaction model |
| Flambé, carving, portioning, napkin folding, table setting | `06` | No mechanic; unclear whether these are QTE, simulation, minigame, or narrative |
| "One factual question" | `08` | Format (MCQ, free text, spoken); scoring |
| "One practical ordering task" | `08` | Drag/drop, sequence, timed; success condition |
| "One ambiguous scenario" | `08` | Dialogue tree, choice matrix, or open response |
| "One reflection prompt" | `08` | Free text? Selectable statement? Silent moment? Does anything read the answer? |
| Profile reveal | `07`, `08` | UI surface; time on screen; how the "multidimensional starting profile" is visualised |
| "Assist at a welcome dinner" and sibling choices | `08` | Every one of the four listed choices lacks a mechanical description |
| Visible consequence | `08` | Surfacing UI, magnitude, persistence, reversibility |
| Player substitution of NPC functions | `09` | Trigger conditions, essential-service protection, matchmaking |
| "Verified evidence vs. self-reported experience" distinction | `07` | Verification mechanism entirely absent |

---

## 3. Missing State Transitions

The corpus describes states and beats but rarely the transitions between them. The following are unspecified and required before implementation can begin.

- **Bus interior → disembark.** Cut, seamless walk-off, cinematic. See §1.3, §1.4.
- **Disembark → Pavilion approach.** Forced path, free traversal, or invisible gate on "Find the registration table."
- **Pavilion approach → registration.** Entrance mechanic; who greets the player; whether the pavilion is enterable in MVP.
- **Human encounter → initiation sample.** How the player is drawn from a social beat into an assessment; whether the encounter is skippable.
- **Initiation sample → profile reveal.** Location, cinematic treatment, elapsed in-world vs. real time.
- **Profile reveal → meaningful choice.** How the three opportunities are surfaced; commitment vs. reversibility.
- **Consequence → return hook.** How consequence is instrumented and displayed.
- **Return hook → session end.** Does the first hour end with a save, a hard stop, a cinematic, or continued open play?
- **Applicant → student → alumnus** (`04` player states). No state machine, no promotion criteria, no persistence rules.
- **Session-to-session persistence.** What carries: profile, reputation, world changes, Grythyttan modifications, unlocked events. Unstated.
- **Time-of-day advancement.** Real-time vs. compressed vs. narrative jumps. Unstated.
- **Seasonal transitions.** `03` and `06` require a season model. Not defined. See §1.11.
- **Failure / retry.** What happens if the player fails a practical or reflection task in `07`/`08`. Unstated. `07`'s "fairness rules" imply retryability but do not define it.
- **Disconnection / mid-scene quit.** Not addressed anywhere.
- **Return-player entry.** Whether the opening replays, skips, or offers chapter select.

---

## 4. Content Requiring Legal or Factual Verification

### 4.1 Real-place representation
- **Grythyttan (village).** Real Swedish village in Hällefors kommun. `03` acknowledges the authenticity rule but does not record a rights checkpoint. Local businesses, street names, signage, and residents implicitly need clearance strategy.
- **Sevilla Pavilion.** `05` correctly flags a rights checkpoint for architectural depiction, naming, and commercial representation. The building has a specific real provenance (Seville 1992 World Expo, relocated to Grythyttan) — check pending.
- **Grythyttan Campus.** `04` describes an institution that closely mirrors the real Örebro University Restaurant and Culinary Arts school. No rights checkpoint recorded. Naming, curriculum overlap, and depiction risk unaddressed.
- **Bergslagen.** Cultural-heritage region referenced in `01`. Depiction is likely low risk but should be confirmed.
- **Grythyttan church.** `06` refers to "church-based graduation ceremony." Real building is Grythyttans kyrka. Religious content and property depiction not flagged.
- **Municipality.** `09` names a Municipality NPC group. If depicted as Hällefors kommun, depiction of a real Swedish local government requires care.

### 4.2 Content rating exposure
- **Cigars.** `06` explicitly includes "cigar knowledge as historical curriculum content." Tobacco depiction affects PEGI/ESRB/CERO/GRAC ratings and blocks distribution in some markets. Must be scoped or removed.
- **Alcohol.** `06` includes "food and beverage pairing" and lists ceremonial events (cocktails, dinners, balls). Alcohol depiction affects age rating and, in Sweden specifically, brand licensing risk (Systembolaget monopoly, real distiller/brewer names).
- **Church graduation.** Religious content is rating-sensitive in several markets and requires review.

### 4.3 Data protection and privacy
- `07` optionally collects "real-world background" from the player: profession, education, history. This is personal data under GDPR. Consent, minimisation, retention, right to erasure, and cross-border transfer are unaddressed. Minors' data requires additional safeguards.
- `07` also states "The system must distinguish verified evidence from self-reported experience." Any verification mechanism will collect further personal data (e.g., credentials) and requires a documented lawful basis.

### 4.4 Institutional and brand exposure
- `09` names "Bank," "Suppliers," and "Business owners" as NPC groups. Any resemblance to real Swedish banks (Handelsbanken, SEB, Swedbank, Nordea, Sparbanken Bergslagen) or named suppliers requires clearance or fictionalisation.
- Traditional French service terminology (`06`) is generic and likely safe; specific school lineage should be checked.

### 4.5 Factual claims
- The 08:14 arrival time (`01`), the Pavilion's provenance (`05`), and the specific tradition list (`06`) should be fact-checked with the Vision Owner and, where applicable, the institution.

---

## 5. Mobile / Desktop Conflicts

### 5.1 Mobile guidance is one line for the entire package
`02` is the only file that mentions mobile: "Mobile version may compress the bus sequence to 45–60 seconds while preserving agency." This single instruction has cascade effects that no other document addresses.

### 5.2 First-hour timing does not scale to mobile
`08` specifies a 60-minute first-hour journey with seven timed beats. Mobile sessions are typically 3–10 minutes. If the bus is compressed to 45–60 seconds, the rest of the sequence must also be re-timed — or the mobile "first hour" must span multiple sessions, requiring a session-resume model not described anywhere.

### 5.3 Interaction model assumptions
Verbs across the corpus assume a camera and free movement (look through window, walk toward campus, observe service). No mobile input mapping is provided for:
- free look during the bus ride,
- object inspection selection,
- traversal from bus stop to Pavilion,
- practical tasks in `06`/`07`/`08`.

### 5.4 HUD-off / no-minimap rule
`02` requires no minimap during the first three minutes and no currency/level/stats. Feasibility on small screens (wayfinding without minimap) and in portrait vs. landscape orientation is not considered.

### 5.5 Photo/hero moments
`05`'s pavilion reveal is composed for a wide framing. Mobile portrait orientation and 19.5:9 aspect ratios will materially change the shot. No aspect-ratio direction is provided.

### 5.6 Cross-platform persistence
`03` requires world persistence; `09` describes population-driven substitution. Cross-platform account model, save sync, and rate-of-change parity (mobile players vs. desktop players in the same shared world) are not addressed.

### 5.7 Read/reflection load
`07` and `08` include reading (folder, profile reveal) and a reflection prompt. Mobile reading UX, keyboard-less text entry for reflection, and voice input are not specified.

---

## 6. Implementation Dependencies

### 6.1 Declared dependencies in the corpus
- `02` declares dependency on `01`.
- No other file declares its dependencies.

### 6.2 Undeclared dependencies observable from content

| File | Depends on (undeclared) |
|---|---|
| `03` | Economy, reputation, seasonal/weather, festival, persistence, real-place rights |
| `04` | `05` (Pavilion sits within campus), `06`, `07`, examination system, ceremony system |
| `05` | Streaming/LOD, camera direction system, rights clearance |
| `06` | Calendar/season system, ceremony system, cooking/service mechanics, alcohol/tobacco rating decisions |
| `07` | Player profile system, verification mechanism, privacy/GDPR framework, retry model |
| `08` | `07`, human-encounter dialogue system, consequence/instrumentation system, save at 60-min boundary |
| `09` | Economy, `07`, matchmaking, essential-service protection logic, multiplayer (excluded in `01` MVP) |

### 6.3 Shared systems not defined anywhere in WP-02
- Player identity / avatar / embodiment model.
- Save, checkpoint, autosave, and resume policy.
- Time-of-day and weather systems.
- Seasonal calendar and its relationship to real-world time.
- Dialogue and choice system.
- Consequence and reputation instrumentation.
- Localisation (Swedish source vs. English content; NPC speech language).
- Accessibility framework.
- Rating/compliance handling for cigars, alcohol, and religion.
- Rights and clearance workflow.

### 6.4 Hand-off gaps by discipline
- **Art:** Style is uncommitted (photorealistic vs. stylised). `05` provides constraints for the Pavilion only. Vegetation, weather post-rain state, character wardrobe, and signage direction are absent.
- **Sound:** `01` states only what music is *not*. Diegetic bus interior, bird species, reverb zones, and the treatment of "The First Text" are undefined.
- **UX:** HUD philosophy is negatively defined (no minimap, no currency). Positive UX for objectives, profile reveal, consequence surfacing, and mobile input is missing.
- **Game design:** Every named interaction in §2 is unresolved.
- **Engineering:** Streaming, save policy, session length, cross-platform, and privacy compliance are unresolved.
- **Legal:** Only the Pavilion rights checkpoint is on file.

---

## 7. Exit Gate Assessment

The exit criteria in `10_WP02_REVIEW_AND_HANDOFF.md` are evaluated below.

| Criterion | Status | Evidence / Blocker |
|---|---|---|
| First-hour journey is coherent | **Not met** | Contradictions §1.1, §1.2, §1.3, §1.4, §1.5, §1.7, §1.8, §1.9. Transitions §3. |
| Real-place rights checkpoint is recorded | **Partially met** | Recorded for the Pavilion (`05`). Missing for Grythyttan village, campus, church, municipality. See §4.1. |
| Initiation does not lock roles | **Met** | Stated explicitly in `07` ("no permanent role lock") and reinforced in `08`. |
| At least one gameplay consequence exists | **Partially met** | Described in `08` at 47–57 min ("visible consequence… affecting a person, event or organisation") but neither instrumented nor exemplified. |
| Art and sound teams can begin concept work | **Partially met** | Art: only Pavilion constraints exist; overall style undecided. Sound: only negative direction ("no dramatic music"). Both teams can begin *mood-board* work but not concept work against a spec. |

**Overall:** The exit gate is **not clearable** in the current draft.

---

## 8. Recommendations (prioritised)

1. **Reconcile `01` and `02` on the opening sequence.** Pick one timeline, one verb set, one placement of the Pavilion reveal, one moment of control handoff. This unblocks §1.1–§1.5.
2. **Split MVP scope out of `01` into a dedicated scope document.** Reconcile with the world content in `03`, `07`, `08`, `09` by explicitly labelling post-MVP systems where they appear. Resolves §1.6, §1.10.
3. **Author a "Verbs and Interactions" companion doc** that resolves every entry in §2.
4. **Author a "State Transitions" companion doc** covering §3, including session boundaries, save policy, and return-player entry.
5. **Extend the rights checkpoint from `05` to a formal legal register** covering Grythyttan, the campus institution, the church, the municipality, and every named tradition. Add a decision on cigars and alcohol before art/design commits work. See §4.
6. **Author a mobile/desktop parity note.** Define input mapping, session length, HUD philosophy per platform, and cross-platform persistence. Resolves §5.
7. **Publish shared-systems assumptions** (identity, save, time, weather, dialogue, consequence instrumentation, localisation, accessibility) so all discipline hand-offs are against a stable base. Resolves §6.3.
8. **Add a "The First Text" specification** covering language(s), diegesis, presentation, audio treatment. This is the single most tonally load-bearing beat and is currently one line of text.
9. **Vision Owner review** as required by `10` §"Required human review" — traditions, Grythyttan representation, terminology, authenticity, emotional tone. Do not proceed to Approved without it.

---

## 9. What This Report Does Not Cover

- No code was created and no application initialised.
- No files were modified; this report is additive.
- Human review items reserved for the Vision Owner (memories, traditions, representation, terminology, authenticity, emotional tone) are out of scope for this report and are called out in Recommendation 9.
- Detailed prose critique of individual documents is limited to what serves the six review categories requested. A separate document-by-document line edit is available on request.

---

**End of report.**
