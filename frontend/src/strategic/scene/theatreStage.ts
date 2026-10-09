// ORDER 286a — servicen som teater i vinbaren (Designs leverans 2, teaterns
// grund; Vision Owner 2026-09-29). Samlar det som läggs ovanpå regissören:
//
// - Klippen i stället för poserna (theatreClips.ts). Tempot per anställd följer
//   trycket och byts bara vid klippgräns ("Byt tempo vid klippgräns, annars
//   hoppar fasen", LEVERANSNOT §2).
// - Rekvisitan ur regissörens ägarbok (propLedger): det som bärs ligger i
//   handen (tableware.ts holdProp/updateHeld), det som står på bordet står på
//   bordsskivan. Ett föremål har en ägare, så samma tallrik finns aldrig på två
//   ställen. Menyn, blocket och notamappen följer klippens händer.
// - Raketen börjar i rummet: figuren (IncidentContext.figure) spelar sitt
//   raketklipp medan introt går, och kameran glider in mot figuren till
//   THEATRE.camera.distanceM och tillbaka efter svaret.

import * as THREE from 'three';
import type { MutableRefObject } from 'react';
import { applyPose, type FigurePose, type FigureRig } from './figureRig';
import { CLIPS, sampleClip, type ClipSample, type SeatKind, type TempoId } from './figureClips';
import { createProp, holdProp, placeProp, updateHeld, type PropHandle, type PropId } from './tableware';
import { guestClipFor, sampleForFigure, staffClipFor, tempoFor } from './theatreClips';
import type { FigureSample, LedgerEntry, StaffKey, WineBarDirector } from './wineBarDirector';
import { planRects, SURFACE_HEIGHT, WINE_BAR_PLAN, type WineBarRoom } from './wineBarRoom';
import { BISTRO } from './bistroHouse';
import { THEATRE } from '../../sim/balance';
import { PROP_VISUAL_SCALE } from './staffRing';
import type { CameraTarget } from '../types';
import type { ActiveIncident } from '../../sim/incidents';
import type { ClipOverride } from './theatreInteractions';
import { conditionClip, type ConditionInput } from './conditionClips';

const LEDGER_PROP: Record<LedgerEntry['item'], PropId> = { plate: 'plate', dishes: 'plate', glass: 'wineGlass', bottle: 'wineBottle' };
// Det som följer klippets händer (inte ägarboken): kort, block, mapp, servett, bestick, bricka.
const HAND_PROPS = new Set<PropId>(['menu', 'pad', 'billFolder', 'napkin', 'fork', 'knife', 'tray']);
type Vec2 = [number, number];
const TABLE_INSET = 0.45;
// ORDER 313 §8 — flaskorna på bardisken (rummets lokala meter: barens östra
// ände, x 1,8–2,2, på båda diskarna innanför gästernas sida) och karaffens
// avstånd från bordets mitt.
// ORDER 317 — ur rummets plan: östra änden av båda diskarna, mitt på disken.
const BAR_COUNTER_N = WINE_BAR_PLAN.bar.z1 - WINE_BAR_PLAN.bar.depth / 2;
const BAR_COUNTER_S = WINE_BAR_PLAN.bar.z0 + WINE_BAR_PLAN.bar.depth / 2;
const BAR_BOTTLES: readonly Vec2[] = [
  [WINE_BAR_PLAN.bar.x1 - 0.55, BAR_COUNTER_N], [WINE_BAR_PLAN.bar.x1 - 0.3, BAR_COUNTER_N],
  [WINE_BAR_PLAN.bar.x1 - 0.55, BAR_COUNTER_S], [WINE_BAR_PLAN.bar.x1 - 0.3, BAR_COUNTER_S]
];
// ORDER 323 §9 — bistrons bar står i sydväst och löper längs z (bistroHouse.ts BISTRO.bar);
// flaskorna står på personalens sida (västra kanten), två vid var ände.
const BISTRO_BAR_BOTTLES: readonly Vec2[] = [
  [BISTRO.bar.x0 + 0.2, BISTRO.bar.z1 - 0.25], [BISTRO.bar.x0 + 0.2, BISTRO.bar.z1 - 0.5],
  [BISTRO.bar.x0 + 0.2, BISTRO.bar.z0 + 0.25], [BISTRO.bar.x0 + 0.2, BISTRO.bar.z0 + 0.5]
];
const TABLE_CARAFE_OFFSET = 0.32;
const TABLE_SPREAD = 0.22;

// ---------- ORDER 323 §9 — ytorna rekvisitan står på ----------
// Anders 2026-10-09: "Föremål på bord (flaskor, glas, ljus) ska stå på
// bordsskivan och följa bordet när rummet byggs om (vinbar → bistro)."
// Ytorna läses ur rummets ritade meshar (wineBarRoom.ts planRects): bordens
// skivor (<bord>Top) och diskens (barTop…). Ett föremål står på skivans
// översta yta, minst PROP_EDGE_M innanför kanten.

export interface PropSurface { name: string; x0: number; x1: number; z0: number; z1: number; top: number }
export const PROP_EDGE_M = 0.08;
const SURFACE_NAME = /Top(Bistro|[NSE])?$|^barTop/;

/** Rummets bords- och diskskivor (lokala meter, toppen i rummets Y). */
export function propSurfaces(room: WineBarRoom): PropSurface[] {
  return planRects(room).filter((r) => SURFACE_NAME.test(r.name) && !/^(djBooth|musicSideboard|passCounter|hostDesk)/.test(r.name));
}

/** Den minsta skivan under punkten, eller null. */
export function surfaceUnder(surfaces: readonly PropSurface[], x: number, z: number): PropSurface | null {
  let best: PropSurface | null = null;
  for (const r of surfaces) {
    if (x < r.x0 || x > r.x1 || z < r.z0 || z > r.z1) continue;
    if (!best || (r.x1 - r.x0) * (r.z1 - r.z0) < (best.x1 - best.x0) * (best.z1 - best.z0)) best = r;
  }
  return best;
}

/**
 * Platsen för föremål nummer `slot` på skivan kring `at`: längs skivans
 * långsida, TABLE_SPREAD isär, och så många som ryms innan raden börjar om
 * (förut gick slot 3 och uppåt utanför ett bord för fyra).
 */
export function spotOnSurface(r: PropSurface, at: Vec2, slot: number, extra = 0): Vec2 {
  const alongX = r.x1 - r.x0 >= r.z1 - r.z0;
  const len = alongX ? r.x1 - r.x0 : r.z1 - r.z0;
  const cap = Math.max(2, Math.floor((len - 2 * PROP_EDGE_M) / TABLE_SPREAD) + 1);
  const off = ((slot % cap) - 0.5) * TABLE_SPREAD + extra;
  const x = Math.max(r.x0 + PROP_EDGE_M, Math.min(r.x1 - PROP_EDGE_M, at[0] + (alongX ? off : 0)));
  const z = Math.max(r.z0 + PROP_EDGE_M, Math.min(r.z1 - PROP_EDGE_M, at[1] + (alongX ? 0 : off)));
  return [x, z];
}

interface ClipState { id: string | null; tempo: TempoId }

interface CameraGlide {
  key: string;
  saved: { x: number; z: number; distance: number };
  from: { x: number; z: number; distance: number };
  to: { x: number; z: number; distance: number };
  t: number;
  dur: number;
  out: boolean;
}

export class TheatreStage {
  private readonly staffClip: ClipState[];
  private readonly guestClip: ClipState[];
  private readonly ledgerProps = new Map<string, PropHandle>();
  private readonly handProps = new Map<string, PropHandle>();
  private readonly free: PropHandle[] = [];
  private glide: CameraGlide | null = null;
  private rocketKey = '';
  private readonly v = new THREE.Vector3();
  /** Figurens läge i världen under raketen (ring och bildtext), annars null. */
  figureWorld: THREE.Vector3 | null = null;

  constructor(private readonly group: THREE.Group, private readonly floorY: number, staffCount: number, guestCount: number) {
    this.staffClip = Array.from({ length: staffCount }, () => ({ id: null, tempo: 'normal' as TempoId }));
    this.guestClip = Array.from({ length: guestCount }, () => ({ id: null, tempo: 'normal' as TempoId }));
  }

  /** Personalens pose ur klippet, eller null när figureActs-posen gäller. */
  // ORDER 309 — cond: orken och tvekan (conditionClips.ts, Designs D5 §2 och §7).
  staffPose(i: number, key: StaffKey, s: FigureSample, rocket: ActiveIncident | null, now: number, together?: ClipOverride | null, cond?: ConditionInput | null): ClipSample | null {
    const fig = rocket?.context.figure;
    if (fig && fig.kind === 'staff' && fig.staffKey === key) {
      const introTotal = THEATRE.rocketIntroSeconds[fig.clip];
      const elapsed = introTotal - Math.max(0, rocket.introLeft ?? 0);
      if ((rocket.introLeft ?? 0) > 0) return sampleClip('rocket.cutHand', elapsed, 'normal');
      return sampleClip('rocket.holdHand', now, 'normal');
    }
    // ORDER 292 — samspelen (theatreInteractions.ts): klippet och tiden ur samspelet.
    if (together) {
      this.staffClip[i] = { id: together.id, tempo: 'normal' };
      return sampleClip(together.id, together.time, 'normal', { yaw: s.targetYaw, stress: s.stress });
    }
    const c = cond ? conditionClip(s.pose, !!s.carrying, cond) : null;
    if (c) {
      this.staffClip[i] = { id: c.id, tempo: 'normal' };
      return sampleClip(c.id, c.time ?? now, 'normal', { yaw: s.targetYaw });
    }
    const id = staffClipFor(s, key);
    if (!id) { this.staffClip[i].id = null; return null; }
    const st = this.staffClip[i];
    if (st.id !== id) { st.id = id; st.tempo = tempoFor(s.stress); }
    return sampleForFigure(id, s, st.tempo);
  }

  /** Gästens pose ur klippet (sitsen avgör sittklippet), eller null när figureActs-posen gäller. */
  guestPose(i: number, s: FigureSample, seat: SeatKind | null, rocket: ActiveIncident | null, together?: ClipOverride | null): ClipSample | null {
    const fig = rocket?.context.figure;
    if (fig && fig.kind === 'guest' && fig.guestId === s.guestId && seat && s.seated && fig.clip !== 'walkToKitchen') {
      const clip = fig.clip === 'smellWine' ? 'rocket.smellWine' : 'rocket.askPointMenu';
      const elapsed = THEATRE.rocketIntroSeconds[fig.clip] - Math.max(0, rocket.introLeft ?? 0);
      this.guestClip[i].id = clip;
      return sampleClip(clip, elapsed, 'normal', { seatKind: seat, seated: true });
    }
    if (fig && fig.kind === 'guest' && fig.guestId === s.guestId && fig.clip === 'walkToKitchen' && (rocket.introLeft ?? 0) > 0) {
      return sampleClip('rocket.walkToKitchen', 0, 'normal', { phase: (THEATRE.rocketIntroSeconds.walkToKitchen - (rocket.introLeft ?? 0)) / CLIPS['rocket.walkToKitchen'].seconds.normal });
    }
    // ORDER 292 — samspelen vid bordet (beställningen, notan, vinet, skålen, samtalet).
    if (together && seat && s.seated) {
      this.guestClip[i].id = together.id;
      return sampleClip(together.id, together.time, 'normal', { yaw: s.targetYaw, seatKind: seat, seated: true });
    }
    const id = guestClipFor(s, seat);
    this.guestClip[i].id = id;
    return id ? sampleForFigure(id, s, 'normal', seat ?? undefined) : null;
  }

  /** Klippet gästen spelar just nu (för händernas rekvisita). */
  /** ORDER 292b — klippet personen spelar just nu (figureAudit.ts). */
  staffClipId(i: number): string | null {
    return this.staffClip[i]?.id ?? null;
  }

  guestClipId(i: number): string | null {
    return this.guestClip[i].id;
  }

  apply(rig: FigureRig, sample: ClipSample | null, fallback: () => FigurePose): void {
    applyPose(rig, sample ? sample.pose : fallback());
  }

  private take(id: PropId): PropHandle {
    const i = this.free.findIndex((p) => p.id === id);
    const p = i >= 0 ? this.free.splice(i, 1)[0] : createProp(id);
    // ORDER 290 — Designs ringen §3 (beslut 2026-09-30): tallrikar, glas och
    // mat i 1,5 gånger storlek för att läsas från 24 m, samma vid raketens
    // avstånd; brickan, tårtan, menyn, blocket och notan står kvar i 1,0.
    // Skalan är bara visuell, kring föremålets nollpunkt.
    p.group.scale.setScalar((PROP_VISUAL_SCALE.appliesTo as readonly string[]).includes(id) ? PROP_VISUAL_SCALE.game : 1);
    p.group.visible = true;
    return p;
  }

  private giveBack(p: PropHandle): void {
    p.group.visible = false;
    this.free.push(p);
  }

  // ORDER 313 §8 (provspelet: "Inga flaskor syns") — det som står kvar i
  // rummet utöver ägarboken: flaskorna på bardisken (BAR_BOTTLES, i barens
  // öppna östra ände, utanför gästernas platser) och en vattenkaraff på
  // varje bord där något serverats (bordets tableAt, TABLE_CARAFE_OFFSET åt
  // sidan). Ägarboken har flaskan bara vid loungerna.
  private readonly dressing: PropHandle[] = [];
  private readonly carafes = new Map<string, PropHandle>();
  private tableAtOf = new Map<string, { at: Vec2; kind: 'two' | 'lounge' | 'bar'; surface: PropSurface | null }>();
  private surfaces: PropSurface[] = [];

  /**
   * Dukningen som står kvar: flaskorna i baren. Anropas en gång när rummet
   * monteras, och på nytt när rummet byggs om (WineBarFigures bygger om
   * ensemblen per rum). ORDER 323 §9: med rummet står allt på de skivor
   * rummet ritar, i bistron på bistrons bar och bord.
   */
  dress(groups: readonly { id: string; kind: 'two' | 'lounge' | 'bar'; tableAt?: Vec2 }[], room?: WineBarRoom): void {
    this.surfaces = room ? propSurfaces(room) : [];
    for (const g of groups) if (g.tableAt) this.tableAtOf.set(g.id, { at: g.tableAt, kind: g.kind, surface: surfaceUnder(this.surfaces, g.tableAt[0], g.tableAt[1]) });
    for (const [x, z] of room?.layout === 'bistro' ? BISTRO_BAR_BOTTLES : BAR_BOTTLES) {
      const p = this.take('wineBottle');
      placeProp(p, this.group, x, this.surfaceY(x, z, 'bar'), z, 0);
      this.dressing.push(p);
    }
  }

  /** Skivans topp under punkten (rummets ritade yta), annars ytans höjd i SURFACE_HEIGHT. */
  private surfaceY(x: number, z: number, kind: 'two' | 'lounge' | 'bar'): number {
    return surfaceUnder(this.surfaces, x, z)?.top ?? this.floorY + SURFACE_HEIGHT[kind];
  }

  /** Föremålen som står på en yta (dukningen, karafferna och ägarbokens på bord): läget i rummet (för provet). */
  standingProps(): { name: string; x: number; y: number; z: number }[] {
    const out: { name: string; x: number; y: number; z: number }[] = [];
    const add = (p: PropHandle) => { if (p.group.visible && !p.held) out.push({ name: p.group.name, x: p.group.position.x, y: p.group.position.y, z: p.group.position.z }); };
    this.dressing.forEach(add);
    this.carafes.forEach(add);
    this.ledgerProps.forEach(add);
    return out;
  }

  /** Antal föremål i dukningen och karafferna (för provet). */
  dressingCount(): { barBottles: number; carafes: number } {
    return { barBottles: this.dressing.filter((p) => p.group.visible).length, carafes: [...this.carafes.values()].filter((p) => p.group.visible).length };
  }

  /** Rekvisitan ur ägarboken och klippens händer, en gång per bildruta. */
  props(director: WineBarDirector, t: number, staffKeys: readonly StaffKey[], staffRigs: FigureRig[], staffSamples: (ClipSample | null)[], guestRigs: FigureRig[], guestSamples: (ClipSample | null)[], guestClipIds: (string | null)[]): LedgerEntry[] {
    const ledger = director.propLedger(t);
    const seen = new Set<string>();
    for (const e of ledger) {
      seen.add(e.id);
      let p = this.ledgerProps.get(e.id);
      if (!p) { p = this.take(LEDGER_PROP[e.item]); this.ledgerProps.set(e.id, p); }
      if (e.owner.kind === 'staff') {
        const i = staffKeys.indexOf(e.owner.key);
        holdProp(p, staffRigs[i], 'R', this.group);
        updateHeld(p, staffSamples[i]?.tilt.R);
      } else {
        const f = e.owner.facing;
        const fx = Math.sin(f); const fz = Math.cos(f);
        const lateral = (e.owner.slot - 0.5) * TABLE_SPREAD;
        // ORDER 296 (punkt 6, provspel av 64b27c0: "tallrikarna ska stå där
        // gästerna sitter, inte på tomma bord") — på bordets mitt eller på
        // disken framför gästerna, i sidled längs bordet.
        const ta = e.owner.tableAt;
        // ORDER 323 §9 — på skivan under bordets mitt, längs långsidan och innanför kanten.
        const surf = this.tableAtOf.get(e.owner.group)?.surface ?? null;
        const [x, z] = ta && surf ? spotOnSurface(surf, ta, e.owner.slot)
          : ta ? [ta[0] + lateral, ta[1]]
          : [e.owner.at[0] + fx * TABLE_INSET + fz * lateral, e.owner.at[1] + fz * TABLE_INSET - fx * lateral];
        placeProp(p, this.group, x, this.surfaceY(x, z, e.owner.groupKind), z, f);
      }
    }
    for (const [id, p] of this.ledgerProps) if (!seen.has(id)) { this.giveBack(p); this.ledgerProps.delete(id); }
    // ORDER 313 §8 — karaffen på bordet så länge något av sällskapets står där.
    const served = new Set(ledger.filter((e) => e.owner.kind === 'table' && e.owner.groupKind !== 'bar').map((e) => (e.owner as { group: string }).group));
    for (const gid of served) {
      const g = this.tableAtOf.get(gid);
      if (!g || this.carafes.has(gid)) continue;
      const p = this.take('carafe');
      // ORDER 323 §9 — karaffen innanför bordets kant (förut 0,32 m ut på ett bord som är 0,35 m brett åt varje håll).
      const [cx, cz] = g.surface ? spotOnSurface(g.surface, g.at, 0, 0.5 * TABLE_SPREAD + TABLE_CARAFE_OFFSET) : [g.at[0] + TABLE_CARAFE_OFFSET, g.at[1]];
      placeProp(p, this.group, cx, this.surfaceY(cx, cz, g.kind), cz, 0);
      this.carafes.set(gid, p);
    }
    for (const [gid, p] of this.carafes) if (!served.has(gid)) { this.giveBack(p); this.carafes.delete(gid); }
    // Klippens händer: menyn, blocket, notamappen, servetten och brickan.
    const handSeen = new Set<string>();
    const hands = (key: string, rig: FigureRig, clipId: string | null, sample: ClipSample | null) => {
      if (!clipId || !sample || !rig.root.visible) return;
      const spec = CLIPS[clipId];
      for (const side of ['L', 'R'] as const) {
        const held = spec.holds[side] ?? spec.ends[side];
        if (!held || held === 'any' || !HAND_PROPS.has(held)) continue;
        const hk = `${key}:${side}:${held}`;
        handSeen.add(hk);
        let p = this.handProps.get(hk);
        if (!p) { p = this.take(held); this.handProps.set(hk, p); }
        holdProp(p, rig, side, this.group);
        updateHeld(p, sample.tilt[side]);
      }
    };
    staffRigs.forEach((rig, i) => hands(`s${i}`, rig, this.staffClip[i].id, staffSamples[i]));
    guestRigs.forEach((rig, i) => hands(`g${i}`, rig, guestClipIds[i], guestSamples[i]));
    for (const [hk, p] of this.handProps) if (!handSeen.has(hk)) { this.giveBack(p); this.handProps.delete(hk); }
    return ledger;
  }

  /** Kameran glider in mot figuren när en raket börjar, och tillbaka efter svaret. */
  camera(target: MutableRefObject<CameraTarget>, rocket: ActiveIncident | null, figureLocal: { x: number; y: number; z: number } | null, dt: number): void {
    // ORDER 292 (provspel av 316b4c3: "Kameran glider in vid alla raketer. I
    // provspelet gjorde den det bara ibland") — varje raket, också den spelaren
    // startar själv och den utan figur; punkten är figuren, annars bordet,
    // annars rummets mitt (WineBarFigures). Saknas punkten väntar glidningen.
    const key = rocket ? `${rocket.id}:${rocket.openedAt}` : '';
    this.figureWorld = null;
    if (key && figureLocal) {
      this.v.set(figureLocal.x, figureLocal.y, figureLocal.z);
      this.group.localToWorld(this.v);
      this.figureWorld = this.v.clone();
    }
    const cur = target.current;
    if (key && key !== this.rocketKey && this.figureWorld) {
      const saved = this.glide && this.glide.out ? this.glide.saved : { x: cur.focus.x, z: cur.focus.z, distance: cur.distance };
      this.glide = { key, saved, from: { x: cur.focus.x, z: cur.focus.z, distance: cur.distance }, to: { x: this.figureWorld.x, z: this.figureWorld.z, distance: THEATRE.camera.distanceM }, t: 0, dur: THEATRE.camera.glideInSeconds, out: false };
    } else if (!key && this.rocketKey && this.glide && !this.glide.out) {
      this.glide = { ...this.glide, from: { x: cur.focus.x, z: cur.focus.z, distance: cur.distance }, to: this.glide.saved, t: 0, dur: THEATRE.camera.glideOutSeconds, out: true };
    }
    // Utan punkt än: raketen räknas inte som påbörjad, så glidningen kommer när punkten finns.
    if (!(key && key !== this.rocketKey && !this.figureWorld)) this.rocketKey = key;
    const g = this.glide;
    if (!g) return;
    g.t = Math.min(g.dur, g.t + dt);
    const u = g.dur > 0 ? g.t / g.dur : 1;
    const k = u * u * (3 - 2 * u);
    cur.focus = { x: g.from.x + (g.to.x - g.from.x) * k, z: g.from.z + (g.to.z - g.from.z) * k };
    cur.distance = g.from.distance + (g.to.distance - g.from.distance) * k;
    if (u >= 1 && g.out) this.glide = null;
  }

  dispose(): void {
    for (const p of [...this.ledgerProps.values(), ...this.handProps.values(), ...this.free]) p.group.removeFromParent();
    this.ledgerProps.clear();
    this.handProps.clear();
    this.free.length = 0;
  }
}
