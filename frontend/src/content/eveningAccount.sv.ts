// ORDER 046 §3 — the evening's account paragraphs.
//
// Six branches, one paragraph each, in the observer's voice (ORDER
// 043 Addendum B). What a proprietor tells themselves after closing.
//
// Voice guidance:
//   - No numbers. Money is named as "täckte kostnaderna" / "gick
//     back" / "gick över", not as a figure.
//   - Names what happened in the room, not what the state says.
//   - The mediocre branch is deliberately non-committal — the
//     Vision Owner: "kvällen bara var medioker — inte varje kväll
//     ska ha en poäng."
//   - Present tense reflecting; not past-recap.
//
// Each function takes a small shape of data pulled from state so the
// paragraph can name the specific thing that mattered (which axis
// collapsed, which capital the wager was on). Kept in content/ so
// the wording is edited without touching game code.

import type { EveningAccountBranch, SustainabilityKey } from '../strategic/types';

export interface EveningAccountInputs {
  branch: EveningAccountBranch;
  collapseAxis: 'scientific' | 'cultural' | 'practical' | null;
  wagerCapital: SustainabilityKey | null;   // what was staked (if any)
  drewCapital: SustainabilityKey | null;    // what the last scenario landed on
  // ORDER 076 (M6) — how the proprietor met the day's last scenario:
  //   'A' (demanding read) / 'B' (generous read) / 'C' (sidestep).
  // Feeds a one-sentence choice-flavoured aside so the paragraph
  // diverges across scenario strategies at the same seed — the
  // 0.15/0.30 divergence target in M6 §5 depends on this signal.
  lastChoice: 'A' | 'B' | 'C' | null;
}

const CAPITAL_NOUN: Record<SustainabilityKey, string> = {
  economic:   'det ekonomiska',
  social:     'det sociala',
  ecological: 'det ekologiska'
};

const AXIS_ROOM: Record<'scientific' | 'cultural' | 'practical', string> = {
  scientific: 'köket',
  cultural:   'rummet',
  practical:  'huset'
};

// -------- branch templates ---------------------------------------------

function collapsedParagraph(axis: 'scientific' | 'cultural' | 'practical' | null): string {
  const room = axis ? AXIS_ROOM[axis] : 'kvällen';
  return [
    'Kvällen slutade innan den skulle.',
    `Det var ${room} som inte höll — inte oturen, inte gästerna, utan att någon inte var på plats där kunskapen skulle stå.`,
    'I morgon börjar med en dörr som stängde tidigt, och ett rykte som märkte det.',
    'Ta med det till morgonen. Det där kommer inte att glömmas snabbt.'
  ].join(' ');
}

function highWagerWinParagraph(capital: SustainabilityKey | null): string {
  const noun = capital ? CAPITAL_NOUN[capital] : 'det du satsade på';
  return [
    `Du satsade på ${noun}, och kvällen bekräftade läsningen.`,
    'Det var inte tur — det var att du såg vad som var svagt och tordes säga det högt innan bordet vände sig.',
    'Sådana kvällar är sällsynta; ta emot det utan att bygga en formel av det.'
  ].join(' ');
}

function highWagerLossParagraph(capital: SustainabilityKey | null, drew: SustainabilityKey | null): string {
  const staked = capital ? CAPITAL_NOUN[capital] : 'det du satsade på';
  const real = drew ? CAPITAL_NOUN[drew] : 'något annat';
  return [
    `Du läste kvällen fel, och den svarade snabbt.`,
    `Du pekade på ${staked} och det som kom var ${real} — det som är svårt är att veta vilket i förväg, och du är inte den första att missa där.`,
    'Läs rummet igen i morgon.'
  ].join(' ');
}

// ORDER 076 (M6) — capital-flavoured variants for the three
// non-collapsed / non-wager branches. Each variant names the
// dimension the day's last scenario moved so the paragraph reads
// as a consequence of the choice rather than an abstract summary.
// The first sentence carries the divergence; the rest is shared
// closing text so the paragraph still ends in the observer's
// usual cadence. Fall-through (drewCapital === null) uses the
// legacy generic paragraph.

const GOOD_LEAD_BY_CAPITAL: Record<SustainabilityKey, string> = {
  social:     'Kvällen läste laget — och laget höll den. Det du valde i morse satte tonen i rummet.',
  economic:   'Kvällen betalade — och det märktes utan att någon räknade högt. Priset stod ut, och gästerna sa ja ändå.',
  ecological: 'Kvällen bar en råvara som stod för sig själv — och den vann. Det du sourcade i morse hörs i tallriken.'
};

const THIN_LEAD_BY_CAPITAL: Record<SustainabilityKey, string> = {
  social:     'Rummet höll formen, men mellan borden hände inget som drog någon vidare. Det sociala jobbet uteblev.',
  economic:   'Priset stod där det stod, och gästerna räknade en gång till innan de beställde. Det som kom in räckte inte.',
  ecological: 'Råvaran skulle säga något — och den sa inget som gästen orkade lyssna efter. Ekot uteblev.'
};

const MEDIOCRE_LEAD_BY_CAPITAL: Record<SustainabilityKey, string> = {
  social:     'Laget gjorde det de brukar; ingen berättade om det efteråt.',
  economic:   'Kassan flöt, men flöt tomt; ingen kolumn stack ut.',
  ecological: 'Råvaran var där, oberörd; ingen frågade om den och ingen svarade.'
};

function goodParagraph(drew: SustainabilityKey | null): string {
  const lead = drew ? GOOD_LEAD_BY_CAPITAL[drew] : 'Kvällen höll ihop utan att någon behövde påminnas.';
  return [
    lead,
    'Rummet fann sin puls, laget läste varandra, och gästerna gick nöjda utan att någon slog ut med armarna.',
    'Det är sådana kvällar som bygger ett rykte tyst — inte de som glimrar utan de som stämmer.',
    'Skriv upp det i minnet innan morgonen skjuter bort det.'
  ].join(' ');
}

function thinParagraph(drew: SustainabilityKey | null): string {
  const lead = drew ? THIN_LEAD_BY_CAPITAL[drew] : 'Rummet höll formen, men beställningarna kom aldrig i tillräcklig takt.';
  return [
    lead,
    'Kostnaden stod där den gjorde när kvällen började; det som kom in täckte inte det som gick ut.',
    'Det är inte laget som ska bära det här — det var något annat som avgjorde vem som gick förbi dörren i kväll.',
    'Läs vädret, läs staden, och tänk igenom morgondagens prisläge en gång till.'
  ].join(' ');
}

function mediocreParagraph(drew: SustainabilityKey | null): string {
  const lead = drew ? MEDIOCRE_LEAD_BY_CAPITAL[drew] : 'Kvällen gick.';
  return [
    lead,
    'Rummet fyllde sig i sin egen takt, laget gjorde det de brukar göra, och gästerna gick utan att någon hade en historia att ta med sig därifrån.',
    'Det finns inget att lära av kvällar som den här — inget att fira, inget att laga.',
    'De flesta kvällar är så, och det är därför de sällsynta är det de är.'
  ].join(' ');
}

// ORDER 076 (M6) — per-choice aside sentence. Keyed on the day's
// last resolved scenario choice (A/B/C). The three sentences are
// deliberately distinct in vocabulary — the divergence check in
// m6.test.ts measures Jaccard token distance across three parallel
// runs that differ only in strategy. The observer's voice per
// ORDER 048 §2 register: naming what the proprietor is telling
// themselves about how they met the day, not moralising it.
//
// Content deepening (naming the specific scenario textually) is a
// CONTINUATION order per §6 of the M6 report gate; these three
// asides carry the mechanism until then.
const CHOICE_ASIDE: Record<'A' | 'B' | 'C', string> = {
  A: 'Du valde den hårdare läsningen, den som kräver skarpt öga och lite obekvämt tal — den vägen slipar men den kostar också.',
  B: 'Du valde den generösare linjen; öppen hand, mjukare gest, förtroende byggs långsamt men slits inte lika snabbt.',
  C: 'Du valde att kliva åt sidan i kväll; ingen skam i det, men avvaktan lämnar också ett spår som kommer tillbaka som en fråga i morgon.'
};

function withChoiceAside(paragraph: string, choice: 'A' | 'B' | 'C' | null): string {
  if (!choice) return paragraph;
  return paragraph + ' ' + CHOICE_ASIDE[choice];
}

// -------- picker -------------------------------------------------------

export function pickParagraph(inputs: EveningAccountInputs): string {
  const base = (() => {
    switch (inputs.branch) {
      case 'collapsed':        return collapsedParagraph(inputs.collapseAxis);
      case 'high_wager_win':   return highWagerWinParagraph(inputs.wagerCapital);
      case 'high_wager_loss':  return highWagerLossParagraph(inputs.wagerCapital, inputs.drewCapital);
      case 'good':             return goodParagraph(inputs.drewCapital);
      case 'thin':             return thinParagraph(inputs.drewCapital);
      case 'mediocre':         return mediocreParagraph(inputs.drewCapital);
      default: {
        // Exhaustive switch guard — if the branch union grows, this
        // path becomes unreachable at type-check time.
        const _exhaustive: never = inputs.branch;
        return _exhaustive;
      }
    }
  })();
  return withChoiceAside(base, inputs.lastChoice);
}
