// ORDER 323 §6 (Anders 2026-10-09: "människor i byn går med gångrörelse (inte
// glidande) och stannar ibland … Inget står stilla och glider").
//
// Gatans figurer är instansade (en matris per figur och del), så riggen i
// figureRig.ts går inte att använda. Benen ritas i stället som två egna
// instanser per figur, vänster och höger, med höften som led. Benens sving
// räknas ur sträckan figuren gått (fasen = meter / steglängd), så att fötterna
// följer marken; står figuren still står benen raka.
//
// ORDER 325 — Designs D11: de närmaste ritas med riggen och gatans sex gångsätt (streetGaits.ts); de här
// instanserna gäller för resten.

import * as THREE from 'three';

export const STREET_GAIT = {
  /** Meter per hel gångcykel (två steg) vid figurens egen storlek 1. */
  cycleM: 1.4,
  /** Benens största vinkel fram och bak (radianer). */
  swingRad: 0.42,
  /** Högst så många cykler per sekund; snabbare figurer (byns kvällsklocka) glider hellre lite än sprättar. */
  maxHz: 2.2,
  /** Hur fort benen går till och från vila när figuren stannar eller går (per sekund). */
  blendPerS: 6,
  /** Studsen i kroppen per steg (meter vid storlek 1). */
  bobM: 0.025
} as const;

/** Benets geometri: en cylinder från höften (y = 0) ned till foten (y = −length). */
export function streetLegGeometry(radius: number, length: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(radius, radius * 0.9, length, 6);
  g.translate(0, -length / 2, 0);
  return g;
}

/**
 * Nästa gångfas: `walkedM` meter sedan förra bilden i figurens skala.
 * Fasen räknas i cykler (1 = två steg).
 */
export function advanceGait(phase: number, walkedM: number, scale: number, dt: number): number {
  const cycles = walkedM / (STREET_GAIT.cycleM * Math.max(0.2, scale));
  return phase + Math.min(Math.abs(cycles), STREET_GAIT.maxHz * dt);
}

/** Benets vinkel (radianer, framåt positiv) för vänster (side −1) eller höger (side 1) ben. */
export function legSwing(phase: number, side: -1 | 1, moving: number): number {
  return Math.sin(phase * Math.PI * 2) * STREET_GAIT.swingRad * moving * side;
}

/** Kroppens studs (meter vid storlek 1): två studsar per cykel, noll när figuren står. */
export function gaitBob(phase: number, moving: number): number {
  return Math.abs(Math.sin(phase * Math.PI * 2)) * STREET_GAIT.bobM * moving;
}

/** Närmar `moving` (0 står, 1 går) mot målet. */
export function easeMoving(current: number, walking: boolean, dt: number): number {
  const target = walking ? 1 : 0;
  const k = Math.min(1, dt * STREET_GAIT.blendPerS);
  return current + (target - current) * k;
}

const _q = new THREE.Quaternion();
const _qx = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _Y = new THREE.Vector3(0, 1, 0);
const _X = new THREE.Vector3(1, 0, 0);

/**
 * Benets matris: höften vid (x, groundY + hipY·scale, z), `halfGap` meter åt
 * sidan (i figurens ram, +z framåt), vriden `yaw` och svängd `swing` kring höftens axel.
 */
export function composeLeg(out: THREE.Matrix4, x: number, groundY: number, z: number, yaw: number, side: -1 | 1, swing: number, scale: number, hipY: number, halfGap: number): THREE.Matrix4 {
  const ox = side * halfGap * scale;
  _p.set(x + Math.cos(yaw) * ox, groundY + hipY * scale, z - Math.sin(yaw) * ox);
  _q.setFromAxisAngle(_Y, yaw);
  // Framåt är +z: ett positivt sving för foten framåt, alltså en vridning kring −x.
  _qx.setFromAxisAngle(_X, -swing);
  _q.multiply(_qx);
  _s.setScalar(scale);
  return out.compose(_p, _q, _s);
}
