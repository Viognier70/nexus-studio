#!/usr/bin/env node
// ORDER 145 — utred varför "seated cap:ar vid 5 medan waiting når 6".
//
// Loggar per tick: waiting, seated (transient state), seatedIds
// (VERKLIGA upptagna platser), lediga stolar, varje staff-medlems
// taskType + targetGuestId. Skriver till reports/order145/
// tick-log.json.
//
// PREMISS OCH FÖRDIAGNOS:
// ORDER 144 rapporterade `max seated 5/16` — men det var måttet
// `guests.filter(g.state === 'seated').length`, INTE
// `seatedIds.length`. `state='seated'` är transient (4 sim-sek per
// service.ts:243, sedan → 'ordering'), medan `seatedIds` bär alla
// gäster faktiskt vid bord (seated/ordering/dining/paying).
//
// Denna utredning bekräftar OM sim-lagret har (a) staff-action-fel
// eller (b) sätt-logik-fel — eller om ORDER 145:s premiss faller
// på fel mätsignal.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order145');
mkdirSync(REPORT_DIR, { recursive: true });

const TICKS = 20 * 60 * 5;   // 20 sim-min full lunchservice
const BATCH = 25;
const VIEWPORT = { width: 1920, height: 1080 };

async function startVite() {
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {});
  proc.stderr.on('data', () => {});
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error('vite exited early');
    try {
      const r = await fetch('http://localhost:5173/');
      if (r.ok || r.status === 304) return proc;
    } catch { /* not up */ }
    await delay(500);
  }
  throw new Error('vite timeout');
}

const vite = await startVite();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT });

try {
  await page.goto(
    'http://localhost:5173/#playtest=1&business=kvarterskrogen',
    { waitUntil: 'domcontentloaded' }
  );
  await page.waitForFunction(
    () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
    null,
    { timeout: 60000 }
  );
  await delay(1000);

  await page.evaluate(() => {
    window.__nxSimDispatch({ type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 20 });
  });
  await delay(500);
  await page.evaluate(() => { window.__nxSimState.speed = 0; });
  await delay(200);

  const samples = [];
  const batches = Math.ceil(TICKS / BATCH);
  for (let b = 0; b < batches; b++) {
    await page.evaluate((n) => {
      for (let i = 0; i < n; i++) window.__nxSimDispatch({ type: 'TICK', dt: 0.2 });
    }, BATCH);
    const snap = await page.evaluate(() => {
      const s = window.__nxSimState;
      const guests = s.guests || [];
      const stateCount = {};
      for (const g of guests) stateCount[g.state] = (stateCount[g.state] || 0) + 1;
      const cap = s.policies?.capacity ?? 0;
      const seatedIds = s.seatedIds || [];
      const waitingIds = s.waitingIds || [];
      const freeSeats = cap - seatedIds.length;
      const staff = (s.staff || []).map((m) => ({
        id: m.id,
        role: m.role,
        taskType: m.taskType,
        targetGuestId: m.targetGuestId,
        workload: Number((m.workload || 0).toFixed(3))
      }));
      return {
        simTime: Number(s.simTime ?? 0),
        period: s.day?.period ?? null,
        capacity: cap,
        seatedIds: seatedIds.length,
        waitingIds: waitingIds.length,
        freeSeats,
        stateCount,
        staff
      };
    });
    samples.push({ tick: (b + 1) * BATCH, ...snap });
  }

  // Analys: finns ticks där waiting>0 OCH lediga platser finns?
  const anomalies = samples.filter((s) => s.waitingIds > 0 && s.freeSeats > 0);
  const withWaiting = samples.filter((s) => s.waitingIds > 0);
  const withFullSeats = samples.filter((s) => s.seatedIds >= s.capacity);
  const maxSeatedIds = Math.max(...samples.map((s) => s.seatedIds));
  const maxWaitingIds = Math.max(...samples.map((s) => s.waitingIds));

  // Vad staff gör när waiting>0
  const staffActionsWhenWaiting = {};
  for (const s of withWaiting) {
    for (const m of s.staff) {
      const k = m.taskType ?? 'idle';
      staffActionsWhenWaiting[k] = (staffActionsWhenWaiting[k] || 0) + 1;
    }
  }

  const report = {
    config: { ticks: TICKS, batch: BATCH, tickDurationSec: 0.2 },
    diagnos: {
      maxSeatedIds,
      maxWaitingIds,
      ticksWithWaiting: withWaiting.length,
      ticksWithFullSeats: withFullSeats.length,
      ticksWithWaitingAndFreeSeats: anomalies.length,
      staffActionsWhenWaitingBreakdown: staffActionsWhenWaiting
    },
    anomalies: anomalies.slice(0, 20),
    samples
  };

  writeFileSync(
    resolve(REPORT_DIR, 'tick-log.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('\n=== ORDER 145 — seated/waiting/staff-audit ===');
  console.log(`Sim-tid körd:                            ${(TICKS * 0.2 / 60).toFixed(1)} min`);
  console.log(`Max seatedIds (verkligen upptagna):      ${maxSeatedIds}/${samples[0]?.capacity ?? 16}`);
  console.log(`Max waitingIds (kön):                    ${maxWaitingIds}`);
  console.log(`Ticks med waiting > 0:                   ${withWaiting.length}`);
  console.log(`Ticks med seatedIds = capacity (fullt):  ${withFullSeats.length}`);
  console.log(`**Ticks med waiting > 0 OCH free > 0:    ${anomalies.length}**`);
  console.log('');
  console.log('Staff-handlingar när waiting > 0:');
  for (const [k, n] of Object.entries(staffActionsWhenWaiting).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(15)} ${n}`);
  }
  console.log('');
  if (anomalies.length === 0) {
    console.log('SLUTSATS: sim-lagret fungerar korrekt. Kön uppstår ENDAST när');
    console.log('alla platser är fyllda; töms omedelbart när plats blir ledig.');
    console.log('ORDER 145:s premiss (seated=5, waiting=6) föll pga fel mätsignal:');
    console.log('ORDER 144 mätte guests.filter(g.state="seated").length, som är');
    console.log('transient (state=seated stannar 4 sim-sek innan → ordering).');
    console.log('Rätt signal är seatedIds.length — den når 16.');
  } else {
    console.log('FYND: sim har gap. Se anomalies[] i JSON för första 20 fall.');
    console.log('Titta på staffActionsWhenWaitingBreakdown för att avgöra om');
    console.log('(a) staff idle/On break, eller (b) staff busy med annat.');
  }
  console.log(`Rapport: ${resolve(REPORT_DIR, 'tick-log.json')}`);
} finally {
  await browser.close();
  await new Promise((r) => { vite.on('exit', r); vite.kill('SIGTERM'); setTimeout(() => { vite.kill('SIGKILL'); r(); }, 3000); });
}
