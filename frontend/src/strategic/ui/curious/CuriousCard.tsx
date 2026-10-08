// ORDER 319b — frågekortet vid en nyfiken gäst (Designs D9-tillägg curiousCard.ts, CURIOUS_CARD och
// CURIOUS_CARD_ANSWER). Anders 2026-10-08: "klicket på en nyfiken gäst öppnar frågekortet, och svaret
// avgör utfallet … Frågorna tas ur foodtruckens bank, inte prototypens exempel."
//
// Kortet står till höger, mitt på höjden, och täcker inte gästen: rubriken (Nyfiken gäst), vad spelaren
// ser (curious.moment.*), frågan ur banken, fyra svar och tidsbågen (CURIOUS.card.seconds). Svaren väljs
// med tangenterna 1–4 eller musen. Efter svaret, enligt WARM_RIGHT_WRONG: rätt grönt och raden lyfter,
// nästan papper med ½, fel rött och raden skakar; det rätta får streckad grön kant och "Det här hade
// hållit" när spelaren svarade något annat, övriga tonas. Förklaringen på papper efter
// CURIOUS.card.paperAtSeconds, lika vänlig vid alla tre, och kortet stängs efter closeAtSeconds.
// Utan svar när bågen är slut tonar kortet ut (simuleringen låter gästen gå vidare).

import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { useLanguage } from '../../../content/language';
import { t as tt, type StringKey } from '../../../content/nexusStrings';
import { CURIOUS } from '../../../sim/balance';
import { curiousOf, type CuriousCardState, type CuriousGrade } from '../../../sim/curious';
import { incidentBankFor, optionQuality } from '../../../sim/incidentBank';
import { useSimDispatch, useSimState } from '../../simulation/SimulationProvider';
import './curious.css';

const GRADE: Record<'best' | 'ok' | 'wrong', CuriousGrade> = { best: 'right', ok: 'ok', wrong: 'wrong' };

interface Held { card: CuriousCardState; optionId: string; grade: CuriousGrade; at: number; left: number }

export function CuriousCard() {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const lang = useLanguage();
  const card = curiousOf(sim).current?.card ?? null;
  const [held, setHeld] = useState<Held | null>(null);
  const [paper, setPaper] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => { timers.current.forEach((x) => window.clearTimeout(x)); }, []);

  const view = held?.card ?? card;
  const incident = view ? incidentBankFor('foodtruck').find((i) => i.id === view.incidentId) : undefined;
  const step = view && incident ? incident.steps[view.step] : undefined;

  const answer = (optionId: string) => {
    if (held || !card || !step) return;
    const o = step.options.find((x) => x.id === optionId);
    if (!o) return;
    setHeld({ card, optionId, grade: GRADE[optionQuality(o, null)], at: Date.now(), left: card.left });
    dispatch({ type: 'CURIOUS_ANSWER', optionId });
    timers.current.push(window.setTimeout(() => setPaper(true), CURIOUS.card.paperAtSeconds * 1000));
    timers.current.push(window.setTimeout(() => { setHeld(null); setPaper(false); }, CURIOUS.card.closeAtSeconds * 1000));
  };

  // Tangenterna 1–4 svarar medan kortet frågar.
  useEffect(() => {
    if (!card || held || !step) return;
    const onKey = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1;
      if (Number.isInteger(i) && i >= 0 && i < step.options.length) { e.preventDefault(); e.stopPropagation(); answer(step.options[i].id); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  if (!view || !incident || !step) return null;
  const correct = step.options.find((o) => optionQuality(o, null) === 'best')?.id ?? null;
  // Efter svaret står bågen kvar där den var.
  const left = held ? held.left : view.left;
  const frac = Math.max(0, Math.min(1, left / view.total));
  const R = 21.5, CIRC = 2 * Math.PI * R;
  const lookOf = (id: string): string => {
    if (!held) return 'open';
    if (id === held.optionId) return held.grade;
    if (id === correct && held.grade !== 'right') return 'held';
    return 'dim';
  };
  const chosen = held ? step.text.options[held.optionId] : null;
  return (
    <aside className="nx-curious-card" data-testid="curious-card" data-mode={held ? held.grade : 'ask'} aria-live="polite">
      <header className="nx-curious-head">
        <div>
          <div className="nx-curious-kicker">{tt(lang, 'card.kicker')}</div>
          <div className="nx-curious-moment">{tt(lang, `curious.moment.${view.moment}` as StringKey)}</div>
        </div>
        <div className="nx-curious-arc" aria-hidden="true">
          <svg viewBox="0 0 54 54">
            <circle cx="27" cy="27" r={R} className="nx-curious-arc-track" />
            <circle cx="27" cy="27" r={R} className="nx-curious-arc-fill" strokeDasharray={`${CIRC * frac} ${CIRC}`} transform="rotate(-90 27 27)" />
          </svg>
          <span>{Math.ceil(left)}</span>
        </div>
      </header>
      <h2 className="nx-curious-q">{step.text.question}</h2>
      <ol className="nx-curious-rows">
        {step.options.map((o, i) => {
          const look = lookOf(o.id);
          return (
            <li key={o.id}>
              <button type="button" className="nx-curious-row" data-look={look} data-testid={`curious-option-${o.id}`} disabled={!!held} onClick={() => answer(o.id)}>
                <span className="nx-curious-key">
                  {look === 'right' ? <Check size={14} strokeWidth={3} /> : look === 'wrong' ? <X size={14} strokeWidth={3} /> : look === 'ok' ? '½' : i + 1}
                </span>
                <span className="nx-curious-text">{step.text.options[o.id]?.label}</span>
                {look === 'held' && <span className="nx-curious-held">{tt(lang, 'card.held')}</span>}
              </button>
            </li>
          );
        })}
      </ol>
      {held && paper && chosen && (
        <div className="nx-curious-paper" data-grade={held.grade}>
          <span className="nx-curious-pill" data-grade={held.grade}>{tt(lang, `verdict.${held.grade}` as StringKey)}</span>
          <p>{chosen.explanation}</p>
        </div>
      )}
    </aside>
  );
}
