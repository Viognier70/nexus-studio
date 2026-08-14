repo: Viognier70/nexus-studio
branch: main
path: frontend/src/strategic, documentation/game-design

## Last sync
date: 2026-08-13T10:38:34Z

### Updated in this project
- Byggde "Matsalen - i kontext" — Vinbaren-nivån i spelets egen vy (pitch 58°, 8,4 m) med puck+, gäster, vylabel, Bakåt, personkort och ansiktsrad.
- Chrome och texter tagna ur strings.sv.ts (Roll / Just nu / På väg mot, staffTasks) och rumsdelarna ur Restaurant.tsx.
- Underlag 001 kompletterat med avsnitt 05: läsbarhet för ansiktsuttryck per avstånd och pitch.

## Screen map
| Skärm i projektet | Källfiler i repot |
| --- | --- |
| Personal - perspektiv och rörelser.dc.html | documentation/game-design/CAMERA_AND_VIEW_SYSTEM.md, frontend/src/strategic/scene/InteriorStaff.tsx, frontend/src/strategic/scene/RestaurantActors.tsx, frontend/src/strategic/scene/Restaurant.tsx, CLAUDE.md |
| Matsalen - i kontext.dc.html | frontend/src/strategic/scene/Restaurant.tsx, frontend/src/strategic/scene/InteriorStaff.tsx, frontend/src/strategic/scene/InteriorGuests.tsx, frontend/src/strategic/content/strings.sv.ts |
| StaffPuck.dc.html | frontend/src/strategic/scene/InteriorStaff.tsx (mått, uniformsfärger), frontend/src/strategic/scene/RestaurantActors.tsx (hudton) |
| StaffFace.dc.html | frontend/src/strategic/content/strings.sv.ts (staffTasks), simuleringens load-begrepp i InteriorStaff.tsx |
| Guest Animation Reel.dc.html | — (byggd före repokopplingen) |

## Sync history
- 2026-08-13T10:20:00Z — första läsningen: kamerasystem, interiörkod, riggmått.
