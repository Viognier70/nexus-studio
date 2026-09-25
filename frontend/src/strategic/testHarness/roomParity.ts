// ORDER 266 — samma rum i harnessen som i spelarens vy.
//
// Simuleringen läser platsernas positioner ur rummet som 3D-scenen
// monterar (`businessRoomRef`, service.ts `seatSlot`). Utan scen faller
// den tillbaka på `INTERIOR.seatOrder` (tolv platser; plats 12–15 hamnar
// på samma punkt), och då blir gångvägar och genomströmning andra än i
// spelet. Mätt 2026-09-25, fredag vecka 1 med brons i tre, standardfrö:
// utan rummet 53 gäster, längsta kö 8, ryktet 0,96 → 0,76; med rummet
// längsta kö 0, ryktet 1,00 → 1,00. Harnessens tal gällde alltså inte
// spelaren.
//
// Den här funktionen bygger rummet med samma funktioner som
// RestaurantScene/BrewpubScene (`computePlayerBusinessInterior`,
// `createRoom`, `resolveWorldPositions`) och sätter de fält simuleringen
// läser (`seatsLocal`, `seats`, `capacity`). Scenen publicerar fler fält
// (personalens vägar, navigering) som bara rendereringen läser.
// Replikeringen är dokumenterad här enligt CLAUDE.md "Mätningar mot det
// de beskriver"; scenens kod ligger i scene/RestaurantScene.tsx och
// scene/BrewpubScene.tsx.

import { businessRoomRef } from '../scene/interiorSharedState';
import { createRoom, resolveWorldPositions } from '../scene/businessRoom';
import { computePlayerBusinessInterior } from '../business/interiorLayout';
import type { SimulationState } from '../types';

// Rum som monteras via rumskontraktet i spelet (övriga klasser har egna
// vyer utan businessRoomRef, och simuleringen använder då reservlistan
// även i spelet).
const CONTRACT_ROOMS: readonly SimulationState['businessClass'][] = ['kvarterskrogen', 'ölkrogen'];

export function mountRoomLikeScene(businessClass: SimulationState['businessClass']): void {
  if (businessRoomRef.current?.businessClass === businessClass) return;
  businessRoomRef.current = null;
  if (!CONTRACT_ROOMS.includes(businessClass)) return;
  const layout = computePlayerBusinessInterior(businessClass);
  if (!layout) return;
  const room = createRoom(businessClass, { width: layout.width, depth: layout.depth });
  room.group.position.set(layout.centre[0], 0, layout.centre[1]);
  room.group.rotation.y = -layout.worldAngle;
  const world = resolveWorldPositions(room);
  businessRoomRef.current = {
    businessClass,
    seats: world.seats as [number, number][],
    seatsLocal: room.seats.map((s: { local: [number, number] }) => s.local),
    capacity: room.capacity
  } as unknown as typeof businessRoomRef.current;
}
