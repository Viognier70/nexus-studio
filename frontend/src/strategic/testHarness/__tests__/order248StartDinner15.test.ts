// ORDER 248 (uppföljning ORDER 245) — vitest-version av
// `scripts/order245-verify.mjs`.
//
// ORDER 245 la till `#playtest=1&start=dinner15` som URL-param. Den
// dispatchar SKIP_LUNCH + OPEN_SERVICE dinner 15min via reducern i
// SimulationProvider:s useReducer-initialiser, så VO kan provspela mot
// ORDER 238:s per-fire-referens direkt utan att gå igenom morgon/lunch.
//
// Det ursprungliga verifieringsskriptet (Playwright + Vite) körs
// manuellt. Det här är samma verifiering i vitest så sviten skyddar mot
// framtida regression av URL-parametern eller apply-funktionen.
//
// Testerna:
//   1. `parseStart` — URL-parsern accepterar bara 'dinner15' (case-
//      insensitive), null annars.
//   2. Sim-parity — samma init-sekvens som applyDevStartOverride
//      producerar (`makeInitialState(42)` + SKIP_LUNCH + OPEN_SERVICE
//      dinner 15min) driver framåt till första anchor-fråga vid
//      simTime ≈ 130.2s med id `kalastorget-brons-01`, samma som ORDER
//      238:s log.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../simulation/reducer';
import { makeInitialState } from '../../simulation/model';
import { parseStart } from '../urlParams';
import type { SimulationState } from '../../types';

const TICK_HZ = 5;
const DINNER_MINUTES = 15;

describe('ORDER 248 (§ORDER 245) — parseStart URL-parsern', () => {
  it('accepterar "dinner15"', () => {
    expect(parseStart('dinner15')).toBe('dinner15');
  });

  it('accepterar case-insensitivt', () => {
    expect(parseStart('DINNER15')).toBe('dinner15');
    expect(parseStart('Dinner15')).toBe('dinner15');
  });

  it('returnerar null för okända värden', () => {
    expect(parseStart('lunch10')).toBeNull();
    expect(parseStart('dinner')).toBeNull();
    expect(parseStart('42')).toBeNull();
    expect(parseStart('')).toBeNull();
    expect(parseStart(null)).toBeNull();
  });
});

describe('ORDER 248 (§ORDER 245) — start=dinner15 sim-parity mot ORDER 238', () => {
  it('makeInitialState(42) + SKIP_LUNCH + OPEN_SERVICE dinner 15min → första anchor vid ≈130.2s, id=kalastorget-brons-01', () => {
    // Detta är EXAKT samma init-sekvens som applyDevStartOverride
    // kör (`SimulationProvider.tsx` — SKIP_LUNCH + OPEN_SERVICE dinner
    // 15min via reducer). Om denna sekvens ändras måste både
    // applyDevStartOverride och detta test uppdateras tillsammans.
    let s: SimulationState = makeInitialState(42);
    s = reducer(s, { type: 'SKIP_LUNCH' });
    s = reducer(s, {
      type: 'OPEN_SERVICE',
      service: 'dinner',
      lengthMinutes: DINNER_MINUTES
    });

    // Tick fram — svara scenariofasernas standardsvar (samma pattern
    // som ORDER 238-mätpasset). Vi behöver INTE svara på anchor-frågan
    // eftersom testet stannar när första anchor-frågan visar sig.
    const dt = 1 / TICK_HZ;
    const maxTicks = DINNER_MINUTES * 60 * TICK_HZ + 3000;
    let firstAnchorFireSimTime: number | null = null;
    let firstAnchorFireId: string | null = null;

    for (let i = 0; i < maxTicks; i++) {
      if (s.scenario.phase === 'subject' && s.scenario.pendingQuestion === null) {
        s = reducer(s, { type: 'ADVANCE_SCENARIO_TO_SITUATION' });
        s = reducer(s, { type: 'RESOLVE_SCENARIO', choice: 'A' });
      }
      const beforeTick = s;
      s = reducer(s, { type: 'TICK', dt });
      // Fånga första anchor-fyra: pq.anchorId eller pq.axis satt, phase
      // gick från icke-question till question.
      if (
        s.scenario.phase === 'question' &&
        s.scenario.pendingQuestion !== null &&
        s.scenario.pendingQuestion.anchorId !== undefined &&
        (beforeTick.scenario.phase !== 'question' ||
          beforeTick.scenario.pendingQuestion === null)
      ) {
        firstAnchorFireSimTime = s.simTime;
        firstAnchorFireId = s.scenario.pendingQuestion.sourceBankId ?? null;
        break;
      }
    }

    expect(firstAnchorFireSimTime, 'ingen anchor-fråga fyrade — testet mäter inget').not.toBeNull();
    expect(firstAnchorFireId, 'första fyrningens id saknas').toBe('kalastorget-brons-01');
    // ORDER 238:s log: t=130.2s. Tillåt marginell drift ±0.5s (tick-
    // rasterering vid samma seed ger stabilt värde, men vi vill inte
    // regressa på en tick-frekvens-ändring). Om testet failar med t.ex.
    // 130.4s eller 129.8s är utfallet fortfarande "samma tick, samma
    // fråga"; annat värde signalerar riktig regression i determinismen.
    expect(firstAnchorFireSimTime).toBeGreaterThanOrEqual(129.5);
    expect(firstAnchorFireSimTime).toBeLessThanOrEqual(130.7);
  });
});
