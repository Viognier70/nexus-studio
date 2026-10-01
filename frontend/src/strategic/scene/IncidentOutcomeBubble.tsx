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
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useCamera } from '../camera/CameraContext';
import { strings } from '../../content/strings';
import { INCIDENTS } from '../../sim/balance';
import { takeoverActive } from '../../sim/incidents';
import { usePlayerBusinessInterior } from '../business/interiorLayout';
import { useSimState } from '../simulation/SimulationProvider';
import '../ui/service/service.css';

// ORDER 271 — Designs paket 6 (R2/R3): raden i rummet i systemets stil.
// Ett klarat utfall är en bläckruta med vit text, ett fel en streckad
// ruta; vem i personalen som tar över står i en egen bläckruta så länge
// personen är borta från sin uppgift (FRAGOR §49). En tunn linje leder
// ner mot rummet. Inget blinkar; raden tonas bara ut.

const BUBBLE_HEIGHT_M = 7.6;
const FADE_SIM_S = 2;

// ORDER 292 — bubblan står lägre när kameran är nära (raketens 12 m), så att
// den inte klipps i skärmens överkant: höjden är en andel av kamerans avstånd,
// mellan rummets takhöjd och BUBBLE_HEIGHT_M.
const BUBBLE_SHARE_OF_DISTANCE = 0.2;
const BUBBLE_MIN_M = 2.6;

export function IncidentOutcomeBubble() {
  const groupRef = useRef<THREE.Group>(null);
  const { actualRef } = useCamera();
  useFrame(() => {
    const g = groupRef.current;
    if (g) g.position.y = Math.min(BUBBLE_HEIGHT_M, Math.max(BUBBLE_MIN_M, actualRef.current.distance * BUBBLE_SHARE_OF_DISTANCE));
  });
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
  const takeover = takeoverActive(sim);
  if (!showOutcome && !ongoing && !takeover) return null;
  const failed = last?.reveal ? !last.reveal.cleared : !!last?.takeover;
  const s = strings.service.incident;
  const role = takeover ? s.staffRoles[takeover.role] ?? s.staffFallback : '';
  return (
    <group ref={groupRef} position={[cx, BUBBLE_HEIGHT_M, cz]}>
    <Html center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
      <div className="nx nx-room-labels">
        {takeover && (
          <div className="nx-room-label nx-room-label--right incident-takeover">
            {strings.rocket.card.takeover(role ? role[0].toUpperCase() + role.slice(1) : role)}
          </div>
        )}
        {showOutcome && (
          <div className={`nx-room-label nx-room-label--${failed ? 'wrong' : 'right'} incident-outcome`} style={{ opacity }}>
            {last.text}
          </div>
        )}
        {ongoing && (
          <div className="nx-room-label nx-room-label--wrong incident-ongoing">
            <span className="nx-label">{s.ongoingLabel}</span>
            {ongoing.text}
          </div>
        )}
        <div className="nx-room-leader" />
      </div>
    </Html>
    </group>
  );
}
