#!/usr/bin/env node
// ORDER 150 — verifiera att InteriorGuests läser platserna från
// businessRoom-kontraktet, så gäster med seatIndex ≥ 16 i ölkrogen
// får egna målpositioner i stället för att falla till seats[0].
//
// Två oberoende checkar:
//   1. Källa: `window.__nxSeatSource` (dev-only) visar vilken bank
//      InteriorGuests väljer varje frame. Krav 'businessRoomContract'
//      när scenen har monterat sitt kontraktsrum för samma klass.
//   2. Distinkta målpositioner: injicera N seated-gäster med
//      seatIndex 0..N−1, snapp:a positionsRef[guest.id].cx/cz till
//      businessRoomRef.seats[seatIndex] (kringgår ease-flakighet i
//      headless chromium), räkna distinkta (cx,cz)-pinnar. Krav
//      N distinkta.
//
// Krav per klass:
//   ölkrogen        20 gäster → källa=businessRoomContract, 20 distinkta
//   kvarterskrogen  16 gäster → källa=businessRoomContract, 16 distinkta

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order150');
mkdirSync(REPORT_DIR, { recursive: true });
const VIEWPORT = { width: 1920, height: 1080 };

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

async function seedAndSnap(page, count) {
  // Frys sim (speed=0) så guests inte progresserar under mätning.
  await page.evaluate(() => { window.__nxSimState.speed = 0; });
  await delay(200);
  await page.evaluate((n) => {
    const w = window;
    const now = w.__nxSimState.simTime ?? 0;
    const fakeGuests = []; const fakeIds = [];
    for (let i = 0; i < n; i++) {
      const id = `order150-gst-${i + 1}`;
      fakeGuests.push({
        id, state: 'seated', satisfaction: 0.7, seatIndex: i,
        arrivalTime: now, stateTime: now, scenarioSource: false,
        position: { x: 0, z: 0 }, targetPosition: { x: 0, z: 0 },
        moveProgress: 1, hadWelcomeDrink: true, lastCheckbackAt: null,
        walkAwayOnArrival: false, stayingOvernight: false
      });
      fakeIds.push(id);
    }
    w.__nxSimState.guests = fakeGuests;
    w.__nxSimState.seatedIds = fakeIds;
    w.__nxSimDispatch({ type: 'SET_CASH', valueSek: w.__nxSimState.cash });
  }, count);
  // Vänta tills InteriorGuests useFrame har skapat positionsRef-entries
  // för alla gäster. Ease är fortfarande i gång i bakgrunden men vi
  // bryr oss inte om det — nästa steg snapp:ar cx/cz till mål-seatet.
  await page.waitForFunction(
    (n) => (window.__nxGuestPositions?.size ?? 0) >= n,
    count,
    { timeout: 20000 }
  );
  // Snapp:a varje pos till kontraktets seat (kringgår headless-throttled easing).
  await page.evaluate(() => {
    const posMap = window.__nxGuestPositions;
    const room = window.__nxBusinessRoomRef?.current;
    const state = window.__nxSimState;
    if (!posMap || !room || !state) return;
    for (const g of state.guests) {
      const pos = posMap.get?.(g.id);
      if (!pos) continue;
      const idx = g.seatIndex ?? -1;
      const seat = idx >= 0 && idx < room.seats.length ? room.seats[idx] : room.seats[0];
      if (!seat) continue;
      pos.cx = seat[0];
      pos.cz = seat[1];
    }
    // Frys speeden så inte useFrame:s ease sedan drar ivrig cx/cz igen.
    window.__nxSimState.speed = 0;
  });
  // Kort delay så nästa useFrame ritar de snappade positionerna.
  await delay(300);
}

async function collect(page) {
  return await page.evaluate(() => {
    const roomRef = window.__nxBusinessRoomRef;
    const posMap = window.__nxGuestPositions;
    const state = window.__nxSimState;
    const seatSource = window.__nxSeatSource ?? '(unset)';
    const seatSourceLength = window.__nxSeatSourceLength ?? -1;
    if (!roomRef?.current) return { error: 'businessRoomRef inte satt' };
    if (!posMap) return { error: '__nxGuestPositions inte satt' };
    const room = roomRef.current;
    const guests = (state?.guests || []).filter((g) => g.state === 'seated');
    const per = guests.map((g) => {
      const idx = g.seatIndex ?? -1;
      const expectedSeat =
        idx >= 0 && idx < room.seats.length ? room.seats[idx] : room.seats[0];
      const pos = posMap.get?.(g.id) ?? null;
      const cx = pos ? pos.cx : null;
      const cz = pos ? pos.cz : null;
      const dx = cx != null && expectedSeat ? cx - expectedSeat[0] : null;
      const dz = cz != null && expectedSeat ? cz - expectedSeat[1] : null;
      const dist = dx != null && dz != null ? Math.hypot(dx, dz) : null;
      return {
        id: g.id, seatIndex: idx,
        cx: cx != null ? Number(cx.toFixed(3)) : null,
        cz: cz != null ? Number(cz.toFixed(3)) : null,
        expectedX: expectedSeat ? Number(expectedSeat[0].toFixed(3)) : null,
        expectedZ: expectedSeat ? Number(expectedSeat[1].toFixed(3)) : null,
        distFromSeat: dist != null ? Number(dist.toFixed(3)) : null
      };
    });
    // Distinkta faktiska positioner (rundade till cm för robusthet).
    const keys = new Set();
    for (const p of per) {
      if (p.cx != null && p.cz != null) keys.add(`${p.cx.toFixed(2)},${p.cz.toFixed(2)}`);
    }
    return {
      simBusinessClass: state.businessClass,
      roomBusinessClass: room.businessClass,
      seatsInContract: room.seats.length,
      guestsSeated: guests.length,
      distinctActualPositions: keys.size,
      seatSource,
      seatSourceLength,
      per
    };
  });
}

async function measureClass(page, businessArg, expectedSeats, screenshotName) {
  // Cache-buster tvingar full reload (bara hash-ändring reloadar inte).
  const bust = Date.now();
  await page.goto(
    `http://localhost:5173/?bust=${bust}#playtest=1&business=${businessArg}&preset=myBusiness&period=lunch`,
    { waitUntil: 'domcontentloaded' }
  );
  await page.waitForFunction(
    () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
    null, { timeout: 60000 }
  );
  await delay(1500);
  await page.evaluate(() => window.__nxSetBusinessName?.('Test ' + Math.random().toString(36).slice(2, 6)));
  await page.waitForFunction(
    () => window.__nxBusinessRoomRef?.current != null,
    null, { timeout: 20000 }
  );
  await seedAndSnap(page, expectedSeats);
  const result = await collect(page);
  const shot = resolve(REPORT_DIR, screenshotName);
  await page.screenshot({ path: shot, fullPage: false });
  return { result, screenshot: shot };
}

const vite = await startVite();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT });

page.on('pageerror', (err) => console.error('[pageerror]', err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') console.error('[console.error]', msg.text());
});

try {
  const brewpub = await measureClass(page, 'olkrogen', 20, 'brewpub-20-guests.png');
  const restaurant = await measureClass(page, 'kvarterskrogen', 16, 'restaurant-16-guests.png');

  writeFileSync(
    resolve(REPORT_DIR, 'seat-placement.json'),
    JSON.stringify({ brewpub, restaurant }, null, 2)
  );

  console.log('\n=== ORDER 150 — seat placement per klass ===\n');
  let ok = true;
  for (const [name, run] of [['ölkrogen', brewpub], ['kvarterskrogen', restaurant]]) {
    const r = run.result;
    // Post-snap: distFromSeat borde vara ~0 för alla; check < 0.05 m.
    const maxDist = Math.max(...(r.per || []).map((p) => p.distFromSeat ?? 999));
    console.log(`${name}:`);
    console.log(`  sim.businessClass:              ${r.simBusinessClass}`);
    console.log(`  ref.businessClass:              ${r.roomBusinessClass}`);
    console.log(`  seatsInContract:                ${r.seatsInContract}`);
    console.log(`  seat-source (dev-observation):  ${r.seatSource}   (krav businessRoomContract)`);
    console.log(`  seat-source.length:             ${r.seatSourceLength}   (krav ${r.seatsInContract})`);
    console.log(`  guestsSeated:                   ${r.guestsSeated}`);
    console.log(`  distinctActualPositions:        ${r.distinctActualPositions}   (krav ${r.guestsSeated})`);
    console.log(`  max distFromSeat efter snap:    ${maxDist.toFixed(3)} m   (krav < 0.05)`);
    console.log(`  screenshot:                     ${run.screenshot}`);
    console.log('');
    if (r.seatSource !== 'businessRoomContract') ok = false;
    if (r.seatSourceLength !== r.seatsInContract) ok = false;
    if (r.distinctActualPositions !== r.guestsSeated) ok = false;
    if (maxDist > 0.05) ok = false;
  }
  if (!ok) {
    console.error('FEL: en av assertions misslyckades. Se seat-placement.json.');
    process.exitCode = 1;
  } else {
    console.log('OK — alla klasser läser platserna från businessRoom-kontraktet.');
  }
} finally {
  await browser.close();
  await new Promise((r) => { vite.on('exit', r); vite.kill('SIGTERM'); setTimeout(() => { vite.kill('SIGKILL'); r(); }, 3000); });
}
