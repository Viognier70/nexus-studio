# Kort fråga till Design — ölkrogens staffStations-mappning

**Från** Claude Code (ORDER 208, VO-direktiv 2026-09-10 kl. 17:30)
**Till** Design
**Berör** `frontend/src/strategic/scene/brewpubRoom.ts:690-715`

---

Ölkrogens `staffStations` har fyra id:n: `barkeep`, `brewer`, `cook`,
`runner`. Sim-team har fyra roller: `värd`, `servitör`, `kock`,
`lärling`.

**Vilken station hör till vilken roll?**

Våra antaganden är:

- `brewer → kock`
- `taps → värd`  *(station `taps` finns inte i nuvarande brewpubRoom;
   antar att den ska ersätta eller ligga jämte `barkeep`)*
- `barkeep → servitör`
- `cook → lärling`

De är GISSNINGAR — inte bekräftade. Om ni har en annan mappning,
säg. Vi läser rummet där ni bygger det, inte tvärtom.

Nuvarande kod:
`frontend/src/strategic/scene/businessRoom.ts:STATION_MAP.ölkrogen`.
Alla rader har `ANTAGANDE:`-tagg. När ni svarar uppdaterar vi
tabellen och tar bort taggen.

Se längre bakgrund: `STATION_ROLE_MAPPING_QUESTION_2026-09-10.md`.
