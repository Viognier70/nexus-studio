// ORDER 054 Del C — day-period lighting via SunLightRig.
//
// The whole lighting rig (sun colour + intensity + sky sun position +
// hemisphere ambient) is derived from the sun's position in the sky
// via `solarPosition()`. We no longer hand-author RGB triples per
// period; instead we hand the rig an hour-of-day appropriate to each
// game period and the astronomy does the rest.
//
// The hour choices are calibrated to autumn Grythyttan, where the
// game is set. In autumn (equinox → early October) the sun rises
// around 06:30, peaks around 12:30 at ~30° elevation, and sets around
// 18:30. The "dinner" and "evening" periods therefore land in dusk /
// deep dusk / night territory — which is the reading we want (a
// warm, low sun in dinner, a nearly-set sun in evening).

import { useEffect, useMemo, useState } from 'react';
import { useSimState } from '../simulation/SimulationProvider';
import { SunLightRig } from '../../lib/lighting/SunLightRig';
import { devToggles, SEASON_DATE, type SeasonKey } from '../../lib/devToggles';
import type { DayPeriod } from '../types';

// Hour-of-day per game period. Local civil time. Autumn-calibrated
// so the sun tracks the season the game is set in.
const HOUR_BY_PERIOD: Record<DayPeriod, number> = {
  morning:   8.0,   // low warm sun in the east
  lunch:    12.5,   // near solar noon
  afternoon: 15.0,  // sun descending
  dinner:   18.5,   // grazing, warm — start of golden hour in autumn
  evening:  21.5    // below horizon in autumn — night lighting
};

// Village-scale fog range. Fog starts far out (1 km) so nothing
// mid-distance gets washed, and hits full attenuation at 3.6 km so
// the fog envelope sits inside the sky sphere.
const STRATEGIC_FOG_RANGE: [number, number] = [1000, 3600];

// Small dev-only subscriber hook — reads the current season and
// re-renders when the toggle flips. Tree-shakes cleanly in prod (the
// module is imported but the subscription runs only after mount).
function useDevSeason(): SeasonKey {
  const [season, setSeason] = useState<SeasonKey>(() => devToggles.season);
  useEffect(() => devToggles.subscribe((s) => setSeason(s.season)), []);
  return season;
}

export function DayLighting() {
  const sim = useSimState();
  const hour = useMemo(() => HOUR_BY_PERIOD[sim.day.period], [sim.day.period]);
  // ORDER 056 Del A — season is a dev-toggle (default autumn = 25 Sep
  // per ORDER 054). Summer selects 21 Jun for comparison. Non-dev
  // builds always read 'autumn' (the module default).
  const season = useDevSeason();
  const date = SEASON_DATE[season];
  return (
    <SunLightRig
      hourOfDay={hour}
      date={date}
      fogRange={STRATEGIC_FOG_RANGE}
    />
  );
}
