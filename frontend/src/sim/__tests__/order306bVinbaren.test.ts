// ORDER 306b (Anders 2026-10-08) — vinbarens elva situationer i formen analys → upplevelse → handling
// (SITUATIONER_306b.md Del B), kostnaderna (A7), ordningskorten i Karaffen (A9, bedömningen förtydligad
// 2026-10-08) och Designs D8 (ordningskorten, halvt grepp, myntet, karaffen i rummet).

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { stocked } from '../../strategic/testHarness/stocked';
import { firstDayOfWeek } from '../calendar';
import { gradeSequence, incidentBankFor, incidentById, ruleKey, type SequenceSpec } from '../incidentBank';
import { canAfford, rankedStepOption } from '../incidents';
import { INGREDIENTS, GLASSES_PER_BOTTLE } from '../../strategic/simulation/m4Catalogue';
import { STRINGS } from '../../content/nexusStrings';
import { D8_STRINGS } from '../../content/d8Strings';
import { decanterState } from '../../strategic/scene/DecanterAtLounge';
import { untilVerdict } from './verdict';
import type { SimulationState } from '../../strategic/types';

const TICK = { type: 'TICK', dt: 0.2 } as const;
const NEW = ['vb01-korken', 'vb02-rosen', 'vb03-notallergi', 'vb07-provningen', 'vb09-getosten', 'vb11-cremant', 'vb12-varmt-rott', 'vb18-kavajen', 'vb23-sott', 'vb32-fodelsedagen', 'vb40-karaffen'];
const vb40 = incidentById('vinbar', 'vb40-karaffen')!;
const spec = vb40.steps[2].sequence as SequenceSpec;
const grade = (row: string) => gradeSequence(spec, row.split('')).grade;

function wineBar(): SimulationState {
  let s = makeNewGameState(7);
  s = { ...s, medals: { stensota: 'brons', metodkoket: 'brons', kalastorget: 'brons' }, speed: 2, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
  return reducer(stocked(s), { type: 'START_SERVICE' });
}

/** Öppnar situationen (som en kedjad) och svarar bäst tills steget `step` frågar. */
function openAt(id: string, step: number): SimulationState {
  let s = wineBar();
  s = { ...s, incidents: { ...s.incidents, slots: [{ at: s.simTime, phase: 'rush' }, ...s.incidents.slots], queued: [id] } };
  if (!s.day.doorsOpenedThisService) for (let i = 0; i < 700; i++) s = reducer(s, TICK);
  for (let i = 0; i < 3000; i++) {
    const a = s.incidents.active;
    if (a?.id === id && a.step === step && !a.choosing && !a.pending && (a.revealLeft ?? 0) <= 0 && (a.introLeft ?? 0) <= 0) return s;
    if (a?.choosing) s = reducer(s, { type: 'INCIDENT_GO' });
    else if (a && !a.pending && (a.introLeft ?? 0) <= 0 && (a.revealLeft ?? 0) <= 0) s = reducer(s, { type: 'ANSWER_INCIDENT', optionId: rankedStepOption(incidentById('vinbar', a.id)!.steps[a.step], 'best', a.struck, a.situation) });
    s = reducer(s, TICK);
  }
  throw new Error(`${id} nådde inte steg ${step}`);
}

describe('ORDER 306b — de elva situationerna', () => {
  it('tio ersatta och Karaffen ny, alla i formen analys → upplevelse → handling', () => {
    const triad = incidentBankFor('vinbar').filter((i) => i.form === 'triad').map((i) => i.id).sort();
    expect(triad).toEqual([...NEW].sort());
  });

  it('steg 3 har minst ett helt grepp, och halvt grepp har sin sida (A4)', () => {
    for (const id of NEW) {
      const opts = incidentById('vinbar', id)!.steps[2].options;
      expect(opts.some((o) => o.quality === 'best')).toBe(true);
      for (const o of opts.filter((x) => x.quality === 'ok')) expect(['analysis', 'experience']).toContain(o.grip);
    }
  });

  // A7 — kostnaderna, förslag: husvinet (m4Catalogue house-wine) 24 kr per glas, fem glas per flaska.
  it('kostnaderna följer husvinets inköp: flaskan, ett glas, ett smakprov och två glas', () => {
    const glass = INGREDIENTS.find((x) => x.id === 'house-wine')!.baseCostSek;
    const cost = (id: string, o: string) => incidentById('vinbar', id)!.steps[2].options.find((x) => x.id === o)!.cost;
    expect(cost('vb01-korken', 'a')).toBe(glass * GLASSES_PER_BOTTLE);
    expect(cost('vb12-varmt-rott', 'c')).toBe(glass);
    expect(cost('vb11-cremant', 'a')).toBe(glass / 2);
    expect(cost('vb32-fodelsedagen', 'b')).toBe(glass * 2);
    expect(cost('vb18-kavajen', 'c')! - cost('vb18-kavajen', 'b')!).toBe(glass);
  });

  it('kostnaden dras när svaret avgörs, och ett svar som kassan inte räcker till går inte att välja', () => {
    const s = openAt('vb12-varmt-rott', 2);
    const paid = untilVerdict(reducer(s, { type: 'ANSWER_INCIDENT', optionId: 'c' }));
    const line = paid.ledger.filter((l) => l.causeId === 'vb12-varmt-rott' && l.amount === -24);
    expect(line).toHaveLength(1);
    const poor = { ...s, cash: 10 };
    expect(canAfford(poor, { cost: 24 })).toBe(false);
    expect(reducer(poor, { type: 'ANSWER_INCIDENT', optionId: 'c' })).toBe(poor);
    expect(reducer(poor, { type: 'ANSWER_INCIDENT', optionId: 'a' })).not.toBe(poor);
  });
});

describe('ORDER 306b A9 — ordningskorten i Karaffen (förtydligad 2026-10-08)', () => {
  it('helt grepp: a → b → c → d, och b → a → c → d', () => {
    expect(grade('abcd')).toBe('full');
    expect(grade('bacd')).toBe('full');
  });

  it('bara brister i tekniken: halvt grepp, upplevelsen höll', () => {
    expect(grade('abed')).toBe('experience'); // D8 bild 06: e är med (och c saknas)
    expect(grade('acbd')).toBe('experience'); // c före b
    expect(grade('abce')).toBe('experience'); // e är med
  });

  it('bara brister i omsorgen: halvt grepp, analysen höll', () => {
    expect(grade('abcf')).toBe('analysis'); // D8 bild 07: f är med
    expect(grade('fbcd')).toBe('analysis'); // a saknas
    expect(grade('bcad')).toBe('analysis'); // a efter c
  });

  it('fel: d först, både b och c saknas, eller båda sorternas brister', () => {
    expect(grade('dabc')).toBe('wrong'); // D8 bild 08
    expect(grade('adef')).toBe('wrong');
    expect(grade('fbed')).toBe('wrong');
    expect(gradeSequence(spec, ['f', 'b', 'e', 'd']).reason).toBe('both');
  });

  // Designs D8 (41): d varken först eller sist är en brist i omsorgen.
  it('d i mitten är en brist i omsorgen: halvt grepp, analysen höll', () => {
    expect(grade('abdc')).toBe('analysis');
    expect(ruleKey(gradeSequence(spec, ['a', 'b', 'd', 'c']).reason)).toBe('notLast:d');
  });

  // Anders 2026-10-08: "orderCards.ts har rättad bedömning som stämmer med SITUATIONER_306b.md, vb40 (prövad
  // mot alla 360 rader). Lägg till samma prövning som test i 306b."
  it('alla 360 rader med fyra kort ger samma bedömning som Designs gradeOrder()', () => {
    const letter: Record<D8Card, string> = { show: 'a', candle: 'b', pour: 'c', serve: 'd', hour: 'e', bar: 'f' };
    const cards = Object.keys(letter) as D8Card[];
    const rows: D8Card[][] = [];
    const build = (row: D8Card[]) => { if (row.length === spec.slots) { rows.push(row); return; } for (const c of cards) if (!row.includes(c)) build([...row, c]); };
    build([]);
    expect(rows).toHaveLength(360);
    const differ = rows.filter((r) => gradeOrder(r, false).grade !== gradeSequence(spec, r.map((c) => letter[c])).grade).map((r) => r.map((c) => letter[c]).join(''));
    expect(differ).toEqual([]);
  });

  it('raden ligger i motorn, låset kräver fyra kort och bedömningen blir stegets svar', () => {
    let s = openAt('vb40-karaffen', 2);
    expect(reducer(s, { type: 'SET_INCIDENT_ROW', row: ['a', 'a'] })).toBe(s);
    expect(reducer(s, { type: 'SET_INCIDENT_ROW', row: ['x'] })).toBe(s);
    s = reducer(s, { type: 'SET_INCIDENT_ROW', row: ['a', 'b', 'e'] });
    expect(s.incidents.active?.row).toEqual(['a', 'b', 'e']);
    expect(reducer(s, { type: 'LOCK_INCIDENT_ROW' })).toBe(s);
    s = reducer(s, { type: 'SET_INCIDENT_ROW', row: ['a', 'b', 'e', 'd'] });
    s = reducer(s, { type: 'LOCK_INCIDENT_ROW' });
    expect(s.incidents.active?.pending?.optionId).toBe('experience');
    s = untilVerdict(s);
    const rec = s.incidents.log.at(-1)!;
    expect(rec).toMatchObject({ id: 'vb40-karaffen', quality: 'ok', halfGrip: 'experience', sequence: { row: ['a', 'b', 'e', 'd'], reason: 'has:e' } });
  });

  it('tiden ute: en full rad bedöms, färre än fyra kort och personalen tar över', () => {
    const run = (row: string[]) => {
      let s = reducer(openAt('vb40-karaffen', 2), { type: 'SET_INCIDENT_ROW', row });
      for (let i = 0; i < 3000 && s.incidents.active?.id === 'vb40-karaffen'; i++) s = reducer(s, TICK);
      return s.incidents.log.find((r) => r.id === 'vb40-karaffen')!;
    };
    expect(run(['a', 'b', 'c', 'd'])).toMatchObject({ step: null, quality: 'best', optionId: 'full' });
    expect(run(['a', 'b'])).toMatchObject({ step: 2, quality: 'staff', optionId: null, sequence: { row: ['a', 'b'] } });
  });

  it('karaffen står på bordet medan situationen pågår och den tomma flaskan efteråt', () => {
    const s = openAt('vb40-karaffen', 0);
    expect(decanterState(s)).toBe('running');
    let done = reducer(openAt('vb40-karaffen', 2), { type: 'SET_INCIDENT_ROW', row: ['a', 'b', 'c', 'd'] });
    done = untilVerdict(reducer(done, { type: 'LOCK_INCIDENT_ROW' }));
    expect(decanterState(done)).toBe('after');
    expect(decanterState(wineBar())).toBe('none');
  });
});

describe('ORDER 306b — Designs D8 i strängtabellen', () => {
  it('nycklarna står på svenska och engelska, och kortens text finns i båda språken', () => {
    for (const k of Object.keys(D8_STRINGS)) {
      const v = STRINGS[k as keyof typeof STRINGS] as { sv: string; en: string };
      expect(v.sv.length * v.en.length).toBeGreaterThan(0);
    }
    expect(Object.keys(vb40.steps[2].text.cards ?? {}).sort()).toEqual(spec.cards.map((c) => c.id).sort());
  });
});

// Designs D8 (41) orderCards.ts gradeOrder(), ordagrant
// (documentation/leveranser/nexus-leverans-2026-10-08-d8-vinbaren/orderCards.ts).
type D8Card = 'show' | 'candle' | 'pour' | 'serve' | 'hour' | 'bar';
function gradeOrder(row: D8Card[], timedOut: boolean): { grade: string; whyKey: string } {
  if (timedOut && row.length < 4) return { grade: 'timeout', whyKey: 'why.timeout' };
  const at = (x: D8Card) => row.indexOf(x), has = (x: D8Card) => at(x) >= 0, last = row.length - 1;
  const tech = has('hour') || !has('candle') || !has('pour') || (has('candle') && has('pour') && at('pour') < at('candle'));
  const care = has('bar') || !has('show') || (has('show') && has('pour') && at('show') > at('pour')) || (has('serve') && at('serve') !== 0 && at('serve') !== last);
  if (at('serve') === 0) return { grade: 'wrong', whyKey: 'why.wrong.serveFirst' };
  if (!has('candle') && !has('pour')) return { grade: 'wrong', whyKey: 'why.wrong.candle' };
  if (tech && care) return { grade: 'wrong', whyKey: 'why.wrong.both' };
  if (tech) return { grade: 'experience', whyKey: has('hour') ? 'why.exp.hour' : 'why.exp.candle' };
  if (care) return { grade: 'analysis', whyKey: has('bar') ? 'why.ana.bar' : !has('show') ? 'why.ana.show' : 'why.ana.order' };
  return { grade: 'full', whyKey: 'order.why.right' };
}
