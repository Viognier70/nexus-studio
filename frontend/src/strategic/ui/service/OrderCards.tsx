// ORDER 306b A9 — Designs D8 (orderCards.ts): ordningskorten i steg 3 (techne) i Karaffen (vb40).
// Sex handgrepp i ett fast rutnät 3 × 2 och fyra platser. Klick på ett kort lägger det på nästa lediga
// plats; klick på en plats tar bort kortet, och korten till höger flyttar ett steg åt vänster. Låset
// visar "Lägg {n} kort till" tills raden är full och blir sedan "Lås ordningen". Raden ligger i motorn
// (SET_INCIDENT_ROW) och bedöms där (LOCK_INCIDENT_ROW, gradeSequence), också när tiden går ut.
//
// Avgörandet: helt grepp grönt och lyfter, halvt grepp på papper med mässingskant (aldrig rött), fel
// rött och skakar. Vid halvt grepp och fel visas den rätta raden streckad i grönt. Tiden ute med färre
// än fyra kort: personalen fyller de tomma platserna med de handgrepp som saknas, i svarets ordning,
// med sin initial i stället för numret (D8 TIMEOUT_TAKEOVER).

import { t as tt } from '../../../content/nexusStrings';
import { useLanguage } from '../../../content/language';
import type { SequenceSpec } from '../../../sim/incidentBank';
import { ORDER_ICONS } from './orderIcons';

/** Designs D8 ORDER_LETTER: bokstäverna i 306b och handgreppens ikoner. */
export const ORDER_ICON_OF: Record<string, string> = { a: 'order.show', b: 'order.candle', c: 'order.pour', d: 'order.serve', e: 'order.hour', f: 'order.bar' };
/** Designs D8 VB40_ORDER.deck (pour, hour, show, bar, serve, candle): visningsordningen, fast och inte slumpad. */
export const ORDER_DECK = ['c', 'e', 'a', 'f', 'd', 'b'];

export type RowGrade = 'full' | 'analysis' | 'experience' | 'wrong' | 'timeout';

/** Den rätta raden: korten som inte är fällor, i bokstavsordning (306b: a → b → c → d). */
export function answerRow(spec: SequenceSpec): string[] {
  return spec.cards.filter((c) => !c.trap).map((c) => c.id).slice(0, spec.slots);
}

/** Tiden ute: spelarens kort ligger kvar, och personalen lägger de handgrepp som saknas i svarets ordning. */
export function staffFill(spec: SequenceSpec, row: readonly string[]): string[] {
  const missing = answerRow(spec).filter((id) => !row.includes(id));
  return [...row, ...missing].slice(0, spec.slots);
}

const STROKE = { ink: '#2a1c13', brass: '#b98a3c', wine: '#8a2a36' } as const;

export function OrderIcon({ id, size = 24 }: { id: string; size?: number }) {
  const paths = ORDER_ICONS[ORDER_ICON_OF[id] ?? ''] ?? [];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={size >= 88 ? 1.2 : 1.6}>
      {paths.map((p, i) => <path key={i} d={p.d} stroke={STROKE[p.stroke ?? 'ink']} fill={p.fill ? STROKE[p.fill] : 'none'} />)}
    </svg>
  );
}

interface Props {
  spec: SequenceSpec;
  cards: Record<string, string>;
  row: readonly string[];
  /** Kan spelaren lägga och låsa (steget frågar och inget är låst). */
  open: boolean;
  locked: boolean;
  grade: RowGrade | null;
  staffInitial: string;
  onRow: (row: string[]) => void;
  onLock: () => void;
}

export function OrderCards({ spec, cards, row, open, locked, grade, staffInitial, onRow, onLock }: Props) {
  const lang = useLanguage();
  const deck = [...ORDER_DECK.filter((id) => spec.cards.some((c) => c.id === id)), ...spec.cards.map((c) => c.id).filter((id) => !ORDER_DECK.includes(id))];
  const shown = grade === 'timeout' ? staffFill(spec, row) : [...row];
  const need = spec.slots - row.length;
  const add = (id: string) => { if (open && !row.includes(id) && row.length < spec.slots) onRow([...row, id]); };
  const remove = (i: number) => { if (open && i < row.length) onRow(row.filter((_, k) => k !== i)); };
  const showAnswer = grade === 'analysis' || grade === 'experience' || grade === 'wrong';
  return (
    <div className="nx-order" data-testid="order-cards" data-grade={grade ?? undefined} data-locked={locked || undefined}>
      <div className="nx-order-label">{tt(lang, 'order.slots')}</div>
      <ol className="nx-order-row" data-testid="order-row" data-row={shown.join('')}>
        {Array.from({ length: spec.slots }, (_, i) => {
          const id = shown[i];
          const byStaff = grade === 'timeout' && i >= row.length && !!id;
          return (
            <li key={i}>
              <button
                type="button"
                className="nx-order-slot"
                data-testid={`order-slot-${i}`}
                data-filled={!!id}
                data-staff={byStaff || undefined}
                disabled={!open || !id}
                onClick={() => remove(i)}
                aria-label={id ? tt(lang, 'order.sequenceAria', { n: i + 1, card: cards[id] ?? id }) : String(i + 1)}
              >
                <span className="nx-order-num" aria-hidden>{byStaff ? staffInitial : i + 1}</span>
                {id && <OrderIcon id={id} />}
                {id && <span className="nx-order-text">{cards[id]}</span>}
              </button>
            </li>
          );
        })}
      </ol>
      {showAnswer && (
        <>
          <div className="nx-order-label">{tt(lang, 'verdict.held')}</div>
          <ol className="nx-order-row" data-testid="order-answer" data-answer>
            {answerRow(spec).map((id, i) => (
              <li key={id}><div className="nx-order-slot" data-filled><span className="nx-order-num" aria-hidden>{i + 1}</span><OrderIcon id={id} /><span className="nx-order-text">{cards[id]}</span></div></li>
            ))}
          </ol>
        </>
      )}
      {open && (
        <>
          <div className="nx-order-label">{tt(lang, 'order.cards')}</div>
          <div className="nx-order-deck" role="group" aria-label={tt(lang, 'order.cards')}>
            {deck.map((id) => (
              <button key={id} type="button" className="nx-order-card" data-testid={`order-card-${id}`} data-used={row.includes(id) || undefined} disabled={row.includes(id) || row.length >= spec.slots} onClick={() => add(id)}>
                <OrderIcon id={id} />
                <span className="nx-order-text">{cards[id]}</span>
              </button>
            ))}
          </div>
          <p className="nx-small nx-order-hint">{tt(lang, 'order.hint')}</p>
          <button type="button" className="nx-order-lock" data-testid="order-lock" disabled={need > 0} onClick={onLock}>
            {need > 0 ? tt(lang, 'order.need', { n: need }) : tt(lang, 'order.lock')}
          </button>
        </>
      )}
    </div>
  );
}
