# ORDER 036 — Reference Integrity Infrastructure

**Version:** 1.0  
**Status:** Awaiting Vision Owner approval. Not in force until approved.  
**Class:** Sprint order — production (precedence level 7)  
**Parent:** `ADR_002_SYNTHESIS_POLICY.md` §4.2, §5, §9 steps 1–3  
**Registry:** register in `ORDER_REGISTRY.md` before execution, per `CLAUDE.md` rule 9  
**Recipient:** Claude Code  

---

## 0. Prerequisites

`ADR_002_SYNTHESIS_POLICY.md` is Accepted. If its status is still Proposed, stop and report.

Verify the order number against `ORDER_REGISTRY.md`. If 036 is taken, stop and report — do not renumber.

---

## 1. Purpose

Two reference integrity failures have occurred. Both were mechanically detectable and neither was detected:

- `guldkringlan vid torget.avif` was cited by a manifest, marked in prose as never read, and shaped a manifest entry from its filename alone. It sat in the repository root while the manifest expected it elsewhere. Five days passed.
- Thirteen further reference files sit in the repository root today, cited by manifests under bare filename, resolving nowhere.

This order builds the infrastructure that makes both impossible to repeat silently. It is ADR 002 §9 steps 1 through 3.

**Step 4 of ADR 002 §9 — the retroactive confidence report — is a Vision Owner gate and is not part of this order.** Do not recompute any threshold.

---

## 2. Relocate the thirteen root-level reference files

Move each with `git mv` to its correct location under `documentation/references/<district>/<entity>/uploaded/`, and correct the citing manifest's `collectedSources[].path` to a manifest-relative path with the `uploaded/` prefix.

| File | Destination |
|---|---|
| `gästgiveriet.jpeg` | `district-1/gastgivaregard/uploaded/` |
| `gästgiveriet3.jpeg` | `district-1/gastgivaregard/uploaded/` |
| `gästgiveriet 4.jpeg` | `district-1/gastgivaregard/uploaded/` |
| `gästgibveriet på prästgatan.jpeg` | `district-1/gastgivaregard/uploaded/` |
| `torget.jpeg` | `district-1/torget/uploaded/` |
| `torget2.jpeg` | `district-1/torget/uploaded/` |
| `torget 3.jpg` | `district-1/torget/uploaded/` |
| `kyrkan.jpg` | `district-1/kyrka/uploaded/` |
| `kyrkan.jpeg` | `district-1/kyrka/uploaded/` |
| `kyrkan2.jpeg` | `district-1/kyrka/uploaded/` |
| `maltidens-hus-i-norden 1.jpg` | `district-1/maltidenshus/uploaded/` |
| `maltidens-hus-i-norden2.jpg` | `district-1/maltidenshus/uploaded/` |
| `maltidens-hus-i-norden3.jpg` | `district-1/maltidenshus/uploaded/` |

**Note the misspelling.** `gästgibveriet på prästgatan.jpeg` is misspelled at source. Preserve the filename exactly as it is — renaming it would break the manifest citation this order is fixing, and the file identity matters more than the spelling. Record the misspelling in a manifest note instead.

Create `uploaded/` directories where they do not exist. Filenames contain spaces and Swedish characters; quote every path.

**Do not read these files as images under this order.** Their review state is handled in §4. Moving a file does not verify it.

---

## 3. Validator: a cited reference must exist

Add a validator, or extend an existing one under `scripts/`, that fails when any manifest `collectedSources[].path` does not resolve to a file on disk.

Requirements:

- **Build-blocking error, not a warning.** ADR 002 §5.1.
- Covers every `manifest.json` under `documentation/references/`, at every depth.
- Paths resolve relative to the manifest.
- Reports the manifest path, the entry index, and the unresolved path.
- Follows the pattern of the existing validator suite in `scripts/` — do not invent a second convention.

**Expect it to fail on first run.** Report every failure before fixing anything. Some may be phantom citations of files that never existed rather than misplaced files, and those two cases need different treatment. Present the list; fix only what §2 covers, and report the rest.

Register the validator in `VALIDATOR_REFERENCE.md`.

---

## 4. Manifest schema: machine-readable review state

Add an explicit field to every `collectedSources` entry recording whether the file has been read as an image.

Requirements:

- **Machine-readable, not prose.** ADR 002 §5.2.
- Three states at minimum: read as image, present but not read, cited but absent.
- **An unread source contributes to no aspect confidence.** This is the load-bearing rule; the field exists to enforce it.
- Backfill every existing entry across all manifests. Where the current state cannot be determined from the manifest's own notes, mark it unknown rather than guessing.
- Document the field in whichever reference document describes the manifest schema.

Propose the field name and the state vocabulary before applying them across the tree. Once approved, apply consistently.

**The AVIF case is the worked example.** `uploaded/guldkringlan vid torget.avif` is present but unreadable by the pipeline; the sibling `.jpg` conversion is read and content-verified. The schema must express that distinction without ambiguity.

---

## 5. What this order does not authorise

- Recomputing any confidence score or threshold. That is ADR 002 §9 step 4, a Vision Owner gate.
- Correcting the scoring model for verified absence. That is ADR 002 §9 step 5.
- Creating the eight D1 cluster manifests. ADR 002 §9 step 6.
- Creating manifests for `gry-glass`, `gry-pizzanshus`, `gry-herrgard`, `gry-antik`, `gry-cornelis`. ADR 002 §9 step 7.
- Recording any entity as `SYNTHESISED`. ADR 002 §9 step 8.
- Reading any newly relocated file as an image, or deriving any aspect from one.
- Any change to `world.ts`, OSM ingest, road roles, traffic, camera code or renderer.
- Any change under `documentation/foundation/`.
- Deleting any file. Relocation is `git mv`.

---

## 6. Acceptance criteria

- Zero reference files remain in the repository root.
- All thirteen resolve from their citing manifests; `git status` shows renames, not delete-plus-add.
- `gästgibveriet på prästgatan.jpeg` retains its original filename, with the misspelling noted in its manifest entry.
- The §3 validator exists, is registered in `VALIDATOR_REFERENCE.md`, fails hard, and passes on the current tree.
- Every unresolved citation found on first run is reported, and those not fixed by §2 are listed as phantom citations.
- The §4 review field exists on every `collectedSources` entry across every manifest, with unknown used rather than a guess.
- The field name and vocabulary were proposed and approved before application.
- No confidence score or threshold changed anywhere.
- No file deleted.
- `npm run typecheck` and `npm run build` green.
- One commit per section, no squash.

---

**End of ORDER 036.**
