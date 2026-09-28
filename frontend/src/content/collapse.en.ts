// ORDER 273 — English sister of collapse.sv.ts (same shape).
//
// ORDER 046 §1 — collapse lines by failing axis.
//
// Hand-authored in the same observer voice as the ambient stream
// (ORDER 043 Addendum B). Each names a specific failure — allergy,
// service breakdown, house-standard slip — that traces to the axis
// that was weakest at the moment of collapse. Four per axis so
// consecutive collapses (rare) at least differ in wording.
//
// Voice guidance: the sentence describes what happened in the room,
// not that the service is ending. The ending is felt by the fact
// that no more lines come after this one — the stream goes quiet.

import type { COLLAPSE_TEXTS as SV_COLLAPSE_TEXTS } from './collapse.sv';

type CollapseTexts = {
  readonly [K in keyof typeof SV_COLLAPSE_TEXTS]: readonly [string, string, string, string];
};

export const COLLAPSE_TEXTS: CollapseTexts = {
  // Scientific — kitchen technique, ingredient handling, allergen
  // discipline. Fails as social (the guest reads the failure as the
  // room; the ambulance is a room event even though the cause is
  // technical).
  scientific: [
    'A guest was served a Waldorf with walnuts even though the allergy was noted — the kitchen did not recognise what was in it.',
    'A badly filleted salmon goes out; the bones reach the table before the flavour does, and the evening turns right there.',
    'A contaminated chopping board slips through unchecked; two tables fall ill quickly and the evening cannot go on.',
    'Raw chicken goes out with the garnish; someone sends it back, someone else has already started eating.'
  ],
  // Cultural — service breakdown, guest-relations misread, booking
  // failure. Also fails as social — a walk-out mid-meal is what the
  // room registers.
  cultural: [
    'A table is double-booked; the party waiting outside watches the seat go to someone else, and they leave.',
    'An upset guest breaks off in the middle of the starter and leaves the room — nobody could answer what they asked.',
    'A booking is missed completely; the party arrives, sees that nothing is ready, and turns away without a word.',
    'A table gets its plates before the starter is cleared; the host notices too late and the evening does not go on.'
  ],
  // Practical — house standard, timing, order accuracy. Fails as
  // economic — a table waiting 40 min for food is a direct hit to
  // the evening's takings and to whether they return.
  practical: [
    'A table waits forty minutes for its food; by the time it comes, half the party has already asked for the bill.',
    'An order is misunderstood three times in a row; the party pays for what came and leaves early.',
    'Two mains are served cold, a third is completely wrong; the evening no longer holds its shape.',
    'The bills do not arrive before the parties get up; one table leaves without paying, and nobody notices until tomorrow.'
  ]
};
