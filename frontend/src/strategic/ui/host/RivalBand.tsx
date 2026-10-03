// ORDER 296 (kärnan punkt 4) — Byn i kväll under klockan och kvällskassan
// (Designs leverans hovmästaren och butiken §4).
//
// ORDER 298 (provspel: "Byn i kväll visade Tannin som 1:a med stort
// försprång" med 0 gäster och 0 kr):
//   - raden säger vad placeringen mäter: kvällens gäster som har suttit vid ett
//     bord, mot byns krogar och vagnar (sim/villageLive.ts);
//   - utan gäster finns ingen placering ("Väntar på gäster");
//   - före öppning står gårdagens placering ("I går: …"), eller "Byn öppnar …";
//   - linjen med lyktorna (vår gula prick med krogens namn) är borttagen: den
//     visade bara ställningen och styrde ingenting. Mätaren som ersätter den
//     kommer i ORDER 299.
// ORDER 298b — när ryktet håller nere gästerna står "Lugn kväll: ryktet är
// ännu lågt i byn" under raden, före och under kvällen.
// Ryktet står kvar, med ändringen sedan dagen började. Vid en omkörning visas
// "Förbi …" och kassans ljud spelas svagare.

import { useEffect, useRef, useState } from 'react';
import { t as tt } from '../../../content/nexusStrings';
import { strings } from '../../../content/strings';
import { useLanguage, type Lang } from '../../../content/language';
import { PLAYER_VENUE } from '../../../sim/village';
import { REPUTATION } from '../../../sim/balance';
import { villageLive, villageRank } from '../../../sim/villageLive';
import { doorsOpenMinutes, formatClock } from '../../../sim/clock';
import { useSimState } from '../../simulation/SimulationProvider';
import { play } from '../sound/sound';
import { rankedVillage } from '../../scenario/CompareScreen';
import { RIVAL_BAND } from './hostShop';
import { reputationHoldsGuests } from '../../simulation/arrivals';
import type { SimulationState } from '../../types';
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

// Gårdagens placering: senaste kvällen i veckans lista (spelarens rad efter gäster).
export function yesterdayRank(sim: SimulationState): number | null {
  const last = [...(sim.economy?.weekEvenings ?? [])].reverse().find((e) => e.dayNumber < sim.day.dayNumber && e.village && e.village.length > 1);
  if (!last?.village) return null;
  const rows = rankedVillage(last.village);
  const ours = rows.find((r) => r.id === PLAYER_VENUE);
  if (!ours || ours.guests <= 0) return null;
  return rows.indexOf(ours) + 1;
}

function CalmLine({ sim, lang }: { sim: SimulationState; lang: Lang }) {
  if (!reputationHoldsGuests(sim)) return null;
  return <div className="nx-rival-calm" data-testid="calm-evening">{tt(lang, 'calm.evening')}</div>;
}

export function RivalBand() {
  const sim = useSimState();
  if (!sim.economy.businessClass) return null;
  const doorsOpen = sim.day.period === 'dinner' && !!sim.day.doorsOpenedThisService;
  return doorsOpen ? <RivalBandInService /> : <RivalBandBefore />;
}

function RivalBandBefore() {
  const sim = useSimState();
  const lang = useLanguage();
  if (sim.day.period !== 'morning' && sim.day.period !== 'afternoon' && sim.day.period !== 'dinner') return null;
  const yesterday = yesterdayRank(sim);
  return (
    <div className="nx-rival-band" data-testid="rival-band" data-state="before" data-rank={yesterday ?? ''}>
      <div className="nx-rival-head">
        <div className="nx-label">{tt(lang, 'rival.title')}</div>
        <div className="nx-rival-rank" data-testid="rival-rank">
          {yesterday ? tt(lang, 'rival.yesterday', { rank: ordinal(lang, yesterday) }) : tt(lang, 'rival.opens', { time: formatClock(doorsOpenMinutes(sim)) })}
        </div>
        <div className="nx-rival-measure">{tt(lang, 'rival.measures')}</div>
      </div>
      <CalmLine sim={sim} lang={lang} />
    </div>
  );
}

function RivalBandInService() {
  const sim = useSimState();
  const lang = useLanguage();
  const rows = villageLive(sim);
  const rank = villageRank(rows);
  const rep = Math.round(sim.reputation * REPUTATION.scale);
  const repDelta = rep - Math.round((sim.day.reputationAtDayStart ?? sim.reputation) * REPUTATION.scale);
  const [overtook, setOvertook] = useState<string | null>(null);
  const prev = useRef<{ rank: number | null; ahead: string[] } | null>(null);
  const ours = rows.find((r) => r.id === PLAYER_VENUE)?.guests ?? 0;
  const ahead = rows.filter((r) => r.id !== PLAYER_VENUE && r.guests >= ours).map((r) => r.id);
  useEffect(() => {
    const before = prev.current;
    prev.current = { rank, ahead };
    if (!before || rank === null || before.rank === null || rank >= before.rank) return;
    const passed = before.ahead.find((id) => !ahead.includes(id));
    if (!passed) return;
    setOvertook(passed);
    play('overtake');
    const t = window.setTimeout(() => setOvertook(null), RIVAL_BAND.overtakeChipMs);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rank]);
  return (
    <div className="nx-rival-band" data-testid="rival-band" data-state="service" data-rank={rank ?? ''} data-guests={ours} data-venues={rows.length}>
      <div className="nx-rival-head">
        <div className="nx-label">{tt(lang, 'rival.title')}</div>
        <div className="nx-rival-rank" data-testid="rival-rank">{rank === null ? tt(lang, 'rival.noGuests') : tt(lang, 'rival.rank', { rank: ordinal(lang, rank) })}</div>
        <div className="nx-rival-measure">{tt(lang, 'rival.measures')}</div>
        <div className="nx-rival-rep" data-testid="hud-reputation" data-rep={rep} data-delta={repDelta}>
          {tt(lang, 'rep.label')} <strong>{rep}</strong>
          {repDelta !== 0 && <span data-dir={repDelta > 0 ? 'up' : 'down'}>{repDelta > 0 ? '▲' : '▼'}{Math.abs(repDelta)}</span>}
        </div>
        {overtook && <span className="nx-rival-overtake nx-rival-overtake-static" data-testid="rival-overtake">{tt(lang, 'rival.overtake', { name: strings.village.venues[overtook] ?? overtook })}</span>}
      </div>
      <CalmLine sim={sim} lang={lang} />
    </div>
  );
}
