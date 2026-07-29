# RIGHTS REGISTER

**Version:** 1.0 (initial stub — created under `ORDER_034_DOCUMENTATION_ALIGNMENT.md` §2)
**Date:** 2026-07-29
**Status:** Stub with open items. **Not a legal opinion.** No item is assessed, concluded or recommended on.

---

## 0. Scope and governance

This register is the single ledger of rights, legal, GDPR and content-rating exposure for content that appears in — or is planned to appear in — Nexus Studio.

**Governing rule.** Marking any item below as cleared requires a Vision Owner entry. Claude Code and any other automated author must not close, assess or recommend on any item. New rows may be added. Open rows may be edited to add source citations but not to add conclusions.

Referred to the Vision Owner per `ORDER_034_DOCUMENTATION_ALIGNMENT.md` §10: filling the clearance column is not orderable work; it requires the Vision Owner and, in the author's view, competent legal advice.

**Companion document.** `MALTIDENS_HUS_EDUCATIONAL_ARCHITECTURE.md` MQ-05 is repointed to this register in the same commit that creates it.

---

## 1. Origin — the Sevilla Pavilion rights checkpoint

Extracted verbatim from `documentation/archive/world-wp02/05_SEVILLA_PAVILION.md` §"Rights checkpoint":

> Before production use, verify permissions concerning architectural depiction, naming and commercial representation.

Prior to this register, that sentence was the only rights instrument recorded anywhere in `documentation/`. It is preserved here as the origin of the rights ledger and remains **open** as an item in its own right.

---

## 2. Open items carried across from `WP02_REVIEW_REPORT.md` §4

Every item below is **open**. Source lines are quoted or paraphrased tightly from `documentation/archive/world-wp02/WP02_REVIEW_REPORT.md` §4; nothing has been reinterpreted.

> **Note (ORDER 034 §3):** The `NN_*.md` documents cited by short name in the items below all live at `documentation/archive/world-wp02/` after ORDER 034 §4 — the WP-02 corpus is historical, not authoritative.

### 2.1 Real-place representation (WP02 §4.1)

- **Grythyttan (village).** Real Swedish village in Hällefors kommun. `03_GRYTHYTTAN.md` acknowledges the authenticity rule but records no rights checkpoint. Local businesses, street names, signage and residents implicitly need a clearance strategy. **Open.**
- **Sevilla Pavilion.** Building has a specific real provenance (Seville 1992 World Expo, relocated to Grythyttan). Rights checkpoint recorded in `05_SEVILLA_PAVILION.md`; verification pending. **Open.**
- **Grythyttan Campus.** Closely mirrors the real Örebro University Restaurant and Culinary Arts school. No rights checkpoint recorded. Naming, curriculum overlap and depiction risk unaddressed. **Open.**
- **Bergslagen.** Cultural-heritage region referenced in `01_THE_ORIGIN.md`. WP02 §4.1 assesses depiction risk as "likely low" but requires confirmation. **Open.**
- **Grythyttans kyrka.** `06_TRADITIONS_AND_CEREMONIES.md` refers to a "church-based graduation ceremony". Real building. Religious content and property depiction not flagged. **Open.**
- **Municipality (Hällefors kommun).** `09_NPC_AND_PLAYER_GROUPS.md` names a Municipality NPC group. Depiction of a real Swedish local government requires care. **Open.**

### 2.2 Content-rating exposure (WP02 §4.2)

- **Cigars.** `06_TRADITIONS_AND_CEREMONIES.md` includes "cigar knowledge as historical curriculum content". Tobacco depiction affects PEGI / ESRB / CERO / GRAC ratings and blocks distribution in some markets. Must be scoped or removed. **Open.**
- **Alcohol.** `06` includes "food and beverage pairing" plus ceremonial events (cocktails, dinners, balls). Alcohol depiction affects age rating and, in Sweden specifically, brand-licensing risk (Systembolaget monopoly, real distiller / brewer names). **Open.**
- **Church graduation.** Religious content is rating-sensitive in several markets and requires review. **Open.**

### 2.3 Data protection and privacy (WP02 §4.3)

- **Real-world background collection.** `07_THE_INITIATION.md` optionally collects profession, education and history from the player. Personal data under GDPR. Consent, minimisation, retention, right to erasure and cross-border transfer are unaddressed. **Open.**
- **Minors' data.** Additional safeguards required. **Open.**
- **Verification mechanism.** `07` requires distinguishing verified evidence from self-reported experience. Any verification mechanism will collect further personal data (e.g. credentials) and requires a documented lawful basis. **Open.**

### 2.4 Institutional and brand exposure (WP02 §4.4)

- **Named Swedish banks.** `09` names "Bank" as an NPC group. Any resemblance to Handelsbanken, SEB, Swedbank, Nordea or Sparbanken Bergslagen requires clearance or fictionalisation. **Open.**
- **Named suppliers.** Same clearance-or-fictionalise requirement. **Open.**
- **Business owners.** Same. **Open.**
- **Traditional French service terminology (`06`).** Generic terminology likely safe; specific school lineage should be checked. **Open.**

### 2.5 Factual claims (WP02 §4.5)

- **The 08:14 arrival time** (`01_THE_ORIGIN.md`). **Open — fact-check with Vision Owner.**
- **The Pavilion's provenance** (`05_SEVILLA_PAVILION.md`). **Open — fact-check with Vision Owner and, where applicable, the institution.**
- **The specific tradition list** (`06_TRADITIONS_AND_CEREMONIES.md`). **Open — fact-check with Vision Owner.**

---

## 3. Open items from other design documents

- **Faculty and guest-chef likeness (MQ-05).** From `documentation/game-design/MALTIDENS_HUS_EDUCATIONAL_ARCHITECTURE.md` §10: "Which existing faculty and named guest chefs (if any) may be represented by name and likeness?" **Open.**

---

## 4. Currently-rendered named entities

Source of truth: `documentation/architecture/LANDMARK_CATALOGUE.md` — the 23 landmarks verified in `landmarks.json` are currently rendered in the world. Vision-Owner-confirmed-but-not-in-OSM landmarks (15) and documented-absent landmarks (3) are **excluded** — they are not rendered and therefore not yet a rights exposure.

`WP02_REVIEW_REPORT.md` recommendation 5 (see `ORDER_034_DOCUMENTATION_ALIGNMENT.md` §10) noted that this list has since grown to 23 named landmarks including operating commercial premises, and remains unanswered.

| Entity (display) | Kind | District | OSM / reference source | Clearance |
|---|---|---|---|---|
| Guldkringlan | commercial | D03-torget | node marker; tenant inside Torget long-house `w869907962` | |
| Cornelis | commercial | D01-historic-centre | node marker; tenant / small building without explicit OSM polygon | |
| Grythyttans glass & choklad | commercial | D03-torget | node marker; tenant / small building without explicit OSM polygon | |
| Grythyttans antikvariat | commercial | D01-historic-centre | node marker; tenant / small building without explicit OSM polygon | |
| Torget | municipal | D03-torget | OSM way `w122157681` | |
| Campus Grythyttan | institution | D02-campus | OSM way `w193810975` | |
| Pizzans Hus | commercial | D08-halleforsvagen | OSM way `w598989255` | |
| Herrgården Grythyttan | commercial | D12-residential-east | OSM way `w611766160` | |
| Grythyttans IP | municipal | D06-school | OSM way `w869907952` | |
| Grythyttans Kyrka | religious | D04-church | OSM way `w869907961` | |
| Grythyttans Gästgivaregård | commercial | D03-torget | OSM way `w869907964` | |
| Grythyttans Gamla Järnvägsstation | institution | D05-station | OSM way `w870510841` | |
| Grythyttans skola | institution | D06-school | OSM way `w1239584179` | |
| INGO | commercial | D08-halleforsvagen | OSM way `w614554207` | |
| Tempo | commercial | D13-residential-west | OSM way `w1250001245` | |
| Direkten | commercial | D08-halleforsvagen | node marker; convenience shop / small building without explicit OSM polygon | |
| Kantin Hyttblecket | commercial | D02-campus | node marker; tenant inside campus building | |
| Bergslagshus AB | commercial | D10-residential-north | node marker; commercial building materials shop without explicit OSM polygon | |
| Kärnhuset | institution | D02-campus | OSM way `w193810921` | |
| Länsmansgården | historic | D01-historic-centre | OSM way `w1422743880` | |
| Swedecote | commercial | D11-residential-south | OSM way `w1239628613` | |
| Miljongruvan | historic | D15-forest-edge | OSM way `w568543643` | |
| Grythyttans Fotbollsplan | municipal | D06-school | OSM way `w1422745010` | |

---

## 5. What this stub is not

- **Not a legal opinion.** No item is assessed, concluded or recommended on.
- **Not a work order.** Filling clearance is referred to the Vision Owner per `ORDER_034_DOCUMENTATION_ALIGNMENT.md` §10.
- **Not exhaustive.** Additional real-place, brand and personal-data exposures may surface as production continues. New rows are added by amendment; existing open rows are not silently removed.

---

**End of RIGHTS_REGISTER v1.0.**
