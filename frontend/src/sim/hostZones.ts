// ORDER 296 (kärnan punkt 1) — rummets zoner för hovmästarens Flytta
// personal: baren, golvet och loungerna, ur sitsens sort i det monterade
// rummet (businessRoomRef.seatKinds). Läses av sim/hostPins.ts och av
// service.ts (uppgifternas tid), utan cirkelimport.

import type { SimulationState } from '../strategic/types';
import { HOST } from './balance';
import { businessRoomRef } from '../strategic/scene/interiorSharedState';

export type HelpZone = 'bar' | 'floor' | 'lounge';

export function seatKindOf(seat: number | null | undefined): string {
  if (seat === null || seat === undefined) return '';
  return businessRoomRef.current?.seatKinds?.[seat] ?? '';
}

export function zoneOfSeat(seat: number | null | undefined): HelpZone {
  const k = seatKindOf(seat);
  return k === 'bar' ? 'bar' : k === 'lounge' ? 'lounge' : 'floor';
}

// Uppgiftens tid efter var personalen står: fortare i zonen dit spelaren
// flyttat någon, lite långsammare i de andra, så länge flytten gäller.
export function helpTaskTime(state: SimulationState, targetSeat: number | null | undefined): number {
  const h = state.day.helpZone;
  if (!h || state.simTime > h.until) return 1;
  return zoneOfSeat(targetSeat) === h.zone ? HOST.helpZoneTaskTime : HOST.helpOtherTaskTime;
}
