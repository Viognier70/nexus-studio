// WineBarFigures — figurerna i vinbaren (ORDER 271, Designs paket 1 §2 och
// paket 6 §1–§3).
//
// Monteras av WineBarScene (BrewpubScene.tsx) när vinbarens rum finns.
// Kropparna ligger i en egen grupp BREDVID room.group, med samma placering
// (INSTRUKTION §6: kroppar utanför room.group, färgerna ur rummets palett).
//
// Vad som driver vad (valet i ordern, se wineBarDirector.ts):
//   • simuleringen: vilka gäster som finns, deras plats, nöjdhet och
//     tålamod (F29) — läses rakt ur sim.guests varje bildruta;
//   • wineBarDirector: rörelserna och uppgifterna (serviceFlow.ts vägar,
//     bord och överlämningar), i realtid mot simuleringens händelser;
//   • figureActs/serviceScore: posen.
//
// Inget skapas i renderloopen: riggarna (36 gäster + 6 i personalen) och
// insatsringen byggs en gång när rummet monteras. Bildrutan läser proven
// ur direktören och skriver ledvinklar och placering.
//
// §49: när en raket missas (takeoverActive) lämnar personen i rollen sin
// uppgift och går till raketens bord i stressat tempo, stannar till
// `until` och går tillbaka; det den inte hann göra läggs tillbaka i kön.
// Ringen på golvet står vid sällskapet raketen gäller och fylls med
// stegets tid (active.secondsLeft / secondsTotal).

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimState } from '../simulation/SimulationProvider';
import { useCamera } from '../camera/CameraContext';
import { GRAY_BOX_CAMERA } from '../content/grythyttan';
import { giveUpSatisfaction, queuePatienceSeconds } from '../../sim/knowledgeInService';
import { UNHAPPY_THRESHOLD } from '../simulation/reputation';
import type { SimulationState } from '../types';
import {
  createFigureRig,
  disposeFigureRig,
  applyPose,
  poseIdle,
  poseWalk,
  poseSeated,
  FIGURE,
  type FigurePose,
  type FigureRig
} from './figureRig';
import {
  poseArrive,
  poseWaitCalm,
  poseWaitImpatient,
  poseWaitLeaving,
  poseReadMenu,
  poseOrder,
  poseEat,
  poseDrink,
  poseToast,
  poseTalk,
  poseAskBill,
  posePay,
  poseLeaveHappy,
  poseLeaveUnhappy,
  poseCook,
  poseServe,
  posePour,
  poseDish,
  posePresentBottle,
  createActionRing,
  updateActionRing,
  staffTempo,
  type ActionRing
} from './figureActs';
import { poseTakeOrder, poseSetDown, poseSitTransition, poseNod, poseAttend } from './serviceScore';
import { groupsFor } from './serviceFlow';
import {
  walkPathToSeat,
  exitPathFromSeat,
  GUEST_GARMENTS,
  STAFF_UNIFORMS,
  LIGHT_MOODS,
  type MoodId,
  type WineBarRoom,
  type Vec2
} from './wineBarRoom';
import {
  WineBarDirector,
  STAFF_KEYS,
  type FigureSample,
  type StaffKey,
  type TakeoverInput
} from './wineBarDirector';

/** Så många gäster kan synas samtidigt: tjugo platser och en kö. */
export const WINE_BAR_GUEST_POOL = 36;

/**
 * ORDER 271 — kvällsljuset i vinbaren (FLAGS.lighting: rummet skapar inga
 * ljuskällor, scenen gör det). Fem punktljus, inte ett per ljus eller pendel:
 * en varm fyllning mitt i rummet, två över baren (pendlarnas färg och höjd)
 * och två låga över bordsbanden (ljusens färg; loungen i norr, tvåorna i
 * söder). Lågorna och pendlarna är rummets självlysande material. Styrkan
 * följer LIGHT_MOODS[stämning].ambientScale och servicen (utanför servicen
 * 35 %, samma andel som PlayerBusiness interiörljus). Inga skuggor.
 */
export const WINE_BAR_LIGHTS = {
  fill: { y: 3.1, distance: 16, intensity: 46 },
  bar: { y: 2.3, distance: 6.5, intensity: 14, x: [-2.4, 0.8] as number[] },
  tables: { y: 1.5, distance: 5.5, intensity: 7, z: [4.5, -4.2] as number[], x: [-0.2, -2.1] as number[] },
  offServiceShare: 0.35,
  /** ambientScale i 'tidig' — styrkorna ovan är satta mot den. */
  referenceScale: LIGHT_MOODS.tidig.ambientScale
};

/** Höften över riggens rot när figuren sitter (poseSeated sänker höften). */
export const SEATED_HIP_Y = FIGURE.hipY - (poseSeated(0).hipDrop ?? 0);

const STAFF_COLOUR: Record<StaffKey, string> = {
  server: STAFF_UNIFORMS.server,
  server2: STAFF_UNIFORMS.server,
  bartender: STAFF_UNIFORMS.bartender,
  sommelier: STAFF_UNIFORMS.sommelier,
  cook: STAFF_UNIFORMS.kitchen,
  dish: STAFF_UNIFORMS.kitchen
};

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function garmentFor(id: string): string {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return GUEST_GARMENTS[(h >>> 0) % GUEST_GARMENTS.length];
}

/** Provet från direktören → en pose ur figureActs/serviceScore. */
export function poseForSample(s: FigureSample, staff: boolean): FigurePose {
  const t = s.phase;
  const o = { progress: s.progress, targetYaw: s.targetYaw, stress: s.stress, seated: s.seated };
  switch (s.pose) {
    case 'walk':
      return poseWalk(t, { intensity: staff ? staffTempo(s.stress).stride : 1 });
    case 'arrive': return poseArrive(t, o);
    case 'leaveHappy': return poseLeaveHappy(t, o);
    case 'leaveUnhappy': return poseLeaveUnhappy(t, o);
    case 'serveWalk':
    case 'carry': return poseServe(t, o);
    case 'sitDown': return poseSitTransition(t, s.progress, false);
    case 'standUp': return poseSitTransition(t, s.progress, true);
    case 'sit': return poseSitTransition(t, s.progress, false);
    case 'readMenu': return poseReadMenu(t, o);
    case 'waitCalm': return poseWaitCalm(t, o);
    case 'waitImpatient': return poseWaitImpatient(t, o);
    case 'waitLeaving': return poseWaitLeaving(t, o);
    case 'order': return poseOrder(t, o);
    case 'drink': return poseDrink(t, o);
    case 'talk': return poseTalk(t, o);
    case 'toast': return poseToast(t, o);
    case 'eat': return poseEat(t, o);
    case 'askBill': return poseAskBill(t, o);
    case 'pay': return posePay(t, o);
    case 'takeOrder': return poseTakeOrder(t, o);
    case 'serve':
    case 'clear': return poseSetDown(t, o);
    case 'pour': return posePour(t, o);
    case 'present': return posePresentBottle(t, o);
    case 'nod': return poseNod(t, o);
    case 'cook': return poseCook(t, o);
    case 'dish': return poseDish(t, o);
    // Övertagandet vid bordet (§49): lyssnar in och tar hand om det, i en
    // loop på fyra sekunder så att huvudet pendlar mellan gäst och block.
    case 'handle': return poseTakeOrder(t, { progress: (t % 4) / 4, targetYaw: 0 });
    case 'idle': return staff ? poseAttend(t, { clasp: false }) : poseIdle(t);
    case 'hidden':
    default:
      return poseIdle(t);
  }
}

function applySample(rig: FigureRig, sample: FigureSample, staff: boolean, visibility: number): void {
  rig.root.visible = sample.visible;
  if (!sample.visible) return;
  rig.root.position.set(sample.x, sample.y, sample.z);
  rig.root.rotation.y = sample.facing;
  applyPose(rig, poseForSample(sample, staff));
  const wantTransparent = visibility < 0.99;
  for (let m = 0; m < rig.materials.length; m++) {
    const mat = rig.materials[m];
    mat.opacity = visibility;
    if (mat.transparent !== wantTransparent) { mat.transparent = wantTransparent; mat.needsUpdate = true; }
  }
}

interface Lights { fill: THREE.PointLight; bar: THREE.PointLight[]; tables: THREE.PointLight[] }

interface Cast {
  director: WineBarDirector;
  group: THREE.Group;
  guestRigs: FigureRig[];
  guestIds: (string | null)[];
  staffRigs: FigureRig[];
  ring: ActionRing;
  shadowsOn: boolean;
  lights: Lights;
}

interface Props {
  room: WineBarRoom;
  mood: MoodId;
}

export function WineBarFigures({ room, mood }: Props) {
  const moodRef = useRef<MoodId>(mood);
  moodRef.current = mood;
  const sim = useSimState();
  const simRef = useRef<SimulationState>(sim);
  simRef.current = sim;
  const { actualRef } = useCamera();
  const castRef = useRef<Cast | null>(null);
  const clockRef = useRef<number>(-Infinity);

  // Övertagandet som direktören läser: byggs när utfallet byts, inte per bildruta.
  const outcome = sim.incidents?.lastOutcome ?? null;
  const takeover: TakeoverInput | null = useMemo(() => {
    const to = outcome?.takeover;
    if (!outcome || !to) return null;
    const rec = [...(sim.incidents?.log ?? [])].reverse().find((r) => r.id === outcome.incidentId);
    return {
      key: String(outcome.at) + ':' + outcome.incidentId,
      role: to.role,
      until: to.until,
      guestIds: rec?.context.guestIds ?? [],
      table: rec?.context.table ?? 1
    };
    // Loggen läses bara när utfallet byts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome]);
  const takeoverRef = useRef<TakeoverInput | null>(takeover);
  takeoverRef.current = takeover;

  useEffect(() => {
    const group = new THREE.Group();
    group.name = 'wineBarFigures';
    group.position.copy(room.group.position);
    group.rotation.copy(room.group.rotation);
    const parent = room.group.parent;
    if (!parent) return;
    parent.add(group);

    // Kön utanför dörren: interiorLayouts köplatser är OBB-lokala på samma
    // axlar som rummet (rummet placeras i OBB:ns centrum med -angle), så de
    // ligger i +X-änden bortom entrén. Här läggs de på rad från väntplatsen.
    const queueSlots: Vec2[] = [];
    for (let i = 0; i < 10; i++) {
      const row = Math.floor(i / 2);
      queueSlots.push([room.waitingSpot[0] + 0.8 * row, (i % 2 === 0 ? -0.5 : 0.5)]);
    }
    const director = new WineBarDirector(
      {
        seats: room.seats,
        staffStations: room.staffStations,
        entrance: room.entrance,
        waitingSpot: room.waitingSpot,
        floorY: room.floorY,
        width: room.width,
        depth: room.depth
      },
      {
        walkPathToSeat: (id) => walkPathToSeat(room, id),
        exitPathFromSeat: (id) => exitPathFromSeat(room, id),
        groups: groupsFor(room),
        queueSlots,
        spawn: [room.waitingSpot[0] + 6, 0],
        poolSize: WINE_BAR_GUEST_POOL,
        seatedHipY: SEATED_HIP_Y
      }
    );
    const guestRigs: FigureRig[] = [];
    for (let i = 0; i < WINE_BAR_GUEST_POOL; i++) {
      const rig = createFigureRig({ variant: 'guest', garmentColour: GUEST_GARMENTS[i % GUEST_GARMENTS.length] });
      rig.root.visible = false;
      group.add(rig.root);
      guestRigs.push(rig);
    }
    const staffRigs: FigureRig[] = STAFF_KEYS.map((k) => {
      const rig = createFigureRig({ variant: 'staff', garmentColour: STAFF_COLOUR[k] });
      group.add(rig.root);
      return rig;
    });
    // Kvällsljuset (WINE_BAR_LIGHTS), byggt en gång; styrkan sätts per bildruta.
    const L = WINE_BAR_LIGHTS;
    const point = (colour: string, x: number, y: number, z: number, distance: number) => {
      const l = new THREE.PointLight(colour, 0, distance, 2);
      l.castShadow = false;
      l.position.set(x, room.floorY + y, z);
      group.add(l);
      return l;
    };
    const lights: Lights = {
      fill: point(LIGHT_MOODS.tidig.ambientColour, 0, L.fill.y, 0, L.fill.distance),
      bar: L.bar.x.map((x) => point(LIGHT_MOODS.tidig.pendantColour, x, L.bar.y, 0, L.bar.distance)),
      tables: L.tables.z.map((z, i) => point(LIGHT_MOODS.tidig.candleColour, L.tables.x[i], L.tables.y, z, L.tables.distance))
    };
    const ring = createActionRing();
    ring.group.visible = false;
    group.add(ring.group);
    castRef.current = {
      director, group, guestRigs, guestIds: guestRigs.map(() => null), staffRigs, ring, shadowsOn: true, lights
    };
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      (window as unknown as { __nxWineBarDirector?: unknown }).__nxWineBarDirector = director;
    }
    return () => {
      guestRigs.forEach(disposeFigureRig);
      staffRigs.forEach(disposeFigureRig);
      ring.dispose();
      group.removeFromParent();
      castRef.current = null;
    };
  }, [room]);

  useFrame((_, delta) => {
    const cast = castRef.current;
    if (!cast) return;
    const s = simRef.current;

    // Klockan: simuleringen stegar i 0,2 s. Figurerna går mjukt mellan
    // stegen och hålls inom ett steg från simuleringens tid.
    const speed = s.speed ?? 1;
    let t = clockRef.current + Math.min(delta, 0.1) * speed;
    if (!Number.isFinite(t) || Math.abs(t - s.simTime) > 1) t = s.simTime;
    t = Math.min(Math.max(t, s.simTime - 0.25), s.simTime + 0.2);
    clockRef.current = t;

    const to = takeoverRef.current;
    cast.director.update({
      t,
      guests: s.guests,
      patienceSeconds: queuePatienceSeconds(s),
      giveUpSatisfaction: giveUpSatisfaction(s),
      unhappyThreshold: UNHAPPY_THRESHOLD,
      takeover: to && s.simTime < to.until ? to : null
    });

    // Samma tonband som InteriorGuests: figurerna syns när kameran är nära.
    const dist = actualRef.current.distance;
    const visibility = 1 - smoothstep(
      GRAY_BOX_CAMERA.restaurantInteriorFadeMid - GRAY_BOX_CAMERA.restaurantInteriorFadeHalf,
      GRAY_BOX_CAMERA.restaurantInteriorFadeMid + GRAY_BOX_CAMERA.restaurantInteriorFadeHalf,
      dist
    );
    cast.group.visible = visibility > 0.02;
    if (!cast.group.visible) return;

    // Kvällsljuset: stämningen och servicen.
    const m = LIGHT_MOODS[moodRef.current];
    const inService = s.day.period === 'lunch' || s.day.period === 'dinner';
    const k = (m.ambientScale / WINE_BAR_LIGHTS.referenceScale) * (inService ? 1 : WINE_BAR_LIGHTS.offServiceShare) * visibility;
    cast.lights.fill.intensity = WINE_BAR_LIGHTS.fill.intensity * k;
    cast.lights.fill.color.set(m.ambientColour);
    for (const l of cast.lights.bar) { l.intensity = WINE_BAR_LIGHTS.bar.intensity * k; l.color.set(m.pendantColour); }
    for (const l of cast.lights.tables) l.intensity = WINE_BAR_LIGHTS.tables.intensity * k;
    const shadows = visibility > 0.5;

    const gs = cast.director.guestSamples;
    for (let i = 0; i < gs.length; i++) {
      const rig = cast.guestRigs[i];
      const sample = gs[i];
      if (sample.guestId !== cast.guestIds[i]) {
        cast.guestIds[i] = sample.guestId;
        if (sample.guestId) rig.garment.color.set(garmentFor(sample.guestId));
      }
      applySample(rig, sample, false, visibility);
    }
    const ss = cast.director.staffSamples;
    for (let i = 0; i < ss.length; i++) applySample(cast.staffRigs[i], ss[i], true, visibility);

    // CLAUDE.md renderregler: skuggan följer opaciteten.
    if (shadows !== cast.shadowsOn) {
      cast.shadowsOn = shadows;
      cast.group.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.parent !== cast.ring.group) o.castShadow = shadows; });
    }

    // Ringen: vid sällskapet raketen gäller, fylld med stegets tid.
    const active = s.incidents?.active ?? null;
    if (active && active.context.guestIds.length > 0) {
      let x = 0; let z = 0; let n = 0;
      for (let i = 0; i < gs.length; i++) {
        const g = gs[i];
        if (!g.visible || !g.guestId || !active.context.guestIds.includes(g.guestId)) continue;
        x += g.x; z += g.z; n++;
      }
      if (n > 0) {
        cast.ring.group.visible = true;
        cast.ring.group.position.set(x / n, room.floorY, z / n);
        const total = active.secondsTotal > 0 ? active.secondsTotal : 1;
        updateActionRing(cast.ring, 1 - Math.max(0, active.secondsLeft) / total);
      } else {
        cast.ring.group.visible = false;
      }
    } else {
      cast.ring.group.visible = false;
    }
  });

  return null;
}
