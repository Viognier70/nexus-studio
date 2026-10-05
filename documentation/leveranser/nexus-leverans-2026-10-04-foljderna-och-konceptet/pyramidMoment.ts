// pyramidMoment.ts — D5 (2026-10-04): pyramidens ögonblick när en raket klättrar ett steg.
// ORDER 303 G. Provspelet: "Pyramiden blev väldigt liten, och den var det mest spännande att se."
// När ett svar är rätt lyfts pyramiden ur raketkortet till mitten av skärmen, står där stort i 1,5 s medan
// steget tänds (våningen fylls, som i nexusTheme.warm.rattfel floorFill), och multiplikatorn räknas upp.
// Under den står raden Säkerhet × steg → kvällens utfall med kvällens tal. Sedan krymper den tillbaka till sin
// plats: raketkortet, eller vänsterlisten i fokusläget. Bara vid rätt svar; ett fel spricker i kortet som förut.
// Rummet dämpas till 70 % under ögonblicket (inte svart: kvällen pågår), tiden stannar inte.

export const PYRAMID_MOMENT = {
  /** ms från att svaret låses. Svarsraden blir grön 120–320 (WARM_RIGHT_WRONG.motion.answerRight). */
  t: {
    lift: [300, 650],        // ur kortet till mitten, easeOutCubic, skala från kortets 22 vh till 46 vh
    fill: [650, 1550],       // våningen fylls nedifrån (900 ms, som floorFill.rise), flash 1550–1800
    mult: [1200, 1700],      // multiplikatorn räknas upp från föregående steg till det nya
    row: [1450, 1750],       // raden tonas in och lyfter 1,2 vh
    hold: [650, 2150],       // 1,5 s i mitten
    shrink: [2150, 2600]     // tillbaka till sin plats, easeInOutCubic
  },
  size: { heightVh: 46, inCardVh: 18.3, inStripVh: 6.2 },
  /** Mitten av den fria ytan, lite ovanför skärmens mitt så att raden får plats under. Med raketkortet öppet är
   *  den fria ytan från kortets högerkant till skärmens högerkant, så att ögonblicket aldrig ligger över kortet.
   *  I fokusläget (kortet är en list) är det skärmens mitt. */
  centre: { x: 'mid(rocket.right, screen.right)', xFocus: '50vw', yVh: 46 },
  dimRoomTo: 0.7,
  multiplier: { font: 'Young Serif', sizeVh: 9, colour: '#ffd58f', glow: '0 0 28px rgba(255,190,90,.55)', format: '×{mult}' },
  /** Raden under pyramiden: tre fält och två tecken. Talen kommer från balance.ts / kvällens kassa. */
  row: { terms: ['security', 'step', 'outcome'], ops: ['×', '→'], paper: '#f5ead5', ink: '#2a1c13', label: '#9a6a2a', valueFont: 'Young Serif', heightVh: 9.4 },
  /** Ljudet floor (LJUDEN.md) spelas vid fill-slutet, 1 550 ms, inte vid 900 som i kortet. */
  sound: { floorAt: 1550 }
};

/** Pyramidens våningar i ramen 300 × 250 (WARM_RIGHT_WRONG.pyramid). */
export const FLOORS = [
  { id: 'episteme', top: 168, bottom: 236 }, { id: 'techne', top: 92, bottom: 160 }, { id: 'phronesis', top: 16, bottom: 84 }
];
/** Våningens fyrhörning. fill 0–1: hur högt grönt står nedifrån (1 = hela våningen, standard för konturen). */
export function floorPts(f: { top: number; bottom: number }, fill = 1): string {
  const ax = 150, ay = 10, by = 240, bh = 140, half = (y: number) => bh * (y - ay) / (by - ay);
  const t = f.bottom - (f.bottom - f.top) * fill;
  return [[ax - half(t), t], [ax + half(t), t], [ax + half(f.bottom), f.bottom], [ax - half(f.bottom), f.bottom]].map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
}
