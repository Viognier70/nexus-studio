// ORDER 322 B.2 (Anders 2026-10-09: "etiketterna får inte ligga på varandra").
//
// Byns etiketter är tre slag, alla drei-Html i scenen: krogarnas skyltar (VillageVenues.tsx, som redan flyttar
// dem isär sinsemellan, ORDER 297/300), sällskapen på väg till krogen (StreetArrivals.tsx) och gatunamnen
// (StreetLabels.tsx). De två sista räknades inte mot något. Här, några gånger i sekunden, i den ordning de är
// viktiga:
//   1. krogarnas skyltar står kvar där VillageVenues ställt dem;
//   2. sällskapen, i den ordning de står (närmast dörren först);
//   3. gatunamnen, huvudvägarna först (gb-street-main, -major, -secondary, -local).
// En etikett som skulle ligga på en som redan står döljs (visibility), tills den har plats igen. Rektangeln är
// den omslutande på skärmen (getBoundingClientRect), för ett vridet gatunamn alltså något större än texten.
// scripts/order322-etiketter.mjs mäter samma rektanglar i produktionsbygget.

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

const EVERY_N_FRAMES = 6;
/** Luft mellan två etiketter, px. */
const GAP_PX = 2;

const STREET_TIERS = ['main', 'major', 'secondary', 'local'];

interface Box { x0: number; x1: number; y0: number; y1: number }

function boxOf(el: Element): Box | null {
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  return { x0: r.left - GAP_PX, x1: r.right + GAP_PX, y0: r.top - GAP_PX, y1: r.bottom + GAP_PX };
}

const hits = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

/** En etikett som StreetLabels tonat bort (opacity) eller som inte syns räknas inte. */
function faded(el: HTMLElement): boolean {
  return Number(el.style.opacity || '1') <= 0.02;
}

export function declutterLabels(root: ParentNode = document): { hidden: number } {
  const placed: Box[] = [];
  for (const el of root.querySelectorAll('.nx-venue-label')) {
    const b = boxOf(el);
    if (b) placed.push(b);
  }
  const yielding: HTMLElement[] = [
    ...root.querySelectorAll<HTMLElement>('.nx-street-tag'),
    ...STREET_TIERS.flatMap((t) => [...root.querySelectorAll<HTMLElement>(`.gb-street-label.gb-street-${t}`)])
  ];
  let hidden = 0;
  for (const el of yielding) {
    const b = faded(el) ? null : boxOf(el);
    const clash = !!b && placed.some((p) => hits(b, p));
    if (b && !clash) placed.push(b);
    const want = clash ? 'hidden' : '';
    if (el.style.visibility !== want) el.style.visibility = want;
    if (clash) hidden++;
  }
  return { hidden };
}

export function LabelDeclutter() {
  const frame = useRef(0);
  useFrame(() => {
    if (++frame.current % EVERY_N_FRAMES === 0) declutterLabels();
  });
  return null;
}
