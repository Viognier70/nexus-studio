// ORDER 296 (kärnan punkt 4) — bandet i byn under kvällskassan (Designs
// leverans hovmästaren och butiken §4, hostShop.ts RIVAL_BAND). Ställningen
// mäter kvällens gäster (sim/villageLive.ts); varje krog är en lykta på
// linjen, x = gäster / flest gäster i byn i kväll. Vår lykta är guld, ligger
// överst och har alltid sitt namn; musen över en annan visar namnet och
// gästerna. När vi kör om någon: guldpillen rival.overtake i 2,8 s och
// kassans ljud i svagare form. Lyktorna glider i 1,4 s (inte med reducerad
// rörelse).

import { useEffect, useRef, useState } from 'react';
import { t as tt } from '../../../content/nexusStrings';
import { strings } from '../../../content/strings';
import { useLanguage, type Lang } from '../../../content/language';
import { PLAYER_VENUE } from '../../../sim/village';
import { REPUTATION } from '../../../sim/balance';
import { villageLive, villageRank } from '../../../sim/villageLive';
import { useSimState } from '../../simulation/SimulationProvider';
import { useBusiness } from '../../business/BusinessContext';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { play } from '../sound/sound';
import { RIVAL_BAND } from './hostShop';
import './host.css';

export function ordinal(lang: Lang, n: number): string {
  if (lang === 'sv') {
    const last = n % 10;
    const lastTwo = n % 100;
    return `${n}:${(last === 1 || last === 2) && lastTwo !== 11 && lastTwo !== 12 ? 'a' : 'e'}`;
  }
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

export function RivalBand() {
  const sim = useSimState();
  const inService = sim.day.period === 'dinner' && !!sim.economy.businessClass;
  return inService ? <RivalBandInService /> : null;
}

function RivalBandInService() {
  const sim = useSimState();
  const lang = useLanguage();
  const still = usePrefersReducedMotion();
  const { business } = useBusiness();
  const rows = villageLive(sim);
  const rep = Math.round(sim.reputation * REPUTATION.scale);
  const repDelta = rep - Math.round((sim.day.reputationAtDayStart ?? sim.reputation) * REPUTATION.scale);
  const rank = villageRank(rows);
  const max = Math.max(1, ...rows.map((r) => r.guests));
  const name = (id: string) => (id === PLAYER_VENUE ? business.name ?? tt(lang, 'rival.us') : strings.village.venues[id] ?? id);
  const [hover, setHover] = useState<string | null>(null);
  const [overtook, setOvertook] = useState<string | null>(null);
  const prev = useRef<{ rank: number; passed: string[] } | null>(null);

  // Omkörningen: vår plats blev bättre sedan förra bilden.
  const ours = rows.find((r) => r.id === PLAYER_VENUE)?.guests ?? 0;
  const ahead = rows.filter((r) => r.id !== PLAYER_VENUE && r.guests > ours).map((r) => r.id);
  useEffect(() => {
    const before = prev.current;
    prev.current = { rank, passed: ahead };
    if (!before || rank >= before.rank) return;
    const passedNow = before.passed.find((id) => !ahead.includes(id));
    if (!passedNow) return;
    setOvertook(passedNow);
    play('overtake');
    const t = window.setTimeout(() => setOvertook(null), RIVAL_BAND.overtakeChipMs);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rank]);

  const order: Record<string, number> = { truck: 0, restaurant: 1, player: 2 };
  const sorted = rows.slice().sort((a, b) => order[a.kind] - order[b.kind]);
  return (
    <div className="nx-rival-band" data-testid="rival-band" data-rank={rank} data-venues={rows.length}>
      <div className="nx-rival-head">
        <div className="nx-label">{tt(lang, 'rival.title')}</div>
        <div className="nx-rival-rank" data-testid="rival-rank">{tt(lang, 'rival.rank', { rank: ordinal(lang, rank) })}</div>
        {/* ORDER 296 (kärnan punkt 3) — ryktet syns och rör sig under kvällen. */}
        <div className="nx-rival-rep" data-testid="hud-reputation" data-rep={rep} data-delta={repDelta}>
          {tt(lang, 'rep.label')} <strong>{rep}</strong>
          {repDelta !== 0 && <span data-dir={repDelta > 0 ? 'up' : 'down'}>{repDelta > 0 ? '▲' : '▼'}{Math.abs(repDelta)}</span>}
        </div>
      </div>
      <div className="nx-rival-line">
        {sorted.map((r) => {
          const x = r.guests / max;
          const kind = r.id === PLAYER_VENUE ? 'ours' : r.kind === 'truck' ? 'truck' : 'venue';
          return (
            <div
              key={r.id}
              className="nx-rival-lantern"
              data-kind={kind}
              data-venue={r.id}
              data-guests={r.guests}
              data-testid={`rival-${r.id}`}
              style={{ left: `${x * 100}%`, transition: still ? 'none' : `left ${RIVAL_BAND.glideMs}ms ease-in-out` }}
              onMouseEnter={() => setHover(r.id)}
              onMouseLeave={() => setHover((h) => (h === r.id ? null : h))}
            >
              <span className="nx-rival-dot" />
              {kind === 'ours' && <span className="nx-rival-name">{name(r.id)}</span>}
              {kind === 'ours' && overtook && <span className="nx-rival-overtake" data-testid="rival-overtake">{tt(lang, 'rival.overtake', { name: name(overtook) })}</span>}
              {kind !== 'ours' && hover === r.id && (
                <span className="nx-rival-tip" data-testid="rival-tip"><strong>{name(r.id)}</strong> {tt(lang, 'rival.guests', { n: r.guests })}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
