// ORDER 045 — the evening's weather.
//
// Generated deterministically at OPEN_SERVICE from the rng state so
// the same seed + same open sequence yields the same evening. The
// weather is a reading: warm and still lifts arrivals; cold and
// windy drops them; precipitation drops them further. Outdoor
// terrace viability is a small derived predicate the opening panel
// uses to name the evening (a warm still evening with the terrace
// open reads differently from a cold windy one indoors only).
//
// Cycle-1 season: late-summer / early-autumn Grythyttan. Temperatures
// in the 8–22 °C range, wind 0–10 m/s, precipitation rare (occasional
// drizzle or short rain). No snow this cycle — Grythyttan snow starts
// in November and the game hasn't grown a calendar yet.
//
// The weather also feeds the wager's reading (Vision Owner 2026-08-08:
// "en varm kväll med tunn bemanning är en annan risk än en kall") —
// see WagerPanel for the surfaced text.

import type {
  CloudCover,
  PrecipitationKind,
  WeatherConditions
} from '../types';
import type { Rng } from '../util/rng';

// -------- generation ------------------------------------------------------

// Weighted temperature bands for a cycle-1 autumn evening. Weights sum
// to 10 for readability; rng.next() * 10 picks a band.
const TEMP_BANDS: readonly { min: number; max: number; weight: number }[] = [
  { min:  6, max:  9, weight: 1 },   // cold evening — 10 %
  { min: 10, max: 13, weight: 3 },   // cool         — 30 %
  { min: 14, max: 17, weight: 4 },   // mild         — 40 %
  { min: 18, max: 21, weight: 2 }    // warm         — 20 %
];

// Wind: three bands from still to blustery. Grythyttan is inland,
// rarely windier than 12 m/s in autumn.
const WIND_BANDS: readonly { min: number; max: number; weight: number }[] = [
  { min: 0.5, max:  2.0, weight: 4 },   // still     — 40 %
  { min: 2.0, max:  5.5, weight: 4 },   // breezy    — 40 %
  { min: 5.5, max: 10.0, weight: 2 }    // blustery  — 20 %
];

// Precipitation is unusual on any given evening; when it happens the
// distribution favours drizzle over rain.
const PRECIP_WEIGHTS: readonly { kind: PrecipitationKind; weight: number }[] = [
  { kind: 'none',    weight: 7 },
  { kind: 'drizzle', weight: 2 },
  { kind: 'rain',    weight: 1 }
];

const CLOUD_WEIGHTS: readonly { kind: CloudCover; weight: number }[] = [
  { kind: 'clear',    weight: 3 },
  { kind: 'partly',   weight: 4 },
  { kind: 'overcast', weight: 3 }
];

function pickWeighted<T extends { weight: number }>(
  rng: Rng,
  bands: readonly T[]
): T {
  let total = 0;
  for (const b of bands) total += b.weight;
  const roll = rng.next() * total;
  let cumulative = 0;
  for (const b of bands) {
    cumulative += b.weight;
    if (roll < cumulative) return b;
  }
  return bands[bands.length - 1];
}

export function generateWeather(rng: Rng): WeatherConditions {
  const tempBand = pickWeighted(rng, TEMP_BANDS);
  const windBand = pickWeighted(rng, WIND_BANDS);
  const precipBand = pickWeighted(rng, PRECIP_WEIGHTS);
  const cloudBand = pickWeighted(rng, CLOUD_WEIGHTS);

  const tempC = Math.round(tempBand.min + rng.next() * (tempBand.max - tempBand.min));
  const windMS = +(windBand.min + rng.next() * (windBand.max - windBand.min)).toFixed(1);

  return {
    tempC,
    windMS,
    precipitation: precipBand.kind,
    cloudCover: cloudBand.kind,
    outdoorViable: isOutdoorViable(tempC, windMS, precipBand.kind)
  };
}

// -------- outdoor viability ----------------------------------------------

// Outdoor terrace makes sense when it's warm-ish, not too windy, and
// dry. Numbers tuned for autumn evenings; a future order can adjust
// as seasons come in.
export function isOutdoorViable(
  tempC: number,
  windMS: number,
  precip: PrecipitationKind
): boolean {
  if (precip !== 'none') return false;
  if (tempC < 14) return false;
  if (windMS > 5.5) return false;
  return true;
}

// -------- arrival multiplier ---------------------------------------------

// Combined weather multiplier applied to arrivalProbability. Ranges:
//   cold + blustery + drizzle → ~0.55×
//   mild + breezy + clear     → ~1.00×
//   warm + still + clear      → ~1.28×
export function weatherArrivalMultiplier(w: WeatherConditions | null): number {
  if (!w) return 1;
  // Temperature: linear from 0.75× at 6 °C to 1.20× at 21 °C.
  const tempT = Math.max(0, Math.min(1, (w.tempC - 6) / (21 - 6)));
  const tempMult = 0.75 + tempT * 0.45;
  // Wind: 1.0× at 0.5 m/s down to 0.75× at 10 m/s.
  const windT = Math.max(0, Math.min(1, (w.windMS - 0.5) / (10 - 0.5)));
  const windMult = 1.0 - windT * 0.25;
  // Precipitation: dry 1.0×, drizzle 0.9×, rain 0.75×, snow 0.65×.
  const precipMult =
    w.precipitation === 'none' ? 1.0 :
    w.precipitation === 'drizzle' ? 0.9 :
    w.precipitation === 'rain' ? 0.75 :
    0.65;
  return tempMult * windMult * precipMult;
}

// -------- waiting-at-opening ---------------------------------------------

// How many people are already outside when the doors are about to
// open. Derived from reputation × weather so a strong reputation on
// a warm still evening produces a small standing queue. Capped so
// the number never exceeds an interior capacity's worth of pressure.
const WAITING_AT_OPENING_BASE = 8;   // guests at rep = 1.0, ideal weather
const WAITING_AT_OPENING_MAX = 6;

export function waitingAtOpeningCount(
  reputation: number,
  weather: WeatherConditions | null
): number {
  const rep = Math.max(0, Math.min(1, reputation));
  const wm = weatherArrivalMultiplier(weather);
  const raw = WAITING_AT_OPENING_BASE * rep * wm;
  return Math.min(WAITING_AT_OPENING_MAX, Math.max(0, Math.round(raw)));
}
