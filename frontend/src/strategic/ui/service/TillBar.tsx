// ORDER 290 — kvällskassan i serviceläget (Designs leverans serviceläget
// 2026-09-30 §2): en stapel bredvid klockan som fylls när en nota betalas.
// Linjen är kvällens insats och står på 1 / 1,3 av stapelns längd. Under
// linjen är fyllningen ljuslåga och texten säger hur mycket som är kvar; över
// linjen blir fyllningen guld med glöd, och ljudet för kassan spelas en gång.
// Ett tryck på kassan fäller ut insatsen på papper. När dörrarna öppnas fälls
// den ut en stund av sig själv (Vision Owner: "När dörrarna öppnas visas
// kvällens insats").
//
// Talen: kvällskassan ur eveningEconomy.ts tillSek, insatsen ur day.stake.

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { t as tt } from '../../../content/nexusStrings';
import { strings } from '../../../content/strings';
import { useLanguage } from '../../../content/language';
import { EVENING_ECONOMY } from '../../../sim/balance';
import { useSimState } from '../../simulation/SimulationProvider';
import { tillSek } from '../../simulation/eveningEconomy';
import { formatSek, useCountedNumber } from '../CashCounter';
import { play } from '../sound/sound';

// Linjen står på 1 / 1,3 av stapeln (Designs §2).
const OVERSHOOT = 1.3;
const TICKS = { up: 8, down: 9 };

export function TillBar() {
  const sim = useSimState();
  const lang = useLanguage();
  const inService = sim.day.period === 'lunch' || sim.day.period === 'dinner';
  const till = tillSek(sim);
  const stake = sim.day.stake?.total ?? 0;
  const over = stake > 0 && till >= stake;
  const counted = useCountedNumber('cash', till, formatSek, TICKS);
  const shownKey = `${sim.day.dayNumber}:${sim.day.stakeShownAt ?? ''}`;
  const [open, setOpen] = useState(false);
  const autoKey = useRef<string | null>(null);
  useEffect(() => {
    if (!sim.day.stake || autoKey.current === shownKey) return;
    autoKey.current = shownKey;
    setOpen(true);
    const timer = window.setTimeout(() => setOpen(false), EVENING_ECONOMY.stakeCardSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [shownKey, sim.day.stake]);
  // Över linjen: ljudet en gång per kväll.
  const passedKey = useRef<string | null>(null);
  useEffect(() => {
    const k = `${sim.day.dayNumber}`;
    if (over && passedKey.current !== k) { passedKey.current = k; play('passed'); }
  }, [over, sim.day.dayNumber]);
  if (!inService) return null;
  const fill = stake > 0 ? Math.min(1, till / (stake * OVERSHOOT)) : 0;
  const line = 1 / OVERSHOOT;
  const status = stake <= 0 ? '' : over ? tt(lang, 'serviceMode.over', { n: formatSek(till - stake) }) : tt(lang, 'serviceMode.toGo', { n: formatSek(stake - till) });
  const Chevron = open ? ChevronUp : ChevronDown;
  const s = sim.day.stake;
  const sub = (k: string): string => {
    switch (k) {
      case 'ingredients': return tt(lang, 'cost.food.sub');
      case 'staff': return tt(lang, 'cost.staff.sub', { n: sim.team.members.filter((m) => !m.isAgency).length });
      case 'dj': return tt(lang, 'cost.dj.sub');
      case 'competence': return tt(lang, 'cost.skills.sub');
      default: return '';
    }
  };
  const name = (k: string): string => {
    switch (k) {
      case 'ingredients': return tt(lang, 'cost.food');
      case 'staff': return tt(lang, 'cost.staff');
      case 'dj': return tt(lang, 'cost.dj');
      case 'competence': return tt(lang, 'cost.skills');
      default: return strings.stake.lines.investments;
    }
  };
  return (
    <div className="nx nx-till-wrap">
      <button
        type="button"
        ref={counted.boxRef as unknown as React.Ref<HTMLButtonElement>}
        className="nx-panel nx-till-box"
        data-testid="till"
        data-value={Math.round(till)}
        data-stake={stake}
        data-over={over}
        aria-expanded={open}
        aria-label={strings.cashCounter.tillAria(formatSek(till), formatSek(stake))}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="nx-till-top">
          <span className="nx-label">{tt(lang, 'serviceMode.till')}</span>
          <span ref={counted.numRef} className="nx-num nx-till-amount" data-testid="till-amount" />
          <span className="nx-till-status" data-testid="till-status">{status}<Chevron size={16} aria-hidden /></span>
        </span>
        <span className="nx-till-bar" data-testid="till-bar" data-over={over}>
          <span className="nx-till-fill" style={{ width: `${fill * 100}%` }} />
          {stake > 0 && <span className="nx-till-line" style={{ left: `${line * 100}%` }} />}
          {stake > 0 && <span className="nx-till-caption" style={{ left: `${line * 100}%` }}>{tt(lang, 'serviceMode.stake', { n: formatSek(stake) })}</span>}
        </span>
      </button>
      {open && s && (
        <div className="nx-paper nx-stake-paper" data-testid="stake-card" role="status">
          <div className="nx-label">{tt(lang, 'serviceMode.stake.title')}</div>
          <ul className="nx-stake-lines">
            {s.lines.map((l) => (
              <li key={l.key} data-testid={`stake-${l.key}`} data-value={l.sek}>
                <span><strong>{name(l.key)}</strong>{sub(l.key) && <span className="nx-small">{sub(l.key)}</span>}</span>
                <span className="nx-num">{formatSek(l.sek)}</span>
              </li>
            ))}
          </ul>
          <div className="nx-stake-total"><span>{tt(lang, 'serviceMode.stake.total')}</span><span className="nx-num" data-testid="stake-total" data-value={s.total}>{formatSek(s.total)}</span></div>
          <p className="nx-small" style={{ margin: 0 }}>{tt(lang, 'serviceMode.stake.note')}</p>
        </div>
      )}
    </div>
  );
}
