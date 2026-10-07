// ORDER 315b del 2 — Åsas erbjudande vid dörren (Designs D7 ownerOffer.ts OFFER_SCENE): efter
// stängning glider kameran in till 10 m vid dörren, Åsa står på trottoaren 1,25 m ut från
// fasaden med nycklarna och hälsar, och spelarens kort öppnas till höger
// (scenario/OwnerOfferScreen.tsx). Dörren och fasadens normal läses ur husets mitt och dörren
// i byns ram (wineBarHouse.ts ENTRANCE: dörren och väntplatsen på trottoaren).

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { applyPose, createFigureRig, type FigureRig } from '../figureRig';
import { createAsa } from '../asaFigure';
import { CLIPS, sampleClip } from '../figureClips';
import { ENTRANCE } from '../wineBarHouse';
import { useSimState } from '../../simulation/SimulationProvider';
import { useCamera } from '../../camera/CameraContext';

const OWNER_OUT_M = 1.25;
const CAMERA_M = 10;
const CAMERA_PITCH = 0.55;
// Lite snett, så att Åsa och dörren syns bredvid varandra och kortet till höger inte skymmer dem.
const CAMERA_YAW_OFFSET = -0.5;

export function OwnerAtDoor() {
  const sim = useSimState();
  const { targetRef } = useCamera();
  const rig = useMemo(() => {
    const r: FigureRig = createAsa({ createFigureRig });
    r.root.name = 'owner-at-door';
    r.root.visible = false;
    return r;
  }, []);
  useEffect(() => () => rig.materials.forEach((m) => m.dispose()), [rig]);
  const active = sim.day.period === 'evening' && sim.day.eveningStep === 'offer';
  const door = ENTRANCE.door;
  const spot = useMemo(() => {
    // Utåt från dörren: mot väntplatsen på trottoaren (wineBarHouse.ts ENTRANCE.waitingSpot, kartkontrollen).
    const out = ENTRANCE.waitingSpot.world;
    const nx = out[0] - door[0], nz = out[1] - door[1];
    const n = Math.hypot(nx, nz) || 1;
    return { x: door[0] + (nx / n) * OWNER_OUT_M, z: door[1] + (nz / n) * OWNER_OUT_M, yaw: Math.atan2(-nx, -nz), outYaw: Math.atan2(nx, nz) + CAMERA_YAW_OFFSET };
  }, [door]);
  const started = useRef<number | null>(null);
  useEffect(() => {
    // Kameran utanför fasaden, vänd mot dörren (kamerans läge = fokus + avstånd · (sin yaw, cos yaw)).
    if (active) targetRef.current = { focus: { x: door[0], z: door[1] }, distance: CAMERA_M, yaw: spot.outYaw, pitch: CAMERA_PITCH };
    else started.current = null;
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((state) => {
    rig.root.visible = active;
    if (!active) return;
    if (started.current === null) started.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - started.current;
    rig.root.position.set(spot.x, 0, spot.z);
    rig.root.rotation.y = spot.yaw;
    const greet = CLIPS['asa.greet'].seconds.calm;
    const pose = t < greet ? sampleClip('asa.greet', t, 'calm').pose : sampleClip('asa.point', (t - greet) % CLIPS['asa.point'].seconds.calm, 'calm').pose;
    applyPose(rig, pose);
  });
  return <primitive object={rig.root} />;
}
