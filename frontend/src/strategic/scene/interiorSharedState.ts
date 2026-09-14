// ORDER 044 §3.3 — a tiny cross-component channel for the room's
// live puck positions.
//
// InteriorStaff writes each staff puck's world XZ every frame; the
// seat-attention system in InteriorGuests reads them to find the
// nearest staff to each seated guest. Kept as a module singleton
// rather than a React context because:
//   * Both consumers live under the same Suspense boundary and mount
//     order is stable.
//   * Data flows one-way per frame with no reactivity requirement —
//     a re-render on every position change would be catastrophic.
//   * Contexts add lifecycle complexity for a shared ref with no
//     component tree relationship.
//
// StaffRole is carried so a future refinement can weight proximity
// by role (a servitör within 2 m ≠ a kock within 2 m for attention
// purposes) without another channel.
//
// ORDER 150 — utökad med `businessRoomRef`. RestaurantScene / BrewpubScene
// skriver rummets värld-XZ:er per klass (16 / 20 / 100) när de har
// monterat sin businessRoom-instans. InteriorGuests läser dem för
// gästplaceringen, i stället för `usePlayerBusinessInterior().seats`
// som fortfarande ger restaurangens 16-stols-layout oavsett klass.
// Samma pattern som `staffPositionsRef` — ingen React-reactivitet,
// en skrivare per klass, en läsare, ref uppdateras i mount-effekten.

import type { StaffRole } from '../types';
import type { BusinessClass } from '../business/businessClass';
// StaffRole importeras redan för `SharedStaffPos` — samma import täcker
// `staffStationsByRole` i SharedBusinessRoom (ORDER 154).

export interface SharedStaffPos {
  x: number;
  z: number;
  role: StaffRole;
}

// Keyed by team-member id.
export const staffPositionsRef: { current: Map<string, SharedStaffPos> } = {
  current: new Map()
};

// ORDER 198 — presentationslagrets valda pose per staff-medlem, samma
// per-frame-uppdatering som staffPositionsRef. Innehåller poseNamn,
// task-typ som drev valet, och yaw (både group.rotation.y och
// poseGreet:s relativa targetYaw). Verify-skriptet läser detta för
// att bevisa att poseGreet och poseCarry faktiskt väljs under
// service — utan att skriptet behöver introspektera rig-vinklar.
export interface SharedStaffPose {
  // ORDER 216 (C3) — poseWork tillagd. Se WORK_TASKS i InteriorStaff.tsx
  // för mappningen (order/flambe/misEnPlace/dish/restock/clean).
  poseName: 'poseWalk' | 'poseIdle' | 'poseGreet' | 'poseCarry' | 'poseWork';
  taskType: string | null;
  targetGuestId: string | null;
  moving: boolean;
  yaw: number;
  greetYaw: number | null;
}

export const staffPosesRef: { current: Map<string, SharedStaffPose> } = {
  current: new Map()
};

// ORDER 200 fynd 3 — gäst-render-positioner i värld-XZ, per guest.id.
// InteriorGuests skriver denna varje frame (samma pattern som
// staffPositionsRef); InteriorStaff läser den för att peka staff-target
// mot gästens RENDER-position i stället för sim.guest.position — sim
// använder ett LOKALT frame (INTERIOR-konstanter kring origin, se
// content/layout.ts) medan render lever i värld-frame. Före ORDER 200
// jämförde ORDER 196:s target-clamp `sim.guest.position` (lokal, ~0,0)
// mot `layout.centre` (värld, ~32,-17) och gav `targetDistFromCentre ≈
// 33m` för varje task-styrd staff → ALLTID > `halfW * 1.02` → clamp
// tryckte ALLA task-driftade staff till entrén, oavsett var gästen
// faktiskt var. Diagnostiken 2026-09-10 visade värd + servitör + kock
// alla klumpade på entrance-XZ. Fynd 3.
export interface SharedGuestPos {
  x: number;
  z: number;
}

export const guestPositionsRef: { current: Map<string, SharedGuestPos> } = {
  current: new Map()
};

export type XZ = [number, number];

/**
 * Rummets platser i världskoordinater, publicerat per klass av
 * kontrakts-monterande scen (RestaurantScene, BrewpubScene, senare
 * InnScene, WineBarScene, NightClubScene). InteriorGuests läser
 * `seats` för att placera gäster på seatIndex; det korrekta antalet
 * platser per klass bestäms av rumsfilen (`brewpubRoom.seats.length
 * === 20`, `restaurantRoom.seats.length === 16`), inte av
 * interiorLayout.
 *
 * `null` när ingen scen har monterat ett rum ännu — konsumenter
 * ska falla tillbaka på `usePlayerBusinessInterior().seats` för
 * bakåtkompatibilitet (t.ex. äldre kod som inte har uppdaterats,
 * eller ny klass utan egen scen ännu).
 */
export interface SharedBusinessRoom {
  businessClass: BusinessClass;
  seats: XZ[];
  /**
   * ORDER 186 fynd 2 — världs-facing (radianer) per sitsplats, samma
   * index-ordning som `seats`. InteriorGuests läser detta för att sätta
   * `group.rotation.y` på sittande gäster så de tittar mot bordet i
   * stället för default `+Z` (som råkar peka bort från bordet vid
   * hälften av stols-orienteringarna). Utan detta hade gästen ryggen
   * mot bordet — Vision Owner observation 2026-09-07 fynd 2.
   */
  seatFacings: number[];
  /**
   * ORDER 200 fynd 1 — sitshöjd (Y-mätt från golvet till stolsits/stols-
   * top) per sitsplats. Chair = 0.45 m, bar stool = 0.75 m, lounge-soffa
   * kan avvika (se `wineBarRoom.LOUNGE_SEAT_H`). Innan ORDER 200 hade
   * InteriorGuests en hardcodad konstant `SEAT_SIT_HEIGHT_M = 0.45` för
   * ALLA sittplatser — resultat: gäster på ölkrogens 8 barstolar (index
   * 12-19) satt 30 cm under stolsäten, gäster på ölkrogens 12 träbord-
   * stolar satt rätt. Placeraren måste läsa höjden per seat, inte anta
   * en. `RoomSeat.seatHeight` fanns redan i rumsfilerna (sattes i alla
   * sex rum sedan augusti) men vägen från rumsfilens `RoomSeat.seatHeight`
   * → `SharedBusinessRoom` → InteriorGuests saknades. Nionde till
   * sextonde fallet av "designen levererade i kontraktet, koden gissade".
   */
  seatHeights: number[];
  /**
   * ORDER 201 fynd 1 — sockelns tjocklek (Y-höjden av rummets golv-slab
   * över world Y=0). Alla sex rumsfilerna använder `PLINTH_M = 0.11`
   * som magic constant sedan augusti (restaurantRoom/wineBarRoom/inn/
   * nightClub deklarerar det, brewpub upprepar `+ 0.11` inline utan
   * namngivning). InteriorGuests behöver den för att lyfta gäster på
   * TOP av sockeln, inte 11 cm under. Utan detta:
   *   pelvisWorldY = groupY + 0.445 (rig hipY 0.86 - hipDrop 0.41)
   *   groupY = seatHeight (ORDER 200) → pelvis = 0.895 m för chair
   *   chair cushion top = 0.11 + 0.45 + 0.025 = 0.585 m
   *   → gäst 31 cm ÖVER stolen. Bar stools maskerade felet visuellt (bar
   *   counter är 1.21 m så en pelvis vid 1.20 läser som "lutar mot baren"),
   *   men träbord-stolar exponerar det (VO 2026-09-10 kl. 13:30: "gäster
   *   sitter bredvid/genom stolarna, inte på dem").
   * Publiceras per klass för framtida rum med annan sockel.
   */
  plinth: number;
  standing: XZ[];
  /**
   * ORDER 204/205 — rummets `staffStations` världs-XZ i deklarationsordning
   * (samma index som `stationIds` och `stationFacings`). Ölkrogen: 4
   * stations. InteriorStaff läser flata listan direkt utan roll-mappning
   * via STATION_MAP — se ORDER 204-registerraden.
   */
  stations: XZ[];
  /**
   * ORDER 205 — station-ids i samma ordning som `stations`. Behövs för
   * (a) DEV-warnings som pekar på specifikt station-id, (b) framtida
   * roll-mappning där Design kopplar en sim-roll till en station-id (se
   * `STATION_ROLE_MAPPING_QUESTION_2026-09-10.md`). Idag används endast
   * för warnings; roll-mappning kommer när Design svarar.
   */
  stationIds: string[];
  /**
   * ORDER 205 — station-facing per station i radianer (rotation.y). Speglar
   * `RoomStation.facing` i råobjektet, i värld-koordinater (adderar
   * `room.group.rotation.y`). Konsumeras av InteriorStaff för att räkna
   * home-punkten `0,6 m framför stationen` — VO 2026-09-10 kl. 16:00:
   * "Hemplatsen är fortfarande INTE stationens mittpunkt. En punkt
   * framför, vänd mot stationen, ~0,6 m ut."
   */
  stationFacings: number[];
  /**
   * ORDER 206 — hemplatserna per sim-roll i värld-koordinater. Publiceras
   * via `businessRoom.resolveStaffHomesWorldByRole(room)`. `xz` = 0,6 m
   * FRAMFÖR stationens mittpunkt (arbetssidan), `y` = rummets `floorY`
   * (`PLINTH_M`), `facing` = station-facing i värld (så figuren tittar
   * mot arbetsområdet). `null` när klassen saknar station för rollen
   * (t.ex. foodtruckens lärling). InteriorStaff läser detta direkt —
   * ingen beräkning i scenen (kontraktet äger mappningen, per VO-direktiv
   * 2026-09-10 kl. 16:30, samma pattern som ORDER 154 gjorde för
   * stationFor). ROLL→STATION-mappningen är delvis ANTAGANDE markerad
   * i STATION_MAP-kommentarerna i businessRoom.ts; öppen Design-fråga i
   * `STATION_ROLE_MAPPING_QUESTION_2026-09-10.md`.
   */
  staffHomesByRole: Record<StaffRole, { xz: XZ; y: number; facing: number } | null>;
  /**
   * ORDER 217 (C3 §3.2) — vägpunkter per roll i värld-XZ. Publiceras via
   * `businessRoom.resolveStaffPathsWorldByRole(room)`. Första waypoint är
   * rummets entrance, sista är stationen; mellanliggande punkter går via
   * korridorer så personalen undviker att korsa långborden. Tom array
   * (`[]`) för roller vars klass saknar station-mapping. InteriorStaff
   * följer path:en waypoint för waypoint med samma ease-mönster som gäster
   * använder för sin single-entrance-waypoint. Rak linje genom ett bord
   * är samma sorts fel som väggarna var (VO 2026-09-14).
   */
  staffPathsByRole: Record<StaffRole, XZ[]>;
  /**
   * ORDER 218 (C3 §3.2 uppföljning) — vägpunkter TILL VARJE SÄTE, i
   * värld-XZ, index-aligned med `seats`. Publiceras via
   * `businessRoom.resolveWalkPathsToSeatsWorld(room)`. Konsumeras av
   * InteriorStaff när staff har en `taskGuest` som är seated: staff
   * routar via denna path (samma korridorer walkPathToSeat använder)
   * i stället för rak linje till guest-render-position. Utan detta
   * korsar en servitör på väg till en gäst vid ölkrogens långbord
   * bordet — samma sorts fel som staff→home hade före ORDER 217.
   * Tom array (`[]`) för klasser vars modul inte har walkPathToSeat.
   */
  walkPathsToSeatsByIndex: XZ[][];
  entrance: XZ;
  waitingSpot: XZ;
  /**
   * ORDER 203 — kön framför entrén, per klass. Distincta punkter (2
   * laterals × 4 depths i default-formen); före ORDER 203 hade
   * `SharedBusinessRoom` bara `waitingSpot` (singular, midpunkt).
   * InteriorGuests placerade `state='waiting'`-gäster via
   * `layout.waitingSlots` — OBB-generiskt uträknat i
   * `interiorLayout.ts:288-292` med `WAITING_SLOT_DEPTHS/LATERALS`,
   * duplicerat i `restaurantRoom.ts:224-225,733-737`. Två skrivningar,
   * en läsning; kontraktet fick aldrig äga formen. Nu publiceras
   * `waitingSlots` per klass från *Scene:
   *   - RestaurantScene: `world.waitingSlots` från
   *     `resolveWorldPositions()` (redan beräknad, oanvänd före ORDER 203).
   *   - BrewpubScene: pass-through av `layout.waitingSlots` tills
   *     brewpubRoom får egen queue-form (vestibul eller sidewalk-kö).
   *   - Framtida rum (nattklubb med rope-line, gästgiveri med vestibul)
   *     definierar sin egen form i rumsfilen.
   * InteriorGuests läser `roomChan.waitingSlots`; om tomt →
   * DEV-warning + fallback till `layout.waitingSlots` (samma mönster
   * som ORDER 200 §3.1: fallback är signal att data saknas).
   */
  waitingSlots: XZ[];
  capacity: number;
  // ORDER 204 — `staffStationsByRole: Record<StaffRole, XZ | null>` bort-
  // taget. Design (via VO 2026-09-10 kl. 15:30) klargjorde att fältet
  // heter `stations` (kontraktet) / `staffStations` (raw); ölkrogen har
  // fyra. InteriorStaff läser den flata `stations`-listan direkt utan
  // roll-härledning. Se ORDER 154:s ursprung (roll-mapping via
  // `stationFor`) och ORDER 204:s revert-registerrad.
}

export const businessRoomRef: { current: SharedBusinessRoom | null } = {
  current: null
};

// ORDER 150 — dev-only window-handle så playwright-verifieraren kan
// läsa refens innehåll (samma pattern som `__nxSimState` /
// `__nxSetBusinessName`). Tree-shakas i prod-bygget. Sätts en gång:
// refens IDENTITET är stabil, `.current` uppdateras av scenerna in
// place, så handle:t behöver aldrig skrivas igen.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __nxBusinessRoomRef?: unknown }).__nxBusinessRoomRef = businessRoomRef;
  // ORDER 196 — dev-only window-handle till render-lagrets staff-XZ
  // (world-koordinater). InteriorStaff skriver dit varje frame; ORDER
  // 196:s waypoint-clamp verifieras genom att läsa max distFromCentre
  // över tid och jämföra mot layout.width/2 * 1.02. Sim-lagrets
  // staff.position är i lokal building-frame (kring origin) och kan
  // INTE användas för väggclamp-verifiering.
  (window as unknown as { __nxStaffPositions?: unknown }).__nxStaffPositions = staffPositionsRef;
  // ORDER 198 — dev-only window-handle till render-lagrets pose-val
  // per staff. Verify-skriptet räknar hur ofta varje pose väljs
  // under service och bekräftar att poseGreet + poseCarry faktiskt
  // eldar när task-pipelinen levererar greet-/carry-tasks.
  (window as unknown as { __nxStaffPoses?: unknown }).__nxStaffPoses = staffPosesRef;
}
