import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
  type Dispatch
} from 'react';
import type { SimAction, SimulationState } from '../types';
import { DEFAULT_SEED, makeInitialState } from './model';
import { reducer } from './reducer';
import { harnessParams } from '../testHarness/urlParams';
import { capacityForBusiness } from '../business/businessClass';

// TEMPORÄR dev-shortcut (Vision Owner-begäran 2026-08-16): tillämpa
// `#playtest=1&business=<klass>` på initial-state:t. Sätter både
// businessClass och policies.capacity via capacityForBusiness så
// downstream sim-lagret får konsistenta värden. Ingen permanent
// koppling; hör till dev-verktygsraden tills en riktig ny-spel-flow
// bygg (senare order).
function applyDevBusinessOverride(state: SimulationState): SimulationState {
  const override = harnessParams.business;
  if (!override) return state;
  if (override === state.businessClass) return state;
  return {
    ...state,
    businessClass: override,
    policies: {
      ...state.policies,
      capacity: capacityForBusiness(override, state.policies.staffCount)
    }
  };
}

// ORDER 090 §5 — exported so the scene-mount smoke test can wrap
// InteriorStaff / InteriorGuests in a hand-crafted state (one team
// member + one guest) without ticking a real reducer forward. Not
// intended for production callers — use `SimulationProvider`.
export const SimStateCtx = createContext<SimulationState | null>(null);
export const SimDispatchCtx = createContext<Dispatch<SimAction> | null>(null);

interface Props {
  children: ReactNode;
  seed?: number;
}

const TICK_HZ = 5;
const TICK_MS = 1000 / TICK_HZ;

export function SimulationProvider({ children, seed = DEFAULT_SEED }: Props) {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    applyDevBusinessOverride(makeInitialState(seed))
  );
  const speedRef = useRef(state.speed);
  speedRef.current = state.speed;

  // ORDER 083 — dev-only hooks for the pitch-probe measurement.
  // Publishes the dispatch and current state on window so a headless
  // playwright probe can seed the sim to mid-service before taking
  // camera-pose screenshots. Not for gameplay; tree-shakes at prod
  // build time via the import.meta.env.DEV guard.
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    (window as unknown as { __nxSimDispatch?: unknown }).__nxSimDispatch = dispatch;
    (window as unknown as { __nxSimState?: unknown }).__nxSimState = state;
  }

  useEffect(() => {
    let cancelled = false;
    let acc = 0;
    let lastAt = performance.now();

    function loop(now: number) {
      if (cancelled) return;
      const elapsed = now - lastAt;
      lastAt = now;
      const mult = speedRef.current;
      if (mult > 0) {
        acc += elapsed * mult;
        while (acc >= TICK_MS) {
          dispatch({ type: 'TICK', dt: 1 / TICK_HZ });
          acc -= TICK_MS;
        }
      } else {
        acc = 0;
      }
      raf = requestAnimationFrame(loop);
    }
    let raf = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  const value = useMemo(() => state, [state]);

  return (
    <SimStateCtx.Provider value={value}>
      <SimDispatchCtx.Provider value={dispatch}>{children}</SimDispatchCtx.Provider>
    </SimStateCtx.Provider>
  );
}

export function useSimState(): SimulationState {
  const s = useContext(SimStateCtx);
  if (!s) throw new Error('useSimState called outside SimulationProvider');
  return s;
}

export function useSimDispatch(): Dispatch<SimAction> {
  const d = useContext(SimDispatchCtx);
  if (!d) throw new Error('useSimDispatch called outside SimulationProvider');
  return d;
}
