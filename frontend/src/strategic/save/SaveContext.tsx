// ORDER 263 (Nexus v1 etapp 1) — sparandet i spelet.
//
// Speldesign > Ramar för version 1 > Sparande. Den här kontexten kopplar
// sparmodulen (`src/sim/save.ts`) till spelet:
//   - ett nytt spel tar första lediga plats när spelaren har skrivit in
//     namnet, och dag 1 sparas direkt (med en veckokopia för vecka 1);
//   - autospar vid varje dagsavslut, veckokopia när en ny vecka börjar;
//   - är alla tre platser tagna sparas ingenting automatiskt förrän
//     spelaren själv väljer en plats i menyn (inget skrivs över i tysthet);
//   - laddning ersätter simuleringens tillstånd och verksamhetens namn.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import {
  browserStore,
  clearSlot,
  firstEmptySlot,
  makeSaveFile,
  readSlot,
  readWeeklyCopy,
  savesForDayChange,
  slotNumbers,
  writeSlot,
  writeWeeklyCopy,
  type SaveStore
} from '../../sim/save';
import { useBusiness } from '../business/BusinessContext';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';

export interface SaveApi {
  store: SaveStore | null;
  activeSlot: number | null;
  // Räknas upp vid varje skrivning så att menyn läser om platserna.
  revision: number;
  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  saveTo: (slot: number) => void;
  load: (slot: number, week?: number) => boolean;
  hasAnySave: boolean;
}

const SaveCtx = createContext<SaveApi | null>(null);

export function SaveProvider({ children }: { children: ReactNode }) {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const { business, setName } = useBusiness();
  const [store] = useState<SaveStore | null>(() => browserStore());
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  // Satt av load() så att namnbytet efter en laddning inte räknas som ett nytt spel.
  const loadingRef = useRef(false);
  const prevDayRef = useRef(sim.day.dayNumber);
  const prevNameRef = useRef(business.name);

  const write = useCallback(
    (slot: number, kinds: ('auto' | 'weekly' | 'manual')[]) => {
      if (!store) return;
      for (const kind of kinds) {
        const file = makeSaveFile(sim, business.name, kind);
        if (kind === 'weekly') writeWeeklyCopy(store, slot, file);
        else writeSlot(store, slot, file);
      }
      setRevision((r) => r + 1);
    },
    [store, sim, business.name]
  );

  // Nytt spel: namnet sätts för första gången utan att ett spel laddats.
  useEffect(() => {
    const prev = prevNameRef.current;
    prevNameRef.current = business.name;
    if (prev !== null || business.name === null) return;
    if (loadingRef.current) {
      loadingRef.current = false;
      return;
    }
    if (!store) return;
    const slot = firstEmptySlot(store);
    setActiveSlot(slot);
    if (slot !== null) write(slot, ['auto', 'weekly']);
  }, [business.name, store, write]);

  // Dagsavslut: autospar (och veckokopia när en ny vecka börjar).
  useEffect(() => {
    const prev = prevDayRef.current;
    prevDayRef.current = sim.day.dayNumber;
    if (sim.day.dayNumber < prev) {
      // Spelet nollställdes (RESET) — ett nytt spel utan plats.
      setActiveSlot(null);
      return;
    }
    if (activeSlot === null) return;
    const kinds = savesForDayChange(prev, sim);
    if (kinds.length > 0) write(activeSlot, kinds);
  }, [sim, activeSlot, write]);

  const saveTo = useCallback(
    (slot: number) => {
      if (!store) return;
      if (slot !== activeSlot) clearSlot(store, slot);
      setActiveSlot(slot);
      write(slot, ['manual', 'weekly']);
    },
    [store, activeSlot, write]
  );

  const load = useCallback(
    (slot: number, week?: number) => {
      if (!store) return false;
      const read = week === undefined ? readSlot(store, slot) : readWeeklyCopy(store, slot, week);
      if (read.status !== 'ok') return false;
      loadingRef.current = business.name === null;
      prevDayRef.current = read.file.sim.day.dayNumber;
      dispatch({ type: 'LOAD_STATE', state: read.file.sim });
      if (read.file.businessName) setName(read.file.businessName);
      setActiveSlot(slot);
      // Tillbaka en vecka: platsen fortsätter från veckokopian.
      if (week !== undefined) writeSlot(store, slot, read.file);
      setRevision((r) => r + 1);
      setMenuOpen(false);
      return true;
    },
    [store, dispatch, setName, business.name]
  );

  const hasAnySave = useMemo(
    () => (store ? slotNumbers().some((n) => readSlot(store, n).status !== 'empty') : false),
    // revision: läs om platserna när något sparats.
    [store, revision]
  );

  const value = useMemo<SaveApi>(
    () => ({
      store,
      activeSlot,
      revision,
      menuOpen,
      openMenu: () => setMenuOpen(true),
      closeMenu: () => setMenuOpen(false),
      saveTo,
      load,
      hasAnySave
    }),
    [store, activeSlot, revision, menuOpen, saveTo, load, hasAnySave]
  );

  return <SaveCtx.Provider value={value}>{children}</SaveCtx.Provider>;
}

export function useSave(): SaveApi {
  const ctx = useContext(SaveCtx);
  if (!ctx) throw new Error('useSave must be called inside <SaveProvider>');
  return ctx;
}
