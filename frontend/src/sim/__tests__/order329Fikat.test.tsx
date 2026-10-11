// @vitest-environment jsdom
// ORDER 329 (Anders 2026-10-11) — fikat vid vagnen: A. de sju dilemmana i
// documentation/blueprints/FIKA_VAGNEN_329.md, svenskan som i filen; B. vanligt
// fika när inget dilemma passar kvällen: en rad, hela laget FIKA.plainWellbeing.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeNewGameState } from '../../strategic/simulation/model';
import { DILEMMAS, dilemmaById } from '../../content/fika/dilemmas';
import { TABLE, pickLang } from '../../content/nexusStrings';
import { FIKA } from '../balance';
import { eligibleDilemmas, fikaTonight, planFika, plainFikaTonight } from '../fika';
import { wellbeingOf } from '../staffCondition';
import { firstDayOfWeek } from '../calendar';
import type { SimulationState } from '../../strategic/types';

vi.mock('../../strategic/simulation/SimulationProvider', () => ({
  useSimDispatch: () => () => {},
  useSimState: () => { throw new Error('inte i testet'); }
}));
const { PlainFikaScreen } = await import('../../strategic/scenario/FikaScreen');
afterEach(cleanup);

const FILE = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../../../documentation/blueprints/FIKA_VAGNEN_329.md'), 'utf8');
const NEW = ['fika-vagn-allergin', 'fika-vagn-regnet', 'fika-vagn-ursprunget', 'fika-vagn-getingen', 'fika-vagn-hunden', 'fika-vagn-nyanstalld', 'fika-vagn-handskarna'];

/** Filens avsnitt för ett dilemma: Nils fråga, A–C, förklaringen och lagtexten. */
function section(id: string) {
  const part = FILE.split(/\n## \d+\. /).find((x) => x.startsWith(id))!;
  const line = (re: RegExp) => part.match(re)?.[1].trim() ?? null;
  return {
    legal: /⚖/.test(part.split('\n')[0]),
    question: line(/\*\*Nils:\*\* "(.+)"/),
    A: line(/- \*\*A:\*\* (.+)/), B: line(/- \*\*B:\*\* (.+)/), C: line(/- \*\*C:\*\* (.+)/),
    explanation: line(/\*\*Förklaring:\*\* (.+)/),
    legalNote: line(/\*\*Lagtext:\*\* (.+)/)
  };
}

// En stilla vardagskväll: inget har hänt som utlöser ett dilemma.
function quiet(businessClass: 'foodtruck' | 'vinbar', fired: string[] = [], extra: Partial<SimulationState['day']> = {}): SimulationState {
  const s = makeNewGameState(5);
  const tuesday = firstDayOfWeek(2) + 1;
  return {
    ...s,
    economy: { ...s.economy, businessClass },
    incidents: { ...s.incidents!, enabled: true, fired },
    day: { ...s.day, dayNumber: tuesday, period: 'evening', turnedAwayFull: 0, walkedCount: 0, tipsSek: 0, stockBoughtToday: false, prepBacklogMin: 0, ...extra },
    staff: s.staff.map((m) => ({ ...m, stamina: 1, wellbeing: 0.8 })),
    fika: { tonight: null, log: [], loyalty: {} }
  } as SimulationState;
}

describe('ORDER 329 A — sju nya dilemman vid vagnen', () => {
  it('vagnen har tolv, lika många som vinbaren, och Nils frågar i alla', () => {
    expect(DILEMMAS.filter((d) => d.places.includes('truck')).length).toBe(12);
    expect(DILEMMAS.filter((d) => d.places.includes('wine')).length).toBe(12);
    for (const id of NEW) {
      const d = dilemmaById(id)!;
      expect([id, d.asker, d.places, d.options.map((o) => `${o.id}:${o.grade}`)]).toEqual([id, 'assistant', ['truck'], ['A:well', 'B:weakly', 'C:partly']]);
    }
  });

  it('utlösare, lagar och ekonomi som i filen; ⚖ ger legalReviewed false', () => {
    const want: Record<string, { triggers: unknown[]; laws: string[] | null; a?: unknown }> = {
      'fika-vagn-allergin': { triggers: [{ kind: 'incident', ids: ['ft05-allergin'] }], laws: ['EU 1169/2011'], a: [{ kind: 'suggestAbility', id: 'allergen' }] },
      'fika-vagn-regnet': { triggers: [{ kind: 'incident', ids: ['ft08-regnet'] }], laws: null },
      'fika-vagn-ursprunget': { triggers: [{ kind: 'incident', ids: ['ft07-ursprunget'] }], laws: null },
      'fika-vagn-getingen': { triggers: [{ kind: 'incident', ids: ['ft09-getingen'] }], laws: ['SFS 1977:1160'] },
      'fika-vagn-hunden': { triggers: [{ kind: 'incident', ids: ['ft12-hunden'] }], laws: null },
      'fika-vagn-nyanstalld': { triggers: [{ kind: 'teamChanged' }], laws: null, a: [{ kind: 'cost', key: 'extraHandSek' }] },
      'fika-vagn-handskarna': { triggers: [{ kind: 'prepBacklog' }, { kind: 'incident', ids: ['ft03-rullen'] }], laws: ['EG 852/2004'] }
    };
    for (const id of NEW) {
      const d = dilemmaById(id)!;
      expect(d.triggers, id).toEqual(want[id].triggers);
      expect(d.legal ? [...d.legal.laws] : null, id).toEqual(want[id].laws);
      expect(!!d.legal && d.legal.legalReviewed === false, id).toBe(section(id).legal);
      expect(d.options[0].economy ?? undefined, id).toEqual(want[id].a);
    }
  });

  it('svenskan är filens, och engelskan finns', () => {
    const sv = pickLang(TABLE, 'sv').fika.dilemmas, en = pickLang(TABLE, 'en').fika.dilemmas;
    for (const id of NEW) {
      const f = section(id), t = sv[id];
      expect([id, t.question, t.options.A, t.options.B, t.options.C, t.explanation, t.legalNote ?? null]).toEqual([id, f.question, f.A, f.B, f.C, f.explanation, f.legalNote]);
      const e = en[id];
      for (const x of [e.question, e.options.A, e.options.B, e.options.C, e.explanation]) expect((x ?? "").length, id).toBeGreaterThan(10);
      expect(!!e.legalNote, id).toBe(!!f.legalNote);
    }
  });

  it('varje dilemma kan komma i vagnen när det som utlöser det har hänt', () => {
    const cases: Record<string, SimulationState> = {
      'fika-vagn-allergin': quiet('foodtruck', ['ft05-allergin']),
      'fika-vagn-regnet': quiet('foodtruck', ['ft08-regnet']),
      'fika-vagn-ursprunget': quiet('foodtruck', ['ft07-ursprunget']),
      'fika-vagn-getingen': quiet('foodtruck', ['ft09-getingen']),
      'fika-vagn-hunden': quiet('foodtruck', ['ft12-hunden']),
      'fika-vagn-nyanstalld': { ...quiet('foodtruck'), teamChangedDay: quiet('foodtruck').day.dayNumber } as SimulationState,
      'fika-vagn-handskarna': quiet('foodtruck', ['ft03-rullen'])
    };
    for (const [id, s] of Object.entries(cases)) expect(eligibleDilemmas(s).map((d) => d.id), id).toContain(id);
    expect(eligibleDilemmas(quiet('vinbar', ['ft05-allergin'])).map((d) => d.id)).not.toContain('fika-vagn-allergin');
  });
});

describe('ORDER 329 B — vanligt fika', () => {
  it('passar inget dilemma: ingen fråga, laget +FIKA.plainWellbeing i trivsel, i vagnen och i vinbaren', () => {
    expect(FIKA.plainWellbeing).toBe(1);
    for (const cls of ['foodtruck', 'vinbar'] as const) {
      const s = quiet(cls);
      expect(eligibleDilemmas(s)).toEqual([]);
      const before = s.staff.map(wellbeingOf);
      planFika(s);
      expect([cls, fikaTonight(s), plainFikaTonight(s)]).toEqual([cls, null, true]);
      s.staff.forEach((m, i) => expect(wellbeingOf(m)).toBeCloseTo(before[i] + FIKA.plainWellbeing * FIKA.wellbeingPerPoint, 6));
    }
  });

  it('passar ett dilemma kommer dilemmat, inte det vanliga fikat', () => {
    const s = quiet('foodtruck', ['ft08-regnet']);
    planFika(s);
    expect(fikaTonight(s)?.dilemmaId).toBe('fika-vagn-regnet');
    expect(plainFikaTonight(s)).toBe(false);
  });

  it('kortet: en rad, Nils i vagnen och laget i vinbaren, på båda språken', () => {
    for (const [cls, key] of [['foodtruck', 'plainTruck'], ['vinbar', 'plainWine']] as const) {
      const s = quiet(cls);
      planFika(s);
      const view = render(createElement(PlainFikaScreen, { sim: s, onContinue: () => {} }));
      expect(view.getByTestId('fika-plain-line').textContent).toBe(pickLang(TABLE, 'en').fika[key]);
      expect(view.queryAllByTestId(/^fika-option-/)).toHaveLength(0);
      cleanup();
    }
    expect(pickLang(TABLE, 'sv').fika.plainTruck).toBe('Nils och du tar en kopp efter stängning.');
  });
});
