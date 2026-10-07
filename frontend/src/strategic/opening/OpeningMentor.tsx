// ORDER 308 — mentorn i dörren till Måltidens hus under öppningen (Designs
// oppningManus MENTOR, prototypens placeMentor), 1,2 m ut från dörren, vänd mot
// gatan, i spelets figurrigg och klipp. Syns bara medan öppningen pågår, från
// 30 s (som i prototypen), och ritas av byns scen.
// ORDER 317 — Designs D6: Intendent Åsa i Ingrids ställe (asaFigure.ts, hatten
// och klänningen). Hon tittar ut mot vägen vid glanceAt och hälsar mot vägen
// med handen till brättet vid greetAt (asa.greet, lugnt).
//
// Under öppningen är vinbarens egna figurer dolda (oppningManus: "byns figurer
// i rummet är dolda under nedstigningen, så att rummet är tomt redan då").
// WineBarFigures sätter sin grupps visible varje bildruta, så gruppen
// ('wineBarFigures') skalas till noll medan öppningen pågår och tillbaka efteråt.

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { applyPose, createFigureRig, type FigureRig } from '../scene/figureRig';
import { createAsa } from '../scene/asaFigure';
import { CLIPS, sampleClip } from '../scene/figureClips';
import { MENTOR } from './oppningManus';
import { markOpeningSceneReady, openingStage } from './openingStage';
import { mentorDoor } from './openingTimeline';

/** Från vilken tid Åsa står i dörren (prototypen: t > 30). */
export const MENTOR_FROM_S = 30;

export function OpeningMentor() {
  const rig = useMemo(() => {
    const r: FigureRig = createAsa({ createFigureRig });
    r.root.traverse((o) => { if ((o as { isMesh?: boolean }).isMesh) (o as { castShadow: boolean }).castShadow = true; });
    r.root.visible = false;
    r.root.name = 'opening-mentor';
    // Kontrollskriptet (scripts/order308-check.mjs) läser Åsas läge härifrån.
    if (typeof window !== 'undefined') (window as unknown as { __nxOpeningMentor?: unknown }).__nxOpeningMentor = r.root;
    return r;
  }, []);
  // R3F tar bort <primitive> ur scenen; här frigörs bara materialen (StrictMode
  // kör effekten två gånger, och riggen ska stå kvar i scenen efter den första).
  useEffect(() => () => rig.materials.forEach((m) => m.dispose()), [rig]);

  const { scene } = useThree();
  const hidden = useRef<THREE.Object3D | null>(null);
  useEffect(() => () => { if (hidden.current) hidden.current.scale.setScalar(1); }, []);

  useFrame(() => {
    markOpeningSceneReady();
    const st = openingStage();
    if (st.active) {
      const figs = scene.getObjectByName('wineBarFigures');
      if (figs && figs !== hidden.current) { figs.scale.setScalar(0); hidden.current = figs; }
    } else if (hidden.current) {
      hidden.current.scale.setScalar(1);
      hidden.current = null;
    }
    const show = st.active && st.t > MENTOR_FROM_S;
    rig.root.visible = show;
    if (!show) return;
    const D = mentorDoor();
    rig.root.position.set(D.x, 0, D.z);
    rig.root.rotation.y = D.yaw;
    rig.root.scale.setScalar(MENTOR.scale || 1);
    // Hälsningen (asa.greet) spelas en gång från greetAt; annars står hon och tittar ut vid glanceAt.
    const greetLen = CLIPS['asa.greet'].seconds.calm;
    if (st.t >= MENTOR.greetAt && st.t < MENTOR.greetAt + greetLen) {
      applyPose(rig, sampleClip('asa.greet', st.t - MENTOR.greetAt, 'calm', { yaw: MENTOR.greetYaw }).pose);
      return;
    }
    const glance = Math.max(0, Math.min(1, 1 - Math.abs(st.t - MENTOR.glanceAt) / 1.2));
    const s = sampleClip(MENTOR.clip, st.t, 'calm', { yaw: MENTOR.greetYaw * glance });
    applyPose(rig, s.pose);
  });

  return <primitive object={rig.root} />;
}
