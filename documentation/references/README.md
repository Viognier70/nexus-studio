# References

**Purpose.** This tree collects publicly-available references used to reconstruct real buildings in Grythyttan. Nothing here ships with the game — the game holds only the reconstructed geometry, which is Nexus's *interpretation* of the sources.

**What lives here.**

- `district-<n>/<landmark>/notes.md` — research notes and confidence assessment for the landmark.
- `district-<n>/<landmark>/urls.md` — cited public sources: Wikipedia articles, heritage records, Google Maps and Street View coordinates, published photographs.
- `district-<n>/<landmark>/manifest.json` — minimum reference material required to reach ≥ 90 % confidence per aspect.

**What does NOT live here.** Raster imagery, copyrighted photographs, Google imagery, or any other material that cannot be freely redistributed. Sources are *cited*, not archived. If a photograph is uploaded by the Vision Owner (their own material or licensed), it may live under `district-<n>/<landmark>/uploaded/` with a licence note.

**Governance.**

- ADR 001 §2.2 defines what counts as a verified source.
- ADR 001 §2.3 defines the `APPROXIMATION` interim state.
- ADR 001 §6.1 forbids shipping raster imagery as a runtime asset by default.
- The Reference Confidence Rule (in Claude Code memory) requires ≥ 90 % per-decision confidence before any architectural detail is implemented.

**Sequence.** Each landmark is completed, verified and reviewed individually before the next begins. Order for District 1: Grythyttans Kyrka → Guldkringlan → Grythyttans Gästgivaregård → Torget → remaining historic buildings.
