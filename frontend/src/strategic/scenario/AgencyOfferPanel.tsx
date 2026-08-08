// ORDER 043 v3 §10 step 5 — the agency-staff offer panel.
//
// Appears mid-service when strain has been sustained above threshold
// for AGENCY_OFFER_SUSTAINED_SEC continuous seconds. The player can
// accept (money cost, agency joins for the service) or decline
// (social capital cost — the team registers that no help came).
//
// Positioned bottom-left, deliberately away from the wager panel
// (bottom-centre) and the event stream (right-side) so it competes
// with neither. Non-modal — the service keeps running while the
// offer stands; ignoring it into expiry counts as an implicit
// decline and pays the social cost anyway.
//
// No countdown bar (§9 — no numeric dominance). The offer's presence
// is the reading; if it disappears without being pressed, that's the
// service telling the player they didn't answer in time.

import { strings } from '../../content/strings.sv';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';

const OVERLAY_STYLE: React.CSSProperties = {
  position: 'absolute',
  bottom: 24,
  left: 24,
  maxWidth: 360,
  minWidth: 300,
  padding: '14px 18px 16px',
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
  zIndex: 40
};

const HEADING_STYLE: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  opacity: 0.72,
  marginBottom: 4
};

const BODY_STYLE: React.CSSProperties = {
  marginBottom: 12
};

const BUTTON_ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'center'
};

const ACCEPT_STYLE: React.CSSProperties = {
  flex: 1,
  padding: '9px 14px',
  background: '#3c2c1e',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 3,
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 0.3,
  cursor: 'pointer'
};

const DECLINE_STYLE: React.CSSProperties = {
  ...ACCEPT_STYLE,
  flex: '0 0 auto',
  background: '#2a1e14',
  fontWeight: 500,
  opacity: 0.85
};

export function AgencyOfferPanel() {
  const sim = useSimState();
  const dispatch = useSimDispatch();

  const offer = sim.agencyOffer;
  if (!offer) return null;

  return (
    <div style={OVERLAY_STYLE}>
      <div style={HEADING_STYLE}>{strings.agency.heading}</div>
      <div style={BODY_STYLE}>{strings.agency.body}</div>
      <div style={BUTTON_ROW_STYLE}>
        <button
          type="button"
          style={ACCEPT_STYLE}
          onClick={() => dispatch({ type: 'ACCEPT_AGENCY' })}
        >
          {strings.agency.accept} {offer.moneyCost} {strings.agency.kr}
        </button>
        <button
          type="button"
          style={DECLINE_STYLE}
          onClick={() => dispatch({ type: 'DECLINE_AGENCY' })}
        >
          {strings.agency.decline}
        </button>
      </div>
    </div>
  );
}
