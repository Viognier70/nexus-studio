// ORDER 333 C — byn i sommarskrud (avsnitt 8 punkt 3: "Säsongen är sommar, och byn ska se ut som sommar: grönska,
// ljus och folk på gatan. Hösten blir säsong två, senare."). Simuleringens säsong är redan sommaren (balance.ts
// DISTRICTS: vecka 1 midsommar, vecka 8 kräftskivan); här är det som syns. Hösten är kvar som DEV-växeln J
// (lib/devToggles.ts) och som Designs kvällshimmel (villageEvening.ts SKY).
// Talen är Codes val tills Design levererar en sommarkväll; D15:s sommar (kvarterRita.js SEASON.summer: marken
// #4e5a33, kronorna gröna, färre tända fönster) är förebilden.
import { useEffect, useState } from 'react';
import { devToggles, type SeasonKey } from '../../lib/devToggles';
import type { SkyKey } from './villageEvening';

/**
 * Sommarkvällens himmel efter kvällens gång e (samma form som villageEvening.ts SKY). Servicen går 18–23, och i
 * Grythyttan går solen ned omkring 22 i början av sommaren: kvällen börjar i eftermiddagsljus (e 0), har
 * solnedgången mot slutet (e 0,6) och slutar i en ljus sommarnatt (e 1), ljusare än höstens skymning (SKY e 0).
 * "moon" är solen och sedan nattens ljus, som i SKY.
 */
export const SUMMER_SKY: SkyKey[] = [
  { e: 0, bg: '#a7c0dc', hemiSky: '#f6efe0', hemiGround: '#5f6c44', hemi: 6.4, moon: '#ffe6b8', moonI: 3.0, lake: '#4f7fae', exposure: 1.25 },
  { e: 0.6, bg: '#d9b994', hemiSky: '#ffe0c0', hemiGround: '#55613c', hemi: 5.6, moon: '#ffc488', moonI: 2.6, lake: '#6a84b0', exposure: 1.28 },
  { e: 1, bg: '#93a2c8', hemiSky: '#d4d2ee', hemiGround: '#4a5438', hemi: 4.9, moon: '#f4d2a8', moonI: 2.0, lake: '#4f6a98', exposure: 1.32 }
];

/** Markens färger på sommaren (OsmTerrain.tsx): grönare bete, torrt hö i stället för bar jord. Höstens står där. */
export const SUMMER_GROUND = { base: '#5f7f48', dry: '#7f8450', moss: '#527046', peat: '#455234', gravel: '#a89f88' } as const;

/** Folk på gatan: fler gående i byn och fler sällskap i kvarteren en sommarkväll (OsmPedestrians, districtStreet). */
export const SUMMER_STREET = { walkersK: 1.6 } as const;

/** Säsongen som syns: sommaren, eller hösten när DEV-växeln J är slagen (devToggles). */
export function useVisibleSeason(): SeasonKey {
  const [season, setSeason] = useState<SeasonKey>(() => devToggles.season);
  useEffect(() => devToggles.subscribe((s) => setSeason(s.season)), []);
  return season;
}
