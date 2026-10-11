// @vitest-environment jsdom
// ORDER 330 (Anders 2026-10-11) — A. talarmärket i inledningen och i bankens samtal: namnet och rollen under bilden,
// repliken till höger i en egen kolumn (SpeakerLine); B. varje talare i inledningen har en bild (Åsa sitt porträtt,
// banken och Måltidens hus sin ikon); C. bankens diagnos dag 1 innan spelaren har gjort något.

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { SenderTag, SpeakerLine, type Sender } from '../SenderTag';
import { bankDiagnosisInWords, bankNothingYet, shownInWords } from '../../economy/BankDialog';
import { makeNewGameState } from '../../simulation/model';
import { reducer } from '../../simulation/reducer';
import { TABLE, pickLang } from '../../../content/nexusStrings';
import type { SimulationState } from '../../types';

afterEach(cleanup);

describe('ORDER 330 A och B — talarmärket', () => {
  it('talarraden: märket (bilden, namnet och rollen under) och repliken bredvid, i var sin kolumn', () => {
    const view = render(createElement(SpeakerLine, { sender: 'bank', children: createElement('p', null, 'Hej') }));
    const line = view.getByTestId('speaker-line');
    const [tag, text] = [...line.children];
    expect(tag.classList.contains('nx-sender-stacked')).toBe(true);
    expect(text.getAttribute('data-testid')).toBe('speaker-text');
    expect(text.textContent).toBe('Hej');
    // Bilden först, sedan namnet och rollen, aldrig i bilden.
    const kids = [...tag.children].map((c) => c.getAttribute('class') ?? c.tagName.toLowerCase());
    expect(kids[0]).toMatch(/nx-sender-badge|nx-sender-portrait/);
    expect(kids.slice(1)).toEqual(['nx-sender-name', 'nx-sender-sub']);
    expect(tag.querySelector('.nx-sender-badge .nx-sender-name, .nx-sender-portrait .nx-sender-name')).toBeNull();
  });

  it('varje talare i inledningen har en bild: Åsa sitt porträtt, banken och Måltidens hus sin ikon', () => {
    for (const s of ['asa', 'bank', 'house', 'per', 'byn'] as Sender[]) {
      const view = render(createElement(SenderTag, { sender: s, stacked: true }));
      const img = view.container.querySelector(s === 'asa' ? '[data-testid=portrait-asa]' : 'svg.nx-sender-badge');
      expect(img, s).not.toBeNull();
      cleanup();
    }
  });
});

describe('ORDER 330 C — bankens diagnos dag 1', () => {
  // Spelarens nya spel: introduktionen, utan verksamhet (sim/introduction.ts).
  const day1 = () => reducer(makeNewGameState(3), { type: 'BEGIN_INTRODUCTION' }) as SimulationState;
  it('dag 1 innan spelaren har gjort något: "Du har inte börjat än …"', () => {
    const s = day1();
    expect(bankNothingYet(s)).toBe(true);
    expect(bankDiagnosisInWords(s)).toBe(pickLang(TABLE, 'en').economy.bankDayOne);
    expect(pickLang(TABLE, 'sv').economy.bankDayOne).toBe('Du har inte börjat än. När du har visat vad du kan i Måltidens hus, till exempel med en medalj, kan vi prata om lån.');
  });
  it('efter en övning, ett prov, en medalj eller dag 2: den vanliga diagnosen', () => {
    const s = day1();
    for (const x of [
      { ...s, introduction: { practiced: true } },
      { ...s, examsTaken: 1 },
      { ...s, medals: { stensota: 'brons' } },
      { ...s, day: { ...s.day, dayNumber: 2 } }
    ] as SimulationState[]) {
      expect(bankNothingYet(x)).toBe(false);
      expect(bankDiagnosisInWords(x)).toBe(shownInWords(x.medals));
    }
  });
});
