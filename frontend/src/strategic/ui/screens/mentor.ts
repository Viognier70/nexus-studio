// ORDER 271 — mentorn på skärmarna M1 och M2 (paket 1, skarmar 01 och 04).
//
// Mentorns repliker och när de gäller är oförändrade från ORDER 267
// (sim/introduction.ts introductionStep, strings.introduction): övning,
// prov, banken och avskedet efter namnet. Nytt är formen: varje nytt
// steg visas först som mentorns skärm (M1, porträtt och dialogruta), och
// "Nästa" lägger den åt sidan så att repliken står kvar som en rad i
// morgonens schema (S1). "Hoppa över guiden" tar bort skärmarna för
// resten av sessionen; raden i schemat står kvar.
//
// M2: vid den första servicen efter introduktionen pekar mentorn på
// raketkortet och mätarna (action-knappen är borttagen, ORDER 270).
//
// Tillståndet gäller sessionen, som `sawIntroduction` gjorde i
// MentorPanel: en laddad sparfil får varken avskedet eller M2.

import { useEffect, useSyncExternalStore } from 'react';
import { strings } from '../../../content/strings.sv';
import { introductionStep, type IntroductionStep } from '../../../sim/introduction';
import { useBusiness } from '../../business/BusinessContext';
import { useSimState } from '../../simulation/SimulationProvider';

export type MentorStep = IntroductionStep | 'farewell' | 'service';

// Stegen som räknas i "1 av 4" (M1).
export const MENTOR_STEPS: readonly MentorStep[] = ['practice', 'exam', 'bank', 'farewell'];

interface MentorMemory {
  acknowledged: ReadonlySet<MentorStep>;
  skipped: boolean;
  sawIntroduction: boolean;
  farewellDone: boolean;
  serviceDone: boolean;
}

let memory: MentorMemory = {
  acknowledged: new Set(),
  skipped: false,
  sawIntroduction: false,
  farewellDone: false,
  serviceDone: false
};
const listeners = new Set<() => void>();

function update(patch: Partial<MentorMemory>): void {
  memory = { ...memory, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export interface MentorView {
  step: MentorStep | null;
  line: string | null;
  // 1..4 för stegen i MENTOR_STEPS, annars null.
  index: number | null;
  // Mentorns egen skärm (M1) eller kortet i servicen (M2) visas.
  showScreen: boolean;
  next: () => void;
  skip: () => void;
  closeFarewell: () => void;
  closeService: () => void;
}

export function useMentor(): MentorView {
  const sim = useSimState();
  const { hasName } = useBusiness();
  const m = useSyncExternalStore(subscribe, () => memory, () => memory);
  const intro = introductionStep(sim);
  const period = sim.day.period;

  useEffect(() => {
    if (intro !== null && !memory.sawIntroduction) update({ sawIntroduction: true });
  }, [intro]);
  // Avskedet försvinner när kvällen börjar (som i ORDER 267).
  useEffect(() => {
    if (period !== 'morning' && memory.sawIntroduction && !memory.farewellDone) update({ farewellDone: true });
  }, [period]);

  let step: MentorStep | null = null;
  if (intro !== null) step = intro;
  else if (m.sawIntroduction && hasName && !m.farewellDone && period === 'morning') step = 'farewell';
  else if (m.sawIntroduction && !m.serviceDone && (period === 'dinner' || period === 'lunch') && sim.economy.businessClass !== null) {
    step = 'service';
  }
  if (sim.pavilionVisit !== null) step = null;

  const t = strings.introduction;
  const line = step === null
    ? null
    : step === 'farewell'
      ? t.farewell
      : step === 'service'
        ? strings.screens.mentor.service
        : t.steps[step];
  const i = step ? MENTOR_STEPS.indexOf(step) : -1;
  const showScreen = step !== null && !m.skipped && (step === 'farewell' || step === 'service' || !m.acknowledged.has(step));

  return {
    step,
    line,
    index: i >= 0 ? i + 1 : null,
    showScreen,
    next: () => {
      if (step && step !== 'farewell' && step !== 'service') update({ acknowledged: new Set([...memory.acknowledged, step]) });
    },
    skip: () => update({ skipped: true }),
    closeFarewell: () => update({ farewellDone: true }),
    closeService: () => update({ serviceDone: true })
  };
}
