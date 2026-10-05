// ORDER 303 G (Anders 2026-10-04, provspel: "Pyramiden blev väldigt liten,
// och den var det mest spännande att se"): när en raket klättrar ett steg
// visas pyramiden stort i mitten i 1,5 s med steget som tänds och
// multiplikatorn, och raden "Potten × steg → kvällens utfall" (ORDER 305b:
// kvitt eller dubbelt ersätter säkerheten), så att kopplingen mellan potten
// och utfallet syns. Därefter krymper den till listen (PyramidStrip på
// raketkortet).

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { strings } from '../../../content/strings';
import { useLanguage } from '../../../content/language';
import { DOUBLE_OR_NOTHING } from '../../../sim/balance';
import { KnowledgePyramid, type LevelState } from './KnowledgePyramid';

export const PYRAMID_MOMENT_MS = 1500;
const AXES = ['episteme', 'techne', 'phronesis'] as const;

export function PyramidMoment({ levels, step, full, pot, guestsIn }: { levels: LevelState[]; step: number; full: boolean; pot: number | null; guestsIn: number }) {
  const lang = useLanguage();
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const id = window.setTimeout(() => setShown(false), PYRAMID_MOMENT_MS);
    return () => window.clearTimeout(id);
  }, []);
  if (!shown) return null;
  const p = strings.pyramidMoment;
  const mult = `×${(DOUBLE_OR_NOTHING.growth ** step).toLocaleString(lang === 'sv' ? 'sv-SE' : 'en-GB')}`;
  const stepName = strings.service.incident.stepName[AXES[step] ?? 'episteme'];
  const outcome = full && pot !== null ? p.credits(pot) : guestsIn > 0 ? p.guests(guestsIn) : p.more;
  const sure = pot !== null ? strings.rocket.card.kvitt.potShort(pot) : p.noStake;
  // Över rummet, i fönstrets mitt (utanför raketkortets ruta).
  return createPortal(
    <div className="nx nx-pyr-moment" role="status" data-testid="pyramid-moment" data-step={step}>
      <KnowledgePyramid levels={levels} full={full} showMult testId="pyramid-moment-pyramid" />
      <div className="nx-label nx-accent-text">{p.label}</div>
      <div className="nx-pyr-moment-line" data-testid="pyramid-moment-line">{p.line(sure, `${stepName} ${mult}`, outcome)}</div>
    </div>,
    document.body
  );
}
