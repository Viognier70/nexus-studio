#!/usr/bin/env node
// ORDER 219 A+B+C — video-verify.
//
// VO 2026-09-14: "Verifiera med video, 30 sekunder. Det är enda sättet
// att avgöra om rörelsen ser ut som service."
//
// Fokus: KVARTERSKROGEN eftersom värd-pucken faktiskt renderas där
// (STATION_MAP.kvarterskrogen.värd='host' finns i restaurantRoom.
// staffStations). Ölkrogen har STATION_MAP.värd='taps' som saknas
// i geometrin — ingen värd-puck där tills Design levererar 'taps'-
// station. Egen order när det blir aktuellt.
//
// Vad videon ska visa:
//   1) Värden går till entrén när en gäst anländer (ny greet-task, §B)
//   2) Servitören går till gästens stol när order/checkback firas (§A)
//   3) Mellan uppgifter går personalen tillbaka till hemplatsen — inte
//      hovering mot centrum via strain-pull (§C)
//
// 45 s realtid @ speed=1 efter 25 s warmup. Total ~70 s per klass.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, renameSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(tmpdir(), `nexus-order219-${Date.now()}`);
mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1280, height: 720 };
const WARMUP_MS = 25000;
const RECORD_MS = 45000;

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
  if (!proc) return;
  return new Promise((res) => {
    proc.on('exit', () => res());
    proc.kill('SIGTERM');
    setTimeout(() => { proc.kill('SIGKILL'); res(); }, 3000);
  });
}

async function recordClass(browser, viteUrl, businessArg) {
  const classVideoDir = resolve(REPORT_DIR, businessArg);
  mkdirSync(classVideoDir, { recursive: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: classVideoDir, size: VIEWPORT }
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));

  const bust = Date.now();
  await page.goto(
    `${viteUrl}/?bust=${bust}#playtest=1&business=${businessArg}&period=lunch`,
    { waitUntil: 'domcontentloaded' }
  );
  await page.waitForFunction(
    () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
    null, { timeout: 60000 }
  );
  await delay(1500);

  await page.fill('input[type=text]', 'ORDER 219 ' + businessArg);
  await page.click('button[type=submit]');
  await delay(2500);

  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '4' }));
    window.__nxSimDispatch({ type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 20 });
    window.__nxSimDispatch({ type: 'SET_SPEED', speed: 8 });
  });

  await delay(WARMUP_MS);

  await page.evaluate(() => window.__nxSimDispatch({ type: 'SET_SPEED', speed: 1 }));
  console.log(`  [${businessArg}] speed=1, spelar in ${RECORD_MS / 1000} s...`);

  // Samla samtidigt en greet-räknare — hur många greet-tasks fyrar under
  // sampling-fönstret. Bevisar att §B fungerar.
  const startTime = Date.now();
  let maxGreetGuests = 0;
  let greetSightings = 0;
  const pollDeadline = Date.now() + RECORD_MS;
  while (Date.now() < pollDeadline) {
    const s = await page.evaluate(() => {
      const st = window.__nxSimState;
      if (!st) return null;
      const värd = st.staff.find((m) => m.role === 'värd');
      const greetActive = värd?.taskType === 'greet';
      const greetedCount = st.guests.filter((g) => g.hasBeenGreeted).length;
      return { greetActive, greetedCount };
    });
    if (s) {
      if (s.greetActive) greetSightings++;
      if (s.greetedCount > maxGreetGuests) maxGreetGuests = s.greetedCount;
    }
    await delay(200);
  }
  void startTime;

  await page.close();
  await context.close();

  const files = readdirSync(classVideoDir).filter((f) => f.endsWith('.webm'));
  if (files.length === 0) return { business: businessArg, videoPath: null, ok: false };
  const src = resolve(classVideoDir, files[0]);
  const dst = resolve(REPORT_DIR, `${businessArg}.webm`);
  renameSync(src, dst);
  return {
    business: businessArg,
    videoPath: dst,
    greetSightings,
    maxGreetGuests,
    ok: true
  };
}

const vite = await startVite();
console.log(`Vite på ${vite.url}`);
console.log(`Rapport → ${REPORT_DIR}`);

const browser = await chromium.launch();
const results = [];
try {
  for (const cls of ['kvarterskrogen', 'olkrogen']) {
    console.log(`\n== ${cls} ==`);
    const r = await recordClass(browser, vite.url, cls);
    results.push(r);
    console.log(`  video: ${r.videoPath ?? '(ingen)'}`);
    console.log(`  greet-frames observerade: ${r.greetSightings ?? '-'}`);
    console.log(`  greetade gäster (max): ${r.maxGreetGuests ?? '-'}`);
  }
} finally {
  await browser.close();
  await stopVite(vite.proc);
}

console.log('\n=== ORDER 219 A+B+C — sammanfattning ===');
for (const r of results) {
  console.log(`  ${r.business.padEnd(20)} video=${r.videoPath ?? 'FAIL'} greet-frames=${r.greetSightings ?? '-'} greetade=${r.maxGreetGuests ?? '-'}`);
}
console.log(`\nRapport-katalog: ${REPORT_DIR}`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
