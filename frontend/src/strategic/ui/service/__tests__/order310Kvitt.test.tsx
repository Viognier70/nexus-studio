// @vitest-environment jsdom
//
// ORDER 310 — Designs kvitt eller dubbelt (leveransen 2026-10-05) i
// raketkortet och pyramidens ögonblick:
//   - valet i Designs form: raden Steg n · potten → om rätt, Stanna och Gå
//     vidare med undertexterna, ringen med 8 s och "När tiden går ut stannar du";
//   - potten 1, 3, 7 i krediter (sim/incidents.ts growPot med
//     INCIDENTS.bestAnswerCredit och DOUBLE_OR_NOTHING.growth);
//   - tangenterna 1 och 2 i valet;
//   - pyramiden i raketens egen ordning: en raket med stegen episteme,
//     phronesis, techne får handlingen (techne) i toppen.
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
import { answerAndWait } from '../../../../sim/__tests__/verdict';
import { makeNewGameState } from '../../../simulation/model';
import { firstDayOfWeek } from '../../../../sim/calendar';
import { DOUBLE_OR_NOTHING, INCIDENTS } from '../../../../sim/balance';
import { incidentById, type IncidentStep } from '../../../../sim/incidentBank';
import { rankedStepOption } from '../../../../sim/incidents';
import { strings } from '../../../../content/strings';
import { setLanguage } from '../../../../content/language';
import { IncidentCard } from '../../../scenario/IncidentPanel';
import { setServiceDrawerOpen } from '../serviceDrawer';
import { stocked } from '../../../testHarness/stocked';
import { KnowledgePyramid, PyramidStrip } from '../KnowledgePyramid';
import { PyramidMoment, potIfRight } from '../PyramidMoment';

setServiceDrawerOpen(true);

afterEach(() => {
  cleanup();
  sim.dispatch.mockReset();
  vi.useRealTimers();
});

const ID = 'vb09-getosten';
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
  if (a.choosing) return reducer(s, { type: 'INCIDENT_GO' });
  const step = incidentById('vinbar', a.id)!.steps[a.step];
  // ORDER 310b — svaret avgörs efter låset och väntan.
  return answerAndWait(s, rankedStepOption(step, rank, a.struck, a.situation));
}
function openNow(s: SimulationState, id: string): SimulationState {
  s = { ...s, incidents: { ...s.incidents, slots: [{ at: s.simTime, phase: 'rush' }, ...s.incidents.slots], queued: [id] } };
  if (!s.day.doorsOpenedThisService) s = tick(s, 700);
  for (let i = 0; i < 2000 && s.incidents.active?.id !== id; i++) {
    if (s.incidents.active) s = answer(s);
    s = reducer(s, TICK);
  }
  for (let i = 0; i < 2000 && (s.incidents.active?.introLeft ?? 0) > 0; i++) s = reducer(s, TICK);
  return s;
}
// Tills svaret i stunden har visats och valet står (revealLeft 0).
function untilChoice(s: SimulationState): SimulationState {
  for (let i = 0; i < 400 && (s.incidents.active?.revealLeft ?? 0) > 0; i++) s = reducer(s, TICK);
  return s;
}
const q = (id: string) => document.body.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
const k = () => strings.rocket.card.kvitt;
const p = () => strings.pyramidMoment;
const name = strings.service.incident.stepName;

describe('ORDER 310 — potten i Designs form', () => {
  it('potten efter ett, två och tre rätta steg är 1, 3 och 7 krediter', () => {
    expect(INCIDENTS.bestAnswerCredit).toBe(1);
    expect(DOUBLE_OR_NOTHING.growth).toBe(2);
    expect(DOUBLE_OR_NOTHING.choiceSeconds).toBe(8);
    expect([potIfRight(0), potIfRight(potIfRight(0)), potIfRight(potIfRight(potIfRight(0)))]).toEqual([1, 3, 7]);
  });
});

describe('ORDER 310 — valet på kortet (Designs kvitt eller dubbelt)', () => {
  it('efter steg 1: Stegets kredit 1, Stanna 1 kredit, Gå vidare Techne 1 → 3, ringen 8', () => {
    setLanguage('sv');
    let s = answer(openNow(wineBarService(), ID));
    sim.state = s;
    const { rerender } = render(<IncidentCard />);
    // Svaret i stunden: kolumnen står med det rätta steget, men inget val ännu.
    expect(q('pyramid-moment')!.getAttribute('data-phase')).toBe('right');
    expect(q('incident-kvitt')).toBeNull();
    s = untilChoice(s);
    sim.state = s;
    rerender(<IncidentCard />);
    expect(q('incident-card')!.getAttribute('data-choosing')).toBe('true');
    const col = q('pyramid-moment')!;
    expect(col.getAttribute('data-phase')).toBe('choosing');
    expect(col.getAttribute('data-step')).toBe('0');
    expect(q('stake-step')!.textContent).toBe(`${p().stepTerm(1)}${name.episteme}`);
    expect(q('stake-pot')!.textContent).toContain(p().first);
    expect(q('stake-pot-value')!.textContent).toBe('1');
    expect(q('stake-if-right')!.getAttribute('data-value')).toBe('1');
    expect(q('incident-kvitt-stop')!.textContent).toContain('Stanna, och ta det du har');
    expect(q('incident-kvitt-stop-sub')!.textContent).toBe('1 kredit är din');
    expect(q('incident-kvitt-go')!.textContent).toContain('Gå vidare, med allt på spel');
    expect(q('incident-kvitt-go-sub')!.textContent).toBe(`${name.techne}: 1 → 3 om rätt, 0 om fel`);
    expect(q('stake-countdown')!.getAttribute('data-value')).toBe('8');
    expect(q('stake-note')!.textContent).toBe('När tiden går ut stannar du');
    // Svarsalternativen och frågan står inte på kortet medan spelaren väljer.
    expect(document.body.querySelectorAll('[data-testid^=incident-option-]').length).toBe(0);
    expect(q('incident-countdown')).toBeNull();
    // Tangenterna: 1 stannar, 2 går vidare. Knapparna gör detsamma.
    fireEvent.keyDown(window, { key: '1' });
    expect(sim.dispatch).toHaveBeenLastCalledWith({ type: 'INCIDENT_STOP' });
    fireEvent.keyDown(window, { key: '2' });
    expect(sim.dispatch).toHaveBeenLastCalledWith({ type: 'INCIDENT_GO' });
    fireEvent.keyDown(window, { key: '3' });
    expect(sim.dispatch).toHaveBeenCalledTimes(2);
    fireEvent.click(q('incident-kvitt-stop')!);
    expect(sim.dispatch).toHaveBeenLastCalledWith({ type: 'INCIDENT_STOP' });
    fireEvent.click(q('incident-kvitt-go')!);
    expect(sim.dispatch).toHaveBeenLastCalledWith({ type: 'INCIDENT_GO' });
    // De tre sista sekunderna pulserar ringen.
    for (let i = 0; i < 400 && (s.incidents.active?.choiceLeft ?? 0) > 2.5; i++) s = reducer(s, TICK);
    sim.state = s;
    rerender(<IncidentCard />);
    expect(q('stake-countdown')!.getAttribute('data-last')).toBe('true');
    setLanguage('en');
  });

  it('efter steg 2: Dubbelt + steget 3, Gå vidare Phronesis 3 → 7; hela vägen 7', () => {
    setLanguage('en');
    let s = untilChoice(answer(openNow(wineBarService(), ID)));
    s = untilChoice(answer(answer(s)));
    sim.state = s;
    const { rerender } = render(<IncidentCard />);
    expect(q('pyramid-moment')!.getAttribute('data-phase')).toBe('choosing');
    expect(q('stake-step')!.textContent).toBe(`${p().stepTerm(2)}${name.techne}`);
    expect(q('stake-pot')!.textContent).toContain(p().doubled);
    expect(q('stake-pot-value')!.textContent).toBe('3');
    expect(q('incident-kvitt-stop-sub')!.textContent).toBe(k().stopSub(3));
    expect(q('incident-kvitt-go-sub')!.textContent).toBe(`${name.phronesis}: 3 → 7 if right, 0 if wrong`);
    // Steg 3 rätt: hela pyramiden, potten 7 och inget val.
    s = answer(answer(s));
    sim.state = s;
    rerender(<IncidentCard />);
    expect(q('pyramid-moment')!.getAttribute('data-phase')).toBe('done');
    expect(q('stake-if-right')!.getAttribute('data-value')).toBe('7');
    expect(q('incident-kvitt')).toBeNull();
    expect(s.incidents.lastOutcome?.pot).toEqual(expect.objectContaining({ taken: true, credits: 7 }));
  });

  it('fel efter Gå vidare: Potten är borta, potten 3 streckas', () => {
    setLanguage('en');
    let s = untilChoice(answer(openNow(wineBarService(), ID)));
    s = untilChoice(answer(answer(s)));
    s = answer(s); // Gå vidare
    sim.state = s;
    const { rerender } = render(<IncidentCard />);
    s = answer(s, 'worst');
    sim.state = s;
    rerender(<IncidentCard />);
    const col = q('pyramid-moment')!;
    expect(col.getAttribute('data-phase')).toBe('wrong');
    expect(col.getAttribute('data-step')).toBe('2');
    expect(q('stake-step')!.getAttribute('data-state')).toBe('wrong');
    expect(q('stake-pot')!.textContent).toContain(p().gone);
    expect(q('stake-pot')!.getAttribute('data-state')).toBe('out');
    expect(q('stake-pot-value')!.textContent).toBe('3');
    expect(q('stake-if-right')!.getAttribute('data-value')).toBe('7');
    expect(q('stake-token')).not.toBeNull();
    expect(q('incident-kvitt')).toBeNull();
  });

  it('fel på steg 1: Potten var tom', () => {
    setLanguage('en');
    const s0 = openNow(wineBarService(), ID);
    sim.state = s0;
    const { rerender } = render(<IncidentCard />);
    sim.state = answer(s0, 'worst');
    rerender(<IncidentCard />);
    expect(q('pyramid-moment')!.getAttribute('data-phase')).toBe('wrong');
    expect(q('stake-pot')!.textContent).toContain(p().none);
    expect(q('stake-pot-value')!.textContent).toBe('0');
  });

  it('stannade: Stanna står markerad och kolumnen går efter 1,2 s', () => {
    vi.useFakeTimers();
    setLanguage('en');
    const s = untilChoice(answer(openNow(wineBarService(), ID)));
    sim.state = s;
    const { rerender } = render(<IncidentCard />);
    sim.state = reducer(s, { type: 'INCIDENT_STOP' });
    rerender(<IncidentCard />);
    expect(q('pyramid-moment')!.getAttribute('data-phase')).toBe('stopped');
    expect(q('incident-kvitt-stop')!.getAttribute('data-picked')).toBe('true');
    expect(q('incident-kvitt-go')!.getAttribute('data-dim')).toBe('true');
    expect(q('stake-note')!.textContent).toBe(k().pickedStop);
    act(() => { vi.advanceTimersByTime(1300); });
    expect(q('pyramid-moment')).toBeNull();
  });
});

describe('ORDER 310 — pyramiden i raketens egen ordning', () => {
  const ORDER_306 = ['episteme', 'phronesis', 'techne'] as const;

  it('KnowledgePyramid och PyramidStrip: handlingen (techne) i toppen', () => {
    const { container } = render(<KnowledgePyramid levels={['filled', 'current', 'empty']} full={false} axes={ORDER_306} testId="p" />);
    const floors = [...container.querySelectorAll('.nx-pyr-floor')].map((g) => [g.getAttribute('data-slot'), g.getAttribute('data-axis'), g.getAttribute('data-state')]);
    expect(floors).toEqual([['0', 'episteme', 'filled'], ['1', 'phronesis', 'current'], ['2', 'techne', 'empty']]);
    // Våningarnas namn uppifrån och ned: techne överst.
    expect([...container.querySelectorAll('.nx-pyr-legend li')].map((li) => li.getAttribute('data-axis'))).toEqual(['techne', 'phronesis', 'episteme']);
    cleanup();
    const strip = render(<PyramidStrip levels={['filled', 'current', 'empty']} full={false} showMult confidence={null} axes={ORDER_306} testId="s" />);
    const chips = [...strip.container.querySelectorAll('.nx-pyr-chip')];
    expect(chips.map((c) => c.getAttribute('data-axis'))).toEqual([...ORDER_306]);
    // Multiplikatorn hör till platsen: ×1, ×2, ×4 nedifrån.
    expect(chips.map((c) => c.querySelector('.nx-pyr-mult')!.textContent)).toEqual(['×1', '×2', '×4']);
  });

  it('utan axes står den gamla ordningen kvar (episteme, techne, phronesis)', () => {
    const { container } = render(<KnowledgePyramid levels={['empty', 'empty', 'empty']} full={false} />);
    expect([...container.querySelectorAll('.nx-pyr-floor')].map((g) => g.getAttribute('data-axis'))).toEqual(['episteme', 'techne', 'phronesis']);
  });

  it('PyramidMoment: steg 2 är phronesis, och Gå vidare leder till techne i toppen', () => {
    setLanguage('en');
    render(<PyramidMoment phase="choosing" axes={ORDER_306} step={1} levels={['filled', 'filled', 'empty']} potBefore={1} potAfter={3} choiceLeft={8} />);
    expect(q('pyramid-moment')!.getAttribute('data-axis')).toBe('phronesis');
    expect(q('stake-step')!.textContent).toBe(`${p().stepTerm(2)}${name.phronesis}`);
    expect(q('incident-kvitt-go-sub')!.textContent).toBe(`${name.techne}: 3 → 7 if right, 0 if wrong`);
    const top = q('pyramid-moment-pyramid-techne')!;
    expect(top.getAttribute('data-slot')).toBe('2');
    expect(top.getAttribute('data-state')).toBe('next');
  });

  it('en raket i spelet med stegen episteme, phronesis, techne: kortet och kolumnen följer raketen', () => {
    setLanguage('en');
    const inc = incidentById('vinbar', ID)!;
    const orig = inc.steps;
    const reordered: IncidentStep[] = [orig[0], { ...orig[2] }, { ...orig[1] }];
    expect(reordered.map((st) => st.axis)).toEqual([...ORDER_306]);
    (inc as { steps: IncidentStep[] }).steps = reordered;
    try {
      let s = untilChoice(answer(openNow(wineBarService(), ID)));
      sim.state = s;
      const { rerender } = render(<IncidentCard />);
      expect([...document.body.querySelectorAll('[data-testid=incident-pyramid] .nx-pyr-chip')].map((c) => c.getAttribute('data-axis'))).toEqual([...ORDER_306]);
      expect(q('incident-kvitt-go-sub')!.textContent).toBe(`${name.phronesis}: 1 → 3 if right, 0 if wrong`);
      s = untilChoice(answer(answer(s)));
      sim.state = s;
      rerender(<IncidentCard />);
      expect(q('stake-step')!.textContent).toBe(`${p().stepTerm(2)}${name.phronesis}`);
      expect(q('incident-kvitt-go-sub')!.textContent).toBe(`${name.techne}: 3 → 7 if right, 0 if wrong`);
      const top = q('pyramid-moment-pyramid-techne')!;
      expect(top.getAttribute('data-slot')).toBe('2');
      expect(q('pyramid-moment-pyramid-phronesis')!.getAttribute('data-slot')).toBe('1');
    } finally {
      (inc as { steps: IncidentStep[] }).steps = orig;
    }
  });
});
