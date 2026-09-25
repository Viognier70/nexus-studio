// ORDER 237 — 90 s-varianten av bidirectional scenario-buffer +
// 90 s min-gap mellan anchor-frågor.
//
// VO 2026-09-21 uppföljning:
//   * ORDER 235 med 180s-buffer gav 1 anchor-fråga per 15-min dinner
//     och 28,81 % öppet fönster (räknat från simTime=0). Fönster-
//     mätningen räknade även före serviceöppning; nu räknas fönstret
//     från 130 s (opening 10 s + prep 120 s = doors-open).
//   * Buffern sänkt 180 → 90 s (ANCHOR_SCENARIO_BUFFER_SEC).
//   * Min-gap mellan anchor-frågor också sänkt 180 → 90 s så ett av
//     två tal inte döljer det andra (VO).
//
// Rapport: `reports/order237-anchor-picker-90s/timeline.json`
//   * öppna fönster inom [service-open, service-close]
//   * effekten av min-gap-begränsningen (hur många frågor pickern
//     kunde fyra vs hur många fönstren tekniskt tillät)
//   * alla planerade scenarier fyrade
//   * första anchor-fråga

import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reducer } from '../reducer';
import { makeInitialState } from '../model';
import type { AnchorId } from '../anchors';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = resolve(HERE, '../../../../reports/order237-anchor-picker-90s');
const REPORT_JSON = resolve(REPORT_DIR, 'timeline.json');

const DINNER_MINUTES = 15;
const TICK_HZ = 5;
const BUFFER_SEC = 90; // ANCHOR_SCENARIO_BUFFER_SEC efter ORDER 237
const MIN_GAP_SEC = 90; // MIN_GAP_BETWEEN_ANCHOR_QUESTIONS_SEC efter ORDER 237

interface AnchorFireLog {
  readonly simTime: number;
  readonly questionId: string;
  readonly anchorId: AnchorId | null;
  readonly askerRole: string | undefined;
  readonly wasCorrect: boolean;
  readonly promptFirst80: string;
  readonly gapSinceLastSec: number | null;
}

interface OpenWindow {
  readonly startSec: number;
  readonly endSec: number;
  readonly lengthSec: number;
  readonly reason: string;
}

describe('ORDER 237 — 90s-varianten, 15-min dinner seed=42', () => {
  it('kör mätpass med sänkt buffer + min-gap', () => {
    let s = makeInitialState(42);
    s = reducer(s, { type: 'SKIP_LUNCH' });
    s = reducer(s, {
      type: 'OPEN_SERVICE',
      service: 'dinner',
      lengthMinutes: DINNER_MINUTES
    });

    // Öppningstider: doors-open efter opening+prep-perioden. Fönster-
    // mätningen ska räknas från denna punkt, inte från simTime=0
    // (ORDER 237 §tillägg 1 från VO).
    const doorsOpenAt = s.day.openingEndsAt !== null && s.day.doorsOpenAt !== null
      ? s.day.doorsOpenAt
      : s.simTime + 130;
    const plannedScenarios = s.day.scenariosPlanned;
    const scheduledFireTimes: number[] = [...s.day.scenarioTriggerTimes];
    const serviceCloseAt = s.day.periodStartAt + DINNER_MINUTES * 60;

    const log: AnchorFireLog[] = [];
    const scenarioFireLog: number[] = [];
    let lastAnchorSimTime: number | null = null;

    const dt = 1 / TICK_HZ;
    const maxTicks = DINNER_MINUTES * 60 * TICK_HZ + 3000;
    let previousScenariosFired = s.day.scenariosFiredThisService;

    for (let i = 0; i < maxTicks; i++) {
      if (s.scenario.phase === 'subject' && s.scenario.pendingQuestion === null) {
        s = reducer(s, { type: 'ADVANCE_SCENARIO_TO_SITUATION' });
        s = reducer(s, { type: 'RESOLVE_SCENARIO', choice: 'A' });
      }
      if (
        s.scenario.phase === 'question' &&
        s.scenario.pendingQuestion !== null &&
        s.scenario.pendingQuestion.anchorId === undefined
      ) {
        s = reducer(s, { type: 'ANSWER_QUESTION', index: 0 });
      }

      const before = s;
      s = reducer(s, { type: 'TICK', dt });

      if (s.day.scenariosFiredThisService > previousScenariosFired) {
        scenarioFireLog.push(before.simTime);
        previousScenariosFired = s.day.scenariosFiredThisService;
      }

      if (
        s.scenario.phase === 'question' &&
        s.scenario.pendingQuestion !== null &&
        s.scenario.pendingQuestion.anchorId !== undefined &&
        (before.scenario.phase !== 'question' || before.scenario.pendingQuestion === null)
      ) {
        const pq = s.scenario.pendingQuestion;
        const correctIndex = pq.options.findIndex((o) => o.correct);
        const simTimeAtFire = s.simTime;
        s = reducer(s, { type: 'ANSWER_QUESTION', index: correctIndex });
        for (let t = 0; t < 5; t++) s = reducer(s, { type: 'TICK', dt });
        s = reducer(s, { type: 'ACK_QUESTION_EXPLANATION' });

        log.push({
          simTime: Math.round(simTimeAtFire * 100) / 100,
          questionId: pq.sourceBankId ?? '(unknown)',
          anchorId: pq.anchorId ?? null,
          askerRole: pq.askerRole,
          wasCorrect: pq.options[correctIndex]?.correct ?? false,
          promptFirst80: pq.body.substring(0, 80),
          gapSinceLastSec:
            lastAnchorSimTime !== null
              ? Math.round((simTimeAtFire - lastAnchorSimTime) * 100) / 100
              : null
        });
        lastAnchorSimTime = simTimeAtFire;
      }

      if (s.day.period === 'evening') break;
    }

    // Beräkna öppna fönster från doorsOpenAt (INTE från 0). Inkludera
    // också fönstret efter sista scenariot.
    interface ClosedSegment {
      startSec: number;
      endSec: number;
      reason: string;
    }
    const closedSegments: ClosedSegment[] = [];
    for (const fireTime of scheduledFireTimes) {
      closedSegments.push({
        startSec: Math.max(doorsOpenAt, fireTime - BUFFER_SEC),
        endSec: Math.min(serviceCloseAt, fireTime),
        reason: `<${BUFFER_SEC}s före scenario@${Math.round(fireTime)}s`
      });
      closedSegments.push({
        startSec: Math.max(doorsOpenAt, fireTime),
        endSec: Math.min(serviceCloseAt, fireTime + BUFFER_SEC),
        reason: `<${BUFFER_SEC}s efter scenario@${Math.round(fireTime)}s`
      });
    }
    closedSegments.sort((a, b) => a.startSec - b.startSec);
    const merged: ClosedSegment[] = [];
    for (const seg of closedSegments) {
      const last = merged[merged.length - 1];
      if (last && seg.startSec <= last.endSec) {
        last.endSec = Math.max(last.endSec, seg.endSec);
      } else {
        merged.push({ ...seg });
      }
    }
    const openWindows: OpenWindow[] = [];
    let cursor = doorsOpenAt;
    for (const seg of merged) {
      if (cursor < seg.startSec) {
        openWindows.push({
          startSec: Math.round(cursor * 100) / 100,
          endSec: Math.round(seg.startSec * 100) / 100,
          lengthSec: Math.round((seg.startSec - cursor) * 100) / 100,
          reason: 'öppet mellan bufferzoner'
        });
      }
      cursor = Math.max(cursor, seg.endSec);
    }
    // ORDER 237 §tillägg 1: fönstret efter sista scenariot inkluderat.
    if (cursor < serviceCloseAt) {
      openWindows.push({
        startSec: Math.round(cursor * 100) / 100,
        endSec: Math.round(serviceCloseAt * 100) / 100,
        lengthSec: Math.round((serviceCloseAt - cursor) * 100) / 100,
        reason: 'öppet efter sista scenariot till service-close'
      });
    }

    const totalOpenSec = openWindows.reduce((sum, w) => sum + w.lengthSec, 0);
    const serviceWindowSec = serviceCloseAt - doorsOpenAt;
    const openShare = totalOpenSec / serviceWindowSec;

    // Min-gap-analys: hur många fyrningar hade fönstren TEKNISKT
    // tillåtit om MIN_GAP inte begränsade? Enkelt räknat:
    // floor(windowLength / MIN_GAP) + 1 per fönster (första fyrningen
    // "gratis", varje efterföljande behöver MIN_GAP sek).
    const potentialFiresPerWindow = openWindows.map((w) => Math.max(1, Math.floor(w.lengthSec / MIN_GAP_SEC) + 1));
    const potentialTotalFires = potentialFiresPerWindow.reduce((sum, n) => sum + n, 0);
    // Faktisk begränsning av MAX_ANCHOR_QUESTIONS_PER_SERVICE (3).
    const maxAllowedByRateLimit = 3;
    const potentialCappedFires = Math.min(potentialTotalFires, maxAllowedByRateLimit);

    const scenariosFiredDuringDinner = scenarioFireLog.length;
    const firstAnchorAt = log.length > 0 ? log[0].simTime : null;

    const summary = {
      order: 237,
      seed: 42,
      dinnerMinutes: DINNER_MINUTES,
      bufferSec: BUFFER_SEC,
      minGapSec: MIN_GAP_SEC,
      maxPerService: maxAllowedByRateLimit,
      doorsOpenAt: Math.round(doorsOpenAt * 100) / 100,
      serviceCloseAt: Math.round(serviceCloseAt * 100) / 100,
      serviceWindowSec: Math.round(serviceWindowSec * 100) / 100,
      scenariosPlanned: plannedScenarios,
      scenariosFired: scenariosFiredDuringDinner,
      allScenariosFired: scenariosFiredDuringDinner === plannedScenarios,
      scheduledFireTimes: scheduledFireTimes.map((t) => Math.round(t * 100) / 100),
      actualScenarioFireTimes: scenarioFireLog.map((t) => Math.round(t * 100) / 100),
      anchorFires: log.length,
      firstAnchorAt,
      openWindows,
      totalOpenSec: Math.round(totalOpenSec * 100) / 100,
      openShareOfService: Math.round(openShare * 10000) / 100, // procent
      // Min-gap-analys per fönster: hur många fyrningar buffern tillät
      // (utan min-gap-begränsning), hur många min-gap-begränsningen
      // tillät (rate limit), och hur många faktiskt kom.
      potentialFiresPerWindow,
      potentialTotalFires,
      potentialCappedByMaxPerService: potentialCappedFires,
      actualFires: log.length,
      minGapConstraint: {
        note:
          potentialTotalFires > log.length
            ? `Min-gap ${MIN_GAP_SEC}s begränsade — potentiellt ${potentialTotalFires} fyrningar tillät fönstret, ${maxAllowedByRateLimit} tillät max-per-service, ${log.length} kom.`
            : `Fönster-storleken var bindande, inte min-gap.`
      }
    };

    // ORDER 239 uppföljning — rapport skrivs bara när WRITE_REPORTS=1.
    // Se order235-testet för samma mönster.
    if (process.env.WRITE_REPORTS === '1') {
      mkdirSync(REPORT_DIR, { recursive: true });
      writeFileSync(
        REPORT_JSON,
        JSON.stringify({ summary, anchorFires: log, scenarioFires: scenarioFireLog }, null, 2)
      );
    }

    // eslint-disable-next-line no-console
    console.info(
      `\n[ORDER 237] 90s-varianten — seed=42, ${DINNER_MINUTES}-min dinner\n` +
        `  buffer: ${BUFFER_SEC}s (var ${180}s i 235), min-gap: ${MIN_GAP_SEC}s (var ${180}s i 235)\n` +
        `  service window: [${summary.doorsOpenAt}s → ${summary.serviceCloseAt}s] = ${summary.serviceWindowSec}s\n` +
        `  first anchor: ${firstAnchorAt !== null ? firstAnchorAt.toFixed(1) + 's' : '(none)'}\n` +
        `  anchor fires: ${log.length}  (potentiellt ${potentialTotalFires} enligt fönster, ${maxAllowedByRateLimit} enligt max-per-service)\n` +
        `  scenarios: ${scenariosFiredDuringDinner}/${plannedScenarios} fyrade\n` +
        `  scheduled fires: [${scheduledFireTimes.map((t) => t.toFixed(1)).join(', ')}]\n` +
        `  actual fires: [${scenarioFireLog.map((t) => t.toFixed(1)).join(', ')}]\n` +
        `  open windows (${openWindows.length}):\n` +
        openWindows
          .map((w) => `    [${w.startSec.toFixed(1)}s → ${w.endSec.toFixed(1)}s] = ${w.lengthSec.toFixed(1)}s  (${w.reason})`)
          .join('\n') +
        `\n  total open: ${summary.totalOpenSec}s = ${summary.openShareOfService}% av service\n` +
        `  min-gap: ${summary.minGapConstraint.note}\n` +
        `  report: reports/order237-anchor-picker-90s/timeline.json\n`
    );

    expect(scenariosFiredDuringDinner).toBe(plannedScenarios);
    expect(s.day.period).toBe('evening');
  });
});
