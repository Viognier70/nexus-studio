// venueEntrance.ts — entrén som data i byggnadsposten. Leverans 2026-10-02 (byn, andra omtaget), underlag till 288.
//
// Rummen har entrén på lokala +X (wineBarRoom.ts: dörren i östra väggen, x = width/2), alltså på den långa axelns ena
// ände. orientedBbox (procgen/geom.ts) väljer vinkeln efter polygonens längsta kant, och vilken ände som blir +X avgörs
// av kantens riktning. För w869907975 skiljer det 9 mm mellan kanterna 0→1 och 2→3, så en ändring i OSM kunde vända
// rummet och kön 180°. Här bestämmer byggnadsposten i stället vart entrén vetter.
//
// I WORLD (grythyttan-world.json) får byggnaden fältet `entrance`. interiorLayout.ts placerar rummet med entranceObb i
// stället för orientedBbox, och byn läser samma funktion (byKvallPlats.js), så att byn och teatern är lika.

export type Vec2 = [number, number];

export interface BuildingEntrance {
  /** Landmärkets id i WORLD.landmarks, eller en punkt [x, z] i byns ram. Entrén vetter dit. */
  towards: string | Vec2;
}

/** Tillägg i byggnadsposten. Bara byggnader som kan bli spelarens krog behöver fältet. */
export interface BuildingWithEntrance { id: string; poly: Vec2[]; entrance?: BuildingEntrance }

/** w869907975: entrén mot torget (norrut). Ingången på den riktiga byggnaden är inte kontrollerad på plats. */
export const VENUE_ENTRANCES: Record<string, BuildingEntrance> = {
  w869907975: { towards: 'gry-torget' }
};

export interface OrientedBox { centre: Vec2; w: number; d: number; angle: number }

/**
 * Som orientedBbox, men vinkeln vänds 180° om lokala +X inte pekar mot entrance.towards. Utan entrance: oförändrad.
 * Rummet placeras sedan som förut: group.position = centre, group.rotation.y = −angle.
 */
export function entranceObb(
  b: BuildingWithEntrance,
  orientedBbox: (poly: Vec2[]) => OrientedBox,
  landmark: (id: string) => Vec2 | null
): OrientedBox & { flipped: boolean } {
  const o = orientedBbox(b.poly);
  const e = b.entrance ?? VENUE_ENTRANCES[b.id];
  if (!e) return { ...o, flipped: false };
  const p = typeof e.towards === 'string' ? landmark(e.towards) : e.towards;
  if (!p) return { ...o, flipped: false };
  const dot = Math.cos(o.angle) * (p[0] - o.centre[0]) + Math.sin(o.angle) * (p[1] - o.centre[1]);
  if (dot >= 0) return { ...o, flipped: false };
  return { ...o, angle: o.angle > 0 ? o.angle - Math.PI : o.angle + Math.PI, flipped: true };
}
