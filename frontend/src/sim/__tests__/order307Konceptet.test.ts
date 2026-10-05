// ORDER 307 (ORDER 304, Anders 2026-10-05) — konceptet och varukorgen utan
// frågebanken: klassen ur varukorgen, gästtyperna, de två ryktena,
// leverantörerna och utrustningen.
import { describe, expect, it } from 'vitest';
import type { SimulationState } from '../../strategic/types';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { bookingFor, typeShares } from '../../strategic/simulation/guestTypes';
import { firstDayOfWeek } from '../calendar';
import { CONCEPT, EQUIPMENT, GOODS_SUPPLIERS, GUEST_TYPES, REPUTATION } from '../balance';
import {
  avecShareFor, basketLevel, conceptOf, driftConceptReputation, equipmentStone, goodAvailable, moveConceptReputation,
  reputationByTier, supplierStone, tierForLevel
} from '../goods';
import { totalCredits } from '../incidents';
import { morningRows } from '../../strategic/simulation/morningBuy';

function withCredits(s: SimulationState, n: number): SimulationState {
  return { ...s, knowledgeCredits: { episteme: n, techne: n, phronesis: n }, knowledgeTracks: { episteme: { untagged: n, sommellerie: 0, kok: 0 }, techne: { untagged: n, sommellerie: 0, kok: 0 }, phronesis: { untagged: n, sommellerie: 0, kok: 0 } } };
}
function morning(): SimulationState {
  const s = makeNewGameState(4);
  return { ...s, medals: { stensota: 'silver', metodkoket: 'silver', kalastorget: 'brons' }, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
}

describe('ORDER 307 — konceptet ur varukorgen', () => {
  it('baspaketet är bistro, enkla rätter enkel, de sällsynta varorna soigné', () => {
    const s = reducer(morning(), { type: 'BUY_PACKAGE', packageId: 'vinbar-base' });
    expect(conceptOf(s)).toBe('bistro');
    expect(tierForLevel(0.2)).toBe('enkel');
    expect(tierForLevel(CONCEPT.soigneFrom)).toBe('soigne');
    let simple = reducer(morning(), { type: 'BUY_ITEMS', items: { 'root-soup': 12, 'lentil-plate': 8, 'beer-pairing': 20 } });
    expect(conceptOf(simple)).toBe('enkel');
    simple = reducer(simple, { type: 'BUY_ITEMS', items: { 'game-plate': 10, 'fine-wine-bottle': 4 } });
    expect(basketLevel(simple)).toBeGreaterThan(basketLevel(reducer(morning(), { type: 'BUY_ITEMS', items: { 'root-soup': 12, 'lentil-plate': 8, 'beer-pairing': 20 } })));
  });

  it('utrustningen lyfter konceptet mot sin nivå', () => {
    const s = reducer(morning(), { type: 'BUY_PACKAGE', packageId: 'vinbar-base' });
    const withEq = { ...s, equipment: ['vinkyl', 'flamberingsvagn', 'humidor'] };
    expect(basketLevel(withEq)).toBeGreaterThan(basketLevel(s));
  });
});

describe('ORDER 307 — leverantörerna', () => {
  it('fiskarens röding går inte att köpa förrän fiskaren är öppnad', () => {
    let s = withCredits(morning(), 20);
    expect(goodAvailable(s, 'char-plate')).toBe(false);
    expect(morningRows(s).dishes.some((d) => d.dishId === 'char-plate')).toBe(false);
    expect(reducer(s, { type: 'BUY_ITEMS', items: { 'char-plate': 4 } }).stock).toEqual(s.stock);
    const credits = totalCredits(s);
    s = reducer(s, { type: 'BUY_SUPPLIER', id: 'fiskaren' });
    expect(s.goodsSuppliers).toContain('fiskaren');
    expect(totalCredits(s)).toBe(credits - GOODS_SUPPLIERS.fiskaren.credits);
    expect(morningRows(s).dishes.some((d) => d.dishId === 'char-plate')).toBe(true);
    expect(reducer(s, { type: 'BUY_ITEMS', items: { 'char-plate': 4 } }).stock).not.toEqual(s.stock);
  });

  it('medaljen och krediterna avgör stenens läge', () => {
    const poor = withCredits(morning(), 0);
    expect(supplierStone(poor, 'fiskaren', 0)).toBe('short');
    expect(supplierStone({ ...poor, medals: {} }, 'fiskaren', 0)).toBe('locked');
    expect(supplierStone(poor, 'grossisten', 0)).toBe('owned');
    expect(reducer({ ...poor, medals: {} }, { type: 'BUY_SUPPLIER', id: 'fiskaren' }).goodsSuppliers ?? []).not.toContain('fiskaren');
  });
});

describe('ORDER 307 — utrustningen', () => {
  it('krediterna öppnar, kassan köper, och avecvagnen öppnar avec', () => {
    let s = { ...withCredits(morning(), 20), cash: 50000 };
    expect(avecShareFor(s)).toBe(0);
    expect(reducer(s, { type: 'BUY_EQUIPMENT', id: 'avecvagn' }).equipment ?? []).not.toContain('avecvagn');
    s = reducer(s, { type: 'OPEN_EQUIPMENT', id: 'avecvagn' });
    expect(s.equipmentOpened).toContain('avecvagn');
    expect(equipmentStone(s, 'avecvagn', totalCredits(s))).toBe('open');
    const cash = s.cash;
    s = reducer(s, { type: 'BUY_EQUIPMENT', id: 'avecvagn' });
    expect(s.equipment).toContain('avecvagn');
    expect(s.cash).toBe(cash - EQUIPMENT.avecvagn.priceSek);
    expect(s.ledger.at(-1)?.causeId).toBe('equipment:avecvagn');
    expect(avecShareFor(s)).toBe(EQUIPMENT.avecvagn.avecShare);
  });
});

describe('ORDER 307 — gästerna och de två ryktena', () => {
  it('bistro har dagens blandning; soigné fler betalningsstarka, men bara med konceptets rykte', () => {
    const s = morning();
    expect(typeShares(s, 'bistro')).toEqual(CONCEPT.share.bistro);
    const soigne = typeShares(s, 'soigne');
    expect(soigne.high).toBeCloseTo(CONCEPT.share.soigne.high);
    const lowRep = { ...s, reputationByTier: { enkel: 0.6, bistro: 0.6, soigne: CONCEPT.highFullAt.soigne / 2 } };
    expect(typeShares(lowRep, 'soigne').high).toBeCloseTo(CONCEPT.share.soigne.high / 2);
    expect(typeShares(lowRep, 'soigne').student + typeShares(lowRep, 'soigne').middle + typeShares(lowRep, 'soigne').high).toBeCloseTo(1);
  });

  it('bokningen bär kvällens koncept', () => {
    const s = reducer(morning(), { type: 'BUY_PACKAGE', packageId: 'vinbar-base' });
    expect(bookingFor(s).concept).toBe('bistro');
  });

  it('ett fel vid en gourmets bord sänker soigné-ryktet med förlåtelsen; natten drar mot krogens rykte', () => {
    const s = morning();
    const before = reputationByTier(s).soigne;
    const draft = { ...s };
    moveConceptReputation(draft, 'soigne', -6 * GUEST_TYPES.forgiveness.gourmet, REPUTATION.scale);
    expect(reputationByTier(draft).soigne).toBeCloseTo(before - (6 * GUEST_TYPES.forgiveness.gourmet) / REPUTATION.scale);
    const night = driftConceptReputation(draft);
    expect(reputationByTier(night).soigne).toBeGreaterThan(reputationByTier(draft).soigne);
    expect(GUEST_TYPES.forgiveness.gourmet).toBeGreaterThan(GUEST_TYPES.forgiveness.student);
  });
});
