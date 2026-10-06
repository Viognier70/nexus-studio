// ORDER 308c — byns mark i öppningen (Anders 2026-10-06: under öppningen
// följer marken Designs grönare ton, skarmar/1280x720/; spelets mark efteråt
// är oförändrad).
//
// Designs skärmar av byn har en mörk, grönaktig mark under kvällsljuset.
// Spelets mark (terrängen, OsmTerrain.tsx; landytorna, OsmDistricts.tsx; och
// gårdarnas mjuka ytor, OsmYardSurfaces.tsx) är sandfärgad och gråbrun, och
// läses som brun i öppningens varma ljus. Medan öppningen spelas blandas
// markens färger mot OPENING_GROUND.colour med andelen OPENING_GROUND.mix
// (lite av markens egen variation blir kvar). Vägar, hus och tak ändras inte.
//
// Värdena är uppmätta: scripts/order308-check.mjs tar skärmarna,
// scripts/order308c-mark.mjs jämför markens färg med Designs
// (reports/order308c/mark.json).

import { useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { tintColour } from '../content/world';
import { openingStage, subscribeOpeningStage } from './openingStage';

export const OPENING_GROUND = {
  /** Markens färg under öppningen (albedo, före ljuset). */
  colour: '#5c8c7c',
  /** Andelen av OPENING_GROUND.colour i markens färg (0 = spelets, 1 = bara öppningens). */
  mix: 0.8
} as const;

/** Markens färg under öppningen, ur spelets färg (hex). */
export function openingGroundColour(hex: string): string {
  return tintColour(hex, OPENING_GROUND.colour, OPENING_GROUND.mix);
}

/**
 * Samma blandning för terrängens färger per hörn (three.js linjära 0–1, som
 * THREE.Color lagrar dem), på plats.
 */
export function openingGroundRgb(rgb: Float32Array): Float32Array {
  const { r: tr, g: tg, b: tb } = new THREE.Color(OPENING_GROUND.colour);
  const k = OPENING_GROUND.mix;
  for (let i = 0; i < rgb.length; i += 3) {
    rgb[i] = rgb[i] * (1 - k) + tr * k;
    rgb[i + 1] = rgb[i + 1] * (1 - k) + tg * k;
    rgb[i + 2] = rgb[i + 2] * (1 - k) + tb * k;
  }
  return rgb;
}

/** Öppningen spelas, så marken ska ha öppningens färg. */
export function openingGroundActive(): boolean {
  return openingStage().active;
}

/** För markens komponenter: true bara medan öppningen spelas. */
export function useOpeningGround(): boolean {
  return useSyncExternalStore(subscribeOpeningStage, openingGroundActive, openingGroundActive);
}
