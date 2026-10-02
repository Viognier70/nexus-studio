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
//
// ORDER 286a (Designs leverans 2, teaterns grund): klippen i stället för
// poserna, rekvisitan ur regissörens ägarbok och raketen som börjar i rummet
// (theatreStage.ts). Figuren som raketen pekar på (IncidentContext.figure)
// spelar sitt klipp, kameran glider in, ringen står vid figuren och
// bildtexten visas vid den tills svaret är satt.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
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
import { poseTakeOrder, poseSetDown, poseSitTransition, poseNod, poseAttend, poseFillWork, poseWelcome, IDLE_RULE } from './serviceScore';
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
  type TakeoverInput,
  PASS_FLOOR
} from './wineBarDirector';
import { TheatreStage } from './theatreStage';
import { play } from '../ui/sound/sound';
import { createStaffMark, disposeStaffMark, updateStaffMark, type StaffMark } from './staffMarks';
import { seatKindFromRoom, type ClipSample } from './figureClips';
import { WARM } from '../../ui/theme/nexusTheme.warm';
import type { GuestType } from '../types';
import { ANSWER_EFFECTS, THEATRE } from '../../sim/balance';
import type { ActiveIncident } from '../../sim/incidents';
import { strings } from '../../content/strings';
import { TheatreCaption } from '../ui/TheatreCaption';
import { RoomReactionTag } from '../ui/RoomReactionTag';
import { InteractionDirector } from './theatreInteractions';
import { attachProps, type HeadToppingId, type PropHandle } from './figureProps';
import { auditRig, publishFaults, type FigureFault } from './figureAudit';
import { beforeDoors } from '../../sim/clock';
import { EventPlayer } from './theatreEvents';
import { theatreSeats } from './eventTheatre';
import type { CameraTarget } from '../types';

// ORDER 293 — strålkastaren sänker rummets ljus (Designs teaterScen.js: 45 %),
// och klipp där manuset lägger figuren lågt (figurvakten räknar dem inte).
const THEATRE_SPOT = { dim: 0.55 };
const THEATRE_LOW_CLIPS = new Set(['staff.kneelTalk', 'staff.sweep', 'staff.wipeFloor', 'guest.slip', 'staff.smother', 'guest.wheel', 'guest.wheelRoll', 'guest.wheelTurn', 'guest.wheelToTable', 'bar.stockFridge', 'staff.carryCrate']);

// ORDER 292b — figurmätningen var femtonde bildruta.
const AUDIT_EVERY_FRAMES = 15;

// ORDER 292 — gästernas frisyrer och bonader (figureProps.ts), mest hår.
const GUEST_TOPPINGS: readonly HeadToppingId[] = ['shortCut', 'ruffled', 'grayHair', 'shortCut', 'ruffled', 'workCap', 'shortCut', 'grayHair', 'ruffled', 'sunHat', 'shortCut', 'hoodRaised'];

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
  dish: STAFF_UNIFORMS.kitchen,
  host: STAFF_UNIFORMS.host
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
    // ORDER 292 — IDLE_RULE och värden i dörren (serviceScore.ts).
    case 'fillWork': return poseFillWork(t, IDLE_RULE.server.intensity);
    case 'attend': return poseAttend(t, { clasp: false });
    case 'welcome': return poseWelcome(t, { progress: s.progress > 0 ? s.progress : (t % 3) / 3 });
    case 'hidden':
    default:
      return poseIdle(t);
  }
}

function applySample(rig: FigureRig, sample: FigureSample, staff: boolean, visibility: number, clip?: ClipSample | null): void {
  rig.root.visible = sample.visible;
  if (!sample.visible) return;
  rig.root.position.set(sample.x, sample.y, sample.z);
  rig.root.rotation.y = sample.facing;
  applyPose(rig, clip ? clip.pose : poseForSample(sample, staff));
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
  guestTypes: (GuestType | null)[];
  staffRigs: FigureRig[];
  ring: ActionRing;
  staffMarks: StaffMark[];
  lastPose: (string | null)[];
  shadowsOn: boolean;
  lights: Lights;
  stage: TheatreStage;
  staffClips: (ClipSample | null)[];
  guestClips: (ClipSample | null)[];
  guestClipIds: (string | null)[];
  /** Gästen som går mot köket (raketen walkToKitchen): hur långt hon kommit, 0..1. */
  kitchenWalk: { guestId: string | null; u: number };
  /** ORDER 292 — samspelen (theatreInteractions.ts). */
  interactions: InteractionDirector;
  /** ORDER 292 — handrekvisitan per gästfigur (figureProps.ts). */
  guestHandProps: { briefcase: PropHandle; camera: PropHandle }[];
  /** ORDER 292b — räknaren för figurmätningen (figureAudit.ts). */
  auditTick: number;
  /** ORDER 293 — händelserna som teater (theatreEvents.ts) och kameran före. */
  events: EventPlayer;
  eventSaved: CameraTarget | null;
  spotK: number;
}

/** Bildtexten vid figuren när raketen börjar i rummet (nexusStrings theatre.caption). */
function theatreCaption(active: ActiveIncident | null): string | null {
  const fig = active?.context.figure;
  if (!active || !fig || active.backed) return null;
  const c = strings.theatre.caption;
  switch (fig.clip) {
    case 'cutHand': return c.cutHand;
    case 'smellWine': return c.smellWine;
    case 'askPointMenu': return c.askPointMenu(String(active.context.table));
    case 'walkToKitchen': return c.walkToKitchen;
    default: return null;
  }
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
  const { actualRef, targetRef } = useCamera();
  const castRef = useRef<Cast | null>(null);
  const captionRef = useRef<THREE.Group>(null);
  // ORDER 292 — svarets händelse står över bordet (rummets reaktion).
  const reactionRef = useRef<THREE.Group>(null);
  // ORDER 292b — rummets etiketter (bildtexten och händelsen) ritas bara när
  // rummet syns; drei:s Html ritar annars sin DOM över byn när kameran är ute.
  const [roomShown, setRoomShown] = useState(false);
  const roomShownRef = useRef(false);
  const reactionAt = useRef<{ x: number; z: number } | null>(null);
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

    // ORDER 293 — Designs köplatser (wineBarRoom queueSpots, vardagens
    // koreografi §3): två på dörrmattan och fem på trottoaren, ett sällskap per
    // plats och medlemmarna inom 0,6 m från punkten (fyra platser runt punkten).
    const QUEUE_SPOT_SIZE = 4;
    const queueSlots: Vec2[] = [];
    const queueFacings: number[] = [];
    const spots = [...(room.queueSpots ?? [])].sort((a, b) => a.order - b.order);
    for (const q of spots) {
      const f = q.facing;
      // Sidled och bakåt i förhållande till riktningen (framåt är +sin/+cos).
      const fx = Math.sin(f), fz = Math.cos(f), sx = Math.cos(f), sz = -Math.sin(f);
      for (const [side, back] of [[-0.28, 0], [0.28, 0], [-0.28, -0.45], [0.28, -0.45]]) {
        queueSlots.push([q.local[0] + sx * side + fx * back, q.local[1] + sz * side + fz * back]);
        queueFacings.push(f);
      }
    }
    if (queueSlots.length === 0) {
      for (let i = 0; i < 10; i++) {
        const row = Math.floor(i / 2);
        queueSlots.push([room.waitingSpot[0] + 0.8 * row, (i % 2 === 0 ? -0.5 : 0.5)]);
      }
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
        queueFacings: queueFacings.length > 0 ? queueFacings : undefined,
        queueSpotSize: queueFacings.length > 0 ? QUEUE_SPOT_SIZE : 1,
        miseSpots: room.miseSpots,
        spawn: [room.waitingSpot[0] + 6, 0],
        poolSize: WINE_BAR_GUEST_POOL,
        seatedHipY: SEATED_HIP_Y
      }
    );
    const guestRigs: FigureRig[] = [];
    const guestHandProps: { briefcase: PropHandle; camera: PropHandle }[] = [];
    for (let i = 0; i < WINE_BAR_GUEST_POOL; i++) {
      const rig = createFigureRig({ variant: 'guest', garmentColour: GUEST_GARMENTS[i % GUEST_GARMENTS.length] });
      rig.root.visible = false;
      group.add(rig.root);
      guestRigs.push(rig);
      // ORDER 292 — Designs figureProps.ts: en frisyr eller bonad per figur, och
      // handrekvisitan (portföljen, kameran) som tänds per gäst när hen går.
      attachProps(rig, { headTopping: GUEST_TOPPINGS[i % GUEST_TOPPINGS.length] });
      const [briefcase] = attachProps(rig, { hand: 'briefcase', side: 1 });
      const [camera] = attachProps(rig, { hand: 'camera', side: -1 });
      briefcase.group.visible = false;
      camera.group.visible = false;
      guestHandProps.push({ briefcase, camera });
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
    // ORDER 290 — ring och linje under personalen, med rollens färg.
    const staffMarks = STAFF_KEYS.map((k) => { const m = createStaffMark(k); group.add(m.group); return m; });
    const stage = new TheatreStage(group, room.floorY, STAFF_KEYS.length, WINE_BAR_GUEST_POOL);
    castRef.current = {
      director, group, guestRigs, guestIds: guestRigs.map(() => null), guestTypes: guestRigs.map(() => null), lastPose: guestRigs.map(() => null), staffRigs, ring, staffMarks, shadowsOn: true, lights,
      stage,
      staffClips: staffRigs.map(() => null),
      guestClips: guestRigs.map(() => null),
      guestClipIds: guestRigs.map(() => null),
      kitchenWalk: { guestId: null, u: 0 },
      guestHandProps,
      auditTick: 0,
      interactions: new InteractionDirector(),
      events: new EventPlayer(group, room.floorY, theatreSeats(room.seats)),
      eventSaved: null,
      spotK: 0
    };
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      (window as unknown as { __nxWineBarDirector?: unknown }).__nxWineBarDirector = director;
      (window as unknown as { __nxWineBarGroup?: unknown }).__nxWineBarGroup = group;
    }
    return () => {
      guestRigs.forEach(disposeFigureRig);
      staffRigs.forEach(disposeFigureRig);
      ring.dispose();
      staffMarks.forEach(disposeStaffMark);
      stage.dispose();
      castRef.current?.events.dispose();
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
      takeover: to && s.simTime < to.until ? to : null,
      // ORDER 293 — före dörrarna: mise en place.
      prep: beforeDoors(s)
    });

    // Samma tonband som InteriorGuests: figurerna syns när kameran är nära.
    const dist = actualRef.current.distance;
    const visibility = 1 - smoothstep(
      GRAY_BOX_CAMERA.restaurantInteriorFadeMid - GRAY_BOX_CAMERA.restaurantInteriorFadeHalf,
      GRAY_BOX_CAMERA.restaurantInteriorFadeMid + GRAY_BOX_CAMERA.restaurantInteriorFadeHalf,
      dist
    );
    cast.group.visible = visibility > 0.02;
    if (cast.group.visible !== roomShownRef.current) {
      roomShownRef.current = cast.group.visible;
      setRoomShown(cast.group.visible);
    }
    if (!cast.group.visible) return;

    // Kvällsljuset: stämningen och servicen.
    const m = LIGHT_MOODS[moodRef.current];
    const inService = s.day.period === 'lunch' || s.day.period === 'dinner';
    // ORDER 293 — strålkastaren: resten av rummet till 45 % ljus (Designs teaterScen.js spot).
    const k = (m.ambientScale / WINE_BAR_LIGHTS.referenceScale) * (inService ? 1 : WINE_BAR_LIGHTS.offServiceShare) * visibility * (1 - THEATRE_SPOT.dim * cast.spotK);
    cast.lights.fill.intensity = WINE_BAR_LIGHTS.fill.intensity * k;
    cast.lights.fill.color.set(m.ambientColour);
    for (const l of cast.lights.bar) { l.intensity = WINE_BAR_LIGHTS.bar.intensity * k; l.color.set(m.pendantColour); }
    for (const l of cast.lights.tables) l.intensity = WINE_BAR_LIGHTS.tables.intensity * k;
    const shadows = visibility > 0.5;

    const active = s.incidents?.active ?? null;
    const fig = active && !active.backed ? active.context.figure ?? null : null;
    const now = s.simTime;
    let figureLocal: { x: number; y: number; z: number } | null = null;

    const gs = cast.director.guestSamples;
    // ORDER 292 — samspelen den här bildrutan: klipp och tid för båda parterna.
    const together = cast.interactions.frame(cast.director, STAFF_KEYS, t);
    const kw = cast.kitchenWalk;
    for (let i = 0; i < gs.length; i++) {
      const rig = cast.guestRigs[i];
      const sample = gs[i];
      // ORDER 287a — gästtypens färg ur Designs WARM.guest (studenten,
      // medelinkomst, höginkomst, socialt kapital, miljardären i guld).
      // Gäster utan typ (äldre fixturer) behåller rummets dova plagg.
      const simGuest = sample.guestId ? s.guests.find((g) => g.id === sample.guestId) ?? null : null;
      const guestType = simGuest?.guestType ?? null;
      // ORDER 292 — handrekvisitan medan gästen går eller står i kön: portföljen
      // för bilarna från Örebro och Karlstad, kameran för bussen.
      const walking = sample.visible && !sample.seated && (sample.pose === 'walk' || sample.pose === 'arrive' || sample.pose === 'waitCalm' || sample.pose === 'waitImpatient' || sample.pose === 'leaveHappy' || sample.pose === 'leaveUnhappy');
      cast.guestHandProps[i].briefcase.group.visible = walking && simGuest?.waveId === 'cars';
      cast.guestHandProps[i].camera.group.visible = walking && simGuest?.waveId === 'bus';
      // ORDER 290 — klirr när gäster skålar (ljudet, sound.ts).
      if (sample.visible && sample.pose === 'toast' && cast.lastPose[i] !== 'toast') play('clink');
      cast.lastPose[i] = sample.visible ? sample.pose : null;
      if (sample.guestId !== cast.guestIds[i] || guestType !== cast.guestTypes[i]) {
        cast.guestIds[i] = sample.guestId;
        cast.guestTypes[i] = guestType;
        if (sample.guestId) rig.garment.color.set(guestType ? WARM.guest[guestType] : garmentFor(sample.guestId));
      }
      // Sittregeln för alla sitsar (tillägget till leverans 2): barstol, lounge och stol.
      const seat = sample.guestId ? cast.director.guestSeat(sample.guestId) : null;
      const seatKind = seat ? seatKindFromRoom(room.seats[seat.seatIndex]?.kind ?? 'twotop') : null;
      const isFigure = !!fig && fig.kind === 'guest' && fig.guestId === sample.guestId && sample.visible;
      // Raketen walkToKitchen: gästen reser sig och går mot köket medan introt
      // går, står kvar tills svaret är satt och går sedan tillbaka till stolen.
      let walkSample = sample;
      if (sample.guestId && (kw.guestId === sample.guestId || (isFigure && fig!.clip === 'walkToKitchen'))) {
        const going = isFigure && fig!.clip === 'walkToKitchen';
        if (going) { kw.guestId = sample.guestId; kw.u = Math.min(1, kw.u + delta / THEATRE.rocketIntroSeconds.walkToKitchen); }
        else kw.u = Math.max(0, kw.u - delta / THEATRE.rocketIntroSeconds.walkToKitchen);
        if (kw.u <= 0 && !going) kw.guestId = null;
        if (kw.u > 0) {
          const k = kw.u * kw.u * (3 - 2 * kw.u) * THEATRE.kitchenWalkShare;
          const dx = PASS_FLOOR[0] - sample.x; const dz = PASS_FLOOR[1] - sample.z;
          walkSample = {
            ...sample,
            x: sample.x + dx * k, y: room.floorY, z: sample.z + dz * k,
            facing: going ? Math.atan2(dx, dz) : Math.atan2(-dx, -dz),
            pose: going && kw.u >= 1 ? 'idle' : 'walk', seated: false, phase: kw.u * 4
          };
        }
      }
      const clip = walkSample !== sample
        ? (walkSample.pose === 'walk' ? cast.stage.guestPose(i, walkSample, null, null) : null)
        : cast.stage.guestPose(i, sample, seatKind, active && !active.backed ? active : null, sample.guestId ? together.guests.get(sample.guestId) ?? null : null);
      // Klippen sänker höften själva från golvet (SEAT_KINDS[sort].drop); regissörens
      // höjd för sittande (seatSurfaceY − SEATED_HIP_Y) gäller figureActs-poserna.
      if (clip && walkSample === sample && seat && (sample.seated || sample.pose === 'sitDown' || sample.pose === 'standUp')) {
        walkSample = { ...sample, y: room.floorY };
      }
      cast.guestClips[i] = clip;
      cast.guestClipIds[i] = clip ? cast.stage.guestClipId(i) : null;
      applySample(rig, walkSample, false, visibility, clip);
      if (isFigure) figureLocal = { x: rig.root.position.x, y: rig.root.position.y, z: rig.root.position.z };
    }
    const ss = cast.director.staffSamples;
    for (let i = 0; i < ss.length; i++) {
      const key = STAFF_KEYS[i];
      const clip = cast.stage.staffPose(i, key, ss[i], active && !active.backed ? active : null, now, together.staff.get(i) ?? null);
      cast.staffClips[i] = clip;
      applySample(cast.staffRigs[i], ss[i], true, visibility, clip);
      const rig = cast.staffRigs[i];
      // ORDER 290 — ringen under figuren och linjen till uppgiften.
      const task = inService ? cast.director.staffTask(key, t) : null;
      const working = task && t >= task.arrive && task.done > task.arrive ? Math.min(1, (t - task.arrive) / (task.done - task.arrive)) : null;
      // ORDER 292 — sommeliern i dörren bär värdens färg.
      // ORDER 293 — Per är värden; sommeliern är sommelier hela kvällen.
      updateStaffMark(cast.staffMarks[i], inService && ss[i].visible, { x: rig.root.position.x, z: rig.root.position.z }, task && task.to ? { x: task.to[0], z: task.to[1] } : null, working, room.floorY);
      if (fig && fig.kind === 'staff' && fig.staffKey === key && ss[i].visible) {
        // Den som skär sig backar ett steg (klippets root, i figurens ram).
        if (clip) {
          const f = rig.root.rotation.y;
          rig.root.position.x += Math.sin(f) * clip.root[1] + Math.cos(f) * clip.root[0];
          rig.root.position.z += Math.cos(f) * clip.root[1] - Math.sin(f) * clip.root[0];
        }
        figureLocal = { x: rig.root.position.x, y: rig.root.position.y, z: rig.root.position.z };
      }
    }

    // ORDER 292b — ingen figur ligger ned eller sitter utan sits
    // (figureAudit.ts): riggarna som ritas, var femtonde bildruta.
    cast.auditTick = (cast.auditTick + 1) % AUDIT_EVERY_FRAMES;
    if (cast.auditTick === 0) {
      const floor = cast.group.localToWorld(new THREE.Vector3(0, room.floorY, 0)).y;
      const faults: FigureFault[] = [];
      for (let i = 0; i < gs.length; i++) {
        const id = gs[i].guestId;
        const f = id ? auditRig(cast.guestRigs[i], floor, gs[i], 'guest', id, cast.guestClipIds[i], !!cast.director.guestSeat(id)) : null;
        if (f) faults.push(f);
      }
      for (let i = 0; i < ss.length; i++) {
        const f = auditRig(cast.staffRigs[i], floor, ss[i], 'staff', STAFF_KEYS[i], cast.stage.staffClipId(i), false);
        if (f) faults.push(f);
      }
      // ORDER 293 — händelsernas figurer. Klipp där manuset lägger någon lågt
      // (på huk, sopar, halkar, i rullstol) räknas inte som fel.
      if (cast.events.playing) {
        for (const r of cast.events.theatre.rigs()) {
          if (r.clip && THEATRE_LOW_CLIPS.has(r.clip)) continue;
          const pseudo = { visible: r.rig.root.visible, seated: r.seated, pose: 'idle' } as FigureSample;
          const f = auditRig(r.rig, floor, pseudo, r.kind, `event:${r.id}`, r.clip, r.seated);
          if (f) faults.push(f);
        }
      }
      publishFaults(faults);
    }

    // Rekvisitan: ägarboken och klippens händer (en tallrik på ett ställe).
    cast.stage.props(cast.director, t, STAFF_KEYS, cast.staffRigs, cast.staffClips, cast.guestRigs, cast.guestClips, cast.guestClipIds);

    // CLAUDE.md renderregler: skuggan följer opaciteten.
    if (shadows !== cast.shadowsOn) {
      cast.shadowsOn = shadows;
      const marks = new Set(cast.staffMarks.map((m) => m.group));
      cast.group.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.parent !== cast.ring.group && !(o.parent && marks.has(o.parent as THREE.Group))) o.castShadow = shadows; });
    }

    // Ringen: vid figuren raketen pekar på (annars vid sällskapet), fylld med stegets tid.
    let ringAt: { x: number; z: number } | null = figureLocal;
    if (!ringAt && active && active.context.guestIds.length > 0) {
      let x = 0; let z = 0; let n = 0;
      for (let i = 0; i < gs.length; i++) {
        const g = gs[i];
        if (!g.visible || !g.guestId || !active.context.guestIds.includes(g.guestId)) continue;
        x += g.x; z += g.z; n++;
      }
      if (n > 0) ringAt = { x: x / n, z: z / n };
    }

    // Kameran glider in mot figuren och tillbaka efter svaret. ORDER 292 —
    // vid varje raket: figuren, annars bordet, annars rummets mitt.
    const focusLocal = figureLocal ?? (ringAt ? { x: ringAt.x, y: room.floorY, z: ringAt.z } : active ? { x: 0, y: room.floorY, z: 0 } : null);
    // ORDER 293 — händelserna spelas som teater: manusets kamera och strålkastare,
    // och rummets egna figurer vilar medan scenen spelas.
    const ev = cast.events.update(active, s.incidents?.log ?? [], Math.min(delta, 0.1));
    cast.spotK = ev.spotK;
    cast.events.theatre.setSpot(ev.spot, ev.spotK);
    if (ev.playing) {
      if (!cast.eventSaved) { const c = targetRef.current; cast.eventSaved = { ...c, focus: { ...c.focus } }; }
      if (ev.view && !ev.game) {
        const p = cast.group.localToWorld(new THREE.Vector3(ev.view.tx, room.floorY, ev.view.tz));
        const yaw0 = new THREE.Euler().setFromQuaternion(cast.group.getWorldQuaternion(new THREE.Quaternion()), 'YXZ').y;
        targetRef.current = { focus: { x: p.x, z: p.z }, distance: ev.view.dist, yaw: ev.view.yaw + yaw0, pitch: ev.view.pitch };
      } else if (cast.eventSaved) {
        targetRef.current = { ...cast.eventSaved, focus: { ...cast.eventSaved.focus } };
      }
      for (const r of cast.guestRigs) r.root.visible = false;
      for (const r of cast.staffRigs) r.root.visible = false;
      for (const mk of cast.staffMarks) mk.group.visible = false;
      cast.ring.group.visible = false;
    } else {
      if (cast.eventSaved) { targetRef.current = { ...cast.eventSaved, focus: { ...cast.eventSaved.focus } }; cast.eventSaved = null; }
      cast.stage.camera(targetRef, active, focusLocal, Math.min(delta, 0.1));
    }
    if (active && ringAt && !ev.playing) {
      cast.ring.group.visible = true;
      cast.ring.group.position.set(ringAt.x, room.floorY, ringAt.z);
      const total = active.secondsTotal > 0 ? active.secondsTotal : 1;
      const intro = (active.introLeft ?? 0) > 0;
      updateActionRing(cast.ring, intro ? 0 : 1 - Math.max(0, active.secondsLeft) / total);
    } else {
      cast.ring.group.visible = false;
    }

    // ORDER 292 — svarets händelse över bordet: vid sällskapet (eller gästen
    // som gick, så länge hen syns), annars där den senast stod.
    const reactionGroup = reactionRef.current;
    const react = simRef.current.day.roomReactions?.at(-1);
    if (reactionGroup) {
      const fresh = !!react && simRef.current.simTime - react.at <= ANSWER_EFFECTS.reactionSimSeconds;
      if (fresh && react) {
        const ids = react.leftGuestId ? [react.leftGuestId, ...react.guestIds] : react.guestIds;
        let x = 0; let z = 0; let n = 0;
        for (let i = 0; i < gs.length; i++) {
          const g = gs[i];
          if (!g.visible || !g.guestId || !ids.includes(g.guestId)) continue;
          x += g.x; z += g.z; n++;
        }
        if (n > 0) reactionAt.current = { x: x / n, z: z / n };
      }
      const at = reactionAt.current;
      reactionGroup.visible = fresh && !!at;
      if (fresh && at && reactionGroup.parent) {
        const p = cast.group.localToWorld(new THREE.Vector3(at.x, room.floorY + THEATRE.captionHeightM, at.z));
        reactionGroup.parent.worldToLocal(p);
        reactionGroup.position.copy(p);
      }
    }

    // Bildtexten står ovanför figuren.
    const cap = captionRef.current;
    if (cap) {
      const w = cast.stage.figureWorld;
      cap.visible = !!w;
      if (w && cap.parent) {
        const p = w.clone();
        p.y += THEATRE.captionHeightM;
        cap.parent.worldToLocal(p);
        cap.position.copy(p);
      }
    }
  });

  const caption = theatreCaption(sim.incidents?.active ?? null);
  const reaction = sim.day.roomReactions?.at(-1) ?? null;
  return (
    <>
      {caption && roomShown && (
        <group ref={captionRef} visible={false}>
          <Html center zIndexRange={[20, 0]}>
            <TheatreCaption text={caption} />
          </Html>
        </group>
      )}
      {reaction && roomShown && (
        <group ref={reactionRef} visible={false}>
          <Html center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
            <RoomReactionTag reaction={reaction} />
          </Html>
        </group>
      )}
    </>
  );
}

