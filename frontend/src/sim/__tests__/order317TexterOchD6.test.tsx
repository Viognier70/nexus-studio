// @vitest-environment jsdom
// ORDER 317 (Anders 2026-10-07) — texterna från 314 ("Situation n i kväll",
// "Går tiden ut tar personalen över", inget "raket" i spelarens text), Designs
// D6 del 1 (Intendent Åsa, på engelska Curator Åsa; modellen, klippen,
// porträttet och pratbubblan, öppningen) och del 2 (avsändarna också för
// personalen, kockens ring #7fa8ff, teckenförklaringen, kurskortet, det låsta).

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { STRINGS, TABLE, pickLang } from '../../content/nexusStrings';
import { setLanguage } from '../../content/language';
import { ROLE_RING as STATUS_RING } from '../../strategic/scene/staffStatus';
import { ROLE_COLOUR } from '../../strategic/scene/staffRing';
import { ROLE_RING as D6_RING } from '../../strategic/ui/d6Ui';
import { CLIPS } from '../../strategic/scene/figureClips';
import { MENTOR } from '../../strategic/opening/oppningManus';
import { SenderTag } from '../../strategic/ui/SenderTag';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { bankQuestionById } from '../../strategic/knowledge/questionBank';
import type { SimulationState } from '../../strategic/types';

afterEach(() => { cleanup(); setLanguage('en'); });

function leaves(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (typeof v === 'function') { try { const r = (v as (...a: unknown[]) => unknown)('3', '8', 3, 8); if (typeof r === 'string') out.push(r); } catch { /* inte en textfunktion */ } }
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => leaves(x, out));
  return out;
}

describe('ORDER 317 — texterna från 314', () => {
  for (const lang of ['sv', 'en'] as const) {
    it(`inget "raket" i spelarens text, och "Situation n i kväll" (${lang})`, () => {
      const text = [...leaves(pickLang(TABLE, lang)), ...Object.values(STRINGS).map((e) => e[lang])];
      expect(text.filter((t) => /raket|rocket/i.test(t))).toEqual([]);
      const t = pickLang(TABLE, lang);
      expect(t.rocket.card.rocketN('3')).toBe(lang === 'sv' ? 'Situation 3 i kväll' : 'Situation 3 tonight');
    });
  }

  it('"Går tiden ut tar personalen över" ersätter "räknas det som fel svar"', () => {
    expect(STRINGS['rocket.foot'].sv).toBe('Rummet väntar inte. Går tiden ut tar personalen över.');
    const sv = [...leaves(pickLang(TABLE, 'sv')), ...Object.values(STRINGS).map((e) => e.sv)];
    expect(sv.filter((t) => /räknas det som fel svar/.test(t))).toEqual([]);
    const en = [...leaves(pickLang(TABLE, 'en')), ...Object.values(STRINGS).map((e) => e.en)];
    expect(en.filter((t) => /counts as a wrong answer/.test(t))).toEqual([]);
  });
});

describe('ORDER 317 — Designs D6, Åsa', () => {
  it('Intendent Åsa, på engelska Curator Åsa', () => {
    expect(STRINGS['asa.name']).toEqual({ sv: 'Intendent Åsa', en: 'Curator Åsa' });
    expect(pickLang(TABLE, 'en').introduction.mentor).toBe('Curator Åsa');
    const en = [...leaves(pickLang(TABLE, 'en')), ...Object.values(STRINGS).map((e) => e.en)];
    expect(en.filter((t) => /Intendant|Ingrid/.test(t))).toEqual([]);
  });

  it('klippen asa.greet, asa.point och asa.nodApprove med Designs längder', () => {
    expect(CLIPS['asa.greet'].seconds).toMatchObject({ calm: 3.0, normal: 2.4 });
    expect(CLIPS['asa.point'].seconds).toMatchObject({ calm: 3.25, normal: 2.6 });
    expect(CLIPS['asa.nodApprove'].seconds).toMatchObject({ calm: 2.75, normal: 2.2 });
  });

  it('öppningen: Åsa i Ingrids ställe, hon hälsar vid greetAt', () => {
    expect(MENTOR.who).toBe('asa');
    expect(MENTOR.greetAt).toBeGreaterThan(MENTOR.glanceAt);
  });
});

describe('ORDER 317 — Designs D6 del 2', () => {
  it('kockens ring är #7fa8ff i rummet, statusläget och teckenförklaringen (samma tabell)', () => {
    expect(D6_RING.cook).toBe('#7fa8ff');
    expect(STATUS_RING.cook).toBe('#7fa8ff');
    expect(ROLE_COLOUR.cook).toBe('#7fa8ff');
    expect(STATUS_RING).toEqual(ROLE_COLOUR);
  });

  it('avsändarna: märket, namnet och raden; personalen som "namn, roll"', () => {
    setLanguage('sv');
    const bank = render(createElement(SenderTag, { sender: 'bank' }));
    expect(bank.container.querySelector('svg.nx-sender-badge')).toBeTruthy();
    expect(bank.container.textContent).toBe('BankenLån och satsningar');
    cleanup();
    const staff = render(createElement(SenderTag, { sender: 'staff', staff: { person: 'server', ring: 'waiter' } }));
    expect(staff.container.textContent).toContain('Sara, servitör');
    expect((staff.container.querySelector('.nx-sender-initial') as HTMLElement).style.borderColor).toBe('rgb(79, 195, 200)');
  });

  it('det låsta i början: dagen låset släpper sparas (brickan Öppet nu den morgonen)', () => {
    let s: SimulationState = reducer(makeNewGameState(7), { type: 'BEGIN_INTRODUCTION' });
    s = reducer(s, { type: 'VISIT_PAVILION', pavilion: 'stensota', mode: 'exam' });
    for (let i = 0; i < s.pavilionVisit!.questionIds.length; i++) {
      const q = bankQuestionById(s.pavilionVisit!.questionIds[i])!;
      s = reducer(s, { type: 'ANSWER_VISIT', chosenIndex: q.correctIndex });
      s = reducer(s, { type: 'NEXT_VISIT_QUESTION' });
    }
    expect(s.startUnlockedDay).toBe(s.day.dayNumber);
  });
});
