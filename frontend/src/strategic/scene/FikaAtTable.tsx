// ORDER 315b del 2 — fikat efter stängning i rummet (Designs D7 afterHoursFika.ts FIKA_SCENE,
// tillägget fikaClips.ts): laget sitter vid ett bord, den som frågar räcker upp handen
// (gesture.raiseHand, hålls uppe tills kortet öppnas) och de andra dricker ur koppen
// (fika.sipCup, förskjutna 0, 2,5 och 4,0 s). Kameran går in till 8 m över bordet.
// Platserna är rummets (businessRoomRef: vinbarens två första tvåor, bistrons första fyra).

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { applyPose, createFigureRig, type FigureRig } from './figureRig';
import { CLIPS, sampleClip } from './figureClips';
import { STAFF_UNIFORMS } from './wineBarRoom';
import { businessRoomRef } from './interiorSharedState';
import { useSimState } from '../simulation/SimulationProvider';
import { useCamera } from '../camera/CameraContext';
import { fikaTonight } from '../../sim/fika';
import { dilemmaById, type FikaPerson } from '../../content/fika/dilemmas';

const CAMERA_M = 8;
const CAMERA_PITCH = 0.85;
const SIP_OFFSETS_S = [0, 2.5, 4.0];
const TEAM: FikaPerson[] = ['host', 'server', 'bartender', 'cook'];
const UNIFORM: Record<FikaPerson, string> = {
  host: STAFF_UNIFORMS.host, server: STAFF_UNIFORMS.server, sommelier: STAFF_UNIFORMS.sommelier,
  bartender: STAFF_UNIFORMS.bartender, cook: STAFF_UNIFORMS.kitchen, dishwasher: STAFF_UNIFORMS.kitchen
};
// Bordet: de fyra första platserna i bordsordningen (vinbarens tvåor 6–9, bistrons bänkbord 0–3).
const SEATS_WINEBAR = [6, 7, 8, 9];
const SEATS_BISTRO = [0, 1, 2, 3];

export function FikaAtTable() {
  const sim = useSimState();
  const { targetRef } = useCamera();
  const tonight = fikaTonight(sim);
  const asker = tonight ? dilemmaById(tonight.dilemmaId)?.asker ?? null : null;
  const active = sim.day.period === 'evening' && sim.day.eveningStep === 'fika' && !!tonight;
  const team = useMemo(() => {
    const people = asker && !TEAM.includes(asker) ? [asker, ...TEAM.slice(1)] : TEAM;
    const g = new THREE.Group();
    g.name = 'fikaAtTable';
    const rigs = people.map((p) => ({ person: p, rig: createFigureRig({ variant: 'staff', garmentColour: UNIFORM[p] }) as FigureRig }));
    rigs.forEach((r) => g.add(r.rig.root));
    return { g, rigs };
  }, [asker]);
  useEffect(() => () => team.rigs.forEach((r) => r.rig.materials.forEach((m) => m.dispose())), [team]);
  const start = useRef<number | null>(null);
  // Rummets egna figurer är dolda medan laget sitter vid bordet (som under öppningen, OpeningMentor.tsx).
  const { scene } = useThree();
  const hidden = useRef<THREE.Object3D | null>(null);
  useEffect(() => () => { if (hidden.current) hidden.current.scale.setScalar(1); }, []);
  useEffect(() => {
    const room = businessRoomRef.current;
    if (!active || !room) { start.current = null; return; }
    const idx = room.seats.length > 20 ? SEATS_BISTRO : SEATS_WINEBAR;
    const pts = idx.map((i) => room.seats[i]).filter(Boolean);
    if (pts.length === 0) return;
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cz = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    // Bordet till vänster i bild, kortet till höger (D7: kameran på 8 m).
    targetRef.current = { ...targetRef.current, focus: { x: cx, z: cz }, distance: CAMERA_M, pitch: CAMERA_PITCH };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((state) => {
    const room = businessRoomRef.current;
    team.g.visible = active && !!room;
    const figs = scene.getObjectByName('wineBarFigures');
    if (active && figs && figs !== hidden.current) { figs.scale.setScalar(0); hidden.current = figs; }
    if (!active && hidden.current) { hidden.current.scale.setScalar(1); hidden.current = null; }
    if (!active || !room) return;
    if (start.current === null) start.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - start.current;
    const idx = room.seats.length > 20 ? SEATS_BISTRO : SEATS_WINEBAR;
    const answered = tonight?.answer != null;
    let sipper = 0;
    team.rigs.forEach(({ person, rig }, k) => {
      const i = idx[k];
      const at = room.seats[i];
      if (!at) { rig.root.visible = false; return; }
      rig.root.visible = true;
      rig.root.position.set(at[0], room.plinth ?? 0.11, at[1]);
      rig.root.rotation.y = room.seatFacings?.[i] ?? 0;
      if (person === asker && !answered) {
        // Handen uppe tills kortet är besvarat (holdUntil): klippet stannar i sin mitt.
        const len = CLIPS['gesture.raiseHand'].seconds.calm;
        applyPose(rig, sampleClip('gesture.raiseHand', Math.min(t, len * 0.5), 'calm', { seated: true }).pose);
        return;
      }
      const off = SIP_OFFSETS_S[sipper++ % SIP_OFFSETS_S.length];
      const len = CLIPS['fika.sipCup'].seconds.calm;
      const u = Math.max(0, t - off) % (len + 2);
      applyPose(rig, u < len ? sampleClip('fika.sipCup', u, 'calm', { seated: true }).pose : sampleClip('guest.seatedIdle', u, 'calm', { seated: true }).pose);
    });
  });
  return <primitive object={team.g} />;
}
