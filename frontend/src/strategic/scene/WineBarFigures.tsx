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

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { statusModeOn, subscribeStatusMode } from '../ui/statusMode';
import { staffKnows, incidentArea, staminaOf as simStamina, wellbeingOf as simWellbeing } from '../../sim/staffCondition';
// ORDER 309 — Designs D5: orkringen, trivselplattan, kortet, gästgrupperna och utrustningen.
import { staminaOf, wellbeingOf, type StaminaId } from './staffStatus';
import { createOrkRing, orkFacing, orkRingShown, type OrkRing } from './orkRing';
import { WellbeingLayer, type WellbeingItem } from './wellbeingLayer';
import { withStreetFloorOnTree } from './village/streetFigureLight';
import { applyStreetBlend, beyondDoorMat, dressAllGroups, disposeDressed, showGroup, stepStreetBlend, streetShare, HEAD_SIGNS, type DressedRig } from './guestLooks';
import { GUEST_GROUPS } from './guestGroups';
import { RoomEquipment } from './roomEquipment';
import { PersonalSpace, type MassKind, type SpaceBody } from './personalSpace';
import { hesitationElapsed } from './conditionClips';
import { incidentById } from '../../sim/incidentBank';
import { cardAnchor, openCard, setOpenCard, subscribeOpenCard } from '../ui/statusCardStore';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';
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
  WINE_BAR_PLAN,
  WINE_WALL,
  type MoodId,
  type WineBarRoom,
  type Vec2
} from './wineBarRoom';
import {
  WineBarDirector,
  SIM_ROLE_TO_STAFF,
  STAFF_KEYS,
  type FigureSample,
  type StaffKey,
  type TakeoverInput,
  PASS_FLOOR
} from './wineBarDirector';
import { TheatreStage } from './theatreStage';
import { ConsequenceCamera } from './consequenceCamera';
import { ROOM_CAMERA } from '../camera/roomBounds';
import { roofAt } from '../village/roofBlend';

// ORDER 297 — rummet räknas som synligt när taket har börjat lyftas.
const ROOM_SHOWN_ROOF = 0.99;
import { MoodSymbolLayer, type MoodGroup } from './moodSymbols';
import { attachFace, type FaceHandle } from './figureFace';
import { MoodGestures } from './moodGestures';
import { FACE_STEP, scriptFaceMood } from './scriptFaces';
import { guestMoodValue, moodOf } from '../../sim/guestMood';
import { CONSEQUENCE, FACE, MOOD_SYMBOL } from './guestMood';

// ORDER 299 — klick på ett bord: inom så här många meter från bordets mitt,
// och ett klick är inget drag (pekaren rörde sig högst så här många px).
const TABLE_CLICK_RADIUS_M = 1.5;
const CLICK_SLOP_PX = 5;
// ORDER 299 — symbolen över en ensam gäst: hjässan över sitsen (barstolen) och
// över golvet (stående i kön), plus MOOD_SYMBOL.anchor.guestHeadM.
const SEATED_HEAD_ABOVE_SEAT_M = 0.85;
const STANDING_HEAD_M = 1.7;
const IN_ROOM_STATES = new Set(['waiting', 'seated', 'ordering', 'dining', 'paying']);
import { consequenceElapsed, effectiveSpeed } from '../simulation/consequence';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { play } from '../ui/sound/sound';
import { createStaffMark, disposeStaffMark, updateStaffMark, type StaffMark } from './staffMarks';
import { seatKindFromRoom, type ClipSample } from './figureClips';
import type { GuestType } from '../types';
import { THEATRE } from '../../sim/balance';
import type { ActiveIncident } from '../../sim/incidents';
import { strings } from '../../content/strings';
import { TheatreCaption } from '../ui/TheatreCaption';
import { safeCaptionPosition } from './safeCaption';
import { InteractionDirector } from './theatreInteractions';
import { attachProps, type HeadToppingId, type PropHandle } from './figureProps';
import { auditRig, publishFaults, type FigureFault } from './figureAudit';
import { beforeDoors, clockMinutes } from '../../sim/clock';
import { sampleClip } from './figureClips';
import { calendarFor } from '../../sim/calendar';
import { EventPlayer } from './theatreEvents';
import { theatreSeats } from './eventTheatre';
import type { CameraTarget } from '../types';
import { StaffRingTag } from '../ui/StaffRingTag';
import { HostLayer, WorldHtml } from './HostLayer';
import { MoveMenu } from '../ui/host/HostViews';
import { useLanguage } from '../../content/language';
import { ROLE_OF } from './staffMarks';

// ORDER 293 — strålkastaren sänker rummets ljus (Designs teaterScen.js: 45 %),
// och klipp där manuset lägger figuren lågt (figurvakten räknar dem inte).
const THEATRE_SPOT = { dim: 0.55 };
// ORDER 296 — ringens etikett står över huvudet, och uppgiften läses ur provet.
const RING_TAG_HEIGHT_M = 2.2;
function ringTaskFor(s: FigureSample, detail: string | null): string {
  if (detail === 'bill') return 'bill';
  if (detail === 'wine') return 'wine';
  switch (s.pose) {
    case 'walk': return s.carrying ? 'carry' : 'walk';
    case 'serveWalk': case 'carry': return 'carry';
    case 'takeOrder': case 'handle': return 'order';
    case 'serve': return s.carrying ? 'serve' : 'pickUp';
    case 'clear': return 'clear';
    case 'pour': case 'pourWater': return 'pour';
    case 'present': case 'serveAperitif': return 'wine';
    case 'cook': return 'cook';
    case 'dish': return 'wash';
    case 'setBread': return 'setDown';
    default: return 'idle';
  }
}
// ORDER 295 — helgkvällarna, då DJ:n står i båset vid födelsedagen.
const WEEKEND_DAYS: readonly string[] = ['fri', 'sat'];
// ORDER 296 — DJ:ns plats bakom båset (Designs handelserManus.js, födelsedagen)
// och när musiken börjar (satsningen: "Music from nine o'clock").
// ORDER 317 — bakom båset ur rummets plan (DJ-hörnets mitt + 0,45 / − 0,45, som förut).
const DJ_SPOT = { x: WINE_BAR_PLAN.dj.cx + 0.45, z: WINE_BAR_PLAN.dj.cz - 0.45, yaw: -Math.PI / 4, stand: WINE_BAR_PLAN.dj.platform };
const DJ_MUSIC_FROM_MIN = 21 * 60;
// Båsets kantljus när DJ:n spelar (rummets helgnivå, wineBarRoom).
const DJ_GLOW_ON = 1.4;
// ORDER 294b — manusens personal (Designs handelserManus.js) mot rummets roller.
const SCRIPT_ACTOR_OF: Record<StaffKey, string> = { host: 'per', server: 'sara', server2: '-', sommelier: 'elin', bartender: 'mira', cook: 'cook', dish: 'dish1' };
const THEATRE_LOW_CLIPS = new Set(['staff.kneelTalk', 'staff.sweep', 'staff.wipeFloor', 'guest.slip', 'staff.smother', 'guest.wheel', 'guest.wheelRoll', 'guest.wheelTurn', 'guest.wheelToTable', 'bar.stockFridge', 'staff.carryCrate']);

// ORDER 292b — figurmätningen var femtonde bildruta.
const AUDIT_EVERY_FRAMES = 15;

// ORDER 292 — gästernas frisyrer och bonader (figureProps.ts), mest hår.
const GUEST_TOPPINGS: readonly HeadToppingId[] = ['shortCut', 'ruffled', 'grayHair', 'shortCut', 'ruffled', 'workCap', 'shortCut', 'grayHair', 'ruffled', 'sunHat', 'shortCut', 'hoodRaised'];

/** Så många gäster kan synas samtidigt: platserna och en kö (ORDER 315b del 2: bistrons 31). */
export const WINE_BAR_GUEST_POOL = 48;

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
  // ORDER 317 — över vinväggen (dess mittlinje) och över bordsbanden i husets möblering.
  bar: { y: 2.3, distance: 6.5, intensity: 14, x: [WINE_WALL.bas.x0, WINE_WALL.bas.x1] as number[], z: WINE_BAR_PLAN.rackZ },
  tables: { y: 1.5, distance: 5.5, intensity: 7, z: [WINE_BAR_PLAN.lanes.loungeInnerZ, WINE_BAR_PLAN.lanes.southZ - 0.6] as number[], x: [-0.3, -2.3] as number[] },
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

/** ORDER 319b — rummets regissör (vinbaren och bistron), som scenen bygger den; testet för trängseln
 *  (order319bTrangseln.test.ts) bygger den med samma funktion. */
export function createRoomDirector(room: WineBarRoom): WineBarDirector {
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
  return new WineBarDirector(
    {
      seats: room.seats,
      staffStations: room.staffStations,
      entrance: room.entrance,
      waitingSpot: room.waitingSpot,
      floorY: room.floorY,
      width: room.width,
      depth: room.depth,
      // ORDER 315b del 2 — bistrons möblering: personalens vägar och barens platser följer den.
      layout: room.layout
    } as ConstructorParameters<typeof WineBarDirector>[0],
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
}

/** ORDER 319b — massan i trängseln (personalSpace.ts PERSONAL_SPACE.mass): den som rör sig ger efter. */
export function roomMass(smp: FigureSample, staff: boolean): MassKind {
  const walking = /walk|Walk|arrive|leave/.test(smp.pose);
  if (staff) return walking ? 'staffWalking' : 'staffStanding';
  if (smp.seated) return 'eatingOrSeated';
  if (walking) return 'walking';
  return smp.pose === 'waitCalm' || smp.pose === 'waitImpatient' || smp.pose === 'waitLeaving' ? 'queued' : 'standingAct';
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
  /** ORDER 319b — trängseln: väja och knuffas isär (personalSpace.ts). */
  space: PersonalSpace;
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
  /** ORDER 296 — DJ:n som spelaren betalat för, och båsets sken innan musiken tog över (−1: rummets egna gäller). */
  djRig: FigureRig;
  djGlowBase: number;
  eventSaved: CameraTarget | null;
  spotK: number;
  /** ORDER 299 — konsekvensögonblicket efter ett raketsvar (consequenceCamera.ts). */
  consequence: ConsequenceCamera;
  momentPoint: { x: number; z: number } | null;
  rocketPoint: { x: number; z: number } | null;
  /** ORDER 299 — ansiktena (figureFace.ts): gästernas följer stämningen, personalens är nöjda. */
  guestFaces: FaceHandle[];
  staffFaces: FaceHandle[];
  /** ORDER 299 — gästernas gester efter stämningen. */
  moodGestures: MoodGestures;
  /** ORDER 297 — ansiktena på manusfigurerna och svaren i händelsen. */
  scriptFaces: { key: string | null; answers: number; lastAt: number; answer: { at: number; kind: 'right' | 'wrong' } | null; faces: WeakMap<FigureRig, FaceHandle> };
  /** ORDER 309 — orkringen per anställd (D5 ORK_RING), gästernas grupper och bonaderna. */
  orkRings: OrkRing[];
  dressed: DressedRig[];
  toppings: (PropHandle | null)[];
  /** ORDER 302c — dörrmattan (room.queueSpots[0]) och riktningen mot gatan, i rummets ram. */
  doorMat: { at: [number, number]; out: [number, number] };
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
  // ORDER 303 F — statusläget: alla bords stämning, personalens ork vid
  // fötterna, och korten vid klick.
  const statusOn = useSyncExternalStore(subscribeStatusMode, statusModeOn, statusModeOn);
  const statusRef = useRef(false);
  statusRef.current = statusOn;
  // ORDER 309 — kortet för gäst och personal (ui/StatusCard.tsx): vilket som är öppet.
  const card = useSyncExternalStore(subscribeOpenCard, openCard, openCard);
  const cardRef = useRef(card);
  cardRef.current = card;
  const { actualRef, targetRef } = useCamera();
  // ORDER 299 — konsekvensögonblicket: reducerad rörelse (kameran nedan).
  const reducedMotion = usePrefersReducedMotion();
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const castRef = useRef<Cast | null>(null);
  const captionRef = useRef<THREE.Group>(null);
  // ORDER 296 — ringens förklaring vid hovring.
  const ringTagRef = useRef<THREE.Group>(null);
  const [ringTag, setRingTag] = useState<{ i: number; role: string; task: string } | null>(null);
  const ringTagKey = useRef('');
  // ORDER 296 (kärnan punkt 1) — Flytta personal: klick på en ring öppnar zonerna.
  const ringWorldRef = useRef<{ i: number; x: number; y: number; z: number } | null>(null);
  const [moveMenu, setMoveMenu] = useState<{ i: number; x: number; y: number; z: number } | null>(null);
  const glEl = useThree((x) => x.gl.domElement);
  const dispatchSim = useSimDispatch();
  const langNow = useLanguage();
  const pointer = useThree((x) => x.pointer);
  const camera = useThree((x) => x.camera);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const { focusOn } = useCamera();
  // ORDER 299 — borden (sitsarna per möbel, inte bardisken) för "klick på ett
  // bord gör att kameran glider dit".
  const tableCentres = useMemo(() => {
    const by = new Map<string, { x: number; z: number; n: number }>();
    for (const seat of room.seats) {
      if (seat.kind === 'bar') continue;
      const t = by.get(seat.furnitureId) ?? { x: 0, z: 0, n: 0 };
      by.set(seat.furnitureId, { x: t.x + seat.local[0], z: t.z + seat.local[1], n: t.n + 1 });
    }
    return [...by.values()].map((t) => ({ x: t.x / t.n, z: t.z / t.n }));
  }, [room]);
  // ORDER 299 — stämningens symboler över borden (moodSymbols.ts) på en duk över scenen.
  const moodLayerRef = useRef<MoodSymbolLayer | null>(null);
  // ORDER 309 — trivselplattan vid orkringen (D5 drawWellbeing).
  const wellbeingLayerRef = useRef<WellbeingLayer | null>(null);
  useEffect(() => {
    const parent = glEl.parentElement;
    if (!parent) return;
    const layer = new MoodSymbolLayer(parent);
    moodLayerRef.current = layer;
    const plates = new WellbeingLayer(parent);
    wellbeingLayerRef.current = plates;
    return () => { layer.dispose(); moodLayerRef.current = null; plates.dispose(); wellbeingLayerRef.current = null; };
  }, [glEl]);
  // ORDER 309 — utrustningen i rummet när krogen äger den (D5 equipment.ts, ORDER 307 state.equipment).
  const equipmentRef = useRef<RoomEquipment | null>(null);
  useEffect(() => {
    const eq = new RoomEquipment(room.floorY);
    room.group.add(eq.group);
    equipmentRef.current = eq;
    return () => { eq.dispose(); equipmentRef.current = null; };
  }, [room]);
  const ownedEquipment = sim.equipment;
  useEffect(() => {
    const shown = equipmentRef.current?.sync(ownedEquipment) ?? [];
    if (typeof document !== 'undefined') document.body.dataset.roomEquipment = shown.join(',');
  }, [ownedEquipment, room]);
  const furniture = useMemo(() => {
    const seatOf = new Map<number, { kind: string; furnitureId: string }>();
    const sum = new Map<string, { x: number; z: number; n: number }>();
    for (const seat of room.seats) {
      seatOf.set(seat.seatIndex, { kind: seat.kind, furnitureId: seat.furnitureId });
      const t = sum.get(seat.furnitureId) ?? { x: 0, z: 0, n: 0 };
      sum.set(seat.furnitureId, { x: t.x + seat.local[0], z: t.z + seat.local[1], n: t.n + 1 });
    }
    const centre = new Map([...sum].map(([k, t]) => [k, { x: t.x / t.n, z: t.z / t.n }]));
    return { seatOf, centre };
  }, [room]);
  useEffect(() => {
    let downAt: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => { downAt = { x: e.clientX, y: e.clientY }; };
    const onClick = (e: MouseEvent) => {
      // Ett drag (vrid eller panorera) är inget klick.
      if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > CLICK_SLOP_PX) return;
      const w = ringWorldRef.current;
      // ORDER 309 — i statusläget öppnar klicket kortet, inte Flytta.
      if (w && simRef.current.day.period === 'dinner' && !statusRef.current) { setMoveMenu(w); return; }
      setMoveMenu(null);
      const cast = castRef.current;
      if (!cast || !roomShownRef.current) return;
      raycaster.setFromCamera(pointer, camera);
      // ORDER 309 — i statusläget öppnar ett klick på en gäst eller i
      // personalen kortet (Designs D5, ui/StatusCard.tsx).
      if (statusRef.current) {
        const owner = new Map<THREE.Object3D, { kind: 'staff'; i: number } | { kind: 'guest'; id: string }>();
        const targets: THREE.Object3D[] = [];
        cast.staffRigs.forEach((r, i) => { if (r.root.visible) { targets.push(r.root); owner.set(r.root, { kind: 'staff', i }); } });
        cast.guestRigs.forEach((r, i) => { const id = cast.guestIds[i]; if (r.root.visible && id) { targets.push(r.root); owner.set(r.root, { kind: 'guest', id }); } });
        const h = raycaster.intersectObjects(targets, true)[0];
        let picked: { kind: 'staff'; i: number } | { kind: 'guest'; id: string } | null = null;
        for (let o: THREE.Object3D | null = h?.object ?? null; o; o = o.parent) { if (owner.has(o)) { picked = owner.get(o)!; break; } }
        // Kortet finns för personalen i simuleringen (orken, trivseln, kunskapen).
        const simMember = picked?.kind === 'staff' ? simRef.current.staff.some((x) => SIM_ROLE_TO_STAFF[x.role] === STAFF_KEYS[picked.i]) : false;
        if (picked?.kind === 'staff' && simMember) setOpenCard({ kind: 'staff', key: STAFF_KEYS[picked.i] });
        else if (picked?.kind === 'guest') setOpenCard({ kind: 'guest', guestId: picked.id });
        else setOpenCard(null);
        if (picked) return;
      }
      const floorY = cast.group.localToWorld(new THREE.Vector3(0, room.floorY, 0)).y;
      const hit = raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorY), new THREE.Vector3());
      if (!hit) return;
      const local = cast.group.worldToLocal(hit.clone());
      let best: { x: number; z: number } | null = null;
      let bestD = TABLE_CLICK_RADIUS_M;
      for (const t of tableCentres) {
        const d = Math.hypot(t.x - local.x, t.z - local.z);
        if (d <= bestD) { best = t; bestD = d; }
      }
      if (!best) return;
      const at = cast.group.localToWorld(new THREE.Vector3(best.x, room.floorY, best.z));
      focusOn({ x: at.x, z: at.z }, Math.min(targetRef.current.distance, ROOM_CAMERA.tableDistanceM));
    };
    glEl.addEventListener('pointerdown', onDown);
    glEl.addEventListener('click', onClick);
    return () => { glEl.removeEventListener('pointerdown', onDown); glEl.removeEventListener('click', onClick); };
  }, [glEl, tableCentres, raycaster, pointer, camera, room, focusOn, targetRef]);
  // ORDER 292 — svarets händelse står över bordet (rummets reaktion).
  const captionDivRef = useRef<HTMLDivElement>(null);
  // ORDER 292b — rummets etiketter (bildtexten och händelsen) ritas bara när
  // rummet syns; drei:s Html ritar annars sin DOM över byn när kameran är ute.
  const [roomShown, setRoomShown] = useState(false);
  const roomShownRef = useRef(false);
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

    const director = createRoomDirector(room);
    const guestRigs: FigureRig[] = [];
    const guestHandProps: { briefcase: PropHandle; camera: PropHandle }[] = [];
    const guestFaces: FaceHandle[] = [];
    const guestToppings: (PropHandle | null)[] = [];
    const guestDressed: DressedRig[] = [];
    for (let i = 0; i < WINE_BAR_GUEST_POOL; i++) {
      const rig = createFigureRig({ variant: 'guest', garmentColour: GUEST_GARMENTS[i % GUEST_GARMENTS.length] });
      rig.root.visible = false;
      group.add(rig.root);
      guestRigs.push(rig);
      // ORDER 292 — Designs figureProps.ts: en frisyr eller bonad per figur, och
      // handrekvisitan (portföljen, kameran) som tänds per gäst när hen går.
      const [topping] = attachProps(rig, { headTopping: GUEST_TOPPINGS[i % GUEST_TOPPINGS.length] });
      guestToppings.push(topping ?? null);
      // ORDER 309 — Designs D5 gästgrupper: alla fem gruppernas tecken, dolda tills gästen har typ.
      guestDressed.push(dressAllGroups(rig, i % 2));
      const [briefcase] = attachProps(rig, { hand: 'briefcase', side: 1 });
      const [camera] = attachProps(rig, { hand: 'camera', side: -1 });
      briefcase.group.visible = false;
      camera.group.visible = false;
      guestHandProps.push({ briefcase, camera });
      // ORDER 299 — ansiktet i närbild (Designs figureFace.ts).
      guestFaces.push(attachFace(rig));
      // ORDER 302d — kön utanför tar kvällens lägsta ljushet som gatans figurer:
      // alla riggens upplysta material, med gatans andel i bytet vid dörren.
      withStreetFloorOnTree(rig.root, guestDressed[i].lightShare);
    }
    const staffRigs: FigureRig[] = STAFF_KEYS.map((k) => {
      const rig = createFigureRig({ variant: 'staff', garmentColour: STAFF_COLOUR[k] });
      group.add(rig.root);
      return rig;
    });
    // ORDER 299 — personalen har alltid uttrycket nöjd (FACE.staffMood).
    const staffFaces = staffRigs.map((rig) => attachFace(rig, FACE.staffMood));
    // ORDER 296 (punkt 6, "DJ:n som spelaren betalat för ska synas"): DJ:n bakom
    // båset när satsningen book-dj är vald, på samma plats som i händelserna.
    const djRig = createFigureRig({ variant: 'staff', garmentColour: STAFF_UNIFORMS.dj });
    djRig.root.visible = false;
    djRig.root.position.set(DJ_SPOT.x, room.floorY + DJ_SPOT.stand, DJ_SPOT.z);
    djRig.root.rotation.y = DJ_SPOT.yaw;
    group.add(djRig.root);
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
      bar: L.bar.x.map((x) => point(LIGHT_MOODS.tidig.pendantColour, x, L.bar.y, L.bar.z, L.bar.distance)),
      tables: L.tables.z.map((z, i) => point(LIGHT_MOODS.tidig.candleColour, L.tables.x[i], L.tables.y, z, L.tables.distance))
    };
    const ring = createActionRing();
    ring.group.visible = false;
    group.add(ring.group);
    // ORDER 290 — ring och linje under personalen, med rollens färg.
    const staffMarks = STAFF_KEYS.map((k) => { const m = createStaffMark(k); group.add(m.group); return m; });
    const stage = new TheatreStage(group, room.floorY, STAFF_KEYS.length, WINE_BAR_GUEST_POOL);
    // ORDER 313 §8 — flaskorna i baren.
    stage.dress(groupsFor(room));
    // ORDER 309 — orkringen (D5 ORK_RING) vid varje anställds fötter.
    const orkRings = STAFF_KEYS.map(() => { const r = createOrkRing(); group.add(r.group); return r; });
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
      djRig,
      djGlowBase: -1,
      events: new EventPlayer(group, room.floorY, theatreSeats(room.seats), room.parts.djGlow),
      eventSaved: null,
      spotK: 0,
      consequence: new ConsequenceCamera(),
      momentPoint: null,
      rocketPoint: null,
      guestFaces,
      staffFaces,
      moodGestures: new MoodGestures(WINE_BAR_GUEST_POOL),
      space: new PersonalSpace(),
      scriptFaces: { key: null, answers: 0, lastAt: -Infinity, answer: null, faces: new WeakMap() },
      orkRings,
      dressed: guestDressed,
      toppings: guestToppings,
      doorMat: (() => {
        const spots = [...(room.queueSpots ?? [])].sort((a, b) => a.order - b.order);
        const at: [number, number] = spots[0] ? [spots[0].local[0], spots[0].local[1]] : [room.entrance[0], room.entrance[1]];
        return { at, out: [room.waitingSpot[0] - at[0], room.waitingSpot[1] - at[1]] as [number, number] };
      })()
    };
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      (window as unknown as { __nxWineBarDirector?: unknown }).__nxWineBarDirector = director;
      (window as unknown as { __nxWineBarGroup?: unknown }).__nxWineBarGroup = group;
    }
    return () => {
      if (castRef.current) disposeFigureRig(castRef.current.djRig);
      guestRigs.forEach(disposeFigureRig);
      staffRigs.forEach(disposeFigureRig);
      ring.dispose();
      staffMarks.forEach(disposeStaffMark);
      orkRings.forEach((r) => r.dispose());
      guestDressed.forEach(disposeDressed);
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
    // ORDER 297 — rummet syns för spelaren först när taket lyfts (village/
    // roofBlend.ts, under 40 m); nålarna, bildtexterna och symbolerna följer
    // det. Figurerna (kön och de som kommer) ritas som förut ut till 75 m.
    const inside = cast.group.visible && roofAt(dist) < ROOM_SHOWN_ROOF;
    if (inside !== roomShownRef.current) {
      roomShownRef.current = inside;
      setRoomShown(inside);
    }
    if (!cast.group.visible) {
      // ORDER 297 — stämningens symboler står inte kvar när rummet inte syns.
      moodLayerRef.current?.clear();
      return;
    }

    // ORDER 298 — det som räknas ska synas: hur många simuleringen har vid
    // bord, och hur många figurer som sitter i rummet (för mätningen).
    if (typeof document !== 'undefined') {
      document.body.dataset.simSeated = String(s.seatedIds.length);
      document.body.dataset.roomSeated = String(cast.director.guestSamples.filter((x) => x.visible && x.seated).length);
      document.body.dataset.roomGuests = String(cast.director.guestSamples.filter((x) => x.visible).length);
      // ORDER 299 — kamerans faktiska avstånd och vinkel, spelets hastighet just
      // nu och sekunderna i konsekvensögonblicket (för kontrollen i spelet).
      const a = actualRef.current;
      document.body.dataset.camDist = a.distance.toFixed(2);
      document.body.dataset.camPitch = a.pitch.toFixed(3);
      document.body.dataset.camYaw = a.yaw.toFixed(3);
      document.body.dataset.speedNow = String(effectiveSpeed(s));
      const m = consequenceElapsed(s);
      document.body.dataset.moment = m === null ? '' : m.toFixed(2);
      document.body.dataset.reactions = (s.day.roomReactions ?? []).map((r) => `${r.at.toFixed(1)}:${r.kind}:${r.table ?? '-'}`).join(',');
    }
    // ORDER 296 — DJ:n bakom båset när satsningen är vald (kockens klipp vid
    // disken tills DJ-klippen finns, som i händelserna). Musiken börjar 21.00:
    // båsets sken pulserar i takten. Under en händelse med egen DJ står hennes.
    {
      const booked = (s.day.pickedActivityIds ?? []).includes('book-dj') && (s.day.period === 'dinner' || s.day.period === 'lunch');
      const scriptDj = cast.events.playing && cast.events.theatre.staffIds().has('dj');
      cast.djRig.root.visible = booked && !scriptDj && cast.group.visible;
      if (typeof document !== 'undefined') {
        document.body.dataset.djShown = cast.djRig.root.visible ? '1' : '0';
        // Var på skärmen (andel av bredd och höjd), så att mätningen kan se henne.
        if (cast.djRig.root.visible) {
          const p = cast.djRig.root.localToWorld(new THREE.Vector3(0, 1, 0)).project(camera);
          document.body.dataset.djScreen = `${((p.x + 1) / 2).toFixed(3)},${((1 - p.y) / 2).toFixed(3)}`;
        }
      }
      if (cast.djRig.root.visible) applyPose(cast.djRig, sampleClip('cook.station', s.simTime, 'normal').pose);
      const playing = booked && clockMinutes(s) >= DJ_MUSIC_FROM_MIN && !(cast.events.playing && scriptDj);
      // Båsets sken skrivs bara medan DJ:n spelar; annars står rummets eget
      // (wineBarRoom sätter det efter stämningen).
      if (playing) {
        if (cast.djGlowBase < 0) cast.djGlowBase = room.parts.djGlow.emissiveIntensity;
        const beat = Math.pow(0.5 + 0.5 * Math.cos(clockRef.current * Math.PI * 4), 3);
        room.parts.djGlow.emissiveIntensity = Math.max(cast.djGlowBase, DJ_GLOW_ON) + 0.8 + 0.9 * beat;
      } else if (cast.djGlowBase >= 0) {
        room.parts.djGlow.emissiveIntensity = cast.djGlowBase;
        cast.djGlowBase = -1;
      }
    }
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
      // ORDER 302c — gatans färger utanför dörrmattan, rummets innanför (D5 tillägg
      // 2026-10-06 §4): en ny gäst i figuren får sidan direkt, annars byts det på 0,6 s.
      const newGuest = sample.guestId !== cast.guestIds[i];
      if (sample.visible && sample.guestId) {
        stepStreetBlend(cast.dressed[i].blend, beyondDoorMat(sample.x, sample.z, cast.doorMat.at, cast.doorMat.out), Math.min(delta, 0.1), newGuest);
      }
      if (sample.guestId !== cast.guestIds[i] || guestType !== cast.guestTypes[i]) {
        cast.guestIds[i] = sample.guestId;
        cast.guestTypes[i] = guestType;
        // ORDER 309 — gästgruppens kläder och tecken (Designs D5 guestGroups.ts, scene/guestLooks.ts);
        // gäster utan typ (äldre fixturer) behåller rummets dova plagg.
        if (sample.guestId) {
          const g = showGroup(rig, cast.dressed[i], guestType, i % 2, garmentFor(sample.guestId));
          const t = cast.toppings[i];
          if (t) t.group.visible = !(g && HEAD_SIGNS.has(GUEST_GROUPS[g].sign));
        }
      }
      if (sample.guestId) {
        applyStreetBlend(rig, cast.dressed[i], streetShare(cast.dressed[i].blend));
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
      // ORDER 299 — gesten efter stämningen när gästen bara sitter (moodGestures.ts).
      let gesture: { id: string; clip: ClipSample } | null = null;
      if (walkSample === sample && sample.seated && !isFigure && simGuest) {
        gesture = cast.moodGestures.sample(i, sample.guestId, clip ? cast.stage.guestClipId(i) : null, guestMoodValue(simGuest, s.day.roomMoodLift ?? 0), s.simTime, seatKind, s.day.consequence, s.seed ?? 0);
      } else {
        cast.moodGestures.reset(i);
      }
      cast.guestClips[i] = gesture ? gesture.clip : clip;
      cast.guestClipIds[i] = gesture ? gesture.id : clip ? cast.stage.guestClipId(i) : null;
      applySample(rig, walkSample, false, visibility, gesture ? gesture.clip : clip);
      if (isFigure) figureLocal = { x: rig.root.position.x, y: rig.root.position.y, z: rig.root.position.z };
    }
    const ss = cast.director.staffSamples;
    // ORDER 309 — personalens läge i klippen (conditionClips.ts): orken och tvekan.
    const rocketArea = active && !active.backed ? incidentArea(incidentById(s.economy.businessClass, active.id)?.track) : null;
    const areaKnown = rocketArea ? staffKnows(s, rocketArea) : true;
    const staminaByKey = new Map<string, StaminaId>();
    for (const m of s.staff) staminaByKey.set(SIM_ROLE_TO_STAFF[m.role], staminaOf(simStamina(m)));
    for (let i = 0; i < ss.length; i++) {
      const key = STAFF_KEYS[i];
      const cond = inService ? { stamina: staminaByKey.get(key) ?? null, hesitateAt: rocketArea ? hesitationElapsed(key, active, rocketArea, areaKnown) : null } : null;
      const clip = cast.stage.staffPose(i, key, ss[i], active && !active.backed ? active : null, now, together.staff.get(i) ?? null, cond);
      cast.staffClips[i] = clip;
      applySample(cast.staffRigs[i], ss[i], true, visibility, clip);
      const rig = cast.staffRigs[i];
      // ORDER 290 — ringen under figuren och linjen till uppgiften.
      const task = inService ? cast.director.staffTask(key, t) : null;
      const working = task && t >= task.arrive && task.done > task.arrive ? Math.min(1, (t - task.arrive) / (task.done - task.arrive)) : null;
      // ORDER 292 — sommeliern i dörren bär värdens färg.
      // ORDER 293 — Per är värden; sommeliern är sommelier hela kvällen.
      updateStaffMark(cast.staffMarks[i], inService && ss[i].visible && roomShownRef.current, { x: rig.root.position.x, z: rig.root.position.z }, task && task.to ? { x: task.to[0], z: task.to[1] } : null, working, room.floorY);
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

    // ORDER 319b — trängseln (personalSpace.ts, Anders 2026-10-08: "i vinbaren och bistron … med bara att
    // väja och knuffas isär"): efter regissören och klippen, så att ingen går igenom någon. Ringen under
    // personalen följer med.
    {
      const step = Math.min(delta, 0.1) * speed;
      const bodies: SpaceBody[] = [];
      const rigOf = new Map<string, { rig: FigureRig; staff: number | null }>();
      for (let i = 0; i < cast.guestRigs.length; i++) {
        const r = cast.guestRigs[i], smp = gs[i];
        if (!r.root.visible || !smp?.visible) continue;
        const key = smp.guestId ?? `g${i}`;
        bodies.push({ key, x: r.root.position.x, z: r.root.position.z, kind: roomMass(smp, false), pinned: smp.seated, alpha: visibility });
        rigOf.set(key, { rig: r, staff: null });
      }
      for (let i = 0; i < STAFF_KEYS.length; i++) {
        const r = cast.staffRigs[i], smp = ss[i];
        if (!r.root.visible || !smp?.visible) continue;
        const key = `staff:${STAFF_KEYS[i]}`;
        bodies.push({ key, x: r.root.position.x, z: r.root.position.z, kind: roomMass(smp, true), alpha: visibility });
        rigOf.set(key, { rig: r, staff: i });
      }
      const shown = cast.space.step(bodies, step);
      for (const b of bodies) {
        const p = shown.get(b.key), o = rigOf.get(b.key);
        if (!p || !o) continue;
        const dx = p[0] - o.rig.root.position.x, dz = p[1] - o.rig.root.position.z;
        if (dx === 0 && dz === 0) continue;
        o.rig.root.position.x = p[0];
        o.rig.root.position.z = p[1];
        if (o.staff !== null) {
          const m = cast.staffMarks[o.staff];
          for (const x of [m.ring, m.xray, m.glow, ...m.arcs]) { x.position.x += dx; x.position.z += dz; }
        }
      }
    }

    // ORDER 296 — ringens förklaring: personen (eller ringen) under muspekaren.
    {
      let hit = -1;
      if (cast.group.visible) {
        raycaster.setFromCamera(pointer, camera);
        const targets: THREE.Object3D[] = [];
        const owner = new Map<THREE.Object3D, number>();
        for (let i = 0; i < STAFF_KEYS.length; i++) {
          if (!cast.staffRigs[i].root.visible) continue;
          targets.push(cast.staffRigs[i].root, cast.staffMarks[i].ring);
          owner.set(cast.staffRigs[i].root, i);
          owner.set(cast.staffMarks[i].ring, i);
        }
        const h = raycaster.intersectObjects(targets, true)[0];
        for (let o: THREE.Object3D | null = h?.object ?? null; o; o = o.parent) { if (owner.has(o)) { hit = owner.get(o)!; break; } }
      }
      const key = hit >= 0 ? `${hit}:${ringTaskFor(ss[hit], cast.director.staffTaskDetail(STAFF_KEYS[hit], t)?.kind ?? null)}` : '';
      if (key !== ringTagKey.current) {
        ringTagKey.current = key;
        setRingTag(hit >= 0 ? { i: hit, role: ROLE_OF[STAFF_KEYS[hit]], task: key.split(':')[1] } : null);
      }
      const g = ringTagRef.current;
      // ORDER 296 — läget i världen, för hovmästarens Flytta (klick på ringen).
      ringWorldRef.current = hit >= 0 ? (() => { const w = cast.group.localToWorld(new THREE.Vector3(ss[hit].x, room.floorY, ss[hit].z)); return { i: hit, x: w.x, y: w.y, z: w.z }; })() : null;
      if (g && hit >= 0 && g.parent) {
        // Personalens läge är i rummets ram; etiketten står i sin förälders.
        const p = cast.group.localToWorld(new THREE.Vector3(ss[hit].x, room.floorY + RING_TAG_HEIGHT_M, ss[hit].z));
        g.parent.worldToLocal(p);
        g.position.copy(p);
      }
    }

    // ORDER 309 — orkringen (D5 ORK_RING): i statusläget vid all personal,
    // annars bara vid den som är slut. Den första bågen mot kameran.
    // Trivselplattan (D5 drawWellbeing) står bredvid ringen när den syns.
    {
      const camLocal = cast.group.worldToLocal(camera.getWorldPosition(new THREE.Vector3()));
      const plates: WellbeingItem[] = [];
      for (let i = 0; i < STAFF_KEYS.length; i++) {
        const r = cast.orkRings[i];
        const member = s.staff.find((x) => SIM_ROLE_TO_STAFF[x.role] === STAFF_KEYS[i]);
        const stamina = member ? staminaOf(simStamina(member)) : null;
        const show = !!stamina && roomShownRef.current && inService && ss[i].visible && cast.staffRigs[i].root.visible && orkRingShown(stamina, statusRef.current);
        r.group.visible = show;
        if (!show || !member || !stamina) continue;
        r.set(stamina);
        const x = cast.staffRigs[i].root.position.x, z = cast.staffRigs[i].root.position.z;
        r.group.position.set(x, room.floorY, z);
        r.group.rotation.y = orkFacing(camLocal.x - x, camLocal.z - z);
        plates.push({ key: STAFF_KEYS[i], feet: cast.group.localToWorld(new THREE.Vector3(x, room.floorY, z)), id: wellbeingOf(simWellbeing(member)) });
      }
      const wl = wellbeingLayerRef.current;
      if (wl) {
        if (plates.length > 0) wl.draw(plates, camera); else if (wl.drawn.length > 0) wl.clear();
        if (typeof document !== 'undefined') document.body.dataset.wellbeingPlates = wl.drawn.map((p) => `${p.key}:${p.id}`).join(',');
      }
      if (typeof document !== 'undefined') {
        document.body.dataset.orkRings = STAFF_KEYS.filter((_, i) => cast.orkRings[i].group.visible).map((k) => `${k}:${staminaByKey.get(k)}`).join(',');
        // Var figurerna står på skärmen i statusläget (andel av bredd och höjd), så att kontrollen kan klicka på dem.
        if (statusRef.current && roomShownRef.current) {
          const at = (x: number, y: number, z: number) => { const p = cast.group.localToWorld(new THREE.Vector3(x, y, z)).project(camera); return `${((p.x + 1) / 2).toFixed(3)},${((1 - p.y) / 2).toFixed(3)}`; };
          document.body.dataset.staffScreen = STAFF_KEYS.map((k, i) => (staminaByKey.has(k) && cast.staffRigs[i].root.visible ? `${k}@${at(cast.staffRigs[i].root.position.x, room.floorY + 1.1, cast.staffRigs[i].root.position.z)}` : '')).filter(Boolean).join(';');
          document.body.dataset.guestScreen = gs.map((g, i) => (g.visible && g.guestId && g.seated ? `${g.guestId}@${cast.guestTypes[i] ?? '-'}@${at(cast.guestRigs[i].root.position.x, cast.guestRigs[i].root.position.y + 0.9, cast.guestRigs[i].root.position.z)}` : '')).filter(Boolean).slice(0, 12).join(';');
        }
        document.body.dataset.guestGroups = [...new Set(cast.dressed.filter((d, i) => d.group && gs[i]?.visible).map((d) => d.group))].join(',');
      }
    }
    // ORDER 309 — kortets ankare: huvudet på figuren kortet gäller, i fönstrets pixlar.
    {
      const c = cardRef.current;
      let head: THREE.Vector3 | null = null;
      if (c && statusRef.current && roomShownRef.current) {
        if (c.kind === 'staff') {
          const i = STAFF_KEYS.indexOf(c.key);
          if (i >= 0 && cast.staffRigs[i].root.visible) head = new THREE.Vector3(cast.staffRigs[i].root.position.x, room.floorY + RING_TAG_HEIGHT_M - 0.4, cast.staffRigs[i].root.position.z);
        } else {
          const i = cast.guestIds.indexOf(c.guestId);
          if (i >= 0 && cast.guestRigs[i].root.visible) head = new THREE.Vector3(cast.guestRigs[i].root.position.x, cast.guestRigs[i].root.position.y + (gs[i].seated ? 1.3 : 1.7), cast.guestRigs[i].root.position.z);
        }
      }
      if (head) {
        const p = cast.group.localToWorld(head).project(camera);
        const rect = glEl.getBoundingClientRect();
        cardAnchor.current = p.z > 1 ? null : { x: rect.left + (p.x * 0.5 + 0.5) * rect.width, y: rect.top + (-p.y * 0.5 + 0.5) * rect.height };
      } else if (c) {
        cardAnchor.current = null;
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
      const marks = new Set([...cast.staffMarks.map((m) => m.group), ...cast.orkRings.map((r) => r.group)]);
      cast.group.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.name !== 'face' && o.parent !== cast.ring.group && !(o.parent && marks.has(o.parent as THREE.Group))) o.castShadow = shadows; });
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
    // ORDER 299 — konsekvensögonblicket är ett lager över spelets kamera:
    // spelets eget mål tillbaka före kameralogiken nedan.
    cast.consequence.restore(targetRef);
    // ORDER 293 — händelserna spelas som teater: manusets kamera och strålkastare,
    // och rummets egna figurer vilar medan scenen spelas.
    const ev = cast.events.update(active, s.incidents?.log ?? [], Math.min(delta, 0.1), WEEKEND_DAYS.includes(calendarFor(s.day.dayNumber).weekday));
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
      // ORDER 294 (Vision Owner 2026-10-02): "Rummets gäster under en händelse
      // ska inte döljas. De är kvar och dämpas av strålkastaren, eftersom
      // rummet aldrig stannar." Bara en gäst på en sits manuset använder döljs,
      // så att två figurer aldrig sitter på samma stol. Personalen döljs: manuset
      // har sin egen (Per, Sara, Elin, Mira och kocken).
      const scriptSeats = cast.events.theatre.seatIds();
      for (let i = 0; i < cast.guestRigs.length; i++) {
        const id = gs[i]?.guestId;
        const seat = id ? cast.director.guestSeat(id) : null;
        if (seat && scriptSeats.has(seat.id)) cast.guestRigs[i].root.visible = false;
      }
      // ORDER 294b (Vision Owner 2026-10-02): bara de roller manuset använder
      // döljs; övrig personal står kvar och arbetar.
      const used = cast.events.theatre.staffIds();
      for (let i = 0; i < STAFF_KEYS.length; i++) {
        if (!used.has(SCRIPT_ACTOR_OF[STAFF_KEYS[i]])) continue;
        cast.staffRigs[i].root.visible = false;
        cast.staffMarks[i].group.visible = false;
      }
      cast.ring.group.visible = false;
    } else {
      if (cast.eventSaved) { targetRef.current = { ...cast.eventSaved, focus: { ...cast.eventSaved.focus } }; cast.eventSaved = null; }
      cast.stage.camera(targetRef, active, focusLocal, Math.min(delta, 0.1));
    }
    // ORDER 299 — raketens punkt medan den står, för ett svar som bara gällde kön.
    if (active && focusLocal) cast.rocketPoint = { x: focusLocal.x, z: focusLocal.z };
    // ORDER 299 — kameran stannar på bordet efter svaret: bordets gäster,
    // annars punkten raketen pekade på (figuren eller rummets mitt).
    const moment = s.day.consequence;
    const momentAt = consequenceElapsed(s);
    if (moment && momentAt !== null) {
      let x = 0; let z = 0; let n = 0;
      for (let i = 0; i < gs.length; i++) {
        const g = gs[i];
        if (!g.visible || !g.guestId || !moment.tableGuestIds.includes(g.guestId)) continue;
        x += g.x; z += g.z; n++;
      }
      // I händelsernas manus spelar manusets figurer; kameran går mot manusets punkt.
      // Utan gäster vid bordet (svaret gällde kön) går kameran dit raketen pekade.
      const local = ev.playing && ev.view ? { x: ev.view.tx, z: ev.view.tz } : n > 0 ? { x: x / n, z: z / n } : focusLocal ? { x: focusLocal.x, z: focusLocal.z } : cast.momentPoint ?? cast.rocketPoint;
      cast.momentPoint = local;
      const w = local ? cast.group.localToWorld(new THREE.Vector3(local.x, room.floorY, local.z)) : null;
      const aspect = (camera as THREE.PerspectiveCamera).aspect || 16 / 9;
      cast.consequence.update(targetRef, moment, momentAt, w ? { x: w.x, z: w.z } : null, aspect, reducedMotionRef.current);
    } else {
      cast.momentPoint = null;
    }

    // ORDER 299 — stämningens symboler: per bord (småbord och lounge), annars
    // per ensam gäst vid baren eller i kön.
    const layer = moodLayerRef.current;
    if (layer) {
      const byId = new Map(s.guests.map((g) => [g.id, g]));
      const groups = new Map<string, MoodGroup & { n: number }>();
      if (s.day.period === 'dinner') {
        for (let i = 0; i < gs.length; i++) {
          const sample = gs[i];
          if (!sample.visible || !sample.guestId) continue;
          const g = byId.get(sample.guestId);
          if (!g || !IN_ROOM_STATES.has(g.state)) continue;
          const seat = cast.director.guestSeat(sample.guestId);
          const spec = seat ? furniture.seatOf.get(seat.seatIndex) : undefined;
          let key: string;
          let local: THREE.Vector3;
          if (seat && spec && spec.kind !== 'bar') {
            const c = furniture.centre.get(spec.furnitureId)!;
            key = `t:${spec.furnitureId}`;
            local = new THREE.Vector3(c.x, room.floorY + (spec.kind === 'lounge' ? MOOD_SYMBOL.anchor.loungeM : MOOD_SYMBOL.anchor.tableM), c.z);
          } else if (seat) {
            key = `g:${g.partyId ?? g.id}`;
            local = new THREE.Vector3(sample.x, seat.seatSurfaceY + SEATED_HEAD_ABOVE_SEAT_M + MOOD_SYMBOL.anchor.guestHeadM, sample.z);
          } else {
            key = `q:${g.partyId ?? g.id}`;
            local = new THREE.Vector3(sample.x, sample.y + STANDING_HEAD_M + MOOD_SYMBOL.anchor.guestHeadM, sample.z);
          }
          const prev = groups.get(key);
          if (prev) { prev.value += guestMoodValue(g, s.day.roomMoodLift ?? 0); prev.n++; }
          else groups.set(key, { key, world: cast.group.localToWorld(local), value: guestMoodValue(g, s.day.roomMoodLift ?? 0), n: 1 });
        }
      }
      const list = [...groups.values()].map((x) => ({ key: x.key, world: x.world, value: x.value / x.n }));
      const hold = momentAt !== null && momentAt < CONSEQUENCE.symbol.at;
      layer.draw(list, camera, performance.now(), hold, reducedMotionRef.current, roomShownRef.current, statusRef.current);
    }

    // ORDER 297 — ansiktena på händelsernas manusfigurer (scriptFaces.ts): Designs
    // tidslinjer efter svaret som hör till händelsen.
    if (ev.playing) {
      const key = cast.events.currentKey;
      const event = cast.events.currentEvent;
      const sf = cast.scriptFaces;
      if (sf.key !== key) { sf.key = key; sf.answers = 0; sf.lastAt = -Infinity; sf.answer = null; }
      const c = s.day.consequence;
      if (c && c.at - sf.lastAt > 1) {
        sf.lastAt = c.at;
        sf.answers++;
        const step = FACE_STEP[event];
        const matches = step === 'first' ? sf.answers === 1 : step === 'last' ? !s.incidents?.active : false;
        if (matches) sf.answer = { at: c.at, kind: c.kind };
      }
      const answer = sf.answer ? { kind: sf.answer.kind, elapsed: s.simTime - sf.answer.at } : null;
      for (const r of cast.events.theatre.rigs()) {
        let face = sf.faces.get(r.rig);
        if (!face) { face = attachFace(r.rig, scriptFaceMood(event, r.id, r.kind, null)); sf.faces.set(r.rig, face); }
        face.set(scriptFaceMood(event, r.id, r.kind, answer));
        face.update(camera);
      }
    }

    // ORDER 299 — ansiktena tänds från 9 m och syns helt vid 7 m. Uttrycket
    // följer gästens stämning och byts i konsekvensögonblicket vid faceSwapAt.
    const faceHold = momentAt !== null && momentAt < CONSEQUENCE.guests.faceSwapAt;
    for (let i = 0; i < cast.guestFaces.length; i++) {
      const face = cast.guestFaces[i];
      const id = gs[i]?.guestId;
      const g = id ? s.guests.find((x) => x.id === id) : undefined;
      if (g && !faceHold) face.set(moodOf(guestMoodValue(g, s.day.roomMoodLift ?? 0)));
      face.update(camera);
    }
    for (const face of cast.staffFaces) face.update(camera);
    if (active && ringAt && !ev.playing) {
      // ORDER 297 — ringen syns inte genom taket (rummet syns när taket lyfts).
      cast.ring.group.visible = roomShownRef.current;
      cast.ring.group.position.set(ringAt.x, room.floorY, ringAt.z);
      const total = active.secondsTotal > 0 ? active.secondsTotal : 1;
      const intro = (active.introLeft ?? 0) > 0;
      updateActionRing(cast.ring, intro ? 0 : 1 - Math.max(0, active.secondsLeft) / total);
    } else {
      cast.ring.group.visible = false;
    }

    // ORDER 299 — svarets händelse står som en notis (ui/service/RoomNotices.tsx),
    // inte längre över bordet: drei-Html följer inte gruppens synlighet, så
    // taggen stod kvar tills nästa svar (provspelet: 15 spelminuter).

    // Bildtexten står ovanför figuren.
    const cap = captionRef.current;
    if (cap) {
      const w = cast.stage.figureWorld;
      cap.visible = !!w;
      // ORDER 299 — drei-Html döljs inte av gruppen; texten döljs själv.
      if (captionDivRef.current) captionDivRef.current.style.display = w ? '' : 'none';
      if (w && cap.parent) {
        const p = w.clone();
        p.y += THEATRE.captionHeightM;
        cap.parent.worldToLocal(p);
        cap.position.copy(p);
      }
    }
  });

  const caption = theatreCaption(sim.incidents?.active ?? null);
  return (
    <>
      {/* ORDER 296 (kärnan punkt 1) — hovmästarens nålar och handgrepp. */}
      {roomShown && <HostLayer room={room} />}
      {moveMenu && roomShown && sim.day.period === 'dinner' && (
        <WorldHtml at={[moveMenu.x, moveMenu.z]} y={moveMenu.y + RING_TAG_HEIGHT_M} z={38}>
          <MoveMenu lang={langNow} role={ROLE_OF[STAFF_KEYS[moveMenu.i]]} onMove={(zone) => { dispatchSim({ type: 'HOST_MOVE', zone }); setMoveMenu(null); }} />
        </WorldHtml>
      )}
      {ringTag && roomShown && (
        <group ref={ringTagRef}>
          <Html center zIndexRange={[22, 0]} style={{ pointerEvents: 'none' }}>
            <StaffRingTag role={ringTag.role} task={ringTag.task} />
          </Html>
        </group>
      )}
      {caption && roomShown && (
        <group ref={captionRef} visible={false}>
          {/* ORDER 299 — bildtexten hålls där ingen panel täcker den (safeCaptionPosition). */}
          <Html center zIndexRange={[47, 0]} calculatePosition={safeCaptionPosition}>
            <div ref={captionDivRef} style={{ display: 'none' }}>
              <TheatreCaption text={caption} />
            </div>
          </Html>
        </group>
      )}
    </>
  );
}

