// ORDER 043 v3 §10 step 5 — the morning team panel.
//
// Visible during the morning phase. Lists the current team (roles,
// daily cost, remaining contract days) and offers four hire buttons
// (one per role). This is the decision surface §11 point 1 asks
// for — the team decision has to feel like a decision, not a fixed
// starting condition.
//
// Layout: top-left corner, out of the way of the ServiceLengthPicker
// (bottom-centre) and the top-right chrome. Non-modal — sits open
// while the player deliberates, closes when morning ends.
//
// Firing pays out the remaining contract days as a lump-sum buyout;
// this is shown in the button label so the cost is legible before
// the click, not after.

import { strings } from '../../content/strings.sv';
import type { StaffRole } from '../types';
import { ROLE_DEFAULTS } from '../simulation/team';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';

const HIRE_ROLES: readonly StaffRole[] = ['värd', 'servitör', 'kock', 'lärling'];

// ORDER 090 §6 — anchor + top offset dropped; the parent PanelColumn
// (see ui/PanelColumn.tsx) owns positioning + max-height + overflow.
const PANEL_STYLE: React.CSSProperties = {
  width: 320,
  padding: '14px 16px 16px',
  background: 'rgba(30, 22, 16, 0.86)',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 5,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  lineHeight: 1.4,
  letterSpacing: 0.2,
  boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
  pointerEvents: 'auto',
  zIndex: 35
};

const HEADING_STYLE: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  opacity: 0.72,
  marginBottom: 4
};

const BODY_STYLE: React.CSSProperties = {
  marginBottom: 10,
  opacity: 0.9
};

const MEMBER_ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: 8,
  padding: '6px 0',
  borderTop: '1px solid rgba(168, 146, 106, 0.35)'
};

const MEMBER_META_STYLE: React.CSSProperties = {
  fontSize: 11,
  opacity: 0.7,
  marginTop: 2
};

const FIRE_BUTTON_STYLE: React.CSSProperties = {
  padding: '5px 8px',
  background: '#2a1e14',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 3,
  fontFamily: 'inherit',
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: 0.3,
  cursor: 'pointer',
  whiteSpace: 'nowrap'
};

const HIRE_HEADING_STYLE: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  opacity: 0.72,
  marginTop: 12,
  marginBottom: 6
};

const HIRE_BUTTON_STYLE: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '8px 10px',
  marginBottom: 6,
  background: '#3c2c1e',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 3,
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0.3,
  cursor: 'pointer'
};

const HIRE_DESC_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 400,
  opacity: 0.75,
  marginTop: 2
};

export function TeamPanel() {
  const sim = useSimState();
  const dispatch = useSimDispatch();

  // Morning-only. Show throughout the whole morning so the player
  // can hire before opening lunch or after skipping it (skip goes to
  // afternoon, so this closes then).
  if (sim.day.period !== 'morning') return null;

  const today = sim.day.dayNumber;

  return (
    <div style={PANEL_STYLE}>
      <div style={HEADING_STYLE}>{strings.team.heading}</div>
      <div style={BODY_STYLE}>{strings.team.body}</div>
      {sim.team.members.map((m) => {
        const remainingDays = Math.max(0, m.contractEndsDay - today);
        const buyout = remainingDays * m.dailyCost;
        const label = strings.team.roleLabel[m.role];
        return (
          <div key={m.id} style={MEMBER_ROW_STYLE}>
            <div style={{ flex: 1 }}>
              <div>
                <strong>{label}</strong>
                {m.isAgency ? ' (hyr)' : ''}
              </div>
              <div style={MEMBER_META_STYLE}>
                {m.dailyCost} {strings.team.dailyCostLabel} · {strings.team.contractLabel}{' '}
                {m.contractEndsDay}
              </div>
            </div>
            {m.isAgency ? null : (
              <button
                type="button"
                style={FIRE_BUTTON_STYLE}
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

      <div style={HIRE_HEADING_STYLE}>{strings.team.hireHeading}</div>
      {HIRE_ROLES.map((role) => {
        const defaults = ROLE_DEFAULTS[role];
        return (
          <button
            key={role}
            type="button"
            style={HIRE_BUTTON_STYLE}
            onClick={() => dispatch({ type: 'HIRE_TEAM_MEMBER', role })}
          >
            <div>
              {strings.team.roleLabel[role]} — {defaults.dailyCost}{' '}
              {strings.team.dailyCostLabel}
            </div>
            <div style={HIRE_DESC_STYLE}>{strings.team.roleDescription[role]}</div>
          </button>
        );
      })}
    </div>
  );
}
