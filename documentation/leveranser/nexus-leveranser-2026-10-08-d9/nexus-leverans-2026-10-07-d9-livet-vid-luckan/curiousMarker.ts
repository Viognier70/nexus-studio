// curiousMarker.ts — markeringen som visar att en gäst är nyfiken och går att prata med. D9, 2026-10-07.
//
// Skärmens pixlar, samma storlek på alla nivåer (som rollringen). Mått för 1440 × 900, skalas med höjden / 900.
// Ingen text i markeringen. Ingen röd och ingen grön, ingen puls (samma regel som guestMood.ts).
//
// Två delar:
//   1. Pratbubblan över huvudet: papper med mässingskant och tre prickar, en spets ned mot huvudet.
//   2. Ringen på marken runt fötterna, streckad, i världen (0,44 m).
// Hover: bubblan 1,15 gånger större, kanten guld, ringen hel. Pratar: bubblan fylls med guld.
// Medan gästen tvekar går en båge runt bubblan som visar hur lång tid det är kvar att prata.

export const CURIOUS_MARKER = {
  bubble: { radiusPx: 13, offsetAboveHeadPx: 30, tailPx: 7, borderPx: 2, borderHoverPx: 3, hoverScale: 1.15, dots: 3, dotRadiusPx: 1.9, dotGapPx: 4.8 },
  colours: {
    paper: '#f5ead5', border: '#b98a3c', borderHover: '#f0cd82', dots: '#6b4a2e',
    talkingFill: '#f0cd82', talkingDots: '#2a1c13', ring: '#d9b476', ringTalking: '#f0cd82', arc: '#f0cd82', shadow: 'rgba(20,12,7,.35)'
  },
  ring: { radiusM: 0.44, dashM: [0.12, 0.09], widthM: 0.035, widthHoverM: 0.05 },
  arc: { radiusPx: 17.5, widthPx: 2.5, from: 'klockan 12, medurs, krymper' },
  fade: { inS: 0.3, outS: 0.5 },
  hit: { radiusPx: 23, alsoFigure: true }, // klick på bubblan eller på figuren
  /** Visas på gatans nivå och närmare (42, 24, 12 m). På byns och kvarterets nivå finns ingen bubbla. */
  levels: ['gatan', 'krogen'],
  maxVisible: 4
};

/** Då markeringen syns. Klippens händelser finns i curiousClips.ts. */
export const CURIOUS_FLOW = {
  showOn: { clip: 'guest.slowDown', event: 'notice' },
  talkable: ['guest.slowDown', 'guest.walk(toSign)', 'guest.readSign', 'guest.smellPoint', 'guest.hesitate'],
  arcDuring: 'guest.hesitate',
  hideOn: { clip: 'guest.hesitate', event: 'decide' },
  /** När spelaren har pratat: bubblan står kvar fylld tills gästen står i kön och tonar ut under guest.joinQueue. */
  afterTalk: 'fylld till guest.joinQueue, tonar ut över 0,8 av klippet'
};

/** Vad som händer vid klick. Talen kommer från balance.ts. */
export const CURIOUS_TALK = {
  /** Den vid luckan spelar truck.beckon mot gästen. Gästen ställer sig i kön (beslutet blir 'join'). */
  staffClip: 'truck.beckon',
  outcome: 'join',
  /** Gästen tvekar längre om ingen pratar: guest.hesitate hålls tills CURIOUS.window har gått. */
  window: 'CURIOUS.windowS',
  /** Utan prat: andelen som ställer sig i kön ändå. Prototypen växlar eller drar 50 %. */
  joinWithoutTalk: 'CURIOUS.joinChance',
  /** Andelen förbipasserande som blir nyfikna, per väder (truckWeather.ts curiousFactor). */
  curiousShare: 'CURIOUS.share',
  /** Om kön är full (alla sex platser): gästen går vidare och markeringen tonar ut. */
  queueFull: 'walkOn'
};

/** Platserna i vagnens ram (luckanPlats.json har kartans ram). */
export const CURIOUS_SPOTS = {
  trigger: { fromWest: [-5.7, 4.75], fromEast: [0.9, 4.75] }, // där guest.slowDown börjar
  readSpot: [-2.2, 4.15], // framför menyskylten, vänd mot norr
  lookAtSmoke: 'TRUCK_LAYOUT.chimney',
  joinVia: '[platsen.x + 0,15, platsen.z + 0,75] och sedan köns sista lediga plats',
  walkOn: { east: [-0.9, 4.75], west: [-3.4, 4.75] }
};

export const FLAGS = {
  mood:
    'Gästerna utanför har ingen stämningssymbol (guestMood.ts). Om Code vill visa båda: bubblan går före, och stämningen ' +
    'tänds först när gästen står i kön.',
  words:
    'Vad som sägs är inte skrivet. Prototypen visar bara att den vid luckan vinkar fram gästen. Repliker, om det ska ' +
    'finnas några, behöver ett eget beslut.'
};
