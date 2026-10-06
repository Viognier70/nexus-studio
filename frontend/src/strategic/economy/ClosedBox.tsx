// ORDER 296 (kärnan punkt 2, Vision Owner 2026-10-02): "efter tre veckor
// under golvet stängs krogen och säsongen är slut." Rutan står mitt på
// skärmen som X1 (NoBusinessBox): rummet svartvitt och dämpat bakom, en enda
// knapp, Esc gör ingenting. Medaljerna sägs först. Knappen börjar en ny
// säsong med medaljerna och proven kvar (reducer.ts RESTART_SEASON).

import { useEffect } from 'react';
import { isClosed } from '../../sim/economy';
import { t as tt } from '../../content/nexusStrings';
import { useLanguage } from '../../content/language';
import { NxButton, NxLabel } from '../ui/system/components';
import '../ui/service/service.css';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';

const ROOM_FILTER = 'canvas { filter: grayscale(1) brightness(0.55); }';

export function ClosedBox() {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const lang = useLanguage();
  const shown = isClosed(sim);

  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [shown]);

  if (!shown) return null;
  const week = sim.economy.risk?.closedWeek ?? 0;
  return (
    <div className="nx nx-stranded-backdrop">
      <style>{ROOM_FILTER}</style>
      <div className="nx-stranded" role="dialog" aria-modal="true" aria-labelledby="closed-heading" data-testid="closed-box" data-week={week}>
        <NxLabel>{tt(lang, 'risk.closed.kicker')}</NxLabel>
        <h2 id="closed-heading" className="nx-heading">{tt(lang, 'risk.closed.title')}</h2>
        <p className="nx-stranded-body">{tt(lang, 'risk.closed.medals')}</p>
        {/* ORDER 311 — konkurs i säsongens sista bokslut. */}
        <p className="nx-stranded-body" data-reason={sim.economy.risk?.closedReason ?? 'inRow'}>{tt(lang, sim.economy.risk?.closedReason === 'seasonEnd' ? 'risk.closed.bodySeasonEnd' : 'risk.closed.body', { week })}</p>
        <div style={{ marginTop: 'calc(32 * var(--nx-u))' }}>
          <NxButton testId="closed-restart" onClick={() => dispatch({ type: 'RESTART_SEASON' })} autoFocus>{tt(lang, 'risk.closed.again')}</NxButton>
        </div>
      </div>
    </div>
  );
}
