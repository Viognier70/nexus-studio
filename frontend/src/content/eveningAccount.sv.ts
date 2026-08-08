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

function goodParagraph(): string {
  return [
    'Kvällen höll ihop utan att någon behövde påminnas.',
    'Rummet fann sin puls, laget läste varandra, och gästerna gick nöjda utan att någon slog ut med armarna.',
    'Det är sådana kvällar som bygger ett rykte tyst — inte de som glimrar utan de som stämmer.',
    'Skriv upp det i minnet innan morgonen skjuter bort det.'
  ].join(' ');
}

function thinParagraph(): string {
  return [
    'Rummet höll formen, men beställningarna kom aldrig i tillräcklig takt.',
    'Kostnaden stod där den gjorde när kvällen började; det som kom in täckte inte det som gick ut.',
    'Det är inte laget som ska bära det här — det var något annat som avgjorde vem som gick förbi dörren i kväll.',
    'Läs vädret, läs staden, och tänk igenom morgondagens prisläge en gång till.'
  ].join(' ');
}

function mediocreParagraph(): string {
  return [
    'Kvällen gick.',
    'Rummet fyllde sig i sin egen takt, laget gjorde det de brukar göra, och gästerna gick utan att någon hade en historia att ta med sig därifrån.',
    'Det finns inget att lära av kvällar som den här — inget att fira, inget att laga.',
    'De flesta kvällar är så, och det är därför de sällsynta är det de är.'
  ].join(' ');
}

// -------- picker -------------------------------------------------------

export function pickParagraph(inputs: EveningAccountInputs): string {
  switch (inputs.branch) {
    case 'collapsed':        return collapsedParagraph(inputs.collapseAxis);
    case 'high_wager_win':   return highWagerWinParagraph(inputs.wagerCapital);
    case 'high_wager_loss':  return highWagerLossParagraph(inputs.wagerCapital, inputs.drewCapital);
    case 'good':             return goodParagraph();
    case 'thin':             return thinParagraph();
    case 'mediocre':         return mediocreParagraph();
    default: {
      // Exhaustive switch guard — if the branch union grows, this
      // path becomes unreachable at type-check time.
      const _exhaustive: never = inputs.branch;
      return _exhaustive;
    }
  }
}
