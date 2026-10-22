// ORDER 315b del 2 — besättningen i spelarens vagn (Designs D7 playerTruck.ts TRUCK_CREW,
// truckClips.ts): en vid grillen (truck.grill, i loop) och en vid luckan (truck.wipeCounter i
// loop, truck.hatchServe när en gäst har fått sin mat). Stationerna i vagnens ram
// (TRUCK_LAYOUT.stations), vagnens golv 0,5 m upp. Tempot följer kön.
//
// ORDER 315b del 3 (Anders 2026-10-07: "Foodtrucken på krognivån (Z) ska inte vara den gamla
// 2D-scenen. Kameran går nära den egna vagnen i 3D, med luckan, grillen, kön, ståbordena och
// D7:s klipp.") — Krogen (Z), Esc och servicens kamera går till vagnen på 12 m, med luckans sida
// mot kameran. ORDER 332 C: vagnen är Grillstugan (D13); taket och markisens duk tonar som husens tak
// (playerTruck.ts applyStuganState, roofAt), och markisen syns bara när den är köpt. Gästerna står i kön
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
//
// ORDER 319c (Designs D9 och tillägget) — livet vid vagnen: de som äter går till sin plats (sim/truckLife.ts,
// EAT_SPOTS), äter korv i bröd eller med mos tre varv, dricker, torkar sig med servetten och går till
// sopkorgen och slänger den (eatingClips.ts); runt värmaren värmer de händerna mellan tuggorna; i blåsten griper
// de efter servetten. En sval kväll har alla rock och två av tre halsduk, andedräkten syns och de som står
// still har armarna i kors. I regnet går en del med paraply. Medhjälparen går ut och tänder marschallerna och
// städar borden (torchRound.ts), och luckan står tom så länge. Platsen i övrigt: TruckLife.tsx.

//
// ORDER 325 (Designs D11 §4, gestureMap.ts) — ansiktena (figureFace.ts) på gästerna och besättningen, efter gästens
// stämning och gesten; och vagnens gester stående: vid luckan vinkar gästen (guest.waveStand) när medhjälparen är ute,
// och grillaren lyssnar med lutat huvud (staff.listenTilt); i kön en axelryckning när korven tar slut (ft11, soldOut);
// den nyfikna som fick "nästan" rycker på axlarna (halfGrip); vid ståborden första tuggan och en nick
// (guest.nodFirstBiteStand), och prat och skratt när fler står vid samma bord (guest.leanTalkStand, guest.laughStand).

import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { applyPose, createFigureRig, poseWalk, type FigurePose, type FigureRig } from '../figureRig';
import { CLIPS, sampleClip, type TempoId } from '../figureClips';
import { FLOOR_Y_M, TRUCK_CREW, TRUCK_LAYOUT, applyStuganState, stuganStateFor } from '../playerTruck';
import { playerTruckSpotOf } from '../../../sim/districts';
import { rainQueueSpotSheltered } from '../truckRain';
import { GUEST_GARMENTS } from '../wineBarRoom';
import { playerTruckPlacement } from '../../content/villagePlaces';
import { useSimDispatch, useSimState } from '../../simulation/SimulationProvider';
import { effectiveSpeed } from '../../simulation/consequence';
import { setMyBusinessOverride, useCamera } from '../../camera/CameraContext';
import { CURIOUS, STREET_QUEUE, THEATRE, TRUCK_SEATING } from '../../../sim/balance';
import { truckOf, truckRaining } from '../../../sim/truckLife';
import { situationTonight, type SituationPhase } from '../../../sim/truckSituations';
import { TRUCK_REGULAR } from '../truckPropsD10';
import { TRUCK_STANDS } from '../../content/villagePlaces';
import { RIVAL_SIGN } from '../truckPropsD10';
import { createProp, holdProp, placeProp, updateHeld, type PropHandle, type PropId } from '../tableware';
import { DECK_TOP_M, onDeck } from '../playerTruck';
import { TRUCK_PROPS } from '../truckProps';
import { truckCrewShown } from '../choicesShown';
import { TRUCK_WEATHER } from '../truckWeather';
import { TruckLife, TRUCK_SIGNALS } from './TruckLife';
import { RIVAL_YAW, TruckSituationsScene } from './TruckSituationsScene';
import { clearRoundPose, torchRoundPose, type RoundPose } from './torchRound';
import { newQueueWalk, stepQueueWalk, type Vec2 as QueueVec2 } from './queueWalk';

/** ORDER 330 G — där Nils står när kön är tom de kvällar Jonas grillar: vid luckans västra sida, utanför vagnen. */
const QUEUE_WALK_HOME: QueueVec2 = [TRUCK_LAYOUT.queue.order[0] - 0.9, TRUCK_LAYOUT.queue.order[1] + 0.5];
import { curiousPhase, curiousTalkable, type CuriousGuest } from '../../../sim/curious';
import { CURIOUS_SPOTS, MENU_BOARD } from '../truckProps';
import { TRUCK_GUESTS, TruckGuestFlow, childKey, queueInForce, queueLineAt, toWorld, type OtherBody, type TruckFrame, type TruckWalker } from './truckGuestFlow';
import { truckCameraState } from './truckCamera';
import { CuriousMarker, type CuriousMarkerState } from './CuriousMarker';
import { attachFace, type FaceHandle } from '../figureFace';
import { FaceProbe } from '../faceProbe';
import { FACE, type MoodId } from '../guestMood';
import { guestMoodValue, moodOf } from '../../../sim/guestMood';
import { GESTURE_BALANCE, GUESTS, MOOD_BALANCE } from '../../../sim/balance';
import { profileFor } from '../../simulation/guestOrders';
import { SEEK_MAX_YAW, eyeContact, stepWant, wantStep, wantsHatch, type StaffGlance, type WantTrack } from '../wantSignals';
import { FigureLives, ampOf, faceKOf, guestNumber, intensityOfGuest, liveFrame, passNodTarget, scaleClip, temperamentForGuest } from '../figureLife';
import { TEMPERAMENT, pickVariantApart, type TemperamentId } from '../gestureMap';
import { conversationAt } from '../moodGestures';
import { groupOfGuestType } from '../guestLooks';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';

const QUEUE_STRESSED = 4;
const QUEUE_CALM = 1;
// Taket kapas närmare än 20 m (D7); ORDER 319a.2 tonar det över 17–23 m.
/** Ett steg i flödet räknas högst så här långt (en flik i bakgrunden ska inte teleportera gästerna). */
const MAX_DT_S = 0.1;
/** Gästen kliver upp på trädäcket det sista stycket fram till platsen. */
const STEP_UP_M = 0.6;
/** ORDER 319b del 2 — barnet bredvid en nyfiken: en gästfigur i 0,62 av en vuxens längd (omkring 1,05 m,
 *  en femåring). */
const CHILD_SCALE = 0.62;
/** ORDER 325 (D11 §4) — grillaren vänder huvudet och bålen mot luckan när hen lyssnar (staff.listenTilt, ctx.yaw);
 *  gästen vid luckan vinkar en gång per waveEveryS; i kön rycker de på axlarna förskjutet per plats. */
const TRUCK_GESTURE = { grillTurnYaw: 1.3, waveEveryS: 4, shrugEveryS: 5, shrugOffsetPerSpotS: 0.8 } as const;
/** Figurens höjd vid prövningen mot kamerans bild: fötterna och huvudet. */
const FIGURE_TOP_M = 1.7;
/** ORDER 319c — medhjälparens runda i scenen följer simuleringen, och tar igen den när den har kommit efter. */
const ROUND_SYNC_S = 0.5;
/** Halsduken runt halsen (Designs cool.scarves). */
const SCARF = { radius: 0.085, tube: 0.03, y: -0.02 };
/** Andedräkten en sval kväll (Designs cool.breath): en puff framför munnen. */
const BREATH = { forwardM: 0.16, upM: 1.58, pool: 20 };
/** ORDER 320 — grillaren byter till vegotången och vänder vegokorven så här ofta (sekunder). */
const VEG_EVERY_S = 24;
/** ORDER 320 — stamgästen vid vår vagn (Designs D10 omtaget): klunken 1,6 s, och skålen en sekund efter den. */
const REGULAR_SIP_S = 1.6;
const REGULAR_PAUSE_S = 1.0;
/** Paraplyet hålls rakt upp i höger hand (armen lyft). */
const UMBRELLA_ARM = { swing: 1.15, lift: 0.18, elbow: 1.55 };

/** ORDER 332 B — samma gäst nickar inte tillbaka igen förrän efter så här många sekunder (Nils går fram och tillbaka). */
const TRUCK_PASS_NOD_AGAIN_S = 8;

/** ORDER 332 B (Designs D12) — gästens temperament vid vagnen: gestens storlek (temperamentet × intensiteten), numret
 *  (varianten och handen), klippen grannarna vid bordet redan spelar, och vilket klipp gästen spelade (played). */
interface TruckLifeCtx { amp: number; number: number; temper: TemperamentId; nearby: string[]; played?: string }

/** sampleClip → scalePose → applyPose för en gest vid vagnen, med variant (A eller B, inte samma som grannen), hand och
 *  storlek. Ger klippet som spelades. */
function playGesture(r: FigureRig, clip: string, u: number, tempo: TempoId, ctx: Parameters<typeof sampleClip>[3], lc: TruckLifeCtx, count = 0): string {
  const v = pickVariantApart(clip, lc.number, count, lc.nearby);
  const id = CLIPS[v.clip] ? v.clip : clip;
  const len = CLIPS[id].seconds[tempo];
  const raw = sampleClip(id, CLIPS[id].loop ? u : Math.min(u, len), tempo, { ...(ctx ?? {}), hand: v.hand });
  applyPose(r, scaleClip(raw, lc.amp, null).pose);
  lc.played = id;
  return id;
}

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
  // ORDER 332 G — vagnen på kvällens plats (sim/districts.ts); besättningen, gästerna och kameran följer med.
  const truckSpot = playerTruckSpotOf(sim);
  const at = useMemo(() => playerTruckPlacement(truckSpot), [truckSpot]);
  const crew = useMemo(() => {
    const grill = createFigureRig({ variant: 'staff', garmentColour: TRUCK_CREW.grill.uniform });
    const hatch = createFigureRig({ variant: 'staff', garmentColour: TRUCK_CREW.hatch.uniform });
    // ORDER 330 G — Jonas, den extra handen, vid grillen de kvällar han är inne (dold annars).
    const jonas = createFigureRig({ variant: 'staff', garmentColour: TRUCK_CREW.extra.uniform });
    jonas.root.visible = false;
    const g = new THREE.Group();
    g.name = 'playerTruckCrew';
    g.position.set(at.x, 0, at.z);
    g.rotation.y = at.rotationY;
    // Grillaren vänd mot gallret (−Z), den vid luckan mot luckan (+Z).
    grill.root.position.set(TRUCK_LAYOUT.stations.grill[0], FLOOR_Y_M, TRUCK_LAYOUT.stations.grill[1]);
    grill.root.rotation.y = TRUCK_LAYOUT.stationYaw.grill;
    hatch.root.position.set(TRUCK_LAYOUT.stations.hatch[0], FLOOR_Y_M, TRUCK_LAYOUT.stations.hatch[1]);
    jonas.root.position.set(TRUCK_LAYOUT.stations.grill[0], FLOOR_Y_M, TRUCK_LAYOUT.stations.grill[1]);
    jonas.root.rotation.y = TRUCK_LAYOUT.stationYaw.grill;
    g.add(grill.root, hatch.root, jonas.root);
    // Gästerna i byns ram: de går in från gatorna och ut igen.
    const guestsGroup = new THREE.Group();
    guestsGroup.name = 'playerTruckGuests';
    // ORDER 319c — medhjälparens tändare (staff.walkLighter, staff.lightTorch), och andedräkten en sval kväll.
    const lighterProp = createProp('lighter');
    holdProp(lighterProp, hatch, 'R', guestsGroup);
    lighterProp.group.visible = false;
    const breathMat = new THREE.MeshBasicMaterial({ color: '#ecf0f6', transparent: true, depthWrite: false, opacity: 0 });
    const breaths = Array.from({ length: BREATH.pool }, () => { const b = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), breathMat.clone()); b.visible = false; guestsGroup.add(b); return b; });
    // ORDER 320 — stamgästen vid vår vagn med kaffet som spelaren bjöd på (Designs D10, omtaget: TRUCK_REGULAR), i
    // byns ram.
    const regular = createFigureRig({ variant: 'guest', garmentColour: TRUCK_REGULAR.look.body });
    regular.root.visible = false;
    const regularGroup = new THREE.Group();
    regularGroup.name = 'rivalRegular';
    regularGroup.add(regular.root);
    // Kontrollskriptet (scripts/order315b-2-check.mjs) läser besättningens läge härifrån.
    if (typeof window !== 'undefined') (window as unknown as { __nxTruckCrew?: unknown }).__nxTruckCrew = { g, grill: grill.root, hatch: hatch.root, jonas: jonas.root, guests: guestsGroup };
    // ORDER 325 — besättningens ansikten (alltid nöjda, FACE.staffMood).
    const crewFaces = [attachFace(grill, FACE.staffMood), attachFace(hatch, FACE.staffMood), attachFace(jonas, FACE.staffMood)];
    return { g, grill, hatch, jonas, guestsGroup, lighterProp, breaths, regular, regularGroup, crewFaces };
  }, [at]);
  // En figur per gäst, med gästens kläder; figurerna återanvänds per klädindex.
  const rigs = useRef({ live: new Map<string, FigureRig>(), free: new Map<number, FigureRig[]>(), children: new Map<string, FigureRig>(), freeChildren: [] as FigureRig[] });
  const frustum = useMemo(() => ({ f: new THREE.Frustum(), m: new THREE.Matrix4(), p: new THREE.Vector3() }), []);
  const flow = useMemo(() => new TruckGuestFlow(at, (x, z) => {
    for (const y of [0, FIGURE_TOP_M]) if (frustum.f.containsPoint(frustum.p.set(x, y, z))) return true;
    return false;
  }, GUEST_GARMENTS.length), [at, frustum]);
  useEffect(() => () => {
    [crew.grill, crew.hatch, crew.jonas].forEach((r) => r.materials.forEach((m) => m.dispose()));
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
  // ORDER 319c — medhjälparens runda (följer simuleringens errand), maten i händerna och paraplyerna.
  const round = useRef<{ kind: 'torches' | 'clear' | null; elapsed: number }>({ kind: null, elapsed: 0 });
  const assistantOut = useRef<[number, number] | null>(null);
  const queueWalkStride = useRef(0);
  // ORDER 327 B — medhjälparen på rundan som blickkontakt (världens ram), och stegen per gäst vid ståborden.
  const assistantGlance = useRef<StaffGlance | null>(null);
  const hatchWants = useRef(new Map<string, WantTrack>());
  // ORDER 328 B — svaret från luckan: grillaren eller medhjälparen tittar upp mot gästen, nickar och lyfter handen.
  // ORDER 330 G — kvällar med Jonas: om besättningen står bytt, och Nils runda längs kön.
  const crewSwapped = useRef(false);
  const queueWalk = useRef(newQueueWalk(QUEUE_WALK_HOME));
  const hatchAck = useRef<{ guestId: string; by: 'hatch' | 'grill'; at: number; used: boolean; yaw: number } | null>(null);
  const regularAt = useRef<[number, number] | null>(null);
  const breath = useRef(crew.breaths);
  const kits = useMemo(() => { const k = new EatKits(crew.guestsGroup); k.frame = at; return k; }, [crew, at]);
  const lighterProp = crew.lighterProp;
  // ORDER 319b — medhjälparen vinkar fram den nyfikna (truck.beckon) och säger sin replik.
  const beckon = useRef<{ at: number; guestId: string; line: number } | null>(null);
  const marker = useRef<CuriousMarkerState>({ seq: null, x: 0, z: 0, y: 0, settledGuest: null, beckon: null });
  const queueSince = useRef(new Map<string, number>());
  // ORDER 325 — ett ansikte per gästfigur (figurerna återanvänds, ansiktet följer med figuren).
  const faces = useRef(new WeakMap<FigureRig, FaceHandle>());
  // ORDER 325 §2 — avståndet till huvudena vid vagnen för mätningen (faceProbe.ts).
  const faceProbe = useMemo(() => new FaceProbe('faceDistTruck'), []);
  // ORDER 332 B (Designs D12 figureLife.ts) — livet och ansiktenas övergångar per figur, och vem medhjälparen nickat åt
  // i kön (gästens id → när), så att gästen nickar tillbaka (REACTIONS.passNod).
  const lives = useRef(new FigureLives());
  // ORDER 334 B — stamgästernas egna koppar (Magasinsgatan): i handen i kön och på väg, inte vid ståbordet.
  const regularCups = useRef(new Map<string, PropHandle>());
  const passNods = useRef(new Map<string, { at: number; from: [number, number] }>());
  const reducedMotion = usePrefersReducedMotion();
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;
  useFrame((state, delta) => {
    // ORDER 332 C — Grillstugans tak och markisens duk tonar som husens tak (roofAt); markisen syns när den är köpt
    // och vagnen är våt i regnet (playerTruck.ts stuganStateFor, applyStuganState). Vagnen ritas av VillageVenues.
    const trailer = scene.getObjectByName('playerTrailer');
    const stuganState = stuganStateFor(sim);
    applyStuganState(trailer, stuganState, actualRef.current.distance);
    // Personalen står i vagnen när vagnen står på torget.
    crew.g.visible = isTruck && shown(trailer);
    const t = state.clock.elapsedTime;
    // ORDER 319c — vädret vid vagnen i kväll (sim/truckLife.ts).
    const cold = isTruck && truckOf(sim).weather === 'cool';
    const raining = isTruck && truckRaining(sim);
    // ORDER 332 C — kön i kväll: i regn med eller utan markisen (D13), och tätt efter regnets situation.
    const flowWeather = { raining, tight: raining && situationTonight(sim, 'ft08-regnet').phase === 'done', awning: stuganState.awning };
    const queueNow = queueInForce(flowWeather);
    const helperUmbrella = raining && queueNow.helperUmbrella;
    // ORDER 320 — de sex situationerna (sim/truckSituations.ts): vad figurerna gör (Designs D10).
    const sit = {
      rain: situationTonight(sim, 'ft08-regnet'), wasp: situationTonight(sim, 'ft09-getingen'), card: situationTonight(sim, 'ft10-kortet'),
      stock: situationTonight(sim, 'ft11-slut'), dog: situationTonight(sim, 'ft12-hunden'), rival: situationTonight(sim, 'ft13-priset')
    };
    const live = (x: SituationPhase) => x.phase === 'cue' || x.phase === 'active';
    const hatchWorld = toWorld(at, TRUCK_LAYOUT.stations.hatch[0], TRUCK_LAYOUT.stations.hatch[1]);
    const waiting = sim.waitingIds.length;
    const tempo: TempoId = waiting > QUEUE_STRESSED ? 'stressed' : waiting > QUEUE_CALM ? 'normal' : 'calm';
    const stress = tempo === 'stressed' ? 1 : tempo === 'normal' ? 0.5 : 0;
    if (crew.g.visible) {
      // ORDER 330 G — den extra handen (HIRE_PREP_HAND): Jonas vid grillen, grillaren i luckan, Nils längs kön.
      // ORDER 331 C — laget: en anställd utöver vagnens lag är Jonas vid grillen varje kväll; den som slutat syns inte.
      const team = truckCrewShown(sim.team);
      const extra = isTruck && (!!sim.day.prepHand || team.jonas);
      crew.jonas.root.visible = extra;
      crew.grill.root.visible = team.grill;
      crew.hatch.root.visible = team.hatch;
      if (extra !== crewSwapped.current) {
        crewSwapped.current = extra;
        const G = TRUCK_LAYOUT.stations.grill, H = TRUCK_LAYOUT.stations.hatch;
        if (extra) { crew.grill.root.position.set(H[0], FLOOR_Y_M, H[1]); crew.grill.root.rotation.y = 0; queueWalk.current = newQueueWalk(QUEUE_WALK_HOME); }
        else { crew.grill.root.position.set(G[0], FLOOR_Y_M, G[1]); crew.grill.root.rotation.y = TRUCK_LAYOUT.stationYaw.grill; crew.hatch.root.position.set(H[0], FLOOR_Y_M, H[1]); crew.hatch.root.rotation.y = 0; assistantOut.current = null; assistantGlance.current = null; }
      }
      const grillRig = extra ? crew.jonas : crew.grill;
      const hatchRig = extra ? crew.grill : crew.hatch;
      // ORDER 320 — grillaren tar korv ur lådan när den håller på att ta slut (ft11), och vänder vegokorven
      // med vegotången med jämna mellanrum (D10 staff.switchTongs, staff.turnVeg).
      const vegCycle = t % VEG_EVERY_S, sw = CLIPS['staff.switchTongs'].seconds.normal, tv = CLIPS['staff.turnVeg'].seconds.normal;
      // ORDER 325 (D11 guestSpeaks) — medhjälparen är ute och en gäst vinkar vid luckan: grillaren vänder sig och lyssnar.
      const hatchWaiting = !!truckOf(sim).errand && [...flow.walkers.values()].some((w) => w.settled && w.spot?.pose === 'order');
      // ORDER 328 B — vem som svarar på en gäst vid ståbordet som söker blicken: medhjälparen när den står vid luckan
      // och inte serverar, annars grillaren när den inte lyssnar vid luckan eller tar korv ur lådan.
      const ack = hatchAck.current;
      if (ack && t - ack.at >= HATCH_ACK_S) hatchAck.current = null;
      if (!hatchAck.current) {
        const errandNow = !!truckOf(sim).errand;
        const servingNow = t - served.current.at < CLIPS['truck.hatchServe'].seconds[tempo];
        const beckoning = !!beckon.current && t < beckon.current.at + CLIPS['truck.beckon'].seconds.normal;
        const by: 'hatch' | 'grill' | null = !errandNow && !servingNow && !beckoning && sit.card.phase !== 'active' ? 'hatch'
          : !hatchWaiting && !live(sit.stock) ? 'grill' : null;
        for (const [guestId, tr] of hatchWants.current) {
          const st = wantStep(tr, flow.clock);
          if (!by || tr.ackAt !== null || !st || st === 'nod' || tr.nodded.includes(st)) continue;
          const gw = flow.walkers.get(guestId);
          if (!gw) continue;
          const gp = flow.shown.get(guestId) ?? [gw.x, gw.z];
          const from = by === 'hatch' ? hatchWorld : toWorld(at, TRUCK_LAYOUT.stations.grill[0], TRUCK_LAYOUT.stations.grill[1]);
          const rig = by === 'hatch' ? hatchRig : grillRig;
          const yaw = wrap(Math.atan2(gp[0] - from[0], gp[1] - from[1]) - at.rotationY - rig.root.rotation.y);
          hatchAck.current = { guestId, by, at: t, used: false, yaw: Math.max(-SEEK_MAX_YAW, Math.min(SEEK_MAX_YAW, yaw)) };
          break;
        }
      }
      const answering = hatchAck.current;
      if (answering?.by === 'grill') poseAnswer(grillRig, t - answering.at, answering.yaw);
      else if (hatchWaiting) applyPose(grillRig, sampleClip('staff.listenTilt', t, 'normal', { yaw: TRUCK_GESTURE.grillTurnYaw }).pose);
      else if (live(sit.stock)) applyPose(grillRig, sampleClip('staff.takeFromBox', t % CLIPS['staff.takeFromBox'].seconds.normal, 'normal').pose);
      else if (vegCycle < sw) applyPose(grillRig, sampleClip('staff.switchTongs', vegCycle, 'normal').pose);
      else if (vegCycle < sw + tv) applyPose(grillRig, sampleClip('staff.turnVeg', vegCycle - sw, 'normal').pose);
      else if (vegCycle < sw * 2 + tv) applyPose(grillRig, sampleClip('staff.switchTongs', vegCycle - sw - tv, 'normal').pose);
      else applyPose(grillRig, sampleClip('truck.grill', t, tempo, { stress }).pose);
      // En gäst som fått sin mat (dagens notor) ger ett varv truck.hatchServe.
      const bills = sim.day.billsTonight ?? 0;
      if (served.current.count < 0) served.current.count = bills;
      if (bills > served.current.count) served.current = { count: bills, at: t };
      const serveLen = CLIPS['truck.hatchServe'].seconds[tempo];
      const since = t - served.current.at;
      const b = beckon.current;
      const beckonLen = CLIPS['truck.beckon'].seconds.normal;
      const bw = b ? flow.walkers.get(b.guestId) : null;
      // ORDER 319c — medhjälparen är ute: tänder marschallerna eller städar ett bord (torchRound.ts).
      const errand = truckOf(sim).errand;
      if (errand) {
        const rs = round.current;
        const simElapsed = errand.total - errand.left;
        if (rs.kind !== errand.kind || Math.abs(rs.elapsed - simElapsed) > ROUND_SYNC_S) rs.elapsed = simElapsed;
        rs.kind = errand.kind;
        rs.elapsed = Math.min(errand.total, rs.elapsed + Math.min(MAX_DT_S, delta) * effectiveSpeed(sim));
        const rp = errand.kind === 'torches' ? torchRoundPose(rs.elapsed, errand.total) : clearRoundPose(errand.table, rs.elapsed, errand.total);
        poseRound(crew.hatch, rp, errand.kind === 'torches');
        assistantOut.current = rp.at;
        const aw = toWorld(at, rp.at[0], rp.at[1]);
        assistantGlance.current = { key: 'hatch', x: aw[0], z: aw[1], facing: rp.yaw + at.rotationY, walking: rp.act === 'walk', visible: true };
        lighterProp.group.visible = errand.kind === 'torches';
        if (errand.kind === 'torches') updateHeld(lighterProp);
      } else if (round.current.kind) {
        round.current.kind = null;
        assistantOut.current = null;
        assistantGlance.current = null;
        lighterProp.group.visible = false;
        if (!extra) {
          crew.hatch.root.position.set(TRUCK_LAYOUT.stations.hatch[0], FLOOR_Y_M, TRUCK_LAYOUT.stations.hatch[1]);
          crew.hatch.root.rotation.y = 0;
        }
      }
      if (extra && !errand) {
        // ORDER 330 G — Nils går från gäst till gäst i kön och tar beställningarna (village/queueWalk.ts).
        // ORDER 332 C — kön som gäller (i regn D13: under markisen eller med paraplyer), inte alltid den torra kön.
        const spots = [...flow.walkers.values()].filter((w) => w.settled && w.spot?.pose === 'queue').map((w) => queueLineAt(queueNow, w.spot!.index ?? 0)).sort((a, b) => b[0] - a[0]);
        const qp = stepQueueWalk(queueWalk.current, Math.min(MAX_DT_S, delta) * effectiveSpeed(sim), spots, QUEUE_WALK_HOME, queueWalkStride.current, queueNow.helperOutM);
        if (qp.act === 'walk') queueWalkStride.current = qp.u;
        crew.hatch.root.position.set(qp.at[0], onDeck(qp.at[0], qp.at[1]) ? DECK_TOP_M : 0, qp.at[1]);
        crew.hatch.root.rotation.y = qp.yaw;
        const nw = toWorld(at, qp.at[0], qp.at[1]);
        // ORDER 332 B (D12 REACTIONS.passNod, staff.walkNod) — på väg längs kön nickar Nils åt den hen går förbi, och
        // gästen nickar tillbaka efter sitt temperaments reactDelayS (guest.glanceNodStand nedan).
        const queued = qp.act === 'walk' ? [...flow.walkers.values()].filter((w) => w.settled && w.spot?.pose === 'queue') : [];
        const nod = queued.length ? passNodTarget({ x: nw[0], z: nw[1], yaw: qp.yaw + at.rotationY }, queued.map((w) => { const p = flow.shown.get(w.id) ?? [w.x, w.z]; return { x: p[0], z: p[1] }; })) : null;
        if (nod) {
          const id = queued[nod.index].id, prev = passNods.current.get(id);
          if (!prev || t - prev.at > TRUCK_PASS_NOD_AGAIN_S) passNods.current.set(id, { at: t, from: [nw[0], nw[1]] });
        }
        // ORDER 332 C (D13) — i regn utan markis går Nils med paraply utanför kön och lyssnar i stället för att skriva.
        const helperPose = qp.act === 'walk'
          ? (nod && !reducedRef.current ? sampleClip('staff.walkNod', 0, 'normal', { phase: qp.u / TRUCK_GUESTS.strideM, yaw: nod.yaw }).pose : poseWalk(qp.u / TRUCK_GUESTS.strideM))
          : qp.act === 'take' && !helperUmbrella ? sampleClip('staff.write', qp.u, 'normal').pose : sampleClip('staff.idle', t, 'calm').pose;
        applyPose(crew.hatch, helperUmbrella ? { ...helperPose, armR: UMBRELLA_ARM } : helperPose);
        assistantOut.current = qp.at;
        assistantGlance.current = { key: 'hatch', x: nw[0], z: nw[1], facing: qp.yaw + at.rotationY, walking: qp.act === 'walk', visible: true };
      }
      if (errand && !extra) { /* ute på rundan */ } else if (answering?.by === 'hatch') {
        poseAnswer(hatchRig, t - answering.at, answering.yaw);
      } else if (b && t >= b.at && t < b.at + beckonLen) {
        // Mot gästen, i figurens ram (vänd mot luckan, vagnens +Z).
        const p = bw ? flow.shown.get(bw.id) ?? [bw.x, bw.z] : null;
        const yaw = p ? wrap(Math.atan2(p[0] - hatchWorld[0], p[1] - hatchWorld[1]) - at.rotationY) : 0;
        applyPose(hatchRig, sampleClip('truck.beckon', t - b.at, 'normal', { yaw }).pose);
      } else if (sit.card.phase === 'active') {
        // ORDER 320 — kortläsaren (ft10): medhjälparen lutar sig ut och trycker på läsaren.
        applyPose(hatchRig, sampleClip('staff.checkTerminal', t % CLIPS['staff.checkTerminal'].seconds.normal, 'normal').pose);
      } else if (sit.card.phase === 'done' && sit.card.quality === 'best' && sim.simTime - sit.card.at < CLIPS['staff.pointSwish'].seconds.normal * 2) {
        applyPose(hatchRig, sampleClip('staff.pointSwish', sim.simTime - sit.card.at, 'normal').pose);
      } else applyPose(hatchRig, since < serveLen
        // ORDER 320 — i regnet stängs locket på tråget innan det räcks ut (D10 truck.serveLidded).
        ? (raining ? sampleClip('truck.serveLidded', since * CLIPS['truck.serveLidded'].seconds.normal / serveLen, 'normal').pose : sampleClip('truck.hatchServe', since, tempo, { stress, hand: 'L' }).pose)
        : sampleClip('truck.wipeCounter', t, tempo, { stress }).pose);
    }
    // ORDER 332 C — Nils paraply längs kön (D13 RAIN_QUEUE.withoutAwning: medhjälparen med paraply utanför kön).
    kits.umbrella(crew.hatch, 'staff:nils', crew.g.visible && crew.hatch.root.visible && helperUmbrella && crewSwapped.current && !truckOf(sim).errand, HELPER_UMBRELLA_HASH);
    // ORDER 332 B — besättningens liv (lugn, nöjd) efter posen: blinkningar och huvudets små rörelser.
    [crew.grill, crew.hatch, crew.jonas].forEach((rig, i) => {
      const f = crew.crewFaces[i];
      if (crew.g.visible && rig.root.visible) liveFrame(rig, f, lives.current.of(`crew:${i}`, 'calm'), { t, busy: 1, standing: true, mood: FACE.staffMood, k: faceKOf('clear', 'calm'), reduced: reducedRef.current });
      f.update(camera);
    });

    // ORDER 320 — stamgästen vid vår vagn när Grillvagnen har satt upp sin skylt (ft13): var sjätte sekund en klunk
    // (fika.sipCup), och efter en sekund vänder hen sig mot skylten och skålar (guest.toastCup).
    crew.regular.root.visible = isTruck && sit.rival.phase !== 'none';
    regularAt.current = null;
    if (crew.regular.root.visible) {
      const [rx, rz] = toWorld(at, TRUCK_REGULAR.p[0], TRUCK_REGULAR.p[1]);
      const s0 = TRUCK_STANDS.torget, c = Math.cos(RIVAL_YAW), n = Math.sin(RIVAL_YAW);
      const sx = s0.x + RIVAL_SIGN.p[0] * c + RIVAL_SIGN.p[1] * n, sz = s0.z - RIVAL_SIGN.p[0] * n + RIVAL_SIGN.p[1] * c;
      crew.regular.root.position.set(rx, 0, rz);
      crew.regular.root.rotation.y = Math.atan2(sx - rx, sz - rz);
      regularAt.current = [rx, rz];
      const k = t % TRUCK_REGULAR.cycleS, sip = REGULAR_SIP_S, toast = CLIPS['guest.toastCup'].seconds.normal;
      if (k < sip) applyPose(crew.regular, sampleClip('fika.sipCup', k * CLIPS['fika.sipCup'].seconds.normal / sip, 'normal', { seated: false }).pose);
      else if (k >= sip + REGULAR_PAUSE_S && k < sip + REGULAR_PAUSE_S + toast) applyPose(crew.regular, sampleClip('guest.toastCup', k - sip - REGULAR_PAUSE_S, 'normal').pose);
      else applyPose(crew.regular, sampleClip('guest.standBar', t, 'calm').pose);
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
    const others: OtherBody[] = [];
    if (assistantOut.current) { const p = toWorld(at, assistantOut.current[0], assistantOut.current[1]); others.push({ key: 'staff:hatch', x: p[0], z: p[1] }); }
    // ORDER 320 — stamgästen vid vagnen räknas i trängseln.
    if (regularAt.current) others.push({ key: 'regular', x: regularAt.current[0], z: regularAt.current[1] });
    const events = flow.update(sim.guests, sim.waitingIds, Math.min(MAX_DT_S, delta) * effectiveSpeed(sim), cq ? { current: cq.current, last: cq.last } : null, flowWeather, others);
    const R = rigs.current;
    for (const e of events) {
      if (e.kind === 'rename') {
        // ORDER 319b — den nyfikna ställde sig i kön: samma figur, nu gästen. Vid rätt svar vinkar medhjälparen.
        const r = R.live.get(e.from!);
        if (r) { R.live.delete(e.from!); R.live.set(e.id, r); r.root.userData.guestId = e.id; }
        const ch = R.children.get(e.from!);
        if (ch) { R.children.delete(e.from!); R.children.set(e.id, ch); ch.root.userData.guestId = childKey(e.id); }
        if (cq?.last?.guestId === e.id && cq.last.grade === 'right') {
          beckon.current = { at: t + CURIOUS.card.beckonAtSeconds, guestId: e.id, line: (cq.tonight.right - 1) % CURIOUS.hatchLines };
        }
        continue;
      }
      if (e.kind === 'spawn') {
        const look = flow.walkers.get(e.id)!.look;
        const r = R.free.get(look)?.pop() ?? withScarf(createFigureRig({ variant: 'guest', garmentColour: GUEST_GARMENTS[look] }));
        r.root.userData.look = look;
        r.root.userData.guestId = e.id;
        r.root.visible = true;
        crew.guestsGroup.add(r.root);
        R.live.set(e.id, r);
        // ORDER 319b del 2 — barnet bredvid en nyfiken som kommer med barn.
        if (flow.walkers.get(e.id)?.child) {
          const c = R.freeChildren.pop() ?? createFigureRig({ variant: 'guest', garmentColour: GUEST_GARMENTS[(look + 3) % GUEST_GARMENTS.length] });
          c.root.scale.setScalar(CHILD_SCALE);
          c.root.userData.guestId = childKey(e.id);
          c.root.visible = true;
          crew.guestsGroup.add(c.root);
          R.children.set(e.id, c);
        }
      } else {
        const c = R.children.get(e.id);
        if (c) { R.children.delete(e.id); c.root.visible = false; crew.guestsGroup.remove(c.root); R.freeChildren.push(c); }
        kits.drop(e.id);
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
    breath.current.forEach((b) => { b.visible = false; });
    let breaths = 0;
    // ORDER 325 — gästernas stämning (ansiktet) och hur många som står vid samma ståbord (prat och skratt).
    const simGuests = new Map(sim.guests.map((g) => [g.id, g] as const));
    const atTable = new Map<string, number>();
    for (const w of flow.walkers.values()) if (w.settled && w.spot?.pose === 'eat' && w.spot.key) { const k = w.spot.key.split('-')[0]; atTable.set(k, (atTable.get(k) ?? 0) + 1); }
    const errandOut = !!truckOf(sim).errand;
    // ORDER 332 B — de som står och pratar vid samma ståbord (samtalet, moodGestures.conversationAt), klippen som redan
    // spelas vid bordet (grannarna gör inte samma variant), och figurerna som lever den här bildrutan.
    const talkers = new Map<string, { id: string; temper: TemperamentId; number: number; glad: boolean }[]>();
    for (const w of flow.walkers.values()) {
      if (!w.settled || w.spot?.pose !== 'eat' || !w.spot.key || w.spot.seated) continue;
      const sg = simGuests.get(w.id);
      const v = sg ? guestMoodValue(sg, sim.day.roomMoodLift ?? 0) : MOOD_BALANCE.threshold.content;
      if (v < MOOD_BALANCE.threshold.content) continue;
      const k = w.spot.key.split('-')[0];
      talkers.set(k, [...(talkers.get(k) ?? []), { id: w.id, temper: temperamentForGuest(w.id, sg?.guestType ? groupOfGuestType(sg.guestType) : null), number: guestNumber(w.id), glad: v >= MOOD_BALANCE.threshold.delighted }]);
    }
    for (const list of talkers.values()) list.sort((a, b) => (a.id < b.id ? -1 : 1));
    const tableClips = new Map<string, string[]>();
    const lifeKeep = new Set<string>();
    for (const w of flow.walkers.values()) {
      const r = R.live.get(w.id);
      if (!r) continue;
      const p = flow.shown.get(w.id) ?? [w.x, w.z];
      // ORDER 319c — rock en sval kväll, två av tre med halsduk (Designs cool.coats och scarves).
      const h = hashId(w.id);
      dressFor(r, cold, w.look, h);
      const child = R.children.get(w.id);
      if (child) poseChild(child, w, flow.shown.get(childKey(w.id)) ?? p, t);
      // ORDER 319b — kroppsspråket i kön: en blick på klockan efter en stund (STREET_QUEUE).
      const inQueue = w.settled && w.spot?.pose === 'queue';
      const qs = queueSince.current;
      if (inQueue && !qs.has(w.id)) qs.set(w.id, t);
      if (!inQueue) qs.delete(w.id);
      const sg = simGuests.get(w.id);
      const mood: MoodId = sg ? moodOf(guestMoodValue(sg, sim.day.roomMoodLift ?? 0)) : 'content';
      let face = faces.current.get(r);
      if (!face) { face = attachFace(r, mood); faces.current.set(r, face); }
      // ORDER 332 B (D12) — temperamentet ur gästens nummer och grupp, intensiteten ur trycket (stämningen, eller
      // väntan i kön mot vinkningens gräns), gestens storlek och ansiktets intensitet.
      const value = sg ? guestMoodValue(sg, sim.day.roomMoodLift ?? 0) : MOOD_BALANCE.threshold.content;
      const temper = temperamentForGuest(w.id, sg?.guestType ? groupOfGuestType(sg.guestType) : null);
      const intensity = intensityOfGuest(value, inQueue ? { s: t - qs.get(w.id)!, waveS: GESTURE_BALANCE.waitWaveS } : null);
      const lc: TruckLifeCtx = { amp: ampOf(intensity, temper), number: guestNumber(w.id), temper, nearby: [] };
      const lifeState = lives.current.of(w.id, temper, mood, faceKOf(intensity, temper));
      lifeKeep.add(w.id);
      const lifeFrame = (gm: MoodId | null, standing: boolean) => liveFrame(r, face!, lifeState, { t, busy: gm ? 1 : 0, standing, mood: gm ?? mood, k: faceKOf(intensity, temper), reduced: reducedRef.current });
      if (w.curious && w.curious.stage !== 'walkOn' && cur?.seq === w.curious.seq) {
        const gm = poseCurious(r, w, p, cur, t, at, cold);
        lifeFrame(gm ?? 'waiting', false);
        faceProbe.add(face.update(camera), isTruck && r.root.visible);
        m.seq = cur.seq;
        m.x = r.root.position.x; m.z = r.root.position.z; m.y = r.root.position.y;
        continue;
      }
      const eating = w.spot?.pose === 'eat' && w.settled && w.id !== pointing;
      // ORDER 320 — figurerna i situationerna (D10): gästen vid ståbord A stelnar till inför getingen och tar ett
      // steg åt sidan för hunden; gästen vid luckan försöker betala med kortet; kön står tätt med armarna in i regnet.
      const atTableA = eating && !!w.spot?.key?.startsWith('A-');
      const sp = situationPose(w, atTableA, sit, raining, t);
      let gestureMood: MoodId | null = null;
      if (sp) { r.root.position.set(p[0], w.spot?.y ?? 0, p[1]); r.root.rotation.y = w.spot?.yaw ?? w.yaw; applyPose(r, sampleClip(sp.clip, sp.u, 'normal', { yaw: sp.yaw }).pose); }
      else if (eating) {
        const kit = kits.kitFor(w.id, h, w.spot!.key!, cold);
        // ORDER 327 B (wantsHatch) — vid ståbordet, ätit klart och pengar kvar: blicken mot luckan, handen,
        // vinkningen; blickkontakt med medhjälparen som går förbi på rundan (wantSignals.ts).
        const hw = hatchWantNow(w, sg, kit, flow.clock, sim.seed ?? 0);
        // ORDER 328 B — svaret från luckan räknas som blickkontakt, en gång.
        const answer = hatchAck.current;
        const answered = !!hw && !!answer && answer.guestId === w.id && !answer.used;
        if (answered) answer!.used = true;
        const contact = answered ? answer!.by : hw && assistantGlance.current ? eyeContact([assistantGlance.current], { x: p[0], z: p[1] }) : null;
        const track = stepWant(hatchWants.current.get(w.id) ?? null, hw, flow.clock, contact);
        if (track) hatchWants.current.set(w.id, track); else hatchWants.current.delete(w.id);
        const step = track ? wantStep(track, flow.clock) : null;
        const tableKey = w.spot!.key!.split('-')[0];
        lc.nearby = tableClips.get(tableKey) ?? [];
        gestureMood = step
          ? poseHatchWant(r, w, p, step, flow.clock - track!.since, flow.clock - (track!.ackAt ?? 0), flow.clock - w.settledAt, hatchWorld, cold, kits, kit, lc)
          : poseEater(r, w, p, t, flow.clock - w.settledAt, h, cold, kits, kit, { value, mates: atTable.get(tableKey) ?? 1, talkers: talkers.get(tableKey) ?? [], posOf: (id) => { const o = flow.walkers.get(id); return o ? flow.shown.get(id) ?? [o.x, o.z] : null; } }, lc);
        if (lc.played) tableClips.set(tableKey, [...(tableClips.get(tableKey) ?? []), lc.played]);
      }
      else {
        poseWalker(r, w, p, t, waiting > QUEUE_STRESSED, w.id === pointing ? THEATRE.rocketIntroSeconds.askPointMenu - (active?.introLeft ?? 0) : null, hatchAt, inQueue ? t - qs.get(w.id)! : null, flow.clock - w.outcomeAt, cold, umbrellaOn(w, raining, h, stuganState.awning));
        // ORDER 325 (D11) — stående gester ovanpå: vinka vid luckan när medhjälparen är ute (readyToOrder), en
        // axelryckning i kön när korven tar slut (soldOut).
        gestureMood = truckGesture(r, w, t, errandOut, live(sit.stock), pointing === w.id, cold, flow.clock - w.settledAt, lc);
        // ORDER 332 B (D12 REACTIONS.passNod) — gästen i kön som Nils nickade åt tittar upp och nickar tillbaka.
        const pn = passNods.current.get(w.id);
        if (pn && inQueue && !gestureMood) {
          const k = t - pn.at - TEMPERAMENT[temper].reactDelayS, len = CLIPS['guest.glanceNodStand'].seconds.normal;
          if (k >= 0 && k < len) {
            applyPose(r, sampleClip('guest.glanceNodStand', k, 'normal', { yaw: Math.max(-SEEK_MAX_YAW, Math.min(SEEK_MAX_YAW, yawTo(p[0], p[1], r.root.rotation.y, pn.from[0], pn.from[1]))) }).pose);
            gestureMood = 'content';
          } else if (k >= len) passNods.current.delete(w.id);
        }
      }
      // ORDER 332 B — efter posen: livet och ansiktet som går över (Designs D12 §2).
      lifeFrame(gestureMood, !!w.settled && !w.spot?.seated);
      faceProbe.add(face.update(camera), isTruck && r.root.visible);
      // Maten i händerna på väg till platsen och till sopkorgen; inget efter att servetten är slängd.
      kits.carry(r, w, h, flow.clock - w.outcomeAt, cold, t);
      // Paraply i regnet för den som går utanför markisen (Designs umbrellas.share).
      kits.umbrella(r, w.id, umbrellaOn(w, raining, h, stuganState.awning), h);
      // Andedräkten en sval kväll, för den som står still (Designs cool.breath).
      if (cold && w.settled && breaths < BREATH.pool && ((t + (h % 97) / 37) % TRUCK_WEATHER.cool.breath.everyS) < TRUCK_WEATHER.cool.breath.lifeS) {
        const b = breath.current[breaths++];
        const k = ((t + (h % 97) / 37) % TRUCK_WEATHER.cool.breath.everyS) / TRUCK_WEATHER.cool.breath.lifeS;
        b.visible = true;
        b.position.set(r.root.position.x + Math.sin(r.root.rotation.y) * (BREATH.forwardM + 0.1 * k), r.root.position.y + BREATH.upM + 0.05 * k, r.root.position.z + Math.cos(r.root.rotation.y) * (BREATH.forwardM + 0.1 * k));
        b.scale.setScalar(lerpN(TRUCK_WEATHER.cool.breath.size[0], TRUCK_WEATHER.cool.breath.size[1], k) * 2);
        (b.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - k);
      }
      // Efter rätt svar står bubblan kvar i guld tills gästen står i kön.
      if (w.fromCurious !== undefined && cq?.last?.guestId === w.id) {
        m.settledGuest = { id: w.id, settled: w.settled };
        if (!cur) { m.x = r.root.position.x; m.z = r.root.position.z; m.y = r.root.position.y; }
      }
    }
    // ORDER 334 B — stamgästen har sin egen kopp med sig (samma figur varje kväll, truckGuestFlow.ts newWalker).
    const cups = regularCups.current;
    for (const [id, cup] of cups) {
      const w = flow.walkers.get(id), r = R.live.get(id);
      if (w && r && r.root.visible && !(w.spot?.pose === 'eat' && w.settled)) continue;
      crew.guestsGroup.remove(cup.group);
      cups.delete(id);
    }
    for (const w of flow.walkers.values()) {
      if (w.regular === undefined || (w.spot?.pose === 'eat' && w.settled)) continue;
      const r = R.live.get(w.id);
      if (!r || !r.root.visible) continue;
      let cup = cups.get(w.id);
      if (!cup) { cup = createProp('coffeeCup'); cup.group.name = 'regularCup'; cup.group.userData.regular = w.regular; holdProp(cup, r, 'L', crew.guestsGroup); cups.set(w.id, cup); }
      updateHeld(cup);
    }
    if (typeof window !== 'undefined') (window as unknown as { __nxTruckRegulars?: unknown }).__nxTruckRegulars = { inView: [...cups.keys()], tonight: sim.day.regularsTonight ?? 0 };
    faceProbe.flush();
    for (let i = 0; i < crew.crewFaces.length; i++) lifeKeep.add(`crew:${i}`);
    lives.current.keepOnly(lifeKeep);
    for (const id of passNods.current.keys()) if (!flow.walkers.has(id)) passNods.current.delete(id);
    if (cq?.last?.outcome !== 'join' || !flow.walkers.has(cq.last.guestId ?? '')) m.settledGuest = null;
    const b = beckon.current;
    m.beckon = b && t >= b.at && t < b.at + CURIOUS.hatchLineSeconds ? { line: b.line, x: hatchWorld[0], z: hatchWorld[1] } : null;
  });
  return (
    <>
      <primitive object={crew.g} />
      <primitive object={crew.regularGroup} />
      <primitive
        object={crew.guestsGroup}
        // ORDER 319b — klick på den nyfikna figuren öppnar kortet, som klick på bubblan.
        onClick={(e: ThreeEvent<MouseEvent>) => { if (curiousSeqOf(e.object) === null) return; e.stopPropagation(); if (curiousTalkable(sim)) dispatch({ type: 'CURIOUS_OPEN' }); }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => { if (curiousSeqOf(e.object) === null) return; marker.current.hover = true; document.body.style.cursor = curiousTalkable(sim) ? 'pointer' : ''; }}
        onPointerOut={(e: ThreeEvent<PointerEvent>) => { if (curiousSeqOf(e.object) === null) return; marker.current.hover = false; document.body.style.cursor = ''; }}
      />
      {isTruck && <CuriousMarker state={marker} />}
      {isTruck && <TruckLife at={at} />}
      {isTruck && <TruckSituationsScene at={at} />}
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

/** Barnet går när den vuxna går och står när hen står, vänt åt samma håll. */
function poseChild(c: FigureRig, w: TruckWalker, p: [number, number], t: number): void {
  c.root.position.set(p[0], 0, p[1]);
  c.root.rotation.y = w.yaw;
  const walking = !w.settled && w.holdS <= 0;
  applyPose(c, walking ? poseWalk(w.walkedM / (TRUCK_GUESTS.strideM * CHILD_SCALE)) : sampleClip('guest.queueCalm', t + 1.3, 'calm').pose);
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
function poseCurious(r: FigureRig, w: TruckWalker, p: [number, number], cur: CuriousGuest, t: number, at: TruckFrame, cold: boolean): MoodId | null {
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
    return null;
  }
  r.root.rotation.y = facingSign;
  const queueEnd = toWorld(at, TRUCK_LAYOUT.queue.line[TRUCK_LAYOUT.queue.line.length - 1][0], TRUCK_LAYOUT.queue.line[TRUCK_LAYOUT.queue.line.length - 1][1]);
  const qx = queueEnd[0] - read[0], qz = queueEnd[1] - read[1], ql = Math.hypot(qx, qz) || 1;
  const f = facingSign, fwd: [number, number] = [Math.sin(f), Math.cos(f)], right: [number, number] = [Math.cos(f), -Math.sin(f)];
  const toQueue: [number, number] = [(qx * right[0] + qz * right[1]) / ql, (qx * fwd[0] + qz * fwd[1]) / ql];
  const ctx = {
    lookQueue: yawTo(read[0], read[1], f, queueEnd[0], queueEnd[1]),
    lookPath: cur.side === 'west' ? yawTo(0, 0, f, Math.cos(at.rotationY), -Math.sin(at.rotationY)) : yawTo(0, 0, f, -Math.cos(at.rotationY), Math.sin(at.rotationY)),
    toQueue,
    // ORDER 319c — en sval kväll med armarna i kors (tilläggets guestBodyLanguage.ts cold).
    cold
  };
  let clip: string, u: number;
  let mood: MoodId | null = null;
  if (cur.answer && cur.okLeft !== null) {
    // ORDER 325 (D11 halfGrip) — "nästan" på frågekortet: tvekar, rycker på axlarna (förut klockan) och tvekar igen.
    const k = CURIOUS.okHoldSeconds - cur.okLeft;
    const h1 = CLIPS['guest.hesitate'].seconds.normal, cw = CLIPS['guest.shrugStand'].seconds.normal;
    if (k < h1) { clip = 'guest.hesitate'; u = k; } else if (k < h1 + cw) { clip = 'guest.shrugStand'; u = k - h1; mood = 'waiting'; } else { clip = 'guest.hesitate'; u = k - h1 - cw; }
  } else if (cur.card || phase === 'hesitate') { clip = 'guest.hesitate'; u = cur.card ? t : cur.real - (P.slowDown + P.toSign + P.read + P.smell + P.watch); }
  else if (phase === 'read') { clip = 'guest.readSign'; u = cur.real - P.slowDown - P.toSign; }
  else if (phase === 'smell') { clip = 'guest.smellPoint'; u = cur.real - P.slowDown - P.toSign - P.read; }
  else if (phase === 'watch') { clip = 'guest.checkWatchStand'; u = cur.real - P.slowDown - P.toSign - P.read - P.smell; }
  else { clip = 'guest.queueCalm'; u = t; }
  const yaw = clip === 'guest.smellPoint' ? yawTo(read[0], read[1], f, smoke[0], smoke[1]) : 0;
  const smp = sampleClip(clip, u, 'normal', { ...ctx, yaw });
  applyPose(r, smp.pose);
  addRoot(r, smp.root);
  return mood;
}

/** ORDER 325 (D11 §4) — de stående gesterna vid luckan och i kön, ovanpå poseWalker. Ger stämningen gesten visar
 *  (ansiktet följer gesten), eller null när ingen gest spelas. */
function truckGesture(r: FigureRig, w: TruckWalker, t: number, errandOut: boolean, soldOut: boolean, pointing: boolean, cold: boolean, atSpotS: number, lc: TruckLifeCtx): MoodId | null {
  if (!w.settled || w.holdS > 0 || pointing || !w.spot) return null;
  const G = TRUCK_GESTURE;
  if (w.spot.pose === 'order' && errandOut) {
    // ORDER 326 (D11 (46), GESTURE_RULES.wantLadder) — vid luckan när medhjälparen är ute: gästen söker först
    // grillarens blick in genom luckan (guest.seekEyeStand, rakt fram), räcker upp handen efter seekEyeS
    // (guest.waveStand, readyToOrder) och vinkar stort från waitWaveS (guest.waveWaiterStand). Tiden räknas från att
    // gästen ställt sig vid luckan.
    const B = GESTURE_BALANCE;
    if (atSpotS < B.seekEyeS) {
      const len = CLIPS['guest.seekEyeStand'].seconds.normal;
      playGesture(r, 'guest.seekEyeStand', atSpotS % len, 'normal', { yaw: 0, cold }, lc);
      return 'waiting';
    }
    const [clip, mood]: [string, MoodId] = atSpotS < B.waitWaveS ? ['guest.waveStand', 'content'] : ['guest.waveWaiterStand', 'impatient'];
    // ORDER 332 B — varannan vinkning den andra varianten (D12 pickVariant: numret och hur många gånger).
    const len = CLIPS[clip].seconds.normal, k = t % G.waveEveryS;
    if (k < len) { playGesture(r, clip, k, 'normal', { yaw: 0 }, lc, Math.floor(t / G.waveEveryS)); return mood; }
    return null;
  }
  if (w.spot.pose === 'queue' && soldOut) {
    const len = CLIPS['guest.shrugStand'].seconds.normal, k = (t + (w.spot.index ?? 0) * G.shrugOffsetPerSpotS) % G.shrugEveryS;
    if (k < len) { playGesture(r, 'guest.shrugStand', k, 'normal', { cold }, lc); return 'waiting'; }
  }
  return null;
}

/** ORDER 327 B — vill gästen vid ståbordet ha något från luckan, och sedan när (flödets klocka)? */
function hatchWantNow(w: TruckWalker, sg: { id: string; partyId?: string; guestType?: import('../../types').GuestType } | undefined, kit: EatKit, clock: number, seed: number): { kind: 'hatch'; since: number } | null {
  const s = w.spot;
  if (!s || s.seated || !sg || !/^[ABC]-/.test(s.key ?? '')) return null;
  const doneAt = w.settledAt + eatTotalS(kit);
  const wallet = GUESTS.walletSek[profileFor(seed, sg).wallet];
  return wantsHatch(true, clock >= doneAt, wallet) ? { kind: 'hatch', since: doneAt } : null;
}

/** ORDER 328 B — svaret från luckan: tittar upp mot gästen och nickar (Designs staff.listenTilt, en nick per halvt
 *  varv), och lyfter handen (staff.halt). Vridningen mot gästen, högst SEEK_MAX_YAW. */
const HATCH_ACK_NOD_S = CLIPS['staff.listenTilt'].seconds.normal / 4;
const HATCH_ACK_S = HATCH_ACK_NOD_S + CLIPS['staff.halt'].seconds.normal;
function poseAnswer(rig: FigureRig, since: number, yaw: number): void {
  if (since < HATCH_ACK_NOD_S) applyPose(rig, sampleClip('staff.listenTilt', since, 'normal', { yaw }).pose);
  else applyPose(rig, sampleClip('staff.halt', since - HATCH_ACK_NOD_S, 'normal', { yaw }).pose);
}

/** ORDER 327 B — stegen stående vid ståbordet: blicken mot luckan, handen, vinkningen, eller nicken. */
function poseHatchWant(r: FigureRig, w: TruckWalker, p: [number, number], step: 'eye' | 'hand' | 'wave' | 'nod', sinceS: number, sinceAckS: number, settledS: number, hatchWorld: [number, number], cold: boolean, kits: EatKits, kit: EatKit, lc: TruckLifeCtx): MoodId {
  const s = w.spot!;
  r.root.position.set(p[0], s.y, p[1]);
  r.root.rotation.y = s.yaw;
  let a = Math.atan2(hatchWorld[0] - p[0], hatchWorld[1] - p[1]) - s.yaw;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  const yaw = Math.max(-SEEK_MAX_YAW, Math.min(SEEK_MAX_YAW, a));
  const [clip, u, mood]: [string, number, MoodId] = step === 'nod' ? ['guest.nodApproveStand', sinceAckS, 'content']
    : step === 'eye' ? ['guest.seekEyeStand', sinceS % CLIPS['guest.seekEyeStand'].seconds.normal, 'waiting']
    : step === 'hand' ? ['guest.waveStand', (sinceS - GESTURE_BALANCE.seekEyeS) % CLIPS['guest.waveStand'].seconds.normal, 'content']
    : ['guest.waveWaiterStand', sinceS % CLIPS['guest.waveWaiterStand'].seconds.normal, 'impatient'];
  playGesture(r, clip, u, 'normal', { yaw, cold }, lc);
  kits.pose(kit, r, w, settledS);
  return mood;
}

/** Figurens läge och pose: går, står i kön, beställer (pekar i en situation), hämtar eller äter.
 *  ORDER 319b: ritas där trängseln ställer den (`p`); i kön en blick på klockan efter en stund
 *  (`queued`, sekunder i kön); den nyfikna som just svarat vänder sig mot luckan eller skakar på huvudet. */
function poseWalker(r: FigureRig, w: TruckWalker, p: [number, number], t: number, impatient: boolean, pointing: number | null, hatchAt: [number, number], queued: number | null, sinceOutcome: number, cold = false, umbrella = false): void {
  const near = w.spot ? Math.hypot(w.spot.x - w.x, w.spot.z - w.z) : Infinity;
  r.root.position.set(p[0], w.spot && near < STEP_UP_M ? w.spot.y : 0, p[1]);
  r.root.rotation.y = w.yaw;
  if (w.holdS > 0 && w.binning === 'toss') {
    // ORDER 319c — vid sopkorgen: slänger servetten (guest.binNapkin) och tar två steg från den (guest.leaveTable).
    const bin = CLIPS['guest.binNapkin'].seconds.normal;
    applyPose(r, sinceOutcome < bin ? sampleClip('guest.binNapkin', sinceOutcome, 'normal').pose : sampleClip('guest.leaveTable', sinceOutcome - bin, 'normal').pose);
    return;
  }
  if (w.holdS > 0) {
    // Gästen som ska till kön vänder sig mot luckan; den som svarade fel skakar på huvudet.
    const clip = w.leaving ? 'guest.shakeHead' : 'guest.turnToHatch';
    applyPose(r, sampleClip(clip, sinceOutcome, 'normal', { yaw: yawTo(w.x, w.z, w.yaw, hatchAt[0], hatchAt[1]), cold }).pose);
    return;
  }
  if (!w.settled && umbrella) {
    // ORDER 319c — paraplyet rakt upp i höger hand (Designs rain.umbrellas).
    const pose = poseWalk(w.walkedM / TRUCK_GUESTS.strideM);
    applyPose(r, { ...pose, armR: UMBRELLA_ARM });
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
  // ORDER 332 C (D13) — i kön i regnet utan tak: paraplyet uppe i höger hand, och kön glesare (RAIN_QUEUE).
  if (umbrella && w.spot?.pose === 'queue' && pointing === null) {
    applyPose(r, { ...sampleClip('guest.queueCalm', t + (w.spot.index ?? 0) * 0.7, 'calm').pose, armR: UMBRELLA_ARM });
    return;
  }
  if (queued !== null && pointing === null) {
    const q = STREET_QUEUE, cw = CLIPS['guest.checkWatchStand'].seconds.normal;
    const k = queued - q.patienceSeconds - (w.spot?.index ?? 0) * q.offsetPerGuestSeconds;
    if (k >= 0 && k % q.watchEverySeconds < cw) { applyPose(r, sampleClip('guest.checkWatchStand', k % q.watchEverySeconds, 'normal', { cold }).pose); return; }
  }
  // ORDER 319c — en sval kväll står kön och den som beställer med armarna i kors.
  if (cold && pointing === null && (w.spot?.pose === 'queue' || w.spot?.pose === 'order')) {
    applyPose(r, sampleClip('guest.armsCrossedStand', t + (w.spot?.index ?? 0) * 0.7, 'normal').pose);
    return;
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

// ---------- ORDER 319c — de som äter, maten i händerna, kylan och regnet ----------

function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

function lerpN(a: number, b: number, k: number): number { return a + (b - a) * k; }

/** Paraply för den som går utanför markisen när det regnar (Designs umbrellas.share). */
function umbrellaOn(w: TruckWalker, raining: boolean, h: number, awning: boolean): boolean {
  // ORDER 332 C (D13 RAIN_QUEUE) — i kön har alla som inte står under luckans skiva eller markisen paraply uppe.
  if (raining && w.settled && w.spot?.pose === 'queue') return !rainQueueSpotSheltered(w.spot.index ?? 0, awning);
  return raining && !w.settled && w.holdS <= 0 && !w.binning && !w.curious && ((h >>> 5) % 100) / 100 < TRUCK_WEATHER.rain.umbrellas.share;
}

/** ORDER 332 C — Nils paraplyfärg (en av Designs färger, tableware.ts umbrella). */
const HELPER_UMBRELLA_HASH = 0;

/** En halsduk runt halsen, dold tills det är kallt. */
function withScarf(r: FigureRig): FigureRig {
  const mat = new THREE.MeshStandardMaterial({ color: TRUCK_WEATHER.cool.coats.scarves[0], roughness: 0.9 });
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(SCARF.radius, SCARF.tube, 6, 14), mat);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = SCARF.y;
  scarf.name = 'scarf';
  scarf.visible = false;
  r.joints.neck.add(scarf);
  r.materials.push(mat);
  return r;
}

/** Rock en sval kväll (Designs cool.coats, alla) och halsduk för två av tre; annars gästens egna kläder. */
function dressFor(r: FigureRig, cold: boolean, look: number, h: number): void {
  const C = TRUCK_WEATHER.cool.coats;
  r.garment.color.set(cold ? C.colours[h % C.colours.length] : GUEST_GARMENTS[look]);
  const scarf = r.joints.neck.getObjectByName('scarf') as THREE.Mesh | undefined;
  if (!scarf) return;
  scarf.visible = cold && ((h >>> 3) % 100) / 100 < C.scarfShare;
  if (scarf.visible) (scarf.material as THREE.MeshStandardMaterial).color.set(C.scarves[(h >>> 7) % C.scarves.length]);
}

/** Medhjälparen ute på sin runda, i vagnens ram: inne i vagnen på golvet, på däcket eller på marken. */
function poseRound(rig: FigureRig, rp: RoundPose, torches: boolean): void {
  const B = TRUCK_LAYOUT.body;
  const inside = rp.at[0] > B.x0 && rp.at[0] < B.x1 && rp.at[1] > B.z0 && rp.at[1] < B.z1;
  rig.root.position.set(rp.at[0], inside ? FLOOR_Y_M : onDeck(rp.at[0], rp.at[1]) ? DECK_TOP_M : 0, rp.at[1]);
  rig.root.rotation.y = rp.yaw;
  if (rp.act === 'light') applyPose(rig, sampleClip('staff.lightTorch', rp.u, 'normal').pose);
  // ORDER 325 (D11 tableLeft) — Designs avtorkning vid ståbordet (1,05 m, ctx.high); rundans tid som förut.
  else if (rp.act === 'wipe') applyPose(rig, sampleClip('waiter.wipeTable', rp.u, 'normal', { high: true }).pose);
  else if (torches) applyPose(rig, sampleClip('staff.walkLighter', 0, 'normal', { phase: rp.u / TRUCK_GUESTS.strideM }).pose);
  else applyPose(rig, poseWalk(rp.u / TRUCK_GUESTS.strideM));
}

/** Maten och servetterna för en gäst som äter (Designs EAT_FLOW): korv i bröd med tråg, eller korv med mos på
 *  tallrik med gaffel; burken (muggen en sval kväll); servetten och den använda servetten. */
interface EatKit {
  kind: 'bun' | 'plate';
  key: string;
  main: PropHandle;
  carrier: PropHandle;
  fork: PropHandle | null;
  drink: PropHandle;
  napkin: PropHandle;
  used: PropHandle;
  tossed: boolean;
}

/** Var i ordningen gästen är: segmentet och sekunderna in i det. */
export type EatSeg = 'eat' | 'drink' | 'wipe' | 'warm' | 'done';

/** Ätordningen för korv i bröd eller med mos, vid värmaren eller inte: segmenten och deras längd. */
export function eatOrderFor(kind: 'bun' | 'plate', heater: boolean): { seq: EatSeg[]; len: (x: EatSeg) => number } {
  const eat = CLIPS[kind === 'bun' ? 'guest.eatBun' : 'guest.eatPlate'].seconds.normal;
  const seq: EatSeg[] = heater ? ['eat', 'eat', 'warm', 'eat', 'drink', 'wipe'] : ['eat', 'eat', 'eat', 'drink', 'wipe'];
  const len = (x: EatSeg) => (x === 'eat' ? eat : x === 'drink' ? CLIPS['guest.drink'].seconds.normal : x === 'wipe' ? CLIPS['guest.wipeNapkin'].seconds.normal : CLIPS['guest.warmHands'].seconds.normal);
  return { seq, len };
}

function eatOrder(kit: EatKit): { seq: EatSeg[]; len: (x: EatSeg) => number } {
  return eatOrderFor(kit.kind, kit.key.startsWith('heat'));
}

/** ORDER 327 B — sekunder i ätordningen innan gästen har ätit klart (segmentet 'done'). */
export function eatTotalSFor(kind: 'bun' | 'plate', heater: boolean): number {
  const { seq, len } = eatOrderFor(kind, heater);
  return seq.reduce((s, x) => s + len(x), 0);
}

function eatTotalS(kit: EatKit): number {
  return eatTotalSFor(kit.kind, kit.key.startsWith('heat'));
}

function eatSchedule(kit: EatKit, since: number): { seg: EatSeg; u: number; bites: number; total: number } {
  const { seq, len } = eatOrder(kit);
  const total = seq.filter((x) => x === 'eat').length;
  let t = Math.max(0, since), bites = 0;
  for (const x of seq) {
    if (t < len(x)) return { seg: x, u: t, bites, total };
    t -= len(x);
    if (x === 'eat') bites++;
  }
  return { seg: 'done', u: t, bites, total };
}

/** Brickan eller tallriken står 42 % av radien från bordets mitt mot gästen (Designs EAT_FLOW.onTable). */
const ON_TABLE_SHARE = 0.42;

class EatKits {
  private readonly kits = new Map<string, EatKit>();
  private readonly umbrellas = new Map<string, PropHandle>();
  private readonly canopies = new Map<string, THREE.Material>();
  constructor(private readonly world: THREE.Object3D) {}

  private prop(id: PropId): PropHandle {
    const p = createProp(id);
    this.world.add(p.group);
    return p;
  }

  kitFor(id: string, h: number, key: string, cold: boolean): EatKit {
    let k = this.kits.get(id);
    if (k) return k;
    // Korv med mos bara vid ståborden (Designs EAT_FLOW.kind); bänken, värmaren och hyllan har korv i bröd.
    const plate = key.includes('-') && ((h >>> 11) % 1000) / 1000 < TRUCK_SEATING.plateShare;
    k = {
      kind: plate ? 'plate' : 'bun', key,
      main: this.prop(plate ? 'paperPlate' : 'hotdog'),
      carrier: this.prop(plate ? 'paperPlate' : 'paperTray'),
      fork: plate ? this.prop('fork') : null,
      drink: this.prop(cold ? 'paperCup' : 'drinkCan'),
      napkin: this.prop('napkin'),
      used: this.prop('napkinUsed'),
      tossed: false
    };
    // Tallriken är både det som äts och det som bärs.
    if (plate) { k.main.group.visible = false; }
    k.napkin.group.visible = false;
    k.used.group.visible = false;
    this.kits.set(id, k);
    return k;
  }

  drop(id: string): void {
    const k = this.kits.get(id);
    if (k) {
      for (const p of [k.main, k.carrier, k.fork, k.drink, k.napkin, k.used]) if (p) this.world.remove(p.group);
      this.kits.delete(id);
    }
    const u = this.umbrellas.get(id);
    if (u) { this.world.remove(u.group); this.umbrellas.delete(id); }
  }

  /** Ställer ett föremål på bordet framför gästen: 42 % från bordets mitt mot gästen, `side` meter åt sidan. */
  private onTable(p: PropHandle, w: TruckWalker, side: number): void {
    const s = w.spot!;
    const table = TRUCK_PROPS.standTable.at[s.key!.split('-')[0] as 'A' | 'B' | 'C'];
    const f = this.frame;
    if (!f) return;
    const [cx, cz] = toWorld(f, table[0], table[1]);
    const L = Math.hypot(s.x - cx, s.z - cz) || 1;
    const ux = (s.x - cx) / L, uz = (s.z - cz) / L;
    const d = ON_TABLE_SHARE * (TRUCK_PROPS.standTable.top.diameter / 2);
    const y = (onDeck(table[0], table[1]) ? DECK_TOP_M : 0) + TRUCK_PROPS.standTable.top.height;
    placeProp(p, this.world, cx + ux * d - uz * side, y, cz + uz * d + ux * side, Math.atan2(ux, uz));
  }

  frame: TruckFrame | null = null;

  private held(p: PropHandle, r: FigureRig, side: 'L' | 'R'): void {
    p.group.visible = true;
    if (p.held?.rig !== r || p.held.side !== side) holdProp(p, r, side, this.world);
    updateHeld(p);
  }

  /** Den som äter: maten på bordet eller i handen efter var i ordningen gästen är. */
  pose(k: EatKit, r: FigureRig, w: TruckWalker, since: number): { seg: EatSeg; u: number; left: number } {
    const sc = eatSchedule(k, since);
    const atTable = k.key.includes('-');
    const eats = sc.bites + (sc.seg === 'eat' ? sc.u / CLIPS[k.kind === 'bun' ? 'guest.eatBun' : 'guest.eatPlate'].seconds.normal : 0);
    const left = Math.max(0, 1 - eats / sc.total);
    // Brödet: i handen tills det är uppätet; korven blir kortare för varje tugga (Designs propScale).
    if (k.kind === 'bun') {
      k.main.group.visible = left > 0.02;
      if (k.main.group.visible) { this.held(k.main, r, 'R'); k.main.group.scale.set(0.35 + 0.65 * left, 1, 1); }
    } else {
      k.fork!.group.visible = sc.seg === 'eat';
      if (k.fork!.group.visible) this.held(k.fork!, r, 'R');
    }
    // Tråget eller tallriken på bordet; utan bord i vänster hand (bänken, värmaren) eller på hyllan.
    if (atTable) { k.carrier.group.visible = true; this.onTable(k.carrier, w, 0); }
    else k.carrier.group.visible = false;
    if (k.kind === 'plate') k.carrier.setFill(left > 0.05);
    // Burken: på bordet, i vänster hand när gästen dricker (grab 0,15, release 0,88).
    const dl = CLIPS['guest.drink'].seconds.normal;
    const drinking = sc.seg === 'drink' && sc.u > 0.15 * dl && sc.u < 0.88 * dl;
    if (drinking || !atTable) this.held(k.drink, r, 'L'); else this.onTable(k.drink, w, 0.15);
    // Servetten ur hållaren (0,12), skrynklad (0,6), sedan i handen.
    const wl = CLIPS['guest.wipeNapkin'].seconds.normal;
    const wiping = sc.seg === 'wipe';
    k.napkin.group.visible = wiping && sc.u > 0.12 * wl && sc.u < 0.6 * wl;
    if (k.napkin.group.visible) this.held(k.napkin, r, 'R');
    k.used.group.visible = (wiping && sc.u >= 0.6 * wl) || sc.seg === 'done';
    if (k.used.group.visible) this.held(k.used, r, 'R');
    return { seg: sc.seg, u: sc.u, left };
  }

  /** Utanför platsen: maten på väg dit, och servetten och tråget på väg till sopkorgen. */
  carry(r: FigureRig, w: TruckWalker, h: number, sinceOutcome: number, cold: boolean, t: number): void {
    if (w.spot?.pose === 'eat' && w.settled) return;
    if (w.spot?.pose === 'eat' && !w.settled) {
      const k = this.kitFor(w.id, h, w.spot.key!, cold);
      if (k.kind === 'bun') this.held(k.main, r, 'R'); else this.held(k.carrier, r, 'L');
      this.held(k.drink, r, k.kind === 'bun' ? 'L' : 'R');
      return;
    }
    const k = this.kits.get(w.id);
    if (!k) return;
    if (!w.binning) { this.drop(w.id); return; }
    // Till sopkorgen: den använda servetten i höger hand, tråget eller tallriken i vänster (guest.binNapkin holds).
    const binLen = CLIPS['guest.binNapkin'].seconds.normal;
    const toss = CLIPS['guest.binNapkin'].events.find((e) => e.type === 'toss')?.u ?? 0;
    if (w.binning === 'toss' && sinceOutcome >= toss * binLen) {
      if (!k.tossed) { k.tossed = true; TRUCK_SIGNALS.binTossAt = t; }
      this.drop(w.id);
      return;
    }
    for (const p of [k.main, k.fork, k.drink, k.napkin]) if (p) p.group.visible = false;
    this.held(k.used, r, 'R');
    this.held(k.carrier, r, 'L');
  }

  /** Paraplyet i höger hand, i en av Designs färger. */
  umbrella(r: FigureRig, id: string, on: boolean, h: number): void {
    let u = this.umbrellas.get(id);
    if (!on) { if (u) u.group.visible = false; return; }
    if (!u) {
      u = this.prop('umbrella');
      const col = TRUCK_WEATHER.rain.umbrellas.colours[(h >>> 9) % TRUCK_WEATHER.rain.umbrellas.colours.length];
      let mat = this.canopies.get(col);
      if (!mat) { mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.7, side: THREE.DoubleSide }); this.canopies.set(col, mat); }
      const canopy = u.group.getObjectByName('canopy') as THREE.Mesh | undefined;
      if (canopy) canopy.material = mat;
      this.umbrellas.set(id, u);
    }
    this.held(u, r, 'R');
  }
}

/** Den som äter: tre varv med korven (eller gaffeln), dricker, torkar sig med servetten och står kvar. Runt
 *  värmaren värmer gästen händerna mellan tuggorna. På bänken sittande. Blåser servetten iväg griper gästen
 *  efter den (TRUCK_SIGNALS.grab). */
function poseEater(r: FigureRig, w: TruckWalker, p: [number, number], t: number, since: number, h: number, cold: boolean, kits: EatKits, kit: EatKit, g: { value: number; mates: number; talkers: { id: string; temper: TemperamentId; number: number; glad: boolean }[]; posOf: (id: string) => [number, number] | null }, lc: TruckLifeCtx): MoodId | null {
  const s = w.spot!;
  r.root.position.set(p[0], s.y, p[1]);
  r.root.rotation.y = s.yaw;
  const ctx = { seated: !!s.seated, cold };
  const now = eatSchedule(kit, since);
  const grab = TRUCK_SIGNALS.grab.get(w.id);
  const grabLen = CLIPS['guest.grabNapkin'].seconds.normal;
  const clip = now.seg === 'eat' ? (kit.kind === 'bun' ? 'guest.eatBun' : 'guest.eatPlate') : now.seg === 'drink' ? 'guest.drink' : now.seg === 'wipe' ? 'guest.wipeNapkin' : now.seg === 'warm' ? 'guest.warmHands' : null;
  // ORDER 325 (D11 firstBite, firstBiteGreat) — den första tuggan vid ståbordet med en nick, när stämningen är nöjd eller
  // glad (glad i stressat tempo: tre nickar och ett lyft). Talking och joke: när fler står vid samma bord pratar och
  // skrattar de mellan tuggorna (guest.leanTalkStand, guest.laughStand för den som är glad).
  const bite = CLIPS['guest.nodFirstBiteStand'].seconds;
  const glad = g.value >= MOOD_BALANCE.threshold.delighted, pleased = g.value >= MOOD_BALANCE.threshold.content;
  const biteTempo: TempoId = glad ? 'stressed' : 'normal';
  let mood: MoodId | null = null;
  if (grab !== undefined && t - grab >= 0 && t - grab < grabLen) applyPose(r, sampleClip('guest.grabNapkin', t - grab, 'normal', ctx).pose);
  else if (!s.seated && pleased && since < Math.min(bite[biteTempo], GESTURE_BALANCE.firstBiteWithinS)) {
    playGesture(r, 'guest.nodFirstBiteStand', since, biteTempo, ctx, lc);
    mood = glad ? 'delighted' : 'content';
  } else if (clip) applyPose(r, sampleClip(clip, now.u, 'normal', ctx).pose);
  else if (!s.seated && g.mates >= 2 && pleased && g.talkers.length >= 2) {
    // ORDER 332 B (Designs D12 REACTIONS) — samtalet vid ståbordet: de turas om att prata och de andra lyssnar mot den
    // som pratar; berättar någon något roligt svarar den närmaste vid poängen, leendet sprider sig och den som berättade
    // småskrattar tillbaka (moodGestures.conversationAt, en funktion av tiden). Förut pratade alla samtidigt.
    const c = conversationAt(g.talkers, w.id, t, (h % 997) / 997);
    if (c) {
      const at = g.posOf(c.lookAt);
      const yaw = at ? Math.max(-SEEK_MAX_YAW, Math.min(SEEK_MAX_YAW, yawTo(p[0], p[1], s.yaw, at[0], at[1]))) : 0;
      playGesture(r, c.clip, c.u, 'normal', { ...ctx, yaw }, lc);
      mood = c.face.mood;
    } else applyPose(r, sampleClip('guest.standBar', t + (h % 7), 'calm', ctx).pose);
  } else applyPose(r, sampleClip(s.seated ? 'guest.seatedIdle' : 'guest.standBar', t + (h % 7), 'calm', ctx).pose);
  // Föremålen efter posen (handens läge).
  kits.pose(kit, r, w, since);
  return mood;
}

/** ORDER 320 — klippet för en gäst i en av situationerna vid vagnen (Designs D10), eller null. */
function situationPose(w: TruckWalker, atTableA: boolean, sit: Record<'rain' | 'wasp' | 'card' | 'stock' | 'dog' | 'rival', SituationPhase>, raining: boolean, t: number): { clip: string; u: number; yaw?: number } | null {
  if (!w.settled) return null;
  if (atTableA && (sit.wasp.phase === 'cue' || sit.wasp.phase === 'active')) return { clip: 'guest.freeze', u: t, yaw: 0.6 };
  if (atTableA && sit.dog.phase === 'cue') return { clip: 'guest.stepAside', u: t % CLIPS['guest.stepAside'].seconds.normal, yaw: -0.8 };
  if (w.spot?.pose === 'order') {
    if (sit.card.phase === 'cue') return { clip: 'guest.tapCard', u: t % CLIPS['guest.tapCard'].seconds.normal };
    if (sit.card.phase === 'active') return { clip: 'guest.tryAgain', u: t % CLIPS['guest.tryAgain'].seconds.normal };
  }
  if (raining && sit.rain.phase === 'done' && w.spot?.pose === 'queue') return { clip: 'guest.huddle', u: t + (w.spot.index ?? 0) * 0.6 };
  return null;
}