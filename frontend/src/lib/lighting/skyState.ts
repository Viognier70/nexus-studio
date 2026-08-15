// ORDER 057 Del B — shared sky-state readable by any scene component
// that needs to react to the sun's position without threading the
// solar calculation everywhere.
//
// SunLightRig writes the current sun elevation on every render (it
// already has the value from its useMemo on hour + date). Consumers
// read via `skyState.elevation` inside their own useFrame or a
// throttled interval. A derived `nightFactor` (0 = daylight, 1 =
// deep night) is computed from the elevation so downstream code can
// blend directly against it.
//
// The write is a module-level mutation, not React state — flipping
// per-frame would trigger re-renders across the whole scene tree.
// Consumers that need React-visible values run their own poll (e.g.
// via useFrame throttle) and only setState when the value crosses
// a threshold.

interface SkyState {
  // Sun angle above the horizon, in degrees. Positive = above,
  // negative = below.
  elevation: number;
  // Blend factor: 0 above ~3°, ramps to 1 by −3°. Callers multiply
  // their night-only effects (window emissives, moonlight tint) by
  // this to fade cleanly across the twilight band.
  nightFactor: number;
}

const state: SkyState = {
  elevation: 45,      // sensible default before first sun update
  nightFactor: 0
};

export const skyState: Readonly<SkyState> = new Proxy(state, {
  set() {
    throw new Error('skyState is read-only; use writeSkyState() to update');
  }
}) as Readonly<SkyState>;

// Twilight band — the sun is treated as "setting" between +3° and −3°
// elevation, giving a smooth 6° window for the night blend rather
// than a hard cutoff at zero.
const TWILIGHT_UPPER_DEG = 3;
const TWILIGHT_LOWER_DEG = -3;

export function writeSkyState(elevationDeg: number): void {
  state.elevation = elevationDeg;
  if (elevationDeg >= TWILIGHT_UPPER_DEG) {
    state.nightFactor = 0;
  } else if (elevationDeg <= TWILIGHT_LOWER_DEG) {
    state.nightFactor = 1;
  } else {
    // Linear ramp across the twilight band.
    const t = (TWILIGHT_UPPER_DEG - elevationDeg) /
              (TWILIGHT_UPPER_DEG - TWILIGHT_LOWER_DEG);
    state.nightFactor = t;
  }
}
