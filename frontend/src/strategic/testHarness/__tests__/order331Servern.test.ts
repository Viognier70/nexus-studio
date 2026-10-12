// ORDER 331 E — kan simuleringen köras på en server? Mätningen körs i node utan webbläsare (vitest, ingen jsdom):
// spelarens flöde från början, i foodtrucken (startInFoodtruck, playDay, ladder never) i SEEDS frön × DAYS dagar.
// - identicalRaw: samma frö ger exakt samma tillstånd (JSON) efter alla dagar, två körningar;
// - deterministic: samma, utan lagmedlemmarnas id (de görs med Math.random, team.ts);
// - roundTrip: tillståndet skickas som JSON (stringify + parse) varje morgon och spelet fortsätter identiskt;
// - stateBytes: tillståndets storlek som JSON varje morgon (medel och max);
// - msPerDay: väggtid per spelad dag i den här processen (en kärna).
// Skriver reports/order331/server.json (WRITE_REPORTS=1). Körs ensam, utan säsongskörningar samtidigt.

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import { playDay, startInFoodtruck } from '../weekHarness';
import type { SimulationState } from '../../types';

// Lagmedlemmarnas id görs med Math.random (strategic/simulation/team.ts makeTeamMember, agency): de jämförs utan id.
const ID_RE = /\b(värd|servitör|kock|lärling|agency)-[a-z0-9]{1,8}\b/g;
const withoutIds = (json: string) => { const seen = new Map<string, string>(); return json.replace(ID_RE, (m, r) => { if (!seen.has(m)) seen.set(m, `${r}-#${seen.size}`); return seen.get(m)!; }); };

const SEEDS = Number(process.env.SERVER_SEEDS ?? 5);
const DAYS = Number(process.env.SERVER_DAYS ?? 14);

function season(seed: number, viaJson: boolean): { final: string; bytes: number[]; ms: number[] } {
  let s: SimulationState = startInFoodtruck(seed);
  const bytes: number[] = [];
  const ms: number[] = [];
  for (let d = 0; d < DAYS; d++) {
    const json = JSON.stringify(s);
    bytes.push(json.length);
    if (viaJson) s = JSON.parse(json) as SimulationState;
    const t0 = performance.now();
    s = playDay(s, { ladder: 'never' }).state;
    ms.push(performance.now() - t0);
  }
  return { final: JSON.stringify(s), bytes, ms };
}

describe('ORDER 331 E — simuleringen utan webbläsare', () => {
  it.skipIf(!process.env.WRITE_REPORTS)('frön, determinism, rundtur genom JSON, storlek och tid', () => {
    const rows: { seed: number; identicalRaw: boolean; deterministic: boolean; roundTrip: boolean; stateBytesMean: number; stateBytesMax: number; msPerDayMean: number }[] = [];
    for (let seed = 1; seed <= SEEDS; seed++) {
      const a = season(seed, false);
      const b = season(seed, false);
      const c = season(seed, true);
      const mean = (xs: number[]) => xs.reduce((x, y) => x + y, 0) / xs.length;
      rows.push({ seed, identicalRaw: a.final === b.final, deterministic: withoutIds(a.final) === withoutIds(b.final), roundTrip: withoutIds(a.final) === withoutIds(c.final), stateBytesMean: Math.round(mean(a.bytes)), stateBytesMax: Math.max(...a.bytes), msPerDayMean: Math.round(mean([...a.ms, ...b.ms])) });
    }
    const out = {
      definition: `Node utan webbläsare (vitest, environment node). Spelarens flöde från början, i foodtrucken (startInFoodtruck, playDay, ladder never), frö 1–${SEEDS}, ${DAYS} dagar. identicalRaw = två körningar med samma frö ger exakt samma slutliga tillstånd (JSON). deterministic = samma, när lagmedlemmarnas id (Math.random i team.ts) inte räknas. roundTrip = tillståndet skickat som JSON varje morgon ger samma slut. stateBytes = JSON.stringify(state).length på morgonen (tecken). msPerDay = väggtid per dag (playDay), ms.`,
      seeds: SEEDS, days: DAYS,
      allIdenticalRaw: rows.every((r) => r.identicalRaw),
      allDeterministic: rows.every((r) => r.deterministic),
      allRoundTrip: rows.every((r) => r.roundTrip),
      stateBytesMean: Math.round(rows.reduce((a, r) => a + r.stateBytesMean, 0) / rows.length),
      stateBytesMax: Math.max(...rows.map((r) => r.stateBytesMax)),
      msPerDayMean: Math.round(rows.reduce((a, r) => a + r.msPerDayMean, 0) / rows.length),
      rows
    };
    const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order331');
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'server.json'), JSON.stringify(out, null, 2) + '\n');
    expect(out.allDeterministic).toBe(true);
  }, 3600000);
});
