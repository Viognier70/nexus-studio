// @vitest-environment jsdom
//
// ORDER 306b — Designs D8 i kortet: ordningskorten i Karaffen (vb40, steg 3), etiketten för halvt
// grepp (papper och mässing, aldrig rött), myntet för kostnaden och Kassan räcker inte.

import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { SimulationState } from '../../../types';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({ matches: false, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false })
  });
});

const sim = vi.hoisted(() => ({ state: null as SimulationState | null, dispatch: vi.fn() }));
vi.mock('../../../simulation/SimulationProvider', () => ({ useSimState: () => sim.state, useSimDispatch: () => sim.dispatch }));

import { reducer } from '../../../simulation/reducer';
import { makeNewGameState } from '../../../simulation/model';
import { firstDayOfWeek } from '../../../../sim/calendar';
import { incidentById } from '../../../../sim/incidentBank';
import { rankedStepOption } from '../../../../sim/incidents';
import { untilVerdict } from '../../../../sim/__tests__/verdict';
import { t as tt } from '../../../../content/nexusStrings';
import { setLanguage } from '../../../../content/language';
import { IncidentCard } from '../../../scenario/IncidentPanel';
import { setServiceDrawerOpen } from '../serviceDrawer';
import { stocked } from '../../../testHarness/stocked';
import { ORDER_DECK, staffFill } from '../OrderCards';

setServiceDrawerOpen(true);
afterEach(() => { cleanup(); sim.dispatch.mockReset(); });

const TICK = { type: 'TICK', dt: 0.2 } as const;
const q = (id: string) => document.body.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

function openAt(id: string, step: number): SimulationState {
  let s = makeNewGameState(7);
  s = { ...s, medals: { stensota: 'brons', metodkoket: 'brons', kalastorget: 'brons' }, speed: 2, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
  s = reducer(stocked(s), { type: 'START_SERVICE' });
  s = { ...s, incidents: { ...s.incidents, slots: [{ at: s.simTime, phase: 'rush' }, ...s.incidents.slots], queued: [id] } };
  for (let i = 0; i < 700 && !s.day.doorsOpenedThisService; i++) s = reducer(s, TICK);
  for (let i = 0; i < 3000; i++) {
    const a = s.incidents.active;
    if (a?.id === id && a.step === step && !a.choosing && !a.pending && (a.revealLeft ?? 0) <= 0 && (a.introLeft ?? 0) <= 0) return s;
    if (a?.choosing) s = reducer(s, { type: 'INCIDENT_GO' });
    else if (a && !a.pending && (a.introLeft ?? 0) <= 0 && (a.revealLeft ?? 0) <= 0) s = reducer(s, { type: 'ANSWER_INCIDENT', optionId: rankedStepOption(incidentById('vinbar', a.id)!.steps[a.step], 'best', a.struck, a.situation) });
    s = reducer(s, TICK);
  }
  throw new Error(`${id} nådde inte steg ${step}`);
}

describe('ORDER 306b — ordningskorten (D8 orderCards.ts)', () => {
  it('sex kort i den fasta ordningen, fyra platser, och låset först när raden är full', () => {
    setLanguage('sv');
    let s = openAt('vb40-karaffen', 2);
    sim.state = s;
    const { rerender } = render(<IncidentCard />);
    expect(q('order-cards')).not.toBeNull();
    expect(q('incident-option-full')).toBeNull();
    expect([...document.body.querySelectorAll('.nx-order-card')].map((c) => c.getAttribute('data-testid'))).toEqual(ORDER_DECK.map((id) => `order-card-${id}`));
    expect(q('order-lock')!.textContent).toBe(tt('sv', 'order.need', { n: 4 }));
    expect((q('order-lock') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(q('order-card-a')!);
    expect(sim.dispatch).toHaveBeenCalledWith({ type: 'SET_INCIDENT_ROW', row: ['a'] });
    // Tangenterna 1–4 väljer inte en bedömning.
    fireEvent.keyDown(window, { key: '1' });
    expect(sim.dispatch).toHaveBeenCalledTimes(1);
    s = reducer(s, { type: 'SET_INCIDENT_ROW', row: ['b', 'a', 'c', 'd'] });
    sim.state = s;
    rerender(<IncidentCard />);
    expect(q('order-row')!.getAttribute('data-row')).toBe('bacd');
    expect(q('order-lock')!.textContent).toBe(tt('sv', 'order.lock'));
    fireEvent.click(q('order-slot-1')!);
    expect(sim.dispatch).toHaveBeenLastCalledWith({ type: 'SET_INCIDENT_ROW', row: ['b', 'c', 'd'] });
    fireEvent.click(q('order-lock')!);
    expect(sim.dispatch).toHaveBeenLastCalledWith({ type: 'LOCK_INCIDENT_ROW' });
  });

  it('halvt grepp: etiketten i mässing (aldrig rött) och den rätta raden streckad', () => {
    setLanguage('en');
    let s = reducer(openAt('vb40-karaffen', 2), { type: 'SET_INCIDENT_ROW', row: ['a', 'b', 'e', 'd'] });
    sim.state = s;
    const { rerender } = render(<IncidentCard />);
    s = untilVerdict(reducer(s, { type: 'LOCK_INCIDENT_ROW' }));
    sim.state = s;
    rerender(<IncidentCard />);
    expect(q('order-cards')!.getAttribute('data-grade')).toBe('experience');
    expect(q('incident-grip')!.getAttribute('data-kind')).toBe('half');
    expect(q('incident-grip')!.textContent).toBe(tt('en', 'grip.half.experience'));
    expect(q('order-answer')).not.toBeNull();
  });

  it('tiden ute med två kort: personalen lägger de handgrepp som saknas', () => {
    const spec = incidentById('vinbar', 'vb40-karaffen')!.steps[2].sequence!;
    expect(staffFill(spec, ['a', 'b'])).toEqual(['a', 'b', 'c', 'd']);
    expect(staffFill(spec, ['b', 'e'])).toEqual(['b', 'e', 'a', 'c']);
  });
});

describe('ORDER 306b — myntet och Kassan räcker inte (D8 gripLabels.ts)', () => {
  it('kostnaden står på svaret, och svaret går inte att välja när kassan inte räcker', () => {
    setLanguage('sv');
    const s = openAt('vb12-varmt-rott', 2);
    sim.state = s;
    const { rerender } = render(<IncidentCard />);
    expect(q('incident-cost-c')).not.toBeNull();
    expect(q('incident-cost-a')).toBeNull();
    expect(q('incident-short-c')).toBeNull();
    sim.state = { ...s, cash: 10 };
    rerender(<IncidentCard />);
    expect(q('incident-short-c')!.textContent).toBe(tt('sv', 'cost.short'));
    expect((q('incident-option-c') as HTMLButtonElement).disabled).toBe(true);
    expect((q('incident-option-a') as HTMLButtonElement).disabled).toBe(false);
  });
});
