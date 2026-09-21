// ORDER 229 — Metodkökets tio bronsfrågor.
//
// Källa: `documentation/foundation/vision/content/PAVILJONGFRAGOR_BRONS.md`
// avsnittet "Metodköket — techne, kök" (2026-09-20 av @Someone).
// Formen följer briefen `FRAGORNA_TILL_PAVILJONGERNA.md` §7.
//
// **Källfilen är kanonisk. Denna modul är replikat.** Testet
// `__tests__/metodkoketBrons.test.ts` läser källfilen på nytt vid
// varje körning och verifierar att modulen matchar (per ORDER 160-
// principen — talen ur skriptets källa, inte fixturer). Om briefen
// ändras utan att den här filen regenereras bryter testet.
//
// Ingen picker läser dessa frågor ännu. `pickBankQuestionForContext`
// / `pickQuestionForAnchor` byggs i Fas 2 (ORDER 224 §7). Tills dess
// är modulen innehåll som väntar på anropare — men ligger i typecheck-
// bar form så framtida integration inte kräver innehållsomskrivning.

import type { FlervalQuestion } from './questionFormats';

export const METODKOKET_BRONS_QUESTIONS: readonly FlervalQuestion[] = [
  {
    id: 'metodkoket-brons-01',
    format: 'flerval',
    axis: 'techne',
    spar: 'kok',
    pavilion: 'metodkoket',
    level: 'brons',
    askerRole: 'kock',
    prompt:
      "You're browning celeriac in butter and want deep colour without a burnt sweetness. What separates the Maillard reaction from caramelisation?",
    options: [
      'Maillard needs amino acids together with reducing sugars; caramelisation is sugar breaking down on its own, without nitrogen',
      'Maillard happens in fat, caramelisation in water',
      'Maillard needs a higher temperature than caramelisation',
      'Maillard gives the colour, caramelisation gives the flavour'
    ],
    correctIndex: 0,
    explanation:
      'Maillard is a reaction between an amino group and a reducing sugar, which is why it produces nitrogen-bearing aromas that caramelisation lacks. C is the tempting wrong answer because both happen under high heat — but pure sugar only caramelises at around 160 °C, while Maillard gets going well below that.',
    anchor: {
      phase: 'service',
      station: 'range',
      rawText: 'vid stationen, när grönsaker bryns'
    }
  },
  {
    id: 'metodkoket-brons-02',
    format: 'flerval',
    axis: 'techne',
    spar: 'kok',
    pavilion: 'metodkoket',
    level: 'brons',
    askerRole: 'kock',
    prompt:
      "A chicken thigh has been in a 60 °C water bath for a long time. A colleague says it's unsafe because it never reached 70 °C. What decides whether it's safe?",
    options: [
      'Core temperature alone — chicken below 70 °C is never safe',
      'Temperature and holding time together; long enough at 60 °C gives the same reduction as a moment at 70 °C',
      'The low-oxygen environment in the vacuum bag, which stops salmonella',
      'The resting time after the bath, while the heat evens out'
    ],
    correctIndex: 1,
    explanation:
      "Pasteurisation is a logarithmic reduction that depends on both temperature and time, so enough minutes at 60 °C are as safe as a few seconds at 70 °C. A is what a half-trained cook answers, because 70 °C is the number taught for quick cooking — but that number assumes a short time. Low oxygen doesn't help: salmonella is a facultative anaerobe.",
    anchor: {
      phase: 'morning',
      station: 'range',
      rawText: 'vid stationen, när badet sätts på morgonen'
    }
  },
  {
    id: 'metodkoket-brons-03',
    format: 'flerval',
    axis: 'techne',
    spar: 'kok',
    pavilion: 'metodkoket',
    level: 'brons',
    askerRole: 'kock',
    prompt:
      'A gelatine jelly needs to go vegetarian with agar. What difference will the guest notice most in the mouth?',
    options: [
      'The agar jelly only sets when chilled and runs as soon as it leaves the fridge',
      "The agar jelly doesn't melt at body temperature; it breaks into pieces instead",
      'The agar jelly is softer and looser than the gelatine one',
      'The agar jelly needs acid to set, so it tastes sour'
    ],
    correctIndex: 1,
    explanation:
      'Gelatine melts at around 35 °C, just below body temperature, which gives the melt on the tongue guests expect. Agar only melts at around 85 °C and holds its shape in the mouth, so the jelly fractures instead of melting. A has it backwards — gelatine, not agar, is the heat-sensitive one of the two.',
    anchor: {
      phase: 'morning',
      station: 'pastry',
      rawText: 'när en dessert sätts inför service'
    }
  },
  {
    id: 'metodkoket-brons-04',
    format: 'flerval',
    axis: 'techne',
    spar: 'kok',
    pavilion: 'metodkoket',
    level: 'brons',
    askerRole: 'kock',
    prompt: 'The hollandaise splits when it gets too hot. What has happened to the emulsion?',
    options: [
      'The butter has evaporated and left the water phase on its own',
      'The acid from the lemon has been neutralised, so the pH has risen',
      'The egg yolk proteins have coagulated and let go of the fat droplets they were keeping apart',
      'The fat droplets have become too small to hold together'
    ],
    correctIndex: 2,
    explanation:
      "It's the yolk's proteins and lecithin that wrap around the fat droplets and stop them merging. When heat coagulates the proteins they lose that function and the fat separates out. B is tempting because the acid does help stability, but heat doesn't remove it — it's the protein that gives way.",
    anchor: {
      phase: 'service',
      station: 'range',
      rawText: 'vid stationen, mitt i service'
    }
  },
  {
    id: 'metodkoket-brons-05',
    format: 'flerval',
    axis: 'techne',
    spar: 'kok',
    pavilion: 'metodkoket',
    level: 'brons',
    askerRole: 'kock',
    prompt:
      'Why are cooks often told not to salt a steak ten minutes before searing, when forty minutes is fine?',
    options: [
      'After ten minutes the drawn-out liquid is still on the surface and stops browning; after forty it has been reabsorbed',
      "Salt can't dissolve in ten minutes and seasons unevenly",
      "After ten minutes the salt has coagulated the surface proteins so they can't brown",
      'Short contact with salt tastes bitter; longer contact mellows it'
    ],
    correctIndex: 0,
    explanation:
      'Salt first draws out liquid by osmosis, and that liquid has to boil off before the surface can reach browning temperature. Given more time, the salt dissolves in the liquid and is drawn back into the meat, so the surface dries out again. B is the most likely wrong answer — salt dissolves quickly; the problem is where the liquid sits, not how evenly the salt is spread.',
    anchor: {
      phase: 'morning',
      station: 'range',
      rawText: 'vid stationen, när kött förbereds före service'
    }
  },
  {
    id: 'metodkoket-brons-06',
    format: 'flerval',
    axis: 'techne',
    spar: 'kok',
    pavilion: 'metodkoket',
    level: 'brons',
    askerRole: 'kock',
    prompt:
      'A starch-thickened sauce thins out after lemon juice is added and it keeps simmering. Why?',
    options: [
      'The acid binds the water, leaving less for the starch',
      'The acid lowers the boiling point, so the starch never gelatinises',
      'The acid hydrolyses the starch chains, which become too short to thicken',
      'The acid denatures the gluten in the flour, which carries the texture'
    ],
    correctIndex: 2,
    explanation:
      "Under heat, acid cuts the long amylose and amylopectin chains into shorter pieces, and short chains hold far less water. That's why acid is best added late, once the sauce has come together. D is tempting because gluten is what you associate with wheat flour, but in a sauce it's the starch, not the protein, doing the work.",
    anchor: {
      phase: 'service',
      station: 'pass',
      rawText: 'vid stationen, när en sås justeras före uppläggning'
    }
  },
  {
    id: 'metodkoket-brons-07',
    format: 'flerval',
    axis: 'techne',
    spar: 'kok',
    pavilion: 'metodkoket',
    level: 'brons',
    askerRole: 'kock',
    prompt: 'A vegetable ferment is sitting in a four per cent brine. What is the salt mainly doing?',
    options: [
      'Holding back salt-sensitive microbes so the lactic acid bacteria get a head start',
      'Lowering the pH straight away and so starting the fermentation',
      'Providing nutrients the lactic acid bacteria need to multiply',
      'Stopping all microbial activity until acid starts to form'
    ],
    correctIndex: 0,
    explanation:
      "Salt is selective, not sterilising: lactic acid bacteria tolerate more salt than most of the bacteria and moulds that would otherwise take over. The drop in pH comes afterwards, from the bacteria's own lactic acid — not from the salt. That makes B the most common wrong answer, since the end result really is a sour brine.",
    anchor: {
      phase: 'service',
      station: 'brew',
      rawText: 'vid bryggkaret, när en sats sätts'
    }
  },
  {
    id: 'metodkoket-brons-08',
    format: 'flerval',
    axis: 'techne',
    spar: 'kok',
    pavilion: 'metodkoket',
    level: 'brons',
    askerRole: 'kock',
    prompt: 'Peas are blanched before freezing. What is the main purpose?',
    options: [
      'To kill bacteria so the peas keep longer in the freezer',
      'To deactivate enzymes that would otherwise break down colour and flavour in frozen storage',
      'To drive out air so the ice crystals are smaller',
      'To fix the chlorophyll permanently'
    ],
    correctIndex: 1,
    explanation:
      "Enzymes such as peroxidase and lipoxygenase keep working slowly even at minus eighteen, and over time they bring hay-like, grassy off-flavours. Blanching knocks them out. A is tempting because heat treatment is usually about microbes, but in the freezer the bacteria are already stopped — it's the enzymes that carry on.",
    anchor: {
      phase: 'morning',
      rawText: 'morgon'
    }
  },
  {
    id: 'metodkoket-brons-09',
    format: 'flerval',
    axis: 'techne',
    spar: 'kok',
    pavilion: 'metodkoket',
    level: 'brons',
    askerRole: 'kock',
    prompt:
      "A beef chuck has had three hours at 62 °C in a water bath and is still tough. What's missing?",
    options: [
      "A higher core temperature, since collagen doesn't dissolve below 70 °C",
      'Time, since collagen converts to gelatine slowly at low temperature',
      'Rest, so the muscle fibres relax and take the juices back up',
      'Salt, which has to penetrate to break down the connective tissue'
    ],
    correctIndex: 1,
    explanation:
      "Collagen converts to gelatine even just above 60 °C, but the process depends heavily on time and can take a day rather than a few hours. A is the obvious answer for anyone who learned braising at 85 °C — but there it's the higher temperature that makes the time short, not the other way round.",
    anchor: {
      phase: 'service',
      station: 'range',
      rawText: 'vid stationen, när nästa dags mise en place sätts'
    }
  },
  {
    id: 'metodkoket-brons-10',
    format: 'flerval',
    axis: 'techne',
    spar: 'kok',
    pavilion: 'metodkoket',
    level: 'brons',
    askerRole: 'kock',
    prompt:
      "The meringue won't whip up despite long whisking. What's the most common cause?",
    options: [
      'The egg whites were too cold when whisking started',
      'The sugar went in too late',
      'Traces of fat in the bowl or from the yolk',
      'The bowl was stainless steel rather than copper'
    ],
    correctIndex: 2,
    explanation:
      'Fat molecules get in between the egg-white proteins and stop them forming the continuous film that holds the air bubbles. A single drop of yolk is enough. A is tempting because room-temperature whites do whip more easily — but cold makes the foam slower, not impossible.',
    anchor: {
      phase: 'morning',
      rawText: 'morgon'
    }
  }
];
