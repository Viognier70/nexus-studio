// ORDER 315a — "Din väg": hela karriärstegen från början (ORDRAR_314-316_D7.md
// ORDER 315 "Stegen": "Hela stegen visas från början"). De åtta stegen, var
// spelaren står, kraven för nästa steg (kassa, rykte och medalj) och de låsta
// stegen med "Kommer senare". Formen kommer från Designs D7 ("Din väg"); till
// dess designsystemets enkla delar.

import { strings } from '../../content/strings';
import { useLanguage } from '../../content/language';
import { LADDER } from '../../sim/balance';
import { ladderStep, missingFor, nextStep, requirementFor, type PlayableStep } from '../../sim/ladder';
import { t as tt, type StringKey } from '../../content/nexusStrings';
import type { SimulationState } from '../types';

const MEDAL_KEY: Record<string, string> = { brons: 'bronze', silver: 'silver', guld: 'gold', platina: 'platinum' };

export function DinVag({ sim }: { sim: SimulationState }) {
  const lang = useLanguage();
  const l = strings.ladder;
  const here = ladderStep(sim);
  const next = nextStep(here);
  const req = next ? requirementFor(next) : null;
  const missing = next ? missingFor(sim, next) : [];
  const kr = (n: number) => Math.round(n).toLocaleString(lang === 'sv' ? 'sv-SE' : 'en-GB');
  const playable = LADDER.playable as readonly string[];
  const hereIndex = here ? LADDER.order.indexOf(here) : -1;
  return (
    <section className="nx-paper nx-dinvag" data-testid="din-vag" aria-label={l.yourWay}>
      <div className="nx-label">{l.yourWay}</div>
      <ol className="nx-dinvag-steps">
        {LADDER.order.map((id, i) => {
          const state = id === here ? 'here' : !playable.includes(id) ? 'later' : i < hereIndex ? 'done' : 'ahead';
          return (
            <li key={id} data-step={id} data-state={state} data-testid={`din-vag-${id}`}>
              <span className="nx-dinvag-name">{l.steps[id]}</span>
              {state === 'here' && <span className="nx-dinvag-tag">{l.youAreHere}</span>}
              {state === 'later' && <span className="nx-dinvag-tag">{l.comingLater}</span>}
              {LADDER.steps[id as PlayableStep]?.starsPossible && <span className="nx-dinvag-tag">★</span>}
            </li>
          );
        })}
      </ol>
      {next && req && (
        <div className="nx-dinvag-req" data-testid="din-vag-req" data-next={next}>
          <div className="nx-label">{l.nextNeeds(l.steps[next])}</div>
          <ul>
            <li data-ok={!missing.includes('cash')}>{l.reqCash(kr(req.cashSek), kr(sim.cash))}</li>
            <li data-ok={!missing.includes('reputation')}>{l.reqReputation(String(Math.round(req.reputationAtLeast * 100)), String(Math.round(sim.reputation * 100)))}</li>
            <li data-ok={!missing.includes('medals')}>{l.reqMedals(req.medalsRequired.map((m) => `${tt(lang, `medal.${MEDAL_KEY[m.level] ?? m.level}` as StringKey)} ${(strings.knowledge.pavilions as Record<string, string>)[m.pavilion] ?? m.pavilion}`).join(', '))}</li>
          </ul>
        </div>
      )}
    </section>
  );
}
