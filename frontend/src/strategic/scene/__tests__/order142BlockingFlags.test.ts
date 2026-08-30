// ORDER 142 — kör LEVERANS.md §2:s föreskrivna första anrop
// (`console.table(blockingFlags())`) och redovisa utfallet.
//
// Testet monterar inga rum — det importerar bara businessRoom-
// kontraktet, kör blockingFlags(), skriver ut resultatet och
// kontrollerar att listan ens returnerar något (annars är
// LEVERANS.md §5 fel eller import-vägen bruten).

import { describe, expect, it } from 'vitest';
import { blockingFlags, allFlags } from '../businessRoom';

describe('ORDER 142 — LEVERANS.md §2 blockingFlags()-redovisning', () => {
  it('kör blockingFlags() och listar alla stoppande flaggor', () => {
    const flags = blockingFlags();
    // eslint-disable-next-line no-console
    console.log('\n=== ORDER 142 — blockingFlags() ===');
    // eslint-disable-next-line no-console
    console.table(flags);
    // eslint-disable-next-line no-console
    console.log(`\nTotalt ${flags.length} stoppande flagga(or)`);
    // eslint-disable-next-line no-console
    console.log(`(allFlags: ${allFlags().length} totalt)\n`);
    // Sanity — allFlags får inte vara tom (då är MODULES import trasig).
    expect(allFlags().length).toBeGreaterThan(0);
  });
});
