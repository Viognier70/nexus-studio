// oppningManus.js — D2, öppningen före bussen (2026-10-03). Läses, monteras inte.
// 41 s i fem bilder: flygturen över byn i skymningen, ned till vår vinbar där taket lyfts, den tomma vinbaren,
// tre glimtar av kvällen och Intendent Åsa i dörren till Måltidens hus på avstånd. Sedan svart, och ankomstens scen 1
// (bussen) börjar i samma svärta. Byn i byns koordinater (meter, byKvall), vinbaren i rummets (teaterScen).
// Ingen text i bilden utom de två raderna, som är nycklar (opening.line1, opening.line2) och ligger över bilden.

export const END = 41;
/** Byns ljusnivå under öppningen (VILLAGE_LIGHT.level, 0,5–2). Lite under spelets 1, så att skymningen känns. */
export const VILLAGE_LIGHT_LEVEL = 0.9;

/** Bilderna. layer: vilken scen som syns. Övergången in i en bild är fade sekunder lång (0 = hårt klipp). */
export const SHOTS = [
  { id: 'fly', t: 0, layer: 'village', fade: 0 },
  { id: 'descend', t: 12.5, layer: 'village', fade: 0 },
  { id: 'empty', t: 17.0, layer: 'empty', fade: 0.6 },
  { id: 'door', t: 23.5, layer: 'glimpse', fade: 0.35 },
  { id: 'decant', t: 26.8, layer: 'glimpse', fade: 0 },
  { id: 'toast', t: 30.1, layer: 'glimpse', fade: 0 },
  { id: 'mentor', t: 33.4, layer: 'village', fade: 0.6 },
  { id: 'black', t: 39.4, layer: 'black', fade: 1.2 }
];

/** Svart in och ut. Svärtan i slutet är samma svärta som ankomstens scen 1 börjar i (bussens motor hörs först). */
export const BLACK = [{ t: 0, k: 1 }, { t: 1.4, k: 0 }, { t: 39.4, k: 0 }, { t: 40.6, k: 1 }];

/** Texten. Young Serif, display-storlek, vänsterställd i nedre vänstra delen, aldrig över något som rör sig mot kameran. */
export const TEXT = [
  { key: 'opening.line1', from: 2.6, to: 11.6, fadeIn: 0.9, fadeOut: 0.8 },
  { key: 'opening.line2', from: 6.4, to: 11.6, fadeIn: 0.9, fadeOut: 0.8 },
  { key: 'opening.place', from: 1.8, to: 11.6, fadeIn: 0.9, fadeOut: 0.8 }
];

// Omtag 2026-10-04, efter provspelet ("fungerar, men inte helt tydligt"). Öppningen svarar nu på fyra frågor i tur och
// ordning: var (Grythyttan), vems (din vinbar, en nål på taket), vad (den tomma vinbaren fylls av det du vet) och vem
// (Åsa, en nål i dörren; Ingrid fram till D6 2026-10-07). Sist målet. En rad åt gången, samma plats som rad 2, aldrig två rader från olika bilder samtidigt.
/** Raderna efter flygturen. Young Serif, 4,2 % av höjden, nere till vänster där rad 1 stod. */
export const CAPTIONS = [
  { key: 'opening.empty', from: 18.4, to: 23.0, fadeIn: 0.8, fadeOut: 0.5 },
  { key: 'opening.fill', from: 24.0, to: 33.0, fadeIn: 0.5, fadeOut: 0.6 },
  { key: 'opening.goal', from: 37.0, to: 40.0, fadeIn: 0.8, fadeOut: 0.6 }
];
/** Nålarna: en ring i ljuslåga på platsen, en stjälk uppåt och namnet överst. Samma form som hovmästarens nålar, utan handgrepp.
 *  y: ankarets höjd i meter (taknocken, Åsas hatt). Följer kameran, ritas över bilden. */
export const PINS = [
  { id: 'venue', key: 'opening.yours', from: 12.9, to: 16.0, fadeIn: 0.6, fadeOut: 0.5, y: 7.0, stemCqh: 9 },
  { id: 'mentor', key: 'opening.mentor', from: 34.0, to: 37.2, fadeIn: 0.6, fadeOut: 0.6, y: 2.8, stemCqh: 7 }
];
export const PIN_STYLE = { ring: '#ffd58f', ringPx: 2, dotCqh: 1.3, glow: 'rgba(255,190,90,.85)', labelCqh: 3.2, label: '#f4e6cc' };

/** Kvällen e (villageEvening.PHASES): gatlyktorna tänds en i taget under flygturen, fönstren efter. */
export const EVENING = [{ t: 0, e: 0.05 }, { t: 12.5, e: 0.18 }, { t: 17, e: 0.22 }, { t: 33.4, e: 0.3 }, { t: END, e: 0.34 }];

// ---------- byn ----------
// Kameran som nyckelbilder. v: { tx, tz, ty, dist, yaw, pitch, fov } eller frame: avstånd där byns egen inramning
// (frameAt i byKvall) gäller, så att flygturen landar exakt där spelets nivåer börjar.
export const VILLAGE_CAM = [
  // Över sjön i sydost, lågt, med byn vid horisonten.
  { t: 0, v: { tx: 330, tz: 180, ty: 0, dist: 980, yaw: 0.62, pitch: 0.42, fov: 34 } },
  { t: 6.5, frame: 660 },                         // hela byn, spelets nivå
  { t: 12.5, frame: 150, ease: 'inOutSine' },     // torget och vår krog
  { t: 15.2, frame: 42, ease: 'inOutSine' },      // gatan framför dörren
  { t: 17.2, frame: 25, ease: 'outCubic' },       // krogens nivå: taket lyfts mellan 40 och 26 m (BLEND.roof)
  // Måltidens hus: Åsa i dörren, 36–40 m, aldrig närmare. Studenterna från byn går förbi henne in.
  { t: 33.4, mentor: { dist: 40, pitch: 0.5, side: 0.7 } },
  { t: 36.6, mentor: { dist: 36, pitch: 0.48, side: 0.55 }, ease: 'inOutSine' },
  // Upp och bort över byns ljus, mot infarten där bussen kommer.
  { t: 40.6, mentor: { dist: 320, pitch: 0.56, side: 0.2, lead: 170 }, ease: 'inOutSine' }
];

/** Intendent Åsa i dörren till Måltidens hus (D6, asaFigure.ts). Placeras på byggnadens gatukant (doorOf), 1,2 m ut, vänd mot gatan.
 *  Hon står (staff.idle), tittar ut mot vägen vid glanceAt och hälsar mot vägen med handen till brättet vid greetAt (asa.greet, lugnt). */
export const MENTOR = { who: 'asa', place: 'campus', outM: 1.2, along: 2.2, scale: 1.45, clip: 'staff.idle', glanceAt: 34.6, greetAt: 35.4, greetYaw: -0.9 };

// ---------- den tomma vinbaren ----------
// Före öppning, ingen människa (byns figurer i rummet är dolda under nedstigningen, så att rummet är tomt redan då).
//  Ljuset dämpat till 55 %, bordsljusen tända (stämningen 'tidig'). Kameran tar vid
// där byns krognivå slutar (spelets 24 m) och glider in över baren mot loungen.
const near = (x, z, dist, yaw, pitch) => ({ tx: x, ty: 0.6, tz: z, dist, yaw, pitch: pitch ?? 0.873, fov: 42 });
const SOUTH = (x, z, dist, pitch) => ({ tx: x, ty: 0.7, tz: z, dist, yaw: Math.PI - 0.35, pitch: pitch ?? 0.86, fov: 42 });

export function emptyBar() {
  const BY = 1.15, LY = 0.45;
  return {
    set: 'winebar', roomOpts: { mood: 'tidig' }, tempo: 'calm', end: 7, actors: {}, effects: [],
    props: {
      g1: { type: 'wineGlass', at: [-2.7, BY, 1.42], fill: false }, g2: { type: 'wineGlass', at: [-1.8, BY, 1.42], fill: false },
      g3: { type: 'wineGlass', at: [-0.9, BY, 1.42], fill: false }, g4: { type: 'wineGlass', at: [0.0, BY, 1.42], fill: false },
      w1: { type: 'waterGlass', at: [-1.8, LY, 3.85] }, w2: { type: 'waterGlass', at: [2.0, LY, 3.85] }
    },
    dim: 0.55,
    cam: [{ t: 0, v: { tx: 0.2, ty: 0.9, tz: 0.2, dist: 24, yaw: 0.7, pitch: 0.873, fov: 42 } },
      { t: 6.5, v: { tx: -0.6, ty: 0.7, tz: 2.6, dist: 12, yaw: 0.32, pitch: 0.8, fov: 42 }, ease: 'inOutSine' }]
  };
}

// ---------- glimtarna av kvällen ----------
// En scen, tre bilder med hårda klipp, 3,3 s var. Tiden här är bildens tid från 23,5 s.
export const GLIMPSE_T0 = 23.5;
export function glimpses() {
  const PI = Math.PI, BY = 1.15, LY = 0.45, D = 10.4;
  const G = (look, hm, seat, lk, steps) => ({ kind: 'guest', look, hm, pos: [0, 0], steps: [{ clip: 'guest.seatedIdle', until: 0.3, seat, look: lk }, ...(steps || [{ clip: 'guest.seatedIdle', until: D, look: lk }])] });
  const glass = (id) => [{ type: 'show', prop: id, at: 'grab' }, { type: 'hide', prop: id, at: 'release' }];
  const props = {
    eBottle: { type: 'wineBottle', hand: ['elin', 'R'] }, dec: { type: 'decanter', hand: ['elin', 'L'], fill: false },
    mRag: { type: 'napkin', hand: ['mira', 'R'] },
    hg: { type: 'wineGlass', hand: ['la1', 'R'], hidden: true }, kg: { type: 'wineGlass', hand: ['la2', 'R'], hidden: true }, fg: { type: 'wineGlass', hand: ['la3', 'R'], hidden: true },
    bw1: { type: 'waterGlass', at: [1.45, LY, 3.95] }, bw2: { type: 'waterGlass', at: [2.55, LY, 3.95] },
    sg1: { type: 'wineGlass', at: [-2.7, BY, 1.42] }, sg2: { type: 'wineGlass', at: [-1.8, BY, 1.42] }
  };
  const actors = {
    // 1 · Per hälsar i dörren. Två gäster kommer in, den ena hänger av sig.
    p1: { kind: 'guest', look: 'kappa', hm: 0.98, pos: [8.7, 0.5], steps: [{ clip: 'guest.walk', path: [[7.25, 0.35]], until: 1.3 }, { clip: 'guest.queueCalm', until: D, face: -PI / 2, look: 'per' }] },
    p2: { kind: 'guest', look: 'rock', hm: 1.04, pos: [9.0, 1.1], steps: [{ clip: 'guest.walk', path: [[7.3, 1.2]], until: 1.5 }, { clip: 'guest.hangCoat', face: PI / 2 }, { clip: 'guest.queueCalm', until: D, face: -PI / 2, look: 'per' }] },
    per: { kind: 'staff', look: 'hovmastare', pos: [6.1, -0.55], yaw: PI / 2, steps: [
      { clip: 'host.checkBook', until: 0.5, face: PI / 2, look: 'p1' },
      { clip: 'staff.walk', path: [[6.3, 0.0], [6.45, 0.1]], until: 1.3 },
      { clip: 'host.greetDoor', face: PI / 2, look: 'p1' },
      { clip: 'staff.idle', until: D, face: PI / 2, look: 'p1' }] },
    // 2 · Elin dekanterar vid lounge B, Mira putsar glas bakom baren.
    elin: { kind: 'staff', look: 'sommelier', pos: [2.0, 3.2], yaw: 0, steps: [
      { clip: 'staff.idle', until: 3.0, face: 0, look: 'lb2' },
      { clip: 'somm.decant', face: 0, tempo: 'calm', ev: [{ type: 'fill', prop: 'dec', at: 0.5 }] },
      { clip: 'staff.idle', until: D, face: 0, look: 'lb2', keep: 'both' }] },
    mira: { kind: 'staff', look: 'bartender', pos: [-0.9, 0.74], yaw: 0, steps: [{ clip: 'bar.polishGlass', until: D, face: 0 }] },
    lb1: G('hog', 1.05, 'loungeB1', 'elin'), lb2: G('medel3', 0.97, 'loungeB2', 'elin'), lb3: G('stickat', 0.98, 'loungeB3', 'elin'),
    // 3 · Skålen i lounge A: glasen över bordets mitt och ett skratt.
    la1: G('medel', 1.0, 'loungeA1', 'la2', [{ clip: 'guest.gesture', until: 6.7, look: 'la2' }, { clip: 'guest.cheers', look: 'la2', ev: glass('hg') }, { clip: 'guest.laugh', look: 'la2' }, { clip: 'guest.seatedIdle', until: D, look: 'la2' }]),
    la2: G('social', 0.94, 'loungeA2', 'la1', [{ clip: 'guest.seatedIdle', until: 6.85, look: 'la1' }, { clip: 'guest.cheers', look: 'la1', ev: glass('kg') }, { clip: 'guest.seatedIdle', until: D, look: 'la3' }]),
    la3: G('medel2', 1.02, 'loungeA3', 'la2', [{ clip: 'guest.lean', until: 7.0, look: 'la2' }, { clip: 'guest.cheers', look: 'la2', ev: glass('fg') }, { clip: 'guest.laugh', tempo: 'calm', look: 'la2' }, { clip: 'guest.seatedIdle', until: D, look: 'la2' }]),
    b1: G('student', 0.98, 'bar1', 'b2'), b2: G('jacka', 1.0, 'bar2', 'b1', [{ clip: 'guest.gesture', until: D, look: 'b1' }]),
    b5: G('medel2', 0.95, 'bar5', 'b6'), b6: G('kappa', 0.97, 'bar6', 'b5', [{ clip: 'guest.lean', until: D, look: 'b5' }]),
    t1: G('medel', 1.0, 'twoB1', 't2', [{ clip: 'guest.gesture', until: D, look: 't2' }]), t2: G('social', 0.95, 'twoB2', 't1'),
    dj: { kind: 'staff', look: 'dj', pos: [6.15, -4.65], yaw: -PI / 4, stand: 0.25, steps: [{ clip: 'cook.station', until: D, face: -PI / 4 }] }
  };
  return {
    set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: D, props, actors, effects: [],
    // Bildernas kameror, med en lätt drift i varje. Klippen är hårda.
    cam: [
      { t: 0, v: near(6.9, 0.5, 8.6, -1.2, 0.74) }, { t: 3.29, v: near(6.95, 0.5, 7.9, -1.1, 0.72) },
      { t: 3.3, v: SOUTH(1.9, 3.9, 8.2) }, { t: 6.59, v: SOUTH(2.1, 3.95, 7.6) },
      { t: 6.6, v: SOUTH(-1.6, 4.3, 8.0, 0.8) }, { t: D, v: SOUTH(-1.8, 4.4, 7.2, 0.78) }
    ]
  };
}
