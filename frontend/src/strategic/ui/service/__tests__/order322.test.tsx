// @vitest-environment jsdom
// ORDER 322 (Anders 2026-10-09, efter provspel) — kvitt eller dubbelt i vinbaren, och provspelet:
// A1. Den stora pyramiden står inte i rummet; en liten pyramid står i raden bredvid "Steg 1 · Episteme".
// A2. "Om rätt" visar potten efter nästa rätta svar (1 → 3 → 7), inte stegets kredit.
// A3. Teckenförklaringen är stängd från början, öppnas med tangenten som står i hörnet, rubriken klipps inte,
//     och under kvitt eller dubbelt slutar den ovanför raden och valen.
// C.  Den tvingade situationen (QUEUE_INCIDENT) säger inte "Följd"; en följd efter ett val gör det.
//     Provspelets krog heter verksamhetens riktiga namn.
// Mätningen i webbläsaren (1440 × 900 och 1280 × 720): scripts/order322-check.mjs, reports/order322/check.json.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { reducer } from '../../../simulation/reducer';
import { makeNewGameState } from '../../../simulation/model';
import { firstDayOfWeek } from '../../../../sim/calendar';
import { stocked } from '../../../testHarness/stocked';
import { setLanguage } from '../../../../content/language';
import { t } from '../../../../content/nexusStrings';
import { setStatusMode } from '../../statusMode';
import { StatusLegend } from '../../StatusLegend';
import { STATUS_LEGEND } from '../../../scene/staffStatus';
import { PyramidMoment, potIfRight } from '../PyramidMoment';
import { provBusinessName } from '../../../prov/provState';
import type { SimulationState } from '../../../types';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AXES = ['episteme', 'phronesis', 'techne'] as const;
const q = (id: string) => document.body.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

afterEach(() => {
  cleanup();
  act(() => setStatusMode(false));
});

describe('ORDER 322 A1 — pyramiden i raden, inte i rummet', () => {
  it('den enda pyramiden i ögonblicket står i raden, före steget', () => {
    render(<PyramidMoment phase="choosing" axes={AXES} step={0} levels={['filled', 'empty', 'empty']} potBefore={0} potAfter={1} />);
    const row = q('pyramid-moment-line')!;
    const pyramids = q('pyramid-moment')!.querySelectorAll('.nx-pyramid');
    expect(pyramids.length).toBe(1);
    expect(row.contains(pyramids[0])).toBe(true);
    expect(row.firstElementChild).toBe(q('stake-pyramid'));
    expect(q('stake-pyramid')!.nextElementSibling).toBe(q('stake-step'));
  });

  it('i service.css står pyramiden i radens flöde, utan egen plats i rummet', () => {
    const css = readFileSync(resolve(SRC, 'strategic/ui/service/service.css'), 'utf8');
    const rule = css.match(/\n\.nx-stake-pyr \{([^}]*)\}/)![1];
    expect(rule).toMatch(/position: relative/);
    expect(rule).not.toMatch(/top:|left:/);
  });
});

describe('ORDER 322 A2 — "Om rätt" är potten efter nästa rätta svar', () => {
  const ifRight = () => q('stake-if-right')?.getAttribute('data-value') ?? null;
  it('1 → 3 → 7: i väntan på steg 1, och vid valet efter steg 1 och 2', () => {
    const { rerender } = render(<PyramidMoment phase="wait" axes={AXES} step={0} levels={['current', 'empty', 'empty']} potBefore={0} potAfter={0} />);
    expect(ifRight()).toBe('1');
    rerender(<PyramidMoment key="c1" phase="choosing" axes={AXES} step={0} levels={['filled', 'empty', 'empty']} potBefore={0} potAfter={1} />);
    expect([q('stake-pot')!.getAttribute('data-value'), ifRight()]).toEqual(['1', '3']);
    rerender(<PyramidMoment key="c2" phase="choosing" axes={AXES} step={1} levels={['filled', 'filled', 'empty']} potBefore={1} potAfter={3} />);
    expect([q('stake-pot')!.getAttribute('data-value'), ifRight()]).toEqual(['3', '7']);
    expect([potIfRight(0), potIfRight(1), potIfRight(3)]).toEqual([1, 3, 7]);
  });

  it('efter det sista steget och när spelaren stannat finns inget nästa', () => {
    const { rerender } = render(<PyramidMoment phase="done" axes={AXES} step={2} levels={['filled', 'filled', 'filled']} potBefore={3} potAfter={7} />);
    expect(ifRight()).toBeNull();
    rerender(<PyramidMoment key="s" phase="stopped" axes={AXES} step={0} levels={['filled', 'empty', 'empty']} potBefore={0} potAfter={1} />);
    expect(ifRight()).toBeNull();
  });
});

describe('ORDER 322 A3 — teckenförklaringen', () => {
  it('stängd från början, tangenten i hörnet öppnar och stänger', () => {
    setLanguage('sv');
    render(<StatusLegend />);
    expect(q('status-legend-key')).toBeNull();
    act(() => setStatusMode(true));
    expect(q('status-legend')).toBeNull();
    expect(q('status-legend-key')!.textContent).toContain(STATUS_LEGEND.key);
    expect(q('status-legend-key')!.textContent).toContain('Teckenförklaring');
    act(() => { fireEvent.keyDown(window, { key: STATUS_LEGEND.key.toLowerCase() }); });
    expect(q('status-legend')).not.toBeNull();
    expect(q('status-legend-body')).not.toBeNull();
    expect(q('status-legend')!.textContent).toContain(t('sv', 'legend.keyHint', { key: STATUS_LEGEND.key }));
    act(() => { fireEvent.keyDown(window, { key: STATUS_LEGEND.key }); });
    expect(q('status-legend')).toBeNull();
    // Statusläget av och på igen: stängd igen.
    act(() => { fireEvent.click(q('status-legend-key')!); });
    expect(q('status-legend')).not.toBeNull();
    act(() => { setStatusMode(false); });
    act(() => { setStatusMode(true); });
    expect(q('status-legend')).toBeNull();
    setLanguage('en');
  });

  it('rubriken står utanför rullningen på en rad, och under kvitt eller dubbelt slutar rutan ovanför raden', () => {
    const css = readFileSync(resolve(SRC, 'strategic/ui/screens/screens.css'), 'utf8');
    const service = readFileSync(resolve(SRC, 'strategic/ui/service/service.css'), 'utf8');
    expect(css).toMatch(/\.nx-status-legend \.nx-label \{ white-space: nowrap; \}/);
    expect(css).toMatch(/\.nx-status-legend-scroll \{[^}]*overflow: auto/);
    // Raden står på 64,5vh − 4,7vh (service.css); rutan slutar 12 px ovanför.
    expect(service).toMatch(/\.nx-stake-row \{\s*position: absolute; left: 50%; top: calc\(64\.5vh - 4\.7vh\)/);
    expect(css).toMatch(/body:has\(\.nx-stake\) \.nx-status-legend \{ max-height: calc\(64\.5vh - 4\.7vh - 96px - 12px\); \}/);
    expect(css).toMatch(/\.nx-status-legend \{[^}]*top: 96px/);
  });
});

describe('ORDER 322 C — den tvingade situationen och krogens namn', () => {
  const TICK = { type: 'TICK', dt: 0.2 } as const;
  function service(): SimulationState {
    let s = makeNewGameState(7);
    s = { ...s, medals: { stensota: 'brons', metodkoket: 'brons', kalastorget: 'brons' }, speed: 2 };
    s = { ...s, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
    s = reducer(stocked(s), { type: 'START_SERVICE' });
    for (let i = 0; i < 700 && !s.incidents.enabled; i++) s = reducer(s, TICK);
    return s;
  }
  function until(s: SimulationState, id: string): SimulationState {
    for (let i = 0; i < 4000 && s.incidents.active?.id !== id; i++) {
      if (s.incidents.active) s = { ...s, incidents: { ...s.incidents, active: null } };
      s = reducer(s, TICK);
    }
    return s;
  }

  it('köad med QUEUE_INCIDENT: inte "Följd"', () => {
    let s = service();
    expect(s.incidents.enabled).toBe(true);
    s = reducer(s, { type: 'QUEUE_INCIDENT', incidentId: 'vb01-korken' });
    expect(s.incidents.forced).toEqual(['vb01-korken']);
    s = until(s, 'vb01-korken');
    expect(s.incidents.active?.id).toBe('vb01-korken');
    expect(s.incidents.active?.chained).toBe(false);
  });

  it('en följd efter ett val är fortfarande en följd', () => {
    let s = service();
    s = { ...s, incidents: { ...s.incidents, slots: [{ at: s.simTime, phase: 'rush' }, ...s.incidents.slots], queued: ['vb01-korken'] } };
    s = until(s, 'vb01-korken');
    expect(s.incidents.active?.chained).toBe(true);
  });

  // ORDER 323 §8 — namnet är det spelaren skriver; tomt ger Hyttgrillen (förut det sparade spelets namn).
  it('namnet: det spelaren skrev, annars Hyttgrillen', () => {
    expect(t('sv', 'prov.businessName')).toBe('Hyttgrillen');
    expect(provBusinessName('', 'sv')).toBe('Hyttgrillen');
    expect(provBusinessName('   ', 'en')).toBe('Hyttgrillen');
    expect(provBusinessName(' Bruksgrillen ', 'sv')).toBe('Bruksgrillen');
  });
});
