// ORDER 075 (M2) — morning activity picker panel.
// ORDER 271 — formen efter Designs S1 (paket 1): satsningarna som en
// lista i morgonens schema (scenario/DayActionBar.tsx), namn och en rad
// om vad satsningen gör. Inga siffertavlor (LEVERANSNOT §3): effekterna
// står kvar i ACTIVITY_CATALOGUE och verkar som förut, men visas inte
// som tal.
//
// Click to pick/unpick; cap enforced by reducer. Visible only during
// morning; hidden during service and later periods.

import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';
import {
  ACTIVITY_CATALOGUE,
  scheduleSlotsFor,
  WEEKLY_GATE_DAYS
} from '../simulation/activities';
import { strings } from '../../content/strings';
import { scheduleSlotsUsed } from '../knowledge/pavilionVisit';
import type { Activity } from '../simulation/activities';
import { NxIcon, ACTIVITY_ICON } from '../ui/screens/icons';
import '../ui/screens/screens.css';

export function MorningActivityPanel() {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  if (sim.day.period !== 'morning') return null;

  // ORDER 263/264 — schemaplatserna kommer från kalendern (2, söndag 4)
  // och delas med paviljongsbesöken.
  const slots = scheduleSlotsFor(sim.day.dayNumber);
  const used = scheduleSlotsUsed(sim);
  const atCap = used >= slots;

  const isWeeklyGated = (a: Activity): boolean => {
    if (a.availability !== 'weekly') return false;
    const cutoff = sim.day.dayNumber - WEEKLY_GATE_DAYS;
    return sim.activityHistory.some((h) => h.id === a.id && h.pickedOnDay > cutoff);
  };

  return (
    <div className="nx" aria-label={strings.panels.activityEffects.panelAria} data-testid="morning-activities">
      {ACTIVITY_CATALOGUE.map((a) => {
        const picked = sim.day.pickedActivityIds.includes(a.id);
        const gated = isWeeklyGated(a);
        const disabled = !picked && (atCap || gated);
        return (
          <button
            key={a.id}
            type="button"
            className="nxs-list-row"
            aria-pressed={picked}
            aria-disabled={disabled}
            data-testid={`activity-${a.id}`}
            onClick={() => {
              if (disabled) return;
              if (picked) dispatch({ type: 'UNPICK_ACTIVITY', id: a.id });
              else dispatch({ type: 'PICK_ACTIVITY', id: a.id });
            }}
          >
            <NxIcon name={ACTIVITY_ICON[a.id] ?? 'users'} size={32} />
            <span style={{ flex: 1 }}>
              <span className="nxs-row-title" style={{ display: 'block' }}>{a.name}</span>
              <span className="nxs-row-sub" style={{ display: 'block' }}>
                {a.description}
                {a.availability === 'weekly' && <> · {strings.morning.weekly}</>}
              </span>
            </span>
            {picked && <span className="nx-label nx-accent-text nxs-tag">{strings.screens.morning.picked}</span>}
          </button>
        );
      })}
    </div>
  );
}
