#!/usr/bin/env node
// ORDER 200 — video-verifiering (VO-direktiv 2026-09-10):
// "Verifiera med VIDEO, inte pixeltal. Jag vill se en gäst gå till en
// barstol och sätta sig på den, och personal som stannar innanför
// väggarna under ett helt pass."
//
// Flöde: ölkrogen lunch, spelarflödet (namn → Enter → lunch service).
// Snabbspola prep vid speed=8 tills sim öppnar service; vid `seatedIds
// >= 1` (första gäst-cohortens första kohort har hittat sits) sänk till
// **speed=1 i 90 s** — visar gäster promenerar in genom entrén och
// sätter sig ner (inkl. barstols-ankomster; SEATS_OLKROGEN prioriterar
// bar-index 12-19 först per service.ts:154). Sedan **speed=2 i 240 s**
// för att fånga resten av service-passet (staff-observation genom hela
// passet, per direktivet). Total realtid ~5.5 min. Utdata:
//   frontend/reports/order200/full-pass.webm — video (VO bedömer)
//   frontend/reports/order200/state.json     — slut-snapshot (spårbarhet)
//
// Pass-kriterium: VO tittar på webm-filen och bedömer att (a) en gäst
// promenerar till en barstol och sätter sig, (b) personalen står inne
// genom hela passet. Ingen automatisk pixel-signatur.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync, renameSync, readdirSync, existsSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order200');
mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1920, height: 1080 };
// Speed=1 fönster: fånga gäst→barstol-promenad + sit-blend i realtid.
// SEAT_ARRIVAL_THRESHOLD_M=0.6m + WALK_SPEED_M_PER_S=1.2 → sit-blend
// tar 0.5s, hela vägen entré→barstol ~10-15s. 90s täcker flera arriv.
const SPEED1_SECONDS = 90;
// Speed=2 fönster: kompresserar resten av lunch-passet (15 sim-min
// totalt). Vid speed=2 blir 240 s realtid = 480 s sim = 8 sim-minuter,
// vilket räcker för att observera staff-beteende genom mid-service och
// första gäster som lämnar (paying→leaving). Total = 330 s ≈ 5.5 min.
const SPEED2_SECONDS = 240;

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
const videoDir = resolve(REPORT_DIR, '_playwright-video');
mkdirSync(videoDir, { recursive: true });
// Renderar i 1920×1080 (samma vy som VO:s tidigare inspelningar), men
// spelar in i 1280×720 för att hålla filstorleken hanterbar för git.
// Fem minuter × 1920×1080 skulle bli >100 MB webm; 1280×720 halverar
// ungefär.
const ctx = await browser.newContext({
  viewport: VIEWPORT,
  recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } }
});
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('[pageerror]', e.message));

let finalSnap = null;

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
  await page.fill('input[type=text]', 'ORDER 200');
  await page.click('button[type=submit]');
  await delay(3000);

  await page.evaluate(() => {
    // 20 min lunch räcker för hela passet plus lite marginal så vi ser
    // paying→leaving-cyklerna vid slutet.
    window.__nxSimDispatch({ type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 20 });
    window.__nxSimDispatch({ type: 'SET_SPEED', speed: 8 });
  });
  // Snabbspola prep + låt sim skapa första ankomster. Sim måste ha en
  // arriving-guest i pipelinen när vi drar ner till speed=1, annars ser
  // videon tomt ut de första 15-20 sekunderna.
  await page.waitForFunction(
    () => {
      const s = window.__nxSimState;
      if (!s?.guests) return false;
      return s.guests.some((g) => g.state === 'arriving' || g.state === 'waiting') ||
        (s.seatedIds && s.seatedIds.length >= 1);
    },
    null, { timeout: 180000 }
  );
  await page.evaluate(() => window.__nxSimDispatch({ type: 'SET_SPEED', speed: 1 }));
  console.log(`Spelar in ${SPEED1_SECONDS} s vid speed=1 (gäst→barstol-fönstret) ...`);
  await delay(SPEED1_SECONDS * 1000);

  await page.evaluate(() => window.__nxSimDispatch({ type: 'SET_SPEED', speed: 2 }));
  console.log(`Spelar in ${SPEED2_SECONDS} s vid speed=2 (resten av passet) ...`);
  await delay(SPEED2_SECONDS * 1000);

  finalSnap = await page.evaluate(() => {
    const sim = window.__nxSimState;
    const roomRef = window.__nxBusinessRoomRef;
    const posMap = window.__nxGuestPositions?.current ?? window.__nxGuestPositions;
    const staffPos = window.__nxStaffPositions?.current ?? null;
    const staffPose = window.__nxStaffPoses?.current ?? null;

    const guests = [];
    if (sim && posMap) {
      const SEATED = new Set(['seated', 'ordering', 'dining', 'paying', 'sleeping']);
      for (const g of sim.guests) {
        if (!SEATED.has(g.state)) continue;
        const render = (posMap.get ? posMap.get(g.id) : null) ?? null;
        const seatIdx = g.seatIndex ?? -1;
        const seatXZ = seatIdx >= 0 && roomRef?.current?.seats?.[seatIdx]
          ? roomRef.current.seats[seatIdx] : null;
        const seatH = seatIdx >= 0 && roomRef?.current?.seatHeights?.[seatIdx];
        guests.push({
          id: g.id,
          state: g.state,
          seatIndex: seatIdx,
          seatKind: seatIdx >= 12 ? 'bar' : (seatIdx >= 8 ? 'twotop' : 'communal'),
          seatXZ,
          seatHeight: seatH ?? null,
          renderPos: render ? { cx: render.cx, cz: render.cz } : null,
          sitStandDir: render?.sitStandDir ?? null,
          sitStandPhase: render?.sitStandPhase ?? null,
          distFromSeat: seatXZ && render
            ? Number(Math.hypot(render.cx - seatXZ[0], render.cz - seatXZ[1]).toFixed(2))
            : null
        });
      }
    }

    const staff = [];
    if (sim && staffPos) {
      for (const m of sim.team.members) {
        const p = staffPos.get(m.id) ?? null;
        const pose = staffPose?.get(m.id) ?? null;
        staff.push({
          id: m.id,
          role: m.role,
          renderPos: p ? { x: p.x, z: p.z } : null,
          poseName: pose?.poseName ?? null
        });
      }
    }

    const layout = window.__nxLayoutBounds ?? null;
    let outsideOBB = [];
    if (layout) {
      const halfW = layout.width / 2;
      outsideOBB = guests.filter((g) => {
        if (!g.renderPos) return false;
        const d = Math.hypot(g.renderPos.cx - layout.centre[0], g.renderPos.cz - layout.centre[1]);
        return d > halfW * 1.02;
      }).map((g) => g.id);
    }

    return {
      simTime: sim?.simTime ?? null,
      seatedIds: sim?.seatedIds?.length ?? null,
      seatSource: window.__nxSeatSource ?? null,
      seatSourceLength: window.__nxSeatSourceLength ?? null,
      contract: {
        class: roomRef?.current?.businessClass ?? null,
        seatCount: roomRef?.current?.seats?.length ?? null,
        seatHeights: roomRef?.current?.seatHeights ?? null
      },
      layout,
      guests,
      staff,
      summary: {
        seatedTotal: guests.length,
        nearSeat: guests.filter((g) => g.distFromSeat !== null && g.distFromSeat < 1.5).length,
        onBarStool: guests.filter((g) => g.seatIndex >= 12 && g.distFromSeat !== null && g.distFromSeat < 1.5).length,
        onChair: guests.filter((g) => g.seatIndex >= 0 && g.seatIndex < 12 && g.distFromSeat !== null && g.distFromSeat < 1.5).length,
        outsideOBB: outsideOBB.length,
        outsideOBBIds: outsideOBB,
        staffAtEntrance: staff.filter((s) => s.renderPos
          && layout
          && Math.hypot(s.renderPos.x - layout.entrance[0], s.renderPos.z - layout.entrance[1]) < 1.5).length,
        staffOutsideOBB: staff.filter((s) => {
          if (!s.renderPos || !layout) return false;
          const d = Math.hypot(s.renderPos.x - layout.centre[0], s.renderPos.z - layout.centre[1]);
          return d > (layout.width / 2) * 1.02;
        }).length
      }
    };
  });

  console.log(`\nSlutbild: simTime=${finalSnap.simTime?.toFixed(1)}s seatedIds=${finalSnap.seatedIds}`);
  console.log(`  guests: seatedFamily=${finalSnap.summary.seatedTotal} nearSeat=${finalSnap.summary.nearSeat} outsideOBB=${finalSnap.summary.outsideOBB}`);
  console.log(`    barstool=${finalSnap.summary.onBarStool} chair=${finalSnap.summary.onChair}`);
  console.log(`  staff: atEntrance=${finalSnap.summary.staffAtEntrance} outsideOBB=${finalSnap.summary.staffOutsideOBB} total=${finalSnap.staff.length}`);
  finalSnap.staff.forEach((s) => {
    console.log(`    ${s.role.padEnd(10)} pos=${s.renderPos ? `(${s.renderPos.x.toFixed(1)}, ${s.renderPos.z.toFixed(1)})` : 'null'} pose=${s.poseName ?? '-'}`);
  });
  console.log(`  contract.seatHeights=${JSON.stringify(finalSnap.contract.seatHeights)}`);

  await page.screenshot({ path: resolve(REPORT_DIR, 'final-frame.png'), fullPage: false });
} finally {
  await page.close();
  await ctx.close();
  await browser.close();
  await stopVite(vite.proc);
}

// Flytta webm-filen till en stabil path.
const videos = readdirSync(videoDir).filter((f) => f.endsWith('.webm'));
if (videos.length > 0) {
  const src = resolve(videoDir, videos[0]);
  const dst = resolve(REPORT_DIR, 'full-pass.webm');
  if (existsSync(dst)) {
    // Overwrite by rename.
  }
  renameSync(src, dst);
  console.log(`Video: ${dst}`);
}

if (finalSnap) {
  writeFileSync(resolve(REPORT_DIR, 'state.json'), JSON.stringify(finalSnap, null, 2));
  console.log(`State: ${resolve(REPORT_DIR, 'state.json')}`);
}
