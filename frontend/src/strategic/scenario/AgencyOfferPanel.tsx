// ORDER 043 v3 §10 step 5 — the agency-staff offer panel.
//
// Appears mid-service when strain has been sustained above threshold
// for AGENCY_OFFER_SUSTAINED_SEC continuous seconds. The player can
// accept (money cost, agency joins for the service) or decline
// (social capital cost — the team registers that no help came).
//
// Positioned bottom-left above the service tabs (ORDER 292), deliberately away from the wager panel
// (bottom-centre) and the event stream (right-side) so it competes
// with neither. Non-modal — the service keeps running while the
// offer stands; ignoring it into expiry counts as an implicit
// decline and pays the social cost anyway.
//
// No countdown bar (§9 — no numeric dominance). The offer's presence
// is the reading; if it disappears without being pressed, that's the
// service telling the player they didn't answer in time.

import { strings } from '../../content/strings';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';
import '../ui/service/service.css';

export function AgencyOfferPanel() {
  const sim = useSimState();
  const dispatch = useSimDispatch();

  const offer = sim.agencyOffer;
  if (!offer) return null;

  return (
    // ORDER 292 — den varma formen, ovanför flikarna nere till vänster (låg
    // förut över flikarna Lagret, Kvällen och Rummet).
    <div className="nx nx-panel nx-agency" data-testid="agency-offer">
      <div className="nx-label">{strings.agency.heading}</div>
      <div className="nx-small nxr-body">{strings.agency.body}</div>
      <div className="nx-agency-buttons">
        <button
          type="button"
          className="nx-queue-btn nx-agency-accept"
          onClick={() => dispatch({ type: 'ACCEPT_AGENCY' })}
        >
          {strings.agency.accept} {offer.moneyCost} {strings.agency.kr}
        </button>
        <button
          type="button"
          className="nx-queue-btn"
          onClick={() => dispatch({ type: 'DECLINE_AGENCY' })}
        >
          {strings.agency.decline}
        </button>
      </div>
    </div>
  );
}
