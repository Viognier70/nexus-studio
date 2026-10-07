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
//     visade bara ställningen och styrde ingenting. ORDER 299: Stämningen i
//     rummet stod där; ORDER 299b flyttar den till höger om kassan (MoodMeter.tsx).
// ORDER 298b — när ryktet håller nere gästerna står "Lugn kväll: ryktet är
// ännu lågt i byn" under raden, före och under kvällen.
// Ryktet står kvar, med ändringen sedan dagen började. Vid en omkörning visas
// "Förbi …" och kassans ljud spelas svagare.
// ORDER 318 — under kvällen är bandet en rad: placeringen i klartext ("3:e av 7
// efter nöjda gäster", samma mått som byns kväll) och pilen för den senaste
// kvarten. Klick eller B fäller ut Byn just nu (VillageNowPanel.tsx). "Lugn
// kväll" står inte när krogen har flest gäster i byn.

import { useEffect, useRef, useState } from 'react';
import { t as tt } from '../../../content/nexusStrings';
import { strings } from '../../../content/strings';
import { useLanguage, type Lang } from '../../../content/language';
import { PLAYER_VENUE } from '../../../sim/village';
import { REPUTATION } from '../../../sim/balance';
import { playerHasMostGuests, playerPlace } from '../../../sim/villageNow';
import type { VenueLive } from '../../../sim/villageLive';
import { doorsOpenMinutes, formatClock } from '../../../sim/clock';
import { useSimState } from '../../simulation/SimulationProvider';
import { play } from '../sound/sound';
import { rankedVillage } from '../../scenario/CompareScreen';
import { RIVAL_BAND } from './hostShop';
import { reputationHoldsGuests } from '../../simulation/arrivals';
import type { SimulationState } from '../../types';
import { TrendArrow, VillageNowPanel, toggleVillageNow, useVillageNow, useVillageNowKey, useVillageNowOpen } from './VillageNowPanel';
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
  return yesterdayPlace(sim)?.rank ?? null;
}

/** Gårdagens placering och hur många krogar den räknades bland. */
export function yesterdayPlace(sim: SimulationState): { rank: number; of: number } | null {
  const last = [...(sim.economy?.weekEvenings ?? [])].reverse().find((e) => e.dayNumber < sim.day.dayNumber && e.village && e.village.length > 1);
  if (!last?.village) return null;
  const rows = rankedVillage(last.village);
  const ours = rows.find((r) => r.id === PLAYER_VENUE);
  if (!ours || ours.guests <= 0) return null;
  return { rank: rows.indexOf(ours) + 1, of: rows.length };
}

function CalmLine({ sim, lang, live }: { sim: SimulationState; lang: Lang; live?: VenueLive[] }) {
  if (!reputationHoldsGuests(sim)) return null;
  if (live && playerHasMostGuests(live)) return null;
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
  const yesterday = yesterdayPlace(sim);
  return (
    <div className="nx-rival-band" data-testid="rival-band" data-state="before" data-rank={yesterday?.rank ?? ''}>
      <div className="nx-rival-head">
        <div className="nx-label">{tt(lang, 'rival.title')}</div>
        <div className="nx-rival-rank" data-testid="rival-rank">
          {yesterday ? tt(lang, 'rival.yesterday', { rank: strings.villageNow.place(ordinal(lang, yesterday.rank), yesterday.of) }) : tt(lang, 'rival.opens', { time: formatClock(doorsOpenMinutes(sim)) })}
        </div>
      </div>
      <CalmLine sim={sim} lang={lang} />
    </div>
  );
}

function RivalBandInService() {
  const sim = useSimState();
  const lang = useLanguage();
  useVillageNowKey();
  const expanded = useVillageNowOpen();
  const { live, now } = useVillageNow(sim);
  const me = now.find((r) => r.player);
  // Ingen placering utan nöjda gäster (ORDER 298: inte 1:a med 0).
  const rank = playerPlace(now);
  const rep = Math.round(sim.reputation * REPUTATION.scale);
  const repDelta = rep - Math.round((sim.day.reputationAtDayStart ?? sim.reputation) * REPUTATION.scale);
  const [overtook, setOvertook] = useState<string | null>(null);
  const prev = useRef<{ rank: number | null; ahead: string[] } | null>(null);
  const ahead = rank === null ? [] : now.filter((r) => !r.player && r.place < rank).map((r) => r.id);
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
  const v = strings.villageNow;
  return (
    <div className="nx-rival-band" data-testid="rival-band" data-state="service" data-rank={rank ?? ''} data-guests={me?.guests ?? 0} data-content={me?.content ?? 0} data-venues={now.length} data-open={expanded}>
      <div className="nx-rival-head">
        <button type="button" className="nx-rival-toggle" data-testid="rival-toggle" aria-expanded={expanded} aria-controls="village-now" title={expanded ? v.close : v.open} onClick={toggleVillageNow}>
          <span className="nx-label">{tt(lang, 'rival.title')}</span>
          <span className="nx-rival-rank" data-testid="rival-rank">{rank !== null ? v.place(ordinal(lang, rank), now.length) : me && me.guests > 0 ? v.noContentYet : tt(lang, 'rival.noGuests')}</span>
          {rank !== null && me && <TrendArrow trend={me.trend} />}
          <span className="nx-rival-chevron" aria-hidden>{expanded ? '▴' : '▾'}</span>
        </button>
        <div className="nx-rival-rep" data-testid="hud-reputation" data-rep={rep} data-delta={repDelta}>
          {tt(lang, 'rep.label')} <strong>{rep}</strong>
          {repDelta !== 0 && <span data-dir={repDelta > 0 ? 'up' : 'down'}>{repDelta > 0 ? '▲' : '▼'}{Math.abs(repDelta)}</span>}
        </div>
        {overtook && <span className="nx-rival-overtake nx-rival-overtake-static" data-testid="rival-overtake">{tt(lang, 'rival.overtake', { name: strings.village.venues[overtook] ?? overtook })}</span>}
      </div>
      <CalmLine sim={sim} lang={lang} live={live} />
      {/* ORDER 313 §9, ORDER 318 — Byn just nu, utfälld med klick eller B. */}
      {expanded && <VillageNowPanel now={now} />}
    </div>
  );
}
