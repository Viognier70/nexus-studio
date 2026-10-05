// ORDER 308b — öppningens eget ljus (Anders 2026-10-05: ljuset i öppningen ska
// nå Designs ljusstyrka, med eget ljus bara medan öppningen spelas; spelets
// kvällsljus efteråt är oförändrat).
//
// Byn ritas av spelets kvällsljus (village/EveningLighting.tsx), vars palett-
// faktor (paletteScale) är kalibrerad mot Designs kvällsbilder kl. 19.30 för
// servicen. Designs skärmar av öppningen (skarmar/1280x720/) är ljusare: före
// 308b nådde spelet 0,58–0,83 av Designs medelluminans
// (reports/order308b/ljus.json, before). Förstärkningen här läggs ovanpå
// kvällsljuset, bara när DayLighting ritar öppningen (useOpeningLight ger null
// annars):
//   - light: halvklotets ljus (och månens andel, som följer det), per avstånd;
//   - exposure: exponeringen.
// Värdena är uppmätta: scripts/order308-check.mjs tar skärmarna,
// scripts/order308b-ljus.mjs jämför dem med Designs (reports/order308b/ljus.json).
//
// Vinbarens två scener (openingBar.ts) har egna dukar och eget ljus; deras
// exponering höjs med BAR_EXPOSURE_GAIN.

import { useSyncExternalStore } from 'react';
import { openingStage, subscribeOpeningStage } from './openingStage';

export interface OpeningLightGain {
  /** Gånger halvklotets ljus (kvällsljusets LL). */
  light: number;
  /** Gånger exponeringen. */
  exposure: number;
}

/** Förstärkningen på kamerans avstånd, från långt bort till nära (logaritmiskt mellan punkterna). */
export const OPENING_LIGHT_GAIN: Array<{ dist: number } & OpeningLightGain> = [
  { dist: 660, light: 3.0, exposure: 1.45 },
  { dist: 120, light: 2.6, exposure: 1.35 },
  { dist: 48, light: 3.0, exposure: 1.5 },
  { dist: 38, light: 1.5, exposure: 1.05 },
  { dist: 24, light: 1.5, exposure: 1.05 }
];

/** Vinbarens scener i öppningen: exponeringen gånger det här (teaterns 1,3). */
export const BAR_EXPOSURE_GAIN = 1.6;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Öppningens förstärkning på avståndet d (meter). */
export function openingLightGain(d: number): OpeningLightGain {
  const G = OPENING_LIGHT_GAIN;
  if (d >= G[0].dist) return { light: G[0].light, exposure: G[0].exposure };
  const last = G[G.length - 1];
  if (d <= last.dist) return { light: last.light, exposure: last.exposure };
  let i = 0;
  while (i < G.length - 2 && d < G[i + 1].dist) i++;
  const k = clamp(Math.log(G[i].dist / d) / Math.log(G[i].dist / G[i + 1].dist), 0, 1);
  return { light: lerp(G[i].light, G[i + 1].light, k), exposure: lerp(G[i].exposure, G[i + 1].exposure, k) };
}

export interface OpeningLight {
  /** Kvällens e under öppningen. */
  e: number;
  /** Byns ljusnivå (manusets VILLAGE_LIGHT_LEVEL). */
  level: number;
  gain: (d: number) => OpeningLightGain;
}

/** Öppningens ljus medan den spelas, annars null (då gäller spelets eget ljus). */
export function openingLight(): OpeningLight | null {
  const s = openingStage();
  return s.active ? { e: s.e, level: s.light, gain: openingLightGain } : null;
}

// useSyncExternalStore kräver samma värde mellan två läsningar utan ändring.
let cacheKey = '';
let cache: OpeningLight | null = null;
function snapshot(): OpeningLight | null {
  const s = openingStage();
  const key = s.active ? `${s.e}|${s.light}` : '';
  if (key !== cacheKey) { cacheKey = key; cache = openingLight(); }
  return cache;
}

/** Öppningens ljus för byns scen (DayLighting); null när öppningen inte spelas. */
export function useOpeningLight(): OpeningLight | null {
  return useSyncExternalStore(subscribeOpeningStage, snapshot, snapshot);
}
