// ORDER 300 §5 (Anders 2026-10-04) — regelkortet dag 1 och sidan Spelets
// regler. Kortet visas första morgonen i ett nytt spel (introduktionen,
// innan övningen) och finns sedan alltid i menyn. Sidan säger också vad som
// inte gäller och förklarar stjärnan med de verkliga gränserna. Alla tal
// kommer ur balance.ts: SEASON.weeks, RISK.closeAfterWeeksBelowZero och STAR.

import { strings } from '../../content/strings';
import { RISK, SEASON, STAR } from '../../sim/balance';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';
import { NxButton } from './system/components';
import './screens/screens.css';

const word = (n: number, capital = false) => {
  const w = strings.rules.numberWord[n] ?? String(n);
  return capital ? w.charAt(0).toUpperCase() + w.slice(1) : w;
};

/** Visas kortet av sig självt (första morgonen)? */
export function rulesCardDue(s: { introduction?: { practiced: boolean } | null; rulesSeen?: boolean }): boolean {
  return !!s.introduction && !s.introduction.practiced && !s.rulesSeen;
}

export function RulesPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const due = rulesCardDue(sim);
  if (!open && !due) return null;
  const r = strings.rules;
  const card = due && !open;
  const close = () => {
    if (due) dispatch({ type: 'RULES_SEEN' });
    onClose();
  };
  return (
    <div className="nx nxs-rules" role="dialog" aria-modal="true" aria-label={r.heading} data-testid={card ? 'rules-card' : 'rules-page'}>
      <div className="nx-panel nxs-rules-panel">
        <div className="nx-label nx-accent-text">{r.heading}</div>
        <p className="nx-heading nxs-mt-16 nxs-rules-tagline">{r.tagline(word(SEASON.weeks, true))}</p>
        <ol className="nxs-rules-list nxs-mt-24">
          <li className="nx-body">{r.rule1(word(RISK.closeAfterWeeksBelowZero, true))}</li>
          <li className="nx-body">{r.rule2}</li>
          <li className="nx-body">{r.rule3}</li>
        </ol>
        {!card && (
          <>
            {/* ORDER 311 — konkurs i säsongens sista bokslut. */}
            <p className="nx-small nxs-mt-16" data-testid="rules-season-end">{r.seasonEnd}</p>
            <h3 className="nx-label nxs-mt-24">{r.notHeading}</h3>
            <ul className="nxs-rules-not">
              <li className="nx-small">{r.notMoney}</li>
              <li className="nx-small">{r.notAnswers}</li>
              <li className="nx-small">{r.notLuck}</li>
            </ul>
            <h3 className="nx-label nxs-mt-24">{r.starHeading}</h3>
            <p className="nx-small nxs-measure" data-testid="rules-star">
              {r.star({
                medal: strings.knowledge.medals[STAR.medal],
                pavilion: strings.knowledge.pavilions[STAR.pavilion],
                reputation: Math.round(STAR.reputationAtLeast * 100),
                judgementPct: Math.round(STAR.judgementAtLeast * 100),
                minRockets: STAR.minRocketsInWeek,
                weeks: word(STAR.weeksToEarn)
              })}
            </p>
          </>
        )}
        <div className="nxs-mt-24 nxs-w-300">
          <NxButton testId="rules-close" onClick={close} autoFocus>{card ? r.begin : r.close}</NxButton>
        </div>
      </div>
    </div>
  );
}
