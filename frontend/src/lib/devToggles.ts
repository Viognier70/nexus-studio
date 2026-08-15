// ORDER 056 Del A — dev-only global toggles shared across scenes.
//
// Not React state — a mutable module object with a subscribe-notify
// pattern so any component (Canvas child or DOM overlay) can read the
// current value and be notified when it flips. Keeps the toggle
// mechanism outside React's per-scene state trees.
//
// All toggles here are read only in dev builds; production tree-
// shakes the reads via `import.meta.env.DEV` guards at the call site.

export type SeasonKey = 'autumn' | 'summer';

interface DevToggleState {
  season: SeasonKey;
}

type Listener = (state: DevToggleState) => void;

const state: DevToggleState = {
  season: 'autumn'   // ORDER 054 default — 25 Sep autumn calibration.
};

const listeners = new Set<Listener>();

export const devToggles = {
  get season(): SeasonKey {
    return state.season;
  },
  setSeason(next: SeasonKey): void {
    if (state.season === next) return;
    state.season = next;
    for (const l of listeners) l({ ...state });
  },
  toggleSeason(): void {
    devToggles.setSeason(state.season === 'autumn' ? 'summer' : 'autumn');
  },
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  }
};

// Canonical UTC dates for the two seasons the toggle compares. Autumn
// = 25 Sep (ORDER 054 reference); summer = 21 Jun (solstice, longest
// day, ORDER 054 Del B control value).
export const SEASON_DATE: Record<SeasonKey, Date> = {
  autumn: new Date(Date.UTC(2026, 8, 25)),
  summer: new Date(Date.UTC(2026, 5, 21))
};
