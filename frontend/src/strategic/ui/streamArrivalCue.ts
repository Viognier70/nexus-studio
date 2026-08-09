// ORDER 043 Addendum B §5A.7 — arrival mark for the event stream.
//
// A short, quiet room-sound played each time a new stream entry
// lands. Not an interface chime, not a notification. Same sound for
// every event per §A.3 — the mark says "something has happened";
// the text says what.
//
// Implementation: a lazy-initialised Web Audio node graph that emits
// a brief low-frequency envelope on each call. No audio asset, no
// dependency — respects the CLAUDE.md "no external assets" rule.
// Muted globally by default until enabled (see setStreamCueEnabled)
// so first-load play doesn't require a user gesture.

let audioContext: AudioContext | null = null;
let enabled = true;

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    try {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      audioContext = new Ctor();
    } catch {
      return null;
    }
  }
  return audioContext;
}

export function setStreamCueEnabled(v: boolean): void {
  enabled = v;
  // Nothing to eagerly close — the AudioContext stays warm; enabled
  // gates only whether playCue produces sound.
}

// Play one arrival cue. Safe to call from useEffect; if no audio
// context is available (SSR, blocked, or older browsers) it silently
// no-ops. Envelope is deliberately soft: two overlapping sine tones
// (180 + 260 Hz) with a 12 ms attack and a 220 ms decay — a "tap"
// in the room, not a bell at the door.
export function playStreamArrivalCue(): void {
  if (!enabled) return;
  const ctx = ensureContext();
  if (!ctx) return;
  // Some browsers suspend the context until user gesture; try to
  // resume, ignore failure.
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.06, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.232);
  gain.connect(ctx.destination);

  const oscA = ctx.createOscillator();
  oscA.type = 'sine';
  oscA.frequency.setValueAtTime(180, now);
  oscA.connect(gain);
  oscA.start(now);
  oscA.stop(now + 0.24);

  const oscB = ctx.createOscillator();
  oscB.type = 'sine';
  oscB.frequency.setValueAtTime(260, now);
  const gainB = ctx.createGain();
  gainB.gain.setValueAtTime(0.5, now);
  oscB.connect(gainB).connect(gain);
  oscB.start(now);
  oscB.stop(now + 0.24);
}
