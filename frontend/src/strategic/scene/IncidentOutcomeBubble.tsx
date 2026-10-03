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
import { useRef, useState } from 'react';
import { GRAY_BOX_CAMERA } from '../content/grythyttan';
import * as THREE from 'three';
import { useCamera } from '../camera/CameraContext';
import { strings } from '../../content/strings';
import { usePlayerBusinessInterior } from '../business/interiorLayout';
import { useSimState } from '../simulation/SimulationProvider';
import '../ui/service/service.css';

// ORDER 271 — Designs paket 6 (R2/R3): raden i rummet i systemets stil.
// Ett klarat utfall är en bläckruta med vit text, ett fel en streckad
// ruta; vem i personalen som tar över står i en egen bläckruta så länge
// personen är borta från sin uppgift (FRAGOR §49). En tunn linje leder
// ner mot rummet. Inget blinkar; raden tonas bara ut.

const BUBBLE_HEIGHT_M = 7.6;

// ORDER 292 — bubblan står lägre när kameran är nära (raketens 12 m), så att
// den inte klipps i skärmens överkant: höjden är en andel av kamerans avstånd,
// mellan rummets takhöjd och BUBBLE_HEIGHT_M.
const BUBBLE_SHARE_OF_DISTANCE = 0.2;
const BUBBLE_MIN_M = 2.6;
// Rummet syns närmare än tonbandets yttre kant (som WineBarFigures).
const ROOM_SHOWN_BELOW_M = GRAY_BOX_CAMERA.restaurantInteriorFadeMid + GRAY_BOX_CAMERA.restaurantInteriorFadeHalf;

export function IncidentOutcomeBubble() {
  const groupRef = useRef<THREE.Group>(null);
  const { actualRef } = useCamera();
  // ORDER 292b — bubblan hör till rummet: den ritas bara när rummet syns
  // (samma tonband som figurerna), inte över byn när kameran är ute.
  const [roomShown, setRoomShown] = useState(false);
  useFrame(() => {
    const d = actualRef.current.distance;
    const g = groupRef.current;
    if (g) g.position.y = Math.min(BUBBLE_HEIGHT_M, Math.max(BUBBLE_MIN_M, d * BUBBLE_SHARE_OF_DISTANCE));
    const shown = d < ROOM_SHOWN_BELOW_M;
    if (shown !== roomShown) setRoomShown(shown);
  });
  const layout = usePlayerBusinessInterior();
  const sim = useSimState();
  const inc = sim.incidents;
  if (!layout || !inc || inc.active || sim.day.period !== 'dinner' || !roomShown) return null;
  const [cx, cz] = layout.centre;
  // ORDER 299 (Vision Owner 2026-10-03, "En notis per händelse … Samma
  // händelse får inte upprepas"): utfallets text står i raketkortet och vem
  // som tar över i svarets notis (ui/service/RoomNotices.tsx). Här står bara
  // den pågående följden, som är ett tillstånd tills nästa händelse
  // (provspelet 2026-09-27), inte en notis.
  const ongoing = inc.ongoing;
  if (!ongoing) return null;
  const s = strings.service.incident;
  return (
    <group ref={groupRef} position={[cx, BUBBLE_HEIGHT_M, cz]}>
    <Html center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
      <div className="nx nx-room-labels">
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
