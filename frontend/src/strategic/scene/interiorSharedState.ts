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
  standing: XZ[];
  stations: XZ[];
  entrance: XZ;
  waitingSpot: XZ;
  capacity: number;
  /**
   * ORDER 154 — sim-rollernas hemstationer i värld-XZ, mappade via
   * `stationFor(role, room)` i businessRoom.ts. `null` för roller
   * vars klass saknar station enligt STATION_MAP (t.ex. nattklubbens
   * kock, foodtruckens värd). InteriorStaff läser detta i stället
   * för att räkna ur restaurangens layout — så personalpuckarna
   * hamnar på rummets faktiska stationer per klass.
   */
  staffStationsByRole: Record<StaffRole, XZ | null>;
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
}
