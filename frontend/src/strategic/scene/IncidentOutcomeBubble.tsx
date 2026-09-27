// ORDER 270 — svaret på en händelse syns i rummet (Vision Owner
// 2026-09-26: "Varje svar ger direkt effekt: synligt i rummet"). Raden om
// vad som hände står över rummet en stund efter svaret, på samma sätt
// som mentorns kommentar (MentorComment.tsx). Gästernas nöjdhet syns
// dessutom i deras färg, och gäster som kommer eller går syns i rummet.
//
// Provspel 2026-09-27: "Fel val låser: konsekvensen av ett fel svar pågår
// synligt i rummet tills nästa händelse, och går inte att ändra." Följden
// står kvar över rummet så länge den pågår (incidents.ongoing), medan
// gästernas nöjdhet sjunker och personalen arbetar långsammare.

import { Html } from '@react-three/drei';
import { strings } from '../../content/strings.sv';
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

const ONGOING: React.CSSProperties = {
  ...STYLE,
  border: '1px solid #d0694e',
  background: 'rgba(48, 20, 14, 0.92)'
};

export function IncidentOutcomeBubble() {
  const layout = usePlayerBusinessInterior();
  const sim = useSimState();
  const inc = sim.incidents;
  if (!layout || !inc || inc.active || sim.day.period !== 'dinner') return null;
  const [cx, cz] = layout.centre;
  const last = inc.lastOutcome;
  const elapsed = last ? sim.simTime - last.at : Infinity;
  const hold = INCIDENTS.outcomeBubbleSimSeconds;
  const showOutcome = last && elapsed >= 0 && elapsed <= hold + FADE_SIM_S;
  const opacity = showOutcome ? (elapsed <= hold ? 1 : Math.max(0, 1 - (elapsed - hold) / FADE_SIM_S)) : 0;
  const ongoing = inc.ongoing;
  if (!showOutcome && !ongoing) return null;
  return (
    <Html position={[cx, BUBBLE_HEIGHT_M, cz]} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
        {showOutcome && <div style={{ ...STYLE, opacity }} className="incident-outcome">{last.text}</div>}
        {ongoing && (
          <div style={ONGOING} className="incident-ongoing">
            <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.75 }}>
              {strings.service.incident.ongoingLabel}
            </div>
            {ongoing.text}
          </div>
        )}
      </div>
    </Html>
  );
}
