// ORDER 232 — Måltidsbibliotekets tio bronsfrågor.
//
// Källa: `documentation/foundation/vision/content/PAVILJONGFRAGOR_BRONS.md`
// avsnittet "Måltidsbiblioteket — episteme" (tillagt sist i filen).
// Formen följer briefen `FRAGORNA_TILL_PAVILJONGERNA.md` §7.
//
// **Källfilen är kanonisk.** Sedan ORDER 262 ligger frågorna som data i
// `../content/questions/` (metadata och spelartext åtskilda) och den här
// modulen läser dem via `questionBank.ts`. Testet
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
import { questionsFor, toFlerval } from './questionBank';

export const MALTIDBIBLIOTEKET_BRONS_QUESTIONS: readonly FlervalQuestion[] =
  questionsFor('maltidbiblioteket', 'brons').map(toFlerval);
