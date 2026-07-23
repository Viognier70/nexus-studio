// Mulberry32 seeded PRNG. Deterministic, small, sufficient for a prototype.
// State is a 32-bit unsigned integer; callers keep the state and thread it
// through so the simulation reducer stays pure.

export function mulberry32(state: number): { next: number; value: number } {
  let s = (state + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { next: s, value };
}

export interface Rng {
  state: number;
  next(): number;
  range(min: number, max: number): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  chance(probability: number): boolean;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const rng: Rng = {
    get state() {
      return state;
    },
    set state(v: number) {
      state = v >>> 0;
    },
    next() {
      const step = mulberry32(state);
      state = step.next;
      return step.value;
    },
    range(min: number, max: number) {
      return min + rng.next() * (max - min);
    },
    int(min: number, max: number) {
      return Math.floor(rng.range(min, max + 1));
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('Rng.pick called with empty array');
      return items[Math.floor(rng.next() * items.length)];
    },
    chance(probability: number) {
      return rng.next() < probability;
    }
  };
  return rng;
}
