// orderCards.ts — ordningskorten (order 306b §1). Pilot: Karaffen (vb40), steg 3 (techne).
// Stegen i en situation: 1 analys (episteme) → 2 upplevelse (phronesis) → 3 handling (techne). Ordningskorten är ett svar i steg 3.
// Samma kort, lås, tidsbåge och färger (WARM_RIGHT_WRONG) som ett vanligt svar.
export type OrderCardId = 'show' | 'candle' | 'pour' | 'serve' | 'hour' | 'bar';
/** Bokstäverna i 306b: a visa, b ljuset, c häll, d servera, e en timme (fälla), f vid baren (fälla). */
export const ORDER_LETTER: Record<OrderCardId, string> = { show: 'a', candle: 'b', pour: 'c', serve: 'd', hour: 'e', bar: 'f' };

export const ORDER_CARDS: Record<OrderCardId, { labelKey: string; icon: string; trap: boolean }> = {
  show:   { labelKey: 'card.show',   icon: 'order.show',   trap: false },
  candle: { labelKey: 'card.candle', icon: 'order.candle', trap: false },
  pour:   { labelKey: 'card.pour',   icon: 'order.pour',   trap: false },
  serve:  { labelKey: 'card.serve',  icon: 'order.serve',  trap: false },
  hour:   { labelKey: 'card.hour',   icon: 'order.hour',   trap: true },
  bar:    { labelKey: 'card.bar',    icon: 'order.bar',    trap: true }
};

export const VB40_ORDER = {
  situation: 'vb40', step: 3, pyramid: 'techne', kickerKey: 'sit.kicker',
  momentKey: 'order.moment', questionKey: 'order.q',
  slots: 4,
  answer: ['show', 'candle', 'pour', 'serve'] as OrderCardId[],
  /** Visningsordningen i rutnätet (3 × 2). Fast, inte slumpad. */
  deck: ['pour', 'hour', 'show', 'bar', 'serve', 'candle'] as OrderCardId[]
};

export type OrderGrade = 'full' | 'analysis' | 'experience' | 'wrong' | 'timeout';
/** Bedömningen av raden enligt 306b, vb40 steg 3 (förtydligad 2026-10-08). Två sorters brister:
 *  teknik (analysen): e med, b saknas, c saknas, eller c före b.
 *  omsorg (upplevelsen): f med, a saknas, a efter c, eller d varken först eller sist.
 *  Fel: d först, både b och c saknas, eller brister av båda sorterna. Halvt mot upplevelsen: bara teknikbrister.
 *  Halvt mot analysen: bara omsorgsbrister. Helt grepp: inga brister och d sist (a och b i valfri ordning).
 *  Prövad mot 306b för alla 360 rader med fyra kort: inga skillnader. */
export function gradeOrder(row: OrderCardId[], timedOut: boolean): { grade: OrderGrade; whyKey: string } {
  if (timedOut && row.length < 4) return { grade: 'timeout', whyKey: 'why.timeout' };
  const at = (x: OrderCardId) => row.indexOf(x), has = (x: OrderCardId) => at(x) >= 0, last = row.length - 1;
  const tech = has('hour') || !has('candle') || !has('pour') || (has('candle') && has('pour') && at('pour') < at('candle'));
  const care = has('bar') || !has('show') || (has('show') && has('pour') && at('show') > at('pour')) || (has('serve') && at('serve') !== 0 && at('serve') !== last);
  if (at('serve') === 0) return { grade: 'wrong', whyKey: 'why.wrong.serveFirst' };
  if (!has('candle') && !has('pour')) return { grade: 'wrong', whyKey: 'why.wrong.candle' };
  if (tech && care) return { grade: 'wrong', whyKey: 'why.wrong.both' };
  if (tech) return { grade: 'experience', whyKey: has('hour') ? 'why.exp.hour' : 'why.exp.candle' };
  if (care) return { grade: 'analysis', whyKey: has('bar') ? 'why.ana.bar' : !has('show') ? 'why.ana.show' : 'why.ana.order' };
  return { grade: 'full', whyKey: 'order.why.right' };
}

/** Klicken. Ingen dragning behövs. */
export const ORDER_INTERACTION = {
  clickCard: 'Läggs på nästa lediga plats (vänster till höger). Ett kort kan bara ligga på en plats; kortet tonas till 35 % i rutnätet.',
  clickSlot: 'Tar bort kortet. Korten till höger flyttar ett steg åt vänster, så att raden alltid fylls från plats 1.',
  full: 'Med fyra kort på plats går det inte att lägga fler. Ta bort ett först.',
  lock: 'Knappen visar "Lägg {n} kort till" tills raden är full och blir sedan "Lås ordningen". Efter trycket: "Låst" och samma väntan till avgörandet som ett vanligt svar.',
  timeArc: 'Samma tidsbåge som ett vanligt svar (RAKET.answerS i balance.ts, prototypen 20 s). När tiden går ut med fyra kort låses raden och bedöms. Med färre än fyra tar personalen över (nedan).'
};

/** Avgörandet. Halvt grepp är aldrig rött. */
export const ORDER_RESULT = {
  full:       { row: 'grön, d8Lift 480 ms', verdictKey: 'grip.full' },
  analysis:   { row: 'papper, kant 2 px #b98a3c, numret i mässing, stiger in 260 ms', verdictKey: 'grip.half.analysis', showAnswer: true },
  experience: { row: 'papper, kant 2 px #b98a3c, numret i mässing, stiger in 260 ms', verdictKey: 'grip.half.experience', showAnswer: true },
  wrong:      { row: 'röd, d8Shake 380 ms', verdictKey: 'verdict.wrong', showAnswer: true },
  timeout:    { row: 'se TIMEOUT_TAKEOVER', verdictKey: 'timeout.verdict', showAnswer: false },
  showAnswerAs: 'Den rätta raden under, streckad i grönt, med rubriken held ("Det här hade hållit")',
  explanationDelayMs: 650
};

/** Tiden går ut med färre än fyra kort: personalen tar över (order 314). Inget grepp, inget rött. */
export const TIMEOUT_TAKEOVER = {
  who: 'den som arbetar den kvällen i situationens roll ({name}, ur personallistan). I bilden Elin, i 306b:s exempel Sara.',
  slots: 'Spelarens kort ligger kvar. De tomma platserna fylls av {name} med de handgrepp som saknas, i svarets ordning. Platserna har initialen i {name} i stället för numret och rollringens kant (ROLE_RING.sommelier #b98ae0).',
  verdict: 'Etiketten "Tiden ute: {name} tar över" på papper #efe1bf med kant 2 px #b98ae0.',
  scene: '{name} karafferar rätt i rummet (DECANTER_STATES), och situationen räknas som klarad utan grepp. Vad det ger i krediter avgör order 314.',
  lockLabelKey: 'timeout.lock'
};
