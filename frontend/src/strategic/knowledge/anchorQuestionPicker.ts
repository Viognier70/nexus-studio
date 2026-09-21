// ORDER 234 — minimal anchor-fråge-picker.
//
// Kombinerar de fyra brons-modulerna till en pool av frågor med
// `anchor.anchorId` satt till en LEVANDE koreografi-ankare (ORDER 225 +
// mätning ORDER 227). setDown är dead mapping tills ORDER 227 §5a-remap;
// filtreras därför bort. Resultat: 16 frågor totalt (order 13, greet 1,
// requestCheck 2), matchar VO:s siffror 2026-09-21.
//
// Pickern läses av `advanceTick` i reducer.ts. Ren funktion; ingen
// sim-logik ändras. Deterministisk via seeded rng — samma seed + samma
// tick-loop = samma val.
//
// **Sim pausas INTE under fråga eller förklaring** (VO villkor 3):
// SimulationProvider tick-loopen (SimulationProvider.tsx:126-152) är
// gated på `speedRef.current > 0`, inte på scenario.active eller
// pendingQuestion. Ingen kod anropar SET_SPEED från overlay eller
// picker (grep-verifierat). Sim fortsätter ticka; spelaren läser mot
// en levande scen — samma beteende som dagens scenario-overlay.
//
// **Rör INTE scenario-fält** (VO villkor 2):
//   - state.day.scenariosFiredThisService (egen räknare istället)
//   - state.day.lastScenarioChoice
//   - state.day.revenueAtServiceStart/cost/reputation/knowledgeCredits
//   Endast state.scenario.pendingQuestion + state.day.anchor*-fälten
//   uppdateras.

import type {
  AnchorId,
  PendingQuestion,
  SimulationState,
  StaffRole
} from '../types';
import type { Rng } from '../util/rng';
import type { GuestAnchorInfo } from '../simulation/anchors';
import type { FlervalQuestion, QuestionAsker } from './questionFormats';
import { METODKOKET_BRONS_QUESTIONS } from './metodkoketBrons';
import { STENSOTA_BRONS_QUESTIONS } from './stensotaBrons';
import { MALTIDBIBLIOTEKET_BRONS_QUESTIONS } from './maltidbiblioteketBrons';
import { KALASTORGET_BRONS_QUESTIONS } from './kalastorgetBrons';

// ORDER 234 — rate-limit-konstanter per VO 2026-09-21:
//   Högst 3 anchor-frågor per service.
//   Minst 3 sim-minuter (180 s) mellan.
//   Ingen upprepning samma dag.
export const MAX_ANCHOR_QUESTIONS_PER_SERVICE = 3;
// ORDER 237 — sänkt från 180 till 90 sek per VO 2026-09-21. Håller
// symmetri med ANCHOR_SCENARIO_BUFFER_SEC i reducer.ts (också 90);
// två separata tal möjliggör oberoende reglering, men de startas
// tillsammans så en observation inte döljer den andra.
export const MIN_GAP_BETWEEN_ANCHOR_QUESTIONS_SEC = 90;

// ORDER 227 mätning: setDown-mappningen `staff.taskType === 'serve'`
// träffar aldrig (findTaskTarget söker seated-gäster med stateTime > 6
// men transitionen till 'ordering' sker vid stateTime > 4). Tills
// remap gjorts i egen order (ORDER 227 §5a) filtreras alla
// setDown-ankrade frågor bort så pickern inte väljer något som ändå
// aldrig fyras.
const LIVE_ANCHOR_IDS: readonly AnchorId[] = ['greet', 'order', 'requestCheck'];

// Kombinera de fyra brons-poolarna och filtrera till frågor vars
// ankare är LEVANDE (anchorId satt + inte 'setDown'). Beräknas en gång
// vid modul-load — pool:en är immutable innehåll.
const ALL_BRONS_QUESTIONS: readonly FlervalQuestion[] = [
  ...METODKOKET_BRONS_QUESTIONS,
  ...STENSOTA_BRONS_QUESTIONS,
  ...MALTIDBIBLIOTEKET_BRONS_QUESTIONS,
  ...KALASTORGET_BRONS_QUESTIONS
];

export const LIVE_ANCHOR_QUESTIONS: readonly FlervalQuestion[] =
  ALL_BRONS_QUESTIONS.filter(
    (q) =>
      q.anchor?.anchorId !== undefined &&
      (LIVE_ANCHOR_IDS as readonly string[]).includes(q.anchor.anchorId)
  );

// -------- konvertering FlervalQuestion → PendingQuestion --------------

// Härledning av `senderRole: StaffRole` från `askerRole: QuestionAsker`.
// Overlay:et läser primärt `askerRole` (som täcker 'sommelier' + 'gäst')
// men fallar tillbaka till `senderRole` för att inte bryta prefix-
// pipelinen för scenariofrågor. Vi sätter `senderRole` bara när det
// finns en direkt-motsvarighet i StaffRole; sommelier/gäst → null.
function askerToStaffRole(asker: QuestionAsker | undefined): StaffRole | null {
  if (asker === 'kock' || asker === 'värd' || asker === 'servitör' || asker === 'lärling') {
    return asker;
  }
  return null;
}

function toPendingQuestion(q: FlervalQuestion): PendingQuestion {
  return {
    body: q.prompt,
    options: q.options.map((label, i) => ({
      label,
      correct: i === q.correctIndex
    })),
    senderRole: askerToStaffRole(q.askerRole),
    // scenarioId + choice UTELÄMNAS — markerar att detta är en
    // anchor-fråga (path i answerProfessionalQuestion delar på
    // pq.anchorId !== undefined).
    anchorId: q.anchor?.anchorId,
    explanation: q.explanation,
    askerRole: q.askerRole,
    axis: q.axis,
    ...(q.spar !== null ? { track: q.spar } : {}),
    // Återanvänder sourceBankId-fältet för fråge-id (så
    // firedAnchorQuestionIdsToday kan spåra utan att lägga till nytt
    // fält). Bank-fråge-fälten `sourceArticleTitle` etc. är tomma.
    sourceBankId: q.id
  };
}

// -------- pickern -----------------------------------------------------

/**
 * Väljer en anchor-fråga att fyra, eller returnerar null om inga
 * kandidater passar. Respekterar rate-limits per VO 2026-09-21:
 *   * högst MAX_ANCHOR_QUESTIONS_PER_SERVICE per service
 *   * minst MIN_GAP_BETWEEN_ANCHOR_QUESTIONS_SEC mellan
 *   * ingen upprepning inom samma dag
 * Konsumerar 1 int-draw från rng oavsett utfall (så efterföljande
 * draws inte skiftas när ingen kandidat matchar).
 */
export function pickAnchorQuestion(
  state: SimulationState,
  activeAnchors: readonly GuestAnchorInfo[],
  rng: Rng
): PendingQuestion | null {
  // ORDER 237 fix: pickern konsumerar RNG BARA vid faktisk fyrning.
  // Att konsumera draw även vid null-pick shiftar rng och påverkar
  // downstream ambient-event-timing + cause-chain-formering (m6.test.ts
  // DoD 3 bröts med tätare pickning i ORDER 237). Deterministik
  // hålls: samma seed + samma sim-sekvens ger samma rng-tillstånd
  // eftersom pickern bara drar rng när den faktiskt fyrar en fråga.

  // Rate-limit: max per service.
  const firedThisService = state.day.anchorQuestionsFiredThisService ?? 0;
  if (firedThisService >= MAX_ANCHOR_QUESTIONS_PER_SERVICE) {
    return null;
  }

  // Rate-limit: min gap mellan.
  const lastAt = state.day.lastAnchorQuestionAt ?? null;
  if (lastAt !== null && state.simTime - lastAt < MIN_GAP_BETWEEN_ANCHOR_QUESTIONS_SEC) {
    return null;
  }

  // Kandidater: frågor vars anchorId matchar något aktivt ankare OCH
  // inte redan har fyrats i dag.
  const activeIds = new Set(activeAnchors.map((a) => a.anchor));
  const firedIds = new Set(state.day.firedAnchorQuestionIdsToday ?? []);
  const candidates = LIVE_ANCHOR_QUESTIONS.filter((q) => {
    const aid = q.anchor?.anchorId;
    if (aid === undefined) return false;
    if (!activeIds.has(aid)) return false;
    if (firedIds.has(q.id)) return false;
    return true;
  });

  if (candidates.length === 0) {
    return null;
  }

  const idx = rng.int(0, candidates.length - 1);
  return toPendingQuestion(candidates[idx]);
}
