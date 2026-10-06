// ORDER 311 (Anders 2026-10-06) — står kassan under noll i säsongens sista
// bokslut räknas det som konkurs, och krogen stänger.
import { describe, expect, it } from 'vitest';
import { settleWeek, isClosed } from '../economy';
import { RISK, SEASON } from '../balance';
import { makeInitialState } from '../../strategic/simulation/model';
import type { SimulationState } from '../../strategic/types';

function atWeek(week: number, cash: number): SimulationState {
  const s = makeInitialState(1);
  return { ...s, medals: { stensota: 'brons', metodkoket: 'brons', kalastorget: 'brons' }, cash, day: { ...s.day, dayNumber: 7 * week } };
}

describe('ORDER 311 — säsongens sista bokslut', () => {
  it('kassan under noll i sista bokslutet: konkurs och stängd', () => {
    expect(RISK.closeBelowZeroAtSeasonEnd).toBe(true);
    const s = settleWeek(atWeek(SEASON.weeks, -50_000));
    expect(s.economy.lastSettlement?.closedNow).toBe(true);
    expect(s.economy.risk?.closedReason).toBe('seasonEnd');
    expect(s.economy.risk?.closedWeek).toBe(SEASON.weeks);
    expect(isClosed(s)).toBe(true);
  });

  it('en vecka under noll före sista bokslutet stänger inte', () => {
    const s = settleWeek(atWeek(SEASON.weeks - 1, -50_000));
    expect(s.economy.lastSettlement?.closedNow).toBe(false);
  });

  it('kassan över noll i sista bokslutet: krogen står kvar', () => {
    const s = settleWeek(atWeek(SEASON.weeks, 500_000));
    expect(s.economy.lastSettlement?.closedNow).toBe(false);
  });
});
