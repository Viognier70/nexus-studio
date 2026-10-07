// ORDER 313 §9 — panelen "Byn just nu" under bandet Byn i kväll: krogarna
// med antal gäster nu, pilen för takten och spelarens krog markerad, och en
// rad som sammanfattar läget. Reglerna i sim/villageNow.ts; gästerna ur
// sim/villageLive.ts, samma som bandet. Formen kommer från Design (D6).

import { useRef } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { strings } from '../../../content/strings';
import { clockMinutes } from '../../../sim/clock';
import { villageLive, type VenueLive } from '../../../sim/villageLive';
import { villageNow, villageNowSummary } from '../../../sim/villageNow';
import { useSimState } from '../../simulation/SimulationProvider';
import './host.css';

const VILLAGE_NOW_ROWS = 3;

export function VillageNowPanel() {
  const sim = useSimState();
  const rows = villageLive(sim);
  const minute = Math.floor(clockMinutes(sim));
  // Historiken per spelminut under kvällen (en ny kväll börjar om).
  const hist = useRef<{ day: number; byMinute: Map<number, VenueLive[]> }>({ day: -1, byMinute: new Map() });
  if (hist.current.day !== sim.day.dayNumber) hist.current = { day: sim.day.dayNumber, byMinute: new Map() };
  if (!hist.current.byMinute.has(minute)) hist.current.byMinute.set(minute, rows);
  const now = villageNow(rows, (ago) => hist.current.byMinute.get(minute - ago) ?? null);
  // Kompakt: de VILLAGE_NOW_ROWS främsta, och spelarens krog om den inte är bland dem.
  const shown = now.filter((r, i) => i < VILLAGE_NOW_ROWS || r.player);
  const sum = villageNowSummary(now);
  const v = strings.villageNow;
  const name = (id: string) => strings.village.venues[id] ?? id;
  const line = sum.leader === null
    ? v.quiet
    : sum.playerLeads
      ? v.youLead
      : `${v.leads(name(sum.leader))} ${sum.playerRank === null ? v.youWait : v.youAre(sum.playerRank)}`;
  return (
    <section className="nx-village-now" aria-label={v.title} data-testid="village-now">
      <div className="nx-label">{v.title}</div>
      <ol className="nx-village-now-list">
        {shown.map((r) => (
          <li key={r.id} data-player={r.player} data-testid={`village-now-${r.id}`} data-guests={r.guests} data-trend={r.trend ?? ''}>
            <span className="nx-village-now-name">{r.player ? `${name(r.id)} · ${v.you}` : name(r.id)}</span>
            <span className="nx-village-now-guests">{v.guests(r.guests)}</span>
            <span className="nx-village-now-trend" aria-label={r.trend === 'up' ? v.up : r.trend === 'down' ? v.down : undefined}>
              {r.trend === 'up' ? <ArrowUp size={14} aria-hidden /> : r.trend === 'down' ? <ArrowDown size={14} aria-hidden /> : null}
            </span>
          </li>
        ))}
      </ol>
      <p className="nx-small nx-village-now-line" data-testid="village-now-line">{line}</p>
    </section>
  );
}
