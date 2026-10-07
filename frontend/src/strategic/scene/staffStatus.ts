// staffStatus.ts — D5 (2026-10-04): personalens ork och trivsel, statusläget och kortet för gäst och personal.
// ORDER 303 E–F. Orken är en ring vid fötterna i tre lägen, trivseln en symbol bredvid. Inget rött eller grönt,
// och ingen av rollernas färger (staffRing.ts): rollringen är ljus och i ton, orkringen är mörk och delad i tre.
// Formen bär läget, inte färgen. Talen (gränserna, hur fort orken sjunker) sätter Code i balance.ts (STAFF_STATE).

import { ROLE_RING as D6_ROLE_RING } from '../ui/d6Ui';
export type StaminaId = 'fresh' | 'tired' | 'spent';
export type WellbeingId = 'thriving' | 'okay' | 'low';
export const STAMINA: StaminaId[] = ['fresh', 'tired', 'spent'];
export const WELLBEING: WellbeingId[] = ['thriving', 'okay', 'low'];

/** Läget ur orken 0–1. Gränserna är platshållare tills balance.ts har STAFF_STATE.staminaBands. */
export function staminaOf(v: number, bands = [0.66, 0.33]): StaminaId { return v >= bands[0] ? 'fresh' : v >= bands[1] ? 'tired' : 'spent'; }
export function wellbeingOf(v: number, bands = [0.66, 0.33]): WellbeingId { return v >= bands[0] ? 'thriving' : v >= bands[1] ? 'okay' : 'low'; }

// ---------- orkringen ----------
// Utanför rollringen (0,42–0,56 m): 0,64–0,76 m, tre bågar à 108° med 12° glipa, räknade från klockan 6
// (mot kameran) medurs. Fylld båge = kvar. Pigg: tre fyllda. Trött: två fyllda, en tom. Slut: en fylld, två tomma.
// Fylld: bläck #2a1c13 på 88 % med en kant i papper. Tom: bara den streckade kanten. Vid 24 m och 1440 × 900 är
// ringen 60 px bred och bågen 5 px. Ingen puls: det som pulserar i spelet är ljuslåga och betyder något annat.
export const ORK_RING = {
  innerM: 0.64, outerM: 0.76, yM: 0.04, segments: 3, gapDeg: 12, startDeg: 90,
  filled: { fill: 'rgba(42,28,19,.88)', edge: 'rgba(245,234,213,.85)', edgePx: 1.5 },
  empty: { fill: 'rgba(42,28,19,.18)', edge: 'rgba(245,234,213,.7)', edgePx: 1.5, dash: [3, 4] },
  /** Hur många bågar som är fyllda per läge. */
  count: { fresh: 3, tired: 2, spent: 1 } as Record<StaminaId, number>,
  /** När ringen syns: i statusläget för alla, och utanför det bara för den som är slut. */
  show: { statusMode: 'all', otherwise: ['spent'] as StaminaId[] }
};

/** Rollringens färger från leverans 2026-09-30 (staffRing.ts), för att rita båda i prototypen. */
// ORDER 317 (Anders 2026-10-07, BESLUT del 4 punkt 8; Designs D6 d6Ui.ROLE_RING):
// ringen under figuren gäller, kocken är #7fa8ff (förut #ffffff här). Samma tabell
// som staffRing.ts ROLE_COLOUR och teckenförklaringen.
export const ROLE_RING: Record<string, string> = { ...D6_ROLE_RING };
export const ROLE_RING_M = { innerM: 0.42, outerM: 0.56 };

type Project = (p: [number, number, number]) => [number, number];

function arcPoly(project: Project, x: number, z: number, y: number, r0: number, r1: number, a0: number, a1: number, n = 18): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push(project([x + Math.cos(a) * r1, y, z + Math.sin(a) * r1])); }
  for (let i = n; i >= 0; i--) { const a = a0 + (a1 - a0) * i / n; pts.push(project([x + Math.cos(a) * r0, y, z + Math.sin(a) * r0])); }
  return pts;
}
function fillPoly(c: CanvasRenderingContext2D, pts: [number, number][]) { c.beginPath(); pts.forEach(([a, b], i) => (i ? c.lineTo(a, b) : c.moveTo(a, b))); c.closePath(); }

/** Ritar rollringen (valfri) och orkringen på en 2D-duk över rummet. camYaw: kamerans vridning, så att klockan 6 är mot kameran. */
export function drawStaffRings(c: CanvasRenderingContext2D, project: Project, x: number, z: number, o: { stamina: StaminaId; role?: string; camYaw: number; alpha?: number; showOrk?: boolean }) {
  const A = o.alpha ?? 1, R = ORK_RING, front = Math.atan2(Math.cos(o.camYaw), Math.sin(o.camYaw));
  c.save(); c.globalAlpha = A;
  if (o.role && ROLE_RING[o.role]) {
    c.fillStyle = ROLE_RING[o.role]; c.globalAlpha = A * 0.9;
    fillPoly(c, arcPoly(project, x, z, 0.036, ROLE_RING_M.innerM, ROLE_RING_M.outerM, 0, Math.PI * 2, 40)); c.fill();
    c.globalAlpha = A;
  }
  if (o.showOrk !== false) {
    const seg = (Math.PI * 2) / R.segments, gap = (R.gapDeg * Math.PI) / 180, n = R.count[o.stamina];
    for (let i = 0; i < R.segments; i++) {
      // Första bågen är centrerad mot kameran, sedan medurs sett uppifrån.
      const a0 = front - seg / 2 + gap / 2 + i * seg, a1 = a0 + seg - gap, filled = i < n, st = filled ? R.filled : R.empty;
      const p = arcPoly(project, x, z, R.yM, R.innerM, R.outerM, a0, a1);
      fillPoly(c, p); c.fillStyle = st.fill; c.fill();
      c.lineWidth = st.edgePx; c.strokeStyle = st.edge; c.setLineDash(filled ? [] : R.empty.dash); c.stroke(); c.setLineDash([]);
    }
  }
  c.restore();
}

// ---------- trivseln ----------
// En kvadratisk platta med rundade hörn (gästernas stämning är rund), 20 px, i valnöt med mässingskant.
// Glödens tre lägen: trivs = hel låga, lagom = liten låga, trivs inte = släckt veke med en rökslinga.
// Plattan står vid orkringens högra kant, mot kameran, och följer figuren.
export const WELLBEING_SYMBOL = {
  sizePx: 20, radiusPx: 5, plate: '#3a281c', rim: '#f0cd82', glyph: '#f5ead5', offsetM: 0.95,
  glyphs: {
    thriving: [{ mode: 'fill', d: 'M12 4.2 C14.8 7.6 17.2 10.2 17.2 13.6 C17.2 16.8 14.9 19.4 12 19.4 C9.1 19.4 6.8 16.8 6.8 13.6 C6.8 11.4 8.2 9.8 9.4 8.6 C9.6 10.4 10.4 11.4 11.4 11.8 C11 9.2 11.2 6.6 12 4.2 Z' }],
    okay: [{ mode: 'fill', d: 'M12 9.4 C13.8 11.4 15.2 13 15.2 15.1 C15.2 17.1 13.8 18.6 12 18.6 C10.2 18.6 8.8 17.1 8.8 15.1 C8.8 13.2 10.4 11.6 12 9.4 Z' }, { mode: 'stroke', w: 1.6, d: 'M7.6 19.6 H16.4' }],
    low: [{ mode: 'stroke', w: 1.8, d: 'M12 19.4 V14.6' }, { mode: 'stroke', w: 1.6, d: 'M12 13.4 C10.2 11.8 13.8 10.2 12 8.4 C10.6 7 12.6 5.8 12.4 4.6' }, { mode: 'stroke', w: 1.6, d: 'M7.6 19.6 H16.4' }]
  } as Record<WellbeingId, { mode: string; w?: number; d: string }[]>
};

export function wellbeingSvg(id: WellbeingId, px = 40): string {
  const S = WELLBEING_SYMBOL, parts = S.glyphs[id].map((p) => p.mode === 'fill' ? `<path d="${p.d}" fill="${S.glyph}"/>` : `<path d="${p.d}" fill="none" stroke="${S.glyph}" stroke-width="${p.w}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 24 24"><rect x="1.2" y="1.2" width="21.6" height="21.6" rx="5.4" fill="${S.plate}" stroke="${S.rim}" stroke-width="1.6"/>${parts}</svg>`;
}
export function drawWellbeing(c: CanvasRenderingContext2D, id: WellbeingId, x: number, y: number, px?: number, alpha?: number) {
  const S = WELLBEING_SYMBOL, s = (px ?? S.sizePx) / 24;
  c.save(); c.globalAlpha = alpha ?? 1; c.translate(x - 12 * s, y - 12 * s); c.scale(s, s);
  c.shadowColor = 'rgba(20,13,9,.55)'; c.shadowBlur = 6;
  const r = new Path2D('M6.6 1.2 H17.4 A5.4 5.4 0 0 1 22.8 6.6 V17.4 A5.4 5.4 0 0 1 17.4 22.8 H6.6 A5.4 5.4 0 0 1 1.2 17.4 V6.6 A5.4 5.4 0 0 1 6.6 1.2 Z');
  c.fillStyle = S.plate; c.fill(r); c.shadowBlur = 0; c.lineWidth = 1.6; c.strokeStyle = S.rim; c.stroke(r);
  S.glyphs[id].forEach((p) => { const P = new Path2D(p.d); if (p.mode === 'fill') { c.fillStyle = S.glyph; c.fill(P); } else { c.lineWidth = p.w ?? 1.6; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = S.glyph; c.stroke(P); } });
  c.restore();
}

// ---------- statusläget ----------
// Tangenten S eller knappen nere till höger håller statusläget på tills man trycker igen. I statusläget:
// stämningssymbolen (guestMood.ts) över alla bord på en gång, orkringen och trivselplattan vid all personal.
// Allt annat i HUD:en står kvar. Tonas in på 180 ms. Rummet dämpas inte (det är ingen paus).
export const STATUS_MODE = { key: 'S', toggle: true, fadeMs: 180, button: { icon: 'scan-eye', corner: 'bottomRight' }, dimRoom: 0 };

// ---------- kortet ----------
// Klick på en gäst eller i personalen öppnar ett litet kort i papper bredvid figuren, med en prickad tråd i
// ljuslåga från huvudet till kortet (samma som hovmästarens nålar). Kortet öppnas åt sidan, över en vägg eller
// gatan, aldrig över ett bord, och aldrig över en panel (hudLayout.checkOverlaps). Esc eller klick utanför stänger.
export const STATUS_CARD = {
  widthCqh: 34, minWidthPx: 260, radiusPx: 14, paper: '#f5ead5', ink: '#2a1c13', muted: '#6b5443', kicker: '#9a6a2a',
  gapFromFigureCqh: 4, thread: { colour: '#ffd58f', dash: [2, 7] }, maxOpen: 1,
  staffRows: ['stamina', 'wellbeing', 'tipsTonight', 'topics'],
  guestRows: ['group', 'mood', 'forgives'],
  /** Kunskapsområdena: en rad per område, tre prickar (0–3) eller *Saknas* med streckad kant. */
  topics: ['wine', 'cheese', 'fish', 'service', 'spirits', 'cigar'],
  topicDots: { on: '#2a1c13', off: 'rgba(42,28,19,.2)', missing: '1.5px dashed rgba(42,28,19,.55)' }
};
