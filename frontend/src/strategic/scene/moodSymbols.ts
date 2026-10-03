// ORDER 299 — stämningens symboler över borden (Designs D1 §3, guestMood.ts
// MOOD_SYMBOL), ritade på en 2D-duk över scenen med Designs drawMoodSymbol:
// 24 px på skärmen oavsett kamerans avstånd.
// - Var: över bordets mitt (småbord 1,6 m), över dynornas mitt i loungen
//   (1,75 m), 0,42 m över hjässan på en ensam gäst vid baren eller i kön.
// - När: väntar, otålig och missnöjd syns alltid; glad och nöjd i showPositiveS
//   efter att läget ändrats och tonas sedan ut på fadeS.
// - Rörelsen: bättre lyfter 6 px med en liten överskalning, sämre skakar 4 px
//   tre gånger. Aldrig puls. Reducerad rörelse: tonas in på 160 ms.
// - Två symboler som skulle överlappa flyttas isär med minst minGapPx, och den
//   senast ändrade ligger överst.
// Läget per grupp: gruppens gästers nöjdhet i medel, med samma dödzon som
// rummets mätare (sim/guestMood.ts stableRoomMood).

import * as THREE from 'three';
import { stableRoomMood, type MoodId } from '../../sim/guestMood';
import { drawMoodSymbol, MOOD_SYMBOL, MOODS } from './guestMood';

export interface MoodGroup {
  key: string;
  /** Punkten i världen där symbolen står. */
  world: THREE.Vector3;
  /** Gruppens nöjdhet i medel, 0..1. */
  value: number;
}

interface Track { mood: MoodId; changedAt: number; dir: 'better' | 'worse' | null }

const REDUCED_FADE_IN_MS = 160;

export class MoodSymbolLayer {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly tracks = new Map<string, Track>();
  private readonly v = new THREE.Vector3();

  constructor(parent: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.dataset.testid = 'mood-symbols';
    Object.assign(this.canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '20' });
    parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
  }

  dispose(): void {
    this.canvas.remove();
  }

  /** Lägena just nu (för konsekvensögonblicket och kontrollen). */
  moods(): Record<string, MoodId> {
    return Object.fromEntries([...this.tracks].map(([k, t]) => [k, t.mood]));
  }

  /**
   * Ritar symbolerna. `hold` håller kvar de gamla lägena (konsekvensögonblicket
   * byter symbolerna först vid CONSEQUENCE.symbol.at).
   */
  draw(groups: MoodGroup[], camera: THREE.Camera, nowMs: number, hold: boolean, reducedMotion: boolean, visible: boolean): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const seen = new Set<string>();
    const items: { x: number; y: number; mood: MoodId; t: Track; alpha: number }[] = [];
    for (const g of groups) {
      seen.add(g.key);
      const prev = this.tracks.get(g.key);
      const next = stableRoomMood(prev?.mood ?? null, g.value)!;
      let t = prev;
      if (!t) { t = { mood: next, changedAt: nowMs, dir: null }; this.tracks.set(g.key, t); }
      else if (next !== t.mood && !hold) {
        t = { mood: next, changedAt: nowMs, dir: MOODS.indexOf(next) < MOODS.indexOf(t.mood) ? 'better' : 'worse' };
        this.tracks.set(g.key, t);
      }
      if (!visible) continue;
      const since = (nowMs - t.changedAt) / 1000;
      const always = MOOD_SYMBOL.show.always.includes(t.mood);
      const showS = MOOD_SYMBOL.show.showPositiveS;
      const alpha = always ? 1 : since <= showS ? 1 : Math.max(0, 1 - (since - showS) / MOOD_SYMBOL.show.fadeS);
      if (alpha <= 0) continue;
      this.v.copy(g.world).project(camera);
      if (this.v.z > 1 || this.v.z < -1) continue;
      items.push({ x: (this.v.x * 0.5 + 0.5) * w, y: (-this.v.y * 0.5 + 0.5) * h, mood: t.mood, t, alpha });
    }
    for (const k of [...this.tracks.keys()]) if (!seen.has(k)) this.tracks.delete(k);
    // Senast ändrade överst; den som skulle överlappa en tidigare flyttas uppåt.
    items.sort((a, b) => a.t.changedAt - b.t.changedAt);
    const size = MOOD_SYMBOL.sizePx;
    const placed: { x: number; y: number }[] = [];
    for (const it of items) {
      let guard = 0;
      while (placed.some((p) => Math.abs(p.x - it.x) < size + MOOD_SYMBOL.minGapPx && Math.abs(p.y - it.y) < size + MOOD_SYMBOL.minGapPx) && guard++ < items.length) {
        it.y -= size + MOOD_SYMBOL.minGapPx;
      }
      placed.push({ x: it.x, y: it.y });
    }
    for (const it of items) {
      const ms = nowMs - it.t.changedAt;
      let dx = 0; let dy = 0; let scale = 1; let alpha = it.alpha;
      if (reducedMotion) {
        alpha *= Math.min(1, ms / REDUCED_FADE_IN_MS);
      } else if (it.t.dir === 'better') {
        const m = MOOD_SYMBOL.motion.better;
        scale = ms < m.scaleMs[1] ? m.scale[0] + (m.scale[1] - m.scale[0]) * (ms / m.scaleMs[1]) : ms < m.scaleMs[2] ? m.scale[1] + (m.scale[2] - m.scale[1]) * ((ms - m.scaleMs[1]) / (m.scaleMs[2] - m.scaleMs[1])) : 1;
        if (ms < m.lift.to) dy = m.lift.px * Math.sin((Math.PI * ms) / m.lift.to);
      } else if (it.t.dir === 'worse') {
        const m = MOOD_SYMBOL.motion.worse;
        scale = ms < m.scaleMs[1] ? m.scale[0] + (m.scale[1] - m.scale[0]) * (ms / m.scaleMs[1]) : 1;
        const sh = m.shake;
        if (ms >= sh.from && ms < sh.to) {
          const u = (ms - sh.from) / (sh.to - sh.from);
          dx = sh.px * (1 - u) * Math.sin(u * sh.cycles * Math.PI * 2);
        }
      }
      drawMoodSymbol(ctx, it.mood, it.x + dx, it.y + dy, size * scale, alpha);
    }
  }
}
