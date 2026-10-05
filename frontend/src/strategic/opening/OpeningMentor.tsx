// ORDER 308 — Ingrid i dörren till Måltidens hus under öppningen (Designs
// oppningManus MENTOR, prototypens placeMentor): en vanlig figur i olivgrönt,
// 1,2 m ut från dörren, vänd mot gatan, i spelets figurrigg och klipp. Hon
// tittar ut mot vägen en gång (glanceAt). Syns bara medan öppningen pågår,
// från 30 s (som i prototypen), och ritas av byns scen.

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { applyPose, createFigureRig } from '../scene/figureRig';
import { sampleClip } from '../scene/figureClips';
import { MENTOR } from './oppningManus';
import { markOpeningSceneReady, openingStage } from './openingStage';
import { mentorDoor } from './openingTimeline';

/** Från vilken tid Ingrid står i dörren (prototypen: t > 30). */
export const MENTOR_FROM_S = 30;

export function OpeningMentor() {
  const rig = useMemo(() => {
    const r = createFigureRig({ variant: 'staff', garmentColour: MENTOR.garment });
    r.root.traverse((o) => { if ((o as { isMesh?: boolean }).isMesh) (o as { castShadow: boolean }).castShadow = true; });
    r.root.visible = false;
    r.root.name = 'opening-mentor';
    // Kontrollskriptet (scripts/order308-check.mjs) läser Ingrids läge härifrån.
    if (typeof window !== 'undefined') (window as unknown as { __nxOpeningMentor?: unknown }).__nxOpeningMentor = r.root;
    return r;
  }, []);
  // R3F tar bort <primitive> ur scenen; här frigörs bara materialen (StrictMode
  // kör effekten två gånger, och riggen ska stå kvar i scenen efter den första).
  useEffect(() => () => rig.materials.forEach((m) => m.dispose()), [rig]);

  useFrame(() => {
    markOpeningSceneReady();
    const st = openingStage();
    const show = st.active && st.t > MENTOR_FROM_S;
    rig.root.visible = show;
    if (!show) return;
    const D = mentorDoor();
    rig.root.position.set(D.x, 0, D.z);
    rig.root.rotation.y = D.yaw;
    rig.root.scale.setScalar(MENTOR.scale || 1);
    const glance = Math.max(0, Math.min(1, 1 - Math.abs(st.t - MENTOR.glanceAt) / 1.2));
    const s = sampleClip(MENTOR.clip, st.t, 'calm', { yaw: -0.9 * glance });
    applyPose(rig, s.pose);
  });

  return <primitive object={rig.root} />;
}
