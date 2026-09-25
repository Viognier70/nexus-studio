// ORDER 267 (Nexus v1 etapp 5) — mentorn i introduktionen.
//
// Speldesign > Introduktionen: "En mentor från Campus möter spelaren och
// följer henne genom första dagen: ett övningsbesök, ett prov och
// bankmötet. […] Mentorn försvinner sedan och dyker bara upp igen om
// spelaren nedgraderas."
//
// En replik per steg (sim/introduction.ts introductionStep), och ett
// avsked när verksamheten har fått sitt namn. Avskedet visas bara om
// spelaren gått igenom introduktionen i den här sessionen, så att en
// laddad sparfil inte får det.
//
// PLACEHOLDER_DESIGN — mentorns gestalt (porträtt eller figur i
// världen) finns inte i Designs leveranser. Tills dess talar mentorn i
// en textruta.

import { useEffect, useRef, useState } from 'react';
import { strings } from '../../content/strings.sv';
import { introductionStep } from '../../sim/introduction';
import { useBusiness } from '../business/BusinessContext';
import { useSimState } from '../simulation/SimulationProvider';

const t = strings.introduction;

const PANEL: React.CSSProperties = {
  position: 'absolute',
  left: 16,
  top: 88,
  width: 'min(360px, calc(100vw - 32px))',
  padding: '12px 14px',
  background: 'rgba(30, 22, 16, 0.94)',
  color: '#f5f0e0',
  border: '1px solid #d8b46a',
  borderRadius: 5,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
  lineHeight: 1.45,
  zIndex: 41,
  boxSizing: 'border-box',
  boxShadow: '0 6px 20px rgba(0,0,0,0.35)'
};

const BUTTON: React.CSSProperties = {
  marginTop: 8,
  padding: '8px 14px',
  minHeight: 40,
  background: '#3c2c1e',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 3,
  font: 'inherit',
  cursor: 'pointer'
};

export function MentorPanel() {
  const sim = useSimState();
  const { hasName } = useBusiness();
  const step = introductionStep(sim);
  const sawIntroduction = useRef(false);
  const [farewellDone, setFarewellDone] = useState(false);
  useEffect(() => {
    if (step !== null) sawIntroduction.current = true;
  }, [step]);
  // Avskedet försvinner när kvällen börjar.
  useEffect(() => {
    if (sim.day.period !== 'morning' && sawIntroduction.current) setFarewellDone(true);
  }, [sim.day.period]);

  let line: string | null = null;
  let farewell = false;
  if (step !== null) line = t.steps[step];
  else if (sawIntroduction.current && hasName && !farewellDone) {
    line = t.farewell;
    farewell = true;
  }
  if (line === null || sim.pavilionVisit !== null) return null;
  return (
    <div style={PANEL} role="status" data-testid="mentor" data-step={step ?? 'farewell'}>
      <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.72, marginBottom: 4 }}>
        {t.mentor}
      </div>
      <div>{line}</div>
      {farewell && (
        <button type="button" style={BUTTON} data-testid="mentor-close" onClick={() => setFarewellDone(true)}>
          {t.farewellClose}
        </button>
      )}
    </div>
  );
}
