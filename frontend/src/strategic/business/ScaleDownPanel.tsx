// ORDER 049 §5.3 + ORDER 050 §7 step 6 (2026-08-10) — scale-down panel.
//
// Vision Owner ordered the split under the UX pass (Addendum A §6.3
// "one thing per surface"): scale-down is a service decision, not an
// investment decision. Same period gate (morning) as InvestmentPanel
// but visually distinct — warmer border, its own top-right column so
// the eye reads two beats, not one crowded panel.
//
// Actions land through the reducer paths already built in ORDER 049
// §5.3 — SHORTEN_MENU, THIN_WINE_LIST, CLOSE_SERVICE. Each is a
// toggle: an active state means "restore" and re-dispatching un-scales.
// Quality drift down while active reads through quality.ts targets
// consuming state.scaleDown.

import { strings } from '../../content/strings';
import '../ui/screens/room.css';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';

export function ScaleDownPanel() {
  const sim = useSimState();
  const dispatch = useSimDispatch();

  if (sim.day.period !== 'morning') return null;

  const menuShortened = sim.scaleDown.menuShortenedFrom !== null;
  const wineReduced = sim.scaleDown.wineListReduced;
  const lunchClosed = sim.scaleDown.closedLunch;
  const dinnerClosed = sim.scaleDown.closedDinner;
  // ORDER 280 — texten i strängtabellen (svenska och engelska).
  const L = strings.legacy.scaleDown;

  return (
    <div className="nx nxr-panel">
      <div className="nx-label">{L.heading}</div>
      <div className="nx-small nx-muted nxr-body">
        {L.body}
      </div>

      <button
        type="button"
        className="nxs-list-row nxr-option" aria-pressed={menuShortened}
        onClick={() => dispatch({ type: 'SHORTEN_MENU' })}
        disabled={!menuShortened && sim.policies.ingredientTier === 'grund'}
      >
        <div>{menuShortened ? L.restoreMenu : L.shortenMenu}</div>
        <div className="nxs-row-sub">
          {menuShortened ? L.restoreMenuDesc : L.shortenMenuDesc}
        </div>
      </button>

      <button
        type="button"
        className="nxs-list-row nxr-option" aria-pressed={wineReduced}
        onClick={() => dispatch({ type: 'THIN_WINE_LIST' })}
      >
        <div>{wineReduced ? L.restoreWine : L.thinWine}</div>
        <div className="nxs-row-sub">
          {wineReduced ? L.restoreWineDesc : L.thinWineDesc}
        </div>
      </button>

      <button
        type="button"
        className="nxs-list-row nxr-option" aria-pressed={lunchClosed}
        onClick={() => dispatch({ type: 'CLOSE_SERVICE', service: 'lunch' })}
      >
        <div>{lunchClosed ? L.openLunch : L.closeLunch}</div>
        <div className="nxs-row-sub">
          {lunchClosed ? L.openLunchDesc : L.closeLunchDesc}
        </div>
      </button>

      <button
        type="button"
        className="nxs-list-row nxr-option" aria-pressed={dinnerClosed}
        onClick={() => dispatch({ type: 'CLOSE_SERVICE', service: 'dinner' })}
      >
        <div>{dinnerClosed ? L.openDinner : L.closeDinner}</div>
        <div className="nxs-row-sub">
          {dinnerClosed ? L.openDinnerDesc : L.closeDinnerDesc}
        </div>
      </button>
    </div>
  );
}
