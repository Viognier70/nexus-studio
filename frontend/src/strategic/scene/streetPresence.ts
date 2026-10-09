// ORDER 323 §6 — var byns gående står just nu, så att bilarna kan stanna vid
// övergångsställena när någon står där. Gatans system (OsmPedestrians,
// VillageLife) skriver sina platser varje bild; trafiken läser dem.
// Platserna ligger som x, z, x, z … i en Float32Array per källa.

type Source = 'peds' | 'life';

const sources = new Map<Source, { xz: Float32Array; n: number }>();

export function publishStreetWalkers(source: Source, xz: Float32Array, n: number): void {
  sources.set(source, { xz, n });
}

export function clearStreetWalkers(source: Source): void {
  sources.delete(source);
}

/** Står någon gående inom `radius` meter från (x, z)? */
export function walkerNear(x: number, z: number, radius: number): boolean {
  const r2 = radius * radius;
  for (const { xz, n } of sources.values()) {
    for (let i = 0; i < n; i++) {
      const dx = xz[i * 2] - x;
      const dz = xz[i * 2 + 1] - z;
      if (dx * dx + dz * dz <= r2) return true;
    }
  }
  return false;
}
