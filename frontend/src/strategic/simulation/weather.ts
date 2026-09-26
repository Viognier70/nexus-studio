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
import { WEATHER } from '../../sim/balance';

// -------- generation ------------------------------------------------------

// ORDER 269 — banden och vikterna står i src/sim/balance.ts WEATHER.
const TEMP_BANDS = WEATHER.tempBands;
const WIND_BANDS = WEATHER.windBands;
const PRECIP_WEIGHTS = WEATHER.precipWeights as readonly { kind: PrecipitationKind; weight: number }[];
const CLOUD_WEIGHTS = WEATHER.cloudWeights as readonly { kind: CloudCover; weight: number }[];

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
  if (tempC < WEATHER.outdoorMinTempC) return false;
  if (windMS > WEATHER.outdoorMaxWindMS) return false;
  return true;
}

// -------- arrival multiplier ---------------------------------------------

// Combined weather multiplier applied to arrivalProbability. Ranges:
//   cold + blustery + drizzle → ~0.55×
//   mild + breezy + clear     → ~1.00×
//   warm + still + clear      → ~1.28×
export function weatherArrivalMultiplier(w: WeatherConditions | null): number {
  if (!w) return 1;
  // ORDER 269 — faktorerna står i balance.ts WEATHER.arrival.
  const a = WEATHER.arrival;
  const tempT = Math.max(0, Math.min(1, (w.tempC - a.tempColdC) / (a.tempWarmC - a.tempColdC)));
  const tempMult = a.tempMultCold + tempT * a.tempMultSpan;
  const windT = Math.max(0, Math.min(1, (w.windMS - a.windStillMS) / (a.windBlusteryMS - a.windStillMS)));
  const windMult = 1.0 - windT * a.windMultSpan;
  const precipMult =
    w.precipitation === 'none' ? a.precipMult.none :
    w.precipitation === 'drizzle' ? a.precipMult.drizzle :
    w.precipitation === 'rain' ? a.precipMult.rain :
    a.precipMult.other;
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
