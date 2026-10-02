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

// Designs LJUDEN.md (leveransen rätt, fel och pyramiden 2026-09-30): åtta
// ljud i C-dur, material före syntar, nivåerna mot rummets sorl (0 dB).
// Gränssnittet −6 till −10 dB, rummets ljud −14 till −22 dB. Ljud som
// upprepas får ±3 % tonhöjd och ±2 dB. Aldrig två av samma sort inom 250 ms.

const db = (d: number) => Math.pow(10, d / 20);
const jitter = (x: number, share: number) => x * (1 + (Math.random() * 2 - 1) * share);

// En ton med kort anslag och mjukt slut.
function tone(c: AudioContext, freq: number, at: number, decay: number, peak: number, type: OscillatorType = 'sine', glideTo?: number, dest?: AudioNode): void {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, at + decay);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  o.connect(g).connect(dest ?? master!);
  o.start(at);
  o.stop(at + decay + 0.05);
}

// En klocka: grundton med deltoner på 2,76 × och 5,4 × (LJUDEN.md §3).
function bell(c: AudioContext, freq: number, at: number, decay: number, peak: number): void {
  tone(c, freq, at, decay, peak);
  tone(c, freq * 2.76, at, decay * 0.6, peak * 0.35);
  tone(c, freq * 5.4, at, decay * 0.35, peak * 0.15);
}

function noiseBurst(c: AudioContext, at: number, dur: number, peak: number, filter: BiquadFilterType, freq: number, q = 1, sweepTo?: number): void {
  const n = c.createBufferSource();
  n.buffer = noiseBuffer(c, dur + 0.05, 'white');
  const f = c.createBiquadFilter();
  f.type = filter;
  f.frequency.setValueAtTime(freq, at);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, at + dur);
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(peak, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  n.connect(f).connect(g).connect(master!);
  n.start(at);
  n.stop(at + dur + 0.05);
}

function noiseBuffer(c: AudioContext, seconds: number, kind: 'white' | 'pink'): AudioBuffer {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const d = b.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'white') { d[i] = w; continue; }
    // Rosa brus (Paul Kellets förenklade filter).
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
  }
  return b;
}

export type Sfx = 'right' | 'wrong' | 'floor' | 'full' | 'guestIn' | 'pay' | 'passed' | 'clink' | 'overtake';

const lastPlayed: Partial<Record<Sfx, number>> = {};
// Aldrig två av samma sort inom 250 ms; gäster in högst ett var fjärde sekund.
const MIN_GAP_S: Record<Sfx, number> = { right: 0.25, wrong: 0.25, floor: 0.25, full: 0.25, guestIn: 4, pay: 0.25, passed: 0.25, clink: 0.25, overtake: 2 };

// Våningarnas toner: C5, E5, G5 (episteme, techne, phronesis).
const FLOOR_HZ = [523, 659, 784];

export function play(sfx: Sfx, level = 0): void {
  const c = ready();
  if (!c) return;
  const now = c.currentTime;
  if (now - (lastPlayed[sfx] ?? -Infinity) < MIN_GAP_S[sfx]) return;
  lastPlayed[sfx] = now;
  switch (sfx) {
    case 'right': {
      // E5 och G♯5 70 ms senare, triangel; oktaven över i sinus; en glimt.
      const v = db(-8);
      tone(c, 659, now, 0.38, v, 'triangle');
      tone(c, 831, now + 0.07, 0.42, v, 'triangle');
      tone(c, 1662, now + 0.07, 0.35, v * 0.25);
      tone(c, 2637, now + 0.1, 0.12, v * 0.15);
      break;
    }
    case 'wrong': {
      // A3 och G♯3 120 ms senare genom lågpass; en mjuk duns i trä.
      const v = db(-9);
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 850;
      lp.connect(master!);
      tone(c, 220, now, 0.3, v, 'triangle', undefined, lp);
      tone(c, 208, now + 0.12, 0.34, v, 'triangle', undefined, lp);
      tone(c, 120, now, 0.18, v * 0.8, 'sine', 78);
      break;
    }
    case 'floor': {
      // Häll-ljud (brus genom bandpass som sveper uppåt) och en liten klocka.
      const v = db(-10);
      noiseBurst(c, now, 0.52, v * 0.6, 'bandpass', 400, 3, 1800);
      bell(c, FLOOR_HZ[Math.max(0, Math.min(2, level))], now + 0.42, 1.3, v);
      break;
    }
    case 'full': {
      // Klockor C5 E5 G5 C6, en varm matta och ett tunt skimmer.
      const v = db(-7);
      [523, 659, 784, 1047].forEach((f, i) => bell(c, f, now + i * 0.09, 1.4, v));
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1200;
      lp.connect(master!);
      for (const f of [262, 330, 392]) {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sawtooth';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(v * 0.12, now + 0.4);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
        o.connect(g).connect(lp);
        o.start(now);
        o.stop(now + 2.3);
      }
      noiseBurst(c, now + 0.2, 0.9, v * 0.05, 'highpass', 5000);
      break;
    }
    case 'guestIn': {
      // Klick i låset och mässingsklockan ovanför dörren.
      const v = jitter(db(-18), 0.25);
      noiseBurst(c, now, 0.02, v, 'highpass', 2000);
      bell(c, jitter(1760, 0.03), now + 0.03, 1, v);
      break;
    }
    case 'pay': {
      // Ett kvitto som rivs av och en träknack.
      const v = jitter(db(-22), 0.25);
      noiseBurst(c, now, 0.04, v, 'bandpass', 3000, 2);
      tone(c, jitter(620, 0.03), now + 0.02, 0.07, v, 'sine');
      break;
    }
    case 'overtake': {
      // ORDER 296 — omkörningen i bandet: kassan i svagare form (Designs §4).
      const v = jitter(db(-30), 0.25);
      noiseBurst(c, now, 0.04, v, 'bandpass', 3000, 2);
      tone(c, jitter(620, 0.03), now + 0.02, 0.07, v, 'sine');
      break;
    }
    case 'passed': {
      // En handklocka på E6 två gånger och en kassalåda som stängs.
      const v = db(-9);
      bell(c, 1319, now, 1.4, v);
      bell(c, 1319, now + 0.2, 1.4, v);
      tone(c, 92, now + 0.4, 0.22, v, 'sine', 70);
      break;
    }
    case 'clink': {
      // Två tunna vinglas med svävning.
      const v = jitter(db(-18), 0.25);
      noiseBurst(c, now, 0.01, v, 'highpass', 4000);
      for (const f of [2400, 2412, 3180]) tone(c, jitter(f, 0.01), now, 1.2, v * 0.5);
      for (const f of [2470, 2481, 3290]) tone(c, jitter(f, 0.01), now + 0.03, 1, v * 0.45);
      break;
    }
  }
}

// Rummets sorl (LJUDEN.md §8): rosa brus genom bandpass på 700 Hz och
// lågpass på 3 kHz, med nivån modulerad långsamt. Tätheten följer gästerna
// (0 gäster tyst, 40 eller fler full bädd). Dämpas 6 dB när raketkortet är öppet.
let murmur: { src: AudioBufferSourceNode; gain: GainNode; lfo: OscillatorNode } | null = null;
let duck = 1;

export function setMurmur(guests: number, rocketOpen = false): void {
  const c = context();
  if (!c || !master) return;
  duck = rocketOpen ? db(-6) : 1;
  const density = Math.max(0, Math.min(1, guests / 40));
  const target = settings.enabled && c.state === 'running' ? density * db(0) * 0.5 * duck : 0;
  if (!murmur && target > 0) {
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 6, 'pink');
    src.loop = true;
    const band = c.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 700;
    band.Q.value = 0.7;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3000;
    const gain = c.createGain();
    gain.gain.value = 0;
    const mod = c.createGain();
    mod.gain.value = 1;
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.3;
    const lfoDepth = c.createGain();
    lfoDepth.gain.value = 0.25;
    lfo.connect(lfoDepth).connect(mod.gain);
    src.connect(band).connect(lp).connect(mod).connect(gain).connect(master);
    src.start();
    lfo.start();
    murmur = { src, gain, lfo };
  }
  if (murmur) murmur.gain.gain.setTargetAtTime(target, c.currentTime, rocketOpen ? 0.13 : 0.4);
}
