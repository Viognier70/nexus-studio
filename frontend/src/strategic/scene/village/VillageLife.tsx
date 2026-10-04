// ORDER 288 — gästerna i byn (Vision Owner 2026-10-01): "gästtyperna går
// genom byn och väljer krog efter rykte, pris och smak. Bilar utifrån
// parkerar och släpper av sällskap." och "Gruppen syns på kartan och går mot
// den krog den väljer."
//
// Logiken ur Designs Byn och gasterna.html (spawn, advance, arrive, bilarna)
// och byTruckar.js (vagnarna och kön vid luckan), på byns riktiga gator
// (content/villageNetwork.ts) och med simuleringens tal:
//   - Kvällens gäster per krog och typ läses ur simuleringen (sim/village.ts
//     villageEvening med spelarens tak, sim/economy.ts dailyGuestCap). Varje
//     krog får sina sällskap utspridda över kvällen; de går från där typen
//     kommer ifrån (studenterna från Måltidens hus, paren från husen,
//     höginkomsttagarna från hotellet eller med bil) till krogens dörr.
//   - Rusningens bilar (day.wavePending, rush.ts) och bussen (day.villageNotice,
//     sim/village.ts busTonight) är simuleringens egna: bilarna kör in när
//     vågen börjar, bussen kör in när aviseringen kommer och turisterna går
//     till krogen de valde.
//   - Miljardären promenerar från hotellet genom byn när han är i byn, och
//     går till krogen han valde (bokningsboken).
// Figurerna till spelarens krog är byns bild av flödet, inte gästerna i
// rummet: rummets gäster kommer när simuleringen släpper in dem.
//
// Tiden följer simuleringen (spelminuter), så att en gata på 600 m tar
// ungefär sju spelminuter att gå.

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useCamera } from '../../camera/CameraContext';
import { useSimState } from '../../simulation/SimulationProvider';
import { WARM } from '../../../ui/theme/nexusTheme.warm';
import { GAME_MINUTES_PER_SIM_SECOND, GUEST_TYPES, VILLAGE, VILLAGE_QUEUE } from '../../../sim/balance';
import { clockMinutes } from '../../../sim/clock';
import { busTonight, PLAYER_VENUE, POOL_TYPES, venuesTonight, type PoolType } from '../../../sim/village';
import { plannedVillage } from '../../../sim/villageLive';
import { driveNetwork, pointAlong, pointAlongSeg, routeBetween, routeLength, sidewalkOffsets, walkNetwork } from '../../content/villageNetwork';
import { streetWordNow } from '../../../sim/streetWord';
import { hashKey } from '../../util/hash';
import { CAMPUS_POINT, truckSpotPlace, venuePlaces, villageSources } from '../../content/villagePlaces';
import { createRng } from '../../util/rng';
import { readabilityScale } from '../../util/readability';
import { publishVillageLive, type OnWayGroup } from './villageLive';
import type { SimulationState } from '../../types';
import { BLEND, LEVELS } from '../../village/villageEvening';

type Vec2 = [number, number];
type WalkerKind = PoolType | 'social' | 'billionaire' | 'tourist';

// Gångfarten i meter per spelminut. Spelets klocka går fort (en spelminut är
// två simuleringssekunder); med verklig gångfart (78 m per spelminut) sprang
// figurerna över gatan på en sekund. Byns bild går i stället i en fart som
// går att följa på gatans nivå, och sällskapen ger sig av tidigare.
const WALK_M_PER_GAME_MIN = 12;
const DRIVE_M_PER_GAME_MIN = 700;
const TYPE_PACE: Record<WalkerKind, number> = { student: 1.2, middle: 1, high: 0.9, social: 0.95, billionaire: 0.55, tourist: 0.85 };
// Kvällens fönster för ankomsterna, i spelminuter (19.05–22.30).
// ORDER 296 — fönstret står i balance.ts (VILLAGE), som bandet i HUD:en läser.
const ARRIVE_FROM = VILLAGE.arriveFromMinute;
const ARRIVE_UNTIL = VILLAGE.arriveUntilMinute;
const EAT_AT_TRUCK_MIN = 12;
// Gästerna går hem efter måltiden (spelminuter vid bordet).
const STAY_MIN: [number, number] = [70, 130];
const MAX_FIGURES = 360;
const MAX_CARS = 24;
const ON_WAY_RADIUS_M = 160;
const MAX_HEAT = 700;
const HEAT_CELL_M = 8;
// Hur mycket en gäst som går genom en ruta lyser upp den (per spelminut).
const HEAT_PER_GUEST_MIN = 0.6;

// ORDER 302 (Anders 2026-10-04: "Folket på gatan går i rad, med samma avstånd
// och samma fart") — gatans folk:
//   - sällskapens storlek 1–4, få ensamma (PARTY_WEIGHTS);
//   - varje sällskap sin fart (PACE_SPREAD kring gästtypens) och sin sida av
//     gatan; medlemmarna går bredvid varandra, två i bredd (ABREAST_M), och
//     raderna efter varandra (ROW_M);
//   - pauser: ibland stannar ett sällskap, pekar eller pratar en stund
//     (PAUSE_CHANCE, PAUSE_MIN), och vid en annan krogs dörr läser det menyn
//     (MENU_CHANCE inom MENU_NEAR_M);
//   - vid dörren samlas sällskapet innan det går in (GATHER_MIN), också hos
//     konkurrenterna, så att valet syns;
//   - ORDER 303 C, ordet på gatan: efter fel svar stannar några sällskap på väg
//     till oss vid vår dörr, läser menyn och går vidare till en konkurrent.
const PARTY_WEIGHTS: Array<[number, number]> = [[1, 0.08], [2, 0.47], [3, 0.25], [4, 0.2]];
const PACE_SPREAD = 0.25;
const ABREAST_M = 0.62;
const ROW_M = 0.95;
const PAUSE_CHANCE = 0.35;
const PAUSE_MIN: [number, number] = [0.6, 1.8];
const MENU_CHANCE = 0.3;
const MENU_NEAR_M = 9;
const GATHER_MIN = 0.9;
// Före 19.00 tätnar det mot krogarna: sällskapen ger sig av upp till
// EARLY_LEAVE_MIN spelminuter tidigare, och den som är framme före sin tid
// väntar utanför dörren (tittar på menyn) tills det är dags.
const EARLY_LEAVE_MIN = 30;
type PauseKind = 'point' | 'talk' | 'menu';

const TYPE_COLOUR: Record<WalkerKind, string> = {
  student: WARM.guest.student,
  middle: WARM.guest.middle,
  high: WARM.guest.high,
  social: WARM.guest.social,
  billionaire: WARM.guest.billionaire,
  tourist: WARM.guest.middle
};

interface Planned {
  at: number;
  venueId: string;
  type: WalkerKind;
  n: number;
  byCar: boolean;
  source: number;
  key: string;
  // ORDER 297 — huset sällskapet bor i (fönstren släcks medan de är ute).
  homeId?: string | null;
}

interface Walker {
  key: string;
  type: WalkerKind;
  n: number;
  venueId: string;
  route: Vec2[];
  length: number;
  s: number;
  pace: number;
  eatUntil: number | null;
  standAt: Vec2 | null;
  ring: string | null;
  arrived: boolean;
  // På väg hem efter måltiden (räknas inte som gäst på väg in).
  homeward: boolean;
  source: number;
  homeId?: string | null;
  // ORDER 302 — sidan av gatan (−1/1), trottoarens avstånd per punkt i rutten,
  // pauserna längs vägen, pausen eller samlingen som pågår och vart de tittar.
  side?: number;
  offsets?: number[];
  pauses?: Array<{ s: number; minutes: number; kind: PauseKind; look: number | null }>;
  pauseUntil?: number | null;
  pauseKind?: PauseKind | null;
  look?: number | null;
  gatherUntil?: number | null;
  wordAway?: boolean;
  // Planens tid vid dörren: den som är framme tidigare väntar utanför.
  dueAt?: number;
}

interface Car {
  route: Vec2[];
  length: number;
  s: number;
  parkedAt: number | null;
  drop: Planned | null;
  colour: string;
  bus: boolean;
  // Meter per spelminut.
  speed: number;
}

// ORDER 297 (Designs leverans Byn i kvällsljus §6): sällskapen kommer från
// bostadshus inom HOME_RADIUS_M från krogen, och studenterna från campus när
// krogen ligger inom CAMPUS_RADIUS_M; annars från ett hus nära krogen.
const HOME_RADIUS_M = 260;
const CAMPUS_RADIUS_M = 380;
const NEAREST_HOMES = 6;

function homeNear(door: Vec2, rnd: () => number): { node: number; homeId: string | null } {
  const src = villageSources();
  const near = src.homeBuildings.filter((h) => Math.hypot(h.centre[0] - door[0], h.centre[1] - door[1]) < HOME_RADIUS_M);
  const pool = near.length > 0 ? near : [...src.homeBuildings].sort((a, b) => Math.hypot(a.centre[0] - door[0], a.centre[1] - door[1]) - Math.hypot(b.centre[0] - door[0], b.centre[1] - door[1])).slice(0, NEAREST_HOMES);
  if (pool.length === 0) return { node: src.homes[Math.floor(rnd() * src.homes.length)], homeId: null };
  const h = pool[Math.floor(rnd() * pool.length)];
  return { node: h.node, homeId: h.id };
}

function startNode(type: WalkerKind, rnd: () => number, door: Vec2): { node: number; byCar: boolean; homeId: string | null } {
  const src = villageSources();
  if (type === 'student') {
    if (Math.hypot(CAMPUS_POINT[0] - door[0], CAMPUS_POINT[1] - door[1]) < CAMPUS_RADIUS_M) return { node: src.campus, byCar: false, homeId: null };
    return { ...homeNear(door, rnd), byCar: false };
  }
  if (type === 'high') return rnd() < 0.5 ? { node: src.hotel, byCar: false, homeId: null } : { node: src.parking, byCar: true, homeId: null };
  if (type === 'middle' && rnd() < 0.25) return { node: src.parking, byCar: true, homeId: null };
  return { ...homeNear(door, rnd), byCar: false };
}

/** ORDER 297 — vår kö är full: lika många sällskap i kön som köplatserna (VILLAGE_QUEUE). */
export function queueFull(state: SimulationState): boolean {
  const parties = new Set(state.guests.filter((g) => state.waitingIds.includes(g.id)).map((g) => g.partyId ?? g.id));
  return state.day.period === 'dinner' && parties.size >= VILLAGE_QUEUE.maxParties;
}

/** Närmaste krog i byn som har öppet i kväll (inte vagnarna, inte vår). */
export function nearestOpenRival(from: Vec2, venues: ReturnType<typeof venuesTonight>): string | null {
  const places = venuePlaces();
  let best: string | null = null;
  let bestD = Infinity;
  for (const v of venues) {
    if (v.id === PLAYER_VENUE || v.kind === 'truck' || !v.open || !places[v.id]) continue;
    const d = Math.hypot(places[v.id].doorPoint[0] - from[0], places[v.id].doorPoint[1] - from[1]);
    if (d < bestD) { bestD = d; best = v.id; }
  }
  return best;
}

/** Krogens dörr i byns ram (vagnarna på kvällens plats). */
function doorPointOf(venueId: string, venues: ReturnType<typeof venuesTonight>): Vec2 {
  const v = venues.find((x) => x.id === venueId);
  const g = walkNetwork();
  const node = v?.spot ? truckSpotPlace(v.spot).door : (venuePlaces()[venueId] ?? venuePlaces()[PLAYER_VENUE]).door;
  return g.nodes[node] as Vec2;
}

function doorFor(venueId: string, _state: SimulationState, venues: ReturnType<typeof venuesTonight>): number {
  const v = venues.find((x) => x.id === venueId);
  if (v?.spot) return truckSpotPlace(v.spot).door;
  return (venuePlaces()[venueId] ?? venuePlaces()[PLAYER_VENUE]).door;
}

// Kvällens plan: varje krogs sällskap med ankomsttid, typ och startpunkt.
function planEvening(state: SimulationState): Planned[] {
  const venues = venuesTonight(state);
  // ORDER 296 — samma plan som bandet i HUD:en läser (sim/villageLive.ts).
  const rows = plannedVillage(state);
  const rng = createRng(((state.seed ?? 0) * 7919 + state.day.dayNumber * 104729) >>> 0);
  const rnd = () => rng.next();
  const out: Planned[] = [];
  rows.forEach((row) => {
    if (!row.open) return;
    for (const t of POOL_TYPES) {
      let left = Math.round(row.typeGuests[t]);
      while (left > 0) {
        // ORDER 302 — 1–4 i sällskapet, få ensamma.
        let x = rnd();
        let size = PARTY_WEIGHTS[PARTY_WEIGHTS.length - 1][0];
        for (const [k, w] of PARTY_WEIGHTS) { if (x < w) { size = k; break; } x -= w; }
        const n = Math.min(left, size);
        left -= n;
        const s = startNode(t, rnd, doorPointOf(row.id, venues));
        // Flest kommer mitt i kvällen (triangelfördelning över fönstret).
        out.push({ at: ARRIVE_FROM + ((rnd() + rnd()) / 2) * (ARRIVE_UNTIL - ARRIVE_FROM), venueId: row.id, type: t, n, byCar: s.byCar, source: s.node, key: `${row.id}:${t}:${out.length}`, homeId: s.homeId });
      }
    }
  });
  // Gästen med socialt kapital går till spelarens krog när hon kommer.
  const social = state.day.booking?.social;
  if (social && venues[0].open) {
    out.push({ at: 18 * 60 + GUEST_TYPES.arrivesAfterMinutes.social, venueId: PLAYER_VENUE, type: 'social', n: 1, byCar: false, source: villageSources().homes[0], key: 'social', homeId: null });
  }
  return out.sort((a, b) => a.at - b.at);
}

// ORDER 297 — figurernas förstoring på ett avstånd: nivåernas figureScale,
// logaritmiskt mellan nivåerna (byns nivå räknas som 2, som i Designs frameAt).
function figureScaleAt(d: number): number {
  const L = LEVELS;
  const sc = (i: number) => L[i].figureScale || 2;
  if (d >= L[0].dist) return sc(0);
  if (d <= L[L.length - 1].dist) return sc(L.length - 1);
  let i = 0;
  while (i < L.length - 2 && d < L[i + 1].dist) i++;
  const k = Math.max(0, Math.min(1, Math.log(L[i].dist / d) / Math.log(L[i].dist / L[i + 1].dist)));
  return sc(i) + (sc(i + 1) - sc(i)) * k;
}

function smoothBand(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function glowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,.42)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function makeFigureMesh(): THREE.InstancedMesh {
  const body = new THREE.CylinderGeometry(0.2, 0.26, 1.15, 8);
  body.translate(0, 0.62, 0);
  const head = new THREE.SphereGeometry(0.15, 10, 8);
  head.translate(0, 1.42, 0);
  const geo = mergeTwo(body, head);
  // Oupplysta färger: gästerna ska synas i kvällsbyn (typens färg ur WARM.guest).
  const mat = new THREE.MeshBasicMaterial();
  const mesh = new THREE.InstancedMesh(geo, mat, MAX_FIGURES);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  return mesh;
}

function mergeTwo(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  const ai = a.toNonIndexed();
  const bi = b.toNonIndexed();
  const pos = new Float32Array(ai.attributes.position.array.length + bi.attributes.position.array.length);
  pos.set(ai.attributes.position.array as Float32Array, 0);
  pos.set(bi.attributes.position.array as Float32Array, ai.attributes.position.array.length);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

export function VillageLife() {
  const sim = useSimState();
  const simRef = useRef(sim);
  simRef.current = sim;
  const { actualRef } = useCamera();
  const camera = useThree((x) => x.camera);
  const root = useMemo(() => new THREE.Group(), []);
  const clockRef = useRef(sim.simTime);
  const live = useRef({
    day: -1,
    plan: [] as Planned[],
    next: 0,
    walkers: [] as Walker[],
    cars: [] as Car[],
    arrived: {} as Record<string, number>,
    // ORDER 297 — hur många som sitter inne på varje krog just nu (gloria och fönster).
    inside: {} as Record<string, number>,
    // ORDER 297 — sällskap som vände vid vår fulla kö och gick till en annan krog.
    turnedAway: 0,
    // ORDER 303 C — sällskap som vände vid vår dörr för ordet på gatan.
    wordAway: 0,
    wavesSeen: new Set<string>(),
    leaving: [] as Array<{ at: number; w: Walker }>,
    busDone: { announce: false, chose: false },
    billionaire: false,
    socialWalkout: false,
    heat: new Map<string, { a: Vec2; b: Vec2; h: number }>(),
    lastPublish: 0,
    lastHeat: 0
  });

  const meshes = useMemo(() => {
    const figures = makeFigureMesh();
    // Gruppens markering i byn: en skiva som vänder sig mot kameran.
    const markerGeo = new THREE.CircleGeometry(1, 20);
    // ORDER 297 — sällskapets lykta i byn (Designs createGuests): ett sken i
    // gästtypens färg, en kärna på marken, och fläcken under sällskapet i kvarteret.
    const markers = new THREE.InstancedMesh(markerGeo, new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }), MAX_FIGURES);
    const flatGeo = new THREE.CircleGeometry(1, 28);
    flatGeo.rotateX(-Math.PI / 2);
    const cores = new THREE.InstancedMesh(flatGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 1, toneMapped: false }), MAX_FIGURES);
    cores.count = 0;
    cores.frustumCulled = false;
    cores.renderOrder = 3;
    const patches = new THREE.InstancedMesh(flatGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), MAX_FIGURES);
    patches.count = 0;
    patches.frustumCulled = false;
    patches.renderOrder = 1;
    markers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    markers.count = 0;
    markers.frustumCulled = false;
    markers.renderOrder = 3;
    const ringGeo = new THREE.RingGeometry(0.9, 1.2, 28);
    ringGeo.rotateX(-Math.PI / 2);
    const rings = new THREE.InstancedMesh(ringGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide }), 16);
    rings.count = 0;
    rings.frustumCulled = false;
    const carGeo = new THREE.BoxGeometry(1.8, 1.4, 4.3);
    carGeo.translate(0, 0.75, 0);
    const cars = new THREE.InstancedMesh(carGeo, new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.2 }), MAX_CARS);
    cars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    cars.count = 0;
    cars.frustumCulled = false;
    const busGeo = new THREE.BoxGeometry(2.6, 3.2, 12);
    busGeo.translate(0, 1.7, 0);
    const bus = new THREE.Mesh(busGeo, new THREE.MeshStandardMaterial({ color: '#c8a24a', roughness: 0.5, emissive: new THREE.Color('#5a3d10'), emissiveIntensity: 0.3 }));
    bus.visible = false;
    // Gästflödet som breda band längs gatorna (kvarteret).
    const heatGeo = new THREE.PlaneGeometry(1, 1);
    heatGeo.rotateX(-Math.PI / 2);
    const heat = new THREE.InstancedMesh(heatGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }), MAX_HEAT);
    heat.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    heat.count = 0;
    heat.frustumCulled = false;
    heat.renderOrder = 2;
    // ORDER 297 — gästflödets band finns inte i Designs leverans Byn i kvällsljus;
    // där bär sällskapens lyktor flödet. Banden ritas inte längre.
    heat.visible = false;
    root.add(figures, markers, rings, cars, bus, heat, cores, patches);
    return { figures, markers, rings, cars, bus, heat, cores, patches };
  }, [root]);

  useEffect(() => () => {
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | undefined;
      mat?.dispose?.();
    });
  }, [root]);

  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), c: new THREE.Color(), up: new THREE.Vector3(0, 1, 0) }), []);

  useFrame((_, delta) => {
    const s = simRef.current;
    const L = live.current;
    const g = walkNetwork();
    const speed = s.speed ?? 1;
    let t = clockRef.current + Math.min(delta, 0.1) * speed;
    if (!Number.isFinite(t) || Math.abs(t - s.simTime) > 1) t = s.simTime;
    t = Math.min(Math.max(t, s.simTime - 0.25), s.simTime + 0.2);
    const dGameMin = Math.max(0, t - clockRef.current) * GAME_MINUTES_PER_SIM_SECOND;
    clockRef.current = t;
    // Sällskapen ger sig av redan under förberedelserna och når dörren när den öppnar.
    const inEvening = s.day.period === 'dinner';
    const now = s.day.period === 'dinner' ? clockMinutes(s) + ((t - s.simTime) * GAME_MINUTES_PER_SIM_SECOND) : 0;
    const venues = venuesTonight(s);

    // Ny dag: kvällens plan, och byn töms.
    if (L.day !== s.day.dayNumber) {
      L.day = s.day.dayNumber;
      L.plan = planEvening(s);
      L.next = 0;
      L.walkers = [];
      L.cars = [];
      L.arrived = {};
      L.inside = {};
      L.turnedAway = 0;
      L.wordAway = 0;
      L.wavesSeen = new Set();
      L.leaving = [];
      L.busDone = { announce: false, chose: false };
      L.billionaire = false;
      L.socialWalkout = false;
      L.heat.clear();
    }
    if (s.day.period !== 'dinner' && s.day.period !== 'evening') {
      L.walkers = [];
      L.cars = [];
    }

    if (inEvening) {
      // Sällskapen ur planen ger sig av så att de når dörren på sin tid.
      while (L.next < L.plan.length) {
        const p = L.plan[L.next];
        const door = doorFor(p.venueId, s, venues);
        const route = routeBetween(g, p.source, door);
        const len = routeLength(route);
        const early = p.byCar ? 0 : EARLY_LEAVE_MIN * Math.abs(Math.sin(p.at * 12.9898 + p.n));
        const travel = len / (WALK_M_PER_GAME_MIN * TYPE_PACE[p.type]) + (p.byCar ? 2 : 0) + early;
        if (now < p.at - travel) break;
        L.next++;
        if (p.byCar) spawnCar(L, p);
        else spawnWalker(L, p, route, venues);
      }
      // Rusningens bilar: sällskapen ur vågen kör in till spelarens krog.
      for (const id of s.day.wavesStarted ?? []) {
        if (L.wavesSeen.has(id) || id === 'bus') continue;
        L.wavesSeen.add(id);
        const parties = (s.day.wavePending ?? []).filter((w) => w.waveId === id);
        parties.forEach((w, i) => spawnCar(L, { at: now, venueId: PLAYER_VENUE, type: w.type as PoolType, n: w.size, byCar: true, source: villageSources().parking, key: `${id}:${i}` }));
      }
      // Bussen: kör in när aviseringen kommer, turisterna går till krogen de valde.
      const notice = s.day.villageNotice;
      if (notice?.kind === 'busAnnounce' && !L.busDone.announce) {
        L.busDone.announce = true;
        spawnBus(L, now);
      }
      if (s.day.villageEvents?.includes('bus-chose') && !L.busDone.chose) {
        L.busDone.chose = true;
        const bus = busTonight(s);
        if (bus) {
          const src = villageSources();
          const door = doorFor(bus.venueId, s, venues);
          const route = routeBetween(g, src.busStop, door);
          let left = bus.tourists;
          let i = 0;
          while (left > 0) {
            const n = Math.min(left, VILLAGE.bus.partySizes[1]);
            left -= n;
            spawnWalker(L, { at: now, venueId: bus.venueId, type: 'tourist', n, byCar: false, source: src.busStop, key: `bus:${i++}` }, route, venues, -i * 3);
          }
        }
      }
      // Miljardären: en promenad från hotellet runt torget och sjön, sedan
      // till krogen han valde (bokningsboken; annars hotellets matsal).
      const book = s.day.booking;
      if (book?.billionaireInTown && !L.billionaire && now >= 18 * 60 + GUEST_TYPES.arrivesAfterMinutes.billionaire - 45) {
        L.billionaire = true;
        const src = villageSources();
        const dest = book.billionaire ? PLAYER_VENUE : 'hotellets-matsal';
        const torget = venuePlaces().torgkrogen.door;
        const lake = truckSpotPlace('sjon').door;
        const route = [...routeBetween(g, src.hotel, torget), ...routeBetween(g, torget, lake).slice(1), ...routeBetween(g, lake, doorFor(dest, s, venues)).slice(1)];
        spawnWalker(L, { at: now, venueId: dest, type: 'billionaire', n: 1, byCar: false, source: src.hotel, key: 'billionaire' }, route, venues);
      }
      // ORDER 296 (kärnan punkt 3) — gästen med socialt kapital som gick
      // missnöjd syns gå från vår dörr till rivalen (day.socialWalkout).
      const walkout = s.day.socialWalkout;
      if (walkout && !L.socialWalkout) {
        L.socialWalkout = true;
        const from = doorFor(PLAYER_VENUE, s, venues);
        const route = routeBetween(g, from, doorFor(walkout.rivalId, s, venues));
        spawnWalker(L, { at: now, venueId: walkout.rivalId, type: 'social', n: 1, byCar: false, source: from, key: 'social-walkout' }, route, venues);
      }
    }

    // Gå, köra, äta vid luckan.
    for (const w of L.walkers) {
      if (w.arrived) continue;
      if (w.eatUntil !== null) {
        if (now >= w.eatUntil) w.arrived = true;
        continue;
      }
      // ORDER 302 — en paus eller samlingen vid dörren pågår.
      if (w.pauseUntil != null) {
        if (now < w.pauseUntil) continue;
        w.pauseUntil = null;
        w.pauseKind = null;
        w.look = null;
      }
      if (w.gatherUntil != null && now < w.gatherUntil) continue;
      const before = pointAlong(w.route, w.s);
      const nextPause = w.pauses?.[0];
      w.s += dGameMin * WALK_M_PER_GAME_MIN * w.pace;
      if (nextPause && !w.homeward && w.s >= nextPause.s) {
        w.s = nextPause.s;
        w.pauses!.shift();
        w.pauseUntil = now + nextPause.minutes;
        w.pauseKind = nextPause.kind;
        w.look = nextPause.look;
      }
      const at = pointAlong(w.route, w.s);
      addHeat(L, before, at, w.n * dGameMin);
      if (w.s >= w.length && w.homeward) {
        w.arrived = true;
        continue;
      }
      // ORDER 303 C — ordet på gatan: sällskapet stannar vid vår dörr, läser
      // menyn och går vidare till en konkurrent.
      if (w.s >= w.length && w.venueId === PLAYER_VENUE && !w.homeward && w.wordAway) {
        const other = nearestOpenRival(w.route[w.route.length - 1], venues);
        const route = other ? routeBetween(g, doorFor(PLAYER_VENUE, s, venues), doorFor(other, s, venues)) : [];
        if (other && route.length >= 2) {
          const last = w.route[w.route.length - 1];
          const prev = w.route[w.route.length - 2];
          Object.assign(w, { venueId: other, route, length: routeLength(route), s: 0, key: `${w.key}:ordet`, offsets: sidewalkOffsets(route), pauses: [], wordAway: false, pauseUntil: now + PAUSE_MIN[1], pauseKind: 'menu', look: Math.atan2(last[0] - prev[0], last[1] - prev[1]) });
          L.wordAway = (L.wordAway ?? 0) + w.n;
          continue;
        }
      }
      if (w.s >= w.length && w.venueId === PLAYER_VENUE && !w.homeward && queueFull(s)) {
        // ORDER 297 (Designs Byn i kvällsljus §3, balance.ts VILLAGE_QUEUE):
        // kön vid vår dörr är full, så sällskapet väljer en annan krog i byn.
        const other = nearestOpenRival(w.route[w.route.length - 1], venues);
        if (other) {
          const route = routeBetween(g, doorFor(PLAYER_VENUE, s, venues), doorFor(other, s, venues));
          if (route.length >= 2) {
            Object.assign(w, { venueId: other, route, length: routeLength(route), s: 0, key: `${w.key}:annan` });
            L.turnedAway = (L.turnedAway ?? 0) + w.n;
            continue;
          }
        }
      }
      if (w.s >= w.length) {
        L.arrived[w.venueId] = (L.arrived[w.venueId] ?? 0) + w.n;
        const v = venues.find((x) => x.id === w.venueId);
        if (v?.kind === 'truck') {
          // Ställer sig i kön vid luckan och äter stående en stund.
          const k = L.walkers.filter((o) => o.venueId === w.venueId && o.eatUntil !== null && !o.arrived).length;
          const end = w.route[w.route.length - 1];
          w.standAt = [end[0] + ((k % 3) - 1) * 1.6, end[1] + 2 + Math.floor(k / 3) * 1.4];
          w.eatUntil = now + EAT_AT_TRUCK_MIN;
        } else if (!w.homeward && w.gatherUntil == null) {
          // ORDER 302 — sällskapet samlas vid dörren innan det går in; den som
          // är framme före sin tid väntar utanför.
          w.gatherUntil = Math.max(now + GATHER_MIN, w.dueAt ?? 0);
          L.arrived[w.venueId] = (L.arrived[w.venueId] ?? 0) - w.n;
          continue;
        } else {
          w.arrived = true;
          L.inside[w.venueId] = (L.inside[w.venueId] ?? 0) + w.n;
          // Efter måltiden går sällskapet hem igen.
          if (!w.homeward && w.type !== 'billionaire') {
            const stay = STAY_MIN[0] + (Math.abs(Math.sin(w.length * 7.13)) * (STAY_MIN[1] - STAY_MIN[0]));
            L.leaving.push({ at: now + stay, w });
          }
        }
      }
    }
    L.walkers = L.walkers.filter((w) => !w.arrived);
    // Sällskap som har ätit klart går hem.
    if (L.leaving.length > 0) {
      const due = L.leaving.filter((x) => x.at <= now);
      if (due.length > 0) {
        L.leaving = L.leaving.filter((x) => x.at > now);
        for (const { w } of due) {
          L.inside[w.venueId] = Math.max(0, (L.inside[w.venueId] ?? 0) - w.n);
          const from = w.route[w.route.length - 1];
          const back = [...w.route].reverse();
          if (back.length >= 2 && from) {
            L.walkers.push({ ...w, key: `${w.key}:home`, route: back, length: routeLength(back), s: 0, arrived: false, homeward: true, eatUntil: null, standAt: null, ring: null, offsets: sidewalkOffsets(back), pauses: [], pauseUntil: null, pauseKind: null, look: null, gatherUntil: null, wordAway: false });
          }
        }
      }
    }
    for (const c of L.cars) {
      if (c.parkedAt !== null) continue;
      c.s += dGameMin * c.speed;
      if (c.s >= c.length) {
        c.parkedAt = now;
        if (c.drop) {
          const src = villageSources();
          const d = c.drop;
          const route = routeBetween(g, c.bus ? src.busStop : src.parking, doorFor(d.venueId, s, venues));
          spawnWalker(L, d, route, venues);
          c.drop = null;
        }
      }
    }
    // Parkerade bilar står kvar kvällen ut, högst MAX_CARS.
    if (L.cars.length > MAX_CARS) L.cars.splice(0, L.cars.length - MAX_CARS);

    draw(s, now);

    // Etiketterna och HUD:en några gånger i sekunden.
    if (t - L.lastPublish > 0.4 || t < L.lastPublish) {
      L.lastPublish = t;
      const door = venuePlaces()[PLAYER_VENUE].doorPoint;
      const onWay: OnWayGroup[] = L.walkers
        .filter((w) => w.venueId === PLAYER_VENUE && w.eatUntil === null && !w.homeward)
        .map((w) => {
          const p = pointAlong(w.route, w.s);
          return { key: w.key, n: w.n, type: w.type, metres: Math.max(0, w.length - w.s), x: p.x, z: p.z, near: Math.hypot(p.x - door[0], p.z - door[1]) };
        })
        .filter((w) => w.near < ON_WAY_RADIUS_M)
        .sort((a, b) => a.metres - b.metres)
        .map(({ near: _n, ...rest }) => rest);
      // ORDER 297 — husen vars sällskap är ute (på väg, på krogen eller på väg hem).
      const out = new Set<string>();
      for (const w of L.walkers) if (w.homeId) out.add(w.homeId);
      for (const { w } of L.leaving) if (w.homeId) out.add(w.homeId);
      const walking = L.walkers.filter((w) => w.eatUntil === null && !w.standAt);
      const sizes = [1, 2, 3, 4].map((k) => walking.filter((w) => w.n === k).length);
      const street = { sizes, left: walking.filter((w) => (w.side ?? 1) < 0).length, right: walking.filter((w) => (w.side ?? 1) > 0).length, pausing: walking.filter((w) => w.pauseUntil != null).length, gathering: walking.filter((w) => w.gatherUntil != null).length, wordAway: L.wordAway ?? 0 };
      publishVillageLive({ arrived: { ...L.arrived }, onWay, groupsWalking: L.walkers.length, inside: { ...L.inside }, outHomes: [...out], turnedAway: L.turnedAway, street });
    }
  });

  function spawnWalker(L: typeof live.current, p: Planned, route: Vec2[], venues: ReturnType<typeof venuesTonight>, startOffset = 0): void {
    if (route.length < 2) return;
    // ORDER 302 — sällskapets egen fart, sida och pauser (fröet ur nyckeln).
    const rng = createRng(Math.floor(hashKey(simRef.current.seed ?? 0, p.key) * 0x7fffffff));
    const r = () => rng.next();
    const length = routeLength(route);
    const pauses: NonNullable<Walker['pauses']> = [];
    if (r() < PAUSE_CHANCE) pauses.push({ s: length * (0.2 + 0.6 * r()), minutes: PAUSE_MIN[0] + r() * (PAUSE_MIN[1] - PAUSE_MIN[0]), kind: r() < 0.5 ? 'point' : 'talk', look: null });
    // Vid en annan krogs dörr längs vägen: läser menyn ibland.
    for (const v of venues) {
      if (v.id === p.venueId || v.kind === 'truck' || !v.open) continue;
      const d = doorPointOf(v.id, venues);
      if (!d) continue;
      let acc = 0;
      for (let i = 1; i < route.length; i++) {
        const seg = Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]);
        if (Math.hypot(route[i][0] - d[0], route[i][1] - d[1]) < MENU_NEAR_M && acc + seg < length - MENU_NEAR_M) {
          if (r() < MENU_CHANCE) pauses.push({ s: acc + seg, minutes: PAUSE_MIN[0] + r() * (PAUSE_MIN[1] - PAUSE_MIN[0]), kind: 'menu', look: Math.atan2(d[0] - route[i][0], d[1] - route[i][1]) });
          break;
        }
        acc += seg;
      }
    }
    pauses.sort((a, b) => a.s - b.s);
    // ORDER 303 C — ordet på gatan: på väg till oss, men vänder vid dörren.
    const word = streetWordNow(simRef.current);
    const wordAway = p.venueId === PLAYER_VENUE && word < 0 && r() < -word;
    L.walkers.push({
      key: p.key, type: p.type, n: p.n, venueId: p.venueId, route, length, s: startOffset,
      pace: TYPE_PACE[p.type] * (1 - PACE_SPREAD + 2 * PACE_SPREAD * r()), eatUntil: null, standAt: null,
      side: r() < 0.5 ? -1 : 1, offsets: sidewalkOffsets(route), pauses, pauseUntil: null, pauseKind: null, look: null, gatherUntil: null, wordAway, dueAt: p.at,
      ring: p.type === 'billionaire' ? WARM.guest.billionaire : p.type === 'social' ? WARM.guest.social : null,
      arrived: false,
      homeward: false,
      source: p.source,
      homeId: p.homeId ?? null
    });
  }

  function spawnCar(L: typeof live.current, p: Planned): void {
    const d = driveNetwork();
    const src = villageSources();
    const entry = src.driveEntry[Math.floor(Math.abs(Math.sin(L.cars.length * 12.9898 + p.at)) * src.driveEntry.length) % src.driveEntry.length];
    const route = routeBetween(d, entry, src.driveParking);
    const colours = ['#2b2f3a', '#5a2226', '#1f2a24', '#8a8478', '#3a3f4a'];
    L.cars.push({ route, length: routeLength(route), s: 0, parkedAt: null, drop: p, colour: colours[L.cars.length % colours.length], bus: false, speed: DRIVE_M_PER_GAME_MIN });
  }

  // Bussen kör in så att den står vid hållplatsen när den ska vara där (20.15).
  function spawnBus(L: typeof live.current, now: number): void {
    const d = driveNetwork();
    const src = villageSources();
    const route = routeBetween(d, src.driveEntry[0], src.driveBusStop);
    const length = routeLength(route);
    const minutes = Math.max(1, VILLAGE.bus.arriveMinute - now);
    L.cars.push({ route, length, s: 0, parkedAt: null, drop: null, colour: '#c8a24a', bus: true, speed: length / minutes });
  }

  function addHeat(L: typeof live.current, a: { x: number; z: number }, b: { x: number; z: number }, amount: number): void {
    if (amount <= 0) return;
    const key = `${Math.round(a.x / HEAT_CELL_M)}:${Math.round(a.z / HEAT_CELL_M)}`;
    const cell = L.heat.get(key);
    if (cell) {
      cell.h = Math.min(6, cell.h + amount * HEAT_PER_GUEST_MIN);
      cell.b = [b.x, b.z];
    } else {
      L.heat.set(key, { a: [a.x, a.z], b: [b.x, b.z], h: amount * HEAT_PER_GUEST_MIN });
    }
  }

  function draw(_s: SimulationState, now: number): void {
    const L = live.current;
    const dist = actualRef.current.distance;
    // ORDER 297 — sätten att rita på nivåerna (Designs byKvall.js frameAt och
    // createGuests): figurerna i nivåns förstoring närmare än figuresUntil,
    // lyktorna längre ut (BLEND.lantern) och fläcken i kvarteret (BLEND.patch).
    const scale = figureScaleAt(dist);
    const { figures, markers, rings, cars, bus, heat, cores, patches } = meshes;
    let fi = 0;
    let mi = 0;
    let ri = 0;
    let pi = 0;
    const lantern = smoothBand(BLEND.lantern[0], BLEND.lantern[1], dist);
    const patch = smoothBand(BLEND.patch[0], BLEND.patch[1], dist) * (1 - smoothBand(BLEND.patch[2], BLEND.patch[3], dist));
    const kd = Math.max(0.7, Math.min(2.4, dist / 150));
    const showMarkers = lantern > 0.01;
    const showFigures = dist < BLEND.figuresUntil;
    (markers.material as THREE.MeshBasicMaterial).opacity = 0.4 * lantern;
    (cores.material as THREE.MeshBasicMaterial).opacity = lantern;
    (patches.material as THREE.MeshBasicMaterial).opacity = 0.16 * patch;
    for (const w of L.walkers) {
      // ORDER 302 — sällskapet på sin trottoar (sidan och avståndet från
      // mittlinjen), medlemmarna två i bredd.
      const a = w.standAt ? null : pointAlongSeg(w.route, w.s);
      const off = a && w.offsets ? w.offsets[a.seg] * (1 - a.t) + (w.offsets[a.seg + 1] ?? w.offsets[a.seg]) * a.t : 0;
      const side = w.side ?? 1;
      const p = w.standAt || !a ? { x: w.standAt?.[0] ?? 0, z: w.standAt?.[1] ?? 0, heading: 0 } : { x: a.x + Math.cos(a.heading) * off * side, z: a.z - Math.sin(a.heading) * off * side, heading: a.heading };
      const gathering = w.gatherUntil != null;
      tmp.c.set(TYPE_COLOUR[w.type]);
      for (let k = 0; showFigures && k < w.n && fi < MAX_FIGURES; k++) {
        const h = p.heading;
        let back: number;
        let col: number;
        if (gathering || w.standAt) {
          // Vid dörren i en rad, bredvid varandra.
          back = 0;
          col = (k - (w.n - 1) / 2) * ABREAST_M * scale;
        } else {
          const row = Math.floor(k / 2);
          const inRow = w.n - row * 2 >= 2 ? 2 : 1;
          back = row * ROW_M * scale;
          col = inRow === 2 ? ((k % 2) - 0.5) * ABREAST_M * scale : 0;
        }
        const x = p.x - Math.sin(h) * back + Math.cos(h) * col;
        const z = p.z - Math.cos(h) * back - Math.sin(h) * col;
        // Pauserna: de pratar vända mot varandra, pekar eller läser menyn åt sidan.
        let face = h;
        if (w.pauseKind === 'talk' && w.n > 1) face = Math.atan2(p.x - x, p.z - z);
        else if (w.pauseKind === 'menu' || w.pauseKind === 'point') face = w.look ?? Math.atan2(Math.cos(h) * side, -Math.sin(h) * side);
        tmp.q.setFromAxisAngle(tmp.up, face);
        tmp.p.set(x, 0.05, z);
        tmp.s.setScalar(scale * (w.type === 'billionaire' ? 1.1 : 1));
        tmp.m.compose(tmp.p, tmp.q, tmp.s);
        figures.setMatrixAt(fi, tmp.m);
        figures.setColorAt(fi, tmp.c);
        fi++;
      }
      if (showMarkers && mi < MAX_FIGURES) {
        const ls = (4 + 1.6 * Math.sqrt(w.n)) * kd;
        tmp.q.copy(camera.quaternion);
        tmp.p.set(p.x, 1.5, p.z);
        tmp.s.set(ls / 2, ls / 2, 1);
        tmp.m.compose(tmp.p, tmp.q, tmp.s);
        markers.setMatrixAt(mi, tmp.m);
        markers.setColorAt(mi, tmp.c);
        const cr = (0.9 + 0.35 * Math.sqrt(w.n)) * kd;
        tmp.q.identity();
        tmp.p.set(p.x, 0.14, p.z);
        tmp.s.set(cr, 1, cr);
        tmp.m.compose(tmp.p, tmp.q, tmp.s);
        cores.setMatrixAt(mi, tmp.m);
        cores.setColorAt(mi, tmp.c);
        mi++;
      }
      if (showFigures && patch > 0.01 && pi < MAX_FIGURES) {
        const pr = (0.6 + 0.3 * w.n) * scale;
        tmp.q.identity();
        tmp.p.set(p.x, 0.1, p.z);
        tmp.s.set(pr, 1, pr);
        tmp.m.compose(tmp.p, tmp.q, tmp.s);
        patches.setMatrixAt(pi, tmp.m);
        patches.setColorAt(pi, tmp.c);
        pi++;
      }
      if (w.ring && ri < 16) {
        tmp.q.identity();
        tmp.p.set(p.x, 0.15, p.z);
        const r = 2.4 * Math.max(0.45, Math.min(3, dist / 120));
        tmp.s.set(r, 1, r);
        tmp.m.compose(tmp.p, tmp.q, tmp.s);
        rings.setMatrixAt(ri, tmp.m);
        tmp.c.set(w.ring);
        rings.setColorAt(ri, tmp.c);
        ri++;
      }
    }
    figures.count = fi;
    figures.instanceMatrix.needsUpdate = true;
    if (figures.instanceColor) figures.instanceColor.needsUpdate = true;
    markers.count = mi;
    markers.instanceMatrix.needsUpdate = true;
    if (markers.instanceColor) markers.instanceColor.needsUpdate = true;
    cores.count = mi;
    cores.instanceMatrix.needsUpdate = true;
    if (cores.instanceColor) cores.instanceColor.needsUpdate = true;
    patches.count = pi;
    patches.instanceMatrix.needsUpdate = true;
    if (patches.instanceColor) patches.instanceColor.needsUpdate = true;
    rings.count = ri;
    rings.instanceMatrix.needsUpdate = true;
    if (rings.instanceColor) rings.instanceColor.needsUpdate = true;

    let ci = 0;
    bus.visible = false;
    const carScale = readabilityScale(dist, { rampStart: 300, rampEnd: 1400, maxScale: 3 });
    for (const c of L.cars) {
      const p = pointAlong(c.route, Math.min(c.s, c.length));
      if (c.bus) {
        bus.visible = true;
        bus.position.set(p.x, 0, p.z);
        bus.rotation.y = p.heading;
        bus.scale.setScalar(carScale);
        continue;
      }
      if (ci >= MAX_CARS) continue;
      tmp.q.setFromAxisAngle(tmp.up, p.heading);
      tmp.p.set(p.x, 0, p.z);
      tmp.s.setScalar(carScale);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      cars.setMatrixAt(ci, tmp.m);
      tmp.c.set(c.colour);
      cars.setColorAt(ci, tmp.c);
      ci++;
    }
    cars.count = ci;
    cars.instanceMatrix.needsUpdate = true;
    if (cars.instanceColor) cars.instanceColor.needsUpdate = true;

    // Gästflödet: gatorna lyser där många går (kvarteret).
    if (now - L.lastHeat > 0.5 || now < L.lastHeat) {
      L.lastHeat = now;
      let hi = 0;
      const width = Math.max(3, dist * 0.012);
      for (const [k, cell] of L.heat) {
        cell.h *= 0.985;
        if (cell.h < 0.02) { L.heat.delete(k); continue; }
        if (hi >= MAX_HEAT) continue;
        const dx = cell.b[0] - cell.a[0];
        const dz = cell.b[1] - cell.a[1];
        const len = Math.max(HEAT_CELL_M, Math.hypot(dx, dz));
        const v = Math.min(1, cell.h / 2);
        tmp.q.setFromAxisAngle(tmp.up, Math.atan2(dx, dz));
        tmp.p.set((cell.a[0] + cell.b[0]) / 2, 0.35, (cell.a[1] + cell.b[1]) / 2);
        tmp.s.set(width, 1, len);
        tmp.m.compose(tmp.p, tmp.q, tmp.s);
        heat.setMatrixAt(hi, tmp.m);
        tmp.c.setRGB(1 * v, 0.68 * v, 0.3 * v);
        heat.setColorAt(hi, tmp.c);
        hi++;
      }
      heat.count = hi;
      heat.instanceMatrix.needsUpdate = true;
      if (heat.instanceColor) heat.instanceColor.needsUpdate = true;
    }
    heat.visible = false; // ORDER 297 — banden ritas inte (Designs lyktor bär flödet).
    figures.visible = dist > 20;
  }

  return <primitive object={root} />;
}
