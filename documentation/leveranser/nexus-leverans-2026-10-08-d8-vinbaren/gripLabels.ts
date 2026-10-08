// gripLabels.ts — halvt grepp (order 306b §2) och kostnaden på ett svar (§3).
// Halvt grepp används på ordningskorten i Karaffen steg 3 (orderCards.ts) och på vanliga svar som bedöms på analys och upplevelse.
export type Grip = 'full' | 'analysis' | 'experience' | 'wrong';

export const GRIP_RESULT: Record<Grip, { labelKey: string; row: string; mark: string; pill: { bg: string; border: string; ink: string } }> = {
  full:       { labelKey: 'grip.full',            row: 'grön, lyfter (som rätt)',              mark: '✓', pill: { bg: '#5cb86a', border: 'none', ink: '#2a1c13' } },
  analysis:   { labelKey: 'grip.half.analysis',   row: 'papper #fffaf0, kant 2 px #b98a3c, stiger in 260 ms', mark: '½', pill: { bg: '#e3cfa6', border: '1px solid #b98a3c', ink: '#2a1c13' } },
  experience: { labelKey: 'grip.half.experience', row: 'papper #fffaf0, kant 2 px #b98a3c, stiger in 260 ms', mark: '½', pill: { bg: '#e3cfa6', border: '1px solid #b98a3c', ink: '#2a1c13' } },
  wrong:      { labelKey: 'verdict.wrong',        row: 'röd, skakar (som fel)',                mark: '✕', pill: { bg: '#e0533f', border: 'none', ink: '#2a1c13' } }
};
/** Halvt grepp är aldrig rött (rött betyder bara fel svar). Tecknet: en ring med kant #6b4a2e och vänstra halvan fylld i #b98a3c,
 *  1,6 % av höjden, framför etiketten i förklaringens rubrik. */
export const HALF_GRIP_SYMBOL = { ring: '#6b4a2e', fill: '#b98a3c', fillSide: 'left', size: '1.6cqh' };

/** Kostnaden syns på svaret innan spelaren väljer (godkänd form: myntet). Svar utan kostnad har ingen markering. Belopp i kr ur balance.ts. */
export const ANSWER_COST = {
  form: 'Ett mynt (guld #f3d98a → #c99a3e, kant #8a6224) och beloppet i en pappersbricka (#efe1bf) längst till höger i raden.',
  /** Kassan räcker inte: svaret visas men går inte att välja. */
  short: {
    lineKey: 'cost.short',
    row: 'Streckad kant 1 px rgba(138,98,36,.6), papper rgba(255,250,240,.55), numret på #cdb898. Texten har full kontrast. Markören blir not-allowed och klicket gör inget.',
    line: 'Raden "Kassan räcker inte" under svaret, 1,4 % av höjden, #6b4a2e. Myntet står kvar, så att spelaren ser vad som fattas.'
  }
};

/** Exemplet på kostnaden i prototypen är ett vanligt svar i steg 3 (Karaffen har ordningskort i steg 3). Texterna är exempel. */
export const COST_EXAMPLE = {
  kickerKey: 'sit.kickerExample', momentKey: 'p3.moment', questionKey: 'p3.q',
  answers: [
    { key: 'p3.a1', whyKey: 'p3.why1', grip: 'experience' as Grip, cost: null },
    { key: 'p3.a2', whyKey: 'p3.why2', grip: 'analysis' as Grip, cost: null },
    { key: 'p3.a3', whyKey: 'p3.why3', grip: 'full' as Grip, cost: '{cost}' },  // prototypen 190 kr
    { key: 'p3.a4', whyKey: 'p3.why4', grip: 'wrong' as Grip, cost: '{cost}' }  // prototypen 640 kr
  ]
};
