// dilemmaGrades.ts — dilemmakortets tre bedömningar. Tillägg till D7, 2026-10-07. Ersätter right: boolean i afterHoursFika.ts.
//
// Ett dilemma har tre bedömningar, aldrig rätt och fel: väl grundat (grönt), delvis grundat (neutralt, i pappersfärg)
// och svagt grundat (mörk mässing, som missnöjd i guestMood.ts). Rött används aldrig på kortet.
// Svaren och deras bedömningar kommer från Codes dilemman efter Anders granskning. De fyra svaren i prototypen är exempel.

export type DilemmaGrade = 'well' | 'partly' | 'weak';

export interface DilemmaAnswer { key: string; grade: DilemmaGrade; whyKey: string }
export interface Dilemma {
  id: string; askerId: string; askerRoleKey: string; questionKey: string;
  answers: DilemmaAnswer[]; // 3–4 svar, minst ett 'well'
  fx: { key: string; well: string; partly: string; weak: string }; // nycklar i balance.ts
}

/** Färger och rörelser. Grönt och rörelsen lyft är nexusTheme.warm.rattfel.ts. Mässingen är guestMood displeased. */
export const GRADE_STYLE: Record<DilemmaGrade, { fill: string; ink: string; edge: string; key: string; keyInk: string; mark: string; motion: string; labelKey: string }> = {
  well: { fill: '#5cb86a', ink: '#2a1c13', edge: 'none', key: '#3f9a52', keyInk: '#f5ead5', mark: '✓', motion: 'lift 480 ms', labelKey: 'fika.grade.well' },
  partly: { fill: '#f5ead5', ink: '#2a1c13', edge: '1.5px #cdb898', key: '#cdb898', keyInk: '#2a1c13', mark: '½', motion: 'rise 240 ms', labelKey: 'fika.grade.partly' },
  weak: { fill: '#1a120d', ink: '#f4e6cc', edge: '2px #b98a3c', key: '#b98a3c', keyInk: '#1a120d', mark: '○', motion: 'shake 380 ms', labelKey: 'fika.grade.weak' }
};

/** Efter svaret. */
export const AFTER_ANSWER = {
  paperAfterMs: 650,
  chosen: 'fylls med bedömningens färg och får märket i stället för siffran',
  others: 'visar sin bedömning under texten. Ett väl grundat svar som inte valdes får papper och streckad grön kant.',
  verdict: 'bedömningens namn på papperet (fika.grade.*) och raden fika.scale',
  fx: 'brickan fika.fx med FIKA.morale.well / .partly / .weak',
  asker: { well: 'lutar sig tillbaka', partly: 'nickar', weak: 'tittar ned' }
};

/** Exemplet i prototypen. */
export const EXAMPLE: Dilemma = {
  id: 'rotaWeekends', askerId: 'sara', askerRoleKey: 'fika.asker.role', questionKey: 'fika.q',
  answers: [
    { key: 'fika.a1', grade: 'well', whyKey: 'fika.why.a1' },
    { key: 'fika.a2', grade: 'partly', whyKey: 'fika.why.a2' },
    { key: 'fika.a3', grade: 'weak', whyKey: 'fika.why.a3' },
    { key: 'fika.a4', grade: 'weak', whyKey: 'fika.why.a4' }
  ],
  fx: { key: 'fika.fx', well: 'FIKA.morale.well', partly: 'FIKA.morale.partly', weak: 'FIKA.morale.weak' }
};
