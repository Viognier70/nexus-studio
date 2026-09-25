#!/usr/bin/env node
// ORDER 170 — On break-spåret, live-sim-audit i ölkrogen.
//
// **Vad talen kommer ifrån.** Skriptet startar Vite, laddar dev-appen med
// `#playtest=1&business=ölkrogen&period=lunch`, dispatch:ar
// OPEN_SERVICE(lunch, 15 min), sätter speed=0 och driver ticken manuellt
// (dt=0.2, 5 Hz). Vid nio elapsed-punkter läses:
//   1. `state.simTime`, `state.day.periodStartAt`, `state.day.doorsOpenAt`,
//      `state.day.openingEndsAt`, `state.day.doorsOpenedThisService`,
//      `state.day.currentServiceLengthMinutes`, `state.day.waitingAtOpening`
//   2. `state.staff.map(s => ({role, taskType, targetGuestId, workload}))`
//   3. `state.guests.length`, `state.waitingIds.length`, `state.seatedIds.length`
//   4. DevPanel-strängens `service=`-fält, direkt från renderad DOM
//      (querySelector på panelen, plockar ut `\bservice=\S+\/\d+min\b`)
// Alla tal skrivs till `frontend/reports/order170/on-break-live-audit.json`.
// Rapporten citerar filnamnet, inte tal.
//
// Elapsed-punkterna är valda för att pin:na fas-gränserna + reproducera
// ordertextens två observationer:
//   * 20 s     — inuti prep (opening slutar vid 10 s, prep vid 130 s)
//   * 60 s     — mitten av prep
//   * 129 s    — sista sekunden i prep, matchar observationens `12:51/15min`
//                OM fältet är remaining
//   * 130 s    — exakt prep-slut
//   * 131 s    — första sekunden i service
//   * 200 s    — tidigt i service
//   * 500 s    — mitt i service (7:20 elapsed → remaining 6:40)
//   * 880 s    — matchar observationens `14:40/15min` OM fältet är remaining
//                (elapsed 14:40 → remaining 0:20 — motsatt tolkning)
//   * 890 s    — sista tio sekunderna, som en fråga OM prep pågår sent

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order170');
mkdirSync(REPORT_DIR, { recursive: true });

const TARGET_ELAPSED = [20, 60, 129, 130, 131, 200, 500, 880, 890];
const BATCH_TICKS = 25;
const DT = 0.2;

async function startVite() {
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND, stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {}); proc.stderr.on('data', () => {});
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error('vite exited early');
    try {
      const r = await fetch('http://localhost:5173/');
      if (r.ok || r.status === 304) return proc;
    } catch {}
    await delay(500);
  }
  throw new Error('vite timeout');
}

const vite = await startVite();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

const consoleLog = [];
page.on('console', (msg) => consoleLog.push(`${msg.type()}: ${msg.text()}`));
page.on('pageerror', (err) => consoleLog.push(`pageerror: ${err.message}`));

try {
  // URL-parametern URL-avkodas INTE (urlParams.ts:124 gör bara
  // hash.replace('#', '')). Använd `brewpub`-aliaset från ORDER 125
  // för att slippa Ä-hantering. Aliaset mappas till 'ölkrogen' i
  // parseBusiness (urlParams.ts:169).
  await page.goto(
    'http://localhost:5173/#playtest=1&business=brewpub&period=lunch',
    { waitUntil: 'domcontentloaded' }
  );
  await page.waitForFunction(
    () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
    null, { timeout: 60000 }
  );
  await delay(1500);

  // Öppna lunchservice manuellt — 15 min matchar observationens `/15min`.
  await page.evaluate(() => {
    window.__nxSimDispatch({ type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 15 });
  });
  await delay(500);

  // Sätt speed=0 så vi driver ticken själva.
  await page.evaluate(() => { window.__nxSimState.speed = 0; });
  await delay(200);

  // Snap vid t=0 (efter OPEN_SERVICE, före första tick).
  async function snap(labelSimTime) {
    // Vänta ett React-tick så DevPanel hinner re-rendera.
    await delay(150);
    return page.evaluate((expectedSimTime) => {
      const s = window.__nxSimState;
      const d = s.day || {};
      // Läs DevPanel-strängen direkt från renderad DOM. Panelen har
      // whiteSpace:pre, så en text-nod bär hela strängen med \n-radbrytare.
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      let devPanelText = null;
      while (walker.nextNode()) {
        const t = walker.currentNode.textContent || '';
        if (t.includes('service=') && t.includes('day=')) {
          devPanelText = t;
          break;
        }
      }
      // Extrahera `service=`-fältet ur strängen.
      const serviceMatch = devPanelText ? devPanelText.match(/service=(\S+)/) : null;
      const serviceField = serviceMatch ? serviceMatch[1] : null;
      // Datera fas som derivePhase gör (deriveActions.ts:60-69).
      const t = Number(s.simTime ?? 0);
      let computedPhase;
      if (d.period === 'morning') computedPhase = 'morning';
      else if (d.period === 'afternoon') computedPhase = 'afternoon';
      else if (d.period === 'evening') computedPhase = 'evening';
      else if (d.openingEndsAt != null && t < d.openingEndsAt) computedPhase = 'opening';
      else if (d.doorsOpenAt != null && t < d.doorsOpenAt) computedPhase = 'prep';
      else computedPhase = 'service';
      const staff = (s.staff || []).map((st) => ({
        role: st.role,
        taskType: st.taskType,
        targetGuestId: st.targetGuestId,
        workload: st.workload
      }));
      const allThreeIdle = staff.length >= 3
        && staff.filter((s) => s.taskType == null).length >= 3;
      const onBreakByS2 = computedPhase === 'prep'
        && staff.filter((s) => s.taskType == null).length >= 3;
      return {
        targetSimTime: expectedSimTime,
        simTime: t,
        periodStartAt: Number(d.periodStartAt ?? 0),
        openingEndsAt: d.openingEndsAt,
        doorsOpenAt: d.doorsOpenAt,
        doorsOpenedThisService: d.doorsOpenedThisService,
        currentServiceLengthMinutes: d.currentServiceLengthMinutes,
        waitingAtOpening: d.waitingAtOpening,
        period: d.period,
        elapsedSinceServiceStart: t - Number(d.periodStartAt ?? 0),
        remainingSec: Math.max(0, (d.currentServiceLengthMinutes ?? 0) * 60
          - (t - Number(d.periodStartAt ?? 0))),
        devPanelServiceField: serviceField,
        devPanelRawIncludesOnBreak: /On break/.test(devPanelText || ''),
        devPanelFull: devPanelText,
        computedPhase,
        staff,
        allThreeIdle,
        onBreakByS2,
        guestsTotal: (s.guests || []).length,
        waitingIdsCount: (s.waitingIds || []).length,
        seatedIdsCount: (s.seatedIds || []).length,
        businessClass: s.businessClass
      };
    }, labelSimTime);
  }

  const snapshots = [];
  snapshots.push(await snap(0));

  // Driv sim mot varje target-elapsed. Vi antar periodStartAt är i
  // närheten av nuvarande simTime efter OPEN_SERVICE (kan vara några
  // sim-sek framåt om default-state hann ticka innan speed=0 sattes).
  const startSnap = snapshots[0];
  const baseSim = startSnap.periodStartAt || startSnap.simTime;

  for (const target of TARGET_ELAPSED) {
    const targetAbs = baseSim + target;
    // Kör TICK tills simTime >= targetAbs (varje TICK += 0.2 s sim).
    while (true) {
      const cur = await page.evaluate(() => Number(window.__nxSimState.simTime ?? 0));
      if (cur >= targetAbs - 0.001) break;
      const need = Math.max(1, Math.ceil((targetAbs - cur) / DT));
      const batch = Math.min(need, BATCH_TICKS);
      await page.evaluate((n) => {
        for (let i = 0; i < n; i++) window.__nxSimDispatch({ type: 'TICK', dt: 0.2 });
      }, batch);
    }
    snapshots.push(await snap(target));
  }

  // Sammanfatta ordertextens två observationspunkter (129s och 880s
  // elapsed motsvarar `12:51/15min` respektive `14:40/15min` OM panelen
  // är remaining; motsatt tolkning skulle innebära `2:09` respektive
  // `0:20` remaining). Skriptet skriver vad panelen faktiskt visar.
  const at129 = snapshots.find((s) => s.targetSimTime === 129) || null;
  const at880 = snapshots.find((s) => s.targetSimTime === 880) || null;
  const at20  = snapshots.find((s) => s.targetSimTime === 20)  || null;

  const report = {
    order: 170,
    title: 'On break-spåret — live-sim-audit i ölkrogen',
    orderObservations: {
      obs1: { date: '2026-09-01', devPanelService: '12:51/15min', waiting: 3, rolesOnBreak: 3 },
      obs2: { date: '2026-09-05', devPanelService: '14:40/15min', waiting: 5, rolesOnBreak: 3 }
    },
    setup: {
      business: 'ölkrogen',
      service: 'lunch',
      lengthMinutes: 15,
      tickDtSec: DT,
      note: 'Vite dev-server, playwright, speed=0 → manuell TICK-drift. State läses från window.__nxSimState; DevPanel-strängen från renderad DOM.'
    },
    snapshots,
    observationInterpretation: {
      observation1_12_51: at129 ? {
        elapsedSecFromScript: at129.elapsedSinceServiceStart,
        devPanelServiceFieldAtSameElapsed: at129.devPanelServiceField,
        computedPhase: at129.computedPhase,
        onBreakByS2: at129.onBreakByS2,
        matchesObservation: at129.devPanelServiceField === '12:51/15min'
      } : null,
      observation2_14_40: at880 ? {
        elapsedSecFromScript: at880.elapsedSinceServiceStart,
        devPanelServiceFieldAtSameElapsed: at880.devPanelServiceField,
        computedPhase: at880.computedPhase,
        onBreakByS2: at880.onBreakByS2,
        matchesObservation: at880.devPanelServiceField === '14:40/15min'
      } : null,
      earlyPrepCheck: at20 ? {
        elapsedSec: at20.elapsedSinceServiceStart,
        devPanelServiceField: at20.devPanelServiceField,
        computedPhase: at20.computedPhase,
        note: 'Om panelen är remaining, ska service= vid elapsed=20s vara ~14:40/15min. Om elapsed, ~0:20/15min.'
      } : null
    },
    consoleTail: consoleLog.slice(-30)
  };

  const out = resolve(REPORT_DIR, 'on-break-live-audit.json');
  writeFileSync(out, JSON.stringify(report, null, 2));

  console.log('=== ORDER 170 — On break live-audit ===\n');
  console.log('Snapshot vid varje target-elapsed:');
  console.log('  target  actualElapsed  service=field    computedPhase  onBreak  staff(taskType)');
  for (const s of snapshots) {
    const tasks = s.staff.map((st) => `${st.role}:${st.taskType ?? 'null'}`).join(' ');
    console.log(
      `  ${String(s.targetSimTime).padStart(5)}s  ${s.elapsedSinceServiceStart.toFixed(1).padStart(6)}s        ${String(s.devPanelServiceField ?? '(null)').padEnd(15)} ${s.computedPhase.padEnd(13)} ${String(s.onBreakByS2).padEnd(7)} ${tasks}`
    );
  }
  console.log('');
  if (at129) {
    console.log(`Observation 1 (elapsed 129s): DevPanel service = "${at129.devPanelServiceField}", matches "12:51/15min"? ${at129.devPanelServiceField === '12:51/15min'}`);
  }
  if (at880) {
    console.log(`Observation 2 (elapsed 880s): DevPanel service = "${at880.devPanelServiceField}", matches "14:40/15min"? ${at880.devPanelServiceField === '14:40/15min'}`);
  }
  if (at20) {
    console.log(`Motsatt tolkning (elapsed 20s): DevPanel service = "${at20.devPanelServiceField}"`);
  }
  console.log(`\nRapport: ${out}`);
} finally {
  await browser.close();
  await new Promise((r) => { vite.on('exit', r); vite.kill('SIGTERM'); setTimeout(() => { vite.kill('SIGKILL'); r(); }, 3000); });
}
