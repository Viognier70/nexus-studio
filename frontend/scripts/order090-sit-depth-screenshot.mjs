#!/usr/bin/env node
// ORDER 090 §2 — sit-depth legibility screenshot.
//
// Renders two guest silhouettes (standing + seated) at the exact
// projection the strategic camera would produce at pitch 58° /
// distance 8.4 m / 720p canvas / 50° VFOV. Same math as
// UNDERLAG_003_MEASUREMENTS.md §0.1: 92 px/m at that focal distance.
//
// The image is deliberately a projection proof, not a scene render.
// A scene render would require standing up vite dev + scenario
// setup + waiting for a guest to reach seated state — that's the
// ORDER 088 §5 scenario-setup work still pending. The projection
// proof answers the same legibility question (are 0.27 m and 0 m
// screen-visually distinct at this camera?) without the scene
// infrastructure.
//
// Outputs `frontend/reports/order088/sit-depth-pitch58.png`.

import { chromium } from 'playwright';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'reports', 'order088');
mkdirSync(OUT_DIR, { recursive: true });
const OUT_PATH = resolve(OUT_DIR, 'sit-depth-pitch58.png');

// Constants from UNDERLAG_003_MEASUREMENTS.md §0.1.
const GUEST_HEIGHT_M = 1.70;
const SIT_DIP_M = 0.27;            // ORDER 088 §2.3
const OLD_SIT_DIP_M = 0.15;        // ORDER 087 value, for comparison
const GUEST_RADIUS_M = 0.32;
const TABLE_HEIGHT_M = 0.74;

// Projection at pitch 58° / distance 8.4 m / 720p / 50° VFOV.
const PX_PER_M = 92;   // = 720 / (2 × 8.4 × tan(25°))

// Canvas.
const CANVAS_W = 900;
const CANVAS_H = 460;

// Ground line placement.
const GROUND_Y_PX = 320;

function pxHeight(m) { return Math.round(m * PX_PER_M); }
function pxWidth(m)  { return Math.round(m * PX_PER_M); }

// SVG scene.
const html = `<!doctype html>
<html><head>
<meta charset="utf-8">
<title>ORDER 090 §2 — sit-depth legibility</title>
<style>
  body { margin: 0; background: #f4efe5; font-family: system-ui, sans-serif; color: #2a2620; }
  svg { display: block; }
  .caption { position: absolute; top: 10px; left: 20px; font-size: 13px; }
  .caption b { color: #1a1612; }
  .subcaption { font-size: 11px; opacity: 0.65; }
</style>
</head>
<body>
<svg width="${CANVAS_W}" height="${CANVAS_H}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}">
  <defs>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#eee5d4"/>
      <stop offset="1" stop-color="#d7c9a8"/>
    </linearGradient>
    <pattern id="grid" width="46" height="46" patternUnits="userSpaceOnUse">
      <path d="M 46 0 L 0 0 0 46" fill="none" stroke="#c9b98f" stroke-width="0.5"/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect x="0" y="0" width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#floor)"/>
  <rect x="0" y="${GROUND_Y_PX}" width="${CANVAS_W}" height="${CANVAS_H - GROUND_Y_PX}" fill="#b8a171" opacity="0.4"/>

  <!-- Reference: 1 metre scale bar top-right -->
  <line x1="${CANVAS_W - 20 - PX_PER_M}" y1="60" x2="${CANVAS_W - 20}" y2="60" stroke="#3a3225" stroke-width="2"/>
  <text x="${CANVAS_W - 20}" y="80" text-anchor="end" font-size="11" fill="#3a3225">1 m = ${PX_PER_M} px</text>

  <!-- Guest A — STANDING (reference) -->
  <g id="standing" transform="translate(180 ${GROUND_Y_PX})">
    <rect x="${-pxWidth(GUEST_RADIUS_M)}" y="${-pxHeight(GUEST_HEIGHT_M)}"
          width="${pxWidth(GUEST_RADIUS_M) * 2}" height="${pxHeight(GUEST_HEIGHT_M)}"
          fill="#c9c0a4" stroke="#7a6d4a" stroke-width="1"/>
    <line x1="${-pxWidth(GUEST_RADIUS_M) - 12}" y1="${-pxHeight(GUEST_HEIGHT_M)}"
          x2="${-pxWidth(GUEST_RADIUS_M) - 4}" y2="${-pxHeight(GUEST_HEIGHT_M)}"
          stroke="#3a3225" stroke-width="1.5"/>
    <text x="${-pxWidth(GUEST_RADIUS_M) - 16}" y="${-pxHeight(GUEST_HEIGHT_M) + 4}"
          text-anchor="end" font-size="11" fill="#3a3225">1.70 m</text>
    <text x="0" y="30" text-anchor="middle" font-size="13" fill="#1a1612" font-weight="bold">standing</text>
    <text x="0" y="46" text-anchor="middle" font-size="10" fill="#5a5040">crown at ground+${pxHeight(GUEST_HEIGHT_M)} px</text>
  </g>

  <!-- Guest B — SEATED @ SIT_DIP_M = 0.27 m (ORDER 088 §2.3) -->
  <g id="seated-088" transform="translate(400 ${GROUND_Y_PX})">
    <!-- Table front edge suggestion, so viewer can gauge crown clearance -->
    <line x1="${-pxWidth(GUEST_RADIUS_M) - 30}" y1="${-pxHeight(TABLE_HEIGHT_M)}"
          x2="${pxWidth(GUEST_RADIUS_M) + 30}" y2="${-pxHeight(TABLE_HEIGHT_M)}"
          stroke="#7a5a2a" stroke-width="2" stroke-dasharray="3,3" opacity="0.55"/>
    <text x="${pxWidth(GUEST_RADIUS_M) + 34}" y="${-pxHeight(TABLE_HEIGHT_M) + 4}"
          font-size="10" fill="#7a5a2a">table 0.74 m</text>

    <rect x="${-pxWidth(GUEST_RADIUS_M)}" y="${-pxHeight(GUEST_HEIGHT_M - SIT_DIP_M)}"
          width="${pxWidth(GUEST_RADIUS_M) * 2}" height="${pxHeight(GUEST_HEIGHT_M - SIT_DIP_M) + pxHeight(SIT_DIP_M) - pxHeight(SIT_DIP_M)}"
          fill="#c9c0a4" stroke="#7a6d4a" stroke-width="1"
          transform="translate(0 ${pxHeight(SIT_DIP_M)})"/>
    <!-- Reference standing outline, dashed -->
    <rect x="${-pxWidth(GUEST_RADIUS_M)}" y="${-pxHeight(GUEST_HEIGHT_M)}"
          width="${pxWidth(GUEST_RADIUS_M) * 2}" height="${pxHeight(GUEST_HEIGHT_M)}"
          fill="none" stroke="#7a6d4a" stroke-width="1" stroke-dasharray="3,3" opacity="0.5"/>
    <!-- Delta arrow -->
    <line x1="${pxWidth(GUEST_RADIUS_M) + 8}" y1="${-pxHeight(GUEST_HEIGHT_M)}"
          x2="${pxWidth(GUEST_RADIUS_M) + 8}" y2="${-pxHeight(GUEST_HEIGHT_M - SIT_DIP_M)}"
          stroke="#a53e2a" stroke-width="1.5"/>
    <line x1="${pxWidth(GUEST_RADIUS_M) + 4}" y1="${-pxHeight(GUEST_HEIGHT_M)}"
          x2="${pxWidth(GUEST_RADIUS_M) + 12}" y2="${-pxHeight(GUEST_HEIGHT_M)}"
          stroke="#a53e2a" stroke-width="1.5"/>
    <line x1="${pxWidth(GUEST_RADIUS_M) + 4}" y1="${-pxHeight(GUEST_HEIGHT_M - SIT_DIP_M)}"
          x2="${pxWidth(GUEST_RADIUS_M) + 12}" y2="${-pxHeight(GUEST_HEIGHT_M - SIT_DIP_M)}"
          stroke="#a53e2a" stroke-width="1.5"/>
    <text x="${pxWidth(GUEST_RADIUS_M) + 16}" y="${-pxHeight(GUEST_HEIGHT_M - SIT_DIP_M / 2) + 4}"
          font-size="11" fill="#a53e2a" font-weight="bold">0.27 m dip → ${pxHeight(SIT_DIP_M)} px</text>
    <text x="0" y="30" text-anchor="middle" font-size="13" fill="#1a1612" font-weight="bold">seated (ORDER 088)</text>
    <text x="0" y="46" text-anchor="middle" font-size="10" fill="#5a5040">crown at ground+${pxHeight(GUEST_HEIGHT_M - SIT_DIP_M)} px · clearance over table: ${((GUEST_HEIGHT_M - SIT_DIP_M) - TABLE_HEIGHT_M).toFixed(2)} m</text>
  </g>

  <!-- Guest C — SEATED @ 0.15 m (ORDER 087 pre-fix, for comparison) -->
  <g id="seated-087" transform="translate(660 ${GROUND_Y_PX})">
    <line x1="${-pxWidth(GUEST_RADIUS_M) - 30}" y1="${-pxHeight(TABLE_HEIGHT_M)}"
          x2="${pxWidth(GUEST_RADIUS_M) + 30}" y2="${-pxHeight(TABLE_HEIGHT_M)}"
          stroke="#7a5a2a" stroke-width="2" stroke-dasharray="3,3" opacity="0.55"/>
    <rect x="${-pxWidth(GUEST_RADIUS_M)}" y="${-pxHeight(GUEST_HEIGHT_M - OLD_SIT_DIP_M)}"
          width="${pxWidth(GUEST_RADIUS_M) * 2}" height="${pxHeight(GUEST_HEIGHT_M - OLD_SIT_DIP_M)}"
          fill="#c9c0a4" stroke="#7a6d4a" stroke-width="1"/>
    <rect x="${-pxWidth(GUEST_RADIUS_M)}" y="${-pxHeight(GUEST_HEIGHT_M)}"
          width="${pxWidth(GUEST_RADIUS_M) * 2}" height="${pxHeight(GUEST_HEIGHT_M)}"
          fill="none" stroke="#7a6d4a" stroke-width="1" stroke-dasharray="3,3" opacity="0.5"/>
    <line x1="${pxWidth(GUEST_RADIUS_M) + 8}" y1="${-pxHeight(GUEST_HEIGHT_M)}"
          x2="${pxWidth(GUEST_RADIUS_M) + 8}" y2="${-pxHeight(GUEST_HEIGHT_M - OLD_SIT_DIP_M)}"
          stroke="#7a6d4a" stroke-width="1.5"/>
    <line x1="${pxWidth(GUEST_RADIUS_M) + 4}" y1="${-pxHeight(GUEST_HEIGHT_M)}"
          x2="${pxWidth(GUEST_RADIUS_M) + 12}" y2="${-pxHeight(GUEST_HEIGHT_M)}"
          stroke="#7a6d4a" stroke-width="1.5"/>
    <line x1="${pxWidth(GUEST_RADIUS_M) + 4}" y1="${-pxHeight(GUEST_HEIGHT_M - OLD_SIT_DIP_M)}"
          x2="${pxWidth(GUEST_RADIUS_M) + 12}" y2="${-pxHeight(GUEST_HEIGHT_M - OLD_SIT_DIP_M)}"
          stroke="#7a6d4a" stroke-width="1.5"/>
    <text x="${pxWidth(GUEST_RADIUS_M) + 16}" y="${-pxHeight(GUEST_HEIGHT_M - OLD_SIT_DIP_M / 2) + 4}"
          font-size="11" fill="#5a5040">0.15 m dip → ${pxHeight(OLD_SIT_DIP_M)} px</text>
    <text x="0" y="30" text-anchor="middle" font-size="13" fill="#5a5040">seated (ORDER 087 pre-fix)</text>
    <text x="0" y="46" text-anchor="middle" font-size="10" fill="#5a5040">crown at ground+${pxHeight(GUEST_HEIGHT_M - OLD_SIT_DIP_M)} px · visually ≈ standing</text>
  </g>

  <!-- Ground line -->
  <line x1="0" y1="${GROUND_Y_PX}" x2="${CANVAS_W}" y2="${GROUND_Y_PX}" stroke="#3a3225" stroke-width="1.5"/>

  <!-- Title + provenance -->
  <text x="20" y="24" font-size="15" fill="#1a1612" font-weight="bold">Sit-depth legibility at pitch 58° / distance 8.4 m — ORDER 090 §2</text>
  <text x="20" y="42" font-size="11" fill="#5a5040">Left: standing reference. Middle: 0.27 m dip (ORDER 088 §2.3) — 25 px screen delta, distinctly seated. Right: 0.15 m dip (ORDER 087) — 14 px, reads as standing.</text>
  <text x="20" y="${CANVAS_H - 8}" font-size="10" fill="#7a6d4a">Projection: 720 px / (2 × 8.4 × tan(25°)) = ${PX_PER_M} px per metre. Sources: CLAUDE.md unit contract; InteriorGuests.tsx SIT_DIP_M constant.</text>
</svg>
</body></html>`;

// Screenshot via playwright. Headless chromium; no need for a live
// server since the HTML is self-contained.
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: CANVAS_W, height: CANVAS_H },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: OUT_PATH, fullPage: false, omitBackground: false });
  console.log(`ORDER 090 §2 wrote ${OUT_PATH}`);
} finally {
  await browser.close();
}
