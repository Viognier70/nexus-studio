type EngineState = {
  ctx: AudioContext;
  master: GainNode;
  wind: AudioBufferSourceNode;
  running: boolean;
  birdTimer: number | null;
};

let engine: EngineState | null = null;

function createNoiseBuffer(ctx: AudioContext, seconds = 3): AudioBuffer {
  const rate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, Math.floor(rate * seconds), rate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function scheduleBird(state: EngineState) {
  if (!state.running) return;
  const { ctx, master } = state;
  const count = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const start = ctx.currentTime + 0.05 + i * (0.08 + Math.random() * 0.14);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const base = 1500 + Math.random() * 1800;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base, start);
    osc.frequency.exponentialRampToValueAtTime(
      base * (0.55 + Math.random() * 0.7),
      start + 0.13
    );
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.05, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.19);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + 0.24);
  }
}

type WindowWithLegacyAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export const ambience = {
  async start(muted: boolean): Promise<void> {
    if (engine?.running) return;
    if (typeof window === 'undefined') return;
    const legacyWin = window as WindowWithLegacyAudio;
    const AudioCtxCtor = window.AudioContext ?? legacyWin.webkitAudioContext;
    if (!AudioCtxCtor) return;

    let ctx: AudioContext;
    try {
      ctx = new AudioCtxCtor();
      await ctx.resume();
    } catch {
      return;
    }

    const master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);

    const wind = ctx.createBufferSource();
    wind.buffer = createNoiseBuffer(ctx, 3);
    wind.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 380;
    windFilter.Q.value = 0.5;

    const windGain = ctx.createGain();
    windGain.gain.value = 0.35;

    wind.connect(windFilter).connect(windGain).connect(master);
    wind.start();

    const state: EngineState = {
      ctx,
      master,
      wind,
      running: true,
      birdTimer: null
    };
    engine = state;

    const tick = () => {
      if (!engine?.running) return;
      scheduleBird(engine);
      engine.birdTimer = window.setTimeout(
        tick,
        4000 + Math.random() * 9000
      );
    };
    tick();
  },
  setMuted(muted: boolean): void {
    if (!engine) return;
    const { ctx, master } = engine;
    const target = muted ? 0 : 0.55;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.3);
  },
  stop(): void {
    if (!engine) return;
    engine.running = false;
    if (engine.birdTimer !== null) {
      window.clearTimeout(engine.birdTimer);
    }
    try {
      engine.wind.stop();
    } catch {
      // ignore double-stop
    }
    engine.ctx.close().catch(() => {
      // ignore close failure
    });
    engine = null;
  }
};
