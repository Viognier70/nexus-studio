// ORDER 232 — Måltidsbibliotekets tio bronsfrågor.
//
// Källa: `documentation/foundation/vision/content/PAVILJONGFRAGOR_BRONS.md`
// avsnittet "Måltidsbiblioteket — episteme" (tillagt sist i filen).
// Formen följer briefen `FRAGORNA_TILL_PAVILJONGERNA.md` §7.
//
// **Källfilen är kanonisk. Denna modul är replikat.** Testet
// `__tests__/maltidbiblioteketBrons.test.ts` läser källfilen på nytt
// vid varje körning och verifierar att modulen matchar per fält
// (samma pattern som ORDER 229 Metodköket + ORDER 231 Stensöta).
//
// **Anmärkning om paviljong-id-stavning:** briefen använder
// `maltidsbiblioteket` (med "s"), som är svensk grammatiskt korrekt.
// Kodbasen har konsekvent `maltidbiblioteket` (utan "s") sedan
// ORDER 104 — se `pavilions.ts:44-49` och seed-frågan
// `r2-seed-maltidbiblioteket` i `questionTemplates.ts:110`. VO
// 2026-09-21: använd befintlig stavning. Visningsnamnet i
// `pavilions.ts` (displayName) rättas i samma commit till
// "Måltidsbiblioteket" med s för att spegla svensk grammatik utan
// att röra id:t.
//
// **Anmärkning om källor:** alla tio frågor saknar KÄLLA-fält i
// briefen. `sources`-fältet på `BaseQuestion` är optionellt och
// utelämnas helt här. Verifierat 2026-09-21: `validateQuestion` läser
// inte sources; `coverageErrors` (bygg-gate) läser inte sources;
// `coverageReport.epistemeWithoutSource` är analys utan test-assert.
// Ingen risk att bryta bygget; känd innehållslucka som Vision Owner
// noterar för framtida källhänvisning.
//
// **Anmärkning om ankare:** fråga #09 (brigadsystemet) är första
// `phase: 'evening'`-frågan i kodbasen. Ingen fyrningsmekanism finns
// för evening-phase idag; ORDER 226 §7 väntar på integration mot
// `bankMeeting.ts`.

import type { FlervalQuestion } from './questionFormats';

export const MALTIDBIBLIOTEKET_BRONS_QUESTIONS: readonly FlervalQuestion[] = [
  {
    id: 'maltidbiblioteket-brons-01',
    format: 'flerval',
    axis: 'episteme',
    spar: null,
    pavilion: 'maltidbiblioteket',
    level: 'brons',
    askerRole: 'gäst',
    prompt: "What's actually the difference between champagne and a crémant?",
    options: [
      'Champagne has its second fermentation in bottle, crémant in tank',
      'Champagne is a protected designation of origin; crémant is made the same way in other French regions',
      'Champagne can only be made from chardonnay, crémant from any grape',
      'Champagne is dry, crémant is always off-dry'
    ],
    correctIndex: 1,
    explanation:
      "Both are made by the traditional method, with the second fermentation in bottle. The difference is where: champagne can only come from the delimited Champagne region, while crémant is the same method in, for example, the Loire, Alsace or Burgundy. A is the tempting wrong answer, since tank fermentation is what people associate with cheaper sparkling wine — but it doesn't apply to crémant.",
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  },
  {
    id: 'maltidbiblioteket-brons-02',
    format: 'flerval',
    axis: 'episteme',
    spar: null,
    pavilion: 'maltidbiblioteket',
    level: 'brons',
    askerRole: 'lärling',
    prompt: 'What actually is umami, and where does the idea come from?',
    options: [
      'A mix of salty and sweet, described by French chefs in the 1800s',
      'The taste of glutamate and certain nucleotides, described by Kikunae Ikeda in Japan in 1908',
      'The feeling of fat in the mouth, named by a Japanese researcher in the 1950s',
      'A catch-all term for fermented flavours, borrowed from Korean cooking'
    ],
    correctIndex: 1,
    explanation:
      "Ikeda isolated glutamate from kombu, the kelp in dashi, and named the taste umami. It was later shown that nucleotides such as inosinate and guanylate amplify it, which explains why kombu and bonito work so well together. A tempts because umami is often described as round and full, but it's a basic taste in its own right, with its own receptors.",
    anchor: {
      phase: 'morning',
      rawText: 'morgon'
    }
  },
  {
    id: 'maltidbiblioteket-brons-03',
    format: 'flerval',
    axis: 'episteme',
    spar: null,
    pavilion: 'maltidbiblioteket',
    level: 'brons',
    askerRole: 'kock',
    prompt: "Which of these is not one of Escoffier's five mother sauces?",
    options: ['Velouté', 'Espagnole', 'Béarnaise', 'Béchamel'],
    correctIndex: 2,
    explanation:
      "Escoffier's five mother sauces are béchamel, velouté, espagnole, tomato and hollandaise. Béarnaise is a daughter of hollandaise, with tarragon and vinegar. It tempts because it's so central to classical cooking — but it's built on a mother sauce rather than being one.",
    anchor: {
      phase: 'morning',
      rawText: 'morgon'
    }
  },
  {
    id: 'maltidbiblioteket-brons-04',
    format: 'flerval',
    axis: 'episteme',
    spar: null,
    pavilion: 'maltidbiblioteket',
    level: 'brons',
    askerRole: 'gäst',
    prompt: "What's the difference between dry-aged beef and beef aged in a vacuum bag?",
    options: [
      'Vacuum-aged is always more tender, because the moisture stays in',
      'Dry ageing only affects the surface; the inside is the same',
      "Dry-aged loses moisture and gains a concentrated, nutty flavour; both tenderise through the meat's own enzymes",
      'The only difference is how long the meat has hung'
    ],
    correctIndex: 2,
    explanation:
      "In both methods the meat's own enzymes break down muscle proteins and make it more tender. Dry-aged meat also loses moisture and develops nutty, slightly cheesy notes, which vacuum-aged meat does not. B tempts because the dry crust is trimmed off, but the change in flavour runs through the whole piece.",
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  },
  {
    id: 'maltidbiblioteket-brons-05',
    format: 'flerval',
    axis: 'episteme',
    spar: null,
    pavilion: 'maltidbiblioteket',
    level: 'brons',
    askerRole: 'gäst',
    prompt: 'This tomato sauce feels like something truly old. Have Italians eaten tomato sauce since Roman times?',
    options: [
      'Yes, tomatoes were already grown in the Roman Empire',
      'No, the tomato came from the Americas in the 1500s and only found its place in Italian cooking from the late 1600s',
      'Yes, the tomato arrived from Asia along the Silk Road in the Middle Ages',
      'No, tomato sauce was invented in the USA and brought to Italy by returning emigrants'
    ],
    correctIndex: 1,
    explanation:
      'The tomato originated in South America and reached Europe after Columbus. It was long regarded with suspicion, and the first printed Italian recipes for tomato sauce date from the 1690s. A tempts because the tomato feels so fundamental to Italian food, but in that kitchen it is younger than both pasta and olive oil.',
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  },
  {
    id: 'maltidbiblioteket-brons-06',
    format: 'flerval',
    axis: 'episteme',
    spar: null,
    pavilion: 'maltidbiblioteket',
    level: 'brons',
    askerRole: 'lärling',
    prompt: 'What do people mean by terroir?',
    options: [
      'The earthy smell some wines have',
      'The combined influence of a place — soil, climate, aspect and often local tradition — on what grows there',
      'The grape variety a wine is made from',
      'An official quality classification of French vineyards'
    ],
    correctIndex: 1,
    explanation:
      'Terroir describes how a place shapes a product through soil, climate, slope and often long-established practice. The term is used for wine but also for cheese, coffee and tea. A tempts because the word resembles terre, earth, and earthy notes are sometimes put down to terroir — but the concept is about the place, not a smell.',
    anchor: {
      phase: 'morning',
      rawText: 'morgon'
    }
  },
  {
    id: 'maltidbiblioteket-brons-07',
    format: 'flerval',
    axis: 'episteme',
    spar: null,
    pavilion: 'maltidbiblioteket',
    level: 'brons',
    askerRole: 'kock',
    prompt: 'The sorbet recipe calls for 28 °Brix. What does that measure?',
    options: [
      'The content of dissolved solids, in practice mostly sugar, in the liquid',
      'The acidity of the fruit purée',
      "The liquid's viscosity at serving temperature",
      'The share of solid fruit pulp in the base'
    ],
    correctIndex: 0,
    explanation:
      'One degree Brix corresponds to roughly one gram of dissolved sugar per hundred grams of solution, and is measured with a refractometer. In sorbet the sugar content decides how hard it freezes, so Brix is a working measure — the same one used for ripeness in grape must. C tempts because sugar does affect texture, but Brix measures content, not how thick the liquid is.',
    anchor: {
      phase: 'morning',
      rawText: 'morgon'
    }
  },
  {
    id: 'maltidbiblioteket-brons-08',
    format: 'flerval',
    axis: 'episteme',
    spar: null,
    pavilion: 'maltidbiblioteket',
    level: 'brons',
    askerRole: 'kock',
    prompt:
      'A guest has declared an allergy. Which of these ingredients must, under EU rules, be declarable as an allergen?',
    options: ['Tomato', 'Garlic', 'Celery', 'Paprika'],
    correctIndex: 2,
    explanation:
      "Celery is one of the fourteen substances the EU requires restaurants to be able to declare, along with mustard, sesame and lupin, among others. It often hides in stocks, broths and spice blends, which makes it easy to miss. Tomato and garlic can cause sensitivities in individual guests, but they aren't on the list.",
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  },
  {
    id: 'maltidbiblioteket-brons-09',
    format: 'flerval',
    axis: 'episteme',
    spar: null,
    pavilion: 'maltidbiblioteket',
    level: 'brons',
    askerRole: 'lärling',
    prompt: 'Why is the kitchen organisation with chef de partie and commis called the brigade system?',
    options: [
      'It was modelled on the Paris fire brigade',
      'Escoffier organised the kitchen on a military model around 1900',
      'It comes from monastery kitchens in the Middle Ages',
      'It was introduced by the new restaurants of the French Revolution'
    ],
    correctIndex: 1,
    explanation:
      'Auguste Escoffier, who had served in the army himself, divided the kitchen into stations with a clear chain of command to handle large hotel services. The structure lives on today in titles such as sous-chef and chef de partie. The Revolution tempts because it gave rise to the first restaurants, but the kitchen brigade came a century later.',
    anchor: {
      phase: 'evening',
      rawText: 'kväll'
    }
  },
  {
    id: 'maltidbiblioteket-brons-10',
    format: 'flerval',
    axis: 'episteme',
    spar: null,
    pavilion: 'maltidbiblioteket',
    level: 'brons',
    askerRole: 'gäst',
    prompt: 'What does confit actually mean — is it just a fancier word for fried duck?',
    options: [
      'No, it means marinated in wine before cooking',
      'No, it means cold-smoked and aged',
      'No, it means preserved by slow cooking and storage in fat or sugar',
      'No, it means pickled in vinegar and spices'
    ],
    correctIndex: 2,
    explanation:
      'The word comes from the French confire, to preserve. The duck is cooked slowly in its own fat and can then be kept covered by it, just as fruit is preserved in sugar. D tempts because pickling is also a form of preservation, but confit relies on fat or sugar, not acid.',
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  }
];
