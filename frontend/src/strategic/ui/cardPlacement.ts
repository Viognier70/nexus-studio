// ORDER 309 — var kortet för gäst och personal öppnas (Designs D5
// hudLayout.ts placeCard), mot spelets egna paneler.
//
// D5:s placeCard räknar mot prototypens HUD (layout()). Spelets HUD har andra
// paneler och mått, så kortet placeras här mot panelernas verkliga rutor
// (mätta i DOM:en av StatusCard.tsx) med samma regler: bredvid figuren, åt
// den sida som har plats (höger när figuren står i fönstrets vänstra 55 %),
// 4 % av höjden från figuren, ovanför figurens huvud med 35 % av kortet, och
// aldrig över en panel (checkOverlaps ger tomt). Hittas ingen fri plats på
// figurens sida prövas andra sidan, sedan glidande nedåt och uppåt.

import { checkOverlaps, type Rect } from './hudLayout';

const MARGIN = 0.024; // av höjden, som D5:s luft under ställningen och över knapparna
const GAP = 0.04; // av höjden, mellan figuren och kortet (D5 gap)

export function placeCardAmong(W: number, H: number, anchor: [number, number], cw: number, chh: number, panels: Rect[]): Rect {
  const gap = GAP * H;
  const m = MARGIN * H;
  const preferRight = anchor[0] < W * 0.55;
  const first = preferRight ? anchor[0] + gap : anchor[0] - gap - cw;
  // Figurens sida, den andra sidan, och sedan tätt intill panelernas kanter,
  // närmast figuren först (en figur bakom en panel får kortet bredvid panelen).
  const edges = panels.flatMap((p) => [p.x + p.w + m, p.x - m - cw]);
  const xs = [first, preferRight ? anchor[0] - gap - cw : anchor[0] + gap, ...edges.sort((a, b) => Math.abs(a - first) - Math.abs(b - first))];
  const minY = m;
  const maxY = H - m - chh;
  const y0 = Math.max(minY, Math.min(maxY, anchor[1] - chh * 0.35));
  const clampX = (x: number) => Math.max(m, Math.min(W - m - cw, x));
  const step = Math.max(8, Math.round(0.02 * H));
  const free = (r: Rect) => checkOverlaps(panels, [r]).every(([a, b]) => a !== 'statusCard' && b !== 'statusCard');
  const at = (x: number, y: number): Rect => ({ id: 'statusCard', x: Math.round(x), y: Math.round(y), w: Math.round(cw), h: Math.round(chh) });
  let best: { r: Rect; cost: number } | null = null;
  for (const xRaw of xs) {
    const x = clampX(xRaw);
    // Från figurens höjd, sedan växelvis nedåt och uppåt.
    for (let k = 0; k <= Math.ceil(H / step); k++) {
      for (const dir of k === 0 ? [0] : [1, -1]) {
        const y = y0 + dir * k * step;
        if (y < minY || y > maxY) continue;
        const r = at(x, y);
        if (free(r)) return r;
      }
    }
    // Ingen fri plats: den med minst överlapp (räknas, så att kontrollen ser det).
    const r = at(x, y0);
    const cost = overlapArea(r, panels);
    if (!best || cost < best.cost) best = { r, cost };
  }
  return best!.r;
}

function overlapArea(r: Rect, panels: Rect[]): number {
  let a = 0;
  for (const p of panels) {
    const w = Math.min(r.x + r.w, p.x + p.w) - Math.max(r.x, p.x);
    const h = Math.min(r.y + r.h, p.y + p.h) - Math.max(r.y, p.y);
    if (w > 0 && h > 0) a += w * h;
  }
  return a;
}

/** Trådens ändpunkt på kortet: närmaste punkt på kortets kant mot ankaret. */
export function threadEnd(card: Rect, anchor: [number, number]): [number, number] {
  return [Math.max(card.x, Math.min(card.x + card.w, anchor[0])), Math.max(card.y, Math.min(card.y + card.h, anchor[1]))];
}
