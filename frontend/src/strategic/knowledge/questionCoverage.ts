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
import { QUESTIONS_PER_EXAM } from './examMechanic';
import { ALL_PAVILION_IDS, PAVILION_CONFIGS, type PavilionId } from './pavilions';
import type { Question, QuestionFormat } from './questionFormats';

// Paviljong-id som R2 bygger. Populeras av ORDER 104 via pavilions.ts.
// Coverage-testet (coverageErrors) failar om någon paviljong har noll
// frågor — vilket ORDER 104 undviker genom att seed:a alla fem med
// minst en fråga i questionTemplates.ts.
export const BUILT_PAVILIONS: readonly string[] = ALL_PAVILION_IDS;

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

// Paviljong med färre frågor än ett fullt prov (`QUESTIONS_PER_EXAM`).
// Inte ett fel — spärrens noll-check biter fortfarande bara på tom
// paviljong per ORDER 107 §4.4. Men rapporteras som varning så
// tunna paviljonger inte är osynliga: `selectQuestionsForExam` gör
// `slice(0, min(target, tillgängliga))` så spelaren får ett kortare
// prov utan felmeddelande. Vision Owner-innehåll (ORDER 107 §5)
// åtgärdar när riktiga frågor levereras.
export interface ThinPavilion {
  pavilion: string;
  total: number;
  target: number;   // = QUESTIONS_PER_EXAM (5 i R2)
}

// En axel-lucka i en multi-axel-paviljong. Gäller enbart paviljonger
// vars config har `axis: 'all'` (Gastronomiska Teatern per ORDER 104
// §2.2 — vägen till `readProfile → 'balanced'` går via denna
// paviljong). Om någon av de tre axlarna saknar frågor är
// balanced-vägen i praktiken stängd på just den axeln.
//
// Speglar `thinPavilions`-mönstret: rapporteras som varning, inte
// fel. Spärrens noll-check per ORDER 107 §4.4 ändras inte — en
// paviljong med totalt > 0 frågor räknas fortfarande som "byggd"
// även om en enskild axel saknar täckning.
export interface AxisGap {
  pavilion: string;
  missingAxis: KnowledgeAxis;
}

export interface CoverageReport {
  builtPavilions: readonly string[];
  perPavilion: Record<string, PavilionCoverage>;
  emptyPavilions: string[];      // byggda paviljonger med noll frågor
  thinPavilions: ThinPavilion[]; // tunna-paviljong-varning: < QUESTIONS_PER_EXAM
  axisGaps: AxisGap[];           // multi-axel-paviljongs axel-luckor (Vision Owner 2026-08-15)
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

  // Tunna paviljonger — har frågor, men färre än ett fullt prov.
  // Rapporteras som varning, inte fel (spärren nedan biter fortfarande
  // bara på 0). Vision Owner §5-arbete åtgärdar.
  const thinPavilions: ThinPavilion[] = builtPavilions
    .filter((p) => {
      const total = perPavilion[p].total;
      return total > 0 && total < QUESTIONS_PER_EXAM;
    })
    .map((p) => ({
      pavilion: p,
      total: perPavilion[p].total,
      target: QUESTIONS_PER_EXAM
    }));

  // Axel-luckor — bara relevant för paviljonger med `axis: 'all'`
  // (multi-axel per config). En paviljong med specifik axel förväntas
  // ha frågor bara på den axeln; en 'all'-paviljong förväntas täcka
  // alla tre. Missing = axis där paviljongen har noll frågor.
  const ALL_AXES: readonly KnowledgeAxis[] = ['episteme', 'techne', 'phronesis'];
  const axisGaps: AxisGap[] = [];
  for (const p of builtPavilions) {
    const cfg = PAVILION_CONFIGS[p as PavilionId];
    if (!cfg) continue;                    // custom id utanför real config
    if (cfg.axis !== 'all') continue;      // enkel-axel-paviljong: inga gaps att räkna
    const perAxis = perPavilion[p].perAxis;
    for (const axis of ALL_AXES) {
      if (perAxis[axis] === 0) {
        axisGaps.push({ pavilion: p, missingAxis: axis });
      }
    }
  }

  return {
    builtPavilions: [...builtPavilions],
    perPavilion,
    emptyPavilions,
    thinPavilions,
    axisGaps,
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
