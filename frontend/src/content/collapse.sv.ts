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

export const COLLAPSE_TEXTS = {
  // Scientific — kitchen technique, ingredient handling, allergen
  // discipline. Fails as social (the guest reads the failure as the
  // room; the ambulance is a room event even though the cause is
  // technical).
  scientific: [
    'En gäst fick Waldorf med valnötter trots att allergin var noterad — köket kände inte igen sammansättningen.',
    'En dåligt fileerad lax skickas ut; benen når bordet före smaken, och kvällen ändrar riktning där.',
    'En kontaminerad skärbräda passerar okontrollerat; två bord blir hastigt sjuka och kvällen kan inte fortsätta.',
    'Rå kyckling går ut med garnityret; någon skickar tillbaka den, någon annan har redan börjat äta.'
  ],
  // Cultural — service breakdown, guest-relations misread, booking
  // failure. Also fails as social — a walk-out mid-meal is what the
  // room registers.
  cultural: [
    'Ett bord bokas dubbelt; det sällskap som stod utanför får se sig lämnas åt en tom stol och går.',
    'En upprörd gäst avbryter mitt i förrätten och lämnar rummet — ingen kunde svara på det som frågades.',
    'En bokning missas helt; sällskapet kommer, ser att inget står redo, och vänder utan att säga något.',
    'Ett bord får sina tallrikar innan förrätten är borta; värden märker det för sent och kvällen fortsätter inte.'
  ],
  // Practical — house standard, timing, order accuracy. Fails as
  // economic — a table waiting 40 min for food is a direct hit to
  // the evening's takings and to whether they return.
  practical: [
    'Ett bord får vänta fyrtio minuter på maten; när den kommer har halva sällskapet redan bett om notan.',
    'En beställning missförstås tre gånger i rad; sällskapet betalar för det som kom och lämnar tidigt.',
    'Två varmrätter serveras kalla, en tredje är helt fel; kvällen håller inte formen längre.',
    'Notorna kommer inte fram innan sällskapen bryter upp; ett bord går utan att betala, det märks först i morgon.'
  ]
} as const;
