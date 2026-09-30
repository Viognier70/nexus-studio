// nexusTheme.warm.rattfel.ts — tillägg till nexusTheme.warm.ts efter Vision Owners regel 2026-09-30.
// Rätt svar är grönt och fel svar är rött, med tydligt olika rörelser. Förklaringen efteråt är lika vänlig som förut.
// Lyktorna i raketkortet ersätts av kunskapspyramiden. Slå ihop med WARM: nycklarna här vinner.

export const WARM_RIGHT_WRONG = {
  color: {
    right: '#5cb86a',       // rätt svar, fylld våning
    rightDeep: '#3f9a52',   // kant, nyckelcirkel med bock
    rightText: '#2f7a3f',   // etikett på papper (Det här hade hållit)
    wrong: '#e0533f',       // fel svar, sprucken våning
    wrongDeep: '#b8392a'    // nyckelcirkel med kryss
    // color.ember (#c2553a) utgår. Rött betyder bara fel svar (beslut 2026-09-30).
  },
  /** Ersätter WARM.answer.right och WARM.answer.wrong. Texten är mörk bläck på båda: 7,0:1 på grönt, 4,6:1 på rött. */
  answer: {
    right: { bg: '#5cb86a', fg: '#2a1c13', key: '#3f9a52', keyIcon: 'check', shadow: '0 12px 30px rgba(92,184,106,.55)' },
    wrong: { bg: '#e0533f', fg: '#2a1c13', key: '#b8392a', keyIcon: 'x', shadow: '0 4px 14px rgba(0,0,0,.25)' },
    held:  { bg: '#f5ead5', border: '3px dashed #5cb86a', tagColour: '#2f7a3f' },   // det rätta, när spelaren svarade fel
    other: { opacity: 0.38 }
  },
  /** Ersätter WARM.step. Våningarnas tillstånd. */
  floor: {
    empty:   { fill: 'rgba(245,234,213,.06)', stroke: 'rgba(244,230,204,.35)' },
    current: { fill: 'rgba(255,213,143,.10)', fillPulseTo: 'rgba(255,213,143,.18)', pulseS: 2.6, stroke: '#ffd58f', glow: 'drop-shadow(0 0 4px rgba(255,190,90,.8))', glowPulseTo: 'drop-shadow(0 0 9px rgba(255,190,90,.8))' },
    full:    { fill: '#5cb86a', stroke: '#3f9a52', glow: 'drop-shadow(0 0 8px rgba(92,184,106,.5))' },
    cracked: { fill: '#2a1d15', stroke: '2px dashed #e0533f (10 7)', crack: '#e0533f', glow: 'drop-shadow(0 0 6px rgba(224,83,63,.45))' },
    above:   { opacity: 0.38 },                                           // våningarna ovanför en sprucken
    gold:    { fill: '#e8b93a', stroke: '#f0cd82', glow: 'drop-shadow(0 0 8px rgba(232,185,58,.7))', glowPulseTo: 'drop-shadow(0 0 14px rgba(232,185,58,.7))' }   // hel pyramid
  },
  /** Pyramidens mått i sin egen ram 300 × 250. Topp i (150, 10), bas 280 bred vid y = 240. */
  pyramid: {
    viewBox: [300, 250], apex: [150, 10], baseY: 240, baseHalf: 140,
    bands: { episteme: [168, 236], techne: [92, 160], phronesis: [16, 84] },   // y överkant, y nederkant. 8 px mellan våningarna.
    inCard: { widthVh: 22, heightVh: 18.3 }
  },
  /** Det som pockar på uppmärksamhet utan att vara fel: pulserar i ljuslåga. */
  pulse: {
    colour: '#ffd58f',            // color.candle
    opacity: [0.55, 1], periodS: 1.6, ease: 'easeInOutSine',
    glow: '0 0 12px rgba(255,190,90,.75)',
    appliesTo: ['clock.lastHalfHour', 'buy.mainsShort'],
    reducedMotion: 'fast 100 %, ingen puls'
  },
  /** Rörelserna. Tider i ms från att svaret låses. */
  motion: {
    answerRight: { press: [0, 120], colour: [120, 320], lift: { px: -5, from: 120, to: 600, curve: 'sin' } },
    answerWrong: { press: [0, 120], colour: [120, 320], shake: { px: 7, cycles: 3, from: 120, to: 500, damped: true } },
    heldReveal: [600, 800],                     // det rätta får streckad grön kant när spelaren svarade fel
    others: { fadeTo: 0.38, from: 200, to: 400 },
    explanation: { from: 650, dur: 240, riseVh: 2 },
    floorFill: { rise: [0, 900], ease: 'easeOutCubic', waveAmpPx: 6, flash: [900, 1150], lift: { px: -6, from: 900, to: 1300 }, sound: { at: 900, id: 'floor' } },
    floorCrack: { shake: { px: 6, cycles: 3, to: 240 }, crackDraw: [180, 520], strokeTurnsRed: 400, chipsFall: [420, 900], aboveDim: [400, 800] },
    pyramidFull: { startsAfterFloorFill: 1300, goldSweep: { perFloor: 450, stagger: 150 }, scale: { peak: 1.06, from: 300, to: 1000 }, rays: { count: 11, from: 300, to: 1400 }, sparks: { count: 14, from: 400, to: 1400 }, sound: { at: 300, id: 'pyramidFull' } }
  }
} as const;

/** Beslut 2026-09-30: det som var ember blir pulserande ljuslåga. */
export const REPLACES_EMBER = {
  'color.ember i klockans sista ruta och klockslaget': 'pulse (ljuslåga, 55–100 %, 1,6 s)',
  'color.ember i täckningsstapeln för varmrätter': 'pulse (ljuslåga, 55–100 %, 1,6 s)',
  'color.ember, alla andra ställen': 'finns inte. Rött är bara color.wrong.'
} as const;
