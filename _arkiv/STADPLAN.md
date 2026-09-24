# STADPLAN — nexus-studio

**Status: fas 2 genomförd 2026-09-24. Se avsnittet "Fas 2 — genomfört" längst ned.**

**Fas 1 — inventering (endast läsning).** Skapad 2026-09-24 av Claude (Cowork) på gren `stadning/dokumentation`.
Ingen fil är flyttad, ändrad eller raderad. Den enda nya filen är denna (`_arkiv/STADPLAN.md`).

**Filantal före städning:** 1 537 filer (hela repot exkl. `.git/` och alla `node_modules/`).
Räknat med denna fil: 1 538. Samma tal ska redovisas efter fas 2.

## Sammanfattning

- **797 dokumentfiler** inventerade (a). **76 grupper** med identiskt innehåll (b).
- **`Restaurant guest animation (2)/` är en äldre, mindre ögonblicksbild** av `Restaurant guest animation/`:
  inga filer finns bara i (2); allt i (2) är antingen identiskt eller en äldre version (c). → arkivera hela mappen.
- **`Restaurant guest animation/uploads/`** (65 filer) är uppladdningskopior: hash-suffixfiler som är byte-identiska
  med sina syskon, och äldre versioner av filerna i huvudmappen. → arkivera hela undermappen.
- **`nexus-design-2026-08-30-1245/` är den leverans som monterades**: alla dess `.ts` är identiska med `handoff/*.ts`.
  **`leverans/` är en tidigare variant** av samma leverans (`businessRoom.ts`, `nightClubRoom.ts` och `LEVERANS.md` skiljer sig).
- **Ingen kod** (frontend/src, scripts, handoff/*.ts, CLAUDE.md) pekar med sökväg på något som föreslås flyttas.

## Beslut jag behöver från dig

1. **`leverans/`**: flytta till `documentation/leveranser/` enligt ordern (**förslag**), eller till `_arkiv/versioner/`
   eftersom den är en äldre variant av `nexus-design-2026-08-30-1245/`? Den refereras med sökväg från
   `documentation/architecture/EYE_HEIGHT_FOR_SEAT_PENDING.md`, så jag föreslår `documentation/leveranser/`.
2. **`handoff/ORDER-gaster-och-personal.md` och `handoff/ORDER-olkrogen-brief.md`** är briefer till Claude Design.
   Förslag: **låt dem ligga** i `handoff/` bredvid kontraktsfilerna de ledde till (refereras med sökväg från
   `ORDER_121_*` och `ORDER_125_*` i architecture/). Alternativ: flytta till `documentation/briefs/`.
3. **Länkuppdatering i `documentation/architecture/`.** Regel 3 säger att sökvägar till flyttade filer ska uppdateras,
   men architecture/ ska "lämnas som den är" och innehåller historiska exekveringsrapporter (ORDER_REGISTRY m.fl.).
   Förslag: uppdatera **bara** `EYE_HEIGHT_FOR_SEAT_PENDING.md` (öppen, pågående order) och låt historiska rader stå.
   Säg till om du vill ha alla uppdaterade.

---

## a) Inventering — dokumentfiler (797 st)

Omfattning: alla `.md`, `.dc.html`, `.docx` i repot, samt **alla** filer i dokumentations- och leveransmapparna
`documentation/`, `reports/`, `handoff/`, `leverans/`, `leverans-servicekoreografin/`,
`nexus-design-2026-08-30-1245/`, `Restaurant guest animation/` och `Restaurant guest animation (2)/`
(där ligger även `.ts/.js/.jsx/.png/.json` som hör till leveranserna). `node_modules/` och `.git/` undantagna.
En `.docx` finns: `documentation/archive/NEXUS_STUDIO_GAME_DESIGN_CONSTITUTION.docx` (rättat i fas 2, i fas 1 stod felaktigt att inga fanns). Filsystemstiden är densamma för nästan alla filer (utcheckning 2026-09-23), därför visas även senaste commit.
Tomma `.gitkeep` i `ai/`, `art/`, `assets/` m.fl. är inte med.

### (roten) (12 filer)

| Sökväg | Storlek (B) | Ändrad (fs) | Senaste commit | SHA-1 (10) |
|---|---:|---|---|---|
| `BRIEF_DESIGN_FOODTRUCKEN.md` | 3895 | 2026-09-23 14:46 | 2026-09-23 | `6bc82d5742` |
| `BRIEF_DESIGN_GASTGIVERIET.md` | 4039 | 2026-09-23 14:46 | 2026-09-23 | `f5e53f32fd` |
| `BRIEF_DESIGN_REKVISITAN.md` | 3375 | 2026-09-23 14:46 | 2026-09-23 | `1afd437823` |
| `CLAUDE.md` | 16829 | 2026-09-23 14:46 | 2026-09-20 | `61a999f89a` |
| `ORDER - vinbaren.md` | 9720 | 2026-09-23 14:46 | 2026-09-23 | `42f69e29aa` |
| `ORDER_EN_HEL_DAG.md` | 5828 | 2026-09-23 14:46 | 2026-09-23 | `0acc2203ef` |
| `ORDER_KONKURRENTERNA_FINNS.md` | 5047 | 2026-09-23 14:46 | 2026-09-23 | `e6883bd774` |
| `ORDER_KONKURRENTERNA_ROR_SIG.md` | 4318 | 2026-09-23 14:46 | 2026-09-23 | `b90e861295` |
| `ORDER_NEXUS_PA_EN_LANK.md` | 3459 | 2026-09-23 14:46 | 2026-09-23 | `641c6b5254` |
| `ORDER_RAKNAREN_OCH_KONSOLEN.md` | 4304 | 2026-09-23 14:46 | 2026-09-23 | `a352855e6d` |
| `ORDER_VAD_SOM_UTLOSER_EN_FRAGA.md` | 3732 | 2026-09-23 14:46 | 2026-09-23 | `a6b92a70ba` |
| `README.md` | 4115 | 2026-09-23 14:46 | 2026-07-19 | `964510685f` |

### Restaurant guest animation (156 filer)

| Sökväg | Storlek (B) | Ändrad (fs) | Senaste commit | SHA-1 (10) |
|---|---:|---|---|---|
| `Restaurant guest animation/.thumbnail` | 42368 | 2026-09-23 14:46 | 2026-09-23 | `703da5859f` |
| `Restaurant guest animation/Canvas.dc.html` | 206 | 2026-09-23 14:46 | 2026-09-23 | `819a6a580e` |
| `Restaurant guest animation/Figurrigg - kroppar i rummet.dc.html` | 30886 | 2026-09-23 14:46 | 2026-09-23 | `4d043f4cfd` |
| `Restaurant guest animation/Gastgiveriet - gard och langor.dc.html` | 50960 | 2026-09-23 14:46 | 2026-09-23 | `b23c160eae` |
| `Restaurant guest animation/Guest Animation Reel standalone-src.dc.html` | 2552 | 2026-09-23 14:46 | 2026-09-23 | `62f5cb3182` |
| `Restaurant guest animation/Guest Animation Reel.dc.html` | 1750 | 2026-09-23 14:46 | 2026-09-23 | `a06cb5632b` |
| `Restaurant guest animation/Guest Animation Reel.html` | 1156280 | 2026-09-23 14:46 | 2026-09-23 | `e344dba3ff` |
| `Restaurant guest animation/Matsalen - i kontext.dc.html` | 17639 | 2026-09-23 14:46 | 2026-09-23 | `41305b7172` |
| `Restaurant guest animation/ORDER - gastgiveriet.md` | 9914 | 2026-09-23 14:46 | 2026-09-23 | `dec636d556` |
| `Restaurant guest animation/ORDER - olkrog med bryggeri.md` | 7409 | 2026-09-23 14:46 | 2026-09-23 | `48cf728bb2` |
| `Restaurant guest animation/ORDER - rekvisitan.md` | 8535 | 2026-09-23 14:46 | 2026-09-23 | `018a2bb428` |
| `Restaurant guest animation/ORDER - restaurangen.md` | 9513 | 2026-09-23 14:46 | 2026-09-23 | `df0e6118fb` |
| `Restaurant guest animation/ORDER - silhuettbandet per zon.md` | 6907 | 2026-09-23 14:46 | 2026-09-23 | `42c15a79e8` |
| `Restaurant guest animation/ORDER - vinbaren.md` | 9720 | 2026-09-23 14:46 | 2026-09-23 | `42f69e29aa` |
| `Restaurant guest animation/Olkrog med bryggeri.dc.html` | 38514 | 2026-09-23 14:46 | 2026-09-23 | `319d77954c` |
| `Restaurant guest animation/Personal - perspektiv och rörelser.dc.html` | 70968 | 2026-09-23 14:46 | 2026-09-23 | `45665a90b4` |
| `Restaurant guest animation/Reel - gaster och personal.dc.html` | 2230 | 2026-09-23 14:46 | 2026-09-23 | `85c9a54480` |
| `Restaurant guest animation/Reel - gaster och personal.html` | 1165854 | 2026-09-23 14:46 | 2026-09-23 | `3564a1a018` |
| `Restaurant guest animation/Reel standalone-src.dc.html` | 3193 | 2026-09-23 14:46 | 2026-09-23 | `fa56b08c80` |
| `Restaurant guest animation/Rekvisitan - hander och huvuden.dc.html` | 33401 | 2026-09-23 14:46 | 2026-09-23 | `f212c59668` |
| `Restaurant guest animation/Restaurangen - matsalen.dc.html` | 38392 | 2026-09-23 14:46 | 2026-09-23 | `5099f8c14a` |
| `Restaurant guest animation/StaffFace.dc.html` | 4990 | 2026-09-23 14:46 | 2026-09-23 | `b1680a63a7` |
| `Restaurant guest animation/StaffPuck.dc.html` | 9317 | 2026-09-23 14:46 | 2026-09-23 | `2998bc2f4c` |
| `Restaurant guest animation/Vinbaren - lounger och DJ.dc.html` | 206 | 2026-09-23 14:46 | 2026-09-23 | `819a6a580e` |
| `Restaurant guest animation/Vinbaren.dc.html` | 43205 | 2026-09-23 14:46 | 2026-09-23 | `ca323439ed` |
| `Restaurant guest animation/Yrkesroller - rorelse och uttryck.dc.html` | 42776 | 2026-09-23 14:46 | 2026-09-23 | `15531346c8` |
| `Restaurant guest animation/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_adherence.oxlintrc.json` | 4002 | 2026-09-23 14:46 | 2026-09-23 | `dabf86ad7d` |
| `Restaurant guest animation/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_bundle.js` | 303 | 2026-09-23 14:46 | 2026-09-23 | `5e4ccabaa0` |
| `Restaurant guest animation/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_manifest.json` | 7247 | 2026-09-23 14:46 | 2026-09-23 | `7437c3a696` |
| `Restaurant guest animation/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/readme.md` | 7376 | 2026-09-23 14:46 | 2026-09-23 | `1082b4d77e` |
| `Restaurant guest animation/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/styles.css` | 10555 | 2026-09-23 14:46 | 2026-09-23 | `a303340a2f` |
| `Restaurant guest animation/animations-v3.jsx` | 55474 | 2026-09-23 14:46 | 2026-09-23 | `42f45bebc1` |
| `Restaurant guest animation/brewpubRoom.js` | 30997 | 2026-09-23 14:46 | 2026-09-23 | `2ca7ba60f0` |
| `Restaurant guest animation/brewpubRoom.ts` | 35113 | 2026-09-23 14:46 | 2026-09-23 | `408e2a1ece` |
| `Restaurant guest animation/figureProps.js` | 28234 | 2026-09-23 14:46 | 2026-09-23 | `e5684096fe` |
| `Restaurant guest animation/figureRig.js` | 25897 | 2026-09-23 14:46 | 2026-09-23 | `3f986b37b0` |
| `Restaurant guest animation/figureRig.ts` | 29800 | 2026-09-23 14:46 | 2026-09-23 | `a774451c0b` |
| `Restaurant guest animation/github.md` | 7221 | 2026-09-23 14:46 | 2026-09-23 | `1377597ab1` |
| `Restaurant guest animation/guest-reel.jsx` | 19356 | 2026-09-23 14:46 | 2026-09-23 | `9f7df24e4d` |
| `Restaurant guest animation/innRoom.js` | 59720 | 2026-09-23 14:46 | 2026-09-23 | `d0a493508b` |
| `Restaurant guest animation/restaurantRoom.js` | 35628 | 2026-09-23 14:46 | 2026-09-23 | `f23c960f4c` |
| `Restaurant guest animation/screenshots/01-c.png` | 30402 | 2026-09-23 14:46 | 2026-09-23 | `5454945383` |
| `Restaurant guest animation/screenshots/01-carry.png` | 27803 | 2026-09-23 14:46 | 2026-09-23 | `e918ec3ee1` |
| `Restaurant guest animation/screenshots/01-close.png` | 29716 | 2026-09-23 14:46 | 2026-09-23 | `a58d1d82c9` |
| `Restaurant guest animation/screenshots/01-fix.png` | 36083 | 2026-09-23 14:46 | 2026-09-23 | `ddd2f84ba8` |
| `Restaurant guest animation/screenshots/01-g5.png` | 40933 | 2026-09-23 14:46 | 2026-09-23 | `7ee0cfcb53` |
| `Restaurant guest animation/screenshots/01-g6.png` | 35917 | 2026-09-23 14:46 | 2026-09-23 | `45dcbdf7cf` |
| `Restaurant guest animation/screenshots/01-inn-strategic.png` | 32999 | 2026-09-23 14:46 | 2026-09-23 | `ee55a78d0a` |
| `Restaurant guest animation/screenshots/01-inn.png` | 32999 | 2026-09-23 14:46 | 2026-09-23 | `ee55a78d0a` |
| `Restaurant guest animation/screenshots/01-kontakt2.png` | 28092 | 2026-09-23 14:46 | 2026-09-23 | `e09bc7400a` |
| `Restaurant guest animation/screenshots/01-props-check.png` | 29225 | 2026-09-23 14:46 | 2026-09-23 | `a4a1c083f5` |
| `Restaurant guest animation/screenshots/01-props-heads.png` | 29218 | 2026-09-23 14:46 | 2026-09-23 | `0d9d261d73` |
| `Restaurant guest animation/screenshots/02-c.png` | 30359 | 2026-09-23 14:46 | 2026-09-23 | `8740dc933d` |
| `Restaurant guest animation/screenshots/02-carry.png` | 27794 | 2026-09-23 14:46 | 2026-09-23 | `35c9e468e3` |
| `Restaurant guest animation/screenshots/02-close.png` | 29688 | 2026-09-23 14:46 | 2026-09-23 | `08caf9d796` |
| `Restaurant guest animation/screenshots/02-fix.png` | 33126 | 2026-09-23 14:46 | 2026-09-23 | `958b8eacae` |
| `Restaurant guest animation/screenshots/02-g5.png` | 32549 | 2026-09-23 14:46 | 2026-09-23 | `7b00c39138` |
| `Restaurant guest animation/screenshots/02-g6.png` | 31682 | 2026-09-23 14:46 | 2026-09-23 | `0bab5ac299` |
| `Restaurant guest animation/screenshots/02-inn-strategic.png` | 33041 | 2026-09-23 14:46 | 2026-09-23 | `daa1ba176d` |
| `Restaurant guest animation/screenshots/02-inn.png` | 30701 | 2026-09-23 14:46 | 2026-09-23 | `a69a6a6417` |
| `Restaurant guest animation/screenshots/02-kontakt2.png` | 36921 | 2026-09-23 14:46 | 2026-09-23 | `0d7a0a9c8e` |
| `Restaurant guest animation/screenshots/02-props-check.png` | 27224 | 2026-09-23 14:46 | 2026-09-23 | `bdada3ff51` |
| `Restaurant guest animation/screenshots/02-props-heads.png` | 29218 | 2026-09-23 14:46 | 2026-09-23 | `0d9d261d73` |
| `Restaurant guest animation/screenshots/03-c.png` | 30351 | 2026-09-23 14:46 | 2026-09-23 | `65720533ce` |
| `Restaurant guest animation/screenshots/03-close.png` | 29668 | 2026-09-23 14:46 | 2026-09-23 | `b79bd1bc33` |
| `Restaurant guest animation/screenshots/03-fix.png` | 36083 | 2026-09-23 14:46 | 2026-09-23 | `ddd2f84ba8` |
| `Restaurant guest animation/screenshots/03-g5.png` | 37684 | 2026-09-23 14:46 | 2026-09-23 | `8ad03a766b` |
| `Restaurant guest animation/screenshots/03-g6.png` | 35917 | 2026-09-23 14:46 | 2026-09-23 | `45dcbdf7cf` |
| `Restaurant guest animation/screenshots/03-inn-strategic.png` | 32739 | 2026-09-23 14:46 | 2026-09-23 | `7ee3fd3511` |
| `Restaurant guest animation/screenshots/03-inn.png` | 30999 | 2026-09-23 14:46 | 2026-09-23 | `428e1c447d` |
| `Restaurant guest animation/screenshots/04-c.png` | 30378 | 2026-09-23 14:46 | 2026-09-23 | `7627f59df1` |
| `Restaurant guest animation/screenshots/04-close.png` | 29707 | 2026-09-23 14:46 | 2026-09-23 | `c8165318ce` |
| `Restaurant guest animation/screenshots/04-fix.png` | 36376 | 2026-09-23 14:46 | 2026-09-23 | `e7a9c3ba56` |
| `Restaurant guest animation/screenshots/04-inn-strategic.png` | 34246 | 2026-09-23 14:46 | 2026-09-23 | `ed74338452` |
| `Restaurant guest animation/screenshots/04-inn.png` | 36175 | 2026-09-23 14:46 | 2026-09-23 | `72b183d560` |
| `Restaurant guest animation/screenshots/carry2.png` | 27698 | 2026-09-23 14:46 | 2026-09-23 | `d0a53179e8` |
| `Restaurant guest animation/screenshots/close2.png` | 30402 | 2026-09-23 14:46 | 2026-09-23 | `5454945383` |
| `Restaurant guest animation/screenshots/gaster.png` | 40241 | 2026-09-23 14:46 | 2026-09-23 | `ed5cf2fe5a` |
| `Restaurant guest animation/screenshots/gester.png` | 37406 | 2026-09-23 14:46 | 2026-09-23 | `d45d04d21f` |
| `Restaurant guest animation/screenshots/kontakt.png` | 38815 | 2026-09-23 14:46 | 2026-09-23 | `5d95470bf4` |
| `Restaurant guest animation/screenshots/props-topdown.png` | 28401 | 2026-09-23 14:46 | 2026-09-23 | `dd9aabbed3` |
| `Restaurant guest animation/screenshots/rig-face.png` | 31176 | 2026-09-23 14:46 | 2026-09-23 | `48c13f0ecd` |
| `Restaurant guest animation/screenshots/rig-stage.png` | 18397 | 2026-09-23 14:46 | 2026-09-23 | `16fd456fd2` |
| `Restaurant guest animation/screenshots/rig2.png` | 37526 | 2026-09-23 14:46 | 2026-09-23 | `dde8877725` |
| `Restaurant guest animation/screenshots/rig4.png` | 40899 | 2026-09-23 14:46 | 2026-09-23 | `7ce5c6753d` |
| `Restaurant guest animation/screenshots/seated.png` | 30158 | 2026-09-23 14:46 | 2026-09-23 | `dd78c8363b` |
| `Restaurant guest animation/staff-guest-reel.jsx` | 49063 | 2026-09-23 14:46 | 2026-09-23 | `5ecd295734` |
| `Restaurant guest animation/support.js` | 69150 | 2026-09-23 14:46 | 2026-09-23 | `2e38395c4a` |
| `Restaurant guest animation/tweaks-panel.jsx` | 25439 | 2026-09-23 14:46 | 2026-09-23 | `2278b6c8a3` |
| `Restaurant guest animation/uploads/BRIEF_DESIGN_GASTGIVERIET.md` | 4039 | 2026-09-23 14:46 | 2026-09-23 | `f5e53f32fd` |
| `Restaurant guest animation/uploads/BRIEF_DESIGN_REKVISITAN.md` | 3375 | 2026-09-23 14:46 | 2026-09-23 | `1afd437823` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/.thumbnail` | 19628 | 2026-09-23 14:46 | 2026-09-23 | `31dea19432` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/.thumbnail-f5d89e4e` | 19628 | 2026-09-23 14:46 | 2026-09-23 | `31dea19432` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/Guest Animation Reel standalone-src.dc-ed0ed99b.html` | 2552 | 2026-09-23 14:46 | 2026-09-23 | `62f5cb3182` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/Guest Animation Reel standalone-src.dc.html` | 2552 | 2026-09-23 14:46 | 2026-09-23 | `62f5cb3182` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/Guest Animation Reel-277965c5.html` | 1156280 | 2026-09-23 14:46 | 2026-09-23 | `e344dba3ff` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/Guest Animation Reel.dc-52829de6.html` | 1750 | 2026-09-23 14:46 | 2026-09-23 | `a06cb5632b` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/Guest Animation Reel.dc.html` | 1750 | 2026-09-23 14:46 | 2026-09-23 | `a06cb5632b` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/Guest Animation Reel.html` | 1156280 | 2026-09-23 14:46 | 2026-09-23 | `e344dba3ff` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/Matsalen - i kontext.dc-9825180c.html` | 17639 | 2026-09-23 14:46 | 2026-09-23 | `41305b7172` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/Matsalen - i kontext.dc.html` | 17639 | 2026-09-23 14:46 | 2026-09-23 | `41305b7172` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/Personal - perspektiv och rörelser.dc-58f60116.html` | 70968 | 2026-09-23 14:46 | 2026-09-23 | `45665a90b4` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/Personal - perspektiv och rörelser.dc.html` | 70968 | 2026-09-23 14:46 | 2026-09-23 | `45665a90b4` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/Reel - gaster och personal.dc-14b14ee7.html` | 1826 | 2026-09-23 14:46 | 2026-09-23 | `3c3c7a13ff` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/Reel - gaster och personal.dc.html` | 1826 | 2026-09-23 14:46 | 2026-09-23 | `3c3c7a13ff` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/StaffFace.dc-9a201780.html` | 4990 | 2026-09-23 14:46 | 2026-09-23 | `b1680a63a7` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/StaffFace.dc.html` | 4990 | 2026-09-23 14:46 | 2026-09-23 | `b1680a63a7` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/StaffPuck.dc-0614d051.html` | 9317 | 2026-09-23 14:46 | 2026-09-23 | `2998bc2f4c` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/StaffPuck.dc.html` | 9317 | 2026-09-23 14:46 | 2026-09-23 | `2998bc2f4c` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/Yrkesroller - rorelse och uttryck.dc-701c0a83.html` | 42776 | 2026-09-23 14:46 | 2026-09-23 | `15531346c8` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/Yrkesroller - rorelse och uttryck.dc.html` | 42776 | 2026-09-23 14:46 | 2026-09-23 | `15531346c8` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_adherence.oxlintrc-a152602f.json` | 4002 | 2026-09-23 14:46 | 2026-09-23 | `dabf86ad7d` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_adherence.oxlintrc.json` | 4002 | 2026-09-23 14:46 | 2026-09-23 | `dabf86ad7d` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_bundle-6138a841.js` | 303 | 2026-09-23 14:46 | 2026-09-23 | `5e4ccabaa0` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_bundle.js` | 303 | 2026-09-23 14:46 | 2026-09-23 | `5e4ccabaa0` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_manifest-5a5662c5.json` | 7247 | 2026-09-23 14:46 | 2026-09-23 | `7437c3a696` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_manifest.json` | 7247 | 2026-09-23 14:46 | 2026-09-23 | `7437c3a696` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/readme-4b7a850a.md` | 7376 | 2026-09-23 14:46 | 2026-09-23 | `1082b4d77e` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/readme.md` | 7376 | 2026-09-23 14:46 | 2026-09-23 | `1082b4d77e` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/styles-cf9fcf75.css` | 10555 | 2026-09-23 14:46 | 2026-09-23 | `a303340a2f` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/styles.css` | 10555 | 2026-09-23 14:46 | 2026-09-23 | `a303340a2f` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/animations-v3-06ae64d4.jsx` | 55474 | 2026-09-23 14:46 | 2026-09-23 | `42f45bebc1` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/animations-v3.jsx` | 55474 | 2026-09-23 14:46 | 2026-09-23 | `42f45bebc1` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/github-e3b4a844.md` | 2249 | 2026-09-23 14:46 | 2026-09-23 | `3c444187ee` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/github.md` | 2249 | 2026-09-23 14:46 | 2026-09-23 | `3c444187ee` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/guest-reel-7b1de19d.jsx` | 19356 | 2026-09-23 14:46 | 2026-09-23 | `9f7df24e4d` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/guest-reel.jsx` | 19356 | 2026-09-23 14:46 | 2026-09-23 | `9f7df24e4d` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/staff-guest-reel-4cb0c152.jsx` | 26664 | 2026-09-23 14:46 | 2026-09-23 | `b4e21c89bf` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/staff-guest-reel.jsx` | 26664 | 2026-09-23 14:46 | 2026-09-23 | `b4e21c89bf` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/support-8fe7df74.js` | 69150 | 2026-09-23 14:46 | 2026-09-23 | `2e38395c4a` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/support.js` | 69150 | 2026-09-23 14:46 | 2026-09-23 | `2e38395c4a` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/tweaks-panel-d259e3a8.jsx` | 25439 | 2026-09-23 14:46 | 2026-09-23 | `2278b6c8a3` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/tweaks-panel.jsx` | 25439 | 2026-09-23 14:46 | 2026-09-23 | `2278b6c8a3` |
| `Restaurant guest animation/uploads/Restaurant guest animation (2)/.thumbnail` | 19628 | 2026-09-23 14:46 | 2026-09-23 | `31dea19432` |
| `Restaurant guest animation/uploads/Restaurant guest animation (2)/Guest Animation Reel standalone-src.dc.html` | 2552 | 2026-09-23 14:46 | 2026-09-23 | `62f5cb3182` |
| `Restaurant guest animation/uploads/Restaurant guest animation (2)/Guest Animation Reel.dc.html` | 1750 | 2026-09-23 14:46 | 2026-09-23 | `a06cb5632b` |
| `Restaurant guest animation/uploads/Restaurant guest animation (2)/Guest Animation Reel.html` | 1156280 | 2026-09-23 14:46 | 2026-09-23 | `e344dba3ff` |
| `Restaurant guest animation/uploads/Restaurant guest animation (2)/Matsalen - i kontext.dc.html` | 17639 | 2026-09-23 14:46 | 2026-09-23 | `41305b7172` |
| `Restaurant guest animation/uploads/Restaurant guest animation (2)/Personal - perspektiv och rörelser.dc.html` | 70968 | 2026-09-23 14:46 | 2026-09-23 | `45665a90b4` |
| `Restaurant guest animation/uploads/Restaurant guest animation (2)/Reel - gaster och personal.dc.html` | 1826 | 2026-09-23 14:46 | 2026-09-23 | `3c3c7a13ff` |
| `Restaurant guest animation/uploads/Restaurant guest animation (2)/StaffFace.dc.html` | 4990 | 2026-09-23 14:46 | 2026-09-23 | `b1680a63a7` |
| `Restaurant guest animation/uploads/Restaurant guest animation (2)/StaffPuck.dc.html` | 9317 | 2026-09-23 14:46 | 2026-09-23 | `2998bc2f4c` |
| `Restaurant guest animation/uploads/Restaurant guest animation (2)/Yrkesroller - rorelse och uttryck.dc.html` | 42776 | 2026-09-23 14:46 | 2026-09-23 | `15531346c8` |
| `Restaurant guest animation/uploads/Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_adherence.oxlintrc.json` | 4002 | 2026-09-23 14:46 | 2026-09-23 | `dabf86ad7d` |
| `Restaurant guest animation/uploads/Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_bundle.js` | 303 | 2026-09-23 14:46 | 2026-09-23 | `5e4ccabaa0` |
| `Restaurant guest animation/uploads/Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_manifest.json` | 7247 | 2026-09-23 14:46 | 2026-09-23 | `7437c3a696` |
| `Restaurant guest animation/uploads/Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/readme.md` | 7376 | 2026-09-23 14:46 | 2026-09-23 | `1082b4d77e` |
| `Restaurant guest animation/uploads/Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/styles.css` | 10555 | 2026-09-23 14:46 | 2026-09-23 | `a303340a2f` |
| `Restaurant guest animation/uploads/Restaurant guest animation (2)/animations-v3.jsx` | 55474 | 2026-09-23 14:46 | 2026-09-23 | `42f45bebc1` |
| `Restaurant guest animation/uploads/Restaurant guest animation (2)/github.md` | 2249 | 2026-09-23 14:46 | 2026-09-23 | `3c444187ee` |
| `Restaurant guest animation/uploads/Restaurant guest animation (2)/guest-reel.jsx` | 19356 | 2026-09-23 14:46 | 2026-09-23 | `9f7df24e4d` |
| `Restaurant guest animation/uploads/Restaurant guest animation (2)/staff-guest-reel.jsx` | 26664 | 2026-09-23 14:46 | 2026-09-23 | `b4e21c89bf` |
| `Restaurant guest animation/uploads/Restaurant guest animation (2)/support.js` | 69150 | 2026-09-23 14:46 | 2026-09-23 | `2e38395c4a` |
| `Restaurant guest animation/uploads/Restaurant guest animation (2)/tweaks-panel.jsx` | 25439 | 2026-09-23 14:46 | 2026-09-23 | `2278b6c8a3` |
| `Restaurant guest animation/wineBarRoom.js` | 38605 | 2026-09-23 14:46 | 2026-09-23 | `76985d099a` |
| `Restaurant guest animation/wineBarRoom.ts` | 43124 | 2026-09-23 14:46 | 2026-09-23 | `43f5bf42fb` |

### Restaurant guest animation (2) (130 filer)

| Sökväg | Storlek (B) | Ändrad (fs) | Senaste commit | SHA-1 (10) |
|---|---:|---|---|---|
| `Restaurant guest animation (2)/.thumbnail` | 17494 | 2026-09-23 14:46 | 2026-09-23 | `17864793f8` |
| `Restaurant guest animation (2)/Canvas.dc.html` | 206 | 2026-09-23 14:46 | 2026-09-23 | `819a6a580e` |
| `Restaurant guest animation (2)/Figurrigg - kroppar i rummet.dc.html` | 30886 | 2026-09-23 14:46 | 2026-09-23 | `4d043f4cfd` |
| `Restaurant guest animation (2)/Guest Animation Reel standalone-src.dc.html` | 2552 | 2026-09-23 14:46 | 2026-09-23 | `62f5cb3182` |
| `Restaurant guest animation (2)/Guest Animation Reel.dc.html` | 1750 | 2026-09-23 14:46 | 2026-09-23 | `a06cb5632b` |
| `Restaurant guest animation (2)/Guest Animation Reel.html` | 1156280 | 2026-09-23 14:46 | 2026-09-23 | `e344dba3ff` |
| `Restaurant guest animation (2)/Matsalen - i kontext.dc.html` | 17639 | 2026-09-23 14:46 | 2026-09-23 | `41305b7172` |
| `Restaurant guest animation (2)/ORDER - olkrog med bryggeri.md` | 7409 | 2026-09-23 14:46 | 2026-09-23 | `48cf728bb2` |
| `Restaurant guest animation (2)/ORDER - vinbaren.md` | 9720 | 2026-09-23 14:46 | 2026-09-23 | `42f69e29aa` |
| `Restaurant guest animation (2)/Olkrog med bryggeri.dc.html` | 37219 | 2026-09-23 14:46 | 2026-09-23 | `d426fa173b` |
| `Restaurant guest animation (2)/Personal - perspektiv och rörelser.dc.html` | 70968 | 2026-09-23 14:46 | 2026-09-23 | `45665a90b4` |
| `Restaurant guest animation (2)/Reel - gaster och personal.dc.html` | 2230 | 2026-09-23 14:46 | 2026-09-23 | `85c9a54480` |
| `Restaurant guest animation (2)/Reel - gaster och personal.html` | 1165854 | 2026-09-23 14:46 | 2026-09-23 | `3564a1a018` |
| `Restaurant guest animation (2)/Reel standalone-src.dc.html` | 3193 | 2026-09-23 14:46 | 2026-09-23 | `fa56b08c80` |
| `Restaurant guest animation (2)/StaffFace.dc.html` | 4990 | 2026-09-23 14:46 | 2026-09-23 | `b1680a63a7` |
| `Restaurant guest animation (2)/StaffPuck.dc.html` | 9317 | 2026-09-23 14:46 | 2026-09-23 | `2998bc2f4c` |
| `Restaurant guest animation (2)/Vinbaren - lounger och DJ.dc.html` | 206 | 2026-09-23 14:46 | 2026-09-23 | `819a6a580e` |
| `Restaurant guest animation (2)/Vinbaren.dc.html` | 41894 | 2026-09-23 14:46 | 2026-09-23 | `d0151512a6` |
| `Restaurant guest animation (2)/Yrkesroller - rorelse och uttryck.dc.html` | 42776 | 2026-09-23 14:46 | 2026-09-23 | `15531346c8` |
| `Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_adherence.oxlintrc.json` | 4002 | 2026-09-23 14:46 | 2026-09-23 | `dabf86ad7d` |
| `Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_bundle.js` | 303 | 2026-09-23 14:46 | 2026-09-23 | `5e4ccabaa0` |
| `Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_manifest.json` | 7247 | 2026-09-23 14:46 | 2026-09-23 | `7437c3a696` |
| `Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/readme.md` | 7376 | 2026-09-23 14:46 | 2026-09-23 | `1082b4d77e` |
| `Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/styles.css` | 10555 | 2026-09-23 14:46 | 2026-09-23 | `a303340a2f` |
| `Restaurant guest animation (2)/animations-v3.jsx` | 55474 | 2026-09-23 14:46 | 2026-09-23 | `42f45bebc1` |
| `Restaurant guest animation (2)/brewpubRoom.js` | 30997 | 2026-09-23 14:46 | 2026-09-23 | `2ca7ba60f0` |
| `Restaurant guest animation (2)/brewpubRoom.ts` | 35113 | 2026-09-23 14:46 | 2026-09-23 | `408e2a1ece` |
| `Restaurant guest animation (2)/figureRig.js` | 25897 | 2026-09-23 14:46 | 2026-09-23 | `3f986b37b0` |
| `Restaurant guest animation (2)/figureRig.ts` | 29800 | 2026-09-23 14:46 | 2026-09-23 | `a774451c0b` |
| `Restaurant guest animation (2)/github.md` | 5188 | 2026-09-23 14:46 | 2026-09-23 | `e2b9a4a301` |
| `Restaurant guest animation (2)/guest-reel.jsx` | 19356 | 2026-09-23 14:46 | 2026-09-23 | `9f7df24e4d` |
| `Restaurant guest animation (2)/screenshots/01-c.png` | 30402 | 2026-09-23 14:46 | 2026-09-23 | `5454945383` |
| `Restaurant guest animation (2)/screenshots/01-carry.png` | 27803 | 2026-09-23 14:46 | 2026-09-23 | `e918ec3ee1` |
| `Restaurant guest animation (2)/screenshots/01-close.png` | 29716 | 2026-09-23 14:46 | 2026-09-23 | `a58d1d82c9` |
| `Restaurant guest animation (2)/screenshots/01-fix.png` | 36083 | 2026-09-23 14:46 | 2026-09-23 | `ddd2f84ba8` |
| `Restaurant guest animation (2)/screenshots/01-g5.png` | 40933 | 2026-09-23 14:46 | 2026-09-23 | `7ee0cfcb53` |
| `Restaurant guest animation (2)/screenshots/01-g6.png` | 35917 | 2026-09-23 14:46 | 2026-09-23 | `45dcbdf7cf` |
| `Restaurant guest animation (2)/screenshots/01-kontakt2.png` | 28092 | 2026-09-23 14:46 | 2026-09-23 | `e09bc7400a` |
| `Restaurant guest animation (2)/screenshots/02-c.png` | 30359 | 2026-09-23 14:46 | 2026-09-23 | `8740dc933d` |
| `Restaurant guest animation (2)/screenshots/02-carry.png` | 27794 | 2026-09-23 14:46 | 2026-09-23 | `35c9e468e3` |
| `Restaurant guest animation (2)/screenshots/02-close.png` | 29688 | 2026-09-23 14:46 | 2026-09-23 | `08caf9d796` |
| `Restaurant guest animation (2)/screenshots/02-fix.png` | 33126 | 2026-09-23 14:46 | 2026-09-23 | `958b8eacae` |
| `Restaurant guest animation (2)/screenshots/02-g5.png` | 32549 | 2026-09-23 14:46 | 2026-09-23 | `7b00c39138` |
| `Restaurant guest animation (2)/screenshots/02-g6.png` | 31682 | 2026-09-23 14:46 | 2026-09-23 | `0bab5ac299` |
| `Restaurant guest animation (2)/screenshots/02-kontakt2.png` | 36921 | 2026-09-23 14:46 | 2026-09-23 | `0d7a0a9c8e` |
| `Restaurant guest animation (2)/screenshots/03-c.png` | 30351 | 2026-09-23 14:46 | 2026-09-23 | `65720533ce` |
| `Restaurant guest animation (2)/screenshots/03-close.png` | 29668 | 2026-09-23 14:46 | 2026-09-23 | `b79bd1bc33` |
| `Restaurant guest animation (2)/screenshots/03-fix.png` | 36083 | 2026-09-23 14:46 | 2026-09-23 | `ddd2f84ba8` |
| `Restaurant guest animation (2)/screenshots/03-g5.png` | 37684 | 2026-09-23 14:46 | 2026-09-23 | `8ad03a766b` |
| `Restaurant guest animation (2)/screenshots/03-g6.png` | 35917 | 2026-09-23 14:46 | 2026-09-23 | `45dcbdf7cf` |
| `Restaurant guest animation (2)/screenshots/04-c.png` | 30378 | 2026-09-23 14:46 | 2026-09-23 | `7627f59df1` |
| `Restaurant guest animation (2)/screenshots/04-close.png` | 29707 | 2026-09-23 14:46 | 2026-09-23 | `c8165318ce` |
| `Restaurant guest animation (2)/screenshots/04-fix.png` | 36376 | 2026-09-23 14:46 | 2026-09-23 | `e7a9c3ba56` |
| `Restaurant guest animation (2)/screenshots/carry2.png` | 27698 | 2026-09-23 14:46 | 2026-09-23 | `d0a53179e8` |
| `Restaurant guest animation (2)/screenshots/close2.png` | 30402 | 2026-09-23 14:46 | 2026-09-23 | `5454945383` |
| `Restaurant guest animation (2)/screenshots/gaster.png` | 40241 | 2026-09-23 14:46 | 2026-09-23 | `ed5cf2fe5a` |
| `Restaurant guest animation (2)/screenshots/gester.png` | 37406 | 2026-09-23 14:46 | 2026-09-23 | `d45d04d21f` |
| `Restaurant guest animation (2)/screenshots/kontakt.png` | 38815 | 2026-09-23 14:46 | 2026-09-23 | `5d95470bf4` |
| `Restaurant guest animation (2)/screenshots/rig-face.png` | 31176 | 2026-09-23 14:46 | 2026-09-23 | `48c13f0ecd` |
| `Restaurant guest animation (2)/screenshots/rig-stage.png` | 18397 | 2026-09-23 14:46 | 2026-09-23 | `16fd456fd2` |
| `Restaurant guest animation (2)/screenshots/rig2.png` | 37526 | 2026-09-23 14:46 | 2026-09-23 | `dde8877725` |
| `Restaurant guest animation (2)/screenshots/rig4.png` | 40899 | 2026-09-23 14:46 | 2026-09-23 | `7ce5c6753d` |
| `Restaurant guest animation (2)/screenshots/seated.png` | 30158 | 2026-09-23 14:46 | 2026-09-23 | `dd78c8363b` |
| `Restaurant guest animation (2)/staff-guest-reel.jsx` | 49063 | 2026-09-23 14:46 | 2026-09-23 | `5ecd295734` |
| `Restaurant guest animation (2)/support.js` | 69150 | 2026-09-23 14:46 | 2026-09-23 | `2e38395c4a` |
| `Restaurant guest animation (2)/tweaks-panel.jsx` | 25439 | 2026-09-23 14:46 | 2026-09-23 | `2278b6c8a3` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/.thumbnail` | 19628 | 2026-09-23 14:46 | 2026-09-23 | `31dea19432` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/.thumbnail-f5d89e4e` | 19628 | 2026-09-23 14:46 | 2026-09-23 | `31dea19432` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Guest Animation Reel standalone-src.dc-ed0ed99b.html` | 2552 | 2026-09-23 14:46 | 2026-09-23 | `62f5cb3182` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Guest Animation Reel standalone-src.dc.html` | 2552 | 2026-09-23 14:46 | 2026-09-23 | `62f5cb3182` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Guest Animation Reel-277965c5.html` | 1156280 | 2026-09-23 14:46 | 2026-09-23 | `e344dba3ff` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Guest Animation Reel.dc-52829de6.html` | 1750 | 2026-09-23 14:46 | 2026-09-23 | `a06cb5632b` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Guest Animation Reel.dc.html` | 1750 | 2026-09-23 14:46 | 2026-09-23 | `a06cb5632b` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Guest Animation Reel.html` | 1156280 | 2026-09-23 14:46 | 2026-09-23 | `e344dba3ff` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Matsalen - i kontext.dc-9825180c.html` | 17639 | 2026-09-23 14:46 | 2026-09-23 | `41305b7172` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Matsalen - i kontext.dc.html` | 17639 | 2026-09-23 14:46 | 2026-09-23 | `41305b7172` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Personal - perspektiv och rörelser.dc-58f60116.html` | 70968 | 2026-09-23 14:46 | 2026-09-23 | `45665a90b4` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Personal - perspektiv och rörelser.dc.html` | 70968 | 2026-09-23 14:46 | 2026-09-23 | `45665a90b4` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Reel - gaster och personal.dc-14b14ee7.html` | 1826 | 2026-09-23 14:46 | 2026-09-23 | `3c3c7a13ff` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Reel - gaster och personal.dc.html` | 1826 | 2026-09-23 14:46 | 2026-09-23 | `3c3c7a13ff` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/StaffFace.dc-9a201780.html` | 4990 | 2026-09-23 14:46 | 2026-09-23 | `b1680a63a7` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/StaffFace.dc.html` | 4990 | 2026-09-23 14:46 | 2026-09-23 | `b1680a63a7` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/StaffPuck.dc-0614d051.html` | 9317 | 2026-09-23 14:46 | 2026-09-23 | `2998bc2f4c` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/StaffPuck.dc.html` | 9317 | 2026-09-23 14:46 | 2026-09-23 | `2998bc2f4c` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Yrkesroller - rorelse och uttryck.dc-701c0a83.html` | 42776 | 2026-09-23 14:46 | 2026-09-23 | `15531346c8` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Yrkesroller - rorelse och uttryck.dc.html` | 42776 | 2026-09-23 14:46 | 2026-09-23 | `15531346c8` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_adherence.oxlintrc-a152602f.json` | 4002 | 2026-09-23 14:46 | 2026-09-23 | `dabf86ad7d` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_adherence.oxlintrc.json` | 4002 | 2026-09-23 14:46 | 2026-09-23 | `dabf86ad7d` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_bundle-6138a841.js` | 303 | 2026-09-23 14:46 | 2026-09-23 | `5e4ccabaa0` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_bundle.js` | 303 | 2026-09-23 14:46 | 2026-09-23 | `5e4ccabaa0` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_manifest-5a5662c5.json` | 7247 | 2026-09-23 14:46 | 2026-09-23 | `7437c3a696` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_manifest.json` | 7247 | 2026-09-23 14:46 | 2026-09-23 | `7437c3a696` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/readme-4b7a850a.md` | 7376 | 2026-09-23 14:46 | 2026-09-23 | `1082b4d77e` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/readme.md` | 7376 | 2026-09-23 14:46 | 2026-09-23 | `1082b4d77e` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/styles-cf9fcf75.css` | 10555 | 2026-09-23 14:46 | 2026-09-23 | `a303340a2f` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/styles.css` | 10555 | 2026-09-23 14:46 | 2026-09-23 | `a303340a2f` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/animations-v3-06ae64d4.jsx` | 55474 | 2026-09-23 14:46 | 2026-09-23 | `42f45bebc1` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/animations-v3.jsx` | 55474 | 2026-09-23 14:46 | 2026-09-23 | `42f45bebc1` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/github-e3b4a844.md` | 2249 | 2026-09-23 14:46 | 2026-09-23 | `3c444187ee` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/github.md` | 2249 | 2026-09-23 14:46 | 2026-09-23 | `3c444187ee` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/guest-reel-7b1de19d.jsx` | 19356 | 2026-09-23 14:46 | 2026-09-23 | `9f7df24e4d` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/guest-reel.jsx` | 19356 | 2026-09-23 14:46 | 2026-09-23 | `9f7df24e4d` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/staff-guest-reel-4cb0c152.jsx` | 26664 | 2026-09-23 14:46 | 2026-09-23 | `b4e21c89bf` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/staff-guest-reel.jsx` | 26664 | 2026-09-23 14:46 | 2026-09-23 | `b4e21c89bf` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/support-8fe7df74.js` | 69150 | 2026-09-23 14:46 | 2026-09-23 | `2e38395c4a` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/support.js` | 69150 | 2026-09-23 14:46 | 2026-09-23 | `2e38395c4a` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/tweaks-panel-d259e3a8.jsx` | 25439 | 2026-09-23 14:46 | 2026-09-23 | `2278b6c8a3` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/tweaks-panel.jsx` | 25439 | 2026-09-23 14:46 | 2026-09-23 | `2278b6c8a3` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/.thumbnail` | 19628 | 2026-09-23 14:46 | 2026-09-23 | `31dea19432` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/Guest Animation Reel standalone-src.dc.html` | 2552 | 2026-09-23 14:46 | 2026-09-23 | `62f5cb3182` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/Guest Animation Reel.dc.html` | 1750 | 2026-09-23 14:46 | 2026-09-23 | `a06cb5632b` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/Guest Animation Reel.html` | 1156280 | 2026-09-23 14:46 | 2026-09-23 | `e344dba3ff` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/Matsalen - i kontext.dc.html` | 17639 | 2026-09-23 14:46 | 2026-09-23 | `41305b7172` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/Personal - perspektiv och rörelser.dc.html` | 70968 | 2026-09-23 14:46 | 2026-09-23 | `45665a90b4` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/Reel - gaster och personal.dc.html` | 1826 | 2026-09-23 14:46 | 2026-09-23 | `3c3c7a13ff` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/StaffFace.dc.html` | 4990 | 2026-09-23 14:46 | 2026-09-23 | `b1680a63a7` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/StaffPuck.dc.html` | 9317 | 2026-09-23 14:46 | 2026-09-23 | `2998bc2f4c` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/Yrkesroller - rorelse och uttryck.dc.html` | 42776 | 2026-09-23 14:46 | 2026-09-23 | `15531346c8` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_adherence.oxlintrc.json` | 4002 | 2026-09-23 14:46 | 2026-09-23 | `dabf86ad7d` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_bundle.js` | 303 | 2026-09-23 14:46 | 2026-09-23 | `5e4ccabaa0` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_manifest.json` | 7247 | 2026-09-23 14:46 | 2026-09-23 | `7437c3a696` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/readme.md` | 7376 | 2026-09-23 14:46 | 2026-09-23 | `1082b4d77e` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/styles.css` | 10555 | 2026-09-23 14:46 | 2026-09-23 | `a303340a2f` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/animations-v3.jsx` | 55474 | 2026-09-23 14:46 | 2026-09-23 | `42f45bebc1` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/github.md` | 2249 | 2026-09-23 14:46 | 2026-09-23 | `3c444187ee` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/guest-reel.jsx` | 19356 | 2026-09-23 14:46 | 2026-09-23 | `9f7df24e4d` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/staff-guest-reel.jsx` | 26664 | 2026-09-23 14:46 | 2026-09-23 | `b4e21c89bf` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/support.js` | 69150 | 2026-09-23 14:46 | 2026-09-23 | `2e38395c4a` |
| `Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/tweaks-panel.jsx` | 25439 | 2026-09-23 14:46 | 2026-09-23 | `2278b6c8a3` |
| `Restaurant guest animation (2)/wineBarRoom.js` | 38605 | 2026-09-23 14:46 | 2026-09-23 | `76985d099a` |

### documentation (423 filer)

| Sökväg | Storlek (B) | Ändrad (fs) | Senaste commit | SHA-1 (10) |
|---|---:|---|---|---|
| `documentation/DESIGN_BACKLOG.md` | 20195 | 2026-09-23 14:46 | 2026-08-10 | `8fec2f7c9c` |
| `documentation/architecture/.gitkeep` | 0 | 2026-09-23 14:46 | 2026-07-19 | `da39a3ee5e` |
| `documentation/architecture/ACES_MODEL_FINDINGS_ORDER_069.md` | 15181 | 2026-09-23 14:46 | 2026-08-13 | `962cd60d72` |
| `documentation/architecture/ADAPTIVE_BUILDINGS.md` | 15649 | 2026-09-23 14:46 | 2026-07-26 | `09e7b88bbf` |
| `documentation/architecture/ADAPTIVE_BUILDING_REFERENCE.md` | 3217 | 2026-09-23 14:46 | 2026-07-25 | `75ed489bb5` |
| `documentation/architecture/ADR_001_DIGITAL_TWIN_PHASE.md` | 20520 | 2026-09-23 14:46 | 2026-07-23 | `dc18322fb6` |
| `documentation/architecture/ADR_002_SYNTHESIS_POLICY.md` | 15307 | 2026-09-23 14:46 | 2026-07-29 | `bb763fab5a` |
| `documentation/architecture/AUTHENTICITY_MATRIX.md` | 7308 | 2026-09-23 14:46 | 2026-07-27 | `ca42cd8fc0` |
| `documentation/architecture/BOUNDARY_SYSTEM.md` | 3937 | 2026-09-23 14:46 | 2026-07-27 | `90d1927040` |
| `documentation/architecture/BUILDING_CATALOGUE.md` | 35289 | 2026-09-23 14:46 | 2026-07-26 | `1e35efca60` |
| `documentation/architecture/BUILDING_CLASSIFICATION_REFERENCE.md` | 3559 | 2026-09-23 14:46 | 2026-07-25 | `66a27d6be9` |
| `documentation/architecture/BUILDING_COMPLETION_AUDIT_ORDER_021.md` | 6371 | 2026-09-23 14:46 | 2026-07-25 | `a8deebcbcf` |
| `documentation/architecture/BUILDING_COMPLETION_REPORT_ORDER_021.md` | 10162 | 2026-09-23 14:46 | 2026-07-25 | `6262e7da38` |
| `documentation/architecture/BUILDING_OVERLAP_CORRECTION_PROPOSAL_ORDER_040_S6.md` | 19317 | 2026-09-23 14:46 | 2026-07-30 | `aef05073d4` |
| `documentation/architecture/BUILDING_OVERLAP_DIAGNOSTIC_REPORT_ORDER_039.md` | 29247 | 2026-09-23 14:46 | 2026-07-30 | `fd488093af` |
| `documentation/architecture/CATEGORY_B_CONFIRMATION_SHEET_ORDER_040_S4.md` | 14730 | 2026-09-23 14:46 | 2026-07-30 | `f9ce18ad41` |
| `documentation/architecture/CRITICAL_DEFECT_REGISTER_ORDER_019.md` | 11461 | 2026-09-23 14:46 | 2026-07-25 | `420c83a83f` |
| `documentation/architecture/DESIGN_PRINCIPLE_REALITY_VS_GAMEPLAY.md` | 5759 | 2026-09-23 14:46 | 2026-07-25 | `56da3d64da` |
| `documentation/architecture/DEVELOPER_REVIEW_GUIDE.md` | 4732 | 2026-09-23 14:46 | 2026-07-25 | `b36851f188` |
| `documentation/architecture/DISTRICT_1_REFERENCE_REQUEST.md` | 15767 | 2026-09-23 14:46 | 2026-07-23 | `976e06de69` |
| `documentation/architecture/DISTRICT_COMPLETENESS.md` | 10038 | 2026-09-23 14:46 | 2026-07-26 | `32c425e654` |
| `documentation/architecture/DISTRICT_FREEZE_GUIDE.md` | 4007 | 2026-09-23 14:46 | 2026-07-25 | `984ed75466` |
| `documentation/architecture/DISTRICT_IDENTITY_REFERENCE.md` | 3656 | 2026-09-23 14:46 | 2026-07-25 | `6373f065a2` |
| `documentation/architecture/DISTRICT_METADATA_REFERENCE.md` | 2452 | 2026-09-23 14:46 | 2026-07-25 | `3819d1f6f7` |
| `documentation/architecture/DISTRICT_PRODUCTION_TRACKER.md` | 3654 | 2026-09-23 14:46 | 2026-07-25 | `9115964a0a` |
| `documentation/architecture/ENGINEERING_INFRASTRUCTURE_ORDER_023.md` | 9302 | 2026-09-23 14:46 | 2026-07-25 | `cce7dd2b7c` |
| `documentation/architecture/EVENT_FRAMEWORK_REFERENCE.md` | 2709 | 2026-09-23 14:46 | 2026-07-25 | `87ac6a1d2d` |
| `documentation/architecture/EYE_HEIGHT_FOR_SEAT_PENDING.md` | 2429 | 2026-09-23 14:46 | 2026-09-10 | `71594eee6d` |
| `documentation/architecture/FULL_MAP_AUTHENTICITY_AUDIT_ORDER_019R.md` | 12711 | 2026-09-23 14:46 | 2026-07-25 | `ea790f3b15` |
| `documentation/architecture/GAMEPLAY_ANNOTATION_REFERENCE.md` | 3362 | 2026-09-23 14:46 | 2026-07-25 | `c8697250f4` |
| `documentation/architecture/GAMEPLAY_READY_WORLD.md` | 11476 | 2026-09-23 14:46 | 2026-07-26 | `9970c7bfdf` |
| `documentation/architecture/GAP_AUDIT_017_075.md` | 13922 | 2026-09-23 14:46 | 2026-08-29 | `5d3baf0a7e` |
| `documentation/architecture/INSTITUTION_REFERENCE.md` | 2745 | 2026-09-23 14:46 | 2026-07-25 | `e8312d4cfe` |
| `documentation/architecture/KNOWLEDGE_DOMAIN_REFERENCE.md` | 2397 | 2026-09-23 14:46 | 2026-07-25 | `0a43baa55b` |
| `documentation/architecture/LANDMARK_AUDIT_REFERENCE.md` | 2565 | 2026-09-23 14:46 | 2026-07-25 | `8f3fe7e774` |
| `documentation/architecture/LANDMARK_CATALOGUE.md` | 13299 | 2026-09-23 14:46 | 2026-07-26 | `1c66faa8b6` |
| `documentation/architecture/LANDMARK_PROGRAM.md` | 6266 | 2026-09-23 14:46 | 2026-07-25 | `35afc9c8ee` |
| `documentation/architecture/LOAD_CHAIN_TRACE_2026-08-15.md` | 10607 | 2026-09-23 14:46 | 2026-08-15 | `e4dc9ff390` |
| `documentation/architecture/LOOP_STATUS.md` | 3830 | 2026-09-23 14:46 | 2026-08-09 | `770790453d` |
| `documentation/architecture/M0_CAMERA_PITCH_PROBE_REPORT_ORDER_083.md` | 8924 | 2026-09-23 14:46 | 2026-08-13 | `e49eae8850` |
| `documentation/architecture/M2_ACTIVITY_MODEL_REPORT_ORDER_075.md` | 7241 | 2026-09-23 14:46 | 2026-08-13 | `57092ace49` |
| `documentation/architecture/M4A_ATTRACTIVENESS_AND_SUBSTITUTION_REPORT_ORDER_079.md` | 12187 | 2026-09-23 14:46 | 2026-08-13 | `40d332596f` |
| `documentation/architecture/M4_MENU_KITCHEN_STOCK_REPORT_ORDER_077.md` | 13801 | 2026-09-23 14:46 | 2026-08-13 | `f63ac93d61` |
| `documentation/architecture/M5_MISE_EN_PLACE_AND_RHYTHM_REPORT_ORDER_078.md` | 16968 | 2026-09-23 14:46 | 2026-08-13 | `6aa74ad609` |
| `documentation/architecture/M6_CAUSE_AWARE_TEXTURE_REPORT_ORDER_076.md` | 9981 | 2026-09-23 14:46 | 2026-08-13 | `fdffc0db22` |
| `documentation/architecture/M7A_CHEF_SERVICE_QUESTIONS_REPORT_ORDER_080.md` | 5994 | 2026-09-23 14:46 | 2026-08-13 | `d86ef7ad56` |
| `documentation/architecture/M8_PERCEPTION_PUNCH_LIST.md` | 13901 | 2026-09-23 14:46 | 2026-08-13 | `3dde819582` |
| `documentation/architecture/M8_PLAYTEST_BRIEF_ORDER_081.md` | 12816 | 2026-09-23 14:46 | 2026-08-13 | `0c290f7344` |
| `documentation/architecture/M8_ROOM_CARD_PANEL_REPORT_ORDER_085.md` | 29795 | 2026-09-23 14:46 | 2026-08-13 | `b0bd8015f9` |
| `documentation/architecture/ORDER_025_ENGINEERING_REPORT.md` | 6208 | 2026-09-23 14:46 | 2026-07-25 | `56b212a526` |
| `documentation/architecture/ORDER_027_FINAL_REPORT.md` | 6191 | 2026-09-23 14:46 | 2026-07-25 | `fcedb25089` |
| `documentation/architecture/ORDER_034_DOCUMENTATION_ALIGNMENT.md` | 10919 | 2026-09-23 14:46 | 2026-07-28 | `ed3a1437e8` |
| `documentation/architecture/ORDER_035_MEMORY_PROVENANCE_REPAIR.md` | 24801 | 2026-09-23 14:46 | 2026-07-30 | `bcd9ad569c` |
| `documentation/architecture/ORDER_036_REFERENCE_INTEGRITY_INFRASTRUCTURE.md` | 6714 | 2026-09-23 14:46 | 2026-07-29 | `7f1f988519` |
| `documentation/architecture/ORDER_037_SCENARIO_TYPE_SEGREGATION.md` | 5584 | 2026-09-23 14:46 | 2026-07-30 | `d21485e071` |
| `documentation/architecture/ORDER_038_RV244_CURVATURE_LAYER.md` | 5029 | 2026-09-23 14:46 | 2026-07-30 | `be11152c67` |
| `documentation/architecture/ORDER_039_BUILDING_OVERLAP_DIAGNOSTIC.md` | 6137 | 2026-09-23 14:46 | 2026-07-30 | `a98cef509f` |
| `documentation/architecture/ORDER_040_SYNTHETIC_BUILDING_MARKING.md` | 8789 | 2026-09-23 14:46 | 2026-07-30 | `4e82edaa84` |
| `documentation/architecture/ORDER_041_UNPAUSE_VS002_FIRST_PLAYABLE_LOOP.md` | 8080 | 2026-09-23 14:46 | 2026-07-30 | `9e2ef4373f` |
| `documentation/architecture/ORDER_042_BUILD_FIRST_PLAYABLE_LOOP.md` | 8918 | 2026-09-23 14:46 | 2026-08-08 | `5d406fb68a` |
| `documentation/architecture/ORDER_043_ADDENDUM_B_THE_VOICE.md` | 5774 | 2026-09-23 14:46 | 2026-08-09 | `bb3e0d9ec3` |
| `documentation/architecture/ORDER_043_ADDENDUM_SERVICE_EVENT_STREAM.md` | 5599 | 2026-09-23 14:46 | 2026-08-08 | `b5c107c038` |
| `documentation/architecture/ORDER_043_CAPITAL_WAGER_AND_CONSEQUENCE_CHAIN.md` | 12830 | 2026-09-23 14:46 | 2026-08-08 | `466b6f6967` |
| `documentation/architecture/ORDER_044_THE_VILLAGE_MADE_LEGIBLE.md` | 7406 | 2026-09-23 14:46 | 2026-08-09 | `7352a6041d` |
| `documentation/architecture/ORDER_045_THE_OPENING_IMAGE.md` | 16397 | 2026-09-23 14:46 | 2026-08-09 | `2fa8bf85d8` |
| `documentation/architecture/ORDER_046_THE_CYCLE_CLOSES.md` | 14876 | 2026-09-23 14:46 | 2026-08-09 | `d649b78c79` |
| `documentation/architecture/ORDER_047_THE_INSTRUMENTS_OF_SERVICE.md` | 7995 | 2026-09-23 14:46 | 2026-08-09 | `fa11665d8d` |
| `documentation/architecture/ORDER_048_THREE_VOICES_AND_THE_QUESTION.md` | 10062 | 2026-09-23 14:46 | 2026-08-10 | `f6eda71751` |
| `documentation/architecture/ORDER_049_THE_KNOWLEDGE_ENGINE.md` | 19361 | 2026-09-23 14:46 | 2026-08-10 | `adc9b5cc7a` |
| `documentation/architecture/ORDER_050_ACTIVITIES_AND_THE_LEDGER.md` | 8912 | 2026-09-23 14:46 | 2026-08-10 | `a97be9baaf` |
| `documentation/architecture/ORDER_050_ADDENDUM_A_PAUSE_AND_ATTENTION.md` | 5671 | 2026-09-23 14:46 | 2026-08-10 | `f54f57e8a2` |
| `documentation/architecture/ORDER_051_SUPPLIERS_MENU_AND_STOCK.md` | 7099 | 2026-09-23 14:46 | 2026-08-10 | `d68d10a67c` |
| `documentation/architecture/ORDER_052_MISE_EN_PLACE_AND_THE_CAUSE.md` | 7901 | 2026-09-23 14:46 | 2026-08-10 | `a85c3a0979` |
| `documentation/architecture/ORDER_102_R1_KUNSKAPSKAPITAL.md` | 11926 | 2026-09-23 14:46 | 2026-08-15 | `9f0b9452b2` |
| `documentation/architecture/ORDER_118_REGISTERREVISION.md` | 3919 | 2026-09-23 14:46 | 2026-08-29 | `dfdc1cf528` |
| `documentation/architecture/ORDER_120_RYKTE_TREND_PA_STANGD_PILL.md` | 6427 | 2026-09-23 14:46 | 2026-08-29 | `584a507a5b` |
| `documentation/architecture/ORDER_121_KROPPAR_I_SCENEN.md` | 12542 | 2026-09-23 14:46 | 2026-08-29 | `5bf0baced4` |
| `documentation/architecture/ORDER_123_SILHUETTEN_LASES.md` | 8049 | 2026-09-23 14:46 | 2026-08-29 | `e58b23f06f` |
| `documentation/architecture/ORDER_124_INGEN_AR_HEMMA.md` | 3742 | 2026-09-23 14:46 | 2026-08-29 | `483d9071a3` |
| `documentation/architecture/ORDER_125_OLKROGEN.md` | 10624 | 2026-09-23 14:46 | 2026-08-29 | `d058a50dac` |
| `documentation/architecture/ORDER_126_STADNING_EFTER_PRESENTATIONSARBETET.md` | 4140 | 2026-09-23 14:46 | 2026-08-29 | `b54f8e1782` |
| `documentation/architecture/ORDER_127_BANDET_BLIR_ZONMEDVETET.md` | 4773 | 2026-09-23 14:46 | 2026-08-29 | `406f64e082` |
| `documentation/architecture/ORDER_129_DE_21_HALEN.md` | 4038 | 2026-09-23 14:46 | 2026-08-29 | `5dc0cd1d54` |
| `documentation/architecture/ORDER_130_KARTAN_MATS.md` | 3672 | 2026-09-23 14:46 | 2026-08-29 | `5931f581b2` |
| `documentation/architecture/ORDER_131_LOAD_SVEP.md` | 3697 | 2026-09-23 14:46 | 2026-08-30 | `d7475bdeb1` |
| `documentation/architecture/ORDER_132_FONSTREN_MOT_POLYGONEN.md` | 3043 | 2026-09-23 14:46 | 2026-08-30 | `33e0badf96` |
| `documentation/architecture/ORDER_133_VAGARNAS_BREDD.md` | 2860 | 2026-09-23 14:46 | 2026-08-30 | `53df203577` |
| `documentation/architecture/ORDER_134_BIMODALITETEN.md` | 3935 | 2026-09-23 14:46 | 2026-08-30 | `fc76118043` |
| `documentation/architecture/ORDER_135_MATNING_VS_RENDERING.md` | 3224 | 2026-09-23 14:46 | 2026-08-30 | `e78a26beba` |
| `documentation/architecture/ORDER_136_SMALARE_VAGAR_MATNING.md` | 3271 | 2026-09-23 14:46 | 2026-08-30 | `90bec9200a` |
| `documentation/architecture/ORDER_137_BAKGRUNDSARBETET.md` | 4285 | 2026-09-23 14:46 | 2026-08-30 | `59ceecf185` |
| `documentation/architecture/ORDER_145_SEATED_CAP_UTREDNING.md` | 1808 | 2026-09-23 14:46 | 2026-08-30 | `4592fef166` |
| `documentation/architecture/ORDER_146_OBSERVATION_OCH_DEVPANEL.md` | 2082 | 2026-09-23 14:46 | 2026-08-30 | `334d9e1f0c` |
| `documentation/architecture/ORDER_151_PERSONALROLLER_KARTLAGGNING.md` | 15729 | 2026-09-23 14:46 | 2026-08-30 | `2df52485d9` |
| `documentation/architecture/ORDER_152_PERSONALROLLER_BESLUT.md` | 13212 | 2026-09-23 14:46 | 2026-08-30 | `f936fafa3a` |
| `documentation/architecture/ORDER_158_VAGARNA_MOT_POLYGONERNA.md` | 3432 | 2026-09-23 14:46 | 2026-08-31 | `c7c14b8710` |
| `documentation/architecture/ORDER_159_PLINTHEN.md` | 6845 | 2026-09-23 14:46 | 2026-08-31 | `de52e754c9` |
| `documentation/architecture/ORDER_160_VERIFIERING_UR_SKRIPT.md` | 4146 | 2026-09-23 14:46 | 2026-08-31 | `fa1dd5fc03` |
| `documentation/architecture/ORDER_161_TALET_SKA_HA_EN_RAD.md` | 6700 | 2026-09-23 14:46 | 2026-08-31 | `0908648738` |
| `documentation/architecture/ORDER_162_YTTERVAGGEN_MOT_MARKEN.md` | 11369 | 2026-09-23 14:46 | 2026-09-01 | `b551549531` |
| `documentation/architecture/ORDER_164_BYGGNAD_PER_KLASS_KARTLAGGNING.md` | 3661 | 2026-09-23 14:46 | 2026-08-31 | `fe87f25a90` |
| `documentation/architecture/ORDER_165_ARRIVALS_KONKURRENS_KARTLAGGNING.md` | 4749 | 2026-09-23 14:46 | 2026-08-31 | `34c6833311` |
| `documentation/architecture/ORDER_166_KONKURRENTERNA_FINNS.md` | 13124 | 2026-09-23 14:46 | 2026-08-31 | `03b15e9d2f` |
| `documentation/architecture/ORDER_167_KONKURRENTERNA_ROR_SIG.md` | 8593 | 2026-09-23 14:46 | 2026-08-31 | `375160f5c3` |
| `documentation/architecture/ORDER_174_INTERIORLAYOUT_CONTRACT.md` | 7366 | 2026-09-23 14:46 | 2026-09-06 | `20341419f5` |
| `documentation/architecture/ORDER_175_ENTER_OCH_CAM_TARGET.md` | 7070 | 2026-09-23 14:46 | 2026-09-06 | `552deaf365` |
| `documentation/architecture/ORDER_176_BUILDINGS_OFF_ROADS.md` | 6326 | 2026-09-23 14:46 | 2026-09-06 | `bb5bf466ad` |
| `documentation/architecture/ORDER_184_PLAYERBUSINESS_YIELDS_TO_CONTRACT.md` | 6831 | 2026-09-23 14:46 | 2026-09-06 | `a53747f1d8` |
| `documentation/architecture/ORDER_185_SEATED_GUESTS_SIT_ON_CHAIRS.md` | 6897 | 2026-09-23 14:46 | 2026-09-06 | `dc93db55c7` |
| `documentation/architecture/ORDER_186_ROOM_BECOMES_LEGIBLE.md` | 8049 | 2026-09-23 14:46 | 2026-09-07 | `88d0762c8a` |
| `documentation/architecture/ORDER_187_PARTIES_STAY_TOGETHER.md` | 6811 | 2026-09-23 14:46 | 2026-09-07 | `b59dd78542` |
| `documentation/architecture/ORDER_188_POSE_AND_CLEANUP.md` | 6929 | 2026-09-23 14:46 | 2026-09-07 | `b2c8ec7e0d` |
| `documentation/architecture/ORDER_190_GUEST_ON_CHAIR_STAFF_Y.md` | 3047 | 2026-09-23 14:46 | 2026-09-07 | `27bf433568` |
| `documentation/architecture/ORDER_191_MISE_EN_PLACE_VISIBLE.md` | 4979 | 2026-09-23 14:46 | 2026-09-07 | `bdcb7d8df0` |
| `documentation/architecture/ORDER_193_POSESEATED_LEG_DIRECTION.md` | 5890 | 2026-09-23 14:46 | 2026-09-09 | `1c10575232` |
| `documentation/architecture/ORDER_RECONSTRUCTION_004_005_019_020.md` | 21982 | 2026-09-23 14:46 | 2026-07-29 | `61dacc896b` |
| `documentation/architecture/ORDER_REGISTRY.md` | 661091 | 2026-09-23 14:46 | 2026-09-23 | `d4230e04d5` |
| `documentation/architecture/PERFORMANCE_PREPARATION_REFERENCE.md` | 3973 | 2026-09-23 14:46 | 2026-07-25 | `d86c0f3dcf` |
| `documentation/architecture/PHASE_IV_KICKOFF_REPORT_ORDER_024.md` | 5596 | 2026-09-23 14:46 | 2026-07-25 | `66a8272e7d` |
| `documentation/architecture/PHASE_IV_PRODUCTION_PLAN.md` | 4918 | 2026-09-23 14:46 | 2026-07-25 | `7c7b0e2228` |
| `documentation/architecture/PLACE_CATALOGUE.md` | 13220 | 2026-09-23 14:46 | 2026-07-26 | `4289b8fbbd` |
| `documentation/architecture/PLACE_CHARACTER_REPORT.md` | 9753 | 2026-09-23 14:46 | 2026-07-27 | `6b4643536b` |
| `documentation/architecture/PLACE_MODEL_REFERENCE.md` | 3308 | 2026-09-23 14:46 | 2026-07-25 | `3d9e528e26` |
| `documentation/architecture/POI_DATABASE_REFERENCE.md` | 2003 | 2026-09-23 14:46 | 2026-07-25 | `f61a88c350` |
| `documentation/architecture/PROPERTY_CHARACTER_GUIDE.md` | 3993 | 2026-09-23 14:46 | 2026-07-27 | `744833a377` |
| `documentation/architecture/RECOGNISABILITY_SURVEY.md` | 10876 | 2026-09-23 14:46 | 2026-07-29 | `1ac5e2a3ba` |
| `documentation/architecture/REGISTER_AUDIT_2026-08.md` | 22057 | 2026-09-23 14:46 | 2026-08-29 | `8584dbb925` |
| `documentation/architecture/RENDERER_ALIGNMENT_REPORT_ORDER_020.md` | 8145 | 2026-09-23 14:46 | 2026-07-25 | `51bb684816` |
| `documentation/architecture/REVIEW_PACKAGE_ORDER_029.md` | 9040 | 2026-09-23 14:46 | 2026-07-26 | `35f2781a0c` |
| `documentation/architecture/RUNTIME_RENDER_CATALOG.md` | 8928 | 2026-09-23 14:46 | 2026-07-29 | `41ec45ff3f` |
| `documentation/architecture/STREET_PROFILE_CATALOGUE.md` | 8667 | 2026-09-23 14:46 | 2026-07-29 | `0fb1d3f162` |
| `documentation/architecture/TRANSFORMATION_MODEL_REFERENCE.md` | 3573 | 2026-09-23 14:46 | 2026-07-25 | `e3da67e08d` |
| `documentation/architecture/UTREDNING_C3_TROVARDIGHET_2026-09-14.md` | 12013 | 2026-09-23 14:46 | 2026-09-14 | `9403caa868` |
| `documentation/architecture/VALIDATOR_REFERENCE.md` | 7787 | 2026-09-23 14:46 | 2026-07-30 | `025c54aadb` |
| `documentation/architecture/VERTICAL_SLICE_001.md` | 9603 | 2026-09-23 14:46 | 2026-07-29 | `717db701e8` |
| `documentation/architecture/VERTICAL_SLICE_001_IMPLEMENTATION_REPORT.md` | 10178 | 2026-09-23 14:46 | 2026-07-29 | `a71595e0ec` |
| `documentation/architecture/VERTICAL_SLICE_002.md` | 10113 | 2026-09-23 14:46 | 2026-07-29 | `0c68991216` |
| `documentation/architecture/VISION_REVIEW_WORKFLOW.md` | 6017 | 2026-09-23 14:46 | 2026-07-25 | `3d5d6137b5` |
| `documentation/architecture/VISUAL_IDENTITY_AUDIT.md` | 8312 | 2026-09-23 14:46 | 2026-07-27 | `e0ad131f77` |
| `documentation/architecture/VS002_UNPAUSE_STATE_AND_LOOP_PROPOSAL_ORDER_041.md` | 28932 | 2026-09-23 14:46 | 2026-07-30 | `84ef2cd77a` |
| `documentation/architecture/WORLD_ALIGNMENT_AUDIT_ORDER_019.md` | 9249 | 2026-09-23 14:46 | 2026-07-25 | `4ab7948941` |
| `documentation/architecture/WORLD_ALIGNMENT_REPORT_ORDER_019.md` | 10488 | 2026-09-23 14:46 | 2026-07-25 | `90da039f0c` |
| `documentation/architecture/WORLD_AUTHENTICITY_REPORT_ORDER_022.md` | 10947 | 2026-09-23 14:46 | 2026-07-25 | `aba0d3a660` |
| `documentation/architecture/WORLD_COMPLETENESS_REPORT.md` | 7207 | 2026-09-23 14:46 | 2026-07-27 | `20059df2e8` |
| `documentation/architecture/WORLD_SEMANTICS_REFERENCE.md` | 5597 | 2026-09-23 14:46 | 2026-07-25 | `7974ab8261` |
| `documentation/architecture/skala-inventering.md` | 12716 | 2026-09-23 14:46 | 2026-08-12 | `56e212b622` |
| `documentation/archive/NEXUS_STUDIO_GAME_DESIGN_CONSTITUTION.docx` | 31192 | 2026-09-23 14:46 | 2026-07-29 | `a1eec67486` |
| `documentation/archive/world-wp02/01_THE_ORIGIN.md` | 2203 | 2026-09-23 14:46 | 2026-07-29 | `e82da76735` |
| `documentation/archive/world-wp02/02_FIRST_ARRIVAL.md` | 2156 | 2026-09-23 14:46 | 2026-07-29 | `c4d074b5d8` |
| `documentation/archive/world-wp02/03_GRYTHYTTAN.md` | 1889 | 2026-09-23 14:46 | 2026-07-29 | `fa328e3d01` |
| `documentation/archive/world-wp02/04_CAMPUS_GRYTHYTTAN.md` | 1677 | 2026-09-23 14:46 | 2026-07-29 | `1361cf7b57` |
| `documentation/archive/world-wp02/05_SEVILLA_PAVILION.md` | 1581 | 2026-09-23 14:46 | 2026-07-29 | `8a3957f1d8` |
| `documentation/archive/world-wp02/06_TRADITIONS_AND_CEREMONIES.md` | 1668 | 2026-09-23 14:46 | 2026-07-29 | `1dea836187` |
| `documentation/archive/world-wp02/07_THE_INITIATION.md` | 1776 | 2026-09-23 14:46 | 2026-07-29 | `d24f7e5160` |
| `documentation/archive/world-wp02/08_FIRST_HOUR_PLAYER_JOURNEY.md` | 1759 | 2026-09-23 14:46 | 2026-07-29 | `7f8e3f9749` |
| `documentation/archive/world-wp02/09_NPC_AND_PLAYER_GROUPS.md` | 1519 | 2026-09-23 14:46 | 2026-07-29 | `bcd8cac25d` |
| `documentation/archive/world-wp02/10_WP02_REVIEW_AND_HANDOFF.md` | 1356 | 2026-09-23 14:46 | 2026-07-29 | `e6b7444680` |
| `documentation/archive/world-wp02/WP02_REVIEW_REPORT.md` | 21571 | 2026-09-23 14:46 | 2026-07-29 | `bba89a23e6` |
| `documentation/blueprints/.gitkeep` | 0 | 2026-09-23 14:46 | 2026-07-19 | `da39a3ee5e` |
| `documentation/blueprints/M9_MEDGANG_REPORT_ORDER_089.md` | 23087 | 2026-09-23 14:46 | 2026-08-14 | `4666abe592` |
| `documentation/blueprints/MILSTOLPAR_MOT_SCHEMAT.md` | 8013 | 2026-09-23 14:46 | 2026-08-14 | `d4689952b1` |
| `documentation/blueprints/ORDER_130_KARTAN_MATS.md` | 12685 | 2026-09-23 14:46 | 2026-08-29 | `7d11fbc531` |
| `documentation/blueprints/ORDER_131_LOAD_SVEP.md` | 9881 | 2026-09-23 14:46 | 2026-08-30 | `6d8ae32c0b` |
| `documentation/blueprints/ORDER_133_VAGARNAS_BREDD.md` | 10705 | 2026-09-23 14:46 | 2026-08-30 | `66eb934fda` |
| `documentation/blueprints/ORDER_134_BIMODALITETEN.md` | 13058 | 2026-09-23 14:46 | 2026-08-30 | `ef8584cbf3` |
| `documentation/blueprints/ORDER_135_MATNING_VS_RENDERING.md` | 9584 | 2026-09-23 14:46 | 2026-08-30 | `1dd8e8c930` |
| `documentation/blueprints/ORDER_136_SMALARE_VAGAR_MATNING.md` | 12089 | 2026-09-23 14:46 | 2026-08-30 | `7da4bffdc4` |
| `documentation/blueprints/ORDER_145_SEATED_CAP_UTREDNING.md` | 6634 | 2026-09-23 14:46 | 2026-08-30 | `b0b2aa0ee6` |
| `documentation/blueprints/ORDER_146_OBSERVATION_OCH_DEVPANEL.md` | 9448 | 2026-09-23 14:46 | 2026-08-30 | `79cdf78ac3` |
| `documentation/blueprints/ORDER_224_VAD_SOM_UTLOSER_EN_FRAGA.md` | 28732 | 2026-09-23 14:46 | 2026-09-20 | `c025740886` |
| `documentation/blueprints/ORDER_227_ANKARMATNING.md` | 9242 | 2026-09-23 14:46 | 2026-09-20 | `089f6e321d` |
| `documentation/blueprints/ORDER_250_STAFF_MOVEMENT_MEASUREMENT.md` | 8758 | 2026-09-23 14:46 | 2026-09-22 | `52e1e48b7b` |
| `documentation/blueprints/R3_KUNSKAPSKAPITAL_REPORT_ORDER_092.md` | 41052 | 2026-09-23 14:46 | 2026-08-14 | `32029ae08e` |
| `documentation/blueprints/ROOM_DESIGN_QUESTION_2026-09-10.md` | 4030 | 2026-09-23 14:46 | 2026-09-10 | `1834faaf29` |
| `documentation/blueprints/SD003_MATGRIND_RAPPORT_ORDER_096.md` | 10574 | 2026-09-23 14:46 | 2026-08-28 | `5f89d43e4d` |
| `documentation/blueprints/STAFF_STATIONS_QUESTION_TILL_DESIGN.md` | 1014 | 2026-09-23 14:46 | 2026-09-10 | `7f5ca99414` |
| `documentation/blueprints/STATION_ROLE_MAPPING_QUESTION_2026-09-10.md` | 4218 | 2026-09-23 14:46 | 2026-09-10 | `9dfa6f167b` |
| `documentation/blueprints/STRATEGIC_TRACK_MILESTONES_PROPOSAL.md` | 58362 | 2026-09-23 14:46 | 2026-08-14 | `94ee30e6ef` |
| `documentation/blueprints/TASK_QUEUE_PROPOSAL_C_DRAFT.md` | 15203 | 2026-09-23 14:46 | 2026-09-13 | `520b96c0de` |
| `documentation/content/TOLV_GASTARKETYPER.md` | 4750 | 2026-09-23 14:46 | 2026-08-17 | `b587aa743a` |
| `documentation/content/questions/KALASTORGET_TIO_FRAGOR.md` | 7828 | 2026-09-23 14:46 | 2026-08-15 | `3053e242db` |
| `documentation/content/questions/TEATERN_SEX_FRAGOR.md` | 6261 | 2026-09-23 14:46 | 2026-08-15 | `bc9f78da2f` |
| `documentation/districts/D01-historic-centre/KNOWN_ISSUES.md` | 111 | 2026-09-23 14:46 | 2026-07-25 | `7643b0008c` |
| `documentation/districts/D01-historic-centre/README.md` | 1601 | 2026-09-23 14:46 | 2026-07-25 | `235c499ad7` |
| `documentation/districts/D01-historic-centre/REVIEWS.md` | 168 | 2026-09-23 14:46 | 2026-07-25 | `055487f522` |
| `documentation/districts/D01-historic-centre/TASKS.md` | 98 | 2026-09-23 14:46 | 2026-07-25 | `b4b98a2171` |
| `documentation/districts/D02-campus/KNOWN_ISSUES.md` | 111 | 2026-09-23 14:46 | 2026-07-25 | `7643b0008c` |
| `documentation/districts/D02-campus/README.md` | 1545 | 2026-09-23 14:46 | 2026-07-25 | `9a0917b942` |
| `documentation/districts/D02-campus/REVIEWS.md` | 168 | 2026-09-23 14:46 | 2026-07-25 | `055487f522` |
| `documentation/districts/D02-campus/TASKS.md` | 98 | 2026-09-23 14:46 | 2026-07-25 | `b4b98a2171` |
| `documentation/districts/D03-torget/CAMERA_PRESETS.md` | 2388 | 2026-09-23 14:46 | 2026-07-25 | `9e53e1e6af` |
| `documentation/districts/D03-torget/KNOWN_ISSUES.md` | 3209 | 2026-09-23 14:46 | 2026-07-25 | `10d9ebe8f4` |
| `documentation/districts/D03-torget/README.md` | 1754 | 2026-09-23 14:46 | 2026-07-25 | `d8a0769baa` |
| `documentation/districts/D03-torget/REVIEWS.md` | 499 | 2026-09-23 14:46 | 2026-07-25 | `5180bec66d` |
| `documentation/districts/D03-torget/TASKS.md` | 1989 | 2026-09-23 14:46 | 2026-07-25 | `764edb0cdd` |
| `documentation/districts/D04-church/KNOWN_ISSUES.md` | 111 | 2026-09-23 14:46 | 2026-07-25 | `7643b0008c` |
| `documentation/districts/D04-church/README.md` | 1410 | 2026-09-23 14:46 | 2026-07-25 | `11f91d5392` |
| `documentation/districts/D04-church/REVIEWS.md` | 168 | 2026-09-23 14:46 | 2026-07-25 | `055487f522` |
| `documentation/districts/D04-church/TASKS.md` | 98 | 2026-09-23 14:46 | 2026-07-25 | `b4b98a2171` |
| `documentation/districts/D05-station/KNOWN_ISSUES.md` | 111 | 2026-09-23 14:46 | 2026-07-25 | `7643b0008c` |
| `documentation/districts/D05-station/README.md` | 1524 | 2026-09-23 14:46 | 2026-07-25 | `b6e3a79d9a` |
| `documentation/districts/D05-station/REVIEWS.md` | 168 | 2026-09-23 14:46 | 2026-07-25 | `055487f522` |
| `documentation/districts/D05-station/TASKS.md` | 98 | 2026-09-23 14:46 | 2026-07-25 | `b4b98a2171` |
| `documentation/districts/D06-school/KNOWN_ISSUES.md` | 111 | 2026-09-23 14:46 | 2026-07-25 | `7643b0008c` |
| `documentation/districts/D06-school/README.md` | 1510 | 2026-09-23 14:46 | 2026-07-25 | `6886fc1d64` |
| `documentation/districts/D06-school/REVIEWS.md` | 168 | 2026-09-23 14:46 | 2026-07-25 | `055487f522` |
| `documentation/districts/D06-school/TASKS.md` | 98 | 2026-09-23 14:46 | 2026-07-25 | `b4b98a2171` |
| `documentation/districts/D07-industrial/KNOWN_ISSUES.md` | 111 | 2026-09-23 14:46 | 2026-07-25 | `7643b0008c` |
| `documentation/districts/D07-industrial/README.md` | 1321 | 2026-09-23 14:46 | 2026-07-25 | `670d438336` |
| `documentation/districts/D07-industrial/REVIEWS.md` | 168 | 2026-09-23 14:46 | 2026-07-25 | `055487f522` |
| `documentation/districts/D07-industrial/TASKS.md` | 98 | 2026-09-23 14:46 | 2026-07-25 | `b4b98a2171` |
| `documentation/districts/D08-halleforsvagen/KNOWN_ISSUES.md` | 111 | 2026-09-23 14:46 | 2026-07-25 | `7643b0008c` |
| `documentation/districts/D08-halleforsvagen/README.md` | 1676 | 2026-09-23 14:46 | 2026-07-25 | `cc8c534be2` |
| `documentation/districts/D08-halleforsvagen/REVIEWS.md` | 168 | 2026-09-23 14:46 | 2026-07-25 | `055487f522` |
| `documentation/districts/D08-halleforsvagen/TASKS.md` | 98 | 2026-09-23 14:46 | 2026-07-25 | `b4b98a2171` |
| `documentation/districts/D09-prastgatan/KNOWN_ISSUES.md` | 111 | 2026-09-23 14:46 | 2026-07-25 | `7643b0008c` |
| `documentation/districts/D09-prastgatan/README.md` | 1374 | 2026-09-23 14:46 | 2026-07-25 | `0bc033d973` |
| `documentation/districts/D09-prastgatan/REVIEWS.md` | 168 | 2026-09-23 14:46 | 2026-07-25 | `055487f522` |
| `documentation/districts/D09-prastgatan/TASKS.md` | 98 | 2026-09-23 14:46 | 2026-07-25 | `b4b98a2171` |
| `documentation/districts/D10-residential-north/KNOWN_ISSUES.md` | 111 | 2026-09-23 14:46 | 2026-07-25 | `7643b0008c` |
| `documentation/districts/D10-residential-north/README.md` | 1466 | 2026-09-23 14:46 | 2026-07-25 | `d73cb15287` |
| `documentation/districts/D10-residential-north/REVIEWS.md` | 168 | 2026-09-23 14:46 | 2026-07-25 | `055487f522` |
| `documentation/districts/D10-residential-north/TASKS.md` | 98 | 2026-09-23 14:46 | 2026-07-25 | `b4b98a2171` |
| `documentation/districts/D11-residential-south/KNOWN_ISSUES.md` | 111 | 2026-09-23 14:46 | 2026-07-25 | `7643b0008c` |
| `documentation/districts/D11-residential-south/README.md` | 1358 | 2026-09-23 14:46 | 2026-07-25 | `b53a278ec3` |
| `documentation/districts/D11-residential-south/REVIEWS.md` | 168 | 2026-09-23 14:46 | 2026-07-25 | `055487f522` |
| `documentation/districts/D11-residential-south/TASKS.md` | 98 | 2026-09-23 14:46 | 2026-07-25 | `b4b98a2171` |
| `documentation/districts/D12-residential-east/KNOWN_ISSUES.md` | 111 | 2026-09-23 14:46 | 2026-07-25 | `7643b0008c` |
| `documentation/districts/D12-residential-east/README.md` | 1401 | 2026-09-23 14:46 | 2026-07-25 | `90b1e52448` |
| `documentation/districts/D12-residential-east/REVIEWS.md` | 168 | 2026-09-23 14:46 | 2026-07-25 | `055487f522` |
| `documentation/districts/D12-residential-east/TASKS.md` | 98 | 2026-09-23 14:46 | 2026-07-25 | `b4b98a2171` |
| `documentation/districts/D13-residential-west/KNOWN_ISSUES.md` | 111 | 2026-09-23 14:46 | 2026-07-25 | `7643b0008c` |
| `documentation/districts/D13-residential-west/README.md` | 1616 | 2026-09-23 14:46 | 2026-07-25 | `bd7e3f3558` |
| `documentation/districts/D13-residential-west/REVIEWS.md` | 168 | 2026-09-23 14:46 | 2026-07-25 | `055487f522` |
| `documentation/districts/D13-residential-west/TASKS.md` | 98 | 2026-09-23 14:46 | 2026-07-25 | `b4b98a2171` |
| `documentation/districts/D14-lakeshore/KNOWN_ISSUES.md` | 111 | 2026-09-23 14:46 | 2026-07-25 | `7643b0008c` |
| `documentation/districts/D14-lakeshore/README.md` | 1382 | 2026-09-23 14:46 | 2026-07-25 | `0a3b1039d4` |
| `documentation/districts/D14-lakeshore/REVIEWS.md` | 168 | 2026-09-23 14:46 | 2026-07-25 | `055487f522` |
| `documentation/districts/D14-lakeshore/TASKS.md` | 98 | 2026-09-23 14:46 | 2026-07-25 | `b4b98a2171` |
| `documentation/districts/D15-forest-edge/KNOWN_ISSUES.md` | 111 | 2026-09-23 14:46 | 2026-07-25 | `7643b0008c` |
| `documentation/districts/D15-forest-edge/README.md` | 1739 | 2026-09-23 14:46 | 2026-07-25 | `40351acf19` |
| `documentation/districts/D15-forest-edge/REVIEWS.md` | 168 | 2026-09-23 14:46 | 2026-07-25 | `055487f522` |
| `documentation/districts/D15-forest-edge/TASKS.md` | 98 | 2026-09-23 14:46 | 2026-07-25 | `b4b98a2171` |
| `documentation/foundation/.gitkeep` | 0 | 2026-09-23 14:46 | 2026-07-19 | `da39a3ee5e` |
| `documentation/foundation/DESIGN_DECISIONS_001.md` | 23063 | 2026-09-23 14:46 | 2026-07-28 | `eaeab475b1` |
| `documentation/foundation/EXECUTIVE_DESIGN_DIRECTIVE_001.md` | 9406 | 2026-09-23 14:46 | 2026-07-28 | `2dcadc1d34` |
| `documentation/foundation/RIGHTS_REGISTER.md` | 8950 | 2026-09-23 14:46 | 2026-07-29 | `be8ec28e0e` |
| `documentation/foundation/SD_001_RECONSTRUCTION_RECORD.md` | 15138 | 2026-09-23 14:46 | 2026-07-29 | `96e0e77dd1` |
| `documentation/foundation/SUPERSEDING_DIRECTIVE_002.md` | 7794 | 2026-09-23 14:46 | 2026-07-29 | `648d7ed517` |
| `documentation/foundation/SUPERSEDING_DIRECTIVE_003.md` | 5335 | 2026-09-23 14:46 | 2026-07-30 | `706de6381b` |
| `documentation/foundation/SUPERSEDING_DIRECTIVE_004.md` | 7297 | 2026-09-23 14:46 | 2026-08-30 | `1cf90ab805` |
| `documentation/foundation/vision/ORDER_100_VISION.md` | 8843 | 2026-09-23 14:46 | 2026-07-29 | `939af9faba` |
| `documentation/foundation/vision/SPELSLINGAN_SCHEMAT.md` | 5474 | 2026-09-23 14:46 | 2026-08-14 | `251a5eb7a7` |
| `documentation/foundation/vision/UTKAST_SEX_VERKSAMHETSKLASSER.md` | 11290 | 2026-09-23 14:46 | 2026-09-20 | `4ceb304791` |
| `documentation/foundation/vision/UTKAST_VERKSAMHETSKLASSER.md` | 4022 | 2026-09-23 14:46 | 2026-08-29 | `f2f2d5ead9` |
| `documentation/foundation/vision/content/FRAGORNA_TILL_PAVILJONGERNA.md` | 4380 | 2026-09-23 14:46 | 2026-09-23 | `109a534a76` |
| `documentation/foundation/vision/content/PAVILJONGFRAGOR_BRONS.md` | 31600 | 2026-09-23 14:46 | 2026-09-23 | `9738dd5750` |
| `documentation/game-design/.gitkeep` | 0 | 2026-09-23 14:46 | 2026-07-19 | `da39a3ee5e` |
| `documentation/game-design/CAMERA_AND_GAMEPLAY_BIBLE.md` | 15917 | 2026-09-23 14:46 | 2026-07-29 | `4b60796461` |
| `documentation/game-design/CAMERA_AND_VIEW_SYSTEM.md` | 7131 | 2026-09-23 14:46 | 2026-07-29 | `2d04583361` |
| `documentation/game-design/GRYTHYTTAN_WORLD_SPECIFICATION.md` | 22076 | 2026-09-23 14:46 | 2026-07-29 | `74ece0b87f` |
| `documentation/game-design/LEARNING_AND_SCENARIO_ARCHITECTURE.md` | 19632 | 2026-09-23 14:46 | 2026-07-30 | `cea8a92817` |
| `documentation/game-design/MALTIDENS_HUS_EDUCATIONAL_ARCHITECTURE.md` | 56845 | 2026-09-23 14:46 | 2026-07-29 | `6a0eb04996` |
| `documentation/game-design/NEXUS_GAMEPLAY_FRAMEWORK.md` | 41265 | 2026-09-23 14:46 | 2026-07-28 | `94a3f13579` |
| `documentation/game-design/UNDERLAG_003_MEASUREMENTS.md` | 17206 | 2026-09-23 14:46 | 2026-08-14 | `f44ef48c8b` |
| `documentation/orders/ORDER_053_SKALA_KAMERA_ASSETPOLICY.md` | 5480 | 2026-09-23 14:46 | 2026-08-12 | `450c45f1e0` |
| `documentation/orders/ORDER_060_WALL_WINDING_FIX.md` | 5653 | 2026-09-23 14:46 | 2026-08-12 | `7ba766251d` |
| `documentation/prototypes/staff-guest-reel-extended/.thumbnail` | 13580 | 2026-09-23 14:46 | 2026-08-14 | `aba5303e73` |
| `documentation/prototypes/staff-guest-reel-extended/Guest Animation Reel.dc.html` | 1750 | 2026-09-23 14:46 | 2026-08-14 | `a06cb5632b` |
| `documentation/prototypes/staff-guest-reel-extended/Matsalen - i kontext.dc.html` | 17639 | 2026-09-23 14:46 | 2026-08-14 | `41305b7172` |
| `documentation/prototypes/staff-guest-reel-extended/Personal - perspektiv och rörelser.dc.html` | 70968 | 2026-09-23 14:46 | 2026-08-14 | `45665a90b4` |
| `documentation/prototypes/staff-guest-reel-extended/StaffFace.dc.html` | 4990 | 2026-09-23 14:46 | 2026-08-14 | `b1680a63a7` |
| `documentation/prototypes/staff-guest-reel-extended/StaffPuck.dc.html` | 4943 | 2026-09-23 14:46 | 2026-08-14 | `229bbd913a` |
| `documentation/prototypes/staff-guest-reel-extended/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_adherence.oxlintrc.json` | 4002 | 2026-09-23 14:46 | 2026-08-14 | `dabf86ad7d` |
| `documentation/prototypes/staff-guest-reel-extended/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_bundle.js` | 303 | 2026-09-23 14:46 | 2026-08-14 | `5e4ccabaa0` |
| `documentation/prototypes/staff-guest-reel-extended/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_manifest.json` | 7247 | 2026-09-23 14:46 | 2026-08-14 | `7437c3a696` |
| `documentation/prototypes/staff-guest-reel-extended/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/readme.md` | 7376 | 2026-09-23 14:46 | 2026-08-14 | `1082b4d77e` |
| `documentation/prototypes/staff-guest-reel-extended/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/styles.css` | 10555 | 2026-09-23 14:46 | 2026-08-14 | `a303340a2f` |
| `documentation/prototypes/staff-guest-reel-extended/animations-v3.jsx` | 55474 | 2026-09-23 14:46 | 2026-08-14 | `42f45bebc1` |
| `documentation/prototypes/staff-guest-reel-extended/github.md` | 1553 | 2026-09-23 14:46 | 2026-08-14 | `5ac6f2b992` |
| `documentation/prototypes/staff-guest-reel-extended/guest-reel.jsx` | 19356 | 2026-09-23 14:46 | 2026-08-14 | `9f7df24e4d` |
| `documentation/prototypes/staff-guest-reel-extended/support.js` | 69150 | 2026-09-23 14:46 | 2026-08-14 | `2e38395c4a` |
| `documentation/prototypes/staff-guest-reel-extended/tweaks-panel.jsx` | 25439 | 2026-09-23 14:46 | 2026-08-14 | `2278b6c8a3` |
| `documentation/prototypes/staff-guest-reel/.thumbnail` | 6340 | 2026-09-23 14:46 | 2026-08-14 | `9637ab0107` |
| `documentation/prototypes/staff-guest-reel/Guest Animation Reel.dc.html` | 1750 | 2026-09-23 14:46 | 2026-08-14 | `a06cb5632b` |
| `documentation/prototypes/staff-guest-reel/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_adherence.oxlintrc.json` | 4002 | 2026-09-23 14:46 | 2026-08-14 | `dabf86ad7d` |
| `documentation/prototypes/staff-guest-reel/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_bundle.js` | 303 | 2026-09-23 14:46 | 2026-08-14 | `5e4ccabaa0` |
| `documentation/prototypes/staff-guest-reel/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_manifest.json` | 7247 | 2026-09-23 14:46 | 2026-08-14 | `7437c3a696` |
| `documentation/prototypes/staff-guest-reel/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/readme.md` | 7376 | 2026-09-23 14:46 | 2026-08-14 | `1082b4d77e` |
| `documentation/prototypes/staff-guest-reel/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/styles.css` | 10555 | 2026-09-23 14:46 | 2026-08-14 | `a303340a2f` |
| `documentation/prototypes/staff-guest-reel/animations-v3.jsx` | 55474 | 2026-09-23 14:46 | 2026-08-14 | `42f45bebc1` |
| `documentation/prototypes/staff-guest-reel/guest-reel.jsx` | 19293 | 2026-09-23 14:46 | 2026-08-14 | `e1fe3af42b` |
| `documentation/prototypes/staff-guest-reel/support.js` | 69150 | 2026-09-23 14:46 | 2026-08-14 | `2e38395c4a` |
| `documentation/prototypes/staff-guest-reel/tweaks-panel.jsx` | 25439 | 2026-09-23 14:46 | 2026-08-14 | `2278b6c8a3` |
| `documentation/references/README.md` | 4010 | 2026-09-23 14:46 | 2026-07-29 | `5b0a2e96fd` |
| `documentation/references/district-1/gastgivaregard/manifest.json` | 7109 | 2026-09-23 14:46 | 2026-07-29 | `94bf3d0c8f` |
| `documentation/references/district-1/gastgivaregard/uploaded/gästgibveriet på prästgatan.jpeg` | 27331 | 2026-09-23 14:46 | 2026-07-29 | `ae8a3069fb` |
| `documentation/references/district-1/gastgivaregard/uploaded/gästgiveriet 4.jpeg` | 18757 | 2026-09-23 14:46 | 2026-07-29 | `4a70898608` |
| `documentation/references/district-1/gastgivaregard/uploaded/gästgiveriet.jpeg` | 46114 | 2026-09-23 14:46 | 2026-07-29 | `d68aac386a` |
| `documentation/references/district-1/gastgivaregard/uploaded/gästgiveriet3.jpeg` | 36036 | 2026-09-23 14:46 | 2026-07-29 | `bff939c27e` |
| `documentation/references/district-1/guldkringlan/manifest.json` | 4516 | 2026-09-23 14:46 | 2026-07-29 | `6bd7a809df` |
| `documentation/references/district-1/guldkringlan/uploaded/guldkringlan vid torget.avif` | 116765 | 2026-09-23 14:46 | 2026-07-28 | `45d959b3fb` |
| `documentation/references/district-1/guldkringlan/uploaded/guldkringlan vid torget.jpg` | 264716 | 2026-09-23 14:46 | 2026-07-28 | `8d56ef9709` |
| `documentation/references/district-1/guldkringlan/uploaded/guldkringlan2.jpg` | 357756 | 2026-09-23 14:46 | 2026-07-28 | `d4e8382295` |
| `documentation/references/district-1/kyrka/manifest.json` | 6324 | 2026-09-23 14:46 | 2026-07-30 | `587e23ee0a` |
| `documentation/references/district-1/kyrka/uploaded/kyrkan.jpeg` | 38462 | 2026-09-23 14:46 | 2026-07-29 | `761e94a4e5` |
| `documentation/references/district-1/kyrka/uploaded/kyrkan.jpg` | 232904 | 2026-09-23 14:46 | 2026-07-29 | `2cfff7a223` |
| `documentation/references/district-1/kyrka/uploaded/kyrkan2.jpeg` | 37562 | 2026-09-23 14:46 | 2026-07-29 | `2d520cf885` |
| `documentation/references/district-1/kyrka/uploaded/render-2026-07-30-church-occlusion.png` | 96308 | 2026-09-23 14:46 | 2026-07-30 | `37c1f54dee` |
| `documentation/references/district-1/maltidenshus/manifest.json` | 7797 | 2026-09-23 14:46 | 2026-07-29 | `c216ef14e6` |
| `documentation/references/district-1/maltidenshus/uploaded/maltidens-hus-i-norden 1.jpg` | 341343 | 2026-09-23 14:46 | 2026-07-29 | `878df97ee7` |
| `documentation/references/district-1/maltidenshus/uploaded/maltidens-hus-i-norden2.jpg` | 375916 | 2026-09-23 14:46 | 2026-07-29 | `fe58b6e07a` |
| `documentation/references/district-1/maltidenshus/uploaded/maltidens-hus-i-norden3.jpg` | 372977 | 2026-09-23 14:46 | 2026-07-29 | `16934250e9` |
| `documentation/references/district-1/torget/manifest.json` | 5526 | 2026-09-23 14:46 | 2026-07-29 | `a02d2ac454` |
| `documentation/references/district-1/torget/uploaded/torget 3.jpg` | 148450 | 2026-09-23 14:46 | 2026-07-29 | `b976f23576` |
| `documentation/references/district-1/torget/uploaded/torget.jpeg` | 37016 | 2026-09-23 14:46 | 2026-07-29 | `10eb241c9d` |
| `documentation/references/district-1/torget/uploaded/torget2.jpeg` | 56125 | 2026-09-23 14:46 | 2026-07-29 | `a78f6faf30` |
| `documentation/references/district-2/campus-surroundings/manifest.json` | 1477 | 2026-09-23 14:46 | 2026-07-24 | `23d4df1c2a` |
| `documentation/references/district-2/campus-surroundings/notes.md` | 2323 | 2026-09-23 14:46 | 2026-07-24 | `3f79a9d36f` |
| `documentation/references/district-2/karnhuset/manifest.json` | 2443 | 2026-09-23 14:46 | 2026-07-24 | `11480734cb` |
| `documentation/references/district-2/karnhuset/notes.md` | 4341 | 2026-09-23 14:46 | 2026-07-24 | `6b3a28ec23` |
| `documentation/references/district-2/karnhuset/urls.md` | 4577 | 2026-09-23 14:46 | 2026-07-24 | `589d9381dc` |
| `documentation/references/district-2/school-complex/manifest.json` | 2695 | 2026-09-23 14:46 | 2026-07-24 | `c6cd54b41b` |
| `documentation/references/district-2/school-complex/notes.md` | 4701 | 2026-09-23 14:46 | 2026-07-24 | `2ab77f7670` |
| `documentation/references/district-2/station-corridor/manifest.json` | 5139 | 2026-09-23 14:46 | 2026-07-29 | `76c735afe1` |
| `documentation/references/district-2/station-corridor/notes.md` | 5305 | 2026-09-23 14:46 | 2026-07-24 | `c45d96b427` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-20 kl. 00.28.35.png` | 870246 | 2026-09-23 14:46 | 2026-07-28 | `98db6d8dc1` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-23 kl. 12.59.55.png` | 679579 | 2026-09-23 14:46 | 2026-07-28 | `0571e6a045` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-23 kl. 13.00.06.png` | 677058 | 2026-09-23 14:46 | 2026-07-28 | `b4c143810d` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-24 kl. 17.06.04 1.png` | 1793066 | 2026-09-23 14:46 | 2026-07-28 | `357068e8bc` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-24 kl. 17.06.04.png` | 1792290 | 2026-09-23 14:46 | 2026-07-28 | `d91a9bb31b` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-24 kl. 17.06.51.png` | 1532336 | 2026-09-23 14:46 | 2026-07-28 | `eeb3a283c6` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 15.26.52.png` | 1316895 | 2026-09-23 14:46 | 2026-07-28 | `1b3943e1b5` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 15.53.31.png` | 5805634 | 2026-09-23 14:46 | 2026-07-28 | `cfd416d5e6` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 15.56.25.png` | 4835727 | 2026-09-23 14:46 | 2026-07-28 | `70570fa48a` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 15.56.43.png` | 4634542 | 2026-09-23 14:46 | 2026-07-28 | `04614f9400` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 15.56.59.png` | 5016220 | 2026-09-23 14:46 | 2026-07-28 | `f77c36a369` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 15.57.12.png` | 4693022 | 2026-09-23 14:46 | 2026-07-28 | `4e0e945d79` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 15.57.24.png` | 4135055 | 2026-09-23 14:46 | 2026-07-28 | `25874ff27a` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 15.57.40.png` | 4638695 | 2026-09-23 14:46 | 2026-07-28 | `2ae661b3cf` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 15.57.54.png` | 4846820 | 2026-09-23 14:46 | 2026-07-28 | `701b0d6a64` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 15.58.12.png` | 4546511 | 2026-09-23 14:46 | 2026-07-28 | `e16d09a0cc` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 15.58.29.png` | 5480084 | 2026-09-23 14:46 | 2026-07-28 | `1f8e0fb288` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 15.59.26.png` | 4721413 | 2026-09-23 14:46 | 2026-07-28 | `1a62ee2da3` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 15.59.53.png` | 4900908 | 2026-09-23 14:46 | 2026-07-28 | `5af26e6b8d` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.00.08.png` | 4615885 | 2026-09-23 14:46 | 2026-07-28 | `cbdd7eb257` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.00.16.png` | 4899756 | 2026-09-23 14:46 | 2026-07-28 | `cc390964db` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.00.26.png` | 5007013 | 2026-09-23 14:46 | 2026-07-28 | `9e2408743a` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.00.38.png` | 4614079 | 2026-09-23 14:46 | 2026-07-28 | `4a08856441` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.01.07.png` | 5587602 | 2026-09-23 14:46 | 2026-07-28 | `a72b3f39a6` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.01.24.png` | 5969180 | 2026-09-23 14:46 | 2026-07-28 | `aa6995e6c6` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.01.34.png` | 6031777 | 2026-09-23 14:46 | 2026-07-28 | `7f50db37ef` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.01.41.png` | 5796911 | 2026-09-23 14:46 | 2026-07-28 | `f782f81d0e` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.01.55.png` | 5890775 | 2026-09-23 14:46 | 2026-07-28 | `bbf74418b5` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.02.04.png` | 5454701 | 2026-09-23 14:46 | 2026-07-28 | `9507bbb899` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.02.12.png` | 5745607 | 2026-09-23 14:46 | 2026-07-28 | `494a5d00e0` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.02.23.png` | 5073410 | 2026-09-23 14:46 | 2026-07-28 | `c4473543e9` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.02.33.png` | 5009145 | 2026-09-23 14:46 | 2026-07-28 | `69b277ec02` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.02.46.png` | 5116645 | 2026-09-23 14:46 | 2026-07-28 | `c380509af5` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.03.00.png` | 5524607 | 2026-09-23 14:46 | 2026-07-28 | `40b74b1921` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.03.11.png` | 4755714 | 2026-09-23 14:46 | 2026-07-28 | `5d8ef61bf6` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.03.28.png` | 4664421 | 2026-09-23 14:46 | 2026-07-28 | `0edd5b9ccd` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.04.26.png` | 4441380 | 2026-09-23 14:46 | 2026-07-28 | `b563138be4` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.04.39.png` | 5244275 | 2026-09-23 14:46 | 2026-07-28 | `e27739bb35` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.04.54.png` | 6179307 | 2026-09-23 14:46 | 2026-07-28 | `2732c7754c` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.05.08.png` | 4603686 | 2026-09-23 14:46 | 2026-07-28 | `8451cb7936` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.05.23.png` | 4789327 | 2026-09-23 14:46 | 2026-07-28 | `47fdeb0b35` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.05.36.png` | 5417103 | 2026-09-23 14:46 | 2026-07-28 | `7d0bcf54a0` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.05.46.png` | 5721136 | 2026-09-23 14:46 | 2026-07-28 | `81d83981c4` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.05.58.png` | 4684920 | 2026-09-23 14:46 | 2026-07-28 | `ae77b5b37c` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.06.16.png` | 4410144 | 2026-09-23 14:46 | 2026-07-28 | `4953c0d1d3` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.06.26.png` | 5612912 | 2026-09-23 14:46 | 2026-07-28 | `d4238c98d8` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.06.32.png` | 4917030 | 2026-09-23 14:46 | 2026-07-28 | `237c758cf9` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.06.43.png` | 5058641 | 2026-09-23 14:46 | 2026-07-28 | `1fb4f1f1eb` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.06.52.png` | 5522441 | 2026-09-23 14:46 | 2026-07-28 | `6814027ba3` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.07.01.png` | 5650328 | 2026-09-23 14:46 | 2026-07-28 | `debbf7dff4` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.07.09.png` | 5716728 | 2026-09-23 14:46 | 2026-07-28 | `230306ca2a` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.07.17.png` | 5691496 | 2026-09-23 14:46 | 2026-07-28 | `cdbf156fdd` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.07.30.png` | 5511013 | 2026-09-23 14:46 | 2026-07-28 | `c13f91afa6` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.07.42.png` | 5336608 | 2026-09-23 14:46 | 2026-07-28 | `295f69a409` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.07.54.png` | 5704358 | 2026-09-23 14:46 | 2026-07-28 | `58de49f7c1` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.08.08.png` | 5201373 | 2026-09-23 14:46 | 2026-07-28 | `f430a2e995` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.08.18.png` | 4866607 | 2026-09-23 14:46 | 2026-07-28 | `f02f08ba2b` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.08.33.png` | 4856279 | 2026-09-23 14:46 | 2026-07-28 | `a3fec87e01` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.08.40.png` | 4387675 | 2026-09-23 14:46 | 2026-07-28 | `bc147a3e5c` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.08.50.png` | 1569590 | 2026-09-23 14:46 | 2026-07-28 | `90aa9ad5f2` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.09.06.png` | 5359281 | 2026-09-23 14:46 | 2026-07-28 | `7322f0cb7f` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.09.17.png` | 4847658 | 2026-09-23 14:46 | 2026-07-28 | `fb26df1a13` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.09.26.png` | 4843156 | 2026-09-23 14:46 | 2026-07-28 | `71d34de58e` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.09.35.png` | 4777340 | 2026-09-23 14:46 | 2026-07-28 | `74ad8852e3` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.10.00.png` | 6013613 | 2026-09-23 14:46 | 2026-07-28 | `8d1b87a449` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.10.10.png` | 5935337 | 2026-09-23 14:46 | 2026-07-28 | `cb20c63dcc` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.10.27.png` | 5275117 | 2026-09-23 14:46 | 2026-07-28 | `b1a44a8a0b` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.10.38.png` | 5189915 | 2026-09-23 14:46 | 2026-07-28 | `4ffc77d810` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.11.01.png` | 5745646 | 2026-09-23 14:46 | 2026-07-28 | `f090b38d80` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.11.23.png` | 5131910 | 2026-09-23 14:46 | 2026-07-28 | `d0c07ecc26` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.11.33.png` | 5144954 | 2026-09-23 14:46 | 2026-07-28 | `e0b7f3ebfa` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.11.42.png` | 5462178 | 2026-09-23 14:46 | 2026-07-28 | `44203d39b3` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.12.06.png` | 4748155 | 2026-09-23 14:46 | 2026-07-28 | `f223479dcf` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.12.30.png` | 4711330 | 2026-09-23 14:46 | 2026-07-28 | `6824df5546` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.12.42.png` | 4817593 | 2026-09-23 14:46 | 2026-07-28 | `12b3040175` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.12.52.png` | 4768561 | 2026-09-23 14:46 | 2026-07-28 | `0e457c2822` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.13.59.png` | 5124610 | 2026-09-23 14:46 | 2026-07-28 | `0641160b94` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.14.04.png` | 5302549 | 2026-09-23 14:46 | 2026-07-28 | `7a15e059cd` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.15.09.png` | 6096635 | 2026-09-23 14:46 | 2026-07-28 | `2e1a313aa7` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.15.16.png` | 4860914 | 2026-09-23 14:46 | 2026-07-28 | `ffb41e8286` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.28.28.png` | 4963698 | 2026-09-23 14:46 | 2026-07-28 | `1c46535da7` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.29.01.png` | 5142100 | 2026-09-23 14:46 | 2026-07-28 | `4626c5a936` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.29.30.png` | 4527666 | 2026-09-23 14:46 | 2026-07-28 | `9d36213871` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.29.42.png` | 4843096 | 2026-09-23 14:46 | 2026-07-28 | `ac5a0f4b70` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.29.52.png` | 5375094 | 2026-09-23 14:46 | 2026-07-28 | `a804a835fc` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.30.15.png` | 5880216 | 2026-09-23 14:46 | 2026-07-28 | `e4eae2ead8` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.30.29.png` | 5833110 | 2026-09-23 14:46 | 2026-07-28 | `d644dce7a8` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.30.54.png` | 6502552 | 2026-09-23 14:46 | 2026-07-28 | `efa2cba010` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.31.03.png` | 5316544 | 2026-09-23 14:46 | 2026-07-28 | `0e247a0298` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 16.31.11.png` | 4734022 | 2026-09-23 14:46 | 2026-07-28 | `601f7e6e4d` |
| `documentation/references/grythyttan bilder/Skärmavbild 2026-07-26 kl. 21.13.48.png` | 7872550 | 2026-09-23 14:46 | 2026-07-28 | `ced15f7e69` |
| `documentation/references/grythyttan bilder/TRIAGE.md` | 10394 | 2026-09-23 14:46 | 2026-07-28 | `bdea993119` |
| `documentation/references/order040-s4-category-b-overview-2026-07-30.jpg` | 930238 | 2026-09-23 14:46 | 2026-07-30 | `d5c212faf4` |
| `documentation/references/order042-s3.1-w869907975-verify-2026-07-30.jpg` | 50229 | 2026-09-23 14:46 | 2026-07-30 | `6d4e4d25a3` |
| `documentation/references/rv244-aerial-verification-2026-07-30.png` | 1707319 | 2026-09-23 14:46 | 2026-07-30 | `0b427d29c8` |
| `documentation/world/.gitkeep` | 0 | 2026-09-23 14:46 | 2026-07-19 | `da39a3ee5e` |
| `documentation/world/APPROXIMATION_REGISTER.md` | 118442 | 2026-09-23 14:46 | 2026-08-12 | `daccace7ff` |

### frontend (3 filer)

| Sökväg | Storlek (B) | Ändrad (fs) | Senaste commit | SHA-1 (10) |
|---|---:|---|---|---|
| `frontend/DEPLOY.md` | 7341 | 2026-09-23 14:46 | 2026-09-20 | `66f2c64086` |
| `frontend/README.md` | 1966 | 2026-09-23 14:46 | 2026-07-19 | `de7259c301` |
| `frontend/public/assets/characters/LICENSE.md` | 6915 | 2026-09-23 14:46 | 2026-08-12 | `0f294edc12` |

### handoff (13 filer)

| Sökväg | Storlek (B) | Ändrad (fs) | Senaste commit | SHA-1 (10) |
|---|---:|---|---|---|
| `handoff/ORDER-gaster-och-personal.md` | 4001 | 2026-09-23 14:46 | 2026-08-29 | `841cea2d5f` |
| `handoff/ORDER-olkrogen-brief.md` | 3639 | 2026-09-23 14:46 | 2026-08-29 | `d3eb43743a` |
| `handoff/brewpubRoom.ts` | 35113 | 2026-09-23 14:46 | 2026-08-29 | `408e2a1ece` |
| `handoff/businessRoom.ts` | 13775 | 2026-09-23 14:46 | 2026-08-30 | `f8c0502f66` |
| `handoff/figureProps.ts` | 30148 | 2026-09-23 14:46 | 2026-08-30 | `2fc3644269` |
| `handoff/figureRig.ts` | 29800 | 2026-09-23 14:46 | 2026-08-30 | `a774451c0b` |
| `handoff/foodTruckRoom.ts` | 52526 | 2026-09-23 14:46 | 2026-08-30 | `8579b797fb` |
| `handoff/innRoom.ts` | 66020 | 2026-09-23 14:46 | 2026-08-30 | `bbf60fc09f` |
| `handoff/nightClubRoom.ts` | 44910 | 2026-09-23 14:46 | 2026-08-30 | `c0b0b88466` |
| `handoff/restaurantRoom.ts` | 39433 | 2026-09-23 14:46 | 2026-08-30 | `914c32f101` |
| `handoff/serviceScore.ts` | 58782 | 2026-09-23 14:46 | 2026-09-23 | `0b54fa7f32` |
| `handoff/silhouetteContrast.zones.ts` | 11996 | 2026-09-23 14:46 | 2026-08-30 | `7e861f5caf` |
| `handoff/wineBarRoom.ts` | 43124 | 2026-09-23 14:46 | 2026-08-30 | `43f5bf42fb` |

### leverans (11 filer)

| Sökväg | Storlek (B) | Ändrad (fs) | Senaste commit | SHA-1 (10) |
|---|---:|---|---|---|
| `leverans/LEVERANS.md` | 9000 | 2026-09-23 14:46 | 2026-09-23 | `f5815a461a` |
| `leverans/brewpubRoom.ts` | 35113 | 2026-09-23 14:46 | 2026-09-23 | `408e2a1ece` |
| `leverans/businessRoom.ts` | 12001 | 2026-09-23 14:46 | 2026-09-23 | `7142a8108f` |
| `leverans/figureProps.ts` | 30148 | 2026-09-23 14:46 | 2026-09-23 | `2fc3644269` |
| `leverans/figureRig.ts` | 29800 | 2026-09-23 14:46 | 2026-09-23 | `a774451c0b` |
| `leverans/foodTruckRoom.ts` | 52526 | 2026-09-23 14:46 | 2026-09-23 | `8579b797fb` |
| `leverans/innRoom.ts` | 66020 | 2026-09-23 14:46 | 2026-09-23 | `bbf60fc09f` |
| `leverans/nightClubRoom.ts` | 44719 | 2026-09-23 14:46 | 2026-09-23 | `f85a085042` |
| `leverans/restaurantRoom.ts` | 39433 | 2026-09-23 14:46 | 2026-09-23 | `914c32f101` |
| `leverans/silhouetteContrast.zones.ts` | 11996 | 2026-09-23 14:46 | 2026-09-23 | `7e861f5caf` |
| `leverans/wineBarRoom.ts` | 43124 | 2026-09-23 14:46 | 2026-09-23 | `43f5bf42fb` |

### leverans-servicekoreografin (5 filer)

| Sökväg | Storlek (B) | Ändrad (fs) | Senaste commit | SHA-1 (10) |
|---|---:|---|---|---|
| `leverans-servicekoreografin/FRAGOR till Claude Code.md` | 12824 | 2026-09-23 14:46 | 2026-09-23 | `c60e4def6a` |
| `leverans-servicekoreografin/LEVERANSNOT.md` | 6476 | 2026-09-23 14:46 | 2026-09-23 | `ad460f7480` |
| `leverans-servicekoreografin/README.md` | 3237 | 2026-09-23 14:46 | 2026-09-23 | `97e8700c74` |
| `leverans-servicekoreografin/Servicekoreografin.html` | 675187 | 2026-09-23 14:46 | 2026-09-23 | `e67691ab28` |
| `leverans-servicekoreografin/serviceScore.ts` | 58782 | 2026-09-23 14:46 | 2026-09-23 | `0b54fa7f32` |

### nexus-design-2026-08-30-1245 (12 filer)

| Sökväg | Storlek (B) | Ändrad (fs) | Senaste commit | SHA-1 (10) |
|---|---:|---|---|---|
| `nexus-design-2026-08-30-1245/LEVERANS.md` | 4767 | 2026-09-23 14:46 | 2026-09-23 | `5e5807af2d` |
| `nexus-design-2026-08-30-1245/LEVERANSNOT.md` | 14021 | 2026-09-23 14:46 | 2026-09-23 | `abfa0fbc2e` |
| `nexus-design-2026-08-30-1245/brewpubRoom.ts` | 35113 | 2026-09-23 14:46 | 2026-09-23 | `408e2a1ece` |
| `nexus-design-2026-08-30-1245/businessRoom.ts` | 13775 | 2026-09-23 14:46 | 2026-09-23 | `f8c0502f66` |
| `nexus-design-2026-08-30-1245/figureProps.ts` | 30148 | 2026-09-23 14:46 | 2026-09-23 | `2fc3644269` |
| `nexus-design-2026-08-30-1245/figureRig.ts` | 29800 | 2026-09-23 14:46 | 2026-09-23 | `a774451c0b` |
| `nexus-design-2026-08-30-1245/foodTruckRoom.ts` | 52526 | 2026-09-23 14:46 | 2026-09-23 | `8579b797fb` |
| `nexus-design-2026-08-30-1245/innRoom.ts` | 66020 | 2026-09-23 14:46 | 2026-09-23 | `bbf60fc09f` |
| `nexus-design-2026-08-30-1245/nightClubRoom.ts` | 44910 | 2026-09-23 14:46 | 2026-09-23 | `c0b0b88466` |
| `nexus-design-2026-08-30-1245/restaurantRoom.ts` | 39433 | 2026-09-23 14:46 | 2026-09-23 | `914c32f101` |
| `nexus-design-2026-08-30-1245/silhouetteContrast.zones.ts` | 11996 | 2026-09-23 14:46 | 2026-09-23 | `7e861f5caf` |
| `nexus-design-2026-08-30-1245/wineBarRoom.ts` | 43124 | 2026-09-23 14:46 | 2026-09-23 | `43f5bf42fb` |

### reports (32 filer)

| Sökväg | Storlek (B) | Ändrad (fs) | Senaste commit | SHA-1 (10) |
|---|---:|---|---|---|
| `reports/districts/assignment.json` | 48458 | 2026-07-27 12:23 | ospårad | `5bba801ee1` |
| `reports/districts/summary.json` | 14836 | 2026-07-27 12:23 | ospårad | `151f065b9f` |
| `reports/knowledge/article-topics.json` | 33110 | 2026-09-23 14:46 | 2026-08-10 | `0692c16c79` |
| `reports/knowledge/bottom-20-per-register.txt` | 68962 | 2026-09-23 14:46 | 2026-08-10 | `c1fa7518d8` |
| `reports/knowledge/questions.json` | 587473 | 2026-09-23 14:46 | 2026-08-10 | `e150688836` |
| `reports/metadata/buildings.json` | 163730 | 2026-07-27 12:23 | ospårad | `2a68ed15e0` |
| `reports/metadata/districts.json` | 11279 | 2026-07-27 12:23 | ospårad | `33b578ab6b` |
| `reports/metadata/facades.json` | 145601 | 2026-07-27 12:23 | ospårad | `47f175482c` |
| `reports/metadata/knowledge-graph.json` | 55508 | 2026-07-26 22:34 | ospårad | `694b1c1ab7` |
| `reports/metadata/landmarks.json` | 13269 | 2026-07-27 12:23 | ospårad | `e9294914b6` |
| `reports/metadata/performance.json` | 5716 | 2026-07-25 08:21 | ospårad | `b1f3b7989a` |
| `reports/metadata/pois.json` | 8263 | 2026-07-27 12:23 | ospårad | `0ccb79e368` |
| `reports/metadata/streets.json` | 14123 | 2026-07-27 12:23 | ospårad | `4caa7740c7` |
| `reports/reference-production/badvagen-building-reconciliation.json` | 8566 | 2026-09-23 14:46 | 2026-07-27 | `233f001ac8` |
| `reports/reference-production/kyrkogatan-back-cluster-reconciliation.json` | 3430 | 2026-09-23 14:46 | 2026-07-27 | `d5bf127267` |
| `reports/reference-production/kyrkogatan-building-reconciliation.json` | 9205 | 2026-09-23 14:46 | 2026-07-27 | `9067923a2a` |
| `reports/reference-production/lokavagen-lakeshore-building-reconciliation.json` | 3116 | 2026-09-23 14:46 | 2026-07-27 | `5110b2990f` |
| `reports/reference-production/massingsslatan-school-district-building-reconciliation.json` | 4428 | 2026-09-23 14:46 | 2026-07-27 | `55876a49a9` |
| `reports/reference-production/nygatan-harjeredvagen-building-reconciliation.json` | 4210 | 2026-09-23 14:46 | 2026-07-27 | `3868a4903b` |
| `reports/reference-production/prastgatan-building-reconciliation.json` | 4155 | 2026-09-23 14:46 | 2026-07-27 | `1fc6f03563` |
| `reports/reference-production/skolgatan-building-reconciliation.json` | 5442 | 2026-09-23 14:46 | 2026-07-27 | `b8c2022cfd` |
| `reports/reference-production/station-corridor-building-reconciliation.json` | 4751 | 2026-09-23 14:46 | 2026-07-27 | `015fc9c285` |
| `reports/semantic/districts-identity.json` | 26693 | 2026-07-26 22:34 | ospårad | `4f0538cc04` |
| `reports/semantic/place-graph.json` | 184530 | 2026-07-27 06:13 | ospårad | `40f11b6d68` |
| `reports/semantic/places.json` | 215847 | 2026-07-27 06:13 | ospårad | `3d54d8b5ec` |
| `reports/shadow-map/central-w.svg` | 96481 | 2026-07-25 07:09 | ospårad | `2f831542ff` |
| `reports/shadow-map/centre.svg` | 129747 | 2026-07-25 07:09 | ospårad | `91a3313d42` |
| `reports/shadow-map/northern.svg` | 137459 | 2026-07-25 07:09 | ospårad | `9bcfd23ea9` |
| `reports/shadow-map/overview.svg` | 174192 | 2026-07-25 07:09 | ospårad | `da9dd64663` |
| `reports/shadow-map/school.svg` | 92583 | 2026-07-25 07:09 | ospårad | `0f429b280b` |
| `reports/shadow-map/station.svg` | 64616 | 2026-07-25 07:09 | ospårad | `aed3b6dd07` |
| `reports/shadow-map/western.svg` | 89944 | 2026-07-25 07:09 | ospårad | `1979f91b13` |

---

## b) Dubbletter — identiskt innehåll

Jämfört med SHA-1 över innehållet. "Behåll" = föreslagen huvudkopia (ordning: `handoff/` → `documentation/`/roten →
`nexus-design` → `leverans/` → `Restaurant guest animation/` → `uploads/` → `(2)`, hash-suffix sist).
Kopior i leveransmappar lämnas i sina paket (en leverans ska gå att öppna fristående); kopior i
`Restaurant guest animation (2)/` och `Restaurant guest animation/uploads/` arkiveras när respektive mapp flyttas.

**Utelämnat ur tabellen, avsiktligt:** 14 identiska `TASKS.md`, 14 `KNOWN_ISSUES.md` och 14 `REVIEWS.md` i
`documentation/districts/D01–D15/` (tomma mallar, en per distrikt — behåll alla) samt tomma `.gitkeep`.

**Värt att notera:**
- Rot-filerna `BRIEF_DESIGN_GASTGIVERIET.md` och `BRIEF_DESIGN_REKVISITAN.md` finns identiskt i `Restaurant guest animation/uploads/`.
- Rot-filen `ORDER - vinbaren.md` finns identiskt i båda `Restaurant guest animation`-mapparna.
- `documentation/prototypes/staff-guest-reel*/` innehåller redan kopior av flera prototypfiler från `Restaurant guest animation/`.
  `frontend/src/strategic/ui/foodtruck/rig.ts` och `frontend/scripts/order096-fps-benchmark.mjs` pekar på prototypes-kopian, som ligger kvar.

| # | SHA-1 | Storlek | Behåll | Övriga kopior (öde) |
|---:|---|---:|---|---|
| 1 | `42f45bebc1` | 55474 | `documentation/prototypes/staff-guest-reel/animations-v3.jsx` | `documentation/prototypes/staff-guest-reel-extended/animations-v3.jsx` — ligger kvar<br>`Restaurant guest animation/animations-v3.jsx` — följer med leveransmappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (2)/animations-v3.jsx` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/animations-v3.jsx` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/animations-v3-06ae64d4.jsx` — arkiveras med mappen<br>`Restaurant guest animation (2)/animations-v3.jsx` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/animations-v3.jsx` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/animations-v3.jsx` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/animations-v3-06ae64d4.jsx` — arkiveras med mappen |
| 2 | `2e38395c4a` | 69150 | `documentation/prototypes/staff-guest-reel/support.js` | `documentation/prototypes/staff-guest-reel-extended/support.js` — ligger kvar<br>`Restaurant guest animation/support.js` — följer med leveransmappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (2)/support.js` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/support.js` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/support-8fe7df74.js` — arkiveras med mappen<br>`Restaurant guest animation (2)/support.js` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/support.js` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/support.js` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/support-8fe7df74.js` — arkiveras med mappen |
| 3 | `2278b6c8a3` | 25439 | `documentation/prototypes/staff-guest-reel/tweaks-panel.jsx` | `documentation/prototypes/staff-guest-reel-extended/tweaks-panel.jsx` — ligger kvar<br>`Restaurant guest animation/tweaks-panel.jsx` — följer med leveransmappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (2)/tweaks-panel.jsx` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/tweaks-panel.jsx` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/tweaks-panel-d259e3a8.jsx` — arkiveras med mappen<br>`Restaurant guest animation (2)/tweaks-panel.jsx` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/tweaks-panel.jsx` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/tweaks-panel.jsx` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/tweaks-panel-d259e3a8.jsx` — arkiveras med mappen |
| 4 | `a06cb5632b` | 1750 | `documentation/prototypes/staff-guest-reel/Guest Animation Reel.dc.html` | `documentation/prototypes/staff-guest-reel-extended/Guest Animation Reel.dc.html` — ligger kvar<br>`Restaurant guest animation/Guest Animation Reel.dc.html` — följer med leveransmappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (2)/Guest Animation Reel.dc.html` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/Guest Animation Reel.dc.html` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/Guest Animation Reel.dc-52829de6.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/Guest Animation Reel.dc.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/Guest Animation Reel.dc.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Guest Animation Reel.dc.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Guest Animation Reel.dc-52829de6.html` — arkiveras med mappen |
| 5 | `a303340a2f` | 10555 | `documentation/prototypes/staff-guest-reel/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/styles.css` | `documentation/prototypes/staff-guest-reel-extended/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/styles.css` — ligger kvar<br>`Restaurant guest animation/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/styles.css` — följer med leveransmappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/styles.css` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/styles.css` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/styles-cf9fcf75.css` — arkiveras med mappen<br>`Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/styles.css` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/styles.css` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/styles.css` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/styles-cf9fcf75.css` — arkiveras med mappen |
| 6 | `5e4ccabaa0` | 303 | `documentation/prototypes/staff-guest-reel/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_bundle.js` | `documentation/prototypes/staff-guest-reel-extended/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_bundle.js` — ligger kvar<br>`Restaurant guest animation/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_bundle.js` — följer med leveransmappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_bundle.js` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_bundle.js` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_bundle-6138a841.js` — arkiveras med mappen<br>`Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_bundle.js` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_bundle.js` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_bundle.js` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_bundle-6138a841.js` — arkiveras med mappen |
| 7 | `7437c3a696` | 7247 | `documentation/prototypes/staff-guest-reel/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_manifest.json` | `documentation/prototypes/staff-guest-reel-extended/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_manifest.json` — ligger kvar<br>`Restaurant guest animation/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_manifest.json` — följer med leveransmappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_manifest.json` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_manifest.json` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_manifest-5a5662c5.json` — arkiveras med mappen<br>`Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_manifest.json` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_manifest.json` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_manifest.json` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_ds_manifest-5a5662c5.json` — arkiveras med mappen |
| 8 | `dabf86ad7d` | 4002 | `documentation/prototypes/staff-guest-reel/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_adherence.oxlintrc.json` | `documentation/prototypes/staff-guest-reel-extended/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_adherence.oxlintrc.json` — ligger kvar<br>`Restaurant guest animation/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_adherence.oxlintrc.json` — följer med leveransmappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_adherence.oxlintrc.json` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_adherence.oxlintrc.json` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_adherence.oxlintrc-a152602f.json` — arkiveras med mappen<br>`Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_adherence.oxlintrc.json` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_adherence.oxlintrc.json` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_adherence.oxlintrc.json` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/_adherence.oxlintrc-a152602f.json` — arkiveras med mappen |
| 9 | `1082b4d77e` | 7376 | `documentation/prototypes/staff-guest-reel/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/readme.md` | `documentation/prototypes/staff-guest-reel-extended/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/readme.md` — ligger kvar<br>`Restaurant guest animation/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/readme.md` — följer med leveransmappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/readme.md` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/readme.md` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/readme-4b7a850a.md` — arkiveras med mappen<br>`Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/readme.md` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/readme.md` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/readme.md` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/_ds/modernist-fa2a5900-708d-4668-979a-71ad6a03542a/readme-4b7a850a.md` — arkiveras med mappen |
| 10 | `9f7df24e4d` | 19356 | `documentation/prototypes/staff-guest-reel-extended/guest-reel.jsx` | `Restaurant guest animation/guest-reel.jsx` — följer med leveransmappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (2)/guest-reel.jsx` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/guest-reel.jsx` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/guest-reel-7b1de19d.jsx` — arkiveras med mappen<br>`Restaurant guest animation (2)/guest-reel.jsx` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/guest-reel.jsx` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/guest-reel.jsx` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/guest-reel-7b1de19d.jsx` — arkiveras med mappen |
| 11 | `b1680a63a7` | 4990 | `documentation/prototypes/staff-guest-reel-extended/StaffFace.dc.html` | `Restaurant guest animation/StaffFace.dc.html` — följer med leveransmappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (2)/StaffFace.dc.html` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/StaffFace.dc.html` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/StaffFace.dc-9a201780.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/StaffFace.dc.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/StaffFace.dc.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/StaffFace.dc.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/StaffFace.dc-9a201780.html` — arkiveras med mappen |
| 12 | `45665a90b4` | 70968 | `documentation/prototypes/staff-guest-reel-extended/Personal - perspektiv och rörelser.dc.html` | `Restaurant guest animation/Personal - perspektiv och rörelser.dc.html` — följer med leveransmappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (2)/Personal - perspektiv och rörelser.dc.html` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/Personal - perspektiv och rörelser.dc.html` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/Personal - perspektiv och rörelser.dc-58f60116.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/Personal - perspektiv och rörelser.dc.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/Personal - perspektiv och rörelser.dc.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Personal - perspektiv och rörelser.dc.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Personal - perspektiv och rörelser.dc-58f60116.html` — arkiveras med mappen |
| 13 | `41305b7172` | 17639 | `documentation/prototypes/staff-guest-reel-extended/Matsalen - i kontext.dc.html` | `Restaurant guest animation/Matsalen - i kontext.dc.html` — följer med leveransmappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (2)/Matsalen - i kontext.dc.html` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/Matsalen - i kontext.dc.html` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/Matsalen - i kontext.dc-9825180c.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/Matsalen - i kontext.dc.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/Matsalen - i kontext.dc.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Matsalen - i kontext.dc.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Matsalen - i kontext.dc-9825180c.html` — arkiveras med mappen |
| 14 | `62f5cb3182` | 2552 | `Restaurant guest animation/Guest Animation Reel standalone-src.dc.html` | `Restaurant guest animation/uploads/Restaurant guest animation (2)/Guest Animation Reel standalone-src.dc.html` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/Guest Animation Reel standalone-src.dc.html` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/Guest Animation Reel standalone-src.dc-ed0ed99b.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/Guest Animation Reel standalone-src.dc.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/Guest Animation Reel standalone-src.dc.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Guest Animation Reel standalone-src.dc.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Guest Animation Reel standalone-src.dc-ed0ed99b.html` — arkiveras med mappen |
| 15 | `15531346c8` | 42776 | `Restaurant guest animation/Yrkesroller - rorelse och uttryck.dc.html` | `Restaurant guest animation/uploads/Restaurant guest animation (2)/Yrkesroller - rorelse och uttryck.dc.html` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/Yrkesroller - rorelse och uttryck.dc.html` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/Yrkesroller - rorelse och uttryck.dc-701c0a83.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/Yrkesroller - rorelse och uttryck.dc.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/Yrkesroller - rorelse och uttryck.dc.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Yrkesroller - rorelse och uttryck.dc.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Yrkesroller - rorelse och uttryck.dc-701c0a83.html` — arkiveras med mappen |
| 16 | `2998bc2f4c` | 9317 | `Restaurant guest animation/StaffPuck.dc.html` | `Restaurant guest animation/uploads/Restaurant guest animation (2)/StaffPuck.dc.html` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/StaffPuck.dc.html` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/StaffPuck.dc-0614d051.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/StaffPuck.dc.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/StaffPuck.dc.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/StaffPuck.dc.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/StaffPuck.dc-0614d051.html` — arkiveras med mappen |
| 17 | `e344dba3ff` | 1156280 | `Restaurant guest animation/Guest Animation Reel.html` | `Restaurant guest animation/uploads/Restaurant guest animation (2)/Guest Animation Reel.html` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/Guest Animation Reel.html` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/Guest Animation Reel-277965c5.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/Guest Animation Reel.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/Guest Animation Reel.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Guest Animation Reel.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Guest Animation Reel-277965c5.html` — arkiveras med mappen |
| 18 | `b4e21c89bf` | 26664 | `Restaurant guest animation/uploads/Restaurant guest animation (2)/staff-guest-reel.jsx` | `Restaurant guest animation/uploads/Restaurant guest animation (1)/staff-guest-reel.jsx` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/staff-guest-reel-4cb0c152.jsx` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/staff-guest-reel.jsx` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/staff-guest-reel.jsx` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/staff-guest-reel-4cb0c152.jsx` — arkiveras med mappen |
| 19 | `3c444187ee` | 2249 | `Restaurant guest animation/uploads/Restaurant guest animation (2)/github.md` | `Restaurant guest animation/uploads/Restaurant guest animation (1)/github.md` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/github-e3b4a844.md` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/github.md` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/github.md` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/github-e3b4a844.md` — arkiveras med mappen |
| 20 | `31dea19432` | 19628 | `Restaurant guest animation/uploads/Restaurant guest animation (2)/.thumbnail` | `Restaurant guest animation/uploads/Restaurant guest animation (1)/.thumbnail` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/.thumbnail-f5d89e4e` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/.thumbnail` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/.thumbnail` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/.thumbnail-f5d89e4e` — arkiveras med mappen |
| 21 | `3c3c7a13ff` | 1826 | `Restaurant guest animation/uploads/Restaurant guest animation (2)/Reel - gaster och personal.dc.html` | `Restaurant guest animation/uploads/Restaurant guest animation (1)/Reel - gaster och personal.dc.html` — arkiveras med mappen<br>`Restaurant guest animation/uploads/Restaurant guest animation (1)/Reel - gaster och personal.dc-14b14ee7.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (2)/Reel - gaster och personal.dc.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Reel - gaster och personal.dc.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/uploads/Restaurant guest animation (1)/Reel - gaster och personal.dc-14b14ee7.html` — arkiveras med mappen |
| 22 | `a774451c0b` | 29800 | `handoff/figureRig.ts` | `nexus-design-2026-08-30-1245/figureRig.ts` — följer med leveransmappen<br>`leverans/figureRig.ts` — följer med leveransmappen<br>`Restaurant guest animation/figureRig.ts` — följer med leveransmappen<br>`Restaurant guest animation (2)/figureRig.ts` — arkiveras med mappen |
| 23 | `408e2a1ece` | 35113 | `handoff/brewpubRoom.ts` | `nexus-design-2026-08-30-1245/brewpubRoom.ts` — följer med leveransmappen<br>`leverans/brewpubRoom.ts` — följer med leveransmappen<br>`Restaurant guest animation/brewpubRoom.ts` — följer med leveransmappen<br>`Restaurant guest animation (2)/brewpubRoom.ts` — arkiveras med mappen |
| 24 | `43f5bf42fb` | 43124 | `handoff/wineBarRoom.ts` | `nexus-design-2026-08-30-1245/wineBarRoom.ts` — följer med leveransmappen<br>`leverans/wineBarRoom.ts` — följer med leveransmappen<br>`Restaurant guest animation/wineBarRoom.ts` — följer med leveransmappen |
| 25 | `819a6a580e` | 206 | `Restaurant guest animation/Canvas.dc.html` | `Restaurant guest animation/Vinbaren - lounger och DJ.dc.html` — följer med leveransmappen<br>`Restaurant guest animation (2)/Canvas.dc.html` — arkiveras med mappen<br>`Restaurant guest animation (2)/Vinbaren - lounger och DJ.dc.html` — arkiveras med mappen |
| 26 | `45dcbdf7cf` | 35917 | `Restaurant guest animation/screenshots/03-g6.png` | `Restaurant guest animation/screenshots/01-g6.png` — följer med leveransmappen<br>`Restaurant guest animation (2)/screenshots/03-g6.png` — arkiveras med mappen<br>`Restaurant guest animation (2)/screenshots/01-g6.png` — arkiveras med mappen |
| 27 | `5454945383` | 30402 | `Restaurant guest animation/screenshots/01-c.png` | `Restaurant guest animation/screenshots/close2.png` — följer med leveransmappen<br>`Restaurant guest animation (2)/screenshots/01-c.png` — arkiveras med mappen<br>`Restaurant guest animation (2)/screenshots/close2.png` — arkiveras med mappen |
| 28 | `ddd2f84ba8` | 36083 | `Restaurant guest animation/screenshots/01-fix.png` | `Restaurant guest animation/screenshots/03-fix.png` — följer med leveransmappen<br>`Restaurant guest animation (2)/screenshots/01-fix.png` — arkiveras med mappen<br>`Restaurant guest animation (2)/screenshots/03-fix.png` — arkiveras med mappen |
| 29 | `42f69e29aa` | 9720 | `ORDER - vinbaren.md` | `Restaurant guest animation/ORDER - vinbaren.md` — följer med leveransmappen<br>`Restaurant guest animation (2)/ORDER - vinbaren.md` — arkiveras med mappen |
| 30 | `bbf60fc09f` | 66020 | `handoff/innRoom.ts` | `nexus-design-2026-08-30-1245/innRoom.ts` — följer med leveransmappen<br>`leverans/innRoom.ts` — följer med leveransmappen |
| 31 | `7e861f5caf` | 11996 | `handoff/silhouetteContrast.zones.ts` | `nexus-design-2026-08-30-1245/silhouetteContrast.zones.ts` — följer med leveransmappen<br>`leverans/silhouetteContrast.zones.ts` — följer med leveransmappen |
| 32 | `8579b797fb` | 52526 | `handoff/foodTruckRoom.ts` | `nexus-design-2026-08-30-1245/foodTruckRoom.ts` — följer med leveransmappen<br>`leverans/foodTruckRoom.ts` — följer med leveransmappen |
| 33 | `914c32f101` | 39433 | `handoff/restaurantRoom.ts` | `nexus-design-2026-08-30-1245/restaurantRoom.ts` — följer med leveransmappen<br>`leverans/restaurantRoom.ts` — följer med leveransmappen |
| 34 | `2fc3644269` | 30148 | `handoff/figureProps.ts` | `nexus-design-2026-08-30-1245/figureProps.ts` — följer med leveransmappen<br>`leverans/figureProps.ts` — följer med leveransmappen |
| 35 | `f5e53f32fd` | 4039 | `BRIEF_DESIGN_GASTGIVERIET.md` | `Restaurant guest animation/uploads/BRIEF_DESIGN_GASTGIVERIET.md` — arkiveras med mappen |
| 36 | `1afd437823` | 3375 | `BRIEF_DESIGN_REKVISITAN.md` | `Restaurant guest animation/uploads/BRIEF_DESIGN_REKVISITAN.md` — arkiveras med mappen |
| 37 | `c0b0b88466` | 44910 | `handoff/nightClubRoom.ts` | `nexus-design-2026-08-30-1245/nightClubRoom.ts` — följer med leveransmappen |
| 38 | `f8c0502f66` | 13775 | `handoff/businessRoom.ts` | `nexus-design-2026-08-30-1245/businessRoom.ts` — följer med leveransmappen |
| 39 | `0b54fa7f32` | 58782 | `handoff/serviceScore.ts` | `leverans-servicekoreografin/serviceScore.ts` — följer med leveransmappen |
| 40 | `3564a1a018` | 1165854 | `Restaurant guest animation/Reel - gaster och personal.html` | `Restaurant guest animation (2)/Reel - gaster och personal.html` — arkiveras med mappen |
| 41 | `5ecd295734` | 49063 | `Restaurant guest animation/staff-guest-reel.jsx` | `Restaurant guest animation (2)/staff-guest-reel.jsx` — arkiveras med mappen |
| 42 | `4d043f4cfd` | 30886 | `Restaurant guest animation/Figurrigg - kroppar i rummet.dc.html` | `Restaurant guest animation (2)/Figurrigg - kroppar i rummet.dc.html` — arkiveras med mappen |
| 43 | `3f986b37b0` | 25897 | `Restaurant guest animation/figureRig.js` | `Restaurant guest animation (2)/figureRig.js` — arkiveras med mappen |
| 44 | `76985d099a` | 38605 | `Restaurant guest animation/wineBarRoom.js` | `Restaurant guest animation (2)/wineBarRoom.js` — arkiveras med mappen |
| 45 | `fa56b08c80` | 3193 | `Restaurant guest animation/Reel standalone-src.dc.html` | `Restaurant guest animation (2)/Reel standalone-src.dc.html` — arkiveras med mappen |
| 46 | `85c9a54480` | 2230 | `Restaurant guest animation/Reel - gaster och personal.dc.html` | `Restaurant guest animation (2)/Reel - gaster och personal.dc.html` — arkiveras med mappen |
| 47 | `48cf728bb2` | 7409 | `Restaurant guest animation/ORDER - olkrog med bryggeri.md` | `Restaurant guest animation (2)/ORDER - olkrog med bryggeri.md` — arkiveras med mappen |
| 48 | `2ca7ba60f0` | 30997 | `Restaurant guest animation/brewpubRoom.js` | `Restaurant guest animation (2)/brewpubRoom.js` — arkiveras med mappen |
| 49 | `48c13f0ecd` | 31176 | `Restaurant guest animation/screenshots/rig-face.png` | `Restaurant guest animation (2)/screenshots/rig-face.png` — arkiveras med mappen |
| 50 | `5d95470bf4` | 38815 | `Restaurant guest animation/screenshots/kontakt.png` | `Restaurant guest animation (2)/screenshots/kontakt.png` — arkiveras med mappen |
| 51 | `e09bc7400a` | 28092 | `Restaurant guest animation/screenshots/01-kontakt2.png` | `Restaurant guest animation (2)/screenshots/01-kontakt2.png` — arkiveras med mappen |
| 52 | `7ce5c6753d` | 40899 | `Restaurant guest animation/screenshots/rig4.png` | `Restaurant guest animation (2)/screenshots/rig4.png` — arkiveras med mappen |
| 53 | `8ad03a766b` | 37684 | `Restaurant guest animation/screenshots/03-g5.png` | `Restaurant guest animation (2)/screenshots/03-g5.png` — arkiveras med mappen |
| 54 | `7ee0cfcb53` | 40933 | `Restaurant guest animation/screenshots/01-g5.png` | `Restaurant guest animation (2)/screenshots/01-g5.png` — arkiveras med mappen |
| 55 | `35c9e468e3` | 27794 | `Restaurant guest animation/screenshots/02-carry.png` | `Restaurant guest animation (2)/screenshots/02-carry.png` — arkiveras med mappen |
| 56 | `dde8877725` | 37526 | `Restaurant guest animation/screenshots/rig2.png` | `Restaurant guest animation (2)/screenshots/rig2.png` — arkiveras med mappen |
| 57 | `b79bd1bc33` | 29668 | `Restaurant guest animation/screenshots/03-close.png` | `Restaurant guest animation (2)/screenshots/03-close.png` — arkiveras med mappen |
| 58 | `ed5cf2fe5a` | 40241 | `Restaurant guest animation/screenshots/gaster.png` | `Restaurant guest animation (2)/screenshots/gaster.png` — arkiveras med mappen |
| 59 | `e7a9c3ba56` | 36376 | `Restaurant guest animation/screenshots/04-fix.png` | `Restaurant guest animation (2)/screenshots/04-fix.png` — arkiveras med mappen |
| 60 | `c8165318ce` | 29707 | `Restaurant guest animation/screenshots/04-close.png` | `Restaurant guest animation (2)/screenshots/04-close.png` — arkiveras med mappen |
| 61 | `08caf9d796` | 29688 | `Restaurant guest animation/screenshots/02-close.png` | `Restaurant guest animation (2)/screenshots/02-close.png` — arkiveras med mappen |
| 62 | `d45d04d21f` | 37406 | `Restaurant guest animation/screenshots/gester.png` | `Restaurant guest animation (2)/screenshots/gester.png` — arkiveras med mappen |
| 63 | `7b00c39138` | 32549 | `Restaurant guest animation/screenshots/02-g5.png` | `Restaurant guest animation (2)/screenshots/02-g5.png` — arkiveras med mappen |
| 64 | `0bab5ac299` | 31682 | `Restaurant guest animation/screenshots/02-g6.png` | `Restaurant guest animation (2)/screenshots/02-g6.png` — arkiveras med mappen |
| 65 | `65720533ce` | 30351 | `Restaurant guest animation/screenshots/03-c.png` | `Restaurant guest animation (2)/screenshots/03-c.png` — arkiveras med mappen |
| 66 | `d0a53179e8` | 27698 | `Restaurant guest animation/screenshots/carry2.png` | `Restaurant guest animation (2)/screenshots/carry2.png` — arkiveras med mappen |
| 67 | `a58d1d82c9` | 29716 | `Restaurant guest animation/screenshots/01-close.png` | `Restaurant guest animation (2)/screenshots/01-close.png` — arkiveras med mappen |
| 68 | `8740dc933d` | 30359 | `Restaurant guest animation/screenshots/02-c.png` | `Restaurant guest animation (2)/screenshots/02-c.png` — arkiveras med mappen |
| 69 | `0d7a0a9c8e` | 36921 | `Restaurant guest animation/screenshots/02-kontakt2.png` | `Restaurant guest animation (2)/screenshots/02-kontakt2.png` — arkiveras med mappen |
| 70 | `7627f59df1` | 30378 | `Restaurant guest animation/screenshots/04-c.png` | `Restaurant guest animation (2)/screenshots/04-c.png` — arkiveras med mappen |
| 71 | `e918ec3ee1` | 27803 | `Restaurant guest animation/screenshots/01-carry.png` | `Restaurant guest animation (2)/screenshots/01-carry.png` — arkiveras med mappen |
| 72 | `958b8eacae` | 33126 | `Restaurant guest animation/screenshots/02-fix.png` | `Restaurant guest animation (2)/screenshots/02-fix.png` — arkiveras med mappen |
| 73 | `16fd456fd2` | 18397 | `Restaurant guest animation/screenshots/rig-stage.png` | `Restaurant guest animation (2)/screenshots/rig-stage.png` — arkiveras med mappen |
| 74 | `dd78c8363b` | 30158 | `Restaurant guest animation/screenshots/seated.png` | `Restaurant guest animation (2)/screenshots/seated.png` — arkiveras med mappen |
| 75 | `0d9d261d73` | 29218 | `Restaurant guest animation/screenshots/02-props-heads.png` | `Restaurant guest animation/screenshots/01-props-heads.png` — följer med leveransmappen |
| 76 | `ee55a78d0a` | 32999 | `Restaurant guest animation/screenshots/01-inn.png` | `Restaurant guest animation/screenshots/01-inn-strategic.png` — följer med leveransmappen |

---

## c) Versioner — varianter av samma sak

| Variant | Jämfört med | Skillnad | Aktuell |
|---|---|---|---|
| `Restaurant guest animation (2)/` (130 filer) | `Restaurant guest animation/` (156 filer) | (2) saknar 26 filer som finns i huvudmappen (Gästgiveriet, Rekvisitan, Restaurangen, silhuettbandet, `figureProps.js`, `innRoom.js`, `restaurantRoom.js`, `wineBarRoom.ts`, 13 skärmdumpar, 2 briefer i uploads). Fyra filer skiljer: `github.md` (huvudmappen daterad 2026-08-30 08:20, (2) 2026-08-29 20:40), `Olkrog med bryggeri.dc.html` (38 514 mot 37 219 B), `Vinbaren.dc.html` (43 205 mot 41 894 B), `.thumbnail`. Inga filer finns bara i (2). | **Huvudmappen.** (2) → `_arkiv/versioner/` |
| `Restaurant guest animation/uploads/Restaurant guest animation (1)/` | sina egna syskon | 21 filer med hash-suffix, t.ex. `StaffFace.dc-9a201780.html`, `support-8fe7df74.js`, `_ds_bundle-6138a841.js`: alla byte-identiska med filen utan suffix. | Filen utan suffix |
| `…/uploads/Restaurant guest animation (1)/` och `(2)/` | `Restaurant guest animation/` | Äldre versioner: `staff-guest-reel.jsx` 26 664 mot 49 063 B, `Reel - gaster och personal.dc.html` 1 826 mot 2 230 B, `github.md` 2 249 mot 7 221 B, `.thumbnail` 19 628 mot 42 368 B. Övriga identiska. | **Huvudmappen.** `uploads/` → `_arkiv/versioner/` |
| `leverans/` | `nexus-design-2026-08-30-1245/` | Samma leverans 2026-08-30. 8 av 10 `.ts` identiska. `businessRoom.ts` 12 001 mot 13 775 B och `nightClubRoom.ts` 44 719 mot 44 910 B. `LEVERANS.md` är två olika texter (9 000 mot 4 767 B); `nexus-design` har även `LEVERANSNOT.md`. `nexus-design`:s filer är identiska med `handoff/*.ts` (ORDER 142/143 monterade 12:45-leveransen). | **`nexus-design-2026-08-30-1245/`.** `leverans/` är tidigare variant, se beslut 1 |
| `handoff/*.ts` | `frontend/src/strategic/scene/*.ts` | Kopiorna i `scene/` har vidareutvecklats; ingen är identisk. Skyddade, rörs inte. | — |
| `leverans-servicekoreografin/serviceScore.ts` | `handoff/serviceScore.ts` | Identiska. | `handoff/` (skyddad); leveransen behåller sin kopia |

---

## d) Förslag på ny struktur

```
documentation/
  orders/        + 7 ORDER-filer från roten (bredvid befintliga ORDER_053, ORDER_060)
  briefs/        BRIEF_DESIGN_*.md (3)
  leveranser/
    leverans/                          (11 filer, se beslut 1)
    leverans-servicekoreografin/       (5)
    nexus-design-2026-08-30-1245/      (12)
    Restaurant guest animation/        (91 filer, utan uploads/)
  architecture/  oförändrad
  (övriga undermappar oförändrade)
_arkiv/
  versioner/
    Restaurant guest animation (2)/            (130 filer)
    Restaurant guest animation - uploads/      (65 filer, ur huvudmappen)
  dubbletter/    tom; alla rena dubbletter ligger i mapparna ovan eller i leveranspaket
handoff/         oförändrad (se beslut 2)
reports/         oförändrad (skriptutdata från scripts/*.mjs, refereras av CLAUDE.md)
```

Avvikelser från ordern: `Restaurant guest animation (2)` hamnar i `_arkiv/versioner/` i stället för `leveranser/`,
eftersom den är en äldre ögonblicksbild. `_arkiv/dubbletter/` behövs inte: att bryta ut enskilda filer ur leveranspaketen skulle splittra dem.

**Flyttabell** (mappar flyttas med oförändrad inre struktur; 324 filer totalt):

| # | Nuvarande sökväg | Ny sökväg | Filer |
|---:|---|---|---:|
| 1 | `ORDER - vinbaren.md` | `documentation/orders/ORDER - vinbaren.md` | 1 |
| 2 | `ORDER_EN_HEL_DAG.md` | `documentation/orders/ORDER_EN_HEL_DAG.md` | 1 |
| 3 | `ORDER_KONKURRENTERNA_FINNS.md` | `documentation/orders/ORDER_KONKURRENTERNA_FINNS.md` | 1 |
| 4 | `ORDER_KONKURRENTERNA_ROR_SIG.md` | `documentation/orders/ORDER_KONKURRENTERNA_ROR_SIG.md` | 1 |
| 5 | `ORDER_NEXUS_PA_EN_LANK.md` | `documentation/orders/ORDER_NEXUS_PA_EN_LANK.md` | 1 |
| 6 | `ORDER_RAKNAREN_OCH_KONSOLEN.md` | `documentation/orders/ORDER_RAKNAREN_OCH_KONSOLEN.md` | 1 |
| 7 | `ORDER_VAD_SOM_UTLOSER_EN_FRAGA.md` | `documentation/orders/ORDER_VAD_SOM_UTLOSER_EN_FRAGA.md` | 1 |
| 8 | `BRIEF_DESIGN_FOODTRUCKEN.md` | `documentation/briefs/BRIEF_DESIGN_FOODTRUCKEN.md` | 1 |
| 9 | `BRIEF_DESIGN_GASTGIVERIET.md` | `documentation/briefs/BRIEF_DESIGN_GASTGIVERIET.md` | 1 |
| 10 | `BRIEF_DESIGN_REKVISITAN.md` | `documentation/briefs/BRIEF_DESIGN_REKVISITAN.md` | 1 |
| 11 | `leverans/` | `documentation/leveranser/leverans/` | 11 |
| 12 | `leverans-servicekoreografin/` | `documentation/leveranser/leverans-servicekoreografin/` | 5 |
| 13 | `nexus-design-2026-08-30-1245/` | `documentation/leveranser/nexus-design-2026-08-30-1245/` | 12 |
| 14 | `Restaurant guest animation/uploads/` | `_arkiv/versioner/Restaurant guest animation - uploads/` | 65 |
| 15 | `Restaurant guest animation/` (resten) | `documentation/leveranser/Restaurant guest animation/` | 91 |
| 16 | `Restaurant guest animation (2)/` | `_arkiv/versioner/Restaurant guest animation (2)/` | 130 |

Rad 14 görs före rad 15.

---

## e) Referenser till det som föreslås flyttas

Sökt på varje filnamn/mappnamn i hela repot (exkl. `node_modules/`, `.git/` och de mappar som själva flyttas till arkivet).
CLAUDE.md nämner **inget** av det som flyttas (bara `documentation/`-strukturen i allmänhet och `reports/`, som ligger kvar).

| Flyttas | Refereras från | Typ | Åtgärd |
|---|---|---|---|
| `ORDER_VAD_SOM_UTLOSER_EN_FRAGA.md` | `documentation/blueprints/ORDER_224_VAD_SOM_UTLOSER_EN_FRAGA.md:3` | bara filnamn | ingen |
| `ORDER_RAKNAREN_OCH_KONSOLEN.md` | `documentation/architecture/ORDER_126_STADNING_EFTER_PRESENTATIONSARBETET.md:47, 93, 95` | bara filnamn (historik: "orörd i roten") | ingen |
| `ORDER_EN_HEL_DAG.md`, `ORDER_KONKURRENTERNA_*`, `ORDER_NEXUS_PA_EN_LANK.md` | — | inga träffar | — |
| `ORDER - vinbaren.md` | `leverans/LEVERANS.md` (nämner "ORDER - …") | bara filnamn | ingen |
| `BRIEF_DESIGN_REKVISITAN.md`, `BRIEF_DESIGN_GASTGIVERIET.md` | `documentation/blueprints/ROOM_DESIGN_QUESTION_2026-09-10.md:73` | bara filnamn | ingen |
| `BRIEF_DESIGN_FOODTRUCKEN.md` | — | inga träffar | — |
| `leverans/` | `documentation/architecture/EYE_HEIGHT_FOR_SEAT_PENDING.md:1, 13, 26, 55, 64` | **sökväg** (`leverans/businessRoom.ts:273` m.fl.) | uppdateras i fas 2 (beslut 3) |
| `leverans/` | `documentation/architecture/ORDER_REGISTRY.md:359–361, 408` | nämner `leverans/`, historiska registerrader | lämnas (beslut 3) |
| `leverans-servicekoreografin/` | `documentation/blueprints/ORDER_250_STAFF_MOVEMENT_MEASUREMENT.md:134, 136, 182` | **sökväg** | uppdateras i fas 2 |
| `leverans-servicekoreografin/` | `documentation/architecture/ORDER_REGISTRY.md:179` | nämner mappen | lämnas (beslut 3) |
| `nexus-design-2026-08-30-1245/` | `documentation/architecture/EYE_HEIGHT_FOR_SEAT_PENDING.md:64` | **sökväg** | uppdateras i fas 2 |
| `nexus-design-2026-08-30-1245/` | `documentation/architecture/ORDER_REGISTRY.md:360, 407` | historiska registerrader | lämnas (beslut 3) |
| `LEVERANSNOT.md` (i nexus-design) | `documentation/architecture/EYE_HEIGHT_FOR_SEAT_PENDING.md` | bara filnamn | ingen |
| `LEVERANS.md` | `frontend/src/strategic/scene/__tests__/order142BlockingFlags.test.ts:1, 7, 12`; `frontend/src/strategic/scene/RestaurantScene.tsx:7` | **KOD**, kommentar, bara filnamn | Till Claude Code |
| `Servicekoreografin.html` | `documentation/blueprints/ORDER_250_…md:136, 182` | sökväg (se ovan) | uppdateras i fas 2 |
| `StaffFace.dc.html`, `StaffPuck.dc.html` | `frontend/src/strategic/ui/foodtruck/guestFaces.ts:12, 41`; `archetypes.ts:19, 212`; `Figure.tsx:65, 76, 77` | **KOD**, kommentar, bara filnamn (kopior finns kvar i `documentation/prototypes/`) | Till Claude Code |
| `Restaurant guest animation/` och `(2)/` | — | **inga träffar** någonstans utanför mapparna själva | — |
| Filer inuti leveranspaketen | varandra (README/LEVERANSNOT inom samma paket) | relativa namn inom paketet | oförändrade eftersom paketen flyttas hela |

---

## Till Claude Code

Referenser i kod och CLAUDE.md som rör flyttade filer. Inga av dem är sökvägar som går sönder (alla är kommentarer
med bara filnamn), men om ni vill att kommentarerna pekar rätt:

| Fil | Rad | Nämner | Förslag |
|---|---|---|---|
| `frontend/src/strategic/scene/__tests__/order142BlockingFlags.test.ts` | 1, 7, 12 | `LEVERANS.md` | Ev. förtydliga till `documentation/leveranser/nexus-design-2026-08-30-1245/LEVERANS.md` |
| `frontend/src/strategic/scene/RestaurantScene.tsx` | 7 | `LEVERANS.md` | Som ovan |
| `frontend/src/strategic/ui/foodtruck/guestFaces.ts` | 12, 41 | `StaffFace.dc.html` | Ingen åtgärd krävs (kopia i `documentation/prototypes/staff-guest-reel-extended/`) |
| `frontend/src/strategic/ui/foodtruck/archetypes.ts` | 19, 212 | `StaffPuck.dc.html` | Ingen åtgärd krävs |
| `frontend/src/strategic/ui/foodtruck/Figure.tsx` | 65, 76, 77 | `StaffFace.dc.html` | Ingen åtgärd krävs |
| `CLAUDE.md` | 20–26 | tabell över `documentation/`-mappar | Lägg gärna till `orders/`, `briefs/`, `leveranser/` i tabellen efter fas 2 |

Ingen kod i `frontend/src/`, `frontend/scripts/`, `scripts/` eller `.github/` pekar med sökväg på något som flyttas.


---

## Fas 2 — genomfört (2026-09-24)

**Beslut från Anders:**
1. `nexus-design-2026-08-30-1245/` är den inbyggda leveransen och flyttas till `documentation/leveranser/`.
   `leverans/` är en tidigare version och flyttas till **`_arkiv/versioner/`** (avvikelse från förslaget i d).
2. `handoff/ORDER-*.md` ligger kvar.
3. Länkar i `documentation/architecture/` uppdateras bara i `EYE_HEIGHT_FOR_SEAT_PENDING.md`. `ORDER_REGISTRY.md` lämnas orörd.

### Flyttar (16 poster, 324 filer, gjorda med `mv -n`)

| # | Från | Till | Filer |
|---:|---|---|---:|
| 1 | `ORDER - vinbaren.md` | `documentation/orders/ORDER - vinbaren.md` | 1 |
| 2 | `ORDER_EN_HEL_DAG.md` | `documentation/orders/ORDER_EN_HEL_DAG.md` | 1 |
| 3 | `ORDER_KONKURRENTERNA_FINNS.md` | `documentation/orders/ORDER_KONKURRENTERNA_FINNS.md` | 1 |
| 4 | `ORDER_KONKURRENTERNA_ROR_SIG.md` | `documentation/orders/ORDER_KONKURRENTERNA_ROR_SIG.md` | 1 |
| 5 | `ORDER_NEXUS_PA_EN_LANK.md` | `documentation/orders/ORDER_NEXUS_PA_EN_LANK.md` | 1 |
| 6 | `ORDER_RAKNAREN_OCH_KONSOLEN.md` | `documentation/orders/ORDER_RAKNAREN_OCH_KONSOLEN.md` | 1 |
| 7 | `ORDER_VAD_SOM_UTLOSER_EN_FRAGA.md` | `documentation/orders/ORDER_VAD_SOM_UTLOSER_EN_FRAGA.md` | 1 |
| 8 | `BRIEF_DESIGN_FOODTRUCKEN.md` | `documentation/briefs/BRIEF_DESIGN_FOODTRUCKEN.md` | 1 |
| 9 | `BRIEF_DESIGN_GASTGIVERIET.md` | `documentation/briefs/BRIEF_DESIGN_GASTGIVERIET.md` | 1 |
| 10 | `BRIEF_DESIGN_REKVISITAN.md` | `documentation/briefs/BRIEF_DESIGN_REKVISITAN.md` | 1 |
| 11 | `leverans/` | `_arkiv/versioner/leverans/` | 11 |
| 12 | `leverans-servicekoreografin/` | `documentation/leveranser/leverans-servicekoreografin/` | 5 |
| 13 | `nexus-design-2026-08-30-1245/` | `documentation/leveranser/nexus-design-2026-08-30-1245/` | 12 |
| 14 | `Restaurant guest animation/uploads/` | `_arkiv/versioner/Restaurant guest animation - uploads/` | 65 |
| 15 | `Restaurant guest animation/` (resten) | `documentation/leveranser/Restaurant guest animation/` | 91 |
| 16 | `Restaurant guest animation (2)/` | `_arkiv/versioner/Restaurant guest animation (2)/` | 130 |

Nya mappar: `documentation/orders/` fanns redan (ORDER_053, ORDER_060); nya är `documentation/briefs/`,
`documentation/leveranser/` och `_arkiv/versioner/`. `_arkiv/dubbletter/` skapades inte, eftersom inga enskilda dubbletter bröts ut ur paketen.

### Länkar som uppdaterades (regel 3)

| Fil | Rad | Före | Efter |
|---|---|---|---|
| `documentation/architecture/EYE_HEIGHT_FOR_SEAT_PENDING.md` | 1 | `från leverans/` | `från _arkiv/versioner/leverans/` |
| 〃 | 13 | `leverans/businessRoom.ts:273` | `_arkiv/versioner/leverans/businessRoom.ts:273` |
| 〃 | 26 | `leverans/` | `_arkiv/versioner/leverans/` |
| 〃 | 55 | `leverans/-paketet` | `_arkiv/versioner/leverans/-paketet` |
| 〃 | 64 | `nexus-design-2026-08-30-1245/` och `leverans/businessRoom.ts` | `documentation/leveranser/nexus-design-2026-08-30-1245/` och `_arkiv/versioner/leverans/businessRoom.ts` |
| `documentation/blueprints/ORDER_250_STAFF_MOVEMENT_MEASUREMENT.md` | 134, 136, 182 | `leverans-servicekoreografin/` | `documentation/leveranser/leverans-servicekoreografin/` |

ORDER_250 ligger i `blueprints/`, inte i `architecture/`, och fanns med i den godkända referenstabellen (e) som "uppdateras i fas 2".
`ORDER_REGISTRY.md` och `ORDER_126_…md` är orörda. Referenser med bara filnamn är också orörda.

**Lämnat orört, bra att veta:** `EYE_HEIGHT_FOR_SEAT_PENDING.md:63` pekar på `documentation/blueprints/LEVERANSNOT.md`,
en fil som inte fanns där ens före städningen. Rätt fil är nu `documentation/leveranser/nexus-design-2026-08-30-1245/LEVERANSNOT.md`.
Rad 35 ("leverans-mapparna") är löptext, inte en sökväg.

### Nya filer

- `documentation/INDEX.md`: förteckning per mapp över alla 536 filer under `documentation/`. Varje dokument (`.md`, `.dc.html`,
  `.html`, `.docx`) har en egen rad; beskrivningen är dokumentets egen rubrik, med handskrivna rader där rubriken saknades.
  Bilder, data och kod i leverans- och prototypmappar redovisas som en samlingsrad per mapp. Kontrollerat med skript att ingen fil saknas.
- `_arkiv/STADPLAN.md` (denna fil).

### Kontroller

| Kontroll | Resultat |
|---|---|
| Filantal före (exkl. `.git/`, alla `node_modules/`) | **1 537** |
| Filantal efter | **1 539** = 1 537 + `_arkiv/STADPLAN.md` + `documentation/INDEX.md` |
| Innehåll | SHA-1 för varje fil före och efter jämförda: alla 324 flyttade filer finns på sin nya plats med identiskt innehåll |
| Raderade filer | 0 (git visar 324 "D", och var och en motsvaras av en flyttad fil) |
| Ändrade spårade filer | 2, båda `.md` och endast sökvägsrader (se ovan) |
| Skyddade sökvägar enligt regel 2 | inga ändringar (kontrollerat mot `git diff`) |

Inget är committat. `.claude/` var ospårad redan före städningen och är orörd.

### Till Claude Code (efter fas 2)

Inga kodändringar krävs. Frivilligt:
- `frontend/src/strategic/scene/__tests__/order142BlockingFlags.test.ts` (rad 1, 7, 12) och `frontend/src/strategic/scene/RestaurantScene.tsx:7`
  nämner `LEVERANS.md`. Den ligger nu i `documentation/leveranser/nexus-design-2026-08-30-1245/LEVERANS.md`.
- `CLAUDE.md` rad 20–26: lägg till `documentation/orders/`, `briefs/` och `leveranser/` i mapptabellen, och en hänvisning till `documentation/INDEX.md`.
- Förslag på commit: `git add -A documentation _arkiv ORDER* BRIEF_DESIGN_* leverans leverans-servicekoreografin nexus-design-2026-08-30-1245 "Restaurant guest animation" "Restaurant guest animation (2)" && git commit -m "Städning: dokumentation till documentation/, versioner till _arkiv/"`
  (utan `.claude/`).
