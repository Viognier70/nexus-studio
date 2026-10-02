// ORDER 296 (punkt 6, provspel av 64b27c0): "spelet får inte öppna utan
// råvaror utan att stoppa och fråga". Knapparna som öppnar dörrarna går
// genom useOpenGuard: räcker lagret till färre än MORNING_STAKE.askBelowCoverShare
// av de väntade gästerna (morningBuy.ts openShortfall) visas frågan först.

import { useRef, useState } from 'react';
import { t as tt } from '../../content/nexusStrings';
import { useLanguage } from '../../content/language';
import { openShortfall } from '../simulation/morningBuy';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';
import { NxButton } from './system/components';

export function useOpenGuard(onOpenBuy?: (() => void) | null) {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const lang = useLanguage();
  const [asking, setAsking] = useState(false);
  const beforeRef = useRef<(() => void) | undefined>(undefined);
  const open = () => { beforeRef.current?.(); beforeRef.current = undefined; dispatch({ type: 'START_SERVICE' }); };
  const request = (before?: () => void) => {
    beforeRef.current = before;
    if (openShortfall(sim).short) { setAsking(true); return; }
    open();
  };
  const s = openShortfall(sim);
  const dialog = asking ? (
    <div className="nx nx-screen nxs-over" role="alertdialog" aria-modal="true" aria-label={tt(lang, 'open.short.title')} data-testid="open-short">
      <section className="nx-panel nx-open-short">
        <h2 className="nx-heading" style={{ margin: 0 }}>{tt(lang, 'open.short.title')}</h2>
        <p className="nx-body" data-testid="open-short-body">{tt(lang, 'open.short.body', { covers: s.covers, guests: s.guests })}</p>
        <div className="nx-open-short-actions">
          {onOpenBuy && <NxButton testId="open-short-buy" onClick={() => { setAsking(false); onOpenBuy(); }}>{tt(lang, 'open.short.buy')}</NxButton>}
          <NxButton kind="secondary" testId="open-short-open" onClick={() => { setAsking(false); open(); }}>{tt(lang, 'open.short.open')}</NxButton>
          <NxButton kind="secondary" testId="open-short-cancel" onClick={() => setAsking(false)}>{tt(lang, 'open.short.cancel')}</NxButton>
        </div>
      </section>
    </div>
  ) : null;
  return { request, dialog };
}
