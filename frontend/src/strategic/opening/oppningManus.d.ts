// ORDER 308 — typerna för Designs oppningManus.js (leveransen 2026-10-04,
// öppningen, omtag), inkopierad oförändrad. Manuset är data: bilderna,
// svärtan, texten, nålarna, kvällen, byns kamera, Åsa (D6, ORDER 317) och de två
// scenerna i vinbaren (emptyBar, glimpses). Spelas av OpeningSequence.tsx.

import type { EventScript, ScriptView } from '../scene/events/handelserManus';

export type OpeningLayer = 'village' | 'empty' | 'glimpse' | 'black';
export interface OpeningShot { id: string; t: number; layer: OpeningLayer; fade: number }
export interface OpeningText { key: string; from: number; to: number; fadeIn: number; fadeOut: number }
export interface OpeningPin extends OpeningText { id: 'venue' | 'mentor'; y: number; stemCqh: number }
export interface OpeningView { tx: number; ty: number; tz: number; dist: number; yaw: number; pitch: number; fov: number }
export interface MentorKey { dist: number; pitch: number; side: number; lead?: number }
export interface VillageCamKey { t: number; v?: OpeningView; frame?: number; mentor?: MentorKey; ease?: string }
export interface BarCamKey { t: number; v: OpeningView; ease?: string }
export interface OpeningScene extends Omit<EventScript, 'beats'> {
  cam: BarCamKey[];
  dim?: number;
}

export const END: number;
export const VILLAGE_LIGHT_LEVEL: number;
export const SHOTS: OpeningShot[];
export const BLACK: Array<{ t: number; k: number }>;
export const TEXT: OpeningText[];
export const CAPTIONS: OpeningText[];
export const PINS: OpeningPin[];
export const PIN_STYLE: { ring: string; ringPx: number; dotCqh: number; glow: string; labelCqh: number; label: string };
export const EVENING: Array<{ t: number; e: number }>;
export const VILLAGE_CAM: VillageCamKey[];
// ORDER 317 — D6: Intendent Åsa i Ingrids ställe (who, greetAt, greetYaw i stället för garment).
export const MENTOR: { who: 'asa'; place: string; outM: number; along: number; scale: number; clip: string; glanceAt: number; greetAt: number; greetYaw: number };
export function emptyBar(): OpeningScene;
export const GLIMPSE_T0: number;
export function glimpses(): OpeningScene;
export type { ScriptView };
