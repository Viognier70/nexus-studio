repo: Viognier70/nexus-studio
branch: main
path: frontend/src/strategic, documentation/game-design

## Last sync
date: 2026-08-13T11:31:47Z

### Updated in this project
- Byggde "Reel - gäster och personal" — 45 s animerad reel i spelets vinkel: rigg, sex gästtyper, sex gester, tolv roller, mimik i närbild, ansiktsraden, kontaktark.
- Förfinade StaffPuck: huvudbonad (toque, keps, kerchief, visir, knut), förkläde, bälte och skarpare riktningskil — rollen syns nu i silhuett.
- Byggde "Yrkesroller - rörelse och uttryck" — tolv roller med egen loop, eget tempo (0,2–1,6 m/s) och grunduttryck.
- Noterat att StaffRole bara täcker fyra av tolv roller; övriga föreslås som uppgifter på TeamMember.

## Screen map
| Skärm i projektet | Källfiler i repot |
| --- | --- |
| Personal - perspektiv och rörelser.dc.html | documentation/game-design/CAMERA_AND_VIEW_SYSTEM.md, frontend/src/strategic/scene/InteriorStaff.tsx, frontend/src/strategic/scene/RestaurantActors.tsx, frontend/src/strategic/scene/Restaurant.tsx, CLAUDE.md |
| Reel - gaster och personal.dc.html | frontend/src/strategic/scene/InteriorStaff.tsx, frontend/src/strategic/scene/InteriorGuests.tsx, documentation/game-design/CAMERA_AND_VIEW_SYSTEM.md, frontend/src/strategic/content/strings.sv.ts |
| Yrkesroller - rorelse och uttryck.dc.html | frontend/src/strategic/scene/InteriorStaff.tsx (uniformsfärger, hastighetskonstant), frontend/src/strategic/content/strings.sv.ts (roller, staffTasks) |
| Matsalen - i kontext.dc.html | frontend/src/strategic/scene/Restaurant.tsx, frontend/src/strategic/scene/InteriorStaff.tsx, frontend/src/strategic/scene/InteriorGuests.tsx, frontend/src/strategic/content/strings.sv.ts |
| StaffPuck.dc.html | frontend/src/strategic/scene/InteriorStaff.tsx (mått, uniformsfärger), frontend/src/strategic/scene/RestaurantActors.tsx (hudton) |
| StaffFace.dc.html | frontend/src/strategic/content/strings.sv.ts (staffTasks), load-begreppet i InteriorStaff.tsx |
| Guest Animation Reel.dc.html | — (byggd före repokopplingen) |

## Sync history
- 2026-08-13T10:38:34Z — matsalen i kontext: Restaurant.tsx, InteriorGuests.tsx, strings.sv.ts.
- 2026-08-13T10:20:00Z — första läsningen: kamerasystem, interiörkod, riggmått.
