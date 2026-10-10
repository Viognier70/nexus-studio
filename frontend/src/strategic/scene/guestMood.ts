// guestMood.ts — gästernas stämning. Leverans 2026-10-03 (D1), tillägg till vardagens koreografi.
// Fem lägen, symbolerna över borden, ansiktena i närbild, mätaren i HUD:en och konsekvensögonblicket
// efter ett raketsvar. Den varma formen (nexusTheme.warm.ts) och regeln från 2026-09-30 gäller:
// rött och grönt är bara rätt och fel svar, så ingen stämning är röd eller grön.
// Inga speltal: gränser, vikter och förändringar ligger i balance.ts (MOOD_BALANCE nedan är nycklarna).

// ORDER 299 — Designs fil (leverans D1), monterad. Lägena (MoodId, MOODS)
// står i sim/guestMood.ts och värdena (MOOD_BALANCE) i sim/balance.ts, som
// leveransen säger; resten är Designs, oförändrat.
import type { MoodId } from '../../sim/guestMood';
export type { MoodId } from '../../sim/guestMood';
export { MOODS } from '../../sim/guestMood';
export { MOOD_BALANCE } from '../../sim/balance';

// ---------- symbolerna ----------------------------------------------------
// En rund bricka med en ritad figur, 24 px på skärmen oavsett kamerans avstånd. Två grupper:
// ljus bricka med mörk figur (allt är bra eller på väg) och mörk bricka med ljus figur och
// mässingskant (det behövs något). Figuren skiljer lägena åt, inte färgen: solgnistor, hjärta,
// timglas, väckarklocka och moln. Mätt i full storlek i båda ljusen (kontrollbilderna symboler-*).

export interface GlyphPart { d: string; mode: 'fill' | 'stroke'; w?: number; evenodd?: boolean }
export interface MoodSymbolSpec { plate: string; rim: string; glyph: string; halo: string; parts: GlyphPart[]; group: 'light' | 'dark' }

export const MOOD_SYMBOL = {
  sizePx: 24,
  /** Ritat på ett rutnät 24 × 24. Brickan har radien 10,5 och kanten 2 px. */
  grid: 24, plateR: 10.5, rimW: 2,
  /** Över bordets mitt (småbord), över dynornas mitt i loungen (huvudena skymmer annars bordet), eller över
   *  huvudet på en ensam gäst (bar, kö). Meter över golvet; guestHeadM räknas från hjässan. */
  anchor: { tableM: 1.6, loungeM: 1.75, guestHeadM: 0.42 },
  /** Mellan två symboler som skulle överlappa på skärmen: minst 4 px, den senast ändrade överst. */
  minGapPx: 4,
  /** Visas: alltid för väntar, otålig och missnöjd. Glad och nöjd i {showPositiveS} s efter att läget ändrats. */
  show: { always: ['waiting', 'impatient', 'displeased'] as MoodId[], showPositiveS: 4, fadeS: 0.4 },
  /** Rörelserna följer svarsraderna (WARM_RIGHT_WRONG.motion): bättre lyfter, sämre skakar. Aldrig puls. */
  motion: {
    better: { from: 0, scale: [0.6, 1.08, 1], scaleMs: [0, 220, 360], lift: { px: -6, to: 520, curve: 'sin' } },
    worse: { from: 0, scale: [0.6, 1], scaleMs: [0, 200], shake: { px: 4, cycles: 3, from: 120, to: 480, damped: true } },
    reducedMotion: 'tonas in på 160 ms, ingen lyftning eller skakning'
  },
  moods: {
    delighted: {
      group: 'light', plate: '#e8b93a', rim: '#2a1c13', glyph: '#2a1c13', halo: 'rgba(255,213,143,.55)',
      parts: [
        { mode: 'fill', d: 'M10.5 5.6 Q11.3 11.2 16.9 12.2 Q11.3 13.2 10.5 18.8 Q9.7 13.2 4.1 12.2 Q9.7 11.2 10.5 5.6 Z' },
        { mode: 'fill', d: 'M16.6 4.4 Q17 6.5 19 6.9 Q17 7.3 16.6 9.4 Q16.2 7.3 14.2 6.9 Q16.2 6.5 16.6 4.4 Z' }
      ]
    },
    content: {
      group: 'light', plate: '#f5ead5', rim: '#2a1c13', glyph: '#2a1c13', halo: 'rgba(255,213,143,.55)',
      parts: [{ mode: 'fill', d: 'M12 18.2 C6.8 14.6 5.6 11.8 5.6 9.9 C5.6 7.8 7.1 6.4 9 6.4 C10.4 6.4 11.4 7.2 12 8.3 C12.6 7.2 13.6 6.4 15 6.4 C16.9 6.4 18.4 7.8 18.4 9.9 C18.4 11.8 17.2 14.6 12 18.2 Z' }]
    },
    waiting: {
      group: 'light', plate: '#e9d9bc', rim: '#2a1c13', glyph: '#2a1c13', halo: 'rgba(255,213,143,.55)',
      parts: [
        { mode: 'fill', evenodd: true, d: 'M7.2 5.4 H16.8 V7 H15.9 C15.9 9.6 14.1 10.9 12.9 12 C14.1 13.1 15.9 14.4 15.9 17 H16.8 V18.6 H7.2 V17 H8.1 C8.1 14.4 9.9 13.1 11.1 12 C9.9 10.9 8.1 9.6 8.1 7 H7.2 Z M12 13.3 C13.1 14.1 14.3 15.1 14.3 17 H9.7 C9.7 15.1 10.9 14.1 12 13.3 Z' },
        { mode: 'fill', d: 'M10.2 17 Q12 15.5 13.8 17 Z' }
      ]
    },
    impatient: {
      group: 'dark', plate: '#3a281c', rim: '#f0cd82', glyph: '#ffd58f', halo: 'rgba(20,13,9,.55)',
      parts: [
        { mode: 'stroke', w: 2, d: 'M12 7.9 A5.3 5.3 0 1 1 11.99 7.9 Z' },
        { mode: 'stroke', w: 1.9, d: 'M12 10.3 V13.3 L14.1 14.5' },
        { mode: 'stroke', w: 1.9, d: 'M5.6 8.3 A3.1 3.1 0 0 1 8.4 5.5 M15.6 5.5 A3.1 3.1 0 0 1 18.4 8.3' }
      ]
    },
    displeased: {
      group: 'dark', plate: '#1a120d', rim: '#f0cd82', glyph: '#f4e6cc', halo: 'rgba(20,13,9,.55)',
      parts: [
        { mode: 'fill', d: 'M8.2 15.6 C6.2 15.6 5 14.2 5 12.6 C5 11 6.2 9.8 7.8 9.7 C8.3 7.6 10 6.3 12 6.3 C14.4 6.3 16.2 8 16.5 10.2 C18 10.3 19.1 11.5 19.1 12.9 C19.1 14.4 17.9 15.6 16.4 15.6 Z' },
        { mode: 'stroke', w: 1.7, d: 'M9.6 17.4 L8.9 19 M12.6 17.4 L11.9 19 M15.6 17.4 L14.9 19' }
      ]
    }
  } as Record<MoodId, MoodSymbolSpec>
};

/** SVG för en symbol (HUD, dokumentation). Samma figurer som duken ritar i teatern. */
export function moodSymbolSvg(id: MoodId, px?: number): string {
  const s = MOOD_SYMBOL.moods[id], n = px ?? MOOD_SYMBOL.sizePx;
  const parts = s.parts.map((p) => p.mode === 'fill'
    ? `<path d="${p.d}" fill="${s.glyph}"${p.evenodd ? ' fill-rule="evenodd"' : ''}/>`
    : `<path d="${p.d}" fill="none" stroke="${s.glyph}" stroke-width="${p.w ?? 2}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11.6" fill="${s.halo}"/><circle cx="12" cy="12" r="${MOOD_SYMBOL.plateR}" fill="${s.plate}" stroke="${s.rim}" stroke-width="${MOOD_SYMBOL.rimW}"/>${parts}</svg>`;
}

/** Ritar symbolen på en 2D-duk med mitten i (x, y). Path2D läser samma sökvägar som SVG:n. */
export function drawMoodSymbol(ctx: CanvasRenderingContext2D, id: MoodId, x: number, y: number, px?: number, alpha?: number): void {
  const s = MOOD_SYMBOL.moods[id], k = (px ?? MOOD_SYMBOL.sizePx) / 24;
  ctx.save(); ctx.globalAlpha = alpha ?? 1; ctx.translate(x - 12 * k, y - 12 * k); ctx.scale(k, k);
  ctx.fillStyle = s.halo; ctx.beginPath(); ctx.arc(12, 12, 11.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = s.plate; ctx.strokeStyle = s.rim; ctx.lineWidth = MOOD_SYMBOL.rimW;
  ctx.beginPath(); ctx.arc(12, 12, MOOD_SYMBOL.plateR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  s.parts.forEach((p) => {
    const path = new Path2D(p.d);
    if (p.mode === 'fill') { ctx.fillStyle = s.glyph; ctx.fill(path, p.evenodd ? 'evenodd' : 'nonzero'); }
    else { ctx.strokeStyle = s.glyph; ctx.lineWidth = p.w ?? 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(path); }
  });
  ctx.restore();
}

// ---------- ansiktena -----------------------------------------------------
// Fem uttryck på huvudets framsida (figureFace.ts). ORDER 325 (Designs D11): två skal, nära och långt, så att
// ansiktena syns också vid Krogen; gränserna står i balance.ts FACE_LOD. D1:s gräns (in från 9 m, helt vid 7 m)
// gäller inte längre.
export const FACE = {
  /** Personalen har alltid 'content'. Uttrycken är gästernas. */
  staffMood: 'content' as MoodId,
  /** Ett nytt uttryck byts in på 120 ms, samtidigt som gesten börjar. */
  swapMs: 120,
  ink: '#2a1c13'
};

// ---------- mätaren -------------------------------------------------------
// ”Stämningen i rummet”, i HUD:ens översta rad till höger om kassan. Ett spår i fem steg med en
// fyllning i guld och den aktuella symbolen. Det som förloras står kvar streckat (som fel i den
// varma formen) i {lossHoldMs} och tonas sedan ut. Inga siffror.
export const MOOD_METER = {
  widthCqw: 17, minWidthPx: 230,
  steps: 5,
  fill: 'linear-gradient(90deg, #d9b476, #ffd58f)',
  track: 'rgba(245,234,213,.1)',
  lost: '2px dashed rgba(244,230,204,.75)',
  lossHoldMs: 1600,
  gainGlow: '0 0 12px rgba(232,185,58,.6)',
  moveMs: 900, ease: 'cubic-bezier(.4,0,.2,1)',
  /** Mätaren ändras bara av det som händer i rummet, och alltid efter symbolerna över borden. */
  delayAfterSymbolMs: 150
};

// ---------- konsekvensögonblicket -----------------------------------------
// De 3,8 sekunderna efter ett raketsvar. Tider i sekunder från att svaret låses (WARM_RIGHT_WRONG.motion
// räknar från samma ögonblick). Kortet står kvar till vänster med förklaringen, så bordet ramas i de
// högra två tredjedelarna (frameX). Rätt och fel har olika kamerarörelser, som svarsraderna.
export const CONSEQUENCE = {
  durationS: 3.8,
  /** Kortet tar 3,5–32,5 % av bredden. Det som reagerar ramas mellan 36 och 96 %: mitten av gruppen hamnar på
   *  frameX (62 % för ett bord, upp till 72 % för två grannbord som i födelsedagen). */
  frameX: { oneTable: 0.62, twoTables: 0.72, cardRight: 0.325, safeLeft: 0.36, safeRight: 0.96 },
  camera: {
    holdUntil: 0.45,            // kortets färg och lyftning/skakning, kameran står kvar på raketens 10–14 m
    inFrom: 0.45, inTo: 1.45,   // glider in mot bordet
    nearM: 7,                   // ansiktena är fullt synliga
    // Kameran sänks när den går in, så att ansiktena syns under hjässan: 35° vid rätt, 40° vid fel (spelets är 50°).
    right: { arcYawRad: 0.21, pitchRad: 0.62, ease: 'easeOutCubic' },              // en mjuk båge in, som lyftningen på kortet
    wrong: { arcYawRad: 0, pitchRad: 0.7, delayS: 0.15, ease: 'easeInOutSine' },  // rakt in, ingen båge
    // Beslut 2026-10-03: huvudena förstoras inte. De sista 1,5 s går kameran långsamt in till 5,5 m, där huvudet är
    // 41 px högt i 1280 × 720 och 51 px i 1440 × 900. Efter ögonblicket går den tillbaka till 24 m på 1 s.
    closeFrom: 2.3, closeTo: 3.8, closeM: 5.5, closeEase: 'easeInOutSine',
    backFrom: 3.8, backTo: 4.8, backM: 24                                 // tillbaka till spelets kamera, efter ögonblicket
  },
  guests: { firstGestureAt: 0.6, staggerS: 0.18, faceSwapAt: 0.6 },
  symbol: { at: 1.1 },
  meter: { at: 1.25 },
  /** Strålkastaren (teaterScen.spot) ligger kvar på bordet tills kameran vänder. */
  spot: { until: 3.8, fadeS: 0.5 }
};
