// pyramidStake.ts — tillägg till D5 (2026-10-05): kvitt eller dubbelt. Ersätter pyramidMoment.ts.
// Beslut 2026-10-05: pyramidens ögonblick är en satsning, inte en belöning i efterhand, och visas vid både rätt och fel.
// Fyra lägen: låset, väntan, avgörandet och valet mellan stegen. Tider i ms från att spelaren trycker *Stå för svaret*.
// Omtag 2026-10-05 (ORDER 305 B): säkerheten är borttagen. Valet Stanna / Gå vidare är säkerheten. Potten är krediter.
// Rätt efter att ha gått vidare ger potten × 2 + stegets kredit. Med 1 kredit per steg: 1, 3, 7. Fel efter att ha gått vidare:
// hela potten slocknar. Ryktet, gästerna och stämningen följer svaret som förut. Talen kommer från balance.ts (STEP_CREDIT).

export const STAKE_MOMENT = {
  /** Var allt står. Kolumnen ligger i mitten av den fria ytan till höger om raketkortet i vanligt läge, och står
   *  kvar där när panelerna fälls (fokusläget), så att den aldrig hoppar. Rummet och bordet syns till vänster. */
  column: { x: 'mid(rocket.right@normal, screen.right)', pyramidYVh: 40, pyramidHVh: 34, potYVh: 61, rowYVh: 68, choiceYVh: [73, 86] },

  /** 1. Låset. Insatsen glider ur kortet upp på steget och låses. Därefter går inget i kortet att ändra. */
  lock: {
    lift: [0, 350],            // pyramiden ur kortet till kolumnen, easeOutCubic, 18 → 34 vh
    token: [150, 780],         // marken från knappen Stå för ditt svar till stegets mitt (150, 126 i ramen 300 × 250), båge 6 vh, easeInOutCubic
    shackle: [780, 900],       // mässingslåset slår igen över marken, skala 1,25 → 1
    click: 900,                // ljudet lock.click, och kortet tonas till 45 % med ett lås på knappen
    cardFrozen: 900
  },

  /** 2. Väntan. Steget pulserar från glöd till ljuslåga och blir tätare. Kameran går in till bordet. */
  wait: {
    from: 900, to: 3800,       // avgörandet vid 3 800 ms = 3,8 s efter trycket (inom 3–5 s)
    pulse: { from: 'floor.current (glöd)', to: 'pulse.colour #ffd58f (ljuslåga)', periodMs: [900, 320], ease: 'easeInOutSine' },
    camera: { startMs: 200, arriveMs: 1800, distM: 11, ease: 'inOutSine', frame: 'bordet till vänster om kolumnen' },
    // Under 14 m fälls panelerna (fokusläget). Kortet blir listen med pyramiden, som redan står i kolumnen.
    guest: { reactsAt: 3500, readable: 3800, rule: 'avgörandet kommer först när reaktionen syns' },
    dimRoom: 0,                // rummet dämpas inte: det är gästen man tittar på
    sound: 'wait.ticks (tätare) + wait.drone (stiger)'
  },

  /** 3. Avgörandet. Tider från avgörandet (D). */
  right: {
    silence: [-120, 0],        // tickandet tystnar strax före
    lockOpens: [0, 160],
    fill: [0, 500],            // grönt stiger nedifrån, easeOutCubic, flash 500–750
    potRoll: [200, 900],       // potten rullar upp i 8 steg till potten × 2 + stegets kredit
    row: [900, 1150],          // raden: Steg n · potten a → b om rätt (tonas in efter låset)
    sound: 'right + floor + pot.roll'
  },
  wrong: {
    silence: [-120, 0],
    shake: [0, 240],           // som floorCrack, 6 px, tre gånger
    crack: [180, 520],         // sprickan och kanten i color.wrong. Rött betyder bara fel svar.
    darken: [0, 400],          // steget mörknar till floor.cracked, våningarna ovanför till 38 %
    tokenFalls: [200, 900],    // marken och låset faller 16 vh med tyngd, vrids 40° och tonas ut
    potOut: [200, 700],        // potten slocknar: glöden släcks, beloppet streckas och faller 1 vh, 0 under
    back: [1800, 3800],        // kameran tillbaka till 24 m. Över 15,5 m fälls kortet ut med förklaringen, lika vänlig som förut
    sound: 'wrong + token.drop'
  },

  /** 4. Valet mellan stegen. Efter varje rätt steg som inte är det sista: efter steg 1 och efter steg 2. */
  choice: {
    from: 1200, countdownMs: 8000,
    options: ['stay', 'goOn'],                // Stanna, och ta det du har ({n} krediter) · Gå vidare, med allt på spel ({a} → {b} om rätt, 0 om fel)
    keys: { stay: '1', goOn: '2' },
    timeout: 'stay',                          // tiden ut ger det säkra, som Per under servicen
    lastSeconds: { from: 5000, pulse: 'pulse.colour', periodMs: 500 },   // de tre sista sekunderna
    dimRoom: 0.35,
    nextFloor: 'den övre våningen får streckad kant i ljuslåga och pulserar långsamt (2,6 s)',
    sound: 'choice.tick varje sekund, choice.tickHigh de två sista'
  },

  /** Marken: en mässingsmark med kreditsymbolen (graduation-cap) och potten som står på spel. Vid steg 1 är potten tom och bara symbolen syns. */
  token: { sizeVh: 7.4, face: 'radial-gradient(circle at 38% 32%, #ffe3a6, #e8b93a 55%, #a8772a)', rim: '#7a5420', icon: 'graduation-cap', shows: 'potten före steget' },
  lockIcon: { open: 'lock-open', shut: 'lock', colour: '#f0cd82', sizeVh: 3.6 },
  pot: { font: 'Young Serif', sizeVh: 7.2, lit: '#ffd58f', glow: '0 0 28px rgba(255,190,90,.55)', out: '#a8957a' },
  /** Raden: tre fält och två tecken. Exempel: Steg 2 · potten 1 → 3 om rätt (kreditsymbolen, aldrig kr). */
  row: { terms: ['step', 'pot', 'ifRight'], ops: ['·', '→'] }
};

/** Ljudlägena (LJUDEN.md, tillägg). Nivåer mot rummets sorl (0 dB). Recept i LEVERANSNOT §4. */
export const STAKE_SOUNDS = {
  'lock.slide': { at: 150, lenMs: 600, level: -16 },
  'lock.click': { at: 900, lenMs: 180, level: -6 },
  'wait.ticks': { from: 900, to: 3680, rateHz: [1.4, 4.2], level: [-18, -12] },
  'wait.drone': { from: 900, to: 3680, note: 'G2', level: [-26, -16] },
  'pot.roll': { from: 'D+200', to: 'D+900', steps: 8, level: -14 },
  'token.drop': { at: 'D+380', bounces: [0, 110, 190], level: -10 },
  'choice.tick': { every: 1000, level: -14 }, 'choice.tickHigh': { lastS: 2, level: -11 }
};

/** Pyramidens våningar i ramen 300 × 250 (WARM_RIGHT_WRONG.pyramid), som i pyramidMoment.ts. */
/** Potten efter n rätta steg i rad: p = p × 2 + stegets kredit. potAfter(1..3) = 1, 3, 7 med 1 kredit per steg. */
export function potAfter(n: number, stepCredit = 1): number { let p = 0; for (let i = 0; i < n; i++) p = p * 2 + stepCredit; return p; }

export const FLOORS = [
  { id: 'episteme', top: 168, bottom: 236 }, { id: 'techne', top: 92, bottom: 160 }, { id: 'phronesis', top: 16, bottom: 84 }
];
/** Stegets mitt i ramen, där marken låses. */
export const FLOOR_CENTRE = { episteme: [150, 204], techne: [150, 128], phronesis: [150, 54] };
export function floorPts(f: { top: number; bottom: number }, fill = 1): string {
  const ax = 150, ay = 10, by = 240, bh = 140, half = (y: number) => bh * (y - ay) / (by - ay);
  const t = f.bottom - (f.bottom - f.top) * fill;
  return [[ax - half(t), t], [ax + half(t), t], [ax + half(f.bottom), f.bottom], [ax - half(f.bottom), f.bottom]].map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
}
/** Pulsen i väntan: period från 900 till 320 ms, fasen integreras så att den inte hoppar. Ger 0–1. */
export function waitPulse(ms: number): number {
  const a = STAKE_MOMENT.wait.from, b = STAKE_MOMENT.wait.to, [p0, p1] = STAKE_MOMENT.wait.pulse.periodMs;
  const u = Math.max(0, Math.min(1, (ms - a) / (b - a))), f0 = 1 / p0, f1 = 1 / p1;
  const phase = (b - a) * (f0 * u + (f1 - f0) * u * u / 2);
  return 0.5 - 0.5 * Math.cos(2 * Math.PI * phase);
}
