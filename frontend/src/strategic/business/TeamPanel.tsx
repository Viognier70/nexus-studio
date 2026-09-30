// ORDER 043 v3 §10 step 5 — the morning team panel.
//
// Visible during the morning phase. Lists the current team (roles,
// daily cost, remaining contract days) and offers four hire buttons
// (one per role). This is the decision surface §11 point 1 asks
// for — the team decision has to feel like a decision, not a fixed
// starting condition.
//
// Layout: top-left corner, out of the way of the DayActionBar
// (bottom-centre) and the top-right chrome. Non-modal — sits open
// while the player deliberates, closes when morning ends.
//
// Firing pays out the remaining contract days as a lump-sum buyout;
// this is shown in the button label so the cost is legible before
// the click, not after.

import { strings } from '../../content/strings';
import '../ui/screens/room.css';
import type { StaffRole } from '../types';
import { ROLE_DEFAULTS } from '../simulation/team';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';

const HIRE_ROLES: readonly StaffRole[] = ['värd', 'servitör', 'kock', 'lärling'];

export function TeamPanel() {
  const sim = useSimState();
  const dispatch = useSimDispatch();

  // Morning-only. Show throughout the whole morning so the player
  // can hire before opening lunch or after skipping it (skip goes to
  // afternoon, so this closes then).
  if (sim.day.period !== 'morning') return null;

  const today = sim.day.dayNumber;

  return (
    <div className="nx nxr-panel">
      <div className="nx-label">{strings.team.heading}</div>
      <div className="nx-small nx-muted nxr-body">{strings.team.body}</div>
      {sim.team.members.map((m) => {
        const remainingDays = Math.max(0, m.contractEndsDay - today);
        const buyout = remainingDays * m.dailyCost;
        const label = strings.team.roleLabel[m.role];
        return (
          <div key={m.id} className="nxr-row">
            <div style={{ flex: 1 }}>
              <div>
                <strong>{label}</strong>
                {m.isAgency ? strings.team.agencyTag : ''}
              </div>
              <div className="nxs-row-sub">
                {m.dailyCost} {strings.team.dailyCostLabel} · {strings.team.contractLabel}{' '}
                {m.contractEndsDay}
              </div>
            </div>
            {m.isAgency ? null : (
              <button
                type="button"
                className="nxr-fire"
                onClick={() =>
                  dispatch({ type: 'FIRE_TEAM_MEMBER', memberId: m.id })
                }
                title={
                  buyout > 0
                    ? `${strings.team.buyoutLabel} ${buyout} ${strings.team.kr}`
                    : ''
                }
              >
                {strings.team.fireButton}
                {buyout > 0
                  ? ` (${buyout} ${strings.team.kr})`
                  : ''}
              </button>
            )}
          </div>
        );
      })}

      <div className="nx-label nxr-group">{strings.team.hireHeading}</div>
      {HIRE_ROLES.map((role) => {
        const defaults = ROLE_DEFAULTS[role];
        return (
          <button
            key={role}
            type="button"
            className="nxs-list-row nxr-option"
            onClick={() => dispatch({ type: 'HIRE_TEAM_MEMBER', role })}
          >
            <div>
              {strings.team.roleLabel[role]} — {defaults.dailyCost}{' '}
              {strings.team.dailyCostLabel}
            </div>
            <div className="nxs-row-sub">{strings.team.roleDescription[role]}</div>
          </button>
        );
      })}
    </div>
  );
}
