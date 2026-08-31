#!/usr/bin/env node
// ORDER 154 — verifiera mappningstabellen sim-roll → station per klass.
//
// Metod: dynamiskt importera `businessRoom.ts` i browsern, montera
// varje klass via createRoom, kalla `stationsForAllRoles(room)` och
// jämför resultatet mot VO:s 24-cellers tabell. Kontroll av
// world-transform: `resolveStaffStationsWorld(room)` ska ge samma
// station-positioner i värld-XZ.
//
// VO-mappningen (VO 2026-08-31):
//   kvarterskrogen: värd=host,       servitör=server, kock=chef,   lärling=server
//   ölkrogen:       värd=__entrance, servitör=runner, kock=brewer, lärling=runner
//   vinbaren:       värd=__entrance, servitör=runner, kock=cook,   lärling=runner
//   gästgiveriet:   värd=host,       servitör=hallA,  kock=chef,   lärling=null
//   foodtrucken:    värd=null,       servitör=window, kock=cook,   lärling=null
//   nattklubben:    värd=door,       servitör=floor,  kock=null,   lärling=null

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order154');
mkdirSync(REPORT_DIR, { recursive: true });
const VIEWPORT = { width: 1920, height: 1080 };

const EXPECTED = {
  kvarterskrogen: { värd: 'host',       servitör: 'server', kock: 'chef',   lärling: 'server' },
  ölkrogen:       { värd: '__entrance', servitör: 'runner', kock: 'brewer', lärling: 'runner' },
  vinbaren:       { värd: '__entrance', servitör: 'runner', kock: 'cook',   lärling: 'runner' },
  gästgiveriet:   { värd: 'host',       servitör: 'hallA',  kock: 'chef',   lärling: null },
  foodtrucken:    { värd: null,         servitör: 'window', kock: 'cook',   lärling: null },
  nattklubben:    { värd: 'door',       servitör: 'floor',  kock: null,     lärling: null }
};

async function startVite() {
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND, stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {}); proc.stderr.on('data', () => {});
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error('vite exited early');
    try { const r = await fetch('http://localhost:5173/'); if (r.ok || r.status === 304) return proc; } catch {}
    await delay(500);
  }
  throw new Error('vite timeout');
}

const vite = await startVite();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT });
page.on('pageerror', (err) => console.error('[pageerror]', err.message));

try {
  await page.goto('http://localhost:5173/#playtest=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
    null, { timeout: 60000 }
  );
  await delay(1500);

  const results = await page.evaluate(async (expected) => {
    const contract = await import('/src/strategic/scene/businessRoom.ts');
    const perClass = {};
    for (const roomClass of Object.keys(expected)) {
      let opts = {};
      // Foodtrucken tar inga width/depth-args (fordonet är fast storlek);
      // övriga klasser tar OBB.
      if (roomClass !== 'foodtrucken') opts = { width: 15.6, depth: 11.8 };
      let room;
      try { room = contract.createRoom(roomClass, opts); }
      catch (e) { perClass[roomClass] = { error: String(e.message ?? e) }; continue; }
      room.group.updateWorldMatrix(true, true);
      const all = contract.stationsForAllRoles(room);
      const world = contract.resolveStaffStationsWorld(room);
      const rec = {};
      for (const role of ['värd', 'servitör', 'kock', 'lärling']) {
        const station = all[role];
        const w = world[role];
        rec[role] = {
          stationId: station ? station.id : null,
          worldXZ: w ? [Number(w[0].toFixed(3)), Number(w[1].toFixed(3))] : null,
          note: station ? station.note : null
        };
      }
      perClass[roomClass] = rec;
      room.dispose?.();
    }
    return perClass;
  }, EXPECTED);

  writeFileSync(resolve(REPORT_DIR, 'stationfor-mapping.json'), JSON.stringify(results, null, 2));

  console.log('\n=== ORDER 154 — sim-roll → station per klass ===\n');
  let ok = true;
  for (const [roomClass, expected] of Object.entries(EXPECTED)) {
    const actual = results[roomClass];
    if (actual?.error) {
      console.log(`${roomClass}: ERROR ${actual.error}`);
      ok = false;
      continue;
    }
    console.log(`${roomClass}:`);
    for (const role of ['värd', 'servitör', 'kock', 'lärling']) {
      const got = actual[role].stationId;
      const want = expected[role];
      const match = got === want;
      const worldStr = actual[role].worldXZ
        ? `(${actual[role].worldXZ[0].toFixed(1)}, ${actual[role].worldXZ[1].toFixed(1)})`
        : '—';
      const flag = match ? 'OK' : 'FEL';
      console.log(
        `  ${role.padEnd(8)} → ${String(got).padEnd(12)} ${worldStr.padEnd(20)} (förv. ${String(want).padEnd(12)}) [${flag}]`
      );
      if (!match) ok = false;
    }
    console.log('');
  }
  if (!ok) {
    console.error('FEL: minst en cell avviker från VO-tabellen.');
    process.exitCode = 1;
  } else {
    console.log('OK — alla 24 celler stämmer mot Vision Owner-tabellen.');
  }
} finally {
  await browser.close();
  await new Promise((r) => { vite.on('exit', r); vite.kill('SIGTERM'); setTimeout(() => { vite.kill('SIGKILL'); r(); }, 3000); });
}
