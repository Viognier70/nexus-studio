// nexusTheme.warm.ts — den varma formen. Ersätter Modernist-tokens (vitt, rött, Archivo, radie 0)
// i allt spelets gränssnitt: HUD, raketkortet, morgonen, inköpen, lärdomen, tidningen och kvällens resultat.
// Provspel 3, 2026-09-29. Samma värden finns som CSS-variabler i nexus-warm.css.
//
// Grundregel: det man styr med är mörkt trä med en tunn mässingskant. Det man läser i lugn och ro
// ligger på papper. Ljuset kommer från rummet: guld och ljuslåga, aldrig rött för fel.

export const WARM = {
  color: {
    walnut950: '#140d09',   // sidans botten, bakom scenen
    walnut900: '#1a120d',   // scenens bakgrund
    walnut800: '#231811',   // panelens nederkant
    walnut700: '#2e2016',   // panelens överkant
    walnut600: '#3a281c',
    walnut500: '#5a3e2a',
    brass: '#d7a24c',       // kanter, etiketter (kicker) på trä
    brassLight: '#f0cd82',  // siffror på trä, klockslaget
    gold: '#e8b93a',        // huvudknappen, klarat steg, rätt svar
    goldHover: '#f0c955',
    goldPressed: '#d4a52c',
    candle: '#ffd58f',      // pågår, ringen i rummet, nedräkningen
    ember: '#c2553a',       // ENDAST sista halvtimmen i klockan och varmrätter som inte räcker
    paper: '#f5ead5',       // menyn, bokningsboken, lärdomen, svarsraderna
    paperShade: '#e9d9bc',
    newsprint: '#f1e6d0',   // tidningen
    cream: '#f4e6cc',       // text på trä
    creamMuted: '#e7d6b8',  // brödtext på trä
    creamSoft: '#cdb898',   // sekundär text på trä
    ink: '#2a1c13',         // text på papper, mörk knapp på papper
    inkSoft: '#6b5443',     // sekundär text på papper
    inkLabel: '#9a6a2a',    // etiketter (kicker) på papper
    starOn: '#e8b93a',
    starOnPaper: '#c9942a',
    starOff: 'rgba(244,230,204,.18)'
  },
  interplay: { staffStaff: '#e2b457', staffGuest: '#ee8d6f', guestGuest: '#b9cc8c', event: '#ffcf7a' },
  guest: { student: '#6fa3c0', middle: '#c9a878', high: '#a3a8bd', social: '#e07a8f', billionaire: '#e8b93a' },

  surface: {
    panel: 'linear-gradient(180deg, #2e2016 0%, #231811 100%)',
    panelBorder: '1px solid rgba(215,162,76,.38)',
    panelInset: 'inset 0 1px 0 rgba(255,220,160,.10)',
    hud: 'rgba(44,30,21,.94)',
    hudBorder: '1px solid rgba(215,162,76,.45)',
    wash: 'rgba(245,234,213,.08)',        // tonad ruta på trä (”I rummet”, lyktor)
    washStrong: 'rgba(245,234,213,.14)',
    divider: '1px solid rgba(215,162,76,.25)',
    dividerFaint: '1px solid rgba(244,230,204,.08)',
    paperDivider: '1px dashed rgba(42,28,19,.18)',
    /** Papper ligger lite snett, som på ett bord. Aldrig mer än så. */
    paperTiltDeg: { min: -1.2, max: 0.8 }
  },

  /** Rummet bakom panelerna graderas varmt. Filtren gäller renderingarna i provspelet. */
  roomGrade: {
    morning: 'sepia(.45) saturate(1.15) brightness(.62) contrast(1.05)',
    service: 'saturate(1.1) brightness(.92)',
    afterClose: 'brightness(.45) saturate(.9)',
    vignette: 'radial-gradient(ellipse at 50% 45%, rgba(255,170,80,.12), rgba(20,10,5,.72) 85%)'
  },

  font: {
    heading: '"Young Serif", Georgia, serif',   // bara vikt 400
    body: '"Figtree", system-ui, sans-serif',
    load: 'https://fonts.googleapis.com/css2?family=Young+Serif&family=Figtree:wght@400;500;600;700;800&display=swap',
    weight: { body: 500, strong: 700, label: 800 },
    numerals: 'tabular-nums'
  },

  /**
   * Typskalan följer skärmhöjden så att 1440 × 900 och 1280 × 720 har samma layout.
   * size = max(minPx, vh × höjden / 100). Värden i px för de två målen står bredvid.
   */
  type: {
    kicker:   { vh: 1.7, minPx: 12, font: 'body', weight: 800, tracking: '0.16em', upper: true },  // 15 / 12
    small:    { vh: 1.8, minPx: 12, font: 'body', weight: 600 },   // 16 / 13
    body:     { vh: 2.1, minPx: 14, font: 'body', weight: 500 },   // 19 / 15
    bodyLarge:{ vh: 2.4, minPx: 16, font: 'body', weight: 500 },   // 22 / 17
    answer:   { vh: 2.1, minPx: 14, font: 'body', weight: 700 },
    button:   { vh: 2.2, minPx: 15, font: 'body', weight: 800 },
    title:    { vh: 3.6, minPx: 24, font: 'heading' },             // 32 / 26
    question: { vh: 3.1, minPx: 21, font: 'heading' },             // 28 / 22
    display:  { vh: 5.6, minPx: 36, font: 'heading' },             // 50 / 40
    clock:    { vh: 5.4, minPx: 36, font: 'heading' },
    masthead: { vh: 10.5, minPx: 70, font: 'heading' }
  },

  radius: { panel: 22, paper: 22, card: 14, button: 16, pill: 999, key: 999 },
  shadow: {
    panel: '0 30px 80px rgba(0,0,0,.55)',
    paper: '0 30px 80px rgba(0,0,0,.55)',
    hud: '0 10px 30px rgba(0,0,0,.40)',
    answer: '0 4px 14px rgba(0,0,0,.25)',
    goldButton: '0 10px 30px rgba(232,185,58,.30)',
    glowCurrent: '0 0 0 4px rgba(255,213,143,.22), 0 0 18px rgba(255,190,90,.70)',
    glowCleared: '0 0 12px rgba(232,185,58,.60)'
  },
  /** Avstånd i andel av skärmhöjden (vh). Kanten mot skärmen är 3,5 vw. */
  space: { edgeVw: 3.5, hudTopVh: 3.5, panelTopVh: 13, gapVh: 1.2, padVh: 2.8 },

  /** Stegens tillstånd. Fel är streckat, aldrig rött. */
  step: {
    cleared: { fill: '#e8b93a', border: '2px solid #e8b93a', glow: 'glowCleared' },
    current: { fill: '#ffd58f', border: '2px solid rgba(255,213,143,.7)', glow: 'glowCurrent' },
    failed:  { fill: 'transparent', border: '2px dashed rgba(244,230,204,.8)' },
    off:     { fill: 'transparent', border: '2px solid rgba(244,230,204,.18)', opacity: 0.5 }
  },
  answer: {
    idle:     { bg: '#f5ead5', fg: '#2a1c13', key: '#2a1c13', keyFg: '#f5ead5' },
    selected: { bg: '#fff6e3', fg: '#2a1c13', border: '3px solid #e8b93a', key: '#e8b93a', keyFg: '#2a1c13' },
    right:    { bg: '#e8b93a', fg: '#2a1c13' },
    wrong:    { bg: 'transparent', fg: '#f4e6cc', border: '2px dashed rgba(244,230,204,.75)' },
    other:    { opacity: 0.38 }
  },
  button: {
    primary:  { bg: '#e8b93a', fg: '#2a1c13', hover: '#f0c955', pressed: '#d4a52c' },   // på trä
    onPaper:  { bg: '#2a1c13', fg: '#f5ead5', hover: '#4a3322' },                        // på papper
    ghost:    { bg: 'transparent', fg: '#f4e6cc', border: '1px solid rgba(215,162,76,.35)', hover: 'rgba(245,234,213,.14)' },
    focus: '2px solid #f0cd82',  // :focus-visible, offset 2px
    /** Texten står till vänster och pilen till höger, som i tidigare leveranser. */
    labelAlign: 'left'
  },
  icon: {
    set: 'lucide 0.460.0',
    /** Lucide är svarta streck. Filtret ger grädde på trä. På papper används ikonen ofiltrerad. */
    onWoodFilter: 'invert(92%) sepia(14%) saturate(380%) hue-rotate(340deg)',
    evening: { money: 'coins', credits: 'graduation-cap', reputation: 'star', knowledge: 'book-open', experience: 'sparkles', eco: 'leaf', econ: 'scale', social: 'heart-handshake', waste: 'trash-2' }
  }
} as const;

/** Det som byts ut. Nycklarna till vänster är Modernist-variablerna som skärmarna använde till och med 2026-09-28. */
export const REPLACES = {
  '--color-bg #f3f2f2': 'surface.panel (trä) eller color.paper (papper), beroende på vad rutan är',
  '--color-text #201e1d': 'color.cream på trä, color.ink på papper',
  '--color-accent #ec3013': 'color.gold för handling och klarat, color.candle för pågår. color.ember bara i klockans sista halvtimme',
  '--color-neutral-*': 'color.creamSoft / color.inkSoft',
  '--font-heading Archivo 700': 'font.heading Young Serif 400',
  '--font-body Archivo': 'font.body Figtree 500',
  '--radius-md 0': 'radius.card 14 / radius.panel 22',
  '2px solid var(--color-text)': 'surface.panelBorder + shadow.panel',
  'fel svar: 3px dashed ink': 'answer.wrong (samma streckning, i grädde)'
} as const;
