// ORDER 303 — följderna (Anders 2026-10-04).
import { describe, expect, it } from 'vitest';
import { failSeverity } from '../incidents';
import { spreadWord, streetWordNow } from '../streetWord';
import { incidentArea, slowFactor, staffEffect, staffKnows, staffNight } from '../staffCondition';
import { villageRank } from '../villageLive';
import { buildMorningReview } from '../morningReview';
import { CONSEQUENCES, GAME_MINUTES_PER_SIM_SECOND, STAFF_CONDITION } from '../balance';
import { makeNewGameState } from '../../strategic/simulation/model';
import { morningReviewText } from '../../strategic/ui/MorningReviewLine';
import type { IncidentOutcomeMeta } from '../incidentBank';

const fail = (satisfaction: number, extra: Partial<IncidentOutcomeMeta> = {}): IncidentOutcomeMeta =>
  ({ effects: { cash: 0, satisfaction, stamina: 0, reputation: 0 }, target: 'table', ...extra }) as IncidentOutcomeMeta;

describe('ORDER 303 — följderna', () => {
  it('D: felets grad ur raketens data', () => {
    expect(failSeverity(fail(-0.05))).toBe('mild');
    expect(failSeverity(fail(-0.1))).toBe('medium');
    expect(failSeverity(fail(-0.25))).toBe('grave');
    expect(failSeverity(fail(0, { room: { leave: 1 } } as Partial<IncidentOutcomeMeta>))).toBe('grave');
    // Bara det grova felet låter gästen gå utan att betala.
    expect(CONSEQUENCES.wrong.grave.tableShareLeaving).toBeGreaterThan(0);
    expect(CONSEQUENCES.wrong.mild.billShare).toBe(0);
  });

  it('C: ordet på gatan sjunker vid fel och klingar av', () => {
    const s = makeNewGameState(1);
    s.simTime = 100;
    spreadWord(s, CONSEQUENCES.street.perWrong);
    expect(streetWordNow(s)).toBeCloseTo(CONSEQUENCES.street.perWrong);
    const later = { ...s, simTime: s.simTime + 60 / GAME_MINUTES_PER_SIM_SECOND };
    expect(Math.abs(streetWordNow(later))).toBeLessThan(Math.abs(CONSEQUENCES.street.perWrong));
  });

  it('C: Recensioner i morse säger hur ryktet ändrades och varför', () => {
    const evening = makeNewGameState(1);
    evening.day = { ...evening.day, reputationAtServiceStart: 0.5, answerReviews: [
      { incidentId: 'vb01-korken', right: false, severity: 'medium', reputation: CONSEQUENCES.wrong.medium.reputation, table: 4 }
    ] };
    const morning = { ...evening, reputation: 0.46 };
    // Utan service i går: ingen recension.
    expect(buildMorningReview({ ...evening, day: { ...evening.day, answerReviews: [], seatedTonight: 0 } }, morning)).toBeNull();
    const r = buildMorningReview(evening, morning)!;
    expect(r.change).toBe(-4);
    expect(r.wrongTables).toBe(1);
    // Spelet är på engelska som förval (CLAUDE.md regel 7).
    expect(morningReviewText(r)).toMatch(/^Reputation −4: one table got a wrong answer/);
  });

  it('B: placeringen räknas på nöjda gäster vid bord', () => {
    const rows = [
      { id: 'player', kind: 'player' as const, guests: 40, content: 10 },
      { id: 'torgkrogen', kind: 'restaurant' as const, guests: 30, content: 24 }
    ];
    expect(villageRank(rows)).toBe(2);
  });

  it('E: ork, trivsel och kunskap i personalen', () => {
    const s = makeNewGameState(1);
    expect(slowFactor({ stamina: 1, wellbeing: 1 })).toBe(1);
    expect(slowFactor({ stamina: 0, wellbeing: 1 })).toBeCloseTo(1 + STAFF_CONDITION.slowAtZero);
    expect(staffEffect({ staff: s.staff.map((m) => ({ ...m, stamina: 0, wellbeing: 0 })) })).toBeCloseTo(STAFF_CONDITION.effectAtZero);
    expect(incidentArea('sommellerie')).toBe('vin');
    expect(staffKnows(s, 'vin')).toBe(false);
    const trained = { ...s, day: { ...s.day, pickedActivityIds: ['wine-tasting'] } };
    const next = { ...s, staff: staffNight(trained, s) };
    expect(staffKnows(next, 'vin')).toBe(true);
    expect(next.staff.every((m) => m.stamina === STAFF_CONDITION.stamina.afterNight)).toBe(true);
  });
});
