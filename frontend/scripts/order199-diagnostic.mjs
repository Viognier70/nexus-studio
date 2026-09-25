#!/usr/bin/env node
// ORDER-diagnostic — undersöker fyra fynd från VO-inspelning 2026-09-10
// 11:31, ölkrogen. Reproducerar spelarens flöde och dumpar allt vi kan
// se om render-vs-sim-tillstånd vid två tidpunkter:
//   T1 = 26 s realtid (fyndets tidpunkt "seated=16/20 men ~6 syns")
//   T2 = 60 s realtid (kontrollobservation efter fler service-cykler)
//
// Ingen fix. Bara mätning mot samma källa som rendering läser (ORDER 128).

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order199-diagnostic');
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

async function snapshot(page, label) {
  const data = await page.evaluate(() => {
    const w = window;
    const sim = w.__nxSimState;
    const posRef = w.__nxGuestPositions;
    const staffPosRef = w.__nxStaffPositions;
    const staffPoseRef = w.__nxStaffPoses;
    const roomRef = w.__nxBusinessRoomRef;
    const camera = w.__nxCamera;

    // posRef är själva Map:en (dev-hooken skriver `positionsRef.current`).
    // staffPosRef/staffPoseRef är ref-objekt med .current. Läs rätt.
    const posMap = posRef && (typeof posRef.get === 'function' ? posRef : posRef.current) || null;
    const staffPosMap = staffPosRef?.current ?? null;
    const staffPoseMap = staffPoseRef?.current ?? null;

    const guests = [];
    if (sim && posMap) {
      for (const g of sim.guests) {
        const render = posMap.get(g.id) ?? null;
        const seatIdx = g.seatIndex ?? -1;
        let seatXZ = null;
        let seatSource = null;
        if (seatIdx >= 0 && roomRef?.current?.seats) {
          if (seatIdx < roomRef.current.seats.length) {
            seatXZ = roomRef.current.seats[seatIdx];
            seatSource = 'contract';
          }
        }
        const dxFromSeat = seatXZ && render ? render.cx - seatXZ[0] : null;
        const dzFromSeat = seatXZ && render ? render.cz - seatXZ[1] : null;
        const distFromSeat = dxFromSeat !== null
          ? Math.hypot(dxFromSeat, dzFromSeat)
          : null;
        guests.push({
          id: g.id,
          state: g.state,
          seatIndex: seatIdx,
          simPos: { x: g.position.x, z: g.position.z },
          renderPos: render ? { cx: render.cx, cz: render.cz } : null,
          sitStandDir: render?.sitStandDir ?? null,
          sitStandPhase: render?.sitStandPhase ?? null,
          seatXZ,
          seatSource,
          distFromSeat: distFromSeat !== null ? Number(distFromSeat.toFixed(3)) : null
        });
      }
    }

    const staff = [];
    if (sim && staffPosMap) {
      for (const m of sim.team.members) {
        const render = staffPosMap.get(m.id) ?? null;
        const pose = staffPoseMap?.get(m.id) ?? null;
        staff.push({
          id: m.id,
          role: m.role,
          renderPos: render ? { x: render.x, z: render.z } : null,
          poseName: pose?.poseName ?? null,
          moving: pose?.moving ?? null
        });
      }
    }

    // Bredda seated-familjen: ordering/dining/paying räknas också som
    // "sitter vid seat" — sim håller dem i seatedIds hela vägen.
    const SEATED = new Set(['seated', 'ordering', 'dining', 'paying', 'sleeping']);
    const seatedGuests = guests.filter((g) => SEATED.has(g.state));
    const seatedWithRig = seatedGuests.filter((g) => g.renderPos !== null);
    const seatedNearSeat = seatedGuests.filter(
      (g) => g.distFromSeat !== null && g.distFromSeat < 1.5
    );
    const seatedNoSitBlend = seatedGuests.filter(
      (g) => g.sitStandPhase !== null && (g.sitStandPhase < 0 || g.sitStandDir === 0)
    );
    const seatedFarFromSeat = seatedGuests.filter(
      (g) => g.distFromSeat !== null && g.distFromSeat > 3
    );
    const layout = w.__nxLayoutBounds ?? null;
    let outsideOBB = [];
    if (layout) {
      const halfW = layout.width / 2;
      outsideOBB = seatedGuests.filter((g) => {
        if (!g.renderPos) return false;
        const d = Math.hypot(g.renderPos.cx - layout.centre[0], g.renderPos.cz - layout.centre[1]);
        return d > halfW * 1.02;
      });
    }

    // Layout-fakta.
    const seatSource = w.__nxSeatSource ?? null;
    const seatSourceLength = w.__nxSeatSourceLength ?? null;

    return {
      simTime: sim?.simTime ?? null,
      period: sim?.day?.period ?? null,
      prepEndsAt: sim?.day?.prepEndsAt ?? null,
      seatedIdsCount: sim?.seatedIds?.length ?? null,
      guestCount: guests.length,
      guests,
      staff,
      layout,
      seatSource,
      seatSourceLength,
      contractSeatsLength: roomRef?.current?.seats?.length ?? null,
      contractClass: roomRef?.current?.businessClass ?? null,
      cameraDist: camera?.actualRef?.current?.distance ?? null,
      cameraTargetDist: camera?.targetRef?.current?.distance ?? null,
      summary: {
        seatedTotal: seatedGuests.length,
        seatedWithRenderPos: seatedWithRig.length,
        seatedNearSeat: seatedNearSeat.length,
        seatedFarFromSeat: seatedFarFromSeat.length,
        seatedNoSitBlend: seatedNoSitBlend.length,
        outsideOBB: outsideOBB.length
      }
    };
  });

  writeFileSync(
    resolve(REPORT_DIR, `snapshot-${label}.json`),
    JSON.stringify(data, null, 2)
  );
  await page.screenshot({
    path: resolve(REPORT_DIR, `snapshot-${label}.png`),
    fullPage: false
  });
  return data;
}

const SEATED_FILTER = new Set(['seated', 'ordering', 'dining', 'paying', 'sleeping']);
const vite = await startVite();
console.log(`Vite på ${vite.url}`);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') {
    console.log(`[browser-${msg.type()}]`, msg.text());
  }
});

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
  await page.fill('input[type=text]', 'ORDER 199 DIAG');
  await page.click('button[type=submit]');
  await delay(3000);

  // Öppna lunch, låt sim gå på speed=1 (spelarens realtid).
  await page.evaluate(() => {
    window.__nxSimDispatch({ type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 20 });
  });

  await page.waitForFunction(
    () => window.__nxSimState !== undefined && window.__nxGuestPositions !== undefined,
    null, { timeout: 30000 }
  );

  // T0: strax efter dispatch — se initialtillstånd.
  const t0 = await snapshot(page, 't0-initial');
  console.log(`\nT0 (initial): simTime=${t0.simTime?.toFixed(1)}s period=${t0.period} seatedIds=${t0.seatedIdsCount} rendered=${t0.summary.seatedWithRenderPos}/${t0.summary.seatedTotal}`);
  console.log(`  seatSource=${t0.seatSource} length=${t0.seatSourceLength} contractLen=${t0.contractSeatsLength} contractClass=${t0.contractClass}`);

  // Snabbspola tills sim.seatedIds > 5 (första kohort satt sig).
  await page.evaluate(() => window.__nxSimDispatch({ type: 'SET_SPEED', speed: 8 }));
  await page.waitForFunction(
    () => {
      const s = window.__nxSimState;
      return s?.seatedIds && s.seatedIds.length >= 5;
    },
    null, { timeout: 120000 }
  );
  await page.evaluate(() => window.__nxSimDispatch({ type: 'SET_SPEED', speed: 1 }));
  await delay(2000);

  const t1 = await snapshot(page, 't1-early-service');
  console.log(`\nT1 (early service): simTime=${t1.simTime?.toFixed(1)}s seatedIds=${t1.seatedIdsCount} rendered=${t1.summary.seatedWithRenderPos}/${t1.summary.seatedTotal} nearSeat=${t1.summary.seatedNearSeat}`);
  console.log(`  cam=${t1.cameraDist?.toFixed(1)}m→${t1.cameraTargetDist?.toFixed(1)}m`);
  const wrong = t1.guests.filter((g) => g.state === 'seated' && g.distFromSeat !== null && g.distFromSeat > 1.5);
  console.log(`  seated men >1.5m från seat: ${wrong.length}`);
  wrong.slice(0, 5).forEach((g) => {
    console.log(`    id=${g.id} seatIdx=${g.seatIndex} sim=(${g.simPos.x.toFixed(1)}, ${g.simPos.z.toFixed(1)}) render=(${g.renderPos?.cx.toFixed(1)}, ${g.renderPos?.cz.toFixed(1)}) seat=(${g.seatXZ?.[0].toFixed(1)}, ${g.seatXZ?.[1].toFixed(1)}) d=${g.distFromSeat}m dir=${g.sitStandDir} phase=${g.sitStandPhase?.toFixed(2)}`);
  });

  // Vänta 40 s till mid-service
  await delay(40000);
  const t2 = await snapshot(page, 't2-mid-service');
  console.log(`\nT2 (mid-service, +40s): simTime=${t2.simTime?.toFixed(1)}s seatedIds=${t2.seatedIdsCount}`);
  console.log(`  seatedFamily=${t2.summary.seatedTotal} withRender=${t2.summary.seatedWithRenderPos} nearSeat=${t2.summary.seatedNearSeat} farFromSeat=${t2.summary.seatedFarFromSeat} noSitBlend=${t2.summary.seatedNoSitBlend} outsideOBB=${t2.summary.outsideOBB}`);
  console.log(`  layout: centre=(${t2.layout?.centre[0].toFixed(1)}, ${t2.layout?.centre[1].toFixed(1)}) width=${t2.layout?.width.toFixed(1)}m entrance=(${t2.layout?.entrance[0].toFixed(1)}, ${t2.layout?.entrance[1].toFixed(1)})`);
  const wrong2 = t2.guests.filter((g) => t2.summary && SEATED_FILTER.has(g.state) && g.distFromSeat !== null && g.distFromSeat > 1.5);
  console.log(`  seated-family men >1.5m från seat: ${wrong2.length}`);
  wrong2.slice(0, 8).forEach((g) => {
    console.log(`    id=${g.id} state=${g.state.padEnd(8)} seatIdx=${g.seatIndex} render=(${g.renderPos?.cx.toFixed(1)}, ${g.renderPos?.cz.toFixed(1)}) seat=(${g.seatXZ?.[0].toFixed(1)}, ${g.seatXZ?.[1].toFixed(1)}) d=${g.distFromSeat}m dir=${g.sitStandDir} phase=${g.sitStandPhase?.toFixed(2)}`);
  });

  // Staff diagnos
  console.log(`\n  staff (${t2.staff.length}):`);
  t2.staff.forEach((s) => {
    console.log(`    ${s.role.padEnd(10)} pos=${s.renderPos ? `(${s.renderPos.x.toFixed(1)}, ${s.renderPos.z.toFixed(1)})` : 'null'} pose=${s.poseName ?? 'null'} moving=${s.moving}`);
  });
} finally {
  await browser.close();
  await stopVite(vite.proc);
}

console.log(`\nRapport: ${REPORT_DIR}`);
