// ORDER 235 — mätpass efter borttagen scenariospärr.
//
// Ersätter ORDER 234:s 5+10-min-uppdelning med ursprunglig DoD:
// 15-min dinner, seed=42. Bekräftar att bidirectional 3-min-buffer
// (VO 2026-09-21 villkor 1) håller: anchor-picker respekterar
// `simTime + 180 < nästa schemalagda scenario` och
// `simTime > lastScenarioAt + 180`. Scenarier har oförändrat
// företräde; scheme-slot konsumeras aldrig med öppen anchor-fråga.
//
// Rapport (`reports/order235-anchor-picker/timeline.json`):
//   * första anchor-fråga vid vilken simTime
//   * alla planerade scenarier fyrade? (fired vs planned)
//   * öppna anchor-fönster inom dinner-fönstret (start, slut, längd)
//     — konsekvens av VO:s prognos om 3-min-buffer i 15-min service
//
// **STOPP-regel per VO villkor 2:** test 2 (day.test.ts:283) måste
// passera OFÖRÄNDRAD (utan höjd tick-budget eller ändrad bemanning).
// Detta mätpass verifierar samma sak i egen infrastruktur.

import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reducer } from '../reducer';
import { makeInitialState } from '../model';
import type { AnchorId } from '../anchors';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = resolve(HERE, '../../../../reports/order235-anchor-picker');
const REPORT_JSON = resolve(REPORT_DIR, 'timeline.json');

const DINNER_MINUTES = 15;
const TICK_HZ = 5;
const BUFFER_SEC = 180; // samma som ANCHOR_SCENARIO_BUFFER_SEC i reducer

interface AnchorFireLog {
  readonly simTime: number;
  readonly questionId: string;
  readonly anchorId: AnchorId | null;
  readonly askerRole: string | undefined;
  readonly wasCorrect: boolean;
  readonly promptFirst80: string;
}

interface OpenWindow {
  readonly startSec: number;
  readonly endSec: number;
  readonly lengthSec: number;
  readonly reason: string;
}

describe('ORDER 235 — mätpass 15-min dinner efter bidirectional buffer', () => {
  it('kör en 15-min dinner, seed=42, rapporterar fyrningar + öppna fönster', () => {
    let s = makeInitialState(42);
    s = reducer(s, { type: 'SKIP_LUNCH' });
    s = reducer(s, {
      type: 'OPEN_SERVICE',
      service: 'dinner',
      lengthMinutes: DINNER_MINUTES
    });

    // Snapshota schedule + service-fönster för fönster-beräkning.
    const dinnerOpenAt = s.simTime;
    const plannedScenarios = s.day.scenariosPlanned;
    const scheduledFireTimes: number[] = [...s.day.scenarioTriggerTimes];
    // "Doors open" är tiden när gäster kan komma in — service-perioden
    // startar efter opening + prep. Anchor-picker kan aktivera först
    // när `canFire` (period=dinner) — samma villkor som scenario
    // auto-fire, så pickerns tidsfönster börjar samtidigt med scheme:t.
    const dinnerCloseAt = dinnerOpenAt + DINNER_MINUTES * 60;

    const log: AnchorFireLog[] = [];
    const scenarioFireLog: number[] = []; // simTime för varje scenario-fyra

    const dt = 1 / TICK_HZ;
    const maxTicks = DINNER_MINUTES * 60 * TICK_HZ + 3000;

    let previousScenariosFired = s.day.scenariosFiredThisService;

    for (let i = 0; i < maxTicks; i++) {
      // Scenario auto-resolver så scenariot inte fastnar (samma pattern
      // som ORDER 234:s mätpass — utan detta går inte scenariot till
      // 'settled' och nya scenarier kan inte fyra).
      if (s.scenario.phase === 'subject' && s.scenario.pendingQuestion === null) {
        s = reducer(s, { type: 'ADVANCE_SCENARIO_TO_SITUATION' });
        s = reducer(s, { type: 'RESOLVE_SCENARIO', choice: 'A' });
      }
      // Scenario-fråga: svara index 0 (samma som harness-default).
      if (
        s.scenario.phase === 'question' &&
        s.scenario.pendingQuestion !== null &&
        s.scenario.pendingQuestion.anchorId === undefined
      ) {
        s = reducer(s, { type: 'ANSWER_QUESTION', index: 0 });
      }

      const before = s;
      s = reducer(s, { type: 'TICK', dt });

      // Detektera nya scenario-fyrningar.
      if (s.day.scenariosFiredThisService > previousScenariosFired) {
        scenarioFireLog.push(before.simTime);
        previousScenariosFired = s.day.scenariosFiredThisService;
      }

      // Fånga anchor-fråga när den fyras.
      if (
        s.scenario.phase === 'question' &&
        s.scenario.pendingQuestion !== null &&
        s.scenario.pendingQuestion.anchorId !== undefined &&
        (before.scenario.phase !== 'question' || before.scenario.pendingQuestion === null)
      ) {
        const pq = s.scenario.pendingQuestion;
        const correctIndex = pq.options.findIndex((o) => o.correct);
        const simTimeAtFire = s.simTime;
        // Svara rätt.
        s = reducer(s, { type: 'ANSWER_QUESTION', index: correctIndex });
        // 5 ticks läspaus.
        for (let t = 0; t < 5; t++) s = reducer(s, { type: 'TICK', dt });
        s = reducer(s, { type: 'ACK_QUESTION_EXPLANATION' });

        log.push({
          simTime: Math.round(simTimeAtFire * 100) / 100,
          questionId: pq.sourceBankId ?? '(unknown)',
          anchorId: pq.anchorId ?? null,
          askerRole: pq.askerRole,
          wasCorrect: pq.options[correctIndex]?.correct ?? false,
          promptFirst80: pq.body.substring(0, 80)
        });
      }

      // Stanna när period → evening (efter service-close).
      if (s.day.period === 'evening') break;
    }

    // Snapshota `scenariosFiredThisService` INNAN service-close skulle
    // ha nollställt den — vi vill räkna vad som fyrades under dinner.
    // Använd scenarioFireLog-längden som robust räknare (nollställs
    // aldrig av service-close-transitionen).
    const scenariosFiredDuringDinner = scenarioFireLog.length;

    // Beräkna öppna fönster.
    // Fönstren är segment inom [dinnerOpenAt, dinnerCloseAt] där varken
    // en 3-min-buffer före ett schemalagt scenario eller 3-min-buffer
    // efter ett fyrat scenario täcker tiden. Vi använder scheduledFire-
    // Times (från snapshot vid OPEN_SERVICE) — dessa är de tider
    // pickern gate:ar mot i real-time.
    interface ClosedSegment {
      startSec: number;
      endSec: number;
      reason: string;
    }
    const closedSegments: ClosedSegment[] = [];
    for (const fireTime of scheduledFireTimes) {
      // Före-scheme-buffer: [fireTime - BUFFER, fireTime]
      closedSegments.push({
        startSec: Math.max(dinnerOpenAt, fireTime - BUFFER_SEC),
        endSec: Math.min(dinnerCloseAt, fireTime),
        reason: `<${BUFFER_SEC}s före scenario@${Math.round(fireTime)}s`
      });
      // Efter-scenario-buffer: [fireTime, fireTime + BUFFER]
      // Notera: den här buffern beror på om scenariot fyrar exakt vid
      // fireTime; om det försenas p.g.a. anchor-fråga skiftar även
      // buffern. Vi antar schemaenlig fyra för fönster-analys.
      closedSegments.push({
        startSec: Math.max(dinnerOpenAt, fireTime),
        endSec: Math.min(dinnerCloseAt, fireTime + BUFFER_SEC),
        reason: `<${BUFFER_SEC}s efter scenario@${Math.round(fireTime)}s`
      });
    }
    // Merge överlappande stängda segment.
    closedSegments.sort((a, b) => a.startSec - b.startSec);
    const merged: ClosedSegment[] = [];
    for (const seg of closedSegments) {
      const last = merged[merged.length - 1];
      if (last && seg.startSec <= last.endSec) {
        last.endSec = Math.max(last.endSec, seg.endSec);
        last.reason = `${last.reason} + ${seg.reason}`;
      } else {
        merged.push({ ...seg });
      }
    }
    // Beräkna öppna fönster som komplementet inom [dinnerOpenAt, dinnerCloseAt].
    const openWindows: OpenWindow[] = [];
    let cursor = dinnerOpenAt;
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
    if (cursor < dinnerCloseAt) {
      openWindows.push({
        startSec: Math.round(cursor * 100) / 100,
        endSec: Math.round(dinnerCloseAt * 100) / 100,
        lengthSec: Math.round((dinnerCloseAt - cursor) * 100) / 100,
        reason: 'öppet till service-close'
      });
    }

    const firstAnchorAt = log.length > 0 ? log[0].simTime : null;
    const allScenariosFired = scenariosFiredDuringDinner === plannedScenarios;

    const summary = {
      order: 235,
      seed: 42,
      dinnerMinutes: DINNER_MINUTES,
      bufferSec: BUFFER_SEC,
      dinnerOpenAt: Math.round(dinnerOpenAt * 100) / 100,
      dinnerCloseAt: Math.round(dinnerCloseAt * 100) / 100,
      scenariosPlanned: plannedScenarios,
      scenariosFired: scenariosFiredDuringDinner,
      allScenariosFired,
      scheduledFireTimes: scheduledFireTimes.map((t) => Math.round(t * 100) / 100),
      actualScenarioFireTimes: scenarioFireLog.map((t) => Math.round(t * 100) / 100),
      anchorFires: log.length,
      firstAnchorAt,
      openWindows: openWindows.map((w) => ({
        ...w,
        // Extra: hur många ticks fönstret motsvarar
      })),
      totalOpenWindowSec: Math.round(
        openWindows.reduce((sum, w) => sum + w.lengthSec, 0) * 100
      ) / 100,
      totalDinnerSec: DINNER_MINUTES * 60,
      openWindowShareOfService: Math.round(
        (openWindows.reduce((sum, w) => sum + w.lengthSec, 0) / (DINNER_MINUTES * 60)) * 10000
      ) / 100 // procent, två decimaler
    };

    mkdirSync(REPORT_DIR, { recursive: true });
    writeFileSync(
      REPORT_JSON,
      JSON.stringify({ summary, anchorFires: log, scenarioFires: scenarioFireLog }, null, 2)
    );

    // eslint-disable-next-line no-console
    console.info(
      `\n[ORDER 235] anchor-picker measurement — seed=42, ${DINNER_MINUTES}-min dinner\n` +
        `  first anchor at: ${firstAnchorAt !== null ? firstAnchorAt.toFixed(1) + 's' : '(none)'}\n` +
        `  anchor fires: ${log.length}\n` +
        `  scenarios fired: ${scenariosFiredDuringDinner} / ${plannedScenarios}  (all: ${allScenariosFired})\n` +
        `  scheduled fire times: [${scheduledFireTimes.map((t) => t.toFixed(1)).join(', ')}]\n` +
        `  actual scenario fires: [${scenarioFireLog.map((t) => t.toFixed(1)).join(', ')}]\n` +
        `  open windows (${openWindows.length}):\n` +
        openWindows
          .map((w) => `    [${w.startSec.toFixed(1)}s → ${w.endSec.toFixed(1)}s] = ${w.lengthSec.toFixed(1)}s`)
          .join('\n') +
        `\n  total open: ${summary.totalOpenWindowSec}s (${summary.openWindowShareOfService}%)\n` +
        `  report: reports/order235-anchor-picker/timeline.json\n`
    );

    // Enda assertion — mätpasset ska köras utan invariantfel.
    // Talen läses ur rapporten. VO villkor 2: alla planerade scenarier
    // ska ha fyrats.
    expect(scenariosFiredDuringDinner).toBe(plannedScenarios);
    // Sim körd tills evening.
    expect(s.day.period).toBe('evening');
  });
});
