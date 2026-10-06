// ORDER 288 — byns aviseringar (Vision Owner 2026-10-01): "En buss med 30
// turister anländer 20.15. De väljer krog efter rykte." Aviseringen syns på
// alla nivåer, en stund (VILLAGE.noticeSimSeconds), och säger sedan vart
// turisterna gick. När dörrarna öppnar säger den var vagnarna står i kväll.

import { strings } from '../../content/strings';
import { VILLAGE } from '../../sim/balance';
import { formatClock } from '../../sim/clock';
import { PLAYER_VENUE, venuesTonight } from '../../sim/village';
import { useSimState } from '../simulation/SimulationProvider';
import { SenderTag } from './SenderTag';

export function VillageNotice() {
  const sim = useSimState();
  if (sim.day.period !== 'dinner') return null;
  const n = sim.day.villageNotice;
  let text: string | null = null;
  let kind = '';
  if (n && sim.simTime - n.at < VILLAGE.noticeSimSeconds) {
    kind = n.kind;
    if (n.kind === 'busAnnounce') text = strings.village.notice.busAnnounce(n.tourists, formatClock(n.arriveMinute));
    else if (n.venueId === PLAYER_VENUE) text = strings.village.notice.busChoseYou(n.tourists);
    else text = strings.village.notice.busChose(n.tourists, strings.village.venues[n.venueId ?? ''] ?? '');
  } else if (sim.day.doorsOpenAt !== null && sim.simTime >= sim.day.doorsOpenAt && sim.simTime - sim.day.doorsOpenAt < VILLAGE.noticeSimSeconds) {
    const trucks = venuesTonight(sim).filter((v) => v.kind === 'truck' && v.open && v.spot);
    if (trucks.length > 0) {
      kind = 'trucks';
      text = strings.village.notice.trucks(trucks.map((v) => `${strings.village.venues[v.id]} ${strings.village.spots[v.spot!]}`).join(', '));
    }
  }
  if (!text) return null;
  return (
    <div className="nx nx-village-notice" role="status" data-testid="village-notice" data-kind={kind}>
      <SenderTag sender="byn" /> {text}
    </div>
  );
}
