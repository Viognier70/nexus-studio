// ORDER 267 (Nexus v1 etapp 5) — söndagstidningen (sim/newspaper.ts):
// recension, marknaden, banken och högtiden, i ord ur en spelad vecka.

import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../../strategic/testHarness/scenarios';
import { newspaperFor, reviewedEvening } from '../newspaper';
import { WEEK } from '../balance';
import type { EveningRecord } from '../economy';

const evening = (dayNumber: number, reputationDelta: number, guests = 20): EveningRecord => ({
  dayNumber, reputationDelta, guests, marketCap: 30, revenueSek: 1000, gaveUp: 0
});

describe('ORDER 267 — söndagstidningen', () => {
  it('recenserar kvällen som flyttade ryktet mest, uppåt eller nedåt', () => {
    expect(reviewedEvening([evening(1, 0.02), evening(2, -0.05), evening(3, 0.03)])?.dayNumber).toBe(2);
    expect(reviewedEvening([evening(1, 0.02), evening(2, 0.01)])?.dayNumber).toBe(1);
    expect(reviewedEvening([])).toBeNull();
  });

  it('en spelad vecka ger ett nummer med fyra delar, i ord utan siffror', () => {
    const { run } = SCENARIOS['vanlig-vecka']();
    const s = run.final.economy.lastSettlement;
    expect(s?.evenings?.map((e) => e.dayNumber)).toEqual(
      Array.from({ length: WEEK.daysPerWeek - 1 }, (_, i) => i + 1)
    );
    const paper = newspaperFor(run.final, 'Vinbaren vid torget', ['Banken säger något.'], () => 'För restaurangen saknas silver i tre paviljonger.');
    expect(paper?.sections.map((x) => x.id)).toEqual(['review', 'market', 'bank', 'holiday']);
    expect(paper?.sections[0].title).toContain('Vinbaren vid torget');
    for (const section of paper!.sections) {
      for (const line of section.lines) expect(line).not.toMatch(/\d/);
    }
  });
});
