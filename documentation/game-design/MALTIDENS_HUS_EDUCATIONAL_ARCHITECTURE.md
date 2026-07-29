# Måltidens Hus — Educational Architecture

**Version:** 0.1
**Status:** Design specification — draft, ready for review
**Class:** Game-design specification (single-building gameplay architecture)
**Parent directive:** `documentation/foundation/EXECUTIVE_DESIGN_DIRECTIVE_001.md`
**Constitution:** `documentation/foundation/DESIGN_DECISIONS_001.md`
**Companions:**
- `documentation/game-design/GRYTHYTTAN_WORLD_SPECIFICATION.md`
- `documentation/game-design/CAMERA_AND_GAMEPLAY_BIBLE.md`

**Scope note.** This document specifies the *gameplay architecture* of Måltidens Hus: purpose, spatial organisation, educational philosophy, per-space gameplay loops, the competence dimensions the building writes to, how those dimensions later modulate strategic play, and the long-arc player journey. It does not specify geometry, coordinates, footprints or art. It does not authorise modification of the world layer. It does not implement code. It does not create assets. Where it touches world geography, it defers to the verified geographic layer (Layer A) and the Building Passport for Måltidens hus / Sevillapaviljongen (constitution §5, world spec §5). Where the building's real-world relationship to Sevillapaviljongen is unresolved (VQ‑02), this document treats *Måltidens Hus* as the interior educational programme hosted by the pavilion complex, without prejudice to the eventual passport resolution.

---

## 1. Purpose

### 1.1 Role in Nexus

Måltidens Hus is the **educational heart** of Nexus. It is the building through which professional knowledge enters the organisation the player will eventually direct. Every restaurant that succeeds in Nexus, every business that endures, every reputation that compounds — they all trace their competence back through Måltidens Hus.

The building serves three connected functions:

- **Acquisition.** Where knowledge is first encountered — texts, demonstrations, principles, sensory reference.
- **Practice.** Where knowledge is turned into craft — repetition, error, correction, mastery of act.
- **Demonstration.** Where craft is tested against real situations — service under load, judgement under pressure, hospitality performed in public.

These functions correspond to the Aristotelian triad the constitution already recognises: **Episteme, Techne, Phronesis** (constitution §7). Måltidens Hus is the spatial home of that triad.

### 1.2 What it is not

- Not a menu of courses.
- Not a skill tree.
- Not a lobby with buttons labelled "Kitchen", "Library", "Theatre".
- Not a place the player teleports to, completes a task in, and teleports away from.
- Not a source of generic experience points.
- Not a gate the player passes through once and forgets.

### 1.3 What it is

- A **place** the player inhabits, at first as a student, later as a practitioner, later still as a mentor.
- The site where the individual player's **competence dimensions** (§5) accumulate through observed, situated activity.
- The site where the organisation's **knowledge capital** (constitution §6) is later refreshed and taught.
- A living building on the same continuous zoom curve as the rest of Grythyttan. It is watched from the village, entered by walking in, and read from within like any other interior in Nexus.

---

## 2. Internal spatial organisation

### 2.1 Reading order

The building is organised so that a first-time visitor walks a natural progression:

**Entrance → Vestibulen (main lobby) → an inward decision.**

From the lobby, three doorways lead to the three primary study spaces:

- **Måltidsbiblioteket** — inward and quiet.
- **Gastronomiska Teatern** — sideways and public.
- **Metodköket** — downward and warm.

Beyond these, two social spaces belong to the same house:

- **Stensöta** — the student and staff commons; an operating café-restaurant integrated with the building.
- **Kalastorget** — the ceremonial dining hall; a courtyard-scale room used for banquets and public feasts.

The building has no hallway of doors. Passage between rooms is always through a legible transition — a threshold, a step, a change of light — never through a corridor of identical entries. The reason is legibility at strategic scale (see §2.9).

### 2.2 Entrance

**Character.** Modest, oriented to the pavilion approach. The door is heavy, deliberate, not automatic. It reads as an institutional threshold, not a shop entrance.

**Player experience.** On first visit, entry is the closing beat of the *First Arrival* sequence (`documentation/world/02_FIRST_ARRIVAL.md`) — the player has been walking; entering is the act of arriving. On repeat visits, entry is fast and unceremonious: the door opens, the vestibulen is one step ahead.

**Function.**
- Physical boundary between exterior weather (see the ambience engine in `frontend/src/audio/`) and interior acoustics.
- Anchor point for the *"return to the house"* muscle memory the player builds over dozens of hours of play.
- Sound design shifts on entry: outside wind and gravel give way to muted footsteps, distant kitchen sounds, low voices from the theatre.

**Gameplay affordances.** None on the entrance itself. It is a threshold, not an interactable.

### 2.3 Vestibulen (main lobby)

**Character.** A single high-ceilinged room. Natural light from clerestory windows. A central table with the day's programme (a passive information surface, not a menu). One wall carries a slowly changing display of student and alumni projects; another opens to the theatre; another to the library; a stair descends to the method kitchen.

**Function.**
- Orientation for first-time visitors.
- Meeting point for cohorts, mentors and guest chefs.
- Distribution point for the day's activities across the three study spaces.
- Read-only surface: the visible programme reflects what is happening in the building now, without menus.

**NPC roles.**
- **Vaktmästaren (the caretaker).** Present throughout the day. Answers a small number of situated questions ("where is the theatre demonstration today?") and provides the *soft tutorial* function for early players. Not a quest-giver.
- **Cohort mates.** Other students loitering, chatting, waiting for a session to begin. Their presence reads the pulse of the building.

**Interactions.**
- Read the day's programme (situated, not a menu).
- Speak with the caretaker (situated dialogue).
- Overhear neighbouring conversations (ambient dialogue, contributes to Cultural Fluency, §5).

**No transaction happens in the lobby.** The lobby is a place of passage and orientation. It does not sell, quiz or award.

### 2.4 Måltidsbiblioteket

**Character.** A reading room in three parts: a low-lit archive of texts and menus; a middle room with tables for study; a bright reading nook by the window. Silence is the norm. The room smells faintly of paper and wood.

**Function.** The library is the site of **Episteme** — theoretical knowledge. This is where principles are read, histories are traced, references are established.

**Content types (all authored, no generic filler):**
- **Menu archive.** Real and historical menus from Grythyttan, Sevilla, the Nordic tradition, canonical international kitchens. Documented sources per the parent directive.
- **Reference texts.** Short, readable passages on ingredients, techniques, wines, cultural traditions, service concepts. Written for the game, cited as such.
- **Case studies.** Documented past scenarios — a difficult service, a supply-chain failure, a reputational crisis — presented as reading, not as playable episodes.
- **Sensory reference.** Tasting notes, aroma taxonomies, texture vocabularies. Available for study before or between practical sessions.

**Interactions.**
- Sit at a reading table (the camera settles, ambient sound softens).
- Open a text (a small, legible reading surface appears; not a full-screen popup).
- Highlight or bookmark a passage (contributes to the player's personal reference, see §5.4).
- Ask a research librarian a question (NPC, one per shift; answers point the player to further reading, never gives a direct solution).
- Compare two menus side by side (a specific supported activity, not a general split-screen).

**Player activities and rewards.**

Reading is measured not by pages consumed but by *return*. A passage read once contributes minimally to competence. A passage revisited after practical work in the Metodköket or Stensöta contributes substantially more — because the second reading is a different reading. This is enforced by §5.2 (composite competence).

**Repeatability.** Every text can be revisited. The library's contribution to competence saturates for a first reading and re-opens after intervening practice.

**Multiplayer.**
- Study groups may share a reading table. When two or more players sit at the same table with a shared passage, both gain a small bonus reflecting peer instruction. The bonus is on the reader who explains, not only on the reader who listens.
- The library is silent enough that presence dominates over conversation.

**NPC roles.**
- **Bibliotekarien (the research librarian).** Points to references. Never delivers an answer to a practical question.
- **Studerande (fellow students).** Present as ambient life. Occasionally a student is visibly stuck on a passage; approaching offers a brief peer-teaching moment.

### 2.5 Gastronomiska Teatern

**Character.** A stepped amphitheatre facing a fully equipped demonstration kitchen. The kitchen is glass-fronted, mirrored above for overhead visibility, wired for the wall screen behind. The room seats forty comfortably and can accept standing observers along the back rail.

**Function.** The theatre is the site of **observed practice** — the bridge between Episteme and Techne. Here the player watches a technique being performed by a professional or a peer, in real time, with commentary, before attempting it themselves.

**Session types.**
- **Master demonstrations.** A visiting chef (NPC or later, with the player substitution rule, an experienced player) performs a technique or a full dish. Focus varies from knife work to plating to a full service pass.
- **Method breakdowns.** A faculty NPC dismantles a technique in front of the audience, exposing what usually stays hidden.
- **Reading of service.** A recorded (in-simulation, not video) fragment of a real dinner service is played back at reduced speed, and a mentor discusses what went well and what did not. The service being read is often the player's own from the previous evening.
- **Guest lectures.** Non-cooking sessions — a supplier, a wine grower, a municipal representative, a critic — presented in the theatre format.
- **Cohort presentations.** Students present a project or a case study. Optional audience discussion.

**Interactions.**
- Attend a session (the camera settles inside the theatre; the world continues running around it, per the constitution §12 living-world guarantee).
- Take a seat closer or further from the demonstration (closer seats offer detail; further seats offer view of the audience's reactions, which contribute to Cultural Fluency).
- Ask a question during the Q&A window (a small number of situated prompts; not a quiz).
- Volunteer as an assistant on stage (rare, prompted by the mentor NPC; a substantial Techne contribution).

**Rewards.** Techne acquired by observation, Episteme reinforced by the mentor's articulation, Phronesis contributed by watching how the mentor responds to unexpected questions. No numeric readout.

**Repeatability.** Sessions rotate on a weekly rhythm. A player who attends only master demonstrations and never volunteers plateaus faster than one who mixes attendance types.

**Multiplayer.**
- The theatre is inherently a shared space. Player and NPC audiences coexist.
- The Q&A prompt window is a natural moment for cross-player exchange: another player's question is a small ambient event that other players can hear.
- Cohort presentations are player-authored when the player population supports them (see §7.4 Master Gastronome).

**NPC roles.**
- **Fakultet (faculty demonstrators).** A small stable cast, each with a discipline and a recognisable style. Named. Present across seasons.
- **Gästkock (guest chef).** Rotating. Sessions are events; attendance windows are limited by session schedule, not by paywall.
- **Assistenten (the demonstration assistant).** Sets up and cleans up the demonstration kitchen. Approachable between sessions.

### 2.6 Metodköket

**Character.** A working teaching kitchen, warm and loud, with eight numbered stations along two facing benches. Windows onto a small herb garden. A row of ovens along one wall; a whiteboard at each station. The floor is scuffed.

**Function.** The kitchen is the site of **Techne** — practical craft. It is where the player *does the work*, under the eye of a mentor and under the correcting hand of their own mistakes.

**Session types.**
- **Foundations.** Knife work, stock, sauce, dough, pasta, filleting, portioning, plating. Long, repeated, gently escalating.
- **Compositions.** Constructing a dish end-to-end from a specification.
- **Reproductions.** Rebuilding a documented dish from the library archive.
- **Free work.** Open kitchen time. Attempt a personal composition, with a mentor available for consultation.
- **Timed pass.** A restricted-time session simulating service pressure. Ties directly to §6.1 (restaurant management).

**Interactions.**
- Take a numbered station (the camera settles at that station; the surrounding stations remain visible and audible).
- Follow a specification (a small, legible working surface; not a full-screen recipe overlay).
- Execute the technique (the game reads outcome from a small set of *sensed* signals — timing, temperature, structural condition of the product — not from a numeric score).
- Consult a mentor (situated dialogue; mentor gives one specific, actionable correction, never a global grade).
- Ask a peer at an adjacent station (contributes to Cultural Fluency and to the peer's Leadership Presence when they explain).
- Taste the result (a required closing action; the player is prompted to record a tasting note, which is written back into their library entries at §5.4).

**Rewards.** Techne, primarily. Episteme when a specification refers back to a library text and the player has read it. Phronesis when a session presents an unexpected constraint (a substitution, a scarcity, a broken tool) and the player adapts.

**Repeatability.** Very high. This is the room the player will spend the most hours in during the student phase. Repetition is the design; each repetition sharpens the sensed signals the player can read (see §5.3, Sensory Acuity).

**Multiplayer.**
- Kitchen stations are shared space. Two players at adjacent stations can visibly parallel each other's work and can borrow a tool, an ingredient, or a moment of attention.
- Timed passes can be run as **brigades** (a small team executing a coordinated service). Player-led brigades are unlocked in the practitioner phase (§7.2).
- Free work sessions may be co-authored: two players building one dish together.

**NPC roles.**
- **Kokmästaren (the kitchen master).** Runs the room. Approaches stations where a mistake is developing before the mistake completes. Firm, precise, non-judgemental.
- **Sous-mästaren (the sous-master).** Handles logistics, ingredients, setup and cleanup. Approachable, less formal.
- **Peers.** Other students at other stations, following their own specifications, at varying levels of competence.

### 2.7 Stensöta

**Character.** Named for the fern that grows in the shaded ledges around Grythyttan. A café-restaurant integrated into the building, open to the public. Small — twenty covers — with an open kitchen. Not a training-restaurant caricature. A real establishment that happens to be run by the school.

**Function.** Stensöta is the site of **applied Techne under real conditions**. It is where students execute service for actual guests, actual money, actual criticism. It is the softest available step from the Metodköket into professional service.

**Roles the player can take.**
- **Prep.** Morning work — mise en place, receiving deliveries, prep for the day's covers.
- **Line cook.** During service — one station, one set of dishes.
- **Server.** Guest-facing floor role.
- **Host.** Guest arrival, seating, waitlist.
- **Sommelier.** Beverage service, pairing conversation with guests.
- **Shift lead.** Coordinating a small team through a service window. Available only after the practitioner phase (§7.2).

**Interactions.**
- Take a role for a shift (the camera behaviour depends on role, see §2.9).
- Perform the role's activities under real service conditions — the guests are simulated Grythyttan life (constitution §10), not scripted actors.
- Deal with the unexpected: a walk-in, a complaint, a supplier late, a runner sick. These are the situated Phronesis moments.
- Receive a post-service review from the shift's lead. A single sentence, specific.

**Rewards.** Techne under load; Phronesis primarily. Cultural Fluency from guest-facing roles. Leadership Presence from the shift-lead role. Substantial contribution to the player's Reputation dimension (§5.7).

**Repeatability.** Daily. Each shift is a distinct event; each service produces a distinct set of situations. Repetition never becomes rote because guests are drawn from the living village and the village changes over time.

**Multiplayer.**
- Stensöta is designed for player brigades. A shift staffed by three players and one NPC reads and plays differently than a shift with four NPCs.
- The kitchen and floor coordinate visibly; a well-coordinated player pair produces measurably better service.
- Guests, per the player substitution rule (`09_NPC_AND_PLAYER_GROUPS.md`), may be other players — investors, alumni, visiting professionals — who arrived to observe or to eat.

**NPC roles.**
- **Ansvarig chef (the chef in charge).** Runs the kitchen. Recognisable, named, present across seasons. Different in style from the Metodköket's kokmästaren.
- **Hovmästaren (the maître d').** Runs the floor. Coordinates with the chef.
- **Reservation and supply NPCs.** Off-screen but present in the day's rhythm.
- **Guests.** Drawn from the living village; some named recurring characters, most ambient.

**Constraint.** Stensöta *cannot become* a game the player wins. Its purpose is instruction under real conditions. It is not scored, not ranked, not compared. Its output is written into the player's competence dimensions and into their reputation with the Grythyttan public, not into a leaderboard.

### 2.8 Kalastorget

**Character.** A courtyard-scale hall used for banquets, feasts, ceremonies, seasonal celebrations, alumni gatherings, and public occasions of significance. Long tables; a raised end wall for musicians or speakers; large doors that open onto the pavilion terrace in warm weather. In cold months, the room is candle-lit.

**Function.** Kalastorget is the site of **Phronesis-in-context** — the hall where knowledge, craft, tradition, hospitality and community meet in a single event. It is also the site where Nexus's ceremonial layer (initiation, seasonal feasts, examinations, alumni returns) is enacted.

**Event types.**
- **Introduktionsmiddagen.** The first-arrival banquet for new students (`documentation/world/07_THE_INITIATION.md`).
- **Årstidsmiddagar.** Seasonal feasts (spring, summer, autumn, winter — anchored to the real Grythyttan calendar per `documentation/world/06_TRADITIONS_AND_CEREMONIES.md`).
- **Examensbanketten.** Examination banquets, held when a cohort reaches Master Gastronome status.
- **Alumnimiddagar.** Alumni gatherings, in which returning experienced players (or NPC alumni) host courses for current students.
- **Gästmiddagar.** Guest banquets for visiting institutions, investors, critics, or municipal partners.
- **Publikmiddagar.** Occasional public banquets open to Grythyttan residents.

**Roles the player can take.**
- **Guest.** The default state. Attend, converse, participate in toasts and traditions.
- **Course lead.** Prepared and served one course for the banquet. Available in the practitioner phase.
- **Menu author.** Composed the full menu. Available in the master phase.
- **Master of ceremonies.** Ran the banquet. Available in the master phase, and rarely.

**Interactions.**
- Take a seat at a table (seating placement carries meaning; who sits with whom is a Phronesis signal).
- Participate in the ceremonies of the meal (toasts, songs, addresses, silences).
- Converse with tablemates (situated dialogue, contributes to Cultural Fluency and to the player's Reputation with the individual NPCs).
- Deliver a course (if course lead) — a compressed version of Metodköket work under banquet pressure.
- Respond to a *judgement scenario* that unfolds at the banquet: an unexpected arrival, a guest's dietary requirement discovered late, a supplier failure. These scenarios follow `CAMERA_AND_GAMEPLAY_BIBLE §8.1` — resolved in the room, not by popup.

**Rewards.** Phronesis, Cultural Fluency, Leadership Presence, Reputation. Banquets are the highest-density Phronesis events in Nexus.

**Repeatability.** Ceremonial calendar rhythm. Each banquet is scheduled; unscheduled banquets exist but are rare. Repetition is meaningful because each banquet has a distinct occasion.

**Multiplayer.**
- Kalastorget is designed as a shared occasion. A banquet with a full complement of players is the intended maximum-density expression of Nexus.
- Player alumni return to Kalastorget banquets as invited elders. This is the substitution rule (`09_NPC_AND_PLAYER_GROUPS.md`) at its most visible.
- Cross-cohort mixing is designed into seating.

**NPC roles.**
- **Rektor / värd (the rector / host).** Named. Presides. Speaks briefly at each banquet.
- **Ceremonimästaren (the ceremony master).** Coordinates the ritual elements. Approachable.
- **Musiker (the musicians).** Present at most banquets, playing traditional Bergslagen or Nordic music where documented, silent where not.
- **Recurring guests.** A rotating cast drawn from local life and from alumni.

### 2.9 Connections between spaces

Circulation follows three principles.

**Legibility from the strategic scale.** When the player observes Måltidens Hus from the *Grythyttan* or *Kvarteret* scale (`CAMERA_AND_GAMEPLAY_BIBLE §3`), the roof of the building becomes progressively transparent inward of the defined threshold, and the interior activity across the five main spaces (library, theatre, kitchen, Stensöta, Kalastorget) is visible as legible density. A packed theatre reads differently from an empty one at village scale.

**Continuous transition.** Between spaces, the player walks. The camera does not cut. Passage is a beat, not a load screen. Where the player enters a session (a demonstration, a shift, a banquet), the camera settles inside the space and the surrounding building continues to breathe around them (constitution §4, camera bible §12).

**No hub-and-spoke.** The lobby is not a hub with three spokes. The library, theatre and kitchen open off the lobby, but the library and theatre are connected through a mezzanine passage, the theatre and kitchen are connected through the back-of-house corridor used by the demonstration assistant, and the kitchen and Stensöta share a service passage. Kalastorget is entered from the pavilion terrace in warm months and from the vestibulen in cold months. The building is a house, not a diagram.

**Camera behaviour per space.**

| Space | Player presence | Default camera reading |
|---|---|---|
| Vestibulen | Avatar (student phase) or read from strategic scale (later) | Interior scale, damped orbit |
| Måltidsbiblioteket | Avatar; reading surface overlay when a text is opened | Interior scale, settled; ambient life visible in periphery |
| Gastronomiska Teatern | Avatar as audience; camera settles on the demonstration | Interior scale; the world continues around the theatre |
| Metodköket | Avatar at station | Interior scale, closer than default; sensed signals foregrounded |
| Stensöta | Depends on role. Prep/line: interior kitchen scale. Server/host: interior floor scale. Shift lead: reads the whole room as an operator would. | Role-appropriate |
| Kalastorget | Depends on role. Guest: seat scale. Course lead: kitchen and pass. Menu author or MC: whole-hall scale. | Role-appropriate |

In every case the camera behaviour is continuous with the rest of Nexus. The player never selects a "Måltidens Hus mode."

---

## 3. Educational philosophy

### 3.1 Why the triad, in this building

The constitution (§7) names **Episteme, Techne, Phronesis** as conditions of the organisation. Måltidens Hus is where the individual player first encounters these conditions in their own person, before the player has an organisation to invest in.

Educational play in Måltidens Hus is therefore the *personal* precursor to the *organisational* Knowledge Engine (constitution §11, Priority 7). What the player learns in Måltidens Hus is written into the player's competence dimensions (§5). What the player *later* invests in the knowledge capital of their business is informed by, but not identical to, the personal record. A player who has read deeply, cooked repeatedly, and dined attentively has different investment options open than a player who has not.

### 3.2 The three modes of study

Each of the three primary study spaces is oriented to one member of the triad, without excluding the others.

- **Måltidsbiblioteket → Episteme.** Understanding as principle. Slow. Solitary or paired. Cumulative.
- **Metodköket → Techne.** Execution as habit. Repetitive. Corrected. Embodied.
- **Gastronomiska Teatern → the bridge.** Observed practice — where Episteme is spoken over Techne being executed. Neither alone, both together.

Stensöta and Kalastorget are the sites of **Phronesis**, because Phronesis cannot be trained in isolation. It emerges only when Episteme and Techne meet a situation the player did not fully anticipate. Stensöta produces this daily under service pressure; Kalastorget produces it under ceremony pressure.

### 3.3 How the player moves between them

Movement between spaces is **not scripted** and **not gated**. The player is never told "you must go to the library before you can enter the kitchen." Movement is instead **incentivised by return** (see §5.2 composite competence):

- A specification in the Metodköket that refers to a library text yields more Techne when the player has read the text.
- A demonstration in the theatre lands differently when the player has failed at the technique in the kitchen the previous day.
- A banquet course in Kalastorget draws on Metodköket habits and library reading in a way that neither space's activities alone can produce.

The building is designed so that a player who cycles between library, kitchen and dining hall on a natural rhythm develops competence faster and more coherently than a player who saturates one space in isolation. The design does not punish saturation; it rewards return.

### 3.4 The role of guidance

Guidance in Måltidens Hus is always **situated**. Mentor NPCs do not queue up as quest-givers. They are present in their room, doing their work, approachable when the player is doing theirs. The player asks a question because a question has arisen from the work; the mentor answers because the mentor is in the room. This mirrors how a real school of gastronomy actually functions.

### 3.5 Time and rhythm

The building operates on the Grythyttan day and season. Library open hours are long; theatre sessions are scheduled; Metodköket sessions run in blocks; Stensöta opens for lunch and dinner services; Kalastorget events are on the ceremonial calendar. The player negotiates their own participation against this rhythm. A player who tries to do everything at once will find the schedule prevents them, which is intentional.

---

## 4. Gameplay loops

Where §2 described each space, §4 describes each space *as a gameplay loop* — the recurring cycle the player enters and exits, and what the loop does to the player over time. Cross-reference to §2 for spatial and NPC detail.

### 4.1 Loop: The library (Måltidsbiblioteket)

**Activities.** Browse the archive; open a text; read; highlight; bookmark; compare; ask the librarian; write a personal note.

**Interactions.** Reading surface; librarian dialogue; peer study; personal notebook (see §5.4).

**Rewards.** Episteme (primary), Cultural Fluency (from historical and ceremonial texts), Sensory Acuity (from tasting-note reading), Phronesis (indirectly — case studies).

**Progression.** Each text has a *first-reading* contribution and a *return-reading* contribution. Return contributions are unlocked by intervening activity in other spaces. There is no reading order and no completionist metric.

**Repeatability.** Full. Return reading is more valuable than first reading for many texts.

**Multiplayer.** Study groups; peer explanation; shared bookmarks.

**NPC roles.** Bibliotekarien; fellow students.

### 4.2 Loop: The theatre (Gastronomiska Teatern)

**Activities.** Attend a session; take a seat; observe; note; ask; volunteer as assistant; present (later phase).

**Interactions.** Session schedule (situated, on the vestibulen surface); seating; Q&A prompts; volunteer prompt (mentor-initiated).

**Rewards.** Techne by observation; Episteme reinforced; Phronesis from watching mentors handle the unexpected; Cultural Fluency from Q&A; Leadership Presence for presenters.

**Progression.** Attendance history influences which sessions the player is invited to volunteer at, and eventually to present at. There is no unlock; there is invitation, which is a Phronesis signal from the mentor.

**Repeatability.** Session-driven; each session is a distinct event. Master demonstrations rotate seasonally; guest chefs pass through.

**Multiplayer.** Inherently shared. Cohort presentations are player-authored at scale.

**NPC roles.** Fakultet; gästkock; assistenten.

### 4.3 Loop: The method kitchen (Metodköket)

**Activities.** Book a station; take a station; follow a specification; execute; consult; taste; note.

**Interactions.** Station whiteboard; specification surface; sensed signals (temperature, timing, texture, colour, structure); mentor consultation; tasting.

**Rewards.** Techne (primary); Sensory Acuity (primary — this is the room where sensed signals are trained); Episteme (via specification cross-reference); Phronesis (via adaptation to constraint).

**Progression.** Session types escalate: Foundations → Compositions → Reproductions → Free work → Timed pass. Escalation is *invited* by mentors when the player is ready, not *unlocked* by point totals. Readiness reads from the player's sensed-signal recognition (a Sensory Acuity threshold, invisible to the player as a number).

**Repeatability.** Very high — this is the daily repeated space in the student and practitioner phases.

**Multiplayer.** Adjacent stations; borrowed attention; brigades; co-authored dishes.

**NPC roles.** Kokmästaren; sous-mästaren; peers.

### 4.4 Loop: Stensöta

**Activities.** Take a role for a shift; work the shift; handle the unexpected; receive review.

**Interactions.** Role-specific — prep, line, floor, host, sommelier, shift lead. All under real service conditions.

**Rewards.** Techne under load; Phronesis (primary); Cultural Fluency (guest-facing); Leadership Presence (shift lead); Reputation (a substantial contributor to the player's public reputation in Grythyttan).

**Progression.** Roles open in a natural order: prep → line or floor → sommelier or host → shift lead. Opening a role is invitation-based, driven by the ansvarige chef and hovmästaren reading the player's competence and Phronesis.

**Repeatability.** Daily. Never rote — the guest population changes with the village and the season.

**Multiplayer.** Designed for player brigades. Player guests possible.

**NPC roles.** Ansvarig chef; hovmästaren; reservation and supply NPCs; guests.

### 4.5 Loop: Kalastorget

**Activities.** Attend a banquet; take a role (guest, course lead, menu author, master of ceremonies); participate in ceremony; respond to what emerges.

**Interactions.** Seating; ceremonial acts; conversation; role-specific work; judgement scenarios.

**Rewards.** Phronesis (primary); Cultural Fluency (primary); Leadership Presence (roles beyond guest); Reputation (very substantial). Banquets are peak-density events.

**Progression.** Roles open on the ceremonial calendar and by invitation. Menu author and MC are rare, weighty invitations that carry significant Reputation consequences.

**Repeatability.** Ceremonial rhythm; each banquet is a distinct occasion.

**Multiplayer.** Designed as a shared occasion. Alumni return.

**NPC roles.** Rektor/värd; ceremonimästaren; musiker; recurring guests.

### 4.6 What every loop shares

- **No completion metric.** No loop has a "100%" state.
- **No numeric readout.** No loop displays an XP figure, a percentage, or a score.
- **No pause.** The building continues around the player during any activity (constitution §4, camera bible §12).
- **No teleport.** Entering and exiting a loop is spatial — the player walks in, sits down, does the work, and walks out.
- **Situated invitation, not unlock.** Progression happens by NPC invitation reading the player's competence, not by threshold breach.

---

## 5. Knowledge system — competence dimensions

The parent directive prohibits generic XP. This section defines the alternative: a set of **competence dimensions** written to by observed, situated activity. These dimensions are individual-player attributes. They are the personal precursor to the organisation-level knowledge capital and the Knowledge Engine (constitution §6, §7, §11).

### 5.1 The seven dimensions

Nexus recognises seven competence dimensions for the individual player. Each is defined as an *ability to do or read something in the world*, not as a numeric level.

- **Theoretical Depth (Teoretiskt djup).** What the player understands as principle: culinary theory, ingredient knowledge, service theory, historical and cultural reference. Contributed to primarily by Måltidsbiblioteket and by Gastronomiska Teatern lectures.
- **Craft Mastery (Hantverksskicklighet).** What the player can execute with their hands and tools: techniques, compositions, timings, coordinations. Contributed to primarily by Metodköket and by Stensöta line and prep work.
- **Sensory Acuity (Sinnesskärpa).** What the player can perceive: taste, aroma, texture, visual state, sound of the kitchen, room temperature, the pulse of a service. Trained by repeated tasting in Metodköket, by observing in Gastronomiska Teatern, by drinking and eating attentively at Kalastorget and Stensöta.
- **Situational Judgement (Situationsomdöme).** What the player can decide when the situation is not covered by a specification. This is the player-level analogue of the organisation's Phronesis. Contributed to primarily by Stensöta and Kalastorget, and by case studies in Måltidsbiblioteket.
- **Cultural Fluency (Kulturell flyt).** What the player understands about the human context of the meal: tradition, ceremony, hospitality, guest expectation, regional identity, professional community. Contributed to by every space, most heavily by Kalastorget and by conversations across the building.
- **Leadership Presence (Ledarskap).** How the player is read by others when they carry responsibility for a team, a course, or a room. Contributed to by presenting in the theatre, running a Stensöta shift, leading a banquet course.
- **Professional Reputation (Rykte).** How the player is known in Grythyttan and, over time, in the wider gastronomic world. Contributed to by every visible public act — a Stensöta shift, a banquet, a demonstration presented, a case published, a service failure handled well or badly.

### 5.2 Composite growth

Dimensions are **written composite**, not in isolation. A single Metodköket session that produces a composed dish drawn from a library text and served to peers writes small amounts to Craft Mastery, Sensory Acuity, Theoretical Depth (because the specification cross-referenced a text the player has read) *and* Cultural Fluency (because the dish was shared and discussed).

The composition rule is:

> An activity writes to dimensions proportionally to the *aspects of the activity the player actually engaged*. A player who reads a specification, executes it, tastes the result and discusses it writes more broadly than a player who only executes it.

This makes competence a description of *what kind of learner the player is*, not only how much time the player has spent.

### 5.3 Sensed signals, not readouts

Dimensions are **not shown as numbers or bars**. The player reads their own competence through what they can now do or perceive in the world:

- A player with high Sensory Acuity notices tasting notes the game does not spell out.
- A player with high Craft Mastery finds Metodköket sessions faster to complete and less consultation-dependent.
- A player with high Cultural Fluency understands ceremonial language and gestures without being told what they mean.
- A player with high Situational Judgement is invited to run a Stensöta shift.
- A player with high Leadership Presence is asked to lead a banquet course.

The interface may confirm changes qualitatively — "the kokmästaren watches you longer today" — never quantitatively.

### 5.4 The personal notebook

The player carries an in-game personal notebook, always available. The notebook holds:

- Bookmarked library passages.
- Tasting notes written after Metodköket and Stensöta work.
- Session notes from the theatre.
- Names and short impressions of guests, mentors and peers encountered.
- A short list of the player's own compositions.

The notebook is a **reading surface** for the player and a **weighting input** for the competence system. It is not a stat sheet. The player writes it; the system reads it.

### 5.5 Decay and freshness

Competence dimensions carry a slow decay when unused. Craft Mastery decays if the player does not cook. Sensory Acuity decays if the player does not taste. Theoretical Depth decays only very slowly. Situational Judgement, Cultural Fluency, Leadership Presence and Reputation decay by *inaction* — a mentor who stops mentoring is remembered but no longer felt.

Decay is never punitive. It expresses the constitutional principle that knowledge is a living condition of the practitioner (constitution §9).

### 5.6 What competence does not do

- It does not unlock content by threshold.
- It does not appear in a numeric HUD.
- It does not compare players against a leaderboard.
- It does not resolve a scenario deterministically.
- It does not eliminate randomness (constitution §8).

### 5.7 Where the seven dimensions live

The seven dimensions live in the **player record**, not in the Building Passport and not in the organisation record. When the player later becomes a director of an organisation, the dimensions inform (a) which investments in the organisation's knowledge capital are open, (b) how effective those investments are, and (c) how the organisation reads and follows the director. This is §6 in detail.

---

## 6. Progression — how Måltidens Hus reaches into the rest of Nexus

The building is not a self-contained mini-game. Competence written in Måltidens Hus modulates strategic play across every later system.

### 6.1 Restaurant management

- **Menu design.** Menus the player composes for their own restaurant draw on Theoretical Depth (references understood), Craft Mastery (executable in the player's kitchen), Sensory Acuity (compositions that hold together), and Cultural Fluency (menus that make sense for their guest population).
- **Service concept.** Service philosophy choices (`DESIGN_DECISIONS_001.md §2`) are available in proportion to the player's Cultural Fluency and Situational Judgement. A player with shallow Cultural Fluency cannot successfully commit to a service concept that presupposes deep cultural understanding.
- **Judgement scenarios.** The group-arrival scenario (constitution §11, Priority 5) and its successors resolve differently depending on the player's Situational Judgement, not on a stat sheet. The player *sees more responses* when their judgement is deeper.
- **Staff training.** Investments in the organisation's Techne (constitution §7) are more effective when the director's own Craft Mastery is high. A director who cannot execute cannot successfully train.

### 6.2 Business development

- **Access to premises.** The Property Engine (world spec §7) accepts applications for premises with knowledge and judgement prerequisites (world spec §7.3). Prerequisites are read from the player's competence dimensions.
- **Concept viability.** Bank and investor assessment of a proposed concept reads the player's Theoretical Depth, Craft Mastery and Situational Judgement, as well as the organisation's projected competence.
- **New premises.** Redevelopment proposals that respect a building's cultural constraints (passport §5.4) require Cultural Fluency to author credibly.

### 6.3 Leadership

- **Staff trust.** Staff read the director's Leadership Presence. A director with strong Leadership Presence produces measurable calm in the organisation, expressed through the human capital (constitution §6) and legible in the world (constitution §9).
- **Delegation.** A high-Judgement director delegates well; the organisation performs closer to its capability.
- **Reputation within the profession.** Leadership Presence written at Kalastorget, in Metodköket presentations, and at Stensöta shift-leads compounds into Professional Reputation.

### 6.4 Gastronomy

- **Composition ability.** The player's Craft Mastery and Sensory Acuity determine what *dishes the player can credibly propose* — that is, what the game accepts as an authored composition rather than an imitation.
- **Reproduction fidelity.** Reproducing a documented dish credibly requires both Theoretical Depth (to understand what the dish is) and Craft Mastery (to execute it).
- **Sensory conversation.** A player with strong Sensory Acuity has fuller conversations with sommeliers, cheesemakers, wine growers and other specialists. These conversations open supply relationships.

### 6.5 Reputation

- **Public Reputation** is the seventh competence dimension and is the most visible externally. It is written by visible acts — a Stensöta service handled well or badly, a banquet course delivered with grace or a stumble, a demonstration presented with clarity or with confusion, a case study published (§7.3 practitioner phase).
- Reputation is not one-dimensional. It resolves per constituency: reputation with guests, with peers, with the faculty, with alumni, with the Grythyttan public, with suppliers. A player may be highly regarded in one and marginal in another.
- Reputation influences: who returns to Stensöta while the player is on shift; who accepts an invitation to the player's future business; which investors and banks read the player's application generously.

### 6.6 Investments

The five capitals (constitution §6) receive investment from the player. The efficiency and options of that investment are modulated by competence.

- **Knowledge capital.** A director's Theoretical Depth expands the options for investment; Craft Mastery expands the training the director can lead personally.
- **Human capital.** Leadership Presence modulates retention and wellbeing outcomes of human-capital investment.
- **Social capital.** Cultural Fluency and Reputation modulate the effectiveness of hospitality, supplier and community investments.
- **Cultural capital.** Every dimension contributes; Cultural Fluency and Sensory Acuity most directly.
- **Economic capital.** Situational Judgement modulates the quality of capital-allocation decisions across time.

Investment is never automatic — the player still authors it — but competence changes what the player *can see to invest in*, and what returns the investment plausibly produces.

### 6.7 The through-line

The through-line from Måltidens Hus to a mature Nexus career is:

**Situated activity → competence dimension → what the player can see, do, propose, lead and invest in.**

This is why the building matters as much as the restaurant does. What the player becomes in the building is what the player brings to the restaurant.

---

## 7. Player journey

A complete learning journey through Måltidens Hus is organised into four phases. Phases are **descriptive**, not gated: no phase is announced, no phase is displayed, no phase completes. They are the shape of a real education, and the game is designed to make that shape emergent.

### 7.1 Phase — New student

The player has arrived (`documentation/world/02_FIRST_ARRIVAL.md`) and has been registered at Sevillapaviljongen. The first entry into Måltidens Hus is part of the initiation (`07_THE_INITIATION.md`).

**Character.** Curious, disoriented, careful. The player does not yet know what any of the spaces do beyond their names on the vestibulen surface.

**Typical activity.**
- Follows the caretaker's brief orientation.
- Visits Måltidsbiblioteket and reads a short introductory text.
- Attends a foundational Gastronomiska Teatern session on knife work or stock.
- Sits at a Metodköket station under close mentor attention.
- Attends the introduktionsmiddagen at Kalastorget with their cohort.
- Eats at Stensöta as a guest before ever working there.

**Competence written.** Small amounts across many dimensions. Sensory Acuity and Cultural Fluency begin to move fastest, because the player is being exposed to a great deal of new perception.

**Multiplayer.** Predominantly cohort-based. Study groups form; brigades do not yet exist.

**Exit indicator (not shown to the player).** The player has attempted at least one complete Metodköket foundations session and has read at least one library text they will return to.

### 7.2 Phase — Practitioner

The player has spent enough time in the building that the mentors know them.

**Character.** Building habits. Choosing rooms with intent. Beginning to have preferences.

**Typical activity.**
- Regular Metodköket sessions, escalating from Foundations to Compositions.
- Regular library returns; the personal notebook fills.
- Occasional volunteer role in a theatre demonstration.
- First Stensöta shifts as prep or line cook.
- Second and third Kalastorget banquets, still as guest but with more attention to the ceremony.

**Competence written.** Craft Mastery advances substantially. Sensory Acuity deepens. Theoretical Depth builds. Situational Judgement begins to write once Stensöta shifts start producing situations. Leadership Presence begins with occasional presenting.

**Multiplayer.** Brigades form for timed passes and shifts. Peer study intensifies. Cross-cohort mixing at banquets.

**Exit indicator (not shown to the player).** The player has run at least one Stensöta shift on the floor or on the line without a mentor's constant supervision, and has led at least one Metodköket free-work composition to a mentor's satisfaction.

### 7.3 Phase — Advanced practitioner

The player is capable and recognised.

**Character.** Autonomous. Chooses what to work on and why. Approached by peers for help.

**Typical activity.**
- Metodköket sessions increasingly on Reproductions and Free work; Timed passes on a weekly cadence.
- Presents in Gastronomiska Teatern on a technique the player has become known for.
- Stensöta shifts include Server, Host, Sommelier and occasional Shift Lead roles.
- Leads a course at a Kalastorget banquet.
- Publishes a case study in the library (author-and-publish is a specific Metodköket–Bibliotek round-trip activity, requiring library research and Metodköket execution combined).
- May begin a small independent project — a supplier relationship, a supper club, an assistant role in an alumnus's business elsewhere in Grythyttan.

**Competence written.** Situational Judgement and Leadership Presence become primary. Reputation begins to compound. Cultural Fluency deepens through banquet and public roles.

**Multiplayer.** The player becomes a *teacher* in the peer sense — leading brigades, mentoring newer students in study groups, hosting cohort presentations. The player substitution rule (`09_NPC_AND_PLAYER_GROUPS.md`) begins to bind: the player is now a role a newer student can encounter.

**Exit indicator (not shown to the player).** The player has led a Kalastorget course successfully and has been invited (by an NPC mentor) to author a menu or to master-of-ceremonies a future banquet.

### 7.4 Phase — Master gastronome

The player has been recognised by the institution.

**Character.** A public figure in Grythyttan. Named. Known. Consulted. Judged.

**Typical activity.**
- Authors and delivers a banquet menu at Kalastorget as menu author or master of ceremonies.
- Runs Stensöta as chef in charge for a season (a rare, weighty invitation).
- Delivers a signature Gastronomiska Teatern session — a master demonstration in the format the player once attended as a student.
- Publishes multiple case studies.
- Mentors newer students formally, becoming a named mentor NPC-role to them (this is the strongest expression of the player substitution rule).
- Opens or leads a business elsewhere in Grythyttan (`GRYTHYTTAN_WORLD_SPECIFICATION.md §7`).

**Competence written.** All dimensions continue to write, but the primary growth is in Reputation and Cultural Fluency. Craft Mastery no longer writes rapidly — a master's Craft Mastery is at its plateau — but it still writes through teaching and through Free work.

**Multiplayer.** The player is now an *institution*. Their presence at a Stensöta shift or a Kalastorget banquet is itself an event other players attend.

**Return to the building.** The master gastronome does not leave Måltidens Hus. They return regularly — to teach, to present, to eat, to sit in the library reading rooms that they once sat in as a student. The building's culture depends on their return.

### 7.5 The journey is not one-way

At any phase, the player may re-enter earlier activity. A master gastronome may sit for a foundations session with new students to reset a habit. An advanced practitioner may spend a week reading history in Måltidsbiblioteket. This is not a regression. It is how a real gastronomic life sustains itself. The competence system supports this by continuing to write on any activity, at any phase, at rates appropriate to the player's current condition.

### 7.6 The journey has no end screen

There is no "you have completed Måltidens Hus" state. The building outlives the player's session. The player outgrows the student role and grows into the mentor role, but the building remains the site of that growth.

---

## 8. Non-goals

Måltidens Hus, under this specification, is not and may not become:

- A dispenser of skill points, XP, tokens or levels.
- A menu of courses picked from a list.
- A quest hub with quest-givers queued behind counters.
- A minigame that pauses the world while the player plays it.
- A puzzle whose completion unlocks a story beat.
- A scored competition between players (Stensöta and Kalastorget are not leaderboards).
- A cash shop for competence, in any form.
- A room the player can teleport to from a menu.
- A source of morality bars or virtue scores.
- A place where numeric HUDs dominate the interface.
- A location whose interior changes procedurally between sessions.
- A pretext for first-person action, in any mode. There is no avatar in Nexus at any scale (`SUPERSEDING_DIRECTIVE_002.md` §2.1); the strategic building-scale reading remains directorial per constitution §2.

---

## 9. Acceptance criteria for any Måltidens Hus prototype

A prototype of Måltidens Hus is acceptable only when it satisfies the following:

- The five main spaces (library, theatre, kitchen, Stensöta, Kalastorget) are reachable through the vestibulen and through the connecting passages named in §2.9.
- The camera behaviour is continuous with the rest of Nexus (camera bible §4, constitution §4). No mode picker, no teleport, no cut.
- The building is legible from the strategic scale — a full theatre reads differently from an empty one at Kvarteret scale.
- At least one gameplay loop from §4 is playable end-to-end without popup, teleport or pause.
- The competence system writes at least three dimensions from a single composite activity per §5.2, and does not display any dimension as a number in the interface.
- The world continues to run around any settled loop (constitution §12).
- No skill tree, no XP surface, no unlock chime.
- Situated invitation, not threshold unlock, drives progression (§4.6).
- Same seed and same policy inputs produce the same run (constitution §8, parent directive).
- Swedish in-game text via `strings.sv.ts` (project `CLAUDE.md`).
- No modification of world geometry or landmark placement in the course of implementing this specification.

---

## 10. Open questions requiring Vision Owner decision

- **MQ-01.** Is Måltidens Hus the interior programme hosted by the Sevillapaviljongen complex, or a separate building with its own passport? (Chained to `GRYTHYTTAN_WORLD_SPECIFICATION.md` VQ-02.)
- **MQ-02.** Is *Stensöta* the canonical Nexus name for the school café-restaurant, or is a real Grythyttan name in current use? Verification required.
- **MQ-03.** Is *Kalastorget* the canonical Nexus name for the ceremonial hall, or does the real complex use another name?
- **MQ-04.** *Dissolved* by `SUPERSEDING_DIRECTIVE_002.md` §2.3 — no avatar-to-camera transition exists to author. Retained here to preserve MQ numbering; do not re-open without unfreezing SD-002.
- **MQ-05.** Which existing faculty and named guest chefs (if any) may be represented by name and likeness? Rights checkpoint per `documentation/foundation/RIGHTS_REGISTER.md` §3 (the SEVILLA_PAVILION-origin checkpoint has been extracted to that register under ORDER 034 §2).
- **MQ-06.** What is the earliest phase in the four-phase journey at which the player is permitted to open or lead a business elsewhere in Grythyttan? Currently placed at Master (§7.4); Vision Owner may prefer Advanced Practitioner (§7.3).
- **MQ-07.** Does the personal notebook (§5.4) persist across sessions in the same run only, or across all runs of the same player identity? Interacts with save architecture.
- **MQ-08.** How is decay (§5.5) tuned to remain non-punitive while still legible? Numeric tuning is out of scope for this document.
- **MQ-09.** How is Reputation (§5.7) partitioned across constituencies and rendered to the player without a numeric surface? Design work required.
- **MQ-10.** What is the canonical Swedish in-game spelling of *"Måltidsbiblioteket"*, *"Gastronomiska Teatern"*, *"Metodköket"*, *"Vestibulen"*, and the working titles *"Stensöta"* and *"Kalastorget"* — for `strings.sv.ts`?

Until MQ-01 through MQ-10 are answered, this specification remains at draft.

---

## 11. Relationship to existing priorities

Under `DESIGN_DECISIONS_001.md §11`, the current implementation priorities are:

- Priority 1 — Gray Box Grythyttan.
- Priority 2 — Continuous strategic camera.
- Priority 3 — Living village.
- Priority 4 — Living restaurant.
- Priority 5 — First strategic scenario.
- Priority 6 — Capital investment.
- Priority 7 — Knowledge engine.
- Priority 8 — Property engine.

Måltidens Hus, as specified here, spans Priorities 1, 3, 4 and 7:

- Its **footprint and exterior** are Priority 1 content (Gray Box).
- Its **ambient life and daily rhythm** are Priority 3 content.
- Its **Stensöta service** is a Priority 4 instance in miniature — a living restaurant of a specific and constrained kind.
- Its **competence system** is the personal precursor to the Priority 7 Knowledge Engine and is a natural first surface on which to prototype the triad in play.

Implementation of Måltidens Hus content in any prototype must respect the priority ordering. Nothing in this specification authorises implementation ahead of an earlier priority.

---

**End of Måltidens Hus educational architecture.**
