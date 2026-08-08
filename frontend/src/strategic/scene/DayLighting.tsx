// ORDER 043 v3 §10 step 1 — light shifts with the day period.
//
// Replaces StrategicScene's static hemisphere + directional + ambient
// lights with a period-driven config table. State drives the light:
// state.day.period → LIGHTING_BY_PERIOD entry → light args.
//
// Cycle-1 pacing: transitions snap on period change rather than
// interpolate. The period boundaries are minutes apart (a lunch
// service is 3–30 sim-min plus the 15-sec close pause before
// afternoon), so a snap is visible but not jarring. If a future
// order needs smooth dusk / dawn, add a useFrame lerp between the
// current and target configs.
//
// Colour + intensity values chosen to match the ORDER 042 baseline
// at 'lunch' — no regression at full daylight — and shift both
// directions from there. Morning is cooler and higher-sun; dinner
// is warmer and lower-sun; evening dims to a cool blue after close.

import { useMemo } from 'react';
import { useSimState } from '../simulation/SimulationProvider';
import type { DayPeriod } from '../types';

interface LightingConfig {
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  sunColor: string;
  sunIntensity: number;
  sunPosition: [number, number, number];
  ambientIntensity: number;
}

// Lunch mirrors StrategicScene's ORDER 042 values so full daylight
// is unchanged. The other periods depart from that baseline in
// consistent directions.
const LIGHTING_BY_PERIOD: Record<DayPeriod, LightingConfig> = {
  morning: {
    hemiSky: '#f5efdd',
    hemiGround: '#5d6553',
    hemiIntensity: 1.0,
    sunColor: '#ffe6b8',
    sunIntensity: 1.05,
    sunPosition: [260, 420, -60], // east + high
    ambientIntensity: 0.36
  },
  lunch: {
    hemiSky: '#f5efdd',
    hemiGround: '#5d6553',
    hemiIntensity: 0.95,
    sunColor: '#f7ecd0',
    sunIntensity: 1.05,
    sunPosition: [200, 380, 200], // baseline
    ambientIntensity: 0.32
  },
  afternoon: {
    hemiSky: '#f2e4c8',
    hemiGround: '#584d3f',
    hemiIntensity: 0.9,
    sunColor: '#f0d4a0',
    sunIntensity: 1.0,
    sunPosition: [80, 320, 260], // south-west
    ambientIntensity: 0.30
  },
  dinner: {
    hemiSky: '#f0c890',
    hemiGround: '#4a3c2c',
    hemiIntensity: 0.75,
    sunColor: '#e8a878',
    sunIntensity: 0.85,
    sunPosition: [-160, 180, 320], // west + low (golden hour)
    ambientIntensity: 0.26
  },
  evening: {
    hemiSky: '#5a6a80',
    hemiGround: '#25272c',
    hemiIntensity: 0.5,
    sunColor: '#7086a0',
    sunIntensity: 0.45,
    sunPosition: [-100, 90, 220], // west, very low, cool
    ambientIntensity: 0.20
  }
};

export function DayLighting() {
  const sim = useSimState();
  const config = useMemo(() => LIGHTING_BY_PERIOD[sim.day.period], [sim.day.period]);
  return (
    <>
      <hemisphereLight
        args={[config.hemiSky, config.hemiGround, config.hemiIntensity]}
      />
      <directionalLight
        position={config.sunPosition}
        intensity={config.sunIntensity}
        color={config.sunColor}
      />
      <ambientLight intensity={config.ambientIntensity} />
    </>
  );
}
