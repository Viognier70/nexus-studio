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
import { SURFACE_HEIGHT } from './wineBarRoom';
import { THEATRE } from '../../sim/balance';
import { PROP_VISUAL_SCALE } from './staffRing';
import type { CameraTarget } from '../types';
import type { ActiveIncident } from '../../sim/incidents';

const LEDGER_PROP: Record<LedgerEntry['item'], PropId> = { plate: 'plate', dishes: 'plate', glass: 'wineGlass', bottle: 'wineBottle' };
// Det som följer klippets händer (inte ägarboken): kort, block, mapp, servett, bestick, bricka.
const HAND_PROPS = new Set<PropId>(['menu', 'pad', 'billFolder', 'napkin', 'fork', 'knife', 'tray']);
const TABLE_INSET = 0.45;
const TABLE_SPREAD = 0.22;

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
  staffPose(i: number, key: StaffKey, s: FigureSample, rocket: ActiveIncident | null, now: number): ClipSample | null {
    const fig = rocket?.context.figure;
    if (fig && fig.kind === 'staff' && fig.staffKey === key) {
      const introTotal = THEATRE.rocketIntroSeconds[fig.clip];
      const elapsed = introTotal - Math.max(0, rocket.introLeft ?? 0);
      if ((rocket.introLeft ?? 0) > 0) return sampleClip('rocket.cutHand', elapsed, 'normal');
      return sampleClip('rocket.holdHand', now, 'normal');
    }
    const id = staffClipFor(s, key);
    if (!id) { this.staffClip[i].id = null; return null; }
    const st = this.staffClip[i];
    if (st.id !== id) { st.id = id; st.tempo = tempoFor(s.stress); }
    return sampleForFigure(id, s, st.tempo);
  }

  /** Gästens pose ur klippet (sitsen avgör sittklippet), eller null när figureActs-posen gäller. */
  guestPose(i: number, s: FigureSample, seat: SeatKind | null, rocket: ActiveIncident | null): ClipSample | null {
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
    const id = guestClipFor(s, seat);
    this.guestClip[i].id = id;
    return id ? sampleForFigure(id, s, 'normal', seat ?? undefined) : null;
  }

  /** Klippet gästen spelar just nu (för händernas rekvisita). */
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
        const x = e.owner.at[0] + fx * TABLE_INSET + fz * lateral;
        const z = e.owner.at[1] + fz * TABLE_INSET - fx * lateral;
        placeProp(p, this.group, x, this.floorY + SURFACE_HEIGHT[e.owner.groupKind], z, f);
      }
    }
    for (const [id, p] of this.ledgerProps) if (!seen.has(id)) { this.giveBack(p); this.ledgerProps.delete(id); }
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
