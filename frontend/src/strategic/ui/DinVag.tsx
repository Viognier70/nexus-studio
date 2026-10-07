// ORDER 315a — "Din väg": hela karriärstegen från början (ORDRAR_314-316_D7.md
// ORDER 315 "Stegen": "Hela stegen visas från början").
//
// ORDER 315b del 2 — Designs D7 (careerPath.ts, prototypens skärm 3): åtta steg
// på en lina. Klara steg i guld med en bock, där spelaren står på papper med
// sken och "Du är här", nästa steg med guldkant, låsta steg streckade med
// "Kommer senare". Kortet under linan visar nästa stegs tre krav, kassa,
// rykte och medalj (ORDER 315c: och för vinbaren de klarade situationerna i foodtrucken), med en stapel och brickan Klart eller Inte klart; inget
// rött eller grönt, eftersom det inte är ett svar. Kraven läses ur
// sim/ladder.ts (balance.ts LADDER), inte ur Designs platshållare.

import { useLanguage } from '../../content/language';
import { FOODTRUCK, LADDER } from '../../sim/balance';
import { ladderStep, missingFor, nextStep, requirementFor, truckEvenings, truckSituations, type PlayableStep } from '../../sim/ladder';
import { t as tt, type StringKey } from '../../content/nexusStrings';
import { strings } from '../../content/strings';
import type { SimulationState } from '../types';
import './ladder.css';

// Stegen i klassernas nycklar och D7:s namn.
export const PATH_KEY: Record<string, string> = {
  foodtruck: 'path.step.truck', vinbar: 'path.step.winebar', bistro: 'path.step.bistro', olhall: 'path.step.brewpub',
  kvarterskrog: 'path.step.restaurant', nattklubb: 'path.step.club', gastgiveri: 'path.step.inn', soigne: 'path.step.star'
};
const MEDAL_ORDER = ['brons', 'silver', 'guld', 'platina'];
const MEDAL_KEY: Record<string, string> = { brons: 'bronze', silver: 'silver', guld: 'gold', platina: 'platinum' };
const REP_SCALE = 100;

export type PathState = 'done' | 'here' | 'next' | 'later';

export function pathStates(here: PlayableStep | null): { id: string; state: PathState }[] {
  const playable = LADDER.playable as readonly string[];
  const i = here ? LADDER.order.indexOf(here) : -1;
  return LADDER.order.map((id, k) => ({
    id,
    state: k < i ? 'done' : k === i ? 'here' : k === i + 1 && playable.includes(id) ? 'next' : 'later'
  }));
}

export function DinVag({ sim }: { sim: SimulationState }) {
  const lang = useLanguage();
  const S = (k: string, v?: Record<string, string | number>) => tt(lang, k as StringKey, v);
  const here = ladderStep(sim);
  const next = nextStep(here);
  const req = next ? requirementFor(next) : null;
  const missing = next ? missingFor(sim, next) : [];
  const kr = (n: number) => `${Math.round(n).toLocaleString(lang === 'sv' ? 'sv-SE' : 'en-GB')} kr`;
  const medalName = (m: { pavilion: string; level: string }) => `${S(`medal.${MEDAL_KEY[m.level] ?? m.level}`)} ${(strings.knowledge.pavilions as Record<string, string>)[m.pavilion] ?? m.pavilion}`;
  const medalShare = (need: readonly { pavilion: string; level: string }[]) => {
    if (need.length === 0) return 1;
    return need.reduce((a, m) => {
      const have = MEDAL_ORDER.indexOf((sim.medals as Record<string, string>)[m.pavilion] ?? '');
      return a + Math.min(1, (have + 1) / (MEDAL_ORDER.indexOf(m.level) + 1));
    }, 0) / need.length;
  };
  const rows = req ? [
    { kind: 'cash', label: S('path.req.cash'), value: S('path.req.of', { have: kr(sim.cash), need: kr(req.cashSek) }), progress: req.cashSek > 0 ? sim.cash / req.cashSek : 1, met: !missing.includes('cash') },
    { kind: 'rep', label: S('path.req.rep'), value: S('path.req.of', { have: Math.round(sim.reputation * REP_SCALE), need: Math.round(req.reputationAtLeast * REP_SCALE) }), progress: req.reputationAtLeast > 0 ? sim.reputation / req.reputationAtLeast : 1, met: !missing.includes('reputation') },
    { kind: 'medal', label: S('path.req.medal'), value: req.medalsRequired.map(medalName).join(', '), progress: medalShare(req.medalsRequired), met: !missing.includes('medals') },
    // ORDER 315c (Anders 2026-10-07) — vinbaren kräver klarade situationer i foodtrucken.
    ...(next === 'vinbar' ? [{ kind: 'evenings', label: S('path.req.evenings'), value: S('path.req.of', { have: Math.min(truckEvenings(sim), FOODTRUCK.offerMinEvenings), need: FOODTRUCK.offerMinEvenings }), progress: truckEvenings(sim) / FOODTRUCK.offerMinEvenings, met: !missing.includes('evenings') }] : []),
    ...(next === 'vinbar' ? [{ kind: 'situations', label: S('path.req.situations'), value: S('path.req.of', { have: truckSituations(sim).toLocaleString(lang === 'sv' ? 'sv-SE' : 'en-GB'), need: FOODTRUCK.offerMinSituations }), progress: truckSituations(sim) / FOODTRUCK.offerMinSituations, met: !missing.includes('situations') }] : [])
  ] : [];
  return (
    <section className="nx-paper nx-dinvag" data-testid="din-vag" aria-label={S('path.title')}>
      <div className="nx-label">{S('path.title')}</div>
      <div className="nx-small nx-dinvag-sub">{S('path.sub')}</div>
      <ol className="nx-dinvag-line">
        {pathStates(here).map(({ id, state }) => (
          <li key={id} data-step={id} data-state={state} data-testid={`din-vag-${id}`}>
            <span className="nx-dinvag-dot" aria-hidden>{state === 'done' ? '✓' : ''}</span>
            <span className="nx-dinvag-name">{S(PATH_KEY[id])}</span>
            {state === 'here' && <span className="nx-dinvag-tag">{S('path.here')}</span>}
            {state === 'done' && <span className="nx-dinvag-tag">{S('path.done')}</span>}
            {state === 'next' && <span className="nx-dinvag-tag">{S('path.next')}</span>}
            {state === 'later' && <span className="nx-dinvag-tag">{S('path.later')}</span>}
          </li>
        ))}
      </ol>
      {next && req && (
        <div className="nx-dinvag-req" data-testid="din-vag-req" data-next={next}>
          <div className="nx-label">{S('path.next')} · {S(PATH_KEY[next])}</div>
          {rows.map((r) => (
            <div key={r.kind} className="nx-dinvag-row" data-kind={r.kind} data-ok={r.met} data-testid={`din-vag-req-${r.kind}`}>
              <span className="nx-dinvag-row-label">{r.label}</span>
              <span className="nx-dinvag-row-value">{r.value}</span>
              <span className="nx-dinvag-brick">{S(r.met ? 'path.req.met' : 'path.req.left')}</span>
              <span className="nx-dinvag-bar" aria-hidden><span style={{ width: `${Math.max(0, Math.min(1, r.progress)) * 100}%` }} /></span>
            </div>
          ))}
          <p className="nx-small nx-dinvag-offer">{S('path.offer')}</p>
        </div>
      )}
    </section>
  );
}
