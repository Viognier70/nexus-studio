// ORDER 288 — jämförelsen efter kvällen (Vision Owner 2026-10-01): "gäster,
// intäkt per gäst och per stol, mot rivalerna." Speldesign > Ekonomin > Byn:
// "Efter kvällen jämförs spelarens gäster och intäkt per stol med de andra
// krogarnas."
//
// Skärm J1, efter kvällens resultat (R1). Raderna läses ur kvällens rad i
// veckans lista (sim/economy.ts EveningRecord.village, räknad i
// sim/village.ts villageEvening när servicen stängde): spelarens rad är
// rummets utfall, rivalernas byns. Sorterat efter gäster.

import { strings } from '../../content/strings';
import { useLanguage } from '../../content/language';
import { PLAYER_VENUE, revenuePerGuest, revenuePerSeat, type VenueEvening } from '../../sim/village';
import type { SimulationState } from '../types';
import { NxButton, NxScreen } from '../ui/system/components';

export function eveningVillage(sim: SimulationState): VenueEvening[] | null {
  const rec = (sim.economy?.weekEvenings ?? []).find((e) => e.dayNumber === sim.day.dayNumber);
  return rec?.village && rec.village.length > 1 ? rec.village : null;
}

export function rankedVillage(rows: VenueEvening[]): VenueEvening[] {
  return rows.filter((r) => r.open || r.id === PLAYER_VENUE).slice().sort((a, b) => b.guests - a.guests || b.revenueSek - a.revenueSek);
}

export function CompareScreen({ sim, onContinue }: { sim: SimulationState; onContinue: () => void }) {
  const t = strings.village.compare;
  const lang = useLanguage();
  const locale = lang === 'sv' ? 'sv-SE' : 'en-GB';
  const rows = rankedVillage(eveningVillage(sim) ?? []);
  const kr = (v: number | null) => (v === null ? '–' : t.kr(Math.round(v).toLocaleString(locale)));
  const rank = rows.findIndex((r) => r.id === PLAYER_VENUE) + 1;
  return (
    <NxScreen testId="screen-J1" label={t.title} className="nx-compare-screen">
      <section className="nx-panel nx-compare">
        <header className="nx-compare-head">
          <div className="nx-label">{t.title}</div>
          <h1 className="nx-heading" style={{ margin: 0 }}>{t.lead}</h1>
          {rank > 0 && <div className="nx-compare-place" data-testid="compare-place">{t.place(rank, rows.length)}</div>}
        </header>
        <table className="nx-compare-table">
          <thead>
            <tr>
              <th scope="col">{t.venue}</th>
              <th scope="col">{t.guests}</th>
              <th scope="col">{t.perGuest}</th>
              <th scope="col">{t.perSeat}</th>
              <th scope="col">{t.stars}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} data-testid="compare-row" data-venue={r.id} className={r.id === PLAYER_VENUE ? 'is-player' : undefined}>
                <th scope="row">
                  {strings.village.venues[r.id] ?? r.id}
                  {r.spot && <span className="nx-compare-sub"> {strings.village.spots[r.spot]}</span>}
                </th>
                <td className="nx-num">
                  {r.guests}
                  {r.bus > 0 && <span className="nx-compare-sub"> · {t.bus(r.bus)}</span>}
                </td>
                <td className="nx-num">{kr(revenuePerGuest(r))}</td>
                <td className="nx-num">{r.seats > 0 ? kr(revenuePerSeat(r)) : <span className="nx-compare-sub">{t.noSeats}</span>}</td>
                <td><span className="nx-venue-stars" aria-label={strings.village.starsAria(r.stars)}>{[0, 1, 2, 3, 4].map((i) => <span key={i} className={i < r.stars ? 'on' : ''}>★</span>)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="nx-compare-foot">
          <NxButton testId="compare-continue" onClick={onContinue}>{t.next}</NxButton>
        </div>
      </section>
    </NxScreen>
  );
}
