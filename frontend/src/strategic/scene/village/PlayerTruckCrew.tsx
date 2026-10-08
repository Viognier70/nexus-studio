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
//
// ORDER 319b (Designs D9 och tillägget) — de nyfikna: en förbipasserande saktar in, läser skylten,
// luktar och pekar, tittar på klockan och tvekar, med markeringen över huvudet och ringen på marken
// (CuriousMarker.tsx). Ett klick på bubblan eller figuren öppnar kortet (CuriousCard.tsx). Rätt svar:
// medhjälparen vinkar fram gästen (truck.beckon) med en replik, och gästen vänder sig mot luckan och går
// till kön. Nästan: tvekar, tittar på klockan och tvekar igen. Fel: skakar på huvudet och går vidare.
// I kön tittar gästerna på klockan efter en stund (STREET_QUEUE). Figurerna ritas där trängseln ställer
// dem (truckGuestFlow.ts shown).

import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { applyPose, createFigureRig, poseWalk, type FigurePose, type FigureRig } from '../figureRig';
import { CLIPS, sampleClip, type TempoId } from '../figureClips';
import { TRUCK_CREW, TRUCK_LAYOUT } from '../playerTruck';
import { GUEST_GARMENTS } from '../wineBarRoom';
import { playerTruckPlacement } from '../../content/villagePlaces';
import { useSimDispatch, useSimState } from '../../simulation/SimulationProvider';
import { effectiveSpeed } from '../../simulation/consequence';
import { setMyBusinessOverride, useCamera } from '../../camera/CameraContext';
import { CURIOUS, STREET_QUEUE, THEATRE } from '../../../sim/balance';
import { curiousPhase, curiousTalkable, type CuriousGuest } from '../../../sim/curious';
import { CURIOUS_SPOTS, MENU_BOARD } from '../truckProps';
import { TRUCK_GUESTS, TruckGuestFlow, toWorld, type TruckFrame, type TruckWalker } from './truckGuestFlow';
import { truckCameraState } from './truckCamera';
import { CuriousMarker, type CuriousMarkerState } from './CuriousMarker';

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
  const dispatch = useSimDispatch();
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
  // ORDER 319b — medhjälparen vinkar fram den nyfikna (truck.beckon) och säger sin replik.
  const beckon = useRef<{ at: number; guestId: string; line: number } | null>(null);
  const marker = useRef<CuriousMarkerState>({ seq: null, x: 0, z: 0, y: 0, settledGuest: null, beckon: null });
  const queueSince = useRef(new Map<string, number>());
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
    const hatchWorld = toWorld(at, TRUCK_LAYOUT.stations.hatch[0], TRUCK_LAYOUT.stations.hatch[1]);
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
      const b = beckon.current;
      const beckonLen = CLIPS['truck.beckon'].seconds.normal;
      const bw = b ? flow.walkers.get(b.guestId) : null;
      if (b && t >= b.at && t < b.at + beckonLen) {
        // Mot gästen, i figurens ram (vänd mot luckan, vagnens +Z).
        const p = bw ? flow.shown.get(bw.id) ?? [bw.x, bw.z] : null;
        const yaw = p ? wrap(Math.atan2(p[0] - hatchWorld[0], p[1] - hatchWorld[1]) - at.rotationY) : 0;
        applyPose(crew.hatch, sampleClip('truck.beckon', t - b.at, 'normal', { yaw }).pose);
      } else applyPose(crew.hatch, since < serveLen
        ? sampleClip('truck.hatchServe', since, tempo, { stress, hand: 'L' }).pose
        : sampleClip('truck.wipeCounter', t, tempo, { stress }).pose);
    }

    // Gästerna: flödet flyttar dem, figurerna följer.
    if (!isTruck) return;
    // Kontrollskriptet (scripts/order319a-check.mjs) prövar figurerna mot samma kamera.
    if (typeof window !== 'undefined') (window as unknown as { __nxTruckCamera?: THREE.Camera }).__nxTruckCamera = camera;
    // ORDER 319b — kontrollskriptet (scripts/order319b-check.mjs) läser de nyfikna härifrån.
    if (typeof window !== 'undefined') (window as unknown as { __nxCurious?: unknown }).__nxCurious = sim.day.curious ?? null;
    camera.updateMatrixWorld();
    frustum.m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.f.setFromProjectionMatrix(frustum.m);
    // Gästerna går i spelets fart (2× och 4× fortare, stilla när spelet står), så att de hinner med
    // simuleringen.
    const cq = sim.day.curious ?? null;
    const events = flow.update(sim.guests, sim.waitingIds, Math.min(MAX_DT_S, delta) * effectiveSpeed(sim), cq ? { current: cq.current, last: cq.last } : null);
    const R = rigs.current;
    for (const e of events) {
      if (e.kind === 'rename') {
        // ORDER 319b — den nyfikna ställde sig i kön: samma figur, nu gästen. Vid rätt svar vinkar medhjälparen.
        const r = R.live.get(e.from!);
        if (r) { R.live.delete(e.from!); R.live.set(e.id, r); r.root.userData.guestId = e.id; }
        if (cq?.last?.guestId === e.id && cq.last.grade === 'right') {
          beckon.current = { at: t + CURIOUS.card.beckonAtSeconds, guestId: e.id, line: (cq.tonight.right - 1) % CURIOUS.hatchLines };
        }
        continue;
      }
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
    const cur = cq?.current ?? null;
    const m = marker.current;
    m.seq = null;
    for (const w of flow.walkers.values()) {
      const r = R.live.get(w.id);
      if (!r) continue;
      const p = flow.shown.get(w.id) ?? [w.x, w.z];
      // ORDER 319b — kroppsspråket i kön: en blick på klockan efter en stund (STREET_QUEUE).
      const inQueue = w.settled && w.spot?.pose === 'queue';
      const qs = queueSince.current;
      if (inQueue && !qs.has(w.id)) qs.set(w.id, t);
      if (!inQueue) qs.delete(w.id);
      if (w.curious && w.curious.stage !== 'walkOn' && cur?.seq === w.curious.seq) {
        poseCurious(r, w, p, cur, t, at);
        m.seq = cur.seq;
        m.x = r.root.position.x; m.z = r.root.position.z; m.y = r.root.position.y;
        continue;
      }
      poseWalker(r, w, p, t, waiting > QUEUE_STRESSED, w.id === pointing ? THEATRE.rocketIntroSeconds.askPointMenu - (active?.introLeft ?? 0) : null, hatchAt, inQueue ? t - qs.get(w.id)! : null, flow.clock - w.outcomeAt);
      // Efter rätt svar står bubblan kvar i guld tills gästen står i kön.
      if (w.fromCurious !== undefined && cq?.last?.guestId === w.id) {
        m.settledGuest = { id: w.id, settled: w.settled };
        if (!cur) { m.x = r.root.position.x; m.z = r.root.position.z; m.y = r.root.position.y; }
      }
    }
    if (cq?.last?.outcome !== 'join' || !flow.walkers.has(cq.last.guestId ?? '')) m.settledGuest = null;
    const b = beckon.current;
    m.beckon = b && t >= b.at && t < b.at + CURIOUS.hatchLineSeconds ? { line: b.line, x: hatchWorld[0], z: hatchWorld[1] } : null;
  });
  return (
    <>
      <primitive object={crew.g} />
      <primitive
        object={crew.guestsGroup}
        // ORDER 319b — klick på den nyfikna figuren öppnar kortet, som klick på bubblan.
        onClick={(e: ThreeEvent<MouseEvent>) => { if (curiousSeqOf(e.object) === null) return; e.stopPropagation(); if (curiousTalkable(sim)) dispatch({ type: 'CURIOUS_OPEN' }); }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => { if (curiousSeqOf(e.object) === null) return; marker.current.hover = true; document.body.style.cursor = curiousTalkable(sim) ? 'pointer' : ''; }}
        onPointerOut={(e: ThreeEvent<PointerEvent>) => { if (curiousSeqOf(e.object) === null) return; marker.current.hover = false; document.body.style.cursor = ''; }}
      />
      {isTruck && <CuriousMarker state={marker} />}
    </>
  );
}

/** Den nyfikna figuren (gästens id `curious:<seq>`) som objektet hör till, annars null. */
function curiousSeqOf(o: THREE.Object3D | null): number | null {
  for (let x = o; x; x = x.parent) {
    const id = x.userData?.guestId as string | undefined;
    if (id) return id.startsWith('curious:') ? Number(id.slice('curious:'.length)) : null;
  }
  return null;
}

function wrap(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/** Vridningen mot en punkt i figurens ram (rotation.y = facing). */
function yawTo(fromX: number, fromZ: number, facing: number, toX: number, toZ: number): number {
  return wrap(Math.atan2(toX - fromX, toZ - fromZ) - facing);
}

/** Klippets rot (figurens ram: x åt höger hands sida, z framåt) i världen, som i WineBarFigures. */
function addRoot(r: FigureRig, root: readonly number[]): void {
  const f = r.root.rotation.y;
  r.root.position.x += Math.sin(f) * root[1] + Math.cos(f) * root[0];
  r.root.position.z += Math.cos(f) * root[1] - Math.sin(f) * root[0];
}

/**
 * ORDER 319b — den nyfikna, ur simuleringens tid (sim/curious.ts curiousPhase): saktar in, går till
 * skylten, läser, luktar och pekar mot röken, tittar på klockan och tvekar (Designs ordning). Kortet
 * öppet: tvekar. Nästan: tvekar, tittar på klockan och tvekar igen.
 */
function poseCurious(r: FigureRig, w: TruckWalker, p: [number, number], cur: CuriousGuest, t: number, at: TruckFrame): void {
  r.root.position.set(p[0], 0, p[1]);
  const read = toWorld(at, CURIOUS_SPOTS.readSpot[0], CURIOUS_SPOTS.readSpot[1]);
  const sign = toWorld(at, MENU_BOARD.at[0], MENU_BOARD.at[1]);
  const smoke = toWorld(at, TRUCK_LAYOUT.chimney[0], TRUCK_LAYOUT.chimney[1]);
  const facingSign = Math.atan2(sign[0] - read[0], sign[1] - read[1]);
  const phase = curiousPhase(cur);
  const P = CURIOUS.phaseSeconds;
  if (phase === 'approach' || ((phase === 'slowDown' || phase === 'toSign') && !w.settled)) {
    r.root.rotation.y = w.yaw;
    const stride = w.walkedM / TRUCK_GUESTS.strideM;
    const yaw = yawTo(w.x, w.z, w.yaw, smoke[0], smoke[1]);
    applyPose(r, phase === 'slowDown' ? sampleClip('guest.slowDown', cur.real, 'normal', { phase: stride, yaw }).pose : poseWalk(stride));
    return;
  }
  r.root.rotation.y = facingSign;
  const queueEnd = toWorld(at, TRUCK_LAYOUT.queue.line[TRUCK_LAYOUT.queue.line.length - 1][0], TRUCK_LAYOUT.queue.line[TRUCK_LAYOUT.queue.line.length - 1][1]);
  const qx = queueEnd[0] - read[0], qz = queueEnd[1] - read[1], ql = Math.hypot(qx, qz) || 1;
  const f = facingSign, fwd: [number, number] = [Math.sin(f), Math.cos(f)], right: [number, number] = [Math.cos(f), -Math.sin(f)];
  const toQueue: [number, number] = [(qx * right[0] + qz * right[1]) / ql, (qx * fwd[0] + qz * fwd[1]) / ql];
  const ctx = {
    lookQueue: yawTo(read[0], read[1], f, queueEnd[0], queueEnd[1]),
    lookPath: cur.side === 'west' ? yawTo(0, 0, f, Math.cos(at.rotationY), -Math.sin(at.rotationY)) : yawTo(0, 0, f, -Math.cos(at.rotationY), Math.sin(at.rotationY)),
    toQueue
  };
  let clip: string, u: number;
  if (cur.answer && cur.okLeft !== null) {
    const k = CURIOUS.okHoldSeconds - cur.okLeft;
    const h1 = CLIPS['guest.hesitate'].seconds.normal, cw = CLIPS['guest.checkWatchStand'].seconds.normal;
    if (k < h1) { clip = 'guest.hesitate'; u = k; } else if (k < h1 + cw) { clip = 'guest.checkWatchStand'; u = k - h1; } else { clip = 'guest.hesitate'; u = k - h1 - cw; }
  } else if (cur.card || phase === 'hesitate') { clip = 'guest.hesitate'; u = cur.card ? t : cur.real - (P.slowDown + P.toSign + P.read + P.smell + P.watch); }
  else if (phase === 'read') { clip = 'guest.readSign'; u = cur.real - P.slowDown - P.toSign; }
  else if (phase === 'smell') { clip = 'guest.smellPoint'; u = cur.real - P.slowDown - P.toSign - P.read; }
  else if (phase === 'watch') { clip = 'guest.checkWatchStand'; u = cur.real - P.slowDown - P.toSign - P.read - P.smell; }
  else { clip = 'guest.queueCalm'; u = t; }
  const yaw = clip === 'guest.smellPoint' ? yawTo(read[0], read[1], f, smoke[0], smoke[1]) : 0;
  const smp = sampleClip(clip, u, 'normal', { ...ctx, yaw });
  applyPose(r, smp.pose);
  addRoot(r, smp.root);
}

/** Figurens läge och pose: går, står i kön, beställer (pekar i en situation), hämtar eller äter.
 *  ORDER 319b: ritas där trängseln ställer den (`p`); i kön en blick på klockan efter en stund
 *  (`queued`, sekunder i kön); den nyfikna som just svarat vänder sig mot luckan eller skakar på huvudet. */
function poseWalker(r: FigureRig, w: TruckWalker, p: [number, number], t: number, impatient: boolean, pointing: number | null, hatchAt: [number, number], queued: number | null, sinceOutcome: number): void {
  const near = w.spot ? Math.hypot(w.spot.x - w.x, w.spot.z - w.z) : Infinity;
  r.root.position.set(p[0], w.spot && near < STEP_UP_M ? w.spot.y : 0, p[1]);
  r.root.rotation.y = w.yaw;
  if (w.holdS > 0) {
    // Gästen som ska till kön vänder sig mot luckan; den som svarade fel skakar på huvudet.
    const clip = w.leaving ? 'guest.shakeHead' : 'guest.turnToHatch';
    applyPose(r, sampleClip(clip, sinceOutcome, 'normal', { yaw: yawTo(w.x, w.z, w.yaw, hatchAt[0], hatchAt[1]) }).pose);
    return;
  }
  if (!w.settled) {
    // Den nyfikna som går vidare tar upp farten (guest.walkOn) och går sedan som vanligt.
    const walkOn = CLIPS['guest.walkOn'];
    const k = sinceOutcome - (w.curious?.stage === 'walkOn' ? CLIPS['guest.shakeHead'].seconds.normal : 0);
    if (w.curious?.stage === 'walkOn' && k >= 0 && k < walkOn.seconds.normal) applyPose(r, sampleClip('guest.walkOn', k, 'normal', { phase: w.walkedM / TRUCK_GUESTS.strideM }).pose);
    else applyPose(r, poseWalk(w.walkedM / TRUCK_GUESTS.strideM));
    return;
  }
  if (queued !== null && pointing === null) {
    const q = STREET_QUEUE, cw = CLIPS['guest.checkWatchStand'].seconds.normal;
    const k = queued - q.patienceSeconds - (w.spot?.index ?? 0) * q.offsetPerGuestSeconds;
    if (k >= 0 && k % q.watchEverySeconds < cw) { applyPose(r, sampleClip('guest.checkWatchStand', k % q.watchEverySeconds, 'normal').pose); return; }
  }
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
