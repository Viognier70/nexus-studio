// ORDER 290 — kvällens insats när dörrarna öppnas (Vision Owner 2026-09-30):
// råvaror, personal, DJ, satsningar och kompetens, och summan som är linjen
// för break-even i kvällskassan. Talen ur day.stake (eveningEconomy.ts
// eveningStake, satt när dörrarna öppnade). Kortet står en stund
// (EVENING_ECONOMY.stakeCardSeconds) och kan stängas.

import { useEffect, useState } from 'react';
import { strings } from '../../../content/strings';
import { EVENING_ECONOMY } from '../../../sim/balance';
import { useSimState } from '../../simulation/SimulationProvider';
import { formatSek } from '../CashCounter';
import '../service/service.css';

export function StakeCard() {
  const sim = useSimState();
  const stake = sim.day.stake;
  const inService = sim.day.period === 'lunch' || sim.day.period === 'dinner';
  const key = `${sim.day.dayNumber}:${sim.day.stakeShownAt ?? ''}`;
  const [closedKey, setClosedKey] = useState<string | null>(null);
  useEffect(() => {
    if (!stake) return;
    const timer = window.setTimeout(() => setClosedKey(key), EVENING_ECONOMY.stakeCardSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [key, stake]);
  if (!stake || !inService || closedKey === key) return null;
  const t = strings.stake;
  return (
    <div className="nx nx-panel nx-stake-card" data-testid="stake-card" role="status" onClick={() => setClosedKey(key)}>
      <div className="nx-label">{t.kicker}</div>
      <ul className="nx-stake-lines">
        {stake.lines.map((l) => (
          <li key={l.key} data-testid={`stake-${l.key}`} data-value={l.sek}><span>{t.lines[l.key]}</span><span className="nx-num">{formatSek(l.sek)}</span></li>
        ))}
      </ul>
      <div className="nx-stake-total"><span>{t.total}</span><span className="nx-num" data-testid="stake-total" data-value={stake.total}>{formatSek(stake.total)}</span></div>
      <div className="nx-small nx-muted">{t.note}</div>
    </div>
  );
}
