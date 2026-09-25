// ORDER 233 — Kalastorgets tio bronsfrågor.
//
// Källa: `documentation/foundation/vision/content/PAVILJONGFRAGOR_BRONS.md`
// avsnittet "Kalastorget — fronesis" (tillagt sist i filen).
// Formen följer briefen `FRAGORNA_TILL_PAVILJONGERNA.md` §7.
//
// **Källfilen är kanonisk.** Sedan ORDER 262 ligger frågorna som data i
// `../content/questions/` (metadata och spelartext åtskilda) och den här
// modulen läser dem via `questionBank.ts`. Testet
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
import { questionsFor, toFlerval } from './questionBank';

export const KALASTORGET_BRONS_QUESTIONS: readonly FlervalQuestion[] =
  questionsFor('kalastorget', 'brons').map(toFlerval);
