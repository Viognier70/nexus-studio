// ORDER 293 — typerna för Designs handelserManus.js (leverans 3), inkopierad
// oförändrad. Manusen är rena funktioner av varianten och ger teatern
// skådespelarna, rekvisitan, effekterna och takterna (kameran, strålkastaren,
// kortet). Spelas av eventTheatre.ts.

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

export interface ScriptEvent {
  type: string;
  at?: number | string;
  nth?: number;
  dt?: number;
  hand?: 'L' | 'R';
  prop?: string;
  to?: [string, 'L' | 'R'] | 'L' | 'R';
  onto?: string;
  on?: boolean;
  pos?: Vec3;
  yaw?: number;
  surface?: number | string;
  put?: Vec2;
}

export interface ScriptStep {
  clip: string;
  until?: number;
  dur?: number;
  times?: number;
  tempo?: 'calm' | 'normal' | 'stressed';
  path?: Vec2[];
  speed?: number;
  seat?: string;
  look?: string | Vec2;
  face?: number;
  side?: number;
  hand?: 'L' | 'R';
  seated?: boolean;
  keep?: 'L' | 'R' | 'both' | 'trayL';
  ctx?: Record<string, unknown>;
  ev?: ScriptEvent[];
}

export interface ScriptActor {
  kind: 'guest' | 'staff';
  look: string;
  hm?: number;
  pos?: Vec2;
  yaw?: number;
  start?: number;
  stand?: number;
  steps: ScriptStep[];
}

export interface ScriptProp {
  type: string;
  at?: Vec3;
  hand?: [string, 'L' | 'R'];
  on?: [string, number, number];
  yaw?: number;
  hidden?: boolean;
  fill?: boolean;
  follow?: string;
  offset?: Vec2;
}

export interface ScriptView { tx: number; ty: number; tz: number; dist: number; yaw: number; pitch: number; rate?: number }

export interface ScriptBeats {
  cam: Array<{ t: number; v?: ScriptView; follow?: string; dist?: number; rate?: number }>;
  spot: Array<{ t: number; who: string | null }>;
  card: Array<{ t: number; step: number; ph: 'ask' | 'right' | 'wrong' | 'off' }>;
  chapters: Array<{ t: number; key: string }>;
}

export interface EventScript {
  set: 'winebar';
  roomOpts?: { mood: string };
  tempo?: 'calm' | 'normal' | 'stressed';
  end: number;
  props: Record<string, ScriptProp>;
  actors: Record<string, ScriptActor>;
  effects: Array<Record<string, unknown> & { type: string; t?: number }>;
  beats: ScriptBeats;
}

type Build = (C: unknown, variant: string) => EventScript;
export const birthday: Build;
export const vase: Build;
export const drunk: Build;
export const inspection: Build;
export const kitchen: Build;
export function propFalls(C: unknown): EventScript;
export const EVENTS: ReadonlyArray<{ id: string; build: Build; variants: readonly string[] }>;
