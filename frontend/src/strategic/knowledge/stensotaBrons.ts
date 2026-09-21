// ORDER 231 — Stensötas tio bronsfrågor.
//
// Källa: `documentation/foundation/vision/content/PAVILJONGFRAGOR_BRONS.md`
// avsnittet "Stensöta — techne, sommellerie" (2026-09-21 re-export).
// Formen följer briefen `FRAGORNA_TILL_PAVILJONGERNA.md` §7.
//
// **Källfilen är kanonisk. Denna modul är replikat.** Testet
// `__tests__/stensotaBrons.test.ts` läser källfilen på nytt vid
// varje körning och verifierar att modulen matchar per fält (samma
// pattern som `metodkoketBrons.test.ts` från ORDER 229).
//
// Ankarfördelning (per VO 2026-09-21):
//   - "när beställningen tas upp" → anchorId='order' (4 frågor:
//     #02, #03, #07, #10). Kopplas till ORDER 225:s `order`-ankare
//     som fyras ~86 ggr/pass (ORDER 227 §1).
//   - "när vin serveras" → anchorId='setDown' (5 frågor: #01, #04,
//     #05, #06, #09). Kopplas till ORDER 225:s `setDown`-ankare —
//     **dead mapping tills ORDER 227 §5a-remap** (mappningen
//     `staff.taskType === 'serve'` fyrade 0 ggr/pass i mätningen
//     eftersom findTaskTarget('serve') aldrig matchar).
//   - "morgon" → phase='morning', ingen anchorId (1 fråga: #08).
//
// Ingen picker läser dessa frågor ännu. Fas 2 (event-lagret,
// ORDER 224 §7) binder anchor → fråga.

import type { FlervalQuestion } from './questionFormats';

export const STENSOTA_BRONS_QUESTIONS: readonly FlervalQuestion[] = [
  {
    id: 'stensota-brons-01',
    format: 'flerval',
    axis: 'techne',
    spar: 'sommellerie',
    pavilion: 'stensota',
    level: 'brons',
    askerRole: 'gäst',
    prompt:
      'The red tastes hot and flat tonight. The bottle has been standing out in the dining room, which is at 23 degrees. What do you do?',
    options: [
      'Decant the wine to give it more air',
      'Chill the bottle for a few minutes, down towards 16–17 °C',
      'Switch to a glass with a bigger bowl',
      'Open a new bottle of the same wine'
    ],
    correctIndex: 1,
    explanation:
      "Warmth makes the alcohol more volatile, so it dominates the nose while the fruit's freshness is muted. A few minutes in the fridge or an ice bucket brings the balance back. Decanting is tempting because it often fixes closed wines, but air does nothing about temperature.",
    anchor: {
      phase: 'service',
      anchorId: 'setDown',
      rawText: 'när vin serveras'
    }
  },
  {
    id: 'stensota-brons-02',
    format: 'flerval',
    axis: 'techne',
    spar: 'sommellerie',
    pavilion: 'stensota',
    level: 'brons',
    askerRole: 'sommelier',
    prompt: 'Why does a tannic red work so well with a fatty, well-hung rib-eye?',
    options: [
      'The acidity in the wine breaks down the fat chemically in the mouth',
      "The alcohol dissolves the fat so it's rinsed away",
      'The tannins bind to proteins, so the astringency softens and the fat feels lighter',
      "The tannins amplify the meat's umami so the wine tastes fuller"
    ],
    correctIndex: 2,
    explanation:
      'Tannins bind to proteins, both in saliva and in food. With meat on the palate the tannins are taken up and the wine feels softer, while the grip cuts through the sense of fat. A is tempting because acidity really does feel refreshing against fat, but that effect is sensory, not a chemical breakdown.',
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  },
  {
    id: 'stensota-brons-03',
    format: 'flerval',
    axis: 'techne',
    spar: 'sommellerie',
    pavilion: 'stensota',
    level: 'brons',
    askerRole: 'sommelier',
    prompt:
      "A table orders a hot Thai curry and wants a big red at 15 per cent with it. What's the most important thing to say?",
    options: [
      'High alcohol heightens the perceived heat; a wine with lower alcohol and a touch of sweetness works better',
      "The tannins in a big red neutralise the chilli's heat",
      'High acidity in the wine quenches chilli better than alcohol does',
      'An oak-aged wine softens the heat with its vanilla notes'
    ],
    correctIndex: 0,
    explanation:
      'Alcohol amplifies how capsaicin is perceived, so the heat gets sharper and the wine tastes burnt. Residual sugar and low alcohol work the other way. B is the tempting wrong answer, but tannin and chilli reinforce each other — grip and heat add up.',
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  },
  {
    id: 'stensota-brons-04',
    format: 'flerval',
    axis: 'techne',
    spar: 'sommellerie',
    pavilion: 'stensota',
    level: 'brons',
    askerRole: 'gäst',
    prompt: 'The wine smells like a damp cellar, almost like wet cardboard. Is it meant to?',
    options: [
      "No, it's most likely cork taint; the bottle should be replaced",
      "Yes, that's brettanomyces and part of the wine's style",
      'No, the wine needs half an hour of air and the smell will go',
      "Yes, it's sulphur from bottling and will fade in the glass"
    ],
    correctIndex: 0,
    explanation:
      "A smell of damp cellar and wet cardboard is the signature of TCA, the most common cork fault. It can't be aired away and it also mutes the wine's fruit, so the bottle is replaced. B is tempting because brett also brings earthy notes, but it smells of stables and leather, not wet paper.",
    anchor: {
      phase: 'service',
      anchorId: 'setDown',
      rawText: 'när vin serveras'
    }
  },
  {
    id: 'stensota-brons-05',
    format: 'flerval',
    axis: 'techne',
    spar: 'sommellerie',
    pavilion: 'stensota',
    level: 'brons',
    askerRole: 'sommelier',
    prompt:
      "You're opening champagne at the table without a bang and without losing fizz. How do you do it?",
    options: [
      'Take the cage off completely, grip the cork and twist it gently',
      'Loosen the cage but keep your thumb on it, and turn the bottle while holding the cork still',
      'Open it with the bottle upright so the foam stays in the neck',
      'Twist the cork quickly so the pressure is released all at once'
    ],
    correctIndex: 1,
    explanation:
      'The cage stays on as a grip and a guard, and the bottle is turned at about 45 degrees while the cork is held firm. The pressure then escapes with a sigh rather than a pop. A is tempting because it feels natural, but without the cage and thumb the cork can shoot off the moment it comes loose.',
    anchor: {
      phase: 'service',
      anchorId: 'setDown',
      rawText: 'när vin serveras'
    }
  },
  {
    id: 'stensota-brons-06',
    format: 'flerval',
    axis: 'techne',
    spar: 'sommellerie',
    pavilion: 'stensota',
    level: 'brons',
    askerRole: 'sommelier',
    prompt: "A 25-year-old Bordeaux is to be decanted. What's the main reason, and what should you avoid?",
    options: [
      'To give the tannins a couple of hours to soften; avoid serving it straight away',
      'To raise the temperature; avoid a cold decanter',
      'To separate the wine from its sediment; avoid leaving it long in the decanter',
      'To blow off the sulphur; avoid pouring too slowly'
    ],
    correctIndex: 2,
    explanation:
      "An old wine is decanted mainly so the sediment stays in the bottle. It's also fragile: too much air can make it fall apart within half an hour. A is right for a young, tight wine — which is why it tempts — but it doesn't apply here.",
    anchor: {
      phase: 'service',
      anchorId: 'setDown',
      rawText: 'när vin serveras'
    }
  },
  {
    id: 'stensota-brons-07',
    format: 'flerval',
    axis: 'techne',
    spar: 'sommellerie',
    pavilion: 'stensota',
    level: 'brons',
    askerRole: 'sommelier',
    prompt:
      'For a crème brûlée, a colleague suggests a dry, crisp white as a contrast. What happens in the mouth?',
    options: [
      'The contrast lifts both wine and dessert',
      'The wine tastes sour and thin because the dessert is sweeter',
      "The wine's acidity cuts through the cream and balances the sweetness",
      'Nothing much, as long as the wine is low in alcohol'
    ],
    correctIndex: 1,
    explanation:
      'Sweet food makes wine taste less sweet and more acidic, so a dry wine turns harsh and thin next to a dessert. The rule of thumb is that the wine should be at least as sweet as the dish. A and C tempt because contrast is often a good pairing move — but not when it comes to sweetness.',
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  },
  {
    id: 'stensota-brons-08',
    format: 'flerval',
    axis: 'techne',
    spar: 'sommellerie',
    pavilion: 'stensota',
    level: 'brons',
    askerRole: 'kock',
    prompt: "I'm putting green asparagus with hollandaise on today's menu. What style of wine should we pair with it?",
    options: [
      'A full, barrel-aged chardonnay to meet the butter',
      'A young, tannic red to stand up to the sauce',
      'A crisp, unoaked white with a green edge, such as sauvignon blanc or grüner veltliner',
      "A sweet riesling to balance the asparagus's bitterness"
    ],
    correctIndex: 2,
    explanation:
      "Asparagus's sulphur compounds and bitterness make oak and tannin taste metallic, while a crisp, unoaked wine with green notes meets them. Its acidity also stands up to the butter in the hollandaise. A tempts because butter sauces are often paired with oaked chardonnay, but the oak clashes with the asparagus.",
    anchor: {
      phase: 'morning',
      rawText: 'morgon'
    }
  },
  {
    id: 'stensota-brons-09',
    format: 'flerval',
    axis: 'techne',
    spar: 'sommellerie',
    pavilion: 'stensota',
    level: 'brons',
    askerRole: 'gäst',
    prompt:
      "The white Burgundy smells of almost nothing. It's been in the ice bucket since you opened it. Is it off?",
    options: [
      'Probably corked; the bottle should be replaced',
      'It needs decanting to open up',
      "It's too cold; let it warm towards 10–12 °C in the glass",
      'The glass is too big, so the aroma disperses'
    ],
    correctIndex: 2,
    explanation:
      "Cold holds the aroma compounds in the wine, so a full-bodied white left long in ice goes mute. A few minutes in the hand or on the table is enough for the aromas to come through. A tempts because muteness can be a cork fault, but corked wines have their own smell of damp cellar — they're not just silent.",
    anchor: {
      phase: 'service',
      anchorId: 'setDown',
      rawText: 'när vin serveras'
    }
  },
  {
    id: 'stensota-brons-10',
    format: 'flerval',
    axis: 'techne',
    spar: 'sommellerie',
    pavilion: 'stensota',
    level: 'brons',
    askerRole: 'gäst',
    prompt: "I'm not drinking tonight. What would go with the fried dish I ordered?",
    options: [
      'A sweet fruit drink to balance the salt',
      'A sparkling drink with clear acidity and little sweetness',
      'A rich, creamy drink to match the fat of the fry',
      'Still water with lemon, so nothing interferes with the flavour'
    ],
    correctIndex: 1,
    explanation:
      'Bubbles and acidity clear fat from the palate the same way champagne does with fried food. Low sweetness keeps the drink from feeling heavy next to the dish. C tempts because like-with-like works in many pairings, but fat against fat only adds weight.',
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  }
];
