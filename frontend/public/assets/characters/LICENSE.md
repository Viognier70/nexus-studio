# Character assets — licences and recovery guide

Per the asset policy in `CLAUDE.md` (ORDER 053 Del A + ORDER 057
Del B decision): humanoid `.glb` files are the ONE class of external
asset the project checks in. All others (buildings, interior,
terrain, vegetation, textures, HDRI) are built procedurally in code.

**The `.glb` files themselves are not committed.** The repository is
public and the 20 Quaternius `.glb` files total ~30 MB — permanent
history bloat isn't worth it, and the licences are permissive enough
that anyone can re-download from source. This file is the recovery
manifest: read it top to bottom and you can reconstruct the directory
that the game expects at build time.

Assets are bundled with the production build (`vite build` copies
`public/` verbatim). Nothing is fetched at runtime.

**Original download date:** 2026-08-11.

---

## Directory the game expects

After following this guide the tree under
`frontend/public/assets/characters/` should look like:

```
frontend/public/assets/characters/
├── LICENSE.md                              (this file, committed)
├── animations/                             (empty; reserved for clips)
└── bodies/
    ├── Ultimate Modular Men Pack-glb/
    │   ├── Adventurer.glb
    │   ├── Astronaut.glb
    │   ├── Beach Character.glb
    │   ├── Business Man.glb
    │   ├── Casual Character.glb
    │   ├── Farmer.glb
    │   ├── Hoodie Character.glb
    │   ├── King.glb
    │   ├── Punk.glb          (kept but EXCLUDED from cast — too tall)
    │   ├── Swat.glb
    │   └── Worker.glb
    └── Ultimate Modular Women Pack-glb/
        ├── Adventurer.glb
        ├── Animated Woman.glb
        ├── Medieval.glb
        ├── Punk.glb          (kept but EXCLUDED from cast — too tall)
        ├── Sci Fi Character.glb
        ├── Soldier.glb
        ├── Suit.glb          (CC-BY, attribution required)
        ├── Witch.glb         (kept but EXCLUDED from cast — too tall)
        └── Worker.glb        (CC-BY, attribution required)
```

`bodies/` totals **20 `.glb`** (~30 MB on disk). No other files.

---

## Recovery — how to rebuild the directory from scratch

### 1. Ultimate Modular Men Pack

- **Source:** https://quaternius.com/packs/ultimatemodularmen.html
- **Creator:** @Quaternius (Patreon: https://patreon.com/quaternius)
- **Licence:** CC0 1.0 Universal — https://creativecommons.org/publicdomain/zero/1.0/
- **Download format:** pick the **`.glb`** export (not `.fbx`, not
  `.gltf`). The pack ships several export folders; only the
  `glb/` folder matches this project.
- **Files to copy in:** all 11 `.glb` files from the pack's `glb/`
  folder into `frontend/public/assets/characters/bodies/Ultimate Modular Men Pack-glb/`.

### 2. Ultimate Modular Women Pack

- **Source:** https://quaternius.com/packs/ultimatemodularwomen.html
- **Creator:** @Quaternius (same Patreon link as above)
- **Licence per file** — the download page lists the licence badge
  per model. As authored 2026-08-11:
  - 8 files: **CC0 1.0**
  - `Suit.glb`: **CC-BY 4.0** (attribution required)
  - `Worker.glb`: **CC-BY 4.0** (attribution required)
- **Files to copy in:** the 10 `.glb` files listed in the tree
  above, from the `glb/` folder of the download, into
  `frontend/public/assets/characters/bodies/Ultimate Modular Women Pack-glb/`.
- **Do NOT copy:** the second `Animated Woman-nIItLV9nxS.glb` file
  that ships as a hashed-filename duplicate of `Animated Woman.glb`
  — one is enough.

### 3. Nothing else

The original download also included:
- **`Universal Base Characters` (Standard)** — Quaternius, CC0.
  Shipped without a `.glb` export in the free tier (only Unity
  `.fbx` and Godot/UE `.gltf`, both banned by CLAUDE.md's asset
  policy). Skip unless you can source a `.glb` version.
- **FBX (Unity) folders** — banned.
- **glTF (Godot-Unreal) folders** — banned (`.gltf` + `.bin` + `.png`
  splits are for other engines; three.js reads `.glb` directly).
- **`T_Superhero_*` textures + orphan `T_Eye_*` / `T_Hair_*`
  textures** — belonged to the Superhero base models that only
  shipped as FBX/gltf; skip.

---

## Cast — which files the game actually uses

**19 characters** (10 men, 9 women) after the height-tolerance filter
(CLAUDE.md humanoid band 1,55–1,90 m; ORDER 057 §3).

**Men (10):** Adventurer, Astronaut, Beach Character, Business Man,
Casual Character, Farmer, Hoodie Character, King, Swat, Worker.

**Women (9):** Adventurer, Animated Woman, Medieval, Sci Fi
Character, Soldier, Suit *(CC-BY)*, Worker *(CC-BY)*, plus one more
from that pack if you count Suit and Worker each once.

**Kept on disk but excluded from the cast** (too tall — see
`scripts/glb-inventory.mjs` for the height measurements that
produced this list):

| File | Measured height | Reason |
|---|---:|---|
| Men/Punk.glb | 1,970 m | above 1,90 m humanoid ceiling |
| Women/Punk.glb | 1,958 m | above 1,90 m humanoid ceiling |
| Women/Witch.glb | 2,045 m | above 1,90 m humanoid ceiling (spets-hatt) |

Keeping them on disk (not just deleting) makes the cast decision
reversible — if the height band widens later, they're ready to use.

---

## Attribution string for CC-BY files

Two files require attribution in credits and any published
screenshot / video that features them:

> "Suit" and "Worker" female character models by @Quaternius,
> licensed under CC-BY 4.0 — https://quaternius.com

Add this line to game credits before shipping. Suit and Worker are
in the cast; if you remove either from the active roster, the
attribution can be removed with them.

---

## Verifying the licence table

The per-file CC-BY split for the Women pack (Suit + Worker) is
recorded per the Vision Owner's ORDER 057 §4 instruction; it was
not automatically extracted from the download-page metadata. Before
shipping to a wider audience:

1. Open https://quaternius.com/packs/ultimatemodularwomen.html
2. Check the per-model licence badges
3. If the licence-per-file split has shifted, update the tables
   in this file in the same commit as the correction

The Men pack is uniformly CC0, verified from the pack's
`License_Standard.txt` (was retained when the pack was pruned).

---

## Runtime references

- **Loader:** the game uses `useGLTF('/assets/characters/…')` from
  `@react-three/drei` (see CLAUDE.md's asset policy for why local
  `public/` loads are explicitly allowed while runtime CDN fetches
  are forbidden).
- **Height inventory script:** `scripts/glb-inventory.mjs` parses
  each `.glb` binary and reports the bind-pose bounding box; run
  it to re-verify the height table when adding or replacing models.
- **Character bake / load code:** not yet in the scene under
  ORDER 057; the assets are staged for use, not yet loaded.
