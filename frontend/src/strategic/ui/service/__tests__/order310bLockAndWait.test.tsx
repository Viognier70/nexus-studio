// @vitest-environment jsdom
//
// ORDER 310b — Designs lås och väntan i raketkortet och kolumnen
// (kvitt eller dubbelt §3, lägena 1–2): det låsta svaret har en bläckkant,
// listen visar Låst, klockan står, kolumnen visar marken på steget med låset
// (öppet tills 0,9 s) och pulsen i väntan. Om svaret var rätt eller fel syns
// först vid avgörandet. Tangenterna svarar inte under väntan. Reducerad
// rörelse: väntan finns kvar, pulsen står still på 100 %.
// Tillstånden byggs med spelets egen reducer.

import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SimulationState } from '../../../types';

let reduceMotion = false;
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: reduceMotion && query.includes('reduce'), media: query, onchange: null,
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
import { untilVerdict } from '../../../../sim/__tests__/verdict';
import { makeNewGameState } from '../../../simulation/model';
import { firstDayOfWeek } from '../../../../sim/calendar';
import { INCIDENTS } from '../../../../sim/balance';
import { incidentById } from '../../../../sim/incidentBank';
import { rankedStepOption } from '../../../../sim/incidents';
import { strings } from '../../../../content/strings';
import { setLanguage } from '../../../../content/language';
import { IncidentCard } from '../../../scenario/IncidentPanel';
import { setServiceDrawerOpen } from '../serviceDrawer';
import { stocked } from '../../../testHarness/stocked';
import { waitPulse } from '../PyramidMoment';

setServiceDrawerOpen(true);

afterEach(() => {
  cleanup();
  sim.dispatch.mockReset();
  reduceMotion = false;
});

const ID = 'vb09-getosten';
const TICK = { type: 'TICK', dt: 0.2 } as const;
// Farten 2: en tick är 0,1 s i verkligheten.
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
function openNow(s: SimulationState, id: string): SimulationState {
  s = { ...s, incidents: { ...s.incidents, slots: [{ at: s.simTime, phase: 'rush' }, ...s.incidents.slots], queued: [id] } };
  if (!s.day.doorsOpenedThisService) s = tick(s, 700);
  for (let i = 0; i < 2000 && s.incidents.active?.id !== id; i++) {
    const a = s.incidents.active;
    if (a && !a.pending) {
      s = a.choosing ? reducer(s, { type: 'INCIDENT_GO' })
        : reducer(s, { type: 'ANSWER_INCIDENT', optionId: rankedStepOption(incidentById('vinbar', a.id)!.steps[a.step], 'best', a.struck, a.situation) });
    }
    s = reducer(s, TICK);
  }
  for (let i = 0; i < 2000 && (s.incidents.active?.introLeft ?? 0) > 0; i++) s = reducer(s, TICK);
  return s;
}
const q = (id: string) => document.body.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

describe('ORDER 310b — låset och väntan på kortet och i kolumnen', () => {
  it('låset: det valda svaret har bläckkant, listen visar Låst, klockan står, marken ligger på steget', () => {
    setLanguage('sv');
    const open = openNow(wineBarService(), ID);
    const s = reducer(open, { type: 'ANSWER_INCIDENT', optionId: 'c' });
    sim.state = s;
    const { rerender } = render(<IncidentCard />);
    const card = q('incident-card')!;
    expect(card.getAttribute('data-mode')).toBe('ask');
    expect(card.getAttribute('data-locked')).toBe('lock');
    expect(q('incident-option-c')!.getAttribute('data-look')).toBe('locked');
    expect(q('incident-option-c')!.getAttribute('aria-pressed')).toBe('true');
    expect(q('incident-option-a')!.getAttribute('data-look')).toBe('open');
    for (const id of ['a', 'b', 'c']) expect((q(`incident-option-${id}`) as HTMLButtonElement).disabled).toBe(true);
    expect(q('incident-locked')!.textContent).toContain('Låst');
    expect(q('incident-band')).toBeNull();
    expect(q('incident-countdown')!.getAttribute('data-frozen')).toBe('true');
    const col = q('pyramid-moment')!;
    expect(col.getAttribute('data-phase')).toBe('lock');
    expect(q('stake-token')!.getAttribute('data-phase')).toBe('lock');
    expect(q('stake-lock')!.hasAttribute('data-shut')).toBe(false);
    expect(q('stake-pot-value')!.textContent).toBe('0');
    expect(q('stake-if-right')!.getAttribute('data-value')).toBe('1');
    expect(q('stake-wait-note')!.textContent).toBe(strings.pyramidMoment.onTable);
    // Tangenterna 1–4 svarar inte: svaret är låst.
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: '3' });
    expect(sim.dispatch).not.toHaveBeenCalled();

    // Väntan, från 0,9 s: låset har slagit igen, kortet tonas, steget pulserar.
    const waiting = tick(s, Math.round(INCIDENTS.lockSeconds / 0.1) + 1);
    sim.state = waiting;
    rerender(<IncidentCard />);
    expect(q('incident-card')!.getAttribute('data-locked')).toBe('wait');
    expect(q('pyramid-moment')!.getAttribute('data-phase')).toBe('wait');
    expect(q('stake-lock')!.getAttribute('data-shut')).toBe('true');
    expect(q('stake-pot')!.getAttribute('data-state')).toBe('lit');
    expect(q('pyramid-moment-pyramid-episteme')!.getAttribute('data-state')).toBe('current');
    // Om svaret var rätt syns inte förrän avgörandet.
    expect(document.body.querySelector('[data-look="chosen"], [data-look="wrong"], [data-look="correct"]')).toBeNull();
    expect(q('incident-band')).toBeNull();

    // Avgörandet: rätt, kolumnen fyller steget.
    sim.state = untilVerdict(waiting);
    rerender(<IncidentCard />);
    expect(q('incident-card')!.getAttribute('data-mode')).toBe('right');
    expect(q('incident-card')!.hasAttribute('data-locked')).toBe(false);
    expect(q('incident-option-c')!.getAttribute('data-look')).toBe('chosen');
    expect(q('pyramid-moment')!.getAttribute('data-phase')).toBe('right');
    expect(q('incident-locked')).toBeNull();
  });

  it('fel svar: inget rött under väntan, sedan sprickan och bandet vid avgörandet', () => {
    setLanguage('sv');
    const open = openNow(wineBarService(), ID);
    sim.state = open;
    const { rerender } = render(<IncidentCard />);
    const waiting = tick(reducer(open, { type: 'ANSWER_INCIDENT', optionId: 'a' }), 20);
    sim.state = waiting;
    rerender(<IncidentCard />);
    expect(q('pyramid-moment')!.getAttribute('data-phase')).toBe('wait');
    expect(q('incident-option-a')!.getAttribute('data-look')).toBe('locked');
    expect(q('incident-band')).toBeNull();
    sim.state = untilVerdict(waiting);
    rerender(<IncidentCard />);
    expect(q('incident-card')!.getAttribute('data-mode')).toBe('wrong');
    expect(q('incident-option-a')!.getAttribute('data-look')).toBe('wrong');
    expect(q('pyramid-moment')!.getAttribute('data-phase')).toBe('wrong');
    expect(q('incident-band')).not.toBeNull();
  });

  it('reducerad rörelse: väntan finns kvar, pulsen står still på 100 %', () => {
    reduceMotion = true;
    const open = openNow(wineBarService(), ID);
    const waiting = tick(reducer(open, { type: 'ANSWER_INCIDENT', optionId: 'c' }), Math.round(INCIDENTS.lockSeconds / 0.1) + 1);
    sim.state = waiting;
    render(<IncidentCard />);
    const col = q('pyramid-moment')!;
    expect(col.getAttribute('data-reduced')).toBe('true');
    expect(col.getAttribute('data-phase')).toBe('wait');
    expect(q('incident-card')!.getAttribute('data-locked')).toBe('wait');
    expect(document.body.querySelector('.nx-stake-pyr')!.getAttribute('data-pulse')).toBe('1.00');
  });

  it('pulsen (Designs waitPulse): stilla före låset, går mellan 0 och 1 under väntan', () => {
    expect(waitPulse(0)).toBe(0);
    expect(waitPulse(INCIDENTS.lockSeconds * 1000)).toBe(0);
    const samples = Array.from({ length: 60 }, (_, i) => waitPulse(INCIDENTS.lockSeconds * 1000 + i * 50));
    expect(Math.max(...samples)).toBeGreaterThan(0.9);
    for (const v of samples) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
  });
});
