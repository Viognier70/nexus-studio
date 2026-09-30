// ORDER 290 — ljudet (Vision Owner 2026-09-30): "Ljud, skapat i webbläsaren
// (Web Audio) och utan ljudfiler med okänd licens: rätt svar, fel svar, en
// våning som fylls, full pyramid, en ny gäst som kommer in, kassan som tar
// betalt, klirr när gäster skålar, och ett sorl i rummet som stiger med
// trycket. Ljudet ska gå att stänga av och ställa in, och det ska vara lågt
// som standard."
//
// Allt ljud byggs med oscillatorer och brus i Web Audio, genom en
// huvudvolym. Inställningen (på eller av, och volymen) sparas i sidan
// (localStorage) som språket och animationerna. Webbläsaren släpper fram
// ljud först efter spelarens första klick eller tangent.

import { useSyncExternalStore } from 'react';

export const SOUND_KEY = 'nexus.sound';
// Lågt som standard.
export const DEFAULT_VOLUME = 0.25;

export interface SoundSettings { enabled: boolean; volume: number }

function readStored(): SoundSettings {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(SOUND_KEY) : null;
    if (raw) {
      const v = JSON.parse(raw) as Partial<SoundSettings>;
      return { enabled: v.enabled !== false, volume: typeof v.volume === 'number' ? Math.max(0, Math.min(1, v.volume)) : DEFAULT_VOLUME };
    }
  } catch { /* privat läge eller spärrad lagring: förvalet gäller */ }
  return { enabled: true, volume: DEFAULT_VOLUME };
}

let settings: SoundSettings = readStored();
const listeners = new Set<() => void>();

export function soundSettings(): SoundSettings { return settings; }

export function setSound(next: Partial<SoundSettings>): void {
  settings = { ...settings, ...next };
  try { window.localStorage.setItem(SOUND_KEY, JSON.stringify(settings)); } catch { /* ingen lagring */ }
  if (master && ctx) master.gain.setTargetAtTime(settings.enabled ? settings.volume : 0, ctx.currentTime, 0.05);
  for (const l of listeners) l();
}

export function useSoundSettings(): SoundSettings {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => settings, () => settings);
}

// ---------------------------------------------------------------------
// Web Audio
// ---------------------------------------------------------------------

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let unlockInstalled = false;

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = settings.enabled ? settings.volume : 0;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  return ctx;
}

export function installSoundUnlock(): void {
  if (unlockInstalled || typeof window === 'undefined') return;
  unlockInstalled = true;
  const unlock = () => {
    const c = context();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  window.addEventListener('touchstart', unlock);
}

function ready(): AudioContext | null {
  if (!settings.enabled || settings.volume <= 0) return null;
  const c = context();
  if (!c || c.state !== 'running' || !master) return null;
  return c;
}

// En ton med kort anslag och mjukt slut.
function tone(c: AudioContext, freq: number, at: number, dur: number, peak: number, type: OscillatorType = 'sine', glideTo?: number): void {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(master!);
  o.start(at);
  o.stop(at + dur + 0.05);
}

function noiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    // Brunt brus: mjukare än vitt.
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.5;
  }
  return b;
}

export type Sfx = 'right' | 'wrong' | 'level' | 'full' | 'guestIn' | 'pay' | 'clink';

const lastPlayed: Partial<Record<Sfx, number>> = {};
// Samma ljud tätare än så här slås ihop (kassan en fredag).
const MIN_GAP_S: Record<Sfx, number> = { right: 0.2, wrong: 0.2, level: 0.1, full: 0.5, guestIn: 0.6, pay: 0.35, clink: 0.5 };

export function play(sfx: Sfx, level = 0): void {
  const c = ready();
  if (!c) return;
  const now = c.currentTime;
  if (now - (lastPlayed[sfx] ?? -Infinity) < MIN_GAP_S[sfx]) return;
  lastPlayed[sfx] = now;
  switch (sfx) {
    case 'right':
      tone(c, 660, now, 0.18, 0.35, 'triangle');
      tone(c, 990, now + 0.09, 0.28, 0.3, 'triangle');
      break;
    case 'wrong':
      tone(c, 220, now, 0.32, 0.35, 'sawtooth', 150);
      tone(c, 196, now + 0.02, 0.3, 0.2, 'square', 140);
      break;
    case 'level': {
      // Våningen fylls: en stigande ton, högre ju högre våning.
      const base = [523, 659, 784][Math.max(0, Math.min(2, level))];
      tone(c, base, now, 0.22, 0.3, 'sine', base * 1.5);
      break;
    }
    case 'full':
      [523, 659, 784, 1047].forEach((f, i) => tone(c, f, now + i * 0.09, 0.4, 0.3, 'triangle'));
      break;
    case 'guestIn':
      tone(c, 880, now, 0.5, 0.12, 'sine');
      tone(c, 1318, now + 0.12, 0.6, 0.08, 'sine');
      break;
    case 'pay': {
      const n = c.createBufferSource();
      n.buffer = noiseBuffer(c, 0.08);
      const g = c.createGain();
      g.gain.setValueAtTime(0.25, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      n.connect(g).connect(master!);
      n.start(now);
      tone(c, 1568, now + 0.05, 0.25, 0.16, 'triangle');
      tone(c, 2093, now + 0.1, 0.3, 0.12, 'triangle');
      break;
    }
    case 'clink':
      tone(c, 2637, now, 0.35, 0.1, 'sine');
      tone(c, 3136, now + 0.04, 0.3, 0.08, 'sine');
      break;
  }
}

// Sorlet: brus genom ett bandpass, med volymen efter trycket i rummet (0–1).
let murmur: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

export function setMurmur(pressure: number): void {
  const c = context();
  if (!c || !master) return;
  const target = settings.enabled && c.state === 'running' ? Math.max(0, Math.min(1, pressure)) * 0.22 : 0;
  if (!murmur && target > 0) {
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 4);
    src.loop = true;
    const band = c.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 420;
    band.Q.value = 0.8;
    const gain = c.createGain();
    gain.gain.value = 0;
    src.connect(band).connect(gain).connect(master);
    src.start();
    murmur = { src, gain };
  }
  if (murmur) murmur.gain.gain.setTargetAtTime(target, c.currentTime, 0.8);
}
