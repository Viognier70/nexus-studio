// ORDER 270 — svaret på en händelse syns i rummet (Vision Owner
// 2026-09-26: "Varje svar ger direkt effekt: synligt i rummet"). Raden om
// vad som hände står över rummet en stund efter svaret, på samma sätt
// som mentorns kommentar (MentorComment.tsx). Gästernas nöjdhet syns
// dessutom i deras färg, och gäster som kommer eller går syns i rummet.

import { Html } from '@react-three/drei';
import { INCIDENTS } from '../../sim/balance';
import { usePlayerBusinessInterior } from '../business/interiorLayout';
import { useSimState } from '../simulation/SimulationProvider';

const BUBBLE_HEIGHT_M = 7.6;
const FADE_SIM_S = 2;

const STYLE: React.CSSProperties = {
  color: '#f5f0e0',
  background: 'rgba(30, 22, 16, 0.9)',
  padding: '10px 14px',
  borderRadius: 4,
  border: '1px solid #d8b56a',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
  lineHeight: 1.35,
  fontWeight: 500,
  width: 380,
  textAlign: 'center',
  boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
  pointerEvents: 'none'
};

export function IncidentOutcomeBubble() {
  const layout = usePlayerBusinessInterior();
  const sim = useSimState();
  const last = sim.incidents?.lastOutcome;
  if (!layout || !last || sim.incidents?.active) return null;
  const elapsed = sim.simTime - last.at;
  const hold = INCIDENTS.outcomeBubbleSimSeconds;
  if (elapsed < 0 || elapsed > hold + FADE_SIM_S) return null;
  const opacity = elapsed <= hold ? 1 : Math.max(0, 1 - (elapsed - hold) / FADE_SIM_S);
  const [cx, cz] = layout.centre;
  return (
    <Html position={[cx, BUBBLE_HEIGHT_M, cz]} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
      <div style={{ ...STYLE, opacity }} className="incident-outcome">{last.text}</div>
    </Html>
  );
}
