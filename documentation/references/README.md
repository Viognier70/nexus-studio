# References

**Purpose.** This tree collects publicly-available references used to reconstruct real buildings in Grythyttan. Nothing here ships with the game — the game holds only the reconstructed geometry, which is Nexus's *interpretation* of the sources.

**What lives here.**

- `district-<n>/<landmark>/notes.md` — research notes and confidence assessment for the landmark.
- `district-<n>/<landmark>/urls.md` — cited public sources: Wikipedia articles, heritage records, Google Maps and Street View coordinates, published photographs.
- `district-<n>/<landmark>/manifest.json` — minimum reference material required to reach ≥ 90 % confidence per aspect.
- `district-<n>/<landmark>/uploaded/` — Vision-Owner-supplied reference images, cited from the manifest with an `uploaded/`-prefixed relative path.

**What does NOT live here.** Raster imagery, copyrighted photographs, Google imagery, or any other material that cannot be freely redistributed. Sources are *cited*, not archived. If a photograph is uploaded by the Vision Owner (their own material or licensed), it may live under `district-<n>/<landmark>/uploaded/` with a licence note.

## Manifest schema — `collectedSources` entry

Every entry in a manifest's `collectedSources` array carries:

| Field | Type | Meaning |
|---|---|---|
| `path` | string | Path to the source file, relative to the manifest. Must resolve on disk — checked by `scripts/validate-references.mjs`. |
| `reviewState` | enum string | Machine-readable record of whether the file has been read as an image. **Required** since ORDER 036 §4. See vocabulary below. |
| `view` | string | Prose description of what the source depicts. Descriptive only — never treat a rich `view` as evidence the file has been read (see `reviewState`). |
| `verifies` | string[] | Aspect ids this source contributes to. **Must be empty unless `reviewState = "read"`.** |
| `notes` | string | Caveats, licence, framing limits, and — for `read` entries — the evidence pointer that promoted the state. |

### `reviewState` vocabulary

| Value | Meaning | Confidence contribution |
|---|---|---|
| `"read"` | The file has been opened as an image and its `verifies` / `view` are content-derived. Requires explicit repository documentation of the reading act (a TRIAGE record, a sibling entry naming this file as content-verified, a dated reading note, etc.). | May contribute to `confidenceByAspect`. |
| `"present-unread"` | The file resolves on disk but has not been read (pipeline-incompatible format, or reviewer has not opened it). | Must not contribute to any aspect confidence. |
| `"absent"` | Cited but does not resolve on disk. Detected mechanically by `validate-references.mjs`; this schema value records the intent that the file *should* exist. | Cannot contribute. |
| `"unknown"` | Backfill default when the reading state cannot be established from repository documentation. Treated as `present-unread` until reviewed. | Cannot contribute. |

**Evidence rule for `read`.** A rich `view` field is not evidence of a reading — that was the specific defect (`guldkringlan vid torget.avif`) ORDER 036 was written to prevent. Only explicit repository documentation of the reading act promotes an entry from `unknown` to `read`.

**Governance.**

- ADR 001 §2.2 defines what counts as a verified source.
- ADR 001 §2.3 defines the `APPROXIMATION` interim state.
- ADR 001 §6.1 forbids shipping raster imagery as a runtime asset by default.
- ADR 002 §5.2 requires manifest schema fields to be machine-readable rather than prose — the reason `reviewState` is an enum, not a note.
- The Reference Confidence Rule (in Claude Code memory) requires ≥ 90 % per-decision confidence before any architectural detail is implemented.

**Sequence.** Each landmark is completed, verified and reviewed individually before the next begins. Order for District 1: Grythyttans Kyrka → Guldkringlan → Grythyttans Gästgivaregård → Torget → remaining historic buildings.
