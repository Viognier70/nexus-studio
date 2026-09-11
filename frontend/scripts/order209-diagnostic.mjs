#!/usr/bin/env node
// ORDER 209 — diagnostik för fynd 1 från VO-inspelning 2026-09-11 16:45.
// Sim säger "Four at the four-top, one at the bar" (5 seated), rummet
// är tomt på gäster (spelaren ser 2). Femte inspelningen med samma
// mönster. Måste fånga:
//   - Vilka gäster har state='seated'/'ordering'/'dining'/'paying'?
//   - Vilka har `positionsRef.current`-entry (rig skapad)?
//   - Vilka är inom OBB (i praktiken renderbara)?
//   - `sitStandDir`/`sitStandPhase` per gäst
//   - Om sitLift = 0 eller > 0
//   - Kamera-läge (cam=?), visibility-beräkning
//
// Utdata: `frontend/reports/order209-diagnostic/state.json` + skärmdump.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order209-diagnostic');
mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1920, height: 1080 };

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

const vite = await startVite();
console.log(`Vite på ${vite.url}`);
const browser = await chromium.launch();
const page = await browser.newContext({ viewport: VIEWPORT }).then((c) => c.newPage());
page.on('pageerror', (e) => console.error('[pageerror]', e.message));

let snap;
try {
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
  await page.fill('input[type=text]', 'ORDER 209 DIAG');
  await page.click('button[type=submit]');
  await delay(2000);
  await page.evaluate(() => {
    window.__nxSimDispatch({ type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 20 });
    window.__nxSimDispatch({ type: 'SET_SPEED', speed: 8 });
  });
  await page.waitForFunction(
    () => window.__nxSimState?.seatedIds?.length >= 5,
    null, { timeout: 120000 }
  );
  await page.evaluate(() => window.__nxSimDispatch({ type: 'SET_SPEED', speed: 1 }));
  await delay(3000);

  snap = await page.evaluate(() => {
    const sim = window.__nxSimState;
    const posMap = window.__nxGuestPositions?.current ?? window.__nxGuestPositions;
    const roomRef = window.__nxBusinessRoomRef;
    const camera = window.__nxCamera;
    const layout = window.__nxLayoutBounds;

    const guests = [];
    if (sim && posMap) {
      const SEATED = new Set(['seated', 'ordering', 'dining', 'paying', 'sleeping']);
      for (const g of sim.guests) {
        const render = (posMap.get ? posMap.get(g.id) : null) ?? null;
        const isSeatedState = SEATED.has(g.state);
        const seatIdx = g.seatIndex ?? -1;
        const contractSeats = roomRef?.current?.seats ?? null;
        const seatXZ = (seatIdx >= 0 && contractSeats && seatIdx < contractSeats.length)
          ? contractSeats[seatIdx] : null;
        const distFromSeat = seatXZ && render
          ? Number(Math.hypot(render.cx - seatXZ[0], render.cz - seatXZ[1]).toFixed(2))
          : null;
        const distFromCentre = render && layout
          ? Number(Math.hypot(render.cx - layout.centre[0], render.cz - layout.centre[1]).toFixed(2))
          : null;
        const halfW = layout ? layout.width / 2 : null;
        const insideOBB = distFromCentre !== null && halfW !== null ? distFromCentre <= halfW * 1.02 : null;
        guests.push({
          id: g.id,
          state: g.state,
          isSeatedState,
          seatIndex: seatIdx,
          seatXZ,
          hasRenderPos: render !== null,
          renderPos: render ? { cx: render.cx, cz: render.cz } : null,
          sitStandDir: render?.sitStandDir ?? null,
          sitStandPhase: render?.sitStandPhase ?? null,
          distFromSeat,
          distFromCentre,
          insideOBB
        });
      }
    }

    const seatedFamily = guests.filter((g) => g.isSeatedState);
    const seatedWithRig = seatedFamily.filter((g) => g.hasRenderPos);
    const seatedNearSeat = seatedFamily.filter((g) => g.distFromSeat !== null && g.distFromSeat < 1.0);
    const seatedInsideOBB = seatedFamily.filter((g) => g.insideOBB === true);
    const seatedSitBlendComplete = seatedFamily.filter((g) => g.sitStandDir === -1 && g.sitStandPhase >= 1);

    return {
      simTime: sim?.simTime ?? null,
      seatedIdsCount: sim?.seatedIds?.length ?? null,
      guestCount: guests.length,
      cameraDist: camera?.actualRef?.current?.distance ?? null,
      cameraTarget: camera?.targetRef?.current?.distance ?? null,
      layout,
      contract: {
        class: roomRef?.current?.businessClass ?? null,
        seatCount: roomRef?.current?.seats?.length ?? null,
        stationCount: roomRef?.current?.stations?.length ?? null
      },
      guests,
      summary: {
        totalGuests: guests.length,
        seatedFamilyCount: seatedFamily.length,
        seatedWithRenderPos: seatedWithRig.length,
        seatedNearSeat: seatedNearSeat.length,
        seatedInsideOBB: seatedInsideOBB.length,
        seatedSitBlendComplete: seatedSitBlendComplete.length,
        seatedFarFromSeatButInsideOBB: seatedFamily.filter((g) =>
          g.distFromSeat !== null && g.distFromSeat > 3 && g.insideOBB === true
        ).length
      }
    };
  });

  await page.screenshot({ path: resolve(REPORT_DIR, 'diagnostic.png'), fullPage: false });
  writeFileSync(resolve(REPORT_DIR, 'state.json'), JSON.stringify(snap, null, 2));

  console.log(`\nsimTime=${snap.simTime?.toFixed(1)}s seatedIds=${snap.seatedIdsCount} cam=${snap.cameraDist?.toFixed(1)}m→${snap.cameraTarget?.toFixed(1)}m`);
  console.log(`  seatedFamily=${snap.summary.seatedFamilyCount} withRenderPos=${snap.summary.seatedWithRenderPos} nearSeat=${snap.summary.seatedNearSeat} insideOBB=${snap.summary.seatedInsideOBB} sitBlendComplete=${snap.summary.seatedSitBlendComplete}`);
  console.log(`  seated FAR from seat men insideOBB: ${snap.summary.seatedFarFromSeatButInsideOBB}`);
  const problem = snap.guests.filter((g) => g.isSeatedState && g.distFromSeat !== null && g.distFromSeat > 3);
  console.log(`\nProblemgäster (>3m från seat, sittande state):`);
  problem.slice(0, 8).forEach((g) => {
    console.log(`  id=${g.id.padEnd(8)} state=${g.state.padEnd(8)} seatIdx=${g.seatIndex} render=(${g.renderPos?.cx.toFixed(1)}, ${g.renderPos?.cz.toFixed(1)}) seat=(${g.seatXZ?.[0].toFixed(1)}, ${g.seatXZ?.[1].toFixed(1)}) d=${g.distFromSeat}m dir=${g.sitStandDir} phase=${g.sitStandPhase} insideOBB=${g.insideOBB}`);
  });
} finally {
  await browser.close();
  await stopVite(vite.proc);
}
console.log(`\nRapport: ${REPORT_DIR}`);
