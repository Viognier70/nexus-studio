// ORDER 104 §Q1–Q2 — prov-mekanik.
//
// Fråge-selektion är deterministisk (fast frö per prov, samma seed
// → samma frågor i samma ordning). Ingen Math.random. Ingen fetch.
// Kreditformeln är enkel per §Q2 — 1 kredit per rätt svar på frågans
// axel och spår, ingen tröskel, ingen bonus.
//
// Denna modul är rena funktioner. Reducerns exam-hanterare (i
// simulation/reducer.ts) importerar `selectQuestionsForExam` och
// `computeExamCredits`. UI-lagret läser aldrig direkt härifrån —
// gången är alltid via `state.currentExam`.

import type { KnowledgeAxis, YrkesSpar } from '../types';
import { PAVILION_CONFIGS, type PavilionId } from './pavilions';
import type { Question } from './questionFormats';

// Antal frågor per prov. Kort per §Q2 (enkel formel, mät sedan).
// Fem frågor är ett lagom prov-block — tillräckligt för statistisk
// variation, kort nog att inte kännas som en tentamen. Konstant, inte
// per-paviljong; svårighetskurvan (R7) kan senare variera detta per
// varv om det behövs.
export const QUESTIONS_PER_EXAM = 5;

// Enkelt fast-frö-hash: samma sträng + samma nummer → samma nummer.
// FNV-1a-variant, ingen Math.random. Används av selectQuestionsForExam
// för att blanda kandidaterna i deterministisk ordning per seed.
function hashSeed(input: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Fisher-Yates shuffle med determinerat frö. Standard-implementation
// — enda tvisten är att `rand()` är hash-baserad istället för
// Math.random för att bibehålla fixed-seed-harnessens determinism.
function shuffleDeterministic<T>(arr: readonly T[], seed: number): T[] {
  const out = [...arr];
  let state = seed >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    // LCG-steg — enkel PRNG, tillräckligt god fördelning för att
    // shuffle-fördelningen inte ska förutses av spelaren.
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    const j = state % (i + 1);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

// ORDER 104 §2 — filtrera frågebanken till kandidater som matchar
// paviljongens axel + spår.
//
// Gastronomiska Teatern (axis = 'all') matchar alla tre axlar och
// båda spåren; övriga paviljonger matchar en specifik axel och
// (om spårat) sitt spår, eller (om spårlöst) frågor utan spår.
//
// En fråga vars `pavilion`-fält är satt till en annan paviljong än
// den vi söker frågor för SKA fortfarande vara berättigad om axel-
// och spår-kraven matchar — pavilion-fältet är kurateringshänvisning,
// inte hård gräns. Regeln vore annars: en fråga skulle kunna hamna i
// "endast en paviljong", och de tomma paviljongerna skulle behöva
// exklusivt innehåll skrivet från noll. Löst kopplat är rimligt.
function questionMatchesPavilion(q: Question, pavilion: PavilionId): boolean {
  const cfg = PAVILION_CONFIGS[pavilion];
  // Axel-match
  const axisOk = cfg.axis === 'all' || q.axis === cfg.axis;
  if (!axisOk) return false;
  // Spår-match
  if (cfg.tracks.length === 0) {
    // Spårlös paviljong (Bibliotek + Kalastorget) — vill bara
    // spårlösa frågor (q.spar === null).
    return q.spar === null;
  }
  // Spårad paviljong. Frågan är godkänd om:
  //   - den är spårlös (kan användas överallt), eller
  //   - dess spår finns i paviljongens tracks-lista.
  if (q.spar === null) return true;
  return cfg.tracks.includes(q.spar);
}

// Välj en deterministisk sekvens av frågor för ett prov. Antalet är
// `min(QUESTIONS_PER_EXAM, tillgängliga)`. Om paviljongen inte har
// tillräckligt med frågor för ett fullt prov används vad som finns
// — coverageErrors i questionCoverage.ts fångar upp fall där en
// byggd paviljong har noll frågor (§4.4-testet).
export function selectQuestionsForExam(
  pavilionId: PavilionId,
  questionBank: readonly Question[],
  seed: number
): Question[] {
  const candidates = questionBank.filter((q) =>
    questionMatchesPavilion(q, pavilionId)
  );
  if (candidates.length === 0) return [];
  const shuffled = shuffleDeterministic(
    candidates,
    hashSeed(pavilionId, seed)
  );
  return shuffled.slice(0, Math.min(QUESTIONS_PER_EXAM, shuffled.length));
}

// ORDER 104 §Q2 — enkel kreditformel för R2. Rätt svar → 1 kredit
// på frågans axel och spår. Ingen tröskel, ingen bonus. Reducern
// (COMPLETE_EXAM-handlern) itererar denna lista och dispatchar en
// ACCUMULATE_KNOWLEDGE-action per post.
export interface ExamCreditGrant {
  axis: KnowledgeAxis;
  amount: number;
  track?: YrkesSpar;
}

// `examAnswers` är state.currentExam.answers-arrayen; `questionBank`
// används för att slå upp axel + spår per fråga (svaret-strukturen
// bär bara `questionId + correct + score`, inte metadata).
export function computeExamCredits(
  examAnswers: readonly { questionId: string; correct: boolean; score: number }[],
  questionBank: readonly Question[]
): ExamCreditGrant[] {
  const questionsById = new Map<string, Question>();
  for (const q of questionBank) questionsById.set(q.id, q);

  const grants: ExamCreditGrant[] = [];
  for (const answer of examAnswers) {
    if (!answer.correct) continue;
    const q = questionsById.get(answer.questionId);
    if (!q) continue;   // frågan finns inte i banken (defensiv)
    grants.push({
      axis: q.axis,
      amount: 1,   // §Q2: enkel formel — 1 kredit per rätt svar
      ...(q.spar !== null ? { track: q.spar } : {})
    });
  }
  return grants;
}
