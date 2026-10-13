// ORDER 325 §3 (Designs D11 §5, gestureMap.ts SITUATIONS för gatan) — de sex gångsätten för folk i byn:
// lugn (street.walkCalm), brådskande (street.walkHurried), med barn (street.walkWithChild och barnets
// street.childWalk, hand i hand), med hund (street.walkWithDog, hunden före och kopplet), stanna och titta
// (street.stopLook) och hälsa på någon (street.greet).
//
// Gatans figurer är instansade (VillageLife.tsx), och riggens klipp går inte att spela på instanser. De som står
// närmast kameran ritas därför med riggen (figureRig.ts) när kameran är närmare än STREET_RIGS.untilM (gatans
// nivå, 42 m, och närmare), och deras instanser döljs; de längre bort går som förut (streetGait.ts).
// Ansikten har gatan inte: det långa ansiktet är borta vid 42 m (balance.ts FACE_LOD).
//
// Vem som går hur väljs ur sällskapets nyckel och fröet (samma kväll ser likadan ut) med andelarna i
// balance.ts GESTURE_BALANCE: med barn (childShare, fler på dagen), med hund (dogShare, inte i regnet), brådskande
// i regnet och sent på kvällen (eveningProgress över hurryFromE). Farten är gångsättets (speed) gånger sällskapets.

import * as THREE from 'three';
import { applyPose, createFigureRig, type FigureRig } from '../figureRig';
import { sampleClip, CLIPS } from '../figureClips';
import { DISTRICT_STREET, GESTURE_BALANCE } from '../../../sim/balance';
import { FigureLives, liveFrame, temperamentForGuest } from '../figureLife';
import { hashKey } from '../../util/hash';
import { withStreetFloor } from './streetFigureLight';

export type StreetGaitKind = 'calm' | 'hurried' | 'child' | 'dog';

/** Klippen per gångsätt (D11 §5). */
export const GAIT_CLIP: Record<StreetGaitKind, string> = {
  calm: 'street.walkCalm', hurried: 'street.walkHurried', child: 'street.walkWithChild', dog: 'street.walkWithDog'
};

/** Riggarna på gatan och hundens och barnets mått (D11 §5: hunden 0,62 × 0,24 m, mankhöjd 0,54 m, kopplet 1,6 m,
 *  0,95 m före och 0,3 m åt höger; barnet 0,58 av en vuxen, på den vuxnas vänstra sida). */
export const STREET_RIGS = {
  /** Högst så många riggade figurer samtidigt, de närmast kamerans mål. */
  max: 18,
  /** Riggarna gäller när kameran är närmare än så här (gatans nivå är 42 m). */
  untilM: 60,
  /** Och inom så här många meter från kamerans mål. */
  radiusM: 45,
  // ORDER 332 D — barnet hand i hand med D12:s avstånd (d12Manus.js CHILD_SIDE 0,81 m bredvid och CHILD_AHEAD 0,10 m
  // före, så att händerna möts i D12:s street.childWalk), ur balance.ts DISTRICT_STREET.style; förut 0,42 m och
  // 0,05 m bakom (D11). backM negativ = före.
  child: { scale: DISTRICT_STREET.style.childSizeK, sideM: DISTRICT_STREET.style.childSideM, backM: -DISTRICT_STREET.style.childAheadM },
  dog: { aheadM: 0.95, rightM: 0.3, length: 0.62, width: 0.24, withers: 0.54, leashM: 1.6, colour: '#6b4a32' },
  /** Hälsningen: den andra börjar 0,25 s efter. */
  greetLagS: 0.25
} as const;

/** Gångsättet för ett sällskap, ur nyckeln och fröet. e är kvällens förlopp (0..1), raining byns regn. */
export function streetGaitFor(key: string, type: string, n: number, seed: number, e: number | null, raining: boolean): StreetGaitKind {
  const B = GESTURE_BALANCE;
  if (raining || (e !== null && e > B.hurryFromE)) return 'hurried';
  const h = hashKey(seed, `${key}|gait`);
  const family = type === 'middle' || type === 'villager' || type === 'tourist';
  const day = e === null || e < B.hurryFromE / 2;
  const childShare = day ? B.childShare.day : B.childShare.evening;
  if (family && n >= 2 && h < childShare) return 'child';
  if (!raining && n <= 2 && h >= childShare && h < childShare + B.dogShare) return 'dog';
  return 'calm';
}

/** Farten för ett gångsätt, som faktor på sällskapets egen. */
export function streetGaitSpeed(kind: StreetGaitKind): number {
  return GESTURE_BALANCE.streetSpeed[kind];
}

/** En figur som gatan vill rita med rigg den här bilden. */
export interface StreetRigCandidate {
  /** Figurens nyckel: sällskapets nyckel och platsen i sällskapet. */
  id: string;
  /** Instansens index (döljs när figuren ritas med rigg). */
  instance: number;
  x: number; z: number; groundY: number; yaw: number; scale: number;
  body: string; limb: string;
  /** Gångfasen i cykler och 0 står / 1 går. */
  phase: number; moving: number;
  kind: StreetGaitKind;
  /** Sällskapet står: vid en meny eller ett fönster (look = vinkeln dit), eller hälsar (greet, simsekunder sedan start). */
  stop: { kind: 'look'; yaw: number; sinceS: number } | { kind: 'greet'; sinceS: number; second: boolean } | { kind: 'talk'; sinceS: number } | null;
  /** Den första i sällskapet bär barnet eller hunden. */
  lead: boolean;
}

interface Slot { rig: FigureRig; child: FigureRig; dog: THREE.Group; leash: THREE.Line; body: string }

const _hand = new THREE.Vector3();
const _collar = new THREE.Vector3();

function dogModel(): THREE.Group {
  const D = STREET_RIGS.dog;
  const g = new THREE.Group();
  g.name = 'streetDog';
  const mat = withStreetFloor(new THREE.MeshStandardMaterial({ color: D.colour, roughness: 0.9 }));
  const legH = D.withers - D.width;
  const body = new THREE.Mesh(new THREE.BoxGeometry(D.width, D.width, D.length), mat);
  body.position.y = legH + D.width / 2;
  const head = new THREE.Mesh(new THREE.BoxGeometry(D.width * 0.8, D.width * 0.8, D.width), mat);
  head.position.set(0, D.withers + 0.04, D.length / 2 + D.width * 0.35);
  head.name = 'dogHead';
  g.add(body, head);
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, legH, 0.06), mat);
    leg.geometry.translate(0, -legH / 2, 0);
    leg.position.set(sx * (D.width / 2 - 0.04), legH, sz * (D.length / 2 - 0.06));
    leg.name = `dogLeg${sz > 0 ? 'F' : 'B'}${sx > 0 ? 'R' : 'L'}`;
    g.add(leg);
  }
  return g;
}

/** Riggarna på gatan: en pool, fylld bild för bild med de närmaste kandidaterna. */
export class StreetRigs {
  readonly group = new THREE.Group();
  private slots: Slot[] = [];
  /** Hur många som ritades med rigg senast, per gångsätt och stopp (för kontrollen). */
  lastCounts: Record<string, number> = {};
  /** ORDER 332 D — D12:s liv i figurerna (figureLife.ts liveFrame): blinkningar, blickar, huvudets drift och
   *  tyngdbyten ovanpå gångklippen. Gatan har inga ansikten (FACE_LOD), så bara leden. */
  private readonly lives = new FigureLives();
  private readonly reducedQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  constructor() {
    this.group.name = 'streetRigs';
  }

  private slot(i: number): Slot {
    while (this.slots.length <= i) {
      const rig = createFigureRig({ variant: 'guest' });
      const child = createFigureRig({ variant: 'guest' });
      for (const r of [rig, child]) for (const m of r.materials) withStreetFloor(m);
      child.root.scale.setScalar(STREET_RIGS.child.scale);
      const dog = dogModel();
      const leash = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: '#2a1c13' }));
      leash.frustumCulled = false;
      for (const o of [rig.root, child.root, dog, leash]) { o.visible = false; this.group.add(o); }
      this.slots.push({ rig, child, dog, leash, body: '' });
    }
    return this.slots[i];
  }

  /** Ritar kandidaterna (redan valda och sorterade) och gömmer resten av poolen. */
  draw(cands: StreetRigCandidate[], simTime: number): void {
    const counts: Record<string, number> = {};
    const alive = new Set<string>();
    for (let i = 0; i < cands.length; i++) {
      const c = cands[i];
      const s = this.slot(i);
      if (s.body !== c.body) {
        s.body = c.body;
        s.rig.garment.color.set(c.body);
        s.child.garment.color.set(c.body);
      }
      const r = s.rig;
      r.root.visible = true;
      r.root.position.set(c.x, c.groundY, c.z);
      r.root.rotation.y = c.yaw;
      r.root.scale.setScalar(c.scale);
      let clip: string;
      let key: string;
      if (c.stop?.kind === 'greet') {
        clip = 'street.greet';
        key = 'greet';
        const t = Math.max(0, c.stop.sinceS - (c.stop.second ? STREET_RIGS.greetLagS : 0));
        const smp = sampleClip(clip, Math.min(t, CLIPS[clip].seconds.normal), 'normal', { yaw: 0 });
        applyPose(r, smp.pose);
        const f = c.yaw;
        r.root.position.x += (Math.sin(f) * smp.root[1] + Math.cos(f) * smp.root[0]) * c.scale;
        r.root.position.z += (Math.cos(f) * smp.root[1] - Math.sin(f) * smp.root[0]) * c.scale;
      } else if (c.stop?.kind === 'talk') {
        // Sällskapet stannar och pratar (VillageLife-pausen talk): luta sig fram och prata, stående.
        clip = 'guest.leanTalkStand';
        key = 'talk';
        applyPose(r, sampleClip(clip, c.stop.sinceS % CLIPS[clip].seconds.normal, 'normal', { yaw: 0 }).pose);
      } else if (c.stop?.kind === 'look') {
        clip = 'street.stopLook';
        key = 'stopLook';
        applyPose(r, sampleClip(clip, Math.min(c.stop.sinceS, CLIPS[clip].seconds.normal), 'normal', { yaw: c.stop.yaw }).pose);
      } else {
        clip = GAIT_CLIP[c.kind];
        key = c.kind;
        applyPose(r, sampleClip(clip, 0, 'normal', { phase: c.phase, hand: c.kind === 'child' ? 'L' : 'R' }).pose);
      }
      counts[key] = (counts[key] ?? 0) + 1;
      // ORDER 332 D — livet ovanpå klippet (D12): i samma bildruta som applyPose. Upptagen under hälsningen och samtalet.
      const reduced = !!this.reducedQuery?.matches;
      const standing = !!c.stop || c.moving < 0.5;
      const busy = c.stop && c.stop.kind !== 'look' ? 1 : 0;
      liveFrame(r, null, this.lives.of(c.id, temperamentForGuest(c.id, null)), { t: simTime, busy, standing, mood: null, k: 0, reduced });
      alive.add(c.id);
      // Barnet på den vuxnas vänstra sida, hand i hand; hunden före och åt höger, kopplet från höger hand.
      const withChild = c.lead && c.kind === 'child';
      const withDog = c.lead && c.kind === 'dog';
      s.child.root.visible = withChild;
      if (withChild) {
        const C = STREET_RIGS.child;
        const ox = -C.sideM * c.scale, oz = -C.backM * c.scale;
        s.child.root.position.set(c.x + Math.cos(c.yaw) * ox + Math.sin(c.yaw) * oz, c.groundY, c.z - Math.sin(c.yaw) * ox + Math.cos(c.yaw) * oz);
        s.child.root.rotation.y = c.yaw;
        s.child.root.scale.setScalar(STREET_RIGS.child.scale * c.scale);
        applyPose(s.child, c.stop ? sampleClip('staff.idle', simTime, 'calm').pose : sampleClip('street.childWalk', 0, 'normal', { phase: c.phase * 1.3, hand: 'R' }).pose);
        const childKey = `${c.id}#child`;
        liveFrame(s.child, null, this.lives.of(childKey, temperamentForGuest(childKey, null)), { t: simTime, busy: 0, standing: !!c.stop || c.moving < 0.5, mood: null, k: 0, reduced: !!this.reducedQuery?.matches });
        alive.add(childKey);
        counts.childWalk = (counts.childWalk ?? 0) + 1;
      }
      s.dog.visible = withDog;
      s.leash.visible = withDog;
      if (withDog) {
        const D = STREET_RIGS.dog;
        const ox = D.rightM * c.scale, oz = D.aheadM * c.scale;
        s.dog.position.set(c.x + Math.cos(c.yaw) * ox + Math.sin(c.yaw) * oz, c.groundY, c.z - Math.sin(c.yaw) * ox + Math.cos(c.yaw) * oz);
        s.dog.rotation.y = c.yaw;
        s.dog.scale.setScalar(c.scale);
        const sw = Math.sin(c.phase * Math.PI * 4) * 0.5 * c.moving;
        for (const o of s.dog.children) {
          if (o.name.startsWith('dogLeg')) o.rotation.x = (o.name[6] === 'F') === (o.name[7] === 'L') ? sw : -sw;
        }
        r.root.updateMatrixWorld(true);
        r.joints.handAnchorR.getWorldPosition(_hand);
        s.dog.updateMatrixWorld(true);
        (s.dog.getObjectByName('dogHead') as THREE.Object3D).getWorldPosition(_collar);
        const pos = s.leash.geometry.getAttribute('position') as THREE.BufferAttribute;
        pos.setXYZ(0, _hand.x, _hand.y, _hand.z);
        pos.setXYZ(1, _collar.x, _collar.y - 0.05 * c.scale, _collar.z);
        pos.needsUpdate = true;
      }
    }
    for (let i = cands.length; i < this.slots.length; i++) {
      const s = this.slots[i];
      s.rig.root.visible = false; s.child.root.visible = false; s.dog.visible = false; s.leash.visible = false;
    }
    this.lastCounts = counts;
    this.lives.keepOnly(alive);
  }

  dispose(): void {
    for (const s of this.slots) {
      for (const m of [...s.rig.materials, ...s.child.materials]) m.dispose();
      s.dog.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; m?.dispose(); });
      s.leash.geometry.dispose();
      (s.leash.material as THREE.Material).dispose();
    }
  }
}
