// ORDER 054 Del B — solar position, pure function.
//
// Standard astronomical approximation good to ~1° in elevation, ~few
// degrees in azimuth. No external dependency. Domain: any lat/lon on
// Earth's surface, any date, any hour of local civil time.
//
// The game does not need aviation-grade accuracy. It needs the sun to
// track the season and the hour so a low winter morning reads as one,
// and a high summer noon reads as another. The low winter sun at
// Grythyttan (~7° at solar noon on Dec 21) is part of the place —
// callers must not clamp elevation to a floor.

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// Day-of-year for a Date, 1 = 1 January. Handles leap years correctly
// via Date's own month roll-over: Jan 1 → 1, Feb 29 (leap year) → 60,
// Dec 31 → 365 or 366.
function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const now = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
  return Math.floor((now - start) / 86_400_000) + 1;
}

export interface SunAngles {
  // Angle above the horizon in degrees. Positive = above; negative =
  // below (sun is down). At the equator on the equinoxes at noon this
  // is ~90°; at Grythyttan on Dec 21 at solar noon it is ~7°.
  elevation: number;
  // Compass bearing of the sun in degrees, measured clockwise from
  // north. 0° = due north, 90° = east, 180° = south, 270° = west.
  // Undefined behaviour when the sun is exactly at zenith (elevation
  // = 90°); at that instant azimuth is meaningless. In practice this
  // never happens above ~23° latitude.
  azimuth: number;
}

/**
 * Sun angles at a given latitude, longitude, date, and local civil
 * time. Returns { azimuth, elevation } in degrees.
 *
 * @param latDeg  Latitude in degrees, positive north.
 * @param lonDeg  Longitude in degrees, positive east.
 * @param date    A Date whose year / month / day give the calendar
 *                date; hour / minute / second are ignored — use
 *                localTimeHours to specify time-of-day.
 * @param localTimeHours  Hour of local civil time (0..24). The
 *                function assumes the caller has already normalised
 *                for the local time zone; DST is on the caller.
 *
 * Verified against control values (see solarPosition.test.ts):
 *   Grythyttan (59.72°N, 14.53°E) summer solstice noon:  ~53.7°
 *   Grythyttan (59.72°N, 14.53°E) winter solstice noon:  ~6.8°
 */
export function solarPosition(
  latDeg: number,
  lonDeg: number,
  date: Date,
  localTimeHours: number
): SunAngles {
  const φ = latDeg * DEG_TO_RAD;
  const n = dayOfYear(date);

  // Solar declination — the tilt of Earth's axis projected onto the
  // Earth-Sun line, varying from +23.45° at June solstice to −23.45°
  // at December solstice. Standard sinusoidal approximation.
  const δ = 23.45 * DEG_TO_RAD * Math.sin(((360 / 365) * (n - 81)) * DEG_TO_RAD);

  // Local solar time — hour angle 0 is solar noon (sun on the local
  // meridian). Correction from local civil time uses only the
  // longitude offset from the nominal time zone meridian; we do NOT
  // apply the equation-of-time (max ±16 min) because this is a
  // gameplay-scale sun, not a sundial. Standard meridian is the
  // longitude of the nominal UTC offset; for Sweden (UTC+1) it is
  // 15°E, so the caller passes the *civil* time and the function
  // corrects for how far east/west of 15°E they are.
  //
  // For arbitrary lat/lon the caller may pass any localTimeHours; we
  // assume that time is measured against the nearest 15°-grid
  // meridian west of the location (Math.round(lonDeg / 15) * 15).
  const standardMeridianDeg = Math.round(lonDeg / 15) * 15;
  const solarTimeHours = localTimeHours + (lonDeg - standardMeridianDeg) / 15;
  const H = (solarTimeHours - 12) * 15 * DEG_TO_RAD;

  // Elevation (α) from the standard spherical-astronomy formula.
  const sinα = Math.sin(φ) * Math.sin(δ) + Math.cos(φ) * Math.cos(δ) * Math.cos(H);
  const α = Math.asin(Math.max(-1, Math.min(1, sinα)));

  // Azimuth (A) measured clockwise from north. atan2 form handles the
  // quadrant automatically and stays stable near noon (where the
  // cosine-form would divide by cos(α) ≈ 0 near the horizon).
  const sinA = -Math.cos(δ) * Math.sin(H);
  const cosA = Math.sin(δ) * Math.cos(φ) - Math.cos(δ) * Math.sin(φ) * Math.cos(H);
  const A = Math.atan2(sinA, cosA);

  // Normalise azimuth to [0, 360).
  let azimuthDeg = A * RAD_TO_DEG;
  if (azimuthDeg < 0) azimuthDeg += 360;

  return {
    elevation: α * RAD_TO_DEG,
    azimuth: azimuthDeg
  };
}

// Coordinates of Grythyttan (59.72°N, 14.53°E) — the game's default
// site. Callers can substitute any lat/lon; these are provided for
// convenience so scene code doesn't hard-code magic numbers.
export const GRYTHYTTAN_LAT = 59.72;
export const GRYTHYTTAN_LON = 14.53;

/**
 * Convert sun angles to a unit-length direction vector pointing FROM
 * the sun TO the ground (i.e. the direction sunlight travels). Useful
 * when placing a `directionalLight` — the light's `position` should
 * sit AT the sun (opposite of this vector, scaled by a large radius).
 *
 * Coordinate frame: right-handed, +X east, +Y up, +Z south. Azimuth
 * 0° (north) points to −Z; azimuth 90° (east) points to +X; azimuth
 * 180° (south) points to +Z.
 */
export function sunDirection(angles: SunAngles): { x: number; y: number; z: number } {
  const elRad = angles.elevation * DEG_TO_RAD;
  const azRad = angles.azimuth * DEG_TO_RAD;
  // Sun's position on the celestial hemisphere (unit vector FROM
  // ground TO sun).
  const sx = Math.cos(elRad) * Math.sin(azRad);
  const sy = Math.sin(elRad);
  // Azimuth 0 = north = −Z; so z = −cos(az) × cos(el).
  const sz = -Math.cos(elRad) * Math.cos(azRad);
  // Direction sunlight TRAVELS = negation of the sun-position vector.
  return { x: -sx, y: -sy, z: -sz };
}
