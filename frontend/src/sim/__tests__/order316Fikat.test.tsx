// @vitest-environment jsdom
// ORDER 316 (Anders 2026-10-07, BESLUT del 1) — fikat efter stängning: de tolv
// dilemmana, högst ett per kväll, utlöst av kvällen; nivån synlig efter
// svaret; samma dilemma tidigast efter två veckor och portfolion visar om
// svaret förändrats; följderna (trivsel och lojalitet, ekonomin, krediter i
// Phronesis); Gå hem; lagtexten dold tills den är granskad (legalReviewed).

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { DILEMMAS, dilemmaById } from '../../content/fika/dilemmas';
import { TABLE, pickLang } from '../../content/nexusStrings';
import { setLanguage } from '../../content/language';
import { FIKA } from '../balance';
import { answerFika, eligibleDilemmas, fikaPending, fikaTonight, goHomeFika, loyaltyOf, planFika, prefersInspection } from '../fika';
import { wellbeingOf } from '../staffCondition';
import { playMorning, tickUntil } from '../../strategic/testHarness/weekHarness';
import { PLAYERS } from '../../strategic/testHarness/randomness';
import { firstDayOfWeek } from '../calendar';
import type { SimulationState } from '../../strategic/types';

const dispatched: unknown[] = [];
vi.mock('../../strategic/simulation/SimulationProvider', () => ({
  useSimDispatch: () => (a: unknown) => dispatched.push(a),
  useSimState: () => { throw new Error('inte i testet'); }
}));
const { FikaScreen } = await import('../../strategic/scenario/FikaScreen');

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// En kväll i vinbaren efter stängning, med kvällens tecken satta för hand.
function evening(day: Partial<SimulationState['day']> = {}, extra: Partial<SimulationState> = {}): SimulationState {
  const s = makeNewGameState(11);
  return {
    ...s,
    economy: { ...s.economy, businessClass: 'vinbar' },
    incidents: { ...s.incidents!, enabled: true, fired: [] },
    day: { ...s.day, dayNumber: firstDayOfWeek(2), period: 'evening', ...day },
    // Ett utvilat lag som trivs (inga utlösare ur personalen).
    staff: s.staff.map((m) => ({ ...m, stamina: 1, wellbeing: 0.85 })),
    ...extra
  };
}

afterEach(() => { cleanup(); setLanguage('en'); dispatched.length = 0; });

describe('ORDER 316 — dilemmana', () => {
  it('tolv dilemman med text på svenska och engelska för frågan, varje svar och förklaringen', () => {
    // ORDER 323 §5 — vinbarens tolv; vagnens fem prövas i order323Fikat.test.ts.
    expect(DILEMMAS.filter((d) => d.places.includes('wine'))).toHaveLength(12);
    for (const lang of ['sv', 'en'] as const) {
      const f = pickLang(TABLE, lang).fika;
      for (const d of DILEMMAS) {
        const t = f.dilemmas[d.id];
        expect(t.question.length, `${d.id} ${lang}`).toBeGreaterThan(20);
        expect(t.explanation.length).toBeGreaterThan(20);
        for (const o of d.options) expect(t.options[o.id], `${d.id} ${o.id} ${lang}`).toBeTruthy();
        expect(Object.keys(t.options).sort()).toEqual(d.options.map((o) => o.id).sort());
        // Varje ⚖-märkt dilemma har lagtexten, ogranskad utom kylboxen (Anders, ORDER 324b); de andra har ingen.
        if (d.legal) {
          expect(t.legalNote, d.id).toBeTruthy();
          expect(d.legal.legalReviewed).toBe(d.id === 'fika-vagn-kylboxen');
        } else {
          expect(t.legalNote).toBeUndefined();
        }
      }
      expect(f.people.dishwasher).toBe('Linnea');
    }
    // Varje dilemma har ett väl grundat svar och ett svagt grundat.
    for (const d of DILEMMAS) {
      expect(d.options.some((o) => o.grade === 'well'), d.id).toBe(true);
      expect(d.options.some((o) => o.grade === 'weakly'), d.id).toBe(true);
    }
  });

  it('Anders ändringar: tiden i kylen, AFS 2023:2, schemat märkt ⚖ och diskaren med namn', () => {
    const sv = pickLang(TABLE, 'sv').fika.dilemmas;
    expect(sv['fika-kylen'].question).toContain('i ungefär en timme');
    expect(dilemmaById('fika-kylen')!.options.find((o) => o.id === 'C')!.grade).toBe('partly');
    for (const id of ['fika-gransen', 'fika-skamten']) {
      expect(dilemmaById(id)!.legal!.laws).toContain('AFS 2023:2');
    }
    expect(dilemmaById('fika-schemat')!.legal).not.toBeNull();
    const text = readFileSync(resolve(SRC, 'content/fikaStrings.ts'), 'utf8') + readFileSync(resolve(SRC, 'content/fika/dilemmas.ts'), 'utf8');
    expect(text).not.toMatch(/AFS 2015:4"|'AFS 2015:4'/);
    expect(sv['fika-diskaren'].question).toContain('Linnea');
    expect(sv['fika-diskaren'].question).not.toMatch(/^Den nya diskaren/);
  });
});

describe('ORDER 316 — kvällens dilemma', () => {
  it('inget har hänt: inget dilemma', () => {
    const s = evening({ dayNumber: firstDayOfWeek(2) });
    // Måndag, ingen dricks, inga situationer, inget eftersläp, laget utvilat.
    const d = { ...s, staff: s.staff.map((m) => ({ ...m, stamina: 1, wellbeing: 0.75 })) };
    expect(eligibleDilemmas(d)).toEqual([]);
    planFika(d);
    expect(fikaTonight(d)).toBeNull();
  });

  it('kvällens dricks utlöser dricksen; högst ett dilemma per kväll', () => {
    const s = evening({ tipsSek: FIKA.tipsAtLeastSek });
    planFika(s);
    expect(fikaTonight(s)!.dilemmaId).toBe('fika-dricksen');
    expect(fikaPending(s)).toBe(true);
  });

  it('samma dilemma tidigast efter två veckor, och portfolion visar om svaret ändrats', () => {
    let s = evening({ tipsSek: 1000 });
    planFika(s);
    s = reducer(s, { type: 'FIKA_ANSWER', optionId: 'B' });
    const day = s.day.dayNumber;
    const later = (n: number) => { const x = { ...s, day: { ...s.day, dayNumber: day + n } }; planFika(x); return x; };
    expect(fikaTonight(later(FIKA.repeatAfterDays - 1))).toBeNull();
    const again = later(FIKA.repeatAfterDays);
    expect(fikaTonight(again)!.dilemmaId).toBe('fika-dricksen');
    expect(fikaTonight(again)!.previous!.optionId).toBe('B');
    const answered = reducer(again, { type: 'FIKA_ANSWER', optionId: 'A' });
    expect(answered.fika!.log.at(-1)).toMatchObject({ dilemmaId: 'fika-dricksen', optionId: 'A', grade: 'well', changed: true });
  });

  it('en kväll i vinbaren: dilemmat planeras när servicen stänger', () => {
    let s = makeNewGameState(3);
    s = { ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(1) + 4 } };
    s = playMorning(s, {});
    s = reducer(s, { type: 'START_SERVICE' });
    s = tickUntil(s, (x) => x.day.period === 'evening');
    // Fredag: dilemmat om baren kan alltid komma, så kvällen har ett.
    expect(fikaTonight(s)).not.toBeNull();
    expect(s.day.eveningStep === 'waste' || s.day.eveningStep === 'transfer').toBe(true);
  });
});

describe('ORDER 316 — följderna', () => {
  it('väl grundat: trivsel +2 för laget och dubbelt för den som frågade, lojalitet, 3 krediter i Phronesis', () => {
    // Kylen: Jonas (kocken) frågar.
    let s = evening({ prepBacklogMin: 20 });
    planFika(s);
    expect(fikaTonight(s)!.dilemmaId).toBe('fika-kylen');
    const before = s;
    const cashBefore = s.cash;
    s = reducer(s, { type: 'FIKA_ANSWER', optionId: 'A' });
    const p = FIKA.wellbeingPerPoint;
    for (const m of s.staff) {
      const was = wellbeingOf(before.staff.find((x) => x.id === m.id)!);
      const want = m.role === 'kock' ? 4 * p : 2 * p;
      expect(wellbeingOf(m) - was).toBeCloseTo(Math.min(1 - was, want), 6);
    }
    expect(loyaltyOf(s, 'cook')).toBeCloseTo(FIKA.loyaltyStart + 2 * FIKA.loyaltyPerPoint, 6);
    expect(loyaltyOf(s, 'server')).toBeCloseTo(FIKA.loyaltyStart + FIKA.loyaltyPerPoint, 6);
    expect(s.knowledgeCredits.phronesis - before.knowledgeCredits.phronesis).toBe(FIKA.credits.well);
    // Ekonomin: varorna kastas.
    expect(cashBefore - s.cash).toBe(FIKA.economy.discardGoodsSek);
    expect(s.fika!.tonight!.outcome).toMatchObject({ grade: 'well', credits: 3, costSek: FIKA.economy.discardGoodsSek });
  });

  it('svagt grundat: trivseln sjunker, inga krediter och tillsynen kommer oftare tre kvällar', () => {
    let s = evening({ prepBacklogMin: 20 });
    planFika(s);
    const before = s;
    s = reducer(s, { type: 'FIKA_ANSWER', optionId: 'B' });
    expect(s.knowledgeCredits.phronesis).toBe(before.knowledgeCredits.phronesis);
    expect(wellbeingOf(s.staff[0])).toBeLessThan(wellbeingOf(before.staff[0]));
    expect(s.fika!.inspectionRiskUntilDay).toBe(s.day.dayNumber + FIKA.economy.inspectionEvenings);
    const days = Array.from({ length: 200 }, (_, i) => ({ ...s, seed: i }));
    const share = days.filter((x) => prefersInspection(x, 0)).length / days.length;
    expect(share).toBeGreaterThan(FIKA.economy.inspectionShare - 0.12);
    expect(share).toBeLessThan(FIKA.economy.inspectionShare + 0.12);
    const after = { ...s, day: { ...s.day, dayNumber: s.day.dayNumber + FIKA.economy.inspectionEvenings + 1 } };
    expect(prefersInspection(after, 0)).toBe(false);
  });

  it('Gå hem: hela laget −1 i trivsel; ett obesvarat dilemma räknas som Gå hem när kvällen tar slut', () => {
    let s = evening({ tipsSek: 1000 });
    planFika(s);
    const before = s;
    const home = reducer(s, { type: 'FIKA_GO_HOME' });
    expect(home.fika!.tonight!.answer).toBe('home');
    expect(wellbeingOf(home.staff[0]) - wellbeingOf(before.staff[0])).toBeCloseTo(FIKA.goHomeWellbeing * FIKA.wellbeingPerPoint, 6);
    expect(home.fika!.log.at(-1)).toMatchObject({ optionId: null, grade: null });
    // Kvällen tar slut utan svar.
    s = reducer(s, { type: 'END_EVENING' });
    s = tickUntil(s, (x) => x.day.period === 'morning');
    expect(s.fika!.log.at(-1)).toMatchObject({ dilemmaId: 'fika-dricksen', optionId: null });
    // Ett svar går inte att ändra.
    const draft = { ...home };
    expect(answerFika(draft, 'A')).toBeNull();
    expect(goHomeFika(draft)).toBe(false);
  });

  it('kvällens skärmar: fikat efter berättelsen och före byn och butiken', () => {
    let s = evening({ tipsSek: 1000, eveningStep: 'story' });
    planFika(s);
    s = reducer(s, { type: 'EVENING_STEP', to: 'fika' });
    expect(s.day.eveningStep).toBe('fika');
    expect(reducer(s, { type: 'EVENING_STEP', to: 'story' }).day.eveningStep).toBe('fika');
    expect(reducer(s, { type: 'EVENING_STEP', to: 'shop' }).day.eveningStep).toBe('shop');
  });
});

describe('ORDER 316 — kortet', () => {
  for (const lang of ['sv', 'en'] as const) {
    it(`frågan och svaren, sedan nivån mjukt ovanför förklaringen; lagtexten dold (${lang})`, () => {
      setLanguage(lang);
      const f = pickLang(TABLE, lang).fika;
      let s = evening({ prepBacklogMin: 20 });
      planFika(s);
      const view = render(createElement(FikaScreen, { sim: s, onContinue: () => {} }));
      expect(view.getByTestId('fika-question').textContent).toContain(f.dilemmas['fika-kylen'].question);
      expect(view.getByTestId('fika-asker').textContent).toContain('Jonas');
      expect(view.getAllByTestId(/^fika-option-/)).toHaveLength(4);
      view.getByTestId('fika-option-C').click();
      expect(dispatched.at(-1)).toEqual({ type: 'FIKA_ANSWER', optionId: 'C' });
      act(() => { s = reducer(s, { type: 'FIKA_ANSWER', optionId: 'C' }); });
      view.rerender(createElement(FikaScreen, { sim: s, onContinue: () => {} }));
      const grade = view.getByTestId('fika-grade');
      expect(grade.textContent).toBe(f.grade.partly);
      // Nivån står ovanför förklaringen, och inget är rött.
      expect(grade.compareDocumentPosition(view.getByTestId('fika-explanation')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      // (ingen klass eller stil med rött, fel eller fara; fika.css har inget rött).
      const marks = [...view.container.querySelectorAll('*')].map((el) => `${el.getAttribute('class') ?? ''} ${el.getAttribute('style') ?? ''} ${el.getAttribute('data-tone') ?? ''}`).join(' ');
      expect(marks).not.toMatch(/red|danger|wrong|error|bad/i);
      // ORDER 315b del 2 — ordet "red" som ord (prefers-reduced-motion är tillåtet).
      expect(readFileSync(resolve(SRC, 'strategic/scenario/fika.css'), 'utf8')).not.toMatch(/\bred\b|#c[0-9a-f]{2}0{2}|--nx-(danger|bad|wrong)/i);
      // Kylen är ⚖ och ogranskad: lagtexten visas inte, resten gör det.
      expect(view.queryByTestId('fika-legal')).toBeNull();
      expect(view.container.textContent).not.toContain(f.dilemmas['fika-kylen'].legalNote!);
      expect(view.container.textContent).not.toMatch(/2006:804|852\/2004/);
      expect(view.getByTestId('fika-effects').textContent).toContain(f.credits(1));
    });
  }

  it('Gå hem finns alltid och raden säger att chefen inte hade tid', () => {
    let s = evening({ tipsSek: 1000 });
    planFika(s);
    const view = render(createElement(FikaScreen, { sim: s, onContinue: () => {} }));
    view.getByTestId('fika-go-home').click();
    expect(dispatched.at(-1)).toEqual({ type: 'FIKA_GO_HOME' });
    s = reducer(s, { type: 'FIKA_GO_HOME' });
    view.rerender(createElement(FikaScreen, { sim: s, onContinue: () => {} }));
    expect(view.getByTestId('fika-went-home').textContent).toBe(pickLang(TABLE, 'en').fika.wentHome);
  });
});
