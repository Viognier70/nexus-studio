// ORDER 309 — trivselplattan ur Designs D5 (staffStatus.ts drawWellbeing) på
// en duk över rummet, som stämningens symboler (moodSymbols.ts). Plattan står
// vid orkringens högra kant mot kameran (WELLBEING_SYMBOL.offsetM från
// figurens fötter, åt kamerans höger) och följer figuren. 20 px, i valnöt med
// mässingskant; glöden i tre lägen (hel låga, liten låga, släckt veke).

import * as THREE from 'three';
import { drawWellbeing, WELLBEING_SYMBOL, type WellbeingId } from './staffStatus';

export interface WellbeingItem { key: string; feet: THREE.Vector3; id: WellbeingId }

export class WellbeingLayer {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly v = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  /** Var plattorna ritades senast (för kontrollen i spelet). */
  drawn: { key: string; id: WellbeingId; x: number; y: number }[] = [];

  constructor(parent: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.dataset.testid = 'wellbeing-plates';
    Object.assign(this.canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '20' });
    parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
  }

  clear(): void {
    this.drawn = [];
    this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  dispose(): void {
    this.canvas.remove();
  }

  draw(items: WellbeingItem[], camera: THREE.Camera): void {
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
    this.drawn = [];
    // Kamerans högerriktning i världen, i golvets plan.
    this.right.setFromMatrixColumn(camera.matrixWorld, 0);
    this.right.y = 0;
    if (this.right.lengthSq() < 1e-6) this.right.set(1, 0, 0);
    this.right.normalize().multiplyScalar(WELLBEING_SYMBOL.offsetM);
    for (const it of items) {
      this.v.copy(it.feet).add(this.right).project(camera);
      if (this.v.z > 1 || this.v.z < -1) continue;
      const x = (this.v.x * 0.5 + 0.5) * w;
      const y = (-this.v.y * 0.5 + 0.5) * h;
      drawWellbeing(ctx, it.id, x, y);
      this.drawn.push({ key: it.key, id: it.id, x: Math.round(x), y: Math.round(y) });
    }
  }
}
