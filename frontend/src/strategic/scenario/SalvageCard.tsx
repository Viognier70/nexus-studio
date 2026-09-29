// ORDER 285 — gårdagens rester på morgonen: en fråga om hur råvaran tas
// tillvara (salvage.ts). Rätt svar gör portionerna säljbara i kväll; fel
// svar skickar dem till sopbilen. Efter svaret står förklaringen kvar tills
// spelaren stänger kortet eller öppnar för kvällen.

import { strings } from '../../content/strings';
import { findDish } from '../simulation/m4Catalogue';
import { SALVAGE_BEST, SALVAGE_OPTIONS, salvageGroup } from '../simulation/salvage';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';
import { NxButton } from '../ui/system/components';
import { formatSek } from '../ui/CashCounter';

export function SalvageCard() {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const sv = sim.salvage;
  if (!sv || sim.day.period !== 'morning' || sv.resolved === 'discarded') return null;
  const group = salvageGroup(sv.dishId);
  if (!group) return null;
  const t = strings.salvage;
  const q = t.questions[group];
  const dish = (findDish(sv.dishId)?.name ?? sv.dishId).toLowerCase();
  const answered = sv.resolved !== null;
  return (
    <div className="nx-panel nxs-mt-24" data-testid="salvage-card" data-resolved={sv.resolved ?? ''} style={{ padding: 'calc(24 * var(--nx-u))' }}>
      <div className="nx-label nx-accent-text">{t.kicker}</div>
      <p className="nx-body" style={{ margin: 'calc(8 * var(--nx-u)) 0', fontWeight: 700 }}>{t.title(sv.portions, dish)}</p>
      <p className="nx-body" style={{ margin: '0 0 calc(12 * var(--nx-u))' }} data-testid="salvage-question">{q.question}</p>
      <div style={{ display: 'grid', gap: 'calc(8 * var(--nx-u))' }}>
        {SALVAGE_OPTIONS.map((id) => {
          const chosen = sv.optionId === id;
          const best = SALVAGE_BEST[group] === id;
          return (
            <button key={id} type="button" className="nx-rocket-option nxs-salvage-option" data-testid={`salvage-option-${id}`}
              data-look={answered ? (best ? 'correct' : chosen ? 'wrong' : 'plain') : 'plain'}
              disabled={answered}
              onClick={() => dispatch({ type: 'ANSWER_SALVAGE', optionId: id })}>
              <span className="nx-rocket-key" aria-hidden>{id.toUpperCase()}</span>
              <span>{q.options[id]}</span>
              <span className="nx-rocket-tag">{answered && best ? '✓' : answered && chosen ? '✗' : ''}</span>
            </button>
          );
        })}
      </div>
      {answered && (
        <div data-testid="salvage-outcome" style={{ marginTop: 'calc(12 * var(--nx-u))' }}>
          <p className="nx-body" style={{ fontWeight: 700, margin: 0 }}>
            {sv.resolved === 'right' ? t.right(sv.portions) : t.wrong(formatSek(sv.feeSek ?? 0))}
          </p>
          <p className="nx-small" style={{ margin: 'calc(6 * var(--nx-u)) 0' }}>{q.why}</p>
          <NxButton kind="quiet" testId="salvage-close" onClick={() => dispatch({ type: 'CLOSE_SALVAGE' })}>{t.done}</NxButton>
        </div>
      )}
    </div>
  );
}
