// ORDER 325 §2 — mätningen av ansiktenas avstånd: kamerans avstånd till varje synligt huvud, som figureFace.ts
// update() räknar det (samma tal som tonar skalen), samlat per bild och skrivet i sidan
// (document.body.dataset.faceDist) fyra gånger i sekunden. Kontrollskriptet scripts/order325-kamera.mjs läser det.
// Formen: JSON { n, min, median, max, near, far } — antal huvuden, avstånden i meter och hur många som visar
// det nära och det långa skalet (opacitet över 0,5).

const PUBLISH_EVERY_MS = 250;

export class FaceProbe {
  private d: number[] = [];
  private near = 0;
  private far = 0;
  private last = 0;

  constructor(private readonly key: string) {}

  add(o: { near: number; far: number; distM: number }, visible: boolean): void {
    if (!visible) return;
    this.d.push(o.distM);
    if (o.near > 0.5) this.near++;
    if (o.far > 0.5) this.far++;
  }

  /** Anropas en gång per bild efter alla add. */
  flush(): void {
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    if (now - this.last >= PUBLISH_EVERY_MS && typeof document !== 'undefined') {
      this.last = now;
      const s = [...this.d].sort((a, b) => a - b);
      const r = (x: number) => Math.round(x * 100) / 100;
      document.body.dataset[this.key] = JSON.stringify(s.length
        ? { n: s.length, min: r(s[0]), median: r(s[Math.floor(s.length / 2)]), max: r(s[s.length - 1]), near: this.near, far: this.far }
        : { n: 0 });
    }
    this.d.length = 0;
    this.near = 0;
    this.far = 0;
  }
}
