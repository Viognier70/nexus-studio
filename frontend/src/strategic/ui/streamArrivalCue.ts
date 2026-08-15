// ORDER 043 Addendum B §5A.7 — arrival mark for the event stream.
// ORDER 048 §8 — audible + perceptible at 2× / 4× speed.
//
// A short, quiet room-sound played each time a new stream entry
// lands. Not an interface chime, not a notification. Same sound for
// every event per §A.3 — the mark says "something has happened";
// the text says what.
//
// ORDER 048 §8 diagnosis (2026-08-09): the Addendum B cue never
// reached the ear in play. Two causes:
//  1. AudioContext starts suspended in every modern browser until a
//     real user gesture unlocks it. Calling `ctx.resume()` inside a
//     useEffect (as EventStreamPanel did) is fire-and-forget and does
//     not count as the gesture — Safari and Chrome both keep the
//     context suspended. Fix: install a one-shot document-level
//     listener that unlocks on the FIRST pointerdown/keydown/touchstart
//     and never fires again.
//  2. Peak gain 0.06 is inaudible over any ambient room sound. Bumped
//     to 0.14 (still a "tap" not a "chime") and shifted the second
//     oscillator up so the mark has a bit of brightness that reads at
//     low volume.
//
// The unlock listener is safe to install unconditionally: if the
// context is never used (setStreamCueEnabled(false)), the listener
// still fires but ensureContext just returns null → no-op.

let audioContext: AudioContext | null = null;
let unlockInstalled = false;
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

// Install a one-shot unlock — the first real user gesture on the
// page resumes the audio context. Safe to call repeatedly; the
// listener registers only once.
function installUnlock(): void {
  if (unlockInstalled) return;
  if (typeof window === 'undefined') return;
  unlockInstalled = true;
  const unlock = () => {
    const ctx = ensureContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    window.removeEventListener('touchstart', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: false });
  window.addEventListener('keydown', unlock, { once: false });
  window.addEventListener('touchstart', unlock, { once: false });
}

// Call once from the app's mount to install the unlock listener.
// The old lazy-on-first-play path stays as a fallback for callers
// that don't run this.
export function primeStreamAudio(): void {
  installUnlock();
}

export function setStreamCueEnabled(v: boolean): void {
  enabled = v;
  // Nothing to eagerly close — the AudioContext stays warm; enabled
  // gates only whether playCue produces sound.
}

// Play one arrival cue. Safe to call from useEffect; if no audio
// context is available (SSR, blocked, or older browsers) it silently
// no-ops. Envelope: two overlapping sine tones (180 + 320 Hz), 8 ms
// attack, 240 ms decay. Louder than the ORDER 043 Addendum B
// version — still a room-tap, not a chime.
export function playStreamArrivalCue(): void {
  if (!enabled) return;
  installUnlock();   // defensive — first call installs the listener
  const ctx = ensureContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    // Fire and forget; if the unlock listener hasn't caught a
    // gesture yet, resume will silently fail here.
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.14, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.240);
  gain.connect(ctx.destination);

  const oscA = ctx.createOscillator();
  oscA.type = 'sine';
  oscA.frequency.setValueAtTime(180, now);
  oscA.connect(gain);
  oscA.start(now);
  oscA.stop(now + 0.25);

  const oscB = ctx.createOscillator();
  oscB.type = 'sine';
  oscB.frequency.setValueAtTime(320, now);   // shifted from 260 for brightness
  const gainB = ctx.createGain();
  gainB.gain.setValueAtTime(0.6, now);
  oscB.connect(gainB).connect(gain);
  oscB.start(now);
  oscB.stop(now + 0.25);
}
