// ORDER 300b — början, efter Anders beslut 2026-10-05: samtyckestextens
// andra stycke (forskningen), regel 1 med "i rad", och skripten utan bussen.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TABLE, pickLang } from '../../content/nexusStrings';
import { beginIntroduction } from '../introduction';
import { makeNewGameState } from '../../strategic/simulation/model';
import { reducer } from '../../strategic/simulation/reducer';
import { RISK } from '../balance';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPTS = resolve(SRC, '../scripts');
const read = (p: string) => readFileSync(resolve(SRC, p), 'utf8');

describe('ORDER 300b — början', () => {
  it('samtyckestexten har ett andra stycke om forskningen, på svenska och engelska, märkt som preliminärt', () => {
    const sv = pickLang(TABLE, 'sv').introduction.register;
    const en = pickLang(TABLE, 'en').introduction.register;
    expect(sv.researchBody).toBe('Nexus kan spara dina val anonymt för forskning om hur professionell kompetens utvecklas, vid Campus Grythyttan, Örebro universitet. Det är frivilligt, och du kan spela fullt ut utan att delta. Du kan ändra dig när som helst i menyn.');
    expect([sv.researchYes, sv.researchNo]).toEqual(['Jag vill delta', 'Nej tack']);
    expect(en.researchBody).toMatch(/anonymously for research/);
    expect([en.researchYes, en.researchNo]).toEqual(['I want to take part', 'No thanks']);
    expect(read('content/nexusStrings.ts')).toMatch(/PRELIMINÄR TEXT, i\s*\n?\s*\/\/ väntan på etikprövning/);
    const card = read('strategic/business/NameEntryOverlay.tsx');
    expect(card).toMatch(/reg\.researchBody/);
    expect(card).toMatch(/data-testid="register-research-yes"/);
    expect(card).toMatch(/data-testid="register-research-no"/);
    expect(card).toMatch(/etikprövning/);
  });

  it('svaret sparas i speltillståndet, skilt från underskriften, och kan ändras i menyn', () => {
    const yes = beginIntroduction(makeNewGameState(1), { name: 'Anders', consent: false, research: true });
    expect(yes.player).toEqual({ name: 'Anders', consent: false, research: true });
    const no = reducer(yes, { type: 'SET_RESEARCH_CONSENT', on: false });
    expect(no.player).toEqual({ name: 'Anders', consent: false, research: false });
    expect(reducer(no, { type: 'SET_RESEARCH_CONSENT', on: true }).player?.research).toBe(true);
    // Utan registrering finns inget svar att ändra.
    const none = makeNewGameState(1);
    expect(reducer(none, { type: 'SET_RESEARCH_CONSENT', on: true }).player).toBeUndefined();
    const menu = read('strategic/ui/TopRightMenu.tsx');
    expect(menu).toMatch(/data-testid="menu-research"/);
    expect(menu).toMatch(/type: 'SET_RESEARCH_CONSENT', on/);
  });

  it('ingen data skickas: kortet, menyn, introduktionen och reducern gör inga nätverksanrop', () => {
    for (const p of ['strategic/business/NameEntryOverlay.tsx', 'strategic/ui/TopRightMenu.tsx', 'sim/introduction.ts', 'strategic/simulation/reducer.ts']) {
      expect(read(p)).not.toMatch(/\bfetch\(|sendBeacon|XMLHttpRequest|WebSocket|https?:\/\//);
    }
  });

  it('regel 1: "Klarar du veckans mål blir krogen kvar. Tre bokslut under noll i rad, och den stänger."', () => {
    const r = pickLang(TABLE, 'sv').rules;
    const w = r.numberWord[RISK.closeAfterWeeksBelowZero];
    expect(r.rule1(w[0].toUpperCase() + w.slice(1))).toBe('Klarar du veckans mål blir krogen kvar. Tre bokslut under noll i rad, och den stänger.');
    const e = pickLang(TABLE, 'en').rules;
    expect(e.rule1('Three')).toBe("Meet the week's target and the restaurant stays. Three settlements below zero in a row, and it closes.");
  });

  it('inget skript börjar längre med bussen', () => {
    for (const f of readdirSync(SCRIPTS).filter((x) => x.endsWith('.mjs'))) {
      const s = readFileSync(resolve(SCRIPTS, f), 'utf8');
      expect(s, f).not.toMatch(/\.bus-stage|\.end-buttons/);
    }
  });
});
