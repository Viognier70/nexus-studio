#!/usr/bin/env node
// ORDER 202 §4 — mät MEP-förbrukning per pass, som underlag för
// framtida refill-kalibrering (VO-direktiv 2026-09-10 kl. 14:00:
// "Egen order, spelbalans. Redovisa förbrukning mot påfyllning per
// pass först.")
//
// Ingen refill finns i sim just nu (ORDER 202 §4 reverterade ORDER
// 201:s refill-kod). Mätningen dumpar:
//   • prepReadiness-serie över hela lunch-passet per klass
//   • antal gäster genom serving/dining per pass
//   • per-post consumption (napkins/cutlery/garnish/stations/ice)
//   • antal bg-task-completions per typ per pass (för framtida refill-
//     mängd-kalibrering: X-completions × Y-mängd = Z-refill/pass)
//   • prep-start-readiness → prep-slut-readiness → service-slut-readiness
//     (så vi ser hur mycket buffert prep bygger + hur snabbt service drar)
//
// Ingen kod-fix — bara mätning. Framtida order väljer refill-mängd
// utifrån dessa siffror.

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order202-mep');
mkdirSync(REPORT_DIR, { recursive: true });

// Ren sim-mätning utan browser — importerar reducer + hjälpare direkt
// från src via `tsx`-liknande node-loader. Vi använder samma
// package.json-strategy som befintliga sim-tester.
// (Om ren-sim-vägen saknar exposé för createInitialState kör vi via
// vitest-testramverk i stället — men prova ren-sim först.)

async function runViteMeasure(businessArg) {
  const { chromium } = await import('playwright');
  const url = 'http://localhost:5173';
  const spawnedVite = await ensureVite(url);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));

  const measurement = { class: businessArg, samples: [], summary: null };

  try {
    const bust = Date.now();
    await page.goto(`${url}/?bust=${bust}#playtest=1&business=${businessArg}&period=lunch`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForFunction(
      () => typeof window.__nxSimDispatch === 'function',
      null, { timeout: 60000 }
    );
    await delay(1500);
    await page.fill('input[type=text]', 'ORDER 202 mep');
    await page.click('button[type=submit]');
    await delay(2000);

    await page.evaluate(() => {
      window.__nxSimDispatch({ type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 15 });
      window.__nxSimDispatch({ type: 'SET_SPEED', speed: 16 });
    });

    // Vänta tills första gäst hunnit till serving/dining (indikerar
    // service startade och consumeMepForOneGuest har fyrats en gång).
    // Undviker att låsa på specifika prep-flaggor som kan variera.
    await page.waitForFunction(
      () => {
        const s = window.__nxSimState;
        if (!s) return false;
        return s.guests.some((g) =>
          ['dining', 'paying', 'serving', 'leaving'].includes(g.state)
        );
      },
      null, { timeout: 120000 }
    );
    const prepEnd = await page.evaluate(() => {
      const s = window.__nxSimState;
      return {
        simTime: s.simTime,
        doorsOpenAt: s.day.doorsOpenAt,
        prepReadiness: s.day.prepReadiness ?? null
      };
    });
    measurement.prepEnd = prepEnd;

    // Räkna gäster som passerat serving/dining under passet.
    // Poll ~2 sim-sec per sample (250ms realtid @ speed=32).
    const seenServed = new Set();
    const staffTaskCounts = {};
    let lastSeatedIds = new Set();
    const startedAt = Date.now();
    const deadline = startedAt + 60000;   // 60s realtid = 32 min sim, täcker hela lunch + closeout

    while (Date.now() < deadline) {
      const snap = await page.evaluate(() => {
        const s = window.__nxSimState;
        if (!s) return null;
        const served = s.guests
          .filter((g) => ['dining', 'paying', 'serving', 'leaving', 'declined'].includes(g.state))
          .map((g) => g.id);
        const activeTasks = s.staff
          .filter((st) => st.taskType != null)
          .map((st) => ({ id: st.id, type: st.taskType, progress: st.taskProgress, duration: st.taskDuration }));
        return {
          simTime: s.simTime,
          period: s.day.period,
          prepReadiness: s.day.prepReadiness ?? null,
          seatedIds: s.seatedIds ? [...s.seatedIds] : [],
          servedIds: served,
          activeTasks
        };
      });
      if (!snap) break;
      measurement.samples.push(snap);
      snap.servedIds.forEach((id) => seenServed.add(id));

      // Räkna task-completions genom att observera task-progress-återställning.
      // (Enklare approximation: räkna hur ofta vi ser ett taskType.)
      for (const t of snap.activeTasks) {
        staffTaskCounts[t.type] = staffTaskCounts[t.type] ?? {
          maxProgress: 0,
          observations: 0
        };
        staffTaskCounts[t.type].observations += 1;
        if (t.progress > staffTaskCounts[t.type].maxProgress) {
          staffTaskCounts[t.type].maxProgress = t.progress;
        }
      }

      // Om passet slutade (period ≠ lunch längre), avbryt.
      if (snap.period !== 'lunch') break;
      lastSeatedIds = new Set(snap.seatedIds);
      await delay(250);
    }

    const finalSnap = measurement.samples[measurement.samples.length - 1] ?? null;
    const finalReadiness = finalSnap?.prepReadiness ?? null;
    const startReadiness = measurement.prepEnd?.prepReadiness ?? null;
    const consumedPerItem = {};
    if (finalReadiness && startReadiness) {
      for (const key of Object.keys(startReadiness)) {
        consumedPerItem[key] = Number((startReadiness[key] - (finalReadiness[key] ?? 0)).toFixed(3));
      }
    }

    measurement.summary = {
      passLengthSimSec: finalSnap ? finalSnap.simTime - measurement.prepEnd.simTime : null,
      guestsServed: seenServed.size,
      startReadiness,
      finalReadiness,
      consumedPerItem,
      // Approximation: task-observations / duration ≈ completions. Enklare
      // proxy: bara den totala observationsmängden per typ. Underlag för
      // framtida refill-kalibrering (om misEnPlace observeras 800 gånger
      // under 60s realtid vid speed=32 = ~30 min sim, det motsvarar
      // 30 min / 800 obs ≈ 2.25 sim-sec per obs, dvs staff håller på
      // med den ~kontinuerligt när direct-tasks saknas).
      taskObservations: staffTaskCounts,
      lastSeatedCount: lastSeatedIds.size
    };
  } finally {
    await ctx.close();
    await browser.close();
    if (spawnedVite) await stopVite(spawnedVite);
  }

  return measurement;
}

async function ensureVite(url) {
  try { const r = await fetch(url + '/'); if (r.ok || r.status === 304) return null; } catch {}
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND, stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {}); proc.stderr.on('data', () => {});
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error('vite exited early');
    try { const r = await fetch(url + '/'); if (r.ok || r.status === 304) return proc; } catch {}
    await delay(500);
  }
  throw new Error('vite timeout');
}

async function stopVite(proc) {
  return new Promise((res) => {
    proc.on('exit', () => res());
    proc.kill('SIGTERM');
    setTimeout(() => { proc.kill('SIGKILL'); res(); }, 3000);
  });
}

const results = [];
for (const cls of ['ölkrogen', 'kvarterskrogen']) {
  console.log(`\n== ${cls} ==`);
  const m = await runViteMeasure(cls);
  console.log(`  guestsServed=${m.summary.guestsServed} passLengthSim=${m.summary.passLengthSimSec?.toFixed(0)}s`);
  console.log(`  startReadiness=${JSON.stringify(m.summary.startReadiness)}`);
  console.log(`  finalReadiness=${JSON.stringify(m.summary.finalReadiness)}`);
  console.log(`  consumedPerItem=${JSON.stringify(m.summary.consumedPerItem)}`);
  console.log(`  taskObservations=${JSON.stringify(m.summary.taskObservations)}`);
  results.push(m);
}

writeFileSync(
  resolve(REPORT_DIR, 'mep-measurement.json'),
  JSON.stringify({ measurements: results }, null, 2)
);
console.log(`\nRapport: ${resolve(REPORT_DIR, 'mep-measurement.json')}`);
