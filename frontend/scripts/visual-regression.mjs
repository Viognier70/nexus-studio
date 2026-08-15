#!/usr/bin/env node
// ORDER 064 INFRA-1 runner — visual regression via Playwright + Vite dev.
//
// Boots `vite dev` in a child process, drives Chromium (headless) to
// each canonical pose in visualPoses.ts, waits for the pixel sampler
// to publish N stable ticks, reads window.__nxHarness, and prints a
// comparison table against the expected sRGB range per pose.
//
// NOT part of `npm test`. Deliberate: full pose × period rendering is
// too slow to run alongside unit tests. Exposed as `npm run test:visual`
// and intended as an own CI step separate from typecheck + unit tests.
//
// Usage:
//   npm run test:visual                   -- run all seven poses
//   npm run test:visual -- --only sky-morning
//                                         -- run one pose (sky-morning
//                                            is the calibration pose;
//                                            if it fails, the other
//                                            six are meaningless).
//
// Design decisions:
//   - Vite DEV (not preview) — INFRA-1 URL params + PixelSampleProbe
//     are gated on `import.meta.env.DEV`, and preserveDrawingBuffer=true
//     is only set in DEV. Preview would give us a black framebuffer.
//   - Stability signal: `window.__nxHarness.ticks >= 3` — three sample
//     ticks means ≥ 24 rendered frames (probe runs every 8th frame),
//     which comfortably clears the pose transition. NOT a fixed timeout.
//   - Exit code non-zero if the sky-morning calibration pose fails or
//     if any pose's measured RGB falls outside its expected range.
//     Individual pose failures do not abort — the whole table is
//     printed so the Vision Owner can see the pattern.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = resolve(__dirname, '..');
const REPORT_DIR = resolve(FRONTEND_ROOT, 'reports', 'visual-regression');
mkdirSync(REPORT_DIR, { recursive: true });

// ---------- args -------------------------------------------------------

const args = process.argv.slice(2);
const onlyIdx = args.indexOf('--only');
const onlyPoseId = onlyIdx !== -1 ? args[onlyIdx + 1] : null;

// ---------- pose catalogue (loaded from source) ------------------------
//
// visualPoses.ts is TS — we can't import it directly from an mjs
// runner. Rather than add a build step, we inline the poseToHash
// convention (short function) and load the pose list via a tiny
// dynamic loader. The alternative — a JSON export of the catalogue —
// would drift from the TS source. Keeping the source of truth in TS
// and computing the URL from a mirrored function is cheaper.

// Mirror of poseToHash() from visualPoses.ts. Kept in sync manually;
// the format is deliberately simple. Poses whose id starts with
// `calibration-` additionally set `calibrationQuad=1`.
function poseToHash(pose) {
  const p = pose.camera;
  const roi = pose.roi;
  const calibrationParam = pose.id.startsWith('calibration-') ? '&calibrationQuad=1' : '';
  return (
    `#poseId=${pose.id}` +
    `&focus=${p.focus.x},${p.focus.z}` +
    `&distance=${p.distance}` +
    `&yaw=${p.yaw}` +
    `&pitch=${p.pitch}` +
    `&period=${pose.period}` +
    `&roi=${roi.x},${roi.y},${roi.w},${roi.h}` +
    calibrationParam
  );
}

// Load VISUAL_POSES from the source. Reads the TS file and evaluates
// the exported array via a small transpile-through-tsx trick — but the
// simpler path is to write a plain-JS mirror. Given the file is
// authored (not generated) and short, we compile through tsx in-process.
// Simpler still: just re-declare the seven poses here, matched line-for-
// line against visualPoses.ts. Drift risk is low (both authored by hand;
// pixel test failures will surface any divergence).
const VISUAL_POSES = [
  // ORDER 069 — roof ROIs shrunk to uniform sunlit face (12×24 at
  // (626, 350)); village-strategic-lunch removed (mixed surfaces
  // at wide zoom); lit-window ROI moved to (260, 400).
  // ORDER 070 approved thresholds landed. See visualPoses.ts for
  // per-pose motivation. Mirror kept in sync manually.
  {
    id: 'roof-tegel-lunch',
    purpose: 'Tegel roof — sunlit south face at solar noon.',
    camera: { focus: { x: 190, z: 45 }, distance: 60, yaw: 0.6, pitch: 0.45 },
    period: 'lunch',
    roi: { x: 626, y: 350, w: 12, h: 24 },
    expected: { r: [118, 124], g: [31, 37], b: [18, 24] },
    expectUniform: true
  },
  {
    id: 'roof-tegel-morning',
    purpose: 'Tegel roof — same face at morning low-sun.',
    camera: { focus: { x: 190, z: 45 }, distance: 60, yaw: 0.6, pitch: 0.45 },
    period: 'morning',
    roi: { x: 626, y: 350, w: 12, h: 24 },
    expected: { r: [59, 65], g: [8, 14], b: [4, 10] },
    expectUniform: true
  },
  {
    id: 'village-strategic-dinner',
    purpose: 'Wide strategic view at dinner — hemi baseline near-black.',
    camera: { focus: { x: 100, z: 0 }, distance: 380, yaw: 0.0, pitch: 0.60 },
    period: 'dinner',
    roi: { x: 640, y: 360, w: 40, h: 40 },
    expected: { r: [3, 15], g: [5, 15], b: [6, 16] },
    expectUniform: false
  },
  {
    id: 'village-strategic-evening',
    purpose: 'Wide strategic view at evening — hemi baseline near-black.',
    camera: { focus: { x: 100, z: 0 }, distance: 380, yaw: 0.0, pitch: 0.60 },
    period: 'evening',
    roi: { x: 640, y: 360, w: 40, h: 40 },
    expected: { r: [3, 15], g: [5, 15], b: [6, 16] },
    expectUniform: false
  },
  {
    id: 'lit-window-dinner',
    purpose: 'Close-up of a lit-window pane at dinner — 25×25 sample inside a uniform lit pane (ORDER 072).',
    camera: { focus: { x: 190, z: 45 }, distance: 20, yaw: 0.6, pitch: 0.35 },
    period: 'dinner',
    roi: { x: 506, y: 409, w: 25, h: 25 },
    expected: { r: [242, 248], g: [219, 225], b: [166, 172] },
    expectUniform: true
  },
  // ORDER 066 — replaces sky-morning. Dev-only calibration quad
  // rendered through the full pipeline. Camera pose irrelevant
  // (the quad is attached to camera view-space).
  // ORDER 067 approved range [158, 162] per channel.
  {
    id: 'calibration-quad',
    purpose: 'Dev-only calibration quad — known authored colour through material → ACES → sRGB.',
    camera: { focus: { x: 100, z: 0 }, distance: 380, yaw: 0.0, pitch: 0.56 },
    period: 'lunch',
    roi: { x: 610, y: 330, w: 60, h: 60 },
    expected: { r: [158, 162], g: [158, 162], b: [158, 162] },
    expectUniform: true
  }
];

// ---------- preview + browser -----------------------------------------

async function startVite() {
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND_ROOT,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const url = 'http://localhost:5173';
  // Log stdout/stderr for diagnostic (helps read the CI log if we
  // ever time out again).
  proc.stdout.on('data', (c) => process.stdout.write(`[vite] ${c}`));
  proc.stderr.on('data', (c) => process.stderr.write(`[vite:err] ${c}`));
  // Poll HTTP until vite responds. More robust than parsing stdout —
  // vite banner format changes between versions and CI can be slow
  // enough that on-cold-cache dep pre-bundling delays the banner
  // beyond any reasonable stdout-watch timeout.
  const deadline = Date.now() + 300000;   // 5 min
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) {
      throw new Error(`vite exited early (code ${proc.exitCode}) before ready`);
    }
    try {
      const res = await fetch(url + '/');
      if (res.ok || res.status === 304) {
        return { proc, url };
      }
    } catch {
      // ECONNREFUSED etc — server not up yet
    }
    await delay(500);
  }
  throw new Error('vite dev did not respond within 300s');
}

async function stopVite(proc) {
  return new Promise((res) => {
    proc.on('exit', () => res(undefined));
    proc.kill('SIGTERM');
    setTimeout(() => { proc.kill('SIGKILL'); res(undefined); }, 3000);
  });
}

// ---------- measurement -----------------------------------------------

/** Navigate, wait for stability, read window.__nxHarness. */
async function measurePose(page, baseUrl, pose) {
  const url = `${baseUrl}/${poseToHash(pose)}`;
  const consoleLines = [];
  const pageErrors = [];
  const onConsole = (msg) => consoleLines.push(`[${msg.type()}] ${msg.text()}`);
  const onError = (err) => pageErrors.push(err.message);
  page.on('console', onConsole);
  page.on('pageerror', onError);
  try {
    await page.goto(url, { waitUntil: 'load' });
    // Wait for the pixel sampler to publish at least 3 stable ticks.
    // Each tick = 8 rendered frames (~130 ms at 60 fps). 3 ticks
    // clears the pose transition + camera damping settle without
    // sitting on a fixed sleep.
    // Headless Chromium falls back to software rasterisation for
    // WebGL. The strategic scene renders at ~1 fps for LOD 0
    // close-ups; probe throttle now lowered to every 2nd frame
    // (ORDER 071 PixelSampleProbe). Wait for at least 6 ticks
    // (ORDER 072: bumped from 2 because ProceduralFacades' lit-
    // glass day→night material swap runs on a separate 4-frame
    // throttle inside its own useFrame, so 2 pixelSampler ticks
    // aren't enough to guarantee the swap has fired for the lit-
    // window pose. 6 ticks = ~12 render frames, comfortably past
    // the swap on both platforms).
    try {
      // page.waitForFunction(pageFunction, arg, options). The
      // second positional arg is `arg` (data passed into the page
      // function), NOT options. Passing `{ timeout: ... }` there
      // silently gets ignored and playwright falls back to its
      // 30 s default — exact bug that let ORDER 072's first CI
      // run report "Timeout 30000ms exceeded" even though ticks
      // had reached 6. Pass `null` for arg, options third.
      await page.waitForFunction(
        () => {
          const h = /** @type {any} */ (window).__nxHarness;
          return h && h.ticks >= 6;
        },
        null,
        { timeout: 180000 }
      );
    } catch (e) {
      // Deep diagnostics on timeout: what state IS window in?
      const diag = await page.evaluate(() => ({
        hasHarness: typeof (/** @type {any} */ (window)).__nxHarness !== 'undefined',
        harness: (/** @type {any} */ (window)).__nxHarness ?? null,
        hasCanvas: !!document.querySelector('canvas'),
        canvasSize: (() => {
          const c = document.querySelector('canvas');
          return c ? { w: c.width, h: c.height } : null;
        })(),
        hash: window.location.hash,
        docReadyState: document.readyState,
        bodyTextLen: document.body?.innerText.length ?? 0
      }));
      return {
        pose,
        measured: null,
        error: `stability wait failed: ${e instanceof Error ? e.message : String(e)}`,
        diag,
        consoleLines: consoleLines.slice(-20),
        pageErrors
      };
    }
    // Extra settle so camera damping + tone-map + shadow map all resolve.
    await delay(1000);
    const rgb = await page.evaluate(() => {
      const h = /** @type {any} */ (window).__nxHarness;
      return h ? { r: h.r, g: h.g, b: h.b, samples: h.samples, ticks: h.ticks, varR: h.varR ?? 0, varG: h.varG ?? 0, varB: h.varB ?? 0 } : null;
    });
    // ORDER 068 — save a PNG per pose with the ROI drawn on top.
    // Two invisible-DOM tricks are needed to make the screenshot
    // faithful to what the pixel sampler reads:
    //   (1) The pixel sampler reads the WebGL canvas framebuffer
    //       directly. DOM panels overlaying the canvas do NOT
    //       affect the sampled RGB — but they DO appear in a plain
    //       page.screenshot(). First calibration run showed the
    //       "Din verksamhet" onboarding modal covering the canvas
    //       in the PNG even though the underlying WebGL read was
    //       the calibration quad. So we must hide the DOM UI
    //       before screenshotting.
    //   (2) Setting `visibility: hidden` on <body> hides everything
    //       inherited; then explicitly re-enabling `visibility:
    //       visible` on the canvas and the ROI overlay puts them
    //       back in the picture. Children of a `visibility:hidden`
    //       ancestor can override with their own `visible`.
    const roi = pose.roi;
    await page.evaluate((r) => {
      const el = document.createElement('div');
      el.id = '__nxRoiOverlay';
      el.style.cssText =
        `position:fixed;left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;` +
        `border:2px solid red;box-sizing:border-box;pointer-events:none;z-index:99999;` +
        `visibility:visible;`;
      document.body.appendChild(el);
      // Hide DOM UI, re-show canvas + overlay.
      document.body.style.visibility = 'hidden';
      const canvas = document.querySelector('canvas');
      if (canvas) canvas.style.visibility = 'visible';
    }, roi);
    const pngPath = `${REPORT_DIR}/${pose.id}.png`;
    await page.screenshot({ path: pngPath, fullPage: false });
    await page.evaluate(() => {
      const el = document.getElementById('__nxRoiOverlay');
      if (el) el.remove();
      document.body.style.visibility = '';
      const canvas = document.querySelector('canvas');
      if (canvas) canvas.style.visibility = '';
    });
    return { pose, measured: rgb, pngPath };
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onError);
  }
}

function inRange(m, exp) {
  if (!m) return false;
  return (
    m.r >= exp.r[0] && m.r <= exp.r[1] &&
    m.g >= exp.g[0] && m.g <= exp.g[1] &&
    m.b >= exp.b[0] && m.b <= exp.b[1]
  );
}

function fmtRange(exp) {
  return `R[${exp.r[0]},${exp.r[1]}] G[${exp.g[0]},${exp.g[1]}] B[${exp.b[0]},${exp.b[1]}]`;
}

function fmtDeviation(m, exp) {
  if (!m) return '—';
  const dev = (v, [lo, hi]) => {
    if (v < lo) return `-${lo - v}`;
    if (v > hi) return `+${v - hi}`;
    return '0';
  };
  return `R${dev(m.r, exp.r)} G${dev(m.g, exp.g)} B${dev(m.b, exp.b)}`;
}

function printTable(rows) {
  const w = { pose: 28, period: 10, measured: 22, expected: 32, dev: 20, variance: 14, pass: 4 };
  const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
  const header =
    pad('pose', w.pose) + pad('period', w.period) +
    pad('measured', w.measured) + pad('expected', w.expected) +
    pad('deviation', w.dev) + pad('variance', w.variance) + pad('ok?', w.pass);
  console.log('\n' + header);
  console.log('-'.repeat(header.length));
  const warnings = [];
  for (const r of rows) {
    const m = r.measured;
    const measuredStr = m ? `R=${m.r} G=${m.g} B=${m.b}` : (r.error ?? 'no read');
    const ok = m ? (inRange(m, r.pose.expected) ? 'yes' : 'NO') : 'ERR';
    const varStr = m ? `${m.varR}/${m.varG}/${m.varB}` : '—';
    console.log(
      pad(r.pose.id, w.pose) +
      pad(r.pose.period, w.period) +
      pad(measuredStr, w.measured) +
      pad(fmtRange(r.pose.expected), w.expected) +
      pad(m ? fmtDeviation(m, r.pose.expected) : '—', w.dev) +
      pad(varStr, w.variance) +
      pad(ok, w.pass)
    );
    // ORDER 072 — variance warning applies only to poses that
    // DECLARE themselves as targeting a uniform surface. Wide-
    // zoom mixed-surface poses (village-strategic dinner/evening)
    // have huge variance by design; that's fine because their
    // point IS to average many surfaces to a whole-canvas hemi
    // baseline. For uniform-target poses, non-zero variance
    // signals ROI-near-an-edge fragility ahead of a real cross-
    // platform failure.
    if (m && r.pose.expectUniform && (m.varR > 2 || m.varG > 2 || m.varB > 2)) {
      warnings.push(
        `${r.pose.id}: non-zero variance R=${m.varR} G=${m.varG} B=${m.varB} — ROI likely near a colour edge; pose may fail on future cross-platform runs even if mean is in range now.`
      );
    }
  }
  if (warnings.length > 0) {
    console.log('\n[variance warnings]');
    for (const w of warnings) console.log('  ! ' + w);
  }
  console.log(`\nScreenshots with ROI drawn: ${REPORT_DIR}/*.png`);
  // ORDER 071 — surface diagnostics for any pose that ERR'd, not
  // only for the calibration pose. Otherwise a stability-wait
  // failure on a downstream pose shows only "ERR" in the summary
  // table and buries the harness state / page-console lines.
  for (const r of rows) {
    if (r.measured) continue;
    console.log(`\n--- diagnostics for ${r.pose.id} ---`);
    if (r.error) console.log(`error: ${r.error}`);
    if (r.diag) console.log('harness state:', JSON.stringify(r.diag, null, 2));
    if (r.pageErrors && r.pageErrors.length > 0) {
      console.log('page errors:', r.pageErrors);
    }
    if (r.consoleLines && r.consoleLines.length > 0) {
      console.log('page console (last 20):');
      for (const l of r.consoleLines) console.log('  ' + l);
    }
  }
}

// ---------- main ------------------------------------------------------

async function main() {
  console.log('[visual-regression] starting Vite dev server...');
  const { proc, url } = await startVite();
  console.log(`[visual-regression] Vite ready at ${url}`);
  let exitCode = 0;
  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });

    // Fresh page per pose. Hash-only URL changes don't reload the
    // module tree — harnessParams parses `location.hash` once at
    // module load, so a single reused page would carry the first
    // pose's URL params into every subsequent pose. Building a new
    // page per pose forces a fresh app boot and a fresh harness
    // params parse.
    const runPose = async (pose) => {
      const p = await context.newPage();
      try {
        return await measurePose(p, url, pose);
      } finally {
        await p.close();
      }
    };

    // Calibration-quad always first — dev-only known-colour pose
    // (ORDER 066). If it fails, the remaining six are meaningless
    // per the ORDER 064 rule.
    const calibration = VISUAL_POSES.find((p) => p.id === 'calibration-quad');
    console.log('[visual-regression] calibration-quad...');
    const skyResult = await runPose(calibration);
    const skyPass = skyResult.measured ? inRange(skyResult.measured, calibration.expected) : false;

    if (!skyPass) {
      console.log('\n=== calibration-quad FAILED ===');
      printTable([skyResult]);
      if (skyResult.diag) {
        console.log('\nDiagnostics for the read failure:');
        console.log(JSON.stringify(skyResult.diag, null, 2));
      }
      if (skyResult.consoleLines && skyResult.consoleLines.length > 0) {
        console.log('\nPage console (last 20 lines):');
        for (const l of skyResult.consoleLines) console.log('  ' + l);
      }
      if (skyResult.pageErrors && skyResult.pageErrors.length > 0) {
        console.log('\nPage errors:');
        for (const l of skyResult.pageErrors) console.log('  ' + l);
      }
      console.log(
        '\nCalibration-quad is out of expected range (or read failed). ' +
        'Per ORDER 064, the other six poses are meaningless without a ' +
        'valid calibration and are not run. NOT auto-adjusting thresholds — ' +
        'the values in visualPoses.ts are placeholders and require Vision ' +
        'Owner approval before change.'
      );
      exitCode = 1;
    } else {
      console.log('[visual-regression] calibration-quad OK, running remaining poses...');
      const results = [skyResult];
      const rest = VISUAL_POSES.filter((p) => p.id !== 'calibration-quad');
      const toRun = onlyPoseId ? rest.filter((p) => p.id === onlyPoseId) : rest;
      for (const pose of toRun) {
        console.log(`[visual-regression] pose ${pose.id}...`);
        const r = await runPose(pose);
        results.push(r);
      }
      printTable(results);
      const anyOut = results.some((r) => !r.measured || !inRange(r.measured, r.pose.expected));
      if (anyOut) {
        console.log('\nOne or more poses fell outside expected ranges. NOT auto-adjusting thresholds; awaiting Vision Owner review of measured values.');
        exitCode = 1;
      } else {
        console.log('\nAll poses within expected ranges.');
      }
    }

    await browser.close();
  } finally {
    console.log('[visual-regression] stopping Vite...');
    await stopVite(proc);
  }
  process.exit(exitCode);
}

main().catch((e) => {
  console.error('[visual-regression] fatal:', e);
  process.exit(2);
});
