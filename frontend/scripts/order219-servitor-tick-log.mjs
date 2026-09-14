#!/usr/bin/env node
// ORDER 219 UTRED — servitör position per tick, med task.
//
// VO 2026-09-14: "logga en servitörs position per tick under ett pass,
// tillsammans med vilken uppgift hen har. Jag vill se om rörelsen
// korrelerar med uppgiften alls."
//
// Metod: kör 5 min lunch i ölkrogen (kortare än 8 min för att hålla
// loggen läsbar), sampla varje sim-tick via window.__nxSimState. Logga
// servitörens sim-position, task, targetGuestId, taskProgress. Utdata:
// CSV + summary (task-distribution + rörelselängd).

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(tmpdir(), `nexus-order219-${Date.now()}`);
mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1280, height: 720 };
// 5 min service: kortare än 8 för att hålla loggen läsbar (150 sample-fönster).
const SERVICE_MINUTES = 5;
// Sim-hz = 5. Sampla var 5:e realtid-tick vid speed=1 → var sim-sek.
const POLL_MS = 200;
// Total sampling: SERVICE_MINUTES * 60 sim-sek + 30 sek buffer.
const POLL_DURATION_MS = (SERVICE_MINUTES * 60 + 30) * 1000;

async function startVite() {
  const url = 'http://localhost:5173';
  try { const r = await fetch(url + '/'); if (r.ok || r.status === 304) return { proc: null, url }; } catch {}
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND, stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {}); proc.stderr.on('data', () => {});
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error('vite exited early');
    try { const r = await fetch(url + '/'); if (r.ok || r.status === 304) return { proc, url }; } catch {}
    await delay(500);
  }
  throw new Error('vite timeout');
}

async function stopVite(proc) {
  if (!proc) return new Promise((res) => res());
  return new Promise((res) => {
    proc.on('exit', () => res());
    proc.kill('SIGTERM');
    setTimeout(() => { proc.kill('SIGKILL'); res(); }, 3000);
  });
}

const vite = await startVite();
console.log(`Vite på ${vite.url}`);
console.log(`Rapport → ${REPORT_DIR}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));

const bust = Date.now();
await page.goto(
  `${vite.url}/?bust=${bust}#playtest=1&business=olkrogen&period=lunch`,
  { waitUntil: 'domcontentloaded' }
);
await page.waitForFunction(
  () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
  null, { timeout: 60000 }
);
await delay(1500);

await page.fill('input[type=text]', 'ORDER 219 utred');
await page.click('button[type=submit]');
await delay(2500);

await page.evaluate((minutes) => {
  window.__nxSimDispatch({ type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: minutes });
  window.__nxSimDispatch({ type: 'SET_SPEED', speed: 1 });
}, SERVICE_MINUTES);

await page.waitForFunction(() => window.__nxSimState !== undefined, null, { timeout: 30000 });

const samples = [];
const deadline = Date.now() + POLL_DURATION_MS;
console.log(`Samplar servitör var ${POLL_MS} ms i ${POLL_DURATION_MS / 1000} s...`);
let lastLoggedSimTime = -1;
while (Date.now() < deadline) {
  const snap = await page.evaluate(() => {
    const s = window.__nxSimState;
    if (!s) return null;
    const servitör = s.staff.find((m) => m.role === 'servitör');
    if (!servitör) return null;
    // Räkna kö-djup för context.
    const totalPending = s.staff.reduce((n, m) => n + m.taskQueue.length, 0);
    return {
      simTime: Number(s.simTime.toFixed(2)),
      x: Number(servitör.position.x.toFixed(2)),
      z: Number(servitör.position.z.toFixed(2)),
      taskType: servitör.taskType,
      targetGuestId: servitör.targetGuestId,
      taskProgress: servitör.taskProgress,
      taskDuration: servitör.taskDuration,
      queueLen: servitör.taskQueue.length,
      queueTypes: servitör.taskQueue.map((t) => t.type),
      totalPending,
      guestStates: s.guests.reduce((acc, g) => { acc[g.state] = (acc[g.state] ?? 0) + 1; return acc; }, {})
    };
  });
  if (snap && snap.simTime !== lastLoggedSimTime) {
    samples.push(snap);
    lastLoggedSimTime = snap.simTime;
  }
  await delay(POLL_MS);
}

await browser.close();
await stopVite(vite.proc);

// Analys.
console.log(`\n=== Servitör-log: ${samples.length} distinkta sim-tick-sample ===\n`);

// Task-distribution.
const taskCounts = {};
for (const s of samples) {
  const key = s.taskType ?? '(idle)';
  taskCounts[key] = (taskCounts[key] ?? 0) + 1;
}
console.log('Task-distribution (av samplade sim-ticks):');
for (const [k, v] of Object.entries(taskCounts).sort((a, b) => b[1] - a[1])) {
  const pct = (v / samples.length * 100).toFixed(1);
  console.log(`  ${k.padEnd(15)} ${String(v).padStart(4)} (${pct}%)`);
}

// Rörelselängd — total distans över hela loggen.
let totalDist = 0;
let movesWhileIdle = 0;
let movesWhileTask = 0;
for (let i = 1; i < samples.length; i++) {
  const a = samples[i - 1];
  const b = samples[i];
  const d = Math.hypot(b.x - a.x, b.z - a.z);
  totalDist += d;
  if (a.taskType == null) movesWhileIdle += d;
  else movesWhileTask += d;
}
console.log(`\nTotal sim-distans över loggen: ${totalDist.toFixed(2)} m`);
console.log(`  medan idle (taskType=null): ${movesWhileIdle.toFixed(2)} m (${(movesWhileIdle / totalDist * 100).toFixed(1)}%)`);
console.log(`  medan i task:               ${movesWhileTask.toFixed(2)} m (${(movesWhileTask / totalDist * 100).toFixed(1)}%)`);

// Positions-bandbredd — hur mycket flyttar sig servitören?
const xs = samples.map((s) => s.x);
const zs = samples.map((s) => s.z);
console.log(`\nSim-position range:`);
console.log(`  x: [${Math.min(...xs).toFixed(2)}, ${Math.max(...xs).toFixed(2)}] (bredd ${(Math.max(...xs) - Math.min(...xs)).toFixed(2)} m)`);
console.log(`  z: [${Math.min(...zs).toFixed(2)}, ${Math.max(...zs).toFixed(2)}] (bredd ${(Math.max(...zs) - Math.min(...zs)).toFixed(2)} m)`);

// CSV.
const csvHeader = 'simTime,x,z,taskType,targetGuestId,taskProgress,taskDuration,queueLen,queueTypes,totalPending,guestStates\n';
const csvRows = samples.map((s) =>
  `${s.simTime},${s.x},${s.z},${s.taskType ?? ''},${s.targetGuestId ?? ''},${s.taskProgress},${s.taskDuration},${s.queueLen},"${s.queueTypes.join('|')}",${s.totalPending},"${JSON.stringify(s.guestStates).replace(/"/g, '""')}"`
).join('\n');
const csvPath = resolve(REPORT_DIR, 'servitor-log.csv');
writeFileSync(csvPath, csvHeader + csvRows);
console.log(`\nCSV: ${csvPath}`);

// JSON för läsbarhet.
const jsonPath = resolve(REPORT_DIR, 'servitor-log.json');
writeFileSync(jsonPath, JSON.stringify({ samples, taskCounts, totalDist }, null, 2));
console.log(`JSON: ${jsonPath}`);

// Utdrag av intressanta övergångar (task-byten).
console.log('\nFörsta 20 task-byten (moment då taskType ändras):');
let prev = null;
let printed = 0;
for (const s of samples) {
  const cur = s.taskType ?? '(idle)';
  if (cur !== prev) {
    console.log(`  t=${s.simTime.toString().padStart(6)} pos=(${s.x.toFixed(1)},${s.z.toFixed(1)}) task=${cur.padEnd(15)} target=${s.targetGuestId ?? '-'} queue=${s.queueLen}[${s.queueTypes.join(',')}]`);
    prev = cur;
    printed++;
    if (printed >= 20) break;
  }
}
