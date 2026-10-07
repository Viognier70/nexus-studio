// ORDER 313 (Anders 2026-10-06) — Åsa, början och tydligheten.
// §1 mentorn heter Intendent Åsa; §2 spelaren börjar från noll (satsningarna,
// butiken och "Stå för ditt svar" låsta tills första provet är klarat);
// §3 avsändarna; §4 Tre sätt att kunna (order301Kunskapsgrund.test.ts);
// §5 laget; §6 kurskortet; §7 teckenförklaringen; §9 Byn just nu.
// §8 (arbetsplatserna och flaskorna) prövas i scene/__tests__/order313Arbetsplatser.test.ts.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { bankQuestionById } from '../../strategic/knowledge/questionBank';
import { firstExamPassed, investLocked } from '../introduction';
import { STRINGS, TABLE, pickLang } from '../../content/nexusStrings';
import { ABILITY_LIST } from '../shop';
import { villageNow, villageNowSummary } from '../villageNow';
import { PLAYERS } from '../../strategic/testHarness/randomness';
import { ACTIVITY_CATALOGUE } from '../../strategic/simulation/activities';
import type { SimulationState } from '../../strategic/types';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(resolve(SRC, p), 'utf8');

function exam(s: SimulationState, correct: number): SimulationState {
  s = reducer(s, { type: 'VISIT_PAVILION', pavilion: 'stensota', mode: 'exam' });
  for (let i = 0; i < s.pavilionVisit!.questionIds.length; i++) {
    const q = bankQuestionById(s.pavilionVisit!.questionIds[i])!;
    s = reducer(s, { type: 'ANSWER_VISIT', chosenIndex: i < correct ? q.correctIndex : (q.correctIndex + 1) % q.options.length });
    s = reducer(s, { type: 'NEXT_VISIT_QUESTION' });
  }
  return reducer(s, { type: 'CLOSE_VISIT' });
}

describe('ORDER 313 §1 — Intendent Åsa', () => {
  it('mentorn heter Åsa i alla texter; Ingrid och "Mentorn" finns inte kvar', () => {
    for (const lang of ['sv', 'en'] as const) {
      const json = JSON.stringify(pickLang(TABLE, lang)) + JSON.stringify(Object.values(STRINGS).map((e) => e[lang]));
      expect(json).not.toMatch(/Ingrid|Mentorn|The Mentor|the Mentor/);
    }
    expect(pickLang(TABLE, 'sv').introduction.mentor).toBe('Intendent Åsa');
    expect(pickLang(TABLE, 'en').introduction.mentor).toBe('Intendant Åsa');
    expect(STRINGS['role.mentor'].sv).toBe('Intendent Åsa');
    expect(pickLang(TABLE, 'sv').prologue.mentor).toContain('Åsa');
  });
});

describe('ORDER 313 §2 — spelaren börjar från noll', () => {
  const newPlayer = () => reducer(makeNewGameState(7), { type: 'BEGIN_INTRODUCTION' });

  it('före första provet: satsningarna, butiken och Stå för ditt svar är låsta', () => {
    let s = newPlayer();
    expect(s.startLocked).toBe(true);
    expect(investLocked(s)).toBe(true);
    // Även med en verksamhet (t.ex. foodtrucken utan medalj) är det låst.
    s = { ...s, introduction: null, economy: { ...s.economy, businessClass: 'vinbar' } };
    const act = ACTIVITY_CATALOGUE[0].id;
    expect(reducer(s, { type: 'PICK_ACTIVITY', id: act }).day.pickedActivityIds).not.toContain(act);
    expect(reducer(s, { type: 'SHOP_BUY', id: ABILITY_LIST[0].id })).toBe(s);
  });

  it('klarat prov: låset släpper, och i introduktionen säger Åsa det i bankens steg', () => {
    let s = newPlayer();
    s = reducer(s, { type: 'VISIT_PAVILION', pavilion: 'stensota', mode: 'practice' });
    s = reducer(s, { type: 'CLOSE_VISIT' });
    s = exam(s, 3);
    expect(firstExamPassed(s)).toBe(false);
    expect(investLocked(s)).toBe(true);
    s = exam(s, 8);
    expect(firstExamPassed(s)).toBe(true);
    expect(investLocked(s)).toBe(false);
    expect(s.unlockSaid).toBe(true);
    expect(pickLang(TABLE, 'sv').introduction.steps.bank).toMatch(/^Nu har du visat vad du kan\. Banken lyssnar, och du kan börja satsa\./);
  });

  it('efter introduktionen: Åsas replik visas en gång (SAY_UNLOCKED)', () => {
    const s = { ...newPlayer(), introduction: null, medals: { stensota: 'brons' as const } };
    expect(s.unlockSaid ?? false).toBe(false);
    expect(reducer(s, { type: 'SAY_UNLOCKED' }).unlockSaid).toBe(true);
    expect(read('strategic/ui/screens/mentor.ts')).toContain("step = 'unlocked'");
  });

  it('spel och harness från före ORDER 313 låses inte; harness börjar med medaljer, så trappan påverkas inte', () => {
    const old = makeNewGameState(7);
    expect(investLocked(old)).toBe(false);
    const harness = { ...old, startLocked: true, medals: { ...PLAYERS.baseline } };
    expect(investLocked(harness)).toBe(false);
  });

  it('det låsta syns som låst, med raden om vad som öppnar det', () => {
    expect(pickLang(TABLE, 'sv').introduction.lockedUntilExam).toBe('Öppnas när du klarat ditt första prov');
    expect(read('strategic/business/MorningActivityPanel.tsx')).toContain('activity-locked');
    expect(read('strategic/ui/host/ShopScreen.tsx')).toContain('shop-locked');
  });
});

describe('ORDER 313 §3 — varje meddelande har en avsändare', () => {
  it('Åsa, Banken, Per, Byn och Måltidens hus står på sina meddelanden', () => {
    const where: Array<[string, string]> = [
      ['strategic/ui/MentorPanel.tsx', 'asa'],
      ['strategic/scenario/DayActionBar.tsx', 'asa'],
      ['strategic/scene/MentorComment.tsx', 'asa'],
      ['strategic/economy/BankDialog.tsx', 'bank'],
      ['strategic/ui/host/HostViews.tsx', 'per'],
      ['strategic/ui/MorningReviewLine.tsx', 'byn'],
      ['strategic/economy/NewspaperDialog.tsx', 'byn'],
      ['strategic/ui/VillageNotice.tsx', 'byn'],
      ['strategic/knowledge/ui/MaltidensHusDialog.tsx', 'house']
    ];
    for (const [file, sender] of where) expect(read(file), file).toContain(`<SenderTag sender="${sender}" />`);
    expect(pickLang(TABLE, 'sv').senders).toEqual({ asa: 'Åsa', bank: 'Banken', per: 'Per', byn: 'Byn', house: 'Måltidens hus' });
  });
});

describe('ORDER 313 §5–§7', () => {
  it('§5 laget: vad, kostnad per kväll och vad det ger; förklaringen överst', () => {
    const t = pickLang(TABLE, 'sv').team;
    expect(t.body).toBe('Laget är de som jobbar i kväll. Den du anställer stannar i sju dagar.');
    expect(t.row('Servitör', '1 000', t.gives['servitör'])).toBe('Servitör · 1 000 kr/kväll · tar beställningar och bär ut till borden');
  });

  it('§6 kurskortet: fyra rader i ordning, och knappen säger hur många krediter som fattas', () => {
    const ui = read('strategic/ui/host/ShopScreen.tsx');
    const order = ['data-row="teaches"', 'data-row="gives"', 'data-row="when"', 'data-row="needs"'].map((k) => ui.indexOf(k));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    for (const a of ABILITY_LIST) for (const lang of ['sv', 'en'] as const) expect((STRINGS as Record<string, { sv: string; en: string }>)[`ab.${a.id}.teaches`]?.[lang], a.id).toBeTruthy();
    expect(STRINGS['ab.sommBottle.teaches'].sv).toBe('Sommeliern lär sig sälja in en hel flaska.');
    expect(STRINGS['ab.sommBottle.fx'].sv).toBe('Vid loungerna säger fler ja till en flaska i stället för glas.');
    expect(STRINGS['shop.when'].sv).toBe('Från i morgon kväll.');
    expect(STRINGS['shop.shortBy'].sv).toBe('Du behöver {n} krediter till');
    expect(STRINGS['shop.cost'].sv).toBe('Kostar {price} krediter · du har {have}');
  });

  it('§7 teckenförklaringen i statusläget och i Spelets regler', () => {
    expect(read('strategic/StrategicApp.tsx')).toContain('<StatusLegend />');
    expect(read('strategic/ui/RulesPanel.tsx')).toContain('<StatusLegendBody />');
    expect(read('strategic/ui/StatusLegend.tsx')).toMatch(/ROLE_COLOUR[\s\S]*MOODS[\s\S]*WELLBEING_SYMBOL/);
  });
});

describe('ORDER 313 §9 — Byn just nu', () => {
  it('flest först, pilen efter takten, spelaren markerad, och raden som sammanfattar', () => {
    const now = [{ id: 'torgkrogen', kind: 'restaurant' as const, guests: 20 }, { id: 'player', kind: 'player' as const, guests: 12 }, { id: 'sjoboden', kind: 'restaurant' as const, guests: 8 }];
    const ago10 = [{ id: 'torgkrogen', kind: 'restaurant' as const, guests: 10 }, { id: 'player', kind: 'player' as const, guests: 9 }, { id: 'sjoboden', kind: 'restaurant' as const, guests: 8 }];
    const ago20 = [{ id: 'torgkrogen', kind: 'restaurant' as const, guests: 4 }, { id: 'player', kind: 'player' as const, guests: 2 }, { id: 'sjoboden', kind: 'restaurant' as const, guests: 5 }];
    const rows = villageNow(now, (m) => (m === 10 ? ago10 : m === 20 ? ago20 : null));
    expect(rows.map((r) => r.id)).toEqual(['torgkrogen', 'player', 'sjoboden']);
    expect(rows.map((r) => r.trend)).toEqual(['up', 'down', 'down']);
    expect(rows[1].player).toBe(true);
    const sum = villageNowSummary(rows);
    const v = pickLang(TABLE, 'sv').villageNow;
    expect(`${v.leads('Torgkrogen')} ${v.youAre(sum.playerRank!)}`).toBe('Torgkrogen drar flest gäster i kväll. Du är tvåa.');
    expect(villageNow(now, () => null).every((r) => r.trend === null)).toBe(true);
    expect(read('strategic/ui/host/RivalBand.tsx')).toContain('<VillageNowPanel />');
  });
});
