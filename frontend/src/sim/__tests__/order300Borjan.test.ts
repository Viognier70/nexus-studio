// ORDER 300 — början och layouten (Anders 2026-10-04).
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { STRINGS, TABLE, pickLang } from '../../content/nexusStrings';
import { beginIntroduction } from '../introduction';
import { makeNewGameState } from '../../strategic/simulation/model';
import { reducer } from '../../strategic/simulation/reducer';
import { effectiveSpeed } from '../../strategic/simulation/consequence';
import { rulesCardDue } from '../../strategic/ui/RulesPanel';
import { PREP_TIME, RISK, SEASON, STAR } from '../balance';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function leaves(x: unknown, out: string[] = []): string[] {
  if (typeof x === 'string') out.push(x);
  else if (typeof x === 'function') {
    try { const v = (x as (...a: unknown[]) => unknown)(1, 2, 3); if (typeof v === 'string') out.push(v); } catch { /* argument av annan sort */ }
  } else if (x && typeof x === 'object') for (const v of Object.values(x)) leaves(v, out);
  return out;
}

describe('ORDER 300 — början och layouten', () => {
  it('§3: ordet "schema" står inte i spelarens text, och morgonen säger Dagens val', () => {
    const sv = [...leaves(pickLang(TABLE, 'sv')), ...Object.values(STRINGS).map((v) => v.sv)];
    const en = [...leaves(pickLang(TABLE, 'en')), ...Object.values(STRINGS).map((v) => v.en)];
    expect(sv.filter((s) => /schema/i.test(s))).toEqual([]);
    expect(en.filter((s) => /schedule/i.test(s))).toEqual([]);
    expect(pickLang(TABLE, 'sv').morning.slots(0, 2)).toBe('Dagens val: 0 av 2');
    expect(pickLang(TABLE, 'sv').morning.sundayBody).toBe('Söndag. Krogen är stängd, och du har fyra val i dag.');
    expect(pickLang(TABLE, 'en').morning.sundayBody).toBe('Sunday. The restaurant is closed, and you have four choices today.');
  });

  it('§4: startskärmen går till namn och samtycke och sedan första morgonen, utan bussen', () => {
    const main = readFileSync(resolve(SRC, 'main.tsx'), 'utf8');
    expect(main).not.toMatch(/setFlow\('bus'\)/);
    // ORDER 308 — flödet är en reducer (strategic/opening/newGameFlow.ts); öppningen ligger mellan registreringen och morgonen.
    expect(main).toMatch(/useReducer\(newGameFlow, NEW_GAME_FLOW_START\)/);
    expect(readFileSync(resolve(SRC, 'strategic/opening/newGameFlow.ts'), 'utf8')).toMatch(/flow: 'start' \| 'introduction';/);
    const s = beginIntroduction(makeNewGameState(1), { name: 'Anders', consent: true });
    expect(s.player).toEqual({ name: 'Anders', consent: true });
    expect(s.introduction).toEqual({ practiced: false });
    expect(readFileSync(resolve(SRC, 'strategic/ui/MentorPanel.tsx'), 'utf8')).toMatch(/<Monogram /);
  });

  it('§5: regelkortet första morgonen, en gång, och talen ur balance.ts', () => {
    const s = beginIntroduction(makeNewGameState(1), { name: 'A', consent: false });
    expect(rulesCardDue(s)).toBe(true);
    const seen = reducer(s, { type: 'RULES_SEEN' });
    expect(rulesCardDue(seen)).toBe(false);
    const r = pickLang(TABLE, 'sv').rules;
    expect(r.tagline(r.numberWord[SEASON.weeks])).toContain('åtta veckor');
    expect(r.rule1(r.numberWord[RISK.closeAfterWeeksBelowZero])).toContain('tre bokslut');
    const star = r.star({ medal: 'guld', pavilion: 'Gastronomiska Teatern', reputation: Math.round(STAR.reputationAtLeast * 100), judgementPct: Math.round(STAR.judgementAtLeast * 100), minRockets: STAR.minRocketsInWeek, weeks: r.numberWord[STAR.weeksToEarn] });
    expect(star).toContain(`minst ${Math.round(STAR.reputationAtLeast * 100)} av 100`);
    expect(star).toContain(`${Math.round(STAR.judgementAtLeast * 100)} %`);
    // Inga tal skrivs i regeltexterna själva.
    for (const k of ['rule2', 'rule3', 'notMoney', 'notAnswers', 'notLuck'] as const) expect(r[k]).not.toMatch(/\d/);
  });

  it('§6: förberedelserna fram till dörröppningen går minst i PREP_TIME.speedAtLeast', () => {
    const base = makeNewGameState(1);
    const prep = { ...base, speed: 1 as const, simTime: 10, day: { ...base.day, period: 'dinner' as const, doorsOpenAt: 100, periodStartAt: 0 } };
    expect(effectiveSpeed(prep)).toBe(PREP_TIME.speedAtLeast);
    expect(effectiveSpeed({ ...prep, simTime: 120 })).toBe(1);
    expect(effectiveSpeed({ ...prep, speed: 0 as const })).toBe(0);
  });

  it('§6: nivåknapparna heter Byn (V) · Kvarteret (C) · Gatan (X) · Krogen (Z), och Tillbaka är borttagen', () => {
    const l = pickLang(TABLE, 'sv').village.levels;
    expect([l.withKey(l.village, 'V'), l.withKey(l.district, 'C'), l.withKey(l.street, 'X'), l.withKey(l.room, 'Z')]).toEqual(['Byn (V)', 'Kvarteret (C)', 'Gatan (X)', 'Krogen (Z)']);
    expect(readFileSync(resolve(SRC, 'strategic/StrategicApp.tsx'), 'utf8')).not.toMatch(/<OutwardButton/);
    expect(readFileSync(resolve(SRC, 'strategic/camera/useDesktopControls.ts'), 'utf8')).toMatch(/Escape'\) \{ if \(onJumpPreset\) onJumpPreset\('myBusiness'\)/);
    expect(pickLang(TABLE, 'sv').back.opensAt('19.05')).toBe('Öppnar 19.05');
  });

  it('§7: vår skylt visar namnet som "Tannin, din krog"', () => {
    expect(pickLang(TABLE, 'sv').village.playerNamed('Tannin')).toBe('Tannin, din krog');
  });
});
