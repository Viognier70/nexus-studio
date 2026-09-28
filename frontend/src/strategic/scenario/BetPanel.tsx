// ORDER 279 — action-knappen kommer tillbaka som live betting (Vision Owner
// 2026-09-28, andra provspelet): "Spelaren startar själv en trestegsraket
// och satsar krediter, med vinst och förlust. Kassa och krediter tickar upp
// och ner med tydlig animation." Speldesign > Servicen > Insatsen.
//
// I högerkanten under kvällen, när ingen raket står öppen (raketkortet tar
// samma plats). Varje insats visar vad den kan vinna och förlora i kronor.
// Resultatet av den senaste insatsen står kvar en stund; kassan och
// krediterna överst (CashCounter) räknas upp eller ner samtidigt.

import { useEffect, useState } from 'react';
import { strings } from '../../content/strings';
import { BET } from '../../sim/balance';
import { canStartBet } from '../../sim/incidents';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';
import { formatSek } from '../ui/CashCounter';
import { NxLabel, u } from '../ui/system/components';
import '../ui/system/system.css';

export function BetPanel() {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const inc = sim.incidents;
  const last = inc?.lastBet ?? null;
  const [shownResult, setShownResult] = useState<typeof last>(null);
  useEffect(() => {
    if (!last) return;
    setShownResult(last);
    const t = window.setTimeout(() => setShownResult(null), BET.resultVisibleMs);
    return () => window.clearTimeout(t);
  }, [last?.at, last?.stake]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!inc?.enabled || sim.day.period !== 'dinner' || inc.active || !sim.day.doorsOpenedThisService) return null;
  const t = strings.bet;
  const left = BET.maxPerEvening - (inc.betsTonight ?? 0);
  const win = (n: number) => formatSek(n * BET.cashPerCredit * BET.winCashFactor);
  const loss = (n: number) => formatSek(n * BET.cashPerCredit * BET.lossCashFactor);
  return (
    <section
      className="nx nx-panel"
      data-testid="bet-panel"
      aria-label={t.heading}
      style={{
        position: 'fixed',
        top: u(120),
        right: u(72),
        width: u(460),
        padding: `${u(16)} ${u(20)}`,
        zIndex: 41,
        pointerEvents: 'auto'
      }}
    >
      <NxLabel>{t.heading}</NxLabel>
      {shownResult && (
        <p data-testid="bet-result" data-won={shownResult.won} className="nx-body" role="status"
          style={{ fontWeight: 800, marginTop: u(8), color: shownResult.won ? 'var(--nx-ink)' : 'var(--nx-accent-700)' }}>
          {shownResult.won ? t.won(shownResult.stake, shownResult.credits, shownResult.cashSek) : t.lost(shownResult.stake, -shownResult.cashSek)}
        </p>
      )}
      <p className="nx-small nx-muted" style={{ marginTop: u(8) }}>{t.intro}</p>
      {left > 0 ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: u(8), marginTop: u(10) }}>
            {BET.stakes.map((n) => (
              <button key={n} type="button" className="nx-btn nx-btn-secondary" style={{ width: '100%', minWidth: 0, flexDirection: 'column', alignItems: 'flex-start', gap: u(2) }}
                disabled={!canStartBet(sim, n)} onClick={() => dispatch({ type: 'START_BET', stake: n })}
                aria-label={t.stakeAria(n, win(n), loss(n))} data-testid={`bet-stake-${n}`}>
                <span style={{ fontWeight: 800 }}>{t.stake(n)}</span>
                <span className="nx-small" style={{ fontWeight: 400 }}>{t.odds(win(n), loss(n))}</span>
              </button>
            ))}
          </div>
          <p className="nx-small nx-muted" style={{ marginTop: u(8) }} data-testid="bet-left">{t.left(left)}</p>
        </>
      ) : (
        <p className="nx-small" style={{ marginTop: u(8) }} data-testid="bet-left">{t.none}</p>
      )}
    </section>
  );
}
