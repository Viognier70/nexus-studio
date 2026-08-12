// ORDER 054 Del C — sun as a directional light + procedural sky +
// hemisphere ambient, all locked to the same solar position.
//
// One place computes the sun; the light, the sky and the hemisphere
// tone all read from that single derivation. If a caller wants a
// different time or date, it passes them here; nothing downstream
// gets to hardcode angles.
//
// The shadow camera is deliberately small and centred on the current
// camera position. A directional light with a shadow frustum spanning
// the full 2 km far-plane would produce shadow maps at ~1 m/texel
// resolution — unusable. We follow the camera and keep the frustum at
// SHADOW_EXTENT_M metres on a side, so a 2048² shadow map gives
// ~4 cm/texel and reads crisp up close.

import { Sky } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  GRYTHYTTAN_LAT,
  GRYTHYTTAN_LON,
  solarPosition,
  sunDirection
} from '../solarPosition';
import { writeSkyState } from './skyState';

const DEG_TO_RAD = Math.PI / 180;

// Sun placed on this radius around the world origin in the light rig.
// Directional lights are directional (parallel rays), so the actual
// distance doesn't affect shading — only the direction does. We use a
// large but finite value so the sky's `sunPosition` prop reads the
// same vector when normalised.
const SUN_DISTANCE_M = 800;

// Shadow frustum half-width around the follow anchor. 40 m covers the
// restaurant footprint + the plaza directly in front of the door with
// room to spare. Bigger = softer resolution; smaller = sharper but
// shadows disappear at the edges of view when zoomed out.
const SHADOW_EXTENT_M = 40;

// Shadow map resolution. 2048² is a good balance for a single sun on
// desktop hardware; 4096² doubles memory and cost for a small
// crispness gain at this frustum size.
const SHADOW_MAP_SIZE = 2048;

// Colour temperature endpoints. The sun is warm-red at grazing angles
// (Rayleigh scattering through more atmosphere) and neutral-warm
// overhead. These are deliberately not pure white — a "white" sun
// against a bluish sky reads as a spotlight, not sunlight.
const SUN_COLOUR_HORIZON = new THREE.Color('#f28a3a');
const SUN_COLOUR_HIGH    = new THREE.Color('#fbe6c4');

// Hemisphere ambient — sky-tone from above, ground-tone from below.
// Night colours dim toward blue, keeping some tonal separation so the
// scene doesn't collapse to flat grey after sundown.
// ORDER 056 Del A — sky-day pushed toward clearer blue so shaded
// surfaces fill toward sky, not brown. Old #8fa5b8 was too neutral
// and pulled toward the ground colour under strong sun; #6f8fb6 has
// more saturation in the blue channel and reads as sky.
const HEMI_SKY_DAY    = new THREE.Color('#6f8fb6');
const HEMI_GROUND_DAY = new THREE.Color('#4e4132');
// ORDER 057 Del B — bumped night hemi values up so shaded surfaces
// don't render as pure black. Sky reads as deep dusk-blue overhead;
// ground reads as a slightly warmed near-charcoal from below. Nothing
// in the scene ends up at 0-brightness under this hemi alone.
const HEMI_SKY_NIGHT  = new THREE.Color('#3a4a68');
const HEMI_GROUND_NIGHT = new THREE.Color('#221f1c');

// Moonlight (ORDER 057 Del B) — a soft cool-toned directional that
// stays on when the sun is below the horizon so silhouettes still
// read. Not a real astronomical moon; a scripted fill that comes
// from up-and-north-east, matching a plausible night-side rim.
const MOONLIGHT_DIR = { x: -0.4, y: -0.85, z: -0.35 };  // travel direction
const MOONLIGHT_COLOUR = new THREE.Color('#8caac8');
const MOONLIGHT_PEAK_INTENSITY = 0.35;

// ORDER 055 Del D — atmospheric haze / fog / background colours track
// the sun elevation. Three anchor points, lerped by an elevation
// factor: warm at grazing angles, tan at mid-day, cool-blue high up.
// Night hides in the dark end so twilight → night reads.
const BG_HORIZON_WARM = new THREE.Color('#d0a480');   // low sun, warm haze
const BG_MID_TAN      = new THREE.Color('#c1bcae');   // mid sun, autumn haze
const BG_HIGH_COOL    = new THREE.Color('#a6b5c2');   // high sun, cool zenith wash
const BG_NIGHT        = new THREE.Color('#1b202a');   // sub-horizon

interface Props {
  // Time-of-day in local civil hours (0..24). Callers derive this
  // from whatever cadence they run on — a real clock, a sim clock,
  // or a fixed value for a scripted scene.
  hourOfDay: number;
  // Calendar day used for declination. Defaults to today.
  date?: Date;
  // Site coordinates. Defaults to Grythyttan.
  latitudeDeg?: number;
  longitudeDeg?: number;
  // If true, the light's world position (and its shadow camera) follow
  // the render camera so shadows stay crisp under it. Defaults on.
  followCamera?: boolean;
  // Shadow frustum half-width. Default 40 m covers the restaurant
  // interior + plaza; expand only if a specific scene needs it.
  shadowExtentM?: number;
  // Master intensity multiplier — lets a caller darken the whole rig
  // (e.g. paused / pre-service). Default 1.
  intensityScale?: number;
  // ORDER 055 Del D — fog + background colour are now owned by the
  // rig and derived from sun elevation. Caller passes only the range
  // (near, far) appropriate to its scene scale. Pass `null` to opt
  // out of fog / background entirely (rare — the sky-sphere fallback
  // is what the drei <Sky> covers already, but a scene may want its
  // own atmosphere layer).
  fogRange?: [near: number, far: number] | null;
}

export function SunLightRig({
  hourOfDay,
  date,
  latitudeDeg = GRYTHYTTAN_LAT,
  longitudeDeg = GRYTHYTTAN_LON,
  followCamera = true,
  shadowExtentM = SHADOW_EXTENT_M,
  intensityScale = 1,
  fogRange = null
}: Props) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  const { camera } = useThree();

  // Solar position derived from the pure function. Recompute when the
  // hour or date changes.
  const angles = useMemo(
    () => solarPosition(latitudeDeg, longitudeDeg, date ?? new Date(), hourOfDay),
    [latitudeDeg, longitudeDeg, date, hourOfDay]
  );

  // Sun direction (light travel) and its inverse (sun's sky position).
  const dir = useMemo(() => sunDirection(angles), [angles]);
  const skySunOffset = useMemo(
    () => ({
      x: -dir.x * SUN_DISTANCE_M,
      y: -dir.y * SUN_DISTANCE_M,
      z: -dir.z * SUN_DISTANCE_M
    }),
    [dir]
  );

  // Colour: lerp warm-horizon → warm-high as elevation climbs from 0
  // to 40°. Below the horizon we hold the horizon colour (won't be
  // seen — intensity is zero — but the material would otherwise flash
  // if a caller ignored intensity).
  const { sunColour, sunIntensity, hemiColours, hemiIntensity, atmosphere, moonIntensity } = useMemo(() => {
    const el = angles.elevation;
    const t = Math.max(0, Math.min(1, el / 40));
    const c = SUN_COLOUR_HORIZON.clone().lerp(SUN_COLOUR_HIGH, t);
    // ORDER 055 Del C — sun peak intensity raised so a 28–30° sun
    // reads as clear daylight after ACES compression. Previous
    // dayCurve multiplier of 1.3 combined with sin(28°)≈0.47 gave
    // ~1.0 pre-ACES, which the filmic tone map then squashed to
    // "dusk" mid-day. New multiplier 2.6 yields ~1.6 at 28° pre-ACES
    // → daylight after compression. Twilight component unchanged.
    let iRaw = 0;
    if (el > -3) {
      const twilight = Math.max(0, Math.min(1, (el + 3) / 9));
      const dayCurve = el > 0 ? Math.sin(el * DEG_TO_RAD) : 0;
      iRaw = twilight * 0.4 + dayCurve * 2.6;
    }
    const i = Math.max(0, iRaw) * intensityScale;

    // Hemisphere follows day/night blend. ORDER 055 Del C — bumped
    // from a peak of ~0.7 to ~1.6 so shaded surfaces read as
    // sky-blue-filled rather than black. Ground colour supplies the
    // warm bounce from below at the same lift.
    // ORDER 057 Del B — night baseline raised from 0.3 → 0.55 so the
    // village stays readable after sundown. Peak (daylight) unchanged.
    const dayBlend = Math.max(0, Math.min(1, (el + 3) / 12));
    const sky = HEMI_SKY_NIGHT.clone().lerp(HEMI_SKY_DAY, dayBlend);
    const ground = HEMI_GROUND_NIGHT.clone().lerp(HEMI_GROUND_DAY, dayBlend);
    const hi = (0.55 + 1.05 * dayBlend) * intensityScale;

    // ORDER 057 Del B — moonlight intensity ramps IN as the sun goes
    // down. Uses the same twilight anchors as the atmosphere blend
    // so the moon fades in exactly as the sun fades out.
    const nightBlend = Math.max(0, Math.min(1, (3 - el) / 6));
    const moonI = MOONLIGHT_PEAK_INTENSITY * nightBlend * intensityScale;

    // ORDER 055 Del D — atmosphere colour (fog + background) follows
    // sun elevation. Three anchors:
    //   -3° → BG_NIGHT
    //    5° → BG_HORIZON_WARM  (warm haze at grazing sun)
    //   25° → BG_MID_TAN       (mid-day autumn haze)
    //   55° → BG_HIGH_COOL     (cool zenith wash)
    // Piecewise-linear blends between anchors so the transition is
    // smooth and directional (warms as sun sets, cools as it climbs).
    const atmos = (() => {
      if (el <= -3) return BG_NIGHT.clone();
      if (el <= 5) {
        const k = (el + 3) / 8;
        return BG_NIGHT.clone().lerp(BG_HORIZON_WARM, k);
      }
      if (el <= 25) {
        const k = (el - 5) / 20;
        return BG_HORIZON_WARM.clone().lerp(BG_MID_TAN, k);
      }
      const k = Math.min(1, (el - 25) / 30);
      return BG_MID_TAN.clone().lerp(BG_HIGH_COOL, k);
    })();

    return {
      sunColour: c,
      sunIntensity: i,
      hemiColours: { sky, ground },
      hemiIntensity: hi,
      atmosphere: atmos,
      moonIntensity: moonI
    };
  }, [angles.elevation, intensityScale]);

  // ORDER 057 Del B — publish elevation to skyState so downstream
  // components (ProceduralFacades window emissives, PlayerBusiness
  // service-glow) can react without repeating the solar calculation.
  writeSkyState(angles.elevation);

  // Follow the camera each frame so the shadow frustum stays crisp
  // under wherever the player is looking. We move the light AND its
  // target together — the direction (light − target) is what defines
  // the sun's angle; only the anchor moves.
  useFrame(() => {
    if (!followCamera || !lightRef.current || !targetRef.current) return;
    const cx = camera.position.x;
    const cz = camera.position.z;
    lightRef.current.position.set(
      cx + skySunOffset.x,
      skySunOffset.y,
      cz + skySunOffset.z
    );
    targetRef.current.position.set(cx, 0, cz);
    lightRef.current.target = targetRef.current;
    // Three doesn't auto-update the target's matrix each frame unless
    // the target is in the scene graph. `<primitive object={target} />`
    // below fixes that.
    targetRef.current.updateMatrixWorld();
    lightRef.current.shadow.camera.updateProjectionMatrix();
  });

  // Drei's Sky wants sunPosition as a 3-vector. We pass the same sky
  // offset the light rig computed so the sun disc in the sky lines up
  // exactly with the light direction.
  const skySunTuple = useMemo<[number, number, number]>(
    () => [skySunOffset.x, skySunOffset.y, skySunOffset.z],
    [skySunOffset]
  );

  return (
    <>
      {/* ORDER 055 Del D — background + fog track sun elevation so the
          horizon warms as the sun sets and cools as it climbs. Fog
          `far` distance is scene-scoped and passed by the caller. */}
      <color attach="background" args={[atmosphere.getHex()]} />
      {fogRange && (
        <fog attach="fog" args={[atmosphere.getHex(), fogRange[0], fogRange[1]]} />
      )}
      <hemisphereLight
        args={[hemiColours.sky, hemiColours.ground, hemiIntensity]}
      />
      <directionalLight
        ref={lightRef}
        color={sunColour}
        intensity={sunIntensity}
        castShadow={sunIntensity > 0.01}
        shadow-mapSize={[SHADOW_MAP_SIZE, SHADOW_MAP_SIZE]}
        shadow-camera-near={0.5}
        shadow-camera-far={SUN_DISTANCE_M * 2}
        shadow-camera-left={-shadowExtentM}
        shadow-camera-right={shadowExtentM}
        shadow-camera-top={shadowExtentM}
        shadow-camera-bottom={-shadowExtentM}
        // ORDER 056 Del A — normalBias 0.04. 0.02 (055 Del B target)
        // cleared the striping in practice, but the safety margin was
        // thin. 0.04 has visible-zero cost and rides comfortably
        // below the 0.05 ceiling where shadows start detaching.
        shadow-bias={-0.0005}
        shadow-normalBias={0.04}
        position={[skySunOffset.x, skySunOffset.y, skySunOffset.z]}
      />
      {/* Target must live in the scene graph for matrix updates to
          propagate. Kept invisible; only its transform matters. */}
      <primitive object={new THREE.Object3D()} ref={targetRef} />
      {/* ORDER 057 Del B — moonlight. Weak, cool, no shadow, always
          pointing from the same fixed direction. Intensity is zero
          during the day, ramps in through twilight, holds at
          MOONLIGHT_PEAK_INTENSITY once the sun is well below the
          horizon. Casts no shadow — a full second shadow pass would
          double the shadow-map cost for a subtle rim contribution. */}
      <directionalLight
        color={MOONLIGHT_COLOUR}
        intensity={moonIntensity}
        castShadow={false}
        position={[
          -MOONLIGHT_DIR.x * 100,
          -MOONLIGHT_DIR.y * 100,
          -MOONLIGHT_DIR.z * 100
        ]}
      />
      <Sky
        distance={4500}
        sunPosition={skySunTuple}
        turbidity={6}
        rayleigh={2}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
    </>
  );
}
