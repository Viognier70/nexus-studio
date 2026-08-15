// ORDER 107 §4.4 — täckningsverktyg för fråge-innehållet.
//
// Redovisar antal frågor per paviljong, axel, spår och format. Failar
// bygget om en byggd paviljong har noll frågor — den luckan som fanns
// vid ORDER 104 (Kalastorget + Stensöta tomma) ska inte kunna uppstå
// tyst igen.
//
// "Byggd paviljong" = paviljong-id som finns i `BUILT_PAVILIONS`
// nedan. Listan är tom tills ORDER 104 landar; när paviljongerna
// byggs uppdateras den och `coverageErrors()` börjar peka på
// eventuella tomma paviljonger. `coverageReport()` returnerar alltid
// full statistik, oavsett byggnadsstatus.

import type { KnowledgeAxis, YrkesSpar } from '../types';
import type { Question, QuestionFormat } from './questionFormats';

// Paviljong-id som R2 bygger. Tomt tills ORDER 104 landar; det testet
// som kontrollerar täckning kommer då att börja peka på tomma
// paviljonger som `coverageErrors()` returnerar.
export const BUILT_PAVILIONS: readonly string[] = [] as const;

// Rapportmodell. Per paviljong: totalt antal frågor + nedbrytning
// per axel/spår/format. `perAxis`/`perSpar`/`perFormat` är över hela
// frågebanken (paviljong-agnostiskt), som andra vy.
export interface PavilionCoverage {
  pavilion: string;
  total: number;
  perAxis: Record<KnowledgeAxis, number>;
  perSpar: Record<string, number>;         // 'sommellerie' | 'kok' | 'untagged'
  perFormat: Record<QuestionFormat, number>;
}

export interface CoverageReport {
  builtPavilions: readonly string[];
  perPavilion: Record<string, PavilionCoverage>;
  emptyPavilions: string[];      // byggda paviljonger med noll frågor
  unattachedQuestions: number;   // frågor utan `pavilion`-fält, ej räknade in
}

function emptyAxisRecord(): Record<KnowledgeAxis, number> {
  return { episteme: 0, techne: 0, phronesis: 0 };
}

function emptyFormatRecord(): Record<QuestionFormat, number> {
  return { flerval: 0, situation: 0, parning: 0, gestaltning: 0 };
}

function emptySparRecord(): Record<string, number> {
  return { sommellerie: 0, kok: 0, untagged: 0 };
}

function sparKey(spar: YrkesSpar | null): string {
  return spar === null ? 'untagged' : spar;
}

// Bygg en tom kolumn per byggd paviljong så coveragen skiljer mellan
// "paviljongen finns med 0 frågor" (fel) och "paviljongen finns inte i
// listan alls" (irrelevant för denna check).
function initPerPavilion(builtPavilions: readonly string[]): Record<string, PavilionCoverage> {
  const out: Record<string, PavilionCoverage> = {};
  for (const p of builtPavilions) {
    out[p] = {
      pavilion: p,
      total: 0,
      perAxis: emptyAxisRecord(),
      perSpar: emptySparRecord(),
      perFormat: emptyFormatRecord()
    };
  }
  return out;
}

// Bygg rapporten. Frågor utan `pavilion`-fält räknas som paviljong-
// agnostiska och redovisas separat via `unattachedQuestions` — de
// kan användas av flera paviljonger så att räkna dem mot en enskild
// vore vilseledande.
export function coverageReport(
  questions: readonly Question[],
  builtPavilions: readonly string[] = BUILT_PAVILIONS
): CoverageReport {
  const perPavilion = initPerPavilion(builtPavilions);
  let unattached = 0;

  for (const q of questions) {
    if (!q.pavilion) {
      unattached += 1;
      continue;
    }
    // En fråga vars `pavilion` inte finns i builtPavilions räknas inte
    // i rapporten — den är föräldralös tills paviljongen byggs. Detta
    // gör att arbete i förväg (skriva phronesis-frågor innan Kalastorget
    // står) inte får orapporterad status men inte heller "fake"-fyller
    // en obyggd paviljong.
    const entry = perPavilion[q.pavilion];
    if (!entry) continue;
    entry.total += 1;
    entry.perAxis[q.axis] += 1;
    entry.perSpar[sparKey(q.spar)] += 1;
    entry.perFormat[q.format] += 1;
  }

  const emptyPavilions = builtPavilions.filter(
    (p) => perPavilion[p].total === 0
  );

  return {
    builtPavilions: [...builtPavilions],
    perPavilion,
    emptyPavilions,
    unattachedQuestions: unattached
  };
}

// Bygg-fail-vy: returnerar en lista med fel-strängar. Om listan är
// tom är bygget grönt. Callers kastar Error i sitt eget test — den
// här funktionen bygger bara meddelandena så coverage kan testas rent.
//
// Motiv för separation: `coverageReport` är analys, `coverageErrors`
// är gate. En bakåtvänd design skulle blanda dem och göra det svårt
// att inspektera partiell täckning utan att failar hela bygget.
export function coverageErrors(
  questions: readonly Question[],
  builtPavilions: readonly string[] = BUILT_PAVILIONS
): string[] {
  const report = coverageReport(questions, builtPavilions);
  return report.emptyPavilions.map(
    (p) =>
      `paviljongen "${p}" är byggd men har noll frågor — se ORDER 107 §4.4`
  );
}
