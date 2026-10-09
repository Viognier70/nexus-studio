// ORDER 300 §6 (Anders 2026-10-04) — förberedelsetiden mellan 18.00 och
// dörröppningen: en tydlig rad om vad spelaren kan göra nu. Personalen gör
// mise en place (det har spelaren ingen hand i före öppningen); spelaren kan
// titta på konkurrenterna i byn. Klockan går fortare fram till öppningen
// (balance.ts PREP_TIME, simulation/consequence.ts effectiveSpeed).

import { strings } from '../../../content/strings';
import { beforeDoors, doorsOpenMinutes, formatClock } from '../../../sim/clock';
import { PREP_TIME } from '../../../sim/balance';
import { useSimState } from '../../simulation/SimulationProvider';

export function PrepHint() {
  const sim = useSimState();
  if (!beforeDoors(sim)) return null;
  const p = strings.prepHint;
  return (
    // ORDER 323 §10 — vid Krogen (Z) fälls raden ihop till rubriken (service.css); hela texten står i title.
    <div className="nx nx-prep-hint" role="status" data-testid="prep-hint" title={`${p.now} ${p.faster(formatClock(doorsOpenMinutes(sim)), PREP_TIME.speedAtLeast)}`}>
      <span className="nx-label nx-accent-text">{p.label}</span>
      <span className="nx-prep-hint-text">{p.now}</span>
      <span className="nx-prep-hint-fast">{p.faster(formatClock(doorsOpenMinutes(sim)), PREP_TIME.speedAtLeast)}</span>
    </div>
  );
}
