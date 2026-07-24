import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import { useCamera } from '../camera/CameraContext';
import { WORLD, polylineLength } from '../content/world';
import type { RawRoad, Vec2Tuple } from '../content/world';
import {
  displayNameFor,
  roleFor,
  WAYFINDING_ROAD_NAMES
} from '../content/roadRoles';
import { readabilityFade } from '../util/readability';

type Tier = 'main' | 'major' | 'secondary' | 'local';

interface Label {
  road: RawRoad;
  centre: Vec2Tuple;
  angleDeg: number;
  tier: Tier;
}

// Compute the midpoint of a polyline plus the heading of its middle segment
// so the label sits along the street rather than fighting the road angle.
function computeCentre(poly: Vec2Tuple[]): { c: Vec2Tuple; angleDeg: number } {
  const mid = Math.floor(poly.length / 2);
  const a = poly[Math.max(0, mid - 1)];
  const b = poly[Math.min(poly.length - 1, mid)];
  const c: Vec2Tuple = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  let angleDeg = (Math.atan2(-dz, dx) * 180) / Math.PI;
  // Keep labels roughly upright — flip 180° when they'd read upside-down.
  if (angleDeg > 90) angleDeg -= 180;
  else if (angleDeg < -90) angleDeg += 180;
  return { c, angleDeg };
}

// Four-tier label system, modelled on modern digital maps.
//
//   MAIN       the principal through-road. Reads first, dominates at
//              every zoom.
//   MAJOR      village-collector secondaries — Kyrkogatan, Smedsgatan.
//              Named at village altitude alongside main, one weight
//              subordinate.
//   SECONDARY  named local streets (Sörälgsvägen, Kvarnvägen,
//              Gruvgatan…). Appear at district range.
//   LOCAL      named residentials — the neighbourhood grid. Surfaces at
//              business range.
//
// Tier is derived from the semantic road role in `content/roadRoles`
// so this file stays in sync with the road renderer's hierarchy. Raw
// OSM names are preserved as-is: e.g. the principal route is labelled
// `Lokavägen` on its 3 named segments — the Vision Owner's reference
// to `Hälleforsvägen` matches the same physical road but that name
// does not appear in the OSM dataset.
function tierForRoad(r: RawRoad, displayName: string): Tier {
  const role = roleFor(r);
  if (role === 'main') return 'main';
  if (role === 'secondary_connector') return 'major';
  // Wayfinding-critical named roads — Prästgatan toward Torget,
  // Sörälgsvägen up to Campus, Skolgatan, Stationsgatan — stay
  // visible from close range up to strategic altitude regardless of
  // their raw OSM classification. Without this promotion a
  // residential-tagged wayfinding street fades out around 500 m and
  // the player loses the mental map at village zoom (localhost
  // village-preset screenshot review 2026-07-24).
  if (WAYFINDING_ROAD_NAMES.has(displayName)) return 'major';
  if (role === 'local_street') return 'secondary';
  return 'local';
}

// Labels are cheap only if we don't spawn hundreds. Filter to streets
// that pass through or near the built village so labels cluster where
// the player is reading. Anchor is a rough approximation of the built
// village centroid (Torget region: X ~ 10, Z ~ -5). Radius keeps the
// entire built area comfortably in range.
const VILLAGE_ANCHOR: Vec2Tuple = [10, -5];
const VILLAGE_RADIUS = 900;

function inVillage(c: Vec2Tuple): boolean {
  return (
    Math.hypot(c[0] - VILLAGE_ANCHOR[0], c[1] - VILLAGE_ANCHOR[1]) <
    VILLAGE_RADIUS
  );
}

// Camera-distance visibility envelopes per tier. The nearIn/nearOut
// pair fades a label IN as the camera pulls back; the farIn/farOut pair
// fades it OUT again beyond that. This is what gives the digital-map
// behaviour where you zoom out and only major roads stay named.
//
//   MAJOR      visible from mid-district (120 m) up to strategic max.
//              At business range it fades out; the immediate local
//              street labels take over there.
//   SECONDARY  visible from close range (40 m) through district; fades
//              out before the strategic view so the map doesn't clutter.
//   LOCAL      visible only at business range (< 100 m).
const TIER_FADE: Record<Tier, {
  nearIn: number; nearOut: number; farIn?: number; farOut?: number;
}> = {
  main: { nearIn: 140, nearOut: 260 },
  major: { nearIn: 110, nearOut: 220, farIn: 900, farOut: 1200 },
  secondary: { nearIn: 40, nearOut: 80, farIn: 350, farOut: 500 },
  local: { nearIn: 10, nearOut: 25, farIn: 70, farOut: 110 }
};

export function StreetLabels() {
  const labels = useMemo<Label[]>(() => {
    const seen = new Set<string>();
    const out: Label[] = [];
    for (const r of WORLD.roads) {
      if (r.poly.length < 2) continue;
      // Use the derived display name so promoted unnamed segments
      // (Rv 244 → Hälleforsvägen, unnamed Rv 205 → Lokavägen) surface
      // in the label pool. Fall back to `road.name` for everything
      // else.
      const label = displayNameFor(r);
      if (!label) continue;
      // Drop duplicate names — many OSM ways carry the same street
      // name (Lokavägen alone spans 6 segments once Rv 205
      // continuations are promoted).
      if (seen.has(label)) continue;
      const len = polylineLength(r.poly);
      if (len < 30) continue;
      const { c, angleDeg } = computeCentre(r.poly);
      if (!inVillage(c)) continue;
      out.push({
        road: r,
        centre: c,
        angleDeg,
        tier: tierForRoad(r, label)
      });
      seen.add(label);
    }
    return out;
  }, []);

  const { actualRef } = useCamera();
  // Poll the camera distance in the frame loop but only push it to React
  // state at ~10 Hz so we're not re-rendering every label 60 fps.
  const [dist, setDist] = useState<number>(actualRef.current.distance);
  const last = useRef(performance.now());
  useFrame(() => {
    const now = performance.now();
    if (now - last.current > 100) {
      last.current = now;
      const d = actualRef.current.distance;
      if (Math.abs(d - dist) > 5) setDist(d);
    }
  });

  // drei's <Html distanceFactor> renders the DOM element at ~ (distanceFactor
  // / cameraDistance) apparent size. We drive distanceFactor from the current
  // camera distance so labels keep a roughly constant on-screen size across
  // the entire zoom range: DOM scale ≈ dist * 0.42 / dist ≈ 0.42, floored so
  // close-range labels don't shrink to nothing and capped so village-scale
  // doesn't overflow.
  const distanceFactor = Math.max(70, Math.min(650, dist * 0.42));

  return (
    <group>
      {labels.map((l) => {
        const opacity = readabilityFade(dist, TIER_FADE[l.tier]);
        if (opacity < 0.02) return null;
        // Major labels sit a touch heavier so they read at strategic
        // altitude; local labels are lighter so they don't compete with
        // the room at business range.
        const weight =
          l.tier === 'main' ? 700 :
          l.tier === 'major' ? 600 :
          l.tier === 'secondary' ? 500 : 400;
        return (
          <Html
            key={l.road.id}
            position={[l.centre[0], 1.4, l.centre[1]]}
            center
            zIndexRange={[10, 0]}
            distanceFactor={distanceFactor}
          >
            <div
              className={`gb-street-label gb-street-${l.tier}`}
              style={{
                opacity,
                transform: `rotate(${-l.angleDeg}deg)`,
                fontWeight: weight
              }}
            >
              {displayNameFor(l.road)}
            </div>
          </Html>
        );
      })}
    </group>
  );
}
