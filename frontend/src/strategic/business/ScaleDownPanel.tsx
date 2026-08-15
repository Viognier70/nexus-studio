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

import type { CSSProperties } from 'react';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';

// ORDER 090 §6 — the "grow-forward on the left, retreat on the right"
// pairing with InvestmentPanel is preserved by putting both panels
// inside a PanelRow within the LEFT PanelColumn. Previously this
// panel picked top:500, left:352 by hand — the same offset
// InvestmentPanel picked — so any TeamPanel growth pushed
// InvestmentPanel down but left this one behind, breaking the pair.
// The row wrapper now shifts both together.
const PANEL_STYLE: CSSProperties = {
  width: 300,
  padding: '14px 16px 16px',
  background: 'rgba(30, 22, 16, 0.82)',
  color: '#f5f0e0',
  // Warmer border tint than InvestmentPanel's #a8926a so the two
  // morning surfaces read as different beats without extra text.
  border: '1px solid #b07850',
  borderRadius: 5,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  lineHeight: 1.4,
  letterSpacing: 0.2,
  boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
  pointerEvents: 'auto',
  zIndex: 35
};

const HEADING_STYLE: CSSProperties = {
  fontSize: 11,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  opacity: 0.72,
  marginBottom: 4
};

const BODY_STYLE: CSSProperties = {
  fontSize: 12,
  marginBottom: 10,
  opacity: 0.85
};

const OPTION_BUTTON_STYLE: CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '7px 10px',
  marginBottom: 4,
  background: '#2a1e14',
  color: '#f5f0e0',
  // Match the panel border tint so buttons feel like part of this
  // panel, not the investment one.
  border: '1px solid #7a5238',
  borderRadius: 3,
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: 0.3,
  cursor: 'pointer'
};

const OPTION_BUTTON_ACTIVE_STYLE: CSSProperties = {
  ...OPTION_BUTTON_STYLE,
  background: '#5a3a26',
  border: '1px solid #d49678',
  fontWeight: 700
};

const OPTION_DESC_STYLE: CSSProperties = {
  fontSize: 11,
  fontWeight: 400,
  opacity: 0.8,
  marginTop: 2
};

export function ScaleDownPanel() {
  const sim = useSimState();
  const dispatch = useSimDispatch();

  if (sim.day.period !== 'morning') return null;

  const menuShortened = sim.scaleDown.menuShortenedFrom !== null;
  const wineReduced = sim.scaleDown.wineListReduced;
  const lunchClosed = sim.scaleDown.closedLunch;
  const dinnerClosed = sim.scaleDown.closedDinner;

  return (
    <div style={PANEL_STYLE}>
      <div style={HEADING_STYLE}>Skala ner</div>
      <div style={BODY_STYLE}>
        Aktiv reträtt när passet blöder. Reversibelt — återöppnas när kassan tål det.
      </div>

      <button
        type="button"
        style={menuShortened ? OPTION_BUTTON_ACTIVE_STYLE : OPTION_BUTTON_STYLE}
        onClick={() => dispatch({ type: 'SHORTEN_MENU' })}
        disabled={!menuShortened && sim.policies.ingredientTier === 'grund'}
      >
        <div>{menuShortened ? 'Återställ menyn' : 'Korta menyn'}</div>
        <div style={OPTION_DESC_STYLE}>
          {menuShortened
            ? 'Höj tillbaka råvarunivån till där den var.'
            : 'Sänk råvarunivån ett steg. Sparar per gäst, dämpar mat-kvaliteten över tid.'}
        </div>
      </button>

      <button
        type="button"
        style={wineReduced ? OPTION_BUTTON_ACTIVE_STYLE : OPTION_BUTTON_STYLE}
        onClick={() => dispatch({ type: 'THIN_WINE_LIST' })}
      >
        <div>{wineReduced ? 'Återställ vinlistan' : 'Tunna vinlistan'}</div>
        <div style={OPTION_DESC_STYLE}>
          {wineReduced
            ? 'Öppna listan igen. Kvalitetsläsningen börjar återhämta sig.'
            : 'Dra ner drycksidan. Servicen får mindre att bära, dryck-kvaliteten faller över tid.'}
        </div>
      </button>

      <button
        type="button"
        style={lunchClosed ? OPTION_BUTTON_ACTIVE_STYLE : OPTION_BUTTON_STYLE}
        onClick={() => dispatch({ type: 'CLOSE_SERVICE', service: 'lunch' })}
      >
        <div>{lunchClosed ? 'Öppna lunch igen' : 'Stäng lunchen'}</div>
        <div style={OPTION_DESC_STYLE}>
          {lunchClosed
            ? 'Ta upp lunchen igen. Ryktet börjar återhämta sig.'
            : 'Ingen lunch tills du öppnar igen. Sparar personal + råvaror; rummets stambord noterar dörren.'}
        </div>
      </button>

      <button
        type="button"
        style={dinnerClosed ? OPTION_BUTTON_ACTIVE_STYLE : OPTION_BUTTON_STYLE}
        onClick={() => dispatch({ type: 'CLOSE_SERVICE', service: 'dinner' })}
      >
        <div>{dinnerClosed ? 'Öppna middagen igen' : 'Stäng middagen'}</div>
        <div style={OPTION_DESC_STYLE}>
          {dinnerClosed
            ? 'Ta upp middagen igen.'
            : 'Ingen middag tills du öppnar igen. Största besparingen, största rykteskostnaden.'}
        </div>
      </button>
    </div>
  );
}
