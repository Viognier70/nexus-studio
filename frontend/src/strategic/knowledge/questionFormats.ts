// ORDER 107 — fyra fråge-format för R2 paviljongernas prov och R6
// post-service-quiz. Ingen fritext, ingen språkmodell i frågevägen
// (§2 determinism/försvarbarhet/kostnad).
//
// Alla format är rena datastrukturer + rena score-funktioner. Samma
// indata ger samma poäng — testbart i fixed-seed-harnessen. Ingen
// Math.random, inget nätanrop, ingen strings.sv.ts-koppling. Innehållet
// (Vision Owner §5) läses in från JSON eller inline modul; formaten
// här specificerar bara skalet.
//
// Axel- och spårmärkning per ORDER 105: varje fråga bär en axel
// (episteme/techne/phronesis) som ackumuleras vid rätt svar, och ett
// valfritt spår (sommellerie/kok, `null` = spårlöst för Bibliotek
// och Kalastorget).

import type { KnowledgeAxis, YrkesSpar } from '../types';

// Fyra format per ORDER 107 §3. `gestaltning` är den omarbetade
// varianten som visar tre färdiga gestaltningar och låter spelaren
// välja mellan dem (i stället för fritext, §3.4).
export type QuestionFormat = 'flerval' | 'situation' | 'parning' | 'gestaltning';

// Gemensamma fält för alla fråge-typer. Spårlöst = `spar: null`
// (Måltidbiblioteket + Kalastorget). Paviljong-id är valfritt eftersom
// samma fråga kan användas av flera paviljonger (t.ex. en episteme-fråga
// kan höra hemma i både Biblioteket och Gastronomiska Teatern).
interface BaseQuestion {
  id: string;
  format: QuestionFormat;
  axis: KnowledgeAxis;
  spar: YrkesSpar | null;
  // Vilken paviljong frågan är knuten till. Tomt = paviljong-agnostisk
  // (t.ex. M7a:s befintliga frågor som kan användas var som helst
  // techne-frågor efterfrågas). Ifylld = frågan är avsedd för den
  // specifika paviljongen.
  pavilion?: string;
}

// §3.1 — flerval. M7a:s befintliga form. Ett rätt alternativ.
// Bär episteme och techne bra; phronesis kollapsar till igenkänning
// (§5 diskuterar detta) så flerval är inte förstahandsval för det.
export interface FlervalQuestion extends BaseQuestion {
  format: 'flerval';
  prompt: string;
  options: string[];       // t.ex. 4 alternativ; minst 2 krävs
  correctIndex: number;    // 0..options.length-1
}

// §3.2 — situationsbedömning. Ett scenario + fyra handlingar som
// spelaren rangordnar (bäst till sämst). Poäng fördelas efter hur
// nära spelarens rangordning ligger den avsedda — inte binärt.
// Mäter omdöme utan fritext, per §3.
export interface SituationQuestion extends BaseQuestion {
  format: 'situation';
  scenario: string;
  actions: string[];          // 4 handlingar
  intendedRanking: number[];  // permutation av [0..actions.length-1],
                              // bäst först (t.ex. [2,0,3,1] = index 2
                              // är bäst, index 1 är sämst)
}

// §3.3 — parning. Spelaren kopplar situationer till bemötanden.
// Mäter mönsterigenkänning i det sociala. Antal situationer =
// antal bemötanden (en-till-en).
export interface ParningQuestion extends BaseQuestion {
  format: 'parning';
  situations: string[];
  responses: string[];        // samma längd som situations
  // Rätt par: correctPairs[i] = index i responses som hör till
  // situations[i]. Permutation av [0..situations.length-1].
  correctPairs: number[];
}

// §3.4 — gestaltning (omarbetad). I stället för fritext visas tre
// färdiga gestaltningar; spelaren väljer vilken hen skulle göra.
// Bevarar poängen (pröva hållning, inte fakta) med determinism.
// En gestaltning här kan återanvändas som svagare alternativ i en
// annan fråga (§3.4 sista mening).
export interface GestaltningQuestion extends BaseQuestion {
  format: 'gestaltning';
  scenario: string;
  gestaltningar: string[];   // exakt 3
  intendedIndex: number;     // 0..2
}

export type Question =
  | FlervalQuestion
  | SituationQuestion
  | ParningQuestion
  | GestaltningQuestion;

// Spelarens svar per format. Diskriminerad union så score-funktionen
// kan matcha rätt tolkning mot rätt fråga.
export type Answer =
  | { format: 'flerval'; index: number }
  | { format: 'situation'; ranking: number[] }
  | { format: 'parning'; pairs: number[] }
  | { format: 'gestaltning'; index: number };

// ---------------------------------------------------------------------------
// Validering — försäkrar att en fråga är välformad innan den används
// i harnessen eller i paviljongen. Kastar Error med förklarande text.
// ---------------------------------------------------------------------------

function isPermutation(arr: number[], length: number): boolean {
  if (arr.length !== length) return false;
  const seen = new Set<number>();
  for (const n of arr) {
    if (!Number.isInteger(n) || n < 0 || n >= length) return false;
    if (seen.has(n)) return false;
    seen.add(n);
  }
  return true;
}

export function validateQuestion(q: Question): void {
  switch (q.format) {
    case 'flerval':
      if (q.options.length < 2) throw new Error(`flerval ${q.id}: options.length < 2`);
      if (q.correctIndex < 0 || q.correctIndex >= q.options.length)
        throw new Error(`flerval ${q.id}: correctIndex out of range`);
      return;
    case 'situation':
      if (q.actions.length < 2)
        throw new Error(`situation ${q.id}: actions.length < 2`);
      if (!isPermutation(q.intendedRanking, q.actions.length))
        throw new Error(`situation ${q.id}: intendedRanking is not a permutation of [0..${q.actions.length - 1}]`);
      return;
    case 'parning':
      if (q.situations.length !== q.responses.length)
        throw new Error(`parning ${q.id}: situations.length !== responses.length`);
      if (q.situations.length < 2)
        throw new Error(`parning ${q.id}: needs at least 2 pairs`);
      if (!isPermutation(q.correctPairs, q.situations.length))
        throw new Error(`parning ${q.id}: correctPairs is not a permutation of [0..${q.situations.length - 1}]`);
      return;
    case 'gestaltning':
      if (q.gestaltningar.length !== 3)
        throw new Error(`gestaltning ${q.id}: needs exactly 3 gestaltningar (§3.4)`);
      if (q.intendedIndex < 0 || q.intendedIndex >= 3)
        throw new Error(`gestaltning ${q.id}: intendedIndex out of range`);
      return;
  }
}

// ---------------------------------------------------------------------------
// Score-funktioner per format. Alla returnerar [0, 1]. §4.2:
// deterministisk, ingen Math.random, inget nätanrop. Poängen är den
// fraktion av full kredit spelaren tjänar; paviljongen multiplicerar
// med basbeloppet innan `ACCUMULATE_KNOWLEDGE` dispatchas.
// ---------------------------------------------------------------------------

function scoreFlerval(q: FlervalQuestion, a: { index: number }): number {
  return a.index === q.correctIndex ? 1 : 0;
}

// Situationsbedömning: distansbaserad. Ju mer spelarens rangordning
// avviker från avsedd, desto lägre poäng. Metod: absolut skillnad i
// position per action, normaliserat.
//
// Maxdistans över n actions = n*n/2 (helt omvänd ordning). Poängen är
// 1 - actualDistance / maxDistance. Perfekt match → 1. Helt omvänd → 0.
// Ett enda swap-fel bland 4 → mestadels rätt (~0.83).
//
// Denna metric är enkel och deterministisk. Alternativ (Kendall tau,
// Spearman) ger andra fördelningar men samma symmetri. Vi väljer den
// enklaste eftersom §6 DoD kräver "delpoäng, inte binärt" utan att
// specificera metric.
function scoreSituation(q: SituationQuestion, a: { ranking: number[] }): number {
  const n = q.actions.length;
  if (!isPermutation(a.ranking, n)) return 0;
  // Bygg position-lookup för snabb per-action-jämförelse.
  const intendedPos = new Array<number>(n);
  const actualPos = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    intendedPos[q.intendedRanking[i]] = i;
    actualPos[a.ranking[i]] = i;
  }
  let totalDistance = 0;
  for (let action = 0; action < n; action++) {
    totalDistance += Math.abs(intendedPos[action] - actualPos[action]);
  }
  // Maxdistans: när rangordningen är helt omvänd, varje element flyttas
  // (n - 1 - 2*i) för i=0..n-1. Summan = n*n/2 för jämnt n, (n*n-1)/2
  // för udda n. Använd formeln floor(n*n/2).
  const maxDistance = Math.floor((n * n) / 2);
  if (maxDistance === 0) return 1;   // n=1 → alltid perfekt
  return 1 - totalDistance / maxDistance;
}

// Parning: fraktionen av rätt par. Deterministisk och additiv.
// 4 av 4 rätt → 1.0. 2 av 4 → 0.5. 0 av 4 → 0.
function scoreParning(q: ParningQuestion, a: { pairs: number[] }): number {
  const n = q.situations.length;
  if (a.pairs.length !== n) return 0;
  let correct = 0;
  for (let i = 0; i < n; i++) {
    if (a.pairs[i] === q.correctPairs[i]) correct += 1;
  }
  return correct / n;
}

// Gestaltning: binär match. Samma struktur som flerval, andra
// framing — "vilken skulle jag göra" i stället för "vilken är rätt".
function scoreGestaltning(q: GestaltningQuestion, a: { index: number }): number {
  return a.index === q.intendedIndex ? 1 : 0;
}

// Union-typad score. Diskriminerar via format-fältet.
export function scoreQuestion(q: Question, a: Answer): number {
  if (q.format !== a.format) {
    throw new Error(`scoreQuestion: format mismatch — question=${q.format} answer=${a.format}`);
  }
  switch (q.format) {
    case 'flerval':      return scoreFlerval(q, a as { index: number });
    case 'situation':    return scoreSituation(q, a as { ranking: number[] });
    case 'parning':      return scoreParning(q, a as { pairs: number[] });
    case 'gestaltning':  return scoreGestaltning(q, a as { index: number });
  }
}
