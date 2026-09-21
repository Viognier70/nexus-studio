// ORDER 233 — Kalastorgets tio bronsfrågor.
//
// Källa: `documentation/foundation/vision/content/PAVILJONGFRAGOR_BRONS.md`
// avsnittet "Kalastorget — fronesis" (tillagt sist i filen).
// Formen följer briefen `FRAGORNA_TILL_PAVILJONGERNA.md` §7.
//
// **Källfilen är kanonisk. Denna modul är replikat.** Testet
// `__tests__/kalastorgetBrons.test.ts` läser källfilen på nytt vid
// varje körning och verifierar att modulen matchar per fält (samma
// pattern som ORDER 229/231/232).
//
// **Ankarmappning** (per VO 2026-09-21):
//   - "när gästen tas emot"     → anchorId='greet'        (koreografi)
//   - "när beställningen tas upp" → anchorId='order'      (koreografi)
//   - "när notan begärs"        → anchorId='requestCheck' (koreografi)
//   - "när en gäst klagar"      → phase='service' UTAN anchorId
//                                  (väntar på Fas 2 `guest_complaint`-
//                                  event per ORDER 224 §7)
//   - "morgon" → phase='morning'
//   - "kväll"  → phase='evening'
//
// Kalastorget är sista av de fyra brons-paviljongerna. Efter denna
// modul finns 40 brons-frågor totalt (Metodköket 10 + Stensöta 10 +
// Måltidsbiblioteket 10 + Kalastorget 10) — samma tal som
// FRAGORNA_TILL_PAVILJONGERNA.md §8 angav som "fyrtio innan det är
// värt att pröva".

import type { FlervalQuestion } from './questionFormats';

export const KALASTORGET_BRONS_QUESTIONS: readonly FlervalQuestion[] = [
  {
    id: 'kalastorget-brons-01',
    format: 'flerval',
    axis: 'phronesis',
    spar: null,
    pavilion: 'kalastorget',
    level: 'brons',
    askerRole: 'värd',
    prompt:
      'A party of five walks in without a booking on a Friday. Every table is taken, and the first one frees up in about forty minutes. What do you do?',
    options: [
      'Tell them a table will be free shortly, so they stay',
      'Give them an honest wait time and offer seats at the bar or a booking another night',
      'Squeeze them onto a four-top with an extra chair',
      "Apologise that you're full and ask them to come back"
    ],
    correctIndex: 1,
    explanation:
      "An honest wait lets the party decide for themselves, and the bar or a new booking means they don't leave empty-handed. C is tempting because they'd be seated at once, but a cramped table makes a worse evening for them and worse service for the tables around them. A buys time but costs trust when forty minutes becomes an hour.",
    anchor: {
      phase: 'service',
      anchorId: 'greet',
      rawText: 'när gästen tas emot'
    }
  },
  {
    id: 'kalastorget-brons-02',
    format: 'flerval',
    axis: 'phronesis',
    spar: null,
    pavilion: 'kalastorget',
    level: 'brons',
    askerRole: 'servitör',
    prompt:
      "The guest ordered her steak medium rare, but it's well done. She mentions it calmly as you pass. What do you do?",
    options: [
      'Explain that the meat keeps cooking while it rests',
      'Take the plate straight away, apologise briefly and make sure a new steak jumps the queue in the kitchen',
      'Check with the chef before saying anything to the guest',
      "Offer a discount on the bill so she doesn't have to wait"
    ],
    correctIndex: 1,
    explanation:
      "The mistake is obvious and the guest is right, so what matters most is acting at once and visibly. A short apology is enough; it's the new steak that rescues the evening. C tempts because it feels thorough, but walking off without taking the plate leaves the guest with the mistake in front of her.",
    anchor: {
      // phase='service' UTAN anchorId — väntar på Fas 2:s guest_complaint-
      // event per ORDER 224 §7 (VO:s prio 1 av 9 händelsetyper).
      phase: 'service',
      rawText: 'när en gäst klagar'
    }
  },
  {
    id: 'kalastorget-brons-03',
    format: 'flerval',
    axis: 'phronesis',
    spar: null,
    pavilion: 'kalastorget',
    level: 'brons',
    askerRole: 'gäst',
    prompt: "I'm allergic to nuts. Can I have the panna cotta?",
    options: [
      'Yes, there are no nuts in the menu description',
      'No, to be safe we advise against all desserts',
      "You check with the kitchen what's in it and how it's handled, and come back before anything is served",
      'Yes, as long as the guest has their medication with them'
    ],
    correctIndex: 2,
    explanation:
      "The menu describes the dish, not everything in it or everything it has touched — pralines, garnishes and shared utensils don't show up there. Checking and coming back takes a minute and takes the allergy seriously. A is the tempting wrong answer because it sounds helpful, but a quick yes on the wrong grounds can turn serious.",
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  },
  {
    id: 'kalastorget-brons-04',
    format: 'flerval',
    axis: 'phronesis',
    spar: null,
    pavilion: 'kalastorget',
    level: 'brons',
    askerRole: 'gäst',
    prompt:
      "I'm here a lot. Could the kitchen make that pasta from last season tonight, even though it's not on the menu?",
    options: [
      'Yes, regulars should always get what they ask for',
      "No, we only cook what's on the menu",
      "You ask the kitchen before answering, and if it can't be done you suggest the closest thing",
      'Yes, and you ask the kitchen to prioritise it because the guest is a regular'
    ],
    correctIndex: 2,
    explanation:
      "Whether it's possible depends on what the kitchen has in and how stretched it is right then — the person at the table doesn't know that. Asking first avoids promising something the kitchen can't deliver. A tempts because regulars matter, but a promise the kitchen then has to break hurts the relationship more than a friendly no with an alternative.",
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  },
  {
    id: 'kalastorget-brons-05',
    format: 'flerval',
    axis: 'phronesis',
    spar: null,
    pavilion: 'kalastorget',
    level: 'brons',
    askerRole: 'lärling',
    prompt: 'The guest at table seven is visibly drunk and orders another glass. What do I do?',
    options: [
      'Serve it, but a smaller glass',
      "Ask the rest of the party whether it's all right",
      "Say discreetly that you won't serve more alcohol tonight, and offer water and something to eat",
      'Ask the guest to leave the restaurant'
    ],
    correctIndex: 2,
    explanation:
      "Under Swedish law, alcohol may not be served to anyone who is visibly intoxicated, so the answer is no whatever the size of the glass. Saying so discreetly while offering water and food lets the guest keep their dignity. B tempts because the party knows the guest, but responsibility for serving can't be handed over to them.",
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  },
  {
    id: 'kalastorget-brons-06',
    format: 'flerval',
    axis: 'phronesis',
    spar: null,
    pavilion: 'kalastorget',
    level: 'brons',
    askerRole: 'gäst',
    prompt: "I don't think we ordered this bottle on the bill. Could you look at it?",
    options: [
      'Show the till printout as proof',
      "Go through the order calmly with the guest, and take the item off if it can't be sorted out",
      'Fetch the manager straight away',
      'Say it has to be paid, but offer a discount next time'
    ],
    correctIndex: 1,
    explanation:
      "The last minutes of the evening shape the guest's memory of the whole visit, and a disputed bottle is worth less than that relationship. Going through the order together without assigning blame settles most cases. A tempts because the system is usually right, but proving the guest wrong wins the argument and loses the guest.",
    anchor: {
      phase: 'service',
      anchorId: 'requestCheck',
      rawText: 'när notan begärs'
    }
  },
  {
    id: 'kalastorget-brons-07',
    format: 'flerval',
    axis: 'phronesis',
    spar: null,
    pavilion: 'kalastorget',
    level: 'brons',
    askerRole: 'kock',
    prompt: "We're out of lamb. Table four ordered it five minutes ago. How do we handle it?",
    options: [
      'Wait until the mains go out and explain then',
      'Go to the table now, say it as it is, and suggest a couple of alternatives',
      "Send out a different dish and explain when it's served",
      'Ask the kitchen to improvise something similar without saying anything'
    ],
    correctIndex: 1,
    explanation:
      "The sooner the guest knows, the more time there is to choose again without upsetting the table's pace. Two concrete alternatives turn the news into a choice rather than a loss. A tempts because it puts off an awkward conversation, but then the guest sits without food while the rest of the table eats.",
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  },
  {
    id: 'kalastorget-brons-08',
    format: 'flerval',
    axis: 'phronesis',
    spar: null,
    pavilion: 'kalastorget',
    level: 'brons',
    askerRole: 'värd',
    prompt:
      'The party at the window table has paid but is still sitting and talking. The next booking arrives in fifteen minutes. What do you do?',
    options: [
      'Start clearing around them so they get the hint',
      'Let them stay and ask the next party to wait by the door',
      'Tell them kindly and in good time that the table is booked, and offer coffee at the bar',
      'Wait until the next party is at the door, then ask the first to leave'
    ],
    correctIndex: 2,
    explanation:
      "A friendly heads-up in good time lets the party finish in peace, and coffee at the bar turns the move into a continuation rather than an eviction. A tempts because it avoids a conversation, but wordless hints come across as rude. B protects one party at the other's expense.",
    anchor: {
      phase: 'service',
      anchorId: 'requestCheck',
      rawText: 'när notan begärs'
    }
  },
  {
    id: 'kalastorget-brons-09',
    format: 'flerval',
    axis: 'phronesis',
    spar: null,
    pavilion: 'kalastorget',
    level: 'brons',
    askerRole: 'värd',
    prompt:
      'A waiter has called in sick. Sixty covers are booked tonight. What do you do before opening?',
    options: [
      'Run as usual and hope the evening holds',
      'Cancel the last bookings to bring the numbers down',
      'Simplify the evening — for example fewer sittings or a shorter menu — and go through the new split with the team',
      "Take over the absent waiter's whole station on top of your own work"
    ],
    correctIndex: 2,
    explanation:
      'A team one person short can handle the same evening if the pace is adjusted and everyone knows their new job before the doors open. Simplifying is a decision; hoping is not. D tempts because it feels responsible, but a host doing two jobs loses the overview the evening needs.',
    anchor: {
      phase: 'morning',
      rawText: 'morgon'
    }
  },
  {
    id: 'kalastorget-brons-10',
    format: 'flerval',
    axis: 'phronesis',
    spar: null,
    pavilion: 'kalastorget',
    level: 'brons',
    askerRole: 'värd',
    prompt:
      'The apprentice made a mistake at table twelve that led to a complaint. How do you raise it?',
    options: [
      'In front of the whole team at the evening debrief, so everyone learns',
      'One to one, after service or in the morning, focusing on what happened and what will be done differently',
      "At the next staff appraisal, so it doesn't get too emotional",
      'Let it go, since the guest already had an apology'
    ],
    correctIndex: 1,
    explanation:
      'A private conversation while the event is fresh makes it possible to understand what happened without the apprentice having to defend themselves in front of others. Focusing on next time turns the mistake into learning. A tempts because others could learn too, but that lesson can be shared as an example without a name.',
    anchor: {
      phase: 'evening',
      rawText: 'kväll'
    }
  }
];
