// pyramidStrings.ts — rätt, fel och pyramiden i raketkortet. 12 nycklar, { sv, en }.
// why.* hör till exemplet *Det korkade vinet* i leverans 1 (rocketCard.a1–a4). Varje händelse i leverans 3 har sina egna.

export const PYRAMID_STRINGS = {
  "pyramid.kicker": { sv: "Kunskapspyramiden", en: "The knowledge pyramid" },
  "verdict.right": { sv: "Rätt", en: "Right" },
  "verdict.wrong": { sv: "Inte den här gången", en: "Not this time" },
  "verdict.held": { sv: "Det här hade hållit", en: "This would have held" },
  "why.right": { sv: "Korken sitter i vinet och går inte att vädra bort. Du luktar själv, håller med värden och byter flaskan, så behöver hen aldrig försvara sin näsa.", en: "Cork taint is in the wine and won't air away. You smell it yourself, agree with the host and replace the bottle, so they never have to defend their nose." },
  "why.a1": { sv: "Luft hjälper ett vin som är stängt, men inte ett som är korkat. Doften sitter kvar hur länge det än står. Lukta själv och byt flaskan.", en: "Air helps a wine that is closed, but not one that is corked. The smell stays however long it stands. Smell it yourself and replace the bottle." },
  "why.a3": { sv: "Att vänta är vänligt menat, men korken försvinner inte, och värden får bära misstaget en stund till. Lukta själv och byt flaskan.", en: "Waiting is kindly meant, but the taint won't go, and the host carries the mistake a while longer. Smell it yourself and replace the bottle." },
  "why.a4": { sv: "Ett nytt glas ur samma flaska har samma kork. Det är flaskan som behöver bytas, inte glaset.", en: "A new glass from the same bottle has the same taint. It's the bottle that needs replacing, not the glass." },
  "pyramid.next": { sv: "Nästa steg", en: "Next step" },
  "pyramid.takeover": { sv: "Per tar över vid bordet", en: "Per takes over at the table" },
  "pyramid.full": { sv: "Hela pyramiden", en: "The whole pyramid" },
  "pyramid.full.sub": { sv: "Vad och varför, hur och när. Du kunde alla tre.", en: "What and why, how and when. You knew all three." },
} as const;
