// ORDER 309 — kortet för gäst och personal (Designs D5 staffStatus.ts
// STATUS_CARD): vilket kort som är öppet (högst ett, maxOpen 1), och var
// figurens huvud står på skärmen. Scenen (WineBarFigures) öppnar kortet vid
// klick och skriver ankaret varje bildruta; HUD:en (StatusCard.tsx) läser det.

import type { StaffKey } from '../scene/wineBarDirector';

export type OpenCard = { kind: 'staff'; key: StaffKey } | { kind: 'guest'; guestId: string };

let open: OpenCard | null = null;
const subs = new Set<() => void>();

/** Huvudets läge i fönstret (px), eller null när figuren inte syns. Skrivs per bildruta, utan att meddela. */
export const cardAnchor: { current: { x: number; y: number } | null } = { current: null };

export const openCard = () => open;
export function setOpenCard(c: OpenCard | null): void {
  const same = c === open || (!!c && !!open && c.kind === open.kind && (c.kind === 'staff' ? c.key === (open as { key: StaffKey }).key : c.guestId === (open as { guestId: string }).guestId));
  if (same) return;
  open = c;
  if (!c) cardAnchor.current = null;
  subs.forEach((f) => f());
}
export function subscribeOpenCard(f: () => void): () => void {
  subs.add(f);
  return () => { subs.delete(f); };
}
