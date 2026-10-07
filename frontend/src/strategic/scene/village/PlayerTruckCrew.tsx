// ORDER 315b del 2 — besättningen i spelarens vagn (Designs D7 playerTruck.ts TRUCK_CREW,
// truckClips.ts): en vid grillen (truck.grill, i loop) och en vid luckan (truck.wipeCounter i
// loop, truck.hatchServe när en gäst har fått sin mat). Stationerna i vagnens ram
// (TRUCK_LAYOUT.stations), vagnens golv 0,5 m upp. Tempot följer kön.
//
// ORDER 315b del 3 (Anders 2026-10-07: "Foodtrucken på krognivån (Z) ska inte vara den gamla
// 2D-scenen. Kameran går nära den egna vagnen i 3D, med luckan, grillen, kön, ståbordena och
// D7:s klipp.") — Krogen (Z), Esc och servicens kamera går till vagnen på 12 m, med luckans sida
// mot kameran. Taket kapas närmare än 20 m (ROOF_FADE_M, tonat sedan 319a.2) och markisen tonas till
// hälften närmare än AWNING_FADE_M (D7: "På 12 m tonas markisen till 50 %"). Gästerna står i kön under markisen
// (de som väntar, i kön ordning), vid beställningen och hämtplatsen, och äter vid ståborden.
//
// ORDER 319a.1 (Anders 2026-10-07) — gästerna går in från byns gator och därifrån igen, en figur
// per gäst (truckGuestFlow.ts), och ingen uppstår eller försvinner i bild. Personalen syns när
// vagnen syns (förut tändes och släcktes besättningen med servicen).
// ORDER 319a.4 — gästen i en situation med förvarningen guestAtHatch pekar vid luckan
// (rocket.askPointMenu stående) medan kortet väntar.

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { applyPose, createFigureRig, poseWalk, type FigurePose, type FigureRig } from '../figureRig';
import { CLIPS, sampleClip, type TempoId } from '../figureClips';
import { TRUCK_CREW, TRUCK_LAYOUT } from '../playerTruck';
import { GUEST_GARMENTS } from '../wineBarRoom';
import { playerTruckPlacement } from '../../content/villagePlaces';
import { useSimState } from '../../simulation/SimulationProvider';
import { effectiveSpeed } from '../../simulation/consequence';
import { setMyBusinessOverride, useCamera } from '../../camera/CameraContext';
import { THEATRE } from '../../../sim/balance';
import { TRUCK_GUESTS, TruckGuestFlow, toWorld, type TruckWalker } from './truckGuestFlow';
import { truckCameraState } from './truckCamera';

const FLOOR_Y_M = 0.5;
const QUEUE_STRESSED = 4;
const QUEUE_CALM = 1;
// Taket kapas närmare än 20 m (D7); ORDER 319a.2 tonar det över 17–23 m.
const ROOF_FADE_M: readonly [number, number] = [17, 23];
const AWNING_FADE_M: readonly [number, number] = [12, 16];
const AWNING_OPACITY = 0.5;
/** Ett steg i flödet räknas högst så här långt (en flik i bakgrunden ska inte teleportera gästerna). */
const MAX_DT_S = 0.1;
/** Gästen kliver upp på trädäcket det sista stycket fram till platsen. */
const STEP_UP_M = 0.6;
/** Figurens höjd vid prövningen mot kamerans bild: fötterna och huvudet. */
const FIGURE_TOP_M = 1.7;

/** Synligt bara om vagnen och alla dess föräldrar syns. */
function shown(o: THREE.Object3D | null | undefined): boolean {
  for (let x = o; x; x = x.parent) if (!x.visible) return false;
  return !!o;
}

export function PlayerTruckCrew() {
  const sim = useSimState();
  const { actualRef } = useCamera();
  const { scene, camera } = useThree();
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
    // Gästerna i byns ram: de går in från gatorna och ut igen.
    const guestsGroup = new THREE.Group();
    guestsGroup.name = 'playerTruckGuests';
    // Kontrollskriptet (scripts/order315b-2-check.mjs) läser besättningens läge härifrån.
    if (typeof window !== 'undefined') (window as unknown as { __nxTruckCrew?: unknown }).__nxTruckCrew = { g, grill: grill.root, hatch: hatch.root, guests: guestsGroup };
    return { g, grill, hatch, guestsGroup };
  }, [at]);
  // En figur per gäst, med gästens kläder; figurerna återanvänds per klädindex.
  const rigs = useRef({ live: new Map<string, FigureRig>(), free: new Map<number, FigureRig[]>() });
  const frustum = useMemo(() => ({ f: new THREE.Frustum(), m: new THREE.Matrix4(), p: new THREE.Vector3() }), []);
  const flow = useMemo(() => new TruckGuestFlow(at, (x, z) => {
    for (const y of [0, FIGURE_TOP_M]) if (frustum.f.containsPoint(frustum.p.set(x, y, z))) return true;
    return false;
  }, GUEST_GARMENTS.length), [at, frustum]);
  useEffect(() => () => {
    [crew.grill, crew.hatch].forEach((r) => r.materials.forEach((m) => m.dispose()));
    const all = [...rigs.current.live.values(), ...[...rigs.current.free.values()].flat()];
    all.forEach((r) => r.materials.forEach((m) => m.dispose()));
  }, [crew]);

  const isTruck = sim.economy.businessClass === 'foodtruck';
  // Krogens kamera: vagnen, med luckans sida mot kameran (vagnens +Z i byns ram).
  useEffect(() => {
    if (!isTruck) { setMyBusinessOverride(null); return; }
    setMyBusinessOverride(truckCameraState(at));
    return () => setMyBusinessOverride(null);
  }, [isTruck, at]);

  const served = useRef({ count: -1, at: -Infinity });
  useFrame((state, delta) => {
    // Taket och markisen efter kamerans avstånd (vagnen ritas av VillageVenues).
    const trailer = scene.getObjectByName('playerTrailer');
    if (trailer) {
      const d = actualRef.current.distance;
      // ORDER 319a.2 — taket tonas ut över ROOF_FADE_M i stället för att försvinna vid 20 m. Taket
      // delar material med vagnens kropp (playerTruck.ts m()), så det får en egen kopia först.
      const k = Math.max(0, Math.min(1, (d - ROOF_FADE_M[0]) / (ROOF_FADE_M[1] - ROOF_FADE_M[0])));
      for (const name of ['trailerRoof', 'trailerSign', 'trailerChimney']) {
        const o = trailer.getObjectByName(name) as THREE.Mesh | undefined;
        if (!o) continue;
        if (!o.userData.ownMaterial) { o.material = (o.material as THREE.Material).clone(); o.userData.ownMaterial = true; }
        const mat = o.material as THREE.MeshStandardMaterial;
        o.visible = k > 0.01;
        const fade = k < 0.99;
        if (mat.transparent !== fade) { mat.transparent = fade; mat.needsUpdate = true; }
        mat.opacity = k;
        mat.depthWrite = !fade;
        o.castShadow = k > 0.5;
      }
      trailer.traverse((o) => {
        if (o.name !== 'trailerAwning' && !o.name.startsWith('trailerScallop')) return;
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial;
        // ORDER 319a.2 — tonas till AWNING_OPACITY över AWNING_FADE_M (förut ett hopp vid 14 m).
        const a = Math.max(0, Math.min(1, (d - AWNING_FADE_M[0]) / (AWNING_FADE_M[1] - AWNING_FADE_M[0])));
        const op = AWNING_OPACITY + (1 - AWNING_OPACITY) * a;
        const fade = op < 0.99;
        if (m.transparent !== fade) { m.transparent = fade; m.needsUpdate = true; }
        m.opacity = op;
        (o as THREE.Mesh).castShadow = op > 0.75;
      });
    }
    // Personalen står i vagnen när vagnen står på torget.
    crew.g.visible = isTruck && shown(trailer);
    const t = state.clock.elapsedTime;
    const waiting = sim.waitingIds.length;
    const tempo: TempoId = waiting > QUEUE_STRESSED ? 'stressed' : waiting > QUEUE_CALM ? 'normal' : 'calm';
    const stress = tempo === 'stressed' ? 1 : tempo === 'normal' ? 0.5 : 0;
    if (crew.g.visible) {
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
    }

    // Gästerna: flödet flyttar dem, figurerna följer.
    if (!isTruck) return;
    // Kontrollskriptet (scripts/order319a-check.mjs) prövar figurerna mot samma kamera.
    if (typeof window !== 'undefined') (window as unknown as { __nxTruckCamera?: THREE.Camera }).__nxTruckCamera = camera;
    camera.updateMatrixWorld();
    frustum.m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.f.setFromProjectionMatrix(frustum.m);
    // Gästerna går i spelets fart (2× och 4× fortare, stilla när spelet står), så att de hinner med
    // simuleringen.
    const events = flow.update(sim.guests, sim.waitingIds, Math.min(MAX_DT_S, delta) * effectiveSpeed(sim));
    const R = rigs.current;
    for (const e of events) {
      if (e.kind === 'spawn') {
        const look = flow.walkers.get(e.id)!.look;
        const r = R.free.get(look)?.pop() ?? createFigureRig({ variant: 'guest', garmentColour: GUEST_GARMENTS[look] });
        r.root.userData.look = look;
        r.root.userData.guestId = e.id;
        r.root.visible = true;
        crew.guestsGroup.add(r.root);
        R.live.set(e.id, r);
      } else {
        const r = R.live.get(e.id);
        if (!r) continue;
        R.live.delete(e.id);
        r.root.visible = false;
        crew.guestsGroup.remove(r.root);
        const look = r.root.userData.look as number;
        R.free.set(look, [...(R.free.get(look) ?? []), r]);
      }
    }
    const active = sim.incidents?.active;
    const hatchAt = toWorld(at, TRUCK_LAYOUT.queue.order[0], 0);
    // Gästen pekar de sista askPointMenu-sekunderna av förvarningen (före dem går hen fram).
    const left = active?.introLeft ?? 0;
    const pointing = active?.cue === 'guestAtHatch' && left > 0 && left <= THEATRE.rocketIntroSeconds.askPointMenu ? active.context.figure?.guestId : undefined;
    for (const w of flow.walkers.values()) {
      const r = R.live.get(w.id);
      if (r) poseWalker(r, w, t, waiting > QUEUE_STRESSED, w.id === pointing ? THEATRE.rocketIntroSeconds.askPointMenu - (active?.introLeft ?? 0) : null, hatchAt);
    }
  });
  return (
    <>
      <primitive object={crew.g} />
      <primitive object={crew.guestsGroup} />
    </>
  );
}

/** Figurens läge och pose: går, står i kön, beställer (pekar i en situation), hämtar eller äter. */
function poseWalker(r: FigureRig, w: TruckWalker, t: number, impatient: boolean, pointing: number | null, hatchAt: [number, number]): void {
  const near = w.spot ? Math.hypot(w.spot.x - w.x, w.spot.z - w.z) : Infinity;
  r.root.position.set(w.x, w.spot && near < STEP_UP_M ? w.spot.y : 0, w.z);
  r.root.rotation.y = w.yaw;
  if (!w.settled) { applyPose(r, poseWalk(w.walkedM / TRUCK_GUESTS.strideM)); return; }
  const phase = (w.spot?.index ?? 0) * 0.7;
  if (w.spot?.pose === 'eat') { applyPose(r, sampleClip('guest.standBar', t + phase, 'calm').pose); return; }
  const stand = sampleClip(impatient && w.spot?.pose === 'queue' ? 'guest.queueImpatient' : 'guest.queueCalm', t + phase, 'calm').pose;
  if (pointing === null) { applyPose(r, stand); return; }
  // Vänd mot luckan medan gästen pekar (också den som står vid ett ståbord).
  r.root.rotation.y = Math.atan2(hatchAt[0] - w.x, hatchAt[1] - w.z);
  // Stående: benen ur kön, överkroppen ur klippet där gästen pekar.
  const point = sampleClip('rocket.askPointMenu', pointing, 'normal').pose;
  const pose: FigurePose = { ...stand, torso: point.torso, head: point.head, armL: point.armL, armR: point.armR };
  applyPose(r, pose);
}
