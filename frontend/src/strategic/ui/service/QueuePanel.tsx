// ORDER 292 — kön vid dörren under servicen (Vision Owner 2026-10-01:
// "en kö bildas vid dörren med tålamod som sjunker, och spelaren väljer vem
// som får bord först"). Sällskapen i kön (gäster i 'waiting'),
// i ankomstordning: storlek, vem de är (vågen eller gästtypen), väntan och
// tålamod. Tålamodet är väntan mot queuePatienceSeconds (sim/knowledgeInService.ts),
// samma gräns som service.ts låter gästen ge upp vid; otålig efter
// serviceFlow.ts IMPATIENT_AFTER. "Bord först" sätter day.queuePriority.
// Den senaste vågens avisering står överst en stund.

import { strings } from '../../../content/strings';
import { queuePatienceSeconds } from '../../../sim/knowledgeInService';
import { RUSH } from '../../../sim/balance';
import { useSimDispatch, useSimState } from '../../simulation/SimulationProvider';
import { queueKey } from '../../simulation/service';
import { waveLabel } from '../../simulation/rush';
import { IMPATIENT_AFTER } from '../../scene/serviceFlow';
import type { Guest } from '../../types';

// Aviseringen om vågen står så länge sällskapen är på väg och en stund till.
const NOTICE_SIM_SECONDS = RUSH.spreadSimSeconds * 2;

interface QueueParty { key: string; guests: Guest[]; since: number; who: string; arriving: boolean }

export function QueuePanel() {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  if (sim.day.period !== 'dinner') return null;
  const now = sim.simTime;
  // Bara de som står i kön (service.ts waiting); de som är på väg till dörren visas inte.
  const inQueue = sim.guests.filter((g) => g.state === 'waiting');
  const parties: QueueParty[] = [];
  for (const g of inQueue) {
    const key = queueKey(g);
    let p = parties.find((x) => x.key === key);
    if (!p) {
      const who = g.waveId ? waveLabel(g.waveId) : g.guestType ? (strings.guestTypes.label as Record<string, string>)[g.guestType] ?? '' : strings.rush.walkIn;
      p = { key, guests: [], since: g.stateTime, who, arriving: true };
      parties.push(p);
    }
    p.guests.push(g);
    if (g.state === 'waiting') { p.arriving = false; p.since = Math.min(p.since, g.stateTime); }
  }
  const notice = sim.day.waveNotice && now - sim.day.waveNotice.at <= NOTICE_SIM_SECONDS ? sim.day.waveNotice : null;
  if (parties.length === 0 && !notice) return null;
  const patience = queuePatienceSeconds(sim);
  const chosen = sim.day.queuePriority ?? null;
  const t = strings.rush;
  return (
    <section className="nx nx-panel nx-queue" data-testid="queue-panel" aria-label={t.queueTitle}>
      {notice && (
        <div className="nx-queue-notice" data-testid="wave-notice" data-wave={notice.waveId} role="status">
          {t.notice(waveLabel(notice.waveId), notice.guests, notice.parties)}
        </div>
      )}
      <header className="nx-queue-head">
        <span className="nx-label">{t.queueTitle}</span>
        <span className="nx-small nx-muted">{t.queueHint}</span>
      </header>
      <ol className="nx-queue-list">
        {parties.map((p) => {
          const waited = p.arriving ? 0 : Math.max(0, now - p.since);
          const left = Math.max(0, 1 - waited / Math.max(1, patience));
          const impatient = waited > IMPATIENT_AFTER;
          const isChosen = chosen === p.key;
          return (
            <li key={p.key} className="nx-queue-row" data-testid="queue-party" data-key={p.key} data-size={p.guests.length} data-impatient={impatient} data-chosen={isChosen}>
              <span className="nx-queue-who">
                <strong>{t.party(p.guests.length, p.who)}</strong>
                <span className="nx-small nx-muted">{t.waited(Math.round(waited))}{impatient ? ` · ${t.impatient}` : ''}</span>
                <span className="nx-queue-patience" role="meter" aria-label={t.patienceAria(Math.round(left * 100))} aria-valuenow={Math.round(left * 100)} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${left * 100}%` }} data-low={left < 0.35} />
                </span>
              </span>
              <button type="button" className="nx-queue-btn" data-testid={`seat-first-${p.key}`} aria-pressed={isChosen}
                onClick={() => dispatch({ type: 'SEAT_FIRST', key: isChosen ? null : p.key })}>
                {isChosen ? t.chosen : t.seatFirst}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
