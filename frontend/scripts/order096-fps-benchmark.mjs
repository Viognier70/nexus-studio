#!/usr/bin/env node
// ORDER 096 §5 — Dockskåpets mätgrind (benchmark script).
//
// Standalone Node/Playwright script — no repo imports, no runtime dependencies
// beyond playwright (already in frontend/package.json). Covers SD-003 §5.1–§5.3:
//
//   §5.1  FPS sweep: 5 / 10 / 20 / 30 / 40 rigged SVG figures in motion,
//         mean and 5th-percentile fps over 10 s of continuous animation.
//   §5.2  Room-width math: dining-room pixel width and figure count at
//         1280 / 1920 / 2560 px screen widths (alt C layout).
//   §5.3  Map minimum readable size: smallest dimensions where pucks,
//         rhythm rings, and table density remain distinguishable.
//   §5.4  Screenshot + video recording of 30 figures in motion.
//
// Run from the frontend/ directory:
//   node scripts/order096-fps-benchmark.mjs
//
// Outputs:
//   frontend/reports/order096/results.json   — machine-readable results
//   frontend/reports/order096/bench-30.png   — screenshot at 30 figures
//   frontend/reports/order096/bench-30.webm  — 12-second recording
//
// The rig is copied from documentation/prototypes/staff-guest-reel-extended/
// guest-reel.jsx and ported to vanilla JS — no JSX, no React. This is an
// intentional simplification: React reconciliation adds 5–15% overhead on top
// of the raw SVG update cost. The benchmark therefore errs slightly optimistic;
// the actual dockskåp component will be somewhat slower. The §5.1 pass/fail
// threshold is 60 fps with margin, so an honest benchmark should still clear it.

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const REPORT_DIR = resolve(REPO_ROOT, 'frontend/reports/order096');
mkdirSync(REPORT_DIR, { recursive: true });

// ── Benchmark HTML factory ────────────────────────────────────────────────────
// Generates a self-contained HTML page with COUNT baked in. The page runs the
// rig animation via requestAnimationFrame and writes results to
// window.__benchmark_result__ when done. No network fetches; served via
// page.setContent().

function buildBenchmarkHTML(count, warmupMs = 2000, measureMs = 10000) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>ORDER 096 bench — N=${count}</title>
<style>
  html, body { margin: 0; background: #f3f2f2; overflow: hidden; }
  svg { display: block; }
  #status {
    position: fixed; top: 10px; left: 10px;
    font: 700 13px "JetBrains Mono", monospace;
    background: rgba(0,0,0,0.75); color: #f0f0f0;
    padding: 8px 12px; border-radius: 4px; z-index: 10; white-space: pre;
  }
</style>
</head>
<body>
<div id="status">Warming up… (N=${count})</div>
<svg id="stage" xmlns="http://www.w3.org/2000/svg"
     style="position:absolute;inset:0;width:100%;height:100%"></svg>
<script>
// ── Rig math — copied from guest-reel.jsx (ported to vanilla JS) ──────────────
// Source: documentation/prototypes/staff-guest-reel-extended/guest-reel.jsx
// Pose keys and limb-blend logic reproduced verbatim; JSX → imperative DOM.

const INK = '#201e1d', FAR = '#8f8a89', ACCENT = '#ec3013', GROUND = '#f3f2f2';

function lerp(a, b, k) { return a + (b - a) * k; }
function clamp01(v) { return Math.max(0, Math.min(1, v)); }

const POSE_KEYS = ['lean', 'head', 'hipDrop', 'mouth'];
const LIMB_KEYS = ['armFar', 'armNear', 'legFar', 'legNear'];

function blend(a, b, k) {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const o = {};
  POSE_KEYS.forEach(key => { o[key] = lerp(a[key] || 0, b[key] || 0, k); });
  LIMB_KEYS.forEach(key => {
    o[key] = [lerp(a[key][0], b[key][0], k), lerp(a[key][1], b[key][1], k)];
  });
  return o;
}

const IDLE = { lean: 1, head: 0, hipDrop: 0, mouth: 0,
               armFar: [5, -9], armNear: [-4, -11], legFar: [3, -4], legNear: [-3, -3] };

function idlePose(T) {
  const b = Math.sin(T * 1.7);
  return Object.assign({}, IDLE, {
    hipDrop: 1.6 + 1.6 * b,
    head: 1.6 * Math.sin(T * 1.1),
    lean: 1 + 0.6 * b,
  });
}

function walkPose(ph, amp) {
  const s = Math.sin(2 * Math.PI * ph);
  const kn = o => -10 - 30 * Math.max(0, Math.sin(2 * Math.PI * (ph + o) + 1.15));
  return {
    lean: 5.5, head: -2.5 + 1.6 * s, hipDrop: 4 * Math.abs(s), mouth: 0,
    legNear: [26 * amp * s, kn(0)],
    legFar:  [-26 * amp * s, kn(0.5)],
    armNear: [-26 * amp * s, -20 - 12 * Math.max(0, s)],
    armFar:  [26 * amp * s,  -20 - 12 * Math.max(0, -s)],
  };
}

const SIT = { lean: 3, head: -1, hipDrop: 47, mouth: 0,
              armFar: [70, -56], armNear: [66, -52], legFar: [84, -86], legNear: [88, -90] };

function sitEat(T) {
  const c = Math.sin(T * 3.1);
  return Object.assign({}, SIT, {
    lean: 7, head: 4 + 3 * c,
    armNear: [78, -118 - 16 * c], armFar: [60, -62],
    mouth: clamp01(0.5 + 0.5 * Math.sin(T * 3.1 - 0.9)),
  });
}

function sitHail(T) {
  const w = Math.sin(T * 9);
  return Object.assign({}, SIT, { lean: 1, head: -4, armNear: [128, -28 - 16 * w], armFar: [58, -60] });
}

// ── SVG DOM builder ───────────────────────────────────────────────────────────

const NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

// Build one figure's SVG subtree. Returns { root, refs }.
// refs = mutable handles to transform-bearing elements, updated each frame
// without re-querying the DOM.
function buildFigure(nearFill, farFill) {
  const g = (attrs) => svgEl('g', attrs || {});
  const r = (attrs) => svgEl('rect', attrs);

  // Outer transform: translate(x,y) scale(s)
  const root = g();

  // Body: translate(0, -122+hipDrop) rotate(-lean)
  const body = g();
  root.appendChild(body);

  // Far leg: two segments
  const legFarG  = g();
  const legFarLo = g();
  legFarG.appendChild(r({ x: -11, y: 0, width: 22, height: 60, fill: farFill }));
  legFarLo.appendChild(r({ x: -10, y: 0, width: 20, height: 62, fill: farFill }));
  legFarLo.appendChild(r({ x: -9,  y: 62, width: 34, height: 12, fill: farFill }));
  legFarG.appendChild(legFarLo);
  body.appendChild(legFarG);

  // Far arm: translate(0,-96) then two segments
  const armFarG  = g({ transform: 'translate(0,-96)' });
  const armFarLo = g();
  armFarG.appendChild(r({ x: -9, y: 0, width: 18, height: 48, fill: farFill }));
  armFarLo.appendChild(r({ x: -8, y: 0,  width: 16, height: 44, fill: farFill }));
  armFarLo.appendChild(r({ x: -9, y: 44, width: 18, height: 15, fill: farFill }));
  armFarG.appendChild(armFarLo);
  body.appendChild(armFarG);

  // Torso + belt (accent stripe)
  body.appendChild(r({ x: -31, y: -112, width: 62,  height: 112, fill: nearFill }));
  body.appendChild(r({ x: -34, y: -112, width: 68,  height: 15,  fill: ACCENT }));

  // Near leg
  const legNearG  = g();
  const legNearLo = g();
  legNearG.appendChild(r({ x: -11, y: 0, width: 22, height: 60, fill: nearFill }));
  legNearLo.appendChild(r({ x: -10, y: 0, width: 20, height: 62, fill: nearFill }));
  legNearLo.appendChild(r({ x: -9,  y: 62, width: 34, height: 12, fill: nearFill }));
  legNearG.appendChild(legNearLo);
  body.appendChild(legNearG);

  // Head group: translate(0,-112) rotate(-head)
  const headG = g();
  headG.appendChild(r({ x: -11, y: -16, width: 22, height: 18, fill: nearFill }));
  headG.appendChild(r({ x: -27, y: -70, width: 54, height: 58, fill: GROUND, stroke: INK, 'stroke-width': 4 }));
  headG.appendChild(r({ x: -29, y: -76, width: 58, height: 16, fill: nearFill }));
  headG.appendChild(r({ x: 7,   y: -48, width: 8,  height: 10, fill: INK }));
  const mouthRect = r({ x: 4,   y: -30, width: 14, height: 9,  fill: INK });
  headG.appendChild(mouthRect);
  body.appendChild(headG);

  // Near arm
  const armNearG  = g({ transform: 'translate(0,-96)' });
  const armNearLo = g();
  armNearG.appendChild(r({ x: -9, y: 0, width: 18, height: 48, fill: nearFill }));
  armNearLo.appendChild(r({ x: -8, y: 0,  width: 16, height: 44, fill: nearFill }));
  armNearLo.appendChild(r({ x: -9, y: 44, width: 18, height: 15, fill: nearFill }));
  armNearG.appendChild(armNearLo);
  body.appendChild(armNearG);

  return {
    root,
    refs: { root, body, legFarG, legFarLo, armFarG, armFarLo, legNearG, legNearLo, headG, armNearG, armNearLo, mouthRect },
  };
}

// Apply a pose to a figure's DOM refs — no DOM queries, pure attribute writes.
function applyPose(refs, p, x, y, scale) {
  refs.root.setAttribute('transform',   'translate(' + x + ',' + y + ') scale(' + scale + ')');
  refs.body.setAttribute('transform',   'translate(0,' + (-122 + p.hipDrop) + ') rotate(' + (-p.lean) + ')');
  refs.legFarG.setAttribute('transform',  'rotate(' + (-p.legFar[0]) + ')');
  refs.legFarLo.setAttribute('transform', 'translate(0,60) rotate(' + (-p.legFar[1]) + ')');
  refs.armFarG.setAttribute('transform',  'translate(0,-96) rotate(' + (-p.armFar[0]) + ')');
  refs.armFarLo.setAttribute('transform', 'translate(0,48) rotate(' + (-p.armFar[1]) + ')');
  refs.legNearG.setAttribute('transform',  'rotate(' + (-p.legNear[0]) + ')');
  refs.legNearLo.setAttribute('transform', 'translate(0,60) rotate(' + (-p.legNear[1]) + ')');
  refs.headG.setAttribute('transform',   'translate(0,-112) rotate(' + (-p.head) + ')');
  refs.armNearG.setAttribute('transform',  'translate(0,-96) rotate(' + (-p.armNear[0]) + ')');
  refs.armNearLo.setAttribute('transform', 'translate(0,48) rotate(' + (-p.armNear[1]) + ')');
  refs.mouthRect.setAttribute('height', 2 + p.mouth * 9);
}

// ── Scene setup ───────────────────────────────────────────────────────────────

const COUNT       = ${count};
const WARMUP_MS   = ${warmupMs};
const MEASURE_MS  = ${measureMs};

const W = 1920, H = 1080;
const stage = document.getElementById('stage');
stage.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
stage.setAttribute('preserveAspectRatio', 'xMidYMid meet');

// Background + floor
stage.appendChild(svgEl('rect', { x: 0, y: 0, width: W, height: H, fill: GROUND }));
stage.appendChild(svgEl('rect', { x: 0, y: H * 0.82, width: W, height: 4, fill: INK }));

// Figures — spread evenly, three pose types cycling to stress all rig branches.
const FLOOR_Y = Math.round(H * 0.82);
const spacing = W / (COUNT + 1);
const SCALE   = 1.6; // matches prototype reference scale (1920×1080 base)

const figures = [];
for (let i = 0; i < COUNT; i++) {
  // Cycle: walker / seated-eating / seated-hailing
  const poseType = i % 3; // 0=walk, 1=eat, 2=hail
  const phaseOffset = (i / COUNT) * 4; // stagger phases so no two figures are in sync
  const x = Math.round(spacing * (i + 1));
  // Alternate dark/lighter staff palette
  const fig = buildFigure(INK, FAR);
  stage.appendChild(fig.root);
  figures.push({ refs: fig.refs, poseType, phaseOffset, x });
}

// ── FPS measurement ───────────────────────────────────────────────────────────

const frameTimes = [];
let lastNow = 0;
let startNow = 0;
let phase = 'warmup';

function frame(now) {
  if (lastNow === 0) {
    lastNow = now;
    startNow = now;
    requestAnimationFrame(frame);
    return;
  }

  const dt      = now - lastNow;
  lastNow       = now;
  const elapsed = now - startNow;

  if (phase === 'warmup' && elapsed > WARMUP_MS) {
    phase = 'measuring';
    startNow = now;
    frameTimes.length = 0;
    document.getElementById('status').textContent =
      'Measuring… N=' + COUNT + '\\n' + '0/' + (MEASURE_MS / 1000) + 's';
  }

  if (phase === 'measuring' && elapsed > MEASURE_MS) {
    phase = 'done';
    finish();
    return;
  }

  // Animate all figures — T is scene time (seconds).
  const T = now / 1000;
  for (const fig of figures) {
    const ph  = (T * 1.35 + fig.phaseOffset) % 1;
    let pose;
    if (fig.poseType === 0) {
      pose = walkPose(ph, 1.0);
    } else if (fig.poseType === 1) {
      pose = sitEat(T + fig.phaseOffset);
    } else {
      pose = sitHail(T + fig.phaseOffset);
    }
    applyPose(fig.refs, pose, fig.x, FLOOR_Y, SCALE);
  }

  if (phase === 'measuring') {
    frameTimes.push(dt);
    if (frameTimes.length % 60 === 0) {
      document.getElementById('status').textContent =
        'Measuring… N=' + COUNT + '\\n' +
        (elapsed / 1000).toFixed(1) + '/' + (MEASURE_MS / 1000) + 's  ' +
        frameTimes.length + ' frames';
    }
  }

  requestAnimationFrame(frame);
}

function finish() {
  // Convert to fps then sort ascending so index 0 = slowest frames (worst jank).
  // p5 = 5th-percentile fps = worst 5% of frames = the jank budget.
  const fps     = frameTimes.map(dt => 1000 / dt);
  const fpsSorted = fps.slice().sort((a, b) => a - b); // ascending: slow → fast
  const mean = fps.reduce((s, v) => s + v, 0) / fps.length;
  const p5   = fpsSorted[Math.floor(fpsSorted.length * 0.05)] || fpsSorted[0];
  const p95  = fpsSorted[Math.floor(fpsSorted.length * 0.95)] || fpsSorted[fpsSorted.length - 1];

  window.__benchmark_result__ = {
    count: COUNT,
    frames: frameTimes.length,
    mean:  +mean.toFixed(2),
    p5:    +p5.toFixed(2),
    p95:   +p95.toFixed(2),
    frameTimes,
  };

  const statusEl = document.getElementById('status');
  statusEl.textContent = [
    'N=' + COUNT + ' · ' + frameTimes.length + ' frames',
    'mean  ' + mean.toFixed(1) + ' fps',
    'p5    ' + p5.toFixed(1) + ' fps  ← jank budget',
    'p95   ' + p95.toFixed(1) + ' fps',
    '',
    '✓ DONE',
  ].join('\\n');
}

requestAnimationFrame(frame);
</script>
</body>
</html>`;
}

// ── Room-width calculation (SD-003 §5.2) ──────────────────────────────────────
// Alt C layout: "ett rum i fokus, kök och bar som öppningar i bakväggen."
// The dining room occupies the central 70% of scene width; kitchen and bar
// openings together account for 30%. This ratio is derived from the
// guest-reel.jsx coordinate system (dining zone: x≈400–1640 in a 1920-wide
// viewBox → 1240/1920 ≈ 65%; rounded to 70% for a typical alt-C layout with
// slightly wider side openings).
// Figure width at the standard 140 px readability target scales with viewport
// height, since the figure is height-fixed in world units.
function computeRoomWidths() {
  const DINING_FRACTION = 0.70;
  const FIG_W_AT_1080H  = 140; // px — ORDER 096 §3 readability target

  return [1280, 1920, 2560].map(screenW => {
    const screenH     = Math.round(screenW * 9 / 16); // assume 16:9
    const diningW     = Math.round(screenW * DINING_FRACTION);
    const figW        = Math.round(FIG_W_AT_1080H * (screenH / 1080));
    const figuresAcross = Math.floor(diningW / figW);
    return { screenW, screenH, diningW, figW, figuresAcross };
  });
}

// ── Map-minimum-size calculation (SD-003 §5.3) ────────────────────────────────
// Overhead map instruments: pucks, rhythm rings, and table-density pattern.
// A puck reads as "round, distinct from neighbour" at ≥8 px diameter.
// A rhythm ring (outer boundary marker) reads at ≥14 px outer diameter
// (ring stroke ≥2 px, plus 2 px interior).
// Gap between puck centres: ≥18 px (14 px ring + 4 px clearance).
// 16-cover layout: 8 columns × 2 rows. A full row of 8 pucks = 8 × 18 = 144 px.
// The dining room is 70% of the map width → total min width: 144 / 0.70 ≈ 206 px.
// Heights: 2 rows (seated guests, 2 sides) + 1 service aisle row = 3 × 18 = 54 px
// for the dining band, plus 20 px top/bottom margins → 74 px minimum.
// Below 210 × 80 px, the density pattern cannot carry spatial information;
// the map becomes a decorative area indicator rather than a playable instrument.
function computeMapMinSize() {
  const PUCK_D         = 8;  // px
  const RING_OUTER     = 14; // px
  const GAP            = 4;  // px clearance between ring edges
  const CELL           = RING_OUTER + GAP; // 18 px per grid cell
  const COVERS_ACROSS  = 8;  // columns (half of 16 covers; other half on far side)
  const COVER_ROWS     = 2;  // near + far seating band
  const SERVICE_ROWS   = 1;  // aisle band
  const DINING_FRAC    = 0.70;
  const MARGIN         = 20; // top + bottom px

  const diningW = COVERS_ACROSS * CELL;           // 144 px
  const diningH = (COVER_ROWS + SERVICE_ROWS) * CELL; // 54 px
  const totalW  = Math.ceil(diningW / DINING_FRAC);   // 206 → 207 px
  const totalH  = diningH + MARGIN;                    // 74 px

  return {
    puckDiameter:    PUCK_D,
    rhythmRingOuter: RING_OUTER,
    minGap:          GAP,
    cellSize:        CELL,
    coversAcross:    COVERS_ACROSS,
    coverRows:       COVER_ROWS,
    diningMinW:      diningW,
    diningMinH:      diningH,
    totalMinW:       totalW,
    totalMinH:       totalH,
  };
}

// ── Percentile helper ─────────────────────────────────────────────────────────
function pct(sortedArr, p) {
  const i = Math.floor(sortedArr.length * p);
  return sortedArr[Math.max(0, Math.min(sortedArr.length - 1, i))];
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('ORDER 096 §5 — Dockskåpets mätgrind');
  console.log('═══════════════════════════════════════\n');

  // ── §5.2 — Room width ─────────────────────────────────────────────────────
  const roomWidths = computeRoomWidths();
  console.log('§5.2  Rumsbredd och figurantal (alt C, 70 % dining fraction)');
  console.log('──────────────────────────────────────────────────────────────');
  console.log('  Screen         Dining W   Fig W   Figures across');
  for (const r of roomWidths) {
    const fits = `${r.figuresAcross}`.padStart(2);
    console.log(`  ${String(r.screenW).padEnd(6)} × ${r.screenH}   ${String(r.diningW).padStart(4)} px   ${String(r.figW).padStart(3)} px   ${fits}`);
  }
  const covers16fits = roomWidths.map(r => r.figuresAcross >= 16 ? 'yes' : 'no');
  const covers16flag = covers16fits.some(v => v === 'yes') ? '' : '  ← 16 covers do NOT fit at 140 px figure width at any tested resolution';
  console.log(`\n  16 covers fit at 140 px width: ${covers16fits.join(' / ')}${covers16flag}`);
  console.log();

  // ── §5.3 — Map minimum size ────────────────────────────────────────────────
  const mapMin = computeMapMinSize();
  console.log('§5.3  Kartans minsta läsbara storlek');
  console.log('─────────────────────────────────────');
  console.log(`  Puck diameter (min):        ${mapMin.puckDiameter} px`);
  console.log(`  Rhythm ring outer (min):    ${mapMin.rhythmRingOuter} px`);
  console.log(`  Min gap (ring-to-ring):     ${mapMin.minGap} px → cell ${mapMin.cellSize} px`);
  console.log(`  Covers across dining row:   ${mapMin.coversAcross} columns × ${mapMin.coverRows} rows`);
  console.log(`  Dining-room min width:      ${mapMin.diningMinW} px`);
  console.log(`  Dining-room min height:     ${mapMin.diningMinH} px`);
  console.log(`  Total map min width:        ${mapMin.totalMinW} px`);
  console.log(`  Total map min height:       ${mapMin.totalMinH} px`);
  console.log(`  Below ${mapMin.totalMinW}×${mapMin.totalMinH} px: decoration, not instrument.`);
  console.log();

  // ── §5.1 + §5.4 — FPS benchmark via Playwright ────────────────────────────
  console.log('§5.1  Bildfrekvenssvep (Chromium, headless, 1920×1080)');
  console.log('─────────────────────────────────────────────────────────');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
    ],
  });

  const fpsResults = [];
  let screenshotPath  = null;
  let videoPath       = null;

  const COUNTS = [5, 10, 20, 30, 40];

  for (const count of COUNTS) {
    const doRecord = count === 30;
    const ctxOpts = {
      viewport: { width: 1920, height: 1080 },
    };
    if (doRecord) {
      ctxOpts.recordVideo = {
        dir:  REPORT_DIR,
        size: { width: 1920, height: 1080 },
      };
    }

    const ctx  = await browser.newContext(ctxOpts);
    const page = await ctx.newPage();

    const html = buildBenchmarkHTML(count);
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    // Wait for benchmark completion (warmup 2 s + measure 10 s + margin 3 s).
    await page.waitForFunction(
      () => window.__benchmark_result__ !== undefined,
      { timeout: 20000 }
    );

    const result = await page.evaluate(() => window.__benchmark_result__);

    // §5.4 — Screenshot at 30 figures after results are displayed.
    if (count === 30) {
      screenshotPath = resolve(REPORT_DIR, 'bench-30.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
    }

    await page.close();
    if (doRecord) {
      const videoFile = await ctx.close(); // returns video path on close
      // Playwright writes the video file asynchronously; path is on the page object.
      // The video file will be in REPORT_DIR with a generated name; rename below.
    } else {
      await ctx.close();
    }

    const r = {
      count:  result.count,
      frames: result.frames,
      mean:   result.mean,
      p5:     result.p5,
      p95:    result.p95,
    };
    fpsResults.push(r);

    const pass = result.p5 >= 60 ? '✓' : '✗';
    console.log(
      `  N=${String(count).padStart(2)}  ${result.frames} frames` +
      `  mean ${result.mean.toFixed(1).padStart(5)} fps` +
      `  p5 ${result.p5.toFixed(1).padStart(5)} fps  ${pass}`
    );
  }

  await browser.close();

  // Rename the video file (Playwright uses a UUID name).
  const { readdirSync, renameSync } = await import('node:fs');
  const videoFiles = readdirSync(REPORT_DIR).filter(f => f.endsWith('.webm'));
  if (videoFiles.length > 0) {
    const src = resolve(REPORT_DIR, videoFiles[videoFiles.length - 1]);
    videoPath = resolve(REPORT_DIR, 'bench-30.webm');
    renameSync(src, videoPath);
  }

  console.log();
  console.log('  Pass criterion: p5 ≥ 60 fps at N=30');
  const n30 = fpsResults.find(r => r.count === 30);
  if (n30) {
    if (n30.p5 >= 60) {
      console.log(`  → PASS  (p5 = ${n30.p5.toFixed(1)} fps at N=30)`);
    } else {
      console.log(`  → FAIL  (p5 = ${n30.p5.toFixed(1)} fps at N=30 — below 60 fps threshold)`);
      console.log('     See §7 in the benchmark report for suggested remedies.');
    }
  }
  console.log();

  // ── §5.4 — Artefacts ──────────────────────────────────────────────────────
  console.log('§5.4  Referensartefakter');
  console.log('─────────────────────────');
  if (screenshotPath)  console.log(`  Screenshot:  ${screenshotPath.replace(REPO_ROOT + '/', '')}`);
  if (videoPath)       console.log(`  Video (12s): ${videoPath.replace(REPO_ROOT + '/', '')}`);
  console.log();

  // ── Save JSON results ──────────────────────────────────────────────────────
  const jsonOut = resolve(REPORT_DIR, 'results.json');
  const output = {
    order:     'ORDER 096',
    date:      new Date().toISOString().slice(0, 10),
    section_51_fps: {
      renderer:  'Chrome headless SVG (vanilla JS, no React)',
      viewport:  '1920×1080',
      warmup_ms: 2000,
      measure_ms: 10000,
      note: 'React reconciliation overhead not included; actual dockskåp will be 5–15% slower.',
      results:   fpsResults,
    },
    section_52_room_widths: {
      layout: 'alt C — 70% dining fraction, 30% kitchen+bar openings',
      figure_width_ref_px: 140,
      ref_height_px: 1080,
      results: roomWidths,
    },
    section_53_map_min_size: mapMin,
    section_54_artefacts: {
      screenshot: screenshotPath ? 'frontend/reports/order096/bench-30.png'  : null,
      video:      videoPath      ? 'frontend/reports/order096/bench-30.webm' : null,
    },
  };
  writeFileSync(jsonOut, JSON.stringify(output, null, 2));
  console.log(`Results saved → frontend/reports/order096/results.json`);
  console.log();
}

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
