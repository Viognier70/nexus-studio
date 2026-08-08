// The player-owned business, wired into the strategic scene.
//
// ORDER 042 §3.1: one business, one building. The current pick is
// w869907975 (Candidate A, ~146 m² café-scale, Torget south edge);
// corrected 2026-07-30 from the initial w869907963 (Candidate C,
// 252 m²) pick after the ORDER 041 §6 filter-miss surfaced — see
// world.ts PLAYER_BUSINESS_BUILDING_IDS and APPROXIMATION_REGISTER.
// The business exists before time runs, before scenarios arrive,
// before any investment. State captured here is the minimum the loop
// needs to recognise the building as *yours*.
//
// Session-only. No persistence across reloads yet — LQ-04 (`what is a
// unit of time / does the world run while the player is away`) is
// deliberately unanswered per ORDER 042 §3.2 constraint, and persistence
// would silently answer part of it. Keep the state in memory until an
// order settles the time model.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';

// Initial defaults per ORDER 042 §3.1: "staff as a count and a
// competence level, per EXECUTIVE_DESIGN_DIRECTIVE_001.md §7 — never
// individuals the player commands". Capital + revenue + costs at
// placeholder values until §3.5 investment lands. The building id is
// not stored here — PLAYER_BUSINESS_BUILDING_IDS in content/world.ts
// is the single source of truth; anything that needs the id reads it
// from there.
export interface PlayerBusiness {
  name: string | null;
  staff: {
    count: 2 | 3 | 4;
    training: 0 | 1 | 2 | 3;
  };
  economy: {
    capital: number; // kSEK
    revenueMonthly: number;
    costsMonthly: number;
  };
}

const INITIAL_BUSINESS: PlayerBusiness = {
  name: null,
  staff: { count: 3, training: 1 },
  economy: { capital: 150, revenueMonthly: 0, costsMonthly: 0 }
};

export interface BusinessApi {
  business: PlayerBusiness;
  hasName: boolean;
  setName: (name: string) => void;
}

const BusinessCtx = createContext<BusinessApi | null>(null);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [business, setBusiness] = useState<PlayerBusiness>(INITIAL_BUSINESS);

  const setName = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusiness((prev) => ({ ...prev, name: trimmed }));
  }, []);

  const value = useMemo<BusinessApi>(
    () => ({ business, hasName: business.name !== null, setName }),
    [business, setName]
  );

  return <BusinessCtx.Provider value={value}>{children}</BusinessCtx.Provider>;
}

export function useBusiness(): BusinessApi {
  const ctx = useContext(BusinessCtx);
  if (!ctx) throw new Error('useBusiness must be called inside <BusinessProvider>');
  return ctx;
}
