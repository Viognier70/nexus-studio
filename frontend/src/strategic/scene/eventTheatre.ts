// ORDER 293 — händelserna i vinbaren som teater (Designs leverans 3 och
// vardagens koreografi). En port av Designs teaterScen.js (createTheatre): ett
// manus (events/handelserManus.js) blir en tidslinje per skådespelare, och
// scenen är en ren funktion av tiden t: figurerna, rekvisitan, rekvisitans
// egna rörelser (vasen som faller, ljuset som faller, kritan), kameran och
// strålkastaren. Samma t ger samma bild.
//
// Skillnader mot prototypen:
//   - Rummet byggs inte här. Teatern spelar i spelets vinbar (WineBarFigures),
//     i rummets lokala koordinater med golvet på y = 0 (en inre grupp på
//     rummets golvhöjd). Ljuset, kameran och renderingen är spelets.
//   - Kameran och strålkastaren läses som värden (view, spotAt); spelet flyttar
//     sin kamera och sänker rummets ljus.
//   - Figurernas längd (hm) ges som skala på roten; spelets rigg har ingen
//     höjdparameter.

import * as THREE from 'three';
import { applyPose, blendPose, createFigureRig, disposeFigureRig, type FigureRig } from './figureRig';
import { CARRY_ARM, CLIPS, CYCLE_M, sampleClip, seatKindFromRoom, TEMPO, TRAY_ARM, type ClipSample, type TempoId } from './figureClips';
import { createProp, holdProp, placeProp, setOnProp, SURFACE, updateHeld, type PropHandle, type PropId } from './tableware';
import type { EventScript, ScriptActor, ScriptEvent, ScriptStep, ScriptView, Vec2 } from './events/handelserManus';

// Designs LOOKS (teaterScen.js), kroppens och lemmarnas färg.
const LOOKS: Record<string, { body: string; limb: string }> = {
  kock: { body: '#efe9dd', limb: '#3a3632' },
  servitor: { body: '#1f1a17', limb: '#1b1816' },
  servitor2: { body: '#2a211c', limb: '#1b1816' },
  sommelier: { body: '#5b2226', limb: '#2a1c18' },
  bartender: { body: '#3b2a1f', limb: '#241a14' },
  diskare: { body: '#56646a', limb: '#2f383c' },
  student: { body: '#3f7390', limb: '#2f3a48' },
  medel: { body: '#8a7457', limb: '#4a4034' },
  medel2: { body: '#6f5a74', limb: '#3c3342' },
  medel3: { body: '#5f7a6a', limb: '#34443a' },
  hog: { body: '#1b1a20', limb: '#141318' },
  social: { body: '#b5485f', limb: '#6a2a38' },
  // ORDER 293 — Pers kostym som i rummet (wineBarRoom STAFF_UNIFORMS.host).
  hovmastare: { body: '#4a4243', limb: '#1b1816' },
  dj: { body: '#664958', limb: '#2a1f26' },
  kappa: { body: '#9b7b55', limb: '#4a3c2c' },
  rock: { body: '#3d4a5c', limb: '#262d38' },
  jacka: { body: '#7a3b2e', limb: '#3e2420' },
  stickat: { body: '#6b7a4e', limb: '#3a4230' }
};

// Beslut 2026-09-30: tallrikar, glas och bestick är 1,5 gånger verklig storlek.
const VIS_SCALE = new Set(['plate', 'sidePlate', 'soupBowl', 'wineGlass', 'waterGlass', 'wineBottle', 'waterBottle', 'carafe', 'fork', 'knife', 'spoon', 'napkin', 'breadBasket', 'decanter', 'flute']);

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const smooth = (u: number) => { const k = clamp(u, 0, 1); return k * k * (3 - 2 * k); };
const wrap = (a: number) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const lerpAngle = (a: number, b: number, k: number) => a + wrap(b - a) * k;

export interface TheatreSeat { id: string; x: number; z: number; yaw: number; kind: string; }

interface CompiledStep extends ScriptStep {
  clipDef: (typeof CLIPS)[string];
  tempoId: TempoId;
  start: number;
  end: number;
  dur: number;
  at?: Vec2;
  face?: number;
  pts?: Vec2[];
  len?: number;
  cum?: number[];
  phase0?: number;
  face0?: number;
  seatCarry?: string;
}

interface Actor extends ScriptActor {
  id: string;
  seatId?: string;
  compiled: CompiledStep[];
  endTime: number;
  cur?: ClipSample & { x: number; z: number; yaw: number };
  curStep?: CompiledStep;
}

interface TimedEvent extends ScriptEvent { actor: string; time: number }

interface PropState { h: PropHandle; init: EventScript['props'][string]; holder: [string, 'L' | 'R'] | null }

function glowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,220,160,1)');
  g.addColorStop(0.25, 'rgba(255,180,90,.5)');
  g.addColorStop(1, 'rgba(255,150,60,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export class EventTheatre {
  readonly root = new THREE.Group();
  private readonly seatMap: Record<string, TheatreSeat>;
  private readonly propRoot = new THREE.Group();
  private readonly fxRoot = new THREE.Group();
  private figs: Record<string, FigureRig> = {};
  private actors: Record<string, Actor> = {};
  private props: Record<string, PropState> = {};
  private events: TimedEvent[] = [];
  private fx: Array<{ d: Record<string, unknown> & { type: string; t?: number }; o: Record<string, unknown> }> = [];
  private readonly releaseCache = new Map<number, { x: number; z: number; yaw: number }>();
  private glowTex: THREE.Texture | null = null;
  private disposables: Array<{ dispose(): void }> = [];
  script: EventScript | null = null;
  duration = 0;

  constructor(parent: THREE.Object3D, floorY: number, seats: TheatreSeat[]) {
    this.root.name = 'eventTheatre';
    this.root.position.y = floorY;
    this.root.add(this.propRoot, this.fxRoot);
    parent.add(this.root);
    this.seatMap = Object.fromEntries(seats.map((s) => [s.id, s]));
  }

  // ---------- laddning ----------

  load(sc: EventScript): void {
    this.clear();
    this.script = sc;
    this.buildFx(sc.effects ?? []);
    for (const [id, p] of Object.entries(sc.props ?? {})) {
      const h = createProp(p.type as PropId);
      h.group.traverse((x) => { if ((x as THREE.Mesh).isMesh) (x as THREE.Mesh).castShadow = true; });
      this.propRoot.add(h.group);
      if (VIS_SCALE.has(p.type)) h.group.scale.setScalar(1.5);
      this.props[id] = { h, init: p, holder: null };
    }
    for (const [id, a] of Object.entries(sc.actors)) {
      const L = LOOKS[a.look] ?? LOOKS.medel;
      const rig = createFigureRig({ variant: a.kind === 'guest' ? 'guest' : 'staff', garmentColour: L.body, limbColour: L.limb });
      if (a.kind === 'guest' && a.hm) rig.root.scale.setScalar(a.hm);
      rig.root.traverse((x) => { if ((x as THREE.Mesh).isMesh) { (x as THREE.Mesh).castShadow = true; (x as THREE.Mesh).receiveShadow = false; } });
      this.root.add(rig.root);
      this.figs[id] = rig;
      const actor: Actor = { ...a, id, compiled: [], endTime: 0 };
      this.actors[id] = actor;
      this.compileActor(actor);
    }
    this.events.sort((a, b) => a.time - b.time);
    this.duration = Math.max(sc.end ?? 0, ...Object.values(this.actors).map((a) => a.endTime));
  }

  clear(): void {
    for (const r of Object.values(this.figs)) { this.root.remove(r.root); disposeFigureRig(r); }
    for (const p of Object.values(this.props)) p.h.group.removeFromParent();
    this.propRoot.clear();
    this.fxRoot.clear();
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
    this.figs = {}; this.actors = {}; this.props = {}; this.events = []; this.fx = [];
    this.releaseCache.clear();
    this.script = null;
  }

  dispose(): void {
    this.clear();
    this.glowTex?.dispose();
    this.root.removeFromParent();
  }

  // ---------- manus → tidslinje (teaterScen.js compileActor) ----------

  private compileActor(a: Actor): void {
    let t = a.start ?? 0;
    let pos: Vec2 = a.pos ? [a.pos[0], a.pos[1]] : [0, 0];
    let yaw = a.yaw ?? 0;
    let phase = 0;
    for (const st of a.steps) {
      const clip = CLIPS[st.clip];
      if (!clip) throw new Error('okänt klipp ' + st.clip);
      const tempo = (st.tempo ?? this.script?.tempo ?? 'normal') as TempoId;
      const s: CompiledStep = { ...st, clipDef: clip, tempoId: tempo, start: t, end: t, dur: 0 };
      if (!st.seat && a.seatId) s.seatCarry = a.seatId;
      if (st.seat) {
        const seat = this.seatMap[st.seat];
        if (seat) { s.at = [seat.x, seat.z]; s.face = seat.yaw; }
        a.seatId = st.seat;
      }
      if (clip.travel) {
        const pts: Vec2[] = [pos, ...(st.path ?? [])];
        const { L, cum } = pathLen(pts);
        s.pts = pts; s.len = L; s.cum = cum;
        const speed = TEMPO[tempo].walkSpeed * (st.speed ?? 1) * (a.kind === 'guest' ? 0.85 : 1);
        s.dur = st.until != null ? st.until - t : (st.dur ?? L / speed);
        s.phase0 = phase;
        phase += L / (CYCLE_M * TEMPO[tempo].stride);
        const n = pts.length;
        pos = [pts[n - 1][0], pts[n - 1][1]];
        yaw = n > 1 && L > 0.01 ? Math.atan2(pts[n - 1][0] - pts[n - 2][0], pts[n - 1][1] - pts[n - 2][1]) : yaw;
        s.face0 = yaw;
      } else {
        s.at = s.at ?? pos;
        s.face = s.face ?? st.face ?? yaw;
        s.dur = st.until != null ? Math.max(0.05, st.until - t) : (st.dur ?? clip.seconds[tempo] * (st.times ?? 1));
        const r = clip.root ? sampleClip(st.clip, clip.loop ? 0 : s.dur, tempo, this.ctxOf(s)).root : [0, 0, 0];
        const d = rot([r[0], r[1]], s.face);
        pos = [s.at[0] + d[0], s.at[1] + d[1]];
        yaw = s.face + r[2];
      }
      for (const e of st.ev ?? []) {
        let u: number | null = 0;
        if (e.at === 'end') u = null;
        else if (typeof e.at === 'number') u = e.at;
        else if (typeof e.at === 'string') {
          const ce = (clip.events ?? []).filter((x: { type: string }) => x.type === e.at);
          const pick = ce[e.nth ?? 0] as { u: number } | undefined;
          u = pick ? pick.u : 0;
        }
        const span = clip.loop ? clip.seconds[tempo] : s.dur;
        this.events.push({ ...e, actor: a.id, time: (u === null ? t + s.dur - 0.05 : t + u * span) + (e.dt ?? 0) });
      }
      t += s.dur;
      s.end = t;
      a.compiled.push(s);
    }
    a.endTime = t;
  }

  private ctxOf(s: ScriptStep): Record<string, unknown> {
    const c: Record<string, unknown> = { ...(s.ctx ?? {}) };
    if (s.hand) c.hand = s.hand;
    if (s.side != null) c.side = s.side;
    if (s.seated != null) c.seated = s.seated;
    if (s.keep) {
      const keep: Record<string, unknown> = {};
      const arm = { swing: 0.35, lift: 0.2, elbow: 1.1 };
      if (s.keep === 'L' || s.keep === 'both') keep.L = arm;
      if (s.keep === 'R' || s.keep === 'both') keep.R = arm;
      if (s.keep === 'trayL') { keep.L = TRAY_ARM; keep.R = CARRY_ARM; }
      c.keep = keep;
    }
    return c;
  }

  private posAt(a: Actor, t: number): Vec2 {
    const st = a.compiled.find((s) => t < s.end) ?? a.compiled[a.compiled.length - 1];
    if (st.clipDef.travel && st.pts && st.cum && st.len != null) return pointAt(st.pts, st.cum, clamp((t - st.start) / st.dur, 0, 1) * st.len);
    return st.at ?? [0, 0];
  }

  private sampleStep(_a: Actor, s: CompiledStep, lt: number, t: number) {
    const c = this.ctxOf(s) as Record<string, unknown> & { phase?: number; yaw?: number; seatKind?: string };
    const seatNow = s.seat ?? s.seatCarry;
    if (seatNow && this.seatMap[seatNow]) c.seatKind = this.seatMap[seatNow].kind || 'chair';
    let x: number; let z: number; let yaw: number;
    if (s.clipDef.travel && s.pts && s.cum && s.len != null) {
      const d = clamp(lt / s.dur, 0, 1) * s.len;
      [x, z] = pointAt(s.pts, s.cum, d);
      yaw = headingAt(s.pts, s.cum, s.len, d, s.face0 ?? 0);
      c.phase = (s.phase0 ?? 0) + d / (CYCLE_M * TEMPO[s.tempoId].stride);
    } else {
      [x, z] = s.at ?? [0, 0];
      yaw = s.face ?? 0;
    }
    if (s.look) {
      const tp = typeof s.look === 'string' ? (this.actors[s.look] ? this.posAt(this.actors[s.look], t) : null) : s.look;
      if (tp) c.yaw = clamp(wrap(Math.atan2(tp[0] - x, tp[1] - z) - yaw), -1.4, 1.4);
    }
    const S = sampleClip(s.clip, lt, s.tempoId, c as never);
    if (!s.clipDef.travel) { const d = rot([S.root[0], S.root[1]], s.face ?? 0); x += d[0]; z += d[1]; yaw += S.root[2]; }
    return { ...S, x, z, yaw };
  }

  private evalActor(a: Actor, t: number) {
    const steps = a.compiled;
    let i = steps.findIndex((s) => t < s.end);
    if (i < 0) i = steps.length - 1;
    const s = steps[i];
    const lt = clamp(t - s.start, 0, s.dur);
    let S = this.sampleStep(a, s, lt, t);
    if (i > 0) {
      const blend = TEMPO[s.tempoId].blendSec;
      if (lt < Math.max(blend, 0.5)) {
        const p = steps[i - 1];
        const P = this.sampleStep(a, p, p.dur, t);
        if (lt < blend) S = { ...S, pose: blendPose(P.pose, S.pose, smooth(lt / blend)) };
        S.yaw = lerpAngle(P.yaw, S.yaw, smooth(lt / 0.5));
      }
    }
    const rig = this.figs[a.id];
    applyPose(rig, S.pose);
    rig.root.position.set(S.x, a.stand ?? 0, S.z);
    rig.root.rotation.y = S.yaw;
    rig.root.updateMatrixWorld(true);
    a.cur = S;
    a.curStep = s;
    return S;
  }

  // ---------- rekvisitan ----------

  private resetProps(): void {
    for (const P of Object.values(this.props)) {
      const { h, init } = P;
      h.group.visible = !init.hidden;
      h.setFill(init.fill !== false);
      if (init.hand && this.figs[init.hand[0]]) { holdProp(h, this.figs[init.hand[0]], init.hand[1], this.propRoot); P.holder = init.hand; }
      else if (init.on && this.props[init.on[0]]) { setOnProp(h, this.props[init.on[0]].h, init.on[1], init.on[2], init.yaw ?? 0); P.holder = null; }
      else { const p = init.at ?? [0, 0, 0]; placeProp(h, this.propRoot, p[0], p[1], p[2], init.yaw ?? 0); P.holder = null; }
    }
  }

  private applyEvent(e: TimedEvent, idx: number): void {
    const P = e.prop ? this.props[e.prop] : undefined;
    if (!P) return;
    const h = P.h;
    switch (e.type) {
      case 'grab': holdProp(h, this.figs[e.actor], e.hand ?? 'R', this.propRoot); P.holder = [e.actor, e.hand ?? 'R']; break;
      case 'give': if (Array.isArray(e.to)) { holdProp(h, this.figs[e.to[0]], e.to[1], this.propRoot); P.holder = [e.to[0], e.to[1]]; } break;
      case 'switch': { const hand = (typeof e.to === 'string' ? e.to : 'L') as 'L' | 'R'; holdProp(h, this.figs[e.actor], hand, this.propRoot); P.holder = [e.actor, hand]; break; }
      case 'stack': if (e.onto && this.props[e.onto]) { setOnProp(h, this.props[e.onto].h, 0, 0, 0); P.holder = null; } break;
      case 'fill': h.setFill(e.on !== false); break;
      case 'hide': h.group.visible = false; break;
      case 'show': h.group.visible = true; break;
      case 'place': if (e.pos) { placeProp(h, this.propRoot, e.pos[0], e.pos[1], e.pos[2], e.yaw ?? 0); P.holder = null; } break;
      case 'release': {
        let c = this.releaseCache.get(idx);
        if (!c) {
          const holder = P.holder ?? [e.actor, e.hand ?? 'R'];
          const actor = this.actors[holder[0]];
          if (actor) {
            const S = this.evalActor(actor, e.time);
            updateHeld(h, S.tilt[holder[1]]);
          }
          c = { x: h.group.position.x, z: h.group.position.z, yaw: h.group.rotation.y };
          if (e.put) { c.x = e.put[0]; c.z = e.put[1]; }
          this.releaseCache.set(idx, c);
        }
        const y = typeof e.surface === 'number' ? e.surface : SURFACE[(e.surface ?? 'table') as keyof typeof SURFACE];
        placeProp(h, this.propRoot, c.x, y, c.z, c.yaw);
        P.holder = null;
        break;
      }
    }
  }

  // ---------- rekvisitans egna rörelser ----------

  private glow(scale: number, colour: string): THREE.Sprite {
    if (typeof document !== 'undefined') this.glowTex ??= glowTexture();
    const m = new THREE.SpriteMaterial({ map: this.glowTex, color: colour, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.disposables.push(m);
    const s = new THREE.Sprite(m);
    s.scale.set(scale, scale, 1);
    return s;
  }

  private mesh(geo: THREE.BufferGeometry, colour: string, rough = 0.8, metal = 0): THREE.Mesh {
    const m = new THREE.MeshStandardMaterial({ color: colour, roughness: rough, metalness: metal });
    this.disposables.push(geo, m);
    return new THREE.Mesh(geo, m);
  }

  private buildFx(list: EventScript['effects']): void {
    this.fx = list.map((d) => {
      const o: Record<string, unknown> = {};
      if (d.type === 'vaseFall') {
        const shards = new THREE.Group();
        this.fxRoot.add(shards);
        const bits = Array.from({ length: 7 }, (_, i) => {
          const m = this.mesh(new THREE.BoxGeometry(0.1 + (i % 3) * 0.025, 0.02, 0.06 + (i % 2) * 0.035), '#d8ecea', 0.12, 0.2);
          shards.add(m);
          return { m, a: i * 0.9 + 0.3, r: 0.12 + ((i * 37) % 20) / 100 };
        });
        const glints = [0, 2, 4, 6].map(() => { const g = this.glow(0.09, '#ffffff'); shards.add(g); return g; });
        const flowers = [0, 1, 2].map((i) => { const m = this.mesh(new THREE.SphereGeometry(0.03, 10, 8), i === 1 ? '#efe4d0' : '#e8b93a', 0.7); shards.add(m); return m; });
        const pm = new THREE.MeshStandardMaterial({ color: '#3a2c20', roughness: 0.04, metalness: 0.3, transparent: true, opacity: 0.62, depthWrite: false });
        const pg = new THREE.CircleGeometry(1, 40);
        this.disposables.push(pm, pg);
        const puddle = new THREE.Mesh(pg, pm);
        puddle.rotation.x = -Math.PI / 2;
        puddle.position.y = 0.012;
        this.fxRoot.add(puddle);
        Object.assign(o, { shards, bits, glints, flowers, puddle });
      }
      if (d.type === 'chalk') {
        const at = d.at as [number, number, number];
        const n = (d.n as number) ?? 7;
        o.lines = Array.from({ length: n }, (_, i) => {
          const len = 0.22 + ((i * 37) % 23) / 100;
          const m = this.mesh(new THREE.BoxGeometry(0.004, 0.012, len), '#efe9dd', 0.9);
          m.position.set(at[0], at[1] + 0.6 - i * 0.085, at[2] - 0.22 + len / 2 + ((i * 13) % 7) / 100);
          m.visible = false;
          this.fxRoot.add(m);
          return m;
        });
      }
      if (d.type === 'candleDrop') {
        const candle = new THREE.Group();
        this.fxRoot.add(candle);
        const stick = this.mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 8), '#f7efd9', 0.6);
        stick.position.y = 0.035;
        candle.add(stick);
        const flame = this.glow(0.16, '#ffc46b');
        flame.position.y = 0.085;
        candle.add(flame);
        candle.scale.setScalar(1.5);
        const flameLight = new THREE.PointLight('#ffb050', 0, 2.2, 1.6);
        flameLight.position.y = 0.1;
        candle.add(flameLight);
        const mm = new THREE.MeshBasicMaterial({ color: '#1a100a', transparent: true, opacity: 0, depthWrite: false });
        const mg = new THREE.CircleGeometry(0.06, 20);
        this.disposables.push(mm, mg);
        const mark = new THREE.Mesh(mg, mm);
        mark.rotation.x = -Math.PI / 2;
        this.fxRoot.add(mark);
        Object.assign(o, { candle, flame, flameLight, mark, cache: null });
      }
      return { d, o };
    });
  }

  private updateFx(t: number): void {
    for (const { d, o } of this.fx) {
      const k = t - (d.t ?? 0);
      if (d.type === 'vaseFall') {
        const P = this.props[d.prop as string];
        const v = P?.h.group;
        const [dx, dz] = d.dir as Vec2;
        const [x0, y0, z0] = d.at as [number, number, number];
        const shards = o.shards as THREE.Group;
        const puddle = o.puddle as THREE.Mesh;
        const land = Math.sqrt((2 * y0) / 9.8);
        const tip = 0.28;
        const lx = x0 + dx * (0.12 + 0.55 * land);
        const lz = z0 + dz * (0.12 + 0.55 * land);
        const clean = d.clean as number | undefined;
        const dry = d.dry as number | undefined;
        shards.visible = k > tip + land && !(clean != null && t > clean);
        puddle.visible = k > tip + land && !(dry != null && t > dry + 1.2);
        if (!v || k < 0) { shards.visible = false; puddle.visible = false; continue; }
        if (k < tip + land) {
          const a = Math.min(1, k / tip) * 0.9 + Math.max(0, k - tip) * 5;
          const tf = Math.max(0, k - tip);
          v.visible = true;
          v.position.set(x0 + dx * (0.12 * Math.min(1, k / tip) + 0.55 * tf), Math.max(0, y0 - 4.9 * tf * tf), z0 + dz * (0.12 * Math.min(1, k / tip) + 0.55 * tf));
          v.rotation.set(a * dz, 0, -a * dx);
        } else v.visible = false;
        const ks = Math.min(1, (k - tip - land) / 0.18);
        const bits = o.bits as Array<{ m: THREE.Mesh; a: number; r: number }>;
        bits.forEach((b) => { b.m.position.set(lx + Math.cos(b.a) * b.r * ks + dx * 0.1 * ks, 0.006, lz + Math.sin(b.a) * b.r * ks + dz * 0.1 * ks); b.m.rotation.y = b.a * 2; });
        (o.glints as THREE.Sprite[]).forEach((g, i) => { const b = bits[i * 2].m.position; g.position.set(b.x, 0.05, b.z); (g.material as THREE.SpriteMaterial).opacity = 0.35 + 0.65 * Math.max(0, Math.sin(t * 6 + i * 1.7)); });
        (o.flowers as THREE.Mesh[]).forEach((m, i) => m.position.set(lx + dx * (0.25 + i * 0.07) - dz * (i - 1) * 0.08, 0.03, lz + dz * (0.25 + i * 0.07) + dx * (i - 1) * 0.08));
        let r = 0.45 * Math.min(1, (k - tip - land) / 0.8);
        if (dry != null && t > dry) r *= Math.max(0, 1 - (t - dry) / 1.2);
        puddle.scale.setScalar(Math.max(0.001, r));
        puddle.position.set(lx + dx * 0.15, 0.012, lz + dz * 0.15);
      }
      if (d.type === 'chalk') {
        const lines = o.lines as THREE.Mesh[];
        const t0 = d.t0 as number;
        const t1 = d.t1 as number;
        lines.forEach((m, i) => { m.visible = t >= t0 + ((i + 1) / lines.length) * (t1 - t0); });
      }
      if (d.type === 'candleDrop') {
        const candle = o.candle as THREE.Group;
        const mark = o.mark as THREE.Mesh;
        const markMat = mark.material as THREE.MeshBasicMaterial;
        const flameLight = o.flameLight as THREE.PointLight;
        if (k < 0) { candle.visible = false; markMat.opacity = 0; flameLight.intensity = 0; continue; }
        if (!o.cache) {
          const P = this.props[d.from as string];
          const v = new THREE.Vector3();
          if (P) { P.h.group.getWorldPosition(v); this.fxRoot.worldToLocal(v); }
          o.cache = [v.x + 0.05, v.y + 0.22, v.z];
        }
        const u = Math.min(1, k / 0.5);
        const [ax, ay, az] = o.cache as number[];
        const [bx, by, bz] = d.to as number[];
        candle.visible = true;
        candle.position.set(ax + (bx - ax) * u, ay + (by - ay) * u + 0.12 * Math.sin(Math.PI * u), az + (bz - az) * u);
        candle.rotation.set(0, 0.4, (Math.PI / 2) * u);
        const outT = d.out as number | undefined;
        const out = outT != null && t > outT;
        (o.flame as THREE.Sprite).visible = !out;
        flameLight.intensity = out ? 0 : 1.6 + 0.3 * Math.sin(t * 17);
        mark.position.set(bx, by + 0.002, bz);
        const burn = Math.min(t, outT ?? t) - (d.t ?? 0) - 0.5;
        markMat.opacity = u < 1 ? 0 : Math.min(0.75, burn * 0.5);
        mark.scale.setScalar(1 + Math.min(1.5, Math.max(0, burn)));
      }
    }
  }

  // ---------- bildrutan ----------

  frame(t: number): void {
    if (!this.script) return;
    this.resetProps();
    this.events.forEach((e, i) => { if (e.time <= t) this.applyEvent(e, i); });
    for (const a of Object.values(this.actors)) this.evalActor(a, t);
    for (const P of Object.values(this.props)) {
      if (P.h.held && P.holder) {
        const a = this.actors[P.holder[0]];
        updateHeld(P.h, a?.cur ? a.cur.tilt[P.holder[1]] : undefined);
      }
      const init = P.init;
      if (init.follow && !P.holder) {
        const r = this.figs[init.follow];
        if (!r) continue;
        const yaw = r.root.rotation.y;
        const off = init.offset ?? [0, 0];
        P.h.group.position.set(r.root.position.x + Math.sin(yaw) * off[1] + Math.cos(yaw) * off[0], 0, r.root.position.z + Math.cos(yaw) * off[1] - Math.sin(yaw) * off[0]);
        P.h.group.rotation.set(0, yaw, 0);
      }
    }
    this.updateFx(t);
  }

  /** ORDER 294 — sitsarna manuset använder (rummets egna gäster där döljs). */
  seatIds(): Set<string> {
    const out = new Set<string>();
    for (const a of Object.values(this.actors)) for (const st of a.steps) if (st.seat) out.add(st.seat);
    return out;
  }

  /** Figurernas riggar (figurvakten, figureAudit.ts). */
  rigs(): Array<{ id: string; rig: FigureRig; seated: boolean; kind: 'guest' | 'staff'; clip: string | null }> {
    return Object.entries(this.figs).map(([id, rig]) => {
      const a = this.actors[id];
      const c = a?.curStep?.clipDef as { from?: string; to?: string } | undefined;
      const seated = !!(a?.seatId && c && (c.from === 'seated' || c.to === 'seated'));
      return { id, rig, seated, kind: a?.kind === 'guest' ? 'guest' : 'staff', clip: a?.curStep?.clip ?? null };
    });
  }

  // Strålkastarens ljuspöl: 1,2 m i ljuslåga under den som gör något, tonad in
  // och ut (Designs teaterScen.js spot).
  private pool: THREE.Mesh | null = null;
  private poolLight: THREE.PointLight | null = null;
  setSpot(p: Vec2 | null, k: number): void {
    if (!this.pool) {
      const mat = new THREE.MeshBasicMaterial({ color: '#ffd58f', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      if (typeof document !== 'undefined') {
        const c = document.createElement('canvas');
        c.width = c.height = 128;
        const x = c.getContext('2d')!;
        const g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.fillRect(0, 0, 128, 128);
        mat.map = new THREE.CanvasTexture(c);
      }
      this.pool = new THREE.Mesh(new THREE.CircleGeometry(1.2, 40), mat);
      this.pool.rotation.x = -Math.PI / 2;
      this.pool.position.y = 0.03;
      this.pool.renderOrder = 3;
      this.poolLight = new THREE.PointLight('#ffd58f', 0, 5, 1.4);
      this.root.add(this.pool, this.poolLight);
    }
    if (p) { this.pool.position.set(p[0], 0.03, p[1]); this.poolLight!.position.set(p[0], 2.2, p[1]); }
    (this.pool.material as THREE.MeshBasicMaterial).opacity = 0.5 * k;
    this.pool.visible = k > 0.01;
    this.poolLight!.intensity = 5 * k;
  }

  /** Kameran vid t, i rummets lokala koordinater (takterna `cam`). `GAME` är spelarens vinkel. */
  view(t: number): { v: ScriptView | null; game: boolean } {
    const cam = this.script?.beats.cam ?? [];
    let cur: (typeof cam)[number] | null = null;
    for (const c of cam) if (c.t <= t) cur = c;
    if (!cur) return { v: null, game: true };
    if (cur.follow) {
      const a = this.actors[cur.follow];
      const p = a ? this.posAt(a, t) : [0, 0];
      const prev = [...cam].reverse().find((c) => c.t <= t && c.v)?.v;
      return { v: { tx: p[0], ty: 0.6, tz: p[1], dist: cur.dist ?? 13, yaw: prev?.yaw ?? 0.44, pitch: prev?.pitch ?? 0.873 }, game: false };
    }
    const v = cur.v ?? null;
    const game = !!v && v.dist >= 23.5 && Math.abs(v.tx - 0.2) < 0.01;
    return { v, game };
  }

  /** Strålkastaren vid t: vem den står på (golvet under figuren), eller null. */
  spotAt(t: number): Vec2 | null {
    const spot = this.script?.beats.spot ?? [];
    let who: string | null = null;
    for (const s of spot) if (s.t <= t) who = s.who;
    if (!who) return null;
    const r = this.figs[who];
    return r ? [r.root.position.x, r.root.position.z] : null;
  }

  /** När kortets steg frågas och besvaras i manuset (takterna `card`). */
  cardTimes(): { ask: number[]; ans: number[]; back: number } {
    const card = this.script?.beats.card ?? [];
    const ask: number[] = [];
    const ans: number[] = [];
    let back = this.duration;
    for (const c of card) {
      if (c.ph === 'ask') ask[c.step] = c.t;
      else if (c.ph === 'right' || c.ph === 'wrong') ans[c.step] = c.t;
      else if (c.ph === 'off') back = c.t;
    }
    return { ask, ans, back };
  }
}

function pathLen(pts: Vec2[]): { L: number; cum: number[] } {
  let L = 0;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(L); }
  return { L, cum };
}

function rot(r: Vec2, yaw: number): Vec2 {
  const s = Math.sin(yaw);
  const c = Math.cos(yaw);
  return [r[0] * c + r[1] * s, -r[0] * s + r[1] * c];
}

function pointAt(pts: Vec2[], cum: number[], d: number): Vec2 {
  if (pts.length < 2) return pts[0];
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const seg = cum[i] - cum[i - 1] || 1;
  const k = clamp((d - cum[i - 1]) / seg, 0, 1);
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
}

function headingAt(pts: Vec2[], cum: number[], len: number, d: number, fallback: number): number {
  const a = pointAt(pts, cum, Math.max(0, d - 0.25));
  const b = pointAt(pts, cum, Math.min(len, d + 0.25));
  if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-4) return fallback;
  return Math.atan2(b[0] - a[0], b[1] - a[1]);
}

/** Rummets sittplatser som teatern läser dem (teaterScen.js seatMap). */
export function theatreSeats(seats: ReadonlyArray<{ id: string; local: Vec2; facing: number; kind?: string }>): TheatreSeat[] {
  return seats.map((s) => ({ id: s.id, x: s.local[0], z: s.local[1], yaw: s.facing, kind: seatKindFromRoom(s.kind as never) as string }));
}
