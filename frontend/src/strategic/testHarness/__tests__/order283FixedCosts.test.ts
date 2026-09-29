// ORDER 283 — redovisning av de fasta kostnaderna i dag (Vision Owner
// 2026-09-29: "Se över att det finns tydliga fasta kostnader som hyra och
// löner varje vecka, så att en dålig vecka märks i kassan. Redovisa hur det
// ser ut i dag.")
//
// Mätningen läser kassaboken (state.ledger), samma källa som spelets konto
// och veckoavräkningen. Vecka 2, vinbaren, brons i tre, den rimliga
// spelaren (baspaketet varje morgon, bästa svaret), 20 frön. Med
// WRITE_REPORTS=1 skrivs reports/order283/fixed-costs.json.

import { describe, expect, it } from 'vitest';
import { makeNewGameState } from '../../simulation/model';
import { playDay } from '../weekHarness';
import { PLAYERS } from '../randomness';
import { firstDayOfWeek } from '../../../sim/calendar';
import { ECONOMY, WEEK } from '../../../sim/balance';

describe('ORDER 283 — veckans kostnader ur kassaboken', () => {
  it('redovisar kostnaderna per kategori för en vanlig vecka i vinbaren', async () => {
    const seeds = process.env.WRITE_REPORTS === '1' ? Array.from({ length: 20 }, (_, i) => i + 1) : [1];
    const rows: { seed: number; byCategory: Record<string, number>; revenue: number; resultSek: number }[] = [];
    for (const seed of seeds) {
      let s = makeNewGameState(seed);
      s = { ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
      const ledgerStart = s.ledger.length;
      const cashStart = s.cash;
      for (let d = 0; d < WEEK.daysPerWeek; d++) s = playDay(s, {}).state;
      const byCategory: Record<string, number> = {};
      for (const l of s.ledger.slice(ledgerStart)) byCategory[l.category] = Math.round((byCategory[l.category] ?? 0) + l.amount);
      rows.push({ seed, byCategory, revenue: byCategory.revenue ?? 0, resultSek: Math.round(s.cash - cashStart) });
    }
    const cats = [...new Set(rows.flatMap((r) => Object.keys(r.byCategory)))].sort();
    const mean = Object.fromEntries(cats.map((c) => [c, Math.round(rows.reduce((a, r) => a + (r.byCategory[c] ?? 0), 0) / rows.length)]));
    expect(mean.wage).toBeLessThan(0);
    if (process.env.WRITE_REPORTS === '1') {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order283');
      mkdirSync(out, { recursive: true });
      writeFileSync(resolve(out, 'fixed-costs.json'), JSON.stringify({
        definition: 'Vecka 2 (måndag till och med söndagens avräkning), vinbaren, brons i Stensöta, Metodköket och Kalastorget, den rimliga spelaren (baspaketet varje morgon, bästa svaret), frö 1–20. Summor per kassabokskategori (state.ledger), negativa = kostnader. normalWeeklyRevenueSek ur balance.ts ECONOMY.',
        normalWeeklyRevenueSek: ECONOMY.normalWeeklyRevenueSek.vinbar,
        mean,
        rows
      }, null, 2) + '\n');
    }
  }, 300000);
});
