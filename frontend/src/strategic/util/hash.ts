// En deterministisk slump i [0, 1) ur fröet och en nyckel (FNV-1a), utan att
// flytta simuleringens slumpflöde. Samma funktion som guestOrders.ts hash01,
// här utan beroenden så att src/sim kan läsa den utan cirkelimport.
export function hashKey(seed: number, key: string): number {
  let h = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h / 4294967296;
}

// Samma slump i [−1, 1).
export function signedKey(seed: number, key: string): number {
  return hashKey(seed, key) * 2 - 1;
}
