// ORDER 229 — Metodkökets tio bronsfrågor.
//
// Källa: `documentation/foundation/vision/content/PAVILJONGFRAGOR_BRONS.md`
// avsnittet "Metodköket — techne, kök" (2026-09-20 av @Someone).
// Formen följer briefen `FRAGORNA_TILL_PAVILJONGERNA.md` §7.
//
// **Källfilen är kanonisk.** Sedan ORDER 262 ligger frågorna som data i
// `../content/questions/` (metadata och spelartext åtskilda) och den här
// modulen läser dem via `questionBank.ts`. Testet
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
import { questionsFor, toFlerval } from './questionBank';

export const METODKOKET_BRONS_QUESTIONS: readonly FlervalQuestion[] =
  questionsFor('metodkoket', 'brons').map(toFlerval);
