// hudLayout.ts — D5 (2026-10-04): panelernas platser i två lägen, och kontrollen som fäller på överlapp.
// ORDER 303 G. Provspelet: "menyerna skymmer ibland varandra" och "menyerna tar en del av bilden när man går
// närmare". Två ändringar: raketkortet flyttas ned under ställningen (det låg över bandet), och fokusläget fäller
// ihop panelerna till smala lister i kanterna under 14 m eller med H. Kassan, klockan och mätaren står kvar.
// Måtten följer prototyperna: cqw/cqh av skärmen, med golv i px. Kör checkOverlaps i layoutkörningen för båda
// storlekarna och båda lägena, och för varje öppet kort och nålkort; en träff ska fälla bygget.

export type Mode = 'normal' | 'focus';
export interface Rect { id: string; x: number; y: number; w: number; h: number }

export const FOCUS_MODE = {
  /** Fokusläget slås på när kameran går under 14 m och av först över 15,5 m, så att det inte fladdrar. */
  enterBelowM: 14, exitAboveM: 15.5, key: 'H', keyToggles: true,
  foldMs: 280, ease: 'cubic-bezier(.2,.8,.2,1)',
  /** Det som står kvar i full form (krympt till en rad): klockan, kassan och mätaren. */
  keeps: ['clock', 'till', 'meter'],
  /** Det som fälls till lister: ställningen (en tunn rad lyktor), raketkortet (vänsterkanten, med pyramiden i
   *  liten skala), flikarna (nederkanten). Nålkorten stängs, nålarna står kvar. Kortet för gäst och personal stängs. */
  folds: { rival: 'topStrip', rocket: 'leftStrip', tabs: 'bottomStrip', pinCards: 'close', statusCard: 'close' },
  /** Ett klick på en list öppnar panelen igen i fokusläget, ovanpå inget annat (den fälls ut åt mitten). */
  stripClick: 'unfold'
};

const px = (v: number) => Math.round(v);
export function layout(W: number, H: number, mode: Mode): Rect[] {
  const cw = W / 100, ch = H / 100, out: Rect[] = [];
  if (mode === 'normal') {
    const wc = Math.max(280, 23 * cw), wt = Math.max(470, 39 * cw), wm = Math.max(230, 17 * cw), hh = Math.max(76, 10.4 * ch), g = 1.2 * ch;
    const rowW = wc + wt + wm + 2 * g, x0 = (W - rowW) / 2, y0 = 2.6 * ch;
    out.push({ id: 'clock', x: x0, y: y0, w: wc, h: hh }, { id: 'till', x: x0 + wc + g, y: y0, w: wt, h: hh }, { id: 'meter', x: x0 + wc + wt + 2 * g, y: y0, w: wm, h: hh });
    const ry = y0 + hh + ch, rh = Math.max(50, 7 * ch);
    out.push({ id: 'rival', x: x0, y: ry, w: rowW, h: rh });
    // Raketkortet: under ställningen, 2,4 % luft. Förut började det på 13 % och låg över bandet.
    const rcY = ry + rh + 2.4 * ch, tabH = Math.max(44, 6 * ch);
    out.push({ id: 'rocket', x: 3.5 * cw, y: rcY, w: Math.max(340, 29 * cw), h: H - 3 * ch - tabH - 2.4 * ch - rcY });
    out.push({ id: 'tabs', x: 2.5 * cw, y: H - 3 * ch - tabH, w: 3 * tabH + 2 * ch, h: tabH });
    out.push({ id: 'modeKeys', x: W - 2.5 * cw - (2 * Math.max(118, 15 * ch) + ch), y: H - 3 * ch - tabH, w: 2 * Math.max(118, 15 * ch) + ch, h: tabH });
  } else {
    const wc = Math.max(150, 11 * cw), wt = Math.max(250, 20 * cw), wm = Math.max(170, 12 * cw), hh = Math.max(40, 5.4 * ch), g = 0.8 * ch;
    const rowW = wc + wt + wm + 2 * g, x0 = (W - rowW) / 2, y0 = 1.2 * ch;
    out.push({ id: 'clock', x: x0, y: y0, w: wc, h: hh }, { id: 'till', x: x0 + wc + g, y: y0, w: wt, h: hh }, { id: 'meter', x: x0 + wc + wt + 2 * g, y: y0, w: wm, h: hh });
    out.push({ id: 'rival', x: x0, y: y0 + hh + 0.6 * ch, w: rowW, h: Math.max(16, 2.2 * ch) });
    const sw = Math.max(44, 5.6 * ch);
    out.push({ id: 'rocket', x: 0, y: 30 * ch, w: sw, h: 40 * ch });
    const th = Math.max(32, 4.2 * ch);
    out.push({ id: 'tabs', x: 2.5 * cw, y: H - 1.2 * ch - th, w: 3 * th + 1.2 * ch, h: th });
    out.push({ id: 'modeKeys', x: W - 2.5 * cw - (2 * Math.max(96, 12 * ch) + 0.8 * ch), y: H - 1.2 * ch - th, w: 2 * Math.max(96, 12 * ch) + 0.8 * ch, h: th });
  }
  return out.map((r) => ({ id: r.id, x: px(r.x), y: px(r.y), w: px(r.w), h: px(r.h) }));
}

/** Alla par som överlappar (kanterna får nudda). Tom lista = godkänt. Lägg till öppna kort med extra. */
export function checkOverlaps(rects: Rect[], extra: Rect[] = []): [string, string][] {
  const all = [...rects, ...extra], bad: [string, string][] = [];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const a = all[i], b = all[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) bad.push([a.id, b.id]);
  }
  return bad;
}

/** Så att Code kan köra kontrollen i layoutkörningen: båda storlekarna, båda lägena. */
export function checkAll(): { size: string; mode: Mode; overlaps: [string, string][] }[] {
  const r: { size: string; mode: Mode; overlaps: [string, string][] }[] = [];
  [[1440, 900], [1280, 720]].forEach(([w, h]) => (['normal', 'focus'] as Mode[]).forEach((m) => r.push({ size: w + '×' + h, mode: m, overlaps: checkOverlaps(layout(w, h, m)) })));
  return r;
}

/** Var ett kort får öppnas: bredvid ankaret, inom rummets fria yta (inte över panelerna). */
export function placeCard(W: number, H: number, mode: Mode, anchor: [number, number], cw: number, chh: number): Rect {
  const R = layout(W, H, mode), gap = 0.04 * H;
  const right = anchor[0] < W * 0.55, x = right ? anchor[0] + gap : anchor[0] - gap - cw;
  const top = Math.max(...R.filter((r) => r.id === 'rival').map((r) => r.y + r.h)) + 0.024 * H;
  const bottom = Math.min(...R.filter((r) => r.id === 'tabs' || r.id === 'modeKeys').map((r) => r.y)) - 0.024 * H;
  const y = Math.max(top, Math.min(bottom - chh, anchor[1] - chh * 0.35));
  return { id: 'statusCard', x: Math.round(x), y: Math.round(y), w: Math.round(cw), h: Math.round(chh) };
}
