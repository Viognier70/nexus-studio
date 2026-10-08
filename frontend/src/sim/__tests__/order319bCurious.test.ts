// ORDER 319b — de nyfikna vid foodtruckens lucka (sim/curious.ts). Anders 2026-10-07 (ORDRAR_319_D9.md)
// och 2026-10-08: klicket öppnar frågekortet; rätt ställer sig i kön (ibland med en vän), nästan tvekar
// och köper kanske, fel går vidare; utan svar går gästen vidare efter 20 s; högst en nyfiken åt gången;
// små krediter och svaret i portfolion.
// ORDER 319b del 2 (Anders 2026-10-08): frågorna i gästens egen röst (sim/curiousBank.ts,
// NYFIKNA_FRAGOR_319.md), efter vad gästen gör, med blandade svar, ⚖ dolda tills de är granskade; och
// kunskapen syns på tre sätt i stället för mer kapacitet: större köp, stamgäster och rykte.

import { describe, expect, it } from 'vitest';
import { playMorning, startInFoodtruck } from '../../strategic/testHarness/weekHarness';
import { reducer } from '../../strategic/simulation/reducer';
import { effectiveSpeed } from '../../strategic/simulation/consequence';
import { calendarFor, firstDayOfWeek } from '../calendar';
import { CURIOUS, REPUTATION } from '../balance';
import { curiousMoment, curiousOf, curiousTalkable } from '../curious';
import { CURIOUS_FILES, CURIOUS_QUESTIONS, CURIOUS_TRIGGERS, curiousQuestion, validateCuriousBank } from '../curiousBank';
import type { SimulationState } from '../../strategic/types';
import { TABLE, t as tt } from '../../content/nexusStrings';
import { makePlayerTrailer } from '../../strategic/scene/playerTruck';

const TICK = { type: 'TICK', dt: 0.2 } as const;

function open(seed = 1, day = firstDayOfWeek(1)): SimulationState {
  const s = startInFoodtruck(seed, day);
  return reducer(playMorning(s, { scenarioAnswer: 'best', ladder: 'never' }), { type: 'START_SERVICE' });
}

/** Tickar tills villkoret gäller (eller kvällen är slut). Situationerna avgörs av tiden. */
function until(s: SimulationState, done: (s: SimulationState) => boolean, max = 20000): SimulationState {
  for (let i = 0; i < max && !done(s); i++) {
    s = reducer(s, TICK);
    if (s.day.period !== 'dinner') break;
  }
  return s;
}

const talkable = (s: SimulationState) => curiousTalkable(s);
const card = (s: SimulationState) => curiousOf(s).current!.card!;
const option = (s: SimulationState, q: 'right' | 'ok' | 'wrong') => curiousQuestion(card(s).questionId)!.options.find((o) => o.quality === q);

describe('ORDER 319b — de nyfikna vid luckan', () => {
  it('en förbipasserande blir nyfiken under servicen, en åt gången, och fönstret är 20 s', () => {
    let s = until(open(), talkable);
    expect(talkable(s)).toBe(true);
    const seq = curiousOf(s).current!.seq;
    let maxCurrent = 0;
    for (let i = 0; i < 2000 && curiousOf(s).current?.seq === seq; i++) {
      s = reducer(s, TICK);
      maxCurrent = Math.max(maxCurrent, curiousOf(s).current ? 1 : 0);
    }
    expect(CURIOUS.windowSeconds).toBe(20);
    expect(curiousOf(s).last?.seq).toBe(seq);
    expect(curiousOf(s).last?.outcome).toBe('walkOn');
    expect(curiousOf(s).tonight.unanswered).toBe(1);
    expect(maxCurrent).toBe(1);
  });

  it('klicket öppnar kortet med en granskad fråga efter vad gästen gör, med blandade svar, och kvällen går i 1×', () => {
    let s = until(open(), talkable);
    s = { ...s, speed: 2 };
    const moment = curiousMoment(curiousOf(s).current!, false);
    s = reducer(s, { type: 'CURIOUS_OPEN' });
    const c = card(s);
    expect(c.total).toBe(CURIOUS.card.seconds);
    expect(c.moment).toBe(moment);
    const q = curiousQuestion(c.questionId)!;
    expect(CURIOUS_QUESTIONS).toContain(q);
    expect(q.trigger).toBe(moment);
    expect([...c.order].sort()).toEqual(q.options.map((o) => o.id).sort());
    expect(effectiveSpeed(s)).toBe(1);
    for (let i = 0; i < 20; i++) s = reducer(s, TICK);
    expect(s.incidents?.active ?? null).toBe(null);
  });

  it('rätt svar: kön, en liten kredit, ett större köp, ryktet stiger och svaret i portfolion', () => {
    let s = until(open(), talkable);
    s = reducer(s, { type: 'CURIOUS_OPEN' });
    const c = card(s);
    const right = option(s, 'right')!;
    const before = s.knowledgeCredits[c.axis];
    const rep = s.reputation;
    s = reducer(s, { type: 'CURIOUS_ANSWER', optionId: right.id });
    const last = curiousOf(s).last!;
    expect(last).toMatchObject({ outcome: 'join', grade: 'right' });
    const g = s.guests.find((x) => x.id === last.guestId)!;
    expect(g.fromCurious).toBe(true);
    expect(g.billBonus).toBeCloseTo(CURIOUS.rightBillBonus);
    expect(s.knowledgeCredits[c.axis]).toBeCloseTo(before + CURIOUS.creditRight);
    expect(s.reputation).toBeCloseTo(rep + CURIOUS.reputationRight / REPUTATION.scale);
    expect(s.curiousLog?.at(-1)).toMatchObject({ questionId: c.questionId, optionId: right.id, grade: 'right', outcome: 'join' });
  });

  it('fel svar: gästen går vidare, ingen kredit och inget rykte; nästan: gästen tvekar och bestämmer sig sedan', () => {
    let s = until(open(), talkable);
    s = reducer(s, { type: 'CURIOUS_OPEN' });
    const credits = { ...s.knowledgeCredits };
    const rep = s.reputation;
    s = reducer(s, { type: 'CURIOUS_ANSWER', optionId: option(s, 'wrong')!.id });
    expect(curiousOf(s).last).toMatchObject({ outcome: 'walkOn', grade: 'wrong', guestId: null });
    expect(s.knowledgeCredits).toEqual(credits);
    expect(s.reputation).toBe(rep);
    s = until(s, talkable);
    s = reducer(s, { type: 'CURIOUS_OPEN' });
    const seq = curiousOf(s).current!.seq;
    s = reducer(s, { type: 'CURIOUS_ANSWER', optionId: option(s, 'ok')!.id });
    expect(curiousOf(s).current?.okLeft).toBe(CURIOUS.okHoldSeconds);
    s = until(s, (x) => curiousOf(x).current?.seq !== seq);
    expect(curiousOf(s).last).toMatchObject({ seq, grade: 'ok' });
  });

  it('samma fråga kommer inte två gånger samma kväll', () => {
    let s = open(3);
    const asked: string[] = [];
    for (let k = 0; k < 8; k++) {
      s = until(s, talkable);
      if (s.day.period !== 'dinner') break;
      s = reducer(s, { type: 'CURIOUS_OPEN' });
      asked.push(card(s).questionId);
      s = reducer(s, { type: 'CURIOUS_ANSWER', optionId: card(s).order[0] });
    }
    expect(asked.length).toBeGreaterThan(4);
    expect(new Set(asked).size).toBe(asked.length);
  });

  it('en stamgäst efter rätt svar kommer tillbaka en senare kväll och köper lika mycket', () => {
    let s = open(2);
    for (let k = 0; k < 12 && (s.curiousRegulars ?? []).length === 0; k++) {
      s = until(s, talkable);
      if (s.day.period !== 'dinner') break;
      s = reducer(s, { type: 'CURIOUS_OPEN' });
      s = reducer(s, { type: 'CURIOUS_ANSWER', optionId: option(s, 'right')!.id });
    }
    const r = s.curiousRegulars![0];
    expect(r.dueDay).toBeGreaterThan(s.day.dayNumber);
    expect(calendarFor(r.dueDay).isServiceDay).toBe(true);
    // Samma stamgäst på sin kväll: kommer under servicen.
    let later = open(2, r.dueDay);
    later = { ...later, curiousRegulars: [r] };
    later = until(later, (x) => curiousOf(x).tonight.regulars > 0);
    expect(curiousOf(later).tonight.regulars).toBe(1);
    expect(later.curiousRegulars).toEqual([]);
    const g = later.guests.find((x) => x.curiousRegular)!;
    expect(g.billBonus).toBeCloseTo(CURIOUS.rightBillBonus);
  });

  it('inga nyfikna utanför foodtrucken', () => {
    let s = open();
    s = { ...s, economy: { ...s.economy, businessClass: 'vinbar' } };
    for (let i = 0; i < 1500; i++) s = reducer(s, TICK);
    expect(curiousOf(s).tonight.passersBy).toBe(0);
  });
});

describe('ORDER 319b del 2 — de nyfiknas frågor (NYFIKNA_FRAGOR_319.md)', () => {
  it('20 frågor med text på svenska och engelska, fyra svar, ett rätt och minst ett fel', () => {
    expect(CURIOUS_FILES.meta.questions).toHaveLength(20);
    expect(validateCuriousBank(CURIOUS_FILES.meta, [CURIOUS_FILES.sv, CURIOUS_FILES.en])).toEqual([]);
  });

  it('utlösarna: skylten n01–n06, röken n07–n12, kylan n13–n15, priset n16–n17, barn n18–n20', () => {
    const by = (t: string) => CURIOUS_FILES.meta.questions.filter((q) => q.trigger === t).map((q) => q.id);
    expect(by('sign')).toEqual(['n01', 'n02', 'n03', 'n04', 'n05', 'n06']);
    expect(by('smell')).toEqual(['n07', 'n08', 'n09', 'n10', 'n11', 'n12']);
    expect(by('cold')).toEqual(['n13', 'n14', 'n15']);
    expect(by('price')).toEqual(['n16', 'n17']);
    expect(by('child')).toEqual(['n18', 'n19', 'n20']);
    expect(CURIOUS_TRIGGERS).toHaveLength(5);
  });

  it('⚖: n09, n12 och n19 är dolda tills de är granskade, och ingen annan fråga döljs', () => {
    const legal = CURIOUS_FILES.meta.questions.filter((q) => q.legal).map((q) => q.id);
    expect(legal).toEqual(['n09', 'n12', 'n19']);
    expect(CURIOUS_QUESTIONS.map((q) => q.id).sort()).toEqual(CURIOUS_FILES.meta.questions.filter((q) => !q.legal).map((q) => q.id).sort());
    expect(CURIOUS_QUESTIONS).toHaveLength(17);
  });

  it('en fråga utan text, eller med två rätta svar, stoppas av valideringen', () => {
    const meta = JSON.parse(JSON.stringify(CURIOUS_FILES.meta));
    meta.questions[0].options[1].quality = 'right';
    const sv = JSON.parse(JSON.stringify(CURIOUS_FILES.sv));
    delete sv.texts.n02;
    const errors = validateCuriousBank(meta, [sv]);
    expect(errors.some((e) => e.startsWith('n01'))).toBe(true);
    expect(errors.some((e) => e.startsWith('n02'))).toBe(true);
  });
});

describe('Anders beslut 2026-10-08 om frågorna n04, n08, n15 och n18', () => {
  const sv = (id: string) => CURIOUS_FILES.sv.texts[id];
  const en = (id: string) => CURIOUS_FILES.en.texts[id];
  const quality = (id: string, o: string) => curiousQuestion(id)!.options.find((x) => x.id === o)!.quality;

  it('n04: vegokorven står på vagnens meny och skylt, och grillas på en egen del med egen tång', () => {
    expect(tt('sv', 'menu.veggie')).toContain('Vegokorv');
    expect(TABLE.ladder.truckMenu.sv).toContain('vegokorv');
    const truck = makePlayerTrailer();
    for (const name of ['trailerGrillDivider', 'trailerTongsMeat', 'trailerTongsVeggie']) expect(truck.getObjectByName(name)).toBeTruthy();
    expect(sv('n04').q).toBe('Har ni något utan kött?');
  });

  it('n08: svar 3 är "grillad på riktigt" och nästan', () => {
    expect(sv('n08').options.c).toBe('Nej, men korven är grillad på riktigt.');
    expect(en('n08').options.c).toBe('No, but the sausages are properly grilled.');
    expect(quality('n08', 'c')).toBe('ok');
  });

  it('n18: det rätta svaret är den milda senapen eller ketchup, och den milda senapen finns på vagnen', () => {
    expect(sv('n18').options.a).toBe('Ta den milda senapen, eller ketchup. Den skånska är ganska stark.');
    expect(sv('n18').why).toBe('Skånsk senap är sötstark. Till ett barn passar mild senap eller ketchup bättre.');
    expect(quality('n18', 'a')).toBe('right');
    expect(tt('sv', 'menu.condiments')).toContain('mild');
    expect(TABLE.ladder.truckMenu.sv).toContain('mild');
  });

  it('n15: kaffet står på vagnens meny', () => {
    expect(tt('sv', 'menu.drinks')).toContain('kaffe');
    expect(TABLE.ladder.truckMenu.sv).toContain('kaffe');
  });
});
