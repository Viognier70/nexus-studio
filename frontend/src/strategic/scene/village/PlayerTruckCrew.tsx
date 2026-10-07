// ORDER 315b del 2 — besättningen i spelarens vagn (Designs D7 playerTruck.ts TRUCK_CREW,
// truckClips.ts): en vid grillen (truck.grill, i loop) och en vid luckan (truck.wipeCounter i
// loop, truck.hatchServe när en gäst har fått sin mat). Stationerna i vagnens ram
// (TRUCK_LAYOUT.stations), vagnens golv 0,5 m upp. Tempot följer kön.
//
// ORDER 315b del 3 (Anders 2026-10-07: "Foodtrucken på krognivån (Z) ska inte vara den gamla
// 2D-scenen. Kameran går nära den egna vagnen i 3D, med luckan, grillen, kön, ståbordena och
// D7:s klipp.") — Krogen (Z), Esc och servicens kamera går till vagnen på 12 m, med luckans sida
// mot kameran. Taket kapas närmare än ROOF_CUT_M och markisen tonas till hälften närmare än
// AWNING_FADE_M (D7: "På 12 m tonas markisen till 50 %"). Gästerna står i kön under markisen
// (de som väntar, i kön ordning), vid beställningen och hämtplatsen, och äter vid ståborden.

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { applyPose, createFigureRig, type FigureRig } from '../figureRig';
import { CLIPS, sampleClip, type TempoId } from '../figureClips';
import { TRUCK_CREW, TRUCK_LAYOUT } from '../playerTruck';
import { GUEST_GARMENTS } from '../wineBarRoom';
import { playerTruckPlacement } from '../../content/villagePlaces';
import { useSimState } from '../../simulation/SimulationProvider';
import { setMyBusinessOverride, useCamera } from '../../camera/CameraContext';

const FLOOR_Y_M = 0.5;
const DECK_Y_M = 0.12;
const QUEUE_STRESSED = 4;
const QUEUE_CALM = 1;
const CAMERA_M = 12;
const CAMERA_PITCH = 1.0;
// Kameran något snett mot luckan, så att grillen och kön syns i perspektiv.
const CAMERA_YAW_OFFSET = -0.4;
const ROOF_CUT_M = 20;
const AWNING_FADE_M = 14;
const AWNING_OPACITY = 0.5;
const QUEUE_SPOTS = [TRUCK_LAYOUT.queue.order, ...TRUCK_LAYOUT.queue.line];
const EAT_SPOTS = [TRUCK_LAYOUT.standTables.A, TRUCK_LAYOUT.standTables.B, TRUCK_LAYOUT.standTables.C]
  .flatMap((t) => TRUCK_LAYOUT.eatOffsets.map((o) => [t[0] + o[0], t[1] + o[1], Math.atan2(-o[0], -o[1])] as [number, number, number]));

export function PlayerTruckCrew() {
  const sim = useSimState();
  const { actualRef } = useCamera();
  const { scene } = useThree();
  const at = useMemo(() => playerTruckPlacement(), []);
  const crew = useMemo(() => {
    const grill = createFigureRig({ variant: 'staff', garmentColour: TRUCK_CREW.grill.uniform });
    const hatch = createFigureRig({ variant: 'staff', garmentColour: TRUCK_CREW.hatch.uniform });
    const g = new THREE.Group();
    g.name = 'playerTruckCrew';
    g.position.set(at.x, 0, at.z);
    g.rotation.y = at.rotationY;
    // Grillaren vänd mot gallret (−Z), den vid luckan mot luckan (+Z).
    grill.root.position.set(TRUCK_LAYOUT.stations.grill[0], FLOOR_Y_M, TRUCK_LAYOUT.stations.grill[1]);
    grill.root.rotation.y = Math.PI;
    hatch.root.position.set(TRUCK_LAYOUT.stations.hatch[0], FLOOR_Y_M, TRUCK_LAYOUT.stations.hatch[1]);
    g.add(grill.root, hatch.root);
    const guests: FigureRig[] = [];
    for (let i = 0; i < QUEUE_SPOTS.length + 1 + EAT_SPOTS.length; i++) {
      const r = createFigureRig({ variant: 'guest', garmentColour: GUEST_GARMENTS[i % GUEST_GARMENTS.length] });
      r.root.visible = false;
      g.add(r.root);
      guests.push(r);
    }
    // Kontrollskriptet (scripts/order315b-2-check.mjs) läser besättningens läge härifrån.
    if (typeof window !== 'undefined') (window as unknown as { __nxTruckCrew?: unknown }).__nxTruckCrew = { g, grill: grill.root, hatch: hatch.root };
    return { g, grill, hatch, guests };
  }, [at]);
  useEffect(() => () => [crew.grill, crew.hatch, ...crew.guests].forEach((r) => r.materials.forEach((m) => m.dispose())), [crew]);

  const isTruck = sim.economy.businessClass === 'foodtruck';
  // Krogens kamera: vagnen, med luckans sida mot kameran (vagnens +Z i byns ram).
  useEffect(() => {
    if (!isTruck) { setMyBusinessOverride(null); return; }
    const hatchX = Math.sin(at.rotationY), hatchZ = Math.cos(at.rotationY);
    const focus = { x: at.x + hatchX * 0.8, z: at.z + hatchZ * 0.8 };
    setMyBusinessOverride({ focus, distance: CAMERA_M, yaw: Math.atan2(hatchX, hatchZ) + CAMERA_YAW_OFFSET, pitch: CAMERA_PITCH });
    return () => setMyBusinessOverride(null);
  }, [isTruck, at]);

  const served = useRef({ count: -1, at: -Infinity });
  const open = isTruck && (sim.day.period === 'dinner' || sim.day.period === 'lunch');
  useFrame((state) => {
    // Taket och markisen efter kamerans avstånd (vagnen ritas av VillageVenues).
    const trailer = scene.getObjectByName('playerTrailer');
    if (trailer) {
      const d = actualRef.current.distance;
      for (const name of ['trailerRoof', 'trailerSign', 'trailerChimney']) { const o = trailer.getObjectByName(name); if (o) o.visible = d > ROOF_CUT_M; }
      trailer.traverse((o) => {
        if (o.name !== 'trailerAwning' && !o.name.startsWith('trailerScallop')) return;
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial;
        const fade = d < AWNING_FADE_M;
        m.transparent = fade;
        m.opacity = fade ? AWNING_OPACITY : 1;
        (o as THREE.Mesh).castShadow = !fade;
      });
    }
    crew.g.visible = open;
    if (!open) return;
    const t = state.clock.elapsedTime;
    const waiting = sim.waitingIds.length;
    const tempo: TempoId = waiting > QUEUE_STRESSED ? 'stressed' : waiting > QUEUE_CALM ? 'normal' : 'calm';
    const stress = tempo === 'stressed' ? 1 : tempo === 'normal' ? 0.5 : 0;
    applyPose(crew.grill, sampleClip('truck.grill', t, tempo, { stress }).pose);
    // En gäst som fått sin mat (dagens notor) ger ett varv truck.hatchServe.
    const bills = sim.day.billsTonight ?? 0;
    if (served.current.count < 0) served.current.count = bills;
    if (bills > served.current.count) served.current = { count: bills, at: t };
    const serveLen = CLIPS['truck.hatchServe'].seconds[tempo];
    const since = t - served.current.at;
    applyPose(crew.hatch, since < serveLen
      ? sampleClip('truck.hatchServe', since, tempo, { stress, hand: 'L' }).pose
      : sampleClip('truck.wipeCounter', t, tempo, { stress }).pose);

    // Gästerna: kön (väntar, i ordning), hämtplatsen (serveras eller betalar), ståborden (äter).
    const byId = new Map(sim.guests.map((g) => [g.id, g]));
    const queue = sim.waitingIds.map((id) => byId.get(id)).filter(Boolean).slice(0, QUEUE_SPOTS.length);
    const ordering = sim.guests.filter((g) => g.state === 'ordering').slice(0, 1);
    const collecting = sim.guests.filter((g) => g.state === 'serving' || g.state === 'paying').slice(0, 1);
    const eating = sim.guests.filter((g) => g.state === 'eating' || g.state === 'leaving').slice(0, EAT_SPOTS.length);
    let k = 0;
    const place = (x: number, z: number, yaw: number, y: number, clip: string, phase: number) => {
      const r = crew.guests[k++];
      if (!r) return;
      r.root.visible = true;
      r.root.position.set(x, y, z);
      r.root.rotation.y = yaw;
      applyPose(r, sampleClip(clip, t + phase, 'calm').pose);
    };
    // Kön står längs markisen västerut och tittar mot beställningen (+X); vid luckan står de vända mot
    // den (−Z). Stående klipp (guest.order och guest.pay är sittande).
    const front = ordering.length > 0 ? 1 : 0;
    ordering.forEach(() => place(TRUCK_LAYOUT.queue.order[0], TRUCK_LAYOUT.queue.order[1], Math.PI, 0, 'guest.queueCalm', 0));
    queue.forEach((_, i) => { const p = QUEUE_SPOTS[Math.min(QUEUE_SPOTS.length - 1, i + front)]; place(p[0], p[1], Math.PI / 2, 0, waiting > QUEUE_STRESSED ? 'guest.queueImpatient' : 'guest.queueCalm', i * 0.7); });
    collecting.forEach(() => place(TRUCK_LAYOUT.queue.collect[0], TRUCK_LAYOUT.queue.collect[1], Math.PI, 0, 'guest.queueCalm', 0.5));
    eating.forEach((_, i) => { const e = EAT_SPOTS[i]; place(e[0], e[1], e[2], DECK_Y_M, 'guest.standBar', i * 1.3); });
    for (; k < crew.guests.length; k++) crew.guests[k].root.visible = false;
  });
  return <primitive object={crew.g} />;
}
