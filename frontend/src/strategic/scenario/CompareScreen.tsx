// ORDER 288 — jämförelsen efter kvällen (Vision Owner 2026-10-01): "gäster,
// intäkt per gäst och per stol, mot rivalerna." Speldesign > Ekonomin > Byn:
// "Efter kvällen jämförs spelarens gäster och intäkt per stol med de andra
// krogarnas."
//
// ORDER 296 — Designs skärm 5 (leveransen hovmästaren och butiken §5): tre
// kolumner (gäster, per gäst, per stol) med en stapel under talet, raderna i
// bandets ordning (gäster), vår rad tonad i guld och märkt Vi, vagnarna
// märkta Vagn och utan stolar. Knappen går till butiken.
//
// Raderna läses ur kvällens rad i veckans lista (sim/economy.ts
// EveningRecord.village, räknad i sim/village.ts villageEvening när servicen
// stängde): spelarens rad är rummets utfall, rivalernas byns.

import { strings } from '../../content/strings';
import { t as tt } from '../../content/nexusStrings';
import { useLanguage } from '../../content/language';
import { PLAYER_VENUE, revenuePerGuest, revenuePerSeat, type VenueEvening } from '../../sim/village';
import { VILLAGE } from '../../sim/balance';
import type { SimulationState } from '../types';
import { NxButton, NxScreen } from '../ui/system/components';
import { useBusiness } from '../business/BusinessContext';
import '../ui/host/host.css';

export function eveningVillage(sim: SimulationState): VenueEvening[] | null {
  const rec = (sim.economy?.weekEvenings ?? []).find((e) => e.dayNumber === sim.day.dayNumber);
  return rec?.village && rec.village.length > 1 ? rec.village : null;
}

export function rankedVillage(rows: VenueEvening[]): VenueEvening[] {
  return rows.filter((r) => r.open || r.id === PLAYER_VENUE).slice().sort((a, b) => b.guests - a.guests || b.revenueSek - a.revenueSek);
}

const isTruck = (id: string) => VILLAGE.rivals.find((r) => r.id === id)?.kind === 'truck';

export function CompareScreen({ sim, onContinue }: { sim: SimulationState; onContinue: () => void }) {
  const lang = useLanguage();
  const { business } = useBusiness();
  const locale = lang === 'sv' ? 'sv-SE' : 'en-GB';
  const rows = rankedVillage(eveningVillage(sim) ?? []);
  const kr = (v: number) => strings.village.compare.kr(Math.round(v).toLocaleString(locale));
  const rank = rows.findIndex((r) => r.id === PLAYER_VENUE) + 1;
  const maxGuests = Math.max(1, ...rows.map((r) => r.guests));
  const maxPerGuest = Math.max(1, ...rows.map((r) => revenuePerGuest(r) ?? 0));
  const maxPerSeat = Math.max(1, ...rows.map((r) => revenuePerSeat(r) ?? 0));
  const name = (id: string) => (id === PLAYER_VENUE ? business.name ?? strings.village.venues[id] ?? id : strings.village.venues[id] ?? id);
  const bar = (share: number, ours: boolean) => <span className="nx-cmp-bar" data-ours={ours}><span style={{ width: `${Math.max(0, Math.min(1, share)) * 100}%` }} /></span>;
  return (
    <NxScreen testId="screen-J1" label={tt(lang, 'cmp.title')} className="nx-compare-screen">
      <section className="nx-panel nx-paper nx-cmp">
        <header className="nx-cmp-head">
          <div>
            <div className="nx-label">{tt(lang, 'cmp.kicker')}</div>
            <h1 className="nx-heading" style={{ margin: 0 }}>{tt(lang, 'cmp.title')}</h1>
          </div>
          <p className="nx-small" style={{ margin: 0 }}>{tt(lang, 'cmp.note')}</p>
          {rank > 0 && <span className="nx-cmp-place" data-testid="compare-place" data-rank={rank}>{strings.village.compare.place(rank, rows.length)}</span>}
        </header>
        <table className="nx-cmp-table">
          <thead>
            <tr>
              <th scope="col"><span className="nx-visually-hidden">{strings.village.compare.venue}</span></th>
              <th scope="col">{tt(lang, 'cmp.guests')}</th>
              <th scope="col">{tt(lang, 'cmp.perGuest')}</th>
              <th scope="col">{tt(lang, 'cmp.perSeat')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const ours = r.id === PLAYER_VENUE;
              const truck = isTruck(r.id);
              const perGuest = revenuePerGuest(r);
              const perSeat = revenuePerSeat(r);
              return (
                <tr key={r.id} data-testid="compare-row" data-venue={r.id} data-guests={r.guests} className={ours ? 'is-player' : undefined}>
                  <th scope="row">
                    <span className="nx-cmp-dot" data-kind={ours ? 'ours' : truck ? 'truck' : 'venue'} />
                    {name(r.id)}
                    {ours && <span className="nx-cmp-tag">{tt(lang, 'rival.us')}</span>}
                    {truck && <span className="nx-cmp-tag">{tt(lang, 'cmp.van')}</span>}
                  </th>
                  <td><span className="nx-num">{r.guests}</span>{bar(r.guests / maxGuests, ours)}</td>
                  <td><span className="nx-num">{perGuest === null ? '–' : kr(perGuest)}</span>{bar((perGuest ?? 0) / maxPerGuest, ours)}</td>
                  <td>
                    {perSeat === null || truck ? <span className="nx-cmp-noseats">{tt(lang, 'cmp.noSeats')}</span> : <span className="nx-num">{kr(perSeat)}</span>}
                    {bar(truck ? 0 : (perSeat ?? 0) / maxPerSeat, ours)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="nx-cmp-foot">
          <NxButton testId="compare-continue" onClick={onContinue}>{tt(lang, 'cmp.next')}</NxButton>
        </div>
      </section>
    </NxScreen>
  );
}
