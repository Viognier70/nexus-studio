// ORDER 319b (Anders 2026-10-08: "Trängseln: använd personalSpace.ts vid vagnen OCH i vinbaren och
// bistron (där med bara att väja och knuffas isär). Lägg till ett test att ingen gäst eller personal
// kommer närmare en annan än 0,35 m i någon verksamhet.")
//
// Designs trängsel (documentation/leveranser/nexus-leveranser-2026-10-08-d9/nexus-leverans-2026-10-08-trangseln/
// personalSpace.ts). Måtten nedan står oförändrade. Tre delar, i den här ordningen varje bild:
//   1. Väja: den som går saktar in när någon står eller går inom lookAheadM framför. Figurerna drivs av
//      sina vägar (truckGuestFlow.ts vid vagnen, wineBarDirector.ts i rummen), så att sakta in läggs på
//      som en eftersläpning bakom vägens punkt: figuren står kvar en bit bakom och hinner ikapp när det
//      är fritt (CATCH_UP_MPS). Eftersläpningen är högst MAX_LAG_M.
//   2. Hålla till höger: på gångvägen och gatorna vid vagnen går man offsetM till höger om mittlinjen
//      (keepRight, tonas in och ut över easeM). Inte i rummen (gångarna är 0,88 m).
//   3. Knuffas isär: två som ändå kommer närmare än radiusM flyttas isär efter massan. Förskjutningen
//      är högst maxOffsetM och tonar bort när det är fritt.
// Ren logik utan three.js, så att testet (order319bTrangseln.test.ts) kör samma kod som scenerna ritar.

export const PERSONAL_SPACE = {
  /** Två figurers mittpunkter hålls minst så här långt isär (figuren är 0,50 m bred över axlarna i prototypen). */
  radiusM: 0.5,
  /** Störst förskjutning från klippets väg. Mer än så och figuren skulle hamna i möbler. */
  maxOffsetM: 0.55,
  /** Förskjutningen tonar bort med 7 % per bild (30 bilder/s) när ingen trycker. */
  decayPerFrame: 0.07,
  iterationsPerFrame: 2,
  /** Vid laddning och kontrollbilder: lös helt innan första bilden. */
  settleIterations: 24,
  /** Den som rör sig ger efter. Högre massa flyttas mindre. */
  mass: { walking: 1, staffWalking: 1.2, waitingOrCollecting: 2, standingAct: 2.5, queued: 3, staffStanding: 3, eatingOrSeated: 4 },
  /** Figurer som tonas in eller ut (alpha under 0,3) räknas inte. */
  ignoreBelowAlpha: 0.3
} as const;

export const YIELD = {
  /** Någon inom 0,85 m och inom ±63° framför (cos ≥ 0,45). Farten skalas med (avstånd − stopp) / 0,43. */
  lookAheadM: 0.85, coneCos: 0.45, scaleM: 0.43,
  /** Bakom någon som går åt samma håll (cos ≥ 0,5 mellan riktningarna): stannar helt vid 0,55 m. */
  following: { stopM: 0.55, floor: 0, sameDirCos: 0.5 },
  /** Mötande, korsande eller någon som står: saktar till 20 % vid 0,42 m men stannar aldrig. */
  crossing: { stopM: 0.42, floor: 0.2 }
} as const;

export const KEEP_RIGHT = {
  offsetM: 0.3,
  /** Tonas in och ut över 1,2 m i början och slutet av en gångsträcka. */
  easeM: 1.2
} as const;

/** Bilder per sekund som Designs decayPerFrame gäller för. */
const DESIGN_FPS = 30;
/** Eftersläpningen bakom vägens punkt när figuren väjer, högst (meter), och hur fort den hämtas in (m/s). */
export const MAX_LAG_M = 0.9;
export const CATCH_UP_MPS = 0.8;
/** Är två ändå närmare än så efter bildens iterationer löses resten som vid laddning (settleIterations). */
export const MIN_GAP_M = 0.4;
/** Gång långsammare än så räknas som att stå (m/s). */
const MOVING_MPS = 0.15;

export type MassKind = keyof typeof PERSONAL_SPACE.mass;

export interface SpaceBody {
  key: string;
  /** Där vägen eller klippet ställer figuren i den här bilden. */
  x: number;
  z: number;
  kind: MassKind;
  alpha?: number;
  /** Fast på sin plats (sitter på en stol): flyttas inte, men andra flyttas från den. */
  pinned?: boolean;
}

interface Track { px: number; pz: number; vx: number; vz: number; lagX: number; lagZ: number; ox: number; oz: number; seen: boolean }

/** Farten som andel (0..1) för den som går mot någon framför sig (YIELD). */
export function yieldFactor(x: number, z: number, dirX: number, dirZ: number, others: ReadonlyArray<{ x: number; z: number; dirX: number; dirZ: number; moving: boolean }>): number {
  let f = 1;
  for (const o of others) {
    const dx = o.x - x, dz = o.z - z;
    const d = Math.hypot(dx, dz);
    if (d > YIELD.lookAheadM || d < 1e-6) continue;
    if ((dx * dirX + dz * dirZ) / d < YIELD.coneCos) continue;
    const same = o.moving && o.dirX * dirX + o.dirZ * dirZ >= YIELD.following.sameDirCos;
    const r = same ? YIELD.following : YIELD.crossing;
    f = Math.min(f, Math.max(r.floor, Math.min(1, (d - r.stopM) / YIELD.scaleM)));
  }
  return f;
}

/** Höger om gångriktningen (x, z i en ram där y är uppåt): (−dirZ, dirX) åt höger i three.js med +Y upp. */
export function rightOf(dirX: number, dirZ: number): [number, number] {
  return [-dirZ, dirX];
}

/** Hur mycket av keepRight som gäller på en sträcka: tonas in efter starten och ut före slutet. */
export function keepRightShare(fromStartM: number, toEndM: number): number {
  return Math.max(0, Math.min(1, fromStartM / KEEP_RIGHT.easeM, toEndM / KEEP_RIGHT.easeM));
}

/** En ny figur börjar en centimeter från sin punkt, åt ett håll ur nyckeln: flera som börjar på samma
 *  punkt (ett sällskap vid dörren) knuffas då isär åt olika håll och inte på en linje. */
const SEED_OFFSET_M = 0.01;
function seed(t: { ox: number; oz: number }, key: string): void {
  const a = hash01(key) * Math.PI * 2;
  t.ox = SEED_OFFSET_M * Math.cos(a);
  t.oz = SEED_OFFSET_M * Math.sin(a);
}

/** Rakt fram: knuffen går mer än så längs gångriktningen (cos 30°). */
const HEAD_ON_COS = 0.87;

/**
 * Riktningen a → c för knuffen när en av dem går rakt mot den andra: åt höger om den som går (a flyttas
 * −riktningen, c +riktningen). Annars null (knuffen går längs linjen mellan dem).
 */
function sidestep(a: { vx: number; vz: number }, c: { vx: number; vz: number }, dx: number, dz: number): [number, number] | null {
  const va = Math.hypot(a.vx, a.vz), vc = Math.hypot(c.vx, c.vz);
  const mover = va >= vc ? a : c, v = Math.max(va, vc);
  if (v <= MOVING_MPS) return null;
  const ux = mover.vx / v, uz = mover.vz / v;
  if (Math.abs(ux * dx + uz * dz) < HEAD_ON_COS) return null;
  const [rx, rz] = rightOf(ux, uz);
  return mover === a ? [-rx, -rz] : [rx, rz];
}

function hash01(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

/**
 * Trängseln för en grupp figurer (en verksamhet). `step` tar vägens punkter för bilden och ger var
 * figurerna ritas: väja (eftersläpning) och knuffas isär. Figurerna får ha egna nycklar, och en figur
 * som inte är med i en bild glöms.
 */
export class PersonalSpace {
  private readonly tracks = new Map<string, Track>();
  /** Där figurerna ritades i senaste bilden. */
  readonly shown = new Map<string, [number, number]>();
  /** Väja med eftersläpning (rummen och vagnen). Av: bara knuffas isär (vagnens flöde väjer själv). */
  constructor(private readonly lag = true) {}

  step(bodies: readonly SpaceBody[], dt: number): Map<string, [number, number]> {
    const live = bodies.filter((b) => (b.alpha ?? 1) >= PERSONAL_SPACE.ignoreBelowAlpha);
    for (const t of this.tracks.values()) t.seen = false;
    // Vägens fart och riktning ur förra bilden.
    const at = live.map((b) => {
      let t = this.tracks.get(b.key);
      if (!t) { t = { px: b.x, pz: b.z, vx: 0, vz: 0, lagX: 0, lagZ: 0, ox: 0, oz: 0, seen: true }; seed(t, b.key); this.tracks.set(b.key, t); }
      t.seen = true;
      const mx = b.x - t.px, mz = b.z - t.pz;
      // Ett hopp längre än en gång på en bild (en ny gäst i samma plats i poolen) börjar om.
      if (Math.hypot(mx, mz) > Math.max(1, dt * 6)) { t.lagX = 0; t.lagZ = 0; t.vx = 0; t.vz = 0; seed(t, b.key); }
      else if (dt > 0) { t.vx = mx / dt; t.vz = mz / dt; }
      t.px = b.x; t.pz = b.z;
      return { b, t };
    });
    for (const k of [...this.tracks.keys()]) if (!this.tracks.get(k)!.seen) this.tracks.delete(k);
    // 1. Väja: den som går saktar in bakom eller framför någon (eftersläpning bakom vägens punkt).
    if (this.lag && dt > 0) {
      const view = at.map(({ b, t }) => {
        const v = Math.hypot(t.vx, t.vz);
        return { x: b.x - t.lagX + t.ox, z: b.z - t.lagZ + t.oz, dirX: v > 0 ? t.vx / v : 0, dirZ: v > 0 ? t.vz / v : 0, moving: v > MOVING_MPS };
      });
      at.forEach(({ b, t }, i) => {
        const me = view[i];
        if (!me.moving || b.pinned) {
          // Står: eftersläpningen hämtas in.
          const l = Math.hypot(t.lagX, t.lagZ), k = l > 0 ? Math.max(0, l - CATCH_UP_MPS * dt) / l : 0;
          t.lagX *= k; t.lagZ *= k;
          return;
        }
        const f = yieldFactor(me.x, me.z, me.dirX, me.dirZ, view.filter((_, j) => j !== i));
        // Den del av steget som inte tas blir eftersläpning; fritt framför: hämtas in.
        t.lagX += t.vx * dt * (1 - f);
        t.lagZ += t.vz * dt * (1 - f);
        if (f >= 1) {
          const l = Math.hypot(t.lagX, t.lagZ), k = l > 0 ? Math.max(0, l - CATCH_UP_MPS * dt) / l : 0;
          t.lagX *= k; t.lagZ *= k;
        }
        const l = Math.hypot(t.lagX, t.lagZ);
        if (l > MAX_LAG_M) { t.lagX *= MAX_LAG_M / l; t.lagZ *= MAX_LAG_M / l; }
      });
    }
    // 3. Knuffas isär: förskjutningen tonar bort, och överlapp löses efter massan.
    const decay = Math.pow(1 - PERSONAL_SPACE.decayPerFrame, Math.max(0, dt) * DESIGN_FPS);
    for (const { t } of at) { t.ox *= decay; t.oz *= decay; }
    this.resolve(at, PERSONAL_SPACE.iterationsPerFrame);
    if (this.closest(at) < MIN_GAP_M) this.resolve(at, PERSONAL_SPACE.settleIterations);
    this.shown.clear();
    for (const { b, t } of at) this.shown.set(b.key, [b.x - t.lagX + t.ox, b.z - t.lagZ + t.oz]);
    return this.shown;
  }

  /** Löser överlappen helt (vid laddning, Designs settleIterations). */
  settle(bodies: readonly SpaceBody[]): Map<string, [number, number]> {
    this.step(bodies, 0);
    const at = bodies.filter((b) => this.tracks.has(b.key)).map((b) => ({ b, t: this.tracks.get(b.key)! }));
    this.resolve(at, PERSONAL_SPACE.settleIterations);
    this.shown.clear();
    for (const { b, t } of at) this.shown.set(b.key, [b.x - t.lagX + t.ox, b.z - t.lagZ + t.oz]);
    return this.shown;
  }

  private closest(at: ReadonlyArray<{ b: SpaceBody; t: Track }>): number {
    let m = Infinity;
    for (let i = 0; i < at.length; i++) for (let j = i + 1; j < at.length; j++) {
      const a = at[i], c = at[j];
      if (a.b.pinned && c.b.pinned) continue;
      m = Math.min(m, Math.hypot(a.b.x - a.t.lagX + a.t.ox - (c.b.x - c.t.lagX + c.t.ox), a.b.z - a.t.lagZ + a.t.oz - (c.b.z - c.t.lagZ + c.t.oz)));
    }
    return m;
  }

  private resolve(at: ReadonlyArray<{ b: SpaceBody; t: Track }>, iterations: number): void {
    const R = PERSONAL_SPACE.radiusM, M = PERSONAL_SPACE.maxOffsetM;
    for (let it = 0; it < iterations; it++) {
      for (let i = 0; i < at.length; i++) {
        for (let j = i + 1; j < at.length; j++) {
          const a = at[i], c = at[j];
          if (a.b.pinned && c.b.pinned) continue;
          const ax = a.b.x - a.t.lagX + a.t.ox, az = a.b.z - a.t.lagZ + a.t.oz;
          const cx = c.b.x - c.t.lagX + c.t.ox, cz = c.b.z - c.t.lagZ + c.t.oz;
          let dx = cx - ax, dz = cz - az;
          let d = Math.hypot(dx, dz);
          if (d >= R) continue;
          if (d < 1e-6) {
            // Samma punkt: isär åt ett håll som följer nycklarna (samma varje bild).
            const ang = hash01(a.b.key < c.b.key ? a.b.key + c.b.key : c.b.key + a.b.key) * Math.PI * 2;
            dx = Math.cos(ang); dz = Math.sin(ang); d = 1e-6;
          } else { dx /= d; dz /= d; }
          // Den som går rakt mot någon kliver åt höger (förbi), i stället för att knuffas längs vägen.
          const side = sidestep(a.t, c.t, dx, dz);
          if (side) { dx = side[0]; dz = side[1]; }
          const ma = PERSONAL_SPACE.mass[a.b.kind], mc = PERSONAL_SPACE.mass[c.b.kind];
          const wa = a.b.pinned ? 0 : c.b.pinned ? 1 : mc / (ma + mc);
          const push = R - d;
          a.t.ox -= dx * push * wa; a.t.oz -= dz * push * wa;
          c.t.ox += dx * push * (1 - wa); c.t.oz += dz * push * (1 - wa);
          for (const t of [a.t, c.t]) {
            const o = Math.hypot(t.ox, t.oz);
            if (o > M) { t.ox *= M / o; t.oz *= M / o; }
          }
        }
      }
    }
  }
}
