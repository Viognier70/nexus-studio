#!/usr/bin/env node
// ORDER 149 — verifiera att ölkrogen monteras via businessRoom-
// kontraktet, att de tjugo platserna finns i geometrin, att bandet
// mot de tre golvzonerna håller, och ta skärmdumpar i lunchljus och
// kvällsljus.
//
// Mätprincip (CLAUDE.md "Mätningar mot det de beskriver"): scriptet
// dynamiskt importerar brewpubRoom.ts i webbläsaren och läser
// `ZONE_FLOORS` DÄR — samma källa som geometrin monterar från. Ingen
// hårdkopia av golvfärger. Guest-färgerna läses från InteriorGuests
// `GUEST_COLOUR` — samma källa som Riggen sätter på `garment.color`
// varje tick.
//
// FLOOR_ZONES_BY_BUSINESS[ölkrogen] i silhouetteContrast.zones.ts
// är en pre-existerande duplikat av samma färger (ORDER 123 §5). Vi
// asserterar jämlikhet så att drift fångas när den uppstår — den ska
// helst konsolideras till en import i egen ordning.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order149');
mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1920, height: 1080 };
const CONTRAST_MIN = 1.8;
const CONTRAST_MAX = 3.6;

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

async function contractProbe(page) {
  return await page.evaluate(async () => {
    const bp = await import('/src/strategic/scene/brewpubRoom.ts');
    const contract = await import('/src/strategic/scene/businessRoom.ts');
    const guests = await import('/src/strategic/scene/InteriorGuests.tsx');
    const zones = await import('/src/strategic/scene/silhouetteContrast.zones.ts');

    // Kontraktet monterar rummet.
    const room = contract.createRoom('ölkrogen', { width: 15.6, depth: 11.8 });
    // Lägg gruppen i scenen så localToWorld ger meningsfulla värden.
    // Vi behöver inte fästa den — updateWorldMatrix räcker.
    room.group.updateWorldMatrix(true, true);
    const world = contract.resolveWorldPositions(room);
    const measure = contract.measureRoom(room);

    const zonesModule = bp.ZONE_FLOORS.map((z) => ({ id: z.id, colour: z.colour, note: z.note }));
    const zonesReplica = (zones.FLOOR_ZONES_BY_BUSINESS['ölkrogen'] || []).map((z) => ({
      id: z.id, colour: z.colour
    }));

    // WCAG relativ luminans + kontrastformel — samma matte som
    // silhouetteContrast.ts, dupliceras här bara för snabb utvärdering.
    function chan(v) {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
    function lum(hex) {
      const h = hex.replace('#', '');
      return 0.2126 * chan(parseInt(h.substring(0, 2), 16)) +
             0.7152 * chan(parseInt(h.substring(2, 4), 16)) +
             0.0722 * chan(parseInt(h.substring(4, 6), 16));
    }
    function contrast(a, b) {
      const la = lum(a), lb = lum(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    }

    // Gäster i ölkrogen bär GUEST_COLOUR för det tillstånd de är i.
    // De tre tillstånd som betyder "en gäst syns på/vid en plats i
    // rummet" är seated / dining / paying. Vi mäter mot alla tre.
    const seatedStates = ['seated', 'dining', 'paying'];
    const pairs = [];
    for (const state of seatedStates) {
      const figure = guests.GUEST_COLOUR[state];
      for (const zone of bp.ZONE_FLOORS) {
        const r = contrast(figure, zone.colour);
        pairs.push({
          state, figure, zone: zone.id, floor: zone.colour, ratio: Number(r.toFixed(3))
        });
      }
    }
    const outOfBand = pairs.filter((p) => p.ratio < 1.8 || p.ratio > 3.6);

    // Kastar rummet innan retur — inget behöver hänga kvar.
    room.dispose?.();

    return {
      contractSeats: room.seats.length,
      standing: room.standing.length,
      capacity: room.capacity,
      floorZonesReported: measure.floorZones,
      zonesFromBrewpubRoom: zonesModule,
      zonesFromReplica: zonesReplica,
      worldSeatCount: world.seats.length,
      pairs,
      outOfBand
    };
  });
}

const vite = await startVite();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT });

page.on('pageerror', (err) => console.error('[pageerror]', err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') console.error('[console.error]', msg.text());
});

const report = { steps: [] };

try {
  // Steg 1 — dag (period=lunch).
  await page.goto(
    'http://localhost:5173/#playtest=1&business=olkrogen&preset=myBusiness&period=lunch',
    { waitUntil: 'domcontentloaded' }
  );
  await page.waitForFunction(
    () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
    null, { timeout: 60000 }
  );
  await delay(1500);
  // Namn-overlayen skulle annars täcka canvas. ORDER 083-hooken.
  await page.evaluate(() => window.__nxSetBusinessName?.('Ölkrogen'));
  await delay(500);

  const businessClass = await page.evaluate(() => window.__nxSimState?.businessClass);
  report.businessClass = businessClass;

  // Kontraktsprobe (rummet, zonerna, bandet).
  const probe = await contractProbe(page);
  report.probe = probe;

  // Injicera 20 seated-gäster i sim-state så scenen bevisar att den
  // tjugonde platsen finns i rummets kontrakt. NOTE: InteriorGuests
  // renderar dem via `usePlayerBusinessInterior().seats` som fortfarande
  // ger restaurangens 16 positioner (interiorLayout är inte
  // ölkrogsanpassad ännu — separat följdorder). Gäst 17–20 hamnar
  // därför på seats[0] fallback i den vyn. Detta är avsiktligt
  // exponerat, inte fixat i denna order.
  await page.evaluate(() => {
    const w = window;
    w.__nxSimState.speed = 0;
    w.__nxSimDispatch({ type: 'SET_CASH', valueSek: w.__nxSimState.cash });
  });
  await delay(200);
  await page.evaluate((count) => {
    const w = window;
    const now = w.__nxSimState.simTime ?? 0;
    const fakeGuests = [];
    const fakeIds = [];
    for (let i = 0; i < count; i++) {
      const id = `order149-gst-${i + 1}`;
      fakeGuests.push({
        id, state: 'seated', satisfaction: 0.7, seatIndex: i,
        arrivalTime: now, stateTime: now, scenarioSource: false,
        position: { x: 0, z: 0 }, targetPosition: { x: 0, z: 0 },
        moveProgress: 1, hadWelcomeDrink: true, lastCheckbackAt: null,
        walkAwayOnArrival: false, stayingOvernight: false
      });
      fakeIds.push(id);
    }
    w.__nxSimState.guests = [...(w.__nxSimState.guests ?? []), ...fakeGuests];
    w.__nxSimState.seatedIds = [...(w.__nxSimState.seatedIds ?? []), ...fakeIds];
    w.__nxSimDispatch({ type: 'SET_CASH', valueSek: w.__nxSimState.cash });
  }, 20);
  await delay(1500);

  const dayShot = resolve(REPORT_DIR, 'brewpub-day-lunch.png');
  await page.screenshot({ path: dayShot, fullPage: false });
  report.dayScreenshot = dayShot;

  const seatedInState = await page.evaluate(() =>
    (window.__nxSimState.guests || []).filter((g) => g.state === 'seated').length
  );
  const seatedIdsLen = await page.evaluate(() => (window.__nxSimState.seatedIds || []).length);
  report.injectedGuests = { seatedInState, seatedIdsLen };

  // Steg 2 — kväll (period=evening). Behåll gästinjektionen; ladda om
  // med ny hash så DayLighting läser om periodval.
  await page.goto(
    'http://localhost:5173/#playtest=1&business=olkrogen&preset=myBusiness&period=evening',
    { waitUntil: 'domcontentloaded' }
  );
  await page.waitForFunction(
    () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
    null, { timeout: 60000 }
  );
  await delay(1500);
  // Namn-overlayen skulle annars täcka canvas. ORDER 083-hooken.
  await page.evaluate(() => window.__nxSetBusinessName?.('Ölkrogen'));
  await delay(500);
  // Injicera igen (state är förlorat efter reload).
  await page.evaluate(() => {
    const w = window;
    w.__nxSimState.speed = 0;
    w.__nxSimDispatch({ type: 'SET_CASH', valueSek: w.__nxSimState.cash });
  });
  await delay(200);
  await page.evaluate((count) => {
    const w = window;
    const now = w.__nxSimState.simTime ?? 0;
    const fakeGuests = [];
    const fakeIds = [];
    for (let i = 0; i < count; i++) {
      const id = `order149-gst-${i + 1}`;
      fakeGuests.push({
        id, state: 'seated', satisfaction: 0.7, seatIndex: i,
        arrivalTime: now, stateTime: now, scenarioSource: false,
        position: { x: 0, z: 0 }, targetPosition: { x: 0, z: 0 },
        moveProgress: 1, hadWelcomeDrink: true, lastCheckbackAt: null,
        walkAwayOnArrival: false, stayingOvernight: false
      });
      fakeIds.push(id);
    }
    w.__nxSimState.guests = [...(w.__nxSimState.guests ?? []), ...fakeGuests];
    w.__nxSimState.seatedIds = [...(w.__nxSimState.seatedIds ?? []), ...fakeIds];
    w.__nxSimDispatch({ type: 'SET_CASH', valueSek: w.__nxSimState.cash });
  }, 20);
  await delay(1500);
  const eveningShot = resolve(REPORT_DIR, 'brewpub-evening.png');
  await page.screenshot({ path: eveningShot, fullPage: false });
  report.eveningScreenshot = eveningShot;

  // Slutrapport
  const zonesEqual = JSON.stringify(probe.zonesFromBrewpubRoom.map((z) => z.colour.toLowerCase())) ===
                     JSON.stringify(probe.zonesFromReplica.map((z) => z.colour.toLowerCase()));
  report.zonesReplicaAgrees = zonesEqual;

  writeFileSync(
    resolve(REPORT_DIR, 'mount-report.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('\n=== ORDER 149 — brewpub-montering ===');
  console.log(`businessClass i sim:                  ${businessClass}`);
  console.log(`kontraktets seats.length:             ${probe.contractSeats}  (krav 20)`);
  console.log(`kontraktets capacity:                 ${probe.capacity}       (krav 20)`);
  console.log(`kontraktets standing:                 ${probe.standing}       (räknas inte i cap)`);
  console.log(`measureRoom.floorZones:               ${probe.floorZonesReported}  (krav 3)`);
  console.log(`resolveWorldPositions.seats.length:   ${probe.worldSeatCount}  (krav 20)`);
  console.log(`ZONE_FLOORS === replica i zones.ts:   ${zonesEqual}`);
  console.log('\nSilhuettband mot ölkrogens tre golvzoner:');
  for (const p of probe.pairs) {
    const flag = (p.ratio < CONTRAST_MIN || p.ratio > CONTRAST_MAX) ? ' ⚠ UTANFÖR' : '';
    console.log(`  ${p.state.padEnd(8)} ${p.figure} vs ${p.zone.padEnd(8)} ${p.floor}: ${p.ratio}${flag}`);
  }
  console.log(`\nUtanför bandet [${CONTRAST_MIN}, ${CONTRAST_MAX}]: ${probe.outOfBand.length} par`);
  console.log(`Injicerade gäster (sim-state):        seated=${seatedInState}, seatedIds=${seatedIdsLen}`);
  console.log(`Skärmdump (dag):                      ${dayShot}`);
  console.log(`Skärmdump (kväll):                    ${eveningShot}`);
} finally {
  await browser.close();
  await new Promise((r) => { vite.on('exit', r); vite.kill('SIGTERM'); setTimeout(() => { vite.kill('SIGKILL'); r(); }, 3000); });
}
