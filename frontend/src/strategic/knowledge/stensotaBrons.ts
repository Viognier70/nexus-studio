// ORDER 231 — Stensötas tio bronsfrågor.
//
// Källa: `documentation/foundation/vision/content/PAVILJONGFRAGOR_BRONS.md`
// avsnittet "Stensöta — techne, sommellerie" (2026-09-21 re-export).
// Formen följer briefen `FRAGORNA_TILL_PAVILJONGERNA.md` §7.
//
// **Källfilen är kanonisk.** Sedan ORDER 262 ligger frågorna som data i
// `../content/questions/` (metadata och spelartext åtskilda) och den här
// modulen läser dem via `questionBank.ts`. Testet
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
import { questionsFor, toFlerval } from './questionBank';

export const STENSOTA_BRONS_QUESTIONS: readonly FlervalQuestion[] =
  questionsFor('stensota', 'brons').map(toFlerval);
