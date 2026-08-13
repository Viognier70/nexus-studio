#!/usr/bin/env node
// ORDER 083 — Vinbaren camera-pitch probe.
//
// Connects to the running dev server on 5173, drives a chromium
// instance to five pitches (58° / 45° / 35° / 25° / 15°) at
// distance 8.4m, seeds the sim to mid-dinner so staff + guests are
// visible, and saves one PNG per pitch to
// `reports/pitch-probe/pitch-<deg>.png`.
//
// Distance 8.4 m and pitch 15° sit below the game's live camera
// clamps (minDistance 10, pitchMin 18°). The throw in
// CameraContext.tsx is temporarily relaxed to a warn under
// ORDER 083 so the probe can measure the requested values; the
// relaxation reverts before commit.
//
// The probe does NOT modify sim architecture — it uses two dev-only
// window hooks published by SimulationProvider + BusinessProvider
// (`__nxSimDispatch`, `__nxSimState`, `__nxSetBusinessName`) which
// tree-shake at prod build time.

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = resolve(__dirname, '..', 'reports', 'pitch-probe');
mkdirSync(REPORT_DIR, { recursive: true });

const BASE_URL = 'http://localhost:5173';

// Vinbaren focus: player business centroid (viewLevels.ts §40).
const FOCUS = { x: 31.6, z: -16.7 };
const DISTANCE = 8.4;
const YAW = 0.4;

// User's requested pitch sweep.
const PITCH_DEGREES = [58, 45, 35, 25, 15];

function pitchToRad(deg) {
  return (deg * Math.PI) / 180;
}

// Compose the URL for a given pitch. `#playtest=1` hides the
// crosshair + pixel probe overlay; camera params override the
// preset per CameraContext harness path.
function urlForPitch(pitchDeg) {
  const p = pitchToRad(pitchDeg).toFixed(4);
  const fx = FOCUS.x;
  const fz = FOCUS.z;
  return (
    `${BASE_URL}/` +
    `#playtest=1` +
    `&focus=${fx},${fz}` +
    `&distance=${DISTANCE}` +
    `&yaw=${YAW}` +
    `&pitch=${p}` +
    // `period=lunch` forces solar-noon lighting so the interior
    // stub reads. Dinner-period tests came back too dark to judge
    // action legibility.
    `&period=lunch`
  );
}

// Seed the sim to mid-dinner. Runs entirely inside the page.
async function seedMidDinner(page) {
  return page.evaluate(async () => {
    /** @type {any} */ const w = window;

    // 1. Bypass name entry.
    if (typeof w.__nxSetBusinessName !== 'function') {
      throw new Error('__nxSetBusinessName hook missing — dev build not active?');
    }
    w.__nxSetBusinessName('Probe');
    // No await here — we do the whole seed synchronously so no RAF
    // frame can interleave a real-time TICK between our SET_SPEED
    // and the setup dispatches. The speedRef in SimulationProvider
    // updates on the next React render; running everything in one
    // synchronous JS turn means RAF can't preempt us.

    if (typeof w.__nxSimDispatch !== 'function') {
      throw new Error('__nxSimDispatch hook missing');
    }
    const dispatch = w.__nxSimDispatch;

    // 1a. Pause the RAF-driven tick loop so only our scripted TICKs
    //     advance sim-time. Speed 0 makes SimulationProvider's RAF
    //     loop skip its dispatch entirely (see the `if (mult > 0)`
    //     branch).
    dispatch({ type: 'SET_SPEED', speed: 0 });

    // 2. Morning setup — buy plenty of stock for a diverse menu.
    dispatch({ type: 'BUY_STOCK', supplierId: 'wholesaler', ingredientId: 'chicken',  units: 30 });
    dispatch({ type: 'BUY_STOCK', supplierId: 'wholesaler', ingredientId: 'pork',     units: 30 });
    dispatch({ type: 'BUY_STOCK', supplierId: 'wholesaler', ingredientId: 'root-veg', units: 60 });
    dispatch({ type: 'BUY_STOCK', supplierId: 'wholesaler', ingredientId: 'dairy',    units: 30 });
    dispatch({ type: 'BUY_STOCK', supplierId: 'wholesaler', ingredientId: 'eggs',     units: 30 });
    dispatch({ type: 'BUY_STOCK', supplierId: 'local-veg',  ingredientId: 'herbs',    units: 30 });
    dispatch({ type: 'BUY_STOCK', supplierId: 'local-veg',  ingredientId: 'leaf-veg', units: 30 });
    dispatch({ type: 'BUY_STOCK', supplierId: 'meat-game',  ingredientId: 'lamb',     units: 15 });
    dispatch({ type: 'COMPOSE_MENU', dishes: [
      { dishId: 'chicken-plate', price: 175 },
      { dishId: 'pork-plate',    price: 195 },
      { dishId: 'lamb-plate',    price: 285 },
      { dishId: 'dairy-dessert', price: 85  },
      { dishId: 'root-soup',     price: 95  }
    ]});
    dispatch({ type: 'SKIP_LUNCH' });
    dispatch({ type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: 15 });

    // 3. Fast-forward. TICK dispatch bypasses the RAF loop — advance
    //    ~200 sim-seconds so the service has passed opening (10 s) +
    //    prep (120 s) and is ~1 min into mid-service. Kept short so
    //    even if the RAF loop leaks a few TICKs before SET_SPEED 0
    //    propagates, the sim state stays inside the service window
    //    (day 1 dinner) rather than crossing into day 2 morning.
    for (let i = 0; i < 1000; i++) {
      dispatch({ type: 'TICK', dt: 0.2 });
    }
    // Small settle for R3F frame to catch up with the state changes.
    await new Promise((r) => setTimeout(r, 500));

    // 4. Return diagnostics.
    const s = w.__nxSimState;
    return {
      period: s?.day?.period,
      simTime: s?.simTime,
      guestCount: s?.guests?.length ?? 0,
      staffCount: s?.staff?.length ?? 0,
      menuLen: s?.menu?.length ?? 0
    };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[browser ${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => console.log(`[browser pageerror] ${err.message}`));

  console.log(`ORDER 083 — pitch probe`);
  console.log(`focus=(${FOCUS.x}, ${FOCUS.z})  distance=${DISTANCE}m  yaw=${YAW}rad`);
  console.log(`report dir: ${REPORT_DIR}\n`);

  const results = [];
  for (const pitchDeg of PITCH_DEGREES) {
    const url = urlForPitch(pitchDeg);
    console.log(`[pitch ${pitchDeg}°] navigating: ${url}`);
    let diag = null;
    try {
      // Try up to 3 times if the seed lands in the wrong state.
      // The RAF loop in SimulationProvider races with our seed —
      // some navigations catch it mid-tick and drift the sim past
      // day rollover. A fresh page.goto restarts the sim state and
      // gives us another chance.
      for (let attempt = 0; attempt < 3; attempt++) {
        await page.goto(url, { waitUntil: 'load' });
        await page.waitForFunction(
          () => {
            const w = /** @type {any} */ (window);
            return !!document.querySelector('canvas')
              && typeof w.__nxSetBusinessName === 'function'
              && typeof w.__nxSimDispatch === 'function';
          },
          null,
          { timeout: 30000 }
        );
        diag = await seedMidDinner(page);
        console.log(`[pitch ${pitchDeg}° attempt ${attempt + 1}] seeded: period=${diag.period} t=${diag.simTime?.toFixed?.(1)}s guests=${diag.guestCount} staff=${diag.staffCount} menu=${diag.menuLen}`);
        // Acceptable if we landed in dinner mid-service with at
        // least a couple of guests. If we crossed day rollover
        // (period='morning' or menuLen==0), retry.
        if (diag.period === 'dinner' && diag.menuLen > 0 && diag.guestCount >= 3) break;
        console.log(`[pitch ${pitchDeg}° attempt ${attempt + 1}] state drifted (period=${diag.period}, guests=${diag.guestCount}), retrying...`);
      }

      // Extra render settle — the frame after all the ticks needs a
      // moment for R3F to layout + shadow map to update.
      await new Promise((r) => setTimeout(r, 1500));

      const pngPath = `${REPORT_DIR}/pitch-${pitchDeg.toString().padStart(2, '0')}.png`;
      await page.screenshot({ path: pngPath, fullPage: false });
      console.log(`[pitch ${pitchDeg}°] saved ${pngPath}`);
      results.push({ pitchDeg, pngPath, diag });
    } catch (e) {
      console.log(`[pitch ${pitchDeg}°] FAIL: ${e instanceof Error ? e.message : String(e)}`);
      results.push({ pitchDeg, error: String(e) });
    }
  }

  await browser.close();

  console.log('\n--- summary ---');
  for (const r of results) {
    if (r.error) {
      console.log(`  ${r.pitchDeg}° — ERROR: ${r.error.slice(0, 120)}`);
    } else {
      console.log(`  ${r.pitchDeg}° — ${r.pngPath}  (guests=${r.diag?.guestCount ?? '?'})`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
