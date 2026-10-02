// @vitest-environment jsdom
//
// ORDER 271 — Designs paket 6: raketkortet (R1–R3), mätarna, kvällens
// lärdom (L1) och kvällsberättelsen (K1), rutan utan verksamhet (X1).
// Tillstånden byggs med spelets egen reducer; bara useSimState/useSimDispatch
// byts mot en fast state och en spion.

import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { SimulationState } from '../../../types';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false, media: query, onchange: null,
      addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false
    })
  });
});

const sim = vi.hoisted(() => ({ state: null as SimulationState | null, dispatch: vi.fn() }));
vi.mock('../../../simulation/SimulationProvider', () => ({
  useSimState: () => sim.state,
  useSimDispatch: () => sim.dispatch
}));

import { reducer } from '../../../simulation/reducer';
import { makeNewGameState } from '../../../simulation/model';
import { changeClass, minimumStakeSek } from '../../../../sim/economy';
import { firstDayOfWeek } from '../../../../sim/calendar';
import { INCIDENTS } from '../../../../sim/balance';
import { incidentById } from '../../../../sim/incidentBank';
import { lessonFor, rankedStepOption, type IncidentRecord } from '../../../../sim/incidents';
import { strings } from '../../../../content/strings';
import { IncidentCard, ServiceMeters } from '../../../scenario/IncidentPanel';
import { setServiceDrawerOpen } from '../serviceDrawer';

// ORDER 290 — serviceläget: panelerna visas när spelaren öppnat dem.
setServiceDrawerOpen(true);
import { EveningBar } from '../../../scenario/EveningBar';
import { NoBusinessBox } from '../../../economy/NoBusinessBox';
import { cellsFor, deltaSteps, pickLessonIndex, rocketCounter, METER_EMPHASIS_MS } from '../serviceView';
import { stocked } from '../../../testHarness/stocked';

afterEach(() => {
  cleanup();
  sim.dispatch.mockReset();
  vi.useRealTimers();
});

const TICK = { type: 'TICK', dt: 0.2 } as const;
function tick(s: SimulationState, n: number): SimulationState {
  for (let i = 0; i < n; i++) s = reducer(s, TICK);
  return s;
}

function wineBarService(): SimulationState {
  let s = makeNewGameState(7);
  s = { ...s, medals: { stensota: 'brons', metodkoket: 'brons', kalastorget: 'brons' }, speed: 2 };
  s = { ...s, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
  return reducer(stocked(s), { type: 'START_SERVICE' });
}

function answer(s: SimulationState, rank: 'best' | 'worst' = 'best'): SimulationState {
  const a = s.incidents.active!;
  const step = incidentById('vinbar', a.id)!.steps[a.step];
  return reducer(s, { type: 'ANSWER_INCIDENT', optionId: rankedStepOption(step, rank, a.struck, a.situation) });
}

function openNow(s: SimulationState, id: string): SimulationState {
  s = { ...s, incidents: { ...s.incidents, slots: [{ at: s.simTime, phase: 'rush' }, ...s.incidents.slots], queued: [id] } };
  if (!s.day.doorsOpenedThisService) s = tick(s, 700);
  for (let i = 0; i < 2000 && s.incidents.active?.id !== id; i++) {
    if (s.incidents.active) s = answer(s);
    s = reducer(s, TICK);
  }
  // ORDER 286a — raketen börjar i rummet: figurens klipp spelas innan kortet
  // öppnas och stegets klocka går.
  for (let i = 0; i < 2000 && (s.incidents.active?.introLeft ?? 0) > 0; i++) s = reducer(s, TICK);
  return s;
}

const byTestId = (c: HTMLElement, id: string) => c.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

describe('ORDER 271 — det gränssnittet läser (serviceView)', () => {
  it('rutnätets celler: klarat före fallet, fel där, inte nått efter', () => {
    expect(cellsFor({ step: null }, 3)).toEqual(['cleared', 'cleared', 'cleared']);
    expect(cellsFor({ step: 1 }, 3)).toEqual(['cleared', 'failed', 'unreached']);
    expect(cellsFor({ step: 0 }, 3)).toEqual(['failed', 'unreached', 'unreached']);
  });

  it('lärdomen hämtas ur det tidigaste steget, och vid lika steg den första raketen', () => {
    expect(pickLessonIndex([{ step: null, at: 1 }])).toBeNull();
    expect(pickLessonIndex([{ step: 2, at: 1 }, { step: 1, at: 5 }, { step: null, at: 9 }])).toBe(1);
    expect(pickLessonIndex([{ step: 1, at: 7 }, { step: 1, at: 3 }])).toBe(1);
  });

  it('ett svar som inte fyller ett helt steg syns ändå som ett steg', () => {
    const s = wineBarService();
    expect(deltaSteps(s, { cashSek: 0, satisfaction: -0.02, stamina: 0.26, reputation: 0 })).toEqual({ cash: 0, satisfaction: -1, stamina: 3 });
  });
});

describe('ORDER 271 — raketkortet (R1–R3)', () => {
  it('R1: vem och var, stegrutorna, nedräkningen och tangenterna 1–4', () => {
    const s = openNow(wineBarService(), 'vb09-getosten');
    sim.state = s;
    const { container } = render(<IncidentCard />);
    const card = byTestId(container, 'incident-card')!;
    expect(card.getAttribute('data-mode')).toBe('ask');
    expect(card.getAttribute('data-step')).toBe('0');
    expect(card.getAttribute('data-step-axis')).toBe('episteme');
    expect(byTestId(container, 'incident-step-episteme')!.getAttribute('data-state')).toBe('current');
    expect(byTestId(container, 'incident-step-techne')!.getAttribute('data-state')).toBe('ahead');
    expect(byTestId(container, 'incident-countdown')!.textContent).toBe(String(Math.ceil(s.incidents.active!.secondsLeft)));
    const { n } = rocketCounter(s);
    // ORDER 289 — en raket ur kön är en följd och står utanför räkningen.
    // ORDER 296c — "Raket n i kväll" (rummet utlöser raketerna; inget antal i förväg).
    expect(card.textContent).toContain(s.incidents.active!.chained ? strings.rocket.card.followUp : strings.rocket.card.rocketN(String(Math.max(1, n))));
    fireEvent.keyDown(window, { key: '3' });
    const third = incidentById('vinbar', 'vb09-getosten')!.steps[0].options[2].id;
    expect(sim.dispatch).toHaveBeenCalledWith({ type: 'ANSWER_INCIDENT', optionId: third });
  });

  it('R2: rätt svar visas i stunden, sedan öppnas nästa steg', () => {
    const s = reducer(openNow(wineBarService(), 'vb09-getosten'), { type: 'ANSWER_INCIDENT', optionId: 'c' });
    sim.state = s;
    const { container, rerender } = render(<IncidentCard />);
    const card = byTestId(container, 'incident-card')!;
    expect(card.getAttribute('data-mode')).toBe('right');
    expect(card.getAttribute('data-step')).toBe('0');
    expect(byTestId(container, 'incident-option-c')!.getAttribute('data-look')).toBe('chosen');
    expect(byTestId(container, 'incident-option-a')!.getAttribute('data-look')).toBe('dim');
    expect((byTestId(container, 'incident-option-a') as HTMLButtonElement).disabled).toBe(true);
    expect(byTestId(container, 'incident-step-techne')!.getAttribute('data-state')).toBe('next');
    expect(byTestId(container, 'incident-band')!.textContent).toContain(strings.rocket.card.right(strings.service.incident.stepName.techne));
    // Under visningen svarar tangenterna inte.
    fireEvent.keyDown(window, { key: '1' });
    expect(sim.dispatch).not.toHaveBeenCalled();
    sim.state = tick(s, Math.ceil(INCIDENTS.revealSeconds / 0.1) + 2);
    rerender(<IncidentCard />);
    expect(byTestId(container, 'incident-card')!.getAttribute('data-mode')).toBe('ask');
    expect(byTestId(container, 'incident-card')!.getAttribute('data-step')).toBe('1');
  });

  it('R3: fel svar streckas, det rätta fylls, personalen tar över, och kortet stängs efter 2,4 s', () => {
    vi.useFakeTimers();
    const open = openNow(wineBarService(), 'vb09-getosten');
    sim.state = open;
    const { container, rerender } = render(<IncidentCard />);
    const after = reducer(open, { type: 'ANSWER_INCIDENT', optionId: 'a' });
    sim.state = after;
    rerender(<IncidentCard />);
    const card = byTestId(container, 'incident-card')!;
    expect(card.getAttribute('data-mode')).toBe('wrong');
    expect(byTestId(container, 'incident-option-a')!.getAttribute('data-look')).toBe('wrong');
    expect(byTestId(container, 'incident-option-c')!.getAttribute('data-look')).toBe('correct');
    expect(byTestId(container, 'incident-step-episteme')!.getAttribute('data-state')).toBe('failed');
    expect(byTestId(container, 'incident-step-phronesis')!.getAttribute('data-state')).toBe('unreached');
    const role = after.incidents.lastOutcome!.takeover!.role;
    const word = strings.service.incident.staffRoles[role];
    expect(byTestId(container, 'incident-band')!.textContent).toContain(strings.rocket.card.wrong(word));
    act(() => { vi.advanceTimersByTime(INCIDENTS.revealSeconds * 1000 + 10); });
    expect(byTestId(container, 'incident-card')).toBeNull();
  });
});

describe('ORDER 271 — mätarna', () => {
  // ORDER 290 — Designs serviceläget §3: kassans mätare utgår (kvällskassan
  // ersätter den); Rummet har gästernas och personalens mätare.
  it('två mätare med tio steg, som växer efter ett svar och blir vanliga efter 3,2 s', () => {
    vi.useFakeTimers();
    const open = openNow(wineBarService(), 'vb09-getosten');
    sim.state = open;
    const { container, rerender } = render(<ServiceMeters />);
    for (const id of ['meter-satisfaction', 'meter-stamina']) {
      expect(byTestId(container, id)!.getAttribute('data-value')).not.toBeNull();
      expect(byTestId(container, id)!.querySelectorAll('.nx-step')).toHaveLength(10);
    }
    expect(byTestId(container, 'meter-cash')).toBeNull();
    expect(byTestId(container, 'service-meters')!.getAttribute('data-emph')).toBe('false');
    sim.state = reducer(open, { type: 'ANSWER_INCIDENT', optionId: 'a' });
    rerender(<ServiceMeters />);
    expect(byTestId(container, 'service-meters')!.getAttribute('data-emph')).toBe('true');
    act(() => { vi.advanceTimersByTime(METER_EMPHASIS_MS + 10); });
    expect(byTestId(container, 'service-meters')!.getAttribute('data-emph')).toBe('false');
  });
});

describe('ORDER 271 — kvällens lärdom (L1) och kvällsberättelsen (K1)', () => {
  function evening(): SimulationState {
    const s = wineBarService();
    const ctx = { table: 3, guestIds: [], guest: 'ett par', wine: 'Chablis', staff: 'servitören', clock: '20.10' };
    const log: IncidentRecord[] = [
      { id: 'vb01-korken', step: null, optionId: 'b', quality: 'best', situation: null, context: ctx, at: 10 },
      { id: 'vb09-getosten', step: 2, optionId: 'a', quality: 'wrong', situation: null, context: { ...ctx, clock: '21.00' }, at: 20 },
      { id: 'vb02-rosen', step: 1, optionId: null, quality: 'staff', situation: null, context: { ...ctx, clock: '21.35' }, at: 30 }
    ];
    const withLog: SimulationState = { ...s, incidents: { ...s.incidents, log } };
    return { ...withLog, day: { ...withLog.day, period: 'evening' }, incidents: { ...withLog.incidents, lesson: lessonFor(withLog) } };
  }

  // ORDER 289 — kvällens steg står i simuleringen, och en skärm tar inte emot
  // klick de första 700 ms (tiden flyttas fram före klicken).
  const later = () => { const t = performance.now() + 1000; vi.spyOn(performance, 'now').mockReturnValue(t); };

  it('ORDER 289: kvällen börjar med kvällens resultat, som inte går att hoppa över', () => {
    const s = evening();
    sim.state = { ...s, day: { ...s.day, eveningStep: 'result' } };
    const { container } = render(<EveningBar />);
    expect(byTestId(container, 'screen-R1')).not.toBeNull();
    // Ett klick direkt när skärmen visas (dubbelklick) räknas inte.
    fireEvent.click(byTestId(container, 'result-continue')!);
    expect(sim.dispatch).not.toHaveBeenCalledWith({ type: 'EVENING_STEP', to: 'lesson' });
    later();
    fireEvent.click(byTestId(container, 'result-continue')!);
    expect(sim.dispatch).toHaveBeenCalledWith({ type: 'EVENING_STEP', to: 'lesson' });
    vi.restoreAllMocks();
  });

  it('L1: rutnätet, lärdomen ur det tidigaste fallet och vägen vidare utan fråga', () => {
    const s = evening();
    sim.state = { ...s, day: { ...s.day, eveningStep: 'lesson' } };
    const { container } = render(<EveningBar />);
    expect(byTestId(container, 'screen-L1')).not.toBeNull();
    expect(byTestId(container, 'evening-bar')).not.toBeNull();
    expect(byTestId(container, 'evening-lesson')!.getAttribute('data-items')).toBe('2');
    // Rosen föll på techne (steg 1), getosten på phronesis: rosen är lärdomen.
    expect(byTestId(container, 'grid-vb02-rosen')!.getAttribute('data-lesson')).toBe('true');
    expect(byTestId(container, 'lesson-step-vb02-rosen')!.getAttribute('data-step-axis')).toBe('techne');
    const cells = [...byTestId(container, 'grid-vb02-rosen')!.querySelectorAll('.nx-cell')].map((c) => c.getAttribute('data-cell'));
    expect(cells).toEqual(['cleared', 'failed', 'unreached']);
    const item = s.incidents.lesson!.find((i) => i.incidentId === 'vb02-rosen')!;
    expect(byTestId(container, 'lesson-principle')!.textContent).toBe(item.betterExplanation);
    expect(byTestId(container, 'lesson-vb09-getosten')).not.toBeNull();
    expect(container.querySelectorAll('input, [role=radio]')).toHaveLength(0);
    later();
    fireEvent.click(byTestId(container, 'end-evening')!);
    // ORDER 296 — efter lärdomen och berättelsen kommer byn i kväll och butiken
    // (här utan byns rader: direkt till butiken), sist före morgonen.
    expect(sim.dispatch).toHaveBeenCalledWith({ type: 'EVENING_STEP', to: 'shop' });
    vi.restoreAllMocks();
  });

  it('K1: berättelsen, det som gick bra och fel, och nästa morgon', () => {
    const s = evening();
    sim.state = { ...s, day: { ...s.day, eveningStep: 'story' }, eveningAccount: { branch: 'calm' as never, paragraph: 'Kvällen i ord.', presentedAt: 0 } };
    const { container } = render(<EveningBar />);
    expect(byTestId(container, 'screen-K1')).not.toBeNull();
    expect(byTestId(container, 'evening-story')!.textContent).toBe('Kvällen i ord.');
    expect(byTestId(container, 'story-well')!.querySelectorAll('li')).toHaveLength(1);
    expect(byTestId(container, 'story-wrong')!.querySelectorAll('li')).toHaveLength(2);
    later();
    fireEvent.click(byTestId(container, 'end-evening')!);
    // ORDER 296 — efter lärdomen och berättelsen kommer byn i kväll och butiken
    // (här utan byns rader: direkt till butiken), sist före morgonen.
    expect(sim.dispatch).toHaveBeenCalledWith({ type: 'EVENING_STEP', to: 'shop' });
    vi.restoreAllMocks();
  });
});

describe('ORDER 271 — rutan utan verksamhet och pengar (X1)', () => {
  function strandedState(cash: number): SimulationState {
    const s = makeNewGameState(5);
    const nb = changeClass({ ...s, introduction: null }, null as never, true);
    return { ...nb, cash, day: { ...nb.day, period: 'morning' } };
  }

  it('en enda knapp, medaljerna först, rummet svartvitt, och Esc gör ingenting', () => {
    const s = strandedState(0);
    sim.state = s;
    const onHouse = vi.fn();
    const { container } = render(<NoBusinessBox hidden={false} onOpenHouse={onHouse} onOpenBank={() => {}} />);
    const box = byTestId(container, 'no-business-box')!;
    expect(box.querySelectorAll('button')).toHaveLength(1);
    expect(box.querySelector('button')!.textContent).toContain(strings.rocket.stranded.toHouse);
    expect(box.querySelector('li')!.getAttribute('data-testid')).toBe('no-business-medals');
    expect(container.querySelector('style')!.textContent).toContain('grayscale');
    const bubble = vi.fn();
    window.addEventListener('keydown', bubble);
    fireEvent.keyDown(window, { key: 'Escape' });
    window.removeEventListener('keydown', bubble);
    expect(bubble).not.toHaveBeenCalled();
    expect(byTestId(container, 'no-business-box')).not.toBeNull();
    fireEvent.click(box.querySelector('button')!);
    expect(onHouse).toHaveBeenCalled();
  });

  it('med kassa över minsta insats visas rutan inte, och aldrig mitt i en kväll', () => {
    const s = strandedState(0);
    sim.state = { ...s, cash: minimumStakeSek(s) };
    const a = render(<NoBusinessBox hidden={false} onOpenHouse={() => {}} onOpenBank={() => {}} />);
    expect(byTestId(a.container, 'no-business-box')).toBeNull();
    cleanup();
    sim.state = { ...s, day: { ...s.day, period: 'evening' } };
    const b = render(<NoBusinessBox hidden={false} onOpenHouse={() => {}} onOpenBank={() => {}} />);
    expect(byTestId(b.container, 'no-business-box')).toBeNull();
  });
});
